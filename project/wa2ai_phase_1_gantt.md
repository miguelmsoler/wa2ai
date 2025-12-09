# Simplified GANTT – Phase 1 (WhatsApp ↔ ADK Laboratory)

Estimated duration: **10–14 days** working **4 hours per day** (total: **41–56 hours**). Objective: enable complete flow in laboratory → WhatsApp Provider (Evolution API or Baileys) → wa2ai → ADK Agent → WhatsApp.

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

## 🗓️ Day 2 — Evolution API: deployment (6–8 h) - PARTIALLY COMPLETED

+ Choose Evolution API image/tag + minimum config (0.5 h). ✅
+ Add service to docker-compose and start it (1 h). ✅
+ Connect laboratory WhatsApp number - scan QR (1 h). ✅
- Send test message and validate reception (1 h). ⚠️ (Webhook issues encountered)
- Define webhook URL (0.2 h). ✅
- Configure webhook in Evolution API (0.5 h). ✅
- Validate webhook call (1–1.5 h). ⚠️ (Webhook issues encountered)

**Note:** Evolution API (Day 2) is partially completed. Baileys direct integration (Day 2A) is planned but not yet started. If Evolution API webhook issues persist, Day 2A can be implemented as an alternative.

---

## 🗓️ Day 2A — Baileys direct integration: Infrastructure (8–12 h)

+ Review Baileys library documentation (1–1.5 h).
+ Review Baileys examples and best practices (0.5–1 h).
+ Install Baileys dependencies (0.2 h).
- Integrate QR code display/endpoint (0.5–1 h).
- Handle connection state management (1 h).
- Test WhatsApp connection and QR scan (0.5–1 h).
- Implement message event handlers (1–1.5 h).
- Integrate with webhooks-controller or direct routing (0.5–1 h).
- Test message reception end-to-end (0.5–1 h).
- Create/update `docker-compose.lab.yml` for Baileys mode (0.5 h).
- Update environment variables for provider selection (0.2 h).

**Note:** The `BaileysProvider` class implementation itself is done in Day 3 (Section 3.2). Day 2A focuses on Baileys infrastructure setup and integration.

---

## 🗓️ Day 3 — wa2ai implementation: Models + Provider (5.5–7 h)

- Define models: `IncomingMessage`, `OutgoingMessage`, `Route` (1.5 h).
- Implement `WhatsAppProvider` interface (0.5 h).
- Implement `EvolutionProvider` class implementing `WhatsAppProvider` interface (1.5–2 h).
- Implement `BaileysProvider` class implementing `WhatsAppProvider` interface (2–3 h).
- Test message sending from wa2ai → Provider → WhatsApp.

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
Day 1  | ████ Environment prep (4-6h)
Day 2  | ████ Evolution API infrastructure (6-8h) - PARTIALLY COMPLETED
Day 2A | ████████ Baileys infrastructure (8-12h)
Day 3  | ██████ Models + Providers (5.5-7h)
Day 4  | ████ Routing core (4h)
Day 5  | ████ Controller + Config (4-5h)
Day 6  | ████ ADK integration (3-4h)
Day 7  | ████ E2E integration (4-6h)
Day 8  | ████ Observability (2-3h)
Day 9  | ████ Documentation (2-3h)
Day 10 | █ Phase 1 closure (0.5h)
```

**Total: 41–56 hours** (10–14 days at 4h/day)
**Note:** Evolution API (Day 2) is partially completed. Baileys (Day 2A) infrastructure is planned but not yet started. If Evolution API webhook issues persist, Day 2A can be implemented as an alternative.

---

## 🎯 Expected result at the end of Phase 1

- Real messages from WhatsApp are correctly routed to the ADK agent.
- The agent responds and messages return to the user via WhatsApp provider (Evolution API or Baileys).
- wa2ai implemented with both Evolution API and Baileys providers, plus support for future official provider (Cloud API).
- Sufficient documentation to reproduce or continue development.
