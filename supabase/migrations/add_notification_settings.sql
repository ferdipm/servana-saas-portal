-- Migration: Add notification_settings field for restaurant configuration
-- Created: 2025-12-01
-- Purpose: Store notification preferences for each restaurant

-- Add notification_settings JSONB field with default values
ALTER TABLE restaurant_info
ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{
  "reminder_24h_enabled": true,
  "confirmation_required": true,
  "notify_on_cancellation": true,
  "notify_on_new_reservation": false
}'::jsonb;

-- Comment on column for documentation
COMMENT ON COLUMN restaurant_info.notification_settings IS 'JSON object with notification preferences: reminder_24h_enabled, confirmation_required, notify_on_cancellation, notify_on_new_reservation';
