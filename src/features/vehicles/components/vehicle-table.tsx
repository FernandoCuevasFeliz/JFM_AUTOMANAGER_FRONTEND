import type { ColumnDef } from '@tanstack/react-table';
import { Car, Eye, MoreHorizontal, Pencil, RefreshCcw, Trash2 } from 'lucide-react';
import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DataTable } from '@/components/data-table';
import { EmptyState, NoResultsState } from '@/components/states';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { PageMeta } from '@/lib/api-types';
import { formatMoney, formatNumber } from '@/lib/money';
import { isCommerciallyManagedStatus } from '@/lib/status';
import { useAuth } from '@/features/auth/use-auth';
import type { Vehicle } from '../types';
import { VehicleStatusBadge } from './vehicle-status-badge';

interface VehicleTableProps {
  data: Vehicle[];
  meta?: PageMeta;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onChangeStatus: (vehicle: Vehicle) => void;
  onDelete: (vehicle: Vehicle) => void;
}

export function VehicleTable({
  data,
  meta,
  isLoading,
  isFetching,
  isError,
  error,
  onRetry,
  onPageChange,
  onPageSizeChange,
  hasActiveFilters,
  onClearFilters,
  onChangeStatus,
  onDelete,
}: VehicleTableProps) {
  const navigate = useNavigate();
  const { can } = useAuth();

  const canWrite = can('vehicles:write');
  const canChangeStatus = can('vehicles:change-status');
  const canDelete = can('vehicles:delete');

  const columns = React.useMemo<ColumnDef<Vehicle, unknown>[]>(
    () => [
      {
        id: 'vehicle',
        header: 'Vehiculo',
        cell: ({ row }) => {
          const vehicle = row.original;
          const cover = vehicle.images?.find((image) => image.isPrimary) ?? vehicle.images?.[0];

          return (
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
                {cover ? (
                  <img src={cover.url} alt="" className="size-full object-cover" loading="lazy" />
                ) : (
                  <Car className="size-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-medium">
                  {vehicle.brandName} {vehicle.modelName}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {vehicle.year} · {vehicle.chassisNumber}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        id: 'status',
        header: 'Estado',
        cell: ({ row }) => <VehicleStatusBadge status={row.original.status} />,
      },
      {
        id: 'color',
        header: 'Color',
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.color ?? '—'}</span>
        ),
      },
      {
        id: 'mileage',
        header: 'Kilometraje',
        cell: ({ row }) => (
          <span className="tabular">
            {row.original.mileage === null ? '—' : `${formatNumber(row.original.mileage)} km`}
          </span>
        ),
      },
      {
        id: 'salePrice',
        header: 'Precio de lista',
        cell: ({ row }) => (
          <span className="tabular font-medium">{formatMoney(row.original.salePrice, 'DOP')}</span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const vehicle = row.original;
          // Un vehiculo reservado o vendido no se borra (§7 de API.md).
          const deletable = canDelete && !isCommerciallyManagedStatus(vehicle.status);

          return (
            <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label="Acciones">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to={`/vehicles/${vehicle.id}`}>
                      <Eye />
                      Ver ficha
                    </Link>
                  </DropdownMenuItem>

                  {canWrite && (
                    <DropdownMenuItem asChild>
                      <Link to={`/vehicles/${vehicle.id}/edit`}>
                        <Pencil />
                        Editar
                      </Link>
                    </DropdownMenuItem>
                  )}

                  {canChangeStatus && !isCommerciallyManagedStatus(vehicle.status) && (
                    <DropdownMenuItem onSelect={() => onChangeStatus(vehicle)}>
                      <RefreshCcw />
                      Cambiar estado
                    </DropdownMenuItem>
                  )}

                  {deletable && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem destructive onSelect={() => onDelete(vehicle)}>
                        <Trash2 />
                        Eliminar
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [canWrite, canChangeStatus, canDelete, onChangeStatus, onDelete],
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      meta={meta}
      isLoading={isLoading}
      isFetching={isFetching}
      isError={isError}
      error={error}
      onRetry={onRetry}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      onRowClick={(vehicle) => navigate(`/vehicles/${vehicle.id}`)}
      resourceLabel="vehiculos"
      emptyState={
        hasActiveFilters ? (
          <NoResultsState onClear={onClearFilters} />
        ) : (
          <EmptyState
            icon={Car}
            title="Todavia no hay vehiculos"
            description="Registra la primera unidad para empezar a controlar el inventario."
            action={
              canWrite && (
                <Button asChild>
                  <Link to="/vehicles/new">Registrar vehiculo</Link>
                </Button>
              )
            }
          />
        )
      }
    />
  );
}
