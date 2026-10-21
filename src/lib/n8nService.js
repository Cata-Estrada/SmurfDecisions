import { getEjecucionesPosteriores } from './dataService';

const FLUJOS_ESPERADOS = ['indicadores', 'noticias', 'recomendaciones'];
const INTERVALO_CONSULTA_MS = 2500;
const TIEMPO_MAXIMO_ESPERA_MS = 5 * 60 * 1000;

const esperar = (milisegundos) =>
  new Promise((resolve) => setTimeout(resolve, milisegundos));

export async function ejecutarFlujosN8n() {
  const response = await fetch('/api/n8n/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

export async function esperarEjecucionN8n({ idMinimo, onActualizacion }) {
  const limite = Date.now() + TIEMPO_MAXIMO_ESPERA_MS;
  let porFlujo = new Map();
  let ejecucionesObservadas = [];

  while (Date.now() < limite) {
    const ejecuciones = await getEjecucionesPosteriores({ idMinimo });
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
