# Smoke test — Pollux (R3b, extendido en R5 y R8)

Navegador headless real (Playwright/Chromium) corriendo en un contenedor
Docker oficial — nada se instala en el host, sin servicios pagos. Loguea con
el usuario demo de compañía (local, seed de desarrollo) y recorre Board,
Discover (incluyendo el flujo real de "Agregar a mi personal" → revierte el
dato de prueba al terminar), MyFleet, el perfil de un marino (URL nueva
`#/seafarer/{id}` y la vieja `#/metadetails/crew/{id}`), Calendar,
Settings, un cambio de idioma real en→es→pt→en (R8 — verifica el label de
"Crew Database" en cada idioma y escanea toda la página en busca de claves
`ALL_CAPS` sin traducir) y admin. Library se sacó del recorrido (T2,
2026-09-28 — la ruta y sus componentes fueron eliminados por decisión de
Rick). Falla si hay errores de consola,
`pageerror`, respuestas 4xx/5xx del propio origen, una pantalla con menos de
10 elementos en el DOM (heurística de "en blanco"), o una clave de traducción
visible sin resolver. Guarda una captura de cada pantalla en `output/`
(ignorado por git).

## Requisitos

- El stack de Pollux corriendo en `:4001` (`docker compose up -d --build` en
  la raíz de `pbsds-pollux-app`).
- Docker en el host (nada más — el navegador y Node viven en el contenedor).

## Credenciales

**Nunca se escriben acá ni en el script.** Dos cuentas, ambas ya locales:
- Compañía: la demo que siembra `backend/app/db/seeds.py` (`seed_demo_data`)
  — nombre de empresa, email y contraseña.
- Admin: la de `.env` (`ADMIN_SEED_EMAIL`/`ADMIN_SEED_PASSWORD`). Hace falta
  loguearse como admin de verdad — `/admin/` (`interfaces/admin/src/App.tsx`)
  solo acepta una sesión existente con rol `admin`; si no hay una, cae a un
  fallback con una contraseña de desarrollo vieja a propósito que falla
  cerrado (401/403) — no sirve para probar el panel.

Pasalas como variables de entorno al invocar (ver abajo). Si tu stack usa
otras cuentas, pasá esos valores en su lugar.

## Cómo correrlo

Desde `products/portal/pbsds-pollux-app/`:

```bash
docker run --rm \
  --network host \
  -v "$(pwd)/interfaces/leto/tests/smoke:/tests" \
  -w /tests \
  -e PBS_SMOKE_BASE_URL="http://localhost:4001" \
  -e PBS_SMOKE_COMPANY_NAME="<nombre de la empresa demo>" \
  -e PBS_SMOKE_COMPANY_EMAIL="<email de la empresa demo>" \
  -e PBS_SMOKE_COMPANY_PASSWORD="<contraseña de la empresa demo>" \
  -e PBS_SMOKE_ADMIN_EMAIL="<ADMIN_SEED_EMAIL del .env>" \
  -e PBS_SMOKE_ADMIN_PASSWORD="<ADMIN_SEED_PASSWORD del .env>" \
  mcr.microsoft.com/playwright:v1.47.2-jammy \
  sh -c "npm install --no-save --no-fund --no-audit >/dev/null 2>&1 && node smoke.js"
```

`--network host` (Linux) hace que `localhost:4001` dentro del contenedor
apunte al `:4001` publicado por `docker compose` en el host — no hace falta
conectar a la red interna de `pbsds-pollux`. La imagen ya trae Chromium +
dependencias del SO instaladas; `npm install` solo baja el paquete JS
`playwright` (mismo número de versión que el tag de la imagen, para que use
el Chromium que ya está ahí en vez de bajar uno nuevo).

Sale con código 0 si las 11 pantallas/flujos pasan, 1 si alguna falla, 2 si
el login falla o el script se cae antes de terminar. El resumen queda en
stdout; las capturas en `output/*.png` (una por pantalla, más
`login-dashboard.png`, `add-to-roster.png` y `settings-lang-*.png`).

## El flujo de Add to Roster escribe datos reales

`PBS_SMOKE_BASE_URL` se valida contra `localhost`/`127.0.0.1`/`::1` antes de
correr nada — el script se niega (exit 2) si apunta a cualquier otro host,
justo porque este flujo hace un hire + revert real contra la base.

Sobre qué queda en la DB: el POST `/company/staff` reutiliza la fila
existente de `relationships` (company_id + seafarer_id) si ya hay una —
no inserta una nueva. La primera corrida de la vida de una base crea 1 fila;
todas las corridas siguientes solo alternan el `status` de esa misma fila
entre `active`/`ended`. No se acumula una fila `ended` por corrida.

## Qué NO hace

No es un test de aceptación funcional profundo (no verifica que los datos
mostrados sean correctos) — es un smoke test de "¿esto carga sin romperse?".
Sirve como gate antes de cada fase de la reescritura (R4 en adelante), no
reemplaza un click-through real.
