-- Routes table schema for wa2ai router
-- This table stores routing rules that map channel IDs to agent endpoints

CREATE TABLE IF NOT EXISTS routes (
  -- Primary key: channel ID (WhatsApp number without @s.whatsapp.net)
  channel_id VARCHAR(255) PRIMARY KEY,
  
  -- Agent endpoint URL where messages should be forwarded
  agent_endpoint TEXT NOT NULL,
  
  -- Environment identifier (e.g., 'lab', 'prod')
  environment VARCHAR(50) NOT NULL DEFAULT 'lab',
  
  -- Timestamps for tracking
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups by environment
CREATE INDEX IF NOT EXISTS idx_routes_environment ON routes(environment);

-- Index for faster lookups by agent endpoint (useful for management queries)
CREATE INDEX IF NOT EXISTS idx_routes_agent_endpoint ON routes(agent_endpoint);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at on row updates
DROP TRIGGER IF EXISTS update_routes_updated_at ON routes;
CREATE TRIGGER update_routes_updated_at
  BEFORE UPDATE ON routes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE routes IS 'Stores routing rules mapping channel IDs to agent endpoints';
COMMENT ON COLUMN routes.channel_id IS 'WhatsApp channel identifier (phone number without @s.whatsapp.net)';
COMMENT ON COLUMN routes.agent_endpoint IS 'URL of the AI agent endpoint where messages should be forwarded';
COMMENT ON COLUMN routes.environment IS 'Environment identifier (lab, prod, etc.)';
COMMENT ON COLUMN routes.created_at IS 'Timestamp when the route was created';
COMMENT ON COLUMN routes.updated_at IS 'Timestamp when the route was last updated';
