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
import { FACTORES } from '../lib/catalogos';
import NivelBadge from '../components/NivelBadge';
import OrigenBadge from '../components/OrigenBadge';

// Tendencias basales documentadas en el análisis PESTEL oficial (Octubre 2026)
const TENDENCIAS_BASE = {
  Político: { tendencia: 'sube', explicacion: 'Paro nacional de noviembre convocado y arancel de 12,5% de EE.UU.' },
  Económico: { tendencia: 'sube', explicacion: 'Alzas en energía, inflación acumulada de 6,29% y tasa BanRep en 12,25%.' },
  Social: { tendencia: 'estable', explicacion: 'Menor poder adquisitivo compensado por expansión de e-commerce y reciclaje.' },
  Tecnológico: { tendencia: 'sube', explicacion: 'Aceleración de IA y automatización para absorber sobrecostos de nómina.' },
  Ecológico: { tendencia: 'sube', explicacion: 'El Niño con intensidad fuerte a muy fuerte; sequía y pico de incendios.' },
  Legal: { tendencia: 'sube', explicacion: 'Jornada reducida a 42h, recargos dominicales al 90% y reforma tributaria.' }
};

export default function AnalisisPestel() {
  const [alertas, setAlertas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [factorActivo, setFactorActivo] = useState('Ecológico'); // Factor de mayor riesgo inicial

  useEffect(() => {
    async function cargar() {
      setCargando(true);
      const { data } = await getAlertas();
      setAlertas(data || []);
      setCargando(false);
    }
    cargar();
  }, []);

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

    const infoTendencia = TENDENCIAS_BASE[factor] || { tendencia: 'estable', explicacion: '' };

    return {
      factor,
      total: alertasDelFactor.length,
      maxPuntaje,
      nivel,
      tendencia: infoTendencia.tendencia,
      explicacionTendencia: infoTendencia.explicacion,
      alertas: alertasDelFactor
    };
  });

  const datosFactorSeleccionado = metricasPorFactor.find(
    (m) => m.factor === factorActivo
  ) || metricasPorFactor[0];

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
          Estructura del entorno macro y micro para Smurfit Westrock Colombia (cadena bosque &rarr; planta Yumbo &rarr; empaque).
        </p>
      </div>

      {/* Selector de Pestañas de los 6 Factores */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {metricasPorFactor.map((m) => {
          const esActivo = m.factor === factorActivo;
          return (
            <button
              key={m.factor}
              onClick={() => setFactorActivo(m.factor)}
              className={`p-3.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                esActivo
                  ? 'bg-white border-blue-600 ring-2 ring-blue-500/20 shadow-sm'
                  : 'bg-white/80 border-slate-200 hover:border-slate-300 hover:bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-bold ${esActivo ? 'text-blue-700' : 'text-slate-700'}`}>
                  {m.factor}
                </span>
                <NivelBadge nivel={m.nivel} puntaje={m.maxPuntaje} size="sm" />
              </div>
              <span className="text-[11px] text-slate-500">
                {m.total} hallazgo(s)
              </span>
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
              {datosFactorSeleccionado.alertas.map((alerta) => (
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
                        <span className="font-semibold text-slate-800">Impacto inferido en Smurfit: </span>
                        <span className="text-slate-600">{alerta.explicacion}</span>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          Fecha: <strong className="text-slate-700">{alerta.fecha_publicacion}</strong>
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
                      <NivelBadge nivel={alerta.nivel} puntaje={alerta.puntaje} />
                      <div className="text-[11px] text-slate-500">
                        P: <strong>{alerta.probabilidad}</strong> &times; I: <strong>{alerta.impacto}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
