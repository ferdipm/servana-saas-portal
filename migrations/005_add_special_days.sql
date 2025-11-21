-- ============================================================================
-- MIGRACIÓN: Add special_days field to restaurant_info
-- Versión: 005
-- Fecha: 2025-11-19
-- Descripción: Añadir campo JSONB para almacenar días especiales/excepciones
-- ============================================================================

BEGIN;

-- Añadir columna special_days para almacenar excepciones (festivos, eventos, etc.)
ALTER TABLE restaurant_info
  ADD COLUMN IF NOT EXISTS special_days JSONB DEFAULT '[]'::jsonb;

-- Comentario descriptivo
COMMENT ON COLUMN restaurant_info.special_days IS
  'Array de días especiales con formato: [{ id, date, name, type: "closed"|"special_hours", hours? }]';

-- Índice GIN para búsquedas en el JSONB
CREATE INDEX IF NOT EXISTS idx_restaurant_info_special_days
  ON restaurant_info USING GIN (special_days);

COMMIT;

-- Ejemplo de uso:
-- UPDATE restaurant_info
-- SET special_days = '[
--   {"id": "special-1", "date": "2024-12-25", "name": "Navidad", "type": "closed"},
--   {"id": "special-2", "date": "2024-12-24", "name": "Nochebuena", "type": "special_hours", "hours": "09:00-15:00"}
-- ]'::jsonb
-- WHERE id = 'restaurant-uuid';
