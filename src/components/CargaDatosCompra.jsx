// ==============================================================================
// Carga de datos de compra: precio diario de bolsa, caja y plan de compras.
// Las calidades se editan en el Simulador de capital.
// ==============================================================================
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus, Coins, LineChart, Plus, Save, Trash2 } from 'lucide-react';
import { useAuth } from '../lib/authContext';
import {
  eliminarTramoPlan,
  getDatosCompraCacao,
  getHistorialCaja,
  getPlanCompras,
  getPrecioCacaoMercado,
  getValoresIndicadores,
  guardarTramoPlan,
  registrarCajaConFecha,
  registrarValorIndicador
} from '../lib/dataService';
import { mostrarNumero, mostrarPesos } from '../lib/formato';
import { formatearFechaPublicacion } from '../lib/fechas';

const ESTADOS_TRAMO = { planeado: 'Planeado', comprado: 'Comprado', cancelado: 'Cancelado' };

function hoyBogota() {
  return new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function fechaDeTimestamp(ms) {
  return new Date(ms - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

const inputClass = 'w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-100';
const labelClass = 'mb-1 block text-[11px] font-medium text-slate-600';

function Seccion({ icono: Icono, titulo, descripcion, children }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-start gap-2 border-b border-slate-100 pb-3">
        <Icono className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
        <div>
          <h3 className="text-sm font-bold text-slate-900">{titulo}</h3>
          <p className="mt-0.5 text-xs text-slate-500">{descripcion}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Mensaje({ mensaje }) {
  if (!mensaje) return null;
  return (
    <p role={mensaje.error ? 'alert' : 'status'} className={`mt-3 rounded border p-2 text-xs ${mensaje.error ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
      {mensaje.texto}
    </p>
  );
}

function PrecioDiario({ empresaId, puedeEditar }) {
  const [valores, setValores] = useState([]);
  const [form, setForm] = useState({ fecha: hoyBogota(), valor: '' });
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  async function cargar() {
    const { data } = await getValoresIndicadores(empresaId);
    setValores(data.filter((v) => ['CACAO_NY', 'CACAO_LON'].includes(v.indicador_codigo)).slice(0, 12));
  }
  useEffect(() => { cargar().catch((e) => setMensaje({ error: true, texto: e.message })); }, [empresaId]);

  async function guardar(fila, fuente) {
    setOcupado(true);
    setMensaje(null);
    try {
      await registrarValorIndicador({ codigo: 'CACAO_NY', fecha: fila.fecha, valor: Number(fila.valor), fuente });
      setMensaje({ texto: `Precio del ${formatearFechaPublicacion(fila.fecha)} guardado.` });
      setForm({ fecha: hoyBogota(), valor: '' });
      await cargar();
    } catch (e) {
      setMensaje({ error: true, texto: e.message });
    } finally {
      setOcupado(false);
    }
  }

  async function traerDeYahoo() {
    setOcupado(true);
    setMensaje(null);
    try {
      const datos = await getPrecioCacaoMercado({ includeTrm: false, includeLondres: true });
      const ultimo = datos.points[datos.points.length - 1];
      await guardar({ fecha: fechaDeTimestamp(ultimo.timestamp), valor: ultimo.price }, 'Yahoo Finance · CC=F');
      if (datos.londres?.gbpT) {
        await registrarValorIndicador({
          codigo: 'CACAO_LON', fecha: datos.londres.fecha, valor: datos.londres.gbpT, fuente: 'ICCO · Londres'
        });
        setMensaje({ texto: `Guardados Nueva York (${formatearFechaPublicacion(fechaDeTimestamp(ultimo.timestamp))}) y Londres (${formatearFechaPublicacion(datos.londres.fecha)}).` });
        await cargar();
      }
    } catch (e) {
      setMensaje({ error: true, texto: e.message });
      setOcupado(false);
    }
  }

  return (
    <Seccion
      icono={LineChart}
      titulo="Precio diario de bolsa"
      descripcion="Deja registro del cierre del futuro de Nueva York (USD/t). Los cálculos usan la cotización en vivo; este registro sirve de historial propio y de respaldo."
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
        <div>
          <label className={labelClass} htmlFor="precio-fecha">Fecha</label>
          <input id="precio-fecha" type="date" className={inputClass} value={form.fecha} max={hoyBogota()}
            onChange={(e) => setForm({ ...form, fecha: e.target.value })} disabled={!puedeEditar} />
        </div>
        <div>
          <label className={labelClass} htmlFor="precio-valor">Precio (USD/t)</label>
          <input id="precio-valor" type="number" min="1" step="1" className={inputClass} value={form.valor}
            onChange={(e) => setForm({ ...form, valor: e.target.value })} disabled={!puedeEditar} />
        </div>
        <button type="button" onClick={() => guardar(form, 'Registro manual')}
          disabled={!puedeEditar || ocupado || !form.fecha || !(Number(form.valor) > 0)}
          className="inline-flex items-center justify-center gap-1 rounded bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
          <Save className="h-3.5 w-3.5" /> Guardar
        </button>
        <button type="button" onClick={traerDeYahoo} disabled={!puedeEditar || ocupado}
          className="rounded border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          Guardar últimos cierres (NY y Londres)
        </button>
      </div>
      <Mensaje mensaje={mensaje} />
      {valores.length > 0 && (
        <table className="mt-4 w-full text-left text-xs">
          <thead className="text-[10px] uppercase tracking-wide text-slate-500">
            <tr><th className="py-1">Fecha</th><th className="py-1">Bolsa</th><th className="py-1 text-right">Precio</th><th className="py-1">Fuente</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100 tabular-nums">
            {valores.map((v) => (
              <tr key={v.id}>
                <td className="py-1.5">{formatearFechaPublicacion(v.fecha)}</td>
                <td className="py-1.5">{v.indicador_codigo === 'CACAO_LON' ? 'Londres' : 'Nueva York'}</td>
                <td className="py-1.5 text-right font-semibold">{v.indicador_codigo === 'CACAO_LON' ? '£' : 'US$'} {mostrarNumero(v.valor)}</td>
                <td className="py-1.5 text-slate-500">{v.fuente}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Seccion>
  );
}

function Caja({ empresaId, usuarioId, puedeEditar }) {
  const [historial, setHistorial] = useState([]);
  const [form, setForm] = useState({ fecha: hoyBogota(), disponible_cop: '', nota: '' });
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  async function cargar() { setHistorial(await getHistorialCaja(empresaId, 10)); }
  useEffect(() => { cargar().catch((e) => setMensaje({ error: true, texto: e.message })); }, [empresaId]);

  async function guardar() {
    setOcupado(true);
    setMensaje(null);
    try {
      await registrarCajaConFecha(empresaId, usuarioId, { ...form, disponible_cop: Number(form.disponible_cop) });
      setMensaje({ texto: 'Caja registrada. Es la que usan ahora el panel y el simulador.' });
      setForm({ fecha: hoyBogota(), disponible_cop: '', nota: '' });
      await cargar();
    } catch (e) {
      setMensaje({ error: true, texto: e.message });
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Seccion icono={Coins} titulo="Caja disponible" descripcion="Cada registro guarda el saldo de una fecha. Los cálculos usan el más reciente.">
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_2fr_auto] sm:items-end">
        <div>
          <label className={labelClass} htmlFor="caja-fecha">Fecha</label>
          <input id="caja-fecha" type="date" className={inputClass} value={form.fecha} max={hoyBogota()}
            onChange={(e) => setForm({ ...form, fecha: e.target.value })} disabled={!puedeEditar} />
        </div>
        <div>
          <label className={labelClass} htmlFor="caja-valor">Disponible (COP)</label>
          <input id="caja-valor" type="number" min="0" step="1" className={inputClass} value={form.disponible_cop}
            onChange={(e) => setForm({ ...form, disponible_cop: e.target.value })} disabled={!puedeEditar} />
        </div>
        <div>
          <label className={labelClass} htmlFor="caja-nota">Nota (opcional)</label>
          <input id="caja-nota" type="text" className={inputClass} value={form.nota} placeholder="Ej. Anticipo recibido"
            onChange={(e) => setForm({ ...form, nota: e.target.value })} disabled={!puedeEditar} />
        </div>
        <button type="button" onClick={guardar}
          disabled={!puedeEditar || ocupado || !form.fecha || form.disponible_cop === '' || Number(form.disponible_cop) < 0}
          className="inline-flex items-center justify-center gap-1 rounded bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
          <Save className="h-3.5 w-3.5" /> Registrar
        </button>
      </div>
      <Mensaje mensaje={mensaje} />
      {historial.length > 0 && (
        <table className="mt-4 w-full text-left text-xs">
          <thead className="text-[10px] uppercase tracking-wide text-slate-500">
            <tr><th className="py-1">Fecha</th><th className="py-1 text-right">Disponible</th><th className="py-1 pl-4">Nota</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100 tabular-nums">
            {historial.map((fila, i) => (
              <tr key={fila.id}>
                <td className="py-1.5">{formatearFechaPublicacion(fila.fecha)}{i === 0 && <span className="ml-2 rounded bg-emerald-100 px-1.5 text-[10px] font-semibold text-emerald-800">Vigente</span>}</td>
                <td className="py-1.5 text-right font-semibold">{mostrarPesos(fila.disponible_cop)}</td>
                <td className="py-1.5 pl-4 text-slate-500">{fila.nota || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Seccion>
  );
}

function PlanCompras({ empresaId, puedeEditar }) {
  const [calidades, setCalidades] = useState([]);
  const [tramos, setTramos] = useState([]);
  const [form, setForm] = useState({ calidad_id: '', fecha_objetivo: hoyBogota(), volumen_kg: '', notas: '' });
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  async function cargar() {
    const [datos, plan] = await Promise.all([getDatosCompraCacao(empresaId), getPlanCompras(empresaId)]);
    setCalidades(datos.calidades);
    setTramos(plan);
  }
  useEffect(() => { cargar().catch((e) => setMensaje({ error: true, texto: e.message })); }, [empresaId]);

  const nombreCalidad = (id) => calidades.find((c) => c.id === id)?.nombre || '—';

  async function ejecutar(accion, textoOk) {
    setOcupado(true);
    setMensaje(null);
    try {
      await accion();
      setMensaje({ texto: textoOk });
      await cargar();
    } catch (e) {
      setMensaje({ error: true, texto: e.message });
    } finally {
      setOcupado(false);
    }
  }

  function agregar() {
    ejecutar(async () => {
      await guardarTramoPlan(empresaId, { ...form, volumen_kg: Number(form.volumen_kg) });
      setForm({ ...form, volumen_kg: '', notas: '' });
    }, 'Tramo agregado al plan.');
  }

  const pendientes = tramos.filter((t) => t.estado === 'planeado');
  const totalPendiente = pendientes.reduce((suma, t) => suma + Number(t.volumen_kg), 0);

  return (
    <Seccion
      icono={CalendarPlus}
      titulo="Plan de compras"
      descripcion="Tramos programados por calidad y fecha. El recomendador muestra cuánto queda pendiente de cada calidad."
    >
      {calidades.length === 0 ? (
        <p className="text-xs text-slate-500">
          Primero registra las calidades en el <Link to="/dashboard/simulador" className="font-semibold text-emerald-700 underline">simulador de capital</Link>.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-[1.2fr_1fr_1fr_2fr_auto] sm:items-end">
          <div>
            <label className={labelClass} htmlFor="plan-calidad">Calidad</label>
            <select id="plan-calidad" className={inputClass} value={form.calidad_id}
              onChange={(e) => setForm({ ...form, calidad_id: e.target.value })} disabled={!puedeEditar}>
              <option value="">Selecciona…</option>
              {calidades.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="plan-fecha">Fecha objetivo</label>
            <input id="plan-fecha" type="date" className={inputClass} value={form.fecha_objetivo}
              onChange={(e) => setForm({ ...form, fecha_objetivo: e.target.value })} disabled={!puedeEditar} />
          </div>
          <div>
            <label className={labelClass} htmlFor="plan-volumen">Volumen (kg)</label>
            <input id="plan-volumen" type="number" min="1" step="1" className={inputClass} value={form.volumen_kg}
              onChange={(e) => setForm({ ...form, volumen_kg: e.target.value })} disabled={!puedeEditar} />
          </div>
          <div>
            <label className={labelClass} htmlFor="plan-notas">Notas (opcional)</label>
            <input id="plan-notas" type="text" className={inputClass} value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })} disabled={!puedeEditar} />
          </div>
          <button type="button" onClick={agregar}
            disabled={!puedeEditar || ocupado || !form.calidad_id || !form.fecha_objetivo || !(Number(form.volumen_kg) > 0)}
            className="inline-flex items-center justify-center gap-1 rounded bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
            <Plus className="h-3.5 w-3.5" /> Agregar
          </button>
        </div>
      )}
      <Mensaje mensaje={mensaje} />
      {tramos.length > 0 && (
        <>
          <p className="mt-4 text-xs text-slate-600">Pendiente por comprar: <strong>{mostrarNumero(totalPendiente)} kg</strong> en {pendientes.length} tramo(s).</p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead className="text-[10px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-1">Fecha</th><th className="py-1">Calidad</th><th className="py-1 text-right">Volumen</th>
                  <th className="py-1 pl-4">Estado</th><th className="py-1">Notas</th><th className="py-1" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {tramos.map((tramo) => (
                  <tr key={tramo.id} className={tramo.estado === 'cancelado' ? 'text-slate-400' : ''}>
                    <td className="py-1.5">{formatearFechaPublicacion(tramo.fecha_objetivo)}</td>
                    <td className="py-1.5 font-semibold">{nombreCalidad(tramo.calidad_id)}</td>
                    <td className="py-1.5 text-right">{mostrarNumero(tramo.volumen_kg)} kg</td>
                    <td className="py-1.5 pl-4">
                      <select
                        value={tramo.estado}
                        onChange={(e) => ejecutar(() => guardarTramoPlan(empresaId, { ...tramo, estado: e.target.value }), 'Estado del tramo actualizado.')}
                        disabled={!puedeEditar || ocupado}
                        className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs"
                        aria-label="Estado del tramo"
                      >
                        {Object.entries(ESTADOS_TRAMO).map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}
                      </select>
                    </td>
                    <td className="py-1.5 text-slate-500">{tramo.notas || '—'}</td>
                    <td className="py-1.5 text-right">
                      <button type="button"
                        onClick={() => window.confirm('¿Eliminar este tramo del plan?') && ejecutar(() => eliminarTramoPlan(empresaId, tramo.id), 'Tramo eliminado.')}
                        disabled={!puedeEditar || ocupado} className="text-slate-400 hover:text-rose-700 disabled:opacity-30" aria-label="Eliminar tramo">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Seccion>
  );
}

export default function CargaDatosCompra() {
  const { empresaId, user, permisos } = useAuth();
  const puedeEditar = permisos.puedeEditarRiesgos;
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Carga de datos de compra</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Las calidades, la TRM y los umbrales se editan en el <Link to="/dashboard/simulador" className="font-semibold text-emerald-700 underline">simulador de capital</Link>.
          </p>
        </div>
        {!puedeEditar && <span className="text-[11px] text-slate-500">Tu rol solo permite consultar.</span>}
      </div>
      <Caja empresaId={empresaId} usuarioId={user?.id} puedeEditar={puedeEditar} />
      <PlanCompras empresaId={empresaId} puedeEditar={puedeEditar} />
      <PrecioDiario empresaId={empresaId} puedeEditar={puedeEditar} />
    </div>
  );
}
