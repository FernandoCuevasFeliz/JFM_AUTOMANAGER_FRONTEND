/**
 * Datos del emisor y reglas fiscales de la factura.
 *
 * El NCF y el estado fiscal los gobierna el backend (§5.12 de API.md). Lo que
 * queda aqui es lo que la API no modela: la identidad del emisor y el desglose
 * de impuesto del papel. Viaja por variables de entorno para que el RNC, la
 * direccion o la tasa cambien sin tocar codigo.
 */

function env(key: string, fallback = ''): string {
  const value = import.meta.env[key as keyof ImportMetaEnv];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

export interface CompanyProfile {
  readonly name: string;
  readonly rnc: string;
  readonly address: string;
  readonly city: string;
  readonly phone: string;
  readonly email: string;
  readonly website: string;
}

export const COMPANY: CompanyProfile = {
  name: env('VITE_COMPANY_NAME', 'EJGH AUTO IMPORT SRL'),
  rnc: env('VITE_COMPANY_RNC'),
  address: env('VITE_COMPANY_ADDRESS'),
  city: env('VITE_COMPANY_CITY', 'Republica Dominicana'),
  phone: env('VITE_COMPANY_PHONE'),
  email: env('VITE_COMPANY_EMAIL'),
  website: env('VITE_COMPANY_WEBSITE'),
};

/**
 * Tasa de impuesto, en tanto por uno (`0.18` = 18 %). En cero no se imprime la
 * linea de impuesto: es el valor por defecto porque la API guarda un precio de
 * venta cerrado, sin desglose fiscal, y desglosar un impuesto que nadie ha
 * declarado seria inventarse el dato.
 */
export const TAX_RATE: number = (() => {
  const parsed = Number(env('VITE_INVOICE_TAX_RATE', '0'));
  if (!Number.isFinite(parsed) || parsed < 0 || parsed >= 1) return 0;
  return parsed;
})();

export const TAX_LABEL: string = env('VITE_INVOICE_TAX_LABEL', 'ITBIS');

/**
 * `true` (por defecto): el `salePrice` de la venta ya incluye el impuesto y la
 * factura lo desglosa hacia atras. `false`: el impuesto se suma encima.
 *
 * El valor por defecto es "incluido" porque `salePrice` es el precio pactado
 * con el cliente; sumarle un 18 % por encima cambiaria lo que se cobra.
 */
export const TAX_INCLUDED: boolean = env('VITE_INVOICE_TAX_INCLUDED', 'true') !== 'false';

export const INVOICE_FOOTER_NOTE: string = env(
  'VITE_INVOICE_FOOTER_NOTE',
  'La unidad se entrega en el estado en que el comprador la ha inspeccionado y aceptado.',
);
