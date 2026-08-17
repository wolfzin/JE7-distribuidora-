/* ============================================================
   ADMIN — Camada de dados (Supabase autenticado)
   Produtos, categorias, marcas e imagens usam o cliente autenticado.
   Produtos permitem INSERT/UPDATE; não existe DELETE de products.
   Imagens usam public.product_images + Storage "product-images".
   O catálogo público permanece intocado nesta etapa.
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
    vu: null, // retail_price nao e lido pelo Admin (catalogo atacado)
    au: row.wholesale_price == null ? null : +row.wholesale_price,
    pp: row.promotion_price == null ? null : +row.promotion_price,
    promo: !!row.is_promotion,
    f:  !!row.is_featured,
    bs: !!row.is_best_seller,
    nv: !!row.is_new,
    active: !!row.active,
    img: null   // imagem ainda não migrada (Storage é etapa futura)
  };
}

/* ============================================================
   ADMIN — PRODUTOS + IMAGENS (leitura/escrita autenticada)
   As imagens ficam no Storage bucket "product-images" e a relação
   fica em public.product_images.
   ============================================================ */
const ADMIN_IMG_SEL = "id,product_id,storage_path,is_primary,sort_order";
const ADMIN_IMAGE_BUCKET = "product-images";

function adminPublicImageUrl(path){
  if(!path) return null;
  const sb = window.sbAdmin;
  if(!sb) return null;
  const r = sb.storage.from(ADMIN_IMAGE_BUCKET).getPublicUrl(path);
  return r?.data?.publicUrl || null;
}

async function adminLoadProductImages(){
  const sb = window.sbAdmin;
  if(!sb) throw new Error("Cliente Supabase do admin indisponível.");
  const { data, error } = await sb.from("product_images")
    .select(ADMIN_IMG_SEL)
    .order("is_primary", { ascending:false })
    .order("sort_order", { ascending:true });
  if(error) throw error;

  const map = {};
  for(const row of (data || [])){
    if(!map[row.product_id]) map[row.product_id] = row;
  }
  return map;
}

function adaptAdminRow(row, imageMap){
  const im = imageMap?.[row.id] || null;
  return {
    id: row.id,
    legacy_id: row.legacy_id,
    n: row.name || "",
    v: row.volume || "",
    b: row.brands ? row.brands.name : "",
    c: row.categories ? row.categories.name : "",
    category_id: row.category_id,
    brand_id: row.brand_id,
    vu: null, // retail_price nao e lido pelo Admin (catalogo atacado)
    au: row.wholesale_price == null ? null : +row.wholesale_price,
    pp: row.promotion_price == null ? null : +row.promotion_price,
    promo: !!row.is_promotion,
    f:  !!row.is_featured,
    bs: !!row.is_best_seller,
    nv: !!row.is_new,
    active: !!row.active,
    img: im ? adminPublicImageUrl(im.storage_path) : null,
    image_id: im?.id || null,
    image_path: im?.storage_path || null
  };
}

/* Busca TODOS os produtos (ativos + inativos) e sua imagem principal. */
async function adminLoadProducts(){
  const sb = window.sbAdmin;
  if(!sb) throw new Error("Cliente Supabase do admin indisponível (verifique login/configuração).");
  const [{ data, error }, imageMap] = await Promise.all([
    sb.from("products")
      .select(ADMIN_PROD_SEL)
      .order("name", { ascending: true }),
    adminLoadProductImages()
  ]);
  if(error) throw error;
  return (data || []).map(row => adaptAdminRow(row, imageMap));
}

/* Escrita autenticada de produtos. */
async function adminCreateProduct(payload){
  const sb = window.sbAdmin;
  if(!sb) throw new Error("Cliente Supabase do admin indisponível.");
  const { data, error } = await sb.from("products").insert(payload).select(ADMIN_PROD_SEL).single();
  if(error) throw error;
  return adaptAdminRow(data, {});
}

async function adminUpdateProduct(id, patch){
  const sb = window.sbAdmin;
  if(!sb) throw new Error("Cliente Supabase do admin indisponível.");
  const { data, error } = await sb.from("products").update(patch).eq("id", id).select(ADMIN_PROD_SEL);
  if(error) throw error;
  return (data && data.length) ? adaptAdminRow(data[0], {}) : null;
}

/* ---------- IMAGENS DE PRODUTO ---------- */
function adminValidateImage(file){
  if(!file) return "Selecione uma imagem.";
  const allowed = ["image/jpeg","image/png","image/webp"];
  if(!allowed.includes(file.type)) return "Formato inválido. Use JPG, PNG ou WEBP.";
  if(file.size > 8 * 1024 * 1024) return "A imagem deve ter no máximo 8 MB.";
  return null;
}

async function adminUploadProductImage(productId, file){
  const sb = window.sbAdmin;
  if(!sb) throw new Error("Cliente Supabase do admin indisponível.");
  const validation = adminValidateImage(file);
  if(validation) throw new Error(validation);

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `products/${productId}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;

  const up = await sb.storage.from(ADMIN_IMAGE_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false
  });
  if(up.error) throw up.error;

  try{
    /* Só uma imagem principal por produto. */
    const { error: demoteError } = await sb.from("product_images")
      .update({ is_primary:false })
      .eq("product_id", productId);
    if(demoteError) throw demoteError;

    const { data, error } = await sb.from("product_images")
      .insert({
        product_id: productId,
        storage_path: path,
        is_primary: true,
        sort_order: 0
      })
      .select(ADMIN_IMG_SEL)
      .single();
    if(error) throw error;
    return { ...data, publicUrl: adminPublicImageUrl(path) };
  }catch(e){
    /* Evita deixar arquivo órfão se a relação não puder ser criada. */
    await sb.storage.from(ADMIN_IMAGE_BUCKET).remove([path]).catch(()=>{});
    throw e;
  }
}

async function adminDeleteProductImage(imageId, storagePath){
  const sb = window.sbAdmin;
  if(!sb) throw new Error("Cliente Supabase do admin indisponível.");

  const { data, error } = await sb.from("product_images")
    .delete()
    .eq("id", imageId)
    .select(ADMIN_IMG_SEL);
  if(error) throw error;
  if(!data?.length) return false;

  if(storagePath){
    const rm = await sb.storage.from(ADMIN_IMAGE_BUCKET).remove([storagePath]);
    if(rm.error) console.warn("Imagem removida do banco, mas não do Storage:", rm.error);
  }
  return true;
}

/* Remove a imagem principal atual de um produto. */
async function adminDeleteProductImageByProduct(productId){
  const sb = window.sbAdmin;
  if(!sb) throw new Error("Cliente Supabase do admin indisponível.");
  const { data, error } = await sb.from("product_images")
    .select(ADMIN_IMG_SEL)
    .eq("product_id", productId)
    .order("is_primary", { ascending:false })
    .order("sort_order", { ascending:true });
  if(error) throw error;
  const first = data?.[0];
  if(!first) return false;
  return adminDeleteProductImage(first.id, first.storage_path);
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


/* ============================================================
   ADMIN — MARCAS (leitura + escrita autenticada)
   Etapa Marcas. Gerencia somente name e active.
   Não há DELETE de marcas nesta etapa.
   ============================================================ */
const ADMIN_BRAND_SEL = "id,name,active";

async function adminLoadBrands(){
  const sb = window.sbAdmin;
  if(!sb) throw new Error("Cliente Supabase do admin indisponível (verifique login).");
  const { data, error } = await sb
    .from("brands")
    .select(ADMIN_BRAND_SEL)
    .order("name", { ascending: true });
  if(error) throw error;
  return data || [];
}

async function adminCreateBrand(payload){
  const sb = window.sbAdmin;
  if(!sb) throw new Error("Cliente Supabase do admin indisponível.");
  const { data, error } = await sb.from("brands").insert(payload).select().single();
  if(error) throw error;
  return data;
}

async function adminUpdateBrand(id, patch){
  const sb = window.sbAdmin;
  if(!sb) throw new Error("Cliente Supabase do admin indisponível.");
  const { data, error } = await sb.from("brands").update(patch).eq("id", id).select();
  if(error) throw error;
  return (data && data.length) ? data[0] : null;
}
