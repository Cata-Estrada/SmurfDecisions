// ==============================================================================
// PROYECTO: SmurfDecisions - Smurfit Westrock Colombia
// SERVICIO DE DATOS (Supabase con diagnóstico explícito y fallback reactivo)
// ==============================================================================
import { supabase, isSupabaseConfigured } from './supabase';
import {
  ALERTAS_INICIALES,
  INDICADORES_INICIALES,
  VALORES_INDICADOR_INICIALES,
  FUENTES_INICIALES,
  EJECUCIONES_INICIALES
} from './datosIniciales';
import { REGLAS_RECOMENDADOR } from './catalogos';
import { calcularPuntaje } from './puntaje';

const STORAGE_KEYS = {
  ALERTAS: 'smurfdecisions_alertas',
  VALORES: 'smurfdecisions_valores_indicador',
  EJECUCIONES: 'smurfdecisions_ejecuciones'
};

function getLocalAlertas() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ALERTAS) || localStorage.getItem('decision360_alertas');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error leyendo alertas locales:', e);
  }
  return ALERTAS_INICIALES;
}

function saveLocalAlertas(alertas) {
  try {
    localStorage.setItem(STORAGE_KEYS.ALERTAS, JSON.stringify(alertas));
  } catch (e) {
    console.error('Error guardando alertas locales:', e);
  }
}

/**
 * Diagnóstico del estado de la conexión a Supabase y conteo real de tablas
 */
export async function getConexionStatus() {
  if (!isSupabaseConfigured || !supabase) {
    return {
      isConfigured: false,
      conectado: false,
      origenDatos: 'local',
      mensaje: 'Variables de entorno no configuradas. Operando con datos locales.'
    };
  }

  try {
    const [resAlertas, resIndicadores, resValores, resReglas, resFuentes, resEjecuciones] = await Promise.all([
      supabase.from('alertas').select('*', { count: 'exact', head: true }),
      supabase.from('indicadores').select('*', { count: 'exact', head: true }),
      supabase.from('valores_indicador').select('*', { count: 'exact', head: true }),
      supabase.from('reglas').select('*', { count: 'exact', head: true }),
      supabase.from('fuentes').select('*', { count: 'exact', head: true }),
      supabase.from('ejecuciones').select('*', { count: 'exact', head: true })
    ]);

    const errorRLS = [
      resAlertas,
      resIndicadores,
      resValores,
      resReglas,
      resFuentes,
      resEjecuciones
    ].find((resultado) => resultado.error)?.error;
    const conteos = {
      alertas: resAlertas.count ?? 0,
      indicadores: resIndicadores.count ?? 0,
      valores_indicador: resValores.count ?? 0,
      reglas: resReglas.count ?? 0,
      fuentes: resFuentes.count ?? 0,
      ejecuciones: resEjecuciones.count ?? 0
    };

    const tieneFilas = conteos.alertas > 0;

    return {
      isConfigured: true,
      conectado: !errorRLS,
      errorRLS: errorRLS ? errorRLS.message : null,
      conteos,
      tieneFilas,
      origenDatos: tieneFilas ? 'supabase' : 'local_fallback',
      mensaje: errorRLS
        ? `Error de permisos o RLS en Supabase: ${errorRLS.message}`
        : tieneFilas
        ? `Conexión activa a Supabase (${conteos.alertas} alertas en la nube).`
        : 'Supabase respondió correctamente, pero la clave pública no ve filas en alertas. Revisa el contenido de esa tabla y sus políticas de lectura; no se cargaron datos de muestra.'
    };
  } catch (err) {
    return {
      isConfigured: true,
      conectado: false,
      errorRLS: err.message,
      origenDatos: 'local_fallback',
      mensaje: `Fallo al contactar el servidor de Supabase: ${err.message}`
    };
  }
}

/**
 * Obtiene todas las alertas ordenadas por fecha y puntaje.
 * Retorna explícitamente el origen de los datos ('supabase' o 'local').
 */
export async function getAlertas() {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('alertas')
        .select('*')
        .order('fecha_publicacion', { ascending: false })
        .order('puntaje', { ascending: false });

      if (!error && data && data.length > 0) {
        return { data, source: 'supabase', count: data.length, error: null };
      }
      if (error) {
        console.warn('Fallo consulta Supabase alertas:', error.message);
        return { data: getLocalAlertas(), source: 'local_fallback', error: error.message };
      }
      if (data && data.length === 0) {
        // Tablas vacías en Supabase
        return { data: getLocalAlertas(), source: 'local_fallback', error: 'Tabla alertas vacía en Supabase (0 filas)' };
      }
    } catch (err) {
      console.warn('Excepción al conectar con Supabase alertas:', err);
    }
  }

  return { data: getLocalAlertas(), source: 'local', error: null };
}

/**
 * Actualiza una alerta en Supabase y/o en almacenamiento local.
 * Recalcula automáticamente probabilidad × impacto, nivel y condición prioritaria.
 */
export async function actualizarAlerta(id, campos) {
  let alertaActualizada = { ...campos };

  // Recalcular puntaje si cambiaron probabilidad o impacto
  if (campos.probabilidad !== undefined || campos.impacto !== undefined) {
    const p = campos.probabilidad;
    const i = campos.impacto;
    const calculo = calcularPuntaje(p, i);
    alertaActualizada.probabilidad = calculo.probabilidad;
    alertaActualizada.impacto = calculo.impacto;
    alertaActualizada.puntaje = calculo.puntaje;
    alertaActualizada.nivel = calculo.nivel;
    alertaActualizada.prioritaria = calculo.prioritaria;
  }

  let errorSupabase = null;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('alertas')
        .update(alertaActualizada)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (!error && data) {
        return { data, source: 'supabase', error: null };
      }
      if (error) {
        errorSupabase = error.message;
        console.error('Error actualizando alerta en Supabase:', error.message);
      } else {
        errorSupabase = `Supabase no devolvió la alerta ${id} después de actualizarla. Verifica que el ID exista y que los permisos permitan actualizar y leer la fila.`;
        console.warn(errorSupabase);
      }
    } catch (err) {
      errorSupabase = err.message;
      console.error('Excepción actualizando alerta en Supabase:', err);
    }
  }

  // Si no hay Supabase o falló la política RLS en Supabase, actualizar localmente
  const alertas = getLocalAlertas();
  const idx = alertas.findIndex((a) => String(a.id) === String(id));
  if (idx !== -1) {
    alertas[idx] = { ...alertas[idx], ...alertaActualizada };
    saveLocalAlertas(alertas);
    return {
      data: alertas[idx],
      source: 'local',
      error: errorSupabase ? `Almacenado localmente. Supabase reportó: ${errorSupabase}` : null
    };
  }

  return { data: null, source: 'local', error: errorSupabase || 'Alerta no encontrada' };
}

/**
 * Actualiza la decisión tomada sobre una recomendación (pendiente, aceptada, descartada)
 */
export async function actualizarDecisionAlerta(id, decision) {
  return actualizarAlerta(id, { decision });
}

/**
 * Obtiene los valores históricos de los indicadores macroeconómicos
 */
export async function getValoresIndicadores() {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('valores_indicador')
        .select('*')
        .order('fecha', { ascending: false });

      if (!error && data && data.length > 0) {
        return { data, source: 'supabase', error: null };
      }
    } catch (err) {
      console.warn('Excepción al consultar valores_indicador:', err);
    }
  }

  return { data: VALORES_INDICADOR_INICIALES, source: 'local', error: null };
}

/**
 * Obtiene el último valor registrado de un indicador específico
 */
export async function getUltimoValorIndicador(codigo) {
  const { data } = await getValoresIndicadores();
  const filtrados = data.filter((v) => v.indicador_codigo === codigo);
  return filtrados.length > 0 ? filtrados[0] : null;
}

/**
 * Obtiene el catálogo de fuentes del sistema
 */
export async function getFuentes() {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('fuentes').select('*');
      if (!error && data && data.length > 0) return { data, source: 'supabase' };
    } catch (err) {
      console.warn('Error cargando fuentes de Supabase:', err);
    }
  }
  return { data: FUENTES_INICIALES, source: 'local' };
}

/**
 * Obtiene el registro de ejecuciones de los flujos de n8n
 */
export async function getEjecuciones() {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('ejecuciones')
        .select('*')
        .order('inicio', { ascending: false });

      if (!error && data && data.length > 0) return { data, source: 'supabase' };
    } catch (err) {
      console.warn('Error cargando ejecuciones de Supabase:', err);
    }
  }
  return { data: EJECUCIONES_INICIALES, source: 'local' };
}

export async function getUltimoIdEjecucion() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Configura Supabase antes de ejecutar y esperar los flujos de n8n.');
  }

  const { data, error } = await supabase
    .from('ejecuciones')
    .select('id')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo consultar ejecuciones en Supabase: ${error.message}`);
  }

  return Number(data?.id || 0);
}

export async function getEjecucionesPosteriores({ idMinimo }) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase no está configurado; no se pueden esperar los resultados de n8n.');
  }

  const { data, error } = await supabase
    .from('ejecuciones')
    .select('id, flujo, fuente, inicio, fin, estado, registros_nuevos, mensaje_error')
    .gt('id', idMinimo)
    .order('id', { ascending: true });

  if (error) {
    throw new Error(`No se pudieron leer los resultados de ejecuciones: ${error.message}`);
  }

  return data || [];
}

/**
 * Obtiene las reglas del recomendador
 */
export async function getReglas() {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('reglas').select('*');
      if (!error && data && data.length > 0) {
        const mapa = {};
        data.forEach((r) => {
          mapa[r.tipo_evento] = r;
        });
        return { data: mapa, source: 'supabase' };
      }
    } catch (err) {
      console.warn('Error cargando reglas de Supabase:', err);
    }
  }
  return { data: REGLAS_RECOMENDADOR, source: 'local' };
}
