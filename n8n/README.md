# Automatizaciones n8n para SmurfDecisions (Smurfit Westrock Colombia)

Este directorio contiene los flujos de automatización listos para importar en **n8n Cloud**, diseñados para alimentar la base de datos de Supabase de forma periódica.

---

## 1. Flujo 1: Indicadores Macroeconómicos Diarios (TRM)
- **Archivo:** `flujo_1_indicadores_trm.json`
- **Frecuencia:** Diaria (7:00 AM COT).
- **Fuente:** Portal de Datos Abiertos de Colombia / Superintendencia Financiera de Colombia (`https://www.datos.gov.co/resource/32sa-8pi3.json`).
- **Regla de Negocio:**
  - Extrae el último valor de TRM.
  - Verifica si ya existe en la tabla `valores_indicador`. Si no existe, lo inserta.
  - Compara con el valor de hace 5 días hábiles. Si la variación porcentual absoluta supera el **3%**, inserta automáticamente una alerta económica en la tabla `alertas`:
    - `factor`: `Económico`
    - `area`: `Compras y finanzas`
    - `tipo_evento`: `tasa_cambio`
    - `probabilidad`: `5`, `impacto`: `3`, `puntaje`: `15`, `nivel`: `Alto`, `prioritaria`: `true`.
  - Registra el resultado en la tabla `ejecuciones`.

---

## 2. Flujo 2: Noticias y Novedades Normativas
- **Archivo:** `flujo_2_noticias_gemini.json`
- **Frecuencia:** Cada 6 horas.
- **Fuentes (5 feeds RSS de Google Noticias Colombia):**
  1. *Paros y bloqueos viales:* (`paro bloqueo vias colombia`)
  2. *El Niño e incendios:* (`el nino incendios forestales ideam ungrd colombia`)
  3. *Energía y racionamiento:* (`energia racionamiento tarifas electricas colombia`)
  4. *Normas de empaques y residuos:* (`norma empaques residuos reciclaje minambiente colombia`)
  5. *Reforma tributaria y laboral:* (`reforma tributaria laboral jornada colombia`)
- **Procesamiento con IA:**
  - Envía el titular y resumen a **Google Gemini Flash** con el prompt de contexto de Smurfit Westrock (Planta Yumbo).
  - Si Gemini califica la noticia como relevante para los próximos 12 meses, clasifica el factor PESTEL, el área y el tipo de evento.
  - Calcula `puntaje = probabilidad × impacto` y marca como `prioritaria` si el puntaje es $\ge 15$.
  - Inserta en la tabla `alertas` con `estado = 'pendiente'` y `origen = 'n8n'`.
  - Registra la ejecución en la tabla `ejecuciones`.

---

## 3. Instrucciones de Importación en n8n Cloud

1. Inicia sesión en tu instancia de [n8n Cloud](https://n8n.io/).
2. Haz clic en **Add workflow** y luego en los tres puntos superiores `...` &rarr; **Import from File**.
3. Selecciona `flujo_1_indicadores_trm.json` o `flujo_2_noticias_gemini.json`.
4. Configura las credenciales requeridas:
   - **Supabase Account:** Ingresa tu URL de proyecto (`https://xxxx.supabase.co`) y tu `service_role secret key` (necesaria para escrituras programadas de n8n).
   - **Google Gemini API:** Ingresa tu `API Key` de Google AI Studio en el nodo de Gemini (Flujo 2).
5. Activa el flujo con el interruptor **Active**.
