from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

FORBIDDEN_SOLUTION_KEYS = [
    "solution",
    "solution_code",
    "hidden_test_cases",
    "hidden_tests",
    "reference_solution",
]


def test_get_all_challenges_endpoint():
    """
    Test GET /challenges:
    - Reads from challenges.json
    - Returns structured JSON array of 5 challenges
    - Never exposes hidden solutions or hidden test cases
    """
    response = client.get("/challenges")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 5

    expected_ids = [
        "py-beg-01-reverse-string",
        "py-beg-02-find-largest",
        "py-beg-03-palindrome-check",
        "py-beg-04-find-duplicates",
        "py-beg-05-two-sum",
    ]
    returned_ids = [c["id"] for c in data]
    for eid in expected_ids:
        assert eid in returned_ids, f"Expected challenge {eid} in response"

    # Verify structured fields & secrecy of solutions
    for item in data:
        assert "id" in item
        assert "title" in item
        assert "description" in item
        assert "difficulty" in item
        assert "topic" in item
        assert "starter_code" in item
        assert "constraints" in item
        assert "learning_objectives" in item
        assert "input_output_examples" in item

        # Verify NO hidden solutions leaked
        for forbidden in FORBIDDEN_SOLUTION_KEYS:
            assert forbidden not in item, f"Key '{forbidden}' was leaked in GET /challenges!"


def test_get_challenges_filtered_by_difficulty():
    """
    Test GET /challenges?difficulty=...:
    - Support difficulty filtering
    """
    # All 5 challenges are 'Beginner'
    res_beginner = client.get("/challenges?difficulty=Beginner")
    assert res_beginner.status_code == 200
    data_beginner = res_beginner.json()
    assert len(data_beginner) == 5
    for item in data_beginner:
        assert item["difficulty"].lower() == "beginner"

    # Case-insensitive query
    res_case = client.get("/challenges?difficulty=beginner")
    assert res_case.status_code == 200
    assert len(res_case.json()) == 5

    # Non-existent difficulty should return empty list
    res_hard = client.get("/challenges?difficulty=Hard")
    assert res_hard.status_code == 200
    assert res_hard.json() == []


def test_get_challenges_filtered_by_topic():
    """
    Test GET /challenges?topic=...:
    - Support topic filtering
    """
    # Filter by 'Strings'
    res_strings = client.get("/challenges?topic=Strings")
    assert res_strings.status_code == 200
    data_strings = res_strings.json()
    assert len(data_strings) >= 1
    assert any(c["id"] == "py-beg-01-reverse-string" for c in data_strings)

    # Filter by 'Arrays & Lists'
    res_arrays = client.get("/challenges?topic=Arrays%20%26%20Lists")
    assert res_arrays.status_code == 200
    data_arrays = res_arrays.json()
    assert len(data_arrays) >= 1
    assert any(c["id"] == "py-beg-02-find-largest" for c in data_arrays)

    # Non-existent topic
    res_none = client.get("/challenges?topic=QuantumComputing")
    assert res_none.status_code == 200
    assert res_none.json() == []


def test_get_challenge_by_id_success():
    """
    Test GET /challenges/{challenge_id}:
    - Returns full structured details
    - Never exposes hidden solutions or hidden tests
    """
    response = client.get("/challenges/py-beg-01-reverse-string")
    assert response.status_code == 200
    data = response.json()

    assert data["id"] == "py-beg-01-reverse-string"
    assert data["title"] == "Reverse a String"
    assert data["difficulty"] == "Beginner"
    assert data["topic"] == "Strings"
    assert "def reverse_string" in data["starter_code"]
    assert len(data["test_cases"]) > 0
    assert len(data["hints"]) > 0
    assert len(data["input_output_examples"]) > 0

    # Ensure hidden solutions are NEVER exposed
    for forbidden in FORBIDDEN_SOLUTION_KEYS:
        assert forbidden not in data, f"Key '{forbidden}' was leaked in GET /challenges/{{id}}!"


def test_get_challenge_by_id_not_found():
    """
    Test GET /challenges/{challenge_id}:
    - Return 404 for unknown challenge IDs
    """
    response = client.get("/challenges/non-existent-challenge-id-12345")
    assert response.status_code == 404
    error_data = response.json()
    assert "detail" in error_data
    assert "not found" in error_data["detail"].lower()


def test_api_v1_versioned_endpoint_parity():
    """
    Ensure /api/v1/challenges and /api/v1/challenges/{id} also work identically.
    """
    res1 = client.get("/api/v1/challenges")
    assert res1.status_code == 200
    assert len(res1.json()) == 5

    res2 = client.get("/api/v1/challenges/py-beg-05-two-sum")
    assert res2.status_code == 200
    assert res2.json()["id"] == "py-beg-05-two-sum"

    res3 = client.get("/api/v1/challenges/unknown-id")
    assert res3.status_code == 404
