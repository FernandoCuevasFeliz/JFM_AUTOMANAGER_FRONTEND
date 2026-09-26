import { z } from 'zod';
import { civilDate, exchangeRate, positiveMoney, requiredSelect, requiredText } from '@/lib/zod-helpers';

/**
 * Espejo de `expenses.schemas.ts`.
 *
 * `vehicleId` puede ir en `null`; que sea obligatorio o este prohibido lo
 * decide el `scope` de la categoria (§7 de API.md), y eso lo comprueba el
 * formulario porque depende de un dato que solo el conoce.
 */
export const expenseFormSchema = z.object({
  categoryId: requiredSelect('Selecciona una categoria'),
  vehicleId: z
    .string()
    .nullable()
    .optional()
    .transform((value) => (value === '' || value === undefined ? null : value)),
  currencyId: requiredSelect('Selecciona una moneda'),
  paymentMethodId: requiredSelect('Selecciona un metodo de pago'),
  description: requiredText(255, 'La descripcion'),
  amount: positiveMoney,
  exchangeRate,
  expenseDate: civilDate,
});

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

export const EXPENSE_FORM_FIELDS = [
  'categoryId',
  'vehicleId',
  'currencyId',
  'paymentMethodId',
  'description',
  'amount',
  'exchangeRate',
  'expenseDate',
] as const;
