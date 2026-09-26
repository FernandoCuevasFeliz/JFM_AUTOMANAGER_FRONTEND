import { api } from '@/lib/api-client';
import type { QueryParams } from '@/lib/api-types';
import type {
  AssignableVehicleStatus,
  CatalogListParams,
  Vehicle,
  VehicleBrand,
  VehicleImage,
  VehicleListParams,
  VehicleModel,
  VehicleSummary,
} from './types';
import type { CreateVehicleInput, UpdateVehicleInput } from './schemas';

export const vehiclesApi = {
  list(params: VehicleListParams) {
    return api.list<Vehicle>('/vehicles', params as QueryParams);
  },

  getById(id: string) {
    return api.get<Vehicle>(`/vehicles/${id}`);
  },

  summary() {
    return api.get<VehicleSummary>('/vehicles/summary');
  },

  create(input: CreateVehicleInput) {
    return api.post<Vehicle>('/vehicles', input);
  },

  /** `PATCH /vehicles/:id` no acepta `status`: tiene endpoint propio. */
  update(id: string, input: UpdateVehicleInput) {
    return api.patch<Vehicle>(`/vehicles/${id}`, input);
  },

  changeStatus(id: string, status: AssignableVehicleStatus) {
    return api.patch<Vehicle>(`/vehicles/${id}/status`, { status });
  },

  remove(id: string) {
    return api.delete(`/vehicles/${id}`);
  },

  // --- Imagenes -------------------------------------------------------------
  // El backend solo guarda la URL: el archivo se sube a ImageKit desde el
  // navegador y aqui se registra el resultado.

  listImages(vehicleId: string) {
    return api.get<VehicleImage[]>(`/vehicles/${vehicleId}/images`);
  },

  addImage(vehicleId: string, input: { url: string; isPrimary?: boolean }) {
    return api.post<VehicleImage>(`/vehicles/${vehicleId}/images`, input);
  },

  setPrimaryImage(vehicleId: string, imageId: string) {
    return api.patch<VehicleImage>(`/vehicles/${vehicleId}/images/${imageId}/primary`);
  },

  removeImage(vehicleId: string, imageId: string) {
    return api.delete(`/vehicles/${vehicleId}/images/${imageId}`);
  },
};

/**
 * Marcas y modelos viven bajo `catalogs:*` pero se consumen desde el modulo de
 * vehiculos, que es donde tienen sentido.
 */
export const vehicleCatalogsApi = {
  listBrands(params: CatalogListParams = {}) {
    return api.get<VehicleBrand[]>('/vehicle-brands', params as QueryParams);
  },

  createBrand(input: { name: string }) {
    return api.post<VehicleBrand>('/vehicle-brands', input);
  },

  /** Las marcas no se borran: se desactivan (siempre hay historicos apuntando). */
  updateBrand(id: string, input: { name?: string; isActive?: boolean }) {
    return api.patch<VehicleBrand>(`/vehicle-brands/${id}`, input);
  },

  listModels(params: CatalogListParams = {}) {
    return api.get<VehicleModel[]>('/vehicle-models', params as QueryParams);
  },

  createModel(input: { brandId: string; name: string }) {
    return api.post<VehicleModel>('/vehicle-models', input);
  },

  updateModel(id: string, input: { name?: string; isActive?: boolean }) {
    return api.patch<VehicleModel>(`/vehicle-models/${id}`, input);
  },
};
