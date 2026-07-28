"""Pydantic schemas for analytics endpoints."""

from pydantic import BaseModel


class TopQuestion(BaseModel):
    question: str
    count: int
    last_asked: str | None = None


class QueryTrend(BaseModel):
    date: str
    query_count: int
