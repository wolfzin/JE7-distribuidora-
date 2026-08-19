/* ============================================================
   CONFIG — edite aqui
   ============================================================ */
const CONFIG = {
  whatsapp: "5541984777017",          // <<< TROQUE pelo número real (DDI+DDD+número)
  storeName: "JE7 Distribuidora e Atacadão",
  priceMode: "atacado",

  /* ---- SUPABASE (backend público do catálogo) ----
     Use SOMENTE a chave anon/public. NUNCA a service_role no frontend.
     Pegue em: Supabase → Project Settings → API */
  supabaseUrl: "https://tddaswfucsudauirwgti.supabase.co",   // <<< preencha
  supabaseAnonKey: "sb_publishable_fMWnF8t049sELdY0EnV5Vg_Z4myQfVm",         // <<< preencha (anon/public)
  bucket: "product-images",                          // bucket público das imagens
  perPage: 24                                        // produtos por página (paginação real)
};
