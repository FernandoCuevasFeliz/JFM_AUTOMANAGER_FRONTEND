import { api } from '@/lib/api-client';
import type { QueryParams } from '@/lib/api-types';
import type { CreateReservationValues, UpdateReservationValues } from './schemas';
import type { Reservation, ReservationListParams } from './types';

export const reservationsApi = {
  list(params: ReservationListParams) {
    return api.list<Reservation>('/reservations', params as QueryParams);
  },

  getById(id: string) {
    return api.get<Reservation>(`/reservations/${id}`);
  },

  /**
   * Crear la reserva pasa el vehiculo a `reserved` y marca la cotizacion como
   * `converted`, todo en una transaccion.
   */
  create(input: CreateReservationValues) {
    return api.post<Reservation>('/reservations', input);
  },

  /** Prorroga o ajuste del deposito, solo mientras esta activa. */
  update(id: string, input: UpdateReservationValues) {
    return api.patch<Reservation>(`/reservations/${id}`, input);
  },

  /** Las reservas no se borran: se cancelan y el vehiculo vuelve a inventario. */
  cancel(id: string) {
    return api.post<Reservation>(`/reservations/${id}/cancel`);
  },

  expireOverdue() {
    return api.post<{ expired: number; releasedVehicles: number }>('/reservations/expire-overdue');
  },
};
