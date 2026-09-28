from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.session import get_db
from app.core.deps import get_current_user, require_admin
from app.models.user import User
from app.models.document import Document
from app.models.seafarer import Seafarer
from app.schemas.compliance import (
    ComplianceReportResponse,
    DocComplianceItemResponse,
    CatalogDocResponse,
)
from app.services.compliance_engine import build_compliance_report
from app.services.document_requirements import required_docs_for_profile, DOC_METADATA, RANK_REQUIRED_DOCS

router = APIRouter()


def _build_response(r):
    return ComplianceReportResponse(
        rank=r.rank,
        total_required=r.total_required,
        valid_count=r.valid_count,
        expiring_count=r.expiring_count,
        critical_count=r.critical_count,
        expired_count=r.expired_count,
        missing_count=r.missing_count,
        compliance_score=r.compliance_score,
        can_be_listed=r.can_be_listed,
        is_fully_compliant=r.is_fully_compliant,
        rank_recognized=r.rank_recognized,
        to_docs_count=r.to_docs_count,
        docs=[DocComplianceItemResponse(**item.__dict__) for item in r.docs],
    )


def _build_report_for(seafarer: Seafarer, documents: list, db: Session = None) -> "ComplianceReportResponse":
    # Unified engine (2026-09-14): the required set is profile-sensitive, not
    # just rank — same fields /seafarer/me/required-docs already passes to
    # required_docs_for_profile(), so the two endpoints can't diverge again.
    # `db`, when given, is also how build_compliance_report() reads the
    # admin-configured expiry thresholds (Handover.md nota 48) instead of the
    # hardcoded defaults — was always `db=None` here, which meant this
    # endpoint's own thresholds could never be configured even after Module 7
    # wired the other one. Both compliance endpoints now pass their real
    # session through.
    r = build_compliance_report(
        seafarer.rank or "", documents, db=db,
        coc_type=getattr(seafarer, "coc_type", None),
        cop_tanker_type=getattr(seafarer, "cop_tanker_type", None),
        cop_tanker_level=getattr(seafarer, "cop_tanker_level", None),
        flag_endorsements=getattr(seafarer, "flag_endorsements", None),
        special_endorsements=getattr(seafarer, "special_endorsements", None),
        vessel_type_ids=getattr(seafarer, "vessel_types", None),
    )
    return _build_response(r)


@router.get("/seafarers/{seafarer_id}/compliance", response_model=ComplianceReportResponse)
def get_compliance_report(
    seafarer_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    # Foreign seafarer_id, never checked against the caller (Handover.md nota
    # 42, L-1) — the self-service sibling is /compliance/me below. Verified no
    # real caller anywhere in src/ or in either admin panel; admin.py builds
    # its own compliance reports inline (build_compliance_report) instead of
    # calling this route. require_admin, not a self-guard nobody needs.
    seafarer = db.query(Seafarer).filter(Seafarer.id == seafarer_id).first()
    if not seafarer:
        raise HTTPException(status_code=404, detail="Seafarer not found")
    documents = db.query(Document).filter(Document.seafarer_id == seafarer_id).all()
    return _build_report_for(seafarer, documents, db=db)


@router.get("/compliance/me", response_model=ComplianceReportResponse)
def get_my_compliance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "seafarer":
        raise HTTPException(status_code=403, detail="Only seafarers have a compliance report")
    seafarer = db.query(Seafarer).filter(Seafarer.id == current_user.id).first()
    if not seafarer:
        raise HTTPException(status_code=404, detail="Seafarer profile not found")
    documents = db.query(Document).filter(Document.seafarer_id == current_user.id).all()
    return _build_report_for(seafarer, documents, db=db)


@router.get("/compliance/catalog/{rank}", response_model=List[CatalogDocResponse])
def get_rank_catalog(
    rank: str,
    coc_type: Optional[str] = Query(None),
    cop_tanker_type: Optional[str] = Query(None),
    cop_tanker_level: Optional[str] = Query(None),
    flag_endorsements: Optional[str] = Query(None, description="Comma-separated list"),
    special_endorsements: Optional[str] = Query(None, description="Comma-separated list"),
    vessel_type_ids: Optional[str] = Query(None, description="Comma-separated list"),
):
    """
    Public — no auth. Re-pointed 2026-09-14 (contrato nota (24)) from the
    orphaned `rank_compliance_catalog` table to the same unified engine that
    backs /seafarer/me/required-docs and compliance_engine.py — same
    vocabulary, same source of truth, so this can never drift from what a
    seafarer's own compliance report expects again.

    Kept public and unauthenticated on purpose: RegisterModal.tsx's step 3
    calls this from the registration wizard, before the account (and its JWT)
    exists — an authenticated endpoint is unreachable from there.

    Response shape is unchanged (CatalogDocResponse: name/cert/level/
    cert_type/validity_years) — this re-points where the data comes from,
    not what shape it has, so no existing consumer needs to change.

    Profile fields are optional query params, all-or-nothing degrade: without
    them this returns the rank's base set (same as before profile-sensitivity
    existed); with them it adds the same tanker/offshore/vessel-type extras
    required_docs_for_profile() adds everywhere else.
    """
    flag_list = [f.strip() for f in flag_endorsements.split(",")] if flag_endorsements else []
    special_list = [s.strip() for s in special_endorsements.split(",")] if special_endorsements else []
    vessel_list = [v.strip() for v in vessel_type_ids.split(",")] if vessel_type_ids else []

    titles = required_docs_for_profile(
        rank=rank,
        coc_type=coc_type,
        cop_tanker_type=cop_tanker_type,
        cop_tanker_level=cop_tanker_level,
        flag_endorsements=flag_list,
        special_endorsements=special_list,
        vessel_type_ids=vessel_list,
    )
    if not titles:
        raise HTTPException(status_code=404, detail=f"Unknown rank '{rank}'")

    return [
        CatalogDocResponse(
            name=title,
            cert=title,
            level=DOC_METADATA.get(title, {}).get("level", "standard"),
            cert_type=DOC_METADATA.get(title, {}).get("cert_type", "D/P"),
            validity_years=DOC_METADATA.get(title, {}).get("validity_years"),
        )
        for title in titles
    ]


@router.get("/seafarer/me/required-docs")
def get_my_required_docs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns the ordered list of document titles required for the current
    seafarer's rank and maritime profile.  Titles match CREW_ALL_DOCS on the
    frontend so they can be used as a drop-in replacement for
    getRequiredDocsByProfile().
    """
    if current_user.role != "seafarer":
        raise HTTPException(status_code=403, detail="Only seafarers have a document requirement list")
    seafarer = db.query(Seafarer).filter(Seafarer.id == current_user.id).first()
    if not seafarer:
        raise HTTPException(status_code=404, detail="Seafarer profile not found")

    docs = required_docs_for_profile(
        rank=seafarer.rank or "",
        coc_type=getattr(seafarer, "coc_type", None),
        cop_tanker_type=getattr(seafarer, "cop_tanker_type", None),
        cop_tanker_level=getattr(seafarer, "cop_tanker_level", None),
        flag_endorsements=getattr(seafarer, "flag_endorsements", None),
        special_endorsements=getattr(seafarer, "special_endorsements", None),
        vessel_type_ids=getattr(seafarer, "vessel_types", None),
    )
    return {"rank": seafarer.rank, "docs": docs, "total": len(docs)}


@router.get("/compliance/required-docs")
def get_required_docs_for_rank(
    rank: str = Query(..., description="Rank key, e.g. 'master', '2nd-officer'"),
    coc_type: Optional[str] = Query(None),
    cop_tanker_type: Optional[str] = Query(None),
    cop_tanker_level: Optional[str] = Query(None),
    flag_endorsements: Optional[str] = Query(None, description="Comma-separated list"),
    special_endorsements: Optional[str] = Query(None, description="Comma-separated list"),
    vessel_types: Optional[str] = Query(None, description="Comma-separated list"),
):
    """
    Public endpoint — returns required doc titles for the given rank / profile.
    Used by the company panel when assessing a candidate's document list.
    """
    flag_list = [f.strip() for f in flag_endorsements.split(",")] if flag_endorsements else []
    special_list = [s.strip() for s in special_endorsements.split(",")] if special_endorsements else []
    vessel_list = [v.strip() for v in vessel_types.split(",")] if vessel_types else []

    docs = required_docs_for_profile(
        rank=rank,
        coc_type=coc_type,
        cop_tanker_type=cop_tanker_type,
        cop_tanker_level=cop_tanker_level,
        flag_endorsements=flag_list,
        special_endorsements=special_list,
        vessel_type_ids=vessel_list,
    )
    return {"rank": rank, "docs": docs, "total": len(docs)}


@router.get("/compliance/catalog")
def list_all_ranks():
    """
    Public — every rank ID this system recognizes, with its base required-doc
    count (no profile — same "cabo suelto" the nota (25) flagged: before this,
    the per-rank sibling below it computed from the engine while this one still
    counted from rank_compliance_catalog, two near-identical endpoints giving
    different numbers. Re-pointed 2026-09-14 to RANK_REQUIRED_DOCS, the same
    membership source as everything else — no consumer of this endpoint was
    found in either frontend before this change (verified by the PM in nota
    (25)), so there is no shape to preserve here, just the drift to close.
    """
    return {rank: len(titles) for rank, titles in sorted(RANK_REQUIRED_DOCS.items())}
