from typing import List, Optional
from pydantic import BaseModel, Field


class Message(BaseModel):
    role: str = Field(..., description="'user', 'assistant', or 'system'")
    content: str


class TutorQueryRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Question or concept the user needs tutoring on")
    subject: Optional[str] = Field(None, description="Subject domain, e.g., 'Physics', 'Python', 'Algorithms'")
    conversation_history: List[Message] = Field(default_factory=list, description="Recent conversation turns")
    language: Optional[str] = Field("english", description="Preferred response language: 'english', 'kannada', 'hindi'")


class TutorQueryResponse(BaseModel):
    response: str
    suggested_followups: List[str] = []
    subject: Optional[str] = None
    language: str = "english"
