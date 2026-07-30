from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy import select

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.exceptions import NotFoundError
from app.models.auth import User
from app.models.query_log import QueryLog
from app.repositories.evaluation import EvaluationRepository
from app.schemas.common import ResponseEnvelope
from app.schemas.evaluation import EvaluationResponse, EvaluationSummary, RunEvaluationRequest
from app.services.evaluator import RagasEvaluatorService

router = APIRouter()


@router.post("/run", response_model=ResponseEnvelope[EvaluationResponse])
async def run_query_evaluation(
    request: RunEvaluationRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Run Ragas quality metrics evaluation on a recorded query log."""
    res = await db.execute(
        select(QueryLog).where(
            QueryLog.id == request.query_log_id, QueryLog.tenant_id == user.tenant_id
        )
    )
    query_log = res.scalar_one_or_none()
    if not query_log:
        raise NotFoundError("Query log entry not found")

    model_name = query_log.model_name or "anthropic/claude-3.5-sonnet"

    eval_obj = await RagasEvaluatorService.evaluate_query_sync(
        query_log_id=query_log.id,
        tenant_id=user.tenant_id,
        question=query_log.question,
        contexts=[],
        answer=query_log.answer or "",
        model_name=model_name,
    )
    return ResponseEnvelope(data=EvaluationResponse.model_validate(eval_obj))


@router.get("/", response_model=ResponseEnvelope[list[EvaluationResponse]])
async def list_evaluations(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List evaluation runs for current tenant."""
    repo = EvaluationRepository(db)
    items = await repo.list_by_tenant(user.tenant_id)
    return ResponseEnvelope(data=[EvaluationResponse(**item) for item in items])


@router.get("/summary", response_model=ResponseEnvelope[EvaluationSummary])
async def get_evaluation_summary(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get aggregated summary of average Ragas evaluation scores."""
    repo = EvaluationRepository(db)
    summary_dict = await repo.get_summary(user.tenant_id)
    return ResponseEnvelope(data=EvaluationSummary(**summary_dict))
