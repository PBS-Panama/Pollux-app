# Leto Platform

The Leto platform is an integrated web system for seafarers comprising public marketing paths, user registration, and a comprehensive crewing module to manage documents and compliance.

## Architecture

The project is orchestrated via Docker Compose and unified through an Nginx reverse proxy.

- **Nginx (port 80 / 3000 externally)**: The single entry point unifying all services.
- **Leto Frontend (`/`)**: A React/Vite application handling the landing page, login, and registration.
- **Leto Backend (`/api/`)**: A FastAPI service for general platform operations.
- **Leto Crewing Module (`/app/`)**: A React/Express application managing "My Files", schedules, compliance, and document uploads.
- **Leto Crewing API (`/demeter-api/`)**: Express API serving the crewing module (data persistence and logic).

## Running the Project

Ensure you have Docker and Docker Compose installed.

```bash
docker compose up --build -d
```

Access the unified platform at: `http://localhost:3000`

### Integration Details

- When a user registers in the Leto Frontend, their profile is synchronized to the Leto Crewing Module via the `/demeter-api/users` endpoint.
- After login, the user dashboard integrates the Leto Crewing Module smoothly into the UI experience.
- The platform uses a consolidated component architecture where certain Stremio legacy utilities and UI components handle the styling constraints inside the Leto Crewing Module.
