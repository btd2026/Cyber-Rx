# Variables for AKS Cluster Module

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "location" {
  description = "Azure region for resources"
  type        = string
  default     = "eastus2"
}

variable "cluster_name" {
  description = "Name of the AKS cluster"
  type        = string
}

variable "kubernetes_version" {
  description = "Kubernetes version to deploy"
  type        = string
  default     = "1.28"
}

variable "node_pools" {
  description = "Node pool configurations for different customer tiers"
  type = map(object({
    node_count    = number
    vm_size       = string
    os_disk_size_gb = number
    min_count     = number
    max_count     = number
    max_pods      = number
  }))
  default = {
    system = {
      node_count      = 3
      vm_size         = "Standard_DS4_v2"
      os_disk_size_gb = 120
      min_count       = 2
      max_count       = 5
      max_pods        = 110
    }
    default_tier = {
      node_count      = 2
      vm_size         = "Standard_D4s_v3"
      os_disk_size_gb = 100
      min_count       = 1
      max_count       = 10
      max_pods        = 110
    }
    premium_tier = {
      node_count      = 3
      vm_size         = "Standard_E8s_v3"
      os_disk_size_gb = 200
      min_count       = 2
      max_count       = 15
      max_pods        = 110
    }
  }
}

variable "vnet_address_space" {
  description = "Address space for the virtual network"
  type        = list(string)
  default     = ["10.0.0.0/16"]
}

variable "subnet_prefixes" {
  description = "Address prefixes for subnets"
  type = map(list(string))
  default = {
    aks_subnet      = ["10.0.1.0/24"]
    db_subnet       = ["10.0.2.0/24"]
    app_gateway_subnet = ["10.0.3.0/24"]
  }
}

variable "enable_private_cluster" {
  description = "Enable private AKS cluster (no public API server)"
  type        = bool
  default     = true
}

variable "enable_azure_rbac" {
  description = "Enable Azure RBAC for Kubernetes authorization"
  type        = bool
  default     = true
}

variable "admin_group_object_ids" {
  description = "Azure AD group object IDs with cluster admin access"
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}

variable "log_analytics_workspace_sku" {
  description = "SKU for Log Analytics workspace"
  type        = string
  default     = "PerGB2018"
}

variable "retention_in_days" {
  description = "Retention period for logs in days"
  type        = number
  default     = 30
}

variable "network_policy" {
  description = "Network policy to use (azure or calico)"
  type        = string
  default     = "azure"
}
