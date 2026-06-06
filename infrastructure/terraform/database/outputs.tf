# Outputs for Database Module

output "server_name" {
  description = "Name of the PostgreSQL server"
  value       = azurerm_postgresql_flexible_server.main.name
}

output "server_id" {
  description = "ID of the PostgreSQL server"
  value       = azurerm_postgresql_flexible_server.main.id
}

output "server_fqdn" {
  description = "Fully qualified domain name of the server"
  value       = azurerm_postgresql_flexible_server.main.fqdn
}

output "server_version" {
  description = "PostgreSQL version"
  value       = azurerm_postgresql_flexible_server.main.version
}

output "administrator_login" {
  description = "Admin username"
  value       = azurerm_postgresql_flexible_server.main.administrator_login
  sensitive   = true
}

output "host" {
  description = "Database host"
  value       = azurerm_postgresql_flexible_server.main.fqdn
}

output "port" {
  description = "Database port"
  value       = 5432
}

output "databases" {
  description = "Map of database names and IDs"
  value = {
    for db in azurerm_postgresql_flexible_server_database.main : db.name => {
      id       = db.id
      name     = db.name
      charset  = db.charset
      collation = db.collation
    }
  }
}

output "database_names" {
  description = "List of database names"
  value       = [for db in azurerm_postgresql_flexible_server_database.main : db.name]
}

output "connection_strings" {
  description = "Database connection strings (format depends on database)"
  sensitive   = true
  value = {
    for db in azurerm_postgresql_flexible_server_database.main : db.name => "postgresql://${var.administrator_login}@${azurerm_postgresql_flexible_server.main.name}:${data.azurerm_key_vault_secret.admin_password.value}@${azurerm_postgresql_flexible_server.main.fqdn}:5432/${db.name}?sslmode=require"
  }
}

output "private_endpoint_id" {
  description = "ID of the private endpoint (if created)"
  value       = try(azurerm_private_endpoint.database[0].id, null)
}

output "private_endpoint_ip" {
  description = "Private IP address of the private endpoint"
  value       = try(azurerm_private_endpoint.database[0].private_service_connection[0].private_ip_address, null)
}

output "identity_id" {
  description = "ID of the database managed identity"
  value       = azurerm_user_assigned_identity.db.id
}

output "identity_principal_id" {
  description = "Principal ID of the database managed identity"
  value       = azurerm_user_assigned_identity.db.principal_id
}

output "sku_name" {
  description = "SKU name"
  value       = var.sku_name
}

output "storage_mb" {
  description = "Storage size in MB"
  value       = azurerm_postgresql_flexible_server.main.storage_mb
}

output "high_availability_enabled" {
  description = "Whether high availability is enabled"
  value       = var.high_availability
}

output "backup_retention_days" {
  description = "Backup retention in days"
  value       = var.backup_retention_days
}

output "geo_redundant_backup_enabled" {
  description = "Whether geo-redundant backup is enabled"
  value       = var.geo_redundant_backup
}

output "customer_managed_key_enabled" {
  description = "Whether customer-managed key encryption is enabled"
  value       = var.customer_managed_key_id != "" && var.key_vault_id != ""
}

output "extensions_enabled" {
  description = "List of enabled PostgreSQL extensions"
  value       = var.extensions
}

output "timescaledb_enabled" {
  description = "Whether TimescaleDB extension is enabled"
  value       = contains(var.extensions, "timescaledb")
}

output "pgvector_enabled" {
  description = "Whether pgvector extension is enabled"
  value       = contains(var.extensions, "pgvector")
}

output "ssl_min_tls_version" {
  description = "Minimum TLS version"
  value       = var.ssl_min_tls_version
}

output "public_network_access_enabled" {
  description = "Whether public network access is enabled"
  value       = var.public_network_access_enabled
}

output "is_private_endpoint" {
  description = "Whether database is accessed via private endpoint"
  value       = !var.public_network_access_enabled && var.subnet_id != ""
}

output "postgresql_server_fqdn" {
  description = "PostgreSQL server FQDN for connection"
  value       = azurerm_postgresql_flexible_server.main.fqdn
}
