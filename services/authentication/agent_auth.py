"""
CyberRX Authentication Service - Agent-to-Data Authorization

Implements agent-specific data access controls.
Each agent (CFO, CISO, Board, etc.) can only access its designated data.
CISO Agent has read access to all agents (coordination role).
Board Agent can synthesize all outputs.
"""

from enum import Enum
from typing import Set, List
from fastapi import HTTPException, status

# Agent Type Enum
class AgentType(str, Enum):
    """Agent types for authorization"""
    CFO = "cfo"
    CRO = "cro"
    CLO = "clo"
    CIO = "cio"
    CISO = "ciso"
    BOARD = "board"

# Agent-to-Data Authorization Matrix
# Each agent can only access its designated data types
AGENT_DATA_ACCESS: dict[AgentType, Set[str]] = {
    AgentType.CFO: {
        # Financial data
        "financial_exposure",
        "mlr_impact",
        "stop_loss_exposure",
        "reserve_at_risk",
        "premium_revenue",
        # CFO-specific
        "cfo_briefings",
        "cfo_agent_state",
        "cfo_queries",
        "cfo_responses",
    },
    AgentType.CRO: {
        # Risk data
        "threshold_breaches",
        "risk_appetite",
        "cms_regulatory_limits",
        "residual_risk",
        "risk_velocity",
        # CRO-specific
        "cro_briefings",
        "cro_agent_state",
        "cro_queries",
        "cro_responses",
    },
    AgentType.CLO: {
        # Compliance data
        "regulatory_triggers",
        "obligation_status",
        "notification_timelines",
        "vendor_baa_status",
        "compliance_gaps",
        # CLO-specific
        "clo_briefings",
        "clo_agent_state",
        "clo_queries",
        "clo_responses",
    },
    AgentType.CIO: {
        # Operational data
        "business_process_graph",
        "operational_impact",
        "system_dependencies",
        "technology_risks",
        "business_continuity",
        # CIO-specific
        "cio_briefings",
        "cio_agent_state",
        "cio_queries",
        "cio_responses",
    },
    AgentType.CISO: {
        # Security data
        "risk_objects",
        "attack_pathways",
        "blast_radius",
        "threat_intelligence",
        "security_controls",
        # CISO-specific
        "ciso_briefings",
        "ciso_agent_state",
        "ciso_queries",
        "ciso_responses",
        # CISO can read all agents (coordination role)
        "cfo_briefings",
        "cfo_agent_state",
        "cro_briefings",
        "cro_agent_state",
        "clo_briefings",
        "clo_agent_state",
        "cio_briefings",
        "cio_agent_state",
        "board_agent_state",
    },
    AgentType.BOARD: {
        # Governance data
        "governance_metrics",
        "roi_analysis",
        "trajectory_trends",
        "executive_summary",
        "board_kpis",
        # Board-specific
        "board_briefings",
        "board_agent_state",
        "board_queries",
        "board_responses",
        # Board synthesizes all outputs
        "cfo_briefings",
        "cro_briefings",
        "clo_briefings",
        "cio_briefings",
        "ciso_briefings",
        "all_executive_briefings",
    },
}

# Data type categories for easier management
DATA_CATEGORIES: dict[str, Set[str]] = {
    "financial": {
        "financial_exposure",
        "mlr_impact",
        "stop_loss_exposure",
        "reserve_at_risk",
        "premium_revenue",
    },
    "risk": {
        "threshold_breaches",
        "risk_appetite",
        "cms_regulatory_limits",
        "residual_risk",
        "risk_velocity",
    },
    "compliance": {
        "regulatory_triggers",
        "obligation_status",
        "notification_timelines",
        "vendor_baa_status",
        "compliance_gaps",
    },
    "operational": {
        "business_process_graph",
        "operational_impact",
        "system_dependencies",
        "technology_risks",
        "business_continuity",
    },
    "security": {
        "risk_objects",
        "attack_pathways",
        "blast_radius",
        "threat_intelligence",
        "security_controls",
    },
    "governance": {
        "governance_metrics",
        "roi_analysis",
        "trajectory_trends",
        "executive_summary",
        "board_kpis",
    },
}

def agent_can_access_data(agent_type: AgentType, data_type: str) -> bool:
    """
    Check if agent can access data type.

    Args:
        agent_type: Type of agent
        data_type: Data type to access

    Returns:
        True if agent can access data type
    """
    return data_type in AGENT_DATA_ACCESS.get(agent_type, set())

def agent_can_access_category(agent_type: AgentType, category: str) -> bool:
    """
    Check if agent can access entire data category.

    Args:
        agent_type: Type of agent
        category: Data category

    Returns:
        True if agent can access all data in category
    """
    category_data_types = DATA_CATEGORIES.get(category, set())
    return all(agent_can_access_data(agent_type, dt) for dt in category_data_types)

def require_agent_data_access(agent_type: AgentType):
    """
    Dependency factory for agent data access checking.

    Usage:
        access_checker = require_agent_data_access(AgentType.CFO)
        access_checker("financial_exposure")  # OK
        access_checker("ciso_briefings")  # Raises HTTPException

    Args:
        agent_type: Type of agent

    Returns:
        Access checker function
    """
    def access_checker(data_type: str) -> None:
        """
        Check if agent can access data type.

        Args:
            data_type: Data type to access

        Raises:
            HTTPException: If agent cannot access data type
        """
        if not agent_can_access_data(agent_type, data_type):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Agent {agent_type.value.upper()} cannot access {data_type}"
            )
    return access_checker

def get_agent_accessible_data(agent_type: AgentType) -> Set[str]:
    """
    Get all data types accessible to an agent.

    Args:
        agent_type: Type of agent

    Returns:
        Set of accessible data types
    """
    return AGENT_DATA_ACCESS.get(agent_type, set())

def get_agent_accessible_categories(agent_type: AgentType) -> Set[str]:
    """
    Get all data categories accessible to an agent.

    Args:
        agent_type: Type of agent

    Returns:
        Set of accessible category names
    """
    accessible_data = get_agent_accessible_data(agent_type)
    accessible_categories = set()

    for category, data_types in DATA_CATEGORIES.items():
        if data_types.issubset(accessible_data):
            accessible_categories.add(category)

    return accessible_categories

def check_cross_agent_access(source_agent: AgentType, target_agent: AgentType) -> bool:
    """
    Check if source agent can access target agent's data.

    Args:
        source_agent: Agent requesting access
        target_agent: Agent whose data is being accessed

    Returns:
        True if cross-agent access is allowed

    Rules:
    - CISO can access all agents (coordination role)
    - Board can access all agent briefings (synthesis role)
    - All other cross-agent access is denied
    """
    if source_agent == AgentType.CISO:
        # CISO can read all agents
        return True
    elif source_agent == AgentType.BOARD:
        # Board can access all briefings
        return True
    elif source_agent == target_agent:
        # Agent can always access its own data
        return True
    else:
        # Cross-agent access denied
        return False

def validate_agent_access(agent_type: AgentType, requested_data: List[str]) -> tuple[bool, List[str]]:
    """
    Validate agent access to multiple data types.

    Args:
        agent_type: Type of agent
        requested_data: List of requested data types

    Returns:
        Tuple of (all_allowed, denied_data_types)
    """
    denied = []
    for data_type in requested_data:
        if not agent_can_access_data(agent_type, data_type):
            denied.append(data_type)

    return (len(denied) == 0, denied)

# Agent metadata
AGENT_DESCRIPTIONS: dict[AgentType, str] = {
    AgentType.CFO: "Chief Financial Officer Agent - Financial analysis and briefings",
    AgentType.CRO: "Chief Risk Officer Agent - Risk analysis and briefings",
    AgentType.CLO: "Chief Legal Officer Agent - Compliance analysis and briefings",
    AgentType.CIO: "Chief Information Officer Agent - Operational analysis and briefings",
    AgentType.CISO: "Chief Information Security Officer Agent - Security analysis and coordination",
    AgentType.BOARD: "Board Agent - Synthesis of all executive briefings",
}

def get_agent_info(agent_type: AgentType) -> dict:
    """
    Get agent information including accessible data.

    Args:
        agent_type: Type of agent

    Returns:
        Agent information dictionary
    """
    return {
        "agent_type": agent_type.value,
        "description": AGENT_DESCRIPTIONS.get(agent_type, "Unknown agent"),
        "accessible_data_types": sorted(get_agent_accessible_data(agent_type)),
        "accessible_categories": sorted(get_agent_accessible_categories(agent_type)),
        "can_access_all_agents": agent_type in {AgentType.CISO, AgentType.BOARD},
    }

def get_all_agents() -> List[dict]:
    """
    Get information about all agents.

    Returns:
        List of agent information dictionaries
    """
    return [get_agent_info(agent) for agent in AgentType]

# Data type descriptions
DATA_TYPE_DESCRIPTIONS: dict[str, str] = {
    # Financial
    "financial_exposure": "Total financial exposure from cyber risk",
    "mlr_impact": "Medical Loss Ratio impact from cyber events",
    "stop_loss_exposure": "Stop-loss contract exposure",
    "reserve_at_risk": "Insurance reserves at risk",
    "premium_revenue": "Premium revenue at risk",
    # Risk
    "threshold_breaches": "Risk threshold breach events",
    "risk_appetite": "Risk appetite and tolerance levels",
    "cms_regulatory_limits": "CMS regulatory limit compliance",
    "residual_risk": "Residual risk after controls",
    "risk_velocity": "Risk velocity and acceleration",
    # Compliance
    "regulatory_triggers": "Regulatory notification triggers",
    "obligation_status": "Regulatory obligation status",
    "notification_timelines": "Notification deadline tracking",
    "vendor_baa_status": "Vendor BAA compliance status",
    "compliance_gaps": "Regulatory compliance gaps",
    # Operational
    "business_process_graph": "Business process dependency graph",
    "operational_impact": "Operational impact from cyber events",
    "system_dependencies": "System and service dependencies",
    "technology_risks": "Technology-specific risks",
    "business_continuity": "Business continuity and recovery",
    # Security
    "risk_objects": "Security risk objects and crown jewels",
    "attack_pathways": "Attack pathway analysis",
    "blast_radius": "Blast radius of potential breaches",
    "threat_intelligence": "Threat intelligence and indicators",
    "security_controls": "Security control effectiveness",
    # Governance
    "governance_metrics": "Governance and oversight metrics",
    "roi_analysis": "ROI of cybersecurity investments",
    "trajectory_trends": "Risk and security trajectory trends",
    "executive_summary": "Executive summary for board",
    "board_kpis": "Board-level KPIs and metrics",
}

def get_data_type_info(data_type: str) -> dict:
    """
    Get data type information.

    Args:
        data_type: Data type to query

    Returns:
        Data type information
    """
    # Determine category
    category = None
    for cat, types in DATA_CATEGORIES.items():
        if data_type in types:
            category = cat
            break

    return {
        "data_type": data_type,
        "description": DATA_TYPE_DESCRIPTIONS.get(data_type, "Unknown data type"),
        "category": category,
        "accessible_by": sorted([
            agent.value for agent in AgentType
            if agent_can_access_data(agent, data_type)
        ])
    }
