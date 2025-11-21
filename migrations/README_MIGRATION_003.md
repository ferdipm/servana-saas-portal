# Migración 003: Añadir logo_url a restaurant_info

## Descripción
Esta migración añade el campo `logo_url` a la tabla `restaurant_info` para almacenar el URL del logo de cada restaurante.

## Fecha
2025-01-18

## Archivos
- `003_add_logo_url.sql`

## Pasos para ejecutar en Supabase

### 1. Acceder al SQL Editor de Supabase
1. Ir a [https://supabase.com](https://supabase.com)
2. Seleccionar tu proyecto
3. Ir a **SQL Editor** en el menú lateral

### 2. Ejecutar la migración
1. Abrir el archivo `003_add_logo_url.sql`
2. Copiar todo el contenido
3. Pegarlo en el SQL Editor
4. Hacer clic en **Run** (Ejecutar)

### 3. Verificar que se ejecutó correctamente
```sql
-- Ver la estructura de la tabla
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'restaurant_info'
ORDER BY ordinal_position;

-- Debería aparecer:
-- logo_url | text | YES
```

### 4. Verificar datos existentes
```sql
-- Ver todos los restaurantes con su logo_url (debería ser NULL para todos inicialmente)
SELECT id, name, logo_url
FROM restaurant_info;
```

## Uso del campo logo_url

### Opciones de almacenamiento:

#### Opción 1: Supabase Storage (Recomendado)
```sql
-- Ejemplo de URL:
-- https://{project-ref}.supabase.co/storage/v1/object/public/logos/{tenant_id}/{restaurant_id}.png
```

**Ventajas:**
- Integrado con Supabase
- Fácil de configurar
- Control total sobre los archivos

**Configuración necesaria:**
1. Crear bucket `logos` en Supabase Storage
2. Hacer el bucket público
3. Configurar policies para permitir upload

#### Opción 2: Cloudinary
```sql
-- Ejemplo de URL:
-- https://res.cloudinary.com/{cloud_name}/image/upload/v1/{public_id}
```

**Ventajas:**
- CDN global
- Transformaciones automáticas (resize, crop, etc.)
- Optimización de imágenes

#### Opción 3: URL externa
Cualquier URL pública (CDN propio, hosting, etc.)

## Implementación en el portal

### Server action para actualizar logo
Crear en `app/settings/actions.ts`:

```typescript
export async function updateRestaurantLogo(formData: FormData) {
  const restaurantId = formData.get("restaurantId");
  const logoUrl = formData.get("logoUrl");

  if (!restaurantId || typeof restaurantId !== "string") {
    throw new Error("Falta el identificador del restaurante.");
  }

  if (!logoUrl || typeof logoUrl !== "string") {
    throw new Error("Falta la URL del logo.");
  }

  const supabase = await supabaseServer();

  const { error } = await supabase
    .from("restaurant_info")
    .update({ logo_url: logoUrl })
    .eq("id", restaurantId);

  if (error) {
    console.error("Error en updateRestaurantLogo:", error);
    throw new Error("No se ha podido actualizar el logo.");
  }

  revalidatePath("/settings");
}
```

### Upload de archivo (futuro)
Para implementar upload de archivo, necesitarás:

1. Crear bucket en Supabase Storage:
```sql
-- Desde SQL Editor
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true);
```

2. Configurar policies:
```sql
-- Policy para permitir upload
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'logos');

-- Policy para permitir lectura pública
CREATE POLICY "Allow public reads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'logos');
```

3. Código para upload desde el cliente:
```typescript
async function uploadLogo(file: File, restaurantId: string) {
  const supabase = createClientComponentClient();

  // Generar nombre único
  const fileExt = file.name.split('.').pop();
  const fileName = `${restaurantId}.${fileExt}`;
  const filePath = `${fileName}`;

  // Upload
  const { data, error } = await supabase.storage
    .from('logos')
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type,
    });

  if (error) throw error;

  // Obtener URL pública
  const { data: { publicUrl } } = supabase.storage
    .from('logos')
    .getPublicUrl(filePath);

  return publicUrl;
}
```

## Rollback

Si necesitas revertir esta migración:

```sql
BEGIN;

ALTER TABLE restaurant_info
  DROP COLUMN IF EXISTS logo_url;

COMMIT;
```

## Testing

Después de ejecutar la migración, probar:

1. Insertar un logo manualmente:
```sql
UPDATE restaurant_info
SET logo_url = 'https://ejemplo.com/logo.png'
WHERE id = '{restaurant_id}';
```

2. Verificar desde el portal:
   - Ir a `/settings`
   - Seleccionar pestaña "Logo"
   - Debería mostrar el logo si existe, o "Sin logo" si es NULL

## Notas

- El campo es nullable, no todos los restaurantes necesitan logo inicialmente
- El portal mostrará un placeholder si `logo_url` es NULL
- Considera añadir validación de URL en el frontend antes de guardar
- Recomendado: limitar tamaño de archivo a 2MB y formatos a PNG/JPG/SVG
