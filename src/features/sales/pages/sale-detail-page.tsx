import { CheckCircle2, FileWarning, Pencil, Plus, Trash2, Undo2, XCircle } from 'lucide-react';
import * as React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { PageHeader } from '@/components/page-header';
import { DetailSkeleton, EmptyState, ErrorState } from '@/components/states';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SaleInvoicePanel } from '@/features/billing/components/sale-invoice-panel';
import { useInvoiceBySale } from '@/features/billing/hooks';
import { useAuth } from '@/features/auth/use-auth';
import { formatCivilDate } from '@/lib/dates';
import { formatExchangeRate, formatMoney } from '@/lib/money';
import {
  SALE_STATUS_META,
  acceptsPayments,
  blocksSaleCancellation,
  canCancelSale,
  canCompleteSale,
  isSaleDeletable,
  isSaleEditable,
} from '@/lib/status';
import { cn } from '@/lib/utils';
import { PaymentDialog } from '../components/payment-dialog';
import { RefundDialog } from '../components/refund-dialog';
import { SaleItemsPanel } from '../components/sale-items-panel';
import { SaleEditDialog } from '../components/sale-edit-dialog';
import { useCancelSale, useCompleteSale, useDeleteSale, useSale } from '../hooks';
import { activeItems, refundableAmount, saleVehicleLabel } from '../types';

export function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can } = useAuth();

  const saleQuery = useSale(id);
  const completeSale = useCompleteSale(id ?? '');
  const cancelSale = useCancelSale(id ?? '');
  const deleteSale = useDeleteSale();

  /*
   * El comprobante se pide aqui, no solo dentro de `SaleInvoicePanel`, porque
   * el boton de cancelar vive en esta cabecera y necesita saber si existe: el
   * backend rechaza cancelar una venta con comprobante vivo, y hasta ahora la
   * pantalla lo ofrecia igual y el usuario se comia un 409. La consulta esta
   * cacheada por `saleId`, asi que compartirla con el panel no cuesta nada.
   */
  const invoiceQuery = useInvoiceBySale(id);

  const [paymentOpen, setPaymentOpen] = React.useState(false);
  const [refundOpen, setRefundOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
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
  // Reembolsar exige que haya entrado dinero: el techo es lo cobrado menos lo
  // ya devuelto, no el precio de la venta.
  const canRefund = can('payments:write') && refundableAmount(sale) > 0;

  /*
   * El comprobante retiene la venta.
   *
   * Solo se bloquea con un comprobante en la mano: si el rol no tiene
   * `invoices:read` la consulta no corre y `data` es `undefined`, y ahi se deja
   * pasar. Ocultar el boton por no poder mirar seria peor que el 409: dejaria
   * sin cancelar una venta que quiza no esta facturada, sin decir por que.
   */
  const invoice = invoiceQuery.data ?? null;
  const facturaQueRetiene = invoice !== null && blocksSaleCancellation(invoice.status);
  const puedeCancelar = canWrite && canCancelSale(sale.status) && !facturaQueRetiene;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={sale.saleNumber}
        description={`${sale.clientName} · ${formatCivilDate(sale.saleDate)}`}
        backTo="/sales"
        backLabel="Ventas"
        actions={
          <>
            {canRegisterPayment && (
              <Button onClick={() => setPaymentOpen(true)}>
                <Plus />
                Registrar cobro
              </Button>
            )}

            {/* Solo se edita mientras la venta sigue en proceso (§7 de API.md). */}
            {canWrite && isSaleEditable(sale.status) && (
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil />
                Editar
              </Button>
            )}

            {/* Completar exige saldo cero: el boton solo aparece si esta saldada. */}
            {canWrite && canCompleteSale(sale.status, fullyPaid) && (
              <Button variant="outline" onClick={() => setCompleteOpen(true)}>
                <CheckCircle2 />
                Completar venta
              </Button>
            )}

            {puedeCancelar && (
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

      {/*
        Se explica el orden en vez de esconder el boton sin motivo: quien busca
        «Cancelar venta» y no lo encuentra necesita saber que hay un comprobante
        por medio y cual es el camino.
      */}
      {canWrite && canCancelSale(sale.status) && facturaQueRetiene && invoice && (
        <p className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/50 px-3.5 py-3 text-[13px] leading-relaxed text-muted-foreground">
          <FileWarning className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Esta venta no se puede cancelar mientras tenga un comprobante vivo
            {invoice.ncfNumber && (
              <>
                {' '}
                (<span className="num">{invoice.ncfNumber}</span>)
              </>
            )}
            .{' '}
            {invoice.status === 'issued'
              ? 'Ante la DGII la operacion sigue existiendo: hay que acreditarla con notas de credito que cubran su importe, y cuando lo cubran la factura pasa a anulada.'
              : 'Anula primero el comprobante desde su ficha.'}{' '}
            {can('invoices:read') && (
              <Link
                to={`/invoices/${invoice.id}`}
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Ir al comprobante
              </Link>
            )}
          </span>
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <SaleItemsPanel sale={sale} />

          <Card>
            <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
              <CardTitle>Estado de cuenta</CardTitle>
              <span className="flex gap-2">
                {canRegisterPayment && (
                  <Button size="sm" variant="outline" onClick={() => setPaymentOpen(true)}>
                    <Plus />
                    Cobro
                  </Button>
                )}
                {canRefund && (
                  <Button size="sm" variant="outline" onClick={() => setRefundOpen(true)}>
                    <Undo2 />
                    Reembolso
                  </Button>
                )}
              </span>
            </CardHeader>

            <CardContent className="flex flex-col gap-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <Amount label="Precio de venta" value={formatMoney(sale.salePrice, sale.currencyCode)} />
                <Amount
                  label="Cobrado"
                  value={formatMoney(sale.totalPaid, sale.currencyCode)}
                  tone="positive"
                />
                {sale.totalRefunded > 0 && (
                  <Amount
                    label="Reembolsado"
                    value={formatMoney(sale.totalRefunded, sale.currencyCode)}
                    tone="warning"
                  />
                )}
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

          {/*
            Los reembolsos van en su propia tabla, no mezclados con los cobros.
            Son cosas distintas: `payments` responde "cuanto entro" y esto,
            "cuanto salio". Juntarlos obligaria a leer el signo de cada fila.
          */}
          {sale.refunds.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Reembolsos ({sale.refunds.length})</CardTitle>
              </CardHeader>
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Fecha</TableHead>
                      <TableHead>Metodo</TableHead>
                      <TableHead>Unidad</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sale.refunds.map((refund) => (
                      <TableRow key={refund.id}>
                        <TableCell className="num">{formatCivilDate(refund.refundDate)}</TableCell>
                        <TableCell>{refund.refundMethodName}</TableCell>
                        <TableCell className="num text-muted-foreground">
                          {refund.vehicleChassisNumber ?? 'General'}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <span className="line-clamp-2 text-[13px]">{refund.reason}</span>
                        </TableCell>
                        <TableCell className="num text-right font-medium text-warning">
                          − {formatMoney(refund.amount, refund.currencyCode)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex items-center justify-between border-t border-border px-5 pt-3">
                  <span className="text-[13px] font-medium">Neto retenido</span>
                  <span className="num text-sm font-semibold">
                    {formatMoney(sale.netPaid, sale.currencyCode)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-4">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Detalles</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="flex flex-col gap-4">
              <Item label="Cliente" value={sale.clientName} />

              <Item label="Vehiculos" value={saleVehicleLabel(sale)} />

              <Item label="Vendedor" value={sale.salespersonName} />
              <Item label="Fecha de venta" value={formatCivilDate(sale.saleDate)} />
              <Item label="Moneda" value={sale.currencyCode} />
              <Item label="Tasa de cambio" value={formatExchangeRate(sale.exchangeRate)} />
              <Item label="Reserva de origen" value={sale.reservationNumber} />
              <Item label="Cotizacion de origen" value={sale.quotationNumber} />
            </dl>
          </CardContent>
        </Card>

        <SaleInvoicePanel sale={sale} />
        </div>
      </div>

      <PaymentDialog sale={sale} open={paymentOpen} onOpenChange={setPaymentOpen} />
      <RefundDialog sale={sale} open={refundOpen} onOpenChange={setRefundOpen} />
      <SaleEditDialog sale={sale} open={editOpen} onOpenChange={setEditOpen} />

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
            La venta <strong>{sale.saleNumber}</strong> quedara cancelada y{' '}
            <strong>
              {activeItems(sale).length === 1
                ? 'su vehiculo volvera'
                : `sus ${activeItems(sale).length} vehiculos volveran`}
            </strong>{' '}
            a inventario, quedando disponibles para venderse de nuevo. Es un estado final.
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
