"""
Genera los flujos de n8n (JSON importables) de SmurfDecisions · Coagropacífico.

    python n8n/generar_flujos.py

Escribe en n8n/:
  - flujo_noticias_cacao.json   RSS de Google Noticias + Gemini → alertas
  - flujo_precio_diario.json    Cierre de bolsa (Yahoo CC=F) y TRM → valores_indicador
  - flujo_errores.json          Registra en ejecuciones cualquier fallo de los anteriores

Las credenciales no van en los archivos: después de importar, cada nodo de
Supabase, Gemini y Webhook se conecta a la credencial creada en n8n.
"""
import json
import uuid
from pathlib import Path

CARPETA = Path(__file__).resolve().parent
NAMESPACE = uuid.UUID('6f1c2a52-6d1e-4b8a-9f6a-2c3d4e5f6a7b')


def uid(nombre):
    """IDs estables para que regenerar no cambie los archivos sin necesidad."""
    return str(uuid.uuid5(NAMESPACE, nombre))


def nodo(nombre, tipo, version, posicion, parametros, **extra):
    n = {
        'parameters': parametros,
        'id': uid(nombre),
        'name': nombre,
        'type': tipo,
        'typeVersion': version,
        'position': posicion,
    }
    n.update(extra)
    return n


def supabase_get(nombre, pos, tabla, condiciones, **extra):
    return nodo(nombre, 'n8n-nodes-base.supabase', 1, pos, {
        'operation': 'getAll',
        'tableId': tabla,
        'returnAll': True,
        'matchType': 'allFilters',
        'filters': {'conditions': [
            {'keyName': k, 'condition': 'eq', 'keyValue': v} for k, v in condiciones
        ]},
    }, **extra)


def supabase_crear(nombre, pos, tabla, campos, **extra):
    return nodo(nombre, 'n8n-nodes-base.supabase', 1, pos, {
        'tableId': tabla,
        'fieldsUi': {'fieldValues': [{'fieldId': k, 'fieldValue': v} for k, v in campos]},
    }, **extra)


def si(nombre, pos, expresion):
    return nodo(nombre, 'n8n-nodes-base.if', 2.3, pos, {
        'conditions': {
            'options': {'caseSensitive': True, 'leftValue': '', 'typeValidation': 'strict', 'version': 3},
            'conditions': [{
                'id': uid(nombre + '-cond'),
                'leftValue': expresion,
                'rightValue': '',
                'operator': {'type': 'boolean', 'operation': 'true', 'singleValue': True},
            }],
            'combinator': 'and',
        },
        'options': {},
    })


def codigo(nombre, pos, js, por_item=False, **extra):
    p = {'jsCode': js.strip() + '\n'}
    if por_item:
        p['mode'] = 'runOnceForEachItem'
    return nodo(nombre, 'n8n-nodes-base.code', 2, pos, p, **extra)


def webhook(nombre, pos, ruta):
    return nodo(nombre, 'n8n-nodes-base.webhook', 2, pos, {
        'httpMethod': 'POST',
        'path': ruta,
        'authentication': 'headerAuth',
        'responseMode': 'onReceived',
        'options': {},
    }, webhookId=uid(nombre + ruta))


def conectar(*pares):
    """pares: (origen, destino) o (origen, destino, salida)."""
    conexiones = {}
    for par in pares:
        origen, destino = par[0], par[1]
        salida = par[2] if len(par) > 2 else 0
        salidas = conexiones.setdefault(origen, {'main': []})['main']
        while len(salidas) <= salida:
            salidas.append([])
        salidas[salida].append({'node': destino, 'type': 'main', 'index': 0})
    return conexiones


def flujo(nombre, nodos, conexiones):
    return {
        'name': nombre,
        'nodes': nodos,
        'connections': conexiones,
        'active': False,
        'settings': {'executionOrder': 'v1', 'timezone': 'America/Bogota', 'saveManualExecutions': True},
        'pinData': {},
        'meta': {'templateCredsSetupCompleted': False},
        'tags': [],
    }


EMPRESA_ACTIVA = [('activo', 'true')]

# ──────────────────────────────────────────────────────────────────────────────
# 1. Noticias del cacao
# ──────────────────────────────────────────────────────────────────────────────
JS_BUSQUEDAS = r"""
// Una URL de Google Noticias por cada búsqueda activa (últimos 7 días).
// Las búsquedas en inglés se consultan en la edición en inglés.
const inicio = new Date().toISOString();
return $('Consultas').all()
  .map(i => i.json)
  .filter(c => c.query)
  .map(c => {
    const ingles = /\b(cocoa|harvest|grindings|futures|arrivals)\b/i.test(c.query);
    const edicion = ingles ? 'hl=en-US&gl=US&ceid=US:en' : 'hl=es-419&gl=CO&ceid=CO:es-419';
    return { json: {
      inicio,
      tema: c.tema,
      url: 'https://news.google.com/rss/search?q=' + encodeURIComponent(c.query + ' when:7d') + '&' + edicion
    }};
  });
"""

JS_LIMPIAR = r"""
// Quita duplicados (contra la base y entre sí) y deja máximo 12 noticias, las más recientes.
// Si no queda ninguna, devuelve un solo ítem vacío para que igual se registre la ejecución.
const existentes = $('Alertas existentes').all().map(i => i.json).filter(e => e && e.id);
const enlaces = new Set(existentes.map(e => e.enlace).filter(Boolean));
const norm = t => (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const titulos = new Set(existentes.map(e => norm(e.titulo)));
const salida = [];
for (const it of $input.all()) {
  const j = it.json || {};
  const enlace = (j.link || '').trim();
  let titulo = (j.title || '').trim();
  let fuente = '';
  const m = titulo.match(/^(.*) - ([^-]+)$/);           // Google Noticias: "Título - Medio"
  if (m) { titulo = m[1].trim(); fuente = m[2].trim(); }
  const resumen = (j.contentSnippet || j.content || '').replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 600);
  const fecha = new Date(j.isoDate || j.pubDate);
  if (!enlace || !titulo || !fuente || isNaN(fecha)) continue;   // sin fuente verificable no hay alerta
  const nt = norm(titulo);
  if (enlaces.has(enlace) || titulos.has(nt)) continue;
  enlaces.add(enlace); titulos.add(nt);
  salida.push({ json: { titulo, resumen, enlace, fuente, fecha_publicacion: fecha.toISOString() } });
}
salida.sort((a, b) => new Date(b.json.fecha_publicacion) - new Date(a.json.fecha_publicacion));
const elegidas = salida.slice(0, 12);
return elegidas.length ? elegidas : [{ json: { sin_noticias: true } }];
"""

PROMPT = r"""=Eres analista del mercado de cacao para {{ $('Empresa activa').first().json.nombre }}, cooperativa de Tumaco (Nariño, Colombia) que compra cacao a pequeños productores. Colombia es tomadora de precio: la referencia es la bolsa de Nueva York, y la oferta africana (Costa de Marfil y Ghana) la mueve.

Evalúa la noticia y responde SOLO con JSON válido, sin texto adicional:
{"relevante": true o false,
 "driver": "precio_internacional|oferta_africana|clima|demanda|regulacion_mercado|entorno_local",
 "tipo_evento": "{{ $('Reglas').all().map(i => i.json.tipo_evento).filter(Boolean).join('|') }}",
 "efecto_precio": "sube|baja|neutral",
 "area": "{{ $('Áreas').all().map(i => i.json.nombre).filter(Boolean).join('|') }}",
 "probabilidad": 1 a 5,
 "impacto": 1 a 5,
 "resumen_es": "una frase en español con el hecho principal",
 "explicacion": "máximo 2 frases: por qué importa para la compra de cacao de la cooperativa"}

Guía de drivers:
- precio_internacional: bolsa de Nueva York o Londres, futuros, precios récord.
- oferta_africana: cosechas, llegadas a puerto, precio oficial de Costa de Marfil o Ghana.
- clima: lluvias, sequía, El Niño o La Niña en África o en el Pacífico colombiano.
- demanda: molienda, inventarios, consumo de chocolate.
- regulacion_mercado: EUDR, límites de cadmio, aranceles, certificaciones.
- entorno_local: TRM, orden público, paros o vías en Tumaco y Nariño, costos locales.

efecto_precio es el efecto esperado sobre el precio internacional del cacao (sube, baja o neutral).
relevante es true solo si la noticia puede afectar el precio del cacao, la oferta, la demanda o la operación de compra de la cooperativa en los próximos 12 meses.
probabilidad: qué tan probable es que el hecho afecte a la cooperativa. impacto: qué tan grave sería.
No inventes datos que no estén en la noticia.

NOTICIA
Título: {{ $json.titulo }}
Resumen: {{ $json.resumen }}
Fuente: {{ $json.fuente }}
Fecha: {{ $json.fecha_publicacion }}"""

JS_VALIDAR = r"""
// Valida la respuesta de Gemini y calcula puntaje = probabilidad × impacto.
const DRIVERS = ['precio_internacional', 'oferta_africana', 'clima', 'demanda', 'regulacion_mercado', 'entorno_local'];
const EFECTOS = ['sube', 'baja', 'neutral'];
const AREAS = $('Áreas').all().map(i => i.json.nombre).filter(Boolean);
const reglas = $('Reglas').all().map(i => i.json).filter(r => r.tipo_evento);
const TIPOS = reglas.map(r => r.tipo_evento);
const EMPRESA_ID = $('Empresa activa').first().json.id;

const base = {
  ...$('Limpiar y quitar duplicados').item.json,
  empresa_id: EMPRESA_ID,
  origen: 'n8n',
  decision: 'pendiente'
};
const j = $input.item.json;

// 1) Límite de uso o caída de Gemini: no se guarda; se reintenta en la próxima ejecución.
const textoError = JSON.stringify(j.error || '').toLowerCase();
if (j.error && /too many|429|quota|rate|resource_exhausted|overloaded|unavailable|503|500|timeout/.test(textoError)) {
  return { json: { ...base, relevante: false, motivo: 'limite_gemini' } };
}

// 2) Extraer el JSON aunque venga con texto alrededor.
let txt = j.content?.parts?.[0]?.text ?? j.output ?? j.text ?? '';
txt = String(txt).replace(/```json|```/g, '').trim();
const m = txt.match(/\{[\s\S]*\}/);
let r = null;
try { r = JSON.parse(m ? m[0] : txt); } catch (e) {}

// 3) No relevante: se descarta.
if (r && (r.relevante === false || r.relevante === 'false')) {
  return { json: { ...base, relevante: false, motivo: 'no_relevante' } };
}

// 4) Respuesta incompleta: se guarda sin clasificar para que el analista la revise.
const escala = v => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= 1 && n <= 5 ? n : null; };
const p = r ? escala(r.probabilidad) : null;
const i = r ? escala(r.impacto) : null;
const driver = r && DRIVERS.includes(r.driver) ? r.driver : null;
if (!r || j.error || p === null || i === null || driver === null) {
  return { json: { ...base, relevante: true, estado: 'sin_clasificar',
    factor: driver, efecto_precio: r && EFECTOS.includes(r.efecto_precio) ? r.efecto_precio : null,
    explicacion: 'Gemini no devolvió una clasificación completa; revisar manualmente.' } };
}

const tipo = TIPOS.includes(r.tipo_evento) ? r.tipo_evento : 'otro';
const regla = reglas.find(x => x.tipo_evento === tipo);
const area = AREAS.includes(r.area) ? r.area : (regla?.area_responsable || AREAS[0] || null);
const puntaje = p * i;

return { json: {
  ...base,
  relevante: true,
  estado: 'pendiente',
  factor: driver,
  tipo_evento: tipo,
  area,
  efecto_precio: EFECTOS.includes(r.efecto_precio) ? r.efecto_precio : 'neutral',
  probabilidad: p,
  impacto: i,
  puntaje,
  nivel: puntaje >= 15 ? 'Alto' : puntaje >= 8 ? 'Medio' : 'Bajo',
  prioritaria: puntaje >= 15,
  resumen: (r.resumen_es || base.resumen || '').slice(0, 600),
  explicacion: (r.explicacion || '').slice(0, 600)
}};
"""

noticias_nodos = [
    nodo('Cada 6 horas', 'n8n-nodes-base.scheduleTrigger', 1.2, [0, 0],
         {'rule': {'interval': [{'field': 'hours', 'hoursInterval': 6}]}}),
    webhook('Botón de la app', [0, 200], 'cacao-noticias'),
    supabase_get('Empresa activa', [240, 100], 'empresas', EMPRESA_ACTIVA, executeOnce=True),
    supabase_get('Consultas', [460, 100], 'consultas',
                 [('empresa_id', "={{ $('Empresa activa').first().json.id }}"), ('activa', 'true')],
                 executeOnce=True),
    supabase_get('Áreas', [680, 100], 'areas',
                 [('empresa_id', "={{ $('Empresa activa').first().json.id }}")],
                 executeOnce=True, alwaysOutputData=True),
    supabase_get('Reglas', [900, 100], 'reglas',
                 [('empresa_id', "={{ $('Empresa activa').first().json.id }}")],
                 executeOnce=True, alwaysOutputData=True),
    supabase_get('Alertas existentes', [1120, 100], 'alertas',
                 [('empresa_id', "={{ $('Empresa activa').first().json.id }}")],
                 executeOnce=True, alwaysOutputData=True),
    codigo('Armar búsquedas', [1340, 100], JS_BUSQUEDAS),
    nodo('Leer RSS', 'n8n-nodes-base.rssFeedRead', 1.2, [1560, 100],
         {'url': '={{ $json.url }}', 'options': {}},
         onError='continueRegularOutput', retryOnFail=True),
    codigo('Limpiar y quitar duplicados', [1780, 100], JS_LIMPIAR),
    si('¿Hay noticias nuevas?', [2000, 100], '={{ !!$json.enlace }}'),
    nodo('Una por una', 'n8n-nodes-base.splitInBatches', 3, [2220, 0], {'options': {}}),
    nodo('Clasificar con Gemini', '@n8n/n8n-nodes-langchain.googleGemini', 1.2, [2460, 80], {
        'modelId': {'__rl': True, 'value': 'models/gemini-flash-lite-latest', 'mode': 'list',
                    'cachedResultName': 'Gemini Flash-Lite Latest'},
        'messages': {'values': [{'content': PROMPT}]},
        'builtInTools': {},
        'options': {},
    }, onError='continueRegularOutput', retryOnFail=True, waitBetweenTries=5000),
    codigo('Validar y puntuar', [2680, 80], JS_VALIDAR, por_item=True),
    si('¿Es relevante?', [2900, 80], '={{ $json.relevante }}'),
    supabase_crear('Guardar alerta', [3120, 0], 'alertas', [('prioritaria', '={{ $json.prioritaria ?? false }}')] + [
        (c, '={{ $json.%s ?? null }}' % c) for c in [
            'titulo', 'resumen', 'enlace', 'fuente', 'fecha_publicacion', 'factor', 'area',
            'tipo_evento', 'efecto_precio', 'probabilidad', 'impacto', 'puntaje', 'nivel',
            'estado', 'decision', 'origen', 'explicacion', 'empresa_id']
    ], onError='continueRegularOutput'),
    nodo('Pausa (límite de Gemini)', 'n8n-nodes-base.wait', 1.1, [3340, 80], {'amount': 5},
         webhookId=uid('pausa-noticias')),
    nodo('Armar registro', 'n8n-nodes-base.set', 3.4, [2460, -160], {
        'assignments': {'assignments': [
            {'id': uid('r1'), 'name': 'flujo', 'value': 'noticias', 'type': 'string'},
            {'id': uid('r2'), 'name': 'fuente', 'value': 'Google Noticias RSS + Gemini', 'type': 'string'},
            {'id': uid('r3'), 'name': 'inicio', 'value': "={{ $('Armar búsquedas').first().json.inicio }}", 'type': 'string'},
            {'id': uid('r4'), 'name': 'fin', 'value': '={{ $now.toISO() }}', 'type': 'string'},
            {'id': uid('r5'), 'name': 'estado', 'value': 'ok', 'type': 'string'},
            {'id': uid('r6'), 'name': 'registros_nuevos',
             # La salida "done" del ciclo trae todas las vueltas; las guardadas tienen id.
             'value': '={{ $input.all().filter(i => i.json.id).length }}',
             'type': 'number'},
            {'id': uid('r7'), 'name': 'empresa_id', 'value': "={{ $('Empresa activa').first().json.id }}", 'type': 'string'},
        ]},
        'options': {},
    }, executeOnce=True),
    supabase_crear('Registrar ejecución', [2680, -160], 'ejecuciones', [
        (c, '={{ $json.%s }}' % c) for c in
        ['flujo', 'fuente', 'inicio', 'fin', 'estado', 'registros_nuevos', 'empresa_id']
    ]),
]
noticias = flujo('Noticias del cacao', noticias_nodos, conectar(
    ('Cada 6 horas', 'Empresa activa'),
    ('Botón de la app', 'Empresa activa'),
    ('Empresa activa', 'Consultas'),
    ('Consultas', 'Áreas'),
    ('Áreas', 'Reglas'),
    ('Reglas', 'Alertas existentes'),
    ('Alertas existentes', 'Armar búsquedas'),
    ('Armar búsquedas', 'Leer RSS'),
    ('Leer RSS', 'Limpiar y quitar duplicados'),
    ('Limpiar y quitar duplicados', '¿Hay noticias nuevas?'),
    ('¿Hay noticias nuevas?', 'Una por una', 0),
    ('¿Hay noticias nuevas?', 'Armar registro', 1),
    ('Una por una', 'Armar registro', 0),
    ('Una por una', 'Clasificar con Gemini', 1),
    ('Clasificar con Gemini', 'Validar y puntuar'),
    ('Validar y puntuar', '¿Es relevante?'),
    ('¿Es relevante?', 'Guardar alerta', 0),
    ('¿Es relevante?', 'Pausa (límite de Gemini)', 1),
    ('Guardar alerta', 'Pausa (límite de Gemini)'),
    ('Pausa (límite de Gemini)', 'Una por una'),
    ('Armar registro', 'Registrar ejecución'),
))

# ──────────────────────────────────────────────────────────────────────────────
# 2. Precio diario (bolsa y TRM)
# ──────────────────────────────────────────────────────────────────────────────
JS_VALORES = r"""
// Toma el último cierre de Yahoo (CC=F) y la TRM vigente.
// Devuelve un solo ítem con { bolsa, trm }; cada uno se guarda en su propio nodo,
// así un fallo (o un dato ya registrado) en uno no impide guardar el otro.
const fechaBogota = ms => new Date(ms - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
let bolsa = null;
let trm = null;
let londres = null;
const errores = [];

try {
  const r = $('Bolsa Nueva York (Yahoo)').first().json.chart.result[0];
  const tiempos = r.timestamp || [];
  const cierres = r.indicators.quote[0].close || [];
  for (let k = tiempos.length - 1; k >= 0; k--) {
    if (Number(cierres[k]) > 0) {
      bolsa = { indicador_codigo: 'CACAO_NY', fecha: fechaBogota(tiempos[k] * 1000),
        valor: Number(cierres[k]), fuente: 'Yahoo Finance · CC=F' };
      break;
    }
  }
  if (!bolsa) errores.push('Yahoo no devolvió cierres');
} catch (e) { errores.push('Yahoo: ' + e.message); }

try {
  const t = $('TRM oficial').first().json;
  const valor = Number(t.valor);
  if (valor > 0) {
    trm = { indicador_codigo: 'TRM', fecha: String(t.vigenciadesde).slice(0, 10),
      valor, fuente: 'Superintendencia Financiera · datos.gov.co' };
  } else errores.push('TRM sin valor');
} catch (e) { errores.push('TRM: ' + e.message); }

try {
  // Tabla "Cocoa Daily Prices" de la ICCO: id | dd/mm/aaaa | Londres £/t | NY US$/t | ICCO US$/t | ICCO €/t
  const html = String($('Londres (ICCO)').first().json.data || '');
  const filas = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)]
    .map(m => [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(c => c[1].replace(/<[^>]+>/g, '').trim()))
    .filter(c => c.length >= 5 && /^\d{2}\/\d{2}\/\d{4}$/.test(c[1]))
    .map(c => { const [d, m, a] = c[1].split('/'); return { fecha: `${a}-${m}-${d}`, valor: Number(c[2].replace(/,/g, '')) }; })
    .filter(f => f.valor > 0)
    .sort((x, y) => x.fecha.localeCompare(y.fecha));
  const ultima = filas[filas.length - 1];
  if (ultima) londres = { indicador_codigo: 'CACAO_LON', fecha: ultima.fecha, valor: ultima.valor, fuente: 'ICCO · Londres' };
  else errores.push('ICCO sin tabla de precios');
} catch (e) { errores.push('ICCO: ' + e.message); }

return [{ json: { bolsa, trm, londres, sin_datos: !bolsa && !trm && !londres, errores: errores.join('; ') } }];
"""

JS_REGISTRO_PRECIOS = r"""
// Resume la ejecución. Un dato ya registrado ese día no es un error.
const valores = $('Armar valores').first().json;
const resultado = nodo => { try { return $(nodo).first().json; } catch (e) { return {}; } };
const guardados = [resultado('Guardar bolsa'), resultado('Guardar TRM'), resultado('Guardar Londres')];
const nuevos = guardados.filter(g => g && g.id).length;
const fallos = guardados
  .map((g, k) => g && g.error && !/duplicate key/i.test(String(g.error)) ? ['Bolsa', 'TRM', 'Londres'][k] + ': ' + g.error : null)
  .filter(Boolean);
const mensajes = [valores.errores, ...fallos].filter(Boolean);
return [{ json: {
  flujo: 'precios',
  fuente: 'Yahoo Finance (CC=F) + Superintendencia Financiera (TRM) + ICCO (Londres)',
  inicio: $('Marcar inicio').first().json.inicio,
  fin: new Date().toISOString(),
  estado: valores.sin_datos || fallos.length ? 'error' : 'ok',
  registros_nuevos: nuevos,
  mensaje_error: mensajes.join('; '),
  empresa_id: $('Empresa activa').first().json.id
} }];
"""

precios_nodos = [
    nodo('Lunes a viernes 6 p. m.', 'n8n-nodes-base.scheduleTrigger', 1.2, [0, 0],
         {'rule': {'interval': [{'field': 'cronExpression', 'expression': '0 18 * * 1-5'}]}}),
    webhook('Botón de la app', [0, 200], 'cacao-precios'),
    supabase_get('Empresa activa', [240, 100], 'empresas', EMPRESA_ACTIVA, executeOnce=True),
    nodo('Marcar inicio', 'n8n-nodes-base.set', 3.4, [460, 100], {
        'assignments': {'assignments': [
            {'id': uid('p1'), 'name': 'inicio', 'value': '={{ $now.toISO() }}', 'type': 'string'}]},
        'options': {},
    }, executeOnce=True),
    nodo('Bolsa Nueva York (Yahoo)', 'n8n-nodes-base.httpRequest', 4.2, [680, 100], {
        'url': 'https://query1.finance.yahoo.com/v8/finance/chart/CC=F',
        'sendQuery': True,
        'queryParameters': {'parameters': [{'name': 'range', 'value': '5d'}, {'name': 'interval', 'value': '1d'}]},
        'sendHeaders': True,
        'headerParameters': {'parameters': [{'name': 'User-Agent', 'value': 'Mozilla/5.0'}]},
        'options': {'timeout': 15000},
    }, onError='continueRegularOutput', retryOnFail=True),
    nodo('TRM oficial', 'n8n-nodes-base.httpRequest', 4.2, [900, 100], {
        'url': 'https://www.datos.gov.co/resource/32sa-8pi3.json',
        'sendQuery': True,
        'queryParameters': {'parameters': [
            {'name': '$where', 'value': "=vigenciadesde <= '{{ $now.setZone('America/Bogota').toFormat('yyyy-MM-dd') }}T00:00:00.000'"},
            {'name': '$order', 'value': 'vigenciadesde DESC'},
            {'name': '$limit', 'value': '1'}]},
        'options': {'timeout': 20000},
    }, onError='continueRegularOutput', retryOnFail=True, executeOnce=True),
    nodo('Londres (ICCO)', 'n8n-nodes-base.httpRequest', 4.2, [1010, 260], {
        'url': 'https://www.icco.org/',
        'sendHeaders': True,
        'headerParameters': {'parameters': [{'name': 'User-Agent', 'value': 'Mozilla/5.0'}]},
        'options': {'timeout': 20000, 'response': {'response': {'responseFormat': 'text'}}},
    }, onError='continueRegularOutput', retryOnFail=True, executeOnce=True),
    codigo('Armar valores', [1120, 100], JS_VALORES),
    supabase_crear('Guardar bolsa', [1340, 100], 'valores_indicador', [
        ('indicador_codigo', "={{ $('Armar valores').first().json.bolsa?.indicador_codigo ?? null }}"),
        ('fecha', "={{ $('Armar valores').first().json.bolsa?.fecha ?? null }}"),
        ('valor', "={{ $('Armar valores').first().json.bolsa?.valor ?? null }}"),
        ('fuente', "={{ $('Armar valores').first().json.bolsa?.fuente ?? null }}"),
    ], onError='continueRegularOutput', executeOnce=True),
    supabase_crear('Guardar TRM', [1560, 100], 'valores_indicador', [
        ('indicador_codigo', "={{ $('Armar valores').first().json.trm?.indicador_codigo ?? null }}"),
        ('fecha', "={{ $('Armar valores').first().json.trm?.fecha ?? null }}"),
        ('valor', "={{ $('Armar valores').first().json.trm?.valor ?? null }}"),
        ('fuente', "={{ $('Armar valores').first().json.trm?.fuente ?? null }}"),
    ], onError='continueRegularOutput', executeOnce=True),
    supabase_crear('Guardar Londres', [1670, 260], 'valores_indicador', [
        ('indicador_codigo', "={{ $('Armar valores').first().json.londres?.indicador_codigo ?? null }}"),
        ('fecha', "={{ $('Armar valores').first().json.londres?.fecha ?? null }}"),
        ('valor', "={{ $('Armar valores').first().json.londres?.valor ?? null }}"),
        ('fuente', "={{ $('Armar valores').first().json.londres?.fuente ?? null }}"),
    ], onError='continueRegularOutput', executeOnce=True),
    codigo('Armar registro', [1780, 100], JS_REGISTRO_PRECIOS, executeOnce=True),
    supabase_crear('Registrar ejecución', [2000, 100], 'ejecuciones', [
        (c, '={{ $json.%s }}' % c) for c in
        ['flujo', 'fuente', 'inicio', 'fin', 'estado', 'registros_nuevos', 'mensaje_error', 'empresa_id']
    ]),
]
precios = flujo('Precio diario del cacao y TRM', precios_nodos, conectar(
    ('Lunes a viernes 6 p. m.', 'Empresa activa'),
    ('Botón de la app', 'Empresa activa'),
    ('Empresa activa', 'Marcar inicio'),
    ('Marcar inicio', 'Bolsa Nueva York (Yahoo)'),
    ('Bolsa Nueva York (Yahoo)', 'TRM oficial'),
    ('TRM oficial', 'Londres (ICCO)'),
    ('Londres (ICCO)', 'Armar valores'),
    ('Armar valores', 'Guardar bolsa'),
    ('Guardar bolsa', 'Guardar TRM'),
    ('Guardar TRM', 'Guardar Londres'),
    ('Guardar Londres', 'Armar registro'),
    ('Armar registro', 'Registrar ejecución'),
))

# ──────────────────────────────────────────────────────────────────────────────
# 3. Manejo de errores
# ──────────────────────────────────────────────────────────────────────────────
errores_nodos = [
    nodo('Cuando un flujo falla', 'n8n-nodes-base.errorTrigger', 1, [0, 0], {}),
    supabase_get('Empresa activa', [240, 0], 'empresas', EMPRESA_ACTIVA, executeOnce=True),
    supabase_crear('Registrar error', [480, 0], 'ejecuciones', [
        ('flujo', "={{ $('Cuando un flujo falla').first().json.workflow.name.toLowerCase().includes('noticia') ? 'noticias' : 'precios' }}"),
        ('fuente', 'n8n'),
        ('inicio', '={{ $now.toISO() }}'),
        ('fin', '={{ $now.toISO() }}'),
        ('estado', 'error'),
        ('registros_nuevos', '0'),
        ('mensaje_error', "={{ (($('Cuando un flujo falla').first().json.execution.lastNodeExecuted || 'n8n') + ': ' + ($('Cuando un flujo falla').first().json.execution.error?.message || 'error desconocido')).slice(0, 500) }}"),
        ('empresa_id', "={{ $('Empresa activa').first().json.id }}"),
    ]),
]
errores = flujo('Manejo de errores', errores_nodos, conectar(
    ('Cuando un flujo falla', 'Empresa activa'),
    ('Empresa activa', 'Registrar error'),
))

for archivo, contenido in [
    ('flujo_noticias_cacao.json', noticias),
    ('flujo_precio_diario.json', precios),
    ('flujo_errores.json', errores),
]:
    (CARPETA / archivo).write_text(json.dumps(contenido, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('escrito', archivo, '·', len(contenido['nodes']), 'nodos')
