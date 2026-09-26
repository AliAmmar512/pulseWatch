from fastapi import WebSocket
from typing import Dict, List


class ConnectionManager:
    def __init__(self):
        self.active: Dict[str, List[WebSocket]] = {}

    async def connect(self, userId: str, ws: WebSocket):
        await ws.accept()
        self.active.setdefault(userId, []).append(ws)

    def disconnect(self, userId: str, ws: WebSocket):
        if userId in self.active and ws in self.active[userId]:
            self.active[userId].remove(ws)
            if not self.active[userId]:
                del self.active[userId]

    async def sendToUser(self, userId: str, message: dict):
        for ws in list(self.active.get(userId, [])):
            try:
                await ws.send_json(message)
            except Exception:
                self.disconnect(userId, ws)


manager = ConnectionManager()