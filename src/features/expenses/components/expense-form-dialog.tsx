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
import { useCurrencies, useExpenseCategories, usePaymentMethods } from '@/features/catalogs/hooks';
import { VehiclePicker } from '@/features/vehicles/components/vehicle-picker';
import { todayCivil } from '@/lib/dates';
import { handleFormError } from '@/lib/errors';
import { REPORTING_CURRENCY, formatMoney, isReportingCurrency } from '@/lib/money';
import { diffPayload, isEmptyPayload } from '@/lib/zod-helpers';
import { useCreateExpense, useUpdateExpense } from '../hooks';
import { EXPENSE_FORM_FIELDS, type ExpenseFormValues, expenseFormSchema } from '../schemas';
import type { Expense } from '../types';

/**
 * Alta y edicion de gastos.
 *
 * Dos reglas de §7 de API.md gobiernan este formulario:
 *
 *  - **La categoria manda.** Si su `scope` es `vehicle`, el gasto exige una
 *    unidad; si es `general`, la prohibe y `vehicleId` viaja en `null`. Sin
 *    esto, el costo real por unidad se contaminaria con gastos de la empresa.
 *  - **Tasa coherente.** Un documento en pesos debe llevar `exchangeRate: 1`,
 *    asi que al elegir DOP el campo se fija y se deshabilita.
 */
export function ExpenseFormDialog({
  expense,
  open,
  onOpenChange,
  /** Preselecciona la unidad al registrar el gasto desde su ficha. */
  defaultVehicleId,
}: {
  expense?: Expense;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultVehicleId?: string;
}) {
  const isEdit = Boolean(expense);

  const categories = useExpenseCategories();
  const currencies = useCurrencies();
  const paymentMethods = usePaymentMethods();

  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense(expense?.id ?? '');

  const defaultValues = React.useMemo<ExpenseFormValues>(
    () => ({
      categoryId: expense?.categoryId ?? '',
      vehicleId: expense?.vehicleId ?? defaultVehicleId ?? null,
      currencyId: expense?.currencyId ?? '',
      paymentMethodId: expense?.paymentMethodId ?? '',
      description: expense?.description ?? '',
      amount: expense?.amount ?? ('' as unknown as number),
      exchangeRate: expense?.exchangeRate ?? 1,
      expenseDate: expense?.expenseDate ?? todayCivil(),
    }),
    [expense, defaultVehicleId],
  );

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues,
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = form;

  React.useEffect(() => {
    if (open) reset(defaultValues);
  }, [open, defaultValues, reset]);

  const categoryId = watch('categoryId');
  const currencyId = watch('currencyId');
  const vehicleId = watch('vehicleId');
  const amount = watch('amount');
  const exchangeRate = watch('exchangeRate');

  const category = categories.find((item) => item.id === categoryId);
  const requiresVehicle = category?.scope === 'vehicle';

  const currency = currencies.find((item) => item.id === currencyId);
  const isDop = isReportingCurrency(currency?.code);

  // Un gasto en pesos lleva tasa 1 por definicion.
  React.useEffect(() => {
    if (isDop) setValue('exchangeRate', 1);
  }, [isDop, setValue]);

  // Una categoria general no admite vehiculo: se limpia al cambiar.
  React.useEffect(() => {
    if (category && category.scope === 'general' && vehicleId !== null) {
      setValue('vehicleId', null);
    }
  }, [category, vehicleId, setValue]);

  const onSubmit = handleSubmit(async (values) => {
    // La obligatoriedad de `vehicleId` depende del scope de la categoria, un
    // dato que el schema por si solo no conoce.
    if (requiresVehicle && !values.vehicleId) {
      setError('vehicleId', {
        type: 'manual',
        message: 'Esta categoria exige indicar el vehiculo al que se imputa el gasto',
      });
      return;
    }

    const payload: ExpenseFormValues = {
      ...values,
      vehicleId: requiresVehicle ? values.vehicleId : null,
    };

    try {
      if (isEdit && expense) {
        const original: Partial<ExpenseFormValues> = {
          categoryId: expense.categoryId,
          vehicleId: expense.vehicleId,
          currencyId: expense.currencyId,
          paymentMethodId: expense.paymentMethodId,
          description: expense.description,
          amount: expense.amount,
          exchangeRate: expense.exchangeRate,
          expenseDate: expense.expenseDate,
        };

        const diff = diffPayload(original, payload);
        if (isEmptyPayload(diff)) {
          onOpenChange(false);
          return;
        }

        await updateExpense.mutateAsync(diff);
      } else {
        await createExpense.mutateAsync(payload);
      }

      onOpenChange(false);
    } catch (error) {
      handleFormError(error, setError, { knownFields: EXPENSE_FORM_FIELDS });
    }
  });

  const convertedPreview =
    !isDop && typeof amount === 'number' && typeof exchangeRate === 'number' && amount > 0
      ? amount * exchangeRate
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar gasto' : 'Nuevo gasto'}</DialogTitle>
          <DialogDescription>
            La categoria decide si el gasto se imputa a una unidad o a la empresa.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormRow columns={2}>
            <FormField label="Categoria" htmlFor="categoryId" error={errors.categoryId} required>
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      clearErrors('vehicleId');
                    }}
                  >
                    <SelectTrigger id="categoryId" aria-invalid={errors.categoryId ? true : undefined}>
                      <SelectValue placeholder="Selecciona una categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                          <span className="ml-2 text-xs text-muted-foreground">
                            {item.scope === 'vehicle' ? '(por vehiculo)' : '(general)'}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            <FormField label="Fecha del gasto" htmlFor="expenseDate" error={errors.expenseDate} required>
              <Input
                {...fieldAria('expenseDate', errors.expenseDate)}
                type="date"
                {...register('expenseDate')}
              />
            </FormField>
          </FormRow>

          {/* El selector de vehiculo solo aparece si la categoria lo exige. */}
          {requiresVehicle && (
            <FormField
              label="Vehiculo"
              htmlFor="vehicleId"
              error={errors.vehicleId}
              required
              hint="El gasto se sumara al costo real de esta unidad."
            >
              <Controller
                control={control}
                name="vehicleId"
                render={({ field }) => (
                  <VehiclePicker
                    id="vehicleId"
                    value={field.value ?? null}
                    onChange={(value) => {
                      field.onChange(value);
                      clearErrors('vehicleId');
                    }}
                    invalid={Boolean(errors.vehicleId)}
                  />
                )}
              />
            </FormField>
          )}

          {category?.scope === 'general' && (
            <p className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
              Es un gasto general de la empresa: no se imputa a ninguna unidad.
            </p>
          )}

          <FormField label="Descripcion" htmlFor="description" error={errors.description} required>
            <Input
              {...fieldAria('description', errors.description)}
              placeholder="Nacionalizacion y aduana"
              {...register('description')}
            />
          </FormField>

          <FormRow columns={3}>
            <FormField label="Moneda" htmlFor="currencyId" error={errors.currencyId} required>
              <Controller
                control={control}
                name="currencyId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="currencyId" aria-invalid={errors.currencyId ? true : undefined}>
                      <SelectValue placeholder="Moneda" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.code} — {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            <FormField label="Monto" htmlFor="amount" error={errors.amount} required>
              <Input
                {...fieldAria('amount', errors.amount)}
                type="number"
                inputMode="decimal"
                step="0.01"
                min={0}
                placeholder="0.00"
                {...register('amount')}
              />
            </FormField>

            <FormField
              label="Tasa de cambio"
              htmlFor="exchangeRate"
              error={errors.exchangeRate}
              required
              hint={isDop ? `Fija en 1 para ${REPORTING_CURRENCY}` : 'Pesos por unidad de la moneda'}
            >
              <Input
                {...fieldAria('exchangeRate', errors.exchangeRate)}
                type="number"
                inputMode="decimal"
                step="0.0001"
                min={0}
                disabled={isDop}
                {...register('exchangeRate')}
              />
            </FormField>
          </FormRow>

          {convertedPreview !== null && (
            <p className="text-xs text-muted-foreground">
              Equivale a{' '}
              <span className="font-medium text-foreground">
                {formatMoney(convertedPreview, REPORTING_CURRENCY)}
              </span>{' '}
              al tipo indicado.
            </p>
          )}

          <FormField label="Metodo de pago" htmlFor="paymentMethodId" error={errors.paymentMethodId} required>
            <Controller
              control={control}
              name="paymentMethodId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="paymentMethodId" aria-invalid={errors.paymentMethodId ? true : undefined}>
                    <SelectValue placeholder="Selecciona un metodo" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? 'Guardar cambios' : 'Registrar gasto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
