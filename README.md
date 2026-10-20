# SmurfDecisions - Panel de Inteligencia del Entorno PESTEL
### Smurfit Westrock Colombia (Planta Yumbo, Valle del Cauca)

SmurfDecisions es una plataforma web de inteligencia del entorno y apoyo a la toma de decisiones estratégicas para **Smurfit Westrock Colombia** (operación integrada desde plantaciones forestales hasta producción de papel, cartón corrugado y reciclaje).

El sistema monitorea variables críticas nacionales (desastres climáticos como El Niño, bloqueos de transporte, alzas en tarifas de energía, volatilidad de la TRM, reformas tributarias y laborales) y las traduce en decisiones operativas accionables con responsables asignados.

---

## 🏛 Arquitectura de la Solución

1. **Frontend:** React + Vite + Tailwind CSS + React Router + Lucide Icons (JavaScript puro, interfaz institucional en español optimizada para pantallas de escritorio).
2. **Base de Datos:** PostgreSQL en la nube mediante **Supabase** (sin backend propio).
3. **Automatización:** Flujos programados en **n8n Cloud** con el modelo **Google Gemini Flash** para la lectura y clasificación de noticias en formato RSS y datos abiertos de la TRM.
4. **Lógica de Decisión:** Catálogo de reglas determinísticas por `tipo_evento` en `src/lib/catalogos.js` y escala única de impacto en `src/lib/puntaje.js`.

---

## 📦 Estructura del Proyecto

```text
SmurfDecisions/
├── docs/
│   ├── Documento maestro de definición del aplicativo.md
│   └── Análisis PESTEL – Smurfit Westrock Colombia.md
├── supabase/
│   ├── schema.sql           # DDL de las 6 tablas con índices y restricciones
│   └── seed.sql             # Datos iniciales con los 27 hallazgos base del PESTEL
├── n8n/
│   ├── flujo_1_indicadores_trm.json
│   ├── flujo_2_noticias_gemini.json
│   └── README.md
├── src/
│   ├── components/          # Layout institucional, tarjetas e insignias
│   ├── lib/
│   │   ├── catalogos.js     # Factores, áreas, estados y reglas determinísticas
│   │   ├── puntaje.js       # Fórmula: Probabilidad x Impacto (1-25)
│   │   ├── supabase.js      # Cliente de Supabase
│   │   ├── datosIniciales.js# 27 hallazgos PESTEL y valores de referencia
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
- Cuenta gratuita en [Supabase](https://supabase.com/) (opcional para persistencia en la nube; el aplicativo cuenta con modo local autónomo con los 27 hallazgos base).

### 1. Instalación de dependencias
```bash
npm install
```

### 2. Configuración de Base de Datos (Supabase)
1. Entra a tu proyecto en Supabase &rarr; **SQL Editor**.
2. Copia y ejecuta el contenido de `supabase/schema.sql`.
3. Copia y ejecuta el contenido de `supabase/seed.sql`.

Si ya tienes un proyecto de Supabase con tablas o datos propios, no ejecutes estos scripts de ejemplo sin revisar sus cambios: el `seed.sql` carga datos PESTEL de muestra. La aplicación consulta las tablas `alertas`, `indicadores`, `valores_indicador`, `reglas`, `fuentes` y `ejecuciones`; usa las columnas disponibles en ellas.

### 3. Variables de Entorno
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

El botón envía una solicitud `POST` con respuesta inmediata y espera hasta cinco minutos a que `ejecuciones` registre nuevas filas con los valores de flujo `indicadores`, `noticias` y `recomendaciones`. La espera compara IDs nuevos (no fechas de los equipos) y muestra los nombres observados si no coinciden. En el nodo **Webhook** de n8n, configura método `POST`, respuesta **Immediately** y autenticación **Header Auth** con encabezado `X-API-Key`; usa la misma clave de `N8N_WEBHOOK_KEY`. El webhook debe iniciar los tres flujos y cada uno debe insertar al finalizar su fila en `ejecuciones`, usando exactamente esos valores en la columna `flujo`. Activa el webhook y configura `N8N_WEBHOOK_URL` con su **Production URL** (no la Test URL). El botón bloquea ejecuciones simultáneas mientras espera y, al terminar, refresca el historial desde Supabase.

Reinicia Vite después de editar `.env`. Este relay existe únicamente en `npm run dev`, escucha solicitudes locales y no está incluido en el build de producción.

### 4. Ejecución en modo desarrollo
```bash
npm run dev
```
Abre en tu navegador `http://localhost:5173`.

---

## 🎯 Los Seis Módulos Implementados

| Módulo | Ruta | Propósito Principal |
| --- | --- | --- |
| **Panel Ejecutivo** | `/` | Indicadores macro (TRM, IPC, Tasa BanRep) con aviso de desactualización (>3 días), alertas prioritarias ($\ge 15$), resumen consolidado por factor PESTEL y decisiones pendientes. |
| **Noticias Analizadas** | `/noticias` | Bandeja de analista: filtros por factor, nivel, área, estado y origen. Permite validar, descartar, reclasificar y ajustar probabilidad e impacto con recálculo instantáneo. |
| **Análisis PESTEL** | `/pestel` | Desglose por los 6 factores, tendencias prospectivas, comparación y distinción clara de los 27 hallazgos base con la etiqueta `"base"`. |
| **Recomendador de Decisiones** | `/recomendador` | Asocia alertas validadas con reglas determinísticas por `tipo_evento`. Muestra acción sugerida, responsable, motivo y supuestos. Permite aceptar o descartar la decisión. |
| **Simulador Económico** | `/simulador` | Calcula la variación en pesos ante fluctuaciones de la TRM para compras en USD, con fórmula oficial y declaración explícita de supuestos. |
| **Centro de Actualizaciones** | `/actualizaciones` | Auditoría del sistema: tabla de fuentes monitoreadas, frecuencias e historial de ejecuciones con detalle de fallos y registros nuevos. |

---

## ⚙️ Escala de Impacto Oficial

$$\text{Puntaje} = \text{Probabilidad (1 a 5)} \times \text{Impacto (1 a 5)}$$

- **Alto:** 15 a 25 (Rojo) &rarr; Alerta a gerencia y plan de acción.
- **Medio:** 8 a 14 (Ámbar) &rarr; Seguimiento semanal y escenario de contingencia.
- **Bajo:** 1 a 7 (Verde) &rarr; Monitoreo y registro.
- **Prioritaria:** Alertas con puntaje $\ge 15$.
