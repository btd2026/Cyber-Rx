# ============================================================================
# Tenant Infrastructure - Pilot Customer
# ============================================================================
# Task: T-PILOT-001 - Pilot Customer Environment Setup
# Description: Multi-tenant infrastructure with complete isolation
# Author: Senior Backend Engineer
# Date: 2025-06-06
# ============================================================================

terraform {
  required_version = ">= 1.5"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}

# ============================================================================
# DATA SOURCES - Reference existing infrastructure
# ============================================================================

data "azurerm_resource_group" "main" {
  name = var.resource_group_name
}

data "azurerm_kubernetes_cluster" "main" {
  name                = var.aks_cluster_name
  resource_group_name = var.resource_group_name
}

data "azurerm_log_analytics_workspace" "main" {
  name                = var.log_analytics_workspace_name
  resource_group_name = var.resource_group_name
}

# ============================================================================
# TENANT DATABASE - PostgreSQL with TimescaleDB and RLS
# ============================================================================

resource "azurerm_postgresql_flexible_server" "tenant" {
  name                = "cyberrx-${var.tenant_id}"
  location            = var.location
  resource_group_name = data.azurerm_resource_group.main.name

  version               = "15"
  administrator_login   = "cyberrx_admin"
  administrator_password = random_password.db_admin_password.result

  sku_name                   = "Standard_D4s_v3"
  storage_mb                 = 32768
  storage_autogrow           = true

  # High Availability
  high_availability {
    mode = "ZoneRedundant"
  }

  # Backup Configuration
  backup_retention_days      = 35
  geo_redundant_backup       = true

  # Network Configuration - Private Access Only
  public_network_access_enabled = false

  # SSL/TLS Configuration
  ssl_enforcement              = "Enabled"
  ssl_min_tls_version          = "TLS1_2"

  # Customer-Managed Encryption Keys (BYOK)
  customer_managed_key {
    key_vault_key_id                     = azurerm_key_vault_key.database_encryption.id
    key_vault_id                         = azurerm_key_vault.tenant.id
    principal_type                       = "ServicePrincipal"
    principal_name                       = "cyberrx-${var.tenant_id}-db"
    principal_id                         = azurerm_user_assigned_identity.tenant.principal_id
  }

  # Maintenance Window
  maintenance_window {
    day_of_week  = 0
    start_hour   = 2
    start_minute = 0
  }

  tags = var.tags
}

# Database admin password
resource "random_password" "db_admin_password" {
  length  = 32
  special = true
}

# Store password in Key Vault
resource "azurerm_key_vault_secret" "db_admin_password" {
  name         = "postgresql-admin-password"
  value        = random_password.db_admin_password.result
  key_vault_id = azurerm_key_vault.tenant.id
  content_type = "password"
}

# User Assigned Identity for Database
resource "azurerm_user_assigned_identity" "tenant" {
  name                = "cyberrx-${var.tenant_id}-identity"
  location            = var.location
  resource_group_name = data.azurerm_resource_group.main.name

  tags = var.tags
}

# Tenant database
resource "azurerm_postgresql_flexible_server_database" "main" {
  name      = "cyberrx_${replace(var.tenant_id, "-", "_")}"
  server_id = azurerm_postgresql_flexible_server.tenant.id
  charset   = "UTF8"
  collation = "en_US.UTF8"
}

# Private Endpoint for Database Access
resource "azurerm_private_endpoint" "database" {
  name                = "cyberrx-${var.tenant_id}-db-pe"
  location            = var.location
  resource_group_name = data.azurerm_resource_group.main.name
  subnet_id           = var.database_subnet_id

  private_service_connection {
    name                           = "cyberrx-${var.tenant_id}-db-psc"
    private_connection_resource_id = azurerm_postgresql_flexible_server.tenant.id
    is_manual_connection           = false
    subresource_names              = ["postgresqlServer"]
  }

  private_dns_zone_group {
    name = "default"
    private_dns_zone_ids = [var.private_dns_zone_id]
  }

  tags = var.tags
}

# PostgreSQL Configuration - Enable Extensions
resource "azurerm_postgresql_flexible_server_configuration" "extensions" {
  name       = "shared_preload_libraries"
  server_id  = azurerm_postgresql_flexible_server.tenant.id
  value      = "timescaledb,pgvector"
}

# Performance tuning configurations
resource "azurerm_postgresql_flexible_server_configuration" "shared_buffers" {
  name       = "shared_buffers"
  server_id  = azurerm_postgresql_flexible_server.tenant.id
  value      = "256MB"
}

resource "azurerm_postgresql_flexible_server_configuration" "timescaledb_max_background_workers" {
  name       = "timescaledb.max_background_workers"
  server_id  = azurerm_postgresql_flexible_server.tenant.id
  value      = "8"
}

# ============================================================================
# KEY VAULT - Customer-Managed Encryption Keys (BYOK)
# ============================================================================

resource "azurerm_key_vault" "tenant" {
  name                = "kv-${var.tenant_prefix}-${var.location}"
  location            = var.location
  resource_group_name = data.azurerm_resource_group.main.name
  tenant_id           = var.tenant_id

  sku_name = "standard"

  # Soft Delete and Purge Protection
  soft_delete_retention_days = 90
  purge_protection_enabled   = true

  # Enable access from trusted Azure services
  network_acls {
    default_action = "Deny"
    bypass        = ["AzureServices"]
    virtual_network_subnet_ids = [var.key_vault_subnet_id]
  }

  tags = var.tags
}

# Access Policy for Tenant Identity
resource "azurerm_key_vault_access_policy" "tenant" {
  key_vault_id = azurerm_key_vault.tenant.id

  tenant_id           = var.tenant_id
  object_id           = azurerm_user_assigned_identity.tenant.principal_id

  key_permissions = [
    "encrypt",
    "decrypt",
    "wrapKey",
    "unwrapKey",
    "get",
    "list",
    "create",
    "delete"
  ]

  secret_permissions = [
    "get",
    "list",
    "set",
    "delete"
  ]
}

# Access Policy for Platform Administrators
resource "azurerm_key_vault_access_policy" "platform_admin" {
  key_vault_id = azurerm_key_vault.tenant.id

  tenant_id           = var.platform_tenant_id
  object_id           = var.platform_admin_object_id

  key_permissions = [
    "get",
    "list",
    "delete",
    "recover"
  ]

  secret_permissions = [
    "get",
    "list",
    "set",
    "delete",
    "recover"
  ]
}

# Customer-managed encryption keys
resource "azurerm_key_vault_key" "database_encryption" {
  name         = "database-encryption-key"
  key_vault_id = azurerm_key_vault.tenant.id
  key_type     = "RSA"
  key_size     = 4096
  key_opts     = ["encrypt", "decrypt", "wrapKey", "unwrapKey"]

  rotation_policy {
    automatic {
      time_before_expiry = "P30D"
    }

    expire_after = "P365D"
  }
}

resource "azurerm_key_vault_key" "storage_encryption" {
  name         = "storage-encryption-key"
  key_vault_id = azurerm_key_vault.tenant.id
  key_type     = "RSA"
  key_size     = 4096
  key_opts     = ["encrypt", "decrypt", "wrapKey", "unwrapKey"]

  rotation_policy {
    automatic {
      time_before_expiry = "P30D"
    }

    expire_after = "P365D"
  }
}

resource "azurerm_key_vault_key" "eventhub_encryption" {
  name         = "eventhub-encryption-key"
  key_vault_id = azurerm_key_vault.tenant.id
  key_type     = "RSA"
  key_size     = 4096
  key_opts     = ["encrypt", "decrypt", "wrapKey", "unwrapKey"]

  rotation_policy {
    automatic {
      time_before_expiry = "P30D"
    }

    expire_after = "P365D"
  }
}

# Store connector credentials in Key Vault
resource "azurerm_key_vault_secret" "splunk_credentials" {
  name         = "splunk-credentials"
  value        = jsonencode(var.splunk_config)
  key_vault_id = azurerm_key_vault.tenant.id
  content_type = "credentials"
}

resource "azurerm_key_vault_secret" "crowdstrike_credentials" {
  name         = "crowdstrike-credentials"
  value        = jsonencode(var.crowdstrike_config)
  key_vault_id = azurerm_key_vault.tenant.id
  content_type = "credentials"
}

resource "azurerm_key_vault_secret" "azure_ad_credentials" {
  name         = "azure-ad-credentials"
  value        = jsonencode(var.azure_ad_config)
  key_vault_id = azurerm_key_vault.tenant.id
  content_type = "credentials"
}

resource "azurerm_key_vault_secret" "nasco_credentials" {
  name         = "nasco-credentials"
  value        = jsonencode(var.nasco_config)
  key_vault_id = azurerm_key_vault.tenant.id
  content_type = "credentials"
}

# Database connection string
resource "azurerm_key_vault_secret" "database_connection_string" {
  name         = "database-connection-string"
  value        = "postgresql://${azurerm_postgresql_flexible_server.tenant.administrator_login}:${random_password.db_admin_password.result}@${azurerm_postgresql_flexible_server.tenant.fqdn}/${azurerm_postgresql_flexible_server_database.main.name}?sslmode=require"
  key_vault_id = azurerm_key_vault.tenant.id
  content_type = "connection-string"
}

# ============================================================================
# EVENT HUB NAMESPACE - Tenant-isolated event streaming
# ============================================================================

resource "azurerm_eventhub_namespace" "tenant" {
  name                = "eh-${var.tenant_prefix}-${var.location}"
  location            = var.location
  resource_group_name = data.azurerm_resource_group.main.name

  sku                   = "Standard"
  capacity              = 1

  # Customer-managed encryption key
  infrastructure_encryption_enabled = true

  identity {
    type = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.tenant.id]
  }

  encryption {
    key_source = "Microsoft.KeyVault"
    key_vault_properties {
      key_name = azurerm_key_vault_key.eventhub_encryption.name
      key_vault_uri = azurerm_key_vault.tenant.vault_uri
    }
  }

  # Auto-inflate settings
  maximum_throughput_units = 20

  tags = var.tags
}

# Event Hub for risk events
resource "azurerm_eventhub" "risk_events" {
  name                = "risk-events"
  namespace_id        = azurerm_eventhub_namespace.tenant.id
  message_retention   = 7
  partition_count     = 4

  capture_description {
    enabled  = true
    encoding = "Avro"

    skip_empty_archives = true

    destination {
      name                = "eventhub-capture"
      archive_name_format = "Namespace/{Namespace}/EventHub/{EventHub}/Year{Year}/Month{Month}/Day{Day}/Hour{Hour}/Minute{Minute}"
      blob_container_name = azurerm_storage_container.logs.name
      storage_account_id  = azurerm_storage_account.tenant.id
    }

    interval_in_seconds = 300
    size_limit_in_bytes  = 1073741824
  }
}

# Event Hub for audit events
resource "azurerm_eventhub" "audit_events" {
  name                = "audit-events"
  namespace_id        = azurerm_eventhub_namespace.tenant.id
  message_retention   = 30
  partition_count     = 2
}

# Event Hub for connector events
resource "azurerm_eventhub" "connector_events" {
  name                = "connector-events"
  namespace_id        = azurerm_eventhub_namespace.tenant.id
  message_retention   = 7
  partition_count     = 4
}

# Consumer groups
resource "azurerm_eventhub_consumer_group" "agent_runtime" {
  name                = "agent-runtime"
  namespace_id        = azurerm_eventhub_namespace.tenant.id
  eventhub_name       = azurerm_eventhub.risk_events.name
  user_metadata       = "Consumer group for agent runtime"
}

resource "azurerm_eventhub_consumer_group" "normalization_engine" {
  name                = "normalization-engine"
  namespace_id        = azurerm_eventhub_namespace.tenant.id
  eventhub_name       = azurerm_eventhub.risk_events.name
  user_metadata       = "Consumer group for normalization engine"
}

resource "azurerm_eventhub_consumer_group" "alerting" {
  name                = "alerting"
  namespace_id        = azurerm_eventhub_namespace.tenant.id
  eventhub_name       = azurerm_eventhub.risk_events.name
  user_metadata       = "Consumer group for alerting service"
}

# ============================================================================
# STORAGE ACCOUNT - Tenant-specific blob storage
# ============================================================================

resource "azurerm_storage_account" "tenant" {
  name                = "st${var.tenant_prefix}${var.location}"
  location            = var.location
  resource_group_name = data.azurerm_resource_group.main.name

  account_kind                   = "StorageV2"
  account_tier                   = "Standard"
  account_replication_type       = "GRS"
  access_tier                    = "Hot"

  # Require HTTPS only
  https_only                     = true
  minimum_tls_version            = "TLS1_2"

  # Disable public blob access
  allow_blob_public_access       = false

  # Customer-managed encryption key
  identity {
    type = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.tenant.id]
  }

  encryption {
    source = "Microsoft.Keyvault"
    key_vault_key_id = azurerm_key_vault_key.storage_encryption.id

    identity {
      type = "UserAssigned"
      identity_id = azurerm_user_assigned_identity.tenant.id
    }
  }

  # Blob storage properties
  blob_properties {
    versioning_enabled       = true
    change_feed_enabled      = true
    default_service_version  = "2022-09-01"

    # Delete retention policy
    delete_retention_policy {
      days = 90
    }

    # Container delete retention policy
    container_delete_retention_policy {
      days = 90
    }
  }

  # Lifecycle management
  lifecycle_rule {
    name    = "delete-old-logs"
    enabled = true

    filter {
      prefix = "logs/"
    }

    actions {
      delete {
        days_after_modification = 90
      }
    }
  }

  tags = var.tags
}

# Storage containers
resource "azurerm_storage_container" "exports" {
  name                  = "exports"
  storage_account_name   = azurerm_storage_account.tenant.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "logs" {
  name                  = "logs"
  storage_account_name   = azurerm_storage_account.tenant.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "reports" {
  name                  = "reports"
  storage_account_name   = azurerm_storage_account.tenant.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "evidence" {
  name                  = "evidence"
  storage_account_name   = azurerm_storage_account.tenant.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "backups" {
  name                  = "backups"
  storage_account_name   = azurerm_storage_account.tenant.name
  container_access_type = "private"
}

# Private endpoint for storage
resource "azurerm_private_endpoint" "storage" {
  name                = "cyberrx-${var.tenant_id}-storage-pe"
  location            = var.location
  resource_group_name = data.azurerm_resource_group.main.name
  subnet_id           = var.storage_subnet_id

  private_service_connection {
    name                           = "cyberrx-${var.tenant_id}-storage-psc"
    private_connection_resource_id = azurerm_storage_account.tenant.id
    is_manual_connection           = false
    subresource_names              = ["blob"]
  }

  private_dns_zone_group {
    name = "default"
    private_dns_zone_ids = [var.storage_private_dns_zone_id]
  }

  tags = var.tags
}

# ============================================================================
# APPLICATION INSIGHTS - Per-tenant monitoring
# ============================================================================

resource "azurerm_application_insights" "tenant" {
  name                = "ai-${var.tenant_prefix}-${var.location}"
  location            = var.location
  resource_group_name = data.azurerm_resource_group.main.name

  application_type    = "web"
  workspace_id        = data.azurerm_log_analytics_workspace.main.id

  # Sampling configuration
  sampling_percentage = 100

  # Disable IP masking
  disable_ip_masking = false

  tags = var.tags
}

# ============================================================================
# KUBERNETES NAMESPACE - Tenant-isolated workload
# ============================================================================

resource "kubernetes_namespace" "tenant" {
  metadata {
    name = "tenant-${var.tenant_id}"
    labels = {
      tenant = var.tenant_id
      name   = "tenant-${var.tenant_id}"
    }
    annotations = {
      "cyberrx.com/customer-id" = var.customer_id
      "cyberrx.com/tier"        = var.tier
    }
  }
}

# Network Policy - Deny cross-tenant communication
resource "kubernetes_network_policy" "deny_cross_tenant" {
  metadata {
    name      = "deny-cross-tenant"
    namespace = kubernetes_namespace.tenant.metadata[0].name
  }

  spec {
    pod_selector {}

    policy_types = ["Ingress", "Egress"]

    # Egress: Allow only within same tenant and to cluster DNS
    egress {
      to {
        namespace_selector {
          match_labels = {
            tenant = var.tenant_id
          }
        }
      }

      to {
        namespace_selector {}
        pod_selector {
          match_labels = {
            "k8s-app" = "kube-dns"
          }
        }
      }
    }

    # Ingress: Allow only within same tenant
    ingress {
      from {
        namespace_selector {
          match_labels = {
            tenant = var.tenant_id
          }
        }
      }
    }
  }
}

# Resource Quota - Limit tenant resource usage
resource "kubernetes_resource_quota" "tenant" {
  metadata {
    name      = "tenant-quota"
    namespace = kubernetes_namespace.tenant.metadata[0].name
  }

  spec {
    hard = {
      "requests.cpu"    = "10"
      "requests.memory" = "20Gi"
      "limits.cpu"      = "20"
      "limits.memory"   = "40Gi"
      "pods"           = "50"
    }
  }
}

# Limit Range - Set default resource limits
resource "kubernetes_limit_range" "tenant" {
  metadata {
    name      = "tenant-limits"
    namespace = kubernetes_namespace.tenant.metadata[0].name
  }

  spec {
    limits {
      type = "Container"

      default = {
        cpu    = "500m"
        memory = "512Mi"
      }

      default_request = {
        cpu    = "100m"
        memory = "128Mi"
      }

      max = {
        cpu    = "4"
        memory = "8Gi"
      }
    }
  }
}

# ============================================================================
# OUTPUTS
# ============================================================================

output "tenant_id" {
  value = var.tenant_id
}

output "database_fqdn" {
  value = azurerm_postgresql_flexible_server.tenant.fqdn
}

output "database_name" {
  value = azurerm_postgresql_flexible_server_database.main.name
}

output "key_vault_uri" {
  value = azurerm_key_vault.tenant.vault_uri
}

output "eventhub_namespace_name" {
  value = azurerm_eventhub_namespace.tenant.name
}

output "storage_account_name" {
  value = azurerm_storage_account.tenant.name
}

output "application_insights_instrumentation_key" {
  value     = azurerm_application_insights.tenant.instrumentation_key
  sensitive = true
}

output "kubernetes_namespace" {
  value = kubernetes_namespace.tenant.metadata[0].name
}
