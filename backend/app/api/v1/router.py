from fastapi import APIRouter

from app.api.v1.endpoints import (
    analytics,
    auth,
    dashboard,
    documents,
    evaluation,
    health,
    items,
    members,
    query,
    settings,
    usage,
)

api_router = APIRouter()

api_router.include_router(health.router, tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(members.router, prefix="/members", tags=["Members Management"])
api_router.include_router(settings.router, prefix="/settings", tags=["Tenant Settings"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard Stats"])
api_router.include_router(usage.router, prefix="/usage", tags=["Usage & Cost"])
api_router.include_router(evaluation.router, prefix="/evaluations", tags=["Ragas Evaluation"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics & Insights"])
api_router.include_router(items.router, prefix="/items", tags=["Items"])
api_router.include_router(documents.router, prefix="/documents", tags=["Documents"])
api_router.include_router(query.router, prefix="/query", tags=["RAG Query"])
