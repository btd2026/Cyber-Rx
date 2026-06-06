"""Financial modeling and calculator service"""

from fastapi import FastAPI
from typing import Dict, Any

app = FastAPI(title="CyberRX Financial Calculator", version="0.1.0")

@app.get("/health")
async def health_check() -> Dict[str, Any]:
    return {"status": "healthy", "service": "financial-calculator"}

@app.get("/")
async def root() -> Dict[str, Any]:
    return {"service": "Financial Calculator", "version": "0.1.0", "status": "initializing"}
