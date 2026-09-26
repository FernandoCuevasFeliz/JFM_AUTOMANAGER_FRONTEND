import type { PageQuery } from '@/lib/api-types';
import type { ReservationStatus } from '@/lib/status';

export type { ReservationStatus };

export interface Reservation {
  readonly id: string;
  /** Generado por el backend: `RES-2026-000001`. */
  readonly reservationNumber: string;
  /** Cotizacion de origen, si la reserva nacio de una. */
  readonly quotationId: string | null;
  readonly quotationNumber: string | null;
  readonly clientId: string;
  readonly clientName: string;
  readonly vehicleId: string;
  readonly vehicleChassisNumber: string;
  readonly vehicleBrandName: string;
  readonly vehicleModelName: string;
  readonly vehicleYear: number;
  readonly depositAmount: number;
  /** Fechas civiles. */
  readonly reservationDate: string;
  readonly expirationDate: string;
  readonly status: ReservationStatus;
  readonly createdByName: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
}

export interface ReservationListParams extends PageQuery {
  search?: string;
  clientId?: string;
  vehicleId?: string;
  status?: ReservationStatus;
  /** Filtran sobre `reservationDate`. */
  dateFrom?: string;
  dateTo?: string;
}
