/**
 * Configuracion que llega por variables de entorno de Vite.
 *
 * Se lee una sola vez y se normaliza aqui para que ningun modulo tenga que
 * tocar `import.meta.env` directamente.
 */

const rawApiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

/** URL base de la API, siempre sin barra final. */
export const API_URL: string = rawApiUrl.replace(/\/+$/, '');

export const IMAGEKIT_PUBLIC_KEY: string = import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY ?? '';
export const IMAGEKIT_URL_ENDPOINT: string = import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT ?? '';
export const IMAGEKIT_AUTH_ENDPOINT: string = import.meta.env.VITE_IMAGEKIT_AUTH_ENDPOINT ?? '';

/**
 * La subida directa desde el navegador exige `signature`, `token` y `expire`
 * firmados con la clave privada de ImageKit, asi que necesita un endpoint
 * propio. Sin el, el uploader cae al modo "pegar URL".
 */
export const IMAGEKIT_UPLOAD_ENABLED: boolean = Boolean(
  IMAGEKIT_PUBLIC_KEY && IMAGEKIT_AUTH_ENDPOINT,
);
