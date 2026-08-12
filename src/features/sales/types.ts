import type { PageQuery } from '@/lib/api-types';
import type { SaleStatus } from '@/lib/status';

export type { SaleStatus };

export interface SalePayment {
  readonly id: string;
  readonly saleId: string;
  readonly paymentMethodId: string;
  readonly paymentMethodName: string;
  readonly currencyId: string;
  readonly currencyCode: string;
  readonly amount: number;
  /** Fecha civil. */
  readonly paymentDate: string;
  readonly referenceNumber: string | null;
  readonly receivedByName: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface Sale {
  readonly id: string;
  /** Generado por el backend: `VEN-2026-000001`. */
  readonly saleNumber: string;
  readonly reservationId: string | null;
  readonly reservationNumber: string | null;
  readonly quotationId: string | null;
  readonly quotationNumber: string | null;
  readonly clientId: string;
  readonly clientName: string;
  readonly vehicleId: string;
  readonly vehicleChassisNumber: string;
  readonly vehicleBrandName: string;
  readonly vehicleModelName: string;
  readonly vehicleYear: number;
  readonly currencyId: string;
  readonly currencyCode: string;
  readonly salePrice: number;
  readonly exchangeRate: number;
  /** Fecha civil. */
  readonly saleDate: string;
  readonly salespersonId: string;
  readonly salespersonName: string;
  readonly status: SaleStatus;
  readonly payments: SalePayment[];
  readonly totalPaid: number;
  readonly pendingBalance: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
}

/** Estado de cuenta suelto (`GET /sales/:id/payments`). */
export interface SaleAccount {
  readonly payments: SalePayment[];
  readonly salePrice: number;
  readonly totalPaid: number;
  readonly pendingBalance: number;
}

/** Respuesta al registrar un abono. */
export interface RegisterPaymentResult {
  readonly payment: SalePayment;
  readonly totalPaid: number;
  readonly pendingBalance: number;
  /** Habilita el boton de completar la venta. */
  readonly fullyPaid: boolean;
}

export interface SalesSummary {
  readonly reportingCurrency: string;
  readonly totalSales: number;
  readonly totalAmount: number;
  readonly totalCollected: number;
  readonly pendingBalance: number;
}

export interface SaleListParams extends PageQuery {
  search?: string;
  clientId?: string;
  vehicleId?: string;
  salespersonId?: string;
  status?: SaleStatus;
  dateFrom?: string;
  dateTo?: string;
}

/** El resumen no acepta `search` ni `vehicleId`. */
export interface SalesSummaryParams {
  clientId?: string;
  salespersonId?: string;
  status?: SaleStatus;
  dateFrom?: string;
  dateTo?: string;
}
