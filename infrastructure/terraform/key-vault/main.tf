# Key Vault Main Configuration with BYOK Support

terraform {
  required_version = ">= 1.5"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

# Key Vault
resource "azurerm_key_vault" "main" {
  name                = var.key_vault_name
  location            = var.location
  resource_group_name = var.resource_group_name

  sku_name                   = var.sku_name

  # Soft Delete & Purge Protection
  soft_delete_retention_days = var.soft_delete_retention_days
  purge_protection_enabled   = var.purge_protection_enabled

  # Deployment Features
  enabled_for_deployment     = var.enabled_for_deployment
  enabled_for_disk_encryption = var.enabled_for_disk_encryption
  enabled_for_template_deployment = var.enabled_for_template_deployment

  # Authorization
  enable_rbac_authorization  = var.enable_rbac_authorization

  # Network Access
  public_network_access_enabled = var.public_network_access_enabled

  network_acls {
    bypass                    = var.bypass_tunnel_services_for_bypass
    default_action             = var.default_action

    dynamic "ip_rule" {
      for_each = var.allowed_ip_ranges
      content {
        ip_address = ip_rule.value
        action     = "Allow"
      }
    }

    dynamic "virtual_network_subnet_id" {
      for_each = var.virtual_network_subnet_ids
      content {
        id = virtual_network_subnet_id.value
      }
    }
  }

  # Tenant ID
  tenant_id = data.azurerm_client_config.current.tenant_id

  tags = var.tags
}

data "azurerm_client_config" "current" {}

# Access Policies (if not using RBAC)
resource "azurerm_key_vault_access_policy" "main" {
  for_each = var.enable_rbac_authorization ? [] : var.access_policies

  key_vault_id = azurerm_key_vault.main.id

  tenant_id                    = each.value.tenant_id
  object_id                    = each.value.object_id

  certificate_permissions      = each.value.certificate_permissions
  key_permissions              = each.value.key_permissions
  secret_permissions           = each.value.secret_permissions
  storage_permissions          = each.value.storage_permissions
}

# Customer-Managed Keys
resource "azurerm_key_vault_key" "main" {
  for_each = var.customer_managed_keys

  name            = each.key
  key_vault_id    = azurerm_key_vault.main.id

  key_type        = each.value.key_type
  key_size        = each.value.key_size

  key_ops         = each.value.key_ops

  dynamic "rotation" {
    for_each = each.value.expiration_date != "" ? [1] : []
    content {
      auto         = false
      expire_after = each.value.expiration_date
    }
  }

  not_before_date = each.value.not_before_date != "" ? each.value.not_before_date : null

  depends_on = [azurerm_key_vault.main]
}

# Secrets
resource "azurerm_key_vault_secret" "main" {
  for_each = var.secrets

  name            = each.key
  key_vault_id    = azurerm_key_vault.main.id

  value           = each.value.value
  content_type     = each.value.content_type

  expiration_date  = each.value.expiration_date != "" ? each.value.expiration_date : null

  depends_on = [azurerm_key_vault.main]
}

# Private Endpoint
resource "azurerm_private_endpoint" "key_vault" {
  count               = var.public_network_access_enabled ? 0 : 1
  name                = "${var.key_vault_name}-pe"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_id

  private_service_connection {
    name                           = "${var.key_vault_name}-psc"
    private_connection_resource_id = azurerm_key_vault.main.id
    is_manual_connection           = false
    subresource_names              = ["vault"]
  }

  private_dns_zone_group {
    name = "default"
    private_dns_zone_ids = var.private_dns_zone_ids
  }

  tags = var.tags
}

# RBAC Role Assignments
resource "azurerm_role_assignment" "key_vault" {
  for_each = var.enable_rbac_authorization ? var.rbac_role_assignments : {}

  scope              = azurerm_key_vault.main.id
  role_definition_name = each.value.role_definition_name
  principal_id        = each.value.principal_id
}

# Diagnostic Settings
resource "azurerm_monitor_diagnostic_setting" "key_vault" {
  count                   = var.log_analytics_workspace_id != "" ? 1 : 0
  name                    = "${var.key_vault_name}-diagnostics"
  target_resource_id      = azurerm_key_vault.main.id
  log_analytics_workspace_id = var.log_analytics_workspace_id

  log {
    category = "AuditEvent"
    enabled  = true
  }

  metric {
    category = "AllMetrics"
    enabled  = true
  }
}
