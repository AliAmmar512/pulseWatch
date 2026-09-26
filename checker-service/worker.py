import asyncio
import httpx
from datetime import datetime, timezone
from supabase import create_client
from config import supabaseUrl, supabaseSecretKey
import ssl
import socket
from datetime import date


def publishEvent(userId: str, eventType: str, siteId: str, extra: dict = None):
    payload = {
        "type": eventType,
        "user_id": userId,
        "site_id": siteId,
    }
    if extra:
        payload.update(extra)

    supabase.rpc("notify_site_event", {"payload": payload}).execute()

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


def getSslInfo(hostname: str, port: int = 443, timeout: float = 10.0):
    """Connect to a domain and retrieve its SSL certificate expiry + issuer."""
    try:
        context = ssl.create_default_context()
        with socket.create_connection((hostname, port), timeout=timeout) as sock:
            with context.wrap_socket(sock, server_hostname=hostname) as sslSock:
                cert = sslSock.getpeercert()

        expiryStr = cert.get("notAfter")  # e.g. 'Jun  1 12:00:00 2027 GMT'
        expiryDate = datetime.strptime(expiryStr, "%b %d %H:%M:%S %Y %Z").date()

        issuerFields = dict(x[0] for x in cert.get("issuer", []))
        issuer = issuerFields.get("organizationName", issuerFields.get("commonName", "Unknown"))

        return expiryDate, issuer, None
    except Exception as e:
        return None, None, str(e)


def recordDomainCheck(domainId: str, sslExpiryDate, sslIssuer, dnsRecordsHash=None):
    supabase.table("domain_checks").insert({
        "domain_id": domainId,
        "ssl_expiry_date": sslExpiryDate.isoformat() if sslExpiryDate else None,
        "ssl_issuer": sslIssuer,
        "dns_records_hash": dnsRecordsHash,
    }).execute()


def getOpenDomainAlert(domainId: str, alertType: str):
    result = (
        supabase.table("domain_alerts")
        .select("id")
        .eq("domain_id", domainId)
        .eq("alert_type", alertType)
        .is_("resolved_at", "null")
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


def createDomainAlert(domainId: str, alertType: str):
    supabase.table("domain_alerts").insert({
        "domain_id": domainId,
        "alert_type": alertType,
    }).execute()
    print(f"[domain-alert] OPENED {alertType} for domain {domainId}")


EXPIRY_WARNING_THRESHOLDS = [30, 14, 7, 1]  # days before expiry to warn


async def evaluateDomain(domain: dict):
    domainId = domain["id"]
    domainName = domain["domain_name"]
    userId = domain["user_id"]

    expiryDate, issuer, error = getSslInfo(domainName)

    if error:
        print(f"[domain-check] {domainName} -> ERROR: {error}")
        recordDomainCheck(domainId, None, None)
        return

    recordDomainCheck(domainId, expiryDate, issuer)
    daysLeft = (expiryDate - date.today()).days
    print(f"[domain-check] {domainName} -> SSL expires {expiryDate} ({daysLeft} days left, issuer: {issuer})")

    for threshold in EXPIRY_WARNING_THRESHOLDS:
        alertType = f"ssl_expiry_{threshold}d"
        if daysLeft <= threshold:
            existingAlert = getOpenDomainAlert(domainId, alertType)
            if not existingAlert:
                createDomainAlert(domainId, alertType)
                publishEvent(userId, "domain_expiry_warning", None, {
                    "domain_id": domainId,
                    "days_left": daysLeft,
                })
            break  # only fire the most urgent applicable threshold

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
    userId = site["user_id"]

    status, responseTimeMs, statusCode = await pingSite(client, url)
    recordCheck(siteId, status, responseTimeMs, statusCode)
    print(f"[check] {url} -> {status} ({responseTimeMs}ms)")

    publishEvent(userId, "status_update", siteId, {"status": status})

    openIncident = getOpenIncident(siteId)

    if status == "down":
        recentStatuses = getRecentChecks(siteId, FAILURE_THRESHOLD)
        allFailed = len(recentStatuses) == FAILURE_THRESHOLD and all(
            s == "down" for s in recentStatuses
        )
        if allFailed and not openIncident:
            createIncident(siteId)
            newIncident = getOpenIncident(siteId)
            publishEvent(userId, "incident_created", siteId, {"incident_id": newIncident["id"]})
    else:
        if openIncident:
            resolveIncident(openIncident["id"])
            publishEvent(userId, "incident_resolved", siteId, {"incident_id": openIncident["id"]})

lastCheckedAt = {}  # in-memory: {site_id: datetime of last check}
TICK_INTERVAL = 5   # how often the loop wakes up to check what's due

lastDomainCheckedAt = {}
DOMAIN_CHECK_INTERVAL = 3600  # check SSL once per hour per domain — no need for frequent checks


async def runCheckLoop():
    async with httpx.AsyncClient() as client:
        while True:
            sitesResult = (
                supabase.table("sites")
                .select("id, url, check_interval_seconds, user_id")
                .eq("is_active", True)
                .execute()
            )
            sites = sitesResult.data

            domainsResult = (
                supabase.table("domains")
                .select("id, domain_name, user_id")
                .execute()
            )
            domains = domainsResult.data

            now = datetime.now(timezone.utc)

            dueSites = []
            for site in sites:
                siteId = site["id"]
                intervalSeconds = site.get("check_interval_seconds", 60)
                lastRun = lastCheckedAt.get(siteId)
                if lastRun is None or (now - lastRun).total_seconds() >= intervalSeconds:
                    dueSites.append(site)

            dueDomains = []
            for domain in domains:
                domainId = domain["id"]
                lastRun = lastDomainCheckedAt.get(domainId)
                if lastRun is None or (now - lastRun).total_seconds() >= DOMAIN_CHECK_INTERVAL:
                    dueDomains.append(domain)

            if dueSites:
                tasks = [evaluateSite(client, site) for site in dueSites]
                await asyncio.gather(*tasks)
                for site in dueSites:
                    lastCheckedAt[site["id"]] = datetime.now(timezone.utc)

            if dueDomains:
                domainTasks = [evaluateDomain(domain) for domain in dueDomains]
                await asyncio.gather(*domainTasks)
                for domain in dueDomains:
                    lastDomainCheckedAt[domain["id"]] = datetime.now(timezone.utc)

            if not dueSites and not dueDomains:
                print("[worker] nothing due for check yet...")

            await asyncio.sleep(TICK_INTERVAL)

if __name__ == "__main__":
    print("[worker] starting checker worker...")
    asyncio.run(runCheckLoop())