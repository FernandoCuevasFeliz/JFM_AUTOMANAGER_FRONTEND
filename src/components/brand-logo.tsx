import logoDark from '@/assets/ejgh-logo.png';
import logoLight from '@/assets/ejgh-logo-light.png';
import { cn } from '@/lib/utils';

/**
 * Logo de EJGH Auto Import.
 *
 * Dos archivos en vez de un filtro CSS: el logo es negro con acentos azules, y
 * cualquier inversion automatica volveria ese azul amarillo. La variante clara
 * se genero pixel a pixel —negro a blanco, azul a un azul que si se lee sobre
 * grafito— asi que ambas conservan la marca.
 *
 * Es apaisado (3:1). No existe version cuadrada porque el trazo del coche solo
 * mide 6:1 y en un cuadro pequeño no se reconoceria; donde no cabe el logo
 * completo se usa texto.
 */

/** Proporcion real del archivo, medida sobre el original. */
export const LOGO_ASPECT = 1600 / 527;

export function BrandLogo({
  variant = 'dark',
  className,
  /** Alto en px. El ancho sale de la proporcion, nunca se deforma. */
  height = 40,
  priority = false,
}: {
  /** `light` = tinta clara, para fondos oscuros. */
  variant?: 'dark' | 'light';
  className?: string;
  height?: number;
  /** El logo del login entra en el primer pintado: conviene no diferirlo. */
  priority?: boolean;
}) {
  return (
    <img
      src={variant === 'light' ? logoLight : logoDark}
      alt="EJGH Auto Import"
      // Ancho y alto explicitos reservan el hueco antes de que cargue, asi el
      // sidebar y la cabecera del impreso no dan un salto al aparecer.
      width={Math.round(height * LOGO_ASPECT)}
      height={height}
      /*
       * Ancho calculado, no `auto`.
       *
       * Dentro de un flex en columna el `align-items: stretch` por defecto
       * estira el elemento a lo ancho del contenedor, y `width: auto` no lo
       * impide: el logo salia deformado. Fijando el ancho a partir del alto y
       * la proporcion real, no depende de donde se coloque.
       *
       * `object-contain` cubre el caso extremo de un contenedor mas estrecho
       * que el logo: se encoge dentro de su caja en vez de aplastarse.
       */
      style={{ height, width: Math.round(height * LOGO_ASPECT), maxWidth: '100%' }}
      className={cn('block shrink-0 object-contain', className)}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      draggable={false}
    />
  );
}
