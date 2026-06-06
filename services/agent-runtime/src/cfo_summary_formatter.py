"""
CFO Board-Ready Summary Formatter

Transforms CFO agent outputs into executive-friendly formats for board meetings.
Ensures all briefings are clear, concise, and actionable.

Author: AI/ML Engineer (T-MVP-008)
Date: 2025-06-06
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
import json

logger = logging.getLogger(__name__)


class CFOSummaryFormatter:
    """
    Formats CFO agent briefings for board presentation.

    Key Capabilities:
    - Format briefings for board presentation
    - Generate executive summaries (2-3 sentences)
    - Create clear visual breakdowns (tables, charts)
    - Highlight key metrics and recommendations
    - Ensure methodology trails are clear and auditable
    - Support multiple output formats (JSON, Markdown, PDF-ready)
    """

    def __init__(self):
        """Initialize CFO Summary Formatter."""
        self.logger = logger

    def format_for_frontend(
        self,
        briefing: Dict[str, Any],
        format_type: str = "json"
    ) -> Dict[str, Any]:
        """
        Format briefing for frontend consumption.

        Args:
            briefing: Raw briefing from Claude LLM
            format_type: Output format ('json', 'markdown', 'summary')

        Returns:
            Formatted briefing ready for frontend
        """
        self.logger.info(f"Formatting briefing for frontend (format={format_type})")

        try:
            if format_type == "json":
                return self._format_json(briefing)
            elif format_type == "markdown":
                return self._format_markdown(briefing)
            elif format_type == "summary":
                return self._format_summary(briefing)
            else:
                raise ValueError(f"Unknown format type: {format_type}")

        except Exception as e:
            self.logger.error(f"Error formatting briefing: {e}")
            return self._generate_error_response(e)

    def _format_json(self, briefing: Dict[str, Any]) -> Dict[str, Any]:
        """
        Format briefing as structured JSON for frontend.

        Includes metadata, formatted metrics, and visual breakdowns.
        """
        # Extract key fields
        briefing_summary = briefing.get("briefing_summary", "")
        exposure_breakdown = briefing.get("exposure_breakdown", {})
        mlr_impact_analysis = briefing.get("mlr_impact_analysis", {})
        top_risks = briefing.get("top_risks", [])
        trends = briefing.get("trends", [])
        methodology_trail = briefing.get("methodology_trail", [])
        recommendations = briefing.get("recommendations", [])

        # Format for frontend
        formatted = {
            "metadata": {
                "generated_at": datetime.utcnow().isoformat(),
                "agent_type": "cfo",
                "format": "board_ready_briefing",
                "version": "1.0"
            },
            "executive_summary": {
                "summary": briefing_summary,
                "total_exposure": exposure_breakdown.get("total_exposure", 0),
                "total_exposure_formatted": self._format_currency(
                    exposure_breakdown.get("total_exposure", 0)
                ),
                "mlr_impact": mlr_impact_analysis.get("total_mlr_impact", 0),
                "top_risk_count": len(top_risks)
            },
            "exposure_breakdown": {
                "total_exposure": exposure_breakdown.get("total_exposure", 0),
                "total_exposure_formatted": self._format_currency(
                    exposure_breakdown.get("total_exposure", 0)
                ),
                "by_business_process": self._format_business_process_breakdown(
                    exposure_breakdown.get("by_business_process", [])
                ),
                "by_risk_category": self._format_risk_category_breakdown(
                    exposure_breakdown.get("by_risk_category", [])
                ),
                "by_time_horizon": self._format_time_horizon_breakdown(
                    exposure_breakdown.get("by_time_horizon", {})
                )
            },
            "mlr_impact_analysis": {
                "total_mlr_impact": mlr_impact_analysis.get("total_mlr_impact", 0),
                "total_mlr_impact_formatted": f"{mlr_impact_analysis.get('total_mlr_impact', 0):.1f}%",
                "top_ml_risks": self._format_mlr_risks(
                    mlr_impact_analysis.get("top_ml_risks", [])
                )
            },
            "top_risks": self._format_top_risks(top_risks),
            "trends": {
                "insights": trends,
                "count": len(trends)
            },
            "methodology_trail": {
                "steps": methodology_trail,
                "count": len(methodology_trail)
            },
            "recommendations": {
                "items": recommendations,
                "count": len(recommendations),
                "priority_ordered": self._prioritize_recommendations(recommendations)
            }
        }

        return formatted

    def _format_markdown(self, briefing: Dict[str, Any]) -> Dict[str, Any]:
        """Format briefing as Markdown for export/PDF generation."""
        # Extract key fields
        briefing_summary = briefing.get("briefing_summary", "")
        exposure_breakdown = briefing.get("exposure_breakdown", {})
        mlr_impact_analysis = briefing.get("mlr_impact_analysis", {})
        top_risks = briefing.get("top_risks", [])
        trends = briefing.get("trends", [])
        methodology_trail = briefing.get("methodology_trail", [])
        recommendations = briefing.get("recommendations", [])

        # Build Markdown
        markdown_lines = [
            "# CFO Financial Risk Briefing",
            f"",
            f"**Generated:** {datetime.utcnow().strftime('%B %d, %Y at %I:%M %p UTC')}",
            f"",
            f"## Executive Summary",
            f"",
            f"{briefing_summary}",
            f"",
            f"**Total Exposure:** {self._format_currency(exposure_breakdown.get('total_exposure', 0))}",
            f"**Total MLR Impact:** {mlr_impact_analysis.get('total_mlr_impact', 0):.1f}%",
            f"",
            f"## Exposure Breakdown",
            f"",
            f"### By Business Process",
            f""
        ]

        # Business process table
        by_process = exposure_breakdown.get("by_business_process", [])
        if by_process:
            markdown_lines.append("| Business Process | Exposure | MLR Impact | Likelihood |")
            markdown_lines.append("|---|---|---|---|")
            for proc in by_process[:10]:
                markdown_lines.append(
                    f"| {proc.get('process', 'N/A')} | "
                    f"{self._format_currency(proc.get('exposure', 0))} | "
                    f"{proc.get('mlr_impact', 0):.1f}% | "
                    f"{proc.get('likelihood', 0):.0%} |"
                )

        # Risk category table
        markdown_lines.extend([
            f"",
            f"### By Risk Category",
            f""
        ])

        by_category = exposure_breakdown.get("by_risk_category", [])
        if by_category:
            markdown_lines.append("| Risk Category | Exposure | Count |")
            markdown_lines.append("|---|---|---|")
            for cat in by_category[:10]:
                markdown_lines.append(
                    f"| {cat.get('category', 'N/A')} | "
                    f"{self._format_currency(cat.get('exposure', 0))} | "
                    f"{cat.get('count', 0)} |"
                )

        # Time horizon table
        markdown_lines.extend([
            f"",
            f"### By Time Horizon",
            f""
        ])

        by_horizon = exposure_breakdown.get("by_time_horizon", {})
        if by_horizon:
            markdown_lines.append("| Time Horizon | Exposure |")
            markdown_lines.append("|---|---|")
            for horizon, exposure in by_horizon.items():
                markdown_lines.append(
                    f"| {horizon.replace('-', ' ').title()} | "
                    f"{self._format_currency(exposure)} |"
                )

        # MLR impact analysis
        markdown_lines.extend([
            f"",
            f"## MLR Impact Analysis",
            f"",
            f"**Total MLR Impact:** {mlr_impact_analysis.get('total_mlr_impact', 0):.1f}%",
            f""
        ])

        top_ml = mlr_impact_analysis.get("top_ml_risks", [])
        if top_ml:
            markdown_lines.append("### Top ML Risks")
            markdown_lines.append("")
            markdown_lines.append("| Business Process | MLR Impact | Exposure |")
            markdown_lines.append("|---|---|---|")
            for risk in top_ml[:5]:
                markdown_lines.append(
                    f"| {risk.get('process', 'N/A')} | "
                    f"{risk.get('mlr_impact', 0):.1f}% | "
                    f"{self._format_currency(risk.get('exposure', 0))} |"
                )

        # Top risks table
        markdown_lines.extend([
            f"",
            f"## Top {len(top_risks)} Risks by Exposure",
            f""
        ])

        if top_risks:
            markdown_lines.append("| Rank | Risk | Exposure | MLR Impact | Likelihood | Business Process |")
            markdown_lines.append("|---|---|---|---|---|---|")
            for risk in top_risks[:10]:
                markdown_lines.append(
                    f"| {risk.get('rank', 'N/A')} | "
                    f"{risk.get('title', 'N/A')} | "
                    f"{self._format_currency(risk.get('exposure', 0))} | "
                    f"{risk.get('mlr_impact', 0):.1f}% | "
                    f"{risk.get('likelihood', 0):.0%} | "
                    f"{risk.get('business_process', 'N/A')} |"
                )

        # Trends section
        if trends:
            markdown_lines.extend([
                f"",
                f"## Trend Insights",
                f""
            ])
            for i, trend in enumerate(trends, 1):
                markdown_lines.append(f"{i}. {trend}")

        # Recommendations section
        if recommendations:
            markdown_lines.extend([
                f"",
                f"## Recommendations",
                f""
            ])
            for i, rec in enumerate(recommendations, 1):
                markdown_lines.append(f"{i}. {rec}")

        # Methodology trail
        if methodology_trail:
            markdown_lines.extend([
                f"",
                f"## Methodology",
                f""
            ])
            for step in methodology_trail:
                markdown_lines.append(f"- {step}")

        # Footer
        markdown_lines.extend([
            f"",
            f"---",
            f"",
            f"*Generated by CyberRX CFO Agent | {datetime.utcnow().isoformat()}*"
        ])

        return {
            "markdown": "\n".join(markdown_lines),
            "format": "markdown",
            "generated_at": datetime.utcnow().isoformat()
        }

    def _format_summary(self, briefing: Dict[str, Any]) -> Dict[str, Any]:
        """Format briefing as condensed summary for quick review."""
        # Extract key metrics
        exposure_breakdown = briefing.get("exposure_breakdown", {})
        mlr_impact_analysis = briefing.get("mlr_impact_analysis", {})
        top_risks = briefing.get("top_risks", [])
        trends = briefing.get("trends", [])

        # Build summary
        summary = {
            "headline": briefing.get("briefing_summary", ""),
            "key_metrics": {
                "total_exposure": exposure_breakdown.get("total_exposure", 0),
                "total_exposure_formatted": self._format_currency(
                    exposure_breakdown.get("total_exposure", 0)
                ),
                "mlr_impact": mlr_impact_analysis.get("total_mlr_impact", 0),
                "top_risk_count": len(top_risks),
                "trend_count": len(trends)
            },
            "top_3_risks": [
                {
                    "rank": risk.get("rank"),
                    "title": risk.get("title"),
                    "exposure": self._format_currency(risk.get("exposure", 0)),
                    "mlr_impact": risk.get("mlr_impact", 0)
                }
                for risk in top_risks[:3]
            ],
            "key_trends": trends[:3] if trends else [],
            "format": "summary",
            "generated_at": datetime.utcnow().isoformat()
        }

        return summary

    def _format_business_process_breakdown(
        self,
        by_process: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Format business process breakdown with percentages."""
        total = sum(proc.get("exposure", 0) for proc in by_process)

        formatted = []
        for proc in by_process:
            exposure = proc.get("exposure", 0)
            percentage = (exposure / total * 100) if total > 0 else 0

            formatted.append({
                "process": proc.get("process", "Unknown"),
                "exposure": exposure,
                "exposure_formatted": self._format_currency(exposure),
                "percentage": round(percentage, 1),
                "mlr_impact": proc.get("mlr_impact", 0),
                "likelihood": proc.get("likelihood", 0)
            })

        return formatted

    def _format_risk_category_breakdown(
        self,
        by_category: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Format risk category breakdown with percentages."""
        total = sum(cat.get("exposure", 0) for cat in by_category)

        formatted = []
        for cat in by_category:
            exposure = cat.get("exposure", 0)
            percentage = (exposure / total * 100) if total > 0 else 0

            formatted.append({
                "category": cat.get("category", "Unknown"),
                "exposure": exposure,
                "exposure_formatted": self._format_currency(exposure),
                "percentage": round(percentage, 1),
                "count": cat.get("count", 0)
            })

        return formatted

    def _format_time_horizon_breakdown(
        self,
        by_horizon: Dict[str, float]
    ) -> Dict[str, Any]:
        """Format time horizon breakdown."""
        total = sum(by_horizon.values())

        formatted = {}
        for horizon, exposure in by_horizon.items():
            percentage = (exposure / total * 100) if total > 0 else 0

            formatted[horizon] = {
                "exposure": exposure,
                "exposure_formatted": self._format_currency(exposure),
                "percentage": round(percentage, 1)
            }

        return formatted

    def _format_mlr_risks(self, mlr_risks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Format MLR risk breakdown."""
        formatted = []
        for risk in mlr_risks:
            formatted.append({
                "process": risk.get("process", "Unknown"),
                "mlr_impact": risk.get("mlr_impact", 0),
                "mlr_impact_formatted": f"{risk.get('mlr_impact', 0):.1f}%",
                "exposure": risk.get("exposure", 0),
                "exposure_formatted": self._format_currency(risk.get("exposure", 0))
            })

        return formatted

    def _format_top_risks(self, top_risks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Format top risks with all key fields."""
        formatted = []
        for risk in top_risks:
            formatted.append({
                "rank": risk.get("rank", 0),
                "title": risk.get("title", "Unknown"),
                "exposure": risk.get("exposure", 0),
                "exposure_formatted": self._format_currency(risk.get("exposure", 0)),
                "mlr_impact": risk.get("mlr_impact", 0),
                "likelihood": risk.get("likelihood", 0),
                "likelihood_formatted": f"{risk.get('likelihood', 0):.0%}",
                "business_process": risk.get("business_process", "Unknown"),
                "risk_category": risk.get("risk_category", "Unknown"),
                "time_horizon": risk.get("time_horizon", "90-days")
            })

        return formatted

    def _prioritize_recommendations(
        self,
        recommendations: List[str]
    ) -> List[Dict[str, Any]]:
        """
        Prioritize recommendations by urgency keywords.

        Returns: List of dicts with recommendation, priority, and rank
        """
        prioritized = []

        # Keyword-based priority
        urgent_keywords = ["immediate", "urgent", "critical", "now"]
        high_keywords = ["high", "important", "priority", "address"]
        medium_keywords = ["consider", "review", "assess", "evaluate"]

        for i, rec in enumerate(recommendations, 1):
            rec_lower = rec.lower()

            if any(kw in rec_lower for kw in urgent_keywords):
                priority = "urgent"
            elif any(kw in rec_lower for kw in high_keywords):
                priority = "high"
            elif any(kw in rec_lower for kw in medium_keywords):
                priority = "medium"
            else:
                priority = "standard"

            prioritized.append({
                "recommendation": rec,
                "priority": priority,
                "rank": i
            })

        # Sort by priority (urgent first)
        priority_order = {"urgent": 0, "high": 1, "medium": 2, "standard": 3}
        prioritized.sort(key=lambda x: priority_order.get(x["priority"], 4))

        return prioritized

    def _format_currency(self, amount: float) -> str:
        """Format amount as currency string."""
        if amount >= 1_000_000:
            return f"${amount/1_000_000:.1f}M"
        elif amount >= 1_000:
            return f"${amount/1_000:.1f}K"
        else:
            return f"${amount:.0f}"

    def _generate_error_response(self, error: Exception) -> Dict[str, Any]:
        """Generate error response for frontend."""
        return {
            "error": True,
            "error_message": str(error),
            "error_type": type(error).__name__,
            "generated_at": datetime.utcnow().isoformat(),
            "format": "error"
        }

    def validate_briefing(self, briefing: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate briefing completeness and quality.

        Checks for required fields, data quality, and methodology trail.
        """
        self.logger.info("Validating briefing completeness")

        validation_errors = []
        validation_warnings = []

        # Check required fields
        required_fields = [
            "briefing_summary",
            "exposure_breakdown",
            "mlr_impact_analysis",
            "top_risks",
            "trends",
            "methodology_trail",
            "recommendations"
        ]

        for field in required_fields:
            if field not in briefing:
                validation_errors.append(f"Missing required field: {field}")

        # Check exposure breakdown completeness
        if "exposure_breakdown" in briefing:
            exposure = briefing["exposure_breakdown"]
            if not exposure.get("total_exposure"):
                validation_errors.append("Missing total_exposure in exposure_breakdown")

            if not exposure.get("by_business_process"):
                validation_warnings.append("No business_process breakdown in exposure_breakdown")

            if not exposure.get("by_risk_category"):
                validation_warnings.append("No risk_category breakdown in exposure_breakdown")

        # Check methodology trail
        if "methodology_trail" in briefing:
            if len(briefing["methodology_trail"]) < 5:
                validation_warnings.append("Methodology trail has fewer than 5 steps")

        # Check recommendations
        if "recommendations" in briefing:
            if len(briefing["recommendations"]) < 3:
                validation_warnings.append("Fewer than 3 recommendations provided")

        # Validate overall
        is_valid = len(validation_errors) == 0

        return {
            "is_valid": is_valid,
            "errors": validation_errors,
            "warnings": validation_warnings,
            "validated_at": datetime.utcnow().isoformat()
        }
