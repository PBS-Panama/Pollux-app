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

### Demo Account

```
Email:    demo@leto.com
Password: Demo1234!
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
| **postgres** | PostgreSQL 15 | User accounts, auth data |
| **backend** | Python 3.11 + FastAPI | JWT authentication, user management |
| **frontend** | Node 20 + Vite + Tailwind | Landing page, login/register modals |
| **crewing** | Node 20 + Webpack + Express | Crew management module (documents, calendar, exams) |

## Auth Flow

Login on the landing page authenticates across the entire platform via shared `localStorage`:

1. `POST /api/auth/login` → JWT tokens
2. `GET /api/auth/me` → user profile (name, rank, date of birth)
3. `localStorage['leto-user']` bridges identity to the crewing module iframe
4. Same origin (`localhost:3000`) = same `localStorage` = seamless auth

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
│   ├── STRUCTURE.md            # Complete file tree
│   └── sessions/               # Development session logs
├── User database/              # Filesystem DB (per-user folders by UUID)
├── Dockerfile                  # Crewing module multi-stage build
└── .env.example                # Environment variable template
```

See [docs/STRUCTURE.md](docs/STRUCTURE.md) for the complete file tree.

## Key Features

### Seafarer Side
- **My Profile** (`#/my-profile`) — Editable profile with languages, vessels, companies, about me
- **My Files** (`#/myfiles`) — Upload and manage STCW documents with expiry tracking
- **My Calendar** (`#/calendar`) — Availability periods (embarking, days off, available)
- **My Exams** (`#/myexams`) — STCW exam booking with department/level filters
- **Compliance Banner** — Real-time document compliance status per rank

### Company Side
- **Crew Database** (`#/company-crewdb`) — Browse and search crew profiles
- **Company Calendar** (`#/company-calendar`) — Schedule interviews, manage events
- **Interview System** — Book interviews, track confirmations

### Platform
- **JWT Authentication** — Secure login with access/refresh tokens
- **UUID Isolation** — Each user has their own data folder
- **STCW Compliance Matrix** — 28+ required documents per rank
- **Swagger API Docs** — Available at `/api/docs`

## Development

All development runs through Docker. No local Node.js or Python required.

```bash
# Rebuild everything
docker compose up --build -d

# Rebuild only the crewing module (after changes in /src/)
docker compose up --build -d crewing

# Rebuild only the frontend (after changes in /frontend/)
docker compose build --no-cache frontend && docker compose up -d frontend

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

## License

Based on [Stremio Web](https://github.com/nickonometry/stremio-web-shell-linux) (GPLv2). Maritime adaptations by PBS Digital Ecosystem.
