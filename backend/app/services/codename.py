"""
Code-name service — Obj.2 of the Digital Dossier sprint.

Generates the standardised document file-name:
  [Rank]_[RegCode]_[IssuingCountry]_[UserCode]_exp[YYYYMMDD]

Example: Master_II-2_PA_CS-PA-0042_exp20300315
"""

import re
from datetime import date
from typing import Optional

# ── Rank → display tag (PascalCase, no spaces) ───────────────────────────────
RANK_DISPLAY_MAP: dict[str, str] = {
    "master": "Master", "captain": "Master", "capitan": "Master",
    "chief_officer": "ChiefOfficer", "chief-officer": "ChiefOfficer",
    "chief officer": "ChiefOfficer", "1st_officer": "ChiefOfficer",
    "chief mate": "ChiefOfficer", "chief-mate": "ChiefOfficer",
    "2nd_officer": "2ndOfficer", "2nd-officer": "2ndOfficer",
    "2nd officer": "2ndOfficer", "2nd-mate": "2ndOfficer",
    "3rd_officer": "3rdOfficer", "3rd-officer": "3rdOfficer",
    "3rd officer": "3rdOfficer", "3rd-mate": "3rdOfficer",
    "chief_engineer": "ChiefEngineer", "chief-engineer": "ChiefEngineer",
    "chief engineer": "ChiefEngineer",
    "2nd_engineer": "2ndEngineer", "2nd-engineer": "2ndEngineer",
    "2nd engineer": "2ndEngineer",
    "3rd_engineer": "3rdEngineer", "4th_engineer": "4thEngineer",
    "eto": "ETO", "electrician": "ETO",
    "electro-technical officer": "ETO", "electro_technical_officer": "ETO",
    "bosun": "Bosun", "boatswain": "Bosun",
    "able_seaman": "AB", "able seaman": "AB", "ab": "AB",
    "ordinary_seaman": "OS", "ordinary seaman": "OS", "os": "OS",
    "cook": "Cook", "cook / steward": "Cook",
    "chief_steward": "Steward", "steward": "Steward",
}

# ── doc_key → stable slot RegCode (for docs without an STCW cert_code) ───────
DOC_REGCODE_MAP: dict[str, str] = {
    # Main Docs
    "seamans_book": "SBM",
    "national_id": "ID-NI",
    "passport": "ID-PP",
    "sid": "DOC-SID",
    "discharge_book": "DBR",
    # CoC / CoP
    "coc": "CoC",
    "cop": "CoP",
    "endorsement": "STCW-I2",
    # Health
    "medical": "MED-FIT",
    "drug_test": "MED-DT",
    "eyesight": "MED-EYE",
    # Job Letters
    "letter_of_employment": "JOB-LOE",
    "reference_letter": "JOB-REF",
    "sea_service_letter": "JOB-SSL",
    # Special
    "high_voltage": "CERT-HV",
    "huet": "CERT-HUET",
    "bosiet": "CERT-BOSIET",
}


def _safe_fs(s: str) -> str:
    """Return a filesystem-safe slug (no spaces, no unsafe chars)."""
    s = s.strip().replace(' ', '').replace('/', '-').replace('\\', '-')
    return re.sub(r'[^\w\-.]', '', s) or "DOC"


def _derive_regcode_from_name(name: str) -> str:
    """Infer a RegCode from the document display name when cert_code is absent."""
    if not name:
        return "DOC"
    # "IMO 1.19 — Proficiency in ..." → "IMO-1.19"
    m = re.match(r'(?i)IMO\s+([\d.]+)', name)
    if m:
        return f"IMO-{m.group(1)}"
    if re.search(r'\bCoC\b', name):
        return "CoC"
    if re.search(r'\bCoP\b', name):
        return "CoP"
    if re.search(r'endorsement', name, re.IGNORECASE):
        return "STCW-I2"
    if re.search(r"seaman'?s book", name, re.IGNORECASE):
        return "SBM"
    if re.search(r'discharge book', name, re.IGNORECASE):
        return "DBR"
    if re.search(r'DP\s*Lic', name, re.IGNORECASE):
        return "DPL"
    if re.search(r'\bpassport\b', name, re.IGNORECASE):
        return "ID-PP"
    if re.search(r'\bmedical\b', name, re.IGNORECASE):
        return "MED-FIT"
    if re.search(r'BOSIET', name):
        return "CERT-BOSIET"
    if re.search(r'HUET', name):
        return "CERT-HUET"
    # Fallback: first 12 chars, fs-safe
    return _safe_fs(name[:12].title().replace(' ', ''))


def build_codename(
    *,
    doc_name: str,
    doc_key: Optional[str] = None,
    cert_code: Optional[str] = None,
    issuing_country: Optional[str] = None,
    expiry_date=None,       # date | str | None
    rank: Optional[str] = None,
    seafarer_code: Optional[str] = None,
) -> str:
    """
    Build the standardised code-name for a document file.

    Format: [RankTag]_[RegCode]_[Country]_[UserCode]_exp[YYYYMMDD]

    Example: Master_II-2_PA_CS-PA-0042_exp20300315
    """
    # 1. Rank tag
    rank_key = (rank or "").lower().strip()
    rank_tag = RANK_DISPLAY_MAP.get(rank_key, _safe_fs(rank_key.capitalize()) if rank_key else "UNK")

    # 2. RegCode — priority: cert_code → doc_key map → name derivation
    if cert_code:
        reg_code = _safe_fs(cert_code)
    elif doc_key and doc_key in DOC_REGCODE_MAP:
        reg_code = DOC_REGCODE_MAP[doc_key]
    else:
        reg_code = _derive_regcode_from_name(doc_name)

    # 3. Issuing country (ISO-2 alpha)
    country = ((issuing_country or "XX").strip().upper())[:2]

    # 4. User code
    user_code = seafarer_code or "CS-XX-0000"

    # 5. Expiry
    if expiry_date:
        if isinstance(expiry_date, str):
            try:
                from datetime import date as _date
                parts = expiry_date.split("-")
                expiry_date = _date(int(parts[0]), int(parts[1]), int(parts[2]))
            except Exception:
                expiry_date = None
        if expiry_date:
            exp = f"exp{expiry_date.strftime('%Y%m%d')}"
        else:
            exp = "expNA"
    else:
        exp = "expNA"

    return f"{rank_tag}_{reg_code}_{country}_{user_code}_{exp}"


def safe_folder_name(first: Optional[str], last: Optional[str], rank: Optional[str]) -> str:
    """Build a filesystem-safe dossier root folder name for the seafarer."""
    rank_tag = RANK_DISPLAY_MAP.get((rank or "").lower(), _safe_fs(rank or "Crew"))
    name_part = f"{_safe_fs(first or '')}_{_safe_fs(last or '')}".strip("_") or "Seafarer"
    return f"{rank_tag}_{name_part}"
