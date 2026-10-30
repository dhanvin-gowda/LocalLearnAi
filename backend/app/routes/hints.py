from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from app.services.hint_service import hint_service

router = APIRouter(prefix="/hints", tags=["Hints"])


class HintRequest(BaseModel):
    challenge_id: str = Field(..., description="Target challenge identifier")
    student_code: Optional[str] = Field("", description="Current code attempt by the student")
    hint_level: int = Field(1, ge=1, le=3, description="Hint tier: 1 (nudge), 2 (strategy), 3 (blueprint)")


class HintResponse(BaseModel):
    success: bool
    challenge_id: str
    hint_level: int
    max_hints: int
    hint: Optional[str] = None
    error: Optional[str] = None


@router.post("/generate", response_model=HintResponse, summary="Get progressive hint for challenge")
async def generate_hint(request: HintRequest):
    """
    Generate or retrieve a tier-based hint without spoiling the full solution.
    """
    result = await hint_service.get_hint(
        challenge_id=request.challenge_id,
        student_code=request.student_code or "",
        hint_level=request.hint_level,
    )
    if not result.get("success"):
        raise HTTPException(status_code=404, detail=result.get("error", "Failed to retrieve hint"))
    return HintResponse(**result)
