from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client
from app.config import supabaseUrl, supabaseServiceKey

supabaseClient = create_client(supabaseUrl, supabaseServiceKey)

bearerScheme = HTTPBearer()


async def getCurrentUser(credentials: HTTPAuthorizationCredentials = Depends(bearerScheme)) -> str:
    token = credentials.credentials
    try:
        userResponse = supabaseClient.auth.get_user(token)
        return userResponse.user.id
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")