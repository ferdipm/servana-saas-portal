-- Migration: Add indexes for analytics performance optimization
-- Created: 2025-11-29
-- Purpose: Optimize queries for analytics dashboard

-- Index for filtering reservations by restaurant and date range with status
-- This is the most common query pattern in analytics
CREATE INDEX IF NOT EXISTS idx_reservations_analytics
ON reservations(restaurant_id, datetime_utc, status)
WHERE status IN ('confirmed', 'seated', 'finished');

-- Index for filtering by tenant, date, and status
-- Useful for multi-tenant queries
CREATE INDEX IF NOT EXISTS idx_reservations_tenant_date
ON reservations(tenant_id, datetime_utc, status);

-- Index for datetime-based queries (real-time occupancy)
CREATE INDEX IF NOT EXISTS idx_reservations_datetime
ON reservations(restaurant_id, datetime_utc)
WHERE status IN ('confirmed', 'seated', 'finished');

-- Index for status filtering (general queries)
CREATE INDEX IF NOT EXISTS idx_reservations_status
ON reservations(status);

-- Composite index for source analytics
CREATE INDEX IF NOT EXISTS idx_reservations_source_analytics
ON reservations(restaurant_id, source, datetime_utc)
WHERE status IN ('confirmed', 'seated', 'finished');

-- Comment on indexes for documentation
COMMENT ON INDEX idx_reservations_analytics IS 'Optimizes analytics queries by restaurant, date range, and active status';
COMMENT ON INDEX idx_reservations_tenant_date IS 'Optimizes tenant-level analytics queries';
COMMENT ON INDEX idx_reservations_datetime IS 'Optimizes real-time occupancy queries by datetime';
COMMENT ON INDEX idx_reservations_status IS 'Optimizes status-based filtering';
COMMENT ON INDEX idx_reservations_source_analytics IS 'Optimizes reservation source breakdown queries';
