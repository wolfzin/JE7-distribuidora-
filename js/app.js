/* ============================================================
   PRODUCT ART — silhueta SVG (fallback). BRAND_COLORS e catStyle
   vêm de theme.js. Imagens reais chegam via Supabase Storage (imgUrl).
   ============================================================ */
function shade(hex,p){
  const h=hex.replace("#","");
  const n=parseInt(h.length===3?h.replace(/(.)/g,"$1$1"):h,16);
  let r=(n>>16)&255,g=(n>>8)&255,b=n&255;
  r=Math.round(r+(p<0?r*p:(255-r)*p)); g=Math.round(g+(p<0?g*p:(255-g)*p)); b=Math.round(b+(p<0?b*p:(255-b)*p));
  return `rgb(${r},${g},${b})`;
}
function formOf(p){
  const n=(p.n||"").toLowerCase(), v=(p.v||"").toLowerCase();
  if(p.c==="Salgadinhos") return "bag";
  if(p.c==="Carvão") return "sack";
  if(p.c==="Energéticos") return "can";
  if(p.c==="Água") return v.includes("litros")?"gallon":(v.includes("1500")?"pet":"bottle");
  if(p.c==="Cervejas") return n.includes("lata")?"can":"bottle";
  if(p.c==="Refrigerantes") return n.includes("lata")?"can":((v.includes("2l")||v.includes("1,5"))?"pet":"bottle");
  return "bottle";
}
function svgArt(p){
  const col = BRAND_COLORS[p.b] || shade(catStyle(p.c).tile[1],-0.35);
  const cap = shade(col,-0.35);
  const short = (p.b||"").slice(0,11);
  const shapes = {
    can:`<rect x="33" y="16" width="34" height="88" rx="7" fill="${col}"/><rect x="33" y="16" width="34" height="9" rx="4.5" fill="${cap}"/><rect x="33" y="95" width="34" height="9" rx="4.5" fill="${cap}"/><rect x="35" y="44" width="30" height="32" rx="3" fill="#fff" opacity=".92"/>`,
    bottle:`<rect x="45" y="12" width="10" height="18" rx="2" fill="${cap}"/><path d="M41 30 Q41 40 37 50 L37 98 Q37 104 43 104 L57 104 Q63 104 63 98 L63 50 Q59 40 59 30 Z" fill="${col}"/><rect x="39" y="58" width="22" height="30" rx="3" fill="#fff" opacity=".92"/>`,
    pet:`<rect x="45" y="8" width="10" height="10" rx="1.5" fill="${cap}"/><path d="M42 18 Q42 26 40 32 L40 100 Q40 108 48 108 L52 108 Q60 108 60 100 L60 32 Q58 26 58 18 Z" fill="${col}"/><rect x="41" y="54" width="18" height="34" rx="2" fill="#fff" opacity=".92"/>`,
    gallon:`<rect x="46" y="10" width="8" height="9" fill="${cap}"/><rect x="29" y="22" width="42" height="82" rx="9" fill="${col}"/><rect x="34" y="50" width="32" height="34" rx="3" fill="#fff" opacity=".92"/>`,
    bag:`<path d="M28 22 L72 22 L68 104 L32 104 Z" fill="${col}"/><rect x="28" y="22" width="44" height="8" fill="${cap}"/><rect x="35" y="50" width="30" height="32" rx="3" fill="#fff" opacity=".92"/>`,
    sack:`<path d="M31 30 Q50 22 69 30 L65 104 L35 104 Z" fill="${col}"/><rect x="37" y="52" width="26" height="30" rx="3" fill="#fff" opacity=".88"/>`
  };
  return `<svg class="art" viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">${shapes[formOf(p)]}<text x="50" y="70" text-anchor="middle" font-family="Montserrat,sans-serif" font-weight="800" font-size="6.4" fill="${col}">${short}</text></svg>`;
}
function productArt(p){
  if(p.imgUrl) return `<img class="art" loading="lazy" src="${p.imgUrl}" alt="${p.n}" data-id="${p.id}" onerror="jeImgError(this)">`;
  return svgArt(p);
}
function jeImgError(img){ const p=byId[img.dataset.id]; img.outerHTML = p?svgArt(p):""; }
window.__svgArt = id => { const p=byId[id]; return p?svgArt(p):""; };

/* ============================================================
   STATE + HELPERS (dados via Supabase)
   ============================================================ */
let state = { catId:"", brandId:"", price:"", q:"", special:"", sort:"rel", page:0, total:0,
              cart:{}, favs:new Set(), buyMode:"atacado",
              _cli:"", _fone:"", _empresa:"", _cnpj:"", _obs:"", orderNo:"", orderDate:"" };
const PER = CONFIG.perPage || 24;
let byId = {};            // cache id -> produto adaptado
let cats = [], brands = [];
let hlCache = null;       // destaques (carregados uma vez)
const money = n => "R$ "+(+n||0).toFixed(2).replace(".",",");
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
function cache(list){ (list||[]).forEach(p=>byId[p.id]=p); return list; }
function debounce(fn,ms){ let t; return function(){ const a=arguments; clearTimeout(t); t=setTimeout(()=>fn.apply(null,a),ms); }; }

const CAT_DESC = {
  "Refrigerantes":"Refrigerante gelado na medida certa para o seu ponto de venda",
  "Água":"Água mineral para revenda e consumo do dia a dia",
  "Cervejas":"Cerveja para bares, adegas, mercados e eventos",
  "Destilados":"Destilado selecionado para sua adega ou revenda",
  "Energéticos":"Energético para girar o estoque com boa margem",
  "Salgadinhos":"Salgadinho para complementar as vendas do balcão",
  "Carvão":"Carvão de alto rendimento para churrasco"
};
function descOf(p){ return (CAT_DESC[p.c]||"Produto")+" — "+p.b+" "+p.n+" ("+p.v+")."; }
function availOf(p){ return {t:"Em estoque",cls:"avail-ok"}; }
/* ===== PREÇOS — catálogo só-atacado. SHOW_RETAIL=true reexibe o varejo (reversível). ===== */
const SHOW_RETAIL = false;
function atacUnit(p){ return p.promo && p.pp!=null ? p.pp : p.au; }   // atacado efetivo (null se sem preço)
function retailUnit(p){ return p.promo && p.pp!=null ? p.pp : p.vu; } // varejo (oculto por ora)
function hasPrice(p){ return atacUnit(p)!=null; }
function priceTxt(v){ return v==null ? "Sob consulta" : money(v); }
function effPrice(p){ return atacUnit(p); }
function unitPrice(p){ return (SHOW_RETAIL && state.buyMode==="varejo") ? retailUnit(p) : atacUnit(p); }
function priceBlocks(p){
  const promoOn = p.promo && p.pp!=null;
  const atacMain = promoOn ? (p.au!=null?"<s>"+money(p.au)+"</s>":"")+money(p.pp) : priceTxt(p.au);
  const atacCls = "pr-block"+(SHOW_RETAIL?" atac":"")+(promoOn?" promo":"");
  const atac = `<div class="${atacCls}"><small>${promoOn?"Oferta atacado":"Atacado"}</small><div class="v">${atacMain}</div><div class="u">por unidade</div></div>`;
  if(!SHOW_RETAIL) return atac;
  const retMain = promoOn ? "<s>"+money(p.vu)+"</s>"+money(p.pp) : money(p.vu);
  return `<div class="pr-block${promoOn?" promo":""}"><small>${promoOn?"Oferta":"Varejo"}</small><div class="v">${retMain}</div><div class="u">unidade</div></div>`+atac;
}
function modalPrices(p){
  const promoOn = p.promo && p.pp!=null;
  const atacVal = promoOn ? '<span class="val">'+(p.au!=null?"<s>"+money(p.au)+"</s>":"")+money(p.pp)+'</span>' : '<span class="val">'+priceTxt(p.au)+'</span>';
  const atacBox = `<div class="pm-price-box hl"><small>${promoOn?"Oferta atacado (un)":"Preço de atacado (un)"}</small>${atacVal}</div>`;
  if(!SHOW_RETAIL) return atacBox;
  const retVal = promoOn ? '<span class="val"><s>'+money(p.vu)+'</s>'+money(p.pp)+'</span>' : '<span class="val">'+money(p.vu)+'</span>';
  return `<div class="pm-price-box hl"><small>${promoOn?"Oferta varejo (un)":"Varejo (un)"}</small>${retVal}</div><div class="pm-price-box"><small>Atacado (un)</small><span class="val">${money(p.au)}</span></div>`;
}
const SPECIAL_TITLES = {bs:"Mais procurados",nv:"Novidades",promo:"Ofertas",f:"Destaques",fav:"Seus favoritos"};
function catName(id){ const c=cats.find(x=>x.id===id); return c?c.name:""; }
function brandName(id){ const b=brands.find(x=>x.id===id); return b?b.name:""; }
function isHome(){ return !state.catId && !state.brandId && !state.price && !state.q && !state.special && state.sort==="rel"; }

/* ============================================================ CARD */
function card(p){
  const c=catStyle(p.c), fav=state.favs.has(p.id)?"on":"";
  let tag="";
  if(p.promo) tag='<span class="tag promo">Oferta</span>';
  else if(p.nv) tag='<span class="tag novo">Novidade</span>';
  else if(p.bs) tag='<span class="tag top">Mais procurado</span>';
  else if(p.f) tag='<span class="tag top">Destaque</span>';
  return `<article class="card reveal" data-id="${p.id}" data-open="${p.id}">
    <div class="card-media" style="--tile:linear-gradient(145deg,${c.tile[0]},${c.tile[1]});--tile-d:linear-gradient(145deg,${c.tileD[0]},${c.tileD[1]})">
      <span class="cat-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">${c.ic}</svg></span>
      <div class="tag-wrap">${tag}</div>
      <button class="fav ${fav}" data-fav="${p.id}" aria-label="Favoritar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/></svg>
      </button>
      ${productArt(p)}
      <span class="vol-badge">${p.v}</span>
    </div>
    <div class="card-body">
      <div class="card-cat"><span class="dot"></span>${p.c}</div>
      <div class="card-brand">${p.b}</div>
      <div class="card-name">${p.n}</div>
      <div class="pr-blocks">
        ${priceBlocks(p)}
      </div>
      <div class="card-actions">
        <div class="qty">
          <button data-dec="${p.id}" aria-label="Menos">−</button>
          <span data-q="${p.id}">1</span>
          <button data-inc="${p.id}" aria-label="Mais">+</button>
        </div>
        <button class="add-btn rippleable" data-add="${p.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12h14"/></svg>
          <span>Adicionar</span>
        </button>
      </div>
    </div>
  </article>`;
}
function section(title,eyebrow,items,id){
  return `<div class="sec-head"${id?' id="'+id+'"':''}><div><div class="sec-eyebrow">${eyebrow}</div><h2>${title}</h2></div><span class="count">${items.length} ${items.length===1?"item":"itens"}</span></div><div class="grid">${items.map(card).join("")}</div>`;
}
function emptyHTML(){ return `<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="7"/><path d="m20 20-3-3"/></svg><h3>Nenhum produto encontrado</h3><p>Tente ajustar a busca ou os filtros.</p></div>`; }
function skeletonHTML(){ let g=""; for(let i=0;i<8;i++) g+='<div class="skel-card"></div>'; return `<div class="grid">${g}</div>`; }
function errorHTML(){ return `<div class="cat-msg"><h3>Não foi possível carregar o catálogo</h3><p>Verifique sua conexão e tente novamente.</p><button class="btn-retry" id="retryLoad">Tentar de novo</button></div>`; }
function configMsgHTML(){ return `<div class="cat-msg"><h3>Catálogo não configurado</h3><p>Preencha <code>supabaseUrl</code> e <code>supabaseAnonKey</code> em <code>js/config.js</code> (chave anon/public).</p></div>`; }

/* ============================================================ CATALOG (async, paginado) */
let reqSeq=0;
async function renderCatalog(){
  const area=$("#catalogArea");
  if(!sbReady()){ area.innerHTML=configMsgHTML(); renderPagination(0); renderActiveFilters(); return; }
  const seq=++reqSeq;
  area.innerHTML=skeletonHTML();
  try{
    if(isHome() && state.page===0){
      if(!hlCache){
        const [promo,bs,nv,f]=await Promise.all([sbHighlights("promo"),sbHighlights("bs"),sbHighlights("nv"),sbHighlights("f")]);
        if(seq!==reqSeq) return;
        hlCache={promo,bs,nv,f}; cache(promo);cache(bs);cache(nv);cache(f);
      }
      const {items,total}=await sbProducts({page:0,perPage:PER,sort:"rel"});
      if(seq!==reqSeq) return;
      cache(items); state.total=total;
      let html="";
      if(hlCache.promo.length) html+=section("Ofertas da semana","Aproveite enquanto duram",hlCache.promo,"ofertas");
      if(hlCache.bs.length)    html+=section("Mais procurados","Os campeões de pedido",hlCache.bs);
      if(hlCache.nv.length)    html+=section("Novidades","Chegou agora",hlCache.nv);
      if(hlCache.f.length)     html+=section("Destaques","Seleção JE7",hlCache.f);
      html+=`<div class="sec-head" id="todos"><div><div class="sec-eyebrow">Catálogo completo</div><h2>Todos os produtos</h2></div><span class="count">${total} itens</span></div><div class="grid">${items.map(card).join("")}</div>`;
      area.innerHTML=html;
    } else if(state.special==="fav"){
      const favs=await sbByIds([...state.favs]);
      if(seq!==reqSeq) return;
      cache(favs); state.total=favs.length;
      area.innerHTML = favs.length
        ? `<div class="sec-head"><div><div class="sec-eyebrow">Resultados</div><h2>Seus favoritos</h2></div><span class="count">${favs.length} ${favs.length===1?"item":"itens"}</span></div><div class="grid">${favs.map(card).join("")}</div>`
        : emptyHTML();
    } else {
      const {items,total}=await sbProducts({page:state.page,perPage:PER,catId:state.catId,brandId:state.brandId,price:state.price,q:state.q,sort:state.sort,special:state.special});
      if(seq!==reqSeq) return;
      cache(items); state.total=total;
      if(!items.length){ area.innerHTML=emptyHTML(); }
      else{
        const title = state.special?SPECIAL_TITLES[state.special]:(state.brandId?brandName(state.brandId):(state.catId?catName(state.catId):(state.q?'Resultados para "'+state.q+'"':"Todos os produtos")));
        area.innerHTML=`<div class="sec-head"><div><div class="sec-eyebrow">Resultados</div><h2>${title}</h2></div><span class="count">${total} ${total===1?"item":"itens"}</span></div><div class="grid">${items.map(card).join("")}</div>`;
      }
    }
    renderPagination(state.special==="fav"?0:state.total);
    renderActiveFilters();
    observeReveal();
  }catch(e){
    if(seq!==reqSeq) return;
    area.innerHTML=errorHTML(); renderPagination(0); renderActiveFilters();
  }
}

/* ============================================================ PAGINAÇÃO */
function renderPagination(total){
  const host=$("#pagination"); if(!host) return;
  const pages=Math.ceil(total/PER); const cur=state.page;
  if(pages<=1){ host.innerHTML=""; return; }
  const btn=(pg,label,cls,dis)=>`<button class="pg ${cls||""}" ${dis?"disabled":""} data-pg="${pg}">${label}</button>`;
  const nums=[], win=1;
  for(let i=0;i<pages;i++){ if(i===0||i===pages-1||(i>=cur-win&&i<=cur+win)) nums.push(i); }
  let html=btn(cur-1,"← Anterior","prev",cur===0), last=-1;
  nums.forEach(i=>{ if(i-last>1) html+='<span class="pg-dots">…</span>'; html+=btn(i,String(i+1),i===cur?"on":""); last=i; });
  html+=btn(cur+1,"Próxima →","next",cur>=pages-1);
  host.innerHTML=html;
}

/* ============================================================ CHIPS / FILTROS */
function renderChips(){
  let html=`<button class="chip ${!state.catId?"active":""}" data-cat="">Todos</button>`;
  cats.forEach(ct=>{ html+=`<button class="chip ${state.catId===ct.id?"active":""}" data-cat="${ct.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" style="width:15px;height:15px">${catStyle(ct.name).ic}</svg> ${ct.name}</button>`; });
  $("#chips").innerHTML=html;
}
const FCHIPS=[
 {f:"",label:"Tudo",ic:'<path d="M4 6h16M4 12h16M4 18h16"/>'},
 {f:"bs",label:"Mais vendidos",ic:'<path d="M12 3c0 3-3 4-3 7a3 3 0 0 0 6 0c0-1-.5-2-1-2.5-.3 1.5-2 1.5-2 0 0-1.5 2-1.5 3-4.5Z"/>'},
 {f:"nv",label:"Novidades",ic:'<path d="m12 3 2.3 5.6L20 9l-4.5 3.7L17 19l-5-3.4L7 19l1.5-6.3L4 9l5.7-.4Z"/>'},
 {f:"promo",label:"Promoções",ic:'<path d="M20.5 11.5 12.5 3.5H4v8.5l8 8 8.5-8.5Z"/><circle cx="8" cy="8" r="1.3"/>'},
 {f:"fav",label:"Favoritos",ic:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1a5.5 5.5 0 1 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>'}
];
function renderFilterChips(){
  $("#fchips").innerHTML=FCHIPS.map(x=>`<button class="fchip rippleable ${state.special===x.f?"active":""} ${x.f==="promo"?"promo":""}" data-f="${x.f}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">${x.ic}</svg>${x.label}</button>`).join("");
}
function renderActiveFilters(){
  const box=$("#activeFilters"); if(!box) return;
  const chips=[];
  if(state.q) chips.push({t:"Busca",v:state.q,k:"q"});
  if(state.catId) chips.push({t:"Categoria",v:catName(state.catId),k:"cat"});
  if(state.brandId) chips.push({t:"Marca",v:brandName(state.brandId),k:"brand"});
  if(state.special) chips.push({t:"",v:SPECIAL_TITLES[state.special],k:"special"});
  if(state.price){ const m={"0-5":"Até R$ 5","5-15":"R$ 5–15","15-50":"R$ 15–50","50-999":"Acima de R$ 50"}; chips.push({t:"Preço",v:m[state.price]||state.price,k:"price"}); }
  if(!chips.length){ box.innerHTML=""; return; }
  box.innerHTML='<span class="af-label">Filtros ativos:</span>'+chips.map(c=>`<span class="af-chip">${c.t?c.t+": ":""}<b>${c.v}</b><span class="af-x" data-clear="${c.k}" role="button" aria-label="Remover"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M18 6 6 18M6 6l12 12"/></svg></span></span>`).join("")+'<button class="af-clear" id="clearAllFilters">Limpar tudo</button>';
}
function clearFilter(k){
  if(k==="q"){ state.q=""; $("#search").value=""; closeSuggest(); }
  else if(k==="cat") state.catId="";
  else if(k==="brand"){ state.brandId=""; $("#brandFilter").value=""; }
  else if(k==="special") state.special="";
  else if(k==="price"){ state.price=""; $("#priceFilter").value=""; }
  state.page=0; renderChips(); renderFilterChips(); renderCatalog();
}
function clearAllFilters(){
  state.q="";state.catId="";state.brandId="";state.special="";state.price="";state.page=0;
  $("#search").value=""; $("#brandFilter").value=""; $("#priceFilter").value=""; closeSuggest();
  renderChips(); renderFilterChips(); renderCatalog();
}

/* ============================================================ BUSCA (sugestões, server-side) */
let suggestSeq=0;
async function renderSuggest(q){
  const box=$("#suggest"); q=(q||"").trim();
  if(q.length<2){ box.classList.remove("open"); box.innerHTML=""; $("#search").setAttribute("aria-expanded","false"); return; }
  if(!sbReady()) return;
  const seq=++suggestSeq;
  try{
    const {items}=await sbProducts({q,perPage:6,page:0,sort:"rel"});
    if(seq!==suggestSeq) return;
    cache(items);
    if(!items.length){ box.innerHTML='<div class="suggest-head">Nada encontrado para "'+q+'"</div>'; box.classList.add("open"); return; }
    const esc=q.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"); const hl=s=>s.replace(new RegExp("("+esc+")","ig"),"<b>$1</b>");
    box.innerHTML='<div class="suggest-head">Sugestões</div>'+items.map(p=>`<div class="suggest-item" data-open="${p.id}"><div class="suggest-thumb" style="background:linear-gradient(145deg,${catStyle(p.c).tile[0]},${catStyle(p.c).tile[1]})">${productArt(p)}</div><div class="suggest-info"><div class="suggest-name">${hl(p.n)} <span style="opacity:.55">${p.v}</span></div><div class="suggest-meta">${p.b} · ${p.c}</div></div><div class="suggest-price">${money(effPrice(p))}</div></div>`).join("");
    box.classList.add("open"); $("#search").setAttribute("aria-expanded","true");
  }catch(e){ box.classList.remove("open"); }
}
function closeSuggest(){ $("#suggest").classList.remove("open"); }

/* ============================================================ MARCAS */
function initBrands(){
  $("#brandFilter").innerHTML='<option value="">Todas as marcas</option>'+brands.map(b=>`<option value="${b.id}">${b.name}</option>`).join("");
  const skip=["Energético","Batata","Água Mineral"];
  const names=brands.filter(b=>!skip.includes(b.name));
  $("#brandTrack").innerHTML=[...names,...names].map(b=>`<button class="brand-item" data-brand="${b.id}">${b.name}</button>`).join("");
}
function applyBrand(id){
  state.brandId=id; state.special=""; state.catId=""; state.q=""; state.page=0; $("#search").value="";
  $("#brandFilter").value=id; closeSuggest(); renderChips(); renderFilterChips(); renderCatalog();
  window.scrollTo({top:$("#catalogo").offsetTop-60,behavior:"smooth"});
}

/* ============================================================ CARRINHO (lógica preservada) */
function addToCart(id,qty,srcEl){
  const p=byId[id]; if(!p) return;
  if(state.cart[id]) state.cart[id].q+=qty; else state.cart[id]={p,q:qty};
  if(srcEl) flyToCart(srcEl);
  bumpCart(); updateCartUI(); toast(p.n+" adicionado ao pedido");
}
function setQty(id,q){ if(q<=0) delete state.cart[id]; else if(state.cart[id]) state.cart[id].q=q; else if(byId[id]) state.cart[id]={p:byId[id],q}; updateCartUI(); }
function clearCart(){ state.cart={}; updateCartUI(); toast("Pedido limpo"); }
function cartTotals(){ let qty=0,val=0; Object.values(state.cart).forEach(({p,q})=>{qty+=q; const u=unitPrice(p); val+=q*(u==null?0:u);}); return {qty,val,lines:Object.keys(state.cart).length}; }
function updateCartUI(){
  const t=cartTotals();
  $("#navCount").textContent=t.qty; $("#drawerCount").textContent=t.qty; $("#navCount").classList.toggle("on",t.qty>0);
  $("#totVol").textContent=t.qty; $("#totUnits").textContent=t.lines; $("#totValue").textContent=money(t.val);
  const lbl=$("#totLabel"); if(lbl) lbl.textContent="Valor estimado ("+state.buyMode+")";
  $("#fabItems").textContent=`${t.qty} ${t.qty===1?"item":"itens"} · ${t.lines} ${t.lines===1?"produto":"produtos"}`;
  $("#fab").classList.toggle("show",t.qty>0); $("#finish").disabled=t.lines===0;
  renderDrawer();
}
function flyToCart(srcEl){
  const target=$("#fab").classList.contains("show")?$("#fab"):$("#cartNav");
  const art=srcEl.querySelector("img.art, svg.art")||srcEl;
  const r1=art.getBoundingClientRect(), r2=target.getBoundingClientRect(); if(!r1.width) return;
  const clone=art.cloneNode(true); clone.classList.add("fly-clone");
  Object.assign(clone.style,{position:"fixed",left:r1.left+"px",top:r1.top+"px",width:r1.width+"px",height:r1.height+"px",zIndex:9999,pointerEvents:"none",transition:"all .8s cubic-bezier(.5,-.25,.3,1)",margin:0});
  document.body.appendChild(clone);
  requestAnimationFrame(()=>{ Object.assign(clone.style,{left:(r2.left+r2.width/2-12)+"px",top:(r2.top+r2.height/2-12)+"px",width:"26px",height:"26px",opacity:"0.15"}); });
  setTimeout(()=>clone.remove(),820);
}
function bumpCart(){ ["#navCount","#fab"].forEach(s=>{const el=$(s); if(!el)return; el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump");}); }
function emptyCart(){ return `<div class="cart-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="9" cy="21" r="1.5"/><circle cx="18" cy="21" r="1.5"/><path d="M2.5 3h2l2.2 12.4a1.5 1.5 0 0 0 1.5 1.2h9.1a1.5 1.5 0 0 0 1.5-1.2L21 7H6"/></svg><h3>Seu pedido está vazio</h3><p>Adicione produtos do catálogo para começar.</p></div>`; }
function renderDrawer(){
  const body=$("#drawerBody"); const entries=Object.entries(state.cart); const atac=SHOW_RETAIL?state.buyMode==="atacado":true;
  const head=`<div class="quote-head"><div class="qh-top"><span class="qh-badge">Orçamento</span><span class="qh-no">${state.orderNo}</span></div><div class="qh-date">Data: ${state.orderDate}</div></div>
    ${SHOW_RETAIL?`<div class="buy-mode"><div class="bm-label">Como deseja comprar?</div>
      <div class="bm-opts"><button class="bm-opt ${!atac?"active":""}" data-mode="varejo"><span class="bm-dot"></span>Varejo</button><button class="bm-opt ${atac?"active":""}" data-mode="atacado"><span class="bm-dot"></span>Atacado</button></div>
      <p class="bm-hint">${atac?"Preços de atacado aplicados. Preencha os dados para o orçamento.":"Preços de varejo aplicados."}</p>
    </div>`:`<p class="bm-hint" style="margin:.2rem 0 1rem">Preços de atacado. Preencha os dados para o orçamento.</p>`}
    <div class="quote-fields">
      <input id="cliName" placeholder="Nome${atac?"":" (opcional)"}" value="${state._cli||""}" autocomplete="name">
      <input id="cliPhone" placeholder="Telefone / WhatsApp" value="${state._fone||""}" autocomplete="tel">
      ${atac?`<input id="cliEmp" placeholder="Empresa" value="${state._empresa||""}" autocomplete="organization"><input id="cliCnpj" placeholder="CNPJ" value="${state._cnpj||""}">`:""}
    </div>`;
  if(!entries.length){ body.innerHTML=head+emptyCart(); wireQuoteFields(); return; }
  const items=entries.map(([id,{p,q}])=>`<div class="cart-item"><div class="thumb" style="background:linear-gradient(145deg,${catStyle(p.c).tile[0]},${catStyle(p.c).tile[1]})">${p.n.slice(0,2).toUpperCase()}</div><div class="ci-body"><div class="ci-name">${p.n}</div><div class="ci-meta">${p.v} · ${priceTxt(unitPrice(p))}/un</div><div class="ci-row"><div class="qty"><button data-deci="${id}">−</button><span>${q}</span><button data-inci="${id}">+</button></div><div style="display:flex;align-items:center;gap:.7rem"><span class="ci-price">${priceTxt(unitPrice(p)==null?null:q*unitPrice(p))}</span><button class="ci-remove" data-rmi="${id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14"/></svg></button></div></div></div></div>`).join("");
  const obs=`<div class="obs"><label for="obsField">Observações do pedido</label><textarea id="obsField" placeholder="Ex: entrega no bairro X, pagar no PIX…">${state._obs||""}</textarea></div>`;
  body.innerHTML=head+items+obs; wireQuoteFields();
}
function wireQuoteFields(){
  const set=(id,k)=>{ const el=$(id); if(el) el.oninput=e=>state[k]=e.target.value; };
  set("#cliName","_cli"); set("#cliPhone","_fone"); set("#cliEmp","_empresa"); set("#cliCnpj","_cnpj"); set("#obsField","_obs");
}
function buildMessage(){
  const t=cartTotals(); const atac=SHOW_RETAIL?state.buyMode==="atacado":true;
  let m="*PEDIDO DE ORÇAMENTO*\n*"+CONFIG.storeName+"*\n\n";
  m+="*Tipo de compra:* "+(atac?"Atacado":"Varejo")+"\n";
  if(state._cli && state._cli.trim()) m+="*Nome:* "+state._cli.trim()+"\n";
  if(atac && state._empresa && state._empresa.trim()) m+="*Empresa:* "+state._empresa.trim()+"\n";
  if(state._fone && state._fone.trim()) m+="*Telefone:* "+state._fone.trim()+"\n";
  if(atac && state._cnpj && state._cnpj.trim()) m+="*CNPJ:* "+state._cnpj.trim()+"\n";
  m+="\n--------------------------------\n*PRODUTOS*\n--------------------------------\n";
  Object.values(state.cart).forEach(({p,q})=>{ m+="\n• "+p.n+" ("+p.v+")\n   Qtd: "+q+"  —  "+priceTxt(unitPrice(p)==null?null:q*unitPrice(p))+"\n"; });
  m+="\n--------------------------------\n";
  m+="*Itens:* "+t.qty+"    *Produtos:* "+t.lines+"\n";
  m+="*Valor estimado ("+state.buyMode+"):* "+money(t.val)+"\n";
  if(state._obs && state._obs.trim()) m+="\n*Observações:* "+state._obs.trim()+"\n";
  m+="\n_Aguardo retorno. Obrigado!_";
  return m;
}
function finishOrder(){ if(!cartTotals().lines) return; window.open("https://wa.me/"+CONFIG.whatsapp+"?text="+encodeURIComponent(buildMessage()),"_blank"); }

/* ============================================================ MODAL (async: produto + semelhantes) */
let pmState={id:null};
function relCard(p){ return `<div class="rel-card" data-open="${p.id}"><div class="rel-media" style="--tile:linear-gradient(145deg,${catStyle(p.c).tile[0]},${catStyle(p.c).tile[1]})">${productArt(p)}</div><div class="rel-body"><div class="rel-name">${p.n}</div><div class="rel-price">${money(effPrice(p))}</div></div></div>`; }
function relatedBlock(title,items){ if(!items.length) return ""; return `<div class="pm-related"><h4>${title}</h4><div class="rel-row">${items.map(relCard).join("")}</div></div>`; }
function modalHTML(p){
  const c=catStyle(p.c), av=availOf(p);
  return `
  <button class="pm-close" id="pmClose" aria-label="Fechar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
  <div class="pm-scroll">
    <div class="pm-grid">
      <div class="pm-gallery"><div class="pm-main" style="--tile:linear-gradient(145deg,${c.tile[0]},${c.tile[1]})">${productArt(p)}</div></div>
      <div class="pm-info">
        <span class="pm-brand-txt">${p.b}</span>
        <h2 class="pm-title">${p.n}</h2>
        <div class="pm-badges">
          <span class="meta-pill"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" style="width:13px;height:13px">${c.ic}</svg>${p.c}</span>
          <span class="meta-pill">Volume: ${p.v}</span>
          <span class="meta-pill ${av.cls}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M20 6 9 17l-5-5"/></svg>${av.t}</span>
          ${p.promo?'<span class="meta-pill" style="color:#fff;background:var(--red)">Oferta</span>':''}
        </div>
        <p class="pm-desc">${descOf(p)}</p>
        <div class="pm-prices">
          ${modalPrices(p)}
        </div>
        <div class="pm-buy">
          <div class="qty"><button id="pmDec">−</button><span id="pmQty">1</span><button id="pmInc">+</button></div>
          <button class="pm-add rippleable" id="pmAdd"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12h14"/></svg>Adicionar ao Pedido</button>
        </div>
      </div>
    </div>
    <div id="pmRelated"></div>
  </div>`;
}
async function openProduct(id){
  let p=byId[id]; if(!p){ try{ p=await sbById(id); }catch(e){} if(p) byId[id]=p; }
  if(!p) return;
  pmState={id};
  $("#pmodal").innerHTML=modalHTML(p);
  $("#pmodal").classList.add("open"); $("#pmOverlay").classList.add("open");
  document.body.style.overflow="hidden"; try{history.replaceState(null,"","#p="+p.id);}catch(e){} $("#pmodal").scrollTop=0;
  try{ const rel=await sbRelated(p); cache(rel); const host=$("#pmRelated"); if(host) host.outerHTML=relatedBlock("Produtos semelhantes",rel); }catch(e){}
}
function closeProduct(){
  $("#pmodal").classList.remove("open"); $("#pmOverlay").classList.remove("open"); document.body.style.overflow="";
  if(location.hash.indexOf("#p=")===0){ try{history.replaceState(null,"",location.pathname+location.search);}catch(e){} }
}

/* ============================================================ TOAST / REVEAL / DRAWER */
let toastT;
function toast(msg){ $("#toastMsg").textContent=msg; $("#toast").classList.add("show"); clearTimeout(toastT); toastT=setTimeout(()=>$("#toast").classList.remove("show"),2000); }
let io;
function observeReveal(){ if(io) io.disconnect(); io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target)}}),{threshold:.08}); $$(".reveal:not(.in)").forEach(el=>io.observe(el)); }
function openDrawer(){ $("#drawer").classList.add("open"); $("#overlay").classList.add("open"); document.body.style.overflow="hidden"; }
function closeDrawer(){ $("#drawer").classList.remove("open"); $("#overlay").classList.remove("open"); document.body.style.overflow=""; }

/* ============================================================ EVENTS */
const debouncedSuggest=debounce(q=>renderSuggest(q),250);
const debouncedCatalog=debounce(()=>{ state.page=0; renderCatalog(); },350);
/* ===== TEMA claro/escuro: detecção do sistema + escolha manual persistida ===== */
function setThemeIcon(dark){ const el=$("#moonIco"); if(!el) return; el.innerHTML = dark
  ? '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2m-3-7-1.5 1.5M6.5 17.5 5 19m0-14 1.5 1.5M17.5 17.5 19 19"/>'
  : '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>'; }
function applyTheme(theme,save){ document.documentElement.setAttribute("data-theme",theme); setThemeIcon(theme==="dark"); if(save){ try{ localStorage.setItem("je7-theme",theme); }catch(e){} } }
function watchSystemTheme(){ if(!window.matchMedia) return; const mq=window.matchMedia("(prefers-color-scheme: dark)"); const onSys=e=>{ let saved; try{ saved=localStorage.getItem("je7-theme"); }catch(_){} if(saved!=="light"&&saved!=="dark") applyTheme(e.matches?"dark":"light",false); }; if(mq.addEventListener) mq.addEventListener("change",onSys); else if(mq.addListener) mq.addListener(onSys); }

function bind(){
  $("#chips").addEventListener("click",e=>{ const b=e.target.closest("[data-cat]"); if(!b)return; state.catId=b.dataset.cat; state.page=0; renderChips(); renderCatalog(); window.scrollTo({top:$("#catalogo").offsetTop-60,behavior:"smooth"}); });
  $("#fchips").addEventListener("click",e=>{ const b=e.target.closest("[data-f]"); if(!b)return; if(b.dataset.f==="fav"&&!state.favs.size){toast("Você ainda não favoritou nada");return;} state.special=b.dataset.f; state.page=0; renderFilterChips(); renderCatalog(); window.scrollTo({top:$("#catalogo").offsetTop-60,behavior:"smooth"}); });
  const si=$("#search");
  si.addEventListener("input",e=>{ state.q=e.target.value; debouncedSuggest(e.target.value); debouncedCatalog(); });
  si.addEventListener("focus",e=>{ if(e.target.value.trim().length>=2) renderSuggest(e.target.value); });
  document.addEventListener("click",e=>{ if(!e.target.closest(".search")) closeSuggest(); });
  $("#suggest").addEventListener("click",e=>{ const it=e.target.closest("[data-open]"); if(!it)return; closeSuggest(); openProduct(it.dataset.open); });
  $("#brandFilter").addEventListener("change",e=>{ state.brandId=e.target.value; state.page=0; renderCatalog(); });
  $("#priceFilter").addEventListener("change",e=>{ state.price=e.target.value; state.page=0; renderCatalog(); });
  $$(".sort-toggle button").forEach(b=>b.addEventListener("click",()=>{ $$(".sort-toggle button").forEach(x=>x.classList.remove("on")); b.classList.add("on"); state.sort=b.dataset.sort; state.page=0; renderCatalog(); }));
  // catálogo: abrir modal, ações do card, retry
  $("#catalogArea").addEventListener("click",e=>{
    if(e.target.closest("#retryLoad")){ renderCatalog(); return; }
    const fav=e.target.closest("[data-fav]"), inc=e.target.closest("[data-inc]"), dec=e.target.closest("[data-dec]"), add=e.target.closest("[data-add]");
    if(fav){ e.stopPropagation(); toggleFav(fav.dataset.fav); return; }
    if(inc){ const s=document.querySelector('[data-q="'+inc.dataset.inc+'"]'); s.textContent=+s.textContent+1; return; }
    if(dec){ const s=document.querySelector('[data-q="'+dec.dataset.dec+'"]'); if(+s.textContent>1)s.textContent=+s.textContent-1; return; }
    if(add){ const id=add.dataset.add; const s=document.querySelector('[data-q="'+id+'"]'); const q=s?+s.textContent:1; addToCart(id,q,add.closest(".card")); add.classList.add("added"); const sp=add.querySelector("span"); if(sp)sp.textContent="Adicionado ✓"; setTimeout(()=>{add.classList.remove("added"); if(sp)sp.textContent="Adicionar";},1100); return; }
    const openEl=e.target.closest("[data-open]"); if(openEl) openProduct(openEl.dataset.open);
  });
  // paginação
  $("#pagination").addEventListener("click",e=>{ const b=e.target.closest("[data-pg]"); if(!b||b.disabled)return; state.page=+b.dataset.pg; renderCatalog(); const top=$("#todos")||$("#catalogo"); window.scrollTo({top:top.offsetTop-70,behavior:"smooth"}); });
  // filtros ativos
  $("#activeFilters").addEventListener("click",e=>{ const x=e.target.closest("[data-clear]"); if(x){ clearFilter(x.dataset.clear); return; } if(e.target.closest("#clearAllFilters")) clearAllFilters(); });
  // drawer
  $("#drawerBody").addEventListener("click",e=>{
    const mode=e.target.closest("[data-mode]"); if(mode){ state.buyMode=mode.dataset.mode; updateCartUI(); return; }
    const inc=e.target.closest("[data-inci]"), dec=e.target.closest("[data-deci]"), rm=e.target.closest("[data-rmi]");
    if(inc){ const id=inc.dataset.inci; setQty(id,(state.cart[id]?.q||0)+1); }
    if(dec){ const id=dec.dataset.deci; setQty(id,(state.cart[id]?.q||0)-1); }
    if(rm){ setQty(rm.dataset.rmi,0); }
  });
  // modal
  $("#pmodal").addEventListener("click",e=>{
    if(e.target.closest("#pmClose")){ closeProduct(); return; }
    if(e.target.closest("#pmInc")){ const s=$("#pmQty"); s.textContent=+s.textContent+1; return; }
    if(e.target.closest("#pmDec")){ const s=$("#pmQty"); if(+s.textContent>1)s.textContent=+s.textContent-1; return; }
    if(e.target.closest("#pmAdd")){ addToCart(pmState.id,+$("#pmQty").textContent,$(".pm-main")); return; }
    const rel=e.target.closest(".rel-card[data-open]"); if(rel){ openProduct(rel.dataset.open); return; }
  });
  $("#pmOverlay").addEventListener("click",closeProduct);
  $("#brandTrack").addEventListener("click",e=>{ const b=e.target.closest("[data-brand]"); if(b) applyBrand(b.dataset.brand); });
  $("#fab").addEventListener("click",openDrawer);
  $("#cartNav").addEventListener("click",openDrawer);
  $("#closeDrawer").addEventListener("click",closeDrawer);
  $("#overlay").addEventListener("click",closeDrawer);
  $("#finish").addEventListener("click",finishOrder);
  $("#clearCart").addEventListener("click",clearCart);
  $("#backCat").addEventListener("click",()=>{ closeDrawer(); window.scrollTo({top:$("#catalogo").offsetTop-60,behavior:"smooth"}); });
  // menu mobile
  const burger=$("#burger"), mmenu=$("#mobileMenu");
  if(burger){ burger.addEventListener("click",()=>{ const open=mmenu.classList.toggle("open"); burger.classList.toggle("open",open); burger.setAttribute("aria-expanded",open); }); }
  if(mmenu){ mmenu.addEventListener("click",e=>{ if(e.target.closest("[data-mclose]")){ mmenu.classList.remove("open"); burger.classList.remove("open"); burger.setAttribute("aria-expanded","false"); } }); }
  const sn=$("#searchNav"); if(sn) sn.addEventListener("click",()=>{ const s=$("#search"); window.scrollTo({top:s.getBoundingClientRect().top+window.scrollY-80,behavior:"smooth"}); setTimeout(()=>s.focus(),350); });
  document.addEventListener("click",e=>{ const o=e.target.closest('[data-nav="ofertas"]'); if(o){ e.preventDefault(); state.special="promo"; state.page=0; renderFilterChips(); renderCatalog(); window.scrollTo({top:$("#catalogo").offsetTop-60,behavior:"smooth"}); } });
  const hw=$("#heroWpp"); if(hw) hw.addEventListener("click",()=>window.open("https://wa.me/"+CONFIG.whatsapp,"_blank"));
  $("#favNav").addEventListener("click",()=>{ if(!state.favs.size){toast("Você ainda não favoritou nada");return;} state.special="fav"; state.page=0; renderFilterChips(); renderCatalog(); window.scrollTo({top:$("#catalogo").offsetTop-60,behavior:"smooth"}); });
  setThemeIcon(document.documentElement.getAttribute("data-theme")==="dark");
  $("#themeBtn").addEventListener("click",()=>{ const dark=document.documentElement.getAttribute("data-theme")==="dark"; applyTheme(dark?"light":"dark",true); });
  watchSystemTheme();
  window.addEventListener("scroll",()=>{ $("#topBtn").classList.toggle("show",window.scrollY>600); });
  $("#topBtn").addEventListener("click",()=>window.scrollTo({top:0,behavior:"smooth"}));
  document.addEventListener("click",e=>{ const el=e.target.closest(".rippleable"); if(!el)return; const r=el.getBoundingClientRect(); const s=document.createElement("span"); s.className="ripple"; const d=Math.max(r.width,r.height); s.style.width=s.style.height=d+"px"; s.style.left=(e.clientX-r.left-d/2)+"px"; s.style.top=(e.clientY-r.top-d/2)+"px"; el.appendChild(s); setTimeout(()=>s.remove(),600); });
  document.addEventListener("keydown",e=>{ if(e.key==="Escape"){ closeSuggest(); if($("#pmodal").classList.contains("open"))closeProduct(); else if($("#drawer").classList.contains("open"))closeDrawer(); } });
  window.addEventListener("hashchange",handleHash);
}
function toggleFav(id){ state.favs.has(id)?state.favs.delete(id):state.favs.add(id); $$('[data-fav="'+id+'"]').forEach(b=>b.classList.toggle("on",state.favs.has(id))); if(state.special==="fav") renderCatalog(); }
function handleHash(){ const m=location.hash.match(/^#p=(.+)$/); if(!m)return; openProduct(decodeURIComponent(m[1])); }

/* ============================================================ INIT */
function hideLoader(){ const l=$("#loader"); if(l) l.classList.add("hide"); }
async function init(){
  if(window.__jeInit) return; window.__jeInit=true;
  const now=new Date();
  state.orderNo="JE7-"+now.getFullYear()+String(now.getMonth()+1).padStart(2,"0")+String(now.getDate()).padStart(2,"0")+"-"+String(Math.floor(Math.random()*900+100));
  state.orderDate=now.toLocaleDateString("pt-BR");
  $("#year").textContent=now.getFullYear();
  bind(); updateCartUI();
  if(!sbReady()){ $("#catalogArea").innerHTML=configMsgHTML(); $("#stProducts").textContent="—"; hideLoader(); return; }
  try{
    const [cx,bx]=await Promise.all([sbCategories(),sbBrands()]);
    cats=cx; brands=bx;
    renderChips(); renderFilterChips(); initBrands();
    await renderCatalog();
    $("#stProducts").textContent=state.total||"—";
    handleHash();
  }catch(e){ $("#catalogArea").innerHTML=errorHTML(); }
  hideLoader();
}
document.addEventListener("DOMContentLoaded",init);
if("serviceWorker" in navigator && location.protocol==="https:"){ window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{})); }
