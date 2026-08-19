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
import { handleFormError } from '@/lib/errors';
import { formatMoney } from '@/lib/money';
import {
  type CreditNoteValues,
  type IssueValues,
  type RejectValues,
  creditNoteSchema,
  issueSchema,
  rejectSchema,
} from '../schemas';

/** Valor centinela: Radix Select no admite `value=""` en un item. */
const SIN_UNIDAD = '__general__';

/**
 * Dialogos del ciclo fiscal.
 *
 * Los tres registran en el sistema algo que ya paso fuera de el: el backend no
 * habla con la DGII, asi que aqui se transcribe el acuse del PSFE. Por eso el
 * NCF se teclea en vez de generarse.
 */

// --- Emitir ------------------------------------------------------------------

export function IssueDialog({
  open,
  onOpenChange,
  title,
  description,
  expectedPrefix,
  loading,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** `E31`, `E34`… El backend rechaza el NCF si el tipo no coincide. */
  expectedPrefix: string;
  loading: boolean;
  onSubmit: (values: IssueValues) => Promise<unknown>;
}) {
  const form = useForm<IssueValues>({
    resolver: zodResolver(issueSchema),
    defaultValues: { ncfNumber: '', dgiiTrackId: null, xmlUrl: null },
  });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = form;

  React.useEffect(() => {
    if (open) reset({ ncfNumber: '', dgiiTrackId: null, xmlUrl: null });
  }, [open, reset]);

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch (error) {
      handleFormError(error, setError, { knownFields: ['ncfNumber', 'dgiiTrackId', 'xmlUrl'] });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <FormField
            label="NCF asignado"
            htmlFor="ncfNumber"
            error={errors.ncfNumber}
            hint={`Formato ${expectedPrefix} + 10 digitos. Ejemplo: ${expectedPrefix}0000000001`}
            required
          >
            <Input
              {...fieldAria('ncfNumber', errors.ncfNumber)}
              placeholder={`${expectedPrefix}0000000001`}
              autoComplete="off"
              spellCheck={false}
              className="num uppercase"
              autoFocus
              {...register('ncfNumber')}
            />
          </FormField>

          <FormField
            label="TrackID de la DGII"
            htmlFor="dgiiTrackId"
            error={errors.dgiiTrackId}
            hint="Opcional. Acuse de recibo que devuelve el envio."
          >
            <Input
              {...fieldAria('dgiiTrackId', errors.dgiiTrackId)}
              autoComplete="off"
              className="num"
              {...register('dgiiTrackId')}
            />
          </FormField>

          <FormField
            label="URL del XML firmado"
            htmlFor="xmlUrl"
            error={errors.xmlUrl}
            hint="Opcional. Donde queda archivado el comprobante firmado."
          >
            <Input
              {...fieldAria('xmlUrl', errors.xmlUrl)}
              type="url"
              placeholder="https://…"
              {...register('xmlUrl')}
            />
          </FormField>

          <p className="rounded-md border border-warning/30 bg-warning/8 px-3 py-2 text-[13px] leading-relaxed text-foreground">
            Una vez emitido, el comprobante es <strong className="font-semibold">inmutable</strong>.
            Solo se corrige con notas de credito.
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              Registrar emision
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Rechazar ----------------------------------------------------------------

export function RejectDialog({
  open,
  onOpenChange,
  title,
  loading,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  loading: boolean;
  onSubmit: (values: RejectValues) => Promise<unknown>;
}) {
  const form = useForm<RejectValues>({
    resolver: zodResolver(rejectSchema),
    defaultValues: { reason: '' },
  });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = form;

  React.useEffect(() => {
    if (open) reset({ reason: '' });
  }, [open, reset]);

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch (error) {
      handleFormError(error, setError, { knownFields: ['reason'] });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Anota por que lo rechazo la DGII. Queda visible en la ficha para saber que corregir
            antes de reintentar.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <FormField label="Motivo del rechazo" htmlFor="reason" error={errors.reason} required>
            <Textarea
              {...fieldAria('reason', errors.reason)}
              rows={3}
              placeholder="Falta el RNC del receptor"
              autoFocus
              {...register('reason')}
            />
          </FormField>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" loading={loading}>
              Registrar rechazo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Nota de credito ---------------------------------------------------------

export function CreditNoteDialog({
  open,
  onOpenChange,
  currencyCode,
  available,
  items,
  loading,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currencyCode: string;
  /** Importe que aun se puede acreditar, ya descontadas las notas pendientes. */
  available: number;
  /** Vehiculos de la venta, para atar la nota a uno concreto. */
  items?: { id: string; label: string; salePrice: number }[];
  loading: boolean;
  onSubmit: (values: CreditNoteValues) => Promise<unknown>;
}) {
  const form = useForm<CreditNoteValues>({
    resolver: zodResolver(creditNoteSchema),
    defaultValues: { saleItemId: null, reason: '', amount: '' as unknown as number },
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors },
  } = form;

  React.useEffect(() => {
    if (open) reset({ saleItemId: null, reason: '', amount: '' as unknown as number });
  }, [open, reset]);

  const saleItemId = watch('saleItemId');
  const unidad = items?.find((item) => item.id === saleItemId) ?? null;

  /*
   * `saleItemId` cambia el techo: atada a una linea no puede pasar del precio de
   * ESA unidad; sin ella, el techo es el importe vigente de la factura.
   */
  const techo = unidad ? Math.min(unidad.salePrice, available) : available;

  const amount = Number(watch('amount'));
  const excede = Number.isFinite(amount) && amount > techo;

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch (error) {
      handleFormError(error, setError, { knownFields: ['saleItemId', 'reason', 'amount'] });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva nota de credito</DialogTitle>
          <DialogDescription>
            Corrige o anula parte de una factura emitida. Nace pendiente: solo descuenta del importe
            cuando la DGII la acepta.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          {items && items.length > 0 && (
            <FormField
              label="Unidad que la motiva"
              htmlFor="saleItemId"
              error={errors.saleItemId}
              hint="Atarla a un vehiculo es lo que despues permite devolverlo."
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
                      <SelectItem value={SIN_UNIDAD}>Nota general de la factura</SelectItem>
                      {items.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          )}

          <FormField
            label="Monto"
            htmlFor="amount"
            error={errors.amount}
            hint={
              unidad
                ? `Maximo para esta unidad: ${formatMoney(techo, currencyCode)}`
                : `Disponible para acreditar: ${formatMoney(available, currencyCode)}`
            }
            required
          >
            <div className="flex gap-2">
              <Input
                {...fieldAria('amount', errors.amount)}
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                className="num"
                autoFocus
                {...register('amount')}
              />
              {/* Anular la factura entera es el caso mas comun; que no haya que
                  teclear el importe a mano evita el descuadre por un centavo. */}
              <Button
                type="button"
                variant="outline"
                onClick={() => setValue('amount', techo as never, { shouldValidate: true })}
              >
                Todo
              </Button>
            </div>
          </FormField>

          {excede && (
            <p role="alert" className="text-[13px] font-medium text-danger">
              El monto supera el maximo{unidad ? ' de esta unidad' : ' disponible'}. Las notas
              pendientes tambien consumen importe.
            </p>
          )}

          <FormField label="Motivo" htmlFor="reason" error={errors.reason} required>
            <Textarea
              {...fieldAria('reason', errors.reason)}
              rows={3}
              placeholder="Devolucion parcial del vehiculo"
              {...register('reason')}
            />
          </FormField>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading} disabled={excede}>
              Crear nota
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
