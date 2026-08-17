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
window.onAdminAuthed=()=>{ refreshProducts(); };
window.onAdminLoggedOut=()=>{ prodState="init"; items=[]; };

function shade(hex,p){ const h=hex.replace("#",""); const n=parseInt(h.length===3?h.replace(/(.)/g,"$1$1"):h,16); let r=(n>>16)&255,g=(n>>8)&255,b=n&255; r=Math.round(r+(p<0?r*p:(255-r)*p)); g=Math.round(g+(p<0?g*p:(255-g)*p)); b=Math.round(b+(p<0?b*p:(255-b)*p)); return "#"+[r,g,b].map(x=>x.toString(16).padStart(2,"0")).join(""); }
const slug=s=>s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
const money=n=>"R$ "+(+n||0).toFixed(2).replace(".",",");
const $=s=>document.querySelector(s);

/* ---------- persistência ---------- */
function load(){
  // PRODUTOS: agora vêm do Supabase (ver refreshProducts). data.js segue só como
  // fallback de categorias/marcas (migração dessas tabelas é etapa futura).
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
function switchTab(t){ tab=t; document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("on",b.dataset.tab===t)); document.querySelectorAll(".panel").forEach(p=>p.classList.toggle("show",p.id==="tab-"+t)); renderAll(); }
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
        <button class="ic danger" data-del="${i}" title="Excluir"><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13"/></svg></button>
      </td>
    </tr>`).join("") || `<tr><td colspan="7" class="empty">${q?"Nenhum produto para essa busca.":"Nenhum produto."}</td></tr>`;
}
function openForm(i){
  editIdx = (i===null||i===undefined)?null:i;
  const p = editIdx===null ? {n:"",b:"",c:order[0]||"",v:"",au:0,ap:0,vp:0,vu:0,pk:1} : JSON.parse(JSON.stringify(items[i]));
  const autoPath = "images/products/"+slug((p.n||"produto")+"-"+(p.v||""))+".jpg";
  $("#formRoot").innerHTML=`
    <div class="ov" id="formOv"></div>
    <div class="sheet">
      <div class="sheet-head"><h3>${editIdx===null?"Novo produto":"Editar produto"}</h3><button class="ic" id="formClose"><svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>
      <div class="sheet-body">
        <div class="prev" id="prev">${thumb(p)}</div>
        <div class="f2">
          <label>Nome<input id="f_n" value="${p.n||""}"></label>
          <label>Volume<input id="f_v" value="${p.v||""}" placeholder="2L, 350ml, 1kg…"></label>
          <label>Marca<input id="f_b" list="brandsDL" value="${p.b||""}"></label>
          <label>Categoria<select id="f_c">${order.map(c=>`<option ${c===p.c?"selected":""}>${c}</option>`).join("")}</select></label>
        </div>
        <div class="grp">Preços</div>
        <div class="f4">
          <label>Varejo / un<input type="number" step="0.01" id="f_vu" value="${p.vu||0}"></label>
          <label>Atacado / un<input type="number" step="0.01" id="f_au" value="${p.au||0}"></label>
          <label>Varejo / fardo<input type="number" step="0.01" id="f_vp" value="${p.vp||0}"></label>
          <label>Atacado / fardo<input type="number" step="0.01" id="f_ap" value="${p.ap||0}"></label>
          <label>Un por fardo<input type="number" step="1" id="f_pk" value="${p.pk||1}"></label>
        </div>
        <div class="grp">Marcações</div>
        <div class="chk">
          <label class="c"><input type="checkbox" id="f_f" ${p.f?"checked":""}> Destaque</label>
          <label class="c"><input type="checkbox" id="f_bs" ${p.bs?"checked":""}> Mais vendido</label>
          <label class="c"><input type="checkbox" id="f_nv" ${p.nv?"checked":""}> Novidade</label>
          <label class="c"><input type="checkbox" id="f_promo" ${p.promo?"checked":""}> Promoção</label>
          <label id="ppWrap" style="${p.promo?"":"display:none"}">Preço promo (varejo)<input type="number" step="0.01" id="f_pp" value="${p.pp||""}"></label>
        </div>
        <div class="grp">Disponibilidade & imagem</div>
        <div class="f2">
          <label>Disponibilidade<select id="f_av"><option value="" ${!p.av?"selected":""}>Em estoque</option><option value="encomenda" ${p.av==="encomenda"?"selected":""}>Sob encomenda</option></select></label>
          <label>Imagem (caminho ou URL)<input id="f_img" value="${p.img||""}" placeholder="${autoPath}"></label>
        </div>
        <p class="hint">Deixe a imagem em branco para usar a busca automática (<code id="autoP">${autoPath}</code>) ou a silhueta. Para subir um arquivo, salve-o em <b>images/products/</b> com esse nome, ou cole uma URL.</p>
        <label class="file">Selecionar arquivo para pré-visualizar<input type="file" id="f_file" accept="image/*"></label>
      </div>
      <div class="sheet-foot">
        ${editIdx!==null?'<button class="btn ghost danger" id="formDel">Excluir</button>':'<span></span>'}
        <div><button class="btn ghost" id="formCancel">Cancelar</button><button class="btn" id="formSave">Salvar</button></div>
      </div>
    </div>`;
  const upd=()=>{ const n=$("#f_n").value,v=$("#f_v").value; $("#autoP").textContent="images/products/"+slug((n||"produto")+"-"+v)+".jpg"; };
  $("#f_n").oninput=upd; $("#f_v").oninput=upd;
  $("#f_promo").onchange=e=>$("#ppWrap").style.display=e.target.checked?"":"none";
  $("#f_img").oninput=e=>{ const p2={n:$("#f_n").value,c:$("#f_c").value,img:e.target.value}; $("#prev").innerHTML=thumb(p2); };
  $("#f_file").onchange=e=>{ const f=e.target.files[0]; if(!f)return; const r=new FileReader(); r.onload=()=>$("#prev").innerHTML=`<img class="th" src="${r.result}">`; r.readAsDataURL(f); toast("Pré-visualização apenas — salve o arquivo em images/products/"); };
  $("#formClose").onclick=$("#formCancel").onclick=closeForm; $("#formOv").onclick=closeForm;
  $("#formSave").onclick=saveForm;
  const del=$("#formDel"); if(del) del.onclick=()=>{ if(confirm("Excluir este produto?")){ items.splice(editIdx,1); save(); closeForm(); renderProducts(); toast("Produto excluído"); } };
}
function closeForm(){ $("#formRoot").innerHTML=""; }
function saveForm(){
  const num=id=>parseFloat($(id).value)||0;
  const p={
    n:$("#f_n").value.trim(), b:$("#f_b").value.trim(), c:$("#f_c").value, v:$("#f_v").value.trim(),
    vu:num("#f_vu"), au:num("#f_au"), vp:num("#f_vp"), ap:num("#f_ap"), pk:parseInt($("#f_pk").value)||1
  };
  if(!p.n){ toast("Informe o nome"); return; }
  if($("#f_f").checked)p.f=1; if($("#f_bs").checked)p.bs=1; if($("#f_nv").checked)p.nv=1;
  if($("#f_promo").checked){ p.promo=1; p.pp=parseFloat($("#f_pp").value)||p.vu; }
  if($("#f_av").value)p.av=$("#f_av").value;
  if($("#f_img").value.trim())p.img=$("#f_img").value.trim();
  if(editIdx===null) items.push(p); else items[editIdx]=p;
  save(); closeForm(); renderProducts(); toast(editIdx===null?"Produto adicionado":"Produto salvo");
}

/* ============================================================ CATEGORIAS */
function renderCats(){
  $("#catList").innerHTML=order.map((name,i)=>{
    const c=cats[name], count=items.filter(p=>p.c===name).length;
    return `<div class="catrow">
      <span class="swatch" style="background:linear-gradient(135deg,${c.tile[0]},${c.tile[1]})"></span>
      <div class="catinfo"><b>${name}</b><div class="sub">${count} produto(s)</div></div>
      <div class="acts">
        <button class="ic" data-cup="${i}" ${i===0?"disabled":""} title="Subir"><svg viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6"/></svg></button>
        <button class="ic" data-cdn="${i}" ${i===order.length-1?"disabled":""} title="Descer"><svg viewBox="0 0 24 24"><path d="M12 5v14M6 13l6 6 6-6"/></svg></button>
        <button class="ic" data-cren="${name}" title="Renomear"><svg viewBox="0 0 24 24"><path d="M4 20h4L18 10l-4-4L4 16v4Zm10-14 4 4"/></svg></button>
        <button class="ic danger" data-cdel="${name}" ${count?"disabled":""} title="${count?"Só é possível excluir categoria vazia":"Excluir"}"><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13"/></svg></button>
      </div>
    </div>`;
  }).join("");
}
function addCategory(){
  const name=$("#newCatName").value.trim(); const color=$("#newCatColor").value;
  if(!name){toast("Digite o nome da categoria");return;}
  if(cats[name]){toast("Categoria já existe");return;}
  cats[name]={ic:DEFAULT_IC,tile:[shade(color,.82),shade(color,.55)],tileD:[shade(color,-.55),shade(color,-.72)]};
  order.push(name); $("#newCatName").value=""; save(); renderCats(); toast("Categoria adicionada");
}
function renameCat(old){
  const nn=prompt("Novo nome da categoria:",old); if(!nn||nn===old)return;
  if(cats[nn]){toast("Já existe uma categoria com esse nome");return;}
  cats[nn]=cats[old]; delete cats[old]; order=order.map(c=>c===old?nn:c);
  items.forEach(p=>{if(p.c===old)p.c=nn;}); save(); renderCats(); toast("Categoria renomeada");
}
function delCat(name){ if(items.some(p=>p.c===name)){toast("Categoria tem produtos");return;} delete cats[name]; order=order.filter(c=>c!==name); save(); renderCats(); toast("Categoria excluída"); }
function moveCat(i,d){ const j=i+d; if(j<0||j>=order.length)return; [order[i],order[j]]=[order[j],order[i]]; save(); renderCats(); }

/* ============================================================ MARCAS */
function renderBrands(){
  const counts={}; items.forEach(p=>counts[p.b]=(counts[p.b]||0)+1);
  const bs=Object.keys(counts).sort();
  $("#brandList").innerHTML=bs.map(b=>`
    <div class="catrow">
      <span class="swatch" style="background:#f0f0f0;color:#666;display:grid;place-items:center;font-weight:800;font-size:.7rem">${b.slice(0,3).toUpperCase()}</span>
      <div class="catinfo"><b>${b}</b><div class="sub">${counts[b]} produto(s)</div></div>
      <div class="acts"><button class="ic" data-bren="${b}" title="Renomear"><svg viewBox="0 0 24 24"><path d="M4 20h4L18 10l-4-4L4 16v4Zm10-14 4 4"/></svg></button></div>
    </div>`).join("");
}
function renameBrand(old){ const nn=prompt("Novo nome da marca (aplica a todos os produtos):",old); if(!nn||nn===old)return; items.forEach(p=>{if(p.b===old)p.b=nn;}); save(); renderBrands(); toast("Marca renomeada"); }

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
  // delegação
  $("#tab-produtos").addEventListener("click",e=>{ const ed=e.target.closest("[data-edit]"),dl=e.target.closest("[data-del]"); if(ed)openForm(+ed.dataset.edit); if(dl){ if(confirm("Excluir "+items[+dl.dataset.del].n+"?")){items.splice(+dl.dataset.del,1);save();renderProducts();toast("Produto excluído");} } });
  $("#tab-categorias").addEventListener("click",e=>{ const up=e.target.closest("[data-cup]"),dn=e.target.closest("[data-cdn]"),rn=e.target.closest("[data-cren]"),dl=e.target.closest("[data-cdel]"); if(up)moveCat(+up.dataset.cup,-1); if(dn)moveCat(+dn.dataset.cdn,1); if(rn)renameCat(rn.dataset.cren); if(dl&&!dl.disabled)delCat(dl.dataset.cdel); });
  $("#tab-marcas").addEventListener("click",e=>{ const rn=e.target.closest("[data-bren]"); if(rn)renameBrand(rn.dataset.bren); });
  $("#brandsDL").innerHTML=brandList().map(b=>`<option value="${b}">`).join("");
  switchTab("produtos");
}
document.addEventListener("DOMContentLoaded",init);
