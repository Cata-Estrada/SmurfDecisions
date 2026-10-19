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

### 3. Variables de Entorno
Crea un archivo `.env` en la raíz del proyecto (basado en `.env.example`):
```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-public-key
```

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
