#!/usr/bin/env node
/**
 * Mock AI Agent for testing wa2ai routing.
 * 
 * This simple HTTP server simulates an AI agent endpoint.
 * It receives messages, logs them, and sends responses back.
 * 
 * Safety mechanism: Limits responses to 3 messages to prevent sending messages to everyone.
 * After 3 responses, it only logs received messages without responding.
 * 
 * Usage:
 *   node tests/fixtures/mock-agent.js [port]
 * 
 * Default: port 8000
 */

import http from 'http'

const PORT = parseInt(process.argv[2] || '8000', 10)

// Global counter to limit message responses (safety mechanism)
let messagesSentCount = 0
const MAX_MESSAGES_TO_SEND = 3

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

      // Check if we've reached the message limit
      if (messagesSentCount >= MAX_MESSAGES_TO_SEND) {
        // Only log, don't send response (safety mechanism)
        console.log(`[MockAgent] Message limit reached (${MAX_MESSAGES_TO_SEND}). Logging only, no response sent.`, {
          messageId: message.id,
          messagesSentCount,
        })
        
        const response = {
          success: true,
          // No response field - limit reached, don't send response
        }

        setTimeout(() => {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(response))
        }, 100)
        return
      }

      // Increment counter and send response
      messagesSentCount++
      const response = {
        success: true,
        response: `Echo from wa2ai: ${message.text}`,
      }

      // Simulate processing delay
      setTimeout(() => {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(response))
        console.log(`[MockAgent] Sent response (${messagesSentCount}/${MAX_MESSAGES_TO_SEND}):`, {
          messageId: message.id,
          response: response.response,
        })
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
