"""
Health check service for Risk Normalization Engine.

Provides health endpoints for monitoring and readiness probes.
"""

import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from prometheus_client import make_asgi_app

from .config import NormalizationEngineConfig


app = FastAPI(title="Risk Normalization Engine")

# Prometheus metrics endpoint
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)


class HealthChecker:
    """
    Health checker for Normalization Engine components.

    Monitors Kafka connectivity, database connectivity, and
    enrichment service health.
    """

    def __init__(
        self,
        config: NormalizationEngineConfig,
        kafka_consumer: Any,
        kafka_producer: Any,
        database_pool: Any
    ):
        """
        Initialize health checker.

        Args:
            config: Configuration object
            kafka_consumer: Kafka consumer instance
            kafka_producer: Kafka producer instance
            database_pool: Database connection pool
        """
        self.config = config
        self.kafka_consumer = kafka_consumer
        self.kafka_producer = kafka_producer
        self.database_pool = database_pool

        # Health status cache
        self._health_status: Dict[str, Any] = {}
        self._last_check: Optional[datetime] = None

    async def check_health(self) -> Dict[str, Any]:
        """
        Check overall health status.

        Returns:
            Health status dictionary
        """
        health_status = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "components": {}
        }

        # Check Kafka connectivity
        kafka_health = await self._check_kafka()
        health_status["components"]["kafka"] = kafka_health

        # Check database connectivity
        database_health = await self._check_database()
        health_status["components"]["database"] = database_health

        # Determine overall status
        if any(component["status"] != "healthy" for component in health_status["components"].values()):
            health_status["status"] = "unhealthy"

        self._health_status = health_status
        self._last_check = datetime.utcnow()

        return health_status

    async def _check_kafka(self) -> Dict[str, Any]:
        """
        Check Kafka connectivity.

        Returns:
            Kafka health status
        """
        try:
            # Check consumer
            consumer_healthy = (
                self.kafka_consumer is not None and
                hasattr(self.kafka_consumer, '_client') and
                self.kafka_consumer._client is not None
            )

            # Check producer
            producer_healthy = (
                self.kafka_producer is not None and
                hasattr(self.kafka_producer, '_client') and
                self.kafka_producer._client is not None
            )

            if consumer_healthy and producer_healthy:
                return {
                    "status": "healthy",
                    "description": "Kafka connectivity OK",
                    "details": {
                        "bootstrap_servers": self.config.kafka.bootstrap_servers,
                        "input_topic": self.config.kafka.input_topic,
                        "output_topic": self.config.kafka.output_topic
                    }
                }
            else:
                return {
                    "status": "unhealthy",
                    "description": "Kafka connectivity failed",
                    "details": {
                        "consumer_healthy": consumer_healthy,
                        "producer_healthy": producer_healthy
                    }
                }

        except Exception as e:
            return {
                "status": "unhealthy",
                "description": f"Kafka health check failed: {str(e)}"
            }

    async def _check_database(self) -> Dict[str, Any]:
        """
        Check database connectivity.

        Returns:
            Database health status
        """
        try:
            # Try to fetch connection from pool
            async with self.database_pool.acquire() as conn:
                # Simple query to test connection
                await conn.fetchval('SELECT 1')

            return {
                "status": "healthy",
                "description": "Database connectivity OK",
                "details": {
                    "host": self.config.timescaledb.host,
                    "port": self.config.timescaledb.port,
                    "database": self.config.timescaledb.database
                }
            }

        except Exception as e:
            return {
                "status": "unhealthy",
                "description": f"Database health check failed: {str(e)}"
            }


@app.get("/health")
async def health(health_checker: HealthChecker = None) -> Dict[str, Any]:
    """
    Overall health status endpoint.

    Returns:
        Health status dictionary
    """
    if health_checker is None:
        raise HTTPException(status_code=503, detail="Health checker not initialized")

    return await health_checker.check_health()


@app.get("/health/ready")
async def ready(health_checker: HealthChecker = None) -> Dict[str, Any]:
    """
    Readiness probe endpoint.

    Returns:
        Readiness status
    """
    if health_checker is None:
        raise HTTPException(status_code=503, detail="Health checker not initialized")

    health_status = await health_checker.check_health()

    if health_status["status"] == "healthy":
        return {"status": "ready"}
    else:
        raise HTTPException(status_code=503, detail="Not ready")


@app.get("/health/live")
async def live(health_checker: HealthChecker = None) -> Dict[str, Any]:
    """
    Liveness probe endpoint.

    Returns:
        Liveness status
    """
    # Liveness is simple - if we're responding, we're alive
    return {"status": "alive"}
