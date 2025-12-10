# Infrastructure Configuration

This directory contains Docker Compose configurations for deploying wa2ai in different environments.

## Files

- `docker-compose.lab.yml` - Laboratory environment configuration (supports both Baileys and Evolution API)
- `docker-compose.prod.yml` - Production environment with WhatsApp Cloud API
- `docker-compose.sh` - Wrapper script that automatically sets `COMPOSE_PROFILES` based on `WA2AI_PROVIDER`
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

# wa2ai Configuration
WA2AI_DEBUG=false  # Optional: Enable detailed debug logging
WA2AI_PORT=3000    # Optional: Server port (default: 3000)
WA2AI_PROVIDER=baileys  # Optional: WhatsApp provider ('baileys' or 'evolution', default: 'baileys')
WA2AI_BAILEYS_AUTH_DIR=./auth_info_baileys  # Optional: Baileys auth directory (default: ./auth_info_baileys)
```

**Generating a secure API key (optional for production):**
```bash
# Generate a 256-bit random key (64 hex characters)
openssl rand -hex 32
```

**Note:** For local development, you can use a simple value like `dev-key` or `test-key`. The API key is only used for authentication between wa2ai and Evolution API within your Docker network.

### Starting the Lab Environment

**Recommended: Use the wrapper script** (automatically includes/excludes Evolution API services based on `WA2AI_PROVIDER`):

```bash
# From project root
# The script reads WA2AI_PROVIDER from .env and sets COMPOSE_PROFILES automatically
./infra/docker-compose.sh up -d

# View logs
./infra/docker-compose.sh logs -f

# Stop services
./infra/docker-compose.sh down

# Stop and remove volumes
./infra/docker-compose.sh down -v
```

**Alternative: Manual docker compose** (requires setting `COMPOSE_PROFILES` manually):

```bash
# For Baileys provider (default - excludes Evolution API services)
docker compose -f infra/docker-compose.lab.yml --env-file .env up -d

# For Evolution API provider (includes Evolution API services)
COMPOSE_PROFILES=evolution docker compose -f infra/docker-compose.lab.yml --env-file .env up -d
```

**Important:** 
- The wrapper script (`infra/docker-compose.sh`) automatically reads `WA2AI_PROVIDER` from `.env` and sets `COMPOSE_PROFILES` accordingly.
- When `WA2AI_PROVIDER=baileys` (default), Evolution API services (`postgres`, `evolution-api-lab`) are excluded.
- When `WA2AI_PROVIDER=evolution`, Evolution API services are automatically included.

### Provider Selection

wa2ai supports two WhatsApp providers in lab mode:

- **Baileys** (default): Direct WhatsApp Web connection
  - No external dependencies (Evolution API not required)
  - Direct WebSocket connection to WhatsApp
  - QR code authentication via `/qr` endpoint
  - Set `WA2AI_PROVIDER=baileys` (or omit, as it's the default)

- **Evolution API**: Webhook-based provider
  - Requires `evolution-api-lab` and `postgres` services
  - More complex setup but supports multi-instance
  - Set `WA2AI_PROVIDER=evolution`

**Note:** When using Baileys, you can comment out the `evolution-api-lab` service and its dependency in `docker-compose.lab.yml` to reduce resource usage.

### Services

- **postgres** (internal port 5432) - *Automatically excluded when using Baileys*
  - PostgreSQL 16 database for Evolution API
  - Stores instances, messages, contacts, chats, labels, and historic data
  - Data persisted in Docker volume `postgres_data`
  - Only started when `WA2AI_PROVIDER=evolution` (via Docker Compose profiles)

- **evolution-api-lab** (port 8080) - *Automatically excluded when using Baileys*
  - Evolution API instance for webhook-based messaging
  - Only started when `WA2AI_PROVIDER=evolution` (via Docker Compose profiles)
  - Access Evolution API dashboard at http://localhost:8080
  - Access Evolution API Manager (web UI) at http://localhost:8080/manager/
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
  - Webhook endpoint: http://localhost:3000/webhooks/whatsapp/lab (for Evolution API)
  - QR code endpoint: http://localhost:3000/qr (for Baileys direct connection)
  - QR status endpoint: http://localhost:3000/qr/status
  - Supports both Evolution API (webhook) and Baileys (direct) providers

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

### Using Baileys Direct Connection (Alternative to Evolution API)

wa2ai also supports direct WhatsApp connection via Baileys, which doesn't require Evolution API:

1. **Start wa2ai service:**
   ```bash
   docker compose -f infra/docker-compose.lab.yml up -d wa2ai-lab
   ```

2. **Access QR code:**
   - Open http://localhost:3000/qr in your browser
   - The page will auto-refresh every 30 seconds

3. **Scan QR code:**
   - Open WhatsApp on your phone
   - Go to Settings → Linked Devices → Link a Device
   - Scan the QR code displayed in the browser

4. **Verify connection:**
   ```bash
   curl http://localhost:3000/qr/status
   # Should return: {"status":"connected","connected":true,...}
   ```

5. **Configure routes:**
   - Routes can be configured via API endpoints (coming soon)
   - Or programmatically by accessing the routes repository

**Advantages of Baileys:**
- No Evolution API dependency
- Lower latency (direct connection, no webhook overhead)
- Simpler architecture for single-instance deployments
- Automatic reconnection handling

**When to use each:**
- **Evolution API**: Multi-instance deployments, centralized management, webhook-based architecture
- **Baileys**: Single-instance deployments, direct connection, lower latency requirements

### Building wa2ai Image

The wa2ai image is built automatically when starting services. To rebuild:

```bash
docker compose -f infra/docker-compose.lab.yml build wa2ai-lab
```

### Message Routing

wa2ai routes incoming messages to AI agents based on channel ID. Routes are stored in `RoutesRepository`:

**Route Structure:**
```typescript
{
  channelId: '5491155551234',  // WhatsApp phone number or group ID
  agentEndpoint: 'http://localhost:8000/agent',  // Agent HTTP endpoint
  environment: 'lab',  // 'lab' or 'prod'
  config?: {  // Optional configuration
    timeout: 30000,
    retries: 3
  }
}
```

**Message Flow:**
1. Message received from WhatsApp (via Evolution API webhook or Baileys)
2. Message normalized to `IncomingMessage` format
3. RouterService finds route by `channelId`
4. AgentClient sends message to `agentEndpoint` via HTTP POST
5. Agent response is sent back to WhatsApp automatically

**Current Implementation:**
- Routes stored in-memory (`InMemoryRoutesRepository`)
- Routes can be added programmatically
- API endpoints for route management (coming soon)
- Database-backed repository (coming soon)

### Troubleshooting

1. **Port conflicts**: Ensure ports 3000 and 8080 are available
2. **Permission errors**: Ensure Docker daemon is running and user has permissions
3. **Build failures**: Check that `npm install` works locally first
4. **Evolution API not starting**: Check logs with `docker compose -f infra/docker-compose.lab.yml logs evolution-api-lab`
5. **Baileys connection issues**:
   - Check QR code endpoint: http://localhost:3000/qr
   - Verify connection status: `curl http://localhost:3000/qr/status`
   - Check logs: `docker compose -f infra/docker-compose.lab.yml logs wa2ai-lab`
   - Clear credentials if needed: Remove `auth_info_baileys` volume or directory
6. **Message routing not working**:
   - Verify route is configured for the channel ID
   - Check agent endpoint is accessible
   - Review logs for routing errors
   - Ensure agent returns valid response format: `{ success: true, response: "..." }`

