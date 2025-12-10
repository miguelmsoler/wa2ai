#!/bin/bash
#
# Docker Compose wrapper for wa2ai lab environment.
#
# This script automatically sets COMPOSE_PROFILES based on WA2AI_PROVIDER
# from the .env file, allowing conditional inclusion of Evolution API services.
#
# Usage:
#   ./infra/docker-compose.sh [docker compose commands...]
#   Example: ./infra/docker-compose.sh up -d
#   Example: ./infra/docker-compose.sh logs -f wa2ai-lab
#

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.lab.yml"
ENV_FILE="$PROJECT_ROOT/.env"

# Default provider if not set
DEFAULT_PROVIDER="baileys"

# Read WA2AI_PROVIDER from .env file if it exists
if [ -f "$ENV_FILE" ]; then
  # Source the .env file and extract WA2AI_PROVIDER
  # Use grep to find WA2AI_PROVIDER, handling comments and empty lines
  PROVIDER=$(grep -E '^[[:space:]]*WA2AI_PROVIDER[[:space:]]*=' "$ENV_FILE" | sed 's/^[[:space:]]*WA2AI_PROVIDER[[:space:]]*=[[:space:]]*//' | sed 's/[[:space:]]*$//' | head -1)
  
  # Remove quotes if present
  PROVIDER=$(echo "$PROVIDER" | sed "s/^['\"]//" | sed "s/['\"]$//")
  
  # Use default if empty or not found
  if [ -z "$PROVIDER" ]; then
    PROVIDER="$DEFAULT_PROVIDER"
  fi
else
  PROVIDER="$DEFAULT_PROVIDER"
fi

# Normalize provider name to lowercase
PROVIDER=$(echo "$PROVIDER" | tr '[:upper:]' '[:lower:]')

# Set COMPOSE_PROFILES based on provider
if [ "$PROVIDER" = "evolution" ]; then
  export COMPOSE_PROFILES="evolution"
  echo "[docker-compose.sh] WA2AI_PROVIDER=evolution detected - including Evolution API services (postgres, evolution-api-lab)"
else
  export COMPOSE_PROFILES=""
  echo "[docker-compose.sh] WA2AI_PROVIDER=$PROVIDER detected - excluding Evolution API services (using Baileys only)"
fi

# Execute docker compose with the compose file and all passed arguments
exec docker compose -f "$COMPOSE_FILE" "$@"
