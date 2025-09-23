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
        self._database_url = None
        self._is_postgres = None

    @property
    def database_url(self):
        if self._database_url is None:
            self._database_url = os.getenv("DATABASE_URL", "sqlite:///./certificates.db")
        return self._database_url

    @property
    def is_postgres(self):
        if self._is_postgres is None:
            self._is_postgres = self.database_url.startswith("postgresql")
        return self._is_postgres
        
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

def convert_sql_for_postgres(sql_query, params=None):
    """Convert SQLite SQL syntax to PostgreSQL"""
    if not db_manager.is_postgres:
        return sql_query, params
    
    # Convert ? placeholders to $1, $2, etc.
    param_count = 1
    converted_sql = ""
    i = 0
    while i < len(sql_query):
        if sql_query[i] == '?':
            converted_sql += f"${param_count}"
            param_count += 1
        else:
            converted_sql += sql_query[i]
        i += 1
    
    # Convert SQLite specific syntax to PostgreSQL
    converted_sql = converted_sql.replace("TRUE", "true").replace("FALSE", "false")
    converted_sql = converted_sql.replace("AUTOINCREMENT", "")
    
    return converted_sql, params

async def init_database_tables():
    """Initialize database tables - works for both SQLite and PostgreSQL"""
    
    if db_manager.is_postgres:
        # PostgreSQL specific table creation
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
                id SERIAL PRIMARY KEY,
                wallet_address VARCHAR(42) NOT NULL,
                event_id INTEGER REFERENCES events(id),
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
                certificate_ipfs VARCHAR(255),
                certificate_tx_hash VARCHAR(66),
                certificate_path VARCHAR(255),
                certificate_ipfs_hash VARCHAR(255),
                certificate_metadata_uri VARCHAR(500),
                UNIQUE(wallet_address, event_id)
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
                organizer_email VARCHAR(255) REFERENCES organizers(email),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP,
                is_active INTEGER DEFAULT 1
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS organizer_otp_sessions (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) NOT NULL,
                otp_code VARCHAR(10) NOT NULL,
                expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '10 minutes'),
                is_used BOOLEAN DEFAULT FALSE,
                session_token VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS certificate_templates (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) UNIQUE NOT NULL,
                display_name VARCHAR(255) NOT NULL,
                description TEXT,
                file_data BYTEA NOT NULL,
                file_type VARCHAR(50) DEFAULT 'application/pdf',
                uploaded_by VARCHAR(255) REFERENCES organizers(email),
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE,
                is_default BOOLEAN DEFAULT FALSE
            )
            """
        ]
    else:
        # SQLite specific table creation
        tables_sql = [
            """
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY,
                event_name TEXT NOT NULL,
                description TEXT,
                event_code TEXT UNIQUE NOT NULL,
                event_date TEXT,
                sponsors TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                is_active INTEGER DEFAULT 1,
                certificate_template TEXT DEFAULT 'default'
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS participants (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                wallet_address TEXT NOT NULL,
                event_id INTEGER,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                team_name TEXT,
                telegram_username TEXT,
                registration_date TEXT DEFAULT CURRENT_TIMESTAMP,
                poa_status TEXT DEFAULT 'not_minted',
                poa_token_id INTEGER,
                poa_minted_at TEXT,
                poa_transferred_at TEXT,
                certificate_status TEXT DEFAULT 'not_generated',
                certificate_token_id INTEGER,
                certificate_minted_at TEXT,
                certificate_transferred_at TEXT,
                certificate_ipfs TEXT,
                certificate_tx_hash TEXT,
                certificate_path TEXT,
                certificate_ipfs_hash TEXT,
                certificate_metadata_uri TEXT,
                UNIQUE(wallet_address, event_id)
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS organizers (
                email TEXT PRIMARY KEY,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                last_login TEXT
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS organizer_sessions (
                session_token TEXT PRIMARY KEY,
                organizer_email TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                expires_at TEXT,
                is_active INTEGER DEFAULT 1
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS organizer_otp_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL,
                otp_code TEXT NOT NULL,
                expires_at TEXT DEFAULT (datetime('now', '+10 minutes')),
                is_used INTEGER DEFAULT 0,
                session_token TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS certificate_templates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                display_name TEXT NOT NULL,
                description TEXT,
                file_data BLOB NOT NULL,
                file_type TEXT DEFAULT 'application/pdf',
                uploaded_by TEXT,
                uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
                is_active INTEGER DEFAULT 1,
                is_default INTEGER DEFAULT 0
            )
            """
        ]
    
    # Execute table creation
    for i, sql in enumerate(tables_sql):
        try:
            await db_manager.execute_query(sql)
            table_names = ["events", "participants", "organizers", "organizer_sessions", "organizer_otp_sessions", "certificate_templates"]
            print(f"Table '{table_names[i]}' created/verified successfully")
        except Exception as e:
            print(f"Error creating table {i}: {e}")
            print(f"SQL: {sql}")


async def migrate_database():
    """Migrate existing database to add missing columns"""
    if db_manager.is_postgres:
        # Add missing columns to PostgreSQL participants table if they don't exist
        migration_queries = [
            "ALTER TABLE participants ADD COLUMN IF NOT EXISTS certificate_tx_hash VARCHAR(66)",
            "ALTER TABLE participants ADD COLUMN IF NOT EXISTS certificate_path VARCHAR(255)",
            "ALTER TABLE participants ADD COLUMN IF NOT EXISTS certificate_ipfs_hash VARCHAR(255)",
            "ALTER TABLE participants ADD COLUMN IF NOT EXISTS certificate_metadata_uri VARCHAR(500)"
        ]
        
        for query in migration_queries:
            try:
                await db_manager.execute_query(query)
                print(f"Migration executed: {query}")
            except Exception as e:
                print(f"Migration skipped (column likely exists): {e}")
    else:
        # For SQLite, we would need to recreate the table, but for now just log
        print("SQLite migration would require table recreation - skipping for existing tables")

async def ensure_root_organizers():
    """Ensure root organizers exist in database"""
    root_organizers = [
        "sameer@0x.day",
        "shivani@0x.day", 
        "saijadhav@0x.day",
        "naresh@0x.day"
    ]
    
    try:
        for email in root_organizers:
            # Check if organizer already exists
            if db_manager.is_postgres:
                existing = await db_manager.execute_query(
                    "SELECT email FROM organizers WHERE email = $1",
                    [email],
                    fetch=True
                )
            else:
                existing = await db_manager.execute_query(
                    "SELECT email FROM organizers WHERE email = ?",
                    [email],
                    fetch=True
                )
            
            if not existing:
                # Create root organizer
                if db_manager.is_postgres:
                    await db_manager.execute_query(
                        "INSERT INTO organizers (email, created_at) VALUES ($1, CURRENT_TIMESTAMP)",
                        [email]
                    )
                else:
                    await db_manager.execute_query(
                        "INSERT INTO organizers (email, created_at) VALUES (?, CURRENT_TIMESTAMP)",
                        [email]
                    )
                print(f"Root organizer created: {email}")
            else:
                print(f"Root organizer already exists: {email}")
                
    except Exception as e:
        print(f"Error ensuring root organizers: {e}")

async def ensure_iotopia_event():
    """Ensure IOTOPIA event exists in database"""
    try:
        # Check if IOTOPIA exists
        if db_manager.is_postgres:
            existing = await db_manager.execute_query(
                "SELECT id FROM events WHERE event_name = $1",
                ["IOTOPIA"],
                fetch=True
            )
        else:
            existing = await db_manager.execute_query(
                "SELECT id FROM events WHERE event_name = ?",
                ["IOTOPIA"],
                fetch=True
            )
        
        if not existing:
            # Create IOTOPIA event
            if db_manager.is_postgres:
                from datetime import date
                await db_manager.execute_query(
                    """INSERT INTO events (event_name, description, event_code, event_date, sponsors, certificate_template)
                       VALUES ($1, $2, $3, $4, $5, $6)""",
                    ["IOTOPIA", "REVA Hackathon 2025", "064708", date(2025, 9, 12), "NA", "default"]
                )
            else:
                await db_manager.execute_query(
                    """INSERT INTO events (event_name, description, event_code, event_date, sponsors, certificate_template)
                       VALUES (?, ?, ?, ?, ?, ?)""",
                    ["IOTOPIA", "REVA Hackathon 2025", "064708", "2025-09-12", "NA", "default"]
                )
            print("IOTOPIA event created successfully!")
        else:
            print("IOTOPIA event already exists")
    except Exception as e:
        print(f"Error ensuring IOTOPIA event: {e}")