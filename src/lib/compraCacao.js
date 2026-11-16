export function valorNumerico(value) {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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

export function resumirMercado(observaciones) {
  const historico = observaciones
    .filter((item) => Number.isFinite(Number(item.price)) && Number(item.price) > 0 &&
      Number.isFinite(Number(item.timestamp)))
    .sort((a, b) => a.timestamp - b.timestamp);
  const ultimo = historico[historico.length - 1] || null;
  const preciosHistoricos = historico.map((item) => Number(item.price));
  const percentil25 = calcularPercentil(preciosHistoricos, 0.25);
  const percentil75 = calcularPercentil(preciosHistoricos, 0.75);

  return {
    observaciones: historico,
    ultimo: ultimo
      ? {
          precio_usd_t: Number(ultimo.price),
          observado_en: ultimo.timestamp,
          fuente: 'Yahoo Finance · CC=F'
        }
      : null,
    percentil25,
    percentil75,
    nivelPrecio: preciosHistoricos.length < 2
      ? null
      : Number(ultimo.price) < percentil25
      ? 'Bajo'
      : Number(ultimo.price) > percentil75
      ? 'Alto'
      : 'Medio'
  };
}

export function calcularCompraCacao(configuracion, calidades, precioReferencia, mercado) {
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

    const precioCompraCopKg = ((precio + diferencial) * trm / 1000) * (1 - margen / 100);
    const capitalConAcopio = volumen * precioCompraCopKg * (1 + acopio / 100);

    return {
      ...calidad,
      lista: true,
      precioCompraCopKg,
      capitalConAcopio,
      debajoCostoProduccion: costoProduccion !== null && precioCompraCopKg < costoProduccion
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
  const brechaCop = capitalRequerido - caja;
  const factorPesos = trm / 1000 * (1 - margen / 100);
  const sumaVolumenPonderado = calidades.reduce((total, calidad) => {
    const acopio = valorNumerico(calidad.acopio_pct);
    return total + Number(calidad.volumen_kg) * (1 + acopio / 100);
  }, 0);
  const sumaDiferencialesPonderados = calidades.reduce((total, calidad) => {
    const acopio = valorNumerico(calidad.acopio_pct);
    return total +
      Number(calidad.volumen_kg) *
      (1 + acopio / 100) *
      Number(calidad.diferencial_usd_t);
  }, 0);
  const bolsaMaximaUsdT = sumaVolumenPonderado > 0 && factorPesos > 0
    ? (caja / (1 + colchon / 100) / factorPesos - sumaDiferencialesPonderados) /
      sumaVolumenPonderado
    : null;

  let recomendacion = null;
  if (mercado.nivelPrecio && coberturaPct !== null) {
    const cobertura = coberturaPct < 100
      ? 'deficit'
      : coberturaPct <= 120
      ? 'ajustada'
      : 'holgada';

    if (mercado.nivelPrecio === 'Bajo') {
      recomendacion = cobertura === 'deficit'
        ? 'Ventana favorable sin caja: gestionar anticipo o crédito antes de comprar; priorizar la calidad de mayor margen validado.'
        : 'Ventana favorable: adelantar compras de esta calidad hasta el límite de la caja disponible.';
    } else if (mercado.nivelPrecio === 'Medio') {
      recomendacion = cobertura === 'holgada'
        ? 'Comprar según el plan de compras definido por la cooperativa.'
        : 'Comprar lo esencial y asegurar caja antes del siguiente tramo.';
    } else {
      recomendacion = cobertura === 'holgada'
        ? 'Limitar la compra al volumen comprometido y evitar acopio adicional.'
        : 'Alerta roja: reducir volumen, escalonar compras o conseguir financiamiento.';
    }
  }

  return {
    calidades: resultadosCalidad,
    listo: true,
    capitalRequerido,
    coberturaPct,
    brechaCop,
    bolsaMaximaUsdT,
    recomendacion
  };
}
