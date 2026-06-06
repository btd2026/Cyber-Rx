"""CLO Intelligence Agent - Legal risk and regulatory compliance"""

from fastapi import FastAPI
from typing import Dict, Any

app = FastAPI(title="CyberRX CLO Agent", version="0.1.0")

@app.get("/health")
async def health_check() -> Dict[str, Any]:
    return {"status": "healthy", "agent": "clo"}

@app.get("/")
async def root() -> Dict[str, Any]:
    return {"agent": "CLO Intelligence", "version": "0.1.0", "focus": "legal-risk-and-regulation"}
