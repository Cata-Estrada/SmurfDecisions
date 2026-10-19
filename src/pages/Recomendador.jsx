import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Lightbulb,
  CheckCircle,
  XCircle,
  Clock,
  ShieldAlert,
  ArrowRight,
  Calculator,
  ExternalLink,
  Filter,
  Check,
  RotateCcw
} from 'lucide-react';
import { getAlertas, getReglas, actualizarDecisionAlerta } from '../lib/dataService';
import { REGLAS_RECOMENDADOR, REGLA_POR_DEFECTO } from '../lib/catalogos';
import NivelBadge from '../components/NivelBadge';
import OrigenBadge from '../components/OrigenBadge';

export default function Recomendador() {
  const [alertas, setAlertas] = useState([]);
  const [reglas, setReglas] = useState(REGLAS_RECOMENDADOR);
  const [cargando, setCargando] = useState(true);
  const [procesandoId, setProcesandoId] = useState(null);
  const [filtroDecision, setFiltroDecision] = useState('todas'); // todas, pendiente, aceptada, descartada

  async function cargarDatos() {
    setCargando(true);
    const [resAlertas, resReglas] = await Promise.all([
      getAlertas(),
      getReglas()
    ]);
    setAlertas(resAlertas.data || []);
    if (resReglas) setReglas(resReglas);
    setCargando(false);
  }

  useEffect(() => {
    cargarDatos();
  }, []);

  // El recomendador procesa SOLO alertas validadas
  const alertasValidadas = alertas.filter((a) => a.estado === 'validada');

  // Filtrado por estado de decisión
  const alertasFiltradas = alertasValidadas.filter((a) => {
    if (filtroDecision === 'todas') return true;
    return a.decision === filtroDecision;
  });

  async function handleCambiarDecision(id, nuevaDecision) {
    setProcesandoId(id);
    const res = await actualizarDecisionAlerta(id, nuevaDecision);
    if (res.data) {
      setAlertas((prev) =>
        prev.map((a) => (a.id === id ? { ...a, decision: nuevaDecision } : a))
      );
    }
    setProcesandoId(null);
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Recomendador de Decisiones Estratégicas
            </h2>
            <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded">
              Módulo Diferenciador
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Convierte alertas validadas en acciones trazables mediante reglas determinísticas del catálogo.
          </p>
        </div>

        {/* Filtros de Decisión */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Estado:
          </span>
          <div className="inline-flex rounded-md shadow-sm bg-white border border-slate-200 p-0.5">
            {['todas', 'pendiente', 'aceptada', 'descartada'].map((opc) => (
              <button
                key={opc}
                onClick={() => setFiltroDecision(opc)}
                className={`px-2.5 py-1 text-xs font-medium rounded capitalize transition-colors ${
                  filtroDecision === opc
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {opc}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lista de Recomendaciones */}
      {cargando ? (
        <div className="p-12 text-center text-xs text-slate-500">
          Cargando recomendaciones y cruzando reglas...
        </div>
      ) : alertasFiltradas.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center text-xs text-slate-500">
          No hay alertas que coincidan con el filtro de decisión seleccionado.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {alertasFiltradas.map((alerta) => {
            // Regla asociada por tipo_evento
            const regla = reglas[alerta.tipo_evento] || REGLAS_RECOMENDADOR[alerta.tipo_evento] || REGLA_POR_DEFECTO;
            const esTasaCambio = alerta.tipo_evento === 'tasa_cambio';
            const estaProcesando = procesandoId === alerta.id;

            return (
              <div
                key={alerta.id}
                className={`bg-white border rounded-lg p-6 shadow-sm transition-all ${
                  alerta.decision === 'aceptada'
                    ? 'border-emerald-300 ring-1 ring-emerald-500/10'
                    : alerta.decision === 'descartada'
                    ? 'border-slate-300 opacity-75 bg-slate-50/50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Cabecera de la Tarjeta */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[11px] font-bold uppercase text-slate-500">
                        {alerta.factor}
                      </span>
                      <span className="text-slate-300">&bull;</span>
                      <OrigenBadge origen={alerta.origen} />
                      <span className="text-xs text-slate-500">
                        Regla: <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">{alerta.tipo_evento}</code>
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">
                      {alerta.titulo}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <NivelBadge nivel={alerta.nivel} puntaje={alerta.puntaje} />
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${
                        alerta.decision === 'aceptada'
                          ? 'bg-emerald-100 text-emerald-800'
                          : alerta.decision === 'descartada'
                          ? 'bg-slate-200 text-slate-600'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {alerta.decision}
                    </span>
                  </div>
                </div>

                {/* Contenido Central: Acción Recomendada vs Justificación */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-5 text-xs">
                  {/* Caja de la Acción Sugerida (6 cols) */}
                  <div className="md:col-span-6 bg-blue-50/60 border border-blue-200 rounded-lg p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-blue-900 font-bold mb-1">
                        <Lightbulb className="w-4 h-4 text-blue-600 shrink-0" />
                        Acción Sugerida (Determinística)
                      </div>
                      <p className="text-sm font-semibold text-slate-900 mt-2 leading-relaxed">
                        {regla.accion}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-blue-200/60 flex items-center justify-between text-[11px]">
                      <span className="text-blue-800">Área Responsable:</span>
                      <strong className="text-slate-900 bg-white px-2 py-0.5 rounded border border-blue-200">
                        {regla.area_responsable}
                      </strong>
                    </div>
                  </div>

                  {/* Caja de Motivo y Supuestos (6 cols) */}
                  <div className="md:col-span-6 space-y-3 flex flex-col justify-between">
                    <div>
                      <span className="font-semibold text-slate-700">Motivo / Justificación:</span>
                      <p className="text-slate-600 mt-1 leading-relaxed">
                        {alerta.explicacion || alerta.resumen}
                      </p>
                    </div>

                    <div className="bg-slate-50 p-3 rounded border border-slate-100 text-[11px]">
                      <span className="font-semibold text-slate-700">Supuestos de la regla: </span>
                      <span className="text-slate-500">{regla.supuestos}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>Fuente: <strong className="text-slate-600">{alerta.fuente}</strong> ({alerta.fecha_publicacion})</span>
                      {esTasaCambio && (
                        <Link
                          to="/simulador"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold"
                        >
                          <Calculator className="w-3.5 h-3.5" />
                          Abrir Simulador TRM
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                {/* Barra Inferior de Decisión del Usuario */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-slate-500">
                    Decisión gerencial registrada: <strong className="capitalize text-slate-800">{alerta.decision}</strong>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCambiarDecision(alerta.id, 'aceptada')}
                      disabled={estaProcesando || alerta.decision === 'aceptada'}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded hover:bg-emerald-700 transition-colors disabled:opacity-40"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Aceptar Decisión
                    </button>
                    <button
                      onClick={() => handleCambiarDecision(alerta.id, 'descartada')}
                      disabled={estaProcesando || alerta.decision === 'descartada'}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-200 text-slate-700 text-xs font-semibold rounded hover:bg-slate-300 transition-colors disabled:opacity-40"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Descartar
                    </button>
                    {alerta.decision !== 'pendiente' && (
                      <button
                        onClick={() => handleCambiarDecision(alerta.id, 'pendiente')}
                        disabled={estaProcesando}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-slate-500 hover:text-slate-700 text-xs transition-colors"
                        title="Revertir a estado pendiente"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reabrir
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
