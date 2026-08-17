/* ============================================================
   SUPABASE — acesso ao catálogo público (somente leitura, anon)
   Paginação real (.range + count), busca/filtros server-side,
   imagens via Storage. NÃO usa service_role. Não altera RLS.
   ============================================================ */
const _sbConfigured = !!(CONFIG.supabaseUrl && CONFIG.supabaseAnonKey
  && !CONFIG.supabaseUrl.includes("SEU-PROJETO")
  && !CONFIG.supabaseAnonKey.includes("SUA_CHAVE"));
const _sb = (_sbConfigured && window.supabase)
  ? window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey)
  : null;
function sbReady(){ return !!_sb; }

/* seleção com relacionamentos + imagens */
const SB_SEL = "id,name,volume,category_id,brand_id,retail_price,wholesale_price,promotion_price,is_promotion,is_featured,is_new,is_best_seller,brands(name),categories(name),product_images(storage_path,is_primary,sort_order)";

function imgPublicUrl(path){ if(!path||!_sb) return null; return _sb.storage.from(CONFIG.bucket).getPublicUrl(path).data.publicUrl; }
function primaryImg(imgs){
  if(!imgs||!imgs.length) return null;
  const p = imgs.find(x=>x.is_primary) || imgs.slice().sort((a,b)=>(a.sort_order||0)-(b.sort_order||0))[0];
  return imgPublicUrl(p.storage_path);
}
/* adapta o registro do Supabase para o formato que o frontend já usa */
function adapt(row){
  return {
    id: row.id,
    n: row.name || "",
    v: row.volume || "",
    b: row.brands ? row.brands.name : "",
    c: row.categories ? row.categories.name : "",
    catId: row.category_id, brandId: row.brand_id,
    vu: +row.retail_price || 0,
    au: row.wholesale_price==null ? null : +row.wholesale_price,
    promo: !!row.is_promotion,
    pp: row.promotion_price!=null ? +row.promotion_price : null,
    f: !!row.is_featured, nv: !!row.is_new, bs: !!row.is_best_seller,
    imgUrl: primaryImg(row.product_images)
  };
}

async function sbCategories(){
  const {data,error}=await _sb.from("categories").select("id,name,icon,sort_order").eq("active",true).order("sort_order",{ascending:true});
  if(error) throw error; return data||[];
}
async function sbBrands(){
  const {data,error}=await _sb.from("brands").select("id,name").eq("active",true).order("name",{ascending:true});
  if(error) throw error; return data||[];
}
/* resolve termos de busca para ids de marca/categoria (busca por nome também) */
async function resolveSearch(q){
  const like="%"+q+"%";
  const [b,c]=await Promise.all([
    _sb.from("brands").select("id").eq("active",true).ilike("name",like),
    _sb.from("categories").select("id").eq("active",true).ilike("name",like)
  ]);
  return { brandIds:(b.data||[]).map(x=>x.id), catIds:(c.data||[]).map(x=>x.id) };
}
function applySort(query,sort){
  if(sort==="asc") return query.order("wholesale_price",{ascending:true});
  if(sort==="desc") return query.order("wholesale_price",{ascending:false});
  return query.order("is_best_seller",{ascending:false}).order("name",{ascending:true});
}
/* consulta principal paginada */
async function sbProducts(o){
  o=o||{};
  const perPage=o.perPage||CONFIG.perPage||24, page=o.page||0;
  let query=_sb.from("products").select(SB_SEL,{count:"exact"}).eq("active",true);
  if(o.catId)   query=query.eq("category_id",o.catId);
  if(o.brandId) query=query.eq("brand_id",o.brandId);
  if(o.special==="promo") query=query.eq("is_promotion",true);
  else if(o.special==="bs") query=query.eq("is_best_seller",true);
  else if(o.special==="nv") query=query.eq("is_new",true);
  else if(o.special==="f")  query=query.eq("is_featured",true);
  if(o.price){ const [a,z]=o.price.split("-").map(Number); query=query.gte("wholesale_price",a).lte("wholesale_price",z); }
  if(o.q){
    const {brandIds,catIds}=await resolveSearch(o.q);
    const ors=["name.ilike.%"+o.q+"%"];
    if(brandIds.length) ors.push("brand_id.in.("+brandIds.join(",")+")");
    if(catIds.length)  ors.push("category_id.in.("+catIds.join(",")+")");
    query=query.or(ors.join(","));
  }
  query=applySort(query,o.sort||"rel");
  const from=page*perPage, to=from+perPage-1;
  query=query.range(from,to);
  const {data,error,count}=await query;
  if(error) throw error;
  return { items:(data||[]).map(adapt), total:count||0 };
}
/* seções de destaque (limite pequeno, só flags reais) */
async function sbHighlights(kind,limit){
  limit=limit||6;
  const col={promo:"is_promotion",bs:"is_best_seller",nv:"is_new",f:"is_featured"}[kind];
  const {data,error}=await _sb.from("products").select(SB_SEL).eq("active",true).eq(col,true).order("name").limit(limit);
  if(error) throw error; return (data||[]).map(adapt);
}
async function sbById(id){
  const {data,error}=await _sb.from("products").select(SB_SEL).eq("id",id).eq("active",true).maybeSingle();
  if(error) throw error; return data?adapt(data):null;
}
async function sbByIds(ids){
  if(!ids||!ids.length) return [];
  const {data,error}=await _sb.from("products").select(SB_SEL).eq("active",true).in("id",ids);
  if(error) throw error; return (data||[]).map(adapt);
}
async function sbRelated(p,limit){
  limit=limit||3;
  const {data,error}=await _sb.from("products").select(SB_SEL).eq("active",true).eq("category_id",p.catId).neq("id",p.id).limit(limit);
  if(error) throw error; return (data||[]).map(adapt);
}
