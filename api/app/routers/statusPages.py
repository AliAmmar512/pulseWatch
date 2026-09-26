from fastapi import APIRouter, Depends, HTTPException
from app.dependencies.auth import getCurrentUser
from app.schemas.statusPage import StatusPageCreate
from app.services import statusPageService

router = APIRouter(tags=["status-pages"])


@router.post("/status-pages", status_code=201)
async def createStatusPage(payload: StatusPageCreate, userId: str = Depends(getCurrentUser)):
    try:
        return await statusPageService.createStatusPage(userId, payload)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/status-pages")
async def listStatusPages(userId: str = Depends(getCurrentUser)):
    return await statusPageService.listStatusPages(userId)


@router.delete("/status-pages/{pageId}", status_code=204)
async def deleteStatusPage(pageId: str, userId: str = Depends(getCurrentUser)):
    await statusPageService.deleteStatusPage(userId, pageId)


# PUBLIC — no auth dependency at all
@router.get("/public/status-pages/{slug}")
async def getPublicStatusPage(slug: str):
    page = await statusPageService.getPublicStatusPage(slug)
    if not page:
        raise HTTPException(status_code=404, detail="Status page not found")
    return page