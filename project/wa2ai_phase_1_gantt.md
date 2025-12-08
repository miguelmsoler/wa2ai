# Simplified GANTT – Phase 1 (WhatsApp ↔ ADK Laboratory)

Estimated duration: **8–11 days** working **4 hours per day** (total: **33–44 hours**). Objective: enable complete flow in laboratory → Evolution API → wa2ai → ADK Agent → WhatsApp.

---

## 🗓️ Day 1 — Environment preparation (4–6 h)

+ Review current ADK agent HTTP contract (0.5 h).
+ Verify agent execution environment (0.5 h).
+ Manually test the endpoint with curl/HTTPie (0.5 h).
+ Create repo and base structure (1 h).
+ Configure Node.js + TypeScript (0.5–1 h).
+ Install/configure Docker and docker-compose (1 h).
+ Create initial `docker-compose.lab.yml` (1–1.5 h).

---

## 🗓️ Day 2 — Evolution API: deployment (6–8 h)

+ Choose Evolution API image/tag + minimum config (0.5 h).
- Add service to docker-compose and start it (1 h).
- Connect laboratory WhatsApp number - scan QR (1 h).
- Send test message and validate reception (1 h).
- Define webhook URL (0.2 h).
- Configure webhook in Evolution API (0.5 h).
- Validate webhook call (1–1.5 h).

---

## 🗓️ Day 3 — wa2ai implementation: Models + Provider (4 h)

- Define models: `IncomingMessage`, `OutgoingMessage`, `Route` (1.5 h).
- Implement `WhatsAppProvider` interface (0.5 h).
- Implement `EvolutionProvider` with basic sending (1.5–2 h).
- Test message sending from wa2ai → Evolution → WhatsApp.

---

## 🗓️ Day 4 — wa2ai implementation: Core routing (4 h)

- Implement `RoutesRepository` (JSON or memory) (0.5–1 h).
- Implement `RouterService.onIncomingMessage` (2.5–3 h).
- Process agent response and send message via provider (1 h).

---

## 🗓️ Day 5 — wa2ai implementation: Controller + Config (4–5 h)

- Create `webhooks-controller.ts` endpoint and parsing (1–1.5 h).
- Create `index.ts` + env vars reading (1 h).
- wa2ai smoke tests (1–1.5 h).
- Validate internal flow using agent mocks.

---

## 🗓️ Day 6 — wa2ai ↔ ADK Agent integration (3–4 h)

- Define wa2ai → Agent contract and document (0.5 h).
- Implement HTTP client `callAgent` with timeout and errors (1 h).
- Test simulated call to validate response (1 h).
- Add error logging (0.5 h).

---

## 🗓️ Day 7 — End-to-end integration (4–6 h)

- Configure initial route for test channel (0.5 h).
- Start stack with docker-compose (0.5 h).
- Send real message from WhatsApp and verify flow (1.5–2 h).
- Chain complete cycle: WhatsApp → Evolution → wa2ai → ADK → wa2ai → Evolution → WhatsApp.
- Validate logs and final response (1 h).
- Fallback / agent failure handling (0.5–1 h).

---

## 🗓️ Day 8 — Observability and DX (2–3 h)

- Implement structured logging (1 h).
- Add `/health` endpoint (0.5 h).
- Add npm scripts (`dev`, `build`, `start`) (0.5–1 h).
- Document single startup command (0.5 h).

---

## 🗓️ Day 9 — Documentation (2–3 h)

- Complete `docs/phase1-lab.md` with architecture and flow (1.5 h).
- Add flow diagrams (0.5 h).
- Write laboratory operation guide: stack startup, QR, add routes (1 h).
- Add basic troubleshooting (0.5 h).

---

## 🗓️ Day 10 — Phase 1 closure (0.5 h)

- Final checklist: confirm complete flow working, routes modifiable, documentation complete.
- Run final end-to-end test.
- Verify wa2ai ready for Cloud API in Phase 2.

---

## 📊 Visual summary

```
Day 1 | ████ Environment prep (4-6h)
Day 2 | ████ Evolution API (6-8h)
Day 3 | ████ Models + Provider (4h)
Day 4 | ████ Routing core (4h)
Day 5 | ████ Controller + Config (4-5h)
Day 6 | ████ ADK integration (3-4h)
Day 7 | ████ E2E integration (4-6h)
Day 8 | ████ Observability (2-3h)
Day 9 | ████ Documentation (2-3h)
Day 10| █ Phase 1 closure (0.5h)
```

**Total: 33–44 hours** (8–11 days at 4h/day)

---

## 🎯 Expected result at the end of Phase 1

- Real messages from WhatsApp are correctly routed to the ADK agent.
- The agent responds and messages return to the user via Evolution API.
- wa2ai implemented with support for future official provider (Cloud API).
- Sufficient documentation to reproduce or continue development.
