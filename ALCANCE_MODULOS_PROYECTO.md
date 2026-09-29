# Alcance y modulos del proyecto JFM AutoManager

## Vision general

JFM AutoManager es un sistema web administrativo para EJGH AUTO IMPORT SRL, orientado a controlar el inventario de vehiculos importados y el ciclo comercial de la empresa. El sistema cubre desde la gestion de unidades, proveedores y compras hasta clientes, cotizaciones, reservas, ventas, cobros, gastos, reportes, usuarios y catalogos operativos.

El proyecto esta dividido en dos aplicaciones principales:

- **Frontend:** panel web tipo SPA desarrollado con React, Vite y TypeScript.
- **Backend:** API REST desarrollada con Node.js, Express, TypeScript, PostgreSQL y Kysely.

> Nota: este documento excluye intencionalmente el modulo de facturacion, por solicitud del alcance.

## Alcance funcional

El sistema permite administrar las operaciones internas de una empresa dedicada a la importacion y venta de vehiculos. Su alcance principal incluye:

- Control del inventario de vehiculos y sus estados comerciales.
- Registro y seguimiento de compras de vehiculos a proveedores.
- Gestion de clientes y proveedores.
- Creacion y seguimiento de cotizaciones.
- Registro de reservas de vehiculos.
- Gestion de ventas, pagos, devoluciones y recibos.
- Registro de gastos generales y gastos asociados a vehiculos.
- Administracion de catalogos base del sistema.
- Gestion de usuarios, roles, permisos y sesiones.
- Consulta de tablero, indicadores y reportes administrativos.
- Manejo de imagenes de vehiculos mediante URL o subida integrada con ImageKit.
- Autenticacion segura mediante access token, refresh token y control de permisos.

## Frontend

El frontend es una aplicacion web de una sola pagina. Su responsabilidad es ofrecer la interfaz administrativa para operar los modulos del sistema, consumir la API REST del backend, validar formularios, mostrar datos paginados y aplicar controles de acceso segun los permisos del usuario autenticado.

### Stack del frontend

- **React 18:** construccion de la interfaz.
- **Vite:** servidor de desarrollo y empaquetado.
- **TypeScript:** tipado estricto.
- **React Router:** rutas protegidas y navegacion por modulo.
- **TanStack Query:** consultas, cache y mutaciones contra la API.
- **React Hook Form + Zod:** formularios y validaciones.
- **Tailwind CSS + shadcn/ui:** estilos y componentes reutilizables.
- **TanStack Table:** tablas paginadas y filtradas.
- **Recharts:** graficas del tablero y reportes.
- **lucide-react:** iconografia.
- **ImageKit:** soporte opcional para subida de imagenes.

### Estructura del frontend

La aplicacion se organiza por modulos dentro de `src/features`. Cada modulo mantiene sus propias llamadas a la API, tipos, esquemas de validacion, hooks, componentes y paginas.

Estructura general:

```text
src/
├── app/              Rutas, guards, providers y layout principal
├── components/       Componentes compartidos y primitivos de UI
├── features/         Modulos funcionales del sistema
└── lib/              Utilidades transversales, cliente HTTP y helpers
```

### Modulos del frontend

#### Autenticacion y cuenta

Permite iniciar sesion, cerrar sesion, refrescar la sesion, cambiar contrasena y consultar sesiones activas. La interfaz guarda los tokens mediante una capa aislada y maneja automaticamente el refresco ante respuestas no autorizadas.

#### Tablero

Presenta indicadores generales del negocio, resumen de inventario, ventas, gastos y comportamiento comercial. Funciona como vista inicial para usuarios con permisos de reportes.

#### Vehiculos

Gestiona el inventario de vehiculos. Incluye listado, creacion, edicion, detalle, cambio de estado, imagenes, seleccion de marca/modelo y control de disponibilidad. Maneja estados como en transito, en inventario, reservado, vendido, en reparacion o no disponible.

#### Clientes

Administra clientes individuales y empresariales. El formulario ajusta los campos requeridos segun el tipo de cliente, permitiendo mantener informacion comercial ordenada para cotizaciones, reservas y ventas.

#### Proveedores

Permite registrar y consultar proveedores relacionados con compras e importacion de vehiculos.

#### Compras

Gestiona compras de vehiculos. Incluye registro de compra, detalle, edicion permitida segun estado y seguimiento del proceso hasta que las unidades pasan al inventario.

#### Gastos

Permite registrar gastos generales o gastos vinculados a vehiculos especificos. Considera categorias, monedas, tasas de cambio y costos asociados para calcular rentabilidad.

#### Cotizaciones

Gestiona cotizaciones comerciales para clientes. Permite crear, consultar y cambiar estados segun las reglas del negocio.

#### Reservas

Permite reservar vehiculos disponibles para clientes, consultar el detalle de reservas, cancelarlas o manejar vencimientos segun las reglas del backend.

#### Ventas

Administra ventas de uno o varios vehiculos, pagos, devoluciones, recibos y estado de cierre. Controla reglas como completar una venta solo cuando el saldo este cubierto.

#### Reportes

Muestra reportes administrativos sobre inventario, ventas, gastos, rentabilidad y cuentas por cobrar, segun los permisos del usuario.

#### Catalogos

Permite consultar y administrar datos base utilizados por el sistema, como monedas, tipos de documento, metodos de pago, categorias de gasto, marcas y modelos.

#### Usuarios

Permite administrar usuarios, roles, estados, detalle de usuario y reinicio de contrasenas. La interfaz no depende del nombre del rol, sino de los permisos entregados por el backend.

## Backend

El backend es una API REST que centraliza las reglas de negocio, persistencia, seguridad, auditoria y validaciones del sistema. Expone endpoints bajo `/api/v1` y se comunica con una base de datos PostgreSQL.

### Stack del backend

- **Node.js 22+:** runtime de ejecucion.
- **TypeScript:** tipado estricto.
- **Express:** capa HTTP.
- **PostgreSQL:** base de datos relacional.
- **Kysely:** query builder tipado.
- **Zod:** validacion de entradas HTTP.
- **JWT + bcrypt:** autenticacion y seguridad de contrasenas.
- **Pino:** registro de logs.
- **Vitest:** pruebas automatizadas.

### Arquitectura del backend

El backend sigue una arquitectura por capas inspirada en Clean Architecture:

```text
src/
├── domain/           Entidades, reglas de negocio, errores y contratos
├── application/      Casos de uso
├── infrastructure/   Base de datos, repositorios, auth, logs y migraciones
├── presentation/     Rutas HTTP, controladores, schemas y middlewares
└── main/             Composicion de dependencias y arranque del servidor
```

La dependencia apunta hacia el dominio. Los casos de uso coordinan reglas de negocio sin conocer Express ni SQL. Los repositorios implementan el acceso a datos con Kysely y traducen entre el modelo de base de datos y el modelo de dominio.

### Modulos del backend

#### Autenticacion, usuarios y permisos

Gestiona login, refresh token, cierre de sesion, sesiones activas, cambio de contrasena, roles, permisos y usuarios. El control de acceso se basa en permisos como `vehicles:read`, `sales:write` o `users:read`.

#### Vehiculos

Modela el inventario y la maquina de estados de cada vehiculo. Controla disponibilidad, transiciones validas, datos tecnicos, imagenes, marca, modelo y resumen de inventario.

#### Catalogos

Centraliza datos base del sistema, incluyendo monedas, tipos de documento, metodos de pago, categorias de gasto, marcas y modelos de vehiculos.

#### Clientes

Administra clientes individuales y empresas. Valida reglas como datos requeridos segun el tipo de cliente y unicidad de documentos cuando aplica.

#### Proveedores

Gestiona proveedores usados en procesos de compra e importacion.

#### Compras

Registra compras de vehiculos y sus items. Controla estados de compra, relacion con proveedores, moneda, tasa de cambio y recepcion de unidades.

#### Gastos

Registra gastos generales o asociados a vehiculos. Valida categorias, alcance del gasto, moneda y tasa de cambio para mantener costos consistentes.

#### Cotizaciones

Administra cotizaciones comerciales. Incluye creacion, actualizacion, consulta, expiracion y cambios de estado bajo reglas de negocio.

#### Reservas

Gestiona reservas de vehiculos disponibles. Controla expiracion, cancelacion y actualizacion del estado del vehiculo cuando una reserva se crea o deja de estar vigente.

#### Ventas

Administra ventas, items vendidos, pagos, devoluciones, cancelacion y cierre. Permite ventas con varios vehiculos y controla que los saldos, pagos y reembolsos mantengan coherencia.

#### Reportes

Expone reportes de inventario, ventas, gastos, rentabilidad y cuentas por cobrar. Usa vistas SQL para consolidar datos sin duplicar informacion operativa.

#### Subida de imagenes

Provee el endpoint de firma para ImageKit. El backend no almacena archivos; firma la subida y guarda la URL de la imagen asociada al vehiculo.

#### Auditoria

Registra cambios relevantes del sistema asociandolos al usuario y a la peticion. La auditoria se aplica de forma transversal, sin mezclar la logica de negocio con escritura manual de logs.

## Seguridad y control de acceso

El sistema usa autenticacion basada en JWT y refresh tokens persistentes. El access token permite acceder a la API y el refresh token permite renovar la sesion. El backend valida permisos en cada endpoint protegido y el frontend oculta rutas, menus y acciones segun los permisos del usuario.

El control de acceso es cerrado por defecto: un rol sin permisos declarados no obtiene acceso implicito. Esto evita que cambios en catalogos de roles otorguen capacidades no previstas.

## Reglas de negocio principales

- Un vehiculo solo puede reservarse si esta disponible en inventario.
- Un vehiculo vendido no puede reasignarse manualmente como disponible.
- Las reservas y ventas modifican el estado del vehiculo de forma controlada.
- Las ventas pueden incluir varios vehiculos.
- Los pagos deben respetar la moneda de la venta.
- Una venta solo se completa si su saldo esta cubierto.
- Los gastos pueden ser generales o asociados a vehiculos, segun su categoria.
- Las tasas de cambio se conservan en los documentos para mantener calculos historicos.
- Los cambios de estado se validan en el dominio, no solo en la interfaz.
- Los borrados y cancelaciones respetan reglas de trazabilidad e historial.

## Alcance no incluido en este documento

Por solicitud expresa, se excluye el modulo de facturacion. Aunque el codigo del proyecto contiene elementos relacionados con facturacion o comprobantes, no se describen como parte del alcance funcional de este documento.

