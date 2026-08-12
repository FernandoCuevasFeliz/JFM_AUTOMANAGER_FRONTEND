import { zodResolver } from '@hookform/resolvers/zod';
import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { FormField, FormRow, FormSection, fieldAria } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/features/auth/use-auth';
import { useCurrencies, usePaymentMethods } from '@/features/catalogs/hooks';
import { ClientPicker } from '@/features/clients/components/client-picker';
import { useUsers } from '@/features/users/hooks';
import { userFullName } from '@/features/users/types';
import { VehiclePicker } from '@/features/vehicles/components/vehicle-picker';
import { todayCivil } from '@/lib/dates';
import { handleFormError } from '@/lib/errors';
import { REPORTING_CURRENCY, isReportingCurrency } from '@/lib/money';
import { SELLABLE_VEHICLE_STATUSES } from '@/lib/status';
import { useCreateSale } from '../hooks';
import { SALE_FORM_FIELDS, type CreateSaleValues, createSaleSchema } from '../schemas';

/**
 * Alta de ventas.
 *
 * Solo se vende una unidad `in_inventory` o `reserved` (§7 de API.md). Al
 * guardar, el backend pasa el vehiculo a `sold` y marca la reserva y la
 * cotizacion de origen como `converted`, todo en una transaccion.
 */
export function SaleForm() {
  const navigate = useNavigate();
  const { user, can } = useAuth();

  const currencies = useCurrencies();
  const paymentMethods = usePaymentMethods();
  const createSale = useCreateSale();

  /**
   * El rol `ventas` no tiene `users:read`, asi que no puede listar vendedores.
   * En ese caso la venta se asigna al propio usuario, que es el caso normal;
   * quien pueda listar usuarios si elige a otro.
   */
  const canListUsers = can('users:read');
  const usersQuery = useUsers({ page: 1, pageSize: 100, isActive: true });
  const salespeople = usersQuery.data?.data ?? [];

  const [withInitialPayment, setWithInitialPayment] = React.useState(false);

  const form = useForm<CreateSaleValues>({
    resolver: zodResolver(createSaleSchema),
    defaultValues: {
      reservationId: null,
      quotationId: null,
      clientId: '',
      vehicleId: '',
      currencyId: '',
      salePrice: '' as unknown as number,
      exchangeRate: 1,
      saleDate: todayCivil(),
      salespersonId: user?.id ?? '',
      initialPayment: null,
    },
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = form;

  const currencyId = watch('currencyId');
  const currency = currencies.find((item) => item.id === currencyId);
  const isDop = isReportingCurrency(currency?.code);

  // Una venta en pesos lleva tasa 1 (§7 de API.md).
  React.useEffect(() => {
    if (isDop) setValue('exchangeRate', 1);
  }, [isDop, setValue]);

  // El bloque de pago inicial solo viaja si el usuario lo activa.
  React.useEffect(() => {
    if (withInitialPayment) {
      setValue('initialPayment', {
        paymentMethodId: '',
        amount: '' as unknown as number,
        paymentDate: todayCivil(),
        referenceNumber: null,
      });
    } else {
      setValue('initialPayment', null);
    }
  }, [withInitialPayment, setValue]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const created = await createSale.mutateAsync(values);
      navigate(`/sales/${created.id}`);
    } catch (error) {
      handleFormError(error, setError, { knownFields: SALE_FORM_FIELDS });
    }
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      <Card>
        <CardContent className="flex flex-col gap-6 pt-6">
          <FormSection title="Operacion">
            <FormField label="Cliente" htmlFor="clientId" error={errors.clientId} required>
              <Controller
                control={control}
                name="clientId"
                render={({ field }) => (
                  <ClientPicker
                    id="clientId"
                    value={field.value || null}
                    onChange={field.onChange}
                    invalid={Boolean(errors.clientId)}
                  />
                )}
              />
            </FormField>

            <FormField
              label="Vehiculo"
              htmlFor="vehicleId"
              error={errors.vehicleId}
              required
              hint="Solo unidades en inventario o reservadas."
            >
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

            <FormRow columns={2}>
              <FormField label="Fecha de venta" htmlFor="saleDate" error={errors.saleDate} required>
                <Input
                  {...fieldAria('saleDate', errors.saleDate)}
                  type="date"
                  {...register('saleDate')}
                />
              </FormField>

              <FormField
                label="Vendedor"
                htmlFor="salespersonId"
                error={errors.salespersonId}
                required
                hint={canListUsers ? undefined : 'La venta se registra a tu nombre.'}
              >
                {canListUsers ? (
                  <Controller
                    control={control}
                    name="salespersonId"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger
                          id="salespersonId"
                          aria-invalid={errors.salespersonId ? true : undefined}
                        >
                          <SelectValue placeholder="Selecciona un vendedor" />
                        </SelectTrigger>
                        <SelectContent>
                          {salespeople.map((person) => (
                            <SelectItem key={person.id} value={person.id}>
                              {userFullName(person)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                ) : (
                  <Input value={user ? `${user.firstName} ${user.lastName}` : ''} disabled />
                )}
              </FormField>
            </FormRow>
          </FormSection>

          <FormSection title="Importe">
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

              <FormField label="Precio de venta" htmlFor="salePrice" error={errors.salePrice} required>
                <Input
                  {...fieldAria('salePrice', errors.salePrice)}
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder="0.00"
                  {...register('salePrice')}
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
                  step="0.0001"
                  min={0}
                  disabled={isDop}
                  {...register('exchangeRate')}
                />
              </FormField>
            </FormRow>
          </FormSection>

          <FormSection
            title="Pago inicial"
            description="Opcional. Sirve para registrar de una vez el deposito que el cliente dejo en la reserva."
          >
            <div className="flex items-center gap-2.5">
              <Checkbox
                id="withInitialPayment"
                checked={withInitialPayment}
                onCheckedChange={(checked) => setWithInitialPayment(checked === true)}
              />
              <Label htmlFor="withInitialPayment" className="font-normal">
                Registrar un pago inicial junto con la venta
              </Label>
            </div>

            {withInitialPayment && (
              <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
                <FormRow columns={2}>
                  <FormField
                    label="Metodo de pago"
                    htmlFor="initialPayment.paymentMethodId"
                    error={errors.initialPayment?.paymentMethodId}
                    required
                  >
                    <Controller
                      control={control}
                      name="initialPayment.paymentMethodId"
                      render={({ field }) => (
                        <Select value={field.value ?? ''} onValueChange={field.onChange}>
                          <SelectTrigger id="initialPayment.paymentMethodId">
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

                  <FormField
                    label="Monto"
                    htmlFor="initialPayment.amount"
                    error={errors.initialPayment?.amount}
                    required
                  >
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      placeholder="0.00"
                      {...register('initialPayment.amount')}
                    />
                  </FormField>
                </FormRow>

                <FormRow columns={2}>
                  <FormField
                    label="Fecha del pago"
                    htmlFor="initialPayment.paymentDate"
                    error={errors.initialPayment?.paymentDate}
                    required
                  >
                    <Input type="date" {...register('initialPayment.paymentDate')} />
                  </FormField>

                  <FormField
                    label="Referencia"
                    htmlFor="initialPayment.referenceNumber"
                    error={errors.initialPayment?.referenceNumber}
                  >
                    <Input
                      placeholder="Deposito reserva"
                      {...register('initialPayment.referenceNumber')}
                    />
                  </FormField>
                </FormRow>
              </div>
            )}
          </FormSection>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => navigate('/sales')} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Registrar venta
        </Button>
      </div>
    </form>
  );
}
