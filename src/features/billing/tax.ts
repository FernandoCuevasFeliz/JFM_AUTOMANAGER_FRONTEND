import { TAX_INCLUDED, TAX_LABEL, TAX_RATE } from './company';

/**
 * Desglose del impuesto de un documento.
 *
 * Vive aqui, y no dentro de `invoice-view.ts`, porque **la factura no es el
 * unico papel que lo desglosa**: la cotizacion tenia su propia version, y le
 * faltaba la rama del impuesto por encima del precio. Con
 * `VITE_INVOICE_TAX_INCLUDED=false`, una cotizacion de 1.000.000 imprimia
 * «ITBIS 0,00» y total 1.000.000 mientras que su factura cobraba 1.180.000: al
 * cliente se le prometia un precio y se le facturaba otro un 18 % mayor.
 *
 * La regla es una sola, asi que se escribe una sola vez.
 */

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

/**
 * Con `TAX_INCLUDED` el precio pactado es el total y la base sale hacia atras;
 * el impuesto se calcula como la **diferencia** contra el total, no como
 * `base * tasa`, para que subtotal + impuesto sea exactamente el total aunque
 * el redondeo no acompañe.
 *
 * Sin `TAX_INCLUDED`, el precio pactado es la base y el impuesto se suma
 * encima: el total que se cobra es mayor que el precio que se escribio.
 */
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
