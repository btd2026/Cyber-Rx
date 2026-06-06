# Outputs for AKS Cluster Module

output "resource_group_name" {
  description = "Name of the resource group"
  value       = azurerm_resource_group.main.name
}

output "resource_group_location" {
  description = "Location of the resource group"
  value       = azurerm_resource_group.main.location
}

output "cluster_name" {
  description = "Name of the AKS cluster"
  value       = azurerm_kubernetes_cluster.main.name
}

output "cluster_id" {
  description = "ID of the AKS cluster"
  value       = azurerm_kubernetes_cluster.main.id
}

output "kube_config" {
  description = "Kubeconfig for the AKS cluster"
  value       = azurerm_kubernetes_cluster.main.kube_config_raw
  sensitive   = true
}

output "host" {
  description = "AKS cluster host"
  value       = azurerm_kubernetes_cluster.main.host
  sensitive   = true
}

output "client_key" {
  description = "AKS client key"
  value       = azurerm_kubernetes_cluster.main.client_key
  sensitive   = true
}

output "client_certificate" {
  description = "AKS client certificate"
  value       = azurerm_kubernetes_cluster.main.client_certificate
  sensitive   = true
}

output "cluster_public_fqdn" {
  description = "Public FQDN of the cluster (if not private)"
  value       = azurerm_kubernetes_cluster.main.fqdn
}

output "vnet_name" {
  description = "Name of the virtual network"
  value       = azurerm_virtual_network.main.name
}

output "vnet_id" {
  description = "ID of the virtual network"
  value       = azurerm_virtual_network.main.id
}

output "aks_subnet_id" {
  description = "ID of the AKS subnet"
  value       = azurerm_subnet.aks.id
}

output "aks_subnet_name" {
  description = "Name of the AKS subnet"
  value       = azurerm_subnet.aks.name
}

output "database_subnet_id" {
  description = "ID of the database subnet (for private endpoints)"
  value       = azurerm_subnet.database.id
}

output "database_subnet_name" {
  description = "Name of the database subnet"
  value       = azurerm_subnet.database.name
}

output "app_gateway_subnet_id" {
  description = "ID of the Application Gateway subnet"
  value       = azurerm_subnet.app_gateway.id
}

output "app_gateway_subnet_name" {
  description = "Name of the Application Gateway subnet"
  value       = azurerm_subnet.app_gateway.name
}

output "node_resource_group" {
  description = "Name of the node resource group"
  value       = azurerm_kubernetes_cluster.main.node_resource_group
}

output "system_node_pool_name" {
  description = "Name of the system node pool"
  value       = azurerm_kubernetes_cluster_node_pool.system.name
}

output "default_tier_node_pool_name" {
  description = "Name of the default tier node pool"
  value       = azurerm_kubernetes_cluster_node_pool.default_tier.name
}

output "premium_tier_node_pool_name" {
  description = "Name of the premium tier node pool"
  value       = azurerm_kubernetes_cluster_node_pool.premium_tier.name
}

output "managed_identity_id" {
  description = "ID of the AKS managed identity"
  value       = azurerm_user_assigned_identity.aks.id
}

output "managed_identity_principal_id" {
  description = "Principal ID of the AKS managed identity"
  value       = azurerm_user_assigned_identity.aks.principal_id
}

output "log_analytics_workspace_id" {
  description = "ID of the Log Analytics workspace"
  value       = azurerm_log_analytics_workspace.main.id
}

output "log_analytics_workspace_name" {
  description = "Name of the Log Analytics workspace"
  value       = azurerm_log_analytics_workspace.main.name
}

output "nat_gateway_id" {
  description = "ID of the NAT gateway"
  value       = azurerm_nat_gateway.main.id
}

output "is_private_cluster" {
  description = "Whether the cluster is private"
  value       = var.enable_private_cluster
}
