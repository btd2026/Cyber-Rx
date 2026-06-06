"""Azure AD data connector service for CyberRX"""

from fastapi import FastAPI
from typing import Dict, Any

app = FastAPI(title="CyberRX Azure AD Connector", version="0.1.0")

@app.get("/health")
async def health_check() -> Dict[str, Any]:
    """Health check endpoint"""
    return {"status": "healthy", "connector": "azuread"}

@app.get("/")
async def root() -> Dict[str, Any]:
    """Root endpoint"""
    return {"connector": "Azure AD", "version": "0.1.0", "status": "initializing"}
