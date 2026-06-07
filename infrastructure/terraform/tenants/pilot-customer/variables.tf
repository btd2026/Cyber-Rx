# ============================================================================
# Tenant Infrastructure - Variables
# ============================================================================

variable "tenant_id" {
  description = "Unique tenant identifier (UUID)"
  type        = string
}

variable "customer_id" {
  description = "Customer identifier (e.g., 'pilot-customer')"
  type        = string
}

variable "tenant_prefix" {
  description = "Prefix for resource names (tenant_id without hyphens)"
  type        = string
}

variable "location" {
  description = "Azure region for deployment"
  type        = string
  default     = "eastus"
}

variable "tier" {
  description = "Tenant tier (pilot, standard, premium)"
  type        = string
  default     = "pilot"
}

variable "resource_group_name" {
  description = "Existing resource group name"
  type        = string
}

variable "aks_cluster_name" {
  description = "Existing AKS cluster name"
  type        = string
}

variable "log_analytics_workspace_name" {
  description = "Existing Log Analytics Workspace name"
  type        = string
}

variable "platform_tenant_id" {
  description = "Platform Azure AD tenant ID"
  type        = string
}

variable "platform_admin_object_id" {
  description = "Platform administrator object ID for Key Vault access"
  type        = string
}

variable "database_subnet_id" {
  description = "Subnet ID for database private endpoint"
  type        = string
}

variable "storage_subnet_id" {
  description = "Subnet ID for storage private endpoint"
  type        = string
}

variable "key_vault_subnet_id" {
  description = "Subnet ID for Key Vault private endpoint"
  type        = string
}

variable "private_dns_zone_id" {
  description = "Private DNS zone ID for database"
  type        = string
}

variable "storage_private_dns_zone_id" {
  description = "Private DNS zone ID for storage"
  type        = string
}

variable "tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default     = {
    platform  = "cyberrx"
    managed_by = "terraform"
  }
}

# ============================================================================
# CONNECTOR CONFIGURATIONS
# ============================================================================

variable "splunk_config" {
  description = "Splunk connector configuration"
  type        = map(string)
  sensitive   = true
  default     = {}
}

variable "crowdstrike_config" {
  description = "CrowdStrike connector configuration"
  type        = map(string)
  sensitive   = true
  default     = {}
}

variable "azure_ad_config" {
  description = "Azure AD connector configuration"
  type        = map(string)
  sensitive   = true
  default     = {}
}

variable "nasco_config" {
  description = "Nasco connector configuration"
  type        = map(string)
  sensitive   = true
  default     = {}
}
