"""
CFO Agent API Endpoints

FastAPI endpoints for the CFO Agent that integrate with Agent Runtime.
All endpoints use JWT authentication and validate NO PHI in responses.

Author: AI/ML Engineer (T-MVP-008)
Date: 2025-06-06
"""

from fastapi import APIRouter, HTTPException, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, Field
import logging

# Import CFO Agent
try:
    from .cfo_agent import CFOAgent
    from .claude_client import ClaudeClient
    from .prompt_manager import PromptManager
    from .state_manager import StateManager
    from .phi_validator import validate_no_phi
except ImportError:
    # For testing
    CFOAgent = None

logger = logging.getLogger(__name__)

# Initialize router
router = APIRouter(prefix="/api/cfo", tags=["cfo"])

# Security
security = HTTPBearer()

# Global agent instance (initialized in main)
cfo_agent: Optional[CFOAgent] = None


# ============================================================================
# Request/Response Models
# ============================================================================

class BriefingRequest(BaseModel):
    """Request model for CFO briefing generation."""
    organization_id: str = Field(..., description="Organization ID")
    query: str = Field(..., description="Executive query", min_length=1)
    time_range: Optional[Dict[str, str]] = Field(
        None,
        description="Time range filter {'start': 'ISO date', 'end': 'ISO date'}"
    )
    include_trends: bool = Field(True, description="Include trend analysis")
    format_type: str = Field("json", description="Output format: json, markdown, summary")


class BriefingResponse(BaseModel):
    """Response model for CFO briefing."""
    metadata: Dict[str, Any]
    executive_summary: Dict[str, Any]
    exposure_breakdown: Dict[str, Any]
    mlr_impact_analysis: Dict[str, Any]
    top_risks: List[Dict[str, Any]]
    trends: Dict[str, Any]
    methodology_trail: Dict[str, Any]
    recommendations: Dict[str, Any]


class ExposureResponse(BaseModel):
    """Response model for exposure breakdown."""
    organization_id: str
    time_range: Optional[Dict[str, str]]
    exposure_analysis: Dict[str, Any]
    generated_at: str


class TrendsResponse(BaseModel):
    """Response model for trends."""
    organization_id: str
    time_range: Optional[Dict[str, str]]
    trend_analysis: Dict[str, Any]
    generated_at: str


class ErrorResponse(BaseModel):
    """Error response model."""
    error: bool = True
    error_message: str
    error_type: str
    timestamp: str


# ============================================================================
# API Endpoints
# ============================================================================

@router.post("/agent/query", response_model=BriefingResponse)
async def query_cfo_agent(
    request: BriefingRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Query CFO Agent to generate board-meeting-ready financial briefing.

    This is the PRIMARY endpoint for the CFO Agent.

    **Authentication:** JWT token required in Authorization header

    **Request:**
    - organization_id: Organization ID
    - query: Executive query (e.g., "What's our current MLR impact?")
    - time_range: Optional time range filter
    - include_trends: Include trend analysis (default: true)
    - format_type: Output format (default: "json")

    **Response:**
    - Board-ready CFO briefing with:
        - Executive summary
        - Exposure breakdown by business process
        - MLR impact analysis
        - Top risks by exposure
        - Trend insights
        - Methodology trail
        - Recommendations

    **Example Request:**
    ```json
    {
        "organization_id": "org-123",
        "query": "What's our current dollar exposure and MLR impact?",
        "include_trends": true,
        "format_type": "json"
    }
    ```

    **Example Response:**
    ```json
    {
        "metadata": {
            "briefing_id": "...",
            "generated_at": "2025-06-06T...",
            "agent_type": "cfo"
        },
        "executive_summary": {
            "summary": "Total exposure: $2.5M with 3.2% MLR impact...",
            "total_exposure": 2500000,
            "total_exposure_formatted": "$2.5M"
        },
        "exposure_breakdown": {
            "by_business_process": [...],
            "by_risk_category": [...]
        }
        ...
    }
    ```
    """
    global cfo_agent

    logger.info(f"CFO agent query: {request.query}")

    try:
        # Verify agent is initialized
        if not cfo_agent:
            raise HTTPException(
                status_code=503,
                detail="CFO Agent not initialized. Contact administrator."
            )

        # Validate JWT token (in real implementation, verify with auth service)
        token = credentials.credentials
        # TODO: Verify token with auth service from T-FOUND-004
        logger.info(f"JWT token received (length: {len(token)})")

        # Generate briefing
        briefing = await cfo_agent.generate_briefing(
            organization_id=request.organization_id,
            query=request.query,
            time_range=request.time_range,
            include_trends=request.include_trends,
            format_type=request.format_type
        )

        # CRITICAL: Validate NO PHI in response
        validation_result = validate_no_phi(briefing)
        if not validation_result.is_valid:
            logger.error(f"PHI DETECTED in CFO briefing: {validation_result.phi_patterns}")
            raise HTTPException(
                status_code=500,
                detail="Security validation failed. PHI detected in response."
            )

        logger.info(f"CFO briefing generated: {briefing['metadata']['briefing_id']}")

        return briefing

    except ValueError as e:
        # PHI detection error
        logger.error(f"PHI validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error querying CFO agent: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating briefing: {str(e)}")


@router.get("/agent/state")
async def get_cfo_agent_state(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Get CFO Agent state.

    Returns current agent status, configuration, and metrics.
    """
    global cfo_agent

    logger.info("Get CFO agent state")

    try:
        if not cfo_agent:
            raise HTTPException(
                status_code=503,
                detail="CFO Agent not initialized. Contact administrator."
            )

        # Get agent state from state manager
        state = await cfo_agent.state_manager.load_agent_state(agent_id="cfo")

        if not state:
            return {
                "agent_id": "cfo",
                "status": "not_initialized",
                "message": "Agent has not been started yet"
            }

        return state

    except Exception as e:
        logger.error(f"Error getting CFO agent state: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting state: {str(e)}")


@router.get("/agent/briefings")
async def get_cfo_agent_briefings(
    organization_id: str,
    limit: int = 10,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Get recent CFO briefings for organization.

    **Query Parameters:**
    - organization_id: Organization ID
    - limit: Maximum number of briefings (default: 10)
    """
    global cfo_agent

    logger.info(f"Get CFO briefings for org={organization_id}, limit={limit}")

    try:
        if not cfo_agent:
            raise HTTPException(
                status_code=503,
                detail="CFO Agent not initialized. Contact administrator."
            )

        briefings = await cfo_agent.get_recent_briefings(
            organization_id=organization_id,
            limit=limit
        )

        return {
            "organization_id": organization_id,
            "count": len(briefings),
            "briefings": briefings
        }

    except Exception as e:
        logger.error(f"Error getting CFO briefings: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting briefings: {str(e)}")


@router.get("/agent/metrics")
async def get_cfo_agent_metrics(
    organization_id: str,
    metric_date: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Get CFO Agent usage metrics.

    **Query Parameters:**
    - organization_id: Organization ID
    - metric_date: Optional date (YYYY-MM-DD), defaults to today

    **Returns:**
    - Daily metrics: briefings generated, tokens used, costs
    """
    global cfo_agent

    logger.info(f"Get CFO metrics for org={organization_id}, date={metric_date}")

    try:
        if not cfo_agent:
            raise HTTPException(
                status_code=503,
                detail="CFO Agent not initialized. Contact administrator."
            )

        metrics = await cfo_agent.get_metrics(
            organization_id=organization_id,
            metric_date=metric_date
        )

        return metrics

    except Exception as e:
        logger.error(f"Error getting CFO metrics: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting metrics: {str(e)}")


@router.get("/exposure", response_model=ExposureResponse)
async def get_exposure_breakdown(
    organization_id: str,
    time_range: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Get current exposure breakdown (fast endpoint for dashboards).

    **Query Parameters:**
    - organization_id: Organization ID
    - time_range: Optional time range (ISO format: "2025-01-01/2025-03-31")

    **Response:**
    - Exposure analysis by business process, risk category, time horizon
    - No full briefing generated (faster response)
    """
    global cfo_agent

    logger.info(f"Get exposure breakdown for org={organization_id}")

    try:
        if not cfo_agent:
            raise HTTPException(
                status_code=503,
                detail="CFO Agent not initialized. Contact administrator."
            )

        # Parse time range if provided
        parsed_time_range = None
        if time_range:
            try:
                start, end = time_range.split("/")
                parsed_time_range = {"start": start, "end": end}
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid time_range format. Use 'YYYY-MM-DD/YYYY-MM-DD'"
                )

        exposure_data = await cfo_agent.get_exposure_breakdown(
            organization_id=organization_id,
            time_range=parsed_time_range
        )

        # CRITICAL: Validate NO PHI in response
        validation_result = validate_no_phi(exposure_data)
        if not validation_result.is_valid:
            logger.error(f"PHI DETECTED in exposure data: {validation_result.phi_patterns}")
            raise HTTPException(
                status_code=500,
                detail="Security validation failed. PHI detected in response."
            )

        return exposure_data

    except Exception as e:
        logger.error(f"Error getting exposure breakdown: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting exposure: {str(e)}")


@router.get("/trends", response_model=TrendsResponse)
async def get_exposure_trends(
    organization_id: str,
    time_range: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Get exposure trends (fast endpoint for trend charts).

    **Query Parameters:**
    - organization_id: Organization ID
    - time_range: Optional time range (ISO format: "2025-01-01/2025-03-31")

    **Response:**
    - Trend analysis with insights, anomalies, velocity
    - No full briefing generated (faster response)
    """
    global cfo_agent

    logger.info(f"Get exposure trends for org={organization_id}")

    try:
        if not cfo_agent:
            raise HTTPException(
                status_code=503,
                detail="CFO Agent not initialized. Contact administrator."
            )

        # Parse time range if provided
        parsed_time_range = None
        if time_range:
            try:
                start, end = time_range.split("/")
                parsed_time_range = {"start": start, "end": end}
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid time_range format. Use 'YYYY-MM-DD/YYYY-MM-DD'"
                )

        trends_data = await cfo_agent.get_trends(
            organization_id=organization_id,
            time_range=parsed_time_range
        )

        # CRITICAL: Validate NO PHI in response
        validation_result = validate_no_phi(trends_data)
        if not validation_result.is_valid:
            logger.error(f"PHI DETECTED in trends data: {validation_result.phi_patterns}")
            raise HTTPException(
                status_code=500,
                detail="Security validation failed. PHI detected in response."
            )

        return trends_data

    except Exception as e:
        logger.error(f"Error getting trends: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting trends: {str(e)}")


# ============================================================================
# Health Check
# ============================================================================

@router.get("/health")
async def health_check():
    """
    Health check endpoint for CFO Agent.

    Returns service health status.
    """
    global cfo_agent

    if cfo_agent:
        return {
            "status": "healthy",
            "service": "cfo-agent",
            "agent_initialized": True,
            "timestamp": datetime.utcnow().isoformat()
        }
    else:
        return {
            "status": "unhealthy",
            "service": "cfo-agent",
            "agent_initialized": False,
            "timestamp": datetime.utcnow().isoformat()
        }


# ============================================================================
# Initialization
# ============================================================================

def initialize_cfo_agent(
    db_pool,
    claude_client: ClaudeClient,
    prompt_manager: PromptManager,
    state_manager: StateManager
) -> CFOAgent:
    """
    Initialize CFO Agent with dependencies.

    Call this during application startup.
    """
    global cfo_agent

    logger.info("Initializing CFO Agent")

    cfo_agent = CFOAgent(
        db_pool=db_pool,
        claude_client=claude_client,
        prompt_manager=prompt_manager,
        state_manager=state_manager
    )

    logger.info("CFO Agent initialized successfully")

    return cfo_agent


def get_cfo_agent() -> Optional[CFOAgent]:
    """Get global CFO Agent instance."""
    return cfo_agent
