import type { ColumnDef } from '@tanstack/react-table';
import { Plus, ShoppingCart } from 'lucide-react';
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
import { useSuppliers } from '@/features/suppliers/hooks';
import { formatCivilDate } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { PURCHASE_STATUSES, PURCHASE_STATUS_META, type PurchaseStatus } from '@/lib/status';
import { useListParams } from '@/lib/use-list-params';
import { usePurchases } from '../hooks';
import type { Purchase } from '../types';

interface PurchaseFilters {
  search: string;
  supplierId: string | undefined;
  status: PurchaseStatus | undefined;
  dateFrom: string | undefined;
  dateTo: string | undefined;
}

const INITIAL_FILTERS: PurchaseFilters = {
  search: '',
  supplierId: undefined,
  status: undefined,
  dateFrom: undefined,
  dateTo: undefined,
};

export function PurchasesListPage() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const { filters, query, hasActiveFilters, setPage, setPageSize, setFilter, resetFilters } =
    useListParams<PurchaseFilters>(INITIAL_FILTERS);

  const purchasesQuery = usePurchases(query);
  const suppliersQuery = useSuppliers({ page: 1, pageSize: 100 });
  const suppliers = suppliersQuery.data?.data ?? [];

  const columns = React.useMemo<ColumnDef<Purchase, unknown>[]>(
    () => [
      {
        id: 'purchaseNumber',
        header: 'Numero',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.original.purchaseNumber}</span>
            {row.original.invoiceNumber && (
              <span className="text-xs text-muted-foreground">
                Factura {row.original.invoiceNumber}
              </span>
            )}
          </div>
        ),
      },
      {
        id: 'supplier',
        header: 'Proveedor',
        cell: ({ row }) => <span>{row.original.supplierName}</span>,
      },
      {
        id: 'purchaseDate',
        header: 'Fecha',
        cell: ({ row }) => (
          <span className="tabular">{formatCivilDate(row.original.purchaseDate)}</span>
        ),
      },
      {
        id: 'items',
        header: 'Unidades',
        cell: ({ row }) => (
          <span className="tabular">{row.original.items?.length ?? 0}</span>
        ),
      },
      {
        id: 'totalCost',
        header: 'Total',
        cell: ({ row }) => (
          <span className="tabular font-medium">
            {formatMoney(row.original.totalCost, row.original.currencyCode)}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Estado',
        cell: ({ row }) => <StatusBadge meta={PURCHASE_STATUS_META[row.original.status]} />,
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Compras"
        description="Importaciones registradas, sus unidades y su estado de recepcion."
        actions={
          can('purchases:write') && (
            <Button asChild>
              <Link to="/purchases/new">
                <Plus />
                Nueva compra
              </Link>
            </Button>
          )
        }
      />

      <FilterBar showClear={hasActiveFilters} onClear={resetFilters}>
        <SearchInput
          value={filters.search}
          onChange={(value) => setFilter('search', value)}
          placeholder="Numero, factura o proveedor…"
        />

        <FilterSelect
          value={filters.status}
          onChange={(value) => setFilter('status', value as PurchaseStatus | undefined)}
          placeholder="Estado"
          allLabel="Todos los estados"
          options={PURCHASE_STATUSES.map((status) => ({
            value: status,
            label: PURCHASE_STATUS_META[status].label,
          }))}
        />

        <FilterSelect
          value={filters.supplierId}
          onChange={(value) => setFilter('supplierId', value)}
          placeholder="Proveedor"
          allLabel="Todos los proveedores"
          options={suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }))}
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
        data={purchasesQuery.data?.data ?? []}
        meta={purchasesQuery.data?.meta}
        isLoading={purchasesQuery.isLoading}
        isFetching={purchasesQuery.isFetching}
        isError={purchasesQuery.isError}
        error={purchasesQuery.error}
        onRetry={() => void purchasesQuery.refetch()}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onRowClick={(purchase) => navigate(`/purchases/${purchase.id}`)}
        resourceLabel="compras"
        emptyState={
          hasActiveFilters ? (
            <NoResultsState onClear={resetFilters} />
          ) : (
            <EmptyState
              icon={ShoppingCart}
              title="Todavia no hay compras"
              description="Registra una compra para ingresar unidades al inventario."
              action={
                can('purchases:write') && (
                  <Button asChild>
                    <Link to="/purchases/new">Nueva compra</Link>
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
