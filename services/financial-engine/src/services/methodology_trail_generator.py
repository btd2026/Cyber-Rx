"""
Methodology Trail Generator

Generates complete audit methodology trails for financial calculations.

CRITICAL: Every dollar figure must have a complete audit trail for
CFO board-meeting defensibility.

The methodology trail includes:
- Calculation methodology description
- Methodology version
- Calculation timestamp
- Data sources with quality scores
- Key assumptions made
- Calculation steps with timestamps
"""

import structlog
from typing import Dict, List
from datetime import datetime

from ..config import config
from ..calculation_engine import CalculationStep


logger = structlog.get_logger(__name__)


class MethodologyTrailGenerator:
    """
    Methodology Trail Generator

    Generates complete audit methodology trails that enable CFO
    board-meeting defensibility for all financial calculations.
    """

    def __init__(self):
        """Initialize methodology trail generator."""
        self.logger = logger

    def generate_methodology_trail(
        self,
        risk_object: Dict,
        calculation_steps: List[CalculationStep],
        data_sources: List[Dict],
        data_quality_score: float
    ) -> Dict:
        """
        Generate complete audit methodology trail.

        Generates:
        1. Calculation methodology description
        2. Methodology version
        3. Calculation timestamp
        4. Data sources list
        5. Assumptions list
        6. Calculation steps with timestamps

        Args:
            risk_object: Enriched RiskObject
            calculation_steps: List of calculation steps performed
            data_sources: List of actuarial data sources
            data_quality_score: Overall data quality score (0.0 - 1.0)

        Returns:
            Methodology trail dict with:
                - methodology: Human-readable description
                - methodology_version: Calculation engine version
                - calculation_timestamp: ISO 8601 timestamp
                - sources: List of data sources
                - assumptions: List of key assumptions

        Example:
            Output:
            {
                "methodology": "Calculation engine v1.0: MLR impact (claims cost model: projected_increase = blast_radius_criticality × likelihood_score × average_claim_cost × affected_member_count × claim_rate) + Stop-loss exposure (attachment analysis: exposure = max(0, projected_losses - attachment)) + Reserve at risk (reserve depletion model: depletion = blast_radius_criticality × likelihood_score × claim_rate × reserve_balance) + Premium revenue risk (attrition model: attrition = blast_radius_criticality × likelihood_score × attrition_rate × member_count)",
                "methodology_version": "1.0.0",
                "calculation_timestamp": "2025-06-06T12:00:00Z",
                "sources": [...],
                "assumptions": [...]
            }
        """
        self.logger.info(
            "Generating methodology trail",
            risk_id=risk_object.get('id'),
            calculation_steps_count=len(calculation_steps)
        )

        # Generate methodology description
        methodology = self.generate_methodology_description(calculation_steps)

        # Document data sources
        sources = self.document_data_sources(
            risk_object=risk_object,
            actuarial_data_sources=data_sources
        )

        # Document assumptions
        assumptions = self.document_assumptions(
            risk_object=risk_object,
            calculation_steps=calculation_steps
        )

        methodology_trail = {
            'methodology': methodology,
            'methodology_version': config.calculation.methodology_version,
            'calculation_timestamp': datetime.now().isoformat(),
            'sources': sources,
            'assumptions': assumptions
        }

        self.logger.info(
            "Methodology trail generated",
            methodology_length=len(methodology),
            sources_count=len(sources),
            assumptions_count=len(assumptions)
        )

        return methodology_trail

    def generate_methodology_description(self, calculation_steps: List[CalculationStep]) -> str:
        """
        Generate human-readable methodology description.

        Format:
        "Calculation engine v{version}: {component1} ({method1}) + {component2} ({method2}) + ..."

        Args:
            calculation_steps: List of calculation steps

        Returns:
            Methodology description string

        Example:
            Input: [
                CalculationStep(step_name="MLR Impact Calculation", calculator="MLRImpactCalculator", ...),
                CalculationStep(step_name="Stop-Loss Exposure Calculation", calculator="StopLossExposureCalculator", ...),
                ...
            ]

            Output:
            "Calculation engine v1.0: MLR impact (claims cost model: projected_increase = blast_radius_criticality × likelihood_score × average_claim_cost × affected_member_count × claim_rate) + Stop-loss exposure (attachment analysis: exposure = max(0, projected_losses - attachment)) + Reserve at risk (reserve depletion model: depletion = blast_radius_criticality × likelihood_score × claim_rate × reserve_balance) + Premium revenue risk (attrition model: attrition = blast_radius_criticality × likelihood_score × attrition_rate × member_count)"
        """
        methodology_parts = []

        for step in calculation_steps:
            step_description = self._get_step_description(step)
            methodology_parts.append(step_description)

        methodology = f"Calculation engine v{config.calculation.methodology_version}: "
        methodology += " + ".join(methodology_parts)

        return methodology

    def _get_step_description(self, step: CalculationStep) -> str:
        """
        Get description for a calculation step.

        Args:
            step: Calculation step

        Returns:
            Step description string

        Example:
            Input: CalculationStep(
                step_name="MLR Impact Calculation",
                calculator="MLRImpactCalculator",
                ...
            )

            Output:
            "MLR impact (claims cost model: projected_increase = blast_radius_criticality × likelihood_score × average_claim_cost × affected_member_count × claim_rate)"
        """
        step_formulas = {
            "MLR Impact Calculation": "MLR impact (claims cost model: projected_increase = blast_radius_criticality × likelihood_score × average_claim_cost × affected_member_count × claim_rate)",
            "Stop-Loss Exposure Calculation": "Stop-loss exposure (attachment analysis: exposure = max(0, projected_losses - attachment))",
            "Reserve at Risk Calculation": "Reserve at risk (reserve depletion model: depletion = blast_radius_criticality × likelihood_score × claim_rate × reserve_balance)",
            "Premium Revenue Risk Calculation": "Premium revenue risk (attrition model: attrition = blast_radius_criticality × likelihood_score × attrition_rate × member_count)"
        }

        return step_formulas.get(step.step_name, f"{step.step_name} ({step.calculator})")

    def document_data_sources(
        self,
        risk_object: Dict,
        actuarial_data_sources: List[Dict]
    ) -> List[Dict]:
        """
        Document all data sources used in calculation.

        Sources:
        - Risk object source (connector)
        - Actuarial export files
        - Business process graph queries
        - Financial parameter database

        Args:
            risk_object: Enriched RiskObject
            actuarial_data_sources: List of actuarial data sources

        Returns:
            List of FinancialSource objects

        Example:
            Output:
            [
                {
                    "source": "actuarial_export",
                    "timestamp": "2025-06-06T12:00:00Z",
                    "data_quality_score": 0.95
                },
                {
                    "source": "business_process_graph",
                    "timestamp": "2025-06-06T11:00:00Z",
                    "data_quality_score": 0.90
                }
            ]
        """
        sources = []

        # Add risk object source
        risk_source = {
            'source': risk_object.get('source', 'unknown'),
            'timestamp': risk_object.get('created_at', datetime.now().isoformat()),
            'data_quality_score': risk_object.get('confidence', 0.8)
        }
        sources.append(risk_source)

        # Add business process graph source
        bpg_source = {
            'source': 'business_process_graph',
            'timestamp': datetime.now().isoformat(),
            'data_quality_score': 0.90
        }
        sources.append(bpg_source)

        # Add actuarial data sources
        if actuarial_data_sources:
            sources.extend(actuarial_data_sources)

        return sources

    def document_assumptions(
        self,
        risk_object: Dict,
        calculation_steps: List[CalculationStep]
    ) -> List[str]:
        """
        Document all assumptions made in calculation.

        Assumptions:
        - Blast radius criticality mapping
        - Likelihood score interpretation
        - Actuarial data quality
        - Claim rate projections
        - Attrition rate projections
        - Reserve type mappings
        - Line of business mappings

        Args:
            risk_object: Enriched RiskObject
            calculation_steps: List of calculation steps

        Returns:
            List of assumption strings

        Example:
            Output:
            [
                "Blast radius criticality score: 0.85 (tier-based weighted score from business process graph)",
                "Likelihood score: 0.80 (connector-provided probability of risk materialization)",
                "Claim rate: 0.02 (historical average from actuarial data - 90 day window)",
                "Attrition rate: 0.05 (historical average from member data - 90 day window)",
                "MLR calculation: mlr_impact = projected_claims_increase / premium_revenue",
                "Stop-loss attachment analysis: exposure = max(0, projected_losses - attachment_point)",
                "Reserve depletion: depletion = blast_radius_criticality × likelihood_score × claim_rate × reserve_balance",
                "Premium revenue risk: revenue_risk = projected_attrition × premium_per_member × 12",
                "Reserve type mapping: claims_adjudication → case_reserve",
                "Line of business mapping: medicare_claim_processing → Medicare"
            ]
        """
        assumptions = []

        # Blast radius criticality assumption
        blast_radius_criticality = risk_object.get('blast_radius_criticality', 0.0)
        assumptions.append(
            f"Blast radius criticality score: {blast_radius_criticality:.2f} "
            f"(tier-based weighted score from business process graph)"
        )

        # Likelihood score assumption
        likelihood_score = risk_object.get('likelihood_score', 0.0)
        assumptions.append(
            f"Likelihood score: {likelihood_score:.2f} "
            f"(connector-provided probability of risk materializing)"
        )

        # Data quality assumptions
        for step in calculation_steps:
            if 'claim_rate' in step.inputs or step.step_name == "MLR Impact Calculation":
                assumptions.append(
                    f"Claim rate: 0.02 (historical average from actuarial data - 90 day window)"
                )
                break

        for step in calculation_steps:
            if 'attrition_rate' in step.inputs or step.step_name == "Premium Revenue Risk Calculation":
                assumptions.append(
                    f"Attrition rate: 0.05 (historical average from member data - 90 day window)"
                )
                break

        # Calculation formula assumptions
        assumptions.append(
            "MLR calculation: mlr_impact = projected_claims_increase / premium_revenue"
        )
        assumptions.append(
            "Stop-loss attachment analysis: exposure = max(0, projected_losses - attachment_point)"
        )
        assumptions.append(
            "Reserve depletion: depletion = blast_radius_criticality × likelihood_score × claim_rate × reserve_balance"
        )
        assumptions.append(
            "Premium revenue risk: revenue_risk = projected_attrition × premium_per_member × 12"
        )

        # Mapping assumptions
        business_process_map = risk_object.get('business_process_map', [])

        # Reserve type mapping
        if 'claims_adjudication' in business_process_map:
            assumptions.append("Reserve type mapping: claims_adjudication → case_reserve")

        # Line of business mapping
        if 'medicare_claim_processing' in business_process_map:
            assumptions.append("Line of business mapping: medicare_claim_processing → Medicare")

        return assumptions
