# Database Main Configuration - PostgreSQL with TimescaleDB and pgvector

terraform {
  required_version = ">= 1.5"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

# PostgreSQL Flexible Server
resource "azurerm_postgresql_flexible_server" "main" {
  name                = var.server_name
  location            = var.location
  resource_group_name = var.resource_group_name

  version               = var.version
  administrator_login   = var.administrator_login
  administrator_password = data.azurerm_key_vault_secret.admin_password.value

  sku_name                   = var.sku_name
  storage_mb                 = var.storage_mb
  storage_autogrow           = var.storage_autogrow

  # High Availability
  high_availability {
    mode                      = var.high_availability ? "ZoneRedundant" : "Disabled"
  }

  # Backup Configuration
  backup_retention_days      = var.backup_retention_days
  geo_redundant_backup       = var.geo_redundant_backup

  # Network Configuration
  public_network_access_enabled = var.public_network_access_enabled

  # SSL/TLS Configuration
  ssl_enforcement              = var.ssl_enforcement
  ssl_min_tls_version          = var.ssl_min_tls_version

  # Authentication
  identity {
    type = "UserAssigned"
    identity_ids = var.identity_id != "" ? [var.identity_id] : []
  }

  # Azure AD Admin
  dynamic "azure_active_directory_admin" {
    for_each = var.azure_ad_admin_login != "" && var.azure_ad_admin_object_id != "" ? [1] : []
    content {
      login_username = var.azure_ad_admin_login
      object_id      = var.azure_ad_admin_object_id
      tenant_id      = data.azurerm_client_config.current.tenant_id
    }
  }

  # BYOK Encryption
  dynamic "customer_managed_key" {
    for_each = var.customer_managed_key_id != "" && var.key_vault_id != "" ? [1] : []
    content {
      key_vault_key_id                     = var.customer_managed_key_id
      key_vault_id                         = var.key_vault_id
      principal_type                       = "ServicePrincipal"
      principal_name                       = var.server_name
      principal_id                         = azurerm_user_assigned_identity.db.principal_id
    }
  }

  # Maintenance Window
  maintenance_window {
    day_of_week  = 0  # Sunday
    start_hour   = 2
    start_minute = 0
  }

  tags = var.tags
}

# User Assigned Identity for Database
resource "azurerm_user_assigned_identity" "db" {
  name                = "${var.server_name}-identity"
  location            = var.location
  resource_group_name = var.resource_group_name

  tags = var.tags
}

# Get admin password from Key Vault
data "azurerm_key_vault_secret" "admin_password" {
  name         = "postgresql-admin-password"
  key_vault_id = var.key_vault_id
}

data "azurerm_client_config" "current" {}

# Databases (one per customer)
resource "azurerm_postgresql_flexible_server_database" "main" {
  for_each = var.databases

  name                = each.key
  server_id           = azurerm_postgresql_flexible_server.main.id
  charset             = each.value.charset
  collation           = each.value.collation
}

# Private Endpoint for Database Access
resource "azurerm_private_endpoint" "database" {
  count               = var.public_network_access_enabled ? 0 : 1
  name                = "${var.server_name}-pe"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_id

  private_service_connection {
    name                           = "${var.server_name}-psc"
    private_connection_resource_id = azurerm_postgresql_flexible_server.main.id
    is_manual_connection           = false
    subresource_names              = ["postgresqlServer"]
  }

  private_dns_zone_group {
    name = "default"
    private_dns_zone_ids = var.private_dns_zone_ids
  }

  tags = var.tags
}

# Firewall Rules (if public access enabled)
resource "azurerm_postgresql_flexible_server_firewall_rule" "main" {
  for_each = var.public_network_access_enabled ? var.firewall_rules : {}

  name             = each.key
  server_id         = azurerm_postgresql_flexible_server.main.id
  start_ip_address  = each.value.start_ip
  end_ip_address    = each.value.end_ip
}

# Virtual Network Rule (if using subnet)
resource "azurerm_postgresql_flexible_server_virtual_network_rule" "main" {
  count               = !var.public_network_access_enabled && var.subnet_id != "" ? 1 : 0
  server_id           = azurerm_postgresql_flexible_server.main.id
  subnet_id           = var.subnet_id
}

# PostgreSQL Configuration - Enable Extensions
resource "azurerm_postgresql_flexible_server_configuration" "extensions" {
  for_each = toset(var.extensions)

  name  = "shared_preload_libraries"
  server_id = azurerm_postgresql_flexible_server.main.id
  value = join(",", var.extensions)
}

# PostgreSQL Configuration - Performance Tuning
resource "azurerm_postgresql_flexible_server_configuration" "shared_buffers" {
  name       = "shared_buffers"
  server_id  = azurerm_postgresql_flexible_server.main.id
  value      = "256MB"  # Adjust based on SKU
}

resource "azurerm_postgresql_flexible_server_configuration" "effective_cache_size" {
  name       = "effective_cache_size"
  server_id  = azurerm_postgresql_flexible_server.main.id
  value      = "1GB"  # Adjust based on SKU
}

resource "azurerm_postgresql_flexible_server_configuration" "maintenance_work_mem" {
  name       = "maintenance_work_mem"
  server_id  = azurerm_postgresql_flexible_server.main.id
  value      = "128MB"
}

resource "azurerm_postgresql_flexible_server_configuration" "checkpoint_completion_target" {
  name       = "checkpoint_completion_target"
  server_id  = azurerm_postgresql_flexible_server.main.id
  value      = "0.9"
}

resource "azurerm_postgresql_flexible_server_configuration" "wal_buffers" {
  name       = "wal_buffers"
  server_id  = azurerm_postgresql_flexible_server.main.id
  value      = "16MB"
}

# PostgreSQL Configuration - TimescaleDB Tuning
resource "azurerm_postgresql_flexible_server_configuration" "timescaledb_max_background_workers" {
  name       = "timescaledb.max_background_workers"
  server_id  = azurerm_postgresql_flexible_server.main.id
  value      = "8"
}

# PostgreSQL Configuration - pgvector Tuning
resource "azurerm_postgresql_flexible_server_configuration" "ivfflat_probes" {
  name       = "ivfflat.probes"
  server_id  = azurerm_postgresql_flexible_server.main.id
  value      = "20"
}

# Diagnostic Settings
resource "azurerm_monitor_diagnostic_setting" "database" {
  name                       = "${var.server_name}-diagnostics"
  target_resource_id         = azurerm_postgresql_flexible_server.main.id
  log_analytics_workspace_id = var.log_analytics_workspace_id

  log {
    category = "PostgreSQLLogs"
    enabled  = true
  }

  metric {
    category = "AllMetrics"
    enabled  = true
  }
}
