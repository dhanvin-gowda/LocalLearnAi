import logging
import os
from typing import Optional
from app.config import get_settings

logger = logging.getLogger(__name__)


class GemmaService:
    """
    Unified LLM service powered by Gemma 4 and the official Google Gen AI Python SDK.
    Supports both Google Gen AI (Gemma 4 / Gemini API) and local Ollama inference.
    Handles rate limits, timeouts, and graceful fallbacks.
    """

    def __init__(self):
        self.settings = get_settings()
        self._client = None
        self._init_client()

    def _get_api_key(self) -> Optional[str]:
        return (
            self.settings.gemini_api_key
            or os.environ.get("GEMINI_API_KEY")
            or os.environ.get("GOOGLE_API_KEY")
        )

    def _get_model_name(self) -> str:
        return (
            os.environ.get("GEMMA_MODEL")
            or getattr(self.settings, "gemma_model", None)
            or "gemma-4-26b-a4b-it"
        )

    def _init_client(self):
        api_key = self._get_api_key()
        if api_key:
            try:
                from google import genai
                self._client = genai.Client(api_key=api_key)
                logger.info(f"Initialized Google Gen AI Client with model {self._get_model_name()}")
            except Exception as e:
                logger.error(f"Failed to initialize google-genai client: {e}")
                self._client = None
        else:
            self._client = None

    async def is_available(self) -> bool:
        """Checks if either Google Gen AI key is present or local Ollama is active."""
        if self._get_api_key():
            return True

        try:
            import httpx
            async with httpx.AsyncClient(timeout=1.5) as client:
                res = await client.get(f"{self.settings.gemma_api_base_url}/api/tags")
                return res.status_code == 200
        except Exception:
            return False

    async def generate(self, prompt: str, system_prompt: Optional[str] = None) -> Optional[str]:
        """
        Executes text generation via Gemma 4 (Google Gen AI) or local endpoint.
        Returns generated text or None if services are unavailable.
        """
        api_key = self._get_api_key()
        model_name = self._get_model_name()

        # 1. Try Google Gen AI SDK
        if api_key:
            try:
                from google import genai
                from google.genai import types

                if not self._client:
                    self._client = genai.Client(api_key=api_key)

                config = types.GenerateContentConfig(
                    system_instruction=system_prompt or "",
                    temperature=0.7,
                    max_output_tokens=1000,
                )

                # Attempt generation with configured model
                try:
                    response = self._client.models.generate_content(
                        model=model_name,
                        contents=prompt,
                        config=config,
                    )
                    if response and response.text:
                        return response.text.strip()
                except Exception as model_err:
                    err_str = str(model_err).lower()
                    logger.warning(f"Generation with {model_name} failed: {model_err}")
                    # If specific Gemma 4 identifier is not found on this API key tier,
                    # try standard fallback model (gemini-2.5-flash / gemini-1.5-flash)
                    if "not found" in err_str or "unsupported" in err_str or "404" in err_str:
                        fallback_models = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-pro"]
                        for fb in fallback_models:
                            try:
                                logger.info(f"Retrying generation with fallback model {fb}")
                                fb_res = self._client.models.generate_content(
                                    model=fb,
                                    contents=prompt,
                                    config=config,
                                )
                                if fb_res and fb_res.text:
                                    return fb_res.text.strip()
                            except Exception:
                                continue
                    raise model_err

            except Exception as e:
                logger.error(f"Google Gen AI SDK generation error: {e}")
                # Fall through to local Ollama if available

        # 2. Try Local Ollama Endpoint if configured
        try:
            import httpx
            async with httpx.AsyncClient(timeout=float(self.settings.gemma_timeout_seconds)) as client:
                payload = {
                    "model": self.settings.gemma_model_name,
                    "prompt": prompt,
                    "system": system_prompt or "",
                    "stream": False,
                }
                res = await client.post(
                    f"{self.settings.gemma_api_base_url}/api/generate",
                    json=payload,
                )
                if res.status_code == 200:
                    data = res.json()
                    output = data.get("response", "")
                    if output:
                        return output.strip()
        except Exception:
            pass

        return None


# Singleton instance
gemma_service = GemmaService()
