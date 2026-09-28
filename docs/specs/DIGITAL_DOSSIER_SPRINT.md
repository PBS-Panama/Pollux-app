# Leto/Cástor — Sprint "Digital Dossier" (Bóveda de Documentos Verificada)

> **Autor:** PM (Claude, Cowork) · **Fecha:** 2026-06-10 · **Estado:** ✅ SPRINT COMPLETO — 2026-06-11
> **Dev:** todas las fases y objetivos cerrados. Deuda abierta tracked en `Handover.md § Deuda abierta`.
> **Para:** Rick (lead dev) · IDM (backend, part-time)
> **Lee primero:** `Handover.md`, `Project_Manager.md`, `Regulation.md`
>
> Este documento traduce 4 objetivos de producto en trabajo accionable, anclado al código real
> que ya existe. Cada objetivo trae: estado actual (con rutas reales), diseño, tareas y criterios
> de aceptación. **El orden de fases respeta las dependencias** — no empezar Obj.2 sin Obj.1, etc.

---

## 0. Contexto verificado (lo que YA existe — no reconstruir)

Probado en vivo el 2026-06-10 sobre `localhost:4000` y leído del código:

**Flujo de carga real (cuando hay sesión JWT):**
1. `interfaces/castor/src/common/apiClient.js → uploadDocument()`
   - **Paso 1 (Express, archivo físico):** `POST /crewing-api/users/:userId/myfiles/upload` → guarda el binario y devuelve `savedName`, `fileName`, `fileSize`, `mimeType`.
   - **Paso 2 (FastAPI, metadata):** `POST /api/seafarer/me/documents/sync` → upsert en tabla Postgres `documents` (clave `seafarer_id + name`), con rollback del archivo si falla.
2. Almacenamiento físico: `interfaces/castor/userDataManager.js` (local) y `cloudDataManager.js` (GCS) → `saveUploadedFile()` genera `savedName = ${docId}${ext}` (ej. `1781143713438.pdf`).
3. Descarga: `GET /crewing-api/users/:userId/myfiles/download/:savedName` → hoy fuerza `Content-Disposition: inline; filename="${savedName}"`.

**Backend de documentos** (`backend/app/routers/documents.py`, `models/document.py`):
- Tabla `documents` con: `id, seafarer_id, name, cert_code, doc_key, file_name, saved_name, file_size, mime_type, category, category_label, validity_years, issued_date, expiry_date, verification_status, rejection_reason, verified_at, status, uploaded_at, updated_at`.
- `cert_code` → referencia STCW (ej. `STCW VI/1`). `doc_key` → slug canónico (ej. `bst`, `medical`). **Ambos hoy se subutilizan** (el `sync` no llena `cert_code`).
- Estados de verificación ya existen: `pending → under_review → verified/rejected` (memoria admin panel).
- ⚠️ `models/document.py` está **parcialmente desincronizado** del esquema real (varias columnas se crean por migración cruda en `main.py`, no en el modelo ORM). Unificar al tocar la tabla.

**Motor de documentos requeridos** (`interfaces/castor/src/common/crewDocData.js`):
- `getRequiredDocsByProfile(rank, profile)` ya combina: `RANK_REQUIRED_DOCS` + CoC/CoP + endorsements de bandera + `STCW_SPECIAL_MAP` por tipo de barco.
- `getComplianceStatus(rank, uploadedDocs, vesselTypeIds)` → `{missing, expiring, expired, compliant}`.
- `CREW_ALL_DOCS` = catálogo por categoría (Main Docs, IMO Courses, Health, Job Letters, Other) con `validityYears`.
- **Esta es la base del Objetivo 1, pero vive solo en JS.**

**Fuente regulatoria:** `Regulation.md` §5–§22 (mapa rango→STCW/AMP, §11 reglas de matching, §22.2 mapeo AMP buque panameño).

**Hallazgos de testing (2026-06-10) a corregir en Fase 0:**
- 🟠 Bug fecha: una fecha `2020-03-15` se **muestra** `14/3/2020` (parseo UTC → hora local Panamá UTC-5). El dato guardado es correcto; el bug es de render.
- 🟠 Umbrales de vencimiento divergen: `crewDocData.js` usa `expiring ≤ 90 días`; `Regulation.md §11.1` define `EXPIRING ≤ 30`, `CRITICAL ≤ 7`. **Unificar a la regulación.**
- 🟡 Se puede guardar sin fecha de emisión (sin aviso).
- 🟡 i18n inconsistente (UI inglés + badge `Pendiente`).
- 🟡 El **company panel hoy muestra data demo hardcodeada** en el bundle (`/company/build/scripts/main.js`), no lee documentos reales del backend. (Ya estaba en roadmap: "MetaDetails: leer perfil real desde User Database".)

> **Aclaración importante** sobre un reporte previo: la carga NO es "solo localStorage". El backend
> persiste cuando hay JWT; localStorage es el **fallback** cuando no hay token (caso del demo sin login).
> El gap real es: (a) asegurar que las sesiones autenticadas usen el backend de punta a punta, y
> (b) que el company panel lea del backend en vez de data hardcodeada.

---

## Decisiones de arquitectura (confirmadas por Rick, 2026-06-10)

| # | Decisión | Elección |
|---|---|---|
| D1 | Source of truth del motor de documentos requeridos | **Portar a backend (Python).** Frontend conserva `crewDocData.js` como **fallback**; cuando el frontend use el fallback debe **alertar al admin panel y registrar en su log** (señal de backend caído / divergencia). |
| D2 | Motor OCR del doc analyzer | **Cloud OCR (Google Vision / AWS Textract).** Spec con interfaz desacoplada para poder cambiar de proveedor. |
| D3 | Alcance del connector Google Drive v1 | **Backup + import bidireccional.** Import debe pasar por validación OCR antes de asignarse a un slot. |
| D4 | Curación de imágenes "golden" de referencia (OCR) | **Vía Admin Panel** (encaja con Module 2B / RAG ya planeado). |

---

## Mapa de fases y dependencias

```
FASE 0 — Cimientos y fixes        (desbloquea todo)
   └─ persistencia JWT end-to-end, fixes de testing, campo issuing_country, seafarer_code
FASE 1 — Obj.1 Document Set Engine  (depende de Fase 0)
   └─ portar requeridos a backend + fallback JS + alerta/log admin
FASE 2 — Obj.2 Code-name + Export   (depende de Obj.1 y de seafarer_code)
   └─ cert_code/code-name en carga, descarga con code-name, export dossier en carpetas
FASE 3 — Obj.3 OCR Doc Analyzer     (depende de Fase 0; admin reference DB)
   └─ cloud OCR async, doc_type_rules en admin, verdict, "documento incorrecto"
FASE 4 — Obj.4 Google Drive         (independiente; usa export de Obj.2 y validación de Obj.3)
   └─ OAuth por usuario, backup + import, sync company dossiers
```

---

# OBJETIVO 1 — Motor de "set correcto" de documentos (Fase 1)

## Meta
Que el sistema sepa, para cada usuario, **exactamente qué documentos se le piden** según: rango, tipo de licencia/CoC, endorsements de bandera, y tipos de barco en los que trabaja. Y que esa verdad sea **única (backend)**, consumida por seafarer, company (matching) y admin.

## Estado actual
- `crewDocData.js → getRequiredDocsByProfile()` ya implementa la lógica combinada (rango + CoC/CoP + flag + vessel `STCW_SPECIAL_MAP`).
- `Regulation.md §11.3/§11.4` define mínimos por rango y extras por tipo de barco. `§22.2` mapea rango→CoC AMP en buque panameño.
- Falta: equivalente en backend + cruce formal contra `Regulation.md`.

## Diseño
1. **Portar la lógica a FastAPI** como módulo `app/services/document_requirements.py`:
   - Función `required_docs(profile) -> list[RequiredDoc]` con la misma semántica que `getRequiredDocsByProfile`.
   - Catálogo de documentos y reglas en **datos versionados** (tabla `doc_catalog` + `rank_required_docs` o JSON seed cargado al boot), no hardcode disperso.
   - Reusar el motor de compliance existente (`compliance_engine.py` / `compliance_service.py`) — no duplicar.
2. **Endpoint** `GET /api/seafarer/me/required-docs` y `GET /api/compliance/required-docs?rank=&vessels=...` (para company/matching).
3. **Fallback JS (D1):** `crewDocData.js` se mantiene. El frontend intenta el endpoint; si falla:
   - usa el fallback local,
   - dispara `POST /api/admin/alerts` con tipo `requirements_fallback_used` (payload: userId, rank, motivo, timestamp),
   - el admin panel registra el evento en su **log de actividad** y lo muestra como alerta.
4. **Cruce contra Regulation.md** (tarea de QA del dev): validar cada `RANK_REQUIRED_DOCS` contra §5–§6 y §11.3; documentar diferencias y resolverlas. Alinear umbrales (`EXPIRING ≤30`, `CRITICAL ≤7`) con `getExpiryStatus`/§11.1.

## Tareas
- [x] Crear `app/services/document_requirements.py` (port de `getRequiredDocsByProfile`). ✅ 2026-06-10
- [x] Modelar catálogo y reglas en DB/seed. ✅ 2026-06-10 — seeded via `RANK_REQUIRED_DOCS` + `STCW_SPECIAL_MAP` + `VESSEL_STCW_MAP` en `main.py`
- [x] Endpoints `GET /seafarer/me/required-docs` y `GET /compliance/required-docs`. ✅ 2026-06-10
- [x] Frontend: consumir endpoint en Library.js + Compliance.js; fallback a `crewDocData.js` con alerta+log al admin. ✅ 2026-06-10
- [x] Admin: endpoint `POST /admin/alerts` + tabla `admin_alerts`. ✅ 2026-06-10
- [ ] **⏳ DEUDA:** QA — cruzar `RANK_REQUIRED_DOCS` vs `Regulation.md §5–§22` por rango. Compliance real, no cosmético.

## Criterios de aceptación
- Para un perfil dado (rango + barcos + CoC), backend y frontend devuelven **la misma lista**.
- Si el backend cae, el frontend sigue funcionando con fallback y queda un **registro visible en el admin log**.
- Los umbrales de estado (VALID/EXPIRING/CRITICAL/EXPIRED) coinciden con `Regulation.md §11.1`.

---

# OBJETIVO 2 — Code-name + Export del dossier (Fase 2)

## Meta
Cada archivo que el usuario sube (con nombre aleatorio) recibe un **code-name estandarizado** asignado por el backend. Al descargar (usuario o empresa), el archivo lleva el code-name, no el nombre original. Al exportar el dossier completo, se obtiene una **estructura de carpetas estándar** independiente de industria/rango.

## Formato del code-name
```
[Rank]_[RegCode]_[IssuingCountry]_[UserCode]_exp[YYYYMMDD]
```
- **Rank** — clave de rango normalizada/legible (ej. `Master`, `2ndEngineer`). Fuente: `normalizeRank()`.
- **RegCode** — referencia regulatoria del documento (ocupa el slot `[STCWrule]` del ejemplo original).
  - Para docs STCW/CoC → la regla (ej. `II-2`, `VI-1`). Fuente: `documents.cert_code`.
  - Para docs sin regla STCW (Passport, Medical nacional, Job Letters) → un **código de slot** estable por `doc_key` (ej. `ID-PP` passport, `MED-I9` médico, `JOB-LOE` letter of employment). Se define un `DOC_REGCODE_MAP` (doc_key → RegCode).
- **IssuingCountry** — país emisor del documento, ISO-3166 alpha-2 (ej. `PA`, `CO`).
  - **Nuevo campo** `issuing_country` en la carga y en la tabla `documents`. Para CoC/Endorsement de bandera, default = país de la bandera; para passport/ID = país del documento; el usuario puede ajustarlo.
- **UserCode** — código público del seafarer (NO el UUID). Depende del **sistema `seafarer_code`** (pendiente ya registrado en `Handover.md`). Hasta que exista, usar placeholder determinístico (ej. `LT-XXXXXX` derivado del UUID).
- **expYYYYMMDD** — fecha de vencimiento; si no vence → `expNA`.

**Ejemplo:** `Master_II-2_PA_LT-PA-0042_exp20300315`
(Seaman/CoC "licencia capitan.pdf" → code-name de un CoC clase II/2 emitido por Panamá, user LT-PA-0042, vence 2030-03-15.)

## Estructura de export del dossier
```
[Rank]_[Nombre]_[Apellido]/
├── All Documents/        ← todos los documentos (vista plana)
├── Main Docs/            ← category 1
├── IMO Courses/          ← category 2
├── Health Certificates/  ← category 3
├── Job Letters/          ← category 4
└── Other Certificates/   ← category 5
        └── <code-name>.pdf
```
- `All Documents/` = copia/índice de todos; las 5 carpetas restantes = partición por `category`.
- Mismo layout para export individual (seafarer) y export masivo (company: una carpeta por tripulante).

## Estado actual / dónde tocar
- `cert_code` ya existe en la tabla → hogar del RegCode. `doc_key` → slug para `DOC_REGCODE_MAP`.
- Descarga: `interfaces/castor/apiRoutes.js` línea ~189 (`Content-Disposition ... filename="${savedName}"`) → cambiar a `filename="${codeName}.pdf"`.
- `getDownloadUrl()` en `apiClient.js` ya construye la URL; el code-name se resuelve server-side.

## Diseño
1. **Generación** en backend al hacer `sync` (o un servicio `codename.py → build_codename(doc, seafarer)`):
   - Rellena `cert_code` (RegCode) si falta, computa el code-name y lo guarda en una columna nueva `code_name` (o se computa on-the-fly en descarga). Recomendado: **persistir `code_name`** para estabilidad y búsqueda.
2. **Descarga renombrada**: Express pide a FastAPI (o recibe en query) el `code_name` y setea `Content-Disposition: attachment; filename="<code_name>.pdf"`.
3. **Export endpoints**:
   - `GET /api/seafarer/me/documents/export` → zip con la estructura de carpetas.
   - `GET /api/company/seafarers/{id}/export` y `/export-all` → zip con `[Rank]_[Nombre]_[Apellido]/...` por tripulante (respeta visibilidad/compliance).
   - Construcción del zip en backend (stream), nombres de archivo = code-name.
4. **Sanitización**: slug seguro para filesystem (sin espacios/acentos en code-name; nombre/apellido normalizados en carpeta).

## Tareas
- [x] Migración: añadir `issuing_country` y `code_name` a `documents`. ✅ 2026-06-10
- [x] `DOC_REGCODE_MAP` (doc_key → RegCode). ✅ 2026-06-10 — en `backend/app/services/codename.py`
- [x] Servicio `build_codename()` + llenado de `code_name` en `sync`. ✅ 2026-06-10 — acceptance test `Master_II-2_PA_LT-PA-0042_exp20300315` ✅
- [x] Form de carga (Library.js): selector de país emisor. ✅ 2026-06-10
- [x] Descarga con `Content-Disposition: attachment; filename="<code_name>.<ext>"` (`apiRoutes.js`). ✅ 2026-06-10
- [x] Export individual seafarer — zip con 6 carpetas via `archiver@7`. ✅ 2026-06-10 — `GET /crewing-api/users/:userId/myfiles/export-zip?token=XXX`
- [x] ~~⏳ DEUDA: Export masivo company~~ ✅ DONE (2026-06-11) — `GET /api/company/seafarers/{id}/export` (ZIP dossier individual, solo `verified`) + `GET /api/company/seafarers/export-all` (ZIP multi-tripulante, `{Rank}_{Nombre}_{Apellido}/` por carpeta). Helpers: `_safe_slug`, `_fetch_castor_file`, `_write_seafarer_docs` en `company.py`. Estructura: `All Documents/` + `{category_label}/` por cada archivo.

## Criterios de aceptación
- Subir "licencia capitan.pdf" como CoC de Master/Panamá/exp 2030-03-15 → descarga = `Master_II-2_PA_<UserCode>_exp20300315.pdf`.
- Export individual y masivo entregan la estructura de 6 carpetas con archivos code-named.
- El nombre original nunca aparece en la descarga.

---

# OBJETIVO 3 — Doc Analyzer OCR (Fase 3)

## Meta
Garantizar **compliance del lado de Leto**: que el documento subido en un slot sea realmente ese documento (evitar, ej., un pasaporte subido en el item "Seaman's Book"). Base de datos de imágenes/reglas "golden" por tipo de documento + verificación OCR.

## Decisiones
- **Motor:** Cloud OCR (Google Vision / Textract) tras una interfaz `OcrProvider` desacoplada (D2).
- **Curación de referencias:** vía Admin Panel (D4), Module 2B / RAG (ya planeado en memoria admin panel).

## Diseño
1. **Tabla `doc_type_rules`** (gestionada por admin) por `doc_key`:
   - `required_fields[]`, `valid_issuing_authorities[]`, `number_regex`, `validity_range`, `reference_images[]`, `red_flag_keywords[]`, `expected_doc_type`.
2. **Pipeline asíncrono** (Celery — ya referido en `Regulation.md §11.5`):
   - Trigger al subir → encolar job → `OcrProvider.extract(file)` → texto + campos.
   - **Clasificación**: ¿el tipo detectado coincide con el slot reclamado (`doc_key`)? + reglas RAG.
   - Salida `ai_verdict = { status, confidence, flags[] }`, con `status ∈ {probable_valid, suspicious, likely_fake, wrong_document}`.
   - Guardar `ai_verdict` (JSON) en `documents` (campo ya planeado en memoria admin panel).
3. **Reacción**:
   - `wrong_document` (ej. passport en slot seaman book) → marcar y **notificar al seafarer** (pedir recarga); no cuenta para compliance.
   - `suspicious/likely_fake` → enviar a `under_review` (humano decide).
   - `probable_valid` (+ alta confianza) → candidato a auto-verify según config por tipo (trust hierarchy de memoria admin panel).
4. **Human-in-the-loop**: el verdict es recomendación; el admin confirma (`verified/rejected`). Feedback mejora reglas.

## Tareas
- [x] Interfaz `OcrProvider` + implementación Cloud. ✅ 2026-06-11 — `backend/app/services/ocr_provider.py`; `MockOcrProvider` (dev) + `GoogleVisionProvider` (activado por `GOOGLE_VISION_API_KEY`). ⚠️ Prod necesita env var.
- [x] Tabla `doc_type_rules` + CRUD admin (GET/POST/PUT/DELETE). ✅ 2026-06-11 — 6 reglas seeded (Passport, Seaman's Book, CoC, CoP, Medical, National ID)
- [x] Pipeline asíncrono al subir; persistir `ai_verdict`. ✅ 2026-06-11 — **FastAPI `BackgroundTasks`** (no Celery — no está en el stack; decisión de arquitectura documentada)
- [x] Lógica de clasificación slot-vs-detectado + flags (`wrong_document`, `suspicious`, `likely_fake`, `probable_valid`). ✅ 2026-06-11
- [ ] **⏳ DEUDA:** Notificación in-app al seafarer cuando `verdict = wrong_document`. Badge visible en Library.js ✅; notificación push/toast pendiente.
- [x] Vista admin: cola de pending-review + acción `PATCH /{doc_id}/verdict`. ✅ 2026-06-11 — `GET /api/admin/documents/pending-review`

## Criterios de aceptación
- Subir un pasaporte en el slot "Seaman's Book" → verdict `wrong_document`, no cuenta para compliance, seafarer notificado.
- El admin puede definir/editar reglas e imágenes de referencia por tipo de documento sin developer.
- Documento legítimo → verdict `probable_valid` con confianza y campos extraídos.

> ⚠️ Privacidad/seguridad: con Cloud OCR los documentos salen a un tercero. Documentar el flujo de datos,
> retención y consentimiento. Considerar región del proveedor y cifrado en tránsito/reposo.

---

# OBJETIVO 4 — Connector Google Drive (Fase 4)

## Meta
Connector **opcional** en `/app/#/settings` (seafarer) y en settings del company panel para **backup + import bidireccional** de documentos hacia/desde Google Drive del propio usuario/empresa.

## Decisiones
- **Alcance v1:** backup (export a Drive) **+** import (desde Drive al sistema) (D3).
- Import **debe pasar por validación OCR (Obj.3)** antes de asignarse a un slot.

## Diseño
1. **OAuth por usuario** (cada quien conecta su propio Drive):
   - Flujo OAuth estándar in-app; **el usuario otorga el consentimiento** (acción del usuario, no automatizable por el agente).
   - Guardar `refresh_token` **cifrado** por usuario; scopes mínimos (`drive.file` preferido sobre `drive` completo).
2. **Backup (export)**:
   - Crear carpeta `Leto Documents/` (seafarer) o `Leto Crew/` (company) en el Drive del usuario.
   - Subir el dossier con la **misma estructura y code-names de Obj.2**.
   - Botón "Sync/Backup ahora" + opción de sync automática (post-verificación).
3. **Import (bidireccional)**:
   - El usuario elige archivos de su Drive (picker) → se descargan al sistema → **pasan por OCR (Obj.3)** → se asignan a un slot (sugerido por clasificación, confirmado por el usuario).
4. **Company**: sincronizar todos los dossiers de la tripulación a la nube de la empresa, una carpeta por tripulante (`[Rank]_[Nombre]_[Apellido]/`), respetando visibilidad/compliance.

## Tareas
- [x] Backend OAuth Google (client config, callback, almacenamiento cifrado de tokens). ✅ 2026-06-11 — `backend/app/routers/drive.py` (7 endpoints: auth-url, callback, status, revoke, backup, files, import) + `token_crypto.py` (Fernet) + tabla `drive_tokens`. ⚠️ `GOOGLE_DRIVE_CLIENT_ID/SECRET` pendientes de configurar.
- [x] UI en `/app/#/settings`: estado conectado/desconectado, conectar/revocar, backup ahora, import picker. ✅ 2026-06-11 — `interfaces/castor/src/routes/Settings/Drive/Drive.tsx`
- [x] Export a Drive reutilizando la estructura de Obj.2 (code-names + carpetas por categoría). ✅ 2026-06-11
- [x] Import desde Drive → castor upload → FastAPI sync → pipeline OCR (Obj.3). ✅ 2026-06-11
- [ ] **⏳ DEUDA:** Company settings — sync masivo crew dossiers (una carpeta por tripulante en Drive de empresa). No implementado en v1.
- [x] Manejo de token revocado / 401 transparente / desconectar. ✅ 2026-06-11

## Criterios de aceptación
- El seafarer conecta su Drive y obtiene una carpeta ordenada con sus documentos code-named.
- Importar un archivo desde Drive lo somete a OCR y lo coloca en el slot correcto (o lo rechaza).
- La empresa obtiene en su Drive los dossiers de su tripulación, ordenados por tripulante.
- Conectar/revocar es reversible y los tokens se guardan cifrados.

> 🔒 Reglas de seguridad: el agente/automatización **no** introduce credenciales ni concede OAuth por el
> usuario; el consentimiento siempre lo da la persona. No exponer tokens en logs ni URLs.

---

## FASE 0 — Cimientos ✅ COMPLETA (2026-06-10)

- [x] Verificar persistencia **JWT end-to-end**. ✅ 2026-06-10
- [x] Fix render de fecha (timezone): `parseDateLocal()` en 4 archivos JS. ✅ 2026-06-10
- [x] Alinear umbrales de vencimiento con `Regulation.md §11.1` (`EXPIRING ≤30`, `CRITICAL ≤7`). ✅ 2026-06-10
- [ ] **⏳ DEUDA:** Validación de fecha de emisión requerida al guardar. Diferida — no implementada en Fase 0.
- [x] Añadir campo `issuing_country`. ✅ 2026-06-10
- [x] Arrancar epic **`seafarer_code`** → `LT-{ISO2}-{NNNN}`. ✅ 2026-06-10
- [x] Company panel: leer backend real (CoreTransport.js). ✅ 2026-06-10
- [x] i18n Library.js completamente en español. ✅ 2026-06-10
- [x] Sincronizar `models/document.py` con esquema real. ✅ 2026-06-10

---

## Secuencia recomendada para el developer
1. **Fase 0** completa (desbloquea y limpia deuda del testing).
2. **Obj.1** (motor backend + fallback/alerta) — habilita verdad única.
3. **Obj.2** (code-name + export) — alto valor visible; depende de Obj.1 + `seafarer_code`.
4. **Obj.3** (OCR analyzer) — compliance; admin reference DB en paralelo.
5. **Obj.4** (Drive) — usa export de Obj.2 e import valida con Obj.3.

## Preguntas abiertas (resolver al implementar)
- `DOC_REGCODE_MAP`: definir el RegCode de cada `doc_key` sin regla STCW (passport, medical, job letters, other).
- `seafarer_code`: esquema final (`LT-PA-0042` vs otro) — ver pendiente en `Handover.md`.
- Retención y región del proveedor Cloud OCR (privacidad de documentos).
- Política de auto-verify por tipo de documento (qué tipos pueden auto-aprobarse con verdict alto).
