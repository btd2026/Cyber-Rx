"""
CyberRX Authentication Service - Role-Based Access Control (RBAC)

Implements RBAC for 6 executive roles (CFO, CRO, CLO, CIO, CISO, Board) plus admin.
Each role has specific permissions and data access rights.
"""

from enum import Enum
from typing import List, Set
from fastapi import HTTPException, Depends, status
from services.authentication.auth import CurrentUser, get_current_user

# Role Enum
class Role(str, Enum):
    """User roles for RBAC"""
    CFO = "cfo"
    CRO = "cro"
    CLO = "clo"
    CIO = "cio"
    CISO = "ciso"
    BOARD = "board"
    ADMIN = "admin"

# Permission Enum
class Permission(str, Enum):
    """Permissions for RBAC"""

    # CFO permissions
    READ_FINANCIAL_DATA = "read_financial_data"
    READ_CFO_BRIEFINGS = "read_cfo_briefings"
    QUERY_CFO_AGENT = "query_cfo_agent"

    # CRO permissions
    READ_RISK_DATA = "read_risk_data"
    READ_CRO_BRIEFINGS = "read_cro_briefings"
    QUERY_CRO_AGENT = "query_cro_agent"

    # CLO permissions
    READ_COMPLIANCE_DATA = "read_compliance_data"
    READ_CLO_BRIEFINGS = "read_clo_briefings"
    QUERY_CLO_AGENT = "query_clo_agent"

    # CIO permissions
    READ_OPERATIONAL_DATA = "read_operational_data"
    READ_CIO_BRIEFINGS = "read_cio_briefings"
    QUERY_CIO_AGENT = "query_cio_agent"

    # CISO permissions
    READ_SECURITY_DATA = "read_security_data"
    READ_CISO_BRIEFINGS = "read_ciso_briefings"
    QUERY_CISO_AGENT = "query_ciso_agent"
    READ_ALL_AGENTS = "read_all_agents"  # CISO coordination role

    # Board permissions
    READ_ALL_BRIEFINGS = "read_all_briefings"
    READ_GOVERNANCE_DATA = "read_governance_data"
    QUERY_BOARD_AGENT = "query_board_agent"
    SYNTHESIZE_ALL_OUTPUTS = "synthesize_all_outputs"

    # Admin permissions
    MANAGE_USERS = "manage_users"
    MANAGE_ROLES = "manage_roles"
    MANAGE_CUSTOMERS = "manage_customers"
    READ_ALL_AUDIT_LOGS = "read_all_audit_logs"

# Role-Permission Mapping
ROLE_PERMISSIONS: dict[Role, Set[Permission]] = {
    Role.CFO: {
        Permission.READ_FINANCIAL_DATA,
        Permission.READ_CFO_BRIEFINGS,
        Permission.QUERY_CFO_AGENT,
    },
    Role.CRO: {
        Permission.READ_RISK_DATA,
        Permission.READ_CRO_BRIEFINGS,
        Permission.QUERY_CRO_AGENT,
    },
    Role.CLO: {
        Permission.READ_COMPLIANCE_DATA,
        Permission.READ_CLO_BRIEFINGS,
        Permission.QUERY_CLO_AGENT,
    },
    Role.CIO: {
        Permission.READ_OPERATIONAL_DATA,
        Permission.READ_CIO_BRIEFINGS,
        Permission.QUERY_CIO_AGENT,
    },
    Role.CISO: {
        Permission.READ_SECURITY_DATA,
        Permission.READ_CISO_BRIEFINGS,
        Permission.QUERY_CISO_AGENT,
        Permission.READ_ALL_AGENTS,  # CISO can read all agents
    },
    Role.BOARD: {
        Permission.READ_ALL_BRIEFINGS,
        Permission.READ_GOVERNANCE_DATA,
        Permission.QUERY_BOARD_AGENT,
        Permission.SYNTHESIZE_ALL_OUTPUTS,
    },
    Role.ADMIN: {
        Permission.MANAGE_USERS,
        Permission.MANAGE_ROLES,
        Permission.MANAGE_CUSTOMERS,
        Permission.READ_ALL_AUDIT_LOGS,
    },
}

# Role Hierarchy (for escalation checking)
ROLE_HIERARCHY: dict[Role, int] = {
    Role.CFO: 1,
    Role.CRO: 1,
    Role.CLO: 1,
    Role.CIO: 1,
    Role.CISO: 1,
    Role.BOARD: 2,  # Board has higher privilege
    Role.ADMIN: 3,  # Admin has highest privilege
}

def has_permission(role: Role, permission: Permission) -> bool:
    """
    Check if role has permission.

    Args:
        role: User role
        permission: Permission to check

    Returns:
        True if role has permission
    """
    return permission in ROLE_PERMISSIONS.get(role, set())

def has_any_permission(role: Role, permissions: List[Permission]) -> bool:
    """
    Check if role has any of the specified permissions.

    Args:
        role: User role
        permissions: List of permissions to check

    Returns:
        True if role has at least one permission
    """
    role_permissions = ROLE_PERMISSIONS.get(role, set())
    return bool(role_permissions.intersection(permissions))

def has_all_permissions(role: Role, permissions: List[Permission]) -> bool:
    """
    Check if role has all of the specified permissions.

    Args:
        role: User role
        permissions: List of permissions to check

    Returns:
        True if role has all permissions
    """
    role_permissions = ROLE_PERMISSIONS.get(role, set())
    return all(perm in role_permissions for perm in permissions)

def require_permission(permission: Permission):
    """
    FastAPI dependency for permission checking.

    Usage:
        @app.get("/api/v1/cfo/briefings")
        @require_permission(Permission.READ_CFO_BRIEFINGS)
        async def get_cfo_briefings(user: CurrentUser = Depends(require_permission(...))):
            # ... handler logic
    """
    async def permission_checker(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        user_role = Role(current_user.role)
        if not has_permission(user_role, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {permission.value}"
            )
        return current_user
    return permission_checker

def require_any_permission(*permissions: Permission):
    """
    FastAPI dependency for checking if user has any of the specified permissions.

    Usage:
        @app.get("/api/v1/dashboard")
        @require_any_permission(Permission.READ_CFO_BRIEFINGS, Permission.READ_CISO_BRIEFINGS)
        async def get_dashboard(user: CurrentUser = Depends(...)):
            # ... handler logic
    """
    async def permission_checker(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        user_role = Role(current_user.role)
        if not has_any_permission(user_role, list(permissions)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: requires one of {', '.join(p.value for p in permissions)}"
            )
        return current_user
    return permission_checker

def require_role(role: Role):
    """
    FastAPI dependency for requiring a specific role.

    Usage:
        @app.get("/api/v1/admin/users")
        @require_role(Role.ADMIN)
        async def list_users(user: CurrentUser = Depends(...)):
            # ... handler logic
    """
    async def role_checker(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if Role(current_user.role) != role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: requires {role.value} role"
            )
        return current_user
    return role_checker

def require_admin():
    """
    FastAPI dependency for requiring admin role.

    Usage:
        @app.post("/api/v1/admin/users")
        @require_admin()
        async def create_user(user: CurrentUser = Depends(...)):
            # ... handler logic
    """
    return require_role(Role.ADMIN)

def is_role_higher_or_equal(role1: Role, role2: Role) -> bool:
    """
    Check if role1 has higher or equal hierarchy level than role2.

    Args:
        role1: First role
        role2: Second role

    Returns:
        True if role1 is higher or equal in hierarchy
    """
    return ROLE_HIERARCHY.get(role1, 0) >= ROLE_HIERARCHY.get(role2, 0)

# Role Description Metadata
ROLE_DESCRIPTIONS: dict[Role, str] = {
    Role.CFO: "Chief Financial Officer - Financial data and briefings",
    Role.CRO: "Chief Risk Officer - Risk data and briefings",
    Role.CLO: "Chief Legal Officer - Compliance data and briefings",
    Role.CIO: "Chief Information Officer - Operational data and briefings",
    Role.CISO: "Chief Information Security Officer - Security data and briefings",
    Role.BOARD: "Board Member - Governance and synthesis of all outputs",
    Role.ADMIN: "Administrator - User and system management",
}

# Permission Description Metadata
PERMISSION_DESCRIPTIONS: dict[Permission, str] = {
    Permission.READ_FINANCIAL_DATA: "Read financial exposure and risk data",
    Permission.READ_CFO_BRIEFINGS: "Access CFO intelligence briefings",
    Permission.QUERY_CFO_AGENT: "Query CFO Agent for analysis",
    Permission.READ_RISK_DATA: "Read risk threshold and appetite data",
    Permission.READ_CRO_BRIEFINGS: "Access CRO intelligence briefings",
    Permission.QUERY_CRO_AGENT: "Query CRO Agent for analysis",
    Permission.READ_COMPLIANCE_DATA: "Read regulatory and compliance data",
    Permission.READ_CLO_BRIEFINGS: "Access CLO intelligence briefings",
    Permission.QUERY_CLO_AGENT: "Query CLO Agent for analysis",
    Permission.READ_OPERATIONAL_DATA: "Read business process and operational data",
    Permission.READ_CIO_BRIEFINGS: "Access CIO intelligence briefings",
    Permission.QUERY_CIO_AGENT: "Query CIO Agent for analysis",
    Permission.READ_SECURITY_DATA: "Read security and threat data",
    Permission.READ_CISO_BRIEFINGS: "Access CISO intelligence briefings",
    Permission.QUERY_CISO_AGENT: "Query CISO Agent for analysis",
    Permission.READ_ALL_AGENTS: "Read all agent outputs (CISO coordination)",
    Permission.READ_ALL_BRIEFINGS: "Access all executive briefings",
    Permission.READ_GOVERNANCE_DATA: "Read governance and board metrics",
    Permission.QUERY_BOARD_AGENT: "Query Board Agent for synthesis",
    Permission.SYNTHESIZE_ALL_OUTPUTS: "Synthesize outputs from all agents",
    Permission.MANAGE_USERS: "Create, update, and delete users",
    Permission.MANAGE_ROLES: "Assign and modify user roles",
    Permission.MANAGE_CUSTOMERS: "Manage customer accounts",
    Permission.READ_ALL_AUDIT_LOGS: "Read all audit logs",
}

def get_role_info(role: Role) -> dict:
    """
    Get role information including permissions.

    Args:
        role: Role to query

    Returns:
        Role information dictionary
    """
    return {
        "role": role.value,
        "description": ROLE_DESCRIPTIONS.get(role, "Unknown role"),
        "permissions": [
            {
                "permission": perm.value,
                "description": PERMISSION_DESCRIPTIONS.get(perm, "")
            }
            for perm in ROLE_PERMISSIONS.get(role, set())
        ],
        "hierarchy_level": ROLE_HIERARCHY.get(role, 0)
    }

def get_all_roles() -> List[dict]:
    """
    Get information about all roles.

    Returns:
        List of role information dictionaries
    """
    return [get_role_info(role) for role in Role]
