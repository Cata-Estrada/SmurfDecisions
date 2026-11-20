// ==============================================================================
// Lógica de compra de cacao (contrapropuesta Coagropacífico)
//
//   Precio_q  = (Bolsa + dif_q) × TRM ÷ 1000 × (1 − margen)
//   Capital_q = Volumen_q × Precio_q × (1 + acopio_q)
//   Capital   = Σ Capital_q × (1 + colchón)
//   Cobertura = Caja ÷ Capital        Brecha = Capital − Caja
//
// Momento de compra: posición del precio frente a P25/P75 de la ventana
// (90 días por defecto) × cobertura de caja (déficit / ajustada / holgada),
// más la alerta de movimiento (variación en N días hábiles) y la de precio de
// equilibrio (precio de compra bajo el costo de producción).
// ==============================================================================

export const UMBRALES_PREDETERMINADOS = {
  ventana_percentil_dias: 90,
  umbral_variacion_pct: 5,
  dias_variacion: 5,
  cobertura_ajustada_pct: 100,
  cobertura_holgada_pct: 120
};

// Se usan solo si la tabla reglas_compra está vacía.
export const REGLAS_COMPRA_PREDETERMINADAS = [
  ['bajo', 'holgada', 'Ventana favorable', 'Adelantar compras de esta calidad hasta el límite de la caja.', 'verde'],
  ['bajo', 'ajustada', 'Ventana favorable', 'Adelantar compras de esta calidad hasta el límite de la caja.', 'verde'],
  ['bajo', 'deficit', 'Ventana favorable sin caja', 'Gestionar anticipo o crédito antes de comprar; priorizar la calidad de mayor margen.', 'amarillo'],
  ['medio', 'holgada', 'Comprar según plan', 'Comprar según el plan de compras.', 'verde'],
  ['medio', 'ajustada', 'Comprar lo esencial', 'Comprar lo esencial y asegurar caja antes del siguiente tramo.', 'amarillo'],
  ['medio', 'deficit', 'Comprar lo esencial', 'Comprar lo esencial y asegurar caja antes del siguiente tramo.', 'amarillo'],
  ['alto', 'holgada', 'Limitar la compra', 'Limitar la compra al volumen comprometido; evitar acopio adicional.', 'amarillo'],
  ['alto', 'ajustada', 'Alerta roja', 'Reducir volumen, escalonar compras o conseguir financiamiento.', 'rojo'],
  ['alto', 'deficit', 'Alerta roja', 'Reducir volumen, escalonar compras o conseguir financiamiento.', 'rojo']
].map(([nivel_precio, cobertura, titulo, recomendacion, semaforo]) => ({
  nivel_precio, cobertura, titulo, recomendacion, semaforo
}));

export const ETIQUETA_NIVEL = { bajo: 'Bajo', medio: 'Medio', alto: 'Alto' };
export const ETIQUETA_COBERTURA = { deficit: 'Déficit', ajustada: 'Ajustada', holgada: 'Holgada' };

const DIA_MS = 24 * 60 * 60 * 1000;

export function valorNumerico(value) {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function umbral(configuracion, campo) {
  return valorNumerico(configuracion?.[campo]) ?? UMBRALES_PREDETERMINADOS[campo];
}

export function calcularPercentil(values, percentile) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * percentile;
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);
  const fraction = position - lowerIndex;
  return sorted[lowerIndex] + (sorted[upperIndex] - sorted[lowerIndex]) * fraction;
}

export function clasificarNivel(precio, percentil25, percentil75) {
  if (!Number.isFinite(precio) || percentil25 === null || percentil75 === null) return null;
  if (precio < percentil25) return 'bajo';
  if (precio > percentil75) return 'alto';
  return 'medio';
}

export function clasificarCobertura(coberturaPct, configuracion = {}) {
  if (coberturaPct === null || !Number.isFinite(coberturaPct)) return null;
  if (coberturaPct < umbral(configuracion, 'cobertura_ajustada_pct')) return 'deficit';
  if (coberturaPct <= umbral(configuracion, 'cobertura_holgada_pct')) return 'ajustada';
  return 'holgada';
}

/**
 * Resume la serie diaria de la bolsa.
 * - Percentiles sobre los últimos `ventana_percentil_dias` días calendario.
 * - Variación entre el último cierre y el de hace `dias_variacion` sesiones.
 */
export function resumirMercado(observaciones, configuracion = {}) {
  const historico = (observaciones || [])
    .filter((item) => Number.isFinite(Number(item.price)) && Number(item.price) > 0 &&
      Number.isFinite(Number(item.timestamp)))
    .map((item) => ({ timestamp: Number(item.timestamp), price: Number(item.price) }))
    .sort((a, b) => a.timestamp - b.timestamp);

  const ultimo = historico[historico.length - 1] || null;
  const ventanaDias = umbral(configuracion, 'ventana_percentil_dias');
  const diasVariacion = umbral(configuracion, 'dias_variacion');
  const umbralVariacion = umbral(configuracion, 'umbral_variacion_pct');

  const ventana = ultimo
    ? historico.filter((item) => item.timestamp >= ultimo.timestamp - ventanaDias * DIA_MS)
    : [];
  const preciosVentana = ventana.map((item) => item.price);
  const suficiente = preciosVentana.length >= 10;
  const percentil25 = suficiente ? calcularPercentil(preciosVentana, 0.25) : null;
  const percentil75 = suficiente ? calcularPercentil(preciosVentana, 0.75) : null;

  const referencia = historico.length > diasVariacion
    ? historico[historico.length - 1 - diasVariacion]
    : null;
  const variacionPct = ultimo && referencia
    ? (ultimo.price - referencia.price) / referencia.price * 100
    : null;

  return {
    observaciones: historico,
    ultimo: ultimo
      ? { precio_usd_t: ultimo.price, observado_en: ultimo.timestamp, fuente: 'Yahoo Finance · CC=F' }
      : null,
    ventanaDias,
    datosVentana: preciosVentana.length,
    percentil25,
    percentil75,
    nivelPrecio: ultimo ? clasificarNivel(ultimo.price, percentil25, percentil75) : null,
    diasVariacion,
    umbralVariacion,
    variacionPct,
    alertaVariacion: variacionPct !== null && Math.abs(variacionPct) > umbralVariacion
  };
}

function buscarRegla(reglas, nivelPrecio, cobertura) {
  const lista = reglas && reglas.length > 0 ? reglas : REGLAS_COMPRA_PREDETERMINADAS;
  return lista.find((r) => r.nivel_precio === nivelPrecio && r.cobertura === cobertura) ||
    REGLAS_COMPRA_PREDETERMINADAS.find((r) => r.nivel_precio === nivelPrecio && r.cobertura === cobertura) ||
    null;
}

function precioKg(bolsa, diferencial, trm, margen) {
  return (bolsa + diferencial) * trm / 1000 * (1 - margen / 100);
}

/**
 * Cálculo completo. `opciones.reglas` son las filas de reglas_compra.
 * Si `mercado` es null no se calculan nivel ni recomendación (útil en escenarios).
 */
export function calcularCompraCacao(configuracion, calidades, precioReferencia, mercado, opciones = {}) {
  const precio = valorNumerico(precioReferencia);
  const trm = valorNumerico(configuracion.trm_cop);
  const margen = valorNumerico(configuracion.margen_pct);
  const caja = valorNumerico(configuracion.caja_disponible_cop);
  const colchon = valorNumerico(configuracion.colchon_pct);

  const entradasConfiguracionValidas =
    precio !== null && precio > 0 &&
    trm !== null && trm > 0 &&
    margen !== null && margen >= 0 && margen < 100 &&
    caja !== null && caja >= 0 &&
    colchon !== null && colchon >= 0;

  const resultadosCalidad = calidades.map((calidad) => {
    const diferencial = valorNumerico(calidad.diferencial_usd_t);
    const volumen = valorNumerico(calidad.volumen_kg);
    const acopio = valorNumerico(calidad.acopio_pct);
    const costoProduccion = valorNumerico(calidad.costo_produccion_cop_kg);
    const lista = entradasConfiguracionValidas &&
      diferencial !== null &&
      volumen !== null && volumen > 0 &&
      acopio !== null && acopio >= 0;

    if (!lista) return { ...calidad, lista: false };

    const precioCompraCopKg = precioKg(precio, diferencial, trm, margen);
    const capitalConAcopio = volumen * precioCompraCopKg * (1 + acopio / 100);

    return {
      ...calidad,
      lista: true,
      precioCompraCopKg,
      capitalConAcopio,
      margenProductorCopKg: costoProduccion !== null ? precioCompraCopKg - costoProduccion : null,
      debajoCostoProduccion: costoProduccion !== null && precioCompraCopKg < costoProduccion,
      percentil25CopKg: mercado?.percentil25 != null
        ? precioKg(mercado.percentil25, diferencial, trm, margen) : null,
      percentil75CopKg: mercado?.percentil75 != null
        ? precioKg(mercado.percentil75, diferencial, trm, margen) : null
    };
  });

  const todasLasCalidadesCompletas =
    calidades.length > 0 && resultadosCalidad.every((item) => item.lista);

  if (!entradasConfiguracionValidas || !todasLasCalidadesCompletas) {
    return {
      calidades: resultadosCalidad,
      listo: false,
      capitalRequerido: null,
      coberturaPct: null,
      cobertura: null,
      brechaCop: null,
      bolsaMaximaUsdT: null,
      recomendacion: null
    };
  }

  const capitalAntesColchon = resultadosCalidad.reduce(
    (total, calidad) => total + calidad.capitalConAcopio,
    0
  );
  const capitalRequerido = capitalAntesColchon * (1 + colchon / 100);
  const coberturaPct = capitalRequerido > 0 ? caja / capitalRequerido * 100 : null;
  const cobertura = clasificarCobertura(coberturaPct, configuracion);
  const brechaCop = capitalRequerido - caja;

  // Bolsa máxima: la que hace Capital = Caja.
  const factorPesos = trm / 1000 * (1 - margen / 100);
  let sumaVolumenPonderado = 0;
  let sumaDiferencialesPonderados = 0;
  for (const calidad of calidades) {
    const peso = Number(calidad.volumen_kg) * (1 + Number(calidad.acopio_pct) / 100);
    sumaVolumenPonderado += peso;
    sumaDiferencialesPonderados += peso * Number(calidad.diferencial_usd_t);
  }
  const bolsaMaximaUsdT = sumaVolumenPonderado > 0 && factorPesos > 0
    ? (caja / (1 + colchon / 100) / factorPesos - sumaDiferencialesPonderados) / sumaVolumenPonderado
    : null;

  // Recomendación general y por calidad.
  const nivelPrecio = mercado?.nivelPrecio ?? null;
  const regla = nivelPrecio && cobertura ? buscarRegla(opciones.reglas, nivelPrecio, cobertura) : null;

  const calidadesConRecomendacion = resultadosCalidad.map((calidad) => {
    if (!regla) return { ...calidad, recomendacion: null, semaforo: calidad.debajoCostoProduccion ? 'rojo' : null };
    if (calidad.debajoCostoProduccion) {
      return {
        ...calidad,
        recomendacion: {
          titulo: 'Alerta de precio de equilibrio',
          recomendacion: `El precio de compra queda bajo el costo de producción: el productor estaría trabajando a pérdida. ${regla.recomendacion}`
        },
        semaforo: 'rojo'
      };
    }
    return {
      ...calidad,
      recomendacion: { titulo: regla.titulo, recomendacion: regla.recomendacion },
      semaforo: regla.semaforo
    };
  });

  return {
    calidades: calidadesConRecomendacion,
    listo: true,
    capitalAntesColchon,
    capitalRequerido,
    coberturaPct,
    cobertura,
    brechaCop,
    bolsaMaximaUsdT,
    nivelPrecio,
    recomendacion: regla
      ? {
          titulo: regla.titulo,
          recomendacion: regla.recomendacion.replace(/ de esta calidad/gi, ''),
          semaforo: regla.semaforo
        }
      : null
  };
}

/**
 * Escenario: aplica variaciones porcentuales a bolsa, TRM y volumen,
 * y devuelve el cálculo completo con el escenario.
 */
export function simularEscenario(configuracion, calidades, precioReferencia, variaciones = {}, mercado = null, opciones = {}) {
  const bolsaPct = Number(variaciones.bolsaPct) || 0;
  const trmPct = Number(variaciones.trmPct) || 0;
  const volumenPct = Number(variaciones.volumenPct) || 0;
  const precio = valorNumerico(precioReferencia);
  const trm = valorNumerico(configuracion.trm_cop);

  const configuracionEscenario = {
    ...configuracion,
    trm_cop: trm === null ? configuracion.trm_cop : trm * (1 + trmPct / 100)
  };
  const calidadesEscenario = calidades.map((calidad) => {
    const volumen = valorNumerico(calidad.volumen_kg);
    return volumen === null ? calidad : { ...calidad, volumen_kg: volumen * (1 + volumenPct / 100) };
  });
  const bolsaEscenario = precio === null ? null : precio * (1 + bolsaPct / 100);

  // El nivel del precio en el escenario se reubica frente a los mismos percentiles.
  const mercadoEscenario = mercado
    ? { ...mercado, nivelPrecio: clasificarNivel(bolsaEscenario, mercado.percentil25, mercado.percentil75) }
    : null;

  return {
    bolsaUsdT: bolsaEscenario,
    trmCop: configuracionEscenario.trm_cop,
    ...calcularCompraCacao(configuracionEscenario, calidadesEscenario, bolsaEscenario, mercadoEscenario, opciones)
  };
}
