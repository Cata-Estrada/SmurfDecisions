// ==============================================================================
// Matriz de drivers del cacao · Coagropacífico
// Seis drivers que reemplazan a los factores PESTEL como núcleo del análisis;
// la equivalencia con PESTEL se conserva como referencia.
// ==============================================================================
import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { getAlertas } from '../lib/dataService';
import { useAuth } from '../lib/authContext';
import { DRIVERS, EFECTOS_PRECIO, nombreTipoEvento } from '../lib/catalogos';
import { formatearFechaPublicacion } from '../lib/fechas';
import NivelBadge from '../components/NivelBadge';

function nivelPorPuntaje(puntaje) {
  if (puntaje >= 15) return 'Alto';
  if (puntaje >= 8) return 'Medio';
  return 'Bajo';
}

function Presion({ sube, baja }) {
  if (sube === 0 && baja === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
        <Minus className="h-3 w-3" /> Sin presión
      </span>
    );
  }
  if (sube > baja) {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
        <TrendingUp className="h-3 w-3" /> Presión al alza
      </span>
    );
  }
  if (baja > sube) {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-900">
        <TrendingDown className="h-3 w-3" /> Presión a la baja
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
      <Minus className="h-3 w-3" /> Señales mixtas
    </span>
  );
}

export default function AnalisisPestel() {
  const { empresaId } = useAuth();
  const [alertas, setAlertas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [activo, setActivo] = useState(DRIVERS[0].codigo);

  useEffect(() => {
    setCargando(true);
    getAlertas(empresaId)
      .then(({ data }) => setAlertas(data))
      .catch((errorCarga) => setError(errorCarga.message))
      .finally(() => setCargando(false));
  }, [empresaId]);

  const metricas = useMemo(() => DRIVERS.map((driver) => {
    const delDriver = alertas.filter((a) => a.factor === driver.codigo && a.estado === 'validada');
    const maxPuntaje = delDriver.reduce((max, a) => Math.max(max, Number(a.puntaje) || 0), 0);
    return {
      ...driver,
      alertas: [...delDriver].sort((a, b) =>
        new Date(b.fecha_publicacion || 0).getTime() - new Date(a.fecha_publicacion || 0).getTime()),
      total: delDriver.length,
      maxPuntaje,
      nivel: nivelPorPuntaje(maxPuntaje),
      sube: delDriver.filter((a) => a.efecto_precio === 'sube').length,
      baja: delDriver.filter((a) => a.efecto_precio === 'baja').length
    };
  }), [alertas]);

  if (cargando) return <div className="p-12 text-center text-sm text-slate-500">Cargando matriz de drivers…</div>;
  if (error) return <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>;

  const seleccionado = metricas.find((m) => m.codigo === activo) || metricas[0];

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-5">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Matriz de drivers del cacao</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Para una cooperativa de un solo producto, seis drivers explican casi todo el movimiento del precio. Cada uno conserva su equivalencia con PESTEL.
          El nivel es el puntaje más alto de sus alertas validadas; la presión cuenta cuántas empujan el precio al alza o a la baja.
        </p>
      </header>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[820px] text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2">Driver</th>
              <th className="px-4 py-2">Qué vigila</th>
              <th className="px-4 py-2">PESTEL</th>
              <th className="px-4 py-2">Nivel</th>
              <th className="px-4 py-2">Presión sobre el precio</th>
              <th className="px-4 py-2 text-right">Alertas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {metricas.map((m) => (
              <tr
                key={m.codigo}
                onClick={() => setActivo(m.codigo)}
                className={`cursor-pointer ${m.codigo === seleccionado.codigo ? 'bg-emerald-50/60' : 'hover:bg-slate-50'}`}
              >
                <td className="px-4 py-3">
                  <button type="button" onClick={() => setActivo(m.codigo)} className="text-left text-sm font-semibold text-slate-900 hover:underline">
                    {m.nombre}
                  </button>
                </td>
                <td className="px-4 py-3 text-slate-600">{m.queVigila}</td>
                <td className="px-4 py-3 text-slate-500">{m.pestel}</td>
                <td className="px-4 py-3">
                  {m.total > 0 ? <NivelBadge nivel={m.nivel} puntaje={m.maxPuntaje} size="sm" /> : <span className="text-slate-400">—</span>}
                </td>
                <td className="px-4 py-3"><Presion sube={m.sube} baja={m.baja} /></td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-800">{m.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4">
          <h2 className="text-sm font-bold text-slate-900">{seleccionado.nombre}</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {seleccionado.total} alerta(s) validada(s) · {seleccionado.sube} al alza · {seleccionado.baja} a la baja
          </p>
        </div>
        {seleccionado.alertas.length === 0 ? (
          <p className="p-8 text-center text-xs text-slate-500">No hay alertas validadas de este driver.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {seleccionado.alertas.map((alerta) => {
              const efecto = EFECTOS_PRECIO[alerta.efecto_precio];
              return (
                <li key={alerta.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-snug text-slate-900">{alerta.titulo}</p>
                    {alerta.resumen && <p className="mt-1 text-xs text-slate-600">{alerta.resumen}</p>}
                    <p className="mt-1 text-[11px] text-slate-500">
                      {nombreTipoEvento(alerta.tipo_evento)} · {alerta.fuente} · {formatearFechaPublicacion(alerta.fecha_publicacion)}
                      {alerta.enlace && (
                        <a href={alerta.enlace} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-0.5 font-medium text-emerald-700 hover:underline">
                          Fuente <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {efecto && <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${efecto.clase}`}>{efecto.etiqueta}</span>}
                    {alerta.puntaje && <NivelBadge nivel={alerta.nivel} puntaje={alerta.puntaje} size="sm" />}
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
