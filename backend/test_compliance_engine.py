#!/usr/bin/env python
# ─────────────────────────────────────────────────────────────────────────────
# Motor unificado de compliance — suite de regresión standalone. No necesita
# Postgres ni la app de FastAPI levantada: build_compliance_report() solo
# necesita objetos con los atributos de Document (aquí, SimpleNamespace).
#
#   cd backend
#   python test_compliance_engine.py
#
# Sale con código 1 si algo falla. Mismo patrón que
# interfaces/castor/test-auth-guard.mjs para el guard de Express.
# ─────────────────────────────────────────────────────────────────────────────
import sys
from datetime import date
from types import SimpleNamespace

# Windows consoles default to cp1252, which can't print ✓/✗/— below.
# Reconfigure to UTF-8 instead of downgrading to ASCII-only output.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from app.services.compliance_engine import build_compliance_report, RANK_FLEET_CAT
from app.services.document_requirements import _RANK_KEY_MAP, RANK_REQUIRED_DOCS, rank_is_covered

TODAY = date(2026, 9, 14)
FUTURE = date(2030, 1, 1)

fail = 0


def check(label, cond):
    global fail
    ok = bool(cond)
    if not ok:
        fail += 1
    print(f"  {'✓' if ok else '✗'} {label}")


def fake_doc(doc_key, expiry=None):
    return SimpleNamespace(
        doc_key=doc_key, cert_code=None,
        issued_date=None, expiry_date=expiry,
        file_path="/x", uploaded_at=date(2020, 1, 1),
        verification_status="verified", ai_verdict=None,
    )


print("\n  Motor unificado de compliance\n")

# ── PATCH-01 — rango vacío (total == 0) sigue fallando cerrado ─────────────
r = build_compliance_report("this-rank-does-not-exist", [], today=TODAY)
check("PATCH-01: rango inventado → rank_recognized=False", r.rank_recognized is False)
check("PATCH-01: rango inventado → can_be_listed=False", r.can_be_listed is False)
check("PATCH-01: rango inventado → is_fully_compliant=False", r.is_fully_compliant is False)

# ── PATCH-03 mechanism — probado con un rango SINTÉTICO, no con oim-fixed ──
# Antes del mapeo de cobertura (2026-09-14), este mismo test usaba "oim-fixed"
# como ejemplo de rango sin cobertura (el escenario exacto de la nota (19) del
# PM): BOSIET+HUET vigentes, total_required=2, is_fully_compliant=True antes
# de PATCH-03. Ahora oim-fixed SÍ tiene cobertura real (ver milestone abajo),
# así que ya no sirve para probar el mecanismo de PATCH-03 — hay que fabricar
# un rango que `document_requirements.py` nunca vaya a reconocer, para que
# esta prueba seguiera fallando cerrado el día que el mapeo cubra TODOS los
# rangos reales (que es exactamente lo que pasó).
FAKE_UNCOVERED_RANK = "zzz-rango-inventado-sin-cobertura"
docs_fake = [
    fake_doc("BOSIET — Offshore Safety", FUTURE),
    fake_doc("HUET — Helicopter Escape", FUTURE),
]
r = build_compliance_report(
    FAKE_UNCOVERED_RANK, docs_fake, today=TODAY,
    special_endorsements=["offshore_mou_designation"],
)
check("PATCH-03 (rango sintético): total_required=2 (no 0, por los extras de perfil)", r.total_required == 2)
check("PATCH-03 (rango sintético): BOSIET+HUET vigentes → missing_count=0", r.missing_count == 0)
check("PATCH-03 (rango sintético): rank_recognized=False", r.rank_recognized is False)
check("PATCH-03 (rango sintético): can_be_listed=False", r.can_be_listed is False)
check("PATCH-03 (rango sintético): is_fully_compliant=False (el falso positivo sigue cerrado)",
      r.is_fully_compliant is False)

# ── Milestone del mapeo de cobertura (2026-09-14): los 47 rangos que
# generaron PATCH-03 ahora tienen cobertura real, no solo un guard. Enumera
# sobre RANK_FLEET_CAT, no sobre el retirado RANK_CATALOG (nota (36)) — los
# dos tenían exactamente el mismo set de 60 claves, verificado antes del
# retiro (mismo `sorted()` de ambos diccionarios, igualdad exacta), así que
# el barrido de cobertura que hace este test no cambia. ─────────────────────
gap_ranks = sorted(k for k in RANK_FLEET_CAT if not rank_is_covered(k))
check(f"Cobertura completa: 0 rangos de RANK_FLEET_CAT sin mapear (eran 47; total {len(RANK_FLEET_CAT)})",
      len(gap_ranks) == 0)
# oim-fixed puntualmente: ya no basta con BOSIET+HUET para estar "completo" —
# ahora tiene un conjunto real (UNIVERSAL_DOCS + CoC + BOSIET + HUET + H2S +
# MFA), así que con solo esos 2 documentos tiene que seguir incompleto, pero
# por documentos faltantes de verdad, no por un rango no reconocido.
r = build_compliance_report(
    "oim-fixed", docs_fake, today=TODAY,
    special_endorsements=["offshore_mou_designation"],
)
check("oim-fixed: rank_recognized=True (cobertura real, ya no cae en PATCH-03)", r.rank_recognized is True)
check(f"oim-fixed: total_required > 2 ahora (tiene {r.total_required}, no solo BOSIET+HUET)",
      r.total_required > 2)
check("oim-fixed: con solo 2 de N documentos, sigue is_fully_compliant=False (por missing real)",
      r.is_fully_compliant is False and r.missing_count > 0)

# Camino positivo — no solo "faltan documentos da False", sino que "todos los
# documentos reales, vigentes" SÍ da True. Sin esto, un bug de títulos
# duplicados o inalcanzables podría dejar a un OIM (o cualquiera de los 47)
# en un estado donde nunca es posible llegar al 100%.
from app.services.document_requirements import required_docs_for_profile as _rdfp  # noqa: E402
_all_titles = _rdfp(rank="oim-fixed", special_endorsements=["offshore_mou_designation"])
_all_docs = [fake_doc(t, FUTURE) for t in _all_titles]
r = build_compliance_report("oim-fixed", _all_docs, today=TODAY,
                             special_endorsements=["offshore_mou_designation"])
check(f"oim-fixed con los {len(_all_titles)} documentos reales, todos vigentes → is_fully_compliant=True",
      r.is_fully_compliant is True and r.can_be_listed is True and r.missing_count == 0)

# ── Matching real por doc_key, no por cert_code (hallazgo 2026-09-14) ──────
docs = [fake_doc("Passport", None), fake_doc(
    "IMO 1.19 — Proficiency in Personal Survival Techniques", FUTURE)]
r = build_compliance_report("2nd_officer", docs, today=TODAY)
matched = {d.name for d in r.docs if d.state.value != "MISSING"}
check("Matching real por doc_key: Passport reconocido", "Passport" in matched)
check("Matching real por doc_key: IMO 1.19 reconocido",
      "IMO 1.19 — Proficiency in Personal Survival Techniques" in matched)

# ── Rango mercante real: el bug original (2nd_officer) sigue cerrado ───────
r = build_compliance_report("2nd_officer", [], today=TODAY)
check("Bug original (2nd_officer): total_required > 0", r.total_required > 0)
check("Bug original (2nd_officer): rank_recognized=True", r.rank_recognized is True)

# ── Barrido completo: cada alias de rango real resuelve sin excepción ──────
all_ranks = set(_RANK_KEY_MAP.keys()) | set(RANK_REQUIRED_DOCS.keys())
swept_fail = 0
for raw_rank in all_ranks:
    try:
        build_compliance_report(raw_rank, [], today=TODAY)
    except Exception as exc:
        swept_fail += 1
        print(f"  ✗ barrido: '{raw_rank}' lanzó excepción: {exc}")
check(f"Barrido completo: {len(all_ranks)} rangos, 0 excepciones", swept_fail == 0)

print(f"\n  {'✅ Todo en verde.' if fail == 0 else f'❌ {fail} caso(s) fallando.'} Pegá esta salida en el Handover.\n")
sys.exit(1 if fail else 0)
