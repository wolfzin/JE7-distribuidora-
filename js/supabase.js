/* ============================================================
   SUPABASE — catálogo público JE7 (somente ATACADO)

   O catálogo público consulta exclusivamente a view public_catalog.
   Essa view expõe apenas produtos ativos e campos seguros, incluindo
   wholesale_price, sem expor retail_price/promotion_price.

   Categorias e marcas continuam sendo consultadas diretamente com
   filtro active=true. Nunca usar service_role no navegador.
   ============================================================ */
const _sbConfigured = !!(CONFIG.supabaseUrl && CONFIG.supabaseAnonKey
  && !CONFIG.supabaseUrl.includes("SEU-PROJETO")
  && !CONFIG.supabaseAnonKey.includes("SUA_CHAVE"));
const _sb = (_sbConfigured && window.supabase)
  ? window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey)
  : null;
function sbReady(){ return !!_sb; }
window.jeSb = _sb;

const CATALOG_VIEW = "public_catalog";
const WHOLESALE_COL = "wholesale_price";
const RETAIL_ON = false; // Esta versão é exclusivamente atacado.

/* A view já entrega o preço de atacado junto com cada produto. */
async function sbWholesale(ids){
  if(!_sb || !ids || !ids.length) return {};
  const {data,error} = await _sb.from(CATALOG_VIEW)
    .select("id,"+WHOLESALE_COL)
    .in("id",ids);
  if(error) throw error;
  const map = {};
  (data||[]).forEach(row => {
    map[row.id] = row[WHOLESALE_COL] == null ? null : +row[WHOLESALE_COL];
  });
  return map;
}

/* Campos da view. Nenhum campo de varejo é solicitado ao Supabase. */
const SB_SEL = [
  "id", "name", "volume", "category_id", "brand_id",
  "is_promotion", "is_featured", "is_new", "is_best_seller",
  "brand_name", "category_name", "primary_image_path", WHOLESALE_COL
].join(",");

function imgPublicUrl(path){
  if(!path || !_sb) return null;
  return _sb.storage.from(CONFIG.bucket).getPublicUrl(path).data.publicUrl;
}
function adapt(row){
  return {
    id: row.id,
    n: row.name || "",
    v: row.volume || "",
    b: row.brand_name || "",
    c: row.category_name || "",
    catId: row.category_id,
    brandId: row.brand_id,
    vu: null,
    au: row[WHOLESALE_COL] == null ? null : +row[WHOLESALE_COL],
    promo: !!row.is_promotion,
    pp: null,
    f: !!row.is_featured,
    nv: !!row.is_new,
    bs: !!row.is_best_seller,
    imgUrl: imgPublicUrl(row.primary_image_path)
  };
}

async function sbCategories(){
  const {data,error} = await _sb.from("categories")
    .select("id,name,icon,sort_order")
    .eq("active",true)
    .order("sort_order",{ascending:true});
  if(error) throw error;
  return data||[];
}
async function sbBrands(){
  const {data,error} = await _sb.from("brands")
    .select("id,name")
    .eq("active",true)
    .order("name",{ascending:true});
  if(error) throw error;
  return data||[];
}
async function resolveSearch(q){
  const like="%"+q+"%";
  const [b,c] = await Promise.all([
    _sb.from("brands").select("id").eq("active",true).ilike("name",like),
    _sb.from("categories").select("id").eq("active",true).ilike("name",like)
  ]);
  if(b.error) throw b.error;
  if(c.error) throw c.error;
  return {
    brandIds:(b.data||[]).map(x=>x.id),
    catIds:(c.data||[]).map(x=>x.id)
  };
}
function applySort(query,sort){
  // Não existe ordenação por preço de varejo nesta versão.
  return query.order("is_best_seller",{ascending:false}).order("name",{ascending:true});
}
async function sbProducts(o){
  o=o||{};
  const perPage=o.perPage||CONFIG.perPage||24, page=o.page||0;
  let query=_sb.from(CATALOG_VIEW).select(SB_SEL,{count:"exact"});
  if(o.catId) query=query.eq("category_id",o.catId);
  if(o.brandId) query=query.eq("brand_id",o.brandId);
  if(o.special==="promo") query=query.eq("is_promotion",true);
  else if(o.special==="bs") query=query.eq("is_best_seller",true);
  else if(o.special==="nv") query=query.eq("is_new",true);
  else if(o.special==="f") query=query.eq("is_featured",true);
  if(o.q){
    const {brandIds,catIds}=await resolveSearch(o.q);
    const ors=["name.ilike.%"+o.q+"%"];
    if(brandIds.length) ors.push("brand_id.in.("+brandIds.join(",")+")");
    if(catIds.length) ors.push("category_id.in.("+catIds.join(",")+")");
    query=query.or(ors.join(","));
  }
  query=applySort(query,o.sort||"rel");
  const from=page*perPage, to=from+perPage-1;
  const {data,error,count}=await query.range(from,to);
  if(error) throw error;
  return {items:(data||[]).map(adapt),total:count||0};
}
async function sbHighlights(kind,limit){
  limit=limit||6;
  const col={promo:"is_promotion",bs:"is_best_seller",nv:"is_new",f:"is_featured"}[kind];
  if(!col) return [];
  const {data,error}=await _sb.from(CATALOG_VIEW).select(SB_SEL)
    .eq(col,true).order("name").limit(limit);
  if(error) throw error;
  return (data||[]).map(adapt);
}
async function sbById(id){
  const {data,error}=await _sb.from(CATALOG_VIEW).select(SB_SEL).eq("id",id).maybeSingle();
  if(error) throw error;
  return data?adapt(data):null;
}
async function sbByIds(ids){
  if(!ids||!ids.length) return [];
  const {data,error}=await _sb.from(CATALOG_VIEW).select(SB_SEL).in("id",ids);
  if(error) throw error;
  return (data||[]).map(adapt);
}
async function sbRelated(p,limit){
  limit=limit||3;
  const {data,error}=await _sb.from(CATALOG_VIEW).select(SB_SEL)
    .eq("category_id",p.catId).neq("id",p.id).limit(limit);
  if(error) throw error;
  return (data||[]).map(adapt);
}
