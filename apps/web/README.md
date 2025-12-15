# wa2ai Frontend

> Next.js frontend application for wa2ai - WhatsApp to AI Agent Gateway

This is the frontend application for wa2ai, providing a web interface for managing WhatsApp connections and message routing to AI agents.

## Overview

The wa2ai frontend enables:
- **WhatsApp Connection Management**: Visual QR code scanning and connection status monitoring
- **Route Management**: Complete CRUD interface for configuring message routes to AI agents
- **System Status**: Real-time dashboard showing connection and routing status

## Tech Stack

- **Framework**: Next.js 16+ with App Router
- **Language**: TypeScript
- **UI Framework**: React with shadcn/ui components
- **Styling**: Tailwind CSS v3
- **Data Fetching**: SWR (stale-while-revalidate)
- **Form Handling**: React Hook Form + Zod
- **Icons**: Lucide React
- **HTTP Client**: Axios

## Prerequisites

- **Node.js** 18 or higher
- **npm** package manager

## Getting Started

### Installation

Install dependencies:

```bash
npm install
```

### Environment Variables

Copy the example environment file and configure it:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```bash
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:3000

# Refresh intervals (milliseconds)
NEXT_PUBLIC_QR_REFRESH_INTERVAL=3000
NEXT_PUBLIC_STATUS_REFRESH_INTERVAL=5000
NEXT_PUBLIC_ROUTES_REFRESH_INTERVAL=10000
```

### Development Server

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (or the port shown in the terminal) in your browser.

The page will automatically reload when you make changes to the code.

### Build for Production

Create an optimized production build:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

## Project Structure

```
apps/web/
├── app/                    # Next.js App Router pages
│   ├── (dashboard)/       # Dashboard route group
│   │   ├── dashboard/    # Dashboard page
│   │   ├── connection/    # Connection management page
│   │   ├── routes/        # Routes management page
│   │   └── layout.tsx     # Dashboard layout with sidebar
│   ├── layout.tsx         # Root layout
│   └── page.tsx          # Home page (redirects to dashboard)
├── components/            # React components
│   ├── layout/           # Layout components (Sidebar, Header, etc.)
│   └── ui/               # shadcn/ui components
├── context/              # React context providers
├── lib/                  # Utilities and helpers
│   ├── hooks/           # Custom React hooks
│   └── utils/           # Utility functions
├── public/              # Static assets
└── .env.local           # Environment variables (not versioned)
```

## Available Scripts

- `npm run dev` - Start development server with hot-reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Features

### Dashboard
- System status overview
- Connection status card
- Routes summary
- Quick access to main functions

### Connection Management
- QR code display for WhatsApp authentication
- Real-time connection status updates
- Connection state management

### Routes Management
- List all configured routes
- Create new routes
- Edit existing routes
- Delete routes
- Search and filter routes

## Architecture

The frontend follows Clean Architecture principles:

- **Presentation Layer**: React components and pages (`app/`, `components/`)
- **Application Layer**: Custom hooks and business logic (`lib/hooks/`)
- **Domain Layer**: Type definitions and domain models
- **Infrastructure Layer**: API clients and external integrations (`lib/api/`)

## Backend Integration

The frontend communicates with the wa2ai backend via REST API:

- **Base URL**: Configured via `NEXT_PUBLIC_API_URL` environment variable
- **Endpoints**:
  - `/api/routes` - Route management
  - `/qr/image` - QR code image
  - `/qr/status` - Connection status
  - `/health` - Health check

## Development

### Code Style

- Use TypeScript for all new files
- Follow ESLint configuration
- Use Prettier for code formatting (if configured)
- Write self-documenting code with clear variable names

### Component Guidelines

- Use functional components with hooks
- Prefer Server Components when possible (Next.js App Router)
- Use Client Components (`'use client'`) only when needed for interactivity
- Follow shadcn/ui component patterns

### Adding New Components

1. Use shadcn/ui CLI to add base components:
   ```bash
   npx shadcn@latest add [component-name]
   ```

2. Create feature-specific components in `components/` directory

3. Follow the existing component structure and naming conventions

## Troubleshooting

### Port Already in Use

If port 3000 is already in use, Next.js will automatically use the next available port (3001, 3002, etc.). Check the terminal output for the actual port.

### Environment Variables Not Loading

- Ensure `.env.local` exists in `apps/web/` directory
- Restart the development server after changing environment variables
- Variables must be prefixed with `NEXT_PUBLIC_` to be accessible in the browser

### Build Errors

- Run `npm run type-check` to check for TypeScript errors
- Run `npm run lint` to check for linting errors
- Ensure all dependencies are installed: `npm install`

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [SWR Documentation](https://swr.vercel.app)

## Related Documentation

- `project/frontend-mvp.md` - Frontend MVP design and specifications
- `AGENTS.md` - Project overview and architecture guidelines
- `refs/nextjs-frontend-snippets.md` - Code snippets and patterns reference
