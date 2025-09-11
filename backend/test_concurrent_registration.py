#!/usr/bin/env python3
"""
Concurrent registration load test
Tests the async registration endpoint with multiple concurrent users
"""
import asyncio
import aiohttp
import time
import random
import string
from datetime import datetime

# Test configuration
BASE_URL = "http://localhost:8000"
CONCURRENT_USERS = 500  # Testing with 500 concurrent users
EVENT_CODE = "2T7R1E1T"  # Test event code

def generate_test_user():
    """Generate unique test user data"""
    user_id = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    return {
        "wallet_address": f"0x{''.join(random.choices('0123456789abcdef', k=40))}",
        "email": f"test_{user_id}@example.com",
        "name": f"Test User {user_id}",
        "team_name": f"Team {user_id}",
        "event_code": EVENT_CODE,
        "telegram_username": f"test_{user_id}"
    }

async def register_user(session, user_data, user_id):
    """Register a single user"""
    start_time = time.time()
    try:
        async with session.post(
            f"{BASE_URL}/register_participant",
            json=user_data,
            timeout=aiohttp.ClientTimeout(total=30)
        ) as response:
            end_time = time.time()
            duration = end_time - start_time
            
            if response.status == 200:
                result = await response.json()
                return {
                    'user_id': user_id,
                    'status': 'success',
                    'duration': duration,
                    'participant_id': result.get('participant_id')
                }
            else:
                error_text = await response.text()
                return {
                    'user_id': user_id,
                    'status': 'error',
                    'duration': duration,
                    'error': f"HTTP {response.status}: {error_text}"
                }
    except Exception as e:
        end_time = time.time()
        duration = end_time - start_time
        return {
            'user_id': user_id,
            'status': 'error',
            'duration': duration,
            'error': str(e)
        }

async def run_load_test():
    """Run concurrent registration load test"""
    print(f"Starting load test with {CONCURRENT_USERS} concurrent registrations...")
    print(f"Target endpoint: {BASE_URL}/register_participant")
    print(f"Event code: {EVENT_CODE}")
    print("-" * 50)
    
    # Create test users
    test_users = [generate_test_user() for _ in range(CONCURRENT_USERS)]
    
    # Create HTTP session with connection pooling
    connector = aiohttp.TCPConnector(
        limit=500,  # Total connection pool size
        limit_per_host=500,  # Per host connection limit
        keepalive_timeout=30
    )
    
    async with aiohttp.ClientSession(connector=connector) as session:
        # Record start time
        test_start = time.time()
        
        # Create concurrent registration tasks
        tasks = [
            register_user(session, user_data, i) 
            for i, user_data in enumerate(test_users)
        ]
        
        # Execute all registrations concurrently
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Record end time
        test_end = time.time()
        total_duration = test_end - test_start
    
    # Analyze results
    successful = [r for r in results if isinstance(r, dict) and r.get('status') == 'success']
    failed = [r for r in results if isinstance(r, dict) and r.get('status') == 'error']
    exceptions = [r for r in results if not isinstance(r, dict)]
    
    # Calculate statistics
    durations = [r['duration'] for r in successful + failed if isinstance(r, dict)]
    avg_duration = sum(durations) / len(durations) if durations else 0
    max_duration = max(durations) if durations else 0
    min_duration = min(durations) if durations else 0
    
    # Print results
    print("\n" + "=" * 60)
    print("LOAD TEST RESULTS")
    print("=" * 60)
    print(f"Total requests: {CONCURRENT_USERS}")
    print(f"Successful: {len(successful)} ({len(successful)/CONCURRENT_USERS*100:.1f}%)")
    print(f"Failed: {len(failed)} ({len(failed)/CONCURRENT_USERS*100:.1f}%)")
    print(f"Exceptions: {len(exceptions)}")
    print(f"\nTiming:")
    print(f"Total test duration: {total_duration:.2f} seconds")
    print(f"Requests per second: {CONCURRENT_USERS/total_duration:.2f}")
    print(f"Average response time: {avg_duration:.3f} seconds")
    print(f"Min response time: {min_duration:.3f} seconds")
    print(f"Max response time: {max_duration:.3f} seconds")
    
    # Show first few errors for debugging
    if failed:
        print(f"\nFirst 5 errors:")
        for error in failed[:5]:
            print(f"  User {error['user_id']}: {error['error']}")
    
    if exceptions:
        print(f"\nExceptions:")
        for i, exc in enumerate(exceptions[:5]):
            print(f"  {i}: {exc}")
    
    # Performance assessment
    print(f"\n" + "-" * 40)
    print("PERFORMANCE ASSESSMENT")
    print("-" * 40)
    success_rate = len(successful) / CONCURRENT_USERS * 100
    rps = CONCURRENT_USERS / total_duration
    
    if success_rate >= 95 and avg_duration < 2.0 and rps > 50:
        print("✅ EXCELLENT: System handles load very well")
    elif success_rate >= 90 and avg_duration < 5.0 and rps > 20:
        print("✅ GOOD: System handles load adequately")  
    elif success_rate >= 80 and avg_duration < 10.0:
        print("⚠️  ACCEPTABLE: System works but may struggle with higher load")
    else:
        print("❌ POOR: System needs optimization for production use")
    
    print(f"Success rate: {success_rate:.1f}% (target: >95%)")
    print(f"Avg response: {avg_duration:.2f}s (target: <2.0s)")
    print(f"Throughput: {rps:.1f} RPS (target: >50 RPS)")
    
    return {
        'total_requests': CONCURRENT_USERS,
        'successful': len(successful),
        'failed': len(failed),
        'success_rate': success_rate,
        'total_duration': total_duration,
        'avg_response_time': avg_duration,
        'requests_per_second': rps
    }

if __name__ == "__main__":
    # Check if event loop is already running (for Jupyter notebooks)
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import nest_asyncio
            nest_asyncio.apply()
    except:
        pass
    
    # Run the load test
    asyncio.run(run_load_test())