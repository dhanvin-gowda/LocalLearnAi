from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    """Verify GET /health returns status 200 and 'healthy'."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "timestamp" in data
    assert data["version"] == "1.0.0"


def test_root_endpoint():
    """Verify GET / returns welcome metadata and docs links."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert data["docs"] == "/docs"
    assert data["health"] == "/health"


def test_list_challenges():
    """Verify challenges endpoint returns list of seeded challenges."""
    response = client.get("/api/v1/challenges")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert "id" in data[0]
    assert "title" in data[0]


def test_get_challenge_detail():
    """Verify single challenge detail endpoint."""
    response = client.get("/api/v1/challenges/py-beg-05-two-sum")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "py-beg-05-two-sum"
    assert "starter_code" in data
    assert len(data["test_cases"]) > 0


def test_tutor_chat():
    """Verify tutor chat endpoint accepts question and returns guidance."""
    payload = {
        "query": "What is Newton's second law of motion?",
        "subject": "Physics",
        "language": "english",
    }
    response = client.post("/api/v1/tutor/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "response" in data
    assert len(data["suggested_followups"]) > 0


def test_hints_generate():
    """Verify progressive hint generation."""
    payload = {
        "challenge_id": "py-beg-05-two-sum",
        "student_code": "def two_sum(): pass",
        "hint_level": 1,
    }
    response = client.post("/api/v1/hints/generate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["hint_level"] == 1
    assert data["hint"] is not None


def test_code_review():
    """Verify code review endpoint evaluates code without errors."""
    payload = {
        "code": "def add(a, b):\n    return a + b",
        "language": "python",
    }
    response = client.post("/api/v1/review/code", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "score" in data
    assert data["score"] >= 0
    assert "summary" in data


def test_user_progress():
    """Verify user progress tracking."""
    response = client.get("/api/v1/progress/test_user_42")
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == "test_user_42"
    assert "total_points" in data
