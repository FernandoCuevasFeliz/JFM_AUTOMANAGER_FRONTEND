# JFM AutoManager — Frontend

Panel administrativo de **EJGH AUTO IMPORT SRL**: inventario de vehiculos importados, costos por
unidad y ciclo comercial completo (cotizacion → reserva → venta → cobros).

Es una SPA de React que consume la API REST documentada en
[`../BACKEND/API.md`](../BACKEND/API.md). Al ser un panel interno detras de login, sin necesidad de
SEO ni de render en servidor, se eligio **React + Vite** en lugar de Next.js.

---

## Indice

1. [Requisitos](#requisitos)
2. [Instalacion](#instalacion)
3. [Variables de entorno](#variables-de-entorno)
4. [Scripts](#scripts)
5. [Docker](#docker)
6. [Stack](#stack)
7. [Arquitectura](#arquitectura)
8. [Autenticacion y sesion](#autenticacion-y-sesion)
9. [Permisos en la interfaz](#permisos-en-la-interfaz)
10. [Reglas de negocio que la UI anticipa](#reglas-de-negocio-que-la-ui-anticipa)
11. [Manejo de errores](#manejo-de-errores)
12. [Subida de imagenes con ImageKit](#subida-de-imagenes-con-imagekit)
13. [Limitaciones conocidas](#limitaciones-conocidas)

---

## Requisitos

- **Node.js 20 o superior** (probado con Node 25)
- El backend corriendo y accesible (por defecto `http://localhost:3000/api/v1`)

---

## Instalacion

```bash
npm install
```

Copia el archivo de ejemplo y ajusta los valores:

```bash
cp .env.example .env
```

Levanta el servidor de desarrollo:

```bash
npm run dev
```

La aplicacion queda en `http://localhost:5173`.

> El backend debe permitir ese origen. En desarrollo `CORS_ORIGINS` viene en `*`; en produccion hay
> que listar el dominio del frontend explicitamente.

---

## Variables de entorno

Todas llevan el prefijo `VITE_` porque Vite solo expone al navegador las que lo tienen.

| Variable | Obligatoria | Descripcion |
|---|:--:|---|
| `VITE_API_URL` | si | URL base de la API, con el prefijo de version. Por defecto `http://localhost:3000/api/v1`. |
| `VITE_IMAGEKIT_PUBLIC_KEY` | no | Clave **publica** de ImageKit. Puede omitirse si el endpoint de firma ya la devuelve. |
| `VITE_IMAGEKIT_URL_ENDPOINT` | no | URL-endpoint de entrega de ImageKit (`https://ik.imagekit.io/tu_cuenta`). |
| `VITE_IMAGEKIT_AUTH_ENDPOINT` | no | Endpoint que **firma** las subidas. Ver [Subida de imagenes](#subida-de-imagenes-con-imagekit). |

Si las variables de ImageKit quedan vacias, la galeria de vehiculos sigue funcionando en modo
**"pegar URL"**: se registra la direccion de una imagen ya alojada. Nada mas se degrada.

> Nunca pongas la clave **privada** de ImageKit en un `VITE_*`: Vite incrusta esas variables en el
> JavaScript que descarga el navegador, asi que quedaria publica. Va en el `.env` del backend.

---

## Scripts

| Comando | Que hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga en caliente. |
| `npm run build` | Verifica tipos (`tsc -b`) y compila a `dist/`. |
| `npm run preview` | Sirve `dist/` para revisar la build de produccion. |
| `npm run typecheck` | Solo la verificacion de tipos. |

---

## Docker

La imagen se construye en dos etapas: Node.js instala las dependencias y genera `dist/`; Nginx
sirve los archivos estaticos en produccion. La configuracion incluye fallback a `index.html` para
que las rutas de React Router funcionen al recargar la pagina y expone `GET /health` como chequeo
de salud.

Las variables `VITE_*` se incorporan al JavaScript durante la construccion de la imagen. Por eso,
si cambia alguna, hay que reconstruir la imagen. No se deben usar para secretos: todo valor
`VITE_*` es visible para el navegador.

Con Docker Compose, toma los valores del archivo `.env` existente:

```bash
docker compose up --build -d
```

La aplicacion queda disponible en `http://localhost:8080`. El puerto puede cambiarse sin editar el
archivo:

```bash
FRONTEND_PORT=8081 docker compose up --build -d
```

Tambien se puede construir y ejecutar directamente:

```bash
docker build \
  --build-arg VITE_API_URL=http://localhost:3000/api/v1 \
  -t jfm-automanager-frontend .

docker run --rm -p 8080:80 --name jfm-automanager-frontend jfm-automanager-frontend
```

Comandos de operacion:

```bash
docker compose ps
docker compose logs -f frontend
docker compose down
```

> `VITE_API_URL` es utilizada por el navegador, no por el contenedor. Debe ser una URL accesible
> desde la computadora del usuario; el nombre interno de otro servicio de Compose normalmente no
> sirve en este valor.

---

## Stack

| Area | Herramienta | Por que |
|---|---|---|
| Base | React 18 + Vite + TypeScript (strict) | SPA interna, arranque rapido. |
| Rutas | React Router | Rutas anidadas por modulo, guards por permiso. |
| Estado de servidor | TanStack Query | Cache, invalidacion y reintentos. No hay `useEffect` + `useState` para llamadas a la API. |
| Formularios | React Hook Form + Zod | Los esquemas son espejo de los del backend. |
| Estilos | Tailwind CSS v4 | Configuracion por CSS (`@theme`), sin `tailwind.config.js`. |
| Componentes | shadcn/ui (Radix + Tailwind) | Accesibilidad y consistencia sin reinventar cada primitivo. |
| Tablas | TanStack Table | Con la paginacion **real** del backend. |
| Graficas | Recharts | Solo se descarga en el tablero. |
| Iconos | lucide-react | |
| Avisos | sonner | |
| Imagenes | `@imagekit/react` | Subida desde el navegador. |

Los primitivos de `components/ui/` estan escritos directamente en el repositorio, que es como
funciona shadcn/ui: copia el codigo en tu proyecto en vez de instalarlo como dependencia.

---

## Arquitectura

```
src/
├── app/
│   ├── router.tsx          Rutas + carga perezosa por modulo
│   ├── guards.tsx          RequireAuth y RequirePermission
│   ├── providers.tsx       QueryClient, sesion, tooltips, toasts
│   └── layout/
│       ├── app-shell.tsx   Sidebar + topbar + <Outlet/>
│       └── sidebar-nav.ts  Navegacion, cada item con su permiso
│
├── lib/
│   ├── api-client.ts       fetch con Bearer + refresco single-flight
│   ├── api-error.ts        ApiError normalizado
│   ├── errors.ts           Mapa de error.code → reaccion de UI
│   ├── dates.ts            Fechas civiles como string
│   ├── money.ts            Montos y tasas de cambio
│   ├── status.ts           Maquinas de estado: etiquetas, colores, transiciones
│   ├── zod-helpers.ts      Piezas de esquema compartidas + diff para PATCH
│   ├── query-client.ts     Configuracion y claves de cache
│   └── use-list-params.ts  Filtros + paginacion de un listado
│
├── features/               Un folder por modulo, mismo patron en todos
│   ├── auth/  catalogs/  vehicles/  clients/  suppliers/
│   ├── purchases/  expenses/  quotations/  reservations/
│   └── sales/  users/  dashboard/
│
└── components/             Compartidos: ui/ (primitivos), data-table,
                            form-field, states, confirm-dialog, filter-bar
```

Cada `features/<modulo>` es autocontenido:

```
api.ts        Llamadas tipadas a los endpoints del modulo
hooks.ts      Hooks de TanStack Query (queries y mutaciones)
schemas.ts    Zod, espejo de lo que exige el backend
types.ts      Formas de las respuestas
components/   Formularios, tablas y badges del modulo
pages/        Pantallas enrutadas
```

No hay un `api.ts` gigante compartido. Lo unico transversal es el cliente HTTP.

**El modulo de referencia es `vehicles`**: tiene tabla paginada y filtrada contra el servidor,
formulario con validacion inline, selects en cascada (marca → modelo), subida de imagenes y cambio
de estado con transiciones filtradas. El resto de modulos replican ese patron.

---

## Autenticacion y sesion

Implementa al pie de la letra lo que describe §2 de `API.md`.

- Los tokens se guardan en `localStorage`, aislado en `lib/token-storage.ts` para poder cambiarlo
  (a `sessionStorage`, o a memoria + cookie `httpOnly` con un BFF propio) sin tocar el resto.
- **Al arrancar la app se llama a `POST /auth/refresh`, no a `/auth/me`**: el refresco devuelve
  tokens nuevos, el usuario **y** el array de permisos en una sola llamada.
- Ante un `401`, el cliente HTTP intenta **un unico** refresco compartido entre todas las peticiones
  que fallaron a la vez (`lib/api-client.ts`, `refreshInFlight`). Es imprescindible: si cinco
  peticiones refrescaran a la vez, la primera rotaria el token y las otras cuatro lo presentarian ya
  usado; el backend lo leeria como robo y cerraria todas las sesiones.
- `/auth/refresh` nunca se reintenta. Si falla, es sesion terminada: se limpia y se va a `/login`.
- Tras `change-password` o `logout-all` se limpia la sesion y se vuelve al login, porque el backend
  revoca todos los refresh tokens.
- `GET /catalogs` se pide **una vez** tras autenticar y se cachea con `staleTime: Infinity`. Ningun
  formulario lo vuelve a pedir.

---

## Permisos en la interfaz

El contexto de sesion expone `can(permission)`, que lee el array `permissions` que devuelve el login
o el refresco.

```tsx
const { can } = useAuth();

{can('vehicles:write') && <Button>Nuevo vehiculo</Button>}
```

**En ningun punto del cliente se compara contra el nombre del rol.** Si manana cambia el mapa de
permisos del backend, la interfaz se ajusta sola.

Se filtran por permiso los items del sidebar, los botones de accion, las columnas de acciones de las
tablas y las rutas (`RequirePermission`). Aun asi, toda mutacion contempla un `403 FORBIDDEN`: los
permisos pueden haber cambiado y la sesion todavia no haberse refrescado.

---

## Reglas de negocio que la UI anticipa

Replicadas de §6 y §7 de `API.md`. El backend sigue siendo la autoridad: esto solo evita ofrecer
acciones que se sabe que van a fallar.

| Regla | Donde vive |
|---|---|
| El selector de estado de vehiculo ofrece **solo** transiciones validas desde el estado actual, y nunca `reserved` ni `sold` | `lib/status.ts` → `assignableVehicleStatuses()` |
| El formulario de cliente cambia sus campos obligatorios segun `clientType` | `features/clients/schemas.ts` + `client-form-dialog.tsx` |
| El `scope` de la categoria decide si el gasto muestra el selector de vehiculo o envia `null` | `features/expenses/components/expense-form-dialog.tsx` |
| Si la moneda es DOP se fija `exchangeRate: 1` y se deshabilita el campo | Formularios de compra, venta y gasto |
| El `currencyId` de un cobro queda fijo al de la venta | `features/sales/components/payment-dialog.tsx` |
| Los selectores de vehiculo filtran por estado segun la operacion (cotizar / reservar / vender) | `VehiclePicker` + constantes de `lib/status.ts` |
| Que se puede editar y que bloquea el borrado | `isPurchaseEditable`, `isQuotationDeletable`, `isSaleDeletable`, … en `lib/status.ts` |
| Los numeros de documento no se piden en el formulario | Unica excepcion: `purchaseNumber`, opcional |
| Completar una venta solo se ofrece si el saldo es cero | `canCompleteSale(status, fullyPaid)` |

Las **fechas civiles** (`purchaseDate`, `validUntil`, `expirationDate`…) se tratan siempre como
string. `lib/dates.ts` las formatea manipulando texto; jamas se hace `new Date(fechaCivil)` para
mostrarlas, porque en Republica Dominicana (UTC-4) eso las correria un dia hacia atras. La unica
aritmetica de fechas se hace en UTC, que es simetrica y no puede desplazar el dia.

Los `PATCH` envian **solo lo que cambio** (`diffPayload` en `lib/zod-helpers.ts`): la API distingue
campo ausente (no se toca) de `null` (se borra), y un cuerpo vacio devuelve 400.

---

## Manejo de errores

Todo el mapeo vive en **un unico sitio**, `lib/errors.ts`, y lo consumen todos los modulos:

| `error.code` | Reaccion |
|---|---|
| `VALIDATION_ERROR` | Se pinta campo a campo desde `details[]`, quitando el prefijo `body.` / `query.` / `params.` |
| `CONFLICT` | Se marca como duplicado el campo que indica `details.field` |
| `FORBIDDEN` | Aviso sugiriendo volver a iniciar sesion |
| `BUSINESS_RULE_VIOLATION` | Se muestra el `message` del backend, que suele explicar que hacer |
| `INVALID_REFERENCE` | Aviso + sugerencia de recargar los catalogos |
| `NOT_FOUND` / `INTERNAL_ERROR` | Aviso con el mensaje del servidor |
| `UNAUTHORIZED` | Lo resuelve antes el interceptor: refresca o cierra la sesion |

`handleFormError()` combina las dos rutas: intenta pintar el error en el campo correspondiente y,
si no hay campo al que atribuirlo, cae al toast. Ningun componente repite el `switch`.

---

## Subida de imagenes con ImageKit

El backend **no recibe archivos**: solo guarda la URL en `vehicle_images.url` (§5.4 de `API.md`). El
archivo se sube desde el navegador a ImageKit y aqui se registra la URL resultante.

Esa subida directa exige `signature`, `token` y `expire` calculados con la clave **privada** de
ImageKit, que no puede viajar al navegador. De eso se encarga `GET /uploads/imagekit-auth` en el
backend (§5.12 de `API.md`), protegido con `vehicles:write`.

### Puesta en marcha

1. En el `.env` del **backend**, con las claves del panel de ImageKit
   (*Developer options → API keys*):

   ```bash
   IMAGEKIT_PRIVATE_KEY=private_xxxxxxxxxxxxxxxxxxxx
   IMAGEKIT_PUBLIC_KEY=public_xxxxxxxxxxxxxxxxxxxxxx
   ```

2. En el `.env` de **este** proyecto:

   ```bash
   VITE_IMAGEKIT_AUTH_ENDPOINT=/uploads/imagekit-auth
   VITE_IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/tu_cuenta
   ```

Con eso el boton "Subir imagenes" queda activo.

### Las dos formas del endpoint

`VITE_IMAGEKIT_AUTH_ENDPOINT` admite dos valores y el uploader los distingue solo:

- **Empieza por `/`** → ruta del backend de JFM. Se pide con el cliente HTTP, asi que lleva el
  `Bearer` y pasa por el interceptor de refresco. Es lo que necesita la ruta, que exige
  `vehicles:write`.
- **URL absoluta** → servicio externo (una funcion serverless propia). Se pide con un `fetch`
  normal, porque no comparte la sesion; protegerlo queda de tu lado.

Si la variable esta vacia, el uploader cae al modo **"pegar URL"**: se registra la direccion de una
imagen ya alojada y todo lo demas (portada, orden, borrado) funciona igual.

La firma se pide **justo antes de cada subida** y nunca se guarda: es de un solo uso y caduca a los
40 minutos.

---

## Limitaciones conocidas

Son decisiones tomadas para **no inventar endpoints ni campos** que `API.md` no documenta.

1. **No hay ordenamiento por columna.** Ningun listado de la API acepta un parametro de orden. Como
   la paginacion es del servidor, ordenar solo la pagina visible daria un resultado enganoso, asi
   que las tablas no ofrecen esa accion. Si el backend anade `sortBy`/`sortDir`, basta con activarlo
   en `components/data-table.tsx`.

2. **La serie mensual del tablero se arma con varias llamadas.** No existe un endpoint de "ventas
   por periodo": los unicos reportes son `GET /vehicles/summary`, `GET /sales/summary` y
   `GET /expenses/vehicle-cost/:vehicleId`. La grafica pide `/sales/summary` una vez por mes usando
   los filtros `dateFrom`/`dateTo` que ese endpoint si documenta. Son 6 peticiones cacheadas por
   separado; si algun dia hay un endpoint agregado, solo cambia
   `features/dashboard/hooks.ts`.

3. **El vendedor de una venta.** `salespersonId` es obligatorio, pero el rol `ventas` no tiene
   `users:read` y por tanto no puede listar usuarios. La venta se asigna por defecto al usuario
   autenticado; quien si tenga `users:read` puede elegir a otro vendedor.

4. **Sin pantallas para `audit:read` ni para borrar reservas.** Son los dos permisos que `API.md`
   declara pero que todavia no tienen endpoint. Las reservas se cancelan, no se borran.

5. **Las compras no permiten editar sus items.** `PATCH /purchases/:id` solo acepta el encabezado, y
   unicamente mientras la compra esta `pending` o `in_transit`.
