output "vpc_id" {
  value       = aws_vpc.main.id
  description = "The ID of the VPC"
}

output "db_endpoint" {
  value       = aws_db_instance.postgres.endpoint
  description = "PostgreSQL RDS connection endpoint"
}

output "redis_endpoint" {
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
  description = "ElastiCache Redis primary connection endpoint"
}

output "ecs_cluster_name" {
  value       = aws_ecs_cluster.main.name
  description = "ECS cluster identifier"
}
