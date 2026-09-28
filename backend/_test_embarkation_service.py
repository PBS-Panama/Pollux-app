"""Manual test script for embarkation_service.py, run inside the backend
container against the schema alembic/versions/0012_embarkations_foundation.py
creates (originally hand-built for Task 1's "probalo contra un esquema
creado a mano" before that migration existed — the SQL is now identical).
Not a pytest suite (no fixtures/teardown infra in this repo yet for a
five-table domain) — prints PASS/FAIL per assertion, exits 1 on any failure.

IDs below are local-dev fixtures — replace with real ids from your own
database before running (see Handover.md nota 67's "deuda" note: this
should move to pytest with its own fixtures once the domain settles).
"""
import sys
import uuid
from datetime import datetime, timedelta, timezone

from app.db.session import SessionLocal
from app.models.embarkation import Embarkation, EmbarkationContactLog
from app.services import embarkation_service as svc
from app.models.notification import Notification

SEAFARER_ID = "f0b2bb1d-3ca7-450c-9c74-f5a221f1a1d4"
ADMIN_ID = "ea7e11df-81c6-4f38-abe5-fd33e5ac3bc9"
COMPANY_ID = "3a484e9c-6691-4dd4-a935-e9bb022e1c9d"

_failures = []


def check(label, condition):
    status = "PASS" if condition else "FAIL"
    print(f"[{status}] {label}")
    if not condition:
        _failures.append(label)


def make_embarkation(db) -> Embarkation:
    e = Embarkation(
        seafarer_id=SEAFARER_ID,
        declared_vessel_name="MV Test Carrier",
        declared_vessel_imo="9123456",
        declared_company_name="Test Shipping Co",
        declared_rank="master",
        declared_date_from=datetime(2025, 1, 1).date(),
        declared_date_to=datetime(2025, 6, 1).date(),
        contact_consent=True,
        contact_consent_at=datetime.now(timezone.utc),
    )
    db.add(e)
    db.commit()
    db.refresh(e)
    return e


def test_rule_a_both_conditions_required():
    """Task 1.a — deadline alone or attempts alone must NOT produce no_verificable."""
    db = SessionLocal()
    try:
        e = make_embarkation(db)
        svc.open_verification(db, e.id, actor_user_id=ADMIN_ID)

        # 3 attempts, deadline artificially already passed -> still must fail (not enough attempts).
        for i in range(3):
            svc.record_contact_attempt(db, e.id, actor_user_id=ADMIN_ID, channel="email")
        db.query(Embarkation).filter(Embarkation.id == e.id).update({
            "verification_deadline_at": datetime.now(timezone.utc) - timedelta(days=1)
        })
        db.commit()
        db.refresh(e)
        try:
            svc.conclude_no_verificable(db, e.id, actor_user_id=ADMIN_ID, reason="3 intentos, 30 dias")
            check("3 intentos + deadline vencido -> DEBE rechazarse", False)
        except svc.NotYetEligible:
            check("3 intentos + deadline vencido -> rechazado (NotYetEligible)", True)

        # Now 5 attempts total, deadline still passed -> must succeed.
        for i in range(2):
            svc.record_contact_attempt(db, e.id, actor_user_id=ADMIN_ID, channel="telefono")
        db.refresh(e)
        check(f"verification_attempts llegó a 5 (derivado) -> {e.verification_attempts}", e.verification_attempts == 5)
        e2 = svc.conclude_no_verificable(db, e.id, actor_user_id=ADMIN_ID, reason="La naviera no respondio en 30 dias, 5 intentos registrados")
        check("5 intentos + deadline vencido -> no_verificable aceptado", e2.verification_status == "no_verificable")

        # Deadline not yet reached, plenty of attempts -> must still fail.
        e3 = make_embarkation(db)
        svc.open_verification(db, e3.id, actor_user_id=ADMIN_ID)
        for i in range(6):
            svc.record_contact_attempt(db, e3.id, actor_user_id=ADMIN_ID, channel="email")
        try:
            svc.conclude_no_verificable(db, e3.id, actor_user_id=ADMIN_ID, reason="6 intentos, deadline no vencido")
            check("6 intentos pero deadline NO vencido -> DEBE rechazarse", False)
        except svc.NotYetEligible:
            check("6 intentos pero deadline NO vencido -> rechazado (NotYetEligible)", True)
    finally:
        db.close()


def test_rule_b_derived_and_capped():
    """Task 1.b — verification_attempts is derived from the log, capped at 10."""
    db = SessionLocal()
    try:
        e = make_embarkation(db)
        svc.open_verification(db, e.id, actor_user_id=ADMIN_ID)
        for i in range(10):
            svc.record_contact_attempt(db, e.id, actor_user_id=ADMIN_ID, channel="email")
        db.refresh(e)
        check(f"10 intentos registrados -> verification_attempts == 10 ({e.verification_attempts})", e.verification_attempts == 10)
        log_count = db.query(EmbarkationContactLog).filter(EmbarkationContactLog.embarkation_id == e.id).count()
        check(f"embarkation_contact_log tiene 10 filas ({log_count})", log_count == 10)
        try:
            svc.record_contact_attempt(db, e.id, actor_user_id=ADMIN_ID, channel="email")
            check("intento 11 -> DEBE rechazarse", False)
        except svc.AttemptCapReached:
            check("intento 11 -> rechazado (AttemptCapReached)", True)
        db.refresh(e)
        check(f"tras el intento 11 rechazado, el contador sigue en 10 ({e.verification_attempts})", e.verification_attempts == 10)
    finally:
        db.close()


def test_rule_c_reopen_does_not_reset():
    """Task 1.c — reopening a no_verificable case does not reset the counter."""
    db = SessionLocal()
    try:
        e = make_embarkation(db)
        svc.open_verification(db, e.id, actor_user_id=ADMIN_ID)
        for i in range(5):
            svc.record_contact_attempt(db, e.id, actor_user_id=ADMIN_ID, channel="email")
        db.query(Embarkation).filter(Embarkation.id == e.id).update({
            "verification_deadline_at": datetime.now(timezone.utc) - timedelta(days=1)
        })
        db.commit()
        svc.conclude_no_verificable(db, e.id, actor_user_id=ADMIN_ID, reason="5 intentos, 30 dias")
        db.refresh(e)
        check(f"antes de reabrir: verification_attempts == 5 ({e.verification_attempts})", e.verification_attempts == 5)

        svc.reopen(db, e.id, actor_user_id=ADMIN_ID)
        db.refresh(e)
        check(f"al reabrir, el contador NO se resetea (sigue en 5): {e.verification_attempts}", e.verification_attempts == 5)
        check("al reabrir, vuelve a en_verificacion", e.verification_status == "en_verificacion")

        # Log 5 more attempts -> should accumulate to 10 against the SAME cap, not a fresh 5.
        for i in range(5):
            svc.record_contact_attempt(db, e.id, actor_user_id=ADMIN_ID, channel="telefono")
        db.refresh(e)
        check(f"tras reabrir + 5 intentos mas -> 10 total, no 5 ({e.verification_attempts})", e.verification_attempts == 10)
        try:
            svc.record_contact_attempt(db, e.id, actor_user_id=ADMIN_ID, channel="email")
            check("intento 11 tras reapertura -> DEBE rechazarse igual", False)
        except svc.AttemptCapReached:
            check("intento 11 tras reapertura -> rechazado (el techo es acumulado, no por ciclo)", True)
    finally:
        db.close()


def test_state_machine_rejects_invalid_transitions():
    db = SessionLocal()
    try:
        e = make_embarkation(db)
        # declarado -> verificado directly must be rejected (only en_verificacion can conclude_verified).
        try:
            svc.conclude_verified(db, e.id, actor_user_id=ADMIN_ID, verified_fields={"vessel_name": "X"})
            check("declarado -> verificado directo -> DEBE rechazarse", False)
        except svc.InvalidTransition:
            check("declarado -> verificado directo -> rechazado (InvalidTransition)", True)

        svc.open_verification(db, e.id, actor_user_id=ADMIN_ID)
        db.refresh(e)
        # observado has no outgoing transition per the spec.
        embarkation, remark = svc.conclude_observado(db, e.id, actor_user_id=ADMIN_ID, field="declared_company_name", finding="La naviera dice que este marino nunca trabajo ahi")
        check("en_verificacion -> observado aceptado", embarkation.verification_status == "observado")
        try:
            svc.reopen(db, e.id, actor_user_id=ADMIN_ID)
            check("observado -> en_verificacion (reopen) -> DEBE rechazarse (sin transicion en el doc)", False)
        except svc.InvalidTransition:
            check("observado -> cualquier transicion -> rechazada (no hay ninguna definida)", True)
    finally:
        db.close()


def test_has_correction_and_conclude_verified():
    db = SessionLocal()
    try:
        e = make_embarkation(db)
        svc.open_verification(db, e.id, actor_user_id=ADMIN_ID)
        result = svc.conclude_verified(db, e.id, actor_user_id=ADMIN_ID, verified_fields={
            "vessel_name": "MV Test Carrier",  # same as declared
            "rank": "chief-officer",           # DIFFERENT from declared ("master")
        })
        check("verificado alcanzado", result.verification_status == "verificado")
        check("has_correction=True cuando un campo verificado difiere del declarado", result.has_correction is True)
        check("declared_rank no se sobreescribe", result.declared_rank == "master")
        check("verified_rank guarda el dato real de la naviera", result.verified_rank == "chief-officer")
    finally:
        db.close()


def test_notification_audience_leak():
    """Task 4's mandatory test: an 'observado' notification to the company
    scope must NOT contain the finding text."""
    db = SessionLocal()
    try:
        e = make_embarkation(db)
        svc.open_verification(db, e.id, actor_user_id=ADMIN_ID, triggering_company_id=COMPANY_ID)
        finding_text = "El certificado de guardia de navegacion presentado no coincide con los registros de la naviera"
        embarkation, remark = svc.conclude_observado(
            db, e.id, actor_user_id=ADMIN_ID,
            field="declared_rank", finding=finding_text,
        )

        rows = db.query(Notification).filter(
            Notification.subject_type == "embarkation",
            Notification.subject_id == e.id,
            Notification.kind == "embarkation_observado",
        ).all()
        by_scope = {r.recipient_scope: r for r in rows}

        check("se crearon notificaciones para seafarer, admin y company", set(by_scope.keys()) == {"seafarer", "admin", "company"})
        check("la notificacion del marino SI contiene el finding", finding_text in by_scope["seafarer"].body)
        check("la notificacion del admin SI contiene el finding", finding_text in by_scope["admin"].body)
        check(
            "la notificacion de la EMPRESA NO contiene el finding (la fuga que pide probar la orden)",
            finding_text not in by_scope["company"].body and "declared_rank" not in by_scope["company"].body,
        )
        check("la notificacion de la empresa dice 'revisión'", "revisión" in by_scope["company"].body.lower())
        print(f"    company body: {by_scope['company'].body!r}")

        # requires_ack matrix check: observado is NOT in the ack-required set.
        check("observado NO requiere acuse", all(r.requires_ack is False for r in rows))
    finally:
        db.close()


def test_reversion_requires_ack():
    """Fix (nota 75): requires_ack is per (kind, scope), not per kind alone.
    Only the naviera (scope='company') has to acknowledge a reversion — the
    marino and the admin get the same event, but with no acuse UI of their
    own, because it was never theirs to acknowledge. This test used to
    assert the wrong thing ("las tres audiencias") and passed anyway,
    because nothing checked scope before this fix."""
    db = SessionLocal()
    try:
        e = make_embarkation(db)
        svc.open_verification(db, e.id, actor_user_id=ADMIN_ID, triggering_company_id=COMPANY_ID)
        svc.conclude_verified(db, e.id, actor_user_id=ADMIN_ID, verified_fields={"vessel_name": "MV Test Carrier"})
        result, remark = svc.revert_verified(
            db, e.id, actor_user_id=ADMIN_ID, cause="no_verificable",
            reason="La naviera se retracto de lo confirmado anteriormente",
        )
        check("verificado -> no_verificable (reversion) aceptado", result.verification_status == "no_verificable")
        rows = db.query(Notification).filter(
            Notification.subject_id == e.id, Notification.kind == "embarkation_verified_reverted",
        ).all()
        by_scope = {r.recipient_scope: r for r in rows}
        check("se crearon notificaciones para seafarer, admin y company", set(by_scope.keys()) == {"seafarer", "admin", "company"})
        check("SOLO la naviera (scope='company') requiere acuse", by_scope["company"].requires_ack is True)
        check("el marino NO requiere acuse en la reversion", by_scope["seafarer"].requires_ack is False)
        check("el admin NO requiere acuse en la reversion", by_scope["admin"].requires_ack is False)
    finally:
        db.close()


def test_can_record_contact_attempt_precheck():
    """Fix 1 (nota 68): can_record_contact_attempt() must raise the SAME
    condition record_contact_attempt() would, without writing — this is
    what a caller has to check before uploading to GCS, so a rejected
    attempt never leaves an orphaned blob."""
    db = SessionLocal()
    try:
        e = make_embarkation(db)
        svc.open_verification(db, e.id, actor_user_id=ADMIN_ID)
        for i in range(10):
            svc.can_record_contact_attempt(db, e.id)  # must NOT raise up to the cap
            svc.record_contact_attempt(db, e.id, actor_user_id=ADMIN_ID, channel="email")
        try:
            svc.can_record_contact_attempt(db, e.id)
            check("can_record_contact_attempt en el intento 11 -> DEBE rechazarse", False)
        except svc.AttemptCapReached:
            check("can_record_contact_attempt en el intento 11 -> rechazado, SIN escribir nada", True)
        log_count_after = db.query(EmbarkationContactLog).filter(EmbarkationContactLog.embarkation_id == e.id).count()
        check(f"el precheck no escribio ninguna fila de mas (sigue en 10): {log_count_after}", log_count_after == 10)

        try:
            svc.can_record_contact_attempt(db, "no-existe-este-id")
            check("can_record_contact_attempt sobre un embarque inexistente -> DEBE rechazarse", False)
        except svc.EmbarkationError:
            check("can_record_contact_attempt sobre un embarque inexistente -> rechazado", True)
    finally:
        db.close()


def test_edit_declared_fields_reopens_from_no_verificable():
    """Fix 2 (nota 68): a seafarer can correct their own declared data while
    no_verificable, and doing so returns the embarkation to declarado with
    an event recorded — but NOT while en_verificacion/verificado/observado."""
    db = SessionLocal()
    try:
        e = make_embarkation(db)
        svc.open_verification(db, e.id, actor_user_id=ADMIN_ID)
        for i in range(5):
            svc.record_contact_attempt(db, e.id, actor_user_id=ADMIN_ID, channel="email")
        db.query(Embarkation).filter(Embarkation.id == e.id).update({
            "verification_deadline_at": datetime.now(timezone.utc) - timedelta(days=1)
        })
        db.commit()
        svc.conclude_no_verificable(db, e.id, actor_user_id=ADMIN_ID, reason="5 intentos, 30 dias")

        result = svc.edit_declared_fields(
            db, e.id, seafarer_id=SEAFARER_ID,
            fields={"vessel_name": "MV Corrected Name"},
        )
        check("editar desde no_verificable -> vuelve a declarado", result.verification_status == "declarado")
        check("el campo declarado se corrigio", result.declared_vessel_name == "MV Corrected Name")

        from app.models.embarkation import EmbarkationVerificationEvent
        ev_rows = db.query(EmbarkationVerificationEvent).filter(
            EmbarkationVerificationEvent.embarkation_id == e.id
        ).order_by(EmbarkationVerificationEvent.created_at.asc()).all()
        sequence = [(ev.from_status, ev.to_status) for ev in ev_rows]
        check(
            f"la secuencia de eventos muestra intentado -> no_verificable -> declarado: {sequence}",
            sequence == [("declarado", "en_verificacion"), ("en_verificacion", "no_verificable"), ("no_verificable", "declarado")],
        )

        # Now re-verify and confirm editing is refused once en_verificacion again.
        svc.open_verification(db, e.id, actor_user_id=ADMIN_ID)
        try:
            svc.edit_declared_fields(db, e.id, seafarer_id=SEAFARER_ID, fields={"vessel_name": "X"})
            check("editar durante en_verificacion -> DEBE rechazarse", False)
        except svc.EmbarkationError:
            check("editar durante en_verificacion -> rechazado", True)

        svc.conclude_verified(db, e.id, actor_user_id=ADMIN_ID, verified_fields={"vessel_name": "MV Corrected Name"})
        try:
            svc.edit_declared_fields(db, e.id, seafarer_id=SEAFARER_ID, fields={"vessel_name": "Y"})
            check("editar durante verificado -> DEBE rechazarse", False)
        except svc.EmbarkationError:
            check("editar durante verificado -> rechazado", True)
    finally:
        db.close()


if __name__ == "__main__":
    test_rule_a_both_conditions_required()
    test_rule_b_derived_and_capped()
    test_rule_c_reopen_does_not_reset()
    test_state_machine_rejects_invalid_transitions()
    test_has_correction_and_conclude_verified()
    test_notification_audience_leak()
    test_reversion_requires_ack()
    test_can_record_contact_attempt_precheck()
    test_edit_declared_fields_reopens_from_no_verificable()

    print()
    if _failures:
        print(f"{len(_failures)} FAILURE(S):")
        for f in _failures:
            print(f"  - {f}")
        sys.exit(1)
    else:
        print("ALL PASS")
