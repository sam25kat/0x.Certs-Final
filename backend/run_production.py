#!/usr/bin/env python3
"""
Production server runner with optimized settings for 500 concurrent users
"""
import uvicorn
import os
from dotenv import load_dotenv

load_dotenv()

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        workers=1,  # Single worker since we're using async
        loop="asyncio",  # Default event loop for Windows
        http="httptools",  # High-performance HTTP parser
        access_log=False,  # Disable access logs for performance
        log_level="info",
        reload=False,
        # Optimizations for high concurrency
        backlog=2048,  # Increase connection backlog
        limit_concurrency=1000,  # Limit concurrent connections
        limit_max_requests=10000,  # Restart worker after X requests
        timeout_keep_alive=30,  # Keep connections alive longer
        timeout_graceful_shutdown=30,
        # Enable lifespan events
        lifespan="on"
    )