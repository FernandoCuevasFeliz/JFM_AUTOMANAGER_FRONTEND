import { TAX_INCLUDED, TAX_LABEL, TAX_RATE } from './company';

export interface TaxBreakdown {
  readonly subtotal: number;
  readonly taxLabel: string;
  readonly taxRate: number;
  readonly taxAmount: number;
  readonly taxIncluded: boolean;
  readonly total: number;
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Desglose informativo usado por la cotizacion impresa. */
export function splitTax(price: number): TaxBreakdown {
  const base = { taxRate: TAX_RATE, taxLabel: TAX_LABEL, taxIncluded: TAX_INCLUDED };
  if (TAX_RATE <= 0) {
    return { ...base, subtotal: round2(price), taxAmount: 0, total: round2(price) };
  }
  if (TAX_INCLUDED) {
    const total = round2(price);
    const subtotal = round2(total / (1 + TAX_RATE));
    return { ...base, subtotal, taxAmount: round2(total - subtotal), total };
  }
  const subtotal = round2(price);
  const taxAmount = round2(subtotal * TAX_RATE);
  return { ...base, subtotal, taxAmount, total: round2(subtotal + taxAmount) };
}
