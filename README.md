# Leto — Maritime Talent Platform

A unified web platform for maritime crew management. Seafarers manage their documents, availability, and compliance. Companies browse crew databases, schedule interviews, and track certifications.

## Quick Start

**Prerequisites:** Docker and Docker Compose

```bash
git clone <repo-url>
cd Leto
cp .env.example .env        # configure environment variables
docker compose up --build -d
```

Open **http://localhost:3000**

### Test Accounts

```
Company:  demobis@leto.com / Dev12345!
Seafarer: qa.seafarer@leto.com / Crew1234!
```

## Architecture

5 Docker services behind a single Nginx reverse proxy on port 3000:

```
localhost:3000
  /             → Landing Page    (React/Vite, internal port 5173)
  /api/         → Backend API     (FastAPI, internal port 8000)
  /app/         → Crewing Module  (React/Express, internal port 8080)
  /crewing-api/ → Crewing API     (Express, internal port 8080)
```

| Service | Stack | Purpose |
|---|---|---|
| **nginx** | Nginx Alpine | Reverse proxy, single entry point |
| **postgres** | PostgreSQL 15 | Users, profiles, fleet, assignments |
| **backend** | Python 3.11 + FastAPI | JWT auth, seafarer profiles, fleet + crew management |
| **frontend** | Node 20 + Vite + Tailwind | Landing page, login/register modals |
| **crewing** | Node 20 + Webpack + Express | Crew management module (documents, calendar, exams) |

## Auth Flow

Login on the landing page authenticates across the entire platform via shared `localStorage`:

1. `POST /api/auth/login` → JWT access + refresh tokens
2. `GET /api/auth/me` → full user profile (name, rank, nationality, city, bio, tag fields)
3. `POST /api/auth/refresh` → token renewal on 401
4. `localStorage['leto-user']` bridges identity to the crewing module iframe
5. Same origin (`localhost:3000`) = same `localStorage` = seamless auth

See [docs/AUTH-FLOW.md](docs/AUTH-FLOW.md) for the full diagram.

## Project Structure

```
Leto/
├── docker-compose.yml          # Orchestrates all 5 services
├── nginx/                      # Reverse proxy config
├── backend/                    # FastAPI (JWT auth, PostgreSQL)
├── frontend/                   # Vite landing page + modals
├── src/                        # Crewing module source (Webpack/React)
├── docs/                       # Architecture docs + session logs
│   ├── AUTH-FLOW.md            # Identity bridge documentation
│   ├── CREWING-MODULE.md       # Full crewing module reference
│   ├── DATABASE.md             # Entity relationships, API endpoints, roadmap
│   ├── ROADMAP.md              # Full product roadmap from investor feedback
│   ├── STRUCTURE.md            # Complete file tree
│   └── sessions/               # Development session logs
├── User database/              # Filesystem DB (per-user folders by UUID)
├── Dockerfile                  # Crewing module multi-stage build
└── .env.example                # Environment variable template
```

See [docs/STRUCTURE.md](docs/STRUCTURE.md) for the complete file tree.

## Key Features

### Seafarer Side
- **Dashboard** (`#/dashboard`) — Compliance progress, travel blocks, missing docs, exam priorities
- **My Profile** (`#/my-profile`) — Full profile: career (rank, years, availability), mobility (passports, visa, travel), languages, vessels, companies, bio. All backed by PostgreSQL
- **My Files** (`#/myfiles`) — Upload STCW documents with expiry tracking, pre-upload quality reminder, document rules per type
- **My Calendar** (`#/calendar`) — Availability periods (embarking, days off, available)
- **My Exams** (`#/myexams`) — STCW exam catalog with rank-based filtering. "My rank" toggle shows only required exams with REQUIRED badges
- **Compliance Banner** — Real-time document compliance + STCW matrix (travel blocks, certification window)

### Company Side
- **Dashboard** (`#/company-dashboard`) — Fleet overview with vessel type icons
- **Crew Database** (`#/company-crewdb`) — Browse real seafarer profiles from PostgreSQL. Filter by department, rank, nationality, and visa/mobility status
- **My Profile** (`#/my-profile`) — Fleet management with vessel cards, Crew Manager modal for vessel↔seafarer assignments
- **Company Calendar** (`#/company-calendar`) — Schedule interviews, manage events

### Platform
- **JWT Authentication** — Access + refresh tokens, 401 auto-retry
- **PATCH /api/seafarers/me** — Full seafarer profile editing (rank, city, bio, tag fields, availability)
- **STCW Compliance Matrix** — Universal + rank-required + conditional (visa, passport) document requirements
- **Rank-based exam requirements** — `RANK_REQUIRED_EXAMS` mapping for all 10 STCW ranks
- **UUID Isolation** — Each user has their own data folder for operational modules
- **Swagger API Docs** — Available at `/api/docs`

## Development

All development runs through Docker. No local Node.js or Python required.

```bash
# Rebuild everything
docker compose up --build -d

# Rebuild only the crewing module (after changes in /src/)
docker compose up --build -d crewing

# Crewing UI is baked into the image, so src/ changes require a rebuild
docker compose up -d --build crewing nginx

# Rebuild only the frontend (after changes in /frontend/)
docker compose build --no-cache frontend && docker compose up -d frontend

# Seed realistic dev Crew DB data (company + seafarers + vessels)
powershell -ExecutionPolicy Bypass -File .\scripts\seed-dev-data.ps1

# This also seeds QA calendar availability data for qa.seafarer@leto.com

# Optional: run same script with custom config file
powershell -ExecutionPolicy Bypass -File .\scripts\seed-dev-data.ps1 -ConfigPath .\scripts\seed-dev-data.json

# Optional: seed users/vessels only (skip assignments)
powershell -ExecutionPolicy Bypass -File .\scripts\seed-dev-data.ps1 -SkipAssignments

# Seed login credentials (for QA)
# Company: demobis@leto.com / Dev12345!
# Seafarer: qa.seafarer@leto.com / Crew1234!

# Cleanup seeded fake data (including user calendar files in User database/)
powershell -ExecutionPolicy Bypass -File .\scripts\clear-dev-seed-data.ps1

# View logs
docker logs leto-crewing-1 -f
docker logs leto-backend-1 -f

# Access crewing module shell
docker exec -it leto-crewing-1 sh
```

### Useful URLs

| URL | Description |
|---|---|
| http://localhost:3000 | Landing page |
| http://localhost:3000/app/ | Crewing module (direct) |
| http://localhost:3000/api/docs | Swagger UI (FastAPI) |
| http://localhost:3000/api/redoc | ReDoc |

## Tech Stack

| Layer | Technology |
|---|---|
| Landing Page | React 18, Vite, TypeScript, Tailwind CSS |
| Crewing Module | React 18, Webpack 5, JavaScript (CJS), Less, CSS Modules |
| Backend API | FastAPI, SQLAlchemy, PostgreSQL 15, JWT (PyJWT) |
| Crewing API | Express.js, Multer, pdf-lib |
| Infrastructure | Docker Compose, Nginx |
| State | Zustand (frontend), localStorage bridge (cross-app) |

## Documentation

| Document | Description |
|---|---|
| [AUTH-FLOW.md](docs/AUTH-FLOW.md) | How authentication works across landing page and crewing module |
| [CREWING-MODULE.md](docs/CREWING-MODULE.md) | Full architecture reference, routes, data stores, session history |
| [STRUCTURE.md](docs/STRUCTURE.md) | Complete project file tree with annotations |
| [session_2026-04-03.md](docs/sessions/session_2026-04-03.md) | Sidebar restoration, UUID document preview fix, seafarer dashboard |

## License

Based on [Stremio Web](https://github.com/nickonometry/stremio-web-shell-linux) (GPLv2). Maritime adaptations by PBS Digital Ecosystem.
