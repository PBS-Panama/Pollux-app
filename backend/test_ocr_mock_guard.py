#!/usr/bin/env python
# ─────────────────────────────────────────────────────────────────────────────
# OCR mock-provider guardrail — regresión standalone para Handover.md nota (42),
# L-4. No necesita Postgres ni la app de FastAPI levantada.
#
#   cd backend
#   python test_ocr_mock_guard.py
#
# Sale con código 1 si algo falla. Mismo patrón que test_compliance_engine.py.
# ─────────────────────────────────────────────────────────────────────────────
import os
import sys
from types import SimpleNamespace

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from app.core.config import settings
from app.services.ocr_provider import MockOcrProvider, _MockKeyedProvider, get_ocr_provider
from app.services.doc_analyzer import _decide_verification_status

fail = 0


def check(label, cond):
    global fail
    ok = bool(cond)
    if not ok:
        fail += 1
    print(f"  {'✓' if ok else '✗'} {label}")


print("\n  OCR mock-provider guardrail\n")

# ── Parte 2 del parche: los dos mocks SIEMPRE devuelven un verdict de error ──
mock_default = MockOcrProvider().extract(b"", "application/pdf")
check("MockOcrProvider: trae un verdict", mock_default.verdict is not None)
check("MockOcrProvider: verdict.status == 'error'",
      (mock_default.verdict or {}).get("status") == "error")
check("MockOcrProvider: 'mock_provider' en flags",
      "mock_provider" in (mock_default.verdict or {}).get("flags", []))

mock_keyed = _MockKeyedProvider("Passport").extract(b"", "application/pdf")
check("_MockKeyedProvider('Passport'): verdict.status == 'error'",
      (mock_keyed.verdict or {}).get("status") == "error")
check("_MockKeyedProvider('Passport'): 'mock_provider' en flags",
      "mock_provider" in (mock_keyed.verdict or {}).get("flags", []))

# ── El texto simulado sigue siendo realista (a propósito, no es el bug) —
#    lo que importa es que el verdict adjunto lo neutraliza igual ───────────
check("El texto simulado de 'Passport' sigue pareciendo un pasaporte real (no cambió)",
      "PASSPORT" in mock_keyed.text.upper())

# ── El verdict del mock, pasado por la decisión REAL de doc_analyzer.py
#    (no una reimplementación), nunca resulta en verified ──────────────────
check(
    "Verdict del mock (sin reglas) → _decide_verification_status() nunca da 'verified'",
    _decide_verification_status(mock_default.verdict, rules=None) != "verified"
)

_permissive_rules = SimpleNamespace(auto_verify_threshold=0.0)
check(
    "Verdict del mock (reglas con threshold=0.0, el más permisivo posible) → nunca 'verified'",
    _decide_verification_status(mock_keyed.verdict, rules=_permissive_rules) != "verified"
)

# ── Control — si esto fallara, las dos comprobaciones de arriba serían
#    vacías: probarían que la función siempre devuelve None, no que el mock
#    específicamente no llega a verified ────────────────────────────────────
_real_verdict = {"status": "probable_valid", "confidence": 0.95, "flags": []}
check(
    "Control: verdict real probable_valid + sin reglas + confianza alta → SÍ 'verified'",
    _decide_verification_status(_real_verdict, rules=None) == "verified"
)
_real_rules = SimpleNamespace(auto_verify_threshold=0.9)
check(
    "Control: verdict real probable_valid + reglas + confianza suficiente → SÍ 'verified'",
    _decide_verification_status(_real_verdict, rules=_real_rules) == "verified"
)

# ── Parte 1 del parche: get_ocr_provider() no deja caer a mock en producción
#    sin ninguna clave. Guardamos y restauramos el entorno real. ───────────
_saved_env = {k: os.environ.get(k) for k in ("ANTHROPIC_API_KEY", "GOOGLE_VISION_API_KEY")}
_saved_environment_setting = settings.ENVIRONMENT
try:
    os.environ.pop("ANTHROPIC_API_KEY", None)
    os.environ.pop("GOOGLE_VISION_API_KEY", None)

    settings.ENVIRONMENT = "production"
    raised = False
    try:
        get_ocr_provider("Passport")
    except RuntimeError:
        raised = True
    check("get_ocr_provider(): sin claves + is_production=True → RuntimeError", raised)

    settings.ENVIRONMENT = "development"
    raised = False
    try:
        get_ocr_provider("Passport")
    except RuntimeError:
        raised = True
    check("get_ocr_provider(): sin claves + is_production=False → NO revienta (dev sigue con mock)",
          not raised)
finally:
    settings.ENVIRONMENT = _saved_environment_setting
    for k, v in _saved_env.items():
        if v is None:
            os.environ.pop(k, None)
        else:
            os.environ[k] = v

print(f"\n  {'✅ Todo en verde.' if fail == 0 else f'❌ {fail} caso(s) fallando.'} Pegá esta salida en el Handover.\n")
sys.exit(1 if fail else 0)
