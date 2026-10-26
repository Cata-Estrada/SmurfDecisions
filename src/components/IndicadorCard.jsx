import React from 'react';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';

/**
 * Tarjeta para visualización de indicadores macroeconómicos
 * Muestra obligatoriamente: valor, fecha, fuente y unidad.
 * Marca alerta si han transcurrido más de 3 días sin actualizarse (para indicadores diarios como TRM).
 */
export default function IndicadorCard({
  titulo,
  codigo,
  valor,
  unidad,
  fecha,
  fuente,
  frecuenciaDias = 3,
  referenciaFecha
}) {
  const fechaDato = fecha ? new Date(fecha) : null;
  const fechaRef = referenciaFecha ? new Date(referenciaFecha) : new Date();
  const diffDias = fechaDato
    ? Math.ceil(Math.abs(fechaRef - fechaDato) / (1000 * 60 * 60 * 24))
    : null;
  const desactualizado = !Number.isFinite(diffDias) || diffDias > frecuenciaDias;

  const formatearValor = (val, cod) => {
    if (val === null || val === undefined) return '-';
    if (cod === 'TRM') {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(val);
    }
    return `${Number(val).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${unidad}`;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm hover:border-slate-300 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {codigo}
          </span>
          <h3 className="text-sm font-medium text-slate-800 mt-0.5">
            {titulo}
          </h3>
        </div>
        {desactualizado ? (
          <span
            className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded"
            title={Number.isFinite(diffDias)
              ? `Última actualización hace ${diffDias} días`
              : 'No hay una fecha de actualización registrada'}
          >
            <Clock className="w-3.5 h-3.5" />
            Desactualizado
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
            <CheckCircle className="w-3.5 h-3.5" />
            Vigente
          </span>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-slate-900">
          {formatearValor(valor, codigo)}
        </span>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-1 text-xs text-slate-500">
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Fecha del dato:</span>
          <span className="font-medium text-slate-700">{fecha || 'N/D'}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Fuente:</span>
          <span className="font-medium text-slate-700 truncate max-w-[180px]" title={fuente}>
            {fuente || 'N/D'}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Unidad:</span>
          <span className="font-medium text-slate-700">{unidad || 'N/D'}</span>
        </div>
      </div>
    </div>
  );
}
