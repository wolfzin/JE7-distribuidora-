-- ============================================================================
-- JE7 — CONSULTA DE SCHEMA (somente leitura; não altera nada)
-- Rode no Supabase SQL Editor e me envie o resultado de cada bloco.
-- Serve para confirmar tipos, constraints, triggers e políticas antes de executar a importação.
-- ============================================================================

-- 1) Colunas, tipos, defaults e nulabilidade das 4 tabelas
SELECT table_name, ordinal_position, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name IN ('products','categories','brands','product_images')
ORDER BY table_name, ordinal_position;

-- 2) Constraints (PK, FK, UNIQUE, CHECK) — confirma se legacy_id é UNIQUE
SELECT conrelid::regclass AS tabela, conname, contype, pg_get_constraintdef(oid) AS definicao
FROM pg_constraint
WHERE conrelid::regclass::text IN ('products','categories','brands','product_images',
                                    'public.products','public.categories','public.brands','public.product_images')
ORDER BY 1, 3, 2;

-- 3) Índices
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename IN ('products','categories','brands','product_images')
ORDER BY 1, 2;

-- 4) Triggers (ex.: updated_at automático)
SELECT event_object_table AS tabela, trigger_name, action_timing, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public' AND event_object_table IN ('products','categories','brands','product_images')
ORDER BY 1, 2;

-- 5) Políticas RLS
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('products','categories','brands','product_images');

-- 6) Views/funções que dependem de products (para saber como o site filtra ativos/categoria)
SELECT view_schema, view_name
FROM information_schema.view_table_usage
WHERE table_schema = 'public' AND table_name = 'products';
SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prokind = 'f' AND pg_get_functiondef(p.oid) ILIKE '%products%';

-- 7) Fotografia atual (para comparar depois)
SELECT
  (SELECT count(*) FROM public.products)                          AS produtos_total,
  (SELECT count(*) FROM public.products WHERE active)             AS produtos_ativos,
  (SELECT count(*) FROM public.product_images)                    AS imagens_total,
  (SELECT count(DISTINCT legacy_id) FROM public.products)         AS legacy_distintos,
  (SELECT count(*) FROM public.categories)                        AS categorias,
  (SELECT count(*) FROM public.brands)                            AS marcas;
