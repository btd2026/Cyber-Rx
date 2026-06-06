# Variables for Key Vault Module

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "location" {
  description = "Azure region for Key Vault"
  type        = string
  default     = "eastus2"
}

variable "key_vault_name" {
  description = "Name of the Key Vault"
  type        = string
}

variable "sku_name" {
  description = "SKU name for Key Vault"
  type        = string
  default     = "standard"

  validation {
    condition     = contains(["standard", "premium"], var.sku_name)
    error_message = "SKU must be standard or premium."
  }
}

variable "enabled_for_deployment" {
  description = "Enable Key Vault for deployment"
  type        = bool
  default     = false
}

variable "enabled_for_disk_encryption" {
  description = "Enable Key Vault for disk encryption"
  type        = bool
  default     = false
}

variable "enabled_for_template_deployment" {
  description = "Enable Key Vault for template deployment"
  type        = bool
  default     = true
}

variable "enable_rbac_authorization" {
  description = "Enable RBAC authorization"
  type        = bool
  default     = true
}

variable "soft_delete_retention_days" {
  description = "Soft delete retention days"
  type        = number
  default     = 90

  validation {
    condition     = var.soft_delete_retention_days >= 7 && var.soft_delete_retention_days <= 90
    error_message = "Soft delete retention must be between 7 and 90 days."
  }
}

variable "purge_protection_enabled" {
  description = "Enable purge protection"
  type        = bool
  default     = true
}

variable "bypass_tunnel_services_for_bypass" {
  description = "Bypass tunnel services"
  type        = string
  default     = "AzureServices"
}

variable "default_action" {
  description = "Default action for network rules"
  type        = string
  default     = "Deny"
}

variable "public_network_access_enabled" {
  description = "Enable public network access"
  type        = bool
  default     = false
}

variable "allowed_ip_ranges" {
  description = "Allowed IP ranges for Key Vault access"
  type        = list(string)
  default     = []
}

variable "virtual_network_subnet_ids" {
  description = "Virtual network subnet IDs allowed to access Key Vault"
  type        = list(string)
  default     = []
}

variable "customer_managed_keys" {
  description = "Customer-managed encryption keys"
  type = map(object({
    key_type     = string
    key_size     = number
    key_ops      = list(string)
    not_before_date = string
    expiration_date  = string
  }))
  default = {
    data_encryption_key = {
      key_type         = "RSA"
      key_size         = 4096
      key_ops          = ["encrypt", "decrypt", "sign", "verify", "wrapKey", "unwrapKey"]
      not_before_date  = ""
      expiration_date  = ""
    }
    disk_encryption_key = {
      key_type         = "RSA"
      key_size         = 4096
      key_ops          = ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
      not_before_date  = ""
      expiration_date  = ""
    }
  }
}

variable "secrets" {
  description = "Secrets to create in Key Vault"
  type = map(object({
    value           = string
    content_type    = string
    expiration_date = string
  }))
  default     = {}
  sensitive   = true
}

variable "access_policies" {
  description = "Access policies for Key Vault (if not using RBAC)"
  type = list(object({
    tenant_id                    = string
    object_id                    = string
    certificate_permissions      = list(string)
    key_permissions              = list(string)
    secret_permissions           = list(string)
    storage_permissions          = list(string)
  }))
  default = []
}

variable "rbac_role_assignments" {
  description = "RBAC role assignments for Key Vault"
  type = map(object({
    principal_id   = string
    role_definition_name = string
  }))
  default = {
    aks_identity = {
      principal_id          = ""  # To be provided
      role_definition_name  = "Key Vault Secrets Officer"
    }
    db_identity = {
      principal_id          = ""  # To be provided
      role_definition_name  = "Key Vault Secrets User"
    }
  }
}

variable "subnet_id" {
  description = "Subnet ID for private endpoint"
  type        = string
  default     = ""
}

variable "private_dns_zone_ids" {
  description = "Private DNS zone IDs for private endpoint"
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Tags to apply to Key Vault resources"
  type        = map(string)
  default     = {}
}

variable "log_analytics_workspace_id" {
  description = "ID of Log Analytics workspace for diagnostics"
  type        = string
  default     = ""
}
