import json
import re
from typing import AsyncIterator
from portiere.models import BrainDecision, ChainStep, SettingsModel


SYSTEM_PROMPT = """You are the Brain of Portiere — an AI orchestration system.
Analyze the user's request and route it to the correct specialized workers.

Available workers:
- "claude"  — Deep coding, logic, text analysis, debugging, complex reasoning (requires Claude API key)
- "video"   — Video generation and manipulation via FAL.ai / Seedance (requires video API key)
- "local"   — File system operations, PC monitoring (CPU/RAM/disk), shell commands
- "osint"   — Domain/IP WHOIS, DNS lookup, HTTP probing, email analysis, digital footprinting

You MUST respond with ONLY a valid JSON object. No prose, no markdown, just JSON:
{
  "chain": [
    {
      "step": 1,
      "worker": "<worker_name>",
      "task": "<specific task description for the worker>",
      "parameters": {}
    }
  ],
  "reasoning": "<one sentence explaining routing decision>"
}

For chained tasks (e.g. "summarize this script and generate a video preview"):
- Use multiple steps in the chain array
- Each step's output is passed as "context" to the next step
- Order steps logically

Examples:
- "What is my CPU usage?" → local worker, action: monitor
- "Write a Python function to parse JSON" → claude worker
- "Generate a 5-second video of a sunset" → video worker
- "Look up information about google.com" → osint worker
- "Summarize this file and make a video" → chain: [claude, video]"""


class Brain:
    def __init__(self, settings: SettingsModel):
        self.settings = settings

    async def analyze(self, user_input: str, file_content: str = "") -> AsyncIterator[dict]:
        yield {"type": "brain_thinking", "content": "Analyzing request..."}

        prompt = user_input
        if file_content:
            prompt = f"User request: {user_input}\n\nFile content provided:\n{file_content[:3000]}"

        try:
            decision_json = await self._call_llm(prompt)
            yield {"type": "brain_thinking", "content": "Parsing routing decision..."}

            decision = self._parse_decision(decision_json)
            yield {
                "type": "brain_decision",
                "content": decision.reasoning,
                "data": decision.model_dump(),
            }
            yield {"type": "brain_done", "data": decision.model_dump()}

        except Exception as e:
            yield {"type": "brain_error", "error": f"Brain error: {str(e)}"}

    async def _call_llm(self, prompt: str) -> str:
        provider = self.settings.brain_provider.lower()

        if provider == "anthropic":
            return await self._call_anthropic(prompt)
        elif provider in ("openai",):
            return await self._call_openai_compat(
                prompt,
                base_url="https://api.openai.com/v1",
                api_key=self.settings.brain_api_key or self.settings.openai_api_key,
            )
        elif provider == "lmstudio":
            return await self._call_openai_compat(
                prompt,
                base_url=self.settings.lmstudio_base_url,
                api_key="lm-studio",
            )
        else:
            return await self._call_openai_compat(
                prompt,
                base_url=self.settings.brain_base_url,
                api_key=self.settings.brain_api_key or "ollama",
            )

    async def _call_anthropic(self, prompt: str) -> str:
        import anthropic
        client = anthropic.AsyncAnthropic(api_key=self.settings.brain_api_key or self.settings.claude_api_key)
        message = await client.messages.create(
            model=self.settings.brain_model,
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )
        return message.content[0].text

    async def _call_openai_compat(self, prompt: str, base_url: str, api_key: str) -> str:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(base_url=base_url, api_key=api_key or "none")
        response = await client.chat.completions.create(
            model=self.settings.brain_model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            max_tokens=1024,
            temperature=0.1,
        )
        return response.choices[0].message.content

    def _parse_decision(self, raw: str) -> BrainDecision:
        raw = raw.strip()
        json_match = re.search(r'\{.*\}', raw, re.DOTALL)
        if json_match:
            raw = json_match.group(0)

        data = json.loads(raw)
        chain = [ChainStep(**step) for step in data.get("chain", [])]
        if not chain:
            raise ValueError("Brain returned empty chain")
        return BrainDecision(chain=chain, reasoning=data.get("reasoning", ""))
