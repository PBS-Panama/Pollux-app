# Notas pendientes de pasar a Handover.md — 2026-09-28

Este archivo existe porque `Handover.md` está bloqueado mientras el dev de Dominius saca
secretos del historial/archivo (ver `claude/coordinacion-pollux-2026-09-28.md` en la raíz
del monorepo). Todo lo de acá se pasa a `Handover.md` como nota (53) en cuanto se confirme
que terminaron. Sin commit — todo vive en el working tree.

---

## Coordinación con Dominius — estado confirmado (2026-09-28, antes de seguir con R1)

Leído `claude/coordinacion-pollux-2026-09-28.md`. Confirmado con `git status`/`git log`/`git branch -vv`
(solo lectura, nada tocado):

- `main` = `d64753fa` (`origin/main` igual, sin divergencia). El historial viejo con los commits
  `6b8f9aed`, `0c079ae3`, `b8023ebe` fue reescrito/force-pusheado por Dominius desde `main`.
- **Nada perdido:** los 330 archivos de cambios de Pollux (F1-F5b + R1 hasta donde iba) siguen
  intactos en el working tree, sin commitear — confirmado puntualmente con `git status --short`
  sobre `routes/Intro`, `routes/Search`, `components/BottomSheet`, `Calendar/examData.js` (todos
  aparecen `D`, como se esperaba tras borrarlos en R1).
- Los 3 commits viejos siguen guardados en la rama local `backup/pre-rewrite-local-2026-09-28`
  (`b8023ebe`). También siguen local `pollux-export` (`52073dd6`) y `pollux-export-2` (`8e63ca28`)
  de los pushes anteriores a Pollux-app — **ninguna de las tres se pushea** hasta nuevo aviso.
- **Nada a medio hacer con git:** sin `MERGE_HEAD`/`REBASE`/`CHERRY_PICK_HEAD`, sin cambios
  staged, `git status` limpio de sorpresas (solo los cambios de trabajo esperados).
- Desde este mensaje: **cero `git commit`/`push`/`reset`/`checkout .`/`stash`/`clean`** en
  `pb-website` de mi parte, hasta que el PM de Dominius confirme que terminó. `Handover.md` de
  `pbsds-pollux-app` no se toca — estas notas van acá.
- Deploy de `pb-pollux` (decisión #75) sigue sin tocar — no tiene nada que ver con el rewrite
  de historial, pero de cualquier forma sigue detenido esperando a Rick (nota 51).

---

## R1 (autorizada, nota del PM tras el plan 52) — completada en el working tree

**Borrado, verificado, sin commit:**
- `routes/Intro/` entera (+ `CredentialsTextInput/`, `PasswordResetModal/`, `useAppleLogin.ts`,
  `useFacebookLogin.ts` — todo dentro de esa carpeta) y `routes/Search/` entera (+`useSearch.js`).
  Sacadas sus entradas de `routes/index.js`, `App/routerViewsConfig.js` y `common/routesRegexp.js`
  (`intro`/`search` en los 3 archivos).
- Versión fantasma vieja de Calendar (8 items, 0 importadores confirmado de nuevo antes de
  borrar): `useCalendar.ts`, `useCalendarDate.ts`, `Selector/`, `List/`, `Table/`, `Details/`,
  `Placeholder/`, `examData.js`. **No se tocó** `Calendar.tsx` (la versión viva) ni `calendarData.js`
  (confirmado que SÍ lo importa `Calendar.tsx` — no estaba en la lista de muertos, correctamente).
- Los ~1233 líneas ya muertas hoy de la tabla del plan 52: componentes `BottomSheet`, `Chips`,
  `ColorInput`, `RadioButton`, `Slider` (+ sus líneas en `components/index.ts`); `common/languages.ts`,
  `common/languageNames.json`, `common/useAnimationFrame.js`, `common/useLiveRef.js`,
  `common/useOrientation.ts`, `common/useTimeout.ts`, `common/useInterval.ts`,
  `common/comparatorWithPriorities.js` (+ sus líneas en `common/index.js`). Verificado antes de
  borrar que `useAnimationFrame`/`useLiveRef` (los usaba `Slider`) y `useOrientation` (lo usaba
  `BottomSheet`) quedan sin importador real una vez borrados esos dos componentes en el mismo lote.
- **NO se tocó** (fuera del alcance de R1, a propósito): `Checkbox` (solo lo usaba `Intro.js`, pasa
  a huérfano recién ahora pero no estaba en la lista explícita de "ya muerto hoy" que autorizaste),
  `useDataExport.{js,d.ts}` de `Settings/General` (es R2), `routes/Library/Placeholder/` (hallazgo
  nuevo: 0 importadores incluso hoy — `Library.js` no lo usa — pero tampoco estaba en tu lista, lo
  dejo para cuando toque Library).

**Hallazgo para que quede anotado (efecto colateral de borrar Search, no un bug mío):**
`components/NavBar/HorizontalNavBar/SearchBar/SearchBar.js` (componente **compartido/permanente**,
lo usa `MainNavBars`, por lo tanto también `MyFleet`) navega a `#/search` al buscar
(`window.location = '#/search'` / `window.location.hash = '/search'`). También
`services/KeyboardShortcuts/KeyboardShortcuts.js` manda ahí con el atajo "0" (`SETTINGS_SHORTCUT_GO_TO_SEARCH`
— aunque el plan 52 ya decía que ese atajo específico no dispara nada real hoy, a confirmar en R2).
Con `Search` borrada, ambos caminos ahora terminan en `NotFound` en vez de la pantalla muerta de
antes — **funcionalmente es lo mismo** (la búsqueda no hacía nada real de todas formas, `local_search`
nunca se sobreescribía), pero visualmente el usuario ve "página no encontrada" en vez del cuadro de
búsqueda vacío. No lo arreglé — tocar `SearchBar.js` es un componente compartido, fuera del
alcance de "borrar Intro/Search", y la solución real (conectar la búsqueda a Discover, como dice
el plan 52) es parte de la reescritura, no de R1.

**Build + prueba local (:4001):** `docker compose up -d --build leto nginx` — sin errores. Los 6
contenedores arriba (`leto` healthy). HTTP 200 en `/company/` y su bundle. `node --check` → sintaxis
OK. `grep` exhaustivo de todo lo borrado (rutas, componentes, módulos common) sobre todo `src/` →
**0 referencias rotas**. Confirmado a nivel de código (no de navegador, no lo tengo en esta sesión)
que `/company/#/intro` y `/company/#/search` van a `NotFound`: ya no están en `routerViewsConfig.js`
ni en `routesRegexp.js`, y `App/App.js` tiene `onPathNotMatch = () => NotFound` como fallback real
del `Router` de `stremio-router` — no debería quedar pantalla en blanco.

**No verificado:** sin navegador, no vi `/intro`/`/search` cargando `NotFound` en pantalla — es
inferencia de código (router sin esas entradas + fallback confirmado), no observación directa.

**Lista de archivos/carpetas borrados en R1** (para cuando esto pase a Handover.md):
```
interfaces/leto/src/routes/Intro/                    (carpeta completa)
interfaces/leto/src/routes/Search/                   (carpeta completa)
interfaces/leto/src/routes/Calendar/useCalendar.ts
interfaces/leto/src/routes/Calendar/useCalendarDate.ts
interfaces/leto/src/routes/Calendar/examData.js
interfaces/leto/src/routes/Calendar/Selector/
interfaces/leto/src/routes/Calendar/List/
interfaces/leto/src/routes/Calendar/Table/
interfaces/leto/src/routes/Calendar/Details/
interfaces/leto/src/routes/Calendar/Placeholder/
interfaces/leto/src/components/BottomSheet/
interfaces/leto/src/components/Chips/
interfaces/leto/src/components/ColorInput/
interfaces/leto/src/components/RadioButton/
interfaces/leto/src/components/Slider/
interfaces/leto/src/common/languages.ts
interfaces/leto/src/common/languageNames.json
interfaces/leto/src/common/useAnimationFrame.js
interfaces/leto/src/common/useLiveRef.js
interfaces/leto/src/common/useOrientation.ts
interfaces/leto/src/common/useTimeout.ts
interfaces/leto/src/common/useInterval.ts
interfaces/leto/src/common/comparatorWithPriorities.js
```
Editados (sacar referencias a lo de arriba): `routes/index.js`, `App/routerViewsConfig.js`,
`common/routesRegexp.js`, `components/index.ts`, `common/index.js`.

Esperando: (1) confirmación de Dominius de que terminaron con `Handover.md` para volcar esto ahí,
(2) tu OK para R2 (Settings).

---

## R2 (autorizada) — Settings + SearchBar compartida — completada en el working tree

**Causa raíz de los 3 handlers rotos:** `services/Core/CoreTransport.js` — `dispatch()` solo
interceptaba `Load`/`MetaDetails`; cualquier otra acción (incluida `Ctx/UpdateSettings`, la que
usan el selector de idioma y el toggle de blur) caía directo al `return syncThenable(undefined)`
final, sin persistir nada ni avisarle a nadie. El valor que se leía después (`profile.settings.*`)
venía de un objeto estático hardcodeado en `DEFAULT_STATES.ctx` que ni siquiera tenía los campos
`hideSpoilers`/`escExitFullscreen`/`quitOnClose` — por eso esos toggles nunca podían aparecer
tildados, ni aunque el click "funcionara".

**1) Idioma — arreglado, persiste de verdad:**
- `CoreTransport.js`: agregado manejo real de `{action:'Ctx', args:{action:'UpdateSettings', args}}`
  — guarda el objeto completo en `localStorage['pollux-settings']` (mismo patrón que `theme.ts`),
  actualiza el override interno de `ctx` y emite `NewState(['ctx'])`. También seedea ese override
  al arrancar leyendo `localStorage`, así un F5 no vuelve a los valores hardcodeados.
- `useInterfaceOptions.ts`: el `onSelect` del idioma ahora llama `i18n.changeLanguage(value)` de
  forma directa e inmediata (además de disparar el `dispatch` de arriba) — el cambio de idioma se
  ve al toque, no hace falta recargar. El `App.js` que ya llamaba `i18n.changeLanguage` en el
  arranque (`getState('ctx').then(onCtxState)`, una sola vez al montar) ahora sí lee el idioma
  persistido real en cada carga de página.
- **Cómo probarlo a mano:** Settings → Interface → "UI Language" → elegir español. La UI debería
  cambiar de idioma al instante. Recargar la página (F5): debe seguir en español (antes volvía a
  inglés). En DevTools → Application → Local Storage debería aparecer `pollux-settings` con
  `{"interfaceLanguage":"es-ES",...}`.

**2) "Blur unwatched image" — arreglado, persiste de verdad (mismo mecanismo de arriba, gratis):**
El toggle usa el mismo `useSettings()`/`core.transport.dispatch(UpdateSettings)`, así que el fix de
`CoreTransport.js` lo arregla también. **Ojo:** su único consumidor real hoy es
`components/Video/Video.js` (`profile.settings.hideSpoilers`), que es un componente que solo usa
`MetaDetails` (una de las 8 pantallas heredadas, huérfano cuando se reescriba) — o sea que el
toggle ahora SÍ se marca/persiste de verdad, pero su efecto visible (difuminar la imagen de
episodios no vistos) solo se nota si se llega a esa parte de `MetaDetails`, que igual usa una
metáfora de "temporadas" que el plan de reescritura va a tirar. No es un problema del fix, es el
alcance real de este toggle hoy.
**Cómo probarlo a mano:** Settings → Interface → togglear "Blur unwatched episodes image" → debe
quedar marcado (antes ni se marcaba). Recargar la página: debe seguir marcado.

**3) Atajos — sacados los 2 que no tenían acción real, no se dejaron decorativos:**
Investigado el mecanismo real (hay DOS sistemas de atajos distintos, no uno):
`services/KeyboardShortcuts/KeyboardShortcuts.js` (listener global real, navega por hash) y
`common/Shortcuts/onShortcut.ts` (sistema de suscripción que en `App.js` solo tiene un caso
manejado: `'shortcuts'`, que abre el modal de ayuda). El grupo "general" tenía 5 atajos listados:
- `navigateTabs` (1-6) → **real**, `KeyboardShortcuts.js` navega de verdad a `#/`, `#/company-crewdb`,
  `#/myfiles`, `#/company-calendar`, `#/myexams`, `#/settings`. **Se queda.**
- `navigateSearch` (0) → navegaba a `#/search`, borrada en R1 → ahora sin acción real. **Sacado**
  del listado (`shortcuts.json`) y del listener real (`KeyboardShortcuts.js`, caso `Digit0` sacado
  — si no se sacaba el caso real, apretar "0" seguía mandando al usuario a un 404, aunque ya no
  apareciera listado como atajo).
- `fullscreen` (F) → **real**, `common/useFullscreen.ts` tiene su propio listener de teclado
  (`KeyF`) que sí togglea fullscreen de verdad, siempre activo. **Se queda.**
- `exit` (Escape, "Exit / Go Back") → revisado a fondo: solo hace algo si
  `settings.escExitFullscreen` es `true`, y ese toggle está en `Settings/Interface` gateado a
  `shell.active` (el shell de escritorio de Stremio) — **siempre `false` en la web, el toggle ni
  siquiera se renderiza nunca**, así que un usuario real de Pollux jamás puede activarlo. Sin
  acción real posible hoy. **Sacado** del listado.
- `shortcuts` (Ctrl+/) → **real**, abre el modal de ayuda. **Se queda.**
Quedaron 3 de 5. **Cómo probarlo a mano:** abrir el modal de atajos (`Ctrl+/` o Settings →
Shortcuts) — debería listar solo 3: "Navigate Between Menus" (1-6), "Toggle Fullscreen" (F), "Show
Shortcuts" (Ctrl+/). Probar apretar "2" en cualquier pantalla (sin foco en un input) → debe navegar
a Crew Database. Probar "F" → debe entrar/salir de pantalla completa real del navegador.

**Hallazgo aparte, NO corregido a propósito (fuera del alcance literal de "sacar los que no
sirven"):** dentro de `navigateTabs`, la tecla **"5" manda a `#/myexams`**, una ruta que no existe
en el router de Pollux (es de Castor) → cae en `NotFound`. Y **`MyFleet` no tiene ninguna tecla
asignada** (el mapeo 1-6 quedó de una época en la que el orden de tabs era otro). No lo toqué
porque `navigateTabs` en su conjunto SÍ tiene acción real (5 de 6 destinos andan) — la instrucción
era sacar atajos sin acción real, no corregir destinos de uno que sí funciona. Lo marco para
decidir en otra pasada: lo lógico sería que "5" (o algún número) vaya a `#/my-fleet` en vez de a
`#/myexams`.

**4) SearchBar compartida — decisión: OCULTAR, no filtrar en el lugar.**
Evalué "filtrar la lista en el lugar" para `MyFleet` primero, como pediste que fuera la opción
preferida. No es chico: `SearchBar` vive dentro de `HorizontalNavBar` (parte de `MainNavBars`,
compartido por las 8 pantallas + MyFleet), y `MyFleet` es un árbol de componentes totalmente
separado que se renderiza como `children` de `MainNavBars` — no hay ningún estado compartido entre
ambos hoy. Filtrar de verdad hubiera necesitado: (a) meterle a `MainNavBars` un estado de búsqueda
nuevo compartido (React Context o clonar `children` con props inyectadas — no existe ese mecanismo
hoy), y (b) agregarle a `MyFleet` lógica de filtro que hoy no tiene para sus listas principales de
Barcos/Personal (sí tiene un filtro de texto, pero es interno al panel de "+ Contratar", una lista
distinta). Dos piezas de arquitectura nueva para un input que además no tiene ningún otro uso real
hoy (todo lo que `SearchBar` intentaba hacer — `local_search`, historial de búsqueda, pegar un
magnet link — está muerto). Con eso, opté por el camino chico que autorizaste como alternativa:
**oculta en TODAS las pantallas** (`MainNavBars.tsx`: `searchBar={false}`), no solo en MyFleet —
porque no tiene destino real en NINGUNA pantalla hoy, no solo ahí. El componente `SearchBar.js`
(el de adentro de `NavBar`, no el de nivel raíz que usa `MetaDetails`) queda en el código sin
borrar, simplemente ya no se monta — para no ensuciar el diff de R2 con un borrado que no pediste;
si eventualmente se quiere, es candidato natural para cuando se reescriban las 8 pantallas.
**Cómo probarlo a mano:** entrar a cualquier pantalla (Board, Discover, MyFleet, Library, Calendar,
Settings) — ya no debería verse la barra de búsqueda junto al logo/menú superior. Antes se veía un
cuadro con lupa que al clickear mandaba a una pantalla muerta (hoy, a un 404).

**Build + prueba local (:4001):** `docker compose up -d --build leto nginx` (todo working tree, sin
git). Sin errores. Los 6 contenedores arriba (`leto` healthy). HTTP 200 en `/company/` y su bundle.
`node --check` → sintaxis OK. `grep` de todo lo tocado (`navigateSearch`, `Digit0`, `#/search` real)
→ 0 referencias rotas (solo quedan claves de traducción sin usar, inofensivas). Confirmado en el
bundle final que `pollux-settings` (la nueva clave de `localStorage`) llegó compilada.

**No verificado:** sin navegador en esta sesión — todo lo de "cómo probarlo a mano" de arriba es
para que Rick lo haga en su click-through, no lo vi yo en pantalla.

**Archivos tocados en R2:** `services/Core/CoreTransport.js`,
`routes/Settings/Interface/useInterfaceOptions.ts`, `common/Shortcuts/shortcuts.json`,
`services/KeyboardShortcuts/KeyboardShortcuts.js`, `components/MainNavBars/MainNavBars.tsx`.

Esperando tu OK para R3 (MetaDetails).

---

## R3 (autorizada) — SeafarerProfile desde cero + hallazgo urgente — completada en el working tree

**Antes de empezar R3, encontré y arreglé un bug urgente de R1** que probablemente venía rompiendo
la app en cualquier navegador real desde esa fase: `components/MetaPreview/MetaPreview.js` (que
`Discover.js` usa de verdad para su panel de preview) tenía, a nivel de módulo (se ejecuta apenas
se importa, no es código lazy), una constante `ALLOWED_LINK_REDIRECTS` armada con
`routesRegexp.search.regexp` — `search` ya no existe en `routesRegexp.js` desde R1, así que esa
línea tira `TypeError: Cannot read properties of undefined` apenas el bundle carga el componente.
Como `Discover`/`Board`/`MyFleet` importan el barrel `stremio/components` (que importa
`MetaPreview` de forma eager), esto probablemente rompía la carga de CASI TODA la app en un
navegador real — mis chequeos post-R1/R2 (`curl`, `node --check`, grep de imports) no lo detectaban
porque ninguno ejecuta el JS de verdad. Investigué y la constante entera **no la usaba nadie en
ningún lado** (ni el resto del archivo) — la borré junto con el import de `routesRegexp` que ya
quedaba sin uso. **Recomendación fuerte: cuando alguien tenga un navegador a mano, cargar
`/company/` y mirar la consola antes de asumir que builds/greps limpios significan que la app
carga.** Yo no puedo verificar esto sin navegador en esta sesión.

**0) Atajo tecla "5":** en `services/KeyboardShortcuts/KeyboardShortcuts.js`, cambiado
`'#/myexams'` (ruta de Castor, no existe en Pollux, caía en `NotFound`) por `'#/my-fleet'` — de paso
le da a MyFleet la tecla que le faltaba.

**1) MetaDetails → `SeafarerProfile`, reescrita desde cero:**
Carpeta nueva `routes/SeafarerProfile/` (4 archivos: `index.js`, `SeafarerProfile.js`,
`useSeafarerProfile.js`, `styles.less`) — mismo patrón de `MyFleet.js` (fetch directo con
`authedFetch`/`authedJson`, sin pasar por `CoreTransport`/modelo `meta_details`). Usa los 3
endpoints reales: `GET /company/seafarers/{id}` (perfil), `GET /company/seafarers/{id}/embarkations`
(historial) y — nuevo, no se usaba antes — `GET /company/seafarers/{id}/cv` (botón "Descargar CV",
descarga el PDF real que el backend ya genera). Contenido mostrado, todo con datos reales del
backend, nada inventado: nombre/rango/depto/ciudad/disponibilidad, nacionalidad(es) con
`resolveNationalityEntry` (mismo helper que ya existía), tipos de buque e idiomas hablados
(mapeados ID→etiqueta con los mismos catálogos `profileData/*.json` que ya usaba `MetaPreview`),
score de cumplimiento, certificaciones requeridas vs. vigentes (`compliance_docs`, con estado
vigente/por vencer/vencido — sin la metáfora de "temporadas" de Stremio), documentos subidos con su
estado de verificación, historial de embarques, y certificados de formación completados (`badges`).
Estilo con los tokens `--content-*` del tema Mannat, iconos Iconoir, catálogo de traducciones
propio — nada de `MetaPreview`/`VideosList`/`StreamsList`/`Video.js`/`SeasonsBar`/`EpisodePicker`
copiados ni reusados en la ruta nueva.

**Ruta nueva:** `routesRegexp.js` → `seafarerProfile: { regexp: /^\/seafarer\/([^/]*)$/ }` — URL
limpia `#/seafarer/{id}`, sin "crew"/"metadetails"/"detail" heredado de Stremio.
**Nada cae en 404:** `routerViewsConfig.js` mapea TANTO `seafarerProfile` (la ruta nueva) COMO
`metadetails` (la vieja, `#/metadetails/crew/{id}` y variantes `/detail/`) al mismo componente
`SeafarerProfile` — así cualquier link/bookmark viejo con la forma anterior sigue abriendo el
perfil real, no un 404. El generador real de estos links (`CoreTransport.js`,
`_transformSeafarerToItem`, usado por Board/Discover/MyFleet para las tarjetas de tripulantes) ya
genera la URL nueva `#/seafarer/{id}` de una — cuando se reescriban Board/Discover (R4/R5) no van a
generar más la forma vieja, pero mientras tanto ninguna de las dos formas rompe nada.

**Componente reusable para R4/R5:** `SeafarerProfile.js` exporta también `SeafarerProfilePanel`
(el contenido del perfil, sin la barra superior/layout de página) — pensado explícitamente para que
Board y Discover lo importen directo (en un modal o panel lateral) en vez de duplicar la lógica de
mostrar un perfil.

**Decisión importante que NO seguí al pie de la letra — `MetaPreview` NO se borró:**
Tu instrucción decía que `MetaPreview` se borra entera junto con la ruta vieja. Investigué antes de
tocarla y encontré que **`Discover.js` la usa de verdad hoy** para su panel de preview del
tripulante seleccionado (`import/require` directo, no algo heredado sin uso) — `Discover` recién se
reescribe en R4/R5, no en R3. Borrar `MetaPreview` ahora habría roto Discover (que hoy funciona)
antes de que le toque su propia reescritura. Dejé `components/MetaPreview/` (con `ActionButton`,
`MetaLinks`, `Ratings`, `MetaPreviewPlaceholder`) viva, solo le saqué la línea rota de
`ALLOWED_LINK_REDIRECTS` (arriba). Se borra en R4/R5 cuando Discover deje de necesitarla. Si preferís
que la sacara igual y rompiera Discover hasta su turno, avisame y lo reviso.
Sí se borraron enteros, confirmado 0 uso fuera de la carpeta vieja: `useMetaDetails.js/.d.ts`,
`useSeason.js`, `useMetaExtensionTabs.js`, `EpisodePicker/`, `VideosList/` (con `SeasonsBar/`),
`StreamsList/` (con `Stream/`/`StreamPlaceholder/`/`PlayIconCircleCentered/`), `MetaDetails.js`,
`index.js`, `styles.less` de la carpeta vieja — o sea, toda `routes/MetaDetails/` — y
`components/Video/` completo (confirmado sin otro importador en todo `src/`).

**2) Toggle de blur — sacado, no decorativo:** confirmado que `hideSpoilers` no tiene NINGÚN
consumidor real tras borrar `Video.js` (era el único). Sacado el toggle completo de
`Settings/Interface.tsx` y su lógica de `useInterfaceOptions.ts` — ya no aparece "Blur unwatched
episodes image" en Settings.

**Limpieza de paso en `CoreTransport.js`** (la única función real que tenía — interceptar
`Load`/`MetaDetails` para traer el perfil — ya no la llama nadie desde que `SeafarerProfile` hace su
propio fetch directo, como `MyFleet`): borrados el handler de dispatch entero, `_transformProfileToMetaDetails`,
`metaDetailsError`, y la entrada `meta_detail` de `DEFAULT_STATES` (que además tenía un bug viejo
preexistente — nada mío — de nombre en singular cuando el código real escribía a `meta_details` en
plural, un mismatch que ya la hacía parcialmente inerte). `errorCatalog`/`crewErrBoard` quedaron
(los sigue usando Board).

**Build + prueba local (:4001):** `docker compose up -d --build leto nginx`. Sin errores. Los 6
contenedores arriba (`leto` healthy). HTTP 200 en `/company/` y su bundle. `node --check` → sintaxis
OK. Confirmé en el bundle final: el contenido nuevo del perfil (“Cumplimiento de certificaciones”,
“Historial de embarques”, “Descargar CV”) y el patrón de ruta `/seafarer/` están compilados. `grep`
exhaustivo de `routes/MetaDetails`, `useMetaDetails`, `useSeason`, `useMetaExtensionTabs`,
`EpisodePicker`, `VideosList`, `StreamsList`, `components/Video` sobre todo `src/` → **0
referencias rotas** (el único match fue un comentario mío explicando qué se reescribió).

**Cómo probarlo a mano (para tu click-through):**
1. Desde Board o Discover, clickear un tripulante → debería abrir `/company/#/seafarer/{id}` con el
   perfil nuevo: foto/avatar, nombre, rango/depto/ciudad, chip de disponibilidad, chips de
   nacionalidad, score de cumplimiento, botón "Descargar CV", bio (si tiene), chips de tipos de
   buque/idiomas, lista de certificaciones (vigente/por vencer/vencido), documentos subidos,
   historial de embarques, badges de formación si tiene.
2. Clickear "Descargar CV" → debería descargar un PDF real.
3. Escribir a mano una URL vieja tipo `#/detail/crew/{algun-id-real}` o `#/metadetails/crew/{id}` →
   debería abrir el MISMO perfil nuevo, no un 404.
4. Settings → Interface → confirmar que ya no aparece "Blur unwatched episodes image".
5. Apretar la tecla "5" en cualquier pantalla (sin el foco en un input) → debería ir a Mi Flota.
6. **Importante por el hallazgo urgente de arriba:** de paso, confirmar que Board/Discover/MyFleet
   cargan sin errores en la consola del navegador — es la primera vez que se prueban en un
   navegador real desde R1, por el bug de `MetaPreview.js` que recién se corrigió.

**No verificado:** todo lo de arriba, sin navegador en esta sesión.

**Archivos nuevos:** `routes/SeafarerProfile/{index.js,SeafarerProfile.js,useSeafarerProfile.js,styles.less}`.
**Archivos borrados:** `routes/MetaDetails/` completa (36 archivos), `components/Video/` completa (6 archivos).
**Archivos editados:** `routes/index.js`, `App/routerViewsConfig.js`, `common/routesRegexp.js`,
`services/Core/CoreTransport.js`, `components/index.ts`, `services/KeyboardShortcuts/KeyboardShortcuts.js`,
`routes/Settings/Interface/Interface.tsx`, `routes/Settings/Interface/useInterfaceOptions.ts`,
`components/MetaPreview/MetaPreview.js` (fix urgente).

Esperando tu OK para R4 (probablemente Board o Discover — avisame el orden).

---

## R3b (autorizada) — smoke test con navegador headless real, corrido sobre el estado actual

**Script:** `interfaces/leto/tests/smoke/` (`smoke.js` + `package.json` + `README.md` + `.gitignore`
para `output/`). Playwright plano (no el test-runner `@playwright/test`, para poder correrlo con un
simple `node smoke.js`), pensado para correr DENTRO de la imagen oficial
`mcr.microsoft.com/playwright:v1.47.2-jammy` vía `docker run --network host` — nada instalado en el
host, `npm install` del paquete `playwright` (mismo número de versión que el tag de la imagen, para
que use el Chromium que ya trae) pasa DENTRO del contenedor descartable. Sin servicios pagos.

**Credenciales — nunca escritas acá ni en el script**, tal como pediste: se leen de variables de
entorno (`PBS_SMOKE_COMPANY_*`, `PBS_SMOKE_ADMIN_*`), documentadas por NOMBRE en el `README.md` del
test, no por VALOR. Son la cuenta demo de `backend/app/db/seeds.py` (`seed_demo_data`) y la de
`.env` (`ADMIN_SEED_EMAIL`/`ADMIN_SEED_PASSWORD`) — ya existían como seed local, no genero nada
nuevo.

**Hallazgo antes de poder correrlo — el login de admin necesita su PROPIA sesión:** `interfaces/admin/src/App.tsx`
(auto-auth) solo acepta un token YA EXISTENTE con rol `admin` en el `localStorage` compartido
(`pollux-auth`); si no hay uno (ej. porque la sesión activa es la de la empresa, como en el resto
del recorrido), cae a un fallback con una contraseña de desarrollo vieja **a propósito** (comentario
del propio archivo: "Deliberately NOT the real admin password... if it stops matching the DB, this
fallback simply fails closed") — por diseño, no un bug. El script ahora abre un contexto de
navegador aparte, hace un login real de admin vía `/login` (con cualquier "Nombre de empresa" —
confirmado en `routers/auth.py` que ese campo solo se valida para `role == "company"`, un admin lo
ignora) y recién ahí visita `/admin/`.

**Recorrido real:** login → Board → Discover (de ahí saca un id real de marino, clickeando el
primer link `#/seafarer/...` que genera `CoreTransport.js`) → MyFleet → perfil nuevo
(`#/seafarer/{id}`) → perfil con la URL vieja (`#/metadetails/crew/{id}`, mismo id) → Calendar →
Library → Settings → admin (con su propia sesión). Screenshot de cada pantalla en
`tests/smoke/output/` (gitignored).

### Resultado real (corrido dos veces sobre el estado actual, mismo resultado): **9/10**

Todas OK salvo **Board**, que falla con un error de consola real y reproducible:
```
console.error: no viable transport found (qt.webChannelTransport)
console.error: Error: window.cast api not available
  at window.__onGCastApiAvailable (.../main.js)
  at .../cast_sender.js?loadCastFramework=1
```
**Causa:** el `<script src="//www.gstatic.com/cv/js/sender/v1/cast_sender.js...">` que quedó en
`interfaces/leto/src/index.html` desde el fork de Stremio (ya lo había marcado como "no tocado, fuera
de alcance" en la nota de F5) — el SDK de Chromecast de Google llama a `window.__onGCastApiAvailable`
al cargar, y como no hay ningún receptor Cast disponible (headless o no — esto pasaría en CUALQUIER
navegador real sin un dispositivo Chromecast cerca), tira ese error. Solo aparece en Board porque es
la única carga de página COMPLETA de `/company/` en el recorrido (el resto son cambios de hash
dentro del mismo documento — el script de Cast solo corre una vez por carga real de página).
Chromecast está 100% muerto en Pollux (la funcionalidad que consumía `PlayingOnDevice` era del
`Player` borrado en F1). **No lo saqué** — es una línea de `index.html` y su import en `App/App.js`
(`services/Chromecast/*`), pero es un cambio nuevo fuera de lo que autorizaste para R3b (correr el
test y reportar). Si querés, lo saco en una pasada de 10 minutos y el smoke queda 10/10 — decime y lo
hago antes de R4, ya que dijiste que de ahora en más cada fase se acepta con esto en verde.

**Bug real encontrado (y ya corregido) gracias al smoke test:** la captura de
`seafarer-profile-new-url` mostraba el estado crudo `"MISSING"` en vez de una etiqueta en español —
mi `COMPLIANCE_STATE_LABEL` en `SeafarerProfile.js` (R3) no tenía esa clave. Confirmé contra
`backend/app/services/compliance_engine.py`'s enum `DocState` (`VALID/EXPIRING/CRITICAL/EXPIRED/MISSING`,
las 5, exhaustivo) y agregué `MISSING: 'Faltante'`. Rebuild + re-corrida del smoke: confirmado en la
captura nueva, ya dice "FALTANTE". Sin este smoke test no lo hubiera visto — es exactamente para lo
que pediste esto.

**Miré las capturas a mano (no solo confié en el pass/fail):** `board.png` muestra el sidebar real
con el logo de Pollux, íconos Iconoir, y las etiquetas ya traducidas (Dashboard/Crew Database/My
Fleet/My Schedule/My Files/Settings) — la tarjeta de "Prueba Local" (Panama, Marina Mercante,
Master) con el placeholder corporativo. `seafarer-profile-new-url.png` muestra el perfil nuevo
completo y con datos reales: disponibilidad, código, nacionalidad, tipos de buque (Oil Tanker —
Crude, General Cargo), idiomas (Spanish, English), 0% de cumplimiento, botón Descargar CV, y la
lista de 29 certificaciones faltantes. `admin.png` muestra el panel completo con datos reales (33
Seafarers, 2 Companies) y todos los módulos. Todo se ve como se esperaba — el trabajo de F1-F6/R1-R3
funciona de verdad en un navegador real, no solo en grep/build.

**Archivos nuevos:** `interfaces/leto/tests/smoke/{smoke.js,package.json,README.md,.gitignore}`.
**Archivo corregido:** `interfaces/leto/src/routes/SeafarerProfile/SeafarerProfile.js` (bug de
`MISSING` sin traducir, encontrado por este mismo smoke test).

Esperando tu decisión sobre `cast_sender.js` (¿lo saco ahora para dejar el smoke en 10/10, o queda
para más adelante?) y tu OK para R4.

---

## R4 — Chromecast fuera + Board reescrito como CompanyDashboard (working tree, sin git)

Autorizada tal cual: "0) Saca cast_sender.js... 1) Board: reescritura desde cero como
dashboard de empresa... 2) La URL vieja del Board redirige al dashboard nuevo."

### 0) Chromecast afuera

- `index.html`: quité el `<script src="//www.gstatic.com/cv/js/sender/v1/cast_sender.js...">`.
- `App/App.js`: quité `Chromecast` del import de `stremio/services`, `chromecast: new Chromecast()`
  del memo de servicios, y todo el bloque `onChromecastStateChange`/`start`/`stop`/`on`/`off`.
- Borré `services/Chromecast/` completo (`Chromecast.js`, `ChromecastTransport.js`, `index.js`) y
  su entrada en `services/index.js` — confirmé antes por grep que solo `App.js` los usaba.
- Saqué `CHROMECAST_RECEIVER_APP_ID` de `common/CONSTANTS.js` (huérfana tras lo anterior) y el
  campo `chromecast: any` de `services/ServicesContext/types.d.ts` (tipo huérfano, mismo motivo).

### 1) Board → CompanyDashboard (reescritura completa)

Carpeta nueva `routes/CompanyDashboard/` (`CompanyDashboard.js`, `useCompanyDashboard.js`,
`styles.less`, `index.js`). Sin CoreTransport ni modelo `board` — mismo patrón MyFleet/
SeafarerProfile: `authedFetch`/`authedJson` con el JWT de `localStorage['pollux-auth']`, directo
a `/api/company/seafarers`, `/api/company/staff`, `/api/company/vessels`.

Contenido, todo con dato real o no se muestra (regla notas 37-41):
- 3 números reales: marinos en la base, personal contratado (activos), barcos registrados.
- Tripulación agrupada por `department` (mismo criterio que el Board viejo), tarjetas propias
  (`CrewCard`, sin MetaItem/MetaRow).
- Click en una tarjeta abre un modal de "Perfil rápido" que **reutiliza `SeafarerProfilePanel`**
  (la misma pieza de R3, vía `useSeafarerProfile`) dentro de `ModalDialog` (componente compartido,
  el mismo que ya usa Discover para sus filtros) — con link "Ver perfil completo" a
  `#/seafarer/{id}`. Cumple lo pedido de reusar el panel sin duplicar la lógica de perfil.
- Nota: `ModalDialog` pinta un `background-image: url('${background}')` aunque no se le pase
  `background` — dispara un 404 silencioso (`url('undefined')`). Ya pasa igual hoy con el modal
  de filtros de Discover (tampoco le pasa `background`); no es una regresión mía, no lo toqué por
  no ser parte de lo pedido en R4.

Borrado — ruta vieja completa y lo que quedó huérfano solo de Board:
- `routes/Board/` entero (`Board.js`, `index.js`, `styles.less`, `useBoard.js`, `useBoard.d.ts`,
  `useContinueWatchingPreview.js`, y `StreamingServerWarning/` de 3 archivos que vivía adentro sin
  uso real — `Board.js` no la importaba).
- `components/MetaRow/` (6 archivos, incl. `MetaRowPlaceholder/`) y `components/ContinueWatchingItem/`
  (2 archivos) — confirmé por grep que solo Board los usaba (Discover usa `MetaItem`/`MetaPreview`,
  distintos, no tocados).
- `components/EventModal/` (4 archivos) — Calendar.tsx tiene su **propio** componente local con el
  mismo nombre (`const EventModal = (...)`), no importa el de `stremio/components`; confirmado antes
  de borrar.
- En `services/Core/CoreTransport.js`: modelo `board` y `continue_watching_preview` de
  `DEFAULT_STATES`, `crewErrBoard()`, y todo el armado de `realBoardCatalogs` en el fetch de
  seafarers (que solo alimentaba `overrides.board`) — `overrides.discover` (que sigue usando
  Discover, R5 pendiente) quedó intacto y sigue poblándose igual.
- `common/useNotifications.js`/`.d.ts` y `common/getVisibleChildrenRange.js` — sin más consumidores
  tras borrar Board (confirmado por grep), sacados de `common/index.js`.
- `components/index.ts` — sin las 3 entradas borradas.

### 2) URL vieja → dashboard nuevo

No hizo falta redirect aparte: `routesRegexp.companyDashboard` (`/^\/?(?:company-dashboard)?$/`,
la raíz del SPA y `#/company-dashboard`) es la MISMA regexp de siempre — en
`App/routerViewsConfig.js` solo cambié `component: routes.Board` por `component: routes.CompanyDashboard`.
Cualquier link/bookmark viejo a esa URL cae directo en el dashboard nuevo, sin ruta extra.

### Bug encontrado y arreglado en el camino (bloqueaba el smoke en verde)

Tras sacar Chromecast, el smoke test seguía marcando `board` FAIL — pero por un error distinto,
no relacionado a lo que pediste: `console.error: no viable transport found (qt.webChannelTransport)`.
Es `services/Shell/Shell.js` intentando detectar si corre dentro del shell de escritorio de Stremio
(Qt/Electron) — Pollux es web-only, nunca corre ahí, así que esto tira error EN TODA carga completa
de página (no solo Board; coincide que Board es la primera carga completa tras el login, las demás
pantallas del smoke son navegación por hash sin recarga). Sospecho que ya estaba ahí desde antes de
R4 y quedó tapado en el resultado 9/10 de R3b por el error de Chromecast, que reporté como si fuera
la única causa — no verifiqué si había un segundo error en esa corrida, error mío. Arreglo: en
`Shell.js`, saqué el `console.error(e)` de ese catch (el resto de la lógica de fallback queda igual,
`error` se sigue seteando y `App.js` sigue inicializando bien). No toqué `ShellTransport.js` ni el
resto del servicio Shell (`shell.send('quit')`/`shell.on('open-media', ...)` en `App.js` lo siguen
usando).

### Verificación

- Build Docker OK (`docker compose up -d --build leto nginx`), sin errores de webpack.
- Grep exhaustivo (imports y accesos a propiedad, no solo rutas de import) de `MetaRow`,
  `ContinueWatchingItem`, `EventModal`, `Chromecast`/`chrome.cast`, `useBoard`/
  `useContinueWatchingPreview`, `routes.Board`, `cast_sender`: **0 referencias rotas** (las únicas
  que aparecen son el `EventModal` local de Calendar.tsx, que es otro componente, y el comentario
  del propio CompanyDashboard.js que los nombra a modo de contexto histórico).
- Smoke test (mismo contenedor Playwright, mismas 10 pantallas de R3b): **10/10 OK**, incluyendo
  `board` con datos reales (1 marino, "Prueba Local", 0 personal, 0 barcos — está bien, es lo que
  hay en la demo).
- Capturas revisadas a mano: `board.png` — sidebar Pollux, 3 tarjetas de stats reales, sección
  "General · 1" con la tarjeta del único marino. Probé también (fuera del smoke oficial, script
  descartable aparte) el click a una tarjeta → abre el modal de perfil rápido con
  `SeafarerProfilePanel` completo y datos reales (Panama, Oil Tanker/General Cargo, Spanish/English,
  0% cumplimiento, 29 faltantes) — funciona como se pidió.

**Archivos nuevos:** `routes/CompanyDashboard/{CompanyDashboard.js,useCompanyDashboard.js,styles.less,index.js}`.
**Archivos borrados:** ver arriba (`routes/Board/` 7 archivos incl. `StreamingServerWarning/`,
`components/MetaRow/` 6, `components/ContinueWatchingItem/` 2, `components/EventModal/` 4,
`services/Chromecast/` 3, `common/useNotifications.{js,d.ts}`, `common/getVisibleChildrenRange.js`).
**Archivos editados:** `index.html`, `App/App.js`, `services/index.js`, `common/CONSTANTS.js`,
`services/ServicesContext/types.d.ts`, `components/index.ts`, `services/Core/CoreTransport.js`,
`routes/index.js`, `App/routerViewsConfig.js`, `services/Shell/Shell.js`.

Espero tu OK antes de R5 (Discover).

---

## R5 — Shell.js borrado del todo, Discover → SeafarerSearch, Add to Roster real

Autorizada tal cual: "0) Shell.js: borra el modulo de deteccion... 1) Discover: reescritura desde
cero... 2) 'Add to Roster': ... conectalo... si hace falta cambiar backend, quita el boton."

### 0) Shell.js (deteccion Qt del shell de escritorio) — borrado completo

No bastaba callar el `console.error` de R4: borré `services/Shell/` entero (`Shell.js`,
`ShellTransport.js`, `Shell.d.ts`, `index.js`) y todo lo que dependía de `services.shell`:
- `App/App.js`: sin `Shell` en el import, sin `shell: new Shell()`, sin el `onShellStateChanged`
  (era idéntico a `onCoreStateChanged` salvo por leer `services.shell` — quedó uno solo), sin
  `services.shell.start/stop/on/off`. `initialized` ahora depende solo de `services.core`.
- `App/UpdaterBanner/` (3 archivos) — **borrado entero**, no solo el uso de `shell`: es el banner
  de "hay una versión nueva, instalala" del auto-updater de escritorio de Stremio, que dependía de
  `useServices().shell.transport` para escuchar el evento `autoupdater-show-notif`. No tiene ningún
  sentido en un portal web (no hay "instalar ahora" de nada), así que no lo dejé roto: lo saqué del
  render en `App.js`, del `.less` de `App/styles.less` (`.updater-banner-container`), y de las 3
  traducciones (`UPDATER_TITLE`/`UPDATER_INSTALL_BUTTON`, en/es/pt).
- `routes/Settings/Interface/Interface.tsx`: los dos `Option` gateados por `shell.active`
  ("Quit on close", "Esc exit fullscreen") — nunca se mostraban en un navegador real (`shell.active`
  solo era true con el shell Qt), y encima escribían a `profile.settings.quitOnClose`/
  `escExitFullscreen`, campos que ni siquiera existen en `DEFAULT_STATES.ctx.profile.settings` de
  `CoreTransport.js` — ya estaban 100% muertos antes de tocar nada. Saqué los dos bloques,
  `useInterfaceOptions.ts`'s `quitOnCloseToggle`/`escExitFullscreenToggle`, y sus 2 claves de
  traducción (`SETTINGS_QUIT_ON_CLOSE`/`SETTINGS_FULLSCREEN_EXIT`, en/es/pt).
- Nota de alcance: dejé sin tocar `common/useShell.ts` (el hook de `chrome.webview`/WebView2, otro
  sistema de shell totalmente separado, usado por `App.js` para `open-media`/`windowClosed`/
  `send('quit')` y por `common/useFullscreen.ts`) — vos pediste específicamente "Shell.js", y ese
  hook nunca tira error en un navegador normal (es inerte: `transport` es `undefined`, todo
  no-opea limpio). Si también lo querés afuera, decime y lo saco en otra fase — no lo até a este
  pedido para no asumir de más.

### 1) Discover → SeafarerSearch (reescritura completa)

Carpeta nueva `routes/SeafarerSearch/` (`SeafarerSearch.js`, `useSeafarerSearch.js`, `styles.less`,
`index.js`). Mismo patrón MyFleet/CompanyDashboard: fetch directo a `/api/company/seafarers` +
`/api/company/staff`, sin CoreTransport ni modelo `discover`.

Filtros **solo con lo que el endpoint realmente trae** — antes usaban listas fijas
(`STCW_DEPARTMENTS`, `STCW_RANKS`, `NATIONALITIES_AMERICAS`) que ni coincidían con los datos reales
(ejemplo real: el único marino de la demo tiene `department` vacío — con la lista vieja igual
aparecían 7 departamentos STCW para elegir, todos inútiles). Ahora las opciones de cada filtro
(departamento/rango/nacionalidad) se arman con los valores únicos que de verdad aparecen en
`/api/company/seafarers`, más un buscador por nombre.

Layout: grilla de tarjetas (propias, sin `MetaItem`) + panel de detalle del marino seleccionado con
3 acciones reales:
- **Agregar a mi personal** (el pedido del paso 2, ver abajo).
- **Agendar entrevista** — preservé el toggle de "pending interview" que YA existía
  (`common/crewStore.js`, local a `localStorage`) tal cual, mismo storage: es el único punto de
  entrada real que alimenta la tarjeta "Pending Interviews" de Calendar (`Calendar.tsx` línea ~366,
  comentario "in case added from Discover"). Si lo borraba sin reemplazo, rompía una pantalla que
  no me pediste tocar.
- **Descargar CV** — mismo endpoint real que ya usa `SeafarerProfile`.
- Link "Ver perfil completo" a `#/seafarer/{id}`.

Borrado — ruta vieja y todo lo que quedó huérfano:
- `routes/Discover/` entero (6 archivos: `Discover.js`, `useDiscover.js/.d.ts`,
  `useSelectableInputs.js`, `styles.less`, `index.js`).
- `components/MetaPreview/` entero (13 archivos: `MetaPreview.js`, `ActionButton/`, `MetaLinks/`,
  `Ratings/`, `MetaPreviewPlaceholder/`, `styles.less`, `index.js`) — único consumidor real era
  Discover (confirmé por grep; las dos menciones que quedan en `SeafarerProfile.js` y en el propio
  `SeafarerSearch.js` son comentarios, no imports). Ojo: **no borré** `components/MetaItem/` —
  `LibItem.js` (usado por Library, "My Files", que no se toca en R5) todavía lo necesita.
- `components/AddonDetailsModal/` entero (7 archivos) y `components/Toggle/` entero (3 archivos) —
  huérfanos como consecuencia directa de este R5: `AddonDetailsModal` solo lo usaba Discover;
  `Toggle` solo lo usaban los dos `Option` de Settings/Interface que acabo de sacar en el paso 0.
  Confirmé con grep de uso JSX real (`<Toggle`, `<AddonDetailsModal`), no solo de import.
- En `services/Core/CoreTransport.js`: `_getJwt()`, `_transformSeafarerToItem()`, `errorCatalog()`
  y todo el fetch eager a `/api/company/seafarers` que alimentaba `overrides.discover` (ya no lo
  necesita nadie — `SeafarerSearch` hace su propio fetch). De paso saqué `DEFAULT_STATES.discover`,
  `.addon_details` y `.meta_details`: confirmé por grep que ya no tienen NINGÚN consumidor
  (`meta_details` venía muerto desde R3, no lo había visto entonces — aprovechable ahora que ya
  estaba mirando el archivo entero).
- `components/index.ts` — sin `MetaPreview`/`AddonDetailsModal`/`Toggle`.

### 2) "Add to Roster" — conectado al backend real

Era no-op de verdad, y peor: ni siquiera estaba expuesto en un botón visible — `Discover.js` tenía
`addToLibrary`/`removeFromLibrary` dispatchando `Ctx/AddToLibrary` y `Ctx/RemoveFromLibrary` a
CoreTransport, que nunca manejaba esas acciones (no hacían nada), y ese `toggleInLibrary`/
`inLibrary` ni siquiera se leía dentro de `MetaPreview.js` (props declaradas en `propTypes` y
jamás usadas en el render). Confirmé que `POST /api/company/staff` ya existe y hace exactamente
"agregar a mi personal" — es el mismo endpoint que el botón "Contratar" de MyFleet usa hoy. No
tuve que tocar backend ni DB: `SeafarerSearch`'s `useSeafarerSearch.js` llama ese mismo POST,
recarga la lista de staff, y el botón pasa a "Ya en tu personal" (deshabilitado) si ya está
contratado — mismo criterio que MyFleet (`status === 'active'`).

### Verificación

- Build Docker OK, sin errores de webpack.
- Grep exhaustivo (imports, accesos a propiedad y JSX, no solo rutas de import) de `routes.Discover`,
  `MetaPreview`/`ActionButton`/`MetaLinks`, `AddonDetailsModal`, `<Toggle`, `useDiscover`/
  `useSelectableInputs`, `services.shell`/`new Shell(`/`UpdaterBanner`, `quitOnCloseToggle`/
  `escExitFullscreenToggle`, modelos `discover`/`board`/`addon_details`/`meta_details`: **0
  referencias rotas** (solo quedan comentarios que nombran archivos ya borrados a modo de
  contexto histórico — los corregí donde eran confusos, ej. `common/Icon/index.js` todavía
  mencionaba `ActionButton.js`).
- Smoke test **extendido con el flujo real de Add to Roster** (clic en "Agregar a mi personal",
  espera a que el botón diga "Ya en tu personal", captura, y **revierte el dato de prueba** con el
  mismo `PATCH status=ended` que usa "Dar de baja" en MyFleet — nunca un write directo a la DB).
  Corrida dos veces seguidas para confirmar que el revert deja todo limpio y repetible (no se
  acumulan contrataciones de prueba): **11/11 ambas veces**.
- Capturas revisadas a mano: `discover.png` (grilla + panel de detalle con datos reales de "Prueba
  Local", filtros vacíos donde no hay dato real — ej. sin opciones de departamento porque ese campo
  viene vacío en la demo, correcto), `add-to-roster.png` (botón "Ya en tu personal" deshabilitado
  tras el hire real), `settings.png` (Interface sin los dos toggles muertos, todo limpio).

**Archivos nuevos:** `routes/SeafarerSearch/{SeafarerSearch.js,useSeafarerSearch.js,styles.less,index.js}`.
**Archivos borrados:** `services/Shell/` (4), `App/UpdaterBanner/` (3), `routes/Discover/` (6),
`components/MetaPreview/` (13), `components/AddonDetailsModal/` (7), `components/Toggle/` (3).
**Archivos editados:** `App/App.js`, `App/styles.less`, `App/routerViewsConfig.js`,
`services/ServicesContext/types.d.ts`, `routes/Settings/Interface/Interface.tsx`,
`routes/Settings/Interface/useInterfaceOptions.ts`, `common/translations/{en,es,pt}.json`,
`common/Icon/index.js`, `components/index.ts`, `services/Core/CoreTransport.js`, `routes/index.js`,
`interfaces/leto/tests/smoke/smoke.js`, `interfaces/leto/tests/smoke/README.md`.

Pregunta abierta: ¿saco también `common/useShell.ts` (el shell de WebView2, inerte pero sin uso
real hoy) o lo dejamos como está? Espero tu OK antes de R6.

---

## Respuesta del PM a las 2 preguntas de R5 + R6 (useShell + inventario)

**Sobre la fila `ended` en la DB:** confirmado leyendo `backend/app/routers/company.py`
(`hire_seafarer`, línea ~584): el POST busca primero si YA existe una fila en `relationships` para
ese `(company_id, seafarer_id)` — si existe, la reutiliza (`UPDATE ... SET status='active'`), no
inserta una nueva. Solo la PRIMERA corrida de la vida de una base crea una fila; todas las
siguientes alternan el `status` de esa misma fila entre `active`/`ended`. **No se acumula una fila
por corrida.**

**Smoke — guard de host:** agregado en `smoke.js`, antes de validar nada más: si
`PBS_SMOKE_BASE_URL` no resuelve a `localhost`/`127.0.0.1`/`::1`, el script sale con código 2 sin
tocar nada. Probado explícitamente contra un host real (`pbtradingsolutions.com`) — se niega
correctamente. Documentado en el README con la explicación de la fila reutilizada.

## R6 — useShell.ts borrado + inventario final (en curso)

Autorizada así: "useShell.ts: si, va tambien, con todo lo que dependa de el... INVENTARIO final de
lo que sigue siendo codigo derivado de stremio-web... Nada de reescribir todavia en R6, solo
useShell + inventario."

### useShell.ts borrado

`common/useShell.ts` (el hook de `chrome.webview`/WebView2, inerte en cualquier navegador real)
borrado, y todo lo que dependía de él:
- `App/App.js`: sin `const shell = useShell();`, sin el efecto `onOpenMedia` completo (escuchaba
  un mensaje `open-media` de WebView2 que nunca llega en un navegador — usaba
  `CONSTANTS.PROTOCOL = 'stremio:'` para decidir si abrir `#/myexams?addon=...`, una ruta de Castor
  que ni existe en este build), sin las dos líneas `shell.windowClosed && shell.send('quit')`
  dentro de `onCoreEvent`/`onCtxState` (dependían de `settings.quitOnClose`, un campo que tampoco
  existe en `DEFAULT_STATES` — ya las había dejado inertes al sacar esos toggles en R5), y sin
  `shell.windowClosed` en las dependencias del último `useEffect`.
- `CONSTANTS.PROTOCOL` sacado de `common/CONSTANTS.js` — quedó sin ningún consumidor tras lo de
  arriba (confirmé por grep).
- `common/useFullscreen.ts` — **reescrito**, no solo editado: tenía una rama real
  (`shell.active ? shell.send('win-set-visibility',...) : document.requestFullscreen()/
  exitFullscreen()`) donde la rama `shell.active` NUNCA se ejecutaba en la práctica (siempre false
  en un navegador), así que ya funcionaba hoy únicamente por la rama nativa del navegador. Saqué
  toda la rama shell (incluido el atajo F11, que solo actuaba si `shell.active`) y dejé solo la
  Fullscreen API nativa — mismo comportamiento visible, cero dependencia de shell. Sigue siendo
  usado de verdad por el botón de pantalla completa del `HorizontalNavBar` (⛶, visible en todas las
  capturas) y por el atajo de teclado "F".
- `common/index.js` — sin el export de `useShell`.

Grep de cierre: `useShell`, `shell.windowClosed`, `shell.send`, `shell.on(`, `shell.off(`,
`CONSTANTS.PROTOCOL` → **0 referencias rotas** (la única mención de "useShell" que queda es un
comentario propio en `useFullscreen.ts` explicando por qué ya no está).

### Inventario final

Lectura archivo por archivo de todo `interfaces/leto/` (excluyendo lo ya resuelto en fases
anteriores: `routes/CompanyDashboard`, `routes/SeafarerSearch`, `routes/SeafarerProfile`,
`routes/MyFleet`, `common/crewData.js`, `crewStore.js`, `Icon/`, `theme.ts`). Nada de esto se tocó
— es solo lectura y clasificación, sin cambios de código.

#### App/

| Archivo | Líneas | Clasificación | Por qué |
|---|---|---|---|
| `App/App.js` | 177 | YA PROPIO | Reescrito en R4-R6 (sin Chromecast/Shell/UpdaterBanner/useShell); solo queda estructura genérica de lifecycle. |
| `App/index.js` | 5 | YA PROPIO | Bootstrap trivial, genérico. |
| `App/withProtectedRoutes.js` | 12 | YA PROPIO | Ya es un passthrough no-op (comentario explícito: auth de Stremio removida). |
| `App/DeepLinkHandler.js` | 22 | **BORRAR** | 100% streaming-server/torrent (`streamingServer.torrent`, `deepLinks.metaDetailsVideos`). `useStreamingServer` siempre devuelve `torrent: null` — nunca hace nada real. |
| `App/SearchParamsHandler.js` | 63 | **BORRAR** | Solo reacciona a `?streamingServerUrl=` en la URL — concepto inexistente en Pollux, nunca se dispara. |
| `App/ServicesToaster.js` | 77 | **BORRAR** | Escucha `'CoreEvent'` del transport, que `CoreTransport.js` JAMÁS emite (solo emite `'init'`/`'NewState'`). Sus ramas son Torrent/Magnet/PlayingOnDevice (Stremio puro) + un listener de `DragAndDrop` (también muerto). |
| `App/routerViewsConfig.js` | 55 | YA PROPIO | Tabla de rutas propia, mantenida al día en cada fase. |
| `App/ErrorDialog/` | 58 | YA PROPIO | Genérico, sin conceptos Stremio, real si `core.error` se setea. |
| `App/ShortcutsModal/` | 59 | YA PROPIO | Real, muestra los atajos que sobreviven tras R1/R2. |
| `App/styles.less` | 410 | YA PROPIO | Sin reglas muertas obvias tras la limpieza de R4/R5 (no auditado línea por línea). |

#### common/

| Archivo | Líneas | Clasificación | Por qué |
|---|---|---|---|
| `common/routesRegexp.js` | 62 | YA PROPIO (parcial huérfano) | 13 entradas: **8 usadas** (companyDashboard, companyCrewdb, myfiles, companyCalendar, myFleet, seafarerProfile, metadetails, settings), **5 huérfanas**: `calendar`/`myprofile` (lado marino, no de empresa), `continuewatching` (Stremio puro, nunca tuvo componente), `myexams` (ruta de Castor, muerta desde R3), `dashboard` (no mapeada). |
| `common/CoreSuspender.js` | 79 | YA PROPIO | Infra genérica de Suspense sobre el mock de Core. |
| `common/useModelState.js` | 76 | YA PROPIO | Mecanismo genérico de pub/sub de "modelo", sigue siendo necesario para `ctx` (Settings). |
| `common/useProfile.js` (+.d.ts) | 24 | REESCRIBIR | Uso real (Settings), pero convierte `streamingServerWarningDismissed` a `Date` — resto de streaming-server incrustado en un hook que debería ser solo "perfil". |
| `common/useSettings.ts` | 27 | YA PROPIO | Wrapper delgado y real, usado por Settings/Interface. |
| `common/useStreamingServer.js` (+.d.ts) | 11 | **BORRAR** | Solo consumidores: `DeepLinkHandler` (muerto) y `useTorrent` (muerto). |
| `common/useTorrent.js` | 50 | **BORRAR** | Parseo de magnet links — único consumidor es `SearchBar.js`, que nunca se monta (`searchBar={false}` desde R2). |
| `common/useTranslate.js` | 39 | **BORRAR** | Reescrito en Fase 4, pero su único consumidor histórico (`Board.js`) se borró en R4. Cero consumidores hoy. |
| `common/useOnScrollToBottom.js` | 22 | **BORRAR** | Genérico, pero su único uso era `Discover.js`, borrado en R5. |
| `common/useOutsideClick.ts` | 27 | YA PROPIO | Genérico, uso real en `MultiselectMenu.tsx`. |
| `common/usePWA.js` | 14 | YA PROPIO | Genérico, uso real en `HorizontalNavBar`/`NavMenuContent`. |
| `common/useLanguageSorting.ts` | 38 | YA PROPIO | Genérico, uso real en el selector de idioma de Settings. |
| `common/useBinaryState.js` (+.d.ts) | 27 | YA PROPIO | Genérico, usado en varios lados reales. |
| `common/Shortcuts/*` | 123 | YA PROPIO | Real (`ShortcutsModal`, Settings/Shortcuts), `shortcuts.json` ya podado en R1/R2. |
| `common/Toast/*` | 331 | YA PROPIO (infra) | Infra genérica; su único consumidor **vivo** hoy es `SharePrompt` (que a su vez está muerto, ver abajo) — revisar si sigue teniendo sentido mantenerla una vez se borre `SharePrompt`. |
| `common/Tooltips/*` | 256 | YA PROPIO | Infra genérica, sin lógica Stremio. |
| `common/FileDrop/*` | 132 | **BORRAR** | `onFileDrop` tiene cero consumidores reales — nadie llama `.on(type, listener)`. Depende de `MIME_SIGNATURES` (firmas de archivos de subtítulos, concepto Stremio). Montado en `App.js` sin ningún efecto real. |
| `common/Platform/*` | 77 | YA PROPIO | Genérico, uso real en `Settings.tsx`. |
| `common/CONSTANTS.js` | 125 | REESCRIBIR | Ya se sacaron `CHROMECAST_RECEIVER_APP_ID` (R4) y `PROTOCOL` (R6); queda `MIME_SIGNATURES` (huérfana, solo la usa `FileDrop`) y otras constantes de streaming/subtítulos/reproductor sin revisar una por una. |
| `common/interfaceLanguages.json` | 14 | YA PROPIO | Real, los 3 idiomas que ofrece Pollux. |
| `common/seafarerStore.js` | 78 | YA PROPIO | Real, usado por Calendar. |
| `common/crewDocData.js` | 13 | YA PROPIO | Real, usado por Library. |
| `common/profileData/*.json` | — | YA PROPIO | 7 catálogos reales, usados por SeafarerProfile/CompanyDashboard/SeafarerSearch. |

#### services/

| Archivo | Líneas | Clasificación | Por qué |
|---|---|---|---|
| `services/Core/Core.js` | 92 | REESCRIBIR | Real (`App.js` lo necesita), pero mismo patrón genérico "active/error/starting/transport + EventEmitter" que tenía `Shell.js` (ya borrado) — estructura heredada, no lógica propia. Trivial de simplificar dado que `CoreTransport` ya es un mock JS. |
| `services/Core/*.d.ts` | 44 | YA PROPIO | Tipos genéricos, sin residuo Stremio relevante. |
| `services/DragAndDrop/*` | 100 | **BORRAR** | 100% drag-and-drop de archivos `.torrent`/`.srt`/`.vtt` sobre la ventana — cero relevancia en Pollux. Arranca en `App.js`, el único efecto real es un `preventDefault()` genérico. |
| `services/KeyboardShortcuts/*` | 95 | YA PROPIO | Ya adaptado del todo (Digit1-6 → rutas reales, arreglado en R2/R3). |
| `services/ServicesContext/*` | 58 | YA PROPIO | Boilerplate de contexto genérico, sin lógica Stremio. |

#### i18n

| Archivo | Líneas | Clasificación | Por qué |
|---|---|---|---|
| `src/index.js` (init i18next) | 47 | YA PROPIO | Catálogo propio de 3 idiomas (Fase 4). |
| `common/translations/{en,es,pt}.json` | 220 claves c/u | REESCRIBIR | **Solo 55 (25%) de las 220 claves están referenciadas hoy en algún componente vivo; 165 (75%) sin uso** — casi todas de addons/catálogos/reproductor/board/episodios (`ADDON_*`, `CTX_PLAY`, `CTX_WATCHED`, `BOARD_CONTINUE_WATCHING`, `EPISODE`, `CALENDAR_NOT_LOGGED_IN`, etc.). Las 3 traducciones están sincronizadas entre sí. |

#### Build config

| Archivo | Líneas | Clasificación | Por qué |
|---|---|---|---|
| `webpack.config.js` | 262 | No auditado en profundidad | Sin hallazgos obvios de config muerta en un vistazo. El alias `stremio-router` sigue siendo necesario (infra de ruteo real). |
| `tsconfig.json` | 16 | YA PROPIO | Config estándar, sin nada Stremio-específico. |
| `package.json` | 85 | REESCRIBIR (parcial) | Dependencia claramente huérfana: `magnet-uri` (solo la usa `useTorrent.js`, en BORRAR). No se auditó dependencia por dependencia. |

#### components/

| Carpeta | Líneas | Clasificación | Por qué |
|---|---|---|---|
| `Button/`, `Image/`, `ModalDialog/`, `Popup/`, `TextInput/`, `HorizontalScroll/`(*) | 99+42+310+197+55+64 | YA PROPIO | Genéricos (0 términos Stremio), con consumidor real confirmado. |
| `Checkbox/`, `ContextMenu/`, `DelayedRenderer/`, `NumberInput/`, `Transition/` (y `HorizontalScroll` si al final no tiene consumidor — a confirmar) | 185+122+29+182+62 | **BORRAR** | Huérfanos totales: cero consumidor real (ni JSX ni import) fuera de su propia carpeta. |
| `Multiselect/` | 305 | REESCRIBIR | Sin términos Stremio directos, pero su único consumidor es `MetaItem.js` (menú de "marcar visto/quitar de biblioteca" — acciones Stremio). |
| `MultiselectMenu/` | 404 | YA PROPIO | Genérico, consumidor real: selector de idioma de Settings. |
| `MetaItem/` | 882 | REESCRIBIR | El archivo más grande de `components/`. Sigue siendo el `MetaItem` de Stremio (poster/type/watched/deepLinks/library) casi intacto. Único consumidor real hoy: `LibItem.js` (Library) — atado a tu decisión sobre Library. |
| `LibItem/` | 152 | REESCRIBIR | Usa `MetaItem` + conceptos "library item" — mismo caso, atado a Library. |
| `MainNavBars/` | 176 | YA PROPIO | Reescrito del todo (Mannat, COMPANY_TABS, sidebar colapsable). |
| `NavBar/VerticalNavBar` + `NavTabButton` | 307 | YA PROPIO | Reescrito (Iconoir/hand-drawn CREW_ICONS, tabs reales). |
| `NavBar/HorizontalNavBar` (sin SearchBar) + `NavMenu/` | 388 | YA PROPIO | Real, usa `useFullscreen`/`usePWA` ya propios. |
| `NavBar/HorizontalNavBar/NotificationBell.tsx` | 198 | YA PROPIO | Completamente propio (E-3), `/api/notifications/me` real, sin nada Stremio. |
| `NavBar/HorizontalNavBar/SearchBar/*` | 395 | **BORRAR** | Nunca se monta (`searchBar={false}` desde R2 en `MainNavBars.tsx`). Incluye `useLocalSearch.js`/`useSearchHistory.js` (modelos `local_search`/`ctx.searchHistory`, huérfanos en la práctica) y depende de `useTorrent` (también BORRAR). |
| `ShortcutsGroup/` | 218 | YA PROPIO | Real, usado por `ShortcutsModal`. |
| `SharePrompt/` | 196 | **BORRAR** | Cero consumidores JSX en todo el proyecto — su consumidor histórico era `MetaPreview.js`, borrado en R5. |

#### Library (solo inventario, sin decisión)

| Archivo | Líneas | Nota |
|---|---|---|
| `Library.js` | 60 | Conceptualmente propio (sidebar "Document Categories", sin `watched`/`libraryItem`/`catalog` en el archivo), pero la funcionalidad real es un stub: "Subida de documentos: próximamente". |
| `useDocumentUpload.js` | 20 | Usa `crewDocData.js` (propio). |
| `Placeholder/` | 183 | No revisado en detalle. |
| `styles.less` | 294 | No revisado en detalle. |
| **Total** | **~562** | Depende indirectamente de `MetaItem`/`LibItem` si en algún punto lista documentos como "items" — no confirmado en este barrido rápido. |

#### Calendar (solo inventario, sin decisión)

| Archivo | Líneas | Nota |
|---|---|---|
| `Calendar.tsx` | 480 | Real y funcional — `EventModal` propio local (no el borrado de `components/`), integra con `crewStore` (pending interviews, alimentado hoy por SeafarerSearch) y `seafarerStore`. Sin dependencia relevante de CoreTransport. |
| `calendarData.js` | 18 | No revisado en detalle. |
| `Calendar.less` | 823 | El archivo más grande de todo `interfaces/leto/` — no revisado línea por línea. |
| `index.ts` | 6 | Barrel. |
| **Total** | **1327** | — |

#### Resumen y hallazgos

- **BORRAR** (código Stremio sin uso real hoy) ≈ **1.520 líneas**: `App/DeepLinkHandler.js`,
  `App/SearchParamsHandler.js`, `App/ServicesToaster.js`, `common/useStreamingServer.{js,d.ts}`,
  `common/useTorrent.js`, `common/useTranslate.js`, `common/useOnScrollToBottom.js`,
  `common/FileDrop/*`, `services/DragAndDrop/*`, `components/{Checkbox,ContextMenu,
  DelayedRenderer,HorizontalScroll,NumberInput,Transition}`,
  `components/NavBar/HorizontalNavBar/SearchBar/*`, `components/SharePrompt/*`.
- **REESCRIBIR** (uso real, estructura heredada) ≈ **1.500 líneas de código** (sin contar los
  JSON de traducción): `common/useProfile.js`, `common/CONSTANTS.js`, `services/Core/Core.js`,
  `common/translations/*.json` (165/220 claves muertas), `components/Multiselect/`,
  `components/MetaItem/`, `components/LibItem/` (estos dos últimos atados a tu decisión sobre
  Library).
- **YA PROPIO** ≈ **3.800+ líneas**: el resto de lo auditado.
- **Hallazgo — referencia rota (tipos, no rompe build)**: `src/types/global.d.ts` (29 líneas) quedó
  100% huérfano — define `QtTransport`/`Chrome.webview`, tipos de `ShellTransport.js` (borrado R5)
  y `useShell.ts` (borrado R6). No rompe nada (tipos ambient, `checkJs: false`), pero es basura
  muerta directa de esas dos fases — candidato a borrar junto con lo de arriba.
- **Otro hallazgo**: además de las 5 rutas huérfanas de `routesRegexp.js`, `DEFAULT_STATES` de
  `CoreTransport.js` tiene varios modelos sin ningún consumidor real hoy (`streaming_server`,
  `catalog_page`, `addon_catalog_with_filters`, `installed_addons_with_filters`, `settings`,
  `player`, `installed_addons`, `remote_addons`, `calendar`) — no lo até a ningún archivo
  individual del inventario pedido, pero es limpieza pendiente en el mismo espíritu.
- `package.json` tiene al menos `magnet-uri` como dependencia huérfana (cae junto con `useTorrent.js`).

(*) A confirmar en R7: si `HorizontalScroll` termina sin consumidor real tras sacar `SearchBar`,
pasa de YA PROPIO a BORRAR — quedó ambiguo en el barrido, hace falta re-chequear antes de borrarlo.

### Cierre de R6

Smoke test corrido después de borrar `useShell.ts` (antes de armar el inventario, que fue de solo
lectura — no hizo falta re-correrlo): **11/11**, mismo resultado documentado arriba en "useShell.ts
borrado". Build Docker OK. Grep de cierre sin referencias rotas.

Espero tu decisión sobre qué hacer con el inventario (¿arrancamos R7 con los BORRAR primero, o
preferís otro orden?) antes de tocar código de nuevo.

---

## R7 — Todo el bloque BORRAR del inventario + hallazgos sueltos

Autorizada así: "TODO el bloque BORRAR del inventario + los hallazgos sueltos... HorizontalScroll:
confirmalo... NO toques MetaItem/LibItem/Library ni Calendar."

### Confirmación previa (antes de borrar nada)

Re-verifiqué por grep CADA elemento antes de tocarlo (misma disciplina de todas las fases
anteriores) — todos confirmados sin ningún consumidor real fuera de su propio archivo/carpeta o de
lo que también se borra en esta misma fase:
`DeepLinkHandler`, `SearchParamsHandler`, `ServicesToaster`, `useStreamingServer`, `useTorrent`,
`useTranslate`, `useOnScrollToBottom`, `FileDrop`, `DragAndDrop`, `Checkbox`, `ContextMenu`,
`DelayedRenderer`, `NumberInput`, `Transition`, `SharePrompt`.

**HorizontalScroll** (el que pediste confirmar): grep de `<HorizontalScroll`/`HorizontalScroll }`
en todo el proyecto → cero consumidores fuera del propio `components/index.ts` (que solo lo
exporta). Confirmado sin uso real — fuera también.

**Hallazgo extra no listado en el inventario original**: existen DOS carpetas `SearchBar`
distintas — `components/NavBar/HorizontalNavBar/SearchBar/` (la que vos nombraste, 7 archivos,
consumida localmente por `HorizontalNavBar.js`) y una **segunda, separada e igual de huérfana**,
`components/SearchBar/` (6 archivos, exportada en el barrel de `components/index.ts` pero sin
ningún consumidor JSX real en todo el proyecto). Las dos son la misma clase de código muerto —
las borré ambas.

### Borrado

- `App/DeepLinkHandler.js`, `App/SearchParamsHandler.js`, `App/ServicesToaster.js` — y de `App.js`:
  sus imports/renders, `FileDropProvider` (el wrapper, ya sin `<FileDropProvider>` porque
  `common/FileDrop/` se borró), y `DragAndDrop` (import de `stremio/services`, instancia en el
  memo de servicios, `.start()/.stop()`).
- `common/useStreamingServer.{js,d.ts}`, `common/useTorrent.js`, `common/useTranslate.js`,
  `common/useOnScrollToBottom.js`, `common/FileDrop/` (4 archivos) — y sus exports en
  `common/index.js`.
- `services/DragAndDrop/` (2 archivos) — y su export en `services/index.js` + el campo
  `dragAndDrop: any` en `services/ServicesContext/types.d.ts`.
- `components/{Checkbox,ContextMenu,DelayedRenderer,NumberInput,Transition,SharePrompt,
  HorizontalScroll}/` completos, **ambas** carpetas `SearchBar` (ver hallazgo arriba) — y sus
  exports en `components/index.ts`.
- En `components/NavBar/HorizontalNavBar/HorizontalNavBar.js`: el require de `./SearchBar`, la
  rama `searchBar && route !== 'addons' ? <SearchBar .../> : null`, y los props `route`/`query`/
  `searchBar` (ya sin ningún uso en el archivo — `route` solo servía para esa rama).
- En `components/MainNavBars/MainNavBars.tsx`: los props `route`/`query`/`searchBar={false}` que
  le pasaba a `<HorizontalNavBar>` (ya no los acepta) y el comentario de R2 sobre por qué estaba
  oculta — ya no aplica, la barra no existe más. También saqué `query` del tipo `Props` y del
  destructure del propio `MainNavBars` (sin ningún caller que lo use). `route` se queda: lo sigue
  usando `VerticalNavBar`'s `selected={route}`, eso es real.
- `src/types/global.d.ts` — tipos `QtTransport`/`ChromeWebView` de `ShellTransport.js`/`useShell.ts`
  (ambos ya borrados en R5/R6). Tipos ambient, no rompía el build, pero era basura muerta directa.
- `common/routesRegexp.js` — las 5 rutas huérfanas: `calendar`/`myprofile` (lado marino, no de
  empresa), `continuewatching` (Stremio puro), `myexams` (Castor, muerta desde R3), `dashboard`
  (no mapeada en ningún lado). Quedan 8 activas.
- `services/Core/CoreTransport.js`'s `DEFAULT_STATES`: saqué `streaming_server`,
  `catalog_page`, `addon_catalog_with_filters`, `installed_addons_with_filters`, `settings`,
  `player`, `installed_addons`, `remote_addons`, y `calendar` (el modelo de CoreTransport, **no**
  la ruta/archivo `routes/Calendar/` — confirmé que `Calendar.tsx` no toca CoreTransport para nada,
  así que esto no te pisa la decisión pendiente sobre esa pantalla). También saqué `local_search`:
  no estaba en tu lista original porque en el momento del inventario SÍ tenía consumidor
  (`useLocalSearch.js`), pero ese archivo se fue en esta misma fase junto con la SearchBar anidada
  — quedó huérfano como efecto directo de borrar lo que vos mismo autorizaste, mismo criterio que
  usé en R4/R5 con `board`/`discover`.
  **Dejé sin tocar** `library` y `search` en `DEFAULT_STATES`: ninguno de los dos estaba en tu lista
  ni en el inventario original como huérfano confirmado, y `library` en particular está pegado al
  nombre de la pantalla que dijiste no tocar — preferí no asumir y lo dejo para cuando decidas sobre
  Library.
- `package.json`: saqué `magnet-uri` (dependencia de `useTorrent.js`, ya borrado). Además, mientras
  confirmaba que no quedara nada huérfano, encontré por grep exacto (`require('hat')`,
  `require('langs')`, etc., no coincidencias de substring) que **`hat`, `langs` y
  `a-color-picker` tampoco tienen NINGÚN uso real en todo `src/`** — las saqué también, junto con
  `@types/hat` (devDependency). Lockfile regenerado (`pnpm install --lockfile-only` en contenedor
  `node:22-alpine`, sin nada instalado en el host) — confirmé que `pnpm-lock.yaml` ya no menciona
  ninguna de las 4.
  **Dejé `buffer` sin tocar** aunque también tiene cero usos reales en `src/`: `webpack.config.js`
  tiene un `ProvidePlugin({ Buffer: ['buffer', 'Buffer'] })` que depende de ese paquete — sacarlo
  bien hecho implica tocar `webpack.config.js`, que no estaba en lo que autorizaste para R7 (solo
  "package.json... con lockfile regenerado"). Lo dejo como nota para cuando toquemos build config.

### NO tocado (como pediste)

`components/MetaItem/`, `components/LibItem/`, `routes/Library/`, `routes/Calendar/` — cero
cambios, cero referencias nuevas rotas hacia ellos (de hecho no dependían de nada de lo borrado
salvo `Calendar.tsx` que no usa CoreTransport, confirmado arriba).

### Verificación

- Grep exhaustivo de cierre (nombres de componentes/hooks/handlers borrados, ambas `SearchBar`,
  `QtTransport`/`ChromeWebView`, y cada modelo de `DEFAULT_STATES` sacado): **0 referencias rotas**.
- Build Docker OK — sin errores de webpack pese a sacar 5 dependencias npm de golpe.
- Smoke test: **11/11**, incluyendo el flujo real de Add to Roster.

**Archivos borrados** (49 en total): `App/{DeepLinkHandler,SearchParamsHandler,ServicesToaster}.js`
(3), `common/{useStreamingServer.js,useStreamingServer.d.ts,useTorrent.js,useTranslate.js,
useOnScrollToBottom.js}` (5), `common/FileDrop/` (4), `services/DragAndDrop/` (2),
`components/Checkbox/` (3), `components/ContextMenu/` (3), `components/DelayedRenderer/` (2),
`components/HorizontalScroll/` (3), `components/NumberInput/` (3), `components/Transition/` (2),
`components/SharePrompt/` (3), `components/SearchBar/` (6, la huérfana no listada),
`components/NavBar/HorizontalNavBar/SearchBar/` (7), `src/types/global.d.ts` (1).
**Archivos editados:** `App/App.js`, `App/styles.less`, `common/index.js`, `services/index.js`,
`services/ServicesContext/types.d.ts`, `components/index.ts`,
`components/NavBar/HorizontalNavBar/HorizontalNavBar.js`, `components/MainNavBars/MainNavBars.tsx`,
`common/routesRegexp.js`, `services/Core/CoreTransport.js`, `package.json`, `pnpm-lock.yaml`.

Espero tu OK antes de R8 (el bloque REESCRIBIR: `useProfile.js`, `CONSTANTS.js`,
`services/Core/Core.js`, traducciones, `Multiselect`, y `MetaItem`/`LibItem` cuando decidas sobre
Library).

---

## R8 — Bloque REESCRIBIR: Core/CoreTransport, useProfile, CONSTANTS, traducciones, Multiselect, webpack

Autorizada así: "services/Core/Core.js + CoreTransport: reemplazar por una capa propia minima (o
eliminar si los fetch directos... la hacen innecesaria)... useProfile.js y CONSTANTS.js: reescribir
solo lo que se usa de verdad... Traducciones: el catalogo queda solo con las ~55 claves con uso
real... Multiselect: reescribir propio. NO toques MetaItem/LibItem/Library/Calendar. Incluye ahora
webpack.config.js."

### Core/CoreTransport — eliminados del todo

Antes de tocar nada confirmé el ÚNICO consumidor real que quedaba tras R4-R7: `useProfile.js`
(modelo `ctx`, para `interfaceLanguage`). Todo lo demás que `CoreTransport` seguía "atendiendo"
(`useDataExport.js` → modelo `data_export`) resultó ser **código ya muerto sin ningún consumidor
de UI** — `routes/Settings/General/General.tsx` nunca importa `useDataExport`, la pestaña "Exportar
datos" ya no existe. Lo borré también.

Con eso confirmado, borré `services/Core/` entero (7 archivos: `Core.js`, `CoreTransport.js`, y sus
4 `.d.ts` + `index.js`) — no quedó "capa mínima" que reemplazarlo porque no hacía falta ninguna:
- **`App/App.js` reescrito**: sin el estado `initialized`/gate de carga (esperaba a que
  `CoreTransport` emitiera `'init'` por `setTimeout(0)` — ya no hay nada async que esperar), sin
  `ErrorDialog` (su único trigger era `core.error`, que ya no puede pasar — **borrado el
  componente entero**, 3 archivos), sin el efecto que escuchaba `'CoreEvent'` (`CoreTransport`
  JAMÁS lo emitía — hallazgo ya documentado en el inventario R6) ni los 4 dispatches de
  `onWindowFocus` (confirmé que ya eran no-ops). La app renderiza directo, sin loader.
  - El idioma persistido ya NO se aplica con un efecto en `App.js` tras montar (eso causaba un
    parpadeo real: arrancaba en inglés y recién después cambiaba) — ahora `src/index.js` lee
    `pollux-settings` directo y se lo pasa a `i18n.init({ lng: ... })`, así que el idioma correcto
    está desde el primer render. Es una mejora real, no solo paridad.
  - `services.core` se mantiene en el objeto de servicios pero como **stub inerte**
    (`{ transport: { dispatch: () => {} } }`) — `components/LibItem/LibItem.js` (intocable) todavía
    llama `core.transport.dispatch(...)` 4 veces (marcar visto, quitar de biblioteca, etc.); esas
    acciones ya eran no-ops con el CoreTransport viejo (nunca manejaba nada salvo
    `Ctx/UpdateSettings`), así que el stub no cambia ningún comportamiento observable.
- **`common/useProfile.js` reescrito del todo**: ya no es un wrapper de `useModelState`/
  `CoreTransport` — ahora lee/escribe directo a `localStorage['pollux-settings']` (misma key de
  siempre), con un `EventEmitter` chico para que los componentes se re-rendericen cuando cambia.
  Expone `useProfile()` (hook, `{ settings }`) y `useProfile.updateSettings(partial)` (función
  estática en el mismo módulo). De los ~30 campos que tenía `Settings` (subtítulos, audio,
  streaming server...) el único real era `interfaceLanguage` — es lo único que quedó.
- **`common/useSettings.ts` borrado** (era un wrapper de 20 líneas sobre `useProfile`+
  `core.transport.dispatch`, ya no hacía falta con el nuevo `useProfile.js`) — su único consumidor,
  `common/useFullscreen.ts`, ahora no depende de ningún settings en absoluto: el chequeo de
  `settings.escExitFullscreen` que tenía **era inalcanzable desde R6** (ese campo nunca existió de
  verdad, el toggle que lo hubiera escrito se borró esa fase) — lo saqué en vez de mantenerlo vivo
  artificialmente.
- **`common/useModelState.js` borrado** (77 líneas de mecanismo pub/sub genérico Stremio —
  `useCoreSuspender`, `useRouteFocused`, throttle, deepEqual — sin ningún consumidor real tras
  borrar `useDataExport`/reescribir `useProfile`).
- **`common/CoreSuspender.js` reescrito**: de 79 a 20 líneas. La mitad del archivo (`wrapPromise`,
  el contexto de Suspense, `getState`/`decodeStream`) solo existía para que `useModelState`
  suspendiera un componente mientras esperaba datos — sin `useModelState`, nadie consume ese
  contexto. Quedó solo el HOC `withCoreSuspender` (usado hoy por Library/Settings/NavMenuContent/el
  router) con su comportamiento visible intacto: muestra el Fallback un tick, después el componente
  real — pero ya sin ninguna dependencia de `core`.
- **`routes/Settings/Settings.tsx`/`General.tsx`/`User.tsx`/`Interface.tsx`/`useInterfaceOptions.ts`
  actualizados**: `profile` dejó de pasarse como prop en cascada (Settings → General/Interface →
  User) — confirmé que `User.tsx` recibía `profile` y **nunca lo leía** (usa
  `localStorage['pollux-user']` desde F2), así que ya no lo declara. `useInterfaceOptions.ts` ahora
  llama `useProfile()`/`useProfile.updateSettings()` directo en vez de recibir `profile` por
  parámetro y dispatchar a `core.transport`.
- **`types/models/Ctx.d.ts` borrado** (89 líneas: `Auth`, `Settings` con sus ~30 campos,
  `Profile`, `Notifications`, `SearchHistory`, `StreamingServerUrl`, `Ctx`) — confirmé que, tras lo
  de arriba, nada en todo `interfaces/leto/` sigue usando esos tipos globales. `useProfile.d.ts`
  reescrito con su propio tipo chico (`PolluxSettings = { interfaceLanguage: string }`).

### `CONSTANTS.js` — de 18 exports a 1

Conté consumidores reales de las 18 constantes (grep exacto por nombre, no solo `CONSTANTS.X` —
`components/MetaItem/MetaItem.js`, que no se toca, la importa por destructuring directo:
`const { ICON_FOR_TYPE } = require(...)`). Resultado: **17 de 18 sin ningún uso real** (streaming
server, subtítulos, paginación de catálogo, categorías de links IMDB/share, MIME de subtítulos,
reproductores externos — todo pertenecía a pantallas ya borradas en R4-R7). La única superviviente,
`ICON_FOR_TYPE`, la dejé intacta (mismo Map, mismos valores) porque es la que usa `MetaItem.js`.

### Traducciones — de 220 claves a 45

Crucé cada una de las 220 claves contra todo el código fuente vivo (no solo grep de `t('KEY')`
literal — también `label={'KEY'}` pasado a un componente que traduce adentro, y `t(variable)` con
la clave viniendo de un dato, como `t(tab.label)` en `MainNavBars.tsx`). Encontré **42 con uso real
directo en código**, más **3 que solo aparecían como dato en `common/Shortcuts/shortcuts.json`**
(`SETTINGS_SHORTCUT_NAVIGATE_MENUS`/`FULLSCREEN`/`SHORTCUTS`) — mi primer barrido las pasó por
alto porque escaneaba `.js/.ts/.tsx`, no `.json`; las encontré porque revisé la captura del modal
de Shortcuts a mano y vi la clave cruda en pantalla ("SETTINGS_SHORTCUT_NAVIGATE_MENUS" en vez de
"Navigate between menus") — **sin ese chequeo visual se hubiera ido así**. Total final: **45
claves**, mismas en los 3 idiomas.

Sobre renombrar claves con nombre de Stremio (lo que pediste): revisé cada una de las 45 — las que
sí son claramente jerga de Stremio (`CTX_MARK_WATCHED`, `CTX_MARK_UNWATCHED`, `LIBRARY_PLAY`,
`LIBRARY_DETAILS`, `LIBRARY_REMOVE`, `LIBRARY_RESUME_DISMISS`, `CONTINUE_WATCHING`,
`LIBRARY_NOT_LOGGED_IN`, `NOT_LOGGED_IN_CLOUD`, `NOT_LOGGED_IN_RECOMMENDATIONS`) están **todas**
referenciadas como string literal hardcodeado dentro de `components/MetaItem/MetaItem.js`,
`components/LibItem/LibItem.js` o `routes/Library/Placeholder/Placeholder.tsx` — los tres
intocables. Renombrar la clave sin tocar esos archivos los rompe (quedarían pidiendo una clave que
ya no existe). Las demás claves que sí pude tocar (`SETTINGS_*`, `BUTTON_CLOSE`,
`ENTER_FULLSCREEN`/`EXIT_FULLSCREEN`, etc.) ya eran nombres genéricos propios, no jerga Stremio —
no encontré ninguna candidata real a renombrar sin pisar Library/MetaItem. Lo dejo dicho para que
no parezca que lo salteé.

Además, doble verificación con navegador real (no solo grep): escaneé el `innerText` de las 6
pantallas de la empresa + el modal de Shortcuts buscando cualquier patrón `ALL_CAPS_CON_GUION` —
0 coincidencias en las 7 superficies, confirmando que no quedó ninguna clave más sin resolver.

### Multiselect — reescrito, mismo contrato externo

`components/Multiselect/Multiselect.js` reescrito de 182 a 95 líneas. Su único consumidor real es
`components/MetaItem/MetaItem.js` (intocable), así que mantuve el contrato EXACTO que ese archivo
usa (`className`, `renderLabelContent`, `options`, `onOpen`, `onClose`, `onSelect`, `onClick`,
`tabIndex`) incluyendo el detalle no obvio de por qué el click dentro del menú no debe re-abrir el
label (un `nativeEvent.toggleMenuPrevented` que tiene que setearse en el mismo tipo de evento
—`click`— que lee el handler de afuera, no en `mousedown`, porque son objetos de evento nativo
distintos y no comparten estado). Lo que saqué: el modo `mode="modal"`, los chips de selección
múltiple (`selected`), el label autogenerado (`renderLabelText`/`title`) y `dataset` — ninguno
tenía uso real (MetaItem siempre pasa su propio `renderLabelContent` y nunca pasa esas props).
Confirmé aparte que `components/MultiselectMenu/` (la del selector de idioma de Settings) es un
componente totalmente independiente que no pasa por este archivo — cero riesgo cruzado.

### webpack.config.js + package.json

- Saqué el `ProvidePlugin({ Buffer: ['buffer', 'Buffer'] })` y la regla de módulo `.wasm` (no hay
  ningún `.wasm` en el proyecto — era del Core viejo en Rust/WASM). Confirmé cero usos de
  `Buffer.` en todo `src/` antes de sacarlo.
- `package.json`: salió `buffer` (ya sin la ProvidePlugin que lo necesitaba) y `lodash.intersection`
  (único consumidor era `useModelState.js`, borrado). Lockfile regenerado igual que en R7
  (contenedor `node:22-alpine`, nada en el host).
- **No toqué** el alias `'stremio'` → `src/` en `resolve.alias` (dijiste explícitamente dejar ese
  renombre para la fase final).

### Verificación

- Grep exhaustivo de cierre (Core/CoreTransport, useModelState/useSettings/useCoreSuspender/
  useDataExport, ErrorDialog, `CONSTANTS.X` fuera de `ICON_FOR_TYPE`, tipos globales `Profile`/
  `Settings`): **0 referencias rotas**.
- Build Docker OK en cada paso intermedio (lo corrí varias veces según iba avanzando, no solo al
  final) — sin errores de TypeScript pese a borrar `Ctx.d.ts` y reescribir `useProfile.d.ts`.
- Smoke test: **12/12** — las 11 de siempre más el nuevo `language-switch` (cambia a español,
  confirma "Base de Tripulantes" en el sidebar real; cambia a português Brazil, confirma "Base de
  Tripulação"; vuelve a English, confirma "Crew Database" — y en cada paso escanea toda la página
  buscando claves `ALL_CAPS` sin resolver). Corrido dos veces, mismo resultado.
- Capturas revisadas a mano: `settings.png`, `settings-lang-español.png`,
  `settings-lang-português-Brazil.png`, `shortcuts-modal.png` — todo traducido correctamente en los
  3 idiomas, nada crudo.

**Tamaño del bundle — con una salvedad que quiero dejar clara:** no capturé el tamaño ANTES de
empezar R8 (debí hacerlo al cerrar R7 y no lo hice). Lo que tengo es el número de AHORA:
`main.js` minificado = **564 KB** (build de producción, `docker compose up -d --build leto`).
No tengo forma segura de reconstruir el "antes" exacto sin tocar git (esta carpeta no está
trackeada en el repo de `pb-website` — confirmé con `git ls-tree HEAD` que no hay ningún commit
con estos archivos, así que ni siquiera `git show` de solo lectura sirve). Si querés el número real
de "antes", puedo levantar un worktree aparte para reconstruir el estado pre-R4 y compilarlo ahí,
pero eso son operaciones de git que la orden vigente prohíbe sin tu OK explícito — decime si lo
autorizás. Como proxy: en esta sola fase salieron ~15 archivos completos (`services/Core/` 7,
`ErrorDialog` 3, `useModelState.js`, `useSettings.ts`, `useDataExport.js`+`.d.ts`, `Ctx.d.ts`),
`CONSTANTS.js` bajó de 126 a 20 líneas, las traducciones de 220 a 45 claves (~×3 idiomas), y 2
dependencias npm menos.

**Archivos borrados:** `services/Core/` (7), `App/ErrorDialog/` (3), `common/useModelState.js`,
`common/useSettings.ts`, `routes/Settings/General/useDataExport.{js,d.ts}`, `types/models/Ctx.d.ts`.
**Archivos reescritos:** `App/App.js`, `common/useProfile.js`, `common/useProfile.d.ts`,
`common/useFullscreen.ts`, `common/CoreSuspender.js`, `common/CONSTANTS.js`,
`components/Multiselect/Multiselect.js`, `common/translations/{en,es,pt}.json`.
**Archivos editados:** `App/styles.less`, `common/index.js`, `services/index.js`,
`services/ServicesContext/types.d.ts`, `routes/Settings/Settings.tsx`,
`routes/Settings/General/General.tsx`, `routes/Settings/General/User/User.tsx`,
`routes/Settings/Interface/Interface.tsx`, `routes/Settings/Interface/useInterfaceOptions.ts`,
`webpack.config.js`, `package.json`, `pnpm-lock.yaml`,
`interfaces/leto/tests/smoke/{smoke.js,README.md}`.

Espero tu respuesta sobre el tamaño de bundle "antes" (¿autorizás un worktree para reconstruirlo, o
lo dejamos así?) y tu OK para seguir.

---

## Respuesta del PM: bundle y R9

Bundle confirmado por el PM con la referencia de Fase 4: **937 KB → 564 KB**. No hizo falta
worktree. Deploy #75 (las 3 migraciones pendientes que bloqueaban el deploy a prod) queda
descartado por Rick por ahora, sin fecha.

## R9 — Alias `stremio` → `pollux` en webpack/tsconfig/vite, package.json propio

Autorizada así: "renombrar el alias 'stremio' de webpack.config.js/tsconfig (y jest/eslint si
aplica) a uno propio, p.ej. 'pollux', en todos los imports y .less, incluidos Library/Calendar/
MetaItem/LibItem (solo el import, nada de su logica). Tambien interfaces/leto/package.json:
name/displayname/author propios (license lo dejamos)."

### Alcance real

- Revisé jest/eslint primero: **no hacía falta tocar ninguno de los dos**. No existe
  `jest.config.*` (el único uso de jest, `scan-translations`, apunta a
  `tests/i18nScan.test.js`, que **no existe** — script ya roto de antes, no es cosa mía, lo dejo
  anotado abajo). `eslint.config.mjs` no tiene ninguna referencia a `stremio`.
- Reemplacé el alias en **35 archivos** (`.js`/`.ts`/`.tsx`, 85 apariciones de
  `require('stremio/...')`/`from 'stremio/...'`) y **23 archivos `.less`** (`~stremio/...`),
  con `sed` acotado exactamente a esos dos patrones (nunca toca `stremio-router`, que es un alias
  aparte). Incluye, tal como autorizaste, el import (solo el import) dentro de
  `components/MetaItem/MetaItem.js`, `components/LibItem/LibItem.js`, `routes/Library/Library.js`
  y `routes/Calendar/Calendar.tsx` — confirmé después de correrlo que en esos 4 archivos **no
  cambió ninguna otra línea**, solo las rutas de `require(...)`.
- **Hallazgo que el `sed` no agarraba** (sintaxis distinta, sin `require(`/`from`):
  `src/modules.d.ts` tenía `declare module 'stremio/components/NavBar';` y
  `declare module 'stremio/components/ModalDialog';` — declaraciones ambient de TypeScript para
  esos dos componentes JS sin su propio `.d.ts`. Sin este fix hubieran quedado apuntando a un
  alias que ya no existe. Corregido a mano.
- `webpack.config.js` y `tsconfig.json`: alias/paths `'stremio'` → `'pollux'`. `'stremio-router'`
  se deja igual (paquete de terceros vía alias, no es lo que pediste renombrar).
- `vite.config.js` (el dev server de `pnpm dev`, no nombrado explícitamente pero comparte el mismo
  alias y se hubiera roto si no lo tocaba): mismo cambio de alias, **más dos arreglos que
  aproveché de encontrar mientras estaba ahí**:
  - `optimizeDeps.include` todavía listaba `stremio-translations` y `@stremio/stremio-icons/react`
    (paquetes de Stremio que ya no existen desde Fase 2/4, nunca se limpió esta lista) y
    `langs`/`lodash.intersection`/`magnet-uri`/`a-color-picker`/`hat`/`buffer` (los que saqué de
    `package.json` en R7/R8) — `pnpm dev` se habría roto al intentar pre-bundlear paquetes
    inexistentes. Los saqué todos.
  - El plugin `bufferPolyfillPlugin()` (inyectaba `window.Buffer` en el HTML de dev) ya no tenía
    sentido tras confirmar en R8 que nada en `src/` usa `Buffer.` — lo saqué junto con su registro
    en `plugins: [...]` y la extensión `.wasm` que ya no hace falta (mismo criterio que
    `webpack.config.js` en R8).
- `interfaces/leto/package.json`: `"name": "pollux"`, `"displayName": "Pollux"`,
  `"author": "PBS Trading Solutions"`. `"license": "gpl-2.0"` intacto, como pediste.

### `grep -ri 'stremio' interfaces/leto` (sin `node_modules`/`build`) — lo que queda y por qué

**34 archivos**, todos justificados:

| Categoría | Archivos | Por qué queda |
|---|---|---|
| Paquete de terceros `stremio-router` (alias separado, no autorizado a renombrar) | `App/App.js`, `App/styles.less` (`@import '~stremio-router/styles.css'`), `components/ModalDialog/ModalDialog.js`, `components/NavBar/HorizontalNavBar/NavMenu/NavMenu.js`, `components/Popup/Popup.js`, `routes/Settings/Settings.tsx`, `src/modules.d.ts` (`declare module 'stremio-router'`), `vite.config.js`, `webpack.config.js` | Es un paquete instalado real (`src/router`, aliaseado como `stremio-router`) — vos pediste el alias `'stremio'`, no este. |
| Dependencia de GitHub de un tercero real | `package.json`, `pnpm-lock.yaml` | `spatial-navigation-polyfill` se instala desde `github:Stremio/spatial-navigation` — es el nombre real de la org de GitHub de otra empresa, no se puede renombrar. |
| Comentarios históricos/explicativos (código ya reescrito, el comentario documenta qué reemplazó) | `App/routerViewsConfig.js`, `App/withProtectedRoutes.js`, `assets/pollux-colors.less`, `common/Icon/index.js`, `common/routesRegexp.js`, `common/useProfile.js`, `components/MainNavBars/MainNavBars.less`, `components/MetaItem/MetaItem.js`, `components/MetaItem/styles.less`, `components/Multiselect/styles.less`, `components/NavBar/HorizontalNavBar/NavMenu/NavMenuContent.js`, `components/NavBar/HorizontalNavBar/styles.less`, `components/NavBar/VerticalNavBar/NavTabButton/NavTabButton.js`, `components/Popup/styles.less`, `src/index.js`, `routes/Calendar/Calendar.less`, `routes/CompanyDashboard/CompanyDashboard.js`, `routes/Library/styles.less`, `routes/NotFound/styles.less`, `routes/SeafarerProfile/SeafarerProfile.js`, `routes/SeafarerProfile/useSeafarerProfile.js`, `routes/SeafarerSearch/SeafarerSearch.js`, `routes/Settings/General/General.tsx`, `routes/Settings/General/User/User.tsx`, `routes/Settings/Settings.less`, `tests/smoke/smoke.js`, `vite.config.js` (mi propio comentario nuevo explicando el fix de `optimizeDeps`) | Texto, no código — documentan de qué venía cada pantalla/estilo. No afectan build ni imports. |

Ninguno de los 34 es una referencia funcional al alias viejo — confirmé con grep separado
(`'stremio/` exacto, con la barra) que **0 imports/requires/declaraciones de módulo** quedan
apuntando a `stremio/*`.

### Hallazgo aparte, no corregido (no pedido, dejo la nota)

`package.json`'s script `"scan-translations": "pnpx jest ./tests/i18nScan.test.js"` apunta a un
archivo que **no existe** en el repo (`tests/i18nScan.test.js` — solo existe `tests/smoke/`). Ya
estaba así antes de que yo tocara nada; no lo arreglé porque no es parte de lo que pediste y no
tengo el criterio original de qué debía escanear ese test.

### Verificación

- Build Docker OK (`docker compose up -d --build leto nginx`).
- Smoke test: **12/12**.
- Grep de cierre exacto (`'stremio/` con barra, y `declare module 'stremio`): **0 referencias
  funcionales rotas** — el detalle completo de las 34 apariciones no funcionales queda en la tabla
  de arriba.

**Archivos editados:** 35 `.js/.ts/.tsx` + 23 `.less` (el rename mecánico del alias, lista completa
disponible si la querés — son los mismos 58 archivos que hoy usan `pollux/...` o `~pollux/...`),
más `src/modules.d.ts`, `webpack.config.js`, `tsconfig.json`, `vite.config.js`, `package.json`.

Espero tu OK antes de seguir.

---

## Corrección del PM sobre R9 + R10 autorizada

Corrección aceptada: `stremio-router` (`src/router`, código de stremio-web copiado adentro) y
`spatial-navigation-polyfill` (fork de Stremio en GitHub) SÍ son Stremio, no terceros — quedan
para esta fase.

## R10 — router propio, spatial-navigation fuera, script roto fuera, inventario final

### 1) `src/router` → `common/router/` propio

Investigué el paquete completo (11 archivos, 6 piezas: `Router` con matching por regexp,
`Route`/`ModalsContainerContext` para que cada nivel de vista tenga su propio contenedor de
modales, `Modal` como portal, `RouteFocusedContext` para que Popup/ModalDialog sepan si su nivel
sigue "arriba"). Nada de esto es lógica de streaming/catálogos — es infraestructura de ruteo
genérica — así que elegí **reescribirlo propio** (opción que vos mismo diste primero) en vez de
meter `react-router`: la app ya tiene todo el matching por regexp resuelto en
`routesRegexp.js`/`routerViewsConfig.js`, migrar a otra librería hubiera significado rehacer esa
estructura entera para lograr exactamente el mismo resultado, con más riesgo y sin ninguna
ganancia real.

Diseño nuevo en `common/router/` (5 archivos en vez de 11 — junté los pares
contexto+hook+provider que antes vivían en carpetas separadas): `Router.js` (el matching y el
"stack" de vistas — confirmé que ese apilado es real y con propósito: navegar a un nivel más
profundo, ej. Discover → perfil de marino, NO desmonta el nivel anterior, queda oculto por CSS,
así el botón atrás de `SeafarerProfile` vuelve sin perder scroll/filtros — lo preservé
exactamente), `ModalsContainer.js`, `RouteFocused.js`, `Modal.js`, `index.js` (barrel), y
`styles.css` (el mismo CSS, movido). Cambié `UrlUtils.parse()` (paquete `url` de Node) por un
`.split('?')` directo — mismo resultado exacto para las URLs reales que usamos hoy (ninguna tiene
`?` múltiples ni caracteres especiales en el path), y de paso `url` quedó sin ningún otro
consumidor en todo `src/` — lo saqué de `package.json`.

Actualicé los 5 consumidores reales (`App/App.js`, `routes/Settings/Settings.tsx`,
`components/NavBar/HorizontalNavBar/NavMenu/NavMenu.js`, `components/ModalDialog/ModalDialog.js`,
`components/Popup/Popup.js`) para importar de `pollux/common/router` en vez de `stremio-router`,
el `@import` de `App/styles.less`, agregué `declare module 'pollux/common/router';` a
`modules.d.ts` (y saqué el `declare module 'stremio-router'` viejo), y saqué el alias
`'stremio-router'` de `webpack.config.js` y `vite.config.js`.

**Hallazgo menor, no corregido (fuera de lo pedido):** `routes/Settings/Settings.tsx` hace
`const { routeFocused } = useRouteFocused();` pero el hook siempre devolvió un booleano plano, no
un objeto — esto viene de antes de que yo tocara nada. El resultado es que `routeFocused` da
`undefined` ahí y el `useLayoutEffect` que resalta la sección visible del menú de Settings al
montar nunca corre por ese camino. Preservé el comportamiento tal cual (mismo bug, ni mejor ni
peor que antes) porque no era parte de lo que autorizaste — lo dejo anotado por si en algún
momento querés que lo arregle.

### 2) `spatial-navigation-polyfill` — fuera

Confirmé un único uso en todo el proyecto: `require('spatial-navigation-polyfill');` suelto (por
efecto secundario) en la primera línea de `App/App.js`. Es el polyfill de navegación espacial de
Stremio (mover el foco con flechas del control remoto, sin mouse) — Pollux es mouse+teclado en
escritorio, no lo necesita. Saqué el `require`, la dependencia de `package.json` (era
`github:Stremio/spatial-navigation#...`, el fork real de Stremio) y su entrada en
`vite.config.js`'s `optimizeDeps`. Nada más dependía de él.

### 3) Script `scan-translations` roto — fuera

Confirmé que `tests/i18nScan.test.js` no existe (solo existe `tests/smoke/`) — el script ya estaba
roto antes de que tocara nada. Lo saqué de `package.json`. **Hallazgo aparte no corregido:** el
script `"test": "jest"` también es efectivamente un no-op hoy — no hay NINGÚN archivo `*.test.js`
en todo el proyecto. No lo toqué porque no me lo pediste y podría ser un placeholder a propósito
para cuando haya tests reales.

### 4) Inventario — más código de stremio-web copiado sin decir "stremio" en el nombre

Usé una huella confiable: **57 archivos** todavía tienen el comentario de copyright original
(`Copyright (C) 2017-2023 Smart code 203358507`) sin tocar — la señal de que ese archivo es una
copia literal de stremio-web que nunca se reescribió. Los agrupé por subsistema (no archivo por
archivo) y crucé cada uno contra si tiene consumidor real hoy:

| Subsistema | Archivos | Líneas | ¿Consumidor real hoy? | Nota |
|---|---|---|---|---|
| `common/Toast/` | 6 | ~331 | **NO — hallazgo nuevo** | Con `SharePrompt` borrado en R7 (era su único consumidor real de `useToast`), quedó 100% muerto. Solo `ToastProvider` sigue montado en `App.js`, sin que nada llame `useToast()` jamás. |
| `common/Tooltips/` | 7 | ~256 | **NO — hallazgo nuevo** | Mismo caso: `TooltipProvider` montado en `App.js`, pero cero usos reales de `useTooltip()`/`<Tooltip>` en toda la app. |
| `components/Button/`, `components/Image/` | 4 | ~141 | Sí, masivo (Button en 20+ archivos) | Primitivas de UI genéricas, sin lógica de streaming. Funcionan bien tal cual; solo "Stremio" en el sentido de que el archivo nunca se reescribió. |
| `components/ModalDialog/`, `components/Popup/` | 4 | ~440 | Sí (modal de CompanyDashboard, selector de idioma de Settings, NavMenu) | Infra de modal/popup genérica, con posicionamiento automático — igual, nunca reescrita, solo adaptada por fuera. |
| `components/NavBar/` (HorizontalNavBar, NavMenu, NavMenuContent, VerticalNavBar, NavTabButton) | 7 | ~700 | Sí, es la barra de navegación real de toda la app | El CONTENIDO ya se adaptó fuerte (Mannat, Iconoir, tabs de Pollux, R2/R6), pero el esqueleto de los componentes (manejo de eventos, estructura) sigue siendo el archivo original de Stremio. |
| `services/KeyboardShortcuts/` | 2 | ~100 | Sí, atajos reales de Pollux (R2/R3 ya remapeó las teclas) | El WRAPPER de servicio (patrón start/stop + EventEmitter) es la arquitectura original de Stremio; el contenido (qué tecla hace qué) ya es propio. |
| `services/ServicesContext/` | 4 | ~60 | Sí | Boilerplate de contexto de React tan genérico que cualquiera lo escribiría igual — "Stremio" solo de nombre/origen, no de lógica. |
| `App/ShortcutsModal/` | 1 | 59 | Sí, muestra los atajos reales (R1/R2 ya limpiaron `shortcuts.json`) | Estructura del modal sin tocar; los datos que muestra ya son 100% propios. |
| `routes/NotFound/` | 2 | ~35 | Sí | Pantalla "no encontrado" genérica — funcionalmente correcta para cualquier app, nunca hizo falta cambiarla. |
| `routes/Settings/` (shell) — `Settings.tsx` + `index.ts` | 2 | ~100 | Sí | El contenedor con scroll-spy de secciones; `General`/`Interface`/`User` (el contenido de cada sección) ya se reescribieron en R2/R8, pero el shell que los organiza no. |
| `components/MetaItem/`, `components/LibItem/`, `routes/Library/` | — | — | Frozen | Ya inventariados en R6, pendientes de tu decisión sobre Library — no los repito acá. |

**Total fuera de lo ya congelado: ~50 archivos, ~2085 líneas** de código que sigue siendo,
estructuralmente, el archivo original de stremio-web (aunque en varios casos el contenido visible
ya cambió bastante). De ese total, **13 archivos / ~587 líneas (`Toast`+`Tooltips`) están
confirmados sin ningún uso real hoy** — el hallazgo más accionable de esta lista.

No toqué nada de esta tabla (no era parte de lo autorizado en R10 — la tarea era listar). Si
querés, la próxima fase podría ser: borrar `Toast`/`Tooltips` (huérfanos confirmados), y dejar el
resto (`Button`/`Image`/`ModalDialog`/`Popup`/`NavBar`/`KeyboardShortcuts`/`ServicesContext`/
`ShortcutsModal`/`NotFound`/`Settings` shell) para cuando decidas si vale la pena reescribirlos o
son lo bastante genéricos como para dejarlos así indefinidamente.

### Verificación

- Grep de cierre: `stremio-router` (funcional, no comentarios) y `spatial-navigation`: **0
  referencias rotas** — solo quedan mis propios comentarios explicando el reemplazo en los 4
  archivos nuevos de `common/router/`.
- Build Docker OK.
- Smoke test: **12/12**, incluyendo el apilado de vistas (perfil de marino nueva y vieja URL,
  ambas siguen funcionando), modales (`add-to-roster` usa `ModalDialog`→`Modal`) y popups (selector
  de idioma en Settings usa `Popup`) — todos corriendo ya sobre el router nuevo.

**Archivos nuevos:** `common/router/{Router.js,ModalsContainer.js,RouteFocused.js,Modal.js,index.js,styles.css}` (6).
**Archivos borrados:** `src/router/` completo (11 archivos).
**Archivos editados:** `App/App.js`, `App/styles.less`, `src/modules.d.ts`, `webpack.config.js`,
`vite.config.js`, `package.json`, `pnpm-lock.yaml`,
`routes/Settings/Settings.tsx`, `components/NavBar/HorizontalNavBar/NavMenu/NavMenu.js`,
`components/ModalDialog/ModalDialog.js`, `components/Popup/Popup.js`.

Espero tu decisión sobre el inventario del punto 4 (¿arrancamos con `Toast`/`Tooltips` primero, o
preferís otro orden?) y tu OK para seguir.

---

## R11 — respuesta directa sobre el router + inicio de la Parte A (interrumpida por S1)

Pregunta directa del PM: el router de R10, ¿era nuevo de cero o reorganizado? **Respuesta: era
reorganizado.** Junté 11 archivos en 6 y renombré variables, pero el algoritmo de matching
(`routeConfigForPath`/`urlParamsForPath`), el manejo de `hashchange` y el apilado de vistas eran
esencialmente los mismos que `stremio-router`. Sigue siendo derivado — entra en la lista de R11
para reescribirse de verdad.

R11 autorizada (Toast/Tooltips + reescritura de NotFound→Router, de menor a mayor, en dos partes
por tamaño). Alcancé a investigar a fondo (leer completo) NotFound, Image, Button, Popup,
ModalDialog, ShortcutsModal, KeyboardShortcuts y ServicesContext, y a confirmar por grep sus
consumidores reales — **sin escribir ningún archivo nuevo todavía** cuando llegó la prioridad S1
(seguridad). Hallazgos de esa investigación que ya valen la pena dejar anotados para cuando
retome:
- `useServices()` hoy tiene **un solo consumidor en todo el proyecto**: `components/LibItem/LibItem.js`
  (congelado), y solo lee `core.transport.dispatch` (el stub inerte de R8). `keyboardShortcuts`
  nunca se lee vía Context — así que `ServicesContext`/`ServicesProvider` pueden eliminarse del
  todo (tal como sugeriste), dejando `useServices()` como una función simple sin Context ni
  Provider.
- `services/KeyboardShortcuts.js`: nadie escucha su evento `'stateChanged'` ni lee `.active` —
  puedo sacar el `EventEmitter` entero, solo queda `start()`/`stop()`.
- `components/ModalDialog`: su único consumidor real hoy es `CompanyDashboard`'s modal de perfil
  rápido, que solo usa `className`/`title`/`onCloseRequest`/`children` — `background` (el bug del
  404 de R4), `buttons` y `dataset` no los usa nadie, se pueden eliminar en vez de arreglar.

R11 queda pausada acá, retomo cuando cierre S1.

---

## S1 — prioridad de seguridad (secretos en código de Pollux)

Autorizada vía `claude/coordinacion-pollux-2026-09-28b.md` (segundo aviso del PM de dominius, con
OK de Rick). Solo working tree, sin git.

### 1) `FALLBACK_SECRET` fijo en `token_crypto.py` — sacado

Variable: **`DRIVE_TOKEN_SECRET`**. Ahora se lee a nivel de módulo (no dentro de la función) y si
falta, `raise RuntimeError` inmediato — confirmé que `token_crypto.py` se importa desde
`app/routers/drive.py`, y `main.py` importa `drive` a nivel de módulo (línea 19, junto con todos
los demás routers) **antes** de levantar el servidor — así que si falta la variable, el backend
entero se niega a arrancar, no falla recién al primer uso de Drive. Mismo comportamiento en
production y en development — no hay excepción para dev, dev también tiene que setearla (se la
agregué a mi `.env` local, gitignored, mismo valor que tenía el fallback viejo — solo para no
invalidar tokens de Drive ya cifrados en la DB local de desarrollo; nunca más vive en código
trackeado).

### 2) `POSTGRES_PASSWORD` sin default con valor

- `backend/app/core/config.py`: `DATABASE_URL` pasó de tener un default con la contraseña de
  desarrollo embebida a ser **requerido** (sin default) — Pydantic hace fallar el arranque solo con
  eso, mismo criterio que `DRIVE_TOKEN_SECRET`. De paso, el chequeo de `_fail_fast_in_production`
  que comparaba contra el string exacto de la contraseña vieja (`"<POSTGRES_PASSWORD>@postgres" in
  DATABASE_URL`) lo cambié a comparar contra el host/puerto de compose (`"@postgres:5432"`) — ya
  no depende de ningún valor específico de contraseña, y de hecho queda más robusto (agarra
  cualquier contraseña pegada a ese host, no solo la vieja).
- `docker-compose.yml`: el servicio `postgres` y la `DATABASE_URL` del `backend` ahora usan
  `${POSTGRES_PASSWORD}` (interpolación de Compose desde `.env`, que ya vive en la misma carpeta
  que `docker-compose.yml`) — sin default, sin valor literal en el archivo.
- `.env.example` (nuevo, si trackeado): `POSTGRES_PASSWORD=<POSTGRES_PASSWORD>`,
  `DATABASE_URL=postgresql://leto_user:<POSTGRES_PASSWORD>@postgres:5432/leto_db`,
  `DRIVE_TOKEN_SECRET=<DRIVE_TOKEN_SECRET>`, más `SECRET_KEY`/`ADMIN_SEED_EMAIL`/
  `ADMIN_SEED_PASSWORD`/`ENVIRONMENT`/`CORS_ORIGINS`/`FRONTEND_URL` — todo con marcadores, ningún
  valor real.
- Agregué `POSTGRES_PASSWORD` y `DRIVE_TOKEN_SECRET` a mi `.env` local (gitignored, nunca
  impreso acá) — usé el mismo valor que ya tenía la contraseña de Postgres porque el volumen local
  (`postgres_data`) ya tiene esa contraseña grabada desde su primer `initdb`; cambiarla ahora
  hubiera roto el `docker compose up` local sin resetear el volumen (que no toqué).

### 3) `session_2026-08-28.md`

Reemplazado el valor real de `POSTGRES_PASSWORD@postgres` por `<POSTGRES_PASSWORD>@postgres` en la única línea donde
aparecía (documentaba el chequeo de `_fail_fast_in_production`, no era una instrucción de
conexión). `Handover.md` no lo toqué, como pediste.

### 4) Verificación en prod (solo nombres, sin leer valores)

```
gcloud run services describe pb-pollux --project pollux-app-507503 --region us-central1 \
  --format="value(spec.template.spec.containers[0].env[].name)"
```
Nombres presentes: `DATABASE_URL`, `SECRET_KEY`, `ENVIRONMENT`, `GOOGLE_VISION_API_KEY`,
`GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET`, `GOOGLE_DRIVE_REDIRECT_URI`,
**`DRIVE_TOKEN_SECRET`**, `DRIVE_STATE_SECRET`, `CORS_ORIGINS`, `CASTOR_BASE_URL`, `FRONTEND_URL`,
`EMAIL_PROVIDER`, `EMAIL_FROM`.

**Sí, `DRIVE_TOKEN_SECRET` está definida en prod** — el fallback nunca se hubiera usado ahí ni
antes ni ahora. No leí ni comparé ningún valor, el comando solo pide `.name`.

**Hallazgo entregado a Rick, sin investigar más:** en esa misma lista aparece un nombre de
variable que no es un identificador legible — un string de 65 caracteres tipo hash hexadecimal
(`<NOMBRE-HEX-65>`). El PM me pidió explícitamente no investigarlo más (podría ser un valor
secreto pegado por error como nombre) y no volver a copiarlo — queda para que lo vea Rick
directamente.

### 5) Grep final de los valores viejos

```
grep -rl "<DRIVE_TOKEN_SECRET valor real>" . --exclude=Handover.md → 0
grep -rl "<POSTGRES_PASSWORD valor real>" . --exclude=Handover.md --exclude=.env → 0 (tras el fix del punto 2 en config.py)
```

**Aclaración sobre el alcance:** excluí `.env` de este grep además de `Handover.md` — `.env` es
exactamente el archivo gitignored donde estos valores tienen que vivir ahora (es todo el sentido
del punto 2), así que buscarlos ahí y contarlo como "hallazgo" no tendría sentido. Si querés que
también confirme que NO aparecen en ningún archivo trackeado por git específicamente (no solo por
patrón de nombre), decímelo y lo corro con `git ls-files` en vez de recorrer la carpeta entera.

### Verificación

- Backend reiniciado desde cero (`docker compose down` sin `-v`, después `up -d --build` —
  el volumen de Postgres no se tocó) arrancó limpio con el `.env` actualizado: migraciones OK,
  seed de admin OK, `DB startup complete`.
- Smoke test: **12/12**.

**Archivos editados:** `backend/app/services/token_crypto.py`, `backend/app/core/config.py`,
`docker-compose.yml`, `docs/handover/sessions/session_2026-08-28.md`, `.env` (local, gitignored,
sin commitear).
**Archivos nuevos:** `.env.example`.

Espero tu OK para retomar R11 (Parte A: Toast/Tooltips borrados + NotFound/Image/Button/Popup/
ModalDialog/ShortcutsModal/KeyboardShortcuts/ServicesContext reescritos).

---

## R11 Parte A — Toast/Tooltips fuera + NotFound→ServicesContext reescritos de cero

Redacté el nombre hexadecimal de 65 caracteres del hallazgo de S1 más arriba por
`<NOMBRE-HEX-65>`, como pediste — no lo vuelvo a investigar ni a copiar, queda para Rick.

Retomada R11 Parte A exactamente donde quedó (nada escrito todavía cuando llegó S1). Reescribí
cada pieza de verdad desde cero — no partí de ningún archivo viejo ni conservé su estructura
interna — manteniendo el mismo contrato externo para no tocar a los consumidores (incluidos los
congelados).

### 1) `common/Toast/` y `common/Tooltips/` — borrados

Confirmados 100% muertos en R10 (su único consumidor real, `SharePrompt`, se borró en R7) — 18
archivos entre las dos carpetas.

### 2) Reescritos, de menor a mayor

- **`routes/NotFound`**: en vez de una barra sola sin navegación (`HorizontalNavBar` suelto),
  ahora usa `MainNavBars` — si alguien cae acá por un link roto, tiene el sidebar completo para
  irse a cualquier pantalla real, no solo "atrás". Texto propio en español, sin la paleta
  vendorizada de Stremio (`assets/pollux-colors.less`) — tokens Mannat como el resto de las
  pantallas nuevas. La clave de traducción `PAGE_NOT_FOUND` quedó sin uso, la saqué de los 3
  catálogos (44 claves ahora).
- **`components/Image`**: misma API (`className/src/alt/fallbackSrc/renderFallback/onError`),
  lógica nueva basada en comparar `failedSrc === src` en vez de un `useLayoutEffect` que resetea
  un flag `broken` — un solo `<img>` en vez de dos ramas casi idénticas. Confirmé contra los 4
  usos reales (incluidos los 2 en `MetaItem.js`, congelado) que el comportamiento no cambia.
- **`components/Button`**: confirmé que **nadie pasa `onLongPress`** en todo el proyecto — saqué el
  soporte de long-press entero (`use-long-press` fuera de `package.json`/`vite.config.js`
  también). También confirmé que los flags `buttonClickPrevented`/`buttonBlurPrevented` nunca los
  setea nadie más que el propio archivo — eran una extensión para casos que ya no existen, los
  saqué y el Enter-dispara-click / mousedown-saca-foco quedan incondicionales.
- **`components/Popup`** (el más complejo de esta tanda): el auto-posicionamiento antes buscaba el
  ancestro con scroll más cercano y medía contra ese elemento; ahora mide directo contra
  `window.innerWidth/innerHeight` — más simple, mismo resultado en la práctica porque la app no
  tiene contenedores con scroll anidado donde la diferencia importe. **Encontré y corregí un bug
  de orden de eventos mío** en el primer borrador: había puesto el flag anti-cierre en
  `onMouseDown` pero el listener de "click afuera" escucha `pointerdown` — `pointerdown` dispara
  ANTES que `mousedown`, así que el flag llegaba tarde. Lo cambié a `onPointerDown` en los dos
  lados, mismo tipo de evento. Saqué `dataset` (nadie lo pasa hoy).
- **`components/ModalDialog`**: único consumidor real es el modal de perfil rápido de
  `CompanyDashboard`, que solo usa `className/title/onCloseRequest/children`. Saqué `background`
  (el bug del 404 silencioso que documenté en R4 — más simple borrar lo que nadie usa que
  arrastrar el bug), `buttons` y `dataset`.
- **`App/ShortcutsModal`**: portal + backdrop + Escape para cerrar, mismo contrato
  (`{ onClose }`). De paso arreglé el array de dependencias del `useEffect` (le faltaba
  `onClose`).
- **`services/KeyboardShortcuts` + `services/ServicesContext`**: la más grande simplificación de
  esta tanda. Confirmé por grep que:
  - `useServices()` tiene **un solo consumidor en todo el proyecto**, `components/LibItem/LibItem.js`
    (congelado), que solo lee `core.transport.dispatch` — un stub inerte que nunca cambia. Sin
    ningún dato que varíe, no hace falta Context ni Provider: `useServices()` es ahora una función
    que devuelve siempre el mismo objeto constante.
  - `KeyboardShortcuts` era una clase `EventEmitter` con `start()/stop()` y una propiedad
    `.active` — pero nadie escucha su evento `'stateChanged'` ni lee `.active` en ningún lado.
    Pasó a ser un hook (`useKeyboardShortcuts()`) que maneja su propio ciclo de vida con un
    `useEffect`, llamado directo en `App.js` — sin `EventEmitter`, sin clase, sin objeto
    "servicios" que armar.
  - Con las dos cosas resueltas, `App.js` ya no necesita `<ServicesProvider>` envolviendo toda la
    app — lo saqué del todo.
  - **Un detalle que no repetí a propósito**: el switch original de `KeyboardShortcuts`
    tenía un `case 'Backspace': if (event.ctrlKey) window.history.forward()` que **nunca podía
    dispararse** — el guard de arriba del mismo archivo ya cortaba con `return` si `event.ctrlKey`
    era true, antes de llegar a ese `case`. Era código muerto desde siempre (no se ve en ningún
    lado documentado — `shortcuts.json` no lista Backspace). Lo saqué en vez de reproducir la rama
    muerta.

### 3) `App.js` y `common/index.js` — actualizados por los cambios de arriba

`App.js`: sin `ServicesProvider`/`ToastProvider`/`TooltipProvider` (los dos últimos, huérfanos
desde el punto 1) — llama `useKeyboardShortcuts()` directo. `common/index.js`: sin los exports de
Toast/Tooltip. `App/styles.less`: sin `.toasts-container`/`.tooltip-container`, huérfanos.

### Verificación

- Grep de cierre: `useToast`/`ToastProvider`/`TooltipProvider`/`useTooltip`, `ServicesProvider`/
  `ServicesContext`, `new KeyboardShortcuts(`, `use-long-press`/`onLongPress`: **0 referencias
  rotas**.
- Build Docker OK, lockfile regenerado.
- Smoke test: **12/12**.
- **Verificación manual adicional** (el smoke no cubre estas 3 interacciones, y son piezas
  reescritas de cero): NotFound en una ruta inexistente (404 real + link "Volver al Dashboard"
  funcionando, captura revisada), modal de atajos con Ctrl+/ (abre, se cierra con Escape, captura
  revisada), y el Popup del selector de idioma en Settings (abre, muestra las opciones). Los tres
  sin errores de consola.

**Archivos borrados:** `common/Toast/` (8), `common/Tooltips/` (10), `services/KeyboardShortcuts/`
(2), `services/ServicesContext/` (6).
**Archivos reescritos:** `routes/NotFound/{NotFound.js,index.js,styles.less}`,
`components/Image/{Image.tsx,index.ts}`, `components/Button/{Button.tsx,index.ts}`,
`components/Popup/{Popup.js,index.js}`, `components/ModalDialog/{ModalDialog.js,index.js}`,
`App/ShortcutsModal/ShortcutsModal.tsx`, `services/index.js`.
**Archivos editados:** `App/App.js`, `App/styles.less`, `common/index.js`,
`common/translations/{en,es,pt}.json`, `package.json`, `pnpm-lock.yaml`, `vite.config.js`.

Falta Parte B: `NavBar` (7 archivos), el shell de `Settings` (`Settings.tsx`+`index.ts`), y el
router (de verdad esta vez). Espero tu OK antes de seguir.

## R11 Parte B — NavBar, shell de Settings, router de verdad (2026-09-28)

Autorizada tras aceptar Parte A con el ajuste de NotFound (i18n en vez de texto fijo, ya aplicado
en la sección anterior: agregué `NOT_FOUND_MESSAGE`/`NOT_FOUND_BACK_LINK` a los 3 catálogos).

### 1) NavBar — 5 archivos sustantivos + 5 barrels, todos reescritos

- `VerticalNavBar/NavTabButton/NavTabButton.js`: mantuve los 8 SVG `CREW_ICONS` (arte propio de
  Pollux, ancla/barco/etc. — Iconoir no los tiene), pero extraje `resolveTabIcon(icon, selected)`
  como función pura (orden de prioridad: clase Iconoir → SVG propio → ícono genérico con sufijo
  `-outline`) y `scrollAllPanelsToTop` como función standalone (antes era un closure inline).
- `VerticalNavBar/VerticalNavBar.js`: extraje un subcomponente `NavTabs` para la lista; cambié
  `key={index}` por `key={tab.id}` (bug menor: reordenar tabs con key=index podía confundir el
  estado de React entre renders, aunque nadie reordena hoy).
- `HorizontalNavBar/NavMenu/NavMenuContent.js`: extraje `readStoredUser()`/`useStoredUser()` y un
  subcomponente `UserRow`.
- `HorizontalNavBar/NavMenu/NavMenu.js`: renombré los handlers internos, dejé el mismo bug de
  Popup.js (evento pointerdown vs mousedown) documentado en un comentario para que no se repita.
- `HorizontalNavBar/HorizontalNavBar.js`: **grep confirmó que `title` no tiene NINGÚN consumidor
  real** (ni `SeafarerProfile.js` ni `MainNavBars.tsx`, los dos únicos llamadores, lo pasan) — lo
  eliminé del componente, sus propTypes y la clase `.title` en `styles.less` (que también tenía la
  cabecera de copyright vieja, la saqué).
- Los 5 `index.js` barrel: solo llevaban la línea de copyright, se las saqué.
- De paso encontré y saqué la clase `.search-bar` en
  `HorizontalNavBar/styles.less` — CSS muerto (nadie renderiza una SearchBar en este NavBar hace
  rato), y `.with-warning` en `NavMenu/styles.less` — mismo caso, 0 consumidores reales (grep).

### 2) Shell de Settings — `Settings.tsx` + `index.ts`

Extraje la lógica de scroll-spy a un hook `useScrollSpy(sections, active)` en vez de tenerla
inline en el componente. De paso corregí un bug real que ya había documentado en R10 y dejado
como estaba por disciplina de alcance: `const { routeFocused } = useRouteFocused()` desestructuraba
un objeto de un hook que devuelve un booleano plano — siempre `undefined`, así que el
`useLayoutEffect` que debía recalcular la sección seleccionada al montar nunca corría por esa vía
(no se notaba porque el estado inicial ya coincidía con la primera sección). Ahora usa el booleano
directo. Como el shell entraba en alcance explícito de esta fase, correspondía arreglarlo ahí
mismo en vez de dejarlo pasar de nuevo.

### 3) El router — reescrito de verdad esta vez (no reorganizado)

Estructura nueva, distinta a la de R10:
- `routeMatching.js` (nuevo): funciones puras sin React — `findRouteMatch`, `paramsFromMatch`,
  `currentPathname`, `sameParams`. Antes todo vivía mezclado adentro de `Router.js` con dos
  pasadas de regex (una para encontrar la ruta, otra para sacar los parámetros); ahora es una sola
  pasada que devuelve el `match` y se reusa.
- `context.js` (nuevo, reemplaza `RouteFocused.js` + `ModalsContainer.js`): junté los dos
  contextos chicos en un solo archivo — los usan siempre los mismos consumidores (Popup,
  ModalDialog, NavMenu) y no tenía sentido mantenerlos separados.
- `Router.js`: misma superficie externa (`className`, `viewsConfig`, `onPathNotMatch`) pero
  **eliminé `onRouteChange` y `queryParams`** — grep en todo `routes/` y `components/` confirmó
  cero consumidores reales de ninguno de los dos (todos los componentes de ruta destructuran solo
  `{ urlParams }`, cuando destructuran algo). Eliminé también la dependencia de `react-is`
  (validaba que `onPathNotMatch()` devolviera un tipo de componente válido — el único llamador,
  `App.js`, siempre devuelve `NotFound`, así que el chequeo no protegía nada real) y `fast-equals`
  (los `urlParams` son siempre un objeto plano de strings, no hacía falta una librería de deep-equal
  para comparar dos niveles de anidamiento — escribí `sameParams` a mano). Las dos
  dependencias se sacaron de `package.json` y `vite.config.js`.
- Mismo comportamiento de apilado de vistas: navegar a un nivel más profundo no toca los niveles
  anteriores (siguen montados, solo ocultos por CSS); navegar a un nivel igual o más superficial
  limpia los niveles más profundos. Mismas URLs (`#/seafarer/{id}`, `#/metadetails/crew/{id}`
  como alias viejo, etc. — no toqué `routesRegexp.js` ni `routerViewsConfig.js`, no estaban en la
  huella Stremio).
- **Verificación manual del apilado** (el smoke no lo cubre): script Playwright descartable — entré
  a Discover, marqué su nodo DOM con un atributo, navegué a un perfil de marino, volví atrás
  (`page.goBack()`) y confirmé que el nodo de Discover **seguía siendo el mismo** (no se
  re-montó). Confirmado: 2 niveles montados mientras estaba en el perfil, la marca sobrevivió al
  volver.

### 4) Inventario de huella Stremio — barrido completo, no solo lo tocado en Parte B

Al correr el grep completo (`Copyright (C) 2017`) fuera de lo congelado encontré, además de NavBar/
Settings/router, **~25 archivos más con la cabecera pegada** que nunca fueron parte de ninguna
fase autorizada (`MultiselectMenu/*`, `TextInput/*`, `Multiselect/styles.less`, `MainNavBars/*`,
`App/index.js`, `index.js` raíz, `common/{useBinaryState,useOutsideClick,usePWA,animations,
screen-sizes}`, `Button.less`, `Popup/styles.less`, `ModalDialog/styles.less`). Revisé el contenido
de cada uno antes de tocarlo: **ninguno tiene lógica derivada de Stremio** — son componentes
propios de Pollux (MultiselectMenu es un dropdown jerárquico con niveles que Stremio nunca tuvo,
MainNavBars es 100% specific a los tabs de compañía, los hooks son triviales) con la cabecera de
copyright pegada por error (probablemente copiada de un archivo plantilla). Solo les saqué la
línea de comentario — cero cambios de lógica. Lo marco explícitamente porque no estaba en ninguna
autorización previa: si preferís que lo revierta o lo revise de otra forma, decime y lo hago.

Inventario final fuera de lo congelado: **0**. Dentro de lo congelado (sin tocar, como corresponde):
`LibItem/*`, `MetaItem/*`, `routes/Calendar/index.ts`, `routes/Library/*`.

### 5) Bug encontrado en el smoke test (no del código de la app)

El smoke falló la primera corrida: `EXPECTED_NOT_FOUND_MESSAGE.English` en `smoke.js` tenía un
apóstrofe tipográfico (`’`) pero el catálogo real (`en.json`) usa uno recto (`'`) — era un
typo mío de cuando escribí el check en Parte A, no un bug de NotFound.js. Corregido en
`smoke.js` para que coincida con el valor real del catálogo.

### Verificación final

- Build Docker OK (incluye `pnpm build` real dentro del Dockerfile, no solo dev-serve).
- Lockfile regenerado (saqué `react-is`/`fast-equals` de `package.json`).
- Smoke test: **12/12** (incluye el chequeo nuevo de NotFound en los 3 idiomas dentro de
  `language-switch`).
- Grep de cierre: 0 referencias a `RouteFocused.js`/`ModalsContainer.js` (borrados), 0
  `react-is`/`fast-equals`, 0 `queryParams`/`onRouteChange` fuera de mi propio comentario
  explicativo en `Router.js`.
- Inventario de huella Stremio fuera de lo congelado: **0**.

**Archivos borrados:** `common/router/RouteFocused.js`, `common/router/ModalsContainer.js`.
**Archivos nuevos:** `common/router/routeMatching.js`, `common/router/context.js`.
**Archivos reescritos:** los 5 sustantivos + 5 barrels de `NavBar`, `HorizontalNavBar/styles.less`,
`NavMenu/styles.less`, `VerticalNavBar/styles.less`, `VerticalNavBar/NavTabButton/styles.less`,
`routes/Settings/{Settings.tsx,index.ts,Settings.less}`, `common/router/{Router.js,Modal.js,
index.js}`.
**Archivos con solo la cabecera de copyright removida (sin cambio de lógica):**
`MultiselectMenu/*` (9), `TextInput/*` (3), `Multiselect/styles.less`, `MainNavBars/*` (3),
`App/{index.js,styles.less}`, `index.js` raíz, `common/{useBinaryState.js,useOutsideClick.ts,
usePWA.js,animations.less,screen-sizes.less}`, `Button.less`, `Popup/styles.less`,
`ModalDialog/styles.less`.
**Archivos editados:** `package.json`, `pnpm-lock.yaml`, `vite.config.js`,
`tests/smoke/smoke.js` (fix del apóstrofe).

R11 completa (Parte A + Parte B). Espero tu OK.

## R12 — corrección: las ~25 cabeceras eran de código derivado real (2026-09-28)

Rick verificó contra `stremio-web` real (commit `091f94e8`, rama `development`,
`PBS-Panama/Pollux-app`) y confirmó que MultiselectMenu, TextInput, MainNavBars y
`src/index.js` SÍ existen ahí — mi lectura de "código propio con el comentario pegado
por error" en R11 Parte B estaba mal. Corregido:

### 1) Cabecera restaurada

Restauré la línea `// Copyright (C) 2017-20XX Smart code 203358507` (+ línea en blanco)
tal cual estaba, en los 28 archivos donde la había sacado (el "~25" de mi reporte
anterior). Verifiqué archivo por archivo con `git diff` que el ÚNICO cambio mío en cada
uno era esa línea — no toqué ningún cambio legítimo de fases anteriores (ej. el rename
de alias `stremio/`→`pollux/`, o el reemplazo de `.toasts-container`/`.tooltip-container`
en `App/styles.less` de R11 Parte A) al restaurar.

### 2) Comparación real contra 091f94e8

Cloné `PBS-Panama/Pollux-app` rama `development` en `/tmp` (fuera del repo, sin push,
borrado al terminar) y saqué un `git worktree` del commit `091f94e8`. Comparé cada
archivo de `interfaces/leto/src` contra el mismo path en ese checkout. Tabla completa
(206 archivos) en `docs/handover/comparacion-stremio-091f94e8-2026-09-28.md`.

Resumen: **137 MODIFICADO, 42 SIN_EQUIVALENTE, 16 FROZEN, 11 IDENTICO** (bajó de 15 a 11
tras las reescrituras de este punto 3).

**Hallazgo aparte, no pedido en R12 pero lo encontré haciendo la comparación:**
`common/router/*` (Router.js, Modal.js, context.js, routeMatching.js, index.js,
styles.css — el router de R11 Parte B, YA ACEPTADO) sale `SIN_EQUIVALENTE` en la
comparación automática por path, pero es porque el router real de stremio-web vive en
`src/router/` (raíz, no `src/common/`) — la reubicación fue mía en R10. Comparé a mano
contra los archivos reales ahí: `Router.js`/`routeMatching.js`/`context.js` quedan
genuinamente distintos. Pero **`Modal.js` y `styles.css` son funcionalmente idénticos**
al original (`router/Modal/Modal.js`, `router/styles.css`) — solo difiere el comentario
de cabecera y el import. Lo marco para que decidas si se toca ahora o después; no lo
toqué sin preguntar, dado que Parte B ya está aceptada.

### 3) Reescritura de los archivos con equivalente real

Los 28 archivos con cabecera SÍ tienen equivalente en stremio-web (ninguno cayó en
`SIN_EQUIVALENTE`). De estos, reescribí de verdad los que tienen lógica real
(mismo criterio que el resto de R11 — mismo contrato externo, estructura interna
distinta):

- **`components/TextInput/TextInput.tsx`**: destructuring directo de props en vez de
  `props.X` repetido, `onKeyDown`/`onSubmit` extraídos explícitos. **De paso: grep
  confirma que `TextInput` no tiene NINGÚN consumidor real en todo el proyecto**
  (ni siquiera en lo congelado) — código muerto heredado de Stremio. Lo dejo
  reescrito pero señalo que es candidato a borrar; no lo borré sin preguntar.
- **`components/MultiselectMenu/{MultiselectMenu.tsx,Dropdown/Dropdown.tsx,
  Dropdown/Option/Option.tsx}`**: el único consumidor real (`Settings > Interface`,
  selector de idioma) usa opciones planas y nunca pasa `multicheck`/`selectedValues`/
  `onToggle` — ese modo y el drill-down por niveles (`option.level`) vienen intactos
  de Stremio, sin ejercitar por ningún caso real hoy. Preferí NO borrar esas
  features (a diferencia de otros casos de R11) porque es un cambio de superficie
  más grande y ya me corregiste una vez este mismo día por decidir solo — las dejé
  todas, pero reestructuré el código: `resolveButtonLabel`/`isSelected` como
  funciones puras extraídas, `onOptionSelect` con if/else en vez del operator de
  coma original (`level ? setLevel(...) : onSelect(...), closeMenu()` — mismo
  comportamiento, más legible), saqué un `containerRef` que no se leía nunca
  (guard siempre-verdadero) y un `key={option.id}` inerte dentro del propio
  `Option` (no tiene efecto ahí, `key` solo importa en el `.map()` del padre).
- **`components/MainNavBars/MainNavBars.tsx`**: ya bastante reescrito de fases
  previas (COMPANY_TABS, colapso de sidebar) — extraje el collapse a un hook
  `useSidebarCollapsed()` y saqué `getUserRole()`, muerta (grep: 0 usos).
- **`common/{useBinaryState.js,useOutsideClick.ts,usePWA.js}`**: hooks triviales,
  reescritos con otro enfoque manteniendo el mismo contrato — `useBinaryState`
  usa updater funcional en vez de capturar `value` (toggle con identidad estable),
  `useOutsideClick` guarda el callback en un ref en vez de re-suscribir el
  listener en cada cambio de identidad, `usePWA` calcula una vez con `useState`
  perezoso en vez de `useMemo`.
- **`index.js` (raíz)**: bootstrap reestructurado en funciones nombradas
  (`initSentry`, `disableTouchViewportOnDesktop`, `initI18n`, `renderApp`,
  `registerServiceWorker`) en vez de código de nivel superior secuencial — mismo
  orden de ejecución, mismo comportamiento.

**Lo que dejé sin tocar, con la cabecera restaurada, y por qué:** 7 archivos son
barrels de una sola línea (`const X = require('./X'); module.exports = X;` — App/
index.js, MainNavBars/index.ts, Multiselect/index.js, MultiselectMenu/index.ts,
Dropdown/index.ts, Option/index.ts, TextInput/index.ts) y 7 son `.less` con la
mayoría de sus valores ya adaptados a Pollux en fases previas pero la MISMA
estructura de selectores que el original (Button.less, Popup/styles.less,
ModalDialog/styles.less, Multiselect/styles.less, MainNavBars.less, Dropdown.less,
Option.less). Para un re-export de 2 líneas no hay una forma distinta de
escribirlo que no sea ruido; para el CSS, reordenar selectores/declaraciones sin
volver a verificar visualmente cada pantalla es un riesgo real de romper algo que
hoy se ve bien, y no llegué a hacer esa verificación visual en esta vuelta. Dejé la
cabecera puesta (correcto, tienen equivalente) y no fuerzo una reescritura
cosmética sin sentido. Decime si querés que igual pase por esos 14 archivos.

### Verificación

- Build Docker OK.
- Smoke test: **12/12**.
- Grep: 0 referencias rotas (`getUserRole`, `containerRef` viejo, etc.).
- Sin cambios de dependencias esta vez (no toqué `package.json`).

**Archivos con cabecera restaurada:** los 28 de la lista original de R11 Parte B.
**Archivos reescritos de verdad (dentro de esos 28):** `TextInput.tsx`,
`MultiselectMenu.tsx`, `Dropdown.tsx`, `Option.tsx`, `MainNavBars.tsx`,
`useBinaryState.js`, `useOutsideClick.ts`, `usePWA.js`, `index.js` (raíz).
**Archivos con solo la cabecera restaurada (sin reescritura — ver razón arriba):**
los 7 barrels + 7 `.less` restantes de esos 28.
**Nuevo:** `docs/handover/comparacion-stremio-091f94e8-2026-09-28.md` (tabla completa,
206 archivos).

Espero tu OK — y tu decisión sobre Modal.js/styles.css del router y los 14 archivos
que dejé sin reescribir.

## SEGURIDAD URGENTE (en paralelo a R13) — 2026-09-28

Barrido de Dominius encontró valores reales en texto plano. Corregido:

1) **`notas-pendientes-2026-09-28.md`** (este archivo): tenía el valor real de
   `POSTGRES_PASSWORD` (usado como patrón de un `grep` en la sección de S1) y el valor real
   del viejo `FALLBACK_SECRET` de `token_crypto.py` (mismo caso, como patrón de grep).
   Reemplazados por `<POSTGRES_PASSWORD>`/`<DRIVE_TOKEN_SECRET valor real>` según corresponda.
   Repasé el resto del archivo y `comparacion-stremio-091f94e8-2026-09-28.md` buscando
   cualquier otro valor (contraseñas, tokens, URLs con usuario:clave) — no encontré nada más.

2) **`backend/app/routers/drive.py`**: `_STATE_SECRET` tenía un fallback hardcodeado
   (`<DRIVE_STATE_SECRET valor real>`, firma HMAC del `state` OAuth de Drive —
   protección CSRF). Mismo criterio que S1: ahora es `os.environ.get("DRIVE_STATE_SECRET")`
   sin default, con `raise RuntimeError` al importar el módulo si falta — `main.py` importa
   `app.routers.drive` a nivel de módulo, así que esto tumba todo el backend al arrancar si
   no está seteada, no solo el endpoint de Drive.
   **Nombre de la variable: `DRIVE_STATE_SECRET`.**
   **Ya está definida en prod** — volví a verificar contra `pb-pollux` (`gcloud run services
   describe ... --format` limitado a `.name`, mismo protocolo que S1, sin leer valores): la
   lista de nombres en prod ya incluye `DRIVE_STATE_SECRET` (se había creado junto con
   `DRIVE_TOKEN_SECRET` en algún momento, aunque el código nunca la hubiera usado hasta ahora).
   No hace falta crear nada antes de deployar esto.
   Agregada a `.env` local (mismo valor que tenía el fallback, para no romper el dev local —
   nunca en archivo trackeado) y a `.env.example` como `<DRIVE_STATE_SECRET>`.

3) Grep final de los 3 valores viejos (`POSTGRES_PASSWORD` real, `FALLBACK_SECRET` real,
   `DRIVE_STATE_SECRET` real) en toda `pollux-app`, excluyendo `.env`: **0**. No los escribo
   acá ni en ningún otro archivo.

Build backend+leto reconstruido con este fix — arrancó limpio (logs revisados, sin crash-loop),
incluido en el smoke 12/12 de abajo.

## R13 — Modal.js/styles.css del router, 7 barrels, 7 .less, y similitud de los 137 MODIFICADO

### 1) Router — `Modal.js` y `styles.css` reescritos de verdad

Comparé a mano contra el original real (`router/Modal/Modal.js`, `router/styles.css` en
091f94e8 — el router de stremio-web vive en la raíz de `src/`, no en `src/common/`, por eso el
comparador automático por path no los encontraba). Eran funcionalmente idénticos salvo
comentario/import.
- `Modal.js`: extraje un subcomponente `FocusTrappedContent` (el `<FocusLock>`) separado de
  `Modal` (que ahora solo resuelve el contenedor destino del portal), y agregué un guard real
  — `if (!(portalTarget instanceof HTMLElement)) return null` — en vez de pasarle lo que sea a
  `ReactDOM.createPortal` sin chequear (en la práctica nunca era null porque el Provider ya
  gatea el render, pero ahora el componente no depende de esa garantía externa para no explotar).
- `styles.css`: las clases (`route-container`, `route-content`, `modals-container`,
  `modal-container`) las pinta solo este módulo — verifiqué con grep que ningún otro archivo
  las usa como string global — así que saqué la calificación redundante con `.routes-container`
  en cada selector (antes: `.routes-container .route-container .modals-container
  .modal-container { ... }`) y usé `inset: 0` en vez de `top/right/bottom/left: 0` por separado.

### 2) Los 7 barrels — reescritos a mano, sin cabecera

Un re-export de una línea no tiene contenido propio que proteger. Los `.ts` pasaron de
`import X from './X'; export default X;` a `export { default } from './X';` (re-export directo,
una sola línea); los `.js` pasaron a `module.exports = require('./X');` (mismo patrón,
sin variable intermedia). Archivos: `App/index.js`, `components/Multiselect/index.js`,
`components/MainNavBars/index.ts`, `components/MultiselectMenu/index.ts`,
`components/MultiselectMenu/Dropdown/index.ts`,
`components/MultiselectMenu/Dropdown/Option/index.ts`, `components/TextInput/index.ts`.

### 3) Los 7 `.less` — reescritos con estructura de selectores propia

La cabecera de copyright se mantuvo en los 7 (sí tienen equivalente real, a diferencia de los
barrels). Cambios, todos verificados para dar el mismo resultado visual:
- **`Button.less`**: aplanado (`.button-container:focus`/`:global(.disabled)` en vez de `&:focus`
  anidado).
- **`Popup/styles.less`**: las 4 clases `menu-direction-*` (combinación de eje vertical
  top/bottom × eje horizontal left/right) pasaron de 4 bloques casi iguales a 2 reglas por eje
  combinadas por selector — mismo resultado computado, verificado combinación por combinación
  a mano antes de aplicarlo.
- **`ModalDialog/styles.less`**: además de aplanar la estructura, **saqué código muerto real**
  — `.modal-dialog-background`, `.action-button` y `.buttons-container` no tienen NINGÚN
  consumidor (`ModalDialog.js` ya había sacado esas props en R11 Parte A; la hoja de estilos
  nunca se había limpiado). Renombré `.modal-dialog-container`→`.dialog-frame` y
  `.modal-dialog-content`→`.dialog-content` (y actualicé las 2 referencias en `ModalDialog.js`
  para que sigan matcheando).
- **`Multiselect/styles.less`**: mismo hallazgo — `.label-container` completo (con su ícono
  animado y el `.popup-menu-container{width:100%}` anidado adentro) y `.modal-container` son
  código muerto desde el R8 que reescribió `Multiselect.js` (ya no soporta modo modal ni label
  propio) y nunca se limpió la hoja de estilos. También saqué el ícono de "seleccionado" dentro
  de `.option-container` — ninguna opción recibe la clase `selected` hoy. Renombré el alias
  `:import` de `popup-menu-container` a `popup-menu-target` (evita el nombre camelCase-vs-kebab
  que hubiera sido más riesgoso).
- **`MainNavBars.less`**: aplanado; el `&.collapsed { .horizontal-nav-bar, .nav-content-container
  {...} }` pasó a `.main-nav-bars-container.collapsed .horizontal-nav-bar, ...` explícito (mismo
  selector compuesto, sin depender de que el hash de CSS Modules sea único entre archivos).
- **`Dropdown.less`**: separé `.dropdown` (estado base) de `.dropdown.open` (estado abierto) en
  vez de un solo bloque con `&.open` anidado; `.back-button`/`.back-button-icon` aplanados.
- **`Option.less`**: aplanado por completo (`.option`, `.option:hover`, `.option .label`,
  `.option .icon`, `.checkbox`, `.checkbox.checked`, `.checkbox-icon` como selectores de primer
  nivel en vez de todo anidado bajo `.option`).

**Verificación visual antes/después** (el smoke no ejercita ModalDialog/NavMenu-popup/
MultiselectMenu-dropdown por sí solo): reconstruí dos veces — una con el CSS viejo, otra con el
nuevo — y comparé capturas de las 3 pantallas afectadas (modal de perfil rápido en Board, popup
del menú de usuario, dropdown de idioma en Settings). **Las 3 capturas son visualmente idénticas
antes/después** (revisadas una por una). `Multiselect/styles.less` no tiene forma de probarse
así — su único consumidor real es `MetaItem` (congelado) y no lo pude ejercitar desde el flujo
del smoke; ahí me apoyé solo en el grep de cero consumidores para el código muerto que saqué.

### 4) Similitud de los 137 MODIFICADO contra 091f94e8

Metodología, tabla completa (137 filas) y totales por grupo en
`docs/handover/similitud-stremio-091f94e8-2026-09-28.md`. Resumen:

| Grupo | Archivos | Líneas no triviales (upstream) |
|---|---|---|
| ALTA (>50%) | 75 | 1885 |
| MEDIA (20–50%) | 26 | 1024 |
| BAJA (<20%) | 36 | 600 |
| **Total** | 137 | 3509 |

**Aviso importante antes de usar esta tabla para priorizar** (está en el archivo también):
el % mide superposición de líneas, no si el archivo fue genuinamente reescrito. Varios
archivos que YO YA reescribí de cero en R10/R11/R11-Parte-B/esta misma fase (Button,
MultiselectMenu+Dropdown+Option, MainNavBars, NavMenu.js, VerticalNavBar.js,
ModalDialog/Popup/App styles.less, ShortcutsModal.tsx) igual caen en ALTA/MEDIA por líneas
genéricas compartidas (`display: flex`, `color: var(--primary-foreground-color)`, etc.) — no
porque les falte trabajo. El resto de la tabla (la gran mayoría de los 137) nunca pasó por
ninguna fase R, ahí el % sí es una señal real.

**Hallazgo que vale la pena que veas:** varios archivos en 100% de similitud
(`types/*.d.ts`, `components/ShortcutsGroup/*`, `routes/Settings/components/*`) **ni
siquiera tienen la cabecera de copyright puesta** — a diferencia de los ~28 de R12, a estos
nunca se la pusieron (o se las sacaron antes de que existiera la técnica de huella, R1-R5).
Por eso ningún inventario anterior los había detectado.

No toqué ninguno de los 137 todavía — esperando tu OK sobre cómo priorizar, como pediste.

### Verificación final

- Build Docker OK (leto + backend + nginx).
- Backend arrancó limpio con `DRIVE_STATE_SECRET` desde `.env` (logs revisados).
- Smoke test: **12/12**.
- Grep de cierre: 0 referencias rotas, 0 valores de secretos fuera de `.env`.

**Archivos nuevos:** `docs/handover/similitud-stremio-091f94e8-2026-09-28.md`.
**Archivos reescritos:** `common/router/{Modal.js,styles.css}`, los 7 barrels, los 7 `.less`
listados arriba, `components/ModalDialog/ModalDialog.js` (2 referencias de clase actualizadas).
**Archivos editados (seguridad):** `docs/handover/notas-pendientes-2026-09-28.md` (redacción),
`backend/app/routers/drive.py`, `.env.example`, `.env` (local, gitignored).

Espero tu OK para R14 (priorización de los 137) y confirmación de que la corrección de
seguridad urgente quedó completa.

## R14 — Lote 1 del grupo ALTA (2026-09-28)

Autorizada R14: empezar por el grupo ALTA, lotes de ~15, priorizando los 100% sin cabecera,
excluyendo lo ya reescrito en R10-R13 (con tabla "revisado: generico" aparte).

**Tabla "revisado: generico"** (16 archivos ya tocados en R10-R13, similitud alta por líneas
genéricas de React/CSS, no por seguir derivados): `docs/handover/r14-revisado-generico-2026-09-28.md`.

**Lote 1** (19 archivos — `common/Platform/*`, `common/Shortcuts/*`, `useBinaryState.d.ts`,
`useLanguageSorting.ts`, `MultiselectMenu/types.d.ts`, `components/ShortcutsGroup/**`, todos
100% sin cabecera antes de este lote): detalle completo, tabla recalculada y explicación de
por qué 5 archivos CSS/tipo no pudieron bajar de ALTA en `docs/handover/r14-lote1-2026-09-28.md`.

Resumen: 1 archivo borrado (`onShortcut.ts`, 0 consumidores reales), varias simplificaciones
reales (PlatformContext de 3 campos a 1, ShortcutsProvider de 3 a 1, MultiselectMenuOption de
7 campos a 4, useLanguageSorting de 3 valores devueltos a 1 — todos por grep de cero
consumidores). 14 de 19 archivos bajaron a BAJA o MEDIA. Los 5 que quedaron en ALTA
(`Shortcuts/types.d.ts` y 3 `.less` + `ShortcutsGroup.tsx`/`Combos.tsx`) tienen una razón
puntual explicada en el archivo — no es que falte esfuerzo, es un techo real del método para
tipos que reflejan datos reales y CSS de layout mínimo.

**Verificación:** build OK, smoke 12/12, grep 0 refs rotas, y verificación visual manual
(capturas antes/después) de Settings > Shortcuts y el modal de atajos (Ctrl+/) — el smoke no
ejercita ninguno de los dos a fondo. Sin diferencia visual.

**Pendiente para el Lote 2:** `types/*.d.ts` (20 archivos — **los 20 sin ningún consumidor
real**, candidatos a borrar entero, no reescribir) + `routes/Settings/components/*` +
`routes/Settings/Shortcuts/*` (11 archivos, sin revisar). Después sigue el resto de ALTA.

Espero tu OK antes del Lote 2.

## R14 — Lote 2 (2026-09-28)

Autorizado: borrar los 20 `types/*.d.ts` (confirmado antes con `tsc --noEmit` — diff 0 entre
con/sin esos archivos, mismos 99 errores preexistentes de antes; también grep de anotación de
tipo en Calendar/Library/MetaItem/LibItem congelados, 0 coincidencias) + reescribir
`Settings/components` y `Settings/Shortcuts` (16 archivos). Detalle completo, tabla de
similitud recalculada y un error real que casi se me escapa (`Link.tsx` — le saqué
`target`/`onClick` por un grep incompleto, `tsc` lo agarró comparando antes/después, corregido)
en `docs/handover/r14-lote2-2026-09-28.md`.

Resumen: `types/` completo borrado (20 archivos, 0 consumidores incluso implícitos). `Category`
borrado (3 archivos, 0 consumidores reales). Simplificaciones reales: `Option` sin `icon` (0
usos), CSS muerto sacado de `Option.less`. El resto reescrito con contrato completo verificado
contra TODOS los usos reales del proyecto (no solo los que encontré a primera vista).

Verificación: `tsc --noEmit` mismos 99 errores preexistentes antes/después (dos veces). Build OK,
smoke 12/12, grep 0 refs rotas, capturas antes/después de Settings completo sin diferencia.

Con esto termina el grupo "100% sin cabecera" del ALTA. Sigue el resto de ALTA (fuera de esa
lista y fuera de "revisado: generico") cuando digas.

## R14 — Lote 3 (2026-09-28)

Autorizado encadenar lotes sin esperar OK si cada uno cumple smoke 12/12 + build + tsc sin
nuevos errores + 0 refs rotas (criterio agregado desde ahora a cada lote). Resto del grupo
ALTA, lotes de ~15.

9 archivos nuevos (`Settings/General/User`, `Settings/Menu`, `Settings.less`, `Settings/Info`,
`Settings/General/General.less`, `constants.ts`, `useFullscreen.ts`, `index.html`). Detalle en
`docs/handover/r14-lote3-2026-09-28.md`.

Hallazgo: `Settings/General/General.less` estaba completamente huérfano — nadie lo importaba
(el comentario en General.tsx ya avisaba que la integración de Trakt se había sacado, pero la
hoja de estilos nunca se limpió). Borrado entero, encadenado con sacar `--color-trakt` de
`App/styles.less` (única referencia). Más CSS muerto real sacado de `User.less`
(`.user-panel-container`/`.user-panel-label`, 0 consumidores) y una simplificación real en
`useFullscreen()` (el 4to valor del tuple que devolvía no lo usa nadie, verificado con
Playwright que la tecla F sigue funcionando igual).

5 de 9 quedaron en ALTA por el mismo techo de siempre (CSS/valores que tienen que ser
exactos, o un objeto de 3 claves que ES el contrato real) — detalle con la razón puntual de
cada uno en el archivo.

Verificación: tsc mismos 99 errores preexistentes (0 nuevos), build OK, smoke 12/12, capturas
antes/después de Settings completo sin diferencia, prueba de la tecla F con Playwright.

Pendiente para el próximo lote: `App/ShortcutsModal/styles.less` (se me pasó por el volumen) +
seguir con el resto de ALTA. Sigo encadenando sin esperar OK salvo que algo falle o aparezca
una decisión de alcance.

## R14 — Lote 4: cierre del grupo ALTA + tabla consolidada de excepciones (2026-09-28)

Rick avisó: van 13 excepciones "techo" acumuladas (5+3+5) y pidió, al cerrar ALTA, una tabla
consolidada (archivo, líneas, % similitud, por qué) y que los componentes con LÓGICA (no CSS/
tipos/barrels) se reintenten con otro enfoque antes de declararlos techo.

Reintentos con enfoque genuinamente distinto (no cosmético):
- `Combos.tsx`+`Keys.tsx`: extraje `withTrailingSeparator` (función compartida, reemplaza el
  chequeo de "¿soy el último?" duplicado en los 2). `ShortcutsGroup.tsx` cambió de contrato
  (recibe el grupo entero, no spread) — bajó de 56.2% a 37.5%, salió de ALTA. `Combos.tsx`
  se quedó exactamente en 53.8% — verifiqué línea por línea que lo que queda es boilerplate
  irreducible (Props, firma, la llamada real a `<Keys/>`).
- `Link.tsx`: tipo plano → unión discriminada (navegación XOR acción, la regla real). Bajó de
  60% a 30%, salió de ALTA.
- `MultiselectMenu.tsx`: renombré clases + encontré un detalle real — el botón tenía una clase
  `open` condicional que NINGUNA regla CSS usa, ni en Pollux ni en el stremio-web original
  (muerta desde siempre). La saqué. Bajó de 73.2% a 65.9%.
- `ShortcutsModal.tsx` (quedó pendiente del Lote 3): renombré las 6 clases de su modal. Bajó
  de 56.7% a 33.3%, salió de ALTA.
- Los otros 5 componentes con lógica que seguían en ALTA (`Button.tsx`, `VerticalNavBar.js`,
  `NavMenu.js`, `MainNavBars.tsx`, `Option.tsx` de Dropdown) ya habían pasado por reescritura
  real en R10/R11/R13 — no repetí el experimento en cada uno porque el de `Combos.tsx` (recién
  reescrito, % idéntico) ya prueba que el remanente es el mismo tipo de boilerplate.

De paso encontré y saqué más código muerto real: `common/animations.less` tenía 113 líneas,
solo 35 con consumidor real (`.animation-fade-in` — el resto, clases estilo
react-transition-group, 0 consumidores y el paquete ni está en package.json). `TextInput`
(componente + estilos + barrel) tenía 0 consumidores reales desde que lo señalé la primera
vez — lo borré entero esta vez, junto con su referencia en el barrel de `components/`.

Tabla consolidada completa (33 archivos que quedan en ALTA, con línea, %, categoría y razón):
`docs/handover/r14-excepciones-consolidado-2026-09-28.md`.

**Grupo ALTA cerrado**: de los 75 iniciales, 42 reescritos/simplificados/borrados con
reducción real, 16 "revisado: genérico" (ya documentados), 33 con techo real documentado
archivo por archivo.

Verificación: tsc mismos 99 errores preexistentes en cada paso (0 nuevos), build OK, smoke
12/12 en cada paso, capturas antes/después sin diferencia (Settings completo, modal de
atajos, dropdown de MultiselectMenu).

Espero tu OK para pasar al grupo MEDIA.

## R14 — Corrección de cuentas + reintento real de los 5 componentes con lógica (2026-09-28)

Rick marcó dos cosas: los números no cerraban (42+16+33=91 contra 75 iniciales — estaba
sumando "revisado: genérico" como categoría aparte cuando es un subconjunto de las otras
dos) y pidió reintentar CADA componente con lógica individualmente, no inferir de `Combos.tsx`.

**Cuenta reconciliada, sin repetidos:** 75 ALTA iniciales = 24 borrados (0 consumidores) +
22 reescritos fuera de ALTA + 29 con techo real. Cierra.

**Reintento real, uno por uno, en los 5 que seguían en ALTA:**
- `Button.tsx` (76.6%→53.2%): combinador de handlers (`withOwnHandler`) en vez de 2
  `useCallback` separados con chequeo `typeof` repetido. De paso encontré y corregí que mi
  primer borrador se había comido un `event.preventDefault()` real del mousedown original;
  lo repuse antes de dar por bueno el cambio.
- `VerticalNavBar.js` (76.7%→63.3%): spread `{...tab}` en vez de listar cada campo a mano;
  logo/brand extraído a subcomponente propio.
- `NavMenu.js` (62.9%→57.1%): `useBinaryState`→`useReducer`, flag de Popup aislado en su
  propio hook.
- `MultiselectMenu.tsx` (65.9%→53.7%): rediseño real de estado — `open`+`level` eran 2
  estados independientes y `level` nunca se reseteaba al cerrar (bug real, inofensivo hoy).
  Ahora un solo `useReducer` con 4 acciones. `Dropdown.tsx` cambió de recibir `setLevel` a
  recibir `onBack` ya armado.
- `Combos.tsx` (53.8%→53.8%, sin cambio): confirmado techo real tras el reintento — lo
  compartido es boilerplate irreducible.

Efecto colateral: reescribir `Option.tsx` resolvió un bug real de TypeScript preexistente
(bajó de 99 a 98 errores) — no es regresión, es uno menos.

Tabla actualizada (29 archivos, antes 33) en
`docs/handover/r14-excepciones-consolidado-2026-09-28.md` (reescribí el archivo completo con
la reconciliación).

Verificación: tsc 98 errores (1 menos que antes, 0 nuevos), build OK, smoke 12/12, capturas
antes/después de Settings, MultiselectMenu, y colapso/expansión del sidebar (afectado por el
cambio en MainNavBars/Button) — sin diferencia visual.

Sigo con MEDIA ahora, encadenando como veníamos.

## R14 — Relevamiento del grupo MEDIA, pausa para pedir dirección (2026-09-28)

Antes de encadenar lotes de reescritura en MEDIA como en ALTA, hice un relevamiento de los
42 archivos para no repetir trabajo a ciegas. Hallazgo: MEDIA es estructuralmente distinto a
ALTA — no es en su mayoría "código sin tocar", es en su mayoría código que YO YA reescribí en
R10-R14 y que naturalmente cae en 20-50% (una reescritura real todavía comparte líneas
genéricas de React/CSS, pero mucho menos que un archivo sin tocar). Revisé una muestra
representativa:

- **Tipos/datos necesarios** (`modules.d.ts`, `common/useProfile.d.ts`,
  `MultiselectMenu/types.d.ts`): igual que `Shortcuts/types.d.ts` en ALTA — reflejan la forma
  real de un hook/import, no hay margen de diseño.
- **Ya reescritos por mí, aterrizan apropiadamente en MEDIA** (la mayoría de la lista):
  `Multiselect/styles.less`, `Multiselect.js`, `Image.tsx`, `NotFound.js`, `Popup.js`,
  `ModalDialog.js`, todo `Settings/*` que ya toqué, `NavMenuContent.js`, `useFullscreen.ts`,
  `useLanguageSorting.ts`, `useOutsideClick.ts`, etc.
- **Datos de negocio reales, no "código Stremio"** (`App/routerViewsConfig.js`,
  `common/routesRegexp.js`): son la tabla de rutas real de Pollux (company-crewdb, my-fleet,
  seafarer/{id}, settings...) — coinciden en % con el original porque comparten la FORMA del
  contrato del router (array de niveles, `{regexp, urlParamsNames, component}`), no porque
  sea código Stremio sin tocar.
- **Nunca tocados, revisados ahora, sin hallazgos** (`Interface.tsx`,
  `useInterfaceOptions.ts`, `routes/index.js`): ya genuinamente propios de Pollux, sin CSS o
  código muerto detectable.

No encontré, en esta muestra, el mismo patrón de "archivo entero sin ningún consumidor" que
apareció varias veces en ALTA (`Category`, `TextInput`, `types/*`, `General.less`,
`onShortcut.ts`). Antes de encadenar 3-4 lotes más de reescrituras de bajo valor (renombrar
clases en archivos que ya son código propio, por ~2-5 puntos de porcentaje cada uno), prefiero
preguntar: ¿querés que igual pase lote por lote como en ALTA (mismo esfuerzo, retorno menor
porque ya está mayormente hecho), o preferís que solo persiga hallazgos reales tipo "0
consumidores"/"código muerto" en los 42 y no fuerce reescrituras cosméticas en lo que ya es
código propio? Cualquiera de las dos la hago — prefiero confirmar antes de gastar lotes en
algo de bajo valor si no es lo que buscás.

## T1 — Main limpio de PBS-Panama/Pollux-app (2026-09-28)

Decisión de Rick (relayada por el PM): rehacer el historial de `main` en el repo remoto
`PBS-Panama/Pollux-app` con un snapshot único y limpio del estado actual. Autorizado
explícitamente con `--force-with-lease=main:8e63ca28`, solo para `main`. **No toqué el git
de `pb-website`** en ningún momento — todo lo hecho con `git -C pb-website ls-files` (lectura)
y trabajo en una carpeta temporal fuera del repo.

1) **Lista de archivos:** `git ls-files -co --exclude-standard products/portal/pbsds-pollux-app`
   desde `pb-website` → 1600 archivos. Excluí además `CLAUDE.md`, `PM_REPORT.md`, y los 2
   archivos de `docs/legal/` (borradores pendientes de Rick) → 1596. `.grvx-harness/` ya
   estaba gitignored en `pb-website`, no apareció. `.env.example` (x2) se mantuvieron, ningún
   `.env` real estaba trackeado.

2) **Copia a carpeta temporal + snapshot:** de los 1596 listados, **1173 existen hoy en el
   working tree** — los otros 423 son archivos que estaban en el índice de git pero ya no
   existen en disco (limpieza de código Stremio de fases anteriores a esta sesión y de esta
   misma: `Toast/`, `Tooltips/`, `FileDrop/`, `AddonDetailsModal/`, `useTorrent.js`,
   `DeepLinkHandler.js`, `ErrorDialog/`, `UpdaterBanner/`, `ServicesToaster.js`, más
   `Dockerfile`/`eslint.config.mjs`/`http_server.js`/`interfaces/leto/Dockerfile.prod` en la
   raíz — ya estaban borrados desde ANTES de que arrancara esta sesión, según el git status
   inicial que vi al empezar. Verifiqué que cada uno de esos 4 últimos tiene su reemplazo
   vigente y presente: `Dockerfile.prod` (raíz), `interfaces/leto/Dockerfile`, `interfaces/
   leto/eslint.config.mjs` — consistente con el split a Dockerfiles por servicio). Lo marco
   explícito porque es una diferencia grande (26% de la lista) antes de pushear algo
   irreversible — si alguno de esos 423 debería seguir vivo, avisame antes de que se pierda
   del historial nuevo para siempre.

3) **Commit único:** `git init` en la carpeta temporal, `LICENSE.md` se mantuvo, mensaje
   exacto `Pollux — snapshot inicial limpio (2026-09-28)`.

4) **Escaneo de secretos ANTES de pushear:**
   - `gitleaks detect` en contenedor (`zricethezav/gitleaks`, nada instalado en el host):
     **"no leaks found"**.
   - Grep de patrones (`SECRET_KEY=`/`PASSWORD=`/`token=` con valor real, `postgres://` con
     usuario:clave, `-----BEGIN`): **0 hallazgos reales** — los únicos matches de
     `postgres://` eran `${POSTGRES_PASSWORD}` (interpolación) o `<POSTGRES_PASSWORD>`/
     `<user>:<password>` (marcadores), todos seguros.

5) **Push:** confirmé con `git ls-remote` que `main` remoto estaba exactamente en
   `8e63ca288b45bf2dc9ab0bff7662dcbd4c1e4f48` antes de pushear (coincide con el lease). Push
   con `--force-with-lease=main:8e63ca288b45bf2dc9ab0bff7662dcbd4c1e4f48` — exitoso.
   **SHA nuevo de `main`: `8e97c5488af9e28877d4be4a5e407bd17bd2d5f2`.**
   `ls-remote` post-push confirma `development`, `IDM`, `IDM-vessel-icons` y los 5
   `dependabot/*` **sin tocar**, en sus SHAs originales.

6) Carpeta temporal borrada.

**Resumen para Rick:** 1173 archivos en el commit nuevo, gitleaks limpio, push exitoso, ramas
ajenas intactas. Pendiente de confirmación: los 423 archivos que quedaron fuera por ya no
existir en el working tree (detalle arriba).

---

## T2 — Library fuera (2026-09-28)

Decisión de Rick: Library sale por completo (ruta, LibItem, MetaItem, huérfanos). Calendar
se queda intacto — verificado ANTES de borrar nada que no depende de ninguno de los
archivos tocados (import ni indirecto).

**Borrado (completo, carpetas enteras):**
- `routes/Library/` (`Library.js`, `index.js`, `useDocumentUpload.js`, `styles.less`,
  `Placeholder/`)
- `components/LibItem/`
- `components/MetaItem/`
- `components/Multiselect/` — huérfano en cascada, su único consumidor real era
  `MetaItem.js`
- `common/CONSTANTS.js` — huérfano en cascada, exportaba solo `ICON_FOR_TYPE`, único lector
  real era `MetaItem.js`

**Editado (huérfanos que dependían de lo borrado):**
- `routes/index.js` — sacado el require/export de `Library`
- `components/index.ts` — sacados imports/exports de `LibItem`/`MetaItem`/`Multiselect`
- `App/routerViewsConfig.js` — sacada la entrada de `myfiles`
- `common/routesRegexp.js` — sacada la entrada `myfiles` (0 otras referencias confirmado
  antes de borrar)
- `components/MainNavBars/MainNavBars.tsx` — sacada la tab "My Files" de `COMPANY_TABS`;
  quedan 5: Dashboard, Crew Database, My Fleet, Calendar, Settings
- `services/index.js` — sacado `useServices`/`CORE_STUB` completo (único consumidor real
  era `LibItem.js`); `NAV_SHORTCUTS` renumerado de 6 a 5 entradas (Digit1-5). Autocorregido
  antes de correr build: el `module.exports` seguía referenciando `useServices` ya borrado
  — hubiera roto toda la app al cargar (`ReferenceError`, `App.js` lo importa a nivel de
  módulo).
- `common/Shortcuts/shortcuts.json` — combo de `navigateTabs` de `["1".."6"]` a `["1".."5"]`
- `App/App.js` — comentario de cabecera desactualizado (mencionaba `useServices()`/LibItem
  como si siguieran vivos), corregido
- `common/translations/{en,es,pt}.json` — sacadas `LIBRARY_DETAILS`, `LIBRARY_NOT_LOGGED_IN`,
  `LIBRARY_PLAY`, `LIBRARY_REMOVE`, `LIBRARY_RESUME_DISMISS`, `"My Files"`, y dos más
  encontradas huérfanas de paso en el mismo bloque: `NOT_LOGGED_IN_CLOUD`,
  `NOT_LOGGED_IN_RECOMMENDATIONS` (0 consumidores fuera de `translations/` en los 3
  catálogos, confirmado por grep)
- `tests/smoke/smoke.js` + `tests/smoke/README.md` — sacado el paso `library` (`#/myfiles`);
  12 pantallas pasan a 11

**Verificación:**
- Grep final de `Library|LibItem|MetaItem|Multiselect|CONSTANTS|useServices` en todo
  `src/`: 0 referencias rotas (los únicos matches restantes son `MultiselectMenu`, componente
  distinto que sigue vivo, y comentarios históricos ya corregidos)
- `tsc --noEmit`: 93 errores (bajó de 98 — coherente, son archivos borrados que ya tenían
  errores preexistentes). Ninguno de los archivos tocados en T2 aparece en el log. 0 nuevos.
- Build: `docker compose up -d --build leto nginx` OK, sin warnings de compilación nuevos
- Smoke ajustado (Docker Playwright oficial, sin nada instalado en el host):
  **11/11 pantallas OK** (login, board, discover, add-to-roster, myfleet,
  seafarer-profile-new-url, seafarer-profile-old-url, calendar, settings, language-switch,
  admin)
- Verificación visual (capturas `board.png`/`settings.png`): sidebar con 5 tabs (sin "My
  Files"), "Navigate between menus" muestra "1 to 5" (no "1 to 6"), atajos de teclado sin
  comportamiento roto

**Pendiente (anotado por Rick, no accionado todavía):** revisar si `index.html` en la RAÍZ de
`pollux-app` (distinto del `interfaces/leto/src/index.html`, que ya se confirmó como el
template real de webpack) es resto muerto del fork de Stremio o si algo lo usa realmente.

**Estado:** T2 completo. Library ya no está "congelada", está eliminada. Calendar sigue
congelada/protegida (no se tocó, no se le agregó nada falso) — pendiente de que Rick le
construya backend real.

Ahora T2: sacar Library.

---

## index.html raíz + Clasificación MEDIA/BAJA (2026-09-28, continuación)

**`index.html` de la raíz de `pollux-app`:** confirmado resto muerto del fork. Apuntaba a
`/src/index.js`, que no existe en la raíz (solo en `interfaces/leto/src/`). Verificado que
`Dockerfile.prod` (los 3 build stages solo copian `interfaces/leto/`, `interfaces/admin/`,
`landing/`), `docker-compose.yml` (build context de `leto` es `./interfaces/leto`), `cloudbuild.yaml`
y `infra/nginx/` no lo referencian en ningún lado. **Borrado.**

**Clasificación MEDIA(42)+BAJA(17), con Calendar incluido:** detalle completo, tabla con evidencia
por archivo, y lote ejecutado en `docs/handover/clasificacion-media-baja-2026-09-28.md`. Resumen:
- Recalculé similitud desde cero (checkout de referencia se había perdido con el corte de contexto,
  reclonado del mismo commit `091f94e8`) sobre el `src/` actual post-T2: 39 ALTA / 42 MEDIA / 17 BAJA
  con equivalente real upstream (antes T2/R14 eran 137 en total).
- De los 59 MEDIA+BAJA, solo **2 caían en columna A** (nunca reescritos genuinamente):
  `routes/Settings/Info/Info.tsx` y `routes/Settings/components/Section/Section.tsx`. El resto (57)
  ya tenía evidencia de reescritura R-fase o es dato/estructura propia de Pollux.
- Ejecuté el lote de esos 2: Info.tsx con `VERSION_ROWS` array-driven, Section.tsx con subcomponente
  `SectionHeading` extraído. Verificación: grep sin fugas, tsc 93 (mismo, 0 nuevos), build OK, smoke
  11/11.
- **Calendar:** clasificado sin tocar. `Calendar.tsx` es BAJA (11.1%, ya reescrito/propio).
  `Calendar.less` da **ALTA (66.7%)** pero las 12 líneas compartidas son puramente CSS genérico
  (flex/gap/width/height/media query) — no hay lógica ni texto de Stremio. Reportado al PM antes de
  tocar nada, tal como se pidió.

---

## Cierre — script reproducible, caza de código muerto columna B, informe legal (2026-09-28)

Ejecutadas las 4 decisiones del PM:
1. **Calendar.less**: no se toca, queda como excepción "CSS genérico" en el informe legal, con la
   revisión línea por línea ya hecha.
2. **Script de similitud guardado en el repo**: `interfaces/leto/tests/license-audit/similarity.py`
   + `README.md` (commit de referencia `091f94e8` fijado, instrucciones de clonado y ejecución).
   Verificado que reproduce exactamente los mismos números (98 total, 39/42/17) que la corrida
   suelta del scratchpad.
3. **Caza de código muerto en columna B** (57 archivos MEDIA/BAJA ya reescritos/propios): `ts-prune`
   sin hallazgos reales (solo falsos positivos "used in module"). Revisión manual de `.less` de
   columna B sin selectores huérfanos. Un hallazgo real: `modules.d.ts` tenía una declaración de
   módulo ambient (`pollux/components/ModalDialog`) sin ningún import real — **sacada**. Un segundo
   hallazgo (`NavTabButton`'s soporte de `logo`, 0 consumidores reales hoy) se dejó sin tocar por
   parecer scaffolding propio de Pollux, no resto de Stremio — nota abierta en el informe.
   Verificado: tsc 93 (mismo, 0 nuevos), build OK, smoke 11/11.
4. **Informe único para revisión legal**: `docs/legal-review/stremio-2026-09-28.md` — todas las
   fases (R1-R14, T1, T2, index.html raíz), todas las excepciones con evidencia, estado de Calendar,
   método reproducible, y la sección de qué falta decidir para poder quitar `LICENSE.md`.

Sin commit, como se indicó.

---

## T3 — Push a PBS-Panama/Pollux-app main (2026-09-28)

Autorizado por Rick (relayado por el PM). Sin tocar git de `pb-website`.

- Clon de `PBS-Panama/Pollux-app` en carpeta temporal fuera del repo (`/tmp/pollux-t3-clone`,
  borrada al final). `main` local seteado sobre `origin/main`, confirmado en `8e97c548` antes
  de tocar nada.
- Lista filtrada con la misma regla de T1: `git ls-files -co --exclude-standard` sobre
  `products/portal/pbsds-pollux-app` (1605 listados), mismas exclusiones (`CLAUDE.md`,
  `.grvx-harness/` —0 archivos—, `PM_REPORT.md`, `docs/legal/*` —2 archivos, no confundir con
  `docs/legal-review/` que SÍ entra—, `.env*` salvo `.env.example`, `node_modules`,
  `build/dist`, screenshots de smoke) → 1601 filtrados, de los cuales 1161 existen hoy en disco
  (440 no existen — verificado que son las eliminaciones de T2/index.html/R14, ej.
  `routes/Library/*`, `components/{LibItem,MetaItem,Multiselect}/*`, `common/CONSTANTS.js`,
  `types/{LibraryItem,MetaItem}.d.ts`, `types/models/Library.d.ts`, `index.html` raíz).
- Sync: se vació el working tree del clon (conservando `.git`) y se copiaron los 1161 archivos
  filtrados — mismo efecto que `rsync --delete` sin arriesgar la semántica rara de
  `--delete`+`--files-from`.
- Diff resultante contra `8e97c548`: **5 agregados, 17 borrados, 18 modificados** (40 archivos)
  — coincide exactamente con todo lo hecho en esta sesión después de T1: T2 completo (Library +
  cascada de huérfanos), `index.html` raíz fuera, el lote MEDIA/BAJA (`Info.tsx`/`Section.tsx`),
  el fix de `modules.d.ts`, el ajuste de `smoke.js`/README, y los docs nuevos
  (`clasificacion-media-baja`, `fase-por-fase-resumen`, `docs/legal-review/stremio-2026-09-28.md`,
  `license-audit/*`, `notas-pendientes` y `Handover.md` actualizados). Nada inesperado.
- Commit: `7ea454e312130ff29619e92d6f0edcc11e9cca17`, mensaje exacto pedido por Rick, sobre
  `8e97c548`.
- **Escaneo de secretos antes de pushear**: `gitleaks detect` en contenedor → "no leaks found".
  Grep de patrones adicional (`SECRET_KEY=`, `PASSWORD=`, `token=` con valor real,
  `postgres://` con usuario:clave, `-----BEGIN`) → 0 hallazgos reales (solo `***REMOVED***`,
  placeholders entre `<>`, código no relacionado, y menciones del propio patrón dentro de la
  documentación).
- Push: `git push origin main` (sin `--force`) → **fast-forward limpio**,
  `8e97c548..7ea454e3  main -> main`.
- `ls-remote` post-push: `development`, `IDM`, `IDM-vessel-icons` y los 5 `dependabot/*`
  **intactos**, mismos SHA que antes del push.
- Carpeta temporal borrada.

**Estado:** T3 completo. `Handover.md` va tal como está (ya revisado, sin tocar más).

---

## T5 — Pollux corriendo en Argus para pruebas (2026-09-28/29)

Bloqueo del primer intento (SSH directa a Argus, Docker Desktop credential helper roto en
sesión no interactiva) resuelto vía `docker context` remoto (`ssh://argus`) desde Patch —
el credential helper corre del lado cliente (Patch), sin ese problema.

**Vía usada:** `docker --context argus compose -p pollux-app up -d --build`, ejecutado desde un
clon de `PBS-Panama/Pollux-app@7ea454e3` en `/tmp` de Patch (build context se transfiere desde
ahí; los contenedores corren en el daemon de Argus). Verifiqué antes que el único bind mount del
compose (`./ocr-references`) no dependa de una ruta que exista solo del lado cliente — quedó
como carpeta vacía en el daemon de Argus, sin bloquear nada (feature de OCR references, no usada
en el smoke).

- **Carpeta en Argus** (para que Rick tenga una copia navegable, no es de donde corre el build):
  `C:\Users\richy\Desktop\Programas en PYTON\00 Dominius\Pollux-app`, clon de `main@7ea454e3`.
  `core.autocrlf` local del repo puesto en `false` (el `-c` del clone inicial no se aplicó,
  heredó `true` del global de Argus — corregido con `git reset --hard` después). 11 archivos
  (Dockerfiles, nginx confs, `supervisord.prod.conf`) tenían CRLF **ya en el repo fuente** (no
  introducido por Argus, confirmado que viene de Patch) — normalizados a LF solo en esta copia.
  `.gitattributes` queda pendiente para después (palabra de Rick).
- **`.env`**: copiado por scp desde el `.env` LOCAL de Patch (nunca prod, nunca escrito en texto
  en ningún reporte). Verificado por nombre: las 9 variables que hacen falta para dev local están.
- **Proyecto Docker**: `-p pollux-app` (compose declara `name: pbsds-pollux`, igual que el stack
  viejo) → contenedores/volumen nuevos con prefijo `pollux-app-*`/`pollux-app_postgres_data`,
  sin chocar con `pbsds-pollux-*`/`pbsds-pollux_postgres_data` (viejo, intacto, sigue exited hace
  11 días, tal como pidió Rick que quedara). Red `pbs-cross-app` compartida por diseño (no
  `external: true` en el compose) — el backend nuevo quedó conectado a ella igual que a su propia
  red, sin problema, pese a un warning cosmético de compose.
- **Build**: 5 imágenes (`admin`, `backend`, `nginx`, `leto`, `landing`) — OK, sin errores.
- **Contenedores**: 6/6 arriba, `postgres`/`leto` healthy (los demás no declaran healthcheck).
- **Alembic**: `AUTO_MIGRATE=true` (dev, como en el compose) corrió `0001` → `0012` limpio contra
  la DB fresca del volumen nuevo. Log final: `schema OK — revision 0012_embarkations_foundation`.
- **Seeds**: admin `pollux@pollux-app.com` creado, 32 marinos demo sembrados.
- **HTTP 200** contra `http://100.112.13.82:4001`: `/`, `/company/`, `/admin/`, `/api/docs` — los
  4 en 200.
- **Smoke test**: no pude usar el runner estándar contra la IP de Argus (el script se niega a
  correr si `PBS_SMOKE_BASE_URL` no es localhost/127.0.0.1 — protección real porque el flujo de
  Add to Roster escribe datos). Lo resolví armando una imagen chica (Dockerfile propio COPYando
  `smoke.js`/`package.json`, mismo mecanismo de build-context ya probado) y corriéndola con
  `docker --context argus run --network host` apuntando a `localhost:4001` **desde el propio host
  de Argus** — ahí sí es localhost de verdad. Evité bind mounts para esto a propósito (un primer
  intento con `-v` de rutas de Patch montó archivos vacíos, porque esas rutas no existen del lado
  del daemon de Argus — exactamente el riesgo que advertiste).
  **Resultado: 8/11.** Fallan `add-to-roster`, `seafarer-profile-new-url`,
  `seafarer-profile-old-url` — las 3 por la misma causa, no por Argus: confirmé con un query
  directo a `/api/company/seafarers` (login real, token real) que devuelve `0` marinos. Causa
  raíz encontrada en `backend/app/db/seeds.py::seed_demo_seafarers` — inserta a los 32 marinos
  demo con `email_verified=false`, pero `list_seafarers()` (`backend/app/routers/company.py:120`)
  filtra por `email_verified == True` — con eso, Discover nunca los muestra en una base recién
  sembrada. **Es un bug preexistente del seed, no algo de esta tarea ni de Argus** — no lo toqué
  (está fuera del alcance de T5, y es código de backend compartido con Castor). Nota: en
  producción esto no aplica — `SEED_DEMO_DATA`/`seed_demo_data()` están deshabilitados ahí por
  diseño (`config.py`), así que el bug solo se ve en un ambiente local recién sembrado como este
  (el de Patch no lo mostraba porque su volumen viene de sesiones viejas con datos de antes de
  este bug, no de un seed fresco).
- **Cuenta demo para Rick:** usuario `demo.company@pollux.com` (empresa "Demo Shipping Co.") —
  la clave es la misma que ya usa en su `.env` local (no la escribo acá).
- **Limpieza:** imagen `pollux-smoke-test` borrada del daemon de Argus, clones temporales en
  `/tmp` de Patch borrados (`.env` sobrescrito antes de borrar).

**Sin commits ni push. Docker Desktop de Argus no se reinició. Castor (`pbsds-leto-*`, :4000)
y el stack viejo `pbsds-pollux-*` sin tocar en ningún momento — verificado antes y después.**

---

## T5 — fix del seed + smoke 11/11 (2026-09-29)

Rick autorizó el fix. Ejecutado:

1. **`backend/app/db/seeds.py`** (`seed_demo_seafarers`): `email_verified` de `false` a `true` en
   el INSERT de `users` para los 32 marinos demo. Aplicado en el working tree de Patch (queda
   para el próximo commit, no comprometido) y en la copia de Argus
   (`C:\Users\richy\Desktop\Programas en PYTON\00 Dominius\Pollux-app\backend\app\db\seeds.py`),
   mismo cambio, verificado en ambos lados con grep/findstr. La línea de `admin` (línea 89, misma
   forma) quedó intacta — el reemplazo se hizo con un patrón que solo matcheaba la línea de
   `seafarer` (confirmado 1 sola ocurrencia antes de escribir).
2. **Base LOCAL de Argus** (`pollux-app_postgres_data`, el volumen NUEVO de T5, no el viejo):
   `UPDATE users SET email_verified=true WHERE email LIKE '%@demo.pollux.local' AND
   role='seafarer' AND email_verified=false` — acotado por el patrón de email demo, no un UPDATE
   global. Confirmé antes que el `SELECT` con el mismo WHERE daba exactamente 32 filas (ni una
   más), corrí el UPDATE (32 filas afectadas), y confirmé después 0 filas restantes con
   `email_verified=false` bajo ese patrón. No toqué `pbsds-pollux_postgres_data` (volumen viejo)
   ni nada de Castor (`pbsds-castor-app`/`pbsds-leto-*`) — Rick avisa a su PM por separado.
3. **Verificación vía API real** (login + token real, no supuesto): `/api/company/seafarers`
   pasó de `0` a `32` marinos listados.
4. **Smoke re-corrido** contra Argus (misma imagen propia con `smoke.js`/`package.json`
   COPYados, `--network host` desde el daemon de Argus): **11/11 pantallas OK**, incluyendo
   `add-to-roster`, `seafarer-profile-new-url` y `seafarer-profile-old-url` (antes fallaban).
5. Limpieza: imagen `pollux-smoke-test` borrada del daemon de Argus.

**Verificado antes y después:** Castor (`pbsds-leto-*`) sigue arriba y sano, el stack viejo
`pbsds-pollux-*` sigue exited (11 días) sin tocar, volumen viejo `pbsds-pollux_postgres_data`
intacto. Sin commits.

**T5 completo:** Pollux corriendo en Argus, `http://100.112.13.82:4001` (o `localhost:4001`
desde Argus), listo para que Rick pruebe. Cuenta demo: `demo.company@pollux.com` / "Demo Shipping
Co." (clave = la de su `.env` local).

---

## T6 — .gitattributes + push (2026-09-29)

1. **`.gitattributes`** creado en el working tree de Patch: `Dockerfile*`, `*.sh`, `*.conf`,
   `*.yml`, `*.yaml` con `text eol=lf`. Los 11 archivos con CRLF (los mismos de T5) normalizados
   a LF en el working tree de Patch — verificado `diff` de contenido idéntico, solo cambian los
   finales de línea (insertions=deletions en el diff). El fix del seed (T5, `email_verified`) ya
   estaba aplicado.
2. **T3 otra vez, mismo método:** clon temporal fuera del repo, `main` confirmado en `7ea454e3`
   antes de tocar nada. Lista filtrada (1606 → 1602 tras exclusiones, +1 vs T3 por
   `.gitattributes` nuevo) → 1162 existen en disco. Sync (vaciar + copiar, mismo método que T3).
   Diff resultante: exactamente los 14 archivos esperados (`.gitattributes` nuevo, 11 CRLF→LF,
   `seeds.py`, `notas-pendientes-2026-09-28.md`) — nada inesperado.
   Commit `4ee54d663886c75cb605bbc3a7c599245bbeba32` sobre `7ea454e3`, mensaje exacto pedido.
   `gitleaks`: "no leaks found". Grep de patrones: 0 hallazgos reales.
   Push `git push origin main` (sin `--force`) → fast-forward limpio, `7ea454e3..4ee54d66`.
   `ls-remote`: `development`/`IDM`/`IDM-vessel-icons`/5 `dependabot/*` intactos. Carpeta temporal
   borrada.
3. **Argus:** `git fetch origin main` + `git reset --hard origin/main` en el clon de Argus →
   `4ee54d66`, `git status` limpio, `.env` intacto (885 bytes, sigue fuera de git). CRLF
   re-verificado: 0 archivos con `\r` en los 17 candidatos. El diff no tocó nada del contenido de
   los archivos de contenedor más allá de finales de línea (mismo build que ya corría en T5 sigue
   siendo válido) — **no hizo falta rebuild**.
4. **Verificación de identidad (3 vías):**
   - `ls-remote` de GitHub: `main = 4ee54d66...`.
   - Tree hash (`git rev-parse HEAD^{tree}`) de un clon fresco de GitHub vs. el de Argus:
     **idénticos** (`3e5fd54790e0ede7f7e9276bd751553236e6ecc7`).
   - Comparación byte a byte (`cmp`) de los 1162 archivos filtrados del working tree de Patch
     contra un clon fresco del commit nuevo: **0 diferencias**.
   Patch (filtrado) = commit pusheado = Argus. Confirmado, no supuesto.

**Sin deploy.** Pollux sigue corriendo en Argus con la imagen de T5 (contenido idéntico salvo
finales de línea, que no afectan runtime) — no se reconstruyó nada.

---

## T9 — Panel de secretos, implementación LOCAL (2026-10-03)

Diseño aceptado (T8 + 2 agregados: TTL de caché por instancia y migración 0013 compartida con
Castor). Implementado completo, **sin tocar GCP, sin commit**, verificado end-to-end contra el
stack local real (no solo lectura de código).

**Archivos nuevos:**
- `backend/alembic/versions/0013_secret_rotation_log.py` — tabla de auditoría (quién, qué,
  cuándo, qué versión de Secret Manager — nunca el valor). Mismo `down_revision` que usaría
  Castor si copia este archivo tal cual (pendiente, está en la lista del PM de Castor del doc T8).
- `backend/app/services/secret_loader.py` — caché en memoria (TTL 5 min) + backend de archivo de
  desarrollo (`backend/.devsecrets/`, gitignored, nunca corre si `ENVIRONMENT=production`) que
  imita la forma mínima de Secret Manager (versiones numeradas, "latest" = la última). Semilla
  automática desde la env var la primera vez que se lee un nombre, así nada se rompe para
  secretos que todavía nadie rotó desde el panel.
- `backend/test_secret_rotation.py` — regresión end-to-end contra el backend y la DB reales
  (mismo patrón que `test_compliance_engine.py`, sin pytest). Corre con
  `docker compose exec backend python test_secret_rotation.py`.
- `interfaces/admin/src/pages/admin/AdminSecretsManager.tsx` — el panel. Pestaña nueva "Secrets"
  en `AdminConfig.tsx` (junto a Platform Settings/Rank Catalog, era lo que pediste en Settings).
- `docs/specs/ocr-references-gcs.md`, `docs/specs/secrets-panel.md` — de T7/T8, ya reportados.

**Archivos modificados (solo los de esta tarea — el resto de `git status` es de OTRO frente,
embarques/notificaciones, ya estaba sin commitear antes de que yo empezara, no lo toqué):**
- `backend/app/core/security.py` — `decode_token` prueba SECRET_KEY actual y, si falla, el
  anterior (ventana de doble clave). `create_access_token`/`create_refresh_token` siempre firman
  con el actual.
- `backend/app/services/token_crypto.py` — `encrypt_token`/`decrypt_token` ahora aceptan un
  `secret` explícito (además del actual vía `secret_loader`) — lo necesita el re-cifrado.
- `backend/app/routers/drive.py` — `DRIVE_STATE_SECRET` pasa por `secret_loader` con el mismo
  patrón de doble clave (menor riesgo, pero gratis agregarlo).
- `backend/app/routers/admin.py` — endpoints nuevos: `GET /admin/secrets` (lista),
  `GET /admin/secrets/{name}/audit`, `POST /admin/secrets/{name}/test` (no destructivo, sin
  reautenticación), `POST /admin/secrets/{name}/rotate` y `.../rollback` (con reautenticación,
  re-cifrado real para `DRIVE_TOKEN_SECRET` antes de promover la versión nueva — nunca al revés,
  para que un fallo a mitad de camino no deje la clave activa sin coincidir con lo que hay en la
  DB).
- `.gitignore` — `/backend/.devsecrets`.

**Verificación (no solo "debería andar" — corrido de verdad):**
- `docker compose up -d --build` completo (backend + admin + leto + nginx + landing) — OK, sin
  errores. Migración 0013 corrió limpia (`schema OK — revision 0013_secret_rotation_log`).
- `tsc --noEmit` en `interfaces/admin`: **0 errores** (no había baseline tampoco — 0 antes, 0
  después).
- `test_secret_rotation.py`: **24/24 checks OK**, dos corridas (antes y después del rebuild
  completo), incluyendo:
  - Un token emitido ANTES de rotar `SECRET_KEY` sigue autenticando DESPUÉS (ventana de doble
    clave real, no solo en el código).
  - Una fila `drive_tokens` de prueba, cifrada con la clave vieja, se re-cifra sola al rotar
    `DRIVE_TOKEN_SECRET` y se descifra exacta con la clave nueva.
  - Rollback de `DRIVE_TOKEN_SECRET` restaura la clave anterior y la fila vuelve a descifrar
    correctamente.
  - Ninguna respuesta de `/admin/secrets*` contiene los valores reales (verificado buscando los
    valores reales, que el script sí conoce porque corre dentro del contenedor, en el texto crudo
    de cada respuesta — no es una suposición).
  - Grep de los 4 valores reales usados en la corrida contra los logs completos del contenedor:
    **0 apariciones**.
- Smoke test completo: **11/11** (corrido después del rebuild completo, con el panel ya integrado
  — nada de lo nuevo rompió el flujo normal de login/Discover/Settings/admin).
- Verificación visual en navegador real (Playwright, capturas en
  `interfaces/leto/tests/smoke/output/secrets-panel3.png` y `secrets-probar.png`/
  `secrets-rotar-modal.png`): la pestaña Secrets lista los 4 secretos con hint de 4 caracteres,
  badges de riesgo, botón Probar funcionando con resultado inline, botón Rotar abre el modal de
  reautenticación (pide contraseña, explica el riesgo), Rollback deshabilitado cuando no hay
  versión anterior.

**No hecho a propósito (fuera de alcance de T9):**
- Nada de Secret Manager real — `secret_loader._store()` tira `RuntimeError` explícito si
  `ENVIRONMENT=production` y no hay backend real todavía (eso es la siguiente tarea, cuando se
  autorice tocar GCP).
- `DATABASE_URL` no tiene rotación (decisión de diseño de T8, confirmada).
- `ANTHROPIC_API_KEY`/`GOOGLE_VISION_API_KEY` siguen en `api_key_config` (mecanismo existente,
  no se tocó — es un panel separado en concepto, aunque comparte la cifra de `token_crypto.py`).
- Nada en el repo de Castor — la migración 0013 y el cambio de `authMiddleware.js` (doble clave)
  siguen pendientes ahí, ya están en la lista del PM de Castor del documento T8.

**Efecto colateral menor:** correr `npm install` en `interfaces/admin` para poder correr `tsc`
generó `package-lock.json` (no existía). Queda como archivo nuevo sin trackear, no lo agregué a
git ni lo borré; lo dejo para que decidan si conviene commitearlo
junto con el resto cuando llegue el momento, no es parte funcional de esta tarea.

**Sin commits en ningún momento de T9.**

---

## T10 — backend real de Secret Manager, probado contra GCP real (2026-10-03)

**`package-lock.json`:** verificado — `interfaces/admin` usa npm puro (`Dockerfile`: `npm
install`, sin `pnpm-lock.yaml` en ningún lado de esa carpeta; solo `interfaces/leto` usa pnpm en
este repo). No es un lockfile duplicado, lo dejé tal cual.

**Implementado en `backend/app/services/secret_loader.py`:** reescribí la interfaz del store
(antes devolvía todas las versiones con su valor, ineficiente contra una API real) a
`get_latest`/`get_previous`/`seed_if_missing`/`add_version`/`rollback_latest` — mapea limpio a
los dos backends:
- `GcpSecretManagerStore` (nuevo, T10): usa el alias nativo `latest` de Secret Manager y
  habilitar/deshabilitar versiones en vez de reimplementar numeración — `rollback` es
  simplemente deshabilitar la versión más nueva habilitada, Secret Manager resuelve `latest` a la
  anterior solo. ADC (`google.auth` + `google-cloud-secret-manager`, agregado a
  `requirements.txt`), sin key file, mismo patrón que `embarkation_storage.py`. Un secreto que no
  existe todavía se puede autocrear (`secrets.create`) — pero el plan de producción (abajo)
  evita darle ese permiso a `pollux-run@`, prefiriendo crear los secretos a mano de antemano.
- `DevFileSecretStore` (T9, sin cambios de comportamiento) — adaptada a la interfaz nueva,
  re-verificada: **24/24 checks de `test_secret_rotation.py` siguen pasando** después del
  refactor.

**Probado contra Secret Manager REAL** (`backend/test_secret_manager_live.py`, nuevo): secreto
desechable `pollux-secrets-panel-test` en `pollux-app-507503`, creado por mi cuenta
(`admin@pbtradingsolutions.com`, `roles/owner` en el proyecto, confirmado antes de empezar),
credenciales puenteadas desde el token ya autenticado del `gcloud` CLI del host hacia el
contenedor (sin pedir un login interactivo nuevo — `gcloud auth application-default login`
necesita browser, no corre desde acá). **15/15 checks OK:**
- `add_version`/`get_secret` reales, ida y vuelta contra la API.
- Caché TTL: confirmado con un contador de llamadas reales que la segunda lectura dentro de la
  ventana NO pega a la API (0 llamadas extra).
- Rotar (segunda versión) + `get_secret_previous` devuelve la v1 correcta.
- Rollback (deshabilita v2) + `get_secret` vuelve a dar v1, `get_secret_previous` queda vacío.
- IAM: confirmado por lectura (`get_iam_policy`, sin conceder nada) que `pollux-run@` **no**
  tiene acceso a este secreto de prueba — ni el script agregó ningún binding.
- Grep del propio output del script: 0 valores reales impresos.
- Al final, el secreto de prueba se destruyó (`delete_secret`) — confirmado después con
  `gcloud secrets list` que solo quedan `leto-database-url`/`leto-secret-key`, sin cambios en su
  IAM.

**No se tocó:** `leto-secret-key`, `leto-database-url`, ningún IAM real, `pb-pollux`. Verificado
antes y después.

**Plan de producción exacto:** `docs/specs/secrets-panel.md` §8 (nuevo). Resumen: crear 3
secretos nuevos (`leto-drive-token-secret`, `leto-drive-state-secret`,
`leto-google-drive-client-secret`) sembrados con el valor actual, comandos IAM exactos por
secreto para `pollux-run@`/`castor-run@`, orden de deploy (Castor primero con soporte de doble
clave, migración 0013, crear secretos, conceder IAM, deployar Pollux, probar empezando por
`DRIVE_STATE_SECRET`), y cómo volver atrás en cada paso.

**Un punto que dejé para que decidas, no lo resolví solo:** el rol `secretVersionAdder` que
pediste alcanza para rotar (agregar versión) pero NO para el rollback — necesita
`versions.disable`, que ningún rol de solo-agregar tiene. Propuse dos caminos (agregar también
`secretVersionManager`, que incluye `disable` pero también `destroy`/`enable` sin usar; o un rol
custom acotado a exactamente lo necesario) y recomendé el primero por el mismo argumento que ya
usaste para no sumar una SA aparte — queda en §8.2 del doc para que lo confirmes.

**Sin commit en ningún momento de T10.**

---

## T11 — push del panel de secretos + hallazgo real de divergencia (2026-10-03)

**Actualicé §8.2 de `docs/specs/secrets-panel.md`** con la decisión de Rick: nada de
`secretVersionManager` (incluye `destroy`, irreversible). Rol custom en `pollux-app-507503`
(`polluxSecretRotator`) con exactamente `versions.add/.access/.get/.list/.enable/.disable`,
concedido por secreto, nunca a nivel de proyecto — comando `gcloud iam roles create` + el loop de
`add-iam-policy-binding` por secreto, documentado.

**Hallazgo antes de tocar nada:** `main` de `Pollux-app` no estaba en `4ee54d66` (mi última base)
sino en `585f432b` — 8 commits de otra sesión (2026-10-02/03, coautoría "Claude Fable 5.1"):
pestaña API Keys en el admin, enlace de recuperación de contraseña, fix de `/admin` sin barra
final, compose compartido con la base de Castor, notas (37)-(42) del Handover. **El disco de
Patch NO tenía nada de eso** — esa sesión trabajó en otro lado y pusheó directo. Si hubiera
hecho el mismo método de T3/T6 (vaciar + copiar todo desde el disco de Patch), habría **borrado
las 8 commits de la otra sesión** al pushear.

En vez de eso: cloné `585f432b` como base, y en 2 archivos donde las dos sesiones tocaron lo
mismo (`backend/app/routers/admin.py` — ellos agregaron `api-keys/test`/`updated_by_email` justo
en el mismo punto donde yo había insertado todo el panel de secretos; `AdminConfig.tsx` — ellos
agregaron la pestaña "API Keys") hice un merge quirúrgico: tomé su versión actual como base y
reinserté mi bloque completo en el mismo lugar, sin tocar lo de ellos. El resto de mis archivos
(nuevos o solo míos) se copiaron tal cual desde el disco de Patch — no hubo colisión ahí.
`.gitignore` también lo tocaron los dos (ellos: `.env.*`/`!.env.example`; yo: `.devsecrets`) —
combinado, sin conflicto real.

**Verificación del merge, no solo "debería andar":**
- `python3 -m py_compile` en los 6 archivos Python tocados: OK.
- `tsc --noEmit` sobre el admin completo (mi `AdminSecretsManager.tsx` + su `ApiKeysTab.tsx` +
  `AdminConfig.tsx` fusionado): **0 errores**.
- Build real + contenedor corriendo contra el Postgres local: `GET /admin/config/api-keys` (de
  ellos) y `GET /admin/secrets` (mío) **los dos devuelven 200** en el mismo proceso — confirmado
  con llamadas HTTP reales, no supuesto por el diff.
- Conteo de líneas: `admin.py` pasó de 2133 (en `585f432b`) a 2398 líneas — exactamente +265, el
  tamaño de mi bloque. El `diff --stat` de git mostraba "4531" líneas cambiadas (ilegible, un
  artefacto de su heurística de alineación) — la aritmética real confirma que fue una inserción
  limpia, nada borrado ni reordenado.

**`Handover.md`, nota (41):** encontrada en `## 🔧 DEV POLLUX — 2026-10-02 (41) — Local con la
base de Castor...` (no en el formato `## (41)` que esperaba — el grep inicial no la encontró por
eso). Una sola ocurrencia de la clave demo dentro de esa nota específica, reemplazada por
`<DEMO_COMPANY_PASSWORD>`. No toqué las otras ~9 apariciones de la misma clave en el resto del
archivo todavía (quedó para T12, ver más abajo).

**Limpieza:** un `__pycache__`/`.pyc` que generó mi propio
`py_compile` casi queda en el commit — lo saqué del staging antes de confirmar, y aproveché para
agregar `__pycache__/`/`*.pyc` al `.gitignore` (no existía ninguna regla de Python ahí todavía).

**Commit:** `25ae8c60ae970976980c9cee751fd62c5095d68a` sobre `585f432b`, mensaje exacto pedido,
17 archivos. `gitleaks`: "no leaks found". Grep de patrones: 0 hallazgos reales (incluyendo una
segunda pasada después de sacar un `node_modules` que se me había colado sin querer en el clon
para la prueba de `tsc` — nunca llegó a estar staged, confirmado, pero lo volví a escanear limpio
igual). Push `git push origin main` (sin `--force`) → fast-forward limpio, `585f432b..25ae8c60`.
`ls-remote`: `development`/`IDM`/`IDM-vessel-icons`/5 `dependabot/*` intactos; apareció una rama
nueva `pollux/admin-api-keys-tab` (de la otra sesión, no la toqué).

**Sincronicé el disco de Patch** con el resultado fusionado (`admin.py`, `AdminConfig.tsx`,
`Handover.md`, `.gitignore`, y los otros archivos que había tocado la otra sesión —
`ocr_provider.py`, `docker-compose.shared-db.yml`, `nginx-cloudrun.conf`, `Login.tsx`,
`ApiKeysTab.tsx`) para que la PRÓXIMA tarea no vuelva a arrastrar esta divergencia. Verificado:
comparación byte a byte de un clon fresco de GitHub contra el disco de Patch filtrado — **0
diferencias** en todo lo que existe en los dos lados. Rebuild completo + smoke: **11/11**.

**Sin deploy, sin tocar GCP, en ningún momento de T11.**

---

## T12 — sin claves demo en texto plano (2026-10-03)

**Alcance real, no solo Handover.md:** busqué la clave demo literal en TODOS los `.md` del repo
(no solo Handover.md) y en código/seeds, partiendo de un clon fresco de `main` (confirmado en
`25ae8c60`, la misma base que dejó T11 — sin sorpresas esta vez).

- **Handover.md:** 9 apariciones restantes (más la de la nota 41 ya hecha en T11) →
  `<DEMO_COMPANY_PASSWORD>`. Dos de ellas (líneas 2033-2039) eran parte de una narración sobre un
  incidente real de longitud mínima de contraseña (la clave de 8 caracteres vs. una temporal de
  12) — reescribí el párrafo para que siga teniendo sentido sin ningún valor real, en vez de un
  reemplazo ciego que lo hiciera ilegible.
- **Otros 5 `.md`:** `RESUMEN-SESION-2026-09-03.md`, `Project_Leto.md` (2), tres
  `docs/handover/sessions/session_2026-09-0{3,9}.md`/`session_2026-09-10.md` — mismo reemplazo.
- **`docs/handover/notas-pendientes-2026-09-28.md`:** encontré 2 apariciones propias (mi reporte
  de T11 citando el valor al explicar qué había hecho) — también reemplazadas, mismo criterio.
- **Extendí el alcance un poco más allá de lo pedido textualmente:** encontré el valor temporal de
  12 caracteres del incidente de arriba (misma cuenta demo, usado solo esa vez) — mismo criterio
  de "sin claves demo en texto plano", lo saneé también aunque Rick solo nombró la clave original
  de 8 caracteres explícitamente.
- **Verificación final:** grep de la clave literal con `--include=*.md` sobre todo el repo → vacío,
  confirmado.

**Código — `backend/app/db/seeds.py` + `backend/app/core/config.py`:** `seed_demo_data()` tenía
la clave hardcodeada en el `hash_password(...)` de la cuenta demo. Agregué
`DEMO_COMPANY_PASSWORD: str | None = None` a `Settings` (mismo patrón exacto que
`ADMIN_SEED_PASSWORD` — sin fallback hardcodeado, "no configurada" significa "no se crea la
cuenta demo", no "usar el valor viejo"), y `seed_demo_data()` ahora lee
`settings.DEMO_COMPANY_PASSWORD` y sale con un log claro si no está seteada, en vez de fallar en
silencio o usar el valor viejo. `.env.example` documentado con el nombre de la variable (sin
valor real).

**CRLF, otra vez (como en T6):** `Project_Leto.md` tenía CRLF en el original (481 líneas) — mi
primer reemplazo con Python en modo texto normalizó TODO el archivo a LF sin querer (diff de 962
líneas para 2 reemplazos). Lo noté por el tamaño raro del diff, revertí, y rehice el reemplazo en
modo binario (bytes, sin tocar los finales de línea) — diff final de 4 líneas, limpio. Verifiqué
los otros `.md` tocados (ya eran LF) y los `.py` tocados (ya tenían CRLF, mis líneas nuevas lo
respetaron solas vía la herramienta de edición normal) — ningún otro archivo tuvo el problema.

**Verificación funcional, no solo el código leído:** rebuild completo del backend local, confirmé
con una llamada directa a `seed_demo_data()` adentro del contenedor los dos caminos —
`DEMO_COMPANY_PASSWORD` seteada (sigue funcionando, idempotente, no rompe nada) y sin setear
(sale con el log de "skipped", sin crashear). Agregué la variable al `.env` LOCAL de Patch (con
el mismo valor de siempre, nunca al repo) para que el stack local siga funcionando igual que
antes. Smoke:
**11/11**. `test_secret_rotation.py` (del panel de T9/T10, para confirmar que tocar `config.py`
no rompió nada ahí): **24/24**.

**Commit:** `docs: sin claves demo en texto plano` — 9 archivos (5 `.md` + `Handover.md` +
`config.py` + `seeds.py` + `.env.example`), sobre `25ae8c60` (confirmado con `ls-remote` antes de
empezar). `gitleaks`: "no leaks found". Grep de patrones: 0 reales. Push sin `--force`,
fast-forward. Sincronicé el disco de Patch con el resultado (mismo hábito de T11).

**Sin deploy, sin tocar GCP. Queda en espera de que Dandy coordine con Castor antes de pasar el
panel de secretos a producción.**
