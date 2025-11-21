-- ============================================================================
-- MIGRACIÓN: Add logo_url to restaurant_info
-- Versión: 003
-- Fecha: 2025-01-18
-- Descripción: Añadir campo logo_url a la tabla restaurant_info para
--              almacenar el URL del logo del restaurante
-- ============================================================================

BEGIN;

-- Añadir columna logo_url (TEXT nullable)
ALTER TABLE restaurant_info
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Añadir comentario a la columna
COMMENT ON COLUMN restaurant_info.logo_url IS 'URL del logo del restaurante (puede ser Supabase Storage, Cloudinary, etc.)';

COMMIT;

-- ============================================================================
-- NOTAS DE USO:
-- ============================================================================
--
-- 1. El campo es nullable porque no todos los restaurantes tendrán logo inicialmente
-- 2. Se puede almacenar en:
--    - Supabase Storage: /storage/v1/object/public/logos/{tenant_id}/{restaurant_id}.png
--    - Cloudinary: https://res.cloudinary.com/{cloud}/image/upload/v1/{public_id}
--    - Cualquier CDN externo
--
-- 3. Desde el portal, podrás:
--    - Subir una imagen
--    - Almacenarla en Supabase Storage
--    - Guardar la URL pública en este campo
--
-- 4. El bot y el portal usarán este URL para mostrar el logo en:
--    - Sidebar del dashboard
--    - Emails de confirmación
--    - Widget de reservas (futuro)
--
-- ============================================================================
