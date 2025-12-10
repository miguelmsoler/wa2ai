# wa2ai

> Gateway connecting WhatsApp with AI agents (ADK or others), enabling message routing based on configurable rules.

[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

## 📖 Overview

wa2ai is a routing service that connects WhatsApp with AI agents, enabling seamless message routing based on configurable rules. The project supports multiple WhatsApp providers and allows easy migration from laboratory to production environments.

### Key Features

- 🔌 **Multiple Provider Support**: Evolution API (webhook-based) or Baileys (direct WebSocket)
- 🚀 **Direct Routing**: Low-latency message routing without HTTP overhead (Baileys)
- 🎯 **Dynamic Routing**: Route messages to different agents per contact/group
- 🔧 **REST API**: Manage routes via `/api/routes` endpoints
- 🐳 **Docker Support**: Ready-to-use Docker Compose configurations
- ✅ **Comprehensive Tests**: 230+ unit and integration tests

## 🏗️ Architecture

```
WhatsApp → Provider (Baileys/Evolution API) → wa2ai Router → AI Agent → Response → WhatsApp
```

### Phase 1: Laboratory Mode (Current)
- **Baileys**: Direct WebSocket connection with QR code authentication
- **Evolution API**: Webhook-based integration (optional)

### Phase 2: Production Mode (Planned)
- **WhatsApp Cloud API**: Official Meta API integration

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm
- Docker & docker-compose (optional, for Evolution API)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd wa2ai

# Install dependencies
npm install

# Build the project
npm run build
```

### Using Baileys (Recommended)

1. **Start the server:**
   ```bash
   npm start
   ```

2. **Scan QR code:**
   - Open http://localhost:3000/qr in your browser
   - Scan with WhatsApp: Settings → Linked Devices → Link a Device
   - Verify connection: `curl http://localhost:3000/qr/status`

3. **Configure a route:**
   ```bash
   curl -X POST http://localhost:3000/api/routes \
     -H "Content-Type: application/json" \
     -d '{
       "channelId": "YOUR_WHATSAPP_NUMBER",
       "agentEndpoint": "http://localhost:8000/agent",
       "environment": "lab",
       "regexFilter": "^Test"  # Optional: filter messages by regex pattern
     }'
   ```
   
   **Route Configuration:**
   - `channelId`: Channel identifier (use `"*"` for wildcard route)
   - `agentEndpoint`: HTTP endpoint of the AI agent
   - `environment`: `"lab"` or `"prod"`
   - `regexFilter`: (Optional) JavaScript RegExp pattern to filter messages by text content

4. **Start your agent** and send a WhatsApp message to test the flow.

### Using Docker

```bash
# Start wa2ai with Baileys
docker compose -f infra/docker-compose.lab.yml up -d wa2ai-lab

# Check logs
docker compose -f infra/docker-compose.lab.yml logs -f wa2ai-lab
```

For Evolution API setup, see [`infra/README.md`](infra/README.md).

## 📚 Documentation

- **[Design Document](project/wa2ai_design.md)**: Architecture and design decisions
- **[Infrastructure Guide](infra/README.md)**: Docker setup and deployment
- **[End-to-End Testing](tests/e2e/README.md)**: Testing guide
- **[AGENTS.md](AGENTS.md)**: Development guidelines and conventions

## 🧪 Development

### Available Scripts

```bash
# Development
npm run dev          # Start with hot reload
npm run build        # Build TypeScript
npm start            # Start production server

# Testing
npm test             # Run all tests
npm run test:watch   # Run tests in watch mode
npm run test:unit    # Run unit tests only
npm run test:integration  # Run integration tests only

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run format       # Format code with Prettier
npm run type-check   # Type check without building
```

### Project Structure

```
wa2ai/
├── router/src/          # Source code
│   ├── core/            # Domain layer (models, services)
│   ├── providers/        # WhatsApp providers
│   ├── webhooks-controller.ts
│   ├── routes-controller.ts
│   └── index.ts
├── tests/               # Test suites
├── infra/               # Docker configurations
├── docs/                # Technical documentation
└── project/             # Project management docs
```

## 🧪 Testing

The project includes comprehensive test coverage:

- **Unit Tests**: Core domain logic, services, and adapters
- **Integration Tests**: End-to-end message routing flows
- **Test Fixtures**: Mock agents for testing

Run tests:
```bash
npm test
```

## 📋 API Endpoints

### Route Management

- `POST /api/routes` - Add a new route
  ```json
  {
    "channelId": "channel-id or *",
    "agentEndpoint": "http://agent-url",
    "environment": "lab|prod",
    "regexFilter": "^Test.*"  // Optional: JavaScript RegExp pattern
  }
  ```
- `GET /api/routes` - List all routes
- `GET /api/routes/:channelId` - Get a specific route
- `DELETE /api/routes/:channelId` - Remove a route

**Route Filtering:**
- Routes can include an optional `regexFilter` field using **JavaScript RegExp** syntax (ECMAScript standard)
- Messages are only routed if their text content matches the regex pattern
- If `regexFilter` is not provided, all messages are routed (default behavior)
- Examples:
  - `"^Test"` - Messages starting with "Test"
  - `".*help.*"` - Messages containing "help"
  - `"^[0-9]+$"` - Messages containing only digits

### System

- `GET /health` - Health check
- `GET /qr` - QR code page for WhatsApp authentication
- `GET /qr/status` - Connection status (JSON)
- `GET /qr/image` - QR code image (PNG)

## 🔧 Configuration

Environment variables (see `.env.example`):

- `WA2AI_PORT` - Server port (default: 3000)
- `WA2AI_DEBUG` - Enable debug logging (default: false)
- `WA2AI_BAILEYS_AUTH_DIR` - Baileys auth directory (default: ./auth_info_baileys)

## ✅ Current Status

**Phase 1 (Laboratory Mode)** - In Progress

- ✅ Baileys direct connection with QR authentication
- ✅ Direct routing to agents (no HTTP overhead)
- ✅ Route management REST API
- ✅ Connection state management with auto-reconnection
- ✅ Comprehensive test suite (230+ tests)
- 🔄 End-to-end integration with ADK agents

## 🗺️ Roadmap

### Phase 1 (Current)
- [x] Baileys integration
- [x] Direct routing implementation
- [x] Route management API
- [ ] Database persistence for routes
- [ ] Full end-to-end testing

### Phase 2 (Planned)
- [ ] WhatsApp Cloud API integration
- [ ] Advanced routing rules
- [ ] Metrics and monitoring
- [ ] Web UI for route management

## 🤝 Contributing

The project is in active development. Contribution guidelines will be added after Phase 1 stabilizes.

For development guidelines, see [AGENTS.md](AGENTS.md).

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Note**: This project is currently in Phase 1 (Laboratory Mode). Production features are planned for Phase 2.
