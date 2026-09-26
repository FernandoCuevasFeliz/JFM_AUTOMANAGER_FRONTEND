#!/usr/bin/env node
/**
 * Carga en el sistema los vehiculos de `vehicles.json`.
 *
 * Lo ejecutas tu, con tus credenciales: el script las lee de variables de
 * entorno y nunca las escribe en disco ni en el log.
 *
 *   JFM_EMAIL=… JFM_PASSWORD=… node scripts/seed/seed-vehicles.mjs           # simulacro
 *   JFM_EMAIL=… JFM_PASSWORD=… node scripts/seed/seed-vehicles.mjs --commit  # escribe
 *
 * Por defecto NO escribe nada: imprime lo que haria. Escribir en el inventario
 * de una empresa real no puede ser el comportamiento por omision de un script.
 *
 * Es idempotente: si ya existe un vehiculo con el mismo numero de chasis, lo
 * salta. Puedes volver a lanzarlo sin duplicar nada.
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));

const API_URL = (process.env.JFM_API_URL ?? 'https://jfm-automanager-backend.onrender.com/api/v1')
  .replace(/\/+$/, '');
const EMAIL = process.env.JFM_EMAIL;
const PASSWORD = process.env.JFM_PASSWORD;
const COMMIT = process.argv.includes('--commit');

const c = {
  reset: '\x1b[0m', dim: '\x1b[2m', bold: '\x1b[1m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m',
};
const log = (...a) => console.log(...a);
const fail = (message) => {
  console.error(`${c.red}✗ ${message}${c.reset}`);
  process.exit(1);
};

let token = null;

async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const detail = json?.error?.message ?? json?.message ?? text.slice(0, 200);
    throw new Error(`${method} ${path} → ${res.status}: ${detail}`);
  }
  return json?.data ?? json;
}

async function main() {
  if (!EMAIL || !PASSWORD) {
    fail(
      'Faltan credenciales.\n' +
        '  JFM_EMAIL=tu@correo JFM_PASSWORD=tu-clave node scripts/seed/seed-vehicles.mjs\n' +
        '  Necesitas un usuario con permisos vehicles:write y catalogs:write.',
    );
  }

  const raw = await readFile(join(HERE, 'vehicles.json'), 'utf8');
  const { vehiculos } = JSON.parse(raw);

  log(`${c.bold}JFM AutoManager · carga de vehiculos${c.reset}`);
  log(`${c.dim}API:${c.reset} ${API_URL}`);
  log(
    COMMIT
      ? `${c.yellow}Modo: ESCRITURA REAL${c.reset}`
      : `${c.blue}Modo: simulacro (anade --commit para escribir)${c.reset}`,
  );
  log('');

  // --- Sesion ---------------------------------------------------------------
  const session = await api('/auth/login', {
    method: 'POST',
    body: { email: EMAIL, password: PASSWORD },
  });
  token = session.accessToken ?? session.token;
  if (!token) fail('El login no devolvio accessToken.');
  log(`${c.green}✓${c.reset} Sesion iniciada como ${session.user?.email ?? EMAIL}`);

  // --- Catalogo de marcas y modelos ----------------------------------------
  // Se leen enteros una vez en vez de consultar por cada vehiculo: son catalogos
  // cortos y asi el script hace 2 peticiones en lugar de 18.
  const brands = await api('/vehicle-brands?includeInactive=true');
  const models = await api('/vehicle-models?includeInactive=true');

  const norm = (s) => s.trim().toLowerCase();
  const brandByName = new Map(brands.map((b) => [norm(b.name), b]));
  const modelKey = (brandId, name) => `${brandId}::${norm(name)}`;
  const modelByKey = new Map(models.map((m) => [modelKey(m.brandId, m.name), m]));

  async function ensureBrand(name) {
    const found = brandByName.get(norm(name));
    if (found) return found;

    log(`  ${c.yellow}+${c.reset} marca nueva: ${name}`);
    if (!COMMIT) return { id: `(nueva:${name})`, name };

    const created = await api('/vehicle-brands', { method: 'POST', body: { name } });
    brandByName.set(norm(name), created);
    return created;
  }

  async function ensureModel(brand, name) {
    const found = modelByKey.get(modelKey(brand.id, name));
    if (found) return found;

    log(`  ${c.yellow}+${c.reset} modelo nuevo: ${brand.name} ${name}`);
    if (!COMMIT) return { id: `(nuevo:${name})`, name };

    const created = await api('/vehicle-models', {
      method: 'POST',
      body: { brandId: brand.id, name },
    });
    modelByKey.set(modelKey(brand.id, name), created);
    return created;
  }

  // --- Chasis ya cargados ---------------------------------------------------
  const existing = new Set();
  let page = 1;
  for (;;) {
    const res = await api(`/vehicles?page=${page}&pageSize=100`);
    const rows = Array.isArray(res) ? res : (res.items ?? res.data ?? []);
    rows.forEach((v) => existing.add(norm(v.chassisNumber ?? '')));
    if (rows.length < 100) break;
    page += 1;
  }
  log(`${c.green}✓${c.reset} ${existing.size} vehiculos ya en el sistema`);
  log('');

  // --- Carga ----------------------------------------------------------------
  let creados = 0;
  let saltados = 0;
  const errores = [];

  for (const v of vehiculos) {
    const etiqueta = `${v.brand} ${v.model} ${v.year}`;

    if (existing.has(norm(v.chassisNumber))) {
      log(`${c.dim}=${c.reset} ${etiqueta} ${c.dim}(chasis ${v.chassisNumber} ya existe)${c.reset}`);
      saltados += 1;
      continue;
    }

    try {
      const brand = await ensureBrand(v.brand);
      const model = await ensureModel(brand, v.model);

      const payload = {
        brandId: brand.id,
        modelId: model.id,
        year: v.year,
        chassisNumber: v.chassisNumber,
        color: v.color,
        mileage: v.mileage,
        engineNumber: v.engineNumber,
        transmissionType: v.transmissionType,
        fuelType: v.fuelType,
        salePrice: v.salePrice,
        status: v.status,
        notes: v.notes,
        isActive: true,
      };

      if (COMMIT) {
        await api('/vehicles', { method: 'POST', body: payload });
      }

      const precio = new Intl.NumberFormat('es-DO').format(v.salePrice);
      log(`${c.green}✓${c.reset} ${etiqueta} ${c.dim}· ${v.chassisNumber} · RD$ ${precio}${c.reset}`);
      creados += 1;
    } catch (error) {
      log(`${c.red}✗${c.reset} ${etiqueta}: ${error.message}`);
      errores.push(etiqueta);
    }
  }

  // --- Resumen --------------------------------------------------------------
  log('');
  log(`${c.bold}Resumen${c.reset}`);
  log(`  ${COMMIT ? 'Creados' : 'Se crearian'}: ${creados}`);
  log(`  Saltados (ya existian): ${saltados}`);
  if (errores.length) log(`  ${c.red}Con error: ${errores.length} → ${errores.join(', ')}${c.reset}`);

  if (!COMMIT && creados > 0) {
    log('');
    log(`${c.blue}Nada se escribio. Repite con --commit para aplicarlo.${c.reset}`);
  }

  if (COMMIT && creados > 0) {
    log('');
    log(`${c.yellow}Recuerda:${c.reset} los chasis van con prefijo DEMO- y los precios son`);
    log('estimados. Corrigelos en el sistema antes de operar con estos registros.');
  }

  if (errores.length) process.exit(1);
}

main().catch((error) => fail(error.message));
