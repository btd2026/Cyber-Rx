# Outputs for CyberRx Infrastructure

output "api_gateway_url" {
  description = "API Gateway URL"
  value       = module.api_gateway.api_url
}

output "frontend_url" {
  description = "Frontend CloudFront URL"
  value       = module.cdn.frontend_url
}

output "rds_endpoint" {
  description = "RDS endpoint"
  value       = module.database.rds_endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "Redis endpoint"
  value       = module.redis.redis_endpoint
}

output "s3_bucket_name" {
  description = "S3 bucket name for assets"
  value       = module.storage.s3_bucket_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = module.cdn.cloudfront_distribution_id
}

output "secrets_manager_arn" {
  description = "Secrets Manager ARN"
  value       = module.secrets.secrets_manager_arn
  sensitive   = true
}

output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = module.vpc.private_subnet_ids
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = module.vpc.public_subnet_ids
}

output "security_group_id" {
  description = "Security group ID"
  value       = module.security_groups.security_group_id
}

output "datadog_api_key" {
  description = "DataDog API key"
  value       = aws_secretsmanager_secret.datadog_api_key.arn
  sensitive   = true
}

output "sentry_dsn" {
  description = "Sentry DSN"
  value       = aws_secretsmanager_secret.sentry_dsn.arn
  sensitive   = true
}

output "monitoring_dashboard_url" {
  description = "Grafana dashboard URL"
  value       = "https://${var.domain_name}:3000"
}

output "deployment_instructions" {
  description = "Deployment instructions"
  value = <<-EOT
    CyberRx infrastructure deployed successfully!
    
    Access URLs:
    - Frontend: ${module.cdn.frontend_url}
    - API: ${module.api_gateway.api_url}
    - Monitoring: https://${var.domain_name}:3000
    
    Next Steps:
    1. Configure DNS records to point to CloudFront distribution
    2. Set up SSL certificates
    3. Configure DataDog monitoring
    4. Set up Sentry error tracking
    5. Run database migrations
    6. Deploy applications
  EOT
}
