"""Risk normalization engine core service"""

from fastapi import FastAPI
from typing import Dict, Any

app = FastAPI(title="CyberRX Normalization Engine", version="0.1.0")

@app.get("/health")
async def health_check() -> Dict[str, Any]:
    return {"status": "healthy", "service": "normalization-core"}

@app.get("/")
async def root() -> Dict[str, Any]:
    return {"service": "Normalization Engine", "version": "0.1.0", "status": "initializing"}
