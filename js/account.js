/* ============================================================
   CONTA DO CLIENTE (site público) — Supabase Auth
   - login / cadastro (varejo|atacado) / logout
   - fonte de verdade do TIPO = public.customer_profiles (nunca localStorage)
   - define o modo de preço via window.jeSetPriceMode(mode) do app.js
   Usa o MESMO client do catálogo (window.jeSb) para a sessão/JWT valer
   nas leituras protegidas por RLS (product_wholesale).
   ============================================================ */
(function(){
  const sb = window.jeSb || null;
  /* Varejo desligado (CONFIG.retailEnabled=false): o cadastro oferece só "Atacado".
     O tipo do cliente continua vindo de customer_profiles; nada de Auth/RLS foi alterado. */
  const RETAIL_SIGNUP = !!(window.CONFIG && CONFIG.retailEnabled);
  let currentUser = null;
  let busy = false;

  const $ = s => document.querySelector(s);
  const esc = s => String(s==null?"":s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));

  /* ---------- perfil / modo ---------- */
  async function createProfile(uid, profile){
    const { error } = await sb.from("customer_profiles").insert(Object.assign({ id: uid }, profile));
    if(error) throw error;
  }
  async function ensureProfile(user){
    // lê o próprio perfil (RLS: só a linha dele) — inclui razão social e CNPJ
    let row=null;
    try{
      const { data } = await sb.from("customer_profiles").select("customer_type,razao_social,cnpj").eq("id", user.id).maybeSingle();
      row = data || null;
    }catch(e){ row=null; }
    if(row) return { type: row.customer_type==="atacado"?"atacado":"varejo", cnpj: row.cnpj||null, razao_social: row.razao_social||null };
    // sem perfil ainda: tentar criar a partir do cadastro pendente (confirmação de e-mail)
    let pending=null;
    try{ pending=JSON.parse(sessionStorage.getItem("je7_pending_profile")||"null"); }catch(e){}
    if(pending){
      try{ await createProfile(user.id, pending); sessionStorage.removeItem("je7_pending_profile");
        return { type: pending.customer_type==="atacado"?"atacado":"varejo", cnpj: pending.cnpj||null, razao_social: pending.razao_social||null }; }catch(e){}
    }
    return { type:"varejo", cnpj:null, razao_social:null }; // padrão seguro
  }
  async function resolveCustomer(){
    if(!sb) return { mode:"varejo", cust:null };
    let user=null;
    try{ const { data } = await sb.auth.getSession(); user = data && data.session ? data.session.user : null; }catch(e){}
    currentUser = user;
    if(!user) return { mode:"varejo", cust:null };
    const prof = await ensureProfile(user);
    const meta = user.user_metadata || {};
    const name = meta.full_name || meta.name || null; // customer_profiles não tem nome; usa metadata do Auth se houver
    const cust = { email: user.email||null, name: name, type: prof.type, cnpj: prof.cnpj, razao_social: prof.razao_social };
    return { mode: prof.type, cust };
  }
  async function applyMode(){
    const { mode, cust } = await resolveCustomer();
    if(typeof window.jeSetPriceMode === "function"){ try{ await window.jeSetPriceMode(mode); }catch(e){} }
    if(typeof window.jeSetCustomer === "function"){ try{ window.jeSetCustomer(cust); }catch(e){} }
    renderSlot();
  }

  /* ---------- ações ---------- */
  async function doLogin(email, password){
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if(error) throw error;
  }
  async function doLogout(){
    try{ await sb.auth.signOut(); }catch(e){}
  }
  async function doSignup(email, password, type, cnpj, razao){
    const { data, error } = await sb.auth.signUp({ email, password });
    if(error) throw error;
    const profile = {
      customer_type: type==="atacado" ? "atacado" : "varejo",
      cnpj: type==="atacado" ? (cnpj||null) : null,
      razao_social: type==="atacado" ? (razao||null) : null
    };
    if(data.session && data.user){
      // confirmação de e-mail desligada -> já cria o perfil
      try{ await createProfile(data.user.id, profile); }
      catch(e){ return { ok:true, needsConfirm:false, profileError:e }; }
      return { ok:true, needsConfirm:false };
    }
    // confirmação de e-mail exigida -> guarda pendente p/ criar no 1º login
    try{ sessionStorage.setItem("je7_pending_profile", JSON.stringify(profile)); }catch(e){}
    return { ok:true, needsConfirm:true };
  }

  function friendly(e){
    const m=((e&&(e.message||e.error_description))||"").toLowerCase();
    if(m.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
    if(m.includes("already registered")||m.includes("already been registered")||m.includes("user already")) return "Este e-mail já tem conta. Faça login.";
    if(m.includes("password")&&m.includes("at least")) return "Senha muito curta (mínimo 6 caracteres).";
    if(m.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar.";
    if(m.includes("rate limit")||m.includes("too many")) return "Muitas tentativas. Aguarde um instante.";
    if(m.includes("failed to fetch")||m.includes("network")) return "Falha de conexão. Tente novamente.";
    return "Não foi possível concluir. Tente novamente.";
  }

  /* ---------- UI: slot no nav ---------- */
  function renderSlot(){
    const slot=$("#acctSlot"); if(!slot) return;
    if(currentUser){
      const email=currentUser.email||"conta";
      slot.innerHTML='<button class="acct-btn" id="acctWho" title="'+esc(email)+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a7 7 0 0 1 14 0v1"/></svg><span class="acct-email">'+esc(email)+'</span></button><button class="acct-btn ghost" id="acctOut">Sair</button>';
      const out=$("#acctOut"); if(out) out.onclick=async()=>{ if(busy)return; busy=true; await doLogout(); busy=false; /* onAuthStateChange cuida do resto */ };
    }else{
      slot.innerHTML='<button class="acct-btn" id="acctIn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a7 7 0 0 1 14 0v1"/></svg><span class="acct-label">Entrar</span></button>';
      const inb=$("#acctIn"); if(inb) inb.onclick=()=>openModal("login");
    }
  }

  /* ---------- UI: modal login/cadastro ---------- */
  function ensureModal(){
    if($("#acctModal")) return;
    const el=document.createElement("div");
    el.id="acctModal"; el.className="acct-modal"; el.setAttribute("hidden","");
    el.innerHTML=`
      <div class="acct-overlay" data-aclose></div>
      <div class="acct-card" role="dialog" aria-modal="true">
        <button class="acct-x" data-aclose aria-label="Fechar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
        <div class="acct-tabs">
          <button class="acct-tab on" data-tab="login">Entrar</button>
          <button class="acct-tab" data-tab="signup">Criar conta</button>
        </div>
        <form class="acct-form" id="acctFormLogin">
          <label>E-mail<input type="email" id="lg_email" autocomplete="username" required></label>
          <label>Senha<input type="password" id="lg_pass" autocomplete="current-password" required></label>
          <div class="acct-err" id="lg_err"></div>
          <button type="submit" class="acct-submit" id="lg_btn">Entrar</button>
        </form>
        <form class="acct-form" id="acctFormSignup" hidden>
          <div class="acct-type">
            ${RETAIL_SIGNUP
              ? '<label class="acct-radio"><input type="radio" name="ctype" value="varejo" checked> Varejo</label><label class="acct-radio"><input type="radio" name="ctype" value="atacado"> Atacado</label>'
              : '<label class="acct-radio"><input type="radio" name="ctype" value="atacado" checked> Cadastro de atacado (CNPJ)</label>'}
          </div>
          <label>E-mail<input type="email" id="sg_email" autocomplete="username" required></label>
          <label>Senha<input type="password" id="sg_pass" autocomplete="new-password" required minlength="6"></label>
          <div id="sg_atac"${RETAIL_SIGNUP?" hidden":""}>
            <label>Razão Social<input type="text" id="sg_razao"${RETAIL_SIGNUP?"":" required"}></label>
            <label>CNPJ<input type="text" id="sg_cnpj" inputmode="numeric"${RETAIL_SIGNUP?"":" required"}></label>
          </div>
          <div class="acct-err" id="sg_err"></div>
          <div class="acct-ok" id="sg_ok" hidden></div>
          <button type="submit" class="acct-submit" id="sg_btn">Criar conta</button>
        </form>
      </div>`;
    document.body.appendChild(el);
    el.addEventListener("click",e=>{ if(e.target.closest("[data-aclose]")) closeModal(); });
    el.querySelectorAll(".acct-tab").forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));
    // alterna campos de atacado
    el.querySelectorAll('input[name="ctype"]').forEach(r=>r.onchange=()=>{
      const atac=el.querySelector('input[name="ctype"]:checked').value==="atacado";
      $("#sg_atac").hidden=!atac;
      $("#sg_razao").required=atac; $("#sg_cnpj").required=atac;
    });
    $("#acctFormLogin").addEventListener("submit",onLoginSubmit);
    $("#acctFormSignup").addEventListener("submit",onSignupSubmit);
    document.addEventListener("keydown",e=>{ if(e.key==="Escape" && !$("#acctModal").hasAttribute("hidden")) closeModal(); });
  }
  function openModal(tab){ ensureModal(); switchTab(tab||"login"); $("#acctModal").removeAttribute("hidden"); document.body.style.overflow="hidden"; }
  function closeModal(){ const m=$("#acctModal"); if(m){ m.setAttribute("hidden",""); document.body.style.overflow=""; } }
  function switchTab(tab){
    ensureModal();
    document.querySelectorAll(".acct-tab").forEach(b=>b.classList.toggle("on",b.dataset.tab===tab));
    $("#acctFormLogin").hidden = tab!=="login";
    $("#acctFormSignup").hidden = tab!=="signup";
  }
  function setErr(id,msg){ const el=$(id); if(el){ el.textContent=msg||""; el.style.display=msg?"block":"none"; } }

  async function onLoginSubmit(e){
    e.preventDefault(); if(busy) return; setErr("#lg_err","");
    const email=($("#lg_email").value||"").trim(), pass=$("#lg_pass").value||"";
    if(!email||!pass){ setErr("#lg_err","Informe e-mail e senha."); return; }
    const btn=$("#lg_btn"); busy=true; btn.disabled=true; const t=btn.textContent; btn.textContent="Entrando…";
    try{ await doLogin(email,pass); closeModal(); /* onAuthStateChange aplica o modo */ }
    catch(err){ setErr("#lg_err",friendly(err)); }
    finally{ busy=false; btn.disabled=false; btn.textContent=t; }
  }
  async function onSignupSubmit(e){
    e.preventDefault(); if(busy) return; setErr("#sg_err",""); $("#sg_ok").hidden=true;
    const type=document.querySelector('input[name="ctype"]:checked').value;
    const email=($("#sg_email").value||"").trim(), pass=$("#sg_pass").value||"";
    const razao=($("#sg_razao").value||"").trim(), cnpj=($("#sg_cnpj").value||"").trim();
    if(!email||!pass){ setErr("#sg_err","Informe e-mail e senha."); return; }
    if(pass.length<6){ setErr("#sg_err","Senha muito curta (mínimo 6 caracteres)."); return; }
    if(type==="atacado" && (!razao||!cnpj)){ setErr("#sg_err","Atacado exige Razão Social e CNPJ."); return; }
    const btn=$("#sg_btn"); busy=true; btn.disabled=true; const t=btn.textContent; btn.textContent="Criando…";
    try{
      const r=await doSignup(email,pass,type,cnpj,razao);
      if(r.profileError){ setErr("#sg_err","Conta criada, mas houve erro ao salvar o perfil. Faça login para concluir."); }
      else if(r.needsConfirm){ $("#sg_ok").hidden=false; $("#sg_ok").textContent="Conta criada! Confirme o e-mail enviado e depois faça login."; }
      else { closeModal(); /* já logado; onAuthStateChange aplica o modo */ }
    }catch(err){ setErr("#sg_err",friendly(err)); }
    finally{ busy=false; btn.disabled=false; btn.textContent=t; }
  }

  /* ---------- init ---------- */
  function init(){
    renderSlot();
    if(!sb){ return; } // Supabase não configurado -> segue como varejo/anônimo
    applyMode();
    sb.auth.onAuthStateChange((_ev, _session)=>{ applyMode(); });
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  // expõe p/ testes
  window.jeAccount = { openModal, closeModal, applyMode, _login:doLogin, _logout:doLogout, _signup:doSignup };
})();
