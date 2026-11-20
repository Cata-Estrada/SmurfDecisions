import React, { useMemo, useState } from 'react';
import { RotateCcw, SlidersHorizontal } from 'lucide-react';
import {
  ETIQUETA_COBERTURA,
  ETIQUETA_NIVEL,
  simularEscenario
} from '../lib/compraCacao';
import { mostrarMillones, mostrarNumero, mostrarPesos, mostrarPorcentaje } from '../lib/formato';
import Semaforo from './Semaforo';

const CONTROLES = [
  { campo: 'bolsaPct', etiqueta: 'Precio de bolsa', min: -30, max: 30 },
  { campo: 'trmPct', etiqueta: 'Dólar (TRM)', min: -20, max: 20 },
  { campo: 'volumenPct', etiqueta: 'Volumen a comprar', min: -50, max: 50 }
];

const ATAJOS = [
  { etiqueta: 'Bolsa +10 %', valores: { bolsaPct: 10, trmPct: 0, volumenPct: 0 } },
  { etiqueta: 'Bolsa −10 %', valores: { bolsaPct: -10, trmPct: 0, volumenPct: 0 } },
  { etiqueta: 'Dólar +10 %', valores: { bolsaPct: 0, trmPct: 10, volumenPct: 0 } },
  { etiqueta: 'Bolsa y dólar +10 %', valores: { bolsaPct: 10, trmPct: 10, volumenPct: 0 } }
];

const SIN_CAMBIO = { bolsaPct: 0, trmPct: 0, volumenPct: 0 };

function semaforoCobertura(cobertura) {
  return cobertura === 'holgada' ? 'verde' : cobertura === 'ajustada' ? 'amarillo' : cobertura === 'deficit' ? 'rojo' : null;
}

export default function EscenariosCapital({ configuracion, calidades, precioActual, mercado, reglas }) {
  const [variaciones, setVariaciones] = useState(SIN_CAMBIO);

  const base = useMemo(
    () => simularEscenario(configuracion, calidades, precioActual, SIN_CAMBIO, mercado, { reglas }),
    [configuracion, calidades, precioActual, mercado, reglas]
  );
  const escenario = useMemo(
    () => simularEscenario(configuracion, calidades, precioActual, variaciones, mercado, { reglas }),
    [configuracion, calidades, precioActual, variaciones, mercado, reglas]
  );

  if (!base.listo) {
    return (
      <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-xs text-slate-600">
        Completa los parámetros y las calidades para simular escenarios.
      </p>
    );
  }

  const cambioCapital = escenario.capitalRequerido - base.capitalRequerido;
  const filas = [
    ['Bolsa (USD/t)', mostrarNumero(base.bolsaUsdT, { maximumFractionDigits: 0 }), mostrarNumero(escenario.bolsaUsdT, { maximumFractionDigits: 0 })],
    ['TRM (COP/USD)', mostrarPesos(base.trmCop, 2), mostrarPesos(escenario.trmCop, 2)],
    ['Capital requerido', mostrarMillones(base.capitalRequerido), mostrarMillones(escenario.capitalRequerido)],
    ['Cobertura de caja', mostrarPorcentaje(base.coberturaPct), mostrarPorcentaje(escenario.coberturaPct)],
    ['Brecha (capital − caja)', mostrarMillones(base.brechaCop), mostrarMillones(escenario.brechaCop)]
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {ATAJOS.map((atajo) => (
          <button
            key={atajo.etiqueta}
            type="button"
            onClick={() => setVariaciones(atajo.valores)}
            className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            {atajo.etiqueta}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setVariaciones(SIN_CAMBIO)}
          className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50"
        >
          <RotateCcw className="h-3 w-3" />
          Restablecer
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {CONTROLES.map((control) => (
          <div key={control.campo}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <label htmlFor={`escenario-${control.campo}`} className="font-medium text-slate-600">{control.etiqueta}</label>
              <span className="font-semibold tabular-nums text-slate-900">
                {mostrarPorcentaje(variaciones[control.campo], { signo: true })}
              </span>
            </div>
            <input
              id={`escenario-${control.campo}`}
              type="range"
              min={control.min}
              max={control.max}
              step="1"
              value={variaciones[control.campo]}
              onChange={(event) => setVariaciones((prev) => ({ ...prev, [control.campo]: Number(event.target.value) }))}
              className="w-full accent-emerald-700"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>{control.min} %</span>
              <span>+{control.max} %</span>
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-xs">
          <thead className="border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-2 py-2" />
              <th className="px-2 py-2 text-right">Hoy</th>
              <th className="px-2 py-2 text-right">Escenario</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 tabular-nums">
            {filas.map(([etiqueta, hoy, simulado]) => (
              <tr key={etiqueta}>
                <td className="px-2 py-2 text-slate-600">{etiqueta}</td>
                <td className="px-2 py-2 text-right text-slate-700">{hoy}</td>
                <td className="px-2 py-2 text-right font-semibold text-slate-900">{simulado}</td>
              </tr>
            ))}
            <tr>
              <td className="px-2 py-2 text-slate-600">Estado de la caja</td>
              <td className="px-2 py-2 text-right">
                <Semaforo color={semaforoCobertura(base.cobertura)} etiqueta={ETIQUETA_COBERTURA[base.cobertura]} />
              </td>
              <td className="px-2 py-2 text-right">
                <Semaforo color={semaforoCobertura(escenario.cobertura)} etiqueta={ETIQUETA_COBERTURA[escenario.cobertura]} />
              </td>
            </tr>
            {mercado?.nivelPrecio && (
              <tr>
                <td className="px-2 py-2 text-slate-600">Nivel del precio</td>
                <td className="px-2 py-2 text-right text-slate-700">{ETIQUETA_NIVEL[base.nivelPrecio] || '—'}</td>
                <td className="px-2 py-2 text-right font-semibold text-slate-900">{ETIQUETA_NIVEL[escenario.nivelPrecio] || '—'}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
        <SlidersHorizontal className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
        <div>
          {cambioCapital === 0 ? (
            <p>Mueve los controles o elige un atajo para ver cómo cambia el capital.</p>
          ) : (
            <p>
              El capital requerido {cambioCapital > 0 ? 'sube' : 'baja'} <strong>{mostrarMillones(Math.abs(cambioCapital))}</strong>
              {escenario.brechaCop > 0
                ? <> y faltarían <strong>{mostrarMillones(escenario.brechaCop)}</strong> de caja.</>
                : <> y la caja alcanza con <strong>{mostrarMillones(-escenario.brechaCop)}</strong> de sobra.</>}
            </p>
          )}
          {escenario.recomendacion && (
            <p className="mt-1">
              Recomendación en el escenario: <strong>{escenario.recomendacion.titulo}.</strong> {escenario.recomendacion.recomendacion}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
