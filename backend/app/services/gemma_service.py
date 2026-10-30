import logging
from typing import Optional
from app.config import get_settings

logger = logging.getLogger(__name__)


class GemmaService:
    """
    Modular abstraction for Gemma LLM inference.
    Supports local Ollama or vLLM endpoints when configured.
    Provides safe fallback when model server is not connected.
    """

    def __init__(self):
        self.settings = get_settings()
        self.base_url = self.settings.gemma_api_base_url
        self.model_name = self.settings.gemma_model_name

    async def is_available(self) -> bool:
        """Checks if Gemma backend server is accessible."""
        try:
            import httpx
            async with httpx.AsyncClient(timeout=2.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                return res.status_code == 200
        except Exception:
            return False

    async def generate(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """
        Executes text generation via Gemma endpoint.
        Returns graceful placeholder response if Gemma is not yet connected.
        """
        available = await self.is_available()
        if not available:
            logger.info("Gemma service endpoint not active. Using modular pedagogical fallback.")
            return (
                "LocalLearn AI Tutor: I am ready to guide you! Gemma integration is prepared and will "
                "be activated when the local model service is started."
            )

        try:
            import httpx
            async with httpx.AsyncClient(timeout=float(self.settings.gemma_timeout_seconds)) as client:
                payload = {
                    "model": self.model_name,
                    "prompt": prompt,
                    "system": system_prompt or "",
                    "stream": False,
                }
                res = await client.post(f"{self.base_url}/api/generate", json=payload)
                if res.status_code == 200:
                    data = res.json()
                    return data.get("response", "")
                else:
                    return f"Gemma service returned status {res.status_code}."
        except Exception as e:
            logger.error(f"Error calling Gemma service: {e}")
            return "Unable to communicate with Gemma service at this moment."


# Singleton instance
gemma_service = GemmaService()
