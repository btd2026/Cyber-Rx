# Outputs for Event Hubs Module

output "namespace_name" {
  description = "Name of the Event Hubs namespace"
  value       = azurerm_eventhub_namespace.main.name
}

output "namespace_id" {
  description = "ID of the Event Hubs namespace"
  value       = azurerm_eventhub_namespace.main.id
}

output "namespace_identity_id" {
  description = "Managed identity ID of the namespace"
  value       = azurerm_eventhub_namespace.main.identity[0].principal_id
}

output "event_hub_names" {
  description = "List of event hub names"
  value       = [for hub in azurerm_eventhub.main : hub.name]
}

output "event_hubs" {
  description = "Map of event hub names and IDs"
  value = {
    for hub in azurerm_eventhub.main : hub.name => {
      id                     = hub.id
      name                   = hub.name
      partition_count        = hub.partition_count
      message_retention      = hub.message_retention
      capture_enabled        = hub.capture_enabled
    }
  }
}

output "consumer_groups" {
  description = "Map of consumer groups by event hub"
  value = {
    for hub in var.consumer_groups : hub => {
      groups = var.consumer_groups[hub]
    }
  }
}

output "connection_strings" {
  description = "Connection strings for different access levels"
  sensitive   = true
  value = {
    service_listen = azurerm_eventhub_namespace_authorization_rule.service.primary_connection_string
    service_send   = azurerm_eventhub_namespace_authorization_rule.service.primary_connection_string
    management     = azurerm_eventhub_namespace_authorization_rule.management.primary_connection_string
  }
}

output "primary_key" {
  description = "Primary access key for management"
  sensitive   = true
  value       = azurerm_eventhub_namespace_authorization_rule.management.primary_key
}

output "primary_connection_string" {
  description = "Primary connection string for management"
  sensitive   = true
  value       = azurerm_eventhub_namespace_authorization_rule.management.primary_connection_string
}

output "endpoint" {
  description = "Event Hubs endpoint URL"
  value       = azurerm_eventhub_namespace.main.hostname
}

output "sku" {
  description = "SKU of the Event Hubs namespace"
  value       = var.sku
}

output "capacity" {
  description = "Capacity (throughput units) of the namespace"
  value       = var.capacity
}

output "estimated_throughput_per_second" {
  description = "Estimated events per second based on SKU and capacity"
  value       = var.sku == "Basic" ? var.capacity * 1000 : var.sku == "Standard" ? var.capacity * 2500 : var.capacity * 10000
}

output "private_endpoint_id" {
  description = "ID of the private endpoint (if created)"
  value       = try(azurerm_private_endpoint.eventhub[0].id, null)
}

output "private_endpoint_ip" {
  description = "Private IP address of the private endpoint (if created)"
  value       = try(azurerm_private_endpoint.eventhub[0].private_service_connection[0].private_ip_address, null)
}
