# wa2ai → Agent Contract Specification

This document defines the contract between wa2ai router and AI agent endpoints. Currently, wa2ai uses the **ADK (Agent Development Kit) API format** as specified in `refs/adk_api.md`. This contract is implemented by the `HttpAgentClient` class.

**Last Updated:** 2025-12-09  
**Version:** 2.0

---

## Overview

wa2ai communicates with AI agents using the **ADK API format** via HTTP POST requests. The contract defines:
- **Request format**: ADK `/run` endpoint format (as per `refs/adk_api.md`)
- **Response format**: ADK events array format
- **Error handling**: How errors are communicated
- **Timeout behavior**: Request timeout configuration

**Note:** ADK is the current implementation. The system is designed to support other agent protocols in the future (e.g., gRPC, WebSocket, or other agent APIs) by implementing additional `AgentClient` implementations. For now, all agents must implement the ADK API format to work with wa2ai.

---

## Request Format

wa2ai uses the **ADK API format** as specified in `refs/adk_api.md`.

### HTTP Method and Endpoint

**Method:** `POST`  
**Endpoint:** `{baseUrl}/run`

Where `baseUrl` is the ADK server base URL (e.g., `http://localhost:8000`).

**Headers:**
```
Content-Type: application/json
```

### Request Body

wa2ai sends incoming WhatsApp messages to the ADK `/run` endpoint in the following JSON format:

```json
{
  "app_name": "my_sample_agent",
  "user_id": "5493777239922",
  "session_id": "5493777239922_5493777239922",
  "new_message": {
    "parts": [
      {"text": "Hello, how can you help me?"}
    ]
  },
  "streaming": false,
  "state_delta": null,
  "invocation_id": null
}
```

#### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `app_name` | `string` | Yes | ADK agent name (directory name, from route `config.adk.appName`) |
| `user_id` | `string` | Yes | User identifier (extracted from `message.from`, sanitized) |
| `session_id` | `string` | Yes | Session identifier (generated as `{from}_{channelId}`, sanitized) |
| `new_message` | `object` | Yes | Message content in ADK Content format |
| `new_message.parts` | `array` | Yes | Array of message parts (text, images, etc.) |
| `new_message.parts[].text` | `string` | Yes | Text content from `message.text` |
| `streaming` | `boolean` | No | Always `false` (non-streaming mode) |
| `state_delta` | `object\|null` | No | Always `null` |
| `invocation_id` | `string\|null` | No | Always `null` |

### Example Request

```http
POST http://localhost:8000/run
Content-Type: application/json

{
  "app_name": "my_sample_agent",
  "user_id": "5493777239922",
  "session_id": "5493777239922_5493777239922",
  "new_message": {
    "parts": [
      {"text": "What's the weather today?"}
    ]
  },
  "streaming": false,
  "state_delta": null,
  "invocation_id": null
}
```

---

## Response Format

wa2ai expects responses in the **ADK events array format** as specified in `refs/adk_api.md`.

### Success Response

ADK agents must respond with an array of Event objects:

```json
[
  {
    "content": {
      "parts": [
        {"text": "I can help you with that. The weather today is sunny, 25°C."}
      ],
      "role": "model"
    },
    "invocationId": "e-7e18f0f0-9616-4508-9780-ee812fb8ff57",
    "author": "model",
    "actions": {
      "stateDelta": {},
      "artifactDelta": {}
    }
  }
]
```

#### Response Processing

wa2ai processes the ADK response as follows:
1. Receives array of Event objects
2. Filters events to find model responses (`author === 'model'`)
3. Extracts text from the last model event's `content.parts`
4. Converts to wa2ai's `AgentResponse` format:
   ```json
   {
     "success": true,
     "response": "I can help you with that. The weather today is sunny, 25°C.",
     "metadata": {
       "adk": {
         "sessionId": "5493777239922_5493777239922",
         "userId": "5493777239922",
         "eventCount": 1,
         "invocationId": "e-7e18f0f0-9616-4508-9780-ee812fb8ff57"
       }
     }
   }
   ```

**Note:** If no model events are found in the response array, wa2ai returns `success: true` but without a `response` field, meaning no message will be sent back to the user.

### Error Response

ADK agents indicate errors via HTTP status codes:

- **400 Bad Request**: Invalid request format (wa2ai will log and throw an error)
- **404 Not Found**: Agent or session not found (wa2ai will log and throw an error)
- **500 Internal Server Error**: Agent execution error (wa2ai will log and throw an error)

wa2ai does not process error responses from the response body; all errors are indicated via HTTP status codes.

---

## Timeout Configuration

wa2ai's `HttpAgentClient` has a configurable timeout:

- **Default timeout**: 30 seconds (30000 ms)
- **Configurable**: Can be set via `AgentClientConfig.timeout`

If the agent does not respond within the timeout period, wa2ai will:
1. Abort the request
2. Log an error with `timeout: true`
3. Throw an error: `"Request to agent timed out after {timeout}ms"`

---

## Error Handling

### Network Errors

If the request fails due to network issues (connection refused, DNS error, etc.), wa2ai will:
1. Log an error with the error message
2. Throw an error: `"Failed to send message to ADK agent: {errorMessage}"`

### HTTP Error Status

If the ADK agent returns a non-200 HTTP status code, wa2ai will:
1. Read the response body (if available)
2. Log an error with the status code and error text
3. Throw an error: `"ADK agent endpoint returned {status}: {errorText}"`

### Empty or Invalid Response

If the ADK agent returns `200 OK` but:
- The response is not an array: wa2ai throws an error
- The response array has no model events: wa2ai returns `success: true` with no `response` field (no message sent to user)
- The response array has model events: wa2ai extracts text from the last model event

---

## Implementation Details

### wa2ai Side

The contract is implemented by:
- **Interface**: `AgentClient` (in `router/src/core/agent-client.ts`)
- **Implementation**: `HttpAgentClient` (in `router/src/infra/http-agent-client.ts`)

**Usage Example:**
```typescript
import { HttpAgentClient } from './infra/http-agent-client.js'
import type { IncomingMessage } from './core/models.js'

// HttpAgentClient always requires ADK configuration
const agentClient = new HttpAgentClient({
  timeout: 30000,
  adk: {
    appName: 'my_sample_agent',
    baseUrl: 'http://localhost:8000',
  },
})

const message: IncomingMessage = {
  id: 'msg_001',
  from: '5493777239922@s.whatsapp.net',
  channelId: '5493777239922',
  text: 'Hello',
  timestamp: new Date(),
}

const response = await agentClient.sendMessage(
  'http://localhost:8000', // baseUrl
  message
)

if (response.success && response.response) {
  // Send response back to user
  console.log('Agent response:', response.response)
}
```

### Agent Side

Agents must implement the ADK API format as specified in `refs/adk_api.md`:

1. **Endpoint**: `POST /run`
2. **Request format**: ADK request body (see [Request Format](#request-format))
3. **Response format**: Array of Event objects (see [Response Format](#response-format))
4. **Error handling**: HTTP status codes (400, 404, 500)

**Example ADK Agent Implementation:**
See `tests/fixtures/adk-mock-agent.js` for a complete reference implementation.

---

## Route Configuration

### ADK Configuration (Required)

All routes **must** include ADK configuration in the `config` field:

```json
{
  "channelId": "5493777239922",
  "agentEndpoint": "http://localhost:8000",
  "environment": "lab",
  "config": {
    "adk": {
      "appName": "my_sample_agent",
      "baseUrl": "http://localhost:8000"
    }
  }
}
```

**Configuration Fields:**
- `appName` (required): ADK agent name (directory name, not constructor name)
- `baseUrl` (optional): Base URL of ADK server. If not provided, uses `agentEndpoint` from the route

### Session ID Strategy

By default, wa2ai generates session IDs using the format: `{from}_{channelId}` (sanitized).

**Example:**
- `from`: `5493777239922@s.whatsapp.net`
- `channelId`: `5493777239922`
- `session_id`: `5493777239922_5493777239922`

This ensures:
- Each user has a unique session per channel
- Sessions persist across messages
- Group conversations use combined identifiers

### Usage Example

**1. Create route with ADK configuration:**
```bash
curl -X POST http://localhost:3000/api/routes \
  -H "Content-Type: application/json" \
  -d '{
    "channelId": "5493777239922",
    "agentEndpoint": "http://localhost:8000",
    "environment": "lab",
    "config": {
      "adk": {
        "appName": "my_sample_agent",
        "baseUrl": "http://localhost:8000"
      }
    }
  }'
```

**2. Send message via WhatsApp:**
- Message is automatically routed to ADK agent
- ADK processes the message using `/run` endpoint
- Response is extracted from ADK events array
- Response is sent back to WhatsApp

**3. Verify ADK communication:**
Check logs for ADK-specific entries:
```
[HttpAgentClient] Sending ADK message
[HttpAgentClient] ADK response processed
[HttpAgentClient] ADK message sent successfully
```

---

## Testing

### ADK Mock Agent

wa2ai includes an ADK mock agent for testing (`tests/fixtures/adk-mock-agent.js`):

```bash
node tests/fixtures/adk-mock-agent.js 8000 test_agent
```

The ADK mock agent:
- Listens on port 8000 (configurable)
- Implements ADK API format (`POST /run` endpoint)
- Returns ADK events array format
- Implements a safety limit (max 3 messages) to prevent infinite loops in tests
- Supports `GET /list-apps` endpoint for listing available agents

### Unit Tests

wa2ai includes comprehensive unit tests for `HttpAgentClient`:
- `tests/unit/agent-client.test.ts`

### Integration Tests

Integration tests verify the complete flow:
- `tests/integration/message-sending.test.ts`
- `tests/integration/direct-routing.test.ts`

---

## References

- **ADK API Specification**: `refs/adk_api.md`
- **wa2ai AgentClient Interface**: `router/src/core/agent-client.ts`
- **wa2ai HttpAgentClient Implementation**: `router/src/infra/http-agent-client.ts`
- **wa2ai Domain Models**: `router/src/core/models.ts`

---

## Future Extensions

The system is designed to support multiple agent protocols:

- **Current**: ADK HTTP API (implemented via `HttpAgentClient`)
- **Future possibilities**: 
  - gRPC agent clients
  - WebSocket agent clients
  - Other agent protocol implementations

New implementations should:
1. Implement the `AgentClient` interface
2. Be placed in the `router/src/infra/` layer
3. Be configured via route `config` to select the appropriate client type

## Version History

- **v2.0** (2025-12-09): Updated to use ADK API format (current implementation)
- **v1.0** (2025-12-09): Initial contract specification (deprecated - used generic format)
