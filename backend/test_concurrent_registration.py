#!/usr/bin/env python3
"""
Bulk register fixed wallet addresses to event 8761
"""

import asyncio
import aiohttp
import time

# Config
BASE_URL = "http://localhost:8000"
EVENT_CODE = "275192"

# Fixed wallet addresses
WALLET_ADDRESSES = [
    "0x627306090abaB3A6e1400e9345bC60c78a8BEf57",
    "0xf17f52151EbEF6C7334FAD080c5704D77216b732",
    "0xc5e8f221cE59FD9C8e4d8a27cD3d09f9e7eF5e82",
    "0x821aea9a577a9b44299B9c15c88cf3087F3b5544",
    "0x0d1d4e623D10F9FBA5Db95830F7d3839406C6AF2",
    "0x2932b7a2355D6e9Ff9B6A2e5A7E4d1b8C9f4a5E1",
    "0x2191eF87E392377ec08E7c08Eb105Ef5448eCED5",
    "0xE11BA2b4D45Eaed5996Cd0823791E0C93114882d",
    "0x28a8746e75304c0780E011Bed21C72cBF72aD12e",
    "0x7cB57B5A97eAbe94205C07890BE4c1aD31E486A8",
]

async def register_wallet(session, wallet, idx):
    """Register a single wallet"""
    payload = {
        "wallet_address": wallet,
        "email": f"user{idx}@example.com",
        "name": f"Wallet User {idx}",
        "team_name": f"Team{idx}",
        "event_code": EVENT_CODE,
        "telegram_username": f"wallet{idx}"
    }

    start_time = time.time()
    try:
        async with session.post(
            f"{BASE_URL}/register_participant",
            json=payload,
            timeout=aiohttp.ClientTimeout(total=30)
        ) as response:
            duration = time.time() - start_time
            if response.status == 200:
                result = await response.json()
                return {"wallet": wallet, "status": "success", "duration": duration, "participant_id": result.get("participant_id")}
            else:
                return {"wallet": wallet, "status": "error", "duration": duration, "error": await response.text()}
    except Exception as e:
        return {"wallet": wallet, "status": "error", "error": str(e)}

async def bulk_register():
    print(f"Registering {len(WALLET_ADDRESSES)} wallets to event {EVENT_CODE}...")
    async with aiohttp.ClientSession() as session:
        tasks = [register_wallet(session, wallet, i+1) for i, wallet in enumerate(WALLET_ADDRESSES)]
        results = await asyncio.gather(*tasks)

    # Print results
    success = [r for r in results if r["status"] == "success"]
    failed = [r for r in results if r["status"] == "error"]

    print("\nRESULTS")
    print("=" * 40)
    print(f"Total: {len(results)} | Success: {len(success)} | Failed: {len(failed)}")
    for r in results:
        if r["status"] == "success":
            print(f"✅ {r['wallet']} → participant_id={r['participant_id']}")
        else:
            print(f"❌ {r['wallet']} → {r['error']}")

if __name__ == "__main__":
    asyncio.run(bulk_register())
