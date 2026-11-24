# AgroDecisions · Compra de cacao para Coagropacífico

Sistema de apoyo a la decisión de compra de cacao para **Coagropacífico**, cooperativa de Tumaco (Nariño). Responde una sola pregunta:

> ¿Cuánto capital necesita la cooperativa para comprar cacao según el precio, y en qué momento le conviene hacerlo?

Lee el precio internacional y las noticias del mercado, lo convierte a pesos por kilo para cada calidad, calcula cuánta caja hace falta frente a la que hay y recomienda una ventana de compra con reglas claras que la cooperativa puede ajustar. **No pronostica precios.**

La definición completa, con las fórmulas, las reglas y las decisiones de implementación, está en [`docs/Definición del aplicativo – Coagropacífico.md`](docs/Definición%20del%20aplicativo%20–%20Coagropacífico.md).

---

## Módulos

| Módulo | Ruta | Qué hace |
|---|---|---|
| **Panel de compra** | `/dashboard` | Ventana de compra recomendada, bolsa de Nueva York (y Londres como segunda lectura), TRM, capital frente a caja, cobertura, precio por kilo y semáforo por calidad, kilos que alcanza la caja, calidad de mayor margen y alertas abiertas. |
| **Noticias del cacao** | `/dashboard/noticias` | Noticias clasificadas por driver y efecto en el precio. El analista las valida, descarta o reclasifica. |
| **Matriz de drivers** | `/dashboard/drivers` | Los 6 drivers del cacao con su equivalencia PESTEL, nivel y presión sobre el precio. |
| **Recomendador de compra** | `/dashboard/recomendador` | Acción por calidad según precio, cobertura y alertas; matriz de reglas editable; decisiones sobre alertas. |
| **Simulador de capital** | `/dashboard/simulador` | Parámetros, calidades, umbrales y escenarios de bolsa, dólar y volumen. |
| **Actualizaciones** | `/dashboard/actualizaciones` | Caja con historial, plan de compras, precio diario, fuentes y ejecuciones de n8n. |

## Roles

| Rol | Puede |
|---|---|
| Consultor | Ver todos los módulos. |
| Analista | Además, editar parámetros, calidades, caja, plan de compras y precio diario; validar y reclasificar noticias. |
| Gerente | Además, aceptar o descartar decisiones, editar las reglas del recomendador y ejecutar los flujos de n8n. |

Los permisos se aplican en la base de datos (RLS de Supabase), no solo en la interfaz.

---

## Arquitectura

```
Navegador (React + Vite + Tailwind)
   │  sesión de Supabase (Auth)
   ▼
Supabase ─ PostgreSQL con RLS por empresa y rol
   │       Edge Functions:
   │         precio-cacao    → Yahoo (CC=F), TRM oficial y Londres (ICCO)
   │         ejecutar-flujo  → dispara n8n (solo Gerente)
   ▼
n8n Cloud ─ Noticias del cacao (Google Noticias + Gemini) cada 6 h
            Precio diario (bolsa, TRM y Londres) L–V 6 p. m.
            Manejo de errores
```

| Fuente | Dato | Uso |
|---|---|---|
| Yahoo Finance `CC=F` | Futuro de cacao ICE Nueva York, USD/t | Precio de referencia de todos los cálculos |
| ICCO (tabla diaria) | Futuro de Londres, £/t, con unos días de retraso | Segunda lectura de contraste |
| Superintendencia Financiera (datos.gov.co) | TRM | Sugerida para el cálculo |
| Google Noticias + Gemini | Noticias del cacao | Alertas por driver y efecto en el precio |

---

## Estructura

```text
├── docs/
│   ├── Definición del aplicativo – Coagropacífico.md
│   └── historico/                 # Documentos de la versión anterior (Smurfit / AMUCC)
├── n8n/
│   ├── flujo_noticias_cacao.json
│   ├── flujo_precio_diario.json
│   ├── flujo_errores.json
│   ├── generar_flujos.py          # Genera los tres JSON
│   └── README.md                  # Cuenta de n8n, credenciales, importación y conexión
├── supabase/
│   ├── schema.sql                 # Esquema completo para un proyecto nuevo
│   ├── functions/
│   │   ├── precio-cacao/
│   │   └── ejecutar-flujo/
│   └── README.md                  # Instalación de la base paso a paso
├── src/
│   ├── components/                # Layout, gráfica, semáforo, escenarios, carga de datos…
│   ├── lib/
│   │   ├── compraCacao.js         # Fórmulas, percentiles, cobertura, reglas, escenarios
│   │   ├── useCompraCacao.js      # Carga de datos y cálculo del panel
│   │   ├── dataService.js         # Acceso a Supabase
│   │   ├── n8nService.js          # Botón "Ejecutar flujos"
│   │   ├── catalogos.js           # Drivers, áreas, tipos de evento
│   │   ├── puntaje.js             # Probabilidad × impacto de las noticias
│   │   └── formato.js
│   └── pages/                     # Los seis módulos, landing, login y registro
├── .env.example
└── package.json
```

---

## Puesta en marcha

### Requisitos

- Node.js 18 o superior.
- Un proyecto de [Supabase](https://supabase.com).
- Para las noticias y el precio diario automáticos: una cuenta de [n8n](https://n8n.io) y una clave gratuita de [Gemini](https://aistudio.google.com/apikey).

### 1. Instalar dependencias

```bash
npm install
```

### 2. Base de datos

Sigue [`supabase/README.md`](supabase/README.md):
1. Ejecuta `supabase/schema.sql` en el SQL Editor.
2. Crea los usuarios y asígnales rol.
3. Despliega las funciones:

```bash
npx supabase link --project-ref TU_PROJECT_REF
npx supabase functions deploy precio-cacao
npx supabase functions deploy ejecutar-flujo
```

### 3. Variables de entorno

Copia `.env.example` como `.env` y completa:

```env
VITE_SUPABASE_URL=https://TU_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anon-public
```

Solo va la clave pública (`anon` / *publishable*). La clave `service_role` nunca va en el `.env` ni en el código: solo en n8n.

### 4. Automatización (opcional)

Sigue [`n8n/README.md`](n8n/README.md): credenciales, importación de los tres flujos, publicación y secretos de `ejecutar-flujo`. Sin n8n la app funciona igual, pero no llegan noticias y el precio diario solo se guarda a mano desde **Actualizaciones**.

### 5. Ejecutar

```bash
npm run dev
```

Abre `http://localhost:5173` e inicia sesión con un usuario que tenga rol asignado.

---

## Validación

La base viene cargada con el ejemplo ilustrativo de la contrapropuesta (cifras inventadas): calidades A, B y C, TRM $4.000, margen 20 %, acopio 5 %, colchón 10 % y caja de $250 millones. Con la bolsa en US$5.600/t, la app da los valores del documento:

| | Esperado | App |
|---|---|---|
| Precio por kilo A / B / C | $18.880 / $17.920 / $16.640 | ✅ |
| Capital requerido | ≈ $252,1 M | ✅ |
| Cobertura | 99 % | ✅ |
| Bolsa máxima que soporta la caja | ≈ US$5.553/t | ✅ |
| Bolsa +10 % / dólar +10 % | ≈ $276,9 M / $277,3 M | ✅ |

**Antes de usar la app para decidir, la cooperativa debe reemplazar esos parámetros por los suyos** desde el Simulador de capital y Actualizaciones.

## Límites

- Monitoreo y simulación, no pronóstico. Las recomendaciones salen de reglas; la IA solo clasifica y resume noticias.
- Yahoo Finance y la ICCO son fuentes públicas no oficiales; pueden tener retraso, cambiar o dejar de responder.
- Los diferenciales y umbrales son el punto más sensible del cálculo y deben salir de datos reales.
- n8n Cloud gratuito es de prueba y vence; Gemini gratuito tiene límites de uso.
