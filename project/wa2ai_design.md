# WhatsApp ↔ AI Agents Integration Project

Gateway that connects WhatsApp with AI agents (ADK or others), enabling message routing based on configurable rules.

---

## 1. Objective

Enable development, testing, and deployment of AI agents connected to WhatsApp through:
- **Laboratory environment**: Unofficial technologies (Evolution API or Baileys direct connection)
- **Production environment**: Official WhatsApp Cloud API
- **Decoupled router**: Routes messages to appropriate agents without coupling to WhatsApp provider
- **Seamless migration**: Move agents from lab → prod by changing routes only

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        WhatsApp                              │
└──────────────┬──────────────────────────────┬────────────────┘
               │                              │
      ┌────────▼────────┐          ┌────────▼────────┐
      │  Lab Provider   │          │  Prod Provider  │
      │  (Evolution API │          │  (Cloud API)    │
      │   or Baileys)   │          │                 │
      └────────┬────────┘          └────────┬────────┘
               │                              │
               └──────────┬───────────────────┘
                          │
                  ┌───────▼────────┐
                  │  wa2ai Router  │
                  │  (Message      │
                  │   Routing)     │
                  └───────┬────────┘
                          │
                  ┌───────▼────────┐
                  │  AI Agents     │
                  │  (ADK/HTTP)    │
                  └────────────────┘
```

### Key Components

1. **WhatsApp Providers**: Abstract layer for WhatsApp communication
   - **Lab**: Evolution API (webhook-based) or Baileys (direct WebSocket)
   - **Prod**: WhatsApp Cloud API (webhook-based)

2. **Router (wa2ai)**: Node.js/TypeScript service that:
   - Receives messages from WhatsApp providers
   - Normalizes messages into domain model
   - Routes messages to appropriate agents based on channel ID
   - Returns agent responses to WhatsApp

3. **AI Agents**: Independent HTTP services that process messages and return responses

---

## 3. Phase 1: Laboratory

### 3.1 Provider Options

**Option A: Evolution API**
- Requires PostgreSQL database
- Webhook-based message delivery
- Multi-instance support
- More complex setup

**Option B: Baileys Direct Connection** ⭐ (Current implementation)
- No external dependencies
- Direct WebSocket connection
- Lower latency (direct routing)
- Simpler architecture for single-instance deployments

### 3.2 Message Flow

**Evolution API Flow:**
```
WhatsApp → Evolution API → HTTP Webhook → wa2ai → Agent → Response → WhatsApp
```

**Baileys Direct Routing Flow:**
```
WhatsApp → Baileys WebSocket → wa2ai (direct callback) → Agent → Response → WhatsApp
```

**Direct Routing Benefits:**
- No HTTP webhook overhead
- Lower latency
- Simpler architecture
- Single-instance friendly

### 3.3 Infrastructure

**Option A (Evolution API):**
- PostgreSQL container
- Evolution API container
- wa2ai container

**Option B (Baileys):**
- wa2ai container only

---

## 4. Phase 2: Production

### 4.1 Services

1. **wa2ai-prod**: Router instance using Cloud API provider
2. **WhatsApp Cloud API**: Official Meta service with webhook configured
3. **Lab environment**: Continues to exist independently

### 4.2 Flow

```
WhatsApp (Business Number) → Cloud API → HTTP Webhook → wa2ai-prod → Agent → Response → WhatsApp
```

### 4.3 Agent Promotion

Agents move from lab → prod by updating routes only:
- No agent code changes
- No provider changes
- No router logic changes

**Example Routes:**
- Lab: `channel_id: grupo-test` → `agent_endpoint: https://agents/support`
- Prod: `channel_id: cliente-X` → `agent_endpoint: https://agents/support`

---

## 5. Architectural Decisions

### 5.1 Direct Routing (Baileys)

**Decision**: Use direct callback-based routing for Baileys connections instead of HTTP webhooks.

**Rationale**:
- Lower latency (no HTTP overhead)
- Simpler architecture
- Better performance for single-instance deployments

**Implementation**: Messages flow directly from Baileys WebSocket → MessageRouter → Agent, bypassing HTTP webhook layer.

**Note**: Evolution API and Cloud API continue using HTTP webhooks (appropriate for their architecture).

### 5.2 Route Management Separation

**Decision**: Separate route management API from webhook endpoints.

**Rationale**:
- Clear separation of concerns (configuration vs. message flow)
- Easier maintenance and extension
- Follows Single Responsibility Principle

**Implementation**: 
- `webhooks-controller.ts`: Handles incoming messages and QR endpoints
- `routes-controller.ts`: Handles route CRUD operations (`/api/routes`)

### 5.3 Clean Architecture

**Decision**: Follow Clean Architecture principles with clear layer boundaries.

**Layers**:
- **Core**: Domain models, business rules, interfaces (no dependencies)
- **Providers**: WhatsApp provider implementations (depend on core only)
- **Controllers**: HTTP entry points (depend on providers and core)

**Benefits**:
- Testability
- Maintainability
- Provider interchangeability

### 5.4 RESTful API Standards

**Decision**: Follow RESTful API best practices.

**Rationale**:
- Consistency across all API endpoints
- Industry-standard patterns for better developer experience
- Easier integration and maintenance

**Implementation**:
- All HTTP endpoints follow RESTful conventions (nouns for resources, standard HTTP methods)
- Consistent error responses with appropriate status codes
- JSON format for all request/response bodies
- Versioning via URL path (`/api/v1/...`)
- **First, consult the `refs/` directory** for RESTful API specification documents (contents vary by developer and environment)

**Note**: The `refs/` directory is the first source to consult for any documentation needs. It contains documents compiled by developers as the project progresses and is not versioned (local use only). The contents vary by developer and environment.

---

## 6. Core Components

### 6.1 Message Routing

- **MessageRouter**: Orchestrates routing flow (finds route → sends to agent → returns response)
- **RouterService**: Finds routes for messages using RoutesRepository
  - Supports regex filtering: Routes can include a `regexFilter` field to filter messages by text content
  - Uses JavaScript RegExp (ECMAScript standard) for pattern matching
  - If regex filter is present, only messages matching the pattern are routed
- **AgentClient**: HTTP client for agent communication (timeout handling, error handling)

### 6.2 Route Storage

- **RoutesRepository**: Abstraction for route storage
- **InMemoryRoutesRepository**: Current implementation (in-memory)
- **Route Model**: Contains `channelId`, `agentEndpoint`, `environment`, and optional `regexFilter`
- **Future**: Database-backed implementation

**Route Filtering:**
Routes support an optional `regexFilter` field that uses **JavaScript RegExp** syntax (ECMAScript standard) to filter messages by text content. Examples:
- `"^Test"` - Only route messages starting with "Test"
- `".*help.*"` - Only route messages containing "help"
- `"^[0-9]+$"` - Only route messages containing only digits

If a route has a `regexFilter`, the message text must match the pattern for the route to be selected. Invalid regex patterns are logged as errors and the route is treated as non-matching for safety.

### 6.3 Message Handling

- **BaileysConnectionService**: Manages Baileys WebSocket connection
- **Message Adapters**: Normalize provider-specific messages to domain model
- **Message Handlers**: Process messages and return responses

---

## 7. Repository Structure

```
wa2ai/
├── router/src/
│   ├── index.ts                    # Application entry point
│   ├── webhooks-controller.ts      # Webhook endpoints
│   ├── routes-controller.ts        # Route management API
│   ├── providers/                  # WhatsApp providers
│   │   ├── baileys-connection.ts
│   │   ├── evolution-provider.ts
│   │   └── cloud-provider.ts
│   └── core/                       # Domain layer
│       ├── models.ts
│       ├── router-service.ts
│       ├── message-router.ts
│       ├── agent-client.ts
│       └── routes-repository.ts
├── infra/                          # Infrastructure configs
├── tests/                          # Test suites
└── docs/                           # Technical documentation
```

---

## 8. Benefits

- **Safe development**: Test without affecting production numbers
- **Easy migration**: Move agents to production by changing routes only
- **Simple stack**: Minimal dependencies, easy to operate
- **Clear separation**: Messaging, routing, and agent logic are decoupled
- **Provider flexibility**: Switch between providers without code changes

---

## 9. Next Steps

- [ ] Implement persistent route storage (database)
- [ ] Add route validation and error handling
- [ ] Integrate first ADK agent
- [ ] Complete end-to-end testing
- [ ] Prepare production deployment

---

## 10. Documentation Sources

### 10.1 Primary Documentation Source: `refs/` Directory

**The `refs/` directory is the first source to consult for any documentation needs.**

- Contains documents compiled by developers as the project progresses
- Includes reference implementations, patterns, and specifications
- **Not versioned** (in `.gitignore`) - for local use only
- **Contents vary by developer and environment** - each developer can add their own documents and symlinks
- Do not assume specific files exist in `refs/` - check what's available in your local environment

### 10.2 Project Documentation

For detailed technical documentation, see:
- `refs/` directory - First source for any documentation needs (RESTful API specs, library references, etc.)
- `docs/phase1-lab.md` - Phase 1 technical documentation (laboratory mode with Evolution API)
- `docs/phase2-prod.md` - Phase 2 technical documentation (production mode with WhatsApp Cloud API)
- `project/wa2ai_design.md` - Overall architecture and design decisions (this document)
- `AGENTS.md` - Development guidelines and conventions

---

**Note**: Always consult `refs/` directory first for documentation, then refer to project-specific documentation in `docs/` and `project/`.
