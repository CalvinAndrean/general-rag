from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.auth import User
from app.repositories.document import DocumentRepository
from app.schemas.common import ResponseEnvelope
from app.schemas.query import QueryRequest, QueryResponse
from app.services.query import QueryService

router = APIRouter()


def get_doc_repo(db: AsyncSession = Depends(get_db)) -> DocumentRepository:
    return DocumentRepository(db=db)


def get_query_service(repo: DocumentRepository = Depends(get_doc_repo)) -> QueryService:
    return QueryService(doc_repo=repo)


DocRepoDep = Annotated[DocumentRepository, Depends(get_doc_repo)]
QueryServiceDep = Annotated[QueryService, Depends(get_query_service)]


@router.post("/", response_model=ResponseEnvelope[QueryResponse])
async def execute_query(
    request: QueryRequest,
    user: User = Depends(get_current_user),
    service: QueryServiceDep = None,
    db: AsyncSession = Depends(get_db),
):
    """Execute RAG question answering query with DB logging and streaming support."""
    if request.stream:
        return StreamingResponse(
            service.stream_query(request, user=user, db=db),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )

    response = await service.execute_query(request, user=user, db=db)
    return ResponseEnvelope(data=response)
