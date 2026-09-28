import uuid
import urllib.request
import json as _json
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user, require_admin
from app.models.user import User

router = APIRouter()


# ─── Helpers ────────────────────────────────────────────────────────────────

def _now():
    return datetime.now(timezone.utc)


def _oembed(youtube_url: str) -> dict:
    """Fetch YouTube oEmbed data (thumbnail + title + duration placeholder)."""
    try:
        api = f"https://www.youtube.com/oembed?url={urllib.request.quote(youtube_url)}&format=json"
        with urllib.request.urlopen(api, timeout=5) as r:
            data = _json.loads(r.read())
        return {
            "thumbnail": data.get("thumbnail_url"),
            "title": data.get("title"),
        }
    except Exception:
        return {"thumbnail": None, "title": None}


# ─── Public: list all published series (filterable by category + rank) ───────

@router.get("/learning/series")
def list_series_public(
    category: Optional[str] = Query(None),
    rank:     Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    filters = "is_published = TRUE"
    params: dict = {}
    if category and category != "all":
        filters += " AND industry_category = :cat"
        params["cat"] = category
    if rank and rank != "all":
        filters += " AND rank_level = :rank"
        params["rank"] = rank
    rows = db.execute(text(f"""
        SELECT id, badge_id, title, description, card_thumbnail,
               industry_category, rank_level
        FROM learning_series WHERE {filters} ORDER BY created_at ASC
    """), params).fetchall()
    return [
        {"id": r.id, "badge_id": r.badge_id, "title": r.title,
         "description": r.description, "card_thumbnail": r.card_thumbnail,
         "industry_category": r.industry_category, "rank_level": r.rank_level}
        for r in rows
    ]


# ─── Public: read series by badge_id (used by crewing SPA) ──────────────────

@router.get("/learning/series/{badge_id}")
def get_series_public(badge_id: str, db: Session = Depends(get_db)):
    row = db.execute(text("""
        SELECT id, badge_id, title, description, background_image, card_thumbnail, is_published
        FROM learning_series WHERE badge_id = :bid AND is_published = TRUE
    """), {"bid": badge_id}).fetchone()
    if not row:
        return {"found": False, "badge_id": badge_id}

    seasons = db.execute(text("""
        SELECT id, title, "order" FROM learning_seasons
        WHERE series_id = :sid ORDER BY "order" ASC
    """), {"sid": row.id}).fetchall()

    result_seasons = []
    for s in seasons:
        episodes = db.execute(text("""
            SELECT id, title, youtube_url, youtube_thumbnail, duration_seconds, "order"
            FROM learning_episodes WHERE season_id = :sid ORDER BY "order" ASC
        """), {"sid": s.id}).fetchall()
        result_seasons.append({
            "id": s.id, "title": s.title, "order": s.order,
            "episodes": [
                {"id": e.id, "title": e.title, "youtube_url": e.youtube_url,
                 "thumbnail": e.youtube_thumbnail, "duration_seconds": e.duration_seconds,
                 "order": e.order}
                for e in episodes
            ],
        })

    return {
        "found": True,
        "id": row.id, "badge_id": row.badge_id, "title": row.title,
        "description": row.description, "background_image": row.background_image,
        "card_thumbnail": row.card_thumbnail,
        "seasons": result_seasons,
    }


# ─── Admin: YouTube oEmbed proxy ─────────────────────────────────────────────

@router.get("/admin/learning/oembed")
def oembed_proxy(
    url: str = Query(...),
    admin: User = Depends(require_admin),
):
    data = _oembed(url)
    return data


# ─── Admin: series CRUD ──────────────────────────────────────────────────────

@router.get("/admin/learning/series")
def list_series(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT s.id, s.badge_id, s.title, s.description, s.card_thumbnail,
               s.is_published, s.created_at,
               s.industry_category, s.rank_level,
               COUNT(DISTINCT sn.id) AS season_count,
               COUNT(DISTINCT e.id)  AS episode_count
        FROM learning_series s
        LEFT JOIN learning_seasons sn ON sn.series_id = s.id
        LEFT JOIN learning_episodes e ON e.season_id = sn.id
        GROUP BY s.id ORDER BY s.created_at DESC
    """)).fetchall()
    return [
        {
            "id": r.id, "badge_id": r.badge_id, "title": r.title,
            "description": r.description, "card_thumbnail": r.card_thumbnail,
            "is_published": r.is_published,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "industry_category": r.industry_category, "rank_level": r.rank_level,
            "season_count": r.season_count, "episode_count": r.episode_count,
        }
        for r in rows
    ]


class SeriesCreate(BaseModel):
    badge_id: str
    title: str
    description: Optional[str] = None
    background_image: Optional[str] = None
    card_thumbnail: Optional[str] = None
    is_published: bool = False
    industry_category: str = "general"
    rank_level: str = "all"


@router.post("/admin/learning/series", status_code=201)
def create_series(
    payload: SeriesCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    new_id = str(uuid.uuid4())
    db.execute(text("""
        INSERT INTO learning_series
            (id, badge_id, title, description, background_image, card_thumbnail,
             is_published, industry_category, rank_level, created_at, updated_at)
        VALUES (:id, :bid, :title, :desc, :bg, :thumb, :pub, :cat, :rank, :now, :now)
    """), {
        "id": new_id, "bid": payload.badge_id, "title": payload.title,
        "desc": payload.description, "bg": payload.background_image,
        "thumb": payload.card_thumbnail, "pub": payload.is_published,
        "cat": payload.industry_category, "rank": payload.rank_level, "now": _now(),
    })
    db.commit()
    return {"id": new_id, "badge_id": payload.badge_id}


class SeriesPatch(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    background_image: Optional[str] = None
    card_thumbnail: Optional[str] = None
    is_published: Optional[bool] = None
    industry_category: Optional[str] = None
    rank_level: Optional[str] = None


@router.patch("/admin/learning/series/{series_id}")
def patch_series(
    series_id: str,
    payload: SeriesPatch,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")
    set_clause = ", ".join(f"{k} = :{k}" for k in updates)
    updates["id"] = series_id
    updates["now"] = _now()
    result = db.execute(
        text(f"UPDATE learning_series SET {set_clause}, updated_at = :now WHERE id = :id RETURNING id"),
        updates
    ).fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="Series not found")
    db.commit()
    return {"id": series_id}


@router.delete("/admin/learning/series/{series_id}", status_code=204)
def delete_series(
    series_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    result = db.execute(
        text("DELETE FROM learning_series WHERE id = :id RETURNING id"), {"id": series_id}
    ).fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="Series not found")
    db.commit()


# ─── Admin: get full series tree ─────────────────────────────────────────────

@router.get("/admin/learning/series/{series_id}")
def get_series_admin(
    series_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    row = db.execute(text("""
        SELECT id, badge_id, title, description, background_image, card_thumbnail,
               is_published, industry_category, rank_level
        FROM learning_series WHERE id = :id
    """), {"id": series_id}).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Series not found")

    seasons = db.execute(text("""
        SELECT id, title, "order" FROM learning_seasons
        WHERE series_id = :sid ORDER BY "order" ASC
    """), {"sid": series_id}).fetchall()

    result_seasons = []
    for s in seasons:
        episodes = db.execute(text("""
            SELECT id, title, youtube_url, youtube_thumbnail, duration_seconds, "order"
            FROM learning_episodes WHERE season_id = :sid ORDER BY "order" ASC
        """), {"sid": s.id}).fetchall()
        result_seasons.append({
            "id": s.id, "title": s.title, "order": s.order,
            "episodes": [
                {"id": e.id, "title": e.title, "youtube_url": e.youtube_url,
                 "thumbnail": e.youtube_thumbnail, "duration_seconds": e.duration_seconds,
                 "order": e.order}
                for e in episodes
            ],
        })

    return {
        "id": row.id, "badge_id": row.badge_id, "title": row.title,
        "description": row.description, "background_image": row.background_image,
        "card_thumbnail": row.card_thumbnail, "is_published": row.is_published,
        "industry_category": row.industry_category, "rank_level": row.rank_level,
        "seasons": result_seasons,
    }


# ─── Admin: season CRUD ──────────────────────────────────────────────────────

class SeasonCreate(BaseModel):
    series_id: str
    title: str
    order: int = 0


@router.post("/admin/learning/seasons", status_code=201)
def create_season(
    payload: SeasonCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    new_id = str(uuid.uuid4())
    db.execute(text("""
        INSERT INTO learning_seasons (id, series_id, title, "order", created_at)
        VALUES (:id, :sid, :title, :order, :now)
    """), {"id": new_id, "sid": payload.series_id, "title": payload.title,
          "order": payload.order, "now": _now()})
    db.commit()
    return {"id": new_id}


@router.patch("/admin/learning/seasons/{season_id}")
def patch_season(
    season_id: str,
    payload: dict,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    allowed = {"title", "order"}
    updates = {k: v for k, v in payload.items() if k in allowed and v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")
    set_clause = ", ".join(f'"{k}" = :{k}' for k in updates)
    updates["id"] = season_id
    result = db.execute(
        text(f"UPDATE learning_seasons SET {set_clause} WHERE id = :id RETURNING id"), updates
    ).fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="Season not found")
    db.commit()
    return {"id": season_id}


@router.delete("/admin/learning/seasons/{season_id}", status_code=204)
def delete_season(
    season_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    result = db.execute(
        text("DELETE FROM learning_seasons WHERE id = :id RETURNING id"), {"id": season_id}
    ).fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="Season not found")
    db.commit()


# ─── Admin: episode CRUD ─────────────────────────────────────────────────────

class EpisodeCreate(BaseModel):
    season_id: str
    title: str
    youtube_url: Optional[str] = None
    youtube_thumbnail: Optional[str] = None
    duration_seconds: Optional[int] = None
    order: int = 0


@router.post("/admin/learning/episodes", status_code=201)
def create_episode(
    payload: EpisodeCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    # Auto-fill thumbnail from oEmbed if not provided
    thumb = payload.youtube_thumbnail
    title = payload.title
    if payload.youtube_url and not thumb:
        oe = _oembed(payload.youtube_url)
        thumb = oe.get("thumbnail")
        if not title and oe.get("title"):
            title = oe["title"]

    new_id = str(uuid.uuid4())
    db.execute(text("""
        INSERT INTO learning_episodes
            (id, season_id, title, youtube_url, youtube_thumbnail, duration_seconds, "order", created_at)
        VALUES (:id, :sid, :title, :url, :thumb, :dur, :order, :now)
    """), {
        "id": new_id, "sid": payload.season_id, "title": title,
        "url": payload.youtube_url, "thumb": thumb,
        "dur": payload.duration_seconds, "order": payload.order, "now": _now(),
    })
    db.commit()
    return {"id": new_id, "title": title, "thumbnail": thumb}


class EpisodePatch(BaseModel):
    title: Optional[str] = None
    youtube_url: Optional[str] = None
    youtube_thumbnail: Optional[str] = None
    duration_seconds: Optional[int] = None
    order: Optional[int] = None


@router.patch("/admin/learning/episodes/{episode_id}")
def patch_episode(
    episode_id: str,
    payload: EpisodePatch,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    # Auto-fill thumbnail from oEmbed if URL changed but thumbnail not provided
    if "youtube_url" in updates and "youtube_thumbnail" not in updates:
        oe = _oembed(updates["youtube_url"])
        if oe.get("thumbnail"):
            updates["youtube_thumbnail"] = oe["thumbnail"]
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")
    col_map = {"order": '"order"'}
    set_clause = ", ".join(f'{col_map.get(k, k)} = :{k}' for k in updates)
    updates["id"] = episode_id
    result = db.execute(
        text(f"UPDATE learning_episodes SET {set_clause} WHERE id = :id RETURNING id"), updates
    ).fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="Episode not found")
    db.commit()
    return {"id": episode_id}


@router.delete("/admin/learning/episodes/{episode_id}", status_code=204)
def delete_episode(
    episode_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    result = db.execute(
        text("DELETE FROM learning_episodes WHERE id = :id RETURNING id"), {"id": episode_id}
    ).fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="Episode not found")
    db.commit()
