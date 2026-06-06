"""
Risk Normalization Engine - Main orchestration service.

Consumes raw security events from Kafka, enriches them with business process mapping,
PHI stripping, blast radius calculation, and regulatory mapping, then publishes
enriched RiskObjects to Kafka.
"""

import asyncio
import json
import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List
from collections import deque

from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
from aiokafka.errors import KafkaError
from prometheus_client import Counter, Histogram, Gauge
import structlog

from .config import NormalizationEngineConfig, load_config
from .enrichment.business_process_service import BusinessProcessService
from .enrichment.phi_stripping_service import PHIStrippingService
from .enrichment.blast_radius_analyzer import BlastRadiusAnalyzer
from .enrichment.regulatory_mapper import RegulatoryMapper
from .validation.risk_object_validator import RiskObjectValidator


# Prometheus Metrics
events_processed_total = Counter(
    'normalization_engine_events_total',
    'Total events processed',
    ['source', 'status']
)

enrichment_duration_seconds = Histogram(
    'normalization_engine_enrichment_duration_seconds',
    'Enrichment processing duration',
    ['step'],
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0]
)

phi_stripping_total = Counter(
    'normalization_engine_phi_stripping_total',
    'Total PHI stripping operations',
    ['status']
)

blast_radius_size = Gauge(
    'normalization_engine_blast_radius_size',
    'Blast radius size',
    ['source']
)

regulatory_triggers_total = Counter(
    'normalization_engine_regulatory_triggers_total',
    'Total regulatory triggers mapped',
    ['regulation_id']
)

validation_errors_total = Counter(
    'normalization_engine_validation_errors_total',
    'Total validation errors',
    ['error_type']
)

kafka_consumer_lag = Gauge(
    'normalization_engine_kafka_lag',
    'Kafka consumer lag',
    ['topic', 'partition']
)


logger = structlog.get_logger(__name__)


class NormalizationEngine:
    """
    Risk Normalization Engine - Main orchestration service.

    Consumes raw security events from Kafka, enriches them, and publishes
    enriched RiskObjects to Kafka.
    """

    def __init__(
        self,
        config: NormalizationEngineConfig,
        business_process_service: BusinessProcessService,
        phi_stripping_service: PHIStrippingService,
        blast_radius_analyzer: BlastRadiusAnalyzer,
        regulatory_mapper: RegulatoryMapper,
        risk_object_validator: RiskObjectValidator
    ):
        """
        Initialize Normalization Engine.

        Args:
            config: Configuration object
            business_process_service: Business process mapping service
            phi_stripping_service: PHI stripping service
            blast_radius_analyzer: Blast radius analyzer
            regulatory_mapper: Regulatory mapper
            risk_object_validator: RiskObject validator
        """
        self.config = config
        self.business_process_service = business_process_service
        self.phi_stripping_service = phi_stripping_service
        self.blast_radius_analyzer = blast_radius_analyzer
        self.regulatory_mapper = regulatory_mapper
        self.risk_object_validator = risk_object_validator

        # Kafka consumer/producer (initialized in start())
        self.consumer: Optional[AIOKafkaConsumer] = None
        self.producer: Optional[AIOKafkaProducer] = None

        # State
        self.running = False
        self.consumer_task: Optional[asyncio.Task] = None

        logger.info("normalization_engine_initialized")

    async def start(self) -> None:
        """
        Start the Normalization Engine.

        Initializes Kafka consumer/producer and starts event processing.
        """
        logger.info("starting_normalization_engine")

        # Initialize Kafka consumer
        self.consumer = AIOKafkaConsumer(
            self.config.kafka.input_topic,
            bootstrap_servers=self.config.kafka.bootstrap_servers,
            group_id=self.config.kafka.consumer_group,
            auto_offset_reset=self.config.kafka.auto_offset_reset,
            enable_auto_commit=self.config.kafka.enable_auto_commit,
            value_deserializer=lambda m: json.loads(m.decode('utf-8'))
        )

        # Initialize Kafka producer
        self.producer = AIOKafkaProducer(
            bootstrap_servers=self.config.kafka.bootstrap_servers,
            value_serializer=lambda v: json.dumps(v).encode('utf-8'),
            compression_type='snappy'
        )

        # Start consumer and producer
        await self.consumer.start()
        await self.producer.start()

        logger.info(
            "kafka_connected",
            bootstrap_servers=self.config.kafka.bootstrap_servers,
            input_topic=self.config.kafka.input_topic,
            output_topic=self.config.kafka.output_topic
        )

        # Start consumer task
        self.consumer_task = asyncio.create_task(self._consume_events())
        self.running = True

        logger.info("normalization_engine_started")

    async def stop(self) -> None:
        """
        Stop the Normalization Engine.

        Stops event processing and closes Kafka connections.
        """
        logger.info("stopping_normalization_engine")

        self.running = False

        if self.consumer_task:
            self.consumer_task.cancel()
            try:
                await self.consumer_task
            except asyncio.CancelledError:
                pass

        if self.consumer:
            await self.consumer.stop()

        if self.producer:
            await self.producer.stop()

        logger.info("normalization_engine_stopped")

    async def _consume_events(self) -> None:
        """
        Consume events from Kafka and process them.

        Runs as a background task until stopped.
        """
        logger.info("consuming_events", topic=self.config.kafka.input_topic)

        try:
            async for message in self.consumer:
                await self._process_message(message)

                # Update consumer lag metric
                partition = message.partition
                topic = message.topic
                # Note: consumer lag requires fetching high water mark
                # This is simplified; production would fetch actual lag

        except asyncio.CancelledError:
            logger.info("event_consumption_cancelled")
        except Exception as e:
            logger.error("event_consumption_error", error=str(e))
            raise

    async def _process_message(self, message: Any) -> None:
        """
        Process a single Kafka message.

        Args:
            message: Kafka message
        """
        try:
            # Extract raw event
            raw_event = message.value
            source = raw_event.get('source', 'unknown')

            logger.debug(
                "processing_event",
                source=source,
                event_id=raw_event.get('id')
            )

            # Process event
            enriched_risk_object = await self.process_event(raw_event)

            # Publish enriched event
            await self._publish_enriched_event(enriched_risk_object)

            # Update metrics
            events_processed_total.labels(
                source=source,
                status='success'
            ).inc()

            logger.debug(
                "event_processed",
                source=source,
                event_id=enriched_risk_object.get('id')
            )

        except Exception as e:
            logger.error(
                "event_processing_error",
                source=message.value.get('source', 'unknown'),
                event_id=message.value.get('id'),
                error=str(e)
            )

            events_processed_total.labels(
                source=message.value.get('source', 'unknown'),
                status='error'
            ).inc()

    async def process_event(self, raw_event: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a raw event through the enrichment pipeline.

        Pipeline:
        1. Extract RiskObject from raw event
        2. Enrich with business process mapping
        3. Strip PHI/PII
        4. Calculate blast radius
        5. Map regulatory triggers
        6. Validate RiskObject
        7. Update methodology trail

        Args:
            raw_event: Raw event from connector

        Returns:
            Enriched RiskObject

        Raises:
            ValidationError: If RiskObject validation fails
            EnrichmentError: If enrichment step fails
        """
        event_id = raw_event.get('id', 'unknown')
        source = raw_event.get('source', 'unknown')
        customer_id = raw_event.get('customer_id', 'unknown')

        logger.info(
            "enriching_event",
            event_id=event_id,
            source=source,
            customer_id=customer_id
        )

        start_time = datetime.now()

        # Extract RiskObject
        risk_object = raw_event

        # Step 1: Business Process Mapping
        with enrichment_duration_seconds.labels(step='business_process_mapping').time():
            risk_object = await self._enrich_business_processes(risk_object)

        # Step 2: PHI Stripping
        with enrichment_duration_seconds.labels(step='phi_stripping').time():
            risk_object = await self._strip_phi(risk_object)

        # Step 3: Blast Radius Calculation
        with enrichment_duration_seconds.labels(step='blast_radius').time():
            risk_object = await self._calculate_blast_radius(risk_object)

        # Step 4: Regulatory Mapping
        with enrichment_duration_seconds.labels(step='regulatory_mapping').time():
            risk_object = await self._map_regulatory_triggers(risk_object)

        # Step 5: Validation
        with enrichment_duration_seconds.labels(step='validation').time():
            self._validate_risk_object(risk_object)

        # Step 6: Update Methodology Trail
        risk_object = self._update_methodology_trail(
            risk_object,
            enrichment_duration=datetime.now() - start_time
        )

        # Update timestamps
        risk_object['updated_at'] = datetime.utcnow().isoformat()

        logger.info(
            "event_enriched",
            event_id=event_id,
            source=source,
            enrichment_duration_seconds=(datetime.now() - start_time).total_seconds()
        )

        return risk_object

    async def _enrich_business_processes(self, risk_object: Dict[str, Any]) -> Dict[str, Any]:
        """
        Enrich RiskObject with business process mapping.

        Args:
            risk_object: RiskObject to enrich

        Returns:
            Enriched RiskObject
        """
        affected_assets = risk_object.get('affected_assets', [])
        customer_id = risk_object.get('customer_id', 'unknown')

        # Map assets to business processes
        business_process_map = await self.business_process_service.map_assets_to_processes(
            assets=affected_assets,
            customer_id=customer_id
        )

        risk_object['business_process_map'] = business_process_map

        logger.debug(
            "business_processes_mapped",
            asset_count=len(affected_assets),
            process_count=len(business_process_map)
        )

        return risk_object

    async def _strip_phi(self, risk_object: Dict[str, Any]) -> Dict[str, Any]:
        """
        Strip PHI/PII from RiskObject.

        Args:
            risk_object: RiskObject to strip

        Returns:
            RiskObject with PHI stripped
        """
        if not self.config.phi_stripping.enabled:
            return risk_object

        try:
            stripped_risk_object, stripped_fields = self.phi_stripping_service.strip_phi_from_risk_object(
                risk_object
            )

            phi_stripping_total.labels(status='success').inc()

            logger.debug(
                "phi_stripped",
                stripped_fields_count=len(stripped_fields)
            )

            return stripped_risk_object

        except Exception as e:
            phi_stripping_total.labels(status='error').inc()
            logger.error("phi_stripping_error", error=str(e))
            raise

    async def _calculate_blast_radius(self, risk_object: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculate blast radius for RiskObject.

        Args:
            risk_object: RiskObject to calculate blast radius for

        Returns:
            RiskObject with blast_radius populated
        """
        customer_id = risk_object.get('customer_id', 'unknown')
        source = risk_object.get('source', 'unknown')

        # Calculate blast radius
        blast_radius = await self.blast_radius_analyzer.calculate_blast_radius(
            risk_object=risk_object,
            customer_id=customer_id
        )

        risk_object['blast_radius'] = blast_radius

        # Update metric
        blast_radius_size.labels(source=source).set(len(blast_radius))

        logger.debug(
            "blast_radius_calculated",
            blast_radius_size=len(blast_radius)
        )

        return risk_object

    async def _map_regulatory_triggers(self, risk_object: Dict[str, Any]) -> Dict[str, Any]:
        """
        Map regulatory triggers for RiskObject.

        Args:
            risk_object: RiskObject to map regulations for

        Returns:
            RiskObject with regulatory_triggers populated
        """
        customer_id = risk_object.get('customer_id', 'unknown')

        # Map regulatory triggers
        regulatory_triggers = await self.regulatory_mapper.map_regulatory_triggers(
            risk_object=risk_object,
            customer_id=customer_id
        )

        risk_object['regulatory_triggers'] = [
            trigger.to_dict() if hasattr(trigger, 'to_dict') else trigger
            for trigger in regulatory_triggers
        ]

        # Update metrics
        for trigger in regulatory_triggers:
            regulation_id = trigger.get('regulation_id', 'unknown') if isinstance(trigger, dict) else trigger.regulation_id
            regulatory_triggers_total.labels(regulation_id=regulation_id).inc()

        logger.debug(
            "regulatory_triggers_mapped",
            trigger_count=len(regulatory_triggers)
        )

        return risk_object

    def _validate_risk_object(self, risk_object: Dict[str, Any]) -> None:
        """
        Validate RiskObject against schema constraints.

        Args:
            risk_object: RiskObject to validate

        Raises:
            ValidationError: If validation fails
        """
        validation_result = self.risk_object_validator.validate_risk_object(risk_object)

        if not validation_result.is_valid:
            for error in validation_result.errors:
                validation_errors_total.labels(error_type=error.error_type).inc()

            logger.error(
                "risk_object_validation_failed",
                errors=[e.message for e in validation_result.errors]
            )

            raise ValueError(f"RiskObject validation failed: {validation_result.errors}")

        if validation_result.warnings:
            for warning in validation_result.warnings:
                logger.warning(
                    "risk_object_validation_warning",
                    warning=warning.message
                )

        logger.debug("risk_object_validated")

    def _update_methodology_trail(
        self,
        risk_object: Dict[str, Any],
        enrichment_duration: Any
    ) -> Dict[str, Any]:
        """
        Update methodology trail with enrichment steps.

        Args:
            risk_object: RiskObject to update
            enrichment_duration: Total enrichment duration

        Returns:
            RiskObject with updated methodology_trail
        """
        methodology_trail = risk_object.get('methodology_trail', {})

        # Add normalization steps
        normalization_steps = methodology_trail.get('normalization_steps', [])
        normalization_steps.extend([
            'business_process_mapping',
            'phi_stripping',
            'blast_radius_calculation',
            'regulatory_mapping'
        ])

        # Add enrichment timestamps
        enrichment_timestamps = methodology_trail.get('enrichment_timestamps', [])
        enrichment_timestamps.append(datetime.utcnow().isoformat())

        # Add data sources
        data_sources = methodology_trail.get('data_sources', [])
        data_sources.append('business_process_graph')

        # Add calculation methods
        calculation_methods = methodology_trail.get('calculation_methods', [])
        calculation_methods.append('blast_radius_bfs_v1')

        # Add assumptions
        assumptions = methodology_trail.get('assumptions', [])
        assumptions.append('business_process_graph_current')

        # Update methodology trail
        methodology_trail.update({
            'normalization_steps': normalization_steps,
            'enrichment_timestamps': enrichment_timestamps,
            'data_sources': data_sources,
            'calculation_methods': calculation_methods,
            'assumptions': assumptions
        })

        risk_object['methodology_trail'] = methodology_trail

        return risk_object

    async def _publish_enriched_event(self, enriched_risk_object: Dict[str, Any]) -> None:
        """
        Publish enriched RiskObject to Kafka.

        Args:
            enriched_risk_object: Enriched RiskObject to publish
        """
        await self.producer.send_and_wait(
            self.config.kafka.output_topic,
            value=enriched_risk_object,
            key=enriched_risk_object.get('customer_id', 'unknown').encode('utf-8')
        )

        logger.debug(
            "enriched_event_published",
            event_id=enriched_risk_object.get('id'),
            topic=self.config.kafka.output_topic
        )


async def create_normalization_engine(config_path: Optional[str] = None) -> NormalizationEngine:
    """
    Create Normalization Engine with all services.

    Args:
        config_path: Optional path to configuration file

    Returns:
        Initialized NormalizationEngine instance
    """
    # Load configuration
    config = load_config(config_path)

    # Initialize enrichment services (TODO: Implement these)
    business_process_service = BusinessProcessService(config.timescaledb)
    phi_stripping_service = PHIStrippingService(
        spacy_model=config.phi_stripping.spacy_model
    )
    blast_radius_analyzer = BlastRadiusAnalyzer(config.timescaledb)
    regulatory_mapper = RegulatoryMapper(config.timescaledb, config.regulatory_mapping)
    risk_object_validator = RiskObjectValidator(strict_mode=config.validation.strict_mode)

    # Create engine
    engine = NormalizationEngine(
        config=config,
        business_process_service=business_process_service,
        phi_stripping_service=phi_stripping_service,
        blast_radius_analyzer=blast_radius_analyzer,
        regulatory_mapper=regulatory_mapper,
        risk_object_validator=risk_object_validator
    )

    return engine
