import os
from typing import AsyncIterator, Any
from portiere.workers.base import BaseWorker
from portiere.models import SettingsModel

_GROQ_BASE = "https://api.groq.com/openai/v1"
_GROQ_FALLBACK_MODEL = "llama-3.3-70b-versatile"


class ClaudeWorker(BaseWorker):
    name = "claude"
    description = "Deep coding, logic, text analysis, and complex reasoning via Anthropic Claude"

    async def execute(
        self,
        task: str,
        parameters: dict[str, Any],
        context: str = "",
    ) -> AsyncIterator[dict]:
        claude_key = self.settings.claude_api_key or os.environ.get("ANTHROPIC_API_KEY", "")

        if claude_key:
            async for event in self._call_anthropic(task, parameters, context, claude_key):
                yield event
            return

        groq_key = (
            self.settings.groq_api_key
            or (self.settings.brain_api_key if self.settings.brain_provider == "groq" else None)
            or os.environ.get("GROQ_API_KEY", "")
        )
        if groq_key:
            async for event in self._call_groq(task, parameters, context, groq_key):
                yield event
            return

        yield {
            "type": "worker_error",
            "worker": self.name,
            "error": (
                "No writing model configured. Add a Claude API key (best quality) or a "
                "Groq API key (free) in Settings → Vault."
            ),
        }

    async def _call_anthropic(
        self, task: str, parameters: dict, context: str, api_key: str
    ) -> AsyncIterator[dict]:
        try:
            import anthropic
            client = anthropic.AsyncAnthropic(api_key=api_key)
            model = parameters.get("model", self.settings.claude_model)

            messages = []
            if context:
                messages.append({
                    "role": "user",
                    "content": f"Context from previous step:\n{context}\n\n---\n\nTask: {task}",
                })
            else:
                messages.append({"role": "user", "content": task})

            yield {"type": "worker_thinking", "worker": self.name, "content": f"Calling Claude ({model})..."}

            full_response = ""
            async with client.messages.stream(
                model=model,
                max_tokens=parameters.get("max_tokens", 4096),
                messages=messages,
            ) as stream:
                async for text in stream.text_stream:
                    full_response += text
                    yield {"type": "worker_chunk", "worker": self.name, "content": text}

            yield {"type": "worker_done", "worker": self.name, "content": full_response}

        except Exception as e:
            yield {"type": "worker_error", "worker": self.name, "error": str(e)}

    async def _call_groq(
        self, task: str, parameters: dict, context: str, api_key: str
    ) -> AsyncIterator[dict]:
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(base_url=_GROQ_BASE, api_key=api_key)
            model = _GROQ_FALLBACK_MODEL

            prompt = task
            if context:
                prompt = f"Context from previous step:\n{context}\n\n---\n\nTask: {task}"

            yield {"type": "worker_thinking", "worker": self.name, "content": f"Calling Groq ({model})..."}

            full_response = ""
            stream = await client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=parameters.get("max_tokens", 4096),
                stream=True,
            )
            async for chunk in stream:
                text = chunk.choices[0].delta.content or ""
                if text:
                    full_response += text
                    yield {"type": "worker_chunk", "worker": self.name, "content": text}

            yield {"type": "worker_done", "worker": self.name, "content": full_response}

        except Exception as e:
            yield {"type": "worker_error", "worker": self.name, "error": str(e)}
