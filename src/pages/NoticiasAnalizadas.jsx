import React, { useEffect, useState } from 'react';
import {
  Filter,
  Search,
  CheckCircle,
  XCircle,
  ExternalLink,
  Edit3,
  Save,
  RefreshCw,
  Sliders,
  ShieldAlert,
  ChevronRight,
  Info,
  AlertTriangle
} from 'lucide-react';
import { getAlertas, actualizarAlerta } from '../lib/dataService';
import { FACTORES, AREAS, ESTADOS_ALERTA, TIPOS_EVENTO } from '../lib/catalogos';
import { formatearFechaPublicacion } from '../lib/fechas';
import { calcularPuntaje, normalizarValorEscala } from '../lib/puntaje';
import { useAuth } from '../lib/authContext';
import NivelBadge from '../components/NivelBadge';
import OrigenBadge from '../components/OrigenBadge';

export default function NoticiasAnalizadas() {
  const { empresa, empresaId, permisos } = useAuth();
  const [alertas, setAlertas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [alertaSeleccionada, setAlertaSeleccionada] = useState(null);
  const [errorCarga, setErrorCarga] = useState('');

  // Estados de filtros
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroFactor, setFiltroFactor] = useState('');
  const [filtroNivel, setFiltroNivel] = useState('');
  const [filtroArea, setFiltroArea] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroOrigen, setFiltroOrigen] = useState('');

  // Estado del formulario de edición del panel de detalle
  const [formEdicion, setFormEdicion] = useState({
    probabilidad: null,
    impacto: null,
    factor: '',
    area: '',
    tipo_evento: '',
    estado: ''
  });

  async function cargarAlertas() {
    setCargando(true);
    setErrorCarga('');
    try {
      const { data } = await getAlertas(empresaId);
      setAlertas(data);
      if (data.length > 0) {
        seleccionarAlerta(data[0]);
      } else {
        setAlertaSeleccionada(null);
      }
    } catch (error) {
      setErrorCarga(error.message);
      setAlertas([]);
      setAlertaSeleccionada(null);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarAlertas();
  }, [empresaId]);

  function seleccionarAlerta(alerta) {
    setAlertaSeleccionada(alerta);
    setFormEdicion({
      probabilidad: normalizarValorEscala(alerta.probabilidad),
      impacto: normalizarValorEscala(alerta.impacto),
      factor: alerta.factor,
      area: alerta.area,
      tipo_evento: alerta.tipo_evento,
      estado: alerta.estado
    });
  }

  // Filtrado reactivo de las alertas
  const alertasFiltradas = alertas.filter((a) => {
    if (filtroFactor && a.factor !== filtroFactor) return false;
    if (filtroNivel && a.nivel !== filtroNivel) return false;
    if (filtroArea && a.area !== filtroArea) return false;
    if (filtroEstado && a.estado !== filtroEstado) return false;
    if (filtroOrigen && a.origen !== filtroOrigen) return false;
    if (filtroTexto) {
      const q = filtroTexto.toLowerCase();
      const matchTitulo = a.titulo?.toLowerCase().includes(q);
      const matchResumen = a.resumen?.toLowerCase().includes(q);
      const matchFuente = a.fuente?.toLowerCase().includes(q);
      if (!matchTitulo && !matchResumen && !matchFuente) return false;
    }
    return true;
  });

  // Cálculo en vivo del puntaje según los sliders de edición
  const [mensajePersistencia, setMensajePersistencia] = useState(null);

  const calificacionCompleta =
    formEdicion.probabilidad !== null && formEdicion.impacto !== null;
  const calculoEnVivo = calificacionCompleta
    ? calcularPuntaje(formEdicion.probabilidad, formEdicion.impacto)
    : null;

  async function handleGuardarAjustes() {
    if (!alertaSeleccionada) return;
    if (!calificacionCompleta) {
      setMensajePersistencia({
        tipo: 'warning',
        texto: 'Asigna probabilidad e impacto (de 1 a 5) antes de guardar.'
      });
      return;
    }
    setGuardando(true);
    setMensajePersistencia(null);

    const campos = {
      probabilidad: formEdicion.probabilidad,
      impacto: formEdicion.impacto,
      factor: formEdicion.factor,
      area: formEdicion.area,
      tipo_evento: formEdicion.tipo_evento,
      estado: formEdicion.estado
    };

    try {
      const res = await actualizarAlerta(alertaSeleccionada.id, empresaId, campos);
      setAlertas((prev) =>
        prev.map((a) => (a.id === res.data.id ? res.data : a))
      );
      setAlertaSeleccionada(res.data);
      setMensajePersistencia({ tipo: 'success', texto: 'Cambio guardado en la base de datos.' });
    } catch (error) {
      setMensajePersistencia({ tipo: 'warning', texto: error.message });
    } finally {
      setGuardando(false);
    }
  }

  async function handleCambiarEstadoRapido(nuevoEstado) {
    if (!alertaSeleccionada) return;
    setGuardando(true);
    setMensajePersistencia(null);
    try {
      const res = await actualizarAlerta(alertaSeleccionada.id, empresaId, {
        estado: nuevoEstado
      });
      setAlertas((prev) =>
        prev.map((a) => (a.id === res.data.id ? res.data : a))
      );
      setAlertaSeleccionada(res.data);
      setFormEdicion((prev) => ({ ...prev, estado: nuevoEstado }));
      setMensajePersistencia({ tipo: 'success', texto: `Estado actualizado a "${nuevoEstado}" en la base de datos.` });
    } catch (error) {
      setMensajePersistencia({ tipo: 'warning', texto: error.message });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Noticias Analizadas y Validación de Alertas
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Bandeja del analista: clasifica, valida, descarta y ajusta probabilidad e impacto.
          </p>
        </div>
        <button
          onClick={cargarAlertas}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-medium rounded hover:bg-slate-50 transition-colors shadow-sm self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${cargando ? 'animate-spin' : ''}`} />
          Refrescar datos
        </button>
      </div>

      {errorCarga && (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {errorCarga}
        </div>
      )}

      {/* Barra de Filtros Multifactor */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <Filter className="w-4 h-4 text-slate-500" />
          Filtros de Búsqueda y Clasificación
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Búsqueda por texto */}
          <div className="lg:col-span-2 relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar título, fuente o texto..."
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Factor */}
          <select
            value={filtroFactor}
            onChange={(e) => setFiltroFactor(e.target.value)}
            className="text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Todos los factores</option>
            {FACTORES.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>

          {/* Nivel */}
          <select
            value={filtroNivel}
            onChange={(e) => setFiltroNivel(e.target.value)}
            className="text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Todos los niveles</option>
            <option value="Alto">Alto (15-25)</option>
            <option value="Medio">Medio (8-14)</option>
            <option value="Bajo">Bajo (1-7)</option>
          </select>

          {/* Estado */}
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Todos los estados</option>
            {ESTADOS_ALERTA.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>

          {/* Origen */}
          <select
            value={filtroOrigen}
            onChange={(e) => setFiltroOrigen(e.target.value)}
            className="text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Todos los orígenes</option>
            <option value="base">Base PESTEL (27)</option>
            <option value="n8n">Automatizados n8n</option>
          </select>
        </div>
      </div>

      {/* Estructura Master-Detail (2 Columnas) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Columna Izquierda: Listado de Alertas (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">
              Hallazgos registrados ({alertasFiltradas.length})
            </span>
            <span className="text-[11px] text-slate-500">
              Selecciona un elemento para analizar y editar
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[700px] overflow-y-auto">
            {alertasFiltradas.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500">
                No se encontraron noticias que coincidan con los filtros seleccionados.
              </div>
            ) : (
              alertasFiltradas.map((alerta) => {
                const esSeleccionada = alertaSeleccionada?.id === alerta.id;
                return (
                  <div
                    key={alerta.id}
                    onClick={() => seleccionarAlerta(alerta)}
                    className={`p-4 cursor-pointer transition-all ${
                      esSeleccionada
                        ? 'bg-blue-50/60 border-l-4 border-blue-600'
                        : 'hover:bg-slate-50 border-l-4 border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            {alerta.factor}
                          </span>
                          <span className="text-[10px] text-slate-400">&bull;</span>
                          <span className="text-[10px] text-slate-600 truncate max-w-[150px]">
                            {alerta.area}
                          </span>
                          <OrigenBadge origen={alerta.origen} />
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                            alerta.estado === 'validada'
                              ? 'bg-emerald-100 text-emerald-800'
                              : alerta.estado === 'descartada'
                              ? 'bg-slate-200 text-slate-600'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {alerta.estado}
                          </span>
                        </div>
                        <h4 className="text-xs font-semibold text-slate-900 leading-snug line-clamp-2">
                          {alerta.titulo}
                        </h4>
                        <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500">
                          <span>Fecha: <strong className="text-slate-700">{formatearFechaPublicacion(alerta.fecha_publicacion)}</strong></span>
                          <span>Fuente: <strong className="text-slate-700 truncate max-w-[120px]">{alerta.fuente}</strong></span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <NivelBadge nivel={alerta.nivel} puntaje={alerta.puntaje} size="sm" />
                        <ChevronRight className={`w-4 h-4 text-slate-400 ${esSeleccionada ? 'text-blue-600' : ''}`} />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Columna Derecha: Panel de Detalle y Acciones del Analista (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg shadow-sm p-6 flex flex-col">
          {alertaSeleccionada ? (
            <div className="space-y-5">
              {/* Encabezado del Detalle */}
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <OrigenBadge origen={alertaSeleccionada.origen} />
                    {calculoEnVivo ? (
                      <NivelBadge nivel={calculoEnVivo.nivel} puntaje={calculoEnVivo.puntaje} />
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        Sin calificar
                      </span>
                    )}
                    {calculoEnVivo?.prioritaria && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded">
                        <ShieldAlert className="w-3 h-3" />
                        Prioritaria
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">
                    {alertaSeleccionada.titulo}
                  </h3>
                </div>
              </div>

              {/* Resumen e Impacto Inferred */}
              <div className="space-y-3 text-xs">
                <div>
                  <span className="font-semibold text-slate-700">Resumen del hecho:</span>
                  <p className="text-slate-600 mt-1 leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-100">
                    {alertaSeleccionada.resumen}
                  </p>
                </div>

                <div>
                  <span className="font-semibold text-slate-700">Impacto inferido en {empresa}:</span>
                  <p className="text-slate-600 mt-1 leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-100">
                    {alertaSeleccionada.explicacion}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>
                    <span className="text-slate-500">Fecha de publicación:</span>
                    <div className="font-medium text-slate-800">{formatearFechaPublicacion(alertaSeleccionada.fecha_publicacion)}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Fuente original:</span>
                    <div className="font-medium text-slate-800 truncate" title={alertaSeleccionada.fuente}>
                      {alertaSeleccionada.fuente}
                    </div>
                  </div>
                </div>

                {alertaSeleccionada.enlace && (
                  <div className="pt-1">
                    <a
                      href={alertaSeleccionada.enlace}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Ver enlace de la fuente original
                    </a>
                  </div>
                )}
              </div>

              {/* Panel de Ajuste y Reclasificación (Analista / Gerente) */}
              <div className="pt-4 border-t border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Sliders className="w-3.5 h-3.5 text-blue-600" />
                    Ajuste de Probabilidad, Impacto y Clasificación
                  </div>
                  {!permisos.puedeEditarRiesgos && (
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      Solo Lectura
                    </span>
                  )}
                </div>

                {!permisos.puedeEditarRiesgos && (
                  <div className="p-3 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-700 flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                    <span>
                      <strong>Perfil de Consulta:</strong> Como <em>Consultor</em> no tienes permisos de edición. Requiere rol de <strong>Analista</strong> o <strong>Gerente</strong> para recalibrar o validar riesgos.
                    </span>
                  </div>
                )}

                {/* Sliders de Probabilidad e Impacto */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600">Probabilidad:</span>
                      <strong className="text-slate-900">
                        {formEdicion.probabilidad === null
                          ? 'Sin asignar'
                          : `${formEdicion.probabilidad} / 5`}
                      </strong>
                    </div>
                    {formEdicion.probabilidad === null ? (
                      <select
                        value=""
                        onChange={(e) =>
                          setFormEdicion({
                            ...formEdicion,
                            probabilidad: e.target.value ? parseInt(e.target.value, 10) : null
                          })
                        }
                        className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white text-xs"
                      >
                        <option value="">Selecciona de 1 a 5</option>
                        {[1, 2, 3, 4, 5].map((valor) => (
                          <option key={valor} value={valor}>{valor}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={formEdicion.probabilidad}
                        onChange={(e) =>
                          setFormEdicion({ ...formEdicion, probabilidad: parseInt(e.target.value, 10) })
                        }
                        className="w-full accent-blue-600"
                      />
                    )}
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600">Impacto:</span>
                      <strong className="text-slate-900">
                        {formEdicion.impacto === null
                          ? 'Sin asignar'
                          : `${formEdicion.impacto} / 5`}
                      </strong>
                    </div>
                    {formEdicion.impacto === null ? (
                      <select
                        value=""
                        onChange={(e) =>
                          setFormEdicion({
                            ...formEdicion,
                            impacto: e.target.value ? parseInt(e.target.value, 10) : null
                          })
                        }
                        className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white text-xs"
                      >
                        <option value="">Selecciona de 1 a 5</option>
                        {[1, 2, 3, 4, 5].map((valor) => (
                          <option key={valor} value={valor}>{valor}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={formEdicion.impacto}
                        onChange={(e) =>
                          setFormEdicion({ ...formEdicion, impacto: parseInt(e.target.value, 10) })
                        }
                        className="w-full accent-blue-600"
                      />
                    )}
                  </div>

                  <div className="col-span-2 pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Puntaje recalculado:</span>
                    <span className="font-bold text-slate-900">
                      {calculoEnVivo
                        ? `${formEdicion.probabilidad} × ${formEdicion.impacto} = ${calculoEnVivo.puntaje} (${calculoEnVivo.nivel})`
                        : 'Asigna ambos valores para calcular'}
                    </span>
                  </div>
                </div>

                {/* Reclasificar Factor y Área */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-600 mb-1 font-medium">Factor PESTEL:</label>
                    <select
                      value={formEdicion.factor}
                      onChange={(e) => setFormEdicion({ ...formEdicion, factor: e.target.value })}
                      className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white text-xs"
                    >
                      {FACTORES.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1 font-medium">Área Afectada:</label>
                    <select
                      value={formEdicion.area}
                      onChange={(e) => setFormEdicion({ ...formEdicion, area: e.target.value })}
                      className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white text-xs"
                    >
                      {AREAS.map((a) => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-slate-600 mb-1 font-medium">Tipo de Evento:</label>
                    <select
                      value={formEdicion.tipo_evento}
                      onChange={(e) => setFormEdicion({ ...formEdicion, tipo_evento: e.target.value })}
                      className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white text-xs"
                    >
                      {TIPOS_EVENTO.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Botón Guardar Ajustes */}
                <button
                  onClick={handleGuardarAjustes}
                  disabled={guardando || !calificacionCompleta || !permisos.puedeEditarRiesgos}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-slate-800 transition-colors disabled:opacity-40"
                  title={!permisos.puedeEditarRiesgos ? 'Requiere rol de Analista o Gerente' : ''}
                >
                  <Save className="w-3.5 h-3.5" />
                  {guardando ? 'Guardando cambios...' : 'Guardar Reclasificación y Puntaje'}
                </button>

                {/* Acciones Rápidas: Validar / Descartar */}
                <div className="pt-2 border-t border-slate-100 flex gap-2">
                  <button
                    onClick={() => handleCambiarEstadoRapido('validada')}
                    disabled={guardando || alertaSeleccionada.estado === 'validada' || !permisos.puedeEditarRiesgos}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-emerald-600 text-white text-xs font-semibold rounded hover:bg-emerald-700 transition-colors disabled:opacity-40"
                    title={!permisos.puedeEditarRiesgos ? 'Requiere rol de Analista o Gerente' : ''}
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Validar Alerta
                  </button>
                  <button
                    onClick={() => handleCambiarEstadoRapido('descartada')}
                    disabled={guardando || alertaSeleccionada.estado === 'descartada' || !permisos.puedeEditarRiesgos}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-slate-200 text-slate-700 text-xs font-semibold rounded hover:bg-slate-300 transition-colors disabled:opacity-40"
                    title={!permisos.puedeEditarRiesgos ? 'Requiere rol de Analista o Gerente' : ''}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Descartar
                  </button>
                </div>

                {/* Mensaje de Confirmación y Persistencia (Nube vs Local) */}
                {mensajePersistencia && (
                  <div
                    className={`p-3 rounded text-xs border flex items-start gap-2 ${
                      mensajePersistencia.tipo === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50 text-amber-900 border-amber-200'
                    }`}
                  >
                    {mensajePersistencia.tipo === 'success' ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <span className="leading-relaxed">{mensajePersistencia.texto}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <Info className="w-8 h-8 mb-2 stroke-1" />
              <p className="text-xs">Selecciona un hallazgo en la lista para ver su detalle y editar su calificación.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
