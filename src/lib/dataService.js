import { supabase, isSupabaseConfigured } from './supabase';
import { calcularPuntaje } from './puntaje';

function requireEmpresa(empresaId) {
  if (!empresaId) throw new Error('No se encontró una empresa activa para esta sesión.');
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase no está configurado. No se pueden consultar datos empresariales.');
  }
}

function throwIfError(error, operation) {
  if (error) throw new Error(`${operation}: ${error.message}`);
}

export async function getConexionStatus(empresaId) {
  requireEmpresa(empresaId);

  const tablas = ['alertas', 'indicadores', 'valores_indicador', 'reglas', 'fuentes', 'ejecuciones'];
  const resultados = await Promise.all(
    tablas.map((tabla) =>
      supabase
        .from(tabla)
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', empresaId)
    )
  );

  const fallo = resultados.find((resultado) => resultado.error)?.error;
  throwIfError(fallo, 'No se pudo verificar el acceso a los datos de la empresa');

  const conteos = Object.fromEntries(
    tablas.map((tabla, index) => [tabla, resultados[index].count ?? 0])
  );
  const tieneFilas = Object.values(conteos).some((cantidad) => cantidad > 0);

  return {
    isConfigured: true,
    conectado: true,
    empresaId,
    conteos,
    tieneFilas,
    origenDatos: 'supabase',
    mensaje: tieneFilas
      ? 'Conexión activa a Supabase con datos de la empresa autenticada.'
      : 'Conexión activa. La empresa todavía no tiene datos registrados.'
  };
}

export async function getAlertas(empresaId) {
  requireEmpresa(empresaId);
  const { data, error } = await supabase
    .from('alertas')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('fecha_publicacion', { ascending: false })
    .order('puntaje', { ascending: false });

  throwIfError(error, 'No se pudieron consultar las alertas');
  return { data: data || [], source: 'supabase', count: data?.length || 0, error: null };
}

export async function actualizarAlerta(id, empresaId, campos) {
  requireEmpresa(empresaId);

  const { data: existente, error: errorExistente } = await supabase
    .from('alertas')
    .select('probabilidad, impacto')
    .eq('id', id)
    .eq('empresa_id', empresaId)
    .single();

  throwIfError(errorExistente, 'No se encontró la alerta de esta empresa');

  const cambios = { ...campos };
  delete cambios.empresa_id;

  if (campos.probabilidad !== undefined || campos.impacto !== undefined) {
    const calculo = calcularPuntaje(
      campos.probabilidad ?? existente.probabilidad,
      campos.impacto ?? existente.impacto
    );
    Object.assign(cambios, {
      probabilidad: calculo.probabilidad,
      impacto: calculo.impacto,
      puntaje: calculo.puntaje,
      nivel: calculo.nivel,
      prioritaria: calculo.prioritaria
    });
  }

  const { data, error } = await supabase
    .from('alertas')
    .update(cambios)
    .eq('id', id)
    .eq('empresa_id', empresaId)
    .select()
    .maybeSingle();

  throwIfError(error, 'No se pudo actualizar la alerta');
  if (!data) throw new Error('La alerta no existe o tu rol no permite modificarla.');
  return { data, source: 'supabase', error: null };
}

export function actualizarDecisionAlerta(id, empresaId, decision) {
  return actualizarAlerta(id, empresaId, { decision });
}

export async function getValoresIndicadores(empresaId) {
  requireEmpresa(empresaId);
  const { data, error } = await supabase
    .from('valores_indicador')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('fecha', { ascending: false });

  throwIfError(error, 'No se pudieron consultar los indicadores');
  return { data: data || [], source: 'supabase', error: null };
}

export async function getUltimoValorIndicador(codigo, empresaId) {
  const { data } = await getValoresIndicadores(empresaId);
  return data.find((valor) => valor.indicador_codigo === codigo) || null;
}

export async function getFuentes(empresaId) {
  requireEmpresa(empresaId);
  const { data, error } = await supabase
    .from('fuentes')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('nombre');

  throwIfError(error, 'No se pudieron consultar las fuentes');
  return { data: data || [], source: 'supabase' };
}

export async function getEjecuciones(empresaId) {
  requireEmpresa(empresaId);
  const { data, error } = await supabase
    .from('ejecuciones')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('inicio', { ascending: false });

  throwIfError(error, 'No se pudieron consultar las ejecuciones');
  return { data: data || [], source: 'supabase' };
}

export async function getUltimoIdEjecucion(empresaId) {
  requireEmpresa(empresaId);
  const { data, error } = await supabase
    .from('ejecuciones')
    .select('id')
    .eq('empresa_id', empresaId)
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  throwIfError(error, 'No se pudo consultar el historial de ejecuciones');
  return Number(data?.id || 0);
}

export async function getEjecucionesPosteriores({ idMinimo, empresaId }) {
  requireEmpresa(empresaId);
  const { data, error } = await supabase
    .from('ejecuciones')
    .select('id, flujo, fuente, inicio, fin, estado, registros_nuevos, mensaje_error')
    .eq('empresa_id', empresaId)
    .gt('id', idMinimo)
    .order('id', { ascending: true });

  throwIfError(error, 'No se pudieron leer los resultados de ejecuciones');
  return data || [];
}

export async function getReglas(empresaId) {
  requireEmpresa(empresaId);
  const { data, error } = await supabase
    .from('reglas')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('tipo_evento');

  throwIfError(error, 'No se pudieron consultar las reglas');
  const reglas = {};
  (data || []).forEach((regla) => {
    reglas[regla.tipo_evento] = regla;
  });
  return { data: reglas, source: 'supabase' };
}
