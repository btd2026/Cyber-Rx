"""
Claude LLM Client

Handles all interactions with the Anthropic Claude API, including
API calls, retry logic, rate limiting, cost tracking, and logging.
"""
import asyncio
import time
import logging
from typing import Optional, Dict, Any
from anthropic import AsyncAnthropic
from anthropic.types import Message
from src.models import ClaudeResponse, LLMAPIError, RateLimitError


logger = logging.getLogger(__name__)


class ClaudeClient:
    """
    Client for interacting with Claude Sonnet API.

    Features:
    - Async API calls
    - Retry logic with exponential backoff
    - Rate limiting handling
    - Token usage and cost tracking
    - Comprehensive logging for audit trail
    """

    # Claude Sonnet pricing (per million tokens)
    INPUT_COST_PER_MILLION = 3.00
    OUTPUT_COST_PER_MILLION = 15.00

    def __init__(
        self,
        api_key: str,
        model: str = "claude-3-5-sonnet-20241022",
        max_retries: int = 3,
        retry_delay: float = 1.0,
        retry_backoff: float = 2.0
    ):
        """
        Initialize Claude client.

        Args:
            api_key: Anthropic API key
            model: Claude model to use
            max_retries: Maximum number of retry attempts
            retry_delay: Initial retry delay in seconds
            retry_backoff: Exponential backoff multiplier
        """
        self.api_key = api_key
        self.model = model
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self.retry_backoff = retry_backoff

        # Initialize async client
        self.client = AsyncAnthropic(api_key=api_key)

        logger.info(f"Claude client initialized with model: {model}")

    async def call_claude(
        self,
        prompt: str,
        max_tokens: int = 4096,
        temperature: float = 0.7,
        timeout: int = 30
    ) -> ClaudeResponse:
        """
        Call Claude Sonnet API with prompt.

        Args:
            prompt: Formatted prompt for Claude
            max_tokens: Maximum tokens in response
            temperature: Sampling temperature (0.0 - 1.0)
            timeout: Request timeout in seconds

        Returns:
            ClaudeResponse: Response with text and metadata

        Raises:
            LLMAPIError: If API call fails after retries
            RateLimitError: If rate limit exceeded
        """
        retry_count = 0
        current_delay = self.retry_delay

        while retry_count <= self.max_retries:
            try:
                # Log the API call (without full prompt for security)
                logger.info(
                    f"Calling Claude API (attempt {retry_count + 1}/{self.max_retries + 1}) "
                    f"model={self.model}, max_tokens={max_tokens}, temperature={temperature}"
                )

                # Set timeout
                if timeout:
                    asyncio.create_task(self._timeout_handler(timeout))

                # Make the API call
                message = await self.client.messages.create(
                    model=self.model,
                    max_tokens=max_tokens,
                    temperature=temperature,
                    messages=[
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ]
                )

                # Extract response data
                response_text = message.content[0].text
                input_tokens = message.usage.input_tokens
                output_tokens = message.usage.output_tokens
                stop_reason = message.stop_reason

                # Calculate cost
                cost = self.estimate_cost(input_tokens, output_tokens)

                # Log success
                logger.info(
                    f"Claude API call successful: "
                    f"input_tokens={input_tokens}, output_tokens={output_tokens}, "
                    f"cost=${cost:.4f}, stop_reason={stop_reason}"
                )

                return ClaudeResponse(
                    text=response_text,
                    input_tokens=input_tokens,
                    output_tokens=output_tokens,
                    stop_reason=stop_reason,
                    model=self.model
                )

            except Exception as e:
                retry_count += 1

                # Check if rate limit error
                if "rate_limit" in str(e).lower() or "429" in str(e):
                    logger.warning(f"Rate limit hit, waiting {current_delay}s before retry")
                    await asyncio.sleep(current_delay)
                    current_delay *= self.retry_backoff
                    continue

                # If we've exhausted retries, raise error
                if retry_count > self.max_retries:
                    logger.error(f"Claude API call failed after {self.max_retries} retries: {e}")
                    raise LLMAPIError(f"Claude API call failed: {e}")

                # Log retry
                logger.warning(
                    f"Claude API call failed (attempt {retry_count}/{self.max_retries}), "
                    f"retrying in {current_delay}s: {e}"
                )

                # Wait before retry with exponential backoff
                await asyncio.sleep(current_delay)
                current_delay *= self.retry_backoff

        # Should not reach here, but just in case
        raise LLMAPIError("Claude API call failed: Max retries exceeded")

    async def call_claude_with_structured_output(
        self,
        prompt: str,
        output_schema: Dict[str, Any],
        max_tokens: int = 4096,
        temperature: float = 0.7,
        timeout: int = 30
    ) -> Dict[str, Any]:
        """
        Call Claude with structured output expectation.

        Includes the output schema in the prompt to ensure Claude responds
        with valid JSON matching the schema.

        Args:
            prompt: Formatted prompt
            output_schema: JSON schema for expected output
            max_tokens: Maximum tokens
            temperature: Sampling temperature
            timeout: Request timeout

        Returns:
            dict: Parsed structured output matching schema
        """
        # Add schema specification to prompt
        schema_instruction = (
            "\n\nIMPORTANT: You must respond with valid JSON that matches this schema:\n"
            f"{output_schema}\n\n"
            "Your response should be ONLY the JSON, no additional text."
        )

        enhanced_prompt = prompt + schema_instruction

        # Call Claude
        response = await self.call_claude(
            prompt=enhanced_prompt,
            max_tokens=max_tokens,
            temperature=temperature,
            timeout=timeout
        )

        # Parse JSON response
        import json
        try:
            structured_output = json.loads(response.text)
            logger.info("Successfully parsed structured output from Claude")
            return structured_output
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse structured output: {e}")
            raise LLMAPIError(f"Failed to parse structured output: {e}")

    def estimate_cost(self, input_tokens: int, output_tokens: int) -> float:
        """
        Estimate cost in USD for tokens used.

        Claude Sonnet pricing:
        - Input: $3.00 per million tokens
        - Output: $15.00 per million tokens

        Args:
            input_tokens: Number of input tokens
            output_tokens: Number of output tokens

        Returns:
            float: Cost in USD
        """
        input_cost = (input_tokens / 1_000_000) * self.INPUT_COST_PER_MILLION
        output_cost = (output_tokens / 1_000_000) * self.OUTPUT_COST_PER_MILLION
        total_cost = input_cost + output_cost

        return round(total_cost, 4)

    async def _timeout_handler(self, timeout: int):
        """
        Timeout handler for API calls.

        Args:
            timeout: Timeout in seconds
        """
        await asyncio.sleep(timeout)
        logger.warning(f"Claude API call timeout after {timeout}s")

    async def test_connection(self) -> bool:
        """
        Test connection to Claude API.

        Returns:
            bool: True if connection successful
        """
        try:
            logger.info("Testing Claude API connection...")
            response = await self.call_claude(
                prompt="Hello! Please respond with 'OK' if you receive this.",
                max_tokens=10,
                timeout=10
            )
            logger.info(f"Claude API connection test successful: {response.text}")
            return True
        except Exception as e:
            logger.error(f"Claude API connection test failed: {e}")
            return False


# Singleton instance for use across the application
_claude_client_instance = None


def get_claude_client(
    api_key: str,
    model: str = "claude-3-5-sonnet-20241022",
    max_retries: int = 3
) -> ClaudeClient:
    """Get singleton Claude client instance."""
    global _claude_client_instance
    if _claude_client_instance is None:
        _claude_client_instance = ClaudeClient(
            api_key=api_key,
            model=model,
            max_retries=max_retries
        )
    return _claude_client_instance
