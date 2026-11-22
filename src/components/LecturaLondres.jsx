import React from 'react';
import { mostrarNumero, mostrarPorcentaje } from '../lib/formato';

function fechaCorta(iso) {
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' })
    .format(new Date(`${iso}T00:00:00Z`));
}

/**
 * Segunda lectura del precio: futuro de Londres (ICE Futures Europe) según la
 * tabla diaria de la ICCO. Llega con unos días de retraso, por eso se compara
 * con Nueva York del mismo día y no con la cotización en vivo.
 */
export default function LecturaLondres({ londres, compacta = false }) {
  if (!londres) return null;
  if (londres.error) {
    return <p className="text-[11px] text-slate-500">Londres: {londres.error}</p>;
  }

  const diferencia = londres.usdT && londres.nyUsdT
    ? (londres.usdT - londres.nyUsdT) / londres.nyUsdT * 100
    : null;

  if (compacta) {
    return (
      <p className="text-[11px] text-slate-500">
        Londres: £{mostrarNumero(londres.gbpT, { maximumFractionDigits: 0 })}/t
        {londres.usdT && <> ≈ US$ {mostrarNumero(londres.usdT, { maximumFractionDigits: 0 })}</>}
        {' '}({fechaCorta(londres.fecha)}
        {diferencia !== null && <>, {mostrarPorcentaje(diferencia, { signo: true })} vs. NY</>})
      </p>
    );
  }

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
      <p className="font-semibold text-slate-900">Segunda lectura · Londres</p>
      <p className="mt-1">
        Futuro de Londres: <strong>£{mostrarNumero(londres.gbpT)}/t</strong>
        {londres.usdT && <> ≈ <strong>US$ {mostrarNumero(londres.usdT, { maximumFractionDigits: 0 })}/t</strong> (GBP/USD {mostrarNumero(londres.gbpUsd, { maximumFractionDigits: 4 })})</>}
        {' '}al {fechaCorta(londres.fecha)}.
        {' '}Nueva York ese día: US$ {mostrarNumero(londres.nyUsdT)}/t
        {diferencia !== null && <> · Londres {diferencia >= 0 ? 'por encima' : 'por debajo'} {mostrarPorcentaje(Math.abs(diferencia))}</>}.
        {' '}Precio diario ICCO: US$ {mostrarNumero(londres.iccoUsdT)}/t.
      </p>
      <p className="mt-1 text-[11px] text-slate-500">
        Fuente: ICCO (Organización Internacional del Cacao), publicada con algunos días de retraso. Es una referencia de contraste; los cálculos usan Nueva York.
      </p>
    </div>
  );
}
