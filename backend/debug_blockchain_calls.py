import sqlite3
from web3 import Web3
import os
from dotenv import load_dotenv

load_dotenv()

# Configuration
DB_PATH = "certificates.db"
RPC_URL = os.getenv("RPC_URL")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS")

# Web3 setup
w3 = Web3(Web3.HTTPProvider(RPC_URL)) if RPC_URL else None

CONTRACT_ABI = [
    {
        "inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "name": "eventNames",
        "outputs": [{"internalType": "string", "name": "", "type": "string"}],
        "stateMutability": "view",
        "type": "function"
    }
]

def check_event_on_blockchain(event_id):
    """Check if an event exists on the blockchain"""
    try:
        if not all([w3, CONTRACT_ADDRESS]):
            print("❌ Blockchain not configured")
            return False
        
        contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=CONTRACT_ABI)
        event_name = contract.functions.eventNames(event_id).call()
        
        if event_name and len(event_name) > 0:
            print(f"✅ Event {event_id} exists on blockchain: '{event_name}'")
            return True
        else:
            print(f"❌ Event {event_id} does NOT exist on blockchain")
            return False
            
    except Exception as e:
        print(f"❌ Error checking event {event_id}: {str(e)}")
        return False

def main():
    print("Debugging Event ID Mismatch Between Database and Blockchain")
    print("=" * 60)
    
    # Get all events from database
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, event_name, event_code FROM events ORDER BY id")
    db_events = cursor.fetchall()
    
    print(f"\nFound {len(db_events)} events in database:")
    print("-" * 60)
    
    blockchain_missing = []
    
    for event_id, event_name, event_code in db_events:
        print(f"\nDatabase Event {event_id}: '{event_name}' (code: {event_code})")
        exists_on_blockchain = check_event_on_blockchain(event_id)
        
        if not exists_on_blockchain:
            blockchain_missing.append((event_id, event_name))
    
    if blockchain_missing:
        print(f"\n🚨 PROBLEM FOUND: {len(blockchain_missing)} events exist in database but NOT on blockchain:")
        print("-" * 60)
        for event_id, event_name in blockchain_missing:
            print(f"❌ Event {event_id}: '{event_name}' - MISSING FROM BLOCKCHAIN")
        
        print(f"\n💡 SOLUTION: Create these missing events on blockchain")
        print("Run the repair script to create all missing events.")
    else:
        print(f"\n✅ ALL DATABASE EVENTS EXIST ON BLOCKCHAIN")
        print("The 'Event does not exist' error must be coming from a different source.")
        print("Check if frontend is using a hardcoded event ID or generating IDs dynamically.")
    
    # Check for participants registered to events that don't exist on blockchain
    if blockchain_missing:
        print(f"\n📊 Checking participants registered to missing events:")
        missing_event_ids = [str(event_id) for event_id, _ in blockchain_missing]
        
        cursor.execute(f"SELECT event_id, COUNT(*) FROM participants WHERE event_id IN ({','.join(missing_event_ids)}) GROUP BY event_id")
        participant_counts = cursor.fetchall()
        
        for event_id, count in participant_counts:
            print(f"⚠️  Event {event_id}: {count} participants registered (but event missing from blockchain)")
    
    conn.close()

if __name__ == "__main__":
    main()