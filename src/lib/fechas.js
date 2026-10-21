export function formatearFechaPublicacion(fecha) {
  if (!fecha) return 'Sin fecha';

  const fechaSolo = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  if (fechaSolo) {
    return `${fechaSolo[3]}/${fechaSolo[2]}/${fechaSolo[1]}`;
  }

  const fechaHora = new Date(fecha);
  if (Number.isNaN(fechaHora.getTime())) return fecha;

  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Bogota'
  }).format(fechaHora);
}
