from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from app.routers import sites, domains, incidents, statusPages
from app.websocket.manager import manager
from app.websocket.listener import startListener
from app.config import supabaseUrl, supabaseServiceKey
from supabase import create_client

app = FastAPI(title="Pulsewatch API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sites.router)
app.include_router(domains.router)
app.include_router(incidents.router)
app.include_router(statusPages.router)

supabaseClient = create_client(supabaseUrl, supabaseServiceKey)


@app.on_event("startup")
async def onStartup():
    app.state.listenerConn = await startListener()


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.websocket("/ws")
async def websocketEndpoint(websocket: WebSocket, token: str = Query(...)):
    try:
        userResponse = supabaseClient.auth.get_user(token)
        userId = userResponse.user.id
    except Exception:
        await websocket.close(code=1008)
        return

    await manager.connect(userId, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        manager.disconnect(userId, websocket)