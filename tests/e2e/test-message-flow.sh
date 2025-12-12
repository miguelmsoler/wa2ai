#!/bin/bash
#
# End-to-end test script for wa2ai message flow.
#
# This script tests the complete flow:
# 1. Starts mock agent
# 2. Configures a route
# 3. Monitors logs
# 4. Provides instructions for manual testing
#
# Usage:
#   ./tests/e2e/test-message-flow.sh [channel-id] [agent-port]
#
# Example:
#   ./tests/e2e/test-message-flow.sh 5491155551234 8000

set -e

CHANNEL_ID="${1:-5491155551234}"
AGENT_PORT="${2:-8000}"
AGENT_URL="http://localhost:${AGENT_PORT}"
WA2AI_URL="http://localhost:3000"
MOCK_AGENT_SCRIPT="tests/fixtures/adk-mock-agent.js"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== wa2ai End-to-End Test ===${NC}"
echo ""
echo "Configuration:"
echo "  Channel ID: ${CHANNEL_ID}"
echo "  Agent URL: ${AGENT_URL}"
echo "  wa2ai URL: ${WA2AI_URL}"
echo ""

# Check if wa2ai is running
echo -e "${YELLOW}[1/5] Checking wa2ai service...${NC}"
if ! curl -s "${WA2AI_URL}/health" > /dev/null; then
  echo -e "${RED}Error: wa2ai service is not running at ${WA2AI_URL}${NC}"
  echo "Please start wa2ai first:"
  echo "  docker compose -f infra/docker-compose.lab.yml up -d wa2ai-lab"
  exit 1
fi

# Check connection status
CONNECTION_STATUS=$(curl -s "${WA2AI_URL}/qr/status" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
if [ "$CONNECTION_STATUS" != "connected" ]; then
  echo -e "${YELLOW}Warning: WhatsApp connection status is '${CONNECTION_STATUS}'${NC}"
  echo "Please ensure WhatsApp is connected. Check: ${WA2AI_URL}/qr"
  echo ""
else
  echo -e "${GREEN}✓ WhatsApp connection is active${NC}"
fi

# Check if mock agent is already running
echo -e "${YELLOW}[2/5] Checking mock agent...${NC}"
if curl -s "${AGENT_URL}" > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Mock agent is already running on port ${AGENT_PORT}${NC}"
  MOCK_AGENT_PID=""
else
  echo "Starting mock agent on port ${AGENT_PORT}..."
  node "${MOCK_AGENT_SCRIPT}" "${AGENT_PORT}" "test_agent" > /tmp/adk-mock-agent.log 2>&1 &
  MOCK_AGENT_PID=$!
  sleep 2
  
  if ! kill -0 $MOCK_AGENT_PID 2>/dev/null; then
    echo -e "${RED}Error: Failed to start mock agent${NC}"
    cat /tmp/adk-mock-agent.log
    exit 1
  fi
  
  echo -e "${GREEN}✓ Mock agent started (PID: ${MOCK_AGENT_PID})${NC}"
  echo "  Logs: tail -f /tmp/mock-agent.log"
fi

# Configure route
echo -e "${YELLOW}[3/5] Configuring route...${NC}"
ROUTE_RESPONSE=$(curl -s -X POST "${WA2AI_URL}/api/routes" \
  -H "Content-Type: application/json" \
  -d "{
    \"channelId\": \"${CHANNEL_ID}\",
    \"agentEndpoint\": \"${AGENT_URL}\",
    \"environment\": \"lab\"
  }")

if echo "$ROUTE_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ Route configured successfully${NC}"
  echo "  Channel: ${CHANNEL_ID} → Agent: ${AGENT_URL}"
else
  echo -e "${RED}Error: Failed to configure route${NC}"
  echo "$ROUTE_RESPONSE"
  [ -n "$MOCK_AGENT_PID" ] && kill $MOCK_AGENT_PID 2>/dev/null || true
  exit 1
fi

# Verify route
echo -e "${YELLOW}[4/5] Verifying route...${NC}"
VERIFY_RESPONSE=$(curl -s "${WA2AI_URL}/api/routes/${CHANNEL_ID}")
if echo "$VERIFY_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ Route verified${NC}"
else
  echo -e "${RED}Error: Route verification failed${NC}"
  echo "$VERIFY_RESPONSE"
fi

# List all routes
echo ""
echo "Current routes:"
curl -s "${WA2AI_URL}/api/routes" | python3 -m json.tool 2>/dev/null || curl -s "${WA2AI_URL}/api/routes"

echo ""
echo -e "${GREEN}[5/5] Setup complete!${NC}"
echo ""
echo -e "${YELLOW}=== Testing Instructions ===${NC}"
echo ""
echo "1. Send a WhatsApp message from your phone to the number: ${CHANNEL_ID}"
echo "   (or to yourself if ${CHANNEL_ID} is your number)"
echo ""
echo "2. Monitor wa2ai logs:"
echo "   docker compose -f infra/docker-compose.lab.yml logs -f wa2ai-lab"
echo ""
echo "3. Monitor mock agent logs:"
if [ -n "$MOCK_AGENT_PID" ]; then
  echo "   tail -f /tmp/adk-mock-agent.log"
else
  echo "   (check the terminal where mock agent is running)"
fi
echo ""
echo "4. Expected flow:"
echo "   - Message received from WhatsApp"
echo "   - Message normalized and routed"
echo "   - Sent to mock agent at ${AGENT_URL}"
echo "   - Agent response sent back to WhatsApp"
echo ""
echo "5. To check route status:"
echo "   curl ${WA2AI_URL}/api/routes"
echo ""
echo "6. To remove route:"
echo "   curl -X DELETE ${WA2AI_URL}/api/routes/${CHANNEL_ID}"
echo ""

# Cleanup function
cleanup() {
  if [ -n "$MOCK_AGENT_PID" ]; then
    echo ""
    echo -e "${YELLOW}Cleaning up mock agent (PID: ${MOCK_AGENT_PID})...${NC}"
    kill $MOCK_AGENT_PID 2>/dev/null || true
    wait $MOCK_AGENT_PID 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

echo -e "${GREEN}Press Ctrl+C to stop monitoring (mock agent will be stopped)${NC}"
echo ""
echo "Waiting for messages... (monitoring logs)"
echo ""

# Monitor logs
if [ -n "$MOCK_AGENT_PID" ]; then
    tail -f /tmp/adk-mock-agent.log &
  TAIL_PID=$!
  wait $TAIL_PID
else
  echo "Mock agent is running externally. Monitor its logs manually."
  echo "Press Ctrl+C to exit this script."
  wait
fi
