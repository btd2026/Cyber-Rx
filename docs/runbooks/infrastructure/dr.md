# Disaster Recovery Runbook

This runbook provides procedures for disaster recovery (DR) and business continuity for the CyberRX infrastructure.

## Overview

The CyberRX infrastructure implements a multi-layer disaster recovery strategy:

1. **High Availability (HA)**: Zone-redundant services within a region
2. **Geo-Redundancy**: Cross-region replication for critical data
3. **Backup**: Point-in-time recovery for databases
4. **Infrastructure as Code**: Rapid reprovisioning via Terraform

## RPO/RTO Targets

| Service | RPO (Recovery Point Objective) | RTO (Recovery Time Objective) |
|---------|-------------------------------|------------------------------|
| Application Services | 0 min (HA) | 5 min (HA) |
| PostgreSQL Database | 5 min (geo-replicas) | 15 min |
| Event Hubs | 0 min (HA) | 5 min (HA) |
| Key Vault | 0 min (geo-redundant) | 5 min |
| Infrastructure | Daily (Terraform state) | 30 min |

## Architecture

### High Availability Design

```
                  Primary Region (East US 2)
                  ┌─────────────────────────┐
                  │  AKS Cluster (3 AZs)    │
                  │  ┌───┐  ┌───┐  ┌───┐   │
                  │  │AZ1│  │AZ2│  │AZ3│   │
                  │  └───┘  └───┘  └───┘   │
                  └─────────────────────────┘
                           │
                    Geo-Replicated Data
                           │
                  ┌─────────┴──────────┐
                  │                    │
          ┌───────▼────────┐  ┌───────▼────────┐
          │ PostgreSQL (HA)│  │  Event Hubs   │
          │  (Primary)     │  │  (Geo-Rep)    │
          └───────┬────────┘  └───────┬────────┘
                  │                    │
                  └─────────┬──────────┘
                            │
                  Geo-Replication
                            │
                  Secondary Region (West US 2)
                  ┌─────────────────────────┐
                  │  AKS Cluster (Hot Standby)│
                  │  PostgreSQL (Read Replica)│
                  │  Event Hubs (Geo-Replica)│
                  └─────────────────────────┘
```

## Backup Strategy

### Database Backups

PostgreSQL flexible server has automatic backups enabled:

```bash
# Check backup configuration
az postgres flexible-server show --resource-group cyberrx-rg --name cyberrx-postgres --query backup

# Backup retention: 35 days
# Geo-redundant backup: Enabled
# Point-in-time recovery: Enabled
```

### Manual Database Backups

For additional safety:

```bash
# Create database dump
kubectl exec -n tenant-<customer-id> deployment/db -- pg_dump -U postgres -d <database> > backup.sql

# Copy to Azure Storage
az storage blob upload \
  --container-name database-backups \
  --file backup.sql \
  --name backup-$(date +%Y%m%d-%H%M%S).sql
```

### Terraform State Backups

Terraform state is stored in Azure Storage with geo-redundancy:

```bash
# Export Terraform state
terraform state pull > terraform-state-backup-$(date +%Y%m%d).tfstate

# Upload to backup location
az storage blob upload \
  --container-name terraform-backups \
  --file terraform-state-backup-$(date +%Y%m%d).tfstate \
  --name terraform-state-backup-$(date +%Y%m%d).tfstate
```

## Recovery Procedures

### Scenario 1: Node Failure

**Impact**: Single or multiple nodes fail in AKS cluster

**Recovery Time**: 5-10 minutes (automatic)

**Procedure**:

1. AKS automatically reschedules pods to healthy nodes
2. Cluster autoscaler provisions new nodes if needed
3. Verify pods are running:

```bash
kubectl get pods -A -o wide

# Check node status
kubectl get nodes
```

4. If manual intervention needed:

```bash
# Cordon and drain failed node
kubectl cordon <failed-node>
kubectl drain <failed-node> --ignore-daemonsets --delete-emptydir-data

# Delete node from cluster
az aks nodepool delete \
  --resource-group cyberrx-rg \
  --cluster-name cyberrx-aks \
  --name <node-pool-name> \
  --node-name <failed-node>
```

### Scenario 2: Database Primary Failure

**Impact**: PostgreSQL primary becomes unavailable

**Recovery Time**: 10-15 minutes

**Procedure**:

1. **Automatic failover** (if HA enabled):

```bash
# PostgreSQL automatically fails over to standby replica
# Verify failover completed:

az postgres flexible-server show \
  --resource-group cyberrx-rg \
  --name cyberrx-postgres \
  --query "highAvailability.state"
```

2. **Update application connection strings**:

```bash
# Update ConfigMap with new primary endpoint
kubectl patch configmap -n tenant-<customer-id> database-config \
  --type=json \
  -p='[{"op": "replace", "path": "/data/DATABASE_HOST", "value":"<new-primary-endpoint>"}]'

# Restart pods to pick up new configuration
kubectl rollout restart deployment -n tenant-<customer-id>
```

3. **Verify connectivity**:

```bash
kubectl run test-db -n tenant-<customer-id> --rm -it --image=postgres:16 --restart=Never \
  -- psql -h <new-primary-endpoint> -U postgres -d <database>
```

### Scenario 3: Region Outage

**Impact**: Entire Azure region becomes unavailable

**Recovery Time**: 30-60 minutes

**Procedure**:

1. **Verify secondary region is operational**:

```bash
# Switch to secondary region context
az account set --subscription <secondary-subscription>

# Check secondary AKS cluster
az aks show --resource-group cyberrx-dr-rg --name cyberrx-aks-dr

# Get credentials
az aks get-credentials --resource-group cyberrx-dr-rg --name cyberrx-aks-dr
```

2. **Promote read replica to primary**:

```bash
az postgres flexible-server replica promote-replica \
  --resource-group cyberrx-dr-rg \
  --name cyberrx-postgres-dr
```

3. **Recreate Event Hubs namespace** (if not geo-replicated):

```bash
# Create Event Hubs in secondary region
az eventhubs namespace create \
  --resource-group cyberrx-dr-rg \
  --name cyberrx-events-dr \
  --location westus2 \
  --sku Standard \
  --capacity 4
```

4. **Deploy applications to secondary cluster**:

```bash
# Apply Kubernetes manifests
kubectl apply -f infrastructure/kubernetes/namespaces/base.yaml

# Deploy tenant applications
kubectl apply -f <tenant-manifests>
```

5. **Update DNS to point to secondary region**:

```bash
# Update DNS CNAME records
az network dns record-set cname update \
  --resource-group cyberrx-rg \
  --zone-name cyberrx.com \
  --record-set-name api \
  --cname cyberrx-api-dr.westus2.cloudapp.azure.com
```

### Scenario 4: Accidental Data Deletion

**Impact**: Critical data accidentally deleted

**Recovery Time**: 15-30 minutes

**Procedure**:

1. **Point-in-time recovery (PITR)**:

```bash
# Identify recovery point (before deletion)
az postgres flexible-server server list-logs \
  --resource-group cyberrx-rg \
  --name cyberrx-postgres

# Restore database to specific time
az postgres flexible-server db restore \
  --resource-group cyberrx-rg \
  --name cyberrx-postgres \
  --source-database <database-name> \
  --restore-point-in-time "2025-01-15T14:30:00Z"
```

2. **Restore from backup** (if PITR not available):

```bash
# List available backups
az postgres flexible-server backup list \
  --resource-group cyberrx-rg \
  --server-name cyberrx-postgres

# Restore from specific backup
az postgres flexible-server restore \
  --resource-group cyberrx-rg \
  --name cyberrx-postgres-restored \
  --source-server cyberrx-postgres \
  --backup-id <backup-id>
```

3. **Restore application state**:

```bash
# Reapply Kubernetes manifests
kubectl apply -f <manifest-directory>

# Restore ConfigMaps and Secrets
kubectl apply -f backups/configmaps/
kubectl apply -f backups/secrets/
```

### Scenario 5: Key Vault Deletion

**Impact**: Secrets and keys accidentally deleted

**Recovery Time**: 5-15 minutes

**Procedure**:

1. **Recover Key Vault** (if soft delete enabled):

```bash
# List deleted vaults
az keyvault list-deleted --resource-group cyberrx-rg

# Recover deleted vault
az keyvault recover --resource-group cyberrx-rg --name cyberrx-kv
```

2. **Recover deleted secrets**:

```bash
# List deleted secrets
az keyvault secret list-deleted --vault-name cyberrx-kv

# Recover specific secret
az keyvault secret recover --vault-name cyberrx-kv --name <secret-name>
```

3. **Recover deleted keys**:

```bash
# List deleted keys
az keyvault key list-deleted --vault-name cyberrx-kv

# Recover specific key
az keyvault key recover --vault-name cyberrx-kv --name <key-name>
```

4. **Rotate CSI driver pods** (to sync recovered secrets):

```bash
kubectl delete pod -n kube-system -l app=secrets-store-csi-driver
```

## Testing and Validation

### Quarterly DR Drills

Every quarter, perform a DR drill:

1. **Simulate node failure**:
   - Cordon and drain a node
   - Verify autoscaling works

2. **Test database failover**:
   - Trigger manual failover
   - Verify application connectivity

3. **Test restore procedures**:
   - Restore database from backup
   - Validate data integrity

4. **Document lessons learned**
   - Update runbooks
   - Improve procedures

### Monthly Backup Validation

```bash
# Verify backups exist
az postgres flexible-server backup list --resource-group cyberrx-rg --server-name cyberrx-postgres

# Test backup restore (to temporary database)
az postgres flexible-server db restore \
  --resource-group cyberrx-rg \
  --name cyberrx-postgres-test-restore \
  --source-server cyberrx-postgres \
  --backup-id <latest-backup-id>

# Validate restored database
kubectl run test-restore --rm -it --image=postgres:16 --restart=Never -- \
  psql -h cyberrx-postgres-test-restore.postgres.database.azure.com -U postgres -d postgres -c "SELECT 1;"

# Delete test database
az postgres flexible-server db delete \
  --resource-group cyberrx-rg \
  --server-name cyberrx-postgres-test-restore \
  --name postgres \
  --yes
```

## Monitoring and Alerting

### Prometheus Alerts

Create DR-specific alerts:

```yaml
# Alert on failed nodes
- alert: NodeNotReady
  expr: kube_node_status_ready{condition="true"} == 0
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "Node {{ $labels.node }} is not ready"

# Alert on database failover
- alert: PostgreSQLFailover
  expr: postgresql_replication_lag_seconds > 60
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: "PostgreSQL failover detected"

# Alert on backup failure
- alert: BackupFailed
  expr: up{job="postgres-backup"} == 0
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "PostgreSQL backup job failed"
```

### Health Checks

Implement comprehensive health checks:

```yaml
# Liveness probe
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 10

# Readiness probe
readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 5
```

## Communication Plan

### During Outage

1. **Internal team notification** (Slack/PagerDuty)
2. **Customer notification** (if > 15 min outage)
3. **Status page update**
4. **Executive briefing** (if > 30 min outage)

### Communication Templates

**Initial Incident Notification**:
```
🚨 INCIDENT DETECTED

Service: CyberRX Platform
Impact: Database connectivity issues
Started: <timestamp>
Status: Investigating

Updates will follow.
```

**Customer Notification**:
```
Dear CyberRX Customer,

We are currently experiencing a service interruption affecting
database connectivity. Our team is actively working to resolve
the issue.

Estimated Resolution: <time>

We apologize for any inconvenience and appreciate your patience.
```

## Documentation and Knowledge Management

### Incident Reports

After every incident or DR drill, document:

1. Root cause analysis
2. Timeline of events
3. Recovery actions taken
4. Impact assessment
5. Lessons learned
6. Action items

### Runbook Updates

Keep runbooks current:
- Review quarterly
- Update after each incident
- Validate procedures in drills
- Train new team members

## References

- [Azure HA for PostgreSQL](https://docs.microsoft.com/azure/postgresql/flexible-server/concepts-high-availability)
- [AKS Disaster Recovery](https://docs.microsoft.com/azure/aks/operator-best-practices-multi-region)
- [Event Hubs Geo-Replication](https://docs.microsoft.com/azure/event-hubs/event-hubs-geo-disaster-recovery)
- [Key Vault Backup and Restore](https://docs.microsoft.com/azure/key-vault/general/backup-restore)
