"""
Document Requirements Service
Port of interfaces/castor/src/common/crewDocData.js → getRequiredDocsByProfile()

This service answers: "for a given rank + maritime profile, which documents
must appear in the seafarer's upload library?"

Unified compliance engine (2026-09-14): this module is now the SINGLE source
of truth for *which* titles a rank/profile requires — compliance_engine.py no
longer has its own parallel rank catalog. It attaches regulatory metadata
(DOC_METADATA below) to each title and runs the STCW expiry/state machine on
top. See Handover.md, DEV CASTOR 2026-09-14 (unified engine), for the full
design and the review status of each metadata row.
"""

from typing import Optional

# ── Vessel type → required STCW special endorsements ────────────────────
# Mirrors vessel_types.json stcw_special codes for types with non-empty lists.
VESSEL_STCW_MAP: dict[str, list[str]] = {
    "oil_tanker_crude":    ["CoP_Tanker_Oil_Basic", "CoP_Tanker_Oil_Advanced"],
    "oil_tanker_product":  ["CoP_Tanker_Oil_Basic", "CoP_Tanker_Oil_Advanced"],
    "chemical_tanker":     ["CoP_Tanker_Chemical_Basic", "CoP_Tanker_Chemical_Advanced"],
    "lng_carrier":         ["CoP_Tanker_Gas_Basic", "CoP_Tanker_Gas_Advanced"],
    "lpg_carrier":         ["CoP_Tanker_Gas_Basic", "CoP_Tanker_Gas_Advanced"],
    "ro_ro":               ["CoP_RoRo_Passenger"],
    "passenger_cruise":    ["CoP_Passenger_Safety", "CoP_Crisis_Management"],
    "ferry":               ["CoP_Passenger_Safety"],
    "osv":                 ["Offshore_HUET", "Offshore_BOSIET"],
    "psv":                 ["Offshore_HUET", "Offshore_BOSIET"],
    "ahts":                ["Offshore_HUET", "Offshore_BOSIET"],
    "modu_jackup":         ["Offshore_HUET", "Offshore_BOSIET", "MODU_Basic"],
    "modu_semisub":        ["Offshore_HUET", "Offshore_BOSIET", "MODU_Basic"],
    "modu_drillship":      ["Offshore_HUET", "Offshore_BOSIET", "MODU_Basic"],
    "fpso":                ["CoP_Tanker_Oil_Basic", "Offshore_BOSIET"],
    "well_intervention":   ["Offshore_HUET", "Offshore_BOSIET"],
}

# Maps stcw_special code → display title (must match CREW_ALL_DOCS titles on frontend)
STCW_SPECIAL_MAP: dict[str, str] = {
    "CoP_Tanker_Oil_Basic":         "IMO 1.01 — Basic Training for Oil and Chemical Tanker Cargo Operations",
    "CoP_Tanker_Oil_Advanced":      "IMO 1.02 — Advanced Training for Oil Tanker Cargo Operations",
    "CoP_Tanker_Chemical_Basic":    "IMO 1.01 — Basic Training for Oil and Chemical Tanker Cargo Operations",
    "CoP_Tanker_Chemical_Advanced": "IMO 1.03 — Advanced Training for Chemical Tanker Cargo Operations",
    "CoP_Tanker_Gas_Basic":         "IMO 1.04 — Basic Training for Liquefied Gas Tanker Cargo Operations",
    "CoP_Tanker_Gas_Advanced":      "IMO 1.05 — Advanced Training for Liquefied Gas Tanker Cargo Operations",
    "CoP_RoRo_Passenger":           "IMO 1.46 — Passenger Safety, Cargo Safety and Hull Integrity Training",
    "CoP_Passenger_Safety":         "IMO 1.41 — Passenger Ship Crowd Management Training",
    "CoP_Crisis_Management":        "IMO 1.42 — Passenger Ship Crisis Management & Human Behavior Training",
    "Offshore_HUET":                "HUET — Helicopter Escape",
    "Offshore_BOSIET":              "BOSIET — Offshore Safety",
    "MODU_Basic":                   "BOSIET — Offshore Safety",
}

# ── Universal docs required by every rank ────────────────────────────────
UNIVERSAL_DOCS: list[str] = [
    "Seaman's Book (Main Page)",
    "National ID Card",
    "Passport",
    "Seaman Identity Document (SID)",
    "Flag State Medical Certificate",
    "Drug & Alcohol Test",
    "Eyesight Test Certificate",
    "IMO 1.19 — Proficiency in Personal Survival Techniques",
    "IMO 1.20 — Fire Prevention and Fire Fighting",
    "IMO 1.21 — Personal Safety and Social Responsibilities",
    "IMO 1.14 — Medical First Aid",
    "IMO 3.27 — Security Awareness Training for All Seafarers",
]

# ── Per-rank required document titles ────────────────────────────────────
# Keys match RANK_KEY_MAP normalised output.
# Titles must match CREW_ALL_DOCS entries in crewDocData.js exactly.
RANK_REQUIRED_DOCS: dict[str, list[str]] = {
    "master": [
        *UNIVERSAL_DOCS,
        "Flag State CoC",
        "Endorsement of Recognition",
        "IMO 1.07 — Radar Navigation at Operational Level",
        "IMO 1.08 — Radar Navigation at Management Level (Radar, ARPA, Bridge Teamwork & SAR)",
        "IMO 1.15 — Medical Care",
        "IMO 1.22 — Bridge Resource Management (BRM)",
        "IMO 1.23 — Proficiency in Survival Craft and Rescue Boats (excl. Fast Rescue Boats)",
        "IMO 1.25 — General Operator's Certificate for GMDSS",
        "IMO 1.27 — Operational Use of ECDIS",
        "IMO 1.29 — Proficiency in Crisis Management and Human Behavior Training",
        "IMO 1.39 — Leadership & Teamwork",
        "IMO 1.40 — Use of Leadership and Managerial Skills",
        "IMO 2.03 — Advanced Training in Fire Fighting",
        "IMO 3.19 — Ship Security Officer (SSO)",
        "IMO 7.01 — Master and Chief Mate",
    ],
    "chief-officer": [
        *UNIVERSAL_DOCS,
        "Flag State CoC",
        "Endorsement of Recognition",
        "IMO 1.07 — Radar Navigation at Operational Level",
        "IMO 1.08 — Radar Navigation at Management Level (Radar, ARPA, Bridge Teamwork & SAR)",
        "IMO 1.15 — Medical Care",
        "IMO 1.22 — Bridge Resource Management (BRM)",
        "IMO 1.23 — Proficiency in Survival Craft and Rescue Boats (excl. Fast Rescue Boats)",
        "IMO 1.25 — General Operator's Certificate for GMDSS",
        "IMO 1.27 — Operational Use of ECDIS",
        "IMO 1.29 — Proficiency in Crisis Management and Human Behavior Training",
        "IMO 1.39 — Leadership & Teamwork",
        "IMO 2.03 — Advanced Training in Fire Fighting",
        "IMO 7.01 — Master and Chief Mate",
    ],
    "2nd-officer": [
        *UNIVERSAL_DOCS,
        "Flag State CoC",
        "Endorsement of Recognition",
        "IMO 1.07 — Radar Navigation at Operational Level",
        "IMO 1.23 — Proficiency in Survival Craft and Rescue Boats (excl. Fast Rescue Boats)",
        "IMO 1.25 — General Operator's Certificate for GMDSS",
        "IMO 1.27 — Operational Use of ECDIS",
        "IMO 2.03 — Advanced Training in Fire Fighting",
        "IMO 7.03 — Officer in Charge of a Navigational Watch (OOW)",
    ],
    "3rd-officer": [
        *UNIVERSAL_DOCS,
        "Flag State CoC",
        "Endorsement of Recognition",
        "IMO 1.23 — Proficiency in Survival Craft and Rescue Boats (excl. Fast Rescue Boats)",
        "IMO 1.27 — Operational Use of ECDIS",
        "IMO 2.03 — Advanced Training in Fire Fighting",
        "IMO 7.03 — Officer in Charge of a Navigational Watch (OOW)",
    ],
    "chief-engineer": [
        *UNIVERSAL_DOCS,
        "Flag State CoC",
        "Endorsement of Recognition",
        "IMO 1.15 — Medical Care",
        "IMO 1.23 — Proficiency in Survival Craft and Rescue Boats (excl. Fast Rescue Boats)",
        "IMO 1.39 — Leadership & Teamwork",
        "IMO 1.40 — Use of Leadership and Managerial Skills",
        "IMO 2.03 — Advanced Training in Fire Fighting",
        "IMO 7.02 — Chief Engineer Officer & Second Engineer Officer",
        "IMO 7.17 — Engine-Room Resource Management (ERM)",
        "High Voltage Operations",
    ],
    "2nd-engineer": [
        *UNIVERSAL_DOCS,
        "Flag State CoC",
        "Endorsement of Recognition",
        "IMO 1.23 — Proficiency in Survival Craft and Rescue Boats (excl. Fast Rescue Boats)",
        "IMO 1.39 — Leadership & Teamwork",
        "IMO 2.03 — Advanced Training in Fire Fighting",
        "IMO 7.02 — Chief Engineer Officer & Second Engineer Officer",
        "IMO 7.17 — Engine-Room Resource Management (ERM)",
    ],
    "electrician": [
        *UNIVERSAL_DOCS,
        "Flag State CoC",
        "Endorsement of Recognition",
        "IMO 1.23 — Proficiency in Survival Craft and Rescue Boats (excl. Fast Rescue Boats)",
        "IMO 2.03 — Advanced Training in Fire Fighting",
        "IMO 7.08 — Electro-Technical Officer (ETO)",
        "High Voltage Operations",
    ],
    "bosun": [
        *UNIVERSAL_DOCS,
        "IMO 1.23 — Proficiency in Survival Craft and Rescue Boats (excl. Fast Rescue Boats)",
        "IMO 3.26 — Security Training for Seafarers with Designated Security Duties",
        "IMO 7.10 — Ratings as Able Seafarer Deck",
    ],
    "ab": [
        *UNIVERSAL_DOCS,
        "IMO 1.23 — Proficiency in Survival Craft and Rescue Boats (excl. Fast Rescue Boats)",
        "IMO 3.26 — Security Training for Seafarers with Designated Security Duties",
        "IMO 7.10 — Ratings as Able Seafarer Deck",
    ],
    "cook": [
        *UNIVERSAL_DOCS,
        "IMO 3.27 — Security Awareness Training for All Seafarers",
    ],
    "os": [
        *UNIVERSAL_DOCS,
    ],

    # ── Offshore / fishing / yacht / national — coverage mapping, 2026-09-14 ──
    # These 47 ranks were previously ABSENT from this dict entirely: normalize_rank()
    # resolves them (unchanged from raw input, since none of them go through
    # _RANK_KEY_MAP — they're the same hyphenated ids RegisterModal.tsx's own rank
    # selector already uses), but RANK_REQUIRED_DOCS.get(rank, []) returned [] for
    # every one of them. That was the coverage gap PATCH-03 (compliance_engine.py)
    # had to guard against explicitly (rank_is_covered()) rather than silently
    # allow to read as "fully compliant". See Handover.md for the full trail.
    #
    # Source: every title below is lifted VERBATIM (name/level/cert_type/
    # validity_years) from compliance_engine.RANK_CATALOG's existing entry for
    # this same rank — already Rick-approved content, not a new guess. The one
    # exception is a discrepancy worth a human's eyes: RANK_CATALOG's own H2S
    # item uses validity_years=2, while interfaces/castor/.../crewDocData.js's
    # unrelated "H2S Safety Training" catalog entry uses 4 — different title
    # strings, so not strictly a conflict, but likely the same real-world cert
    # under two names. Flagged for Rick, not resolved here.
    #
    # Each rank's "CoC"-equivalent kept its own distinct title (e.g. "Certificado
    # de OIM — Unidad Fija") rather than collapsing into the generic "Flag State
    # CoC" merchant ranks use — an OIM's and a Master's CoC are different
    # documents, and Library.js should show a company/marino the name they
    # actually recognize. This is a judgment call, not a fact — flagged as such.
    "3rd-engineer": [
        *UNIVERSAL_DOCS,
        "Flag State CoC",
        "Endorsement of Recognition",
        "IMO 1.14 — Medical First Aid",
        "IMO 1.23 — Proficiency in Survival Craft and Rescue Boats (excl. Fast Rescue Boats)",
        "IMO 2.03 — Advanced Training in Fire Fighting",
    ],
    "4th-engineer": [
        *UNIVERSAL_DOCS,
        "Flag State CoC",
        "Endorsement of Recognition",
        "IMO 1.14 — Medical First Aid",
        "IMO 1.23 — Proficiency in Survival Craft and Rescue Boats (excl. Fast Rescue Boats)",
        "IMO 2.03 — Advanced Training in Fire Fighting",
    ],
    "ab-mou": [
        *UNIVERSAL_DOCS,
        "BOSIET — Offshore Safety",
        "IMO 1.23 — Proficiency in Survival Craft and Rescue Boats (excl. Fast Rescue Boats)",
    ],
    "an-lancha-1": [
        *UNIVERSAL_DOCS,
        "CoC Patrón de Lancha 1ª Clase (AMP §21)",
    ],
    "an-lancha-2": [
        *UNIVERSAL_DOCS,
        "CoC Patrón de Lancha 2ª Clase (AMP §21)",
    ],
    "an-maquinista": [
        *UNIVERSAL_DOCS,
        "CoC Maquinista Naval — Aguas Nacionales (AMP §21)",
    ],
    "an-marinero": [
        *UNIVERSAL_DOCS,
        "Libreta de Marinero Nacional (AMP)",
    ],
    "an-patron-100": [
        *UNIVERSAL_DOCS,
        "CoC Patrón hasta 100 GT — Aguas Nacionales (AMP §21)",
        "First Aid / Primeros Auxilios Básicos",
    ],
    "an-patron-500": [
        *UNIVERSAL_DOCS,
        "CoC Patrón hasta 500 GT — Aguas Nacionales (AMP §21)",
        "Short Range Certificate — GMDSS (SRC/ROC)",
        "First Aid / Primeros Auxilios Básicos",
    ],
    "an-pesca-1": [
        *UNIVERSAL_DOCS,
        "CoC Patrón Pesca Nacional 1ª Clase (AMP §21)",
    ],
    "an-pesca-2": [
        *UNIVERSAL_DOCS,
        "CoC Patrón Pesca Nacional 2ª Clase (AMP §21)",
    ],
    "an-placer-1": [
        *UNIVERSAL_DOCS,
        "CoC Embarcación de Placer 1ª Clase (AMP §21)",
        "First Aid / Primeros Auxilios Básicos",
    ],
    "an-placer-2": [
        *UNIVERSAL_DOCS,
        "CoC Embarcación de Placer 2ª Clase (AMP §21)",
    ],
    "an-placer-3": [
        *UNIVERSAL_DOCS,
        "CoC Embarcación de Placer 3ª Clase (AMP §21)",
    ],
    "an-remolcador": [
        *UNIVERSAL_DOCS,
        "CoC Patrón de Remolcador — Aguas Nacionales (AMP §21)",
        "First Aid / Primeros Auxilios Básicos",
    ],
    "an-tecnico": [
        *UNIVERSAL_DOCS,
        "CoC Técnico Naval — Aguas Nacionales (AMP §21)",
    ],
    "ase": [
        *UNIVERSAL_DOCS,
        "Certificate of Competence — Able Seafarer Engine (ASE)",
    ],
    "ballast-operator": [
        *UNIVERSAL_DOCS,
        "Certificado de Operador de Lastre (Ballast Control)",
        "BOSIET — Offshore Safety",
    ],
    "barge-supervisor": [
        *UNIVERSAL_DOCS,
        "Certificado de Supervisor de Barcaza",
        "BOSIET — Offshore Safety",
        "H2S Awareness / Hydrogen Sulfide Safety",
    ],
    "deck-cadet": [
        *UNIVERSAL_DOCS,
        "Sea Practice Form / Training Record Book (Cubierta)",
    ],
    "driller": [
        *UNIVERSAL_DOCS,
        "IADC WellSharp / Rig Pass — Drilling Operations",
        "Certificado de Perforador (Driller)",
        "BOSIET — Offshore Safety",
        "H2S Awareness / Hydrogen Sulfide Safety",
    ],
    "engine-cadet": [
        *UNIVERSAL_DOCS,
        "Training Record Book (Máquinas)",
    ],
    "fishing-captain": [
        *UNIVERSAL_DOCS,
        "CoC Patrón de Pesca Mayor (AMP §20)",
        "Seguridad Básica para Buques Pesqueros (SOLAS/Torremolinos)",
        "IMO 1.14 — Medical First Aid",
    ],
    "fishing-chief-engineer": [
        *UNIVERSAL_DOCS,
        "CoC Jefe de Máquinas — Buque Pesquero (AMP §20)",
        "Seguridad Básica para Buques Pesqueros (SOLAS/Torremolinos)",
    ],
    "fishing-engineer": [
        *UNIVERSAL_DOCS,
        "CoC Oficial de Máquinas — Buque Pesquero (AMP §20)",
        "Seguridad Básica para Buques Pesqueros (SOLAS/Torremolinos)",
    ],
    "fishing-observer": [
        *UNIVERSAL_DOCS,
        "Certificado de Observador de Pesca (ARAP / AMP)",
        "First Aid / Primeros Auxilios Básicos",
    ],
    "fishing-officer": [
        *UNIVERSAL_DOCS,
        "CoC Oficial de Cubierta — Buque Pesquero (AMP §20)",
        "Seguridad Básica para Buques Pesqueros (SOLAS/Torremolinos)",
    ],
    "fishing-technician": [
        *UNIVERSAL_DOCS,
        "Certificado de Técnico Pesquero (AMP §20)",
    ],
    "gmdss-operator": [
        *UNIVERSAL_DOCS,
        "IMO 1.25 — General Operator's Certificate for GMDSS",
    ],
    "maintenance-supervisor": [
        *UNIVERSAL_DOCS,
        "Certificado de Supervisor de Mantenimiento Offshore",
        "BOSIET — Offshore Safety",
        "H2S Awareness / Hydrogen Sulfide Safety",
    ],
    "marine-tech-fixed": [
        *UNIVERSAL_DOCS,
        "Certificado de Técnico Marino — Fija",
        "BOSIET — Offshore Safety",
    ],
    "marine-tech-mou": [
        *UNIVERSAL_DOCS,
        "Certificado de Técnico Marino — Flotante",
        "BOSIET — Offshore Safety",
    ],
    "oiler": [
        *UNIVERSAL_DOCS,
        "Certificate of Competence — Oiler/Motorman",
    ],
    "oiler-mou": [
        *UNIVERSAL_DOCS,
        "BOSIET — Offshore Safety",
    ],
    "oim-fixed": [
        *UNIVERSAL_DOCS,
        "Certificado de OIM — Unidad Fija",
        "BOSIET — Offshore Safety",
        "HUET — Helicopter Escape",
        "H2S Awareness / Hydrogen Sulfide Safety",
        "IMO 1.14 — Medical First Aid",
    ],
    "oim-modu": [
        *UNIVERSAL_DOCS,
        "Certificado de OIM — MODU",
        "BOSIET — Offshore Safety",
        "HUET — Helicopter Escape",
        "H2S Awareness / Hydrogen Sulfide Safety",
        "IMO 1.14 — Medical First Aid",
    ],
    "oim-mou": [
        *UNIVERSAL_DOCS,
        "Certificado de OIM — MOU Flotante",
        "BOSIET — Offshore Safety",
        "HUET — Helicopter Escape",
        "H2S Awareness / Hydrogen Sulfide Safety",
        "IMO 1.14 — Medical First Aid",
    ],
    "os-mou": [
        *UNIVERSAL_DOCS,
        "BOSIET — Offshore Safety",
    ],
    "radio-operator-mou": [
        *UNIVERSAL_DOCS,
        "IMO 1.25 — General Operator's Certificate for GMDSS",
        "BOSIET — Offshore Safety",
    ],
    "toolpusher": [
        *UNIVERSAL_DOCS,
        "IADC WellSharp / Rig Pass — Drilling Operations",
        "Certificado de Toolpusher / Jefe de Perforación",
        "BOSIET — Offshore Safety",
        "H2S Awareness / Hydrogen Sulfide Safety",
    ],
    "yacht-captain": [
        *UNIVERSAL_DOCS,
        "CoC Capitán de Yate — Sin límite GT (AMP §19)",
        "IMO 1.25 — General Operator's Certificate for GMDSS",
        "First Aid / Primeros Auxilios Básicos",
    ],
    "yacht-captain-200": [
        *UNIVERSAL_DOCS,
        "CoC Capitán de Yate hasta 200 GT (AMP §19)",
        "Short Range Certificate — GMDSS (SRC/ROC)",
        "First Aid / Primeros Auxilios Básicos",
    ],
    "yacht-captain-500": [
        *UNIVERSAL_DOCS,
        "CoC Capitán de Yate hasta 500 GT (AMP §19)",
        "Short Range Certificate — GMDSS (SRC/ROC)",
        "First Aid / Primeros Auxilios Básicos",
    ],
    "yacht-chief-engineer": [
        *UNIVERSAL_DOCS,
        "CoC Jefe de Máquinas — Yate (AMP §19)",
    ],
    "yacht-chief-engineer-750": [
        *UNIVERSAL_DOCS,
        "CoC Jefe de Máquinas Yate hasta 750 kW (AMP §19)",
    ],
    "yacht-engineer": [
        *UNIVERSAL_DOCS,
        "CoC Oficial de Máquinas — Yate (AMP §19)",
    ],
    "yacht-officer": [
        *UNIVERSAL_DOCS,
        "CoC Oficial de Cubierta — Yate (AMP §19)",
    ],
}

# Rank aliases → normalised key
# Covers: ranks_stcw.json IDs (underscore), legacy hyphen variants, Spanish aliases,
# and old demo data strings (e.g. "2nd-mate", "chief-mate").
_RANK_KEY_MAP: dict[str, str] = {
    # Master
    "master": "master", "captain": "master", "capitan": "master",
    # Chief Officer / Chief Mate
    "chief_officer": "chief-officer", "chief officer": "chief-officer",
    "chief-officer": "chief-officer", "first officer": "chief-officer",
    "1st officer": "chief-officer", "chief mate": "chief-officer",
    "chief-mate": "chief-officer",
    "primer oficial": "chief-officer",
    # 2nd Officer
    "2nd_officer": "2nd-officer", "2nd officer": "2nd-officer",
    "2nd-officer": "2nd-officer", "second officer": "2nd-officer",
    "segundo oficial": "2nd-officer", "2nd-mate": "2nd-officer",
    "2nd mate": "2nd-officer",
    # 3rd Officer
    "3rd_officer": "3rd-officer", "3rd officer": "3rd-officer",
    "3rd-officer": "3rd-officer", "third officer": "3rd-officer",
    "tercer oficial": "3rd-officer", "3rd-mate": "3rd-officer",
    "3rd mate": "3rd-officer",
    # Chief Engineer
    "chief_engineer": "chief-engineer", "chief engineer": "chief-engineer",
    "chief-engineer": "chief-engineer", "primer ingeniero": "chief-engineer",
    # 2nd Engineer (also covers 3rd/4th — same cert group for now)
    "2nd_engineer": "2nd-engineer", "2nd engineer": "2nd-engineer",
    "2nd-engineer": "2nd-engineer", "second engineer": "2nd-engineer",
    "segundo ingeniero": "2nd-engineer",
    "3rd_engineer": "2nd-engineer", "3rd engineer": "2nd-engineer",
    "4th_engineer": "2nd-engineer", "4th engineer": "2nd-engineer",
    # ETO / Electrician
    "eto": "electrician", "electrician": "electrician",
    "electro-technical officer": "electrician",
    "electro_technical_officer": "electrician",
    # Ratings
    "bosun": "bosun", "boatswain": "bosun", "contramaestre": "bosun",
    "able seaman": "ab", "able bodied seaman": "ab", "ab": "ab",
    "able_seaman": "ab", "rating / able seaman": "ab",
    "rating/able seaman": "ab", "rating": "ab",
    "ordinary seaman": "os", "ordinary_seaman": "os", "os": "os",
    "cook": "cook", "cocinero": "cook", "cook / steward": "cook",
    # Steward / Catering (no specific rank entry — fall through to universal)
    "chief_steward": "cook", "steward": "cook",
    # Deck ratings not yet named (STCW II/5 level — same requirements as AB)
    "carpenter": "ab",
    # Engine ratings
    "able_seafarer_engine": "ab",  # STCW III/5 — similar docs to AB deck
    "motorman": "os",              # STCW III/4 — Oiler/Motorman, OS-level docs
    "wiper": "os",                 # Engine support rating
    "etr": "electrician",          # Electro-Technical Rating → ETO cert group
    # GMDSS radio operators (Chapter IV) — GOC=management level, ROC=operational
    "gmdss_goc": "chief-officer",  # GOC required at same cert level as management deck
    "gmdss_roc": "2nd-officer",    # ROC = restricted operator, OOW-equivalent docs
    # Fishing ranks (STCW-F — parallel cert framework, mapped to equivalent merchant level)
    "fishing_master": "master",
    "fishing_officer": "2nd-officer",
    "fishing_engineer": "2nd-engineer",
    "fishing_rating": "os",
    # AMP Panamá — aguas nacionales (simplified national-waters cert)
    "patron_cabotaje": "2nd-officer",
    "patron_costero": "3rd-officer",
    "patron_pesca": "os",
    # Medical / other specialist (fall to universal docs)
    "ship_surgeon": "cook",  # no specific STCW rank — universal docs suffice
    "nurse": "cook",
}

_RATING_RANKS: set[str] = {"bosun", "ab", "os", "cook"}

_ADVANCED_TANKER: set[str] = {
    "IMO 1.02 — Advanced Training for Oil Tanker Cargo Operations",
    "IMO 1.03 — Advanced Training for Chemical Tanker Cargo Operations",
    "IMO 1.05 — Advanced Training for Liquefied Gas Tanker Cargo Operations",
}


def normalize_rank(rank_str: Optional[str]) -> Optional[str]:
    if not rank_str:
        return None
    return _RANK_KEY_MAP.get(rank_str.lower().strip(), rank_str.lower().strip())


def rank_is_covered(rank_str: Optional[str]) -> bool:
    """True only if the rank resolves to a real base requirement set.

    RANK_REQUIRED_DOCS has 58 keys (post coverage-mapping, 2026-09-14) and is
    the correct — and only correct — vocabulary to validate a rank against.
    It is NOT interchangeable with RANK_FLEET_CAT (compliance_engine.py, 60
    keys): the two dicts are indexed at different normalization stages.
    RANK_FLEET_CAT uses pre-normalized spellings (e.g. "chief-mate",
    "2nd-mate", "eto"); RANK_REQUIRED_DOCS uses the post-normalize_rank()
    spellings (e.g. "chief-officer", "2nd-officer", "electrician"). Checking
    normalize_rank(x) against RANK_FLEET_CAT instead of this function
    silently 400s common ranks (Handover.md note 32) — always validate a
    rank with rank_is_covered(), never against RANK_FLEET_CAT directly.

    A rank outside RANK_REQUIRED_DOCS is NOT "compliant with few documents":
    we don't know how to calculate it yet (PATCH-03, 2026-09-14).
    """
    return normalize_rank(rank_str) in RANK_REQUIRED_DOCS


def _vessel_extra_docs(vessel_type_ids: list[str]) -> set[str]:
    extras: set[str] = set()
    for vid in (vessel_type_ids or []):
        for code in VESSEL_STCW_MAP.get(vid, []):
            title = STCW_SPECIAL_MAP.get(code)
            if title:
                extras.add(title)
    return extras


def required_docs_for_profile(
    rank: str,
    coc_type: Optional[str] = None,
    cop_tanker_type: Optional[str] = None,
    cop_tanker_level: Optional[str] = None,
    flag_endorsements: Optional[list[str]] = None,
    special_endorsements: Optional[list[str]] = None,
    vessel_type_ids: Optional[list[str]] = None,
) -> list[str]:
    """
    Return the ordered list of document titles required for this profile.

    Titles match CREW_ALL_DOCS keys in crewDocData.js so the frontend can
    use this list directly as the requiredDocTitles Set without any mapping.

    Mirrors the JS function getRequiredDocsByProfile() exactly.
    """
    norm_rank = normalize_rank(rank)
    is_rating = norm_rank in _RATING_RANKS
    combined: set[str] = set(RANK_REQUIRED_DOCS.get(norm_rank or "", []))

    coc = (coc_type or "").lower()
    cop_type = (cop_tanker_type or "").lower()
    cop_lvl = (cop_tanker_level or "").lower()
    flag = flag_endorsements or []
    special = special_endorsements or []

    # 1. CoC / CoP
    if is_rating:
        if coc in ("amp", "foreign_endorsed"):
            combined.add("Flag State CoP")
        if coc == "foreign_endorsed":
            combined.add("Endorsement of Recognition")
    else:
        if coc == "foreign_endorsed":
            combined.add("Endorsement of Recognition")

    # 2. Tanker CoP
    if cop_type in ("oil", "chemical"):
        combined.add("IMO 1.01 — Basic Training for Oil and Chemical Tanker Cargo Operations")
        if not is_rating and cop_lvl == "advanced":
            if cop_type == "oil":
                combined.add("IMO 1.02 — Advanced Training for Oil Tanker Cargo Operations")
            else:
                combined.add("IMO 1.03 — Advanced Training for Chemical Tanker Cargo Operations")
    elif cop_type == "gas":
        combined.add("IMO 1.04 — Basic Training for Liquefied Gas Tanker Cargo Operations")
        if not is_rating and cop_lvl == "advanced":
            combined.add("IMO 1.05 — Advanced Training for Liquefied Gas Tanker Cargo Operations")

    # 3. Flag endorsements
    if flag:
        combined.add("Endorsement of Recognition")

    # 4. Special endorsements
    for se in special:
        sl = (se or "").lower()
        if "offshore" in sl or "mou" in sl:
            combined.add("BOSIET — Offshore Safety")
            combined.add("HUET — Helicopter Escape")
        # Polar Code (MSC.416(97), STCW Reg. V/4 — see POLAR_V4_ESPECIFICACION.md).
        # Not a vessel_type_id like the tanker family below: polar waters is a
        # trade area, not a hull/cargo type — any vessel_type_id could sail
        # there or not. special_endorsements (free-text, seafarer profile) is
        # the engine's only conditioning axis that fits, same category as the
        # offshore/MOU check above it. Reg. V/4.1 (basic, IMO 7.11) covers
        # master, chief mate, and officers in charge of a navigational watch
        # (2nd/3rd officer); Reg. V/4.3 (advanced, IMO 7.12) covers only
        # master and chief mate. Ratings and engine ranks are NOT covered by
        # V/4 at all — do not add either title for them.
        if "polar" in sl:
            if norm_rank in ("master", "chief-officer", "2nd-officer", "3rd-officer"):
                combined.add("IMO 7.11 — Basic Training for Ships Operating in Polar Waters")
            if norm_rank in ("master", "chief-officer"):
                combined.add("IMO 7.12 — Advanced Training for Ships Operating in Polar Waters")

    # 5. Vessel-type extras (filter advanced tanker for ratings)
    for title in _vessel_extra_docs(vessel_type_ids or []):
        if is_rating and title in _ADVANCED_TANKER:
            continue
        combined.add(title)

    # Preserve RANK_REQUIRED_DOCS order, then append extras in stable order
    base_order = RANK_REQUIRED_DOCS.get(norm_rank or "", [])
    ordered = list(dict.fromkeys(base_order))  # deduplicate, preserve order
    for title in sorted(combined - set(ordered)):
        ordered.append(title)
    return ordered


# ── Regulatory metadata per title — unified engine ───────────────────────────
# Every title required_docs_for_profile() can return needs an entry here so
# compliance_engine.py's expiry/state machine (VALID/EXPIRING/CRITICAL/EXPIRED/
# MISSING, and the can_be_listed hard-block on level="critical") has something
# to run against. Two provenances, marked per row:
#
#   heredado  — carried over verbatim from the pre-unification STCW catalog
#               (compliance_engine.RANK_CATALOG's _bst()/_medical()/etc.),
#               where this title is that item's direct IMO-vocabulary
#               equivalent. High confidence — Rick already approved these
#               numbers under the old system.
#   default   — this title had no analogue in the old STCW catalog (most of
#               the specific numbered IMO model courses). Given a
#               level=HIGH (not "critical") default so unifying the two
#               engines does not silently start hard-blocking seafarers who
#               weren't blocked before. validity_years=5 unless the title is
#               clearly a one-time course (no periodic refresher under STCW)
#               or an identity/medical document with no fixed cert cycle.
#               NEEDS RICK'S REVIEW — flagged explicitly in Handover.md, not
#               a claim of regulatory authority.
#
# level: "critical" | "high" | "standard"  — mirrors compliance_engine.DocLevel
# cert_type: "C/R" | "D/P" | "T/O" | "E/R" — mirrors compliance_engine.DocCertType
DOC_METADATA: dict[str, dict] = {
    # ── heredado — direct equivalents of the old RANK_CATALOG items ─────────
    "Flag State CoC":                                                         {"level": "critical", "cert_type": "C/R", "validity_years": 5, "source": "heredado:_coc_officer"},
    "Endorsement of Recognition":                                             {"level": "critical", "cert_type": "E/R", "validity_years": 5, "source": "heredado:_flag_endorse"},
    "Flag State CoP":                                                         {"level": "critical", "cert_type": "C/R", "validity_years": 5, "source": "heredado:_coc_amp (rating CoP)"},
    "Flag State Medical Certificate":                                         {"level": "critical", "cert_type": "C/R", "validity_years": 2, "source": "heredado:_medical"},
    "IMO 1.25 — General Operator's Certificate for GMDSS":                    {"level": "critical", "cert_type": "C/R", "validity_years": 5, "source": "heredado:_gmdss_goc"},
    "IMO 2.03 — Advanced Training in Fire Fighting":                          {"level": "critical", "cert_type": "D/P", "validity_years": 5, "source": "heredado:_aff"},
    "IMO 1.19 — Proficiency in Personal Survival Techniques":                 {"level": "critical", "cert_type": "D/P", "validity_years": 5, "source": "heredado:_bst (bundle)"},
    "IMO 1.20 — Fire Prevention and Fire Fighting":                           {"level": "critical", "cert_type": "D/P", "validity_years": 5, "source": "heredado:_bst (bundle)"},
    "IMO 1.21 — Personal Safety and Social Responsibilities":                 {"level": "critical", "cert_type": "D/P", "validity_years": 5, "source": "heredado:_bst (bundle)"},
    "IMO 1.23 — Proficiency in Survival Craft and Rescue Boats (excl. Fast Rescue Boats)": {"level": "high", "cert_type": "D/P", "validity_years": 5, "source": "heredado:_scrb/_psc_scrb"},
    "IMO 1.14 — Medical First Aid":                                           {"level": "high", "cert_type": "D/P", "validity_years": None, "source": "heredado:_mfa"},
    "IMO 1.07 — Radar Navigation at Operational Level":                       {"level": "high", "cert_type": "D/P", "validity_years": None, "source": "heredado:_arpa"},
    "IMO 1.27 — Operational Use of ECDIS":                                    {"level": "high", "cert_type": "D/P", "validity_years": None, "source": "heredado:_ecdis"},

    # ── heredado — tanker/offshore families (validity from _coc_officer's family) ─
    "IMO 1.01 — Basic Training for Oil and Chemical Tanker Cargo Operations": {"level": "critical", "cert_type": "D/P", "validity_years": 5, "source": "heredado:tanker basic — required to serve on that vessel type"},
    "IMO 1.04 — Basic Training for Liquefied Gas Tanker Cargo Operations":    {"level": "critical", "cert_type": "D/P", "validity_years": 5, "source": "heredado:tanker basic — required to serve on that vessel type"},
    "IMO 1.02 — Advanced Training for Oil Tanker Cargo Operations":          {"level": "high", "cert_type": "D/P", "validity_years": 5, "source": "default — advanced tier of a critical basic, kept high pending review"},
    "IMO 1.03 — Advanced Training for Chemical Tanker Cargo Operations":     {"level": "high", "cert_type": "D/P", "validity_years": 5, "source": "default — advanced tier of a critical basic, kept high pending review"},
    "IMO 1.05 — Advanced Training for Liquefied Gas Tanker Cargo Operations": {"level": "high", "cert_type": "D/P", "validity_years": 5, "source": "default — advanced tier of a critical basic, kept high pending review"},
    "BOSIET — Offshore Safety":                                               {"level": "critical", "cert_type": "D/P", "validity_years": 4, "source": "heredado:_bosiet"},
    "HUET — Helicopter Escape":                                               {"level": "high", "cert_type": "D/P", "validity_years": 4, "source": "heredado:_huet"},

    # ── default — no analogue in the old catalog; NEEDS RICK'S REVIEW ───────
    "IMO 1.08 — Radar Navigation at Management Level (Radar, ARPA, Bridge Teamwork & SAR)": {"level": "high", "cert_type": "D/P", "validity_years": None, "source": "default — same family as 1.07, no old analogue"},
    "IMO 1.15 — Medical Care":                                                {"level": "high", "cert_type": "D/P", "validity_years": None, "source": "default — management-level counterpart of MFA, no old analogue"},
    "IMO 1.22 — Bridge Resource Management (BRM)":                            {"level": "high", "cert_type": "D/P", "validity_years": 5, "source": "default — no old analogue"},
    "IMO 1.29 — Proficiency in Crisis Management and Human Behavior Training": {"level": "high", "cert_type": "D/P", "validity_years": 5, "source": "default — no old analogue"},
    "IMO 1.39 — Leadership & Teamwork":                                       {"level": "high", "cert_type": "D/P", "validity_years": None, "source": "default — one-time under STCW, no old analogue"},
    "IMO 1.40 — Use of Leadership and Managerial Skills":                     {"level": "high", "cert_type": "D/P", "validity_years": None, "source": "default — one-time under STCW, no old analogue"},
    "IMO 1.41 — Passenger Ship Crowd Management Training":                    {"level": "high", "cert_type": "D/P", "validity_years": 5, "source": "default — no old analogue"},
    "IMO 1.42 — Passenger Ship Crisis Management & Human Behavior Training":  {"level": "high", "cert_type": "D/P", "validity_years": 5, "source": "default — no old analogue"},
    "IMO 1.46 — Passenger Safety, Cargo Safety and Hull Integrity Training":  {"level": "high", "cert_type": "D/P", "validity_years": 5, "source": "default — no old analogue"},
    "IMO 3.19 — Ship Security Officer (SSO)":                                 {"level": "high", "cert_type": "D/P", "validity_years": 5, "source": "default — no old analogue"},
    "IMO 3.26 — Security Training for Seafarers with Designated Security Duties": {"level": "high", "cert_type": "D/P", "validity_years": None, "source": "default — one-time under STCW, no old analogue"},
    "IMO 3.27 — Security Awareness Training for All Seafarers":               {"level": "standard", "cert_type": "D/P", "validity_years": None, "source": "default — one-time, universal, lowest stakes"},
    "IMO 7.01 — Master and Chief Mate":                                       {"level": "high", "cert_type": "D/P", "validity_years": 5, "source": "default — functionally tied to Flag State CoC, no old analogue as a separate item"},
    "IMO 7.02 — Chief Engineer Officer & Second Engineer Officer":            {"level": "high", "cert_type": "D/P", "validity_years": 5, "source": "default — see IMO 7.01"},
    "IMO 7.03 — Officer in Charge of a Navigational Watch (OOW)":             {"level": "high", "cert_type": "D/P", "validity_years": 5, "source": "default — see IMO 7.01"},
    "IMO 7.08 — Electro-Technical Officer (ETO)":                             {"level": "high", "cert_type": "D/P", "validity_years": 5, "source": "default — see IMO 7.01"},
    "IMO 7.10 — Ratings as Able Seafarer Deck":                               {"level": "high", "cert_type": "D/P", "validity_years": 5, "source": "default — see IMO 7.01"},
    "IMO 7.11 — Basic Training for Ships Operating in Polar Waters":          {"level": "critical", "cert_type": "D/P", "validity_years": 5, "source": "stcw_amendment_2016: MSC.416(97) Reg. V/4.1 + Reg. I/11.4 (intervalos no superiores a 5 anos)"},
    "IMO 7.12 — Advanced Training for Ships Operating in Polar Waters":       {"level": "critical", "cert_type": "D/P", "validity_years": 5, "source": "stcw_amendment_2016: MSC.416(97) Reg. V/4.3 + Reg. I/11.4 (intervalos no superiores a 5 anos)"},
    "IMO 7.17 — Engine-Room Resource Management (ERM)":                       {"level": "high", "cert_type": "D/P", "validity_years": 5, "source": "default — no old analogue"},
    "High Voltage Operations":                                                {"level": "high", "cert_type": "D/P", "validity_years": 5, "source": "default — no old analogue"},

    # ── default — identity / medical-adjacent paperwork, not STCW certs ─────
    "Seaman's Book (Main Page)":            {"level": "standard", "cert_type": "D/P", "validity_years": None, "source": "default — identity document, no cert cycle"},
    "National ID Card":                     {"level": "standard", "cert_type": "D/P", "validity_years": None, "source": "default — identity document, no cert cycle"},
    "Passport":                             {"level": "standard", "cert_type": "D/P", "validity_years": None, "source": "default — identity document, no cert cycle"},
    "Seaman Identity Document (SID)":       {"level": "standard", "cert_type": "D/P", "validity_years": None, "source": "default — identity document, no cert cycle"},
    "Drug & Alcohol Test":                  {"level": "standard", "cert_type": "D/P", "validity_years": 1, "source": "default — guessed annual cycle, needs review"},
    "Eyesight Test Certificate":            {"level": "standard", "cert_type": "D/P", "validity_years": 2, "source": "default — tied to medical cert cycle, guessed"},

    # ── heredado:RANK_CATALOG — offshore/fishing/yacht/national coverage mapping,
    # 2026-09-14. Every level/cert_type/validity_years below is copied verbatim
    # from compliance_engine.RANK_CATALOG's existing entry for the rank that uses
    # it — already Rick-approved content under the old system, not a new guess.
    # See RANK_REQUIRED_DOCS above (same file) for the per-rank composition and
    # the rationale for keeping each fleet category's CoC-equivalent as its own
    # distinct title instead of collapsing into "Flag State CoC".
    "Certificado de OIM — MODU": {"level": "critical", "cert_type": "C/R", "validity_years": 5, "source": "heredado:RANK_CATALOG"},
    "Certificado de OIM — MOU Flotante": {"level": "critical", "cert_type": "C/R", "validity_years": 5, "source": "heredado:RANK_CATALOG"},
    "Certificado de OIM — Unidad Fija": {"level": "critical", "cert_type": "C/R", "validity_years": 5, "source": "heredado:RANK_CATALOG"},
    "Certificado de Observador de Pesca (ARAP / AMP)": {"level": "critical", "cert_type": "C/R", "validity_years": 3, "source": "heredado:RANK_CATALOG"},
    "Certificado de Operador de Lastre (Ballast Control)": {"level": "critical", "cert_type": "C/R", "validity_years": 5, "source": "heredado:RANK_CATALOG"},
    "Certificado de Perforador (Driller)": {"level": "critical", "cert_type": "C/R", "validity_years": 5, "source": "heredado:RANK_CATALOG"},
    "Certificado de Supervisor de Barcaza": {"level": "critical", "cert_type": "C/R", "validity_years": 5, "source": "heredado:RANK_CATALOG"},
    "Certificado de Supervisor de Mantenimiento Offshore": {"level": "critical", "cert_type": "C/R", "validity_years": 5, "source": "heredado:RANK_CATALOG"},
    "Certificado de Toolpusher / Jefe de Perforación": {"level": "critical", "cert_type": "C/R", "validity_years": 5, "source": "heredado:RANK_CATALOG"},
    "Certificado de Técnico Marino — Fija": {"level": "critical", "cert_type": "C/R", "validity_years": 5, "source": "heredado:RANK_CATALOG"},
    "Certificado de Técnico Marino — Flotante": {"level": "critical", "cert_type": "C/R", "validity_years": 5, "source": "heredado:RANK_CATALOG"},
    "Certificado de Técnico Pesquero (AMP §20)": {"level": "critical", "cert_type": "C/R", "validity_years": 5, "source": "heredado:RANK_CATALOG"},
    "Certificate of Competence — Able Seafarer Engine (ASE)": {"level": "critical", "cert_type": "C/R", "validity_years": None, "source": "heredado:RANK_CATALOG"},
    "Certificate of Competence — Oiler/Motorman": {"level": "critical", "cert_type": "C/R", "validity_years": None, "source": "heredado:RANK_CATALOG"},
    "CoC Capitán de Yate hasta 200 GT (AMP §19)": {"level": "critical", "cert_type": "C/R", "validity_years": 5, "source": "heredado:RANK_CATALOG"},
    "CoC Capitán de Yate hasta 500 GT (AMP §19)": {"level": "critical", "cert_type": "C/R", "validity_years": 5, "source": "heredado:RANK_CATALOG"},
    "CoC Capitán de Yate — Sin límite GT (AMP §19)": {"level": "critical", "cert_type": "C/R", "validity_years": 5, "source": "heredado:RANK_CATALOG"},
    "CoC Embarcación de Placer 1ª Clase (AMP §21)": {"level": "critical", "cert_type": "C/R", "validity_years": 5, "source": "heredado:RANK_CATALOG"},
    "CoC Embarcación de Placer 2ª Clase (AMP §21)": {"level": "critical", "cert_type": "C/R", "validity_years": 5, "source": "heredado:RANK_CATALOG"},
    "CoC Embarcación de Placer 3ª Clase (AMP §21)": {"level": "critical", "cert_type": "C/R", "validity_years": 5, "source": "heredado:RANK_CATALOG"},
    "CoC Jefe de Máquinas Yate hasta 750 kW (AMP §19)": {"level": "critical", "cert_type": "C/R", "validity_years": 5, "source": "heredado:RANK_CATALOG"},
    "CoC Jefe de Máquinas — Buque Pesquero (AMP §20)": {"level": "critical", "cert_type": "C/R", "validity_years": 5, "source": "heredado:RANK_CATALOG"},
    "CoC Jefe de Máquinas — Yate (AMP §19)": {"level": "critical", "cert_type": "C/R", "validity_years": 5, "source": "heredado:RANK_CATALOG"},
    "CoC Maquinista Naval — Aguas Nacionales (AMP §21)": {"level": "critical", "cert_type": "C/R", "validity_years": 5, "source": "heredado:RANK_CATALOG"},
    "CoC Oficial de Cubierta — Buque Pesquero (AMP §20)": {"level": "critical", "cert_type": "C/R", "validity_years": 5, "source": "heredado:RANK_CATALOG"},
    "CoC Oficial de Cubierta — Yate (AMP §19)": {"level": "critical", "cert_type": "C/R", "validity_years": 5, "source": "heredado:RANK_CATALOG"},
    "CoC Oficial de Máquinas — Buque Pesquero (AMP §20)": {"level": "critical", "cert_type": "C/R", "validity_years": 5, "source": "heredado:RANK_CATALOG"},
    "CoC Oficial de Máquinas — Yate (AMP §19)": {"level": "critical", "cert_type": "C/R", "validity_years": 5, "source": "heredado:RANK_CATALOG"},
    "CoC Patrón Pesca Nacional 1ª Clase (AMP §21)": {"level": "critical", "cert_type": "C/R", "validity_years": 5, "source": "heredado:RANK_CATALOG"},
    "CoC Patrón Pesca Nacional 2ª Clase (AMP §21)": {"level": "critical", "cert_type": "C/R", "validity_years": 5, "source": "heredado:RANK_CATALOG"},
    "CoC Patrón de Lancha 1ª Clase (AMP §21)": {"level": "critical", "cert_type": "C/R", "validity_years": 5, "source": "heredado:RANK_CATALOG"},
    "CoC Patrón de Lancha 2ª Clase (AMP §21)": {"level": "critical", "cert_type": "C/R", "validity_years": 5, "source": "heredado:RANK_CATALOG"},
    "CoC Patrón de Pesca Mayor (AMP §20)": {"level": "critical", "cert_type": "C/R", "validity_years": 5, "source": "heredado:RANK_CATALOG"},
    "CoC Patrón de Remolcador — Aguas Nacionales (AMP §21)": {"level": "critical", "cert_type": "C/R", "validity_years": 5, "source": "heredado:RANK_CATALOG"},
    "CoC Patrón hasta 100 GT — Aguas Nacionales (AMP §21)": {"level": "critical", "cert_type": "C/R", "validity_years": 5, "source": "heredado:RANK_CATALOG"},
    "CoC Patrón hasta 500 GT — Aguas Nacionales (AMP §21)": {"level": "critical", "cert_type": "C/R", "validity_years": 5, "source": "heredado:RANK_CATALOG"},
    "CoC Técnico Naval — Aguas Nacionales (AMP §21)": {"level": "critical", "cert_type": "C/R", "validity_years": 5, "source": "heredado:RANK_CATALOG"},
    "First Aid / Primeros Auxilios Básicos": {"level": "high", "cert_type": "D/P", "validity_years": 3, "source": "heredado:RANK_CATALOG"},
    "H2S Awareness / Hydrogen Sulfide Safety": {"level": "high", "cert_type": "D/P", "validity_years": None, "source": "Rick, 2026-09-14 (Handover nota 39): cursos especiales que no son de la OMI no llevan validity_years fijo — no hay norma que lo establezca, la vigencia la asigna el usuario a mano desde la fecha del documento."},
    "IADC WellSharp / Rig Pass — Drilling Operations": {"level": "critical", "cert_type": "D/P", "validity_years": 2, "source": "heredado:RANK_CATALOG"},
    "Libreta de Marinero Nacional (AMP)": {"level": "critical", "cert_type": "C/R", "validity_years": None, "source": "heredado:RANK_CATALOG"},
    "Sea Practice Form / Training Record Book (Cubierta)": {"level": "high", "cert_type": "D/P", "validity_years": None, "source": "heredado:RANK_CATALOG"},
    "Seguridad Básica para Buques Pesqueros (SOLAS/Torremolinos)": {"level": "critical", "cert_type": "D/P", "validity_years": 5, "source": "heredado:RANK_CATALOG"},
    "Short Range Certificate — GMDSS (SRC/ROC)": {"level": "high", "cert_type": "C/R", "validity_years": 5, "source": "heredado:RANK_CATALOG"},
    "Training Record Book (Máquinas)": {"level": "high", "cert_type": "D/P", "validity_years": None, "source": "heredado:RANK_CATALOG"},

    # ── T/O — Training Onboard, 2026-09-14 (nota (26) de Rick) ──────────────
    # Ship-specific familiarisation done ON BOARD, not a file that expires —
    # excluded from required_docs_for_profile()'s output on purpose (not in
    # RANK_REQUIRED_DOCS), so these never enter total_required/is_fully_compliant.
    # A past ship's familiarisation doesn't qualify a seafarer for the next one.
    # compliance_engine._count_to_docs() counts real uploads of these three by
    # doc_key instead of the old hardcoded _TO_COUNT=3. Names heredado verbatim
    # from the BSF/SSF/SECF constants that lived in RegisterModal.tsx's
    # MERCHANT_DOCS before it was retired (2026-09-14, contrato nota (24)).
    "Basic Safety Familiarisation (al embarcar)": {"level": "standard", "cert_type": "T/O", "validity_years": None, "source": "heredado:RegisterModal.tsx BSF"},
    "Ship-Specific Familiarisation (al embarcar)": {"level": "standard", "cert_type": "T/O", "validity_years": None, "source": "heredado:RegisterModal.tsx SSF"},
    "Security Familiarisation / ISPS (al embarcar)": {"level": "standard", "cert_type": "T/O", "validity_years": None, "source": "heredado:RegisterModal.tsx SECF"},
}

# Exported for compliance_engine._count_to_docs() — the three T/O titles above,
# kept as their own tuple so the "which titles are T/O" question has one
# answer instead of being re-derived by filtering DOC_METADATA by cert_type
# (which would also catch any future T/O title added by someone who didn't
# know this constant exists).
TO_TITLES: tuple[str, ...] = (
    "Basic Safety Familiarisation (al embarcar)",
    "Ship-Specific Familiarisation (al embarcar)",
    "Security Familiarisation / ISPS (al embarcar)",
)
