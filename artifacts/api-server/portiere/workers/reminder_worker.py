from typing import AsyncIterator, Any
import re
from datetime import datetime, timedelta
from portiere.workers.base import BaseWorker


class ReminderWorker(BaseWorker):
    name = "reminder"
    description = "Create calendar events and reminders — generates a downloadable .ics file you can import into any calendar app"

    async def execute(self, task: str, parameters: dict[str, Any], context: str = "") -> AsyncIterator[dict]:
        yield {"type": "worker_thinking", "worker": self.name, "content": "Creating your calendar event..."}

        title = parameters.get("title") or self._extract_title(task)
        date_str = parameters.get("date") or self._extract_date(task)
        time_str = parameters.get("time") or self._extract_time(task)
        duration_min = int(parameters.get("duration_minutes", 60))
        location = parameters.get("location", "")
        description_text = parameters.get("description", task)

        try:
            dt_start = self._parse_datetime(date_str, time_str)
            dt_end = dt_start + timedelta(minutes=duration_min)
            ics_content = self._make_ics(title, dt_start, dt_end, location, description_text)
            ics_b64 = self._to_b64(ics_content)

            lines = [
                f"## 📅 Event Created: {title}",
                "",
                f"**When:** {dt_start.strftime('%A, %B %d %Y at %I:%M %p')} ({duration_min} min)",
            ]
            if location:
                lines.append(f"**Where:** {location}")
            lines += [
                "",
                "Your `.ics` calendar file is ready. Download it and open it to add to any calendar app (Google Calendar, Apple Calendar, Outlook).",
                "",
                f"```ics\n{ics_content}\n```",
            ]

            yield {
                "type": "worker_done",
                "worker": self.name,
                "content": "\n".join(lines),
                "data": {
                    "title": title,
                    "start": dt_start.isoformat(),
                    "end": dt_end.isoformat(),
                    "location": location,
                    "ics_b64": ics_b64,
                    "ics_content": ics_content,
                },
            }
        except Exception as e:
            yield {"type": "worker_error", "worker": self.name, "error": f"Could not create event: {e}"}

    def _extract_title(self, task: str) -> str:
        for kw in ["remind me to", "remind me about", "schedule", "add", "create", "set"]:
            if kw in task.lower():
                after = task.lower().split(kw, 1)[1].strip()
                words = after.split()[:6]
                return " ".join(words).capitalize()
        return task[:60].capitalize()

    def _extract_date(self, task: str) -> str:
        today = datetime.now()
        lower = task.lower()
        if "tomorrow" in lower:
            return (today + timedelta(days=1)).strftime("%Y-%m-%d")
        if "next monday" in lower:
            days = (7 - today.weekday()) % 7 or 7
            return (today + timedelta(days=days)).strftime("%Y-%m-%d")
        for pat in [r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b", r"\b(\d{4}-\d{2}-\d{2})\b"]:
            m = re.search(pat, task)
            if m:
                return m.group(1)
        return today.strftime("%Y-%m-%d")

    def _extract_time(self, task: str) -> str:
        m = re.search(r"\b(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b", task, re.IGNORECASE)
        if m:
            return m.group(1)
        m = re.search(r"\bat\s+(\d{1,2}(?::\d{2})?)\b", task, re.IGNORECASE)
        if m:
            return m.group(1) + ":00"
        return "09:00"

    def _parse_datetime(self, date_str: str, time_str: str) -> datetime:
        for fmt in ["%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%m-%d-%Y"]:
            try:
                dt = datetime.strptime(date_str.strip(), fmt)
                break
            except ValueError:
                continue
        else:
            dt = datetime.now()

        time_str = time_str.strip().upper()
        for fmt in ["%I:%M %p", "%I %p", "%H:%M", "%H:%M:%S"]:
            try:
                t = datetime.strptime(time_str, fmt)
                return dt.replace(hour=t.hour, minute=t.minute, second=0)
            except ValueError:
                continue
        return dt.replace(hour=9, minute=0, second=0)

    def _make_ics(self, title: str, start: datetime, end: datetime, location: str, desc: str) -> str:
        uid = f"{int(start.timestamp())}-portiere@concierge"
        now = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
        fmt = "%Y%m%dT%H%M%S"
        return "\r\n".join([
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//Portiere//AI Concierge//EN",
            "CALSCALE:GREGORIAN",
            "METHOD:PUBLISH",
            "BEGIN:VEVENT",
            f"UID:{uid}",
            f"DTSTAMP:{now}",
            f"DTSTART:{start.strftime(fmt)}",
            f"DTEND:{end.strftime(fmt)}",
            f"SUMMARY:{title}",
            "DESCRIPTION:" + desc[:200].replace("\n", "\\n"),
            f"LOCATION:{location}",
            "STATUS:CONFIRMED",
            "END:VEVENT",
            "END:VCALENDAR",
        ])

    def _to_b64(self, content: str) -> str:
        import base64
        return base64.b64encode(content.encode()).decode()
