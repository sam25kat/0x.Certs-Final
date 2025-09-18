#!/usr/bin/env python3
"""
Database cleanup script for production deployment.
This will clear all test data but preserve table structure.
"""

import sqlite3
import os
from datetime import datetime

def clear_database():
    """Clear all test data from the database for production use."""
    
    db_path = "certificates.db"
    
    if not os.path.exists(db_path):
        print(f"ERROR: Database file {db_path} not found!")
        return False
    
    try:
        # Create backup first
        backup_name = f"certificates_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
        
        print(f"Creating backup: {backup_name}")
        import shutil
        shutil.copy2(db_path, backup_name)
        print(f"Backup created: {backup_name}")
        
        # Connect to database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("Clearing database tables...")
        
        # List of tables to clear (preserve structure but delete data)
        tables_to_clear = [
            'events',
            'participants', 
            'telegram_verified_users',
            'organizer_emails',
            'organizer_otp_sessions'
        ]
        
        # Show current counts
        print("\nCurrent record counts:")
        for table in tables_to_clear:
            count = cursor.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
            print(f"  {table}: {count} records")
        
        print(f"\nClearing data from {len(tables_to_clear)} tables...")
        
        # Clear each table
        for table in tables_to_clear:
            cursor.execute(f"DELETE FROM {table}")
            print(f"  Cleared {table}")
        
        # Reset auto-increment sequences
        cursor.execute("DELETE FROM sqlite_sequence WHERE name IN ('events', 'participants', 'telegram_verified_users', 'organizer_emails', 'organizer_otp_sessions')")
        print("  Reset auto-increment sequences")
        
        # Commit changes
        conn.commit()
        
        print("\nFinal record counts:")
        for table in tables_to_clear:
            count = cursor.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
            print(f"  {table}: {count} records")
        
        # Vacuum database to reclaim space
        print("\nOptimizing database...")
        cursor.execute("VACUUM")
        
        conn.close()
        
        print(f"\nDatabase successfully cleared for production!")
        print(f"Backup saved as: {backup_name}")
        print(f"Database ready for production use")
        
        return True
        
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    print("Database Cleanup for Production Deployment")
    print("=" * 50)
    
    response = input("WARNING: This will clear ALL test data. Continue? (yes/no): ")
    
    if response.lower() in ['yes', 'y']:
        success = clear_database()
        if success:
            print(f"\nDatabase is now ready for production!")
        else:
            print(f"\nDatabase cleanup failed!")
    else:
        print("Database cleanup cancelled.")