"""
CFO Agent Tests

Comprehensive tests for CFO Agent implementation covering:
- Unit tests for each component
- Integration tests for end-to-end briefing generation
- Security tests for PHI validation
- Performance tests
- Cost tracking tests

Author: AI/ML Engineer (T-MVP-008)
Date: 2025-06-06
"""

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime, timedelta
import uuid

from src.cfo_agent import CFOAgent
from src.cfo_context_manager import CFOContextManager
from src.cfo_exposure_analyzer import CFOExposureAnalyzer
from src.cfo_trend_analyzer import CFOTrendAnalyzer
from src.cfo_summary_formatter import CFOSummaryFormatter


# ============================================================================
# Fixtures
# ============================================================================

@pytest.fixture
def mock_db_pool():
    """Mock database pool."""
    pool = AsyncMock()
    conn = AsyncMock()
    pool.acquire = AsyncMock(return_value=conn)
    pool.release = AsyncMock()
    return pool


@pytest.fixture
def mock_claude_client():
    """Mock Claude client."""
    client = AsyncMock()
    client.call_claude_with_structured_output = AsyncMock(return_value={
        "briefing_summary": "Test briefing summary",
        "exposure_breakdown": {
            "total_exposure": 1000000,
            "by_business_process": [],
            "by_risk_category": [],
            "by_time_horizon": {"immediate": 500000, "30-days": 300000, "90-days": 200000}
        },
        "mlr_impact_analysis": {
            "total_mlr_impact": 5.0,
            "top_ml_risks": []
        },
        "top_risks": [],
        "trends": ["Trend 1", "Trend 2"],
        "methodology_trail": ["Step 1", "Step 2"],
        "recommendations": ["Recommendation 1"]
    })
    client.estimate_cost = Mock(return_value=0.045)
    return client


@pytest.fixture
def mock_prompt_manager():
    """Mock prompt manager."""
    manager = AsyncMock()
    manager.load_template = Mock(return_value="Test prompt template")
    manager.render_template = Mock(return_value="Rendered prompt")
    return manager


@pytest.fixture
def mock_state_manager():
    """Mock state manager."""
    manager = AsyncMock()
    manager.store_cfo_briefing = AsyncMock()
    manager.get_cfo_briefings = AsyncMock(return_value=[])
    manager.get_cfo_metrics = AsyncMock(return_value={
        "briefings_generated": 0,
        "total_tokens_used": 0,
        "total_cost": 0.0
    })
    return manager


@pytest.fixture
def sample_financial_impacts():
    """Sample financial impact data."""
    return [
        {
            "id": str(uuid.uuid4()),
            "risk_id": str(uuid.uuid4()),
            "organization_id": "org-123",
            "net_exposure": 1000000,
            "mlr_impact": 5.0,
            "stop_loss_exposure": 300000,
            "reserve_at_risk": 200000,
            "premium_revenue_risk": 100000,
            "business_process": "Claims Adjudication",
            "risk_category": "ransomware",
            "likelihood": 0.8,
            "time_horizon": "immediate",
            "affected_systems": ["claims-system"],
            "blast_radius": ["claims", "payments"]
        },
        {
            "id": str(uuid.uuid4()),
            "risk_id": str(uuid.uuid4()),
            "organization_id": "org-123",
            "net_exposure": 500000,
            "mlr_impact": 2.5,
            "stop_loss_exposure": 150000,
            "reserve_at_risk": 100000,
            "premium_revenue_risk": 50000,
            "business_process": "Member Portal",
            "risk_category": "data_breach",
            "likelihood": 0.6,
            "time_horizon": "30-days",
            "affected_systems": ["member-portal"],
            "blast_radius": ["member_data"]
        }
    ]


@pytest.fixture
def cfo_agent(mock_db_pool, mock_claude_client, mock_prompt_manager, mock_state_manager):
    """CFO Agent instance."""
    return CFOAgent(
        db_pool=mock_db_pool,
        claude_client=mock_claude_client,
        prompt_manager=mock_prompt_manager,
        state_manager=mock_state_manager
    )


# ============================================================================
# Unit Tests: CFO Context Manager
# ============================================================================

class TestCFOContextManager:
    """Unit tests for CFO Context Manager."""

    @pytest.mark.asyncio
    async def test_load_financial_context(self, mock_db_pool):
        """Test loading financial context from database."""
        # Mock database response
        mock_conn = AsyncMock()
        mock_conn.fetch = AsyncMock(return_value=[
            {
                "id": uuid.uuid4(),
                "risk_id": uuid.uuid4(),
                "organization_id": "org-123",
                "scenario_id": None,
                "breach_response_cost": 100000,
                "regulatory_fine": 50000,
                "business_interruption": 200000,
                "fraud_loss": 50000,
                "reputational_loss": 100000,
                "legal_cost": 75000,
                "recovery_cost": 125000,
                "total_gross": 700000,
                "insurance_coverage": 200000,
                "net_exposure": 500000,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "risk_title": "Test Risk",
                "description": "Test risk description",
                "risk_category": "ransomware",
                "likelihood": 0.8,
                "business_process": "Claims Adjudication",
                "affected_systems": ["claims-system"],
                "blast_radius": ["claims"],
                "mitigation_status": "open"
            }
        ])

        with patch.object(mock_db_pool, 'acquire', return_value=mock_conn):
            manager = CFOContextManager(mock_db_pool)
            impacts = await manager.load_financial_context("org-123")

            assert len(impacts) == 1
            assert impacts[0]["net_exposure"] == 500000
            assert impacts[0]["mlr_impact"] > 0  # Should be calculated
            assert impacts[0]["time_horizon"] == "immediate"  # Ransomware

    @pytest.mark.asyncio
    async def test_build_cfo_context(self, mock_db_pool):
        """Test building complete CFO context."""
        mock_conn = AsyncMock()
        mock_conn.fetch = AsyncMock(return_value=[])

        with patch.object(mock_db_pool, 'acquire', return_value=mock_conn):
            manager = CFOContextManager(mock_db_pool)
            context = await manager.build_cfo_context(
                organization_id="org-123",
                query="What's our exposure?",
                time_range=None
            )

            assert "query" in context
            assert "financial_impacts" in context
            assert "risk_objects" in context
            assert "summary" in context


# ============================================================================
# Unit Tests: CFO Exposure Analyzer
# ============================================================================

class TestCFOExposureAnalyzer:
    """Unit tests for CFO Exposure Analyzer."""

    def test_analyze_exposure(self, sample_financial_impacts):
        """Test exposure analysis."""
        analyzer = CFOExposureAnalyzer()
        analysis = analyzer.analyze_exposure(sample_financial_impacts)

        assert analysis["total_exposure"] == 1500000
        assert "by_business_process" in analysis
        assert "by_risk_category" in analysis
        assert "mlr_impact_analysis" in analysis
        assert "methodology_trail" in analysis
        assert len(analysis["methodology_trail"]) > 0

    def test_breakdown_by_business_process(self, sample_financial_impacts):
        """Test business process breakdown."""
        analyzer = CFOExposureAnalyzer()
        analysis = analyzer.analyze_exposure(sample_financial_impacts)

        by_process = analysis["by_business_process"]
        assert len(by_process) == 2

        # Should be sorted by exposure descending
        assert by_process[0]["process"] == "Claims Adjudication"
        assert by_process[0]["exposure"] == 1000000

    def test_scenario_analysis(self, sample_financial_impacts):
        """Test scenario analysis."""
        analyzer = CFOExposureAnalyzer()
        scenario_analysis = analyzer.analyze_scenario(
            financial_impacts=sample_financial_impacts,
            scenario_type="ransomware",
            scenario_multiplier=2.0
        )

        assert scenario_analysis["scenario_type"] == "ransomware"
        assert scenario_analysis["scenario_multiplier"] == 2.0
        assert scenario_analysis["scenario_exposure"] > scenario_analysis["baseline_exposure"]
        assert scenario_analysis["increase_percentage"] == 100.0  # 2x multiplier = 100% increase


# ============================================================================
# Unit Tests: CFO Trend Analyzer
# ============================================================================

class TestCFOTrendAnalyzer:
    """Unit tests for CFO Trend Analyzer."""

    def test_analyze_trends(self, sample_financial_impacts):
        """Test trend analysis."""
        analyzer = CFOTrendAnalyzer()
        trends = analyzer.analyze_trends(sample_financial_impacts)

        assert "period_trends" in trends
        assert "emerging_risks" in trends
        assert "trend_velocity" in trends
        assert "anomalies" in trends
        assert "insights" in trends

    def test_identify_emerging_risks(self, sample_financial_impacts):
        """Test emerging risk identification."""
        analyzer = CFOTrendAnalyzer()
        trends = analyzer.analyze_trends(sample_financial_impacts)

        # First impact is high likelihood + high exposure + immediate
        emerging = trends["emerging_risks"]
        assert len(emerging) >= 1

        if len(emerging) > 0:
            assert emerging[0]["urgency"] in ["critical", "high", "medium", "low"]

    def test_forecast_exposure(self, sample_financial_impacts):
        """Test exposure forecasting."""
        analyzer = CFOTrendAnalyzer()
        forecast = analyzer.forecast_exposure(
            financial_impacts=sample_financial_impacts,
            forecast_days=30
        )

        assert forecast["current_exposure"] > 0
        assert forecast["forecast_days"] == 30
        assert forecast["forecast_exposure"] >= forecast["current_exposure"]
        assert "confidence_interval" in forecast


# ============================================================================
# Unit Tests: CFO Summary Formatter
# ============================================================================

class TestCFOSummaryFormatter:
    """Unit tests for CFO Summary Formatter."""

    def test_format_json(self):
        """Test JSON formatting."""
        formatter = CFOSummaryFormatter()
        briefing = {
            "briefing_summary": "Test summary",
            "exposure_breakdown": {
                "total_exposure": 1000000,
                "by_business_process": [],
                "by_risk_category": [],
                "by_time_horizon": {}
            },
            "mlr_impact_analysis": {
                "total_mlr_impact": 5.0,
                "top_ml_risks": []
            },
            "top_risks": [],
            "trends": [],
            "methodology_trail": [],
            "recommendations": []
        }

        formatted = formatter.format_for_frontend(briefing, format_type="json")

        assert "metadata" in formatted
        assert "executive_summary" in formatted
        assert "exposure_breakdown" in formatted
        assert formatted["metadata"]["format"] == "board_ready_briefing"

    def test_format_markdown(self):
        """Test Markdown formatting."""
        formatter = CFOSummaryFormatter()
        briefing = {
            "briefing_summary": "Test summary",
            "exposure_breakdown": {
                "total_exposure": 1000000,
                "by_business_process": [
                    {"process": "Claims", "exposure": 500000, "mlr_impact": 2.5, "likelihood": 0.8}
                ],
                "by_risk_category": [],
                "by_time_horizon": {}
            },
            "mlr_impact_analysis": {
                "total_mlr_impact": 5.0,
                "top_ml_risks": []
            },
            "top_risks": [],
            "trends": ["Trend 1"],
            "methodology_trail": ["Step 1"],
            "recommendations": ["Recommendation 1"]
        }

        formatted = formatter.format_for_frontend(briefing, format_type="markdown")

        assert "markdown" in formatted
        assert "# CFO Financial Risk Briefing" in formatted["markdown"]
        assert "Test summary" in formatted["markdown"]

    def test_validate_briefing(self):
        """Test briefing validation."""
        formatter = CFOSummaryFormatter()

        # Valid briefing
        valid_briefing = {
            "briefing_summary": "Test",
            "exposure_breakdown": {"total_exposure": 1000000},
            "mlr_impact_analysis": {},
            "top_risks": [],
            "trends": [],
            "methodology_trail": ["Step 1", "Step 2", "Step 3", "Step 4", "Step 5"],
            "recommendations": ["Rec 1", "Rec 2", "Rec 3"]
        }

        validation = formatter.validate_briefing(valid_briefing)
        assert validation["is_valid"] is True

        # Invalid briefing (missing fields)
        invalid_briefing = {"briefing_summary": "Test"}
        validation = formatter.validate_briefing(invalid_briefing)
        assert validation["is_valid"] is False
        assert len(validation["errors"]) > 0


# ============================================================================
# Integration Tests: End-to-End
# ============================================================================

class TestCFOAgentIntegration:
    """Integration tests for CFO Agent."""

    @pytest.mark.asyncio
    async def test_generate_briefing_end_to_end(self, cfo_agent):
        """Test end-to-end briefing generation."""
        # Mock context loading
        with patch.object(cfo_agent.context_manager, 'build_cfo_context') as mock_context:
            mock_context.return_value = {
                "query": "What's our exposure?",
                "time_range": None,
                "financial_impacts": [],
                "risk_objects": [],
                "summary": {"total_exposure": 1000000, "total_financial_impacts": 0}
            }

            # Generate briefing
            briefing = await cfo_agent.generate_briefing(
                organization_id="org-123",
                query="What's our exposure?",
                time_range=None,
                include_trends=True,
                format_type="json"
            )

            assert briefing is not None
            assert "metadata" in briefing
            assert "executive_summary" in briefing
            assert briefing["metadata"]["agent_type"] == "cfo"

    @pytest.mark.asyncio
    async def test_get_exposure_breakdown_fast_path(self, cfo_agent):
        """Test fast exposure breakdown endpoint (no full briefing)."""
        with patch.object(cfo_agent.context_manager, 'load_financial_context') as mock_load:
            mock_load.return_value = []

            exposure = await cfo_agent.get_exposure_breakdown("org-123")

            assert exposure["organization_id"] == "org-123"
            assert "exposure_analysis" in exposure

    @pytest.mark.asyncio
    async def test_get_trends_fast_path(self, cfo_agent):
        """Test fast trends endpoint (no full briefing)."""
        with patch.object(cfo_agent.context_manager, 'load_financial_context') as mock_load:
            mock_load.return_value = []

            trends = await cfo_agent.get_trends("org-123")

            assert trends["organization_id"] == "org-123"
            assert "trend_analysis" in trends


# ============================================================================
# Security Tests: PHI Validation
# ============================================================================

class TestCFOAgentSecurity:
    """Security tests for PHI validation."""

    @pytest.mark.asyncio
    async def test_no_phi_in_briefing(self, cfo_agent):
        """Test that NO PHI is present in generated briefings."""
        with patch.object(cfo_agent.context_manager, 'build_cfo_context') as mock_context:
            # Context with NO PHI
            mock_context.return_value = {
                "query": "What's our exposure?",
                "financial_impacts": [
                    {
                        "business_process": "Claims Adjudication",
                        "net_exposure": 1000000,
                        "mlr_impact": 5.0
                    }
                ],
                "risk_objects": [],
                "summary": {}
            }

            briefing = await cfo_agent.generate_briefing(
                organization_id="org-123",
                query="What's our exposure?"
            )

            # Verify NO PHI in briefing
            from src.phi_validator import validate_no_phi
            validation = validate_no_phi(briefing)
            assert validation.is_valid is True

    @pytest.mark.asyncio
    async def test_phi_detection_blocks_briefing(self, cfo_agent):
        """Test that PHI detection blocks briefing generation."""
        with patch.object(cfo_agent.context_manager, 'build_cfo_context') as mock_context:
            # Context WITH PHI (should raise error)
            mock_context.return_value = {
                "query": "What's our exposure?",
                "financial_impacts": [
                    {
                        "business_process": "Claims Adjudication",
                        "net_exposure": 1000000,
                        "member_id": "MEM-12345"  # PHI!
                    }
                ],
                "risk_objects": [],
                "summary": {}
            }

            # Mock validate_no_phi to detect PHI
            with patch('src.phi_validator.validate_no_phi') as mock_validate:
                mock_validate.return_value = Mock(
                    is_valid=False,
                    phi_patterns=["member_id"]
                )

                # Should raise ValueError
                with pytest.raises(ValueError, match="PHI DETECTED"):
                    await cfo_agent.generate_briefing(
                        organization_id="org-123",
                        query="What's our exposure?"
                    )


# ============================================================================
# Performance Tests
# ============================================================================

class TestCFOAgentPerformance:
    """Performance tests for CFO Agent."""

    @pytest.mark.asyncio
    @pytest.mark.slow
    async def test_briefing_generation_under_30_seconds(self, cfo_agent):
        """Test that briefing generation completes in under 30 seconds."""
        import time

        with patch.object(cfo_agent.context_manager, 'build_cfo_context') as mock_context:
            mock_context.return_value = {
                "query": "What's our exposure?",
                "financial_impacts": [],
                "risk_objects": [],
                "summary": {}
            }

            start_time = time.time()

            await cfo_agent.generate_briefing(
                organization_id="org-123",
                query="What's our exposure?"
            )

            duration = time.time() - start_time

            # Should complete in under 30 seconds
            assert duration < 30.0, f"Briefing took {duration:.2f}s (expected < 30s)"


# ============================================================================
# Cost Tracking Tests
# ============================================================================

class TestCFOAgentCosts:
    """Tests for cost tracking."""

    def test_cost_estimation(self):
        """Test cost estimation accuracy."""
        from src.claude_client import ClaudeClient

        client = ClaudeClient(api_key="test")

        # Test cost calculation
        cost = client.estimate_cost(input_tokens=5000, output_tokens=2000)

        # Claude Sonnet pricing: $3/M input, $15/M output
        expected_cost = (5000 / 1_000_000 * 3.0) + (2000 / 1_000_000 * 15.0)

        assert abs(cost - expected_cost) < 0.001


# ============================================================================
# Run Tests
# ============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
