import type { ColumnDef } from '@tanstack/react-table';
import { FileSpreadsheet } from 'lucide-react';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '@/components/data-table';
import { FilterBar, FilterSelect, SearchInput } from '@/components/filter-bar';
import { PageHeader } from '@/components/page-header';
import { EmptyState, NoResultsState } from '@/components/states';
import { StatusBadge } from '@/components/status-badge';
import { Input } from '@/components/ui/input';
import { formatCivilDate } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { FISCAL_DOC_STATUSES, FISCAL_DOC_STATUS_META, type FiscalDocStatus } from '@/lib/status';
import { useListParams } from '@/lib/use-list-params';
import { useInvoices } from '../hooks';
import { INVOICE_NCF_TYPES, NCF_TYPE_LABELS, type Invoice, type NcfType } from '../types';

interface InvoiceFilters {
  search: string;
  status: FiscalDocStatus | undefined;
  ncfType: NcfType | undefined;
  dateFrom: string | undefined;
  dateTo: string | undefined;
}

const INITIAL_FILTERS: InvoiceFilters = {
  search: '',
  status: undefined,
  ncfType: undefined,
  dateFrom: undefined,
  dateTo: undefined,
};

export function InvoicesListPage() {
  const navigate = useNavigate();
  const { filters, query, hasActiveFilters, setPage, setPageSize, setFilter, resetFilters } =
    useListParams<InvoiceFilters>(INITIAL_FILTERS);

  const invoicesQuery = useInvoices(query);

  const columns = React.useMemo<ColumnDef<Invoice, unknown>[]>(
    () => [
      {
        id: 'ncf',
        header: 'NCF',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="num font-medium">{row.original.ncfNumber ?? 'Sin asignar'}</span>
            <span className="text-xs text-muted-foreground">
              {row.original.ncfType} · {NCF_TYPE_LABELS[row.original.ncfType]}
            </span>
          </div>
        ),
      },
      {
        id: 'sale',
        header: 'Venta',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="num">{row.original.saleNumber}</span>
            <span className="text-xs text-muted-foreground">
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
            {row.original.clientDocumentNumber && (
              <span className="num text-xs text-muted-foreground">
                {row.original.clientDocumentNumber}
              </span>
            )}
          </div>
        ),
      },
      {
        id: 'amount',
        header: 'Importe',
        cell: ({ row }) => {
          const { salePrice, netAmount, creditedAmount, currencyCode } = row.original;
          const acreditada = creditedAmount > 0;

          return (
            <div className="flex flex-col">
              <span className={acreditada ? 'num text-muted-foreground line-through' : 'num font-medium'}>
                {formatMoney(salePrice, currencyCode)}
              </span>
              {acreditada && (
                <span className="num font-medium">{formatMoney(netAmount, currencyCode)}</span>
              )}
            </div>
          );
        },
      },
      {
        id: 'status',
        header: 'Estado',
        cell: ({ row }) => <StatusBadge meta={FISCAL_DOC_STATUS_META[row.original.status]} />,
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Facturacion"
        title="Comprobantes fiscales"
        description="Facturas electronicas (e-CF) de las ventas y sus notas de credito."
      />

      <FilterBar showClear={hasActiveFilters} onClear={resetFilters}>
        <SearchInput
          value={filters.search}
          onChange={(value) => setFilter('search', value)}
          placeholder="NCF, venta, cliente o documento…"
        />

        <FilterSelect
          value={filters.status}
          onChange={(value) => setFilter('status', value as FiscalDocStatus | undefined)}
          placeholder="Estado"
          allLabel="Todos los estados"
          options={FISCAL_DOC_STATUSES.map((status) => ({
            value: status,
            label: FISCAL_DOC_STATUS_META[status].label,
          }))}
        />

        <FilterSelect
          value={filters.ncfType}
          onChange={(value) => setFilter('ncfType', value as NcfType | undefined)}
          placeholder="Tipo"
          allLabel="Todos los tipos"
          options={INVOICE_NCF_TYPES.map((type) => ({
            value: type,
            label: `${type} · ${NCF_TYPE_LABELS[type]}`,
          }))}
        />

        {/* El rango filtra por fecha de emision, no por fecha de la venta. */}
        <Input
          type="date"
          aria-label="Emitidas desde"
          value={filters.dateFrom ?? ''}
          onChange={(event) => setFilter('dateFrom', event.target.value || undefined)}
          className="w-full sm:w-40"
        />
        <Input
          type="date"
          aria-label="Emitidas hasta"
          value={filters.dateTo ?? ''}
          onChange={(event) => setFilter('dateTo', event.target.value || undefined)}
          className="w-full sm:w-40"
        />
      </FilterBar>

      <DataTable
        columns={columns}
        data={invoicesQuery.data?.data ?? []}
        meta={invoicesQuery.data?.meta}
        isLoading={invoicesQuery.isLoading}
        isFetching={invoicesQuery.isFetching}
        isError={invoicesQuery.isError}
        error={invoicesQuery.error}
        onRetry={() => void invoicesQuery.refetch()}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onRowClick={(invoice) => navigate(`/invoices/${invoice.id}`)}
        resourceLabel="comprobantes"
        emptyState={
          hasActiveFilters ? (
            <NoResultsState onClear={resetFilters} />
          ) : (
            <EmptyState
              icon={FileSpreadsheet}
              title="Todavia no hay comprobantes"
              description="Los comprobantes se generan desde la ficha de una venta."
            />
          )
        }
      />

      <p className="text-xs leading-relaxed text-muted-foreground">
        El sistema no envia a la DGII: la firma y el envio los resuelve el PSFE, y aqui se registra
        el resultado. Un comprobante nunca se borra; su ciclo de vida se gobierna con el estado.
      </p>
    </div>
  );
}
