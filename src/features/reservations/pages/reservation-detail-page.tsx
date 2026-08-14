import { Pencil, XCircle } from 'lucide-react';
import * as React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DetailAmount, DetailCard, DetailGrid, DetailItem } from '@/components/detail-view';
import { PageHeader } from '@/components/page-header';
import { DetailSkeleton, ErrorState } from '@/components/states';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/use-auth';
import { daysUntilCivil, formatCivilDate, formatDateTime, isPastCivil } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import {
  RESERVATION_STATUS_META,
  isReservationCancellable,
  isReservationEditable,
} from '@/lib/status';
import { ReservationFormDialog } from '../components/reservation-form-dialog';
import { useCancelReservation, useReservation } from '../hooks';

export function ReservationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can } = useAuth();

  const reservationQuery = useReservation(id);
  const cancelReservation = useCancelReservation();

  const [editOpen, setEditOpen] = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(false);

  if (reservationQuery.isLoading) return <DetailSkeleton />;

  if (reservationQuery.isError || !reservationQuery.data) {
    return (
      <ErrorState error={reservationQuery.error} onRetry={() => void reservationQuery.refetch()} />
    );
  }

  const reservation = reservationQuery.data;
  const vencida = isPastCivil(reservation.expirationDate);
  const dias = daysUntilCivil(reservation.expirationDate);
  const activa = reservation.status === 'active';

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Reserva"
        title={reservation.reservationNumber}
        description={`${reservation.clientName} · ${formatCivilDate(reservation.reservationDate)}`}
        backTo="/reservations"
        backLabel="Reservas"
        actions={
          <>
            {can('reservations:write') && isReservationEditable(reservation.status) && (
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil />
                Editar
              </Button>
            )}
            {/* Las reservas no se borran: se cancelan (§5.10 de API.md). */}
            {can('reservations:write') && isReservationCancellable(reservation.status) && (
              <Button variant="outline" onClick={() => setCancelOpen(true)}>
                <XCircle />
                Cancelar
              </Button>
            )}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge meta={RESERVATION_STATUS_META[reservation.status]} />
        {activa && (
          <span className={vencida ? 'text-sm text-danger' : 'text-sm text-muted-foreground'}>
            {vencida
              ? `Vencio hace ${Math.abs(dias)} dias`
              : dias === 0
                ? 'Vence hoy'
                : `Vigente ${dias} dias mas`}
          </span>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <DetailCard title="Reserva" className="lg:col-span-2">
          <div className="flex flex-col gap-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <DetailAmount
                label="Deposito recibido"
                value={formatMoney(reservation.depositAmount, 'DOP')}
                tone="positive"
              />
              <DetailAmount
                label="Vence"
                value={formatCivilDate(reservation.expirationDate)}
                tone={activa && vencida ? 'danger' : 'neutral'}
              />
            </div>

            <DetailGrid>
              <DetailItem label="Cliente" value={reservation.clientName} />

              <DetailItem label="Vehiculo">
                <Link
                  to={`/vehicles/${reservation.vehicleId}`}
                  className="underline-offset-4 hover:underline"
                >
                  {reservation.vehicleBrandName} {reservation.vehicleModelName}{' '}
                  {reservation.vehicleYear}
                </Link>
                <span className="num block text-xs text-muted-foreground">
                  {reservation.vehicleChassisNumber}
                </span>
              </DetailItem>

              <DetailItem
                label="Fecha de reserva"
                value={formatCivilDate(reservation.reservationDate)}
                numeric
              />
              <DetailItem
                label="Fecha de vencimiento"
                value={formatCivilDate(reservation.expirationDate)}
                numeric
              />
              <DetailItem label="Registrada por" value={reservation.createdByName} />
              <DetailItem label="Alta" value={formatDateTime(reservation.createdAt)} numeric />
            </DetailGrid>
          </div>
        </DetailCard>

        <DetailCard title="Origen y destino">
          <div className="flex flex-col gap-4 text-sm">
            <DetailItem label="Cotizacion de origen">
              {reservation.quotationId ? (
                <Link
                  to={`/quotations/${reservation.quotationId}`}
                  className="num underline-offset-4 hover:underline"
                >
                  {reservation.quotationNumber}
                </Link>
              ) : null}
            </DetailItem>

            <p className="leading-relaxed text-muted-foreground">
              Al registrar la venta desde esta reserva, el sistema la marca como{' '}
              <strong className="font-medium text-foreground">convertida</strong> y el deposito se
              puede registrar como pago inicial.
            </p>

            {activa && can('sales:write') && (
              <Button variant="outline" size="sm" asChild className="w-fit">
                <Link to="/sales/new">Registrar venta</Link>
              </Button>
            )}
          </div>
        </DetailCard>
      </div>

      <ReservationFormDialog
        reservation={reservation}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancelar reserva"
        description="El vehiculo vuelve a inventario y queda disponible para otra operacion. La reserva se conserva en el historial como cancelada."
        confirmLabel="Cancelar reserva"
        cancelLabel="Volver"
        destructive
        loading={cancelReservation.isPending}
        onConfirm={() => {
          cancelReservation.mutate(reservation.id, {
            onSuccess: () => navigate('/reservations'),
          });
          setCancelOpen(false);
        }}
      />
    </div>
  );
}
