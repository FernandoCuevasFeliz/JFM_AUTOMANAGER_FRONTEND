import type { PageQuery } from '@/lib/api-types';
import type { VehicleStatus } from '@/lib/status';

export type { VehicleStatus };

/** Estados que el endpoint de cambio manual acepta como destino. */
export type AssignableVehicleStatus = 'in_transit' | 'in_inventory' | 'in_repair' | 'unavailable';

export interface VehicleImage {
  readonly id: string;
  readonly vehicleId: string;
  readonly url: string;
  readonly isPrimary: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface Vehicle {
  readonly id: string;
  readonly brandId: string;
  readonly modelId: string;
  readonly brandName: string;
  readonly modelName: string;
  readonly year: number;
  readonly chassisNumber: string;
  readonly color: string | null;
  readonly mileage: number | null;
  readonly engineNumber: string | null;
  readonly transmissionType: string | null;
  readonly fuelType: string | null;
  /** Precio de lista sugerido; el real se fija en la venta. */
  readonly salePrice: number | null;
  readonly status: VehicleStatus;
  readonly notes: string | null;
  readonly isActive: boolean;
  readonly images: VehicleImage[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
}

export interface VehicleSummary {
  readonly byStatus: Record<VehicleStatus, number>;
  readonly total: number;
  readonly available: number;
}

export interface VehicleListParams extends PageQuery {
  search?: string;
  /** Filtro repetible: `?status=in_inventory&status=reserved`. */
  status?: VehicleStatus[];
  brandId?: string;
  modelId?: string;
  yearFrom?: number;
  yearTo?: number;
  priceFrom?: number;
  priceTo?: number;
  isActive?: boolean;
}

// --- Marcas y modelos --------------------------------------------------------

export interface VehicleBrand {
  readonly id: string;
  readonly name: string;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface VehicleModel {
  readonly id: string;
  readonly brandId: string;
  readonly brandName: string;
  readonly name: string;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CatalogListParams {
  includeInactive?: boolean;
  brandId?: string;
}
