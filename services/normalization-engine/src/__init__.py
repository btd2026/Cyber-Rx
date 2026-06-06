"""
Risk Normalization Engine - Main entry point.

Orchestrates the enrichment pipeline for security events from connectors.
"""

import asyncio
import signal
import sys
from pathlib import Path

import structlog
from dotenv import load_dotenv

from .config import load_config
from .normalization_engine import create_normalization_engine
from .health import HealthChecker


# Load environment variables
load_dotenv()

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger(__name__)


class NormalizationEngineService:
    """
    Normalization Engine service lifecycle management.

    Manages startup, shutdown, and signal handling.
    """

    def __init__(self, config_path: str = None):
        """
        Initialize Normalization Engine service.

        Args:
            config_path: Optional path to configuration file
        """
        self.config_path = config_path
        self.engine = None
        self.health_checker = None

        logger.info("initializing_service", config_path=config_path)

    async def start(self) -> None:
        """
        Start the Normalization Engine service.

        Initializes all components and begins event processing.
        """
        logger.info("starting_service")

        try:
            # Load configuration
            config = load_config(self.config_path)

            # Create normalization engine
            self.engine = await create_normalization_engine(self.config_path)

            # Start engine
            await self.engine.start()

            # Create health checker
            self.health_checker = HealthChecker(
                config=config,
                kafka_consumer=self.engine.consumer,
                kafka_producer=self.engine.producer,
                database_pool=None  # TODO: Initialize database pool
            )

            logger.info("service_started")

        except Exception as e:
            logger.error("service_startup_failed", error=str(e))
            sys.exit(1)

    async def stop(self) -> None:
        """
        Stop the Normalization Engine service.

        Gracefully shuts down all components.
        """
        logger.info("stopping_service")

        try:
            if self.engine:
                await self.engine.stop()

            logger.info("service_stopped")

        except Exception as e:
            logger.error("service_shutdown_failed", error=str(e))
            sys.exit(1)

    async def run(self) -> None:
        """
        Run the Normalization Engine service.

        Starts the service and runs until interrupted.
        """
        await self.start()

        # Keep running until interrupted
        try:
            while self.engine.running:
                await asyncio.sleep(1)
        except asyncio.CancelledError:
            pass
        finally:
            await self.stop()


async def main() -> None:
    """
    Main entry point for Normalization Engine service.
    """
    service = NormalizationEngineService()

    # Setup signal handlers
    loop = asyncio.get_event_loop()

    def signal_handler(sig, frame):
        logger.info("signal_received", signal=sig)
        asyncio.create_task(service.stop())

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # Run service
    await service.run()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("keyboard_interrupt")
    except Exception as e:
        logger.error("unhandled_exception", error=str(e))
        sys.exit(1)
