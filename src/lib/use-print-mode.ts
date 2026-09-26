import * as React from 'react';
import { flushSync } from 'react-dom';

/**
 * ¿Se esta imprimiendo ahora mismo?
 *
 * Existe por un problema muy concreto: al imprimir, el ancho disponible pasa de
 * ~1400px al de una hoja. Recharts no redibuja a tiempo, y entonces el `<svg>`
 * conserva su `width` viejo junto a su `viewBox` mientras la regla propia de la
 * libreria (`.recharts-surface { width: 100% }`) lo obliga a caber en la caja
 * nueva: el navegador **escala el dibujo entero** a un 48 %. El texto de los
 * ejes, calculado para 11px, se pinta a ~5px y sale ilegible y pegado a las
 * barras. No es que la etiqueta este mal colocada; es que la grafica entera va
 * encogida.
 *
 * El estado vive FUERA de React, en un store minimo, por una razon: asi
 * `imprimirPagina()` puede ponerlo en `true`, esperar a que el navegador pinte
 * y solo entonces abrir el dialogo. Con un `useState` por componente no habia
 * forma de coordinar eso desde el boton.
 */

let imprimiendo = false;
const oyentes = new Set<() => void>();

function fijar(valor: boolean): void {
  if (imprimiendo === valor) return;
  imprimiendo = valor;
  for (const avisar of oyentes) avisar();
}

function suscribir(alCambiar: () => void): () => void {
  oyentes.add(alCambiar);
  return () => {
    oyentes.delete(alCambiar);
  };
}

if (typeof window !== 'undefined') {
  /*
   * Red de seguridad para el Ctrl+P del navegador, que no pasa por el boton.
   * Sincrono a proposito: si React lo difiere, el navegador ya tomo la foto.
   */
  window.addEventListener('beforeprint', () => flushSync(() => fijar(true)));
  window.addEventListener('afterprint', () => fijar(false));

  /* Safari no dispara `beforeprint`: usa el cambio de media query. */
  const media = window.matchMedia('print');
  media.addEventListener('change', (evento) => {
    if (evento.matches) flushSync(() => fijar(true));
    else fijar(false);
  });
}

export function usePrintMode(): boolean {
  return React.useSyncExternalStore(
    suscribir,
    () => imprimiendo,
    () => false,
  );
}

/**
 * Imprime la pagina **despues** de haberla maquetado para papel.
 *
 * `window.print()` a secas abre el dialogo en el mismo tick: el navegador
 * captura la pagina y solo entonces empieza la cadena `beforeprint` → estado →
 * re-render → nuevo tamaño de grafica. Es una carrera, y cuando se pierde salen
 * las graficas escaladas.
 *
 * Aqui se invierte el orden: primero el estado, luego dos fotogramas para que
 * React confirme y el navegador aplique el nuevo tamaño, y al final el dialogo.
 * `afterprint` devuelve la pantalla a su sitio.
 */
export function imprimirPagina(): void {
  flushSync(() => fijar(true));

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      try {
        window.print();
      } finally {
        /*
         * Vuelta obligatoria a la pantalla.
         *
         * El estado es global —tiene que serlo para poder coordinarlo desde el
         * boton—, asi que si `afterprint` no llegase a dispararse se quedaria
         * pegado en `true` y TODA la aplicacion seguiria maquetada para papel.
         * `window.print()` bloquea hasta que se cierra el dialogo en los
         * navegadores de escritorio, de modo que para cuando corre esto ya se
         * imprimio. Si `afterprint` si llego, `fijar` no hace nada.
         */
        setTimeout(() => fijar(false), 0);
      }
    });
  });
}

/**
 * Ancho util de una hoja CARTA vertical con los margenes de `@page` (12mm),
 * menos el borde y el relleno de la tarjeta que envuelve cada grafica.
 *
 *   215.9mm - 24mm = 191.9mm ≈ 725px a 96dpi
 *   725 - 2px de borde - 24px de relleno (`print:px-3`) ≈ 699px
 *
 * Se deja holgura para que un redondeo no empuje la grafica a otra hoja.
 */
export const PRINT_CHART_WIDTH = 672;
