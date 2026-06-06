"""CFO Intelligence Agent - Financial risk and cost optimization"""

from fastapi import FastAPI
from typing import Dict, Any

app = FastAPI(title="CyberRX CFO Agent", version="0.1.0")

@app.get("/health")
async def health_check() -> Dict[str, Any]:
    return {"status": "healthy", "agent": "cfo"}

@app.get("/")
async def root() -> Dict[str, Any]:
    return {"agent": "CFO Intelligence", "version": "0.1.0", "focus": "financial-risk-and-optimization"}
