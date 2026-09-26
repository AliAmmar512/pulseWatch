from supabase import create_client
from app.config import supabaseUrl, supabaseServiceKey

supabaseClient = create_client(supabaseUrl, supabaseServiceKey)

FREE_TIER_SITE_LIMIT = 10


async def listSites(userId: str):
    result = (
        supabaseClient.table("sites")
        .select("*")
        .eq("user_id", userId)
        .execute()
    )
    sites = result.data

    enriched = []
    for site in sites:
        latestCheck = (
            supabaseClient.table("checks")
            .select("status, response_time_ms, checked_at")
            .eq("site_id", site["id"])
            .order("checked_at", desc=True)
            .limit(1)
            .execute()
        )
        currentStatus = latestCheck.data[0]["status"] if latestCheck.data else "unknown"
        lastResponseMs = latestCheck.data[0]["response_time_ms"] if latestCheck.data else None

        summary = (
            supabaseClient.table("daily_uptime_summary")
            .select("uptime_pct")
            .eq("site_id", site["id"])
            .order("day", desc=True)
            .limit(30)
            .execute()
        )
        uptimeValues = [row["uptime_pct"] for row in summary.data]
        uptime30d = round(sum(uptimeValues) / len(uptimeValues), 2) if uptimeValues else None

        enriched.append({
            **site,
            "current_status": currentStatus,
            "last_response_ms": lastResponseMs,
            "uptime_30d": uptime30d,
        })

    return enriched

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



async def getSite(userId: str, siteId: str):
    result = (
        supabaseClient.table("sites")
        .select("*")
        .eq("user_id", userId)
        .eq("id", siteId)
        .execute()
    )
    if not result.data:
        return None

    site = result.data[0]

    checksResult = (
        supabaseClient.table("checks")
        .select("status, response_time_ms, checked_at")
        .eq("site_id", siteId)
        .order("checked_at", desc=True)
        .limit(50)
        .execute()
    )

    incidentsResult = (
        supabaseClient.table("incidents")
        .select("*")
        .eq("site_id", siteId)
        .order("started_at", desc=True)
        .execute()
    )

    return {
        **site,
        "recent_checks": checksResult.data,
        "incidents": incidentsResult.data,
    }

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