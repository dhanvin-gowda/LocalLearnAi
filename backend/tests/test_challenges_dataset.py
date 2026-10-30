import json
import pytest
from pathlib import Path
from app.schemas.challenge import Challenge
from app.database import db

DATA_DIR = Path(__file__).resolve().parent.parent / "app" / "data"
CHALLENGES_FILE = DATA_DIR / "challenges.json"
SOLUTIONS_FILE = DATA_DIR / "solutions.json"


def test_challenges_json_validity_and_schema():
    """Verify that challenges.json exists, is valid JSON, and parses into Pydantic models."""
    assert CHALLENGES_FILE.exists(), f"File not found: {CHALLENGES_FILE}"

    with open(CHALLENGES_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    assert isinstance(data, list)
    assert len(data) == 5, f"Expected 5 challenges, got {len(data)}"

    # Required 5 challenge IDs
    expected_ids = {
        "py-beg-01-reverse-string",
        "py-beg-02-find-largest",
        "py-beg-03-palindrome-check",
        "py-beg-04-find-duplicates",
        "py-beg-05-two-sum",
    }
    actual_ids = {c["id"] for c in data}
    assert actual_ids == expected_ids, f"ID mismatch: {actual_ids} vs {expected_ids}"

    # Validate each challenge with Pydantic and check all required attributes
    for c in data:
        # Validate Pydantic schema
        validated = Challenge(**c)

        # Explicit requirement verification
        assert validated.id, "Unique ID missing"
        assert validated.title, "Title missing"
        assert validated.description, "Description missing"
        assert validated.difficulty == "Beginner", "Difficulty should be Beginner"
        assert validated.topic, "Topic missing"
        assert len(validated.input_output_examples) >= 2, "At least 2 input/output examples required"
        assert len(validated.constraints) >= 1, "Constraints missing"
        assert "def " in validated.starter_code, "Starter code missing"
        assert len(validated.learning_objectives) >= 2, "Learning objectives missing"
        assert len(validated.test_cases) >= 2, "Public test cases missing"

        # Verify hidden test cases or complete solutions are NOT leaked in public challenge data
        assert "solution" not in c, "Complete solution leaked in public challenge data!"
        assert "solution_code" not in c, "solution_code leaked in public challenge data!"
        assert "hidden_test_cases" not in c, "hidden_test_cases leaked in public challenge data!"


def test_solutions_json_separation_and_structure():
    """Verify solutions and hidden test cases are stored in a separate dataset."""
    assert SOLUTIONS_FILE.exists(), f"File not found: {SOLUTIONS_FILE}"

    with open(SOLUTIONS_FILE, "r", encoding="utf-8") as f:
        sol_data = json.load(f)

    assert isinstance(sol_data, list)
    assert len(sol_data) == 5

    for sol in sol_data:
        assert "challenge_id" in sol
        assert "solution_code" in sol
        assert "entrypoint" in sol
        assert "time_complexity" in sol
        assert "space_complexity" in sol
        assert len(sol.get("hidden_test_cases", [])) >= 3, "Hidden test cases required"


def test_validate_all_expected_outputs():
    """
    Execute each reference solution against all public and hidden test cases.
    Verifies that all expected outputs are 100% accurate and functional.
    """
    with open(CHALLENGES_FILE, "r", encoding="utf-8") as f:
        challenges = {c["id"]: c for c in json.load(f)}

    with open(SOLUTIONS_FILE, "r", encoding="utf-8") as f:
        solutions = {s["challenge_id"]: s for s in json.load(f)}

    for cid, challenge in challenges.items():
        sol = solutions.get(cid)
        assert sol is not None, f"No solution found for challenge {cid}"

        # Evaluate complete solution code using the Database evaluation engine
        eval_result = db.evaluate_code(cid, sol["solution_code"])

        assert eval_result["passed"] is True, (
            f"Challenge {cid} failed verification on expected outputs: {eval_result['message']}\n"
            f"Test results: {eval_result['test_results']}"
        )
        print(f"✓ Challenge '{challenge['title']}' ({cid}): All public & hidden test cases passed!")
