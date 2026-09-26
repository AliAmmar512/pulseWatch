import asyncio
import websockets
import json


TOKEN = "eyJhbGciOiJFUzI1NiIsImtpZCI6ImYxYTUxZDUzLWIxZTMtNGI2OS1hZTZlLTEwZWEyNTlmNTczMSIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL21xb2tlbXFmdWl2dGNsZ29hZ2ZsLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI1NmM4NmUzZC0wYzgyLTQ5NjMtOGEwMy00N2EwOTg5ZWZkYWIiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzkwNDIwMDk3LCJpYXQiOjE3OTA0MTY0OTcsImVtYWlsIjoic211aGFtbWFkYWxpYW1tYXJAZ21haWwuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJlbWFpbF92ZXJpZmllZCI6dHJ1ZX0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3OTA0MTY0OTd9XSwic2Vzc2lvbl9pZCI6IjAwYzI3ZmFiLThiYWQtNGNkZC1iMjBhLWI4MWEyZjJiMjI0MCIsImlzX2Fub255bW91cyI6ZmFsc2V9.XRlrczQAZpC04MIuKyHjKPiJpl8RpMq7sEI_wHWPwd2UumfTogfIgjm0mbrtiC2nPvpFVoscTrMg-2UoS4Ktxw"

async def listen():
    uri = f"ws://127.0.0.1:8000/ws?token={TOKEN}"
    async with websockets.connect(uri) as ws:
        print("[test client] connected, waiting for events...")
        while True:
            message = await ws.recv()
            print(f"[test client] received: {message}")

asyncio.run(listen())