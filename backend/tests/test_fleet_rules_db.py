"""Mi Flota business rules against a REAL Postgres (the SQL uses 'infinity'::date).

Needs the dev stack's database: run with `docker compose run --rm backend ...` (NOT
--no-deps). Without a reachable DB every test here is skipped. Each test runs inside
a transaction that is rolled back, so nothing is ever left behind.
"""
import os
import uuid

os.environ.setdefault("SECRET_KEY", "x" * 48)
os.environ.setdefault("DRIVE_STATE_SECRET", "y" * 48)

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import engine, get_db
from app.main import app
from app.models.company import Company
from app.models.seafarer import Seafarer
from app.models.user import User

try:
    with engine.connect() as _c:
        _c.execute(text("SELECT 1"))
    DB_UP = True
except Exception:
    DB_UP = False

pytestmark = pytest.mark.skipif(not DB_UP, reason="needs the dev Postgres")


@pytest.fixture
def world():
    """Approved company + verified company user + 2 hired seafarers, all rolled back."""
    conn = engine.connect()
    outer = conn.begin()
    db = Session(bind=conn, join_transaction_mode="create_savepoint")
    tag = uuid.uuid4().hex[:8]
    company = Company(name=f"T19b Co {tag}", contact_email=f"t19b-{tag}@example.com", company_status="approved")
    db.add(company)
    db.flush()
    user = User(email=f"t19b-co-{tag}@example.com", hashed_password="x", role="company",
                company_id=company.id, email_verified=True)
    db.add(user)
    seafarers = []
    for i in (1, 2):
        u = User(email=f"t19b-sf{i}-{tag}@example.com", hashed_password="x", role="seafarer", email_verified=True)
        db.add(u)
        db.flush()
        db.add(Seafarer(id=u.id, first_name=f"Sf{i}", last_name="Test"))
        db.flush()
        db.execute(text("""INSERT INTO relationships (id, company_id, seafarer_id, status, created_at, updated_at)
                           VALUES (:id, :c, :s, 'active', now(), now())"""),
                   {"id": str(uuid.uuid4()), "c": company.id, "s": u.id})
        seafarers.append(u.id)
    vessel_id = str(uuid.uuid4())
    db.execute(text("""INSERT INTO vessels (id, company_id, name, vessel_type, is_active, created_at, updated_at)
                       VALUES (:id, :c, 'T19b Vessel', 'merchant', true, now(), now())"""),
               {"id": vessel_id, "c": company.id})
    db.flush()
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: user
    client = TestClient(app, raise_server_exceptions=False)
    try:
        yield type("W", (), {"client": client, "vessel": vessel_id, "sf": seafarers, "db": db})()
    finally:
        app.dependency_overrides.clear()
        db.close()
        outer.rollback()
        conn.close()


def _assign(w, sf, rank, frm, to=None):
    return w.client.post(f"/api/company/vessels/{w.vessel}/assignments", json={
        "seafarer_id": w.sf[sf], "rank": rank, "embark_date": frm, "disembark_date": to})


# ── PATCH /company/assignments/{id}: same overlap rule as the POST ─────────────
def test_patch_into_an_overlapping_period_is_409(world):
    a = _assign(world, 0, "2nd-mate", "2026-01-01", "2026-03-01").json()["id"]
    b = _assign(world, 1, "2nd-mate", "2026-04-01", "2026-06-01").json()["id"]
    r = world.client.patch(f"/api/company/assignments/{b}", json={"embark_date": "2026-02-15"})
    assert r.status_code == 409 and "already covers 2nd-mate" in r.json()["detail"]
    assert a  # the first one is untouched


def test_patch_to_a_rank_another_person_already_covers_is_409(world):
    _assign(world, 0, "chief-mate", "2026-01-01", "2026-12-31")
    b = _assign(world, 1, "2nd-mate", "2026-02-01", "2026-03-01").json()["id"]
    assert world.client.patch(f"/api/company/assignments/{b}", json={"rank": "chief-mate"}).status_code == 409


def test_patch_ok_when_there_is_no_overlap_and_it_ignores_itself(world):
    a = _assign(world, 0, "2nd-mate", "2026-01-01", "2026-03-01").json()["id"]
    # extending itself overlaps only with ITSELF -> allowed
    assert world.client.patch(f"/api/company/assignments/{a}", json={"disembark_date": "2026-03-20"}).status_code == 200
    b = _assign(world, 1, "2nd-mate", "2026-05-01", "2026-06-01").json()["id"]
    assert world.client.patch(f"/api/company/assignments/{b}", json={"embark_date": "2026-04-01"}).status_code == 200


def test_patch_open_ended_assignment_collides_with_a_later_one(world):
    _assign(world, 0, "bosun", "2026-01-01", None)  # permanent
    b = _assign(world, 1, "bosun", "2027-01-01", "2027-02-01")
    assert b.status_code == 409  # same helper as POST: NULL disembark is open-ended


def test_patch_notes_only_or_closing_never_trips_the_check(world):
    a = _assign(world, 0, "2nd-mate", "2026-01-01", "2026-03-01").json()["id"]
    assert world.client.patch(f"/api/company/assignments/{a}", json={"notes": "x"}).status_code == 200
    assert world.client.patch(f"/api/company/assignments/{a}", json={"status": "cancelled"}).status_code == 200
    # a cancelled slot is free again: the other person can take it
    assert _assign(world, 1, "2nd-mate", "2026-01-15", "2026-02-15").status_code == 201


def test_reopening_a_cancelled_assignment_is_checked(world):
    a = _assign(world, 0, "2nd-mate", "2026-01-01", "2026-03-01").json()["id"]
    world.client.patch(f"/api/company/assignments/{a}", json={"status": "cancelled"})
    _assign(world, 1, "2nd-mate", "2026-01-15", "2026-02-15")
    assert world.client.patch(f"/api/company/assignments/{a}", json={"status": "scheduled"}).status_code == 409


# ── DELETE /company/vessels/{id}: refuse while rotations are open ──────────────
def test_delete_vessel_with_open_assignments_is_409_and_nothing_changes(world):
    _assign(world, 0, "2nd-mate", "2026-01-01", "2026-03-01")
    r = world.client.delete(f"/api/company/vessels/{world.vessel}")
    assert r.status_code == 409 and "open assignment" in r.json()["detail"] and "scheduled or aboard" in r.json()["detail"]
    assert world.db.execute(text("SELECT is_active FROM vessels WHERE id=:i"), {"i": world.vessel}).scalar() is True


def test_delete_vessel_ok_once_assignments_are_closed(world):
    a = _assign(world, 0, "2nd-mate", "2026-01-01", "2026-03-01").json()["id"]
    assert world.client.delete(f"/api/company/vessels/{world.vessel}").status_code == 409
    world.client.patch(f"/api/company/assignments/{a}", json={"status": "completed"})
    assert world.client.delete(f"/api/company/vessels/{world.vessel}").status_code == 204
    assert world.db.execute(text("SELECT is_active FROM vessels WHERE id=:i"), {"i": world.vessel}).scalar() is False


def test_delete_vessel_without_assignments_ok_and_unknown_is_404(world):
    assert world.client.delete(f"/api/company/vessels/{world.vessel}").status_code == 204
    assert world.client.delete(f"/api/company/vessels/{uuid.uuid4()}").status_code == 404
