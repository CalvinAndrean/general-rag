from typing import Annotated

from fastapi import APIRouter, Depends, File, Query, Response, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.clients import s3_client
from app.core.database import get_db
from app.core.exceptions import NotFoundError
from app.models.auth import User
from app.models.document import Document
from app.models.folder import Folder
from app.repositories.document import DocumentRepository
from app.schemas.common import ResponseEnvelope
from app.schemas.document import (
    ActiveToggleRequest,
    DocumentListResponse,
    DocumentResponse,
    FolderCreateRequest,
    FolderResponse,
)
from app.services.ingestion import IngestionService

router = APIRouter()


def get_doc_repo(db: AsyncSession = Depends(get_db)) -> DocumentRepository:
    return DocumentRepository(db=db)


def get_ingestion_service(repo: DocumentRepository = Depends(get_doc_repo)) -> IngestionService:
    return IngestionService(doc_repo=repo)


DocRepoDep = Annotated[DocumentRepository, Depends(get_doc_repo)]
IngestionServiceDep = Annotated[IngestionService, Depends(get_ingestion_service)]


@router.post(
    "/", response_model=ResponseEnvelope[DocumentResponse], status_code=status.HTTP_201_CREATED
)
async def upload_document(
    file: UploadFile = File(...),
    folder_id: str | None = Query(None),
    user: User = Depends(get_current_user),
    service: IngestionServiceDep = None,
    db: AsyncSession = Depends(get_db),
):
    """Upload a document to start RAG ingestion."""
    print(
        f"\n[API UPLOAD START] filename={file.filename}, folder_id={folder_id}, user_tenant={user.tenant_id if user else None}"
    )
    if folder_id in ("root", "null", "", "undefined"):
        folder_id = None

    folder_path = "/"
    if folder_id:
        f_res = await db.execute(select(Folder).where(Folder.id == folder_id))
        folder_obj = f_res.scalar_one_or_none()
        if folder_obj:
            folder_path = f"/{folder_obj.name}/"

    try:
        doc = await service.upload_and_process(
            file,
            tenant_id=user.tenant_id if user else None,
            user_id=user.id if user else None,
            folder_id=folder_id,
            folder_path=folder_path,
        )
        print(f"[API UPLOAD SUCCESS] doc.id={doc.id}, status={doc.status}\n")
        return ResponseEnvelope(data=doc)
    except Exception as e:
        print(f"[API UPLOAD EXCEPTION] {type(e).__name__}: {e}\n")
        raise


@router.get("/", response_model=ResponseEnvelope[DocumentListResponse])
async def list_documents(
    status: str | None = Query(None),
    search: str | None = Query(None),
    folder_id: str | None = Query(None),
    user: User = Depends(get_current_user),
    repo: DocRepoDep = None,
):
    """List documents for tenant with optional status, search, and folder filtering."""
    print(
        f"\n[API LIST DOCS REQ] status={status}, search={search}, folder_id={folder_id}, user_tenant={user.tenant_id if user else None}"
    )
    stmt = select(Document).order_by(Document.created_at.desc())
    if user and user.tenant_id:
        stmt = stmt.where((Document.tenant_id == user.tenant_id) | (Document.tenant_id.is_(None)))
    if status and status != "all":
        stmt = stmt.where(Document.status == status)
    if search and search.strip():
        stmt = stmt.where(Document.name.ilike(f"%{search.strip()}%"))
    if folder_id is not None:
        if folder_id in ("root", "null", "", "undefined"):
            stmt = stmt.where(Document.folder_id.is_(None))
        else:
            stmt = stmt.where(Document.folder_id == folder_id)

    result = await repo.db.execute(stmt)
    docs = list(result.scalars().all())
    print(f"[API LIST DOCS SUCCESS] Found {len(docs)} documents in database")
    doc_responses = [DocumentResponse.model_validate(d) for d in docs]
    return ResponseEnvelope(
        data=DocumentListResponse(documents=doc_responses, total=len(doc_responses))
    )


@router.patch("/{doc_id}/active", response_model=ResponseEnvelope[DocumentResponse])
async def toggle_document_active(
    doc_id: str,
    request: ActiveToggleRequest,
    user: User = Depends(get_current_user),
    repo: DocRepoDep = None,
):
    """Toggle document active status (included or excluded from RAG search)."""
    doc = await repo.get_by_id(doc_id)
    if not doc:
        raise NotFoundError(message=f"Document '{doc_id}' not found")

    doc = await repo.update(doc, {"is_active": request.is_active})
    return ResponseEnvelope(data=DocumentResponse.model_validate(doc))


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    doc_id: str,
    user: User = Depends(get_current_user),
    repo: DocRepoDep = None,
):
    """Delete document, stored chunks, and S3 file."""
    doc = await repo.get_by_id(doc_id)
    if not doc:
        raise NotFoundError(message=f"Document '{doc_id}' not found")

    if doc.s3_key:
        await s3_client.delete_file(doc.s3_key)

    await repo.delete(doc)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ── Folders ──


@router.get("/folders", response_model=ResponseEnvelope[list[FolderResponse]])
async def list_folders(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all folders for tenant."""
    result = await db.execute(
        select(Folder).where(Folder.tenant_id == user.tenant_id).order_by(Folder.name)
    )
    folders = list(result.scalars().all())
    return ResponseEnvelope(data=[FolderResponse.model_validate(f) for f in folders])


@router.post("/folders", response_model=ResponseEnvelope[FolderResponse], status_code=201)
async def create_folder(
    request: FolderCreateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new folder for grouping documents."""
    folder = Folder(
        name=request.name,
        parent_id=request.parent_id,
        tenant_id=user.tenant_id,
    )
    db.add(folder)
    await db.flush()
    return ResponseEnvelope(data=FolderResponse.model_validate(folder))
