from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import sites, domains, incidents, statusPages

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
app.include_router(sites.router)
app.include_router(domains.router)
app.include_router(incidents.router)


@app.get("/health")
async def health():
    return {"status": "ok"}