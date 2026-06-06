"""CIO Intelligence Agent - Technology operations and performance"""

from fastapi import FastAPI
from typing import Dict, Any

app = FastAPI(title="CyberRX CIO Agent", version="0.1.0")

@app.get("/health")
async def health_check() -> Dict[str, Any]:
    return {"status": "healthy", "agent": "cio"}

@app.get("/")
async def root() -> Dict[str, Any]:
    return {"agent": "CIO Intelligence", "version": "0.1.0", "focus": "technology-operations"}
