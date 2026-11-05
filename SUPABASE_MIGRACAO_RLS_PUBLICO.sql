-- ============================================================
-- JE7 — catálogo público com preços de ATACADO
-- Migração planejada para o esquema auditado em 04/11/2026.
-- Não altera linhas de produtos, preços ou imagens.
-- Execute uma única vez no Supabase SQL Editor como postgres.
-- ============================================================

BEGIN;

-- 1) View pública: somente produtos ativos e campos necessários ao catálogo.
--    A view roda com os privilégios do proprietário postgres (security_invoker=false),
--    que consegue ler as tabelas-base mesmo após retirarmos SELECT de anon.
CREATE OR REPLACE VIEW public.public_catalog
WITH (security_barrier = true, security_invoker = false) AS
SELECT
    p.id,
    p.name,
    p.volume,
    p.category_id,
    p.brand_id,
    p.is_promotion,
    p.is_featured,
    p.is_new,
    p.is_best_seller,
    b.name AS brand_name,
    c.name AS category_name,
    img.storage_path AS primary_image_path,
    pw.wholesale_price
FROM public.products AS p
LEFT JOIN public.brands AS b
       ON b.id = p.brand_id AND b.active = true
LEFT JOIN public.categories AS c
       ON c.id = p.category_id AND c.active = true
LEFT JOIN public.product_wholesale AS pw
       ON pw.product_id = p.id
LEFT JOIN LATERAL (
    SELECT pi.storage_path
    FROM public.product_images AS pi
    WHERE pi.product_id = p.id
    ORDER BY pi.is_primary DESC NULLS LAST,
             pi.sort_order ASC NULLS LAST,
             pi.created_at ASC
    LIMIT 1
) AS img ON true
WHERE p.active = true;

ALTER VIEW public.public_catalog OWNER TO postgres;
GRANT SELECT ON public.public_catalog TO anon, authenticated;

-- 2) Remove políticas públicas redundantes que anulavam o filtro de ativos.
DROP POLICY IF EXISTS "Public can view products" ON public.products;
DROP POLICY IF EXISTS "Public can view active products" ON public.products;
DROP POLICY IF EXISTS "Public can view brands" ON public.brands;
DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
DROP POLICY IF EXISTS "Public can view product images" ON public.product_images;

-- 3) Leitura administrativa explícita, inclusive registros inativos.
--    Políticas de escrita existentes com is_admin() são preservadas.
DROP POLICY IF EXISTS products_select_admin ON public.products;
CREATE POLICY products_select_admin
    ON public.products FOR SELECT TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS brands_select_admin ON public.brands;
CREATE POLICY brands_select_admin
    ON public.brands FOR SELECT TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS categories_select_admin ON public.categories;
CREATE POLICY categories_select_admin
    ON public.categories FOR SELECT TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS product_images_select_admin ON public.product_images;
CREATE POLICY product_images_select_admin
    ON public.product_images FOR SELECT TO authenticated
    USING (public.is_admin());

-- 4) Restringe as operações de escrita de metadados de imagem a administradores.
DROP POLICY IF EXISTS product_images_insert_auth ON public.product_images;
DROP POLICY IF EXISTS product_images_update_auth ON public.product_images;
DROP POLICY IF EXISTS product_images_delete_auth ON public.product_images;
DROP POLICY IF EXISTS product_images_insert_admin ON public.product_images;
DROP POLICY IF EXISTS product_images_update_admin ON public.product_images;
DROP POLICY IF EXISTS product_images_delete_admin ON public.product_images;

CREATE POLICY product_images_insert_admin
    ON public.product_images FOR INSERT TO authenticated
    WITH CHECK (public.is_admin());
CREATE POLICY product_images_update_admin
    ON public.product_images FOR UPDATE TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
CREATE POLICY product_images_delete_admin
    ON public.product_images FOR DELETE TO authenticated
    USING (public.is_admin());

-- 5) Retira acesso direto do visitante às tabelas-base sensíveis.
--    Também revoga eventuais privilégios concedidos por COLUNA (REVOKE
--    apenas no nível da tabela não remove grants individuais de coluna).
REVOKE ALL PRIVILEGES ON TABLE
    public.products,
    public.product_wholesale,
    public.product_images,
    public.categories,
    public.brands
FROM PUBLIC, anon;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.relname, a.attname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid
    WHERE n.nspname = 'public'
      AND c.relname IN ('products','product_wholesale','product_images','categories','brands')
      AND c.relkind = 'r'
      AND a.attnum > 0
      AND NOT a.attisdropped
  LOOP
    EXECUTE format(
      'REVOKE ALL PRIVILEGES (%I) ON TABLE public.%I FROM PUBLIC, anon',
      r.attname, r.relname
    );
  END LOOP;
END $$;

GRANT SELECT ON TABLE public.categories, public.brands TO anon;
GRANT SELECT ON TABLE public.categories, public.brands TO authenticated;

-- 6) Storage: leitura pública das imagens permanece; escrita somente admin.
DROP POLICY IF EXISTS product_images_storage_insert_auth ON storage.objects;
DROP POLICY IF EXISTS product_images_storage_update_auth ON storage.objects;
DROP POLICY IF EXISTS product_images_storage_delete_auth ON storage.objects;
DROP POLICY IF EXISTS product_images_storage_insert_admin ON storage.objects;
DROP POLICY IF EXISTS product_images_storage_update_admin ON storage.objects;
DROP POLICY IF EXISTS product_images_storage_delete_admin ON storage.objects;

CREATE POLICY product_images_storage_insert_admin
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'product-images'
      AND public.is_admin()
    );
CREATE POLICY product_images_storage_update_admin
    ON storage.objects FOR UPDATE TO authenticated
    USING (
      bucket_id = 'product-images'
      AND public.is_admin()
    )
    WITH CHECK (
      bucket_id = 'product-images'
      AND public.is_admin()
    );
CREATE POLICY product_images_storage_delete_admin
    ON storage.objects FOR DELETE TO authenticated
    USING (
      bucket_id = 'product-images'
      AND public.is_admin()
    );

COMMIT;

-- ============================================================
-- VALIDAÇÃO PÓS-MIGRAÇÃO (execute depois do COMMIT)
-- Resultado esperado:
-- 1) public_catalog existe e possui SELECT para anon.
-- 2) anon NÃO possui SELECT direto em products/product_wholesale/product_images.
-- 3) anon NÃO possui INSERT/UPDATE/DELETE/TRUNCATE nas cinco tabelas.
-- 4) anon mantém SELECT em categories/brands.
-- ============================================================
SELECT
    has_table_privilege('anon', 'public.public_catalog', 'SELECT') AS anon_le_view,
    has_table_privilege('anon', 'public.products', 'SELECT') AS anon_le_products,
    has_table_privilege('anon', 'public.product_wholesale', 'SELECT') AS anon_le_product_wholesale,
    has_table_privilege('anon', 'public.product_images', 'SELECT') AS anon_le_product_images,
    has_table_privilege('anon', 'public.categories', 'SELECT') AS anon_le_categories,
    has_table_privilege('anon', 'public.brands', 'SELECT') AS anon_le_brands;

SELECT
    c.relname AS tabela,
    has_table_privilege('anon', 'public.' || c.relname, 'INSERT') AS anon_insert,
    has_table_privilege('anon', 'public.' || c.relname, 'UPDATE') AS anon_update,
    has_table_privilege('anon', 'public.' || c.relname, 'DELETE') AS anon_delete,
    has_table_privilege('anon', 'public.' || c.relname, 'TRUNCATE') AS anon_truncate
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('products','product_wholesale','product_images','categories','brands')
  AND c.relkind = 'r'
ORDER BY c.relname;

-- Smoke test da view: deve retornar apenas produtos ativos.
SELECT COUNT(*) AS produtos_publicos,
       COUNT(*) FILTER (WHERE wholesale_price IS NOT NULL) AS com_preco_atacado,
       COUNT(*) FILTER (WHERE wholesale_price IS NULL) AS sob_consulta
FROM public.public_catalog;
