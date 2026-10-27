import React, { useEffect, useState } from 'react';
import {
  Compass,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Calendar,
  Building
} from 'lucide-react';
import { getAlertas } from '../lib/dataService';
import { useAuth } from '../lib/authContext';
import { FACTORES } from '../lib/catalogos';
import { formatearFechaPublicacion } from '../lib/fechas';
import { calcularPuntaje, normalizarValorEscala } from '../lib/puntaje';
import NivelBadge from '../components/NivelBadge';
import OrigenBadge from '../components/OrigenBadge';

const ESTILOS_FACTOR = {
  Político: { inicial: 'P', color: '#102A56', activo: 'border-blue-500 ring-2 ring-blue-500/20' },
  Económico: { inicial: 'E', color: '#174A8B', activo: 'border-blue-500 ring-2 ring-blue-500/20' },
  Social: { inicial: 'S', color: '#2166B1', activo: 'border-blue-500 ring-2 ring-blue-500/20' },
  Tecnológico: { inicial: 'T', color: '#347FC4', activo: 'border-blue-500 ring-2 ring-blue-500/20' },
  Ecológico: { inicial: 'E', color: '#579DDA', activo: 'border-blue-500 ring-2 ring-blue-500/20' },
  Legal: { inicial: 'L', color: '#82B9E8', activo: 'border-blue-500 ring-2 ring-blue-500/20' }
};

export default function AnalisisPestel() {
  const { empresa, empresaId, sector } = useAuth();
  const [alertas, setAlertas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [factorActivo, setFactorActivo] = useState('Ecológico'); // Factor de mayor riesgo inicial

  useEffect(() => {
    async function cargar() {
      setCargando(true);
      setError('');
      try {
        const { data } = await getAlertas(empresaId);
        setAlertas(data);
      } catch (loadError) {
        setError(loadError.message);
        setAlertas([]);
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, [empresaId]);

  // Calcular métricas por factor
  const metricasPorFactor = FACTORES.map((factor) => {
    const alertasDelFactor = alertas.filter(
      (a) => a.factor === factor && a.estado === 'validada'
    );
    const maxPuntaje = alertasDelFactor.length > 0
      ? Math.max(...alertasDelFactor.map((a) => a.puntaje))
      : 0;

    let nivel = 'Bajo';
    if (maxPuntaje >= 15) nivel = 'Alto';
    else if (maxPuntaje >= 8) nivel = 'Medio';

    const ordenadasPorFecha = [...alertasDelFactor].sort(
      (a, b) => new Date(b.fecha_publicacion).getTime() - new Date(a.fecha_publicacion).getTime()
    );
    const mitad = Math.ceil(ordenadasPorFecha.length / 2);
    const recientes = ordenadasPorFecha.slice(0, mitad);
    const anteriores = ordenadasPorFecha.slice(mitad);
    const promedio = (items) => items.length
      ? items.reduce((suma, alerta) => suma + Number(alerta.puntaje || 0), 0) / items.length
      : 0;
    const diferencia = promedio(recientes) - promedio(anteriores);
    const tendencia = anteriores.length === 0 || Math.abs(diferencia) < 0.5
      ? 'estable'
      : diferencia > 0 ? 'sube' : 'baja';
    const explicacionTendencia = !alertasDelFactor.length
      ? 'No hay alertas validadas de este factor para calcular una tendencia.'
      : anteriores.length === 0
      ? `Hay ${alertasDelFactor.length} alerta(s) registrada(s); se requieren más registros para comparar la evolución.`
      : `El puntaje promedio de las ${recientes.length} alertas más recientes es ${promedio(recientes).toFixed(1)}, frente a ${promedio(anteriores).toFixed(1)} en las anteriores.`;

    return {
      factor,
      total: alertasDelFactor.length,
      maxPuntaje,
      nivel,
      tendencia,
      explicacionTendencia,
      alertas: alertasDelFactor
    };
  });

  const datosFactorSeleccionado = metricasPorFactor.find(
    (m) => m.factor === factorActivo
  ) || metricasPorFactor[0];

  if (cargando) {
    return <div className="p-12 text-center text-sm text-slate-500">Cargando análisis de la empresa…</div>;
  }

  if (error) {
    return <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>;
  }

  const renderIconoTendencia = (tendencia) => {
    if (tendencia === 'sube') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
          <TrendingUp className="w-3.5 h-3.5" />
          Sube (Riesgo al alza)
        </span>
      );
    }
    if (tendencia === 'baja') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
          <TrendingDown className="w-3.5 h-3.5" />
          Baja
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
        <Minus className="w-3.5 h-3.5" />
        Estable
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="border-b border-slate-200 pb-5">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Matriz de Análisis PESTEL
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Estructura del entorno macro y micro para <strong>{empresa}</strong> &bull; Sector: {sector}.
        </p>
      </div>

      {/* Selector de Pestañas de los 6 Factores */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {metricasPorFactor.map((m) => {
          const esActivo = m.factor === factorActivo;
          const estiloFactor = ESTILOS_FACTOR[m.factor];
          return (
            <button
              key={m.factor}
              onClick={() => setFactorActivo(m.factor)}
              className={`rounded-lg border text-left transition-all flex overflow-hidden min-h-[96px] ${
                esActivo
                  ? `bg-white ${estiloFactor.activo} shadow-sm`
                  : 'bg-white/80 border-slate-200 hover:border-slate-300 hover:bg-white'
              }`}
            >
              <span
                className="w-1/3 shrink-0 flex items-center justify-center text-6xl font-black text-white"
                style={{ backgroundColor: estiloFactor.color }}
              >
                {estiloFactor.inicial}
              </span>
              <div className="flex-1 min-w-0 p-3 flex flex-col justify-between gap-2">
                <div>
                  <span className="block text-xs font-bold text-slate-700">
                    {m.factor}
                  </span>
                  <NivelBadge nivel={m.nivel} puntaje={m.maxPuntaje} size="sm" />
                </div>
                <span className="text-[11px] text-slate-500">
                  {m.total} hallazgo(s)
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Detalle del Factor Seleccionado */}
      {datosFactorSeleccionado && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 space-y-6">
          {/* Cabecera del Factor */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Factor de Análisis
                </span>
                <span className="text-xs text-slate-400">&bull;</span>
                <span className="text-xs text-slate-600">Horizonte 12 meses</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                Factor {datosFactorSeleccionado.factor}
              </h3>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500">Nivel Máximo:</span>
                <NivelBadge nivel={datosFactorSeleccionado.nivel} puntaje={datosFactorSeleccionado.maxPuntaje} />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500">Tendencia:</span>
                {renderIconoTendencia(datosFactorSeleccionado.tendencia)}
              </div>
            </div>
          </div>

          {/* Justificación de la Tendencia */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-xs text-slate-700 flex items-start gap-2.5">
            <Compass className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900">Lectura prospectiva del factor: </strong>
              <span>{datosFactorSeleccionado.explicacionTendencia}</span>
            </div>
          </div>

          {/* Listado de Hallazgos y Alertas del Factor */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Hallazgos Registrados en este Factor ({datosFactorSeleccionado.alertas.length})
            </h4>

            <div className="grid grid-cols-1 gap-4">
              {datosFactorSeleccionado.alertas.map((alerta) => {
                const probabilidad = normalizarValorEscala(alerta.probabilidad);
                const impacto = normalizarValorEscala(alerta.impacto);
                const calificacion = probabilidad !== null && impacto !== null
                  ? calcularPuntaje(probabilidad, impacto)
                  : null;

                return (
                  <div
                    key={alerta.id}
                    className="p-5 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors bg-white"
                  >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <OrigenBadge origen={alerta.origen} />
                        <span className="text-xs font-medium text-slate-600">
                          Área: <strong className="text-slate-800">{alerta.area}</strong>
                        </span>
                        <span className="text-slate-300">&bull;</span>
                        <span className="text-xs text-slate-500">
                          Tipo: <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">{alerta.tipo_evento}</code>
                        </span>
                      </div>

                      <h5 className="text-sm font-bold text-slate-900 leading-snug">
                        {alerta.titulo}
                      </h5>

                      <p className="text-xs text-slate-700 mt-2 leading-relaxed">
                        {alerta.resumen}
                      </p>

                      <div className="mt-3 bg-slate-50 p-3 rounded border border-slate-100 text-xs">
                        <span className="font-semibold text-slate-800">Impacto inferido en {empresa}: </span>
                        <span className="text-slate-600">{alerta.explicacion}</span>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          Fecha: <strong className="text-slate-700">{formatearFechaPublicacion(alerta.fecha_publicacion)}</strong>
                        </span>
                        <span>
                          Fuente: <strong className="text-slate-700">{alerta.fuente}</strong>
                        </span>
                        {alerta.enlace && (
                          <a
                            href={alerta.enlace}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium ml-auto"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Fuente externa
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="sm:text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between gap-2 border-t sm:border-t-0 pt-2 sm:pt-0">
                      {calificacion ? (
                        <NivelBadge nivel={calificacion.nivel} puntaje={calificacion.puntaje} />
                      ) : (
                        <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          Sin calificar
                        </span>
                      )}
                      <div className="space-y-1 text-xs text-slate-600 text-right">
                        <div>
                          Probabilidad:{' '}
                          <strong className="text-slate-800">
                            {probabilidad ?? 'Sin asignar'}
                            {probabilidad !== null && ' / 5'}
                          </strong>
                        </div>
                        <div>
                          Impacto:{' '}
                          <strong className="text-slate-800">
                            {impacto ?? 'Sin asignar'}
                            {impacto !== null && ' / 5'}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
