"""
Financial Modeling Engine Configuration

Manages configuration for all components including:
- Kafka connection settings
- TimescaleDB connection settings
- Calculation parameters
- Actuarial data settings
- Batch scheduling
- Logging
- Metrics
- Health checks
"""

import os
from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings


class KafkaConfig(BaseSettings):
    """Kafka configuration for consuming enriched risk objects."""

    bootstrap_servers: str = Field(
        default="localhost:9092",
        description="Kafka bootstrap servers"
    )

    input_topic: str = Field(
        default="enriched-risk-objects",
        description="Kafka topic to consume enriched risk objects from"
    )

    consumer_group: str = Field(
        default="financial-engine-group",
        description="Kafka consumer group ID"
    )

    auto_offset_reset: str = Field(
        default="latest",
        description="Kafka auto offset reset policy"
    )

    enable_auto_commit: bool = Field(
        default=True,
        description="Enable Kafka auto commit"
    )

    session_timeout_ms: int = Field(
        default=30000,
        description="Kafka session timeout in milliseconds"
    )

    heartbeat_interval_ms: int = Field(
        default=10000,
        description="Kafka heartbeat interval in milliseconds"
    )

    class Config:
        env_prefix = "KAFKA_"


class TimescaleConfig(BaseSettings):
    """TimescaleDB configuration for financial impacts storage."""

    host: str = Field(
        default="localhost",
        description="TimescaleDB host"
    )

    port: int = Field(
        default=5432,
        description="TimescaleDB port"
    )

    database: str = Field(
        default="cyberrx",
        description="TimescaleDB database name"
    )

    user: str = Field(
        default="cyberrx",
        description="TimescaleDB user"
    )

    password: str = Field(
        default="cyberrx",
        description="TimescaleDB password"
    )

    pool_size: int = Field(
        default=10,
        description="Connection pool size"
    )

    max_overflow: int = Field(
        default=20,
        description="Max overflow for connection pool"
    )

    query_timeout: int = Field(
        default=30,
        description="Query timeout in seconds"
    )

    class Config:
        env_prefix = "TIMESCALE_"


class CalculationConfig(BaseSettings):
    """Calculation engine configuration."""

    methodology_version: str = Field(
        default="1.0.0",
        description="Calculation methodology version"
    )

    timeout: int = Field(
        default=60,
        description="Calculation timeout in seconds"
    )

    max_retries: int = Field(
        default=3,
        description="Maximum calculation retries on failure"
    )

    batch_size: int = Field(
        default=100,
        description="Batch size for processing risk objects"
    )

    enable_fallback: bool = Field(
        default=True,
        description="Enable fallback to conservative estimates on error"
    )

    fallback_mlr_impact: float = Field(
        default=0.01,
        description="Fallback MLR impact (1 percentage point)"
    )

    fallback_stop_loss_exposure: float = Field(
        default=100000,
        description="Fallback stop-loss exposure ($100K)"
    )

    fallback_reserve_at_risk: float = Field(
        default=150000,
        description="Fallback reserve at risk ($150K)"
    )

    fallback_premium_revenue_risk: float = Field(
        default=200000,
        description="Fallback premium revenue risk ($200K)"
    )

    class Config:
        env_prefix = "CALCULATION_"


class MLRCalculationConfig(BaseSettings):
    """MLR impact calculation configuration."""

    default_claim_rate: float = Field(
        default=0.02,
        description="Default claim rate (2%)"
    )

    default_premium_revenue: float = Field(
        default=1000000,
        description="Default premium revenue ($1M)"
    )

    default_average_claim_cost: float = Field(
        default=1000,
        description="Default average claim cost ($1K)"
    )

    min_mlr_impact: float = Field(
        default=0.0,
        description="Minimum MLR impact (0 percentage points)"
    )

    max_mlr_impact: float = Field(
        default=0.05,
        description="Maximum MLR impact (5 percentage points)"
    )

    class Config:
        env_prefix = "MLR_"


class StopLossConfig(BaseSettings):
    """Stop-loss exposure calculation configuration."""

    default_attachment: float = Field(
        default=250000,
        description="Default attachment point ($250K)"
    )

    default_aggregate: float = Field(
        default=5000000,
        description="Default aggregate limit ($5M)"
    )

    default_current_position: float = Field(
        default=500000,
        description="Default current position ($500K)"
    )

    min_exposure: float = Field(
        default=0.0,
        description="Minimum exposure ($0)"
    )

    class Config:
        env_prefix = "STOP_LOSS_"


class ReserveConfig(BaseSettings):
    """Reserve at risk calculation configuration."""

    default_claim_rate: float = Field(
        default=0.02,
        description="Default claim rate (2%)"
    )

    default_reserve_balance: float = Field(
        default=10000000,
        description="Default reserve balance ($10M)"
    )

    reserve_type_mappings: dict = Field(
        default={
            "claims_adjudication": "case_reserve",
            "enrollment": "medical_loss",
            "care_management": "ibnr",
            "provider_payment": "case_reserve",
            "edi_837": "case_reserve",
            "edi_835": "case_reserve"
        },
        description="Business process to reserve type mappings"
    )

    class Config:
        env_prefix = "RESERVE_"


class PremiumRevenueConfig(BaseSettings):
    """Premium revenue risk calculation configuration."""

    default_attrition_rate: float = Field(
        default=0.05,
        description="Default attrition rate (5%)"
    )

    default_premium_per_member: float = Field(
        default=500,
        description="Default monthly premium per member ($500)"
    )

    default_member_count: int = Field(
        default=100000,
        description="Default member count (100K)"
    )

    line_of_business_mappings: dict = Field(
        default={
            "medicare_claim_processing": "Medicare",
            "medicare_eligibility": "Medicare",
            "medicaid_eligibility": "Medicaid",
            "medicaid_claim_processing": "Medicaid",
            "commercial_enrollment": "Commercial",
            "commercial_claim_processing": "Commercial"
        },
        description="Business process to line of business mappings"
    )

    class Config:
        env_prefix = "PREMIUM_REVENUE_"


class ActuarialDataConfig(BaseSettings):
    """Actuarial data configuration."""

    s3_bucket: str = Field(
        default=None,
        description="S3 bucket for actuarial exports"
    )

    s3_prefix: str = Field(
        default="actuarial-exports",
        description="S3 prefix for actuarial exports"
    )

    ftp_host: str = Field(
        default=None,
        description="FTP host for actuarial exports"
    )

    ftp_port: int = Field(
        default=21,
        description="FTP port"
    )

    ftp_username: str = Field(
        default=None,
        description="FTP username"
    )

    ftp_password: str = Field(
        default=None,
        description="FTP password"
    )

    csv_delimiter: str = Field(
        default=",",
        description="CSV delimiter"
    )

    cache_ttl: int = Field(
        default=3600,
        description="Cache TTL for actuarial data (seconds)"
    )

    data_quality_threshold: float = Field(
        default=0.8,
        description="Minimum data quality score (0.0 - 1.0)"
    )

    class Config:
        env_prefix = "ACTUARIAL_"


class BatchSchedulerConfig(BaseSettings):
    """Batch job scheduler configuration."""

    financial_update_cron: str = Field(
        default="0 2 * * *",
        description="Cron schedule for financial update job (2:00 AM daily)"
    )

    actuarial_export_cron: str = Field(
        default="0 3 * * *",
        description="Cron schedule for actuarial export processing (3:00 AM daily)"
    )

    job_timeout: int = Field(
        default=3600,
        description="Job timeout in seconds (1 hour)"
    )

    max_retries: int = Field(
        default=3,
        description="Maximum job retries on failure"
    )

    retry_delay: int = Field(
        default=300,
        description="Retry delay in seconds (5 minutes)"
    )

    enable_notifications: bool = Field(
        default=True,
        description="Enable job completion notifications"
    )

    notification_email: str = Field(
        default="admin@cyberrx.com",
        description="Email for job notifications"
    )

    class Config:
        env_prefix = "BATCH_"


class LoggingConfig(BaseSettings):
    """Logging configuration."""

    level: str = Field(
        default="INFO",
        description="Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)"
    )

    format: str = Field(
        default="json",
        description="Log format (json, text)"
    )

    file: str = Field(
        default=None,
        description="Log file path (optional)"
    )

    rotation: str = Field(
        default="100 MB",
        description="Log rotation size"
    )

    retention: str = Field(
        default="30 days",
        description="Log retention period"
    )

    class Config:
        env_prefix = "LOG_"


class MetricsConfig(BaseSettings):
    """Prometheus metrics configuration."""

    enabled: bool = Field(
        default=True,
        description="Enable Prometheus metrics"
    )

    port: int = Field(
        default=9090,
        description="Prometheus metrics port"
    )

    path: str = Field(
        default="/metrics",
        description="Prometheus metrics endpoint path"
    )

    class Config:
        env_prefix = "METRICS_"


class HealthCheckConfig(BaseSettings):
    """Health check configuration."""

    kafka_interval: int = Field(
        default=30,
        description="Kafka health check interval (seconds)"
    )

    database_interval: int = Field(
        default=30,
        description="Database health check interval (seconds)"
    )

    timeout: int = Field(
        default=5,
        description="Health check timeout (seconds)"
    )

    class Config:
        env_prefix = "HEALTH_"


class FinancialEngineConfig:
    """Main configuration class for Financial Modeling Engine."""

    def __init__(self):
        """Initialize all configuration sections."""
        self.kafka = KafkaConfig()
        self.timescale = TimescaleConfig()
        self.calculation = CalculationConfig()
        self.mlr = MLRCalculationConfig()
        self.stop_loss = StopLossConfig()
        self.reserve = ReserveConfig()
        self.premium_revenue = PremiumRevenueConfig()
        self.actuarial = ActuarialDataConfig()
        self.batch = BatchSchedulerConfig()
        self.logging = LoggingConfig()
        self.metrics = MetricsConfig()
        self.health = HealthCheckConfig()

    def validate(self) -> bool:
        """
        Validate configuration.

        Returns:
            True if configuration is valid
        """
        # Validate critical settings
        if self.timescale.pool_size <= 0:
            raise ValueError("TimescaleDB pool size must be positive")

        if self.calculation.batch_size <= 0:
            raise ValueError("Calculation batch size must be positive")

        if self.calculation.timeout <= 0:
            raise ValueError("Calculation timeout must be positive")

        # Validate ranges
        if self.mlr.min_mlr_impact < 0 or self.mlr.max_mlr_impact > 1:
            raise ValueError("MLR impact range must be 0.0 - 1.0")

        if self.actuarial.data_quality_threshold < 0 or self.actuarial.data_quality_threshold > 1:
            raise ValueError("Data quality threshold must be 0.0 - 1.0")

        return True


# Global configuration instance
config = FinancialEngineConfig()
