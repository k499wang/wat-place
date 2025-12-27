-- WaterlooPlace Database Schema
-- Run this in your Supabase SQL Editor

-- Pixels table: stores the current state of each pixel
CREATE TABLE IF NOT EXISTS pixels (
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  color VARCHAR(7) NOT NULL DEFAULT '#FFFFFF',
  user_id UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (x, y)
);

-- Pixel history for analytics/timelapse
CREATE TABLE IF NOT EXISTS pixel_history (
  id BIGSERIAL PRIMARY KEY,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  color VARCHAR(7) NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  placed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Canvas config for scalability
CREATE TABLE IF NOT EXISTS canvas_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  width INTEGER NOT NULL DEFAULT 1000,
  height INTEGER NOT NULL DEFAULT 1000,
  cooldown_seconds INTEGER NOT NULL DEFAULT 30
);

-- Insert default config
INSERT INTO canvas_config (id, width, height, cooldown_seconds)
VALUES (1, 1000, 1000, 30)
ON CONFLICT (id) DO NOTHING;

-- User cooldowns table (for server-side enforcement)
CREATE TABLE IF NOT EXISTS user_cooldowns (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  last_pixel_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE pixels ENABLE ROW LEVEL SECURITY;
ALTER TABLE pixel_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_cooldowns ENABLE ROW LEVEL SECURITY;

-- Policies for pixels table
CREATE POLICY "Anyone can read pixels"
  ON pixels FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert pixels"
  ON pixels FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update pixels"
  ON pixels FOR UPDATE
  TO authenticated
  USING (true);

-- Policies for pixel_history table
CREATE POLICY "Anyone can read pixel history"
  ON pixel_history FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert pixel history"
  ON pixel_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policies for canvas_config table
CREATE POLICY "Anyone can read canvas config"
  ON canvas_config FOR SELECT
  USING (true);

-- Policies for user_cooldowns table
CREATE POLICY "Users can read their own cooldown"
  ON user_cooldowns FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cooldown"
  ON user_cooldowns FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cooldown"
  ON user_cooldowns FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pixels_updated_at ON pixels(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_pixel_history_placed_at ON pixel_history(placed_at DESC);
CREATE INDEX IF NOT EXISTS idx_pixel_history_user_id ON pixel_history(user_id);

-- Enable realtime for pixels table
ALTER PUBLICATION supabase_realtime ADD TABLE pixels;
