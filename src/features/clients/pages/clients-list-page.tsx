import type { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Pencil, Plus, Trash2, Users } from 'lucide-react';
import * as React from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable } from '@/components/data-table';
import { FilterBar, FilterSelect, SearchInput } from '@/components/filter-bar';
import { PageHeader } from '@/components/page-header';
import { EmptyState, NoResultsState } from '@/components/states';
import { StatusBadge } from '@/components/status-badge';
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
import { CLIENT_TYPES, CLIENT_TYPE_META } from '@/lib/status';
import { useListParams } from '@/lib/use-list-params';
import { ClientFormDialog } from '../components/client-form-dialog';
import { useClients, useDeleteClient } from '../hooks';
import { type Client, type ClientType, clientDisplayName } from '../types';

interface ClientFilters {
  search: string;
  clientType: ClientType | undefined;
  isActive: boolean | undefined;
}

const INITIAL_FILTERS: ClientFilters = {
  search: '',
  clientType: undefined,
  isActive: undefined,
};

export function ClientsListPage() {
  const { can } = useAuth();
  const { filters, query, hasActiveFilters, setPage, setPageSize, setFilter, resetFilters } =
    useListParams<ClientFilters>(INITIAL_FILTERS);

  const clientsQuery = useClients(query);
  const deleteClient = useDeleteClient();

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Client | undefined>();
  const [deleteTarget, setDeleteTarget] = React.useState<Client | null>(null);

  const canWrite = can('clients:write');
  const canDelete = can('clients:delete');

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(client: Client) {
    setEditing(client);
    setFormOpen(true);
  }

  const columns = React.useMemo<ColumnDef<Client, unknown>[]>(
    () => [
      {
        id: 'name',
        header: 'Cliente',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{clientDisplayName(row.original)}</span>
            <span className="text-xs text-muted-foreground">
              {row.original.documentTypeName} · {row.original.documentNumber}
            </span>
          </div>
        ),
      },
      {
        id: 'clientType',
        header: 'Tipo',
        cell: ({ row }) => <StatusBadge meta={CLIENT_TYPE_META[row.original.clientType]} />,
      },
      {
        id: 'contact',
        header: 'Contacto',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span>{row.original.phone}</span>
            {row.original.email && (
              <span className="text-xs text-muted-foreground">{row.original.email}</span>
            )}
          </div>
        ),
      },
      {
        id: 'city',
        header: 'Ciudad',
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.city ?? '—'}</span>
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
                    <DropdownMenuItem onSelect={() => openEdit(row.original)}>
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
        title="Clientes"
        description="Personas y empresas que cotizan, reservan y compran unidades."
        actions={
          canWrite && (
            <Button onClick={openCreate}>
              <Plus />
              Nuevo cliente
            </Button>
          )
        }
      />

      <FilterBar showClear={hasActiveFilters} onClear={resetFilters}>
        <SearchInput
          value={filters.search}
          onChange={(value) => setFilter('search', value)}
          placeholder="Nombre, documento, telefono o correo…"
        />

        <FilterSelect
          value={filters.clientType}
          onChange={(value) => setFilter('clientType', value as ClientType | undefined)}
          placeholder="Tipo"
          allLabel="Todos los tipos"
          options={CLIENT_TYPES.map((type) => ({
            value: type,
            label: CLIENT_TYPE_META[type].label,
          }))}
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
        data={clientsQuery.data?.data ?? []}
        meta={clientsQuery.data?.meta}
        isLoading={clientsQuery.isLoading}
        isFetching={clientsQuery.isFetching}
        isError={clientsQuery.isError}
        error={clientsQuery.error}
        onRetry={() => void clientsQuery.refetch()}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        resourceLabel="clientes"
        emptyState={
          hasActiveFilters ? (
            <NoResultsState onClear={resetFilters} />
          ) : (
            <EmptyState
              icon={Users}
              title="Todavia no hay clientes"
              description="Registra el primer cliente para poder cotizar y vender."
              action={canWrite && <Button onClick={openCreate}>Nuevo cliente</Button>}
            />
          )
        }
      />

      <ClientFormDialog client={editing} open={formOpen} onOpenChange={setFormOpen} />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Eliminar cliente"
        description={
          <>
            Se eliminara <strong>{deleteTarget ? clientDisplayName(deleteTarget) : ''}</strong>. Si
            tiene cotizaciones, reservas o ventas registradas, el sistema lo impedira: en ese caso
            desactivalo en lugar de borrarlo.
          </>
        }
        confirmLabel="Eliminar"
        destructive
        loading={deleteClient.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteClient.mutate(deleteTarget.id, { onSettled: () => setDeleteTarget(null) });
        }}
      />
    </div>
  );
}
