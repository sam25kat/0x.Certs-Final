#!/usr/bin/env python3

import asyncio
from database import db_manager

async def debug_db_connection():
    """Debug database connection and table existence"""

    print("Debugging database connection...")
    print(f"Database URL: {db_manager.database_url}")
    print(f"Is PostgreSQL: {db_manager.is_postgres}")

    # Test basic connection
    try:
        conn = await db_manager.get_connection()
        print("SUCCESS: Successfully connected to database")
        await conn.close()
    except Exception as e:
        print(f"ERROR: Failed to connect: {e}")
        return

    # Check if table exists
    try:
        if db_manager.is_postgres:
            check_sql = "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'certificate_templates')"
        else:
            check_sql = "SELECT name FROM sqlite_master WHERE type='table' AND name='certificate_templates'"

        result = await db_manager.execute_query(check_sql, fetch=True)
        print(f"Table check result: {result}")

        if result:
            if db_manager.is_postgres:
                table_exists = result[0][0]
            else:
                table_exists = len(result) > 0
            print(f"Table 'certificate_templates' exists: {table_exists}")
        else:
            print("No result from table check")

    except Exception as e:
        print(f"Error checking table: {e}")

    # Try to list all tables
    try:
        if db_manager.is_postgres:
            list_tables_sql = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
        else:
            list_tables_sql = "SELECT name FROM sqlite_master WHERE type='table'"

        result = await db_manager.execute_query(list_tables_sql, fetch=True)
        print(f"Available tables: {[row[0] for row in result] if result else 'None'}")
    except Exception as e:
        print(f"Error listing tables: {e}")

if __name__ == "__main__":
    asyncio.run(debug_db_connection())