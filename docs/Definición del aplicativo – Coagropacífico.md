# Definición del aplicativo · Coagropacífico

Documento de referencia de AgroDecisions. Resume la contrapropuesta aprobada y deja escritas las decisiones que se tomaron al implementarla. Los documentos de la versión anterior (Smurfit y AMUCC) están en [`historico/`](historico/).

## La pregunta del caso

> ¿Cuánto capital necesita Coagropacífico para comprar cacao según el precio, y en qué momento le conviene hacerlo?

Coagropacífico es una cooperativa de Tumaco (Nariño), fundada en 1989, que agrupa, clasifica y vende la producción de más de 300 pequeños productores. Colombia es tomadora de precio: la referencia es la bolsa de Nueva York, con Londres como segunda lectura. África mueve ese precio por su oferta (cosechas, llegadas a puerto, clima), y los precios oficiales de Costa de Marfil y Ghana reaccionan con demora.

**El sistema no pronostica precios.** Lee el precio internacional y las señales del mercado, lo convierte a pesos por kilo para cada calidad, calcula cuánta caja hace falta frente a la que hay y recomienda una ventana de compra con reglas que la cooperativa puede ajustar.

## Módulos

| Módulo | Pregunta que responde |
|---|---|
| **Panel de compra** | ¿Cómo estamos hoy? Precio por kilo y semáforo por calidad, capital frente a caja, cobertura, alertas abiertas y ventana de compra recomendada. |
| **Matriz de drivers** | ¿Qué está moviendo el precio? Seis drivers del cacao con su equivalencia PESTEL. |
| **Recomendador de compra** | ¿Qué hacer con cada calidad? Acción según la posición del precio, la cobertura de caja y las alertas. |
| **Simulador de capital** | ¿Qué pasa si cambian la bolsa, el dólar o el volumen? |
| **Noticias del cacao** | ¿Qué dicen las noticias? Clasificadas por driver y efecto sobre el precio (sube, baja, neutral). |
| **Actualizaciones** | Carga de caja, plan de compras y precio diario; estado de los flujos automáticos. |

## Lógica de decisión

Todos los parámetros se editan desde la aplicación.

```
Precio_q   = (Bolsa + dif_q) × TRM ÷ 1000 × (1 − margen)
Capital_q  = Volumen_q × Precio_q × (1 + acopio_q)
Capital    = Σ Capital_q × (1 + colchón)
Cobertura  = Caja ÷ Capital
Brecha     = Capital − Caja
```

- `dif_q`: diferencial de la calidad frente a la bolsa (USD/t).
- `margen`: descuento de la cooperativa sobre el precio de referencia para cubrir operación y utilidad.
- `acopio_q`: costo de acopio por calidad, en porcentaje.
- `colchón`: reserva de seguridad sobre el capital total.

**Ejemplo de validación** (cifras inventadas de la contrapropuesta): bolsa US$5.600/t, TRM $4.000, margen 20 %, acopio 5 %, colchón 10 %, calidades A (+300, 6.000 kg), B (0, 4.000 kg) y C (−400, 2.000 kg).

| | Resultado esperado | Resultado de la app |
|---|---|---|
| Precio A / B / C | $18.880 / $17.920 / $16.640 por kg | ✅ igual |
| Capital requerido | ≈ $252,1 millones | ✅ $252,1 M |
| Cobertura con caja de $250 M | 99 % | ✅ 99,2 % |
| Bolsa máxima que soporta la caja | ≈ US$5.553/t | ✅ US$5.553 |
| Bolsa +10 % / dólar +10 % | ≈ $276,9 M / $277,3 M | ✅ igual |

### Momento de compra

El sistema cruza tres lecturas:

1. **Posición del precio**: frente a los percentiles de los últimos 90 días. Bajo el P25 es *bajo*, entre P25 y P75 es *medio*, sobre el P75 es *alto*.
2. **Movimiento reciente**: variación de la bolsa en 5 días hábiles; más de 5 % genera alerta.
3. **Cobertura de caja**: menor a 100 % es *déficit*, entre 100 % y 120 % es *ajustada*, mayor a 120 % es *holgada*.

| Precio | Cobertura | Recomendación |
|---|---|---|
| Bajo | Holgada o ajustada | Ventana favorable: adelantar compras hasta el límite de la caja. |
| Bajo | Déficit | Ventana favorable sin caja: gestionar anticipo o crédito; priorizar la calidad de mayor margen. |
| Medio | Holgada | Comprar según el plan de compras. |
| Medio | Ajustada o déficit | Comprar lo esencial y asegurar caja antes del siguiente tramo. |
| Alto | Holgada | Limitar la compra al volumen comprometido; evitar acopio adicional. |
| Alto | Ajustada o déficit | Alerta roja: reducir volumen, escalonar compras o conseguir financiamiento. |

Además, la **alerta de precio de equilibrio** pone en rojo cualquier calidad cuyo precio de compra quede bajo el costo de producción informado.

Los umbrales (90 días, 5 días, 5 %, 100 %, 120 %) y los textos de las 9 combinaciones son editables. Son reglas de partida que la cooperativa debe validar.

## Drivers del cacao

| Driver | Qué vigila | PESTEL equivalente |
|---|---|---|
| Precio internacional | Bolsa de Nueva York y Londres | Económico |
| Oferta africana | Cosechas, llegadas a puerto, precio oficial de Costa de Marfil y Ghana | Económico / Ecológico |
| Clima | Lluvias y El Niño en África y en el Pacífico colombiano | Ecológico |
| Demanda | Molienda, inventarios, consumo | Económico |
| Regulación y mercado | EUDR, límites de cadmio, aranceles, certificaciones | Legal / Político |
| Entorno local | TRM, orden público y vías en Tumaco, costos, liquidez | Político / Económico / Social |

## Decisiones de implementación

Puntos que la contrapropuesta no definía al detalle y cómo se resolvieron:

| Tema | Decisión |
|---|---|
| **Fuente del precio de bolsa** | Futuro ICE de Nueva York (`CC=F`) vía Yahoo Finance, consultado en vivo. Es una fuente no oficial y puede tener retraso. n8n guarda el cierre diario como `CACAO_NY`. |
| **Londres (segunda lectura)** | No hay una fuente gratuita en tiempo real. Se usa la tabla diaria de la **ICCO**, que publica el futuro de Londres en £/t con unos días de retraso; se convierte a dólares con el GBP/USD de ese día y se compara con Nueva York del mismo día. Es solo contraste: los cálculos usan Nueva York. |
| **TRM** | Superintendencia Financiera (datos.gov.co). La app la sugiere y el usuario decide aplicarla al cálculo. |
| **Percentiles** | Se calculan sobre la bolsa (USD/t) y se convierten a pesos por kilo con la TRM vigente. La clasificación bajo/medio/alto es la misma que sobre el precio por kilo, porque este sube y baja con la bolsa. |
| **"Hasta el límite de la caja"** | Se calcula cuántos kilos del plan alcanza a pagar la caja (por calidad y en total) y cuántos se comprarían si toda la caja fuera a una sola calidad. |
| **"Calidad de mayor margen"** | Margen de la cooperativa = valor de referencia (bolsa + diferencial, en pesos) − precio de compra − acopio. Gana la de mayor margen **por peso invertido** (lo que importa cuando falta caja); si empatan, la de mayor margen por kilo. Debe revisarse con los precios de venta reales de la cooperativa. |
| **Alertas en la recomendación** | La tabla de reglas cruza precio y cobertura. La alerta de equilibrio cambia el semáforo de la calidad; la de movimiento (5 %) y las noticias se muestran como señales, sin cambiar la regla. |
| **Noticias** | n8n busca en Google Noticias (búsquedas de la tabla `consultas`) cada 6 horas y Gemini las clasifica por driver, tipo de evento, efecto en el precio, probabilidad e impacto. Las no relevantes se descartan; las que Gemini no clasifica bien quedan `sin_clasificar` para el analista. |
| **Puntaje de noticias** | Se conserva probabilidad × impacto (1 a 25) para priorizar alertas, junto con `efecto_precio`. |
| **Calidades, volúmenes, caja y costos** | Parámetros editables. La base viene con el ejemplo ilustrativo de la contrapropuesta; la cooperativa debe reemplazarlo. |
| **Empresas** | Solo Coagropacífico. El modelo conserva `empresa_id` y seguridad por filas (RLS). |

## Roles

| Rol | Puede |
|---|---|
| Consultor | Ver todos los módulos. |
| Analista | Además, editar parámetros, calidades, caja, plan de compras y precio diario; validar, descartar y reclasificar noticias. |
| Gerente | Además, aceptar o descartar decisiones, editar las reglas del recomendador y ejecutar los flujos de n8n desde la app. |

## Límites y riesgos

- Es monitoreo y simulación, no pronóstico. Las recomendaciones salen de reglas; la IA solo clasifica y resume noticias.
- Yahoo Finance y la ICCO son fuentes públicas no licenciadas para uso comercial; pueden cambiar o dejar de responder.
- Los diferenciales y umbrales son el punto más sensible: si están mal, el precio por kilo y el capital salen mal.
- La cuenta gratuita de n8n Cloud es de prueba y vence; Gemini gratuito tiene límites de uso.

## Fuentes

NESsT – Coagropacífico · Panorama del cacao en Colombia · FRED – Global price of Cocoa · La República – Cacao · ICCO – Boletín trimestral de estadísticas y precios diarios · Fedecacao.
