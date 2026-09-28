# Clasificación MEDIA + BAJA (post-T2) — 2026-09-28

## Método

La tabla de similitud de R13 (137 archivos MODIFICADO) quedó obsoleta: T2 borró varios
archivos que estaban ahí (Library/LibItem/MetaItem/Multiselect/CONSTANTS.js) y R14 reescribió
o borró la mayoría de los 75 ALTA, corriendo el resto de porcentajes. Reclonné el mismo
checkout de referencia (`PBS-Panama/Pollux-app` branch `development` @ `091f94e8`, mismo commit
usado en R12/R13/R14 — el worktree anterior era de `/tmp` de la sesión pasada y ya no existe) y
recorrí TODO `interfaces/leto/src` actual con el mismo script de similitud (líneas no triviales,
mismo umbral 50%/20%). Universo: 98 archivos con equivalente real en `091f94e8` (antes: 137).

| Grupo | Archivos |
|---|---|
| ALTA (>50%) | 39 — ya cubiertos por R14 (29 excepciones documentadas + 10 nuevos por la resta de Library/recorte, mismo patrón: CSS de valor exacto, barrels triviales, tipos reflejando forma real) |
| MEDIA (20–50%) | 42 |
| BAJA (<20%) | 17 |

Nota: el "42 MEDIA" coincide con el número que había adelantado antes del corte de contexto.
El "47 BAJA" que mencioné en su momento no lo pude reconstruir — no quedó guardado en disco y el
recálculo da 17 BAJA reales + Calendar aparte (ver abajo). Uso este recálculo, hecho después de
T2 y con Calendar incluido, como fuente de verdad — es reproducible (script + checkout ambos
guardados) y verificable línea por línea.

## Regla aplicada (la que diste)

- **Columna A — nunca reescrito desde el fork:** el contenido que queda es literalmente el
  original (o el original menos algunas líneas borradas), sin ninguna decisión de diseño propia
  documentada. Se reescribe, como en ALTA.
- **Columna B — ya reescrito en R10-R14 o propio:** hay evidencia directa (comentario "R#,
  reescrito"/"segunda pasada", un comentario que documenta una decisión real, un dato que refleja
  el negocio de Pollux en vez del de Stremio, o un cambio de contrato/lógica verificable contra el
  original). Solo caza de código muerto, sin reescritura cosmética.

## Tabla — MEDIA (42)

| Archivo | Columna | Evidencia |
|---|---|---|
| `routes/Settings/Info/Info.tsx` | **A** | El JSX que quedaba era literal del original (solo se habían borrado 2 Options de streaming server) — ejecutado en este lote |
| `routes/Settings/components/Section/Section.tsx` | **A** | Estructura idéntica al original salvo renombre de 2 clases CSS — ejecutado en este lote |
| `common/useProfile.d.ts` | B | Tipo que refleja el shape real de settings de Pollux (`interfaceLanguage` único campo) — sin diseño alternativo válido |
| `components/MultiselectMenu/types.d.ts` | B | Comentario documenta campos (`id`/`destination`/`default`) sacados por 0 consumidores reales |
| `modules.d.ts` | B | Declara módulos ambient propios (`pollux/common/router`, `pollux/components/*`) — contenido no es el de Stremio |
| `common/animations.less` | B | Comentario documenta que solo `.animation-fade-in` tiene consumidor real, el resto (react-transition-group) se sacó |
| `routes/Settings/components/Option/Option.less` | B | Comentario documenta selectores muertos (`.icon`, `:global(.button)`, `:global(.color-input)`) sacados |
| `components/NavBar/VerticalNavBar/NavTabButton/NavTabButton.js` | B | Cabecera "R11, reescrito desde cero" |
| `index.js` (raíz `src/`) | B | Reescrito con funciones nombradas (`initSentry`/`disableTouchViewportOnDesktop`/`initI18n`/`renderApp`/`registerServiceWorker`) vs script plano del original; catálogo i18n propio (Fase 4) + `applyStoredTheme()` nuevo |
| `components/NavBar/HorizontalNavBar/HorizontalNavBar.js` | B | Cabecera "R11, reescrito desde cero" |
| `components/MultiselectMenu/Dropdown/Option/Option.tsx` | B | Cabecera "R14: segunda pasada" (SelectionIndicator extraído) |
| `components/NavBar/VerticalNavBar/NavTabButton/styles.less` | B | Comentario arquitectónico real (clases globales a propósito por restricción de CSS Modules) |
| `components/MainNavBars/MainNavBars.tsx` | B | Cabecera "R14: segunda pasada" (TOPBAR_CONFIG spreadeado) |
| `routes/Settings/components/Option/Option.tsx` | B | Comentario documenta `icon` sacado por 0 consumidores |
| `components/MultiselectMenu/Dropdown/Dropdown.tsx` | B | Contrato cambiado en R14 (recibe `onBack` armado en vez de `setLevel`) |
| `routes/Settings/Settings.tsx` | B | Comentario documenta un bug real corregido en `useScrollSpy` |
| `components/ModalDialog/ModalDialog.js` | B | Cabecera "R11, reescrito desde cero" |
| `components/NavBar/HorizontalNavBar/styles.less` | B | Comentario "replica of Mannat's .topbar" — diseño propio, no de Stremio |
| `common/Shortcuts/Shortcuts.tsx` | B | Comentario documenta API de suscripción on/off sacada por 0 consumidores |
| `components/ShortcutsGroup/ShortcutsGroup.tsx` | B | Contrato cambiado en R14 (recibe `group` completo en vez de `label`/`shortcuts`) |
| `common/useLanguageSorting.ts` | B | Comentario documenta campos (`userLangCode`/`isLanguageDropdown`) sacados por 0 consumidores |
| `routes/Settings/Menu/Menu.tsx` | B | `MENU_ITEMS` array-driven vs 5 botones hardcodeados del original; campos de streaming server/shell sacados |
| `common/useFullscreen.ts` | B | Cabecera "R6... R8..." |
| `App/ShortcutsModal/ShortcutsModal.tsx` | B | Cabecera "R11, reescrito desde cero" |
| `components/NavBar/HorizontalNavBar/NavMenu/NavMenuContent.js` | B | Cabecera "R11, reescrito desde cero" |
| `routes/Settings/Shortcuts/Shortcuts.tsx` | B | Consumidor actualizado al nuevo contrato de `ShortcutsGroup` (R14) |
| `routes/Settings/Interface/Interface.tsx` | B | `Toggle`/`shell`/quitOnClose/escExitFullscreen/hideSpoilers sacados; `ThemeSwitcher` (propio) agregado |
| `components/Popup/Popup.js` | B | Cabecera "R11, reescrito desde cero" |
| `routes/Settings/Interface/useInterfaceOptions.ts` | B | Comentario "R2 fix, still true post-R8" |
| `components/Image/Image.tsx` | B | Cabecera "R11, reescrita desde cero" |
| `routes/NotFound/NotFound.js` | B | Cabecera "R11, reescrita desde cero" |
| `routes/Settings/components/Link/Link.tsx` | B | Reescrito con unión discriminada (R14 — historia del bug de `target`/`onClick` documentada) |
| `common/usePWA.js` | B | `useState(detectStandalone)` extraído vs `useMemo` inline del original, con razón documentada |
| `common/index.js` | B | Barrel de hooks/módulos propios de Pollux (useProfile, theme, routesRegexp...) |
| `common/useBinaryState.js` | B | `toggle` con functional update — corrige closure stale que tiene el original |
| `components/index.ts` | B | Barrel del set de componentes reales de Pollux (sin nada de la era CoreSuspender) |
| `routes/index.js` | B | Comentario "Company interface — only company-side routes" — rutas propias |
| `common/routesRegexp.js` | B | Cabecera "PBS Crewing Module - Route definitions" — regexps son rutas propias de Pollux |
| `common/useOutsideClick.ts` | B | `callbackRef` en vez de `deps=[callback]` del original — razón documentada (evita resubscribe) |
| `components/ShortcutsGroup/Combos/Keys/Keys.tsx` | B | Usa `withTrailingSeparator` (R14, nuevo) + lógica de rango numérico propia ("1 to N") |
| `App/routerViewsConfig.js` | B | Comentario "route-to-component mapping (company tabs only)" |
| `routes/Settings/General/User/User.tsx` | B | Comentario "same fix as NavMenuContent.js" — identidad real de Pollux, no la de Stremio |

## Tabla — BAJA (17)

| Archivo | Columna | Evidencia |
|---|---|---|
| `App/withProtectedRoutes.js` | B | Comentario "Stremio auth removed — pure passthrough" |
| `routes/NotFound/styles.less` | B | Cabecera "R11" |
| `App/App.js` | B | Cabecera "R8... R11..." (múltiples fases documentadas) |
| `common/Shortcuts/shortcuts.json` | B | Dato propio — 1 grupo, atajos reales de Pollux (1-5, no los de Stremio) |
| `common/Platform/Platform.tsx` | B | `WHITELISTED_HOSTS`/`openExternal`/`name` sacados (documentado en `device.ts`) |
| `routes/Settings/General/General.tsx` | B | Comentario extenso documentando remoción completa del boilerplate Stremio (Trakt, GitHub, Zendesk, Terms/Privacy de stremio.com) |
| `common/Platform/device.ts` | B | Comentario documenta `name`/`openExternal` sacados por 0 consumidores |
| `common/useProfile.js` | B | Cabecera "R8" |
| `common/CoreSuspender.js` | B | Cabecera "R8" |
| `common/interfaceLanguages.json` | B | Dato propio — 3 idiomas reales de Pollux vs ~30 idiomas de Stremio en el original |
| `App/index.js` | B | Barrel trivial (`module.exports = require('./App')`) |
| `common/Platform/index.ts` | B | Barrel trivial |
| `common/Shortcuts/index.ts` | B | Barrel trivial |
| `common/useBinaryState.d.ts` | B | Shim de tipos, sin margen de diseño (dicta la firma real del hook) |
| `routes/Settings/components/index.ts` | B | Barrel trivial |
| `services/index.js` | B | Cabecera "R11, reescrito desde cero" + nota T2 |
| `routes/Calendar/Calendar.tsx` | — | Ver sección Calendar abajo (solo clasificado, no tocado) |

## Calendar — solo clasificado, NO tocado

Por instrucción explícita: si Calendar tiene código original de Stremio, avisar antes de tocar.
Encontré esto, lo reporto antes de ejecutar nada:

- **`routes/Calendar/Calendar.tsx`** — BAJA, 11.1% (4/36 líneas compartidas). Ya tiene lógica de
  negocio real de Pollux (scheduling de tripulación). Columna B si se ejecutara.
- **`routes/Calendar/Calendar.less`** — **ALTA, 66.7% (12/18 líneas compartidas)**. Revisé las 12
  líneas compartidas una por una: son puramente genéricas (`display: flex`, `gap`, `width: 100%`,
  `height: 100%`, `flex-direction`, una media query) — el mismo patrón de CSS-de-valor-exacto que
  ya documentamos como techo real en Button.less/Dropdown.less/etc. No hay lógica ni texto de
  Stremio, solo declaraciones de layout que cualquier grid responsive compartiría. El archivo ya
  pasó por el mismo "fix de colores" que Settings/Board/Discover (comentario propio en la
  cabecera). No encontré nada que sea genuinamente código Stremio (lógica, textos, IDs de
  producto), pero técnicamente cae en el rango ALTA por superposición de líneas genéricas.
- **`routes/Calendar/calendarData.js`** — sin equivalente en `091f94e8`, 100% propio.
- **`routes/Calendar/index.ts`** — barrel, sin equivalente relevante.

**No toqué ninguno de los 4.** Quedo a la espera de que digas si Calendar.less entra en la
ejecución de columna A (sería una reescritura de nombres de clase CSS, sin tocar lógica ni
layout) o si preferís que Calendar quede completamente fuera de esta fase hasta que hagas el
backend real.

## Ejecutado — Lote 1 de columna A (2 archivos)

- **`routes/Settings/components/Section/Section.tsx`** — reescrito: se extrajo un subcomponente
  `SectionHeading` (antes era un `<div>` inline condicionado con `&&`), el className se computa
  en una variable nombrada, y el condicional pasó de `&&` a ternario con `null` explícito.
- **`routes/Settings/Info/Info.tsx`** — reescrito: se extrajo `VERSION_ROWS` (array de
  `{labelKey, value}`) y un `.map()` en vez de listar los 2 `<Option>` literales — mismo patrón ya
  usado en `MainNavBars.tsx` (TOPBAR_CONFIG) y `Settings/Menu/Menu.tsx` (MENU_ITEMS).

**Verificación:** grep de los nombres nuevos (`SectionHeading`, `VERSION_ROWS`) confirma que solo
se usan dentro de su propio archivo, sin fugas. `tsc --noEmit`: 93 errores (mismo número que el
baseline post-T2, 0 nuevos). Build (`docker compose up -d --build leto nginx`) OK. Smoke ajustado:
**11/11 pantallas OK**.

## Estado y pendiente

- Columna A de MEDIA/BAJA: **completa** (eran solo estos 2 archivos — la gran mayoría de
  MEDIA/BAJA ya tenía evidencia de reescritura o era dato/estructura propia, tal como anticipé
  antes del corte).
- Columna B: sin acción por ahora — la caza de código muerto dentro de columna B (0 consumidores
  reales de algo que sigue vivo) no se hizo todavía; si querés que la ejecute como paso separado,
  decime.
- Calendar: clasificado, sin tocar, a la espera de tu decisión sobre `Calendar.less`.
