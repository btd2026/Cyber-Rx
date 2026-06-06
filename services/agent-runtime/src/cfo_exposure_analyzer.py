"""
CFO Dollar Exposure Analyzer

Calculates comprehensive financial exposure metrics for health plan executives.
Provides detailed breakdowns with methodology trails.

Author: AI/ML Engineer (T-MVP-008)
Date: 2025-06-06
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from decimal import Decimal

logger = logging.getLogger(__name__)


class CFOExposureAnalyzer:
    """
    Analyzes dollar exposure for health plan financial risks.

    Key Capabilities:
    - Calculate total exposure by business process
    - Break down exposure by cost category
    - Calculate MLR impact
    - Calculate net exposure after insurance
    - Generate methodology trails
    - Support scenario analysis
    """

    def __init__(self):
        """Initialize CFO Exposure Analyzer."""
        self.logger = logger

    def analyze_exposure(
        self,
        financial_impacts: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Perform comprehensive exposure analysis on financial impacts.

        Args:
            financial_impacts: List of financial impact objects

        Returns:
            Complete exposure analysis with methodology trails
        """
        self.logger.info(f"Analyzing exposure for {len(financial_impacts)} impacts")

        try:
            # Calculate total exposure
            total_exposure = self._calculate_total_exposure(financial_impacts)

            # Break down by business process
            by_business_process = self._breakdown_by_business_process(financial_impacts)

            # Break down by risk category
            by_risk_category = self._breakdown_by_risk_category(financial_impacts)

            # Break down by cost category
            by_cost_category = self._breakdown_by_cost_category(financial_impacts)

            # Break down by time horizon
            by_time_horizon = self._breakdown_by_time_horizon(financial_impacts)

            # MLR impact analysis
            mlr_impact_analysis = self._analyze_mlr_impact(financial_impacts)

            # Top risks by exposure
            top_risks = self._identify_top_risks(financial_impacts, limit=10)

            # Generate methodology trail
            methodology_trail = self._generate_methodology_trail(
                financial_impacts,
                total_exposure,
                by_business_process,
                by_cost_category
            )

            # Build analysis result
            analysis = {
                "total_exposure": total_exposure,
                "by_business_process": by_business_process,
                "by_risk_category": by_risk_category,
                "by_cost_category": by_cost_category,
                "by_time_horizon": by_time_horizon,
                "mlr_impact_analysis": mlr_impact_analysis,
                "top_risks": top_risks,
                "methodology_trail": methodology_trail,
                "analyzed_at": datetime.utcnow().isoformat()
            }

            self.logger.info(
                f"Exposure analysis complete: ${total_exposure:,.2f} total exposure"
            )

            return analysis

        except Exception as e:
            self.logger.error(f"Error analyzing exposure: {e}")
            raise

    def analyze_scenario(
        self,
        financial_impacts: List[Dict[str, Any]],
        scenario_type: str,
        scenario_multiplier: float
    ) -> Dict[str, Any]:
        """
        Analyze exposure under a specific threat scenario.

        Args:
            financial_impacts: List of financial impact objects
            scenario_type: Scenario type ('ransomware', 'data_breach', etc.)
            scenario_multiplier: Impact multiplier for this scenario

        Returns:
            Scenario exposure analysis
        """
        self.logger.info(f"Analyzing {scenario_type} scenario (x{scenario_multiplier})")

        try:
            # Apply scenario multiplier to each impact
            scenario_impacts = []
            for impact in financial_impacts:
                scenario_impact = impact.copy()

                # Multiply exposure by scenario multiplier
                original_exposure = scenario_impact.get("net_exposure", 0)
                scenario_exposure = original_exposure * scenario_multiplier

                scenario_impact["original_exposure"] = original_exposure
                scenario_impact["scenario_exposure"] = scenario_exposure
                scenario_impact["scenario_increase"] = scenario_exposure - original_exposure
                scenario_impact["scenario_type"] = scenario_type

                scenario_impacts.append(scenario_impact)

            # Analyze scenario impacts
            scenario_analysis = self.analyze_exposure(scenario_impacts)

            # Add scenario-specific fields
            scenario_analysis["scenario_type"] = scenario_type
            scenario_analysis["scenario_multiplier"] = scenario_multiplier
            scenario_analysis["baseline_exposure"] = sum(
                fi.get("net_exposure", 0) for fi in financial_impacts
            )
            scenario_analysis["scenario_exposure"] = scenario_analysis["total_exposure"]
            scenario_analysis["exposure_increase"] = (
                scenario_analysis["scenario_exposure"] -
                scenario_analysis["baseline_exposure"]
            )
            scenario_analysis["increase_percentage"] = (
                (scenario_analysis["exposure_increase"] /
                 scenario_analysis["baseline_exposure"] * 100)
                if scenario_analysis["baseline_exposure"] > 0
                else 0
            )

            self.logger.info(
                f"Scenario analysis complete: ${scenario_analysis['exposure_increase']:,.2f} increase "
                f"({scenario_analysis['increase_percentage']:.1f}%)"
            )

            return scenario_analysis

        except Exception as e:
            self.logger.error(f"Error analyzing scenario: {e}")
            raise

    def _calculate_total_exposure(self, financial_impacts: List[Dict[str, Any]]) -> float:
        """Calculate total net exposure across all impacts."""
        total = sum(fi.get("net_exposure", 0) for fi in financial_impacts)
        return round(total, 2)

    def _breakdown_by_business_process(
        self,
        financial_impacts: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Break down exposure by business process."""
        process_data = {}

        for fi in financial_impacts:
            process = fi.get("business_process", "Unknown")
            exposure = fi.get("net_exposure", 0)
            mlr_impact = fi.get("mlr_impact", 0)
            likelihood = fi.get("likelihood", 0)

            if process not in process_data:
                process_data[process] = {
                    "process": process,
                    "exposure": 0.0,
                    "mlr_impact": 0.0,
                    "likelihood": 0.0,
                    "count": 0
                }

            process_data[process]["exposure"] += exposure
            process_data[process]["mlr_impact"] += mlr_impact
            process_data[process]["likelihood"] += likelihood
            process_data[process]["count"] += 1

        # Calculate averages and format
        breakdown = []
        for process in process_data.values():
            process["exposure"] = round(process["exposure"], 2)
            process["mlr_impact"] = round(process["mlr_impact"], 2)
            process["likelihood"] = round(
                process["likelihood"] / process["count"], 3
            ) if process["count"] > 0 else 0.0
            breakdown.append(process)

        # Sort by exposure descending
        breakdown.sort(key=lambda x: x["exposure"], reverse=True)

        return breakdown

    def _breakdown_by_risk_category(
        self,
        financial_impacts: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Break down exposure by risk category."""
        category_data = {}

        for fi in financial_impacts:
            category = fi.get("risk_category", "Unknown")
            exposure = fi.get("net_exposure", 0)

            if category not in category_data:
                category_data[category] = {
                    "category": category,
                    "exposure": 0.0,
                    "count": 0
                }

            category_data[category]["exposure"] += exposure
            category_data[category]["count"] += 1

        # Format and sort
        breakdown = []
        for category in category_data.values():
            category["exposure"] = round(category["exposure"], 2)
            breakdown.append(category)

        breakdown.sort(key=lambda x: x["exposure"], reverse=True)

        return breakdown

    def _breakdown_by_cost_category(
        self,
        financial_impacts: List[Dict[str, Any]]
    ) -> Dict[str, float]:
        """Break down exposure by cost category."""
        cost_categories = {
            "breach_response_cost": 0.0,
            "regulatory_fine": 0.0,
            "business_interruption": 0.0,
            "fraud_loss": 0.0,
            "reputational_loss": 0.0,
            "legal_cost": 0.0,
            "recovery_cost": 0.0,
            "insurance_coverage": 0.0
        }

        for fi in financial_impacts:
            for category in cost_categories.keys():
                cost_categories[category] += fi.get(category, 0)

        # Round all values
        for category in cost_categories:
            cost_categories[category] = round(cost_categories[category], 2)

        return cost_categories

    def _breakdown_by_time_horizon(
        self,
        financial_impacts: List[Dict[str, Any]]
    ) -> Dict[str, float]:
        """Break down exposure by time horizon."""
        time_horizons = {
            "immediate": 0.0,
            "30-days": 0.0,
            "90-days": 0.0
        }

        for fi in financial_impacts:
            horizon = fi.get("time_horizon", "90-days")
            exposure = fi.get("net_exposure", 0)

            if horizon in time_horizons:
                time_horizons[horizon] += exposure

        # Round all values
        for horizon in time_horizons:
            time_horizons[horizon] = round(time_horizons[horizon], 2)

        return time_horizons

    def _analyze_mlr_impact(
        self,
        financial_impacts: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze MLR (Medical Loss Ratio) impact."""
        # Calculate total MLR impact
        total_mlr_impact = sum(fi.get("mlr_impact", 0) for fi in financial_impacts)

        # Identify top MLR risks
        mlr_risks = []
        for fi in financial_impacts:
            if fi.get("mlr_impact", 0) > 0:
                mlr_risks.append({
                    "process": fi.get("business_process", "Unknown"),
                    "mlr_impact": fi.get("mlr_impact", 0),
                    "exposure": fi.get("net_exposure", 0),
                    "risk_title": fi.get("risk_title", "Unknown")
                })

        # Sort by MLR impact descending
        mlr_risks.sort(key=lambda x: x["mlr_impact"], reverse=True)

        return {
            "total_mlr_impact": round(total_mlr_impact, 2),
            "top_ml_risks": mlr_risks[:10]
        }

    def _identify_top_risks(
        self,
        financial_impacts: List[Dict[str, Any]],
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Identify top risks by exposure."""
        # Sort by net exposure descending
        sorted_impacts = sorted(
            financial_impacts,
            key=lambda x: x.get("net_exposure", 0),
            reverse=True
        )

        # Format top risks
        top_risks = []
        for rank, fi in enumerate(sorted_impacts[:limit], start=1):
            risk = {
                "rank": rank,
                "title": fi.get("risk_title", "Unknown"),
                "exposure": fi.get("net_exposure", 0),
                "mlr_impact": fi.get("mlr_impact", 0),
                "likelihood": fi.get("likelihood", 0),
                "business_process": fi.get("business_process", "Unknown"),
                "risk_category": fi.get("risk_category", "Unknown"),
                "time_horizon": fi.get("time_horizon", "90-days")
            }
            top_risks.append(risk)

        return top_risks

    def _generate_methodology_trail(
        self,
        financial_impacts: List[Dict[str, Any]],
        total_exposure: float,
        by_business_process: List[Dict[str, Any]],
        by_cost_category: Dict[str, float]
    ) -> List[str]:
        """Generate methodology trail for transparency."""
        trail = [
            f"Data Source: {len(financial_impacts)} financial impacts from T-MVP-006",
            f"Total Net Exposure: ${total_exposure:,.2f} (sum of all net_exposure fields)",
            "",
            "Cost Category Breakdown Methodology:",
            f"  - Breach Response Costs: ${by_cost_category['breach_response_cost']:,.2f}",
            f"  - Regulatory Fines: ${by_cost_category['regulatory_fine']:,.2f}",
            f"  - Business Interruption: ${by_cost_category['business_interruption']:,.2f}",
            f"  - Fraud Loss: ${by_cost_category['fraud_loss']:,.2f}",
            f"  - Reputational Loss: ${by_cost_category['reputational_loss']:,.2f}",
            f"  - Legal Costs: ${by_cost_category['legal_cost']:,.2f}",
            f"  - Recovery Costs: ${by_cost_category['recovery_cost']:,.2f}",
            f"  - Insurance Coverage: ${by_cost_category['insurance_coverage']:,.2f}",
            "",
            "MLR Impact Calculation:",
            "  - Formula: (Net Exposure / $1M) × 1% = MLR Impact %",
            "  - Assumption: $1M exposure = 1% MLR impact for mid-sized health plan",
            "  - Cap: Maximum 10% MLR impact per risk",
            "",
            "Stop-Loss Exposure Calculation:",
            "  - Formula: Business Interruption × 30% = Stop-Loss Exposure",
            "  - Assumption: 30% of business interruption affects reinsurance position",
            "",
            "Reserve-at-Risk Calculation:",
            "  - Formula: (Fraud Loss + Legal Costs) × 50% = Reserve at Risk",
            "  - Assumption: 50% of fraud + legal costs deplete reserves",
            "",
            "Premium Revenue Risk Calculation:",
            "  - Formula: Reputational Loss × 20% = Premium Revenue Risk",
            "  - Assumption: 20% of reputational loss translates to member attrition",
            "",
            "Time Horizon Estimation:",
            "  - Immediate: Ransomware, Malware, Outage, Disruption",
            "  - 30-days: Data Breach, Fraud, Theft",
            "  - 90-days: All other categories",
            "",
            "Data Freshness: " + datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"),
            "Confidence Level: 85% (based on likelihood score estimates)"
        ]

        return trail

    def compare_exposure(
        self,
        current_impacts: List[Dict[str, Any]],
        previous_impacts: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Compare exposure between two time periods.

        Args:
            current_impacts: Current financial impacts
            previous_impacts: Previous financial impacts (for comparison)

        Returns:
            Exposure comparison analysis
        """
        self.logger.info("Comparing current vs previous exposure")

        try:
            # Calculate totals
            current_total = sum(fi.get("net_exposure", 0) for fi in current_impacts)
            previous_total = sum(fi.get("net_exposure", 0) for fi in previous_impacts)

            # Calculate change
            change = current_total - previous_total
            change_percent = (change / previous_total * 100) if previous_total > 0 else 0

            # Determine trend
            if change > 0:
                trend = "increasing"
            elif change < 0:
                trend = "decreasing"
            else:
                trend = "stable"

            return {
                "current_exposure": round(current_total, 2),
                "previous_exposure": round(previous_total, 2),
                "change": round(change, 2),
                "change_percent": round(change_percent, 2),
                "trend": trend,
                "compared_at": datetime.utcnow().isoformat()
            }

        except Exception as e:
            self.logger.error(f"Error comparing exposure: {e}")
            raise
