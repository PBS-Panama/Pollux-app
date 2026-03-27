from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.document import Document
from app.schemas.document import DocumentCreate, DocumentResponse
from typing import List

router = APIRouter()


@router.get("/users/{seafarer_id}/documents", response_model=List[DocumentResponse])
def list_documents(
    seafarer_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    docs = db.query(Document).filter(Document.seafarer_id == seafarer_id).all()
    return docs


@router.post("/users/{seafarer_id}/documents", response_model=DocumentResponse, status_code=201)
def create_document(
    seafarer_id: str,
    payload: DocumentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = Document(
        seafarer_id=seafarer_id,
        name=payload.name,
        cert_code=payload.cert_code,
        issued_date=payload.issued_date,
        expiry_date=payload.expiry_date,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.delete("/users/{seafarer_id}/documents/{doc_id}", status_code=204)
def delete_document(
    seafarer_id: str,
    doc_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(
        Document.id == doc_id, Document.seafarer_id == seafarer_id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    db.delete(doc)
    db.commit()
