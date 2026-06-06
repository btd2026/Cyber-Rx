# Outputs for Key Vault Module

output "key_vault_name" {
  description = "Name of the Key Vault"
  value       = azurerm_key_vault.main.name
}

output "key_vault_id" {
  description = "ID of the Key Vault"
  value       = azurerm_key_vault.main.id
}

output "key_vault_uri" {
  description = "URI of the Key Vault"
  value       = azurerm_key_vault.main.vault_uri
}

output "key_vault_location" {
  description = "Location of the Key Vault"
  value       = azurerm_key_vault.main.location
}

output "tenant_id" {
  description = "Tenant ID of the Key Vault"
  value       = azurerm_key_vault.main.tenant_id
}

output "sku_name" {
  description = "SKU of the Key Vault"
  value       = var.sku_name
}

output "soft_delete_retention_days" {
  description = "Soft delete retention in days"
  value       = var.soft_delete_retention_days
}

output "purge_protection_enabled" {
  description = "Whether purge protection is enabled"
  value       = var.purge_protection_enabled
}

output "public_network_access_enabled" {
  description = "Whether public network access is enabled"
  value       = var.public_network_access_enabled
}

output "enable_rbac_authorization" {
  description = "Whether RBAC authorization is enabled"
  value       = var.enable_rbac_authorization
}

output "private_endpoint_id" {
  description = "ID of the private endpoint (if created)"
  value       = try(azurerm_private_endpoint.key_vault[0].id, null)
}

output "private_endpoint_ip" {
  description = "Private IP address of the private endpoint"
  value       = try(azurerm_private_endpoint.key_vault[0].private_service_connection[0].private_ip_address, null)
}

output "customer_managed_keys" {
  description = "Map of customer-managed keys"
  value = {
    for key in azurerm_key_vault_key.main : key.name => {
      id          = key.id
      name        = key.name
      key_type    = key.key_type
      key_size    = key.key_size
      key_version = key.key_version
      uri         = key.uri
    }
  }

  sensitive = true
}

output "customer_managed_key_ids" {
  description = "List of customer-managed key IDs"
  value       = [for key in azurerm_key_vault_key.main : key.id]
}

output "customer_managed_key_uris" {
  description = "List of customer-managed key URIs"
  value       = [for key in azurerm_key_vault_key.main : key.uri]
  sensitive   = true
}

output "data_encryption_key_id" {
  description = "ID of the data encryption key (if created)"
  value       = try(azurerm_key_vault_key.main["data_encryption_key"].id, null)
}

output "data_encryption_key_uri" {
  description = "URI of the data encryption key (if created)"
  value       = try(azurerm_key_vault_key.main["data_encryption_key"].uri, null)
  sensitive   = true
}

output "disk_encryption_key_id" {
  description = "ID of the disk encryption key (if created)"
  value       = try(azurerm_key_vault_key.main["disk_encryption_key"].id, null)
}

output "disk_encryption_key_uri" {
  description = "URI of the disk encryption key (if created)"
  value       = try(azurerm_key_vault_key.main["disk_encryption_key"].uri, null)
  sensitive   = true
}

output "secret_names" {
  description = "List of secret names"
  value       = [for secret in azurerm_key_vault_secret.main : secret.name]
}

output "rbac_role_assignments" {
  description = "RBAC role assignments"
  value = {
    for assignment in azurerm_role_assignment.key_vault : assignment.role_definition_name => {
      principal_id   = assignment.principal_id
      role_id        = assignment.role_definition_id
    }
  }
}
