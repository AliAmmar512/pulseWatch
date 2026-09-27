import asyncpg
import json
import os
import asyncio

from app.websocket.manager import manager

databaseUrl = os.getenv("DATABASE_URL")

async def _listenerLoop():
    backoff = 1
    while True:
        try:
            print(f"[listener] connecting to database...")
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
            
            backoff = 1 # reset backoff on successful connection
            
            # keep connection alive
            while not conn.is_closed():
                await asyncio.sleep(1)
                
            print("[listener] connection closed")
        except Exception as e:
            print(f"[listener] connection error: {e}")
            
        print(f"[listener] reconnecting in {backoff} seconds...")
        await asyncio.sleep(backoff)
        backoff = min(backoff * 2, 60)

async def startListener():
    asyncio.create_task(_listenerLoop())
    return None