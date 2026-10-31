"""
Unit and integration tests for the Progressive AI Hint System.
Tests:
- All three progressive hint levels (1, 2, 3)
- All five coding challenges
- Multilingual responses: English (en), Kannada (kn), Hindi (hi)
- Input validation: invalid levels, missing challenge ID, empty code
- Endpoint parity: /hints/generate and /api/v1/hints/generate
- Field compatibility: 'level'/'code' and 'hint_level'/'student_code'
- Gemma fallback resilience
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch

from app.main import app
from app.services.hint_service import hint_service

client = TestClient(app)

CHALLENGE_IDS = [
    "py-beg-01-reverse-string",
    "py-beg-02-find-largest",
    "py-beg-03-palindrome-check",
    "py-beg-04-find-duplicates",
    "py-beg-05-two-sum",
]



@pytest.mark.parametrize("challenge_id", CHALLENGE_IDS)
@pytest.mark.parametrize("level", [1, 2, 3])
def test_all_five_challenges_and_levels(challenge_id: str, level: int):
    """Verify all 5 challenges return valid hints for all 3 progressive tiers."""
    payload = {
        "challenge_id": challenge_id,
        "code": "def solution():\n    pass",
        "level": level,
        "language": "en",
    }
    response = client.post("/hints/generate", json=payload)
    assert response.status_code == 200, f"Failed for {challenge_id} level {level}: {response.text}"
    data = response.json()
    assert data["success"] is True
    assert data["challenge_id"] == challenge_id
    assert data["level"] == level
    assert data["hint_level"] == level
    assert data["max_hints"] == 3
    assert len(data["hint"]) > 10
    assert len(data["next_action"]) > 5


def test_multilingual_kannada():
    """Verify progressive hint returns Kannada explanation with English keywords."""
    payload = {
        "challenge_id": "py-beg-01-reverse-string",
        "code": "def reverse_string(s): pass",
        "level": 1,
        "language": "kn",
    }
    response = client.post("/hints/generate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["language"] == "kn"
    assert data["level"] == 1
    assert "ಸ್ಟ್ರಿಂಗ್" in data["hint"] or "Python" in data["hint"]


def test_multilingual_hindi():
    """Verify progressive hint returns Hindi explanation."""
    payload = {
        "challenge_id": "py-beg-05-two-sum",
        "code": "def two_sum(nums, target): pass",
        "level": 1,
        "language": "hi",
    }
    response = client.post("/hints/generate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["language"] == "hi"
    assert data["level"] == 1
    assert "संख्या" in data["hint"] or "target" in data["hint"]


def test_invalid_level_zero():
    """Verify level 0 is rejected by validation."""
    payload = {
        "challenge_id": "py-beg-01-reverse-string",
        "code": "pass",
        "level": 0,
        "language": "en",
    }
    response = client.post("/hints/generate", json=payload)
    assert response.status_code == 422


def test_invalid_level_four():
    """Verify level 4 is rejected by validation."""
    payload = {
        "challenge_id": "py-beg-01-reverse-string",
        "code": "pass",
        "level": 4,
        "language": "en",
    }
    response = client.post("/hints/generate", json=payload)
    assert response.status_code == 422


def test_missing_challenge_id():
    """Verify missing challenge_id triggers 422 validation error."""
    payload = {
        "code": "pass",
        "level": 1,
    }
    response = client.post("/hints/generate", json=payload)
    assert response.status_code == 422


def test_nonexistent_challenge_id():
    """Verify unknown challenge_id returns 404."""
    payload = {
        "challenge_id": "py-unknown-challenge-999",
        "code": "pass",
        "level": 1,
    }
    response = client.post("/hints/generate", json=payload)
    assert response.status_code == 404
    data = response.json()
    assert "not found" in data["detail"].lower()


def test_empty_code_accepted():
    """Verify empty code defaults cleanly without error."""
    payload = {
        "challenge_id": "py-beg-02-find-largest",
        "code": "",
        "level": 2,
    }
    response = client.post("/hints/generate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["level"] == 2


def test_legacy_field_names_compatibility():
    """Verify backward compatibility with 'student_code' and 'hint_level'."""
    payload = {
        "challenge_id": "py-beg-04-find-duplicates",
        "student_code": "def find_duplicates(nums): return []",
        "hint_level": 3,
    }
    response = client.post("/hints/generate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["level"] == 3
    assert data["hint_level"] == 3
    assert data["max_hints"] == 3


def test_versioned_endpoint_parity():
    """Verify both /hints/generate and /api/v1/hints/generate return identical output."""
    payload = {
        "challenge_id": "py-beg-03-palindrome-check",
        "code": "def is_palindrome(s): pass",
        "level": 1,
        "language": "en",
    }
    res_direct = client.post("/hints/generate", json=payload)
    res_versioned = client.post("/api/v1/hints/generate", json=payload)
    assert res_direct.status_code == 200
    assert res_versioned.status_code == 200
    assert res_direct.json()["hint"] == res_versioned.json()["hint"]


def test_repeated_hint_with_previous_hints():
    """Verify providing previous hints informs progressive generation."""
    payload = {
        "challenge_id": "py-beg-01-reverse-string",
        "code": "def reverse_string(s): return s",
        "level": 2,
        "language": "en",
        "previous_hints": [
            "Think about sequence indexing in Python.",
        ],
    }
    response = client.post("/hints/generate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["level"] == 2


@pytest.mark.asyncio
async def test_gemma_api_error_fallback():
    """Verify HintService falls back gracefully when Gemma throws an exception."""
    with patch("app.services.hint_service.gemma_service.generate", new_callable=AsyncMock) as mock_gen:
        mock_gen.side_effect = Exception("API quota exceeded")
        result = await hint_service.get_hint(
            challenge_id="py-beg-05-two-sum",
            student_code="",
            hint_level=1,
            language="en",
        )
        assert result["success"] is True
        assert result["level"] == 1
        assert "complement" in result["hint"].lower() or "target" in result["hint"].lower()
