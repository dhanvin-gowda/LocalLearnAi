from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class TestCase(BaseModel):
    input: Dict[str, Any] = Field(..., description="Function input arguments")
    expected: Any = Field(..., description="Expected return value")


class IOExample(BaseModel):
    input: str = Field(..., description="Formatted input display")
    output: str = Field(..., description="Formatted expected output")
    explanation: Optional[str] = Field(None, description="Explanation of the output")


class ChallengeBase(BaseModel):
    id: str = Field(..., description="Unique challenge ID")
    title: str = Field(..., description="Challenge title")
    description: str = Field(..., description="Detailed problem statement")
    difficulty: str = Field("Beginner", description="'Beginner', 'Easy', 'Medium', 'Hard'")
    topic: str = Field(..., description="Topic area (e.g. 'Strings', 'Arrays & Lists')")
    category: Optional[str] = Field(None, description="Category grouping")
    subject: Optional[str] = Field("Python / DSA", description="Subject area")
    starter_code: str = Field(..., description="Starter code snippet")
    constraints: List[str] = Field(default_factory=list, description="Input and performance constraints")
    learning_objectives: List[str] = Field(default_factory=list, description="Pedagogical objectives")
    input_output_examples: List[IOExample] = Field(default_factory=list, description="User-facing examples")


class Challenge(ChallengeBase):
    test_cases: List[TestCase] = Field(default_factory=list, description="Public test cases")
    hints: List[str] = Field(default_factory=list, description="Progressive hints")


class ChallengeSubmission(BaseModel):
    user_id: str = Field(..., description="User unique identifier")
    code: str = Field(..., min_length=1, description="User submitted code solution")


class SubmissionResult(BaseModel):
    challenge_id: str
    passed: bool
    message: str
    points_earned: int
    test_results: Optional[List[Dict[str, Any]]] = None
