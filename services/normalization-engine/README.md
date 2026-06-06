# Risk Normalization Engine

Enriches raw security events from connectors into actionable RiskObjects ready for downstream consumption by the Financial Modeling Engine and AI Agents.

## Architecture

```
[Connectors] → [Kafka: raw-security-events] → [Risk Normalization Engine]
                                                            │
                                                            ├─→ Business Process Mapping
                                                            ├─→ PHI Stripping
                                                            ├─→ Blast Radius Calculation
                                                            ├─→ Regulatory Trigger Mapping
                                                            └─→ RiskObject Validation
                                                                        │
                                                                        ▼
                                                        [Kafka: enriched-risk-objects]
```

## Components

1. **Normalization Engine** (`normalization_engine.py`) - Main orchestration service
2. **Business Process Service** (`enrichment/business_process_service.py`) - Maps assets to business processes
3. **PHI Stripping Service** (`enrichment/phi_stripping_service.py`) - Detects and strips PHI/PII
4. **Blast Radius Analyzer** (`enrichment/blast_radius_analyzer.py`) - Calculates downstream impact
5. **Regulatory Mapper** (`enrichment/regulatory_mapper.py`) - Maps regulatory obligations
6. **RiskObject Validator** (`validation/risk_object_validator.py`) - Validates RiskObjects

## Quick Start

### Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Download spaCy model
python -m spacy download en_core_web_sm
```

### Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit configuration
nano .env
```

### Running

```bash
# Run service
python -m src
```

## Environment Variables

See `.env.example` for all configuration options.

### Key Variables

- `KAFKA_BOOTSTRAP_SERVERS` - Kafka bootstrap servers
- `TIMESCALEDB_*` - TimescaleDB connection settings
- `PHI_STRIPPING_ENABLED` - Enable PHI stripping
- `METRICS_ENABLED` - Enable Prometheus metrics

## Health Endpoints

- `GET /health` - Overall health status
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe
- `GET /metrics` - Prometheus metrics

## Development

### Running Tests

```bash
pytest tests/
```

### Code Quality

```bash
# Format code
black src/

# Lint code
pylint src/

# Type checking
mypy src/
```

## Deployment

### Docker

```bash
# Build image
docker build -t cyberrx-normalization-engine .

# Run container
docker run -p 8000:8000 cyberrx-normalization-engine
```

### Kubernetes

```bash
# Apply manifests
kubectl apply -f k8s/
```

## Monitoring

### Prometheus Metrics

- `normalization_engine_events_total` - Total events processed
- `normalization_engine_enrichment_duration_seconds` - Enrichment latency
- `normalization_engine_phi_stripping_total` - PHI stripping operations
- `normalization_engine_blast_radius_size` - Blast radius size
- `normalization_engine_regulatory_triggers_total` - Regulatory triggers
- `normalization_engine_validation_errors_total` - Validation errors

### Logging

Structured JSON logs to stdout. Use `LOGGING_LEVEL` to control verbosity.

## Troubleshooting

### Events not processing

- Check Kafka connectivity: `GET /health`
- Check consumer lag: `GET /metrics` (kafka_consumer_lag)
- Check logs for errors

### PHI stripping failing

- Check spaCy model installed: `python -c "import spacy; spacy.load('en_core_web_sm')"`
- Check logs for PHI detection failures
- Test with sample PHI: see tests/test_phi_stripping_service.py

### Business process mapping failing

- Check TimescaleDB connectivity: `GET /health`
- Verify business_process_graph table exists
- Check customer_id matches data in database

## Performance

### Targets

- **Latency:** <500ms per event enrichment
- **Throughput:** >1000 events/second
- **Error Rate:** <0.1%

### Optimization

- Enable caching for business process queries (1-hour TTL)
- Batch processing for multiple events
- Horizontal scaling (multiple instances)

## Security

### PHI Handling

- PHI stripping is **MANDATORY** before LLM calls
- All PHI stripping operations logged
- No PHI in logs or error messages
- Financial data preserved (de-identified only)

### Data Privacy

- Customer_id in all database queries (tenant isolation)
- No cross-customer data leakage
- Secure credential handling

## Contributing

See `docs/ARCHITECTURE.md` for detailed architecture documentation.

## License

Copyright 2025 CyberRX. All rights reserved.
