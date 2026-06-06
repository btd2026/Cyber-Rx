# Financial Modeling Engine

Deterministic calculation engine for financial impact analysis in the CyberRX Multi-Agent AI Platform.

## Overview

The Financial Modeling Engine calculates deterministic dollar exposure for enriched risk objects, producing MLR impact estimates, stop-loss exposure calculations, reserve-at-risk analysis, and premium revenue risk assessments.

**CRITICAL:** NO LLM in the calculation path. All calculations are deterministic and reproducible for CFO board-meeting defensibility.

## Architecture

```
[Risk Normalization Engine] → [Kafka: enriched-risk-objects] → [Financial Modeling Engine]
                                                                          │
                                                                          ├─→ [Calculation Engine (pandas)]
                                                                          │
                                                                          ├─→ [MLR Impact Calculator]
                                                                          │
                                                                          ├─→ [Stop-Loss Exposure Calculator]
                                                                          │
                                                                          ├─→ [Reserve at Risk Calculator]
                                                                          │
                                                                          ├─→ [Premium Revenue Risk Calculator]
                                                                          │
                                                                          ├─→ [Methodology Trail Generator]
                                                                          │
                                                                          ├─→ [Actuarial Export Parser]
                                                                          │
                                                                          └─→ [TimescaleDB: financial_impacts]
                                                                                    │
                                                                                    ▼
                                                                            [CFO Agent (T-MVP-008)]
```

## Components

### 1. Core Calculation Engine

**Location:** `src/calculation_engine.py`

Orchestrates the complete financial calculation pipeline:
1. Subscribe to Kafka topic `enriched-risk-objects`
2. Parse actuarial data (CSV/SQL exports)
3. Calculate MLR impact
4. Calculate stop-loss exposure
5. Calculate reserve at risk
6. Calculate premium revenue risk
7. Aggregate total exposure
8. Generate methodology trail
9. Validate financial impact
10. Publish to TimescaleDB

### 2. MLR Impact Calculator

**Location:** `src/calculators/mlr_impact_calculator.py`

Calculates Medical Loss Ratio (MLR) impact:
- Projected claims increase = blast_radius_criticality × likelihood_score × average_claim_cost × affected_member_count × claim_rate
- MLR impact (percentage points) = projected_claims_increase / premium_revenue

### 3. Stop-Loss Exposure Calculator

**Location:** `src/calculators/stop_loss_exposure_calculator.py`

Calculates stop-loss exposure:
- Projected losses = blast_radius_criticality × likelihood_score × average_claim_cost × affected_member_count × claim_rate
- Exposure against attachment = max(0, projected_losses - attachment_point)
- Remaining capacity = aggregate_limit - current_position - exposure

### 4. Reserve at Risk Calculator

**Location:** `src/calculators/reserve_at_risk_calculator.py`

Calculates reserve implications:
- Identify reserve type from business_process_map
- Projected depletion = blast_radius_criticality × likelihood_score × claim_rate × reserve_balance
- Reserve at risk = projected_depletion

### 5. Premium Revenue Risk Calculator

**Location:** `src/calculators/premium_revenue_risk_calculator.py`

Calculates revenue implications:
- Identify line of business from business_process_map
- Projected attrition = blast_radius_criticality × likelihood_score × attrition_rate × member_count
- Annual revenue risk = projected_attrition × premium_per_member × 12

### 6. Methodology Trail Generator

**Location:** `src/services/methodology_trail_generator.py`

Generates complete audit methodology trails for CFO board-meeting defensibility:
- Calculation methodology description
- Methodology version
- Calculation timestamp
- Data sources with quality scores
- Key assumptions made

### 7. Actuarial Service

**Location:** `src/services/actuarial_service.py`

Manages actuarial data access and caching:
- Parse CSV/SQL exports
- Validate data quality
- Cache actuarial data
- Provide data access interface

### 8. Batch Job Scheduler

**Location:** `src/batch_scheduler.py`

Schedules batch jobs for:
- Daily financial updates (2:00 AM daily)
- Actuarial export processing (3:00 AM daily)

### 9. Health Check Endpoints

**Location:** `src/health.py`

Provides health check endpoints:
- `GET /health` - Overall health status
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe
- `GET /metrics` - Prometheus metrics

## Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Download spaCy model (for PHI stripping in T-MVP-005)
python -m spacy download en_core_web_sm
```

## Configuration

Configuration is managed through environment variables. See `.env.example` for all available options.

```bash
# Kafka Configuration
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
KAFKA_INPUT_TOPIC=enriched-risk-objects
KAFKA_CONSUMER_GROUP=financial-engine-group

# TimescaleDB Configuration
TIMESCALE_HOST=localhost
TIMESCALE_PORT=5432
TIMESCALE_DATABASE=cyberrx
TIMESCALE_USER=cyberrx
TIMESCALE_PASSWORD=cyberrx

# Calculation Configuration
CALCULATION_METHODOLOGY_VERSION=1.0.0
CALCULATION_TIMEOUT=60
CALCULATION_MAX_RETRIES=3
CALCULATION_BATCH_SIZE=100

# Batch Scheduling
BATCH_FINANCIAL_UPDATE_CRON="0 2 * * *"
BATCH_ACTUARIAL_EXPORT_CRON="0 3 * * *"
```

## Quick Start

```bash
# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Run the calculation engine
python -m src.calculation_engine
```

## Prometheus Metrics

The engine exposes the following Prometheus metrics on port 9090:

- `financial_engine_calculations_total{status}` - Total financial calculations
- `financial_engine_calculation_duration_seconds{calculator}` - Calculation latency
- `financial_engine_mlr_impact_distribution` - MLR impact distribution
- `financial_engine_stop_loss_exposure_distribution` - Stop-loss exposure distribution
- `financial_engine_reserve_at_risk_distribution` - Reserve at risk distribution
- `financial_engine_premium_revenue_risk_distribution` - Premium revenue risk distribution
- `financial_engine_total_exposure_distribution` - Total exposure distribution
- `financial_engine_actuarial_data_quality_score` - Actuarial data quality score
- `financial_engine_calculation_errors_total{error_type}` - Calculation errors

## Testing

```bash
# Run unit tests
pytest tests/

# Run with coverage
pytest --cov=src tests/
```

## Documentation

- [Architecture Guide](docs/ARCHITECTURE.md) - Detailed architecture and data flow
- [Calculation Guide](docs/CALCULATION_GUIDE.md) - Calculation formulas and methodology
- [MLR Calculation](docs/MLR_CALCULATION.md) - MLR impact calculation details
- [Stop-Loss Calculation](docs/STOP_LOSS_CALCULATION.md) - Stop-loss exposure calculation details
- [Reserve Calculation](docs/RESERVE_CALCULATION.md) - Reserve at risk calculation details
- [Premium Revenue Calculation](docs/PREMIUM_REVENUE_CALCULATION.md) - Premium revenue risk calculation details
- [Methodology Trail Guide](docs/METHODOLOGY_TRAIL_GUIDE.md) - Methodology trail generation
- [Actuarial Data Guide](docs/ACTUARIAL_DATA_GUIDE.md) - Actuarial export format and parsing
- [Batch Scheduling](docs/BATCH_SCHEDULING.md) - Batch job scheduling
- [Metrics Reference](docs/METRICS_REFERENCE.md) - Prometheus metrics
- [Troubleshooting](docs/TROUBLESHOOTING.md) - Common issues and debugging

## Security Considerations

### NO LLM in Calculation Path

**CRITICAL:** All calculations must be deterministic and reproducible. No LLM calls are permitted in the calculation pipeline. The CFO must be able to defend these figures in a board meeting with complete audit trails.

### Data Privacy

- Customer_id in all database queries (tenant isolation)
- No cross-customer data leakage
- Actuarial data access controlled

### Audit Trail

- Every calculation has methodology trail
- Every dollar figure traceable to source data
- Every assumption documented
- Calculation timestamps recorded

## Performance

### Throughput

- Target: >500 risk objects/second
- Batch processing: 100 risk objects/batch

### Latency

- Target: <1 second per risk object calculation

### Error Rate

- Target: <0.1% of calculations fail
- Fallback to conservative estimates on error

## Deployment

### Docker

```bash
# Build image
docker build -t financial-engine:1.0.0 .

# Run container
docker run -p 9090:9090 financial-engine:1.0.0
```

### Kubernetes

```bash
# Apply deployment
kubectl apply -f k8s/deployment.yaml

# Apply service
kubectl apply -f k8s/service.yaml
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Add tests
4. Ensure all tests pass
5. Submit pull request

## License

Proprietary - All rights reserved

## Support

For support, contact the CyberRX engineering team.
