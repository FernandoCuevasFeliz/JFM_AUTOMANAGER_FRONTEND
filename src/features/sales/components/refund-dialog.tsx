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
import { Textarea } from '@/components/ui/textarea';
import { usePaymentMethods } from '@/features/catalogs/hooks';
import { todayCivil } from '@/lib/dates';
import { handleFormError } from '@/lib/errors';
import { formatMoney, isReportingCurrency } from '@/lib/money';
import { useRegisterRefund } from '../hooks';
import { type RefundValues, refundSchema } from '../schemas';
import { refundableAmount, returnedItems, type Sale } from '../types';

/** Valor centinela: Radix Select no admite `value=""` en un item. */
const SIN_UNIDAD = '__general__';

/**
 * Reembolso al cliente.
 *
 * **No es un cobro negativo.** Los cobros solo aceptan importes positivos, por
 * diseño: `payments` responde "cuanto entro", no "cuanto neto". El techo es lo
 * cobrado menos lo ya reembolsado — no se devuelve dinero que el cliente nunca
 * entrego.
 *
 * Lleva su propia tasa: la del dia en que sale el dinero, no la de la venta,
 * por el mismo criterio de costo historico que usan compras y gastos.
 */
export function RefundDialog({
  sale,
  open,
  onOpenChange,
}: {
  sale: Sale;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const registerRefund = useRegisterRefund(sale.id);
  const paymentMethods = usePaymentMethods();

  const disponible = refundableAmount(sale);
  const devueltos = returnedItems(sale);
  const esPesos = isReportingCurrency(sale.currencyCode);

  const form = useForm<RefundValues>({
    resolver: zodResolver(refundSchema),
    defaultValues: {
      saleItemId: null,
      refundMethodId: '',
      currencyId: sale.currencyId,
      amount: '' as unknown as number,
      exchangeRate: sale.exchangeRate,
      refundDate: todayCivil(),
      reason: '',
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
        saleItemId: null,
        refundMethodId: '',
        currencyId: sale.currencyId,
        amount: '' as unknown as number,
        exchangeRate: sale.exchangeRate,
        refundDate: todayCivil(),
        reason: '',
      });
    }
  }, [open, reset, sale]);

  const importe = Number(watch('amount'));
  const excede = Number.isFinite(importe) && importe > disponible;

  const onSubmit = handleSubmit(async (values) => {
    try {
      await registerRefund.mutateAsync(values);
      onOpenChange(false);
    } catch (error) {
      handleFormError(error, setError, {
        knownFields: ['saleItemId', 'refundMethodId', 'amount', 'exchangeRate', 'refundDate', 'reason'],
      });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Registrar reembolso</DialogTitle>
          <DialogDescription>
            Dinero que sale de vuelta al cliente. Devolver el vehiculo y devolver el dinero son
            operaciones distintas: pueden no coincidir ni en el momento ni en el importe.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormField
            label="Unidad devuelta"
            htmlFor="saleItemId"
            error={errors.saleItemId}
            hint="Opcional. Sin unidad es un ajuste general de la venta."
          >
            <Controller
              control={control}
              name="saleItemId"
              render={({ field }) => (
                <Select
                  value={field.value ?? SIN_UNIDAD}
                  onValueChange={(value) => field.onChange(value === SIN_UNIDAD ? null : value)}
                >
                  <SelectTrigger id="saleItemId">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SIN_UNIDAD}>Reembolso general de la venta</SelectItem>
                    {sale.items.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.vehicleChassisNumber} · {item.vehicleBrandName} {item.vehicleModelName}
                        {item.status === 'returned' ? ' (devuelto)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          {devueltos.length === 0 && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              Esta venta no tiene unidades devueltas. Un reembolso sin unidad es legitimo —un ajuste
              de precio pactado— pero si el cliente devolvio un vehiculo, devuelvelo tambien en el
              panel de vehiculos.
            </p>
          )}

          <FormRow columns={2}>
            <FormField
              label="Monto"
              htmlFor="amount"
              error={errors.amount}
              required
              hint={`Disponible: ${formatMoney(disponible, sale.currencyCode)}`}
            >
              <div className="flex gap-2">
                <Input
                  {...fieldAria('amount', errors.amount)}
                  type="number"
                  step="0.01"
                  min={0}
                  className="num"
                  autoFocus
                  {...register('amount')}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setValue('amount', disponible, { shouldValidate: true })}
                >
                  Todo
                </Button>
              </div>
            </FormField>

            <FormField
              label="Fecha del reembolso"
              htmlFor="refundDate"
              error={errors.refundDate}
              required
            >
              <Input
                {...fieldAria('refundDate', errors.refundDate)}
                type="date"
                {...register('refundDate')}
              />
            </FormField>
          </FormRow>

          {excede && (
            <p role="alert" className="text-[13px] font-medium text-danger">
              No se puede devolver mas de lo cobrado ({formatMoney(disponible, sale.currencyCode)}).
              El limite es lo que entro menos lo ya reembolsado, no el precio de la venta.
            </p>
          )}

          <FormRow columns={2}>
            <FormField
              label="Metodo"
              htmlFor="refundMethodId"
              error={errors.refundMethodId}
              required
            >
              <Controller
                control={control}
                name="refundMethodId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="refundMethodId">
                      <SelectValue placeholder="Como sale el dinero" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map((method) => (
                        <SelectItem key={method.id} value={method.id}>
                          {method.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            <FormField
              label="Tasa de cambio"
              htmlFor="exchangeRate"
              error={errors.exchangeRate}
              required
              hint={esPesos ? 'Fija en 1' : 'La del dia en que sale el dinero, no la de la venta.'}
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

          <FormField label="Motivo" htmlFor="reason" error={errors.reason} required>
            <Textarea
              {...fieldAria('reason', errors.reason)}
              rows={2}
              placeholder="Reintegro por la unidad devuelta"
              {...register('reason')}
            />
          </FormField>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting} disabled={excede || disponible <= 0}>
              Registrar reembolso
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
