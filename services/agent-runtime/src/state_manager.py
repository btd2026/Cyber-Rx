"""
Agent State Manager

Manages persistent agent state in database, including agent lifecycle,
briefing storage, and metrics tracking.
"""
import asyncpg
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from uuid import uuid4
from src.models import AgentState, AgentBriefing, AgentMetrics, AgentConfig, AgentStatus, AgentType


logger = logging.getLogger(__name__)


class StateManager:
    """
    Manages agent state persistence in database.

    Features:
    - Agent state persistence across restarts
    - Briefing storage with metadata
    - Metrics tracking (briefings, tokens, costs)
    - Previous briefings retrieval for context
    - Agent lifecycle tracking
    """

    def __init__(self, db_pool: asyncpg.Pool):
        """
        Initialize state manager with database pool.

        Args:
            db_pool: PostgreSQL connection pool
        """
        self.db_pool = db_pool
        logger.info("State manager initialized")

    async def load_agent_state(self, agent_id: str) -> Optional[AgentState]:
        """
        Load agent state from database.

        Args:
            agent_id: Agent identifier

        Returns:
            AgentState: Agent state if exists, None otherwise
        """
        try:
            async with self.db_pool.acquire() as conn:
                row = await conn.fetchrow(
                    """
                    SELECT
                        agent_id,
                        agent_type,
                        status,
                        config,
                        state,
                        created_at,
                        updated_at,
                        last_briefing_id,
                        briefings_generated,
                        total_tokens_used,
                        total_cost
                    FROM agent_states
                    WHERE agent_id = $1
                    """,
                    agent_id
                )

                if not row:
                    logger.info(f"No existing state found for agent {agent_id}")
                    return None

                # Parse and return agent state
                agent_state = AgentState(
                    agent_id=row['agent_id'],
                    agent_type=AgentType(row['agent_type']),
                    status=AgentStatus(row['status']),
                    config=AgentConfig(**row['config']),
                    state=row['state'],
                    created_at=row['created_at'],
                    updated_at=row['updated_at'],
                    last_briefing_id=row['last_briefing_id'],
                    briefings_generated=row['briefings_generated'],
                    total_tokens_used=row['total_tokens_used'],
                    total_cost=row['total_cost']
                )

                logger.info(f"Loaded state for agent {agent_id}")
                return agent_state

        except Exception as e:
            logger.error(f"Failed to load agent state for {agent_id}: {e}")
            raise

    async def save_agent_state(self, agent_id: str, state: AgentState) -> None:
        """
        Save agent state to database.

        Args:
            agent_id: Agent identifier
            state: Agent state to save
        """
        try:
            async with self.db_pool.acquire() as conn:
                await conn.execute(
                    """
                    INSERT INTO agent_states (
                        agent_id, agent_type, status, config, state,
                        created_at, updated_at, last_briefing_id,
                        briefings_generated, total_tokens_used, total_cost
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    ON CONFLICT (agent_id) DO UPDATE SET
                        agent_type = EXCLUDED.agent_type,
                        status = EXCLUDED.status,
                        config = EXCLUDED.config,
                        state = EXCLUDED.state,
                        updated_at = EXCLUDED.updated_at,
                        last_briefing_id = EXCLUDED.last_briefing_id,
                        briefings_generated = EXCLUDED.briefings_generated,
                        total_tokens_used = EXCLUDED.total_tokens_used,
                        total_cost = EXCLUDED.total_cost
                    """,
                    agent_id,
                    state.agent_type.value,
                    state.status.value,
                    state.config.model_dump(),
                    state.state,
                    state.created_at,
                    state.updated_at,
                    state.last_briefing_id,
                    state.briefings_generated,
                    state.total_tokens_used,
                    state.total_cost
                )

                logger.info(f"Saved state for agent {agent_id}")

        except Exception as e:
            logger.error(f"Failed to save agent state for {agent_id}: {e}")
            raise

    async def store_briefing(
        self,
        agent_id: str,
        query: str,
        context: Dict[str, Any],
        briefing: Dict[str, Any],
        token_cost: float,
        input_tokens: int,
        output_tokens: int
    ) -> str:
        """
        Store briefing in database.

        Args:
            agent_id: Agent identifier
            query: Executive query
            context: Agent context used
            briefing: Generated briefing
            token_cost: Cost in USD
            input_tokens: Input tokens used
            output_tokens: Output tokens used

        Returns:
            str: Briefing ID
        """
        try:
            briefing_id = str(uuid4())
            generated_at = datetime.utcnow()

            async with self.db_pool.acquire() as conn:
                await conn.execute(
                    """
                    INSERT INTO agent_briefings (
                        briefing_id, agent_id, query, context, briefing,
                        generated_at, token_cost, input_tokens, output_tokens
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    """,
                    briefing_id,
                    agent_id,
                    query,
                    context,
                    briefing,
                    generated_at,
                    token_cost,
                    input_tokens,
                    output_tokens
                )

                # Update agent state with latest briefing
                await conn.execute(
                    """
                    UPDATE agent_states
                    SET
                        last_briefing_id = $1,
                        briefings_generated = briefings_generated + 1,
                        updated_at = $2
                    WHERE agent_id = $3
                    """,
                    briefing_id,
                    generated_at,
                    agent_id
                )

                logger.info(f"Stored briefing {briefing_id} for agent {agent_id}")
                return briefing_id

        except Exception as e:
            logger.error(f"Failed to store briefing for agent {agent_id}: {e}")
            raise

    async def get_recent_briefings(
        self,
        agent_id: str,
        limit: int = 10
    ) -> List[AgentBriefing]:
        """
        Get recent briefings for agent.

        Args:
            agent_id: Agent identifier
            limit: Maximum number of briefings to return

        Returns:
            List[AgentBriefing]: Recent briefings
        """
        try:
            async with self.db_pool.acquire() as conn:
                rows = await conn.fetch(
                    """
                    SELECT
                        briefing_id, agent_id, query, context, briefing,
                        generated_at, token_cost, input_tokens, output_tokens
                    FROM agent_briefings
                    WHERE agent_id = $1
                    ORDER BY generated_at DESC
                    LIMIT $2
                    """,
                    agent_id,
                    limit
                )

                briefings = [
                    AgentBriefing(
                        briefing_id=row['briefing_id'],
                        agent_id=row['agent_id'],
                        query=row['query'],
                        context=row['context'],
                        briefing=row['briefing'],
                        generated_at=row['generated_at'],
                        token_cost=row['token_cost'],
                        input_tokens=row['input_tokens'],
                        output_tokens=row['output_tokens']
                    )
                    for row in rows
                ]

                logger.info(f"Retrieved {len(briefings)} recent briefings for agent {agent_id}")
                return briefings

        except Exception as e:
            logger.error(f"Failed to get recent briefings for agent {agent_id}: {e}")
            raise

    async def update_metrics(
        self,
        agent_id: str,
        tokens_used: int,
        cost: float
    ) -> None:
        """
        Update agent metrics.

        Args:
            agent_id: Agent identifier
            tokens_used: Tokens used in latest call
            cost: Cost of latest call
        """
        try:
            metric_date = date.today()

            async with self.db_pool.acquire() as conn:
                # Update agent state totals
                await conn.execute(
                    """
                    UPDATE agent_states
                    SET
                        total_tokens_used = total_tokens_used + $1,
                        total_cost = total_cost + $2,
                        updated_at = $3
                    WHERE agent_id = $4
                    """,
                    tokens_used,
                    cost,
                    datetime.utcnow(),
                    agent_id
                )

                # Update daily metrics
                await conn.execute(
                    """
                    INSERT INTO agent_metrics (
                        agent_id, metric_date, briefings_generated,
                        total_tokens_used, total_cost
                    ) VALUES ($1, $2, 1, $3, $4)
                    ON CONFLICT (agent_id, metric_date) DO UPDATE SET
                        briefings_generated = agent_metrics.briefings_generated + 1,
                        total_tokens_used = agent_metrics.total_tokens_used + $3,
                        total_cost = agent_metrics.total_cost + $4
                    """,
                    agent_id,
                    metric_date,
                    tokens_used,
                    cost
                )

                logger.info(f"Updated metrics for agent {agent_id}")

        except Exception as e:
            logger.error(f"Failed to update metrics for agent {agent_id}: {e}")
            raise

    async def get_metrics(
        self,
        agent_id: str,
        metric_date: date = None
    ) -> Optional[AgentMetrics]:
        """
        Get agent metrics.

        Args:
            agent_id: Agent identifier
            metric_date: Optional date for specific metrics (defaults to today)

        Returns:
            AgentMetrics: Metrics if found
        """
        try:
            if metric_date is None:
                metric_date = date.today()

            async with self.db_pool.acquire() as conn:
                row = await conn.fetchrow(
                    """
                    SELECT
                        agent_id, metric_date, briefings_generated,
                        total_tokens_used, total_cost
                    FROM agent_metrics
                    WHERE agent_id = $1 AND metric_date = $2
                    """,
                    agent_id,
                    metric_date
                )

                if not row:
                    return None

                metrics = AgentMetrics(
                    agent_id=row['agent_id'],
                    metric_date=row['metric_date'],
                    briefings_generated=row['briefings_generated'],
                    total_tokens_used=row['total_tokens_used'],
                    total_cost=row['total_cost']
                )

                logger.info(f"Retrieved metrics for agent {agent_id} on {metric_date}")
                return metrics

        except Exception as e:
            logger.error(f"Failed to get metrics for agent {agent_id}: {e}")
            raise

    async def delete_agent_state(self, agent_id: str) -> None:
        """
        Delete agent state (for cleanup/testing).

        Args:
            agent_id: Agent identifier
        """
        try:
            async with self.db_pool.acquire() as conn:
                await conn.execute(
                    "DELETE FROM agent_states WHERE agent_id = $1",
                    agent_id
                )
                logger.info(f"Deleted state for agent {agent_id}")

        except Exception as e:
            logger.error(f"Failed to delete agent state for {agent_id}: {e}")
            raise


# Singleton instance for use across the application
_state_manager_instance = None


def get_state_manager(db_pool: asyncpg.Pool) -> StateManager:
    """Get singleton state manager instance."""
    global _state_manager_instance
    if _state_manager_instance is None:
        _state_manager_instance = StateManager(db_pool)
    return _state_manager_instance
