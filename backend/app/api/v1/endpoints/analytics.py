"""Analytics and insight API endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.auth import User
from app.repositories.query_log import QueryLogRepository
from app.schemas.analytics import QueryTrend, TopQuestion
from app.schemas.common import ResponseEnvelope

router = APIRouter()


@router.get("/top-questions", response_model=ResponseEnvelope[list[TopQuestion]])
async def get_top_questions(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get most-asked questions clustered by frequency."""
    repo = QueryLogRepository(db)
    items = await repo.get_top_questions(user.tenant_id)
    return ResponseEnvelope(data=[TopQuestion(**i) for i in items])


@router.get("/query-trends", response_model=ResponseEnvelope[list[QueryTrend]])
async def get_query_trends(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get query traffic volume over the last 30 days."""
    repo = QueryLogRepository(db)
    items = await repo.get_query_trends(user.tenant_id)
    return ResponseEnvelope(data=[QueryTrend(**i) for i in items])
