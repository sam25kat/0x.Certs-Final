#!/usr/bin/env python3
"""
Test the fixed email query to ensure PoA token IDs show correctly
"""
import sqlite3

def test_email_query():
    """Test the fixed email query for event 9544"""
    print("=== Testing Fixed Email Query ===")
    
    conn = sqlite3.connect("backend/certificates.db")
    cursor = conn.cursor()
    
    event_id = 9544
    
    # Test the fixed query (same as used in main.py email function)
    cursor.execute(
        """SELECT name, email, certificate_ipfs_hash, certificate_token_id, wallet_address, poa_token_id
           FROM participants 
           WHERE event_id = ? AND certificate_status = 'completed' AND certificate_token_id IS NOT NULL""",
        (event_id,)
    )
    
    participants = cursor.fetchall()
    conn.close()
    
    if not participants:
        print("ERROR: No participants found with the query!")
        return False
    
    print(f"Found {len(participants)} participants:")
    
    for participant in participants:
        name, email, ipfs_hash, cert_token_id, wallet_address, poa_token_id = participant
        
        print(f"\n--- {name} ---")
        print(f"Email: {email}")
        print(f"Certificate Token ID: {cert_token_id}")
        print(f"PoA Token ID: {poa_token_id}")
        print(f"Wallet: {wallet_address[:6]}...{wallet_address[-4:]}")
        
        # Simulate email template
        email_poa_line = f"PoA Token ID: {poa_token_id}"
        print(f"Email will show: '{email_poa_line}'")
        
        if poa_token_id is None:
            print("ERROR: PoA Token ID is None!")
            return False
        elif str(poa_token_id) == "None":
            print("ERROR: PoA Token ID is string 'None'!")
            return False
        else:
            print("SUCCESS: PoA Token ID is valid!")
    
    print(f"\n=== EXPECTED EMAIL RESULTS ===")
    print(f"Sai Jadhav's email -> 'PoA Token ID: 8'")
    print(f"Sameer Katte's email -> 'PoA Token ID: 9'")
    print(f"No more 'PoA Token ID: None'!")
    
    return True

if __name__ == "__main__":
    success = test_email_query()
    
    if success:
        print("\nSUCCESS: Email query fixed! PoA Token IDs will show correctly.")
    else:
        print("\nERROR: Still issues with email query.")