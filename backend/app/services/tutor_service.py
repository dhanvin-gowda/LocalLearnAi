import logging
from typing import List, Optional
from app.prompts.tutor import format_tutor_prompt, TUTOR_SYSTEM_PROMPT
from app.schemas.tutor import Message, TutorQueryRequest, TutorQueryResponse
from app.services.gemma_service import gemma_service

logger = logging.getLogger(__name__)


class TutorService:
    """
    Handles Socratic guidance, conceptual explanations, and study buddy conversations.
    """

    async def get_tutor_response(self, request: TutorQueryRequest) -> TutorQueryResponse:
        prompt = format_tutor_prompt(
            query=request.query,
            subject=request.subject,
            language=request.language or "english",
        )

        llm_output = await gemma_service.generate(prompt=prompt, system_prompt=TUTOR_SYSTEM_PROMPT)

        # Generate intelligent follow-up suggestions based on subject/query
        followups = self._generate_suggested_followups(request.query, request.subject)

        # If Gemma is not yet active, provide a helpful pedagogical response
        if not await gemma_service.is_available():
            subject_prefix = f" regarding **{request.subject}**" if request.subject else ""
            greeting = "ನಮಸ್ಕಾರ!" if request.language == "kannada" else "नमस्ते!" if request.language == "hindi" else "Hello!"
            response_text = (
                f"{greeting} Great question{subject_prefix}! You asked: *\"{request.query}\"*. "
                "To understand this effectively, think about the fundamental principle involved: "
                "what happens when you break this problem down into its smallest inputs and outputs?"
            )
        else:
            response_text = llm_output

        return TutorQueryResponse(
            response=response_text,
            suggested_followups=followups,
            subject=request.subject,
            language=request.language or "english",
        )

    def _generate_suggested_followups(self, query: str, subject: Optional[str]) -> List[str]:
        base_suggestions = [
            "Can you explain this with a real-world example?",
            "What are the most common edge cases to watch out for?",
            "Could we do a quick 2-question quiz on this concept?",
        ]
        if subject and "physics" in subject.lower():
            return [
                "How does this relate to Newton's laws?",
                "What units are used in standard SI calculations?",
                "Can you show a numerical practice problem?",
            ]
        elif subject and ("code" in subject.lower() or "python" in subject.lower() or "algorithm" in subject.lower()):
            return [
                "What is the time complexity of this approach?",
                "How can I optimize the space complexity?",
                "Can you give me a small hint for my implementation?",
            ]
        return base_suggestions


tutor_service = TutorService()
