/* ============================================================
   ADMIN — Camada de LEITURA (Supabase autenticado)
   Etapa atual: SOMENTE leitura de produtos.
   - Usa o cliente autenticado exposto por admin-auth.js (window.sbAdmin).
   - Lê public.products (ativos E inativos) com JOIN de nomes de
     categoria/marca para exibição, mantendo os UUIDs no objeto.
   - NÃO seleciona/usa retail_price. NÃO escreve nada (sem INSERT/UPDATE/DELETE).
   - Imagens NÃO migradas nesta etapa (img fica null; thumb usa fallback).
   ============================================================ */

// colunas mínimas p/ exibição do admin — repare: SEM retail_price
const ADMIN_PROD_SEL =
  "id,legacy_id,name,volume,category_id,brand_id,wholesale_price,promotion_price," +
  "is_promotion,is_featured,is_new,is_best_seller,active," +
  "brands(name),categories(name)";

/* Converte a linha do banco para o modelo compacto que o admin.js já consome,
   preservando os UUIDs (id, category_id, brand_id) e o legacy_id. */
function adaptAdminRow(row){
  return {
    id: row.id,                 // UUID real (interno)
    legacy_id: row.legacy_id,   // código legado (exibível)
    n: row.name || "",
    v: row.volume || "",
    b: row.brands ? row.brands.name : "",         // nome da marca (via JOIN)
    c: row.categories ? row.categories.name : "", // nome da categoria (via JOIN)
    category_id: row.category_id,                 // UUID interno
    brand_id: row.brand_id,                       // UUID interno
    au: row.wholesale_price == null ? null : +row.wholesale_price,  // ATACADO = preço do admin
    pp: row.promotion_price == null ? null : +row.promotion_price,
    promo: !!row.is_promotion,
    f:  !!row.is_featured,
    bs: !!row.is_best_seller,
    nv: !!row.is_new,
    active: !!row.active,
    img: null   // imagem ainda não migrada (Storage é etapa futura)
  };
}

/* Busca TODOS os produtos (ativos + inativos) numa única consulta.
   Lança erro para o chamador tratar (mensagem + retry). */
async function adminLoadProducts(){
  const sb = window.sbAdmin;
  if(!sb) throw new Error("Cliente Supabase do admin indisponível (verifique login/configuração).");
  const { data, error } = await sb
    .from("products")
    .select(ADMIN_PROD_SEL)      // sem filtro de active -> traz ativos e inativos
    .order("name", { ascending: true });
  if(error) throw error;
  return (data || []).map(adaptAdminRow);
}

/* ============================================================
   ADMIN — CATEGORIAS (leitura + escrita autenticada)
   Etapa Categorias. Gerencia name, sort_order e active.
   NÃO gerencia cor (cor vem do theme.js por nome).
   Exclusão é permitida pelo RLS só quando não há produto vinculado
   (categories_delete_auth_empty): DELETE bloqueado retorna 0 linhas.
   ============================================================ */
const ADMIN_CAT_SEL = "id,name,sort_order,active";

async function adminLoadCategories(){
  const sb = window.sbAdmin;
  if(!sb) throw new Error("Cliente Supabase do admin indisponível (verifique login).");
  const { data, error } = await sb.from("categories").select(ADMIN_CAT_SEL).order("sort_order", { ascending: true });
  if(error) throw error;
  return data || [];
}

/* contagem de produtos por category_id (para exibir e decidir exclusão) */
async function adminCategoryCounts(){
  const sb = window.sbAdmin;
  if(!sb) throw new Error("Cliente Supabase do admin indisponível.");
  const { data, error } = await sb.from("products").select("category_id");
  if(error) throw error;
  const m = {};
  (data || []).forEach(r => { if(r.category_id) m[r.category_id] = (m[r.category_id] || 0) + 1; });
  return m;
}

async function adminCreateCategory(payload){
  const sb = window.sbAdmin;
  if(!sb) throw new Error("Cliente Supabase do admin indisponível.");
  const { data, error } = await sb.from("categories").insert(payload).select().single();
  if(error) throw error;
  return data;
}

/* retorna a linha atualizada, ou null se 0 linhas (bloqueado/inexistente) */
async function adminUpdateCategory(id, patch){
  const sb = window.sbAdmin;
  if(!sb) throw new Error("Cliente Supabase do admin indisponível.");
  const { data, error } = await sb.from("categories").update(patch).eq("id", id).select();
  if(error) throw error;
  return (data && data.length) ? data[0] : null;
}

/* { ok, blocked, error } — blocked=true quando o RLS impede (produtos vinculados) */
async function adminDeleteCategory(id){
  const sb = window.sbAdmin;
  if(!sb) return { ok:false, blocked:false, error:new Error("Cliente Supabase indisponível.") };
  const { data, error } = await sb.from("categories").delete().eq("id", id).select();
  if(error) return { ok:false, blocked:false, error };
  const n = (data || []).length;
  return { ok: n>0, blocked: n===0, error:null };
}
