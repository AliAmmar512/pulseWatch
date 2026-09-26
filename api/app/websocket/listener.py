import asyncpg
import json
import os

from app.websocket.manager import manager

databaseUrl = os.getenv("DATABASE_URL")


async def startListener():
    conn = await asyncpg.connect(databaseUrl)

    async def onNotify(connection, pid, channel, payload):
        try:
            data = json.loads(payload)
            userId = data.get("user_id")
            if userId:
                await manager.sendToUser(userId, data)
        except Exception as e:
            print(f"[listener] failed to process notification: {e}")

    await conn.add_listener("site_events", onNotify)
    print("[listener] listening on 'site_events' channel")
    return conn