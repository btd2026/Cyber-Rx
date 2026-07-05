# Variables for Nerion Infrastructure

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "cyberrx"
}

variable "environment" {
  description = "Environment (dev, staging, production)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}

variable "domain_name" {
  description = "Root domain name for the application"
  type        = string
  default     = "cyberrx.com"
}

variable "backend_domain" {
  description = "Backend API domain name"
  type        = string
  default     = "api.cyberrx.com"
}

variable "frontend_domain" {
  description = "Frontend application domain name"
  type        = string
  default     = "app.cyberrx.com"
}

variable "enable_backups" {
  description = "Enable automated backups"
  type        = bool
  default     = true
}

variable "backup_retention_period" {
  description = "Backup retention period in days"
  type        = number
  default     = 30
}

variable "multi_az" {
  description = "Enable Multi-AZ deployment"
  type        = bool
  default     = true
}

variable "instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.large"
}

variable "allocated_storage" {
  description = "Initial database storage in GB"
  type        = number
  default     = 100
}

variable "max_storage" {
  description = "Maximum database storage in GB"
  type        = number
  default     = 1000
}

variable "enable_monitoring" {
  description = "Enable enhanced monitoring"
  type        = bool
  default     = true
}

variable "enable_cloudwatch_alarms" {
  description = "Enable CloudWatch alarms"
  type        = bool
  default     = true
}

variable "enable_sentry" {
  description = "Enable Sentry error tracking"
  type        = bool
  default     = true
}

variable "allowed_cidr_blocks" {
  description = "Allowed CIDR blocks for security groups"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "enable_datadog" {
  description = "Enable DataDog monitoring"
  type        = bool
  default     = true
}

variable "datadog_api_key" {
  description = "DataDog API key"
  type        = string
  sensitive   = true
}

variable "sentry_dsn" {
  description = "Sentry DSN for error tracking"
  type        = string
  sensitive   = true
}

variable "redis_node_type" {
  description = "ElasticCache Redis node type"
  type        = string
  default     = "cache.t3.medium"
}

variable "redis_num_cache_nodes" {
  description = "Number of Redis cache nodes"
  type        = number
  default     = 2
}

variable "enable_redis_replication" {
  description = "Enable Redis replication"
  type        = bool
  default     = true
}

variable "ssl_certificate_arn" {
  description = "SSL certificate ARN for CloudFront"
  type        = string
  default     = ""
}

variable "enable_cdn" {
  description = "Enable CloudFront CDN"
  type        = bool
  default     = true
}

variable "enable_s3_access_logs" {
  description = "Enable S3 access logs"
  type        = bool
  default     = true
}

variable "s3_log_bucket_arn" {
  description = "S3 bucket ARN for access logs"
  type        = string
  default     = ""
}
