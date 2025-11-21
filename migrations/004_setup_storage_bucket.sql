-- ============================================================================
-- MIGRACIÓN: Setup Storage Bucket for Logos
-- Versión: 004
-- Fecha: 2025-01-18
-- Descripción: Configurar bucket de Supabase Storage para logos de restaurantes
-- ============================================================================

BEGIN;

-- ============================================================================
-- PASO 1: Crear bucket "restaurant-logos" si no existe
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'restaurant-logos',
  'restaurant-logos',
  true, -- Bucket público para que los logos sean accesibles sin auth
  2097152, -- 2MB máximo por archivo
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PASO 2: Políticas de seguridad (RLS)
-- ============================================================================

-- Primero eliminamos las políticas si existen (para permitir re-ejecución)
DROP POLICY IF EXISTS "Authenticated users can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Public can read logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete logos" ON storage.objects;

-- 2.1 Permitir que usuarios autenticados suban logos
-- Versión simplificada: cualquier usuario autenticado puede subir
-- La validación de permisos se hace en el código del cliente/servidor
CREATE POLICY "Authenticated users can upload logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'restaurant-logos');

-- 2.2 Permitir lectura pública de todos los logos
CREATE POLICY "Public can read logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'restaurant-logos');

-- 2.3 Permitir que usuarios autenticados actualicen logos
CREATE POLICY "Authenticated users can update logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'restaurant-logos')
WITH CHECK (bucket_id = 'restaurant-logos');

-- 2.4 Permitir que usuarios autenticados eliminen logos
CREATE POLICY "Authenticated users can delete logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'restaurant-logos');

COMMIT;

-- ============================================================================
-- NOTAS IMPORTANTES:
-- ============================================================================
--
-- ESTRUCTURA DE ARCHIVOS:
-- Los logos se guardan con esta estructura:
-- /restaurant-logos/{tenant_id}/{restaurant_id}.{extension}
--
-- Ejemplos:
-- - /restaurant-logos/tenant-uuid-123/restaurant-uuid-456.png
-- - /restaurant-logos/tenant-uuid-123/restaurant-uuid-789.jpg
--
-- URL PÚBLICA:
-- https://{project-ref}.supabase.co/storage/v1/object/public/restaurant-logos/{tenant_id}/{restaurant_id}.png
--
-- SEGURIDAD:
-- - Cualquier usuario autenticado puede subir/actualizar/eliminar logos
-- - La validación de permisos (que solo suban a su tenant) se hace en:
--   * El código del cliente (LogoUploader.tsx) que construye la ruta
--   * El código del servidor (updateRestaurantLogo) que valida el restaurantId
-- - Cualquiera puede leer (bucket público)
-- - Límite de 2MB por archivo
-- - Solo imágenes: JPEG, PNG, WebP, SVG
--
-- NOTA: Las políticas RLS en Storage son más limitadas que en tablas normales.
-- La validación granular de "solo tu tenant" se hace en la capa de aplicación.
--
-- ============================================================================
