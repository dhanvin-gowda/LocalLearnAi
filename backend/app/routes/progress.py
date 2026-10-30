from fastapi import APIRouter, HTTPException
from app.database import db
from app.schemas.progress import UserProgress, ProgressUpdateRequest

router = APIRouter(prefix="/progress", tags=["Progress"])


@router.get("/{user_id}", response_model=UserProgress, summary="Get user learning progress")
def get_progress(user_id: str):
    """
    Retrieve user completed challenges, points, streak, and submission logs.
    """
    progress = db.get_user_progress(user_id)
    return UserProgress(**progress)


@router.post("/{user_id}", response_model=UserProgress, summary="Update user learning progress")
def update_progress(user_id: str, request: ProgressUpdateRequest):
    """
    Record or update challenge completion and points for a user.
    """
    updated = db.record_submission(
        user_id=user_id,
        challenge_id=request.challenge_id,
        code="",
        passed=request.passed,
        points=request.points,
    )
    return UserProgress(**updated)
