from fastapi import APIRouter, Depends, HTTPException, Query
from app.dependencies.auth import getCurrentUser
from app.schemas.domain import DomainCreate
from app.services import domainService

router = APIRouter(prefix="/domains", tags=["domains"])


@router.post("", status_code=201)
async def addDomain(payload: DomainCreate, userId: str = Depends(getCurrentUser)):
    withinLimit = await domainService.checkDomainPlanLimit(userId)
    if not withinLimit:
        raise HTTPException(status_code=403, detail="Plan domain limit reached")
    return await domainService.createDomain(userId, payload)


@router.get("")
async def listDomains(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    userId: str = Depends(getCurrentUser),
):
    return await domainService.listDomains(userId, limit=limit, offset=offset)


@router.get("/{domainId}")
async def getDomain(domainId: str, userId: str = Depends(getCurrentUser)):
    domain = await domainService.getDomain(userId, domainId)
    if not domain:
        raise HTTPException(status_code=404, detail="Domain not found")
    return domain


@router.delete("/{domainId}", status_code=204)
async def deleteDomain(domainId: str, userId: str = Depends(getCurrentUser)):
    await domainService.deleteDomain(userId, domainId)