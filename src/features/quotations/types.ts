import type { PageQuery } from '@/lib/api-types';
import type { QuotationStatus } from '@/lib/status';

export type { QuotationStatus };

export interface Quotation {
  readonly id: string;
  /** Generado por el backend: `COT-2026-000001`. */
  readonly quotationNumber: string;
  readonly clientId: string;
  readonly clientName: string;
  readonly vehicleId: string;
  readonly vehicleChassisNumber: string;
  readonly vehicleBrandName: string;
  readonly vehicleModelName: string;
  readonly vehicleYear: number;
  readonly currencyId: string;
  readonly currencyCode: string;
  readonly quotedPrice: number;
  /** Fecha civil. */
  readonly validUntil: string;
  readonly status: QuotationStatus;
  readonly notes: string | null;
  readonly createdByName: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
}

export interface QuotationListParams extends PageQuery {
  search?: string;
  clientId?: string;
  vehicleId?: string;
  status?: QuotationStatus;
  /** Filtran sobre `validUntil`. */
  dateFrom?: string;
  dateTo?: string;
}
