"""
Financial Modeling Engine

Deterministic calculation engine for financial impact analysis.
NO LLM in calculation path - all calculations must be reproducible
for CFO board-meeting defensibility.

Components:
- Calculation Engine: Core orchestration
- Calculators: MLR, Stop-Loss, Reserve, Premium Revenue
- Services: Actuarial Service, Methodology Trail Generator
- Health Check: Monitoring endpoints
- Batch Scheduler: Scheduled financial updates

Usage:
    from financial_engine import CalculationEngine

    engine = CalculationEngine(kafka_config, timescale_config)
    await engine.run()
"""

from .calculation_engine import CalculationEngine, FinancialImpactResult, CalculationError, ValidationError
from .config import config, FinancialEngineConfig

__version__ = "1.0.0"
__all__ = [
    'CalculationEngine',
    'FinancialImpactResult',
    'CalculationError',
    'ValidationError',
    'config',
    'FinancialEngineConfig'
]
