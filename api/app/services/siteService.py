from app.supabaseClient import getSupabaseClient
from typing import List, Optional, Dict, Any

FREE_TIER_SITE_LIMIT = 10

async def listSites(userId: str, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
    """
    List all sites for a user with pagination.
    Includes recent checks and 30-day uptime summary.
    """
    result = (
        await getSupabaseClient().table("sites")
        .select("*, checks(status, response_time_ms, checked_at), daily_uptime_summary(uptime_pct)")
        .eq("user_id", userId)
        .order("checked_at", desc=True, foreign_table="checks")
        .limit(8, foreign_table="checks")
        .order("day", desc=True, foreign_table="daily_uptime_summary")
        .limit(30, foreign_table="daily_uptime_summary")
        .range(offset, offset + limit - 1)
        .execute()
    )
    sites = result.data

    if not sites:
        return []

    enriched = []
    for site in sites:
        checks = site.pop("checks", [])
        summaries = site.pop("daily_uptime_summary", [])

        latest = checks[0] if checks else None
        uptimeValues = [s["uptime_pct"] for s in summaries]
        sparkline = [c["response_time_ms"] or 0 for c in reversed(checks)]

        enriched.append({
            **site,
            "current_status": latest["status"] if latest else "unknown",
            "last_response_ms": latest["response_time_ms"] if latest else None,
            "uptime_30d": round(sum(uptimeValues) / len(uptimeValues), 2) if uptimeValues else None,
            "sparkline": sparkline,
        })

    return enriched

async def checkPlanLimit(userId: str) -> bool:
    """
    Check if the user has reached their free tier site limit.
    """
    result = (
        await getSupabaseClient().table("sites")
        .select("id", count="exact")
        .eq("user_id", userId)
        .execute()
    )
    return result.count < FREE_TIER_SITE_LIMIT


async def createSite(userId: str, payload: Any) -> Dict[str, Any]:
    """
    Create a new site for the user.
    """
    result = (
        await getSupabaseClient().table("sites")
        .insert({
            "user_id": userId,
            "url": str(payload.url),
            "name": payload.name,
            "check_interval_seconds": payload.check_interval_seconds,
        })
        .execute()
    )
    return result.data[0]


async def getSite(userId: str, siteId: str) -> Optional[Dict[str, Any]]:
    """
    Get a specific site by ID, including recent checks and incidents.
    """
    result = (
        await getSupabaseClient().table("sites")
        .select("*, checks(status, response_time_ms, checked_at), incidents(*)")
        .eq("user_id", userId)
        .eq("id", siteId)
        .order("checked_at", desc=True, foreign_table="checks")
        .limit(50, foreign_table="checks")
        .order("started_at", desc=True, foreign_table="incidents")
        .limit(50, foreign_table="incidents")
        .execute()
    )

    if not result.data:
        return None

    site = result.data[0]
    checks = site.pop("checks", [])
    incidents = site.pop("incidents", [])

    return {
        **site,
        "recent_checks": checks,
        "incidents": incidents,
    }

async def updateSite(userId: str, siteId: str, payload: Any) -> Optional[Dict[str, Any]]:
    """
    Update a site's properties.
    """
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    result = (
        await getSupabaseClient().table("sites")
        .update(updates)
        .eq("user_id", userId)
        .eq("id", siteId)
        .execute()
    )
    return result.data[0] if result.data else None


async def deleteSite(userId: str, siteId: str) -> None:
    """
    Delete a site by ID.
    """
    await getSupabaseClient().table("sites").delete().eq("user_id", userId).eq("id", siteId).execute()
