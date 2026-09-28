from pydantic import BaseModel
from typing import Optional, List


class SeafarerAmpUpdate(BaseModel):
    coc_type: Optional[str] = None
    coc_issuing_country: Optional[str] = None
    coc_tonnage_limit: Optional[str] = None
    cop_tanker_type: Optional[str] = None
    cop_tanker_level: Optional[str] = None
    flag_endorsements: Optional[List[str]] = None
    special_endorsements: Optional[List[str]] = None


class SeafarerAmpResponse(BaseModel):
    id: str
    rank: Optional[str]
    fleet_category: Optional[str]
    coc_type: Optional[str]
    coc_issuing_country: Optional[str]
    coc_tonnage_limit: Optional[str]
    cop_tanker_type: Optional[str]
    cop_tanker_level: Optional[str]
    flag_endorsements: Optional[List[str]]
    special_endorsements: Optional[List[str]]

    class Config:
        from_attributes = True


# ── General profile update (single facade — replaces amp-profile + settings) ──
class SeafarerProfileUpdate(BaseModel):
    # Basic identity
    first_name:        Optional[str] = None
    last_name:         Optional[str] = None
    gender:            Optional[str] = None
    nationality:       Optional[str] = None
    nationalities:     Optional[List[str]] = None  # ISO2 codes, max 3
    date_of_birth:     Optional[str] = None         # ISO date "YYYY-MM-DD"
    phone:             Optional[str] = None
    bio:               Optional[str] = None
    is_available:      Optional[bool] = None
    # Professional
    rank:              Optional[str] = None
    department:        Optional[str] = None
    fleet_category:    Optional[str] = None
    years_experience:  Optional[int] = None
    vessel_types:      Optional[List[str]] = None
    spoken_languages:  Optional[List[str]] = None
    # Residence
    city:              Optional[str] = None
    residence_country: Optional[str] = None
    residence_province: Optional[str] = None
    reference_airport: Optional[str] = None
    # Emergency contact
    emergency_contact_name:     Optional[str] = None
    emergency_contact_relation: Optional[str] = None
    emergency_contact_phone:    Optional[str] = None
    # AMP Panamá (merged into facade so one PATCH covers everything)
    coc_type:            Optional[str] = None
    coc_issuing_country: Optional[str] = None
    coc_tonnage_limit:   Optional[str] = None
    cop_tanker_type:     Optional[str] = None
    cop_tanker_level:    Optional[str] = None
    flag_endorsements:   Optional[List[str]] = None
    special_endorsements: Optional[List[str]] = None
    # Discovery opt-out (PATCH-02, 2026-09-14). Sin esta linea Pydantic v2 usa
    # extra='ignore' y descarta el campo en silencio: el PATCH del toggle
    # devolvia 200 OK y no persistia nada. Columna creada en 0007.
    discoverable:        Optional[bool] = None


# ── Badge progress ────────────────────────────────────────────────────────────
class BadgeProgressUpsert(BaseModel):
    series_id:               str
    status:                  str   # "enrolled" | "in_progress" | "completed"
    progress_pct:            Optional[int] = 0
    last_watched_episode_id: Optional[str] = None


class BadgeProgressResponse(BaseModel):
    series_id:    str
    badge_id:     str
    title:        str
    thumbnail:    Optional[str] = None
    status:       str
    progress_pct: int
    completed_at: Optional[str] = None  # ISO datetime string
