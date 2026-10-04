"""Admin API, one router per domain.

The former single-file routers/admin.py was split by section (T18). FastAPI matches
routes in registration order, so the sub-routers are included here in the SAME order
their endpoints had in that file.
"""
from fastapi import APIRouter

from . import (
    overview,
    seafarers,
    companies,
    documents,
    compliance,
    relationships,
    exams,
    config_secrets,
    analytics,
    alerts,
    ocr_rules,
    ocr_review,
    ocr_references,
    fleet,
    cv_template,
)

router = APIRouter()
for _module in (
    overview,
    seafarers,
    companies,
    documents,
    compliance,
    relationships,
    exams,
    config_secrets,
    analytics,
    alerts,
    ocr_rules,
    ocr_review,
    ocr_references,
    fleet,
    cv_template,
):
    router.include_router(_module.router)

# Re-exported: tests and other modules import these from app.routers.admin.
from .alerts import AlertCreate  # noqa: E402,F401
from .config_secrets import _run_key_test  # noqa: E402,F401
