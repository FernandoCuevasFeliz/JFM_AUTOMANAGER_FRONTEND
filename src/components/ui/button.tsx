import { Slot } from '@radix-ui/react-slot';
import { type VariantProps, cva } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Botones del panel.
 *
 * `default` es grafito, no rojo: en este sistema el rojo esta reservado a la
 * marca y a lo destructivo (ver la nota de color en `index.css`). Un boton rojo
 * siempre significa "esto borra o cancela algo".
 *
 * El hundido de 1px en `:active` da el acuse tactil que un cambio de color solo
 * no transmite, y `hit-target` lleva el area de toque a 44px en pantallas
 * tactiles sin engordar la UI en escritorio.
 */
const buttonVariants = cva(
  [
    'hit-target inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md',
    'text-sm font-medium transition-[background-color,border-color,color,box-shadow,translate] duration-150 ease-out',
    'active:translate-y-px',
    'disabled:pointer-events-none disabled:opacity-50 disabled:active:translate-y-0',
    '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/88',
        destructive:
          'bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/88',
        outline:
          'border border-input bg-card text-foreground shadow-xs hover:border-foreground/25 hover:bg-accent',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/70',
        ghost: 'text-foreground hover:bg-accent hover:text-accent-foreground',
        link: 'text-foreground underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground',
      },
      size: {
        default: 'h-9 px-4',
        sm: 'h-8 rounded-[calc(var(--radius)-3px)] px-3 text-[13px]',
        lg: 'h-10 px-6',
        icon: 'size-9',
        'icon-sm': 'size-8 rounded-[calc(var(--radius)-3px)]',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Muestra un spinner y bloquea el boton mientras la accion esta en vuelo. */
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" aria-hidden />
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
