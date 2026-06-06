"""
Health Check Endpoints for Financial Modeling Engine

Provides health check endpoints for monitoring and orchestration:
- /health: Overall health status
- /ready: Readiness probe (Kubernetes)
- /live: Liveness probe (Kubernetes)
- /metrics: Prometheus metrics

All endpoints return JSON status with component health details.
"""

import asyncio
from datetime import datetime
from typing import Dict
import structlog

from fastapi import FastAPI, Response
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST

from .config import config


logger = structlog.get_logger(__name__)


# Create FastAPI app
app = FastAPI(
    title="Financial Modeling Engine",
    description="Deterministic financial calculation engine for CyberRX",
    version="1.0.0"
)


class HealthChecker:
    """Health checker for Financial Modeling Engine."""

    def __init__(self, calculation_engine):
        """
        Initialize health checker.

        Args:
            calculation_engine: Calculation engine instance to check
        """
        self.calculation_engine = calculation_engine
        self.logger = logger

    async def check_health(self) -> Dict:
        """
        Check overall health status.

        Returns:
            Health status dict with:
                - status: "healthy", "degraded", or "unhealthy"
                - timestamp: ISO 8601 timestamp
                - components: Component health details
        """
        components = {}

        # Check Kafka connectivity
        kafka_status = await self._check_kafka()
        components['kafka'] = kafka_status

        # Check TimescaleDB connectivity
        database_status = await self._check_database()
        components['database'] = database_status

        # Determine overall status
        overall_status = self._determine_overall_status(components)

        return {
            'status': overall_status,
            'timestamp': datetime.now().isoformat(),
            'components': components
        }

    async def check_ready(self) -> Dict:
        """
        Check readiness status (Kubernetes readiness probe).

        Returns:
            Readiness status dict
        """
        # Ready if Kafka and TimescaleDB are connected
        kafka_healthy = await self._check_kafka_connectivity()
        database_healthy = await self._check_database_connectivity()

        ready = kafka_healthy and database_healthy

        return {
            'ready': ready,
            'timestamp': datetime.now().isoformat()
        }

    async def check_live(self) -> Dict:
        """
        Check liveness status (Kubernetes liveness probe).

        Returns:
            Liveness status dict
        """
        # Live if the process is running (always true if we can respond)
        return {
            'alive': True,
            'timestamp': datetime.now().isoformat()
        }

    async def _check_kafka(self) -> Dict:
        """Check Kafka connectivity."""
        try:
            # Check if consumer is running
            if self.calculation_engine and self.calculation_engine.consumer:
                # Check if consumer is subscribed
                if self.calculation_engine.consumer._subscription:
                    return {
                        'status': 'healthy',
                        'description': 'Kafka connectivity OK',
                        'details': {
                            'bootstrap_servers': config.kafka.bootstrap_servers,
                            'input_topic': config.kafka.input_topic,
                            'consumer_group': config.kafka.consumer_group
                        }
                    }

            return {
                'status': 'unhealthy',
                'description': 'Kafka consumer not connected'
            }

        except Exception as e:
            self.logger.error("Kafka health check failed", error=str(e))
            return {
                'status': 'unhealthy',
                'description': f'Kafka health check failed: {str(e)}'
            }

    async def _check_database(self) -> Dict:
        """Check TimescaleDB connectivity."""
        try:
            if self.calculation_engine and self.calculation_engine.actuarial_service:
                if self.calculation_engine.actuarial_service.pool:
                    # Try to execute a simple query
                    async with self.calculation_engine.actuarial_service.pool.acquire() as conn:
                        await conn.fetchval('SELECT 1')

                    return {
                        'status': 'healthy',
                        'description': 'TimescaleDB connectivity OK',
                        'details': {
                            'host': config.timescale.host,
                            'port': config.timescale.port,
                            'database': config.timescale.database
                        }
                    }

            return {
                'status': 'unhealthy',
                'description': 'TimescaleDB not connected'
            }

        except Exception as e:
            self.logger.error("Database health check failed", error=str(e))
            return {
                'status': 'unhealthy',
                'description': f'Database health check failed: {str(e)}'
            }

    async def _check_kafka_connectivity(self) -> bool:
        """Quick Kafka connectivity check."""
        try:
            return (
                self.calculation_engine is not None and
                self.calculation_engine.consumer is not None and
                self.calculation_engine.consumer._subscription is not None
            )
        except:
            return False

    async def _check_database_connectivity(self) -> bool:
        """Quick database connectivity check."""
        try:
            return (
                self.calculation_engine is not None and
                self.calculation_engine.actuarial_service is not None and
                self.calculation_engine.actuarial_service.pool is not None
            )
        except:
            return False

    def _determine_overall_status(self, components: Dict) -> str:
        """
        Determine overall health status from component statuses.

        Args:
            components: Component health statuses

        Returns:
            Overall status: "healthy", "degraded", or "unhealthy"
        """
        statuses = [c.get('status', 'unhealthy') for c in components.values()]

        if all(s == 'healthy' for s in statuses):
            return 'healthy'
        elif any(s == 'healthy' for s in statuses):
            return 'degraded'
        else:
            return 'unhealthy'


# Global health checker instance
health_checker: HealthChecker = None


def set_health_checker(checker: HealthChecker):
    """Set the global health checker instance."""
    global health_checker
    health_checker = checker


@app.get('/health')
async def health():
    """Overall health status endpoint."""
    if health_checker:
        return await health_checker.check_health()
    return {
        'status': 'degraded',
        'timestamp': datetime.now().isoformat(),
        'components': {}
    }


@app.get('/health/ready')
async def ready():
    """Readiness probe endpoint."""
    if health_checker:
        return await health_checker.check_ready()
    return {'ready': False, 'timestamp': datetime.now().isoformat()}


@app.get('/health/live')
async def live():
    """Liveness probe endpoint."""
    if health_checker:
        return await health_checker.check_live()
    return {'alive': True, 'timestamp': datetime.now().isoformat()}


@app.get('/metrics')
async def metrics():
    """Prometheus metrics endpoint."""
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
