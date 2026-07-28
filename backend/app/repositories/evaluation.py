"""Repository for Evaluation CRUD operations."""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.evaluation import Evaluation
from app.models.query_log import QueryLog


class EvaluationRepository:
    """Handles evaluation database operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: dict) -> Evaluation:
        evaluation = Evaluation(**data)
        self.db.add(evaluation)
        await self.db.flush()
        return evaluation

    async def list_by_tenant(self, tenant_id: str, limit: int = 50, offset: int = 0) -> list[dict]:
        stmt = (
            select(
                Evaluation,
                QueryLog.question,
            )
            .outerjoin(QueryLog, Evaluation.query_log_id == QueryLog.id)
            .where(Evaluation.tenant_id == tenant_id)
            .order_by(Evaluation.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self.db.execute(stmt)
        items = []
        for eval_obj, question in result.all():
            items.append(
                {
                    "id": eval_obj.id,
                    "query_log_id": eval_obj.query_log_id,
                    "question": question,
                    "faithfulness": float(eval_obj.faithfulness) if eval_obj.faithfulness else None,
                    "answer_relevancy": float(eval_obj.answer_relevancy)
                    if eval_obj.answer_relevancy
                    else None,
                    "context_precision": float(eval_obj.context_precision)
                    if eval_obj.context_precision
                    else None,
                    "context_recall": float(eval_obj.context_recall)
                    if eval_obj.context_recall
                    else None,
                    "overall_score": float(eval_obj.overall_score)
                    if eval_obj.overall_score
                    else None,
                    "created_at": str(eval_obj.created_at) if eval_obj.created_at else None,
                }
            )
        return items

    async def get_summary(self, tenant_id: str) -> dict:
        stmt = select(
            func.count(Evaluation.id).label("total"),
            func.avg(Evaluation.faithfulness).label("avg_faithfulness"),
            func.avg(Evaluation.answer_relevancy).label("avg_answer_relevancy"),
            func.avg(Evaluation.context_precision).label("avg_context_precision"),
            func.avg(Evaluation.context_recall).label("avg_context_recall"),
            func.avg(Evaluation.overall_score).label("avg_overall_score"),
        ).where(Evaluation.tenant_id == tenant_id)
        result = await self.db.execute(stmt)
        row = result.one()
        return {
            "total_evaluations": row.total or 0,
            "avg_faithfulness": round(float(row.avg_faithfulness), 4)
            if row.avg_faithfulness
            else None,
            "avg_answer_relevancy": round(float(row.avg_answer_relevancy), 4)
            if row.avg_answer_relevancy
            else None,
            "avg_context_precision": round(float(row.avg_context_precision), 4)
            if row.avg_context_precision
            else None,
            "avg_context_recall": round(float(row.avg_context_recall), 4)
            if row.avg_context_recall
            else None,
            "avg_overall_score": round(float(row.avg_overall_score), 4)
            if row.avg_overall_score
            else None,
        }
