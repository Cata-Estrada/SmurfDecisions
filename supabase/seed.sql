-- ==============================================================================
-- PROYECTO: SmurfDecisions - Panel de Decisiones PESTEL para Smurfit Westrock Colombia
-- DATOS SEMILLA (Supabase / PostgreSQL)
-- Fuente de verdad: docs/Documento maestro de definición del aplicativo.md
-- y docs/Análisis PESTEL – Smurfit Westrock Colombia.md
-- ==============================================================================

-- 1. Reglas del Recomendador
INSERT INTO public.reglas (tipo_evento, accion, area_responsable, supuestos) VALUES
('paro_bloqueo', 'Revisar inventarios críticos y rutas alternas', 'Operaciones y logística', 'Supone existencia de inventarios de seguridad en planta Yumbo y disponibilidad de rutas logísticas secundarias.'),
('clima_incendio', 'Revisar el plan de contingencia forestal y de agua', 'Forestal', 'Supone brigadas contra incendios activas y monitoreo permanente en las 67.700 ha de bosques certificados.'),
('energia_racionamiento', 'Verificar la continuidad de la planta y la autogeneración', 'Operaciones y logística', 'Supone operación de la caldera de biomasa de Yumbo (hasta 80% de energía renovable) y capacidad de respaldo.'),
('norma_ambiental_empaques', 'Remitir para verificar vigencia y aplicabilidad', 'Jurídico y ambiental', 'Supone verificación de metas vigentes de aprovechamiento y reciclaje de la Resolución 1407/0803.'),
('norma_laboral_tributaria', 'Remitir para verificar aplicabilidad y costo', 'Talento humano', 'Supone impacto directo en rediseño de turnos continuos por jornada de 42 horas y recargos dominicales al 90%.'),
('tasa_cambio', 'Abrir el simulador y consultar a finanzas sobre negociación o cobertura', 'Compras y finanzas', 'Supone compras de repuestos e insumos en USD y contratos con proveedores internacionales.'),
('otro', 'Sin regla: revisión manual', 'Planeación y sostenibilidad', 'Supone que el hallazgo no encaja en las reglas predefinidas y requiere evaluación cualitativa por planeación.')
ON CONFLICT (tipo_evento) DO UPDATE SET
    accion = EXCLUDED.accion,
    area_responsable = EXCLUDED.area_responsable,
    supuestos = EXCLUDED.supuestos;

-- 2. Fuentes del Sistema
INSERT INTO public.fuentes (id, nombre, tipo, frecuencia_horas) VALUES
('superfinanciera_trm', 'Superfinanciera / Datos Abiertos Colombia (TRM)', 'indicador', 24),
('dane_ipc', 'DANE - Índice de Precios al Consumidor (IPC)', 'indicador', 720),
('banrep_tasa', 'Banco de la República - Tasa de Política Monetaria', 'indicador', 720),
('rss_paros', 'Google Noticias RSS - Paros y bloqueos viales', 'noticia', 6),
('rss_clima', 'Google Noticias RSS - El Niño e incendios (IDEAM/UNGRD)', 'noticia', 6),
('rss_energia', 'Google Noticias RSS - Energía y racionamiento', 'noticia', 6),
('rss_norma_empaques', 'Google Noticias RSS - Normas empaques y residuos', 'noticia', 6),
('rss_norma_laboral', 'Google Noticias RSS - Reforma tributaria y laboral', 'noticia', 6)
ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    tipo = EXCLUDED.tipo,
    frecuencia_horas = EXCLUDED.frecuencia_horas;

-- 3. Indicadores Macroeconómicos
INSERT INTO public.indicadores (codigo, nombre, unidad) VALUES
('TRM', 'Tasa Representativa del Mercado', 'COP/USD'),
('IPC', 'Inflación Anual (IPC)', '%'),
('TASA_BANREP', 'Tasa de Intervención BanRep', '%')
ON CONFLICT (codigo) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    unidad = EXCLUDED.unidad;

-- 4. Valores Históricos de Indicadores Respaldados por Fuentes Verificables
INSERT INTO public.valores_indicador (indicador_codigo, fecha, valor, fuente) VALUES
-- TRM verificada en Análisis PESTEL (Octubre 2026 y cierre Septiembre)
('TRM', '2026-10-15', 3197.65, 'Superfinanciera / Noticias Caracol'),
('TRM', '2026-10-14', 3185.30, 'Superfinanciera'),
('TRM', '2026-10-13', 3178.90, 'Superfinanciera'),
('TRM', '2026-10-10', 3195.40, 'Superfinanciera'),
('TRM', '2026-10-09', 3205.10, 'Superfinanciera / Dólar Hoy'),
('TRM', '2026-09-25', 3454.65, 'Superfinanciera / Vanguardia'),
('TRM', '2026-09-14', 3197.00, 'Superfinanciera'),
-- IPC verificado en Análisis PESTEL (Septiembre 2026)
('IPC', '2026-09-30', 6.29, 'DANE / Portafolio'),
-- Tasa de Intervención BanRep verificada en Análisis PESTEL (Septiembre 2026)
('TASA_BANREP', '2026-09-30', 12.25, 'Banco de la República / Vanguardia')
ON CONFLICT (indicador_codigo, fecha) DO UPDATE SET
    valor = EXCLUDED.valor,
    fuente = EXCLUDED.fuente;

-- 5. Los 27 Hallazgos Base del Análisis PESTEL de Smurfit Westrock Colombia
-- Todos con origen 'base', estado 'validada' y áreas canónicas estrictas
INSERT INTO public.alertas (
    titulo, resumen, enlace, fuente, fecha_publicacion,
    factor, area, tipo_evento, probabilidad, impacto,
    puntaje, nivel, prioritaria, estado, decision, origen, explicacion
) VALUES
-- FACTOR POLÍTICO (3 hallazgos)
(
    'CUT y Fecode marcharon y preparan paro nacional para noviembre',
    'La CUT y Fecode marcharon el 14 de octubre contra el gobierno y preparan un paro nacional para noviembre (11 o 20 de noviembre). El Decreto 1525 del 13 de octubre fijó nuevas reglas de actuación policial en protestas.',
    'https://www.vanguardia.com/colombia/2026/09/16/fecode-anuncia-movilizaciones-contra-de-la-espriella-y-prepara-un-paro-nacional-en-noviembre/',
    'Vanguardia / Publimetro', '2026-10-14',
    'Político', 'Operaciones y logística', 'paro_bloqueo', 4, 3, 12, 'Medio', false, 'validada', 'pendiente', 'base',
    'Riesgo de bloqueos o cierres de vías que retrasen despachos desde Yumbo y el abastecimiento de madera y papel recuperado.'
),
(
    'Arancel de 12,5% de EE. UU. a productos colombianos',
    'Estados Unidos aplica un arancel de 12,5 % a productos colombianos desde julio; Donald Trump indicó que podría retirarlo, pero no hay decisión oficial confirmada. Afecta a floricultura, confecciones, calzado y alimentos.',
    'https://www.vanguardia.com/mundo/2026/10/12/trump-abre-la-puerta-a-retirar-los-aranceles-a-colombia-puede-que-lo-haga/',
    'Vanguardia / Portafolio', '2026-10-12',
    'Político', 'Comercial', 'otro', 4, 2, 8, 'Medio', false, 'validada', 'pendiente', 'base',
    'Menor demanda de empaques y cajas de clientes exportadores en floricultura y alimentos; mejora si se retira el arancel.'
),
(
    'Nuevo gobierno promete respetar independencia de BanRep y reforma estructural',
    'El nuevo gobierno promete respetar la independencia del Banco de la República y una reforma tributaria estructural con reducción de trámites.',
    'https://www.elespectador.com/economia/las-cuatro-claves-de-la-agenda-economica-de-de-la-espriella/',
    'El Espectador', '2026-10-08',
    'Político', 'Planeación y sostenibilidad', 'otro', 3, 2, 6, 'Bajo', false, 'validada', 'pendiente', 'base',
    'Señal de continuidad institucional monetaria; la incertidumbre se concentra en el contenido específico de la reforma tributaria.'
),

-- FACTOR ECONÓMICO (6 hallazgos)
(
    'TRM se ubica en $3.197,65 con volatilidad reciente en el mercado cambiario',
    'La TRM fue de $3.197,65 el 15 de octubre y al 9 de octubre acumulaba una caída cercana al 14 % frente al inicio de año. Aun así subió $257 en nueve sesiones entre el 14 y el 25 de septiembre.',
    'https://www.noticiascaracol.com/economia/dolar-hoy-15-de-octubre-de-2026-asi-esta-la-trm-este-jueves-so35',
    'Noticias Caracol / Dólar Hoy', '2026-10-15',
    'Económico', 'Compras y finanzas', 'tasa_cambio', 4, 3, 12, 'Medio', false, 'validada', 'pendiente', 'base',
    'Insumos y maquinaria importada más baratos en pesos, pero ingresos de exportación menores y mayor presión de papel importado.'
),
(
    'Inflación anual en 6,29% y tasa del Banco de la República sube a 12,25%',
    'La inflación anual fue 6,29 % en septiembre, la más alta desde julio de 2024. El Banco de la República subió la tasa de intervención a 12,25 % el 30 de septiembre.',
    'https://www.portafolio.co/economia/finanzas/inflacion-en-colombia-sigue-subiendo-se-ubico-en-6-29-en-septiembre-de-504077',
    'Portafolio / Vanguardia', '2026-09-30',
    'Económico', 'Compras y finanzas', 'otro', 5, 3, 15, 'Alto', true, 'validada', 'pendiente', 'base',
    'Mayor costo financiero de deuda en pesos, insumos y transporte; presión para trasladar costos a precios de venta.'
),
(
    'FMI proyecta crecimiento de 2,2% en 2026 con desempleo de 9%',
    'El Fondo Monetario Internacional proyecta un crecimiento de 2,2 % en 2026 y 2,3 % en 2027 para Colombia, con desempleo de 9 % y 10 % e inflación persistente.',
    'https://www.vanguardia.com/economia/2026/10/13/fmi-economia-colombiana-crecera-lento-inflacion-y-desempleo-preocupan/',
    'Vanguardia / FMI', '2026-10-13',
    'Económico', 'Planeación y sostenibilidad', 'otro', 4, 3, 12, 'Medio', false, 'validada', 'pendiente', 'base',
    'La demanda de corrugados y cajas depende fuertemente del consumo de hogares y la actividad manufacturera, con avance moderado.'
),
(
    'Concertación del salario mínimo 2027 con propuestas de 8% a 10%',
    'El salario mínimo de 2026 es de $1.750.905. Gremios y analistas proponen un aumento de entre 8 % y 10 % para 2027 tras la aceleración de la inflación de septiembre.',
    'https://www.elpais.com.co/economia/salario-minimo-para-el-2027-en-colombia-cuanto-podria-ser-el-incremento-y-cuales-son-los-escenarios-1058.html',
    'El País / Portafolio', '2026-10-11',
    'Económico', 'Talento humano', 'norma_laboral_tributaria', 5, 2, 10, 'Medio', false, 'validada', 'pendiente', 'base',
    'Presión sobre la escala salarial y sobre los contratos de servicios tercerizados ajustados al salario mínimo.'
),
(
    'Alza de tarifas eléctricas y parque térmico a 100 GWh diarios por sequía',
    'XM pidió al parque térmico generar 100 GWh diarios durante 10 meses por déficit hídrico. El Ministerio de Minas y Energía anticipó alzas tarifarias en los recibos.',
    'https://www.larepublica.co/economia/las-regiones-en-donde-mas-subira-el-precio-de-la-energia-por-la-exposicion-en-bolsa-4500704',
    'La República / Portafolio', '2026-10-09',
    'Económico', 'Operaciones y logística', 'energia_racionamiento', 4, 4, 16, 'Alto', true, 'validada', 'pendiente', 'base',
    'Mayor costo de energía en pulpa y papel, procesos altamente intensivos. La caldera de biomasa de Yumbo mitiga la exposición.'
),
(
    'Comité Autónomo de la Regla Fiscal estima déficit de 7,4% del PIB',
    'El CARF estima un déficit de 7,4 % del PIB y deuda neta de 61 % en 2026, presionando la sostenibilidad de las finanzas públicas.',
    'https://www.elespectador.com/economia/las-cuatro-claves-de-la-agenda-economica-de-de-la-espriella/#regla-fiscal',
    'El Espectador / CARF', '2026-10-07',
    'Económico', 'Compras y finanzas', 'otro', 4, 2, 8, 'Medio', false, 'validada', 'pendiente', 'base',
    'Presión sobre tasas de interés locales y mayor probabilidad de ajustes tributarios para cubrir el faltante presupuestal.'
),

-- FACTOR SOCIAL (4 hallazgos)
(
    'Desempleo manufacturero e inflación de alimentos en 6,74% anual',
    'Titular reporta desempleo nacional de 9,4 % en agosto con 126.000 empleos manufactureros perdidos. La inflación de alimentos alcanzó 6,74 % anual.',
    'https://abceconomia.co/Etiquetas/industria-manufacturera/',
    'ABC Economía / INCP / DANE', '2026-09-15',
    'Social', 'Comercial', 'otro', 4, 3, 12, 'Medio', false, 'validada', 'pendiente', 'base',
    'Menor poder de compra de los hogares y menor consumo de bienes empacados masivos (alimentos, bebidas, manufactura).'
),
(
    'Afectaciones por terremoto del 10 de agosto en Valle del Cauca y suroccidente',
    'El sismo del 10 de agosto dejó daños en 472 municipios de 15 departamentos; Chocó, Caldas, Risaralda, Quindío, Cauca y Valle del Cauca fueron los más afectados.',
    'https://www.paho.org/sites/default/files/2026/08/phsa-colombia-terremoto-2026-es.pdf',
    'OPS / UNGRD', '2026-08-15',
    'Social', 'Talento humano', 'otro', 3, 2, 6, 'Bajo', false, 'validada', 'pendiente', 'base',
    'Efectos en trabajadores, familias y comunidades vecinas a la planta de Yumbo y zonas de plantaciones forestales.'
),
(
    'Oportunidad de e-commerce y empaques personalizados para pymes',
    'Smurfit Westrock prepara plataforma de e-commerce para adquirir empaques corrugados personalizados en tirajes cortos con tecnología de impresión digital.',
    'https://www.valoraanalitik.com/?p=584141#ecommerce-digital',
    'Valora Analitik', '2026-06-18',
    'Social', 'Comercial', 'otro', 4, 3, 12, 'Medio', false, 'validada', 'pendiente', 'base',
    'Oportunidad comercial ante el auge de compras en línea y necesidades de empaque ágil para pymes y emprendimientos.'
),
(
    'Smurfit recicló 229.049 toneladas de papel y cartón en 2025',
    'Smurfit Westrock se consolidó como el mayor reciclador de papel y cartón de Colombia al procesar 229.049 toneladas en más de 40 municipios; los hogares generan el 40 % de residuos.',
    'https://www.elpais.com.co/economia/smurtfit-westrock-le-apuesta-a-la-innovacion-desde-el-valle-del-cauca-2707.html',
    'El País / Portafolio', '2026-07-22',
    'Social', 'Operaciones y logística', 'norma_ambiental_empaques', 4, 3, 12, 'Medio', false, 'validada', 'pendiente', 'base',
    'El suministro continuo de fibra secundaria depende de la separación en la fuente y la red de recicladores de oficio.'
),

-- FACTOR TECNOLÓGICO (4 hallazgos)
(
    'Trámite del proyecto de ley de IA 025 y adopción de copiloto de inventarios',
    'El proyecto de ley 025 de 2026 sobre IA avanza en el Congreso. Smurfit Westrock ya utiliza copiloto de IA con Process Intelligence para optimizar gestión de inventarios.',
    'https://ppulegal.com/?p=33310#ley-ia-025',
    'PPU / Business Wire', '2026-08-20',
    'Tecnológico', 'Planeación y sostenibilidad', 'otro', 4, 3, 12, 'Medio', false, 'validada', 'pendiente', 'base',
    'Oportunidad de aplicar IA a compras, inventarios y monitoreo de riesgos del entorno; marco normativo aún en definición.'
),
(
    'Automatización de turnos y procesos ante reducción de jornada laboral',
    'La reducción a 42 horas y el alza de recargos nocturnos/dominicales impulsan la automatización de procesos repetitivos y rediseño de turnos en plantas industriales.',
    'https://www.asuntoslegales.com.co/analisis/daniel-acevedo-4432158/42-horas-por-que-trabajar-menos-puede-costar-mas-4436733',
    'Asuntos Legales', '2026-07-25',
    'Tecnológico', 'Operaciones y logística', 'norma_laboral_tributaria', 4, 3, 12, 'Medio', false, 'validada', 'pendiente', 'base',
    'Presión positiva para automatizar tareas operativas de planta y optimizar la productividad por hora trabajada.'
),
(
    'Plataforma de impresión digital y empaques bajo demanda para pymes',
    'Lanzamiento de plataforma de e-commerce e impresión digital de cajas que reduce plazos de entrega y costos fijos de clichés para clientes pyme.',
    'https://www.valoraanalitik.com/?p=584141#plataforma-impresion',
    'Valora Analitik', '2026-06-25',
    'Tecnológico', 'Comercial', 'otro', 4, 3, 12, 'Medio', false, 'validada', 'pendiente', 'base',
    'Nuevo canal de ingresos digitales que requiere integración fluida entre ventas web, planta corrugadora y distribución.'
),
(
    'Inversión de US$115,5M en caldera de biomasa en planta de Yumbo',
    'La caldera de biomasa de Yumbo eleva la energía renovable de la planta papelera hasta el 80% y reduce hasta un 66% las emisiones directas.',
    'https://www.portafolio.co/sostenibilidad/las-100-de-la-sostenibilidad-2026-smurfit-westrock-convierte-papel-y-carton-en-energia-renovable-500750',
    'Portafolio', '2026-07-10',
    'Tecnológico', 'Operaciones y logística', 'energia_racionamiento', 3, 3, 9, 'Medio', false, 'validada', 'pendiente', 'base',
    'Menor vulnerabilidad frente al precio del gas natural y a las compras de energía eléctrica en bolsa.'
),

-- FACTOR ECOLÓGICO (5 hallazgos)
(
    'IDEAM declara fenómeno de El Niño con intensidad fuerte a muy fuerte',
    'El IDEAM declaró oficialmente El Niño con probabilidad del 83 % de extenderse hasta marzo de 2027. Se esperan lluvias bajo lo normal y déficit crítico en caudales de ríos.',
    'https://www.bluradio.com/nacion/de-la-espriella-fija-el-31-de-diciembre-como-fecha-limite-para-evitar-apagon-en-colombia-cb20',
    'Blu Radio / Diario Las Américas / IDEAM', '2026-10-08',
    'Ecológico', 'Forestal', 'clima_incendio', 5, 4, 20, 'Alto', true, 'validada', 'pendiente', 'base',
    'Menor disponibilidad de agua para procesos de pulpa y papel, calor extremo y encarecimiento del suministro eléctrico.'
),
(
    'Incendios forestales consumen 76.000 ha y declaran calamidad en Tolima',
    'A comienzos de agosto había 22 incendios activos en 7 departamentos; expertos pronostican pico de incendios forestales para el segundo semestre de 2027 por El Niño.',
    'https://www.diariolasamericas.com/el-nino-agrava-la-sequia-y-aumenta-el-riesgo-mas-incendios-colombia-n3338152',
    'Diario Las Américas / Mongabay', '2026-08-12',
    'Ecológico', 'Forestal', 'clima_incendio', 4, 5, 20, 'Alto', true, 'validada', 'pendiente', 'base',
    'Riesgo crítico directo sobre las 67.700 ha de plantaciones forestales certificadas en el suroccidente y sobre vías forestales.'
),
(
    'Gobierno fija 31 de diciembre como plazo para medidas contra apagón',
    'El Gobierno Nacional fijó el 31 de diciembre para tener listas las medidas preventivas ante estrés hídrico de embalses y riesgo de racionamiento eléctrico nacional.',
    'https://www.portafolio.co/economia/gobierno/gobierno-pone-fecha-limite-para-evitar-un-apagon-en-colombia-medidas-deberan-estar-listas-en-diciembre-504352',
    'Portafolio / Primicias', '2026-10-05',
    'Ecológico', 'Operaciones y logística', 'energia_racionamiento', 3, 5, 15, 'Alto', true, 'validada', 'pendiente', 'base',
    'Riesgo de restricciones o paradas operacionales en planta papelera si se decretan cortes industriales obligatorios.'
),
(
    'Réplicas de sismo de 7,4 con epicentro en San Juan del Palmar',
    'El sismo de magnitud 7,4 del 10 de agosto en Chocó y réplicas de más de 5,0 afectaron infraestructura vial e industrial en el Valle del Cauca y Eje Cafetero.',
    'https://www.paho.org/es/documentos/informe-situacion-1-colombia-terremoto-agosto-2026-10-agosto-2026',
    'OPS / El Comercio', '2026-08-26',
    'Ecológico', 'Operaciones y logística', 'otro', 2, 4, 8, 'Medio', false, 'validada', 'pendiente', 'base',
    'Riesgo de afectaciones estructurales en instalaciones de Yumbo y red vial de despacho en el Valle del Cauca.'
),
(
    'Alertas de IDEAM por crecientes súbitas e inundaciones puntuales',
    'Pese al déficit hídrico de fondo de El Niño, el IDEAM advierte sobre tormentas convectivas y crecientes súbitas en cuencas de la región Pacífica y Andina.',
    'https://www.portafolio.co/economia/gobierno/ideam-confirma-oficialmente-presencia-del-fenomeno-de-el-nino-en-colombia-con-intensidad-entre-fuerte-y-muy-fuerte-504147',
    'Portafolio / IDEAM', '2026-10-10',
    'Ecológico', 'Forestal', 'clima_incendio', 3, 3, 9, 'Medio', false, 'validada', 'pendiente', 'base',
    'Cortes temporales en caminos forestales e interrupción de transporte de madera hacia la planta papelera.'
),

-- FACTOR LEGAL (5 hallazgos)
(
    'Jornada laboral baja a 42 horas y recargo dominical sube a 90%',
    'Desde el 15 de julio de 2026 rige la jornada semanal máxima de 42 horas. El recargo dominical y festivo subió al 90 % el 1 de julio y el nocturno rige desde las 7 p.m.',
    'https://www.portafolio.co/economia/empleo/la-nueva-jornada-laboral-en-colombia-y-sus-implicaciones-499195',
    'Portafolio / Ofima', '2026-07-16',
    'Legal', 'Talento humano', 'norma_laboral_tributaria', 5, 4, 20, 'Alto', true, 'validada', 'pendiente', 'base',
    'Mayor costo de nómina en procesos continuos de fabricación de papel que operan 24/7; obliga a rediseñar cuadrillas y turnos.'
),
(
    'Resolución 1407 y 0803 exigen metas de aprovechamiento de envases y empaques',
    'La normativa exige a fabricantes y distribuidores presentar planes de gestión ambiental de residuos de empaques, con metas progresivas de recolección y reciclaje.',
    'https://www.asuntoslegales.com.co/consultorio/nueva-regulacion-de-la-gestion-ambiental-de-envases-y-empaques-2765742',
    'Asuntos Legales / Invima', '2026-06-30',
    'Legal', 'Jurídico y ambiental', 'norma_ambiental_empaques', 4, 3, 12, 'Medio', false, 'validada', 'pendiente', 'base',
    'Oportunidad para el portafolio de cartón corrugado 100% reciclable y trazable; demanda de clientes para acreditar cumplimiento.'
),
(
    'Reforma tributaria radicada y anuncio de reforma estructural con rescate fiscal',
    'El anterior gobierno radicó reforma tributaria por $21,9 billones. La nueva administración anunció reforma estructural eliminando impuesto al patrimonio pero con presupuesto de $634B.',
    'https://accounter.co/noticias/editorial/radicada-la-reforma-tributaria-2026-219-billones-en-juego-un-congreso-recien-instalado-y-un-gobierno-que-se-despide-en-dieciocho-dias',
    'Accounter / La Silla Vacía / Portafolio', '2026-07-28',
    'Legal', 'Compras y finanzas', 'norma_laboral_tributaria', 4, 3, 12, 'Medio', false, 'validada', 'pendiente', 'base',
    'Incertidumbre en planeación fiscal, tarifas corporativas de renta y beneficios tributarios por inversiones ambientales.'
),
(
    'Plan gubernamental Energía Ya y hoja de ruta de 50 acciones por El Niño',
    'El Gobierno ejecuta el plan Energía Ya para regular ahorro de energía y agua en industrias e implementa hoja de ruta de 50 acciones para contingencia hídrica.',
    'https://www.primicias.ec/internacional/colombia-medidas-cortes-luz-apagon-electrico-fenomeno-nino-espriella-134926/',
    'Primicias / Portafolio', '2026-10-06',
    'Legal', 'Jurídico y ambiental', 'energia_racionamiento', 3, 3, 9, 'Medio', false, 'validada', 'pendiente', 'base',
    'Vigilar decretos y resoluciones de la CREG o MinMinas por posibles metas obligatorias de ahorro o cobros por exceso de consumo.'
),
(
    'Proyecto de ley 025 de 2026 sobre gobernanza y uso de IA en Colombia',
    'Continúa el trámite del proyecto de ley 025 para regular sistemas de IA, responsabilidades por decisiones automatizadas y derechos de propiedad intelectual.',
    'https://ppulegal.com/?p=33310#tramite-ley-ia-025',
    'PPU Legal', '2026-09-02',
    'Legal', 'Jurídico y ambiental', 'otro', 3, 2, 6, 'Bajo', false, 'validada', 'pendiente', 'base',
    'Sin obligaciones inmediatas; monitorear exigencias de transparencia si se integran algoritmos de IA en decisiones comerciales o de producción.'
)
ON CONFLICT (enlace) DO UPDATE SET
    titulo = EXCLUDED.titulo,
    resumen = EXCLUDED.resumen,
    probabilidad = EXCLUDED.probabilidad,
    impacto = EXCLUDED.impacto,
    puntaje = EXCLUDED.puntaje,
    nivel = EXCLUDED.nivel,
    prioritaria = EXCLUDED.prioritaria;

-- 6. Registros de Ejecución Iniciales para el Centro de Actualizaciones
INSERT INTO public.ejecuciones (flujo, fuente, inicio, fin, estado, registros_nuevos, mensaje_error) VALUES
('Flujo 1: Indicadores', 'Superfinanciera TRM', timezone('utc'::text, '2026-10-15 11:00:00'::timestamptz), timezone('utc'::text, '2026-10-15 11:00:08'::timestamptz), 'ok', 1, NULL),
('Flujo 2: Noticias', 'Google News RSS (5 temas)', timezone('utc'::text, '2026-10-15 06:00:00'::timestamptz), timezone('utc'::text, '2026-10-15 06:01:24'::timestamptz), 'ok', 5, NULL),
('Flujo 2: Noticias', 'Google News RSS (5 temas)', timezone('utc'::text, '2026-10-14 18:00:00'::timestamptz), timezone('utc'::text, '2026-10-14 18:01:10'::timestamptz), 'ok', 3, NULL);
