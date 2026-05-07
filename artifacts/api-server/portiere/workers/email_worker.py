import re
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import AsyncIterator, Any
from urllib.parse import quote

from portiere.workers.base import BaseWorker


class EmailWorker(BaseWorker):
    name = "email"
    description = "Compose and send emails — drafts via mailto link or sends directly via SMTP if configured"

    async def execute(self, task: str, parameters: dict[str, Any], context: str = "") -> AsyncIterator[dict]:
        to_addrs = parameters.get("to") or self._extract_emails(task) or self._extract_emails(context)
        subject = parameters.get("subject") or self._extract_subject(task)
        body = parameters.get("body") or context or task

        # Clean up body from task instructions
        if body == task:
            body = self._strip_instructions(task)

        # Auto-sign with user's name
        if self.settings.profile_name and not body.rstrip().endswith(self.settings.profile_name):
            body = body.rstrip() + f"\n\nBest,\n{self.settings.profile_name}"

        if not to_addrs:
            to_addrs = ["recipient@example.com"]

        to_str = ", ".join(to_addrs) if isinstance(to_addrs, list) else to_addrs
        if not subject:
            subject = body[:60].split("\n")[0].strip()

        yield {"type": "worker_thinking", "worker": self.name, "content": "Preparing your email..."}

        # Try SMTP send if configured
        if self.settings.smtp_host and self.settings.smtp_user and self.settings.smtp_password:
            success, error = await self._send_smtp(to_addrs, subject, body)
            if success:
                content = (
                    f"## ✉️ Email Sent\n\n"
                    f"**To:** {to_str}  \n"
                    f"**Subject:** {subject}  \n"
                    f"**From:** {self.settings.smtp_from or self.settings.smtp_user}\n\n"
                    f"---\n\n{body}"
                )
                yield {"type": "worker_done", "worker": self.name, "content": content,
                       "data": {"sent": True, "to": to_str, "subject": subject}}
                return
            else:
                yield {"type": "worker_thinking", "worker": self.name,
                       "content": f"SMTP failed ({error}), falling back to draft..."}

        # Fallback: draft + mailto link
        mailto = self._build_mailto(to_str, subject, body)
        content = (
            f"## ✉️ Email Draft\n\n"
            f"**To:** {to_str}  \n"
            f"**Subject:** {subject}\n\n"
            f"---\n\n{body}\n\n"
            f"---\n\n"
            f"[Open in your email app]({mailto})\n\n"
            f"*To send automatically in future, add SMTP credentials in Settings.*"
        )
        yield {
            "type": "worker_done",
            "worker": self.name,
            "content": content,
            "data": {"sent": False, "to": to_str, "subject": subject, "mailto": mailto},
        }

    def _extract_emails(self, text: str) -> list[str]:
        if not text:
            return []
        return re.findall(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", text)

    def _extract_subject(self, task: str) -> str:
        for pattern in [
            r"subject[:\s]+[\"']?(.+?)[\"']?(?:\n|$)",
            r"re[:\s]+(.+?)(?:\n|$)",
            r"about\s+(.+?)(?:\n|$|to\s)",
        ]:
            m = re.search(pattern, task, re.IGNORECASE)
            if m:
                return m.group(1).strip()[:120]
        return ""

    def _strip_instructions(self, task: str) -> str:
        patterns = [
            r"(?:send|write|compose|draft)\s+(?:an?\s+)?email\s+to\s+\S+\s*(?:about\s+.+?)?\s*[:\-]?\s*",
            r"email\s+to\s+\S+\s*[:\-]?\s*",
        ]
        for p in patterns:
            task = re.sub(p, "", task, flags=re.IGNORECASE).strip()
        return task or task

    def _build_mailto(self, to: str, subject: str, body: str) -> str:
        return f"mailto:{quote(to)}?subject={quote(subject)}&body={quote(body)}"

    async def _send_smtp(self, to_addrs: list[str] | str, subject: str, body: str) -> tuple[bool, str]:
        import asyncio
        if isinstance(to_addrs, str):
            to_addrs = [a.strip() for a in to_addrs.split(",")]

        def _blocking_send():
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = self.settings.smtp_from or self.settings.smtp_user
            msg["To"] = ", ".join(to_addrs)
            msg.attach(MIMEText(body, "plain"))

            ctx = ssl.create_default_context()
            port = self.settings.smtp_port or 587
            host = self.settings.smtp_host

            if port == 465:
                with smtplib.SMTP_SSL(host, port, context=ctx, timeout=10) as s:
                    s.login(self.settings.smtp_user, self.settings.smtp_password)
                    s.sendmail(msg["From"], to_addrs, msg.as_string())
            else:
                with smtplib.SMTP(host, port, timeout=10) as s:
                    if self.settings.smtp_tls:
                        s.starttls(context=ctx)
                    s.login(self.settings.smtp_user, self.settings.smtp_password)
                    s.sendmail(msg["From"], to_addrs, msg.as_string())

        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, _blocking_send)
            return True, ""
        except Exception as e:
            return False, str(e)
