import secrets
import time
from typing import Optional

TICKET_TTL_SECONDS = 30

_tickets: dict[str, tuple[str, float]] = {}


def issueTicket(userId: str) -> str:
    """Creates a short-lived, single-use ticket for WebSocket auth handoff."""
    ticket = secrets.token_urlsafe(32)
    _tickets[ticket] = (userId, time.monotonic() + TICKET_TTL_SECONDS)
    return ticket


def consumeTicket(ticket: str) -> Optional[str]:
    """Redeems a ticket once; returns the associated userId or None if invalid/expired."""
    entry = _tickets.pop(ticket, None)
    if entry is None:
        return None
    userId, expiresAt = entry
    if time.monotonic() > expiresAt:
        return None
    return userId
