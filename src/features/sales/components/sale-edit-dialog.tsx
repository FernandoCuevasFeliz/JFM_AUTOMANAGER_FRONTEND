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
import { handleFormError } from '@/lib/errors';
import { formatMoney, isReportingCurrency } from '@/lib/money';
import { useUpdateSale } from '../hooks';
import { type UpdateSaleValues, updateSaleSchema } from '../schemas';
import type { Sale } from '../types';

/**
 * Edicion de la CABECERA de una venta.
 *
 * Tres campos: tasa, fecha y vendedor. El precio no esta aqui —y no es un
 * olvido—: desde que una venta lleva varios vehiculos, "el precio" es la suma
 * de las lineas y se corrige linea a linea desde la ficha. El cliente y la
 * moneda tampoco se tocan: cambiarlos no seria corregir un tecleo, seria otra
 * venta, y arrastraria los pagos ya registrados en esa divisa.
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

  const form = useForm<UpdateSaleValues>({
    resolver: zodResolver(updateSaleSchema),
    defaultValues: {
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
    setError,
    formState: { errors, isSubmitting },
  } = form;

  React.useEffect(() => {
    if (open) {
      reset({
        exchangeRate: sale.exchangeRate,
        saleDate: sale.saleDate,
        salespersonId: sale.salespersonId,
      });
    }
  }, [open, reset, sale]);

  const esPesos = isReportingCurrency(sale.currencyCode);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await updateSale.mutateAsync(values);
      onOpenChange(false);
    } catch (error) {
      handleFormError(error, setError, {
        knownFields: ['exchangeRate', 'saleDate', 'salespersonId'],
      });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Editar {sale.saleNumber}</DialogTitle>
          <DialogDescription>
            El precio se corrige por vehiculo, en la ficha. El cliente y la moneda no se modifican.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          {/*
            El total no se edita aqui: es la suma de las lineas. Se muestra para
            situar, con un enlace mental a donde si se corrige.
          */}
          <p className="rounded-lg border border-border bg-muted/40 px-3.5 py-3 text-[13px] leading-relaxed text-muted-foreground">
            Total actual:{' '}
            <strong className="num font-semibold text-foreground">
              {formatMoney(sale.salePrice, sale.currencyCode)}
            </strong>{' '}
            · suma de {sale.items.filter((item) => item.status === 'active').length} unidad(es)
            vigente(s). Para cambiar un precio, editalo en su vehiculo desde la ficha de la venta.
          </p>

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
            <Button type="submit" loading={isSubmitting}>
              Guardar cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
