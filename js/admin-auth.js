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
    if(typeof window.onAdminAuthed === "function") window.onAdminAuthed(email);
  }
  function showLogin(){
    document.body.classList.add("locked");
    if(whoami) whoami.textContent = "";
    if(typeof window.onAdminLoggedOut === "function") window.onAdminLoggedOut();
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

  /* ------------------------------------------------------------
     AUTENTICAÇÃO x AUTORIZAÇÃO — verificações SEPARADAS:
       • Autenticação (Supabase Auth): confirma QUEM é o usuário
         (signInWithPassword / getSession / onAuthStateChange).
       • Autorização (is_admin): confirma se ESTE usuário PODE usar
         o painel. Uma sessão válida NÃO basta — só liberamos o
         painel se o Supabase retornar is_admin() = true (fonte de
         verdade no banco; nada de e-mail no formulário nem lista
         hardcoded no front). Varejo/Atacado autenticam, mas NÃO
         são admin. Em erro de RPC, nunca assumimos admin.
     ------------------------------------------------------------ */

  // Guarda o token da sessão já avaliada e liberada, para evitar
  // chamar o RPC is_admin repetidamente no mesmo estado de sessão.
  let authorizedToken = null;

  async function authorize(session){
    // AUTORIZAÇÃO: a sessão já está autenticada; agora perguntamos ao
    // banco, via a função existente, se este usuário é administrador.
    let isAdmin = false, rpcError = null;
    try{
      const { data, error } = await sb.rpc("is_admin");
      if(error) rpcError = error; else isAdmin = (data === true);
    }catch(ex){ rpcError = ex; }

    if(rpcError){
      // Falha ao verificar permissão → NUNCA assume admin: mantém bloqueado.
      authorizedToken = null;
      showLogin();
      err("Não foi possível verificar suas permissões. Tente novamente.");
      return;
    }
    if(isAdmin){
      authorizedToken = session.access_token || "authorized";
      err("");
      showApp(session.user.email);
    }else{
      // Autenticado, porém SEM permissão de admin (ex.: Varejo/Atacado):
      // não revela o painel, mantém bloqueado e encerra a sessão no painel.
      authorizedToken = null;
      showLogin();
      err("Acesso restrito. Esta conta não possui permissão de administrador.");
      try{ await sb.auth.signOut(); }catch(ex){}
    }
  }

  // Ponto único por onde passam TODOS os caminhos de autenticação.
  async function evaluateSession(session){
    if(!session){ authorizedToken = null; showLogin(); return; }
    // Dedupe: se esta mesma sessão já foi avaliada e o painel está
    // liberado, não repetimos o RPC (evita chamada duplicada no load).
    if(session.access_token && session.access_token === authorizedToken
       && !document.body.classList.contains("locked")) return;
    await authorize(session);
  }

  // Sessão inicial / restauração após atualizar a página (persistência padrão do SDK).
  // Reavalia is_admin() a cada carregamento — sessão restaurada também é revalidada.
  sb.auth.getSession()
    .then(({ data }) => evaluateSession(data && data.session ? data.session : null))
    .catch(() => showLogin());

  // Reage a login, logout, refresh e expiração de sessão.
  // Ignoramos INITIAL_SESSION porque getSession() acima já cobre o load inicial
  // (evita uma segunda chamada ao RPC no mesmo estado de sessão).
  sb.auth.onAuthStateChange((event, session) => {
    if(event === "INITIAL_SESSION") return;
    evaluateSession(session);
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
