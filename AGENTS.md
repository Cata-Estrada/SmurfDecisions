# Proyecto: panel de decisiones PESTEL para Smurfit Westrock Colombia
Fuente de verdad: docs/documento-maestro.md y docs/Análisis PESTEL – Smurfit Westrock Colombia.md. No inventes tablas, campos, pantallas ni reglas que no estén ahí; si algo es ambiguo, pregunta.

Stack: React + Tailwind CSS, JavaScript (sin TypeScript), react-router, @supabase/supabase-js. Sin backend propio. Se ejecuta en local con npm run dev; no hay despliegue.
Datos: Supabase. La app usa solo VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY desde .env. Nunca escribas claves en el código ni subas .env.
Idioma de la interfaz: español. Diseño sobrio, fondo claro, pensado para computador.
Catálogos (factores, áreas, estados, tipos de evento, reglas) y la fórmula de puntaje viven en src/lib/catalogos.js y src/lib/puntaje.js (puntaje = probabilidad x impacto; Alto 15-25, Medio 8-14, Bajo 1-7; prioritaria si puntaje >= 15).
Todo dato visible muestra fecha, fuente y unidad. El nivel se muestra con texto y color (Alto rojo, Medio ámbar, Bajo verde). Los hallazgos con origen "base" llevan la etiqueta "base".
Trabaja por fases: al terminar cada una, detente, resume qué hiciste y cómo probarlo.