import os
from dotenv import load_dotenv

load_dotenv()

supabaseUrl = os.getenv("SUPABASE_URL")
supabaseServiceKey = os.getenv("SUPABASE_SERVICE_KEY")
corsOrigins = os.getenv("CORS_ORIGINS", "http://localhost:3000")
supabaseJwtSecret = os.getenv("SUPABASE_JWT_SECRET")

if not supabaseUrl or not supabaseServiceKey:
    raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env")