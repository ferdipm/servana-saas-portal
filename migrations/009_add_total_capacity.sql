-- Migration: Add total_capacity to restaurant_info
-- This is the physical capacity of the restaurant (total seats)
-- Distinct from maxCovers which is per-shift bot limit

-- Add total_capacity column to restaurant_info
ALTER TABLE restaurant_info
ADD COLUMN IF NOT EXISTS total_capacity INT DEFAULT 50;

-- Add comment to clarify the field
COMMENT ON COLUMN restaurant_info.total_capacity IS 'Physical capacity of the restaurant (total seats). Used for manual reservations to show actual availability vs bot limits.';

-- Update existing restaurants with a sensible default
UPDATE restaurant_info SET total_capacity = 50 WHERE total_capacity IS NULL;
