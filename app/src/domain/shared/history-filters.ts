export function validateHistoryFilters(filters: {
  from: string;
  to: string;
  search: string;
}): string | null {
  for (const value of [filters.from.trim(), filters.to.trim()]) {
    if (!value) continue;
    const date = new Date(`${value}T00:00:00Z`);
    if (
      !/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
    )
      return "Ingresa fechas existentes con formato aaaa-mm-dd.";
  }
  if (
    filters.from.trim() &&
    filters.to.trim() &&
    filters.from.trim() > filters.to.trim()
  )
    return "La fecha inicial debe ser anterior o igual a la final.";
  if (filters.search.trim().length > 160)
    return "El nombre del participante admite hasta 160 caracteres.";
  return null;
}
