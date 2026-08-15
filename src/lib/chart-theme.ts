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
  border: '1px solid var(--border)',
  borderRadius: 10,
  boxShadow:
    '0 10px 30px -8px oklch(0.21 0.04 265 / 0.18), 0 2px 8px -2px oklch(0.21 0.04 265 / 0.08)',
  fontSize: 13,
  padding: '8px 10px',
} as const;

export const CHART_AXIS_TICK = { fontSize: 11, fill: 'var(--muted-foreground)' } as const;

export const CHART_LEGEND_STYLE = { fontSize: 12, paddingTop: 8 } as const;

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
