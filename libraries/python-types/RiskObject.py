"""
RiskObject - Core risk data structure for CyberRX platform.

This is the canonical representation of risk that flows through the entire system.
All connectors normalize their data to this schema.

CRITICAL: This is the core data structure. Get this right, everything else becomes easier.
"""

from dataclasses import dataclass
from datetime import datetime
from typing import List, Literal, Optional
from enum import Enum
from uuid import UUID


class RiskCategory(str, Enum):
    """Risk category classification."""
    THREAT = "threat"
    VULNERABILITY = "vulnerability"
    COMPLIANCE = "compliance"
    VENDOR = "vendor"
    OPERATIONAL = "operational"


class RiskStatus(str, Enum):
    """Current status of the risk."""
    ACTIVE = "active"
    REMEDIATED = "remediated"
    ACCEPTED = "accepted"
    ESCALATED = "escalated"


@dataclass
class MethodologyTrail:
    """Audit trail for how a risk object was created and enriched.

    CRITICAL: This enables CFO board-meeting defensibility by tracking
    every step of the normalization and enrichment process.
    """
    normalization_steps: List[str]
    enrichment_timestamps: List[str]
    data_sources: List[str]
    calculation_methods: List[str]
    assumptions: List[str]
    confidence_scores: List[float]

    def to_dict(self) -> dict:
        return {
            "normalization_steps": self.normalization_steps,
            "enrichment_timestamps": self.enrichment_timestamps,
            "data_sources": self.data_sources,
            "calculation_methods": self.calculation_methods,
            "assumptions": self.assumptions,
            "confidence_scores": self.confidence_scores
        }


@dataclass
class Regulation:
    """Regulatory trigger associated with a risk."""
    regulation_id: str
    name: str
    obligation: str
    deadline: str  # ISO 8601
    status: Literal["compliant", "at_risk", "non_compliant"]
    notification_required: bool
    notification_timeline: str  # e.g., "60 days"
    cms_form_required: Optional[str] = None  # e.g., "CMS-10743"

    def to_dict(self) -> dict:
        return {
            "regulation_id": self.regulation_id,
            "name": self.name,
            "obligation": self.obligation,
            "deadline": self.deadline,
            "status": self.status,
            "notification_required": self.notification_required,
            "notification_timeline": self.notification_timeline,
            "cms_form_required": self.cms_form_required
        }


@dataclass
class Threshold:
    """Threshold breach associated with a risk."""
    threshold_id: str
    threshold_name: str
    threshold_type: Literal["risk_score", "financial_exposure", "trend", "custom"]
    threshold_value: float
    actual_value: float
    severity: Literal["low", "medium", "high", "critical"]
    triggered_at: str  # ISO 8601
    acknowledged: bool = False
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "threshold_id": self.threshold_id,
            "threshold_name": self.threshold_name,
            "threshold_type": self.threshold_type,
            "threshold_value": self.threshold_value,
            "actual_value": self.actual_value,
            "severity": self.severity,
            "triggered_at": self.triggered_at,
            "acknowledged": self.acknowledged,
            "acknowledged_by": self.acknowledged_by,
            "acknowledged_at": self.acknowledged_at
        }


@dataclass
class RiskObject:
    """
    Core risk data structure that flows through the entire CyberRX system.

    This is the canonical representation of risk. All connectors normalize
    their data to this schema before publishing to the event bus.

    CRITICAL FIELDS:
    - financial_exposure: Must be CFO board-meeting defensible
    - methodology_trail: Complete audit trail for all calculations
    - business_process_map: Links to business process graph for impact analysis
    - blast_radius: Downstream systems reachable by this risk
    """

    # Identity
    id: UUID
    source: str  # Connector identifier (e.g., "splunk", "crowdstrike")
    source_event_id: str  # Original event ID from source
    category: RiskCategory

    # What's affected
    affected_assets: List[str]  # System names, hostnames, IPs
    business_process_map: List[str]  # Business process IDs

    # Risk assessment
    likelihood_score: float  # 0.0 - 1.0
    blast_radius: List[str]  # Downstream systems reachable
    financial_exposure: 'FinancialImpact'
    regulatory_triggers: List[Regulation]
    threshold_breaches: List[Threshold]

    # Resolution
    remediation_owner: str  # Team or person responsible
    status: RiskStatus

    # Metadata
    created_at: str  # ISO 8601
    updated_at: str  # ISO 8601
    first_detected_at: str  # ISO 8601
    confidence: float  # 0.0 - 1.0

    # Audit trail
    methodology_trail: MethodologyTrail
    normalization_notes: str

    def to_dict(self) -> dict:
        """Convert RiskObject to dictionary for JSON serialization."""
        return {
            "id": str(self.id),
            "source": self.source,
            "source_event_id": self.source_event_id,
            "category": self.category.value,
            "affected_assets": self.affected_assets,
            "business_process_map": self.business_process_map,
            "likelihood_score": self.likelihood_score,
            "blast_radius": self.blast_radius,
            "financial_exposure": self.financial_exposure.to_dict(),
            "regulatory_triggers": [r.to_dict() for r in self.regulatory_triggers],
            "threshold_breaches": [t.to_dict() for t in self.threshold_breaches],
            "remediation_owner": self.remediation_owner,
            "status": self.status.value,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "first_detected_at": self.first_detected_at,
            "confidence": self.confidence,
            "methodology_trail": self.methodology_trail.to_dict(),
            "normalization_notes": self.normalization_notes
        }

    @classmethod
    def from_dict(cls, data: dict) -> 'RiskObject':
        """Create RiskObject from dictionary."""
        from .FinancialImpact import FinancialImpact

        financial_exposure = FinancialImpact.from_dict(data["financial_exposure"])
        regulatory_triggers = [Regulation(**r) for r in data["regulatory_triggers"]]
        threshold_breaches = [Threshold(**t) for t in data["threshold_breaches"]]
        methodology_trail = MethodologyTrail(**data["methodology_trail"])

        return cls(
            id=UUID(data["id"]),
            source=data["source"],
            source_event_id=data["source_event_id"],
            category=RiskCategory(data["category"]),
            affected_assets=data["affected_assets"],
            business_process_map=data["business_process_map"],
            likelihood_score=data["likelihood_score"],
            blast_radius=data["blast_radius"],
            financial_exposure=financial_exposure,
            regulatory_triggers=regulatory_triggers,
            threshold_breaches=threshold_breaches,
            remediation_owner=data["remediation_owner"],
            status=RiskStatus(data["status"]),
            created_at=data["created_at"],
            updated_at=data["updated_at"],
            first_detected_at=data["first_detected_at"],
            confidence=data["confidence"],
            methodology_trail=methodology_trail,
            normalization_notes=data["normalization_notes"]
        )

    def validate(self) -> bool:
        """Validate RiskObject constraints."""
        # Check score ranges
        if not (0.0 <= self.likelihood_score <= 1.0):
            raise ValueError(f"Invalid likelihood_score: {self.likelihood_score}")
        if not (0.0 <= self.confidence <= 1.0):
            raise ValueError(f"Invalid confidence: {self.confidence}")

        # Check required fields
        if not self.affected_assets:
            raise ValueError("affected_assets cannot be empty")
        if not self.business_process_map:
            raise ValueError("business_process_map cannot be empty")
        if not self.remediation_owner:
            raise ValueError("remediation_owner cannot be empty")

        return True
