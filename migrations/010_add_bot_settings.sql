-- Migration: Add bot_settings column to restaurant_info
-- Purpose: Store bot configuration (reservation mode, disabled message, etc.)
-- Date: 2024-12-20

-- Add bot_settings JSONB column
ALTER TABLE restaurant_info
ADD COLUMN IF NOT EXISTS bot_settings JSONB DEFAULT '{"reservation_mode": "auto_confirm"}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN restaurant_info.bot_settings IS 'Bot configuration: reservation_mode (auto_confirm/pending/disabled), disabled_message, etc.';

-- Create index for efficient querying by reservation_mode
CREATE INDEX IF NOT EXISTS idx_restaurant_info_bot_settings_mode
ON restaurant_info ((bot_settings->>'reservation_mode'));
