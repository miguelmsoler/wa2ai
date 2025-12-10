#!/usr/bin/env node
/**
 * Mock AI Agent for testing wa2ai routing.
 * 
 * This simple HTTP server simulates an AI agent endpoint.
 * It receives messages and responds with a simple echo or predefined responses.
 * 
 * Usage:
 *   node tests/fixtures/mock-agent.js [port] [response-mode]
 * 
 * Response modes:
 *   - echo: Echo back the message text
 *   - greeting: Respond with a greeting
 *   - error: Simulate agent error
 *   - timeout: Simulate timeout (never responds)
 * 
 * Default: port 8000, mode echo
 */

import http from 'http'
import url from 'url'

const PORT = parseInt(process.argv[2] || '8000', 10)
const MODE = process.argv[3] || 'echo'

const server = http.createServer((req, res) => {
  // Only handle POST requests
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  let body = ''
  req.on('data', (chunk) => {
    body += chunk.toString()
  })

  req.on('end', () => {
    try {
      const message = JSON.parse(body)
      
      console.log(`[MockAgent] Received message:`, {
        id: message.id,
        from: message.from,
        channelId: message.channelId,
        text: message.text,
        mode: MODE,
      })

      // Handle different response modes
      let response

      switch (MODE) {
        case 'echo':
          response = {
            success: true,
            response: `Echo: ${message.text}`,
            metadata: {
              originalMessage: message.text,
              timestamp: new Date().toISOString(),
            },
          }
          break

        case 'greeting':
          response = {
            success: true,
            response: `Hello! I received your message: "${message.text}". How can I help you?`,
          }
          break

        case 'error':
          response = {
            success: false,
            error: 'Simulated agent error',
            metadata: {
              errorCode: 'MOCK_ERROR',
            },
          }
          break

        case 'timeout':
          // Never respond - simulate timeout
          console.log('[MockAgent] Simulating timeout - not responding')
          return

        default:
          response = {
            success: true,
            response: `Unknown mode: ${MODE}. Echoing: ${message.text}`,
          }
      }

      // Simulate processing delay
      setTimeout(() => {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(response))
        console.log(`[MockAgent] Sent response:`, response)
      }, 100) // 100ms delay
    } catch (error) {
      console.error('[MockAgent] Error processing request:', error)
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }))
    }
  })
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[MockAgent] Server running on http://0.0.0.0:${PORT}`)
  console.log(`[MockAgent] Mode: ${MODE}`)
  console.log(`[MockAgent] Ready to receive messages...`)
  console.log(`[MockAgent] Press Ctrl+C to stop`)
})

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`[MockAgent] Port ${PORT} is already in use`)
    process.exit(1)
  } else {
    console.error('[MockAgent] Server error:', error)
    process.exit(1)
  }
})
