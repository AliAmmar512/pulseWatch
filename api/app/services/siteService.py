from supabase import create_client
from app.config import supabaseUrl, supabaseServiceKey

supabaseClient = create_client(supabaseUrl, supabaseServiceKey)

FREE_TIER_SITE_LIMIT = 10


async def checkPlanLimit(userId: str) -> bool:
    result = (
        supabaseClient.table("sites")
        .select("id", count="exact")
        .eq("user_id", userId)
        .execute()
    )
    return result.count < FREE_TIER_SITE_LIMIT


async def createSite(userId: str, payload):
    result = (
        supabaseClient.table("sites")
        .insert({
            "user_id": userId,
            "url": str(payload.url),
            "name": payload.name,
            "check_interval_seconds": payload.check_interval_seconds,
        })
        .execute()
    )
    return result.data[0]


async def listSites(userId: str):
    result = (
        supabaseClient.table("sites")
        .select("*")
        .eq("user_id", userId)
        .execute()
    )
    return result.data


async def getSite(userId: str, siteId: str):
    result = (
        supabaseClient.table("sites")
        .select("*")
        .eq("user_id", userId)
        .eq("id", siteId)
        .execute()
    )
    return result.data[0] if result.data else None


async def updateSite(userId: str, siteId: str, payload):
    updates = {k: v for k, v in payload.dict().items() if v is not None}
    result = (
        supabaseClient.table("sites")
        .update(updates)
        .eq("user_id", userId)
        .eq("id", siteId)
        .execute()
    )
    return result.data[0] if result.data else None


async def deleteSite(userId: str, siteId: str):
    supabaseClient.table("sites").delete().eq("user_id", userId).eq("id", siteId).execute()