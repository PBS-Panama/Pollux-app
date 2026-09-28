"""Idempotent data seeds — run at every app start AFTER the schema is at head.

Schema lives in Alembic (backend/alembic/). This module only inserts rows and
only when they are missing (SELECT-then-INSERT or ON CONFLICT), so it is safe to
run on every cold start and on the shared production database.

Groups:
  seed_admin           admin user (ADMIN_SEED_EMAIL) — create/update the password ONLY if
                       settings.ADMIN_SEED_PASSWORD is set, in any environment (2026-09-14,
                       Handover.md nota (46)/(47), L-7: no dev-default fallback anymore — that
                       fallback is what let a stale admin row with "admins123" survive
                       undetected in production). Also neutralizes/removes the legacy
                       ricardo@pbs.com row if ADMIN_SEED_EMAIL points elsewhere now.
  seed_reference_data  doc_type_rules, platform_settings, exam_courses, training_centers,
                       learning_series/seasons/episodes, cv_templates. Used to also seed
                       rank_compliance_catalog from RANK_CATALOG — retired 2026-09-14
                       (Handover.md, nota (36)); the table stays (production data), only
                       the seeding of it from dead code is gone.
  seed_demo_data       demo.company@pollux.com — showcases the B2B/company side. The
                       only seafarer demo account across the whole platform is
                       demo@castor.com, seeded by pbsds-castor-app's seeds.py against
                       the same shared DB — Pollux does not seed its own.
                       — Settings.seed_demo_data (off in production unless SEED_DEMO_DATA=true)
  seed_demo_seafarers  batch of real, DB-backed seafarers for the "Crew Database" screen
                       to show while there's no real roster yet (Rick, 2026-09-12) — same
                       names/pool `interfaces/leto/src/services/Core/CoreTransport.js`'s
                       CREW_SEEDS already used to fake this client-side; now real rows an
                       admin can delete one at a time as real seafarers replace them.
                       Identifiable by the `@demo.pollux.local` email domain (no dedicated
                       flag column exists for "this is seed data").
                       — same Settings.seed_demo_data gate as seed_demo_data
"""
import json as _json
import secrets
import unicodedata
import uuid
from datetime import datetime, timezone

from sqlalchemy import bindparam, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.engine import Engine
from sqlalchemy.exc import IntegrityError

from app.core.config import settings
from app.core.security import hash_password
from app.db.exam_seeds import EXAM_COURSES_SEED, TRAINING_CENTERS_SEED
from app.db.learning_seeds import LEARNING_SEED as _LEARNING_SEED
from app.services.cv_generator import DEFAULT_CV_TEMPLATE as _DEFAULT_CV_TEMPLATE


# A production row with this email and the "admins123" dev-fallback password
# was found live against leto-postgres (Handover.md nota (46), L-7) — created
# once from a dev backend that pointed at prod. Neutralized/removed by
# seed_admin() below whenever ADMIN_SEED_EMAIL isn't this value anymore.
_LEGACY_ADMIN_EMAIL = "ricardo@pbs.com"


def seed_admin(engine: Engine) -> None:
    """Four paths, and all four print — a seed step that silently does
    nothing is exactly what let the legacy admin row above go unnoticed
    (Handover.md nota (46): "una funcion que decide no actuar tiene que
    decirlo").

    Reads settings.ADMIN_SEED_PASSWORD directly — NOT the admin_seed_password
    property. That property falls back to the dev default ("admins123")
    outside production, so using it here would make every non-production cold
    start overwrite whatever the current admin password actually is with the
    one hardcoded in the repo. That fallback-through-a-property is the exact
    mechanism that produced the legacy row this function now also cleans up;
    reading the raw field keeps this function from reintroducing it.
    """
    email = settings.ADMIN_SEED_EMAIL
    password = settings.ADMIN_SEED_PASSWORD
    with engine.connect() as _conn:
        existing = _conn.execute(
            text("SELECT id FROM users WHERE email = :e"), {"e": email}
        ).fetchone()
        if existing and password:
            _conn.execute(text("""
                UPDATE users SET hashed_password = :pw, updated_at = :now WHERE id = :id
            """), {"pw": hash_password(password), "now": datetime.now(timezone.utc), "id": existing.id})
            _conn.commit()
            print(f"[leto-api] seeds: admin {email} password updated", flush=True)
        elif existing and not password:
            print(f"[leto-api] seeds: admin {email} exists, no password change requested", flush=True)
        elif not existing and password:
            _conn.execute(text("""
                INSERT INTO users (id, email, hashed_password, role, is_active, email_verified, created_at, updated_at)
                VALUES (:id, :email, :pw, 'admin', true, false, :now, :now)
            """), {
                "id": str(uuid.uuid4()),
                "email": email,
                "pw": hash_password(password),
                "now": datetime.now(timezone.utc),
            })
            _conn.commit()
            print(f"[leto-api] seeds: admin {email} created", flush=True)
        else:
            print("[leto-api] seeds: admin seed skipped (no ADMIN_SEED_PASSWORD)", flush=True)

        _neutralize_legacy_admin(_conn, current_email=email)


def _neutralize_legacy_admin(_conn, current_email: str) -> None:
    """Close the legacy ricardo@pbs.com row (Handover.md nota (46)/(47), L-7).

    Order matters, and it's deliberate: NEUTRALIZE first (irrecoverable
    random hash + is_active=false) and COMMIT that, only THEN attempt the
    DELETE. If the delete fails — likely, ocr_feedback_log stores the
    reviewing admin's id — the row is already inert; nothing forces the
    delete through with CASCADE, and a caught foreign-key failure here is a
    success path, not an error. Deleting first and failing would instead
    leave the row intact and working with "admins123" — closed becomes open.
    Idempotent: a second run finds no legacy row and does nothing.
    """
    if current_email == _LEGACY_ADMIN_EMAIL:
        return
    legacy = _conn.execute(
        text("SELECT id FROM users WHERE email = :e"), {"e": _LEGACY_ADMIN_EMAIL}
    ).fetchone()
    if not legacy:
        return

    _conn.execute(text("""
        UPDATE users SET hashed_password = :pw, is_active = false, updated_at = :now WHERE id = :id
    """), {
        "pw": hash_password(secrets.token_urlsafe(32)),
        "now": datetime.now(timezone.utc),
        "id": legacy.id,
    })
    _conn.commit()

    try:
        _conn.execute(text("DELETE FROM users WHERE id = :id"), {"id": legacy.id})
        _conn.commit()
        print(f"[leto-api] seeds: legacy admin {_LEGACY_ADMIN_EMAIL} deleted", flush=True)
    except IntegrityError:
        _conn.rollback()
        print("[leto-api] seeds: legacy admin retained (FK), neutralized", flush=True)


def seed_reference_data(engine: Engine) -> None:
    with engine.connect() as _conn:
        # Seed doc_type_rules from _reglas.json reference files (upsert on restart)
        _RULES_SEED = [
            # --- Category 1: Main Documents ---
            ("DP Licence",
             ["dynamic positioning operator's certificate", "dynamic positioning",
              "the nautical institute", "certificate no", "valid from", "valid to", "valid for"],
             ["sample", "specimen", "fake", "not valid", "void"],
             0.5, 0.85, r"\b\d{4,6}\b",
             "DPO card — The Nautical Institute"),
            ("Flag State CoC",
             ["panama maritime authority", "autoridad maritima de panama",
              "direccion general de la gente de mar", "general directorate of seafarers",
              "standards of training", "watchkeeping for seafarers", "regulation",
              "regla", "funciones", "functions", "nivel", "level", "capacity",
              "holder's signature", "firma del titular"],
             ["sample", "specimen", "muestra", "fake", "not valid", "void"],
             0.5, 0.85, r"CT[-\s]?\d{6}/\d{2}[-\s]?PAN",
             "STCW CoC by AMP Panama. CT No regex is most distinctive."),
            ("Flag State CoP",
             ["certificate of proficiency", "stcw", "valid until", "maritime authority", "endorsement"],
             ["SAMPLE", "SPECIMEN", "FAKE", "TEST DOCUMENT", "NOT VALID"],
             0.60, 0.88, None,
             "STCW Certificate of Proficiency"),
            ("National ID Card",
             ["republica de panama", "tribunal electoral", "fecha de nacimiento",
              "lugar de nacimiento", "expedida", "expira", "sexo"],
             ["sample", "specimen", "muestra", "fake", "not valid", "void"],
             0.5, 0.85, r"\b\d{1,2}-\d{3,4}-\d{2,5}\b",
             "Cedula panamena. Tribunal Electoral."),
            ("Passport",
             ["pasaporte", "passport", "republica de panama", "nacionalidad",
              "nationality", "fecha de nacimiento", "date of birth",
              "fecha de vencimiento", "date of expiry", "autoridad", "pasaportes/panama"],
             ["sample", "specimen", "muestra", "fake", "not valid", "void"],
             0.55, 0.85, r"\bPA\d{7}\b",
             "ICAO 9303 passport. MRZ cross-check recommended."),
            ("Seaman's Book (Main Page)",
             ["libreta de embarque", "seaman's book", "panama maritime authority",
              "autoridad maritima de panama", "identificacion", "id number",
              "nivel", "level", "cargo", "capacity", "seafarers id", "id marino"],
             ["sample", "specimen", "muestra", "fake", "not valid", "void"],
             0.55, 0.85, r"\bPA\d{7}\b",
             "Panama AMP seaman's book main page. Book No = PA+7 digits."),
            # --- Category 2: IMO Courses (generic fallback rule) ---
            ("_IMO_COURSE_GENERIC",
             ["hereby certifies that", "has successfully completed",
              "certificate number", "issued on", "training", "republic of panama"],
             ["sample", "specimen", "muestra", "fake", "not valid", "void"],
             0.45, 0.9, r"[A-Z]{2,5}-\d{2,4}(-\d{2,4})?",
             "Generic rule for ~80 IMO courses. Anchor: issuer + certifies + cert number."),
            # --- Category 3: Health Certificates ---
            ("COVID-19 Vaccination Record",
             ["covid", "covid-19", "certificado covid", "vaccination", "vacunacion",
              "sars-cov-2", "dosis", "doses", "fabricante", "manufacturer"],
             ["sample", "specimen", "muestra", "fake", "not valid", "void"],
             0.45, 0.9,
             r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}",
             "DGC COVID certificate. UUID identifier. No fixed expiry."),
            ("Flag State Medical Certificate",
             ["certificado medico de la gente de mar",
              "medical fitness standards certificate for seafarers",
              "autoridad maritima de panama", "panama maritime authority",
              "regulation i/9", "regla i/9", "a-i/2", "mlc",
              "fecha de expiracion", "date of expiry",
              "medico reconocido", "recognized medical practitioner"],
             ["sample", "specimen", "muestra", "fake", "not valid", "void"],
             0.55, 0.85, r"AMP-\d{3,4}-\d{4}",
             "STCW I/9 + MLC A-I/2 medical cert by AMP. Validity 2 years."),
            ("Medical Certificate",
             ["medical certificate", "fitness", "seafarer", "valid until", "examined"],
             ["SAMPLE", "SPECIMEN", "FAKE", "TEST DOCUMENT", "NOT VALID"],
             0.55, 0.85, r"MED-\d{4}-\d{4}",
             "ILO/WHO medical fitness certificate (generic fallback)"),
            ("Yellow Fever Vaccination",
             ["certificado internacional de vacunacion",
              "international certificate of vaccination",
              "prophylaxis", "profilaxis", "reglamento sanitario internacional",
              "international health regulation", "ministerio de salud",
              "fiebre amarilla", "yellow fever"],
             ["sample", "specimen", "muestra", "fake", "not valid", "void"],
             0.4, 0.92, r"\b\d{4,6}\b",
             "ICVP yellow card. Handwritten, low OCR reliability. Lifetime validity (IHR 2016)."),
            # --- Category 5: Other Certificates ---
            ("Dynamic Positioning (DP) Advanced",
             ["dynamic positioning", "advanced", "simulator course",
              "completion of training certificate", "the nautical institute",
              "has successfully completed training"],
             ["sample", "specimen", "fake", "not valid", "void"],
             0.45, 0.9, r"\b\d{3,5}[A-Z]{0,2}\b",
             "DP advanced/simulator course. Not a DP Licence. No expiry."),
            ("Dynamic Positioning (DP) Basic",
             ["dynamic positioning", "basic", "operator course", "certificate",
              "the nautical institute", "has attended", "has successfully completed"],
             ["sample", "specimen", "fake", "not valid", "void"],
             0.45, 0.9, None,
             "DP basic operator course. Not a DP Licence. No expiry."),
            ("GMDSS GOC Certificate",
             ["gmdss", "operador general smssm", "gmdss general operator",
              "radiocomunicaciones", "regulation iv/2", "regla iv/2",
              "panama maritime authority"],
             ["sample", "specimen", "muestra", "fake", "not valid", "void"],
             0.5, 0.85, r"CT[-\s]?\d{6}/\d{2}[-\s]?PAN",
             "GMDSS GOC — AMP IV/2 title. Similar to Flag State CoC."),
            ("H2S Safety Training",
             ["hydrogen sulfide", "h2s", "certificate of completion",
              "has successfully completed", "ansi z390.1", "osha",
              "29 cfr", "certificate number", "issue date"],
             ["sample", "specimen", "fake", "not valid", "void"],
             0.5, 0.9, r"\b\d{10,16}\b",
             "H2S OSHA/ANSI Z390.1. Annual refresher. Variable providers."),
        ]
        _UPSERT_RULE_SQL = text("""
            INSERT INTO doc_type_rules
                (doc_key, expected_keywords, red_flag_keywords, min_confidence,
                 auto_verify_threshold, number_regex, notes, updated_at)
            VALUES
                (:dk, CAST(:exp AS jsonb), CAST(:red AS jsonb),
                 :min_c, :auto, :rx, :notes, NOW())
            ON CONFLICT (doc_key) DO NOTHING
        """)
        for _dk, _exp_list, _red_list, _min_c, _auto, _rx, _notes in _RULES_SEED:
            _conn.execute(_UPSERT_RULE_SQL, {
                "dk": _dk,
                "exp": _json.dumps(_exp_list),
                "red": _json.dumps(_red_list),
                "min_c": _min_c,
                "auto": _auto,
                "rx": _rx,
                "notes": _notes,
            })
        _conn.commit()

    # Seed platform settings — idempotent
    # 2026-09-14 (Handover.md nota 48): was 4 rows. `doc_max_size_mb` and
    # `compliance_alert_days` had no reader anywhere in the codebase — not
    # "not wired yet", genuinely nothing to wire them to (no upload-size
    # check exists; no "Compliance Monitor" alert feature reads an alert
    # window). Dropped rather than left as settings an admin can edit with
    # zero effect. The other two now have real readers —
    # compliance_engine._expiry_thresholds().
    _SETTINGS_DEFAULTS = [
        ("expiry_critical_days",  "7",  "Days before expiry to flag document as CRITICAL"),
        ("expiry_warning_days",   "30", "Days before expiry to flag document as EXPIRING"),
    ]
    with engine.connect() as _conn:
        for _key, _val, _desc in _SETTINGS_DEFAULTS:
            _conn.execute(text("""
                INSERT INTO platform_settings (key, value, description)
                VALUES (:key, :value, :desc)
                ON CONFLICT (key) DO NOTHING
            """), {"key": _key, "value": _val, "desc": _desc})
        _conn.commit()

    # Seed exam courses — idempotent

    _COURSE_STMT = text(
        "INSERT INTO exam_courses (id, name, code, stcw_ref, level, departments, description, duration, validity) "
        "VALUES (:id, :name, :code, :stcw_ref, :level, :departments, :description, :duration, :validity)"
    ).bindparams(bindparam("departments", type_=JSONB))

    _CENTER_STMT = text(
        "INSERT INTO training_centers (id, name, abbreviation, city, district, type, resolution, website, courses_count, specialties, notes) "
        "VALUES (:id, :name, :abbreviation, :city, :district, :type, :resolution, :website, :courses_count, :specialties, :notes)"
    ).bindparams(bindparam("specialties", type_=JSONB))

    with engine.connect() as _conn:
        count = _conn.execute(text("SELECT COUNT(*) FROM exam_courses")).scalar()
        if count == 0:
            for c in EXAM_COURSES_SEED:
                _conn.execute(_COURSE_STMT, c)
            _conn.commit()

    with engine.connect() as _conn:
        count = _conn.execute(text("SELECT COUNT(*) FROM training_centers")).scalar()
        if count == 0:
            for tc in TRAINING_CENTERS_SEED:
                _conn.execute(_CENTER_STMT, tc)
            _conn.commit()

    # Seed learning series/seasons/episodes from CMS_CONTENT_GUIDE (idempotent)

    with engine.connect() as _conn:
        _series_count = _conn.execute(text("SELECT COUNT(*) FROM learning_series")).scalar()
        if _series_count == 0:
            for _s in _LEARNING_SEED:
                _series_id = str(uuid.uuid4())
                _now = datetime.now(timezone.utc)
                _conn.execute(text("""
                    INSERT INTO learning_series
                        (id, badge_id, title, description, is_published, created_at, updated_at)
                    VALUES (:id, :badge_id, :title, :description, :published, :now, :now)
                """), {
                    "id": _series_id, "badge_id": _s["badge_id"],
                    "title": _s["title"], "description": _s["description"],
                    "published": _s["is_published"], "now": _now,
                })
                for _season in _s["seasons"]:
                    _season_id = str(uuid.uuid4())
                    _conn.execute(text("""
                        INSERT INTO learning_seasons (id, series_id, title, "order", created_at)
                        VALUES (:id, :series_id, :title, :order, :now)
                    """), {
                        "id": _season_id, "series_id": _series_id,
                        "title": _season["title"], "order": _season["order"], "now": _now,
                    })
                    for _ep in _season["episodes"]:
                        _conn.execute(text("""
                            INSERT INTO learning_episodes (id, season_id, title, "order", created_at)
                            VALUES (:id, :season_id, :title, :order, :now)
                        """), {
                            "id": str(uuid.uuid4()), "season_id": _season_id,
                            "title": _ep["title"], "order": _ep["order"], "now": _now,
                        })
            _conn.commit()

    # Seed the default CV template — idempotent (admin edits it afterward)
    with engine.connect() as _conn:
        _cv_count = _conn.execute(text("SELECT COUNT(*) FROM cv_templates WHERE id = 'default'")).scalar()
        if _cv_count == 0:
            _conn.execute(text("""
                INSERT INTO cv_templates (id, html_template, logo_b64, accent_color, updated_at)
                VALUES ('default', :tpl, NULL, '#0ea5e9', :now)
            """), {"tpl": _DEFAULT_CV_TEMPLATE, "now": datetime.now(timezone.utc)})
            _conn.commit()


def seed_demo_data(engine: Engine) -> None:
    # Seed demo company — idempotent
    with engine.connect() as _conn:
        _demo_co_existing = _conn.execute(
            text("SELECT id FROM users WHERE email = 'demo.company@pollux.com'")
        ).fetchone()
        if not _demo_co_existing:
            _co_id   = str(uuid.uuid4())
            _co_user = str(uuid.uuid4())
            _now     = datetime.now(timezone.utc)
            # company_status='approved' + email_verified=true (2026-09-14, company
            # approval feature): this is the platform's one showcase demo account —
            # it must never sit behind the new pending-approval gate.
            _conn.execute(text("""
                INSERT INTO companies (id, name, contact_email, country, fleet_size, is_verified, company_status, created_at)
                VALUES (:id, :name, :email, :country, :fleet, true, 'approved', :now)
            """), {
                "id": _co_id, "name": "Demo Shipping Co.",
                "email": "demo.company@pollux.com", "country": "Panama",
                "fleet": 3, "now": _now,
            })
            _conn.execute(text("""
                INSERT INTO users (id, email, hashed_password, role, company_id, is_active, email_verified, created_at, updated_at)
                VALUES (:id, :email, :pw, 'company', :co_id, true, true, :now, :now)
            """), {
                "id": _co_user, "email": "demo.company@pollux.com",
                "pw": hash_password("demo1234"), "co_id": _co_id, "now": _now,
            })
            _conn.commit()


# Same 32 names CoreTransport.js's CREW_SEEDS fakes client-side — ported here so the
# same names become real rows instead. (first, last) pairs.
_DEMO_SEAFARER_NAMES = [
    ("Carlos", "Rodríguez"), ("Miguel", "González"), ("José", "Martínez"), ("Ricardo", "López"),
    ("Andrés", "Hernández"), ("Fernando", "García"), ("Diego", "Pérez"), ("Luis", "Sánchez"),
    ("Roberto", "Ramírez"), ("Alejandro", "Torres"), ("Manuel", "Flores"), ("Gabriel", "Rivera"),
    ("Daniel", "Gómez"), ("Marco", "Díaz"), ("Eduardo", "Cruz"), ("Héctor", "Morales"),
    ("Raúl", "Reyes"), ("Sergio", "Gutiérrez"), ("Víctor", "Ortiz"), ("Pablo", "Ramos"),
    ("Javier", "Vargas"), ("Óscar", "Castillo"), ("Tomás", "Jiménez"), ("Enrique", "Moreno"),
    ("Arturo", "Romero"), ("Rafael", "Alvarado"), ("Iván", "Ruiz"), ("Felipe", "Mendoza"),
    ("Adrián", "Aguilar"), ("Gonzalo", "Medina"), ("Santiago", "Castro"), ("Martín", "Herrera"),
]

# Merchant-fleet rank codes only (RANK_FLEET_CAT), cycled by index — real codes the
# compliance engine understands, not display strings.
_DEMO_SEAFARER_RANKS = [
    "master", "chief-mate", "2nd-mate", "3rd-mate", "bosun", "ab", "os", "deck-cadet",
    "gmdss-operator", "chief-engineer", "2nd-engineer", "3rd-engineer", "4th-engineer",
    "eto", "ase", "oiler", "etr", "engine-cadet", "cook", "steward",
]

_DEMO_SEAFARER_RANK_DEPARTMENT = {
    "master": "Deck Department", "chief-mate": "Deck Department", "2nd-mate": "Deck Department",
    "3rd-mate": "Deck Department", "bosun": "Deck Department", "ab": "Deck Department",
    "os": "Deck Department", "deck-cadet": "Deck Department",
    "gmdss-operator": "Radio / GMDSS",
    "chief-engineer": "Engine Department", "2nd-engineer": "Engine Department",
    "3rd-engineer": "Engine Department", "4th-engineer": "Engine Department",
    "oiler": "Engine Department", "engine-cadet": "Engine Department", "ase": "Engine Department",
    "eto": "Electro-Technical", "etr": "Electro-Technical",
    "cook": "Catering / Hotel", "steward": "Catering / Hotel",
}

_DEMO_SEAFARER_NATIONALITIES = [
    "Panama", "Colombia", "Peru", "Ecuador", "Mexico", "Brazil", "Chile", "Argentina",
    "Venezuela", "Honduras", "Guatemala", "Dominican Republic", "Costa Rica", "Cuba",
    "El Salvador", "Nicaragua", "Bolivia", "Paraguay", "Uruguay", "United States", "Canada",
]


def _demo_seafarer_email(first: str, last: str) -> str:
    slug = unicodedata.normalize("NFKD", f"{first}.{last}").encode("ascii", "ignore").decode("ascii")
    return f"{slug.lower()}@demo.pollux.local"


def seed_demo_seafarers(engine: Engine) -> None:
    with engine.connect() as _conn:
        for i, (first, last) in enumerate(_DEMO_SEAFARER_NAMES):
            email = _demo_seafarer_email(first, last)
            existing = _conn.execute(text("SELECT id FROM users WHERE email = :e"), {"e": email}).fetchone()
            if existing:
                continue
            rank = _DEMO_SEAFARER_RANKS[i % len(_DEMO_SEAFARER_RANKS)]
            user_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc)
            _conn.execute(text("""
                INSERT INTO users (id, email, hashed_password, role, is_active, email_verified, created_at, updated_at)
                VALUES (:id, :email, :pw, 'seafarer', true, false, :now, :now)
            """), {
                "id": user_id, "email": email,
                "pw": hash_password("seedaccount123"), "now": now,
            })
            _conn.execute(text("""
                INSERT INTO seafarers
                    (id, first_name, last_name, nationality, rank, fleet_category, department,
                     years_experience, is_available, created_at, discoverable)
                VALUES (:id, :first, :last, :nat, :rank, 'merchant', :dept, :years, true, :now, true)
            """), {
                "id": user_id, "first": first, "last": last,
                "nat": _DEMO_SEAFARER_NATIONALITIES[i % len(_DEMO_SEAFARER_NATIONALITIES)],
                "rank": rank, "dept": _DEMO_SEAFARER_RANK_DEPARTMENT.get(rank, "Deck Department"),
                "years": 3 + (i % 15), "now": now,
            })
        _conn.commit()
    print(f"[leto-api] seeds: {len(_DEMO_SEAFARER_NAMES)} demo seafarers ensured", flush=True)


def _has_real_seafarers(engine: Engine) -> bool:
    """Second, environment-INDEPENDENT gate for demo seeding (Handover.md nota
    (46)/(47), L-7 point 5). SEED_DEMO_DATA is a single env var, and this same
    week that class of single-variable gate failed in practice for the admin
    seed. A real seafarer in the DB is evidence no env var can misreport."""
    with engine.connect() as _conn:
        row = _conn.execute(text(
            "SELECT 1 FROM users WHERE role = 'seafarer' AND email NOT LIKE '%@demo.%' LIMIT 1"
        )).fetchone()
    return row is not None


def run_seeds(engine: Engine) -> None:
    seed_admin(engine)
    seed_reference_data(engine)
    if settings.seed_demo_data and not _has_real_seafarers(engine):
        seed_demo_data(engine)
        seed_demo_seafarers(engine)
    elif settings.seed_demo_data:
        print("[leto-api] seeds: demo data skipped (real seafarers already in DB)", flush=True)
    else:
        print("[leto-api] seeds: demo data skipped (production)", flush=True)
