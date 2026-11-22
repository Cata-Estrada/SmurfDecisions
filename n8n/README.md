# n8n · Flujos de Coagropacífico

Tres flujos listos para importar:

| Archivo | Qué hace | Cuándo corre |
|---|---|---|
| `flujo_noticias_cacao.json` | Busca noticias del cacao en Google Noticias, las clasifica con Gemini (driver, tipo de evento, efecto en el precio, probabilidad e impacto) y las guarda en `alertas` | Cada 6 horas y con el botón de la app |
| `flujo_precio_diario.json` | Guarda el cierre de la bolsa de Nueva York (Yahoo, `CC=F`) y la TRM oficial en `valores_indicador` | Lunes a viernes, 6 p. m. (hora de Colombia), y con el botón de la app |
| `flujo_errores.json` | Si alguno de los dos falla, deja el error en `ejecuciones` para verlo en la app | Automático |

La app **no depende** de n8n para calcular: el precio y la TRM los consulta en vivo. n8n trae las noticias y deja historial propio de precios.

---

## Paso 1 · Crear la cuenta

1. Entra a [n8n.io](https://n8n.io) y crea una cuenta nueva (**Get started**).
2. Elige un nombre para tu espacio (por ejemplo `smurfdecisions`). Quedará en una dirección como `https://smurfdecisions.app.n8n.cloud`.

> La cuenta anterior se venció porque la nube de n8n es una prueba gratuita por tiempo limitado. Revisa la duración actual en la página de precios de n8n y crea la cuenta cerca de la fecha de presentación.

## Paso 2 · Crear las 3 credenciales

En n8n: **Overview → Credentials → Create credential**.

**a) Supabase**
- Tipo: `Supabase API`
- **Host**: la *Project URL* de Supabase (`https://TU_PROJECT_REF.supabase.co`)
- **Service Role Secret**: en Supabase → **Project Settings → API Keys** → clave `service_role` (o *secret*). Esta clave salta la seguridad por filas: solo va en n8n, **nunca** en el `.env` ni en el código.

**b) Google Gemini**
- Tipo: `Google Gemini(PaLM) Api`
- **API Key**: créala gratis en [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

**c) Clave del botón de la app**
- Tipo: `Header Auth`
- **Name**: `X-API-Key`
- **Value**: invéntate una clave larga (por ejemplo, 30 letras y números al azar) y guárdala; la usarás en el paso 6.

## Paso 3 · Importar los flujos

Para cada uno de los 3 archivos de esta carpeta:

1. **Overview → Create workflow** → menú `⋯` (arriba a la derecha) → **Import from File…**
2. Elige el archivo `.json`.
3. Los nodos que necesitan credencial aparecen con un aviso. Ábrelos uno por uno y elige la credencial:
   - Nodos de Supabase (`Empresa activa`, `Consultas`, `Guardar alerta`, `Guardar bolsa`, `Guardar TRM`, `Registrar ejecución`, etc.) → **Supabase**
   - `Clasificar con Gemini` → **Google Gemini**
   - `Botón de la app` → **Header Auth**
4. **Save**.

Empieza por `flujo_errores.json`, así ya existe cuando configures los otros dos.

## Paso 4 · Conectar el flujo de errores

En **Noticias del cacao** y en **Precio diario del cacao y TRM**: menú `⋯` → **Settings** → **Error workflow** → `Manejo de errores` → **Save**.

## Paso 5 · Probar y activar

> Cada flujo tiene dos disparadores. Si pulsas el botón grande **Execute workflow**, n8n puede elegir **Botón de la app** y quedarse en *"Waiting for you to call the Test URL"*. En ese caso pulsa **Stop** y ejecútalo desde el disparador de horario: pasa el mouse sobre él (**Lunes a viernes 6 p. m.** o **Cada 6 horas**) y pulsa su ▶.

1. Abre **Precio diario del cacao y TRM** y ejecútalo desde **Lunes a viernes 6 p. m.** En Supabase, la tabla `valores_indicador` debe tener una fila de `CACAO_NY` y otra de `TRM`, y `ejecuciones` una fila `precios` con estado `ok`.
2. Abre **Noticias del cacao** y ejecútalo desde **Cada 6 horas**. Tarda unos minutos, porque hace una pausa de 5 segundos entre noticias para no pasar el límite gratuito de Gemini. Al terminar, `alertas` tiene las noticias nuevas y `ejecuciones` una fila `noticias`.
3. Si todo salió bien, activa ambos con el interruptor **Active** (arriba). El de errores no necesita activarse.

## Paso 6 · Conectar el botón "Ejecutar flujos" de la app

1. En cada flujo activo, abre el nodo **Botón de la app** y copia la **Production URL** (no la *Test URL*).
2. Guarda los secretos en Supabase, desde la raíz del proyecto:

```bash
npx supabase secrets set N8N_WEBHOOK_NOTICIAS_URL=https://.../webhook/cacao-noticias N8N_WEBHOOK_PRECIOS_URL=https://.../webhook/cacao-precios N8N_WEBHOOK_KEY=la-clave-del-paso-2c
```

   También se pueden poner en Supabase → **Edge Functions → Secrets**.

3. Despliega la función:

```bash
npx supabase functions deploy ejecutar-flujo
```

4. En la app, con un usuario **Gerente**: **Actualizaciones → Ejecutar flujos n8n**. La app espera hasta que ambos flujos registren su ejecución y luego refresca el historial.

---

## Si algo falla

| Síntoma | Causa probable |
|---|---|
| La app dice "Falta el secreto …" | No se hizo el paso 6.2 o falta volver a desplegar `ejecutar-flujo`. |
| La app dice "n8n respondió HTTP 404" | El flujo no está activo o se copió la *Test URL*. |
| La app dice "HTTP 403" desde n8n | La clave de `N8N_WEBHOOK_KEY` no es igual al *Value* de la credencial Header Auth. |
| "ya se ejecutó hace menos de 10 minutos" | Protección para no gastar la cuota de Gemini. Espera y vuelve a intentar. |
| Noticias con estado `sin_clasificar` | Gemini no respondió completo. El analista las clasifica a mano en **Noticias del cacao**. |
| Pocas o ninguna noticia nueva | El flujo descarta duplicados y lo que Gemini marca como no relevante. Se ajustan las búsquedas en la tabla `consultas`. |
| `ejecuciones` con estado `error` | El mensaje dice qué nodo falló. Revisa la ejecución en n8n (**Executions**). |

## Cambiar los flujos

Los JSON se generan con `generar_flujos.py`. Si cambias el prompt, las búsquedas o los nodos, edita ese script y vuelve a correr:

```bash
python n8n/generar_flujos.py
```

Luego reimporta el flujo en n8n. Las búsquedas de noticias no requieren cambiar nada aquí: viven en la tabla `consultas` de Supabase.
