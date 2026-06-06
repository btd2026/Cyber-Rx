"""
CyberRX Ingestion Base Service
Shared connector base classes and utilities
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import structlog

app = FastAPI(
    title="CyberRX Ingestion Base Service",
    description="Shared connector functionality for data ingestion",
    version="0.1.0",
)

# Configure logging
log = structlog.get_logger()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "ingestion-base"}


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "CyberRX Ingestion Base",
        "version": "0.1.0",
        "status": "operational"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
