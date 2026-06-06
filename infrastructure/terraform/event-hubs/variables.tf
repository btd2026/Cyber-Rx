# Variables for Event Hubs Module

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "location" {
  description = "Azure region for Event Hubs"
  type        = string
  default     = "eastus2"
}

variable "namespace_name" {
  description = "Name of the Event Hubs namespace"
  type        = string
}

variable "sku" {
  description = "SKU for Event Hubs namespace"
  type        = string
  default     = "Standard"

  validation {
    condition     = contains(["Basic", "Standard", "Premium"], var.sku)
    error_message = "SKU must be Basic, Standard, or Premium."
  }
}

variable "capacity" {
  description = "Capacity for Event Hubs namespace (throughput units)"
  type        = number
  default     = 4  # Supports 10,000+ events/second
}

variable "zones" {
  description = "Availability zones for high availability"
  type        = list(number)
  default     = [1, 2, 3]
}

variable "event_hubs" {
  description = "Event hubs to create in the namespace"
  type = map(object({
    partition_count   = number
    message_retention = number
    capture_enabled   = bool
  }))
  default = {
    security_events = {
      partition_count   = 4
      message_retention = 7
      capture_enabled   = true
    }
    operational_events = {
      partition_count   = 4
      message_retention = 7
      capture_enabled   = true
    }
    compliance_events = {
      partition_count   = 4
      message_retention = 7
      capture_enabled   = true
    }
  }
}

variable "consumer_groups" {
  description = "Consumer groups for each event hub"
  type = map(list(string))
  default = {
    security_events = ["audit-service", "correlation-engine", "threat-intel", "archive"]
    operational_events = ["metrics-service", "dashboard-service", "analytics", "archive"]
    compliance_events = ["audit-service", "reporting-service", "evidence-collector", "archive"]
  }
}

variable "capture_destination" {
  description = "Capture destination settings"
  type = object({
    storage_account_name      = string
    container_name            = string
    capture_interval_seconds  = number
    capture_size_limit_bytes  = number
  })
  default = {
    storage_account_name      = ""  # Must be provided
    container_name            = "event-hub-capture"
    capture_interval_seconds  = 300
    capture_size_limit_bytes  = 52428800  # 50 MB
  }
}

variable "enable_managed_identity" {
  description = "Enable managed identity for Event Hubs"
  type        = bool
  default     = true
}

variable "identity_id" {
  description = "Managed identity ID to grant access to Event Hubs"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Tags to apply to Event Hubs resources"
  type        = map(string)
  default     = {}
}

variable "network_rulesets" {
  description = "Network rules for Event Hubs namespace"
  type = object({
    default_action                = string
    public_network_access_enabled = bool
    trusted_services_allowed      = bool
  })
  default = {
    default_action                = "Deny"
    public_network_access_enabled = false
    trusted_services_allowed      = true
  }
}

variable "allowed_ip_ranges" {
  description = "Allowed IP ranges for Event Hubs access"
  type        = list(string)
  default     = []
}
