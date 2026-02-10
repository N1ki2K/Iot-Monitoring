#!/bin/bash
set -e

echo "=== IoT Monitoring Deployment ==="

cd "$(dirname "$0")"

# Check if .env exists
if [ ! -f .env ]; then
    echo "Error: .env file not found!"
    echo "Copy .env.example to .env and configure it first."
    exit 1
fi

echo "Building Docker images..."
docker compose -f docker-compose.prod.yml build

echo "Starting services..."
docker compose -f docker-compose.prod.yml up -d

echo "Waiting for services to be ready..."
sleep 10

echo "Running database migrations..."
docker compose -f docker-compose.prod.yml exec -T backend node dist/scripts/migrate.js || echo "Migration skipped or already applied"

echo "Cleaning up old images..."
docker image prune -f

echo ""
echo "=== Deployment Complete ==="
docker compose -f docker-compose.prod.yml ps
