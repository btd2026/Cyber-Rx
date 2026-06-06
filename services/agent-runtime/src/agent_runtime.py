"""
Agent Runtime Container

The core orchestrator for AI agents. Manages agent lifecycle, coordinates
LLM calls with prompt templates, and returns structured briefings.
"""
import logging
from typing import Dict, Any, Optional
from datetime import datetime
from uuid import uuid4

from src.models import (
    AgentState, AgentConfig, AgentStatus, AgentType, AgentBriefing,
    TimeRange, LLMAPIError, PHIValidationError
)
from src.state_manager import get_state_manager
from src.context_manager import get_context_manager
from src.claude_client import get_claude_client
from src.prompt_manager import get_prompt_manager
from src.output_formatter import get_output_formatter
from src.phi_validator import get_phi_validator


logger = logging.getLogger(__name__)


class AgentRuntime:
    """
    Agent Runtime Container - The core orchestrator for AI agents.

    This is the MAIN component that agents use. It coordinates:
    1. Agent lifecycle (start, stop, query)
    2. Persistent state management
    3. LLM calls with prompt templates
    4. PHI validation (security boundary)
    5. Structured output formatting
    6. Metrics tracking

    Usage:
        runtime = AgentRuntime(db_pool, claude_api_key)
        await runtime.start_agent("cfo", AgentConfig(temperature=0.7))
        briefing = await runtime.query_agent("cfo", "What's our exposure?", {...})
    """

    def __init__(
        self,
        db_pool,
        claude_api_key: str,
        claude_model: str = "claude-3-5-sonnet-20241022"
    ):
        """
        Initialize agent runtime with services.

        Args:
            db_pool: PostgreSQL connection pool
            claude_api_key: Anthropic API key
            claude_model: Claude model to use
        """
        self.db_pool = db_pool

        # Initialize services
        self.state_manager = get_state_manager(db_pool)
        self.context_manager = get_context_manager(db_pool)
        self.claude_client = get_claude_client(claude_api_key, claude_model)
        self.prompt_manager = get_prompt_manager()
        self.output_formatter = get_output_formatter()
        self.phi_validator = get_phi_validator()

        logger.info("Agent Runtime initialized")

    async def start_agent(
        self,
        agent_id: str,
        config: AgentConfig
    ) -> AgentState:
        """
        Initialize and start an agent with configuration.

        Args:
            agent_id: Agent identifier (e.g., "cfo", "ciso", "board")
            config: Agent configuration

        Returns:
            AgentState: Initial agent state
        """
        try:
            logger.info(f"Starting agent {agent_id}")

            # Check if agent already exists
            existing_state = await self.state_manager.load_agent_state(agent_id)

            if existing_state:
                # Update existing agent
                existing_state.status = AgentStatus.RUNNING
                existing_state.config = config
                existing_state.updated_at = datetime.utcnow()
                await self.state_manager.save_agent_state(agent_id, existing_state)
                logger.info(f"Restarted existing agent {agent_id}")
                return existing_state

            # Create new agent state
            agent_type = self._get_agent_type(agent_id)
            new_state = AgentState(
                agent_id=agent_id,
                agent_type=agent_type,
                status=AgentStatus.RUNNING,
                config=config,
                state={},
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )

            # Save to database
            await self.state_manager.save_agent_state(agent_id, new_state)

            logger.info(f"Started new agent {agent_id} (type: {agent_type})")
            return new_state

        except Exception as e:
            logger.error(f"Failed to start agent {agent_id}: {e}")
            raise

    async def stop_agent(self, agent_id: str) -> None:
        """
        Stop an agent and persist final state.

        Args:
            agent_id: Agent identifier
        """
        try:
            logger.info(f"Stopping agent {agent_id}")

            # Load agent state
            agent_state = await self.state_manager.load_agent_state(agent_id)

            if not agent_state:
                logger.warning(f"Agent {agent_id} not found, nothing to stop")
                return

            # Update status
            agent_state.status = AgentStatus.STOPPED
            agent_state.updated_at = datetime.utcnow()

            # Save final state
            await self.state_manager.save_agent_state(agent_id, agent_state)

            logger.info(f"Stopped agent {agent_id}")

        except Exception as e:
            logger.error(f"Failed to stop agent {agent_id}: {e}")
            raise

    async def query_agent(
        self,
        agent_id: str,
        query: str,
        context: Dict[str, Any]
    ) -> AgentBriefing:
        """
        Query an agent and generate briefing.

        This is the CORE method that agents use:
        1. Load agent state
        2. Build complete context (PHI validated)
        3. Select appropriate prompt template
        4. Render prompt with context
        5. Call Claude LLM
        6. Parse structured output
        7. Store briefing in database
        8. Update agent state and metrics
        9. Return briefing

        Args:
            agent_id: Agent identifier
            query: Executive query (e.g., "What's our current exposure?")
            context: Additional context (time_range, risk_categories, etc.)

        Returns:
            AgentBriefing: Structured briefing with insights
        """
        try:
            logger.info(f"Querying agent {agent_id}: {query}")

            # 1. Load agent state
            agent_state = await self.state_manager.load_agent_state(agent_id)
            if not agent_state:
                raise Exception(f"Agent {agent_id} not found")

            # 2. Build complete context (includes PHI validation)
            time_range = TimeRange(
                start=context.get("time_start"),
                end=context.get("time_end")
            )

            complete_context = await self.context_manager.build_agent_context(
                agent_id=agent_id,
                query=query,
                time_range=time_range,
                risk_categories=context.get("risk_categories"),
                likelihood_min=context.get("likelihood_min", 0.0)
            )

            # 3. Load and render prompt template
            template_name = context.get("template", "briefing")
            rendered_prompt = self.prompt_manager.render_template_from_file(
                agent_id=agent_id,
                template_name=template_name,
                context={
                    "query": query,
                    "time_range": complete_context["time_range"],
                    "financial_impacts": complete_context["financial_impacts"],
                    "risk_objects": complete_context["risk_objects"],
                    "summary": complete_context["summary"]
                }
            )

            # 4. Call Claude LLM
            try:
                claude_response = await self.claude_client.call_claude(
                    prompt=rendered_prompt,
                    max_tokens=agent_state.config.max_tokens,
                    temperature=agent_state.config.temperature,
                    timeout=agent_state.config.timeout
                )
            except LLMAPIError as e:
                logger.error(f"Claude API call failed for agent {agent_id}: {e}")
                raise

            # 5. Parse structured output
            try:
                briefing_content = self.output_formatter.parse_structured_output(
                    llm_response=claude_response.text
                )
            except Exception as e:
                logger.error(f"Failed to parse structured output: {e}")
                raise

            # 6. Format briefing
            briefing = {
                "briefing_id": str(uuid4()),
                "agent_id": agent_id,
                "query": query,
                "context": complete_context,
                "briefing": briefing_content,
                "generated_at": datetime.utcnow(),
                "token_cost": self.claude_client.estimate_cost(
                    claude_response.input_tokens,
                    claude_response.output_tokens
                )
            }

            # 7. Store briefing in database
            briefing_id = await self.state_manager.store_briefing(
                agent_id=agent_id,
                query=query,
                context=complete_context,
                briefing=briefing_content,
                token_cost=briefing["token_cost"],
                input_tokens=claude_response.input_tokens,
                output_tokens=claude_response.output_tokens
            )

            # 8. Update agent metrics
            total_tokens = claude_response.input_tokens + claude_response.output_tokens
            await self.state_manager.update_metrics(
                agent_id=agent_id,
                tokens_used=total_tokens,
                cost=briefing["token_cost"]
            )

            # 9. Return briefing
            agent_briefing = AgentBriefing(
                briefing_id=briefing_id,
                agent_id=agent_id,
                query=query,
                context=complete_context,
                briefing=briefing_content,
                generated_at=briefing["generated_at"],
                token_cost=briefing["token_cost"],
                input_tokens=claude_response.input_tokens,
                output_tokens=claude_response.output_tokens
            )

            logger.info(
                f"Generated briefing {briefing_id} for agent {agent_id} "
                f"(cost: ${briefing['token_cost']:.4f})"
            )

            return agent_briefing

        except PHIValidationError as e:
            logger.error(f"PHI validation failed for agent {agent_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"Failed to query agent {agent_id}: {e}")
            raise

    async def get_agent_state(self, agent_id: str) -> Optional[AgentState]:
        """
        Retrieve current agent state.

        Args:
            agent_id: Agent identifier

        Returns:
            AgentState: Current agent state if exists
        """
        try:
            return await self.state_manager.load_agent_state(agent_id)
        except Exception as e:
            logger.error(f"Failed to get agent state for {agent_id}: {e}")
            raise

    async def update_agent_config(
        self,
        agent_id: str,
        config: AgentConfig
    ) -> None:
        """
        Update agent configuration.

        Args:
            agent_id: Agent identifier
            config: New configuration
        """
        try:
            logger.info(f"Updating config for agent {agent_id}")

            # Load agent state
            agent_state = await self.state_manager.load_agent_state(agent_id)
            if not agent_state:
                raise Exception(f"Agent {agent_id} not found")

            # Update config
            agent_state.config = config
            agent_state.updated_at = datetime.utcnow()

            # Save
            await self.state_manager.save_agent_state(agent_id, agent_state)

            logger.info(f"Updated config for agent {agent_id}")

        except Exception as e:
            logger.error(f"Failed to update agent config for {agent_id}: {e}")
            raise

    def _get_agent_type(self, agent_id: str) -> AgentType:
        """Map agent_id to AgentType."""
        agent_type_map = {
            "cfo": AgentType.CFO,
            "ciso": AgentType.CISO,
            "board": AgentType.BOARD
        }
        return agent_type_map.get(agent_id, AgentType.CFO)


# Singleton instance for use across the application
_agent_runtime_instance = None


def get_agent_runtime(
    db_pool,
    claude_api_key: str,
    claude_model: str = "claude-3-5-sonnet-20241022"
) -> AgentRuntime:
    """Get singleton agent runtime instance."""
    global _agent_runtime_instance
    if _agent_runtime_instance is None:
        _agent_runtime_instance = AgentRuntime(
            db_pool=db_pool,
            claude_api_key=claude_api_key,
            claude_model=claude_model
        )
    return _agent_runtime_instance
