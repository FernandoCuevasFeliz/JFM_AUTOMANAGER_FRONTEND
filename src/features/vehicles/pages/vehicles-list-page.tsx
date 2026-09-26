import { Plus } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router-dom';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { FilterBar, FilterSelect, SearchInput } from '@/components/filter-bar';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/use-auth';
import { VEHICLE_STATUSES, VEHICLE_STATUS_META } from '@/lib/status';
import { useListParams } from '@/lib/use-list-params';
import { VehicleStatusDialog } from '../components/vehicle-status-dialog';
import { VehicleTable } from '../components/vehicle-table';
import { useBrands, useDeleteVehicle, useModels, useVehicles } from '../hooks';
import type { Vehicle, VehicleStatus } from '../types';

interface VehicleFilters {
  search: string;
  status: VehicleStatus[];
  brandId: string | undefined;
  modelId: string | undefined;
  isActive: boolean | undefined;
}

const INITIAL_FILTERS: VehicleFilters = {
  search: '',
  status: [],
  brandId: undefined,
  modelId: undefined,
  isActive: undefined,
};

export function VehiclesListPage() {
  const { can } = useAuth();
  const { page, filters, query, hasActiveFilters, setPage, setPageSize, setFilter, resetFilters } =
    useListParams<VehicleFilters>(INITIAL_FILTERS);

  const vehiclesQuery = useVehicles(query);
  const brandsQuery = useBrands();
  const modelsQuery = useModels(filters.brandId ? { brandId: filters.brandId } : {});
  const deleteVehicle = useDeleteVehicle();

  const [statusTarget, setStatusTarget] = React.useState<Vehicle | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Vehicle | null>(null);

  const brands = brandsQuery.data ?? [];
  const models = filters.brandId ? (modelsQuery.data ?? []) : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Vehiculos"
        description="Inventario completo de unidades, su estado y su precio de lista."
        actions={
          can('vehicles:write') && (
            <Button asChild>
              <Link to="/vehicles/new">
                <Plus />
                Nuevo vehiculo
              </Link>
            </Button>
          )
        }
      />

      <FilterBar showClear={hasActiveFilters} onClear={resetFilters}>
        <SearchInput
          value={filters.search}
          onChange={(value) => setFilter('search', value)}
          placeholder="Chasis, color, marca o modelo…"
        />

        <FilterSelect
          value={filters.status[0]}
          onChange={(value) => setFilter('status', value ? [value as VehicleStatus] : [])}
          placeholder="Estado"
          allLabel="Todos los estados"
          options={VEHICLE_STATUSES.map((status) => ({
            value: status,
            label: VEHICLE_STATUS_META[status].label,
          }))}
        />

        <FilterSelect
          value={filters.brandId}
          onChange={(value) => {
            setFilter('brandId', value);
            // Cambiar de marca deja sin sentido el modelo elegido.
            setFilter('modelId', undefined);
          }}
          placeholder="Marca"
          allLabel="Todas las marcas"
          options={brands.map((brand) => ({ value: brand.id, label: brand.name }))}
        />

        <FilterSelect
          value={filters.modelId}
          onChange={(value) => setFilter('modelId', value)}
          placeholder="Modelo"
          allLabel="Todos los modelos"
          disabled={!filters.brandId}
          options={models.map((model) => ({ value: model.id, label: model.name }))}
        />

        <FilterSelect
          value={filters.isActive === undefined ? undefined : String(filters.isActive)}
          onChange={(value) => setFilter('isActive', value === undefined ? undefined : value === 'true')}
          placeholder="Visibilidad"
          allLabel="Activos e inactivos"
          className="sm:w-44"
          options={[
            { value: 'true', label: 'Solo activos' },
            { value: 'false', label: 'Solo inactivos' },
          ]}
        />
      </FilterBar>

      <VehicleTable
        data={vehiclesQuery.data?.data ?? []}
        meta={vehiclesQuery.data?.meta}
        isLoading={vehiclesQuery.isLoading}
        isFetching={vehiclesQuery.isFetching}
        isError={vehiclesQuery.isError}
        error={vehiclesQuery.error}
        onRetry={() => void vehiclesQuery.refetch()}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={resetFilters}
        onChangeStatus={setStatusTarget}
        onDelete={setDeleteTarget}
      />

      {statusTarget && (
        <VehicleStatusDialog
          vehicle={statusTarget}
          open
          onOpenChange={(open) => !open && setStatusTarget(null)}
        />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Eliminar vehiculo"
        description={
          <>
            Se eliminara <strong>{deleteTarget?.chassisNumber}</strong> ({deleteTarget?.brandName}{' '}
            {deleteTarget?.modelName}). El borrado es logico: la unidad desaparece de los listados
            pero conserva su historia.
          </>
        }
        confirmLabel="Eliminar"
        destructive
        loading={deleteVehicle.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteVehicle.mutate(deleteTarget.id, {
            onSuccess: () => {
              setDeleteTarget(null);
              // Al vaciarse la ultima pagina hay que retroceder una.
              if (vehiclesQuery.data?.data.length === 1 && page > 1) setPage(page - 1);
            },
          });
        }}
      />
    </div>
  );
}
