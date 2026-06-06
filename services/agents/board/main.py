"""Board Intelligence Agent - Executive summary and governance"""

from fastapi import FastAPI
from typing import Dict, Any

app = FastAPI(title="CyberRX Board Agent", version="0.1.0")

@app.get("/health")
async def health_check() -> Dict[str, Any]:
    return {"status": "healthy", "agent": "board"}

@app.get("/")
async def root() -> Dict[str, Any]:
    return {"agent": "Board Intelligence", "version": "0.1.0", "focus": "executive-governance"}
