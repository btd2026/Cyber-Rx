# Infrastructure Scaling Runbook

This runbook provides procedures for scaling the CyberRX infrastructure to meet changing demand.

## Overview

The CyberRX infrastructure is designed to scale horizontally (add more nodes) and vertically (increase node capacity). This document covers both automated and manual scaling procedures.

## Scaling Triggers

Monitor these metrics to determine when to scale:

| Metric | Threshold | Action |
|--------|-----------|--------|
| Node CPU utilization | > 80% for 15 min | Scale up cluster autoscaler |
| Node memory utilization | > 80% for 15 min | Scale up cluster autoscaler |
| Pod CPU requests > 70% of node capacity | Sustained | Add nodes |
| Database connections > 80% of max | Sustained | Scale database |
| Event Hubs throughput > 80% of capacity | Sustained | Scale Event Hubs |

## Horizontal Pod Autoscaler (HPA)

### Current HPA Configuration

Pods are configured with HPA for automatic scaling:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: service-hpa
spec:
  scaleTargetRef:
    kind: Deployment
    name: service
  minReplicas: 1
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### Adjusting HPA Settings

To increase maximum replicas:

```bash
kubectl patch hpa service-hpa -n tenant-<customer-id> -p '{"spec":{"maxReplicas":20}}'
```

To change CPU target:

```bash
kubectl patch hpa service-hpa -n tenant-<customer-id> -p '{"spec":{"metrics":[{"type":"Resource","resource":{"name":"cpu","target":{"type":"Utilization","averageUtilization":80}}}]}}'
```

### Monitoring HPA

```bash
# Get HPA status
kubectl get hpa -A

# Describe specific HPA
kubectl describe hpa service-hpa -n tenant-<customer-id>

# View HPA metrics
kubectl get --raw /apis/metrics.k8s.io/v1beta1/namespaces/tenant-<customer-id>/pods
```

## Cluster Autoscaler

### Current Configuration

AKS cluster autoscaler is configured in Terraform:

```terraform
auto_scaler_profile {
  balance_similar_node_groups = true
  max_graceful_termination_sec = 600
  scale_down_enabled          = true
  scale_down_delay_after_add   = "10m"
  scale_down_unneeded_time     = "10m"
}
```

### Adjusting Cluster Autoscaler

To change min/max nodes per node pool:

```bash
# Using Azure CLI
az aks nodepool update \
  --resource-group cyberrx-rg \
  --cluster-name cyberrx-aks \
  --name default \
  --min-count 2 \
  --max-count 20

# Using Terraform (preferred)
# Update variables.tf and run:
terraform apply -target=azurerm_kubernetes_cluster_node_pool.default_tier
```

### Monitoring Cluster Autoscaler

```bash
# Get node pool status
az aks nodepool list --resource-group cyberrx-rg --cluster-name cyberrx-aks

# Get node pool details
az aks nodepool show --resource-group cyberrx-rg --cluster-name cyberrx-aks --name default

# View autoscaler logs
kubectl logs -n kube-system -l app=cluster-autoscaler
```

## Database Scaling

### Vertical Scaling (Increase Capacity)

To scale PostgreSQL compute:

```bash
# Using Azure CLI
az postgres flexible-server update \
  --resource-group cyberrx-rg \
  --name cyberrx-postgres \
  --sku-name Standard_D8s_v3

# Using Terraform
# Update sku_name in variables.tf and run:
terraform apply -target=azurerm_postgresql_flexible_server.main
```

Available SKUs:
- Standard_B1ms (1-2 vCPUs, 2-8 GiB RAM)
- Standard_D2s_v3 (2 vCPUs, 8 GiB RAM)
- Standard_D4s_v3 (4 vCPUs, 16 GiB RAM)
- Standard_D8s_v3 (8 vCPUs, 32 GiB RAM)
- Standard_D16s_v3 (16 vCPUs, 64 GiB RAM)
- Standard_E32s_v3 (32 vCPUs, 256 GiB RAM)

### Horizontal Scaling (Read Replicas)

To add read replicas:

```bash
az postgres flexible-server replica create \
  --resource-group cyberrx-rg \
  --name cyberrx-postgres-replica1 \
  --source-server cyberrx-postgres \
  --location eastus2
```

### Storage Scaling

To increase storage:

```bash
az postgres flexible-server update \
  --resource-group cyberrx-rg \
  --name cyberrx-postgres \
  --storage-size 640000  # 640 GB
```

## Event Hubs Scaling

### Increase Capacity

To increase throughput units:

```bash
az eventhubs namespace update \
  --resource-group cyberrx-rg \
  --name cyberrx-events \
  --capacity 8  # Increase from 4 to 8
```

Capacity and throughput:
- Capacity 1: ~1,000 events/sec (Basic/Standard)
- Capacity 2: ~2,000 events/sec (Standard)
- Capacity 4: ~10,000 events/sec (Standard)
- Capacity 10: ~25,000 events/sec (Premium)

### Add Event Hubs

To create additional event hubs:

```bash
az eventhubs eventhub create \
  --resource-group cyberrx-rg \
  --namespace-name cyberrx-events \
  --name audit-events \
  --message-retention 7 \
  --partition-count 8
```

### Partition Scaling

To increase partitions for parallelism:

```bash
az eventhubs eventhub update \
  --resource-group cyberrx-rg \
  --namespace-name cyberrx-events \
  --name security-events \
  --partition-count 8  # Increase from 4 to 8
```

**Note**: Partition count can only be increased, not decreased.

## Tier-Based Scaling

### Premium Tier Customers

Premium tier customers get dedicated node pools:

```bash
# Add dedicated node pool for premium customer
az aks nodepool add \
  --resource-group cyberrx-rg \
  --cluster-name cyberrx-aks \
  --name premium-acme-corp \
  --node-count 3 \
  --node-vm-size Standard_E8s_v3 \
  --node-taints workload=acme-corp:NoSchedule \
  --labels customer=acme-corp,tier=premium
```

### Default Tier Customers

Default tier customers share the default node pool:

```bash
# Scale up default node pool
az aks nodepool update \
  --resource-group cyberrx-rg \
  --cluster-name cyberrx-aks \
  --name default \
  --node-count 10
```

### Basic Tier Customers

Basic tier customers use the smallest nodes:

```bash
# Add basic tier node pool
az aks nodepool add \
  --resource-group cyberrx-rg \
  --cluster-name cyberrx-aks \
  --name basic \
  --node-count 2 \
  --node-vm-size Standard_D2s_v3 \
  --node-taints workload=basic-tier:NoSchedule
```

## Scaling Strategies

### Predictive Scaling

Use historical data to predict scaling needs:

```bash
# Query Prometheus for historical CPU usage
kubectl port-forward -n cyberrx-monitoring svc/prometheus 9090:9090
# Query: avg(container_cpu_usage_seconds_total) by (namespace)
```

### Scheduled Scaling

Scale resources based on known patterns:

```bash
# Scale up during business hours
az aks nodepool update \
  --resource-group cyberrx-rg \
  --cluster-name cyberrx-aks \
  --name default \
  --node-count 10

# Scale down during off hours
az aks nodepool update \
  --resource-group cyberrx-rg \
  --cluster-name cyberrx-aks \
  --name default \
  --node-count 3
```

### Event-Based Scaling

Scale in response to specific events:

```bash
# Scale up before major vulnerability release
az aks nodepool update \
  --resource-group cyberrx-rg \
  --cluster-name cyberrx-aks \
  --name default \
  --node-count 15
```

## Scaling Validation

After scaling, validate:

```bash
# Check node status
kubectl get nodes

# Check pod distribution
kubectl get pods -A -o wide

# Check resource allocation
kubectl describe nodes

# Test performance
./infrastructure/scripts/validate-performance.sh
```

## Rollback Procedures

### If Scaling Causes Issues

```bash
# Revert node pool size
az aks nodepool update \
  --resource-group cyberrx-rg \
  --cluster-name cyberrx-aks \
  --name default \
  --node-count 5

# Revert database SKU
az postgres flexible-server update \
  --resource-group cyberrx-rg \
  --name cyberrx-postgres \
  --sku-name Standard_D4s_v3

# Revert Event Hubs capacity
az eventhubs namespace update \
  --resource-group cyberrx-rg \
  --name cyberrx-events \
  --capacity 4
```

## Cost Optimization

### Right-Sizing Resources

```bash
# Analyze resource usage
kubectl top pods -A --containers
kubectl top nodes

# Identify underutilized nodes
kubectl get nodes -o json | jq '.items[] | select(.status.capacity."memory/memory" < "8Gi")'

# Reduce node count if possible
az aks nodepool update \
  --resource-group cyberrx-rg \
  --cluster-name cyberrx-aks \
  --name default \
  --node-count 3
```

### Auto-Shutdown for Dev/Test

For non-production environments:

```bash
# Enable auto-shutdown (dev/test only)
az vmss update --resource-group dev-rg --name dev-vmss --set virtualMachineProfile.osProfile.windowsConfiguration.enableAutomaticUpdates=true
```

## Monitoring and Alerting

Create Prometheus alerts for scaling:

```yaml
# Alert on high CPU
- alert: HighCPUUsage
  expr: avg(container_cpu_usage_seconds_total) by (namespace) > 0.8
  for: 15m
  labels:
    severity: warning
  annotations:
    summary: "High CPU usage in namespace {{ $labels.namespace }}"

# Alert on low CPU (downscale opportunity)
- alert: LowCPUUsage
  expr: avg(container_cpu_usage_seconds_total) by (namespace) < 0.2
  for: 1h
  labels:
    severity: info
  annotations:
    summary: "Low CPU usage - consider scaling down {{ $labels.namespace }}"
```

## Troubleshooting

### Issue: Cluster Autoscaler Not Working

**Symptoms**: Cluster not scaling despite high CPU/memory

**Diagnosis**:
```bash
# Check autoscaler logs
kubectl logs -n kube-system -l app=cluster-autoscaler

# Check for resource quotas
kubectl get resourcequota -A

# Check if max node count reached
az aks nodepool show --resource-group cyberrx-rg --cluster-name cyberrx-aks --name default
```

**Solution**:
```bash
# Increase max node count
az aks nodepool update --resource-group cyberrx-rg --cluster-name cyberrx-aks --name default --max-count 20
```

### Issue: HPA Not Scaling

**Symptoms**: Pods not scaling despite high CPU

**Diagnosis**:
```bash
# Check HPA status
kubectl describe hpa <hpa-name> -n <namespace>

# Check if metrics server is running
kubectl get pods -n kube-system | grep metrics-server

# Check resource requests
kubectl describe deployment <deployment> -n <namespace> | grep requests
```

**Solution**:
```bash
# Ensure resources are requested
kubectl patch deployment <deployment> -n <namespace> -p '{"spec":{"template":{"spec":{"containers":[{"name":"<container>","resources":{"requests":{"cpu":"250m","memory":"256Mi"}}}]}}}}'
```

## References

- [AKS Cluster Autoscaler](https://docs.microsoft.com/azure/aks/cluster-autoscaler)
- [Horizontal Pod Autoscaler](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [Azure PostgreSQL Scaling](https://docs.microsoft.com/azure/postgresql/flexible-server/concepts-read-replicas)
- [Event Hubs Scaling](https://docs.microsoft.com/azure/event-hubs/event-hubs-scalability)
