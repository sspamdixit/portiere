import json
import re
from typing import AsyncIterator
from portiere.models import BrainDecision, ChainStep, SettingsModel


BASE_SYSTEM_PROMPT = """You are the Brain of Portiere — a personal AI concierge.
Your job: analyze what the user wants and route it to the best specialized workers to GET IT DONE.

Available workers:
- "search"      — Real-time web search: flights, hotels, therapists, restaurants, news, prices, events, reviews, products
- "weather"     — Current weather and 7-day forecast for any city worldwide (no API key needed)
- "claude"      — Deep reasoning, coding, writing, drafting emails/resumes, analysis, planning, explanations
- "email"       — Compose and send emails (drafts a mailto link or sends via SMTP if configured)
- "code_runner" — Execute Python code directly and show the output
- "local"       — PC monitoring (CPU/RAM/disk/battery), file system operations, shell commands
- "osint"       — Domain/IP investigation, WHOIS, DNS, company digital footprint, web recon
- "video"       — AI video generation via FAL.ai / Seedance (needs video API key)

Routing rules (pick the best single worker or chain):
- "search"      → anything needing current real-world data: flights, therapists, restaurants, people, events, news, prices
- "weather"     → any weather, forecast, temperature, climate question for any location
- "claude"      → writing, coding, analysis, emails, resumes, plans, explanations — anything requiring deep reasoning
- "email"       → when user explicitly wants to SEND or DRAFT an email to a specific address
- "code_runner" → when user wants to RUN or EXECUTE code, not just write it
- chain [search → claude] → "research X then write Y", "find X then plan Y", "look up X and summarize"
- chain [claude → email]  → "write AND send an email to X@y.com about Z"
- chain [claude → code_runner] → "write a script that does X and run it"
- "local"       → system monitoring, checking CPU/RAM/disk, reading files, running shell commands
- "osint"       → domain investigation, WHOIS lookup, checking if a website is legitimate
- "video"       → generating an AI video from a text prompt

IMPORTANT: Use "weather" not "search" for weather questions. Use "email" only when sending/drafting to an address.

You MUST respond with ONLY a valid JSON object — no markdown, no prose, just JSON:
{
  "chain": [
    {
      "step": 1,
      "worker": "<worker_name>",
      "task": "<specific, concrete task instruction>",
      "parameters": {}
    }
  ],
  "reasoning": "<one short sentence>"
}

Chain examples:
- "Plan a weekend trip to Milan" → [search(flights+hotels milan), claude(write itinerary with recommendations)]
- "Find a therapist in Brooklyn who takes Aetna" → [search(therapist brooklyn aetna insurance)]
- "What's the weather in Tokyo?" → [weather(Tokyo)]
- "Write and send an email to john@acme.com about the project update" → [claude(compose professional email about project update), email(to: john@acme.com)]
- "Write a Python script that generates a Fibonacci sequence and run it" → [claude(write fibonacci python script), code_runner]
- "Help me write my resume" → [claude]
- "What's trending in AI today?" → [search(AI artificial intelligence news trending today)]
- "Check my CPU and RAM" → [local]"""


def build_system_prompt(settings: SettingsModel) -> str:
    prompt = BASE_SYSTEM_PROMPT

    profile_parts = []
    if settings.profile_name:
        profile_parts.append(f"Name: {settings.profile_name}")
    if settings.profile_city:
        profile_parts.append(f"Location: {settings.profile_city}")
    if settings.profile_occupation:
        profile_parts.append(f"Occupation: {settings.profile_occupation}")
    if settings.profile_preferences:
        profile_parts.append(f"Preferences: {settings.profile_preferences}")

    if profile_parts:
        prompt += "\n\nUser profile — personalize routing and tasks using this:\n"
        prompt += "\n".join(f"- {p}" for p in profile_parts)
        prompt += (
            "\n(e.g. 'near me' → use the location above; "
            "sign composed emails with the user's name; "
            "use preferences when choosing hotels, flights, or making recommendations)"
        )

    return prompt


class Brain:
    def __init__(self, settings: SettingsModel):
        self.settings = settings

    async def analyze(
        self,
        user_input: str,
        file_content: str = "",
        prev_context: str = "",
    ) -> AsyncIterator[dict]:
        yield {"type": "brain_thinking", "content": "Understanding your request..."}

        prompt = user_input
        if file_content:
            prompt += f"\n\nFile content:\n{file_content[:3000]}"
        if prev_context:
            prompt = (
                f"Previous conversation result (context for this follow-up):\n"
                f"{prev_context[:1200]}\n\n"
                f"---\nNew request: {user_input}"
            )

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
        system = build_system_prompt(self.settings)

        if provider == "anthropic":
            return await self._call_anthropic(prompt, system)
        elif provider == "openai":
            return await self._call_openai_compat(
                prompt, system,
                base_url="https://api.openai.com/v1",
                api_key=self.settings.brain_api_key or self.settings.openai_api_key,
            )
        elif provider == "lmstudio":
            return await self._call_openai_compat(
                prompt, system,
                base_url=self.settings.lmstudio_base_url,
                api_key="lm-studio",
            )
        else:
            return await self._call_openai_compat(
                prompt, system,
                base_url=self.settings.brain_base_url,
                api_key=self.settings.brain_api_key or "ollama",
            )

    async def _call_anthropic(self, prompt: str, system: str) -> str:
        import anthropic
        client = anthropic.AsyncAnthropic(
            api_key=self.settings.brain_api_key or self.settings.claude_api_key
        )
        message = await client.messages.create(
            model=self.settings.brain_model,
            max_tokens=1024,
            system=system,
            messages=[{"role": "user", "content": prompt}],
        )
        return message.content[0].text

    async def _call_openai_compat(self, prompt: str, system: str, base_url: str, api_key: str) -> str:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(base_url=base_url, api_key=api_key or "none")
        response = await client.chat.completions.create(
            model=self.settings.brain_model,
            messages=[
                {"role": "system", "content": system},
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
