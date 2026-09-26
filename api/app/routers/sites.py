from fastapi import APIRouter, Depends, HTTPException
from app.dependencies.auth import getCurrentUser
from app.schemas.site import SiteCreate, SiteUpdate
from app.services import siteService

router = APIRouter(prefix="/sites", tags=["sites"])


@router.post("", status_code=201)
async def addSite(payload: SiteCreate, userId: str = Depends(getCurrentUser)):
    withinLimit = await siteService.checkPlanLimit(userId)
    if not withinLimit:
        raise HTTPException(status_code=403, detail="Plan site limit reached")
    return await siteService.createSite(userId, payload)


@router.get("")
async def listSites(userId: str = Depends(getCurrentUser)):
    return await siteService.listSites(userId)


@router.get("/{siteId}")
async def getSite(siteId: str, userId: str = Depends(getCurrentUser)):
    site = await siteService.getSite(userId, siteId)
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    return site


@router.patch("/{siteId}")
async def updateSite(siteId: str, payload: SiteUpdate, userId: str = Depends(getCurrentUser)):
    updated = await siteService.updateSite(userId, siteId, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Site not found")
    return updated


@router.delete("/{siteId}", status_code=204)
async def deleteSite(siteId: str, userId: str = Depends(getCurrentUser)):
    await siteService.deleteSite(userId, siteId)