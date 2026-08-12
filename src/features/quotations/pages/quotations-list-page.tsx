import type { ColumnDef } from '@tanstack/react-table';
import { CalendarClock, FileText, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router-dom';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable } from '@/components/data-table';
import { FilterBar, FilterSelect, SearchInput } from '@/components/filter-bar';
import { PageHeader } from '@/components/page-header';
import { EmptyState, NoResultsState } from '@/components/states';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/features/auth/use-auth';
import { formatCivilDate, isPastCivil } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import {
  QUOTATION_STATUSES,
  QUOTATION_STATUS_META,
  assignableQuotationStatuses,
  isQuotationDeletable,
  isQuotationEditable,
} from '@/lib/status';
import { useListParams } from '@/lib/use-list-params';
import type { AssignableQuotationStatus } from '../api';
import { QuotationFormDialog } from '../components/quotation-form-dialog';
import {
  useChangeQuotationStatus,
  useDeleteQuotation,
  useExpireOverdueQuotations,
  useQuotations,
} from '../hooks';
import type { Quotation, QuotationStatus } from '../types';

interface QuotationFilters {
  search: string;
  status: QuotationStatus | undefined;
  dateFrom: string | undefined;
  dateTo: string | undefined;
}

const INITIAL_FILTERS: QuotationFilters = {
  search: '',
  status: undefined,
  dateFrom: undefined,
  dateTo: undefined,
};

export function QuotationsListPage() {
  const { can } = useAuth();
  const { filters, query, hasActiveFilters, setPage, setPageSize, setFilter, resetFilters } =
    useListParams<QuotationFilters>(INITIAL_FILTERS);

  const quotationsQuery = useQuotations(query);
  const deleteQuotation = useDeleteQuotation();
  const expireOverdue = useExpireOverdueQuotations();

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Quotation | undefined>();
  const [deleteTarget, setDeleteTarget] = React.useState<Quotation | null>(null);
  const [statusTarget, setStatusTarget] = React.useState<{
    quotation: Quotation;
    status: AssignableQuotationStatus;
  } | null>(null);

  const canWrite = can('quotations:write');
  const canDelete = can('quotations:delete');

  const columns = React.useMemo<ColumnDef<Quotation, unknown>[]>(
    () => [
      {
        id: 'quotationNumber',
        header: 'Numero',
        cell: ({ row }) => <span className="font-medium">{row.original.quotationNumber}</span>,
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
          <Link
            to={`/vehicles/${row.original.vehicleId}`}
            className="flex flex-col hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            <span>
              {row.original.vehicleBrandName} {row.original.vehicleModelName}{' '}
              {row.original.vehicleYear}
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {row.original.vehicleChassisNumber}
            </span>
          </Link>
        ),
      },
      {
        id: 'quotedPrice',
        header: 'Precio',
        cell: ({ row }) => (
          <span className="tabular font-medium">
            {formatMoney(row.original.quotedPrice, row.original.currencyCode)}
          </span>
        ),
      },
      {
        id: 'validUntil',
        header: 'Vigencia',
        cell: ({ row }) => {
          const overdue =
            isPastCivil(row.original.validUntil) && row.original.status === 'pending';

          return (
            <span className={overdue ? 'tabular text-destructive' : 'tabular'}>
              {formatCivilDate(row.original.validUntil)}
            </span>
          );
        },
      },
      {
        id: 'status',
        header: 'Estado',
        cell: ({ row }) => <StatusBadge meta={QUOTATION_STATUS_META[row.original.status]} />,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const quotation = row.original;
          // Las transiciones validas dependen del estado actual (§6).
          const transitions = canWrite ? assignableQuotationStatuses(quotation.status) : [];
          const editable = canWrite && isQuotationEditable(quotation.status);
          const deletable = canDelete && isQuotationDeletable(quotation.status);

          if (transitions.length === 0 && !editable && !deletable) return null;

          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label="Acciones">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {editable && (
                    <DropdownMenuItem
                      onSelect={() => {
                        setEditing(quotation);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil />
                      Editar
                    </DropdownMenuItem>
                  )}

                  {transitions.length > 0 && (
                    <>
                      <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                        Marcar como
                      </DropdownMenuLabel>
                      {transitions.map((status) => (
                        <DropdownMenuItem
                          key={status}
                          onSelect={() =>
                            setStatusTarget({
                              quotation,
                              status: status as AssignableQuotationStatus,
                            })
                          }
                        >
                          {QUOTATION_STATUS_META[status].label}
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}

                  {deletable && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem destructive onSelect={() => setDeleteTarget(quotation)}>
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
        title="Cotizaciones"
        description="Ofertas emitidas a clientes y su vigencia."
        actions={
          <>
            {canWrite && (
              <Button
                variant="outline"
                onClick={() => expireOverdue.mutate()}
                loading={expireOverdue.isPending}
              >
                <CalendarClock />
                Vencer atrasadas
              </Button>
            )}
            {canWrite && (
              <Button
                onClick={() => {
                  setEditing(undefined);
                  setFormOpen(true);
                }}
              >
                <Plus />
                Nueva cotizacion
              </Button>
            )}
          </>
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
          onChange={(value) => setFilter('status', value as QuotationStatus | undefined)}
          placeholder="Estado"
          allLabel="Todos los estados"
          options={QUOTATION_STATUSES.map((status) => ({
            value: status,
            label: QUOTATION_STATUS_META[status].label,
          }))}
        />
      </FilterBar>

      <DataTable
        columns={columns}
        data={quotationsQuery.data?.data ?? []}
        meta={quotationsQuery.data?.meta}
        isLoading={quotationsQuery.isLoading}
        isFetching={quotationsQuery.isFetching}
        isError={quotationsQuery.isError}
        error={quotationsQuery.error}
        onRetry={() => void quotationsQuery.refetch()}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        resourceLabel="cotizaciones"
        emptyState={
          hasActiveFilters ? (
            <NoResultsState onClear={resetFilters} />
          ) : (
            <EmptyState
              icon={FileText}
              title="Todavia no hay cotizaciones"
              description="Emite una cotizacion para iniciar el ciclo comercial."
              action={
                canWrite && (
                  <Button
                    onClick={() => {
                      setEditing(undefined);
                      setFormOpen(true);
                    }}
                  >
                    Nueva cotizacion
                  </Button>
                )
              }
            />
          )
        }
      />

      <QuotationFormDialog quotation={editing} open={formOpen} onOpenChange={setFormOpen} />

      <StatusConfirm target={statusTarget} onClose={() => setStatusTarget(null)} />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Eliminar cotizacion"
        description={
          <>
            Se eliminara <strong>{deleteTarget?.quotationNumber}</strong>. Una cotizacion ya
            convertida en reserva o venta no se puede eliminar.
          </>
        }
        confirmLabel="Eliminar"
        destructive
        loading={deleteQuotation.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteQuotation.mutate(deleteTarget.id, { onSettled: () => setDeleteTarget(null) });
        }}
      />
    </div>
  );
}

/** El hook de cambio de estado necesita el id, asi que vive en su propio componente. */
function StatusConfirm({
  target,
  onClose,
}: {
  target: { quotation: Quotation; status: AssignableQuotationStatus } | null;
  onClose: () => void;
}) {
  const changeStatus = useChangeQuotationStatus(target?.quotation.id ?? '');

  return (
    <ConfirmDialog
      open={target !== null}
      onOpenChange={(open) => !open && onClose()}
      title="Cambiar estado de la cotizacion"
      description={
        <>
          <strong>{target?.quotation.quotationNumber}</strong> pasara a{' '}
          <strong>{target ? QUOTATION_STATUS_META[target.status].label : ''}</strong>. Los estados
          rechazada y vencida son finales.
        </>
      }
      confirmLabel="Confirmar"
      destructive={target?.status === 'rejected'}
      loading={changeStatus.isPending}
      onConfirm={() => {
        if (!target) return;
        changeStatus.mutate(target.status, { onSettled: onClose });
      }}
    />
  );
}
