from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field, field_validator, model_validator


class Message(BaseModel):
    role: str = Field(..., description="'user' or 'assistant'")
    content: str = Field(..., max_length=4000, description="Message text content")

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        role_clean = v.strip().lower()
        if role_clean in ("user", "student"):
            return "user"
        if role_clean in ("assistant", "tutor", "ai"):
            return "assistant"
        raise ValueError("Role must be 'user' or 'assistant'.")


class TutorQueryRequest(BaseModel):
    challenge_id: Optional[str] = Field(None, max_length=120, description="Target challenge identifier")
    challenge_title: Optional[str] = Field(None, max_length=200, description="Title of the challenge")
    problem_statement: Optional[str] = Field(None, max_length=5000, description="Problem description")
    message: Optional[str] = Field(None, max_length=2000, description="Student question or query")
    query: Optional[str] = Field(None, max_length=2000, description="Alias for message")
    code: Optional[str] = Field("", max_length=15000, description="Current student Python code")
    language: Optional[str] = Field("en", description="Preferred language ('en', 'kn', 'hi', or full names)")
    history: List[Message] = Field(default_factory=list, description="Recent conversation turns")
    conversation_history: Optional[List[Message]] = Field(None, description="Alias for history")
    subject: Optional[str] = Field("Python / DSA", description="Subject context")

    @model_validator(mode="before")
    @classmethod
    def harmonize_fields(cls, values: Any) -> Any:
        if isinstance(values, dict):
            # Harmonize message vs query
            if not values.get("message") and values.get("query"):
                values["message"] = values.get("query")
            elif not values.get("query") and values.get("message"):
                values["query"] = values.get("message")

            # Harmonize history vs conversation_history
            if not values.get("history") and values.get("conversation_history"):
                values["history"] = values.get("conversation_history")

            # Check that message has substance
            msg = values.get("message")
            if not msg or not str(msg).strip():
                raise ValueError("A student question or message is required.")

            # Limit history to latest 20 messages to keep context manageable
            hist = values.get("history") or []
            if len(hist) > 20:
                values["history"] = hist[-20:]

            # Normalize language to 'en', 'kn', or 'hi'
            lang = (values.get("language") or "en").strip().lower()
            if lang in ("en", "english"):
                values["language"] = "en"
            elif lang in ("kn", "kannada"):
                values["language"] = "kn"
            elif lang in ("hi", "hindi"):
                values["language"] = "hi"
            else:
                raise ValueError("Unsupported language. Supported languages are 'en', 'kn', and 'hi'.")

        return values


class TutorQueryResponse(BaseModel):
    response: str = Field(..., description="Socratic AI guiding response")
    language: str = Field("en", description="'en', 'kn', or 'hi'")
    mode: str = Field("socratic", description="Pedagogical response mode")
    next_action: Optional[str] = Field(None, description="Suggested next problem-solving step for the student")
    suggested_followups: List[str] = Field(default_factory=list, description="Followup question prompts")
    challenge_id: Optional[str] = None
    subject: Optional[str] = "Python / DSA"
