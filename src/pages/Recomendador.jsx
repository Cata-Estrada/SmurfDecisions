// ==============================================================================
// Recomendador de momento de compra · Coagropacífico
// Cruza la posición del precio (P25/P75), la cobertura de caja y las alertas
// para dar una acción por calidad. Las reglas son editables por el gerente.
// ==============================================================================
import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Clock,
  Lightbulb,
  Pencil,
  RotateCcw,
  ShieldAlert,
  X,
  XCircle
} from 'lucide-react';
import { useAuth } from '../lib/authContext';
import { usePanelCompra } from '../lib/useCompraCacao';
import {
  actualizarDecisionAlerta,
  getDatosCompraCacao,
  getPlanCompras,
  getReglas,
  guardarReglaCompra
} from '../lib/dataService';
import {
  ETIQUETA_COBERTURA,
  ETIQUETA_NIVEL,
  REGLAS_COMPRA_PREDETERMINADAS
} from '../lib/compraCacao';
import { EFECTOS_PRECIO, nombreDriver, nombreTipoEvento } from '../lib/catalogos';
import { formatearFechaPublicacion } from '../lib/fechas';
import { mostrarMillones, mostrarNumero, mostrarPesos, mostrarPorcentaje } from '../lib/formato';
import Semaforo from '../components/Semaforo';
import NivelBadge from '../components/NivelBadge';

const NIVELES = ['bajo', 'medio', 'alto'];
const COBERTURAS = ['deficit', 'ajustada', 'holgada'];
const DIAS_SENALES = 14;

function SenalesNoticias({ alertas }) {
  const desde = Date.now() - DIAS_SENALES * 24 * 60 * 60 * 1000;
  const recientes = alertas.filter((a) =>
    a.estado === 'validada' &&
    new Date(a.fecha_publicacion || a.creada_en).getTime() >= desde
  );
  const sube = recientes.filter((a) => a.efecto_precio === 'sube').length;
  const baja = recientes.filter((a) => a.efecto_precio === 'baja').length;
  const texto = recientes.length === 0
    ? 'Sin noticias validadas'
    : sube > baja ? 'Presión al alza' : baja > sube ? 'Presión a la baja' : 'Señales mixtas';
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Noticias ({DIAS_SENALES} días)</p>
      <p className="mt-1 text-lg font-bold text-slate-900">{texto}</p>
      <p className="mt-1 text-xs text-slate-500">{sube} al alza · {baja} a la baja · {recientes.length - sube - baja} neutrales</p>
    </div>
  );
}

function CeldaRegla({ regla, activa, puedeEditar, onGuardar }) {
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState(regla);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => setBorrador(regla), [regla]);

  async function guardar() {
    setGuardando(true);
    setError('');
    try {
      await onGuardar(borrador);
      setEditando(false);
    } catch (errorGuardado) {
      setError(errorGuardado.message);
    } finally {
      setGuardando(false);
    }
  }

  if (editando) {
    return (
      <td className="border border-slate-200 p-2 align-top">
        <div className="space-y-1.5">
          <input
            value={borrador.titulo}
            onChange={(e) => setBorrador({ ...borrador, titulo: e.target.value })}
            className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
            aria-label="Título de la regla"
          />
          <textarea
            value={borrador.recomendacion}
            onChange={(e) => setBorrador({ ...borrador, recomendacion: e.target.value })}
            rows={3}
            className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
            aria-label="Recomendación"
          />
          <select
            value={borrador.semaforo}
            onChange={(e) => setBorrador({ ...borrador, semaforo: e.target.value })}
            className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
            aria-label="Color del semáforo"
          >
            <option value="verde">Verde</option>
            <option value="amarillo">Amarillo</option>
            <option value="rojo">Rojo</option>
          </select>
          {error && <p className="text-[11px] text-rose-700">{error}</p>}
          <div className="flex gap-1">
            <button type="button" onClick={guardar} disabled={guardando || !borrador.titulo.trim() || !borrador.recomendacion.trim()}
              className="inline-flex items-center gap-1 rounded bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-50">
              <Check className="h-3 w-3" /> Guardar
            </button>
            <button type="button" onClick={() => { setBorrador(regla); setEditando(false); setError(''); }}
              className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-[11px] text-slate-600">
              <X className="h-3 w-3" /> Cancelar
            </button>
          </div>
        </div>
      </td>
    );
  }

  return (
    <td className={`border p-3 align-top ${activa ? 'border-slate-900 bg-slate-50 ring-2 ring-inset ring-slate-900' : 'border-slate-200'}`}>
      <div className="flex items-start justify-between gap-2">
        <Semaforo color={regla.semaforo} etiqueta={regla.titulo} />
        {puedeEditar && (
          <button type="button" onClick={() => setEditando(true)} className="text-slate-400 hover:text-slate-700" aria-label={`Editar regla ${regla.titulo}`}>
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <p className="mt-1.5 text-[11px] leading-snug text-slate-600">{regla.recomendacion}</p>
      {activa && <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-900">Situación actual</p>}
    </td>
  );
}

export default function Recomendador() {
  const { empresaId, rol, permisos } = useAuth();
  const panel = usePanelCompra(empresaId);
  const [reglasCompra, setReglasCompra] = useState([]);
  const [reglasNoticias, setReglasNoticias] = useState({});
  const [plan, setPlan] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [procesandoId, setProcesandoId] = useState(null);
  const [filtroDecision, setFiltroDecision] = useState('pendiente');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!empresaId) return;
    Promise.all([getDatosCompraCacao(empresaId), getReglas(empresaId), getPlanCompras(empresaId)])
      .then(([datos, reglas, tramos]) => {
        setReglasCompra(datos.reglasCompra);
        setReglasNoticias(reglas.data);
        setPlan(tramos);
      })
      .catch((errorCarga) => setError(errorCarga.message));
  }, [empresaId]);

  useEffect(() => setAlertas(panel.alertas), [panel.alertas]);

  const matriz = useMemo(() => {
    const lista = reglasCompra.length > 0 ? reglasCompra : REGLAS_COMPRA_PREDETERMINADAS;
    return Object.fromEntries(lista.map((r) => [`${r.nivel_precio}|${r.cobertura}`, r]));
  }, [reglasCompra]);

  const pendientePorCalidad = useMemo(() => {
    const totales = {};
    for (const tramo of plan) {
      if (tramo.estado !== 'planeado') continue;
      totales[tramo.calidad_id] = (totales[tramo.calidad_id] || 0) + Number(tramo.volumen_kg);
    }
    return totales;
  }, [plan]);

  async function guardarRegla(regla) {
    const guardada = await guardarReglaCompra(empresaId, regla);
    setReglasCompra((prev) => {
      const resto = prev.filter((r) => !(r.nivel_precio === guardada.nivel_precio && r.cobertura === guardada.cobertura));
      return [...resto, guardada];
    });
    panel.recargar();
  }

  async function cambiarDecision(id, decision) {
    setProcesandoId(id);
    setError('');
    try {
      await actualizarDecisionAlerta(id, empresaId, decision);
      setAlertas((prev) => prev.map((a) => (a.id === id ? { ...a, decision } : a)));
    } catch (errorDecision) {
      setError(errorDecision.message);
    } finally {
      setProcesandoId(null);
    }
  }

  if (panel.cargando) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-slate-500">
        <Clock className="mr-2 h-5 w-5 animate-spin" />
        Cruzando precio, caja y alertas…
      </div>
    );
  }

  const { calculo, mercado } = panel;
  const alertasValidadas = alertas.filter((a) => a.estado === 'validada');
  const alertasFiltradas = alertasValidadas.filter((a) => filtroDecision === 'todas' || a.decision === filtroDecision);

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-5">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Recomendador de momento de compra</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Acción por calidad según la posición del precio, la cobertura de caja y las alertas. Son reglas de partida que la cooperativa debe validar, no pronósticos.
        </p>
      </header>

      {(panel.error || panel.errorMercado || error) && (
        <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {panel.error || error || panel.errorMercado}
        </div>
      )}

      {/* Situación */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Posición del precio</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{ETIQUETA_NIVEL[mercado.nivelPrecio] || '—'}</p>
          <p className="mt-1 text-xs text-slate-500">
            P25 US$ {mostrarNumero(mercado.percentil25, { maximumFractionDigits: 0 })} · P75 US$ {mostrarNumero(mercado.percentil75, { maximumFractionDigits: 0 })} ({mercado.ventanaDias} días)
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Movimiento reciente</p>
          <p className={`mt-1 text-lg font-bold ${mercado.alertaVariacion ? 'text-rose-700' : 'text-slate-900'}`}>
            {mostrarPorcentaje(mercado.variacionPct, { signo: true })}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            En {mercado.diasVariacion} días hábiles · alerta sobre {mostrarNumero(mercado.umbralVariacion)} %
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Cobertura de caja</p>
          <p className="mt-1 text-lg font-bold text-slate-900">
            {ETIQUETA_COBERTURA[calculo.cobertura] || '—'} {calculo.coberturaPct != null && `(${mostrarPorcentaje(calculo.coberturaPct)})`}
          </p>
          <p className="mt-1 text-xs text-slate-500">Capital {mostrarMillones(calculo.capitalRequerido)} · Caja {mostrarMillones(panel.configuracion.caja_disponible_cop)}</p>
        </div>
        <SenalesNoticias alertas={alertas} />
      </section>

      {/* Por calidad */}
      <section>
        <h2 className="mb-3 text-sm font-bold text-slate-900">Ventana de compra por calidad</h2>
        {calculo.calidades.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-300 p-5 text-center text-xs text-slate-500">No hay calidades registradas.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {calculo.calidades.map((calidad) => (
              <article key={calidad.id || calidad.nombre} className="flex flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-900">{calidad.nombre}</h3>
                  {calidad.semaforo && <Semaforo color={calidad.semaforo} />}
                </div>
                <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">
                  {calidad.lista ? `${mostrarPesos(calidad.precioCompraCopKg)}/kg` : 'Datos incompletos'}
                </p>
                {calidad.percentil25CopKg != null && (
                  <p className="text-[11px] text-slate-500">Rango habitual {mostrarPesos(calidad.percentil25CopKg)} – {mostrarPesos(calidad.percentil75CopKg)}</p>
                )}
                {calidad.recomendacion ? (
                  <div className="mt-3 flex-1 rounded-md bg-slate-50 p-3 text-xs text-slate-700">
                    <p className="font-semibold text-slate-900">{calidad.recomendacion.titulo}</p>
                    <p className="mt-1 leading-relaxed">{calidad.recomendacion.recomendacion}</p>
                  </div>
                ) : (
                  <p className="mt-3 flex-1 text-xs text-slate-500">Sin recomendación: faltan datos de precio o parámetros.</p>
                )}
                <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-[11px]">
                  <div>
                    <dt className="text-slate-500">Volumen del cálculo</dt>
                    <dd className="font-semibold text-slate-800">{mostrarNumero(calidad.volumen_kg)} kg</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Pendiente en el plan</dt>
                    <dd className="font-semibold text-slate-800">{mostrarNumero(pendientePorCalidad[calidad.id] || 0)} kg</dd>
                  </div>
                  {calidad.margenProductorCopKg != null && (
                    <div className="col-span-2">
                      <dt className="text-slate-500">Precio menos costo de producción</dt>
                      <dd className={`font-semibold ${calidad.debajoCostoProduccion ? 'text-rose-700' : 'text-slate-800'}`}>
                        {mostrarPesos(calidad.margenProductorCopKg)}/kg
                      </dd>
                    </div>
                  )}
                </dl>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Matriz de reglas */}
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Reglas del recomendador</h2>
            <p className="mt-0.5 text-xs text-slate-500">Posición del precio × cobertura de caja. El recuadro marcado es la situación de hoy.</p>
          </div>
          {!permisos.puedeGestionarReglas && <span className="text-[11px] text-slate-500">Solo el Gerente puede editarlas.</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-xs">
            <thead>
              <tr>
                <th className="w-28 p-2 text-[10px] uppercase tracking-wide text-slate-500">Precio \ Caja</th>
                {COBERTURAS.map((c) => (
                  <th key={c} className="p-2 text-[10px] uppercase tracking-wide text-slate-500">{ETIQUETA_COBERTURA[c]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {NIVELES.map((nivel) => (
                <tr key={nivel}>
                  <th className="border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-slate-700">{ETIQUETA_NIVEL[nivel]}</th>
                  {COBERTURAS.map((cobertura) => {
                    const regla = matriz[`${nivel}|${cobertura}`];
                    return regla ? (
                      <CeldaRegla
                        key={cobertura}
                        regla={regla}
                        activa={calculo.nivelPrecio === nivel && calculo.cobertura === cobertura}
                        puedeEditar={permisos.puedeGestionarReglas && reglasCompra.length > 0}
                        onGuardar={guardarRegla}
                      />
                    ) : <td key={cobertura} className="border border-slate-200 p-2">—</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 flex items-start gap-1.5 text-[11px] text-slate-500">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Además, si el precio de compra de una calidad queda bajo su costo de producción, esa calidad pasa a rojo (alerta de precio de equilibrio).
        </p>
      </section>

      {/* Decisiones sobre alertas */}
      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Decisiones sobre alertas validadas</h2>
            <p className="mt-0.5 text-xs text-slate-500">Cada tipo de evento tiene una acción sugerida y un área responsable.</p>
          </div>
          <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5">
            {['pendiente', 'aceptada', 'descartada', 'todas'].map((opcion) => (
              <button
                key={opcion}
                type="button"
                onClick={() => setFiltroDecision(opcion)}
                className={`rounded px-2.5 py-1 text-xs font-medium capitalize ${filtroDecision === opcion ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                {opcion}
              </button>
            ))}
          </div>
        </div>

        {!permisos.puedeAprobarDecisiones && (
          <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 p-3 text-xs text-slate-700">
            <ShieldAlert className="h-4 w-4 shrink-0 text-slate-500" />
            Rol {rol}: puedes consultar; aceptar o descartar requiere el rol Gerente.
          </div>
        )}

        {alertasFiltradas.length === 0 ? (
          <p className="p-8 text-center text-xs text-slate-500">No hay alertas validadas con ese estado.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {alertasFiltradas.map((alerta) => {
              const regla = reglasNoticias[alerta.tipo_evento];
              const efecto = EFECTOS_PRECIO[alerta.efecto_precio];
              const ocupado = procesandoId === alerta.id;
              return (
                <li key={alerta.id} className="p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        {nombreDriver(alerta.factor)} · {nombreTipoEvento(alerta.tipo_evento)}
                      </p>
                      <p className="text-sm font-semibold leading-snug text-slate-900">{alerta.titulo}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">{alerta.fuente} · {formatearFechaPublicacion(alerta.fecha_publicacion)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {efecto && <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${efecto.clase}`}>{efecto.etiqueta}</span>}
                      {alerta.puntaje && <NivelBadge nivel={alerta.nivel} puntaje={alerta.puntaje} size="sm" />}
                    </div>
                  </div>
                  <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs">
                    <p className="flex items-center gap-1.5 font-semibold text-slate-900">
                      <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
                      {regla?.accion || 'No hay una acción configurada para este tipo de evento.'}
                    </p>
                    <p className="mt-1 text-slate-600">
                      Responsable: <strong>{regla?.area_responsable || 'Sin asignar'}</strong>
                      {regla?.supuestos && <> · {regla.supuestos}</>}
                    </p>
                    {alerta.recomendacion_texto && <p className="mt-2 text-slate-700">{alerta.recomendacion_texto}</p>}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                    <span className="mr-auto text-xs text-slate-500">Decisión: <strong className="capitalize text-slate-800">{alerta.decision}</strong></span>
                    <button type="button" onClick={() => cambiarDecision(alerta.id, 'aceptada')}
                      disabled={ocupado || alerta.decision === 'aceptada' || !permisos.puedeAprobarDecisiones}
                      className="inline-flex items-center gap-1 rounded bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-40">
                      <Check className="h-3.5 w-3.5" /> Aceptar
                    </button>
                    <button type="button" onClick={() => cambiarDecision(alerta.id, 'descartada')}
                      disabled={ocupado || alerta.decision === 'descartada' || !permisos.puedeAprobarDecisiones}
                      className="inline-flex items-center gap-1 rounded bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-300 disabled:opacity-40">
                      <XCircle className="h-3.5 w-3.5" /> Descartar
                    </button>
                    {alerta.decision !== 'pendiente' && (
                      <button type="button" onClick={() => cambiarDecision(alerta.id, 'pendiente')}
                        disabled={ocupado || !permisos.puedeAprobarDecisiones}
                        className="inline-flex items-center gap-1 px-2 py-1.5 text-xs text-slate-500 hover:text-slate-800 disabled:opacity-30">
                        <RotateCcw className="h-3.5 w-3.5" /> Reabrir
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
