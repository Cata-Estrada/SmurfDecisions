# SmurfDecisions - Plataforma Multiempresa de Inteligencia PESTEL
### Smurfit y Asociación de Mujeres Caficultoras del Cauca (AMUCC)

SmurfDecisions es una plataforma de inteligencia del entorno y apoyo a decisiones estratégicas para **Smurfit** y la **Asociación de Mujeres Caficultoras del Cauca (AMUCC)**. Cada cuenta recibe una sola empresa y un rol, asignados en la base de datos.

El sistema monitorea variables críticas nacionales (desastres climáticos como El Niño, bloqueos de transporte, alzas en tarifas de energía, volatilidad de la TRM, reformas tributarias y laborales) y las traduce en decisiones operativas accionables con responsables asignados.

---

## 🏛 Arquitectura de la Solución

1. **Frontend:** React + Vite + Tailwind CSS + React Router + Lucide Icons.
2. **Autenticación y datos:** **Supabase Auth + PostgreSQL**. Supabase es obligatorio para usar el dashboard; no se simulan sesiones ni se sirven datos locales cuando la base de datos falla.
3. **Aislamiento:** cada fila empresarial tiene `empresa_id`; RLS la compara con la membresía activa del usuario. Los roles se leen desde `perfiles`, no desde metadatos editables en el navegador.
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
2. Haz una copia de seguridad y revisa `supabase/schema.sql` antes de ejecutarlo en **SQL Editor**. Es una migración aditiva para las tablas empresariales ya existentes: no reconstruye sus claves o columnas ni elimina datos o empresas. Crea las tablas `empresas` y `perfiles` si faltan, añade `empresa_id`, y reemplaza las políticas RLS de las tablas empresariales para impedir que políticas antiguas más permisivas mantengan acceso cruzado.

La migración asigna las alertas cuyo campo `empresa` identifica claramente a Smurfit o AMUCC. Por confirmación, también asigna a Smurfit las filas heredadas sin etiqueta de empresa (incluidas las tablas que no tenían ese campo). Las alertas etiquetadas con organizaciones retiradas se conservan sin reasignar y quedan ocultas por RLS hasta que un administrador las revise. Las filas de empresas retiradas y sus perfiles se conservan, pero esas empresas quedan desactivadas y sin acceso mediante RLS. La migración importa las membresías de `app_metadata` solo cuando reconoce la empresa y uno de los tres roles; puedes asignar o corregirlas con la función administrativa descrita abajo. `perfiles` será la fuente de verdad para la app y la función administrativa también sincroniza los campos heredados `app_metadata.empresa` y `app_metadata.rol`.

Las tablas preexistentes conservan sus tipos de clave y columnas; la migración no intenta convertir, por ejemplo, `fuentes.id` ni añadir claves primarias que ya tengan otra forma. Antes de ejecutarla, confirma que las columnas de negocio usadas por la aplicación existan en el esquema actual. La migración detiene su ejecución si falta una de las seis tablas empresariales esperadas. Cada tabla requiere un `empresa_id` válido para las nuevas inserciones: no hay asignación automática a Smurfit. RLS impide lecturas entre organizaciones incluso si se modifica una ruta o un parámetro del cliente. Solo Analista/Gerente pueden editar alertas y únicamente Gerente puede actualizar decisiones.

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

# Webhook de n8n Cloud (solo servidor local; no usar prefijo VITE_)
N8N_WEBHOOK_URL=
N8N_WEBHOOK_KEY=
```
Usa únicamente la clave pública `anon`/publishable en la aplicación; nunca pongas la clave `service_role` en variables `VITE_`.

La URL y la clave de n8n se leen solo desde el servidor local de Vite y no se envían al navegador. Si ya habías guardado esos valores como `VITE_N8N_WEBHOOK_URL` y `VITE_N8N_WEBHOOK_KEY`, renómbralos en `.env` a `N8N_WEBHOOK_URL` y `N8N_WEBHOOK_KEY`, sin cambiar los valores. Como las variables con prefijo `VITE_` pueden exponerse al cliente, genera una clave nueva en n8n antes de usar este botón y actualiza el valor local.

El botón envía una solicitud `POST` con respuesta inmediata y los campos `requestedAt` y `empresaId`. El relay valida el token de Supabase y exige el rol Gerente antes de llamar a n8n; `empresaId` sale del perfil autenticado, no de un parámetro libre del navegador. Configura el nodo **Webhook** con método `POST`, respuesta **Immediately** y autenticación **Header Auth** con encabezado `X-API-Key`; usa la misma clave de `N8N_WEBHOOK_KEY`. Conserva `empresaId` por las ramas y asígnalo a `empresa_id` en cada fila insertada en `alertas`, `indicadores`, `valores_indicador`, `reglas`, `fuentes` y `ejecuciones`. La base rechaza las inserciones que no indiquen explícitamente `empresa_id`; no clasifica esos registros por defecto como Smurfit. Cada rama debe insertar su ejecución con `flujo` exactamente igual a `indicadores`, `noticias` o `recomendaciones`. El polling del navegador también filtra por la empresa autenticada. Activa el webhook y configura `N8N_WEBHOOK_URL` con su **Production URL** (no la Test URL). El botón bloquea ejecuciones simultáneas mientras espera y, al terminar, refresca el historial desde Supabase.

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
