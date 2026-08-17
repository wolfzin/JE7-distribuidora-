/* ============================================================
   PAINEL ADMINISTRATIVO JE7 — sem backend/login.
   Edita em memória + rascunho no localStorage; exporta data.js
   pronto para substituir no servidor. Prepara a base para um
   backend real no futuro (mesma estrutura de dados).
   ============================================================ */
const LS={p:"je7_admin_products",c:"je7_admin_cats",o:"je7_admin_order"};
const DEFAULT_IC='<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M3 7l3-4h12l3 4"/>';
let items, cats, order, tab="produtos", editIdx=null;

/* ---------- LEITURA DE PRODUTOS (Supabase) ---------- */
/* items agora vem de public.products (via admin-data.js), não mais do data.js. */
let prodState="init";     // init | loading | ready | error
let prodError=null, prodLoading=false, prodSeq=0;
async function refreshProducts(force){
  if(prodLoading) return;
  if(prodState==="ready" && !force) return;
  prodLoading=true; prodState="loading"; prodError=null;
  if(tab==="produtos") renderProducts();
  const seq=++prodSeq;
  try{
    const rows=await adminLoadProducts();        // admin-data.js
    if(seq!==prodSeq) return;
    items=rows; prodState="ready";
  }catch(e){
    if(seq!==prodSeq) return;
    console.error("Admin: falha ao carregar produtos do Supabase:", e);
    prodError=e; items=[]; prodState="error";
  }finally{ prodLoading=false; }
  if(tab==="produtos") renderProducts();
}
/* ganchos chamados por admin-auth.js */
window.onAdminAuthed=()=>{ refreshProducts(); if(tab==="categorias") refreshCategories(true); if(tab==="marcas") refreshBrands(true); };
window.onAdminLoggedOut=()=>{ prodState="init"; items=[]; catState="init"; catItems=[]; catCounts={}; brandState="init"; brandItems=[]; };

/* ---------- CATEGORIAS (Supabase) ---------- */
let catState="init", catError=null, catLoading=false, catSeq=0, catItems=[], catCounts={};
async function refreshCategories(force){
  if(catLoading) return;
  if(catState==="ready" && !force) return;
  catLoading=true; catState="loading"; catError=null;
  if(tab==="categorias") renderCats();
  const seq=++catSeq;
  try{
    const [list,counts]=await Promise.all([adminLoadCategories(), adminCategoryCounts()]);
    if(seq!==catSeq) return;
    catItems=list; catCounts=counts; catState="ready";
  }catch(e){
    if(seq!==catSeq) return;
    console.error("Admin: falha ao carregar categorias do Supabase:", e);
    catError=e; catItems=[]; catState="error";
  }finally{ catLoading=false; }
  if(tab==="categorias") renderCats();
}
function friendlyWrite(e, action){
  const m=((e&&(e.message||e.error_description))||"").toLowerCase();
  if(m.includes("row-level security")||m.includes("permission")||m.includes("denied")||m.includes("not authorized")) return "Sem permissão para "+action+". Faça login novamente.";
  if(m.includes("duplicate")||m.includes("unique")) return "Já existe um registro com esse valor.";
  if(m.includes("failed to fetch")||m.includes("network")||m.includes("fetch")) return "Falha de conexão. Tente novamente.";
  return "Erro ao "+action+".";
}

function shade(hex,p){ const h=hex.replace("#",""); const n=parseInt(h.length===3?h.replace(/(.)/g,"$1$1"):h,16); let r=(n>>16)&255,g=(n>>8)&255,b=n&255; r=Math.round(r+(p<0?r*p:(255-r)*p)); g=Math.round(g+(p<0?g*p:(255-g)*p)); b=Math.round(b+(p<0?b*p:(255-b)*p)); return "#"+[r,g,b].map(x=>x.toString(16).padStart(2,"0")).join(""); }
const slug=s=>s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
const money=n=>"R$ "+(+n||0).toFixed(2).replace(".",",");
const $=s=>document.querySelector(s);

/* ---------- persistência ---------- */
function load(){
  // PRODUTOS: agora vêm do Supabase (ver refreshProducts). Categorias e
  // marcas também são carregadas do Supabase nas respectivas abas.
  items=[];
  try{cats=JSON.parse(localStorage.getItem(LS.c))}catch(e){cats=null}
  if(!cats) cats=JSON.parse(JSON.stringify(CATS));
  try{order=JSON.parse(localStorage.getItem(LS.o))}catch(e){order=null}
  if(!order) order=JSON.parse(JSON.stringify(CAT_ORDER));
}
function save(){ localStorage.setItem(LS.p,JSON.stringify(items)); localStorage.setItem(LS.c,JSON.stringify(cats)); localStorage.setItem(LS.o,JSON.stringify(order)); markDirty(); }
function restore(){ if(!confirm("Descartar todas as alterações e voltar ao data.js original?"))return; localStorage.removeItem(LS.p);localStorage.removeItem(LS.c);localStorage.removeItem(LS.o); load(); renderAll(); toast("Restaurado do arquivo original"); }
let dirty=false;
function markDirty(){ dirty=true; $("#dirtyDot").style.display="inline-block"; }

/* ---------- util UI ---------- */
let tT; function toast(m){ const t=$("#toast"); t.textContent=m; t.classList.add("show"); clearTimeout(tT); tT=setTimeout(()=>t.classList.remove("show"),2200); }
function brandList(){ return [...new Set(items.map(p=>p.b))].sort(); }
function thumb(p){
  if(p.img) return `<img class="th" src="${p.img}" alt="" onerror="this.outerHTML='<span class=&quot;th ph&quot;>${(p.n||'?').slice(0,2).toUpperCase()}</span>'">`;
  const t=cats[p.c]?cats[p.c].tile:["#eee","#ddd"];
  return `<span class="th ph" style="background:linear-gradient(135deg,${t[0]},${t[1]})">${(p.n||'?').slice(0,2).toUpperCase()}</span>`;
}

/* ============================================================ TABS */
function switchTab(t){ tab=t; document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("on",b.dataset.tab===t)); document.querySelectorAll(".panel").forEach(p=>p.classList.toggle("show",p.id==="tab-"+t)); renderAll(); if(t==="categorias") refreshCategories(); if(t==="marcas") refreshBrands(); }
function renderAll(){ if(tab==="produtos")renderProducts(); else if(tab==="categorias")renderCats(); else renderBrands(); }

/* ============================================================ PRODUTOS */
function renderProducts(){
  const tbody=$("#prodTable"), cnt=$("#prodCount");
  if(prodState==="init"||prodState==="loading"){
    if(cnt) cnt.textContent="Carregando…";
    if(tbody) tbody.innerHTML=`<tr><td colspan="7" class="empty">Carregando produtos do servidor…</td></tr>`;
    return;
  }
  if(prodState==="error"){
    if(cnt) cnt.textContent="";
    if(tbody) tbody.innerHTML=`<tr><td colspan="7" class="empty">Não foi possível carregar os produtos do servidor.<br><button class="btn" id="prodRetry" style="margin-top:.7rem">Tentar novamente</button></td></tr>`;
    const r=$("#prodRetry"); if(r) r.onclick=()=>refreshProducts(true);
    return;
  }
  const q=($("#prodSearch").value||"").toLowerCase();
  const rows=items.map((p,i)=>({p,i})).filter(({p})=>!q||(p.n+" "+p.b+" "+p.c+" "+(p.legacy_id||"")).toLowerCase().includes(q));
  if(cnt) cnt.textContent=items.length+" produtos"+(q?` · ${rows.length} no filtro`:"");
  $("#prodTable").innerHTML=rows.map(({p,i})=>`
    <tr${p.active?"":' style="opacity:.55"'}>
      <td>${thumb(p)}</td>
      <td><b>${p.n}</b><div class="sub">${p.v||""}${p.legacy_id?` · cód. ${p.legacy_id}`:""}</div></td>
      <td>${p.b||"—"}</td>
      <td><span class="pill">${p.c||"—"}</span></td>
      <td>${p.au==null?"—":money(p.au)}</td>
      <td class="flags">${p.active?"":'<span class="pill" style="background:#f3d6d6;color:#a33">Inativo</span> '}${p.f?'<span class="fl f">D</span>':''}${p.bs?'<span class="fl b">V</span>':''}${p.nv?'<span class="fl n">N</span>':''}${p.promo?'<span class="fl p">%</span>':''}</td>
      <td class="acts">
        <button class="ic" data-edit="${i}" title="Ver / editar"><svg viewBox="0 0 24 24"><path d="M4 20h4L18 10l-4-4L4 16v4Zm10-14 4 4"/></svg></button>
      </td>
    </tr>`).join("") || `<tr><td colspan="7" class="empty">${q?"Nenhum produto para essa busca.":"Nenhum produto."}</td></tr>`;
}
async function openForm(i){
  editIdx = (i===null||i===undefined)?null:i;

  /* As listas de categorias/marcas vêm do Supabase. Se ainda não carregaram,
     garantimos a carga antes de montar o formulário. */
  try{
    await Promise.all([
      brandState==="ready" ? Promise.resolve() : refreshBrands(true),
      catState==="ready" ? Promise.resolve() : refreshCategories(true)
    ]);
  }catch(e){
    console.error("Admin: falha ao preparar formulário:", e);
    toast("Não foi possível carregar categorias/marcas.");
    return;
  }

  const p = editIdx===null
    ? {id:null,legacy_id:"",n:"",b:"",c:"",category_id:null,brand_id:null,v:"",vu:0,au:0,pp:null,promo:false,f:false,bs:false,nv:false,active:true}
    : JSON.parse(JSON.stringify(items[i]));

  const categoryOptions = catItems.map(c =>
    `<option value="${c.id}" ${c.id===p.category_id?"selected":""}>${c.name}${c.active?"":" (inativa)"}</option>`
  ).join("");

  const brandOptions = brandItems.map(b =>
    `<option value="${b.id}" ${b.id===p.brand_id?"selected":""}>${b.name}${b.active?"":" (inativa)"}</option>`
  ).join("");

  $("#formRoot").innerHTML=`
    <div class="ov" id="formOv"></div>
    <div class="sheet">
      <div class="sheet-head">
        <h3>${editIdx===null?"Novo produto":"Editar produto"}</h3>
        <button class="ic" id="formClose" title="Fechar"><svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
      </div>

      <div class="sheet-body">
        <div class="f2">
          <label>Código / legacy_id
            <input id="f_legacy" value="${p.legacy_id||""}" placeholder="Ex.: 217">
          </label>
          <label>Volume
            <input id="f_v" value="${p.v||""}" placeholder="2L, 350ml, 1kg…">
          </label>
          <label>Nome
            <input id="f_n" value="${p.n||""}" placeholder="Nome do produto">
          </label>
          <label>Categoria
            <select id="f_c">
              <option value="">Sem categoria</option>
              ${categoryOptions}
            </select>
          </label>
          <label>Marca
            <select id="f_b">
              <option value="">Sem marca</option>
              ${brandOptions}
            </select>
          </label>
        </div>

        <div class="grp">Preços</div>
        <div class="f2">
          <label>Varejo / unidade
            <input type="number" min="0" step="0.01" id="f_vu" value="${p.vu??0}">
          </label>
          <label>Atacado / unidade
            <input type="number" min="0" step="0.01" id="f_au" value="${p.au??0}">
          </label>
          <label>Preço promocional
            <input type="number" min="0" step="0.01" id="f_pp" value="${p.pp??""}">
          </label>
        </div>

        <div class="grp">Marcações</div>
        <div class="chk">
          <label class="c"><input type="checkbox" id="f_f" ${p.f?"checked":""}> Destaque</label>
          <label class="c"><input type="checkbox" id="f_bs" ${p.bs?"checked":""}> Mais vendido</label>
          <label class="c"><input type="checkbox" id="f_nv" ${p.nv?"checked":""}> Novidade</label>
          <label class="c"><input type="checkbox" id="f_promo" ${p.promo?"checked":""}> Promoção</label>
          <label class="c"><input type="checkbox" id="f_active" ${p.active!==false?"checked":""}> Produto ativo</label>
        </div>

        <div class="grp">Imagem</div>
        <p class="hint">A migração das imagens fica para a próxima etapa. Por enquanto o formulário não altera o Storage.</p>
      </div>

      <div class="sheet-foot">
        <span>${editIdx!==null && p.active===false ? '<span class="pill" style="background:#f3d6d6;color:#a33">Inativo</span>' : ""}</span>
        <div>
          <button class="btn ghost" id="formCancel">Cancelar</button>
          <button class="btn" id="formSave">Salvar</button>
        </div>
      </div>
    </div>`;

  $("#f_promo").onchange=e=>{
    $("#f_pp").disabled=!e.target.checked;
    if(!e.target.checked) $("#f_pp").value="";
  };
  $("#f_pp").disabled=!p.promo;

  $("#formClose").onclick=$("#formCancel").onclick=closeForm;
  $("#formOv").onclick=closeForm;
  $("#formSave").onclick=saveForm;
}

function closeForm(){ $("#formRoot").innerHTML=""; }

async function saveForm(){
  const num=id=>{
    const v=parseFloat($(id).value);
    return Number.isFinite(v) ? v : 0;
  };
  const legacy=$("#f_legacy").value.trim();
  const name=$("#f_n").value.trim();
  const volume=$("#f_v").value.trim();
  const categoryId=$("#f_c").value || null;
  const brandId=$("#f_b").value || null;
  const promo=$("#f_promo").checked;

  if(!legacy){ toast("Informe o código / legacy_id"); return; }
  if(!name){ toast("Informe o nome"); return; }

  /* Campos exatamente correspondentes à tabela public.products.
     Não enviamos campos legados de fardo, imagem ou qualquer coluna
     que não exista no modelo atual. */
  const payload={
    legacy_id: legacy,
    name,
    volume: volume || null,
    category_id: categoryId,
    brand_id: brandId,
    retail_price: num("#f_vu"),
    wholesale_price: num("#f_au"),
    promotion_price: promo ? num("#f_pp") : null,
    is_promotion: promo,
    is_featured: $("#f_f").checked,
    is_best_seller: $("#f_bs").checked,
    is_new: $("#f_nv").checked,
    active: $("#f_active").checked
  };

  const btn=$("#formSave");
  if(btn) btn.disabled=true;

  try{
    if(editIdx===null){
      await adminCreateProduct(payload);
      toast("Produto adicionado");
    }else{
      const current=items[editIdx];
      const updated=await adminUpdateProduct(current.id,payload);
      if(!updated){ toast("Não foi possível salvar o produto."); return; }
      toast("Produto salvo");
    }
    closeForm();
    await refreshProducts(true);
  }catch(e){
    console.error("Admin: falha ao salvar produto:", e);
    toast(friendlyWrite(e,"salvar produto"));
  }finally{
    if(btn) btn.disabled=false;
  }
}
/* ============================================================ CATEGORIAS */
// cor do swatch vem do mapa visual (theme/data.js) por NOME — Admin NÃO edita cor
const _CATNZ=(()=>{ const m={}; const nz=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().trim(); try{ Object.keys(CATS).forEach(k=>m[nz(k)]=CATS[k]); }catch(e){} return {m,nz}; })();
function catSwatch(name){ const t=_CATNZ.m[_CATNZ.nz(name)]; const g=t?t.tile:["#e6e6e6","#d4d4d4"]; return `linear-gradient(135deg,${g[0]},${g[1]})`; }
const ICO_ON='<svg viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
const ICO_OFF='<svg viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2M9.9 5.1A9.5 9.5 0 0 1 22 12a17 17 0 0 1-2.2 2.9M6.1 6.1A17 17 0 0 0 2 12s3.5 7 10 7a9.3 9.3 0 0 0 3.9-.8"/></svg>';

function renderCats(){
  const host=$("#catList"); if(!host) return;
  if(catState==="init"||catState==="loading"){ host.innerHTML=`<div class="empty" style="padding:1.2rem">Carregando categorias…</div>`; return; }
  if(catState==="error"){ host.innerHTML=`<div class="empty" style="padding:1.2rem">Não foi possível carregar as categorias do servidor.<br><button class="btn" id="catRetry" style="margin-top:.7rem">Tentar novamente</button></div>`; const r=$("#catRetry"); if(r) r.onclick=()=>refreshCategories(true); return; }
  if(!catItems.length){ host.innerHTML=`<div class="empty" style="padding:1.2rem">Nenhuma categoria cadastrada.</div>`; return; }
  host.innerHTML=catItems.map((c,i)=>{
    const count=catCounts[c.id]||0;
    return `<div class="catrow"${c.active?"":' style="opacity:.55"'}>
      <span class="swatch" style="background:${catSwatch(c.name)}"></span>
      <div class="catinfo"><b>${c.name}</b>${c.active?"":' <span class="pill" style="background:#f3d6d6;color:#a33">Inativa</span>'}<div class="sub">${count} produto(s) · ordem ${c.sort_order==null?"—":c.sort_order}</div></div>
      <div class="acts">
        <button class="ic" data-cup="${i}" ${i===0?"disabled":""} title="Subir"><svg viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6"/></svg></button>
        <button class="ic" data-cdn="${i}" ${i===catItems.length-1?"disabled":""} title="Descer"><svg viewBox="0 0 24 24"><path d="M12 5v14M6 13l6 6 6-6"/></svg></button>
        <button class="ic" data-cren="${c.id}" title="Renomear"><svg viewBox="0 0 24 24"><path d="M4 20h4L18 10l-4-4L4 16v4Zm10-14 4 4"/></svg></button>
        <button class="ic" data-cact="${c.id}" title="${c.active?"Desativar":"Ativar"}">${c.active?ICO_OFF:ICO_ON}</button>
        <button class="ic danger" data-cdel="${c.id}" ${count?"disabled":""} title="${count?"Só é possível excluir categoria sem produtos":"Excluir"}"><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13"/></svg></button>
      </div>
    </div>`;
  }).join("");
}
async function addCategory(){
  const name=($("#newCatName").value||"").trim();
  if(!name){ toast("Digite o nome da categoria"); return; }
  if(catItems.some(c=>(c.name||"").toLowerCase()===name.toLowerCase())){ toast("Categoria já existe"); return; }
  const maxOrder=catItems.reduce((m,c)=>Math.max(m, c.sort_order||0), 0);
  const btn=$("#addCatBtn"); if(btn) btn.disabled=true;
  try{
    await adminCreateCategory({ name, sort_order:maxOrder+1, active:true });
    $("#newCatName").value="";
    await refreshCategories(true);
    toast("Categoria adicionada");
  }catch(e){ console.error(e); toast(friendlyWrite(e,"adicionar categoria")); }
  finally{ if(btn) btn.disabled=false; }
}
async function renameCat(id){
  const c=catItems.find(x=>x.id===id); if(!c) return;
  const nn=prompt("Novo nome da categoria:", c.name); if(nn===null) return;
  const name=nn.trim(); if(!name||name===c.name) return;
  if(catItems.some(x=>x.id!==id && (x.name||"").toLowerCase()===name.toLowerCase())){ toast("Já existe categoria com esse nome"); return; }
  try{
    const r=await adminUpdateCategory(id,{ name });
    if(!r){ toast("Não foi possível renomear (sem permissão?)"); return; }
    await refreshCategories(true); toast("Categoria renomeada");
  }catch(e){ console.error(e); toast(friendlyWrite(e,"renomear categoria")); }
}
async function toggleCatActive(id){
  const c=catItems.find(x=>x.id===id); if(!c) return;
  try{
    const r=await adminUpdateCategory(id,{ active: !c.active });
    if(!r){ toast("Não foi possível alterar o status"); return; }
    await refreshCategories(true); toast(c.active?"Categoria desativada":"Categoria ativada");
  }catch(e){ console.error(e); toast(friendlyWrite(e,"alterar status")); }
}
async function moveCat(i,d){
  const j=i+d; if(j<0||j>=catItems.length) return;
  const a=catItems[i], b=catItems[j];
  const ao=a.sort_order, bo=b.sort_order;
  try{
    await adminUpdateCategory(a.id,{ sort_order: bo });
    await adminUpdateCategory(b.id,{ sort_order: ao });
    await refreshCategories(true);
  }catch(e){ console.error(e); toast(friendlyWrite(e,"reordenar")); }
}
async function delCat(id){
  const c=catItems.find(x=>x.id===id); if(!c) return;
  const count=catCounts[id]||0;
  if(count>0){ toast("Não é possível excluir: "+count+" produto(s) vinculado(s)."); return; }
  if(!confirm('Excluir a categoria "'+c.name+'"?')) return;
  try{
    const res=await adminDeleteCategory(id);
    if(res.error){ console.error(res.error); toast(friendlyWrite(res.error,"excluir categoria")); return; }
    if(res.blocked){ toast("Não foi possível excluir: a categoria possui produtos vinculados."); await refreshCategories(true); return; }
    await refreshCategories(true); toast("Categoria excluída");
  }catch(e){ console.error(e); toast(friendlyWrite(e,"excluir categoria")); }
}

/* ============================================================ MARCAS (Supabase) */
let brandState="init", brandError=null, brandLoading=false, brandSeq=0, brandItems=[];

function brandSwatch(name){
  const raw=(name||"").trim();
  if(typeof BRAND_COLORS!=="undefined"){
    const exact=BRAND_COLORS[raw];
    if(exact) return exact;
    const key=Object.keys(BRAND_COLORS).find(k=>k.toLowerCase()===raw.toLowerCase());
    if(key) return BRAND_COLORS[key];
  }
  return "#f0f0f0";
}

async function refreshBrands(force){
  if(brandLoading) return;
  if(brandState==="ready" && !force) return;
  brandLoading=true; brandState="loading"; brandError=null;
  if(tab==="marcas") renderBrands();
  const seq=++brandSeq;
  try{
    const rows=await adminLoadBrands();
    if(seq!==brandSeq) return;
    brandItems=rows;
    brandState="ready";
    const dl=$("#brandsDL");
    if(dl) dl.innerHTML=brandItems.map(b=>`<option value="${b.name}">`).join("");
  }catch(e){
    if(seq!==brandSeq) return;
    console.error("Admin: falha ao carregar marcas do Supabase:", e);
    brandError=e; brandItems=[]; brandState="error";
  }finally{ brandLoading=false; }
  if(tab==="marcas") renderBrands();
}

function brandProductCounts(){
  const counts={};
  items.forEach(p=>{
    if(p.brand_id) counts[p.brand_id]=(counts[p.brand_id]||0)+1;
  });
  return counts;
}

function renderBrands(){
  const host=$("#brandList"); if(!host) return;
  if(brandState==="init"||brandState==="loading"){
    host.innerHTML=`<div class="empty" style="padding:1.2rem">Carregando marcas…</div>`;
    return;
  }
  if(brandState==="error"){
    host.innerHTML=`<div class="empty" style="padding:1.2rem">Não foi possível carregar as marcas do servidor.<br><button class="btn" id="brandRetry" style="margin-top:.7rem">Tentar novamente</button></div>`;
    const r=$("#brandRetry"); if(r) r.onclick=()=>refreshBrands(true);
    return;
  }
  if(!brandItems.length){
    host.innerHTML=`<div class="empty" style="padding:1.2rem">Nenhuma marca cadastrada.</div>`;
    return;
  }
  const counts=brandProductCounts();
  host.innerHTML=brandItems.map(b=>{
    const count=counts[b.id]||0;
    return `<div class="catrow"${b.active?"":' style="opacity:.55"'}>
      <span class="swatch" style="background:${brandSwatch(b.name)};display:grid;place-items:center;font-weight:800;font-size:.7rem;color:#fff;text-shadow:0 1px 2px #0006">${(b.name||"?").slice(0,3).toUpperCase()}</span>
      <div class="catinfo"><b>${b.name}</b>${b.active?"":' <span class="pill" style="background:#f3d6d6;color:#a33">Inativa</span>'}<div class="sub">${count} produto(s)</div></div>
      <div class="acts">
        <button class="ic" data-bren="${b.id}" title="Renomear"><svg viewBox="0 0 24 24"><path d="M4 20h4L18 10l-4-4L4 16v4Zm10-14 4 4"/></svg></button>
        <button class="ic" data-bact="${b.id}" title="${b.active?"Desativar":"Ativar"}">${b.active?ICO_OFF:ICO_ON}</button>
      </div>
    </div>`;
  }).join("");
}

async function addBrand(){
  const name=($("#newBrandName").value||"").trim();
  if(!name){ toast("Digite o nome da marca"); return; }
  if(brandItems.some(b=>(b.name||"").toLowerCase()===name.toLowerCase())){ toast("Marca já existe"); return; }
  const btn=$("#addBrandBtn"); if(btn) btn.disabled=true;
  try{
    await adminCreateBrand({name, active:true});
    $("#newBrandName").value="";
    await refreshBrands(true);
    toast("Marca adicionada");
  }catch(e){ console.error(e); toast(friendlyWrite(e,"adicionar marca")); }
  finally{ if(btn) btn.disabled=false; }
}

async function renameBrand(id){
  const b=brandItems.find(x=>x.id===id); if(!b) return;
  const nn=prompt("Novo nome da marca:", b.name);
  if(nn===null) return;
  const name=nn.trim(); if(!name||name===b.name) return;
  if(brandItems.some(x=>x.id!==id && (x.name||"").toLowerCase()===name.toLowerCase())){ toast("Já existe marca com esse nome"); return; }
  try{
    const r=await adminUpdateBrand(id,{name});
    if(!r){ toast("Não foi possível renomear a marca"); return; }
    await refreshBrands(true);
    /* produtos já são JOINados pelo nome no próximo refresh; atualiza agora */
    await refreshProducts(true);
    $("#brandsDL").innerHTML=brandItems.map(x=>`<option value="${x.name}">`).join("");
    toast("Marca renomeada");
  }catch(e){ console.error(e); toast(friendlyWrite(e,"renomear marca")); }
}

async function toggleBrandActive(id){
  const b=brandItems.find(x=>x.id===id); if(!b) return;
  try{
    const r=await adminUpdateBrand(id,{active:!b.active});
    if(!r){ toast("Não foi possível alterar o status"); return; }
    await refreshBrands(true);
    toast(b.active?"Marca desativada":"Marca ativada");
  }catch(e){ console.error(e); toast(friendlyWrite(e,"alterar status")); }
}

/* ============================================================ EXPORT data.js */
function serP(p){
  const a=[]; const q=(k,v)=>a.push(k+":"+JSON.stringify(v)); const num=(k,v)=>a.push(k+":"+v);
  q("n",p.n); q("c",p.c); q("b",p.b); q("v",p.v);
  num("au",+p.au); num("ap",+p.ap); num("vp",+p.vp); num("vu",+p.vu); num("pk",+p.pk);
  if(p.f)num("f",1); if(p.bs)num("bs",1); if(p.nv)num("nv",1);
  if(p.promo){num("promo",1);num("pp",+p.pp);} if(p.av)q("av",p.av); if(p.img)q("img",p.img);
  return "{"+a.join(",")+"}";
}
function serCats(){ return "{\n"+order.map(n=>"  "+JSON.stringify(n)+":{ic:"+JSON.stringify(cats[n].ic)+",tile:"+JSON.stringify(cats[n].tile)+",tileD:"+JSON.stringify(cats[n].tileD)+"}").join(",\n")+"\n}"; }
function exportDataJs(){
  let s="/* ============================================================\n";
  s+="   DATA — JE7 (gerado pelo Painel Administrativo)\n";
  s+="   n=nome · c=categoria · b=marca · v=volume\n";
  s+="   au=atacado/un · ap=atacado/fardo · vp=varejo/fardo · vu=varejo/un · pk=un por fardo\n";
  s+="   Flags: f=destaque · bs=mais vendido · nv=novidade · promo+pp=oferta · av=disponibilidade\n";
  s+="   ============================================================ */\n";
  s+="const PRODUCTS = [\n"+items.map(p=>"  "+serP(p)).join(",\n")+"\n];\n\n";
  s+="const CATS = "+serCats()+";\n\n";
  s+="const CAT_ORDER = "+JSON.stringify(order)+";\n";
  const blob=new Blob([s],{type:"text/javascript"}); const url=URL.createObjectURL(blob);
  const a=document.createElement("a"); a.href=url; a.download="data.js"; a.click(); URL.revokeObjectURL(url);
  dirty=false; $("#dirtyDot").style.display="none";
  toast("data.js exportado — suba no servidor (pasta js/)");
}

/* ============================================================ INIT */
function init(){
  load();
  document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));
  $("#prodSearch").oninput=renderProducts;
  $("#newProdBtn").onclick=()=>openForm(null);
  $("#exportBtn").onclick=exportDataJs;
  $("#restoreBtn").onclick=restore;
  $("#addCatBtn").onclick=addCategory;
  $("#addBrandBtn").onclick=addBrand;
  // delegação
  $("#tab-produtos").addEventListener("click",e=>{
    const ed=e.target.closest("[data-edit]");
    if(ed) openForm(+ed.dataset.edit);
  });
  $("#tab-categorias").addEventListener("click",e=>{ const up=e.target.closest("[data-cup]"),dn=e.target.closest("[data-cdn]"),rn=e.target.closest("[data-cren]"),ac=e.target.closest("[data-cact]"),dl=e.target.closest("[data-cdel]"); if(up&&!up.disabled)moveCat(+up.dataset.cup,-1); else if(dn&&!dn.disabled)moveCat(+dn.dataset.cdn,1); else if(rn)renameCat(rn.dataset.cren); else if(ac)toggleCatActive(ac.dataset.cact); else if(dl&&!dl.disabled)delCat(dl.dataset.cdel); });
  $("#newCatName").addEventListener("keydown",e=>{ if(e.key==="Enter"){ e.preventDefault(); addCategory(); } });
  $("#newBrandName").addEventListener("keydown",e=>{ if(e.key==="Enter"){ e.preventDefault(); addBrand(); } });
  $("#tab-marcas").addEventListener("click",e=>{ const rn=e.target.closest("[data-bren]"),ac=e.target.closest("[data-bact]"); if(rn)renameBrand(rn.dataset.bren); else if(ac)toggleBrandActive(ac.dataset.bact); });
  $("#brandsDL").innerHTML=brandList().map(b=>`<option value="${b}">`).join("");
  switchTab("produtos");
}
document.addEventListener("DOMContentLoaded",init);
