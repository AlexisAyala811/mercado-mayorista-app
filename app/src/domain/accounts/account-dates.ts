export function accountDueLabel(value: string | null | undefined): string {
  if (value === null) return 'Sin vencimiento pendiente';
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Vencimiento no disponible';
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return 'Vencimiento no disponible';
  const [year, month, day] = value.split('-');
  return `Vence: ${day}/${month}/${year}`;
}

export function accountMovementLabel(value: string | null | undefined): string {
  if (value === null) return 'Sin cambios posteriores al origen';
  if (!value || !/T.+(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return 'Último cambio no disponible';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Último cambio no disponible';
  return `Último cambio de saldo/estado: ${date.toLocaleString('es-PE', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}`;
}
