import { z } from 'zod';
import {
  civilDate,
  exchangeRate,
  money,
  nullableText,
  positiveMoney,
  requiredSelect,
} from '@/lib/zod-helpers';

/** Espejo de `sales.schemas.ts`. */

/**
 * Pago inicial opcional: sirve para registrar de una vez el deposito que el
 * cliente dejo en la reserva, cuyo metodo de pago no se guarda alli.
 */
const initialPaymentSchema = z.object({
  paymentMethodId: requiredSelect('Selecciona un metodo de pago'),
  amount: positiveMoney,
  paymentDate: civilDate,
  referenceNumber: nullableText(50),
});

export const createSaleSchema = z.object({
  reservationId: z
    .string()
    .nullable()
    .optional()
    .transform((value) => (value === '' || value === undefined ? null : value)),
  quotationId: z
    .string()
    .nullable()
    .optional()
    .transform((value) => (value === '' || value === undefined ? null : value)),
  clientId: requiredSelect('Selecciona un cliente'),
  vehicleId: requiredSelect('Selecciona un vehiculo'),
  currencyId: requiredSelect('Selecciona una moneda'),
  salePrice: money,
  exchangeRate,
  saleDate: civilDate,
  salespersonId: requiredSelect('Selecciona un vendedor'),
  initialPayment: initialPaymentSchema.nullable().optional().default(null),
});

/** Ni el cliente, ni el vehiculo, ni la moneda cambian despues. */
export const updateSaleSchema = z.object({
  salePrice: money,
  exchangeRate,
  saleDate: civilDate,
  salespersonId: requiredSelect('Selecciona un vendedor'),
});

/**
 * `currencyId` debe coincidir con el de la venta, asi que el formulario lo fija
 * en vez de dejarlo elegir (§7 de API.md).
 */
export const paymentSchema = z.object({
  paymentMethodId: requiredSelect('Selecciona un metodo de pago'),
  currencyId: requiredSelect('Moneda invalida'),
  amount: positiveMoney,
  paymentDate: civilDate,
  referenceNumber: nullableText(50),
});

export type CreateSaleValues = z.infer<typeof createSaleSchema>;
export type UpdateSaleValues = Partial<z.infer<typeof updateSaleSchema>>;
export type PaymentValues = z.infer<typeof paymentSchema>;

export const SALE_FORM_FIELDS = [
  'reservationId',
  'quotationId',
  'clientId',
  'vehicleId',
  'currencyId',
  'salePrice',
  'exchangeRate',
  'saleDate',
  'salespersonId',
  'initialPayment',
] as const;

export const PAYMENT_FORM_FIELDS = [
  'paymentMethodId',
  'currencyId',
  'amount',
  'paymentDate',
  'referenceNumber',
] as const;
