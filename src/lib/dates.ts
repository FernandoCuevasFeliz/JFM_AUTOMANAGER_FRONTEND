/**
 * Fechas civiles (`YYYY-MM-DD`) y marcas de tiempo, que son cosas distintas.
 *
 * `purchaseDate`, `expenseDate`, `saleDate`, `paymentDate`, `validUntil`,
 * `reservationDate` y `expirationDate` son **fechas civiles**: no llevan hora
 * ni zona. Pasarlas por `new Date(...)` las interpreta como medianoche UTC y en
 * Republica Dominicana (UTC-4) se muestran un dia antes. Por eso aqui se
 * manipulan como string y solo se usa `Date` en aritmetica hecha en UTC, que
 * es simetrica y no puede correr el dia.
 */

export type CivilDate = string;

const MONTHS_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

const CIVIL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isCivilDate(value: string): boolean {
  return CIVIL_DATE_PATTERN.test(value);
}

/** Descompone `YYYY-MM-DD` sin pasar por `Date`. */
function parts(date: CivilDate): { year: string; month: string; day: string } | null {
  if (!isCivilDate(date)) return null;
  const [year, month, day] = date.split('-');
  return { year, month, day };
}

/** Hoy en la zona **local** del navegador, no en UTC. */
export function todayCivil(): CivilDate {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** `2026-03-05` → `05/03/2026`. Puro manejo de texto. */
export function formatCivilDate(date: CivilDate | null | undefined): string {
  if (!date) return '—';
  const p = parts(date);
  if (!p) return date;
  return `${p.day}/${p.month}/${p.year}`;
}

/** `2026-03-05` → `5 de marzo de 2026`. */
export function formatCivilDateLong(date: CivilDate | null | undefined): string {
  if (!date) return '—';
  const p = parts(date);
  if (!p) return date;
  const month = MONTHS_ES[Number(p.month) - 1] ?? p.month;
  return `${Number(p.day)} de ${month} de ${p.year}`;
}

/** `2026-03` → `mar 2026`, para ejes de graficas. */
export function formatCivilMonth(month: string): string {
  const [year, monthNumber] = month.split('-');
  const name = MONTHS_ES[Number(monthNumber) - 1];
  return name ? `${name.slice(0, 3)} ${year}` : month;
}

/**
 * Suma dias a una fecha civil.
 *
 * Se construye en UTC y se lee en UTC: la ida y la vuelta usan el mismo
 * calendario, asi que el resultado no depende de la zona del navegador.
 */
export function addDaysCivil(date: CivilDate, days: number): CivilDate {
  const p = parts(date);
  if (!p) return date;

  const utc = new Date(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day)));
  utc.setUTCDate(utc.getUTCDate() + days);

  const year = utc.getUTCFullYear();
  const month = String(utc.getUTCMonth() + 1).padStart(2, '0');
  const day = String(utc.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Comparacion de fechas civiles: el formato ISO ya ordena lexicograficamente. */
export function isBeforeCivil(a: CivilDate, b: CivilDate): boolean {
  return a < b;
}

export function isPastCivil(date: CivilDate): boolean {
  return date < todayCivil();
}

/** Dias que faltan para una fecha civil (negativo si ya paso). */
export function daysUntilCivil(date: CivilDate): number {
  const from = parts(todayCivil());
  const to = parts(date);
  if (!from || !to) return 0;

  const fromUtc = Date.UTC(Number(from.year), Number(from.month) - 1, Number(from.day));
  const toUtc = Date.UTC(Number(to.year), Number(to.month) - 1, Number(to.day));
  return Math.round((toUtc - fromUtc) / 86_400_000);
}

/** Primer y ultimo dia del mes de una fecha civil. */
export function monthBoundsCivil(date: CivilDate): { from: CivilDate; to: CivilDate } {
  const p = parts(date);
  if (!p) return { from: date, to: date };

  const lastDay = new Date(Date.UTC(Number(p.year), Number(p.month), 0)).getUTCDate();
  return {
    from: `${p.year}-${p.month}-01`,
    to: `${p.year}-${p.month}-${String(lastDay).padStart(2, '0')}`,
  };
}

/** Los `N` ultimos meses en formato `YYYY-MM`, del mas antiguo al mas reciente. */
export function lastMonths(count: number): string[] {
  const now = new Date();
  const months: string[] = [];

  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(now.getFullYear(), now.getMonth() - offset, 1));
    months.push(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`);
  }

  return months;
}

/** Rango civil que cubre un mes `YYYY-MM` completo. */
export function monthRange(month: string): { from: CivilDate; to: CivilDate } {
  const [year, monthNumber] = month.split('-');
  const lastDay = new Date(Date.UTC(Number(year), Number(monthNumber), 0)).getUTCDate();
  return {
    from: `${month}-01`,
    to: `${month}-${String(lastDay).padStart(2, '0')}`,
  };
}

// --- Marcas de tiempo --------------------------------------------------------

/**
 * `createdAt`, `updatedAt`, `lastLoginAt`… si son instantes reales en ISO 8601
 * UTC, asi que aqui **si** corresponde convertirlos a la hora local.
 */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('es-DO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es-DO', { dateStyle: 'medium' }).format(date);
}
