-- Migration: Add checkin_token to reservations for QR-based check-in
-- Date: 2024-12-08

-- Add checkin_token column (unique token for QR code verification)
ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS checkin_token TEXT UNIQUE;

-- Create index for fast token lookup during scan
CREATE INDEX IF NOT EXISTS idx_reservations_checkin_token
ON reservations(checkin_token)
WHERE checkin_token IS NOT NULL;

-- Comment
COMMENT ON COLUMN reservations.checkin_token IS 'Unique token for QR code check-in verification';
