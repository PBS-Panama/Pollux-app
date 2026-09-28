# Similitud contra stremio-web @ 091f94e8 — los 137 MODIFICADO (R13)

Generado el 2026-09-28, sobre la lista de 137 archivos marcados `MODIFICADO` en
`comparacion-stremio-091f94e8-2026-09-28.md` (mismo checkout de referencia,
solo lectura, en `/tmp`).

**Método:** para cada archivo, de cada versión (Pollux actual y 091f94e8) se
descartan líneas triviales — vacías, imports/`require(...)`, `module.exports`
solo, líneas que son puramente llaves/paréntesis/corchetes, y la línea de
copyright. Con las líneas restantes (recortadas, sin espacios de más) de cada
lado, se arman dos conjuntos y se calcula:

```
% similitud = |líneas de 091f94e8 que también aparecen tal cual en Pollux| / |líneas no triviales de 091f94e8|
```

Clasificación: **ALTA** (>50%), **MEDIA** (20–50%), **BAJA** (<20%). El
denominador es siempre el archivo de stremio-web — responde "cuánto del
original sigue ahí", no cuánto cambió Pollux en total.

**Límite real del método — leer antes de usar la tabla para priorizar:** esto
mide superposición de líneas, no si un archivo fue genuinamente reescrito.
Componentes que YO reescribí de cero en R10/R11/R11-Parte-B/R13 (mismo
contrato externo, misma UI, estructura interna distinta) igual comparten
líneas sueltas con el original porque son genéricas (`display: flex;`,
`color: var(--primary-foreground-color);`, un `PropTypes.string`, un
`useCallback` con la misma forma) — no porque el archivo siga siendo una
copia. Reconozco en esta pasada, sin garantía de ser lista exhaustiva:
`Button.tsx`/`Button.less`, `MultiselectMenu.tsx`, `Dropdown.tsx`/
`Dropdown.less`, `Option.tsx`/`Option.less`, `MainNavBars.tsx`/
`MainNavBars.less`, `NavMenu.js`, `VerticalNavBar.js`, `ModalDialog/
styles.less`, `Popup/styles.less`, `App/styles.less`, `ShortcutsModal.tsx` —
todos aparecen en ALTA/MEDIA por esa razón, no porque falte reescribirlos.
El resto de la tabla (la gran mayoría) nunca pasó por ninguna fase R — ahí sí
el % es una señal real de cuánto queda de Stremio. Notable: **varios de los
archivos en 100% (`types/*.d.ts`, `ShortcutsGroup/*`, `Settings/components/*`)
ni siquiera tienen la cabecera de copyright** — nunca la tuvieron, o se las
sacaron en una fase anterior a la técnica de huella (R1–R5); no aparecían en
ningún inventario anterior por eso mismo.

## Totales por grupo (adelantado, detalle completo más abajo)

| Grupo | Archivos | Total líneas no triviales (upstream) |
|---|---|---|
| ALTA (>50%) | 75 | 1885 |
| MEDIA (20–50%) | 26 | 1024 |
| BAJA (<20%) | 36 | 600 |
| **Total** | 137 | 3509 |

## Tabla completa (ordenada de mayor a menor similitud)

| Archivo | Líneas no triviales (upstream) | Compartidas | % similitud | Grupo |
|---|---|---|---|---|
| `common/Platform/device.ts` | 20 | 20 | 100.0% | ALTA |
| `common/Platform/index.ts` | 2 | 2 | 100.0% | ALTA |
| `common/Shortcuts/index.ts` | 3 | 3 | 100.0% | ALTA |
| `common/Shortcuts/onShortcut.ts` | 7 | 7 | 100.0% | ALTA |
| `common/Shortcuts/Shortcuts.tsx` | 39 | 39 | 100.0% | ALTA |
| `common/Shortcuts/types.d.ts` | 6 | 6 | 100.0% | ALTA |
| `common/useBinaryState.d.ts` | 4 | 4 | 100.0% | ALTA |
| `common/useLanguageSorting.ts` | 23 | 23 | 100.0% | ALTA |
| `components/MultiselectMenu/types.d.ts` | 8 | 8 | 100.0% | ALTA |
| `components/NavBar/index.js` | 2 | 2 | 100.0% | ALTA |
| `components/ShortcutsGroup/Combos/Combos.less` | 12 | 12 | 100.0% | ALTA |
| `components/ShortcutsGroup/Combos/Combos.tsx` | 13 | 13 | 100.0% | ALTA |
| `components/ShortcutsGroup/Combos/Keys/Keys.less` | 18 | 18 | 100.0% | ALTA |
| `components/ShortcutsGroup/Combos/Keys/Keys.tsx` | 31 | 31 | 100.0% | ALTA |
| `components/ShortcutsGroup/ShortcutsGroup.less` | 22 | 22 | 100.0% | ALTA |
| `components/ShortcutsGroup/ShortcutsGroup.tsx` | 16 | 16 | 100.0% | ALTA |
| `routes/Settings/components/Category/Category.less` | 23 | 23 | 100.0% | ALTA |
| `routes/Settings/components/Category/Category.tsx` | 13 | 13 | 100.0% | ALTA |
| `routes/Settings/components/index.ts` | 4 | 4 | 100.0% | ALTA |
| `routes/Settings/components/Link/Link.less` | 9 | 9 | 100.0% | ALTA |
| `routes/Settings/components/Link/Link.tsx` | 10 | 10 | 100.0% | ALTA |
| `routes/Settings/components/Option/Option.less` | 42 | 42 | 100.0% | ALTA |
| `routes/Settings/components/Option/Option.tsx` | 19 | 19 | 100.0% | ALTA |
| `routes/Settings/components/Section/Section.less` | 17 | 17 | 100.0% | ALTA |
| `routes/Settings/components/Section/Section.tsx` | 12 | 12 | 100.0% | ALTA |
| `routes/Settings/Shortcuts/Shortcuts.less` | 3 | 3 | 100.0% | ALTA |
| `routes/Settings/Shortcuts/Shortcuts.tsx` | 12 | 12 | 100.0% | ALTA |
| `types/Addon.d.ts` | 15 | 15 | 100.0% | ALTA |
| `types/LibraryItem.d.ts` | 29 | 29 | 100.0% | ALTA |
| `types/MetaItem.d.ts` | 24 | 24 | 100.0% | ALTA |
| `types/models/Board.d.ts` | 1 | 1 | 100.0% | ALTA |
| `types/models/Calendar.d.ts` | 35 | 35 | 100.0% | ALTA |
| `types/models/CatalogsWithExtra.d.ts` | 8 | 8 | 100.0% | ALTA |
| `types/models/DataExport.d.ts` | 2 | 2 | 100.0% | ALTA |
| `types/models/Discover.d.ts` | 18 | 18 | 100.0% | ALTA |
| `types/models/InstalledAddons.d.ts` | 9 | 9 | 100.0% | ALTA |
| `types/models/Library.d.ts` | 21 | 21 | 100.0% | ALTA |
| `types/models/LocalSearch.d.ts` | 6 | 6 | 100.0% | ALTA |
| `types/models/MetaDetails.d.ts` | 20 | 20 | 100.0% | ALTA |
| `types/models/Player.d.ts` | 44 | 44 | 100.0% | ALTA |
| `types/models/RemoteAddons.d.ts` | 8 | 8 | 100.0% | ALTA |
| `types/models/Search.d.ts` | 1 | 1 | 100.0% | ALTA |
| `types/models/StremingServer.d.ts` | 93 | 93 | 100.0% | ALTA |
| `types/Selectable.d.ts` | 13 | 13 | 100.0% | ALTA |
| `types/Stream.d.ts` | 12 | 12 | 100.0% | ALTA |
| `types/types.d.ts` | 50 | 50 | 100.0% | ALTA |
| `types/Video.d.ts` | 19 | 19 | 100.0% | ALTA |
| `App/ShortcutsModal/styles.less` | 53 | 52 | 98.1% | ALTA |
| `routes/Settings/General/User/User.less` | 47 | 46 | 97.9% | ALTA |
| `routes/Settings/Menu/Menu.less` | 35 | 34 | 97.1% | ALTA |
| `routes/Settings/Settings.less` | 17 | 16 | 94.1% | ALTA |
| `components/NavBar/HorizontalNavBar/NavMenu/styles.less` | 66 | 59 | 89.4% | ALTA |
| `routes/Settings/Info/Info.less` | 14 | 12 | 85.7% | ALTA |
| `index.html` | 20 | 17 | 85.0% | ALTA |
| `components/MainNavBars/MainNavBars.less` | 25 | 21 | 84.0% | ALTA |
| `routes/Settings/General/General.less` | 6 | 5 | 83.3% | ALTA |
| `components/Popup/styles.less` | 29 | 24 | 82.8% | ALTA |
| `common/Platform/Platform.tsx` | 25 | 20 | 80.0% | ALTA |
| `App/styles.less` | 182 | 145 | 79.7% | ALTA |
| `components/MultiselectMenu/Dropdown/Dropdown.less` | 28 | 22 | 78.6% | ALTA |
| `components/NavBar/VerticalNavBar/VerticalNavBar.js` | 30 | 23 | 76.7% | ALTA |
| `components/Button/Button.tsx` | 47 | 36 | 76.6% | ALTA |
| `components/MultiselectMenu/MultiselectMenu.tsx` | 41 | 30 | 73.2% | ALTA |
| `components/Button/Button.less` | 11 | 8 | 72.7% | ALTA |
| `components/MultiselectMenu/Dropdown/Option/Option.less` | 21 | 15 | 71.4% | ALTA |
| `routes/Settings/constants.ts` | 7 | 5 | 71.4% | ALTA |
| `common/useFullscreen.ts` | 47 | 33 | 70.2% | ALTA |
| `components/NavBar/HorizontalNavBar/NavMenu/NavMenu.js` | 35 | 22 | 62.9% | ALTA |
| `components/NavBar/VerticalNavBar/styles.less` | 31 | 18 | 58.1% | ALTA |
| `routes/Settings/General/User/User.tsx` | 38 | 22 | 57.9% | ALTA |
| `App/ShortcutsModal/ShortcutsModal.tsx` | 30 | 17 | 56.7% | ALTA |
| `components/MultiselectMenu/Dropdown/Option/Option.tsx` | 25 | 14 | 56.0% | ALTA |
| `components/ModalDialog/styles.less` | 91 | 49 | 53.8% | ALTA |
| `components/MainNavBars/MainNavBars.tsx` | 30 | 16 | 53.3% | ALTA |
| `routes/Settings/Menu/Menu.tsx` | 36 | 19 | 52.8% | ALTA |
| `common/useProfile.d.ts` | 2 | 1 | 50.0% | MEDIA |
| `modules.d.ts` | 6 | 3 | 50.0% | MEDIA |
| `components/MultiselectMenu/Dropdown/Dropdown.tsx` | 52 | 23 | 44.2% | MEDIA |
| `routes/Settings/Info/Info.tsx` | 25 | 11 | 44.0% | MEDIA |
| `components/NavBar/VerticalNavBar/NavTabButton/styles.less` | 39 | 17 | 43.6% | MEDIA |
| `components/NavBar/HorizontalNavBar/HorizontalNavBar.js` | 47 | 19 | 40.4% | MEDIA |
| `routes/Settings/Settings.tsx` | 62 | 25 | 40.3% | MEDIA |
| `components/TextInput/TextInput.tsx` | 25 | 10 | 40.0% | MEDIA |
| `components/NavBar/HorizontalNavBar/styles.less` | 63 | 25 | 39.7% | MEDIA |
| `components/index.ts` | 33 | 13 | 39.4% | MEDIA |
| `components/NavBar/VerticalNavBar/NavTabButton/NavTabButton.js` | 33 | 13 | 39.4% | MEDIA |
| `components/ModalDialog/ModalDialog.js` | 65 | 24 | 36.9% | MEDIA |
| `index.js` | 22 | 8 | 36.4% | MEDIA |
| `routes/index.js` | 11 | 4 | 36.4% | MEDIA |
| `components/Multiselect/styles.less` | 58 | 21 | 36.2% | MEDIA |
| `common/index.js` | 37 | 12 | 32.4% | MEDIA |
| `components/NavBar/HorizontalNavBar/NavMenu/NavMenuContent.js` | 74 | 24 | 32.4% | MEDIA |
| `routes/Settings/Interface/Interface.tsx` | 28 | 9 | 32.1% | MEDIA |
| `routes/Settings/Interface/useInterfaceOptions.ts` | 36 | 11 | 30.6% | MEDIA |
| `components/Image/Image.tsx` | 23 | 7 | 30.4% | MEDIA |
| `components/Popup/Popup.js` | 81 | 23 | 28.4% | MEDIA |
| `components/Multiselect/Multiselect.js` | 119 | 33 | 27.7% | MEDIA |
| `App/routerViewsConfig.js` | 22 | 6 | 27.3% | MEDIA |
| `common/routesRegexp.js` | 30 | 8 | 26.7% | MEDIA |
| `common/useOutsideClick.ts` | 13 | 3 | 23.1% | MEDIA |
| `routes/NotFound/NotFound.js` | 18 | 4 | 22.2% | MEDIA |
| `common/Shortcuts/shortcuts.json` | 62 | 12 | 19.4% | BAJA |
| `routes/NotFound/styles.less` | 27 | 5 | 18.5% | BAJA |
| `common/useBinaryState.js` | 11 | 2 | 18.2% | BAJA |
| `App/App.js` | 140 | 23 | 16.4% | BAJA |
| `common/usePWA.js` | 7 | 1 | 14.3% | BAJA |
| `common/CONSTANTS.js` | 94 | 13 | 13.8% | BAJA |
| `App/withProtectedRoutes.js` | 15 | 2 | 13.3% | BAJA |
| `routes/Settings/General/General.tsx` | 77 | 9 | 11.7% | BAJA |
| `common/useProfile.js` | 11 | 1 | 9.1% | BAJA |
| `common/CoreSuspender.js` | 51 | 4 | 7.8% | BAJA |
| `common/interfaceLanguages.json` | 98 | 6 | 6.1% | BAJA |
| `App/ShortcutsModal/index.ts` | 0 | 0 | 0.0% | BAJA |
| `components/Button/index.ts` | 0 | 0 | 0.0% | BAJA |
| `components/Image/index.ts` | 0 | 0 | 0.0% | BAJA |
| `components/ModalDialog/index.js` | 0 | 0 | 0.0% | BAJA |
| `components/NavBar/HorizontalNavBar/index.js` | 0 | 0 | 0.0% | BAJA |
| `components/NavBar/HorizontalNavBar/NavMenu/index.js` | 0 | 0 | 0.0% | BAJA |
| `components/NavBar/VerticalNavBar/index.js` | 0 | 0 | 0.0% | BAJA |
| `components/NavBar/VerticalNavBar/NavTabButton/index.js` | 0 | 0 | 0.0% | BAJA |
| `components/Popup/index.js` | 0 | 0 | 0.0% | BAJA |
| `components/ShortcutsGroup/Combos/index.ts` | 0 | 0 | 0.0% | BAJA |
| `components/ShortcutsGroup/Combos/Keys/index.ts` | 0 | 0 | 0.0% | BAJA |
| `components/ShortcutsGroup/index.ts` | 0 | 0 | 0.0% | BAJA |
| `routes/NotFound/index.js` | 0 | 0 | 0.0% | BAJA |
| `routes/Settings/components/Category/index.ts` | 0 | 0 | 0.0% | BAJA |
| `routes/Settings/components/Link/index.ts` | 0 | 0 | 0.0% | BAJA |
| `routes/Settings/components/Option/index.ts` | 0 | 0 | 0.0% | BAJA |
| `routes/Settings/components/Section/index.ts` | 0 | 0 | 0.0% | BAJA |
| `routes/Settings/General/index.ts` | 0 | 0 | 0.0% | BAJA |
| `routes/Settings/General/User/index.ts` | 0 | 0 | 0.0% | BAJA |
| `routes/Settings/index.ts` | 0 | 0 | 0.0% | BAJA |
| `routes/Settings/Info/index.ts` | 0 | 0 | 0.0% | BAJA |
| `routes/Settings/Interface/index.ts` | 0 | 0 | 0.0% | BAJA |
| `routes/Settings/Menu/index.ts` | 0 | 0 | 0.0% | BAJA |
| `routes/Settings/Shortcuts/index.ts` | 0 | 0 | 0.0% | BAJA |
| `services/index.js` | 7 | 0 | 0.0% | BAJA |

## Totales por grupo

| Grupo | Archivos | Total líneas no triviales (upstream) |
|---|---|---|
| ALTA | 75 | 1885 |
| MEDIA | 26 | 1024 |
| BAJA | 36 | 600 |
| **Total** | 137 | 3509 |
