from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from app.dependencies.auth import getCurrentUser
from app.services import incidentService

router = APIRouter(prefix="/incidents", tags=["incidents"])


@router.get("")
async def listIncidents(
    site_id: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    userId: str = Depends(getCurrentUser),
):
    if site_id:
        incidents = await incidentService.listIncidentsForSite(userId, site_id, limit)
        if incidents is None:
            raise HTTPException(status_code=404, detail="Site not found")
        return incidents
    else:
        return await incidentService.listAllIncidents(userId, limit)