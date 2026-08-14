import { z } from 'zod';
import { nullableText, positiveMoney, requiredSelect, requiredText } from '@/lib/zod-helpers';
import { INVOICE_NCF_TYPES, NCF_PATTERN, type NcfType } from './types';

/** Espejo de `invoices.schemas.ts`. */

export const newInvoiceSchema = z.object({
  saleId: requiredSelect('Selecciona una venta'),
  ncfType: z.enum(INVOICE_NCF_TYPES as [NcfType, ...NcfType[]], {
    required_error: 'Selecciona el tipo de comprobante',
  }),
});

export type NewInvoiceValues = z.infer<typeof newInvoiceSchema>;

/**
 * NCF que devuelve la DGII al aceptar el comprobante.
 *
 * Se normaliza a mayusculas antes de validar porque el operador lo teclea desde
 * el acuse del PSFE y ahi aparece en ambas cajas. El backend valida ademas que
 * el tipo coincida con el de la factura y que el numero no este repetido —eso
 * no se puede comprobar aqui— asi que su error se muestra tal cual.
 */
export const issueSchema = z.object({
  ncfNumber: z
    .string()
    .trim()
    .min(1, 'El NCF es obligatorio')
    .transform((value) => value.toUpperCase())
    .refine(
      (value) => NCF_PATTERN.test(value),
      'Formato invalido: debe ser E + tipo (2 digitos) + secuencia (10 digitos), por ejemplo E310000000001',
    ),
  dgiiTrackId: nullableText(100),
  xmlUrl: nullableText(500),
});

export type IssueValues = z.infer<typeof issueSchema>;

export const rejectSchema = z.object({
  reason: requiredText(500, 'El motivo del rechazo'),
});

export type RejectValues = z.infer<typeof rejectSchema>;

export const creditNoteSchema = z.object({
  reason: requiredText(500, 'El motivo de la nota'),
  amount: positiveMoney,
});

export type CreditNoteValues = z.infer<typeof creditNoteSchema>;
