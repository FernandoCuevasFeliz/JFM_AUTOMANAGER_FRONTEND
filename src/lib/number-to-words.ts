/**
 * Importes en letras para los documentos impresos.
 *
 * En Republica Dominicana el monto escrito manda sobre el escrito en cifras
 * cuando los dos no coinciden, asi que esto no es un adorno: es la version
 * legalmente vinculante del total.
 *
 * Convencion de centavos: `00/100`, la misma que usan los cheques.
 */

const UNDER_THIRTY = [
  'cero',
  'uno',
  'dos',
  'tres',
  'cuatro',
  'cinco',
  'seis',
  'siete',
  'ocho',
  'nueve',
  'diez',
  'once',
  'doce',
  'trece',
  'catorce',
  'quince',
  'dieciseis',
  'diecisiete',
  'dieciocho',
  'diecinueve',
  'veinte',
  'veintiuno',
  'veintidos',
  'veintitres',
  'veinticuatro',
  'veinticinco',
  'veintiseis',
  'veintisiete',
  'veintiocho',
  'veintinueve',
] as const;

const TENS = [
  '',
  '',
  'veinte',
  'treinta',
  'cuarenta',
  'cincuenta',
  'sesenta',
  'setenta',
  'ochenta',
  'noventa',
] as const;

const HUNDREDS = [
  '',
  'ciento',
  'doscientos',
  'trescientos',
  'cuatrocientos',
  'quinientos',
  'seiscientos',
  'setecientos',
  'ochocientos',
  'novecientos',
] as const;

/**
 * `apocope` produce la forma corta que exige un sustantivo detras: "un peso",
 * "veintiun pesos", "treinta y un pesos" — nunca "uno pesos".
 */
function underHundred(value: number, apocope: boolean): string {
  if (value < 30) {
    if (value === 1) return apocope ? 'un' : 'uno';
    if (value === 21) return apocope ? 'veintiun' : 'veintiuno';
    return UNDER_THIRTY[value];
  }

  const ten = Math.floor(value / 10);
  const unit = value % 10;
  if (unit === 0) return TENS[ten];

  const unitWord = unit === 1 ? (apocope ? 'un' : 'uno') : UNDER_THIRTY[unit];
  return `${TENS[ten]} y ${unitWord}`;
}

function underThousand(value: number, apocope: boolean): string {
  if (value === 0) return '';
  // "cien" solo cuando esta solo; con resto es "ciento uno".
  if (value === 100) return 'cien';

  const hundred = Math.floor(value / 100);
  const rest = value % 100;

  const words: string[] = [];
  if (hundred > 0) words.push(HUNDREDS[hundred]);
  if (rest > 0) words.push(underHundred(rest, apocope));
  return words.join(' ');
}

function underMillion(value: number, apocope: boolean): string {
  const thousands = Math.floor(value / 1000);
  const rest = value % 1000;

  const words: string[] = [];
  if (thousands === 1) {
    // "mil", nunca "un mil".
    words.push('mil');
  } else if (thousands > 1) {
    words.push(`${underThousand(thousands, true)} mil`);
  }
  if (rest > 0) words.push(underThousand(rest, apocope));

  return words.join(' ');
}

/** Entero a palabras. Cubre hasta billones, de sobra para un vehiculo. */
export function integerToWords(value: number, apocope = true): string {
  const whole = Math.floor(Math.abs(value));
  if (whole === 0) return 'cero';

  const millions = Math.floor(whole / 1_000_000);
  const rest = whole % 1_000_000;

  const words: string[] = [];
  if (millions === 1) {
    words.push('un millon');
  } else if (millions > 1) {
    words.push(`${underMillion(millions, true)} millones`);
  }
  if (rest > 0) words.push(underMillion(rest, apocope));

  return words.join(' ');
}

const CURRENCY_NAMES: Record<string, { one: string; many: string }> = {
  DOP: { one: 'peso dominicano', many: 'pesos dominicanos' },
  USD: { one: 'dolar estadounidense', many: 'dolares estadounidenses' },
  EUR: { one: 'euro', many: 'euros' },
};

/**
 * `1800000.50` + `DOP` → `UN MILLON OCHOCIENTOS MIL PESOS DOMINICANOS CON 50/100`.
 *
 * Va en mayusculas porque asi se imprime en el documento y porque evita que un
 * cero inicial se confunda con una letra.
 */
export function moneyToWords(amount: number, currencyCode: string): string {
  const safe = Number.isFinite(amount) ? Math.abs(amount) : 0;

  // Redondeo antes de partir: 1799999.999 debe leerse como 1800000.00, no como
  // "mil setecientos noventa y nueve mil novecientos noventa y nueve con 100/100".
  const totalCents = Math.round(safe * 100);
  const whole = Math.floor(totalCents / 100);
  const cents = totalCents % 100;

  // Una moneda desconocida se nombra por su codigo; sin el fallback, un
  // `currencyCode` vacio imprimia "CERO UNDEFINED" en el importe en letras.
  const fallback = currencyCode?.trim() || 'unidades';
  const names = CURRENCY_NAMES[currencyCode] ?? { one: fallback, many: fallback };
  const unit = whole === 1 ? names.one : names.many;

  /*
   * "un millon DE pesos", pero "un millon ochocientos mil pesos".
   *
   * El "de" solo aparece cuando la cifra **termina** en millon o millones, es
   * decir cuando no queda resto por debajo del millon. Con resto, la preposicion
   * sobra: nadie dice "un millon un DE pesos".
   */
  const endsInMillions = whole >= 1_000_000 && whole % 1_000_000 === 0;
  const connector = endsInMillions ? 'de ' : '';

  const phrase = `${integerToWords(whole)} ${connector}${unit} con ${String(cents).padStart(2, '0')}/100`;
  return phrase.toUpperCase();
}
