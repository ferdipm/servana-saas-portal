-- ================================================
-- MIGRACIÓN 006: Añadir set_menus a restaurant_info
-- ================================================
-- Campo para almacenar los menús cerrados (Menú del día, Degustación, etc.)
-- Ejecutar en Supabase SQL Editor

-- 1. Añadir columna set_menus a restaurant_info
ALTER TABLE restaurant_info
ADD COLUMN IF NOT EXISTS set_menus JSONB DEFAULT '[]'::jsonb;

-- 2. Comentario descriptivo
COMMENT ON COLUMN restaurant_info.set_menus IS 'Menús cerrados del restaurante (Menú del día, Degustación, etc.) con estructura de cursos, opciones y suplementos';

-- 3. Verificar la configuración
SELECT
  id,
  name,
  set_menus
FROM restaurant_info
LIMIT 5;

-- ================================================
-- ESTRUCTURA DEL JSON set_menus:
-- ================================================
-- [
--   {
--     "id": "setmenu-xxx",
--     "name": "Menú del día",
--     "price": 15.90,
--     "description": "Incluye pan, bebida y café",
--     "conditions": "L-V mediodía",
--     "isActive": true,
--     "courses": [
--       {
--         "id": "course-xxx",
--         "name": "Primero",
--         "options": [
--           { "id": "opt-xxx", "type": "text", "text": "Ensalada mixta" },
--           { "id": "opt-xxx", "type": "dish", "dishId": "dish-xxx", "dishName": "Sopa del día", "supplement": 2.00 }
--         ]
--       }
--     ],
--     "supplements": [
--       { "id": "supp-xxx", "name": "Postre especial", "price": 3.00 }
--     ]
--   }
-- ]
