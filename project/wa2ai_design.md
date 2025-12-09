# WhatsApp ↔ ADK Agents Integration Project

This document describes the architecture in **two phases** (Laboratory and Production) to connect AI agents developed in ADK with WhatsApp through an intelligent router and interchangeable providers.

---

## 1. General Objective
Enable development, testing, and deployment of AI agents connected to WhatsApp through:
- A **laboratory** environment based on unofficial technologies (Evolution API + Baileys).
- A **production** environment based on the **official WhatsApp Cloud API**.
- A decoupled **router** that decides which agent processes each message.
- An architecture that allows moving an agent from *lab → prod* without modifying code.

---

## 2. Main Components
### 2.1 WhatsApp Provider
Layer that abstracts interaction with WhatsApp.
- **Lab:** Evolution API (unofficial, Baileys) or Baileys directly.
- **Prod:** WhatsApp Cloud API (official) or Evolution API configured as a facade.

There are three provider implementations:
- `EvolutionProvider` - Uses Evolution API as intermediary (lab)
- `BaileysProvider` - Uses Baileys library directly (lab, no Evolution API dependency)
- `CloudApiProvider` - Uses official WhatsApp Cloud API (prod)

### 2.2 Router
Node.js/TypeScript service that:
- Receives webhooks from WhatsApp.
- Normalizes messages.
- Determines which agent should respond.
- Sends the response to the corresponding provider (lab or prod).

### 2.3 ADK Agents
Independent services (Python/ADK), exposed via HTTP, that receive messages and return responses without knowing WhatsApp details.

---

## 3. Phase 1 – Laboratory
### 3.1 Services to deploy

**Option A: Using Evolution API (original approach)**
1. **postgres**
   - PostgreSQL 16 database container.
   - Stores Evolution API data (instances, messages, contacts, chats, etc.).
   - Required by Evolution API v2.3.7.

2. **evolution-api-lab**
   - Docker container (Evolution API v2.3.7).
   - Connected to PostgreSQL database.
   - Associated with a test WhatsApp number.

3. **wa2ai-lab**
   - Docker container or Cloud Run.
   - Configured to use `EvolutionProvider`.

4. **ADK Agents (lab)**
   - Independent deployment.

**Option B: Using Baileys directly (alternative approach)**
1. **wa2ai-lab**
   - Docker container or Cloud Run.
   - Configured to use `BaileysProvider`.
   - Directly manages WhatsApp connection using Baileys library.
   - No Evolution API or PostgreSQL dependency.

2. **ADK Agents (lab)**
   - Independent deployment.

### 3.2 Flow

**Option A: Using Evolution API**
1. User sends message to lab number.
2. Evolution API → webhook → wa2ai (lab).
3. wa2ai determines agent.
4. wa2ai sends response via Evolution API.

**Option B: Using Baileys directly**
1. User sends message to lab number.
2. Baileys (within wa2ai) receives message directly.
3. wa2ai determines agent.
4. wa2ai sends response via Baileys directly.

### 3.3 Infrastructure

**Option A: Using Evolution API**
Suggested file `docker-compose.lab.yml` with:
- postgres (PostgreSQL database)
- evolution-api-lab
- wa2ai-lab

**Option B: Using Baileys directly**
Suggested file `docker-compose.lab.yml` with:
- wa2ai-lab (no Evolution API or PostgreSQL needed)

The router can use either `EvolutionProvider` or `BaileysProvider` for lab environment, and already includes the interface for future `prod` (`CloudApiProvider`).

---

## 4. Phase 2 – Production
### 4.1 Services to deploy
1. **wa2ai-prod**
   - New router instance.
   - Uses `CloudApiProvider`.

2. **WhatsApp Cloud API**
   - External service provided by Meta.
   - Webhook configured pointing to `wa2ai-prod`.

3. Evolution API (lab) and wa2ai (lab) continue to exist.

### 4.2 Production flow
1. User writes to business number.
2. Cloud API → webhook → wa2ai (prod).
3. wa2ai (prod) calls ADK agent.
4. wa2ai (prod) sends response via Cloud API.

### 4.3 Agent promotion
Agents move from *lab → prod* by modifying only the router **routes**:
- Without changing agent code.
- Without changing the Provider.
- Without modifying Router logic.

Typical route tables:

**Lab:**
```
channel_id: grupo-test
agent_endpoint: https://agents/support
env: lab
```

**Prod:**
```
channel_id: cliente-X
agent_endpoint: https://agents/support
env: prod
```

---

## 5. Final Architecture
```
             WhatsApp (Lab)                     WhatsApp (Prod - Cloud API)
                   |                                      |
          Evolution API (lab)                       Meta Webhooks
                   |                                      |
             wa2ai (lab) --------------------- wa2ai (prod)
                   \______________________  ___________________/
                                      \/
                                  ADK Agents
```

---

## 6. Repository Structure
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
        baileys-provider.ts
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

## 7. Benefits
- Safe development without affecting real numbers.
- Transparent migration of agents to production.
- Simple stack to operate and extend.
- Firm separation between messaging, routing, and agent logic.

---

## 8. Next steps
- Define `routes` schema (DB or file).
- Specify intermediate payloads.
- Create Docker images for wa2ai (lab) and wa2ai (prod).
- Integrate the first ADK agent.
