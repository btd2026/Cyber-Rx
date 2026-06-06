"""
Blast Radius Analyzer - Calculates downstream impact from affected assets.

Uses BFS traversal of the business process graph to identify all downstream
systems and processes reachable from affected assets.
"""

import asyncio
from collections import deque
from typing import List, Dict, Any, Set, Optional

import asyncpg

import structlog

from ..config import TimescaleDBConfig


logger = structlog.get_logger(__name__)


class BlastRadiusAnalyzer:
    """
    Blast Radius Analyzer.

    Calculates downstream impact by traversing the business process graph
    to find all systems and processes reachable from affected assets.
    """

    def __init__(self, config: TimescaleDBConfig):
        """
        Initialize Blast Radius Analyzer.

        Args:
            config: TimescaleDB configuration
        """
        self.config = config

        # Connection pool (initialized in start())
        self.pool: Optional[asyncpg.Pool] = None

        # BFS configuration
        self.max_depth = 10
        self.bfs_timeout_seconds = 30

        logger.info("blast_radius_analyzer_initialized")

    async def start(self) -> None:
        """
        Start the Blast Radius Analyzer.

        Initializes database connection pool.
        """
        logger.info("starting_blast_radius_analyzer")

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
            "blast_radius_analyzer_started",
            pool_size=self.config.pool_size
        )

    async def stop(self) -> None:
        """
        Stop the Blast Radius Analyzer.

        Closes database connection pool.
        """
        logger.info("stopping_blast_radius_analyzer")

        if self.pool:
            await self.pool.close()

        logger.info("blast_radius_analyzer_stopped")

    async def calculate_blast_radius(
        self,
        risk_object: Dict[str, Any],
        customer_id: str
    ) -> List[str]:
        """
        Calculate blast radius from affected assets.

        Traverses business process graph from affected assets
        to find all downstream systems and processes.

        Args:
            risk_object: RiskObject with affected_assets
            customer_id: Customer for tenant isolation

        Returns:
            List of downstream system/process IDs reachable

        Example:
            Input: affected_assets=["server-1"]
            Output: ["database-1", "edi-gateway", "claims-system"]
        """
        affected_assets = risk_object.get('affected_assets', [])

        logger.debug(
            "calculating_blast_radius",
            asset_count=len(affected_assets),
            customer_id=customer_id
        )

        if not affected_assets:
            return []

        # BFS traversal to find downstream systems
        blast_radius = await self._bfs_traversal(affected_assets, customer_id)

        logger.debug(
            "blast_radius_calculated",
            blast_radius_size=len(blast_radius)
        )

        return blast_radius

    async def _bfs_traversal(
        self,
        start_nodes: List[str],
        customer_id: str
    ) -> List[str]:
        """
        BFS traversal to find downstream systems.

        Args:
            start_nodes: Starting nodes (affected assets)
            customer_id: Customer for tenant isolation

        Returns:
            List of reachable system IDs
        """
        visited = set()
        queue = deque(start_nodes)
        blast_radius = set()

        # Track depth for each node
        depth = {node: 0 for node in start_nodes}

        while queue:
            current = queue.popleft()

            if current in visited:
                continue

            visited.add(current)

            # Check depth limit
            if depth[current] >= self.max_depth:
                logger.debug(
                    "max_depth_reached",
                    node=current,
                    depth=depth[current]
                )
                continue

            # Query downstream dependencies
            try:
                downstream = await self._get_downstream_dependencies(
                    current,
                    customer_id
                )

                for system in downstream:
                    if system not in visited:
                        queue.append(system)
                        depth[system] = depth[current] + 1
                        blast_radius.add(system)

            except Exception as e:
                logger.error(
                    "downstream_query_failed",
                    node=current,
                    error=str(e)
                )

        return list(blast_radius)

    async def _get_downstream_dependencies(
        self,
        node_id: str,
        customer_id: str
    ) -> List[str]:
        """
        Query downstream dependencies from business process graph.

        Args:
            node_id: Current node ID
            customer_id: Customer ID

        Returns:
            List of downstream system IDs
        """
        if not self.pool:
            raise RuntimeError("Database pool not initialized")

        # Query edges to find downstream dependencies
        query = """
            SELECT
                edge.to AS downstream_id
            FROM business_process_graph bpg
            CROSS JOIN LATERAL jsonb_array_elements(bpg.edges) AS edge_json
            JOIN LATERAL jsonb_to_record(edge_json) AS edge(
                id TEXT,
                "from" TEXT,
                "to" TEXT,
                edge_type TEXT
            ) ON TRUE
            WHERE bpg.customer_id = $1
              AND edge.from = $2;
        """

        # Also query nodes for dependencies
        node_query = """
            SELECT
                bp.dependencies
            FROM business_process_graph bpg
            CROSS JOIN LATERAL jsonb_array_elements(bpg.nodes) AS node_json
            JOIN LATERAL jsonb_to_record(node_json) AS bp(
                id TEXT,
                dependencies TEXT[]
            ) ON TRUE
            WHERE bpg.customer_id = $1
              AND bp.id = $2;
        """

        try:
            async with self.pool.acquire() as conn:
                # Query edges
                edge_rows = await conn.fetch(query, customer_id, node_id)

                # Query node dependencies
                node_row = await conn.fetchrow(node_query, customer_id, node_id)

            # Combine results
            downstream = set()

            # Add from edges
            for row in edge_rows:
                downstream.add(row['downstream_id'])

            # Add from node dependencies
            if node_row:
                dependencies = node_row['dependencies']
                if dependencies:
                    downstream.update(dependencies)

            return list(downstream)

        except Exception as e:
            logger.error(
                "downstream_query_failed",
                node_id=node_id,
                error=str(e)
            )
            raise

    async def calculate_blast_radius_criticality(
        self,
        blast_radius: List[str],
        customer_id: str
    ) -> float:
        """
        Calculate criticality score of blast radius (0.0 - 1.0).

        Based on:
        - Number of crown jewels in blast radius
        - Total downtime cost per day
        - Premium revenue at risk
        - Number of affected members

        Args:
            blast_radius: List of system/process IDs
            customer_id: Customer for tenant isolation

        Returns:
            Criticality score (0.0 - 1.0)
        """
        logger.debug(
            "calculating_blast_radius_criticality",
            blast_radius_size=len(blast_radius),
            customer_id=customer_id
        )

        if not blast_radius:
            return 0.0

        # Query process details for all nodes in blast radius
        process_details_list = await self._query_process_details_batch(
            blast_radius,
            customer_id
        )

        # Calculate criticality
        criticality_score = self._aggregate_criticality(process_details_list)

        logger.debug(
            "blast_radius_criticality_calculated",
            criticality_score=criticality_score
        )

        return criticality_score

    async def _query_process_details_batch(
        self,
        process_ids: List[str],
        customer_id: str
    ) -> List[Dict[str, Any]]:
        """
        Query database for process details (batch).

        Args:
            process_ids: List of process IDs
            customer_id: Customer ID

        Returns:
            List of process details
        """
        if not self.pool:
            raise RuntimeError("Database pool not initialized")

        query = """
            SELECT
                bp.id,
                bp.name,
                bp.tier,
                bp.downtime_cost_per_day,
                bp.downtime_cost_confidence,
                bp.dependencies,
                bp.dependents
            FROM business_process_graph bpg
            CROSS JOIN LATERAL jsonb_array_elements(bpg.nodes) AS node_json
            JOIN LATERAL jsonb_to_record(node_json) AS bp(
                id TEXT,
                name TEXT,
                tier INT,
                downtime_cost_per_day NUMERIC,
                downtime_cost_confidence NUMERIC,
                dependencies TEXT[],
                dependents TEXT[]
            ) ON TRUE
            WHERE bpg.customer_id = $1
              AND bp.id = ANY($2);
        """

        try:
            async with self.pool.acquire() as conn:
                rows = await conn.fetch(query, customer_id, process_ids)

            process_details_list = [dict(row) for row in rows]

            return process_details_list

        except Exception as e:
            logger.error(
                "process_batch_query_failed",
                error=str(e)
            )
            raise

    def _aggregate_criticality(
        self,
        process_details_list: List[Dict[str, Any]]
    ) -> float:
        """
        Aggregate criticality from multiple process details.

        Args:
            process_details_list: List of process details

        Returns:
            Aggregated criticality score (0.0 - 1.0)
        """
        if not process_details_list:
            return 0.0

        # Count crown jewels (tier = 1)
        crown_jewel_count = sum(
            1 for p in process_details_list
            if p.get('tier') == 1
        )

        # Sum downtime costs
        total_downtime_cost = sum(
            float(p.get('downtime_cost_per_day', 0))
            for p in process_details_list
        )

        # Calculate criticality score
        # Crown jewels: 40% weight (max 10 = 1.0)
        crown_jewel_score = min(crown_jewel_count / 10, 1.0) * 0.4

        # Downtime cost: 40% weight (max $10M = 1.0)
        downtime_cost_score = min(total_downtime_cost / 10_000_000, 1.0) * 0.4

        # Number of processes: 20% weight (max 100 = 1.0)
        process_count_score = min(len(process_details_list) / 100, 1.0) * 0.2

        # Aggregate score
        criticality_score = (
            crown_jewel_score +
            downtime_cost_score +
            process_count_score
        )

        return criticality_score

    async def find_attack_paths(
        self,
        source: str,
        target: str,
        customer_id: str
    ) -> List[List[str]]:
        """
        Find attack paths from source to target in business process graph.

        Uses breadth-first search with depth limit (max 10 hops).

        Args:
            source: Source system/process ID
            target: Target system/process ID
            customer_id: Customer for tenant isolation

        Returns:
            List of attack paths (each path is list of IDs)
        """
        logger.debug(
            "finding_attack_paths",
            source=source,
            target=target,
            customer_id=customer_id
        )

        # BFS to find shortest paths
        paths = await self._bfs_find_paths(source, target, customer_id)

        logger.debug(
            "attack_paths_found",
            path_count=len(paths)
        )

        return paths

    async def _bfs_find_paths(
        self,
        source: str,
        target: str,
        customer_id: str,
        max_paths: int = 10
    ) -> List[List[str]]:
        """
        BFS to find all paths from source to target.

        Args:
            source: Source node ID
            target: Target node ID
            customer_id: Customer ID
            max_paths: Maximum number of paths to return

        Returns:
            List of paths (each path is list of node IDs)
        """
        if not self.pool:
            raise RuntimeError("Database pool not initialized")

        # BFS queue stores (current_node, path_so_far)
        queue = deque([(source, [source])])
        paths_found = []
        visited = set()

        while queue and len(paths_found) < max_paths:
            current, path = queue.popleft()

            if current in visited:
                continue

            visited.add(current)

            # Check if we reached target
            if current == target:
                paths_found.append(path)
                continue

            # Check depth limit
            if len(path) >= self.max_depth:
                continue

            # Get neighbors
            try:
                neighbors = await self._get_downstream_dependencies(
                    current,
                    customer_id
                )

                for neighbor in neighbors:
                    if neighbor not in visited:
                        queue.append((neighbor, path + [neighbor]))

            except Exception as e:
                logger.error(
                    "neighbor_query_failed",
                    node=current,
                    error=str(e)
                )

        return paths_found
