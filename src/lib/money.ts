/**
 * Formateo de montos y tasas de cambio.
 *
 * El backend manda dinero como `number` con 2 decimales y tasas con 4. Solo se
 * formatea para mostrar: ningun calculo de negocio se hace en el cliente.
 */

/** Moneda en la que el backend consolida los reportes. */
export const REPORTING_CURRENCY = 'DOP';

const SYMBOLS: Record<string, string> = {
  DOP: 'RD$',
  USD: 'US$',
  EUR: '€',
};

export function currencySymbol(code: string | null | undefined): string {
  if (!code) return '';
  return SYMBOLS[code] ?? `${code} `;
}

/** `1800000` + `DOP` → `RD$ 1,800,000.00`. */
export function formatMoney(
  amount: number | null | undefined,
  currencyCode?: string | null,
): string {
  if (amount === null || amount === undefined) return '—';

  const formatted = new Intl.NumberFormat('es-DO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  const symbol = currencySymbol(currencyCode);
  return symbol ? `${symbol} ${formatted}` : formatted;
}

/** Version compacta para tarjetas del tablero: `RD$ 21.5M`. */
export function formatMoneyCompact(
  amount: number | null | undefined,
  currencyCode?: string | null,
): string {
  if (amount === null || amount === undefined) return '—';

  const symbol = currencySymbol(currencyCode);
  const formatted = new Intl.NumberFormat('es-DO', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount);

  return symbol ? `${symbol} ${formatted}` : formatted;
}

/** Tasa de cambio con sus 4 decimales. */
export function formatExchangeRate(rate: number | null | undefined): string {
  if (rate === null || rate === undefined) return '—';
  return new Intl.NumberFormat('es-DO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(rate);
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('es-DO').format(value);
}

export function formatPercentage(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${new Intl.NumberFormat('es-DO', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(value)} %`;
}

/**
 * Un documento en pesos debe llevar `exchangeRate: 1`; cualquier otro valor da
 * 422 (§7 de API.md). La UI fija y deshabilita el campo cuando esto es cierto.
 */
export function isReportingCurrency(currencyCode: string | null | undefined): boolean {
  return currencyCode === REPORTING_CURRENCY;
}

/** Convierte a pesos con la tasa del documento, solo para previsualizar. */
export function convertToReporting(amount: number, exchangeRate: number): number {
  return Math.round(amount * exchangeRate * 100) / 100;
}
