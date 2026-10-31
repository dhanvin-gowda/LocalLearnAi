import asyncio
import logging
import os
from typing import Any, Dict, Optional
import httpx
from app.config import get_settings

logger = logging.getLogger(__name__)


class GemmaService:
    """
    Unified LLM service powered by Gemini / Gemma 4 and local Ollama inference.
    If the network is online and healthy, queries Google Gen AI (Gemini / Gemma).
    If offline or if Gemini times out (>2.5s), immediately falls back to local Ollama (llama3.2).
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
            or "gemini-2.5-flash-lite"
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

        for base_url in [
            getattr(self.settings, "ollama_base_url", "http://127.0.0.1:11434"),
            "http://127.0.0.1:11434",
            "http://localhost:11434",
        ]:
            try:
                async with httpx.AsyncClient(timeout=1.0) as client:
                    res = await client.get(f"{base_url}/api/tags")
                    if res.status_code == 200:
                        return True
            except Exception:
                continue
        return False

    async def generate_with_meta(self, prompt: str, system_prompt: Optional[str] = None) -> Dict[str, Any]:
        """
        Executes text generation.
        1. Tries Google Gen AI (Gemini / Gemma) with a 2.5s network timeout.
        2. If network is offline, slow, or unavailable, seamlessly falls back to local Ollama (llama3.2).
        Returns dict with keys: text, source ('gemini' | 'ollama'), is_offline (bool), model (str).
        """
        api_key = self._get_api_key()
        model_name = self._get_model_name()

        # 1. Try Google Gen AI SDK with fast 2.5s timeout for rapid offline detection
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

                def _call_gemini(m_name: str):
                    resp = self._client.models.generate_content(
                        model=m_name,
                        contents=prompt,
                        config=config,
                    )
                    return resp.text.strip() if resp and resp.text else None

                # Execute with 2.5s timeout so offline / slow network is detected quickly
                try:
                    text = await asyncio.wait_for(
                        asyncio.to_thread(_call_gemini, model_name),
                        timeout=2.5,
                    )
                    if text:
                        return {
                            "text": text,
                            "source": "gemini",
                            "is_offline": False,
                            "model": f"Gemini ({model_name})",
                        }
                except (asyncio.TimeoutError, Exception) as online_err:
                    logger.warning(
                        f"Google Gen AI ({model_name}) timed out or network offline (fallback to Ollama): {online_err}"
                    )

            except Exception as e:
                logger.warning(f"Google Gen AI SDK error: {e}")

        # 2. Try Local Ollama Endpoint (llama3.2)
        ollama_model = getattr(self.settings, "ollama_model", "llama3.2:latest")
        ollama_urls = [
            getattr(self.settings, "ollama_base_url", "http://127.0.0.1:11434"),
            "http://127.0.0.1:11434",
            "http://localhost:11434",
        ]

        seen_urls = set()
        for base_url in ollama_urls:
            if not base_url or base_url in seen_urls:
                continue
            seen_urls.add(base_url)

            # Try /api/chat first
            try:
                async with httpx.AsyncClient(
                    timeout=float(getattr(self.settings, "gemma_timeout_seconds", 30))
                ) as client:
                    chat_payload = {
                        "model": ollama_model,
                        "messages": [
                            {"role": "system", "content": system_prompt or ""},
                            {"role": "user", "content": prompt},
                        ],
                        "stream": False,
                    }
                    res = await client.post(f"{base_url}/api/chat", json=chat_payload)
                    if res.status_code == 200:
                        data = res.json()
                        content = data.get("message", {}).get("content", "")
                        if content and content.strip():
                            logger.info(
                                f"Generated response locally via Ollama ({ollama_model}) at {base_url}"
                            )
                            return {
                                "text": content.strip(),
                                "source": "ollama",
                                "is_offline": True,
                                "model": f"Ollama ({ollama_model}) [Offline / Local]",
                            }
            except Exception as ollama_chat_err:
                logger.debug(f"Ollama chat error at {base_url}: {ollama_chat_err}")

            # Try /api/generate as secondary
            try:
                async with httpx.AsyncClient(
                    timeout=float(getattr(self.settings, "gemma_timeout_seconds", 30))
                ) as client:
                    gen_payload = {
                        "model": ollama_model,
                        "prompt": prompt,
                        "system": system_prompt or "",
                        "stream": False,
                    }
                    res = await client.post(f"{base_url}/api/generate", json=gen_payload)
                    if res.status_code == 200:
                        data = res.json()
                        output = data.get("response", "")
                        if output and output.strip():
                            return {
                                "text": output.strip(),
                                "source": "ollama",
                                "is_offline": True,
                                "model": f"Ollama ({ollama_model}) [Offline / Local]",
                            }
            except Exception as ollama_gen_err:
                logger.debug(f"Ollama generate error at {base_url}: {ollama_gen_err}")

        return {
            "text": None,
            "source": "none",
            "is_offline": True,
            "model": "LocalLearn AI Engine",
        }

    async def generate(self, prompt: str, system_prompt: Optional[str] = None) -> Optional[str]:
        """Convenience method returning just the generated string."""
        meta = await self.generate_with_meta(prompt=prompt, system_prompt=system_prompt)
        return meta.get("text")


# Singleton instance
gemma_service = GemmaService()
