from typing import AsyncIterator, Any
import httpx
from portiere.workers.base import BaseWorker

LANG_NAMES = {
    "en": "English", "es": "Spanish", "fr": "French", "de": "German",
    "it": "Italian", "pt": "Portuguese", "ru": "Russian", "zh": "Chinese",
    "ja": "Japanese", "ko": "Korean", "ar": "Arabic", "hi": "Hindi",
    "nl": "Dutch", "pl": "Polish", "sv": "Swedish", "tr": "Turkish",
    "vi": "Vietnamese", "th": "Thai", "id": "Indonesian", "uk": "Ukrainian",
}


class TranslatorWorker(BaseWorker):
    name = "translator"
    description = "Translate text to any language — free, no API key needed. Supports 50+ languages."

    async def execute(self, task: str, parameters: dict[str, Any], context: str = "") -> AsyncIterator[dict]:
        text = parameters.get("text") or context or task
        target = parameters.get("target_lang", "en")
        source = parameters.get("source_lang", "autodetect")

        yield {"type": "worker_thinking", "worker": self.name, "content": f"Translating to {LANG_NAMES.get(target, target)}..."}

        try:
            result = await self._translate(text, source, target)
            target_name = LANG_NAMES.get(target, target.upper())
            source_name = LANG_NAMES.get(result.get("detected_lang", source), "Auto-detected")

            content = f"## Translation → {target_name}\n\n"
            content += f"{result['translated']}\n\n"
            content += f"---\n*Detected source: {source_name}*"

            yield {
                "type": "worker_done",
                "worker": self.name,
                "content": content,
                "data": {
                    "original": text,
                    "translated": result["translated"],
                    "source_lang": result.get("detected_lang", source),
                    "target_lang": target,
                },
            }
        except Exception as e:
            yield {"type": "worker_error", "worker": self.name, "error": f"Translation failed: {e}"}

    async def _translate(self, text: str, source: str, target: str) -> dict:
        lang_pair = f"{source}|{target}" if source != "autodetect" else f"autodetect|{target}"
        async with httpx.AsyncClient(timeout=12) as client:
            r = await client.get(
                "https://api.mymemory.translated.net/get",
                params={"q": text[:1000], "langpair": lang_pair},
            )
            r.raise_for_status()
            data = r.json()
            response_data = data.get("responseData", {})
            translated = response_data.get("translatedText", "")
            detected = data.get("detectedLanguage", {})
            return {
                "translated": translated,
                "detected_lang": detected.get("language", source) if isinstance(detected, dict) else source,
            }
