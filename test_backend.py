#!/usr/bin/env python3
"""
Quick test script to verify backend setup and NFT minting
Run this after starting the hardhat node and deploying the contract
"""
import requests
import json
import sys

API_BASE = 'http://localhost:8000'
TEST_WALLET = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"  # First Hardhat account

def clear_test_data():
    """Clear any existing test data"""
    print("🧹 Clearing existing test data...")
    try:
        response = requests.delete(f'{API_BASE}/clear_participant/{TEST_WALLET}')
        if response.status_code == 200:
            result = response.json()
            print(f"✅ {result['message']}")
        else:
            print("ℹ️  No existing data to clear")
    except Exception as e:
        print(f"ℹ️  Clear data error (probably no existing data): {e}")

def show_debug_info():
    """Show current participants for debugging"""
    print("\n🔍 Current participants in database:")
    try:
        response = requests.get(f'{API_BASE}/debug/participants')
        if response.status_code == 200:
            result = response.json()
            participants = result['participants']
            if participants:
                for p in participants:
                    print(f"   👤 {p['name']} ({p['wallet'][:10]}...) - Event: {p['event']} - PoA: {p['poa_minted']}")
            else:
                print("   No participants found")
        else:
            print("   Error fetching debug info")
    except Exception as e:
        print(f"   Debug error: {e}")

def test_backend():
    print("🔍 Testing Backend Setup...")
    
    # Parse command line args
    clear_data = '--clear' in sys.argv
    
    if clear_data:
        clear_test_data()
    
    show_debug_info()
    
    # Test 1: Health Check
    try:
        response = requests.get(f'{API_BASE}/health')
        if response.status_code == 200:
            print("\n✅ Backend health check passed")
        else:
            print("❌ Backend health check failed")
            return
    except Exception as e:
        print(f"❌ Backend not running: {e}")
        return
    
    # Test 2: Create Event
    print("\n📅 Testing Event Creation...")
    event_data = {
        "event_name": "Test Hackathon",
        "event_date": "2024-01-15",
        "sponsors": "Test Sponsor",
        "description": "Test event for verification"
    }
    
    try:
        response = requests.post(f'{API_BASE}/create_event', json=event_data)
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Event created successfully!")
            print(f"   Event ID: {result['event_id']}")
            print(f"   Event Code: {result['event_code']}")
            
            # Store for next test
            event_code = result['event_code']
            event_id = result['event_id']
            
        else:
            print(f"❌ Event creation failed: {response.text}")
            return
    except Exception as e:
        print(f"❌ Event creation error: {e}")
        return
    
    # Test 3: Register Participant (simulate)
    print(f"\n👤 Testing Participant Registration with code: {event_code}")
    
    participant_data = {
        "wallet_address": TEST_WALLET,
        "email": "test@example.com",
        "name": "Test Participant",
        "team_name": "Test Team",
        "event_code": event_code
    }
    
    try:
        response = requests.post(f'{API_BASE}/register_participant', json=participant_data)
        result = response.json()
        
        if response.status_code == 200:
            print("✅ Participant registration successful!")
            print(f"   Event: {result['event_name']}")
            if 'tx_hash' in result:
                print(f"   Transaction Hash: {result['tx_hash']}")
        else:
            print(f"❌ Registration failed: {result}")
            
    except Exception as e:
        print(f"❌ Registration error: {e}")
    
    # Test 4: Get Events
    print(f"\n📋 Testing Get Events...")
    try:
        response = requests.get(f'{API_BASE}/events')
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Found {len(result['events'])} events")
        else:
            print(f"❌ Get events failed: {response.text}")
    except Exception as e:
        print(f"❌ Get events error: {e}")
    
    # Test 5: Get On-Chain Participants
    print(f"\n🔗 Testing On-Chain Participants for Event {event_id}...")
    try:
        response = requests.get(f'{API_BASE}/participants/{event_id}')
        if response.status_code == 200:
            result = response.json()
            participants = result['participants']
            print(f"✅ Found {len(participants)} on-chain participants")
            
            for i, p in enumerate(participants[:3]):  # Show first 3
                print(f"   {i+1}. {p.get('name', 'Unknown')} ({p['wallet_address'][:10]}...)")
                print(f"      PoA: {'✅' if p['poa_minted'] else '❌'} #{p.get('poa_token_id', 'N/A')}")
                print(f"      Cert: {'🏆' if p['certificate_minted'] else '⏳'} #{p.get('certificate_token_id', 'N/A')}")
                
        else:
            print(f"❌ Get participants failed: {response.text}")
    except Exception as e:
        print(f"❌ Get participants error: {e}")
    
    # Test 6: Get All Participants (Global)
    print(f"\n🌍 Testing Global Participants...")
    try:
        response = requests.get(f'{API_BASE}/participants/all')
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Found {result['total_participants']} total participants across all events")
            
            by_event = result['participants_by_event']
            for event_id, participants in by_event.items():
                print(f"   Event {event_id}: {len(participants)} participants")
                
        else:
            print(f"❌ Get all participants failed: {response.text}")
    except Exception as e:
        print(f"❌ Get all participants error: {e}")
    
    print(f"\n🏁 Test completed! Check the console output above for any issues.")
    print(f"\n📝 Next steps:")
    print(f"   1. Make sure Hardhat node is running: npx hardhat node")
    print(f"   2. Deploy contract: npx hardhat run scripts/deploy.js --network localhost") 
    print(f"   3. Update .env file with CONTRACT_ADDRESS")
    print(f"   4. Test with frontend: open hacker.html and use event code: {event_code}")
    print(f"\n🛠️  Debugging commands:")
    print(f"   • Clear test data: python test_backend.py --clear")
    print(f"   • View participants: curl http://localhost:8000/debug/participants")
    print(f"   • Clear wallet: curl -X DELETE http://localhost:8000/clear_participant/{TEST_WALLET}")

if __name__ == "__main__":
    test_backend()