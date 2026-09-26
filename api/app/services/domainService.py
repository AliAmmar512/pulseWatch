from supabase import create_client
from app.config import supabaseUrl, supabaseServiceKey

supabaseClient = create_client(supabaseUrl, supabaseServiceKey)

FREE_TIER_DOMAIN_LIMIT = 10


async def checkDomainPlanLimit(userId: str) -> bool:
    result = (
        supabaseClient.table("domains")
        .select("id", count="exact")
        .eq("user_id", userId)
        .execute()
    )
    return result.count < FREE_TIER_DOMAIN_LIMIT


async def createDomain(userId: str, payload):
    result = (
        supabaseClient.table("domains")
        .insert({
            "user_id": userId,
            "domain_name": payload.domain_name,
        })
        .execute()
    )
    return result.data[0]


async def listDomains(userId: str):
    result = (
        supabaseClient.table("domains")
        .select("*")
        .eq("user_id", userId)
        .execute()
    )
    return result.data


async def getDomain(userId: str, domainId: str):
    domainResult = (
        supabaseClient.table("domains")
        .select("*")
        .eq("user_id", userId)
        .eq("id", domainId)
        .execute()
    )
    if not domainResult.data:
        return None

    domain = domainResult.data[0]

    latestCheckResult = (
        supabaseClient.table("domain_checks")
        .select("ssl_expiry_date, ssl_issuer")
        .eq("domain_id", domainId)
        .order("checked_at", desc=True)
        .limit(1)
        .execute()
    )

    if latestCheckResult.data:
        domain["ssl_expiry_date"] = latestCheckResult.data[0]["ssl_expiry_date"]
        domain["ssl_issuer"] = latestCheckResult.data[0]["ssl_issuer"]

    return domain


async def deleteDomain(userId: str, domainId: str):
    supabaseClient.table("domains").delete().eq("user_id", userId).eq("id", domainId).execute()