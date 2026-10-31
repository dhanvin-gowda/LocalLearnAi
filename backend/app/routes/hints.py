from typing import Optional
from fastapi import APIRouter, HTTPException, status
from app.schemas.hint import HintRequest, HintResponse
from app.services.hint_service import hint_service

router = APIRouter(prefix="/hints", tags=["Hints"])


@router.post(
    "/generate",
    response_model=HintResponse,
    summary="Generate progressive AI hint for challenge",
    description="Delivers progressive tiered hints: Level 1 (Conceptual Clue), Level 2 (Approach), Level 3 (Detailed Guidance).",
)
async def generate_hint(request: HintRequest):
    """
    Generate or retrieve a tier-based hint without spoiling the full solution.
    Supports English, Kannada (kn), and Hindi (hi).
    """
    result = await hint_service.get_hint(
        challenge_id=request.challenge_id,
        student_code=request.code or request.student_code or "",
        hint_level=request.level or request.hint_level or 1,
        language=request.language or "en",
        previous_hints=request.previous_hints or [],
    )

    if not result.get("success"):
        error_msg = result.get("error", "Failed to retrieve hint")
        if "not found" in error_msg.lower():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=error_msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_msg)

    return HintResponse(**result)
