# Revisado: genérico — archivos del grupo ALTA ya reescritos en R10-R13

Excluidos de los lotes de reescritura de R14 (ya se trabajaron antes; la
similitud que muestran es por líneas de código genéricas — sintaxis de React,
propiedades CSS estándar — no por seguir siendo una copia de Stremio).

| Archivo | % similitud | revisado: genérico |
|---|---|---|
| `components/Button/Button.tsx` | 76.6% | Reescrito de cero en R11 Parte A; comparte líneas porque cualquier botón con `tabIndex`/`onClick`/`disabled` en React se ve parecido — la estructura interna (props, decisiones de render) es otra. |
| `components/Button/Button.less` | 72.7% | Reescrito en R13; `outline-width`, `cursor: pointer`, `opacity: 0.5` son declaraciones CSS genéricas, no lógica de Stremio. |
| `components/MultiselectMenu/MultiselectMenu.tsx` | 73.2% | Reescrito en R13 (funciones puras extraídas, if/else en vez de operador coma); el hook `useBinaryState`+`Popup` es el mismo patrón que cualquier dropdown usaría. |
| `components/MultiselectMenu/Dropdown/Dropdown.less` | 78.6% | Reescrito en R13 (`.dropdown`/`.dropdown.open` separados); `position: absolute`, `overflow: hidden`, `border-radius` son declaraciones genéricas de cualquier menú flotante. (`Dropdown.tsx` quedó en MEDIA — 44.2% — se revisa en esa fase, no acá.) |
| `components/MultiselectMenu/Dropdown/Option/Option.tsx` | 56.0% | Reescrito en R13 (`isSelected` como función pura); un botón de opción con label+ícono no tiene mucho margen para diferir más. |
| `components/MultiselectMenu/Dropdown/Option/Option.less` | 71.4% | Reescrito en R13 (selectores aplanados); mismo caso — layout de fila con label+ícono es genérico. |
| `components/MainNavBars/MainNavBars.tsx` | 53.3% | Reescrito en R11 Parte B + R13 (hook `useSidebarCollapsed` extraído, `getUserRole` muerto sacado); la composición `<Vertical/><Horizontal/><content/>` es la única forma sensata de armar ese layout. |
| `components/MainNavBars/MainNavBars.less` | 84.0% | Reescrito en R13 (selectores aplanados, `.collapsed` explícito); layout ya es 100% Mannat (absolute positioning propio), las líneas compartidas son genéricas (`position: absolute`, `z-index`, etc). |
| `components/NavBar/HorizontalNavBar/NavMenu/NavMenu.js` | 62.9% | Reescrito en R11 Parte B (handlers renombrados, dependencias completadas); envolver un `Popup` con un label es un patrón genérico. |
| `components/NavBar/VerticalNavBar/VerticalNavBar.js` | 76.7% | Reescrito en R11 Parte B (subcomponente `NavTabs` extraído); un `<ul>` de tabs con `.map()` es la forma obvia de escribirlo. |
| `components/ModalDialog/styles.less` | 53.8% | Reescrito en R13 (código muerto real sacado: `.modal-dialog-background`/`.action-button`/`.buttons-container`, selectores renombrados y aplanados); lo que queda (`display:flex`, `border-radius`, `box-shadow`) es CSS de modal genérico. |
| `components/Popup/styles.less` | 82.8% | Reescrito en R13 (las 4 direcciones combinadas en 2 ejes); un popup posicionado con `top/right/bottom/left` no tiene mucho margen para variar más. |
| `App/styles.less` | 79.7% | Editado en R11 Parte A (se sacaron `.toasts-container`/`.tooltip-container` muertos) — es la hoja de layout raíz de toda la app (182 líneas), la mayoría son reglas de layout genéricas (flex, tamaños) que cualquier shell necesitaría. |
| `App/ShortcutsModal/ShortcutsModal.tsx` | 56.7% | Reescrito en R11 Parte A (bug real de dependencias corregido); portal+backdrop+Escape es la única forma razonable de armar un modal así. |
| `components/NavBar/index.js` | 100.0% | Barrel de 2 exports, reescrito en R11 Parte B — un re-export de `{HorizontalNavBar, VerticalNavBar}` no tiene una segunda forma "distinta" de escribirse. |
