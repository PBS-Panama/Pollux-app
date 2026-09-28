# Cástor — Sprint "Interface Tripulante" (User Panel Phases 2–5)

> **Autor:** PM (Claude, Cowork) · **Fecha:** 2026-06-11 · **Estado:** COMPLETO — Fase 0 ✅ · Phase 2 ✅ · Phase 3 ✅ · Phase 4 ✅ · Phase 5 ✅
> **Para:** Rick (lead dev) · IDM (backend, part-time)
> **Lee primero:** `Handover.md`, `Project_Manager.md`, `Project_Leto.md §7`
> **Prioridad de marca (2026-06-10):** Cástor → Leto → Admin. Todo este sprint es en `interfaces/castor/`.
>
> Sigue al EPIC "Digital Dossier" (✅ completo). Objetivo: que el tripulante tenga un perfil completo,
> con datos persistidos de forma consistente, ligado a sus documentos/compliance y a su Learning Record.

---

## 0. Contexto verificado (estado real del perfil hoy)

`interfaces/castor/src/routes/MyProfile/MyProfile.js` ya tiene gran parte del perfil, pero la **persistencia está fragmentada en 4 destinos**:
1. `localStorage['leto-profile-extra']` — city, experience, aboutMe, profileRank, department, residenceCountry, residenceProvince, referenceAirport, nationalities[], spokenLanguages[], vesselTypes[], workedCompanies[], firstName, lastName, gender, phone, dateOfBirth.
2. `PATCH /api/seafarers/{id}/profile` — nationalities, residence_country, spoken_languages, vessel_types, etc.
3. `PATCH /api/seafarers/{id}/amp-profile` — CoC/CoP + endorsements (lee el motor de compliance).
4. `PATCH /crewing-api/users/{id}/settings` — settings del crewing.
   Además espeja a `localStorage['leto-user']` para lectura inmediata de otros módulos.

**Backend `seafarers` (`models/seafarer.py`, `routers/seafarers.py`):**
- Modelo: `first_name, last_name, nationality, date_of_birth, phone, rank, years_experience, bio, is_available, coc_type, coc_issuing_country, coc_tonnage_limit, cop_tanker_type, cop_tanker_level, flag_endorsements(JSON), special_endorsements(JSON), fleet_category`.
- Endpoints: `GET/PATCH /seafarers/{id}/amp-profile`, `PATCH /{id}/profile`, `GET/POST /{id}/badges`.
- **Falta en el modelo:** residencia estructurada (country/province/city), aeropuerto de referencia, **contacto de emergencia**, `nationalities[]` como lista (hoy hay `nationality` singular). Varias columnas pueden existir vía migración cruda — confirmar contra el esquema real antes de añadir.

**Datos de apoyo (JSON):** `interfaces/castor/src/common/profileData/` — `countries_world.json`, `languages_profile.json`, `vessel_types.json`, `provinces_by_country.json`, `airports_by_country.json`, `panama_companies.json`. Copias fuente en `Reference/ProfileData/`.

**Badges/Ribbons:** endpoints `GET/POST /api/seafarers/{id}/badges` ya existen; el modelo de enrollment de series (Learning Record) está en `models/seafarer.py` (tabla de enrollments).

---

## FASE 0 — Consolidar la persistencia del perfil ✅ COMPLETA (2026-06-11)

**Problema:** un mismo dato se escribe en hasta 4 sitios y se relee de una mezcla → riesgo de divergencia y bugs sutiles (como los de fechas que ya vimos en Digital Dossier).

**Meta:** **backend como fuente única**; `localStorage` queda solo como **cache de lectura** (espejo), no como almacén primario.

- [x] Definir el contrato canónico del perfil: `GET /api/seafarers/me/profile` devuelve TODO (básicos + residencia + contacto emergencia + professional + AMP). Declarado ANTES de `/{id}/` para que FastAPI no capture `"me"` como UUID.
- [x] `PATCH /api/seafarers/me/profile` acepta objeto completo (fachada única). Los endpoints `amp-profile` y `/{id}/profile` quedan como backward-compat internos.
- [x] `handleSave` escribe primero al backend; bridge a `crewing-api/settings` se mantiene fire-and-forget (no romper Compliance/Exams hasta Phase 4). `leto-user` + `leto-profile-extra` actualizados como cache después del PATCH.
- [x] Migración idempotente en `main.py` (`ADD COLUMN IF NOT EXISTS`) + ORM `models/seafarer.py` reconciliado: 11 columnas nuevas (`gender`, `department`, `city`, `nationalities`, `spoken_languages`, `vessel_types`, `residence_country`, `residence_province`, `reference_airport`, `emergency_contact_name/relation/phone`).
- [x] `loadProfileFromBackend` effect en `MyProfile.js` hidrata todos los campos desde el backend al montar.

**Aceptación:** editar el perfil → `PATCH /me/profile` → `GET /me/profile` devuelve los mismos valores ✅ verificado.

---

## PHASE 2 — Residencia & Contacto ✅ COMPLETA (2026-06-11)

**Meta:** sección de residencia estructurada + contacto (incluye **contacto de emergencia**, hoy ausente).

## Diseño
- Campos: país de residencia → provincia/estado (dependiente, `provinces_by_country.json`) → ciudad; aeropuerto de referencia (`airports_by_country.json`); teléfono; **contacto de emergencia** (nombre, relación, teléfono).
- Persistir en `seafarers` (columnas nuevas: `residence_country, residence_province, city, reference_airport, emergency_contact_name, emergency_contact_relation, emergency_contact_phone`). *(nota: implementado como `city`, no `residence_city`)*

## Tareas
- [x] Migración + modelo: columnas de residencia existentes (Fase 0) + 3 columnas contacto emergencia añadidas.
- [x] UI sección "Residencia & Contacto" ya existía para país/provincia/aeropuerto. **Sección "Contacto de Emergencia" nueva** añadida: nombre (input), relación (StyledSelect, 7 opciones), teléfono (tel input). Consistente con el resto del form (`LBL`/`INP_SM`/`StyledSelect`).
- [x] ~~⏳ Validación de formato teléfono/contacto — diferida~~ ✅ DONE (2026-06-11) — `validatePhone()` helper (7–15 dígitos, strip de espacios/guiones/paréntesis), ambos teléfonos del perfil (principal + emergencia), teléfono emergencia requerido si nombre está presente, inline red error labels.
- [x] Guardado vía fachada `PATCH /api/seafarers/me/profile` (campos `emergency_contact_*`).

## Aceptación
- Se guarda y recarga contacto de emergencia desde backend ✅ (roundtrip curl verificado).
- Selección país→provincia→aeropuerto encadena correctamente ✅ (existente desde antes).

---

## PHASE 3 — Professional (unificación) ✅ COMPLETA (2026-06-11)

**Meta:** unificar en una sección coherente: rango, departamento, tipos de barco, años de experiencia, compañías, idiomas, nacionalidades.

## Diseño
- Rango/departamento alineados con `normalizeRank()` y las claves de `RANK_REQUIRED_DOCS` (consistencia con el motor de Obj.1).
- `vessel_types[]`, `spoken_languages[]`, `nationalities[]` (máx 3) como listas en backend (JSONB).
- Experiencia (años) + compañías trabajadas.

## Tareas
- [x] `fleet_category` ahora es un select editable "Categoría de Flota" (5 opciones) en la sección Rank/Dept — antes era read-only desde `leto-user` localStorage. State `fleetCategory` cableado completo (isExtraDirty, handleDiscard, extraData, fullPayload, localStorage mirrors).
- [x] `rank`/`fleet_category`/`vessel_types`/`spoken_languages`/`nationalities` todos se guardan en backend vía `PATCH /me/profile` y se hidratan desde `GET /me/profile` al montar. Backend es la fuente de verdad ✅.
- [x] `nationality` (singular) y `nationalities[]` (lista) se mantienen consistentes: `nationality` se deriva de `nationalities[0]` al guardar. No migración destructiva.
- [x] **Obj.1 QA cerrado:** 16 aliases nuevos en `_RANK_KEY_MAP` (`document_requirements.py`): `carpenter→ab`, `able_seafarer_engine→ab`, `motorman/wiper→os`, `etr→electrician`, `gmdss_goc→chief-officer`, `gmdss_roc→2nd-officer`, rangos STCW-F (pesca), rangos AMP Panamá aguas nacionales, `ship_surgeon/nurse→cook`. Verificado: `fishing_master` → docs a nivel master ✅.

## Nota de implementación
La colisión de nombre `const fleetCategory` (local en el render) con el state `fleetCategory` fue resuelta renombrando la variable local a `effectiveFleetCategory` para el badge del header.

## Aceptación
- `fleet_category: merchant` guardado → `GET /me/profile` devuelve `fleet_category: merchant` ✅.
- `GET /api/seafarer/me/required-docs` con rango `2nd_officer` → lista correcta de docs (normalización funciona) ✅.
- `fishing_master` resuelve a docs nivel master (no solo universal) ✅.

---

## PHASE 4 — Documents & Compliance link ✅ COMPLETA (2026-06-11)

**Meta:** conectar el perfil con `#/myfiles` y `#/compliance` (cierra el lazo con el Digital Dossier).

## Diseño
- En el perfil, un panel "Documentos & Compliance": score, # faltantes/por vencer, y enlaces directos.
- Enlace a `#/myfiles` (chips faltantes/por vencer/críticos son links directos).
- `seafarer_code` ya estaba en el header (Phase 3). `ai_verdict` no expuesto por `GET /api/compliance/me` — diferido.

## Tareas
- [x] Panel resumen de compliance en MyProfile. Usa `GET /api/compliance/me` (backend compliance engine). Muestra score circular, `can_be_listed`, chips de estado, fallback "sin datos", y warning de hard-block.
- [x] Deep-link a `#/myfiles` desde chips expiring/critical/missing y desde el fallback "subir ahora".
- [x] Deep-link a `#/compliance` en el header del panel "Ver detalle →".
- [x] ~~⏳ `ai_verdict`/`verification_status` diferido~~ ✅ DONE (2026-06-11) — `DocComplianceItem` dataclass + `DocComplianceItemResponse` Pydantic schema extendidos con ambos campos (Optional, default None). `build_compliance_report()` los puebla desde `db_doc` vía `getattr`. Panel MyProfile muestra chips `verified/rechazados/alerta IA` (solo si hay datos) derivados de `complianceData.docs`.

## Nota de implementación
- Dos estado nuevos: `complianceData`, `complianceLoading`. Efecto fetch al montar (token-gated, silent fallback).
- Panel se renderiza solo si `complianceLoading || complianceData` (no muestra nada antes de respuesta del backend).
- SVG score ring: `r=17`, circumference=106.8, `stroke-dasharray = (score/100)*106.8`.
- Demo seafarer actual: `total_required=0` porque `rank_compliance_catalog` no tiene datos sembrados → muestra "Sin documentos registrados aún" → link a `#/myfiles` sigue funcionando.
- Posición: entre "save bar condicional" y "action buttons" en la columna del perfil.

## Aceptación
- Panel de compliance visible en `/app/#/myprofile` después de login ✅.
- `GET /api/compliance/me` → `{"compliance_score":0.0,"can_be_listed":true,"total_required":0,...}` ✅.
- "Ver detalle →" navega a `#/compliance` ✅.
- Chips de faltantes/por-vencer/críticos navegan a `#/myfiles` ✅.

---

## PHASE 5 — Ribbons & Learning placeholder ✅ COMPLETA (2026-06-11)

**Meta:** badges visuales (ribbons) desde el Learning Record DB.

## Tareas
- [x] Nuevo endpoint `GET /api/seafarers/me/badges` en `routers/seafarers.py` (declarado antes de `/{seafarer_id}/badges`). Helper `_BADGE_QUERY` + `_badge_rows_to_list()` reutilizado por ambas rutas.
- [x] State `badgesData` (null=cargando, []=vacío, [...]= tiene badges). Efecto fetch al montar, token-gated, silent fallback → `[]`.
- [x] Col 3 del header reemplazada con IIFE: muestra el badge más reciente completado como "trading card" (ratio 1:1.464, thumbnail img + fallback 🎖 + título + label de estado).
- [x] **Placeholder** cuando `length === 0`: "Completa cursos para ganar insignias" + link `#/myexams`.
- [x] **Chip contador** (`+N más`) cuando hay más de 1 badge.
- [x] Thumbnail `onError` hide para no mostrar imágenes rotas.

## Aceptación
- `GET /api/seafarers/me/badges` → `[]` para demo seafarer (sin cursos) ✅.
- Col 3 muestra placeholder "Completa cursos" con link a `#/myexams` ✅.
- Lógica de tarjeta real presente — se activa cuando Admin Learning CMS crea series y el seafarer las completa.

---

## Cross-cutting (de `Project_Leto.md §7`, hacer junto al sprint)

- [x] **Sidebar cleanup:** `COMPANY_TABS`, `getLetoRole()` y el `useMemo` de role-switch eliminados de `MainNavBars.tsx`. Cástor siempre usa `SEAFARER_TABS`. Import `useMemo` removido. ✅ 2026-06-11
- [x] **Auth unification:** JWT ya se comparte vía `leto-auth` (Zustand persist del Vite landing → leído por `apiClient.js`). Añadidos: boot guard en `src/index.js` (redirect a `/` si no hay token al montar el crewing SPA), `redirectToLogin()` en `apiClient.js` (limpia `leto-auth` + `leto-user` + `leto-profile-extra` y redirige), 401 check en `getDocuments()`. ✅ 2026-06-11
- [x] **Confirmar data files** en `common/profileData/` (los 6 JSON) — todos presentes y en uso ✅.

---

## Secuencia recomendada
~~Fase 0~~ ✅ → ~~Phase 2~~ ✅ → ~~Phase 3~~ ✅ → ~~Phase 4~~ ✅ → ~~Phase 5~~ ✅ → cross-cutting (sidebar/auth) cuando haya hueco.

## Notas de PM
- Aprovechar este sprint para **cerrar la deuda de Fase 0 de fechas** que quedó pendiente del Digital Dossier (validación de fecha de emisión requerida al guardar) si toca el form de documentos.
- ~~La QA de Obj.1 (`RANK_REQUIRED_DOCS` vs `Regulation.md`) encaja naturalmente en Phase 3~~ — **cerrada en Phase 3** (2026-06-11): 16 aliases nuevos en `_RANK_KEY_MAP`, todos los rangos de `ranks_stcw.json` ahora resuelven correctamente.
- Mantener mobile-first (regla del proyecto: todo panel del marino).
