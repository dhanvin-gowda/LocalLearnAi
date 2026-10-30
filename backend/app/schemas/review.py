from typing import List, Optional
from pydantic import BaseModel, Field


class ReviewIssue(BaseModel):
    line: Optional[int] = None
    severity: str = Field(..., description="'info', 'warning', or 'error'")
    category: str = Field(..., description="'correctness', 'complexity', 'style', 'security'")
    description: str
    suggestion: Optional[str] = None


class CodeReviewRequest(BaseModel):
    code: str = Field(..., min_length=1, description="Source code to review")
    language: str = Field("python", description="Programming language")
    problem_context: Optional[str] = Field(None, description="Optional problem or challenge description")


class CodeReviewResponse(BaseModel):
    summary: str
    score: int = Field(..., ge=0, le=100, description="Overall quality score out of 100")
    issues: List[ReviewIssue] = []
    improved_code: Optional[str] = None
