# Terraform Provider Configuration

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  # Default tags for all resources
  default_tags {
    tags = {
      Project     = "Nerion"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Compliance  = "HIPAA"
      PII         = "false"
    }
  }

  # Assume role for production
  assume_role {
    role_arn     = var.environment == "production" ? var.production_role_arn : null
    session_name = "terraform"
  }
}
