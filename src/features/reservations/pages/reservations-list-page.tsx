import type { ColumnDef } from '@tanstack/react-table';
import { BookMarked, CalendarClock, MoreHorizontal, Pencil, Plus, XCircle } from 'lucide-react';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/features/auth/use-auth';
import { daysUntilCivil, formatCivilDate } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import {
  RESERVATION_STATUSES,
  RESERVATION_STATUS_META,
  isReservationCancellable,
  isReservationEditable,
} from '@/lib/status';
import { useListParams } from '@/lib/use-list-params';
import { ReservationFormDialog } from '../components/reservation-form-dialog';
import { useCancelReservation, useExpireOverdueReservations, useReservations } from '../hooks';
import type { Reservation, ReservationStatus } from '../types';

interface ReservationFilters {
  search: string;
  status: ReservationStatus | undefined;
}

const INITIAL_FILTERS: ReservationFilters = { search: '', status: undefined };

export function ReservationsListPage() {
  const { can } = useAuth();
  const { filters, query, hasActiveFilters, setPage, setPageSize, setFilter, resetFilters } =
    useListParams<ReservationFilters>(INITIAL_FILTERS);

  const reservationsQuery = useReservations(query);
  const cancelReservation = useCancelReservation();
  const expireOverdue = useExpireOverdueReservations();

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Reservation | undefined>();
  const [cancelTarget, setCancelTarget] = React.useState<Reservation | null>(null);

  const canWrite = can('reservations:write');

  const columns = React.useMemo<ColumnDef<Reservation, unknown>[]>(
    () => [
      {
        id: 'reservationNumber',
        header: 'Numero',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.original.reservationNumber}</span>
            {row.original.quotationNumber && (
              <span className="text-xs text-muted-foreground">
                De {row.original.quotationNumber}
              </span>
            )}
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
          <Link
            to={`/vehicles/${row.original.vehicleId}`}
            className="flex flex-col hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            <span>
              {row.original.vehicleBrandName} {row.original.vehicleModelName}
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {row.original.vehicleChassisNumber}
            </span>
          </Link>
        ),
      },
      {
        id: 'depositAmount',
        header: 'Deposito',
        cell: ({ row }) => (
          <span className="tabular font-medium">{formatMoney(row.original.depositAmount, 'DOP')}</span>
        ),
      },
      {
        id: 'expirationDate',
        header: 'Vence',
        cell: ({ row }) => {
          const days = daysUntilCivil(row.original.expirationDate);
          const active = row.original.status === 'active';

          return (
            <div className="flex flex-col">
              <span className="tabular">{formatCivilDate(row.original.expirationDate)}</span>
              {active && (
                <span
                  className={
                    days < 0
                      ? 'text-xs text-danger'
                      : days <= 3
                        ? 'text-xs text-warning'
                        : 'text-xs text-muted-foreground'
                  }
                >
                  {days < 0 ? `Vencida hace ${Math.abs(days)} d` : `En ${days} d`}
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: 'status',
        header: 'Estado',
        cell: ({ row }) => <StatusBadge meta={RESERVATION_STATUS_META[row.original.status]} />,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const reservation = row.original;
          const editable = canWrite && isReservationEditable(reservation.status);
          const cancellable = canWrite && isReservationCancellable(reservation.status);

          if (!editable && !cancellable) return null;

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
                        setEditing(reservation);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil />
                      Prorrogar / ajustar
                    </DropdownMenuItem>
                  )}
                  {cancellable && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem destructive onSelect={() => setCancelTarget(reservation)}>
                        <XCircle />
                        Cancelar reserva
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
    [canWrite],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reservas"
        description="Unidades comprometidas con un deposito y su plazo de vigencia."
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
                Nueva reserva
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
          onChange={(value) => setFilter('status', value as ReservationStatus | undefined)}
          placeholder="Estado"
          allLabel="Todos los estados"
          options={RESERVATION_STATUSES.map((status) => ({
            value: status,
            label: RESERVATION_STATUS_META[status].label,
          }))}
        />
      </FilterBar>

      <DataTable
        columns={columns}
        data={reservationsQuery.data?.data ?? []}
        meta={reservationsQuery.data?.meta}
        isLoading={reservationsQuery.isLoading}
        isFetching={reservationsQuery.isFetching}
        isError={reservationsQuery.isError}
        error={reservationsQuery.error}
        onRetry={() => void reservationsQuery.refetch()}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        resourceLabel="reservas"
        emptyState={
          hasActiveFilters ? (
            <NoResultsState onClear={resetFilters} />
          ) : (
            <EmptyState
              icon={BookMarked}
              title="Todavia no hay reservas"
              description="Reserva una unidad en inventario para comprometerla con un cliente."
              action={
                canWrite && (
                  <Button
                    onClick={() => {
                      setEditing(undefined);
                      setFormOpen(true);
                    }}
                  >
                    Nueva reserva
                  </Button>
                )
              }
            />
          )
        }
      />

      <ReservationFormDialog reservation={editing} open={formOpen} onOpenChange={setFormOpen} />

      <ConfirmDialog
        open={cancelTarget !== null}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        title="Cancelar reserva"
        description={
          <>
            <strong>{cancelTarget?.reservationNumber}</strong> quedara cancelada y el vehiculo{' '}
            <strong>{cancelTarget?.vehicleChassisNumber}</strong> volvera a inventario. Es un estado
            final: las reservas no se borran, se cancelan.
          </>
        }
        confirmLabel="Cancelar reserva"
        cancelLabel="Volver"
        destructive
        loading={cancelReservation.isPending}
        onConfirm={() => {
          if (!cancelTarget) return;
          cancelReservation.mutate(cancelTarget.id, { onSettled: () => setCancelTarget(null) });
        }}
      />
    </div>
  );
}
