-- ============================================================================
-- JE7 — IMPORTAÇÃO DOS PRODUTOS NOVOS DO ERP (390 produtos)
-- Gerado em 04/11/2026 a partir de EPORTAR-L.xls x products_rows.csv / categories_rows.csv / brands_rows.csv
--
-- O QUE FAZ: insere 390 produtos novos em public.products (active = true) e, para cada UUID gerado
--            nesse mesmo INSERT, um registro em public.product_wholesale com wholesale_price = NULL.
-- NÃO FAZ:   UPDATE/DELETE/DROP/TRUNCATE; não toca nos 644 produtos atuais, imagens, preços de varejo
--            ou de atacado existentes; não reativa inativos; não aplica vínculos de legacy_id.
-- SEGURANÇA: uma única transação. Qualquer conflito ou validação com falha gera RAISE EXCEPTION
--            e o PostgreSQL desfaz tudo (ROLLBACK automático) — nada fica gravado.
-- IDEMPOTÊNCIA: legacy_id que já existe COM O MESMO NOME é considerado já importado e é pulado;
--            legacy_id que existe com OUTRO nome = conflito -> a execução é interrompida.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. VERIFICAÇÕES DE SCHEMA (aborta se o banco não for o esperado)
-- ----------------------------------------------------------------------------
DO $$
DECLARE faltando text; n int;
BEGIN
  SELECT string_agg(t.tab || '.' || t.col, ', ') INTO faltando
  FROM (VALUES ('products','id'),('products','legacy_id'),('products','name'),('products','category_id'),
               ('products','brand_id'),('products','volume'),('products','retail_price'),('products','promotion_price'),
               ('products','is_promotion'),('products','is_featured'),('products','is_new'),('products','is_best_seller'),
               ('products','active'),('products','created_at'),('products','updated_at'),
               ('product_wholesale','product_id'),('product_wholesale','wholesale_price')) t(tab, col)
  WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns c
                    WHERE c.table_schema = 'public' AND c.table_name = t.tab AND c.column_name = t.col);
  IF faltando IS NOT NULL THEN RAISE EXCEPTION 'ABORTADO: colunas não encontradas: %', faltando; END IF;

  -- product_wholesale não pode ter outra coluna obrigatória sem default (o INSERT só preenche product_id e wholesale_price)
  SELECT string_agg(column_name, ', ') INTO faltando FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'product_wholesale'
    AND column_name NOT IN ('product_id','wholesale_price') AND is_nullable = 'NO' AND column_default IS NULL;
  IF faltando IS NOT NULL THEN RAISE EXCEPTION 'ABORTADO: product_wholesale tem colunas obrigatórias sem default: %', faltando; END IF;

  -- product_wholesale.wholesale_price precisa aceitar NULL
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_wholesale'
             AND column_name='wholesale_price' AND is_nullable='NO') THEN
    RAISE EXCEPTION 'ABORTADO: product_wholesale.wholesale_price não aceita NULL';
  END IF;

  -- product_wholesale.product_id precisa ser PK/UNIQUE (garante 1 registro por produto)
  SELECT count(*) INTO n FROM pg_constraint
  WHERE conrelid = 'public.product_wholesale'::regclass AND contype IN ('p','u')
    AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid='public.product_wholesale'::regclass AND attname='product_id')]::smallint[];
  IF n = 0 THEN RAISE EXCEPTION 'ABORTADO: product_wholesale.product_id não é PRIMARY KEY/UNIQUE'; END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. LISTA DOS PRODUTOS NOVOS E DOS CÓDIGOS BLOQUEADOS
-- ----------------------------------------------------------------------------
CREATE TEMP TABLE je7_novos (
  legacy_id text PRIMARY KEY, name text NOT NULL, category_id uuid, brand_id uuid, volume text, retail_price numeric
) ON COMMIT DROP;
INSERT INTO je7_novos (legacy_id, name, category_id, brand_id, volume, retail_price) VALUES
  ('7896451913586', 'CANUDINHO UNICORNIO', NULL::uuid, NULL::uuid, NULL::text, 1.00::numeric),
  ('7891991304184', 'CORONA LONG NECK ZERO', NULL::uuid, '2e376cfc-dccb-4428-b4c4-498eccc528b8'::uuid, NULL::text, 7.50::numeric),
  ('7898156622466', 'AÇAI C/ GUARANA 500ml KASKIN', NULL::uuid, NULL::uuid, NULL::text, 18.90::numeric),
  ('7896549404200', 'AÇAI NATURAL 120g', NULL::uuid, NULL::uuid, NULL::text, 8.90::numeric),
  ('686', 'AGUA DE COCO 1L', 'a6030544-4e67-49a0-aa01-43ccc49e7257'::uuid, NULL::uuid, NULL::text, 13.50::numeric),
  ('685', 'AGUA DE COCO 200ML', 'a6030544-4e67-49a0-aa01-43ccc49e7257'::uuid, NULL::uuid, NULL::text, 3.50::numeric),
  ('687', 'AGUA DE COCO 900ML', 'a6030544-4e67-49a0-aa01-43ccc49e7257'::uuid, NULL::uuid, NULL::text, 14.60::numeric),
  ('7898912374332', 'AGUÁ ELEFANTINHO S/ GÁS 250ml', NULL::uuid, NULL::uuid, NULL::text, 1.10::numeric),
  ('845', 'AGUA S/ GÁS FONT LIFE 10L', NULL::uuid, NULL::uuid, NULL::text, 11.00::numeric),
  ('606529715472', 'AMENDOIM FRITO', NULL::uuid, NULL::uuid, NULL::text, 1.50::numeric),
  ('751', 'APEROL 750ml', '52b4bb4a-24ac-4af7-ad86-a791141e27a4'::uuid, NULL::uuid, NULL::text, 50.70::numeric),
  ('7891151042925', 'AZEDINHA  YORGUT', NULL::uuid, NULL::uuid, NULL::text, 11.80::numeric),
  ('7891151043076', 'AZEDINHA MORANGO', NULL::uuid, NULL::uuid, NULL::text, 11.10::numeric),
  ('664', 'BACARDI CARTA BLANCA 980ML', 'af4c764e-e139-454b-9738-c5f0a5b6391e'::uuid, NULL::uuid, NULL::text, 48.60::numeric),
  ('7892840822774', 'BACONZITOS 86gr', NULL::uuid, NULL::uuid, NULL::text, 10.00::numeric),
  ('7896092505041', 'BAIANINHA DE MARACUJA 500ml', NULL::uuid, 'e695a68b-fa26-452f-8147-b10abd03f857'::uuid, NULL::text, 6.00::numeric),
  ('748', 'BAILEYS IRISH CREAM 750ml', '52b4bb4a-24ac-4af7-ad86-a791141e27a4'::uuid, NULL::uuid, NULL::text, 120.00::numeric),
  ('7896321028396', 'BALA BANZE SORTIDA', NULL::uuid, NULL::uuid, NULL::text, 10.40::numeric),
  ('816', 'BALA BOLA 7', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 0.25::numeric),
  ('7896058503098', 'BALA D/MEL RECHEADA', NULL::uuid, NULL::uuid, NULL::text, 15.70::numeric),
  ('7896321002501', 'BALA DE CANELA', NULL::uuid, NULL::uuid, NULL::text, 16.00::numeric),
  ('7896058503067', 'BALA DE HORTELÃ', NULL::uuid, NULL::uuid, NULL::text, 14.40::numeric),
  ('809', 'BALA FREEGELS', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 0.50::numeric),
  ('815', 'BALA FRUIT', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 0.25::numeric),
  ('7798304851215', 'BATATA FRITA ADORADA 2kg', NULL::uuid, NULL::uuid, 'UND', 22.90::numeric),
  ('738', 'BATATA ORIGINAL WANFLO 150G', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 7.50::numeric),
  ('7798304851543', 'BATATA SIMPLOT CRUNCH 2,5kg', NULL::uuid, NULL::uuid, NULL::text, 39.12::numeric),
  ('7891962036984', 'BAUDUCCO WAFER CHOCOLATE', NULL::uuid, NULL::uuid, NULL::text, 3.65::numeric),
  ('7891962036991', 'BAUDUCCO WAFER CHOCOLATE DE AVELÃ', NULL::uuid, NULL::uuid, NULL::text, 3.65::numeric),
  ('838', 'BETERRABA 1,8K', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 45.00::numeric),
  ('773', 'BID BANANA', '52b4bb4a-24ac-4af7-ad86-a791141e27a4'::uuid, NULL::uuid, NULL::text, 38.00::numeric),
  ('776', 'BID CASSIS', '52b4bb4a-24ac-4af7-ad86-a791141e27a4'::uuid, NULL::uuid, NULL::text, 38.00::numeric),
  ('771', 'BID COCONUT', '52b4bb4a-24ac-4af7-ad86-a791141e27a4'::uuid, NULL::uuid, NULL::text, 38.00::numeric),
  ('775', 'BID CURAÇAU RED', '52b4bb4a-24ac-4af7-ad86-a791141e27a4'::uuid, NULL::uuid, NULL::text, 38.00::numeric),
  ('772', 'BID MARULA', '52b4bb4a-24ac-4af7-ad86-a791141e27a4'::uuid, NULL::uuid, NULL::text, 38.00::numeric),
  ('774', 'BID PESSEGO', '52b4bb4a-24ac-4af7-ad86-a791141e27a4'::uuid, NULL::uuid, NULL::text, 38.00::numeric),
  ('842', 'BUFFALO TRACE', 'd47a9b1f-7f4b-45d5-91d2-4888c4660afe'::uuid, NULL::uuid, NULL::text, 157.00::numeric),
  ('822', 'BUTTER TOFEES 53% CACAU', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 0.50::numeric),
  ('814', 'BUTTER TOFFE COCO', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 0.50::numeric),
  ('7891118027293', 'BUTTER TOFFEES INTENSE CARAMEL', NULL::uuid, NULL::uuid, NULL::text, 29.40::numeric),
  ('7891118027354', 'BUTTER TOFFEES INTENSE MENTA', NULL::uuid, NULL::uuid, NULL::text, 29.40::numeric),
  ('813', 'BUTTER TOFFES MARACUJA', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 0.50::numeric),
  ('7897877000492', 'CACHAÇA SALINAS 700ml', '743da3bd-a2d0-4c80-8da2-2ea56e838df0'::uuid, NULL::uuid, NULL::text, 62.60::numeric),
  ('7897115110549', 'CAIXA PAÇOQUINHA AMENDUPÃ C/50', NULL::uuid, NULL::uuid, NULL::text, 27.40::numeric),
  ('7896451926067', 'CANUDINHO FRUTAS VERMELHAS', NULL::uuid, NULL::uuid, NULL::text, 1.00::numeric),
  ('7896451914569', 'CANUDINHO GREGO', NULL::uuid, NULL::uuid, NULL::text, 1.00::numeric),
  ('7896451912527', 'CANUDINHO MORANGO', NULL::uuid, NULL::uuid, NULL::text, 1.00::numeric),
  ('7896451924506', 'CANUDINHO SUPER AZEDINHOS', NULL::uuid, NULL::uuid, NULL::text, 1.00::numeric),
  ('7896451912510', 'CANUDINHO TUTTI-FRUTTI', NULL::uuid, NULL::uuid, NULL::text, 1.00::numeric),
  ('7899566300197', 'CAPA DE FILÉ TODA HORA KG', NULL::uuid, NULL::uuid, NULL::text, 38.00::numeric),
  ('2000070035641', 'CAPA DO FILÉ TODA HORA', NULL::uuid, NULL::uuid, NULL::text, 38.00::numeric),
  ('871', 'CAPPELLETTI BORDO DEMI-SECO', NULL::uuid, NULL::uuid, NULL::text, 58.50::numeric),
  ('867', 'CAPPELLETTI BORDO SECO', NULL::uuid, NULL::uuid, NULL::text, 58.50::numeric),
  ('868', 'CAPPELLETTI BORDO SUAVE', NULL::uuid, NULL::uuid, NULL::text, 58.50::numeric),
  ('869', 'CAPPELLETTI BRANCO SECO NIAGARA', NULL::uuid, NULL::uuid, NULL::text, 58.50::numeric),
  ('870', 'CAPPELLETTI BRANCO SUAVE', NULL::uuid, NULL::uuid, NULL::text, 58.50::numeric),
  ('876', 'CAPPELLETTI FRISANTE ROSE MOSCATO', NULL::uuid, NULL::uuid, NULL::text, 71.50::numeric),
  ('875', 'CAPPELLETTI MOSCATEL  ESPUMANTE BRANCO ,', NULL::uuid, NULL::uuid, NULL::text, 84.50::numeric),
  ('874', 'CAPPELLETTI MOSCATO EMBRAPA BRANCO SECO', NULL::uuid, NULL::uuid, NULL::text, 58.50::numeric),
  ('873', 'CAPPELLETTI TINTPO SUVE', NULL::uuid, NULL::uuid, NULL::text, 58.50::numeric),
  ('872', 'CAPPELLLETTI TINTO SECO', NULL::uuid, NULL::uuid, NULL::text, 58.50::numeric),
  ('7898908236019', 'CARNE MOIDA CHULETÃO 500gr', NULL::uuid, NULL::uuid, NULL::text, 11.26::numeric),
  ('7899566302580', 'CARNE MOIDA TUDBOM 500gr', NULL::uuid, NULL::uuid, NULL::text, 17.70::numeric),
  ('863', 'CARVAO MARAVILHA 3KG', NULL::uuid, NULL::uuid, NULL::text, 12.00::numeric),
  ('5601213184867', 'CASAL MENDES ROSE 750ml', NULL::uuid, NULL::uuid, NULL::text, 49.90::numeric),
  ('5601213188216', 'CASAL MENDES VINHO VERDE 750ml', NULL::uuid, NULL::uuid, NULL::text, 49.90::numeric),
  ('866', 'CATAIA 300ML', '743da3bd-a2d0-4c80-8da2-2ea56e838df0'::uuid, NULL::uuid, NULL::text, 19.50::numeric),
  ('7898172661623', 'CATUPINGA 900ml', NULL::uuid, NULL::uuid, NULL::text, 19.00::numeric),
  ('7892840824396', 'CEBOLITOS 91gr', NULL::uuid, NULL::uuid, NULL::text, 10.00::numeric),
  ('7891515646431', 'CHEESEBURGER MONTANA PERDIGÃO 145gr', NULL::uuid, NULL::uuid, NULL::text, 6.50::numeric),
  ('7892840824921', 'CHEETOS LUA PARMESÃO 80gr', NULL::uuid, NULL::uuid, NULL::text, 10.00::numeric),
  ('7892840824938', 'CHEETOS MIX DE QUEIJOS 70gr', NULL::uuid, NULL::uuid, NULL::text, 10.00::numeric),
  ('7892840825003', 'CHEETOS ONDA REQUERIJÃO', NULL::uuid, NULL::uuid, NULL::text, 10.00::numeric),
  ('7891515646448', 'CHGURRASBURGER C/ MAIONESE 145gr PERDIGÃO', NULL::uuid, NULL::uuid, NULL::text, 6.50::numeric),
  ('807', 'CHICLETES BLONG HORTELÃ', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 0.50::numeric),
  ('835', 'CHICLETES BLONG MORANGO', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 0.50::numeric),
  ('806', 'CHICLETES BLONG TUTTI FRUTTI', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 0.50::numeric),
  ('804', 'CHICLETES BLONG UVA', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 0.50::numeric),
  ('808', 'CHICLETES BRINQ', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 0.25::numeric),
  ('826', 'CHOCO MOÇA', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 2.60::numeric),
  ('696', 'CHOCODUO', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 9.90::numeric),
  ('7622210673831', 'CHOCOLATE AO LEITE LACTA 80gr', NULL::uuid, NULL::uuid, NULL::text, 10.50::numeric),
  ('7622210674319', 'CHOCOLATE BRANCO LAKA LACTA 80gr', NULL::uuid, NULL::uuid, NULL::text, 10.50::numeric),
  ('7622210674050', 'CHOCOLATE DIAMANTE NEGRO LACTA 80gr', NULL::uuid, NULL::uuid, NULL::text, 10.50::numeric),
  ('7898156620387', 'chocolate maltado', NULL::uuid, NULL::uuid, NULL::text, 5.50::numeric),
  ('7622210674395', 'CHOCOLATE SHOT LACTA 80gr', NULL::uuid, NULL::uuid, NULL::text, 10.50::numeric),
  ('7898290439418', 'CHOCOLEITE MORANGO', NULL::uuid, NULL::uuid, NULL::text, 1.00::numeric),
  ('742', 'CINI COLA 2LT', NULL::uuid, 'e9bcef8b-868b-4d47-9406-59696c92fa90'::uuid, NULL::text, 5.00::numeric),
  ('743', 'CINI GENGIBIRRA 2LT', NULL::uuid, 'e9bcef8b-868b-4d47-9406-59696c92fa90'::uuid, NULL::text, 5.00::numeric),
  ('692', 'CLUBE DOS MESTRES', '6985eeae-f7d1-41a8-82b4-f51a0eda208f'::uuid, NULL::uuid, NULL::text, 45.00::numeric),
  ('7894900015119', 'COCA COLA 1L (VIDRO)', NULL::uuid, '8ee09fd7-882d-48b2-8cbd-b175c532c270'::uuid, 'UND', 5.35::numeric),
  ('825', 'COCADA PRAZERES', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 1.80::numeric),
  ('843', 'COINTREAU L´INIQUE', 'd47a9b1f-7f4b-45d5-91d2-4888c4660afe'::uuid, NULL::uuid, NULL::text, 128.00::numeric),
  ('848', 'CONTRA FILÉ (NOIX) TODA HORA', NULL::uuid, NULL::uuid, NULL::text, 38.00::numeric),
  ('7898156622862', 'COOKIES AND CREAM KASKIN', NULL::uuid, NULL::uuid, NULL::text, 11.50::numeric),
  ('7896777975916', 'COOLER BEL 30L', NULL::uuid, NULL::uuid, NULL::text, 79.90::numeric),
  ('831', 'COPINHO DE BANANA', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 1.50::numeric),
  ('830', 'COPINHO DE GOIABA', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 1.50::numeric),
  ('704', 'COPO NAPOLITANO', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 8.00::numeric),
  ('7891149108718', 'CORONA EXTRA LONG NECK', NULL::uuid, '2e376cfc-dccb-4428-b4c4-498eccc528b8'::uuid, NULL::text, 7.50::numeric),
  ('844', 'CORUJA JESSICA', NULL::uuid, NULL::uuid, NULL::text, 12.00::numeric),
  ('861', 'COSTELA CARNEIRO ARGENTINA', NULL::uuid, NULL::uuid, NULL::text, 39.77::numeric),
  ('864', 'COSTELA MINGA', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 33.96::numeric),
  ('7896275900311', 'COSTELA SUINA TEMPERADA FRIMESA 1kg', NULL::uuid, NULL::uuid, NULL::text, 26.33::numeric),
  ('7898208481157', 'COXA E SOBRECOXA CANÇÃO 1kg', NULL::uuid, NULL::uuid, NULL::text, 10.55::numeric),
  ('850', 'COXINHA DA ASA CANÇÃO', NULL::uuid, NULL::uuid, NULL::text, 12.75::numeric),
  ('7897200607640', 'CRISPY CHICKEN CANÇÃO 300gr', NULL::uuid, NULL::uuid, NULL::text, 5.40::numeric),
  ('7896002111911', 'CUNHAQUE DOMOS 900ml', NULL::uuid, NULL::uuid, NULL::text, 13.50::numeric),
  ('777', 'CYNAR', '52b4bb4a-24ac-4af7-ad86-a791141e27a4'::uuid, NULL::uuid, NULL::text, 29.70::numeric),
  ('812', 'DIP LOKO AMORA AZEDA', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 3.00::numeric),
  ('810', 'DIP LOKO MORANGO', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 3.00::numeric),
  ('811', 'DIP LOKO SABOR FOGO', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 3.00::numeric),
  ('823', 'DOCE AMENDOIM  SIQUEIRENSE', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 1.00::numeric),
  ('401411671320', 'DOCE D/ AMENDOIN CASEIRO ISABELY', NULL::uuid, NULL::uuid, NULL::text, 25.00::numeric),
  ('7894888635781', 'DOCE DE AMENDOIN', NULL::uuid, NULL::uuid, NULL::text, 2.00::numeric),
  ('829', 'DOCE MASSA DE BATATA VITORIA', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 1.50::numeric),
  ('7892840822446', 'DORITOS QUEIJO NACHO 120gr', NULL::uuid, NULL::uuid, NULL::text, 15.00::numeric),
  ('7892840822729', 'DORITOS SWEET CHILI 120gr', NULL::uuid, NULL::uuid, NULL::text, 15.00::numeric),
  ('0035399273940', 'DRANBACK 100ML LICOR DOCE/LEITE', NULL::uuid, NULL::uuid, NULL::text, 13.00::numeric),
  ('070341725047', 'DRANBACK 750ML  LICOR DOCE DE LEITE', NULL::uuid, NULL::uuid, NULL::text, 65.00::numeric),
  ('759', 'DRINK  EXPRESS PISTACHE', '52b4bb4a-24ac-4af7-ad86-a791141e27a4'::uuid, NULL::uuid, NULL::text, 19.50::numeric),
  ('765', 'DRINK EXPRESS ALBINO', '52b4bb4a-24ac-4af7-ad86-a791141e27a4'::uuid, NULL::uuid, NULL::text, 19.50::numeric),
  ('035399273919', 'DRINK EXPRESS BLUE VIBE 530ml', NULL::uuid, NULL::uuid, NULL::text, 19.50::numeric),
  ('763', 'DRINK EXPRESS CHOCOLATE BRANCO', '52b4bb4a-24ac-4af7-ad86-a791141e27a4'::uuid, NULL::uuid, NULL::text, 19.50::numeric),
  ('630941064917', 'DRINK EXPRESS CHOCONHAQUE', NULL::uuid, NULL::uuid, NULL::text, 19.50::numeric),
  ('768', 'DRINK EXPRESS COCO', '52b4bb4a-24ac-4af7-ad86-a791141e27a4'::uuid, NULL::uuid, NULL::text, 19.50::numeric),
  ('761', 'DRINK EXPRESS DOCE DE LEITE', '52b4bb4a-24ac-4af7-ad86-a791141e27a4'::uuid, NULL::uuid, NULL::text, 19.50::numeric),
  ('758', 'DRINK EXPRESS MARACUJA', '52b4bb4a-24ac-4af7-ad86-a791141e27a4'::uuid, NULL::uuid, NULL::text, 19.50::numeric),
  ('630941064887', 'DRINK EXPRESS MENTA REFRESCANTE 530ml', NULL::uuid, NULL::uuid, NULL::text, 19.50::numeric),
  ('760', 'DRINK EXPRESS PAÇOCA', '52b4bb4a-24ac-4af7-ad86-a791141e27a4'::uuid, NULL::uuid, NULL::text, 19.50::numeric),
  ('762', 'DRINK EXPRESS PINA COLADA', '52b4bb4a-24ac-4af7-ad86-a791141e27a4'::uuid, NULL::uuid, NULL::text, 19.50::numeric),
  ('764', 'DRINK EXPRESS PRESTIGIO', '52b4bb4a-24ac-4af7-ad86-a791141e27a4'::uuid, NULL::uuid, NULL::text, 19.50::numeric),
  ('766', 'DRINK EXPRESS SENSAÇÃO', '52b4bb4a-24ac-4af7-ad86-a791141e27a4'::uuid, NULL::uuid, NULL::text, 19.50::numeric),
  ('796', 'DUCREM AVELÃ', NULL::uuid, NULL::uuid, NULL::text, 1.00::numeric),
  ('797', 'DUCREM LEITE CONDENSADO', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 1.00::numeric),
  ('7896037918950', 'DUSHY ROSE ZERO ALCOOL 660ml', NULL::uuid, NULL::uuid, NULL::text, 18.90::numeric),
  ('631430848803', 'Dviny POPS Amendoin  40gr', NULL::uuid, NULL::uuid, NULL::text, 3.50::numeric),
  ('631430848810', 'Dviny POPS Banana Passa 40gr', NULL::uuid, NULL::uuid, NULL::text, 3.50::numeric),
  ('631430848773', 'Dviny POPS Cereal Chocolate ao Leite 40gr', '633d2f44-3bbd-46f6-ae7c-9aca4c8b5d35'::uuid, NULL::uuid, NULL::text, 3.50::numeric),
  ('631430848766', 'Dviny POPS Cereal Duo Azul 40gr', '633d2f44-3bbd-46f6-ae7c-9aca4c8b5d35'::uuid, NULL::uuid, NULL::text, 3.50::numeric),
  ('846', 'ELEFANTINHO FARDO C/12 250ml', NULL::uuid, NULL::uuid, NULL::text, 12.00::numeric),
  ('754', 'ENGRADADO DA COCA COLA(PET e VIDRO)', NULL::uuid, NULL::uuid, NULL::text, 45.00::numeric),
  ('877', 'ESPETINHO', NULL::uuid, NULL::uuid, NULL::text, 5.00::numeric),
  ('7896037913917', 'ESPUMANTE DEMI SECO QUINTA DO MORGADO', NULL::uuid, NULL::uuid, NULL::text, 27.90::numeric),
  ('7896037917106', 'ESPUMANTE QUINTA DO MORGADO BRUT', NULL::uuid, NULL::uuid, NULL::text, 25.90::numeric),
  ('879', 'ESTRELINHA', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 5.50::numeric),
  ('792', 'FABIANE ABACAXI 2L', '68a701af-9bbb-4ecb-97cc-0e19c4789286'::uuid, NULL::uuid, NULL::text, 4.50::numeric),
  ('787', 'Fabiane Framboesa 2L', '68a701af-9bbb-4ecb-97cc-0e19c4789286'::uuid, NULL::uuid, NULL::text, 4.50::numeric),
  ('789', 'Fabiane Laranja 2L', '68a701af-9bbb-4ecb-97cc-0e19c4789286'::uuid, NULL::uuid, NULL::text, 4.50::numeric),
  ('786', 'Fabiane Laranjinha 2L', '68a701af-9bbb-4ecb-97cc-0e19c4789286'::uuid, NULL::uuid, NULL::text, 4.50::numeric),
  ('790', 'Fabiane Tuttituba 2L', '68a701af-9bbb-4ecb-97cc-0e19c4789286'::uuid, NULL::uuid, NULL::text, 4.50::numeric),
  ('791', 'FABIANE UVA', '68a701af-9bbb-4ecb-97cc-0e19c4789286'::uuid, NULL::uuid, NULL::text, 4.50::numeric),
  ('7892840825065', 'FANDANGOS PRESUNTO 85gr', NULL::uuid, NULL::uuid, NULL::text, 8.50::numeric),
  ('7892840825058', 'FANDANGOS QUEIJO 85gr', NULL::uuid, NULL::uuid, NULL::text, 8.50::numeric),
  ('853', 'FANTA GUARÁNA LATA', '68a701af-9bbb-4ecb-97cc-0e19c4789286'::uuid, '02f67526-18c7-4366-8596-418830f80871'::uuid, NULL::text, 4.00::numeric),
  ('841', 'FANTA MAÇÃ LATA', '68a701af-9bbb-4ecb-97cc-0e19c4789286'::uuid, '02f67526-18c7-4366-8596-418830f80871'::uuid, NULL::text, 4.00::numeric),
  ('854', 'FANTA MARACUJÁ LATA', '68a701af-9bbb-4ecb-97cc-0e19c4789286'::uuid, '02f67526-18c7-4366-8596-418830f80871'::uuid, NULL::text, 4.00::numeric),
  ('7898208483854', 'FILÉ DE SASSAMI SOLTINHO CANÇÃO', NULL::uuid, NULL::uuid, NULL::text, 18.25::numeric),
  ('802', 'FINI MAÇA DO AMOR', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 1.00::numeric),
  ('803', 'FINI TWISTER', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 1.00::numeric),
  ('801', 'FINI UVA AZEDINHO', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 1.00::numeric),
  ('817', 'FLOPITO CHICLE GIGA TUTTI-FRUTT', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 1.00::numeric),
  ('7898939441611', 'FONDANT D/LEITE EM PÓ', NULL::uuid, NULL::uuid, NULL::text, 34.85::numeric),
  ('7898939441628', 'FONDANT LEITE EM PÓ C/CACAU', NULL::uuid, NULL::uuid, NULL::text, 34.80::numeric),
  ('7898912374011', 'FONT LIFE 500ml', NULL::uuid, NULL::uuid, NULL::text, 1.40::numeric),
  ('839', 'FOSFORO', NULL::uuid, NULL::uuid, NULL::text, 1.00::numeric),
  ('824', 'FOUNDANT LEITE C/PAÇOCA MILUA', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 25.00::numeric),
  ('2000030053135', 'FRALDINHA DO CHEF', NULL::uuid, NULL::uuid, NULL::text, 52.04::numeric),
  ('7898641040324', 'FRANGO A PASSARINHO BELLO 1kg', NULL::uuid, NULL::uuid, NULL::text, 10.50::numeric),
  ('7891151043069', 'FREEGELLS MIX D/SABORES', NULL::uuid, NULL::uuid, NULL::text, 11.10::numeric),
  ('747', 'FRISANTE PÉRGOLA BRANCO 750ml', '6985eeae-f7d1-41a8-82b4-f51a0eda208f'::uuid, NULL::uuid, 'UND', 15.47::numeric),
  ('746', 'FRISANTE PÉRGOLA ROSE 750ml', '6985eeae-f7d1-41a8-82b4-f51a0eda208f'::uuid, NULL::uuid, NULL::text, 15.47::numeric),
  ('7898581653066', 'GELATINA NATURAL', NULL::uuid, NULL::uuid, NULL::text, 2.00::numeric),
  ('828', 'GELEIA MORANGO ABACAXI', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 1.50::numeric),
  ('602883448094', 'GELO CONQUISTA 3K', NULL::uuid, NULL::uuid, NULL::text, 9.00::numeric),
  ('795', 'GOMA FRUIT', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 1.00::numeric),
  ('794', 'GOMA GURTY', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 1.00::numeric),
  ('78938793', 'HALLS CEREJA', NULL::uuid, NULL::uuid, NULL::text, 2.50::numeric),
  ('7896275900571', 'HAMBURGER 56gr FRIMESA', NULL::uuid, NULL::uuid, NULL::text, 2.10::numeric),
  ('7896275921064', 'hamburgue bovino 90g', NULL::uuid, NULL::uuid, NULL::text, 3.40::numeric),
  ('7891515989408', 'HAMBURGUER MONTANA PERDIGÃO 56gr', NULL::uuid, NULL::uuid, NULL::text, 1.50::numeric),
  ('7891515879716', 'HAMBURGUER MONTANA PERDIGÃO 90gr', NULL::uuid, NULL::uuid, NULL::text, 2.65::numeric),
  ('78935495', 'HEINEKEN 250ML', NULL::uuid, 'f4fa1bb7-0042-497f-a424-a19ed1692a3c'::uuid, NULL::text, 5.00::numeric),
  ('7894904678341', 'HOT HIT SEARA X BACON 145gr', NULL::uuid, NULL::uuid, NULL::text, 7.90::numeric),
  ('7894904678297', 'HOT HIT SEARA X BURGER 145gr', NULL::uuid, NULL::uuid, NULL::text, 7.90::numeric),
  ('7894904678280', 'HOT HIT SEARA X PICANHA 145gr', NULL::uuid, NULL::uuid, NULL::text, 7.90::numeric),
  ('682', 'IMPERIO ULTRA 269ML', '723e4fe2-68c9-483c-8809-1c97164443cc'::uuid, 'bd1a121d-9877-48f6-85c4-fc4e3a58e30a'::uuid, NULL::text, 38.00::numeric),
  ('741', 'ISQUEIRO CRICKET', NULL::uuid, NULL::uuid, NULL::text, 3.00::numeric),
  ('8991666002236', 'ISQUEIRO LONGO', NULL::uuid, NULL::uuid, NULL::text, 5.00::numeric),
  ('609963921447', 'ISQUEIRO MAÇARICO', NULL::uuid, NULL::uuid, NULL::text, 15.00::numeric),
  ('676', 'JAGERHAUS', '52b4bb4a-24ac-4af7-ad86-a791141e27a4'::uuid, NULL::uuid, NULL::text, 79.30::numeric),
  ('865', 'JAMBU 300ML', '743da3bd-a2d0-4c80-8da2-2ea56e838df0'::uuid, NULL::uuid, NULL::text, 19.50::numeric),
  ('670', 'JONVILLE COCKTAIL DOCE DE LEITE', '52b4bb4a-24ac-4af7-ad86-a791141e27a4'::uuid, NULL::uuid, NULL::text, 22.10::numeric),
  ('672', 'JONVILLE COCKTAIL MARACUJA', '52b4bb4a-24ac-4af7-ad86-a791141e27a4'::uuid, NULL::uuid, NULL::text, 22.10::numeric),
  ('669', 'JONVILLE COCKTAIL MORANGO', '52b4bb4a-24ac-4af7-ad86-a791141e27a4'::uuid, NULL::uuid, NULL::text, 22.10::numeric),
  ('671', 'JONVILLE COCKTAIL PINA COLADA', '52b4bb4a-24ac-4af7-ad86-a791141e27a4'::uuid, NULL::uuid, NULL::text, 22.10::numeric),
  ('668', 'JONVILLE DE AMENDOIM', '52b4bb4a-24ac-4af7-ad86-a791141e27a4'::uuid, NULL::uuid, NULL::text, 19.40::numeric),
  ('666', 'JONVILLE DE COCO', '52b4bb4a-24ac-4af7-ad86-a791141e27a4'::uuid, NULL::uuid, NULL::text, 19.40::numeric),
  ('667', 'JONVILLE DE LIMAO', '52b4bb4a-24ac-4af7-ad86-a791141e27a4'::uuid, NULL::uuid, NULL::text, 19.40::numeric),
  ('665', 'JONVILLE MARACUJA', '52b4bb4a-24ac-4af7-ad86-a791141e27a4'::uuid, NULL::uuid, NULL::text, 19.40::numeric),
  ('7898156620479', 'KASKIN TUTTIU COLORI', NULL::uuid, NULL::uuid, NULL::text, 2.30::numeric),
  ('7896037917182', 'KIT ESPUMANTE ROSE+TAÇA QUINTA DO MORGADO', NULL::uuid, NULL::uuid, NULL::text, 41.50::numeric),
  ('7896037913993', 'KIT ESPUMANTE+TAÇA QUINTA DO MORGADO', NULL::uuid, NULL::uuid, NULL::text, 41.50::numeric),
  ('7896037913481', 'KIT VINHO BORDO+TAÇA QUINTA DO MORGADO', NULL::uuid, NULL::uuid, NULL::text, 33.50::numeric),
  ('7791203003327', 'LA LINDA CABERNET SAUVIGNON 2025 750ml', NULL::uuid, NULL::uuid, NULL::text, 61.00::numeric),
  ('7791203003365', 'LA LINDA CHARDONNAY 2025 750ml', NULL::uuid, NULL::uuid, NULL::text, 61.00::numeric),
  ('7791203003389', 'LA LINDA ROSE MALBEC 2025 750ml', NULL::uuid, NULL::uuid, NULL::text, 61.00::numeric),
  ('7791203003396', 'LA LINDA SWEET 2025 750ml', NULL::uuid, NULL::uuid, NULL::text, 61.00::numeric),
  ('7791203003372', 'LA LINDA TORRONTES 2025 750ml', NULL::uuid, NULL::uuid, NULL::text, 61.00::numeric),
  ('7622210674357', 'LACTA LAKA OREO 80g', NULL::uuid, NULL::uuid, NULL::text, 10.50::numeric),
  ('7622210528216', 'LACTA OURO BRANCO 98g', NULL::uuid, NULL::uuid, NULL::text, 10.50::numeric),
  ('7894904082728', 'LASANHA 4 QUEIJOS SEARA 600gr', NULL::uuid, NULL::uuid, NULL::text, 13.30::numeric),
  ('7891515496357', 'LASANHA A BOLONHESA  PERDIGÃO 600gr', NULL::uuid, NULL::uuid, NULL::text, 12.20::numeric),
  ('7894904082704', 'LASANHA BOLONHESA SEARA 600gr', NULL::uuid, NULL::uuid, NULL::text, 13.30::numeric),
  ('7891515490430', 'LASANHA DE CALABRESA PERDIGÃO 600gr', NULL::uuid, NULL::uuid, NULL::text, 12.20::numeric),
  ('7891515496234', 'LASANHA DE FRANGO PERDIGÃO 600gr', NULL::uuid, NULL::uuid, NULL::text, 12.20::numeric),
  ('7894904070596', 'LASANHA DE FRANGO SEARA 600gr', NULL::uuid, NULL::uuid, NULL::text, 13.30::numeric),
  ('7894904072439', 'LASANHA DE PRESUNTO E QUEIJO SEARA', NULL::uuid, NULL::uuid, NULL::text, 13.30::numeric),
  ('691', 'LATITUDE 33', NULL::uuid, NULL::uuid, NULL::text, 51.90::numeric),
  ('769', 'LICOR DO ROLE', '52b4bb4a-24ac-4af7-ad86-a791141e27a4'::uuid, NULL::uuid, NULL::text, 39.00::numeric),
  ('035399273957', 'LICOR DO ROLE 100ML', NULL::uuid, NULL::uuid, NULL::text, 9.00::numeric),
  ('7896419722656', 'LINGUIÇA DE FRANGO FININHA LAR 1kg', NULL::uuid, NULL::uuid, NULL::text, 15.70::numeric),
  ('7896275910242', 'LINGUIÇA DE PERNIL 1kg FRIMESA', NULL::uuid, NULL::uuid, NULL::text, 21.25::numeric),
  ('7899430805919', 'LINGUIÇA SUINA CHURRASCO 1kg', NULL::uuid, NULL::uuid, NULL::text, 16.80::numeric),
  ('7896275910112', 'LINGUIÇA TOSCANA FRIMESA 1kg', NULL::uuid, NULL::uuid, NULL::text, 20.40::numeric),
  ('7894904574780', 'MARGARINA DORIANA 250gr''', NULL::uuid, NULL::uuid, NULL::text, 5.20::numeric),
  ('7894904571956', 'MARGARINA DORIANA 500gr', NULL::uuid, NULL::uuid, NULL::text, 9.20::numeric),
  ('7896549408109', 'MAXIMUM BISCOITO 70g', NULL::uuid, NULL::uuid, NULL::text, 12.50::numeric),
  ('7896549408024', 'MAXIMUM BROWNIE 75g', NULL::uuid, NULL::uuid, NULL::text, 12.50::numeric),
  ('706', 'MAXIMUM PETIT GATEAU', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 12.50::numeric),
  ('707', 'MAXIMUM WHITE', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 12.50::numeric),
  ('849', 'MEIO DA ASA CANÇÃO 1kg', NULL::uuid, NULL::uuid, NULL::text, 29.42::numeric),
  ('7891991302036', 'MICHELOB ULTRA 350ml', NULL::uuid, NULL::uuid, NULL::text, 39.80::numeric),
  ('7891991302029', 'MICHELOB ULTRA 350ml LATA', NULL::uuid, NULL::uuid, NULL::text, 5.50::numeric),
  ('695', 'MILKILÉ CHOCOLATE', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 5.50::numeric),
  ('700', 'MILKILÉ MILHO VERDE', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 5.50::numeric),
  ('699', 'MILKILÉ MORANGO', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 5.50::numeric),
  ('7898156620738', 'MILKINHO KASKIN', NULL::uuid, NULL::uuid, NULL::text, 2.30::numeric),
  ('7898156623678', 'MINI PALETA KASKIN LEITINHO E AVELÃ', NULL::uuid, NULL::uuid, NULL::text, 10.00::numeric),
  ('7898938890045', 'MONSTER PIPELINE PUNCH', NULL::uuid, '23dde2c7-cfe1-4815-8b83-3fcf0737497f'::uuid, NULL::text, 10.00::numeric),
  ('7898770420011', 'MONSTER ULTRA STRAWBERRY DREAMS 473ml', NULL::uuid, '23dde2c7-cfe1-4815-8b83-3fcf0737497f'::uuid, NULL::text, 10.00::numeric),
  ('793', 'MORANGUETE', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 1.00::numeric),
  ('7894904268573', 'MORTADELA DEFUMADA FATIADA SEARA GOURMET 180gr', NULL::uuid, NULL::uuid, NULL::text, 7.90::numeric),
  ('7894904268542', 'MORTADELA FATIADA TRADICIONAL SEARA 180gr', NULL::uuid, NULL::uuid, NULL::text, 6.50::numeric),
  ('7896275920838', 'MORTADELA FRIMESA 200gr', NULL::uuid, NULL::uuid, NULL::text, 5.30::numeric),
  ('7891151035699', 'MY TOFFEE CARAMELO C/CHOCOLATE', NULL::uuid, NULL::uuid, NULL::text, 24.40::numeric),
  ('7891151035705', 'MY TOFFEEE CHOCOLATE', NULL::uuid, NULL::uuid, NULL::text, 24.40::numeric),
  ('7896279600538', 'OLEO COAMO 900ml TIPO 1', NULL::uuid, NULL::uuid, NULL::text, 6.39::numeric),
  ('770', 'OPA 350ML', '723e4fe2-68c9-483c-8809-1c97164443cc'::uuid, NULL::uuid, NULL::text, 35.00::numeric),
  ('749', 'OPEN BAR CAIPIRINHA', NULL::uuid, NULL::uuid, NULL::text, 23.00::numeric),
  ('750', 'OPEN BAR CAIPIRINHA DE AMARULA', NULL::uuid, NULL::uuid, NULL::text, 26.50::numeric),
  ('7898067340404', 'PÃ0 DE ALHO TRADICIONAL SANTA MASSA 400gr', NULL::uuid, NULL::uuid, NULL::text, 15.00::numeric),
  ('834', 'PAÇOCA MORENINHA DO RIO', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 0.50::numeric),
  ('832', 'PAÇOQUINHA  MANAMEL', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 0.50::numeric),
  ('709', 'PALETA MEXICANA MORANGO C/ LEITE COND.', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 12.50::numeric),
  ('694', 'PALI FRUTY ABACAXI', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 4.00::numeric),
  ('697', 'PALI FRUTY MORANGO', NULL::uuid, NULL::uuid, NULL::text, 4.00::numeric),
  ('880', 'PALI FRUTY UVA', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 4.00::numeric),
  ('7896275983901', 'PÃO DE ALHO FOGO&SABOR FRIMESA 340gr', NULL::uuid, NULL::uuid, NULL::text, 10.50::numeric),
  ('7898067340503', 'PÃO DE ALHO LEVEMENTE PICANTE SANTA MASSA 400gr', NULL::uuid, NULL::uuid, NULL::text, 15.00::numeric),
  ('7898067340688', 'PÃO DE CEBOLA SANTA MASSA 400gr', NULL::uuid, NULL::uuid, NULL::text, 15.00::numeric),
  ('7898067340206', 'PÃO DE PEPPERONI SANTA MASSA 240gr', NULL::uuid, NULL::uuid, NULL::text, 13.45::numeric),
  ('833', 'PÉ DE MOLEQUE', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 1.00::numeric),
  ('7898156621339', 'PEDACINHO DO CÉU KASKIN', NULL::uuid, NULL::uuid, NULL::text, 2.30::numeric),
  ('745', 'Pérgola Rose Suave 1L', '6985eeae-f7d1-41a8-82b4-f51a0eda208f'::uuid, NULL::uuid, NULL::text, 25.65::numeric),
  ('862', 'PERNIL CARNEIRO URUGUAI', NULL::uuid, NULL::uuid, NULL::text, 75.75::numeric),
  ('2000040068884', 'PICANHA FATIADA TODA HORA', NULL::uuid, NULL::uuid, NULL::text, 47.70::numeric),
  ('7896275900649', 'PICANHA SUINA TEMPERADA FOGO&SABOR', NULL::uuid, NULL::uuid, NULL::text, 39.00::numeric),
  ('7898156622497', 'PICOLE AÇAI COM BANANA', NULL::uuid, NULL::uuid, NULL::text, 7.00::numeric),
  ('7898785410502', 'PICOLE ALGODAO DOCE', NULL::uuid, NULL::uuid, NULL::text, 5.50::numeric),
  ('701', 'PICOLE CHOCOTELLA', NULL::uuid, NULL::uuid, NULL::text, 9.90::numeric),
  ('7896549405177', 'PICOLE ESPECIAL BRIGADEIRO 65g', NULL::uuid, NULL::uuid, NULL::text, 9.90::numeric),
  ('7896549405153', 'PICOLE ESPECIAL CHOCODUO 65g', NULL::uuid, NULL::uuid, NULL::text, 9.90::numeric),
  ('7896549403333', 'PICOLE KROC SENSAÇAO', NULL::uuid, NULL::uuid, NULL::text, 10.50::numeric),
  ('7892840823108', 'PINGO DE OURO BACON 160gr', NULL::uuid, NULL::uuid, NULL::text, 10.00::numeric),
  ('7892840823146', 'PINGO DE OURO PICANHA 120gr', NULL::uuid, NULL::uuid, NULL::text, 10.00::numeric),
  ('782', 'PIRULITO', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 1.00::numeric),
  ('821', 'PIRULITO ARCO IRÍS', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 2.60::numeric),
  ('820', 'PIRURULITO FRUSLYTTO', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 1.00::numeric),
  ('7891515532918', 'PIZZA BRASILEIRA PERDIGÃO 460gr', NULL::uuid, NULL::uuid, NULL::text, 15.70::numeric),
  ('7891515533014', 'PIZZA DE CALABRESA PERDIGÃO 460gr', NULL::uuid, NULL::uuid, NULL::text, 15.70::numeric),
  ('7891515621063', 'PIZZA DE FRANGO COM BACON PERDIGÃO 460gr', NULL::uuid, NULL::uuid, NULL::text, 15.70::numeric),
  ('7894904326044', 'PIZZA SEARA CALABRESA 460gr', NULL::uuid, NULL::uuid, NULL::text, 17.40::numeric),
  ('7894904325702', 'PIZZA SEARA FRANGO C/ CATUPIRY 460gr', NULL::uuid, NULL::uuid, NULL::text, 17.40::numeric),
  ('7894904578566', 'PIZZA SEARA LOMBO C/ CATUPIRY 460gr', NULL::uuid, NULL::uuid, NULL::text, 17.40::numeric),
  ('7891118011056', 'PLUTONITA ABRACO CONGELANTE', NULL::uuid, NULL::uuid, NULL::text, 0.30::numeric),
  ('7891118025985', 'PLUTONITA BABA DE BRUXA', NULL::uuid, NULL::uuid, NULL::text, 0.30::numeric),
  ('7891118011063', 'PLUTONITA LINGUA ÁCIDA', NULL::uuid, NULL::uuid, NULL::text, 0.30::numeric),
  ('818', 'POP CHICLE MORANGO', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 1.00::numeric),
  ('819', 'POP NAPOLITANO', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 1.00::numeric),
  ('7896275981273', 'PORCO A PASSARINHO TEMPERADO FOGO&SABOR 1kg', NULL::uuid, NULL::uuid, NULL::text, 24.82::numeric),
  ('717', 'POTE ABACAXI 1L', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 18.50::numeric),
  ('721', 'POTE AÇAI 1L', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 29.00::numeric),
  ('727', 'POTE BIG SUNDAE CHOCOLATE 2L', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 33.90::numeric),
  ('726', 'POTE BIG SUNDAE MORANGO 2L', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 33.90::numeric),
  ('712', 'POTE CHOCOLATE 1L', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 18.50::numeric),
  ('728', 'POTE CLASSICOS CHOCO/SUIÇO', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 33.90::numeric),
  ('723', 'POTE CLASSICOS FLOCOS 2L', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 33.90::numeric),
  ('729', 'POTE CLASSICOS NAP/TROPICAL', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 33.90::numeric),
  ('722', 'POTE CLASSICOS NAPOLITANO 2L', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 33.90::numeric),
  ('713', 'POTE COCO 1L', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 18.50::numeric),
  ('714', 'POTE CREME 1L', NULL::uuid, NULL::uuid, NULL::text, 18.50::numeric),
  ('715', 'POTE CROCANTE 1L', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 18.50::numeric),
  ('840', 'POTE DE MEL', NULL::uuid, NULL::uuid, NULL::text, 36.00::numeric),
  ('724', 'POTE ESPECIAIS ABACAXI FRANCES 2L', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 35.90::numeric),
  ('725', 'POTE ESPECIAIS SENSAÇAO 2L', NULL::uuid, NULL::uuid, NULL::text, 35.90::numeric),
  ('710', 'POTE FLOCOS 1L', NULL::uuid, NULL::uuid, NULL::text, 18.50::numeric),
  ('711', 'POTE MORANGO 1L', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 18.50::numeric),
  ('720', 'POTE NAPOLITANO 1L', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 28.00::numeric),
  ('716', 'POTE NATA/MORANGO', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 18.50::numeric),
  ('718', 'POTE PASSAS RUM', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 18.50::numeric),
  ('733', 'POTE SPECIALITA CAFE MOKA 1,5L', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 35.90::numeric),
  ('734', 'POTE SPECIALITA CHOCOLATE BRANCO 1,5L', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 35.90::numeric),
  ('881', 'POTE SPECIALITA CREME DE VALSA 1,5L', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 35.90::numeric),
  ('731', 'POTE SPECIALITA LEITINHO TRUFADO 1,5L', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 35.90::numeric),
  ('735', 'POTE SPECIALITA MARACUJA TRUFADO 1,5L', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 35.90::numeric),
  ('732', 'POTE SPECIALITA TORTA ALEMA 1,5 L', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 35.90::numeric),
  ('719', 'POTE YOUGURTE/AMORA 1L', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 18.50::numeric),
  ('7896275900953', 'PRESUNTO BOLONGA FRIMESA 200gr', NULL::uuid, NULL::uuid, NULL::text, 5.80::numeric),
  ('7891515484040', 'PRESUNTO PERDIGÃO 200gr', NULL::uuid, NULL::uuid, NULL::text, 8.50::numeric),
  ('7896353302679', 'QUEIJO DE COALHO CATUPIRY C/07 ESPETOS', NULL::uuid, NULL::uuid, NULL::text, 34.00::numeric),
  ('7898215150282', 'QUEIJO MUSSARELA FATIADO PIRACANJUBA 150gr', NULL::uuid, NULL::uuid, NULL::text, 9.30::numeric),
  ('7896275983949', 'QUEIJO MUSSARELA FRIMESA 150gr', NULL::uuid, NULL::uuid, NULL::text, 8.55::numeric),
  ('7898068080361', 'QUEIJO MUSSARELA RIOLAT 150gr', NULL::uuid, NULL::uuid, NULL::text, 7.85::numeric),
  ('7896037913900', 'QUINTA DO MORGADO MOSCATEL 660ml', NULL::uuid, NULL::uuid, NULL::text, 23.00::numeric),
  ('7896037917045', 'QUINTA DO MORGADO MOSCATEL ROSE 660ml', NULL::uuid, NULL::uuid, NULL::text, 23.00::numeric),
  ('788', 'Ref POP Guarana 2L', NULL::uuid, NULL::uuid, NULL::text, 4.50::numeric),
  ('7896353301184', 'REQUEIJÃO TRADICIONAL CATUPIRY 200gr', NULL::uuid, NULL::uuid, NULL::text, 9.85::numeric),
  ('7892840817978', 'ruffles', NULL::uuid, NULL::uuid, NULL::text, 15.00::numeric),
  ('259', 'SACOLA M 40X50', 'e0d32e18-f238-411f-9dc1-b86014ce0e59'::uuid, NULL::uuid, 'Kg', 15.00::numeric),
  ('260', 'SACOLAS G 50X60', 'e0d32e18-f238-411f-9dc1-b86014ce0e59'::uuid, NULL::uuid, 'Kg', 15.00::numeric),
  ('258', 'SACOLAS P 30X40', 'e0d32e18-f238-411f-9dc1-b86014ce0e59'::uuid, NULL::uuid, 'CAIXA', 11.00::numeric),
  ('663', 'SAKEIH SECO', '6985eeae-f7d1-41a8-82b4-f51a0eda208f'::uuid, NULL::uuid, NULL::text, 18.45::numeric),
  ('7891515742034', 'SALCICHA HOT-DOG PERDIGÃO 500gr', NULL::uuid, NULL::uuid, NULL::text, 11.65::numeric),
  ('740', 'SALGADO DE TRIGO WANFLO BACON 70G', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 3.00::numeric),
  ('702', 'SANDOE CHOCOLATE', NULL::uuid, NULL::uuid, NULL::text, 8.00::numeric),
  ('703', 'SANDOE MORANGO', NULL::uuid, NULL::uuid, NULL::text, 8.00::numeric),
  ('859', 'SCHWEPPES  AGUA TONICA 1,5L', 'a6030544-4e67-49a0-aa01-43ccc49e7257'::uuid, NULL::uuid, NULL::text, 8.60::numeric),
  ('860', 'SCHWEPPES AGUA TONICA 250ml (VIDRO)', 'a6030544-4e67-49a0-aa01-43ccc49e7257'::uuid, NULL::uuid, NULL::text, 5.60::numeric),
  ('856', 'SCHWEPPES AGUA TONICA ZERO LATA', '68a701af-9bbb-4ecb-97cc-0e19c4789286'::uuid, NULL::uuid, NULL::text, 4.50::numeric),
  ('858', 'SCHWEPPES CITRUS LATA', '68a701af-9bbb-4ecb-97cc-0e19c4789286'::uuid, NULL::uuid, NULL::text, 4.50::numeric),
  ('705', 'SKIMO', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 7.00::numeric),
  ('755', 'SKOL BEATS GT', '1ec2ab6b-fed4-443d-9b85-08fdc7f65fda'::uuid, '4327f394-552e-4296-bde1-deb11cbcab84'::uuid, NULL::text, 5.75::numeric),
  ('756', 'SKOL BEATS SENSSES', '1ec2ab6b-fed4-443d-9b85-08fdc7f65fda'::uuid, '4327f394-552e-4296-bde1-deb11cbcab84'::uuid, NULL::text, 5.75::numeric),
  ('7893218003634', 'SMIRNOFF 1.750ml (PET)', NULL::uuid, '0e2067f9-eaaa-473f-9eef-8107090fc048'::uuid, NULL::text, 51.90::numeric),
  ('693', 'SNICKERS', '633d2f44-3bbd-46f6-ae7c-9aca4c8b5d35'::uuid, NULL::uuid, NULL::text, 5.00::numeric),
  ('7894900086003', 'SOJA 1L', NULL::uuid, NULL::uuid, NULL::text, 10.00::numeric),
  ('78934115', 'SOL LONG-NECK', NULL::uuid, 'dd6bf11b-d4e0-4ccf-9ed5-8b89cd8869b5'::uuid, NULL::text, 5.50::numeric),
  ('878', 'SORVETE DE LEITE C/5', NULL::uuid, NULL::uuid, NULL::text, 8.00::numeric),
  ('7896549401551', 'SORVETE NEVAL DE CREME', NULL::uuid, NULL::uuid, NULL::text, 18.50::numeric),
  ('7894900681017', 'SPRITE LATA', NULL::uuid, '30bc1a17-525a-4625-829c-2959c704da38'::uuid, NULL::text, 4.00::numeric),
  ('855', 'SPRITE ZERO LATA', '68a701af-9bbb-4ecb-97cc-0e19c4789286'::uuid, '30bc1a17-525a-4625-829c-2959c704da38'::uuid, NULL::text, 4.00::numeric),
  ('7894904003495', 'STEAK TRADICIONAL SEARA 100gr', NULL::uuid, NULL::uuid, NULL::text, 2.50::numeric),
  ('7891515474133', 'STEAKY RECHEADO PERDIGÃO 100gr', NULL::uuid, NULL::uuid, NULL::text, 5.20::numeric),
  ('7892840822613', 'STIKSY ASSADO 160gr', NULL::uuid, NULL::uuid, NULL::text, 10.00::numeric),
  ('778', 'STOCK CHERRY BRANDY', 'd47a9b1f-7f4b-45d5-91d2-4888c4660afe'::uuid, NULL::uuid, NULL::text, 62.45::numeric),
  ('780', 'STOCK CHOCOLATE', 'd47a9b1f-7f4b-45d5-91d2-4888c4660afe'::uuid, NULL::uuid, NULL::text, 62.45::numeric),
  ('779', 'STOCK CREME CACAU', 'd47a9b1f-7f4b-45d5-91d2-4888c4660afe'::uuid, NULL::uuid, NULL::text, 62.45::numeric),
  ('781', 'STOCK MENTA', 'd47a9b1f-7f4b-45d5-91d2-4888c4660afe'::uuid, NULL::uuid, NULL::text, 62.45::numeric),
  ('675', 'SUBZERO 350ML', '723e4fe2-68c9-483c-8809-1c97164443cc'::uuid, NULL::uuid, NULL::text, 37.35::numeric),
  ('7896549404019', 'SUNDAE CHOCOLATE 100gr', NULL::uuid, NULL::uuid, NULL::text, 8.00::numeric),
  ('852', 'SUNDAE KASKIN', NULL::uuid, NULL::uuid, NULL::text, 5.50::numeric),
  ('7896549404002', 'SUNDAE MORANGO', NULL::uuid, NULL::uuid, NULL::text, 8.00::numeric),
  ('7894904691005', 'TEKITOS TRADICIONAL 1KG SEARA', NULL::uuid, NULL::uuid, NULL::text, 24.56::numeric),
  ('7894904500116', 'TEKITOS TRADICIONAL SEARA 300gr', NULL::uuid, NULL::uuid, NULL::text, 10.50::numeric),
  ('7894904500383', 'TEXAS BURGER SEARA 56gr', NULL::uuid, NULL::uuid, NULL::text, 1.50::numeric),
  ('7894904687992', 'TEXAS BURGER SEARA 90gr', NULL::uuid, NULL::uuid, NULL::text, 2.40::numeric),
  ('7809625206483', 'TORO NEGRO ROSE', NULL::uuid, NULL::uuid, NULL::text, 23.00::numeric),
  ('7898067340008', 'TORRESMO SANTA MASSA 40gr', NULL::uuid, NULL::uuid, NULL::text, 6.85::numeric),
  ('7898067340213', 'TORRESMO SANTA MASSA 80gr', NULL::uuid, NULL::uuid, NULL::text, 13.25::numeric),
  ('7891515646455', 'TOSCANABURGER C/ BACON PERDIGÃO', NULL::uuid, NULL::uuid, NULL::text, 6.50::numeric),
  ('7622210592750', 'TRAKINAS CHOCOLATE', NULL::uuid, NULL::uuid, NULL::text, 4.00::numeric),
  ('7622210592637', 'TRAKINAS MORANGO', NULL::uuid, NULL::uuid, NULL::text, 4.00::numeric),
  ('798', 'TRENTO ESPECIAL AVELÃ', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 3.50::numeric),
  ('799', 'TRENTO ESPECIAL BRANCO AVELA', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 3.50::numeric),
  ('800', 'TRENTO MORANGO', '82a39a2d-3d76-446f-a21e-55372b27badc'::uuid, NULL::uuid, NULL::text, 3.50::numeric),
  ('7896306626227', 'TRENTO SPECIALE BRANCO C/AMENDOIN', NULL::uuid, NULL::uuid, NULL::text, 3.50::numeric),
  ('847', 'VASILHAME COCA COLA 1L (VIDRO)', NULL::uuid, NULL::uuid, NULL::text, 3.50::numeric),
  ('679', 'VINHO DO AMOR', '6985eeae-f7d1-41a8-82b4-f51a0eda208f'::uuid, NULL::uuid, NULL::text, 26.00::numeric),
  ('673', 'VINHO RANDON 4,5 L SUAVE', '6985eeae-f7d1-41a8-82b4-f51a0eda208f'::uuid, NULL::uuid, NULL::text, 55.25::numeric),
  ('674', 'VINHO RANDON 4,5L SECO', '6985eeae-f7d1-41a8-82b4-f51a0eda208f'::uuid, NULL::uuid, NULL::text, 55.25::numeric),
  ('678', 'VINHO TORO NEGRO', '6985eeae-f7d1-41a8-82b4-f51a0eda208f'::uuid, NULL::uuid, NULL::text, 26.00::numeric),
  ('7896756805265', 'VINTAGE MOSCATEL ESPUMANTE', NULL::uuid, NULL::uuid, NULL::text, 23.30::numeric),
  ('7896756805593', 'VINTAGE MOSCATEL ROSE', NULL::uuid, NULL::uuid, NULL::text, 23.30::numeric),
  ('7896756805272', 'VINTAGE SPOKLING VIRE', NULL::uuid, NULL::uuid, NULL::text, 23.30::numeric),
  ('7896756805449', 'VINTAGE SPORK WIRE', NULL::uuid, NULL::uuid, NULL::text, 23.30::numeric),
  ('677', 'XEQUE MATE', '743da3bd-a2d0-4c80-8da2-2ea56e838df0'::uuid, NULL::uuid, NULL::text, 13.65::numeric),
  ('837', 'YPIOCA 150 ANOS 700ML', '743da3bd-a2d0-4c80-8da2-2ea56e838df0'::uuid, NULL::uuid, NULL::text, 68.00::numeric),
  ('836', 'YPIOCA 160 ANOS 700ML', '743da3bd-a2d0-4c80-8da2-2ea56e838df0'::uuid, NULL::uuid, NULL::text, 80.00::numeric),
  ('7896383700704', 'YPIOCA RESERVA', NULL::uuid, NULL::uuid, NULL::text, 61.00::numeric);

CREATE TEMP TABLE je7_bloqueados (codigo text PRIMARY KEY) ON COMMIT DROP;
INSERT INTO je7_bloqueados SELECT unnest(ARRAY['040232898655','081128025885','082184008751','10','120','15','184','219','261','293','362','374','389','390','391','392','393','394','395','396','397','398','399','400','401','402','403','404','405','406','407','408','409','410','411','412','413','414','415','416','417','418','419','420','421','422','423','424','425','426','427','428','429','430','431','432','433','434','435','436','437','438','439','440','441','442','443','444','452','47','48','481','510','515','519','553','566','59','590','591','592','594','615','645','646','647','648','649','650','651','652','653','654','655','656','657','658','659','660','661','662','680','681','683','684','688','689','690','736','737','739','742832138796','742832138802','744','752','753','757','76','767','77','78','783','784','785','78935662','78936683','78939202','78946606','78947795','78948037','78948136','7896045506040','7897963400281','7898422676766','7898726150023','7898726150030','7898976781039','798190258546','827','851','857']::text[]);

-- ----------------------------------------------------------------------------
-- 3. VALIDAÇÃO DOS DADOS A INSERIR (antes de gravar qualquer coisa)
-- ----------------------------------------------------------------------------
DO $$
DECLARE n int; lista text;
BEGIN
  SELECT count(*) INTO n FROM je7_novos;
  IF n <> 390 THEN RAISE EXCEPTION 'ABORTADO: lista deveria ter 390 produtos, tem %', n; END IF;
  SELECT count(DISTINCT legacy_id) INTO n FROM je7_novos;
  IF n <> 390 THEN RAISE EXCEPTION 'ABORTADO: códigos repetidos na lista (% únicos)', n; END IF;
  SELECT count(*) INTO n FROM je7_novos WHERE category_id IS NULL;
  IF n <> 231 THEN RAISE EXCEPTION 'ABORTADO: esperado 231 sem categoria, encontrado %', n; END IF;
  SELECT count(*) INTO n FROM je7_novos WHERE brand_id IS NULL;
  IF n <> 371 THEN RAISE EXCEPTION 'ABORTADO: esperado 371 sem marca, encontrado %', n; END IF;

  -- nenhum produto bloqueado (revisão manual / possível duplicidade) na lista
  SELECT string_agg(n2.legacy_id, ', ') INTO lista FROM je7_novos n2 JOIN je7_bloqueados b ON b.codigo = n2.legacy_id;
  IF lista IS NOT NULL THEN RAISE EXCEPTION 'ABORTADO: produtos bloqueados na lista: %', lista; END IF;

  -- CONFLITO: legacy_id já existe no banco com outro produto (nome diferente)
  SELECT string_agg(format('%s (site: "%s" / ERP: "%s")', p.legacy_id, p.name, n2.name), '; ') INTO lista
  FROM je7_novos n2 JOIN public.products p ON p.legacy_id = n2.legacy_id
  WHERE upper(btrim(p.name)) <> upper(btrim(n2.name));
  IF lista IS NOT NULL THEN RAISE EXCEPTION 'ABORTADO — conflito de legacy_id: %', lista; END IF;

  -- CONFLITO: código do ERP com zeros à esquerda / sem padding já usado por outro produto
  SELECT string_agg(format('%s x %s', n2.legacy_id, p.legacy_id), '; ') INTO lista
  FROM je7_novos n2 JOIN public.products p
    ON p.legacy_id <> n2.legacy_id AND p.legacy_id ~ '^[0-9]+$' AND n2.legacy_id ~ '^[0-9]+$'
   AND ltrim(p.legacy_id, '0') = ltrim(n2.legacy_id, '0');
  IF lista IS NOT NULL THEN RAISE EXCEPTION 'ABORTADO — código equivalente já usado: %', lista; END IF;

  -- POSSÍVEL DUPLICIDADE: mesmo nome de produto existente com outro legacy_id
  SELECT string_agg(format('%s "%s" = site %s', n2.legacy_id, n2.name, p.legacy_id), '; ') INTO lista
  FROM je7_novos n2 JOIN public.products p
    ON upper(btrim(p.name)) = upper(btrim(n2.name)) AND p.legacy_id IS DISTINCT FROM n2.legacy_id;
  IF lista IS NOT NULL THEN RAISE EXCEPTION 'ABORTADO — nome já cadastrado com outro código: %', lista; END IF;

  -- categorias e marcas referenciadas existem
  SELECT count(*) INTO n FROM je7_novos n2 WHERE category_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.categories c WHERE c.id = n2.category_id);
  IF n > 0 THEN RAISE EXCEPTION 'ABORTADO: % category_id inexistentes', n; END IF;
  SELECT count(*) INTO n FROM je7_novos n2 WHERE brand_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.brands b WHERE b.id = n2.brand_id);
  IF n > 0 THEN RAISE EXCEPTION 'ABORTADO: % brand_id inexistentes', n; END IF;

  -- produto importado em execução anterior sem registro de atacado = associação inconsistente
  SELECT string_agg(p.legacy_id, ', ') INTO lista FROM public.products p JOIN je7_novos n2 ON n2.legacy_id = p.legacy_id
  WHERE NOT EXISTS (SELECT 1 FROM public.product_wholesale w WHERE w.product_id = p.id);
  IF lista IS NOT NULL THEN RAISE EXCEPTION 'ABORTADO: produtos já existentes sem product_wholesale: %', lista; END IF;

  RAISE NOTICE 'Pré-validação OK: % na lista, % já existiam (serão pulados), % serão inseridos',
    390, (SELECT count(*) FROM je7_novos n2 JOIN public.products p USING (legacy_id)),
    (SELECT count(*) FROM je7_novos n2 WHERE NOT EXISTS (SELECT 1 FROM public.products p WHERE p.legacy_id = n2.legacy_id));
END $$;

-- ----------------------------------------------------------------------------
-- 4. FOTOGRAFIA DO ESTADO ATUAL (para provar que nada existente mudou)
-- ----------------------------------------------------------------------------
CREATE TEMP TABLE je7_snap_products  ON COMMIT DROP AS SELECT * FROM public.products;
CREATE TEMP TABLE je7_snap_wholesale ON COMMIT DROP AS SELECT * FROM public.product_wholesale;
CREATE TEMP TABLE je7_snap_images_n  ON COMMIT DROP AS SELECT count(*) AS qtd FROM public.product_images;
CREATE TEMP TABLE je7_inseridos (id uuid PRIMARY KEY, legacy_id text UNIQUE) ON COMMIT DROP;

-- ----------------------------------------------------------------------------
-- 5. INSERÇÃO: products + product_wholesale com o UUID retornado pelo próprio INSERT
-- ----------------------------------------------------------------------------
WITH ins AS (
  INSERT INTO public.products
    (legacy_id, name, category_id, brand_id, volume, retail_price, promotion_price,
     is_promotion, is_featured, is_new, is_best_seller, active, created_at, updated_at)
  SELECT n2.legacy_id, n2.name, n2.category_id, n2.brand_id, n2.volume, n2.retail_price, NULL,
         false, false, false, false, true, now(), now()
  FROM je7_novos n2
  WHERE NOT EXISTS (SELECT 1 FROM public.products p WHERE p.legacy_id = n2.legacy_id)
  ORDER BY n2.legacy_id
  RETURNING id, legacy_id
), reg AS (
  INSERT INTO je7_inseridos (id, legacy_id) SELECT id, legacy_id FROM ins RETURNING id
)
INSERT INTO public.product_wholesale (product_id, wholesale_price)
SELECT id, NULL::numeric FROM reg
ON CONFLICT (product_id) DO NOTHING;   -- nunca sobrescreve preço de atacado existente

-- ----------------------------------------------------------------------------
-- 6. VALIDAÇÃO ANTES DO COMMIT (qualquer falha desfaz tudo)
-- ----------------------------------------------------------------------------
DO $$
DECLARE n int; ins int; antes int; lista text;
BEGIN
  SELECT count(*) INTO ins FROM je7_inseridos;
  SELECT count(*) INTO antes FROM je7_snap_products;

  -- todos os 390 códigos existem agora, cada um uma única vez
  SELECT count(*) INTO n FROM public.products p JOIN je7_novos n2 USING (legacy_id);
  IF n <> 390 THEN RAISE EXCEPTION 'ABORTADO: esperados 390 produtos da lista no banco, encontrados %', n; END IF;
  SELECT count(*) INTO n FROM (SELECT legacy_id FROM public.products WHERE legacy_id IS NOT NULL GROUP BY 1 HAVING count(*) > 1) d;
  IF n > 0 THEN RAISE EXCEPTION 'ABORTADO: % legacy_id duplicados', n; END IF;

  -- total = antes + inseridos agora
  SELECT count(*) INTO n FROM public.products;
  IF n <> antes + ins THEN RAISE EXCEPTION 'ABORTADO: total % <> % + %', n, antes, ins; END IF;

  -- os inseridos estão corretos (ativos, sem promoção, flags falsas, dados = lista)
  SELECT count(*) INTO n FROM je7_inseridos i JOIN public.products p ON p.id = i.id JOIN je7_novos n2 ON n2.legacy_id = p.legacy_id
  WHERE p.active AND NOT p.is_promotion AND NOT p.is_featured AND NOT p.is_new AND NOT p.is_best_seller
    AND p.promotion_price IS NULL AND p.name = n2.name AND p.retail_price = n2.retail_price
    AND p.category_id IS NOT DISTINCT FROM n2.category_id AND p.brand_id IS NOT DISTINCT FROM n2.brand_id
    AND p.volume IS NOT DISTINCT FROM n2.volume;
  IF n <> ins THEN RAISE EXCEPTION 'ABORTADO: % de % inseridos com dados divergentes', ins - n, ins; END IF;

  -- cada inserido tem exatamente 1 registro de atacado, com preço NULL
  SELECT count(*) INTO n FROM je7_inseridos i JOIN public.product_wholesale w ON w.product_id = i.id WHERE w.wholesale_price IS NULL;
  IF n <> ins THEN RAISE EXCEPTION 'ABORTADO: % de % novos sem product_wholesale NULL (trigger preenchendo preço?)', ins - n, ins; END IF;
  -- todos os 390 da lista têm registro de atacado (inclusive os de execução anterior)
  SELECT count(*) INTO n FROM public.products p JOIN je7_novos n2 USING (legacy_id) JOIN public.product_wholesale w ON w.product_id = p.id;
  IF n <> 390 THEN RAISE EXCEPTION 'ABORTADO: só % de 390 produtos da lista têm product_wholesale', n; END IF;

  -- nenhum produto pré-existente foi alterado (comparação linha a linha de TODAS as colunas)
  SELECT count(*) INTO n FROM (SELECT * FROM je7_snap_products EXCEPT SELECT * FROM public.products) d;
  IF n > 0 THEN RAISE EXCEPTION 'ABORTADO: % produtos pré-existentes foram alterados', n; END IF;
  -- nenhum registro de atacado pré-existente foi alterado
  SELECT count(*) INTO n FROM (SELECT * FROM je7_snap_wholesale EXCEPT SELECT * FROM public.product_wholesale) d;
  IF n > 0 THEN RAISE EXCEPTION 'ABORTADO: % registros de atacado pré-existentes foram alterados', n; END IF;
  -- atacado: só entraram registros dos novos
  SELECT count(*) INTO n FROM public.product_wholesale;
  IF n <> (SELECT count(*) FROM je7_snap_wholesale) + ins THEN RAISE EXCEPTION 'ABORTADO: product_wholesale cresceu além dos novos'; END IF;
  -- sem órfãos
  SELECT count(*) INTO n FROM public.product_wholesale w WHERE NOT EXISTS (SELECT 1 FROM public.products p WHERE p.id = w.product_id);
  IF n > 0 THEN RAISE EXCEPTION 'ABORTADO: % registros órfãos em product_wholesale', n; END IF;
  -- imagens intactas
  IF (SELECT count(*) FROM public.product_images) <> (SELECT qtd FROM je7_snap_images_n) THEN
    RAISE EXCEPTION 'ABORTADO: quantidade de imagens mudou';
  END IF;

  RAISE NOTICE 'IMPORTAÇÃO OK — inseridos agora: % | total produtos: % | ativos: % | inativos: % | product_wholesale: %',
    ins, (SELECT count(*) FROM public.products), (SELECT count(*) FROM public.products WHERE active),
    (SELECT count(*) FROM public.products WHERE NOT active), (SELECT count(*) FROM public.product_wholesale);
END $$;

COMMIT;
