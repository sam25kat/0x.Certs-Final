#!/usr/bin/env python3
"""
Minimal test server to verify our async improvements work
"""
import os
import asyncio
import aiosqlite
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn

# Configuration
DB_PATH = "certificates.db"

# Database pool
db_pool = None
email_queue = asyncio.Queue()

class ParticipantRegister(BaseModel):
    wallet_address: str
    email: str
    name: str
    team_name: str = ""
    event_code: str
    telegram_username: str = ""

# Database connection pool
class DatabasePool:
    def __init__(self, db_path: str, max_connections: int = 10):
        self.db_path = db_path
        self.max_connections = max_connections
    
    async def get_connection(self):
        return await aiosqlite.connect(self.db_path)

# Email worker (simplified)
async def email_worker():
    print("Email worker started")
    while True:
        try:
            email_task = await asyncio.wait_for(email_queue.get(), timeout=1.0)
            if email_task is None:
                break
            print(f"Processing email for: {email_task.get('to_email', 'unknown')}")
            email_queue.task_done()
        except asyncio.TimeoutError:
            continue
        except Exception as e:
            print(f"Email worker error: {e}")

# FastAPI app with lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_pool
    
    # Startup
    print("Starting up...")
    db_pool = DatabasePool(DB_PATH, max_connections=20)
    
    # Start email worker
    email_task = asyncio.create_task(email_worker())
    print("Database pool and email worker initialized")
    
    yield
    
    # Shutdown
    print("Shutting down...")
    await email_queue.put(None)
    email_task.cancel()

app = FastAPI(title="Test Async API", lifespan=lifespan)

@app.post("/register_participant")
async def register_participant(participant: ParticipantRegister):
    """Test async registration endpoint"""
    print(f"Registration request: {participant.wallet_address}")
    
    async with await db_pool.get_connection() as conn:
        try:
            # Enable WAL mode and optimizations
            await conn.execute("PRAGMA journal_mode=WAL")
            await conn.execute("PRAGMA synchronous=NORMAL")
            await conn.execute("PRAGMA cache_size=10000")
            
            # Check event
            async with conn.execute(
                "SELECT id, event_name FROM events WHERE event_code = ? AND is_active = TRUE",
                (participant.event_code,)
            ) as cursor:
                event = await cursor.fetchone()
            
            if not event:
                raise HTTPException(status_code=404, detail=f"Invalid event code: {participant.event_code}")
            
            event_id, event_name = event
            
            # Check existing registration
            async with conn.execute(
                "SELECT id FROM participants WHERE wallet_address = ? AND event_id = ?",
                (participant.wallet_address, event_id)
            ) as cursor:
                existing = await cursor.fetchone()
            
            if existing:
                raise HTTPException(status_code=400, detail="Already registered")
            
            # Insert new participant with transaction
            await conn.execute("BEGIN IMMEDIATE")
            
            try:
                cursor = await conn.execute(
                    """INSERT INTO participants 
                       (wallet_address, email, name, team_name, event_id, telegram_username, telegram_verified, telegram_verified_at) 
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                    (participant.wallet_address, participant.email, participant.name, 
                     participant.team_name, event_id, participant.telegram_username, 
                     1 if participant.telegram_username else 0, 
                     datetime.now() if participant.telegram_username else None)
                )
                
                participant_id = cursor.lastrowid
                await conn.commit()
                
                # Queue email (non-blocking)
                await email_queue.put({
                    'to_email': participant.email,
                    'subject': f'Registration for {event_name}',
                    'body': f'Hello {participant.name}, you are registered!'
                })
                
                return {
                    "message": "Registration successful",
                    "participant_id": participant_id,
                    "event_name": event_name,
                    "event_id": event_id
                }
                
            except Exception as e:
                await conn.rollback()
                raise HTTPException(status_code=500, detail=f"Registration failed: {e}")
                
        except HTTPException:
            raise
        except Exception as e:
            print(f"Registration error: {e}")
            raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    uvicorn.run(
        "test_server:app",
        host="localhost",
        port=8000,
        reload=False,
        access_log=False,
        log_level="info"
    )