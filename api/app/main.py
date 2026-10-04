from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.routers import sites, domains, incidents, statusPages
from app.websocket.manager import manager
from app.websocket.listener import startListener
from app.websocket.tickets import issueTicket, consumeTicket
from app.config import corsOrigins
from app.dependencies.auth import getCurrentUser
from app.supabaseClient import initSupabase

@asynccontextmanager
async def lifespan(app: FastAPI):
    await initSupabase()
    app.state.listenerConn = await startListener()
    yield

app = FastAPI(title="Pulsewatch API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[orig.strip() for orig in corsOrigins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sites.router)
app.include_router(domains.router)
app.include_router(incidents.router)
app.include_router(statusPages.router)

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/ws/ticket")
async def createWsTicket(userId: str = Depends(getCurrentUser)):
    return {"ticket": issueTicket(userId)}


@app.websocket("/ws")
async def websocketEndpoint(websocket: WebSocket, ticket: str = Query(...)):
    userId = consumeTicket(ticket)
    if userId is None:
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