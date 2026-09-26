import asyncio
import httpx
from datetime import datetime, timezone
from supabase import create_client
from config import supabaseUrl, supabaseSecretKey

supabase = create_client(supabaseUrl, supabaseSecretKey)

FAILURE_THRESHOLD = 3
CHECK_LOOP_INTERVAL = 30


async def pingSite(client: httpx.AsyncClient, url: str):
    startTime = datetime.now(timezone.utc)
    try:
        response = await client.get(url, timeout=10.0, follow_redirects=True)
        elapsedMs = int((datetime.now(timezone.utc) - startTime).total_seconds() * 1000)
        if 200 <= response.status_code < 400:
            return "up", elapsedMs, response.status_code
        else:
            return "down", elapsedMs, response.status_code
    except (httpx.TimeoutException, httpx.ConnectError, httpx.RequestError):
        return "down", None, None


def recordCheck(siteId: str, status: str, responseTimeMs, statusCode):
    supabase.table("checks").insert({
        "site_id": siteId,
        "status": status,
        "response_time_ms": responseTimeMs,
        "status_code": statusCode,
    }).execute()


def getRecentChecks(siteId: str, limit: int = FAILURE_THRESHOLD):
    result = (
        supabase.table("checks")
        .select("status")
        .eq("site_id", siteId)
        .order("checked_at", desc=True)
        .limit(limit)
        .execute()
    )
    return [row["status"] for row in result.data]


def getOpenIncident(siteId: str):
    result = (
        supabase.table("incidents")
        .select("id")
        .eq("site_id", siteId)
        .eq("is_resolved", False)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


def createIncident(siteId: str):
    supabase.table("incidents").insert({
        "site_id": siteId,
        "cause": "consecutive check failures",
        "is_resolved": False,
    }).execute()
    print(f"[incident] OPENED for site {siteId}")


def resolveIncident(incidentId: str):
    supabase.table("incidents").update({
        "resolved_at": datetime.now(timezone.utc).isoformat(),
        "is_resolved": True,
    }).eq("id", incidentId).execute()
    print(f"[incident] RESOLVED {incidentId}")


async def evaluateSite(client: httpx.AsyncClient, site: dict):
    siteId = site["id"]
    url = site["url"]

    status, responseTimeMs, statusCode = await pingSite(client, url)
    recordCheck(siteId, status, responseTimeMs, statusCode)
    print(f"[check] {url} -> {status} ({responseTimeMs}ms)")

    openIncident = getOpenIncident(siteId)

    if status == "down":
        recentStatuses = getRecentChecks(siteId, FAILURE_THRESHOLD)
        allFailed = len(recentStatuses) == FAILURE_THRESHOLD and all(
            s == "down" for s in recentStatuses
        )
        if allFailed and not openIncident:
            createIncident(siteId)
    else:
        if openIncident:
            resolveIncident(openIncident["id"])


lastCheckedAt = {}  # in-memory: {site_id: datetime of last check}
TICK_INTERVAL = 5   # how often the loop wakes up to check what's due


async def runCheckLoop():
    async with httpx.AsyncClient() as client:
        while True:
            sitesResult = (
                supabase.table("sites")
                .select("id, url, check_interval_seconds")
                .eq("is_active", True)
                .execute()
            )
            sites = sitesResult.data

            now = datetime.now(timezone.utc)
            dueSites = []

            for site in sites:
                siteId = site["id"]
                intervalSeconds = site.get("check_interval_seconds", 60)
                lastRun = lastCheckedAt.get(siteId)

                if lastRun is None or (now - lastRun).total_seconds() >= intervalSeconds:
                    dueSites.append(site)

            if dueSites:
                tasks = [evaluateSite(client, site) for site in dueSites]
                await asyncio.gather(*tasks)
                for site in dueSites:
                    lastCheckedAt[site["id"]] = datetime.now(timezone.utc)
            else:
                print("[worker] no sites due for check yet...")

            await asyncio.sleep(TICK_INTERVAL)


if __name__ == "__main__":
    print("[worker] starting checker worker...")
    asyncio.run(runCheckLoop())