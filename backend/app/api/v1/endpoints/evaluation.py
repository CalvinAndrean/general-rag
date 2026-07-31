import asyncio
import json

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import StreamingResponse

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


@router.get("/stream")
async def stream_evaluations(
    type: str | None = Query(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Server-Sent Events (SSE) streaming real-time evaluation updates to the client."""

    async def event_generator():
        repo = EvaluationRepository(db)
        while True:
            try:
                items = await repo.list_by_tenant(user.tenant_id, evaluation_type=type, limit=50)
                summary_dict = await repo.get_summary(user.tenant_id, evaluation_type=type)
                payload = {
                    "type": "evaluations_update",
                    "data": items,
                    "summary": summary_dict,
                }
                yield f"data: {json.dumps(payload)}\n\n"
                await asyncio.sleep(2)
            except asyncio.CancelledError:
                break
            except Exception as e:
                yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
                await asyncio.sleep(4)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/", response_model=ResponseEnvelope[list[EvaluationResponse]])
async def list_evaluations(
    type: str | None = Query(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List evaluation runs for current tenant, optionally filtered by evaluation type (knowledge_query | intent_handling)."""
    repo = EvaluationRepository(db)
    items = await repo.list_by_tenant(user.tenant_id, evaluation_type=type)
    return ResponseEnvelope(data=[EvaluationResponse(**item) for item in items])


@router.get("/summary", response_model=ResponseEnvelope[EvaluationSummary])
async def get_evaluation_summary(
    type: str | None = Query(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get aggregated summary of average evaluation scores, optionally filtered by evaluation type."""
    repo = EvaluationRepository(db)
    summary_dict = await repo.get_summary(user.tenant_id, evaluation_type=type)
    return ResponseEnvelope(data=EvaluationSummary(**summary_dict))
