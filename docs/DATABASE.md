# Leto — Database Architecture

## Overview

Leto uses **PostgreSQL 15** for authentication and business data, and a **filesystem-based JSON database** (Express API) for the crewing module's operational data (documents, calendar, exams).

```
PostgreSQL (leto_db)              Filesystem (User database/)
├── users (auth)                  ├── {UUID}/
├── seafarers (crew profiles)     │   ├── settings/data.json
├── companies (business profiles) │   ├── calendar/data.json
└── vessels (fleet registry)      │   ├── myfiles/data.json + uploads/
                                  │   ├── myexams/data.json
                                  │   └── dashboard/data.json
```

---

## Entity Relationship Diagram

```
                         ┌──────────────────────┐
                         │       users           │
                         │ (authentication)      │
                         ├──────────────────────┤
                         │ id          UUID PK   │
                         │ email       unique     │
                         │ hashed_pw   string     │
                         │ role        enum       │
                         │ company_id  FK ──────────────┐
                         │ created_at  timestamp  │     │
                         └──────────┬─────────────┘     │
                                    │                    │
                     role = ?       │                    │
                                    │                    │
              ┌─────────────────────┴──────┐             │
              │                            │             │
         "seafarer"                   "company"          │
              │                            │             │
   ┌──────────┴──────────┐    ┌────────────┴──────────┐  │
   │     seafarers       │    │      companies        │◄─┘
   │  (crew profiles)    │    │  (business profiles)  │
   ├─────────────────────┤    ├───────────────────────┤
   │ id        FK→users  │    │ id          UUID PK   │
   │ first_name string   │    │ name        string    │
   │ last_name  string   │    │ ruc         string    │
   │ nationality string  │    │ country     string    │
   │ phone      string   │    │ city        string    │
   │ rank       string   │    │ address     string    │
   │ date_of_birth date  │    │ website     string    │
   │ years_exp  int      │    │ sector      string    │
   │ bio        text     │    │ company_size string   │
   │ is_available bool   │    │ contact_email string  │
   │ created_at ts       │    │ fleet_size  int       │
   └─────────────────────┘    │ is_verified bool      │
                              │                       │
                              │ legal_rep_name  str   │
                              │ legal_rep_phone str   │
                              │ legal_rep_email str   │
                              │ hr_rep_name     str   │
                              │ hr_rep_phone    str   │
                              │ hr_rep_email    str   │
                              │ created_at      ts    │
                              └───────────┬───────────┘
                                          │
                                     1 : many
                                          │
                              ┌───────────┴───────────┐
                              │       vessels         │
                              │  (fleet registry)     │
                              ├───────────────────────┤
                              │ id          UUID PK   │
                              │ company_id  FK→co.    │
                              │ name        string    │
                              │ imo_number  string    │
                              │ vessel_type string    │
                              │ flag_state  string    │
                              │ gross_tonnage int     │
                              │ created_at  ts        │
                              └───────────────────────┘
```

---

## Table Definitions

### `users` — Authentication identity

Every person in the system has a user record. Role determines which profile table holds their data.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK, auto-generated | Unique identifier |
| `email` | String | Unique, not null | Login email |
| `hashed_password` | String | Not null | bcrypt hash |
| `role` | String | Not null | `"seafarer"` or `"company"` |
| `company_id` | String | FK → companies.id, nullable | Set for company users |
| `created_at` | Timestamp | Auto | Registration date |

### `seafarers` — Crew member profiles

1:1 with users. Only exists for users with `role = "seafarer"`.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, FK → users.id | Same UUID as the user |
| `first_name` | String(100) | Not null | Given name |
| `last_name` | String(100) | Not null | Family name |
| `nationality` | String(100) | Nullable | Country of citizenship |
| `phone` | String(50) | Nullable | Contact number |
| `rank` | String(100) | Nullable | Maritime rank (master, chief-officer, etc.) |
| `date_of_birth` | Date | Nullable | For age calculation |
| `years_experience` | Int | Default 0 | Total sea time |
| `bio` | String(1000) | Nullable | Professional summary |
| `is_available` | Bool | Default true | Currently seeking contracts |
| `created_at` | Timestamp | Auto | Profile creation date |

### `companies` — Business profiles

Created during company registration. Multiple users can link to one company via `users.company_id`.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK, auto-generated | Unique identifier |
| `name` | String(200) | Not null | Company legal name |
| `ruc` | String(50) | Nullable | Tax ID / RUC |
| `country` | String(100) | Nullable | Country of incorporation |
| `city` | String(100) | Nullable | City of operations |
| `address` | String(500) | Nullable | Physical address |
| `website` | String(300) | Nullable | Company website URL |
| `sector` | String(100) | Nullable | Industry sector |
| `company_size` | String(20) | Nullable | Employee range |
| `contact_email` | String | Unique, not null | Primary contact |
| `fleet_size` | Int | Default 0 | Number of vessels |
| `is_verified` | Bool | Default false | Admin verification status |
| `legal_rep_name` | String(200) | Nullable | Legal representative name |
| `legal_rep_phone` | String(50) | Nullable | Legal representative phone |
| `legal_rep_email` | String(200) | Nullable | Legal representative email |
| `hr_rep_name` | String(200) | Nullable | HR contact name |
| `hr_rep_phone` | String(50) | Nullable | HR contact phone |
| `hr_rep_email` | String(200) | Nullable | HR contact email |
| `created_at` | Timestamp | Auto | Registration date |

### `vessels` — Fleet registry

Each company can have many vessels. Linked by `company_id`.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK, auto-generated | Unique identifier |
| `company_id` | String | FK → companies.id, not null | Owner company |
| `name` | String(200) | Not null | Vessel name (e.g., "MV Pacific Star") |
| `imo_number` | String(20) | Nullable | IMO number (7 digits) |
| `vessel_type` | String(100) | Nullable | Type from standard list |
| `flag_state` | String(100) | Nullable | Registration flag state |
| `gross_tonnage` | Int | Nullable | GT — determines STCW requirements |
| `created_at` | Timestamp | Auto | Registration date |

**Vessel types** (standard list, from `MetaPreview.js`):
```
Oil Tanker, Chemical Tanker, LNG Carrier, LPG Carrier,
Container Ship, Bulk Carrier, General Cargo,
PSV (Platform Supply Vessel), AHTS (Anchor Handling),
Tug, Barge, FPSO, Offshore Drill Ship,
Ro-Ro, Car Carrier, Cruise Ship, Ferry,
Cable Layer, Dredger, Icebreaker
```

**Common flag states**:
```
Panama, Liberia, Marshall Islands, Hong Kong, Singapore,
Bahamas, Malta, Cyprus, Bermuda, Antigua and Barbuda,
Norway (NIS), Denmark (DIS), United Kingdom, Greece,
Japan, South Korea, China, United States
```

---

## Relationships Summary

| Relationship | Type | How it works |
|---|---|---|
| `users` → `seafarers` | 1:1 | `seafarers.id = users.id` (same UUID) |
| `users` → `companies` | Many:1 | `users.company_id = companies.id` |
| `companies` → `vessels` | 1:Many | `vessels.company_id = companies.id` |
| `seafarers` → `User database/{UUID}/` | 1:1 | Filesystem folder per seafarer UUID |

### Who creates what

| Action | Tables affected |
|---|---|
| Seafarer registers | `users` + `seafarers` + `User database/{UUID}/` folder |
| Company registers | `users` + `companies` + (optionally) `vessels` |
| Company adds vessel | `vessels` |
| Company adds another user | `users` (with same `company_id`) |

---

## Filesystem Database (Crewing Module)

Separate from PostgreSQL. Managed by Express API (`apiRoutes.js` + `userDataManager.js`).

Each seafarer has a folder at `User database/{UUID}/`:

```
User database/
  f703542f-cf4d-48eb-aa5f-764a610c7adb/    ← demo user (Jhon Leto)
    settings/data.json
      → { "rank": "master", "preferences": {} }
    calendar/data.json
      → { "availability": [...], "confirmedInterviews": [...] }
    myfiles/data.json
      → { "uploads": [...] }
    myfiles/uploads/
      → actual PDF files
    myexams/data.json
      → { "bookedExams": [...] }
    dashboard/data.json
      → { "currentContract": null, "rotationHistory": [], "portCalls": [] }
```

**Note:** Company users do NOT have a `User database/` folder — they interact with the crewing module through the Crew Database and Company Calendar views, which read seafarer data.

---

## Access Patterns

### Seafarer login flow
```
POST /api/auth/login → JWT token
GET  /api/auth/me    → { id, email, role, rank, first_name, last_name, date_of_birth }
                       (JOINs users + seafarers)
POST /crewing-api/users/{UUID}/init → creates User database folder
GET  /crewing-api/users/{UUID}/settings → rank, preferences
```

### Company login flow
```
POST /api/auth/login → JWT token
GET  /api/auth/me    → { id, email, role, company_id }
                       (JOINs users + companies for company data)
GET  /api/companies/{id} → full company profile + fleet (FUTURE)
GET  /api/companies/{id}/vessels → list of vessels (FUTURE)
```

### Company viewing crew
```
The crewing module's Crew Database (#/company-crewdb) reads from
Stremio Core's mock data (crewData.js). In the future, this will
query real seafarer profiles from PostgreSQL.
```

---

## Database Connection

```
# docker-compose.yml
DATABASE_URL: postgresql://leto_user:leto_pass@postgres:5432/leto_db

# backend/app/core/config.py
class Settings:
    DATABASE_URL: str = "postgresql://leto_user:leto_pass@postgres:5432/leto_db"
    JWT_SECRET: str = "..."
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
```

---

## Roadmap

### Phase 1 — Current session (v0.5.x)
- [x] `users` table with JWT auth
- [x] `seafarers` table with profile data
- [x] `companies` table (basic: name, contact_email)
- [ ] Expand `companies` table (ruc, address, reps, sector, size)
- [ ] Create `vessels` table
- [ ] Company registration flow (4-step modal)
- [ ] Company-specific `/me` response with company data

### Phase 2 — Role-based views
- [ ] Separate sidebar tabs by role (company vs seafarer)
- [ ] Company dashboard with fleet overview + crew stats
- [ ] Company profile page (editable, like My Profile for seafarers)
- [ ] Crew Database reads from real PostgreSQL seafarer profiles (not mock data)

### Phase 3 — Crew management
- [ ] `assignments` table — link seafarers to vessels with embark/disembark dates
- [ ] Contract management (offers, acceptances, rotations)
- [ ] Crew change planning calendar
- [ ] Vessel-specific crew requirements (by GT and vessel type)

### Phase 4 — Compliance & automation
- [ ] IMO number validation against public registries
- [ ] Automatic STCW requirement calculation based on vessel GT + flag state
- [ ] Document expiry notifications (email / in-app)
- [ ] Compliance reports exportable as PDF
- [ ] CSV import for vessels (bulk fleet registration)
- [ ] CSV import for crew lists (bulk seafarer onboarding)

### Phase 5 — Integration & deployment
- [ ] Cloud Run deployment (GCP)
- [ ] Neptune ERP integration for vessel/fleet data
- [ ] Email service (SendGrid/SES) for notifications
- [ ] File storage migration (local → GCS/S3)
- [ ] API rate limiting + audit logging
