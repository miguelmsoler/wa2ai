# wa2ai

**wa2ai** is a gateway that connects **WhatsApp** with **AI agents** (ADK or others), enabling message routing based on configurable rules.

The project is designed in **two phases**:

1. **Laboratory mode** (current phase) — Integrates WhatsApp via Evolution API (unofficial) to enable rapid development and testing.
2. **Production mode** — Replaces the provider with the **official WhatsApp Cloud API**, while keeping the Router and internal structure intact.

wa2ai abstracts the WhatsApp provider behind a common interface, allowing seamless migration from Evolution API to Cloud API without modifying Router logic or the agents.

---

## 🚀 Project Purpose

Create a routing service capable of receiving WhatsApp messages, interpreting them, forwarding them to the appropriate AI agent, and returning responses to end users.

At the end of Phase 1, the system will support:

* Receiving real WhatsApp messages (laboratory mode).
* Passing them through Evolution API → Router → existing ADK agent.
* Sending the agent’s reply back to WhatsApp.
* Configuring different agents per contact or group.

---

## 🏗️ High-Level Architecture

### Phase 1 - Laboratory Mode

**Option A: Evolution API (Webhook-based)**
```
WhatsApp (Lab) → Evolution API → wa2ai Router (webhooks) → ADK Agent → Router → WhatsApp
```

**Option B: Baileys (Direct Connection)**
```
WhatsApp (Lab) → Baileys (Direct) → wa2ai Router (direct routing) → ADK Agent → Router → WhatsApp
```

### Phase 2 - Production Mode

```
WhatsApp (Prod - Cloud API) → wa2ai Router → ADK Agent → Router → WhatsApp
```

### Key Components

* **Evolution API (lab)** — Unofficial provider that exposes incoming messages through webhooks.
* **Baileys (lab)** — Direct WhatsApp Web connection using Baileys library (alternative to Evolution API).
* **Router (wa2ai)** — Node.js/TypeScript service that processes messages, routes them, calls agents, and returns responses.
* **MessageRouter** — Application service that coordinates routing from providers to agents.
* **AgentClient** — HTTP client for communicating with AI agent endpoints.
* **RoutesRepository** — Storage for routing rules (channel → agent endpoint mapping).
* **ADK Agents** — External services providing conversational logic.
* **Provider Abstraction** — `EvolutionProvider`, `BaileysProvider` (Phase 1) and `CloudApiProvider` (Phase 2).

---

## 📦 Core Features

* **Multiple Provider Support**
  * Evolution API integration (webhook-based)
  * Baileys direct connection (QR code authentication)
  * WhatsApp Cloud API (Phase 2)
* **Message Routing**
  * Webhook endpoint to receive WhatsApp messages (Evolution API)
  * Direct message handling (Baileys)
  * Message normalization (`IncomingMessage` model)
  * Dynamic routing per contact/group via `RoutesRepository`
* **Agent Communication**
  * HTTP forwarding to ADK agents via `AgentClient`
  * Automatic response handling
  * Error handling and retries
* **Infrastructure**
  * Structured logging with debug mode
  * Health check endpoints
  * Docker support for lab and production environments
  * QR code display for Baileys authentication

---

## 🧪 Current Status: Phase 1 (Laboratory Mode)

Phase 1 focuses on:

* ✅ Deploying Evolution API in a controlled environment.
* ✅ Implementing Baileys direct connection with QR code authentication.
* ✅ Implementing the Router with both Evolution Provider and Baileys Provider.
* ✅ Direct routing from Baileys to agents (no HTTP webhook overhead).
* ✅ Message routing system with configurable routes.
* ✅ Agent communication via HTTP.
* 🔄 Connecting the already existing ADK agent.
* 🔄 Achieving a full end-to-end flow.

**Current Implementation:**
- Baileys connection with QR code scanning
- Connection state management and auto-reconnection
- Message event handlers
- Direct routing to agents (MessageRouter)
- Routes repository (in-memory, ready for database)
- Agent client with timeout and error handling

Once Phase 1 is complete, the Router will be ready for integration with the official Cloud API.

---

## 📁 Expected Repository Structure

As development progresses, the repo will evolve toward:

```
wa2ai/
  README.md
  project/
    wa2ai_design.md
    wa2ai_phase_1_gantt.md
    wa2ai_phase_1_task_breakdown.md
  docs/
    phase1-lab.md
    phase2-prod.md

  router/
    src/
      index.ts
      webhooks-controller.ts
      providers/
        evolution-provider.ts
        baileys-connection.ts
        baileys-message-adapter.ts
        cloud-provider.ts
      core/
        router-service.ts
        routes-repository.ts
        message-router.ts
        agent-client.ts
        message-handler.ts
        models.ts

  infra/
    docker-compose.lab.yml
    docker-compose.prod.yml
```

**Note:** 
- `project/` contains project management documentation (GANTT, task breakdowns, design documents).
- `docs/` contains technical solution documentation (architecture, API references, operation guides).

---

## 🔧 Requirements (Phase 1)

### Development Tools
* Node.js 18+
* TypeScript
* Docker & docker-compose

### External Services
* A WhatsApp number for laboratory mode
* An ADK agent accessible via HTTP

**Note:** 
- Evolution API is automatically deployed via Docker Compose using the `evoapicloud/evolution-api:v2.3.7` image. See `infra/docker-compose.lab.yml` for configuration details.
- Baileys can be used as an alternative to Evolution API, providing direct WhatsApp connection without requiring Evolution API deployment.

## 🚀 Quick Start

### Using Baileys (Direct Connection)

1. **Start the server:**
   ```bash
   npm install
   npm run build
   npm start
   ```

2. **Scan QR code:**
   - Open http://localhost:3000/qr in your browser
   - Scan with WhatsApp: Settings → Linked Devices → Link a Device

3. **Configure routes:**
   - Routes can be configured programmatically or via API (coming soon)
   - Example route: `channelId: '5491155551234'` → `agentEndpoint: 'http://localhost:8000/agent'`

4. **Send a message:**
   - Messages from configured channels will be automatically routed to agents
   - Agent responses will be sent back to WhatsApp automatically

### Using Evolution API (Webhook-based)

See `infra/README.md` for detailed instructions on setting up Evolution API with Docker.

---

## 🔮 Future of the Project (Phase 2)

* Integration with the official WhatsApp Cloud API.
* Transparent provider replacement.
* Multi-agent support and advanced routing.
* Logging, metrics, and dashboards.

---

## 📝 License

MIT License

---

## 🤝 Contributions

The project is in an early stage. Contribution guidelines will be added after Phase 1 stabilizes.
