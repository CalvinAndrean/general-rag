"""Pydantic schemas for usage and cost tracking endpoints."""

from pydantic import BaseModel


class DailyUsage(BaseModel):
    date: str
    query_count: int
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    estimated_cost: float
    log_type: str = "query"


class MonthlyUsage(BaseModel):
    month: str
    query_count: int
    total_tokens: int
    estimated_cost: float


class UsageCategoryStats(BaseModel):
    total_tokens: int = 0
    prompt_tokens: int = 0
    completion_tokens: int = 0
    estimated_cost: float = 0.0
    count: int = 0


class UsageSummary(BaseModel):
    query_usage: UsageCategoryStats
    ingestion_usage: UsageCategoryStats
    total_cost: float = 0.0
    total_tokens: int = 0


class DashboardStats(BaseModel):
    total_documents: int
    indexed_documents: int
    processing_documents: int
    failed_documents: int
    queries_today: int
    cost_this_month: float
    total_queries: int
    total_tokens: int = 0
