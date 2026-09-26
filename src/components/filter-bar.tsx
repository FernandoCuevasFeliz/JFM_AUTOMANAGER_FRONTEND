import { Search, X } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDebouncedValue } from '@/lib/use-list-params';
import { cn } from '@/lib/utils';

/**
 * Barra de filtros de un listado.
 *
 * Los filtros viajan al servidor como query params; la tabla no filtra en
 * memoria lo que el backend ya sabe filtrar.
 *
 * Se dibuja como una regleta acotada, no como controles sueltos sobre el fondo:
 * asi se lee como el panel de mando de la tabla que tiene debajo, y "Limpiar"
 * queda anclado al extremo derecho en vez de flotar al final de la fila.
 */
export function FilterBar({
  children,
  onClear,
  showClear = false,
  className,
}: {
  children: React.ReactNode;
  onClear?: () => void;
  showClear?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2.5 rounded-xl border border-border bg-card p-2.5 shadow-card',
        'sm:flex-row sm:flex-wrap sm:items-center',
        className,
      )}
      role="search"
    >
      {children}

      {showClear && onClear && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="text-muted-foreground sm:ml-auto"
        >
          <X />
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}

/**
 * Buscador con rebote: el valor visible cambia al instante y el filtro real
 * solo se actualiza cuando el usuario deja de escribir.
 */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Buscar…',
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [draft, setDraft] = React.useState(value);
  const debounced = useDebouncedValue(draft);
  const lastEmitted = React.useRef(value);

  React.useEffect(() => {
    if (debounced !== lastEmitted.current) {
      lastEmitted.current = debounced;
      onChange(debounced);
    }
  }, [debounced, onChange]);

  // Si el filtro se limpia desde fuera, el input debe seguirlo.
  React.useEffect(() => {
    if (value !== lastEmitted.current) {
      lastEmitted.current = value;
      setDraft(value);
    }
  }, [value]);

  return (
    <div className={cn('relative w-full sm:max-w-xs', className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={placeholder}
        className={cn('pl-9', draft && 'pr-9')}
        type="search"
        aria-label={placeholder}
      />

      {/* Borrar la busqueda sin tener que mantener el retroceso pulsado. */}
      {draft && (
        <button
          type="button"
          onClick={() => setDraft('')}
          className="hit-target absolute right-1 top-1 flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Borrar busqueda"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

/** Valor centinela de "todos": Radix Select no admite `value=""` en un item. */
export const ALL_OPTION = '__all__';

export function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
  allLabel = 'Todos',
  className,
  disabled,
}: {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  allLabel?: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <Select
      value={value ?? ALL_OPTION}
      onValueChange={(next) => onChange(next === ALL_OPTION ? undefined : next)}
      disabled={disabled}
    >
      <SelectTrigger className={cn('w-full sm:w-48', className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_OPTION}>{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
