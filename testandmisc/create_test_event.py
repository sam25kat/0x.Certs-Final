#!/usr/bin/env python3
"""
Create a test event for load testing
"""
import sqlite3
import os
import random
import string
from datetime import datetime

DB_PATH = "certificates.db"

def generate_event_code():
    """Generate a random event code"""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))

def create_test_event():
    """Create a test event for concurrent registration testing"""
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Create a test event
        event_code = generate_event_code()
        event_name = f"Load Test Event {datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        cursor.execute(
            """INSERT INTO events (event_name, event_code, organizer_id, is_active) 
               VALUES (?, ?, ?, ?)""",
            (event_name, event_code, 1, True)
        )
        
        event_id = cursor.lastrowid
        conn.commit()
        
        print(f"SUCCESS: Test event created successfully!")
        print(f"Event ID: {event_id}")
        print(f"Event Name: {event_name}")
        print(f"Event Code: {event_code}")
        print(f"\nUpdate test_concurrent_registration.py with:")
        print(f"EVENT_CODE = \"{event_code}\"")
        
        return {
            'event_id': event_id,
            'event_name': event_name,
            'event_code': event_code
        }
        
    except Exception as e:
        print(f"ERROR: Error creating test event: {e}")
        return None
        
    finally:
        conn.close()

if __name__ == "__main__":
    print("Creating test event for load testing...")
    result = create_test_event()
    
    if result:
        print(f"\nReady to test! Use this event code: {result['event_code']}")
    else:
        print("\nFailed to create test event")