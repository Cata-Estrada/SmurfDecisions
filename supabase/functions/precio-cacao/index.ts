// ==============================================================================
// Edge Function: precio-cacao
// Devuelve la cotización del futuro de cacao ICE (Yahoo Finance, CC=F) con su
// historial diario de 5 años y, si se pide, la TRM oficial vigente
// (Superintendencia Financiera, datos.gov.co).
//
// Respuesta:
// {
//   quote:  { price, timestamp, changePercent, currency, source },
//   points: [{ timestamp, price }],        // cierres diarios, timestamp en ms
//   trm:    { value, validFrom, validTo, source } | { error }   // solo si includeTrm
// }
//
// Despliegue:  supabase functions deploy precio-cacao
// Requiere sesión (JWT de Supabase), que la plataforma valida por defecto.
// ==============================================================================

const YAHOO_URL =
  'https://query1.finance.yahoo.com/v8/finance/chart/CC=F?range=5y&interval=1d';
const TRM_URL = 'https://www.datos.gov.co/resource/32sa-8pi3.json';

const CACHE_COTIZACION_MS = 5 * 60 * 1000;
const CACHE_TRM_MS = 60 * 60 * 1000;
const TIEMPO_MAXIMO_MS = 10_000;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

type Punto = { timestamp: number; price: number };
type Cotizacion = {
  quote: {
    price: number;
    timestamp: number;
    changePercent: number | null;
    currency: string;
    source: string;
  };
  points: Punto[];
};
type Trm = { value: number; validFrom: string; validTo: string; source: string };

let cacheCotizacion: { datos: Cotizacion; hasta: number } | null = null;
let cacheTrm: { datos: Trm; hasta: number } | null = null;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function obtenerJson(url: string) {
  const respuesta = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
    signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS)
  });
  if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status} en ${new URL(url).host}`);
  return respuesta.json();
}

async function consultarCotizacion(): Promise<Cotizacion> {
  if (cacheCotizacion && cacheCotizacion.hasta > Date.now()) return cacheCotizacion.datos;

  const datos = await obtenerJson(YAHOO_URL);
  const resultado = datos?.chart?.result?.[0];
  const meta = resultado?.meta;
  const tiempos: number[] = resultado?.timestamp ?? [];
  const cierres: (number | null)[] = resultado?.indicators?.quote?.[0]?.close ?? [];

  const points: Punto[] = tiempos
    .map((t, i) => ({ timestamp: t * 1000, price: cierres[i] }))
    .filter((p): p is Punto => Number.isFinite(p.price) && (p.price as number) > 0);

  if (points.length === 0) throw new Error('Yahoo no devolvió precios del cacao.');

  const ultimo = points[points.length - 1];
  const price = Number.isFinite(meta?.regularMarketPrice) ? meta.regularMarketPrice : ultimo.price;
  const timestamp = Number.isFinite(meta?.regularMarketTime)
    ? meta.regularMarketTime * 1000
    : ultimo.timestamp;

  // Cierre anterior: el último punto de un día previo al de la cotización.
  const inicioDia = new Date(timestamp);
  inicioDia.setUTCHours(0, 0, 0, 0);
  const anterior = [...points].reverse().find((p) => p.timestamp < inicioDia.getTime());
  const changePercent = anterior ? (price - anterior.price) / anterior.price * 100 : null;

  const cotizacion: Cotizacion = {
    quote: {
      price,
      timestamp,
      changePercent,
      currency: meta?.currency ?? 'USD',
      source: 'Yahoo Finance · CC=F'
    },
    points
  };
  cacheCotizacion = { datos: cotizacion, hasta: Date.now() + CACHE_COTIZACION_MS };
  return cotizacion;
}

function fechaBogota() {
  // Fecha local de Colombia (UTC-5, sin horario de verano).
  return new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

async function consultarTrm(): Promise<Trm> {
  if (cacheTrm && cacheTrm.hasta > Date.now()) return cacheTrm.datos;

  const hoy = fechaBogota();
  const parametros = new URLSearchParams({
    $where: `vigenciadesde <= '${hoy}T00:00:00.000'`,
    $order: 'vigenciadesde DESC',
    $limit: '1'
  });
  const filas = await obtenerJson(`${TRM_URL}?${parametros}`);
  const fila = filas?.[0];
  const value = Number(fila?.valor);
  if (!Number.isFinite(value) || value <= 0) throw new Error('La TRM oficial no tiene un valor válido.');

  const trm: Trm = {
    value,
    validFrom: fila.vigenciadesde,
    validTo: fila.vigenciahasta ?? fila.vigenciadesde,
    source: 'Superintendencia Financiera · Datos Abiertos'
  };
  cacheTrm = { datos: trm, hasta: Date.now() + CACHE_TRM_MS };
  return trm;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  let includeTrm = true;
  try {
    const body = await req.json();
    if (body?.includeTrm === false) includeTrm = false;
  } catch {
    // Sin cuerpo: se usa el valor por defecto.
  }

  try {
    const [cotizacion, trm] = await Promise.all([
      consultarCotizacion(),
      includeTrm
        ? consultarTrm().catch((error) => ({ error: `TRM no disponible: ${error.message}` }))
        : Promise.resolve(undefined)
    ]);
    return json(trm === undefined ? cotizacion : { ...cotizacion, trm });
  } catch (error) {
    console.error('[precio-cacao]', error);
    return json({ error: `No se pudo consultar el precio del cacao: ${(error as Error).message}` }, 502);
  }
});
