# Pulsewatch

Live uptime, DNS/SSL, and performance monitoring platform for freelance developers and agencies.

**Status:** In development (Phase 1: Uptime + DNS/SSL monitoring)

## Structure
- `checker-service/` — async worker that runs scheduled uptime and DNS/SSL checks
- `api/` — FastAPI backend (REST + WebSocket)
- `dashboard/` — Next.js frontend