import React, { useEffect, useState } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Database,
  ExternalLink,
  Activity,
  Server
} from 'lucide-react';
import { getFuentes, getEjecuciones } from '../lib/dataService';

export default function CentroActualizaciones() {
  const [fuentes, setFuentes] = useState([]);
  const [ejecuciones, setEjecuciones] = useState([]);
  const [origenDatos, setOrigenDatos] = useState('local');
  const [cargando, setCargando] = useState(true);

  async function cargarDatos() {
    setCargando(true);
    const [resFuentes, resEjecuciones] = await Promise.all([
      getFuentes(),
      getEjecuciones()
    ]);

    const listaFuentes = Array.isArray(resFuentes)
      ? resFuentes
      : (resFuentes?.data && Array.isArray(resFuentes.data))
      ? resFuentes.data
      : [];

    const listaEjecuciones = Array.isArray(resEjecuciones)
      ? resEjecuciones
      : (resEjecuciones?.data && Array.isArray(resEjecuciones.data))
      ? resEjecuciones.data
      : [];

    setFuentes(listaFuentes);
    setEjecuciones(listaEjecuciones);
    setOrigenDatos(resFuentes?.source || resEjecuciones?.source || 'local');
    setCargando(false);
  }

  useEffect(() => {
    cargarDatos();
  }, []);

  const formatearFechaHora = (fechaIso) => {
    if (!fechaIso) return 'Pendiente';
    try {
      const d = new Date(fechaIso);
      return d.toLocaleString('es-CO', {
        dateStyle: 'short',
        timeStyle: 'medium'
      });
    } catch {
      return fechaIso;
    }
  };

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Centro de Actualizaciones y Auditoría de Automatización
            </h2>
            {origenDatos === 'supabase' ? (
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                Datos desde Supabase
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                Respaldo Local
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Monitoreo en tiempo real del estado de los flujos de n8n, fuentes externas e historial de ejecuciones.
          </p>
        </div>

        <button
          onClick={cargarDatos}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-medium rounded hover:bg-slate-50 transition-colors shadow-sm self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${cargando ? 'animate-spin' : ''}`} />
          Refrescar estado
        </button>
      </div>

      {/* Resumen de Estado de la Automatización */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Fuentes Monitoreadas</span>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">
              {(Array.isArray(fuentes) ? fuentes : []).length}
            </div>
            <span className="text-[11px] text-slate-400">3 macro + 5 feeds RSS</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Ejecuciones Exitosas</span>
            <div className="text-2xl font-bold text-emerald-600 mt-0.5">
              {(Array.isArray(ejecuciones) ? ejecuciones : []).filter((e) => e.estado === 'ok').length}
            </div>
            <span className="text-[11px] text-slate-400">Sin fallos críticos reportados</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Frecuencia de Captura</span>
            <div className="text-sm font-bold text-slate-800 mt-1">TRM (24h) &bull; RSS (6h)</div>
            <span className="text-[11px] text-slate-400">n8n Cloud Scheduler</span>
          </div>
        </div>
      </div>

      {/* 1. Tabla de Fuentes Externas */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-900">
            Fuentes de Datos del Entorno Configuradas
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Estado de periodicidad y programación de consulta en n8n cloud.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Identificador</th>
                <th className="py-3 px-4">Nombre de la Fuente</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Frecuencia</th>
                <th className="py-3 px-4">Estado Operativo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(Array.isArray(fuentes) ? fuentes : []).map((f) => (
                <tr key={f.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                    {f.id}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-900">
                    {f.nombre}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium capitalize ${
                      f.tipo === 'indicador'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-purple-50 text-purple-700 border border-purple-200'
                    }`}>
                      {f.tipo}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    Cada {f.frecuencia_horas} horas {f.frecuencia_horas === 24 ? '(Diaria)' : f.frecuencia_horas === 720 ? '(Mensual)' : ''}
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Activa
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Historial de Ejecuciones (Tabla ejecuciones) */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-900">
            Historial de Ejecuciones de Automatización (n8n &rarr; Supabase)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro de cada ciclo de consulta, registros nuevos insertados y errores interceptados.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Flujo</th>
                <th className="py-3 px-4">Fuente Consultada</th>
                <th className="py-3 px-4">Inicio</th>
                <th className="py-3 px-4">Fin</th>
                <th className="py-3 px-4">Registros Nuevos</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4">Mensaje de Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(!Array.isArray(ejecuciones) || ejecuciones.length === 0) ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No hay registros de ejecución en la base de datos.
                  </td>
                </tr>
              ) : (
                ejecuciones.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {e.flujo}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {e.fuente}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {formatearFechaHora(e.inicio)}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {formatearFechaHora(e.fin)}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-bold">
                      +{e.registros_nuevos}
                    </td>
                    <td className="py-3 px-4">
                      {e.estado === 'ok' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3" />
                          OK
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                          <AlertCircle className="w-3 h-3" />
                          Error
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 italic max-w-xs truncate">
                      {e.mensaje_error || 'Ninguno'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
