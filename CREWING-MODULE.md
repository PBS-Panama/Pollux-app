# PBS Crewing Module

## Overview

The PBS Crewing Module is a **maritime crew management application** adapted from the open-source [Stremio Web](https://github.com/nickonometry/stremio-web-shell-linux) codebase (GPLv2). It repurposes the streaming media UI into a dual-platform crew management system with an **Uber-like model**: a **Company side** (recruiting/managing) and a **Seafarer side** (availability/documents).

**Status:** In active development (not yet deployed to production).

**GitHub Repo:** [`RichoX-Hub/Crewingmodule`](https://github.com/RichoX-Hub/Crewingmodule) (private) — tracked as a **git submodule** in `pb-website`.

---

## Position in the PBS Ecosystem

This module lives inside the PBS Digital Ecosystem as a demo application:

```
pb-website (main repo)
  └── products/portal/demo/
        ├── gxlivemarketing/      # GX Blog Builder (deployed)
        ├── Tukutuku/             # Ganga Pack (deployed, git submodule)
        └── Crewing module/       # THIS APP (git submodule → RichoX-Hub/Crewingmodule)
```

> **Submodule setup:** The Crewing module is a git submodule in pb-website. The original git remote was `Stremio/stremio-web.git` (upstream base); it was changed to `RichoX-Hub/Crewingmodule.git` on 2026-03-14. The local branch `development` is pushed as `main` on the new repo.

When ready for production, this will follow the standard **Modular Demo Pattern**:
1. Develop locally with `pnpm start` (webpack dev server, HTTPS, port 8080)
2. Docker build & test locally
3. Deploy to Cloud Run as an independent service
4. Add a card in the Demo Gallery (`DemoApp.jsx`) pointing to the Cloud Run URL
5. Redeploy `pb-website` shell

**GCP Target:**
| Key | Value |
|-----|-------|
| Project ID | `durable-sky-484422-b5` |
| Region | `us-central1` |
| Registry | `us-central1-docker.pkg.dev/durable-sky-484422-b5/pbs-registry` |
| Future service name | `crewing-module` (TBD) |

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
Crewing module/
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
# Stage 3: server — Express.js only (pnpm i express@4)
# Final: Copy http_server.js + node_modules + build/ → EXPOSE 8080
```

The `http_server.js` serves the `build/` directory as static files with cache headers:
- `index.html`: 2-hour cache
- All other assets: ~1 month cache
- SPA fallback: 404 page (all routing is hash-based `#/route`, so no server-side routing needed)

### Build & Run (Local)

```bash
# Development (hot reload, HTTPS)
cd "products/portal/demo/Crewing module"
pnpm install
pnpm start
# Opens at https://localhost:8080

# Production build
pnpm build
# Output in ./build/

# Docker build & run
docker build -t crewing-module:local .
docker run -d --name crewing-module -p 8080:8080 crewing-module:local
```

### Future Cloud Run Deployment

```bash
PROJECT_ID=durable-sky-484422-b5
REGION=us-central1
REGISTRY=${REGION}-docker.pkg.dev/${PROJECT_ID}/pbs-registry

# Build & push
docker build -t ${REGISTRY}/crewing-module:latest .
docker push ${REGISTRY}/crewing-module:latest

# Deploy
gcloud run deploy crewing-module \
  --image ${REGISTRY}/crewing-module:latest \
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

## Stremio-to-Crewing Mapping

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
docker build -t crewing-module:local .

# Run on port 4000
docker rm -f crewing-module 2>/dev/null
docker run -d --name crewing-module -p 4000:8080 crewing-module:local

# View at http://localhost:4000

# Check logs
docker logs crewing-module

# Rebuild after edits (full cycle)
docker build -t crewing-module:local . && docker rm -f crewing-module && docker run -d --name crewing-module -p 4000:8080 crewing-module:local
```

### Saved Docker Tags

| Tag | Date | Description |
|-----|------|-------------|
| `crewing-module:v0.1-baseline` | 2026-03-13 | First working Docker build — all 8 sidebar tabs, crew data, calendars, transport null-guard fix |
| `crewing-module:v0.2-routes-renamed` | 2026-03-14 | All routes renamed from Stremio patterns to PBS Crewing paths (18 files updated, zero old routes remaining) |
| `crewing-module:v0.3-full-features` | 2026-03-14 | Full PBS features: crew cards, pending interviews, book interview modal, Company & Seafarer calendars, synced add-to-list, confirmed interview badges, SeafarerSchedule |

### Docker Container Quick Start (Current)

```bash
# The current working container uses port 8088:
docker run -d --name crewing -p 8088:8080 crewing-module:latest
# View at http://localhost:8088
```

### Fixes Applied for Docker Builds

1. **`webpack.config.js`** — `git rev-parse HEAD` wrapped in try/catch with `'build'` fallback (`.dockerignore` excludes `.git`)
2. **`src/App/App.js`** — `onWindowFocus` guarded against null `services.core.transport` (Core WASM errors on init, transport becomes null, focus event would crash)

### Webpack Dev Server (Local)

```bash
# pnpm is not in bash PATH on this machine — use npx:
cd "products/portal/demo/Crewing module"
npx pnpm start
# Opens at https://localhost:8080 (self-signed cert, accept warning)
# If port 8080 is taken, webpack picks next available port
```

---

## Git & Version Control

### Repository Setup (2026-03-14)

The Crewing module was originally a direct clone of `Stremio/stremio-web.git`. It has been migrated:

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

# After making changes in Crewing module:
cd "products/portal/demo/Crewing module"
git add -A && git commit -m "description"
git push origin development:main

# Then update the submodule reference in pb-website:
cd ../../../..  # back to pb-website root
git add "products/portal/demo/Crewing module"
git commit -m "Update Crewing Module submodule"
```

---

## Vite Dev Server (Experimental)

A `vite.config.js` exists with 7 custom plugins for CJS/Less/JSX interop with Vite 8. Current status:

- **Transforms work:** CJS→ESM, JSX-in-JS, Less CSS Modules all resolve correctly
- **Blocking issue:** Stremio Core WASM worker cannot load (gets HTML fallback), causing `Unexpected token '<'`. The app never reaches `initialized = true` because the Core transport promise hangs forever.
- **Not yet resolved** — Docker/webpack is the working dev path for now

---

## Session Log

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
- [ ] Backend API for persistent data (replace localStorage)
- [ ] Authentication (company vs seafarer login)
- [ ] Deploy to Cloud Run as independent service
- [ ] Add card to Demo Gallery (`DemoApp.jsx`)
- [ ] Integration with Neptune ERP for vessel/fleet data
