# Resumen fase por fase — limpieza Stremio/GPL en Pollux (hasta R13)

Fuente: `docs/handover/notas-pendientes-2026-09-28.md`. Cubre desde "Coordinación con Dominius"
hasta R13 (línea ~1924). R14, T1, T2, index.html raíz y la clasificación MEDIA/BAJA están
cubiertos en documentos separados (`r14-*.md`, `clasificacion-media-baja-2026-09-28.md`).

### Coordinación con Dominius (previo a R1)
Verificación de que el rewrite de historial de Dominius en `main` no perdió trabajo: los 330
archivos de cambios de Pollux seguían intactos en el working tree, sin commitear. Sin acción de
limpieza de código en este punto — solo verificación de estado de git.

### R1
- **Borrado:** `routes/Intro/` completa, `routes/Search/` completa, una versión fantasma vieja de
  Calendar (8 archivos: `useCalendar.ts`, `useCalendarDate.ts`, `Selector/`, `List/`, `Table/`,
  `Details/`, `Placeholder/`, `examData.js` — 0 importadores confirmado), y ~1233 líneas ya muertas
  (componentes `BottomSheet`/`Chips`/`ColorInput`/`RadioButton`/`Slider` + varios hooks/utils de
  `common/`).
- **No se tocó a propósito:** `Checkbox` (huérfano nuevo, fuera de alcance), `useDataExport.*`
  (para R2), `routes/Library/Placeholder/` (para cuando tocara Library).
- **Hallazgo:** al borrar Search, `SearchBar.js` (componente compartido) y el atajo "0" quedaron
  apuntando a una ruta muerta — no se corrigió en R1 (fuera de su alcance), documentado para R2.
- Verificado con build + grep (sin navegador real en esta fase).

### R2
- **Bug de causa raíz encontrado y corregido:** `CoreTransport.js` (el dispatcher heredado de
  Stremio) solo interceptaba `Load`/`MetaDetails` — cualquier otra acción, incluido guardar
  configuración de idioma, se perdía en silencio. Se agregó manejo real de
  `Ctx/UpdateSettings` con persistencia en `localStorage`.
- **Reescrito/arreglado:** selector de idioma (persiste de verdad ahora), toggle "blur unwatched
  image" (persiste, aunque su único consumidor real —`Video.js`— es código heredado que se borra
  en R3).
- **Atajos:** de 5 solo 3 tenían acción real (`navigateTabs`, `fullscreen`, `shortcuts`) — se
  sacaron los otros 2 (`navigateSearch`, `exit`/Escape — este último nunca podía activarse porque
  su toggle dependía del shell de escritorio de Stremio, inexistente en la web).
- **Decisión de diseño:** `SearchBar` compartida se ocultó en TODAS las pantallas (no solo
  MyFleet) en vez de conectarla a un filtro real — evaluado el filtro real y descartado por
  requerir arquitectura nueva (estado compartido) para un input sin destino funcional hoy.

### R3
- **Hallazgo urgente (bug de R1):** `MetaPreview.js` (usado de verdad por `Discover.js`) tenía una
  constante a nivel de módulo que referenciaba `routesRegexp.search` — borrado en R1 — lo que
  producía un `TypeError` al cargar el bundle en un navegador real. No lo detectaban build/grep
  porque ninguno ejecuta el JS. Corregido (línea borrada, sin otro uso).
- **Reescrito desde cero:** `MetaDetails` → `routes/SeafarerProfile/` (perfil de tripulante),
  fetch directo a 3 endpoints reales del backend (perfil, historial de embarques, descarga de CV),
  sin pasar por el modelo `meta_details` de CoreTransport. Ruta nueva `#/seafarer/{id}`, con
  compatibilidad hacia atrás para las URLs viejas (`#/metadetails/crew/{id}`, `#/detail/crew/{id}`)
  mapeadas al mismo componente.
- **Borrado:** `routes/MetaDetails/` completa (36 archivos: `useMetaDetails`, `useSeason`,
  `EpisodePicker`, `VideosList`, `StreamsList`, etc.), `components/Video/` completa (6 archivos).
  `MetaPreview/` se dejó viva a propósito (Discover todavía la usa; se borra en R4/R5) — desviación
  documentada de la instrucción original de borrarla junto con la ruta vieja.
- Toggle de blur sacado por completo (0 consumidores tras borrar Video.js).

### R3b
Smoke test con navegador real (Playwright/Chromium en contenedor Docker oficial) corrido por
primera vez sobre el estado acumulado de R1-R3 — primera verificación real en navegador de todo lo
anterior (que hasta ese punto solo se había verificado con build/grep, sin ejecutar el JS).
### R4
- **Borrado:** Chromecast completo (`services/Chromecast/`, script `cast_sender.js` del `index.html`,
  campo huérfano en `CONSTANTS.js`); `routes/Board/` completo (reescrito, ver abajo);
  `components/MetaRow/`, `components/ContinueWatchingItem/`, `components/EventModal/` (confirmado
  que Calendar tiene su propio `EventModal` local, no el borrado); modelo `board` y
  `continue_watching_preview` de `CoreTransport.js`.
- **Reescrito desde cero:** `Board` → `routes/CompanyDashboard/` — fetch directo al backend (sin
  CoreTransport), 3 métricas reales, tarjetas de tripulación propias, modal de "perfil rápido" que
  reutiliza `SeafarerProfilePanel` de R3 (evita duplicar lógica).
- **Bug encontrado y corregido:** `services/Shell/Shell.js` (detección del shell de escritorio Qt/
  Electron de Stremio) tiraba un error de consola en TODA carga completa de página — no relacionado
  al pedido de R4, se corrigió acotado (se saca en R5 por completo).
- URL vieja del Board no necesitó redirect aparte — se mapeó la misma regexp al componente nuevo.

### R5
- **Borrado:** `services/Shell/` completo (detección shell de escritorio Stremio), `App/UpdaterBanner/`
  completo (banner de auto-updater de escritorio, sin sentido en web), 2 toggles de Settings/Interface
  que dependían de `shell.active` (nunca se mostraban en navegador real, y escribían a campos que ni
  existían en el estado — código muerto desde antes de esta fase); `routes/Discover/` completo
  (reescrito, ver abajo); `components/MetaPreview/` completo (13 archivos), `components/AddonDetailsModal/`
  completo, `components/Toggle/` completo (huérfano tras sacar los 2 toggles).
- **Reescrito desde cero:** `Discover` → `routes/SeafarerSearch/` — filtros armados con los valores
  reales que trae el backend (antes usaba listas fijas de Stremio que no coincidían con los datos
  reales de Pollux).
- **"Add to Roster" conectado a un endpoint real** (`POST /api/company/staff`, el mismo que ya usa
  MyFleet) — antes era un dispatch a CoreTransport que no hacía nada (acción no manejada).
- Decisión explícita de NO tocar `common/useShell.ts` (hook de WebView2, inerte en navegador, pedido
  era específicamente "Shell.js") — quedó pendiente de confirmación del PM.
- Verificado con smoke test extendido: flujo real de "Add to Roster" con reversión del dato de
  prueba tras cada corrida (nunca deja contrataciones de prueba acumuladas en la DB).

### Respuesta del PM entre R5 y R6
Confirmó, leyendo el código del backend, que el flujo de "Add to Roster + revertir" de R5 nunca
acumula filas de prueba en la DB (reutiliza la misma fila, alterna su estado). Se agregó un guard
de host al smoke test: si `PBS_SMOKE_BASE_URL` no apunta a localhost, el script se niega a correr
(evita ejecutar el flujo de hire/revert real contra un host que no sea local).

### R6
- **Borrado:** `common/useShell.ts` (hook de `chrome.webview`/WebView2, inerte en cualquier
  navegador real) y todo lo que dependía de él en `App.js` (listener de `open-media`, lógica de
  `shell.send('quit')` ya inerte desde R5), más `CONSTANTS.PROTOCOL` (huérfana tras esto).
- **Reescrito:** `common/useFullscreen.ts` — se sacó la rama `shell.active` (nunca se ejecutaba en
  un navegador real), quedó solo la Fullscreen API nativa del navegador, mismo comportamiento
  visible.
- **Inventario completo** de todo `interfaces/leto/` restante (solo lectura, sin cambios de
  código), clasificado en 3 categorías:
  - **BORRAR** (código Stremio sin ningún uso real hoy) ≈ 1.520 líneas: `App/DeepLinkHandler.js`,
    `App/SearchParamsHandler.js`, `App/ServicesToaster.js`, `common/useStreamingServer.*`,
    `common/useTorrent.js`, `common/useTranslate.js`, `common/useOnScrollToBottom.js`,
    `common/FileDrop/*`, `services/DragAndDrop/*`, varios componentes huérfanos
    (`Checkbox`/`ContextMenu`/`DelayedRenderer`/`HorizontalScroll`/`NumberInput`/`Transition`),
    `components/NavBar/HorizontalNavBar/SearchBar/*` (nunca se monta desde R2),
    `components/SharePrompt/*`.
  - **REESCRIBIR** (uso real pero estructura heredada de Stremio) ≈ 1.500 líneas:
    `common/useProfile.js`, `common/CONSTANTS.js`, `services/Core/Core.js`,
    `common/translations/*.json` (**solo 55 de 220 claves, 25%, tenían uso real** en ese momento),
    `components/Multiselect/`, `components/MetaItem/`, `components/LibItem/` (estos 2 últimos
    atados a la decisión pendiente sobre Library).
  - **YA PROPIO** ≈ 3.800+ líneas: el resto (genérico, sin residuo de lógica Stremio, o ya
    reescrito en fases anteriores).
  - Hallazgos sueltos: `src/types/global.d.ts` 100% huérfano (tipos de Shell/useShell ya borrados),
    varios modelos sin consumidor en `DEFAULT_STATES` de `CoreTransport.js`, `magnet-uri` como
    dependencia huérfana de `package.json`.
- Library y Calendar quedaron **solo inventariados, sin decisión** en esta fase — Library con la
  observación de que es un stub ("Subida de documentos: próximamente"); Calendar confirmado real y
  funcional, sin dependencia relevante de CoreTransport.

### R7 — todo el bloque BORRAR del inventario
- **Borrado (49 archivos):** todo lo listado como BORRAR en R6 (`DeepLinkHandler`,
  `SearchParamsHandler`, `ServicesToaster`, `useStreamingServer`, `useTorrent`, `useTranslate`,
  `useOnScrollToBottom`, `FileDrop/`, `DragAndDrop/`, `Checkbox`, `ContextMenu`, `DelayedRenderer`,
  `NumberInput`, `Transition`, `SharePrompt`, `HorizontalScroll` (confirmado 0 consumidores),
  `src/types/global.d.ts`), más un hallazgo no listado: una SEGUNDA carpeta `SearchBar` duplicada
  y también huérfana (`components/SearchBar/`, distinta de la del NavBar) — se borraron ambas.
- 5 rutas huérfanas sacadas de `routesRegexp.js`, 9 modelos sin consumidor sacados de
  `DEFAULT_STATES` de `CoreTransport.js`.
- **Dependencias npm huérfanas sacadas:** `magnet-uri`, y además (encontradas de paso con grep
  exacto) `hat`, `langs`, `a-color-picker`, `@types/hat` — lockfile regenerado en contenedor.
- **No tocado, a propósito:** `MetaItem/`, `LibItem/`, `routes/Library/`, `routes/Calendar/` (orden
  explícita del PM); `buffer` en `package.json` (depende de `webpack.config.js`, fuera de alcance
  de esta fase).

### R8 — bloque REESCRIBIR: Core/CoreTransport, useProfile, CONSTANTS, traducciones, Multiselect, webpack
- **Borrado por completo:** `services/Core/` (7 archivos, `Core.js`+`CoreTransport.js`+tipos) — no
  se reemplazó por ninguna "capa mínima" porque no hacía falta: su único consumidor real
  (`useProfile.js`) pasó a leer/escribir `localStorage` directo. También `App/ErrorDialog/` (3
  archivos, su único trigger — `core.error`— ya no podía pasar), `common/useModelState.js` (77
  líneas, mecanismo pub/sub genérico de Stremio sin consumidor), `common/useSettings.ts`,
  `routes/Settings/General/useDataExport.*` (pestaña que ya no existe en la UI),
  `types/models/Ctx.d.ts` (89 líneas, ningún consumidor tras lo anterior).
- **Reescrito:** `App/App.js` (sin gate de carga, sin overhead de eventos que CoreTransport nunca
  emitía); `common/useProfile.js` (de wrapper de CoreTransport a lectura/escritura directa de
  `localStorage`, con mejora real: el idioma persistido se aplica desde el primer render, ya no
  hay parpadeo); `common/useFullscreen.ts`, `common/CoreSuspender.js` (79→20 líneas);
  `common/CONSTANTS.js` (**18 exports → 1**, `ICON_FOR_TYPE`, la única con consumidor real —
  `MetaItem.js`, intocable); `common/translations/{en,es,pt}.json` (**220 claves → 45**, cruce
  exhaustivo de uso real incluyendo datos en JSON, no solo código; verificado con navegador real
  escaneando texto crudo sin traducir en las 7 superficies); `components/Multiselect/Multiselect.js`
  (182→95 líneas, mismo contrato externo exacto que necesita `MetaItem.js`, intocable).
- **Decisión documentada:** las claves de traducción con jerga Stremio explícita
  (`CTX_MARK_WATCHED`, `LIBRARY_PLAY`, etc.) NO se renombraron porque están hardcodeadas dentro de
  `MetaItem.js`/`LibItem.js`/`Library/Placeholder.tsx` — los 3 archivos intocables por orden del
  PM; renombrar la clave sin tocar esos archivos los habría roto.
- **webpack.config.js:** sacado `ProvidePlugin({ Buffer })` y la regla de módulo `.wasm` (resto del
  Core viejo en Rust/WASM, sin ningún `.wasm` en el proyecto) — confirmado 0 usos de `Buffer.` antes
  de sacarlo. `package.json`: sacadas `buffer` y `lodash.intersection`.
- **No tocado, a propósito:** el alias webpack `'stremio'` → `src/` (dejado para la fase final, R9).
- Nota abierta del dev: no se capturó el tamaño de bundle "antes" de R8 para comparar — 564 KB
  minificado es el número "después"; no había forma de reconstruir el "antes" sin operaciones de
  git fuera de lo autorizado en ese momento.

### R9 — alias `stremio` → `pollux`
- Renombrado el alias de import en 35 archivos JS/TS/TSX (85 apariciones) + 23 `.less`, en
  `webpack.config.js`/`tsconfig.json`/`vite.config.js`, incluido (solo el import, sin tocar lógica)
  dentro de los 4 archivos intocables (`MetaItem.js`, `LibItem.js`, `Library.js`, `Calendar.tsx`).
- `interfaces/leto/package.json`: `name`/`displayName`/`author` propios; `license` (GPL-2.0) sin
  tocar, por instrucción explícita.
- De paso, en `vite.config.js`: sacadas referencias a paquetes ya eliminados en R7/R8 que hubieran
  roto `pnpm dev` (pre-bundling de paquetes inexistentes), y el plugin de polyfill de `Buffer`
  (huérfano desde R8).
- Grep de cierre: 34 archivos con "stremio" restante, todos justificados (paquete real de terceros
  `stremio-router`, dependencia real de GitHub `spatial-navigation-polyfill`, o comentarios
  históricos/explicativos) — 0 referencias funcionales al alias viejo.
- Bundle confirmado por el PM con referencia de una fase anterior: **937 KB → 564 KB**.

### R10 — router propio, spatial-navigation fuera
- Corrección del PM: lo que R9 había dejado como "paquete de terceros" (`stremio-router`,
  `spatial-navigation-polyfill`) SÍ es código/dependencia de Stremio y entra en el alcance de la
  limpieza.
- **Reescrito:** `src/router/` (11 archivos, paquete `stremio-router` copiado dentro del repo) →
  `common/router/` propio (6 archivos) — mismo comportamiento (apilado de vistas sin desmontar,
  matching por regexp), sin usar `react-router` (evaluado y descartado: ya existe toda la
  estructura de matching propia, cambiar de librería sería rehacer trabajo sin ganancia real).
- **Borrado:** `spatial-navigation-polyfill` (dependencia real del fork de GitHub de Stremio,
  navegación con control remoto — sin sentido en una app mouse+teclado), y el script npm
  `scan-translations` (apuntaba a un test que no existe).
- **Inventario adicional** (huella: 57 archivos con la cabecera de copyright de Stremio sin tocar):
  agrupado por subsistema, cruzado contra consumidores reales. Hallazgo accionable: `common/Toast/`
  y `common/Tooltips/` (13 archivos, ~587 líneas) están **100% sin uso real** — sus providers siguen
  montados pero nada llama `useToast()`/`useTooltip()` desde que `SharePrompt` (su único consumidor)
  se borró en R7. El resto del inventario (Button/Image/ModalDialog/Popup/NavBar/
  KeyboardShortcuts/ServicesContext/ShortcutsModal/NotFound/Settings shell) tiene consumidor real
  — código genérico o ya adaptado por fuera, estructura original de Stremio por dentro.

### R11 — respuesta sobre el router + inicio Parte A (interrumpida por S1)
El dev aclaró, ante pregunta directa del PM, que el router de R10 había sido **reorganizado**, no
reescrito de cero (el algoritmo de matching y el manejo de `hashchange` seguían siendo
esencialmente los de `stremio-router`) — quedó anotado para una reescritura real en R11. Se
investigaron (sin escribir código aún) NotFound/Image/Button/Popup/ModalDialog/ShortcutsModal/
KeyboardShortcuts/ServicesContext, confirmando por grep candidatos a simplificar (ej.
`ServicesContext` con un solo consumidor real, `KeyboardShortcuts` con un `EventEmitter` que nadie
escucha). Pausado por la prioridad S1.

### S1 — seguridad: secretos en código de Pollux
Autorizada por aviso explícito del PM/Rick (fuera del flujo normal de R-fases). Solo working tree.
- **`DRIVE_TOKEN_SECRET`:** se sacó un fallback fijo (`FALLBACK_SECRET`) en `token_crypto.py` — la
  variable ahora es obligatoria a nivel de módulo (falta → el backend entero se niega a arrancar).
- **`POSTGRES_PASSWORD`:** `DATABASE_URL` pasó de tener un default con contraseña embebida a ser
  obligatoria; `docker-compose.yml` usa `${POSTGRES_PASSWORD}` por interpolación, sin valor
  literal. Creado `.env.example` con marcadores, sin valores reales.
- **Encontrado y limpiado un valor real expuesto** en `docs/handover/sessions/session_2026-08-28.md`
  (la contraseña de Postgres aparecía en una línea documentando un chequeo de código) —
  reemplazado por `<POSTGRES_PASSWORD>`.
- **Verificación en prod** (solo nombres de variables vía `gcloud run services describe`, sin leer
  valores): confirmado que `DRIVE_TOKEN_SECRET` está definida en prod (el fallback nunca se usó
  ahí). **Hallazgo entregado directo a Rick sin investigar más:** una variable de entorno en prod
  con un nombre que no es un identificador legible (string hexadecimal de 65 caracteres) —
  posible secreto pegado por error como nombre de variable. El PM instruyó explícitamente no
  investigar más ni volver a copiar ese string.
- Grep final confirmó 0 apariciones de los valores reales viejos fuera de `.env` (gitignored).

### R11 Parte A — Toast/Tooltips fuera, 8 componentes reescritos de cero
- **Borrado:** `common/Toast/` (8 archivos) y `common/Tooltips/` (10 archivos) — confirmados 100%
  muertos en R10.
- **Reescritos de cero** (mismo contrato externo, sin partir del archivo viejo):
  `routes/NotFound` (ahora con sidebar completo `MainNavBars` en vez de barra sola, sin la paleta
  vendorizada de Stremio), `components/Image`, `components/Button` (sin soporte de long-press —
  confirmado 0 consumidores), `components/Popup` (posicionamiento simplificado; **bug propio
  encontrado y corregido en el primer borrador**: orden de eventos `pointerdown` vs `mousedown`),
  `components/ModalDialog` (sin el bug del 404 silencioso de R4 — se sacó `background` en vez de
  arreglarlo, por 0 consumidores), `App/ShortcutsModal`.
- **`services/KeyboardShortcuts` + `services/ServicesContext` simplificados de fondo:**
  `useServices()` tenía un solo consumidor real (`LibItem.js`, congelado) leyendo un stub inerte —
  pasó a función simple sin Context/Provider. `KeyboardShortcuts` (clase EventEmitter) pasó a hook,
  sin que nadie escuchara su evento de estado. Se sacó una rama de código (`Ctrl+Backspace`)
  confirmada muerta desde siempre (un guard anterior en el mismo archivo ya la hacía inalcanzable).

### R11 Parte B — NavBar, shell de Settings, router reescrito de verdad
- **Reescritos:** los 5 archivos sustantivos + 5 barrels de `NavBar` (extracción de subcomponentes/
  funciones puras); shell de `Settings.tsx`/`index.ts` (scroll-spy extraído a hook, **bug real
  corregido**: `useRouteFocused()` se desestructuraba mal desde R10, dejando un efecto sin correr
  nunca — no se notaba porque el estado inicial ya coincidía).
- **Router reescrito de verdad esta vez** (R10 lo había reorganizado, no reescrito):
  `routeMatching.js` nuevo (funciones puras, una sola pasada de regex en vez de dos), `context.js`
  nuevo (unifica 2 contextos chicos), `Router.js` sin `onRouteChange`/`queryParams` (0 consumidores
  reales) y sin las dependencias `react-is`/`fast-equals` (chequeos que no protegían nada real o
  comparación que no necesitaba una librería). Mismo comportamiento de apilado de vistas, verificado
  con un script Playwright descartable (nodo DOM no se remonta al navegar y volver).
- **Error del dev en esta fase, corregido en R12 (ver abajo):** se identificaron ~25 archivos con
  la cabecera de copyright de Stremio como supuestamente "propios con el comentario pegado por
  error" y se les sacó la línea — evaluación que resultó ser **incorrecta**.
- Bug de typo encontrado en el propio smoke test (apóstrofe tipográfico vs recto), no del código de
  la app — corregido.

### R12 — corrección: las ~25 cabeceras eran de código derivado real
Rick verificó contra el stremio-web real (commit `091f94e8`) y confirmó que esos archivos SÍ tienen
equivalente ahí — la evaluación de R11 Parte B (código "propio con comentario pegado por error")
estaba **mal**.
- **Corregido:** cabecera de copyright restaurada tal cual en los 28 archivos afectados,
  verificado con `git diff` que el único cambio en cada uno era esa línea (sin tocar cambios
  legítimos de fases anteriores).
- **Comparación real completa contra 091f94e8** (clon temporal fuera del repo, borrado al
  terminar): 206 archivos → 137 MODIFICADO, 42 SIN_EQUIVALENTE, 16 FROZEN (congelados), 11 IDÉNTICO.
  Esta tabla es la base que R13/R14 usaron después para el análisis de similitud.
- **De los 28, se reescribieron genuinamente** (mismo contrato externo, estructura interna
  distinta) los que tenían lógica real: `TextInput.tsx` (+ hallazgo: **0 consumidores reales en
  todo el proyecto**, candidato a borrar, no borrado sin preguntar), `MultiselectMenu.tsx` +
  `Dropdown.tsx` + `Option.tsx` (decisión explícita de NO borrar el modo `multicheck`/drill-down
  aunque no se ejercite hoy, por ya haber sido corregido una vez ese día por decidir de más),
  `MainNavBars.tsx`, `useBinaryState.js`/`useOutsideClick.ts`/`usePWA.js`, `index.js` raíz.
- **Los 14 restantes** (7 barrels triviales de una línea + 7 `.less` con estructura de selectores
  igual al original) se dejaron con la cabecera restaurada pero SIN reescritura cosmética — razón
  documentada: un re-export de 2 líneas no admite otra forma de escribirse, y reordenar CSS sin
  verificación visual pantalla por pantalla es un riesgo real sin beneficio. Quedó como pregunta
  abierta al PM (se resolvió en R13/R14 vía el análisis de similitud formal).
- Hallazgo aparte: `common/router/Modal.js` y `styles.css` (de R11 Parte B) son funcionalmente
  idénticos al original de stremio-web — solo cabecera/import distintos. Flagueado, no tocado sin
  preguntar.

### SEGURIDAD URGENTE (en paralelo a R13)
Un barrido externo (de la coordinación con Dominius) encontró valores reales en texto plano que
las fases anteriores no habían detectado porque estaban dentro de comandos de `grep` documentados,
no en código de configuración:
- **`notas-pendientes-2026-09-28.md`** tenía el valor real de `POSTGRES_PASSWORD` y del viejo
  `FALLBACK_SECRET` de `token_crypto.py`, ambos usados como patrón de búsqueda dentro de un
  comando de grep documentado en la sección de S1 — redactados.
- **`backend/app/routers/drive.py`**: `_STATE_SECRET` (firma HMAC del `state` OAuth de Drive,
  protección CSRF) tenía un fallback hardcodeado con el valor real. Mismo criterio que S1: variable
  obligatoria (`DRIVE_STATE_SECRET`), sin default, el backend se niega a arrancar si falta.
  Confirmado que ya estaba definida en prod (verificado solo por nombre, sin leer valores) — no
  hizo falta crear nada antes de desplegar el fix.
- Grep final de los 3 valores reales viejos en todo el repo (excluyendo `.env`): 0.

### R13 — Modal.js/styles.css del router, 7 barrels, 7 `.less`, similitud de los 137 MODIFICADO
- **Reescritos de verdad:** `common/router/Modal.js` (subcomponente `FocusTrappedContent`
  extraído, guard real agregado contra un portal target nulo) y `styles.css` (selectores
  simplificados, `inset: 0`) — eran funcionalmente idénticos al original.
- **7 barrels triviales** reescritos a una sola línea de re-export, sin cabecera de copyright (un
  re-export de una línea no tiene contenido propio que proteger).
- **7 `.less` con equivalente real** reescritos con estructura de selectores propia (aplanados en
  vez de anidados) — de paso, **código muerto real encontrado y sacado** en
  `ModalDialog/styles.less` (`.modal-dialog-background`/`.action-button`/`.buttons-container`, sin
  consumidor desde que R11 Parte A sacó esas props) y `Multiselect/styles.less`
  (`.label-container`/`.modal-container`, muertos desde que R8 reescribió `Multiselect.js`).
  Verificación visual antes/después con capturas comparadas una por una (idénticas) en las 3
  pantallas donde se pueden ejercitar; `Multiselect/styles.less` solo verificado por grep de 0
  consumidores (su único consumidor real, `MetaItem`, está congelado).
- **Análisis de similitud de los 137 archivos MODIFICADO** contra `091f94e8` (metodología descrita
  en `similitud-stremio-091f94e8-2026-09-28.md`, la misma que se reutilizó y se volvió a correr
  después de T2): 75 ALTA / 26 MEDIA / 36 BAJA de un total de 1885/1024/600 líneas no triviales
  respectivamente. Aviso explícito en el propio documento: el % mide superposición de líneas, no
  si el archivo fue genuinamente reescrito — varios archivos ya reescritos en fases anteriores caen
  igual en ALTA/MEDIA por compartir líneas genéricas de CSS/JS.
- Hallazgo: varios archivos en 100% de similitud nunca tuvieron la cabecera de copyright puesta (a
  diferencia de los de R12) — no detectados por ningún inventario de huella anterior porque ese
  método dependía de la cabecera.

---

**R14, T1, T2, `index.html` raíz y la clasificación MEDIA/BAJA siguen en `r14-lote1..4-2026-09-28.md`,
`r14-excepciones-consolidado-2026-09-28.md`, y `clasificacion-media-baja-2026-09-28.md`.**
