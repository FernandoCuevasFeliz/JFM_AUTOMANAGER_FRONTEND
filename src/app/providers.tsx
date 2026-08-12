import { QueryClientProvider } from '@tanstack/react-query';
import type * as React from 'react';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/features/auth/use-auth';
import { queryClient } from '@/lib/query-client';

/**
 * Proveedores globales. `AuthProvider` va por dentro de `QueryClientProvider`
 * porque al cerrar sesion limpia la cache de queries.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider delayDuration={200}>
          {children}
          <Toaster
            position="top-right"
            richColors
            closeButton
            toastOptions={{ duration: 5000 }}
          />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
