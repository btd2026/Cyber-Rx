"""
Agent Runtime Data Models

Defines all data structures used by the Agent Runtime service.
"""
from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from enum import Enum


class AgentType(str, Enum):
    """Agent types supported by the runtime."""
    CFO = "cfo"
    CISO = "ciso"
    BOARD = "board"


class AgentStatus(str, Enum):
    """Agent lifecycle status."""
    RUNNING = "running"
    STOPPED = "stopped"
    ERROR = "error"


class TimeRange(BaseModel):
    """Time range for context queries."""
    start: datetime
    end: datetime

    class Config:
        json_schema_extra = {
            "example": {
                "start": "2025-01-01T00:00:00Z",
                "end": "2025-01-31T23:59:59Z"
            }
        }


class AgentConfig(BaseModel):
    """Agent configuration."""
    temperature: float = Field(default=0.7, ge=0.0, le=1.0)
    max_tokens: int = Field(default=4096, ge=1, le=8192)
    timeout: int = Field(default=30, ge=5, le=120)
    retry_attempts: int = Field(default=3, ge=0, le=5)

    class Config:
        json_schema_extra = {
            "example": {
                "temperature": 0.7,
                "max_tokens": 4096,
                "timeout": 30,
                "retry_attempts": 3
            }
        }


class AgentState(BaseModel):
    """Persistent agent state."""
    agent_id: str
    agent_type: AgentType
    status: AgentStatus
    config: AgentConfig
    state: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime
    last_briefing_id: Optional[str] = None
    briefings_generated: int = 0
    total_tokens_used: int = 0
    total_cost: float = 0.0

    class Config:
        json_schema_extra = {
            "example": {
                "agent_id": "cfo",
                "agent_type": "cfo",
                "status": "running",
                "config": {"temperature": 0.7, "max_tokens": 4096},
                "state": {},
                "created_at": "2025-01-01T00:00:00Z",
                "updated_at": "2025-01-01T00:00:00Z",
                "last_briefing_id": None,
                "briefings_generated": 0,
                "total_tokens_used": 0,
                "total_cost": 0.0
            }
        }


class FinancialImpact(BaseModel):
    """Financial impact from T-MVP-006."""
    impact_id: str
    business_process: str
    exposure: float  # Dollar amount
    mlr_impact: float  # Percentage impact on MLR
    likelihood: float
    time_horizon: str  # "immediate", "30-days", "90-days"
    risk_category: str
    affected_systems: List[str]
    blast_radius: List[str]
    regulatory_trigger: Optional[str] = None
    created_at: datetime

    class Config:
        json_schema_extra = {
            "example": {
                "impact_id": "imp-001",
                "business_process": "claims-adjudication",
                "exposure": 1250000.00,
                "mlr_impact": 0.15,
                "likelihood": 0.85,
                "time_horizon": "30-days",
                "risk_category": "ransomware",
                "affected_systems": ["claims-db-1", "claims-api-2"],
                "blast_radius": ["provider-portal", "member-portal"],
                "regulatory_trigger": "HIPAA breach notification required",
                "created_at": "2025-01-01T00:00:00Z"
            }
        }


class RiskObject(BaseModel):
    """Enriched risk object from T-MVP-005."""
    risk_id: str
    title: str
    description: str
    risk_category: str
    likelihood: float
    business_process: str
    affected_systems: List[str]
    blast_radius: List[str]
    financial_exposure: float
    upstream_dependencies: List[str]
    downstream_dependencies: List[str]
    mitigation_status: str
    created_at: datetime

    class Config:
        json_schema_extra = {
            "example": {
                "risk_id": "risk-001",
                "title": "Critical ransomware risk in claims adjudication",
                "description": "Ransomware vulnerability in claims processing system",
                "risk_category": "ransomware",
                "likelihood": 0.85,
                "business_process": "claims-adjudication",
                "affected_systems": ["claims-db-1"],
                "blast_radius": ["provider-portal", "member-portal", "payment-gateway"],
                "financial_exposure": 1250000.00,
                "upstream_dependencies": ["ingestion-service"],
                "downstream_dependencies": ["payment-gateway", "notification-service"],
                "mitigation_status": "in-progress",
                "created_at": "2025-01-01T00:00:00Z"
            }
        }


class AgentBriefing(BaseModel):
    """Generated agent briefing."""
    briefing_id: str
    agent_id: str
    query: str
    context: Dict[str, Any]
    briefing: Dict[str, Any]
    generated_at: datetime
    token_cost: float
    input_tokens: int
    output_tokens: int

    class Config:
        json_schema_extra = {
            "example": {
                "briefing_id": "brf-001",
                "agent_id": "cfo",
                "query": "What's our current exposure?",
                "context": {"time_range": {...}, "risk_categories": [...]},
                "briefing": {"briefing_summary": "...", "exposure_breakdown": {...}},
                "generated_at": "2025-01-01T00:00:00Z",
                "token_cost": 0.15,
                "input_tokens": 5000,
                "output_tokens": 2000
            }
        }


class ValidationResult(BaseModel):
    """PHI validation result."""
    valid: bool
    phi_detected: bool
    phi_matches: List[str] = Field(default_factory=list)
    error_message: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "valid": True,
                "phi_detected": False,
                "phi_matches": [],
                "error_message": None
            }
        }


class AgentMetrics(BaseModel):
    """Agent usage metrics."""
    agent_id: str
    metric_date: datetime
    briefings_generated: int
    total_tokens_used: int
    total_cost: float

    class Config:
        json_schema_extra = {
            "example": {
                "agent_id": "cfo",
                "metric_date": "2025-01-01",
                "briefings_generated": 45,
                "total_tokens_used": 225000,
                "total_cost": 4.50
            }
        }


class ClaudeResponse(BaseModel):
    """Claude LLM response."""
    text: str
    input_tokens: int
    output_tokens: int
    stop_reason: str
    model: str

    class Config:
        json_schema_extra = {
            "example": {
                "text": "Here's the briefing...",
                "input_tokens": 5000,
                "output_tokens": 2000,
                "stop_reason": "end_turn",
                "model": "claude-3-5-sonnet-20241022"
            }
        }


class LLMAPIError(Exception):
    """LLM API call failed."""
    pass


class RateLimitError(Exception):
    """Rate limit exceeded."""
    pass


class OutputFormatError(Exception):
    """Output format validation failed."""
    pass


class PHIValidationError(Exception):
    """PHI detected in context."""
    pass
