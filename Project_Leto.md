# Project Leto — Master Project Document

**Owner:** Rick  
**Workspace:** `portal/pbsds-leto-app/` (clean, structured monorepo — pre-split state)  
**Source reference:** `portal/demo/Leto/` (legacy — `IDM/src/` migration complete, safe to retire)  
**Last updated:** 2026-06-10  
**Status:** 🟢 Active Development — Sprint 7 complete; brand split to Leto + Cástor underway

> **🎭 ECOSYSTEM BRAND SPLIT (set 2026-06-10):**
> The product is splitting into **two distinct brands** within the same PBS ecosystem, sharing one backend:
> - **Leto** → Company-facing app (B2B). `interfaces/leto/` — was `interfaces/leto/`.
> - **Cástor** → Seafarer-facing app (B2C). `interfaces/castor/` — was `interfaces/castor/`.
> - **Admin** → internal panel (no public brand). Lives inside `landing/` for now.
>
> **Why:** separar mercados (B2B vs B2C) para optimizar SEO, marketing y mensaje por audiencia. Cada marca → su propio dominio y landing page eventualmente.
>
> **Brand vs. Persona:** "Castor" / "Leto" are the public **brand names**. In code and API the user **role** stays `seafarer` / `company` (that's the professional persona, not the brand). Don't conflate the two — refactoring `role === 'seafarer'` to `role === 'castor'` would break the JWT/DB schema.
>
> **Folder split (current hybrid state):**
> - **Now (done):** internal rename `interfaces/castor/` → `interfaces/castor/`, `interfaces/leto/` → `interfaces/leto/`. Docker services + nginx upstreams updated.
> - **Later (deferred to after User panel Phase 5):** physical split to sibling folders `portal/pbsds-leto-app/` (Company only) + `portal/pbsds-castor-app/` (Seafarer only), each with its own docker-compose and eventually its own repo + domain.

> **📌 Development Priority Order (set 2026-06-10):**
> 1. **Cástor app** (`interfaces/castor/`) — current focus. Was "User panel". All UI/UX work here first.
> 2. **Leto app** (`interfaces/leto/`) — second pass. Was "Company panel". Mirror Cástor architecture.
> 3. **Admin panel** (inside `landing/`) — last. Polish + standalone build decision deferred.

---

## 1. Goal

Replace the current monolithic Leto demo with a clean, three-interface architecture:

```
                    ┌──────────────────────────┐
                    │      Landing Page        │
                    │  (single entry point)    │
                    └────────────┬─────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
       ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
       │    Admin    │    │    User     │    │   Company   │
       │  interface  │    │  interface  │    │  interface  │
       └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
              │                  │                  │
              └──────────────────┼──────────────────┘
                                 ▼
                       ┌──────────────────┐
                       │   Shared data    │
                       │     layer        │
                       │ (sync between    │
                       │   interfaces)    │
                       └──────────────────┘
```

**Hard requirements:**
- One landing page that links out to all three interfaces.
- The three interfaces are **independent** (independent codebases / build / deploy).
- The three interfaces **can communicate / sync data** between each other via the shared backend.

---

## 2. Current Folder Structure (LOCKED — scaffolded 2026-05-27)

```
pbsds-leto-app/
├── README.md
├── Project_Leto.md                  ← this file
├── docker-compose.yml               ← orchestrates the whole stack locally
├── .env
├── .gitignore
├── .dockerignore
├── .nvmrc
│
├── landing/                         ← Vite + React + TS + Tailwind
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── App.tsx                  ← BrowserRouter: /, /dashboard, /admin/*
│       ├── components/
│       │   ├── AdminGuard.tsx       ← protects /admin/* (role=admin only)
│       │   ├── ProtectedRoute.tsx   ← protects /dashboard (any auth)
│       │   ├── LoginModal.tsx
│       │   └── RegisterModal.tsx
│       ├── pages/
│       │   ├── LandingPage.tsx
│       │   ├── Dashboard.tsx        ← iframe → /app/ or /company/ based on role
│       │   ├── Login.tsx
│       │   ├── Register.tsx
│       │   └── admin/               ← 11 admin sections (ALL BUILT & WIRED)
│       │       ├── AdminShell.tsx   ← sidebar layout + nav
│       │       ├── AdminOverview.tsx
│       │       ├── AdminSeafarers.tsx
│       │       ├── AdminSeafarerDetail.tsx
│       │       ├── AdminDocuments.tsx
│       │       ├── AdminCompliance.tsx
│       │       ├── AdminExams.tsx
│       │       ├── AdminCompanies.tsx
│       │       ├── AdminRelationships.tsx
│       │       ├── AdminLearning.tsx   ← Learning Record CMS (86 series loaded)
│       │       ├── AdminConfig.tsx
│       │       └── AdminAnalytics.tsx
│       ├── lib/api.ts
│       └── store/authStore.ts
│
├── interfaces/
│   ├── castor/                      ← 🌟 Cástor — Seafarer-facing brand (B2C)
│   │   └── src/                       (was: interfaces/user/ — renamed 2026-06-10)
│   │       ├── App/
│   │       │   ├── routerViewsConfig.js   ← MyProfile + Compliance wired ✅
│   │       │   └── withProtectedRoutes.js
│   │       ├── common/
│   │       │   └── routesRegexp.js        ← myprofile + compliance routes ✅
│   │       └── routes/
│   │           ├── index.js               ← MyProfile + Compliance exported ✅
│   │           ├── MyProfile/             ← 1138-line profile editor (BUILT)
│   │           ├── Compliance/            ← document compliance checker (BUILT)
│   │           ├── Addons/                ← #/myexams — Learning Record viewer
│   │           ├── Board/                 ← #/company-dashboard (unused in castor)
│   │           ├── Calendar/              ← #/company-calendar (unused in castor)
│   │           ├── SeafarerCalendar/      ← #/calendar
│   │           ├── SeafarerSchedule/      ← #/dashboard (My Schedule)
│   │           ├── Discover/              ← #/company-crewdb (unused in castor)
│   │           ├── Library/               ← #/myfiles
│   │           ├── MetaDetails/           ← course/doc detail view
│   │           ├── Search/
│   │           └── Settings/
│   │
│   ├── leto/                        ← 🌙 Leto — Company-facing brand (B2B)
│   │   └── src/                       (was: interfaces/company/ — renamed 2026-06-10)
│   │       ├── App/
│   │       │   └── routerViewsConfig.js   ← MyProfile + Compliance wired ✅
│   │       ├── common/
│   │       │   └── routesRegexp.js        ← myprofile + compliance routes ✅
│   │       └── routes/
│   │           ├── index.js               ← needs Compliance export (TODO ⚠️)
│   │           ├── Board/                 ← #/company-dashboard
│   │           ├── Discover/              ← #/company-crewdb
│   │           ├── Calendar/              ← #/company-calendar
│   │           ├── Library/               ← #/myfiles
│   │           ├── MyProfile/             ← #/my-profile (built, wired)
│   │           ├── Compliance/            ← #/compliance (built, wired)
│   │           └── Settings/
│   │
│   └── admin/                       ← Admin interface (placeholder — use landing/admin for now)
│       └── README.md
│
├── backend/                         ← FastAPI — shared data layer
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py                  ← startup, DB init, seed logic
│       ├── routers/
│       │   ├── auth.py              ← /api/auth/* (login, register, /me)
│       │   ├── learning.py          ← /api/admin/learning/* (series, seasons, episodes)
│       │   ├── seafarers.py         ← /api/seafarers/*
│       │   ├── company.py           ← /api/company/*
│       │   ├── documents.py         ← /api/documents/*
│       │   ├── compliance.py        ← /api/compliance/*
│       │   ├── exams.py             ← /api/exams/*
│       │   ├── admin.py             ← /api/admin/*
│       │   └── users.py
│       ├── models/                  ← SQLAlchemy ORM models
│       ├── schemas/                 ← Pydantic schemas
│       ├── services/
│       ├── core/                    ← JWT, security
│       └── db/
│           ├── base.py
│           └── learning_seeds.py    ← 86 series seed data (all categories)
│
├── shared/
│   ├── assets/README.md             ← logos, badge icons (TODO)
│   └── types/README.md              ← shared TS types (TODO)
│
├── Reference/
│   ├── LETO_MASTER_PROMPT.md
│   ├── AdminPanel/ADMIN_PANEL_MAP.md
│   ├── LearningRecord/              ← 86-series content guides + seed scripts
│   ├── ProfileData/                 ← countries, languages, vessel types, etc.
│   └── Stremio/                     ← original Stremio source (GPLv2 origin)
│
├── onboarding/                      ← onboarding HTML drafts
├── User database/                   ← file-based user data (dev scaffolding)
└── docs/                            ← architecture, handover, regulation docs
```

---

## 3. Architecture

### Stack per layer

| Layer | Tech | Port (internal) | Notes |
|---|---|---|---|
| **nginx** | nginx | 80 (→ 4000 host) | Single entry point, routes all traffic |
| **landing** | Vite + React + TS + Tailwind | 5173 | Auth flow, admin panel |
| **backend** | FastAPI + PostgreSQL | 8000 | JWT auth + all data APIs |
| **castor** (`interfaces/castor`) | Webpack + React (Stremio skeleton) | 8080 | 🌟 Cástor app — Seafarer-facing brand |
| **leto** (`interfaces/leto`) | Webpack + React (Stremio skeleton) | 8080 | 🌙 Leto app — Company-facing brand |
| **postgres** | PostgreSQL 15 | 5432 | Single source of truth |

### URL routing (nginx)

URL paths kept generic (`/app/`, `/company/`) for backward compat — internal services renamed to brand names. URL rename to `/castor/` / `/leto/` is a separate decision tracked in Section 7.

| Path | Routes to (service) | Brand | Description |
|---|---|---|---|
| `/` | landing | — | Landing page, login, register |
| `/admin/*` | landing (admin section) | — | Admin panel (role=admin guard) |
| `/app/` | castor:8080 | 🌟 Cástor | Seafarer-facing app |
| `/company/` | leto:8080 | 🌙 Leto | Company-facing app |
| `/crewing-api/*` | castor:8080/api/ | — | Castor container Express API |
| `/api/*` | backend:8000 | — | FastAPI REST (shared by all brands) |

### Authentication flow
```
Browser → POST /api/auth/login → JWT token
Token stored in localStorage('leto-auth').state.accessToken
Role determines redirect: seafarer → /app/, company → /company/, admin → /admin
AdminGuard checks role === 'admin' — redirects to / if not met
```

**Seeded accounts:**
| Email | Password | Role |
|---|---|---|
| `ricardo@pbs.com` | `admins123` | admin |
| `demo.seafarer@leto.com` | `demo1234` | seafarer |
| *(no demo company yet)* | — | — |

---

## 4. Feature Status

### Landing + Admin Panel (`landing/`)

| Section | Route | Status |
|---|---|---|
| Landing page | `/` | ✅ Built |
| Login/Register modals | `/` | ✅ Built |
| Dashboard (iframe) | `/dashboard` | ✅ Built |
| Admin Overview | `/admin` | ✅ Built |
| Admin Seafarers | `/admin/seafarers` | ✅ Built |
| Admin Seafarer Detail | `/admin/seafarers/:id` | ✅ Built |
| Admin Documents | `/admin/documents` | ✅ Built |
| Admin Compliance | `/admin/compliance` | ✅ Built |
| Admin Exams | `/admin/exams` | ✅ Built |
| Admin Companies | `/admin/companies` | ✅ Built |
| Admin Relationships | `/admin/relationships` | ✅ Built |
| Admin Learning CMS | `/admin/learning` | ✅ Built + 86 series seeded |
| Admin Config | `/admin/config` | ✅ Built |
| Admin Analytics | `/admin/analytics` | ✅ Built |

### 🌟 Cástor — Seafarer-facing app (`interfaces/castor/`)

| Route | Component | Status |
|---|---|---|
| `#/` (intro) | Intro | ✅ |
| `#/myexams` | Addons (Learning Record viewer) | ✅ |
| `#/myfiles` | Library (document manager) | ✅ |
| `#/calendar` | SeafarerCalendar | ✅ |
| `#/dashboard` | SeafarerSchedule (My Schedule) | ✅ |
| `#/my-profile` | MyProfile (1138-line profile editor) | ✅ Built + routed |
| `#/compliance` | Compliance (doc compliance checker) | ✅ Built + routed |
| `#/search` | Search | ✅ |
| `#/settings` | Settings | ✅ |
| `#/metadetails/:type/:id` | MetaDetails | ✅ |

### 🌙 Leto — Company-facing app (`interfaces/leto/`)

| Route | Component | Status |
|---|---|---|
| `#/` (company-dashboard) | Board | ✅ |
| `#/company-crewdb` | Discover (Crew Database) | ✅ |
| `#/company-calendar` | Calendar | ✅ |
| `#/myfiles` | Library | ✅ |
| `#/my-profile` | MyProfile | ✅ Built + routed |
| `#/compliance` | Compliance | ✅ Built + routed |
| `#/settings` | Settings | ✅ |
| `#/metadetails/:type/:id` | MetaDetails | ✅ |

### Backend (`backend/`)

| Endpoint group | Status | Notes |
|---|---|---|
| `POST /api/auth/login` | ✅ | JWT |
| `POST /api/auth/register` | ✅ | Creates seafarer or company |
| `GET /api/auth/me` | ✅ | |
| `GET/POST /api/admin/learning/series` | ✅ | 86 series in DB |
| `GET/PATCH/DELETE /api/admin/learning/series/:id` | ✅ | |
| `POST /api/admin/learning/seasons` | ✅ | |
| `POST /api/admin/learning/episodes` | ✅ | |
| `GET /api/seafarers/*` | ✅ | |
| `PATCH /api/seafarers/:id/amp-profile` | ✅ | AMP Panamá fields |
| `GET /api/seafarers/:id/amp-profile` | ✅ | |
| `GET/POST /api/documents/*` | ✅ | |
| `GET /api/compliance/*` | ✅ | |
| `GET /api/exams/*` | ✅ | |
| `GET /api/company/*` | ✅ | |
| `GET /api/admin/learning/oembed` | ✅ | YouTube metadata |

### Learning Record Data

86 series seeded across 5 categories:

| Category | Count | Examples |
|---|---|---|
| Conventions | 11 | MARPOL, COLREGS, MLC 2006, SAR 1979 |
| Codes | 15 | ISPS, IMDG, IGF, Polar, LSA, FSS |
| Regulations | 18 | SOLAS I–VI, MARPOL I/II/V/VI, STCW Reg II/III/V |
| Skills | 24 | Nav, Radar/ARPA, Fire Fighting, GMDSS, DP Ops |
| Industry Standards | 14 | ISGOTT, OCIMF SIRE, TMSA, RightShip, IMCA DP |

All series are in **Draft** state. Episodes need YouTube URLs added via the Learning CMS.

---

## 5. Known Issues & TODOs

### Routing (needs propagation from demo/Leto → pbsds-leto-app)

| Issue | File | Priority |
|---|---|---|
| `interfaces/leto/src/routes/index.js` — verify `Compliance` is exported | `interfaces/leto/src/routes/index.js` | HIGH |
| Role-lock Leto app to always render `COMPANY_TABS` | `interfaces/leto/src/components/MainNavBars/` | HIGH |
| Cástor app — strip Company-only sidebar tabs | `interfaces/castor/src/components/MainNavBars/` | MEDIUM |

### Docker / Infrastructure

| Issue | Priority |
|---|---|
| ~~`docker-compose.yml` needs service for castor/leto~~ | ✅ DONE 2026-06-10 |
| ~~nginx needs `/company/` → leto route~~ | ✅ DONE 2026-06-10 (rebrand) |
| No demo company account seeded — create via `POST /api/auth/register` with `role: "company"` | MEDIUM |
| `.env.example` template not created yet | LOW |

### UI / Features

| Issue | Priority |
|---|---|
| MyProfile data files not confirmed in `interfaces/castor/src/common/` (countries, languages, vessel types, etc.) | HIGH |
| Episode content (YouTube URLs) not added to any of the 86 learning series | MEDIUM |
| Admin panel `/admin` requires being logged in first — developer confusion risk | LOW |
| `User database/` folder — determine if real data or dev scaffolding | LOW |

---

## 6. Open Decisions (Rick — please answer)

| # | Decision | Options | Recommendation |
|---|---|---|---|
| 2 | **Repo strategy** | Single repo (all 3 interfaces) vs 3 separate repos | Single repo — easier docker-compose + shared types |
| 3 | **Sync mechanism for v1** | Manual refresh / polling / websockets+SSE | Polling for v1, upgrade to SSE later |
| 4 | **Landing page base** | Current `landing/` (Vite+React+Tailwind) vs start fresh | Keep current — already has full admin panel |
| 5 | **Git history** | Fresh repo in `pbsds-leto-app/` or carry `demo/Leto` history | Fresh repo — clean slate |
| 7 | **`IDM/` folder in demo/Leto** | Active work to preserve or obsolete snapshot to drop | Investigate before dropping |
| 8 | **`User database/` folder** | Real data to migrate to Postgres or dev scaffolding | Looks like dev scaffolding (UUID dirs + SF-001) |
| 9 | **`onboarding/` HTML files** | Part of user interface or standalone flow | Move to `interfaces/castor/src/routes/Onboarding/` |
| 10 | **Stack consistency** | All interfaces on Vite+React+Tailwind or user/company stay on Webpack | Keep Webpack for now — rebuild later if needed |

---

## 7. Next Steps (Prioritized by Interface)

> Order reflects the dev priority set 2026-06-10: **User → Company → Admin.** Work on Company/Admin items is paused until the User panel is feature-complete.

### 🌟 CÁSTOR app (active focus — Seafarer-facing, B2C)

Sprint 7 just shipped (MyProfile header layout + Compliance card polish — see Section 9 open log). Continuing:

1. **Phase 2 — Residencia & Contacto section** in `interfaces/castor/src/routes/MyProfile/MyProfile.js`.
2. **Phase 3 — Professional section** — unify rank, department, vessel types, experience fields.
3. **Phase 4 — Documents & Compliance link** — connect MyProfile to `/myfiles` + Compliance.
4. **Phase 5 — Ribbons & Learning placeholder** — visual badges from the Learning Record DB.
5. **Seafarer sidebar cleanup** — strip `COMPANY_TABS` from `interfaces/castor/src/components/MainNavBars/MainNavBars.tsx`. After this, the User build is truly user-only.
6. **Auth unification** — crewing SPA should share JWT auth with the Vite React frontend (currently avatar saves locally in dev/demo mode when no session).
7. **Confirm MyProfile data files** — verify `countries_world.json`, `languages_profile.json`, `vessel_types.json`, `panama_companies.json`, `provinces_by_country.json`, `airports_by_country.json` are all present in `interfaces/castor/src/common/`. Source copies live in `Reference/ProfileData/`.
8. **Username coding system** — design TBD (flagged in Handover.md).
9. **Add episode content** — use Admin Learning CMS at `/admin/learning` to attach YouTube URLs to series. Start with STCW and Navigation skills.

### 🌙 LETO app (paused — pick up after Cástor is feature-complete, Company-facing, B2B)

10. **Verify `interfaces/leto/src/routes/index.js`** exports `Compliance` — same fix already applied to `interfaces/castor/`.
11. **Lock company interface role** — edit `interfaces/leto/src/components/MainNavBars/MainNavBars.tsx` so `getUserRole()` always returns `'company'` (see Section 8 for exact code).
12. **Add demo company account** — `POST /api/auth/register` with `{ email: "demo.company@leto.com", password: "demo1234", role: "company" }`.
13. **Verify nginx routing** for `/company/` → `interfaces/company:8081` (docker-compose service exists; confirm nginx config).
14. **Mirror Cástor app polish** — once Cástor patterns stabilize, apply same MyProfile/Compliance treatment to Leto side.

### 🛠️ ADMIN PANEL (deferred — internal tool, no public brand)

15. **Decide standalone vs. inside-landing** — the admin panel currently lives at `landing/src/pages/admin/`. Decide if it stays there or moves to `interfaces/admin/` for a clean separation.
16. **Polish & feature parity** — 11 sections built; needs UX consistency pass.

### 🔧 Infrastructure / cross-cutting (anytime)

17. **Shared types** — define TS interfaces in `shared/types/` for User, Document, Badge, Series.
18. **`docker-compose.prod.yml`** with production overrides (no `--reload`, no Vite dev server).
19. **Cloud Run deployment** — `gcloud sql connect` pending from VS Code terminal.
20. **Answer open decisions** (Section 6) to unblock architecture choices.

---

## 8. Developer Reference

### How to access the admin panel
1. Go to `localhost:3000`
2. Log in with `ricardo@pbs.com` / `admins123`
3. Navigate to `localhost:3000/admin`

The `AdminGuard` silently redirects to `/` if not logged in — it does NOT show an error. This is intentional.

### Company interface setup (v1 — clone-and-lock)

Edit `interfaces/leto/src/components/MainNavBars/MainNavBars.tsx`:
```ts
// Company-only build: role is always 'company'
const getUserRole = (): string => 'company';
```

This guarantees `COMPANY_TABS` is the only sidebar rendered regardless of `localStorage` state.

### Re-seeding the learning database

If the Postgres volume is wiped, the backend auto-seeds on startup from `backend/app/db/learning_seeds.py`. No manual action needed — just restart the backend container.

### Profile data files location

The MyProfile component requires these JSON files at runtime:
```
src/common/countries_world.json
src/common/languages_profile.json
src/common/provinces_by_country.json
src/common/airports_by_country.json
src/common/vessel_types.json
src/common/panama_companies.json
```
Source copies are in `Reference/ProfileData/`.

---

## 9. Open Log

- **2026-05-27** — Document created. Inventory of `demo/Leto/` captured. Target structure proposed. Waiting on Rick to answer Section 6.
- **2026-05-27** — Rick moved cleaner files into `pbsds-leto-app/` root. Section 8 added: developer instructions for Company interface.
- **2026-05-27** — Structure LOCKED (Section 3). Empty skeleton scaffolded. Decisions #1 and #6 closed.
- **2026-05-27 (session 2)** — Major progress across the stack:
  - **Learning Record DB:** 86 series seeded into PostgreSQL via browser API injection. All 5 categories populated (Conventions 11, Codes 15, Regulations 18, Skills 24, Industry Standards 14). All in Draft state, awaiting YouTube URLs.
  - **Routing fixed (interfaces/user and interfaces/company):** `MyProfile` (`#/my-profile`) and `Compliance` (`#/compliance`) were fully built but disconnected from the router. Fixed in all three routing files (`routesRegexp.js`, `routerViewsConfig.js`, `routes/index.js`) in both interfaces.
  - **Admin panel confirmed intact:** All 11 admin sections present and wired in `landing/src/pages/admin/`. 86 series visible and editable at `/admin/learning`.
  - **Root cause of "empty admin panel":** `AdminGuard` silently redirects to `/` when not logged in — not a code bug. Developer must log in as admin first before navigating to `/admin`.
  - **`pbsds-leto-app` explored:** Full structure documented above. `interfaces/castor/` and `interfaces/leto/` both have routing fixes already applied. Backend has all routers active.
- **2026-05-27 (session 3)** — `demo/Leto` migration completed. `demo/Leto` is now safe to delete.
  - **Migrated to `docs/architecture/`:** `AUTH-FLOW.md`, `STRUCTURE.md`, `NAMING-CONVENTION.md`
  - **Migrated to `docs/crewing-module/`:** `CREWING-MODULE.md`
  - **Migrated to `docs/handover/sessions/`:** All 8 session logs (2026-03-17 through 2026-05-26-S6B)
  - **Migrated to `infra/nginx/`:** `nginx-cloudrun.conf`, `nginx-integrated.conf`, `Dockerfile`
  - **Migrated to `docs/reference/`:** `Landing/index2.html` → `landing-prototype.html`
  - **`IDM/` folder:** Confirmed 100% duplicate of `demo/Leto` root (identical MD5 on all files). Nothing unique — skipped entirely.
  - **All other `demo/Leto` root files** (`Handover.md`, `Project_Manager.md`, `CREWING-MODULE.md`, `Regulation.md`, `README.md`, etc.) were already present in `pbsds-leto-app` root — verified byte-identical.
- **2026-06-09/10 (Sprint 7 — User panel: MyProfile header + Compliance card polish)** — see `docs/handover/sessions/session_2026-06-09.md` for full detail. Highlights:
  - **MyProfile 3-column header** stabilized at `gridTemplateColumns: '5fr 9fr 6fr'` (25%/45%/30% — proportional `fr` units, not fixed `rem`).
  - **EditableText component** now accepts a `style` prop applied directly to the rendered span (bypasses CSS specificity issues).
  - **Avatar pipeline fixed** — `uid` resolved fresh inside `handleCropSave`; fallback local-only save when no active session. Avatar `<img>` no longer has the `height: 130% + translateY` legacy hack.
  - **Name sync to `leto-user`** — `handleSave` now writes `first_name` and `last_name` (previously only `rank` and `department`). Compliance.js `user` memo now falls back to `profileExtra.firstName/lastName` if `leto-user` doesn't have the names yet.
  - **Compliance ProfilePreviewCard avatar** rendered as circular (`width: 75%; aspectRatio: 1/1; borderRadius: 50%; paddingTop: 8%`) to match the default `profileimg.png` silhouette and hide white JPEG corners from canvas clip.
  - **Files modified:** `interfaces/castor/src/routes/MyProfile/MyProfile.js`, `interfaces/castor/src/routes/Compliance/Compliance.js`.
- **2026-06-10 — Development priority set: User → Company → Admin.** Section 7 reorganized by interface so paused items (Company/Admin) don't clutter the active backlog. User panel Phases 2–5 (Residencia/Contacto, Professional, Documents, Ribbons) are the active work.
- **⚠️ Drift to fix:** Both Sprint 7 session logs (`docs/handover/sessions/session_2026-06-09.md` line 141 and `Reference/Stremio/SESSION-2026-06-09.md` line 161) still show the legacy rebuild command `cd products/portal/demo/Leto/IDM && docker compose build --no-cache user`. The correct command is now `cd portal/pbsds-leto-app && docker compose build --no-cache castor && docker compose up -d castor && docker compose restart nginx`. Update both rebuild snippets before they get copy-pasted into a future session.
- **2026-06-10 — 🎭 ECOSYSTEM BRAND SPLIT.** Rick decided to split into two brands within the same PBS ecosystem:
  - **Leto** → Company-facing app (B2B). Was `interfaces/company/` → now `interfaces/leto/`.
  - **Cástor** → Seafarer-facing app (B2C). Was `interfaces/user/` → now `interfaces/castor/`. Reasoning for "Cástor": uno de los Dioscuros, **patrón de marineros** en la mitología griega (más específico que Tritón/Poseidón); dos sílabas; idéntico en EN/ES; bonus astronómico (estrella mayor de Géminis).
  - **Motivo:** separar mercados (B2B vs B2C) para optimizar SEO, marketing y mensaje por audiencia. Cada marca → su propio dominio y landing page eventualmente.
  - **Approach:** hybrid (Rick chose). Internal rename now, physical sibling split (`portal/pbsds-castor-app/`) deferred to after Cástor Phase 5.
  - **Changes applied this session:**
    - `interfaces/user/` → `interfaces/castor/`
    - `interfaces/company/` → `interfaces/leto/`
    - `docker-compose.yml`: services `user` → `castor`, `company` → `leto`; build paths updated
    - `infra/nginx/nginx.conf`: upstreams renamed, proxy_pass targets updated
    - URL paths kept (`/app/` → castor, `/company/` → leto) for backward compat. URL rename is a separate decision.
    - `Project_Leto.md`: brand split section added to top, folder tree, stack table, route table, feature status headers, next-steps headers all updated
  - **Brand vs Persona (critical):** "Castor" / "Leto" are the public **brand names**. In code and API the user **role** stays `seafarer` / `company` (that's the professional persona, not the brand). Don't conflate the two — refactoring `role === 'seafarer'` to `role === 'castor'` would break the JWT/DB schema.
