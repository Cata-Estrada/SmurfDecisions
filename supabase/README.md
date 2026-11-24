# Supabase · Instalación desde cero

Guía para montar la base de datos nueva de Coagropacífico.

## 1. Crear el proyecto

1. Entra a [supabase.com](https://supabase.com) → **New project**.
2. Ponle un nombre (por ejemplo `smurfdecisions-cacao`), elige una contraseña de base de datos y la región **South America (São Paulo)**.
3. Espera a que termine de crearse (1–2 minutos).

## 2. Crear las tablas

1. En el menú izquierdo abre **SQL Editor** → **New query**.
2. Pega el archivo completo [`schema.sql`](schema.sql) y pulsa **Run**.
3. Debe terminar con `Success. No rows returned`.

Esto crea las tablas, la seguridad por empresa (RLS) y deja cargados:

- la empresa **Coagropacífico**;
- los 6 drivers del cacao;
- las 9 reglas del recomendador de compra (precio × cobertura);
- las reglas por tipo de noticia, las búsquedas de noticias y las fuentes;
- el **ejemplo ilustrativo** de la contrapropuesta: calidades A, B y C, TRM de 4.000, margen del 20 %, acopio del 5 %, colchón del 10 % y caja de $250 millones. Son cifras inventadas: se cambian desde la app.

Si lo vuelves a ejecutar no duplica nada.

## 3. Crear usuarios

1. **Authentication → Users → Add user → Create new user**. Pon correo y contraseña y marca *Auto Confirm User*.
2. Vuelve al **SQL Editor** y asígnale empresa y rol:

```sql
select public.asignar_membresia('correo@ejemplo.com', 'Coagropacífico', 'gerente', 'Nombre');
```

Roles disponibles:

| Rol | Puede |
|---|---|
| `consultor` | Solo ver |
| `analista` | Editar parámetros, calidades, caja, plan de compras y alertas |
| `gerente` | Todo lo anterior, más aprobar decisiones y ajustar las reglas del recomendador |

## 4. Conectar la app

1. En **Project Settings → API** copia la **Project URL** y la clave **anon public**.
2. En la raíz del proyecto, copia `.env.example` como `.env` y pega los dos valores.
3. Reinicia `npm run dev`.

## 5. Publicar las funciones

La función `precio-cacao` trae el futuro de cacao de Nueva York (Yahoo Finance, `CC=F`) con 5 años de historial, la TRM oficial de la Superintendencia Financiera y el precio de Londres publicado por la ICCO.

Desde la raíz del proyecto:

```bash
npx supabase login
npx supabase link --project-ref TU_PROJECT_REF
npx supabase functions deploy precio-cacao
npx supabase functions deploy ejecutar-flujo
```

`ejecutar-flujo` es la función del botón **Ejecutar flujos n8n**; necesita los secretos que se explican en [`../n8n/README.md`](../n8n/README.md) (paso 6).

`TU_PROJECT_REF` es lo que aparece en la URL del proyecto: `https://TU_PROJECT_REF.supabase.co`.

`precio-cacao` no necesita claves ni variables de entorno. Las dos funciones solo responden a usuarios con sesión iniciada.

## Modelo de datos

| Tabla | Para qué |
|---|---|
| `empresas`, `perfiles`, `areas` | Organización, usuarios y roles |
| `configuracion_compra_cacao` | TRM, margen, colchón y umbrales del recomendador |
| `calidades_cacao` | Diferencial, volumen, acopio y costo de producción por calidad |
| `plan_compras` | Tramos de compra programados por calidad y fecha |
| `caja` | Historial de la caja disponible; la vigente es la más reciente |
| `reglas_compra` | Matriz del recomendador: nivel de precio × cobertura |
| `indicadores`, `valores_indicador` | Series globales: `TRM`, `CACAO_NY`, `CACAO_LON` |
| `drivers` | Los 6 drivers del cacao y su equivalencia con PESTEL |
| `alertas` | Noticias clasificadas por n8n + Gemini, con `efecto_precio` (sube, baja, neutral) |
| `reglas`, `consultas`, `fuentes`, `ejecuciones` | Insumos y bitácora de los flujos de n8n |

n8n escribe con la clave `service_role`, que salta el RLS. Esa clave nunca va en el `.env` del navegador.
