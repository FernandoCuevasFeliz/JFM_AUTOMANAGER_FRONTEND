# Carga de vehiculos de ejemplo

Nueve vehiculos reales sacados de las publicaciones publicas de
[@ejgh_autoimport](https://www.instagram.com/ejgh_autoimport), listos para cargar
en el sistema.

## Uso

```bash
JFM_EMAIL=tu@correo JFM_PASSWORD=tu-clave node scripts/seed/seed-vehicles.mjs
```

Eso es un **simulacro**: imprime lo que haria y no escribe nada. Cuando el
listado te cuadre:

```bash
JFM_EMAIL=tu@correo JFM_PASSWORD=tu-clave node scripts/seed/seed-vehicles.mjs --commit
```

El usuario necesita permisos `vehicles:write` y `catalogs:write`. Por defecto
apunta al backend de produccion; cambialo con `JFM_API_URL`.

El script es idempotente: salta los chasis que ya existen, asi que puedes
relanzarlo sin duplicar. Crea las marcas y modelos que falten (Honda, Hyundai,
Nissan · CR-V, Santa Fe, Sonata, Civic, Sentra, Fit).

Las credenciales se leen del entorno y no se guardan ni se imprimen.

## Que hay de real y que no

Los pies de foto de Instagram traen marca, modelo, ano, kilometraje, motor,
transmision y equipamiento. **No traen precio ni numero de chasis.** Cada
vehiculo en `vehicles.json` lleva marcadores `_color`, `_mileage`, `_salePrice`
que dicen si el dato es `real` o `estimado`, y un `_post` con el enlace a la
publicacion de origen.

| Campo | Origen |
|---|---|
| Marca, modelo, ano | Real |
| Kilometraje | Real, salvo el Honda Fit 2011 (la publicacion no lo dice) |
| Motor, transmision, equipamiento | Real, en `notes` |
| Color | Real solo en los dos Nissan Sentra ("gris de fabrica") |
| **Precio** | **Estimado de mercado.** Ninguna publicacion lo trae |
| **Chasis** | **Placeholder `DEMO-…`** |

El chasis va con prefijo `DEMO-` a proposito. Un VIN inventado con formato
valido acaba confundiendose con uno autentico dentro del inventario, y el chasis
es un identificador legal del vehiculo: mejor que se note a simple vista que ese
registro todavia no tiene su numero real.

El Hyundai Santa Fe 2020 se publico con **158 mil millas**, que en el sistema van
como 254.278 km.

## Fotos

No estan. La portada de cada publicacion es el letrero del local, no el
vehiculo; las fotos de los carros van en las diapositivas siguientes del
carrusel, e Instagram las sirve solo con sesion iniciada.

Para cargarlas: descargalas desde la cuenta y subelas desde la ficha de cada
vehiculo, que ya tiene el uploader de ImageKit. Evita enlazar las URLs de
`scontent.cdninstagram.com` directamente — van firmadas y caducan en dias, asi
que las imagenes se romperian solas.
