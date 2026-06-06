"""CISO Intelligence Agent - Security posture and threat intelligence"""

from fastapi import FastAPI
from typing import Dict, Any

app = FastAPI(title="CyberRX CISO Agent", version="0.1.0")

@app.get("/health")
async def health_check() -> Dict[str, Any]:
    return {"status": "healthy", "agent": "ciso"}

@app.get("/")
async def root() -> Dict[str, Any]:
    return {"agent": "CISO Intelligence", "version": "0.1.0", "focus": "security-posture-and-threats"}
