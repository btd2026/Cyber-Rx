"""
Unit tests for Privilege Monitor
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock

from src.monitors.privilege_monitor import (
    PrivilegeMonitor,
    PRIVILEGED_ROLES,
    PRIVILEGED_OPERATIONS
)


class TestPrivilegeMonitor:
    """Test suite for PrivilegeMonitor."""

    @pytest.fixture
    def monitor(self):
        """Create privilege monitor instance."""
        return PrivilegeMonitor(privileged_roles=PRIVILEGED_ROLES)

    @pytest.fixture
    def sample_privilege_escalation(self):
        """Sample privilege escalation audit event."""
        return {
            "id": "priv-esc-123",
            "category": "RoleManagement",
            "operationName": "Add member to role",
            "activityDateTime": "2025-01-31T12:00:00Z",
            "initiatedBy": {
                "user": {
                    "userPrincipalName": "admin@example.com",
                    "displayName": "Admin User"
                }
            },
            "targetResources": [
                {
                    "id": "target-id-123",
                    "displayName": "Global Administrator",
                    "type": "Role",
                    "userPrincipalName": "user@example.com"
                }
            ],
            "correlationId": "corr-id-123"
        }

    @pytest.fixture
    def sample_privilege_removal(self):
        """Sample privilege removal audit event."""
        return {
            "id": "priv-rem-123",
            "category": "RoleManagement",
            "operationName": "Remove member from role",
            "activityDateTime": "2025-01-31T12:00:00Z",
            "initiatedBy": {
                "user": {
                    "userPrincipalName": "admin@example.com",
                    "displayName": "Admin User"
                }
            },
            "targetResources": [
                {
                    "id": "target-id-456",
                    "displayName": "Security Administrator",
                    "type": "Role",
                    "userPrincipalName": "user@example.com"
                }
            ],
            "correlationId": "corr-id-456"
        }

    def test_privileged_roles(self):
        """Test privileged roles list."""
        assert "Global Administrator" in PRIVILEGED_ROLES
        assert "Security Administrator" in PRIVILEGED_ROLES
        assert "User Administrator" in PRIVILEGED_ROLES

    def test_privileged_operations(self):
        """Test privileged operations list."""
        assert "Add member to role" in PRIVILEGED_OPERATIONS
        assert "Remove member from role" in PRIVILEGED_OPERATIONS
        assert "Activate role" in PRIVILEGED_OPERATIONS

    def test_detect_privilege_change(self, monitor, sample_privilege_escalation):
        """Test privilege change detection."""
        # Privilege change
        assert monitor.detect_privilege_change(sample_privilege_escalation) is True

        # Not a privilege change (wrong category)
        sample_privilege_escalation["category"] = "UserManagement"
        assert monitor.detect_privilege_change(sample_privilege_escalation) is False

        # Not a privilege change (wrong operation)
        sample_privilege_escalation["category"] = "RoleManagement"
        sample_privilege_escalation["operationName"] = "View audit logs"
        assert monitor.detect_privilege_change(sample_privilege_escalation) is False

    def test_analyze_privilege_change(self, monitor, sample_privilege_escalation):
        """Test privilege change analysis."""
        analysis = monitor.analyze_privilege_change(sample_privilege_escalation)

        assert analysis["event_type"] == "privilege_escalation"
        assert analysis["severity"] == "CRITICAL"
        assert "admin@example.com" in analysis["affected_assets"]
        assert analysis["metadata"]["is_privileged_role"] is True
        assert analysis["metadata"]["is_escalation"] is True

    def test_analyze_privilege_removal(self, monitor, sample_privilege_removal):
        """Test privilege removal analysis."""
        analysis = monitor.analyze_privilege_change(sample_privilege_removal)

        assert analysis["event_type"] == "privileged_role_change"
        assert analysis["severity"] == "HIGH"  # Privileged role but removal
        assert analysis["metadata"]["is_privileged_role"] is True
        assert analysis["metadata"]["is_escalation"] is False

    def test_create_privilege_change_event(self, monitor, sample_privilege_escalation):
        """Test privilege change event creation."""
        event = monitor.create_privilege_change_event(sample_privilege_escalation)

        assert event is not None
        assert event.source == "azure-ad"
        assert event.category.value == "threat"
        assert event.likelihood_score >= 0.9  # Critical escalation
        assert event.remediation_owner == "Security Operations Center (SOC)"

    def test_non_privileged_role_change(self, monitor):
        """Test non-privileged role change."""
        non_privileged_event = {
            "id": "non-priv-123",
            "category": "RoleManagement",
            "operationName": "Add member to role",
            "activityDateTime": "2025-01-31T12:00:00Z",
            "initiatedBy": {
                "user": {
                    "userPrincipalName": "admin@example.com"
                }
            },
            "targetResources": [
                {
                    "id": "target-id-789",
                    "displayName": "Helpdesk Administrator",  # Not privileged
                    "type": "Role",
                    "userPrincipalName": "user@example.com"
                }
            ]
        }

        analysis = monitor.analyze_privilege_change(non_privileged_event)

        assert analysis["event_type"] == "privilege_escalation"
        assert analysis["severity"] == "HIGH"  # Escalation but not privileged role

    def test_app_initiated_change(self, monitor):
        """Test app-initiated privilege change."""
        app_initiated_event = {
            "id": "app-init-123",
            "category": "RoleManagement",
            "operationName": "Add member to role",
            "activityDateTime": "2025-01-31T12:00:00Z",
            "initiatedBy": {
                "app": {
                    "displayName": " provisioning",
                    "servicePrincipalId": "app-id-123"
                }
            },
            "targetResources": [
                {
                    "id": "target-id-999",
                    "displayName": "User Administrator",
                    "type": "Role"
                }
            ]
        }

        analysis = monitor.analyze_privilege_change(app_initiated_event)

        assert "Azure AD Connect" in analysis["metadata"]["initiator"]
        assert analysis["metadata"]["initiator_type"] == "app"

    def test_pim_role_activation(self, monitor):
        """Test PIM role activation."""
        pim_activation_event = {
            "id": "pim-act-123",
            "category": "RoleManagement",
            "operationName": "Activate role",
            "activityDateTime": "2025-01-31T12:00:00Z",
            "initiatedBy": {
                "user": {
                    "userPrincipalName": "admin@example.com"
                }
            },
            "targetResources": [
                {
                    "id": "target-id-pim",
                    "displayName": "Security Administrator",
                    "type": "Role"
                }
            ]
        }

        assert monitor.detect_privilege_change(pim_activation_event) is True

    def test_group_membership_change(self, monitor):
        """Test group membership change."""
        group_change_event = {
            "id": "group-123",
            "category": "RoleManagement",
            "operationName": "Add member to group",
            "activityDateTime": "2025-01-31T12:00:00Z",
            "initiatedBy": {
                "user": {
                    "userPrincipalName": "admin@example.com"
                }
            },
            "targetResources": [
                {
                    "id": "group-id-123",
                    "displayName": "All Users",
                    "type": "Group"
                }
            ]
        }

        assert monitor.detect_privilege_change(group_change_event) is True

    def test_privilege_escalation_pattern(self, monitor):
        """Test privilege escalation pattern detection."""
        # Simulate multiple privilege changes
        for i in range(5):
            event = {
                "id": f"priv-{i}",
                "category": "RoleManagement",
                "operationName": "Add member to role",
                "activityDateTime": datetime.utcnow().isoformat() + "Z",
                "initiatedBy": {
                    "user": {
                        "userPrincipalName": "admin@example.com"
                    }
                },
                "targetResources": [
                    {
                        "id": f"target-{i}",
                        "displayName": "Security Administrator",
                        "type": "Role"
                    }
                ]
            }
            monitor.analyze_privilege_change(event)

        # Detect patterns
        patterns = monitor.detect_privilege_escalation_pattern()

        assert len(patterns) > 0
        assert patterns[0]["initiator"] == "admin@example.com"
        assert patterns[0]["total_changes"] == 5
        assert patterns[0]["escalations"] == 5
