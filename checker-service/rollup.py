from datetime import date, timedelta, datetime, timezone
from supabase import create_client
from config import supabaseUrl, supabaseSecretKey

supabase = create_client(supabaseUrl, supabaseSecretKey)


def computeDailySummaryForSite(siteId: str, targetDay: date):
    dayStart = datetime.combine(targetDay, datetime.min.time()).replace(tzinfo=timezone.utc)
    dayEnd = dayStart + timedelta(days=1)

    checksResult = (
        supabase.table("checks")
        .select("status, response_time_ms")
        .eq("site_id", siteId)
        .gte("checked_at", dayStart.isoformat())
        .lt("checked_at", dayEnd.isoformat())
        .execute()
    )
    checks = checksResult.data

    totalChecks = len(checks)
    if totalChecks == 0:
        return None

    upChecks = [c for c in checks if c["status"] == "up"]
    uptimePct = round((len(upChecks) / totalChecks) * 100, 2)

    responseTimes = [c["response_time_ms"] for c in upChecks if c["response_time_ms"] is not None]
    avgResponseMs = round(sum(responseTimes) / len(responseTimes)) if responseTimes else None

    return {
        "site_id": siteId,
        "day": targetDay.isoformat(),
        "uptime_pct": uptimePct,
        "avg_response_ms": avgResponseMs,
        "total_checks": totalChecks,
    }


def runRollup(targetDay: date = None):
    if targetDay is None:
        targetDay = date.today() - timedelta(days=1)  # default: yesterday

    print(f"[rollup] computing daily summaries for {targetDay}")

    sitesResult = supabase.table("sites").select("id").execute()
    sites = sitesResult.data

    summaries = []
    for site in sites:
        summary = computeDailySummaryForSite(site["id"], targetDay)
        if summary:
            summaries.append(summary)

    if summaries:
        supabase.table("daily_uptime_summary").upsert(
            summaries, on_conflict="site_id,day"
        ).execute()
        print(f"[rollup] wrote {len(summaries)} summary rows for {targetDay}")
    else:
        print(f"[rollup] no checks found for {targetDay}, nothing to write")


if __name__ == "__main__":
    runRollup()