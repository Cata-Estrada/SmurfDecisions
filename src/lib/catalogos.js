// ==============================================================================
// PROYECTO: SmurfDecisions - Smurfit Westrock Colombia
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

export const REGLAS_RECOMENDADOR = {
  paro_bloqueo: {
    tipo_evento: 'paro_bloqueo',
    accion: 'Revisar inventarios críticos y rutas alternas',
    area_responsable: 'Operaciones y logística',
    supuestos: 'Supone existencia de inventarios de seguridad en planta Yumbo y disponibilidad de rutas logísticas secundarias.'
  },
  clima_incendio: {
    tipo_evento: 'clima_incendio',
    accion: 'Revisar el plan de contingencia forestal y de agua',
    area_responsable: 'Forestal',
    supuestos: 'Supone brigadas contra incendios activas y monitoreo permanente en las 67.700 ha de bosques certificados.'
  },
  energia_racionamiento: {
    tipo_evento: 'energia_racionamiento',
    accion: 'Verificar la continuidad de la planta y la autogeneración',
    area_responsable: 'Operaciones y logística',
    supuestos: 'Supone operación de la caldera de biomasa de Yumbo (hasta 80% de energía renovable) y capacidad de respaldo.'
  },
  norma_ambiental_empaques: {
    tipo_evento: 'norma_ambiental_empaques',
    accion: 'Remitir para verificar vigencia y aplicabilidad',
    area_responsable: 'Jurídico y ambiental',
    supuestos: 'Supone verificación de metas vigentes de aprovechamiento y reciclaje de la Resolución 1407/0803.'
  },
  norma_laboral_tributaria: {
    tipo_evento: 'norma_laboral_tributaria',
    accion: 'Remitir para verificar aplicabilidad y costo',
    area_responsable: 'Talento humano',
    supuestos: 'Supone impacto directo en rediseño de turnos continuos por jornada de 42 horas y recargos dominicales al 90%.'
  },
  tasa_cambio: {
    tipo_evento: 'tasa_cambio',
    accion: 'Abrir el simulador y consultar a finanzas sobre negociación o cobertura',
    area_responsable: 'Compras y finanzas',
    supuestos: 'Supone compras de repuestos e insumos en USD y contratos con proveedores internacionales.'
  },
  otro: {
    tipo_evento: 'otro',
    accion: 'Sin regla: revisión manual',
    area_responsable: 'Planeación y sostenibilidad',
    supuestos: 'Supone que el hallazgo no encaja en las reglas predefinidas y requiere evaluación cualitativa por planeación.'
  }
};

export const REGLA_POR_DEFECTO = REGLAS_RECOMENDADOR.otro;
