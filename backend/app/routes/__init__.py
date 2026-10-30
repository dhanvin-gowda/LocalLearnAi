from fastapi import APIRouter
from app.routes.challenges import router as challenges_router
from app.routes.tutor import router as tutor_router
from app.routes.hints import router as hints_router
from app.routes.code_review import router as review_router
from app.routes.progress import router as progress_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(challenges_router)
api_router.include_router(tutor_router)
api_router.include_router(hints_router)
api_router.include_router(review_router)
api_router.include_router(progress_router)

__all__ = ["api_router"]
