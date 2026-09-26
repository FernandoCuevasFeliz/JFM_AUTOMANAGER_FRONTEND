import type * as React from 'react';
import { ResponsiveContainer } from 'recharts';
import { PRINT_CHART_WIDTH, usePrintMode } from '@/lib/use-print-mode';

/**
 * Contenedor de grafica que tambien funciona en papel.
 *
 * En pantalla mide el hueco disponible; al imprimir recibe el ancho de la hoja
 * en pixeles. Con un numero, `ResponsiveContainer` lo usa tal cual y no espera a
 * su `ResizeObserver`, que es lo que dejaba el `<svg>` con el ancho de pantalla
 * dentro de una caja mas estrecha: ahi el navegador escalaba el dibujo entero
 * —texto de los ejes incluido— hasta hacerlo ilegible.
 *
 * **El `ResponsiveContainer` no se puede quitar en impresion**, aunque pasarle
 * el tamaño al grafico directamente parezca mas limpio. Si desaparece, React ve
 * otro tipo de componente en esa posicion, desmonta la grafica y monta una
 * nueva; recharts reinicia su animacion de entrada y la instantanea de la
 * impresion se lleva el fotograma cero: los `<g>` de las barras salen vacios,
 * sin un solo `<path>` dentro. En papel no salia ninguna grafica.
 *
 * La animacion se apaga aparte, en `useChartStyles()`: aunque no haya remontaje,
 * cambiar de tamaño tambien la dispara.
 *
 * El alto se reduce un poco en papel, pero **poco**: estaba en el 78 % y era
 * demasiado. Al imprimir el ancho ya cae a menos de la mitad, asi que recortar
 * tambien el alto dejaba una caja donde no cabian el dibujo y su leyenda —los
 * donuts salian cercenados y las etiquetas pisadas—. Un 90 % quita lo justo
 * para que la grafica no se coma la hoja.
 */
export function PrintChart({
  height,
  printHeight,
  children,
}: {
  height: number;
  /** Por defecto, el 90 % del alto de pantalla. */
  printHeight?: number;
  children: React.ReactElement;
}) {
  const printing = usePrintMode();

  return (
    <ResponsiveContainer
      width={printing ? PRINT_CHART_WIDTH : '100%'}
      height={printing ? (printHeight ?? Math.round(height * 0.9)) : height}
    >
      {children}
    </ResponsiveContainer>
  );
}
