#!/bin/bash
# Nerion Deployment Script
# This script handles zero-downtime deployments to production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENVIRONMENT="${1:-staging}"
BRANCH="${2:-main}"

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if required tools are installed
    for tool in docker node terraform aws curl jq; do
        if ! command -v $tool &> /dev/null; then
            log_error "$tool is not installed. Please install it first."
            exit 1
        fi
    done
    
    # Check if we're in the right directory
    if [ ! -f "$PROJECT_ROOT/package.json" ]; then
        log_error "package.json not found. Please run this script from the project root."
        exit 1
    fi
    
    log_info "Prerequisites check passed."
}

run_tests() {
    log_info "Running tests..."
    
    cd "$PROJECT_ROOT/cyberrx-api"
    npm test
    
    cd "$PROJECT_ROOT/frontend"
    npm test
    
    log_info "All tests passed."
}

build_backend() {
    log_info "Building backend..."
    
    cd "$PROJECT_ROOT/cyberrx-api"
    npm ci --only=production
    npm run build
    
    log_info "Backend built successfully."
}

build_frontend() {
    log_info "Building frontend..."
    
    cd "$PROJECT_ROOT/frontend"
    npm ci
    npm run build
    
    log_info "Frontend built successfully."
}

deploy_to_terraform() {
    log_info "Deploying infrastructure with Terraform..."
    
    cd "$PROJECT_ROOT/terraform/environments/$ENVIRONMENT"
    
    # Initialize Terraform
    terraform init
    
    # Plan deployment
    terraform plan -out=tfplan
    
    # Apply deployment
    terraform apply tfplan
    
    log_info "Infrastructure deployed successfully."
}

deploy_to_vercel() {
    log_info "Deploying frontend to Vercel..."
    
    cd "$PROJECT_ROOT/frontend"
    
    # Build and deploy
    vercel --prod --token="$VERCEL_TOKEN"
    
    log_info "Frontend deployed to Vercel."
}

deploy_to_render() {
    log_info "Deploying backend to Render..."
    
    # Trigger Render deployment
    curl -X POST \
        "https://api.render.com/v1/services/$RENDER_SERVICE_ID/deploys" \
        -H "Authorization: Bearer $RENDER_API_KEY" \
        -H "Content-Type: application/json"
    
    log_info "Backend deployment triggered on Render."
}

run_health_checks() {
    log_info "Running health checks..."
    
    # Wait for deployment to be ready
    sleep 30
    
    # Check API health
    API_URL="https://api.cyberrx.com/health"
    if curl -f "$API_URL"; then
        log_info "API health check passed."
    else
        log_error "API health check failed."
        exit 1
    fi
    
    # Check frontend health
    FRONTEND_URL="https://app.cyberrx.com/health"
    if curl -f "$FRONTEND_URL"; then
        log_info "Frontend health check passed."
    else
        log_error "Frontend health check failed."
        exit 1
    fi
}

run_smoke_tests() {
    log_info "Running smoke tests..."
    
    cd "$PROJECT_ROOT/tests/e2e"
    npm ci
    npx playwright test --grep "@smoke" --project=chromium
    
    log_info "Smoke tests passed."
}

rollback() {
    log_warn "Rolling back deployment..."
    
    # Rollback Terraform
    cd "$PROJECT_ROOT/terraform/environments/$ENVIRONMENT"
    terraform rollback
    
    # Rollback Vercel
    cd "$PROJECT_ROOT/frontend"
    vercel rollback --token="$VERCEL_TOKEN"
    
    log_warn "Rollback completed."
}

# Main deployment flow
main() {
    log_info "Starting Nerion deployment to $ENVIRONMENT..."
    log_info "Branch: $BRANCH"
    
    # Check prerequisites
    check_prerequisites
    
    # Run tests
    run_tests
    
    # Build applications
    build_backend
    build_frontend
    
    # Deploy infrastructure (if not using managed services)
    if [ "$USE_TERRAFORM" = "true" ]; then
        deploy_to_terraform
    fi
    
    # Deploy to cloud platforms
    deploy_to_vercel
    deploy_to_render
    
    # Run health checks
    run_health_checks
    
    # Run smoke tests
    run_smoke_tests
    
    log_info "Deployment completed successfully!"
    log_info "Frontend: https://app.cyberrx.com"
    log_info "API: https://api.cyberrx.com"
}

# Trap errors and rollback
trap 'log_error "Deployment failed. Rolling back..."; rollback; exit 1' ERR

# Run main function
main
