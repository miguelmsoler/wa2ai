# Frontend MVP - wa2ai

> This document defines the minimal viable frontend (MVP) design for wa2ai, which enables WhatsApp connection management and message route administration to AI agents.

**Last Updated:** 2025-12-15  
**Version:** 1.0

---

## Table of Contents

1. [Frontend MVP Objective](#frontend-mvp-objective)
2. [Architecture and Tech Stack](#architecture-and-tech-stack)
3. [Screens and Flows](#screens-and-flows)
4. [Detailed Screen Specifications](#detailed-screen-specifications)
5. [Backend Integration](#backend-integration)
6. [UX Considerations](#ux-considerations)
7. [Implementation Plan](#implementation-plan)

---

## Frontend MVP Objective

### Why do we need a frontend?

Currently, wa2ai operates entirely through REST APIs. To perform basic operations, users must:
- Use `curl` or Postman to manage routes
- Access individual endpoints to view the Baileys QR code
- Have no visibility of connection status without consulting logs

**The MVP frontend solves two critical needs before deployment:**

1. **QR code synchronization**: When using Baileys (direct connection), a QR code must be scanned to authenticate WhatsApp. Currently this is done by manually accessing `/qr`, but we need a friendly interface that:
   - Displays the QR automatically when available
   - Updates connection status in real-time
   - Clearly indicates when the connection is ready

2. **Route management (CRUD)**: Routes determine which agent handles each WhatsApp channel. Without an interface, users must remember the JSON structure and use curl commands. We need an interface that:
   - Allows easy creation, viewing, editing, and deletion of routes
   - Validates configuration before submission
   - Displays all existing routes in a readable format
   - Facilitates regex filter configuration and ADK settings

**MVP Scope:**
- ✅ WhatsApp authentication (QR visualization and status)
- ✅ Complete routes CRUD
- ✅ System status visualization
- ❌ User authentication (will be added in future phases)
- ❌ Real-time logs and metrics (will be added in future phases)
- ❌ Visual regex filter editor (will be added in future phases)

---

## Architecture and Tech Stack

### Frontend Location

According to documentation in `AGENTS.md`, the frontend will be located at:

```
wa2ai/
└── apps/
    └── web/              # Next.js Frontend
        ├── app/          # Next.js App Router
        ├── components/   # React components
        ├── lib/          # Utilities
        ├── public/       # Static assets
        └── package.json  # Frontend dependencies
```

### Tech Stack

**Framework:** Next.js 14+ with App Router
- **Rationale**: Next.js is the de facto standard for modern React applications. App Router provides:
  - Server Components for better performance
  - Intuitive file-based routing
  - Built-in image and font optimizations
  - API routes for proxying (if needed)

**Language:** TypeScript
- **Rationale**: Consistency with backend. Allows sharing types between frontend and backend if needed.

**UI Framework:** React with shadcn/ui + Tailwind CSS
- **Rationale**: 
  - shadcn/ui provides accessible and customizable components without being a heavy library
  - Tailwind CSS enables rapid development with consistent design
  - Excellent DX (Developer Experience)
  - Copyable and modifiable components (not locked-in)

**State Management:** React Context + Native Hooks
- **Rationale**: For an MVP, the state is simple (routes + connection status). We don't need Redux/Zustand yet.

**Data Fetching:** SWR (stale-while-revalidate)
- **Rationale**: 
  - Automatic revalidation
  - Integrated cache
  - Automatic retry on errors
  - Real-time updates when window regains focus

**Polling for QR/Status:** SWR with refreshInterval
- **Rationale**: For MVP, polling every 3-5 seconds is sufficient. In future phases we can add WebSockets.

**Form Validation:** zod + react-hook-form
- **Rationale**: 
  - zod allows defining schemas that can be shared with backend
  - react-hook-form provides excellent performance and UX
  - Perfect integration between both

### Communication Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                    │
│                     apps/web/                            │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP/JSON
                        ▼
┌─────────────────────────────────────────────────────────┐
│                   Backend (wa2ai)                        │
│                    router/src/                           │
│  ┌──────────────────┬────────────────┬────────────────┐ │
│  │ Routes API       │ QR Endpoints   │ Health         │ │
│  │ /api/routes      │ /qr/*          │ /health        │ │
│  └──────────────────┴────────────────┴────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Communication configuration:**
- Environment variable: `NEXT_PUBLIC_API_URL` (default: `http://localhost:3000`)
- All requests go directly to backend (no BFF/Backend-for-Frontend in MVP)
- CORS configured in Fastify backend to allow requests from frontend

---

## Screens and Flows

### Navigation Map

```
┌────────────────────────────────────────────────────────────┐
│                       Main Layout                          │
│  ┌────────────┐  ┌──────────────────────────────────────┐ │
│  │  Sidebar   │  │         Main Content                 │ │
│  │            │  │                                        │ │
│  │ • Dashboard│  │  ┌──────────────────────────────────┐│ │
│  │ • Connection│  │  │                                  ││ │
│  │ • Routes   │  │  │        Content Area              ││ │
│  │            │  │  │                                  ││ │
│  │            │  │  │                                  ││ │
│  │            │  │  └──────────────────────────────────┘│ │
│  └────────────┘  └──────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

### Main User Flow

**First time (no connection):**
```
1. User accesses app → Dashboard
   ↓
2. Sees alert: "WhatsApp not connected"
   ↓
3. Click "Connect WhatsApp" → Connection Screen
   ↓
4. Scans QR code with WhatsApp
   ↓
5. Connection established → Dashboard shows "Connected"
   ↓
6. User navigates to Routes → Creates first route
   ↓
7. System ready to receive messages
```

**Returning user (with connection):**
```
1. User accesses app → Dashboard
   ↓
2. Sees status: "Connected" + active routes
   ↓
3. Manages routes as needed:
   - View existing routes
   - Edit configuration
   - Add new routes
   - Delete obsolete routes
```

---

## Detailed Screen Specifications

### 1. Dashboard (Main Screen)

**Route:** `/` or `/dashboard`

**Objective:** Provide system status overview and quick access to main functions.

**Components:**

#### 1.1 Header
- App logo/name: "wa2ai"
- Global status indicator (badge):
  - 🟢 "System Ready" (green) - WhatsApp connected + at least 1 route
  - 🟡 "Partial" (yellow) - WhatsApp connected without routes, or routes without connection
  - 🔴 "Disconnected" (red) - WhatsApp not connected

#### 1.2 Connection Status Card
**Design:**
```
┌────────────────────────────────────────────────────────┐
│ 📱 WhatsApp Connection                                 │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Status: [●] Connected                                │
│  Provider: Baileys (Direct Connection)                │
│  Connected since: 2025-12-15 10:30:45                 │
│                                                        │
│  [View QR Code]  [Disconnect]                         │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**Possible states:**
- **Connected** (green): Active connection
- **Connecting** (yellow): Connecting, waiting for QR
- **QR Ready** (blue): QR available, waiting for scan
- **Disconnected** (red): No connection
- **Error** (red): Connection error (show message)

**Actions:**
- "View QR Code" → Navigates to `/connection`
- "Disconnect" → Confirmation modal → Disconnect WhatsApp (future)

**API:** `GET /qr/status` (polling every 5 seconds when on this screen)

#### 1.3 Routes Summary Card
**Design:**
```
┌────────────────────────────────────────────────────────┐
│ 🔀 Active Routes                                       │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Total Routes: 3                                      │
│  Lab Routes: 2                                        │
│  Prod Routes: 1                                       │
│                                                        │
│  [Manage Routes] [+ New Route]                        │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**Actions:**
- "Manage Routes" → Navigates to `/routes`
- "+ New Route" → Navigates to `/routes/new`

**API:** `GET /api/routes`

#### 1.4 Recent Activity (future - not MVP)
List of last processed messages (for future phases)

#### 1.5 Quick Actions
Quick access buttons:
- "+ Create Route"
- "🔌 Connection Settings"
- "📊 View Logs" (future)

---

### 2. Connection (WhatsApp Connection Management)

**Route:** `/connection`

**Objective:** Manage WhatsApp authentication and connection via QR code (for Baileys) or webhook configuration (for Evolution/Cloud API).

**Components:**

#### 2.1 State: Connected

```
┌────────────────────────────────────────────────────────┐
│                   WhatsApp Connected                   │
├────────────────────────────────────────────────────────┤
│                                                        │
│                     ✓                                  │
│                                                        │
│  Your WhatsApp is connected and ready                 │
│                                                        │
│  Connection Details:                                  │
│  • Provider: Baileys                                  │
│  • Status: Connected                                  │
│  • Since: 2025-12-15 10:30:45                         │
│                                                        │
│  [← Back to Dashboard]                                │
│                                                        │
└────────────────────────────────────────────────────────┘
```

#### 2.2 State: QR Available

```
┌────────────────────────────────────────────────────────┐
│                 Scan QR Code                           │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌──────────────────────────────────────────┐         │
│  │                                          │         │
│  │         [QR CODE IMAGE]                  │         │
│  │                                          │         │
│  │                                          │         │
│  └──────────────────────────────────────────┘         │
│                                                        │
│  Instructions:                                        │
│  1. Open WhatsApp on your phone                       │
│  2. Go to Settings → Linked Devices                   │
│  3. Tap "Link a Device"                               │
│  4. Scan this QR code                                 │
│                                                        │
│  Status: Waiting for scan...                          │
│  [Auto-refresh in 30s]                                │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**Behavior:**
- QR refreshes automatically every 30 seconds
- Shows loading spinner during refresh
- Polls `/qr/status` every 3 seconds to detect state change
- When connected, shows success message and redirects to Dashboard after 2 seconds

**API:**
- `GET /qr/image` - Get QR image (PNG)
- `GET /qr/status` - Connection status (polling)

#### 2.3 State: Connecting

```
┌────────────────────────────────────────────────────────┐
│                    Connecting...                       │
├────────────────────────────────────────────────────────┤
│                                                        │
│                   [Spinner]                            │
│                                                        │
│  Initializing WhatsApp connection...                  │
│  Please wait while we generate your QR code.          │
│                                                        │
│  This usually takes a few seconds.                    │
│                                                        │
└────────────────────────────────────────────────────────┘
```

#### 2.4 State: Error

```
┌────────────────────────────────────────────────────────┐
│                  Connection Error                      │
├────────────────────────────────────────────────────────┤
│                                                        │
│                     ⚠                                  │
│                                                        │
│  Failed to establish WhatsApp connection              │
│                                                        │
│  Error: Connection timeout after 30s                  │
│                                                        │
│  [Retry Connection]  [View Logs]                      │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

### 3. Routes (Route Management)

**Route:** `/routes`

**Objective:** List, search, filter and manage all message routes.

**Components:**

#### 3.1 Routes List View

```
┌────────────────────────────────────────────────────────────────┐
│  Routes                                           [+ New Route]│
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  [🔍 Search routes...]                    Filter: [All ▼]     │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 📱 5493777239922                         [Lab]            │ │
│  │    → http://localhost:8000                               │ │
│  │    Agent: my_sample_agent                                │ │
│  │    Filter: None                                          │ │
│  │                                    [Edit]  [Delete]      │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 📱 * (Wildcard)                          [Lab]            │ │
│  │    → http://localhost:8001                               │ │
│  │    Agent: fallback_agent                                 │ │
│  │    Filter: ^Test.*                                       │ │
│  │                                    [Edit]  [Delete]      │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  Showing 2 of 2 routes                                        │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Features:**

**Search:**
- Search by channelId or agentEndpoint
- Instant search (no submit needed)

**Filter:**
- All routes
- Lab only
- Prod only
- With regex filter
- Without regex filter

**Route Card:**
Each route displays:
- Channel ID (or "* Wildcard")
- Agent endpoint
- Agent name (from config.adk.appName)
- Regex filter (if exists)
- Environment badge (Lab/Prod)
- Action buttons: Edit, Delete

**Actions:**
- "New Route" → Navigates to `/routes/new`
- "Edit" → Navigates to `/routes/:channelId/edit`
- "Delete" → Confirmation modal → DELETE API call

**States:**
- **Loading**: Skeleton cards while loading
- **Empty**: "No routes found. Create your first route to get started."
- **Error**: Error banner with message and "Retry" button

**API:**
- `GET /api/routes` - List all routes

---

### 4. Route Form (Create/Edit Route)

**Routes:** 
- `/routes/new` (create)
- `/routes/:channelId/edit` (edit)

**Objective:** Form to create or edit a route with complete validation.

**Design:**

```
┌────────────────────────────────────────────────────────────────┐
│  [←] Create New Route                                          │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Basic Configuration                                           │
│  ─────────────────────────────────────────────────────────────│
│                                                                │
│  Channel ID *                                                  │
│  [___________________________________]                         │
│  The WhatsApp channel ID or "*" for wildcard                  │
│                                                                │
│  Environment *                                                 │
│  ◉ Lab     ○ Production                                       │
│                                                                │
│  Agent Endpoint *                                              │
│  [http://____________________________]                         │
│  Full URL of the agent endpoint                               │
│                                                                │
│  ─────────────────────────────────────────────────────────────│
│                                                                │
│  ADK Configuration *                                           │
│  ─────────────────────────────────────────────────────────────│
│                                                                │
│  Agent Name *                                                  │
│  [___________________________________]                         │
│  ADK agent directory name (e.g., my_sample_agent)             │
│                                                                │
│  Base URL (optional)                                           │
│  [http://____________________________]                         │
│  ADK server base URL. If empty, uses Agent Endpoint.          │
│                                                                │
│  ─────────────────────────────────────────────────────────────│
│                                                                │
│  Advanced (optional)                                           │
│  ─────────────────────────────────────────────────────────────│
│                                                                │
│  Regex Filter                                                  │
│  [___________________________________]                         │
│  Only route messages matching this pattern (e.g., ^Test)      │
│                                                                │
│  [Test Regex]                                                  │
│                                                                │
│  ─────────────────────────────────────────────────────────────│
│                                                                │
│             [Cancel]                     [Save Route]         │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Validations:**

**Channel ID:**
- Required
- Can be "*" for wildcard
- If not "*", must be a valid WhatsApp number
- Cannot be duplicate (validation on submit)

**Environment:**
- Required
- Radio buttons: Lab / Production

**Agent Endpoint:**
- Required
- Must be a valid URL (http:// or https://)
- URL format validation

**Agent Name (config.adk.appName):**
- Required
- Only alphanumeric characters, hyphens and underscores
- No spaces

**Base URL (config.adk.baseUrl):**
- Optional
- If provided, must be a valid URL
- URL format validation

**Regex Filter:**
- Optional
- If provided, validates it's a valid regex
- "Test Regex" button opens modal to test the regex with sample text

**Test Regex Modal:**

```
┌──────────────────────────────────────────────────┐
│  Test Regex Pattern                              │
├──────────────────────────────────────────────────┤
│                                                  │
│  Pattern: ^Test.*                                │
│                                                  │
│  Test Text:                                      │
│  [_________________________________________]     │
│                                                  │
│  Result: ✓ Match    / ✗ No Match                │
│                                                  │
│             [Close]                              │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Behavior:**

**When creating (POST):**
1. Validate fields
2. Show loading on "Save Route" button
3. POST to `/api/routes`
4. If success: Toast confirmation + redirect to `/routes`
5. If error: Show error message in form

**When editing (PUT):**
1. Pre-load data from `GET /api/routes/:channelId`
2. On save: PUT to `/api/routes/:channelId`
3. Rest same as create

**API:**
- `POST /api/routes` (create)
- `GET /api/routes/:channelId` (get data for editing)
- `PUT /api/routes/:channelId` (update)

---

### 5. Layout and Navigation

**Main Layout:**

```
┌────────────────────────────────────────────────────────────┐
│  Header                                                     │
│  [wa2ai logo]                          [● Connected] [⚙️]  │
├──────────────┬─────────────────────────────────────────────┤
│              │                                             │
│  Sidebar     │        Main Content Area                    │
│              │                                             │
│  📊 Dashboard│                                             │
│  🔌 Connection│                                             │
│  🔀 Routes   │                                             │
│              │                                             │
│              │                                             │
│  ─────────── │                                             │
│              │                                             │
│  📚 Docs     │                                             │
│  ⚙️ Settings  │                                             │
│              │                                             │
└──────────────┴─────────────────────────────────────────────┘
```

**Header:**
- Clickable logo → Dashboard
- Connection status badge (updated in real-time)
- Settings icon → Dropdown menu with options (future)

**Sidebar:**
- Main navigation (Dashboard, Connection, Routes)
- Secondary links (Docs → external, Settings → future)
- Collapsible on mobile (hamburger menu)
- Active route highlight

**Responsiveness:**
- Desktop (>1024px): Sidebar always visible
- Tablet (768-1024px): Collapsible sidebar with toggle
- Mobile (<768px): Sidebar as overlay drawer

---

## Backend Integration

### Environment Variables

**Frontend (`apps/web/.env.local`):**

```bash
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:3000

# Refresh intervals (milliseconds)
NEXT_PUBLIC_QR_REFRESH_INTERVAL=3000
NEXT_PUBLIC_STATUS_REFRESH_INTERVAL=5000
NEXT_PUBLIC_ROUTES_REFRESH_INTERVAL=10000
```

### API Client

**Location:** `apps/web/lib/api-client.ts`

**Implementation:**

```typescript
// lib/api-client.ts
import useSWR from 'swr'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

// Generic fetcher for SWR
const fetcher = async (url: string) => {
  const res = await fetch(`${API_URL}${url}`)
  if (!res.ok) {
    const error = new Error('API request failed')
    error.info = await res.json()
    error.status = res.status
    throw error
  }
  return res.json()
}

// Routes API
export const useRoutes = () => {
  const { data, error, mutate } = useSWR('/api/routes', fetcher, {
    refreshInterval: 10000, // Refresh every 10s
  })

  return {
    routes: data?.data || [],
    isLoading: !error && !data,
    isError: error,
    mutate,
  }
}

export const createRoute = async (route: Route) => {
  const res = await fetch(`${API_URL}/api/routes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(route),
  })
  if (!res.ok) throw new Error('Failed to create route')
  return res.json()
}

export const updateRoute = async (channelId: string, route: Route) => {
  const res = await fetch(`${API_URL}/api/routes/${channelId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(route),
  })
  if (!res.ok) throw new Error('Failed to update route')
  return res.json()
}

export const deleteRoute = async (channelId: string) => {
  const res = await fetch(`${API_URL}/api/routes/${channelId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to delete route')
  return res.status === 204 ? {} : res.json()
}

// QR/Connection API
export const useConnectionStatus = () => {
  const { data, error } = useSWR('/qr/status', fetcher, {
    refreshInterval: 3000, // Refresh every 3s
  })

  return {
    status: data?.status || 'disconnected',
    connected: data?.connected || false,
    qrAvailable: data?.qrAvailable || false,
    error: data?.error,
    isLoading: !error && !data,
  }
}

export const getQRImageUrl = () => {
  return `${API_URL}/qr/image?t=${Date.now()}` // Cache busting
}
```

### Shared TypeScript Types

**Location:** `apps/web/lib/types.ts`

```typescript
// lib/types.ts
// These types must match router/src/core/models.ts

export type Environment = 'lab' | 'prod'

export type ConnectionStatus = 
  | 'connected' 
  | 'connecting' 
  | 'qr_ready' 
  | 'disconnected'

export interface Route {
  channelId: string
  agentEndpoint: string
  environment: Environment
  regexFilter?: string
  config?: {
    adk?: {
      appName: string
      baseUrl?: string
    }
  }
}

export interface ConnectionState {
  status: ConnectionStatus
  connected: boolean
  qrAvailable: boolean
  error?: string
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  code?: string
  details?: unknown
}
```

### Error Handling

**Strategy:**

1. **Network Errors**: Toast notification "Unable to connect to server"
2. **Validation Errors** (400): Show errors in form
3. **Not Found** (404): Error page or redirect
4. **Server Errors** (500): Toast notification "Server error, please try again"

**ErrorBoundary Component:**
- Catches React errors
- Shows friendly error page
- Option to reload or return to dashboard

---

## UX Considerations

### 1. Loading States

**Skeleton Screens:**
- Use skeletons for route lists (not spinners)
- Skeletons should match final layout
- Better UX than blank screen or spinner

**Spinners:**
- For user actions (save, delete)
- Inline in buttons: "Saving..." with small spinner
- Overlay for operations that block UI

### 2. Immediate Feedback

**Toasts (temporary notifications):**
- Success: "Route created successfully"
- Error: "Failed to create route: [error message]"
- Info: "QR code refreshed"
- Warning: "Connection lost, retrying..."

**Position:** Top-right
**Duration:** 3-5 seconds (4s default)
**Stack:** Maximum 3 visible toasts

### 3. Confirmations

**Destructive actions require confirmation:**
- Delete route → Modal: "Are you sure you want to delete this route?"
- Disconnect WhatsApp → Modal: "Disconnect WhatsApp? You'll need to scan QR again."

**Standard confirmation modal:**
```
┌──────────────────────────────────────────────────┐
│  Confirm Delete                                  │
├──────────────────────────────────────────────────┤
│                                                  │
│  Are you sure you want to delete this route?    │
│                                                  │
│  Channel: 5493777239922                          │
│  Agent: my_sample_agent                          │
│                                                  │
│  This action cannot be undone.                  │
│                                                  │
│         [Cancel]        [Delete]                │
│                                                  │
└──────────────────────────────────────────────────┘
```

### 4. Empty States

**No routes:**
```
┌────────────────────────────────────────────────────┐
│                                                    │
│                   [Icon]                           │
│                                                    │
│          No routes configured yet                  │
│                                                    │
│  Create your first route to start routing         │
│  messages to AI agents.                           │
│                                                    │
│            [+ Create Route]                        │
│                                                    │
└────────────────────────────────────────────────────┘
```

### 5. Accessibility

**Requirements:**
- ✅ Complete keyboard navigation (Tab, Enter, Esc)
- ✅ ARIA labels on all interactive controls
- ✅ Color contrast meets WCAG 2.1 AA
- ✅ Visible focus on all interactive elements
- ✅ Error messages accessible to screen readers
- ✅ Forms with properly associated labels

### 6. Responsive Design

**Breakpoints:**
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

**Mobile Adaptations:**
- Sidebar → Drawer
- Route cards → More compact vertical layout
- QR code → Responsive size (max-width: 90vw)
- Forms → Full-width inputs

---

## Implementation Plan

### Phase 1: Setup and Base Structure (Day 1)

**Tasks:**
1. ✅ Create `apps/web/` directory
2. ✅ Initialize Next.js project with TypeScript
3. ✅ Install dependencies:
   - shadcn/ui + Tailwind CSS
   - SWR for data fetching
   - react-hook-form + zod for forms
   - Lucide icons
4. ✅ Configure Tailwind and shadcn/ui
5. ✅ Create main layout with sidebar
6. ✅ Configure environment variables
7. ✅ Create base API client

**Deliverables:**
- Complete directory structure
- Working responsive layout
- Verified backend connection

### Phase 2: Dashboard and Connection (Day 2)

**Tasks:**
1. ✅ Implement Dashboard:
   - Connection Status Card
   - Routes Summary Card
   - Quick Actions
2. ✅ Implement Connection screen:
   - States: Connected, QR Ready, Connecting, Error
   - Status polling
   - QR code display
   - Auto-refresh
3. ✅ Complete integration with `/qr/*` endpoints

**Deliverables:**
- Functional dashboard with real data
- Complete WhatsApp connection flow
- Visible and functional QR code

### Phase 3: Routes List (Day 3)

**Tasks:**
1. ✅ Implement routes list:
   - Fetch from API
   - Display in cards
   - Loading states (skeletons)
   - Empty state
2. ✅ Implement search and filters
3. ✅ Implement Delete action with confirmation

**Deliverables:**
- Functional routes list
- Operational search and filters
- Working route deletion

### Phase 4: Route Form (Day 4)

**Tasks:**
1. ✅ Implement creation form:
   - All fields with validation
   - Zod schema for validation
   - react-hook-form integration
2. ✅ Implement Test Regex modal
3. ✅ Implement edit form:
   - Data pre-loading
   - Update with PUT
4. ✅ Error handling in forms

**Deliverables:**
- Functional route creation
- Functional route editing
- Complete validations

### Phase 5: Polish and Testing (Day 5)

**Tasks:**
1. ✅ Implement toasts and feedback
2. ✅ Implement error boundaries
3. ✅ Review accessibility
4. ✅ Manual testing of complete flows:
   - Connect WhatsApp
   - Create/edit/delete routes
   - Complete navigation
5. ✅ UX and responsive adjustments
6. ✅ Document components and hooks

**Deliverables:**
- Fully functional frontend
- All flows tested
- Basic documentation in README

### Phase 6: Docker and Deployment (Day 6)

**Tasks:**
1. ✅ Create Dockerfile for frontend
2. ✅ Update docker-compose to include frontend
3. ✅ Configure CORS in backend
4. ✅ Testing in Docker environment
5. ✅ Deployment documentation

**Deliverables:**
- Deployable frontend with Docker
- Functional docker-compose
- Configuration documentation

---

## Next Steps (Post-MVP)

### Future Features (Not included in MVP)

1. **User Authentication**
   - Login/register
   - Roles and permissions
   - Multi-tenancy

2. **Logs and Metrics**
   - Processed messages dashboard
   - Activity charts
   - Real-time logs

3. **Visual Regex Editor**
   - Visual pattern builder
   - Predefined examples
   - Interactive testing

4. **WebSockets**
   - Replace polling with WebSockets
   - Real-time updates
   - Live connection state

5. **Advanced Configuration**
   - Configurable timeouts
   - Retry policies
   - Rate limiting per route

6. **Route Testing**
   - Send test message
   - View agent response
   - Routing debug

7. **Configuration Export/Import**
   - Export routes to JSON
   - Import from file
   - Route templates

8. **Monitoring**
   - Visual health checks
   - Alerts
   - Notifications

---

## Summary

This document defines the MVP frontend for wa2ai, focused on two critical needs:

1. ✅ **QR code synchronization**: Friendly interface to authenticate WhatsApp via Baileys
2. ✅ **Routes CRUD**: Complete visual management of message routes

**Stack:**
- Next.js 14+ with App Router
- TypeScript
- shadcn/ui + Tailwind CSS
- SWR for data fetching

**MVP Scope:**
- ✅ Dashboard with system status
- ✅ Connection screen with QR
- ✅ Routes list with search/filters
- ✅ Route creation/editing forms
- ✅ Complete validation
- ✅ Responsive design

**Estimated time:** 6 days of development

The frontend is designed to be simple, functional and extensible, facilitating wa2ai deployment and laying the foundation for future improvements.
