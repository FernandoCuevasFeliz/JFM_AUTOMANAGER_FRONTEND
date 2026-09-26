import * as React from 'react';
import { StatusDot } from '@/components/status-badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormField } from '@/components/form-field';
import {
  VEHICLE_STATUS_META,
  assignableVehicleStatuses,
  isCommerciallyManagedStatus,
} from '@/lib/status';
import { useChangeVehicleStatus } from '../hooks';
import type { AssignableVehicleStatus, Vehicle } from '../types';

/**
 * Cambio de estado de un vehiculo.
 *
 * El selector solo ofrece los destinos validos **desde el estado actual**, y
 * nunca `reserved` ni `sold`: esos los produce el ciclo comercial al crear o
 * cancelar una reserva o una venta (§6 de API.md).
 */
export function VehicleStatusDialog({
  vehicle,
  open,
  onOpenChange,
}: {
  vehicle: Vehicle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [target, setTarget] = React.useState<AssignableVehicleStatus | ''>('');
  const changeStatus = useChangeVehicleStatus(vehicle.id);

  const options = assignableVehicleStatuses(vehicle.status);
  const managedByCommercialFlow = isCommerciallyManagedStatus(vehicle.status);

  React.useEffect(() => {
    if (open) setTarget('');
  }, [open]);

  function handleConfirm() {
    if (!target) return;
    changeStatus.mutate(target, {
      onSuccess: () => onOpenChange(false),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cambiar estado del vehiculo</DialogTitle>
          <DialogDescription>
            Chasis {vehicle.chassisNumber} · {vehicle.brandName} {vehicle.modelName}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2.5">
            <span className="text-sm text-muted-foreground">Estado actual</span>
            <StatusDot meta={VEHICLE_STATUS_META[vehicle.status]} />
          </div>

          {managedByCommercialFlow ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
              Un vehiculo{' '}
              <strong>{VEHICLE_STATUS_META[vehicle.status].label.toLowerCase()}</strong> no cambia de
              estado a mano. Cancela la{' '}
              {vehicle.status === 'reserved' ? 'reserva' : 'venta'} asociada para devolverlo a
              inventario.
            </p>
          ) : options.length === 0 ? (
            <p className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
              No hay transiciones disponibles desde este estado.
            </p>
          ) : (
            <FormField label="Nuevo estado" htmlFor="target-status" required>
              <Select value={target} onValueChange={(value) => setTarget(value as AssignableVehicleStatus)}>
                <SelectTrigger id="target-status">
                  <SelectValue placeholder="Selecciona el nuevo estado" />
                </SelectTrigger>
                <SelectContent>
                  {options.map((status) => (
                    <SelectItem key={status} value={status}>
                      {VEHICLE_STATUS_META[status].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={changeStatus.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!target || options.length === 0 || managedByCommercialFlow}
            loading={changeStatus.isPending}
          >
            Cambiar estado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
