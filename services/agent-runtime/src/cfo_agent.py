"""
CFO Agent Briefing Generator

Orchestrates all components to generate board-meeting-ready financial briefings
using Claude Sonnet. Integrates with Agent Runtime from T-MVP-007.

Author: AI/ML Engineer (T-MVP-008)
Date: 2025-06-06
"""

import asyncio
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
import uuid

import asyncpg

from .agent_runtime import AgentRuntime
from .cfo_context_manager import CFOContextManager
from .cfo_exposure_analyzer import CFOExposureAnalyzer
from .cfo_trend_analyzer import CFOTrendAnalyzer
from .cfo_summary_formatter import CFOSummaryFormatter
from .state_manager import StateManager
from .claude_client import ClaudeClient
from .prompt_manager import PromptManager
from .phi_validator import validate_no_phi
from .output_formatter import parse_structured_output


logger = logging.getLogger(__name__)


class CFOAgent:
    """
    CFO Agent for health plan financial risk briefings.

    Key Capabilities:
    - Load and enrich financial impact data
    - Analyze dollar exposure with methodology trails
    - Track trends over time
    - Generate board-ready briefings using Claude Sonnet
    - Format briefings for executive consumption
    - Store briefings with metadata
    """

    def __init__(
        self,
        db_pool: asyncpg.pool.Pool,
        claude_client: ClaudeClient,
        prompt_manager: PromptManager,
        state_manager: StateManager
    ):
        """
        Initialize CFO Agent.

        Args:
            db_pool: PostgreSQL connection pool
            claude_client: Claude LLM client
            prompt_manager: Prompt template manager
            state_manager: Agent state manager
        """
        self.db_pool = db_pool
        self.claude_client = claude_client
        self.prompt_manager = prompt_manager
        self.state_manager = state_manager

        # Initialize CFO-specific components
        self.context_manager = CFOContextManager(db_pool)
        self.exposure_analyzer = CFOExposureAnalyzer()
        self.trend_analyzer = CFOTrendAnalyzer()
        self.summary_formatter = CFOSummaryFormatter()

        self.logger = logger

    async def generate_briefing(
        self,
        organization_id: str,
        query: str,
        time_range: Optional[Dict[str, str]] = None,
        include_trends: bool = True,
        format_type: str = "json"
    ) -> Dict[str, Any]:
        """
        Generate CFO briefing for executive query.

        This is the MAIN ENTRY POINT for CFO Agent.

        Args:
            organization_id: Organization ID
            query: Executive query (e.g., "What's our current exposure?")
            time_range: Optional time range filter
            include_trends: Whether to include trend analysis
            format_type: Output format ('json', 'markdown', 'summary')

        Returns:
            Board-ready CFO briefing

        Raises:
            ValueError: If PHI detected in data
        """
        self.logger.info(f"Generating CFO briefing for query: {query}")

        briefing_id = str(uuid.uuid4())
        start_time = datetime.utcnow()

        try:
            # STEP 1: Build context (financial + risk data)
            self.logger.info("Step 1: Building CFO context")
            context = await self.context_manager.build_cfo_context(
                organization_id=organization_id,
                query=query,
                time_range=time_range
            )

            # CRITICAL: Validate NO PHI in context (already done in context_manager)
            self.logger.info("Context validated: NO PHI detected")

            # STEP 2: Analyze exposure
            self.logger.info("Step 2: Analyzing dollar exposure")
            exposure_analysis = self.exposure_analyzer.analyze_exposure(
                context["financial_impacts"]
            )

            # STEP 3: Analyze trends (if requested)
            trend_analysis = None
            if include_trends:
                self.logger.info("Step 3: Analyzing exposure trends")
                trend_analysis = self.trend_analyzer.analyze_trends(
                    context["financial_impacts"]
                )

            # STEP 4: Load and render prompt template
            self.logger.info("Step 4: Loading CFO prompt template")
            template = self.prompt_manager.load_template("cfo", "briefing.txt")

            # Build template context
            template_context = {
                "query": query,
                "time_range": context["time_range"],
                "financial_impacts": context["financial_impacts"][:50],
                "risk_objects": context["risk_objects"][:50],
                "summary": context["summary"],
                "exposure_analysis": exposure_analysis,
                "trend_analysis": trend_analysis
            }

            # Render template
            rendered_prompt = self.prompt_manager.render_template(
                template,
                template_context
            )

            self.logger.info(f"Prompt rendered: {len(rendered_prompt)} characters")

            # STEP 5: Call Claude Sonnet
            self.logger.info("Step 5: Calling Claude Sonnet API")
            claude_response = await self.claude_client.call_claude_with_structured_output(
                prompt=rendered_prompt,
                output_schema=self._get_briefing_schema()
            )

            # STEP 6: Parse structured output
            self.logger.info("Step 6: Parsing structured output")
            briefing = parse_structured_output(
                claude_response,
                self._get_briefing_schema()
            )

            # STEP 7: Enhance with analysis results
            briefing["exposure_analysis"] = exposure_analysis
            briefing["trend_analysis"] = trend_analysis
            briefing["query"] = query
            briefing["organization_id"] = organization_id

            # STEP 8: Format for frontend
            self.logger.info("Step 8: Formatting briefing for frontend")
            formatted_briefing = self.summary_formatter.format_for_frontend(
                briefing,
                format_type=format_type
            )

            # STEP 9: Validate briefing
            self.logger.info("Step 9: Validating briefing completeness")
            validation = self.summary_formatter.validate_briefing(briefing)

            # STEP 10: Store briefing in database
            self.logger.info("Step 10: Storing briefing in database")
            end_time = datetime.utcnow()
            briefing_metadata = {
                "briefing_id": briefing_id,
                "organization_id": organization_id,
                "query": query,
                "time_range": time_range,
                "include_trends": include_trends,
                "format_type": format_type,
                "generated_at": start_time.isoformat(),
                "completed_at": end_time.isoformat(),
                "duration_seconds": (end_time - start_time).total_seconds(),
                "input_tokens": claude_response.input_tokens,
                "output_tokens": claude_response.output_tokens,
                "token_cost": claude_response.total_cost,
                "validation": validation
            }

            await self.state_manager.store_cfo_briefing(
                briefing_id=briefing_id,
                organization_id=organization_id,
                query=query,
                context=context,
                briefing=formatted_briefing,
                metadata=briefing_metadata
            )

            # STEP 11: Return formatted briefing
            formatted_briefing["metadata"]["briefing_id"] = briefing_id
            formatted_briefing["metadata"]["validation"] = validation
            formatted_briefing["metadata"]["duration_seconds"] = briefing_metadata["duration_seconds"]

            self.logger.info(
                f"CFO briefing generated successfully: {briefing_id} "
                f"({briefing_metadata['duration_seconds']:.2f}s, ${briefing_metadata['token_cost']:.4f} cost)"
            )

            return formatted_briefing

        except ValueError as e:
            # PHI detection error
            self.logger.error(f"PHI detected during briefing generation: {e}")
            raise
        except Exception as e:
            self.logger.error(f"Error generating CFO briefing: {e}")
            raise

    async def get_exposure_breakdown(
        self,
        organization_id: str,
        time_range: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Get current exposure breakdown without full briefing.

        Faster endpoint for dashboard widgets.
        """
        self.logger.info("Getting exposure breakdown")

        try:
            # Load financial impacts
            financial_impacts = await self.context_manager.load_financial_context(
                organization_id=organization_id,
                time_range=time_range
            )

            # Analyze exposure
            exposure_analysis = self.exposure_analyzer.analyze_exposure(financial_impacts)

            return {
                "organization_id": organization_id,
                "time_range": time_range,
                "exposure_analysis": exposure_analysis,
                "generated_at": datetime.utcnow().isoformat()
            }

        except Exception as e:
            self.logger.error(f"Error getting exposure breakdown: {e}")
            raise

    async def get_trends(
        self,
        organization_id: str,
        time_range: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Get exposure trends without full briefing.

        Faster endpoint for trend charts.
        """
        self.logger.info("Getting exposure trends")

        try:
            # Load financial impacts
            financial_impacts = await self.context_manager.load_financial_context(
                organization_id=organization_id,
                time_range=time_range
            )

            # Analyze trends
            trend_analysis = self.trend_analyzer.analyze_trends(financial_impacts)

            return {
                "organization_id": organization_id,
                "time_range": time_range,
                "trend_analysis": trend_analysis,
                "generated_at": datetime.utcnow().isoformat()
            }

        except Exception as e:
            self.logger.error(f"Error getting trends: {e}")
            raise

    async def get_recent_briefings(
        self,
        organization_id: str,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get recent CFO briefings for organization.

        Args:
            organization_id: Organization ID
            limit: Maximum number of briefings to return

        Returns:
            List of recent briefings
        """
        self.logger.info(f"Getting recent CFO briefings (limit={limit})")

        try:
            briefings = await self.state_manager.get_cfo_briefings(
                organization_id=organization_id,
                limit=limit
            )

            return briefings

        except Exception as e:
            self.logger.error(f"Error getting recent briefings: {e}")
            raise

    async def get_metrics(
        self,
        organization_id: str,
        metric_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get CFO agent usage metrics.

        Args:
            organization_id: Organization ID
            metric_date: Optional date (YYYY-MM-DD), defaults to today

        Returns:
            Usage metrics
        """
        self.logger.info(f"Getting CFO metrics for org={organization_id}, date={metric_date}")

        try:
            metrics = await self.state_manager.get_cfo_metrics(
                agent_id="cfo",
                organization_id=organization_id,
                metric_date=metric_date
            )

            return metrics

        except Exception as e:
            self.logger.error(f"Error getting metrics: {e}")
            raise

    def _get_briefing_schema(self) -> Dict[str, Any]:
        """
        Get JSON schema for CFO briefing output.

        Defines expected structure of Claude's response.
        """
        return {
            "type": "object",
            "properties": {
                "briefing_summary": {
                    "type": "string",
                    "description": "2-3 sentence executive summary of key findings"
                },
                "exposure_breakdown": {
                    "type": "object",
                    "properties": {
                        "total_exposure": {"type": "number"},
                        "by_business_process": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "process": {"type": "string"},
                                    "exposure": {"type": "number"},
                                    "mlr_impact": {"type": "number"},
                                    "likelihood": {"type": "number"}
                                }
                            }
                        },
                        "by_risk_category": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "category": {"type": "string"},
                                    "exposure": {"type": "number"},
                                    "count": {"type": "integer"}
                                }
                            }
                        },
                        "by_time_horizon": {
                            "type": "object",
                            "properties": {
                                "immediate": {"type": "number"},
                                "30-days": {"type": "number"},
                                "90-days": {"type": "number"}
                            }
                        }
                    }
                },
                "mlr_impact_analysis": {
                    "type": "object",
                    "properties": {
                        "total_mlr_impact": {"type": "number"},
                        "top_ml_risks": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "process": {"type": "string"},
                                    "mlr_impact": {"type": "number"},
                                    "exposure": {"type": "number"}
                                }
                            }
                        }
                    }
                },
                "top_risks": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "rank": {"type": "integer"},
                            "title": {"type": "string"},
                            "exposure": {"type": "number"},
                            "mlr_impact": {"type": "number"},
                            "likelihood": {"type": "number"},
                            "business_process": {"type": "string"}
                        }
                    }
                },
                "trends": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "methodology_trail": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "recommendations": {
                    "type": "array",
                    "items": {"type": "string"}
                }
            },
            "required": [
                "briefing_summary",
                "exposure_breakdown",
                "mlr_impact_analysis",
                "top_risks",
                "trends",
                "methodology_trail",
                "recommendations"
            ]
        }


# Extend StateManager with CFO-specific methods
async def store_cfo_briefing(
    self,
    briefing_id: str,
    organization_id: str,
    query: str,
    context: Dict[str, Any],
    briefing: Dict[str, Any],
    metadata: Dict[str, Any]
) -> None:
    """Store CFO briefing in database."""
    await self.store_briefing(
        agent_id="cfo",
        query=query,
        context=context,
        briefing=briefing,
        token_cost=metadata.get("token_cost", 0)
    )


async def get_cfo_briefings(
    self,
    organization_id: str,
    limit: int = 10
) -> List[Dict[str, Any]]:
    """Get recent CFO briefings for organization."""
    briefings = await self.get_recent_briefings(agent_id="cfo", limit=limit)

    # Filter by organization
    org_briefings = [
        b for b in briefings
        if b.get("organization_id") == organization_id
    ]

    return org_briefings


async def get_cfo_metrics(
    self,
    agent_id: str,
    organization_id: str,
    metric_date: Optional[str] = None
) -> Dict[str, Any]:
    """Get CFO agent usage metrics."""
    from datetime import datetime

    if not metric_date:
        metric_date = datetime.utcnow().strftime("%Y-%m-%d")

    return await self.get_metrics(agent_id, metric_date)


# Monkey-patch StateManager
StateManager.store_cfo_briefing = store_cfo_briefing
StateManager.get_cfo_briefings = get_cfo_briefings
StateManager.get_cfo_metrics = get_cfo_metrics
