"""
Premium Revenue Risk Calculator

Calculates premium revenue risk from risk objects.

Formula:
- Identify line of business from business process map
- Calculate projected attrition = blast_radius_criticality × likelihood_score × attrition_rate × member_count
- Calculate annual revenue risk = projected_attrition × premium_per_member × 12

CRITICAL: Deterministic calculation only. NO LLM in calculation path.
"""

import structlog
from typing import Dict

from ..config import config


logger = structlog.get_logger(__name__)


class PremiumRevenueRiskCalculator:
    """
    Premium Revenue Risk Calculator

    Calculates the revenue implications if a risk materializes.
    """

    def __init__(self, actuarial_service):
        """
        Initialize calculator with actuarial service.

        Args:
            actuarial_service: Service for accessing actuarial data
        """
        self.actuarial_service = actuarial_service
        self.logger = logger

    async def calculate_premium_revenue_risk(self, risk_object: Dict, actuarial_data: Dict) -> Dict:
        """
        Calculate premium revenue risk from risk object.

        Calculation Steps:
        1. Identify line of business from business_process_map
        2. Get member data (member_count, premium_per_member, attrition_rate)
        3. Calculate projected attrition
        4. Calculate annual revenue risk

        Args:
            risk_object: Enriched RiskObject from T-MVP-005
            actuarial_data: Actuarial data from data warehouse

        Returns:
            Dict with premium_revenue_risk and line_of_business

        Example:
            Input:
                risk_object = {
                    'business_process_map': ['medicare_claim_processing', 'enrollment'],
                    'likelihood_score': 0.8,
                    'blast_radius_criticality': 0.85
                }
                actuarial_data = {
                    'premium_revenue_data': {
                        'member_count': 50000,
                        'premium_per_member': 500,
                        'attrition_rate': 0.05
                    }
                }

            Output:
                {
                    'premium_revenue_risk': 1200000,
                    'line_of_business': 'Medicare'
                }
        """
        business_process_map = risk_object.get('business_process_map', [])
        likelihood_score = risk_object.get('likelihood_score', 0.0)
        blast_radius_criticality = risk_object.get('blast_radius_criticality', 0.0)

        # Step 1: Identify line of business
        line_of_business = self.identify_line_of_business(business_process_map)

        # Get premium revenue-specific actuarial data
        premium_revenue_data = actuarial_data.get('premium_revenue_data', {})

        # Extract member parameters (use defaults if not available)
        member_count = premium_revenue_data.get('member_count', config.premium_revenue.default_member_count)
        premium_per_member = premium_revenue_data.get('premium_per_member', config.premium_revenue.default_premium_per_member)
        attrition_rate = premium_revenue_data.get('attrition_rate', config.premium_revenue.default_attrition_rate)

        self.logger.info(
            "Calculating premium revenue risk",
            line_of_business=line_of_business,
            likelihood_score=likelihood_score,
            blast_radius_criticality=blast_radius_criticality,
            member_count=member_count,
            premium_per_member=premium_per_member,
            attrition_rate=attrition_rate
        )

        # Step 2: Calculate projected attrition
        projected_attrition = self.calculate_projected_attrition(
            blast_radius_criticality=blast_radius_criticality,
            likelihood_score=likelihood_score,
            attrition_rate=attrition_rate,
            member_count=member_count
        )

        # Step 3: Calculate annual revenue risk
        revenue_risk = self.calculate_annual_revenue_risk(
            projected_attrition=projected_attrition,
            premium_per_member_monthly=premium_per_member
        )

        self.logger.info(
            "Premium revenue risk calculated",
            revenue_risk=revenue_risk,
            line_of_business=line_of_business,
            projected_attrition=projected_attrition
        )

        return {
            'premium_revenue_risk': revenue_risk,
            'line_of_business': line_of_business,
            'projected_attrition': projected_attrition
        }

    def identify_line_of_business(self, business_process_map: list) -> str:
        """
        Identify line of business from business process map.

        Mapping (from config):
        - "medicare_claim_processing" → "Medicare"
        - "medicare_eligibility" → "Medicare"
        - "medicaid_eligibility" → "Medicaid"
        - "medicaid_claim_processing" → "Medicaid"
        - "commercial_enrollment" → "Commercial"
        - "commercial_claim_processing" → "Commercial"

        Args:
            business_process_map: List of affected business processes

        Returns:
            Line of business string

        Example:
            business_process_map = ['medicare_claim_processing', 'enrollment']

            Returns: "Medicare" (first match)

        Note: If multiple processes match, returns the first match.
        Defaults to "Commercial" if no match found.
        """
        mappings = config.premium_revenue.line_of_business_mappings

        for process in business_process_map:
            if process in mappings:
                return mappings[process]

        # Default to Commercial if no match
        return "Commercial"

    def calculate_projected_attrition(
        self,
        blast_radius_criticality: float,
        likelihood_score: float,
        attrition_rate: float,
        member_count: int
    ) -> int:
        """
        Calculate projected member attrition.

        Formula:
        attrition = blast_radius_criticality × likelihood_score ×
                    attrition_rate × member_count

        Args:
            blast_radius_criticality: Blast radius criticality score (0.0 - 1.0)
            likelihood_score: Risk likelihood score (0.0 - 1.0)
            attrition_rate: Historical attrition rate (0.0 - 1.0)
            member_count: Current member count

        Returns:
            Projected attrition (member count)

        Example:
            blast_radius_criticality = 0.85
            likelihood_score = 0.8
            attrition_rate = 0.05
            member_count = 50000

            attrition = 0.85 × 0.8 × 0.05 × 50000
                     = 1,700 members
        """
        attrition = (
            blast_radius_criticality *
            likelihood_score *
            attrition_rate *
            member_count
        )

        return int(attrition)

    def calculate_annual_revenue_risk(
        self,
        projected_attrition: int,
        premium_per_member_monthly: float
    ) -> float:
        """
        Calculate annual premium revenue risk.

        Formula:
        revenue_risk = projected_attrition × premium_per_member × 12

        Args:
            projected_attrition: Projected member attrition
            premium_per_member_monthly: Monthly premium per member ($)

        Returns:
            Annual revenue risk ($)

        Example:
            projected_attrition = 1,700
            premium_per_member_monthly = $500

            revenue_risk = 1700 × 500 × 12
                         = $10,200,000
        """
        revenue_risk = projected_attrition * premium_per_member_monthly * 12

        return revenue_risk
