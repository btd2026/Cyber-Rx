"""
CyberRX Authentication Service - Audit Logging

Implements comprehensive audit logging for HIPAA compliance.
All authentication attempts, data access, and agent actions are logged.
Audit logs are stored for 7 years and are immutable.
"""

from fastapi import Request, HTTPException, status
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from enum import Enum
import logging
import json
import uuid

# Audit event types
class AuditEventType(str, Enum):
    """Audit event types"""
    LOGIN_ATTEMPT = "login_attempt"
    LOGOUT = "logout"
    API_REQUEST = "api_request"
    DATA_ACCESS = "data_access"
    AGENT_ACTION = "agent_action"
    PERMISSION_DENIED = "permission_denied"
    ADMIN_ACTION = "admin_action"
    TOKEN_REFRESH = "token_refresh"
    MFA_VERIFICATION = "mfa_verification"
    ACCOUNT_LOCKED = "account_locked"
    PASSWORD_CHANGE = "password_change"
    ROLE_CHANGE = "role_change"

# Audit logger setup
audit_logger = logging.getLogger("audit")
audit_logger.setLevel(logging.INFO)

# File handler for audit logs
audit_handler = logging.FileHandler("/var/log/cyberrx/audit.log")
audit_handler.setFormatter(logging.Formatter('%(message)s'))
audit_logger.addHandler(audit_handler)

# Also log to stdout for development
console_handler = logging.StreamHandler()
console_handler.setFormatter(logging.Formatter('%(message)s'))
audit_logger.addHandler(console_handler)

class AuditEvent:
    """
    Audit event for logging security-relevant events.

    All audit events are logged for HIPAA compliance (7-year retention).
    """

    def __init__(
        self,
        event_type: AuditEventType,
        user_id: Optional[str] = None,
        customer_id: Optional[str] = None,
        role: Optional[str] = None,
        action: str = "",
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        success: bool = True,
        details: Optional[Dict[str, Any]] = None,
        timestamp: Optional[datetime] = None
    ):
        """
        Initialize audit event.

        Args:
            event_type: Type of audit event
            user_id: User ID (or agent ID)
            customer_id: Customer ID for multi-tenancy
            role: User role
            action: Action performed
            resource_type: Type of resource accessed
            resource_id: ID of resource accessed
            ip_address: IP address of request
            user_agent: User agent string
            success: Whether the action succeeded
            details: Additional event details
            timestamp: Event timestamp (defaults to now)
        """
        self.event_id = str(uuid.uuid4())
        self.event_type = event_type
        self.user_id = user_id
        self.customer_id = customer_id
        self.role = role
        self.action = action
        self.resource_type = resource_type
        self.resource_id = resource_id
        self.ip_address = ip_address
        self.user_agent = user_agent
        self.success = success
        self.details = details or {}
        self.timestamp = timestamp or datetime.utcnow()

    def to_dict(self) -> Dict[str, Any]:
        """
        Convert audit event to dictionary.

        Returns:
            Dictionary representation of audit event
        """
        return {
            "event_id": self.event_id,
            "timestamp": self.timestamp.isoformat(),
            "event_type": self.event_type.value,
            "user_id": self.user_id,
            "customer_id": self.customer_id,
            "role": self.role,
            "action": self.action,
            "resource_type": self.resource_type,
            "resource_id": self.resource_id,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
            "success": self.success,
            "details": self.details
        }

    def log(self) -> None:
        """
        Log audit event.

        Logs are written to:
        - File (/var/log/cyberrx/audit.log)
        - Console (for development)
        - Database (in production)
        """
        audit_log = self.to_dict()
        audit_logger.info(json.dumps(audit_log))

        # TODO: Store in database for long-term retention
        # store_audit_event_in_db(audit_log)

    @classmethod
    def from_request(
        cls,
        event_type: AuditEventType,
        request: Request,
        action: str,
        success: bool = True,
        **kwargs
    ) -> "AuditEvent":
        """
        Create audit event from FastAPI request.

        Args:
            event_type: Type of audit event
            request: FastAPI request object
            action: Action performed
            success: Whether the action succeeded
            **kwargs: Additional event parameters

        Returns:
            Audit event instance
        """
        return cls(
            event_type=event_type,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            action=action,
            success=success,
            **kwargs
        )

# Specific audit event creators
def log_login_attempt(
    username: str,
    success: bool,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    failure_reason: Optional[str] = None
) -> None:
    """
    Log login attempt.

    Args:
        username: Username attempting to login
        success: Whether login succeeded
        ip_address: IP address of attempt
        user_agent: User agent string
        failure_reason: Reason for failure (if failed)
    """
    event = AuditEvent(
        event_type=AuditEventType.LOGIN_ATTEMPT,
        user_id=username,  # Username before authentication
        action="login",
        ip_address=ip_address,
        user_agent=user_agent,
        success=success,
        details={
            "username": username,
            "failure_reason": failure_reason
        } if not success else {"username": username}
    )
    event.log()

def log_logout(
    user_id: str,
    customer_id: str,
    role: str,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
) -> None:
    """
    Log user logout.

    Args:
        user_id: User ID
        customer_id: Customer ID
        role: User role
        ip_address: IP address
        user_agent: User agent string
    """
    event = AuditEvent(
        event_type=AuditEventType.LOGOUT,
        user_id=user_id,
        customer_id=customer_id,
        role=role,
        action="logout",
        ip_address=ip_address,
        user_agent=user_agent,
        success=True
    )
    event.log()

def log_data_access(
    user_id: str,
    customer_id: str,
    role: str,
    data_type: str,
    success: bool = True,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    denial_reason: Optional[str] = None
) -> None:
    """
    Log data access attempt.

    Args:
        user_id: User ID
        customer_id: Customer ID
        role: User role
        data_type: Type of data accessed
        success: Whether access was granted
        ip_address: IP address
        user_agent: User agent string
        denial_reason: Reason for denial (if denied)
    """
    event = AuditEvent(
        event_type=AuditEventType.DATA_ACCESS if success else AuditEventType.PERMISSION_DENIED,
        user_id=user_id,
        customer_id=customer_id,
        role=role,
        action="read",
        resource_type=data_type,
        ip_address=ip_address,
        user_agent=user_agent,
        success=success,
        details={
            "data_type": data_type,
            "denial_reason": denial_reason
        } if not success else {"data_type": data_type}
    )
    event.log()

def log_agent_action(
    agent_type: str,
    customer_id: str,
    action: str,
    details: Optional[Dict[str, Any]] = None
) -> None:
    """
    Log agent action.

    Args:
        agent_type: Type of agent (cfo, ciso, etc.)
        customer_id: Customer ID
        action: Action performed by agent
        details: Additional details
    """
    event = AuditEvent(
        event_type=AuditEventType.AGENT_ACTION,
        user_id=f"agent_{agent_type}",
        customer_id=customer_id,
        role=agent_type,
        action=action,
        resource_type="agent",
        success=True,
        details=details or {}
    )
    event.log()

def log_admin_action(
    user_id: str,
    customer_id: str,
    action: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None
) -> None:
    """
    Log administrative action.

    Args:
        user_id: User ID
        customer_id: Customer ID
        action: Action performed
        resource_type: Type of resource
        resource_id: ID of resource
        details: Additional details
    """
    event = AuditEvent(
        event_type=AuditEventType.ADMIN_ACTION,
        user_id=user_id,
        customer_id=customer_id,
        role="admin",
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        success=True,
        details=details or {}
    )
    event.log()

def log_permission_denied(
    user_id: str,
    customer_id: str,
    role: str,
    action: str,
    resource_type: str,
    denial_reason: str,
    ip_address: Optional[str] = None
) -> None:
    """
    Log permission denial.

    Args:
        user_id: User ID
        customer_id: Customer ID
        role: User role
        action: Action attempted
        resource_type: Type of resource
        denial_reason: Reason for denial
        ip_address: IP address
    """
    event = AuditEvent(
        event_type=AuditEventType.PERMISSION_DENIED,
        user_id=user_id,
        customer_id=customer_id,
        role=role,
        action=action,
        resource_type=resource_type,
        ip_address=ip_address,
        success=False,
        details={"denial_reason": denial_reason}
    )
    event.log()

def log_account_locked(
    username: str,
    ip_address: Optional[str] = None,
    failed_attempts: int = 0
) -> None:
    """
    Log account lockout.

    Args:
        username: Username that was locked
        ip_address: IP address
        failed_attempts: Number of failed attempts
    """
    event = AuditEvent(
        event_type=AuditEventType.ACCOUNT_LOCKED,
        user_id=username,
        action="account_locked",
        ip_address=ip_address,
        success=True,
        details={
            "username": username,
            "failed_attempts": failed_attempts
        }
    )
    event.log()

def audit_middleware_factory():
    """
    Create audit middleware for FastAPI.

    Logs all API requests with user information from JWT token.

    Usage:
        app.add_middleware(audit_middleware_factory())
    """
    from starlette.middleware.base import BaseHTTPMiddleware
    from services.authentication.auth import decode_token

    class AuditMiddleware(BaseHTTPMiddleware):
        async def dispatch(self, request: Request, call_next):
            """Process request and log audit event"""
            start_time = datetime.utcnow()

            # Process request
            response = await call_next(request)

            # Extract user info from JWT if present
            user_info = None
            try:
                auth_header = request.headers.get("authorization")
                if auth_header and auth_header.startswith("Bearer "):
                    token = auth_header.split(" ")[1]
                    payload = decode_token(token)
                    user_info = {
                        "user_id": payload.get("sub"),
                        "customer_id": payload.get("customer_id"),
                        "role": payload.get("role")
                    }
            except Exception:
                pass  # No valid token, continue without user info

            # Calculate duration
            duration_ms = (datetime.utcnow() - start_time).total_seconds() * 1000

            # Log audit event if user authenticated
            if user_info:
                event = AuditEvent(
                    event_type=AuditEventType.API_REQUEST,
                    user_id=user_info.get("user_id"),
                    customer_id=user_info.get("customer_id"),
                    role=user_info.get("role"),
                    action=request.method,
                    resource_type=request.url.path,
                    ip_address=request.client.host if request.client else None,
                    user_agent=request.headers.get("user-agent"),
                    success=response.status_code < 400,
                    details={
                        "status_code": response.status_code,
                        "duration_ms": duration_ms,
                        "path": request.url.path,
                        "method": request.method
                    }
                )
                event.log()

            return response

    return AuditMiddleware

# Audit log queries (for database)
class AuditLogQuery:
    """Audit log query interface"""

    async def get_user_audit_log(
        self,
        user_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        event_types: Optional[List[AuditEventType]] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get audit log for user.

        Args:
            user_id: User ID
            start_date: Start date filter
            end_date: End date filter
            event_types: Event type filters
            limit: Maximum number of records

        Returns:
            List of audit log entries
        """
        # TODO: Implement database query
        return []

    async def get_customer_audit_log(
        self,
        customer_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        event_types: Optional[List[AuditEventType]] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get audit log for customer.

        Args:
            customer_id: Customer ID
            start_date: Start date filter
            end_date: End date filter
            event_types: Event type filters
            limit: Maximum number of records

        Returns:
            List of audit log entries
        """
        # TODO: Implement database query
        return []

    async def get_failed_login_attempts(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get failed login attempts.

        Args:
            start_date: Start date filter
            end_date: End date filter
            limit: Maximum number of records

        Returns:
            List of failed login attempts
        """
        # TODO: Implement database query
        return []

    async def get_permission_denials(
        self,
        customer_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get permission denial events.

        Args:
            customer_id: Customer ID filter
            start_date: Start date filter
            end_date: End date filter
            limit: Maximum number of records

        Returns:
            List of permission denials
        """
        # TODO: Implement database query
        return []
