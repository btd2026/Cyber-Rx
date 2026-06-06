# AKS Cluster Main Configuration

terraform {
  required_version = ">= 1.5"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}

# Resource Group
resource "azurerm_resource_group" "main" {
  name     = var.resource_group_name
  location = var.location

  tags = var.tags
}

# Virtual Network
resource "azurerm_virtual_network" "main" {
  name                = "${var.cluster_name}-vnet"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  address_space       = var.vnet_address_space

  tags = var.tags
}

# AKS Subnet
resource "azurerm_subnet" "aks" {
  name                 = "aks-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = var.subnet_prefixes.aks_subnet

  delegation {
    name = "aks-delegation"
    service_delegation {
      name = "Microsoft.ContainerService/managedClusters"
      actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
    }
  }
}

# Database Subnet (Private Endpoints)
resource "azurerm_subnet" "database" {
  name                 = "db-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = var.subnet_prefixes.db_subnet

  # Required for private endpoints
  enforce_private_link_endpoint_network_policies = true
}

# Application Gateway Subnet
resource "azurerm_subnet" "app_gateway" {
  name                 = "app-gateway-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = var.subnet_prefixes.app_gateway_subnet
}

# Log Analytics Workspace
resource "azurerm_log_analytics_workspace" "main" {
  name                = "${var.cluster_name}-logs"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = var.log_analytics_workspace_sku
  retention_in_days   = var.retention_in_days

  tags = var.tags
}

# User Assigned Identity for AKS
resource "azurerm_user_assigned_identity" "aks" {
  name                = "${var.cluster_name}-identity"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  tags = var.tags
}

# AKS Cluster
resource "azurerm_kubernetes_cluster" "main" {
  name                = var.cluster_name
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  kubernetes_version  = var.kubernetes_version
  dns_prefix          = "${var.cluster_name}-k8s"

  # Private Cluster Configuration
  private_cluster_enabled      = var.enable_private_cluster
  private_dns_zone_id          = var.enable_private_cluster ? azurerm_private_dns_zone.aks[0].id : null
  private_cluster_public_fqdn_enabled = false

  # Network Configuration
  network_profile {
    network_plugin     = "azure"
    network_policy     = var.network_policy
    load_balancer_sku  = "standard"
    outbound_type      = "userAssignedNATGateway"
  }

  # Identity
  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.aks.id]
  }

  # Azure RBAC
  azure_rbac_enabled = var.enable_azure_rbac
  role_based_access_control_enabled = true

  # Admin Group Access
  azure_active_directory_role {
    admin_group_object_ids = var.admin_group_object_ids
  }

  # Logging
  oms_agent {
    log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  }

  # Auto-scaler profile
  auto_scaler_profile {
    balance_similar_node_groups = true
    max_graceful_termination_sec = 600
  }

  tags = var.tags
}

# Private DNS Zone for Private Cluster
resource "azurerm_private_dns_zone" "aks" {
  count               = var.enable_private_cluster ? 1 : 0
  name                = "${var.cluster_name}.privatelink.<region>.azmk8s.io"
  resource_group_name = azurerm_resource_group.main.name

  tags = var.tags
}

# Default System Node Pool
resource "azurerm_kubernetes_cluster_node_pool" "system" {
  name                  = "system"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.main.id
  vm_size               = var.node_pools.system.vm_size
  node_count            = var.node_pools.system.node_count
  os_disk_size_gb       = var.node_pools.system.os_disk_size_gb
  max_pods              = var.node_pools.system.max_pods

  mode                  = "System"
  os_type               = "Linux"
  enable_auto_scaling   = true
  min_count             = var.node_pools.system.min_count
  max_count             = var.node_pools.system.max_count

  vnet_subnet_id        = azurerm_subnet.aks.id

  tags = var.tags
}

# Default Tier Node Pool
resource "azurerm_kubernetes_cluster_node_pool" "default_tier" {
  name                  = "default"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.main.id
  vm_size               = var.node_pools.default_tier.vm_size
  node_count            = var.node_pools.default_tier.node_count
  os_disk_size_gb       = var.node_pools.default_tier.os_disk_size_gb
  max_pods              = var.node_pools.default_tier.max_pods

  mode                  = "User"
  os_type               = "Linux"
  enable_auto_scaling   = true
  min_count             = var.node_pools.default_tier.min_count
  max_count             = var.node_pools.default_tier.max_count

  vnet_subnet_id        = azurerm_subnet.aks.id

  node_taints = ["workload=default-tier:NoSchedule"]

  tags = var.tags
}

# Premium Tier Node Pool
resource "azurerm_kubernetes_cluster_node_pool" "premium_tier" {
  name                  = "premium"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.main.id
  vm_size               = var.node_pools.premium_tier.vm_size
  node_count            = var.node_pools.premium_tier.node_count
  os_disk_size_gb       = var.node_pools.premium_tier.os_disk_size_gb
  max_pods              = var.node_pools.premium_tier.max_pods

  mode                  = "User"
  os_type               = "Linux"
  enable_auto_scaling   = true
  min_count             = var.node_pools.premium_tier.min_count
  max_count             = var.node_pools.premium_tier.max_count

  vnet_subnet_id        = azurerm_subnet.aks.id

  node_taints = ["workload=premium-tier:NoSchedule"]

  tags = var.tags
}

# NAT Gateway for Outbound Access
resource "azurerm_public_ip" "nat" {
  name                = "${var.cluster_name}-nat-pip"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  allocation_method   = "Static"
  sku                 = "Standard"

  tags = var.tags
}

resource "azurerm_nat_gateway" "main" {
  name                = "${var.cluster_name}-nat"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku_name            = "Standard"

  tags = var.tags
}

resource "azurerm_nat_gateway_public_ip_association" "main" {
  nat_gateway_id       = azurerm_nat_gateway.main.id
  public_ip_address_id = azurerm_public_ip.nat.id
}

resource "azurerm_subnet_nat_gateway_association" "aks" {
  subnet_id      = azurerm_subnet.aks.id
  nat_gateway_id = azurerm_nat_gateway.main.id
}
