# Migración 004: Setup Storage Bucket para Logos

## Descripción
Esta migración configura Supabase Storage para permitir que los usuarios suban logos de sus restaurantes.

## Fecha
2025-01-18

## Archivos
- `004_setup_storage_bucket.sql`

## ⚠️ IMPORTANTE: Ejecutar en este orden

### 1. Crear el bucket manualmente (Supabase Dashboard)

**Opción A: Desde el Dashboard (Recomendado)**
1. Ir a **Storage** en el menú lateral de Supabase
2. Hacer clic en **Create a new bucket**
3. Configurar:
   - **Name**: `restaurant-logos`
   - **Public bucket**: ✅ Activar (para que los logos sean públicos)
   - **File size limit**: `2097152` (2MB)
   - **Allowed MIME types**:
     ```
     image/jpeg
     image/jpg
     image/png
     image/webp
     image/svg+xml
     ```
4. Hacer clic en **Create bucket**

**Opción B: Desde SQL Editor**
```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'restaurant-logos',
  'restaurant-logos',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml']
);
```

### 2. Ejecutar las políticas de seguridad (SQL Editor)

1. Ir a **SQL Editor**
2. Copiar y ejecutar **solo la parte de las políticas** del archivo `004_setup_storage_bucket.sql`:

```sql
-- Permitir que usuarios autenticados suban logos
CREATE POLICY IF NOT EXISTS "Users can upload logos for their tenant"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'restaurant-logos'
  AND (storage.foldername(name))[1] IN (
    SELECT DISTINCT t.id::text
    FROM tenants t
    JOIN user_restaurant_access ura ON ura.restaurant_id IN (
      SELECT id FROM restaurant_info WHERE tenant_id = t.id
    )
    WHERE ura.user_id = auth.uid()
  )
);

-- Permitir lectura pública
CREATE POLICY IF NOT EXISTS "Public read access to logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'restaurant-logos');

-- Permitir actualizar logos
CREATE POLICY IF NOT EXISTS "Users can update logos for their tenant"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'restaurant-logos'
  AND (storage.foldername(name))[1] IN (
    SELECT DISTINCT t.id::text
    FROM tenants t
    JOIN user_restaurant_access ura ON ura.restaurant_id IN (
      SELECT id FROM restaurant_info WHERE tenant_id = t.id
    )
    WHERE ura.user_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'restaurant-logos'
  AND (storage.foldername(name))[1] IN (
    SELECT DISTINCT t.id::text
    FROM tenants t
    JOIN user_restaurant_access ura ON ura.restaurant_id IN (
      SELECT id FROM restaurant_info WHERE tenant_id = t.id
    )
    WHERE ura.user_id = auth.uid()
  )
);

-- Permitir eliminar logos
CREATE POLICY IF NOT EXISTS "Users can delete logos for their tenant"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'restaurant-logos'
  AND (storage.foldername(name))[1] IN (
    SELECT DISTINCT t.id::text
    FROM tenants t
    JOIN user_restaurant_access ura ON ura.restaurant_id IN (
      SELECT id FROM restaurant_info WHERE tenant_id = t.id
    )
    WHERE ura.user_id = auth.uid()
  )
);
```

### 3. Verificar que todo funciona

#### Verificar el bucket:
1. Ir a **Storage**
2. Deberías ver el bucket `restaurant-logos`
3. Hacer clic en él
4. Debería estar vacío inicialmente

#### Verificar las políticas:
```sql
-- Ver todas las políticas del bucket
SELECT * FROM pg_policies
WHERE tablename = 'objects'
AND policyname LIKE '%logos%';

-- Deberías ver 4 políticas:
-- - Users can upload logos for their tenant
-- - Public read access to logos
-- - Users can update logos for their tenant
-- - Users can delete logos for their tenant
```

## Estructura de archivos en Storage

Los logos se guardan con esta estructura:
```
/restaurant-logos/
  ├── {tenant_id_1}/
  │   ├── {restaurant_id_1}.png
  │   └── {restaurant_id_2}.jpg
  └── {tenant_id_2}/
      └── {restaurant_id_3}.png
```

**Ejemplo:**
```
/restaurant-logos/
  └── a1b2c3d4-e5f6-7890-abcd-ef1234567890/  ← tenant_id
      └── x9y8z7w6-v5u4-3210-zyxw-vu9876543210.png  ← restaurant_id
```

## URL pública resultante

Una vez subido el logo, la URL será:
```
https://{project-ref}.supabase.co/storage/v1/object/public/restaurant-logos/{tenant_id}/{restaurant_id}.png
```

**Ejemplo real:**
```
https://abcdefghijklmnop.supabase.co/storage/v1/object/public/restaurant-logos/a1b2c3d4-e5f6-7890-abcd-ef1234567890/x9y8z7w6-v5u4-3210-zyxw-vu9876543210.png
```

## Uso desde el portal

### Flujo completo:

1. **Usuario accede a Settings → Logo**
2. **Hace clic en "Subir logo"**
3. **Selecciona archivo (JPG/PNG/WebP/SVG, máx 2MB)**
4. **Frontend (`LogoUploader.tsx`)**:
   - Valida tamaño y tipo
   - Sube a Supabase Storage: `restaurant-logos/{tenant_id}/{restaurant_id}.{ext}`
   - Obtiene URL pública
5. **Server Action (`updateRestaurantLogo`)**:
   - Guarda URL en `restaurant_info.logo_url`
   - Revalida página
6. **Logo se muestra en**:
   - Settings → Logo (preview)
   - Dashboard sidebar (futuro)
   - Emails (futuro)

## Seguridad

### ✅ Protecciones implementadas:

1. **Solo usuarios autenticados pueden subir**
   - Verificado por `TO authenticated`

2. **Solo pueden subir a su propio tenant**
   - Policy verifica que el usuario tiene acceso al tenant vía `user_restaurant_access`

3. **Lectura pública**
   - Cualquiera puede ver los logos (necesario para mostrarlos en el portal sin auth)

4. **Límite de tamaño: 2MB**
   - Configurado en el bucket

5. **Solo imágenes permitidas**
   - JPEG, JPG, PNG, WebP, SVG

### ⚠️ Consideraciones:

- Los logos son públicos (cualquiera con la URL puede verlos)
- Esto es intencional: necesitamos mostrarlos en el portal sin requerir autenticación
- Si un usuario borra su cuenta, los logos permanecen en Storage (considerar cleanup manual)

## Testing

### 1. Test manual desde el portal:

1. Ir a `/settings`
2. Pestaña "Logo"
3. Subir una imagen
4. Verificar que se muestra correctamente
5. Refrescar la página → el logo debe persistir
6. Cambiar de restaurante → debe mostrar su logo correspondiente

### 2. Test desde SQL:

```sql
-- Ver logos subidos
SELECT id, name, bucket_id, created_at
FROM storage.objects
WHERE bucket_id = 'restaurant-logos'
ORDER BY created_at DESC;

-- Ver restaurantes con logo
SELECT id, name, logo_url
FROM restaurant_info
WHERE logo_url IS NOT NULL;
```

### 3. Test de permisos:

```sql
-- Como usuario autenticado, intentar acceder a logos de otro tenant
-- Debería fallar
```

## Troubleshooting

### Error: "Bucket not found"
**Solución:** Crear el bucket manualmente desde el Dashboard

### Error: "Policy check violation"
**Solución:** Verificar que las políticas se crearon correctamente
```sql
SELECT * FROM pg_policies WHERE tablename = 'objects';
```

### Error: "File size exceeds limit"
**Solución:** La imagen es mayor a 2MB, reducir tamaño

### Error: "Invalid MIME type"
**Solución:** Solo se permiten JPG, PNG, WebP, SVG

### Logo no se muestra después de subir
**Solución:**
1. Verificar que `logo_url` se guardó en la BD
2. Verificar que la URL es accesible públicamente
3. Abrir la URL en el navegador para ver si el archivo existe

## Rollback

Para revertir esta migración:

```sql
-- 1. Eliminar políticas
DROP POLICY IF EXISTS "Users can upload logos for their tenant" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update logos for their tenant" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete logos for their tenant" ON storage.objects;

-- 2. Eliminar bucket (CUIDADO: esto borra todos los archivos)
DELETE FROM storage.buckets WHERE id = 'restaurant-logos';
```

## Próximos pasos

1. ✅ Ejecutar migración 004
2. ✅ Verificar que el upload funciona desde el portal
3. 🔲 Opcional: Añadir cropping de imágenes en el frontend
4. 🔲 Opcional: Añadir compresión automática de imágenes
5. 🔲 Futuro: Usar el logo en emails de confirmación
6. 🔲 Futuro: Mostrar logo en el sidebar del dashboard
