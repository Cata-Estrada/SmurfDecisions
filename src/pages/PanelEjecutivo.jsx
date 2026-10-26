import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  Clock,
  ShieldAlert,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { getAlertas, getValoresIndicadores } from '../lib/dataService';
import { useAuth } from '../lib/authContext';
import { FACTORES } from '../lib/catalogos';
import IndicadorCard from '../components/IndicadorCard';
import NivelBadge from '../components/NivelBadge';
import OrigenBadge from '../components/OrigenBadge';

export default function PanelEjecutivo() {
  const { empresaId } = useAuth();
  const [indicadores, setIndicadores] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function cargarDatos() {
      setCargando(true);
      setError('');
      try {
        const [resAlertas, resIndicadores] = await Promise.all([
          getAlertas(empresaId),
          getValoresIndicadores(empresaId)
        ]);
        setAlertas(resAlertas.data);
        setIndicadores(resIndicadores.data);
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setCargando(false);
      }
    }
    cargarDatos();
  }, [empresaId]);

  // Filtrar solo alertas validadas para el cálculo ejecutivo
  const alertasValidadas = alertas.filter((a) => a.estado === 'validada');

  // Alertas prioritarias (puntaje >= 15)
  const alertasPrioritarias = alertasValidadas
    .filter((a) => a.puntaje >= 15)
    .sort((a, b) => b.puntaje - a.puntaje);

  // Decisiones pendientes en el recomendador
  const decisionesPendientes = alertasValidadas.filter(
    (a) => a.decision === 'pendiente'
  );

  // Calcular nivel por factor: mayor puntaje entre alertas validadas del factor
  const resumenFactores = FACTORES.map((factor) => {
    const alertasDelFactor = alertasValidadas.filter((a) => a.factor === factor);
    const maxPuntaje = alertasDelFactor.length > 0
      ? Math.max(...alertasDelFactor.map((a) => a.puntaje))
      : 0;

    let nivel = 'Bajo';
    if (maxPuntaje >= 15) nivel = 'Alto';
    else if (maxPuntaje >= 8) nivel = 'Medio';

    return {
      factor,
      totalAlertas: alertasDelFactor.length,
      maxPuntaje,
      nivel
    };
  });

  // Extraer últimos valores de indicadores
  const trm = indicadores.find((i) => i.indicador_codigo === 'TRM');
  const ipc = indicadores.find((i) => i.indicador_codigo === 'IPC');
  const banrep = indicadores.find((i) => i.indicador_codigo === 'TASA_BANREP');

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 text-sm">
        <Clock className="w-5 h-5 animate-spin mr-2" />
        Cargando indicadores y alertas del entorno...
      </div>
    );
  }

  if (error) {
    return <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>;
  }

  return (
    <div className="space-y-8">
      {/* Encabezado del Módulo */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Panel Ejecutivo de Riesgos y Oportunidades
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Síntesis gerencial consolidada del entorno macroeconómico y operativo colombiano.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/dashboard/noticias"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-medium rounded hover:bg-slate-50 transition-colors shadow-sm"
          >
            Revisar noticias pendientes
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* 1. Fila de Indicadores Macroeconómicos (con fecha, fuente y unidad) */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Indicadores Clave del Entorno
          </h3>
          <span className="text-[11px] text-slate-500">
            Alerta activa si TRM supera 3 días sin actualizar
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <IndicadorCard
            titulo="Tasa Representativa del Mercado"
            codigo="TRM"
            valor={trm?.valor}
            unidad="COP/USD"
            fecha={trm?.fecha}
            fuente={trm?.fuente}
            frecuenciaDias={3}
          />
          <IndicadorCard
            titulo="Inflación Anual (IPC)"
            codigo="IPC"
            valor={ipc?.valor}
            unidad="%"
            fecha={ipc?.fecha}
            fuente={ipc?.fuente}
            frecuenciaDias={40} // Mensual
          />
          <IndicadorCard
            titulo="Tasa de Intervención de Política"
            codigo="TASA_BANREP"
            valor={banrep?.valor}
            unidad="%"
            fecha={banrep?.fecha}
            fuente={banrep?.fuente}
            frecuenciaDias={45} // Periodicidad de junta
          />
        </div>
      </section>

      {/* 2. Resumen de los 6 Factores PESTEL */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Estado Consolidado por Factor PESTEL
            </h3>
            <p className="text-xs text-slate-500">
              El nivel del factor corresponde al puntaje más alto entre sus alertas validadas.
            </p>
          </div>
          <Link
            to="/dashboard/pestel"
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            Ver análisis completo
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {resumenFactores.map((f) => (
            <div
              key={f.factor}
              className="p-3 rounded-lg border border-slate-100 bg-slate-50 flex flex-col justify-between"
            >
              <span className="text-xs font-semibold text-slate-700">
                {f.factor}
              </span>
              <div className="mt-2 flex items-center justify-between">
                <NivelBadge nivel={f.nivel} puntaje={f.maxPuntaje} size="sm" />
              </div>
              <span className="text-[11px] text-slate-500 mt-2">
                {f.totalAlertas} hallazgo(s)
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Alertas de Mayor Puntaje y Decisiones Pendientes (Grid 2 columnas) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda: Alertas Prioritarias (Puntaje >= 15) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Alertas Prioritarias para Gerencia (Puntaje &ge; 15)
                </h3>
                <p className="text-xs text-slate-500">
                  Requieren plan de acción inmediato y seguimiento semanal.
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
              {alertasPrioritarias.length} activas
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {alertasPrioritarias.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                No hay alertas prioritarias validadas en este momento.
              </div>
            ) : (
              alertasPrioritarias.slice(0, 5).map((alerta) => (
                <div key={alerta.id} className="p-5 hover:bg-slate-50/80 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase">
                          {alerta.factor} &bull; {alerta.area}
                        </span>
                        <OrigenBadge origen={alerta.origen} />
                      </div>
                      <h4 className="text-sm font-semibold text-slate-900 leading-snug">
                        {alerta.titulo}
                      </h4>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                        {alerta.resumen}
                      </p>
                      <div className="mt-2 flex items-center gap-4 text-[11px] text-slate-500">
                        <span>Fecha: <strong className="text-slate-700">{alerta.fecha_publicacion}</strong></span>
                        <span>Fuente: <strong className="text-slate-700">{alerta.fuente}</strong></span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <NivelBadge nivel={alerta.nivel} puntaje={alerta.puntaje} />
                      <Link
                        to="/dashboard/noticias"
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
                      >
                        Detalle
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="p-3 bg-slate-50 border-t border-slate-100 text-right">
            <Link
              to="/dashboard/noticias"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
            >
              Ver todas las alertas validadas ({alertasValidadas.length})
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Columna Derecha: Decisiones Pendientes del Recomendador */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Decisiones Pendientes
                </h3>
                <p className="text-xs text-slate-500">
                  Acciones sugeridas por el recomendador.
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
              {decisionesPendientes.length}
            </span>
          </div>

          <div className="flex-1 divide-y divide-slate-100 overflow-y-auto max-h-[480px]">
            {decisionesPendientes.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                Todas las recomendaciones han sido gestionadas.
              </div>
            ) : (
              decisionesPendientes.slice(0, 4).map((alerta) => (
                <div key={alerta.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium text-slate-500">
                      {alerta.area}
                    </span>
                    <NivelBadge nivel={alerta.nivel} puntaje={alerta.puntaje} size="sm" />
                  </div>
                  <h5 className="text-xs font-semibold text-slate-800 line-clamp-1">
                    {alerta.titulo}
                  </h5>
                  <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">
                    {alerta.explicacion}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">
                      Tipo: <code className="bg-slate-100 px-1 py-0.5 rounded">{alerta.tipo_evento}</code>
                    </span>
                    <Link
                      to="/dashboard/recomendador"
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1"
                    >
                      Decidir
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-100">
            <Link
              to="/dashboard/recomendador"
              className="w-full inline-flex justify-center items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 transition-colors"
            >
              Gestionar Decisiones en Recomendador
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
