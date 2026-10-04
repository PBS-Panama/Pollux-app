from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
import re

from pydantic import BaseModel, Field
from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.user import User

router = APIRouter()


# ~200 KB of base64 text. Raster formats only: an SVG data URI can carry script.
MAX_AVATAR_CHARS = 200_000
_AVATAR_RE = re.compile(r"data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*")


class AvatarRequest(BaseModel):
    avatar_b64: str = Field(max_length=MAX_AVATAR_CHARS)


# Was `bearer_optional` (HTTPBearer(auto_error=False)): with no token it fell
# back to trusting a `user_id` from the request body, so anyone — no
# credentials at all — could overwrite any user's avatar just by naming their
# id (Handover.md nota 42, L-3). Token is now required and the id always
# comes from it; a body `user_id` can no longer override whose avatar gets
# written, so the field is dropped from the schema rather than merely ignored.
@router.post("/users/avatar")
def upload_avatar(
    payload: AvatarRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not _AVATAR_RE.fullmatch(payload.avatar_b64):
        raise HTTPException(status_code=400, detail="Invalid image data")

    db.execute(
        text("UPDATE users SET avatar_b64 = :avatar WHERE id = :id"),
        {"avatar": payload.avatar_b64, "id": current_user.id},
    )
    db.commit()
    return {"avatar": payload.avatar_b64}
