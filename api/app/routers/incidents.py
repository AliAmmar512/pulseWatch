from fastapi import APIRouter, Depends, HTTPException, Query
from app.dependencies.auth import getCurrentUser
from app.services import incidentService

router = APIRouter(prefix="/incidents", tags=["incidents"])


@router.get("")
async def listIncidents(
    site_id: str = Query(...),
    limit: int = Query(50, le=200),
    userId: str = Depends(getCurrentUser),
):
    incidents = await incidentService.listIncidentsForSite(userId, site_id, limit)
    if incidents is None:
        raise HTTPException(status_code=404, detail="Site not found")
    return incidents