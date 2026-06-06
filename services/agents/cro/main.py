"""CRO Intelligence Agent - Risk assessment and compliance"""

from fastapi import FastAPI
from typing import Dict, Any

app = FastAPI(title="CyberRX CRO Agent", version="0.1.0")

@app.get("/health")
async def health_check() -> Dict[str, Any]:
    return {"status": "healthy", "agent": "cro"}

@app.get("/")
async def root() -> Dict[str, Any]:
    return {"agent": "CRO Intelligence", "version": "0.1.0", "focus": "risk-assessment-and-compliance"}
