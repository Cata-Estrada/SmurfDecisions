import React from 'react';

/**
 * Componente para mostrar el nivel de impacto según la regla oficial:
 * Alto (rojo), Medio (ámbar), Bajo (verde)
 */
export default function NivelBadge({ nivel, puntaje, size = 'md' }) {
  let colorClasses = 'bg-emerald-50 text-emerald-800 border-emerald-300';
  let dotColor = 'bg-emerald-500';

  if (nivel === 'Alto') {
    colorClasses = 'bg-red-50 text-red-800 border-red-300';
    dotColor = 'bg-red-500';
  } else if (nivel === 'Medio') {
    colorClasses = 'bg-amber-50 text-amber-800 border-amber-300';
    dotColor = 'bg-amber-500';
  }

  const sizeClasses = size === 'sm'
    ? 'text-xs px-2 py-0.5'
    : 'text-xs font-semibold px-2.5 py-1';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${colorClasses} ${sizeClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span>{nivel}</span>
      {puntaje !== undefined && (
        <span className="opacity-75 font-normal">({puntaje})</span>
      )}
    </span>
  );
}
