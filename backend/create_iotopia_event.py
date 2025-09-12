import sqlite3
import os
import secrets
import string
from datetime import datetime

def generate_event_code():
    """Generate a unique event code"""
    return 'IOTOPIA2025'

def create_iotopia_event():
    """Create IOTOPIA event in local database"""
    
    # Use the same database path as main.py
    db_path = os.getenv("DB_URL", "certificates.db")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if IOTOPIA event already exists
        cursor.execute("SELECT * FROM events WHERE event_name = ?", ("IOTOPIA",))
        existing = cursor.fetchone()
        
        if existing:
            print("✅ IOTOPIA event already exists:")
            print(f"   Event ID: {existing[0]}")
            print(f"   Event Name: {existing[1]}")
            print(f"   Event Code: {existing[3]}")
            print(f"   Description: {existing[2]}")
            conn.close()
            return existing[0]
        
        # Generate unique event code
        event_code = generate_event_code()
        
        # Create the IOTOPIA event with all details
        cursor.execute("""
            INSERT INTO events (
                event_name, 
                description, 
                event_code, 
                event_date, 
                sponsors, 
                created_at, 
                is_active,
                certificate_template
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            "IOTOPIA",                      # event_name
            "REVA Hackathon 2025",          # description  
            event_code,                     # event_code
            "2025-09-12",                   # event_date
            "NA",                           # sponsors
            datetime.now().isoformat(),     # created_at
            1,                              # is_active
            "default"                       # certificate_template
        ))
        
        event_id = cursor.lastrowid
        conn.commit()
        
        print("🎉 IOTOPIA event created successfully!")
        print(f"   Event ID: {event_id}")
        print(f"   Event Name: IOTOPIA")
        print(f"   Event Code: {event_code}")
        print(f"   Description: REVA Hackathon 2025")
        print(f"   Date: 2025-09-12")
        print(f"   Sponsors: NA")
        print(f"   Template: default")
        print(f"   Status: Active")
        
        # Verify the event was created
        cursor.execute("SELECT COUNT(*) FROM events")
        total_events = cursor.fetchone()[0]
        print(f"   Total events in database: {total_events}")
        
        conn.close()
        return event_id
        
    except Exception as e:
        print(f"❌ Error creating IOTOPIA event: {e}")
        if conn:
            conn.close()
        return None

if __name__ == "__main__":
    create_iotopia_event()