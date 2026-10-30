from typing import Any, Dict, List
from pydantic import BaseModel, Field


class ProgressSubmission(BaseModel):
    challenge_id: str
    passed: bool
    points_earned: int


class UserProgress(BaseModel):
    user_id: str
    completed_challenges: List[str] = []
    total_points: int = 0
    current_streak: int = 0
    submissions: List[ProgressSubmission] = []


class ProgressUpdateRequest(BaseModel):
    challenge_id: str
    passed: bool
    points: int = Field(10, ge=0)
