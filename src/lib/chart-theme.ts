import { usePrintMode } from '@/lib/use-print-mode';

/**
 * Estilo compartido de las graficas (recharts).
 *
 * Vive fuera de las pantallas para que el tablero y los reportes no acaben con
 * dos tooltips distintos. Los colores salen de los tokens del tema, asi que una
 * grafica sigue al modo claro/oscuro sin codigo extra.
 */

/**
 * La sombra va literal: `@theme inline` incrusta `--shadow-pop` en la utilidad
 * `shadow-pop` y no lo publica como custom property en tiempo de ejecucion, asi
 * que `var(--shadow-pop)` en un `style` saldria vacio.
 */
export const CHART_TOOLTIP_STYLE = {
  backgroundColor: 'var(--popover)',
  color: 'var(--popover-foreground)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  boxShadow:
    '0 10px 30px -8px oklch(0.21 0.04 265 / 0.18), 0 2px 8px -2px oklch(0.21 0.04 265 / 0.08)',
  fontSize: 13,
  padding: '8px 10px',
} as const;

/** Recharts asigna colores propios a las etiquetas; se fuerzan al tema para
 * que el contenido siga siendo legible sobre el popover en modo oscuro. */
export const CHART_TOOLTIP_LABEL_STYLE = { color: 'var(--popover-foreground)' } as const;
export const CHART_TOOLTIP_ITEM_STYLE = { color: 'var(--popover-foreground)' } as const;

export const CHART_AXIS_TICK = { fontSize: 11, fill: 'var(--muted-foreground)' } as const;

export const CHART_LEGEND_STYLE = { fontSize: 12, paddingTop: 8 } as const;

/** Los mismos estilos, encogidos para la hoja. */
const PRINT_AXIS_TICK = { fontSize: 8, fill: 'var(--muted-foreground)' } as const;

const PRINT_LEGEND_STYLE = { fontSize: 8, paddingTop: 4 } as const;

/**
 * Estilos de grafica que saben si se esta imprimiendo.
 *
 * En papel la grafica pasa de ~1400px a 672px de ancho, asi que doce meses de
 * eje X tienen la mitad de sitio y las etiquetas de 11px se pisan unas a otras.
 *
 * Tiene que ir por **props**, no por CSS: recharts decide donde colocar cada
 * marca y cuales dibujar midiendo el texto con el tamaño que recibe aqui. Si se
 * encoge solo en el pintado —con un `font-size` en `@media print`—, el dibujo
 * sale pequeño pero colocado segun las medidas de 11px, que es exactamente como
 * las etiquetas acababan fuera de su sitio bajo las barras.
 */
export function useChartStyles(): {
  axisTick: typeof CHART_AXIS_TICK | typeof PRINT_AXIS_TICK;
  legendStyle: typeof CHART_LEGEND_STYLE | typeof PRINT_LEGEND_STYLE;
  /**
   * En papel, **nunca**.
   *
   * Recharts dibuja las barras y las lineas fotograma a fotograma: al empezar,
   * los `<g>` de cada barra estan vacios, sin un solo `<path>` dentro. Al
   * imprimir, el cambio de tamaño relanza esa animacion y el navegador captura
   * la pagina de inmediato, asi que se lleva el fotograma cero y la grafica sale
   * en blanco. Una hoja de papel no se anima: se dibuja entera de una vez.
   */
  isAnimationActive: boolean;
} {
  const printing = usePrintMode();

  return printing
    ? { axisTick: PRINT_AXIS_TICK, legendStyle: PRINT_LEGEND_STYLE, isAnimationActive: false }
    : { axisTick: CHART_AXIS_TICK, legendStyle: CHART_LEGEND_STYLE, isAnimationActive: true };
}

export const CHART_GRID = {
  strokeDasharray: '3 3',
  stroke: 'var(--border)',
  vertical: false,
} as const;

/** Rampa coherente, no arcoiris. Sigue el orden de `--chart-*` del tema. */
export const CHART_SERIES = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
] as const;

/** Color estable para una serie por indice, dando la vuelta si hay muchas. */
export function seriesColor(index: number): string {
  return CHART_SERIES[index % CHART_SERIES.length];
}
