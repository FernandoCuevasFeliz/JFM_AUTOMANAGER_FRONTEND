import { zodResolver } from '@hookform/resolvers/zod';
import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { FormField, fieldAria } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { VehiclePicker } from '@/features/vehicles/components/vehicle-picker';
import { handleFormError } from '@/lib/errors';
import { formatMoney } from '@/lib/money';
import { SELLABLE_VEHICLE_STATUSES } from '@/lib/status';
import { useAddSaleItem, useReturnSaleItem, useUpdateSaleItem } from '../hooks';
import {
  type ReturnSaleItemValues,
  type SaleItemValues,
  type UpdateSaleItemValues,
  addSaleItemSchema,
  returnSaleItemSchema,
  updateSaleItemSchema,
} from '../schemas';
import { activeItems, type Sale, type SaleItem } from '../types';

/** Agrega un vehiculo a una venta en proceso. */
export function AddSaleItemDialog({
  sale,
  open,
  onOpenChange,
}: {
  sale: Sale;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const addItem = useAddSaleItem(sale.id);

  const form = useForm<SaleItemValues>({
    resolver: zodResolver(addSaleItemSchema),
    defaultValues: { vehicleId: '', salePrice: '' as unknown as number },
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = form;

  React.useEffect(() => {
    if (open) reset({ vehicleId: '', salePrice: '' as unknown as number });
  }, [open, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await addItem.mutateAsync(values);
      onOpenChange(false);
    } catch (error) {
      handleFormError(error, setError, { knownFields: ['vehicleId', 'salePrice'] });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar vehiculo a {sale.saleNumber}</DialogTitle>
          <DialogDescription>
            La unidad pasa a vendida y su precio se suma al total de la venta.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormField label="Vehiculo" htmlFor="vehicleId" error={errors.vehicleId} required>
            <Controller
              control={control}
              name="vehicleId"
              render={({ field }) => (
                <VehiclePicker
                  id="vehicleId"
                  value={field.value || null}
                  onChange={field.onChange}
                  statuses={SELLABLE_VEHICLE_STATUSES}
                  invalid={Boolean(errors.vehicleId)}
                />
              )}
            />
          </FormField>

          <FormField
            label="Precio pactado"
            htmlFor="salePrice"
            error={errors.salePrice}
            required
            hint={`En ${sale.currencyCode}, la moneda de la venta.`}
          >
            <Input
              {...fieldAria('salePrice', errors.salePrice)}
              type="number"
              step="0.01"
              min={0}
              className="num"
              {...register('salePrice')}
            />
          </FormField>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Agregar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Corrige el precio de una unidad.
 *
 * El backend rechaza dejar el total por debajo de lo ya cobrado, asi que aqui se
 * calcula el minimo y se avisa antes de intentarlo.
 */
export function EditItemPriceDialog({
  sale,
  item,
  onOpenChange,
}: {
  sale: Sale;
  item: SaleItem | null;
  onOpenChange: (open: boolean) => void;
}) {
  const updateItem = useUpdateSaleItem(sale.id);

  const form = useForm<UpdateSaleItemValues>({
    resolver: zodResolver(updateSaleItemSchema),
    defaultValues: { salePrice: item?.salePrice ?? 0 },
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = form;

  React.useEffect(() => {
    if (item) reset({ salePrice: item.salePrice });
  }, [item, reset]);

  // Lo que aportan las demas lineas vigentes: el nuevo precio no puede dejar el
  // total por debajo de lo que el cliente ya pago.
  const restoVigente = activeItems(sale)
    .filter((otro) => otro.id !== item?.id)
    .reduce((suma, otro) => suma + otro.salePrice, 0);
  const minimo = Math.max(Math.round((sale.netPaid - restoVigente) * 100) / 100, 0);

  const nuevo = Number(watch('salePrice'));
  const porDebajo = Number.isFinite(nuevo) && nuevo + 0.01 < minimo;

  const onSubmit = handleSubmit(async (values) => {
    if (!item) return;
    try {
      await updateItem.mutateAsync({ ...values, itemId: item.id });
      onOpenChange(false);
    } catch (error) {
      handleFormError(error, setError, { knownFields: ['salePrice'] });
    }
  });

  return (
    <Dialog open={item !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Precio de {item?.vehicleChassisNumber}</DialogTitle>
          <DialogDescription>
            {item?.vehicleBrandName} {item?.vehicleModelName} {item?.vehicleYear}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormField
            label="Precio pactado"
            htmlFor="salePrice"
            error={errors.salePrice}
            required
            hint={
              minimo > 0
                ? `No puede bajar de ${formatMoney(minimo, sale.currencyCode)}: es lo ya cobrado menos el resto de unidades.`
                : `En ${sale.currencyCode}, la moneda de la venta.`
            }
          >
            <Input
              {...fieldAria('salePrice', errors.salePrice)}
              type="number"
              step="0.01"
              min={0}
              className="num"
              autoFocus
              {...register('salePrice')}
            />
          </FormField>

          {porDebajo && (
            <p role="alert" className="text-[13px] font-medium text-danger">
              El total quedaria por debajo de lo cobrado y el servidor lo rechazara. Registra antes
              un reembolso si el cliente recibio dinero de vuelta.
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting} disabled={porDebajo}>
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Devuelve una unidad: conserva la linea y saca su importe del total. */
export function ReturnItemDialog({
  sale,
  item,
  onOpenChange,
}: {
  sale: Sale;
  item: SaleItem | null;
  onOpenChange: (open: boolean) => void;
}) {
  const returnItem = useReturnSaleItem(sale.id);

  const form = useForm<ReturnSaleItemValues>({
    resolver: zodResolver(returnSaleItemSchema),
    defaultValues: { reason: '', destination: 'in_inventory' },
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = form;

  React.useEffect(() => {
    if (item) reset({ reason: '', destination: 'in_inventory' });
  }, [item, reset]);

  const esUltima = activeItems(sale).length <= 1;

  const onSubmit = handleSubmit(async (values) => {
    if (!item) return;
    try {
      await returnItem.mutateAsync({ ...values, itemId: item.id });
      onOpenChange(false);
    } catch (error) {
      handleFormError(error, setError, { knownFields: ['reason', 'destination'] });
    }
  });

  return (
    <Dialog open={item !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Devolver {item?.vehicleChassisNumber}</DialogTitle>
          <DialogDescription>
            La linea se conserva con su motivo y su fecha; su importe sale del total vigente. El
            vehiculo vuelve al inventario en la misma operacion.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          {esUltima && (
            <p className="rounded-lg border border-warning/30 bg-warning/8 px-3.5 py-2.5 text-[13px] leading-relaxed">
              Es la <strong>ultima unidad vigente</strong> de la venta. Al devolverla, el total
              quedara en cero pero la venta seguira existiendo. Si lo que quieres es deshacer la
              operacion entera, cancela la venta.
            </p>
          )}

          <FormField
            label="Motivo"
            htmlFor="reason"
            error={errors.reason}
            required
            hint="Queda guardado en la linea y se puede consultar despues."
          >
            <Textarea
              {...fieldAria('reason', errors.reason)}
              rows={3}
              placeholder="El cliente devolvio la unidad"
              autoFocus
              {...register('reason')}
            />
          </FormField>

          <FormField
            label="Destino del vehiculo"
            htmlFor="destination"
            error={errors.destination}
            required
            hint="A donde vuelve la unidad al salir de la venta."
          >
            <Controller
              control={control}
              name="destination"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="destination">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_inventory">Inventario · disponible</SelectItem>
                    <SelectItem value="in_repair">Taller · en reparacion</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <p className="text-xs leading-relaxed text-muted-foreground">
            Devolver el vehiculo y devolver el dinero son operaciones distintas. Si le reintegras
            algo al cliente, registralo aparte como reembolso.
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" loading={isSubmitting}>
              Devolver vehiculo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
