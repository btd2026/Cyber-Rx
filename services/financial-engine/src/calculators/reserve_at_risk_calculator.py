"""
Reserve at Risk Calculator

Calculates reserve at risk from risk objects.

Formula:
- Identify reserve type from business process map
- Calculate projected depletion = blast_radius_criticality × likelihood_score × claim_rate × reserve_balance
- Reserve at risk = projected depletion

CRITICAL: Deterministic calculation only. NO LLM in calculation path.
"""

import structlog
from typing import Dict
from enum import Enum

from ..config import config


logger = structlog.get_logger(__name__)


class ReserveType(Enum):
    """Reserve types for reserve_at_risk calculation."""
    MEDICAL_LOSS = "medical_loss"
    CASE_RESERVE = "case_reserve"
    IBNR = "ibnr"


class ReserveAtRiskCalculator:
    """
    Reserve at Risk Calculator

    Calculates the reserve implications if a risk materializes.
    """

    def __init__(self, actuarial_service):
        """
        Initialize calculator with actuarial service.

        Args:
            actuarial_service: Service for accessing actuarial data
        """
        self.actuarial_service = actuarial_service
        self.logger = logger

    async def calculate_reserve_at_risk(self, risk_object: Dict, actuarial_data: Dict) -> Dict:
        """
        Calculate reserve at risk from risk object.

        Calculation Steps:
        1. Identify reserve type from business_process_map
        2. Get reserve data (reserve_balance, claim_rate)
        3. Calculate projected depletion
        4. Reserve at risk = projected depletion

        Args:
            risk_object: Enriched RiskObject from T-MVP-005
            actuarial_data: Actuarial data from data warehouse

        Returns:
            Dict with reserve_at_risk and reserve_type

        Example:
            Input:
                risk_object = {
                    'business_process_map': ['claims_adjudication', 'enrollment'],
                    'likelihood_score': 0.8,
                    'blast_radius_criticality': 0.85
                }
                actuarial_data = {
                    'reserve_data': {
                        'reserve_balance': 10000000,
                        'claim_rate': 0.02
                    }
                }

            Output:
                {
                    'reserve_at_risk': 750000,
                    'reserve_type': 'case_reserve'
                }
        """
        business_process_map = risk_object.get('business_process_map', [])
        likelihood_score = risk_object.get('likelihood_score', 0.0)
        blast_radius_criticality = risk_object.get('blast_radius_criticality', 0.0)

        # Step 1: Identify reserve type
        reserve_type = self.identify_reserve_type(business_process_map)

        # Get reserve-specific actuarial data
        reserve_data = actuarial_data.get('reserve_data', {})

        # Extract reserve parameters (use defaults if not available)
        reserve_balance = reserve_data.get('reserve_balance', config.reserve.default_reserve_balance)
        claim_rate = reserve_data.get('claim_rate', config.reserve.default_claim_rate)

        self.logger.info(
            "Calculating reserve at risk",
            reserve_type=reserve_type,
            likelihood_score=likelihood_score,
            blast_radius_criticality=blast_radius_criticality,
            reserve_balance=reserve_balance,
            claim_rate=claim_rate
        )

        # Step 2: Calculate projected depletion
        projected_depletion = self.calculate_projected_depletion(
            blast_radius_criticality=blast_radius_criticality,
            likelihood_score=likelihood_score,
            claim_rate=claim_rate,
            reserve_balance=reserve_balance
        )

        # Step 3: Reserve at risk = projected depletion
        reserve_at_risk = projected_depletion

        self.logger.info(
            "Reserve at risk calculated",
            reserve_at_risk=reserve_at_risk,
            reserve_type=reserve_type,
            projected_depletion=projected_depletion
        )

        return {
            'reserve_at_risk': reserve_at_risk,
            'reserve_type': reserve_type.value,
            'projected_depletion': projected_depletion
        }

    def identify_reserve_type(self, business_process_map: list) -> ReserveType:
        """
        Identify reserve type from business process map.

        Mapping (from config):
        - "claims_adjudication" → CASE_RESERVE
        - "enrollment" → MEDICAL_LOSS
        - "care_management" → IBNR
        - "provider_payment" → CASE_RESERVE
        - "edi_837" → CASE_RESERVE
        - "edi_835" → CASE_RESERVE

        Args:
            business_process_map: List of affected business processes

        Returns:
            ReserveType enum value

        Example:
            business_process_map = ['claims_adjudication', 'enrollment']

            Returns: ReserveType.CASE_RESERVE (first match)

        Note: If multiple processes match, returns the first match.
        Defaults to CASE_RESERVE if no match found.
        """
        mappings = config.reserve.reserve_type_mappings

        for process in business_process_map:
            if process in mappings:
                reserve_type_str = mappings[process]
                return ReserveType(reserve_type_str)

        # Default to case_reserve if no match
        return ReserveType.CASE_RESERVE

    def calculate_projected_depletion(
        self,
        blast_radius_criticality: float,
        likelihood_score: float,
        claim_rate: float,
        reserve_balance: float
    ) -> float:
        """
        Calculate projected reserve depletion.

        Formula:
        depletion = blast_radius_criticality × likelihood_score ×
                    claim_rate × reserve_balance

        Args:
            blast_radius_criticality: Blast radius criticality score (0.0 - 1.0)
            likelihood_score: Risk likelihood score (0.0 - 1.0)
            claim_rate: Historical claim rate (0.0 - 1.0)
            reserve_balance: Current reserve balance ($)

        Returns:
            Projected depletion ($)

        Example:
            blast_radius_criticality = 0.85
            likelihood_score = 0.8
            claim_rate = 0.02
            reserve_balance = $10,000,000

            depletion = 0.85 × 0.8 × 0.02 × 10000000
                      = $136,000
        """
        depletion = (
            blast_radius_criticality *
            likelihood_score *
            claim_rate *
            reserve_balance
        )

        return depletion
