-- ================================================
-- MIGRATION 007: Add wine_menu to restaurant_info
-- ================================================
-- Field to store the wine menu (carta de vinos)
-- Run in Supabase SQL Editor

-- 1. Add wine_menu column to restaurant_info
ALTER TABLE restaurant_info
ADD COLUMN IF NOT EXISTS wine_menu JSONB DEFAULT '{"categories": []}'::jsonb;

-- 2. Add descriptive comment
COMMENT ON COLUMN restaurant_info.wine_menu IS 'Wine menu with categories and wines (name, winery, priceGlass, priceBottle)';

-- 3. Verify the configuration
SELECT
  id,
  name,
  wine_menu
FROM restaurant_info
LIMIT 5;

-- ================================================
-- JSON STRUCTURE for wine_menu:
-- ================================================
-- {
--   "categories": [
--     {
--       "id": "winecat-xxx",
--       "name": "Tintos Ribera del Duero",
--       "wines": [
--         {
--           "id": "wine-xxx",
--           "name": "Protos Reserva 2019",
--           "winery": "Bodegas Protos",
--           "priceGlass": 6.50,
--           "priceBottle": 28.00
--         }
--       ]
--     }
--   ]
-- }
