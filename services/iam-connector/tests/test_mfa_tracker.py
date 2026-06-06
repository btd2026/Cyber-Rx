"""
Unit tests for MFA Tracker
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock

from src.trackers.mfa_tracker import MFATracker, MFA_FAILURE_CODES


class TestMFATracker:
    """Test suite for MFATracker."""

    @pytest.fixture
    def tracker(self):
        """Create MFA tracker instance."""
        return MFATracker(suspicious_threshold=10, timeframe_hours=24)

    @pytest.fixture
    def sample_mfa_failure(self):
        """Sample MFA failure sign-in event."""
        return {
            "id": "mfa-fail-123",
            "createdDateTime": "2025-01-31T12:00:00Z",
            "userPrincipalName": "user@example.com",
            "userDisplayName": "John Doe",
            "userId": "user-id-123",
            "status": {
                "errorCode": 50059,
                "failureReason": "MFA required but not provided"
            },
            "location": {
                "city": "New York",
                "countryOrRegion": "US",
                "state": "NY"
            },
            "deviceDetail": {
                "deviceId": "device-id-123"
            },
            "appId": "app-id-123",
            "appDisplayName": "Azure Portal"
        }

    def test_mfa_failure_codes(self):
        """Test MFA failure error codes."""
        assert 50059 in MFA_FAILURE_CODES
        assert 50061 in MFA_FAILURE_CODES
        assert 50079 in MFA_FAILURE_CODES
        assert 50076 in MFA_FAILURE_CODES

    def test_detect_mfa_failure(self, tracker, sample_mfa_failure):
        """Test MFA failure detection."""
        # MFA failure
        assert tracker.detect_mfa_failure(sample_mfa_failure) is True

        # Non-MFA failure
        sample_mfa_failure["status"]["errorCode"] = 0
        assert tracker.detect_mfa_failure(sample_mfa_failure) is False

    def test_track_failure(self, tracker, sample_mfa_failure):
        """Test MFA failure tracking."""
        tracker.track_failure(sample_mfa_failure)

        assert len(tracker._failures_by_user) > 0
        assert "user-id-123" in tracker._failures_by_user
        assert len(tracker._failures_by_user["user-id-123"]) == 1

    def test_analyze_mfa_failure_pattern(self, tracker, sample_mfa_failure):
        """Test MFA failure pattern analysis."""
        # Track multiple failures
        for i in range(5):
            sample_mfa_failure["id"] = f"mfa-fail-{i}"
            sample_mfa_failure["createdDateTime"] = datetime.utcnow().isoformat() + "Z"
            tracker.track_failure(sample_mfa_failure)

        # Analyze pattern
        pattern = tracker.analyze_mfa_failure_pattern("user-id-123")

        assert pattern["user_id"] == "user-id-123"
        assert pattern["failure_count"] == 5
        assert pattern["failure_rate_per_hour"] > 0
        assert pattern["suspicious"] is False  # Below threshold
        assert len(pattern["failed_methods"]) > 0
        assert len(pattern["location_distribution"]) > 0

    def test_suspicious_threshold(self, tracker, sample_mfa_failure):
        """Test suspicious threshold detection."""
        # Track failures above threshold
        for i in range(15):
            sample_mfa_failure["id"] = f"mfa-fail-{i}"
            sample_mfa_failure["createdDateTime"] = datetime.utcnow().isoformat() + "Z"
            tracker.track_failure(sample_mfa_failure)

        # Analyze pattern
        pattern = tracker.analyze_mfa_failure_pattern("user-id-123")

        assert pattern["failure_count"] == 15
        assert pattern["suspicious"] is True  # Above threshold

    def test_create_mfa_failure_event(self, tracker, sample_mfa_failure):
        """Test MFA failure event creation."""
        # Track some failures
        for i in range(5):
            sample_mfa_failure["id"] = f"mfa-fail-{i}"
            tracker.track_failure(sample_mfa_failure)

        # Create event
        event = tracker.create_mfa_failure_event(sample_mfa_failure)

        assert event is not None
        assert event.source == "azure-ad"
        assert "mfa-failure" in event.source_event_id
        assert event.category.value == "threat"
        assert event.likelihood_score >= 0.5
        assert event.remediation_owner == "Security Operations Center (SOC)"

    def test_location_distribution(self, tracker, sample_mfa_failure):
        """Test location distribution calculation."""
        # Track failures from different locations
        locations = ["New York, US", "London, GB", "Paris, FR"]

        for i, location in enumerate(locations):
            parts = location.split(", ")
            sample_mfa_failure["id"] = f"mfa-fail-{i}"
            sample_mfa_failure["location"]["city"] = parts[0]
            sample_mfa_failure["location"]["countryOrRegion"] = parts[1]
            tracker.track_failure(sample_mfa_failure)

        # Analyze pattern
        pattern = tracker.analyze_mfa_failure_pattern("user-id-123")

        assert len(pattern["location_distribution"]) == 3
        assert any(loc["location"] == "New York, US" for loc in pattern["location_distribution"])

    def test_time_distribution(self, tracker, sample_mfa_failure):
        """Test time distribution calculation."""
        # Track failures at different hours
        for i in range(24):
            sample_mfa_failure["id"] = f"mfa-fail-{i}"
            sample_mfa_failure["createdDateTime"] = datetime.utcnow().isoformat() + "Z"
            tracker.track_failure(sample_mfa_failure)

        # Analyze pattern
        pattern = tracker.analyze_mfa_failure_pattern("user-id-123")

        assert len(pattern["time_distribution"]) > 0
        assert all("hour" in t for t in pattern["time_distribution"])
        assert all("count" in t for t in pattern["time_distribution"])

    def test_failed_methods_extraction(self, tracker):
        """Test failed methods extraction."""
        failures = [
            {"error_code": 50059},
            {"error_code": 50061},
            {"error_code": 50079}
        ]

        methods = tracker._get_failed_methods(failures)

        assert len(methods) > 0
        assert "MFA" in str(methods)

    def test_multiple_users(self, tracker, sample_mfa_failure):
        """Test tracking failures for multiple users."""
        users = ["user1@example.com", "user2@example.com", "user3@example.com"]

        for user in users:
            sample_mfa_failure["userId"] = user
            sample_mfa_failure["userPrincipalName"] = user
            sample_mfa_failure["id"] = f"mfa-fail-{user}"

            for i in range(5):
                sample_mfa_failure["id"] = f"mfa-fail-{user}-{i}"
                tracker.track_failure(sample_mfa_failure)

        # Analyze all users
        pattern = tracker.analyze_mfa_failure_pattern()

        assert pattern["total_users_with_failures"] == 3
        assert len(pattern["user_patterns"]) == 3

    def test_timeframe_filtering(self, tracker, sample_mfa_failure):
        """Test timeframe filtering in pattern analysis."""
        # Track old failure (outside timeframe)
        old_time = datetime.utcnow() - timedelta(hours=48)
        sample_mfa_failure["createdDateTime"] = old_time.isoformat() + "Z"
        sample_mfa_failure["id"] = "old-failure"
        tracker.track_failure(sample_mfa_failure)

        # Track recent failure (within timeframe)
        sample_mfa_failure["createdDateTime"] = datetime.utcnow().isoformat() + "Z"
        sample_mfa_failure["id"] = "recent-failure"
        tracker.track_failure(sample_mfa_failure)

        # Analyze pattern (should only include recent)
        pattern = tracker.analyze_mfa_failure_pattern("user-id-123")

        assert pattern["failure_count"] == 1  # Only recent failure
