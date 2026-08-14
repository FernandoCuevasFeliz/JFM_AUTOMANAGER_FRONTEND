/**
 * Color personal de cada usuario.
 *
 * Sirve para saber de un vistazo con que sesion estas trabajando, que en un
 * panel compartido entre cuatro roles es un error facil de cometer y caro de
 * deshacer.
 *
 * Es una paleta cerrada, no un hue calculado del hash: ocho tonos elegidos a
 * mano con la misma luminosidad y saturacion, para que se distingan entre si y
 * ninguno desentone con el grafito del sistema. Un tono libre acabaria dando
 * fucsias fluorescentes o marrones apagados segun el id que tocara.
 *
 * **No hay rojo**: en este sistema el rojo significa marca y peligro, y un
 * usuario cuyo color fuera rojo veria alertas donde no las hay.
 */

export interface UserAccent {
  /** Relleno solido. Pasa AA con texto blanco encima. */
  readonly color: string;
  /** Version tenue para fondos y filetes. */
  readonly soft: string;
  readonly name: string;
}

const PALETTE: readonly UserAccent[] = [
  { name: 'Indigo', color: 'oklch(0.45 0.16 268)', soft: 'oklch(0.45 0.16 268 / 0.12)' },
  { name: 'Turquesa', color: 'oklch(0.45 0.11 195)', soft: 'oklch(0.45 0.11 195 / 0.12)' },
  { name: 'Esmeralda', color: 'oklch(0.45 0.12 160)', soft: 'oklch(0.45 0.12 160 / 0.12)' },
  { name: 'Ocre', color: 'oklch(0.48 0.13 75)', soft: 'oklch(0.48 0.13 75 / 0.12)' },
  { name: 'Terracota', color: 'oklch(0.48 0.14 40)', soft: 'oklch(0.48 0.14 40 / 0.12)' },
  { name: 'Violeta', color: 'oklch(0.45 0.16 305)', soft: 'oklch(0.45 0.16 305 / 0.12)' },
  { name: 'Magenta', color: 'oklch(0.45 0.16 350)', soft: 'oklch(0.45 0.16 350 / 0.12)' },
  { name: 'Acero', color: 'oklch(0.45 0.10 240)', soft: 'oklch(0.45 0.10 240 / 0.12)' },
];

/**
 * Hash estable de una cadena (djb2).
 *
 * Tiene que ser determinista entre recargas y entre navegadores: el color de un
 * usuario no puede cambiar de un dia para otro, o deja de servir como señal.
 */
function hash(value: string): number {
  let result = 5381;
  for (let index = 0; index < value.length; index += 1) {
    result = ((result << 5) + result + value.charCodeAt(index)) | 0;
  }
  return Math.abs(result);
}

export function userAccent(userId: string | null | undefined): UserAccent {
  if (!userId) return PALETTE[0];
  return PALETTE[hash(userId) % PALETTE.length];
}

/** Variables para pintar el acento en un subarbol con `style`. */
export function userAccentStyle(userId: string | null | undefined): React.CSSProperties {
  const accent = userAccent(userId);
  return {
    '--user-accent': accent.color,
    '--user-accent-soft': accent.soft,
  } as React.CSSProperties;
}

/*
 * ---------------------------------------------------------------------------
 * Color por ROL
 * ---------------------------------------------------------------------------
 *
 * Distinto proposito que el color por usuario: aquel dice "quien eres", este
 * dice "con que permisos estas trabajando". Va en el sidebar porque es lo que
 * se ve desde cualquier pantalla, y porque confundir una sesion de admin con
 * una de ventas es el error que mas caro sale.
 *
 * El sidebar sigue siendo grafito oscuro en todos los roles: solo se le desvia
 * el tono. Un sidebar verde brillante romperia el sistema; uno grafito con
 * matiz verde se distingue igual y no compite con el contenido.
 */

export interface RoleAccent {
  /** Fondo del sidebar: grafito con el matiz del rol. */
  readonly surface: string;
  /** Superficie del item activo y del hover. */
  readonly surfaceAccent: string;
  /** Riel del item activo y marca. Pasa AA con blanco encima. */
  readonly rail: string;
  readonly label: string;
}

const ROLE_ACCENTS: Record<string, RoleAccent> = {
  admin: {
    surface: 'oklch(0.205 0.035 288)',
    surfaceAccent: 'oklch(0.285 0.045 288)',
    rail: 'oklch(0.62 0.18 300)',
    label: 'Administracion',
  },
  ventas: {
    surface: 'oklch(0.205 0.032 168)',
    surfaceAccent: 'oklch(0.285 0.042 168)',
    rail: 'oklch(0.62 0.14 165)',
    label: 'Ventas',
  },
  inventario: {
    surface: 'oklch(0.205 0.030 70)',
    surfaceAccent: 'oklch(0.285 0.040 70)',
    rail: 'oklch(0.68 0.15 72)',
    label: 'Inventario',
  },
  contabilidad: {
    surface: 'oklch(0.205 0.032 245)',
    surfaceAccent: 'oklch(0.285 0.042 245)',
    rail: 'oklch(0.64 0.15 248)',
    label: 'Contabilidad',
  },
};

/** Grafito neutro: el de siempre, para cualquier rol que no este en el mapa. */
const DEFAULT_ROLE_ACCENT: RoleAccent = {
  surface: 'oklch(0.208 0.03 264)',
  surfaceAccent: 'oklch(0.285 0.032 262)',
  rail: 'oklch(0.577 0.245 27.3)',
  label: 'Panel',
};

export function roleAccent(roleName: string | null | undefined): RoleAccent {
  if (!roleName) return DEFAULT_ROLE_ACCENT;
  return ROLE_ACCENTS[roleName.trim().toLowerCase()] ?? DEFAULT_ROLE_ACCENT;
}

/** Variables del sidebar para el rol activo. */
export function roleAccentStyle(roleName: string | null | undefined): React.CSSProperties {
  const accent = roleAccent(roleName);
  return {
    '--sidebar': accent.surface,
    '--sidebar-accent': accent.surfaceAccent,
    '--role-rail': accent.rail,
  } as React.CSSProperties;
}
