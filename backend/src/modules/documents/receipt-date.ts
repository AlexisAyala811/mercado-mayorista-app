const commercialDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Lima',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function receiptCommercialDate(instant: Date): string {
  return commercialDate.format(instant);
}

export function receiptCivilDateVersion(state: string, version: number): string {
  return `${state}:v${version}:date-lima-v1`;
}
