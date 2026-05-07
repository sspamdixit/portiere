from typing import AsyncIterator, Any
from urllib.parse import quote_plus
import httpx
from portiere.workers.base import BaseWorker


class SearchWorker(BaseWorker):
    name = "search"
    description = "Real-time web search via DuckDuckGo — finds current info, news, products, flights, recommendations, and facts"

    async def execute(self, task: str, parameters: dict[str, Any], context: str = "") -> AsyncIterator[dict]:
        query = parameters.get("query") or task.strip()
        yield {"type": "worker_thinking", "worker": self.name, "content": f"Searching: {query}"}

        raw = await self._search(query)
        structured = self._parse(query, raw)
        text = self._to_text(structured)

        yield {
            "type": "worker_done",
            "worker": self.name,
            "content": text,
            "data": {"query": query, "source": "DuckDuckGo", **structured},
        }

    async def _search(self, query: str) -> dict:
        try:
            encoded = quote_plus(query)
            headers = {"User-Agent": "Mozilla/5.0 (compatible; Portiere/1.0)", "Accept": "application/json"}
            async with httpx.AsyncClient(timeout=12, headers=headers, follow_redirects=True) as client:
                r = await client.get(
                    f"https://api.duckduckgo.com/?q={encoded}&format=json&no_html=1&no_redirect=1&t=portiere"
                )
                if r.status_code == 200:
                    return r.json()
        except Exception as e:
            return {"_error": str(e)}
        return {}

    def _parse(self, query: str, data: dict) -> dict:
        if data.get("_error"):
            return {"error": data["_error"], "results": [], "answer": None, "abstract": None}

        results = []
        for r in data.get("RelatedTopics", []):
            if not isinstance(r, dict) or not r.get("Text"):
                continue
            text = r["Text"]
            url = r.get("FirstURL", "")
            title = text.split(" - ")[0][:90] if " - " in text else text[:90]
            snippet = text[:280]
            results.append({"title": title, "snippet": snippet, "url": url})

        for r in data.get("Results", []):
            if r.get("Text"):
                results.append({
                    "title": r.get("Text", "")[:90],
                    "snippet": r.get("Text", "")[:280],
                    "url": r.get("FirstURL", ""),
                })

        return {
            "answer": data.get("Answer") or None,
            "abstract": data.get("AbstractText") or None,
            "abstract_url": data.get("AbstractURL") or None,
            "results": results[:8],
            "error": None,
        }

    def _to_text(self, structured: dict) -> str:
        if structured.get("error"):
            return f"Search error: {structured['error']}\nTry rephrasing your query."

        lines: list[str] = []
        if structured.get("answer"):
            lines.append(f"**Answer:** {structured['answer']}\n")
        if structured.get("abstract"):
            lines.append(structured["abstract"])
            if structured.get("abstract_url"):
                lines.append(f"→ {structured['abstract_url']}\n")

        if structured.get("results"):
            lines.append("**Results:**")
            for r in structured["results"]:
                lines.append(f"• **{r['title']}**")
                if r["snippet"] != r["title"]:
                    lines.append(f"  {r['snippet'][:200]}")
                if r["url"]:
                    lines.append(f"  {r['url']}")

        if not lines:
            q = structured.get("query", "")
            lines.append(f"No direct results found for '{q}'.")
            lines.append("Try a more specific query or ask Claude for a detailed response.")

        return "\n".join(lines)
