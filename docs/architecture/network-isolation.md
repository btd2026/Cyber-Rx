# Network Isolation Architecture

This document describes the network isolation architecture for the CyberRX Multi-Agent AI Platform, ensuring strict tenant separation and HIPAA compliance.

## Overview

The CyberRX platform implements **infrastructure-level network isolation** where each tenant's network traffic is completely segregated from other tenants. This is not just an application-level constraint but enforced at the Kubernetes network policy level.

## Isolation Layers

### Layer 1: Namespace Isolation

Each tenant gets a dedicated Kubernetes namespace:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: tenant-acme-corp
  labels:
    type: tenant
    customer-id: acme-corp
    tier: premium
```

**Key Points**:
- Namespaces provide logical separation
- Network policies are applied per namespace
- Resource quotas prevent resource exhaustion
- No shared services between namespaces

### Layer 2: Network Policies

#### Default Deny All

Every tenant namespace starts with a "deny all" policy:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: tenant-acme-corp
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
```

This ensures **no traffic** is allowed unless explicitly permitted.

#### Cross-Tenant Deny

Explicit policy denies traffic between tenant namespaces:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-cross-tenant-traffic
  namespace: tenant-acme-corp
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          type: tenant
    ports:
    - protocol: TCP
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          type: tenant
    ports:
    - protocol: TCP
```

**This policy is critical** - it prevents pods in `tenant-acme-corp` from communicating with pods in `tenant-bcbs-florida`.

#### Internal Traffic Allow

Each tenant can communicate internally:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-tenant-internal-only
  namespace: tenant-acme-corp
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          customer-id: acme-corp
  - from:
    - namespaceSelector:
        matchLabels:
          name: cyberrx-system  # Platform services
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          customer-id: acme-corp
  - to:
    - namespaceSelector:
        matchLabels:
          name: cyberrx-system
  - to:
    - namespaceSelector:
        matchLabels:
          name: cyberrx-monitoring
```

### Layer 3: Private Endpoint Access

Each tenant accesses shared services via **private endpoints only**:

```yaml
# Database access (private IP)
- to:
  - ipBlock:
      cidr: 10.0.2.4/32
  ports:
  - protocol: TCP
    port: 5432

# Event Hubs access (private IP)
- to:
  - ipBlock:
      cidr: 10.0.2.5/32
  ports:
  - protocol: TCP
    port: 9093

# Key Vault access (private IP)
- to:
  - ipBlock:
      cidr: 10.0.2.6/32
  ports:
  - protocol: TCP
    port: 443
```

**Key Points**:
- No public internet access to infrastructure
- Private IPs are within VNet
- Traffic stays within Azure backbone
- No cross-tenant routing

### Layer 4: Virtual Network Isolation

Each AKS cluster is in a dedicated VNet:

```terraform
resource "azurerm_virtual_network" "main" {
  name                = "cyberrx-vnet"
  address_space       = ["10.0.0.0/16"]
}
```

Subnets:
- `aks-subnet`: 10.0.1.0/24 (Kubernetes nodes)
- `db-subnet`: 10.0.2.0/24 (Private endpoints)
- `app-gateway-subnet`: 10.0.3.0/24 (Ingress)

**Key Points**:
- VNets are isolated from other Azure subscriptions
- No peering to customer VNets
- Private endpoints for external services

### Layer 5: DNS Isolation

DNS queries are controlled via network policies:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns-access
spec:
  podSelector: {}
  policyTypes:
  - Egress
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
    ports:
    - protocol: UDP
      port: 53
    - protocol: TCP
      port: 53
```

**Key Points**:
- Only kube-system DNS allowed
- No cross-tenant DNS resolution
- No external DNS queries (except via proxy)

## Tenant Communication Matrix

| Source Namespace | Destination Namespace | Allowed? | Policy |
|------------------|----------------------|----------|---------|
| `tenant-acme` | `tenant-acme` | ✅ Yes | `allow-tenant-internal-only` |
| `tenant-acme` | `tenant-bcbs` | ❌ No | `deny-cross-tenant-traffic` |
| `tenant-acme` | `cyberrx-system` | ✅ Yes | `allow-tenant-internal-only` |
| `tenant-acme` | `cyberrx-monitoring` | ✅ Yes | `allow-tenant-internal-only` |
| `tenant-acme` | `kube-system` (DNS) | ✅ Yes | `allow-dns-access` |
| `tenant-acme` | Azure/AWS APIs | ✅ Yes | `allow-azure-aws-services` |
| `tenant-acme` | Internet (HTTPS) | ✅ Yes | `allow-external-apis` |

## Attack Mitigation

### Preventing Cross-Tenant Attacks

**Attack Vector**: Pod in tenant A tries to access pod in tenant B

**Mitigation**:
1. Network policy `deny-cross-tenant-traffic` blocks all cross-tenant traffic
2. Separate Kubernetes service accounts per tenant
3. No shared secrets between tenants
4. Database credentials are tenant-specific

**Validation**:
```bash
./infrastructure/scripts/validate-isolation.sh tenant-acme tenant-bcbs
```

### Preventing DNS Exfiltration

**Attack Vector**: Pod attempts DNS exfiltration to external server

**Mitigation**:
1. DNS policy only allows kube-system DNS
2. External DNS blocked by network policies
3. DNS queries monitored via Prometheus

**Validation**:
```bash
# From a pod
nslookup external.com
# Should timeout/fail
```

### Preventing Privilege Escalation

**Attack Vector**: Pod attempts to access cluster-wide resources

**Mitigation**:
1. Pod Security Policies enforce non-root containers
2. Dedicated service accounts per tenant
3. RBAC roles scoped to tenant namespace only
4. No access to cluster-wide resources

**Validation**:
```bash
# From a pod
kubectl auth can-i get pods --all-namespaces
# Should return "no"
```

## Monitoring and Alerting

### Prometheus Metrics

Metrics to monitor for isolation violations:

```yaml
# Network policy violations
network_policy_denied_total{namespace="tenant-*"}

# Cross-namespace connection attempts
cross_namespace_connection_attempts{source_ns="tenant-*", dest_ns="tenant-*"}

# DNS query violations
dns_queries_blocked{namespace="tenant-*"}
```

### Grafana Dashboards

Create dashboards to visualize:
1. Network policy violations by namespace
2. Allowed vs denied traffic flows
3. DNS query patterns
4. Private endpoint connectivity

### Alert Rules

```yaml
# Alert on cross-tenant traffic attempts
- alert: CrossTenantTrafficDetected
  expr: network_policy_denied_total{source_tenant=~"tenant-.*", dest_tenant=~"tenant-.*"} > 0
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: "Cross-tenant traffic detected from {{ $labels.source_tenant }} to {{ $labels.dest_tenant }}"
```

## Troubleshooting

### Issue: Pods Cannot Communicate Within Namespace

**Symptoms**: Pods within same tenant namespace cannot communicate

**Diagnosis**:
```bash
# Check network policies
kubectl get networkpolicy -n tenant-acme -o yaml

# Check if policy allows internal traffic
kubectl describe networkpolicy allow-tenant-internal-only -n tenant-acme
```

**Solution**:
```bash
# Apply internal traffic policy
kubectl apply -f infrastructure/kubernetes/network-policies/allow-internal.yaml
```

### Issue: Cross-Tenant Traffic Blocked

**Symptoms**: Legitimate traffic between tenant and platform services blocked

**Diagnosis**:
```bash
# Check if platform services namespace is labeled
kubectl get namespace cyberrx-system --show-labels

# Check network policy selectors
kubectl get networkpolicy -n tenant-acme -o yaml | grep -A 10 namespaceSelector
```

**Solution**:
```bash
# Ensure platform namespaces have correct labels
kubectl label namespace cyberrx-system name=cyberrx-system
kubectl label namespace cyberrx-monitoring name=cyberrx-monitoring
```

### Issue: Private Endpoints Unreachable

**Symptoms**: Pods cannot reach database, event hubs, or key vault

**Diagnosis**:
```bash
# Check if private endpoint IPs are correct
kubectl get networkpolicy allow-tenant-internal-only -n tenant-acme -o yaml | grep ipBlock

# Check if subnets have private endpoints
az network private-endpoint list -g cyberrx-rg
```

**Solution**:
```bash
# Update network policies with correct private IPs
kubectl patch networkpolicy allow-tenant-internal-only -n tenant-acme --type=json -p='...'
```

## Performance Considerations

### Network Policy Overhead

Network policies add minimal overhead:
- **Latency**: < 1ms per connection
- **Throughput**: No impact on data plane
- **CPU**: ~1% overhead on kube-proxy

### Best Practices

1. **Use specific selectors**: Avoid broad `podSelector: {}`
2. **Limit policy count**: Consolidate policies where possible
3. **Monitor policy evaluation**: Use Prometheus metrics
4. **Test policy changes**: Apply in dev environment first

## Compliance

### HIPAA Requirements

This architecture supports HIPAA compliance:

| HIPAA Requirement | Implementation |
|-------------------|----------------|
| **Access Control** | Network policies + RBAC |
| **Audit Controls** | Network policy logging |
| **Integrity** | No cross-tenant data access |
| **Transmission Security** | TLS 1.3 + private endpoints |
| **Encryption** | Customer-managed keys (BYOK) |

### NIST 800-53 Controls

- **SC-7**: Boundary Protection (network policies)
- **SC-8**: Transmission Confidentiality (TLS + private endpoints)
- **SC-12**: Cryptographic Key Management and Establishment (BYOK)
- **AU-13**: Monitoring for Unauthorized Disclosure of Information (alerting)

## References

- [Kubernetes Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [Azure Private Endpoints](https://docs.microsoft.com/azure/private-link/private-endpoint-overview)
- [HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html)
- [Tenant Isolation Validation](../runbooks/tenant-provisioning.md#validation-checklist)
