# Infrastructure Configuration

This directory contains Docker Compose configurations for deploying wa2ai in different environments.

## Files

- `docker-compose.lab.yml` - Laboratory environment with Evolution API
- `docker-compose.prod.yml` - Production environment with WhatsApp Cloud API
- `Dockerfile.lab` - Docker image for wa2ai-lab service
- `Dockerfile.prod` - Docker image for wa2ai-prod service (to be created in Phase 2)

## Laboratory Environment

### Prerequisites

1. Docker and Docker Compose installed
2. Environment variables configured (see `.env.example` in project root)

### Required Environment Variables

Create a `.env` file in the project root with:

```bash
# Evolution API
EVOLUTION_API_KEY=your_secure_api_key_here

# wa2ai Debug (optional)
WA2AI_DEBUG=false
```

### Starting the Lab Environment

```bash
# From project root
docker compose -f infra/docker-compose.lab.yml up -d

# View logs
docker compose -f infra/docker-compose.lab.yml logs -f

# Stop services
docker compose -f infra/docker-compose.lab.yml down

# Stop and remove volumes
docker compose -f infra/docker-compose.lab.yml down -v
```

### Services

- **evolution-api-lab** (port 8080)
  - Evolution API instance for laboratory testing
  - Webhook configured to point to wa2ai-lab
  - Access Evolution API dashboard at http://localhost:8080

- **wa2ai-lab** (port 3000)
  - wa2ai router service configured for lab environment
  - Health check endpoint: http://localhost:3000/health
  - Webhook endpoint: http://localhost:3000/webhooks/whatsapp/lab

### Health Checks

Both services include health checks:

```bash
# Check service status
docker compose -f infra/docker-compose.lab.yml ps

# Check health
curl http://localhost:3000/health
curl http://localhost:8080/health
```

### Building wa2ai Image

The wa2ai image is built automatically when starting services. To rebuild:

```bash
docker compose -f infra/docker-compose.lab.yml build wa2ai-lab
```

### Troubleshooting

1. **Port conflicts**: Ensure ports 3000 and 8080 are available
2. **Permission errors**: Ensure Docker daemon is running and user has permissions
3. **Build failures**: Check that `npm install` works locally first
4. **Evolution API not starting**: Check logs with `docker compose -f infra/docker-compose.lab.yml logs evolution-api-lab`

