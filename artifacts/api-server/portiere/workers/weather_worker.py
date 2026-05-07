from typing import AsyncIterator, Any
import httpx
from portiere.workers.base import BaseWorker


WMO_CODES = {
    0: ("☀️", "Clear sky"), 1: ("🌤️", "Mainly clear"), 2: ("⛅", "Partly cloudy"), 3: ("☁️", "Overcast"),
    45: ("🌫️", "Foggy"), 48: ("🌫️", "Icy fog"),
    51: ("🌦️", "Light drizzle"), 53: ("🌦️", "Drizzle"), 55: ("🌧️", "Heavy drizzle"),
    61: ("🌧️", "Slight rain"), 63: ("🌧️", "Moderate rain"), 65: ("🌧️", "Heavy rain"),
    71: ("🌨️", "Slight snow"), 73: ("🌨️", "Moderate snow"), 75: ("❄️", "Heavy snow"),
    80: ("🌦️", "Rain showers"), 81: ("🌧️", "Moderate showers"), 82: ("⛈️", "Violent showers"),
    95: ("⛈️", "Thunderstorm"), 96: ("⛈️", "Thunderstorm with hail"), 99: ("⛈️", "Heavy thunderstorm"),
}


def wmo(code: int) -> tuple[str, str]:
    return WMO_CODES.get(code, ("🌡️", f"Code {code}"))


class WeatherWorker(BaseWorker):
    name = "weather"
    description = "Real-time weather and 7-day forecast for any location worldwide — no API key needed"

    async def execute(self, task: str, parameters: dict[str, Any], context: str = "") -> AsyncIterator[dict]:
        location = (
            parameters.get("location")
            or self._extract_location(task)
            or self.settings.profile_city
        )
        if not location:
            yield {"type": "worker_error", "worker": self.name,
                   "error": "No location found. Set your city in Settings > About You, or include it in your request."}
            return

        yield {"type": "worker_thinking", "worker": self.name, "content": f"Fetching weather for {location}..."}

        coords = await self._geocode(location)
        if not coords:
            yield {"type": "worker_error", "worker": self.name,
                   "error": f"Could not find location: '{location}'. Try a city name like 'New York' or 'Tokyo'."}
            return

        weather = await self._get_weather(coords["lat"], coords["lon"])
        if not weather:
            yield {"type": "worker_error", "worker": self.name, "error": "Could not fetch weather data. Try again."}
            return

        content = self._format(location, coords, weather)
        yield {
            "type": "worker_done",
            "worker": self.name,
            "content": content,
            "data": {"location": location, "coords": coords},
        }

    def _extract_location(self, task: str) -> str:
        import re
        # "weather in X", "forecast for X", "temperature in X"
        patterns = [
            r"(?:weather|forecast|temperature|climate|conditions?)\s+(?:in|for|at)\s+([A-Za-z\s,]+?)(?:\s+(?:this|next|on|today|tomorrow|weekend)|$)",
            r"(?:in|for|at)\s+([A-Za-z\s,]+?)(?:\s+(?:this|next|on|today|tomorrow|weekend|weather|forecast)|$)",
            r"^([A-Za-z\s,]+?)\s+weather",
        ]
        for p in patterns:
            m = re.search(p, task, re.IGNORECASE)
            if m:
                loc = m.group(1).strip().rstrip(",")
                if len(loc) > 1 and loc.lower() not in ("the", "a", "an", "my"):
                    return loc
        return ""

    async def _geocode(self, location: str) -> dict | None:
        try:
            async with httpx.AsyncClient(timeout=8) as client:
                r = await client.get(
                    "https://geocoding-api.open-meteo.com/v1/search",
                    params={"name": location, "count": 1, "language": "en", "format": "json"},
                )
                if r.status_code == 200:
                    results = r.json().get("results", [])
                    if results:
                        res = results[0]
                        return {
                            "lat": res["latitude"],
                            "lon": res["longitude"],
                            "name": res.get("name", location),
                            "country": res.get("country", ""),
                            "admin1": res.get("admin1", ""),
                        }
        except Exception:
            pass
        return None

    async def _get_weather(self, lat: float, lon: float) -> dict | None:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.get(
                    "https://api.open-meteo.com/v1/forecast",
                    params={
                        "latitude": lat,
                        "longitude": lon,
                        "current": "temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weathercode,precipitation",
                        "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode",
                        "timezone": "auto",
                        "forecast_days": 7,
                        "wind_speed_unit": "mph",
                        "temperature_unit": "celsius",
                    },
                )
                if r.status_code == 200:
                    return r.json()
        except Exception:
            pass
        return None

    def _format(self, location: str, coords: dict, data: dict) -> str:
        cur = data.get("current", {})
        daily = data.get("daily", {})
        tz = data.get("timezone_abbreviation", "")

        place = coords.get("name", location)
        if coords.get("admin1"):
            place += f", {coords['admin1']}"
        if coords.get("country"):
            place += f", {coords['country']}"

        emoji, desc = wmo(cur.get("weathercode", 0))
        temp_c = cur.get("temperature_2m", "?")
        feels_c = cur.get("apparent_temperature", "?")
        temp_f = round(float(temp_c) * 9 / 5 + 32) if isinstance(temp_c, (int, float)) else "?"
        feels_f = round(float(feels_c) * 9 / 5 + 32) if isinstance(feels_c, (int, float)) else "?"
        humidity = cur.get("relative_humidity_2m", "?")
        wind = cur.get("wind_speed_10m", "?")
        precip = cur.get("precipitation", 0)

        lines = [
            f"## {emoji} {place}",
            f"**{desc}** · {temp_c}°C / {temp_f}°F (feels like {feels_c}°C / {feels_f}°F)",
            f"Humidity {humidity}% · Wind {wind} mph{' · Precipitation ' + str(precip) + 'mm' if precip else ''}",
            "",
            "### 7-Day Forecast",
            "",
        ]

        import datetime
        dates = daily.get("time", [])
        max_temps = daily.get("temperature_2m_max", [])
        min_temps = daily.get("temperature_2m_min", [])
        precips = daily.get("precipitation_sum", [])
        codes = daily.get("weathercode", [])

        for i, date_str in enumerate(dates[:7]):
            try:
                dt = datetime.date.fromisoformat(date_str)
                day_name = "Today" if i == 0 else ("Tomorrow" if i == 1 else dt.strftime("%A"))
                day_emoji, day_desc = wmo(codes[i] if i < len(codes) else 0)
                hi_c = max_temps[i] if i < len(max_temps) else "?"
                lo_c = min_temps[i] if i < len(min_temps) else "?"
                rain = precips[i] if i < len(precips) else 0
                hi_f = round(float(hi_c) * 9 / 5 + 32) if isinstance(hi_c, (int, float)) else "?"
                lo_f = round(float(lo_c) * 9 / 5 + 32) if isinstance(lo_c, (int, float)) else "?"
                rain_str = f" · {rain}mm rain" if rain and float(rain) > 0.1 else ""
                lines.append(f"**{day_name}** {day_emoji} {day_desc} — {hi_c}°C/{hi_f}°F ↑ · {lo_c}°C/{lo_f}°F ↓{rain_str}")
            except Exception:
                continue

        return "\n".join(lines)
