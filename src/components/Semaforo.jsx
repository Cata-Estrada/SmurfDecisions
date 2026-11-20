import React from 'react';

const ESTILOS = {
  verde: { punto: 'bg-emerald-500', caja: 'border-emerald-200 bg-emerald-50 text-emerald-800', texto: 'Verde' },
  amarillo: { punto: 'bg-amber-400', caja: 'border-amber-200 bg-amber-50 text-amber-900', texto: 'Amarillo' },
  rojo: { punto: 'bg-rose-500', caja: 'border-rose-200 bg-rose-50 text-rose-800', texto: 'Rojo' }
};

export function estiloSemaforo(color) {
  return ESTILOS[color] || { punto: 'bg-slate-300', caja: 'border-slate-200 bg-slate-50 text-slate-700', texto: 'Sin dato' };
}

/** Insignia de semáforo con texto (el color nunca va solo). */
export default function Semaforo({ color, etiqueta }) {
  const estilo = estiloSemaforo(color);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${estilo.caja}`}>
      <span className={`h-2 w-2 rounded-full ${estilo.punto}`} aria-hidden="true" />
      {etiqueta || estilo.texto}
    </span>
  );
}
