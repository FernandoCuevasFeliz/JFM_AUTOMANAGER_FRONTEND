import { CheckCircle2, Clock, Printer, XCircle } from 'lucide-react';
import * as React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DetailAmount, DetailCard, DetailGrid, DetailItem } from '@/components/detail-view';
import { PageHeader } from '@/components/page-header';
import { PrintPreview } from '@/components/print-sheet';
import { DetailSkeleton, ErrorState } from '@/components/states';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/use-auth';
import { useClient } from '@/features/clients/hooks';
import { ReservationFormDialog } from '@/features/reservations/components/reservation-form-dialog';
import { useVehicle } from '@/features/vehicles/hooks';
import { daysUntilCivil, formatCivilDate, formatDateTime, isPastCivil } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { imprimirPagina } from '@/lib/use-print-mode';
import {
  QUOTATION_STATUS_META,
  assignableQuotationStatuses,
  type QuotationStatus,
} from '@/lib/status';
import { QuotationDocument } from '../components/quotation-document';
import { useChangeQuotationStatus, useQuotation } from '../hooks';

const STATUS_ACTIONS: Partial<Record<QuotationStatus, { label: string; icon: typeof CheckCircle2 }>> =
  {
    approved: { label: 'Aprobar', icon: CheckCircle2 },
    rejected: { label: 'Rechazar', icon: XCircle },
    expired: { label: 'Marcar vencida', icon: Clock },
  };

export function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = useAuth();

  const quotationQuery = useQuotation(id);
  const quotation = quotationQuery.data;

  const clientQuery = useClient(quotation?.clientId);
  const vehicleQuery = useVehicle(quotation?.vehicleId);
  const changeStatus = useChangeQuotationStatus(id ?? '');

  const [pendingStatus, setPendingStatus] = React.useState<QuotationStatus | null>(null);
  const [reservationOpen, setReservationOpen] = React.useState(false);

  React.useEffect(() => {
    if (!quotation) return;
    const previous = document.title;
    document.title = `${quotation.quotationNumber} — ${quotation.clientName}`;
    return () => {
      document.title = previous;
    };
  }, [quotation]);

  if (quotationQuery.isLoading) return <DetailSkeleton />;

  if (quotationQuery.isError || !quotation) {
    return <ErrorState error={quotationQuery.error} onRetry={() => void quotationQuery.refetch()} />;
  }

  const vencida = isPastCivil(quotation.validUntil);
  const dias = daysUntilCivil(quotation.validUntil);
  const siguientes = can('quotations:write') ? assignableQuotationStatuses(quotation.status) : [];
  const cargando = clientQuery.isLoading || vehicleQuery.isLoading;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-6 print:hidden">
        <PageHeader
          eyebrow="Cotizacion"
          title={quotation.quotationNumber}
          description={`${quotation.clientName} · ${formatCivilDate(quotation.createdAt.slice(0, 10))}`}
          backTo="/quotations"
          backLabel="Cotizaciones"
          actions={
            <>
              <Button variant="outline" onClick={imprimirPagina} loading={cargando}>
                <Printer />
                Imprimir
              </Button>

              {siguientes.map((status) => {
                const action = STATUS_ACTIONS[status];
                if (!action) return null;
                const Icon = action.icon;

                return (
                  <Button key={status} variant="outline" onClick={() => setPendingStatus(status)}>
                    <Icon />
                    {action.label}
                  </Button>
                );
              })}
            </>
          }
        />

        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge meta={QUOTATION_STATUS_META[quotation.status]} />
          {quotation.status === 'pending' || quotation.status === 'approved' ? (
            <span className={vencida ? 'text-sm text-danger' : 'text-sm text-muted-foreground'}>
              {vencida
                ? `Vencio hace ${Math.abs(dias)} dias`
                : dias === 0
                  ? 'Vence hoy'
                  : `Vigente ${dias} dias mas`}
            </span>
          ) : null}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <DetailCard title="Cotizacion" className="lg:col-span-2">
            <div className="flex flex-col gap-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailAmount
                  label="Precio cotizado"
                  value={formatMoney(quotation.quotedPrice, quotation.currencyCode)}
                />
                <DetailAmount
                  label="Valida hasta"
                  value={formatCivilDate(quotation.validUntil)}
                  tone={vencida ? 'danger' : 'neutral'}
                />
              </div>

              <DetailGrid>
                <DetailItem label="Cliente">
                  <Link
                    to="/clients"
                    className="underline-offset-4 hover:underline"
                  >
                    {quotation.clientName}
                  </Link>
                </DetailItem>

                <DetailItem label="Vehiculo">
                  <Link
                    to={`/vehicles/${quotation.vehicleId}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {quotation.vehicleBrandName} {quotation.vehicleModelName} {quotation.vehicleYear}
                  </Link>
                  <span className="num block text-xs text-muted-foreground">
                    {quotation.vehicleChassisNumber}
                  </span>
                </DetailItem>

                <DetailItem label="Moneda" value={quotation.currencyCode} numeric />
                <DetailItem label="Preparada por" value={quotation.createdByName} />
                <DetailItem
                  label="Creada"
                  value={formatDateTime(quotation.createdAt)}
                  numeric
                />
                <DetailItem
                  label="Ultima actualizacion"
                  value={formatDateTime(quotation.updatedAt)}
                  numeric
                />
              </DetailGrid>

              {quotation.notes && (
                <DetailItem label="Notas">
                  <span className="whitespace-pre-line leading-relaxed">{quotation.notes}</span>
                </DetailItem>
              )}
            </div>
          </DetailCard>

          <DetailCard title="Ciclo comercial">
            <div className="flex flex-col gap-4 text-sm">
              <p className="leading-relaxed text-muted-foreground">
                Una cotizacion aprobada se convierte en reserva o directamente en venta. El estado{' '}
                <strong className="font-medium text-foreground">convertida</strong> lo pone el
                sistema en ese momento; no se asigna a mano.
              </p>

              {/*
                Los dos caminos arrastran la cotizacion. El de la reserva abre
                aqui mismo el dialogo con `fromQuotation` —que ya existia y no
                lo usaba nadie: el boton mandaba al listado— y el de la venta la
                pasa por la URL. Sin ese dato el backend no marca `converted`.

                Y se mira la FECHA, no solo el estado. `isConvertible` exige
                vigencia ademas de aprobacion, asi que una aprobada cuyo plazo
                paso terminaba en un error del servidor: el estado sigue
                diciendo «Aprobada» hasta que corre el barrido de vencimientos.
              */}
              {quotation.status === 'approved' &&
                (vencida ? (
                  <p className="rounded-lg border border-warning/30 bg-warning/8 px-3.5 py-3 text-[13px] leading-relaxed">
                    Esta cotizacion esta aprobada pero su vigencia termino el{' '}
                    <span className="num">{formatCivilDate(quotation.validUntil)}</span>, asi que ya
                    no se puede convertir en reserva ni en venta. Amplia la vigencia desde{' '}
                    <strong className="font-medium">Editar</strong> en el listado, o emite una
                    cotizacion nueva.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {can('reservations:write') && (
                      <Button variant="outline" size="sm" onClick={() => setReservationOpen(true)}>
                        Crear reserva
                      </Button>
                    )}
                    {can('sales:write') && (
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/sales/new?quotationId=${quotation.id}`}>Registrar venta</Link>
                      </Button>
                    )}
                  </div>
                ))}
            </div>
          </DetailCard>
        </div>
      </div>

      <PrintPreview>
        <QuotationDocument
          quotation={quotation}
          client={clientQuery.data}
          vehicle={vehicleQuery.data}
        />
      </PrintPreview>

      <ConfirmDialog
        open={pendingStatus !== null}
        onOpenChange={(open) => !open && setPendingStatus(null)}
        title={`${pendingStatus ? (STATUS_ACTIONS[pendingStatus]?.label ?? 'Cambiar estado') : ''} la cotizacion`}
        description={
          pendingStatus === 'approved'
            ? 'La cotizacion queda aprobada y lista para convertirse en reserva o venta.'
            : pendingStatus === 'rejected'
              ? 'La cotizacion queda rechazada. Es un estado terminal: no se puede reabrir.'
              : 'La cotizacion queda vencida. Es un estado terminal: no se puede reabrir.'
        }
        confirmLabel="Confirmar"
        destructive={pendingStatus !== 'approved'}
        loading={changeStatus.isPending}
        onConfirm={() => {
          if (pendingStatus) changeStatus.mutate(pendingStatus as never);
          setPendingStatus(null);
        }}
      />

      <ReservationFormDialog
        open={reservationOpen}
        onOpenChange={setReservationOpen}
        fromQuotation={{
          id: quotation.id,
          clientId: quotation.clientId,
          vehicleId: quotation.vehicleId,
          number: quotation.quotationNumber,
        }}
      />
    </div>
  );
}
