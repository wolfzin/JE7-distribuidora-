/* ============================================================
   ADMIN — Autenticação (Supabase Auth)
   Protege o painel: sem sessão válida, só a tela de login aparece.
   Reutiliza o MESMO padrão de cliente do projeto:
     window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey)
   Usa somente a chave anon/public (nunca service_role).
   Nesta etapa: apenas login/logout/sessão — nada de produtos/imagens.
   ============================================================ */
(function(){
  const cfgOk = !!(CONFIG && CONFIG.supabaseUrl && CONFIG.supabaseAnonKey
    && !CONFIG.supabaseUrl.includes("SEU-PROJETO")
    && !CONFIG.supabaseAnonKey.includes("SUA_CHAVE"));
  const sb = (cfgOk && window.supabase)
    ? window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey)
    : null;
  // exposto para as próximas etapas (camada de dados autenticada do admin)
  window.sbAdmin = sb;

  const $ = s => document.querySelector(s);
  const gate = $("#authGate"), form = $("#loginForm"), errBox = $("#authError");
  const emailI = $("#authEmail"), passI = $("#authPass"), btn = $("#authBtn");
  const whoami = $("#authUser"), outBtn = $("#logoutBtn");

  function showApp(email){
    document.body.classList.remove("locked");
    if(whoami) whoami.textContent = email || "";
  }
  function showLogin(){
    document.body.classList.add("locked");
    if(whoami) whoami.textContent = "";
  }
  function err(msg){
    if(!errBox) return;
    errBox.textContent = msg || "";
    errBox.style.display = msg ? "block" : "none";
  }
  function friendly(error){
    const m = ((error && error.message) || "").toLowerCase();
    // Supabase retorna a MESMA mensagem para senha errada e e-mail inexistente
    // (proteção contra enumeração de usuários) — tratamos os dois igual.
    if(m.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
    if(m.includes("email not confirmed"))       return "E-mail ainda não confirmado. Confirme pelo link enviado.";
    if(m.includes("too many") || m.includes("rate limit")) return "Muitas tentativas. Aguarde um instante e tente de novo.";
    if(m.includes("failed to fetch") || m.includes("network") || m.includes("fetch")) return "Falha de conexão com o servidor. Verifique sua internet.";
    return "Não foi possível entrar. Tente novamente.";
  }

  // Sem configuração válida do Supabase: mantém bloqueado e avisa.
  if(!sb){
    showLogin();
    err("Supabase não configurado. Preencha supabaseUrl e supabaseAnonKey em js/config.js.");
    if(btn) btn.disabled = true;
    return;
  }

  // Sessão inicial (permanece após atualizar a página — persistência padrão do SDK).
  sb.auth.getSession()
    .then(({ data }) => { if(data && data.session) showApp(data.session.user.email); else showLogin(); })
    .catch(() => showLogin());

  // Reage a login, logout, refresh e expiração de sessão.
  sb.auth.onAuthStateChange((_event, session) => {
    if(session){ showApp(session.user.email); err(""); }
    else { showLogin(); }
  });

  async function doLogin(e){
    if(e) e.preventDefault();
    err("");
    const email = (emailI && emailI.value || "").trim();
    const password = (passI && passI.value) || "";
    if(!email || !password){ err("Informe e-mail e senha."); return; }
    const old = btn ? btn.textContent : "";
    if(btn){ btn.disabled = true; btn.textContent = "Entrando…"; }
    try{
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if(error){ err(friendly(error)); return; }
      if(passI) passI.value = "";        // sucesso → onAuthStateChange revela o painel
    }catch(ex){
      err("Falha de conexão com o servidor. Verifique sua internet.");
    }finally{
      if(btn){ btn.disabled = false; btn.textContent = old || "Entrar"; }
    }
  }
  async function doLogout(){
    try{ await sb.auth.signOut(); }catch(ex){}
    showLogin();                          // garante bloqueio mesmo se a rede falhar
  }

  if(form) form.addEventListener("submit", doLogin);
  if(btn)  btn.addEventListener("click", doLogin);
  if(outBtn) outBtn.addEventListener("click", doLogout);
})();
