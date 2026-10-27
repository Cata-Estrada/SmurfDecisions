-- Migracion aditiva para una base Supabase existente.
-- Respaldar la base y revisar el mapeo de empresa antes de ejecutarla.

do $$
declare
  tabla text;
begin
  foreach tabla in array array[
    'alertas', 'indicadores', 'valores_indicador',
    'reglas', 'fuentes', 'ejecuciones'
  ] loop
    if to_regclass(format('public.%I', tabla)) is null then
      raise exception 'Falta la tabla existente public.%. Esta migración no crea ni reconstruye tablas empresariales.', tabla;
    end if;
  end loop;
end;
$$;

create table if not exists public.empresas (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  nombre text not null unique,
  sector text not null,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

insert into public.empresas (nombre, sector)
values
  ('Smurfit', 'Empaques y Papel'),
  ('Asociación de Mujeres Caficultoras del Cauca (AMUCC)', 'Caficultura')
on conflict (nombre) do update
set sector = excluded.sector, activo = true;

create table if not exists public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete restrict,
  nombre text not null,
  rol text not null check (rol in ('consultor', 'analista', 'gerente')),
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

alter table public.alertas add column if not exists empresa_id uuid;
alter table public.indicadores add column if not exists empresa_id uuid;
alter table public.valores_indicador add column if not exists empresa_id uuid;
alter table public.reglas add column if not exists empresa_id uuid;
alter table public.fuentes add column if not exists empresa_id uuid;
alter table public.ejecuciones add column if not exists empresa_id uuid;

-- Las alertas con una empresa reconocida se asignan a esa organización.
update public.alertas a
set empresa_id = e.id
from public.empresas e
where a.empresa_id is null
  and (
    (e.nombre = 'Asociación de Mujeres Caficultoras del Cauca (AMUCC)'
      and lower(trim(coalesce(a.empresa, ''))) in (
        'amucc',
        'asociación de mujeres caficultoras del cauca (amucc)'
      ))
    or
    (e.nombre = 'Smurfit'
      and lower(trim(coalesce(a.empresa, ''))) in ('smurfit', 'smurfit westrock', 'smurfit westrock colombia'))
  );

-- Confirmado por la administración: los registros heredados sin etiqueta de
-- empresa pertenecen a Smurfit. Las alertas etiquetadas con organizaciones
-- retiradas no se reasignan ni se eliminan; permanecen sin empresa_id y ocultas.
update public.alertas
set empresa_id = (select id from public.empresas where nombre = 'Smurfit')
where empresa_id is null
  and nullif(trim(empresa), '') is null;

update public.indicadores
set empresa_id = (select id from public.empresas where nombre = 'Smurfit')
where empresa_id is null;
update public.valores_indicador
set empresa_id = (select id from public.empresas where nombre = 'Smurfit')
where empresa_id is null;
update public.reglas
set empresa_id = (select id from public.empresas where nombre = 'Smurfit')
where empresa_id is null;
update public.fuentes
set empresa_id = (select id from public.empresas where nombre = 'Smurfit')
where empresa_id is null;
update public.ejecuciones
set empresa_id = (select id from public.empresas where nombre = 'Smurfit')
where empresa_id is null;

do $$
declare
  tabla text;
begin
  foreach tabla in array array[
    'alertas', 'indicadores', 'valores_indicador',
    'reglas', 'fuentes', 'ejecuciones'
  ] loop
    if not exists (
      select 1
      from pg_constraint
      where conname = tabla || '_empresa_id_fkey'
        and conrelid = format('public.%I', tabla)::regclass
    ) then
      execute format(
        'alter table public.%I add constraint %I foreign key (empresa_id) references public.empresas(id) not valid',
        tabla,
        tabla || '_empresa_id_fkey'
      );
    end if;
    execute format(
      'create index if not exists %I on public.%I (empresa_id)',
      tabla || '_empresa_id_idx',
      tabla
    );
  end loop;
end;
$$;

-- Deshabilitar organizaciones retiradas sin borrar empresas, perfiles ni datos.
update public.empresas
set activo = false
where nombre not in (
  'Smurfit',
  'Asociación de Mujeres Caficultoras del Cauca (AMUCC)'
);

-- Migrar membresías heredadas únicamente cuando empresa y rol son reconocidos.
insert into public.perfiles (id, empresa_id, nombre, rol, activo)
select
  u.id,
  e.id,
  coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'nombre'), ''),
    nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
    u.id::text
  ),
  lower(trim(u.raw_app_meta_data ->> 'rol')),
  true
from auth.users u
join public.empresas e
  on e.activo
  and (
    (e.nombre = 'Smurfit' and lower(trim(coalesce(u.raw_app_meta_data ->> 'empresa', '')))
      in ('smurfit', 'smurfit westrock', 'smurfit westrock colombia'))
    or
    (e.nombre = 'Asociación de Mujeres Caficultoras del Cauca (AMUCC)'
      and lower(trim(coalesce(u.raw_app_meta_data ->> 'empresa', '')))
      in ('amucc', 'asociación de mujeres caficultoras del cauca (amucc)'))
  )
where lower(trim(coalesce(u.raw_app_meta_data ->> 'rol', '')))
  in ('consultor', 'analista', 'gerente')
on conflict (id) do nothing;

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

create or replace function public.asignar_empresa_por_defecto()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if new.empresa_id is null then
    raise exception 'empresa_id es obligatorio; indique explícitamente la empresa propietaria del registro';
  end if;
  return new;
end;
$$;

do $$
declare
  tabla text;
begin
  foreach tabla in array array[
    'alertas', 'indicadores', 'valores_indicador',
    'reglas', 'fuentes', 'ejecuciones'
  ] loop
    execute format('drop trigger if exists asignar_empresa on public.%I', tabla);
    execute format(
      'create trigger asignar_empresa before insert on public.%I for each row execute function public.asignar_empresa_por_defecto()',
      tabla
    );
  end loop;
end;
$$;

create or replace function public.validar_actualizacion_alerta()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  rol_usuario text := public.rol_actual();
begin
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

-- Elimina políticas anteriores que pudieran permitir lecturas compartidas.
do $$
declare
  tabla text;
  politica record;
begin
  foreach tabla in array array[
    'empresas', 'perfiles', 'alertas', 'indicadores',
    'valores_indicador', 'reglas', 'fuentes', 'ejecuciones'
  ] loop
    for politica in
      select policyname
      from pg_policies
      where schemaname = 'public' and tablename = tabla
    loop
      execute format('drop policy %I on public.%I', politica.policyname, tabla);
    end loop;
    execute format('alter table public.%I enable row level security', tabla);
  end loop;
end;
$$;

create policy perfiles_select_propio
on public.perfiles for select to authenticated
using (id = auth.uid());

create policy empresas_select_propia
on public.empresas for select to authenticated
using (id = public.empresa_actual() and activo);

create policy alertas_select_empresa
on public.alertas for select to authenticated
using (empresa_id = public.empresa_actual());
create policy alertas_update_empresa_rol
on public.alertas for update to authenticated
using (
  empresa_id = public.empresa_actual()
  and public.rol_actual() in ('analista', 'gerente')
)
with check (
  empresa_id = public.empresa_actual()
  and public.rol_actual() in ('analista', 'gerente')
);

do $$
declare
  tabla text;
begin
  foreach tabla in array array[
    'indicadores', 'reglas', 'fuentes', 'ejecuciones'
  ] loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (empresa_id = public.empresa_actual())',
      tabla || '_select_empresa',
      tabla
    );
  end loop;
end;
$$;

create policy valores_indicador_select_empresa_y_globales
on public.valores_indicador for select to authenticated
using (
  empresa_id = public.empresa_actual()
  or indicador_codigo in ('TRM', 'IPC', 'TASA_BANREP')
);

revoke all on public.empresas, public.perfiles, public.alertas, public.indicadores,
  public.valores_indicador, public.reglas, public.fuentes, public.ejecuciones
from anon, authenticated;

grant select on public.empresas, public.perfiles, public.alertas, public.indicadores,
  public.valores_indicador, public.reglas, public.fuentes, public.ejecuciones
to authenticated;

grant update (probabilidad, impacto, puntaje, nivel, prioritaria, factor, area, tipo_evento, estado, decision)
on public.alertas to authenticated;

grant execute on function public.empresa_actual() to authenticated;
grant execute on function public.rol_actual() to authenticated;
revoke all on function public.empresa_actual() from public, anon;
revoke all on function public.rol_actual() from public, anon;

-- La asignación de organización y rol es administrativa. Invocar esta función
-- después de crear cada usuario en Authentication > Users.
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

  select id into usuario_id
  from auth.users
  where lower(email) = lower(correo);
  if usuario_id is null then
    raise exception 'No existe un usuario autenticado con el correo %', correo;
  end if;

  select id into empresa_id_destino
  from public.empresas
  where nombre = empresa_nombre and activo;
  if empresa_id_destino is null then
    raise exception 'Empresa no habilitada: %', empresa_nombre;
  end if;

  insert into public.perfiles (id, empresa_id, nombre, rol, activo)
  values (
    usuario_id,
    empresa_id_destino,
    coalesce(nullif(trim(nombre_usuario), ''), split_part(correo, '@', 1)),
    rol_usuario,
    true
  )
  on conflict (id) do update
  set empresa_id = excluded.empresa_id,
      nombre = excluded.nombre,
      rol = excluded.rol,
      activo = true;

  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('empresa', empresa_nombre, 'rol', rol_usuario)
  where id = usuario_id;
end;
$$;

revoke all on function public.asignar_membresia(text, text, text, text)
from public, anon, authenticated;
grant execute on function public.asignar_membresia(text, text, text, text)
to postgres;

-- Las alertas etiquetadas con empresas retiradas permanecen sin empresa_id y
-- ocultas por RLS. Revise y clasifique esas filas antes de darles acceso.
--
-- Ejemplo administrativo: primero cree las cuentas en Supabase Auth y luego
-- ejecute una llamada por cuenta usando sus correos reales:
-- select public.asignar_membresia('correo-consultor@smurfit.example', 'Smurfit', 'consultor', 'Consultor de prueba');
-- select public.asignar_membresia('correo-analista@smurfit.example', 'Smurfit', 'analista', 'Analista de prueba');
-- select public.asignar_membresia('correo-gerente@smurfit.example', 'Smurfit', 'gerente', 'Gerente de prueba');
-- select public.asignar_membresia('correo-gerente@amucc.example', 'Asociación de Mujeres Caficultoras del Cauca (AMUCC)', 'gerente', 'Gerente AMUCC');
