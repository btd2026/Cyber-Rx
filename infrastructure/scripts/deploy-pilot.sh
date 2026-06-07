#!/bin/bash

# ============================================================================
# Pilot Customer Deployment Script
# ============================================================================
# Task: T-PILOT-001 - Pilot Customer Environment Setup
# Description: Automated deployment of pilot customer infrastructure
# Author: Senior Backend Engineer
# Date: 2025-06-06
# ============================================================================

set -e  # Exit on error
set -o pipefail  # Exit on pipe failure

# ============================================================================
# CONFIGURATION
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TERRAFORM_DIR="$PROJECT_ROOT/infrastructure/terraform/tenants/pilot-customer"
API_DIR="$PROJECT_ROOT/cyberrx-api"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================================================
# LOGGING FUNCTIONS
# ============================================================================

log_info() {
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# ============================================================================
# PRE-DEPLOYMENT VALIDATION
# ============================================================================

validate_prerequisites() {
    log_info "Validating prerequisites..."
    
    # Check if required tools are installed
    local required_tools=("terraform" "az" "kubectl" "node" "npm")
    
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "Required tool not found: $tool"
            exit 1
        fi
    done
    
    log_info "Prerequisites validated successfully"
}

validate_environment_variables() {
    log_info "Validating environment variables..."
    
    local required_vars=(
        "ARM_CLIENT_ID"
        "ARM_CLIENT_SECRET"
        "ARM_SUBSCRIPTION_ID"
        "ARM_TENANT_ID"
        "DATABASE_URL"
        "TENANT_ID"
        "CUSTOMER_ID"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        log_error "Missing required environment variables: ${missing_vars[*]}"
        exit 1
    fi
    
    log_info "Environment variables validated successfully"
}

validate_azure_authentication() {
    log_info "Validating Azure authentication..."
    
    if ! az account show &> /dev/null; then
        log_error "Azure authentication failed. Run 'az login' first."
        exit 1
    fi
    
    log_info "Azure authentication validated successfully"
}

# ============================================================================
# TERRAFORM DEPLOYMENT
# ============================================================================

terraform_init() {
    log_info "Initializing Terraform..."
    
    cd "$TERRAFORM_DIR"
    
    terraform init \
        -backend-config="storage_account_name=${TF_VAR_storage_account_name}" \
        -backend-config="container_name=terraform-state" \
        -backend-config="key=pilot-customer.tfstate"
    
    log_info "Terraform initialized successfully"
}

terraform_plan() {
    log_info "Running Terraform plan..."
    
    cd "$TERRAFORM_DIR"
    
    terraform plan \
        -out=pilot-plan.tfstate \
        -var="tenant_id=${TENANT_ID}" \
        -var="customer_id=${CUSTOMER_ID}" \
        -var="tenant_prefix=${TENANT_PREFIX}" \
        -var="location=${LOCATION:-eastus}" \
        -var="resource_group_name=${RESOURCE_GROUP_NAME}" \
        -var="aks_cluster_name=${AKS_CLUSTER_NAME}" \
        -var="log_analytics_workspace_name=${LOG_ANALYTICS_WORKSPACE_NAME}" \
        -var="platform_tenant_id=${PLATFORM_TENANT_ID}" \
        -var="platform_admin_object_id=${PLATFORM_ADMIN_OBJECT_ID}"
    
    log_info "Terraform plan completed successfully"
}

terraform_apply() {
    log_info "Applying Terraform configuration..."
    
    cd "$TERRAFORM_DIR"
    
    terraform apply pilot-plan.tfstate
    
    log_info "Terraform apply completed successfully"
}

terraform_outputs() {
    log_info "Capturing Terraform outputs..."
    
    cd "$TERRAFORM_DIR"
    
    terraform output -json > /tmp/pilot-outputs.json
    
    log_info "Terraform outputs captured successfully"
}

# ============================================================================
# DATABASE MIGRATION
# ============================================================================

apply_database_migrations() {
    log_info "Applying database migrations..."
    
    cd "$API_DIR"
    
    # Apply RLS policies migration
    psql "$DATABASE_URL" -f "$PROJECT_ROOT/infrastructure/database/migrations/003_add_tenant_rls_policies.sql"
    
    log_info "Database migrations applied successfully"
}

# ============================================================================
# SERVICE DEPLOYMENT
# ============================================================================

build_and_push_images() {
    log_info "Building and pushing container images..."
    
    cd "$PROJECT_ROOT"
    
    # Build all service images
    local services=(
        "cyberrx-api"
        "normalization-engine"
        "financial-modeling-engine"
        "agent-runtime"
        "splunk-connector"
        "crowdstrike-connector"
        "azure-ad-connector"
        "nasco-connector"
        "alerting-service"
    )
    
    for service in "${services[@]}"; do
        log_info "Building $service..."
        
        # Build image
        docker build -t "${REGISTRY_URL}/${service}:${IMAGE_TAG}" "./services/${service}"
        
        # Push image
        docker push "${REGISTRY_URL}/${service}:${IMAGE_TAG}"
        
        log_info "Built and pushed $service successfully"
    done
    
    log_info "All container images built and pushed successfully"
}

deploy_services_to_kubernetes() {
    log_info "Deploying services to Kubernetes..."
    
    cd "$TERRAFORM_DIR"
    
    # Get tenant namespace from Terraform outputs
    local NAMESPACE=$(terraform output -raw kubernetes_namespace)
    
    # Apply Kubernetes manifests
    kubectl apply -f "$PROJECT_ROOT/infrastructure/k8s/tenant/" \
        --namespace="$NAMESPACE"
    
    # Wait for deployments to be ready
    kubectl wait --for=condition=ready pod \
        --namespace="$NAMESPACE" \
        --all \
        --timeout=300s
    
    log_info "Services deployed to Kubernetes successfully"
}

# ============================================================================
# CONNECTOR CONFIGURATION
# ============================================================================

configure_connectors() {
    log_info "Configuring connectors..."
    
    cd "$API_DIR"
    
    # Configure connectors using API
    node -e "
        const TenantProvisioningService = require('./src/services/tenant-provisioning/TenantProvisioningService');
        const service = new TenantProvisioningService();
        
        service.setupConnectorCredentials({
            customerId: '${CUSTOMER_ID}',
            connectors: [
                { type: 'splunk', credentialType: 'api-key' },
                { type: 'crowdstrike', credentialType: 'api-key' },
                { type: 'azure-ad', credentialType: 'oauth' },
                { type: 'nasco', credentialType: 'database' }
            ]
        }).then(result => {
            console.log('Connectors configured:', result);
        }).catch(error => {
            console.error('Connector configuration failed:', error);
            process.exit(1);
        });
    "
    
    log_info "Connectors configured successfully"
}

# ============================================================================
# HEALTH CHECKS
# ============================================================================

run_health_checks() {
    log_info "Running health checks..."
    
    cd "$TERRAFORM_DIR"
    
    # Get tenant namespace and API endpoint from Terraform outputs
    local NAMESPACE=$(terraform output -raw kubernetes_namespace)
    local API_ENDPOINT=$(terraform output -raw api_endpoint)
    
    # Check all services
    local services=(
        "api-gateway"
        "normalization-engine"
        "financial-modeling-engine"
        "agent-runtime"
        "splunk-connector"
        "crowdstrike-connector"
        "azure-ad-connector"
        "nasco-connector"
        "alerting-service"
    )
    
    for service in "${services[@]}"; do
        log_info "Checking $service health..."
        
        local health_status=$(curl -s -o /dev/null -w "%{http_code}" \
            "${API_ENDPOINT}/health/${service}")
        
        if [ "$health_status" -eq 200 ]; then
            log_info "$service is healthy"
        else
            log_error "$service health check failed (status: $health_status)"
            exit 1
        fi
    done
    
    log_info "All health checks passed successfully"
}

# ============================================================================
# ISOLATION VALIDATION
# ============================================================================

run_isolation_tests() {
    log_info "Running isolation validation tests..."
    
    cd "$API_DIR"
    
    # Run isolation tests
    node -e "
        const TenantIsolationTests = require('../infrastructure/tests/isolation-validation/tenantIsolationTests');
        const tests = new TenantIsolationTests();
        
        tests.runAllTests('${TENANT_ID}', 'tenant-b-id').then(results => {
            if (results.overallStatus === 'failed') {
                console.error('Isolation tests failed:', results);
                process.exit(1);
            } else {
                console.log('Isolation tests passed:', results);
            }
        }).catch(error => {
            console.error('Isolation tests error:', error);
            process.exit(1);
        });
    "
    
    log_info "Isolation validation tests passed successfully"
}

# ============================================================================
# DOCUMENTATION
# ============================================================================

generate_deployment_report() {
    log_info "Generating deployment report..."
    
    local report_file="$PROJECT_ROOT/workspace/artifacts/T-PILOT-001-DEPLOYMENT-REPORT.md"
    
    cat > "$report_file" << EOF
# Pilot Customer Deployment Report

**Date:** $(date '+%Y-%m-%d %H:%M:%S')
**Tenant ID:** ${TENANT_ID}
**Customer ID:** ${CUSTOMER_ID}
**Status:** SUCCESS

## Infrastructure Deployed

### Database
- **Server:** \$(terraform output -raw database_fqdn)
- **Database:** \$(terraform output -raw database_name)
- **Encryption:** Customer-managed keys (BYOK)

### Key Vault
- **URI:** \$(terraform output -raw key_vault_uri)
- **Keys:** database-encryption-key, storage-encryption-key, eventhub-encryption-key

### Event Hub
- **Namespace:** \$(terraform output -raw eventhub_namespace_name)
- **Topics:** risk-events, audit-events, connector-events

### Storage
- **Account:** \$(terraform output -raw storage_account_name)
- **Containers:** exports, logs, reports, evidence, backups

### Monitoring
- **Application Insights:** \$(terraform output -raw application_insights_instrumentation_key)

### Kubernetes
- **Namespace:** \$(terraform output -raw kubernetes_namespace)

## Services Deployed

All Phase 1 services deployed and operational:
- ✅ API Gateway
- ✅ Normalization Engine
- ✅ Financial Modeling Engine
- ✅ Agent Runtime
- ✅ Splunk Connector
- ✅ CrowdStrike Connector
- ✅ Azure AD Connector
- ✅ Nasco Connector
- ✅ Alerting Service

## Validation Results

### Health Checks
All services passed health checks.

### Isolation Tests
All isolation tests passed (0 leakage vectors detected).

## Next Steps

1. Verify DNS propagation for pilot.cyberrx.com
2. Test connector credentials with customer systems
3. Onboard pilot team users
4. Configure business process graph (T-PILOT-002)
5. Configure financial parameters (T-PILOT-003)

## Contact

For support, contact: platform-team@cyberrx.com

---

**Generated by:** T-PILOT-001 deployment script
**Task:** Pilot Customer Environment Setup
EOF

    log_info "Deployment report generated: $report_file"
}

# ============================================================================
# MAIN DEPLOYMENT FLOW
# ============================================================================

main() {
    log_info "Starting pilot customer deployment..."
    
    # Pre-deployment validation
    validate_prerequisites
    validate_environment_variables
    validate_azure_authentication
    
    # Infrastructure provisioning
    terraform_init
    terraform_plan
    terraform_apply
    terraform_outputs
    
    # Database setup
    apply_database_migrations
    
    # Service deployment
    build_and_push_images
    deploy_services_to_kubernetes
    
    # Configuration
    configure_connectors
    
    # Validation
    run_health_checks
    run_isolation_tests
    
    # Documentation
    generate_deployment_report
    
    log_info "Pilot customer deployment completed successfully!"
}

# ============================================================================
# SCRIPT ENTRY POINT
# ============================================================================

if [ "${BASH_SOURCE[0]}" = "$0" ]; then
    main "$@"
fi
