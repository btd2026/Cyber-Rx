"""
FinancialImpact - Financial impact calculation for risk objects.

CRITICAL: Every dollar figure must have a complete audit trail for
CFO board-meeting defensibility.

The CFO must be able to defend these numbers in a board meeting.
No LLM in the calculation path - all calculations must be deterministic
and traceable to source data.
"""

from dataclasses import dataclass
from typing import List
from enum import Enum


class ReserveType(str, Enum):
    """Reserve types for reserve_at_risk calculation."""
    MEDICAL_LOSS = "medical_loss"
    CASE_RESERVE = "case_reserve"
    IBNR = "ibnr"  # Incurred But Not Reported


@dataclass
class FinancialSource:
    """Financial data source with quality score.

    Every dollar figure must be traceable to its source data.
    """
    source: str  # "actuarial_export", "claims_data", etc.
    timestamp: str  # ISO 8601
    data_quality_score: float  # 0.0 - 1.0

    def to_dict(self) -> dict:
        return {
            "source": self.source,
            "timestamp": self.timestamp,
            "data_quality_score": self.data_quality_score
        }


@dataclass
class FinancialImpact:
    """
    Financial impact calculation for a risk object.

    CRITICAL: Every dollar figure must have a complete audit trail.
    The CFO must be able to defend these numbers in a board meeting.

    FOUR IMPACT COMPONENTS:
    1. MLR Impact: Medical Loss Ratio effect
    2. Stop-Loss Exposure: Reinsurance position impact
    3. Reserve at Risk: Reserve implications
    4. Premium Revenue Risk: Revenue implications

    TOTAL EXPOSURE = Sum of all four components
    """

    # MLR Impact
    mlr_impact: float  # Estimated effect on MLR ratio (percentage points)
    mlr_impact_confidence: float  # 0.0 - 1.0

    # Stop-Loss Exposure
    stop_loss_exposure: float  # Dollar amount against stop-loss position
    stop_loss_attachment: float  # Current attachment point
    stop_loss_aggregate: float  # Aggregate limit
    stop_loss_remaining: float  # How much stop-loss remains

    # Reserve at Risk
    reserve_at_risk: float  # Dollar amount of reserves implicated
    reserve_type: ReserveType

    # Premium Revenue Risk
    premium_revenue_risk: float  # Potential premium revenue at risk
    line_of_business: str  # Commercial, Medicare, Medicaid, etc.

    # Total Exposure
    total_exposure: float  # Sum of all components
    total_exposure_confidence: float  # 0.0 - 1.0

    # Methodology (CRITICAL FOR AUDIT TRAIL)
    methodology: str  # How this was calculated (deterministic, no LLM)
    methodology_version: str  # Version of calculation engine
    calculation_timestamp: str  # ISO 8601

    # Source Data
    sources: List[FinancialSource]
    assumptions: List[str]

    def to_dict(self) -> dict:
        """Convert FinancialImpact to dictionary."""
        return {
            "mlr_impact": self.mlr_impact,
            "mlr_impact_confidence": self.mlr_impact_confidence,
            "stop_loss_exposure": self.stop_loss_exposure,
            "stop_loss_attachment": self.stop_loss_attachment,
            "stop_loss_aggregate": self.stop_loss_aggregate,
            "stop_loss_remaining": self.stop_loss_remaining,
            "reserve_at_risk": self.reserve_at_risk,
            "reserve_type": self.reserve_type.value,
            "premium_revenue_risk": self.premium_revenue_risk,
            "line_of_business": self.line_of_business,
            "total_exposure": self.total_exposure,
            "total_exposure_confidence": self.total_exposure_confidence,
            "methodology": self.methodology,
            "methodology_version": self.methodology_version,
            "calculation_timestamp": self.calculation_timestamp,
            "sources": [s.to_dict() for s in self.sources],
            "assumptions": self.assumptions
        }

    @classmethod
    def from_dict(cls, data: dict) -> 'FinancialImpact':
        """Create FinancialImpact from dictionary."""
        sources = [FinancialSource(**s) for s in data["sources"]]

        return cls(
            mlr_impact=data["mlr_impact"],
            mlr_impact_confidence=data["mlr_impact_confidence"],
            stop_loss_exposure=data["stop_loss_exposure"],
            stop_loss_attachment=data["stop_loss_attachment"],
            stop_loss_aggregate=data["stop_loss_aggregate"],
            stop_loss_remaining=data["stop_loss_remaining"],
            reserve_at_risk=data["reserve_at_risk"],
            reserve_type=ReserveType(data["reserve_type"]),
            premium_revenue_risk=data["premium_revenue_risk"],
            line_of_business=data["line_of_business"],
            total_exposure=data["total_exposure"],
            total_exposure_confidence=data["total_exposure_confidence"],
            methodology=data["methodology"],
            methodology_version=data["methodology_version"],
            calculation_timestamp=data["calculation_timestamp"],
            sources=sources,
            assumptions=data["assumptions"]
        )

    def validate(self) -> bool:
        """Validate FinancialImpact constraints."""
        # Check confidence ranges
        if not (0.0 <= self.mlr_impact_confidence <= 1.0):
            raise ValueError(f"Invalid mlr_impact_confidence: {self.mlr_impact_confidence}")
        if not (0.0 <= self.total_exposure_confidence <= 1.0):
            raise ValueError(f"Invalid total_exposure_confidence: {self.total_exposure_confidence}")

        # Check for negative values
        if self.stop_loss_exposure < 0:
            raise ValueError(f"Invalid stop_loss_exposure (negative): {self.stop_loss_exposure}")
        if self.reserve_at_risk < 0:
            raise ValueError(f"Invalid reserve_at_risk (negative): {self.reserve_at_risk}")
        if self.premium_revenue_risk < 0:
            raise ValueError(f"Invalid premium_revenue_risk (negative): {self.premium_revenue_risk}")
        if self.total_exposure < 0:
            raise ValueError(f"Invalid total_exposure (negative): {self.total_exposure}")

        # Check methodology fields (CRITICAL FOR AUDIT TRAIL)
        if not self.methodology:
            raise ValueError("methodology cannot be empty")
        if not self.methodology_version:
            raise ValueError("methodology_version cannot be empty")
        if not self.calculation_timestamp:
            raise ValueError("calculation_timestamp cannot be empty")

        # Check sources
        if not self.sources:
            raise ValueError("sources cannot be empty")

        return True

    def calculate_total_exposure(self) -> float:
        """
        Calculate total exposure as sum of all components.

        Formula: total_exposure = mlr_impact + stop_loss_exposure + reserve_at_risk + premium_revenue_risk

        NOTE: This is a simplified calculation. The actual calculation engine (T-MVP-006)
        will implement more sophisticated logic based on actuarial principles.
        """
        total = (
            self.mlr_impact +
            self.stop_loss_exposure +
            self.reserve_at_risk +
            self.premium_revenue_risk
        )

        self.total_exposure = total
        return total
