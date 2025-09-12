import os
import asyncio
from database import db_manager, init_database_tables, ensure_iotopia_event

async def test_postgres_connection():
    """Test PostgreSQL connection with Neon DB"""
    # Set the DATABASE_URL to the Neon PostgreSQL connection
    os.environ["DATABASE_URL"] = "postgresql://neondb_owner:npg_1yksRpPDbcq6@ep-ancient-flower-a2twsoft-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"
    
    try:
        print("Testing PostgreSQL connection...")
        print(f"Database URL: {db_manager.database_url}")
        print(f"Is PostgreSQL: {db_manager.is_postgres}")
        
        # Test basic connection
        conn = await db_manager.get_connection()
        print("Database connection successful")
        await conn.close()
        
        # Initialize tables
        print("\nCreating database tables...")
        await init_database_tables()
        
        # Ensure IOTOPIA event
        print("\nCreating IOTOPIA event...")
        await ensure_iotopia_event()
        
        # Test query
        print("\nTesting table queries...")
        events = await db_manager.execute_query("SELECT * FROM events", fetch=True)
        print(f"Found {len(events)} events in database")
        for event in events:
            print(f"  - {event}")
            
        print("\nAll tests passed! Database is working correctly.")
        
    except Exception as e:
        print(f"Error testing database: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_postgres_connection())