# get_test_token.py
from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xb2tlbXFmdWl2dGNsZ29hZ2ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NTU2NzksImV4cCI6MjEwNTIzMTY3OX0.Be5pLCWNFRapHZax4Y6F7EdzYrATItN_uVjaY1ifgsY"  # paste your actual anon/publishable key here

supabase = create_client(url, anonKey)

response = supabase.auth.sign_in_with_password({
    "email": "smuhammadaliammar@gmail.com",
    "password": "aliammar+1974"
})

print("ACCESS TOKEN:")
print(response.session.access_token)