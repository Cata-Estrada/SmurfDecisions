import { getEjecucionesPosteriores } from './dataService';
import { supabase } from './supabase';

const FLUJOS_ESPERADOS = ['indicadores', 'noticias', 'recomendaciones'];
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

  const response = await fetch('/api/n8n/run', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: '{}'
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(result.message || 'No se pudieron iniciar los flujos de n8n.');
    error.results = result.results || [];
    throw error;
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
