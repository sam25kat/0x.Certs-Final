#!/usr/bin/env python3

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

print("Environment variables:")
print(f"DATABASE_URL: {os.getenv('DATABASE_URL', 'NOT SET')}")
print(f"DB_URL: {os.getenv('DB_URL', 'NOT SET')}")

# Import after loading env
from database import db_manager

print(f"\nDatabase Manager:")
print(f"Database URL: {db_manager.database_url}")
print(f"Is PostgreSQL: {db_manager.is_postgres}")