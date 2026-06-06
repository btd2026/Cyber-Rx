"""
CFO Context Manager

Loads and enriches financial impact data for the CFO Agent.
Calculates MLR impact, stop-loss exposure, and reserve-at-risk metrics.
Validates NO PHI before returning context to LLM.

Author: AI/ML Engineer (T-MVP-008)
Date: 2025-06-06
"""

import asyncio
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from decimal import Decimal

import asyncpg

from .phi_validator import validate_no_phi, ValidationResult


logger = logging.getLogger(__name__)


class CFOContextManager:
    """
    Manages financial context loading and enrichment for CFO Agent.

    Key Responsibilities:
    - Load financial impacts from T-MVP-006 database
    - Calculate MLR (Medical Loss Ratio) impact
    - Calculate stop-loss exposure
    - Calculate reserve-at-risk
    - Calculate premium revenue risk
    - Aggregate by business process and risk category
    - Validate NO PHI before returning context
    """

    def __init__(self, db_pool: asyncpg.pool.Pool):
        """
        Initialize CFO Context Manager.

        Args:
            db_pool: PostgreSQL connection pool (TimescaleDB)
        """
        self.db_pool = db_pool
        self.logger = logger

    async def load_financial_context(
        self,
        organization_id: str,
        time_range: Optional[Dict[str, str]] = None,
        risk_categories: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Load financial impacts from database and enrich with CFO-specific metrics.

        Args:
            organization_id: Organization ID
            time_range: Optional time range filter {'start': 'ISO date', 'end': 'ISO date'}
            risk_categories: Optional list of risk categories to filter

        Returns:
            List of enriched financial impact objects

        Raises:
            ValueError: If PHI detected in data
        """
        self.logger.info(
            f"Loading financial context for org={organization_id}, "
            f"time_range={time_range}, categories={risk_categories}"
        )

        try:
            # Build query
            query = """
                SELECT
                    fi.id,
                    fi.risk_id,
                    fi.organization_id,
                    fi.scenario_id,
                    fi.breach_response_cost,
                    fi.regulatory_fine,
                    fi.business_interruption,
                    fi.fraud_loss,
                    fi.reputational_loss,
                    fi.legal_cost,
                    fi.recovery_cost,
                    fi.total_gross,
                    fi.insurance_coverage,
                    fi.net_exposure,
                    fi.created_at,
                    fi.updated_at,
                    r.title as risk_title,
                    r.description as risk_description,
                    r.risk_category,
                    r.likelihood,
                    r.business_process,
                    r.affected_systems,
                    r.blast_radius,
                    r.mitigation_status
                FROM financial_impacts fi
                LEFT JOIN risks r ON fi.risk_id = r.id
                WHERE fi.organization_id = $1
            """

            params = [organization_id]
            param_count = 1

            # Add time range filter
            if time_range:
                query += f" AND fi.created_at >= ${param_count + 1}"
                params.append(time_range.get('start'))
                param_count += 1

                query += f" AND fi.created_at <= ${param_count + 1}"
                params.append(time_range.get('end'))
                param_count += 1

            # Add risk category filter
            if risk_categories:
                query += f" AND r.risk_category = ANY(${param_count + 1})"
                params.append(risk_categories)
                param_count += 1

            query += " ORDER BY fi.net_exposure DESC"

            # Execute query
            async with self.db_pool.acquire() as conn:
                rows = await conn.fetch(query, *params)

            # Transform and enrich results
            financial_impacts = []
            for row in rows:
                impact = await self._transform_and_enrich(row)
                financial_impacts.append(impact)

            self.logger.info(f"Loaded {len(financial_impacts)} financial impacts")

            # CRITICAL: Validate NO PHI before returning
            validation_result = validate_no_phi({"financial_impacts": financial_impacts})
            if not validation_result.is_valid:
                error_msg = f"PHI DETECTED in financial context: {validation_result.phi_patterns}"
                self.logger.error(error_msg)
                raise ValueError(error_msg)

            return financial_impacts

        except Exception as e:
            self.logger.error(f"Error loading financial context: {e}")
            raise

    async def load_risk_context(
        self,
        organization_id: str,
        time_range: Optional[Dict[str, str]] = None,
        likelihood_min: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """
        Load enriched risk objects from T-MVP-005.

        Args:
            organization_id: Organization ID
            time_range: Optional time range filter
            likelihood_min: Minimum likelihood threshold (0.0-1.0)

        Returns:
            List of risk objects

        Raises:
            ValueError: If PHI detected in data
        """
        self.logger.info(
            f"Loading risk context for org={organization_id}, "
            f"likelihood_min={likelihood_min}"
        )

        try:
            query = """
                SELECT
                    r.id,
                    r.risk_id,
                    r.title,
                    r.description,
                    r.risk_category,
                    r.likelihood,
                    r.financial_exposure,
                    r.business_process,
                    r.affected_systems,
                    r.blast_radius,
                    r.mitigation_status,
                    r.created_at
                FROM risks r
                WHERE r.organization_id = $1
            """

            params = [organization_id]
            param_count = 1

            # Add likelihood filter
            if likelihood_min is not None:
                query += f" AND r.likelihood >= ${param_count + 1}"
                params.append(likelihood_min)
                param_count += 1

            # Add time range filter
            if time_range:
                query += f" AND r.created_at >= ${param_count + 1}"
                params.append(time_range.get('start'))
                param_count += 1

                query += f" AND r.created_at <= ${param_count + 1}"
                params.append(time_range.get('end'))
                param_count += 1

            query += " ORDER BY r.likelihood DESC, r.financial_exposure DESC"

            # Execute query
            async with self.db_pool.acquire() as conn:
                rows = await conn.fetch(query, *params)

            # Transform results
            risk_objects = []
            for row in rows:
                risk = {
                    "risk_id": row["risk_id"],
                    "title": row["title"],
                    "description": row["description"],
                    "risk_category": row["risk_category"],
                    "likelihood": float(row["likelihood"]),
                    "financial_exposure": float(row["financial_exposure"]),
                    "business_process": row["business_process"],
                    "affected_systems": row["affected_systems"] or [],
                    "blast_radius": row["blast_radius"] or [],
                    "mitigation_status": row["mitigation_status"],
                    "created_at": row["created_at"].isoformat()
                }
                risk_objects.append(risk)

            self.logger.info(f"Loaded {len(risk_objects)} risk objects")

            # CRITICAL: Validate NO PHI before returning
            validation_result = validate_no_phi({"risk_objects": risk_objects})
            if not validation_result.is_valid:
                error_msg = f"PHI DETECTED in risk context: {validation_result.phi_patterns}"
                self.logger.error(error_msg)
                raise ValueError(error_msg)

            return risk_objects

        except Exception as e:
            self.logger.error(f"Error loading risk context: {e}")
            raise

    async def build_cfo_context(
        self,
        organization_id: str,
        query: str,
        time_range: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Build complete CFO context from financial and risk data.

        Args:
            organization_id: Organization ID
            query: Executive query
            time_range: Optional time range filter

        Returns:
            Complete CFO context for LLM

        Raises:
            ValueError: If PHI detected in context
        """
        self.logger.info(f"Building CFO context for query: {query}")

        try:
            # Load financial impacts
            financial_impacts = await self.load_financial_context(
                organization_id=organization_id,
                time_range=time_range
            )

            # Load risk objects
            risk_objects = await self.load_risk_context(
                organization_id=organization_id,
                time_range=time_range
            )

            # Calculate summary statistics
            summary = await self._calculate_summary(financial_impacts, risk_objects)

            # Build context
            context = {
                "query": query,
                "time_range": time_range or self._default_time_range(),
                "financial_impacts": financial_impacts[:50],  # Top 50
                "risk_objects": risk_objects[:50],  # Top 50
                "summary": summary
            }

            # CRITICAL: Validate NO PHI before returning
            validation_result = validate_no_phi(context)
            if not validation_result.is_valid:
                error_msg = f"PHI DETECTED in CFO context: {validation_result.phi_patterns}"
                self.logger.error(error_msg)
                raise ValueError(error_msg)

            self.logger.info(
                f"Built CFO context: {len(financial_impacts)} impacts, "
                f"{len(risk_objects)} risks, ${summary['total_exposure']:,.2f} total exposure"
            )

            return context

        except Exception as e:
            self.logger.error(f"Error building CFO context: {e}")
            raise

    async def _transform_and_enrich(self, row: asyncpg.Record) -> Dict[str, Any]:
        """
        Transform database row and enrich with CFO-specific metrics.

        Args:
            row: Database row

        Returns:
            Enriched financial impact object
        """
        # Base fields
        impact = {
            "id": str(row["id"]),
            "risk_id": str(row["risk_id"]),
            "organization_id": str(row["organization_id"]),
            "scenario_id": str(row["scenario_id"]) if row["scenario_id"] else None,
            "breach_response_cost": float(row["breach_response_cost"] or 0),
            "regulatory_fine": float(row["regulatory_fine"] or 0),
            "business_interruption": float(row["business_interruption"] or 0),
            "fraud_loss": float(row["fraud_loss"] or 0),
            "reputational_loss": float(row["reputational_loss"] or 0),
            "legal_cost": float(row["legal_cost"] or 0),
            "recovery_cost": float(row["recovery_cost"] or 0),
            "total_gross": float(row["total_gross"] or 0),
            "insurance_coverage": float(row["insurance_coverage"] or 0),
            "net_exposure": float(row["net_exposure"] or 0),
            "created_at": row["created_at"].isoformat() if row["created_at"] else None,
            "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None
        }

        # Risk metadata
        if row["risk_title"]:
            impact["risk_title"] = row["risk_title"]
            impact["risk_description"] = row["description"]
            impact["risk_category"] = row["risk_category"]
            impact["likelihood"] = float(row["likelihood"] or 0)
            impact["business_process"] = row["business_process"]
            impact["affected_systems"] = row["affected_systems"] or []
            impact["blast_radius"] = row["blast_radius"] or []
            impact["mitigation_status"] = row["mitigation_status"]

            # CFO-specific enrichments
            impact["mlr_impact"] = self._calculate_mlr_impact(impact)
            impact["stop_loss_exposure"] = self._calculate_stop_loss_exposure(impact)
            impact["reserve_at_risk"] = self._calculate_reserve_at_risk(impact)
            impact["premium_revenue_risk"] = self._calculate_premium_revenue_risk(impact)
            impact["time_horizon"] = self._estimate_time_horizon(row["risk_category"])

        return impact

    def _calculate_mlr_impact(self, impact: Dict[str, Any]) -> float:
        """
        Calculate MLR (Medical Loss Ratio) impact percentage.

        MLR = Medical Claims / Premium Revenue
        Higher exposure = higher claims = worse MLR

        Args:
            impact: Financial impact object

        Returns:
            MLR impact percentage (e.g., 2.5 for 2.5%)
        """
        # Estimate MLR impact based on net exposure
        # Assumption: $1M exposure = 1% MLR impact for mid-sized plan
        # This is a heuristic for executive briefing
        net_exposure = impact.get("net_exposure", 0)

        # Scale factor: $1M = 1% MLR impact
        mlr_impact = (net_exposure / 1_000_000) * 1.0

        # Cap at 10% (maximum plausible MLR impact)
        mlr_impact = min(mlr_impact, 10.0)

        return round(mlr_impact, 2)

    def _calculate_stop_loss_exposure(self, impact: Dict[str, Any]) -> float:
        """
        Calculate stop-loss exposure (reinsurance position).

        Stop-loss insurance kicks in after individual claim threshold.
        Cyber events can trigger large claims = stop-loss risk.

        Args:
            impact: Financial impact object

        Returns:
            Stop-loss exposure amount
        """
        # Estimate: 30% of business interruption affects stop-loss
        business_interruption = impact.get("business_interruption", 0)
        stop_loss_exposure = business_interruption * 0.30

        return round(stop_loss_exposure, 2)

    def _calculate_reserve_at_risk(self, impact: Dict[str, Any]) -> float:
        """
        Calculate reserve-at-risk implications.

        Health plans maintain reserves for large claims.
        Cyber events can deplete reserves faster than replenishment.

        Args:
            impact: Financial impact object

        Returns:
            Reserve at risk amount
        """
        # Estimate: 50% of fraud + legal costs affect reserves
        fraud_loss = impact.get("fraud_loss", 0)
        legal_cost = impact.get("legal_cost", 0)
        reserve_at_risk = (fraud_loss + legal_cost) * 0.50

        return round(reserve_at_risk, 2)

    def _calculate_premium_revenue_risk(self, impact: Dict[str, Any]) -> float:
        """
        Calculate premium revenue risk (member attrition impact).

        Cyber breaches cause member attrition = premium revenue loss.

        Args:
            impact: Financial impact object

        Returns:
            Premium revenue risk amount
        """
        # Estimate: 20% of reputational loss = premium attrition
        reputational_loss = impact.get("reputational_loss", 0)
        premium_revenue_risk = reputational_loss * 0.20

        return round(premium_revenue_risk, 2)

    def _estimate_time_horizon(self, risk_category: Optional[str]) -> str:
        """
        Estimate time horizon for impact based on risk category.

        Args:
            risk_category: Risk category

        Returns:
            Time horizon ('immediate', '30-days', '90-days')
        """
        # Risk category to time horizon mapping
        if not risk_category:
            return "90-days"

        category_lower = risk_category.lower()

        # Immediate impact categories
        immediate_categories = ["ransomware", "malware", "outage", "disruption"]
        if any(cat in category_lower for cat in immediate_categories):
            return "immediate"

        # 30-day impact categories
        thirty_day_categories = ["data breach", "breach", "fraud", "theft"]
        if any(cat in category_lower for cat in thirty_day_categories):
            return "30-days"

        # Default 90-day
        return "90-days"

    async def _calculate_summary(
        self,
        financial_impacts: List[Dict[str, Any]],
        risk_objects: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Calculate summary statistics for context.

        Args:
            financial_impacts: List of financial impacts
            risk_objects: List of risk objects

        Returns:
            Summary statistics
        """
        # Financial impact summary
        total_exposure = sum(fi.get("net_exposure", 0) for fi in financial_impacts)
        total_gross = sum(fi.get("total_gross", 0) for fi in financial_impacts)
        total_insurance = sum(fi.get("insurance_coverage", 0) for fi in financial_impacts)

        # Likelihood average
        likelihoods = [fi.get("likelihood", 0) for fi in financial_impacts if fi.get("likelihood")]
        avg_likelihood = sum(likelihoods) / len(likelihoods) if likelihoods else 0.0

        # Risk category breakdown
        category_counts = {}
        for fi in financial_impacts:
            cat = fi.get("risk_category", "unknown")
            category_counts[cat] = category_counts.get(cat, 0) + 1

        # Business process breakdown
        process_exposures = {}
        for fi in financial_impacts:
            process = fi.get("business_process", "unknown")
            exposure = fi.get("net_exposure", 0)
            process_exposures[process] = process_exposures.get(process, 0) + exposure

        return {
            "total_financial_impacts": len(financial_impacts),
            "total_risk_objects": len(risk_objects),
            "total_exposure": round(total_exposure, 2),
            "total_gross": round(total_gross, 2),
            "total_insurance_coverage": round(total_insurance, 2),
            "avg_likelihood": round(avg_likelihood, 3),
            "risk_category_counts": category_counts,
            "business_process_exposures": {
                k: round(v, 2) for k, v in process_exposures.items()
            }
        }

    def _default_time_range(self) -> Dict[str, str]:
        """
        Get default time range (last 90 days).

        Returns:
            Default time range dict
        """
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=90)

        return {
            "start": start_date.isoformat(),
            "end": end_date.isoformat()
        }
