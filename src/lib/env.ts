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
export const IMAGEKIT_AUTH_ENDPOINT: string = (
  import.meta.env.VITE_IMAGEKIT_AUTH_ENDPOINT ?? ''
).trim();

/**
 * La subida directa desde el navegador exige `signature`, `token` y `expire`
 * firmados con la clave privada de ImageKit, asi que necesita un endpoint
 * propio. Sin el, el uploader cae al modo "pegar URL".
 *
 * Basta con el endpoint de firma: la clave publica puede venir en su respuesta.
 */
export const IMAGEKIT_UPLOAD_ENABLED: boolean = IMAGEKIT_AUTH_ENDPOINT.length > 0;

/**
 * Un endpoint que empieza por `/` es una ruta del propio backend de JFM
 * (`/uploads/imagekit-auth`): se pide con el cliente HTTP para que lleve el
 * `Bearer` y pase por el interceptor de refresco. Cualquier otra cosa es un
 * servicio externo (una funcion serverless) y se pide con un `fetch` pelado.
 */
export const IMAGEKIT_AUTH_IS_INTERNAL: boolean = IMAGEKIT_AUTH_ENDPOINT.startsWith('/');
