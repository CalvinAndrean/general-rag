"""Pydantic schemas for usage and cost tracking endpoints."""

from pydantic import BaseModel


class DailyUsage(BaseModel):
    date: str
    query_count: int
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    estimated_cost: float


class MonthlyUsage(BaseModel):
    month: str
    query_count: int
    total_tokens: int
    estimated_cost: float


class DashboardStats(BaseModel):
    total_documents: int
    indexed_documents: int
    processing_documents: int
    failed_documents: int
    queries_today: int
    cost_this_month: float
    total_queries: int
    total_tokens: int = 0
