import { Check, ChevronsUpDown, Loader2, Users } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDebouncedValue } from '@/lib/use-list-params';
import { cn } from '@/lib/utils';
import { useClient, useClients } from '../hooks';
import { clientDisplayName } from '../types';

/** Selector de cliente con busqueda contra el servidor. */
export function ClientPicker({
  value,
  onChange,
  disabled = false,
  invalid = false,
  id,
}: {
  value: string | null;
  onChange: (clientId: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const debouncedSearch = useDebouncedValue(search);

  const clientsQuery = useClients({
    page: 1,
    pageSize: 20,
    search: debouncedSearch || undefined,
    isActive: true,
  });

  const selectedQuery = useClient(value ?? undefined);
  const selected = selectedQuery.data;
  const options = clientsQuery.data?.data ?? [];

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
              {clientDisplayName(selected)} · {selected.documentNumber}
            </span>
          ) : (
            'Selecciona un cliente'
          )}
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <div className="border-b border-border p-2">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nombre, documento o telefono…"
            className="h-8"
            autoFocus
          />
        </div>

        <div className="max-h-64 overflow-y-auto p-1">
          {clientsQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Cargando…
            </div>
          ) : options.length === 0 ? (
            <div className="flex flex-col items-center gap-1 py-6 text-center">
              <Users className="size-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {search ? 'Ningun cliente coincide' : 'No hay clientes registrados'}
              </p>
            </div>
          ) : (
            options.map((client) => (
              <button
                key={client.id}
                type="button"
                onClick={() => {
                  onChange(client.id);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left text-sm transition-colors hover:bg-accent',
                  value === client.id && 'bg-accent',
                )}
              >
                <Check
                  className={cn(
                    'mt-0.5 size-4 shrink-0',
                    value === client.id ? 'opacity-100' : 'opacity-0',
                  )}
                />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{clientDisplayName(client)}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {client.documentTypeName} {client.documentNumber} · {client.phone}
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
