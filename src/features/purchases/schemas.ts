import { z } from 'zod';
import { civilDate, exchangeRate, money, nullableText, requiredSelect } from '@/lib/zod-helpers';

/** Espejo de `purchases.schemas.ts`. */

const purchaseItemSchema = z.object({
  vehicleId: requiredSelect('Selecciona un vehiculo'),
  unitCost: money,
  freightCost: money,
  insuranceCost: money,
  otherCosts: money,
});

export const createPurchaseSchema = z.object({
  supplierId: requiredSelect('Selecciona un proveedor'),
  currencyId: requiredSelect('Selecciona una moneda'),
  /**
   * Unica excepcion a "los numeros los genera el backend": se puede enviar si
   * la empresa maneja su propia numeracion (§7 de API.md).
   */
  purchaseNumber: z
    .string()
    .trim()
    .max(30, 'No puede superar los 30 caracteres')
    .optional()
    .transform((value) => (value === '' ? undefined : value)),
  invoiceNumber: nullableText(50),
  purchaseDate: civilDate,
  exchangeRate,
  status: z.enum(['pending', 'in_transit', 'received', 'cancelled']),
  notes: nullableText(5000),
  items: z.array(purchaseItemSchema).min(1, 'La compra debe incluir al menos un vehiculo'),
});

/** `PATCH /purchases/:id` no toca los items ni el estado. */
export const updatePurchaseSchema = z.object({
  supplierId: requiredSelect('Selecciona un proveedor'),
  currencyId: requiredSelect('Selecciona una moneda'),
  invoiceNumber: nullableText(50),
  purchaseDate: civilDate,
  exchangeRate,
  notes: nullableText(5000),
});

export type CreatePurchaseValues = z.infer<typeof createPurchaseSchema>;
export type UpdatePurchaseValues = Partial<z.infer<typeof updatePurchaseSchema>>;
export type PurchaseItemValues = z.infer<typeof purchaseItemSchema>;

export const PURCHASE_FORM_FIELDS = [
  'supplierId',
  'currencyId',
  'purchaseNumber',
  'invoiceNumber',
  'purchaseDate',
  'exchangeRate',
  'status',
  'notes',
  'items',
] as const;
