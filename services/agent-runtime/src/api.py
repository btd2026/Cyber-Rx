"""
Agent Runtime FastAPI Service

REST API endpoints for agent runtime operations including agent lifecycle
management, querying, and state retrieval.
"""
import os
import asyncio
from datetime import datetime
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import asyncpg
from dotenv import load_dotenv

from src.models import (
    AgentConfig, AgentState, AgentBriefing, TimeRange,
    AgentType, AgentStatus
)
from src.agent_runtime import get_agent_runtime


# Load environment variables
load_dotenv()


# =====================================================
# Pydantic Models for API
# =====================================================

class StartAgentRequest(BaseModel):
    """Request to start an agent."""
    config: AgentConfig


class QueryAgentRequest(BaseModel):
    """Request to query an agent."""
    query: str = Field(..., min_length=1, max_length=1000)
    time_start: datetime
    time_end: datetime
    risk_categories: Optional[List[str]] = None
    likelihood_min: float = Field(default=0.0, ge=0.0, le=1.0)
    template: str = Field(default="briefing")


class UpdateAgentConfigRequest(BaseModel):
    """Request to update agent configuration."""
    config: AgentConfig


# =====================================================
# FastAPI App Lifecycle
# =====================================================

db_pool: Optional[asyncpg.Pool] = None
agent_runtime = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle (startup/shutdown)."""
    global db_pool, agent_runtime

    # Startup
    logger.info("Starting Agent Runtime API service")

    # Initialize database pool
    db_url = os.getenv("DATABASE_URL")
    db_pool = await asyncpg.create_pool(
        db_url,
        min_size=5,
        max_size=20
    )
    logger.info("Database pool initialized")

    # Initialize agent runtime
    claude_api_key = os.getenv("ANTHROPIC_API_KEY")
    claude_model = os.getenv("CLAUDE_MODEL", "claude-3-5-sonnet-20241022")

    agent_runtime = get_agent_runtime(
        db_pool=db_pool,
        claude_api_key=claude_api_key,
        claude_model=claude_model
    )
    logger.info("Agent runtime initialized")

    yield

    # Shutdown
    logger.info("Shutting down Agent Runtime API service")
    if db_pool:
        await db_pool.close()
        logger.info("Database pool closed")


# =====================================================
# FastAPI App Initialization
# =====================================================

app = FastAPI(
    title="Agent Runtime API",
    description="AI Agent Runtime Service for CyberRX Multi-Agent Platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


# =====================================================
# Logging Setup
# =====================================================

import logging
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# =====================================================
# API Endpoints
# =====================================================

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "agent-runtime",
        "timestamp": datetime.utcnow().isoformat()
    }


@app.post("/agents/{agent_id}/start")
async def start_agent(
    agent_id: str,
    request: StartAgentRequest
):
    """
    Start an agent with configuration.

    Args:
        agent_id: Agent identifier (cfo, ciso, board)
        request: Start agent request with config

    Returns:
        AgentState: Initial agent state
    """
    try:
        agent_state = await agent_runtime.start_agent(
            agent_id=agent_id,
            config=request.config
        )
        return agent_state.model_dump()

    except Exception as e:
        logger.error(f"Failed to start agent {agent_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/agents/{agent_id}/stop")
async def stop_agent(agent_id: str):
    """
    Stop an agent.

    Args:
        agent_id: Agent identifier

    Returns:
        Success message
    """
    try:
        await agent_runtime.stop_agent(agent_id=agent_id)
        return {
            "message": f"Agent {agent_id} stopped successfully",
            "timestamp": datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error(f"Failed to stop agent {agent_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/agents/{agent_id}/query")
async def query_agent(
    agent_id: str,
    request: QueryAgentRequest
):
    """
    Query an agent and generate briefing.

    This is the primary endpoint for agent interactions.

    Args:
        agent_id: Agent identifier
        request: Query request with query and context

    Returns:
        AgentBriefing: Generated briefing with insights
    """
    try:
        # Build context from request
        context = {
            "time_start": request.time_start,
            "time_end": request.time_end,
            "risk_categories": request.risk_categories,
            "likelihood_min": request.likelihood_min,
            "template": request.template
        }

        # Query agent
        briefing = await agent_runtime.query_agent(
            agent_id=agent_id,
            query=request.query,
            context=context
        )

        return briefing.model_dump()

    except Exception as e:
        logger.error(f"Failed to query agent {agent_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/agents/{agent_id}/state")
async def get_agent_state(agent_id: str):
    """
    Get current agent state.

    Args:
        agent_id: Agent identifier

    Returns:
        AgentState: Current agent state
    """
    try:
        agent_state = await agent_runtime.get_agent_state(agent_id=agent_id)

        if not agent_state:
            raise HTTPException(
                status_code=404,
                detail=f"Agent {agent_id} not found"
            )

        return agent_state.model_dump()

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get agent state for {agent_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/agents/{agent_id}/config")
async def update_agent_config(
    agent_id: str,
    request: UpdateAgentConfigRequest
):
    """
    Update agent configuration.

    Args:
        agent_id: Agent identifier
        request: Update config request

    Returns:
        Success message
    """
    try:
        await agent_runtime.update_agent_config(
            agent_id=agent_id,
            config=request.config
        )
        return {
            "message": f"Agent {agent_id} configuration updated",
            "timestamp": datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error(f"Failed to update agent config for {agent_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/agents/{agent_id}/briefings")
async def get_agent_briefings(
    agent_id: str,
    limit: int = 10
):
    """
    Get recent agent briefings.

    Args:
        agent_id: Agent identifier
        limit: Maximum number of briefings to return (default: 10)

    Returns:
        List[AgentBriefing]: Recent briefings
    """
    try:
        briefings = await agent_runtime.state_manager.get_recent_briefings(
            agent_id=agent_id,
            limit=limit
        )
        return [b.model_dump() for b in briefings]

    except Exception as e:
        logger.error(f"Failed to get briefings for agent {agent_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/agents/{agent_id}/metrics")
async def get_agent_metrics(
    agent_id: str,
    metric_date: Optional[str] = None
):
    """
    Get agent usage metrics.

    Args:
        agent_id: Agent identifier
        metric_date: Optional date (YYYY-MM-DD), defaults to today

    Returns:
        AgentMetrics: Usage metrics
    """
    try:
        from datetime import date

        target_date = None
        if metric_date:
            target_date = datetime.strptime(metric_date, "%Y-%m-%d").date()

        metrics = await agent_runtime.state_manager.get_metrics(
            agent_id=agent_id,
            metric_date=target_date
        )

        if not metrics:
            raise HTTPException(
                status_code=404,
                detail=f"Metrics not found for agent {agent_id} on {metric_date or 'today'}"
            )

        return metrics.model_dump()

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get metrics for agent {agent_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =====================================================
# Run Server (for development)
# =====================================================

if __name__ == "__main__":
    import uvicorn

    host = os.getenv("AGENT_RUNTIME_HOST", "0.0.0.0")
    port = int(os.getenv("AGENT_RUNTIME_PORT", 8000))

    uvicorn.run(
        "src.api:app",
        host=host,
        port=port,
        reload=True,
        log_level=os.getenv("LOG_LEVEL", "info").lower()
    )
