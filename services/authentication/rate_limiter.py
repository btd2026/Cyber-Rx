"""
CyberRX Authentication Service - Rate Limiting

Implements rate limiting to prevent brute force attacks and abuse.
Uses slowapi for in-memory rate limiting (Redis for production).
"""

from fastapi import Request, HTTPException, status
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from typing import Callable, Optional
from datetime import datetime, timedelta
import hashlib

# Rate limit configuration
class RateLimitConfig:
    """Rate limit configuration"""

    # Login endpoints
    LOGIN_ATTEMPTS = "5/minute"  # 5 login attempts per minute
    LOGIN_ATTEMPTS_HOUR = "20/hour"  # 20 login attempts per hour

    # Registration
    REGISTRATION = "3/hour"  # 3 registration attempts per hour

    # API endpoints
    API_REQUESTS = "100/minute"  # 100 API requests per minute per user
    API_REQUESTS_BURST = "200/minute"  # Burst allowance

    # Password reset
    PASSWORD_RESET = "3/hour"  # 3 password reset attempts per hour

    # MFA verification
    MFA_ATTEMPTS = "10/minute"  # 10 MFA attempts per minute

# Create limiter
def get_user_id(request: Request) -> str:
    """
    Get user identifier for rate limiting.

    Uses IP address, or user ID from JWT if available.

    Args:
        request: FastAPI request

    Returns:
        User identifier for rate limiting
    """
    # Try to get user ID from JWT token
    auth_header = request.headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        try:
            from services.authentication.auth import decode_token
            token = auth_header.split(" ")[1]
            payload = decode_token(token)
            user_id = payload.get("sub")
            if user_id:
                return f"user:{user_id}"
        except Exception:
            pass  # Fall back to IP address

    # Fall back to IP address
    ip_address = get_remote_address(request)
    return f"ip:{ip_address}"

def get_customer_id(request: Request) -> Optional[str]:
    """
    Get customer ID for rate limiting.

    Args:
        request: FastAPI request

    Returns:
        Customer ID or None
    """
    auth_header = request.headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        try:
            from services.authentication.auth import decode_token
            token = auth_header.split(" ")[1]
            payload = decode_token(token)
            return payload.get("customer_id")
        except Exception:
            pass
    return None

# Limiter instance
limiter = Limiter(key_func=get_user_id)

# Rate limit exceeded handler
def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """
    Handle rate limit exceeded.

    Args:
        request: FastAPI request
        exc: Rate limit exceeded exception

    Returns:
        HTTPException with 429 status
    """
    retry_after = exc.retry_after if hasattr(exc, 'retry_after') else 60
    raise HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail={
            "error": "Rate limit exceeded",
            "retry_after": retry_after,
            "message": f"Too many requests. Please try again in {retry_after} seconds."
        }
    )

# Account lockout tracking (in-memory for MVP, use Redis in production)
class AccountLockout:
    """Account lockout tracker"""

    def __init__(self):
        """Initialize account lockout tracker"""
        self.failed_attempts: dict[str, list[datetime]] = {}
        self.locked_accounts: dict[str, datetime] = {}

    def record_failed_attempt(self, identifier: str) -> int:
        """
        Record failed login attempt.

        Args:
            identifier: User identifier (username or IP)

        Returns:
            Number of recent failed attempts
        """
        now = datetime.utcnow()

        # Initialize if needed
        if identifier not in self.failed_attempts:
            self.failed_attempts[identifier] = []

        # Add failed attempt
        self.failed_attempts[identifier].append(now)

        # Remove attempts older than 15 minutes
        cutoff = now - timedelta(minutes=15)
        self.failed_attempts[identifier] = [
            attempt for attempt in self.failed_attempts[identifier]
            if attempt > cutoff
        ]

        return len(self.failed_attempts[identifier])

    def is_locked(self, identifier: str) -> tuple[bool, Optional[datetime]]:
        """
        Check if account is locked.

        Args:
            identifier: User identifier

        Returns:
            Tuple of (is_locked, locked_until)
        """
        if identifier in self.locked_accounts:
            locked_until = self.locked_accounts[identifier]
            if locked_until > datetime.utcnow():
                return True, locked_until
            else:
                # Lockout expired, remove it
                del self.locked_accounts[identifier]

        return False, None

    def lock_account(self, identifier: str, lockout_minutes: int = 15) -> None:
        """
        Lock account.

        Args:
            identifier: User identifier
            lockout_minutes: Minutes to lock account
        """
        locked_until = datetime.utcnow() + timedelta(minutes=lockout_minutes)
        self.locked_accounts[identifier] = locked_until

    def reset_attempts(self, identifier: str) -> None:
        """
        Reset failed login attempts.

        Args:
            identifier: User identifier
        """
        if identifier in self.failed_attempts:
            del self.failed_attempts[identifier]

# Global account lockout instance
account_lockout = AccountLockout()

# Rate limit decorators
def rate_limit_login(request: Request):
    """
    Rate limit decorator for login endpoint.

    Args:
        request: FastAPI request

    Raises:
        HTTPException: If rate limit exceeded
    """
    # Check account lockout first
    identifier = get_user_id(request)
    is_locked, locked_until = account_lockout.is_locked(identifier)

    if is_locked:
        retry_after = int((locked_until - datetime.utcnow()).total_seconds())
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail={
                "error": "Account locked",
                "retry_after": retry_after,
                "message": f"Account is locked due to too many failed attempts. Please try again in {retry_after} seconds."
            }
        )

    # Apply rate limit
    return limiter._check_request_limit(lambda: RateLimitConfig.LOGIN_ATTEMPTS)

def record_failed_login(identifier: str) -> int:
    """
    Record failed login attempt and check if account should be locked.

    Args:
        identifier: User identifier

    Returns:
        Number of failed attempts
    """
    attempts = account_lockout.record_failed_attempt(identifier)

    # Lock account after 5 failed attempts
    if attempts >= 5:
        from services.authentication.audit import log_account_locked
        account_lockout.lock_account(identifier, lockout_minutes=15)
        log_account_locked(username=identifier, failed_attempts=attempts)

    return attempts

def reset_failed_attempts(identifier: str) -> None:
    """
    Reset failed login attempts after successful login.

    Args:
        identifier: User identifier
    """
    account_lockout.reset_attempts(identifier)

# Rate limit middleware setup
def setup_rate_limiting(app):
    """
    Setup rate limiting for FastAPI app.

    Args:
        app: FastAPI application
    """
    from fastapi import FastAPI
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
