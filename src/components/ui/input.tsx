import * as React from 'react';
import { cn } from '@/lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

/**
 * Tipos cuyo valor se elige en un desplegable nativo del navegador.
 */
const PICKER_TYPES = new Set(['date', 'datetime-local', 'month', 'time', 'week']);

/**
 * Campo de texto. El foco engrosa el borde en vez de dibujar un halo suelto:
 * en un formulario de doce campos el halo desalinea la retícula visual.
 *
 * En los campos de fecha abre el calendario al pulsar **cualquier** punto del
 * campo. Por defecto Chrome solo lo abre desde el iconito de la derecha, un
 * blanco de 16px que casi nadie acierta a la primera; el resto del campo se
 * queda esperando que teclees `dd/mm/aaaa` a mano.
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, onClick, ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    onClick={(event) => {
      onClick?.(event);

      if (!type || !PICKER_TYPES.has(type) || event.defaultPrevented) return;

      const field = event.currentTarget;
      if (field.disabled || field.readOnly) return;

      try {
        // Solo desde el clic: hacerlo tambien al enfocar abriria el calendario
        // al tabular por el formulario, que es justo lo contrario de util.
        field.showPicker();
      } catch {
        // Navegador sin `showPicker` (o iframe de otro origen): queda el
        // comportamiento nativo, que sigue siendo utilizable.
      }
    }}
    className={cn(
      'flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground shadow-xs',
      'transition-[border-color,box-shadow,background-color] duration-150 ease-out',
      'placeholder:text-muted-foreground/70',
      'hover:border-foreground/25',
      'focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/18',
      'disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60',
      'aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive/22',
      'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
      // El buscador nativo de WebKit trae su propia X, que choca con la nuestra.
      '[&::-webkit-search-cancel-button]:appearance-none',
      // Todo el campo de fecha es pulsable, asi que debe parecerlo. El icono
      // nativo se estira sobre el campo entero para que el cursor no cambie a
      // mitad de camino.
      '[&[type=date]]:cursor-pointer [&[type=datetime-local]]:cursor-pointer [&[type=month]]:cursor-pointer [&[type=time]]:cursor-pointer [&[type=week]]:cursor-pointer',
      '[&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60',
      'hover:[&::-webkit-calendar-picker-indicator]:opacity-100',
      className,
    )}
    {...props}
  />
));
Input.displayName = 'Input';

export { Input };
