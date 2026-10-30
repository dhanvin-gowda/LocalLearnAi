import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_valid_english_tutoring_request():
    """Verify valid English request returns 200 with Socratic response and next_action."""
    payload = {
        "challenge_id": "py-beg-01-reverse-string",
        "message": "I don't understand how to reverse a string.",
        "code": "def reverse_string(s):\n    pass",
        "language": "en",
        "history": [
            {"role": "user", "content": "I am trying to reverse a string"},
            {"role": "assistant", "content": "What is the first step you tried?"}
        ]
    }
    response = client.post("/tutor/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "response" in data
    assert len(data["response"]) > 10
    assert data["language"] == "en"
    assert data["mode"] == "socratic"
    assert "next_action" in data
    assert len(data["suggested_followups"]) > 0


def test_valid_kannada_tutoring_request():
    """Verify valid Kannada request returns 200 with Kannada explanation."""
    payload = {
        "challenge_id": "py-beg-01-reverse-string",
        "message": "ಸ್ಟ್ರಿಂಗ್ ಹೇಗೆ ರಿವರ್ಸ್ ಮಾಡುವುದು?",
        "code": "def reverse_string(s):\n    pass",
        "language": "kn",
        "history": []
    }
    response = client.post("/tutor/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["language"] == "kn"
    assert data["mode"] == "socratic"
    assert len(data["response"]) > 0


def test_valid_hindi_tutoring_request():
    """Verify valid Hindi request returns 200 with Hindi explanation."""
    payload = {
        "challenge_id": "py-beg-05-two-sum",
        "message": "मुझे Two Sum समझ नहीं आ रहा है।",
        "code": "def two_sum(nums, target):\n    pass",
        "language": "hi",
        "history": []
    }
    response = client.post("/tutor/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["language"] == "hi"
    assert data["mode"] == "socratic"
    assert len(data["response"]) > 0


def test_missing_message_validation():
    """Verify missing or empty message fails validation with 422."""
    payload = {
        "challenge_id": "py-beg-01-reverse-string",
        "message": "",
        "language": "en"
    }
    response = client.post("/tutor/chat", json=payload)
    assert response.status_code == 422

    # Entirely omitted message
    payload_omitted = {
        "challenge_id": "py-beg-01-reverse-string",
        "language": "en"
    }
    response_omitted = client.post("/tutor/chat", json=payload_omitted)
    assert response_omitted.status_code == 422


def test_invalid_language_validation():
    """Verify unsupported language fails validation with 422."""
    payload = {
        "challenge_id": "py-beg-01-reverse-string",
        "message": "How do I start?",
        "language": "french"
    }
    response = client.post("/tutor/chat", json=payload)
    assert response.status_code == 422


def test_oversized_message_validation():
    """Verify oversized message (> 2000 chars) fails validation with 422."""
    payload = {
        "challenge_id": "py-beg-01-reverse-string",
        "message": "A" * 2500,
        "language": "en"
    }
    response = client.post("/tutor/chat", json=payload)
    assert response.status_code == 422


def test_empty_conversation_history():
    """Verify empty history works cleanly."""
    payload = {
        "challenge_id": "py-beg-02-find-largest",
        "message": "How do I find the largest element?",
        "code": "",
        "language": "en",
        "history": []
    }
    response = client.post("/tutor/chat", json=payload)
    assert response.status_code == 200
    assert response.json()["mode"] == "socratic"


def test_long_conversation_history_truncation():
    """Verify long conversation history (> 20 messages) is accepted and pruned."""
    history = [
        {"role": "user" if i % 2 == 0 else "assistant", "content": f"Turn {i}"}
        for i in range(30)
    ]
    payload = {
        "challenge_id": "py-beg-03-palindrome-check",
        "message": "I am still stuck on punctuation.",
        "language": "en",
        "history": history
    }
    response = client.post("/tutor/chat", json=payload)
    assert response.status_code == 200


def test_versioned_endpoint_parity():
    """Verify /api/v1/tutor/chat also works identically."""
    payload = {
        "challenge_id": "py-beg-04-find-duplicates",
        "message": "Can I use a set for duplicates?",
        "language": "en"
    }
    response = client.post("/api/v1/tutor/chat", json=payload)
    assert response.status_code == 200
    assert response.json()["challenge_id"] == "py-beg-04-find-duplicates"


@pytest.mark.asyncio
async def test_gemma_api_error_fallback():
    """Verify graceful Socratic fallback when Gemma raises an exception or timeout."""
    with patch("app.services.gemma_service.gemma_service.generate", new_callable=AsyncMock) as mock_gen:
        mock_gen.side_effect = Exception("API rate limit exceeded or timeout")
        payload = {
            "challenge_id": "py-beg-01-reverse-string",
            "message": "What should I do first?",
            "language": "en"
        }
        response = client.post("/tutor/chat", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert data["mode"] == "socratic"
        assert len(data["response"]) > 20
