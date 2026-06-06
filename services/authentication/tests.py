"""
CyberRX Authentication Service - Tests

Comprehensive tests for authentication, authorization, and audit logging.
Run with: pytest tests/authentication/test_auth.py -v
"""

import pytest
from datetime import datetime, timedelta
from services.authentication.auth import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_token,
    generate_totp_secret, verify_totp,
    generate_backup_codes
)
from services.authentication.rbac import (
    Role, Permission,
    has_permission, has_any_permission, has_all_permissions,
    is_role_higher_or_equal
)
from services.authentication.agent_auth import (
    AgentType,
    agent_can_access_data, check_cross_agent_access,
    get_agent_accessible_data, get_all_agents
)

# =====================================================
# Password Hashing Tests
# =====================================================

class TestPasswordHashing:
    """Test password hashing and verification"""

    def test_hash_password(self):
        """Test password hashing"""
        password = "SecurePassword123!"
        hashed = hash_password(password)

        assert hashed is not None
        assert isinstance(hashed, str)
        assert hashed != password
        assert hashed.startswith("$2b$12$")  # Bcrypt format

    def test_verify_password_correct(self):
        """Test password verification with correct password"""
        password = "SecurePassword123!"
        hashed = hash_password(password)

        assert verify_password(password, hashed) is True

    def test_verify_password_incorrect(self):
        """Test password verification with incorrect password"""
        password = "SecurePassword123!"
        hashed = hash_password(password)

        assert verify_password("WrongPassword", hashed) is False

    def test_hash_different_passwords_different_hashes(self):
        """Test that different passwords produce different hashes"""
        password1 = "Password1"
        password2 = "Password2"

        hash1 = hash_password(password1)
        hash2 = hash_password(password2)

        assert hash1 != hash2

    def test_hash_same_password_different_hashes(self):
        """Test that same password produces different hashes (salt)"""
        password = "SecurePassword123!"

        hash1 = hash_password(password)
        hash2 = hash_password(password)

        assert hash1 != hash2  # Different salts
        assert verify_password(password, hash1)
        assert verify_password(password, hash2)

# =====================================================
# JWT Token Tests
# =====================================================

class TestJWTTokens:
    """Test JWT token creation and validation"""

    def test_create_access_token(self):
        """Test access token creation"""
        data = {
            "sub": "john.doe",
            "role": "cfo",
            "customer_id": "customer-123"
        }

        token = create_access_token(data)

        assert token is not None
        assert isinstance(token, str)

    def test_decode_valid_token(self):
        """Test decoding valid token"""
        data = {
            "sub": "john.doe",
            "role": "cfo",
            "customer_id": "customer-123"
        }

        token = create_access_token(data)
        payload = decode_token(token)

        assert payload["sub"] == "john.doe"
        assert payload["role"] == "cfo"
        assert payload["customer_id"] == "customer-123"
        assert payload["type"] == "access"
        assert "exp" in payload
        assert "iat" in payload

    def test_access_token_expiration(self):
        """Test access token expiration"""
        data = {
            "sub": "john.doe",
            "role": "cfo",
            "customer_id": "customer-123"
        }

        token = create_access_token(data)
        payload = decode_token(token)

        # Check expiration is ~30 minutes from now
        exp = datetime.fromtimestamp(payload["exp"])
        iat = datetime.fromtimestamp(payload["iat"])
        delta = exp - iat

        assert delta.total_seconds() == pytest.approx(30 * 60, abs=1)

    def test_refresh_token_type(self):
        """Test refresh token has correct type"""
        data = {
            "sub": "john.doe",
            "role": "cfo",
            "customer_id": "customer-123"
        }

        token = create_refresh_token(data)
        payload = decode_token(token)

        assert payload["type"] == "refresh"

    def test_refresh_token_expiration(self):
        """Test refresh token expiration"""
        data = {
            "sub": "john.doe",
            "role": "cfo",
            "customer_id": "customer-123"
        }

        token = create_refresh_token(data)
        payload = decode_token(token)

        # Check expiration is ~7 days from now
        exp = datetime.fromtimestamp(payload["exp"])
        iat = datetime.fromtimestamp(payload["iat"])
        delta = exp - iat

        assert delta.total_seconds() == pytest.approx(7 * 24 * 60 * 60, abs=1)

# =====================================================
# MFA Tests
# =====================================================

class TestMFA:
    """Test MFA (TOTP) functionality"""

    def test_generate_totp_secret(self):
        """Test TOTP secret generation"""
        secret = generate_totp_secret()

        assert secret is not None
        assert isinstance(secret, str)
        assert len(secret) == 16  # Base32-encoded
        assert secret.isupper()
        assert secret.isalnum()

    def test_verify_totp_valid_code(self):
        """Test TOTP verification with valid code"""
        secret = generate_totp_secret()
        totp = pyotp.TOTP(secret)
        code = totp.now()

        assert verify_totp(secret, code) is True

    def test_verify_totp_invalid_code(self):
        """Test TOTP verification with invalid code"""
        secret = generate_totp_secret()

        assert verify_totp(secret, "000000") is False

    def test_verify_totp_time_window(self):
        """Test TOTP verification with time window"""
        secret = generate_totp_secret()
        totp = pyotp.TOTP(secret)

        # Current code
        current_code = totp.now()

        # Verify with valid window
        assert verify_totp(secret, current_code, valid_window=1) is True

    def test_generate_backup_codes(self):
        """Test backup code generation"""
        codes = generate_backup_codes(10)

        assert len(codes) == 10
        assert all(isinstance(code, str) for code in codes)
        assert all(len(code) == 8 for code in codes)
        assert all(code.isupper() for code in codes)
        assert all(code.isalnum() for code in codes)

    def test_backup_codes_unique(self):
        """Test backup codes are unique"""
        codes = generate_backup_codes(10)

        assert len(set(codes)) == 10  # All unique

# =====================================================
# RBAC Tests
# =====================================================

class TestRBAC:
    """Test role-based access control"""

    def test_cfo_permissions(self):
        """Test CFO role has correct permissions"""
        assert has_permission(Role.CFO, Permission.READ_FINANCIAL_DATA)
        assert has_permission(Role.CFO, Permission.READ_CFO_BRIEFINGS)
        assert has_permission(Role.CFO, Permission.QUERY_CFO_AGENT)
        assert not has_permission(Role.CFO, Permission.READ_SECURITY_DATA)

    def test_ciso_permissions(self):
        """Test CISO role has correct permissions"""
        assert has_permission(Role.CISO, Permission.READ_SECURITY_DATA)
        assert has_permission(Role.CISO, Permission.READ_CISO_BRIEFINGS)
        assert has_permission(Role.CISO, Permission.QUERY_CISO_AGENT)
        assert has_permission(Role.CISO, Permission.READ_ALL_AGENTS)

    def test_board_permissions(self):
        """Test Board role has correct permissions"""
        assert has_permission(Role.BOARD, Permission.READ_ALL_BRIEFINGS)
        assert has_permission(Role.BOARD, Permission.READ_GOVERNANCE_DATA)
        assert has_permission(Role.BOARD, Permission.QUERY_BOARD_AGENT)
        assert has_permission(Role.BOARD, Permission.SYNTHESIZE_ALL_OUTPUTS)

    def test_has_any_permission(self):
        """Test checking for any of multiple permissions"""
        permissions = [Permission.READ_FINANCIAL_DATA, Permission.READ_SECURITY_DATA]

        # CFO has financial but not security
        assert has_any_permission(Role.CFO, permissions) is True

        # CISO has security but not financial
        assert has_any_permission(Role.CISO, permissions) is True

    def test_has_all_permissions(self):
        """Test checking for all of multiple permissions"""
        permissions = [Permission.READ_FINANCIAL_DATA, Permission.READ_CFO_BRIEFINGS]

        # CFO has both
        assert has_all_permissions(Role.CFO, permissions) is True

        # CISO has neither
        assert has_all_permissions(Role.CISO, permissions) is False

    def test_role_hierarchy(self):
        """Test role hierarchy"""
        assert is_role_higher_or_equal(Role.ADMIN, Role.CISO)
        assert is_role_higher_or_equal(Role.BOARD, Role.CFO)
        assert is_role_higher_or_equal(Role.CISO, Role.CISO)
        assert not is_role_higher_or_equal(Role.CFO, Role.BOARD)

# =====================================================
# Agent Authorization Tests
# =====================================================

class TestAgentAuthorization:
    """Test agent-to-data authorization"""

    def test_cfo_agent_data_access(self):
        """Test CFO agent can access financial data"""
        assert agent_can_access_data(AgentType.CFO, "financial_exposure")
        assert agent_can_access_data(AgentType.CFO, "cfo_briefings")
        assert not agent_can_access_data(AgentType.CFO, "ciso_briefings")

    def test_ciso_agent_data_access(self):
        """Test CISO agent can access security and all agents"""
        assert agent_can_access_data(AgentType.CISO, "risk_objects")
        assert agent_can_access_data(AgentType.CISO, "ciso_briefings")
        assert agent_can_access_data(AgentType.CISO, "cfo_briefings")  # Coordination
        assert agent_can_access_data(AgentType.CISO, "cro_briefings")

    def test_board_agent_data_access(self):
        """Test Board agent can access governance and all briefings"""
        assert agent_can_access_data(AgentType.BOARD, "governance_metrics")
        assert agent_can_access_data(AgentType.BOARD, "board_briefings")
        assert agent_can_access_data(AgentType.BOARD, "cfo_briefings")  # Synthesis
        assert agent_can_access_data(AgentType.BOARD, "ciso_briefings")

    def test_cross_agent_access_denied(self):
        """Test cross-agent access is denied"""
        # CFO cannot access CISO data
        assert not check_cross_agent_access(AgentType.CFO, AgentType.CISO)

        # CISO can access all agents
        assert check_cross_agent_access(AgentType.CISO, AgentType.CFO)
        assert check_cross_agent_access(AgentType.CISO, AgentType.CRO)

        # Board can access all agents
        assert check_cross_agent_access(AgentType.BOARD, AgentType.CFO)
        assert check_cross_agent_access(AgentType.BOARD, AgentType.CISO)

    def test_get_agent_accessible_data(self):
        """Test getting all accessible data for agent"""
        cfo_data = get_agent_accessible_data(AgentType.CFO)

        assert "financial_exposure" in cfo_data
        assert "cfo_briefings" in cfo_data
        assert "ciso_briefings" not in cfo_data

    def test_get_all_agents(self):
        """Test getting information about all agents"""
        agents = get_all_agents()

        assert len(agents) == 6  # CFO, CRO, CLO, CIO, CISO, Board
        assert all("agent_type" in agent for agent in agents)
        assert all("accessible_data_types" in agent for agent in agents)

# =====================================================
# Integration Tests
# =====================================================

class TestAuthenticationIntegration:
    """Integration tests for authentication flow"""

    @pytest.mark.asyncio
    async def test_login_flow(self):
        """Test complete login flow"""
        # This would require full FastAPI test client
        # Placeholder for now
        pass

    @pytest.mark.asyncio
    async def test_token_refresh_flow(self):
        """Test token refresh flow"""
        # This would require full FastAPI test client
        # Placeholder for now
        pass

# =====================================================
# Run Tests
# =====================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
