import React, { useEffect, useState } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Database,
  ExternalLink,
  Activity,
  Server,
  Play,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { getFuentes, getEjecuciones, getUltimoIdEjecucion } from '../lib/dataService';
import { ejecutarFlujosN8n, esperarEjecucionN8n } from '../lib/n8nService';

export default function CentroActualizaciones() {
  const [fuentes, setFuentes] = useState([]);
  const [ejecuciones, setEjecuciones] = useState([]);
  const [tamanoPagina, setTamanoPagina] = useState(10);
  const [paginaActual, setPaginaActual] = useState(1);
  const [origenDatos, setOrigenDatos] = useState('local');
  const [cargando, setCargando] = useState(true);
  const [ejecutando, setEjecutando] = useState(false);
  const [resultadoEjecucion, setResultadoEjecucion] = useState(null);

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
    setPaginaActual(1);
    setOrigenDatos(resFuentes?.source || resEjecuciones?.source || 'local');
    setCargando(false);
  }

  useEffect(() => {
    cargarDatos();
  }, []);

  async function iniciarFlujos() {
    setEjecutando(true);
    setResultadoEjecucion(null);
    try {
      const idMinimo = await getUltimoIdEjecucion();
      await ejecutarFlujosN8n();
      setResultadoEjecucion({
        tipo: 'pending',
        texto: 'Webhook aceptado. Esperando los registros de los tres flujos en Supabase…',
        ejecuciones: []
      });

      const resultado = await esperarEjecucionN8n({
        idMinimo,
        onActualizacion: (ejecuciones) => {
          setResultadoEjecucion({
            tipo: 'pending',
            texto: 'Webhook aceptado. Esperando los registros de los tres flujos en Supabase…',
            ejecuciones
          });
        }
      });
      const huboErrores = resultado.ejecuciones.some((ejecucion) => ejecucion?.estado !== 'ok');
      setResultadoEjecucion({
        tipo: resultado.timedOut ? 'warning' : huboErrores ? 'error' : 'success',
        texto: resultado.timedOut
          ? resultado.ejecucionesObservadas?.length
            ? 'Se agotó el tiempo. Supabase recibió registros, pero sus valores de “flujo” no coinciden con los tres nombres esperados.'
            : 'Se agotó el tiempo y no aparecieron registros nuevos en ejecuciones. Revisa que el webhook active los flujos y que cada uno inserte su fila al finalizar.'
          : huboErrores
          ? 'Los tres flujos terminaron, pero al menos uno registró un error.'
          : 'Los tres flujos terminaron correctamente y sus resultados ya están en Supabase.',
        ejecuciones: resultado.ejecuciones,
        ejecucionesObservadas: resultado.ejecucionesObservadas || []
      });
      await cargarDatos();
    } catch (error) {
      setResultadoEjecucion({
        tipo: 'error',
        texto: error.message,
        ejecuciones: []
      });
    } finally {
      setEjecutando(false);
    }
  }

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

  const ejecucionesOrdenadas = [...ejecuciones].sort((a, b) => {
    const fechaA = Date.parse(a.inicio) || 0;
    const fechaB = Date.parse(b.inicio) || 0;
    return fechaB - fechaA;
  });
  const totalPaginas = Math.max(1, Math.ceil(ejecucionesOrdenadas.length / tamanoPagina));
  const paginaVisible = Math.min(paginaActual, totalPaginas);
  const inicioFila = (paginaVisible - 1) * tamanoPagina;
  const ejecucionesVisibles = ejecucionesOrdenadas.slice(inicioFila, inicioFila + tamanoPagina);
  const primeraFila = ejecucionesOrdenadas.length === 0 ? 0 : inicioFila + 1;
  const ultimaFila = Math.min(inicioFila + tamanoPagina, ejecucionesOrdenadas.length);

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

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={iniciarFlujos}
            disabled={ejecutando}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 border border-blue-700 text-white text-xs font-semibold rounded hover:bg-blue-800 transition-colors shadow-sm disabled:opacity-60"
          >
            <Play className={`w-3.5 h-3.5 ${ejecutando ? 'animate-pulse' : ''}`} />
            {ejecutando ? 'Esperando resultado…' : 'Ejecutar flujos n8n'}
          </button>
          <button
            onClick={cargarDatos}
            disabled={cargando || ejecutando}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-medium rounded hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${cargando ? 'animate-spin' : ''}`} />
            Refrescar estado
          </button>
        </div>
      </div>

      {resultadoEjecucion && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-md border px-4 py-3 text-xs ${
            resultadoEjecucion.tipo === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : resultadoEjecucion.tipo === 'pending'
              ? 'border-blue-200 bg-blue-50 text-blue-800'
              : resultadoEjecucion.tipo === 'warning'
              ? 'border-amber-200 bg-amber-50 text-amber-900'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          <p>{resultadoEjecucion.texto}</p>
          {resultadoEjecucion.ejecuciones?.length > 0 && (
            <ul className="mt-2 space-y-1">
              {resultadoEjecucion.ejecuciones.map((ejecucion, indice) => (
                <li key={ejecucion?.id || `pendiente-${indice}`}>
                  {['indicadores', 'noticias', 'recomendaciones'][indice]}:{' '}
                  {ejecucion
                    ? `${ejecucion.estado}${ejecucion.mensaje_error ? ` — ${ejecucion.mensaje_error}` : ''}`
                    : 'esperando registro'}
                </li>
              ))}
            </ul>
          )}
          {resultadoEjecucion.ejecucionesObservadas?.length > 0 && (
            <p className="mt-2">
              Registros nuevos detectados:{' '}
              {resultadoEjecucion.ejecucionesObservadas
                .map((ejecucion) => `${ejecucion.flujo} (${ejecucion.estado})`)
                .join(', ')}
            </p>
          )}
        </div>
      )}

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
      <div className="w-full max-w-screen-2xl mx-auto bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 text-center">
          <h3 className="text-base font-bold text-slate-900">
            Historial de Ejecuciones de Automatización (n8n &rarr; Supabase)
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Registro de cada ciclo de consulta, registros nuevos insertados y errores interceptados.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm text-center">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-4 px-5">Flujo</th>
                <th className="py-4 px-5">Fuente Consultada</th>
                <th className="py-4 px-5">Inicio</th>
                <th className="py-4 px-5">Fin</th>
                <th className="py-4 px-5">Registros Nuevos</th>
                <th className="py-4 px-5">Estado</th>
                <th className="py-4 px-5">Mensaje de Error</th>
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
                ejecucionesVisibles.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-5 font-semibold text-slate-800">
                      {e.flujo}
                    </td>
                    <td className="py-4 px-5 text-slate-600">
                      {e.fuente}
                    </td>
                    <td className="py-4 px-5 text-slate-500 font-mono text-xs">
                      {formatearFechaHora(e.inicio)}
                    </td>
                    <td className="py-4 px-5 text-slate-500 font-mono text-xs">
                      {formatearFechaHora(e.fin)}
                    </td>
                    <td className="py-4 px-5 text-slate-700 font-bold">
                      +{e.registros_nuevos}
                    </td>
                    <td className="py-4 px-5">
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
                    <td className="py-4 px-5 text-slate-500 italic max-w-xs truncate">
                      {e.mensaje_error || 'Ninguno'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 px-5 py-4 text-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <label htmlFor="tamano-pagina-ejecuciones">Filas por página:</label>
            <select
              id="tamano-pagina-ejecuciones"
              value={tamanoPagina}
              onChange={(e) => {
                setTamanoPagina(Number(e.target.value));
                setPaginaActual(1);
              }}
              className="rounded border border-slate-300 bg-white px-2 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[10, 25, 50, 100].map((cantidad) => (
                <option key={cantidad} value={cantidad}>{cantidad}</option>
              ))}
            </select>
            <span className="text-slate-500">
              {primeraFila}–{ultimaFila} de {ejecucionesOrdenadas.length}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-600">
              Página {paginaVisible} de {totalPaginas}
            </span>
            <button
              type="button"
              onClick={() => setPaginaActual((pagina) => Math.max(1, pagina - 1))}
              disabled={paginaVisible === 1}
              className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </button>
            <button
              type="button"
              onClick={() => setPaginaActual((pagina) => Math.min(totalPaginas, pagina + 1))}
              disabled={paginaVisible === totalPaginas || ejecucionesOrdenadas.length === 0}
              className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
