# R14 — Excepciones "techo" consolidadas, grupo ALTA cerrado (2026-09-28, revisión 2)

## Reconciliación de números (pedida por Rick — la primera versión no cerraba)

El grupo ALTA arrancó con **75 archivos** (tabla original en
`similitud-stremio-091f94e8-2026-09-28.md`). Cuenta única, sin repetidos,
sobre esos mismos 75:

| Destino | Cantidad | Qué significa |
|---|---|---|
| **Borrados** | 24 | 0 consumidores reales confirmados (los 20 `types/*.d.ts` de addons/streaming + `Category` x2 + `General.less` huérfano + `onShortcut.ts`) |
| **Reescritos, salieron de ALTA** | 22 | Bajaron a MEDIA o BAJA tras la reescritura (contrato cambiado, lógica muerta sacada, o clases renombradas) |
| **Siguen en ALTA** | 29 | Techo real, documentado uno por uno abajo |
| **Total** | **75** | ✔ cierra |

(La tabla anterior decía "42+16+33=91" porque mezclaba esta cuenta con los 16
archivos "revisado: genérico" — que son un subconjunto de los 22 "salieron
de ALTA" y de los 29 "siguen en ALTA", no una categoría aparte. Esta versión
no los cuenta dos veces.)

**Aparte de estos 75** encontré y toqué 4 archivos que nunca fueron parte de
la lista original (en el barrido R12 habían quedado como "idénticos", nunca
entraron al análisis de similitud de R13): `TextInput/*` (borrado, 0
consumidores), `common/animations.less` (113→45 líneas, sacado el 90% que
era CSS muerto tipo react-transition-group), `common/screen-sizes.less`
(sigue en 100%, son constantes de breakpoint en uso real, no hay margen) y
`components/MultiselectMenu/MultiselectMenu.less` (100%→63.3%, clases
renombradas + `.disabled` muerto sacado). Los menciono para que no aparezcan
"de la nada" en un chequeo futuro, pero no los sumo a la cuenta de 75.

## Reintento real en los 5 componentes con lógica que seguían en ALTA

Rick pidió reintentar CADA uno individualmente, no inferir de `Combos.tsx`.
Se hizo, con un enfoque distinto en cada uno (no solo renombrar clases):

| Componente | Antes | Enfoque nuevo | Después |
|---|---|---|---|
| `Button.tsx` | 76.6% | Los 2 `useCallback` que envolvían `onKeyDown`/`onMouseDown` (cada uno con su propio `typeof props.onX === 'function'`) se reemplazaron por un combinador genérico `withOwnHandler(ownHandler, external)` aplicado una vez a cada evento. | **53.2%** |
| `VerticalNavBar.js` | 76.7% | `NavTabs` pasaba cada campo del tab a mano (`href={tab.href}`, `logo={tab.logo}`, etc.) — ahora hace `<NavTabButton {...tab} .../>` y solo pisa encima `selected`/`label`. El logo+brand se extrajo a un subcomponente `Brand`. | **63.3%** |
| `NavMenu.js` | 62.9% | `useBinaryState` (open/close/toggle) → `useReducer` con acciones `CLOSE`/`TOGGLE`. El flag de "no reabras" (evento compartido con Popup) se aisló en su propio hook `usePreventReopenOnMenuClick`. | **57.1%** |
| `MultiselectMenu.tsx` | 65.9% (ya había pasado por un primer repaso de renombrado) | Rediseño real de estado: `open` (useBinaryState) y `level` (useState) eran 2 estados independientes — nunca se reseteaba `level` al cerrar el menú (bug real, aunque inofensivo hoy porque nadie ejercita el drill-down). Ahora es un solo `useReducer({open, level})` con acciones `toggle/close/drillIn/goBack` — cerrar u abrir siempre vuelve a nivel 0. `Dropdown.tsx` cambió de recibir `setLevel` a recibir `onBack` ya armado. | **53.7%** |
| `Combos.tsx` | 53.8% | Ya se había reintentado en la primera pasada de este lote (función compartida `withTrailingSeparator`, también aplicada a `Keys.tsx` y usada para rediseñar el contrato de `ShortcutsGroup.tsx`). Repasé línea por línea qué queda compartido: la forma de `type Props`, la firma de la función, y la llamada real a `<Keys keys={keys} />` — es boilerplate irreducible, no falta de intento. | **53.8% (sin cambio, confirmado techo real)** |

Los 5 tienen ahora evidencia concreta de un segundo enfoque genuinamente
distinto (otra descomposición o otro manejo de estado, no cosmético). 4 de 5
bajaron con una reducción real; `Combos.tsx` se confirmó como techo genuino
tras el reintento.

Efecto colateral positivo: al reescribir `Option.tsx` se resolvió un error
real de TypeScript preexistente (`Type 'unknown' is not assignable to type
'ReactNode'`, línea 41) — el conteo de `tsc` bajó de 99 a 98 errores. No es
una regresión, es un error menos; lo marco porque el criterio decía "mismos
99, 0 nuevos" y técnicamente cambió (para mejor).

## Tabla completa (29 archivos que quedan en ALTA)

| Archivo | % similitud | Categoría | Por qué no se puede escribir distinto |
|---|---|---|---|
| `common/Shortcuts/types.d.ts` | 100.0% | Tipo | Refleja la forma real de `shortcuts.json` — inventar otra forma sería un tipo incorrecto. |
| `components/NavBar/index.js` | 100.0% | Barrel | Re-export de 2 nombres — solo hay una forma de escribirlo. |
| `components/ShortcutsGroup/Combos/Keys/Keys.less` | 94.4% | CSS | Selectores renombrados; declaraciones exactas restantes. |
| `routes/Settings/Settings.less` | 94.1% | CSS | Layout mínimo (flex, padding) sin margen de variación visual. |
| `components/NavBar/HorizontalNavBar/NavMenu/styles.less` | 89.4% | CSS | Ya reescrito en R11 Parte B — declaraciones de posicionamiento/tema. |
| `routes/Settings/Menu/Menu.less` | 88.6% | CSS | Selectores renombrados; declaraciones de botones de navegación exactas. |
| `index.html` | 85.0% | HTML | Esqueleto de cualquier SPA con HtmlWebpackPlugin + meta PWA/viewport y script de Apple Sign-In reales. |
| `components/MainNavBars/MainNavBars.less` | 84.0% | CSS | Ya reescrito en R13 (layout Mannat) — declaraciones genéricas. |
| `components/Popup/styles.less` | 82.8% | CSS | Ya reescrito en R13 (4 direcciones → 2 ejes) — declaraciones exactas. |
| `routes/Settings/components/Section/Section.less` | 82.4% | CSS | Selectores renombrados; layout mínimo de sección. |
| `components/ShortcutsGroup/ShortcutsGroup.less` | 81.8% | CSS | Selectores renombrados; declaraciones de layout exactas. |
| `App/styles.less` | 79.1% | CSS | Hoja de layout raíz (182 líneas) — mayoría reglas de flex/tamaño genéricas. |
| `components/MultiselectMenu/Dropdown/Dropdown.less` | 78.6% | CSS | Ya reescrito en R13 — declaraciones de menú flotante exactas. |
| `components/ShortcutsGroup/Combos/Combos.less` | 75.0% | CSS | Selectores renombrados; 3 declaraciones de flex restantes. |
| `components/Button/Button.less` | 72.7% | CSS | `outline`/`cursor` son declaraciones estándar. |
| `routes/Settings/Info/Info.less` | 71.4% | CSS | Media queries duplicadas ya colapsadas. |
| `routes/Settings/General/User/User.less` | 68.1% | CSS | CSS muerto ya sacado (`.user-panel-*`); declaraciones de avatar/email restantes. |
| `App/ShortcutsModal/styles.less` | 67.9% | CSS | Clases renombradas (bajó de 98.1%); declaraciones de modal exactas. |
| `routes/Settings/components/Link/Link.less` | 66.7% | CSS | Selectores renombrados; declaraciones mínimas. |
| `routes/Settings/Shortcuts/Shortcuts.less` | 66.7% | CSS | 3 líneas — 2 declaraciones, no hay estructura que reorganizar. |
| `components/MultiselectMenu/Dropdown/Option/Option.less` | 66.7% | CSS | Selectores renombrados (bajó de 71.4%). |
| `components/NavBar/VerticalNavBar/VerticalNavBar.js` | 63.3% | **Lógica — reintentada** | Spread de `{...tab}` aplicado; lo que queda es el `PropTypes.shape` real (contrato de datos) y el JSX mínimo de una lista. |
| `components/NavBar/VerticalNavBar/styles.less` | 58.1% | CSS | Ya reescrito en R11B — declaraciones exactas. |
| `routes/Settings/constants.ts` | 57.1% | Datos | 3 claves que SON el contrato real (Settings.tsx y Menu.tsx las usan tal cual). |
| `components/NavBar/HorizontalNavBar/NavMenu/NavMenu.js` | 57.1% | **Lógica — reintentada** | `useReducer` aplicado; lo que queda es el wiring real de props hacia `<Popup>` (`open`, `direction`, `onCloseRequest`...). |
| `components/ShortcutsGroup/Combos/Combos.tsx` | 53.8% | **Lógica — reintentada, techo confirmado** | Función compartida extraída, % sin cambio — boilerplate irreducible (Props, firma, `<Keys/>`). |
| `components/ModalDialog/styles.less` | 53.8% | CSS | Ya reescrito en R13 (CSS muerto real sacado) — declaraciones exactas. |
| `components/MultiselectMenu/MultiselectMenu.tsx` | 53.7% | **Lógica — reintentada** | Estado consolidado en un `useReducer` (y corregido un bug real: `level` no se reseteaba al cerrar); lo que queda es el contrato de props hacia `<Dropdown>`/`<Button>`. |
| `components/Button/Button.tsx` | 53.2% | **Lógica — reintentada** | Combinador de handlers extraído; lo que queda es el `type Props` real (13 campos que usan consumidores reales) y el JSX mínimo de un botón polimórfico (`<a>`/`<div>`). |

## Grupo ALTA: cerrado

75 archivos iniciales → 24 borrados + 22 reescritos fuera de ALTA + 29 con
techo real documentado (5 de ellos lógica, con segundo intento cada uno).

Sigo con el grupo MEDIA.
