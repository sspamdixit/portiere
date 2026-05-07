from typing import AsyncIterator, Any
from urllib.parse import quote_plus
import httpx
import xml.etree.ElementTree as ET
from portiere.workers.base import BaseWorker


class NewsWorker(BaseWorker):
    name = "news"
    description = "Latest news headlines and articles on any topic — free, real-time, no API key needed"

    async def execute(self, task: str, parameters: dict[str, Any], context: str = "") -> AsyncIterator[dict]:
        topic = parameters.get("topic") or task.strip()
        yield {"type": "worker_thinking", "worker": self.name, "content": f"Fetching news about: {topic}"}

        try:
            articles = await self._fetch_news(topic)
            content = self._format(topic, articles)
            yield {
                "type": "worker_done",
                "worker": self.name,
                "content": content,
                "data": {"topic": topic, "articles": articles, "source": "Google News RSS"},
            }
        except Exception as e:
            yield {"type": "worker_error", "worker": self.name, "error": f"News fetch failed: {e}"}

    async def _fetch_news(self, topic: str) -> list[dict]:
        encoded = quote_plus(topic)
        url = f"https://news.google.com/rss/search?q={encoded}&hl=en-US&gl=US&ceid=US:en"
        headers = {"User-Agent": "Mozilla/5.0 (compatible; Portiere/1.0)"}

        async with httpx.AsyncClient(timeout=12, headers=headers, follow_redirects=True) as client:
            r = await client.get(url)
            r.raise_for_status()

        root = ET.fromstring(r.text)
        channel = root.find("channel")
        if not channel:
            return []

        articles = []
        for item in channel.findall("item")[:10]:
            title = item.findtext("title", "").strip()
            link = item.findtext("link", "").strip()
            pub_date = item.findtext("pubDate", "").strip()
            source_el = item.find("source")
            source_name = source_el.text if source_el is not None else ""
            description = item.findtext("description", "").strip()
            import re
            description = re.sub(r"<[^>]+>", "", description)[:200]

            if title:
                articles.append({
                    "title": title,
                    "url": link,
                    "published": pub_date[:22] if pub_date else "",
                    "source": source_name,
                    "snippet": description,
                })

        return articles

    def _format(self, topic: str, articles: list[dict]) -> str:
        if not articles:
            return f"No recent news found for **{topic}**. Try a different search term."

        lines = [f"## Latest News: {topic}\n"]
        for a in articles:
            lines.append(f"### {a['title']}")
            if a.get("source"):
                lines.append(f"*{a['source']}*{' · ' + a['published'][:16] if a['published'] else ''}")
            if a.get("snippet"):
                lines.append(a["snippet"])
            if a.get("url"):
                lines.append(f"[Read more →]({a['url']})")
            lines.append("")

        return "\n".join(lines)
