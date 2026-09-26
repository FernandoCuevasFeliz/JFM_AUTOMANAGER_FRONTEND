import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Tarjeta del panel. La define el borde, no la sombra: en una pantalla con
 * ocho tarjetas a la vez, las sombras marcadas ensucian y compiten entre si.
 */
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-xl border border-border bg-card text-card-foreground shadow-card',
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col gap-1 px-5 pb-4 pt-5', className)} {...props} />
  ),
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-[15px] font-semibold leading-tight tracking-tight', className)}
      {...props}
    />
  ),
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-[13px] leading-relaxed text-muted-foreground', className)} {...props} />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  // `first:pt-5` cubre las tarjetas sin cabecera, que si no quedarian pegadas
  // al borde superior.
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('px-5 pb-5 first:pt-5', className)} {...props} />
  ),
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center gap-2 border-t border-border px-5 py-4', className)}
      {...props}
    />
  ),
);
CardFooter.displayName = 'CardFooter';

/**
 * Rotulo tecnico de una tarjeta o bloque: versalita corta en mayusculas, el
 * recurso tipografico que separa "dato" de "etiqueta" sin gastar color.
 */
const CardEyebrow = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span ref={ref} className={cn('label-micro text-muted-foreground', className)} {...props} />
  ),
);
CardEyebrow.displayName = 'CardEyebrow';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, CardEyebrow };
