"""
Lazy async Supabase client singleton.

supabase-py's `create_async_client` is itself a coroutine, so it cannot be
called at module import time.  Instead we store `None` here and initialise the
real client once inside the FastAPI lifespan startup hook via `initSupabase()`.
All service functions call `getSupabaseClient()` which returns the already-
initialised instance.
"""

from supabase import AsyncClient, create_async_client
from app.config import supabaseUrl, supabaseServiceKey

_client: AsyncClient | None = None


async def initSupabase() -> None:
    """Initialise the global async Supabase client.  Must be called once at startup."""
    global _client
    _client = await create_async_client(supabaseUrl, supabaseServiceKey)


def getSupabaseClient() -> AsyncClient:
    """Return the initialised Supabase client.  Raises RuntimeError if not yet initialised."""
    if _client is None:
        raise RuntimeError(
            "Supabase client has not been initialised. "
            "Ensure initSupabase() is awaited in the FastAPI lifespan startup."
        )
    return _client
