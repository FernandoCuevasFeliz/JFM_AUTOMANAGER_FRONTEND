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
import { usePaymentMethods } from '@/features/catalogs/hooks';
import { todayCivil } from '@/lib/dates';
import { handleFormError } from '@/lib/errors';
import { formatMoney } from '@/lib/money';
import { useRegisterPayment } from '../hooks';
import { PAYMENT_FORM_FIELDS, type PaymentValues, paymentSchema } from '../schemas';
import type { Sale } from '../types';

/**
 * Registro de un abono.
 *
 * La moneda queda fijada a la de la venta: el backend exige que coincidan, y si
 * el cliente paga en otra divisa la conversion la hace la caja al recibir (§7).
 * El monto no puede superar el saldo pendiente.
 */
export function PaymentDialog({
  sale,
  open,
  onOpenChange,
}: {
  sale: Sale;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const paymentMethods = usePaymentMethods();
  const registerPayment = useRegisterPayment(sale.id);

  const form = useForm<PaymentValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentMethodId: '',
      currencyId: sale.currencyId,
      amount: '' as unknown as number,
      paymentDate: todayCivil(),
      referenceNumber: null,
    },
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = form;

  React.useEffect(() => {
    if (open) {
      reset({
        paymentMethodId: '',
        currencyId: sale.currencyId,
        amount: '' as unknown as number,
        paymentDate: todayCivil(),
        referenceNumber: null,
      });
    }
  }, [open, sale.currencyId, reset]);

  const amount = watch('amount');
  const exceedsBalance = typeof amount === 'number' && amount > sale.pendingBalance;

  const onSubmit = handleSubmit(async (values) => {
    // Un abono no puede superar el saldo pendiente: se avisa antes de enviarlo.
    if (values.amount > sale.pendingBalance) {
      setError('amount', {
        type: 'manual',
        message: `El abono no puede superar el saldo pendiente (${formatMoney(
          sale.pendingBalance,
          sale.currencyCode,
        )})`,
      });
      return;
    }

    try {
      await registerPayment.mutateAsync(values);
      onOpenChange(false);
    } catch (error) {
      handleFormError(error, setError, { knownFields: PAYMENT_FORM_FIELDS });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar cobro</DialogTitle>
          <DialogDescription>
            Venta {sale.saleNumber} · saldo pendiente{' '}
            <strong>{formatMoney(sale.pendingBalance, sale.currencyCode)}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormRow columns={2}>
            <FormField
              label="Metodo de pago"
              htmlFor="paymentMethodId"
              error={errors.paymentMethodId}
              required
            >
              <Controller
                control={control}
                name="paymentMethodId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="paymentMethodId" aria-invalid={errors.paymentMethodId ? true : undefined}>
                      <SelectValue placeholder="Selecciona un metodo" />
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

            {/* Moneda fija: debe coincidir con la de la venta. */}
            <FormField label="Moneda" htmlFor="currency" hint="Es la moneda de la venta.">
              <Input id="currency" value={sale.currencyCode} disabled />
            </FormField>
          </FormRow>

          <FormRow columns={2}>
            <FormField
              label="Monto"
              htmlFor="amount"
              error={errors.amount}
              required
              hint={
                exceedsBalance
                  ? undefined
                  : `Maximo ${formatMoney(sale.pendingBalance, sale.currencyCode)}`
              }
            >
              <Input
                {...fieldAria('amount', errors.amount)}
                type="number"
                step="0.01"
                min={0}
                max={sale.pendingBalance}
                placeholder="0.00"
                autoFocus
                {...register('amount')}
              />
            </FormField>

            <FormField label="Fecha del pago" htmlFor="paymentDate" error={errors.paymentDate} required>
              <Input
                {...fieldAria('paymentDate', errors.paymentDate)}
                type="date"
                {...register('paymentDate')}
              />
            </FormField>
          </FormRow>

          <FormField label="Referencia" htmlFor="referenceNumber" error={errors.referenceNumber}>
            <Input
              {...fieldAria('referenceNumber', errors.referenceNumber)}
              placeholder="Transferencia 4471"
              {...register('referenceNumber')}
            />
          </FormField>

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Registrar cobro
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
