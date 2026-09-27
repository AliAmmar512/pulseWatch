from app.supabaseClient import getSupabaseClient
from typing import Dict, Any, List, Optional

FREE_TIER_DOMAIN_LIMIT = 10


async def checkDomainPlanLimit(userId: str) -> bool:
    """Check if the user has reached their domain limit."""
    result = (
        await getSupabaseClient()
        .table("domains")
        .select("id", count="exact")
        .eq("user_id", userId)
        .execute()
    )
    return result.count < FREE_TIER_DOMAIN_LIMIT


async def createDomain(userId: str, payload: Any) -> Dict[str, Any]:
    """Create a new domain to monitor."""
    result = (
        await getSupabaseClient()
        .table("domains")
        .insert({
            "user_id": userId,
            "domain_name": payload.domain_name,
        })
        .execute()
    )
    return result.data[0]


async def listDomains(userId: str, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
    """
    List all domains for a user with their latest SSL check data, using a
    single batched query via PostgREST foreign-table embedding.
    """
    result = (
        await getSupabaseClient()
        .table("domains")
        .select("*, domain_checks(ssl_expiry_date, ssl_issuer, checked_at)")
        .eq("user_id", userId)
        .order("checked_at", desc=True, foreign_table="domain_checks")
        .limit(1, foreign_table="domain_checks")
        .range(offset, offset + limit - 1)
        .execute()
    )

    domains = result.data or []
    for domain in domains:
        checks = domain.pop("domain_checks", [])
        if checks:
            domain["ssl_expiry_date"] = checks[0]["ssl_expiry_date"]
            domain["ssl_issuer"] = checks[0]["ssl_issuer"]
            domain["last_checked_at"] = checks[0]["checked_at"]
        else:
            domain["ssl_expiry_date"] = None
            domain["ssl_issuer"] = None
            domain["last_checked_at"] = None

    return domains


async def getDomain(userId: str, domainId: str) -> Optional[Dict[str, Any]]:
    """
    Get a specific domain by ID, including latest SSL check data.
    Uses a single query with embedded domain_checks.
    """
    result = (
        await getSupabaseClient()
        .table("domains")
        .select("*, domain_checks(ssl_expiry_date, ssl_issuer, checked_at)")
        .eq("user_id", userId)
        .eq("id", domainId)
        .order("checked_at", desc=True, foreign_table="domain_checks")
        .limit(1, foreign_table="domain_checks")
        .execute()
    )
    if not result.data:
        return None

    domain = result.data[0]
    checks = domain.pop("domain_checks", [])
    if checks:
        domain["ssl_expiry_date"] = checks[0]["ssl_expiry_date"]
        domain["ssl_issuer"] = checks[0]["ssl_issuer"]
        domain["last_checked_at"] = checks[0]["checked_at"]
    else:
        domain["ssl_expiry_date"] = None
        domain["ssl_issuer"] = None
        domain["last_checked_at"] = None

    return domain


async def deleteDomain(userId: str, domainId: str) -> None:
    """Delete a domain by ID."""
    await (
        getSupabaseClient()
        .table("domains")
        .delete()
        .eq("user_id", userId)
        .eq("id", domainId)
        .execute()
    )
