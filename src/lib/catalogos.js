// ==============================================================================
// AgroDecisions · Catálogos del panel de compra de cacao de Coagropacífico
// CATÁLOGOS OFICIALES Y REGLAS DEL RECOMENDADOR
// Fuente de verdad: docs/Documento maestro de definición del aplicativo.md
// ==============================================================================

export const FACTORES = [
  'Político',
  'Económico',
  'Social',
  'Tecnológico',
  'Ecológico',
  'Legal'
];

export const AREAS = [
  'Compras y finanzas',
  'Operaciones y logística',
  'Forestal',
  'Talento humano',
  'Jurídico y ambiental',
  'Planeación y sostenibilidad',
  'Comercial'
];

export const ESTADOS_ALERTA = [
  'pendiente',
  'validada',
  'descartada',
  'sin_clasificar'
];

export const DECISIONES_USUARIO = [
  'pendiente',
  'aceptada',
  'descartada'
];

export const TIPOS_EVENTO = [
  'paro_bloqueo',
  'clima_incendio',
  'energia_racionamiento',
  'norma_ambiental_empaques',
  'norma_laboral_tributaria',
  'tasa_cambio',
  'otro'
];

// Drivers del cacao (contrapropuesta). Coinciden con public.drivers en Supabase
// y se guardan en alertas.factor.
export const DRIVERS = [
  { codigo: 'precio_internacional', nombre: 'Precio internacional', queVigila: 'Bolsa de Nueva York y Londres', pestel: 'Económico' },
  { codigo: 'oferta_africana', nombre: 'Oferta africana', queVigila: 'Cosechas, llegadas a puerto, precio oficial de Costa de Marfil y Ghana', pestel: 'Económico / Ecológico' },
  { codigo: 'clima', nombre: 'Clima', queVigila: 'Lluvias y El Niño en África y en el Pacífico colombiano', pestel: 'Ecológico' },
  { codigo: 'demanda', nombre: 'Demanda', queVigila: 'Molienda, inventarios, consumo', pestel: 'Económico' },
  { codigo: 'regulacion_mercado', nombre: 'Regulación y mercado', queVigila: 'EUDR, límites de cadmio, aranceles, certificaciones', pestel: 'Legal / Político' },
  { codigo: 'entorno_local', nombre: 'Entorno local', queVigila: 'TRM, orden público y vías en Tumaco, costos, liquidez de caja', pestel: 'Político / Económico / Social' }
];

export function nombreDriver(codigo) {
  return DRIVERS.find((driver) => driver.codigo === codigo)?.nombre || codigo || 'Sin driver';
}

export const EFECTOS_PRECIO = {
  sube: { etiqueta: 'Sube el precio', clase: 'border-amber-200 bg-amber-50 text-amber-900' },
  baja: { etiqueta: 'Baja el precio', clase: 'border-sky-200 bg-sky-50 text-sky-900' },
  neutral: { etiqueta: 'Neutral', clase: 'border-slate-200 bg-slate-50 text-slate-700' }
};
