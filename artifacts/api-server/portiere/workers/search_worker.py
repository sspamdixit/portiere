from typing import AsyncIterator, Any
from urllib.parse import quote_plus
import httpx
from portiere.workers.base import BaseWorker


class SearchWorker(BaseWorker):
    name = "search"
    description = "Real-time web search via DuckDuckGo — finds current info, news, products, flights, recommendations, and facts"

    async def execute(self, task: str, parameters: dict[str, Any], context: str = "") -> AsyncIterator[dict]:
        query = parameters.get("query") or task.strip()
        yield {"type": "worker_thinking", "worker": self.name, "content": f"Searching for: {query}"}

        data = await self._search(query)
        result = self._format(query, data)

        yield {
            "type": "worker_done",
            "worker": self.name,
            "content": result,
            "data": {"query": query, "source": "DuckDuckGo"},
        }

    async def _search(self, query: str) -> dict:
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (compatible; Portiere/1.0)",
                "Accept": "application/json",
            }
            encoded = quote_plus(query)
            async with httpx.AsyncClient(timeout=12, headers=headers, follow_redirects=True) as client:
                r = await client.get(
                    f"https://api.duckduckgo.com/?q={encoded}&format=json&no_html=1&no_redirect=1&t=portiere"
                )
                if r.status_code == 200:
                    return r.json()
        except Exception as e:
            return {"_error": str(e)}
        return {}

    def _format(self, query: str, data: dict) -> str:
        if data.get("_error"):
            return f"Search error: {data['_error']}\nTry rephrasing your query."

        lines: list[str] = []

        if data.get("Answer"):
            lines.append(f"Answer: {data['Answer']}\n")

        if data.get("AbstractText"):
            lines.append(data["AbstractText"])
            if data.get("AbstractURL"):
                lines.append(f"→ {data['AbstractURL']}\n")

        related = [r for r in data.get("RelatedTopics", []) if isinstance(r, dict) and r.get("Text")][:7]
        if related:
            lines.append("Results:")
            for r in related:
                text = r["Text"][:240]
                url = r.get("FirstURL", "")
                lines.append(f"• {text}")
                if url:
                    lines.append(f"  {url}")

        if data.get("Results"):
            for r in data["Results"][:3]:
                if r.get("Text"):
                    lines.append(f"• {r['Text'][:200]}")
                    if r.get("FirstURL"):
                        lines.append(f"  {r['FirstURL']}")

        if not lines:
            lines.append(f"No direct results found for '{query}'.")
            lines.append("Try a more specific query, or I can route this to Claude for a detailed response.")

        return "\n".join(lines)
