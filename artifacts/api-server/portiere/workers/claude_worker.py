from typing import AsyncIterator, Any
from portiere.workers.base import BaseWorker
from portiere.models import SettingsModel


class ClaudeWorker(BaseWorker):
    name = "claude"
    description = "Deep coding, logic, text analysis, and complex reasoning via Anthropic Claude"

    async def execute(
        self,
        task: str,
        parameters: dict[str, Any],
        context: str = "",
    ) -> AsyncIterator[dict]:
        if not self.settings.claude_api_key:
            yield {"type": "worker_error", "worker": self.name, "error": "Claude API key not configured. Add it in Settings > Vault."}
            return

        try:
            import anthropic
            client = anthropic.AsyncAnthropic(api_key=self.settings.claude_api_key)
            model = parameters.get("model", self.settings.claude_model)

            messages = []
            if context:
                messages.append({
                    "role": "user",
                    "content": f"Context from previous step:\n{context}\n\n---\n\nTask: {task}"
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
