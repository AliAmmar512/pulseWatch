from app.supabaseClient import getSupabaseClient
from typing import Dict, Any, List, Optional

async def createStatusPage(userId: str, payload: Any) -> Dict[str, Any]:
    """
    Create a new status page linked to the specified sites.
    """
    ownedSites = (
        await getSupabaseClient().table("sites")
        .select("id")
        .eq("user_id", userId)
        .in_("id", payload.site_ids)
        .execute()
    )
    ownedIds = {row["id"] for row in ownedSites.data}
    if ownedIds != set(payload.site_ids):
        raise ValueError("One or more sites do not belong to this user")

    pageResult = (
        await getSupabaseClient().table("status_pages")
        .insert({
            "user_id": userId,
            "slug": payload.slug,
            "is_public": True,
        })
        .execute()
    )
    page = pageResult.data[0]

    linkRows = [{"status_page_id": page["id"], "site_id": siteId} for siteId in payload.site_ids]
    await getSupabaseClient().table("status_page_sites").insert(linkRows).execute()

    return page


async def listStatusPages(userId: str, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
    """
    List all status pages for a user with pagination.
    """
    result = (
        await getSupabaseClient().table("status_pages")
        .select("*")
        .eq("user_id", userId)
        .range(offset, offset + limit - 1)
        .execute()
    )
    return result.data


async def deleteStatusPage(userId: str, pageId: str) -> None:
    """
    Delete a status page by ID.
    """
    await getSupabaseClient().table("status_pages").delete().eq("user_id", userId).eq("id", pageId).execute()


async def getPublicStatusPage(slug: str) -> Optional[Dict[str, Any]]:
    """
    Get a public status page by slug.
    Batch-fetches associated sites, latest checks, and 30-day summaries to avoid N+1 queries.
    """
    pageResult = (
        await getSupabaseClient().table("status_pages")
        .select("id, slug, is_public")
        .eq("slug", slug)
        .eq("is_public", True)
        .execute()
    )
    if not pageResult.data:
        return None

    page = pageResult.data[0]

    linkedSites = (
        await getSupabaseClient().table("status_page_sites")
        .select("site_id")
        .eq("status_page_id", page["id"])
        .execute()
    )
    siteIds = [row["site_id"] for row in linkedSites.data]

    if not siteIds:
        return {"slug": page["slug"], "sites": []}

    sitesResult = (
        await getSupabaseClient().table("sites")
        .select("id, name")
        .in_("id", siteIds)
        .execute()
    )
    sitesData = {site["id"]: {"name": site["name"], "current_status": "unknown", "uptimeValues": []} for site in sitesResult.data}

    checksResult = (
        await getSupabaseClient().table("checks")
        .select("site_id, status, checked_at")
        .in_("site_id", siteIds)
        .order("checked_at", desc=True)
        .execute()
    )
    
    seenSites = set()
    for check in checksResult.data:
        s_id = check["site_id"]
        if s_id not in seenSites and s_id in sitesData:
            sitesData[s_id]["current_status"] = check["status"]
            seenSites.add(s_id)

    summaryResult = (
        await getSupabaseClient().table("daily_uptime_summary")
        .select("site_id, uptime_pct")
        .in_("site_id", siteIds)
        .order("day", desc=True)
        .execute()
    )
    
    for row in summaryResult.data:
        s_id = row["site_id"]
        if s_id in sitesData:
            if len(sitesData[s_id]["uptimeValues"]) < 30:
                sitesData[s_id]["uptimeValues"].append(row["uptime_pct"])

    sitesOut = []
    for s_id, data in sitesData.items():
        uptimeValues = data["uptimeValues"]
        avgUptime = sum(uptimeValues) / len(uptimeValues) if uptimeValues else None
        sitesOut.append({
            "name": data["name"],
            "current_status": data["current_status"],
            "uptime_30d": avgUptime,
        })

    return {"slug": page["slug"], "sites": sitesOut}
