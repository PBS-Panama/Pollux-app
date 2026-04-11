# Leto Product Roadmap

Date: 2026-04-06
Source: Investor feedback notes (marine investor talk)
Status: Draft roadmap for planning and prioritization

---

## Goals

1. Raise data quality and trust in seafarer profiles.
2. Improve recruiter decision speed with compliance-first views.
3. Build migration and certification intelligence (visa + nationality logic).
4. Expand into operational modules (infoship, maintenance, inventory).
5. Improve adoption with onboarding, learning, and enablement content.

---

## Full Feedback Capture (as provided)

1. Popup reminders when uploading documents (quality, requirements, etc).
2. Regulations/rules per document type.
3. Capture Seaman Book experience better.
4. Report templates.
5. Marine authority agent flow: Captain 22 and Chief Engineer 22.
6. Add visa as a document.
7. Nationality analysis, including double nationality.
8. Infoship.
9. Maintenance and inventory.
10. Certification window.
11. Onboard contract rating.
12. Crew departure airports.
13. How recruiters should see/show this information.
14. Ensure user data capture quality is strong.
15. Make program implementation easier for users.
16. Tutorials.
17. Guides.
18. Videos/social media content.
19. General knowledge courses by rank.
20. Add an Onboard Continuity indicator.
21. International departure airport.
22. Visa filter for double nationality.
23. Workflow:
   - If double nationality: passport 1 and passport 2.
   - If visa exists: match visa against passport 1 or passport 2.

---

## Product Workstreams

### A) Document Compliance and Certification

Scope:
1. Upload reminder popup with quality and completeness checks.
2. Document-type regulation engine (required fields, file quality, validity windows, issuing authority constraints).
3. Add visa as first-class document category.
4. Certification window with status overview (valid, expiring, expired, missing).
5. Seaman Book structured capture:
   - Sea service entries
   - Vessel, role, dates, waters/route
   - Verified totals and timeline consistency checks

Deliverables:
1. Rules catalog by document type and rank.
2. In-app validation before upload completion.
3. Certification dashboard per user and per recruiter/company view.

### B) Identity, Nationality, and Mobility Logic

Scope:
1. Double nationality support.
2. Dual passport model (passport 1, passport 2).
3. Visa-to-passport linking.
4. Departure airport fields (including international airport).
5. Recruiter filters using nationality, passport, visa, and airport readiness.

Workflow specification (initial):
1. If user has double nationality, require two passport records.
2. Each visa must be linked to one passport record.
3. Matching logic evaluates destination/route eligibility against:
   - Nationality
   - Linked passport
   - Visa validity
   - Departure airport constraints
4. Recruiter UI must explain pass/fail reason.

Deliverables:
1. Data model updates for nationality/passport/visa relations.
2. Eligibility engine for recruiter filtering and shortlist ranking.
3. Explainability layer in UI (why eligible / why blocked).

### C) Recruiter Intelligence and Reporting

Scope:
1. Recruiter-facing profile summary for compliance and mobility readiness.
2. Report templates for candidate export and internal review.
3. Onboard contract rating.
4. Onboard Continuity indicator.

Suggested report templates:
1. Candidate compliance summary.
2. Mobility and visa readiness summary.
3. Sea service and Seaman Book evidence summary.
4. Contract performance and continuity summary.

Deliverables:
1. Recruiter dashboard cards and filters.
2. Exportable report templates (PDF/CSV as phase option).
3. Candidate scoring model (continuity + contract rating + compliance).

### D) Operations Expansion

Scope:
1. Infoship module definition.
2. Maintenance module.
3. Inventory module.
4. Maritime authority agent workflow (Captain 22 / Chief Engineer 22).

Deliverables:
1. Functional specs for each module.
2. Role-based access and data boundaries.
3. Integration plan with existing vessel and crew entities.

### D2) CV Upload and Auto-Population

Scope:
1. Allow seafarers to upload a CV (PDF/DOCX) during onboarding and from My Profile.
2. Parse the CV server-side and auto-populate the seafarer profile fields:
   - Name, nationality, city, phone, date of birth
   - Rank (mapped to canonical STCW rank IDs used by the matrix)
   - Years of experience
   - Languages, vessel types worked on, companies
   - About me / professional summary
3. Show a review screen so the user can confirm or correct extracted values before saving.
4. Mark fields as "imported from CV" with the source filename for traceability.

Workflow:
1. User uploads CV in onboarding Step 1 OR from a "Import from CV" button on My Profile.
2. Backend extracts text (pdfminer / python-docx) and runs an LLM extraction pass against a fixed schema.
3. Frontend opens a confirmation modal pre-filled with extracted values.
4. User accepts → fields are PATCHed to `/api/seafarers/me` and tag fields to their respective stores.
5. Original CV is stored alongside other documents for recruiter access.

Deliverables:
1. CV upload endpoint and storage location.
2. CV extraction service (LLM-backed, with deterministic schema).
3. "Import from CV" button on My Profile + onboarding Step 1.
4. Confirmation/review modal with diff against current values.
5. Audit field on each updated value: `imported_from = 'cv:<filename>'`.

Open questions:
1. Which LLM provider for extraction (Anthropic Claude vs. self-hosted)?
2. Acceptable extraction accuracy threshold before auto-applying vs. requiring manual review.
3. Multi-language CV support (Spanish / English / Filipino at minimum).

---

### D3) Seafarer tag fields → DB migration — DONE (2026-04-10)

Completed:
1. Added `languages`, `vessels_worked`, `companies_worked` VARCHAR(500) columns to `seafarers` table.
2. Exposed via `/api/auth/me` and `PATCH /api/seafarers/me`.
3. MyProfile reads/writes tag fields from PostgreSQL, not localStorage.
4. New `TagInput` component with +Add button, individual X removal, Enter key support.

Still pending:
- Drop the legacy `leto-profile-extra` localStorage key (CompanyProfile still uses it for company extra fields).
- Make tag fields filterable in the recruiter Crew Database.

---

### D4) UI Language and Internationalization

Scope:
1. Consolidate the app to a single consistent language (English as default).
2. Add a proper language selector in Settings that switches the full UI (not just fragments).
3. Support at minimum: English, Spanish. Future: Filipino, Portuguese.
4. Use the existing i18n/react-i18next infrastructure already wired in the codebase.
5. Store the user's language preference in PostgreSQL (seafarers/companies table) so it persists cross-browser.
6. All hardcoded Spanish strings (labels, placeholders, error messages) should go through the i18n translation function `t()`.

Current state:
- The codebase has react-i18next configured with a language JSON structure.
- Many UI strings are hardcoded in Spanish (e.g. "Agrega tus documentos", "faltantes", "por expirar").
- Others are in English (e.g. "Missing", "Valid", "Save Career").
- The Stremio-inherited language picker (30+ languages) has been removed since those translations don't exist for Leto content.

Deliverables:
1. Full English translation pass for all hardcoded strings.
2. Full Spanish translation pass.
3. Language selector in Settings backed by `/api/seafarers/me` or user preferences.
4. Language persisted per user, applied on login.
5. Fallback chain: user preference → browser locale → English.

---

### E) Adoption and Enablement

Scope:
1. Better user data capture UX and validation quality.
2. Lower-friction implementation/onboarding.
3. Tutorials and step-by-step guides.
4. Video/social content strategy.
5. General knowledge courses by rank.

Deliverables:
1. Onboarding wizard and completion checklist.
2. Help center content map (tutorials + guides + videos).
3. Rank-based learning tracks.

### F) STCW Competency Matrix and Rank Learning Paths

Scope:
1. Define a canonical STCW matrix as the single source of truth for rank requirements.
2. Organize requirements into three layers:
   - Universal (all crew)
   - Rank-required (by STCW level and function)
   - Conditional (vessel type, GT/kW, route, company overlays, flag-state overlays)
3. Standardize lifecycle states for each requirement:
   - missing, booked, in-progress, passed, valid, expiring, expired, waived
4. Connect requirements to both documents and exams/training.
5. Auto-generate rank learning paths for My Exams and compliance views.

Deliverables:
1. Matrix schema (requirement catalog, rule mapping, user status).
2. Rank-to-requirement mapping for all active ranks in the system.
3. Compliance engine output used by seafarer and recruiter views.
4. Explainability output (why compliant / why blocked).

---

## Phased Roadmap

## Phase 1 - Data Foundation and Compliance Core (High Priority)

1. Document reminder popup + upload validation.
2. Document regulation engine (top critical docs first).
3. Visa document type + certification window MVP.
4. Double nationality data model + dual passport capture.
5. Departure airport fields.
6. STCW matrix MVP with universal + rank-required rules for active ranks.

Exit criteria:
1. Users cannot complete upload with critical missing fields.
2. Visa and passport relations are stored and queryable.
3. Recruiter can filter by at least one visa and nationality criterion.

## Phase 2 - Recruiter Decision Tools (High Priority)

1. Recruiter compliance/mobility summary card.
2. Visa-double nationality filter logic in shortlist view.
3. Onboard Continuity indicator (v1 formula).
4. Contract rating model (v1).
5. Report template generation (v1).
6. Recruiter eligibility summary powered by STCW matrix output.

Exit criteria:
1. Recruiters can explain candidate eligibility from UI evidence.
2. At least 3 report templates are generated reliably.
3. Continuity and contract rating appear in shortlist/profile.

## Phase 3 - Seaman Book Intelligence and Certification Expansion (Medium Priority)

1. Structured Seaman Book experience capture.
2. Sea service timeline validation and anomaly checks.
3. Expanded certification window rules by rank and vessel profile.
4. Recruiter-ready evidence panels from Seaman Book records.

Exit criteria:
1. Seaman Book records generate validated service summaries.
2. Certification risk flags are visible per candidate.

## Phase 4 - Operations Modules (Medium Priority)

1. Infoship module MVP.
2. Maintenance module MVP.
3. Inventory module MVP.
4. Maritime authority agent process support (Captain 22 / Chief Engineer 22).

Exit criteria:
1. Vessel operations modules are connected to core crew/vessel entities.
2. Role-based permissions are enforced.

## Phase 5 - Adoption and Scale (High Priority)

1. Guided onboarding and implementation flow.
2. Tutorials, guides, and video content program.
3. Rank-based general knowledge courses.
4. Measurement loop: onboarding completion, profile completeness, recruiter conversion.

Exit criteria:
1. Measurable reduction in incomplete profiles.
2. Improved recruiter conversion from profile review to shortlist/interview.

---

## Open Definitions Needed

1. Exact regulatory meaning and rule set for Captain 22 and Chief Engineer 22.
2. Final formula for Onboard Continuity.
3. Final scoring rubric for contract rating.
4. Required fields for each report template.
5. Country/route matrix for visa-passport-nationality matching.
6. Flag-state and company override precedence over base STCW matrix.
7. Final rule for exam equivalency and accepted renewal windows.

---

## Initial KPI Set

1. Profile completion rate by role and rank.
2. Document rejection rate by type.
3. Visa/passport mismatch rate.
4. Time to recruiter decision.
5. Shortlist-to-interview conversion.
6. Certification compliance rate.
7. Onboarding completion rate.
8. Training/course completion by rank.
9. Matrix coverage ratio (requirements modeled vs required by policy).
10. Auto-compliance accuracy (engine result vs manual audit).

---

## Notes

1. This roadmap captures all investor feedback items and organizes them into delivery workstreams.
2. Implementation should start with data quality and compliance logic before adding advanced scoring or operations modules.
