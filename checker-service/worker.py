import asyncio
import socket
import ssl
from datetime import date, datetime, timezone

import httpx
from supabase import create_client

from config import resendApiKey, supabaseSecretKey, supabaseUrl

supabase = create_client(supabaseUrl, supabaseSecretKey)

FAILURE_THRESHOLD = 3
CHECK_LOOP_INTERVAL = 30
TICK_INTERVAL = 5
DOMAIN_CHECK_INTERVAL = 3600
EXPIRY_WARNING_THRESHOLDS = [30, 14, 7, 1]


def getUserEmail(userId: str, alertsOnly: bool = False) -> str | None:
    """
    Look up a user's email address by their user ID via Supabase admin API.
    
    If alertsOnly is True, returns None if the user has disabled email alerts.
    """
    try:
        response = supabase.auth.admin.get_user_by_id(userId)
        user = response.user
        if alertsOnly:
            metadata = user.user_metadata or {}
            alertsEnabled = metadata.get("email_alerts_enabled", True)  # default ON
            if not alertsEnabled:
                print(f"[email] alerts disabled for user {userId}, skipping")
                return None
        return user.email
    except Exception as e:
        print(f"[email] failed to look up user {userId}: {e}")
        return None


async def sendEmail(client: httpx.AsyncClient, toEmail: str, subject: str, htmlBody: str):
    """
    Send an email asynchronously using the Resend API.
    """
    if not toEmail:
        return
    try:
        response = await client.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {resendApiKey}"},
            json={
                "from": "Pulsewatch <onboarding@resend.dev>",
                "to": [toEmail],
                "subject": subject,
                "html": htmlBody,
            },
            timeout=10.0,
        )
        if response.status_code >= 400:
            print(f"[email] failed to send to {toEmail}: {response.text}")
        else:
            print(f"[email] sent '{subject}' to {toEmail}")
    except Exception as e:
        print(f"[email] error sending to {toEmail}: {e}")


def publishEvent(userId: str, eventType: str, siteId: str, extra: dict = None):
    """
    Publish an event to the database via the notify_site_event RPC.
    """
    payload = {
        "type": eventType,
        "user_id": userId,
        "site_id": siteId,
    }
    if extra:
        payload.update(extra)

    supabase.rpc("notify_site_event", {"payload": payload}).execute()


async def pingSite(client: httpx.AsyncClient, url: str):
    """
    Ping a site URL using an async HTTP client and return its status, response time, and status code.
    """
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


def recordCheck(siteId: str, status: str, responseTimeMs: int | None, statusCode: int | None):
    """
    Record the result of a site check in the database.
    """
    supabase.table("checks").insert({
        "site_id": siteId,
        "status": status,
        "response_time_ms": responseTimeMs,
        "status_code": statusCode,
    }).execute()


def getRecentChecks(siteId: str, limit: int = FAILURE_THRESHOLD) -> list[str]:
    """
    Retrieve the statuses of the most recent checks for a site.
    """
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
    """
    Connect to a domain and retrieve its SSL certificate expiry date and issuer.
    """
    try:
        context = ssl.create_default_context()
        with socket.create_connection((hostname, port), timeout=timeout) as sock:
            with context.wrap_socket(sock, server_hostname=hostname) as sslSock:
                cert = sslSock.getpeercert()

        expiryStr = cert.get("notAfter")
        expiryDate = datetime.strptime(expiryStr, "%b %d %H:%M:%S %Y %Z").date()

        issuerFields = dict(x[0] for x in cert.get("issuer", []))
        issuer = issuerFields.get("organizationName", issuerFields.get("commonName", "Unknown"))

        return expiryDate, issuer, None
    except Exception as e:
        return None, None, str(e)


def recordDomainCheck(domainId: str, sslExpiryDate: date | None, sslIssuer: str | None, dnsRecordsHash: str | None = None):
    """
    Record the result of a domain SSL and DNS check in the database.
    """
    supabase.table("domain_checks").insert({
        "domain_id": domainId,
        "ssl_expiry_date": sslExpiryDate.isoformat() if sslExpiryDate else None,
        "ssl_issuer": sslIssuer,
        "dns_records_hash": dnsRecordsHash,
    }).execute()


def getOpenDomainAlert(domainId: str, alertType: str):
    """
    Check for an existing unresolved domain alert of the specified type.
    """
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
    """
    Create a new domain alert in the database.
    """
    supabase.table("domain_alerts").insert({
        "domain_id": domainId,
        "alert_type": alertType,
    }).execute()
    print(f"[domain-alert] OPENED {alertType} for domain {domainId}")


async def evaluateDomain(client: httpx.AsyncClient, domain: dict):
    """
    Evaluate a domain's SSL certificate and issue warnings if it expires soon.
    """
    domainId = domain["id"]
    domainName = domain["domain_name"]
    userId = domain["user_id"]

    expiryDate, issuer, error = await asyncio.to_thread(getSslInfo, domainName)

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

                userEmail = getUserEmail(userId, alertsOnly=True)
                await sendEmail(
                    client,
                    userEmail,
                    f"⚠️ SSL certificate for {domainName} expires in {daysLeft} days",
                    f"<p>The SSL certificate for <strong>{domainName}</strong> expires on <strong>{expiryDate}</strong> ({daysLeft} days left). Renew it soon to avoid downtime.</p>"
                )
            break


def getOpenIncident(siteId: str):
    """
    Check if there is an active (unresolved) incident for a given site.
    """
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
    """
    Create a new unresolved incident for a site.
    """
    supabase.table("incidents").insert({
        "site_id": siteId,
        "cause": "consecutive check failures",
        "is_resolved": False,
    }).execute()
    print(f"[incident] OPENED for site {siteId}")


def resolveIncident(incidentId: str):
    """
    Mark an incident as resolved.
    """
    supabase.table("incidents").update({
        "resolved_at": datetime.now(timezone.utc).isoformat(),
        "is_resolved": True,
    }).eq("id", incidentId).execute()
    print(f"[incident] RESOLVED {incidentId}")


async def evaluateSite(client: httpx.AsyncClient, site: dict):
    """
    Evaluate a site by pinging it, recording the result, and opening/resolving incidents as needed.
    """
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

            userEmail = getUserEmail(userId, alertsOnly=True)
            await sendEmail(
                client,
                userEmail,
                f"🔴 {url} is down",
                f"<p>Your site <strong>{url}</strong> has failed {FAILURE_THRESHOLD} consecutive checks and is now considered down.</p>"
            )
    else:
        if openIncident:
            resolveIncident(openIncident["id"])
            publishEvent(userId, "incident_resolved", siteId, {"incident_id": openIncident["id"]})

            userEmail = getUserEmail(userId, alertsOnly=True)
            await sendEmail(
                client,
                userEmail,
                f"✅ {url} has recovered",
                f"<p>Your site <strong>{url}</strong> is back up and responding normally.</p>"
            )


lastCheckedAt = {}
lastDomainCheckedAt = {}


async def runCheckLoop():
    """
    Main background worker loop that continually checks sites and domains based on their intervals.
    """
    last_fetch_time = 0
    cached_sites = []
    cached_domains = []

    async with httpx.AsyncClient() as client:
        while True:
            now_ts = datetime.now(timezone.utc).timestamp()
            
            # Re-fetch sites and domains every 60 seconds
            if now_ts - last_fetch_time >= 60:
                sitesResult = (
                    supabase.table("sites")
                    .select("id, url, check_interval_seconds, user_id")
                    .eq("is_active", True)
                    .execute()
                )
                cached_sites = sitesResult.data

                domainsResult = (
                    supabase.table("domains")
                    .select("id, domain_name, user_id")
                    .execute()
                )
                cached_domains = domainsResult.data
                
                last_fetch_time = now_ts

            now = datetime.now(timezone.utc)

            dueSites = []
            for site in cached_sites:
                siteId = site["id"]
                intervalSeconds = site.get("check_interval_seconds", 60)
                lastRun = lastCheckedAt.get(siteId)
                if lastRun is None or (now - lastRun).total_seconds() >= intervalSeconds:
                    dueSites.append(site)

            dueDomains = []
            for domain in cached_domains:
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
                domainTasks = [evaluateDomain(client, domain) for domain in dueDomains]
                await asyncio.gather(*domainTasks)
                for domain in dueDomains:
                    lastDomainCheckedAt[domain["id"]] = datetime.now(timezone.utc)

            if not dueSites and not dueDomains:
                print("[worker] nothing due for check yet...")

            await asyncio.sleep(TICK_INTERVAL)


if __name__ == "__main__":
    print("[worker] starting checker worker...")
    asyncio.run(runCheckLoop())