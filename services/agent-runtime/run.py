#!/usr/bin/env python3
"""
Agent Runtime Service Entry Point

Run the Agent Runtime FastAPI service.
"""
import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from src.api import app

if __name__ == "__main__":
    import uvicorn
    from dotenv import load_dotenv

    # Load environment variables
    load_dotenv()

    # Run server
    host = os.getenv("AGENT_RUNTIME_HOST", "0.0.0.0")
    port = int(os.getenv("AGENT_RUNTIME_PORT", 8000))

    uvicorn.run(
        app,
        host=host,
        port=port,
        reload=True,
        log_level=os.getenv("LOG_LEVEL", "info").lower()
    )
