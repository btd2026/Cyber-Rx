"""
MLR Impact Calculator

Calculates Medical Loss Ratio (MLR) impact from risk objects.

Formula:
- Projected claims increase = blast_radius_criticality × likelihood_score × average_claim_cost × affected_member_count
- MLR impact (percentage points) = projected_claims_increase / premium_revenue

CRITICAL: Deterministic calculation only. NO LLM in calculation path.
"""

import structlog
from typing import Dict

from ..config import config


logger = structlog.get_logger(__name__)


class MLRImpactCalculator:
    """
    MLR Impact Calculator

    Calculates the estimated effect on Medical Loss Ratio (MLR)
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

    async def calculate_mlr_impact(self, risk_object: Dict, actuarial_data: Dict) -> Dict:
        """
        Calculate MLR impact from risk object.

        Calculation Steps:
        1. Extract likelihood_score and blast_radius_criticality from risk_object
        2. Get actuarial data (average_claim_cost, premium_revenue, affected_member_count)
        3. Calculate projected claims increase
        4. Calculate MLR impact in percentage points
        5. Calculate confidence score

        Args:
            risk_object: Enriched RiskObject from T-MVP-005
                - likelihood_score: 0.0 - 1.0 (probability of risk materializing)
                - blast_radius_criticality: 0.0 - 1.0 (criticality score of blast radius)
                - business_process_map: List of affected business processes
                - affected_assets: List of affected systems/assets
            actuarial_data: Actuarial data from data warehouse
                - mlr_data: MLR-specific actuarial data
                    - average_claim_cost: Average cost per claim
                    - premium_revenue: Total premium revenue
                    - affected_member_count: Number of affected members
                    - claim_rate: Historical claim rate
                - data_quality_score: Quality score of actuarial data (0.0 - 1.0)

        Returns:
            Dict with:
                - mlr_impact: MLR impact in percentage points (0.0 - 1.0)
                - confidence: Confidence score (0.0 - 1.0)

        Example:
            Input:
                risk_object = {
                    'likelihood_score': 0.8,
                    'blast_radius_criticality': 0.85,
                    'business_process_map': ['claims_adjudication', 'enrollment']
                }
                actuarial_data = {
                    'mlr_data': {
                        'average_claim_cost': 1200,
                        'premium_revenue': 50000000,
                        'affected_member_count': 10000,
                        'claim_rate': 0.02
                    },
                    'data_quality_score': 0.95
                }

            Output:
                {
                    'mlr_impact': 0.01632,  # 1.6 percentage points
                    'confidence': 0.875     # High confidence
                }

        Methodology:
        1. Projected claims increase:
           = blast_radius_criticality (0.85)
             × likelihood_score (0.8)
             × average_claim_cost ($1200)
             × affected_member_count (10000)
             × claim_rate (0.02)
           = 0.85 × 0.8 × 1200 × 10000 × 0.02
           = $163,200

        2. MLR impact (percentage points):
           = projected_claims_increase ($163,200) / premium_revenue ($50,000,000)
           = 0.00326
           = 0.33 percentage points

        Note: This is a simplified calculation. The actual MLR impact
        calculation would be more sophisticated, considering:
        - State-specific MLR targets
        - Line-of-business specific MLR thresholds
        - Seasonal variations in claims
        - MLR reporting periods (annual vs quarterly)
        - CMS MLR rebate calculations
        """
        likelihood_score = risk_object.get('likelihood_score', 0.0)
        blast_radius_criticality = risk_object.get('blast_radius_criticality', 0.0)
        business_process_map = risk_object.get('business_process_map', [])

        # Get MLR-specific actuarial data
        mlr_data = actuarial_data.get('mlr_data', {})
        data_quality_score = actuarial_data.get('data_quality_score', 0.8)

        # Extract actuarial parameters (use defaults if not available)
        average_claim_cost = mlr_data.get('average_claim_cost', config.mlr.default_average_claim_cost)
        premium_revenue = mlr_data.get('premium_revenue', config.mlr.default_premium_revenue)
        affected_member_count = mlr_data.get('affected_member_count', 10000)
        claim_rate = mlr_data.get('claim_rate', config.mlr.default_claim_rate)

        self.logger.info(
            "Calculating MLR impact",
            likelihood_score=likelihood_score,
            blast_radius_criticality=blast_radius_criticality,
            average_claim_cost=average_claim_cost,
            premium_revenue=premium_revenue,
            affected_member_count=affected_member_count,
            claim_rate=claim_rate
        )

        # Step 1: Calculate projected claims increase
        projected_claims_increase = self.calculate_projected_claims_increase(
            blast_radius_criticality=blast_radius_criticality,
            likelihood_score=likelihood_score,
            average_claim_cost=average_claim_cost,
            affected_member_count=affected_member_count,
            claim_rate=claim_rate
        )

        # Step 2: Calculate MLR impact in percentage points
        mlr_impact = self.calculate_mlr_impact_percentage_points(
            projected_claims_increase=projected_claims_increase,
            premium_revenue=premium_revenue
        )

        # Step 3: Calculate confidence score
        confidence = self.calculate_confidence_score(
            data_quality_score=data_quality_score,
            methodology_certainty=0.90  # High certainty in calculation methodology
        )

        # Ensure MLR impact is within valid range
        mlr_impact = max(config.mlr.min_mlr_impact, min(config.mlr.max_mlr_impact, mlr_impact))

        self.logger.info(
            "MLR impact calculated",
            mlr_impact=mlr_impact,
            confidence=confidence,
            projected_claims_increase=projected_claims_increase
        )

        return {
            'mlr_impact': mlr_impact,
            'confidence': confidence,
            'projected_claims_increase': projected_claims_increase
        }

    def calculate_projected_claims_increase(
        self,
        blast_radius_criticality: float,
        likelihood_score: float,
        average_claim_cost: float,
        affected_member_count: int,
        claim_rate: float
    ) -> float:
        """
        Calculate projected claims increase.

        Formula:
        projected_increase = blast_radius_criticality × likelihood_score ×
                           average_claim_cost × affected_member_count × claim_rate

        Args:
            blast_radius_criticality: Blast radius criticality score (0.0 - 1.0)
            likelihood_score: Risk likelihood score (0.0 - 1.0)
            average_claim_cost: Average cost per claim ($)
            affected_member_count: Number of affected members
            claim_rate: Historical claim rate (0.0 - 1.0)

        Returns:
            Projected claims increase ($)

        Example:
            blast_radius_criticality = 0.85
            likelihood_score = 0.8
            average_claim_cost = $1200
            affected_member_count = 10000
            claim_rate = 0.02

            projected_increase = 0.85 × 0.8 × 1200 × 10000 × 0.02
                             = $163,200
        """
        projected_increase = (
            blast_radius_criticality *
            likelihood_score *
            average_claim_cost *
            affected_member_count *
            claim_rate
        )

        return projected_increase

    def calculate_mlr_impact_percentage_points(
        self,
        projected_claims_increase: float,
        premium_revenue: float
    ) -> float:
        """
        Calculate MLR impact in percentage points.

        Formula:
        mlr_impact = projected_claims_increase / premium_revenue

        Note: This returns percentage points as a decimal (0.01 = 1 percentage point).
        To convert to percentage, multiply by 100.

        Args:
            projected_claims_increase: Projected claims cost increase ($)
            premium_revenue: Total premium revenue ($)

        Returns:
            MLR impact in percentage points (0.0 - 1.0)

        Example:
            projected_claims_increase = $163,200
            premium_revenue = $50,000,000

            mlr_impact = 163200 / 50000000
                       = 0.00326
                       = 0.33 percentage points

            Note: If current MLR is 0.82, this risk would increase it to 0.8532.
        """
        if premium_revenue <= 0:
            self.logger.warning("Premium revenue is zero or negative", premium_revenue=premium_revenue)
            return 0.0

        mlr_impact = projected_claims_increase / premium_revenue

        return mlr_impact

    def calculate_confidence_score(
        self,
        data_quality_score: float,
        methodology_certainty: float
    ) -> float:
        """
        Calculate MLR impact confidence score.

        Formula:
        confidence = (data_quality_score + methodology_certainty) / 2

        Args:
            data_quality_score: Actuarial data quality score (0.0 - 1.0)
            methodology_certainty: Calculation methodology certainty (0.0 - 1.0)
                - High (0.9+): Well-established actuarial principles
                - Medium (0.7-0.9): Standard calculations with some assumptions
                - Low (<0.7): Many assumptions or limited data

        Returns:
            Confidence score (0.0 - 1.0)

        Example:
            data_quality_score = 0.95
            methodology_certainty = 0.90

            confidence = (0.95 + 0.90) / 2
                       = 0.925
        """
        confidence = (data_quality_score + methodology_certainty) / 2.0

        return confidence
