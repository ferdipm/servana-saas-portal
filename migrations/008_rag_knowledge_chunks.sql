-- ================================================
-- MIGRATION 008: RAG - Knowledge Chunks with Vector Search
-- ================================================
-- Sistema RAG (Retrieval Augmented Generation) para búsqueda semántica
-- de menú, FAQs, vinos y otra información del restaurante.
-- Run in Supabase SQL Editor

-- ================================================
-- PASO 1: Activar extensión pgvector
-- ================================================
-- pgvector permite almacenar y buscar embeddings vectoriales
CREATE EXTENSION IF NOT EXISTS vector;

-- ================================================
-- PASO 2: Crear tabla de chunks de conocimiento
-- ================================================
CREATE TABLE IF NOT EXISTS restaurant_knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenancy
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurant_info(id) ON DELETE CASCADE,

  -- Tipo de contenido: menu_item, faq, wine, opening_hours, special_info
  kind TEXT NOT NULL CHECK (kind IN ('menu_item', 'faq', 'wine', 'opening_hours', 'special_info', 'set_menu')),

  -- Contenido textual (lo que lee la IA)
  content TEXT NOT NULL,

  -- Metadata adicional (precio, categoría, alérgenos, etc.)
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Embedding vectorial (OpenAI text-embedding-3-small = 1536 dimensiones)
  embedding vector(1536),

  -- Puntuación de popularidad (se actualiza desde reservas/conversaciones)
  popularity_score DECIMAL DEFAULT 0,

  -- Versionado para rollback
  version INTEGER DEFAULT 1,
  is_current BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- PASO 3: Crear índices
-- ================================================
-- Índice para multi-tenancy y filtrado
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_tenant
  ON restaurant_knowledge_chunks(tenant_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_restaurant
  ON restaurant_knowledge_chunks(restaurant_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_kind
  ON restaurant_knowledge_chunks(kind);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_current
  ON restaurant_knowledge_chunks(is_current) WHERE is_current = true;

-- Índice vectorial para búsqueda semántica (usando IVFFlat para mejor rendimiento)
-- ivfflat es más rápido para datasets grandes, HNSW sería alternativa más precisa
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding
  ON restaurant_knowledge_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ================================================
-- PASO 4: Función de búsqueda semántica
-- ================================================
CREATE OR REPLACE FUNCTION search_knowledge(
  p_restaurant_id UUID,
  p_query_embedding vector(1536),
  p_kind TEXT DEFAULT NULL,           -- Filtrar por tipo (opcional)
  p_limit INTEGER DEFAULT 5,          -- Número de resultados
  p_similarity_threshold FLOAT DEFAULT 0.5  -- Umbral mínimo de similitud
)
RETURNS TABLE (
  id UUID,
  kind TEXT,
  content TEXT,
  metadata JSONB,
  popularity_score DECIMAL,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    rkc.id,
    rkc.kind,
    rkc.content,
    rkc.metadata,
    rkc.popularity_score,
    1 - (rkc.embedding <=> p_query_embedding) AS similarity
  FROM restaurant_knowledge_chunks rkc
  WHERE
    rkc.restaurant_id = p_restaurant_id
    AND rkc.is_current = true
    AND rkc.embedding IS NOT NULL
    AND (p_kind IS NULL OR rkc.kind = p_kind)
    AND (1 - (rkc.embedding <=> p_query_embedding)) >= p_similarity_threshold
  ORDER BY
    -- Combinar similitud semántica con popularidad
    (1 - (rkc.embedding <=> p_query_embedding)) * 0.8 + rkc.popularity_score * 0.2 DESC
  LIMIT p_limit;
END;
$$;

-- ================================================
-- PASO 5: Función para búsqueda por keywords (fallback sin embeddings)
-- ================================================
CREATE OR REPLACE FUNCTION search_knowledge_text(
  p_restaurant_id UUID,
  p_query TEXT,
  p_kind TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  kind TEXT,
  content TEXT,
  metadata JSONB,
  popularity_score DECIMAL,
  rank FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    rkc.id,
    rkc.kind,
    rkc.content,
    rkc.metadata,
    rkc.popularity_score,
    ts_rank(to_tsvector('spanish', rkc.content), plainto_tsquery('spanish', p_query)) AS rank
  FROM restaurant_knowledge_chunks rkc
  WHERE
    rkc.restaurant_id = p_restaurant_id
    AND rkc.is_current = true
    AND (p_kind IS NULL OR rkc.kind = p_kind)
    AND to_tsvector('spanish', rkc.content) @@ plainto_tsquery('spanish', p_query)
  ORDER BY rank DESC
  LIMIT p_limit;
END;
$$;

-- ================================================
-- PASO 6: Función para invalidar chunks antiguos
-- ================================================
CREATE OR REPLACE FUNCTION invalidate_knowledge_chunks(
  p_restaurant_id UUID,
  p_kind TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE restaurant_knowledge_chunks
  SET
    is_current = false,
    updated_at = NOW()
  WHERE
    restaurant_id = p_restaurant_id
    AND is_current = true
    AND (p_kind IS NULL OR kind = p_kind);
END;
$$;

-- ================================================
-- PASO 7: Row Level Security (RLS)
-- ================================================
ALTER TABLE restaurant_knowledge_chunks ENABLE ROW LEVEL SECURITY;

-- Policy: Usuarios autenticados pueden ver chunks de sus restaurantes
CREATE POLICY "Users can view their restaurant knowledge chunks"
  ON restaurant_knowledge_chunks
  FOR SELECT
  USING (
    restaurant_id IN (
      SELECT rp.restaurant_id
      FROM restaurant_permissions rp
      WHERE rp.user_id = auth.uid()
    )
  );

-- Policy: Service role tiene acceso completo (para el backend)
CREATE POLICY "Service role has full access to knowledge chunks"
  ON restaurant_knowledge_chunks
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ================================================
-- PASO 8: Trigger para actualizar updated_at
-- ================================================
CREATE OR REPLACE FUNCTION update_knowledge_chunks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_knowledge_chunks_timestamp
  BEFORE UPDATE ON restaurant_knowledge_chunks
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_chunks_updated_at();

-- ================================================
-- PASO 9: Tabla de analytics (opcional pero recomendada)
-- ================================================
CREATE TABLE IF NOT EXISTS knowledge_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurant_info(id) ON DELETE CASCADE,
  chunk_id UUID REFERENCES restaurant_knowledge_chunks(id) ON DELETE SET NULL,
  query TEXT NOT NULL,
  used_in_response BOOLEAN DEFAULT false,
  similarity_score FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_usage_restaurant
  ON knowledge_usage(restaurant_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_usage_created
  ON knowledge_usage(created_at);

-- ================================================
-- PASO 10: Comentarios descriptivos
-- ================================================
COMMENT ON TABLE restaurant_knowledge_chunks IS 'RAG: Chunks de conocimiento del restaurante con embeddings vectoriales para búsqueda semántica';
COMMENT ON COLUMN restaurant_knowledge_chunks.kind IS 'Tipo: menu_item, faq, wine, opening_hours, special_info, set_menu';
COMMENT ON COLUMN restaurant_knowledge_chunks.content IS 'Texto completo que la IA usará para responder';
COMMENT ON COLUMN restaurant_knowledge_chunks.embedding IS 'Vector de 1536 dimensiones de OpenAI text-embedding-3-small';
COMMENT ON COLUMN restaurant_knowledge_chunks.popularity_score IS 'Puntuación 0-1 basada en frecuencia de consulta/mención en reservas';
COMMENT ON TABLE knowledge_usage IS 'Analytics: Registro de qué chunks se consultan y usan en respuestas';

-- ================================================
-- VERIFICACIÓN
-- ================================================
SELECT
  'pgvector extension' as component,
  CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector')
    THEN 'OK' ELSE 'MISSING' END as status
UNION ALL
SELECT
  'restaurant_knowledge_chunks table',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'restaurant_knowledge_chunks')
    THEN 'OK' ELSE 'MISSING' END
UNION ALL
SELECT
  'search_knowledge function',
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'search_knowledge')
    THEN 'OK' ELSE 'MISSING' END
UNION ALL
SELECT
  'knowledge_usage table',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'knowledge_usage')
    THEN 'OK' ELSE 'MISSING' END;
