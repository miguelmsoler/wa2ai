# AGENTS.md

## Project overview

This repository contains **a gateway that connects WhatsApp with AI agents (ADK or others), enabling message routing based on configurable rules**. The project is currently in Phase 1 (Laboratory mode) and will evolve to Phase 2 (Production mode) with official WhatsApp Cloud API integration.

Core goals:
- Connect WhatsApp with AI agents through a routing service
- Enable message routing based on configurable rules
- Keep the codebase extensible using **Clean Architecture** principles (domain-centric, UI and infrastructure at the edges).

Agents should assume:
- **TypeScript/Node.js** is the primary focus.
- A web UI (Next.js) may be added later in `apps/web/` as a separate frontend, not mixed into backend layers.
- The directory structure already contemplates the frontend location for future implementation.

---

## Requirements

### Backend
- **Node.js** 18 or higher
- **npm** package manager

### Frontend (future)
- **Node.js** 18 or higher (when frontend is implemented)
- **npm**, **pnpm**, or **yarn** package manager

---

## Setup commands

### Backend (TypeScript, via npm)

We use **npm** as the Node.js package and project manager.

- Install dependencies and create the environment from `package.json`:

  ```bash
  npm install
  ```

- Run tests:

  ```bash
  npm test
  ```

- Add a new dependency:

  ```bash
  npm install <package-name>
  ```

Do **not** add or edit `package-lock.json` manually; dependency management lives in `package.json` managed by npm.

### Frontend (Next.js) – future

When the frontend is implemented, it will be located in `apps/web/`.

- Install dependencies:

  ```bash
  cd apps/web
  npm install
  # or
  pnpm install
  # or
  yarn install
  ```

- Run development server:

  ```bash
  cd apps/web
  npm run dev
  ```

- Build for production:

  ```bash
  cd apps/web
  npm run build
  ```

- Run tests (if configured):

  ```bash
  cd apps/web
  npm test
  ```

The frontend will use its own `package.json` for dependency management. Respect the package manager specified in the project (check for `package-lock.json`, `pnpm-lock.yaml`, or `yarn.lock`).

---

## Architecture layout

We follow a Clean Architecture–style structure (inner layers are business rules, outer layers are delivery and infrastructure).

### Directory structure

The following structure includes the frontend location (`apps/web/`) which will be implemented in the future:

```
wa2ai/
├── router/                 # TypeScript backend source code
│   └── src/
│       ├── core/            # Domain models, value objects, pure business rules
│       │   ├── models.ts    # Domain entities (IncomingMessage, OutgoingMessage, Route)
│       │   └── router-service.ts  # Domain services
│       │
│       ├── providers/       # WhatsApp provider implementations
│       │   ├── evolution-provider.ts  # Evolution API provider
│       │   └── cloud-provider.ts      # WhatsApp Cloud API provider
│       │
│       ├── webhooks-controller.ts  # HTTP/API handlers (entry points)
│       └── index.ts         # Application entry point
│
├── apps/                    # Applications (frontend to be added here)
│   └── web/                 # Next.js frontend application (future)
│       ├── app/             # Next.js App Router (or pages/ for Pages Router)
│       ├── components/      # React components
│       ├── lib/             # Frontend utilities
│       ├── public/          # Static assets
│       ├── package.json     # Frontend dependencies
│       ├── next.config.js   # Frontend configuration
│       └── .env.local       # Frontend environment variables
│
├── infra/                   # Infrastructure configuration
│   ├── docker-compose.lab.yml
│   └── docker-compose.prod.yml
│
├── tests/                   # Backend tests
│   ├── unit/                # Unit tests
│   ├── integration/        # Integration tests
│   └── fixtures/            # Test fixtures and data
│
├── project/                 # Project management documentation
│   ├── wa2ai_design.md
│   ├── wa2ai_phase_1_gantt.md
│   └── wa2ai_phase_1_task_breakdown.md
│
├── docs/                    # Technical solution documentation
│   ├── phase1-lab.md        # Phase 1 technical documentation
│   └── phase2-prod.md       # Phase 2 technical documentation
│
├── refs/                    # Documentation and reference materials (not versioned, local use only)
│   └── (symlinks and documents added by each developer - contents vary by environment)
│
├── .env                     # Backend environment variables (not in git)
├── .env.example             # Example backend environment variables
├── package.json             # Project configuration and dependencies
├── tsconfig.json            # TypeScript configuration
├── .gitignore               # Git ignore rules
├── README.md                # Project overview
└── AGENTS.md                # This file
```

### Layer responsibilities

- `router/src/core/`
  - Domain models, value objects, pure business rules.
  - No framework, I/O, HTTP, or external services.

- `router/src/providers/`
  - Adapters for concrete WhatsApp provider implementations (Evolution API, Cloud API).
  - Implements provider interfaces defined in `core`.

- `router/src/webhooks-controller.ts`
  - Entry points: HTTP/API handlers for webhook endpoints.
  - Depends on `core` and `providers`.

- `router/src/index.ts`
  - Application entry point: server setup, configuration, and startup.

### Dependency direction

- `core` → no imports from other project layers.
- `providers` → may import from `core` only.
- `webhooks-controller.ts` / `index.ts` → may import from `providers` and `core`, but never the other way around.

When adding new functionality, **keep new code in the correct layer** and introduce abstractions (interfaces/ports) in `core` before implementing adapters in `providers`.

---

## Configuration

### Backend environment variables

Backend environment variables are managed through `.env` files in the project root.

- `.env` – Contains actual backend configuration (not committed to git)
- `.env.example` – Template documenting all required and optional backend variables

#### Backend environment variables

- `WA2AI_DEBUG` (default: `false`) – When set to `true`, enables detailed debug logging throughout the backend application.
- `WA2AI_PORT` (default: `3000`) – Port on which the wa2ai router service listens.
- `WA2AI_PROVIDER` (default: `baileys`) – WhatsApp provider to use. Valid values: `baileys` (direct connection) or `evolution` (Evolution API webhook-based).
- `WA2AI_EVOLUTION_API_URL` – URL of the Evolution API instance (for lab mode, only used if `WA2AI_PROVIDER=evolution`).
- `WA2AI_EVOLUTION_API_KEY` – API key for Evolution API authentication (only used if `WA2AI_PROVIDER=evolution`).
- `WA2AI_BAILEYS_AUTH_DIR` (default: `./auth_info_baileys`) – Directory to store Baileys authentication state (only used if `WA2AI_PROVIDER=baileys`).
- `WA2AI_CLOUD_API_TOKEN` – Token for WhatsApp Cloud API (for prod mode, Phase 2).
- `WA2AI_CLOUD_API_PHONE_NUMBER_ID` – Phone number ID for WhatsApp Cloud API (for prod mode, Phase 2).
- `WA2AI_TEST_CHANNEL_ID` (optional) – Channel ID for testing purposes (your WhatsApp number without `@s.whatsapp.net`). Used for e2e testing and development workflows.

**Note:** PostgreSQL connection details are managed internally by `docker-compose.lab.yml` and are not exposed as environment variables. When running inside Docker, the `PostgresRoutesRepository` will use the service name `postgres` and credentials defined in the compose file.

Add new backend environment variables to `.env.example` with clear documentation about their purpose and required format.

### Frontend environment variables (future)

When the frontend is implemented, environment variables will be managed through `.env.local` files in `apps/web/`.

- `apps/web/.env.local` – Contains actual frontend configuration (not committed to git)
- `apps/web/.env.example` – Template documenting all required and optional frontend variables

Frontend environment variables typically include:
- API endpoint URLs (e.g., `NEXT_PUBLIC_API_URL`)
- Feature flags
- Third-party service keys (client-side safe only)

Follow Next.js conventions for environment variables (prefix client-side variables with `NEXT_PUBLIC_` for Next.js).

---

## Development tools

We use the following tools for code quality and consistency:

### Code formatting and linting

- **ESLint** – JavaScript/TypeScript linter
  ```bash
  npm run lint
  npm run lint:fix
  ```

- **Prettier** – Code formatter (as fallback or for specific formatting needs)
  ```bash
  npm run format
  ```

### Type checking

- **TypeScript** – Static type checker
  ```bash
  npm run type-check
  # or
  npx tsc --noEmit
  ```

### Running all checks

Before committing, ensure:
- Code is formatted: `npm run format`
- Linting passes: `npm run lint`
- Type checking passes: `npm run type-check`
- Tests pass: `npm test`

---

## Logging

Logging is done to console using Node.js standard logging mechanisms (e.g., `console.log`, `winston`, or similar).

### Logging levels

- **Production mode** (`WA2AI_DEBUG=false`): Standard logging with INFO level and above.
- **Debug mode** (`WA2AI_DEBUG=true`): Detailed logging with DEBUG level, including:
  - Function entry/exit points
  - Parameter values (sanitized if sensitive)
  - Intermediate computation results
  - Decision points in algorithms

### Guidelines

- Every new feature must include conditional debug logging.
- Use structured logging where appropriate (include context in log messages).
- Never log sensitive information (API keys, tokens, personal data).
- Use appropriate log levels:
  - `DEBUG`: Detailed information for debugging
  - `INFO`: General informational messages
  - `WARNING`: Warning messages for unexpected situations
  - `ERROR`: Error messages for failures
  - `CRITICAL`: Critical errors that may cause the application to stop

Example:

```typescript
import { logger } from './logger';

const DEBUG = process.env.WA2AI_DEBUG === 'true';

function routeMessage(message: IncomingMessage): Route | null {
  if (DEBUG) {
    logger.debug(`[RouteMessage]: Processing message from ${message.from}`);
  }
  
  const route = findRoute(message.channelId);
  
  if (DEBUG) {
    logger.debug(`[RouteMessage]: Found route: ${route?.agentEndpoint || 'none'}`);
  }
  
  return route;
}
```

---

## Error handling

Follow these best practices for error handling:

### Custom exceptions

- Define domain-specific exceptions in `router/src/core/exceptions.ts`.
- Create specific exception types for different error scenarios (e.g., `RoutingError`, `ProviderError`, `AgentError`).
- Inherit from appropriate base exceptions (`Error`, etc.).

### Error handling strategy

1. **Fail fast**: Validate inputs early and throw exceptions immediately for invalid states.
2. **Log errors**: Always log errors with sufficient context before re-throwing or handling.
3. **Preserve stack traces**: Use `throw ...` when chaining exceptions.
4. **Return vs. throw**: Use exceptions for exceptional conditions, not for normal control flow.
5. **Type hints**: Use `Optional` or `null` types to indicate possible None/error returns when appropriate.

Example:

```typescript
import { logger } from './logger';

class RoutingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RoutingError';
  }
}

function findRoute(channelId: string): Route | null {
  if (!channelId) {
    throw new RoutingError('Channel ID is required');
  }
  
  try {
    const route = routesRepository.findByChannelId(channelId);
    if (!route) {
      throw new RoutingError(`No route found for channel: ${channelId}`);
    }
    return route;
  } catch (error) {
    logger.error(`[FindRoute]: Error finding route for ${channelId}`, { error });
    throw error;
  }
}
```

---

## Code documentation

### Docstrings

- All functions, classes, and modules must have complete JSDoc comments in English.
- Use JSDoc-style documentation consistently.
- Include:
  - Description of what the function/class does
  - Parameters with types and descriptions
  - Return values with types and descriptions
  - Throws section for exceptions
  - Examples when helpful

Example:

```typescript
/**
 * Routes an incoming WhatsApp message to the appropriate ADK agent.
 * 
 * @param message - The incoming message to route
 * @param provider - The WhatsApp provider to use for sending responses
 * @returns Promise that resolves when the message is processed
 * 
 * @throws {RoutingError} When no route is found for the message channel
 * @throws {ProviderError} When the provider fails to send a response
 * 
 * @example
 * ```typescript
 * const message = { from: '1234567890', text: 'Hello', channelId: 'test' };
 * await routeMessage(message, evolutionProvider);
 * ```
 */
async function routeMessage(
  message: IncomingMessage,
  provider: WhatsAppProvider
): Promise<void> {
  // Implementation
}
```

### Comments

- All comments must be in English.
- Write comments that explain **why**, not **what** (the code should be self-explanatory).
- Use comments for:
  - Complex algorithms or business logic
  - Workarounds or non-obvious solutions
  - References to external documentation or specifications
  - TODO/FIXME notes when necessary

---

## Documentation Writing Style

**CRITICAL: All documentation must be written in English.** This includes:
- Technical documentation (e.g., `docs/phase1-lab.md`, `docs/phase2-prod.md`)
- Code comments and docstrings (see [Code documentation](#code-documentation))
- README files
- Project management documentation
- API documentation
- Any other written documentation in the repository

### General Principles: Didactic and Clear Writing

All documentation should be written in a **didactic, clear style** that explains concepts with the **clarity and pedagogical level of an experienced MIT professor**. The goal is to make the documentation accessible to someone who has no prior knowledge of the project, while maintaining the depth and rigor expected from top-tier technical documentation.

**Writing Standard:** Aim for the clarity, didactic approach, and pedagogical excellence that an experienced MIT professor would use when teaching students. This means:
- Explaining complex concepts in accessible ways without dumbing them down
- Building understanding progressively from fundamentals to advanced topics
- Using precise technical language while remaining clear and understandable
- Providing context and motivation for every concept introduced
- Anticipating questions and addressing them proactively

**CRITICAL: Never mention the writing style or standards within the documentation itself.** The documentation should simply BE clear and didactic, not TELL the reader that it is. Mentioning writing standards breaks immersion and sounds pretentious. The document should present information about the subject matter only, not about how it's written. This is the "show, don't tell" principle: demonstrate clarity through the writing itself, don't announce it.

#### Core Requirements

1. **Start with the "Why" and "What"**
   - Always begin by clearly stating the **objective** or **problem** the solution addresses
   - Make it immediately clear **what** the solution does and **why** it exists
   - Provide context so readers understand the purpose before diving into details

2. **Explain Component Responsibilities and Interactions**
   - For each component, clearly describe:
     - **What it does** (its responsibility)
     - **Why it exists** (its purpose in the system)
     - **How it works** (its internal logic or algorithm, when relevant)
   - Explain **how components interact** to achieve the overall goal
   - Use step-by-step explanations of workflows and data flows

3. **Facilitate Understanding from a Code Perspective**
   - Explain how the solution works from the point of view of the code
   - Show the relationships between components
   - Use examples that illustrate the actual implementation
   - Include code snippets when they help clarify concepts

4. **Use Clear, Accessible Language**
   - Write as if explaining to someone with no prior knowledge
   - Use analogies and metaphors when helpful
   - Break complex concepts into smaller, digestible parts
   - Use progressive disclosure: start simple, then add complexity

5. **Structure for Learning**
   - Use clear headings and a logical flow
   - Provide a table of contents for longer documents
   - Use visual aids (diagrams, flowcharts) when they clarify concepts
   - Include examples and use cases

### Documentation Type-Specific Guidelines

#### Technical Documentation (`docs/` directory)

Technical documentation (e.g., `docs/phase1-lab.md`, `docs/phase2-prod.md`) should:

1. **Introduction Section**
   - Start with a clear problem statement
   - Explain the solution's objective
   - Provide high-level overview before diving into details

2. **Architecture Section**
   - Explain the overall architecture with clear diagrams
   - Describe each component's responsibility
   - Show how components interact through diagrams and step-by-step flows

3. **Component Details**
   - For each major component:
     - What it does (responsibility)
     - Why it exists (purpose)
     - How it works (internal logic, when relevant)
     - How it interacts with other components

4. **Flow Explanations**
   - Provide detailed, step-by-step explanations of message flows
   - Use sequence diagrams or flowcharts
   - Explain each step in the flow
   - Show how data transforms as it moves through the system

5. **Code Examples**
   - Include relevant code snippets with explanations
   - Show how components are used together
   - Provide practical examples that readers can relate to

#### Code Documentation (JSDoc and Comments)

Code documentation should:

1. **JSDoc Comments**
   - Explain **what** the function/class does
   - Explain **why** it exists (its purpose in the system)
   - Include **how** it works for complex logic
   - Provide examples when helpful

2. **Inline Comments**
   - Explain **why** decisions were made, not **what** the code does
   - Provide context for non-obvious solutions
   - Reference external documentation when relevant

#### README Files

README files should:

1. **Start with Clear Overview**
   - What the project does
   - Why it exists
   - Key features

2. **Provide Quick Start**
   - Step-by-step setup instructions
   - Clear examples
   - Common use cases

3. **Explain Architecture at High Level**
   - How major components work together
   - Key concepts and design decisions

4. **Follow Project State-Appropriate Structure and Best Practices**
   - README files must follow the structure and best practices used in projects at the same development stage:
     - **Initial/Experimental**: Focus on setup, basic usage, known limitations, and contribution guidelines. Audience: developers who want to contribute or experiment.
     - **In Development**: Include current status, roadmap, known issues, and how to contribute. Audience: developers who want to contribute or use early versions.
     - **Mature/Production-Ready**: **Focus on end-user usage, not development.** The README should center on:
       - How to install and use the solution
       - Common use cases and examples
       - Configuration options for end users
       - Troubleshooting common issues
       - Production deployment guides
       - Security considerations for users
       - Support and community resources
       - Development/contribution information should be moved to separate files (e.g., `CONTRIBUTING.md`, `DEVELOPMENT.md`) or de-emphasized
     - At this stage, most readers are users who want to **use** the solution, not develop it
   - Structure the README to match the project's maturity level and audience expectations
   - Include appropriate badges, status indicators, and disclaimers based on project state
   - Reference similar projects in the same stage for structure inspiration

#### API Documentation

API documentation should:

1. **Explain Purpose**
   - What the API does
   - Why it exists
   - When to use it

2. **Show Examples**
   - Request/response examples
   - Error handling examples
   - Common use cases

3. **Explain Behavior**
   - How endpoints interact
   - Data flow through the API
   - Error scenarios

### Example: Good Documentation Structure

A well-structured technical document should follow this pattern:

```markdown
# Title

## Introduction
- Problem statement
- Solution objective
- High-level overview

## Architecture
- Overall architecture diagram
- Component responsibilities
- How components interact

## Component Details
For each component:
- What it does
- Why it exists
- How it works
- How it interacts with others

## Flows
- Step-by-step flow explanations
- Diagrams showing data flow
- Examples

## Configuration
- How to configure
- What each option does
- Why certain choices matter

## Examples
- Practical examples
- Common use cases
- Code snippets
```

### Checklist for Documentation

Before considering documentation complete, verify:

- [ ] Written entirely in English
- [ ] Starts with clear objective/problem statement
- [ ] Explains component responsibilities
- [ ] Shows how components interact
- [ ] Uses clear, accessible language
- [ ] Includes examples where helpful
- [ ] Provides step-by-step explanations for complex flows
- [ ] Uses diagrams/visual aids when they clarify concepts
- [ ] Structured logically with clear headings
- [ ] Accessible to someone with no prior knowledge

---

## Tests

- All tests live under `tests/`.
- Use **Jest** or **Vitest** as the test runner.
- Run the full suite with:

  ```bash
  npm test
  ```

Guidelines:
- Prefer **unit tests** for `core` modules (no network or real I/O).
- Use **integration tests** for `providers` adapters and webhook handlers.
- Avoid live network calls in tests; use fixtures or recorded data.
- Aim for high test coverage, especially in `core` layer.
- Use descriptive test names that explain what is being tested.

---

## Domain docs

**First source to consult: `refs/` directory**

The `refs/` directory is the first source to consult for any documentation needs. It contains documents compiled by developers as the project progresses and is not versioned (local use only). The contents vary by developer and environment.

Before modifying routing logic or provider implementations, check:
- `refs/` directory – First source for any documentation (RESTful API specs, library references, code examples, etc.)
- `docs/phase1-lab.md` – Phase 1 technical documentation (laboratory mode with Evolution API)
- `docs/phase2-prod.md` – Phase 2 technical documentation (production mode with WhatsApp Cloud API)
- `project/wa2ai_design.md` – Overall architecture and design decisions

Update these documents when you introduce changes that affect their behavior.

---

## Frontend (Next.js) – future integration

A web frontend **will be added later** using **Next.js** in `apps/web/`.

### Conventions for agents

- Treat the Next.js app as a **separate frontend** located in `apps/web/`.
- Frontend build/test/dev commands will live in `apps/web/package.json`.
- Do not import frontend code from backend modules or vice versa; communication should happen via well-defined API boundaries (HTTP/JSON, REST, etc.).
- The backend API should be accessible from the frontend (typically via `router/src/webhooks-controller.ts` or a dedicated API layer).

### Development workflow (when frontend is implemented)

- Frontend and backend can be developed independently.
- Backend changes should not require frontend changes unless the API contract changes.
- Frontend changes should not affect backend architecture or domain logic.
- Respect the frontend's existing tooling and scripts (`npm`, `pnpm`, `yarn`, etc.) as defined in `apps/web/package.json`.

---

## Development workflow

When implementing changes:

1. **Locate the correct layer**
   - Domain changes → `router/src/core/`
   - New provider implementations → `router/src/providers/`
   - New webhook endpoints → `router/src/webhooks-controller.ts`
   - New entrypoints / interfaces → `router/src/index.ts`

2. **Preserve Clean Architecture boundaries**
   - Do not introduce imports from outer layers into inner ones.

3. **Keep changes small and test-backed**
   - Add or update tests under `tests/`.
   - Run `npm test` before concluding a change.

4. **Follow code quality standards**
   - Run linting and type checking before committing.
   - Add comprehensive JSDoc comments to all new functions and classes.
   - Include conditional debug logging for new functionality.
   - **All commit messages must be in English** (use conventional commit format when possible, e.g., `feat:`, `fix:`, `docs:`, `refactor:`).

5. **Adjust docs when behavior changes**
   - If routing or provider behavior changes, update `docs/phase1-lab.md` or `docs/phase2-prod.md` accordingly.
   - Update `project/wa2ai_design.md` if architectural decisions change.

### For AI Agents

When AI agents are used for development assistance:

6. **Implementing WhatsApp provider features**
   - When implementing new provider features, check `docs/phase1-lab.md` and `docs/phase2-prod.md` for specifications.
   - Always verify you're implementing the correct provider interface as defined in `router/src/core/`.

7. **Temporary files**
   - When creating temporary files to answer a request (instead of responding in chat), always create them in `/tmp/` to avoid creating unnecessary files within the project structure.
   - Never create temporary files in the project root or any project directory.

8. **Using the `refs/` directory**
   - **The `refs/` directory is the first source to consult for any documentation needs.**
   - This directory contains symbolic links to external projects, agents, libraries, and documentation that can help with implementation.
   - It also contains documents compiled by developers as the project progresses.
   - These symlinks and documents provide access to reference implementations, related projects, or useful resources without duplicating code.
   - When implementing features, check `refs/` for relevant examples or patterns from related projects.
   - The `refs/` directory is **not versioned** (it's in `.gitignore`) and is for local use only. Each developer can add their own symlinks and documents to help agents with implementation.
   - **Do not assume specific files exist in `refs/`** - the contents vary by developer and environment.

9. **API Standards**
   - All HTTP API endpoints must follow RESTful API best practices.
   - **First, consult the `refs/` directory** for RESTful API specification documents (e.g., `refs/restful.md` if available in your local environment).
   - These specifications define standards for:
     - URL structure and naming conventions
     - HTTP methods (GET, POST, PUT, DELETE, PATCH)
     - Status codes and error responses
     - Request/response formats
     - Versioning, pagination, filtering
   - When implementing new API endpoints, consult `refs/` first for RESTful API documentation to ensure consistency with project standards.

10. **Database schema and model mapping**
    - **CRITICAL: Database schemas must exactly match domain models.**
    - Every table in the database must map 1:1 to a domain model in `router/src/core/models.ts`.
    - Every field in a domain model must have a corresponding column in the database table.
    - Every column in a database table must map to a field in the domain model (except for technical columns like `created_at`, `updated_at`, which are acceptable for audit purposes).
    - When adding a new field to a domain model, you MUST:
      1. Update the corresponding database schema SQL file in `infra/schema/`
      2. Update the repository implementation (e.g., `PostgresRoutesRepository`) to read/write the new field
      3. Update the `mapRowToRoute` (or equivalent mapping method) to include the new field
      4. Run database migrations or update the schema initialization script
    - When creating a new table, ensure:
      1. The domain model exists first in `router/src/core/models.ts`
      2. The schema SQL file in `infra/schema/` matches the model exactly
      3. The repository implementation maps all fields correctly
    - **Never create a database table or column that doesn't map to a domain model field.**
    - **Never add a field to a domain model without updating the database schema.**
    - Schema files are located in `infra/schema/` and are automatically applied when PostgreSQL initializes.

11. **Git operations**
    - **Never make commits without explicit user request.** Only commit when the user explicitly asks for it.
    - Do not push to remote repositories unless explicitly requested.
    - Do not modify git configuration.

This AGENTS.md is the source of truth for agents about how to build, test, and extend the project.

