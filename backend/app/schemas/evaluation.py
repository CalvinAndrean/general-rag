"""Pydantic schemas for evaluation endpoints."""

from pydantic import BaseModel, ConfigDict


class EvaluationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    query_log_id: str | None = None
    question: str | None = None
    faithfulness: float | None = None
    answer_relevancy: float | None = None
    context_precision: float | None = None
    context_recall: float | None = None
    overall_score: float | None = None
    created_at: str | None = None


class EvaluationSummary(BaseModel):
    total_evaluations: int
    avg_faithfulness: float | None = None
    avg_answer_relevancy: float | None = None
    avg_context_precision: float | None = None
    avg_context_recall: float | None = None
    avg_overall_score: float | None = None


class RunEvaluationRequest(BaseModel):
    query_log_id: str
