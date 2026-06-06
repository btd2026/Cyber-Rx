#!/usr/bin/env python3
"""
CyberRX Authentication Service - Quick Test

Quick verification script for authentication, authorization, and MFA.
Run: python test_auth.py
"""

import sys
sys.path.insert(0, '/Users/briandibassinga/Github/Cyber-Rx')

from services.authentication.auth import (
    hash_password, verify_password,
    create_access_token, decode_token,
    generate_totp_secret, verify_totp,
    generate_backup_codes
)
from services.authentication.rbac import (
    Role, Permission, has_permission,
    is_role_higher_or_equal, get_all_roles
)
from services.authentication.agent_auth import (
    AgentType, agent_can_access_data,
    check_cross_agent_access, get_all_agents
)

def test_password_hashing():
    """Test password hashing"""
    print("Testing password hashing...")

    password = "SecurePassword123!"
    hashed = hash_password(password)

    assert hashed != password, "Hash should not equal password"
    assert verify_password(password, hashed), "Correct password should verify"
    assert not verify_password("WrongPassword", hashed), "Wrong password should not verify"

    print("✓ Password hashing working correctly")

def test_jwt_tokens():
    """Test JWT tokens"""
    print("Testing JWT tokens...")

    data = {
        "sub": "john.doe",
        "role": "cfo",
        "customer_id": "customer-123"
    }

    token = create_access_token(data)
    payload = decode_token(token)

    assert payload["sub"] == "john.doe", "Username should match"
    assert payload["role"] == "cfo", "Role should match"
    assert payload["customer_id"] == "customer-123", "Customer ID should match"
    assert payload["type"] == "access", "Token type should be access"

    print("✓ JWT tokens working correctly")

def test_mfa():
    """Test MFA (TOTP)"""
    print("Testing MFA (TOTP)...")

    secret = generate_totp_secret()
    import pyotp
    totp = pyotp.TOTP(secret)
    code = totp.now()

    assert verify_totp(secret, code), "Valid TOTP should verify"
    assert not verify_totp(secret, "000000"), "Invalid TOTP should not verify"

    backup_codes = generate_backup_codes(10)
    assert len(backup_codes) == 10, "Should generate 10 backup codes"
    assert len(set(backup_codes)) == 10, "All backup codes should be unique"

    print("✓ MFA (TOTP) working correctly")

def test_rbac():
    """Test RBAC"""
    print("Testing RBAC...")

    assert has_permission(Role.CFO, Permission.READ_FINANCIAL_DATA), "CFO should read financial data"
    assert not has_permission(Role.CFO, Permission.READ_SECURITY_DATA), "CFO should not read security data"
    assert has_permission(Role.CISO, Permission.READ_ALL_AGENTS), "CISO should read all agents"

    assert is_role_higher_or_equal(Role.ADMIN, Role.CFO), "Admin higher than CFO"
    assert not is_role_higher_or_equal(Role.CFO, Role.ADMIN), "CFO not higher than Admin"

    roles = get_all_roles()
    assert len(roles) == 7, "Should have 7 roles"

    print("✓ RBAC working correctly")

def test_agent_authorization():
    """Test agent authorization"""
    print("Testing agent authorization...")

    assert agent_can_access_data(AgentType.CFO, "financial_exposure"), "CFO should access financial data"
    assert not agent_can_access_data(AgentType.CFO, "ciso_briefings"), "CFO should not access CISO data"

    assert agent_can_access_data(AgentType.CISO, "cfo_briefings"), "CISO should access all agents"
    assert agent_can_access_data(AgentType.BOARD, "cfo_briefings"), "Board should access all briefings"

    assert not check_cross_agent_access(AgentType.CFO, AgentType.CISO), "CFO should not cross-access CISO"
    assert check_cross_agent_access(AgentType.CISO, AgentType.CFO), "CISO should cross-access CFO"

    agents = get_all_agents()
    assert len(agents) == 6, "Should have 6 agents"

    print("✓ Agent authorization working correctly")

def main():
    """Run all tests"""
    print("=" * 60)
    print("CyberRX Authentication Service - Quick Test")
    print("=" * 60)
    print()

    try:
        test_password_hashing()
        test_jwt_tokens()
        test_mfa()
        test_rbac()
        test_agent_authorization()

        print()
        print("=" * 60)
        print("All tests passed! ✓")
        print("=" * 60)
        return 0

    except AssertionError as e:
        print()
        print("=" * 60)
        print(f"Test failed: {e}")
        print("=" * 60)
        return 1
    except Exception as e:
        print()
        print("=" * 60)
        print(f"Error: {e}")
        print("=" * 60)
        return 1

if __name__ == "__main__":
    sys.exit(main())
