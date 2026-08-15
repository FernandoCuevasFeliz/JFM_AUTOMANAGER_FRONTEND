import type * as React from 'react';
import { ResponsiveContainer } from 'recharts';
import { PRINT_CHART_WIDTH, usePrintMode } from '@/lib/use-print-mode';

/**
 * Contenedor de grafica que tambien funciona en papel.
 *
 * En pantalla se comporta como `ResponsiveContainer` de toda la vida. Al
 * imprimir cambia a un **ancho fijo en pixeles**, que es lo unico que recharts
 * respeta sin pasar por su `ResizeObserver`: con un porcentaje mide el
 * contenedor y guarda el tamaño en estado, y ese estado llega tarde a la
 * instantanea de impresion (ver `use-print-mode.ts`).
 *
 * El alto se reduce un poco en papel: una grafica con las proporciones de
 * pantalla ocupa media hoja y empuja el resto del reporte a la siguiente.
 */
export function PrintChart({
  height,
  printHeight,
  children,
}: {
  height: number;
  /** Por defecto, el 78 % del alto de pantalla. */
  printHeight?: number;
  children: React.ReactElement;
}) {
  const printing = usePrintMode();

  return (
    <ResponsiveContainer
      width={printing ? PRINT_CHART_WIDTH : '100%'}
      height={printing ? (printHeight ?? Math.round(height * 0.78)) : height}
    >
      {children}
    </ResponsiveContainer>
  );
}
