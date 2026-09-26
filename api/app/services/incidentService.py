from supabase import create_client
from app.config import supabaseUrl, supabaseServiceKey

supabaseClient = create_client(supabaseUrl, supabaseServiceKey)


async def listIncidentsForSite(userId: str, siteId: str, limit: int = 50):
    siteCheck = (
        supabaseClient.table("sites")
        .select("id")
        .eq("id", siteId)
        .eq("user_id", userId)
        .execute()
    )
    if not siteCheck.data:
        return None  # site doesn't exist or isn't owned by this user

    result = (
        supabaseClient.table("incidents")
        .select("*")
        .eq("site_id", siteId)
        .order("started_at", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data