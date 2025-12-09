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
# The API key is a value YOU define - it's not obtained from Evolution API.
# For local development, you can use any value (e.g., "dev-key" or "test-key").
# For production, generate a secure random key using: openssl rand -hex 32
EVOLUTION_API_KEY=your_api_key_here
EVOLUTION_LOG_LEVEL=INFO  # Optional: ERROR, WARN, INFO, DEBUG, LOG, VERBOSE, DARK, WEBHOOKS

# wa2ai Debug (optional)
WA2AI_DEBUG=false
```

**Generating a secure API key (optional for production):**
```bash
# Generate a 256-bit random key (64 hex characters)
openssl rand -hex 32
```

**Note:** For local development, you can use a simple value like `dev-key` or `test-key`. The API key is only used for authentication between wa2ai and Evolution API within your Docker network.

### Starting the Lab Environment

```bash
# From project root
# Note: docker-compose automatically reads .env from project root
docker compose -f infra/docker-compose.lab.yml --env-file .env up -d

# View logs
docker compose -f infra/docker-compose.lab.yml logs -f

# Stop services
docker compose -f infra/docker-compose.lab.yml down

# Stop and remove volumes
docker compose -f infra/docker-compose.lab.yml down -v
```

**Important:** When using `-f` to specify a compose file in a subdirectory, explicitly specify `--env-file .env` to ensure environment variables are loaded from the project root.

### Services

- **postgres** (internal port 5432)
  - PostgreSQL 16 database for Evolution API
  - Stores instances, messages, contacts, chats, labels, and historic data
  - Data persisted in Docker volume `postgres_data`
  - Health check: `pg_isready`

- **evolution-api-lab** (port 8080)
  - Evolution API latest version instance for laboratory testing
  - Connected to PostgreSQL database (required by Evolution API v2)
  - Log level configurable via `EVOLUTION_LOG_LEVEL` environment variable
  - Webhook configured to point to wa2ai-lab
  - Access Evolution API dashboard at http://localhost:8080
  - Access Evolution API Manager (web UI) at http://localhost:8080/manager/
  - Health check endpoint: http://localhost:8080/ (root endpoint)

- **wa2ai-lab** (port 3000)
  - wa2ai router service configured for lab environment
  - Health check endpoint: http://localhost:3000/health
  - Webhook endpoint: http://localhost:3000/webhooks/whatsapp/lab

### Health Checks

All services include health checks:

```bash
# Check service status
docker compose -f infra/docker-compose.lab.yml ps

# Check health endpoints
curl http://localhost:3000/health  # wa2ai-lab
curl http://localhost:8080/        # evolution-api-lab (root endpoint)
```

### Connecting WhatsApp Number

To connect a WhatsApp number for laboratory testing:

#### Option 1: Using Evolution API Manager (Web UI - Recommended)

1. Open http://localhost:8080/manager/ in your browser
2. **Login to Manager:**
   - Server URL: `http://localhost:8080`
   - API Key Global: Enter your API key from `.env` file (`EVOLUTION_API_KEY`)
     - If using default: `default_key_change_me`
     - If you set a custom key in `.env`, use that value
3. After login, click "Create Instance" and fill the form:
   - **Instance Name**: `wa2ai-lab` (or any name you prefer)
   - **Channel/Integration**: Select **Baileys** (this corresponds to `WHATSAPP-BAILEYS`)
   - **Token**: Enter any string value (e.g., `wa2ai-lab-token` or generate a UUID). The Manager Web requires this field, but it can be any value you choose.
   - **Number**: Leave empty (optional for Baileys - only required for WhatsApp Cloud API)
4. Click "Create"
5. **Wait a few seconds** for the instance to initialize
6. Click on the **gear icon** (⚙️) next to your instance
7. Click **"Get QR Code"** - The QR code should appear in the popup
   - If the QR code doesn't appear, try:
     - Clear browser cookies for `localhost:8080`
     - Hard refresh the page (Ctrl+R or Cmd+R)
     - Wait a few more seconds and try again
   - The QR code may take 5-10 seconds to generate after instance creation
8. Scan the QR code with your WhatsApp mobile app:
   - Open WhatsApp on your phone
   - Go to Settings → Linked Devices (or Dispositivos vinculados)
   - Tap "Link a Device" (or "Vincular un dispositivo")
   - Scan the QR code displayed in the manager

#### Option 2: Using API

```bash
# Create instance
curl -X POST http://localhost:8080/instance/create \
  -H "apikey: default_key_change_me" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "wa2ai-lab",
    "integration": "WHATSAPP-BAILEYS",
    "qrcode": true
  }'

# Get QR code (wait a few seconds after creation)
curl -X GET "http://localhost:8080/instance/connect/wa2ai-lab" \
  -H "apikey: default_key_change_me"

# Check connection state
curl -X GET "http://localhost:8080/instance/connectionState/wa2ai-lab" \
  -H "apikey: default_key_change_me"
```

**Note:** Replace `default_key_change_me` with your actual API key from `.env` file.

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

