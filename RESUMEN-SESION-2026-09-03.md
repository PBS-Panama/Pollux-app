# Pollux — Resumen de la sesión 2026-09-03

> **Para quien ensamble este trabajo con el del developer colaborador.**
> Todo lo de este día lo hizo la sesión de Claude Code de pb-website, reasignada por Rick a Pollux.
> Detalle técnico completo: `docs/handover/sessions/session_2026-09-03.md` · runbook: `docs/runbooks/POLLUX-DOMAIN.md`.

---

## 0 · Dónde está el código y cómo integrarlo (LEER PRIMERO)

| Qué | Dónde |
|---|---|
| Worktree con los cambios | `…/00 Dominius/pb-website-pollux/` (git worktree del repo `pb-website`) |
| Rama | **`pollux/domain-seo-login`**, hija de `rename/leto-to-pollux` (commit base `f60e46d7`) |
| Estado git | **Cambios STAGED, sin commit** (25 archivos: 13 modificados, 12 nuevos). El commit lo hace Rick |
| Parche autocontenido | `…/00 Dominius/pollux-2026-09-03.patch` (binario-safe, incluye PNG/SVG). Aplicar sobre `f60e46d7` con `git apply --index pollux-2026-09-03.patch` |
| Copia de este resumen fuera del repo | `…/00 Dominius/POLLUX-RESUMEN-2026-09-03.md` |

**Por qué está así:** el checkout principal de `pb-website` está en `main`, donde la carpeta del producto aún se llama `pbsds-leto-app/`. El rename a `pbsds-pollux-app/` vive solo en la rama `rename/leto-to-pollux` (7 commits, sin mergear). Había tres sesiones más abiertas sobre ese checkout, así que no se cambió de rama ahí. La `pbsds-pollux-app/` que se ve en `main` es **residuo sin rastrear** (`.env`, `User database/`, `ocr-references/`, una carpeta basura `backend/app;C`); no es el proyecto.

**Si se mueve el proyecto de carpeta:** primero commitear (o conservar el `.patch`), porque un worktree movido a mano pierde el enlace con el repo. Para deshacer el worktree limpiamente después de commitear: `git worktree remove pb-website-pollux` desde `pb-website`.

Orden de merge sugerido: `rename/leto-to-pollux` → `main` → `pollux/domain-seo-login`. Los 4 commits de `main` que no están en la rama del rename son del sitio corporativo (`app-landing-skin`, docs raíz); no tocan el producto.

### Archivos tocados (todos bajo `products/portal/pbsds-pollux-app/`)

**Nuevos**
- `docs/runbooks/POLLUX-DOMAIN.md` — runbook del dominio (7 fases, ejecutadas 0–4 y 7)
- `docs/handover/sessions/session_2026-09-03.md` — log de la sesión
- `infra/cloudrun/pb-pollux.env.example.yaml` — plantilla de env vars (sin valores)
- `landing/src/lib/auth.ts` — flujo de login compartido
- `landing/public/robots.txt`, `sitemap.xml`, `og-image.png`, `apple-touch-icon.png`, `favicon.svg`
- `landing/package-lock.json`
- `RESUMEN-SESION-2026-09-03.md` (este archivo)

**Modificados**
- `Handover.md` — banner, checklist del 02-sep, sección "SESIÓN 2026-09-03", nuevo bloque ÚLTIMA ACTUALIZACIÓN
- `docs/README.md`, `landing/README.md`
- `infra/nginx/nginx-cloudrun.conf`
- `landing/index.html`, `landing/vite.config.ts`
- `landing/src/App.tsx`, `pages/LandingPage.tsx`, `pages/Login.tsx`
- `landing/src/components/LoginModal.tsx`, `RegisterModal.tsx` (solo copy), `ProtectedRoute.tsx`, `AdminGuard.tsx`
- `landing/src/lib/api.ts`, `store/authStore.ts`

**No tocado:** `backend/`, `interfaces/castor`, `interfaces/leto`, `interfaces/admin`, `Dockerfile.prod`, `docker-compose*`, Cloud Run (`pb-pollux` sigue en rev 00003).

---

## 1 · Dominio `pollux-app.com` — HECHO, en producción

| Paso | Resultado |
|---|---|
| Zona Cloud DNS | `pollux-app-zone` en `pollux-app-507503`, NS `ns-cloud-b1..b4`, DNSSEC off |
| Registro | Comprado por Rick vía CLI (12 USD/año, Cloud Domains del proyecto Pollux). `ACTIVE`, vence 2027-09-03, auto-renew, transfer lock, WHOIS redactado. Contactos = los de `castor-app.com` (`…/00 Dominius/pollux-contacts.yaml`, fuera del repo). Correo ICANN verificado |
| Mapeo Cloud Run | `pollux-app.com` y `www.pollux-app.com` → `pb-pollux` (us-central1) |
| Registros web | A ×4 (`216.239.32/34/36/38.21`) · AAAA ×4 (`2001:4860:4802:32/34/36/38::15`) · CNAME `www` → `ghs.googlehosted.com.` · CAA `pki.goog` + `letsencrypt.org` |
| Certificado | Emitido ≈25 min después del DNS; el borde tardó ≈4 min más. **`https://pollux-app.com/` en línea desde 18:46** |
| Verificado por el dominio | `/` 200 · `/api/docs` 200 · `POST /api/auth/login` con credenciales falsas → 401 (backend + Cloud SQL OK) · `/app/`, `/company/`, `/admin/` 200 |
| Correo (Fase 7) | `pollux-app.com` como dominio secundario de Workspace. MX `1 smtp.google.com.` · SPF · DMARC `p=none; rua=mailto:pollux@pollux-app.com` · DKIM `google._domainkey` (2048-bit, 2 strings). Consola en **"Todo está bien"** la misma noche |

**Lección para Castor** (cuyo DKIM sigue en "Acción necesaria"): en Pollux el TXT de DKIM ya resolvía públicamente **antes** de pulsar "Iniciar la autenticación" y la clave nunca se regeneró. Repetir ese orden.

**Nota operativa:** el comando de compra (`gcloud domains registrations register`) lo bloquea el clasificador de auto-mode de Claude Code; lo corre Rick desde VS Code. Todo lo demás (zona, mapeos, registros) lo puede ejecutar Claude con la sesión `gcloud` ya válida. `--env-vars-file` reemplaza el set completo de variables; nunca `--set-env-vars` con `DATABASE_URL` (la `@` la trunca).

---

## 2 · Landing — rebrand Pollux + SEO + Lighthouse

- `index.html`: título/description Pollux, canonical `https://pollux-app.com/`, Open Graph/Twitter con `og-image.png` 1200×630, JSON-LD (Organization · WebSite · SoftwareApplication), `theme-color`, favicon SVG, hreflang `es`/`x-default`, Google Fonts asíncronas con `preload` + `noscript`.
- `robots.txt` bloquea `/api/ /crewing-api/ /app/ /company/ /admin/ /dashboard /login /register`; `sitemap.xml` con `/`.
- `LandingPage.tsx`: copy Leto → Pollux; landmarks (`header/nav/main/section/footer`, skip link, `<ol>` pasos, `<dl>` cifras); contraste WCAG AA (texto ≥ 60 % sobre navy); emojis `aria-hidden`; `aria-pressed` en toggles; cifras "60 rangos STCW" y "5 categorías de flota". **Los atajos DEV del nav (`/admin/learning`, `/app/`, `/company/`) se renderizaban en producción** → ahora solo con `import.meta.env.DEV`.
- `App.tsx`: `Dashboard` y las 12 páginas admin en `React.lazy`; `vite.config.ts` con chunk `vendor` estable. Bundle de la landing: 62 KB propios + vendor 218 KB (gzip 18 + 74).
- `RegisterModal.tsx`: solo marca ("Agente Leto" → "Guía Pollux").
- nginx (`nginx-cloudrun.conf`): `www` → 301 apex; gzip; `X-Content-Type-Options`, `X-Frame-Options SAMEORIGIN`, `Referrer-Policy`, HSTS; `index.html` no-cache; `/assets/` 1 año. Dos bugs latentes corregidos: el regex de assets capturaba `/admin/assets/*.js` (404 en el admin por URL directa) y el `try_files` de `/admin/` usaba ruta de disco (500 en deep links).

**Lighthouse 12** (nginx real + `dist`, headless):

| Página | Móvil | Escritorio |
|---|---|---|
| `/` | 98–99 / 100 / 100 / 100 | 100 / 100 / 100 / 100 |
| `/login` | 99–100 / 100 / 100 / 66* | 100 / 100 / 100 / 66* |

\* SEO 66 = `noindex` deliberado. Medir en producción **en incógnito** cuando se despliegue.

---

## 3 · Página de inicio de sesión `/login`

- Antes `/login` redirigía a `/`, y el interceptor 401 mandaba a `/login` → rebote sin contexto. Ahora es una página real: marca Pollux, panel de valor en escritorio, tabs Tripulante/Empresa, `?next=/ruta` (solo same-origin, `safeNext()`), `?role=company`, redirección si ya hay sesión, `noindex`, a11y completa.
- Flujo unificado en `lib/auth.ts` (`signIn` → tokens → `/auth/me` → store → `init` crewing → puente `leto-user`). Lo usan `/login`, `LoginModal` y la barra DEV. Antes estaba copiado 3 veces y la `Login.tsx` vieja ni escribía el puente.
- `api.ts`: un 401 de `/auth/login` (contraseña mal) **ya no dispara logout + redirección** (bug real: escribir mal la contraseña en el modal te sacaba de la página). Los 401 de endpoints protegidos → `/login?next=<ruta>`.
- `ProtectedRoute` → `/login?next=…`; `AdminGuard` → `/login?next=/admin` sin sesión, `/dashboard` si no es admin. `logout()` limpia `leto-user` / `leto-profile-extra`.
- `/register` abre la landing con el modal de registro (`?role=` preselecciona). `pages/Register.tsx` queda sin ruta (código muerto, candidato a borrar).

**Invariante que no se tocó:** las claves de `localStorage` `leto-auth`, `leto-user`, `leto-profile-extra` conservan su nombre histórico. El iframe `/app/` depende de ellas (`docs/architecture/AUTH-FLOW.md`). No renombrar.

---

## 4 · Lo que NO se hizo / no se probó

- No se corrió el stack completo con FastAPI: el login real contra el backend y el puente `leto-user` dentro del iframe quedan para la prueba de Rick en `localhost:4000` (gate obligatorio antes de cualquier deploy).
- No se construyó ni desplegó la imagen de `Dockerfile.prod`. `pb-pollux` sigue con la imagen del 02-sep: por eso el dominio hoy muestra la landing "Leto", `www` responde 200 en vez de 301 y `/robots.txt` devuelve el `index.html`.
- No se tocó el branding interno de `interfaces/castor`, `interfaces/leto`, `interfaces/admin` (siguen diciendo Leto).
- Sin CSP en nginx (requiere inventario de inline scripts de 4 builds; Lighthouse no lo penaliza).

---

## 5 · Pendientes, en orden

1. **Rick:** prueba local de la rama (`docker compose up -d` → `localhost:4000`): landing, `/login` con las 3 cuentas demo, `/register?role=company`, contraseña incorrecta en el modal (debe quedarse en la página), iframe `/app/` viendo `leto-user`.
2. **Deploy (Fase 5 del runbook):** build `Dockerfile.prod` → push a `us-central1-docker.pkg.dev/pollux-app-507503/pollux-registry/pb-pollux:latest` → `gcloud run deploy pb-pollux … --env-vars-file=<YAML fuera del repo>` con `CORS_ORIGINS=https://pollux-app.com,https://www.pollux-app.com,https://pb-pollux-mlb5b3vcjq-uc.a.run.app`. Plantilla: `infra/cloudrun/pb-pollux.env.example.yaml`.
3. **Fase 6:** Search Console (propiedad de dominio, enviar sitemap) + Lighthouse en incógnito sobre `https://pollux-app.com/`.
4. **Correo:** crear el buzón `pollux@pollux-app.com` (destino de reportes DMARC) y prueba de campo `DKIM: PASS` con `d=pollux-app.com`. Tras 4–6 semanas de reportes, subir DMARC a `p=quarantine`.
5. Merge de ramas y borrado del residuo `pbsds-pollux-app/` de `main` (revisar antes `User database/` por si tiene datos reales).
6. Branding interno de las interfaces.
7. Bloquear `pb-leto` (durable-sky) con `--ingress=internal` una vez validado `pb-pollux` (decisión de Rick, runbook 3.4).

---

## 6 · Recursos cloud creados hoy (estado real, no reproducible desde el repo)

| Recurso | Proyecto | Nota |
|---|---|---|
| Registro `pollux-app.com` | `pollux-app-507503` (Cloud Domains) | auto-renew, vence 2027-09-03 |
| Zona `pollux-app-zone` | `pollux-app-507503` | A/AAAA/CNAME/CAA/MX/TXT(SPF, DMARC, DKIM) |
| Domain mappings apex + www | `pollux-app-507503` / Cloud Run us-central1 | → `pb-pollux` |
| APIs `domains`, `dns` | `pollux-app-507503` | habilitadas |
| Dominio secundario en Workspace | tenant `pbtradingsolutions.com` | "Todo está bien" |

Sin cambios en `durable-sky-484422-b5`, `castor-app-506901`, Cloud SQL ni en el servicio `pb-pollux`.

---

## 7 · ADENDA 2026-09-04 — reubicación tras el split físico del PM

- `main` cambió de forma (commits `8a56fcac`…`f8ab2cf2`): `pbsds-pollux-app/` es ahora **Pollux-only** y está
  trackeado; `pbsds-leto-app` → `pbsds-castor-app`. Las ramas `rename/leto-to-pollux` y `pollux/domain-seo-login`
  quedan **archivadas sin mergear** (decisión de Rick).
- El worktree `pb-website-pollux` fue movido a `_DELETE-ME_pollux-runtime-spill/` y su registro podado. Tenía
  26 archivos **staged sin commit** (este trabajo). Se preservaron en `…/00 Dominius/pollux-2026-09-03.patch`.
- **Nueva ubicación del trabajo:** worktree `…/00 Dominius/pb-website-pollux-v2`, rama
  **`pollux/domain-seo-login-v2`** (desde `main` `f8ab2cf2`). Parche reaplicado con `git apply --3way --index`;
  `Handover.md` y `nginx-cloudrun.conf` rehechos contra la versión Pollux-only. Ajustes por el split:
  `Dashboard.tsx` → iframe `/company/`, `auth.ts` sin `/crewing-api/`, atajo DEV `/app/` eliminado,
  `package.json` → `pollux-frontend`.
- La sección §0 de arriba (rutas del worktree viejo, `git apply` sobre `f60e46d7`) queda **obsoleta**; vale el
  resto del documento.

- **Decisión de producto (Rick, 2026-09-04):** Pollux lee los datos del tripulante desde Cástor (misma DB) y el
  tripulante usa Cástor para sus schedules → la landing de Pollux **registra solo empresas**; tripulante → `castor-app.com`
  (`src/lib/links.ts`). Login (página + modal): pestaña Tripulante muestra aviso + enlace a Cástor; formulario solo empresa.
  Copy del hero/features/proceso en clave empresa. Build verificado tras el cambio.

- **2026-09-04 (tarde) — nueva landing estática:** Rick pidió usar la plantilla comprada
  `landing/Landing Reference/polygon/` como base del sitio, sin tocar la paleta, solo texto. Copiada a
  `landing/site/` y reescrita por completo a Pollux (nav, hero, features, pricing, testimonios, blog,
  footer). Sin build step, sin wiring a Docker/backend aún — eso queda para la fase "app" que sigue.
  5 decisiones marcadas para Rick (precios "a cotizar" en vez de inventar $, testimonios sin nombres
  falsos, blog con temas reales STCW/MLC en vez de posts inventados, contador "60 rangos STCW" en vez de
  "descargas de app" falsas, video promo deshabilitado por apuntar a un YouTube ajeno). Logo wordmark
  "Pollux" generado como placeholder (el original decía "Appdent"). Verificado con Chrome headless
  (screenshots completos) y diff exhaustivo contra el original — cero cambios de CSS. `landing/src`
  (React) sigue intacta, sin tocar.

- **2026-09-04 (noche) — landing montada en :4001:** el servicio `landing` de docker-compose pasó
  a servir `landing/site/` (estático) directo; el React con login/registro se movió a un servicio
  nuevo `webapp`, alcanzable solo en `/login /register /dashboard` (nginx). Nav del estático ganó
  "Iniciar sesión" + "Registrarse" (botón) conectando a ese React real; los CTA de hero/precios que
  apuntaban a un formulario muerto ahora van a `/register`. Dos fixes en React (`Login.tsx`, `App.tsx`)
  para que "volver al inicio" navegue de verdad al estático en vez de renderizar la landing vieja
  interna. Verificado de punta a punta: login real, JWT, `/api/company/seafarers` con token.

- **2026-09-04 (noche, cont.) — páginas conectadas + sitio navegable:** `/login` y `/register`
  reescritos con la paleta naranja de `landing/site/` (antes navy/cyan). Al revisar el código del
  registro encontré que el modal viejo nunca mandaba `company_name` al backend — toda empresa
  registrada por ahí quedó como "Unnamed Company" en la DB (`auth.py:72`). `Register.tsx` nuevo:
  página dedicada, solo 3 campos reales (empresa/correo/contraseña), `registerCompany()` en
  `lib/auth.ts`. Verificado de punta a punta contra el backend real. Además, "Recursos" pasó de 3
  placeholders "Próximamente" a 3 artículos reales (`recursos.html` + `recursos/*.html`) con
  contenido sacado de `Regulation.md`, `mlc_validator.py` y la documentación del Verified Badge en
  este mismo Handover — sin inventar cifras ni afirmar automatizaciones que aún no existen.

- **2026-09-04 (noche, cont. 2) — login solo-empresa, 3 campos:** quitado el toggle Empresa/
  Tripulante de `/login` (ya no hay ruta de tripulante ahí en absoluto). Campos: Nombre de empresa
  (nuevo) → Usuario (antes "Correo electrónico") → Contraseña. El nombre de empresa es un campo real,
  no decorativo: el backend (`schemas/auth.py` + `routers/auth.py`) lo valida contra la `Company`
  vinculada a la cuenta, mismo 401 genérico que una contraseña mal escrita. Solo aplica a cuentas
  `role="company"` — admin y seafarer no se tocan. Cambio confinado a esta carpeta (no a Cástor).
  Demo: `demo.company@leto.com` / `demo1234` / empresa **"Demo Shipping Co."**. Verificado con 6 casos
  reales contra el backend (sin nombre, nombre erróneo, nombre correcto, normalización, admin sin
  afectar, cuenta nueva registrada hoy).

- **2026-09-04 (noche, cont. 3) — fix nav flotante:** el header del home se perdía visualmente en
  ciertos puntos del scroll (texto casi blanco sobre fondo blanco cuando el toggle JS del fondo
  sólido no alcanzaba a dispararse a tiempo). `landing/site/js/main.js`: el listener de scroll que
  alternaba la clase `navbar-fixed` se reemplazó por una asignación permanente en la carga de la
  página — el header ahora siempre tiene fondo sólido en gradiente y `position:fixed`, visible en
  cualquier punto del scroll sin depender de eventos. Un solo archivo, una línea; verificado con
  --dump-dom.

- **2026-09-04 (noche, cont. 4) — fix real del nav "invisible":** Rick diagnosticó la causa exacta
  con captura — la fila de menú (Inicio/.../Recursos) se salía de la altura fija de 60px del header
  al agregarse la fila de Iniciar sesión/Registrarse encima, quedando sin fondo. Fix: el gradiente
  naranja se le puso a `#navbar.navbar-collapse` (sin altura fija, crece con el contenido real) en
  vez de depender de `.header_section`. Verificado con screenshot limpio a 1440px, ambas filas sobre
  fondo naranja continuo.

- **2026-09-04 (noche, cont. 5) — nav unificado + burger en anchos intermedios:** Login/Register
  pasan a ser parte de la MISMA `<ul>` del menú (ya no hay lista separada, ni salto de color entre
  bloques). Nuevo breakpoint propio 768–1299px: el botón hamburguesa (ya integrado en el template,
  sin JS nuevo) colapsa todo el menú en ese rango; desde 1300px se ve todo en una sola barra. Mismo
  fix propagado a `recursos.html` + los 3 artículos vía `css/article.css` (compartían el mismo bug
  latente). Verificado en 1440/1300 (una fila), 1024 (hamburguesa sin fila huérfana) y &lt;768 (sin
  cambios, DOM limpio).

- **2026-09-04 (noche, cont. 6) — seam del desktop + auto-cierre del burger:** el fondo de
  `#navbar` (flotado, ancho de su propio contenido) pintaba un segundo bloque de gradiente sobre el
  gradiente ya continuo del header, con salto de color justo detrás del logo. Fix: el fondo solo se
  pinta con `.in`/`.collapsing` (dropdown abierto) — a ≥1300px queda transparente, gradiente único
  sin cortes. Mismo fix en `article.css` (4 páginas de Recursos). Además, `js/main.js` cierra el
  menú móvil/tablet automáticamente al elegir una sección (`$('#navbar').collapse('hide')`, con
  guard para no afectar el escritorio) — antes se quedaba abierto tapando la página mientras
  `data-scroll` animaba.

- **2026-09-04 (noche, cont. 7) — botón Registrarse ya no sobresale:** heredába `line-height:60px`
  de `ul.nav > li > a` + su propio padding → ~72px de alto, más que la barra de 60px. Fix:
  `line-height:20px` + `vertical-align:middle`, píldora compacta que se centra sola. Mismo cambio en
  `index.html` y `article.css`. Verificado con screenshot limpio.

- **2026-09-04 (noche, cont. 8) — Registrarse: tamaño ajustado:** el fix anterior (line-height:20px)
  dejó el botón en ~36px, se veía chico. Cambiado a `height:44px` + `line-height:44px` igual +
  padding solo horizontal — 44px dentro de la barra de 60px, proporcionado, sin sobresalir. Mismo
  cambio en `index.html` y `article.css`.

- **2026-09-04 (noche, cont. 9) — logo real de marca implementado:** `Pollux_Logo.svg` (insignia
  circular naranja-rojo, constelación Géminis) reemplaza todos los placeholders. cairosvg
  rasterizaba el fondo blanco oculto del SVG de forma inconsistente → se enmascaró manualmente con
  la geometría exacta del círculo (PIL). Regenerados: logo.png, favicon.png (sitio estático),
  favicon.svg, apple-touch-icon.png, og-image.png (app React). De paso: Login.tsx/Register.tsx
  tenían un punto CSS placeholder en vez del logo real — corregido a `<img src="/favicon.svg">`.
  Bug de nginx encontrado al verificar: esas rutas caían al contenedor `landing`, no `webapp` — se
  copiaron los 3 archivos también a la raíz de `landing/site/`. Verificado con curl (200) y
  screenshots de `/`, `/login`, `/register`.

- **2026-09-04 (noche, cont. 10) — constelación más visible + asset retina + fix de enrutamiento
  nginx:** Rick editó el SVG a mano (estrella/puntos más grandes, viewBox cambió). Generó de nuevo
  todos los assets con geometría del círculo extraída dinámicamente del SVG (ya no hardcodeada).
  logo.png del header ahora es un asset retina (68px real, 34px en pantalla via CSS) para que los
  puntos no se aplasten en HiDPI. Bug encontrado al verificar: nginx cachea las IPs de sus upstreams
  al arrancar — tras reconstruir `landing`/`webapp` con `--build`, nginx siguió sirviendo tráfico
  cruzado (contenido de `webapp` en la ruta `/`) hasta hacer `docker compose restart nginx`. Anotar
  para el futuro: reiniciar nginx siempre tras reconstruir cualquier servicio backend.

- **2026-09-04 (noche, cont. 11) — logo del login movido al panel de marca (desktop):** en
  `Login.tsx`, el link del logo se movió del top bar al panel naranja de marca (arriba de todo,
  antes del badge), más grande (`w-14 h-14`), solo en versión desktop (`lg:` +). El top bar mantiene
  el logo chico solo en móvil/tablet (`lg:hidden`). Verificado con screenshots a 1440px y 420px.

- **2026-09-04 (noche, cont. 12) — SVG de marca, tercera revisión:** Rick volvió a editar
  `Pollux_Logo.svg` a mano (ajuste menor, mismo viewBox). Se repitió el pipeline completo (copiar
  SVG → build_logo_assets.py → sync a landing/site/ → rebuild landing+webapp → restart nginx).
  Un screenshot de `/` salió con toda la página a baja opacidad en varios intentos — confirmado con
  dump-dom que es flakiness de Chrome headless (body.loaded sí se aplicó, sin errores JS), no una
  regresión; una retry adicional dio un screenshot limpio con el logo correcto.

- **2026-09-04 (noche, cont. 13) — logo agregado a la izquierda de #subscribe:** nuevo wrapper
  flex en `article.css` (`.subscribe_flex`/`.subscribe_brand`/`.subscribe_content`), sin tocar las
  reglas viejas de `main.css` (`.subscribe_wrap`/`.subscribe_form`/`.social_link` siguen igual).
  Logo (mismo `logo.png` retina del header) a la izquierda en desktop, arriba centrado en móvil
  (`flex-direction:column` en ≤767px). Verificado con screenshots de página completa a 1440px y
  420px.

- **2026-09-04 (noche, cont. 14) — logo del subscribe a 1/3 del ancho (fix de flex-basis):**
  `flex:1 1 33%`/`flex:2 1 67%` sumaba exactamente 100% sin dejar margen para el `gap:24px` — con
  `flex-wrap:wrap`, el navegador envolvía cada item a su propia línea completa (cada uno estirado a
  100% por su propio flex-grow) en vez de ponerlos lado a lado. Depurado con una página de prueba
  aislada con outlines de color. Fix: `flex-basis:0` en ambos (patrón estándar de split
  proporcional). Verificado a 1440px (1/3-2/3 correcto) y 420px (columna intacta).

- **2026-09-04 (noche, cont. 15) — logo del login a 1/3 de ancho, a la izquierda:** en
  `Login.tsx`, el panel de marca ya era left-aligned de punta a punta (sin centrado), así que solo
  hizo falta agrandar el logo (`w-14 h-14`→`w-20 h-20`, `text-3xl`→`text-5xl`) para que su ancho
  visual se acerque a un tercio del panel, sin necesitar ninguna caja/centrado nuevo. Verificado a
  1440px.
