# Leto Crewing Module — Maritime Crew Management

> **Renaming note (2026-03-25):** Este módulo fue llamado "DEMETER" hasta esta fecha. Ahora corre como servicio `crewing` dentro del Docker Compose unificado de Leto. Comandos Docker anteriores a esta fecha están desactualizados.

## Overview

El **Crewing Module** es una aplicación de gestión de tripulación marítima adaptada del código open-source [Stremio Web](https://github.com/nickonometry/stremio-web-shell-linux) (GPLv2). Convierte la UI de streaming en un sistema dual: **Company side** (reclutamiento/gestión) y **Seafarer side** (disponibilidad/documentos).

**Status:** En desarrollo activo. Integrado en la plataforma Leto vía Docker Compose (5 containers).

**Acceso:** `http://localhost:3000/app/` (via Nginx reverse proxy)

**GitHub Repo:** [`RichoX-Hub/Crewingmodule`](https://github.com/RichoX-Hub/Crewingmodule) (private)

---

## Posición en el ecosistema Leto

El crewing module corre como uno de los 5 servicios del Docker Compose unificado de Leto:

```
localhost:3000 (Nginx)
  /             → frontend  (Landing Page — React/Vite)
  /api/         → backend   (FastAPI — JWT auth + PostgreSQL)
  /app/         → crewing   (Este módulo — React/Webpack + Express)
  /crewing-api/ → crewing   (Express API — User Database filesystem)
```

**Path local:** `c:/Riki/products/portal/demo/Leto/`

**Dockerfile:** `Leto/Dockerfile` — multi-stage build, output en `/app/build/`

**GCP Target (pendiente):**
| Key | Value |
|-----|-------|
| Project ID | `durable-sky-484422-b5` |
| Region | `us-central1` |
| Registry | `us-central1-docker.pkg.dev/durable-sky-484422-b5/pbs-registry` |
| Service name | `leto-crewing` (propuesto) |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 |
| Bundler | Webpack 5 |
| Language | JavaScript (CJS) + TypeScript (`.tsx` routes) |
| Styling | Less + CSS Modules (hashed class names: `[local]-[hash:base64:5]`) |
| Package manager | pnpm |
| Node version | 20 (Alpine in Docker) |
| Dev server | webpack-dev-server (HTTPS, port 8080) |
| Production server | Express.js (`http_server.js`, port 8080) |

### Key Conventions

- **CJS everywhere:** `require()` / `module.exports` — NOT ESM `import/export`
- **Export compatibility:** Routes that use `.tsx` must export as `module.exports.default = Component` because `routes/index.js` uses `require('./X').default`
- **Webpack aliases:** `stremio` → `./src/`, `stremio-router` → `./src/router/`
- **CSS Modules with Less:** All `.less` files produce scoped class names. Child selectors must be nested inside their parent class to work
- **TypeScript:** Used only for route components (`.tsx`). Config: `tsconfig.json` with `jsx: "react"`, `baseUrl: "./src"`, `paths: { "stremio/*": ["*"] }`

---

## Project Structure

```
Demeter/
├── package.json              # "stremio" v5.0.0-beta.30
├── pnpm-lock.yaml
├── webpack.config.js         # Multi-stage: JS (babel) + TS (ts-loader) + Less (CSS Modules)
├── tsconfig.json             # React JSX, path aliases
├── Dockerfile                # Node 20 Alpine, pnpm build, Express server on :8080
├── http_server.js            # Production Express server (static + SPA fallback)
├── manifest.json             # PWA manifest (from Stremio)
├── eslint.config.mjs         # ESLint 9 flat config
│
├── assets/
│   ├── favicons/             # App icons
│   ├── flags/                # Country flag images (used for nationality badges)
│   ├── images/               # Profile images, backgrounds
│   └── screenshots/          # PWA screenshots
│
├── src/
│   ├── index.js              # App entry point
│   ├── index.html            # HTML template (HtmlWebpackPlugin)
│   │
│   ├── App/
│   │   ├── App.js            # Root component (router, shell)
│   │   └── routerViewsConfig.js  # Route → Component mapping
│   │
│   ├── common/               # Shared utilities
│   │   ├── routesRegexp.js   # URL patterns for all routes
│   │   ├── crewData.js       # Deterministic mock data (name → dept/rank/nationality)
│   │   ├── crewDocData.js    # Mock document/certificate data
│   │   ├── crewStore.js      # localStorage: pending interviews + custom events
│   │   ├── seafarerStore.js  # localStorage: availability, confirmations, exams
│   │   ├── CONSTANTS.js      # App-wide constants
│   │   └── ...               # Other shared utils (Toast, Shortcuts, etc.)
│   │
│   ├── components/           # Reusable UI components
│   │   ├── MainNavBars/      # App shell (horizontal + vertical nav)
│   │   │   └── MainNavBars.tsx  # TABS array defines sidebar navigation
│   │   ├── NavBar/
│   │   │   └── VerticalNavBar/
│   │   │       └── NavTabButton/
│   │   │           └── NavTabButton.js  # Custom SVG icons (crew-*)
│   │   ├── MetaItem/         # Crew member card (grid view)
│   │   │   └── MetaItem.js   # Profile card with overlay, nationality, add-to-list
│   │   ├── MetaPreview/      # Crew detail panel (right side)
│   │   │   ├── MetaPreview.js     # Full profile view with action buttons
│   │   │   └── ActionButton/      # Custom crew action icons
│   │   └── ...               # Button, Image, Multiselect, etc.
│   │
│   └── routes/               # Page components (one per sidebar tab)
│       ├── index.js          # Route exports
│       ├── Board/            # Dashboard (home)
│       ├── Discover/         # Crew Database (browse/search crew)
│       ├── Library/          # My Files
│       ├── Calendar/         # Company Calendar (recruiting)
│       │   ├── Calendar.tsx
│       │   ├── Calendar.less
│       │   └── calendarData.js
│       ├── SeafarerCalendar/ # Seafarer Calendar (availability/docs)
│       │   ├── SeafarerCalendar.tsx
│       │   ├── SeafarerCalendar.less
│       │   ├── seafarerData.js
│       │   └── index.ts
│       ├── SeafarerSchedule/  # Seafarer Schedule (career timeline)
│       │   ├── SeafarerSchedule.js
│       │   ├── styles.less
│       │   ├── scheduleData.js
│       │   └── index.js
│       ├── Addons/           # My Exams
│       ├── Settings/         # Settings
│       ├── MetaDetails/      # Crew member detail page
│       ├── Search/           # Search
│       ├── Player/           # (inherited from Stremio, replaced by SeafarerSchedule)
│       ├── Intro/            # Intro/onboarding
│       └── NotFound/         # 404
│
└── tests/                    # Jest tests
```

---

## Navigation & Routes

The sidebar is defined in `MainNavBars.tsx` as a TABS array. Each tab maps to a route via `routesRegexp.js` and `routerViewsConfig.js`.

| Tab | Route | Icon | Component | Purpose |
|-----|-------|------|-----------|---------|
| Dashboard | `#/company-dashboard` | `crew-dashboard` | Board | Home/overview |
| Crew Database | `#/company-crewdb` | `crew-person` | Discover | Browse & search crew members |
| My Files | `#/myfiles` | `crew-folder` | Library | Document management |
| Company | `#/company-calendar` | `crew-calendar` | Calendar | Company recruiting calendar |
| Seafarer | `#/calendar` | `crew-anchor` | SeafarerCalendar | Seafarer availability & docs |
| My Schedule | `#/dashboard` | `crew-ship` | SeafarerSchedule | Career timeline & assignments |
| My Exams | `#/myexams` | `crew-exam` | Addons | Exam scheduling |
| Settings | `#/settings` | `crew-settings` | Settings | App settings |

All sidebar icons are custom inline SVGs defined in `NavTabButton.js` (prefixed `crew-*`), not from the Stremio icon font.

---

## Dual Platform Concept

### Company Side (Recruiting)
- **Crew Database** (`/company-crewdb`): Browse crew profiles with cards showing photo, department, rank, nationality flag
- **Add to List**: Toggle button on both card and detail panel (synced via CustomEvent `pbs-pending-changed`)
- **Company Calendar** (`/company-calendar`):
  - Monthly calendar with event categories (crew-change, training, recruiting, etc.)
  - Pending Interviews glass card (frosted glass sidebar)
  - Book Interview modal (crew summary, day/time picker, location dropdown, notes)
  - CRUD for custom events
  - Green "Confirmed" badge on interview events when seafarer confirms attendance

### Seafarer Side (Employee)
- **Seafarer Calendar** (`/calendar`):
  - Availability period picker (embarking / days-off / available) — like flight booking date ranges
  - Controls backend logic for profile visibility in the market
  - Interview confirmations: when company books interview, it appears here with "Confirm Attendance" button
  - Confirmation reflects as green check on company calendar (via CustomEvent `pbs-interview-confirmed`)
  - Certificate/document expiry alerts (30-day and on-date warnings)
  - Booked exams auto-populate from exam system

---

## Data Architecture

All data is currently stored in **localStorage** (no backend yet). Cross-component sync uses `window.dispatchEvent(new CustomEvent(...))`.

### localStorage Keys

| Key | Store File | Purpose |
|-----|-----------|---------|
| `pbs_pending_interviews` | `crewStore.js` | Crew members added to interview shortlist |
| `pbs_custom_events` | `crewStore.js` | Company calendar events (interviews, custom) |
| `pbs_seafarer_availability` | `seafarerStore.js` | Availability periods (embarking/off/available) |
| `pbs_confirmed_interviews` | `seafarerStore.js` | Interview IDs confirmed by seafarer |
| `pbs_booked_exams` | `seafarerStore.js` | Booked exam entries |

### Cross-Component Events

| Event Name | Dispatched By | Listened By | Payload |
|------------|--------------|-------------|---------|
| `pbs-pending-changed` | `crewStore.togglePendingInterview()` | MetaItem, MetaPreview | `{ id, added }` |
| `pbs-interview-confirmed` | SeafarerCalendar | Calendar | `{ eventId }` |

### Mock Data Sources

| File | Data |
|------|------|
| `crewData.js` | Deterministic crew profiles (name → department, rank, nationality) via hash functions |
| `crewDocData.js` | Mock documents and certificates |
| `calendarData.js` | Mock company events, month constants, categories |
| `seafarerData.js` | Availability types, certificate expiry dates, default periods |

---

## Docker Configuration

### Dockerfile (3-stage build)

```dockerfile
# Stage 1: base — Node 20 Alpine + pnpm + git
# Stage 2: app — pnpm install + webpack build → /build/
# Stage 3: server — Express.js + multer + pdf-lib (pnpm i express@4 multer@1 pdf-lib@1)
# Final: Copy http_server.js + apiRoutes.js + userDataManager.js + node_modules + build/
```

El `http_server.js` sirve el `build/` como estático y monta el Express API en `/api/`.

### Build & Run (Leto — forma correcta desde 2026-03-25)

```bash
# Desde la raíz de Leto:
cd "c:/Riki/products/portal/demo/Leto"

# Rebuild solo el crewing module
docker compose up --build -d crewing

# Rebuild todo el stack
docker compose up --build -d

# Ver logs
docker logs leto-crewing-1 -f

# Acceso
http://localhost:3000/app/
```

> ⚠️ Los comandos `docker build -t demeter:*` y `docker run -p 8088:8080` de sesiones anteriores ya no aplican. Todo corre via `docker compose` desde la raíz de Leto.

### Future Cloud Run Deployment

```bash
PROJECT_ID=durable-sky-484422-b5
REGION=us-central1
REGISTRY=${REGION}-docker.pkg.dev/${PROJECT_ID}/pbs-registry

# Build & push
docker build -t ${REGISTRY}/demeter:latest .
docker push ${REGISTRY}/demeter:latest

# Deploy
gcloud run deploy demeter \
  --image ${REGISTRY}/demeter:latest \
  --port 8080 \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 256Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 3
```

No environment variables needed — all data is client-side (localStorage). When a backend is added, env vars for API URLs and auth will be required.

---

## Webpack Configuration

Key webpack settings in `webpack.config.js`:

| Setting | Value |
|---------|-------|
| Entry | `./src/index.js` + worker |
| Output | `./build/` with commit hash in paths |
| JS loader | Babel (`@babel/preset-env` + `@babel/preset-react`) |
| TS loader | `ts-loader` with `happyPackMode` |
| CSS | Less → PostCSS (cssnano) → CSS Modules (`[local]-[hash:base64:5]`) |
| Assets | Fonts (`.ttf`), images (`.png/.jpg/.svg`), WASM |
| Dev server | HTTPS, host `0.0.0.0`, no HMR |
| Optimization | Terser (ES5, mangle, no comments) |
| Aliases | `stremio` → `src/`, `stremio-router` → `src/router/` |
| Plugins | ProgressPlugin, EnvironmentPlugin, WorkboxPlugin (SW), CopyWebpackPlugin |

---

## Stremio-to-DEMETER Mapping

The original Stremio concepts were mapped to maritime crew management:

| Stremio Concept | Crewing Equivalent | Side |
|----------------|-------------------|------|
| Movies/Series catalog (Discover) | Main Dashboard | Company |
| Media poster cards | Crew member profile search | Company |
| "Continue Watching" | Pending Interviews shortlist | Company |
| Board (home) | Main Dashboard | Seafarer |
| Library | My Files (documents) | Seafarer |
| Addons | My Exams | Seafarer |
| Calendar | Company Schedule | Company |
| Player | Seafarer Schedule | Seafarer |
| MetaDetails | Crew member full profile | Seafarer |
| Search | Crew search | Both |

### Retained Stremio Dependencies

| Package | Purpose | Still Used? |
|---------|---------|------------|
| `@stremio/stremio-core-web` | Core WASM + worker | Yes (runtime) |
| `@stremio/stremio-colors` | Color variables (Less) | Yes (theming) |
| `@stremio/stremio-icons` | Icon font | Partially (some icons replaced with custom SVGs) |
| `@stremio/stremio-video` | Video player | No (Player route repurposed as Seafarer Schedule) |

---

## Development Notes

### Adding a New Route

1. Create route folder: `src/routes/NewRoute/`
   - `NewRoute.tsx` — component (use `module.exports.default = NewRoute`)
   - `NewRoute.less` — styles
   - `index.ts` — CJS export: `module.exports = require('./NewRoute'); module.exports.default = module.exports.default || module.exports;`
2. Add regexp in `src/common/routesRegexp.js`
3. Add import + export in `src/routes/index.js`
4. Add to view group in `src/App/routerViewsConfig.js`
5. Add tab in `src/components/MainNavBars/MainNavBars.tsx` (TABS array)
6. Add custom icon SVG in `NavTabButton.js` (if using `crew-*` prefix)

### CSS Modules Gotchas

- Class names are hashed at build time — always use `styles['class-name']` syntax
- Child selectors MUST be nested inside their parent class in the `.less` file
- Use `classnames` library for conditional classes
- Global styles (like `selected`) need `:global(.selected)` or be applied via DOM directly

### Cross-Component State Pattern

For features that span multiple components (e.g., "Add to List" on both card and detail panel):
1. Store state in localStorage via a shared store (`crewStore.js`)
2. Dispatch `CustomEvent` when state changes
3. Each component listens with `useEffect` + `addEventListener`
4. Components also check state on mount via store function

---

## Local Docker Development

### Quick Reference

```bash
# Build image
docker build -t demeter:latest .

# Run on port 8088
docker rm -f demeter 2>/dev/null
docker run -d --name demeter -p 8088:8080 demeter:latest

# View at http://localhost:8088

# Check logs
docker logs demeter

# Rebuild after edits (full cycle)
docker build -t demeter:latest . && docker rm -f demeter && docker run -d --name demeter -p 8088:8080 demeter:latest
```

### Saved Docker Tags

| Tag | Date | Description |
|-----|------|-------------|
| `crewing-module:v0.1-baseline` | 2026-03-13 | First working Docker build — all 8 sidebar tabs, crew data, calendars, transport null-guard fix |
| `crewing-module:v0.2-routes-renamed` | 2026-03-14 | All routes renamed from Stremio patterns to PBS Crewing paths (18 files updated, zero old routes remaining) |
| `crewing-module:v0.3-full-features` | 2026-03-14 | Full PBS features: crew cards, pending interviews, book interview modal, Company & Seafarer calendars, synced add-to-list, confirmed interview badges, SeafarerSchedule |
| `crewing-module:v0.4-user-database` | 2026-03-17 | User Database backend, My Files page with file upload/preview/rotate, IMO catalog (83 courses), Stremio→Maritime terminology renaming |

> **Note:** Tags above use the old `crewing-module` naming. New builds should use `demeter:*` tags.

### Active Container (as of 2026-03-17)

| Container | Image | Port | URL |
|-----------|-------|------|-----|
| `demeter` | `demeter:latest` | 8088:8080 | http://localhost:8088 |

> **Note:** Only one container should exist. Renamed from `crewing` → `demeter` as of 2026-03-17.

### Fixes Applied for Docker Builds

1. **`webpack.config.js`** — `git rev-parse HEAD` wrapped in try/catch with `'build'` fallback (`.dockerignore` excludes `.git`)
2. **`src/App/App.js`** — `onWindowFocus` guarded against null `services.core.transport` (Core WASM errors on init, transport becomes null, focus event would crash)

### Webpack Dev Server (Local)

```bash
# pnpm is not in bash PATH on this machine — use npx:
cd "products/portal/demo/Demeter"
npx pnpm start
# Opens at https://localhost:8080 (self-signed cert, accept warning)
# If port 8080 is taken, webpack picks next available port
```

---

## Git & Version Control

### Repository Setup (2026-03-14)

DEMETER was originally a direct clone of `Stremio/stremio-web.git`. It has been migrated:

1. **New GitHub repo:** [`RichoX-Hub/Crewingmodule`](https://github.com/RichoX-Hub/Crewingmodule) (private)
2. **Remote updated:** `origin` changed from `Stremio/stremio-web.git` → `RichoX-Hub/Crewingmodule.git`
3. **Branch mapping:** Local `development` branch pushed as `main` on GitHub
4. **Submodule in pb-website:** Added via `git submodule add -b main` — committed as `6ced179` in pb-website
5. **All PBS customizations committed:** 91 files, 7939 insertions (commit `ee7248e6d` in Crewingmodule)

### Working with the Submodule

```bash
# Clone pb-website with submodules
git clone --recurse-submodules https://github.com/RichoX-Hub/pbtradingsolutions.com.git

# If already cloned without submodules
git submodule update --init --recursive

# After making changes in DEMETER:
cd "products/portal/demo/Demeter"
git add -A && git commit -m "description"
git push origin development:main

# Then update the submodule reference in pb-website:
cd ../../../..  # back to pb-website root
git add "products/portal/demo/Demeter"
git commit -m "Update DEMETER submodule"
```

---

## Vite Dev Server (Experimental)

A `vite.config.js` exists with 7 custom plugins for CJS/Less/JSX interop with Vite 8. Current status:

- **Transforms work:** CJS→ESM, JSX-in-JS, Less CSS Modules all resolve correctly
- **Blocking issue:** Stremio Core WASM worker cannot load (gets HTML fallback), causing `Unexpected token '<'`. The app never reaches `initialized = true` because the Core transport promise hangs forever.
- **Not yet resolved** — Docker/webpack is the working dev path for now

---

## Session Log

### 2026-03-29 — Role-based UI, Company dashboard, Fleet management

See [sessions/session_2026-03-29.md](sessions/session_2026-03-29.md) para el log completo.

**Resumen:** UI role-aware completa. Sidebar muestra tabs diferentes para seafarer vs company. Board renderiza CompanyHome para empresas (fleet overview + quick actions). MyProfile renderiza CompanyProfile para empresas (info empresa + fleet panel con inline add vessel). Endpoint POST vessels. LoginModal sin toggle de rol. Vessel type icons con colores únicos.

### 2026-03-28 — Company registration, Stremio→Leto rename, landing page overhaul

See [sessions/session_2026-03-28.md](sessions/session_2026-03-28.md) para el log completo.

**Resumen:** Stremio→Leto alias rename (~150 archivos). Landing page UX: nav action-based, "Tripulante" naming, single hero CTA. Company registration flow completo (4 pasos): info empresa + RUC/sector, representantes con checkboxes, flota dinámica con vessel cards, resumen con editar. Backend: Company model expandido (+12 cols), Vessel table nueva, register endpoint acepta vessels. DarkSelect custom dropdown. Modal scroll lock. DATABASE.md + NAMING-CONVENTION.md + index2.html prototype.

### 2026-03-27 — My Profile + /me enrichment + UX improvements

See [sessions/session_2026-03-27.md](sessions/session_2026-03-27.md) para el log completo.

**Resumen:** Nueva ruta `/my-profile` con perfil editable del marino (reutiliza MetaPreview/MetaLinks/ActionButton para consistencia visual con crew database). Panel derecho muestra documentos requeridos por rango STCW con status VALID/MISSING/EXPIRING. Endpoint `/me` enriquecido con rank, first_name, last_name, date_of_birth desde tabla Seafarer. LoginModal simplificado (sin fetch extra a crewing-api). Keyboard shortcuts toggle en Settings. My Exams default a "All Departments". Guard de cambios sin guardar con modal blur.

### 2026-03-25 — Leto Integration + Auth Unification + UUID Migration

See [sessions/session_2026-03-25.md](sessions/session_2026-03-25.md) para el log completo.

**Resumen:** Integración completa del crewing module dentro de la plataforma Leto (Docker Compose unificado, 5 containers). Renombramiento demeter→crewing, eliminación de Redis, fix de rutas `/demeter-api/`→`/crewing-api/`. Unificación de autenticación via `localStorage['leto-user']`: el marino que hace login en la landing page aparece automáticamente con su nombre y rank en el NavMenu del crewing module. SF-001 reemplazado por UUID real de PostgreSQL. Dashboard full-screen sin navbar duplicado. NavMenu relabeled: "Mis Documentos", "Ver perfil completo", "Mis Entrenamientos". FastAPI Swagger accesible en `/api/docs`.

### 2026-03-17 — User Database Backend + My Files Overhaul + Stremio→Maritime Renaming

See [sessions/session_2026-03-17.md](sessions/session_2026-03-17.md) for full details.

**Summary:** Built the entire User Database backend (Express API + filesystem persistence), redesigned the My Files page with 2-column layout, searchable document list, IMO catalog (83 courses), file upload with staging/save workflow, PDF preview with rotate/edit modal, and renamed all Stremio terminology (season→category, video→document, episode→docIndex) to maritime concepts.

### 2026-03-16 — Docker Cleanup

- Removed duplicate container `crewing-module` (port 4000, image `crewing-module:local`)
- Removed image `crewing-module:local`
- Standardized on single container: `crewing` (port 8088, image `crewing-module:latest`)

### 2026-03-14 — Git Migration & Docker Rebuild

- Discovered running Docker container was using **old Stremio base image** (no PBS code)
- Rebuilt Docker image from current local source — confirmed all PBS features present
- Tagged as `crewing-module:v0.3-full-features`
- Created GitHub repo `RichoX-Hub/Crewingmodule` (private)
- Changed git remote from `Stremio/stremio-web.git` to `RichoX-Hub/Crewingmodule.git`
- Committed all 91 PBS-modified files (7939 insertions)
- Pushed `development` → `main` on new repo
- Added as git submodule in pb-website (commit `6ced179`)
- Container running on **http://localhost:8088/** (port 8088:8080)

---

## Future Plans

- [ ] Separate Company and Seafarer layouts (different sidebar tabs per role)
- [x] Backend API for persistent data (replace localStorage) — **Done 2026-03-17**
- [x] Authentication — JWT via FastAPI + UUID bridge via localStorage — **Done 2026-03-25**
- [x] Login de Stremio reemplazado por redirect a landing page — **Done 2026-03-25**
- [x] Identidad real en NavMenu (seafarer card con nombre + rank) — **Done 2026-03-25**
- [x] Aislamiento por UUID (cada usuario tiene su carpeta propia) — **Done 2026-03-25**
- [x] Ruta `/my-profile` — perfil editable del marino con docs requeridos — **Done 2026-03-27**
- [x] Endpoint `/me` enriquecido (rank, name, dob desde Seafarer) — **Done 2026-03-27**
- [x] "All Documents" como categoría default en crew detail + my profile — **Done 2026-03-27**
- [x] Keyboard shortcuts toggle en Settings — **Done 2026-03-27**
- [x] Fix login loop (Zustand hydration race) — **Done 2026-03-27**
- [x] Fix spacing en My Profile (flex:1 on profile panel) — **Done 2026-03-28**
- [x] Stremio→Leto alias rename (~150 archivos) — **Done 2026-03-28**
- [x] Company registration flow (4 steps) + Vessel model — **Done 2026-03-28**
- [x] DarkSelect custom dropdown (replace native select) — **Done 2026-03-28**
- [x] Landing page: action-based nav, "Tripulante" naming, single CTA — **Done 2026-03-28**
- [x] Modal form persistence + scroll lock — **Done 2026-03-28**
- [x] Company-specific post-login dashboard (CompanyHome) — **Done 2026-03-29**
- [x] Role-based sidebar tabs (company vs seafarer) — **Done 2026-03-29**
- [x] CompanyProfile with fleet management — **Done 2026-03-29**
- [x] POST /api/companies/{id}/vessels endpoint — **Done 2026-03-29**
- [x] LoginModal role toggle removed (auto-detect) — **Done 2026-03-29**
- [ ] Custom SVG vessel type icons (replace emoji with nav-style SVGs)
- [ ] Dashboard fleet cards with full vessel data
- [ ] Wire MetaDetails crew profile to read from User Database (instead of mock hash data)
- [ ] My Files: connect uploaded docs to SeafarerCalendar expiry alerts
- [ ] My Files: connect to My Exams for renewal suggestions
- [ ] Assignments table (seafarer ↔ vessel linking)
- [ ] CSV import for vessels (bulk fleet registration)
- [ ] IMO number validation against public registries
- [ ] Deploy to Cloud Run as parte del stack Leto completo
- [ ] Integration with Neptune ERP for vessel/fleet data
