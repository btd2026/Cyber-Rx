"""
Financial Modeling Engine - Core Calculation Engine

This is the central orchestration component that:
1. Subscribes to enriched risk objects from Kafka
2. Orchestrates financial calculation pipeline
3. Generates complete audit methodology trails
4. Publishes financial impacts to TimescaleDB
5. Tracks calculation metrics

CRITICAL: NO LLM in the calculation path. All calculations must be deterministic
and reproducible for CFO board-meeting defensibility.
"""

import asyncio
import json
import uuid
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass

import structlog
from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
from aiokafka.errors import KafkaError
import pandas as pd
from prometheus_client import Counter, Histogram, Gauge

from .config import config
from .calculators.mlr_impact_calculator import MLRImpactCalculator
from .calculators.stop_loss_exposure_calculator import StopLossExposureCalculator
from .calculators.reserve_at_risk_calculator import ReserveAtRiskCalculator
from .calculators.premium_revenue_risk_calculator import PremiumRevenueRiskCalculator
from .services.actuarial_service import ActuarialService
from .services.methodology_trail_generator import MethodologyTrailGenerator


# Setup structured logging
logger = structlog.get_logger(__name__)


# Prometheus Metrics
calculations_total = Counter(
    'financial_engine_calculations_total',
    'Total financial calculations',
    ['status']
)

calculation_duration = Histogram(
    'financial_engine_calculation_duration_seconds',
    'Financial calculation duration',
    ['calculator']
)

mlr_impact_distribution = Histogram(
    'financial_engine_mlr_impact_distribution',
    'MLR impact distribution'
)

stop_loss_exposure_distribution = Histogram(
    'financial_engine_stop_loss_exposure_distribution',
    'Stop-loss exposure distribution'
)

reserve_at_risk_distribution = Histogram(
    'financial_engine_reserve_at_risk_distribution',
    'Reserve at risk distribution'
)

premium_revenue_risk_distribution = Histogram(
    'financial_engine_premium_revenue_risk_distribution',
    'Premium revenue risk distribution'
)

total_exposure_distribution = Histogram(
    'financial_engine_total_exposure_distribution',
    'Total exposure distribution'
)

actuarial_data_quality_score = Gauge(
    'financial_engine_actuarial_data_quality_score',
    'Actuarial data quality score'
)

calculation_errors_total = Counter(
    'financial_engine_calculation_errors_total',
    'Total calculation errors',
    ['error_type']
)


@dataclass
class CalculationStep:
    """Represents a single calculation step in the methodology trail."""
    step_name: str
    calculator: str
    timestamp: str
    inputs: Dict
    outputs: Dict
    confidence: float


@dataclass
class FinancialImpactResult:
    """Result of financial calculation."""
    risk_id: str
    organization_id: str
    mlr_impact: float
    mlr_impact_confidence: float
    stop_loss_exposure: float
    stop_loss_attachment: float
    stop_loss_aggregate: float
    stop_loss_remaining: float
    reserve_at_risk: float
    reserve_type: str
    premium_revenue_risk: float
    line_of_business: str
    total_exposure: float
    total_exposure_confidence: float
    methodology: str
    methodology_version: str
    calculation_timestamp: str
    sources: List[Dict]
    assumptions: List[str]


class CalculationError(Exception):
    """Exception raised when calculation fails."""
    pass


class ValidationError(Exception):
    """Exception raised when validation fails."""
    pass


class CalculationEngine:
    """
    Core Financial Calculation Engine

    Orchestrates the complete financial calculation pipeline:
    1. Parse actuarial data (CSV/SQL exports)
    2. Calculate MLR impact
    3. Calculate stop-loss exposure
    4. Calculate reserve at risk
    5. Calculate premium revenue risk
    6. Aggregate total exposure
    7. Generate methodology trail
    8. Validate financial impact
    9. Publish to TimescaleDB
    """

    def __init__(self, kafka_config: Dict, timescale_config: Dict):
        """
        Initialize calculation engine with services.

        Args:
            kafka_config: Kafka connection configuration
            timescale_config: TimescaleDB connection configuration
        """
        self.kafka_config = kafka_config
        self.timescale_config = timescale_config
        self.consumer = None
        self.producer = None
        self.actuarial_service = None
        self.methodology_generator = None

        # Initialize calculators
        self.mlr_calculator = None
        self.stop_loss_calculator = None
        self.reserve_calculator = None
        self.premium_revenue_calculator = None

        self.running = False
        self.logger = logger

    async def start(self):
        """Start the calculation engine."""
        self.logger.info("Starting Financial Calculation Engine")

        # Initialize Kafka consumer
        self.consumer = AIOKafkaConsumer(
            config.kafka.input_topic,
            bootstrap_servers=config.kafka.bootstrap_servers,
            group_id=config.kafka.consumer_group,
            auto_offset_reset=config.kafka.auto_offset_reset,
            enable_auto_commit=config.kafka.enable_auto_commit,
            session_timeout_ms=config.kafka.session_timeout_ms,
            heartbeat_interval_ms=config.kafka.heartbeat_interval_ms,
            value_deserializer=lambda m: json.loads(m.decode('utf-8'))
        )

        # Initialize Kafka producer (for dead letter queue)
        self.producer = AIOKafkaProducer(
            bootstrap_servers=config.kafka.bootstrap_servers,
            value_serializer=lambda v: json.dumps(v).encode('utf-8')
        )

        # Initialize services
        self.actuarial_service = ActuarialService(self.timescale_config)
        await self.actuarial_service.connect()

        self.methodology_generator = MethodologyTrailGenerator()

        # Initialize calculators
        self.mlr_calculator = MLRImpactCalculator(self.actuarial_service)
        self.stop_loss_calculator = StopLossExposureCalculator(self.actuarial_service)
        self.reserve_calculator = ReserveAtRiskCalculator(self.actuarial_service)
        self.premium_revenue_calculator = PremiumRevenueRiskCalculator(self.actuarial_service)

        # Start consumer and producer
        await self.consumer.start()
        await self.producer.start()

        self.running = True
        self.logger.info("Financial Calculation Engine started successfully")

    async def stop(self):
        """Stop the calculation engine."""
        self.logger.info("Stopping Financial Calculation Engine")
        self.running = False

        if self.consumer:
            await self.consumer.stop()
        if self.producer:
            await self.producer.stop()
        if self.actuarial_service:
            await self.actuarial_service.disconnect()

        self.logger.info("Financial Calculation Engine stopped")

    async def run(self):
        """
        Main run loop for processing risk objects.

        Continuously consumes enriched risk objects from Kafka and
        processes them through the financial calculation pipeline.
        """
        await self.start()

        try:
            async for message in self.consumer:
                if not self.running:
                    break

                try:
                    risk_object = message.value
                    await self.process_risk_object(risk_object)

                except CalculationError as e:
                    self.logger.error("Calculation error", error=str(e), risk_id=risk_object.get('id'))
                    calculation_errors_total.labels(error_type='calculation').inc()

                    # Send to dead letter queue
                    await self.send_to_dead_letter_queue(risk_object, str(e))

                except ValidationError as e:
                    self.logger.error("Validation error", error=str(e), risk_id=risk_object.get('id'))
                    calculation_errors_total.labels(error_type='validation').inc()

                except Exception as e:
                    self.logger.error("Unexpected error", error=str(e), risk_id=risk_object.get('id'))
                    calculation_errors_total.labels(error_type='unexpected').inc()

        except KafkaError as e:
            self.logger.error("Kafka error", error=str(e))

        finally:
            await self.stop()

    async def process_risk_object(self, risk_object: Dict) -> FinancialImpactResult:
        """
        Process enriched risk object through financial calculation pipeline.

        Pipeline:
        1. Validate risk object
        2. Parse actuarial data
        3. Calculate MLR impact
        4. Calculate stop-loss exposure
        5. Calculate reserve at risk
        6. Calculate premium revenue risk
        7. Aggregate total exposure
        8. Generate methodology trail
        9. Validate financial impact
        10. Publish to TimescaleDB

        Args:
            risk_object: Enriched RiskObject from T-MVP-005

        Returns:
            FinancialImpactResult with complete audit trail

        Raises:
            CalculationError: If calculation fails
            ValidationError: If validation fails
        """
        start_time = datetime.now()
        risk_id = risk_object.get('id')
        organization_id = risk_object.get('organization_id')

        self.logger.info("Processing risk object", risk_id=risk_id, organization_id=organization_id)

        calculation_steps = []

        try:
            # Step 1: Validate risk object
            self._validate_risk_object(risk_object)

            # Step 2: Parse actuarial data
            actuarial_data = await self._parse_actuarial_data(organization_id)
            data_quality_score = actuarial_data.get('data_quality_score', 0.8)
            actuarial_data_quality_score.set(data_quality_score)

            # Step 3: Calculate MLR impact
            mlr_start = datetime.now()
            mlr_result = await self.calculate_mlr_impact(risk_object, actuarial_data)
            calculation_steps.append(CalculationStep(
                step_name="MLR Impact Calculation",
                calculator="MLRImpactCalculator",
                timestamp=mlr_start.isoformat(),
                inputs={
                    "likelihood_score": risk_object.get('likelihood_score'),
                    "business_process_map": risk_object.get('business_process_map'),
                    "blast_radius_criticality": risk_object.get('blast_radius_criticality', 0.0)
                },
                outputs={
                    "mlr_impact": mlr_result['mlr_impact'],
                    "mlr_impact_confidence": mlr_result['confidence']
                },
                confidence=mlr_result['confidence']
            ))
            mlr_impact_distribution.observe(mlr_result['mlr_impact'])

            # Step 4: Calculate stop-loss exposure
            stop_loss_start = datetime.now()
            stop_loss_result = await self.calculate_stop_loss_exposure(risk_object, actuarial_data)
            calculation_steps.append(CalculationStep(
                step_name="Stop-Loss Exposure Calculation",
                calculator="StopLossExposureCalculator",
                timestamp=stop_loss_start.isoformat(),
                inputs={
                    "likelihood_score": risk_object.get('likelihood_score'),
                    "blast_radius_criticality": risk_object.get('blast_radius_criticality', 0.0)
                },
                outputs={
                    "stop_loss_exposure": stop_loss_result['exposure'],
                    "stop_loss_attachment": stop_loss_result['attachment'],
                    "stop_loss_aggregate": stop_loss_result['aggregate'],
                    "stop_loss_remaining": stop_loss_result['remaining']
                },
                confidence=0.85
            ))
            stop_loss_exposure_distribution.observe(stop_loss_result['exposure'])

            # Step 5: Calculate reserve at risk
            reserve_start = datetime.now()
            reserve_result = await self.calculate_reserve_at_risk(risk_object, actuarial_data)
            calculation_steps.append(CalculationStep(
                step_name="Reserve at Risk Calculation",
                calculator="ReserveAtRiskCalculator",
                timestamp=reserve_start.isoformat(),
                inputs={
                    "business_process_map": risk_object.get('business_process_map'),
                    "likelihood_score": risk_object.get('likelihood_score')
                },
                outputs={
                    "reserve_at_risk": reserve_result['reserve_at_risk'],
                    "reserve_type": reserve_result['reserve_type']
                },
                confidence=0.80
            ))
            reserve_at_risk_distribution.observe(reserve_result['reserve_at_risk'])

            # Step 6: Calculate premium revenue risk
            revenue_start = datetime.now()
            revenue_result = await self.calculate_premium_revenue_risk(risk_object, actuarial_data)
            calculation_steps.append(CalculationStep(
                step_name="Premium Revenue Risk Calculation",
                calculator="PremiumRevenueRiskCalculator",
                timestamp=revenue_start.isoformat(),
                inputs={
                    "business_process_map": risk_object.get('business_process_map'),
                    "likelihood_score": risk_object.get('likelihood_score')
                },
                outputs={
                    "premium_revenue_risk": revenue_result['premium_revenue_risk'],
                    "line_of_business": revenue_result['line_of_business']
                },
                confidence=0.75
            ))
            premium_revenue_risk_distribution.observe(revenue_result['premium_revenue_risk'])

            # Step 7: Aggregate total exposure
            total_exposure = self._calculate_total_exposure(
                mlr_result['mlr_impact'],
                stop_loss_result['exposure'],
                reserve_result['reserve_at_risk'],
                revenue_result['premium_revenue_risk']
            )
            total_exposure_confidence = self._calculate_total_confidence([
                mlr_result['confidence'],
                0.85,  # stop-loss confidence
                0.80,  # reserve confidence
                0.75   # revenue confidence
            ])
            total_exposure_distribution.observe(total_exposure)

            # Step 8: Generate methodology trail
            methodology_trail = self.methodology_generator.generate_methodology_trail(
                risk_object,
                calculation_steps,
                actuarial_data.get('sources', []),
                data_quality_score
            )

            # Step 9: Create financial impact result
            financial_impact = FinancialImpactResult(
                risk_id=risk_id,
                organization_id=organization_id,
                mlr_impact=mlr_result['mlr_impact'],
                mlr_impact_confidence=mlr_result['confidence'],
                stop_loss_exposure=stop_loss_result['exposure'],
                stop_loss_attachment=stop_loss_result['attachment'],
                stop_loss_aggregate=stop_loss_result['aggregate'],
                stop_loss_remaining=stop_loss_result['remaining'],
                reserve_at_risk=reserve_result['reserve_at_risk'],
                reserve_type=reserve_result['reserve_type'],
                premium_revenue_risk=revenue_result['premium_revenue_risk'],
                line_of_business=revenue_result['line_of_business'],
                total_exposure=total_exposure,
                total_exposure_confidence=total_exposure_confidence,
                methodology=methodology_trail['methodology'],
                methodology_version=config.calculation.methodology_version,
                calculation_timestamp=datetime.now().isoformat(),
                sources=methodology_trail['sources'],
                assumptions=methodology_trail['assumptions']
            )

            # Step 10: Validate financial impact
            self._validate_financial_impact(financial_impact)

            # Step 11: Publish to TimescaleDB
            await self._publish_to_timescale(financial_impact)

            # Update metrics
            calculations_total.labels(status='success').inc()
            duration = (datetime.now() - start_time).total_seconds()
            calculation_duration.labels(calculator='total').observe(duration)

            self.logger.info(
                "Risk object processed successfully",
                risk_id=risk_id,
                total_exposure=total_exposure,
                duration=duration
            )

            return financial_impact

        except Exception as e:
            calculations_total.labels(status='failure').inc()
            raise CalculationError(f"Failed to process risk object {risk_id}: {str(e)}")

    async def calculate_mlr_impact(self, risk_object: Dict, actuarial_data: Dict) -> Dict:
        """
        Calculate MLR impact from risk object.

        Args:
            risk_object: Enriched RiskObject
            actuarial_data: Actuarial data for calculations

        Returns:
            Dict with mlr_impact and confidence
        """
        start = datetime.now()
        try:
            result = await self.mlr_calculator.calculate_mlr_impact(risk_object, actuarial_data)
            duration = (datetime.now() - start).total_seconds()
            calculation_duration.labels(calculator='mlr').observe(duration)
            return result
        except Exception as e:
            if config.calculation.enable_fallback:
                self.logger.warning("MLR calculation failed, using fallback", error=str(e))
                return {
                    'mlr_impact': config.calculation.fallback_mlr_impact,
                    'confidence': 0.5
                }
            raise CalculationError(f"MLR impact calculation failed: {str(e)}")

    async def calculate_stop_loss_exposure(self, risk_object: Dict, actuarial_data: Dict) -> Dict:
        """
        Calculate stop-loss exposure from risk object.

        Args:
            risk_object: Enriched RiskObject
            actuarial_data: Actuarial data for calculations

        Returns:
            Dict with exposure, attachment, aggregate, remaining
        """
        start = datetime.now()
        try:
            result = await self.stop_loss_calculator.calculate_stop_loss_exposure(risk_object, actuarial_data)
            duration = (datetime.now() - start).total_seconds()
            calculation_duration.labels(calculator='stop_loss').observe(duration)
            return result
        except Exception as e:
            if config.calculation.enable_fallback:
                self.logger.warning("Stop-loss calculation failed, using fallback", error=str(e))
                return {
                    'exposure': config.calculation.fallback_stop_loss_exposure,
                    'attachment': config.stop_loss.default_attachment,
                    'aggregate': config.stop_loss.default_aggregate,
                    'remaining': config.stop_loss.default_aggregate - config.stop_loss.default_current_position
                }
            raise CalculationError(f"Stop-loss exposure calculation failed: {str(e)}")

    async def calculate_reserve_at_risk(self, risk_object: Dict, actuarial_data: Dict) -> Dict:
        """
        Calculate reserve at risk from risk object.

        Args:
            risk_object: Enriched RiskObject
            actuarial_data: Actuarial data for calculations

        Returns:
            Dict with reserve_at_risk and reserve_type
        """
        start = datetime.now()
        try:
            result = await self.reserve_calculator.calculate_reserve_at_risk(risk_object, actuarial_data)
            duration = (datetime.now() - start).total_seconds()
            calculation_duration.labels(calculator='reserve').observe(duration)
            return result
        except Exception as e:
            if config.calculation.enable_fallback:
                self.logger.warning("Reserve calculation failed, using fallback", error=str(e))
                return {
                    'reserve_at_risk': config.calculation.fallback_reserve_at_risk,
                    'reserve_type': 'case_reserve'
                }
            raise CalculationError(f"Reserve at risk calculation failed: {str(e)}")

    async def calculate_premium_revenue_risk(self, risk_object: Dict, actuarial_data: Dict) -> Dict:
        """
        Calculate premium revenue risk from risk object.

        Args:
            risk_object: Enriched RiskObject
            actuarial_data: Actuarial data for calculations

        Returns:
            Dict with premium_revenue_risk and line_of_business
        """
        start = datetime.now()
        try:
            result = await self.premium_revenue_calculator.calculate_premium_revenue_risk(risk_object, actuarial_data)
            duration = (datetime.now() - start).total_seconds()
            calculation_duration.labels(calculator='premium_revenue').observe(duration)
            return result
        except Exception as e:
            if config.calculation.enable_fallback:
                self.logger.warning("Premium revenue calculation failed, using fallback", error=str(e))
                return {
                    'premium_revenue_risk': config.calculation.fallback_premium_revenue_risk,
                    'line_of_business': 'Commercial'
                }
            raise CalculationError(f"Premium revenue risk calculation failed: {str(e)}")

    def _validate_risk_object(self, risk_object: Dict):
        """Validate risk object has required fields."""
        required_fields = ['id', 'organization_id', 'likelihood_score', 'business_process_map']
        for field in required_fields:
            if field not in risk_object:
                raise ValidationError(f"Missing required field: {field}")

        # Validate ranges
        if not 0.0 <= risk_object['likelihood_score'] <= 1.0:
            raise ValidationError(f"Invalid likelihood_score: {risk_object['likelihood_score']}")

        if not isinstance(risk_object['business_process_map'], list) or len(risk_object['business_process_map']) == 0:
            raise ValidationError("business_process_map must be non-empty array")

    async def _parse_actuarial_data(self, organization_id: str) -> Dict:
        """Parse actuarial data for organization."""
        try:
            return await self.actuarial_service.get_actuarial_data(organization_id)
        except Exception as e:
            self.logger.warning("Failed to parse actuarial data, using defaults", error=str(e))
            return {
                'data_quality_score': 0.7,
                'sources': [],
                'mlr_data': {},
                'stop_loss_data': {},
                'reserve_data': {},
                'premium_revenue_data': {}
            }

    def _calculate_total_exposure(
        self,
        mlr_impact: float,
        stop_loss_exposure: float,
        reserve_at_risk: float,
        premium_revenue_risk: float
    ) -> float:
        """
        Calculate total exposure as sum of all components.

        Note: MLR impact is in percentage points, converted to dollars
        using premium revenue as multiplier.
        """
        # Simplified calculation (in reality, MLR impact would be converted to $)
        total = stop_loss_exposure + reserve_at_risk + premium_revenue_risk

        # MLR impact adds a premium multiplier effect
        # (simplified - actual formula would use premium revenue)
        total += mlr_impact * 100000  # Convert percentage points to $ (rough estimate)

        return total

    def _calculate_total_confidence(self, confidences: List[float]) -> float:
        """Calculate aggregated confidence score."""
        return sum(confidences) / len(confidences)

    def _validate_financial_impact(self, financial_impact: FinancialImpactResult):
        """Validate financial impact meets constraints."""
        # Check confidence ranges
        if not 0.0 <= financial_impact.mlr_impact_confidence <= 1.0:
            raise ValidationError(f"Invalid mlr_impact_confidence: {financial_impact.mlr_impact_confidence}")

        if not 0.0 <= financial_impact.total_exposure_confidence <= 1.0:
            raise ValidationError(f"Invalid total_exposure_confidence: {financial_impact.total_exposure_confidence}")

        # Check no negative values
        if financial_impact.stop_loss_exposure < 0:
            raise ValidationError(f"Invalid stop_loss_exposure (negative): {financial_impact.stop_loss_exposure}")

        if financial_impact.reserve_at_risk < 0:
            raise ValidationError(f"Invalid reserve_at_risk (negative): {financial_impact.reserve_at_risk}")

        if financial_impact.premium_revenue_risk < 0:
            raise ValidationError(f"Invalid premium_revenue_risk (negative): {financial_impact.premium_revenue_risk}")

        if financial_impact.total_exposure < 0:
            raise ValidationError(f"Invalid total_exposure (negative): {financial_impact.total_exposure}")

        # Check methodology fields
        if not financial_impact.methodology:
            raise ValidationError("methodology cannot be empty")

        if not financial_impact.methodology_version:
            raise ValidationError("methodology_version cannot be empty")

        if not financial_impact.sources or len(financial_impact.sources) == 0:
            raise ValidationError("sources cannot be empty")

        if not financial_impact.assumptions or len(financial_impact.assumptions) == 0:
            raise ValidationError("assumptions cannot be empty")

    async def _publish_to_timescale(self, financial_impact: FinancialImpactResult):
        """Publish financial impact to TimescaleDB."""
        query = """
            INSERT INTO financial_impacts (
                id, risk_id, organization_id,
                mlr_impact, mlr_impact_confidence,
                stop_loss_exposure, stop_loss_attachment, stop_loss_aggregate, stop_loss_remaining,
                reserve_at_risk, reserve_type,
                premium_revenue_risk, line_of_business,
                total_exposure, total_exposure_confidence,
                methodology, methodology_version, calculation_timestamp,
                sources, assumptions
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
            ON CONFLICT (risk_id) DO UPDATE SET
                mlr_impact = EXCLUDED.mlr_impact,
                mlr_impact_confidence = EXCLUDED.mlr_impact_confidence,
                stop_loss_exposure = EXCLUDED.stop_loss_exposure,
                stop_loss_attachment = EXCLUDED.stop_loss_attachment,
                stop_loss_aggregate = EXCLUDED.stop_loss_aggregate,
                stop_loss_remaining = EXCLUDED.stop_loss_remaining,
                reserve_at_risk = EXCLUDED.reserve_at_risk,
                reserve_type = EXCLUDED.reserve_type,
                premium_revenue_risk = EXCLUDED.premium_revenue_risk,
                line_of_business = EXCLUDED.line_of_business,
                total_exposure = EXCLUDED.total_exposure,
                total_exposure_confidence = EXCLUDED.total_exposure_confidence,
                methodology = EXCLUDED.methodology,
                methodology_version = EXCLUDED.methodology_version,
                calculation_timestamp = EXCLUDED.calculation_timestamp,
                sources = EXCLUDED.sources,
                assumptions = EXCLUDED.assumptions,
                updated_at = NOW()
        """

        # Convert to dict for JSON serialization
        financial_impact_dict = {
            'id': str(uuid.uuid4()),
            'risk_id': financial_impact.risk_id,
            'organization_id': financial_impact.organization_id,
            'mlr_impact': financial_impact.mlr_impact,
            'mlr_impact_confidence': financial_impact.mlr_impact_confidence,
            'stop_loss_exposure': financial_impact.stop_loss_exposure,
            'stop_loss_attachment': financial_impact.stop_loss_attachment,
            'stop_loss_aggregate': financial_impact.stop_loss_aggregate,
            'stop_loss_remaining': financial_impact.stop_loss_remaining,
            'reserve_at_risk': financial_impact.reserve_at_risk,
            'reserve_type': financial_impact.reserve_type,
            'premium_revenue_risk': financial_impact.premium_revenue_risk,
            'line_of_business': financial_impact.line_of_business,
            'total_exposure': financial_impact.total_exposure,
            'total_exposure_confidence': financial_impact.total_exposure_confidence,
            'methodology': financial_impact.methodology,
            'methodology_version': financial_impact.methodology_version,
            'calculation_timestamp': financial_impact.calculation_timestamp,
            'sources': json.dumps(financial_impact.sources),
            'assumptions': json.dumps(financial_impact.assumptions)
        }

        await self.actuarial_service.execute_query(query, list(financial_impact_dict.values()))

    async def send_to_dead_letter_queue(self, risk_object: Dict, error_message: str):
        """Send failed risk object to dead letter queue."""
        try:
            dead_letter_topic = f"{config.kafka.input_topic}-dlq"
            message = {
                'risk_object': risk_object,
                'error': error_message,
                'timestamp': datetime.now().isoformat()
            }
            await self.producer.send_and_wait(dead_letter_topic, message)
            self.logger.info("Sent to dead letter queue", risk_id=risk_object.get('id'))
        except Exception as e:
            self.logger.error("Failed to send to dead letter queue", error=str(e))


async def main():
    """Main entry point for the calculation engine."""
    engine = CalculationEngine(
        kafka_config=config.kafka.model_dump(),
        timescale_config=config.timescale.model_dump()
    )

    try:
        await engine.run()
    except KeyboardInterrupt:
        logger.info("Received interrupt signal")
    finally:
        await engine.stop()


if __name__ == "__main__":
    asyncio.run(main())
