"""Usage and cost metrics API endpoints (admin-only)."""

from datetime import UTC, date, datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_admin
from app.core.database import get_db
from app.models.auth import User
from app.repositories.query_log import QueryLogRepository
from app.schemas.common import ResponseEnvelope
from app.schemas.usage import DailyUsage, MonthlyUsage, UsageSummary

router = APIRouter()


@router.get("/summary", response_model=ResponseEnvelope[UsageSummary])
async def get_usage_summary(
    start: date | None = Query(None),
    end: date | None = Query(None),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get aggregated usage summary with query vs ingestion cost breakdown (admin-only)."""
    repo = QueryLogRepository(db)
    summary_data = await repo.get_usage_summary(admin.tenant_id, start_date=start, end_date=end)
    return ResponseEnvelope(data=UsageSummary(**summary_data))


@router.get("/daily", response_model=ResponseEnvelope[list[DailyUsage]])
async def get_daily_usage(
    start: date | None = Query(None),
    end: date | None = Query(None),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get daily token usage and cost breakdown (admin-only)."""
    end_date = end or datetime.now(UTC).date()
    start_date = start or (end_date - timedelta(days=30))

    repo = QueryLogRepository(db)
    daily_items = await repo.get_daily_usage(admin.tenant_id, start_date, end_date)
    return ResponseEnvelope(data=[DailyUsage(**item) for item in daily_items])


@router.get("/monthly", response_model=ResponseEnvelope[list[MonthlyUsage]])
async def get_monthly_usage(
    start: date | None = Query(None),
    end: date | None = Query(None),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get monthly aggregated cost breakdown (admin-only)."""
    repo = QueryLogRepository(db)
    monthly_items = await repo.get_monthly_usage(admin.tenant_id, start_date=start, end_date=end)
    return ResponseEnvelope(data=[MonthlyUsage(**item) for item in monthly_items])
