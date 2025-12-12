/**
 * Webhooks controller - HTTP entry points for incoming webhooks.
 * 
 * This module handles HTTP requests from WhatsApp providers.
 * It only handles HTTP concerns (parsing request, sending response).
 * Business logic is delegated to domain services.
 */

import type { FastifyInstance } from 'fastify'
import { logger, isDebugMode } from './core/logger.js'
import type { MessageRouter } from './core/message-router.js'
import type { WhatsAppProvider } from './core/whatsapp-provider.js'
import { getBaileysConnection } from './providers/baileys-connection.js'

/**
 * Dependencies required by webhook controller.
 */
export interface WebhookControllerDependencies {
  /** Message router for processing incoming messages */
  messageRouter: MessageRouter
  /** WhatsApp provider for normalizing webhook payloads */
  whatsappProvider: WhatsAppProvider
}

/**
 * Registers webhook endpoints on the Fastify instance.
 * 
 * Dependencies are injected via parameters to avoid global state
 * and improve testability and maintainability.
 * 
 * @param app - Fastify application instance
 * @param dependencies - Required dependencies (messageRouter and whatsappProvider)
 */
export function registerWebhooks(
  app: FastifyInstance,
  dependencies: WebhookControllerDependencies
): void {
  const { messageRouter, whatsappProvider } = dependencies

  if (isDebugMode()) {
    logger.debug('[WebhookController] Registering webhooks with dependencies')
  }
  app.post('/webhooks/whatsapp/lab', async (request, reply) => {
    const body = request.body as unknown
    
    // Log incoming webhook
    if (isDebugMode()) {
      logger.debug('[WebhookController] Received webhook', {
        body,
      })
    }
    
    // Normalize webhook using provider (each provider knows its own format)
    const normalizedMessage = whatsappProvider.normalizeWebhook(body)
    
    if (normalizedMessage) {
      // Route message through MessageRouter
      const result = await messageRouter.routeMessage(normalizedMessage)
      
      if (isDebugMode()) {
        logger.debug('[WebhookController] Message routed', {
          messageId: normalizedMessage.id,
          success: result.success,
          hasResponse: !!result.response,
        })
      }
      
      logger.info('[WebhookController] Message processed via router', {
        messageId: normalizedMessage.id,
        channelId: normalizedMessage.channelId,
        success: result.success,
      })
    }
    
    reply.code(200).send({ status: 'ok', received: true })
  })

  app.post('/webhooks/whatsapp/prod', async (_request, reply) => {
    // TODO: Handle WhatsApp Cloud API webhook (Phase 2)
    reply.code(200).send({ status: 'ok' })
  })

  app.get('/health', async (_request, reply) => {
    reply.code(200).send({ status: 'healthy' })
  })

  // QR Code endpoints for Baileys authentication
  registerQREndpoints(app)
}

/**
 * Registers QR code related endpoints for Baileys authentication.
 * 
 * @param app - Fastify application instance
 */
function registerQREndpoints(app: FastifyInstance): void {
  /**
   * GET /qr - Returns QR code page for WhatsApp authentication.
   * 
   * Displays an HTML page with the QR code image that needs to be
   * scanned with WhatsApp to authenticate the connection.
   */
  app.get('/qr', async (_request, reply) => {
    const connection = getBaileysConnection()
    const state = connection.getState()

    if (isDebugMode()) {
      logger.debug('[WebhookController] QR endpoint accessed', {
        status: state.status,
        hasQR: !!state.qrCode,
      })
    }

    // If already connected, show success message
    if (state.status === 'connected') {
      reply.type('text/html').code(200)
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <title>wa2ai - WhatsApp Connected</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f0f2f5; }
            .container { text-align: center; padding: 40px; background: white; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .status { color: #25D366; font-size: 24px; margin-bottom: 10px; }
            .message { color: #667781; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="status">✓ Connected</div>
            <p class="message">WhatsApp connection is active.</p>
          </div>
        </body>
        </html>
      `
    }

    // If QR code is available, display it
    if (state.status === 'qr_ready' && state.qrCode) {
      const qrDataUrl = await connection.getQRCodeDataURL()
      
      if (qrDataUrl) {
        reply.type('text/html').code(200)
        return `
          <!DOCTYPE html>
          <html>
          <head>
            <title>wa2ai - Scan QR Code</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <meta http-equiv="refresh" content="30">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f0f2f5; }
              .container { text-align: center; padding: 40px; background: white; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              .title { color: #111b21; font-size: 24px; margin-bottom: 20px; }
              .qr-code { margin: 20px 0; }
              .qr-code img { border-radius: 8px; }
              .instructions { color: #667781; font-size: 14px; max-width: 300px; margin: 0 auto; }
              .refresh { color: #8696a0; font-size: 12px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="title">Scan QR Code</div>
              <div class="qr-code">
                <img src="${qrDataUrl}" alt="WhatsApp QR Code" />
              </div>
              <p class="instructions">
                Open WhatsApp on your phone → Settings → Linked Devices → Link a Device
              </p>
              <p class="refresh">Page refreshes automatically every 30 seconds</p>
            </div>
          </body>
          </html>
        `
      }
    }

    // No QR code available yet
    reply.type('text/html').code(200)
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>wa2ai - Waiting for QR</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta http-equiv="refresh" content="5">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f0f2f5; }
          .container { text-align: center; padding: 40px; background: white; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .status { color: #667781; font-size: 18px; margin-bottom: 10px; }
          .spinner { width: 40px; height: 40px; border: 3px solid #e9edef; border-top-color: #25D366; border-radius: 50%; animation: spin 1s linear infinite; margin: 20px auto; }
          @keyframes spin { to { transform: rotate(360deg); } }
          .error { color: #ea0038; margin-top: 10px; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="status">${state.status === 'connecting' ? 'Connecting...' : 'Waiting for QR Code'}</div>
          <div class="spinner"></div>
          ${state.lastError ? `<p class="error">Error: ${state.lastError}</p>` : ''}
        </div>
      </body>
      </html>
    `
  })

  /**
   * GET /qr/status - Returns connection status as JSON.
   * 
   * Useful for programmatic checks of the connection state.
   */
  app.get('/qr/status', async (_request, reply) => {
    const connection = getBaileysConnection()
    const state = connection.getState()

    reply.code(200).send({
      status: state.status,
      connected: state.status === 'connected',
      qrAvailable: state.status === 'qr_ready' && state.qrCode !== null,
      error: state.lastError,
    })
  })

  /**
   * GET /qr/image - Returns QR code as PNG image.
   * 
   * Returns the raw QR code image for embedding in custom UIs.
   */
  app.get('/qr/image', async (_request, reply) => {
    const connection = getBaileysConnection()
    
    if (!connection.hasQRCode()) {
      reply.code(404).send({ error: 'No QR code available' })
      return
    }

    const qrDataUrl = await connection.getQRCodeDataURL()
    
    if (!qrDataUrl) {
      reply.code(500).send({ error: 'Failed to generate QR code image' })
      return
    }

    // Extract base64 data from data URL
    const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '')
    const imageBuffer = Buffer.from(base64Data, 'base64')

    reply.type('image/png').code(200).send(imageBuffer)
  })
}

