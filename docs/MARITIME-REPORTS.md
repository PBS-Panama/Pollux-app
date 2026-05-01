# Maritime Crewing Reports — Research Digest and Implementation Plan

> **Purpose:** This document captures industry research on standard maritime crewing report templates used by manning agencies, shipping operators, flag states, and oil majors. It then translates that research into a concrete, slice-by-slice implementation plan for Leto.
>
> **Context:** Investor feedback explicitly asked for *"report templates"* — at least Candidate Compliance, Mobility/Visa, Sea Service, and Contract Performance. This document is the basis for Phase 2 (Recruiter Decision Tools) delivery.

---

## 1. Industry Research — Standard Report Set

The maritime crewing industry is remarkably standardized on a core set of reports. Most of them are driven by regulation (STCW, MLC, FAL, SOLAS) rather than market preference, so every serious SaaS in the space (Adonis, Martide, Compass, MarinelCS, OctoMarine) ships roughly the same templates.

### The six reports that matter most

| # | Report | Regulatory Basis | Primary Use |
|---|--------|------------------|-------------|
| 1 | **Candidate Compliance Report** | STCW Reg. I/2 | Pre-embarkation; hiring decisions |
| 2 | **Sea Service Testimonial** | STCW Reg. I/11, MLC A2.1.3 | Proof of experience for CoC upgrades & new jobs |
| 3 | **Certificate Expiry Matrix** | STCW, MLC | Monthly ops — what expires in 60/30/7 days |
| 4 | **IMO FAL Form 5 (Crew List)** | FAL Convention | **Mandatory** at every port call; MSW electronic submission from 2024 |
| 5 | **PSC Readiness Dashboard** | Paris/Tokyo MoU, USCG, AMSA | Pre-inspection traffic-light |
| 6 | **Rest Hours Report** | STCW A-VIII/1, MLC A2.3 | Compliance on rest periods |

Secondary reports seen in the industry:
- Crew Change Plan / Pre-Embarkation Checklist
- Seafarer Employment Agreement (SEA) status report
- Training/Drill Matrix (SOLAS III)
- Crew Appraisal / Performance Report (separate from Sea Service per MLC)
- Flag State Endorsement (FSE/CoR) Tracker
- Mobility / Visa Readiness ("Deployability Matrix" in OCIMF/OVMSA terminology)

---

## 2. Canonical Template Structures

### 2.1 Candidate Compliance Report

**Header block:**
- Seafarer full name, DOB, nationality, Seaman Book No., CDC-issuing authority
- Rank applied for, intended vessel / vessel type (tanker, bulker, container)
- Manning agent, principal/owner, report date, report reference number

**Personal Documents Table:**
```
Document Type | Document No. | Issuing Country/Authority | Issue Date | Expiry Date | Status | File Ref
```
Covers: Passport, Seaman's Book (CDC), National ID, Yellow Fever, COVID vaccination, Visa(s) (C1/D, Schengen, UK transit), Flag State Endorsements.

**STCW Certification Matrix** — grid of STCW Table A-II/A-III/A-VI requirements vs. holdings:
```
STCW Reference | Certificate Title | Cert No. | Issuing MET/Flag | Issue | Expiry | Revalidation Due | Status
```

Core rows: STCW II/1, II/2, III/1, III/2 (CoC); VI/1 (PSSR, PST, FPFF, EFA); VI/2 (Survival Craft); VI/3 (Advanced Firefighting); VI/4 (Medical First Aid/Care); V/1-1 & V/1-2 (Tanker); Security (VI/5 SSO, VI/6 Security Awareness/Duties); ECDIS, ARPA, GMDSS, BRM/ERM, HELM.

**Medical & MLC section:** ENG1/equivalent, drug & alcohol test, MLC DMLC Part II compliance.

**Footer:** Crewing Manager signature, DPA countersignature, company stamp, QR/verification code, disclaimer referencing STCW Reg. I/2.

### 2.2 Sea Service Testimonial

**Legally sensitive** — used to count sea time for CoC upgrades under STCW Reg. I/11 and flag-state revalidation.

**Per-vessel row fields:**
```
Vessel Name | IMO No. | Flag | Call Sign | GRT/DWT | Vessel Type | Main Engine kW |
Rank Held | Sign-On Port & Date | Sign-Off Port & Date | Duration (days) |
Trading Area (Near Coastal / Unlimited) | Master's Name | Remarks
```

**Aggregated totals** at foot: total sea time, time-in-rank, time on specific tonnage/power tiers (≥3000 GT, ≥750 kW), time on specific ship types (oil/chemical/gas tanker — required for V/1 endorsements).

- Issued on company letterhead
- Signed by Master (per MLC A2.1.3 "record of employment" / "discharge book entry")
- Countersigned by DPA or Crewing Manager
- **Must NOT contain appraisal language** per MLC — appraisal is a separate document

### 2.3 PSC Readiness Dashboard

Format follows **Paris MoU CIC** checklist themes:
- Manning vs. Minimum Safe Manning Document (flag-issued)
- Every crew member: CoC + FSE valid, original on board
- Rest hours compliance last 7/14 days (STCW A-VIII)
- SEA signed, DMLC Part I & II on board
- Working language proficiency (SOLAS V/14.3)
- Drill records (last 30 days)
- Crew familiarization records (ISM Code 6.3, 6.5)

Output: one-page "traffic light" dashboard + exception list.

### 2.4 IMO FAL Form 5 (Crew List)

**Mandatory at every port call under FAL Convention**. 2024 amendments require electronic submission via **Maritime Single Window**.

Standard fields (IMO FAL.5/Circ):
```
No. | Family Name | Given Names | Rank/Rating | Nationality | DOB | Place of Birth |
Gender | ID Document Type | ID No. | Issuing State | Expiry | Visa No. (if required) |
Port & Date of Embarkation
```

Header: Ship name, IMO, call sign, flag, voyage no., port of arrival, date of arrival, last port, next port, Master's name/signature.

### 2.5 Mobility / Visa Readiness Report ("Deployability Matrix")

No single legacy template — this is largely a **modern SaaS view**, with precedent in oil-major internal matrices (Shell, Chevron, BP maintain similar "OCIMF OVMSA crew matrix" views).

Useful fields:
```
Seafarer | Passport expiry (≥6 months rule) | Blank passport pages |
Held visas + validity | Visa gaps for likely ports | Yellow Fever & vaccination status |
OTG clearance (tanker operators) | Home airport / travel readiness |
Flag FSE coverage
```

Framing this as **"Deployability Matrix"** aligns with oil-major terminology and is more fundable.

---

## 3. Regulatory References

| Regulation | Coverage |
|------------|----------|
| **STCW 1978 as amended (2010 Manila)** | CoC/endorsement format, Reg. I/2, I/11; Sections A-I/2 and A-I/11 |
| **MLC 2006** | SEA (Reg. 2.1), medical (1.2), hours of rest (2.3), record of employment (A2.1.3), DMLC Parts I & II |
| **SOLAS Ch. V/14** | Manning & language |
| **SOLAS Ch. III** | Drills |
| **ISM Code §6 & §7** | Familiarization, shipboard ops |
| **FAL Convention** | Crew List, Crew's Effects |
| **Panama Maritime Authority MMC-345** | Seafarer documentation (Panama flag) |
| **Liberia Marine Notice CRE-002** | CoC issuance (Liberia flag) |
| **Marshall Islands MN 7-039-1** | Manning (MI flag) |
| **OCIMF SIRE 2.0, TMSA 3 (Element 3)** | Tanker-operator reporting expectations |
| **RightShip RISQ 3** | Dry bulk equivalent |

---

## 4. Export Format Expectations

| Format | Use | Priority |
|--------|-----|----------|
| **PDF** | Signed/stamped documents (Sea Service Letter, Compliance Report, FAL forms). A4, letterhead, signature block, QR verification increasingly expected | **P0** |
| **Excel/CSV** | Matrices (certificate expiry, manning plan, rest hours upload to port authorities) | **P0** |
| **XML/JSON** | Maritime Single Window submissions (IMO Compendium data model) — mandatory from 2024 | **P2** (differentiator) |
| **Word (.docx)** | Sea Service Testimonials historically circulated as Word; agents still expect editable versions | **P1** |

**Recommendation:** ship PDF + Excel first (covers 90% of demand), add MSW XML later as a differentiator.

---

## 5. Report Generation Triggers

| Trigger | Reports |
|---------|---------|
| **Pre-embarkation (T-14 / T-7 / T-0)** | Compliance Report, Visa Readiness, Travel Brief |
| **Pre-PSC (on ETA to MoU port)** | PSC Readiness dashboard, Rest Hours last 14 days |
| **Pre-vetting (SIRE/RISQ inspection)** | Full crew matrix + tanker endorsements |
| **Crew Change** | Off-signer Sea Service Letter auto-issued; On-signer Compliance pack |
| **Monthly** | Certificate Expiry (60/30/7 day horizons), Manning Plan vs. MSMD |
| **Annual** | MLC audit pack, TMSA KRA reporting |
| **Ad-hoc** | Seafarer-initiated (for promotion applications, visa applications, tax) |
| **End of contract** | Appraisal + Sea Service Testimonial + discharge book entry |

---

## 6. Implementation Plan — Recommended Slice Sequence

The following plan staggers report delivery so we ship real value in every slice while building reusable infrastructure.

### Slice A — Report Framework + Data Model (1 session)

**Goal:** Generic infrastructure that all future reports will use.

**Scope:**
1. New PostgreSQL table: `report_templates` with columns:
   - `id, name, trigger, regulatory_basis[], output_formats[], sections[] (JSONB), created_at`
2. New PostgreSQL table: `generated_reports` with columns:
   - `id, template_id, target_type (seafarer/vessel/fleet), target_id, generated_by, generated_at, format, file_path, data (JSONB snapshot)`
3. Backend endpoint: `POST /api/reports/generate` — accepts `{ template_id, target_type, target_id, format }`, returns the generated report metadata + download URL
4. Backend endpoint: `GET /api/reports/{report_id}/download` — streams the file
5. Backend endpoint: `GET /api/reports/templates` — lists available templates
6. PDF rendering: reuse `pdf-lib` already in the crewing container (currently used for document rotation)
7. Excel rendering: add `exceljs` dependency

**Deliverables:**
- Empty-shell endpoints that accept a template ID and return a trivial PDF (e.g. just header with seafarer name). Proves the plumbing works end-to-end.
- Frontend "Reports" button on Crew Database seafarer detail panel + "Download Compliance Report" action.

**Why first:** every subsequent report reuses this plumbing. Without the framework, each template is a one-off.

---

### Slice B — Candidate Compliance Report (1 session)

**Goal:** First real, useful template. Directly maps to investor feedback.

**Scope:**
1. Template entry for "Candidate Compliance Report" with sections: header, personal_docs, stcw_matrix, medical_mlc, footer
2. PDF layout:
   - Company letterhead placeholder (configurable per company)
   - Header block with seafarer info + report metadata + QR code
   - Personal Documents Table
   - STCW Certification Matrix grid
   - Medical & MLC compliance section
   - Signature block (DPA countersignature placeholder)
3. Data source: **already built** — the `complianceEngine.js` produces the compliance summary we need
4. Frontend: "Generate Compliance Report" button on Crew Database preview panel → opens in new tab as PDF

**Deliverables:**
- Functional PDF download showing real seafarer compliance data
- Company can share with flag states, principals, or the seafarer themselves

**Why second:** reuses the compliance engine, no new data required. Highest value per effort.

---

### Slice C — Sea Service Testimonial (2-3 sessions)

**⚠️ Blocked on new data model.** This is the long-term correct path.

**Scope:**
1. New PostgreSQL table: `sea_service_entries` with columns:
   - `id, seafarer_id, vessel_imo, vessel_name, flag, grt, dwt, vessel_type, main_engine_kw, rank_held, sign_on_port, sign_on_date, sign_off_port, sign_off_date, trading_area, master_name, remarks, verified, created_at`
2. Data capture UX:
   - Seafarer side: self-declare past sea service in My Profile → Sea Service section
   - Company side: auto-create entries when an assignment moves from 'active' → 'completed'
   - CSV import for historical sea service (bulk onboarding)
3. Backend aggregation endpoint: `GET /api/seafarers/{id}/sea-service-summary` — returns aggregated totals by tonnage, vessel type, rank
4. Template: "Sea Service Testimonial" PDF on company letterhead
5. Frontend: Seafarer can request testimonial → company-side approval flow → generated PDF

**Deliverables:**
- Seafarers can prove experience for CoC upgrades and job applications
- This is the **most-used document in the industry** for promotions

**Why slice C is after B:** needs new data model and capture UX. Worth the investment because:
- It's what STCW I/11 actually requires
- It aligns with ROADMAP Phase 3 (Seaman Book Intelligence)
- It's the single most requested document seafarers ask manning agents for

**Alternative (quicker, lower fidelity):** derive Sea Service purely from the existing `assignments` table. Lacks port/trading area/GRT/kW data, so won't satisfy flag state requirements — but could be a v0 for demos.

---

### Slice D — Certificate Expiry Matrix (0.5 session)

**Goal:** Fleet-level operational dashboard for the company user.

**Scope:**
1. Backend endpoint: `GET /api/companies/{cid}/certificate-expiry-matrix` — aggregates all seafarers' uploaded docs + expiry dates
2. Query params: `horizon=60|30|7` days, `vessel_id=...` (optional filter)
3. Output: CSV + PDF
4. Frontend: New "Reports" tab on company Crew Database → "Certificate Expiry" card → date horizon selector → download

**Deliverables:**
- Monthly-ops-ready view of what's expiring across the fleet
- Enables the 60/30/7-day early-warning workflow every manning agency runs

---

### Slice E — IMO FAL Form 5 (Crew List) (1 session)

**Goal:** Mandatory regulatory deliverable at every port call.

**Scope:**
1. Tie Crew List to a Vessel + voyage (needs `voyages` table — may need new model)
2. Backend endpoint: `GET /api/companies/{cid}/vessels/{vid}/crew-list?voyage_number=X&port_of_arrival=Y`
3. Pull all active assignments for the vessel, project into FAL.5 field layout
4. Output: PDF (for print) + XML per IMO Compendium data model (for MSW submission)
5. Frontend: "Generate Crew List" action on vessel card

**Deliverables:**
- Printable PDF for port officials
- MSW-compatible XML as a differentiator vs. competitors still on paper

**Dependency:** may need minimal voyage tracking (port_of_arrival, voyage_number, ETA) — could start with a simple form until voyage module exists.

---

### Slice F — PSC Readiness Dashboard + Rest Hours (2 sessions)

**Goal:** Pre-inspection tooling that sells to tanker operators (OCIMF/SIRE-driven).

**Scope:**
1. Rest Hours data capture (per-day, per-crew) — new UI + table
2. PSC Readiness endpoint that aggregates Rest Hours + Crew compliance + Drills + SEA status
3. Traffic-light dashboard (green/yellow/red) per PSC theme
4. Export: PDF dashboard + Rest Hours CSV in IMO format

**Why last:** requires the most new data (rest hours, drill records) and is the most tanker-specific. Best saved until after the general-purpose reports are validated with users.

---

## 7. My Recommendation for the Next Session

**Ship Slice A + B together.** That delivers a real downloadable PDF for the first investor-requested template (Candidate Compliance Report) plus the framework for everything else. Incremental cost is mostly the PDF layout since we already have the compliance data from `complianceEngine.js`.

**In parallel / soon after:** polish the Settings page as mentioned in the session — app version, user prefs, logout, company settings (for company accounts). Investors will notice this.

**Slice C decision point:** After shipping A + B, decide between:
- **A)** Derive Sea Service from `assignments` table only (quick, low fidelity, ~1 session)
- **B)** Build proper `sea_service_entries` table (correct per STCW I/11, aligns with Phase 3, ~2-3 sessions)
- **C)** Defer entirely until we implement structured Seaman Book capture

**Recommend B** — it's the same data any serious crewing SaaS needs and the industry expects it.

---

## 8. Data Modeling Recommendations

Build a single **`ReportTemplate` entity** with polymorphic sections:

```python
class ReportTemplate(Base):
    id: str (PK)
    name: str                              # "Candidate Compliance Report"
    trigger: str                           # "pre_embarkation" | "monthly" | ...
    regulatory_basis: list[str]            # ["STCW Reg. I/2", "MLC A2.1.3"]
    output_formats: list[str]              # ["pdf", "xlsx", "xml"]
    sections: JSONB                        # structured section definitions
    target_type: str                       # "seafarer" | "vessel" | "fleet"
    active: bool
```

**Core templates to ship first (prioritized):**
1. Candidate Compliance Report (Slice B)
2. Sea Service Testimonial (Slice C)
3. Certificate Expiry Matrix (Slice D)
4. IMO FAL Form 5 (Slice E)
5. PSC Readiness (Slice F)
6. Rest Hours Report (Slice F)

These six cover the bulk of what manning agencies, tanker operators (OCIMF/SIRE-driven), and flag states expect — and directly map to the four investor-requested reports (Candidate Compliance, Mobility/Visa, Sea Service, Contract Performance).

---

## 9. KPIs to Track Post-Launch

- Report generation rate per company per month
- PDF download conversion rate (generated → downloaded)
- Which templates get used most (informs roadmap)
- Time-to-generate vs. manual preparation (marketing claim)
- Error rate (missing fields, expired data in output)

---

## 10. Open Questions Before Implementation

1. **Company letterhead/branding** — how do companies upload their logo for PDF reports? (needs new UI — company settings section)
2. **Digital signatures** — do we need real cryptographic signatures (PAdES, eIDAS) or is a typed signature block enough for v1?
3. **QR verification codes** — should they link to a public "verify this report" endpoint on our platform?
4. **Multi-language reports** — investor feedback mentioned i18n; reports are often printed in multiple languages for different flag states
5. **Report retention** — how long do we store generated PDFs? GDPR/MLC requirements?
6. **Access control** — can a seafarer download their own Compliance Report, or only companies?

These should be resolved before Slice A starts.

---

*Document prepared 2026-04-14. Research sources: IMO FAL.5/Circ, STCW 1978 amended, MLC 2006, OCIMF TMSA 3 Element 3, Paris MoU CIC themes, flag-state marine notices (Panama MMC-345, Liberia CRE-002, Marshall Islands MN 7-039-1), and public output of existing maritime SaaS (Adonis, Martide, Compass, MarinelCS).*
