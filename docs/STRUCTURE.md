# Leto Platform — Project Structure

```
Leto/
├── docker-compose.yml              # 5 services: nginx, postgres, backend, frontend, crewing
├── .env                            # Environment variables (not committed)
├── .env.example                    # Template for .env
│
├── nginx/                          # ─── Reverse Proxy (port 3000 → 80) ───
│   ├── Dockerfile
│   └── nginx.conf                  # /→frontend, /api/→backend, /app/→crewing, /crewing-api/→crewing
│
├── backend/                        # ─── FastAPI Backend (internal port 8000) ───
│   ├── Dockerfile
│   └── app/
│       ├── main.py                 # FastAPI entry — docs at /api/docs, /api/redoc
│       ├── core/
│       │   ├── config.py           # Settings (DATABASE_URL, JWT secrets)
│       │   ├── deps.py             # get_current_user dependency (JWT decode)
│       │   └── security.py         # hash_password, verify_password, create_*_token
│       ├── db/
│       │   ├── base.py             # SQLAlchemy Base
│       │   └── session.py          # Engine + SessionLocal
│       ├── models/
│       │   ├── user.py             # User (id, email, hashed_password, role, company_id)
│       │   ├── seafarer.py         # Seafarer (id→FK user, first_name, last_name, rank, dob, ...)
│       │   ├── company.py          # Company (id, name, contact_email)
│       │   └── document.py         # Document model (future use)
│       ├── routers/
│       │   ├── auth.py             # POST /login, POST /register, GET /me (JOINs Seafarer)
│       │   └── documents.py        # Document endpoints (future use)
│       ├── schemas/
│       │   ├── auth.py             # RegisterRequest, LoginRequest, TokenResponse, UserResponse
│       │   └── document.py         # Document schemas
│       └── services/
│           └── mlc_validator.py    # MLC 2006 validation logic (future use)
│
├── frontend/                       # ─── Landing Page (internal port 5173) ───
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── tsconfig.json
│   └── src/
│       ├── main.tsx                # Vite entry point
│       ├── App.tsx                 # React Router: /, /dashboard, /login, /register
│       ├── pages/
│       │   ├── LandingPage.tsx     # Hero, features, CTAs, login/register modals
│       │   ├── Dashboard.tsx       # Full-screen iframe to /app/ (no top navbar)
│       │   ├── Login.tsx           # Redirect wrapper
│       │   └── Register.tsx        # Redirect wrapper
│       ├── components/
│       │   ├── LoginModal.tsx      # Email+password → /api/auth/login → writes leto-user
│       │   ├── RegisterModal.tsx   # 3-step: personal info → rank → documents
│       │   └── ProtectedRoute.tsx  # Zustand auth gate
│       ├── store/
│       │   └── authStore.ts        # Zustand persist → localStorage['leto-auth']
│       └── lib/
│           └── api.ts              # Axios instance → /api/
│
├── docs/                           # ─── Documentation ───
│   ├── AUTH-FLOW.md                # Identity bridge diagram (localStorage sharing)
│   ├── CREWING-MODULE.md           # Full architecture reference + session log
│   ├── STRUCTURE.md                # This file
│   └── sessions/
│       ├── session_2026-03-17.md   # User database backend + My Files overhaul
│       ├── session_2026-03-25.md   # Auth unification + demeter→crewing rename
│       └── session_2026-03-27.md   # My Profile + /me enrichment + UX improvements
│
│
│ ═══════════════════════════════════════════════════════════════════════
│  CREWING MODULE (internal port 8080) — Webpack + Express
│  Served at /app/ via nginx. Based on Stremio Web (GPLv2).
│ ═══════════════════════════════════════════════════════════════════════
│
├── Dockerfile                      # Multi-stage: Node 20 Alpine → pnpm build → Express server
├── package.json                    # "stremio" v5.0.0-beta.30
├── webpack.config.js               # Babel + ts-loader + Less CSS Modules
├── tsconfig.json
├── http_server.js                  # Express production server (static + API mount)
├── apiRoutes.js                    # Express API: /api/users/:id/* CRUD
├── userDataManager.js              # Filesystem ops: read/write JSON, file storage
├── cloudDataManager.js             # Cloud storage adapter (Firestore + GCS)
│
├── User database/                  # ─── Filesystem DB (per-user folders) ───
│   ├── SF-001/                     # Legacy demo user (deprecated)
│   └── f703542f-.../               # demo@leto.com (UUID from PostgreSQL)
│       ├── settings/data.json      #   { rank: "master", preferences: {} }
│       ├── calendar/data.json      #   { availability: [...], confirmedInterviews: [...] }
│       ├── myfiles/                #   { uploads: [...] }
│       │   ├── data.json
│       │   └── uploads/            #   Actual PDF files
│       ├── myexams/data.json       #   { bookedExams: [...] }
│       └── dashboard/data.json     #   { currentContract, rotationHistory, portCalls }
│
├── src/                            # ─── Crewing Module Source ───
│   ├── index.js                    # Webpack entry point
│   │
│   ├── App/
│   │   ├── App.js                  # Root component (router, services, shell)
│   │   ├── routerViewsConfig.js    # Route → Component mapping
│   │   ├── DeepLinkHandler.js
│   │   ├── SearchParamsHandler.js
│   │   └── ShortcutsModal/         # Keyboard shortcuts modal
│   │
│   ├── common/                     # ─── Shared Utilities ───
│   │   ├── apiClient.js            # HTTP client + getUserId() (reads UUID from localStorage)
│   │   ├── routesRegexp.js         # URL patterns for all routes
│   │   ├── crewData.js             # Deterministic mock crew data (name→dept/rank/nationality)
│   │   ├── crewDocData.js          # STCW compliance matrix + 83 IMO courses + getExpiryStatus()
│   │   ├── crewStore.js            # localStorage: pending interviews + custom events
│   │   ├── seafarerStore.js        # localStorage: availability, confirmations, exams
│   │   ├── CONSTANTS.js            # App-wide constants
│   │   ├── interfaceLanguages.json
│   │   ├── languageNames.json
│   │   ├── languages.ts
│   │   ├── screen-sizes.less       # Responsive breakpoints
│   │   ├── animations.less
│   │   └── (hooks)                 # useProfile, useBinaryState, useFullscreen, etc.
│   │
│   ├── components/                 # ─── Reusable UI Components ───
│   │   ├── MainNavBars/            # App shell (horizontal + vertical nav)
│   │   │   └── MainNavBars.tsx     # TABS array defines sidebar navigation
│   │   ├── NavBar/
│   │   │   ├── HorizontalNavBar/   # Top bar (back button, search, user menu)
│   │   │   │   ├── NavMenu/
│   │   │   │   │   ├── NavMenuContent.js  # Seafarer card + logout + nav links
│   │   │   │   │   └── styles.less
│   │   │   │   └── SearchBar/
│   │   │   └── VerticalNavBar/     # Sidebar tab buttons
│   │   │       └── NavTabButton/   # Custom SVG icons (crew-*)
│   │   ├── MetaItem/               # Crew member card (grid view)
│   │   ├── MetaPreview/            # Crew detail panel (right side)
│   │   │   ├── MetaPreview.js      # Full profile: name, age, city, languages, etc.
│   │   │   ├── MetaLinks/          # Tag groups (Languages, Vessels, Companies)
│   │   │   ├── ActionButton/       # Bottom action buttons with crew icons
│   │   │   ├── Ratings/
│   │   │   └── MetaPreviewPlaceholder/
│   │   ├── MetaRow/
│   │   ├── Button/
│   │   ├── Image/
│   │   ├── MultiselectMenu/        # Dropdown select (used in Settings, filters)
│   │   ├── ModalDialog/
│   │   ├── EventModal/             # Book interview modal
│   │   └── (others)                # Checkbox, Toggle, Slider, Popup, etc.
│   │
│   ├── routes/                     # ─── Page Components ───
│   │   ├── index.js                # Route exports
│   │   ├── Board/                  # #/company-dashboard — Home/overview
│   │   ├── Discover/               # #/company-crewdb — Browse & search crew
│   │   ├── Library/                # #/myfiles — Document management
│   │   │   ├── Library.js          #   2-column: doc selector + upload/preview
│   │   │   ├── useDocumentUpload.js#   Upload logic (uses getUserId())
│   │   │   └── styles.less
│   │   ├── Calendar/               # #/company-calendar — Company recruiting
│   │   │   ├── Calendar.tsx
│   │   │   └── calendarData.js
│   │   ├── SeafarerCalendar/       # #/calendar — Seafarer availability
│   │   │   └── SeafarerCalendar.tsx
│   │   ├── SeafarerSchedule/       # #/dashboard — Career timeline
│   │   ├── Addons/                 # #/myexams — STCW exam scheduling
│   │   │   └── Addons.js           #   Default: All Departments
│   │   ├── MyProfile/              # #/my-profile — Editable seafarer profile
│   │   │   ├── MyProfile.js        #   Reuses MetaPreview/MetaLinks/ActionButton
│   │   │   ├── index.js
│   │   │   └── styles.less
│   │   ├── MetaDetails/            # #/crew/{type}/{id} — Crew member detail
│   │   │   ├── MetaDetails.js
│   │   │   ├── VideosList/         #   Documents by category (renamed from Stremio)
│   │   │   │   └── SeasonsBar/     #   Category navigation (renamed)
│   │   │   └── EpisodePicker/      #   Document picker (renamed)
│   │   ├── Settings/               # #/settings — Profile + Preferences
│   │   │   ├── General/            #   User profile section
│   │   │   ├── Interface/          #   Language + keyboard shortcuts toggle
│   │   │   └── Menu/               #   Settings sidebar
│   │   ├── Search/                 # #/search — Crew search
│   │   ├── Intro/                  # #/intro — Redirects to landing page
│   │   ├── NotFound/               # 404
│   │   └── Player/                 # (Stremio legacy — repurposed)
│   │
│   ├── services/                   # ─── App Services ───
│   │   ├── Core/                   # Stremio Core WASM + transport
│   │   ├── KeyboardShortcuts/      # Digit 0-6 tab switching (toggleable)
│   │   ├── Chromecast/
│   │   ├── DragAndDrop/
│   │   ├── Shell/
│   │   └── ServicesContext/
│   │
│   ├── router/                     # ─── Hash Router ───
│   │   ├── Router/                 # Hash-based routing engine
│   │   ├── Route/
│   │   └── Modal/
│   │
│   └── types/                      # TypeScript type definitions
│
├── assets/
│   ├── favicons/                   # App icons
│   ├── flags/                      # Country flag images (nationality badges)
│   ├── images/                     # Profile images, backgrounds
│   └── screenshots/                # PWA screenshots
│
├── onboarding/                     # Legacy onboarding docs
│   └── session_2026-03-25.md       # (also in docs/sessions/)
│
└── tests/
    ├── copyright.spec.js
    ├── i18nScan.test.js
    └── routesRegexp.spec.js
```

---

## Navigation Routes

| Route | Component | Tab | Purpose |
|---|---|---|---|
| `#/company-dashboard` | Board | Dashboard | Home/overview |
| `#/company-crewdb` | Discover | Crew Database | Browse & search crew |
| `#/myfiles` | Library | My Files | Document management |
| `#/company-calendar` | Calendar | Company | Recruiting calendar |
| `#/calendar` | SeafarerCalendar | Seafarer | Availability & docs |
| `#/dashboard` | SeafarerSchedule | My Schedule | Career timeline |
| `#/myexams` | Addons | My Exams | Exam scheduling |
| `#/my-profile` | MyProfile | — | Editable seafarer profile |
| `#/settings` | Settings | Settings | Profile + preferences |
| `#/search` | Search | — | Crew search |
| `#/crew/{type}/{id}` | MetaDetails | — | Crew member detail |
| `#/intro` | Intro | — | Redirects to landing page |

---

## Docker Services

| Service | Image | Internal Port | External Access | Purpose |
|---|---|---|---|---|
| nginx | nginx:alpine | 80 | `localhost:3000` | Reverse proxy, single entry |
| postgres | postgres:15-alpine | 5432 | — | User auth database |
| backend | Python 3.11 + FastAPI | 8000 | `/api/*` | JWT auth + user management |
| frontend | Node 20 + Vite | 5173 | `/` | Landing page + modals |
| crewing | Node 20 + Express | 8080 | `/app/`, `/crewing-api/` | Crewing module |

---

## localStorage Keys

| Key | Written by | Read by | Content |
|---|---|---|---|
| `leto-auth` | Zustand (authStore) | Landing page, MyProfile | `{ state: { user, accessToken, refreshToken } }` |
| `leto-user` | LoginModal / RegisterModal | NavMenuContent, apiClient, MyProfile | `{ id, email, rank, first_name, last_name, date_of_birth }` |
| `leto-profile-extra` | MyProfile | MyProfile | `{ city, experience, languages, vessels, companies, aboutMe }` |
| `leto-keyboard-shortcuts` | Settings/Interface | KeyboardShortcuts.js | `'on'` or `'off'` |
| `pbs_pending_interviews` | crewStore.js | MetaItem, MetaPreview | Crew shortlist |
| `pbs_custom_events` | crewStore.js | Calendar | Company calendar events |
| `pbs_seafarer_availability` | seafarerStore.js | SeafarerCalendar | Availability periods |
| `pbs_confirmed_interviews` | seafarerStore.js | Calendar | Confirmed interview IDs |
| `pbs_booked_exams` | seafarerStore.js | Addons | Booked exams |
| `pbs_crew_uploaded_docs` | useDocumentUpload.js | Library | Uploaded docs (fallback) |
