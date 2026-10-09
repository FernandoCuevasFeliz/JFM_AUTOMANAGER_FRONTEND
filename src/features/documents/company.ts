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

/** Identidad usada en cotizaciones, comprobantes internos y reportes impresos. */
export const COMPANY: CompanyProfile = {
  name: env('VITE_COMPANY_NAME', 'EJGH AUTO IMPORT SRL'),
  rnc: env('VITE_COMPANY_RNC'),
  address: env('VITE_COMPANY_ADDRESS'),
  city: env('VITE_COMPANY_CITY', 'Republica Dominicana'),
  phone: env('VITE_COMPANY_PHONE'),
  email: env('VITE_COMPANY_EMAIL'),
  website: env('VITE_COMPANY_WEBSITE'),
};

export const TAX_RATE: number = (() => {
  const parsed = Number(env('VITE_INVOICE_TAX_RATE', '0'));
  if (!Number.isFinite(parsed) || parsed < 0 || parsed >= 1) return 0;
  return parsed;
})();

export const TAX_LABEL: string = env('VITE_INVOICE_TAX_LABEL', 'ITBIS');
export const TAX_INCLUDED: boolean = env('VITE_INVOICE_TAX_INCLUDED', 'true') !== 'false';
