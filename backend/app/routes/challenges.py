from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from app.database import db
from app.schemas.challenge import Challenge, ChallengeBase, ChallengeSubmission, SubmissionResult

router = APIRouter(prefix="/challenges", tags=["Challenges"])


@router.get("", response_model=List[ChallengeBase], summary="List all learning challenges")
def list_challenges(
    category: Optional[str] = Query(None, description="Filter by category (e.g. 'Algorithms', 'Physics')"),
    difficulty: Optional[str] = Query(None, description="Filter by difficulty ('Easy', 'Medium', 'Hard')"),
    subject: Optional[str] = Query(None, description="Filter by subject"),
):
    """
    Retrieve challenges with optional filtering by category, difficulty, or subject.
    """
    raw_challenges = db.get_all_challenges(category=category, difficulty=difficulty, subject=subject)
    return [ChallengeBase(**c) for c in raw_challenges]


@router.get("/{challenge_id}", response_model=Challenge, summary="Get challenge details")
def get_challenge(challenge_id: str):
    """
    Retrieve full challenge details including starter code, hints, and test cases.
    """
    challenge = db.get_challenge_by_id(challenge_id)
    if not challenge:
        raise HTTPException(status_code=404, detail=f"Challenge '{challenge_id}' not found.")
    return Challenge(**challenge)


@router.post("/{challenge_id}/submit", response_model=SubmissionResult, summary="Submit challenge code")
def submit_challenge(challenge_id: str, submission: ChallengeSubmission):
    """
    Submit a code solution for a challenge and record progress.
    """
    challenge = db.get_challenge_by_id(challenge_id)
    if not challenge:
        raise HTTPException(status_code=404, detail=f"Challenge '{challenge_id}' not found.")

    # Real evaluation against public and hidden test cases
    eval_result = db.evaluate_code(challenge_id, submission.code)
    passed = eval_result["passed"]
    message = eval_result["message"]
    points = 15 if passed else 0

    db.record_submission(
        user_id=submission.user_id,
        challenge_id=challenge_id,
        code=submission.code,
        passed=passed,
        points=points,
    )

    return SubmissionResult(
        challenge_id=challenge_id,
        passed=passed,
        message=message,
        points_earned=points,
        test_results=eval_result.get("test_results"),
    )
