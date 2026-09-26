import { Car, Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatMoney } from '@/lib/money';
import { VEHICLE_STATUS_META, type VehicleStatus } from '@/lib/status';
import { useDebouncedValue } from '@/lib/use-list-params';
import { cn } from '@/lib/utils';
import { useVehicle, useVehicles } from '../hooks';

/**
 * Selector de vehiculo con busqueda.
 *
 * `statuses` filtra en el **servidor** (`?status=…`) segun la operacion, que es
 * lo que exige la tabla de disponibilidad de §7 de API.md:
 *   cotizar  → cualquiera menos `sold`
 *   reservar → solo `in_inventory`
 *   vender   → `in_inventory` o `reserved`
 */
export function VehiclePicker({
  value,
  onChange,
  statuses,
  disabled = false,
  invalid = false,
  placeholder = 'Selecciona un vehiculo',
  id,
}: {
  value: string | null;
  onChange: (vehicleId: string) => void;
  statuses?: readonly VehicleStatus[];
  disabled?: boolean;
  invalid?: boolean;
  placeholder?: string;
  id?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const debouncedSearch = useDebouncedValue(search);

  const vehiclesQuery = useVehicles({
    page: 1,
    pageSize: 20,
    search: debouncedSearch || undefined,
    status: statuses ? [...statuses] : undefined,
    isActive: true,
  });

  // El vehiculo ya elegido puede no estar en la pagina actual de resultados.
  const selectedQuery = useVehicle(value ?? undefined);
  const selected = selectedQuery.data;

  const options = vehiclesQuery.data?.data ?? [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid || undefined}
          disabled={disabled}
          className={cn(
            'h-9 w-full justify-between font-normal',
            !selected && 'text-muted-foreground',
            invalid && 'border-destructive',
          )}
        >
          {selected ? (
            <span className="truncate">
              {selected.brandName} {selected.modelName} {selected.year} · {selected.chassisNumber}
            </span>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <div className="border-b border-border p-2">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por chasis, marca o modelo…"
            className="h-8"
            autoFocus
          />
        </div>

        <div className="max-h-64 overflow-y-auto p-1">
          {vehiclesQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Cargando…
            </div>
          ) : options.length === 0 ? (
            <div className="flex flex-col items-center gap-1 py-6 text-center">
              <Car className="size-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {search ? 'Ningun vehiculo coincide' : 'No hay vehiculos disponibles'}
              </p>
              {statuses && !search && (
                <p className="px-4 text-xs text-muted-foreground">
                  Solo se listan unidades en estado{' '}
                  {statuses.map((status) => VEHICLE_STATUS_META[status].label).join(' o ')}.
                </p>
              )}
            </div>
          ) : (
            options.map((vehicle) => (
              <button
                key={vehicle.id}
                type="button"
                onClick={() => {
                  onChange(vehicle.id);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left text-sm transition-colors hover:bg-accent',
                  value === vehicle.id && 'bg-accent',
                )}
              >
                <Check
                  className={cn(
                    'mt-0.5 size-4 shrink-0',
                    value === vehicle.id ? 'opacity-100' : 'opacity-0',
                  )}
                />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">
                    {vehicle.brandName} {vehicle.modelName} {vehicle.year}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {vehicle.chassisNumber}
                    {vehicle.salePrice !== null && ` · ${formatMoney(vehicle.salePrice, 'DOP')}`}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
