from typing import AsyncIterator, Any
import httpx
from portiere.workers.base import BaseWorker


class FinanceWorker(BaseWorker):
    name = "finance"
    description = "Stock prices, crypto rates, and market data — free real-time quotes, no API key needed"

    CRYPTO_ALIASES = {
        "bitcoin": "bitcoin", "btc": "bitcoin",
        "ethereum": "ethereum", "eth": "ethereum",
        "solana": "solana", "sol": "solana",
        "dogecoin": "dogecoin", "doge": "dogecoin",
        "cardano": "cardano", "ada": "cardano",
        "xrp": "ripple", "ripple": "ripple",
        "litecoin": "litecoin", "ltc": "litecoin",
        "polkadot": "polkadot", "dot": "polkadot",
        "chainlink": "chainlink", "link": "chainlink",
        "avalanche": "avalanche-2", "avax": "avalanche-2",
    }

    async def execute(self, task: str, parameters: dict[str, Any], context: str = "") -> AsyncIterator[dict]:
        query = parameters.get("symbol") or parameters.get("query") or task.strip()
        yield {"type": "worker_thinking", "worker": self.name, "content": f"Looking up: {query}"}

        lower = query.lower().strip()
        crypto_id = self._match_crypto(lower)

        try:
            if crypto_id:
                data = await self._get_crypto(crypto_id)
                content = self._format_crypto(data)
                yield {
                    "type": "worker_done",
                    "worker": self.name,
                    "content": content,
                    "data": {"type": "crypto", **data},
                }
            else:
                symbol = self._extract_ticker(query)
                data = await self._get_stock(symbol)
                content = self._format_stock(symbol, data)
                yield {
                    "type": "worker_done",
                    "worker": self.name,
                    "content": content,
                    "data": {"type": "stock", "symbol": symbol, **data},
                }
        except Exception as e:
            yield {"type": "worker_error", "worker": self.name, "error": f"Finance lookup failed: {e}"}

    def _match_crypto(self, query: str) -> str | None:
        for key, cid in self.CRYPTO_ALIASES.items():
            if key in query:
                return cid
        return None

    def _extract_ticker(self, query: str) -> str:
        import re
        m = re.search(r'\b([A-Z]{1,5})\b', query)
        if m:
            return m.group(1)
        words = query.strip().upper().split()
        return words[0] if words else query.upper()[:5]

    async def _get_crypto(self, coin_id: str) -> dict:
        async with httpx.AsyncClient(timeout=12) as client:
            r = await client.get(
                f"https://api.coingecko.com/api/v3/coins/{coin_id}",
                params={"localization": "false", "tickers": "false", "community_data": "false"},
                headers={"User-Agent": "Portiere/1.0"},
            )
            r.raise_for_status()
            d = r.json()
            market = d.get("market_data", {})
            return {
                "name": d.get("name", coin_id),
                "symbol": d.get("symbol", "").upper(),
                "price_usd": market.get("current_price", {}).get("usd"),
                "price_eur": market.get("current_price", {}).get("eur"),
                "change_24h": market.get("price_change_percentage_24h"),
                "change_7d": market.get("price_change_percentage_7d"),
                "market_cap": market.get("market_cap", {}).get("usd"),
                "volume_24h": market.get("total_volume", {}).get("usd"),
                "ath": market.get("ath", {}).get("usd"),
                "rank": d.get("market_cap_rank"),
            }

    async def _get_stock(self, symbol: str) -> dict:
        async with httpx.AsyncClient(timeout=12) as client:
            r = await client.get(
                f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}",
                params={"interval": "1d", "range": "5d"},
                headers={"User-Agent": "Mozilla/5.0 (compatible; Portiere/1.0)"},
            )
            r.raise_for_status()
            data = r.json()
            result = data.get("chart", {}).get("result", [{}])[0]
            meta = result.get("meta", {})
            return {
                "price": meta.get("regularMarketPrice"),
                "prev_close": meta.get("previousClose") or meta.get("chartPreviousClose"),
                "currency": meta.get("currency", "USD"),
                "exchange": meta.get("exchangeName", ""),
                "name": meta.get("shortName") or meta.get("longName") or symbol,
                "52w_high": meta.get("fiftyTwoWeekHigh"),
                "52w_low": meta.get("fiftyTwoWeekLow"),
            }

    def _format_crypto(self, d: dict) -> str:
        price = d.get("price_usd")
        price_str = f"${price:,.2f}" if price else "N/A"
        change = d.get("change_24h")
        change_str = f"{'▲' if (change or 0) >= 0 else '▼'} {abs(change or 0):.2f}%" if change is not None else "N/A"
        change7 = d.get("change_7d")
        change7_str = f"{'▲' if (change7 or 0) >= 0 else '▼'} {abs(change7 or 0):.2f}%" if change7 is not None else "N/A"
        mcap = d.get("market_cap")
        mcap_str = f"${mcap / 1e9:.2f}B" if mcap else "N/A"
        vol = d.get("volume_24h")
        vol_str = f"${vol / 1e6:.1f}M" if vol else "N/A"
        ath = d.get("ath")
        ath_str = f"${ath:,.2f}" if ath else "N/A"
        rank = d.get("rank", "—")

        return (
            f"## {d.get('name')} ({d.get('symbol')})\n\n"
            f"**Price:** {price_str} USD\n"
            f"**24h Change:** {change_str}\n"
            f"**7d Change:** {change7_str}\n\n"
            f"| Metric | Value |\n"
            f"|--------|-------|\n"
            f"| Market Cap | {mcap_str} |\n"
            f"| 24h Volume | {vol_str} |\n"
            f"| All-Time High | {ath_str} |\n"
            f"| Market Rank | #{rank} |\n\n"
            f"*Data from CoinGecko*"
        )

    def _format_stock(self, symbol: str, d: dict) -> str:
        price = d.get("price")
        prev = d.get("prev_close")
        price_str = f"{d.get('currency', '$')}{price:,.2f}" if price else "N/A"
        change = ((price - prev) / prev * 100) if price and prev else None
        change_str = f"{'▲' if (change or 0) >= 0 else '▼'} {abs(change or 0):.2f}%" if change is not None else "N/A"
        hi52 = d.get("52w_high")
        lo52 = d.get("52w_low")

        return (
            f"## {d.get('name', symbol)} ({symbol})\n\n"
            f"**Price:** {price_str}\n"
            f"**Change from prev close:** {change_str}\n\n"
            f"| Metric | Value |\n"
            f"|--------|-------|\n"
            f"| Exchange | {d.get('exchange', 'N/A')} |\n"
            f"| 52-Week High | {d.get('currency', '$')}{hi52:,.2f} |\n"
            f"| 52-Week Low | {d.get('currency', '$')}{lo52:,.2f} |\n\n"
            f"*Data via Yahoo Finance*"
        )
