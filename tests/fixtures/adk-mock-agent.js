#!/usr/bin/env node
/**
 * ADK Mock Agent for testing wa2ai routing.
 * 
 * This HTTP server simulates an ADK (Agent Development Kit) agent endpoint.
 * It implements the ADK API specification as documented in refs/adk_api.md.
 * 
 * Endpoints:
 *   - POST /run - Executes the agent and returns events (ADK format)
 *   - GET /list-apps - Lists available agents (optional, for testing)
 * 
 * Safety mechanism: Limits responses to 3 messages to prevent sending messages to everyone.
 * After 3 responses, it only logs received messages without responding.
 * 
 * Usage:
 *   node tests/fixtures/adk-mock-agent.js [port] [app_name]
 * 
 * Default: port 8000, app_name "test_agent"
 */

import http from 'http'
import { randomUUID } from 'crypto'

const PORT = parseInt(process.argv[2] || '8000', 10)
const APP_NAME = process.argv[3] || 'test_agent'

// Global counter to limit message responses (safety mechanism)
let messagesSentCount = 0
const MAX_MESSAGES_TO_SEND = 3

// In-memory session storage (for testing)
const sessions = new Map()

const server = http.createServer((req, res) => {
  // Set CORS headers for testing
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // Handle OPTIONS for CORS
  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  // Route requests
  if (req.url === '/list-apps' && req.method === 'GET') {
    handleListApps(req, res)
    return
  }

  if (req.url === '/run' && req.method === 'POST') {
    handleRun(req, res)
    return
  }

  // Unknown endpoint
  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Not found' }))
})

/**
 * Handles GET /list-apps - Lists available agents
 */
function handleListApps(req, res) {
  const response = [APP_NAME]
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(response))
}

/**
 * Handles POST /run - Executes the agent (ADK format)
 */
function handleRun(req, res) {
  let body = ''
  req.on('data', (chunk) => {
    body += chunk.toString()
  })

  req.on('end', () => {
    try {
      const request = JSON.parse(body)

      // Validate required fields according to adk_api.md
      if (!request.app_name || !request.user_id || !request.session_id || !request.new_message) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
          error: 'Missing required fields: app_name, user_id, session_id, or new_message',
        }))
        return
      }

      // Validate app_name matches
      if (request.app_name !== APP_NAME) {
        res.writeHead(404, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
          error: `Agent '${request.app_name}' not found`,
        }))
        return
      }

      // Extract message text from new_message.parts
      const messageText = request.new_message?.parts
        ?.map((part) => part.text)
        .filter(Boolean)
        .join('') || ''

      console.log(`[AdkMockAgent] Received ADK request:`, {
        app_name: request.app_name,
        user_id: request.user_id,
        session_id: request.session_id,
        message: messageText,
        streaming: request.streaming || false,
      })

      // Initialize or retrieve session
      const sessionId = request.session_id
      if (!sessions.has(sessionId)) {
        sessions.set(sessionId, {
          id: sessionId,
          appName: request.app_name,
          userId: request.user_id,
          state: {},
          events: [],
          lastUpdateTime: Date.now() / 1000,
        })
      }

      const session = sessions.get(sessionId)

      // Check if we've reached the message limit
      if (messagesSentCount >= MAX_MESSAGES_TO_SEND) {
        // Only log, don't send response (safety mechanism)
        console.log(`[AdkMockAgent] Message limit reached (${MAX_MESSAGES_TO_SEND}). Logging only, no response sent.`, {
          sessionId,
          messagesSentCount,
        })

        // Return empty events array (no response)
        const response = []
        setTimeout(() => {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(response))
        }, 100)
        return
      }

      // Increment counter
      messagesSentCount++

      // Create user event
      const userEvent = {
        content: {
          parts: [{ text: messageText }],
          role: 'user',
        },
        invocationId: `e-${randomUUID()}`,
        author: 'user',
        actions: {
          stateDelta: {},
          artifactDelta: {},
        },
      }

      // Add user event to session
      session.events.push(userEvent)

      // Create model response event
      const responseText = `Echo from ADK mock agent: ${messageText}`
      const modelEvent = {
        content: {
          parts: [{ text: responseText }],
          role: 'model',
        },
        invocationId: `e-${randomUUID()}`,
        author: 'model',
        actions: {
          stateDelta: {},
          artifactDelta: {},
        },
      }

      // Add model event to session
      session.events.push(modelEvent)
      session.lastUpdateTime = Date.now() / 1000

      // Return events array (ADK format)
      const events = [userEvent, modelEvent]

      // Simulate processing delay
      setTimeout(() => {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(events))
        console.log(`[AdkMockAgent] Sent response (${messagesSentCount}/${MAX_MESSAGES_TO_SEND}):`, {
          sessionId,
          eventCount: events.length,
          responseText,
        })
      }, 100) // 100ms delay
    } catch (error) {
      console.error('[AdkMockAgent] Error processing request:', error)
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Invalid JSON or request format' }))
    }
  })
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[AdkMockAgent] Server running on http://0.0.0.0:${PORT}`)
  console.log(`[AdkMockAgent] App name: ${APP_NAME}`)
  console.log(`[AdkMockAgent] Endpoints:`)
  console.log(`[AdkMockAgent]   POST /run - Execute agent`)
  console.log(`[AdkMockAgent]   GET /list-apps - List available agents`)
  console.log(`[AdkMockAgent] Ready to receive messages...`)
  console.log(`[AdkMockAgent] Press Ctrl+C to stop`)
})

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`[AdkMockAgent] Port ${PORT} is already in use`)
    process.exit(1)
  } else {
    console.error('[AdkMockAgent] Server error:', error)
    process.exit(1)
  }
})
