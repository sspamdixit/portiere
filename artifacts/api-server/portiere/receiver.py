import asyncio
import datetime
import json
from typing import Any
from fastapi import WebSocket


class ReceiverManager:
    """Manages WebSocket connections — listens for remote commands (phone app, etc.)."""

    def __init__(self):
        self.active: list[WebSocket] = []
        self._heartbeat_task: asyncio.Task | None = None

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self.active.append(ws)
        if len(self.active) == 1 and self._heartbeat_task is None:
            self._heartbeat_task = asyncio.create_task(self._heartbeat_loop())

    def disconnect(self, ws: WebSocket) -> None:
        if ws in self.active:
            self.active.remove(ws)
        if not self.active and self._heartbeat_task:
            self._heartbeat_task.cancel()
            self._heartbeat_task = None

    async def broadcast(self, payload: dict[str, Any]) -> None:
        dead: list[WebSocket] = []
        for ws in list(self.active):
            try:
                await ws.send_text(json.dumps(payload))
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

    async def send_to(self, ws: WebSocket, payload: dict[str, Any]) -> None:
        try:
            await ws.send_text(json.dumps(payload))
        except Exception:
            self.disconnect(ws)

    async def _heartbeat_loop(self) -> None:
        while self.active:
            await self.broadcast({
                "type": "heartbeat",
                "status": "connected",
                "ts": datetime.datetime.utcnow().isoformat(),
                "clients": len(self.active),
            })
            await asyncio.sleep(5)
        self._heartbeat_task = None


receiver_manager = ReceiverManager()
