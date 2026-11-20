# AgroDecisions - Sistema de apoyo a la compra de cacao
### Coagropacífico

AgroDecisions apoya a **Coagropacífico** en la decisión de cuánto capital necesita para comprar cacao por calidad y en qué momento hacerlo. La primera etapa se centra en referencias de mercado, parámetros editables y cálculos de escenarios; no pretende pronosticar precios.

Las cuentas tendrán roles diferenciados y los datos seguirán aislados por `empresa_id` y políticas RLS de Supabase. Los parámetros de calidad, volúmenes, caja y costos deberán validarse con la cooperativa antes de usarse para decidir.

---

## 🏛 Arquitectura de la Solución

1. **Frontend:** React + Vite + Tailwind CSS + React Router + Lucide Icons.
2. **Autenticación y datos:** **Supabase Auth + PostgreSQL**. Supabase es obligatorio para usar el dashboard; no se simulan sesiones ni se sirven datos locales cuando la base de datos falla.
3. **Aislamiento:** cada fila empresarial tiene `empresa_id`; RLS la compara con la membresía activa del usuario. Los roles se leen desde `perfiles`, no desde metadatos editables en el navegador.
4. **Referencia de mercado:** el módulo de compra consulta Yahoo Finance para el futuro de cacao ICE `CC=F`, grafica precios diarios y usa la última cotización en los cálculos. El nivel de precio se compara con el historial de cinco años.
5. **Automatización futura:** n8n se integrará después de definir y validar el modelo de datos y las fuentes de precio.
6. **Lógica de decisión:** el módulo de compra calcula precio por calidad, capital requerido, cobertura y brecha con parámetros que la cooperativa debe informar.

---

## 📦 Estructura del Proyecto

```text
AgroDecisions/
├── docs/
│   └── Documentación del proyecto
├── supabase/
│   └── schema.sql           # Membresías, empresa activa y políticas RLS
├── n8n/
│   ├── flujo_1_indicadores_trm.json
│   ├── flujo_2_noticias_gemini.json
│   └── README.md
├── src/
│   ├── components/          # Layout institucional, tarjetas e insignias
│   ├── lib/
│   │   ├── catalogos.js     # Factores, áreas y estados
│   │   ├── puntaje.js       # Fórmula: Probabilidad x Impacto (1-25)
│   │   ├── supabase.js      # Cliente de Supabase
│   │   └── dataService.js   # Acceso y persistencia con recalculo en vivo
│   ├── pages/               # Los 6 módulos del aplicativo
│   │   ├── PanelEjecutivo.jsx
│   │   ├── NoticiasAnalizadas.jsx
│   │   ├── AnalisisPestel.jsx
│   │   ├── Recomendador.jsx
│   │   ├── CompraCacao.jsx
│   │   └── CentroActualizaciones.jsx
│   ├── App.jsx              # Configuración de rutas
│   ├── index.css            # Tailwind CSS
│   └── main.jsx
├── .env.example             # Plantilla de variables de entorno
├── AGENTS.md                # Reglas y principios de construcción del proyecto
├── package.json
├── tailwind.config.js
└── vite.config.js
```

---

## 🚀 Instalación y Puesta en Marcha Local

### Requisitos previos
- Node.js (versión 18 o superior).
- Proyecto de [Supabase](https://supabase.com/) configurado; el dashboard no tiene modo local ni sesiones de demostración simuladas.

### 1. Instalación de dependencias
```bash
npm install
```

### 2. Configuración de Base de Datos (Supabase)
1. Entra a tu proyecto en Supabase &rarr; **SQL Editor**.
2. Haz una copia de seguridad y revisa `supabase/schema.sql` antes de ejecutarlo en **SQL Editor**. Es una migración aditiva para las tablas empresariales ya existentes: no reconstruye sus claves o columnas ni elimina datos o empresas. Crea las tablas `empresas` y `perfiles` si faltan, añade `empresa_id`, y reemplaza las políticas RLS de las tablas empresariales. Coagropacífico queda como única empresa activa; `empresa_id` y RLS se conservan para mantener el aislamiento de datos.

La migración asigna automáticamente únicamente alertas que identifican explícitamente a Coagropacífico. No reasigna datos sin empresa ni datos vinculados a empresas anteriores. Las empresas y filas heredadas se conservan, pero las empresas anteriores y sus perfiles quedan desactivados; sus datos permanecen ocultos por RLS hasta que un administrador los revise y decida cómo clasificarlos. La migración importa metadatos de autenticación solo cuando identifican a Coagropacífico y un rol válido. `perfiles` será la fuente de verdad para la app y la función administrativa también sincroniza `app_metadata.empresa` y `app_metadata.rol`.

El esquema también crea `configuracion_compra_cacao`, `calidades_cacao` y `observaciones_precio_cacao`, restringidas por RLS a la empresa activa. Analistas y Gerentes pueden guardar parámetros y calidades; los demás roles tienen acceso de lectura. La tabla de observaciones manuales se conserva para no borrar datos existentes; la referencia de mercado proviene de Yahoo Finance y no requiere cambiar el esquema.

Las tablas preexistentes conservan sus tipos de clave y columnas; la migración no intenta convertir, por ejemplo, `fuentes.id` ni añadir claves primarias que ya tengan otra forma. Antes de ejecutarla, confirma que las columnas de negocio usadas por la aplicación existan en el esquema actual. La migración detiene su ejecución si falta una de las seis tablas empresariales esperadas. Cada tabla requiere un `empresa_id` válido para nuevas inserciones; no se asigna automáticamente Coagropacífico a datos heredados. RLS restringe los datos a la membresía activa. Solo Analista/Gerente pueden editar alertas y únicamente Gerente puede actualizar decisiones.

La ruta **Compra de cacao** (en el menú, reemplaza el antiguo Simulador Económico) consulta el futuro continuo de cacao ICE `CC=F` mediante Yahoo Finance. Muestra cotización, variación diaria e historial diario en periodos de 5 días a 5 años. La cotización más reciente alimenta los cálculos y el nivel de precio se compara con el historial de cinco años. Es una referencia de futuros internacionales, no el precio local pagado al productor. Yahoo Finance no es fuente oficial ni licenciada para uso comercial y puede cambiar o dejar de responder; úsala como prototipo. La tabla antigua de observaciones manuales permanece en Supabase sin usarse, para conservar los registros existentes; no hay que borrarla.

La función también consulta la TRM vigente del conjunto oficial de [Datos Abiertos Colombia, publicado por la Superintendencia Financiera](https://www.datos.gov.co/Econom-a-y-Finanzas/Tasa-de-Cambio-Representativa-del-Mercado-TRM/32sa-8pi3). La tasa se presenta como sugerencia con su periodo de vigencia: **no reemplaza por sí sola** el valor guardado por la cooperativa. Se consulta al cargar y luego una vez al día (o al actualizar manualmente). Un usuario con permiso de edición debe elegir “Usar TRM oficial” y guardar los parámetros para aplicarla. Si la fuente no está disponible, se conserva la opción de mantener o ingresar la TRM manualmente.

La Edge Function consulta Yahoo y Datos Abiertos desde el servidor para evitar restricciones del navegador. Se debe desplegar en el mismo proyecto Supabase de la aplicación; guardar el archivo no la despliega. Esta actualización **no requiere volver a ejecutar `schema.sql`**. Para desplegarla, instala/usa Supabase CLI, inicia sesión y enlaza el proyecto una sola vez:

```bash
supabase login
supabase link --project-ref TU_PROJECT_REF
supabase functions deploy precio-cacao
```

`TU_PROJECT_REF` es el identificador que aparece en la URL de Supabase: `https://TU_PROJECT_REF.supabase.co`. Ejecuta los comandos desde la raíz del repositorio. La función requiere una sesión autenticada; consulta Yahoo al cargar el panel y cada cinco minutos. La cotización puede tener retraso, y la API no oficial de Yahoo puede cambiar o dejar de responder.

El cálculo aplica `precio_kg = (bolsa_usd_t + diferencial_usd_t) × TRM / 1000 × (1 − margen_pct / 100)`, `capital_calidad = volumen_kg × precio_kg × (1 + acopio_pct / 100)` y `capital_requerido = suma(capital_calidad) × (1 + colchon_pct / 100)`. La cobertura es `caja_disponible / capital_requerido`; la brecha es `capital_requerido - caja_disponible`. Estos resultados son orientativos y dependen de parámetros que la cooperativa debe validar.

### 3. Creación de cuentas y asignación de roles
1. Crea las cuentas de prueba en **Authentication → Users** de Supabase. Configura sus contraseñas allí y confirma los correos según la política del proyecto.
2. En **SQL Editor**, asigna cada cuenta a Coagropacífico con el rol autorizado:
   ```sql
   select public.asignar_membresia('correo@coagropacifico.example', 'Coagropacífico', 'consultor', 'Usuario de prueba');
   ```
   Sustituye el correo de ejemplo por el correo real creado en Supabase Auth y usa el rol autorizado (`consultor`, `analista` o `gerente`). El registro público crea la identidad, pero no concede acceso hasta que un administrador asigne la membresía.

### 4. Integración existente de n8n (fuera de la etapa actual)

La aplicación conserva un relay local de n8n de la versión anterior. No configurar ni modificar esos flujos durante la primera etapa: se retomarán cuando el esquema de Coagropacífico y la fuente de precio estén definidos. Las instrucciones siguientes describen ese relay existente y deberán revisarse antes de reutilizarlo con el nuevo modelo.

Edita el archivo local `.env` en la raíz del proyecto:
```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-public-key

# Webhook de n8n Cloud (solo servidor local; no usar prefijo VITE_)
N8N_WEBHOOK_URL=
N8N_WEBHOOK_KEY=
```
Usa únicamente la clave pública `anon`/publishable en la aplicación; nunca pongas la clave `service_role` en variables `VITE_`.

La URL y la clave de n8n se leen solo desde el servidor local de Vite y no se envían al navegador. Si ya habías guardado esos valores como `VITE_N8N_WEBHOOK_URL` y `VITE_N8N_WEBHOOK_KEY`, renómbralos en `.env` a `N8N_WEBHOOK_URL` y `N8N_WEBHOOK_KEY`, sin cambiar los valores. Como las variables con prefijo `VITE_` pueden exponerse al cliente, genera una clave nueva en n8n antes de usar este botón y actualiza el valor local.

El botón envía una solicitud `POST` con respuesta inmediata y los campos `requestedAt` y `empresaId`. El relay valida el token de Supabase y exige el rol Gerente antes de llamar a n8n; `empresaId` sale del perfil autenticado, no de un parámetro libre del navegador. Configura el nodo **Webhook** con método `POST`, respuesta **Immediately** y autenticación **Header Auth** con encabezado `X-API-Key`; usa la misma clave de `N8N_WEBHOOK_KEY`. Conserva `empresaId` por las ramas y asígnalo a `empresa_id` en cada fila insertada en `alertas`, `indicadores`, `valores_indicador`, `reglas`, `fuentes` y `ejecuciones`. La base rechaza las inserciones que no indiquen explícitamente `empresa_id`; no asigna automáticamente datos heredados a Coagropacífico. Cada rama debe insertar su ejecución con `flujo` exactamente igual a `indicadores`, `noticias` o `recomendaciones`. El polling del navegador también filtra por la empresa autenticada. Activa el webhook y configura `N8N_WEBHOOK_URL` con su **Production URL** (no la Test URL). El botón bloquea ejecuciones simultáneas mientras espera y, al terminar, refresca el historial desde Supabase.

Reinicia Vite después de editar `.env`. Este relay existe únicamente en `npm run dev`, escucha solicitudes locales y no está incluido en el build de producción.

### 5. Ejecución en modo desarrollo
```bash
npm run dev
```
Abre en tu navegador `http://localhost:5173`.

---

## 🎯 Los Seis Módulos Implementados

| Módulo | Ruta | Propósito Principal |
| --- | --- | --- |
| **Panel Ejecutivo** | `/dashboard` | Indicadores de la empresa autenticada, alertas prioritarias, resumen PESTEL y decisiones pendientes. |
| **Noticias Analizadas** | `/dashboard/noticias` | Bandeja para consultar y, con rol autorizado, editar alertas de la propia empresa. |
| **Análisis PESTEL** | `/dashboard/pestel` | Métricas y tendencias calculadas a partir de las alertas de la empresa autenticada. |
| **Recomendador de Decisiones** | `/dashboard/recomendador` | Alertas validadas y reglas cargadas desde la base de datos de la empresa. |
| **Simulador Económico** | `/dashboard/simulador` | Escenarios para la TRM registrada en la base de datos de la empresa. |
| **Centro de Actualizaciones** | `/dashboard/actualizaciones` | Fuentes e historial de ejecuciones filtrados por empresa. |

---

## ⚙️ Escala de Impacto Oficial

$$\text{Puntaje} = \text{Probabilidad (1 a 5)} \times \text{Impacto (1 a 5)}$$

- **Alto:** 15 a 25 (Rojo) &rarr; Alerta a gerencia y plan de acción.
- **Medio:** 8 a 14 (Ámbar) &rarr; Seguimiento semanal y escenario de contingencia.
- **Bajo:** 1 a 7 (Verde) &rarr; Monitoreo y registro.
- **Prioritaria:** Alertas con puntaje $\ge 15$.
