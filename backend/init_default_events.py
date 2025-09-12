import sqlite3
import os
from datetime import datetime

def init_default_events():
    """Initialize default events including IOTOPIA"""
    db_path = os.getenv("DB_URL", "certificates.db")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if IOTOPIA event already exists
        cursor.execute("SELECT COUNT(*) FROM events WHERE event_name = ?", ("IOTOPIA",))
        if cursor.fetchone()[0] > 0:
            print("IOTOPIA event already exists")
            conn.close()
            return
        
        # Generate a unique event code for IOTOPIA
        event_code = "IOTOPIA2025"
        
        # Insert IOTOPIA event
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
            "IOTOPIA",
            "REVA Hackathon 2025", 
            event_code,
            "2025-09-12",
            "NA",
            datetime.now().isoformat(),
            1,
            "default"
        ))
        
        conn.commit()
        print(f"✅ IOTOPIA event created successfully with code: {event_code}")
        
        # Also create a few other backup events
        backup_events = [
            ("Tech Summit 2025", "Annual Technology Summit", "TECH2025", "2025-10-15", "Tech Corp", "default"),
            ("Innovation Hub", "Innovation and Entrepreneurship Event", "INNOV2025", "2025-11-20", "StartupXYZ", "default")
        ]
        
        for event_name, description, code, date, sponsor, template in backup_events:
            cursor.execute("SELECT COUNT(*) FROM events WHERE event_code = ?", (code,))
            if cursor.fetchone()[0] == 0:
                cursor.execute("""
                    INSERT INTO events (
                        event_name, description, event_code, event_date, 
                        sponsors, created_at, is_active, certificate_template
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (event_name, description, code, date, sponsor, datetime.now().isoformat(), 1, template))
                print(f"✅ Backup event '{event_name}' created with code: {code}")
        
        conn.commit()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error initializing default events: {e}")

if __name__ == "__main__":
    init_default_events()