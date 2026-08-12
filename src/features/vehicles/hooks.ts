import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/use-auth';
import { handleApiError } from '@/lib/errors';
import { queryKeys } from '@/lib/query-client';
import { VEHICLE_STATUS_META } from '@/lib/status';
import { vehicleCatalogsApi, vehiclesApi } from './api';
import type { CreateVehicleInput, UpdateVehicleInput } from './schemas';
import type {
  AssignableVehicleStatus,
  CatalogListParams,
  VehicleListParams,
} from './types';

/**
 * Hooks de TanStack Query del modulo.
 *
 * Toda la comunicacion con el servidor pasa por aqui: ninguna pantalla llama a
 * `api.ts` directamente ni guarda respuestas en `useState`.
 */

export function useVehicles(params: VehicleListParams) {
  const { can } = useAuth();

  return useQuery({
    queryKey: queryKeys.vehicles(params),
    queryFn: () => vehiclesApi.list(params),
    enabled: can('vehicles:read'),
    // Mantener la pagina anterior mientras llega la nueva evita el salto de
    // altura al paginar o filtrar.
    placeholderData: (previous) => previous,
  });
}

export function useVehicle(id: string | undefined) {
  const { can } = useAuth();

  return useQuery({
    queryKey: queryKeys.vehicle(id ?? ''),
    queryFn: () => vehiclesApi.getById(id as string),
    enabled: Boolean(id) && can('vehicles:read'),
  });
}

export function useVehiclesSummary() {
  const { can } = useAuth();

  return useQuery({
    queryKey: queryKeys.vehiclesSummary,
    queryFn: () => vehiclesApi.summary(),
    enabled: can('vehicles:read'),
  });
}

/** Invalida listados y resumen tras cualquier escritura sobre vehiculos. */
function useInvalidateVehicles() {
  const queryClient = useQueryClient();

  return (id?: string) => {
    void queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    if (id) void queryClient.invalidateQueries({ queryKey: queryKeys.vehicle(id) });
  };
}

export function useCreateVehicle() {
  const invalidate = useInvalidateVehicles();

  return useMutation({
    mutationFn: (input: CreateVehicleInput) => vehiclesApi.create(input),
    onSuccess: (vehicle) => {
      toast.success('Vehiculo registrado', { description: vehicle.chassisNumber });
      invalidate(vehicle.id);
    },
    // El error se propaga: la pagina lo pinta campo a campo en el formulario.
  });
}

export function useUpdateVehicle(id: string) {
  const invalidate = useInvalidateVehicles();

  return useMutation({
    mutationFn: (input: UpdateVehicleInput) => vehiclesApi.update(id, input),
    onSuccess: (vehicle) => {
      toast.success('Vehiculo actualizado', { description: vehicle.chassisNumber });
      invalidate(id);
    },
  });
}

/**
 * El cambio de estado esta sujeto a la maquina de estados: si el backend lo
 * rechaza, el 422 trae en `details.allowed` los destinos validos.
 */
export function useChangeVehicleStatus(id: string) {
  const invalidate = useInvalidateVehicles();

  return useMutation({
    mutationFn: (status: AssignableVehicleStatus) => vehiclesApi.changeStatus(id, status),
    onSuccess: (vehicle) => {
      toast.success('Estado actualizado', {
        description: `El vehiculo paso a "${VEHICLE_STATUS_META[vehicle.status].label}".`,
      });
      invalidate(id);
    },
    onError: (error) => handleApiError(error, { title: 'No se pudo cambiar el estado' }),
  });
}

export function useDeleteVehicle() {
  const invalidate = useInvalidateVehicles();

  return useMutation({
    mutationFn: (id: string) => vehiclesApi.remove(id),
    onSuccess: () => {
      toast.success('Vehiculo eliminado');
      invalidate();
    },
    onError: (error) => handleApiError(error, { title: 'No se pudo eliminar el vehiculo' }),
  });
}

// --- Imagenes ----------------------------------------------------------------

export function useVehicleImages(vehicleId: string | undefined) {
  const { can } = useAuth();

  return useQuery({
    queryKey: queryKeys.vehicleImages(vehicleId ?? ''),
    queryFn: () => vehiclesApi.listImages(vehicleId as string),
    enabled: Boolean(vehicleId) && can('vehicles:read'),
  });
}

function useInvalidateImages(vehicleId: string) {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.vehicleImages(vehicleId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.vehicle(vehicleId) });
  };
}

export function useAddVehicleImage(vehicleId: string) {
  const invalidate = useInvalidateImages(vehicleId);

  return useMutation({
    mutationFn: (input: { url: string; isPrimary?: boolean }) =>
      vehiclesApi.addImage(vehicleId, input),
    onSuccess: () => {
      toast.success('Imagen agregada');
      invalidate();
    },
    onError: (error) => handleApiError(error, { title: 'No se pudo agregar la imagen' }),
  });
}

export function useSetPrimaryImage(vehicleId: string) {
  const invalidate = useInvalidateImages(vehicleId);

  return useMutation({
    mutationFn: (imageId: string) => vehiclesApi.setPrimaryImage(vehicleId, imageId),
    onSuccess: () => {
      toast.success('Imagen principal actualizada');
      invalidate();
    },
    onError: (error) => handleApiError(error, { title: 'No se pudo cambiar la portada' }),
  });
}

export function useDeleteVehicleImage(vehicleId: string) {
  const invalidate = useInvalidateImages(vehicleId);

  return useMutation({
    mutationFn: (imageId: string) => vehiclesApi.removeImage(vehicleId, imageId),
    onSuccess: () => {
      // Al borrar la principal el backend promueve otra automaticamente.
      toast.success('Imagen eliminada');
      invalidate();
    },
    onError: (error) => handleApiError(error, { title: 'No se pudo eliminar la imagen' }),
  });
}

// --- Marcas y modelos --------------------------------------------------------

export function useBrands(params: CatalogListParams = {}) {
  const { can } = useAuth();

  return useQuery({
    queryKey: queryKeys.brands(params),
    queryFn: () => vehicleCatalogsApi.listBrands(params),
    enabled: can('catalogs:read'),
    staleTime: 5 * 60_000,
  });
}

export function useModels(params: CatalogListParams = {}) {
  const { can } = useAuth();

  return useQuery({
    queryKey: queryKeys.models(params),
    // Sin marca elegida no se piden modelos: el select va en cascada.
    queryFn: () => vehicleCatalogsApi.listModels(params),
    enabled: can('catalogs:read'),
    staleTime: 5 * 60_000,
  });
}

function useInvalidateVehicleCatalogs() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: ['vehicle-brands'] });
    void queryClient.invalidateQueries({ queryKey: ['vehicle-models'] });
  };
}

export function useCreateBrand() {
  const invalidate = useInvalidateVehicleCatalogs();

  return useMutation({
    mutationFn: (input: { name: string }) => vehicleCatalogsApi.createBrand(input),
    onSuccess: (brand) => {
      toast.success(`Marca "${brand.name}" creada`);
      invalidate();
    },
  });
}

export function useUpdateBrand() {
  const invalidate = useInvalidateVehicleCatalogs();

  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; name?: string; isActive?: boolean }) =>
      vehicleCatalogsApi.updateBrand(id, input),
    onSuccess: () => {
      toast.success('Marca actualizada');
      invalidate();
    },
  });
}

export function useCreateModel() {
  const invalidate = useInvalidateVehicleCatalogs();

  return useMutation({
    mutationFn: (input: { brandId: string; name: string }) => vehicleCatalogsApi.createModel(input),
    onSuccess: (model) => {
      toast.success(`Modelo "${model.name}" creado`);
      invalidate();
    },
  });
}

export function useUpdateModel() {
  const invalidate = useInvalidateVehicleCatalogs();

  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; name?: string; isActive?: boolean }) =>
      vehicleCatalogsApi.updateModel(id, input),
    onSuccess: () => {
      toast.success('Modelo actualizado');
      invalidate();
    },
  });
}
