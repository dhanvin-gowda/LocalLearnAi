from fastapi import APIRouter, HTTPException
from app.schemas.review import CodeReviewRequest, CodeReviewResponse
from app.services.review_service import review_service

router = APIRouter(prefix="/review", tags=["Code Review"])


@router.post("/code", response_model=CodeReviewResponse, summary="Analyze and review code")
async def review_code(request: CodeReviewRequest):
    """
    Perform automated static and qualitative code review.
    Evaluates syntax, complexity, edge cases, and cleanliness.
    """
    try:
        response = await review_service.review_code(request)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Code review error: {str(e)}")
