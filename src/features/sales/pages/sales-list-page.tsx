import type { ColumnDef } from '@tanstack/react-table';
import { BadgeDollarSign, Plus } from 'lucide-react';
import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DataTable } from '@/components/data-table';
import { FilterBar, FilterSelect, SearchInput } from '@/components/filter-bar';
import { PageHeader } from '@/components/page-header';
import { EmptyState, NoResultsState } from '@/components/states';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/features/auth/use-auth';
import { formatCivilDate } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { SALE_STATUSES, SALE_STATUS_META } from '@/lib/status';
import { useListParams } from '@/lib/use-list-params';
import { useSales } from '../hooks';
import type { Sale, SaleStatus } from '../types';

interface SaleFilters {
  search: string;
  status: SaleStatus | undefined;
  dateFrom: string | undefined;
  dateTo: string | undefined;
}

const INITIAL_FILTERS: SaleFilters = {
  search: '',
  status: undefined,
  dateFrom: undefined,
  dateTo: undefined,
};

export function SalesListPage() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const { filters, query, hasActiveFilters, setPage, setPageSize, setFilter, resetFilters } =
    useListParams<SaleFilters>(INITIAL_FILTERS);

  const salesQuery = useSales(query);

  const columns = React.useMemo<ColumnDef<Sale, unknown>[]>(
    () => [
      {
        id: 'saleNumber',
        header: 'Numero',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.original.saleNumber}</span>
            <span className="tabular text-xs text-muted-foreground">
              {formatCivilDate(row.original.saleDate)}
            </span>
          </div>
        ),
      },
      {
        id: 'client',
        header: 'Cliente',
        cell: ({ row }) => <span>{row.original.clientName}</span>,
      },
      {
        id: 'vehicle',
        header: 'Vehiculo',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span>
              {row.original.vehicleBrandName} {row.original.vehicleModelName}
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {row.original.vehicleChassisNumber}
            </span>
          </div>
        ),
      },
      {
        id: 'salePrice',
        header: 'Precio',
        cell: ({ row }) => (
          <span className="tabular font-medium">
            {formatMoney(row.original.salePrice, row.original.currencyCode)}
          </span>
        ),
      },
      {
        id: 'pendingBalance',
        header: 'Saldo',
        cell: ({ row }) => {
          const pending = row.original.pendingBalance;

          return (
            <span
              className={
                pending > 0 ? 'tabular font-medium text-amber-600' : 'tabular text-emerald-600'
              }
            >
              {pending > 0 ? formatMoney(pending, row.original.currencyCode) : 'Saldada'}
            </span>
          );
        },
      },
      {
        id: 'status',
        header: 'Estado',
        cell: ({ row }) => <StatusBadge meta={SALE_STATUS_META[row.original.status]} />,
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Ventas"
        description="Operaciones cerradas, su estado de cobro y su entrega."
        actions={
          can('sales:write') && (
            <Button asChild>
              <Link to="/sales/new">
                <Plus />
                Nueva venta
              </Link>
            </Button>
          )
        }
      />

      <FilterBar showClear={hasActiveFilters} onClear={resetFilters}>
        <SearchInput
          value={filters.search}
          onChange={(value) => setFilter('search', value)}
          placeholder="Numero, chasis o cliente…"
        />

        <FilterSelect
          value={filters.status}
          onChange={(value) => setFilter('status', value as SaleStatus | undefined)}
          placeholder="Estado"
          allLabel="Todos los estados"
          options={SALE_STATUSES.map((status) => ({
            value: status,
            label: SALE_STATUS_META[status].label,
          }))}
        />

        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={filters.dateFrom ?? ''}
            onChange={(event) => setFilter('dateFrom', event.target.value || undefined)}
            className="w-40"
            aria-label="Desde"
          />
          <span className="text-sm text-muted-foreground">a</span>
          <Input
            type="date"
            value={filters.dateTo ?? ''}
            onChange={(event) => setFilter('dateTo', event.target.value || undefined)}
            className="w-40"
            aria-label="Hasta"
          />
        </div>
      </FilterBar>

      <DataTable
        columns={columns}
        data={salesQuery.data?.data ?? []}
        meta={salesQuery.data?.meta}
        isLoading={salesQuery.isLoading}
        isFetching={salesQuery.isFetching}
        isError={salesQuery.isError}
        error={salesQuery.error}
        onRetry={() => void salesQuery.refetch()}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onRowClick={(sale) => navigate(`/sales/${sale.id}`)}
        resourceLabel="ventas"
        emptyState={
          hasActiveFilters ? (
            <NoResultsState onClear={resetFilters} />
          ) : (
            <EmptyState
              icon={BadgeDollarSign}
              title="Todavia no hay ventas"
              description="Registra una venta para cerrar el ciclo comercial."
              action={
                can('sales:write') && (
                  <Button asChild>
                    <Link to="/sales/new">Nueva venta</Link>
                  </Button>
                )
              }
            />
          )
        }
      />
    </div>
  );
}
