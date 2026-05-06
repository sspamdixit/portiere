from typing import AsyncIterator, Any
from portiere.workers.base import BaseWorker
from portiere.models import SettingsModel
import asyncio
import re


class OSINTWorker(BaseWorker):
    name = "osint"
    description = "Digital footprinting, domain/IP reconnaissance, and privacy scan operations"

    async def execute(
        self,
        task: str,
        parameters: dict[str, Any],
        context: str = "",
    ) -> AsyncIterator[dict]:
        target = parameters.get("target") or self._extract_target(task + " " + context)
        scan_type = parameters.get("scan_type", "auto")

        if not target:
            yield {"type": "worker_error", "worker": self.name, "error": "No target specified. Provide a domain, IP, email, or username."}
            return

        yield {"type": "worker_thinking", "worker": self.name, "content": f"Initiating OSINT scan on: {target}"}

        results = {}

        if self._is_domain(target) or scan_type in ("domain", "auto"):
            yield {"type": "worker_thinking", "worker": self.name, "content": "Performing WHOIS lookup..."}
            whois_data = await self._whois_lookup(target)
            results["whois"] = whois_data

        if self._is_domain(target) or self._is_ip(target):
            yield {"type": "worker_thinking", "worker": self.name, "content": "Performing DNS enumeration..."}
            dns_data = await self._dns_lookup(target)
            results["dns"] = dns_data

        if self._is_email(target):
            yield {"type": "worker_thinking", "worker": self.name, "content": "Checking email patterns..."}
            results["email_analysis"] = self._analyze_email(target)

        yield {"type": "worker_thinking", "worker": self.name, "content": "Checking HTTP headers..."}
        http_data = await self._http_probe(target if target.startswith("http") else f"https://{target}")
        results["http_probe"] = http_data

        summary_parts = []
        if results.get("whois"):
            registrar = results["whois"].get("registrar", "Unknown")
            summary_parts.append(f"Registrar: {registrar}")
        if results.get("dns"):
            a_records = results["dns"].get("A", [])
            if a_records:
                summary_parts.append(f"IP(s): {', '.join(a_records[:3])}")
        if results.get("http_probe", {}).get("server"):
            summary_parts.append(f"Server: {results['http_probe']['server']}")

        summary = f"OSINT scan complete for {target}. " + " | ".join(summary_parts)
        yield {"type": "worker_done", "worker": self.name, "content": summary, "data": {"target": target, "results": results}}

    def _extract_target(self, text: str) -> str:
        domain_re = re.compile(r'\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}\b')
        ip_re = re.compile(r'\b(?:\d{1,3}\.){3}\d{1,3}\b')
        email_re = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')

        for pat in [email_re, domain_re, ip_re]:
            m = pat.search(text)
            if m:
                return m.group(0)
        words = text.split()
        for w in words:
            if len(w) > 3 and not w.startswith("-"):
                return w
        return ""

    def _is_domain(self, t: str) -> bool:
        return bool(re.match(r'^(?:[a-zA-Z0-9\-]+\.)+[a-zA-Z]{2,}$', t.strip()))

    def _is_ip(self, t: str) -> bool:
        return bool(re.match(r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$', t.strip()))

    def _is_email(self, t: str) -> bool:
        return "@" in t

    def _analyze_email(self, email: str) -> dict:
        local, _, domain = email.partition("@")
        return {
            "local_part": local,
            "domain": domain,
            "is_common_provider": domain.lower() in ("gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "protonmail.com"),
            "length": len(local),
            "has_dots": "." in local,
            "has_plus": "+" in local,
        }

    async def _whois_lookup(self, domain: str) -> dict:
        try:
            import whois
            loop = asyncio.get_event_loop()
            data = await loop.run_in_executor(None, whois.whois, domain)
            return {
                "registrar": getattr(data, "registrar", None),
                "creation_date": str(getattr(data, "creation_date", None)),
                "expiration_date": str(getattr(data, "expiration_date", None)),
                "name_servers": list(getattr(data, "name_servers", []) or [])[:5],
                "org": getattr(data, "org", None),
                "country": getattr(data, "country", None),
                "status": str(getattr(data, "status", ""))[:200],
            }
        except ImportError:
            return {"error": "python-whois not installed"}
        except Exception as e:
            return {"error": str(e)}

    async def _dns_lookup(self, domain: str) -> dict:
        result = {}
        try:
            import dns.resolver
            for rtype in ["A", "AAAA", "MX", "TXT", "NS"]:
                try:
                    answers = dns.resolver.resolve(domain, rtype, lifetime=5)
                    result[rtype] = [str(r) for r in answers][:5]
                except Exception:
                    result[rtype] = []
        except ImportError:
            result["note"] = "dnspython not installed"
        except Exception as e:
            result["error"] = str(e)
        return result

    async def _http_probe(self, url: str) -> dict:
        try:
            import httpx
            async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
                resp = await client.head(url)
                headers = dict(resp.headers)
                return {
                    "status_code": resp.status_code,
                    "server": headers.get("server"),
                    "x_powered_by": headers.get("x-powered-by"),
                    "content_type": headers.get("content-type"),
                    "security_headers": {
                        "strict_transport_security": "strict-transport-security" in headers,
                        "x_frame_options": headers.get("x-frame-options"),
                        "x_content_type_options": headers.get("x-content-type-options"),
                        "content_security_policy": "content-security-policy" in headers,
                    },
                    "final_url": str(resp.url),
                }
        except Exception as e:
            return {"error": str(e)}
