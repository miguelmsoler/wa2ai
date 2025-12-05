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
- **Lab:** Evolution API (unofficial, Baileys).
- **Prod:** WhatsApp Cloud API (official) or Evolution API configured as a facade.

There are two provider implementations:
- `EvolutionProvider`
- `CloudApiProvider`

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
1. **evolution-api-lab**
   - Docker container.
   - Associated with a test WhatsApp number.

2. **wa2ai-lab**
   - Docker container or Cloud Run.
   - Configured to use `EvolutionProvider`.

3. **ADK Agents (lab)**
   - Independent deployment.

### 3.2 Flow
1. User sends message to lab number.
2. Evolution API → webhook → wa2ai (lab).
3. wa2ai determines agent.
4. wa2ai sends response via Evolution API.

### 3.3 Infrastructure
Suggested file `docker-compose.lab.yml` with:
- evolution-api-lab
- wa2ai-lab

The router only uses `lab` provider, but already includes the interface for future `prod`.

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
