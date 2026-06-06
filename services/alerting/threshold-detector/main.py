"""Threshold detection and alert triggering service"""

from fastapi import FastAPI
from typing import Dict, Any

app = FastAPI(title="CyberRX Threshold Detector", version="0.1.0")

@app.get("/health")
async def health_check() -> Dict[str, Any]:
    return {"status": "healthy", "service": "threshold-detector"}

@app.get("/")
async def root() -> Dict[str, Any]:
    return {"service": "Threshold Detector", "version": "0.1.0", "status": "initializing"}
