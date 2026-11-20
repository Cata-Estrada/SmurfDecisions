-- ==============================================================================
-- SmurfDecisions · Compra de cacao para Coagropacífico
-- Esquema completo para un proyecto de Supabase NUEVO (vacío).
--
-- Cómo usarlo:
--   1. Crea el proyecto en supabase.com.
--   2. Abre SQL Editor, pega este archivo completo y ejecútalo una sola vez.
--   3. Crea los usuarios en Authentication > Users y asígnales empresa y rol con
--      public.asignar_membresia (ejemplo al final del archivo).
--
-- No es una migración: no intenta conservar datos de la base anterior de
-- Smurfit / AMUCC. Se puede volver a ejecutar sin duplicar las semillas.
--
-- Fórmulas (contrapropuesta):
--   Precio_q   = (Bolsa + dif_q) × TRM ÷ 1000 × (1 − margen)
--   Capital_q  = Volumen_q × Precio_q × (1 + acopio_q)
--   Capital    = Σ Capital_q × (1 + colchón)
--   Cobertura  = Caja ÷ Capital      Brecha = Capital − Caja
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Organización, perfiles y roles
-- ------------------------------------------------------------------------------
create table if not exists public.empresas (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null unique,
  sector      text not null,
  descripcion text,
  activo      boolean not null default true,
  creado_en   timestamptz not null default now()
);

create table if not exists public.perfiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  empresa_id uuid not null references public.empresas (id),
  nombre     text not null,
  rol        text not null check (rol in ('consultor', 'analista', 'gerente')),
  activo     boolean not null default true,
  creado_en  timestamptz not null default now()
);

create table if not exists public.areas (
  id         uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  nombre     text not null,
  unique (empresa_id, nombre)
);

-- ------------------------------------------------------------------------------
-- 2. Catálogo de drivers del cacao (global, solo lectura para la app)
--    La columna alertas.factor guarda el código del driver.
-- ------------------------------------------------------------------------------
create table if not exists public.drivers (
  codigo           text primary key,
  nombre           text not null,
  que_vigila       text not null,
  pestel_equivalente text not null,
  orden            integer not null
);

-- ------------------------------------------------------------------------------
-- 3. Parámetros de compra (editables por analista y gerente)
-- ------------------------------------------------------------------------------
create table if not exists public.configuracion_compra_cacao (
  empresa_id               uuid primary key references public.empresas (id) on delete cascade,
  trm_cop                  numeric check (trm_cop > 0),
  margen_pct               numeric check (margen_pct >= 0 and margen_pct < 100),
  colchon_pct              numeric check (colchon_pct >= 0),
  -- Umbrales del recomendador (la cooperativa debe validarlos)
  ventana_percentil_dias   integer not null default 90  check (ventana_percentil_dias between 10 and 1825),
  umbral_variacion_pct     numeric not null default 5   check (umbral_variacion_pct > 0),
  dias_variacion           integer not null default 5   check (dias_variacion between 1 and 60),
  cobertura_ajustada_pct   numeric not null default 100 check (cobertura_ajustada_pct > 0),
  cobertura_holgada_pct    numeric not null default 120,
  actualizado_por          uuid references auth.users (id) on delete set null,
  actualizado_en           timestamptz not null default now(),
  check (cobertura_holgada_pct > cobertura_ajustada_pct)
);

create table if not exists public.calidades_cacao (
  id                      uuid primary key default gen_random_uuid(),
  empresa_id              uuid not null references public.empresas (id) on delete cascade,
  nombre                  text not null,
  diferencial_usd_t       numeric,
  volumen_kg              numeric check (volumen_kg >= 0),
  acopio_pct              numeric check (acopio_pct >= 0),
  costo_produccion_cop_kg numeric check (costo_produccion_cop_kg >= 0),
  actualizado_por         uuid references auth.users (id) on delete set null,
  actualizado_en          timestamptz not null default now(),
  unique (empresa_id, nombre)
);

-- Plan de compras: tramos programados por calidad.
create table if not exists public.plan_compras (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references public.empresas (id) on delete cascade,
  calidad_id    uuid not null references public.calidades_cacao (id) on delete cascade,
  fecha_objetivo date not null,
  volumen_kg    numeric not null check (volumen_kg > 0),
  estado        text not null default 'planeado'
                check (estado in ('planeado', 'comprado', 'cancelado')),
  notas         text,
  actualizado_por uuid references auth.users (id) on delete set null,
  actualizado_en  timestamptz not null default now()
);
create index if not exists plan_compras_empresa_fecha_idx
  on public.plan_compras (empresa_id, fecha_objetivo);

-- Caja: historial de saldos. La caja vigente es el registro más reciente.
create table if not exists public.caja (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references public.empresas (id) on delete cascade,
  fecha         date not null default current_date,
  disponible_cop numeric not null check (disponible_cop >= 0),
  nota          text,
  registrado_por uuid references auth.users (id) on delete set null,
  creado_en     timestamptz not null default now()
);
create index if not exists caja_empresa_fecha_idx
  on public.caja (empresa_id, fecha desc, creado_en desc);

-- Matriz del recomendador: posición del precio × cobertura de caja.
create table if not exists public.reglas_compra (
  empresa_id     uuid not null references public.empresas (id) on delete cascade,
  nivel_precio   text not null check (nivel_precio in ('bajo', 'medio', 'alto')),
  cobertura      text not null check (cobertura in ('deficit', 'ajustada', 'holgada')),
  titulo         text not null,
  recomendacion  text not null,
  semaforo       text not null check (semaforo in ('verde', 'amarillo', 'rojo')),
  actualizado_por uuid references auth.users (id) on delete set null,
  actualizado_en  timestamptz not null default now(),
  primary key (empresa_id, nivel_precio, cobertura)
);

-- ------------------------------------------------------------------------------
-- 4. Indicadores de mercado (globales: TRM, bolsa NY, bolsa Londres)
--    Los escribe n8n (service_role) o un analista/gerente desde la app.
-- ------------------------------------------------------------------------------
create table if not exists public.indicadores (
  codigo text primary key,
  nombre text not null,
  unidad text not null
);

create table if not exists public.valores_indicador (
  id               bigint generated always as identity primary key,
  indicador_codigo text not null references public.indicadores (codigo),
  fecha            date not null,
  valor            numeric not null check (valor > 0),
  fuente           text,
  capturado_en     timestamptz not null default now(),
  unique (indicador_codigo, fecha)
);
create index if not exists valores_indicador_codigo_fecha_idx
  on public.valores_indicador (indicador_codigo, fecha desc);

-- ------------------------------------------------------------------------------
-- 5. Noticias y alertas (las clasifica n8n + Gemini)
-- ------------------------------------------------------------------------------
create table if not exists public.alertas (
  id                  bigint generated always as identity primary key,
  empresa_id          uuid not null references public.empresas (id) on delete cascade,
  titulo              text not null,
  resumen             text,
  enlace              text,
  fuente              text,
  fecha_publicacion   timestamptz,
  factor              text references public.drivers (codigo),
  area                text,
  tipo_evento         text,
  efecto_precio       text check (efecto_precio in ('sube', 'baja', 'neutral')),
  probabilidad        integer check (probabilidad between 1 and 5),
  impacto             integer check (impacto between 1 and 5),
  puntaje             integer check (puntaje between 1 and 25),
  nivel               text,
  prioritaria         boolean not null default false,
  estado              text not null default 'pendiente'
                      check (estado in ('pendiente', 'validada', 'descartada', 'sin_clasificar')),
  decision            text not null default 'pendiente'
                      check (decision in ('pendiente', 'aceptada', 'descartada')),
  origen              text not null default 'n8n',
  explicacion         text,
  recomendacion_texto text,
  creada_en           timestamptz not null default now()
);
create unique index if not exists alertas_empresa_enlace_uidx
  on public.alertas (empresa_id, enlace) where enlace is not null;
create index if not exists alertas_empresa_fecha_idx
  on public.alertas (empresa_id, fecha_publicacion desc);

-- Acción sugerida por tipo de evento de noticia.
create table if not exists public.reglas (
  empresa_id       uuid not null references public.empresas (id) on delete cascade,
  tipo_evento      text not null,
  accion           text,
  area_responsable text,
  supuestos        text,
  primary key (empresa_id, tipo_evento)
);

-- Búsquedas RSS que usa n8n para traer noticias.
create table if not exists public.consultas (
  id         uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  tema       text not null,
  query      text not null,
  activa     boolean not null default true,
  unique (empresa_id, query)
);

create table if not exists public.fuentes (
  id               bigint generated always as identity primary key,
  empresa_id       uuid not null references public.empresas (id) on delete cascade,
  nombre           text not null,
  tipo             text not null check (tipo in ('indicador', 'noticia')),
  frecuencia_horas integer,
  enlace           text,
  unique (empresa_id, nombre)
);

create table if not exists public.ejecuciones (
  id               bigint generated always as identity primary key,
  empresa_id       uuid references public.empresas (id) on delete cascade,
  flujo            text not null,
  fuente           text,
  inicio           timestamptz,
  fin              timestamptz,
  estado           text check (estado in ('ok', 'error')),
  registros_nuevos integer,
  mensaje_error    text
);
create index if not exists ejecuciones_empresa_id_idx
  on public.ejecuciones (empresa_id, id desc);

-- ------------------------------------------------------------------------------
-- 6. Funciones de sesión
-- ------------------------------------------------------------------------------
create or replace function public.empresa_actual()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select p.empresa_id
  from public.perfiles p
  join public.empresas e on e.id = p.empresa_id and e.activo
  where p.id = auth.uid() and p.activo
$$;

create or replace function public.rol_actual()
returns text
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select p.rol
  from public.perfiles p
  where p.id = auth.uid() and p.activo
$$;

create or replace function public.puede_editar()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select coalesce(public.rol_actual() in ('analista', 'gerente'), false)
$$;

revoke all on function public.empresa_actual() from public, anon;
revoke all on function public.rol_actual()     from public, anon;
revoke all on function public.puede_editar()   from public, anon;
grant execute on function public.empresa_actual() to authenticated;
grant execute on function public.rol_actual()     to authenticated;
grant execute on function public.puede_editar()   to authenticated;

-- Marca quién y cuándo editó un parámetro.
create or replace function public.marcar_actualizacion()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
begin
  new.actualizado_en := now();
  if auth.uid() is not null then
    new.actualizado_por := auth.uid();
  end if;
  return new;
end;
$$;

do $$
declare
  tabla text;
begin
  foreach tabla in array array[
    'configuracion_compra_cacao', 'calidades_cacao', 'plan_compras', 'reglas_compra'
  ] loop
    execute format('drop trigger if exists marcar_actualizacion on public.%I', tabla);
    execute format(
      'create trigger marcar_actualizacion before insert or update on public.%I
       for each row execute function public.marcar_actualizacion()',
      tabla
    );
  end loop;
end;
$$;

-- Un analista no puede cambiar la decisión de una alerta; solo el gerente.
-- n8n (service_role, sin auth.uid()) sí puede actualizar alertas.
create or replace function public.validar_actualizacion_alerta()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  rol_usuario text;
begin
  if auth.uid() is null then
    return new;
  end if;
  rol_usuario := public.rol_actual();
  if rol_usuario is null or rol_usuario not in ('analista', 'gerente') then
    raise exception 'El rol no puede modificar alertas';
  end if;
  if new.empresa_id is distinct from old.empresa_id then
    raise exception 'No se puede cambiar la empresa de una alerta';
  end if;
  if rol_usuario = 'analista' and new.decision is distinct from old.decision then
    raise exception 'Solo un gerente puede cambiar la decisión';
  end if;
  return new;
end;
$$;

drop trigger if exists validar_actualizacion_alerta on public.alertas;
create trigger validar_actualizacion_alerta
before update on public.alertas
for each row execute function public.validar_actualizacion_alerta();

-- ------------------------------------------------------------------------------
-- 7. Seguridad por filas (RLS)
-- ------------------------------------------------------------------------------
do $$
declare
  tabla text;
  politica record;
begin
  foreach tabla in array array[
    'empresas', 'perfiles', 'areas', 'drivers', 'configuracion_compra_cacao',
    'calidades_cacao', 'plan_compras', 'caja', 'reglas_compra', 'indicadores',
    'valores_indicador', 'alertas', 'reglas', 'consultas', 'fuentes', 'ejecuciones'
  ] loop
    for politica in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = tabla
    loop
      execute format('drop policy %I on public.%I', politica.policyname, tabla);
    end loop;
    execute format('alter table public.%I enable row level security', tabla);
  end loop;
end;
$$;

-- Propios
create policy perfiles_select_propio on public.perfiles
  for select to authenticated using (id = auth.uid());
create policy empresas_select_propia on public.empresas
  for select to authenticated using (id = public.empresa_actual() and activo);

-- Globales de solo lectura
create policy drivers_select on public.drivers
  for select to authenticated using (true);
create policy indicadores_select on public.indicadores
  for select to authenticated using (true);
create policy valores_indicador_select on public.valores_indicador
  for select to authenticated using (true);
create policy valores_indicador_insert on public.valores_indicador
  for insert to authenticated with check (public.puede_editar());
create policy valores_indicador_update on public.valores_indicador
  for update to authenticated
  using (public.puede_editar()) with check (public.puede_editar());

-- Lectura por empresa para todas las tablas empresariales
do $$
declare
  tabla text;
begin
  foreach tabla in array array[
    'areas', 'configuracion_compra_cacao', 'calidades_cacao', 'plan_compras',
    'caja', 'reglas_compra', 'alertas', 'reglas', 'consultas', 'fuentes', 'ejecuciones'
  ] loop
    execute format(
      'create policy %I on public.%I for select to authenticated
       using (empresa_id = public.empresa_actual())',
      tabla || '_select_empresa', tabla
    );
  end loop;
end;
$$;

-- Escritura completa (insertar, editar, borrar) para analista y gerente
do $$
declare
  tabla text;
begin
  foreach tabla in array array[
    'configuracion_compra_cacao', 'calidades_cacao', 'plan_compras', 'caja'
  ] loop
    execute format(
      'create policy %I on public.%I for insert to authenticated
       with check (empresa_id = public.empresa_actual() and public.puede_editar())',
      tabla || '_insert_rol', tabla
    );
    execute format(
      'create policy %I on public.%I for update to authenticated
       using (empresa_id = public.empresa_actual() and public.puede_editar())
       with check (empresa_id = public.empresa_actual() and public.puede_editar())',
      tabla || '_update_rol', tabla
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated
       using (empresa_id = public.empresa_actual() and public.puede_editar())',
      tabla || '_delete_rol', tabla
    );
  end loop;
end;
$$;

-- Las reglas del recomendador y de noticias solo las ajusta el gerente.
do $$
declare
  tabla text;
begin
  foreach tabla in array array['reglas_compra', 'reglas'] loop
    execute format(
      'create policy %I on public.%I for update to authenticated
       using (empresa_id = public.empresa_actual() and public.rol_actual() = ''gerente'')
       with check (empresa_id = public.empresa_actual() and public.rol_actual() = ''gerente'')',
      tabla || '_update_gerente', tabla
    );
  end loop;
end;
$$;

create policy alertas_update_empresa_rol on public.alertas
  for update to authenticated
  using (empresa_id = public.empresa_actual() and public.puede_editar())
  with check (empresa_id = public.empresa_actual() and public.puede_editar());

-- ------------------------------------------------------------------------------
-- 8. Alta de usuarios (solo administrador, desde SQL Editor)
-- ------------------------------------------------------------------------------
create or replace function public.asignar_membresia(
  correo text,
  empresa_nombre text,
  rol_usuario text,
  nombre_usuario text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, auth, pg_temp
as $$
declare
  usuario_id uuid;
  empresa_id_destino uuid;
begin
  if rol_usuario not in ('consultor', 'analista', 'gerente') then
    raise exception 'Rol inválido: %', rol_usuario;
  end if;

  select id into usuario_id from auth.users where lower(email) = lower(correo);
  if usuario_id is null then
    raise exception 'No existe un usuario con el correo %', correo;
  end if;

  select id into empresa_id_destino
  from public.empresas where nombre = empresa_nombre and activo;
  if empresa_id_destino is null then
    raise exception 'Empresa no habilitada: %', empresa_nombre;
  end if;

  insert into public.perfiles (id, empresa_id, nombre, rol, activo)
  values (
    usuario_id, empresa_id_destino,
    coalesce(nullif(trim(nombre_usuario), ''), split_part(correo, '@', 1)),
    rol_usuario, true
  )
  on conflict (id) do update
  set empresa_id = excluded.empresa_id,
      nombre     = excluded.nombre,
      rol        = excluded.rol,
      activo     = true;

  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('empresa', empresa_nombre, 'rol', rol_usuario)
  where id = usuario_id;
end;
$$;

revoke all on function public.asignar_membresia(text, text, text, text)
  from public, anon, authenticated;

-- ------------------------------------------------------------------------------
-- 9. Datos iniciales
--    Las calidades, volúmenes, diferenciales, caja y costos son el EJEMPLO
--    ILUSTRATIVO de la contrapropuesta (cifras inventadas). La cooperativa debe
--    reemplazarlos desde la aplicación.
-- ------------------------------------------------------------------------------
insert into public.empresas (nombre, sector, descripcion)
values (
  'Coagropacífico',
  'Cacao',
  'Cooperativa de Tumaco, Nariño (1989). Agrupa, clasifica y vende la producción de más de 300 pequeños productores.'
)
on conflict (nombre) do nothing;

insert into public.drivers (codigo, nombre, que_vigila, pestel_equivalente, orden) values
  ('precio_internacional', 'Precio internacional', 'Bolsa de Nueva York y Londres', 'Económico', 1),
  ('oferta_africana', 'Oferta africana', 'Cosechas, llegadas a puerto, precio oficial de Costa de Marfil y Ghana', 'Económico / Ecológico', 2),
  ('clima', 'Clima', 'Lluvias y El Niño en África y en el Pacífico colombiano', 'Ecológico', 3),
  ('demanda', 'Demanda', 'Molienda, inventarios, consumo', 'Económico', 4),
  ('regulacion_mercado', 'Regulación y mercado', 'EUDR, límites de cadmio, aranceles, certificaciones', 'Legal / Político', 5),
  ('entorno_local', 'Entorno local', 'TRM, orden público y vías en Tumaco, costos, liquidez de caja', 'Político / Económico / Social', 6)
on conflict (codigo) do update
set nombre = excluded.nombre, que_vigila = excluded.que_vigila,
    pestel_equivalente = excluded.pestel_equivalente, orden = excluded.orden;

insert into public.indicadores (codigo, nombre, unidad) values
  ('TRM', 'Tasa Representativa del Mercado', 'COP/USD'),
  ('CACAO_NY', 'Futuro de cacao ICE Nueva York (CC=F)', 'USD/t'),
  ('CACAO_LON', 'Futuro de cacao ICE Londres', 'GBP/t')
on conflict (codigo) do nothing;

do $$
declare
  emp uuid;
begin
  select id into emp from public.empresas where nombre = 'Coagropacífico';

  insert into public.areas (empresa_id, nombre) values
    (emp, 'Gerencia'),
    (emp, 'Compras y acopio'),
    (emp, 'Finanzas y tesorería'),
    (emp, 'Calidad y certificación'),
    (emp, 'Logística')
  on conflict (empresa_id, nombre) do nothing;

  insert into public.configuracion_compra_cacao
    (empresa_id, trm_cop, margen_pct, colchon_pct)
  values (emp, 4000, 20, 10)
  on conflict (empresa_id) do nothing;

  insert into public.calidades_cacao
    (empresa_id, nombre, diferencial_usd_t, volumen_kg, acopio_pct, costo_produccion_cop_kg)
  values
    (emp, 'Calidad A', 300, 6000, 5, null),
    (emp, 'Calidad B', 0, 4000, 5, null),
    (emp, 'Calidad C', -400, 2000, 5, null)
  on conflict (empresa_id, nombre) do nothing;

  if not exists (select 1 from public.caja where empresa_id = emp) then
    insert into public.caja (empresa_id, disponible_cop, nota)
    values (emp, 250000000, 'Valor de ejemplo de la contrapropuesta');
  end if;

  insert into public.reglas_compra
    (empresa_id, nivel_precio, cobertura, titulo, recomendacion, semaforo)
  values
    (emp, 'bajo', 'holgada', 'Ventana favorable',
     'Adelantar compras de esta calidad hasta el límite de la caja.', 'verde'),
    (emp, 'bajo', 'ajustada', 'Ventana favorable',
     'Adelantar compras de esta calidad hasta el límite de la caja.', 'verde'),
    (emp, 'bajo', 'deficit', 'Ventana favorable sin caja',
     'Gestionar anticipo o crédito antes de comprar; priorizar la calidad de mayor margen.', 'amarillo'),
    (emp, 'medio', 'holgada', 'Comprar según plan',
     'Comprar según el plan de compras.', 'verde'),
    (emp, 'medio', 'ajustada', 'Comprar lo esencial',
     'Comprar lo esencial y asegurar caja antes del siguiente tramo.', 'amarillo'),
    (emp, 'medio', 'deficit', 'Comprar lo esencial',
     'Comprar lo esencial y asegurar caja antes del siguiente tramo.', 'amarillo'),
    (emp, 'alto', 'holgada', 'Limitar la compra',
     'Limitar la compra al volumen comprometido; evitar acopio adicional.', 'amarillo'),
    (emp, 'alto', 'ajustada', 'Alerta roja',
     'Reducir volumen, escalonar compras o conseguir financiamiento.', 'rojo'),
    (emp, 'alto', 'deficit', 'Alerta roja',
     'Reducir volumen, escalonar compras o conseguir financiamiento.', 'rojo')
  on conflict (empresa_id, nivel_precio, cobertura) do nothing;

  insert into public.reglas (empresa_id, tipo_evento, accion, area_responsable, supuestos) values
    (emp, 'movimiento_bolsa', 'Recalcular capital requerido y revisar la ventana de compra por calidad.', 'Finanzas y tesorería', 'La bolsa de Nueva York es la referencia de precio.'),
    (emp, 'cosecha_africa', 'Vigilar la tendencia de bolsa; una cosecha débil anticipa alzas.', 'Gerencia', 'Costa de Marfil y Ghana concentran la oferta mundial.'),
    (emp, 'precio_oficial_africa', 'Comparar el precio oficial con la bolsa; reacciona con demora.', 'Gerencia', 'El precio en finca africano sigue a la bolsa con rezago.'),
    (emp, 'clima', 'Revisar el plan de compras si el clima afecta la cosecha local o africana.', 'Compras y acopio', 'El Niño reduce oferta y presiona el precio al alza.'),
    (emp, 'demanda_molienda', 'Revisar el escenario de precio con el dato de molienda.', 'Gerencia', 'Molienda alta sostiene el precio.'),
    (emp, 'regulacion', 'Verificar trazabilidad y certificaciones de los lotes.', 'Calidad y certificación', 'EUDR y límites de cadmio condicionan el acceso a Europa.'),
    (emp, 'orden_publico_vias', 'Asegurar transporte y escalonar compras ante bloqueos en Tumaco.', 'Logística', 'Los bloqueos encarecen el acopio.'),
    (emp, 'tasa_cambio', 'Actualizar la TRM del cálculo y recalcular capital.', 'Finanzas y tesorería', 'Un dólar más alto sube el precio en pesos.'),
    (emp, 'otro', 'Revisar manualmente.', 'Gerencia', null)
  on conflict (empresa_id, tipo_evento) do nothing;

  insert into public.consultas (empresa_id, tema, query) values
    (emp, 'Precio internacional', 'precio cacao bolsa Nueva York'),
    (emp, 'Precio internacional', 'cocoa futures price'),
    (emp, 'Oferta africana', 'cocoa Ivory Coast Ghana harvest arrivals'),
    (emp, 'Clima', 'El Niño cacao'),
    (emp, 'Demanda', 'cocoa grindings'),
    (emp, 'Regulación y mercado', 'EUDR cacao'),
    (emp, 'Regulación y mercado', 'cadmio cacao exportación'),
    (emp, 'Entorno local', 'Tumaco cacao'),
    (emp, 'Entorno local', 'Tumaco paro bloqueo vía')
  on conflict (empresa_id, query) do nothing;

  insert into public.fuentes (empresa_id, nombre, tipo, frecuencia_horas, enlace) values
    (emp, 'Yahoo Finance · CC=F', 'indicador', 0, 'https://finance.yahoo.com/quote/CC%3DF/'),
    (emp, 'Superintendencia Financiera · TRM', 'indicador', 24, 'https://www.datos.gov.co/resource/32sa-8pi3.json'),
    (emp, 'Google News RSS', 'noticia', 6, 'https://news.google.com/rss')
  on conflict (empresa_id, nombre) do nothing;
end;
$$;

-- ------------------------------------------------------------------------------
-- Ejemplo de alta de usuarios (crear antes la cuenta en Authentication > Users):
-- select public.asignar_membresia('gerente@ejemplo.com',  'Coagropacífico', 'gerente',   'Nombre Gerente');
-- select public.asignar_membresia('analista@ejemplo.com', 'Coagropacífico', 'analista',  'Nombre Analista');
-- select public.asignar_membresia('consulta@ejemplo.com', 'Coagropacífico', 'consultor', 'Nombre Consultor');
-- ------------------------------------------------------------------------------
