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
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center', className)}>
      {children}
      {showClear && onClear && (
        <Button variant="ghost" size="sm" onClick={onClear} className="text-muted-foreground">
          <X />
          Limpiar
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
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={placeholder}
        className="pl-9"
        type="search"
      />
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
