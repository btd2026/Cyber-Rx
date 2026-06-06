"""
Configuration management for Risk Normalization Engine.

Loads configuration from environment variables and YAML files.
Validates configuration against JSON Schema.
"""

import os
import yaml
from pathlib import Path
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, validator
from pydantic_settings import BaseSettings


class KafkaConfig(BaseModel):
    """Kafka configuration."""

    bootstrap_servers: str = Field(
        default="localhost:9092",
        description="Kafka bootstrap servers"
    )
    input_topic: str = Field(
        default="raw-security-events",
        description="Input Kafka topic for raw security events"
    )
    output_topic: str = Field(
        default="enriched-risk-objects",
        description="Output Kafka topic for enriched risk objects"
    )
    consumer_group: str = Field(
        default="normalization-engine",
        description="Kafka consumer group ID"
    )
    auto_offset_reset: str = Field(
        default="earliest",
        description="Kafka auto offset reset policy"
    )
    enable_auto_commit: bool = Field(
        default=True,
        description="Enable Kafka auto commit"
    )


class TimescaleDBConfig(BaseModel):
    """TimescaleDB configuration."""

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
        default="",
        description="TimescaleDB password"
    )
    pool_size: int = Field(
        default=10,
        description="Connection pool size"
    )
    query_timeout: int = Field(
        default=30,
        description="Query timeout in seconds"
    )


class PHIStrippingConfig(BaseModel):
    """PHI stripping configuration."""

    enabled: bool = Field(
        default=True,
        description="Enable PHI stripping"
    )
    spacy_model: str = Field(
        default="en_core_web_sm",
        description="spaCy model for NLP-based PHI detection"
    )
    use_nlp: bool = Field(
        default=True,
        description="Enable NLP-based PHI detection"
    )
    log_stripping: bool = Field(
        default=True,
        description="Log all PHI stripping operations"
    )


class BusinessProcessConfig(BaseModel):
    """Business process graph configuration."""

    cache_ttl_seconds: int = Field(
        default=3600,
        description="Cache TTL for business process queries (1 hour)"
    )
    cache_max_size: int = Field(
        default=10000,
        description="Maximum cache size"
    )


class BlastRadiusConfig(BaseModel):
    """Blast radius analyzer configuration."""

    max_depth: int = Field(
        default=10,
        description="Maximum traversal depth for BFS"
    )
    bfs_timeout_seconds: int = Field(
        default=30,
        description="BFS traversal timeout"
    )


class RegulatoryMappingConfig(BaseModel):
    """Regulatory mapping configuration."""

    hipaa_enabled: bool = Field(
        default=True,
        description="Enable HIPAA regulation mapping"
    )
    cms_enabled: bool = Field(
        default=True,
        description="Enable CMS regulation mapping"
    )
    notification_timeline_days: Dict[str, int] = Field(
        default={
            "hipaa_breach": 60,
            "cms_10743": 60,
            "cms_mlr": 90
        },
        description="Notification timelines in days"
    )


class ValidationConfig(BaseModel):
    """Validation configuration."""

    strict_mode: bool = Field(
        default=True,
        description="Enable strict validation (fail on warnings)"
    )
    warn_on_unknown_fields: bool = Field(
        default=True,
        description="Warn on unknown fields in RiskObject"
    )


class LoggingConfig(BaseModel):
    """Logging configuration."""

    level: str = Field(
        default="INFO",
        description="Log level (DEBUG, INFO, WARNING, ERROR)"
    )
    format: str = Field(
        default="json",
        description="Log format (json, text)"
    )
    file: Optional[str] = Field(
        default=None,
        description="Log file path (optional)"
    )


class MetricsConfig(BaseModel):
    """Prometheus metrics configuration."""

    enabled: bool = Field(
        default=True,
        description="Enable Prometheus metrics"
    )
    port: int = Field(
        default=9090,
        description="Prometheus metrics port"
    )


class HealthCheckConfig(BaseModel):
    """Health check configuration."""

    kafka_interval_seconds: int = Field(
        default=30,
        description="Kafka connectivity check interval"
    )
    database_interval_seconds: int = Field(
        default=30,
        description="Database connectivity check interval"
    )
    timeout_seconds: int = Field(
        default=5,
        description="Health check timeout"
    )


class NormalizationEngineConfig(BaseSettings):
    """Complete configuration for Normalization Engine."""

    kafka: KafkaConfig
    timescaledb: TimescaleDBConfig
    phi_stripping: PHIStrippingConfig
    business_process: BusinessProcessConfig
    blast_radius: BlastRadiusConfig
    regulatory_mapping: RegulatoryMappingConfig
    validation: ValidationConfig
    logging: LoggingConfig
    metrics: MetricsConfig
    health_check: HealthCheckConfig

    class Config:
        """Pydantic config."""

        env_file = ".env"
        env_file_encoding = "utf-8"
        env_nested_delimiter = "__"

    @classmethod
    def from_yaml(cls, config_path: str) -> "NormalizationEngineConfig":
        """
        Load configuration from YAML file.

        Args:
            config_path: Path to YAML configuration file

        Returns:
            NormalizationEngineConfig instance
        """
        with open(config_path, "r") as f:
            config_data = yaml.safe_load(f)

        return cls(**config_data)

    def to_yaml(self, output_path: str) -> None:
        """
        Save configuration to YAML file.

        Args:
            output_path: Path to output YAML file
        """
        config_dict = self.model_dump(mode='json')

        with open(output_path, "w") as f:
            yaml.dump(config_dict, f, default_flow_style=False)


def load_config(config_path: Optional[str] = None) -> NormalizationEngineConfig:
    """
    Load configuration from YAML file or environment variables.

    Args:
        config_path: Optional path to YAML configuration file

    Returns:
        NormalizationEngineConfig instance
    """
    if config_path and Path(config_path).exists():
        return NormalizationEngineConfig.from_yaml(config_path)
    else:
        return NormalizationEngineConfig(
            kafka=KafkaConfig(),
            timescaledb=TimescaleDBConfig(),
            phi_stripping=PHIStrippingConfig(),
            business_process=BusinessProcessConfig(),
            blast_radius=BlastRadiusConfig(),
            regulatory_mapping=RegulatoryMappingConfig(),
            validation=ValidationConfig(),
            logging=LoggingConfig(),
            metrics=MetricsConfig(),
            health_check=HealthCheckConfig()
        )
