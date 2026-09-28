# Leto — Project Manager
**Última actualización:** 2026-06-11
**PM:** Claude (Cowork mode)
**Repositorio:** https://github.com/RichoX-Hub/Leto-Demo
**Equipo:** Rick (lead dev) · IDM (backend, part-time)

> 📌 **DOCUMENTO DEL PM — SOLO LECTURA PARA EL DEV.** Este archivo lo mantiene el PM (Claude/Cowork). El developer lo **lee** al iniciar cada sesión pero **no lo edita**. Para responder al PM, registrar avances o pedir algo: usar `Handover.md` (compartido) o el session log del día. Los demás `.md` del repo (Handover, specs, docs) sí son editables por ambos.

---

## 💬 COMENTARIOS DEL PM (PM → Dev)

> Sección de directivas y notas del PM al developer. Lo más reciente arriba.

### 2026-06-12 — Revisión de sesiones 06-11 / 06-12 + 3 directivas
Muy buen trabajo: Interface Tripulante 100% completo, deploy a producción **LIVE**, y cerraste casi toda la deuda de la auditoría (404 de badges ✅, validación fecha emisión ✅, teléfono ✅, `ai_verdict` ✅, company export Obj.2 ✅, MetaDetails real ✅). El fix del 502 (FastAPI sin bindear puerto → thread en background + `--no-cpu-throttling`) fue un buen diagnóstico.

**🚦 1 — GATE OBLIGATORIO DE LOCALHOST ANTES DE CADA PUSH A PRODUCCIÓN (directiva de Rick, no negociable):**
**No hagas `gcloud run deploy` / push a Cloud Run sin que Rick haya probado primero en su localhost.** El flujo es: dev termina cambios → `docker compose up -d` → Rick prueba las funcionalidades en `http://localhost:4000` por su cuenta → Rick da el OK explícito → recién ahí el dev hace build + push + deploy. Aplica a TODO push de producción de aquí en adelante. (Esto formaliza el "Item 4: localhost approval gate" del log 06-12.)

**🟠 2 — Duplicidad del compliance engine en la UI (pendiente, atender):**
El panel del perfil (Phase 4, `MyProfile.js`) usa `GET /api/compliance/me` (motor STCW, nivel certificado) mientras Library usa `GET /api/seafarer/me/required-docs` (motor IMO, nivel título). **Son dos motores distintos → pueden mostrar conteos de "faltantes" diferentes** y confundir al seafarer (ve un número en el perfil y otro en Documentos). Decidir **una sola fuente** para el resumen de faltantes, o etiquetar claramente en la UI que miden cosas distintas. No es bloqueante, pero es deuda de consistencia que conviene cerrar antes de tener usuarios reales.

**🔒 3 — Secretos en Cloud Run → mover a Secret Manager:**
Las 6 env vars (`GOOGLE_VISION_API_KEY`, `GOOGLE_DRIVE_CLIENT_SECRET`, `DRIVE_TOKEN_SECRET`, `DRIVE_STATE_SECRET`, etc.) quedaron como env vars planas. Para producción real, mover al menos las sensibles a **Secret Manager** y referenciarlas con `--set-secrets`. Las env vars planas son visibles para cualquiera con acceso a la consola del proyecto.

**📌 Nota menor:** el log 06-12 dice "Next sprint: Obj.1 Document Set Engine (port requirements to backend)", pero eso ya se hizo el 06-10 (`document_requirements.py` existe y se usa). Aclarar con el PM qué es lo que realmente sigue antes de arrancar.

---

### 2026-06-11 — ⚠️ RESUELTO: instancia Cloud SQL de Leto (era un error grave de doc)
**Hallazgo:** los docs decían crear `leto_db` en **`arval-postgres`**, pero `gcloud sql instances list --project durable-sky-484422-b5` mostró que ese proyecto es **infra compartida de PBS** con instancias de **otros clientes**: `arval-postgres` y `jeb-postgres`. **No existía ninguna `leto-postgres`.** Seguir los docs habría metido la DB de Leto dentro del Postgres del cliente Arval (co-mezcla de datos) y reseteado su password. Detonante: el gcloud local estaba autenticado con la **service account por defecto del propio proyecto** (`420430979947-compute@…`) en vez de `admin@pbtradingsolutions.com`; esa SA no tiene permisos de Cloud SQL. *(Corrección 2026-06-12: `420430979947` es el número de proyecto de `durable-sky-484422-b5` — confirmado por la URL de Cloud Run `pb-leto-420430979947.us-central1.run.app`. NO era una credencial "ajena" como se anotó al inicio, sino la compute SA del propio proyecto Leto, sub-privilegiada.)*

**Decisión (Rick, 2026-06-11):** Leto tendrá **instancia propia `leto-postgres`** en `durable-sky-484422-b5`, **compartida por Leto + Cástor** (correcto: ambos son un solo backend FastAPI + una sola DB `leto_db`, split por rol seafarer/company). Connection name: `durable-sky-484422-b5:us-central1:leto-postgres`.

**Acción ya hecha:** renombrado `arval-postgres` → `leto-postgres` en `Handover.md` y `Project_Manager.md`.

**🚫 REGLA DURA:** `arval-postgres` y `jeb-postgres` son de **otros clientes**. Nunca crear `leto_db`, ni resetear passwords, ni conectar Leto a esas instancias. Antes de cualquier `gcloud sql ...` de producción, verificar que la cuenta activa sea `admin@pbtradingsolutions.com` (`gcloud auth list`) y la instancia sea `leto-postgres`.

### 2026-06-11 (auditoría de código — Digital Dossier + Interface Tripulante)
Revisé ambos sprints a nivel de código. **Buen trabajo: el grueso está sólido y bien cableado** (servicios, routers registrados, migraciones, wiring frontend verificados; la fachada `/me/profile` sí persiste AMP → no rompe compliance). Detalle completo en `Handover.md § AUDITORÍA PM 2026-06-11`. Acciones por prioridad:

1. 🔴 **Arreglar el 404 de badges (bloqueante del Learning Record).** `seafarers.py:181` y `:191`: las rutas por-id son `/{seafarer_id}/badges` → quedan en `/api/{id}/badges`. El frontend (`Addons.js:327`, `Learning.js:264`) llama a `/api/seafarers/{id}/badges`. **Cambiar ambas rutas a `/seafarers/{seafarer_id}/badges`.** Verificar que el panel "My Learning Record" y los badges de My Exams vuelvan a cargar.
2. 🟠 **Unificar el origen del compliance en la UI.** Perfil (Phase 4) usa `/api/compliance/me` y Library usa `/api/seafarer/me/required-docs` — motores distintos, conteos potencialmente distintos. Elegir una fuente para el "resumen de faltantes", o etiquetar claramente que miden cosas distintas.
3. 🟡 **Corregir claims menores:** banner dice "8 endpoints" de Drive (son 7); la spec dice `residence_city` pero el código usa `city`. Alinear docs.
4. **Nota:** la "validación de fecha de emisión" ya la hiciste (`Library.js:337`) — la saqué de la deuda. Quedan reales: export masivo company (Obj.2) y `GOOGLE_VISION_API_KEY` (Obj.3).

**Disciplina de handover:** sigue creando el `session_YYYY-MM-DD.md` por sesión (esta vez logueaste en el banner/spec pero no en un session file aparte).

### 2026-06-11 (tarde) — Arranca sprint "Interface Tripulante"
- **EPIC Digital Dossier cerrado** (Fase 0 + Obj.1–4). Buen trabajo y buena disciplina de handover. 👏
- **Nuevo sprint especificado:** `docs/specs/INTERFACE_TRIPULANTE_SPRINT.md` (User Panel Phases 2–5). **Empezar por Fase 0: consolidar la persistencia del perfil.** Hoy un mismo dato se escribe en 4 sitios (localStorage `leto-profile-extra` + `/api/seafarers/{id}/profile` + `/amp-profile` + `/crewing-api/.../settings`). Objetivo: **backend = fuente única, localStorage = cache**. Esto previene bugs de divergencia como los de fechas que ya pagamos en Digital Dossier.
- **Orden:** Fase 0 → Phase 2 (Residencia & Contacto, incluye **contacto de emergencia** que hoy no existe) → Phase 3 (Professional) → Phase 4 (Documents/Compliance link) → Phase 5 (Ribbons).
- **Aprovecha el sprint para cerrar 2 deudas:** (a) la QA de Obj.1 (`RANK_REQUIRED_DOCS` vs `Regulation.md §5–§22`) encaja en Phase 3; (b) la validación de fecha de emisión requerida (Fase 0 del Digital Dossier) si tocas el form de documentos.
- **Mobile-first** en todo panel del marino (regla del proyecto).
- Los env vars de producción (Drive/Vision) siguen pendientes de Rick — no bloquean este sprint.

### 2026-06-11
- **Excelente ritmo:** Fase 0 + Obj.1 + Obj.2 + Obj.3 cerrados y bien documentados en `session_2026-06-10.md`. Obj.4 ya arrancó (capa de servicio Drive lista). 👏
- **Disciplina de handover:** agregué al `Handover.md` un bloque "CÓMO MANTENER ESTE DOCUMENTO". Por favor síguelo al cerrar cada sesión — sobre todo mantener el banner "ÚLTIMA ACTUALIZACIÓN" sincronizado y volcar la deuda diferida a "carried-forward".
- **No perder esta deuda abierta** (priorizar cuando haya hueco):
  1. **Obj.1 QA** — cruzar `RANK_REQUIRED_DOCS` vs `Regulation.md §5–§22` por rango. Es compliance real, no cosmético.
  2. **Obj.2** — falta el **export masivo del company** (`/api/company/seafarers/{id}/export` + `export-all`, solo docs `verified`). Hoy solo existe el self-export del seafarer.
  3. **Obj.3** — corre con MockOcrProvider; setear `GOOGLE_VISION_API_KEY` real antes de producción.
- **Obj.4 — al implementar el connector:** reusar el `export-manifest` (Obj.2) para el backup y el pipeline `doc_analyzer` (Obj.3) para validar imports. Seguridad: el consentimiento OAuth lo da el usuario (no automatizar), validar `state` (CSRF) en el callback, y setear `DRIVE_TOKEN_SECRET` real (hoy hay fallback marcado "not_for_production"). Detalle del runway en el banner del Handover y en `docs/specs/DIGITAL_DOSSIER_SPRINT.md`.

---

## VISIÓN DEL PRODUCTO

Leto es una plataforma SaaS bidireccional de gestión de talento marítimo. No es un portal de empleo — es la infraestructura operativa de la relación laboral marítima, desde el reclutamiento hasta el cierre del contrato.

- **Tripulante (Seafarer):** perfil verificado, documentos con alertas STCW, historial de embarques, disponibilidad.
- **Empresa Naviera (Company):** búsqueda con matching real, gestión de contratos activos, rotaciones, compliance MLC 2006.
- **Principio rector:** "Compliance by Design" — el cumplimiento normativo es arquitectura, no un add-on.

---

## STACK TECNOLÓGICO

| Capa | Tecnología |
|---|---|
| Landing + Auth | Vite React (TypeScript) + Zustand — `IDM/frontend/` |
| Auth backend | FastAPI JWT (HS256) — email+password, roles: `seafarer` / `company` |
| Crewing App | React 18 + Webpack + Less — `IDM/src/` (base Stremio, totalmente adaptado) |
| Crewing API | Express.js + `http_server.js` + `apiRoutes.js` (file uploads, user data) |
| App Backend | FastAPI (Python 3.11) + SQLAlchemy + uvicorn — `IDM/backend/` |
| Base de datos | PostgreSQL 16 — Cloud SQL `leto-postgres`, database `leto_db` |
| Hosting | GCP Cloud Run — `pb-leto` (single-container monolith, `Dockerfile.prod`) |
| CI/CD (futuro) | GitHub Actions |

---

## ARQUITECTURA ACTUAL

```
IDM Stack — local: docker compose up (5 services) / prod: Dockerfile.prod (1 container)

nginx :3000 (local) / :80 (prod)
  ├── /           → Vite React (frontend) — Landing + Login/Register + Dashboard wrapper
  ├── /api/       → FastAPI (backend :8000) — auth, seafarers, compliance, company
  └── /app/       → Express crewing module (:8080) — crewing SPA (Webpack)

Vite React (frontend/src/pages/)
  ├── LandingPage     ← Marketing + 3-step RegisterModal + LoginModal
  └── Dashboard       ← iframe → /app/#/my-profile (seafarer) o /app/#/company-dashboard (company)

Crewing Module (src/routes/)
  ├── #/my-profile           → Seafarer: Perfil + badges flota/rango
  ├── #/compliance           → Seafarer: Dashboard STCW/AMP (ScoreRing + doc cards)
  ├── #/myfiles              → Seafarer: Mis documentos (upload, preview, PDF rotate)
  ├── #/calendar             → Seafarer: Disponibilidad
  ├── #/myexams              → Seafarer: 83 cursos IMO + reserva
  ├── #/company-dashboard    → Company: KPIs flota + tabla tripulantes filtrable
  ├── #/company-crewdb       → Company: Búsqueda avanzada (pendiente)
  ├── #/company-calendar     → Company: Calendario operaciones (pendiente)
  └── #/settings             → Configuración

FastAPI (backend/app/routers/)
  ├── /api/auth/             → register, login, refresh, me
  ├── /api/seafarers/        → perfil seafarer CRUD
  ├── /api/documents/        → documentos del seafarer
  ├── /api/compliance/       → /me (informe), /catalog/{rank} (catálogo por rango)
  └── /api/company/          → /seafarers (lista con compliance_score en tiempo real)
```

---

## MODELO DE USUARIOS

| Rol | Acceso | Monetización |
|---|---|---|
| `seafarer` | Dashboard, Mis Docs, Disponibilidad, Mi Perfil, Mis Exámenes | Siempre gratuito |
| `company_admin` | Dashboard flota, Crew Database, Contratos, Calendario, Documentos corporativos | Suscripción mensual |
| `company_staff` | Acceso limitado definido por company_admin | Incluido en suscripción |

---

## HOJA DE RUTA

### ✅ COMPLETADO (al 2026-05-10)

**Base del crewing module (sesiones 03-2026)**
- Crewing module funcional basado en Stremio (8 rutas activas)
- Alias interno `stremio` → `leto` renombrado en 150+ archivos
- My Files: gestión de documentos con carga, preview, PDF rotate y metadatos
- My Exams: catálogo de 83 cursos IMO con reserva de exámenes
- Calendarios: Company Calendar + Seafarer Calendar con confirmación de entrevistas
- SeafarerSchedule: timeline de carrera y contratos
- Session logs: 2026-03-17, 03-25, 03-27, 03-28

**IDM Stack completo (sesión 2026-05-10)**
- Stack 5 servicios: nginx + Vite React (TS) + FastAPI + PostgreSQL + Webpack/Express crewing
- JWT auth (email+password): registro 3 pasos, login, refresh token, roles seafarer/company
- RegisterModal 3 pasos: datos básicos → rango + categoría de flota → documentos STCW/AMP requeridos
- Compliance engine: catálogos para merchant (STCW) + offshore (AMP §18) + fishing (AMP §20) + yacht (AMP §19) + national (AMP §21) — 40+ rangos
- Compliance Dashboard (`#/compliance`): ScoreRing SVG, filtro por estado, doc cards con fechas y días restantes
- Company Dashboard (`#/company-dashboard`): KPI cards, quick links, tabla filtrable con compliance_score
- API `/api/company/seafarers`: compliance calculado en tiempo real por seafarer
- My Profile: badges de fleet_category + rango con colores por categoría
- Dashboard.tsx: routing basado en rol (company → company-dashboard, seafarer → my-profile)
- Cloud Run ready: `Dockerfile.prod` (3-stage), `nginx-cloudrun.conf`, `supervisord.prod.conf`
- `GCLOUD-DEPLOY.md` actualizado con sección completa de Leto IDM

---

### 🔵 PRÓXIMO INMEDIATO — DEPLOY + EMPRESA (post 2026-05-10)

**Objetivo:** Leto IDM live en Cloud Run + completar flujos de empresa.

#### Deploy (acción del usuario — VS Code terminal)
- [ ] `gcloud sql connect leto-postgres` → CREATE DATABASE leto_db + usuario
- [ ] `docker build -f Dockerfile.prod` + `gcloud run deploy pb-leto --port 80 --add-cloudsql-instances`
- [ ] Verificar `/health` responde `{"status":"ok"}` en Cloud Run URL
- [ ] Actualizar card en `DemoApp.jsx` si URL cambia

#### Interface Empresa — completar
- [ ] `#/company-crewdb` — búsqueda avanzada (filtros rango, categoría, compliance mínimo, disponibilidad)
- [ ] `#/company-calendar` — calendario de operaciones (entrevistas agendadas, rotaciones)
- [ ] Sidebar role-split: tabs empresa vs tripulante son diferentes conjuntos
- [ ] Matching engine: validar docs vigentes + rango vs tipo de barco específico

---

### 🟢 EPIC ACTIVO — DIGITAL DOSSIER (Bóveda de Documentos Verificada) — 2026-06-10

**Objetivo:** convertir MyFiles en una bóveda verificada de extremo a extremo. Spec completa con estado real del código, tareas y criterios de aceptación en **`docs/specs/DIGITAL_DOSSIER_SPRINT.md`** (leer ese doc antes de iniciar).

Decisiones (Rick, 2026-06-10): motor de requeridos → **backend** con fallback JS + alerta/log al admin · OCR → **Cloud (Vision/Textract)** · Drive → **backup + import bidireccional** · imágenes de referencia → **vía Admin Panel**.

- [ ] **Fase 0 — Cimientos:** persistencia JWT end-to-end, fix fecha (timezone), alinear umbrales vencimiento (§11.1), validación fecha emisión, campo `issuing_country`, arrancar `seafarer_code`, company panel lee backend (no demo), i18n, sincronizar `models/document.py`.
- [ ] **Obj.1 — Document Set Engine:** portar `getRequiredDocsByProfile` a `app/services/document_requirements.py`; endpoints `/seafarer/me/required-docs` y `/compliance/required-docs`; fallback JS con alerta+log admin; cruce contra `Regulation.md`.
- [ ] **Obj.2 — Code-name + Export:** `[Rank]_[RegCode]_[País]_[UserCode]_exp[YYYYMMDD]` en `cert_code`/`code_name`; descarga renombrada; export dossier en 6 carpetas (seafarer + company masivo).
- [ ] **Obj.3 — OCR Doc Analyzer:** `doc_type_rules` (admin), worker Celery, `ai_verdict`, detección `wrong_document` (ej. pasaporte en slot seaman book), human-in-the-loop.
- [ ] **Obj.4 — Google Drive connector:** OAuth por usuario en `/app/#/settings`, backup + import (import valida con OCR), sync masivo de crew dossiers (company).

**Dependencias:** Obj.2 depende de Obj.1 + `seafarer_code`. Obj.4 usa el export de Obj.2 y la validación de Obj.3.

---

### 🟡 PRÓXIMO — INTERFACE TRIPULANTE

**Objetivo:** El tripulante tiene una experiencia completa desde su dashboard.

- [ ] Dashboard: vista unificada (contrato activo, docs próximos a vencer, disponibilidad, próximos exámenes)
- [ ] Mis Documentos: conectar uploads al Seafarer Calendar (alertas de vencimiento)
- [ ] Mis Documentos: conectar a Mis Exámenes (sugerencias de renovación)
- [ ] Mi Perfil: leer datos reales desde Supabase `profiles` (en vez de mock hash data)
- [ ] Mis Exámenes: conectar estado de exámenes con documentos (marcar como renovado)
- [ ] MetaDetails: leer perfil real desde User Database (en vez de mock data generado por hash)
- [ ] Crew Database: visibilidad controlada por disponibilidad del tripulante

---

### 🟡 PRÓXIMO — INTERFACE EMPRESA (continuación)

**Objetivo:** La empresa puede operar su flota completa desde Leto.

- [x] Dashboard empresa: KPIs flota, compliance summary, tabla tripulantes filtrable ✅ 2026-05-10
- [x] API `/api/company/seafarers` con compliance_score en tiempo real ✅ 2026-05-10
- [ ] Crew Database (`#/company-crewdb`): filtros por rango, categoría, disponibilidad, docs válidos
- [ ] Matching engine: validar docs + vigencia + rango para tipo de barco específico
- [ ] Contratos: crear, activar, completar, terminar
- [ ] Rotación de barcos durante contrato vigente
- [ ] Vacaciones: CRUD con validación MLC 2006 (bloqueo duro)
- [ ] Entrevistas: agendar, notificar al marino, confirmar asistencia
- [ ] Separar sidebar por rol (Empresa vs Tripulante ven tabs diferentes)

---

### 🔴 FUTURO — CONTRATOS Y MLC

**Objetivo:** El objeto Contrato vivo, con validación MLC 2006 como bloqueo duro.

- [ ] Modelo de datos Contrato completo (ver LETO_MASTER_PROMPT.md §4)
- [ ] VesselRotation: cambio de barco sin romper el contrato
- [ ] LeaveRecord: vacaciones validadas contra MLC Reg. 2.4
- [ ] SeafarerExperienceLog: historial inmutable generado al cerrar contratos
- [ ] Notifications: alertas cruzadas marino ↔ empresa
- [ ] MLC validator: HTTP 409 en operaciones ilegales, sin override posible
- [ ] Tests MLC: 100% coverage obligatorio

---

### 🔴 FUTURO — MONETIZACIÓN Y PRODUCCIÓN

- [ ] Stripe: suscripciones por tier (Starter $149 / Pro $399 / Enterprise $999+)
- [ ] Cobro transaccional por contrato generado ($15–25)
- [ ] Integración ISOlympus: importar flota via API key
- [x] Infraestructura GCP Cloud Run — `Dockerfile.prod` + Cloud SQL listo ✅ 2026-05-10
- [ ] GitHub Actions CI/CD
- [ ] Panel admin interno (PBS)
- [ ] Onboarding guiado mejorado con agente Leto (análisis de rango → documentos faltantes)

---

## REGLAS NO NEGOCIABLES (MLC 2006)

Estas reglas se implementan como **bloqueos duros** (HTTP 409). No son advertencias. No tienen override.

| Regulación | Regla |
|---|---|
| MLC Reg. 2.4 | Mínimo 2.5 días de descanso acumulados por mes trabajado |
| MLC Reg. 2.3 | Máximo 11 meses de servicio continuo sin descanso |
| MLC Reg. 2.3 | Mínimo 10h descanso en 24h / 77h en 7 días |

La lógica MLC vive **únicamente** en un archivo: `mlc_validator.py` (futuro). Nunca duplicar.

---

## CONVENCIONES DEL PROYECTO

- PKs siempre UUID. Nunca integers.
- Endpoints seafarer: `require_seafarer_role`. Endpoints empresa: `require_company_role`. Nunca mezclar.
- Lógica de negocio NUNCA en endpoints. Solo en services.
- Feature-based en frontend: `seafarer/` y `company/` nunca se importan entre sí.
- Todo panel del marino debe ser mobile-first.
- Los formularios NO reimplementan validaciones MLC — solo muestran el mensaje del 409.

---

## DOCUMENTACIÓN DE REFERENCIA

| Archivo | Contenido |
|---|---|
| `IDM/docs/CREWING-MODULE.md` | Arquitectura completa del crewing module |
| `IDM/docs/STRUCTURE.md` | Estructura de carpetas del stack completo |
| `IDM/docs/AUTH-FLOW.md` | Flujo de identidad (localStorage sharing) |
| `IDM/docs/NAMING-CONVENTION.md` | Convención de alias leto/* |
| `IDM/docs/sessions/` | Logs de sesión por fecha |
| `Reference/LETO_MASTER_PROMPT.md` | Visión completa del producto + roadmap |
| `Handover.md` | Estado actual y pendientes (actualizado por Rick) |

---

*Documento vivo — actualizar en cada sesión de PM.*
