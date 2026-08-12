import type { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Pencil, Plus, Trash2, Truck } from 'lucide-react';
import * as React from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable } from '@/components/data-table';
import { FilterBar, FilterSelect, SearchInput } from '@/components/filter-bar';
import { PageHeader } from '@/components/page-header';
import { EmptyState, NoResultsState } from '@/components/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/features/auth/use-auth';
import { useListParams } from '@/lib/use-list-params';
import { SupplierFormDialog } from '../components/supplier-form-dialog';
import { useDeleteSupplier, useSuppliers } from '../hooks';
import type { Supplier } from '../types';

interface SupplierFilters {
  search: string;
  isActive: boolean | undefined;
}

const INITIAL_FILTERS: SupplierFilters = { search: '', isActive: undefined };

export function SuppliersListPage() {
  const { can } = useAuth();
  const { filters, query, hasActiveFilters, setPage, setPageSize, setFilter, resetFilters } =
    useListParams<SupplierFilters>(INITIAL_FILTERS);

  const suppliersQuery = useSuppliers(query);
  const deleteSupplier = useDeleteSupplier();

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Supplier | undefined>();
  const [deleteTarget, setDeleteTarget] = React.useState<Supplier | null>(null);

  const canWrite = can('suppliers:write');
  const canDelete = can('suppliers:delete');

  const columns = React.useMemo<ColumnDef<Supplier, unknown>[]>(
    () => [
      {
        id: 'name',
        header: 'Proveedor',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.original.name}</span>
            {row.original.contactName && (
              <span className="text-xs text-muted-foreground">
                Contacto: {row.original.contactName}
              </span>
            )}
          </div>
        ),
      },
      {
        id: 'country',
        header: 'Pais',
        cell: ({ row }) => <span>{row.original.country ?? '—'}</span>,
      },
      {
        id: 'contact',
        header: 'Contacto',
        cell: ({ row }) => (
          <div className="flex flex-col text-sm">
            <span>{row.original.phone ?? '—'}</span>
            {row.original.email && (
              <span className="text-xs text-muted-foreground">{row.original.email}</span>
            )}
          </div>
        ),
      },
      {
        id: 'documentNumber',
        header: 'Documento',
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.documentNumber ?? '—'}</span>
        ),
      },
      {
        id: 'isActive',
        header: 'Estado',
        cell: ({ row }) =>
          row.original.isActive ? (
            <Badge variant="green">Activo</Badge>
          ) : (
            <Badge variant="neutral">Inactivo</Badge>
          ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          if (!canWrite && !canDelete) return null;

          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label="Acciones">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canWrite && (
                    <DropdownMenuItem
                      onSelect={() => {
                        setEditing(row.original);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil />
                      Editar
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem destructive onSelect={() => setDeleteTarget(row.original)}>
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
    [canWrite, canDelete],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Proveedores"
        description="Exportadores y suplidores de las unidades importadas."
        actions={
          canWrite && (
            <Button
              onClick={() => {
                setEditing(undefined);
                setFormOpen(true);
              }}
            >
              <Plus />
              Nuevo proveedor
            </Button>
          )
        }
      />

      <FilterBar showClear={hasActiveFilters} onClear={resetFilters}>
        <SearchInput
          value={filters.search}
          onChange={(value) => setFilter('search', value)}
          placeholder="Nombre, contacto, documento o correo…"
        />

        <FilterSelect
          value={filters.isActive === undefined ? undefined : String(filters.isActive)}
          onChange={(value) => setFilter('isActive', value === undefined ? undefined : value === 'true')}
          placeholder="Estado"
          allLabel="Activos e inactivos"
          className="sm:w-44"
          options={[
            { value: 'true', label: 'Solo activos' },
            { value: 'false', label: 'Solo inactivos' },
          ]}
        />
      </FilterBar>

      <DataTable
        columns={columns}
        data={suppliersQuery.data?.data ?? []}
        meta={suppliersQuery.data?.meta}
        isLoading={suppliersQuery.isLoading}
        isFetching={suppliersQuery.isFetching}
        isError={suppliersQuery.isError}
        error={suppliersQuery.error}
        onRetry={() => void suppliersQuery.refetch()}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        resourceLabel="proveedores"
        emptyState={
          hasActiveFilters ? (
            <NoResultsState onClear={resetFilters} />
          ) : (
            <EmptyState
              icon={Truck}
              title="Todavia no hay proveedores"
              description="Registra un proveedor para poder cargar compras."
              action={
                canWrite && (
                  <Button
                    onClick={() => {
                      setEditing(undefined);
                      setFormOpen(true);
                    }}
                  >
                    Nuevo proveedor
                  </Button>
                )
              }
            />
          )
        }
      />

      <SupplierFormDialog supplier={editing} open={formOpen} onOpenChange={setFormOpen} />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Eliminar proveedor"
        description={
          <>
            Se eliminara <strong>{deleteTarget?.name}</strong>. Si tiene compras registradas el
            sistema lo impedira: desactivalo en su lugar.
          </>
        }
        confirmLabel="Eliminar"
        destructive
        loading={deleteSupplier.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteSupplier.mutate(deleteTarget.id, { onSettled: () => setDeleteTarget(null) });
        }}
      />
    </div>
  );
}
