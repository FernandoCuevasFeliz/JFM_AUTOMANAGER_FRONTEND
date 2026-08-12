import type { PageQuery } from '@/lib/api-types';
import type { PurchaseStatus } from '@/lib/status';

export type { PurchaseStatus };

export interface PurchaseItem {
  readonly id: string;
  readonly purchaseId: string;
  readonly vehicleId: string;
  readonly chassisNumber: string;
  readonly brandName: string;
  readonly modelName: string;
  readonly year: number;
  readonly unitCost: number;
  readonly freightCost: number;
  readonly insuranceCost: number;
  readonly otherCosts: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface Purchase {
  readonly id: string;
  /** Generado por el backend (`COM-2026-000001`) salvo que se envie propio. */
  readonly purchaseNumber: string;
  readonly supplierId: string;
  readonly supplierName: string;
  readonly currencyId: string;
  readonly currencyCode: string;
  readonly invoiceNumber: string | null;
  /** Fecha civil. */
  readonly purchaseDate: string;
  readonly exchangeRate: number;
  readonly status: PurchaseStatus;
  readonly notes: string | null;
  readonly createdByName: string | null;
  readonly items: PurchaseItem[];
  readonly totalCost: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
}

export interface PurchaseListParams extends PageQuery {
  search?: string;
  supplierId?: string;
  status?: PurchaseStatus;
  dateFrom?: string;
  dateTo?: string;
}
