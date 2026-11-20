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

  const tablas = ['alertas', 'valores_indicador', 'reglas', 'fuentes', 'ejecuciones'];
  const resultados = await Promise.all(
    tablas.map((tabla) => {
      const consulta = supabase
        .from(tabla)
        .select('*', { count: 'exact', head: true });

      // valores_indicador es global (TRM y bolsa del cacao); el resto es por empresa.
      return tabla === 'valores_indicador' ? consulta : consulta.eq('empresa_id', empresaId);
    })
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

export async function getDatosCompraCacao(empresaId) {
  requireEmpresa(empresaId);
  const [configuracion, calidades, caja] = await Promise.all([
    supabase
      .from('configuracion_compra_cacao')
      .select('*')
      .eq('empresa_id', empresaId)
      .maybeSingle(),
    supabase
      .from('calidades_cacao')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('nombre'),
    getCajaVigente(empresaId)
  ]);

  throwIfError(configuracion.error, 'No se pudo consultar la configuración de compra de cacao');
  throwIfError(calidades.error, 'No se pudieron consultar las calidades de cacao');

  return {
    configuracion: (configuracion.data || caja)
      ?{ ...(configuracion.data || {}), caja_disponible_cop: caja?.disponible_cop ?? null }
      : null,
    calidades: calidades.data || []
  };
}

// La caja vive en su propia tabla (historial de saldos); la vigente es la más reciente.
export async function getCajaVigente(empresaId) {
  requireEmpresa(empresaId);
  const { data, error } = await supabase
    .from('caja')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('fecha', { ascending: false })
    .order('creado_en', { ascending: false })
    .limit(1)
    .maybeSingle();

  throwIfError(error, 'No se pudo consultar la caja disponible');
  return data;
}

export async function registrarCaja(empresaId, usuarioId, disponibleCop, nota = null) {
  requireEmpresa(empresaId);
  const { data, error } = await supabase
    .from('caja')
    .insert({
      empresa_id: empresaId,
      disponible_cop: disponibleCop,
      nota,
      registrado_por: usuarioId
    })
    .select()
    .single();

  throwIfError(error, 'No se pudo registrar la caja disponible');
  return data;
}

export async function guardarConfiguracionCompraCacao(empresaId, usuarioId, campos) {
  requireEmpresa(empresaId);
  const { caja_disponible_cop: cajaNueva, ...parametros } = campos;

  const { data, error } = await supabase
    .from('configuracion_compra_cacao')
    .upsert(
      { ...parametros, empresa_id: empresaId, actualizado_por: usuarioId },
      { onConflict: 'empresa_id' }
    )
    .select()
    .single();

  throwIfError(error, 'No se pudo guardar la configuración de compra');

  let caja = await getCajaVigente(empresaId);
  if (cajaNueva !== null && cajaNueva !== undefined &&
      Number(cajaNueva) !== Number(caja?.disponible_cop)) {
    caja = await registrarCaja(empresaId, usuarioId, cajaNueva);
  }

  return { ...data, caja_disponible_cop: caja?.disponible_cop ?? null };
}

export async function guardarCalidadCacao(empresaId, usuarioId, calidad) {
  requireEmpresa(empresaId);
  const { data, error } = await supabase
    .from('calidades_cacao')
    .upsert(
      { ...calidad, empresa_id: empresaId, actualizado_por: usuarioId },
      { onConflict: 'id' }
    )
    .select()
    .single();

  throwIfError(error, `No se pudo guardar la calidad "${calidad.nombre}"`);
  return data;
}

export async function eliminarCalidadCacao(id, empresaId) {
  requireEmpresa(empresaId);
  const { error } = await supabase
    .from('calidades_cacao')
    .delete()
    .eq('id', id)
    .eq('empresa_id', empresaId);

  throwIfError(error, 'No se pudo eliminar la calidad de cacao');
}

export async function getPrecioCacaoMercado({ includeTrm = true } = {}) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase no está configurado. No se puede consultar la cotización del cacao.');
  }

  const { data, error } = await supabase.functions.invoke('precio-cacao', {
    body: { includeTrm }
  });
  if (error) {
    if (error.name === 'FunctionsFetchError') {
      throw new Error(
        'No se pudo conectar con la función de precios de Supabase. Confirma que "precio-cacao" esté desplegada y que el proyecto esté enlazado correctamente.'
      );
    }
    if (error.name === 'FunctionsRelayError') {
      throw new Error(
        'Supabase no encuentra la función "precio-cacao". Despliega la versión Yahoo en Edge Functions para cargar la cotización.'
      );
    }
    if (error.name === 'FunctionsHttpError') {
      throw new Error(
        `La función de precios respondió con un error HTTP (${error.context?.status ?? 'desconocido'}). Revisa sus logs en Supabase → Edge Functions → precio-cacao.`
      );
    }
    throw new Error(`No se pudo consultar el precio actual del cacao: ${error.message}`);
  }
  if (data?.quote?.precio !== undefined ||
      data?.points?.some((point) => point?.fecha !== undefined)) {
    throw new Error(
      'La Edge Function desplegada todavía devuelve el formato mensual anterior. Actualiza y vuelve a desplegar "precio-cacao" con el archivo supabase/functions/precio-cacao/index.ts; no necesitas cambiar el schema.'
    );
  }
  if (!Number.isFinite(data?.quote?.price) ||
      !Number.isFinite(data?.quote?.timestamp) ||
      !Array.isArray(data.points) ||
      data.points.length === 0 ||
      data.points.some((point) =>
        !Number.isFinite(point?.timestamp) || !Number.isFinite(point?.price)
      )) {
    throw new Error(
      'La Edge Function respondió, pero su formato no coincide con la versión Yahoo del gráfico. Vuelve a desplegar "precio-cacao" desde supabase/functions/precio-cacao/index.ts.'
    );
  }
  return data;
}
