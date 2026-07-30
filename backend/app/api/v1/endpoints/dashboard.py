"""Dashboard overview stats API endpoint."""

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.auth import User
from app.models.document import Document
from app.models.query_log import QueryLog
from app.repositories.query_log import QueryLogRepository
from app.schemas.common import ResponseEnvelope
from app.schemas.usage import DashboardStats

router = APIRouter()


@router.get("/stats", response_model=ResponseEnvelope[DashboardStats])
async def get_dashboard_stats(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get aggregated dashboard statistics for the tenant."""
    tenant_id = user.tenant_id
    query_repo = QueryLogRepository(db)

    # Document counts
    stmt = select(
        func.count(Document.id).label("total"),
        func.count().filter(Document.status == "indexed").label("indexed"),
        func.count().filter(Document.status == "processing").label("processing"),
        func.count().filter(Document.status == "failed").label("failed"),
    ).where(Document.tenant_id == tenant_id)
    result = await db.execute(stmt)
    doc_row = result.one()

    # Query & cost stats
    queries_today = await query_repo.get_today_count(tenant_id)
    total_queries = await query_repo.get_total_count(tenant_id)
    cost_this_month = await query_repo.get_month_cost(tenant_id)

    # Total tokens count
    token_stmt = select(func.coalesce(func.sum(QueryLog.total_tokens), 0)).where(
        QueryLog.tenant_id == tenant_id,
        QueryLog.log_type == "query",
    )
    token_res = await db.execute(token_stmt)
    total_tokens = int(token_res.scalar() or 0)

    stats = DashboardStats(
        total_documents=doc_row.total or 0,
        indexed_documents=doc_row.indexed or 0,
        processing_documents=doc_row.processing or 0,
        failed_documents=doc_row.failed or 0,
        queries_today=queries_today,
        cost_this_month=cost_this_month,
        total_queries=total_queries,
        total_tokens=total_tokens,
    )
    return ResponseEnvelope(data=stats)
