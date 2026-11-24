// ==============================================================================
// Catálogos de Coagropacífico (drivers, áreas, tipos de evento)
// Ver docs/Definición del aplicativo – Coagropacífico.md
// ==============================================================================

export const AREAS = [
  'Gerencia',
  'Compras y acopio',
  'Finanzas y tesorería',
  'Calidad y certificación',
  'Logística'
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

// Tipos de evento de noticias. Coinciden con public.reglas (acción sugerida).
export const TIPOS_EVENTO = [
  { codigo: 'movimiento_bolsa', nombre: 'Movimiento de la bolsa' },
  { codigo: 'cosecha_africa', nombre: 'Cosecha en África' },
  { codigo: 'precio_oficial_africa', nombre: 'Precio oficial de Costa de Marfil o Ghana' },
  { codigo: 'clima', nombre: 'Clima' },
  { codigo: 'demanda_molienda', nombre: 'Demanda y molienda' },
  { codigo: 'regulacion', nombre: 'Regulación (EUDR, cadmio, aranceles)' },
  { codigo: 'orden_publico_vias', nombre: 'Orden público y vías' },
  { codigo: 'tasa_cambio', nombre: 'Tasa de cambio' },
  { codigo: 'otro', nombre: 'Otro' }
];

export function nombreTipoEvento(codigo) {
  return TIPOS_EVENTO.find((tipo) => tipo.codigo === codigo)?.nombre || codigo || 'Sin tipo';
}

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

// Los drivers usan la misma columna factor que antes ocupaba PESTEL.
export const FACTORES = DRIVERS.map((driver) => driver.codigo);

export const EFECTOS_PRECIO = {
  sube: { etiqueta: 'Sube el precio', clase: 'border-amber-200 bg-amber-50 text-amber-900' },
  baja: { etiqueta: 'Baja el precio', clase: 'border-sky-200 bg-sky-50 text-sky-900' },
  neutral: { etiqueta: 'Neutral', clase: 'border-slate-200 bg-slate-50 text-slate-700' }
};
