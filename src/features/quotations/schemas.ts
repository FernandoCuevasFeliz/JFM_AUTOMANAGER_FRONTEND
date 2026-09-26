import { z } from 'zod';
import { todayCivil } from '@/lib/dates';
import { civilDate, money, nullableText, requiredSelect } from '@/lib/zod-helpers';

/**
 * Espejo de `quotations.schemas.ts`.
 *
 * `quotationNumber` no aparece: lo genera el backend (§7 de API.md).
 */
export const createQuotationSchema = z
  .object({
    clientId: requiredSelect('Selecciona un cliente'),
    vehicleId: requiredSelect('Selecciona un vehiculo'),
    currencyId: requiredSelect('Selecciona una moneda'),
    quotedPrice: money,
    validUntil: civilDate,
    notes: nullableText(5000),
  })
  /*
   * Nacer vencida no tiene sentido, y el backend ya lo rechaza
   * (`create-quotation`). Sin esto, elegir ayer en el selector de fecha
   * devolvia un error del servidor en vez de un aviso en el campo. El modulo de
   * reservas si validaba sus fechas aqui; este no.
   *
   * La comparacion es de texto: el formato ISO ya ordena cronologicamente.
   */
  .refine((value) => value.validUntil >= todayCivil(), {
    path: ['validUntil'],
    message: 'La vigencia no puede ser anterior a hoy',
  });

/** El cliente y el vehiculo de una cotizacion no se cambian. */
export const updateQuotationSchema = z.object({
  currencyId: requiredSelect('Selecciona una moneda'),
  quotedPrice: money,
  validUntil: civilDate,
  notes: nullableText(5000),
});

export type CreateQuotationValues = z.infer<typeof createQuotationSchema>;
export type UpdateQuotationValues = Partial<z.infer<typeof updateQuotationSchema>>;

export const QUOTATION_FORM_FIELDS = [
  'clientId',
  'vehicleId',
  'currencyId',
  'quotedPrice',
  'validUntil',
  'notes',
] as const;
