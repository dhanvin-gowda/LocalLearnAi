from fastapi import APIRouter, HTTPException
from app.schemas.tutor import TutorQueryRequest, TutorQueryResponse
from app.services.tutor_service import tutor_service

router = APIRouter(prefix="/tutor", tags=["AI Tutor"])


@router.post("/chat", response_model=TutorQueryResponse, summary="Ask AI Tutor a question")
async def tutor_chat(request: TutorQueryRequest):
    """
    Send a concept or question to the Socratic AI Tutor.
    Supports multilingual learning in English, Kannada, and Hindi.
    """
    try:
        response = await tutor_service.get_tutor_response(request)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Tutor service error: {str(e)}")
