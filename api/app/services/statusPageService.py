from supabase import create_client
from app.config import supabaseUrl, supabaseServiceKey

supabaseClient = create_client(supabaseUrl, supabaseServiceKey)


async def createStatusPage(userId: str, payload):
    ownedSites = (
        supabaseClient.table("sites")
        .select("id")
        .eq("user_id", userId)
        .in_("id", payload.site_ids)
        .execute()
    )
    ownedIds = {row["id"] for row in ownedSites.data}
    if ownedIds != set(payload.site_ids):
        raise ValueError("One or more sites do not belong to this user")

    pageResult = (
        supabaseClient.table("status_pages")
        .insert({
            "user_id": userId,
            "slug": payload.slug,
            "is_public": True,
        })
        .execute()
    )
    page = pageResult.data[0]

    linkRows = [{"status_page_id": page["id"], "site_id": siteId} for siteId in payload.site_ids]
    supabaseClient.table("status_page_sites").insert(linkRows).execute()

    return page


async def listStatusPages(userId: str):
    result = (
        supabaseClient.table("status_pages")
        .select("*")
        .eq("user_id", userId)
        .execute()
    )
    return result.data


async def deleteStatusPage(userId: str, pageId: str):
    supabaseClient.table("status_pages").delete().eq("user_id", userId).eq("id", pageId).execute()


async def getPublicStatusPage(slug: str):
    pageResult = (
        supabaseClient.table("status_pages")
        .select("id, slug, is_public")
        .eq("slug", slug)
        .eq("is_public", True)
        .execute()
    )
    if not pageResult.data:
        return None

    page = pageResult.data[0]

    linkedSites = (
        supabaseClient.table("status_page_sites")
        .select("site_id")
        .eq("status_page_id", page["id"])
        .execute()
    )
    siteIds = [row["site_id"] for row in linkedSites.data]

    if not siteIds:
        return {"slug": page["slug"], "sites": []}

    sitesResult = (
        supabaseClient.table("sites")
        .select("id, name")
        .in_("id", siteIds)
        .execute()
    )

    sitesOut = []
    for site in sitesResult.data:
        latestCheck = (
            supabaseClient.table("checks")
            .select("status")
            .eq("site_id", site["id"])
            .order("checked_at", desc=True)
            .limit(1)
            .execute()
        )
        currentStatus = latestCheck.data[0]["status"] if latestCheck.data else "unknown"

        summary = (
            supabaseClient.table("daily_uptime_summary")
            .select("uptime_pct")
            .eq("site_id", site["id"])
            .order("day", desc=True)
            .limit(30)
            .execute()
        )
        uptimeValues = [row["uptime_pct"] for row in summary.data]
        avgUptime = sum(uptimeValues) / len(uptimeValues) if uptimeValues else None

        sitesOut.append({
            "name": site["name"],
            "current_status": currentStatus,
            "uptime_30d": avgUptime,
        })

    return {"slug": page["slug"], "sites": sitesOut}