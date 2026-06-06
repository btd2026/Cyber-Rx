"""
Context Manager Service

Loads and aggregates data from T-MVP-005 and T-MVP-006 for agent context.
Validates NO PHI in context before LLM calls.
"""
import asyncpg
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from src.models import FinancialImpact, RiskObject, TimeRange
from src.phi_validator import get_phi_validator


logger = logging.getLogger(__name__)


class ContextManager:
    """
    Manages context loading and aggregation for agent queries.

    Features:
    - Load financial impacts from T-MVP-006
    - Load enriched risk objects from T-MVP-005
    - Aggregate data for agent context
    - Apply time filters, risk category filters
    - Format data for LLM consumption
    - CRITICAL: Validate NO PHI in context
    """

    def __init__(self, db_pool: asyncpg.Pool):
        """
        Initialize context manager.

        Args:
            db_pool: PostgreSQL connection pool
        """
        self.db_pool = db_pool
        self.phi_validator = get_phi_validator()
        logger.info("Context manager initialized")

    async def load_financial_context(
        self,
        time_range: TimeRange,
        risk_categories: List[str] = None
    ) -> List[FinancialImpact]:
        """
        Load financial impacts from T-MVP-006.

        Args:
            time_range: Time range filter
            risk_categories: Optional risk category filter

        Returns:
            List[FinancialImpact]: Financial impacts matching criteria
        """
        try:
            async with self.db_pool.acquire() as conn:
                # Build query with filters
                if risk_categories:
                    rows = await conn.fetch(
                        """
                        SELECT
                            impact_id, business_process, exposure, mlr_impact,
                            likelihood, time_horizon, risk_category,
                            affected_systems, blast_radius, regulatory_trigger,
                            created_at
                        FROM financial_impacts
                        WHERE created_at >= $1 AND created_at <= $2
                        AND risk_category = ANY($3)
                        ORDER BY exposure DESC
                        """,
                        time_range.start,
                        time_range.end,
                        risk_categories
                    )
                else:
                    rows = await conn.fetch(
                        """
                        SELECT
                            impact_id, business_process, exposure, mlr_impact,
                            likelihood, time_horizon, risk_category,
                            affected_systems, blast_radius, regulatory_trigger,
                            created_at
                        FROM financial_impacts
                        WHERE created_at >= $1 AND created_at <= $2
                        ORDER BY exposure DESC
                        """,
                        time_range.start,
                        time_range.end
                    )

                # Parse financial impacts
                financial_impacts = [
                    FinancialImpact(
                        impact_id=row['impact_id'],
                        business_process=row['business_process'],
                        exposure=float(row['exposure']),
                        mlr_impact=float(row['mlr_impact']),
                        likelihood=float(row['likelihood']),
                        time_horizon=row['time_horizon'],
                        risk_category=row['risk_category'],
                        affected_systems=row['affected_systems'],
                        blast_radius=row['blast_radius'],
                        regulatory_trigger=row['regulatory_trigger'],
                        created_at=row['created_at']
                    )
                    for row in rows
                ]

                logger.info(
                    f"Loaded {len(financial_impacts)} financial impacts "
                    f"from {time_range.start} to {time_range.end}"
                )
                return financial_impacts

        except Exception as e:
            logger.error(f"Failed to load financial context: {e}")
            raise

    async def load_risk_context(
        self,
        time_range: TimeRange,
        likelihood_min: float = 0.0
    ) -> List[RiskObject]:
        """
        Load enriched risk objects from T-MVP-005.

        Args:
            time_range: Time range filter
            likelihood_min: Minimum likelihood threshold

        Returns:
            List[RiskObject]: Risk objects matching criteria
        """
        try:
            async with self.db_pool.acquire() as conn:
                rows = await conn.fetch(
                    """
                    SELECT
                        risk_id, title, description, risk_category,
                        likelihood, business_process, affected_systems,
                        blast_radius, financial_exposure,
                        upstream_dependencies, downstream_dependencies,
                        mitigation_status, created_at
                    FROM enriched_risk_objects
                    WHERE created_at >= $1 AND created_at <= $2
                    AND likelihood >= $3
                    ORDER BY likelihood DESC, financial_exposure DESC
                    """,
                    time_range.start,
                    time_range.end,
                    likelihood_min
                )

                # Parse risk objects
                risk_objects = [
                    RiskObject(
                        risk_id=row['risk_id'],
                        title=row['title'],
                        description=row['description'],
                        risk_category=row['risk_category'],
                        likelihood=float(row['likelihood']),
                        business_process=row['business_process'],
                        affected_systems=row['affected_systems'],
                        blast_radius=row['blast_radius'],
                        financial_exposure=float(row['financial_exposure']),
                        upstream_dependencies=row['upstream_dependencies'],
                        downstream_dependencies=row['downstream_dependencies'],
                        mitigation_status=row['mitigation_status'],
                        created_at=row['created_at']
                    )
                    for row in rows
                ]

                logger.info(
                    f"Loaded {len(risk_objects)} risk objects "
                    f"from {time_range.start} to {time_range.end}"
                )
                return risk_objects

        except Exception as e:
            logger.error(f"Failed to load risk context: {e}")
            raise

    async def build_agent_context(
        self,
        agent_id: str,
        query: str,
        time_range: TimeRange,
        risk_categories: List[str] = None,
        likelihood_min: float = 0.0
    ) -> Dict[str, Any]:
        """
        Build complete context for agent query.

        This is where we assemble ALL data an agent needs:
        1. Financial impacts (T-MVP-006)
        2. Risk objects (T-MVP-005)
        3. Agent metadata
        4. Query metadata

        CRITICAL: Validates NO PHI before returning.

        Args:
            agent_id: Agent identifier
            query: Executive query
            time_range: Time range for data
            risk_categories: Optional risk category filter
            likelihood_min: Minimum likelihood threshold

        Returns:
            dict: Context ready for LLM prompt injection
        """
        try:
            # Load financial impacts
            financial_impacts = await self.load_financial_context(
                time_range=time_range,
                risk_categories=risk_categories
            )

            # Load risk objects
            risk_objects = await self.load_risk_context(
                time_range=time_range,
                likelihood_min=likelihood_min
            )

            # Build context dictionary
            context = {
                "agent_id": agent_id,
                "query": query,
                "time_range": {
                    "start": time_range.start.isoformat(),
                    "end": time_range.end.isoformat()
                },
                "financial_impacts": [
                    {
                        "business_process": impact.business_process,
                        "exposure": impact.exposure,
                        "mlr_impact": impact.mlr_impact,
                        "likelihood": impact.likelihood,
                        "time_horizon": impact.time_horizon,
                        "risk_category": impact.risk_category,
                        "affected_systems": impact.affected_systems,
                        "blast_radius": impact.blast_radius,
                        "regulatory_trigger": impact.regulatory_trigger
                    }
                    for impact in financial_impacts
                ],
                "risk_objects": [
                    {
                        "risk_id": risk.risk_id,
                        "title": risk.title,
                        "description": risk.description,
                        "risk_category": risk.risk_category,
                        "likelihood": risk.likelihood,
                        "business_process": risk.business_process,
                        "affected_systems": risk.affected_systems,
                        "blast_radius": risk.blast_radius,
                        "financial_exposure": risk.financial_exposure,
                        "upstream_dependencies": risk.upstream_dependencies,
                        "downstream_dependencies": risk.downstream_dependencies,
                        "mitigation_status": risk.mitigation_status
                    }
                    for risk in risk_objects
                ],
                "summary": {
                    "total_financial_impacts": len(financial_impacts),
                    "total_risk_objects": len(risk_objects),
                    "total_exposure": sum(impact.exposure for impact in financial_impacts),
                    "avg_likelihood": sum(risk.likelihood for risk in risk_objects) / len(risk_objects) if risk_objects else 0.0
                }
            }

            # CRITICAL: Validate NO PHI in context
            validation_result = self.phi_validator.validate_context_dict(context)

            if not validation_result.valid:
                error_msg = (
                    f"PHI detected in agent context for {agent_id}. "
                    f"LLM call aborted. PHI matches: {validation_result.phi_matches}"
                )
                logger.error(error_msg)
                raise Exception(error_msg)

            logger.info(
                f"Built context for {agent_id}: "
                f"{len(financial_impacts)} financial impacts, "
                f"{len(risk_objects)} risk objects, "
                f"NO PHI detected"
            )

            return context

        except Exception as e:
            logger.error(f"Failed to build agent context for {agent_id}: {e}")
            raise

    async def validate_no_phi(self, context: Dict[str, Any]) -> bool:
        """
        Validate that context contains NO PHI.

        Args:
            context: Context dictionary

        Returns:
            bool: True if NO PHI detected, False otherwise
        """
        validation_result = self.phi_validator.validate_context_dict(context)
        return validation_result.valid

    def format_context_for_prompt(
        self,
        context: Dict[str, Any],
        max_tokens: int = 10000
    ) -> str:
        """
        Format context for prompt injection.

        Truncates context if needed to fit within token limits.

        Args:
            context: Context dictionary
            max_tokens: Maximum tokens for context

        Returns:
            str: Formatted context string
        """
        # Estimate token count (rough approximation: 1 token ≈ 4 characters)
        context_json = str(context)
        estimated_tokens = len(context_json) // 4

        if estimated_tokens <= max_tokens:
            return context_json

        # Truncate if needed
        # For now, just return a truncated version
        # In production, implement smarter truncation (keep most important data)
        logger.warning(
            f"Context truncated: {estimated_tokens} tokens > {max_tokens} limit"
        )
        return context_json[:max_tokens * 4]


# Singleton instance for use across the application
_context_manager_instance = None


def get_context_manager(db_pool: asyncpg.Pool) -> ContextManager:
    """Get singleton context manager instance."""
    global _context_manager_instance
    if _context_manager_instance is None:
        _context_manager_instance = ContextManager(db_pool)
    return _context_manager_instance
