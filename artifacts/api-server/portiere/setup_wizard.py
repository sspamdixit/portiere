import os
import json
import httpx
from typing import AsyncIterator

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.1-8b-instant"

SYSTEM_PROMPT = """You are Portiere's friendly setup assistant. Your job is to help new users configure their personal AI concierge in a warm, concise, non-technical way.

You will have a short conversation (3 questions max) to understand the user:
1. Who they are and what they'll mainly use Portiere for
2. Their location/city and any personal preferences (diet, morning vs night person, etc.)
3. Their comfort level with technology to recommend the right AI brain

After the conversation ends, you MUST output a final JSON block in this exact format (and nothing else after it):
<SETUP_RESULT>
{
  "profile_name": "...",
  "profile_city": "...",
  "profile_occupation": "...",
  "profile_preferences": "...",
  "recommended_provider": "ollama" | "openai" | "anthropic",
  "recommendation_reason": "one sentence why"
}
</SETUP_RESULT>

Rules:
- Keep each message SHORT (2-4 sentences max). This is a chat, not an essay.
- Be warm, direct, and friendly. Use the user's name once you know it.
- Ask only ONE question per message.
- On the 3rd exchange, wrap up naturally and output the SETUP_RESULT block.
- If they seem technical (developer, engineer, student in CS), recommend ollama (free, local).
- If they want the best quality and don't mind paying, recommend anthropic.
- If they want cloud but are budget-conscious, recommend openai.
- For non-technical users who just want it to work, recommend openai.
- The profile_preferences field should capture anything useful: dietary needs, location preferences, communication style, time zone hints, etc."""


async def stream_wizard(messages: list[dict]) -> AsyncIterator[str]:
    api_key = os.environ.get("GROQ_API_KEY", "")
    if not api_key:
        yield json.dumps({"type": "error", "content": "Groq API key not configured."})
        return

    full_messages = [{"role": "system", "content": SYSTEM_PROMPT}] + messages

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            async with client.stream(
                "POST",
                GROQ_API_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": GROQ_MODEL,
                    "messages": full_messages,
                    "stream": True,
                    "max_tokens": 512,
                    "temperature": 0.7,
                },
            ) as resp:
                if resp.status_code != 200:
                    body = await resp.aread()
                    yield json.dumps({"type": "error", "content": f"Groq error {resp.status_code}: {body.decode()[:200]}"})
                    return

                async for line in resp.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    data = line[6:].strip()
                    if data == "[DONE]":
                        yield json.dumps({"type": "done"})
                        return
                    try:
                        chunk = json.loads(data)
                        delta = chunk["choices"][0]["delta"].get("content", "")
                        if delta:
                            yield json.dumps({"type": "chunk", "content": delta})
                    except Exception:
                        continue

    except httpx.TimeoutException:
        yield json.dumps({"type": "error", "content": "Request timed out. Please try again."})
    except Exception as e:
        yield json.dumps({"type": "error", "content": str(e)})


def parse_setup_result(full_text: str) -> dict | None:
    """Extract the SETUP_RESULT JSON block from assistant output."""
    start = full_text.find("<SETUP_RESULT>")
    end = full_text.find("</SETUP_RESULT>")
    if start == -1 or end == -1:
        return None
    try:
        json_str = full_text[start + len("<SETUP_RESULT>"):end].strip()
        return json.loads(json_str)
    except Exception:
        return None
