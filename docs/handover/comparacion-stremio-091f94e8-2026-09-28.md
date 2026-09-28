# Comparación interfaces/leto/src vs stremio-web @ 091f94e8 (R12)

Generado el 2026-09-28. Fuente: `git clone --branch development
https://github.com/PBS-Panama/Pollux-app.git` + `git worktree add ... 091f94e8`
(commit "Merge pull request #1140 from Stremio/fix/apple-pwa-status-bar-color"),
solo lectura, en `/tmp` (fuera del repo, sin push). El `src/` de ese checkout
es la raíz de comparación (equivale a `interfaces/leto/src/` en Pollux).

**Método:** mismo path relativo dentro de `src/` → comparación byte a byte.
- `IDENTICO`: archivo idéntico al de stremio-web.
- `MODIFICADO`: existe en stremio-web en el mismo path, pero el contenido
  difiere (desde "solo cambió un import" hasta "reescrito casi entero").
- `SIN_EQUIVALENTE`: no existe ningún archivo en ese path en stremio-web
  (puede ser código 100% nuevo de Pollux, o código relocalizado a otra
  carpeta — ver nota sobre `common/router/*` abajo).
- `FROZEN`: `MetaItem`, `LibItem`, `routes/Library`, `routes/Calendar` —
  congelados por decisión de Rick, no se compararon en profundidad.

**Aviso importante sobre `common/router/*`:** el comparador de paths los
marca `SIN_EQUIVALENTE` porque el router de stremio-web vive en
`src/router/` (nivel raíz: `Router/`, `Route/`, `Modal/`,
`RouteFocusedContext/`, `ModalsContainerContext/`, `styles.css`), no en
`src/common/router/` — la reubicación fue mía (R10). El path no coincide,
pero el ANCESTRO SÍ existe. Comparé a mano contra esos archivos reales:
`Router.js`/`routeMatching.js`/`context.js` quedan genuinamente distintos
(un solo pase de regex en vez de dos, sin `onRouteChange`/`queryParams`/
`react-is`/`fast-equals`, contextos fusionados). Pero **`Modal.js` y
`styles.css` son funcionalmente idénticos al original** (`router/Modal/
Modal.js`, `router/styles.css`) — solo cambia el comentario de cabecera y
el import path. Esto es del router que ya diste por aceptado en R11 Parte
B; lo marco acá porque lo encontré haciendo esta comparación, no porque me
lo hayan pedido en R12. Decime si lo tengo que tocar ahora o en otra fase.

## Tabla completa (206 archivos en `interfaces/leto/src`)

| Archivo | Veredicto |
|---|---|
| `App/App.js` | MODIFICADO |
| `App/index.js` | IDENTICO |
| `App/routerViewsConfig.js` | MODIFICADO |
| `App/ShortcutsModal/index.ts` | MODIFICADO |
| `App/ShortcutsModal/ShortcutsModal.tsx` | MODIFICADO |
| `App/ShortcutsModal/styles.less` | MODIFICADO |
| `App/styles.less` | MODIFICADO |
| `App/withProtectedRoutes.js` | MODIFICADO |
| `assets/iconoir.css` | SIN_EQUIVALENTE |
| `assets/pollux-colors.less` | SIN_EQUIVALENTE |
| `common/animations.less` | IDENTICO |
| `common/CONSTANTS.js` | MODIFICADO |
| `common/CoreSuspender.js` | MODIFICADO |
| `common/crewData.js` | SIN_EQUIVALENTE |
| `common/crewDocData.js` | SIN_EQUIVALENTE |
| `common/crewStore.js` | SIN_EQUIVALENTE |
| `common/Icon/index.js` | SIN_EQUIVALENTE |
| `common/index.js` | MODIFICADO |
| `common/interfaceLanguages.json` | MODIFICADO |
| `common/Platform/device.ts` | MODIFICADO |
| `common/Platform/index.ts` | MODIFICADO |
| `common/Platform/Platform.tsx` | MODIFICADO |
| `common/profileData/airports_by_country.json` | SIN_EQUIVALENTE |
| `common/profileData/countries_world.json` | SIN_EQUIVALENTE |
| `common/profileData/languages_profile.json` | SIN_EQUIVALENTE |
| `common/profileData/panama_companies.json` | SIN_EQUIVALENTE |
| `common/profileData/provinces_by_country.json` | SIN_EQUIVALENTE |
| `common/profileData/training_centers_panama.json` | SIN_EQUIVALENTE |
| `common/profileData/vessel_types.json` | SIN_EQUIVALENTE |
| `common/router/context.js` | SIN_EQUIVALENTE |
| `common/router/index.js` | SIN_EQUIVALENTE |
| `common/router/Modal.js` | SIN_EQUIVALENTE |
| `common/router/routeMatching.js` | SIN_EQUIVALENTE |
| `common/router/Router.js` | SIN_EQUIVALENTE |
| `common/router/styles.css` | SIN_EQUIVALENTE |
| `common/routesRegexp.js` | MODIFICADO |
| `common/screen-sizes.less` | IDENTICO |
| `common/seafarerStore.js` | SIN_EQUIVALENTE |
| `common/Shortcuts/index.ts` | MODIFICADO |
| `common/Shortcuts/onShortcut.ts` | MODIFICADO |
| `common/Shortcuts/shortcuts.json` | MODIFICADO |
| `common/Shortcuts/Shortcuts.tsx` | MODIFICADO |
| `common/Shortcuts/types.d.ts` | MODIFICADO |
| `common/theme.ts` | SIN_EQUIVALENTE |
| `common/translations/en.json` | SIN_EQUIVALENTE |
| `common/translations/es.json` | SIN_EQUIVALENTE |
| `common/translations/pt.json` | SIN_EQUIVALENTE |
| `common/useBinaryState.d.ts` | MODIFICADO |
| `common/useBinaryState.js` | MODIFICADO |
| `common/useFullscreen.ts` | MODIFICADO |
| `common/useLanguageSorting.ts` | MODIFICADO |
| `common/useOutsideClick.ts` | MODIFICADO |
| `common/useProfile.d.ts` | MODIFICADO |
| `common/useProfile.js` | MODIFICADO |
| `common/usePWA.js` | MODIFICADO |
| `components/Button/Button.less` | MODIFICADO |
| `components/Button/Button.tsx` | MODIFICADO |
| `components/Button/index.ts` | MODIFICADO |
| `components/Image/Image.tsx` | MODIFICADO |
| `components/Image/index.ts` | MODIFICADO |
| `components/index.ts` | MODIFICADO |
| `components/LibItem/index.js` | FROZEN |
| `components/LibItem/LibItem.js` | FROZEN |
| `components/MainNavBars/index.ts` | IDENTICO |
| `components/MainNavBars/MainNavBars.less` | MODIFICADO |
| `components/MainNavBars/MainNavBars.tsx` | MODIFICADO |
| `components/MetaItem/index.js` | FROZEN |
| `components/MetaItem/MetaItem.js` | FROZEN |
| `components/MetaItem/styles.less` | FROZEN |
| `components/ModalDialog/index.js` | MODIFICADO |
| `components/ModalDialog/ModalDialog.js` | MODIFICADO |
| `components/ModalDialog/styles.less` | MODIFICADO |
| `components/Multiselect/index.js` | IDENTICO |
| `components/MultiselectMenu/Dropdown/Dropdown.less` | MODIFICADO |
| `components/MultiselectMenu/Dropdown/Dropdown.tsx` | MODIFICADO |
| `components/MultiselectMenu/Dropdown/index.ts` | IDENTICO |
| `components/MultiselectMenu/Dropdown/Option/index.ts` | IDENTICO |
| `components/MultiselectMenu/Dropdown/Option/Option.less` | MODIFICADO |
| `components/MultiselectMenu/Dropdown/Option/Option.tsx` | MODIFICADO |
| `components/MultiselectMenu/index.ts` | IDENTICO |
| `components/MultiselectMenu/MultiselectMenu.less` | IDENTICO |
| `components/MultiselectMenu/MultiselectMenu.tsx` | MODIFICADO |
| `components/MultiselectMenu/types.d.ts` | MODIFICADO |
| `components/Multiselect/Multiselect.js` | MODIFICADO |
| `components/Multiselect/styles.less` | MODIFICADO |
| `components/NavBar/HorizontalNavBar/HorizontalNavBar.js` | MODIFICADO |
| `components/NavBar/HorizontalNavBar/index.js` | MODIFICADO |
| `components/NavBar/HorizontalNavBar/NavMenu/index.js` | MODIFICADO |
| `components/NavBar/HorizontalNavBar/NavMenu/NavMenuContent.js` | MODIFICADO |
| `components/NavBar/HorizontalNavBar/NavMenu/NavMenu.js` | MODIFICADO |
| `components/NavBar/HorizontalNavBar/NavMenu/styles.less` | MODIFICADO |
| `components/NavBar/HorizontalNavBar/NotificationBell.tsx` | SIN_EQUIVALENTE |
| `components/NavBar/HorizontalNavBar/styles.less` | MODIFICADO |
| `components/NavBar/index.js` | MODIFICADO |
| `components/NavBar/VerticalNavBar/index.js` | MODIFICADO |
| `components/NavBar/VerticalNavBar/NavTabButton/index.js` | MODIFICADO |
| `components/NavBar/VerticalNavBar/NavTabButton/NavTabButton.js` | MODIFICADO |
| `components/NavBar/VerticalNavBar/NavTabButton/styles.less` | MODIFICADO |
| `components/NavBar/VerticalNavBar/styles.less` | MODIFICADO |
| `components/NavBar/VerticalNavBar/VerticalNavBar.js` | MODIFICADO |
| `components/Popup/index.js` | MODIFICADO |
| `components/Popup/Popup.js` | MODIFICADO |
| `components/Popup/styles.less` | MODIFICADO |
| `components/ShortcutsGroup/Combos/Combos.less` | MODIFICADO |
| `components/ShortcutsGroup/Combos/Combos.tsx` | MODIFICADO |
| `components/ShortcutsGroup/Combos/index.ts` | MODIFICADO |
| `components/ShortcutsGroup/Combos/Keys/index.ts` | MODIFICADO |
| `components/ShortcutsGroup/Combos/Keys/Keys.less` | MODIFICADO |
| `components/ShortcutsGroup/Combos/Keys/Keys.tsx` | MODIFICADO |
| `components/ShortcutsGroup/index.ts` | MODIFICADO |
| `components/ShortcutsGroup/ShortcutsGroup.less` | MODIFICADO |
| `components/ShortcutsGroup/ShortcutsGroup.tsx` | MODIFICADO |
| `components/TextInput/index.ts` | IDENTICO |
| `components/TextInput/styles.less` | IDENTICO |
| `components/TextInput/TextInput.tsx` | MODIFICADO |
| `index.html` | MODIFICADO |
| `index.js` | MODIFICADO |
| `modules.d.ts` | MODIFICADO |
| `routes/Calendar/calendarData.js` | FROZEN |
| `routes/Calendar/Calendar.less` | FROZEN |
| `routes/Calendar/Calendar.tsx` | FROZEN |
| `routes/Calendar/index.ts` | FROZEN |
| `routes/CompanyDashboard/CompanyDashboard.js` | SIN_EQUIVALENTE |
| `routes/CompanyDashboard/index.js` | SIN_EQUIVALENTE |
| `routes/CompanyDashboard/styles.less` | SIN_EQUIVALENTE |
| `routes/CompanyDashboard/useCompanyDashboard.js` | SIN_EQUIVALENTE |
| `routes/index.js` | MODIFICADO |
| `routes/Library/index.js` | FROZEN |
| `routes/Library/Library.js` | FROZEN |
| `routes/Library/Placeholder/index.ts` | FROZEN |
| `routes/Library/Placeholder/Placeholder.less` | FROZEN |
| `routes/Library/Placeholder/Placeholder.tsx` | FROZEN |
| `routes/Library/styles.less` | FROZEN |
| `routes/Library/useDocumentUpload.js` | FROZEN |
| `routes/MyFleet/index.js` | SIN_EQUIVALENTE |
| `routes/MyFleet/MyFleet.js` | SIN_EQUIVALENTE |
| `routes/MyFleet/styles.less` | SIN_EQUIVALENTE |
| `routes/NotFound/index.js` | MODIFICADO |
| `routes/NotFound/NotFound.js` | MODIFICADO |
| `routes/NotFound/styles.less` | MODIFICADO |
| `routes/SeafarerProfile/index.js` | SIN_EQUIVALENTE |
| `routes/SeafarerProfile/SeafarerProfile.js` | SIN_EQUIVALENTE |
| `routes/SeafarerProfile/styles.less` | SIN_EQUIVALENTE |
| `routes/SeafarerProfile/useSeafarerProfile.js` | SIN_EQUIVALENTE |
| `routes/SeafarerSearch/index.js` | SIN_EQUIVALENTE |
| `routes/SeafarerSearch/SeafarerSearch.js` | SIN_EQUIVALENTE |
| `routes/SeafarerSearch/styles.less` | SIN_EQUIVALENTE |
| `routes/SeafarerSearch/useSeafarerSearch.js` | SIN_EQUIVALENTE |
| `routes/Settings/components/Category/Category.less` | MODIFICADO |
| `routes/Settings/components/Category/Category.tsx` | MODIFICADO |
| `routes/Settings/components/Category/index.ts` | MODIFICADO |
| `routes/Settings/components/index.ts` | MODIFICADO |
| `routes/Settings/components/Link/index.ts` | MODIFICADO |
| `routes/Settings/components/Link/Link.less` | MODIFICADO |
| `routes/Settings/components/Link/Link.tsx` | MODIFICADO |
| `routes/Settings/components/Option/index.ts` | MODIFICADO |
| `routes/Settings/components/Option/Option.less` | MODIFICADO |
| `routes/Settings/components/Option/Option.tsx` | MODIFICADO |
| `routes/Settings/components/Section/index.ts` | MODIFICADO |
| `routes/Settings/components/Section/Section.less` | MODIFICADO |
| `routes/Settings/components/Section/Section.tsx` | MODIFICADO |
| `routes/Settings/constants.ts` | MODIFICADO |
| `routes/Settings/General/General.less` | MODIFICADO |
| `routes/Settings/General/General.tsx` | MODIFICADO |
| `routes/Settings/General/index.ts` | MODIFICADO |
| `routes/Settings/General/User/index.ts` | MODIFICADO |
| `routes/Settings/General/User/User.less` | MODIFICADO |
| `routes/Settings/General/User/User.tsx` | MODIFICADO |
| `routes/Settings/index.ts` | MODIFICADO |
| `routes/Settings/Info/index.ts` | MODIFICADO |
| `routes/Settings/Info/Info.less` | MODIFICADO |
| `routes/Settings/Info/Info.tsx` | MODIFICADO |
| `routes/Settings/Interface/index.ts` | MODIFICADO |
| `routes/Settings/Interface/Interface.tsx` | MODIFICADO |
| `routes/Settings/Interface/ThemeSwitcher.less` | SIN_EQUIVALENTE |
| `routes/Settings/Interface/ThemeSwitcher.tsx` | SIN_EQUIVALENTE |
| `routes/Settings/Interface/useInterfaceOptions.ts` | MODIFICADO |
| `routes/Settings/Menu/index.ts` | MODIFICADO |
| `routes/Settings/Menu/Menu.less` | MODIFICADO |
| `routes/Settings/Menu/Menu.tsx` | MODIFICADO |
| `routes/Settings/Settings.less` | MODIFICADO |
| `routes/Settings/Settings.tsx` | MODIFICADO |
| `routes/Settings/Shortcuts/index.ts` | MODIFICADO |
| `routes/Settings/Shortcuts/Shortcuts.less` | MODIFICADO |
| `routes/Settings/Shortcuts/Shortcuts.tsx` | MODIFICADO |
| `services/index.js` | MODIFICADO |
| `types/Addon.d.ts` | MODIFICADO |
| `types/LibraryItem.d.ts` | MODIFICADO |
| `types/MetaItem.d.ts` | MODIFICADO |
| `types/models/Board.d.ts` | MODIFICADO |
| `types/models/Calendar.d.ts` | MODIFICADO |
| `types/models/CatalogsWithExtra.d.ts` | MODIFICADO |
| `types/models/DataExport.d.ts` | MODIFICADO |
| `types/models/Discover.d.ts` | MODIFICADO |
| `types/models/InstalledAddons.d.ts` | MODIFICADO |
| `types/models/Library.d.ts` | MODIFICADO |
| `types/models/LocalSearch.d.ts` | MODIFICADO |
| `types/models/MetaDetails.d.ts` | MODIFICADO |
| `types/models/Player.d.ts` | MODIFICADO |
| `types/models/RemoteAddons.d.ts` | MODIFICADO |
| `types/models/Search.d.ts` | MODIFICADO |
| `types/models/StremingServer.d.ts` | MODIFICADO |
| `types/Selectable.d.ts` | MODIFICADO |
| `types/Stream.d.ts` | MODIFICADO |
| `types/types.d.ts` | MODIFICADO |
| `types/Video.d.ts` | MODIFICADO |
