export function mostrarNumero(value, options = {}) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2, ...options }).format(Number(value));
}

export function mostrarPesos(value, decimals = 0) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals
  }).format(Number(value));
}

/** Pesos abreviados en millones: $252,1 M */
export function mostrarMillones(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
  const numero = Number(value);
  const texto = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1, minimumFractionDigits: 1 })
    .format(Math.abs(numero) / 1e6);
  return `${numero < 0 ? '−' : ''}$${texto} M`;
}

export function mostrarPorcentaje(value, { signo = false } = {}) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
  const texto = mostrarNumero(value, { maximumFractionDigits: 1 });
  return `${signo && Number(value) > 0 ? '+' : ''}${texto} %`;
}
