"""Repository for QueryLog CRUD operations."""

from datetime import UTC, date, datetime, timedelta

from sqlalchemy import Date, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.query_log import QueryLog


class QueryLogRepository:
    """Handles query log database operations for usage tracking."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: dict) -> QueryLog:
        log = QueryLog(**data)
        self.db.add(log)
        await self.db.flush()
        return log

    async def get_today_count(self, tenant_id: str) -> int:
        today = datetime.now(UTC).date()
        result = await self.db.execute(
            select(func.count(QueryLog.id)).where(
                QueryLog.tenant_id == tenant_id,
                cast(QueryLog.created_at, Date) == today,
            )
        )
        return result.scalar() or 0

    async def get_total_count(self, tenant_id: str) -> int:
        result = await self.db.execute(
            select(func.count(QueryLog.id)).where(QueryLog.tenant_id == tenant_id)
        )
        return result.scalar() or 0

    async def get_month_cost(self, tenant_id: str) -> float:
        now = datetime.now(UTC)
        first_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        result = await self.db.execute(
            select(func.coalesce(func.sum(QueryLog.estimated_cost), 0)).where(
                QueryLog.tenant_id == tenant_id,
                QueryLog.created_at >= first_of_month,
            )
        )
        return float(result.scalar() or 0)

    async def get_daily_usage(self, tenant_id: str, start_date: date, end_date: date) -> list[dict]:
        stmt = (
            select(
                cast(QueryLog.created_at, Date).label("date"),
                func.count(QueryLog.id).label("query_count"),
                func.coalesce(func.sum(QueryLog.prompt_tokens), 0).label("prompt_tokens"),
                func.coalesce(func.sum(QueryLog.completion_tokens), 0).label("completion_tokens"),
                func.coalesce(func.sum(QueryLog.total_tokens), 0).label("total_tokens"),
                func.coalesce(func.sum(QueryLog.estimated_cost), 0).label("estimated_cost"),
            )
            .where(
                QueryLog.tenant_id == tenant_id,
                cast(QueryLog.created_at, Date) >= start_date,
                cast(QueryLog.created_at, Date) <= end_date,
            )
            .group_by(cast(QueryLog.created_at, Date))
            .order_by(cast(QueryLog.created_at, Date))
        )
        result = await self.db.execute(stmt)
        return [
            {
                "date": str(row.date),
                "query_count": row.query_count,
                "prompt_tokens": row.prompt_tokens,
                "completion_tokens": row.completion_tokens,
                "total_tokens": row.total_tokens,
                "estimated_cost": float(row.estimated_cost),
            }
            for row in result.all()
        ]

    async def get_monthly_usage(self, tenant_id: str) -> list[dict]:
        from sqlalchemy import text

        month_expr = text("to_char(general_rag.query_logs.created_at, 'YYYY-MM')")
        stmt = (
            select(
                month_expr.label("month"),
                func.count(QueryLog.id).label("query_count"),
                func.coalesce(func.sum(QueryLog.total_tokens), 0).label("total_tokens"),
                func.coalesce(func.sum(QueryLog.estimated_cost), 0).label("estimated_cost"),
            )
            .where(QueryLog.tenant_id == tenant_id)
            .group_by(month_expr)
            .order_by(month_expr.desc())
            .limit(12)
        )
        result = await self.db.execute(stmt)
        return [
            {
                "month": row.month,
                "query_count": row.query_count,
                "total_tokens": row.total_tokens,
                "estimated_cost": float(row.estimated_cost),
            }
            for row in result.all()
        ]

    async def get_top_questions(self, tenant_id: str, limit: int = 20) -> list[dict]:
        stmt = (
            select(
                QueryLog.question,
                func.count(QueryLog.id).label("count"),
                func.max(QueryLog.created_at).label("last_asked"),
            )
            .where(QueryLog.tenant_id == tenant_id)
            .group_by(QueryLog.question)
            .order_by(func.count(QueryLog.id).desc())
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return [
            {
                "question": row.question,
                "count": row.count,
                "last_asked": str(row.last_asked) if row.last_asked else None,
            }
            for row in result.all()
        ]

    async def get_query_trends(self, tenant_id: str, days: int = 30) -> list[dict]:
        start_date = datetime.now(UTC) - timedelta(days=days)
        stmt = (
            select(
                cast(QueryLog.created_at, Date).label("date"),
                func.count(QueryLog.id).label("query_count"),
            )
            .where(
                QueryLog.tenant_id == tenant_id,
                QueryLog.created_at >= start_date,
            )
            .group_by(cast(QueryLog.created_at, Date))
            .order_by(cast(QueryLog.created_at, Date))
        )
        result = await self.db.execute(stmt)
        return [{"date": str(row.date), "query_count": row.query_count} for row in result.all()]
