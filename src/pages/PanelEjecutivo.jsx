// ==============================================================================
// Panel de compra · Coagropacífico
// Precio por kilo y semáforo por calidad, capital requerido frente a caja,
// cobertura, alertas abiertas y ventana de compra recomendada.
// ==============================================================================
import React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  Newspaper,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../lib/authContext';
import { usePanelCompra } from '../lib/useCompraCacao';
import { ETIQUETA_COBERTURA, ETIQUETA_NIVEL } from '../lib/compraCacao';
import { EFECTOS_PRECIO, nombreDriver } from '../lib/catalogos';
import { mostrarMillones, mostrarNumero, mostrarPesos, mostrarPorcentaje } from '../lib/formato';
import Semaforo, { estiloSemaforo } from '../components/Semaforo';

const SEMAFORO_COBERTURA = { holgada: 'verde', ajustada: 'amarillo', deficit: 'rojo' };
const SEMAFORO_NIVEL = { bajo: 'verde', medio: 'amarillo', alto: 'rojo' };

function Tarjeta({ titulo, valor, detalle, children }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{titulo}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">{valor}</p>
      {detalle && <p className="mt-1 text-xs text-slate-500">{detalle}</p>}
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}

export default function PanelEjecutivo() {
  const { empresaId, empresa } = useAuth();
  const {
    cargando,
    error,
    errorMercado,
    configuracion,
    alertas,
    cotizacion,
    precioActual,
    mercado,
    calculo,
    recargar
  } = usePanelCompra(empresaId);

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-slate-500">
        <Clock className="mr-2 h-5 w-5 animate-spin" />
        Cargando precio de bolsa, caja y calidades…
      </div>
    );
  }

  if (error) {
    return <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>;
  }

  const alertasAbiertas = alertas
    .filter((a) => a.estado !== 'descartada' && a.decision === 'pendiente')
    .sort((a, b) => (b.puntaje || 0) - (a.puntaje || 0));
  const trmOficial = cotizacion?.trm?.value ?? null;
  const trmUsada = Number(configuracion.trm_cop) || null;
  const trmDesfase = trmOficial && trmUsada ? (trmUsada - trmOficial) / trmOficial * 100 : null;
  const recomendacion = calculo.recomendacion;
  const estiloVentana = estiloSemaforo(recomendacion?.semaforo);
  const hayPerdida = calculo.calidades.some((c) => c.debajoCostoProduccion);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{empresa} · Cacao</p>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900">Panel de compra</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            ¿Cuánto capital hace falta para comprar cacao al precio de hoy y conviene comprar ahora? Reglas claras, no pronósticos.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={recargar}
            className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Actualizar
          </button>
          <Link
            to="/dashboard/simulador"
            className="inline-flex items-center gap-1.5 rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
          >
            Abrir simulador
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {errorMercado && (
        <div role="alert" className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          {errorMercado}
        </div>
      )}

      {/* Ventana de compra recomendada */}
      <section className={`rounded-lg border p-5 ${recomendacion ? estiloVentana.caja : 'border-slate-200 bg-white'}`}>
        <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">Ventana de compra recomendada</p>
        {recomendacion ? (
          <>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold">{recomendacion.titulo}</h2>
              <Semaforo color={recomendacion.semaforo} />
            </div>
            <p className="mt-1 text-sm">{recomendacion.recomendacion}</p>
            <p className="mt-2 text-xs opacity-80">
              Precio {ETIQUETA_NIVEL[calculo.nivelPrecio]?.toLowerCase()} frente a los últimos {mercado.ventanaDias} días
              {' '}· caja {ETIQUETA_COBERTURA[calculo.cobertura]?.toLowerCase()} ({mostrarPorcentaje(calculo.coberturaPct)} de cobertura).
            </p>
          </>
        ) : (
          <p className="mt-1 text-sm text-slate-600">
            {calculo.listo
              ? `Faltan cierres de bolsa en la ventana de ${mercado.ventanaDias} días para ubicar el precio.`
              : 'Faltan parámetros o calidades por completar. Complétalos en el simulador de capital.'}
          </p>
        )}
      </section>

      {(mercado.alertaVariacion || hayPerdida) && (
        <div className="space-y-2">
          {mercado.alertaVariacion && (
            <div role="alert" className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              La bolsa se movió {mostrarPorcentaje(mercado.variacionPct, { signo: true })} en {mercado.diasVariacion} días hábiles (umbral {mostrarNumero(mercado.umbralVariacion)} %).
            </div>
          )}
          {hayPerdida && (
            <div role="alert" className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              Alerta de precio de equilibrio: el precio de compra de al menos una calidad queda bajo su costo de producción.
            </div>
          )}
        </div>
      )}

      {/* Indicadores */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tarjeta
          titulo="Bolsa Nueva York"
          valor={precioActual ? `US$ ${mostrarNumero(precioActual, { maximumFractionDigits: 0 })}/t` : '—'}
          detalle={mercado.variacionPct !== null
            ? `${mostrarPorcentaje(mercado.variacionPct, { signo: true })} en ${mercado.diasVariacion} días hábiles`
            : 'Sin variación disponible'}
        >
          {mercado.nivelPrecio && (
            <Semaforo color={SEMAFORO_NIVEL[mercado.nivelPrecio]} etiqueta={`Precio ${ETIQUETA_NIVEL[mercado.nivelPrecio].toLowerCase()}`} />
          )}
        </Tarjeta>
        <Tarjeta
          titulo="TRM del cálculo"
          valor={mostrarPesos(trmUsada, 2)}
          detalle={trmOficial
            ? `Oficial hoy: ${mostrarPesos(trmOficial, 2)}${trmDesfase !== null && Math.abs(trmDesfase) >= 0.5 ? ` (${mostrarPorcentaje(trmDesfase, { signo: true })})` : ''}`
            : 'TRM oficial no disponible'}
        />
        <Tarjeta
          titulo="Capital requerido"
          valor={mostrarMillones(calculo.capitalRequerido)}
          detalle={`Caja disponible: ${mostrarMillones(configuracion.caja_disponible_cop)}`}
        >
          {calculo.cobertura && (
            <Semaforo
              color={SEMAFORO_COBERTURA[calculo.cobertura]}
              etiqueta={`Cobertura ${mostrarPorcentaje(calculo.coberturaPct)} · ${ETIQUETA_COBERTURA[calculo.cobertura]}`}
            />
          )}
        </Tarjeta>
        <Tarjeta
          titulo={calculo.brechaCop > 0 ? 'Falta de caja' : 'Caja de sobra'}
          valor={calculo.listo ? mostrarMillones(Math.abs(calculo.brechaCop)) : '—'}
          detalle={calculo.bolsaMaximaUsdT > 0
            ? `La caja soporta una bolsa de hasta US$ ${mostrarNumero(calculo.bolsaMaximaUsdT, { maximumFractionDigits: 0 })}/t`
            : null}
        />
      </section>

      {/* Calidades */}
      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Precio por kilo y semáforo por calidad</h2>
            <p className="mt-0.5 text-xs text-slate-500">Rango esperado: el precio por kilo si la bolsa estuviera en su P25 y su P75 de {mercado.ventanaDias} días.</p>
          </div>
        </div>
        {calculo.calidades.length === 0 ? (
          <p className="p-6 text-center text-xs text-slate-500">
            No hay calidades registradas. <Link to="/dashboard/simulador" className="font-semibold text-emerald-700 underline">Agrégalas en el simulador</Link>.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2">Calidad</th>
                  <th className="px-4 py-2 text-right">Precio de compra</th>
                  <th className="px-4 py-2 text-right">Rango P25 – P75</th>
                  <th className="px-4 py-2 text-right">Volumen</th>
                  <th className="px-4 py-2 text-right">Capital</th>
                  <th className="px-4 py-2">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {calculo.calidades.map((calidad) => (
                  <tr key={calidad.id || calidad.nombre}>
                    <td className="px-4 py-3 font-semibold text-slate-800">{calidad.nombre}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {calidad.lista ? `${mostrarPesos(calidad.precioCompraCopKg)}/kg` : 'Incompleta'}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {calidad.percentil25CopKg != null
                        ? `${mostrarPesos(calidad.percentil25CopKg)} – ${mostrarPesos(calidad.percentil75CopKg)}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{mostrarNumero(calidad.volumen_kg)} kg</td>
                    <td className="px-4 py-3 text-right text-slate-600">{mostrarMillones(calidad.capitalConAcopio)}</td>
                    <td className="px-4 py-3">
                      {calidad.recomendacion ? (
                        <div className="space-y-1">
                          <Semaforo color={calidad.semaforo} etiqueta={calidad.recomendacion.titulo} />
                          {calidad.debajoCostoProduccion && (
                            <p className="text-[11px] text-rose-700">Bajo el costo de producción</p>
                          )}
                        </div>
                      ) : calidad.debajoCostoProduccion ? (
                        <Semaforo color="rojo" etiqueta="Bajo el costo de producción" />
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Alertas abiertas */}
      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <div className="flex items-center gap-2">
            <Newspaper className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-900">Alertas abiertas</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">{alertasAbiertas.length}</span>
          </div>
          <Link to="/dashboard/noticias" className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900">
            Ver noticias
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {alertasAbiertas.length === 0 ? (
          <p className="p-6 text-center text-xs text-slate-500">No hay alertas abiertas.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {alertasAbiertas.slice(0, 5).map((alerta) => {
              const efecto = EFECTOS_PRECIO[alerta.efecto_precio];
              return (
                <li key={alerta.id} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{nombreDriver(alerta.factor)}</p>
                    <p className="text-sm font-semibold leading-snug text-slate-900">{alerta.titulo}</p>
                    {alerta.resumen && <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">{alerta.resumen}</p>}
                  </div>
                  {efecto && (
                    <span className={`shrink-0 self-start rounded-full border px-2 py-0.5 text-[11px] font-semibold ${efecto.clase}`}>
                      {efecto.etiqueta}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="text-[11px] text-slate-500">
        Bolsa: futuro de cacao ICE (CC=F) vía Yahoo Finance, fuente no oficial que puede tener retraso.
        {' '}TRM: Superintendencia Financiera. Calidades, caja y umbrales: parámetros de la cooperativa.
      </p>
    </div>
  );
}
