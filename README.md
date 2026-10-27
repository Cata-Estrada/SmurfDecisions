# SmurfDecisions - Plataforma Multiempresa de Inteligencia PESTEL
### Smurfit y Asociación de Mujeres Caficultoras del Cauca (AMUCC)

SmurfDecisions es una plataforma de inteligencia del entorno y apoyo a decisiones estratégicas para **Smurfit** y la **Asociación de Mujeres Caficultoras del Cauca (AMUCC)**. Cada cuenta recibe una sola empresa y un rol, asignados en la base de datos.

El sistema monitorea variables críticas nacionales (desastres climáticos como El Niño, bloqueos de transporte, alzas en tarifas de energía, volatilidad de la TRM, reformas tributarias y laborales) y las traduce en decisiones operativas accionables con responsables asignados.

---

## 🏛 Arquitectura de la Solución

1. **Frontend:** React + Vite + Tailwind CSS + React Router + Lucide Icons.
2. **Autenticación y datos:** **Supabase Auth + PostgreSQL**. Supabase es obligatorio para usar el dashboard; no se simulan sesiones ni se sirven datos locales cuando la base de datos falla.
3. **Aislamiento:** RLS compara los datos empresariales con la membresía activa del usuario. TRM, IPC y Tasa BanRep son indicadores macroeconómicos globales, visibles para cualquier usuario autenticado; los demás datos permanecen aislados por `empresa_id`. Los roles se leen desde `perfiles`, no desde metadatos editables en el navegador.
4. **Automatización:** Flujos programados en **n8n Cloud** con **Google Gemini Flash** para clasificar noticias RSS y consultar datos abiertos de la TRM.
5. **Lógica de decisión:** escala de impacto en `src/lib/puntaje.js`; las reglas empresariales se consultan desde Supabase.

---

## 📦 Estructura del Proyecto

```text
SmurfDecisions/
├── docs/
│   ├── Documento maestro de definición del aplicativo.md
│   └── Análisis PESTEL – Smurfit Westrock Colombia.md
├── supabase/
│   ├── functions/
│   │   └── ejecutar-flujo/  # Edge Function segura para disparar los flujos
│   └── schema.sql           # Tablas, membresías, roles y políticas RLS multiempresa
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
│   │   ├── SimuladorEconomico.jsx
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
2. Haz una copia de seguridad y revisa `supabase/schema.sql` antes de ejecutarlo en **SQL Editor**. Es una migración aditiva para las tablas empresariales ya existentes: no reconstruye sus claves o columnas ni elimina datos o empresas. Crea las tablas `empresas` y `perfiles` si faltan, añade `empresa_id`, y reemplaza las políticas RLS de las tablas empresariales para impedir que políticas antiguas más permisivas mantengan acceso cruzado. La única excepción global son los valores de TRM, IPC y Tasa BanRep, que cualquier usuario autenticado puede consultar.

La migración asigna las alertas cuyo campo `empresa` identifica claramente a Smurfit o AMUCC. Por confirmación, también asigna a Smurfit las filas heredadas sin etiqueta de empresa (incluidas las tablas que no tenían ese campo). Las alertas etiquetadas con organizaciones retiradas se conservan sin reasignar y quedan ocultas por RLS hasta que un administrador las revise. Las filas de empresas retiradas y sus perfiles se conservan, pero esas empresas quedan desactivadas y sin acceso mediante RLS. La migración importa las membresías de `app_metadata` solo cuando reconoce la empresa y uno de los tres roles; puedes asignar o corregirlas con la función administrativa descrita abajo. `perfiles` será la fuente de verdad para la app y la función administrativa también sincroniza los campos heredados `app_metadata.empresa` y `app_metadata.rol`.

Las tablas preexistentes conservan sus tipos de clave y columnas; la migración no intenta convertir, por ejemplo, `fuentes.id` ni añadir claves primarias que ya tengan otra forma. Antes de ejecutarla, confirma que las columnas de negocio usadas por la aplicación existan en el esquema actual. La migración detiene su ejecución si falta una de las seis tablas empresariales esperadas. Cada tabla requiere un `empresa_id` válido para las nuevas inserciones: no hay asignación automática a Smurfit. RLS impide lecturas entre organizaciones incluso si se modifica una ruta o un parámetro del cliente, salvo para los códigos macroeconómicos globales `TRM`, `IPC` y `TASA_BANREP`. Solo Analista/Gerente pueden editar alertas y únicamente Gerente puede actualizar decisiones.

### 3. Creación de cuentas y asignación de roles
1. Crea las cuentas de prueba en **Authentication → Users** de Supabase: tres para Smurfit y una para AMUCC. Configura sus contraseñas allí y confirma los correos según la política del proyecto.
2. En **SQL Editor**, ejecuta `public.asignar_membresia(correo, empresa, rol, nombre)` una vez por cada usuario existente:
   ```sql
   select public.asignar_membresia('correo-consultor@smurfit.example', 'Smurfit', 'consultor', 'Consultor de prueba');
   select public.asignar_membresia('correo-analista@smurfit.example', 'Smurfit', 'analista', 'Analista de prueba');
   select public.asignar_membresia('correo-gerente@smurfit.example', 'Smurfit', 'gerente', 'Gerente de prueba');
   select public.asignar_membresia('correo-gerente@amucc.example', 'Asociación de Mujeres Caficultoras del Cauca (AMUCC)', 'gerente', 'Gerente AMUCC');
   ```
   Sustituye los correos de ejemplo por los correos reales creados en Supabase Auth. El registro público crea la identidad, pero no concede acceso hasta que un administrador asigne empresa y rol.

### 4. Variables de Entorno
Edita el archivo local `.env` en la raíz del proyecto:
```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-public-key
```
Usa únicamente la clave pública `anon`/publishable en la aplicación; nunca pongas la clave `service_role` en variables `VITE_`.

En Windows, abre una terminal PowerShell en la carpeta raíz del repositorio. La primera vez, instala el CLI como dependencia de desarrollo e inicializa el proyecto (esto crea `supabase/config.toml`):
```bash
npm install --save-dev supabase
npx supabase init
npx supabase login
npx supabase link --project-ref TU_PROJECT_REF
```
Obtén `TU_PROJECT_REF` de la URL del dashboard de Supabase: `https://supabase.com/dashboard/project/TU_PROJECT_REF`. Luego configura los secretos y despliega la función al proyecto enlazado:
```bash
npx supabase secrets set N8N_WEBHOOK_URL=https://tu-instancia-n8n/webhook/tu-webhook N8N_WEBHOOK_KEY=tu-clave-segura
npx supabase functions deploy ejecutar-flujo
```
Si ya instalaste e inicializaste el CLI, no repitas esos pasos iniciales; basta con enlazar el proyecto correcto y desplegar.
La función usa `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` del entorno administrado por Supabase; no copies la clave `service_role` a `.env` ni al navegador.

El botón invoca `ejecutar-flujo` con el JWT de Supabase y `flujo: "noticias"`. La función valida que el flujo sea uno de `indicadores`, `noticias` o `recomendaciones`, obtiene `empresa_id` del perfil activo del usuario y solo permite el rol Gerente; ignora cualquier empresa indicada por el navegador. Para `noticias`, rechaza nuevas solicitudes si la empresa ya tiene una ejecución iniciada en los últimos 10 minutos. Envía a n8n `empresa_id` (y `empresaId` para compatibilidad con el flujo existente), `flujo` y `requestedAt`. Configura el nodo **Webhook** con método `POST`, respuesta **Immediately** y autenticación **Header Auth** con encabezado `X-API-Key`; usa la misma clave de `N8N_WEBHOOK_KEY`. Conserva `empresa_id` por las ramas y asígnalo en cada fila insertada en `alertas`, `indicadores`, `valores_indicador`, `reglas`, `fuentes` y `ejecuciones`. Cada rama debe insertar su ejecución con `flujo` exactamente igual a `indicadores`, `noticias` o `recomendaciones`. El polling del navegador filtra por empresa autenticada. Activa el webhook y usa su **Production URL** (no la Test URL). Al finalizar, el botón refresca el historial desde Supabase.

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
