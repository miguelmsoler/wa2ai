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

```
WhatsApp (Lab) → Evolution API → wa2ai Router → ADK Agent → Router → WhatsApp
```

Phase 2:

```
WhatsApp (Prod - Cloud API) → wa2ai Router → ADK Agent → Router → WhatsApp
```

### Key Components

* **Evolution API (lab)** — Unofficial provider that exposes incoming messages through webhooks.
* **Router (wa2ai)** — Node.js/TypeScript service that processes messages, routes them, calls agents, and returns responses.
* **ADK Agents** — External services providing conversational logic.
* **Provider Abstraction** — `EvolutionProvider` (Phase 1) and `CloudApiProvider` (Phase 2).

---

## 📦 Core Features

* Webhook endpoint to receive WhatsApp messages.
* Message normalization (`IncomingMessage` model).
* Dynamic routing per contact/group.
* HTTP forwarding to ADK agents.
* Returning responses to WhatsApp.
* Structured logging and healthcheck endpoint.

---

## 🧪 Current Status: Phase 1 (Laboratory Mode)

Phase 1 focuses on:

* Deploying Evolution API in a controlled environment.
* Implementing the Router with Evolution Provider.
* Connecting the already existing ADK agent.
* Achieving a full end-to-end flow.

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
        cloud-provider.ts
      core/
        router-service.ts
        routes-repo.ts
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

**Note:** Evolution API is automatically deployed via Docker Compose using the `atendai/evolution-api:v2.1.1` image. See `infra/docker-compose.lab.yml` for configuration details.

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
