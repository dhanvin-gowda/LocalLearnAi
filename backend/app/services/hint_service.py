import logging
from typing import Dict, Any, Optional
from app.database import db
from app.prompts.hints import format_hint_prompt
from app.services.gemma_service import gemma_service

logger = logging.getLogger(__name__)


class HintService:
    """
    Delivers progressive tiered hints for learning challenges.
    """

    async def get_hint(
        self,
        challenge_id: str,
        student_code: str = "",
        hint_level: int = 1,
    ) -> Dict[str, Any]:
        challenge = db.get_challenge_by_id(challenge_id)
        if not challenge:
            return {
                "success": False,
                "error": f"Challenge '{challenge_id}' not found.",
                "hint": None,
            }

        available_hints = challenge.get("hints", [])

        # If static hints exist for the challenge, retrieve the corresponding tier
        if available_hints and 0 < hint_level <= len(available_hints):
            hint_text = available_hints[hint_level - 1]
        elif available_hints:
            hint_text = available_hints[-1]
        else:
            # Fallback to LLM prompt generation
            prompt = format_hint_prompt(
                problem_description=challenge.get("description", ""),
                student_code=student_code,
                hint_level=hint_level,
            )
            hint_text = await gemma_service.generate(prompt)

        return {
            "success": True,
            "challenge_id": challenge_id,
            "hint_level": hint_level,
            "max_hints": max(len(available_hints), 3),
            "hint": hint_text,
        }


hint_service = HintService()
