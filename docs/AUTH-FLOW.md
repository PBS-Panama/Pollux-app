# Leto — Auth Flow & Identity Bridge

## El problema

Leto tiene dos apps React independientes compiladas por separado:

| App | Ruta | Stack |
|---|---|---|
| Landing Page | `/` | Vite + TypeScript + Tailwind |
| Crewing Module | `/app/` | Webpack + CommonJS + Less |

No pueden importarse código entre sí. Pero ambas corren bajo el mismo origen (`localhost:3000`) gracias a Nginx, lo que significa que **comparten el mismo `localStorage`**. Ese es el puente.

---

## Flujo de login

```
USUARIO → LoginModal (landing page)
        │
        ▼
1. POST /api/auth/login          → FastAPI
        └─► { access_token, refresh_token }
        │
        ▼
2. GET  /api/auth/me             → FastAPI
   header: Bearer {access_token}
        └─► { id: "f703542f-...", email: "...", ... }
        │
        ▼
3. login(user, tokens)           → Zustand (leto-auth en localStorage)
        │
        ▼
4. POST /crewing-api/users/{UUID}/init     → Express (crewing module)
        └─► crea User database/{UUID}/ si no existe
        │
        ▼
5. localStorage.setItem('leto-user', {
       id:             "f703542f-cf4d-48eb-aa5f-764a610c7adb",
       email:          "demo@leto.com",
       rank:           "master",
       first_name:     "Carlos",
       last_name:      "Marino",
       date_of_birth:  "1991-02-20"
   })
        │
        ▼
6. navigate('/dashboard')
   → ProtectedRoute checks accessToken (Zustand + localStorage fallback)
   → renders Dashboard with iframe to /app/  →  iframe full-screen carga /app/
```

---

## Cómo el crewing module lee la identidad

```js
// NavMenuContent.js — al montar el componente
const getLetoUser = () => {
    const data = localStorage.getItem('leto-user')
    return data ? JSON.parse(data) : null
}
```

```js
// apiClient.js — en cada llamada a la API
const getUserId = () => {
    const data = localStorage.getItem('leto-user')
    return JSON.parse(data).id  // UUID real
    // fallback: 'SF-001'
}
```

No hay tokens pasados por URL. No hay `postMessage`. No hay cookies.
El iframe está en `localhost:3000/app/` — mismo origen, mismo `localStorage`.

---

## Qué usa cada módulo

| Módulo | Uso |
|---|---|
| `NavMenuContent.js` | Nombre + rank en seafarer card |
| `apiClient.getUserId()` | UUID en todas las rutas `/crewing-api/users/{id}/...` |
| `seafarerStore.js` | Sync de calendario, entrevistas, exámenes |
| `useDocumentUpload.js` | Upload/lectura de documentos por usuario |

---

## Aislamiento de datos por UUID

Antes todos los usuarios compartían `User database/SF-001/`.
Ahora cada usuario tiene su propia carpeta:

```
User database/
  f703542f-cf4d-48eb-aa5f-764a610c7adb/   ← demo@leto.com
    settings/data.json   → { rank: "master" }
    calendar/data.json   → períodos de disponibilidad
    myfiles/uploads/     → documentos PDF subidos
    myexams/data.json    → exámenes reservados
    dashboard/data.json  → contratos, rotaciones
```

---

## Logout

El botón está **solo** en el dropdown del crewing module (NavMenuContent):

```js
localStorage.removeItem('leto-auth')   // borra JWT (Zustand)
localStorage.removeItem('leto-user')   // borra identidad (crewing)
window.top.location.href = '/'         // redirige toda la ventana a landing
```

`window.top` es necesario porque el botón vive dentro del iframe.

---

## Diagrama

```
localhost:3000/                    localhost:3000/app/
┌────────────────────┐            ┌──────────────────────────┐
│   Landing Page     │            │    Crewing Module        │
│   (Vite/React)     │            │    (Webpack/React)       │
│                    │   iframe   │                          │
│  Login → escribe   │ ─────────► │  Lee 'leto-user'         │
│  'leto-user'       │            │  → muestra seafarer card │
│  en localStorage   │            │  → getUserId() → UUID    │
│                    │            │  → /crewing-api/users/…  │
└────────────────────┘            └──────────────────────────┘
         ▲                                    │
         └──── logout: window.top.href = '/' ─┘

    mismo origen = mismo localStorage = identidad compartida
```

---

## Endpoints FastAPI activos

| URL | Descripción |
|---|---|
| `http://localhost:3000/api/docs` | Swagger UI interactivo |
| `http://localhost:3000/api/redoc` | ReDoc (documentación legible) |
| `http://localhost:3000/api/openapi.json` | Schema OpenAPI raw |
| `http://localhost:3000/api/auth/login` | POST — obtener tokens |
| `http://localhost:3000/api/auth/register` | POST — crear cuenta |
| `http://localhost:3000/api/auth/me` | GET — perfil del usuario autenticado |
| `http://localhost:3000/health` | GET — health check del backend |

---

## Keys de localStorage

| Key | Escrito por | Leído por | Contenido |
|---|---|---|---|
| `leto-auth` | Zustand (authStore) | Landing page (rutas protegidas), MyProfile (fallback DOB fetch) | JWT + user object |
| `leto-user` | LoginModal / RegisterModal | Crewing module (NavMenu, apiClient, MyProfile) | `{ id, email, rank, first_name, last_name, date_of_birth }` |
| `leto-profile-extra` | MyProfile (on save) | MyProfile | `{ city, experience, languages, vessels, companies, aboutMe }` |
| `leto-keyboard-shortcuts` | Settings/Interface | KeyboardShortcuts.js | `'on'` o `'off'` — toggle de atajos de teclado |