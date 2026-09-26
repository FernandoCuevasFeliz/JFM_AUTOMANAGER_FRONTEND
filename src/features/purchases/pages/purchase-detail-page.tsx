import { Pencil, Trash2 } from 'lucide-react';
import * as React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { PageHeader } from '@/components/page-header';
import { DetailSkeleton, ErrorState } from '@/components/states';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/features/auth/use-auth';
import { formatCivilDate } from '@/lib/dates';
import { formatExchangeRate, formatMoney } from '@/lib/money';
import {
  PURCHASE_STATUS_META,
  type PurchaseStatus,
  isPurchaseDeletable,
  isPurchaseEditable,
  nextPurchaseStatuses,
} from '@/lib/status';
import { useChangePurchaseStatus, useDeletePurchase, usePurchase } from '../hooks';

export function PurchaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can } = useAuth();

  const purchaseQuery = usePurchase(id);
  const changeStatus = useChangePurchaseStatus(id ?? '');
  const deletePurchase = useDeletePurchase();

  const [statusTarget, setStatusTarget] = React.useState<PurchaseStatus | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  if (purchaseQuery.isLoading) return <DetailSkeleton />;

  if (purchaseQuery.isError || !purchaseQuery.data) {
    return <ErrorState error={purchaseQuery.error} onRetry={() => void purchaseQuery.refetch()} />;
  }

  const purchase = purchaseQuery.data;
  const canWrite = can('purchases:write');

  // Solo se edita mientras esta abierta, y no se borra si ya fue recibida (§7).
  const editable = isPurchaseEditable(purchase.status);
  const deletable = isPurchaseDeletable(purchase.status);
  const transitions = nextPurchaseStatuses(purchase.status);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={purchase.purchaseNumber}
        description={`${purchase.supplierName} · ${formatCivilDate(purchase.purchaseDate)}`}
        backTo="/purchases"
        backLabel="Compras"
        actions={
          <>
            {canWrite && transitions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">Cambiar estado</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                    Transiciones disponibles
                  </DropdownMenuLabel>
                  {transitions.map((status) => (
                    <DropdownMenuItem key={status} onSelect={() => setStatusTarget(status)}>
                      {PURCHASE_STATUS_META[status].label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {canWrite && editable && (
              <Button variant="outline" asChild>
                <Link to={`/purchases/${purchase.id}/edit`}>
                  <Pencil />
                  Editar
                </Link>
              </Button>
            )}

            {can('purchases:delete') && deletable && (
              <Button variant="outline" onClick={() => setDeleteOpen(true)}>
                <Trash2 />
                Eliminar
              </Button>
            )}
          </>
        }
      />

      <div className="flex items-center gap-3">
        <StatusBadge meta={PURCHASE_STATUS_META[purchase.status]} />
        {!editable && (
          <span className="text-xs text-muted-foreground">
            Una compra {PURCHASE_STATUS_META[purchase.status].label.toLowerCase()} ya no se edita.
          </span>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Unidades ({purchase.items?.length ?? 0})</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Vehiculo</TableHead>
                  <TableHead className="text-right">Costo</TableHead>
                  <TableHead className="text-right">Flete</TableHead>
                  <TableHead className="text-right">Seguro</TableHead>
                  <TableHead className="text-right">Otros</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchase.items?.map((item) => {
                  const subtotal =
                    item.unitCost + item.freightCost + item.insuranceCost + item.otherCosts;

                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Link
                          to={`/vehicles/${item.vehicleId}`}
                          className="flex flex-col hover:underline"
                        >
                          <span className="font-medium">
                            {item.brandName} {item.modelName} {item.year}
                          </span>
                          <span className="font-mono text-xs text-muted-foreground">
                            {item.chassisNumber}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="tabular text-right">
                        {formatMoney(item.unitCost, purchase.currencyCode)}
                      </TableCell>
                      <TableCell className="tabular text-right">
                        {formatMoney(item.freightCost, purchase.currencyCode)}
                      </TableCell>
                      <TableCell className="tabular text-right">
                        {formatMoney(item.insuranceCost, purchase.currencyCode)}
                      </TableCell>
                      <TableCell className="tabular text-right">
                        {formatMoney(item.otherCosts, purchase.currencyCode)}
                      </TableCell>
                      <TableCell className="tabular text-right font-medium">
                        {formatMoney(subtotal, purchase.currencyCode)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between border-t border-border px-6 py-4">
              <span className="font-semibold">Total de la compra</span>
              <span className="tabular text-lg font-semibold">
                {formatMoney(purchase.totalCost, purchase.currencyCode)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detalles</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="flex flex-col gap-4">
              <Item label="Proveedor" value={purchase.supplierName} />
              <Item label="Factura" value={purchase.invoiceNumber} />
              <Item label="Fecha" value={formatCivilDate(purchase.purchaseDate)} />
              <Item label="Moneda" value={purchase.currencyCode} />
              <Item label="Tasa de cambio" value={formatExchangeRate(purchase.exchangeRate)} />
              <Item label="Registrada por" value={purchase.createdByName} />
              {purchase.notes && <Item label="Notas" value={purchase.notes} />}
            </dl>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={statusTarget !== null}
        onOpenChange={(open) => !open && setStatusTarget(null)}
        title="Cambiar estado de la compra"
        description={
          statusTarget === 'received' ? (
            <>
              La compra pasara a <strong>Recibida</strong>. Todos los vehiculos que sigan en transito
              pasaran a inventario en la misma operacion.
            </>
          ) : statusTarget === 'cancelled' ? (
            <>
              La compra quedara <strong>Cancelada</strong>. Es un estado final: no se puede revertir.
            </>
          ) : (
            <>
              La compra pasara a{' '}
              <strong>{statusTarget ? PURCHASE_STATUS_META[statusTarget].label : ''}</strong>.
            </>
          )
        }
        confirmLabel="Confirmar"
        destructive={statusTarget === 'cancelled'}
        loading={changeStatus.isPending}
        onConfirm={() => {
          if (!statusTarget) return;
          changeStatus.mutate(statusTarget, { onSettled: () => setStatusTarget(null) });
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar compra"
        description={
          <>
            Se eliminara <strong>{purchase.purchaseNumber}</strong>. El borrado es logico: la compra
            desaparece de los listados pero conserva su historia.
          </>
        }
        confirmLabel="Eliminar"
        destructive
        loading={deletePurchase.isPending}
        onConfirm={() =>
          deletePurchase.mutate(purchase.id, {
            onSuccess: () => navigate('/purchases', { replace: true }),
          })
        }
      />
    </div>
  );
}

function Item({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="whitespace-pre-wrap text-sm">{value ?? '—'}</dd>
    </div>
  );
}
