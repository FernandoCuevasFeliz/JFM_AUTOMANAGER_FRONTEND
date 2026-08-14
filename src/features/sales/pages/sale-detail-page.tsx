import { CheckCircle2, FileText, Plus, Trash2, XCircle } from 'lucide-react';
import * as React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { PageHeader } from '@/components/page-header';
import { DetailSkeleton, EmptyState, ErrorState } from '@/components/states';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/features/auth/use-auth';
import { formatCivilDate } from '@/lib/dates';
import { formatExchangeRate, formatMoney } from '@/lib/money';
import {
  SALE_STATUS_META,
  acceptsPayments,
  canCancelSale,
  canCompleteSale,
  isSaleDeletable,
} from '@/lib/status';
import { cn } from '@/lib/utils';
import { PaymentDialog } from '../components/payment-dialog';
import { useCancelSale, useCompleteSale, useDeleteSale, useSale } from '../hooks';

export function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can } = useAuth();

  const saleQuery = useSale(id);
  const completeSale = useCompleteSale(id ?? '');
  const cancelSale = useCancelSale(id ?? '');
  const deleteSale = useDeleteSale();

  const [paymentOpen, setPaymentOpen] = React.useState(false);
  const [completeOpen, setCompleteOpen] = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  if (saleQuery.isLoading) return <DetailSkeleton />;

  if (saleQuery.isError || !saleQuery.data) {
    return <ErrorState error={saleQuery.error} onRetry={() => void saleQuery.refetch()} />;
  }

  const sale = saleQuery.data;
  const fullyPaid = sale.pendingBalance <= 0;
  const paidRatio = sale.salePrice > 0 ? Math.min(sale.totalPaid / sale.salePrice, 1) : 0;

  const canWrite = can('sales:write');
  const canRegisterPayment = can('payments:write') && acceptsPayments(sale.status) && !fullyPaid;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={sale.saleNumber}
        description={`${sale.clientName} · ${formatCivilDate(sale.saleDate)}`}
        backTo="/sales"
        backLabel="Ventas"
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to={`/sales/${sale.id}/invoice`}>
                <FileText />
                Factura
              </Link>
            </Button>

            {canRegisterPayment && (
              <Button onClick={() => setPaymentOpen(true)}>
                <Plus />
                Registrar cobro
              </Button>
            )}

            {/* Completar exige saldo cero: el boton solo aparece si esta saldada. */}
            {canWrite && canCompleteSale(sale.status, fullyPaid) && (
              <Button variant="outline" onClick={() => setCompleteOpen(true)}>
                <CheckCircle2 />
                Completar venta
              </Button>
            )}

            {canWrite && canCancelSale(sale.status) && (
              <Button variant="outline" onClick={() => setCancelOpen(true)}>
                <XCircle />
                Cancelar venta
              </Button>
            )}

            {can('sales:delete') && isSaleDeletable(sale.status) && (
              <Button variant="outline" onClick={() => setDeleteOpen(true)}>
                <Trash2 />
                Archivar
              </Button>
            )}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge meta={SALE_STATUS_META[sale.status]} />
        {sale.status === 'in_process' && !fullyPaid && (
          <span className="text-xs text-muted-foreground">
            Falta cobrar {formatMoney(sale.pendingBalance, sale.currencyCode)} para poder
            completarla.
          </span>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
              <CardTitle>Estado de cuenta</CardTitle>
              {canRegisterPayment && (
                <Button size="sm" variant="outline" onClick={() => setPaymentOpen(true)}>
                  <Plus />
                  Cobro
                </Button>
              )}
            </CardHeader>

            <CardContent className="flex flex-col gap-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <Amount label="Precio de venta" value={formatMoney(sale.salePrice, sale.currencyCode)} />
                <Amount
                  label="Cobrado"
                  value={formatMoney(sale.totalPaid, sale.currencyCode)}
                  tone="positive"
                />
                <Amount
                  label="Saldo pendiente"
                  value={formatMoney(sale.pendingBalance, sale.currencyCode)}
                  tone={sale.pendingBalance > 0 ? 'warning' : 'positive'}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      fullyPaid ? 'bg-emerald-500' : 'bg-primary',
                    )}
                    style={{ width: `${paidRatio * 100}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {Math.round(paidRatio * 100)} % cobrado
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cobros ({sale.payments?.length ?? 0})</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              {!sale.payments || sale.payments.length === 0 ? (
                <EmptyState
                  title="Sin cobros registrados"
                  description="Todavia no se ha recibido ningun pago de esta venta."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Fecha</TableHead>
                      <TableHead>Metodo</TableHead>
                      <TableHead>Referencia</TableHead>
                      <TableHead>Recibido por</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sale.payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="tabular">
                          {formatCivilDate(payment.paymentDate)}
                        </TableCell>
                        <TableCell>{payment.paymentMethodName}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {payment.referenceNumber ?? '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {payment.receivedByName ?? '—'}
                        </TableCell>
                        <TableCell className="tabular text-right font-medium">
                          {formatMoney(payment.amount, payment.currencyCode)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Detalles</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="flex flex-col gap-4">
              <Item label="Cliente" value={sale.clientName} />

              <div className="flex flex-col gap-0.5">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Vehiculo
                </dt>
                <dd className="text-sm">
                  <Link to={`/vehicles/${sale.vehicleId}`} className="text-primary hover:underline">
                    {sale.vehicleBrandName} {sale.vehicleModelName} {sale.vehicleYear}
                  </Link>
                  <span className="block font-mono text-xs text-muted-foreground">
                    {sale.vehicleChassisNumber}
                  </span>
                </dd>
              </div>

              <Item label="Vendedor" value={sale.salespersonName} />
              <Item label="Fecha de venta" value={formatCivilDate(sale.saleDate)} />
              <Item label="Moneda" value={sale.currencyCode} />
              <Item label="Tasa de cambio" value={formatExchangeRate(sale.exchangeRate)} />
              <Item label="Reserva de origen" value={sale.reservationNumber} />
              <Item label="Cotizacion de origen" value={sale.quotationNumber} />
            </dl>
          </CardContent>
        </Card>
      </div>

      <PaymentDialog sale={sale} open={paymentOpen} onOpenChange={setPaymentOpen} />

      <ConfirmDialog
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        title="Completar venta"
        description={
          <>
            La venta <strong>{sale.saleNumber}</strong> quedara completada. Marca la entrega de la
            unidad al cliente; solo es posible porque el saldo esta en cero.
          </>
        }
        confirmLabel="Completar"
        loading={completeSale.isPending}
        onConfirm={() => completeSale.mutate(undefined, { onSettled: () => setCompleteOpen(false) })}
      />

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancelar venta"
        description={
          <>
            La venta <strong>{sale.saleNumber}</strong> quedara cancelada y el vehiculo{' '}
            <strong>{sale.vehicleChassisNumber}</strong> volvera a inventario, quedando disponible
            para venderse de nuevo. Es un estado final.
          </>
        }
        confirmLabel="Cancelar venta"
        cancelLabel="Volver"
        destructive
        loading={cancelSale.isPending}
        onConfirm={() => cancelSale.mutate(undefined, { onSettled: () => setCancelOpen(false) })}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Archivar venta"
        description={
          <>
            Se archivara <strong>{sale.saleNumber}</strong>. El borrado es logico: desaparece de los
            listados pero conserva su historia.
          </>
        }
        confirmLabel="Archivar"
        destructive
        loading={deleteSale.isPending}
        onConfirm={() =>
          deleteSale.mutate(sale.id, { onSuccess: () => navigate('/sales', { replace: true }) })
        }
      />
    </div>
  );
}

function Amount({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'positive' | 'warning';
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          'tabular text-xl font-semibold',
          tone === 'positive' && 'text-success',
          tone === 'warning' && 'text-warning',
        )}
      >
        {value}
      </span>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value ?? '—'}</dd>
    </div>
  );
}
