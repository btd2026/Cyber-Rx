"""
Business Process Graph Service - Maps assets to business processes.

Queries the customer-specific business process graph to map affected assets
( hostnames, IPs) to business process IDs (e.g., "claims-adjudication").
"""

import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from collections import OrderedDict

import asyncpg
from cachetools import TTLCache

import structlog

from ..config import TimescaleDBConfig


logger = structlog.get_logger(__name__)


class BusinessProcessService:
    """
    Business Process Graph Service.

    Maps affected assets to business processes using the customer-specific
    business process graph stored in TimescaleDB.
    """

    def __init__(self, config: TimescaleDBConfig):
        """
        Initialize Business Process Service.

        Args:
            config: TimescaleDB configuration
        """
        self.config = config

        # Connection pool (initialized in start())
        self.pool: Optional[asyncpg.Pool] = None

        # Cache for business process mappings (TTL: 1 hour)
        self._cache = TTLCache(maxsize=10000, ttl=3600)

        # Cache statistics
        self._cache_hits = 0
        self._cache_misses = 0

        logger.info("business_process_service_initialized")

    async def start(self) -> None:
        """
        Start the Business Process Service.

        Initializes database connection pool.
        """
        logger.info("starting_business_process_service")

        # Create connection pool
        self.pool = await asyncpg.create_pool(
            host=self.config.host,
            port=self.config.port,
            database=self.config.database,
            user=self.config.user,
            password=self.config.password,
            min_size=2,
            max_size=self.config.pool_size,
            command_timeout=self.config.query_timeout
        )

        logger.info(
            "business_process_service_started",
            pool_size=self.config.pool_size
        )

    async def stop(self) -> None:
        """
        Stop the Business Process Service.

        Closes database connection pool.
        """
        logger.info("stopping_business_process_service")

        if self.pool:
            await self.pool.close()

        logger.info("business_process_service_stopped")

    async def map_assets_to_processes(
        self,
        assets: List[str],
        customer_id: str
    ) -> List[str]:
        """
        Map affected assets to business process IDs.

        Queries the business process graph to find which business processes
        are associated with the given assets (hostnames, IPs, system names).

        Example:
            Input: ["server-1", "database-2"]
            Output: ["claims-adjudication", "edi-837-processing"]

        Args:
            assets: List of asset names/hostnames/IPs
            customer_id: Customer for tenant isolation

        Returns:
            List of unique business process IDs
        """
        logger.debug(
            "mapping_assets_to_processes",
            asset_count=len(assets),
            customer_id=customer_id
        )

        # Check cache
        cache_key = (customer_id, tuple(sorted(assets)))
        if cache_key in self._cache:
            self._cache_hits += 1
            logger.debug("cache_hit", cache_key=cache_key)
            return list(self._cache[cache_key])

        self._cache_misses += 1

        # Query business process graph
        business_processes = await self._query_asset_mapping(assets, customer_id)

        # Cache result
        self._cache[cache_key] = business_processes

        logger.debug(
            "assets_mapped",
            asset_count=len(assets),
            process_count=len(business_processes),
            cache_hit=self._cache_hits,
            cache_miss=self._cache_misses
        )

        return business_processes

    async def _query_asset_mapping(
        self,
        assets: List[str],
        customer_id: str
    ) -> List[str]:
        """
        Query database for asset-to-process mapping.

        Args:
            assets: List of asset names
            customer_id: Customer ID

        Returns:
            List of business process IDs
        """
        if not self.pool:
            raise RuntimeError("Database pool not initialized")

        # Build query to find business processes for given assets
        query = """
            SELECT DISTINCT
                bp.id AS process_id,
                bp.name AS process_name,
                bp.process_type,
                bp.tier
            FROM business_process_graph bpg
            CROSS JOIN LATERAL jsonb_array_elements(bpg.nodes) AS node
            JOIN LATERAL jsonb_to_record(node) AS bp(
                id TEXT,
                name TEXT,
                type TEXT,
                hostname TEXT,
                ip_address TEXT,
                process_type TEXT,
                tier INT
            ) ON TRUE
            WHERE bpg.customer_id = $1
              AND (bp.hostname = ANY($2) OR bp.ip_address = ANY($2) OR bp.id = ANY($2))
            ORDER BY bp.tier ASC, bp.name ASC;
        """

        try:
            async with self.pool.acquire() as conn:
                rows = await conn.fetch(query, customer_id, assets)

            business_processes = [
                row['process_id'] for row in rows
            ]

            logger.debug(
                "database_query_successful",
                row_count=len(business_processes)
            )

            return business_processes

        except Exception as e:
            logger.error(
                "database_query_failed",
                error=str(e)
            )
            raise

    async def get_process_criticality(
        self,
        process_id: str,
        customer_id: str
    ) -> float:
        """
        Get criticality score for a business process (0.0 - 1.0).

        Criticality is calculated based on:
        - Tier (Crown Jewel = 1.0, Critical = 0.8, Important = 0.6, Standard = 0.4)
        - Downtime cost per day
        - Number of dependent processes
        - Premium revenue at risk

        Args:
            process_id: Business process ID
            customer_id: Customer for tenant isolation

        Returns:
            Criticality score (0.0 - 1.0)
        """
        logger.debug(
            "getting_process_criticality",
            process_id=process_id,
            customer_id=customer_id
        )

        # Check cache
        cache_key = (customer_id, process_id)
        if cache_key in self._cache:
            self._cache_hits += 1
            return self._cache[cache_key]

        self._cache_misses += 1

        # Query database for process details
        process_details = await self._query_process_details(process_id, customer_id)

        # Calculate criticality score
        criticality_score = self._calculate_criticality_score(process_details)

        # Cache result
        self._cache[cache_key] = criticality_score

        logger.debug(
            "process_criticality_calculated",
            process_id=process_id,
            criticality_score=criticality_score
        )

        return criticality_score

    async def _query_process_details(
        self,
        process_id: str,
        customer_id: str
    ) -> Dict[str, Any]:
        """
        Query database for process details.

        Args:
            process_id: Business process ID
            customer_id: Customer ID

        Returns:
            Process details dictionary
        """
        if not self.pool:
            raise RuntimeError("Database pool not initialized")

        query = """
            SELECT
                bp.id,
                bp.name,
                bp.type,
                bp.process_type,
                bp.hostname,
                bp.ip_address,
                bp.tier,
                bp.downtime_cost_per_day,
                bp.downtime_cost_source,
                bp.downtime_cost_confidence,
                bp.dependencies,
                bp.dependents
            FROM business_process_graph bpg
            CROSS JOIN LATERAL jsonb_array_elements(bpg.nodes) AS node
            JOIN LATERAL jsonb_to_record(node) AS bp(
                id TEXT,
                name TEXT,
                type TEXT,
                process_type TEXT,
                hostname TEXT,
                ip_address TEXT,
                tier INT,
                downtime_cost_per_day NUMERIC,
                downtime_cost_source TEXT,
                downtime_cost_confidence NUMERIC,
                dependencies TEXT[],
                dependents TEXT[]
            ) ON TRUE
            WHERE bpg.customer_id = $1
              AND bp.id = $2;
        """

        try:
            async with self.pool.acquire() as conn:
                row = await conn.fetchrow(query, customer_id, process_id)

            if not row:
                logger.warning(
                    "process_not_found",
                    process_id=process_id,
                    customer_id=customer_id
                )
                return {}

            return dict(row)

        except Exception as e:
            logger.error(
                "process_query_failed",
                process_id=process_id,
                error=str(e)
            )
            raise

    def _calculate_criticality_score(self, process_details: Dict[str, Any]) -> float:
        """
        Calculate criticality score from process details.

        Score calculation:
        - Tier score: 40% (Crown Jewel = 1.0, Critical = 0.8, Important = 0.6, Standard = 0.4)
        - Downtime cost: 30% (normalized to 0-1 based on $1M max)
        - Dependent processes: 20% (normalized to 0-1 based on 100 max)
        - Confidence: 10% (downtime_cost_confidence)

        Args:
            process_details: Process details from database

        Returns:
            Criticality score (0.0 - 1.0)
        """
        if not process_details:
            return 0.0

        # Tier score (40% weight)
        tier = process_details.get('tier', 4)
        tier_score = {
            1: 1.0,  # Crown Jewel
            2: 0.8,  # Critical
            3: 0.6,  # Important
            4: 0.4   # Standard
        }.get(tier, 0.4)

        # Downtime cost score (30% weight)
        downtime_cost = float(process_details.get('downtime_cost_per_day', 0))
        downtime_cost_score = min(downtime_cost / 1_000_000, 1.0)  # Normalize to $1M max

        # Dependent processes score (20% weight)
        dependencies = process_details.get('dependencies', [])
        dependents = process_details.get('dependents', [])
        total_dependents = len(dependencies) + len(dependents)
        dependents_score = min(total_dependents / 100, 1.0)  # Normalize to 100 max

        # Confidence score (10% weight)
        confidence = float(process_details.get('downtime_cost_confidence', 0.5))

        # Calculate weighted score
        criticality_score = (
            (tier_score * 0.4) +
            (downtime_cost_score * 0.3) +
            (dependents_score * 0.2) +
            (confidence * 0.1)
        )

        return criticality_score

    async def identify_crown_jewels(
        self,
        process_ids: List[str],
        customer_id: str
    ) -> List[str]:
        """
        Identify crown jewel processes from list.

        Crown jewels are processes with tier = 1 (most critical).

        Args:
            process_ids: List of business process IDs
            customer_id: Customer for tenant isolation

        Returns:
            List of crown jewel process IDs
        """
        logger.debug(
            "identifying_crown_jewels",
            process_count=len(process_ids),
            customer_id=customer_id
        )

        if not process_ids:
            return []

        # Query database for crown jewel processes
        crown_jewels = await self._query_crown_jewels(process_ids, customer_id)

        logger.debug(
            "crown_jewels_identified",
            crown_jewel_count=len(crown_jewels)
        )

        return crown_jewels

    async def _query_crown_jewels(
        self,
        process_ids: List[str],
        customer_id: str
    ) -> List[str]:
        """
        Query database for crown jewel processes.

        Args:
            process_ids: List of process IDs
            customer_id: Customer ID

        Returns:
            List of crown jewel process IDs
        """
        if not self.pool:
            raise RuntimeError("Database pool not initialized")

        query = """
            SELECT DISTINCT
                bp.id AS process_id
            FROM business_process_graph bpg
            CROSS JOIN LATERAL jsonb_array_elements(bpg.nodes) AS node
            JOIN LATERAL jsonb_to_record(node) AS bp(
                id TEXT,
                tier INT
            ) ON TRUE
            WHERE bpg.customer_id = $1
              AND bp.id = ANY($2)
              AND bp.tier = 1;
        """

        try:
            async with self.pool.acquire() as conn:
                rows = await conn.fetch(query, customer_id, process_ids)

            crown_jewels = [row['process_id'] for row in rows]

            return crown_jewels

        except Exception as e:
            logger.error(
                "crown_jewel_query_failed",
                error=str(e)
            )
            raise

    def get_cache_stats(self) -> Dict[str, Any]:
        """
        Get cache statistics.

        Returns:
            Cache statistics dictionary
        """
        total_requests = self._cache_hits + self._cache_misses
        hit_rate = self._cache_hits / total_requests if total_requests > 0 else 0.0

        return {
            "cache_hits": self._cache_hits,
            "cache_misses": self._cache_misses,
            "hit_rate": hit_rate,
            "cache_size": len(self._cache)
        }
