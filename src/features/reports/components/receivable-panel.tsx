import type { ColumnDef } from '@tanstack/react-table';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '@/components/data-table';
import { FilterBar, FilterSelect, SearchInput } from '@/components/filter-bar';
import { EmptyState, NoResultsState } from '@/components/states';
import { StatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/features/auth/use-auth';
import { formatCivilDate } from '@/lib/dates';
import { formatMoney, formatNumber } from '@/lib/money';
import { SALE_STATUS_META } from '@/lib/status';
import { useListParams } from '@/lib/use-list-params';
import { ReportForbidden, ReportTotals } from './report-shell';
import { useAccountsReceivable } from '../hooks';
import { REPORT_CURRENCY, sumConverted, type AccountReceivable } from '../types';

interface Filters {
  search: string;
  onlyPending: string | undefined;
  minDaysOutstanding: string | undefined;
}

const INITIAL: Filters = { search: '', onlyPending: undefined, minDaysOutstanding: undefined };

/** Tramos de antiguedad. Es como se lee una cartera: por lo que lleva vencido. */
const AGING = [
  { value: '30', label: '30 dias o mas' },
  { value: '60', label: '60 dias o mas' },
  { value: '90', label: '90 dias o mas' },
];

/**
 * Cuentas por cobrar.
 *
 * Exige `sales:read` ademas de `reports:read`: expone cliente, telefono y saldo.
 */
export function ReceivablePanel() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const { filters, query, hasActiveFilters, setPage, setPageSize, setFilter, resetFilters } =
    useListParams<Filters>(INITIAL);

  const params = React.useMemo(
    () => ({
      ...query,
      // El backend asume `onlyPending: true`; solo se envia para desactivarlo.
      onlyPending: filters.onlyPending === 'false' ? false : undefined,
      minDaysOutstanding: filters.minDaysOutstanding
        ? Number(filters.minDaysOutstanding)
        : undefined,
    }),
    [query, filters.onlyPending, filters.minDaysOutstanding],
  );

  const report = useAccountsReceivable(params);
  const rows = report.data?.data ?? [];

  const columns = React.useMemo<ColumnDef<AccountReceivable, unknown>[]>(
    () => [
      {
        id: 'sale',
        header: 'Venta',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="num font-medium">{row.original.saleNumber}</span>
            <span className="num text-xs text-muted-foreground">
              {formatCivilDate(row.original.saleDate)}
            </span>
          </div>
        ),
      },
      {
        id: 'client',
        header: 'Cliente',
        cell: ({ row }) => (
          <div className="flex min-w-0 flex-col">
            <span className="truncate">{row.original.clientName}</span>
            <span className="num text-xs text-muted-foreground">{row.original.clientPhone}</span>
          </div>
        ),
      },
      {
        id: 'vehicles',
        header: 'Unidades',
        cell: ({ row }) => {
          const { activeItems, returnedItems, chassisNumbers } = row.original;

          return (
            <div className="flex min-w-0 flex-col">
              <span className="text-sm">
                {activeItems} vigente{activeItems === 1 ? '' : 's'}
                {returnedItems > 0 && ` · ${returnedItems} devuelta(s)`}
              </span>
              <span className="num truncate text-xs text-muted-foreground">
                {chassisNumbers.join(' · ') || '—'}
              </span>
            </div>
          );
        },
      },
      {
        id: 'salesperson',
        header: 'Vendedor',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.salespersonName}</span>
        ),
      },
      {
        id: 'balance',
        header: 'Saldo',
        cell: ({ row }) => {
          const { pendingBalance, currencyCode, pendingBalanceConverted } = row.original;
          const otraMoneda = currencyCode !== REPORT_CURRENCY;

          return (
            <div className="flex flex-col text-right">
              <span className="num font-medium">{formatMoney(pendingBalance, currencyCode)}</span>
              {/*
                Un reembolso deshace un cobro, asi que SUMA al saldo: ese dinero
                vuelve a estar pendiente sobre lo que quede vendido.
              */}
              {row.original.totalRefunded > 0 && (
                <span className="num text-xs text-warning">
                  incl. {formatMoney(row.original.totalRefunded, currencyCode)} reembolsado
                </span>
              )}
              {/* En otra divisa se muestra el equivalente: es lo unico sumable. */}
              {otraMoneda && (
                <span className="num text-xs text-muted-foreground">
                  ≈ {formatMoney(pendingBalanceConverted, REPORT_CURRENCY)}
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: 'aging',
        header: 'Antiguedad',
        cell: ({ row }) => {
          const dias = row.original.daysOutstanding;
          const tono = dias >= 90 ? 'red' : dias >= 60 ? 'amber' : dias >= 30 ? 'blue' : 'neutral';

          return (
            <Badge variant={tono}>
              <span className="num">{dias}</span> dias
            </Badge>
          );
        },
      },
      {
        id: 'status',
        header: 'Estado',
        cell: ({ row }) => <StatusBadge meta={SALE_STATUS_META[row.original.saleStatus]} />,
      },
    ],
    [],
  );

  if (!can('sales:read')) {
    return <ReportForbidden needs="sales:read" />;
  }

  const saldoPagina = sumConverted(rows, (row) => row.pendingBalanceConverted);
  const vencido90 = sumConverted(
    rows.filter((row) => row.daysOutstanding >= 90),
    (row) => row.pendingBalanceConverted,
  );
  const masAntiguo = rows.reduce((maximo, row) => Math.max(maximo, row.daysOutstanding), 0);

  return (
    <div className="flex flex-col gap-4">
      <FilterBar showClear={hasActiveFilters} onClear={resetFilters} className="print:hidden">
        <SearchInput
          value={filters.search}
          onChange={(value) => setFilter('search', value)}
          placeholder="Venta, cliente o chasis…"
        />

        <FilterSelect
          value={filters.minDaysOutstanding}
          onChange={(value) => setFilter('minDaysOutstanding', value)}
          placeholder="Antiguedad"
          allLabel="Cualquier antiguedad"
          options={AGING}
        />

        <FilterSelect
          value={filters.onlyPending}
          onChange={(value) => setFilter('onlyPending', value)}
          placeholder="Saldo"
          allLabel="Solo con saldo"
          options={[{ value: 'false', label: 'Incluir saldadas' }]}
        />
      </FilterBar>

      <ReportTotals
        items={[
          { label: 'Cuentas en pagina', value: formatNumber(rows.length) },
          {
            label: `Saldo (pagina, ${REPORT_CURRENCY})`,
            value: formatMoney(saldoPagina, REPORT_CURRENCY),
            tone: saldoPagina > 0 ? 'warning' : 'neutral',
          },
          {
            label: 'Vencido 90+ dias',
            value: formatMoney(vencido90, REPORT_CURRENCY),
            tone: vencido90 > 0 ? 'danger' : 'neutral',
          },
          { label: 'Mas antigua', value: `${formatNumber(masAntiguo)} dias` },
        ]}
      />

      <p className="text-xs leading-relaxed text-muted-foreground">
        Los totales corresponden a las cuentas de esta pagina. Por defecto solo se listan las ventas
        con saldo pendiente. La antiguedad se cuenta desde la fecha de la venta.
      </p>

      <DataTable
        columns={columns}
        data={rows}
        meta={report.data?.meta}
        isLoading={report.isLoading}
        isFetching={report.isFetching}
        isError={report.isError}
        error={report.error}
        onRetry={() => void report.refetch()}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onRowClick={(row) => navigate(`/sales/${row.saleId}`)}
        resourceLabel="cuentas"
        emptyState={
          hasActiveFilters ? (
            <NoResultsState onClear={resetFilters} />
          ) : (
            <EmptyState
              title="Nada por cobrar"
              description="No hay ventas con saldo pendiente."
            />
          )
        }
      />
    </div>
  );
}
