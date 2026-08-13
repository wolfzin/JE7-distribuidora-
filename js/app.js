/* ============================================================
   PRODUCT ART — silhuetas SVG por tipo de embalagem, sem depender
   de imagem externa (seguro p/ direito autoral e nunca "quebra").

   >>> PARA USAR FOTO REAL: adicione  img:"images/arquivo.jpg"  (ou
   uma URL) no item dentro de PRODUCTS. A foto entra no lugar da
   silhueta automaticamente; se a imagem falhar, volta pra silhueta.
   Ex:  {n:"Coca-Cola",c:"Refrigerantes",...,img:"images/coca-2l.png"}
   ============================================================ */
const BRAND_COLORS = {
  "Coca-Cola":"#E4002B","Antarctica":"#0A3D91","Cine":"#E3641C","Wime":"#2AA84A",
  "Água Mineral":"#2C9BD6","Brahma":"#C8102E","Skol":"#E4B200","Kaiser":"#0E7A3B",
  "Budweiser":"#B01B2E","Heineken":"#0A7A34","Amstel":"#C8102E","Itaipava":"#123C7A",
  "Petra":"#7A1520","Spaten":"#0B5AAF","Original":"#0E7A3B","Sol":"#E39A00",
  "Stella Artois":"#B01B2E","Corona":"#D9A62B","Polar":"#0B5AAF","Jack Daniel's":"#1A1A1A",
  "Johnnie Walker":"#111111","Absolut":"#0072CE","Smirnoff":"#B01B2E","Beefeater":"#B01B2E",
  "Campari":"#C8102E","Ypióca":"#A9791A","Energético":"#1E3A8A","Batata":"#D08A10",
  "Karolitos":"#E07A1C","Soft Braza":"#2B2B2B"
};
function shade(hex,p){ // p entre -1 (escurece) e 1 (clareia)
  const h=hex.replace("#","");
  const n=parseInt(h.length===3?h.replace(/(.)/g,"$1$1"):h,16);
  let r=(n>>16)&255,g=(n>>8)&255,b=n&255;
  r=Math.round(r+(p<0?r*p:(255-r)*p));
  g=Math.round(g+(p<0?g*p:(255-g)*p));
  b=Math.round(b+(p<0?b*p:(255-b)*p));
  return `rgb(${r},${g},${b})`;
}
function formOf(p){
  const n=p.n.toLowerCase(), v=p.v.toLowerCase();
  if(p.c==="Salgadinhos") return "bag";
  if(p.c==="Carvão") return "sack";
  if(p.c==="Energéticos") return "can";
  if(p.c==="Água") return v.includes("litros")?"gallon":(v.includes("1500")?"pet":"bottle");
  if(p.c==="Cervejas") return n.includes("lata")?"can":"bottle";
  if(p.c==="Refrigerantes") return n.includes("lata")?"can":((v.includes("2l")||v.includes("1,5"))?"pet":"bottle");
  return "bottle"; // Destilados / vinhos
}
function svgArt(p){
  const col = BRAND_COLORS[p.b] || shade(CATS[p.c].tile[1],-0.35);
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
  // 1) caminho explícito no produto (img:"...") tem prioridade
  if(p.img){
    return `<img class="art" loading="lazy" src="${p.img}" alt="${p.n}" data-id="${p.id}" onerror="jeImgError(this)">`;
  }
  // 2) busca automática em images/products/<slug>.<ext>
  if(CONFIG.autoImages){
    const first = CONFIG.imgBase + p.slug + CONFIG.imgExts[0];
    return `<img class="art" loading="lazy" src="${first}" alt="${p.n}" data-id="${p.id}" data-slug="${p.slug}" data-try="0" onerror="jeImgError(this)">`;
  }
  // 3) silhueta desenhada
  return svgArt(p);
}
// tenta as próximas extensões; se todas falharem, cai na silhueta SVG
function jeImgError(img){
  const slug = img.dataset.slug;
  let t = parseInt(img.dataset.try || "99", 10);
  if(slug && t + 1 < CONFIG.imgExts.length){
    t++; img.dataset.try = t;
    img.src = CONFIG.imgBase + slug + CONFIG.imgExts[t];
    return;
  }
  img.outerHTML = window.__svgArt(+img.dataset.id);
}
window.__svgArt = id => svgArt(PRODUCTS[id]);

/* ============================================================
   STATE + HELPERS  (v3 — apresentação: varejo/atacado no carrinho)
   ============================================================ */
let state = { cat:"todos", q:"", brand:"", price:"", special:"", sort:"rel",
              cart:{}, favs:new Set(), buyMode:"varejo",
              _cli:"", _fone:"", _empresa:"", _cnpj:"", _obs:"", orderNo:"", orderDate:"" };
const money = n => "R$ "+n.toFixed(2).replace(".",",");
const key = p => (p.n+"|"+p.v).toLowerCase().replace(/[^a-z0-9]/g,"");
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const slugify = s => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")
  .replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
PRODUCTS.forEach((p,i)=>{ p.id=i; p.k=key(p); p.slug=slugify(p.n+"-"+p.v); });

const CAT_DESC = {
  "Refrigerantes":"Refrigerante gelado na medida certa para o seu ponto de venda",
  "Água":"Água mineral para revenda e consumo do dia a dia",
  "Cervejas":"Cerveja para bares, adegas, mercados e eventos",
  "Destilados":"Destilado selecionado para sua adega ou revenda",
  "Energéticos":"Energético para girar o estoque com boa margem",
  "Salgadinhos":"Salgadinho para complementar as vendas do balcão",
  "Carvão":"Carvão de alto rendimento para churrasco"
};
function descOf(p){
  const pk = p.pk>1 ? " Disponível por unidade ou em fardo com "+p.pk+" unidades." : " Vendido por unidade.";
  return CAT_DESC[p.c]+" — "+p.b+" "+p.n+" ("+p.v+")."+pk;
}
function availOf(p){ return p.av==="encomenda" ? {t:"Sob encomenda",cls:"avail-enc"} : {t:"Em estoque",cls:"avail-ok"}; }
function effPrice(p){ return p.promo?p.pp:p.vu; }            // base varejo p/ filtro/ordenação
function unitPrice(p){ return state.buyMode==="atacado" ? p.au : (p.promo?p.pp:p.vu); }
const SPECIAL_TITLES = {bs:"Mais vendidos",nv:"Novidades",promo:"Promoções",fav:"Seus favoritos"};

/* ============================================================ FILTER + SORT */
function matchSpecial(p){
  switch(state.special){
    case "bs": return !!p.bs; case "nv": return !!p.nv;
    case "promo": return !!p.promo; case "fav": return state.favs.has(p.id);
    default: return true;
  }
}
function filtered(){
  let list = PRODUCTS.filter(p=>{
    if(state.cat!=="todos" && p.c!==state.cat) return false;
    if(state.brand && p.b!==state.brand) return false;
    if(!matchSpecial(p)) return false;
    if(state.price){const[a,b]=state.price.split("-").map(Number); if(effPrice(p)<a||effPrice(p)>b) return false;}
    if(state.q){const t=(p.n+" "+p.b+" "+p.c).toLowerCase(); if(!t.includes(state.q.toLowerCase())) return false;}
    return true;
  });
  if(state.sort==="asc") list.sort((a,b)=>effPrice(a)-effPrice(b));
  else if(state.sort==="desc") list.sort((a,b)=>effPrice(b)-effPrice(a));
  return list;
}
function isHome(){ return state.cat==="todos" && !state.q && !state.brand && !state.price && !state.special && state.sort==="rel"; }

/* ============================================================ CARD */
function card(p){
  const c=CATS[p.c], fav=state.favs.has(p.id)?"on":"", av=availOf(p);
  const tags=[];
  if(p.promo) tags.push('<span class="tag promo">Oferta</span>');
  if(p.nv) tags.push('<span class="tag novo">Novidade</span>');
  else if(p.bs) tags.push('<span class="tag top">Mais vendido</span>');
  else if(p.f) tags.push('<span class="tag top">Destaque</span>');
  const priceMain = p.promo
    ? '<div class="price-promo"><span class="price-old">'+money(p.vu)+'</span><span>'+money(p.pp)+'</span></div>'
    : money(p.vu);
  return `<article class="card reveal" data-id="${p.id}" data-open="${p.id}">
    <div class="card-media" style="--tile:linear-gradient(145deg,${c.tile[0]},${c.tile[1]});--tile-d:linear-gradient(145deg,${c.tileD[0]},${c.tileD[1]})">
      <span class="cat-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">${c.ic}</svg></span>
      <div class="tag-wrap">${tags.join("")}</div>
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
      <div class="card-meta">
        <span class="meta-pill ${av.cls}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M20 6 9 17l-5-5"/></svg>${av.t}</span>
      </div>
      <div class="price-row">
        <div class="price-main"><small>${p.promo?"Oferta":"Varejo"}</small>${priceMain}</div>
        <div class="price-atac">Atacado<br><b>${money(p.au)}</b><br>${p.pk>1?"fardo c/ "+p.pk:"unidade"}</div>
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

/* ============================================================ CATALOG + SECTIONS */
function section(title,eyebrow,items){
  return `<div class="sec-head"><div><div class="sec-eyebrow">${eyebrow}</div><h2>${title}</h2></div><span class="count">${items.length} ${items.length===1?"item":"itens"}</span></div><div class="grid">${items.map(card).join("")}</div>`;
}
function emptyHTML(){
  return `<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="7"/><path d="m20 20-3-3"/></svg><h3>Nenhum produto encontrado</h3><p>Tente ajustar a busca ou os filtros.</p></div>`;
}
function renderCatalog(){
  const area=$("#catalogArea");
  if(isHome()){
    let html="";
    const pr=PRODUCTS.filter(p=>p.promo), bs=PRODUCTS.filter(p=>p.bs), nv=PRODUCTS.filter(p=>p.nv), rec=PRODUCTS.filter(p=>p.f);
    if(pr.length)  html+=section("Promoções","Ofertas da semana",pr);
    if(bs.length)  html+=section("Mais vendidos","Os queridinhos da distribuidora",bs);
    if(nv.length)  html+=section("Novidades","Chegou agora",nv);
    if(rec.length) html+=section("Recomendados para revenda","Seleção JE7",rec);
    CAT_ORDER.forEach(cat=>{ const it=PRODUCTS.filter(p=>p.c===cat); if(it.length) html+=section(cat,"Catálogo · "+cat,it); });
    area.innerHTML=html;
  } else {
    const list=filtered();
    if(!list.length){ area.innerHTML=emptyHTML(); return; }
    const title = state.special?SPECIAL_TITLES[state.special]:(state.brand?state.brand:(state.cat==="todos"?"Todos os produtos":state.cat));
    area.innerHTML=`<div class="sec-head"><div><div class="sec-eyebrow">Resultados</div><h2>${title}</h2></div><span class="count">${list.length} ${list.length===1?"item":"itens"}</span></div><div class="grid">${list.map(card).join("")}</div>`;
  }
  observeReveal();
}

/* ============================================================ CHIPS + FILTROS RÁPIDOS */
function renderChips(){
  const counts={}; PRODUCTS.forEach(p=>counts[p.c]=(counts[p.c]||0)+1);
  let html=`<button class="chip ${state.cat==="todos"?"active":""}" data-chip="todos">Todos <span class="cnt">${PRODUCTS.length}</span></button>`;
  CAT_ORDER.forEach(cat=>{ html+=`<button class="chip ${state.cat===cat?"active":""}" data-chip="${cat}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" style="width:15px;height:15px">${CATS[cat].ic}</svg> ${cat} <span class="cnt">${counts[cat]}</span></button>`; });
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

/* ============================================================ BUSCA INTELIGENTE */
function renderSuggest(q){
  const box=$("#suggest"); q=q.trim();
  if(q.length<2){ box.classList.remove("open"); box.innerHTML=""; $("#search").setAttribute("aria-expanded","false"); return; }
  const ql=q.toLowerCase(); const matches=[];
  for(const p of PRODUCTS){ if((p.n+" "+p.b+" "+p.c).toLowerCase().includes(ql)){ matches.push(p); if(matches.length>=7) break; } }
  if(!matches.length){ box.innerHTML='<div class="suggest-head">Nada encontrado para "'+q+'"</div>'; box.classList.add("open"); return; }
  const esc=q.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"); const hl=s=>s.replace(new RegExp("("+esc+")","ig"),"<b>$1</b>");
  box.innerHTML='<div class="suggest-head">Sugestões</div>'+matches.map(p=>
    `<div class="suggest-item" data-open="${p.id}"><div class="suggest-thumb" style="background:linear-gradient(145deg,${CATS[p.c].tile[0]},${CATS[p.c].tile[1]})">${productArt(p)}</div><div class="suggest-info"><div class="suggest-name">${hl(p.n)} <span style="opacity:.55">${p.v}</span></div><div class="suggest-meta">${p.b} · ${p.c}</div></div><div class="suggest-price">${money(effPrice(p))}</div></div>`).join("");
  box.classList.add("open"); $("#search").setAttribute("aria-expanded","true");
}
function closeSuggest(){ $("#suggest").classList.remove("open"); }

/* ============================================================ MARCAS */
function initBrands(){
  const brands=[...new Set(PRODUCTS.map(p=>p.b))].sort();
  $("#brandFilter").innerHTML='<option value="">Todas as marcas</option>'+brands.map(b=>`<option>${b}</option>`).join("");
  const show=brands.filter(b=>!["Energético","Batata","Água Mineral"].includes(b));
  $("#brandTrack").innerHTML=[...show,...show].map(b=>`<button class="brand-item" data-brand="${b}">${b}</button>`).join("");
}
function applyBrand(b){
  state.brand=b; state.special=""; state.cat="todos"; state.q=""; $("#search").value="";
  $("#brandFilter").value=b; closeSuggest(); renderChips(); renderFilterChips(); renderCatalog();
  window.scrollTo({top:$("#catalogo").offsetTop-60,behavior:"smooth"});
}

/* ============================================================ CARRINHO */
function addToCart(id,qty,srcEl){
  const p=PRODUCTS[id];
  if(state.cart[id]) state.cart[id].q+=qty; else state.cart[id]={p,q:qty};
  if(srcEl) flyToCart(srcEl);
  bumpCart(); updateCartUI(); toast(p.n+" adicionado ao pedido");
}
function setQty(id,q){ if(q<=0) delete state.cart[id]; else if(state.cart[id]) state.cart[id].q=q; else state.cart[id]={p:PRODUCTS[id],q}; updateCartUI(); }
function clearCart(){ state.cart={}; updateCartUI(); toast("Pedido limpo"); }
function cartTotals(){ let qty=0,val=0; Object.values(state.cart).forEach(({p,q})=>{qty+=q; val+=q*unitPrice(p);}); return {qty,val,lines:Object.keys(state.cart).length}; }
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

/* ============================================================ PEDIDO (varejo/atacado + formulário) */
function emptyCart(){
  return `<div class="cart-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="9" cy="21" r="1.5"/><circle cx="18" cy="21" r="1.5"/><path d="M2.5 3h2l2.2 12.4a1.5 1.5 0 0 0 1.5 1.2h9.1a1.5 1.5 0 0 0 1.5-1.2L21 7H6"/></svg><h3>Seu pedido está vazio</h3><p>Adicione produtos do catálogo para começar.</p></div>`;
}
function renderDrawer(){
  const body=$("#drawerBody"); const entries=Object.entries(state.cart); const atac=state.buyMode==="atacado";
  const head=`<div class="quote-head">
      <div class="qh-top"><span class="qh-badge">Orçamento</span><span class="qh-no">${state.orderNo}</span></div>
      <div class="qh-date">Data: ${state.orderDate}</div>
    </div>
    <div class="buy-mode">
      <div class="bm-label">Como deseja comprar?</div>
      <div class="bm-opts">
        <button class="bm-opt ${!atac?"active":""}" data-mode="varejo"><span class="bm-dot"></span>Varejo</button>
        <button class="bm-opt ${atac?"active":""}" data-mode="atacado"><span class="bm-dot"></span>Atacado</button>
      </div>
      <p class="bm-hint">${atac?"Preços de atacado aplicados. Preencha os dados para o orçamento.":"Preços de varejo aplicados."}</p>
    </div>
    <div class="quote-fields">
      <input id="cliName" placeholder="Nome${atac?"":" (opcional)"}" value="${state._cli||""}" autocomplete="name">
      <input id="cliPhone" placeholder="Telefone / WhatsApp" value="${state._fone||""}" autocomplete="tel">
      ${atac?`<input id="cliEmp" placeholder="Empresa" value="${state._empresa||""}" autocomplete="organization"><input id="cliCnpj" placeholder="CNPJ" value="${state._cnpj||""}">`:""}
    </div>`;
  if(!entries.length){ body.innerHTML=head+emptyCart(); wireQuoteFields(); return; }
  const items=entries.map(([id,{p,q}])=>`
    <div class="cart-item">
      <div class="thumb" style="background:linear-gradient(145deg,${CATS[p.c].tile[0]},${CATS[p.c].tile[1]})">${p.n.slice(0,2).toUpperCase()}</div>
      <div class="ci-body">
        <div class="ci-name">${p.n}</div>
        <div class="ci-meta">${p.v} · ${money(unitPrice(p))}/un ${state.buyMode}</div>
        <div class="ci-row">
          <div class="qty"><button data-deci="${id}">−</button><span>${q}</span><button data-inci="${id}">+</button></div>
          <div style="display:flex;align-items:center;gap:.7rem">
            <span class="ci-price">${money(q*unitPrice(p))}</span>
            <button class="ci-remove" data-rmi="${id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14"/></svg></button>
          </div>
        </div>
      </div>
    </div>`).join("");
  const obs=`<div class="obs"><label for="obsField">Observações do pedido</label><textarea id="obsField" placeholder="Ex: entrega no bairro X, pagar no PIX…">${state._obs||""}</textarea></div>`;
  body.innerHTML=head+items+obs; wireQuoteFields();
}
function wireQuoteFields(){
  const set=(id,k)=>{ const el=$(id); if(el) el.oninput=e=>state[k]=e.target.value; };
  set("#cliName","_cli"); set("#cliPhone","_fone"); set("#cliEmp","_empresa"); set("#cliCnpj","_cnpj"); set("#obsField","_obs");
}

/* ============================================================ WHATSAPP */
function buildMessage(){
  const t=cartTotals(); const atac=state.buyMode==="atacado";
  let m="*PEDIDO DE ORÇAMENTO*\n*"+CONFIG.storeName+"*\n\n";
  m+="*Tipo de compra:* "+(atac?"Atacado":"Varejo")+"\n";
  if(state._cli && state._cli.trim())    m+="*Nome:* "+state._cli.trim()+"\n";
  if(atac && state._empresa && state._empresa.trim()) m+="*Empresa:* "+state._empresa.trim()+"\n";
  if(state._fone && state._fone.trim())   m+="*Telefone:* "+state._fone.trim()+"\n";
  if(atac && state._cnpj && state._cnpj.trim())     m+="*CNPJ:* "+state._cnpj.trim()+"\n";
  m+="\n--------------------------------\n*PRODUTOS*\n--------------------------------\n";
  Object.values(state.cart).forEach(({p,q})=>{ m+="\n• "+p.n+" ("+p.v+")\n   Qtd: "+q+"  —  "+money(q*unitPrice(p))+"\n"; });
  m+="\n--------------------------------\n";
  m+="*Itens:* "+t.qty+"    *Produtos:* "+t.lines+"\n";
  m+="*Valor estimado ("+state.buyMode+"):* "+money(t.val)+"\n";
  if(state._obs && state._obs.trim()) m+="\n*Observações:* "+state._obs.trim()+"\n";
  m+="\n_Aguardo retorno. Obrigado!_";
  return m;
}
function finishOrder(){ if(!cartTotals().lines) return; window.open("https://wa.me/"+CONFIG.whatsapp+"?text="+encodeURIComponent(buildMessage()),"_blank"); }

/* ============================================================ MODAL (simplificado) */
let pmState={id:null};
function similarProducts(p){
  const brand=PRODUCTS.filter(x=>x.b===p.b && x.id!==p.id);
  const cat=PRODUCTS.filter(x=>x.c===p.c && x.b!==p.b && x.id!==p.id);
  const seen=new Set(); const out=[];
  [...brand,...cat].forEach(x=>{ if(!seen.has(x.id)&&out.length<3){seen.add(x.id);out.push(x);} });
  return out;
}
function relCard(p){
  return `<div class="rel-card" data-open="${p.id}"><div class="rel-media" style="--tile:linear-gradient(145deg,${CATS[p.c].tile[0]},${CATS[p.c].tile[1]})">${productArt(p)}</div><div class="rel-body"><div class="rel-name">${p.n}</div><div class="rel-price">${money(effPrice(p))}</div></div></div>`;
}
function modalHTML(p){
  const c=CATS[p.c], av=availOf(p);
  const priceVarejo = p.promo ? '<span class="val"><s>'+money(p.vu)+'</s>'+money(p.pp)+'</span>' : '<span class="val">'+money(p.vu)+'</span>';
  const sim=similarProducts(p);
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
          <div class="pm-price-box hl"><small>${p.promo?"Oferta varejo (un)":"Varejo (un)"}</small>${priceVarejo}</div>
          <div class="pm-price-box"><small>Atacado (un)</small><span class="val">${money(p.au)}</span></div>
        </div>
        <div class="pm-buy">
          <div class="qty"><button id="pmDec">−</button><span id="pmQty">1</span><button id="pmInc">+</button></div>
          <button class="pm-add rippleable" id="pmAdd"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12h14"/></svg>Adicionar ao Pedido</button>
        </div>
      </div>
    </div>
    ${sim.length?`<div class="pm-related"><h4>Produtos semelhantes</h4><div class="rel-row">${sim.map(relCard).join("")}</div></div>`:""}
  </div>`;
}
function openProduct(id){
  const p=PRODUCTS[id]; pmState={id};
  $("#pmodal").innerHTML=modalHTML(p);
  $("#pmodal").classList.add("open"); $("#pmOverlay").classList.add("open");
  document.body.style.overflow="hidden"; try{history.replaceState(null,"","#p="+p.slug);}catch(e){} $("#pmodal").scrollTop=0;
}
function closeProduct(){
  $("#pmodal").classList.remove("open"); $("#pmOverlay").classList.remove("open"); document.body.style.overflow="";
  if(location.hash.indexOf("#p=")===0){ try{history.replaceState(null,"",location.pathname+location.search);}catch(e){} }
}

/* ============================================================ TOAST + REVEAL + DRAWER OPEN/CLOSE */
let toastT;
function toast(msg){ $("#toastMsg").textContent=msg; $("#toast").classList.add("show"); clearTimeout(toastT); toastT=setTimeout(()=>$("#toast").classList.remove("show"),2000); }
let io;
function observeReveal(){ if(io) io.disconnect(); io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target)}}),{threshold:.08}); $$(".reveal:not(.in)").forEach(el=>io.observe(el)); }
function openDrawer(){ $("#drawer").classList.add("open"); $("#overlay").classList.add("open"); document.body.style.overflow="hidden"; }
function closeDrawer(){ $("#drawer").classList.remove("open"); $("#overlay").classList.remove("open"); document.body.style.overflow=""; }

/* ============================================================ EVENTS */
function bind(){
  $("#chips").addEventListener("click",e=>{ const b=e.target.closest("[data-chip]"); if(!b)return; state.cat=b.dataset.chip; state.brand=""; $("#brandFilter").value=""; renderChips(); renderCatalog(); window.scrollTo({top:$("#catalogo").offsetTop-60,behavior:"smooth"}); });
  $("#fchips").addEventListener("click",e=>{ const b=e.target.closest("[data-f]"); if(!b)return; if(b.dataset.f==="fav"&&!state.favs.size){toast("Você ainda não favoritou nada");return;} state.special=b.dataset.f; renderFilterChips(); renderCatalog(); window.scrollTo({top:$("#catalogo").offsetTop-60,behavior:"smooth"}); });
  const si=$("#search");
  si.addEventListener("input",e=>{ state.q=e.target.value; renderSuggest(e.target.value); renderCatalog(); });
  si.addEventListener("focus",e=>{ if(e.target.value.trim().length>=2) renderSuggest(e.target.value); });
  document.addEventListener("click",e=>{ if(!e.target.closest(".search")) closeSuggest(); });
  $("#suggest").addEventListener("click",e=>{ const it=e.target.closest("[data-open]"); if(!it)return; closeSuggest(); openProduct(+it.dataset.open); });
  $("#brandFilter").addEventListener("change",e=>{ state.brand=e.target.value; state.special=""; renderFilterChips(); renderCatalog(); });
  $("#priceFilter").addEventListener("change",e=>{ state.price=e.target.value; renderCatalog(); });
  $$(".sort-toggle button").forEach(b=>b.addEventListener("click",()=>{ $$(".sort-toggle button").forEach(x=>x.classList.remove("on")); b.classList.add("on"); state.sort=b.dataset.sort; renderCatalog(); }));
  // catálogo: abrir modal ou ações do card
  $("#catalogArea").addEventListener("click",e=>{
    const fav=e.target.closest("[data-fav]"), inc=e.target.closest("[data-inc]"), dec=e.target.closest("[data-dec]"), add=e.target.closest("[data-add]");
    if(fav){ e.stopPropagation(); toggleFav(+fav.dataset.fav); return; }
    if(inc){ const s=document.querySelector(`[data-q="${inc.dataset.inc}"]`); s.textContent=+s.textContent+1; return; }
    if(dec){ const s=document.querySelector(`[data-q="${dec.dataset.dec}"]`); if(+s.textContent>1)s.textContent=+s.textContent-1; return; }
    if(add){ const id=+add.dataset.add; const q=+document.querySelector(`[data-q="${id}"]`).textContent; addToCart(id,q,add.closest(".card")); add.classList.add("added"); const sp=add.querySelector("span"); if(sp)sp.textContent="Adicionado ✓"; setTimeout(()=>{add.classList.remove("added"); if(sp)sp.textContent="Adicionar";},1100); return; }
    const openEl=e.target.closest("[data-open]"); if(openEl) openProduct(+openEl.dataset.open);
  });
  // drawer
  $("#drawerBody").addEventListener("click",e=>{
    const mode=e.target.closest("[data-mode]");
    if(mode){ state.buyMode=mode.dataset.mode; updateCartUI(); return; }
    const inc=e.target.closest("[data-inci]"), dec=e.target.closest("[data-deci]"), rm=e.target.closest("[data-rmi]");
    if(inc){ const id=+inc.dataset.inci; setQty(id,(state.cart[id]?.q||0)+1); }
    if(dec){ const id=+dec.dataset.deci; setQty(id,(state.cart[id]?.q||0)-1); }
    if(rm){ setQty(+rm.dataset.rmi,0); }
  });
  // modal
  $("#pmodal").addEventListener("click",e=>{
    if(e.target.closest("#pmClose")){ closeProduct(); return; }
    if(e.target.closest("#pmInc")){ const s=$("#pmQty"); s.textContent=+s.textContent+1; return; }
    if(e.target.closest("#pmDec")){ const s=$("#pmQty"); if(+s.textContent>1)s.textContent=+s.textContent-1; return; }
    if(e.target.closest("#pmAdd")){ addToCart(pmState.id,+$("#pmQty").textContent,$(".pm-main")); return; }
    const rel=e.target.closest(".rel-card[data-open]"); if(rel){ openProduct(+rel.dataset.open); return; }
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
  $("#heroOrder").addEventListener("click",()=>{ cartTotals().lines?openDrawer():window.scrollTo({top:$("#catalogo").offsetTop-60,behavior:"smooth"}); });
  $("#footWpp").addEventListener("click",e=>{ e.preventDefault(); window.open("https://wa.me/"+CONFIG.whatsapp,"_blank"); });
  $("#favNav").addEventListener("click",()=>{ if(!state.favs.size){toast("Você ainda não favoritou nada");return;} state.special="fav"; renderFilterChips(); renderCatalog(); window.scrollTo({top:$("#catalogo").offsetTop-60,behavior:"smooth"}); });
  $("#themeBtn").addEventListener("click",()=>{ const dark=document.documentElement.getAttribute("data-theme")==="dark"; document.documentElement.setAttribute("data-theme",dark?"light":"dark"); $("#moonIco").innerHTML=dark?'<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>':'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2m-3-7-1.5 1.5M6.5 17.5 5 19m0-14 1.5 1.5M17.5 17.5 19 19"/>'; });
  window.addEventListener("scroll",()=>{ $("#topBtn").classList.toggle("show",window.scrollY>600); });
  $("#topBtn").addEventListener("click",()=>window.scrollTo({top:0,behavior:"smooth"}));
  document.addEventListener("click",e=>{ const el=e.target.closest(".rippleable"); if(!el)return; const r=el.getBoundingClientRect(); const s=document.createElement("span"); s.className="ripple"; const d=Math.max(r.width,r.height); s.style.width=s.style.height=d+"px"; s.style.left=(e.clientX-r.left-d/2)+"px"; s.style.top=(e.clientY-r.top-d/2)+"px"; el.appendChild(s); setTimeout(()=>s.remove(),600); });
  document.addEventListener("keydown",e=>{ if(e.key==="Escape"){ closeSuggest(); if($("#pmodal").classList.contains("open"))closeProduct(); else if($("#drawer").classList.contains("open"))closeDrawer(); } });
  window.addEventListener("hashchange",handleHash);
}
function toggleFav(id){ state.favs.has(id)?state.favs.delete(id):state.favs.add(id); $$(`[data-fav="${id}"]`).forEach(b=>b.classList.toggle("on",state.favs.has(id))); if(state.special==="fav") renderCatalog(); }
function handleHash(){ const m=location.hash.match(/^#p=(.+)$/); if(!m)return; const p=PRODUCTS.find(x=>x.slug===decodeURIComponent(m[1])); if(p) openProduct(p.id); }

/* ============================================================ INIT */
function init(){
  const now=new Date();
  state.orderNo="JE7-"+now.getFullYear()+String(now.getMonth()+1).padStart(2,"0")+String(now.getDate()).padStart(2,"0")+"-"+String(Math.floor(Math.random()*900+100));
  state.orderDate=now.toLocaleDateString("pt-BR");
  $("#year").textContent=now.getFullYear(); $("#stProducts").textContent=PRODUCTS.length;
  renderChips(); renderFilterChips(); initBrands(); renderCatalog(); updateCartUI(); bind(); handleHash();
  setTimeout(()=>$("#loader").classList.add("hide"),700);
}
document.addEventListener("DOMContentLoaded",init);
if("serviceWorker" in navigator && location.protocol==="https:"){ window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{})); }
