import { getEjecucionesPosteriores } from './dataService';
import { supabase } from './supabase';

const FLUJOS_ESPERADOS = ['indicadores', 'noticias', 'recomendaciones'];
const FLUJO_SOLICITADO = 'noticias';
const INTERVALO_CONSULTA_MS = 2500;
const TIEMPO_MAXIMO_ESPERA_MS = 5 * 60 * 1000;

const esperar = (milisegundos) =>
  new Promise((resolve) => setTimeout(resolve, milisegundos));

export async function ejecutarFlujosN8n() {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(`No se pudo validar la sesión: ${error.message}`);
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error('Inicia sesión para ejecutar los flujos.');

  const { data: result, error: invokeError } = await supabase.functions.invoke('ejecutar-flujo', {
    body: { flujo: FLUJO_SOLICITADO },
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (invokeError) {
    const context = invokeError.context;
    let responseBody = null;
    let responseMessage = '';
    let responseStatus = '';
    if (context instanceof Response) {
      responseStatus = ` (HTTP ${context.status})`;
      const responseText = await context.text().catch(() => '');
      try {
        responseBody = JSON.parse(responseText);
      } catch {
        responseMessage = responseText.trim().slice(0, 500);
      }
      responseMessage = responseMessage || [
        responseBody?.message,
        responseBody?.error_description,
        responseBody?.error,
        responseBody?.details
      ].find((value) => typeof value === 'string' && value.trim()) || '';
    }
    const contextMessage = context instanceof Error ? context.message : '';
    const message = responseMessage
      ? `${responseMessage}${responseStatus}`
      : contextMessage
      ? `No se pudo conectar con la Edge Function: ${contextMessage}. Verifica que ejecutar-flujo esté desplegada y que su URL y CORS estén configurados correctamente.`
      : `${invokeError.message || 'No se pudieron iniciar los flujos de n8n.'}${responseStatus}`;
    const requestError = new Error(message);
    requestError.results = responseBody?.results || [];
    throw requestError;
  }

  return result;
}

export async function esperarEjecucionN8n({ idMinimo, empresaId, onActualizacion }) {
  const limite = Date.now() + TIEMPO_MAXIMO_ESPERA_MS;
  let porFlujo = new Map();
  let ejecucionesObservadas = [];

  while (Date.now() < limite) {
    const ejecuciones = await getEjecucionesPosteriores({ idMinimo, empresaId });
    ejecucionesObservadas = ejecuciones;
    porFlujo = new Map();

    for (const ejecucion of ejecuciones) {
      porFlujo.set(ejecucion.flujo, ejecucion);
    }

    const resultados = FLUJOS_ESPERADOS.map((flujo) => porFlujo.get(flujo) || null);
    onActualizacion?.(resultados);

    if (resultados.every(Boolean)) {
      return { ejecuciones: resultados, timedOut: false };
    }

    await esperar(INTERVALO_CONSULTA_MS);
  }

  return {
    ejecuciones: FLUJOS_ESPERADOS.map((flujo) => porFlujo.get(flujo) || null),
    ejecucionesObservadas,
    timedOut: true
  };
}
