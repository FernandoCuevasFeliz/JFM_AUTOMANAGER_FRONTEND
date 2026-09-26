import * as React from 'react';
import { cn } from '@/lib/utils';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-20 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground shadow-xs',
        'transition-[border-color,box-shadow] duration-150 ease-out',
        'placeholder:text-muted-foreground/70 hover:border-foreground/25',
        'focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/18',
        'disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60',
        'aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive/22',
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';

export { Textarea };
