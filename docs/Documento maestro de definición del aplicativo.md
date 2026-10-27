# Documento maestro de definición del aplicativo

Oct 18, 2026 · @Cat Estrada

## 1. Contexto y propósito

El proyecto es una aplicación web que convierte las noticias y los indicadores del entorno colombiano en alertas y recomendaciones de decisión para Smurfit Westrock Colombia, usando PESTEL como marco de análisis y n8n como motor de actualización automática. Nace de una actividad de Arquitectura Empresarial en la que la profesora pidió usar PESTEL.

### Problema

Las noticias nacionales (desastres naturales, marchas, cambios políticos, moneda y tasas de cambio, normas, avance de la IA) llegan dispersas y sin conexión con la operación. Nadie las filtra por relevancia para la empresa ni las traduce en una decisión. El PESTEL de la empresa (documento aparte) muestra qué tan expuesta está: por ejemplo, El Niño, la jornada de 42 horas y la energía más cara tienen nivel alto.

### Solución

Una aplicación que recoge información de fuentes externas de forma periódica, clasifica cada hallazgo en uno de los seis factores PESTEL, estima su impacto en la empresa y sugiere acciones con responsable y justificación. El flujo central es:

**Noticia o dato → clasificación PESTEL → impacto en la empresa → decisión sugerida.**

### Objetivos

1. Mantener actualizada la información del entorno sin intervención manual.
2. Clasificar los hallazgos en los seis factores PESTEL y medir su impacto con una escala única.
3. Apoyar decisiones concretas con recomendaciones justificadas y trazables.
4. Entregar un prototipo funcional demostrable, con el análisis PESTEL y la arquitectura documentados.

### Usuarios

| Usuario | Qué necesita |
| --- | --- |
| Gerencia | Ver los riesgos y oportunidades prioritarios y decidir |
| Analistas de planeación | Revisar, validar y ajustar las alertas |
| Compras y finanzas | Medir el efecto del dólar y los costos de abastecimiento |
| Operaciones y logística | Anticipar paros, bloqueos, clima y energía |
| Jurídico, ambiental y sostenibilidad | Recibir normas y novedades para verificar su aplicabilidad |

### Alcance

La aplicación cubre Colombia y dos organizaciones: Smurfit y la Asociación de Mujeres Caficultoras del Cauca (AMUCC). Cada usuario pertenece a una sola empresa y tiene un rol asignado en la base de datos. El entorno local es solo para desarrollo; autenticación y datos requieren Supabase.

### Valor diferencial

No es un panel de indicadores ni un lector de noticias: relaciona cada cambio del entorno con un factor PESTEL, un nivel de impacto en la empresa y una acción. Además, cada dato conserva fecha, fuente y estado de validación, y las recomendaciones salen de reglas explícitas, no de un modelo que decide solo.

## 2. Definición del aplicativo

La aplicación es un panel web de inteligencia del entorno: n8n alimenta una base de datos en la nube con indicadores y noticias clasificadas, y seis módulos las presentan como alertas, análisis PESTEL, recomendaciones y simulaciones.

&#91;embedded content: mapa de módulos · 6 módulos\]

Las flechas indican de dónde toma datos cada módulo. El panel ejecutivo resume lo que producen los demás; el recomendador es el módulo diferenciador, porque convierte una alerta en una acción.

### Qué se construirá

- **Una aplicación web React** que puede ejecutarse localmente durante el desarrollo.
- **Dos flujos de automatización en n8n cloud**, uno de indicadores y otro de noticias.
- **Una base de datos en la nube** (Supabase) con aislamiento por empresa mediante políticas RLS. La aplicación consulta y modifica datos únicamente según la membresía autenticada.

### Cómo funciona

1. n8n consulta fuentes externas en horarios programados.
2. Valida los datos, elimina duplicados y, en el caso de las noticias, las clasifica por factor PESTEL con un modelo de IA.
3. Calcula la prioridad con probabilidad × impacto y guarda el resultado con fecha, fuente y estado «pendiente».
4. La aplicación lee la base de datos y muestra indicadores, noticias, análisis y alertas.
5. Un analista valida o descarta cada alerta; las validadas alimentan al recomendador.

### Qué permite hacer

- Ver de un vistazo los riesgos y oportunidades prioritarios del entorno colombiano.
- Filtrar noticias por factor PESTEL, impacto, fuente, fecha y área afectada.
- Consultar la acción sugerida para cada alerta, con su justificación y supuestos.
- Simular el efecto de la TRM sobre el costo en pesos de una compra en dólares.
- Comprobar cuándo se actualizó cada fuente y si hubo errores.

### Resultados que ofrece

- Alertas priorizadas con nivel Alto, Medio o Bajo y responsable sugerido.
- Un resumen PESTEL con el nivel de riesgo por factor.
- Recomendaciones trazables: cada una enlaza la noticia, la regla aplicada y las suposiciones.

## 3. Módulos y funcionalidades

Los seis módulos comparten una escala única de prioridad: puntaje = probabilidad × impacto, ambos de 1 a 5, con nivel Alto de 15 a 25, Medio de 8 a 14 y Bajo de 1 a 7 (definida en el documento PESTEL). Una alerta validada con puntaje de 15 o más se destaca ante la gerencia. Los catálogos y parámetros que usan todos los módulos están al final de esta sección.

### 3.1 Panel ejecutivo

| Aspecto | Descripción |
| --- | --- |
| Propósito | Dar a la gerencia una vista única de la situación sin revisar cada noticia |
| Funcionalidades | Tarjetas con TRM, IPC anual y tasa del Banco de la República (con fecha y fuente); las alertas de mayor puntaje; un resumen de los seis factores con su nivel; decisiones pendientes |
| Entradas | Tablas de indicadores y alertas, y el catálogo de reglas |
| Procesamiento | Agrega por factor: el nivel de un factor es el mayor puntaje entre sus alertas validadas y activas |
| Resultados | Una pantalla de lectura rápida, sin edición |
| Reglas | Solo cuenta alertas validadas; un indicador con más de 3 días sin actualizar se marca como desactualizado |
| Relación | Lee de los módulos 2, 3, 4 y 6; enlaza a cada uno |

### 3.2 Noticias analizadas

| Aspecto | Descripción |
| --- | --- |
| Propósito | Listar cada hallazgo del entorno con su clasificación y permitir que un analista lo valide |
| Funcionalidades | Filtros por factor, nivel, fuente, fecha, área y estado; detalle con resumen, justificación, enlace a la fuente y puntaje; acciones de validar, descartar, reclasificar, ajustar probabilidad e impacto y asignar área |
| Entradas | Noticias normalizadas que deja el flujo 2 de n8n |
| Procesamiento | Un modelo de IA propone factor PESTEL, área afectada, tipo de evento, probabilidad, impacto y una explicación breve, eligiendo entre los catálogos fijos; el sistema calcula el puntaje |
| Resultados | Alertas con estado pendiente, validada o descartada |
| Reglas | Toda noticia entra como pendiente de validación; sin fuente verificable no se crea la alerta; los duplicados se descartan por enlace o título; una norma nueva solo se remite al área responsable, sin determinar su aplicabilidad jurídica |
| Relación | Alimenta a los módulos 1, 3 y 4; se ajusta desde el análisis humano |

### 3.3 Análisis PESTEL

| Aspecto | Descripción |
| --- | --- |
| Propósito | Mostrar el entorno ordenado por los seis factores, como en el documento PESTEL |
| Funcionalidades | Una vista por factor con su nivel, su tendencia, las alertas activas y los hallazgos base; comparación entre factores |
| Entradas | Alertas validadas; hallazgos base del documento PESTEL cargados como datos iniciales identificados |
| Procesamiento | Nivel = mayor puntaje del factor; tendencia = mayor puntaje de los últimos 7 días frente a los 7 anteriores (sube, estable o baja) |
| Resultados | Matriz PESTEL actualizada con los datos más recientes |
| Reglas | Los hallazgos base se distinguen de los que llegan por n8n |
| Relación | Lee del módulo 2; sus datos alimentan al panel |

### 3.4 Recomendador de decisiones

| Aspecto | Descripción |
| --- | --- |
| Propósito | Convertir una alerta validada en una acción justificada |
| Funcionalidades | Muestra la recomendación complementaria generada por n8n cuando existe, la acción sugerida por el catálogo, el motivo, el área responsable, las suposiciones, la fuente y el estado (pendiente, aceptada, descartada) |
| Entradas | Alerta validada (factor, tipo de evento, puntaje, área), el catálogo de reglas y el campo opcional `recomendacion_texto` |
| Procesamiento | Busca la regla que coincide con el tipo de evento y muestra por separado el texto complementario guardado por n8n; la regla del catálogo sigue siendo la acción determinística |
| Resultados | Recomendación complementaria de n8n (si existe) y acción determinística del catálogo por alerta |
| Reglas | La decisión sale de las reglas del catálogo (ver Catálogos y parámetros); si el tipo de evento no tiene regla, queda «sin regla: revisión manual» |
| Relación | Lee del módulo 2 y del simulador; sus resultados aparecen en el panel |

### 3.5 Simulador económico

| Aspecto | Descripción |
| --- | --- |
| Propósito | Medir cuánto cambia en pesos una compra en dólares cuando varía la TRM |
| Funcionalidades | El usuario ingresa el monto en dólares y un escenario (TRM o variación en %); la aplicación muestra costo base, costo del escenario y diferencia |
| Entradas | Monto en USD, TRM actual (de la base de datos) y escenario |
| Procesamiento | Ver la fórmula debajo |
| Resultados | Costo en pesos en ambos escenarios, diferencia absoluta y porcentual |
| Reglas | Supone que el precio en dólares, el volumen y los demás costos no cambian; el resultado es orientativo y lo declara en pantalla |
| Relación | Usa el indicador de TRM del flujo 1; enlaza con las recomendaciones de abastecimiento |

```latex
\text{Diferencia} = M \cdot (\text{TRM}_{escenario} - \text{TRM}_{base})
```

M es el monto de la compra en dólares. Los datos reales de compras de Smurfit no están disponibles, por lo que el usuario los ingresa a mano.

### 3.6 Centro de actualizaciones

| Aspecto | Descripción |
| --- | --- |
| Propósito | Mostrar que la automatización funciona y detectar fallas |
| Funcionalidades | Tabla de fuentes con última ejecución, próxima consulta, estado, registros nuevos y error; historial de ejecuciones |
| Entradas | Registro que n8n escribe al terminar cada ejecución |
| Procesamiento | Ninguno; solo presenta el registro |
| Resultados | Visibilidad del estado de cada fuente |
| Reglas | Si una fuente falla, la aplicación conserva el último valor válido con su fecha y marca el error |
| Relación | Lee del flujo de n8n; alimenta el indicador de «desactualizado» del panel |

### Catálogos y parámetros

Estos valores se cargan como datos y se usan igual en la IA, en los flujos y en la aplicación.

| Catálogo | Valores |
| --- | --- |
| Factor | Político, Económico, Social, Tecnológico, Ecológico, Legal |
| Área | Compras y finanzas, Operaciones y logística, Forestal, Talento humano, Jurídico y ambiental, Planeación y sostenibilidad, Comercial |
| Estado de la alerta | pendiente, validada, descartada, sin\_clasificar |
| Decisión del usuario | pendiente, aceptada, descartada |

Reglas iniciales del recomendador (una por tipo de evento):

| tipo\_evento | Acción sugerida | Área responsable |
| --- | --- | --- |
| paro\_bloqueo | Revisar inventarios críticos y rutas alternas | Operaciones y logística |
| clima\_incendio | Revisar el plan de contingencia forestal y de agua | Forestal |
| energia\_racionamiento | Verificar la continuidad de la planta y la autogeneración | Operaciones y logística |
| norma\_ambiental\_empaques | Remitir para verificar vigencia y aplicabilidad | Jurídico y ambiental |
| norma\_laboral\_tributaria | Remitir para verificar aplicabilidad y costo | Talento humano |
| tasa\_cambio | Abrir el simulador y consultar a finanzas sobre negociación o cobertura | Compras y finanzas |
| otro | Sin regla: revisión manual | Planeación y sostenibilidad |

Parámetros:

| Parámetro | Valor |
| --- | --- |
| Prioridad alta | Puntaje de 15 o más |
| Alerta por TRM | Variación mayor a 3 % frente a 5 días hábiles atrás; probabilidad 5 e impacto 3 |
| Dato desactualizado | Más de 3 días sin actualizar |
| Frecuencia del flujo 1 | Una vez al día |
| Frecuencia del flujo 2 | Cada 6 horas |
| Noticias por ejecución | Hasta 15 nuevas |
| Reintentos | 3 intentos |
| Tendencia de un factor | Mayor puntaje de los últimos 7 días frente a los 7 anteriores |

## 4. Automatización con n8n

La automatización se ejecuta en n8n cloud y consta de dos flujos independientes, uno de indicadores y otro de noticias. Ambos escriben en la misma base de datos y dejan un registro de cada ejecución en la tabla ejecuciones. En la demostración, cada flujo también se puede ejecutar a mano desde n8n.

### Flujo 1: indicadores

1. **Desencadenante:** nodo Schedule, una vez al día.
2. **Consulta:** nodo HTTP Request (GET) al dataset de la TRM del portal de datos abiertos de Colombia, que publica la Superfinanciera: `https://www.datos.gov.co/resource/32sa-8pi3.json?$order=vigenciadesde DESC&$limit=1`. Devuelve valor, unidad, vigenciadesde y vigenciahasta; la fecha del dato es vigenciadesde (los fines de semana un mismo valor cubre varios días).
3. **Validación:** el valor debe ser numérico y mayor que cero, y la fecha debe ser válida.
4. **Decisión:** se consulta en la base de datos si ya existe el valor de esa fecha; si existe, solo se registra la ejecución.
5. **Actualización:** se inserta el valor en valores\_indicador, que conserva el historial.
6. **Regla de alerta:** se compara con el valor de 5 días hábiles atrás; si la variación supera 3 %, se inserta una alerta económica con tipo\_evento tasa\_cambio, probabilidad 5 e impacto 3, en estado pendiente.
7. **Registro:** se inserta una fila en ejecuciones.
8. **Alcance:** el IPC y la tasa del Banco de la República no se automatizan en el MVP; se cargan una vez al inicio con su fecha y fuente.

### Flujo 2: noticias y novedades normativas

Se ejecuta de forma programada, lee las fuentes, filtra y clasifica cada noticia y deja las relevantes como alertas pendientes. Un humano las valida después.

&#91;embedded content: flujo 2 de n8n · 8 pasos, 3 decisiones\]

La IA solo propone la clasificación; el puntaje lo calcula el flujo con probabilidad × impacto, y la validación final es de un analista.

Fuentes. Cinco búsquedas de Google Noticias en formato RSS, leídas con el nodo RSS Feed Read, con el patrón news.google.com/rss/search?q=CONSULTA&hl=es-419&gl=CO&ceid=CO:es-419. Las consultas son una por tema: paros y bloqueos, El Niño e incendios (IDEAM y UNGRD), energía y racionamiento, normas sobre empaques y residuos, y reforma tributaria y laboral. Cada ejecución procesa hasta 15 noticias nuevas.

Clasificación con IA. Un nodo de Gemini recibe el título, el resumen, la fuente y la fecha de la noticia, junto con un texto fijo (el prompt de abajo) que describe a la empresa y los catálogos. Responde solo en JSON; si relevante es falso, la noticia se descarta. El nodo siguiente calcula puntaje = probabilidad × impacto y marca como prioritaria si es 15 o más.

```text
Eres analista del entorno de Smurfit Westrock Colombia (papel, cartón corrugado, empaques y plantaciones forestales; planta principal en Yumbo, Valle del Cauca).
Evalúa la noticia y responde SOLO con JSON válido:
{"relevante": true o false,
 "factor": "Político|Económico|Social|Tecnológico|Ecológico|Legal",
 "area": "Compras y finanzas|Operaciones y logística|Forestal|Talento humano|Jurídico y ambiental|Planeación y sostenibilidad|Comercial",
 "tipo_evento": "paro_bloqueo|clima_incendio|energia_racionamiento|norma_ambiental_empaques|norma_laboral_tributaria|tasa_cambio|otro",
 "probabilidad": 1 a 5,
 "impacto": 1 a 5,
 "explicacion": "máximo 2 frases"}
relevante es true solo si la noticia puede afectar costos, suministro, operación, cumplimiento o demanda de la empresa en los próximos 12 meses.
probabilidad: qué tan probable es que el hecho afecte a la empresa. impacto: qué tan grave sería.
No inventes datos que no estén en la noticia.
```

### Intercambio de datos

| De | A | Medio | Contenido |
| --- | --- | --- | --- |
| Fuentes externas | n8n | HTTP, API o RSS | Indicadores, noticias y publicaciones |
| n8n | Modelo de IA | API | Texto de la noticia y contexto; devuelve la clasificación |
| n8n | Base de datos | Escritura | Indicadores, alertas y log de ejecución |
| Base de datos | Aplicación web | Lectura | Todo lo que muestran los módulos |
| Aplicación web | Base de datos | Escritura | Validaciones, ajustes y estado de recomendaciones |

### Manejo de errores

- **La fuente no responde:** el nodo reintenta hasta 3 veces (opción Retry On Fail); si sigue fallando, se inserta una fila en ejecuciones con estado error y la aplicación conserva el último valor válido con su fecha.
- **Dato inválido o fuera de rango:** se descarta y se registra.
- **Falla Gemini:** la noticia se guarda con estado sin\_clasificar para revisión manual.
- **Falla la escritura en la base de datos:** el flujo termina en error y queda visible en el historial de ejecuciones de n8n.
- **Cualquier otro error:** lo recoge un flujo de error de n8n (Error Trigger) que inserta una fila en ejecuciones. No hay aviso externo; el error se ve en el Centro de actualizaciones.
- **Repetición segura:** ejecutar un flujo dos veces no duplica datos, porque el enlace de la alerta es único y el par indicador y fecha también.

### Participación del usuario

El usuario no ejecuta los flujos. Interviene validando o descartando alertas, ajustando clasificaciones, aceptando o descartando recomendaciones y revisando el Centro de actualizaciones. En la demostración, el equipo ejecuta los flujos a mano desde n8n.

## 5. Diseño de la interfaz

La interfaz es una aplicación web de una sola página con un menú lateral de seis pantallas, una por módulo; el panel ejecutivo es la pantalla de inicio. El boceto muestra la distribución del panel.

&#91;embedded content: boceto del panel ejecutivo y menú de navegación\]

Los indicadores van arriba, las alertas ocupan la zona principal porque es lo primero que lee la gerencia, y el resumen por factor queda a su lado.

### Pantallas

| Pantalla | Información presentada | Componentes | Acciones del usuario |
| --- | --- | --- | --- |
| 1 Panel ejecutivo | TRM, IPC y tasa con fecha y fuente; alertas de mayor puntaje; nivel por factor; decisiones pendientes | Tarjetas de indicador, lista de alertas, resumen de seis factores, lista de decisiones | Abrir una alerta o un factor |
| 2 Noticias analizadas | Hallazgos con factor, nivel, área, fuente, fecha y estado; detalle con resumen y justificación | Tabla con filtros y panel de detalle | Filtrar, validar, descartar, reclasificar, ajustar probabilidad e impacto, asignar área |
| 3 Análisis PESTEL | Seis factores, cada uno con nivel, tendencia, alertas y hallazgos base | Pestañas o tarjetas por factor, indicador de tendencia | Cambiar de factor, abrir un hallazgo |
| 4 Recomendador | Recomendaciones con acción, motivo, responsable, supuestos, fuente y estado | Lista de tarjetas con estado | Aceptar, descartar, abrir la alerta de origen |
| 5 Simulador | Monto en USD, TRM base y escenario; costos y diferencia; supuestos | Formulario y tarjeta de resultado | Cambiar valores y ver el resultado |
| 6 Actualizaciones | Fuentes con última ejecución, próxima consulta y estado; historial | Tabla, indicador de estado, historial | Revisar errores |

### Navegación y experiencia de usuario

- Cada alerta del panel abre su detalle en Noticias analizadas, y cada recomendación abre su alerta de origen.
- Todo dato muestra su fecha, fuente y unidad.
- El nivel se indica con texto y color: Alto en rojo, Medio en ámbar y Bajo en verde.
- Los hallazgos base del documento PESTEL se identifican con la etiqueta «base» en pantalla.
- Sin inicio de sesión, roles ni permisos.
- Idioma español y diseño pensado para pantalla de computador.
- Estilo sobrio: fondo claro, tarjetas con bordes suaves y tipografía del sistema.

## 6. Arquitectura y stack tecnológico

La arquitectura se describe en cuatro capas: negocio y procesos, datos, aplicación y tecnología. Cada capa se apoya en la inferior.

### Las cuatro capas

&#91;embedded content: las cuatro capas de la arquitectura\]

| Capa | Qué define | Elementos |
| --- | --- | --- |
| Negocio y procesos | Qué hace la empresa con la información | Procesos: monitorear el entorno, evaluar el impacto, decidir y asignar responsables, dar seguimiento. Actores: gerencia, planeación, compras y finanzas, operaciones y logística, jurídico y ambiental. Decisiones que se apoyan: costos de abastecimiento, cambios normativos, continuidad de suministro y costos frente a sostenibilidad |
| Datos | Qué información se guarda | Indicadores y su historial, alertas, reglas del recomendador, fuentes y registro de ejecuciones (modelo de datos más abajo) |
| Aplicación | Qué programas procesan y presentan los datos | Flujo 1 y flujo 2 de n8n; aplicación web con seis módulos (sección 3) |
| Tecnología | Con qué se construye | n8n cloud, Supabase, Gemini, React con Vite en el equipo local (stack más abajo) |

### Componentes y comunicación

La aplicación se ejecuta en local y no se despliega. n8n escribe en la base de datos lo que obtiene del entorno, y la aplicación web la lee y escribe las validaciones de los usuarios. Ningún componente se llama directamente con otro salvo n8n con las fuentes y con el modelo de IA.

&#91;embedded content: componentes y comunicación · 5 componentes y usuarios\]

### Stack tecnológico

| Componente | Tecnología | Responsabilidad | Por qué |
| --- | --- | --- | --- |
| Automatización | n8n cloud | Programar, consultar, validar, clasificar, puntuar y escribir | Elegida por el equipo; no requiere servidor propio y corre aunque el equipo esté apagado |
| Base de datos | Supabase (PostgreSQL), plan gratuito | Almacenar y compartir los datos | n8n cloud no puede escribir en una base local; Supabase tiene nodo nativo en n8n y una API lista para la aplicación |
| Aplicación web | React con Vite y Tailwind CSS, ejecutada en local con npm run dev | Mostrar los seis módulos y registrar las validaciones | Es una combinación muy usada, lo que facilita generar el código con IA; no requiere despliegue |
| Acceso a datos | Cliente de Supabase (supabase-js) con la clave pública y RLS | Leer y escribir exclusivamente las filas autorizadas al usuario | La política de base de datos se mantiene como control final, aunque el cliente altere rutas o parámetros |
| IA | Modelo Flash de Google Gemini, con el nodo de Gemini de n8n | Clasificar y resumir noticias | Tiene capa gratuita (verificar los límites vigentes) y nodo nativo en n8n; si el equipo ya tiene una clave de la API de Claude, puede cambiar el nodo sin modificar el resto del flujo |

La clave de servicio de Supabase y la clave de Gemini se guardan solo en las credenciales de n8n. La aplicación usa únicamente la clave pública de Supabase, en un archivo `.env` que no se sube al repositorio. Supabase Auth autentica usuarios; la tabla `perfiles` asigna empresa y rol, y las políticas RLS aplican esas restricciones en la base de datos.

La migración `supabase/schema.sql` está diseñada para una base existente: conserva las estructuras y claves de las tablas empresariales, reemplaza sus políticas RLS y no borra registros ni empresas. Las alertas con una etiqueta reconocida se asignan a su empresa; por confirmación administrativa, las filas heredadas sin etiqueta se asignan a Smurfit. Las alertas etiquetadas con empresas retiradas se mantienen sin acceso hasta su revisión. Las nuevas inserciones deben indicar explícitamente `empresa_id`. Las membresías antiguas de `app_metadata` se importan solo si empresa y rol son válidos; `perfiles` es la fuente de verdad para la autorización de la aplicación.

### Modelo de datos

| Tabla | Campos |
| --- | --- |
| perfiles | usuario autenticado, empresa\_id, rol y estado de la membresía |
| empresas | id, nombre y sector de cada organización habilitada |
| fuentes | empresa\_id, id, nombre, tipo (indicador o noticia), frecuencia\_horas |
| indicadores | empresa\_id, codigo (TRM, IPC, TASA\_BANREP), nombre, unidad |
| valores\_indicador | empresa\_id, id, indicador\_codigo, fecha, valor, fuente |
| alertas | empresa\_id, id, titulo, resumen, fuente, fecha, factor, área, tipo, puntajes, estado y decisión |
| reglas | empresa\_id, tipo\_evento, acción, área\_responsable y supuestos |
| ejecuciones | empresa\_id, id, flujo, fuente, inicio, fin, estado, registros\_nuevos y mensaje\_error |

El puntaje es probabilidad × impacto; el nivel es Alto de 15 a 25, Medio de 8 a 14 y Bajo de 1 a 7. Las recomendaciones no tienen tabla propia: la aplicación une cada alerta con su regla de la misma empresa por tipo\_evento y guarda la decisión en la propia alerta. Las políticas RLS limitan cada lectura y escritura a `empresa_id` obtenido de la membresía del usuario; el cliente no decide su empresa ni su rol.

## 7. Flujos de uso

Los tres ejemplos usan hallazgos del análisis PESTEL del 17 de octubre de 2026 para ilustrar el recorrido. Son escenarios ilustrativos de cómo debería comportarse el sistema, no resultados de una ejecución real.

### Ejemplo 1: El Niño y el riesgo para las plantaciones (factor ecológico)

1. El flujo 2 lee una publicación del IDEAM sobre la declaratoria de El Niño del 8 de octubre.
2. No es duplicada. La IA la clasifica como ecológica, área Forestal, tipo clima\_incendio, probabilidad 5 e impacto 4: puntaje 20, nivel Alto.
3. Se guarda como alerta pendiente y, por tener puntaje 15 o más, queda marcada como prioritaria.
4. Un analista la abre en Noticias analizadas, revisa la fuente y la valida.
5. El recomendador aplica la regla clima\_incendio: revisar el plan de contingencia forestal y de agua, con el área Forestal como responsable, y muestra sus suposiciones.
6. La gerencia ve en el panel el factor ecológico en Alto y la recomendación pendiente; la acepta, y su estado queda registrado.

### Ejemplo 2: variación de la TRM y simulación de costos (factor económico)

1. El flujo 1 consulta la TRM y detecta una variación mayor al umbral en cinco días hábiles.
2. Crea una alerta económica pendiente; el analista la valida.
3. El recomendador sugiere abrir el simulador y consultar a finanzas.
4. El usuario de compras entra al simulador con una compra de USD 100.000, TRM base de $3.197,65 (la del 15 de octubre) y un escenario de +5 %.
5. Resultado: costo base de $319.765.000, costo del escenario de $335.753.250 y diferencia de +$15.988.250, bajo el supuesto de que el precio en dólares, el volumen y los demás costos no cambian.
6. Compras lleva el resultado a la conversación con finanzas sobre negociación o cobertura.

### Ejemplo 3: una norma nueva sobre empaques (factor legal)

1. El flujo 2 detecta una publicación del Ministerio de Ambiente sobre gestión de residuos de empaques (norma hipotética).
2. La IA la clasifica como legal, área jurídica y ambiental, y propone probabilidad e impacto; queda pendiente de validación.
3. El analista la valida.
4. La regla norma\_ambiental\_empaques remite el caso al área jurídica y ambiental para verificar vigencia, ámbito y transitorios.
5. La aplicación no determina si la norma aplica a la empresa; solo la deja registrada con su fuente y su responsable.

### Variante con error

Si la fuente del IDEAM no responde, n8n reintenta y, si sigue fallando, registra el error. El Centro de actualizaciones muestra la fuente en error, y el panel sigue mostrando el último dato válido con su fecha.

## 8. Alcance y guía de desarrollo

El alcance es un prototipo que se ejecuta en un equipo local y se desarrolla en dos días con apoyo de IA. Esta sección fija qué entra, el orden de construcción y qué queda fuera.

### MVP

| Incluye | Detalle |
| --- | --- |
| Seis módulos | Panel, noticias, análisis PESTEL, recomendador, simulador y centro de actualizaciones |
| Flujo 1 | TRM diaria desde datos abiertos, con alerta por variación |
| Flujo 2 | Cinco búsquedas RSS, clasificación con Gemini y alertas pendientes |
| Base de datos | Tablas en Supabase con `empresa_id`, claves foráneas, perfiles y políticas RLS |
| Membresías | Tres cuentas de prueba para Smurfit (Consultor, Analista, Gerente) y una cuenta Gerente para AMUCC, aprovisionadas en Supabase Auth |
| Recomendador | Seis reglas más la opción «sin regla» |

### Guía de desarrollo en dos días

Para cada paso, entrega a la IA este documento como contexto y pídele una pieza a la vez: el script SQL, un flujo de n8n o un módulo de la interfaz.

**Día 1: base de datos y pantallas de lectura**

1. Crear el proyecto en Supabase y las seis tablas del modelo de datos (sección 6), con índice único en alertas.enlace y en valores\_indicador por indicador y fecha.
2. Cargar los datos semilla: reglas y fuentes (sección 3), indicadores, la TRM de las últimas semanas, el IPC (6,29 %, septiembre de 2026, DANE), la tasa del Banco de la República (12,25 %) y los hallazgos del documento PESTEL como alertas con origen base y estado validada.
3. Crear la aplicación con React, Vite y Tailwind, y conectarla a Supabase con la URL y la clave pública en un archivo .env.
4. Construir el panel ejecutivo, Noticias analizadas y Análisis PESTEL leyendo los datos semilla.
5. Crear el flujo 1 en n8n, ejecutarlo a mano y comprobar que la TRM nueva aparece en el panel.

**Día 2: automatización, reglas y cierre**

1. Crear el flujo 2 en n8n con las cinco búsquedas RSS y el prompt de la sección 4; probar primero con una sola noticia.
2. Construir el recomendador (une cada alerta con su regla por tipo\_evento), el simulador y el centro de actualizaciones.
3. Habilitar en Noticias analizadas las acciones de validar, descartar, reclasificar y ajustar probabilidad e impacto.
4. Probar de punta a punta los tres ejemplos de la sección 7 y corregir errores.
5. Preparar la presentación del recorrido: n8n ejecuta, la alerta aparece, un analista la valida, el recomendador sugiere y el simulador cuantifica.

Plan de recorte: si falta tiempo, dejar el flujo 2 con una sola búsqueda y el simulador sin enlace desde las recomendaciones.

### Fuera del MVP

- Más fuentes y automatizar el IPC y la tasa del Banco de la República.
- Avisos por correo o mensajería.
- Inicio de sesión, roles y permisos.
- Despliegue en la nube y versión para móvil.
- Datos internos de la empresa (compras, inventarios, ERP).
- Predicciones, chatbot, guardar escenarios del simulador y un botón para ejecutar los flujos desde la aplicación.

### Restricciones

- Dos días de desarrollo.
- Solo Colombia y una empresa de caso.
- La aplicación corre en local; n8n cloud y Supabase están en la nube.
- n8n cloud y la capa gratuita de Gemini tienen límites de ejecuciones y de uso: hay que revisarlos antes de empezar y evitar ejecuciones innecesarias.
- La IA clasifica y resume, pero no decide; las recomendaciones son orientativas.
- La aplicación no determina la aplicabilidad jurídica de una norma.
- Sin datos internos de la empresa; los montos del simulador los ingresa el usuario.
