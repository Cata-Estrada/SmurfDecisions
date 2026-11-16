import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react';
import { getPrecioCacaoMercado } from '../lib/dataService';

const RANGOS = [
  { etiqueta: '5D', dias: 5 },
  { etiqueta: '1M', dias: 30 },
  { etiqueta: '6M', dias: 183 },
  { etiqueta: '1A', dias: 365 },
  { etiqueta: '5A', dias: 1826 }
];

const formatoPrecio = new Intl.NumberFormat('es-CO', {
  maximumFractionDigits: 2
});

function mostrarFecha(timestamp, detallada = false) {
  return new Intl.DateTimeFormat('es-CO', detallada
    ? { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' }
    : { day: '2-digit', month: 'short', timeZone: 'America/Bogota' }
  ).format(new Date(timestamp));
}

function dibujarGrafica(puntos) {
  const ancho = 1000;
  const alto = 360;
  const margen = { arriba: 24, derecha: 28, abajo: 48, izquierda: 82 };
  const anchoGrafica = ancho - margen.izquierda - margen.derecha;
  const altoGrafica = alto - margen.arriba - margen.abajo;
  const valores = puntos.map((punto) => punto.price);
  const minimo = Math.min(...valores);
  const maximo = Math.max(...valores);
  const rango = maximo - minimo || Math.max(maximo * 0.02, 1);
  const inferior = minimo - rango * 0.08;
  const superior = maximo + rango * 0.08;
  const primero = puntos[0].timestamp;
  const ultimo = puntos[puntos.length - 1].timestamp;
  const rangoTiempo = ultimo - primero;
  const coordenadas = puntos.map((punto, indice) => ({
    x: margen.izquierda + (puntos.length < 2
      ? anchoGrafica / 2
      : (punto.timestamp - primero) / rangoTiempo * anchoGrafica),
    y: margen.arriba + (superior - punto.price) / (superior - inferior) * altoGrafica,
    punto,
    indice
  }));
  const linea = coordenadas.map(({ x, y }) => `${x},${y}`).join(' ');
  const guias = [0, 0.5, 1].map((fraccion) => ({
    y: margen.arriba + fraccion * altoGrafica,
    precio: superior - fraccion * (superior - inferior)
  }));
  const etiquetas = [...new Set([0, Math.floor((puntos.length - 1) / 2), puntos.length - 1])];

  return (
    <svg
      viewBox={`0 0 ${ancho} ${alto}`}
      className="block h-[300px] w-full sm:h-[390px]"
      role="img"
      aria-label={`Historial diario de futuros de cacao ICE, en dólares por tonelada, ${puntos.length} observaciones`}
      preserveAspectRatio="none"
    >
      {guias.map(({ y, precio }) => (
        <g key={y}>
          <line x1={margen.izquierda} x2={ancho - margen.derecha} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="5 5" />
          <text x={margen.izquierda - 12} y={y + 5} textAnchor="end" fill="#64748b" fontSize="13">
            {formatoPrecio.format(precio)}
          </text>
        </g>
      ))}
      {puntos.length > 1 && (
        <polyline points={linea} fill="none" stroke="#047857" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      )}
      {coordenadas.map(({ x, y, punto, indice }) => (
        <circle
          key={`${punto.timestamp}-${indice}`}
          cx={x}
          cy={y}
          r={indice === coordenadas.length - 1 ? 5 : 2}
          fill="#047857"
        >
          <title>{`${mostrarFecha(punto.timestamp, true)} · US$ ${formatoPrecio.format(punto.price)} / t`}</title>
        </circle>
      ))}
      {etiquetas.map((indice) => {
        const { x, punto } = coordenadas[indice];
        return (
          <text
            key={`fecha-${punto.timestamp}`}
            x={x}
            y={alto - 14}
            textAnchor={indice === 0 ? 'start' : indice === puntos.length - 1 ? 'end' : 'middle'}
            fill="#64748b"
            fontSize="12"
          >
            {mostrarFecha(punto.timestamp)}
          </text>
        );
      })}
    </svg>
  );
}

export default function PrecioCacaoChart({ onDataChange }) {
  const [rango, setRango] = useState(2);
  const [mercado, setMercado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [recarga, setRecarga] = useState(0);
  const ultimaConsultaTrm = useRef(0);

  useEffect(() => {
    let vigente = true;
    const cargarCotizacion = async (forzarTrm = false) => {
      setCargando(true);
      setError('');
      try {
        const consultarTrm = forzarTrm ||
          Date.now() - ultimaConsultaTrm.current >= 24 * 60 * 60 * 1000;
        const datos = await getPrecioCacaoMercado({ includeTrm: consultarTrm });
        if (!vigente) return;
        setMercado(datos);
        if (consultarTrm) ultimaConsultaTrm.current = Date.now();
        onDataChange(datos);
      } catch (errorCarga) {
        if (!vigente) return;
        setError(errorCarga.message || 'No se pudo consultar la cotización de cacao.');
        onDataChange(null);
      } finally {
        if (vigente) setCargando(false);
      }
    };

    cargarCotizacion(true);
    const timer = window.setInterval(() => cargarCotizacion(), 5 * 60 * 1000);
    return () => {
      vigente = false;
      window.clearInterval(timer);
    };
  }, [recarga, onDataChange]);

  const puntos = useMemo(() => {
    if (!mercado?.points?.length) return [];
    const fechaDesde = Date.now() - RANGOS[rango].dias * 24 * 60 * 60 * 1000;
    return mercado.points.filter((punto) => punto.timestamp >= fechaDesde);
  }, [mercado, rango]);

  const cotizacion = mercado?.quote;
  const cambio = cotizacion?.changePercent;

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Cacao · futuros ICE</p>
          <h3 className="mt-1 text-sm font-bold text-slate-900">Precio internacional de referencia</h3>
          <p className="mt-1 text-xs text-slate-500">Contrato continuo CC=F · cotización en USD por tonelada</p>
        </div>
        <div className="flex items-center gap-3">
          {cotizacion && (
            <div className="text-right">
              <p className="text-2xl font-bold tracking-tight text-slate-900">
                US$ {formatoPrecio.format(cotizacion.price)}
                <span className="ml-1 text-sm font-medium text-slate-500">/ t</span>
              </p>
              {Number.isFinite(cambio) && (
                <p className={`text-xs font-semibold ${cambio >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {cambio > 0 ? '+' : ''}{formatoPrecio.format(cambio)} % hoy
                </p>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => setRecarga((valor) => valor + 1)}
            disabled={cargando}
            aria-label="Actualizar cotización"
            title="Actualizar precio"
            className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${cargando ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-1" aria-label="Periodo del gráfico">
          {RANGOS.map((item, indice) => (
            <button
              key={item.etiqueta}
              type="button"
              onClick={() => setRango(indice)}
              aria-pressed={rango === indice}
              className={`rounded px-2.5 py-1.5 text-xs font-semibold ${
                rango === indice ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {item.etiqueta}
            </button>
          ))}
        </div>
        {cotizacion && (
          <p className="text-[11px] text-slate-500">
            Último dato: {mostrarFecha(cotizacion.timestamp, true)}
          </p>
        )}
      </div>

      {error ? (
        <div role="alert" className="flex min-h-[340px] flex-col items-center justify-center gap-3 px-5 text-center">
          <AlertTriangle className="h-6 w-6 text-amber-600" />
          <p className="max-w-xl text-sm text-slate-700">{error}</p>
          <button
            type="button"
            onClick={() => setRecarga((valor) => valor + 1)}
            className="rounded-md bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
          >
            Reintentar
          </button>
        </div>
      ) : cargando && !mercado ? (
        <div className="flex h-[340px] items-center justify-center text-sm text-slate-500">
          Cargando precio e historial del cacao…
        </div>
      ) : (
        <div className="px-2 pt-2 sm:px-4">
          {cargando && <p className="px-2 text-[11px] text-slate-500">Actualizando cotización…</p>}
          {puntos.length > 0 ? dibujarGrafica(puntos) : (
            <div className="flex h-[340px] items-center justify-center px-5 text-center text-sm text-slate-500">
              No hay observaciones disponibles para este periodo.
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3 text-[11px] leading-relaxed text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <p>
          Yahoo Finance ofrece datos de futuros ICE como referencia de prototipo, no fuente oficial ni licenciada para uso comercial. Puede tener retraso o cambiar sin aviso.
        </p>
        <a
          href="https://finance.yahoo.com/quote/CC%3DF/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1 font-medium text-emerald-800 hover:text-emerald-950"
        >
          Ver fuente <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
