"""
CFO Trend Analyzer

Tracks financial exposure changes over time for health plan executives.
Identifies patterns, trends, and anomalies in financial risk data.

Author: AI/ML Engineer (T-MVP-008)
Date: 2025-06-06
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from collections import defaultdict

logger = logging.getLogger(__name__)


class CFOTrendAnalyzer:
    """
    Analyzes financial exposure trends for CFO Agent.

    Key Capabilities:
    - Track exposure trends over 30, 60, 90 day periods
    - Identify emerging financial risks
    - Calculate trend velocity (rate of change)
    - Compare current vs previous periods
    - Detect anomalous spikes in exposure
    - Generate trend insights
    """

    def __init__(self):
        """Initialize CFO Trend Analyzer."""
        self.logger = logger

    def analyze_trends(
        self,
        financial_impacts: List[Dict[str, Any]],
        historical_impacts: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Perform comprehensive trend analysis on financial impacts.

        Args:
            financial_impacts: Current financial impacts
            historical_impacts: Optional historical impacts for comparison

        Returns:
            Trend analysis with insights and anomalies
        """
        self.logger.info(f"Analyzing trends for {len(financial_impacts)} impacts")

        try:
            # Calculate period trends
            period_trends = self._calculate_period_trends(financial_impacts)

            # Identify emerging risks (increasing exposure)
            emerging_risks = self._identify_emerging_risks(financial_impacts)

            # Calculate trend velocity
            trend_velocity = self._calculate_trend_velocity(financial_impacts)

            # Detect anomalous spikes
            anomalies = self._detect_anomalies(financial_impacts)

            # Generate trend insights
            insights = self._generate_trend_insights(
                period_trends,
                emerging_risks,
                trend_velocity,
                anomalies
            )

            # Compare with historical data if available
            historical_comparison = None
            if historical_impacts:
                historical_comparison = self._compare_historical(
                    financial_impacts,
                    historical_impacts
                )

            # Build trend analysis result
            analysis = {
                "period_trends": period_trends,
                "emerging_risks": emerging_risks,
                "trend_velocity": trend_velocity,
                "anomalies": anomalies,
                "insights": insights,
                "historical_comparison": historical_comparison,
                "analyzed_at": datetime.utcnow().isoformat()
            }

            self.logger.info(
                f"Trend analysis complete: {len(emerging_risks)} emerging risks, "
                f"{len(anomalies)} anomalies detected"
            )

            return analysis

        except Exception as e:
            self.logger.error(f"Error analyzing trends: {e}")
            raise

    def _calculate_period_trends(
        self,
        financial_impacts: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Calculate exposure trends by time period.

        Groups impacts by time_horizon and calculates totals.
        """
        period_data = {
            "immediate": {"exposure": 0.0, "count": 0},
            "30-days": {"exposure": 0.0, "count": 0},
            "90-days": {"exposure": 0.0, "count": 0}
        }

        for fi in financial_impacts:
            horizon = fi.get("time_horizon", "90-days")
            exposure = fi.get("net_exposure", 0)

            if horizon in period_data:
                period_data[horizon]["exposure"] += exposure
                period_data[horizon]["count"] += 1

        # Round and format
        period_trends = {}
        for horizon, data in period_data.items():
            period_trends[horizon] = {
                "exposure": round(data["exposure"], 2),
                "count": data["count"]
            }

        return period_trends

    def _identify_emerging_risks(
        self,
        financial_impacts: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Identify emerging financial risks (increasing exposure).

        A risk is "emerging" if:
        - High likelihood (>60%)
        - Significant exposure (>$100K)
        - Immediate or 30-day time horizon
        """
        emerging = []

        for fi in financial_impacts:
            likelihood = fi.get("likelihood", 0)
            exposure = fi.get("net_exposure", 0)
            time_horizon = fi.get("time_horizon", "90-days")

            # Emerging risk criteria
            if likelihood >= 0.6 and exposure >= 100000 and time_horizon in ["immediate", "30-days"]:
                emerging.append({
                    "title": fi.get("risk_title", "Unknown"),
                    "business_process": fi.get("business_process", "Unknown"),
                    "exposure": exposure,
                    "likelihood": likelihood,
                    "time_horizon": time_horizon,
                    "mlr_impact": fi.get("mlr_impact", 0),
                    "urgency": self._calculate_urgency(likelihood, exposure, time_horizon)
                })

        # Sort by exposure descending
        emerging.sort(key=lambda x: x["exposure"], reverse=True)

        return emerging

    def _calculate_urgency(self, likelihood: float, exposure: float, time_horizon: str) -> str:
        """
        Calculate urgency level for emerging risk.

        Returns: 'critical', 'high', 'medium', 'low'
        """
        # Critical: high likelihood + high exposure + immediate
        if likelihood >= 0.8 and exposure >= 500000 and time_horizon == "immediate":
            return "critical"

        # High: high likelihood + significant exposure
        if likelihood >= 0.7 and exposure >= 250000:
            return "high"

        # Medium: moderate likelihood + exposure
        if likelihood >= 0.6 and exposure >= 100000:
            return "medium"

        # Low
        return "low"

    def _calculate_trend_velocity(
        self,
        financial_impacts: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Calculate trend velocity (rate of change indicators).

        Estimates how quickly exposure might change based on risk attributes.
        """
        # Calculate aggregate velocity indicators
        total_exposure = sum(fi.get("net_exposure", 0) for fi in financial_impacts)

        # High-velocity risks: immediate horizon + high likelihood
        high_velocity_count = sum(
            1 for fi in financial_impacts
            if fi.get("time_horizon") == "immediate" and fi.get("likelihood", 0) >= 0.7
        )

        # Medium-velocity risks: 30-day horizon
        medium_velocity_count = sum(
            1 for fi in financial_impacts
            if fi.get("time_horizon") == "30-days"
        )

        # Calculate velocity score (0-100)
        velocity_score = 0
        if len(financial_impacts) > 0:
            high_velocity_ratio = high_velocity_count / len(financial_impacts)
            medium_velocity_ratio = medium_velocity_count / len(financial_impacts)
            velocity_score = (high_velocity_ratio * 70) + (medium_velocity_ratio * 30)

        return {
            "velocity_score": round(velocity_score, 1),
            "high_velocity_risks": high_velocity_count,
            "medium_velocity_risks": medium_velocity_count,
            "total_exposure": round(total_exposure, 2),
            "interpretation": self._interpret_velocity(velocity_score)
        }

    def _interpret_velocity(self, velocity_score: float) -> str:
        """Interpret velocity score."""
        if velocity_score >= 70:
            return "Rapid exposure change expected (high-velocity risks dominate)"
        elif velocity_score >= 40:
            return "Moderate exposure change expected"
        elif velocity_score >= 20:
            return "Slow exposure change expected"
        else:
            return "Stable exposure profile (long-term risks dominate)"

    def _detect_anomalies(
        self,
        financial_impacts: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Detect anomalous spikes in exposure.

        An anomaly is:
        - Exposure > $1M AND likelihood > 80%
        - OR Exposure > 3x median exposure
        """
        if not financial_impacts:
            return []

        # Calculate median exposure
        exposures = [fi.get("net_exposure", 0) for fi in financial_impacts]
        exposures_sorted = sorted(exposures)
        median_exposure = exposures_sorted[len(exposures_sorted) // 2]

        # Detect anomalies
        anomalies = []
        for fi in financial_impacts:
            exposure = fi.get("net_exposure", 0)
            likelihood = fi.get("likelihood", 0)

            # Anomaly criteria
            is_anomaly = (
                (exposure > 1000000 and likelihood > 0.8) or
                (exposure > median_exposure * 3)
            )

            if is_anomaly:
                anomalies.append({
                    "title": fi.get("risk_title", "Unknown"),
                    "business_process": fi.get("business_process", "Unknown"),
                    "exposure": exposure,
                    "likelihood": likelihood,
                    "anomaly_type": self._classify_anomaly(exposure, likelihood, median_exposure),
                    "difference_from_median": exposure - median_exposure
                })

        # Sort by exposure descending
        anomalies.sort(key=lambda x: x["exposure"], reverse=True)

        return anomalies

    def _classify_anomaly(self, exposure: float, likelihood: float, median: float) -> str:
        """Classify anomaly type."""
        if exposure > 1000000 and likelihood > 0.8:
            return "high_impact_high_probability"
        elif exposure > median * 5:
            return "extreme_outlier"
        elif exposure > median * 3:
            return "significant_outlier"
        else:
            return "unusual"

    def _compare_historical(
        self,
        current_impacts: List[Dict[str, Any]],
        historical_impacts: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Compare current exposure with historical baseline.

        Args:
            current_impacts: Current financial impacts
            historical_impacts: Historical financial impacts (previous period)

        Returns:
            Historical comparison analysis
        """
        # Calculate totals
        current_total = sum(fi.get("net_exposure", 0) for fi in current_impacts)
        historical_total = sum(fi.get("net_exposure", 0) for fi in historical_impacts)

        # Calculate change
        change = current_total - historical_total
        change_percent = (change / historical_total * 100) if historical_total > 0 else 0

        # Determine trend direction
        if change > 0:
            direction = "increasing"
            significance = self._assess_increase_significance(change_percent)
        elif change < 0:
            direction = "decreasing"
            significance = self._assess_decrease_significance(change_percent)
        else:
            direction = "stable"
            significance = "no_change"

        # Compare risk counts
        current_count = len(current_impacts)
        historical_count = len(historical_impacts)
        count_change = current_count - historical_count

        return {
            "current_exposure": round(current_total, 2),
            "historical_exposure": round(historical_total, 2),
            "change": round(change, 2),
            "change_percent": round(change_percent, 2),
            "direction": direction,
            "significance": significance,
            "current_risk_count": current_count,
            "historical_risk_count": historical_count,
            "risk_count_change": count_change,
            "compared_at": datetime.utcnow().isoformat()
        }

    def _assess_increase_significance(self, change_percent: float) -> str:
        """Assess significance of exposure increase."""
        if change_percent >= 50:
            return "major_increase"
        elif change_percent >= 20:
            return "moderate_increase"
        elif change_percent >= 5:
            return "minor_increase"
        else:
            return "negligible_increase"

    def _assess_decrease_significance(self, change_percent: float) -> str:
        """Assess significance of exposure decrease."""
        if change_percent <= -50:
            return "major_decrease"
        elif change_percent <= -20:
            return "moderate_decrease"
        elif change_percent <= -5:
            return "minor_decrease"
        else:
            return "negligible_decrease"

    def _generate_trend_insights(
        self,
        period_trends: Dict[str, Any],
        emerging_risks: List[Dict[str, Any]],
        trend_velocity: Dict[str, Any],
        anomalies: List[Dict[str, Any]]
    ) -> List[str]:
        """Generate trend insights for executive briefings."""
        insights = []

        # Period trend insights
        immediate_exposure = period_trends.get("immediate", {}).get("exposure", 0)
        thirty_day_exposure = period_trends.get("30-days", {}).get("exposure", 0)

        if immediate_exposure > 1000000:
            insights.append(
                f"CRITICAL: ${immediate_exposure:,.0f} in immediate exposure requires urgent attention"
            )

        if thirty_day_exposure > immediate_exposure * 2:
            insights.append(
                f"ACCUMULATING RISK: 30-day exposure (${thirty_day_exposure:,.0f}) "
                f"is {int(thirty_day_exposure / immediate_exposure)}x immediate exposure"
            )

        # Emerging risk insights
        critical_emerging = [r for r in emerging_risks if r.get("urgency") == "critical"]
        if critical_emerging:
            insights.append(
                f"EMERGING THREATS: {len(critical_emerging)} critical risks require "
                f"immediate mitigation to prevent MLR impact"
            )

        # Trend velocity insights
        velocity_score = trend_velocity.get("velocity_score", 0)
        if velocity_score >= 70:
            insights.append(
                "HIGH VELOCITY: Exposure profile changing rapidly - recommend weekly "
                "monitoring and accelerated mitigation"
            )
        elif velocity_score >= 40:
            insights.append(
                "MODERATE VELOCITY: Exposure changing - recommend bi-weekly monitoring"
            )

        # Anomaly insights
        if anomalies:
            high_impact_anomalies = [
                a for a in anomalies
                if a.get("anomaly_type") in ["high_impact_high_probability", "extreme_outlier"]
            ]
            if high_impact_anomalies:
                insights.append(
                    f"ANOMALIES DETECTED: {len(high_impact_anomalies)} outlier risks require "
                    f"individual review - may indicate systemic issues"
                )

        # Add forward-looking insight
        total_exposure = trend_velocity.get("total_exposure", 0)
        if total_exposure > 5000000:
            insights.append(
                f"TOTAL EXPOSURE: ${total_exposure:,.0f} represents significant "
                f"financial risk - prioritize top 3 risks for immediate mitigation"
            )

        return insights

    def forecast_exposure(
        self,
        financial_impacts: List[Dict[str, Any]],
        forecast_days: int = 30
    ) -> Dict[str, Any]:
        """
        Forecast exposure trend over future period.

        Uses current risk profile to estimate future exposure.
        """
        self.logger.info(f"Forecasting exposure for {forecast_days} days")

        try:
            # Calculate current exposure
            current_exposure = sum(fi.get("net_exposure", 0) for fi in financial_impacts)

            # Estimate growth based on immediate risks
            immediate_exposure = sum(
                fi.get("net_exposure", 0)
                for fi in financial_impacts
                if fi.get("time_horizon") == "immediate"
            )

            # Estimate accumulation from 30-day risks
            thirty_day_exposure = sum(
                fi.get("net_exposure", 0)
                for fi in financial_impacts
                if fi.get("time_horizon") == "30-days"
            )

            # Simple linear forecast (conservative)
            daily_accumulation_rate = thirty_day_exposure / 30
            forecast_increase = daily_accumulation_rate * forecast_days
            forecast_exposure = current_exposure + forecast_increase

            # Calculate confidence bounds
            confidence_lower = forecast_exposure * 0.8  # 80% confidence lower
            confidence_upper = forecast_exposure * 1.2  # 120% confidence upper

            return {
                "current_exposure": round(current_exposure, 2),
                "forecast_days": forecast_days,
                "forecast_exposure": round(forecast_exposure, 2),
                "forecast_increase": round(forecast_increase, 2),
                "confidence_interval": {
                    "lower": round(confidence_lower, 2),
                    "upper": round(confidence_upper, 2)
                },
                "methodology": "Linear projection based on 30-day risk accumulation rate",
                "forecast_generated_at": datetime.utcnow().isoformat()
            }

        except Exception as e:
            self.logger.error(f"Error forecasting exposure: {e}")
            raise
