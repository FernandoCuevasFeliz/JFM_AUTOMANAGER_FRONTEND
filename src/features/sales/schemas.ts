import { z } from 'zod';
import {
  civilDate,
  exchangeRate,
  money,
  nullableText,
  positiveMoney,
  requiredSelect,
  requiredText,
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

/** Un vehiculo de la venta con su precio pactado. */
export const saleItemSchema = z.object({
  vehicleId: requiredSelect('Selecciona un vehiculo'),
  salePrice: money,
});

/**
 * Alta de una venta con uno o varios vehiculos.
 *
 * El total NO se envia: lo calcula el backend sumando las lineas. Un vehiculo
 * repetido se rechaza aqui para no gastar un viaje al servidor en algo que se
 * ve desde el formulario.
 */
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
  items: z
    .array(saleItemSchema)
    .min(1, 'Agrega al menos un vehiculo')
    .max(50, 'Una venta admite hasta 50 vehiculos')
    .superRefine((items, ctx) => {
      const vistos = new Set<string>();
      items.forEach((item, index) => {
        if (vistos.has(item.vehicleId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [index, 'vehicleId'],
            message: 'Este vehiculo ya esta en la venta',
          });
        }
        vistos.add(item.vehicleId);
      });
    }),
  currencyId: requiredSelect('Selecciona una moneda'),
  exchangeRate,
  saleDate: civilDate,
  salespersonId: requiredSelect('Selecciona un vendedor'),
  initialPayment: initialPaymentSchema.nullable().optional().default(null),
});

/**
 * Correccion de la CABECERA.
 *
 * El precio no esta aqui a proposito: con varias unidades por venta, "el precio"
 * es la suma de las lineas y se corrige linea a linea.
 */
export const updateSaleSchema = z.object({
  exchangeRate,
  saleDate: civilDate,
  salespersonId: requiredSelect('Selecciona un vendedor'),
});

export const addSaleItemSchema = saleItemSchema;

export const updateSaleItemSchema = z.object({
  salePrice: money,
});

/**
 * Devolucion de una unidad. El destino se limita a los dos estados con sentido
 * para un vehiculo que vuelve: disponible o en taller.
 */
export const returnSaleItemSchema = z.object({
  reason: requiredText(500, 'El motivo de la devolucion').min(3, 'Explica brevemente el motivo'),
  destination: z.enum(['in_inventory', 'in_repair']).default('in_inventory'),
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

/**
 * Reembolso. `saleItemId` en null es un reembolso general de la venta; con
 * valor, el dinero devuelto por una unidad concreta.
 *
 * Lleva su propia tasa: la del dia en que sale el dinero, no la de la venta.
 */
export const refundSchema = z.object({
  saleItemId: z
    .string()
    .nullable()
    .optional()
    .transform((value) => (value === '' || value === undefined ? null : value)),
  refundMethodId: requiredSelect('Selecciona un metodo'),
  currencyId: requiredSelect('Moneda invalida'),
  amount: positiveMoney,
  exchangeRate,
  refundDate: civilDate,
  reason: requiredText(500, 'El motivo del reembolso').min(3, 'Explica brevemente el motivo'),
});

export type SaleItemValues = z.infer<typeof saleItemSchema>;
export type CreateSaleValues = z.infer<typeof createSaleSchema>;
export type UpdateSaleValues = Partial<z.infer<typeof updateSaleSchema>>;
export type UpdateSaleItemValues = z.infer<typeof updateSaleItemSchema>;
export type ReturnSaleItemValues = z.infer<typeof returnSaleItemSchema>;
export type PaymentValues = z.infer<typeof paymentSchema>;
export type RefundValues = z.infer<typeof refundSchema>;

export const SALE_FORM_FIELDS = [
  'reservationId',
  'quotationId',
  'clientId',
  'items',
  'currencyId',
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
