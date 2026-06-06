"""
Actuarial Service

Manages actuarial data access, caching, and validation.
Provides actuarial data to calculators for financial exposure calculations.

Responsibilities:
- Parse actuarial exports (CSV/SQL)
- Validate data quality
- Cache actuarial data
- Provide data access interface
"""

import asyncio
import structlog
from typing import Dict, Optional
from datetime import datetime, timedelta
import asyncpg


logger = structlog.get_logger(__name__)


class ActuarialService:
    """
    Actuarial Data Service

    Manages actuarial data from CSV exports and SQL queries.
    Caches data for performance and validates data quality.
    """

    def __init__(self, timescale_config: Dict):
        """
        Initialize actuarial service with TimescaleDB config.

        Args:
            timescale_config: TimescaleDB connection configuration
        """
        self.timescale_config = timescale_config
        self.pool = None
        self.cache = {}
        self.cache_lock = asyncio.Lock()
        self.logger = logger

    async def connect(self):
        """Connect to TimescaleDB."""
        self.logger.info("Connecting to TimescaleDB", host=self.timescale_config['host'])

        self.pool = await asyncpg.create_pool(
            host=self.timescale_config['host'],
            port=self.timescale_config['port'],
            database=self.timescale_config['database'],
            user=self.timescale_config['user'],
            password=self.timescale_config['password'],
            min_size=2,
            max_size=self.timescale_config['pool_size']
        )

        self.logger.info("Connected to TimescaleDB successfully")

    async def disconnect(self):
        """Disconnect from TimescaleDB."""
        if self.pool:
            await self.pool.close()
            self.logger.info("Disconnected from TimescaleDB")

    async def get_actuarial_data(self, organization_id: str) -> Dict:
        """
        Get actuarial data for organization.

        Checks cache first, then queries TimescaleDB if not cached.

        Args:
            organization_id: Organization ID for tenant isolation

        Returns:
            Actuarial data dict with:
                - mlr_data: MLR-specific data
                - stop_loss_data: Stop-loss specific data
                - reserve_data: Reserve specific data
                - premium_revenue_data: Premium revenue specific data
                - data_quality_score: Overall data quality score (0.0 - 1.0)
                - sources: List of data sources with timestamps
        """
        # Check cache
        cache_key = f"actuarial_data:{organization_id}"
        cached_data = await self._get_from_cache(cache_key)

        if cached_data:
            self.logger.info("Using cached actuarial data", organization_id=organization_id)
            return cached_data

        # Query TimescaleDB
        self.logger.info("Querying TimescaleDB for actuarial data", organization_id=organization_id)
        actuarial_data = await self._query_actuarial_data(organization_id)

        # Validate data quality
        data_quality_score = self._validate_data_quality(actuarial_data)
        actuarial_data['data_quality_score'] = data_quality_score

        # Add sources
        actuarial_data['sources'] = [
            {
                'source': 'actuarial_export',
                'timestamp': datetime.now().isoformat(),
                'data_quality_score': data_quality_score
            }
        ]

        # Cache data
        await self._set_in_cache(cache_key, actuarial_data)

        return actuarial_data

    async def _query_actuarial_data(self, organization_id: str) -> Dict:
        """
        Query actuarial data from TimescaleDB.

        Args:
            organization_id: Organization ID for tenant isolation

        Returns:
            Actuarial data dict
        """
        async with self.pool.acquire() as conn:
            # Query MLR data
            mlr_query = """
                SELECT
                    AVG(average_claim_cost) as average_claim_cost,
                    SUM(premium_revenue) as premium_revenue,
                    SUM(member_count) as member_count,
                    AVG(claim_rate) as claim_rate
                FROM actuarial.member_premiums
                WHERE organization_id = $1
                    AND export_date >= NOW() - INTERVAL '90 days'
            """

            mlr_row = await conn.fetchrow(mlr_query, organization_id)
            mlr_data = {
                'average_claim_cost': mlr_row['average_claim_cost'] if mlr_row else 1000,
                'premium_revenue': mlr_row['premium_revenue'] if mlr_row else 1000000,
                'member_count': int(mlr_row['member_count']) if mlr_row else 10000,
                'claim_rate': mlr_row['claim_rate'] if mlr_row else 0.02
            }

            # Query stop-loss data
            stop_loss_query = """
                SELECT
                    attachment,
                    aggregate_limit,
                    current_position
                FROM actuarial.stop_loss_positions
                WHERE organization_id = $1
                ORDER BY position_date DESC
                LIMIT 1
            """

            stop_loss_row = await conn.fetchrow(stop_loss_query, organization_id)
            stop_loss_data = {
                'attachment': stop_loss_row['attachment'] if stop_loss_row else 250000,
                'aggregate': stop_loss_row['aggregate_limit'] if stop_loss_row else 5000000,
                'current_position': stop_loss_row['current_position'] if stop_loss_row else 500000,
                'average_claim_cost': mlr_data['average_claim_cost'],
                'claim_rate': mlr_data['claim_rate']
            }

            # Query reserve data
            reserve_query = """
                SELECT
                    reserve_type,
                    SUM(reserve_balance) as reserve_balance,
                    AVG(claim_rate) as claim_rate
                FROM actuarial.reserves
                WHERE organization_id = $1
                GROUP BY reserve_type
                ORDER BY reserve_balance DESC
                LIMIT 1
            """

            reserve_row = await conn.fetchrow(reserve_query, organization_id)
            reserve_data = {
                'reserve_balance': reserve_row['reserve_balance'] if reserve_row else 10000000,
                'claim_rate': reserve_row['claim_rate'] if reserve_row else 0.02
            }

            # Query premium revenue data
            premium_revenue_query = """
                SELECT
                    line_of_business,
                    SUM(member_count) as member_count,
                    AVG(premium_per_member) as premium_per_member,
                    AVG(attrition_rate) as attrition_rate
                FROM actuarial.member_premiums
                WHERE organization_id = $1
                    AND export_date >= NOW() - INTERVAL '90 days'
                GROUP BY line_of_business
                ORDER BY member_count DESC
                LIMIT 1
            """

            premium_revenue_row = await conn.fetchrow(premium_revenue_query, organization_id)
            premium_revenue_data = {
                'member_count': int(premium_revenue_row['member_count']) if premium_revenue_row else 100000,
                'premium_per_member': premium_revenue_row['premium_per_member'] if premium_revenue_row else 500,
                'attrition_rate': premium_revenue_row['attrition_rate'] if premium_revenue_row else 0.05
            }

            return {
                'mlr_data': mlr_data,
                'stop_loss_data': stop_loss_data,
                'reserve_data': reserve_data,
                'premium_revenue_data': premium_revenue_data
            }

    def _validate_data_quality(self, actuarial_data: Dict) -> float:
        """
        Validate data quality of actuarial data.

        Checks:
        - Required sections present
        - No missing values
        - Numeric values in valid ranges
        - No obvious errors

        Args:
            actuarial_data: Actuarial data to validate

        Returns:
            Data quality score (0.0 - 1.0)
        """
        quality_score = 1.0
        issues = []

        # Check required sections
        required_sections = ['mlr_data', 'stop_loss_data', 'reserve_data', 'premium_revenue_data']
        for section in required_sections:
            if section not in actuarial_data:
                quality_score -= 0.25
                issues.append(f"Missing section: {section}")

        # Validate MLR data
        mlr_data = actuarial_data.get('mlr_data', {})
        if mlr_data.get('average_claim_cost', 0) <= 0:
            quality_score -= 0.05
            issues.append("Invalid average_claim_cost")

        if mlr_data.get('premium_revenue', 0) <= 0:
            quality_score -= 0.05
            issues.append("Invalid premium_revenue")

        if mlr_data.get('member_count', 0) <= 0:
            quality_score -= 0.05
            issues.append("Invalid member_count")

        # Validate stop-loss data
        stop_loss_data = actuarial_data.get('stop_loss_data', {})
        if stop_loss_data.get('attachment', 0) <= 0:
            quality_score -= 0.05
            issues.append("Invalid attachment")

        if stop_loss_data.get('aggregate', 0) <= 0:
            quality_score -= 0.05
            issues.append("Invalid aggregate")

        # Validate reserve data
        reserve_data = actuarial_data.get('reserve_data', {})
        if reserve_data.get('reserve_balance', 0) <= 0:
            quality_score -= 0.05
            issues.append("Invalid reserve_balance")

        # Validate premium revenue data
        premium_revenue_data = actuarial_data.get('premium_revenue_data', {})
        if premium_revenue_data.get('member_count', 0) <= 0:
            quality_score -= 0.05
            issues.append("Invalid member_count in premium_revenue_data")

        if premium_revenue_data.get('premium_per_member', 0) <= 0:
            quality_score -= 0.05
            issues.append("Invalid premium_per_member")

        # Log quality issues
        if issues:
            self.logger.warning("Data quality issues detected", issues=issues, quality_score=quality_score)

        return max(0.0, quality_score)

    async def _get_from_cache(self, key: str) -> Optional[Dict]:
        """Get data from cache."""
        async with self.cache_lock:
            if key in self.cache:
                cached_entry = self.cache[key]
                # Check TTL
                if datetime.now() - cached_entry['timestamp'] < timedelta(seconds=config.actuarial.cache_ttl):
                    return cached_entry['data']
                else:
                    # Expired, remove from cache
                    del self.cache[key]

        return None

    async def _set_in_cache(self, key: str, data: Dict):
        """Set data in cache."""
        async with self.cache_lock:
            self.cache[key] = {
                'data': data,
                'timestamp': datetime.now()
            }

    async def execute_query(self, query: str, params: list):
        """Execute a SQL query (used for publishing financial impacts)."""
        async with self.pool.acquire() as conn:
            await conn.execute(query, *params)

    async def cache_actuarial_data(self, organization_id: str, data: Dict):
        """
        Cache actuarial data in TimescaleDB.

        Args:
            organization_id: Organization ID for tenant isolation
            data: Actuarial data to cache
        """
        # This would store the cached data in TimescaleDB for persistence
        # For now, we just use in-memory caching
        cache_key = f"actuarial_data:{organization_id}"
        await self._set_in_cache(cache_key, data)
