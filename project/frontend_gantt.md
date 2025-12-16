# GANTT – Frontend MVP (wa2ai Web Interface)

Estimated duration: **8–10 days** working **4–5 hours per day** (total: **40–50 hours**). Objective: implement minimal web interface for WhatsApp connection (QR) and route management (CRUD).

---

## 🗓️ Day 1 — Setup and template integration (5–6 h)

+ Review and select Tailwind CSS template (1 h). ✅ **Completed:** Decided to create custom template with shadcn/ui inspired by TailAdmin design patterns. Decision documented in `refs/nextjs-frontend-snippets.md`.
+ Create `apps/web/` directory structure (0.2 h). ✅ **Completed:** Directory structure created with all required folders (app, components, lib, public, styles).
+ Initialize Next.js 14+ project with TypeScript (0.3 h). ✅ **Completed:** Next.js 16.0.10 (latest stable) initialized with TypeScript, Tailwind CSS, and App Router in `apps/web/`.
+ Install core dependencies: Next.js, React, TypeScript (0.2 h). ✅ **Completed:** Next.js 16.0.10, React 19.2.1, TypeScript 5, and Tailwind CSS installed. Note: Tailwind v4 installed (may need downgrade to v3 for shadcn/ui compatibility).
+ Install UI dependencies: Tailwind CSS, shadcn/ui components (0.5 h). ✅ **Completed:** Tailwind CSS v3.4.19 installed and configured with TailAdmin-inspired styles. shadcn/ui initialized with base components (button, card, badge, dialog, toast, skeleton, form, input, label, textarea, select). All dependencies installed (react-hook-form, zod, lucide-react, etc.).
+ Install data fetching: SWR, axios (0.2 h). ✅ **Completed:** SWR v2.3.8 and axios v1.13.2 installed.
+ Install form handling: react-hook-form, zod (0.2 h). ✅ **Completed:** react-hook-form v7.68.0, zod v4.2.0, and @hookform/resolvers v5.2.2 already installed (installed by shadcn/ui).
+ Install icons library: lucide-react (0.1 h). ✅ **Completed:** lucide-react v0.561.0 already installed (installed by shadcn/ui).
+ Configure Tailwind CSS with template customizations (0.5–1 h). ✅ **Completed:** Tailwind CSS configured with TailAdmin-inspired colors (brand, success, error, warning, gray), custom shadows (theme-xs through theme-xl), custom font sizes (theme-xs, theme-sm, title-*), Outfit font family, and menu utilities. globals.css updated with TailAdmin color scheme. Layout updated to use Outfit font.
+ Initialize shadcn/ui and install base components (0.5 h). ✅ **Completed:** shadcn/ui initialized with "new-york" style. Base components installed: alert, badge, button, card, dialog, dropdown-menu, form, input, label, popover, select, separator, skeleton, table, textarea, toast, toaster. All components verified and build passes.
+ Adapt template structure to Next.js App Router (1–1.5 h). ✅ **Completed:** Template structure adapted to Next.js App Router. Created: Sidebar context (`context/sidebar-context.tsx`), Backdrop component, Sidebar component with wa2ai navigation (Dashboard, Connection, Routes), Header component with toggle, Dashboard layout with route group `(dashboard)`, and basic pages (`/dashboard`, `/connection`, `/routes`). Root page redirects to `/dashboard`. All components use TailAdmin-inspired styles and shadcn/ui components.
+ Configure environment variables (`.env.local`) (0.3 h). ✅ **Completed:** Created `.env.local` and `.env.example` with all required variables: `NEXT_PUBLIC_API_URL` (backend API URL), `NEXT_PUBLIC_QR_REFRESH_INTERVAL` (3000ms), `NEXT_PUBLIC_STATUS_REFRESH_INTERVAL` (5000ms), `NEXT_PUBLIC_ROUTES_REFRESH_INTERVAL` (10000ms). All variables documented with comments. `.env.local` is in `.gitignore`.
+ Test development server and hot-reload (0.2 h). ✅ **Completed:** Development server tested and verified. Hot-reload confirmed working - file changes are automatically detected and reflected in the browser. Server runs on port 3000 (or next available port).
+ Create basic `README.md` for frontend (0.3 h). ✅ **Completed:** Created comprehensive README.md with project overview, tech stack, installation instructions, environment variables setup, project structure, available scripts, features overview, architecture notes, backend integration details, development guidelines, and troubleshooting section. README follows project documentation standards.

**Additional:** Dark mode theme toggle implemented (`context/theme-context.tsx`, `components/layout/theme-toggle.tsx`) with localStorage persistence and system preference detection. Integrated into Header component. Script added to root layout to prevent flash of wrong theme.

---

## 🗓️ Day 2 — Base structure and navigation (5–6 h)

+ Create TypeScript types for API responses (`lib/types.ts`) (0.5 h). ✅ **Completed:** Created comprehensive types matching backend models: Route, ConnectionState, ConnectionStatus, Environment, ApiResponse, ApiError. All types align with `router/src/core/models.ts` and API response formats.
+ Implement API client with SWR hooks (`lib/api-client.ts`) (1.5–2 h). ✅ **Completed:** Implemented complete API client with SWR hooks: useRoutes(), useRoute(), useConnectionStatus(). Mutation functions: createRoute(), updateRoute(), deleteRoute(). Utility: getQRImageUrl(). Error handling with ApiError. Refresh intervals from environment variables.
+ Create main layout structure (`app/layout.tsx`) (0.5 h). ✅ **Completed:** Root layout created with ThemeProvider, Toaster, Outfit font, and dark mode script. Metadata updated with wa2ai branding.
+ Implement responsive sidebar navigation (1–1.5 h). ✅ **Completed:** Sidebar component implemented with collapsible/hover expansion, responsive mobile drawer, active route highlighting, and wa2ai navigation (Dashboard, Connection, Routes). Uses SidebarContext for state management.
+ Implement header with connection status badge (0.5–1 h). ✅ **Completed:** Created ConnectionStatusBadge component using useConnectionStatus() hook. Displays status with appropriate colors (Connected: green, Connecting: yellow, QR Ready: blue, Disconnected: red, Error: red). Integrated into Header component. Auto-updates via SWR polling.
+ Configure routing structure (dashboard, connection, routes) (0.3 h). ✅ **Completed:** Route group `(dashboard)` created with shared layout. Pages created: `/dashboard`, `/connection`, `/routes`. Root page redirects to `/dashboard`. All routes functional.
+ Adapt template colors and branding to wa2ai (0.5 h). ✅ **Completed:** TailAdmin-inspired color palette configured (brand #465fff, success, error, warning, gray scales). Outfit font family set. Branding updated to "wa2ai" throughout (sidebar logo, header, metadata). Custom shadows and typography applied.
+ Implement mobile responsive menu (hamburger) (0.5–1 h). ✅ **Completed:** Mobile hamburger menu implemented in Header component with responsive toggle (drawer on mobile, collapse on desktop). Backdrop component for mobile overlay. Fully functional.
+ Test navigation between all routes (0.2 h). ✅ **Completed:** Verified navigation: root `/` redirects to `/dashboard`, sidebar links navigate correctly (Dashboard, Connection, Routes), active route highlighting works, mobile drawer navigation functional, direct URL access works for all routes.
+ Add unit tests for API client (`lib/api-client.ts`) (1–1.5 h). ✅ **Completed:** Created comprehensive unit tests for fetcher, mutator, and mutation functions (createRoute, updateRoute, deleteRoute, getQRImageUrl). Tests cover success cases, error handling (400, 404, 500), non-JSON errors, and network errors. All 12 unit tests passing.
+ Add unit tests for ConnectionStatusBadge component (0.5 h). ✅ **Completed:** Created React Testing Library tests for all component states: loading (spinner), Connected (green), QR Ready (blue), Connecting (yellow), Disconnected (red), Error (red with message), truncation of long errors, and title attributes. All 9 component tests passing.
+ Add integration tests for API client (mocked fetch) (0.5–1 h). ✅ **Completed:** Created integration tests for SWR hooks (useRoutes, useRoute, useConnectionStatus) with mocked HTTP responses. Tests verify data fetching, error handling, loading states, and empty states. All 10 integration tests passing. Total: 31 tests passing.

---

## 🗓️ Day 3 — Dashboard and Connection screen (6–7 h)

### Dashboard (`app/dashboard/page.tsx`)
- Create Connection Status Card component (1–1.5 h).
- Create Routes Summary Card component (0.5–1 h).
- Implement Quick Actions section (0.5 h).
+ Integrate with `/qr/status` API (SWR hook) (0.5 h). ✅ **Completed:** `useConnectionStatus()` hook already implemented in `lib/api-client.ts` with auto-refresh via SWR polling.
+ Integrate with `/api/routes` API for summary (0.5 h). ✅ **Completed:** `useRoutes()` hook already implemented in `lib/api-client.ts` with auto-refresh.
+ Implement auto-refresh for connection status (0.3 h). ✅ **Completed:** Auto-refresh configured via `STATUS_REFRESH_INTERVAL` environment variable (default 5s) in `useConnectionStatus()` hook.
- Add loading states (skeletons) (0.5 h).

### Connection Screen (`app/connection/page.tsx`)
- Create connection state components (Connected, QR, Connecting, Error) (1.5–2 h).
- Implement QR code display with auto-refresh (0.5–1 h).
+ Integrate with `/qr/image` and `/qr/status` endpoints (0.5 h). ✅ **Completed:** `getQRImageUrl()` utility and `useConnectionStatus()` hook already implemented in `lib/api-client.ts`.
+ Implement polling for status updates (every 3s) (0.3 h). ✅ **Completed:** Polling configured via `STATUS_REFRESH_INTERVAL` environment variable (default 5s) in `useConnectionStatus()` hook.
- Add instructions and helper text (0.2 h).
- Handle connection state transitions (0.3 h).

---

## 🗓️ Day 4 — Routes list screen (5–6 h)

- Create Routes List layout (`app/routes/page.tsx`) (0.5 h).
- Create Route Card component (1–1.5 h).
- Integrate with `GET /api/routes` endpoint (0.3 h).
- Implement search functionality (filter by channelId/endpoint) (1 h).
- Implement filter dropdown (All/Lab/Prod/With Regex/Without Regex) (0.5–1 h).
- Create empty state component ("No routes") (0.3 h).
- Implement loading states with skeletons (0.5 h).
- Add "New Route" button with navigation (0.2 h).
- Add "Edit" button with navigation to edit form (0.2 h).
- Implement "Delete" action with confirmation modal (1 h).
- Test all interactions and error handling (0.3 h).

---

## 🗓️ Day 5 — Route form (create/edit) (6–8 h)

- Create form layout and structure (`app/routes/new/page.tsx`) (0.5 h).
- Create edit form route (`app/routes/[channelId]/edit/page.tsx`) (0.3 h).
- Define zod validation schema for Route (0.5–1 h).
- Implement react-hook-form integration (0.5 h).
- Create form fields:
  - Channel ID input with validation (0.5 h).
  - Environment radio buttons (Lab/Prod) (0.3 h).
  - Agent Endpoint input with URL validation (0.3 h).
  - ADK Agent Name input (0.3 h).
  - ADK Base URL input (optional) (0.3 h).
  - Regex Filter input (optional) (0.3 h).
- Implement regex validator and error messages (0.5 h).
- Create "Test Regex" modal component (1 h).
- Implement form submission for create (POST) (0.5 h).
- Implement form submission for edit (PUT) (0.5 h).
- Add pre-load data for edit mode (GET route) (0.3 h).
- Implement field-level error display (0.5 h).
- Add loading states on submit (0.3 h).
- Test validation edge cases (0.5 h).

---

## 🗓️ Day 6 — Error handling and feedback (4–5 h)

- Implement toast notification system (1 h).
- Create Error Boundary component (0.5 h).
- Add error handling for all API calls (1–1.5 h).
- Implement confirmation modals for destructive actions (0.5 h).
- Add success feedback for all actions (create/edit/delete) (0.5 h).
- Implement network error handling (0.3 h).
- Add retry logic for failed requests (0.3 h).
- Create 404 error page (0.2 h).
- Test error scenarios (network failures, validation errors, server errors) (0.5 h).

---

## 🗓️ Day 7 — Polish, testing and accessibility (5–6 h)

- Review and adjust responsive design for all screens (1 h).
- Test mobile navigation and interactions (0.5 h).
- Review and improve loading states consistency (0.5 h).
- Implement keyboard navigation (Tab, Enter, Esc) (1 h).
- Add ARIA labels to all interactive elements (0.5–1 h).
- Test with keyboard-only navigation (0.3 h).
- Verify color contrast (WCAG 2.1 AA compliance) (0.3 h).
- Add focus indicators to all focusable elements (0.3 h).
- Manual testing of complete flows:
  - Connect WhatsApp flow (0.3 h).
  - Create route flow (0.3 h).
  - Edit route flow (0.2 h).
  - Delete route flow (0.2 h).
  - Search and filter routes (0.2 h).
- Fix bugs found during testing (0.5–1 h).
- Performance optimization (lazy loading, memoization) (0.3 h).

---

## 🗓️ Day 8 — Docker integration and deployment (4–5 h)

- Create `Dockerfile` for Next.js app (0.5 h).
- Configure Next.js for production build (0.3 h).
- Update root `docker-compose.lab.yml` to include frontend service (0.5 h).
- Configure environment variables for Docker (0.3 h).
- Configure CORS in backend Fastify for frontend origin (0.5 h).
- Test frontend in Docker environment (0.5 h).
- Test communication frontend → backend in Docker (0.5 h).
- Document environment variables in `apps/web/.env.example` (0.3 h).
- Create `apps/web/README.md` with:
  - Setup instructions (0.5 h).
  - Development commands (0.2 h).
  - Build and deployment (0.3 h).
  - Environment variables documentation (0.2 h).
- Update root `README.md` with frontend information (0.3 h).
- Final end-to-end testing in Docker (0.5 h).

---

## 📊 Visual summary

```
Day 1 | █████ Setup + Template (5-6h)
Day 2 | █████ Base structure + Navigation (5-6h)
Day 3 | ██████ Dashboard + Connection (6-7h)
Day 4 | █████ Routes List (5-6h)
Day 5 | ███████ Route Form (6-8h)
Day 6 | ████ Error handling + Feedback (4-5h)
Day 7 | █████ Polish + Testing + A11y (5-6h)
Day 8 | ████ Docker + Deployment + Docs (4-5h)
```

**Total: 40–50 hours** (8–10 days at 4–5h/day)

---

## 🎯 Expected result at the end of Frontend MVP

### ✅ Functional Requirements
- ✅ WhatsApp connection interface with QR code display and real-time status
- ✅ Complete routes CRUD: create, read, update, delete
- ✅ Route list with search and filtering capabilities
- ✅ Form validation for all route fields
- ✅ ADK configuration (appName, baseUrl) integrated in route forms
- ✅ Regex filter testing interface

### ✅ Technical Requirements
- ✅ Next.js 14+ with App Router and TypeScript
- ✅ Tailwind CSS template integrated and customized
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Real-time updates via SWR polling
- ✅ Proper error handling and user feedback
- ✅ Accessibility compliant (WCAG 2.1 AA)

### ✅ Deployment Requirements
- ✅ Docker container for frontend
- ✅ Integrated in docker-compose with backend
- ✅ CORS properly configured
- ✅ Environment variables documented
- ✅ Complete setup and deployment documentation

### 📚 Documentation Deliverables
- ✅ `apps/web/README.md` - Frontend setup and development guide
- ✅ `apps/web/.env.example` - Environment variables template
- ✅ Root `README.md` updated with frontend section
- ✅ Component documentation (inline JSDoc)

---

## 🔗 Dependencies on Backend

**Required backend endpoints (already implemented):**
- `GET /health` - Health check
- `GET /qr/status` - Connection status
- `GET /qr/image` - QR code image
- `GET /api/routes` - List all routes
- `GET /api/routes/:channelId` - Get specific route
- `POST /api/routes` - Create route
- `PUT /api/routes/:channelId` - Update route
- `DELETE /api/routes/:channelId` - Delete route

**Backend modifications needed:**
- ✅ CORS configuration in Fastify (Day 8)
- ✅ All endpoints already implemented

---

## 📝 Notes

### Template Selection Criteria
When selecting the Tailwind CSS template (Day 1), prioritize:
1. **Dashboard/Admin template** - Already has sidebar, cards, forms
2. **Next.js compatibility** - Or easily adaptable to Next.js
3. **shadcn/ui compatible** - Uses similar component patterns
4. **Responsive design** - Mobile-first approach
5. **MIT/Open source license** - Can be used and modified freely

### Recommended Templates
Consider these options:
- **shadcn/ui examples** - Dashboard templates from shadcn docs
- **Next.js Commerce** - Vercel's official template (adapt dashboard section)
- **Taxonomy** - shadcn/ui based Next.js template
- **Tailwind UI** - Premium but excellent (if budget allows)
- **Flowbite** - Open source Tailwind components library

### Development Flow
1. **Day 1-2**: Foundation (can work independently)
2. **Day 3-5**: Core features (requires backend running)
3. **Day 6-7**: Polish (can work independently)
4. **Day 8**: Integration (requires backend in Docker)

### Testing Strategy
- **Manual testing** during development (each component as it's built)
- **Integration testing** on Day 7-8 (complete flows)
- **Docker testing** on Day 8 (production-like environment)
- **No automated tests in MVP** (add in future phases)

---

## 🚀 Post-MVP Enhancements (Future Phases)

Not included in MVP, but documented for future reference:

### Phase 2 - Authentication (8–10h)
- User login/register
- JWT token management
- Protected routes
- Role-based access control

### Phase 3 - Real-time Features (6–8h)
- WebSocket connection for live updates
- Replace polling with real-time events
- Live connection status changes
- Live route changes notifications

### Phase 4 - Monitoring Dashboard (10–12h)
- Message logs viewer
- Activity charts and metrics
- Agent response times
- Error tracking dashboard

### Phase 5 - Advanced Features (12–15h)
- Regex pattern builder (visual editor)
- Route testing interface (send test messages)
- Export/import configuration
- Route templates library
- Batch operations (bulk create/edit/delete)

---

## ⚠️ Risks and Mitigation

### Risk 1: Template adaptation takes longer than expected
**Mitigation:** If template adaptation exceeds 2h (Day 1), consider using shadcn/ui examples directly without external template. This is more predictable.

### Risk 2: Complex form validation
**Mitigation:** Use zod + react-hook-form from start (Day 5). These libraries handle 90% of complexity. Don't try to build custom validation.

### Risk 3: CORS issues in Docker
**Mitigation:** Test CORS early (Day 8). Document the exact Fastify CORS configuration needed. Use environment variable for allowed origins.

### Risk 4: Real-time updates performance
**Mitigation:** SWR handles caching well. If performance issues arise, increase polling intervals. WebSockets can be added in Phase 2.

---

## 📋 Pre-implementation Checklist

Before starting Day 1, ensure:
- [ ] Backend is running and all endpoints are accessible
- [ ] Backend documentation reviewed (endpoints, response formats)
- [ ] Tailwind CSS template selected and downloaded/cloned
- [ ] Node.js 18+ installed
- [ ] Git repository access configured
- [ ] Development environment ready (IDE, browser dev tools)
- [ ] Design requirements clarified (if any specific branding)

---

## 🎓 Skills Required

**Required skills:**
- React and Next.js fundamentals
- TypeScript basics
- Tailwind CSS basics
- REST API integration
- Form handling

**Nice to have:**
- shadcn/ui components knowledge
- Docker basics
- Accessibility (a11y) knowledge
- SWR or React Query experience

**Learning resources available:**
- Next.js docs: https://nextjs.org/docs
- shadcn/ui docs: https://ui.shadcn.com
- Tailwind CSS docs: https://tailwindcss.com/docs
- SWR docs: https://swr.vercel.app

---

## 🏁 Success Criteria

Frontend MVP is complete when:
1. ✅ User can see WhatsApp connection status in real-time
2. ✅ User can scan QR code to connect WhatsApp (Baileys mode)
3. ✅ User can view all existing routes in a list
4. ✅ User can search and filter routes
5. ✅ User can create a new route with full validation
6. ✅ User can edit an existing route
7. ✅ User can delete a route with confirmation
8. ✅ All forms validate input correctly
9. ✅ User receives clear feedback on all actions (success/error)
10. ✅ Interface is responsive on mobile, tablet, and desktop
11. ✅ Interface is accessible (keyboard navigation, screen readers)
12. ✅ Frontend runs in Docker alongside backend
13. ✅ All functionality documented in README

**Acceptance test:** Complete flow without errors:
1. Start Docker stack → frontend and backend running
2. Open frontend in browser → Dashboard loads
3. Navigate to Connection → See QR or Connected status
4. Navigate to Routes → See list of routes (or empty state)
5. Create new route → Form validates → Route created → Shows in list
6. Edit route → Pre-filled form → Update → Shows updated in list
7. Delete route → Confirmation → Route removed from list
8. All above works on mobile device screen size

---

**This Gantt is ready for implementation. Start with Day 1 when backend is stable and endpoints are confirmed working.**
