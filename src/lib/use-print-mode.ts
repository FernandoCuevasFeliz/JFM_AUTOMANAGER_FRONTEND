import * as React from 'react';
import { flushSync } from 'react-dom';

/**
 * ¿Se esta imprimiendo ahora mismo?
 *
 * Existe por un problema muy concreto: `ResponsiveContainer` de recharts mide su
 * contenedor con un `ResizeObserver` y guarda el resultado en estado de React.
 * Al imprimir, el ancho pasa de ~1400px a ~700px, el observer dispara y React
 * **programa** un re-render… que llega tarde: el navegador ya tomo la
 * instantanea de la pagina. Por eso las graficas salian con el ancho de pantalla
 * dentro de una hoja mas estrecha, cortadas y deformadas.
 *
 * `flushSync` fuerza a React a renderizar y confirmar de forma sincrona dentro
 * del propio `beforeprint`, antes de que el navegador capture. Es el unico punto
 * donde se puede corregir: ningun CSS puede cambiar un tamaño que vive en el
 * estado de un componente.
 */
export function usePrintMode(): boolean {
  const [printing, setPrinting] = React.useState(false);

  React.useEffect(() => {
    const antes = () => {
      // Sincrono a proposito: si React lo difiere, no sirve de nada.
      flushSync(() => setPrinting(true));
    };
    const despues = () => setPrinting(false);

    window.addEventListener('beforeprint', antes);
    window.addEventListener('afterprint', despues);

    /*
     * Safari no dispara `beforeprint`: usa el cambio de media query. Se escuchan
     * las dos vias porque son excluyentes en la practica y activar dos veces el
     * mismo estado no hace daño.
     */
    const media = window.matchMedia('print');
    const alCambiar = (event: MediaQueryListEvent) => {
      if (event.matches) antes();
      else despues();
    };
    media.addEventListener('change', alCambiar);

    return () => {
      window.removeEventListener('beforeprint', antes);
      window.removeEventListener('afterprint', despues);
      media.removeEventListener('change', alCambiar);
    };
  }, []);

  return printing;
}

/**
 * Ancho util de una A4 vertical con los margenes de `@page` (12mm), menos el
 * borde y el relleno de la tarjeta que envuelve cada grafica.
 *
 *   210mm - 24mm = 186mm ≈ 703px a 96dpi
 *   703 - 2px de borde - 40px de relleno ≈ 660px
 *
 * Se deja algo de holgura para que un redondeo no provoque una segunda hoja.
 */
export const PRINT_CHART_WIDTH = 640;
