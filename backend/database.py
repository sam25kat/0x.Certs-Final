import os
import asyncio
import sqlite3
from urllib.parse import urlparse
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import aiosqlite
import asyncpg

class DatabaseManager:
    def __init__(self):
        self.database_url = os.getenv("DATABASE_URL", "sqlite:///./certificates.db")
        self.is_postgres = self.database_url.startswith("postgresql")
        
    async def get_connection(self):
        """Get database connection - supports both SQLite and PostgreSQL"""
        if self.is_postgres:
            return await self._get_postgres_connection()
        else:
            return await self._get_sqlite_connection()
            
    async def _get_postgres_connection(self):
        """PostgreSQL connection"""
        # Parse the URL and modify for asyncpg
        parsed = urlparse(self.database_url)
        connection_kwargs = {
            'host': parsed.hostname,
            'port': parsed.port,
            'user': parsed.username,
            'password': parsed.password,
            'database': parsed.path[1:] if parsed.path.startswith('/') else parsed.path
        }
        return await asyncpg.connect(**connection_kwargs)
        
    async def _get_sqlite_connection(self):
        """SQLite connection"""
        db_path = self.database_url.replace("sqlite:///", "")
        return await aiosqlite.connect(db_path)
        
    async def execute_query(self, query, params=None, fetch=False):
        """Execute query with proper handling for both database types"""
        conn = await self.get_connection()
        try:
            if self.is_postgres:
                if fetch:
                    return await conn.fetch(query, *(params or []))
                else:
                    await conn.execute(query, *(params or []))
                    return None
            else:
                cursor = await conn.execute(query, params or [])
                if fetch:
                    return await cursor.fetchall()
                else:
                    await conn.commit()
                    return cursor.lastrowid
        finally:
            await conn.close()

# Global database manager instance
db_manager = DatabaseManager()

async def init_database_tables():
    """Initialize database tables - works for both SQLite and PostgreSQL"""
    
    # Create tables SQL (compatible with both databases)
    tables_sql = [
        """
        CREATE TABLE IF NOT EXISTS events (
            id SERIAL PRIMARY KEY,
            event_name VARCHAR(255) NOT NULL,
            description TEXT,
            event_code VARCHAR(50) UNIQUE NOT NULL,
            event_date DATE,
            sponsors TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_active INTEGER DEFAULT 1,
            certificate_template VARCHAR(255) DEFAULT 'default'
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS participants (
            wallet_address VARCHAR(42) PRIMARY KEY,
            event_id INTEGER,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL,
            team_name VARCHAR(255),
            telegram_username VARCHAR(100),
            registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            poa_status VARCHAR(50) DEFAULT 'not_minted',
            poa_token_id INTEGER,
            poa_minted_at TIMESTAMP,
            poa_transferred_at TIMESTAMP,
            certificate_status VARCHAR(50) DEFAULT 'not_generated',
            certificate_token_id INTEGER,
            certificate_minted_at TIMESTAMP,
            certificate_transferred_at TIMESTAMP,
            certificate_ipfs VARCHAR(255)
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS organizers (
            email VARCHAR(255) PRIMARY KEY,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS organizer_sessions (
            session_token VARCHAR(255) PRIMARY KEY,
            organizer_email VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP,
            is_active INTEGER DEFAULT 1
        )
        """
    ]
    
    # Modify SQL for SQLite vs PostgreSQL
    if not db_manager.is_postgres:
        # Replace SERIAL with INTEGER PRIMARY KEY for SQLite
        tables_sql = [sql.replace('SERIAL PRIMARY KEY', 'INTEGER PRIMARY KEY') 
                     .replace('VARCHAR(255)', 'TEXT')
                     .replace('VARCHAR(100)', 'TEXT')
                     .replace('VARCHAR(50)', 'TEXT')
                     .replace('VARCHAR(42)', 'TEXT') 
                     for sql in tables_sql]
    
    # Execute table creation
    for sql in tables_sql:
        try:
            await db_manager.execute_query(sql)
            print(f"Table created/verified successfully")
        except Exception as e:
            print(f"Error creating table: {e}")

async def ensure_iotopia_event():
    """Ensure IOTOPIA event exists in database"""
    try:
        # Check if IOTOPIA exists
        existing = await db_manager.execute_query(
            "SELECT id FROM events WHERE event_name = $1" if db_manager.is_postgres else "SELECT id FROM events WHERE event_name = ?",
            ["IOTOPIA"],
            fetch=True
        )
        
        if not existing:
            # Create IOTOPIA event
            await db_manager.execute_query(
                """INSERT INTO events (event_name, description, event_code, event_date, sponsors, certificate_template)
                   VALUES ($1, $2, $3, $4, $5, $6)""" if db_manager.is_postgres else
                """INSERT INTO events (event_name, description, event_code, event_date, sponsors, certificate_template)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                ["IOTOPIA", "REVA Hackathon 2025", "IOTOPIA2025", "2025-09-12", "NA", "default"]
            )
            print("IOTOPIA event created successfully!")
        else:
            print("IOTOPIA event already exists")
    except Exception as e:
        print(f"Error ensuring IOTOPIA event: {e}")