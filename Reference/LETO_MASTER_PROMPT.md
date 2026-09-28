# LETO — MASTER PROMPT v1.0
### Contexto completo para proyecto independiente en Claude
### PBS · PB Trading Solution · Panamá · 2026

---

## INSTRUCCIÓN DE ARRANQUE

Este documento es el contexto completo del proyecto Leto. Pégalo al inicio de cualquier conversación nueva en Claude o Claude Code. Contiene todo lo que necesitas para continuar el desarrollo sin perder contexto.

---

## 1. CONTEXTO DE LA EMPRESA

```
Empresa:       PB Trading Solution (PBS)
Fundada:       2019 · Panamá, República de Panamá
Website:       pbtradingsolutions.com
GitHub:        github.com/RichoX-Hub/pbtradingsolutions.com
Estado:        Incorporada · Productos en desarrollo · Pre-revenue
Principio:     "Compliance by Design" — el compliance es arquitectura, no un add-on

INFRAESTRUCTURA EXISTENTE:
  Hosting:     GCP Cloud Run + nginx
  DB actual:   MongoDB Atlas
  Frontend:    React + Vite
  Backend:     Python FastAPI

PORTAFOLIO PBS (15 productos, 3 tiers):

  TIER 3 — ERP Industrial (alto ticket):
    Neptune   ERP Marítimo (SOLAS, MARPOL, SFI)
    Gea       ERP Instalaciones Industriales (ISO 9001/14001/45001)
    Zeus      ERP Aviación (IATA, ICAO)
    Demeter   ERP Transporte Terrestre

  TIER 2 — SaaS Módulos (WaaS):
    Themis    Legal y documentación
    Janus     ISO Compliance y auditorías
    Kaliope   Reportería automatizada (microservicio Jinja2/PDF/DOCX)
    Hermes    Procurement
    Hades     Finanzas y contabilidad (SFEP)
    Hera      CRM
    Leto      RRHH y gestión de talento marítimo  ← ESTE PROYECTO
    Cronos    Gestión de proyectos

  TIER 1 — Personal:
    Iris      Productividad personal (en desarrollo activo)
    Heracles  Wellness
    Athena    Asistente académico

FASES PBS:
  Fase 1 · 2026:   Iris + Leto + plataforma compartida
  Fase 2 · 2027:   Todos los módulos Tier 2 restantes
  Fase 3 · 2028+:  ERPs industriales (Neptune primero)
```

---

## 2. QUÉ ES LETO

```
Nombre:        Leto
Clasificación: Tier 2 PBS — RRHH y gestión de talento
Tipo:          SaaS bidireccional — marino y empresa en el mismo ecosistema
Principio:     No es un portal de empleo. Es la infraestructura operativa
               de la relación laboral marítima — desde la búsqueda hasta
               el fin del contrato.

PROPUESTA DE VALOR:
  Para el marino:  perfil verificado, documentos con alertas, historial
                   auditado de embarques, calendario de disponibilidad.
  Para la empresa: búsqueda con matching real, gestión de contratos
                   activos, rotaciones, vacaciones con bloqueo MLC.
  Para ambos:      cada acción de uno tiene efecto directo en el panel
                   del otro. El ciclo completo ocurre dentro de Leto.

INTEGRACIÓN FUTURA (Fase 4 de Leto / Fase 3 PBS):
  ISOlympus: app Python/PyQt de gestión ISO existente en el ecosistema.
             En Fase 4, las empresas importan su flota a Leto via API key.
             Campos isolympus_company_id e isolympus_vessel_id presentes
             desde Fase 1 como nullable en Company y Vessel.
  Neptune:   El historial de tripulación de Leto alimenta el ERP marítimo.
             Las empresas que usan Leto llegan a Neptune con datos listos.
```

---

## 3. TIPOS DE USUARIO

```
USUARIO TIPO A — MARINO (Seafarer)
  Rol en sistema:  seafarer
  Monetización:    SIEMPRE GRATUITO — es el supply de la plataforma
  Paneles:
    → Documentos: sube certificados STCW, libro de mar, médico, pasaporte.
                  Alertas automáticas 30 días y 7 días antes del vencimiento.
    → Cursos:     obligatorios por rango / recomendados / ofrecidos por empresas.
    → Disponibilidad: calendario embarcado / disponible / descanso.
                      Conectado automáticamente al contrato activo.
    → Dashboard:  vista unificada de toda la información crítica.
    → Historial:  SeafarerExperienceLog generado automáticamente al cerrar
                  o rotar contrato. verified=true si fue generado por Leto.

USUARIO TIPO B — EMPRESA NAVIERA (Company)
  Rol en sistema:  company_admin / company_staff
  Monetización:    Suscripción mensual por flota
  Paneles:
    → Búsqueda:   filtros por rango, nacionalidad, especialidad.
                  Matching por documentos válidos para tipo específico de nave.
    → Agenda/HR:  entrevistas con notificación automática al marino.
    → Tripulación activa por barco:
                  - Vista: Company → Flota → Barco → Contratos activos
                  - Gestión de vacaciones (validada MLC, bloqueada si ilegal)
                  - Rotación de barcos durante contrato vigente
                  - Dotación requerida SOLAS vs tripulación actual
    → Documentos: documentación corporativa de la empresa.
    → Dashboard:  vista operativa de toda la flota en una pantalla.

REGLA ABSOLUTA:
  Los endpoints de marino usan Depends(require_seafarer_role).
  Los endpoints de empresa usan Depends(require_company_role).
  NUNCA mezclar permisos en el mismo endpoint.
```

---

## 4. EL CONTRATO — OBJETO CENTRAL

```
El Contrato es la entidad más importante del sistema.
Todo lo demás deriva de él. Sin un Contrato activo no hay
vacaciones, rotaciones, historial ni notificaciones.

CAMPOS DEL CONTRATO:
  id                   UUID (PK — nunca integer)
  company_id           UUID FK → Company
  seafarer_id          UUID FK → Seafarer
  vessel_id            UUID FK → Vessel (cambia en rotaciones, NO rompe el contrato)
  rank_on_contract     ENUM (rango del marino en este contrato)
  port_of_embarkation  String
  start_date           Date
  projected_end_date   Date
  actual_end_date      Date (nullable — null si activo)
  salary_amount        Decimal
  salary_currency      String
  status               ENUM: draft / active / completed / terminated / suspended
  mlc_convention       String (convenio colectivo o CBA aplicable)
  created_at           DateTime auto
  updated_at           DateTime auto-update

ENTIDADES QUE DERIVAN DEL CONTRATO:

  VesselRotation — cuando la empresa mueve al marino a otro barco:
    contract_id, from_vessel_id, to_vessel_id, rotation_date,
    port_of_transfer, reason, notes
    → El contract_id NO cambia. Solo cambia vessel_id en Contract.
    → Antes de rotar: validar que marino tiene docs requeridos para el NUEVO barco.
    → Al rotar: genera SeafarerExperienceLog del período en el barco anterior.

  LeaveRecord — vacaciones (siempre validadas contra MLC antes de persistir):
    contract_id, seafarer_id, leave_type ENUM, start_date, end_date,
    days_count, requested_by ENUM, status ENUM,
    mlc_validation_passed (bool), mlc_validation_notes
    → Solo se persiste si mlc_validation_passed = True.

  SeafarerExperienceLog — historial inmutable (snapshot, no FK viva):
    seafarer_id, contract_id, vessel_id,
    vessel_type (snapshot), vessel_name (snapshot), company_name (snapshot),
    rank_held, start_date, end_date, total_days,
    verified (bool — true solo si generado por Leto, false si importado)
    → Se genera: (a) al rotar de barco, (b) al completar/terminar contrato.

  Notification — alertas cruzadas marino ↔ empresa:
    recipient_id, recipient_type ENUM (seafarer/company),
    type ENUM: document_expiry / interview_scheduled / contract_update /
               leave_approved / leave_rejected / rotation_assigned,
    title, body, is_read, related_entity_type, related_entity_id
```

---

## 5. MLC 2006 — REGLAS NO NEGOCIABLES

```
MLC 2006 (Maritime Labour Convention) es la ley internacional de trabajo marítimo.
Leto implementa estas reglas como BLOQUEOS DUROS. No son advertencias.
Una operación ilegal retorna HTTP 409 Conflict y no se procesa. Sin override posible.

REGLAS IMPLEMENTADAS:

  MLC Reg. 2.4 — VACACIONES:
    Mínimo 30 días de descanso por cada 11 meses de servicio.
    Equivale a 2.5 días acumulados por mes trabajado.
    CÁLCULO OBLIGATORIO antes de aprobar cualquier cambio:
      días_acumulados = meses_servicio_a_fecha × 2.5
      Si la operación deja al marino con MENOS días del mínimo → BLOQUEAR.

  MLC Reg. 2.3 — SERVICIO MÁXIMO:
    Período máximo de servicio continuo sin descanso: 11 meses.
    El projected_end_date no puede exceder este límite desde start_date.

  MLC Reg. 2.3 — HORAS DE DESCANSO:
    Mínimo 10 horas de descanso en cualquier período de 24 horas.
    Mínimo 77 horas de descanso en cualquier período de 7 días.

IMPLEMENTACIÓN TÉCNICA:
  → Archivo único: backend/app/services/mlc_validator.py
  → Este archivo es el ÚNICO lugar donde vive la lógica MLC. Nunca duplicar.
  → Tests obligatorios con 100% de cobertura. Sin excepción.
  → mlc_convention en el Contrato como parámetro al validador (varía por bandera/CBA).
  → HTTP 409 Conflict cuando la operación es rechazada.
  → El frontend muestra el motivo del bloqueo. No hay forma de saltarlo desde la UI.
```

---

## 6. MODELO DE NEGOCIO

```
TRES CAPAS COMPLEMENTARIAS:

  FREEMIUM — Marino (siempre gratis):
    Acceso completo: perfil, documentos, historial, disponibilidad, cursos.
    El marino gratuito es el activo que hace que la empresa pague.
    Sin marinos con historial verificado, no hay valor para empresas.

  SAAS — Empresa (suscripción mensual):
    Starter:      $149/mes — hasta 3 barcos
    Professional: $399/mes — hasta 10 barcos
    Enterprise:   $999+/mes — flota ilimitada
    Facturación anual con descuento disponible.

  TRANSACCIONAL — Por contrato generado:
    $15–25 por cada contrato creado y firmado dentro de Leto.
    Alinea incentivos: Leto gana cuando produce resultados reales.
    Integrado con Stripe en Fase 4.
```

---

## 7. STACK TECNOLÓGICO DEFINITIVO

```
Frontend:       React 18 + TypeScript + Vite + TailwindCSS
Backend:        FastAPI (Python 3.11+) + SQLAlchemy 2.0 + Alembic
Base de datos:  PostgreSQL 15
Storage:        AWS S3 / Cloudflare R2 (documentos, certificados, PDFs)
Auth:           JWT access tokens (15min) + Refresh tokens (7 días) + OAuth2
Jobs/Alertas:   Celery + Redis
Pagos (F4):     Stripe
Hosting MVP:    Railway → migración AWS ECS en Fase 4
CI/CD:          GitHub Actions
```

---

## 8. ESTRUCTURA DE CARPETAS (CANÓNICA — NO MODIFICAR)

```
leto/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── endpoints/
│   │   │       │   ├── auth.py
│   │   │       │   ├── seafarers.py
│   │   │       │   ├── companies.py
│   │   │       │   ├── contracts.py
│   │   │       │   ├── vessels.py
│   │   │       │   ├── documents.py
│   │   │       │   ├── search.py
│   │   │       │   ├── interviews.py
│   │   │       │   ├── notifications.py
│   │   │       │   └── billing.py         (Fase 4)
│   │   │       └── router.py
│   │   ├── core/
│   │   │   ├── config.py                  (pydantic BaseSettings)
│   │   │   ├── security.py                (JWT, password hashing)
│   │   │   ├── database.py                (SQLAlchemy engine + session)
│   │   │   └── storage.py                 (S3/R2 client wrapper)
│   │   ├── models/                        (SQLAlchemy ORM models)
│   │   ├── schemas/                       (Pydantic — request/response)
│   │   ├── services/
│   │   │   ├── mlc_validator.py           ← ÚNICA fuente de lógica MLC
│   │   │   ├── contract_service.py
│   │   │   ├── matching_engine.py
│   │   │   ├── experience_tracker.py
│   │   │   └── notification_service.py
│   │   ├── workers/
│   │   │   ├── celery_app.py
│   │   │   └── tasks/
│   │   │       ├── document_alerts.py     (cron diario, flags 30d/7d)
│   │   │       └── contract_alerts.py
│   │   └── main.py
│   ├── migrations/                        (Alembic)
│   ├── tests/
│   │   ├── test_mlc_validator.py          ← 100% coverage obligatorio
│   │   ├── test_contracts.py
│   │   └── test_matching_engine.py
│   └── requirements.txt
│
└── frontend/
    └── src/
        ├── app/                           (Router, providers)
        ├── features/
        │   ├── auth/
        │   ├── seafarer/                  (TODO lo del marino)
        │   │   ├── dashboard/
        │   │   ├── documents/
        │   │   ├── availability/
        │   │   ├── courses/
        │   │   └── experience/
        │   ├── company/                   (TODO lo de la empresa)
        │   │   ├── dashboard/
        │   │   ├── crew-management/
        │   │   ├── search/
        │   │   ├── agenda/
        │   │   └── documents/
        │   └── contracts/                 (compartido — objeto central)
        ├── shared/                        (componentes, hooks, utils)
        └── types/                         (TypeScript types globales)
```

---

## 9. CONVENCIONES DEL PROYECTO (SEGUIR SIEMPRE)

```
BACKEND:
  → Lógica de negocio NUNCA en endpoints. Solo en services/.
  → mlc_validator.py es el único lugar de la lógica MLC. Nunca duplicar.
  → PKs siempre UUID. Nunca integers.
  → Variables de entorno via pydantic BaseSettings. Nunca hardcodear.
  → Versionado de API: siempre /api/v1/
  → Error responses semánticos:
      422 — validación de input
      409 — violación de regla de negocio (MLC u otra)
      403 — permisos insuficientes
  → Token JWT incluye: user_id, role, company_id (null si es marino)
  → Tests MLC con 100% coverage — obligatorio antes de mergear

FRONTEND:
  → Feature-based: seafarer/ y company/ NUNCA se importan entre sí.
  → Estado global: Zustand (auth) + TanStack Query (server state)
  → TypeScript strict mode. NUNCA usar any.
  → Axios interceptor: adjunta token + maneja 401 con refresh automático.
  → Los formularios NO reimplementan validaciones MLC.
    Solo muestran el mensaje del HTTP 409.
  → Todo panel del marino debe ser mobile-first.

MODELOS:
  → Company y Vessel incluyen desde Fase 1:
      isolympus_company_id: UUID nullable
      isolympus_vessel_id:  UUID nullable
  → SeafarerExperienceLog guarda snapshots (vessel_type, vessel_name,
    company_name) para que el historial sea inmutable aunque cambien los datos.
  → Document tiene flags anti-duplicado para alertas Celery:
      alert_sent_30d: bool
      alert_sent_7d:  bool
```

---

## 10. HOJA DE RUTA — 4 FASES

```
FASE 1 · Meses 1–2 · FUNDACIÓN
  Objetivo:   Base técnica sólida + autenticación dual funcionando.
  Backend:    Auth dual JWT/OAuth2 · Modelos PostgreSQL core · Storage S3
  Full-stack: Setup CI/CD Railway · Panel docs marino · Panel docs empresa
  UI/UX:      Design system base · Flujos auth · Wireframes panels docs
  Worker:     Celery cron diario — alertas vencimiento 30d y 7d
  Entregable: Registro + documentos con alertas funcionando para ambos roles.

FASE 2 · Meses 3–4 · EL CONTRATO
  Objetivo:   El objeto Contrato vivo y operativo.
  Backend:    Motor validación MLC · CRUD contratos · Rotación barcos ·
              Jobs vacaciones/alertas · experience_tracker.py
  Full-stack: Panel tripulación/barco · Gestión vacaciones UI ·
              Historial experiencia por nave
  UI/UX:      UX gestión contratos · UI bloqueos MLC · Vista barco→tripulación
  Entregable: Empresa crea contrato, asigna marino, rota barco,
              gestiona vacaciones con bloqueo MLC automático.

FASE 3 · Meses 5–6 · ECOSISTEMA
  Objetivo:   Bidireccionalidad completa. El ciclo de reclutamiento
              ocurre dentro de Leto, sin salir a WhatsApp ni email.
  Backend:    Motor búsqueda + filtros · Matching docs/nave ·
              Notificaciones cruzadas · Agenda/entrevistas
  Full-stack: Panel disponibilidad marino · Agenda empresa ·
              Dashboard marino (mobile-first) · Dashboard empresa (flota)
  UI/UX:      UX búsqueda y matching · Panel cursos + disponibilidad
  Entregable: Ciclo completo reclutamiento dentro de Leto.

FASE 4 · Meses 7–8 · MONETIZACIÓN
  Objetivo:   Leto factura. Listo para adquisición activa de clientes.
  Backend:    Stripe suscripciones + cobro por contrato ·
              API pública · Integración ISOlympus ·
              Dotación SOLAS alerts · Panel admin interno
  Full-stack: Onboarding guiado ×2 roles · Perfil marino exportable ·
              Checkout Stripe UI
  UI/UX:      Flujo checkout · Onboarding UX ×2 roles
  Entregable: Stripe integrado. Tiers activos. Conexión ISOlympus.
```

---

## 11. MODELO DE DATOS — ENTIDADES COMPLETAS

```
User
  id, email, password_hash,
  role: ENUM(seafarer, company_admin, company_staff),
  is_active, created_at, updated_at

Seafarer (extiende User)
  user_id (FK), full_name, nationality, date_of_birth,
  rank: ENUM(AB, OS, Chief_Mate, Master, Chief_Engineer, 2nd_Mate,
             2nd_Engineer, 3rd_Mate, 3rd_Engineer, Bosun, Cook, ...),
  specialization: ENUM(Deck, Engine, Catering, Electro, Other),
  profile_photo_url, bio, is_available_for_hire

Company (extiende User)
  user_id (FK), company_name, country_of_registration, tax_id,
  contact_person, phone,
  subscription_tier: ENUM(starter, professional, enterprise),
  subscription_status, stripe_customer_id,
  isolympus_company_id (UUID nullable)

Vessel
  id (UUID), company_id (FK), imo_number, vessel_name,
  vessel_type: ENUM(Bulk_Carrier, Tanker_Chemical, Tanker_Oil,
                    Container, Tug, Cargo_General, Passenger,
                    Offshore, Ferry, Other),
  flag_state, gross_tonnage, dwt, year_built,
  required_crew (JSON — dotación mínima por rango según SOLAS),
  is_active,
  isolympus_vessel_id (UUID nullable)

Document
  id (UUID), owner_id, owner_type: ENUM(seafarer, company),
  document_type, document_name, document_number,
  issuing_authority, issue_date, expiry_date,
  file_url (S3), file_size, is_verified,
  alert_sent_30d (bool), alert_sent_7d (bool)

Contract  ← OBJETO CENTRAL
  id (UUID), company_id (FK), seafarer_id (FK), vessel_id (FK),
  rank_on_contract, port_of_embarkation, port_of_disembarkation,
  start_date, projected_end_date, actual_end_date (nullable),
  salary_amount, salary_currency,
  status: ENUM(draft, active, completed, terminated, suspended),
  mlc_convention, created_at, updated_at

VesselRotation
  id (UUID), contract_id (FK), from_vessel_id (FK), to_vessel_id (FK),
  rotation_date, port_of_transfer, reason, notes

LeaveRecord
  id (UUID), contract_id (FK), seafarer_id (FK),
  leave_type: ENUM(annual, medical, unpaid, compassionate),
  start_date, end_date, days_count,
  requested_by: ENUM(seafarer, company),
  status: ENUM(pending, approved, rejected, cancelled),
  mlc_validation_passed (bool), mlc_validation_notes

SeafarerExperienceLog
  id (UUID), seafarer_id (FK), contract_id (FK), vessel_id (FK),
  vessel_type (snapshot — string, no FK), vessel_name (snapshot),
  company_name (snapshot), rank_held,
  start_date, end_date, total_days,
  verified (bool)

Interview
  id (UUID), company_id (FK), seafarer_id (FK),
  scheduled_at, duration_minutes, meeting_link,
  status: ENUM(scheduled, completed, cancelled, no_show),
  notes, outcome

Notification
  id (UUID), recipient_id, recipient_type: ENUM(seafarer, company),
  type: ENUM(document_expiry, interview_scheduled, contract_update,
             leave_approved, leave_rejected, rotation_assigned),
  title, body, is_read, created_at,
  related_entity_type, related_entity_id

Course
  id (UUID), title, provider,
  course_type: ENUM(mandatory, recommended, company_offered),
  duration_hours, cost, currency, is_free, url,
  offered_by_company_id (FK nullable)

SeafarerCourse
  id (UUID), seafarer_id (FK), course_id (FK),
  status: ENUM(pending, in_progress, completed),
  completion_date, certificate_url
```

---

## 12. LÓGICA DE MATCHING

```
El motor de búsqueda verifica tres condiciones antes de incluir
a un marino en los resultados para un barco específico:

  CONDICIÓN 1 — Documentos válidos para el tipo de nave:
    Cada vessel_type tiene un set de certificados requeridos
    (definido en Vessel.required_crew JSON).
    El marino debe tener TODOS los certificados del set.

  CONDICIÓN 2 — Documentos vigentes:
    Ninguno de los certificados requeridos puede estar vencido
    NI vencer en los próximos 30 días.

  CONDICIÓN 3 — Compatibilidad de rango:
    El rango del marino debe ser compatible con la posición
    que la empresa busca cubrir.

  Si el marino falla CUALQUIERA de estas condiciones:
    → No aparece en los resultados para ESE barco específico.
    → Puede aparecer en resultados para otros tipos de nave.
```

---

## 13. INTEGRACIÓN ISOLYMPUS

```
ISOlympus es la app existente en el ecosistema PBS.
Estructura relevante de ISOlympus:

  ISOlympus/
  ├── ISOlympus_App.py         # Panel de Control (crea Empresas/Barcos)
  ├── core/
  │   ├── iso_cloud_manager.py # Constructor de Empresas (SGI Corporativo)
  │   ├── cloud_manager.py     # Constructor de Barcos (Neptune SFI)
  │   └── profile_manager.py   # Perfiles de buques guardados
  └── logic/
      ├── iso_standards.py     # ISO 9001, 14001, 45001
      └── imo_rules.py         # SOLAS, MARPOL

DECISIONES DE DISEÑO QUE APLICAN DESDE FASE 1:
  → Company.isolympus_company_id  UUID nullable — desde la migración inicial
  → Vessel.isolympus_vessel_id    UUID nullable — desde la migración inicial
  → Endpoint preparado pero vacío: POST /api/v1/integrations/isolympus/import
  → Autenticación entre sistemas: API keys (no OAuth)

EN FASE 4:
  → Una empresa de ISOlympus conecta su cuenta a Leto con un clic.
  → Leto llama al endpoint con la API key y recibe la flota estructurada.
  → No hay re-ingreso manual de datos de barcos ni estructura corporativa.
```

---

## 14. GLOSARIO TÉCNICO

```
MLC 2006         Maritime Labour Convention — ley internacional de trabajo
                 marítimo. Vinculante en +90 países. Los bloqueos son duros.

SOLAS            Safety of Life at Sea — define dotación mínima de tripulación
                 por tipo y tonelaje de barco.

MARPOL           Convenio de prevención de contaminación marina — aplica a Neptune.

SFI              Ship Function Index — sistema de clasificación de funciones
                 técnicas del barco usado en ISOlympus/Neptune.

Seafarer         El marino mercante. Usuario Tipo A. Siempre freemium.

Company          La empresa naviera. Usuario Tipo B. Paga suscripción.

Contract         Objeto central. Una rotación NO rompe el contrato.

VesselRotation   Cambio de barco durante contrato vigente. Genera ExperienceLog.

LeaveRecord      Registro de vacaciones. Solo persiste si pasa validación MLC.

SeafarerExpLog   Historial verificado de embarques. Inmutable. Snapshot.
                 verified=true solo si fue generado por Leto.

ISOlympus        App Python/PyQt hermana. Gestión ISO. Integra en Fase 4.

Neptune          ERP Marítimo (Fase 3 PBS). Consume datos de tripulación de Leto.

Matching         Motor que verifica docs + vigencia + rango para un barco específico.

Port State Ctrl  Inspección portuaria que verifica cumplimiento MLC en barcos.
                 Las empresas clientes de Leto están protegidas por los bloqueos.
```

---

## 15. ESTADO ACTUAL DEL PROYECTO

```
Fase:           Planificación completada — listo para iniciar desarrollo Fase 1
Artefactos:     Master Roadmap HTML (visual para el equipo)
                Prompts Maestros HTML (ClickUp AI + Claude Code)
                Análisis de Negocio HTML (PBS style)
                LETO_PROMPT_MAESTRO.md (generador de docs técnicos)
MVP existente:  Parcialmente construido (detalles en sesión anterior)
Equipo:         3 personas — Backend (FastAPI/Python), Full-stack (React+FastAPI),
                UI/UX Designer
Herramientas:   Claude.ai (planificación/arquitectura) → Claude Code (implementación)
                ClickUp: Space "The Unnamed Project" (ID: 90174810041)

PRÓXIMO PASO TÉCNICO (Sprint 1 — Fase 1):
  1. Inicializar monorepo (backend/ + frontend/) con Docker Compose
  2. Modelos PostgreSQL core con Alembic (User, Seafarer, Company, Document)
  3. Auth dual JWT/OAuth2 (register + login + refresh + me)
  4. Storage S3/R2 + panel de documentos con alertas Celery
  5. Frontend: login/register con selección de rol + rutas protegidas
```

---

*LETO Master Prompt v1.0 — PBS · PB Trading Solution · Panamá · 2026*
*Generado en sesión de arquitectura — Claude.ai*
