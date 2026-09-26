import { Car, Pencil, Plus, Trash2, Undo2 } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router-dom';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/features/auth/use-auth';
import { formatDate } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { cn } from '@/lib/utils';
import { AddSaleItemDialog, EditItemPriceDialog, ReturnItemDialog } from './sale-item-dialogs';
import { useRemoveSaleItem } from '../hooks';
import { activeItems, canRemoveItem, canReturnItem, type Sale, type SaleItem } from '../types';

/**
 * Vehiculos de la venta.
 *
 * El importe de la venta es la suma de estas lineas, asi que aqui es donde se
 * corrige un precio: la cabecera ya no tiene "el precio".
 *
 * **Quitar y devolver no son lo mismo.** Quitar borra una linea que nunca debio
 * existir —solo con la venta en proceso, y nunca la ultima—. Devolver conserva
 * la linea con su motivo y su fecha, admite una venta ya completada y saca el
 * importe del total sin tocar el resto.
 */
export function SaleItemsPanel({ sale }: { sale: Sale }) {
  const { can } = useAuth();
  const removeItem = useRemoveSaleItem(sale.id);

  const [addOpen, setAddOpen] = React.useState(false);
  const [toEdit, setToEdit] = React.useState<SaleItem | null>(null);
  const [toReturn, setToReturn] = React.useState<SaleItem | null>(null);
  const [toRemove, setToRemove] = React.useState<SaleItem | null>(null);

  const canWrite = can('sales:write');
  const vigentes = activeItems(sale);
  const puedeAgregar = canWrite && sale.status === 'in_process';

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle>
          Vehiculos ({vigentes.length}
          {sale.items.length !== vigentes.length && ` de ${sale.items.length}`})
        </CardTitle>
        {puedeAgregar && (
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
            <Plus />
            Agregar
          </Button>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {sale.items.map((item) => {
          const devuelto = item.status === 'returned';

          return (
            <div
              key={item.id}
              className={cn(
                'flex flex-col gap-3 rounded-xl border border-border p-3.5 sm:flex-row sm:items-start sm:justify-between',
                devuelto && 'bg-muted/40',
              )}
            >
              <div className="flex min-w-0 gap-3">
                <span
                  className={cn(
                    'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md',
                    devuelto ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary',
                  )}
                  aria-hidden
                >
                  <Car className="size-4.5" />
                </span>

                <div className="flex min-w-0 flex-col gap-1">
                  <Link
                    to={`/vehicles/${item.vehicleId}`}
                    className={cn(
                      'text-sm font-medium underline-offset-4 hover:underline',
                      devuelto && 'text-muted-foreground line-through',
                    )}
                  >
                    {item.vehicleBrandName} {item.vehicleModelName} {item.vehicleYear}
                  </Link>
                  <span className="num text-xs text-muted-foreground">
                    {item.vehicleChassisNumber}
                  </span>

                  {devuelto && (
                    <span className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge variant="neutral">Devuelto</Badge>
                      <span className="text-xs text-muted-foreground">
                        {item.returnedAt && formatDate(item.returnedAt)}
                        {item.returnReason && ` · ${item.returnReason}`}
                      </span>
                    </span>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
                <span
                  className={cn(
                    'num text-sm font-semibold',
                    devuelto && 'text-muted-foreground line-through',
                  )}
                >
                  {formatMoney(item.salePrice, sale.currencyCode)}
                </span>

                {canWrite && !devuelto && (
                  <span className="flex gap-1">
                    {sale.status === 'in_process' && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setToEdit(item)}
                        aria-label={`Cambiar el precio de ${item.vehicleChassisNumber}`}
                      >
                        <Pencil />
                      </Button>
                    )}

                    {canReturnItem(sale, item) && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setToReturn(item)}
                        aria-label={`Devolver ${item.vehicleChassisNumber}`}
                      >
                        <Undo2 />
                      </Button>
                    )}

                    {canRemoveItem(sale, item) && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setToRemove(item)}
                        aria-label={`Quitar ${item.vehicleChassisNumber}`}
                      >
                        <Trash2 />
                      </Button>
                    )}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {vigentes.length > 1 && (
          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-[13px] font-medium">Total vigente</span>
            <span className="num text-base font-semibold">
              {formatMoney(sale.salePrice, sale.currencyCode)}
            </span>
          </div>
        )}
      </CardContent>

      <AddSaleItemDialog sale={sale} open={addOpen} onOpenChange={setAddOpen} />

      <EditItemPriceDialog
        sale={sale}
        item={toEdit}
        onOpenChange={(open) => !open && setToEdit(null)}
      />

      <ReturnItemDialog
        sale={sale}
        item={toReturn}
        onOpenChange={(open) => !open && setToReturn(null)}
      />

      <ConfirmDialog
        open={toRemove !== null}
        onOpenChange={(open) => !open && setToRemove(null)}
        title="Quitar el vehiculo de la venta"
        description={
          <>
            Se borra la linea de <strong>{toRemove?.vehicleChassisNumber}</strong> y la unidad vuelve
            a inventario. Usa esto solo si la unidad <strong>nunca debio estar</strong> en esta
            venta; si el cliente la devuelve, usa «Devolver» para conservar el motivo y la fecha.
          </>
        }
        confirmLabel="Quitar"
        destructive
        loading={removeItem.isPending}
        onConfirm={() => {
          if (toRemove) removeItem.mutate(toRemove.id);
          setToRemove(null);
        }}
      />
    </Card>
  );
}
