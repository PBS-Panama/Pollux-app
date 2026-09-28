# Admin Panel — Feature Map & Requirements
**Prepared:** 2026-05-24  
**Interfaces reviewed:** Seafarer (`#/my-profile`, `#/myfiles`, `#/compliance`, `#/myexams`, `#/calendar`) · Company (`#/company-dashboard`, `#/company-crewdb`, `#/company-calendar`)  
**Backend:** Express `/crewing-api` (seafarer data) + FastAPI `/api` (company data) + PostgreSQL  
**Architecture decision:** Admin panel has three sections mapped to separate backends — Seafarer Ops, Company Ops, Platform Ops.

---

## Architecture: Three-Section Admin, Two Backends

The two existing backends are not a problem — they define the natural section boundaries of the admin panel. Each section knows exactly which API it calls.

```
Admin Panel
├── 🔵 Seafarer Ops     ← Express /crewing-api
│   ├── Seafarer User Management
│   ├── Document Verification Queue (human + AI/OCR)
│   ├── Compliance Monitor
│   └── Exam & Course Management
│
├── 🟢 Company Ops      ← FastAPI /api
│   ├── Company User Management
│   ├── Company–Seafarer Relationships
│   └── Interview Pipeline
│
└── 🟣 Platform Ops     ← both + new Learning API (FastAPI)
    ├── Learning Record CMS
    ├── Platform Configuration
    ├── Analytics (aggregated from both)
    └── OCR/RAG Knowledge Base (doc verification rules)
```

This structure lets the developer build incrementally: Seafarer Ops first (backend already exists), then Company Ops, then Platform Ops as the learning and AI features come online.

---

## Why the Admin Panel is Critical

Both user interfaces have gaps that only admin can close:

- **Documents are uploaded but never human-verified.** A seafarer uploads a CoC and it turns green on their compliance score with zero authenticity check. Admin closes this with a dual-path verification queue (human + AI).
- **Compliance is calculated client-side.** There is no server-authoritative compliance record. Admin needs to own this truth.
- **Learning Record content is code-only.** Videos, modules, and series can't be managed without a developer. Admin must own this.
- **Exam data is static JSON.** Admin can't add new courses, update schedules, or flag outdated entries.
- **Company–Seafarer relationships are opaque.** No one has a full view of who is connected to whom and in what state.

---

## Three Interfaces Summary

### Seafarer sees:
| Route | What it does |
|---|---|
| `#/my-profile` | Personal data: rank, vessel types, languages, nationalities, companies, training centers |
| `#/myfiles` | Document upload by category: Main Docs, IMO Courses, Health, Job Letters, Other Certs |
| `#/compliance` | Compliance score ring + doc status per vessel category |
| `#/myexams` | STCW exam list (filter by level/dept) + Learning Record badge panel |
| `#/calendar` | Availability periods + certificate expiry alerts |
| `#/settings` | UI preferences |

### Company sees:
| Route | What it does |
|---|---|
| `#/company-dashboard` | KPIs: total crew, aptos, docs faltantes, categorías · Quick links · Crew table with score |
| `#/company-crewdb` | Crew card grid: filter by fleet category / apto · Compliance score per seafarer |
| `#/company-calendar` | CRUD events · Interview management (pending / confirmed) |

### Admin needs to see and control: **everything both see, plus the layer underneath.**

---

## Admin Panel — Module Map

---

### Module 1 — User Management

**Why:** No one has a global view of who is registered, what their status is, or whether they should be on the platform.

#### 1A — Seafarers
- List all registered seafarers (name, rank, nationality, registration date, last active)
- View full profile (same data as `#/my-profile` + `#/myfiles`)
- Account status: `active` / `suspended` / `pending_verification`
- Actions: Verify account · Suspend · Delete · Reset password

#### 1B — Companies  
- List all registered companies (name, country, registration date, last active, seafarer count)
- View company profile
- Account status: `active` / `suspended` / `pending_verification`
- Actions: Verify account · Suspend · Delete

#### 1C — Roles & Permissions *(future)*
- Assign `admin` / `company` / `seafarer` roles
- Multi-admin support with audit log

---

### Module 2 — Document Verification Queue
**Section:** 🔵 Seafarer Ops · **API:** Express `/crewing-api`

**Why:** Seafarers upload documents and they immediately count toward their compliance score with zero authenticity check. This module closes that trust gap via two parallel verification paths.

#### Verification Path 1 — Human Review
- **Incoming queue:** All newly uploaded documents, ordered by date. Each entry shows: seafarer name · document type · category · issue/expiry dates · uploaded file (full preview: image or PDF)
- Admin actions per document:
  - ✅ `Verify` — `verification_status: verified`, locks record from tampering, notifies seafarer
  - ❌ `Reject` — `verification_status: rejected`, removes from compliance score, notifies seafarer with optional written reason
  - 👁 `Flag for review` — hold state (`under_review`), document counts as `pending` in compliance score
- Filter by: document category · verification status · expiry date · fleet category · rank
- **Bulk actions:** verify batch · reject batch

#### Verification Path 2 — AI (OCR + RAG)
The system automatically analyzes each uploaded document and produces a recommendation before the human reviewer even opens it.

**How it works:**
1. **OCR** — Extracts all text from the uploaded image or PDF
2. **RAG comparison** — Compares extracted fields against the knowledge base for that specific document type (see Module 2B below)
3. **Output** — An AI verdict displayed on the document card: `✅ Probable válido` / `⚠️ Sospechoso` / `🚨 Probable falso`, with a confidence score and the specific fields that raised flags (e.g., "Issuing authority not in known list", "Number format doesn't match Panama CoC pattern")
4. **Human decision is always final** — The AI verdict is a recommendation, not an action. The admin verifies or rejects.
5. **Feedback loop** — Every human decision is logged. Over time, the model improves based on admin corrections.

#### Verification Path 3 — Online Registry Check (Automated)
Many maritime certificates can be verified directly against official online registries. This path automates that lookup on demand — no manual browsing required.

**How it works:**
1. Admin (or the system automatically) clicks **"Verify Online"** on a document card
2. The system identifies the document type and determines the correct official registry to query (see registry map below)
3. An AI agent navigates to the registry, inputs the certificate number / seafarer name / issue date, and extracts the result
4. Output is logged as structured evidence on the document record:
   - `registry_url` — the official source queried
   - `query_timestamp` — exact date/time of the check
   - `registry_result` — `found_valid` / `found_expired` / `not_found` / `registry_unavailable`
   - `evidence_screenshot` — captured page showing the result
   - `raw_extracted_text` — the text the AI read from the registry page
5. This evidence is permanently attached to the document and visible to both admin and (optionally) the company viewing that seafarer

**Registry map (examples — to be expanded in Module 2B):**

| Document type | Registry | URL |
|---|---|---|
| CoC / CoP — Panama | AMP DGMM | amp.gob.pa (seafarer registry) |
| STCW Endorsements — Panama | AMP | amp.gob.pa |
| IMO Number / GISIS | IMO | gisis.imo.org |
| Flag State Certificates — Panama | Panama Ship Registry | panamashipregistry.com |
| Medical Certificate | Issuing authority (variable) | per issuer |
| OPITO Certificates | OPITO | opito.com/verify |
| DP Certificates | Nautical Institute | nautinst.org/verify |

**Trust hierarchy (three paths combined):**

```
Online Registry Check  →  highest trust (official source, timestamped evidence)
AI OCR + RAG           →  medium trust  (automated analysis, human confirms)
Human Review           →  baseline      (always available, always final)
```

A document that passes Online Registry Check can be auto-verified without human review (configurable per document type in Module 2B). A document flagged by AI OCR is routed to human review. A document where the registry is unavailable falls back to human review.

**To be developed and refined:** The registry map and query workflows for each document type will be built and tested when the admin panel sprint begins. Each registry has different UX — some have public lookup forms, others require credentials or have CAPTCHA. The AI agent approach (Claude in Chrome or similar) handles these variations gracefully.

**Evidence availability:** Once a registry check is completed and saved, the evidence (screenshot + timestamp + registry URL + extracted result) is available not only to admin but also to **company users** viewing that seafarer's profile. The company can click the Verified badge on a document and see exactly what official source confirmed it and when. This turns admin verification into a transparent, auditable trust signal — not a black box.

#### Sub-module 2B — RAG Knowledge Base Manager
This is where Rick defines the authenticity rules for each document type — no developer needed.

- List of document types (CoC Panama, STCW Basic Safety, Passport, Medical Certificate, etc.)
- Per document type, admin can configure:
  - **Required fields** (e.g., "must contain: full name, date of birth, issue date, expiry date, issuing authority, document number")
  - **Valid issuing authorities** (e.g., for CoC Panama: "Autoridad Marítima de Panamá", "AMP", "DGMM")
  - **Document number format** (regex pattern, e.g., `[A-Z]{2}-\d{6}`)
  - **Valid validity ranges** (e.g., CoC: 5 years ± 6 months)
  - **Reference images** (upload samples of authentic documents for visual comparison)
  - **Red flag keywords** (text that should never appear on a legitimate document)
- This knowledge base feeds the RAG engine at verification time

**Backend impact:**
- New field `verification_status` (enum: `pending`, `under_review`, `verified`, `rejected`) on document records in PostgreSQL
- New field `ai_verdict` (JSON: `{ status, confidence, flags[] }`) on document records
- New table `doc_type_rules` for the RAG knowledge base
- Compliance engine must weight `admin_verified` documents differently from `pending` ones
- New microservice (Python/FastAPI) for OCR + RAG processing — can live alongside existing FastAPI backend

---

---

### The Verified Badge — Leto's Trust Signal

When admin approves a document (via any of the three verification paths), the document receives a **Verified badge** — a visual seal of authenticity that is permanently attached to that document record.

**Visibility:**
- **Seafarer** sees the Verified badge on their own document in `#/myfiles` — confirmation that their credential has been reviewed and accepted
- **Company** sees the Verified badge on each document in the seafarer's profile card in `#/company-crewdb` — the trust signal they need to make hiring decisions

**What the badge communicates:**
- `✅ Verified` — reviewed and approved by Leto admin
- Sub-label indicates verification method: `"Online registry · AMP · 2026-05-24"` or `"Admin reviewed · 2026-05-24"`
- Clicking the badge opens the evidence panel: registry screenshot + timestamp + source URL (if online check was used)

**This is Leto's core value proposition:**

> *The seafarer uploads. The system verifies. The company trusts.*

No other maritime crew management platform closes this loop with AI-assisted, registry-backed, admin-approved verification with transparent evidence. The Verified badge is what makes Leto's compliance score meaningful — it's not self-reported data, it's audited truth.

**Document states visible to users:**

| State | Seafarer sees | Company sees |
|---|---|---|
| `pending` | 🕐 Under review | Not visible (hidden until verified) |
| `under_review` | 🔍 Being verified | Not visible |
| `verified` | ✅ Verified + method + date | ✅ Verified badge + evidence access |
| `rejected` | ❌ Rejected + reason | Not visible |

> **Design note:** Companies only see verified documents in a seafarer's compliance score. Pending and rejected documents do not inflate the score from the company's perspective. This prevents seafarers from gaming the system by uploading junk to appear compliant.

---

### Module 3 — Compliance Monitor

**Why:** Compliance is currently calculated client-side in the browser. The admin needs a server-authoritative view of compliance across the entire platform.

- **Platform overview:** Average compliance score · Distribution histogram (0–100%) · Breakdown by rank · By fleet category
- **Seafarer compliance table:**
  - Score · Verified docs count / Required docs count · Missing critical docs · Last updated
  - Filter: score range · rank · fleet category · nationality
  - Export to CSV
- **Expiry alerts board:**
  - All documents expiring in next 30 / 60 / 90 days, platform-wide
  - Grouped by document type (e.g., "47 CoC expire in 60 days")
  - Click-through to seafarer detail
- **Real-time:** Updates when seafarers upload or admin verifies/rejects documents

---

### Module 4 — Learning Record CMS
**Section:** 🟣 Platform Ops · **API:** new Learning API (FastAPI)

**Why:** This is how Rick builds and publishes all course content manually — no developer needed. Rick uploads the structure, images, and YouTube links; the frontend renders them automatically in the Stremio-style MetaDetails layout.

**Workflow:**
```
Rick creates Series → adds Seasons → adds Episodes (YouTube links + images)
→ publishes → API serves to frontend → MetaDetails renders clean video layout
```

#### 4A — Series Manager
The top-level course container — one per Learning Record badge.

- **List view:** all series with badge_id · category · published status · season count · episode count · last updated
- **Create / Edit form fields:**
  - `badge_id` — dropdown linking to a Learning Record badge (e.g., `solas`, `isgott`, `brm`)
  - `title` — display title (e.g., "SOLAS — Safety of Life at Sea")
  - `description` — synopsis shown in the MetaDetails header (supports markdown)
  - `background_image` — **file upload** — large hero/banner image (shown behind title in MetaDetails, ~1280×720px recommended)
  - `card_thumbnail` — **file upload** — poster/card image (~300×450px, shown in badge panel and search results)
  - `trailer_youtube_id` — optional intro video that plays before season 1
  - `category` — dropdown: Conventions / Codes / Regulations / Skills / Industry
  - `tags` — multi-select (e.g., tanker, offshore, deck, engine, fishing)
  - `is_published` — toggle (unpublished = admin-only, not visible to users)
- **Actions:** Create · Edit · Duplicate · Publish/Unpublish · Delete · Preview (opens MetaDetails in preview mode)

#### 4B — Season Manager (Modules)
Each series contains one or more seasons — thematic modules within the course.

- Accessed from within a Series — shows all seasons in order
- **Create / Edit form fields:**
  - `title` — module name (e.g., "Chapter II-2 — Fire Protection")
  - `description` — what this module covers
  - `order` — drag-to-reorder or numeric input
  - `season_thumbnail` — optional image override for this module
  - `is_published` — can publish seasons independently
- **Actions:** Add season · Edit · Reorder (drag) · Delete

#### 4C — Episode Manager (Videos)
Each season contains one or more episodes — individual YouTube video lessons.

- Accessed from within a Season — shows all episodes in order
- **Create / Edit form fields:**
  - `title` — lesson name (e.g., "Fire Detection Systems Explained")
  - `youtube_url` — paste full YouTube URL or video ID — system extracts the ID automatically
  - `description` — lesson notes or learning objectives
  - `duration` — manual input (MM:SS) or auto-fetched via YouTube oEmbed API when URL is pasted
  - `episode_thumbnail` — auto-pulled from YouTube (shown as default) or custom upload override
  - `order` — drag-to-reorder within season
  - `is_published` — toggle
- **YouTube paste UX:** When Rick pastes a YouTube URL, the form auto-fills: thumbnail, title suggestion, and duration. Rick can override any field before saving.
- **Actions:** Add episode · Edit · Reorder · Delete · Preview (opens Player with that YouTube video)

#### 4D — Content Analytics *(Phase 3+)*
- Most-watched episodes platform-wide
- Badge completion rates per badge (% of users who completed all episodes)
- Drop-off points (which episode do most users stop at)
- Active learners this week/month

---

### Module 5 — Exam & Course Management

**Why:** The STCW Exams list in `#/myexams` is currently static JSON (`examData.js`). Admin should own this catalog.

- List all courses in the STCW catalog
- Fields: code · name · IMO reference · STCW regulation · departments · level · description · duration · validity years
- Actions: Add · Edit · Archive (hide from seafarer view without deleting)
- Training Centers sub-module:
  - Manage the `training_centers_panama.json` data from the UI
  - Add/edit: name · city · district · specialties · courses_count · resolution · website

---

### Module 6 — Company–Seafarer Relationships

**Why:** Currently the company sees its seafarers via `/api/company/seafarers`, but there's no admin visibility into how those connections form or what their state is.

- View all company–seafarer associations
- Status per link: `connected` / `pending` / `interview_scheduled` / `contracted`
- Interview pipeline: all pending interviews across all companies, with seafarer + company names, status, and date
- Admin can dissolve a connection if needed (e.g., fraud, dispute)
- **Connection request flow *(future)*:** Seafarer must approve before company sees their full profile

---

### Module 7 — Platform Configuration

**Why:** Core data that currently lives in hardcoded JS files needs to be manageable by admin without touching code.

| Config area | Currently in | Admin action |
|---|---|---|
| Required docs per rank | `crewDocData.js` hardcoded | CRUD per rank × fleet category |
| Document validity periods | `crewDocData.js` hardcoded | Edit years per document type |
| Vessel types catalog | `vessel_types.json` | Add / edit / archive vessel types |
| STCW regulation mapping | `examData.js` + `crewDocData.js` | Link exam → STCW reg → required docs |
| Learning Record badges | `LEARNING_RECORD_STRATEGY.md` | Managed via Module 4 |

---

### Module 8 — Platform Analytics & Monitoring

**Why:** Operational visibility. Know what's happening on the platform in real time.

- **Active users:** Online now · Last 24h · Last 7 days · New registrations this month (Seafarers / Companies)
- **Document volume:** Uploads per day · By category · Rejection rate
- **Exam bookings:** Per course · Per month
- **Learning Record:** Badges started / completed · Most popular series · Weekly active learners
- **Compliance trends:** Platform average score over time (weekly/monthly)
- **Infrastructure:** API response times · Error rates · Storage used (uploaded docs)

---

## Admin Panel — Route Structure (proposed)

```
#/admin                               → Overview dashboard (cross-section summary)

── 🔵 Seafarer Ops (Express /crewing-api) ──────────────────────────
#/admin/seafarers                     → Module 1A — Seafarer user list
#/admin/seafarers/:id                 → Module 1A — Seafarer detail
#/admin/documents                     → Module 2 — Verification queue
#/admin/documents/rules               → Module 2B — RAG knowledge base
#/admin/documents/rules/:docType      → Module 2B — Rules for specific doc type
#/admin/compliance                    → Module 3 — Compliance monitor
#/admin/exams                         → Module 5 — STCW exam catalog + training centers

── 🟢 Company Ops (FastAPI /api) ───────────────────────────────────
#/admin/companies                     → Module 1B — Company user list
#/admin/companies/:id                 → Module 1B — Company detail
#/admin/relationships                 → Module 6 — Company–Seafarer links
#/admin/interviews                    → Module 6 — Interview pipeline

── 🟣 Platform Ops (both + Learning API) ───────────────────────────
#/admin/learning                      → Module 4A — Series list
#/admin/learning/:seriesId            → Module 4B+C — Seasons + episodes
#/admin/config                        → Module 7 — Platform configuration
#/admin/analytics                     → Module 8 — Full analytics
```

---

## Build Priority (recommended)

| Priority | Module | Reason |
|---|---|---|
| 🔴 P1 | Module 2 — Document Verification | Trust gap: unverified docs are live |
| 🔴 P1 | Module 1 — User Management | Can't operate without knowing who's on the platform |
| 🟠 P2 | Module 4 — Learning Record CMS | Blocks all Learning Record content publishing |
| 🟠 P2 | Module 3 — Compliance Monitor | Server-authoritative compliance needed before scale |
| 🟡 P3 | Module 5 — Exam & Course Management | Currently manageable via code; becomes urgent at scale |
| 🟡 P3 | Module 6 — Company–Seafarer Relationships | Important for trust and dispute resolution |
| 🟢 P4 | Module 7 — Platform Configuration | Reduces dev dependency; nice to have early |
| 🟢 P4 | Module 8 — Analytics | Valuable but not blocking |

---

## Key Architectural Notes for Developer

1. **Admin is a separate authenticated role** — `role: 'admin'` in the JWT. All admin API endpoints must check this role server-side. Admin never shares routes with seafarer or company apps.

2. **Three-section structure maps to existing backends:**
   - Seafarer Ops calls `Express /crewing-api` — backend exists, extend with admin endpoints
   - Company Ops calls `FastAPI /api` — backend exists, extend with admin endpoints
   - Platform Ops calls both + a new Learning API (FastAPI) to be created

3. **The compliance engine must move server-side** before Module 3 can be meaningful. Currently calculated in the browser via `crewDocData.js` — that logic must live in the Express backend with a DB-persisted score, updated when docs are uploaded, verified, or rejected.

4. **Document `verification_status`** (`pending` / `under_review` / `verified` / `rejected`) and **`ai_verdict`** (JSON) fields must be added to document records in PostgreSQL before Module 2 can function.

5. **OCR + RAG microservice** is a new Python service, best co-located with the existing FastAPI container or as a separate Docker service. Inputs: file bytes + document type. Output: `{ status, confidence, flags[] }`. The RAG knowledge base (`doc_type_rules` table) is managed via Module 2B.

6. **Learning Record tables** (`learning_series`, `learning_seasons`, `learning_episodes`) must be created in PostgreSQL before Module 4 can function. See `Reference/LearningRecord/LEARNING_RECORD_STRATEGY.md` for the full schema.

7. **Build order matters:** Seafarer Ops first (backend already exists and has most data), then Company Ops, then Platform Ops. The OCR/RAG service is the most complex piece and should be scoped as its own sprint.
