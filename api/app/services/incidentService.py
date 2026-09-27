from app.supabaseClient import getSupabaseClient
from typing import Dict, Any, List, Optional


async def listIncidentsForSite(userId: str, siteId: str, limit: int = 50) -> Optional[List[Dict[str, Any]]]:
    """
    List incidents for a specific site owned by the user.
    Returns None if the site doesn't exist or isn't owned by the user.
    """
    siteCheck = (
        await getSupabaseClient().table("sites")
        .select("id")
        .eq("id", siteId)
        .eq("user_id", userId)
        .execute()
    )
    if not siteCheck.data:
        return None  # site doesn't exist or isn't owned by this user

    result = (
        await getSupabaseClient().table("incidents")
        .select("*")
        .eq("site_id", siteId)
        .order("started_at", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data


async def listAllIncidents(userId: str, limit: int = 50) -> List[Dict[str, Any]]:
    """
    List all incidents across all sites owned by the user.
    """
    # First get all site ids for this user
    sitesResult = (
        await getSupabaseClient().table("sites")
        .select("id, name")
        .eq("user_id", userId)
        .execute()
    )
    if not sitesResult.data:
        return []
        
    siteIds = [site["id"] for site in sitesResult.data]
    siteMap = {site["id"]: site["name"] for site in sitesResult.data}
    
    # Then get incidents for these sites
    result = (
        await getSupabaseClient().table("incidents")
        .select("*")
        .in_("site_id", siteIds)
        .order("started_at", desc=True)
        .limit(limit)
        .execute()
    )
    
    incidents = result.data or []
    for inc in incidents:
        inc["siteName"] = siteMap.get(inc["site_id"], "Unknown")
        
    return incidents
