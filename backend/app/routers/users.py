from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.user import User

router = APIRouter()


class AvatarRequest(BaseModel):
    avatar_b64: str


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
    if not payload.avatar_b64.startswith("data:image/"):
        raise HTTPException(status_code=400, detail="Invalid image data")

    db.execute(
        text("UPDATE users SET avatar_b64 = :avatar WHERE id = :id"),
        {"avatar": payload.avatar_b64, "id": current_user.id},
    )
    db.commit()
    return {"avatar": payload.avatar_b64}
