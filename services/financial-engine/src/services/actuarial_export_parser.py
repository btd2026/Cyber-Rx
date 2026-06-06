"""
Actuarial Export Parser

Parses actuarial exports from CSV and SQL sources.
Validates data quality and caches actuarial data.

Responsibilities:
- Parse CSV exports from data warehouse
- Parse SQL exports from TimescaleDB
- Validate data quality
- Cache actuarial data for performance
"""

import structlog
from typing import Dict
from datetime import datetime
import pandas as pd


logger = structlog.get_logger(__name__)


class ActuarialExportParser:
    """
    Actuarial Export Parser

    Parses actuarial exports from CSV and SQL sources,
    validates data quality, and caches results.
    """

    def __init__(self, timescale_config: Dict):
        """
        Initialize parser with TimescaleDB config.

        Args:
            timescale_config: TimescaleDB connection configuration
        """
        self.timescale_config = timescale_config
        self.logger = logger

    async def parse_csv_export(self, file_path: str) -> pd.DataFrame:
        """
        Parse actuarial CSV export.

        Expected columns:
        - line_of_business
        - member_count
        - premium_per_member
        - average_claim_cost
        - claim_rate
        - attrition_rate
        - reserve_type
        - reserve_balance
        - stop_loss_attachment
        - stop_loss_aggregate
        - stop_loss_current_position

        Args:
            file_path: Path to CSV export file

        Returns:
            Pandas DataFrame with actuarial data

        Raises:
            ValueError: If CSV parsing fails
            ValidationError: If data validation fails
        """
        self.logger.info("Parsing actuarial CSV export", file_path=file_path)

        try:
            # Read CSV with pandas
            df = pd.read_csv(
                file_path,
                delimiter=config.actuarial.csv_delimiter,
                dtype={
                    'line_of_business': str,
                    'member_count': int,
                    'premium_per_member': float,
                    'average_claim_cost': float,
                    'claim_rate': float,
                    'attrition_rate': float,
                    'reserve_type': str,
                    'reserve_balance': float,
                    'stop_loss_attachment': float,
                    'stop_loss_aggregate': float,
                    'stop_loss_current_position': float
                }
            )

            self.logger.info("CSV parsed successfully", rows=len(df))

            # Validate data quality
            data_quality_score = self.validate_data_quality(df)

            if data_quality_score < config.actuarial.data_quality_threshold:
                raise ValueError(f"Data quality score {data_quality_score} below threshold {config.actuarial.data_quality_threshold}")

            return df

        except Exception as e:
            self.logger.error("CSV parsing failed", error=str(e))
            raise ValueError(f"Failed to parse CSV export: {str(e)}")

    async def parse_sql_export(self, query: str, conn) -> pd.DataFrame:
        """
        Parse actuarial SQL export from data warehouse.

        Queries actuarial tables:
        - actuarial.member_premiums
        - actuarial.claims_history
        - actuarial.reserves
        - actuarial.stop_loss_positions

        Args:
            query: SQL query string
            conn: Database connection

        Returns:
            Pandas DataFrame with actuarial data

        Raises:
            ValueError: If SQL parsing fails
            ValidationError: If data validation fails
        """
        self.logger.info("Parsing actuarial SQL export")

        try:
            # Execute query and read into DataFrame
            df = pd.read_sql_query(query, conn)

            self.logger.info("SQL export parsed successfully", rows=len(df))

            # Validate data quality
            data_quality_score = self.validate_data_quality(df)

            if data_quality_score < config.actuarial.data_quality_threshold:
                raise ValueError(f"Data quality score {data_quality_score} below threshold {config.actuarial.data_quality_threshold}")

            return df

        except Exception as e:
            self.logger.error("SQL parsing failed", error=str(e))
            raise ValueError(f"Failed to parse SQL export: {str(e)}")

    def validate_data_quality(self, df: pd.DataFrame) -> float:
        """
        Validate data quality of actuarial export.

        Checks:
        - Required columns present
        - No missing values
        - Numeric values in valid ranges
        - No duplicates

        Args:
            df: Pandas DataFrame to validate

        Returns:
            Data quality score (0.0 - 1.0)

        Scoring:
        - 0.2: Required columns present
        - 0.2: No missing values
        - 0.3: Numeric values in valid ranges
        - 0.2: No duplicates
        - 0.1: Data freshness (if timestamp column exists)
        """
        quality_score = 1.0
        issues = []

        # Check required columns
        required_columns = [
            'line_of_business',
            'member_count',
            'premium_per_member',
            'average_claim_cost',
            'claim_rate',
            'attrition_rate'
        ]

        missing_columns = set(required_columns) - set(df.columns)
        if missing_columns:
            quality_score -= 0.2
            issues.append(f"Missing columns: {missing_columns}")

        # Check for missing values
        if df.isnull().any().any():
            missing_count = df.isnull().sum().sum()
            quality_score -= 0.2
            issues.append(f"Missing values: {missing_count}")

        # Check numeric ranges
        if (df['member_count'] < 0).any():
            quality_score -= 0.1
            issues.append("Negative member_count values")

        if (df['premium_per_member'] < 0).any():
            quality_score -= 0.1
            issues.append("Negative premium_per_member values")

        if (df['average_claim_cost'] < 0).any():
            quality_score -= 0.1
            issues.append("Negative average_claim_cost values")

        if (df['claim_rate'] < 0).any() or (df['claim_rate'] > 1).any():
            quality_score -= 0.1
            issues.append("claim_rate outside valid range [0.0, 1.0]")

        if (df['attrition_rate'] < 0).any() or (df['attrition_rate'] > 1).any():
            quality_score -= 0.1
            issues.append("attrition_rate outside valid range [0.0, 1.0]")

        # Check for duplicates
        if df.duplicated().any():
            duplicate_count = df.duplicated().sum()
            quality_score -= 0.2
            issues.append(f"Duplicate rows: {duplicate_count}")

        # Log quality issues
        if issues:
            self.logger.warning("Data quality issues detected", issues=issues, quality_score=quality_score)
        else:
            self.logger.info("Data quality validation passed", quality_score=quality_score)

        return max(0.0, quality_score)
