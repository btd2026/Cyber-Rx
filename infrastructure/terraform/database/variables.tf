# Variables for Database Module

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "location" {
  description = "Azure region for database"
  type        = string
  default     = "eastus2"
}

variable "server_name" {
  description = "Name of the PostgreSQL server"
  type        = string
}

variable "administrator_login" {
  description = "Admin username for PostgreSQL server"
  type        = string
  default     = "cyberrxadmin"
}

variable "databases" {
  description = "Databases to create (one per customer)"
  type = map(object({
    charset     = string
    collation   = string
    sku_name    = string
    storage_mb  = number
    auto_grow   = bool
  }))
  default = {
    cyberrx_platform = {
      charset    = "UTF8"
      collation  = "en_US.UTF8"
      sku_name   = "Standard_B1ms"
      storage_mb = 10240
      auto_grow  = true
    }
  }
}

variable "sku_name" {
  description = "SKU name for the PostgreSQL server"
  type        = string
  default     = "Standard_D4s_v3"
}

variable "storage_mb" {
  description = "Storage size in MB"
  type        = number
  default     = 327680  # 320 GB
}

variable "storage_autogrow" {
  description = "Enable storage auto-grow"
  type        = string
  default     = "Enabled"

  validation {
    condition     = contains(["Enabled", "Disabled"], var.storage_autogrow)
    error_message = "storage_autogrow must be Enabled or Disabled."
  }
}

variable "version" {
  description = "PostgreSQL version"
  type        = string
  default     = "16"

  validation {
    condition     = contains(["11", "12", "13", "14", "15", "16"], var.version)
    error_message = "PostgreSQL version must be 11, 12, 13, 14, 15, or 16."
  }
}

variable "high_availability" {
  description = "Enable high availability (zone-redundant HA)"
  type        = bool
  default     = true
}

variable "backup_retention_days" {
  description = "Backup retention in days"
  type        = number
  default     = 35

  validation {
    condition     = var.backup_retention_days >= 7 && var.backup_retention_days <= 35
    error_message = "Backup retention must be between 7 and 35 days."
  }
}

variable "geo_redundant_backup" {
  description = "Enable geo-redundant backups"
  type        = bool
  default     = true
}

variable "public_network_access_enabled" {
  description = "Enable public network access"
  type        = bool
  default     = false
}

variable "ssl_enforcement" {
  description = "SSL enforcement"
  type        = string
  default     = "Enabled"

  validation {
    condition     = contains(["Enabled", "Disabled"], var.ssl_enforcement)
    error_message = "ssl_enforcement must be Enabled or Disabled."
  }
}

variable "ssl_min_tls_version" {
  description = "Minimum TLS version"
  type        = string
  default     = "TLS1_2"

  validation {
    condition     = contains(["TLS1_0", "TLS1_1", "TLS1_2", "TLS1_3"], var.ssl_min_tls_version)
    error_message = "ssl_min_tls_version must be TLS1_0, TLS1_1, TLS1_2, or TLS1_3."
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

variable "identity_id" {
  description = "Managed identity ID for Azure AD authentication"
  type        = string
  default     = ""
}

variable "azure_ad_admin_login" {
  description = "Azure AD admin login name"
  type        = string
  default     = ""
}

variable "azure_ad_admin_object_id" {
  description = "Azure AD admin object ID"
  type        = string
  default     = ""
}

variable "customer_managed_key_id" {
  description = "Customer-managed key ID for BYOK encryption"
  type        = string
  default     = ""
}

variable "key_vault_id" {
  description = "Key Vault ID containing the customer-managed key"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Tags to apply to database resources"
  type        = map(string)
  default     = {}
}

variable "extensions" {
  description = "PostgreSQL extensions to enable (TimescaleDB, pgvector)"
  type = list(string)
  default = ["timescaledb", "pgvector", "pg_stat_statements", "pg_cron"]
}

variable "firewall_rules" {
  description = "Firewall rules for database access"
  type = map(object({
    start_ip = string
    end_ip   = string
  }))
  default = {}
}
