import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional
from app.config import get_settings

logger = logging.getLogger(__name__)


class Database:
    """
    Modular data access layer for LocalLearn AI.
    Loads public challenges, maintains private solutions & hidden test cases separately,
    and tracks user submissions and streaks.
    """

    def __init__(self):
        self.settings = get_settings()
        self._challenges: Dict[str, Dict[str, Any]] = {}
        self._solutions: Dict[str, Dict[str, Any]] = {}
        self._user_progress: Dict[str, Dict[str, Any]] = {}
        self._load_datasets()

    def _load_datasets(self) -> None:
        app_data_dir = Path(__file__).resolve().parent / "data"
        backend_data_dir = self.settings.data_path

        # 1. Load public challenges (prefer app/data/challenges.json)
        challenges_file = app_data_dir / "challenges.json"
        if not challenges_file.exists():
            challenges_file = backend_data_dir / "challenges.json"

        if challenges_file.exists():
            try:
                with open(challenges_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for item in data:
                        self._challenges[item["id"]] = item
                logger.info(f"Loaded {len(self._challenges)} challenges from {challenges_file}")
            except Exception as e:
                logger.error(f"Error loading challenges: {e}")
        else:
            logger.warning(f"Challenges data file not found at {challenges_file}")

        # 2. Load private solutions & hidden test cases (kept strictly separate)
        solutions_file = app_data_dir / "solutions.json"
        if not solutions_file.exists():
            solutions_file = backend_data_dir / "solutions.json"

        if solutions_file.exists():
            try:
                with open(solutions_file, "r", encoding="utf-8") as f:
                    sol_data = json.load(f)
                    for sol in sol_data:
                        self._solutions[sol["challenge_id"]] = sol
                logger.info(f"Loaded {len(self._solutions)} solutions from {solutions_file}")
            except Exception as e:
                logger.error(f"Error loading solutions: {e}")

    # ==================== PUBLIC CHALLENGES ====================

    def get_all_challenges(
        self,
        category: Optional[str] = None,
        difficulty: Optional[str] = None,
        subject: Optional[str] = None,
        topic: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        results = list(self._challenges.values())
        if category:
            results = [c for c in results if c.get("category", "").lower() == category.lower()]
        if difficulty:
            results = [c for c in results if c.get("difficulty", "").lower() == difficulty.lower()]
        if subject:
            results = [c for c in results if c.get("subject", "").lower() == subject.lower()]
        if topic:
            results = [c for c in results if c.get("topic", "").lower() == topic.lower()]
        return results

    def get_challenge_by_id(self, challenge_id: str) -> Optional[Dict[str, Any]]:
        return self._challenges.get(challenge_id)

    # ==================== PRIVATE SOLUTIONS & EVALUATIONS ====================

    def get_solution(self, challenge_id: str) -> Optional[Dict[str, Any]]:
        """Returns the reference solution for administrative/grading use."""
        return self._solutions.get(challenge_id)

    def get_hidden_tests(self, challenge_id: str) -> List[Dict[str, Any]]:
        """Returns hidden test cases for thorough grading."""
        sol = self._solutions.get(challenge_id)
        if sol and "hidden_test_cases" in sol:
            return sol["hidden_test_cases"]
        return []

    def evaluate_code(self, challenge_id: str, code: str) -> Dict[str, Any]:
        """
        Executes code against public test cases and hidden test cases in an isolated namespace.
        """
        challenge = self.get_challenge_by_id(challenge_id)
        if not challenge:
            return {"passed": False, "message": f"Challenge '{challenge_id}' not found", "test_results": []}

        sol = self.get_solution(challenge_id)
        entrypoint_name = sol.get("entrypoint") if sol else None

        # If entrypoint not specified, infer function name from starter_code
        if not entrypoint_name:
            import re
            match = re.search(r"def\s+([a-zA-Z0-9_]+)\s*\(", challenge.get("starter_code", ""))
            entrypoint_name = match.group(1) if match else "solution"

        # Prepare isolated execution environment
        exec_globals: Dict[str, Any] = {}
        try:
            exec(code, exec_globals)
        except Exception as e:
            return {
                "passed": False,
                "message": f"Code execution / syntax error: {type(e).__name__}: {str(e)}",
                "test_results": [],
            }

        fn = exec_globals.get(entrypoint_name)
        if not callable(fn):
            return {
                "passed": False,
                "message": f"Function '{entrypoint_name}' was not defined or is not callable.",
                "test_results": [],
            }

        # Combine public tests and hidden tests for comprehensive grading
        all_tests = list(challenge.get("test_cases", [])) + self.get_hidden_tests(challenge_id)
        test_results = []
        all_passed = True

        for idx, test in enumerate(all_tests):
            kwargs = test.get("input", {})
            expected = test.get("expected")
            try:
                # Deep copy mutable inputs if necessary
                import copy
                call_args = copy.deepcopy(kwargs)
                actual = fn(**call_args)
                passed = actual == expected
                if not passed:
                    all_passed = False
                test_results.append({
                    "test_index": idx + 1,
                    "passed": passed,
                    "expected": expected,
                    "actual": actual,
                })
            except Exception as e:
                all_passed = False
                test_results.append({
                    "test_index": idx + 1,
                    "passed": False,
                    "error": f"{type(e).__name__}: {str(e)}",
                })

        msg = (
            f"All {len(all_tests)} test cases passed! (Public & Hidden)"
            if all_passed
            else f"Failed on one or more test cases ({sum(1 for t in test_results if t['passed'])}/{len(all_tests)} passed)."
        )

        return {
            "passed": all_passed,
            "message": msg,
            "test_results": test_results,
        }

    # ==================== USER PROGRESS ====================

    def get_user_progress(self, user_id: str) -> Dict[str, Any]:
        if user_id not in self._user_progress:
            self._user_progress[user_id] = {
                "user_id": user_id,
                "completed_challenges": [],
                "total_points": 0,
                "current_streak": 0,
                "submissions": [],
            }
        return self._user_progress[user_id]

    def record_submission(
        self,
        user_id: str,
        challenge_id: str,
        code: str,
        passed: bool,
        points: int = 15,
    ) -> Dict[str, Any]:
        progress = self.get_user_progress(user_id)
        submission = {
            "challenge_id": challenge_id,
            "passed": passed,
            "points_earned": points if passed else 0,
        }
        progress["submissions"].append(submission)

        if passed and challenge_id not in progress["completed_challenges"]:
            progress["completed_challenges"].append(challenge_id)
            progress["total_points"] += points
            progress["current_streak"] += 1

        return progress


# Singleton database instance
db = Database()
