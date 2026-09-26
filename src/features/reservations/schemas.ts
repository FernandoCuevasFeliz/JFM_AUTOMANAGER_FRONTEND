import { z } from 'zod';
import { civilDate, money, requiredSelect } from '@/lib/zod-helpers';

/** Espejo de `reservations.schemas.ts`. */
export const createReservationSchema = z
  .object({
    /** `null` si se reserva sin cotizar antes. */
    quotationId: z
      .string()
      .nullable()
      .optional()
      .transform((value) => (value === '' || value === undefined ? null : value)),
    clientId: requiredSelect('Selecciona un cliente'),
    vehicleId: requiredSelect('Selecciona un vehiculo'),
    depositAmount: money,
    reservationDate: civilDate,
    expirationDate: civilDate,
  })
  .refine((value) => value.expirationDate >= value.reservationDate, {
    path: ['expirationDate'],
    // Comparacion de texto: el formato ISO ya ordena cronologicamente.
    message: 'El vencimiento no puede ser anterior a la fecha de reserva',
  });

export const updateReservationSchema = z.object({
  depositAmount: money,
  expirationDate: civilDate,
});

export type CreateReservationValues = z.infer<typeof createReservationSchema>;
export type UpdateReservationValues = Partial<z.infer<typeof updateReservationSchema>>;

export const RESERVATION_FORM_FIELDS = [
  'quotationId',
  'clientId',
  'vehicleId',
  'depositAmount',
  'reservationDate',
  'expirationDate',
] as const;
