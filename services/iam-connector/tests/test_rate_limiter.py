"""
Unit tests for Rate Limiter
"""

import pytest
import asyncio
from unittest.mock import Mock, patch

from src.rate_limiter import RateLimiter


class TestRateLimiter:
    """Test suite for RateLimiter."""

    @pytest.fixture
    def limiter(self):
        """Create rate limiter instance."""
        return RateLimiter(requests_per_second=10.0, max_retries=3, backoff_base=2.0)

    def test_initialization(self, limiter):
        """Test rate limiter initialization."""
        assert limiter.requests_per_second == 10.0
        assert limiter.max_retries == 3
        assert limiter.backoff_base == 2.0
        assert limiter.tokens == 10.0
        assert limiter.failure_count == 0
        assert limiter.circuit_open is False

    @pytest.mark.asyncio
    async def test_acquire_token(self, limiter):
        """Test token acquisition."""
        # Should acquire immediately
        await limiter.acquire()

        # Should have consumed one token
        assert limiter.tokens < 10.0

    @pytest.mark.asyncio
    async def test_token_refill(self, limiter):
        """Test token refill over time."""
        # Consume all tokens
        initial_tokens = limiter.tokens

        for _ in range(int(initial_tokens * 2)):
            await limiter.acquire()

        # Wait for refill
        await asyncio.sleep(0.2)

        # Tokens should have refilled
        assert limiter.tokens > 0

    @pytest.mark.asyncio
    async def test_rate_limiting(self, limiter):
        """Test rate limiting behavior."""
        # Try to consume many tokens quickly
        start_time = asyncio.get_event_loop().time()

        for _ in range(20):
            await limiter.acquire()

        end_time = asyncio.get_event_loop().time()

        # Should take at least 1 second (20 tokens / 10 tokens per second)
        assert end_time - start_time >= 1.0

    @pytest.mark.asyncio
    async def test_execute_with_retry_success(self, limiter):
        """Test successful execution with retry."""
        mock_func = Mock(return_value="success")

        result = await limiter.execute_with_retry(mock_func)

        assert result == "success"
        assert mock_func.call_count == 1
        assert limiter.failure_count == 0

    @pytest.mark.asyncio
    async def test_execute_with_retry_failure(self, limiter):
        """Test retry on failure."""
        mock_func = Mock(side_effect=[Exception("error"), "success"])

        result = await limiter.execute_with_retry(mock_func)

        assert result == "success"
        assert mock_func.call_count == 2
        assert limiter.retries > 0

    @pytest.mark.asyncio
    async def test_execute_with_retry_max_retries(self, limiter):
        """Test max retries exceeded."""
        mock_func = Mock(side_effect=Exception("persistent error"))

        with pytest.raises(Exception):
            await limiter.execute_with_retry(mock_func)

        assert mock_func.call_count == limiter.max_retries

    def test_record_failure(self, limiter):
        """Test failure recording."""
        limiter.record_failure(is_rate_limit=True)

        assert limiter.failure_count == 1
        assert limiter.rate_limit_hits == 1

    def test_record_success(self, limiter):
        """Test success recording."""
        limiter.failure_count = 5
        limiter.record_success()

        assert limiter.failure_count == 0

    def test_circuit_breaker(self, limiter):
        """Test circuit breaker."""
        # Trigger circuit breaker
        for _ in range(limiter.failure_threshold):
            limiter.record_failure()

        assert limiter.circuit_open is True
        assert limiter.circuit_reset_time is not None

    @pytest.mark.asyncio
    async def test_circuit breaker_prevents_requests(self, limiter):
        """Test circuit breaker prevents requests."""
        # Trigger circuit breaker
        for _ in range(limiter.failure_threshold):
            limiter.record_failure()

        # Try to acquire token
        with pytest.raises(Exception, match="Circuit breaker is open"):
            await limiter.acquire()

    def test_circuit_breaker_reset(self, limiter):
        """Test circuit breaker reset."""
        from datetime import datetime, timedelta

        # Trigger circuit breaker with expired time
        for _ in range(limiter.failure_threshold):
            limiter.record_failure()

        # Set reset time to past
        limiter.circuit_reset_time = datetime.now() - timedelta(seconds=10)

        # Try to acquire (should reset circuit breaker)
        asyncio.run(limiter.acquire())

        assert limiter.circuit_open is False
        assert limiter.failure_count == 0

    def test_get_metrics(self, limiter):
        """Test metrics retrieval."""
        limiter.total_requests = 100
        limiter.rate_limit_hits = 5
        limiter.retries = 3

        metrics = limiter.get_metrics()

        assert metrics["total_requests"] == 100
        assert metrics["rate_limit_hits"] == 5
        assert metrics["retries"] == 3
        assert metrics["requests_per_second"] == 10.0

    def test_reset(self, limiter):
        """Test rate limiter reset."""
        # Change state
        limiter.tokens = 0.0
        limiter.failure_count = 5
        limiter.circuit_open = True

        # Reset
        limiter.reset()

        assert limiter.tokens == limiter.requests_per_second
        assert limiter.failure_count == 0
        assert limiter.circuit_open is False

    @pytest.mark.asyncio
    async def test_extract_retry_after(self, limiter):
        """Test retry-after extraction."""
        # Test with retry-after in message
        exception = Exception("Rate limited. Retry after 60 seconds")
        retry_after = limiter._extract_retry_after(exception)

        assert retry_after == 60

        # Test without retry-after
        exception = Exception("Generic error")
        retry_after = limiter._extract_retry_after(exception)

        assert retry_after is None

    @pytest.mark.asyncio
    async def test_backoff_calculation(self, limiter):
        """Test exponential backoff calculation."""
        mock_func = Mock(side_effect=[Exception("error")] * 5)

        # Record backoff times
        backoff_times = []
        original_backoff = limiter.execute_with_retry

        async def mock_execute_with_retry(func, *args, **kwargs):
            start = asyncio.get_event_loop().time()
            try:
                return await original_backoff(func, *args, **kwargs)
            except:
                end = asyncio.get_event_loop().time()
                backoff_times.append(end - start)
                raise

        limiter.execute_with_retry = mock_execute_with_retry

        with pytest.raises(Exception):
            await limiter.execute_with_retry(mock_func)

        # Check exponential growth (roughly)
        if len(backoff_times) > 1:
            assert backoff_times[1] > backoff_times[0]
