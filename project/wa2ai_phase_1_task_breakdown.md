# Phase 1 – Task breakdown (WhatsApp ↔ ADK Laboratory) with estimates

Objective: make the laboratory environment operational where real WhatsApp messages pass through a WhatsApp provider (Evolution API or Baileys) → wa2ai → Existing ADK Agent → WhatsApp.
Each section and each task includes description and **man-hour estimate** considering that you're doing the development using **vibe-coding with Cursor**.

---

## 1. Environment preparation
Ensures the technical environment is ready before implementing wa2ai logic.
**Total estimate:** 4–6 h

### 1.1. Review of existing ADK agent
- **Review current ADK agent HTTP contract (0.5 h)** — Confirm method, path, body and response format.
- **Verify agent execution environment (0.5 h)** — Confirm if it runs on Cloud Run/local and access.
- **Manually test the endpoint (0.5 h)** — Test with curl/HTTPie.

### 1.2. Local development environment
- **Create repo and base structure (1 h)** — Initialize project and folders.
- **Configure Node.js + TypeScript (0.5–1 h)** — tsconfig, eslint, prettier.

### 1.3. Basic infrastructure
- **Install/configure Docker and docker-compose (1 h)** — Verify environment.
- **Create initial `docker-compose.lab.yml` (1–1.5 h)** — Placeholder services.

---

## 2. Evolution API integration (Lab)
Evolution API is deployed and configured to receive WhatsApp messages.
**Total estimate:** 6–8 h

**Note:** Both Evolution API (Section 2) and Baileys direct integration (Section 2A) can be implemented. They are not mutually exclusive and provide different provider options for wa2ai.

### 2.1. Start Evolution API
- **Choose image/tag + minimum config (0.5 h)** — Token, ports.
- **Add service to docker-compose and start it (1 h)** — Validate health.

### 2.2. Connect laboratory WhatsApp number
- **Scan QR and associate the account (1 h)** — Initial linking.
- **Send test message and validate reception (1 h)** — Logs or API.

### 2.3. Configure webhook to wa2ai
- **Define webhook URL (0.2 h)** — Normally `/webhooks/whatsapp/lab`.
- **Configure webhook in Evolution API (0.5 h)** — Adjust settings.
- **Validate webhook call (1–1.5 h)** — Using mock or wa2ai.

---

## 2A. Baileys direct integration (Lab)
Direct integration with WhatsApp using Baileys library, bypassing Evolution API.
**Total estimate:** 8–12 h

**Note:** Both Evolution API (Section 2) and Baileys direct integration (Section 2A) can be implemented. They are not mutually exclusive and provide different provider options for wa2ai.

### 2A.1. Baileys documentation review
- **Review Baileys library documentation (1–1.5 h)** — Understand API, connection flow, message handling.
- **Review Baileys examples and best practices (0.5–1 h)** — Connection management, QR generation, message sending.

### 2A.2. BaileysProvider implementation
- **Install Baileys dependencies (0.2 h)** — Add `@whiskeysockets/baileys` package.
- **Implement `BaileysProvider` class (2–3 h)** — Connection management, QR code generation, message receiving.
- **Implement message sending via Baileys (1–1.5 h)** — Send text, media, handle errors.

### 2A.3. QR code generation and connection
- **Integrate QR code display/endpoint (0.5–1 h)** — Expose QR for scanning.
- **Handle connection state management (1 h)** — Connect, disconnect, reconnect logic.
- **Test WhatsApp connection and QR scan (0.5–1 h)** — Validate connection flow.

### 2A.4. Message reception and webhook integration
- **Implement message event handlers (1–1.5 h)** — Listen to incoming messages.
- **Integrate with webhooks-controller or direct routing (0.5–1 h)** — Connect Baileys events to router.
- **Test message reception end-to-end (0.5–1 h)** — Validate complete flow.

### 2A.5. Update docker-compose for Baileys option
- **Create/update `docker-compose.lab.yml` for Baileys mode (0.5 h)** — Remove Evolution API dependencies.
- **Update environment variables (0.2 h)** — Provider selection (Evolution vs Baileys).

---

## 3. wa2ai implementation (Lab)
It's the central piece: receives messages, interprets them, calls the agent and responds.
**Total estimate:** 12–16 h

### 3.1. Models and internal contracts
- **Define `IncomingMessage` (0.5 h)** — Payload normalization.
- **Define `OutgoingMessage` (0.5 h)** — Messages to provider.
- **Define `Route` and document models (0.5 h)** — Channel→Agent.

### 3.2. WhatsApp provider interface
- **Define `WhatsAppProvider` interface (0.5 h)** — Common contract.
- **Implement `EvolutionProvider` (1.5–2 h)** — HTTP calls + errors. (Section 2)
- **Implement `BaileysProvider` (2–3 h)** — Direct Baileys integration. (Section 2A)

### 3.3. Routing service
- **Implement `RoutesRepository` (0.5–1 h)** — JSON or in-memory.
- **Implement `RouterService.onIncomingMessage` (2.5–3 h)** — Core flow.
- **Process agent response and send message (1 h)** — Via provider.

### 3.4. wa2ai HTTP controller
- **Create `webhooks-controller.ts` (1–1.5 h)** — Endpoint, parsing.

### 3.5. Application configuration
- **Create `index.ts` + env vars reading (1 h)** — Server and logs.

### Internal tests
- **wa2ai smoke tests (1–1.5 h)** — Basic validation.

---

## 4. Connection with existing ADK agent
Ensures compatibility between wa2ai and ADK agent.
**Total estimate:** 3–4 h

### 4.1. Define wa2ai → Agent contract
- **Agree on request/response and document (0.5 h)** — Definitive JSON.

### 4.2. Implement HTTP client to agent
- **Create `callAgent` with timeout and errors (1 h)** — Robust client.

### 4.3. wa2ai ↔ Agent tests
- **Test simulated call (1 h)** — Validate response.
- **Add error logging (0.5 h)**.

---

## 5. End-to-end integration (E2E)
Validates the complete pipeline.
**Total estimate:** 4–6 h

### 5.1. Configure initial route
- **Create channel→agent route (0.5 h)** — For real tests.

### 5.2. End-to-end test
- **Start stack with docker-compose (0.5 h)**.
- **Send real message from WhatsApp and verify flow (1.5–2 h)**.
- **Validate logs and final response (1 h)**.

### 5.3. Basic error handling
- **Fallback / agent failure handling (0.5–1 h)**.

---

## 6. Observability and DX
Improves system maintainability and operation.
**Total estimate:** 2–3 h

### 6.1. Logs and monitoring
- **Structured logging (1 h)**.
- **`/health` endpoint (0.5 h)**.

### 6.2. Development scripts
- **Add npm scripts (`dev`, `build`, `start`) (0.5–1 h)**.
- **Document single startup command (0.5 h)**.

---

## 7. Documentation
For reproducibility and future transfer.
**Total estimate:** 2–3 h

### 7.1. Architecture documentation
- **Complete `docs/phase1-lab.md` (1.5 h)**.
- **Add flow diagrams (0.5 h)**.

### 7.2. Operation guide
- **Stack startup, QR, add routes (1 h)**.
- **Troubleshooting (0.5 h)**.

---

## 8. Phase 1 closure
### 8.1. Final checklist (0.5 h)
Confirm:
- Complete flow working.
- Routes can be modified without touching code.
- Minimum documentation complete.
- wa2ai ready to add Cloud API in Phase 2.

---

## 🧮 Phase 1 total estimate
**≈ 41 – 56 man-hours** (implementing both providers - Sections 2 + 2A)

Depending on pace, interruptions and fluency with vibe-coding.
**Note:** Both Evolution API (Section 2) and Baileys direct integration (Section 2A) are implemented. If Evolution API webhook synchronization issues are encountered, Section 2 can be left partially completed while Section 2A provides a working alternative.
