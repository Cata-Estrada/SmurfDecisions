// ==============================================================================
// PROYECTO: SmurfDecisions - Smurfit Westrock Colombia
// FÓRMULA OFICIAL DE PUNTAJE Y CLASIFICACIÓN DE IMPACTO
// Fuente de verdad: docs/Documento maestro de definición del aplicativo.md
// y docs/Análisis PESTEL – Smurfit Westrock Colombia.md
// ==============================================================================

/**
 * Calcula el puntaje de prioridad multiplicando probabilidad por impacto.
 * Asigna el nivel de riesgo según los rangos oficiales:
 * - Alto: 15 a 25
 * - Medio: 8 a 14
 * - Bajo: 1 a 7
 * Una alerta es prioritaria si su puntaje es mayor o igual a 15.
 *
 * @param {number|string} probabilidad Valor entre 1 y 5
 * @param {number|string} impacto Valor entre 1 y 5
 * @returns {{
 *   probabilidad: number,
 *   impacto: number,
 *   puntaje: number,
 *   nivel: 'Alto'|'Medio'|'Bajo',
 *   prioritaria: boolean,
 *   colorClases: {
 *     badge: string,
 *     border: string,
 *     text: string,
 *     bg: string
 *   }
 * }}
 */
export function calcularPuntaje(probabilidad, impacto) {
  const p = Math.max(1, Math.min(5, parseInt(probabilidad, 10) || 1));
  const i = Math.max(1, Math.min(5, parseInt(impacto, 10) || 1));
  const puntaje = p * i;

  let nivel = 'Bajo';
  let badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
  let borderClass = 'border-emerald-500';
  let textClass = 'text-emerald-700';
  let bgClass = 'bg-emerald-50';

  if (puntaje >= 15) {
    nivel = 'Alto';
    badgeClass = 'bg-red-50 text-red-800 border-red-200';
    borderClass = 'border-red-500';
    textClass = 'text-red-700';
    bgClass = 'bg-red-50';
  } else if (puntaje >= 8) {
    nivel = 'Medio';
    badgeClass = 'bg-amber-50 text-amber-800 border-amber-200';
    borderClass = 'border-amber-500';
    textClass = 'text-amber-700';
    bgClass = 'bg-amber-50';
  }

  const prioritaria = puntaje >= 15;

  return {
    probabilidad: p,
    impacto: i,
    puntaje,
    nivel,
    prioritaria,
    colorClases: {
      badge: badgeClass,
      border: borderClass,
      text: textClass,
      bg: bgClass
    }
  };
}

export function normalizarValorEscala(valor) {
  if (valor === null || valor === undefined || valor === '') return null;

  const numero = Number(valor);
  return Number.isInteger(numero) && numero >= 1 && numero <= 5
    ? numero
    : null;
}

/**
 * Obtiene los estilos visuales para un nivel de texto dado.
 * @param {'Alto'|'Medio'|'Bajo'} nivel
 */
export function obtenerEstilosNivel(nivel) {
  switch (nivel) {
    case 'Alto':
      return {
        badge: 'bg-red-50 text-red-700 border-red-200',
        badgeSolid: 'bg-red-600 text-white',
        border: 'border-red-500',
        text: 'text-red-700',
        dot: 'bg-red-500',
        lightBg: 'bg-red-50'
      };
    case 'Medio':
      return {
        badge: 'bg-amber-50 text-amber-700 border-amber-200',
        badgeSolid: 'bg-amber-500 text-white',
        border: 'border-amber-500',
        text: 'text-amber-700',
        dot: 'bg-amber-500',
        lightBg: 'bg-amber-50'
      };
    case 'Bajo':
    default:
      return {
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        badgeSolid: 'bg-emerald-600 text-white',
        border: 'border-emerald-500',
        text: 'text-emerald-700',
        dot: 'bg-emerald-500',
        lightBg: 'bg-emerald-50'
      };
  }
}
