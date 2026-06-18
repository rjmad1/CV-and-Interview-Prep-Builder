variable "aws_region" {
  type        = string
  description = "Target AWS Region"
  default     = "us-east-1"
}

variable "project_name" {
  type        = string
  description = "Project Name identifier"
  default     = "career-intelligence"
}

variable "vpc_cidr" {
  type        = string
  description = "VPC CIDR Range"
  default     = "10.0.0.0/16"
}

variable "db_username" {
  type        = string
  description = "Database master username"
  default     = "cis_admin"
}

variable "db_password" {
  type        = string
  description = "Database master password"
  sensitive   = true
  default     = "SuperSecurePassword123!"
}
