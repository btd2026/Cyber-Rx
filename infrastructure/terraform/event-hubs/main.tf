# Event Hubs Main Configuration

terraform {
  required_version = ">= 1.5"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

# Event Hubs Namespace
resource "azurerm_eventhub_namespace" "main" {
  name                = var.namespace_name
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = var.sku
  capacity            = var.capacity

  # High Availability
  zone_redundant      = length(var.zones) > 1

  # Managed Identity
  identity {
    type = "SystemAssigned"
  }

  tags = var.tags
}

# Network Rules
resource "azurerm_eventhub_namespace_network_rule_set" "main" {
  namespace_name              = azurerm_eventhub_namespace.main.name
  resource_group_name         = var.resource_group_name
  default_action              = var.network_rulesets.default_action
  public_network_access_enabled = var.network_rulesets.public_network_access_enabled
  trusted_services_allowed    = var.network_rulesets.trusted_services_allowed

  dynamic "ip_rule" {
    for_each = var.allowed_ip_ranges
    content {
      ip_address = ip_rule.value
      action     = "Allow"
    }
  }

  depends_on = [azurerm_eventhub_namespace.main]
}

# Event Hubs
resource "azurerm_eventhub" "main" {
  for_each = var.event_hubs

  name                = each.key
  namespace_name      = azurerm_eventhub_namespace.main.name
  resource_group_name = var.resource_group_name
  partition_count     = each.value.partition_count
  message_retention   = each.value.message_retention

  # Capture configuration
  dynamic "capture" {
    for_each = each.value.capture_enabled ? [1] : []
    content {
      enabled             = true
      encoding            = "Avro"
      interval_in_seconds = var.capture_destination.capture_interval_seconds
      size_limit_in_bytes = var.capture_destination.capture_size_limit_bytes
      destination_name     = "${each.key}-capture"
      storage_account_name = var.capture_destination.storage_account_name
      container_name       = var.capture_destination.container_name
    }
  }
}

# Consumer Groups
resource "azurerm_eventhub_consumer_group" "main" {
  for_each = {
    for hub, groups in flatten([
      for hub_name, groups in var.consumer_groups : [
        for group in groups : {
          hub    = hub_name
          group  = group
        }
      ]
    ]) : "${hub.hub}-${hub.group}" => hub
  }

  name                = each.value.group
  namespace_name      = azurerm_eventhub_namespace.main.name
  eventhub_name       = each.value.hub
  resource_group_name = var.resource_group_name
}

# Private Endpoint (for secure access from AKS)
resource "azurerm_private_endpoint" "eventhub" {
  count               = var.network_rulesets.public_network_access_enabled ? 0 : 1
  name                = "${var.namespace_name}-pe"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.database_subnet_id  # Will be passed as variable

  private_service_connection {
    name                           = "${var.namespace_name}-psc"
    private_connection_resource_id = azurerm_eventhub_namespace.main.id
    is_manual_connection           = false
    subresource_names              = ["namespace"]
  }

  private_dns_zone_group {
    name = "default"
    private_dns_zone_ids = var.private_dns_zone_ids  # Will be passed as variable
  }

  tags = var.tags
}

# Authorization Rules - Service Access
resource "azurerm_eventhub_namespace_authorization_rule" "service" {
  name                = "service-access"
  namespace_name      = azurerm_eventhub_namespace.main.name
  resource_group_name = var.resource_group_name

  listen = true
  send   = true
  manage = false
}

# Authorization Rules - Management
resource "azurerm_eventhub_namespace_authorization_rule" "management" {
  name                = "management"
  namespace_name      = azurerm_eventhub_namespace.main.name
  resource_group_name = var.resource_group_name

  listen = true
  send   = true
  manage = true
}

# Role Assignment for Managed Identity (if provided)
resource "azurerm_role_assignment" "eventhub_data_sender" {
  count               = var.enable_managed_identity && var.identity_id != "" ? 1 : 0
  scope                = azurerm_eventhub_namespace.main.id
  role_definition_name = "Azure Event Hubs Data Sender"
  principal_id         = var.identity_id
}

resource "azurerm_role_assignment" "eventhub_data_receiver" {
  count               = var.enable_managed_identity && var.identity_id != "" ? 1 : 0
  scope                = azurerm_eventhub_namespace.main.id
  role_definition_name = "Azure Event Hubs Data Receiver"
  principal_id         = var.identity_id
}
