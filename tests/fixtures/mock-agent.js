#!/usr/bin/env node
/**
 * Mock AI Agent for testing wa2ai routing.
 * 
 * This simple HTTP server simulates an AI agent endpoint.
 * It receives messages, logs them, and acknowledges receipt without sending responses back.
 * 
 * Usage:
 *   node tests/fixtures/mock-agent.js [port]
 * 
 * Default: port 8000
 */

import http from 'http'

const PORT = parseInt(process.argv[2] || '8000', 10)

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
      })

      // Acknowledge message but don't send response back
      const response = {
        success: true,
        // No response field - agent processed but didn't reply
      }

      // Simulate processing delay
      setTimeout(() => {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(response))
        console.log(`[MockAgent] Acknowledged message:`, { messageId: message.id })
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
