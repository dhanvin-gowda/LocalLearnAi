"""
Pydantic schemas for the Progressive AI Hint System.
Supports 3 progressive tiers:
- Level 1: Conceptual Clue
- Level 2: Problem-Solving Approach
- Level 3: Detailed Guidance & Blueprint
"""

from typing import List, Optional
from pydantic import BaseModel, Field, model_validator


class HintRequest(BaseModel):
    challenge_id: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Target challenge identifier (e.g. py-beg-01-reverse-string)",
    )
    code: Optional[str] = Field(
        None,
        max_length=15000,
        description="Current Python code written by the student",
    )
    student_code: Optional[str] = Field(
        None,
        max_length=15000,
        description="Alias for student's code (backward compatibility)",
    )
    level: Optional[int] = Field(
        None,
        ge=1,
        le=3,
        description="Progressive hint level: 1 (Conceptual Clue), 2 (Approach), 3 (Detailed Guidance)",
    )
    hint_level: Optional[int] = Field(
        None,
        ge=1,
        le=3,
        description="Alias for hint level (backward compatibility)",
    )
    language: Optional[str] = Field(
        "en",
        description="Language code for hint generation: 'en' (English), 'kn' (Kannada), 'hi' (Hindi)",
    )
    previous_hints: Optional[List[str]] = Field(
        default_factory=list,
        description="List of hints already revealed for this challenge",
    )

    @model_validator(mode="before")
    @classmethod
    def normalize_fields(cls, data: dict):
        if not isinstance(data, dict):
            return data

        # Normalize level / hint_level
        lvl = data.get("level")
        hlvl = data.get("hint_level")
        resolved_level = lvl if lvl is not None else (hlvl if hlvl is not None else 1)
        data["level"] = resolved_level
        data["hint_level"] = resolved_level

        # Normalize code / student_code
        c = data.get("code")
        sc = data.get("student_code")
        resolved_code = c if c is not None else (sc if sc is not None else "")
        data["code"] = resolved_code
        data["student_code"] = resolved_code

        # Normalize language
        lang = str(data.get("language") or "en").lower().strip()
        if lang in ("kn", "kannada"):
            data["language"] = "kn"
        elif lang in ("hi", "hindi"):
            data["language"] = "hi"
        else:
            data["language"] = "en"

        return data


class HintResponse(BaseModel):
    success: bool = Field(True, description="Whether the hint was generated successfully")
    challenge_id: str = Field(..., description="Challenge identifier")
    level: int = Field(..., ge=1, le=3, description="Hint tier (1, 2, or 3)")
    hint_level: int = Field(..., ge=1, le=3, description="Alias for level (backward compatibility)")
    max_hints: int = Field(3, description="Maximum progressive hint levels available")
    hint: str = Field(..., description="Pedagogical progressive hint content")
    next_action: str = Field(..., description="Concrete next step or guiding question for the student")
    language: str = Field("en", description="Language of the hint: 'en', 'kn', or 'hi'")
    error: Optional[str] = Field(None, description="Error message if generation failed")
