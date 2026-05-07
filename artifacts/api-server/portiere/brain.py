import json
import re
from typing import AsyncIterator
from portiere.models import BrainDecision, ChainStep, SettingsModel


SYSTEM_PROMPT = """You are the Brain of Portiere — a personal AI concierge.
Your job: analyze what the user wants and route it to the best specialized workers to GET IT DONE.

Available workers:
- "search"  — Real-time web search: current info, news, flights, hotels, therapists, products, prices, people
- "claude"  — Deep reasoning, coding, writing, drafting emails/resumes, analysis, multi-step logic (needs Claude key)
- "local"   — PC monitoring (CPU/RAM/disk/battery), file system, shell commands
- "osint"   — Domain/IP investigation, WHOIS, DNS, digital footprinting, web recon
- "video"   — AI video generation via FAL.ai / Seedance (needs video API key)

Routing rules:
- "search" for: anything needing current/real data — flights, therapists, restaurants, news, prices, trends, people
- "claude" for: writing, coding, analysis, drafting, emails, resumes, explanations, complex reasoning
- chain [search → claude] for: "find X and write Y about it", "research X then summarize"
- "local" for: system monitoring, file operations
- "osint" for: domain/IP investigation, company digital footprint

You MUST respond with ONLY a valid JSON object — no markdown, no prose, just JSON:
{
  "chain": [
    {
      "step": 1,
      "worker": "<worker_name>",
      "task": "<specific task for the worker, written as a clear instruction>",
      "parameters": {}
    }
  ],
  "reasoning": "<one short sentence explaining your routing>"
}

Examples:
- "Find a therapist in Brooklyn who takes insurance" → search, task: "therapist brooklyn ny accepts insurance"
- "Plan a trip to Milan for next weekend" → chain: [search (flights + hotels milan), claude (write full itinerary)]
- "Write a cold email to a startup founder" → claude
- "Build a to-do app in Python" → claude
- "What's trending in AI today?" → search, task: "AI news trending today"
- "Check my CPU and RAM usage" → local
- "Scan the footprint of competitor.com" → osint"""


class Brain:
    def __init__(self, settings: SettingsModel):
        self.settings = settings

    async def analyze(self, user_input: str, file_content: str = "") -> AsyncIterator[dict]:
        yield {"type": "brain_thinking", "content": "Understanding your request..."}

        prompt = user_input
        if file_content:
            prompt = f"User request: {user_input}\n\nFile content:\n{file_content[:3000]}"

        try:
            decision_json = await self._call_llm(prompt)
            yield {"type": "brain_thinking", "content": "Routing to the right tools..."}

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
        elif provider == "openai":
            return await self._call_openai_compat(
                prompt,
                base_url="https://api.openai.com/v1",
                api_key=self.settings.brain_api_key or self.settings.openai_api_key,
            )
        elif provider == "lmstudio":
            return await self._call_openai_compat(
                prompt, base_url=self.settings.lmstudio_base_url, api_key="lm-studio",
            )
        else:
            return await self._call_openai_compat(
                prompt, base_url=self.settings.brain_base_url,
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
