"""
Compliance Engine — STCW / MLC 2006 document state calculator
Regulation source: Leto/Regulation.md §11

DocState (5 states, Regulation.md §11.1):
  VALID       — expiry beyond the warning window (or no fixed expiry)
  EXPIRING    — expiry within the warning window
  CRITICAL    — expiry within the critical window
  EXPIRED     — past expiry date
  MISSING     — no record found in DB

  The warning/critical windows default to 30/7 days but are admin-configurable
  via `platform_settings` (`expiry_warning_days`/`expiry_critical_days`,
  Handover.md nota 48) when a `db` session is passed to
  build_compliance_report() — see `_expiry_thresholds()`.

Hard-block rule (§11.4): any DocLevel.CRITICAL doc in EXPIRED or MISSING
state sets can_be_listed = False.

Unified engine (2026-09-14): the required-document SET is no longer this
module's own RANK_CATALOG — it's resolved by
document_requirements.required_docs_for_profile(), the engine that actually
recognizes every real rank a seafarer can pick at registration (RANK_CATALOG's
rank keys were STCW-legacy strings like "2nd-mate" that never matched the
real ranks_stcw.json ids like "2nd_officer"; see Handover.md nota (6)/(9) for
the full diagnosis). This module now only attaches regulatory metadata
(document_requirements.DOC_METADATA) to each required title and runs the
state machine below over that set.

RANK_CATALOG itself, its `_bst()`/`_medical()`/etc. constructors, and the
`get_catalog_for_rank()`/`_get_catalog_from_db()` helpers that read it or the
`rank_compliance_catalog` table were retired 2026-09-14 (Handover.md, nota
(36)) — the Phase 2 re-pointing this docstring used to describe as pending
was already done (admin `/config/catalog` CRUD returns 410, the public
`/compliance/catalog*` GETs read `RANK_REQUIRED_DOCS`), which made all three
genuinely dead. `RANK_FLEET_CAT` below is unrelated and stays — it's a plain
rank→fleet-category lookup, still used by `test_compliance_engine.py`. The
`rank_compliance_catalog` DB table also stays (production data, no migration
without Rick's GO) — only the code paths that wrote/read it via this module
are gone; `admin.py`'s read-only GET queries the table directly.
"""

from dataclasses import dataclass
from datetime import date
from enum import Enum
from typing import Optional

from sqlalchemy import text

from app.services.document_requirements import required_docs_for_profile, DOC_METADATA, rank_is_covered, TO_TITLES

_DEFAULT_EXPIRY_CRITICAL_DAYS = 7
_DEFAULT_EXPIRY_WARNING_DAYS = 30


# ── Enums ─────────────────────────────────────────────────────────────────────

class DocState(str, Enum):
    VALID    = "VALID"
    EXPIRING = "EXPIRING"
    CRITICAL = "CRITICAL"
    EXPIRED  = "EXPIRED"
    MISSING  = "MISSING"


class DocLevel(str, Enum):
    CRITICAL = "critical"
    HIGH     = "high"
    STANDARD = "standard"


class DocCertType(str, Enum):
    CR = "C/R"   # Certificate Required — official STCW CoC/endorsement
    DP = "D/P"   # Documentary Proof — course certificate
    TO = "T/O"   # Training Onboard — no file, ship-specific familiarisation
    ER = "E/R"   # Endorsement Required — flag state recognition


# ── Data models ───────────────────────────────────────────────────────────────

@dataclass
class RequiredDoc:
    name: str
    cert: str                     # canonical cert code used for DB matching
    level: DocLevel
    cert_type: DocCertType
    validity_years: Optional[int] = None   # None = no fixed expiry
    key: Optional[str] = None     # optional slug key — preferred match if stored in doc_key


@dataclass
class DocComplianceItem:
    name: str
    cert: str
    level: str
    cert_type: str
    validity_years: Optional[int]
    state: DocState
    issued_date: Optional[date]
    expiry_date: Optional[date]
    days_remaining: Optional[int]  # None if no expiry or missing
    has_file: bool
    verification_status: Optional[str] = None  # pending | under_review | verified | rejected
    ai_verdict: Optional[dict] = None          # JSONB from Obj.3 OCR analysis


@dataclass
class ComplianceReport:
    rank: str
    total_required: int       # non-T/O docs only
    valid_count: int
    expiring_count: int       # ≤30 days
    critical_count: int       # ≤7 days
    expired_count: int
    missing_count: int
    compliance_score: float   # (valid + expiring) / total_required
    can_be_listed: bool       # False if any critical-level doc is EXPIRED or MISSING
    is_fully_compliant: bool  # True if expired_count == missing_count == 0
    rank_recognized: bool     # False if the rank/profile resolved to zero required docs —
                              # distinct from "fully compliant"; see PATCH-01 / Handover nota (9)/(10)
    docs: list
    to_docs_count: int        # informational — T/O docs are not file-tracked


# 2026-09-14 (nota (26)/(29) de Rick): ya no es una constante — un 0 honesto vale
# más que un 3 inventado para todo el mundo. Cuenta los T/O que el marino
# realmente subió, matcheando por doc_key contra las 3 títulos T/O reales.
def _count_to_docs(documents: list) -> int:
    return sum(1 for d in documents if getattr(d, "doc_key", None) in TO_TITLES)

# ── Fleet category mapping ─────────────────────────────────────────────────────
# 🔴 NOT interchangeable with RANK_REQUIRED_DOCS (document_requirements.py) as a
# validation vocabulary — these two dicts are indexed at different normalization
# stages. This one uses PRE-normalize_rank() spellings ("chief-mate", "2nd-mate",
# "eto"); RANK_REQUIRED_DOCS uses the POST-normalize_rank() spellings
# ("chief-officer", "2nd-officer", "electrician"). Validating normalize_rank(x)
# against this dict instead of rank_is_covered() silently 400s common ranks
# (Handover.md note 32). To check whether a rank is real, call
# document_requirements.rank_is_covered() — never this dict directly.

RANK_FLEET_CAT: dict[str, str] = {
    "master": "merchant", "chief-mate": "merchant", "2nd-mate": "merchant",
    "3rd-mate": "merchant", "bosun": "merchant", "ab": "merchant",
    "os": "merchant", "deck-cadet": "merchant", "gmdss-operator": "merchant",
    "chief-engineer": "merchant", "2nd-engineer": "merchant",
    "3rd-engineer": "merchant", "4th-engineer": "merchant",
    "eto": "merchant", "ase": "merchant", "oiler": "merchant",
    "etr": "merchant", "engine-cadet": "merchant",
    "cook": "merchant", "steward": "merchant",
    "oim-fixed": "offshore", "oim-modu": "offshore", "oim-mou": "offshore",
    "barge-supervisor": "offshore", "ballast-operator": "offshore",
    "maintenance-supervisor": "offshore", "ab-mou": "offshore",
    "os-mou": "offshore", "oiler-mou": "offshore", "toolpusher": "offshore",
    "driller": "offshore", "radio-operator-mou": "offshore",
    "marine-tech-fixed": "offshore", "marine-tech-mou": "offshore",
    "fishing-captain": "fishing", "fishing-officer": "fishing",
    "fishing-chief-engineer": "fishing", "fishing-engineer": "fishing",
    "fishing-technician": "fishing", "fishing-observer": "fishing",
    "yacht-captain": "yacht", "yacht-captain-500": "yacht",
    "yacht-captain-200": "yacht", "yacht-officer": "yacht",
    "yacht-chief-engineer": "yacht", "yacht-chief-engineer-750": "yacht",
    "yacht-engineer": "yacht",
    "an-marinero": "national", "an-lancha-2": "national", "an-lancha-1": "national",
    "an-patron-100": "national", "an-patron-500": "national",
    "an-placer-3": "national", "an-placer-2": "national", "an-placer-1": "national",
    "an-remolcador": "national", "an-pesca-2": "national", "an-pesca-1": "national",
    "an-maquinista": "national", "an-tecnico": "national",
}


# ── Core helpers ───────────────────────────────────────────────────────────────

def _normalize(cert: str) -> str:
    return cert.lower().strip()


def _expiry_thresholds(db) -> tuple[int, int]:
    """(critical_days, warning_days) — admin-configurable via `platform_settings`
    (Handover.md nota 48: `expiry_critical_days`/`expiry_warning_days`, the
    only two of the four seeded settings with an actual reader). Falls back to
    the original hardcoded values when `db` is None or a row is missing/
    unparseable, so every existing caller keeps behaving exactly as before
    unless an admin has actually changed something."""
    critical, warning = _DEFAULT_EXPIRY_CRITICAL_DAYS, _DEFAULT_EXPIRY_WARNING_DAYS
    if db is None:
        return critical, warning
    try:
        rows = db.execute(text(
            "SELECT key, value FROM platform_settings "
            "WHERE key IN ('expiry_critical_days', 'expiry_warning_days')"
        )).fetchall()
        values = {r.key: r.value for r in rows}
        if "expiry_critical_days" in values:
            critical = int(values["expiry_critical_days"])
        if "expiry_warning_days" in values:
            warning = int(values["expiry_warning_days"])
    except Exception:
        return _DEFAULT_EXPIRY_CRITICAL_DAYS, _DEFAULT_EXPIRY_WARNING_DAYS
    return critical, warning


def _calculate_state(
    expiry_date: Optional[date], today: date,
    critical_days: int = _DEFAULT_EXPIRY_CRITICAL_DAYS,
    warning_days: int = _DEFAULT_EXPIRY_WARNING_DAYS,
) -> DocState:
    if expiry_date is None:
        return DocState.VALID
    days = (expiry_date - today).days
    if days < 0:
        return DocState.EXPIRED
    if days <= critical_days:
        return DocState.CRITICAL
    if days <= warning_days:
        return DocState.EXPIRING
    return DocState.VALID


# ── Unified required-set resolver ───────────────────────────────────────────
# The single place that turns "rank + maritime profile" into a required-doc
# set for BOTH compliance_engine (this module) and /seafarer/me/required-docs
# (document_requirements.py directly) — membership always comes from
# required_docs_for_profile(), so the two can't diverge again the way
# RANK_CATALOG vs RANK_REQUIRED_DOCS did (Handover nota (6)).

def _required_docs_unified(
    rank: str,
    coc_type: Optional[str],
    cop_tanker_type: Optional[str],
    cop_tanker_level: Optional[str],
    flag_endorsements: Optional[list],
    special_endorsements: Optional[list],
    vessel_type_ids: Optional[list],
) -> list[RequiredDoc]:
    titles = required_docs_for_profile(
        rank=rank,
        coc_type=coc_type,
        cop_tanker_type=cop_tanker_type,
        cop_tanker_level=cop_tanker_level,
        flag_endorsements=flag_endorsements,
        special_endorsements=special_endorsements,
        vessel_type_ids=vessel_type_ids,
    )
    result = []
    for title in titles:
        # DOC_METADATA is exhaustive over every title required_docs_for_profile()
        # can return (verified 45/45 — see Handover.md). This fallback only
        # guards against the two staying out of sync in the future; it should
        # never actually trigger in production.
        meta = DOC_METADATA.get(title, {"level": "standard", "cert_type": "D/P", "validity_years": None})
        result.append(RequiredDoc(
            name=title,
            cert=title,
            # `key` is what actually gets matched against Document.doc_key below
            # (doc_by_key, the "preferred" lookup) — doc_key is documented on the
            # model as storing exactly this long IMO-title vocabulary. Old
            # RANK_CATALOG builders never set `key`, so this match path was dead
            # in practice; matching happened only via cert_code's short STCW
            # codes ("STCW Reg. VI/1"), which don't exist in this vocabulary at
            # all. Without this line every doc would show MISSING regardless of
            # what the seafarer actually uploaded.
            key=title,
            level=DocLevel(meta["level"]),
            cert_type=DocCertType(meta["cert_type"]),
            validity_years=meta["validity_years"],
        ))
    return result


# ── Public API ─────────────────────────────────────────────────────────────────

def build_compliance_report(
    rank: str,
    documents: list,            # list of Document ORM objects
    today: Optional[date] = None,
    db=None,                    # used for the expiry thresholds below (nota 48); not for set resolution
    coc_type: Optional[str] = None,
    cop_tanker_type: Optional[str] = None,
    cop_tanker_level: Optional[str] = None,
    flag_endorsements: Optional[list] = None,
    special_endorsements: Optional[list] = None,
    vessel_type_ids: Optional[list] = None,
) -> ComplianceReport:
    """
    Compare a seafarer's uploaded documents against the required-doc set for
    their rank and full maritime profile, and return a full compliance report.

    The required set comes from document_requirements.required_docs_for_profile()
    — the engine that normalizes every real rank a seafarer can register with —
    with regulatory metadata (level/cert_type/validity_years) attached per title
    via DOC_METADATA. See module docstring for why this replaced RANK_CATALOG.

    Matching strategy: normalize cert_code (lowercase strip) against each
    RequiredDoc.cert. Within a single rank's required set cert codes are
    unique — no ambiguity. T/O docs are excluded from file-tracking.
    """
    if today is None:
        today = date.today()
    critical_days, warning_days = _expiry_thresholds(db)

    required: list[RequiredDoc] = _required_docs_unified(
        rank, coc_type, cop_tanker_type, cop_tanker_level,
        flag_endorsements, special_endorsements, vessel_type_ids,
    )

    # Build lookups: by doc_key slug (preferred) and by normalized cert_code (fallback)
    doc_by_key: dict[str, object] = {}
    doc_by_cert: dict[str, object] = {}
    for d in documents:
        if getattr(d, "doc_key", None):
            existing = doc_by_key.get(d.doc_key)
            if existing is None or d.uploaded_at > existing.uploaded_at:
                doc_by_key[d.doc_key] = d
        if d.cert_code:
            k = _normalize(d.cert_code)
            existing = doc_by_cert.get(k)
            if existing is None or d.uploaded_at > existing.uploaded_at:
                doc_by_cert[k] = d

    items: list[DocComplianceItem] = []
    valid_c = expiring_c = critical_c = expired_c = missing_c = 0
    can_be_listed = True

    for req in required:
        # Prefer doc_key match; fall back to cert_code
        db_doc = (doc_by_key.get(req.key) if req.key else None) or doc_by_cert.get(_normalize(req.cert))

        if db_doc is None:
            state = DocState.MISSING
            issued_date = expiry_date = days_remaining = None
            has_file = False
        else:
            issued_date  = db_doc.issued_date
            expiry_date  = db_doc.expiry_date
            has_file     = bool(db_doc.file_path)
            state        = _calculate_state(expiry_date, today, critical_days, warning_days)
            days_remaining = (expiry_date - today).days if expiry_date else None

        match state:
            case DocState.VALID:    valid_c    += 1
            case DocState.EXPIRING: expiring_c += 1
            case DocState.CRITICAL: critical_c += 1
            case DocState.EXPIRED:  expired_c  += 1
            case DocState.MISSING:  missing_c  += 1

        if req.level == DocLevel.CRITICAL and state in (DocState.EXPIRED, DocState.MISSING):
            can_be_listed = False

        items.append(DocComplianceItem(
            name=req.name,
            cert=req.cert,
            level=req.level.value,
            cert_type=req.cert_type.value,
            validity_years=req.validity_years,
            state=state,
            issued_date=issued_date,
            expiry_date=expiry_date,
            days_remaining=days_remaining,
            has_file=has_file,
            verification_status=getattr(db_doc, "verification_status", None) if db_doc else None,
            ai_verdict=getattr(db_doc, "ai_verdict", None) if db_doc else None,
        ))

    total = len(required)
    score = (valid_c + expiring_c) / total if total > 0 else 0.0

    # Fallar cerrado: un conjunto requerido vacío significa que no reconocemos
    # el rango en el catálogo, no que al marino no le falta nada. Sin esto,
    # "cero documentos requeridos" se leía como "cumple todo".
    if total == 0:
        can_be_listed = False

    # PATCH-03 (2026-09-14): total > 0 no basta. Un rango fuera de
    # RANK_REQUIRED_DOCS (offshore/fishing/yacht/national, ~34 hoy) puede
    # tener total_required > 0 solo por extras del perfil (BOSIET/HUET/
    # tanquero) sin ninguno de los ítems base (pasaporte, médico, etc.) —
    # con esos extras vigentes, el guard de total==0 de arriba no dispara y
    # is_fully_compliant salía True. Es el mismo falso positivo de PATCH-01,
    # entrando por total==2 en vez de total==0. Se deja el guard de arriba
    # tal cual, redundante a propósito — dos cierres independientes.
    recognized = rank_is_covered(rank)
    if not recognized:
        can_be_listed = False

    return ComplianceReport(
        rank=rank,
        total_required=total,
        valid_count=valid_c,
        expiring_count=expiring_c,
        critical_count=critical_c,
        expired_count=expired_c,
        missing_count=missing_c,
        compliance_score=round(score, 3),
        can_be_listed=can_be_listed,
        is_fully_compliant=(recognized and total > 0 and expired_c == 0 and missing_c == 0),
        rank_recognized=recognized,
        docs=items,
        to_docs_count=_count_to_docs(documents),
    )
