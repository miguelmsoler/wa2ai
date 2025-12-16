# wa2ai

> A gateway that connects WhatsApp with AI agents, enabling message routing based on configurable rules. Built with Clean Architecture principles for extensibility and maintainability.

[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Status](https://img.shields.io/badge/status-in%20development-yellow)](https://github.com/yourusername/wa2ai)

---

## The Problem and Solution

### Why wa2ai Exists

Building AI agents that interact with WhatsApp users presents several challenges:

- **Provider complexity**: Different WhatsApp integration methods (official API, unofficial libraries) require different implementations
- **Agent protocol diversity**: AI agents use various protocols (HTTP REST, gRPC, WebSockets) with different request/response formats
- **Environment migration**: Moving from development (lab) to production requires changing integration code
- **Tight coupling**: Routing logic often becomes coupled to specific WhatsApp providers or agent implementations

**wa2ai solves these problems** by providing a decoupled routing layer that:

1. **Abstracts WhatsApp providers**: Switch between Baileys (lab), Evolution API (lab), or WhatsApp Cloud API (production) without changing routing logic
2. **Standardizes agent communication**: Uses the ADK (Agent Development Kit) API format for consistent agent integration
3. **Enables seamless migration**: Move from lab to production by updating route configuration, not code
4. **Maintains clean architecture**: Core routing logic is independent of infrastructure concerns

### What wa2ai Does

wa2ai is a **message routing service** that:

- Receives messages from WhatsApp (via Baileys, Evolution API, or WhatsApp Cloud API)
- Normalizes messages into a domain model (independent of the WhatsApp provider)
- Routes messages to appropriate AI agents based on configurable rules (channel ID, regex filters)
- Sends agent responses back to WhatsApp users
- Manages routes via REST API (create, read, update, delete)

Think of wa2ai as a **smart router** that sits between WhatsApp and your AI agents, handling the complexity of provider differences and message routing so you can focus on building great agents.

---

## Architecture Overview

### High-Level Flow

```
WhatsApp User
    │
    ├─→ [WhatsApp Provider] ──┐
    │   (Baileys/Evolution/  │
    │    Cloud API)           │
    │                         │
    └─────────────────────────┼─→ [wa2ai Router]
                               │   • Normalizes messages
                               │   • Finds route
                               │   • Applies filters
                               │
                               └─→ [AI Agent (ADK)]
                                   • Processes message
                                   • Returns response
                                   │
                                   └─→ [wa2ai Router]
                                       • Sends response
                                       │
                                       └─→ [WhatsApp Provider]
                                           └─→ WhatsApp User
```

### Key Components

**1. WhatsApp Providers** (`router/src/providers/`)
- **Purpose**: Abstract layer for WhatsApp communication
- **Why**: Allows switching providers without changing routing logic
- **Current implementations**:
  - `BaileysProvider`: Direct WebSocket connection (lab mode, recommended)
  - `EvolutionProvider`: Webhook-based integration (lab mode, optional)
  - Future: `CloudProvider` for WhatsApp Cloud API (production)

**2. Router Core** (`router/src/core/`)
- **Purpose**: Pure business logic for message routing
- **Why**: Keeps routing rules independent of infrastructure
- **Key services**:
  - `RouterService`: Finds routes and applies filters
  - `MessageRouter`: Orchestrates the complete message flow
  - `AgentClient`: Interface for agent communication

**3. Agent Integration** (`router/src/infra/`)
- **Purpose**: Infrastructure layer for agent communication
- **Why**: Handles protocol-specific details (HTTP, timeouts, error handling)
- **Current implementation**: `HttpAgentClient` using ADK API format

**4. Route Management** (`router/src/routes-controller.ts`)
- **Purpose**: REST API for managing routes
- **Why**: Enables dynamic route configuration without code changes
- **Endpoints**: `POST /api/routes`, `GET /api/routes`, `PUT /api/routes/:id`, `DELETE /api/routes/:id`

### How Components Interact

1. **Message arrives** from WhatsApp → Provider normalizes to `IncomingMessage`
2. **MessageRouter** receives `IncomingMessage` → Calls `RouterService` to find route
3. **RouterService** checks channel ID → Applies regex filter (if configured) → Returns `Route`
4. **MessageRouter** creates `HttpAgentClient` with ADK config from route → Sends message to agent
5. **Agent** processes message → Returns ADK events array
6. **HttpAgentClient** extracts text from ADK response → Returns `AgentResponse`
7. **MessageRouter** receives response → Calls `WhatsAppProvider.sendMessage()` → Response sent to user

This architecture ensures that:
- Routing logic doesn't depend on specific providers
- New providers can be added without changing core logic
- Agent communication is standardized via ADK format
- Routes can be configured dynamically via API

---

## Quick Start

### Prerequisites

- **Node.js** 18 or higher
- **npm** (comes with Node.js)
- **Docker & docker-compose** (optional, for containerized deployment)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/wa2ai.git
cd wa2ai

# Install dependencies
npm install

# Build the project
npm run build
```

### Running wa2ai with Baileys (Recommended for Development)

**Step 1: Start the server**

```bash
npm start
```

The server will start on `http://localhost:3000` (configurable via `WA2AI_PORT`).

**Step 2: Connect WhatsApp**

1. Open `http://localhost:3000/qr` in your browser
2. You'll see a QR code (if not connected) or a "Connected" message
3. On your phone: WhatsApp → Settings → Linked Devices → Link a Device
4. Scan the QR code displayed in the browser
5. Verify connection: `curl http://localhost:3000/qr/status`

**Step 3: Configure a route**

Routes determine which agent handles messages from a specific WhatsApp channel (contact or group).

```bash
curl -X POST http://localhost:3000/api/routes \
  -H "Content-Type: application/json" \
  -d '{
    "channelId": "5493777239922",
    "agentEndpoint": "http://localhost:8000",
    "environment": "lab",
    "regexFilter": ".*help.*",
    "config": {
      "adk": {
        "appName": "my_agent",
        "baseUrl": "http://localhost:8000"
      }
    }
  }'
```

**Route Configuration Explained:**

- `channelId`: WhatsApp number or group ID (use `"*"` for wildcard route matching all channels)
- `agentEndpoint`: Base URL of your AI agent server
- `environment`: `"lab"` (development) or `"prod"` (production)
- `regexFilter`: (Optional) JavaScript RegExp pattern to filter messages by text content
  - Example: `".*help.*"` routes only messages containing "help"
  - Example: `"^Test"` routes only messages starting with "Test"
  - If omitted, all messages are routed
- `config.adk`: ADK agent configuration (required)
  - `appName`: ADK agent name (directory name)
  - `baseUrl`: ADK server base URL (optional, defaults to `agentEndpoint`)

**Step 4: Start your AI agent**

Your agent must implement the [ADK API format](docs/wa2ai-agent-contract.md). For testing, you can use the included mock agent:

```bash
node tests/fixtures/adk-mock-agent.js 8000 my_agent
```

**Step 5: Test the flow**

Send a WhatsApp message to the configured channel. If the message matches the route (and regex filter, if configured), it will be routed to your agent, and the agent's response will be sent back to WhatsApp.

### Using Docker

For containerized deployment:

```bash
# Start wa2ai with Baileys and PostgreSQL
docker compose -f infra/docker-compose.lab.yml up -d wa2ai-lab

# Check logs
docker compose -f infra/docker-compose.lab.yml logs -f wa2ai-lab

# Stop services
docker compose -f infra/docker-compose.lab.yml down
```

The Docker setup includes:
- `wa2ai-lab`: Main routing service
- `postgres`: PostgreSQL database for route persistence

---

## API Reference

### Route Management

**Create Route**
```http
POST /api/routes
Content-Type: application/json

{
  "channelId": "5493777239922",
  "agentEndpoint": "http://localhost:8000",
  "environment": "lab",
  "regexFilter": ".*help.*",
  "config": {
    "adk": {
      "appName": "my_agent",
      "baseUrl": "http://localhost:8000"
    }
  }
}
```

**List All Routes**
```http
GET /api/routes
```

**Get Specific Route**
```http
GET /api/routes/:channelId
```

**Update Route**
```http
PUT /api/routes/:channelId
Content-Type: application/json

{
  "channelId": "5493777239922",
  "agentEndpoint": "http://localhost:8000",
  "environment": "lab",
  "regexFilter": ".*help.*",
  "config": {
    "adk": {
      "appName": "my_agent",
      "baseUrl": "http://localhost:8000"
    }
  }
}
```

**Delete Route**
```http
DELETE /api/routes/:channelId
```

### System Endpoints

**Health Check**
```http
GET /health
```

**QR Code (HTML page)**
```http
GET /qr
```

**QR Code Status (JSON)**
```http
GET /qr/status
```

**QR Code Image (PNG)**
```http
GET /qr/image
```

### Route Filtering

Routes can include an optional `regexFilter` field using **JavaScript RegExp syntax** (ECMAScript standard). Messages are only routed if their text content matches the regex pattern.

**Examples:**
- `"^Test"` - Messages starting with "Test"
- `".*help.*"` - Messages containing "help" (case-sensitive)
- `"[Mm][Aa][Kk][Aa][Nn][Aa][Kk][Ii]"` - Messages containing "makanaki" (case-insensitive)
- `"^[0-9]+$"` - Messages containing only digits

**Note:** If `regexFilter` is not provided, all messages are routed (default behavior).

---

## Configuration

Environment variables are configured in `.env` (see `.env.example` for template):

| Variable | Default | Description |
|----------|---------|-------------|
| `WA2AI_PORT` | `3000` | Server port |
| `WA2AI_DEBUG` | `false` | Enable debug logging (detailed logs) |
| `WA2AI_BAILEYS_AUTH_DIR` | `./auth_info_baileys` | Baileys authentication data directory |
| `WA2AI_TEST_CHANNEL_ID` | - | Test channel ID for E2E testing (optional) |

**PostgreSQL Configuration** (for Docker deployments):
- Connection details are managed internally by Docker Compose
- No environment variables needed (see `infra/docker-compose.lab.yml`)

---

## Development

### Project Structure

```
wa2ai/
├── router/src/          # Source code
│   ├── core/            # Domain layer (business logic)
│   │   ├── models.ts    # Domain entities
│   │   ├── router-service.ts  # Route finding logic
│   │   └── message-router.ts   # Message orchestration
│   ├── providers/       # WhatsApp provider implementations
│   │   ├── baileys-provider.ts
│   │   └── evolution-provider.ts
│   ├── infra/           # Infrastructure layer
│   │   ├── http-agent-client.ts  # ADK agent client
│   │   └── postgres-routes-repository.ts
│   ├── routes-controller.ts      # Route management API
│   ├── webhooks-controller.ts    # Webhook endpoints
│   └── index.ts          # Application entry point
├── tests/               # Test suites
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   └── e2e/              # End-to-end tests
├── infra/               # Docker configurations
├── docs/                # Technical documentation
└── project/             # Project management docs
```

### Available Scripts

```bash
# Development
npm run dev          # Start with hot reload (watch mode)
npm run build        # Build TypeScript to JavaScript
npm start            # Start production server

# Testing
npm test             # Run all tests
npm run test:watch   # Run tests in watch mode
npm run test:unit    # Run unit tests only
npm run test:integration  # Run integration tests only

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues automatically
npm run format       # Format code with Prettier
npm run type-check   # Type check without building
```

### Testing

The project includes comprehensive test coverage:

- **Unit Tests**: Core domain logic, services, and adapters (no network I/O)
- **Integration Tests**: End-to-end message routing flows with mocked dependencies
- **E2E Tests**: Manual testing guide for real WhatsApp integration

Run tests:
```bash
npm test
```

For end-to-end testing with real WhatsApp, see [`tests/e2e/README.md`](tests/e2e/README.md).

---

## Current Status

**Phase 1: Laboratory Mode** - In Active Development

### ✅ Completed

- Baileys direct connection with QR code authentication
- Direct routing to agents (no HTTP webhook overhead)
- Route management REST API (CRUD operations)
- PostgreSQL persistence for routes
- Connection state management with auto-reconnection
- Regex filtering for message routing
- ADK agent integration (HTTP client with ADK API format)
- Comprehensive test suite (230+ tests)
- Docker Compose setup for lab environment

### 🔄 In Progress

- End-to-end testing documentation and validation
- Performance optimization
- Error handling improvements

### 📋 Planned (Phase 1)

- Advanced routing rules (time-based, user-based)
- Route validation improvements
- Enhanced logging and monitoring

### 🗺️ Future (Phase 2)

- WhatsApp Cloud API integration (official Meta API)
- Web UI for route management
- Metrics and monitoring dashboard
- Multi-instance support
- Advanced security features

---

## Roadmap

### Phase 1: Laboratory Mode (Current)

**Goal**: Enable development and testing of AI agents with WhatsApp using unofficial providers.

- [x] Baileys integration
- [x] Direct routing implementation
- [x] Route management API
- [x] PostgreSQL persistence
- [x] ADK agent integration
- [ ] Advanced routing rules
- [ ] Enhanced monitoring

### Phase 2: Production Mode (Planned)

**Goal**: Production-ready deployment with official WhatsApp Cloud API.

- [ ] WhatsApp Cloud API integration
- [ ] Web UI for route management
- [ ] Metrics and monitoring
- [ ] Multi-instance support
- [ ] Advanced security and authentication

---

## Known Issues and Limitations

### Current Limitations

1. **Single WhatsApp Account**: Baileys supports one WhatsApp account per instance
2. **No User Authentication**: Route management API has no authentication (use firewall/VPN in production)
3. **Limited Error Recovery**: Some edge cases in connection recovery may need improvement
4. **No Rate Limiting**: API endpoints don't have rate limiting (add in production)

### Known Issues

- QR code expires after ~20 seconds; the page auto-refreshes with a new code
- Group messages use combined channel IDs (format: `number-groupid@g.us`)
- Regex filters are case-sensitive by default (use character classes for case-insensitive matching)

**Reporting Issues**: Please open an issue on GitHub with:
- Description of the problem
- Steps to reproduce
- Expected vs. actual behavior
- Environment details (Node.js version, OS, etc.)

---

## Contributing

We welcome contributions! The project is in active development, and there are many areas where help is needed.

### How to Contribute

1. **Fork the repository** and create a feature branch
2. **Read the development guidelines** in [`AGENTS.md`](AGENTS.md)
3. **Follow the coding standards**:
   - Clean Architecture principles
   - Comprehensive tests for new features
   - JSDoc comments for all functions/classes
   - Conditional debug logging
4. **Write clear commit messages** (conventional commit format preferred)
5. **Submit a pull request** with a clear description of changes

### Development Guidelines

Before contributing, please read:
- **[AGENTS.md](AGENTS.md)**: Complete development guidelines, architecture, and conventions
- **[Design Document](project/wa2ai_design.md)**: Architecture and design decisions
- **[Agent Contract](docs/wa2ai-agent-contract.md)**: How wa2ai communicates with agents

### Areas Needing Help

- Testing and test coverage improvements
- Documentation improvements
- Performance optimization
- Error handling enhancements
- New feature development (see Roadmap)

---

## Documentation

### Technical Documentation

- **[Design Document](project/wa2ai_design.md)**: Overall architecture and design decisions
- **[Agent Contract](docs/wa2ai-agent-contract.md)**: wa2ai ↔ Agent communication specification
- **[Phase 1 Technical Docs](docs/phase1-lab.md)**: Laboratory mode implementation details
- **[Infrastructure Guide](infra/README.md)**: Docker setup and deployment

### Development Resources

- **[AGENTS.md](AGENTS.md)**: Development guidelines, architecture, testing, and conventions
- **[End-to-End Testing](tests/e2e/README.md)**: Guide for testing with real WhatsApp
- **[Project Management](project/)**: Gantt charts, task breakdowns, and planning docs

---

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- [Baileys](https://github.com/WhiskeySockets/Baileys) - WhatsApp Web API implementation
- [Evolution API](https://github.com/EvolutionAPI/evolution-api) - WhatsApp Business API
- [ADK](https://github.com/your-adk-repo) - Agent Development Kit
