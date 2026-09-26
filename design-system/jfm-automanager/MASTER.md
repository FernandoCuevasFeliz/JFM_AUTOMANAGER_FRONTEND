# JFM AutoManager — sistema de diseño

Fuente de verdad de las decisiones visuales del panel. Los tokens viven en
[`src/index.css`](../../src/index.css); este documento explica **por qué** son
esos y no otros, para que la próxima pantalla no reabra la discusión.

Dirección: **consola de concesionario**. Grafito premium + rojo señal, tipografía
grotesca industrial y superficies densas definidas por borde.

---

## 1. Color

Paleta base: perfil *Automotive / Car Dealership* — grafito premium con rojo de
acción.

| Rol | Claro | Oscuro | Uso |
|---|---|---|---|
| `--primary` | `#1E293B` grafito | casi blanco | **Acción afirmativa**: guardar, crear, confirmar |
| `--signal` | `#DC2626` | rojo claro | **Marca**: logo, riel de navegación activa, pestaña activa |
| `--destructive` | `#DC2626` | rojo oscuro | Botones y menús que borran o cancelan |
| `--danger` | rojo texto | rojo claro | Rojo **como texto** (errores inline, saldos vencidos) |
| `--success` / `--warning` | esmeralda / ámbar | ídem, aclarados | Cobrado / pendiente |
| `--sidebar` | grafito oscuro | grafito oscuro | Igual en ambos temas, a propósito |

### La regla que sostiene todo

- **Grafito = confirmar. Rojo = marca y peligro.** Nunca hay un botón rojo que
  guarde algo, así que un botón rojo siempre significa lo mismo. Es el motivo de
  que el CTA primario no sea el color de acento del perfil.
- `--destructive` es la **superficie** roja (fondo de botón, con texto blanco
  encima); `--danger` es el rojo **legible como texto** sobre el fondo del tema.
  Separarlos es lo que permite que el modo oscuro pase AA sin repintar cada uso.
- El sidebar es oscuro en los dos temas: ancla la identidad y deja todo el
  contraste disponible para el área donde de verdad se leen datos.

### Contraste verificado (medido en el navegador, sin transiciones)

| Par | Claro | Oscuro |
|---|---|---|
| Texto sobre fondo | 16.6:1 | 16.9:1 |
| `muted-foreground` sobre fondo | 7.05:1 | 7.58:1 |
| Texto en campo | 17.9:1 | 15.7:1 |
| Placeholder | 7.6:1 | 7.0:1 |
| Etiqueta de botón primario | 14.0:1 | 14.4:1 |
| Texto del sidebar | 7.56:1 | 7.85:1 |
| Micro-etiquetas del sidebar | 4.50:1 | 4.67:1 |
| **Borde de campo vs lienzo** | **3.06:1** | ok |

El borde de campo (`--input`) es bastante más oscuro que el de tarjeta
(`--border`) porque la WCAG 1.4.11 pide 3:1 para el límite de un control. El gris
claro de costumbre se queda en 1.3:1: en un panel que es sobre todo formularios,
no ver dónde empieza el campo es el peor defecto posible.

### Gráficas

Rampa coherente, no arcoíris. **El color de un estado en el donut es el mismo que
el de su badge en la tabla** (`STATUS_COLORS` sigue a `lib/status.ts`): un mismo
estado con dos colores obliga a leer la leyenda en cada vistazo.

---

## 2. Tipografía

| Rol | Fuente | Por qué |
|---|---|---|
| Interfaz y títulos | **Archivo** (400–700, variable) | Grotesca industrial con linaje de rotulación vial. Lee técnica, no “startup genérica”, y aguanta bien 13–14px en tablas densas |
| Cifras | **JetBrains Mono** (400–600) | Montos, VIN, chasis, placas y folios. Ancho fijo = las columnas de dinero alinean solas |

Se sustituyó Inter, que es exactamente el aspecto genérico del que se partía.

La búsqueda del skill devolvió como mejor par *Fira Code / Fira Sans* para
paneles de datos. Se conservó su **principio** (mono para el dato, sans para la
etiqueta) pero se cambiaron las familias: Archivo encaja mejor con la dirección
automotriz-premium que la voz más amable de Fira.

Escala:

- `h1` de página: 27px / 700 / tracking −0.03em
- Título de tarjeta: 15px / 600
- Cuerpo: 14px · secundario 13px
- `.label-micro`: 11px / 600 / mayúsculas / tracking 0.07em — cabeceras de tabla,
  rótulos de KPI, agrupadores del sidebar
- `.num`: monoespaciada y tabular, para toda cifra

---

## 3. Forma y densidad

- `--radius: 0.5rem` (antes 0.625). Esquinas más cerradas = precisión, no blandura.
- **El borde define, la sombra solo separa del lienzo.** `shadow-card` es casi
  imperceptible; con ocho tarjetas en pantalla, las sombras marcadas ensucian.
- Densidad de consola: fila de tabla 44px, cabecera 36px, padding de tarjeta 20px.
- Cabecera de tabla **sticky**: al bajar por cien vehículos, saber qué columna se
  está leyendo no puede depender de volver arriba.
- Badges rectangulares de esquina viva, no pastillas: en una tabla densa la
  pastilla desperdicia ancho y suaviza una lectura que debe ser técnica.
- Pestañas subrayadas, no pastillas: se leen como secciones de un documento.

---

## 4. Interacción

- Foco: un único `:focus-visible` global (`outline` de 2px + offset). Los campos
  lo sustituyen por borde + halo para no desalinear la retícula del formulario.
- Botones: hundido de 1px en `:active` — el acuse táctil que un cambio de color
  no transmite. `cursor: pointer` en todo lo pulsable.
- `.hit-target`: lleva el área táctil a 44×44 reales en pantallas táctiles
  mediante un `::after`, **sin** engordar el control en escritorio. Un panel denso
  no puede permitirse botones de 44px de alto; un dedo tampoco puede fallar.
- Transiciones de 150ms en color, 200–250ms en desplazamiento.
- `prefers-reduced-motion` anulado globalmente en `@layer base`.
- Esqueletos con barrido direccional en vez de parpadeo: una dirección se lee
  como progreso; un `pulse` se lee como “algo está roto”.

---

## 5. Tema claro / oscuro

`data-theme` en `<html>`, fijado por un script inline en `index.html` **antes del
primer pintado** (sin él, un usuario en oscuro ve un destello blanco en cada
carga). Variante de Tailwind:

```css
@custom-variant dark (&:where([data-theme='dark'], [data-theme='dark'] *));
```

Sin preferencia guardada el panel sigue al sistema; el interruptor de la topbar
la fija en `localStorage`.

> Antes existían tokens `.dark` que nada aplicaba nunca, mientras las utilidades
> `dark:` de los badges seguían al sistema operativo. Un usuario con el SO en
> oscuro veía badges oscuros sobre fondo claro.

---

## 6. Trampas conocidas

- `@theme inline` **incrusta** el valor en la utilidad y no publica la variable en
  tiempo de ejecución: `shadow-pop` funciona como clase, pero `var(--shadow-pop)`
  en un `style` inline sale vacío. Ver `TOOLTIP_STYLE` en el tablero.
- Al medir color desde la consola, desactiva antes las transiciones: si no, lees
  un valor interpolado a medio camino y el contraste sale mal.
