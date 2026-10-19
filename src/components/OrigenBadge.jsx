import React from 'react';

/**
 * Componente para identificar los hallazgos base del documento PESTEL
 */
export default function OrigenBadge({ origen }) {
  if (origen === 'base') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-300">
        base
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
      n8n
    </span>
  );
}
