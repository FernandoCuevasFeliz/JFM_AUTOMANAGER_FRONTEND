import { zodResolver } from '@hookform/resolvers/zod';
import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { FormField, FormRow, fieldAria } from '@/components/form-field';
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
import { useUsers } from '@/features/users/hooks';
import { userFullName } from '@/features/users/types';
import { useVehicle } from '@/features/vehicles/hooks';
import { handleFormError } from '@/lib/errors';
import { formatMoney, formatPercentage, isReportingCurrency } from '@/lib/money';
import { cn } from '@/lib/utils';
import { useUpdateSale } from '../hooks';
import { type UpdateSaleValues, updateSaleSchema } from '../schemas';
import type { Sale } from '../types';

/**
 * Edicion de una venta ya registrada.
 *
 * Solo cuatro campos: precio, tasa, fecha y vendedor. Ni el cliente, ni el
 * vehiculo, ni la moneda se tocan despues — cambiarlos no seria corregir un
 * error de tecleo, seria otra venta distinta, y ademas arrastraria el estado del
 * vehiculo y los pagos ya registrados en esa moneda.
 *
 * El backend ademas impide bajar el precio por debajo de lo ya cobrado, asi que
 * aqui se avisa antes de intentarlo.
 */
export function SaleEditDialog({
  sale,
  open,
  onOpenChange,
}: {
  sale: Sale;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateSale = useUpdateSale(sale.id);
  const salespeople = useUsers({ isActive: true, pageSize: 100 });
  const vehicle = useVehicle(sale.vehicleId).data;

  const form = useForm<UpdateSaleValues>({
    resolver: zodResolver(updateSaleSchema),
    defaultValues: {
      salePrice: sale.salePrice,
      exchangeRate: sale.exchangeRate,
      saleDate: sale.saleDate,
      salespersonId: sale.salespersonId,
    },
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = form;

  React.useEffect(() => {
    if (open) {
      reset({
        salePrice: sale.salePrice,
        exchangeRate: sale.exchangeRate,
        saleDate: sale.saleDate,
        salespersonId: sale.salespersonId,
      });
    }
  }, [open, reset, sale]);

  const esPesos = isReportingCurrency(sale.currencyCode);
  const nuevoPrecio = Number(watch('salePrice'));

  // El backend rechaza un precio por debajo de lo ya cobrado (§7 de API.md).
  const porDebajoDeCobrado =
    Number.isFinite(nuevoPrecio) && nuevoPrecio + 0.01 < sale.totalPaid;

  const listPrice = vehicle?.salePrice ?? null;
  const desviacion =
    listPrice !== null && Number.isFinite(nuevoPrecio) && nuevoPrecio > 0
      ? Math.round((nuevoPrecio - listPrice) * 100) / 100
      : null;

  const onSubmit = handleSubmit(async (values) => {
    try {
      await updateSale.mutateAsync(values);
      onOpenChange(false);
    } catch (error) {
      handleFormError(error, setError, {
        knownFields: ['salePrice', 'exchangeRate', 'saleDate', 'salespersonId'],
      });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Editar {sale.saleNumber}</DialogTitle>
          <DialogDescription>
            El cliente, el vehiculo y la moneda no se modifican: cambiarlos seria otra venta.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormField
            label="Precio de venta"
            htmlFor="salePrice"
            error={errors.salePrice}
            required
            hint={
              listPrice !== null
                ? `Precio de lista: ${formatMoney(listPrice, sale.currencyCode)} · cobrado: ${formatMoney(sale.totalPaid, sale.currencyCode)}`
                : `Ya cobrado: ${formatMoney(sale.totalPaid, sale.currencyCode)}`
            }
          >
            <div className="flex gap-2">
              <Input
                {...fieldAria('salePrice', errors.salePrice)}
                type="number"
                step="0.01"
                min={0}
                className="num"
                autoFocus
                {...register('salePrice')}
              />
              {listPrice !== null && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setValue('salePrice', listPrice, { shouldValidate: true })}
                >
                  Usar lista
                </Button>
              )}
            </div>
          </FormField>

          {porDebajoDeCobrado && (
            <p role="alert" className="text-[13px] font-medium text-danger">
              El precio no puede quedar por debajo de lo ya cobrado (
              {formatMoney(sale.totalPaid, sale.currencyCode)}). Anula un cobro primero.
            </p>
          )}

          {!porDebajoDeCobrado && desviacion !== null && Math.abs(desviacion) >= 0.01 && (
            <p
              className={cn(
                'text-[13px] leading-relaxed',
                desviacion < 0 ? 'text-warning' : 'text-success',
              )}
            >
              {desviacion < 0 ? 'Queda por debajo' : 'Queda por encima'} del precio de lista en{' '}
              <span className="num font-medium">
                {formatMoney(Math.abs(desviacion), sale.currencyCode)}
              </span>
              {listPrice !== null && listPrice > 0 && (
                <> ({formatPercentage(Math.abs((desviacion / listPrice) * 100))})</>
              )}
              .
            </p>
          )}

          <FormRow columns={2}>
            <FormField label="Fecha de venta" htmlFor="saleDate" error={errors.saleDate} required>
              <Input
                {...fieldAria('saleDate', errors.saleDate)}
                type="date"
                {...register('saleDate')}
              />
            </FormField>

            <FormField
              label="Tasa de cambio"
              htmlFor="exchangeRate"
              error={errors.exchangeRate}
              required
              hint={esPesos ? `Fija en 1 para ${sale.currencyCode}` : 'Pesos por unidad'}
            >
              <Input
                {...fieldAria('exchangeRate', errors.exchangeRate)}
                type="number"
                step="0.0001"
                min={0}
                className="num"
                disabled={esPesos}
                {...register('exchangeRate')}
              />
            </FormField>
          </FormRow>

          <FormField
            label="Vendedor"
            htmlFor="salespersonId"
            error={errors.salespersonId}
            required
          >
            <Controller
              control={control}
              name="salespersonId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="salespersonId">
                    <SelectValue placeholder="Selecciona un vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {(salespeople.data?.data ?? []).map((person) => (
                      <SelectItem key={person.id} value={person.id}>
                        {userFullName(person)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting} disabled={porDebajoDeCobrado}>
              Guardar cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
