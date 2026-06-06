"""
Stop-Loss Exposure Calculator

Calculates stop-loss exposure from risk objects.

Formula:
- Projected losses = blast_radius_criticality × likelihood_score × average_claim_cost × affected_member_count
- Exposure against attachment = max(0, projected_losses - attachment_point)
- Remaining capacity = aggregate_limit - current_position - exposure

CRITICAL: Deterministic calculation only. NO LLM in calculation path.
"""

import structlog
from typing import Dict

from ..config import config


logger = structlog.get_logger(__name__)


class StopLossExposureCalculator:
    """
    Stop-Loss Exposure Calculator

    Calculates the potential hit to the stop-loss layer
    if a risk materializes.
    """

    def __init__(self, actuarial_service):
        """
        Initialize calculator with actuarial service.

        Args:
            actuarial_service: Service for accessing actuarial data
        """
        self.actuarial_service = actuarial_service
        self.logger = logger

    async def calculate_stop_loss_exposure(self, risk_object: Dict, actuarial_data: Dict) -> Dict:
        """
        Calculate stop-loss exposure from risk object.

        Calculation Steps:
        1. Extract likelihood_score and blast_radius_criticality from risk_object
        2. Get stop-loss parameters (attachment, aggregate, current_position)
        3. Calculate projected losses
        4. Calculate exposure against attachment point
        5. Calculate remaining capacity

        Args:
            risk_object: Enriched RiskObject from T-MVP-005
            actuarial_data: Actuarial data from data warehouse

        Returns:
            Dict with exposure, attachment, aggregate, remaining

        Example:
            Input:
                risk_object = {
                    'likelihood_score': 0.8,
                    'blast_radius_criticality': 0.85,
                    'affected_member_count': 10000
                }
                actuarial_data = {
                    'stop_loss_data': {
                        'attachment': 250000,
                        'aggregate': 5000000,
                        'current_position': 500000,
                        'average_claim_cost': 1200,
                        'claim_rate': 0.02
                    }
                }

            Output:
                {
                    'exposure': 500000,
                    'attachment': 250000,
                    'aggregate': 5000000,
                    'remaining': 4000000
                }
        """
        likelihood_score = risk_object.get('likelihood_score', 0.0)
        blast_radius_criticality = risk_object.get('blast_radius_criticality', 0.0)
        affected_member_count = risk_object.get('affected_member_count', 10000)

        # Get stop-loss-specific actuarial data
        stop_loss_data = actuarial_data.get('stop_loss_data', {})

        # Extract stop-loss parameters (use defaults if not available)
        attachment = stop_loss_data.get('attachment', config.stop_loss.default_attachment)
        aggregate = stop_loss_data.get('aggregate', config.stop_loss.default_aggregate)
        current_position = stop_loss_data.get('current_position', config.stop_loss.default_current_position)
        average_claim_cost = stop_loss_data.get('average_claim_cost', config.mlr.default_average_claim_cost)
        claim_rate = stop_loss_data.get('claim_rate', config.mlr.default_claim_rate)

        self.logger.info(
            "Calculating stop-loss exposure",
            likelihood_score=likelihood_score,
            blast_radius_criticality=blast_radius_criticality,
            attachment=attachment,
            aggregate=aggregate,
            current_position=current_position
        )

        # Step 1: Calculate projected losses
        projected_losses = self.calculate_projected_losses(
            blast_radius_criticality=blast_radius_criticality,
            likelihood_score=likelihood_score,
            average_claim_cost=average_claim_cost,
            affected_member_count=affected_member_count,
            claim_rate=claim_rate
        )

        # Step 2: Calculate exposure against attachment point
        exposure = self.calculate_exposure_against_attachment(
            projected_losses=projected_losses,
            attachment_point=attachment
        )

        # Step 3: Calculate remaining capacity
        remaining = self.calculate_remaining_capacity(
            aggregate_limit=aggregate,
            current_position=current_position,
            exposure=exposure
        )

        self.logger.info(
            "Stop-loss exposure calculated",
            exposure=exposure,
            remaining=remaining,
            projected_losses=projected_losses
        )

        return {
            'exposure': exposure,
            'attachment': attachment,
            'aggregate': aggregate,
            'remaining': remaining,
            'projected_losses': projected_losses
        }

    def calculate_projected_losses(
        self,
        blast_radius_criticality: float,
        likelihood_score: float,
        average_claim_cost: float,
        affected_member_count: int,
        claim_rate: float
    ) -> float:
        """
        Calculate projected losses.

        Formula:
        projected_losses = blast_radius_criticality × likelihood_score ×
                          average_claim_cost × affected_member_count × claim_rate

        Args:
            blast_radius_criticality: Blast radius criticality score (0.0 - 1.0)
            likelihood_score: Risk likelihood score (0.0 - 1.0)
            average_claim_cost: Average cost per claim ($)
            affected_member_count: Number of affected members
            claim_rate: Historical claim rate (0.0 - 1.0)

        Returns:
            Projected losses ($)

        Example:
            blast_radius_criticality = 0.85
            likelihood_score = 0.8
            average_claim_cost = $1200
            affected_member_count = 10000
            claim_rate = 0.02

            projected_losses = 0.85 × 0.8 × 1200 × 10000 × 0.02
                            = $163,200
        """
        projected_losses = (
            blast_radius_criticality *
            likelihood_score *
            average_claim_cost *
            affected_member_count *
            claim_rate
        )

        return projected_losses

    def calculate_exposure_against_attachment(
        self,
        projected_losses: float,
        attachment_point: float
    ) -> float:
        """
        Calculate exposure against stop-loss attachment point.

        Formula:
        exposure = max(0, projected_losses - attachment_point)

        Args:
            projected_losses: Projected loss amount ($)
            attachment_point: Stop-loss attachment point ($)

        Returns:
            Exposure against attachment ($)

        Example:
            projected_losses = $750,000
            attachment_point = $250,000

            exposure = max(0, 750000 - 250000)
                    = $500,000
        """
        exposure = max(0.0, projected_losses - attachment_point)

        return exposure

    def calculate_remaining_capacity(
        self,
        aggregate_limit: float,
        current_position: float,
        exposure: float
    ) -> float:
        """
        Calculate remaining stop-loss capacity.

        Formula:
        remaining = aggregate_limit - current_position - exposure

        Args:
            aggregate_limit: Aggregate stop-loss limit ($)
            current_position: Current stop-loss position ($)
            exposure: Projected exposure ($)

        Returns:
            Remaining capacity ($)

        Example:
            aggregate_limit = $5,000,000
            current_position = $500,000
            exposure = $500,000

            remaining = 5000000 - 500000 - 500000
                      = $4,000,000
        """
        remaining = aggregate_limit - current_position - exposure

        return max(0.0, remaining)  # Ensure no negative capacity
