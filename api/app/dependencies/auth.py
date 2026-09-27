from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.supabaseClient import getSupabaseClient
from app.config import supabaseJwtSecret
import jwt

bearerScheme = HTTPBearer()


def _getTokenAlgorithm(token: str) -> str:
    """Peek at the JWT header to determine its signing algorithm."""
    try:
        header = jwt.get_unverified_header(token)
        return header.get("alg", "")
    except Exception:
        return ""


def validateTokenLocal(token: str) -> str:
    """
    Validates the token locally using SUPABASE_JWT_SECRET (HS256 only).
    Raises HTTPException on failure.
    """
    try:
        payload = jwt.decode(
            token,
            supabaseJwtSecret,
            algorithms=["HS256"],
            options={"verify_aud": False}
        )
        return payload["sub"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def validateTokenAsync(token: str) -> str:
    """
    Validates the token with the Supabase API.
    """
    try:
        userResponse = await getSupabaseClient().auth.get_user(token)
        return userResponse.user.id
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

async def validateToken(token: str) -> str:
    """
    Unified token validation.
    Uses fast local HS256 validation when SUPABASE_JWT_SECRET is set AND the
    token is HS256-signed. Falls back to remote Supabase API for ES256 tokens
    (the default for newer Supabase projects) or when no secret is configured.
    """
    if supabaseJwtSecret and _getTokenAlgorithm(token) == "HS256":
        return validateTokenLocal(token)
    return await validateTokenAsync(token)


async def getCurrentUser(credentials: HTTPAuthorizationCredentials = Depends(bearerScheme)) -> str:
    """
    FastAPI dependency: extracts and validates the Bearer token from the
    Authorization header, returning the authenticated user ID.
    """
    return await validateToken(credentials.credentials)
