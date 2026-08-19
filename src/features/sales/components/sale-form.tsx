import { zodResolver } from '@hookform/resolvers/zod';
import { Link2 } from 'lucide-react';
import * as React from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { useQuotation } from '@/features/quotations/hooks';
import { useReservation } from '@/features/reservations/hooks';
import { useUsers } from '@/features/users/hooks';
import { userFullName } from '@/features/users/types';
import { todayCivil } from '@/lib/dates';
import { handleFormError } from '@/lib/errors';
import { REPORTING_CURRENCY, formatMoney, isReportingCurrency } from '@/lib/money';
import {  } from '@/lib/status';
import { useCreateSale } from '../hooks';
import { SaleItemsField } from './sale-items-field';
import { SALE_FORM_FIELDS, type CreateSaleValues, createSaleSchema } from '../schemas';

/**
 * Alta de ventas.
 *
 * Solo se vende una unidad `in_inventory` o `reserved` (§7 de API.md). Al
 * guardar, el backend pasa el vehiculo a `sold` y marca la reserva y la
 * cotizacion de origen como `converted`, todo en una transaccion.
 *
 * **El origen viaja en la URL** (`?reservationId=` / `?quotationId=`). No es un
 * adorno: el backend solo marca `converted` la reserva y la cotizacion si
 * recibe sus identificadores —no los deduce del vehiculo, porque una unidad
 * puede acumular varias reservas y cotizaciones y no sabria cual cerrar—. Antes
 * los botones «Registrar venta» de la reserva y de la cotizacion apuntaban a
 * esta pantalla sin nada, asi que ninguna reserva llegaba nunca a convertirse y
 * el deposito habia que teclearlo de memoria.
 *
 * Con el origen puesto, el servidor ademas exige que el cliente y el vehiculo
 * coincidan con los del documento, asi que aqui quedan fijados.
 */
export function SaleForm() {
  const navigate = useNavigate();
  const { user, can } = useAuth();
  const [searchParams] = useSearchParams();

  const currencies = useCurrencies();
  const paymentMethods = usePaymentMethods();
  const createSale = useCreateSale();

  const reservationId = searchParams.get('reservationId');
  const reservationQuery = useReservation(reservationId ?? undefined);
  const reservation = reservationQuery.data;

  /*
   * La cotizacion puede venir directa o heredada de la reserva. Se mandan las
   * dos cosas cuando existen: el backend acepta una cotizacion ya `converted`
   * si llega por la via de su reserva, y asi el enlace queda completo en la
   * ficha de la venta.
   */
  const quotationId = searchParams.get('quotationId') ?? reservation?.quotationId ?? null;
  const quotationQuery = useQuotation(quotationId ?? undefined);
  const quotation = quotationQuery.data;

  /*
   * Se bloquea por tener el documento en la mano, no por que la URL lo
   * mencione. Si la consulta falla —enlace viejo, reserva borrada, un rol sin
   * permiso de lectura— el formulario se queda abierto y utilizable en vez de
   * atrapar al usuario con el cliente y el vehiculo vacios y bloqueados.
   */
  const origenFijado = Boolean(reservation ?? quotation);
  const origenCargando =
    (Boolean(reservationId) && reservationQuery.isLoading) ||
    (Boolean(quotationId) && quotationQuery.isLoading);
  const origenIlegible =
    Boolean(reservationId ?? searchParams.get('quotationId')) &&
    !origenCargando &&
    !origenFijado;

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
      items: [{ vehicleId: '', salePrice: '' as unknown as number }],
      currencyId: '',
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
    reset,
    setValue,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = form;

  const currencyId = watch('currencyId');
  const currency = currencies.find((item) => item.id === currencyId);
  const isDop = isReportingCurrency(currency?.code);

  /*
   * Lo que el documento de origen ya decidio.
   *
   * La reserva manda en cliente y vehiculo; la cotizacion aporta ademas moneda
   * y precio pactado. El deposito NO entra aqui: es un importe sin moneda en el
   * modelo, y meterlo a ciegas en una venta en divisa seria un error de dos
   * ordenes de magnitud. Se decide mas abajo, ya con la moneda a la vista.
   */
  const valoresDeOrigen = React.useMemo(() => {
    if (!reservation && !quotation) return null;

    return {
      reservationId: reservation?.id ?? null,
      quotationId: quotation?.id ?? null,
      clientId: reservation?.clientId ?? quotation?.clientId ?? '',
      items: [
        {
          vehicleId: reservation?.vehicleId ?? quotation?.vehicleId ?? '',
          salePrice: (quotation?.quotedPrice ?? '') as number,
        },
      ],
      ...(quotation
        ? { currencyId: quotation.currencyId }
        : {}),
    };
  }, [reservation, quotation]);

  /*
   * Se vuelca en cuanto llega, y otra vez si despues aparece la cotizacion que
   * colgaba de la reserva. `isDirty` es el freno: en cuanto el usuario toca
   * algo, deja de pisarse lo que haya escrito.
   *
   * El `reset` va sin `keepDefaultValues` a proposito: lo prellenado pasa a ser
   * el nuevo punto de partida. Conservando los defaults originales, el
   * formulario quedaria sucio desde el primer volcado y la segunda pasada —la
   * de la cotizacion— no llegaria a ejecutarse nunca.
   */
  React.useEffect(() => {
    if (!valoresDeOrigen || isDirty) return;
    reset((actuales) => ({ ...actuales, ...valoresDeOrigen }));
  }, [valoresDeOrigen, isDirty, reset]);

  /*
   * El deposito solo se puede proponer como pago inicial si la venta va en la
   * misma moneda en que se guardo, que es la de reporte: `reservations` no
   * tiene columna de moneda. En divisa se avisa y se deja el importe vacio para
   * que lo ponga una persona, no un `??`.
   */
  const deposito = reservation?.depositAmount ?? 0;
  const hayDeposito = deposito > 0;
  const depositoAplicable = hayDeposito && isDop;
  const depositoEnOtraMoneda = hayDeposito && Boolean(currency) && !isDop;

  /*
   * La unidad que fija el documento de origen no se puede quitar de la venta:
   * sin ella, la reserva o la cotizacion no quedarian convertidas.
   */
  const unidadDeOrigen = reservation?.vehicleId ?? quotation?.vehicleId ?? null;
  const rate = Number(watch('exchangeRate'));

  // Una venta en pesos lleva tasa 1 (§7 de API.md).
  React.useEffect(() => {
    if (isDop) setValue('exchangeRate', 1);
  }, [isDop, setValue]);

  /*
   * Con deposito en la misma moneda, la casilla se marca sola: es lo que se
   * quiere el 100 % de las veces y era justo el paso que se olvidaba, dejando
   * el dinero del cliente fuera del estado de cuenta de su propia venta.
   */
  const depositoPropuesto = React.useRef(false);
  React.useEffect(() => {
    if (!depositoAplicable || depositoPropuesto.current) return;
    depositoPropuesto.current = true;
    setWithInitialPayment(true);
  }, [depositoAplicable]);

  // El bloque de pago inicial solo viaja si el usuario lo activa.
  React.useEffect(() => {
    if (!withInitialPayment) {
      setValue('initialPayment', null);
      return;
    }

    setValue('initialPayment', {
      paymentMethodId: '',
      // El metodo de pago del deposito no se guarda en la reserva, asi que ese
      // dato sigue siendo del usuario; el importe y el concepto no.
      amount: depositoAplicable ? deposito : ('' as unknown as number),
      paymentDate: todayCivil(),
      referenceNumber:
        depositoAplicable && reservation ? `Deposito ${reservation.reservationNumber}` : null,
    });
  }, [withInitialPayment, depositoAplicable, deposito, reservation, setValue]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const created = await createSale.mutateAsync(values);
      navigate(`/sales/${created.id}`);
    } catch (error) {
      handleFormError(error, setError, { knownFields: SALE_FORM_FIELDS });
    }
  });

  return (
    <FormProvider {...form}>
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      {/*
        Se dice en voz alta que el enlace se pierde. Callarlo dejaria una venta
        sin convertir su reserva —el defecto que este cambio viene a arreglar—
        con la diferencia de que ahora nadie lo notaria.
      */}
      {origenIlegible && (
        <p className="rounded-lg border border-warning/30 bg-warning/8 px-3.5 py-3 text-sm leading-relaxed">
          No se pudo cargar el documento de origen que venia en el enlace. Puedes registrar la venta
          igualmente, pero <strong>no quedara enlazada</strong> con su reserva o cotizacion y esta
          seguira abierta. Si esperabas ese enlace, vuelve a la ficha del documento y entra desde su
          boton «Registrar venta».
        </p>
      )}

      {origenFijado && (
        <p className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/40 px-3.5 py-3 text-sm leading-relaxed">
          <Link2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span>
            Nace de{' '}
            {reservation && (
              <>
                la reserva <strong className="num font-medium">{reservation.reservationNumber}</strong>
              </>
            )}
            {reservation && quotation && ' y '}
            {quotation && (
              <>
                la cotizacion <strong className="num font-medium">{quotation.quotationNumber}</strong>
              </>
            )}
            {reservation && quotation
              ? ', que al guardar quedaran como convertidas.'
              : ', que al guardar quedara como convertida.'}{' '}
            El cliente y el vehiculo vienen de ahi y no se cambian: el servidor exige que coincidan.
          </span>
        </p>
      )}

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
                    disabled={origenFijado}
                    invalid={Boolean(errors.clientId)}
                  />
                )}
              />
            </FormField>

            <SaleItemsField
              lockedVehicleId={unidadDeOrigen}
              currencyCode={currency?.code}
              isDop={isDop}
              exchangeRate={Number.isFinite(rate) ? rate : 1}
            />

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
            description={
              hayDeposito
                ? 'El deposito de la reserva es dinero ya cobrado: si no entra aqui, la venta nace debiendo de mas.'
                : 'Opcional. Sirve para registrar de una vez un abono entregado al cerrar la venta.'
            }
          >
            {/*
              El deposito no lleva moneda en el modelo: `reservations` guarda un
              importe pelado, que por convencion esta en la moneda de reporte.
              Proponerlo en una venta en divisa lo multiplicaria por la tasa sin
              que nadie se diera cuenta, asi que ahi se avisa y se deja en manos
              de una persona.
            */}
            {depositoEnOtraMoneda && (
              <p className="rounded-lg border border-warning/30 bg-warning/8 px-3.5 py-3 text-[13px] leading-relaxed">
                La reserva tiene un deposito de{' '}
                <strong className="num font-semibold">
                  {formatMoney(deposito, REPORTING_CURRENCY)}
                </strong>{' '}
                y esta venta va en <strong>{currency?.code}</strong>. El deposito se guarda sin
                moneda, asi que no se rellena solo: convierte el importe a {currency?.code} y
                escribelo a mano.
              </p>
            )}

            <div className="flex items-center gap-2.5">
              <Checkbox
                id="withInitialPayment"
                checked={withInitialPayment}
                onCheckedChange={(checked) => setWithInitialPayment(checked === true)}
              />
              <Label htmlFor="withInitialPayment" className="font-normal">
                {depositoAplicable
                  ? `Registrar el deposito de ${formatMoney(deposito, REPORTING_CURRENCY)} como pago inicial`
                  : 'Registrar un pago inicial junto con la venta'}
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
    </FormProvider>
  );
}

/**
 * Aviso al vender una unidad que otro cliente tiene reservada.
 *
 * Va aparte para que la consulta solo se dispare cuando el caso se da: montado
 * siempre, listaria reservas en cada alta de venta sin motivo.
 *
 * No bloquea. Vender por encima de una reserva vencida o de un cliente que
 * desistio es una decision legitima del vendedor; lo que no puede pasar es que
 * la tome sin saberlo.
 */