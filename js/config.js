/* ============================================================
   CONFIG — edite aqui
   ============================================================ */
const CONFIG = {
  whatsapp: "554185018067",          // <<< TROQUE pelo número real (DDI+DDD+número)
  storeName: "JE7 Distribuidora e Atacadão",
  priceMode: "atacado",

  /* ---- VAREJO (desativado temporariamente) ----
     false = catálogo e painel exclusivamente de ATACADO:
       • nenhum preço de varejo (products.retail_price / promotion_price) é lido, exibido ou gravado;
       • preço exibido vem só de product_wholesale.wholesale_price; NULL => "Preço sob consulta";
       • filtro/ordenação por preço e opção "Varejo" no cadastro ficam ocultos.
     true  = reativa o comportamento anterior (varejo + atacado). O banco não foi alterado. */
  retailEnabled: false,

  /* ---- SUPABASE (backend público do catálogo) ----
     Use SOMENTE a chave anon/public. NUNCA a service_role no frontend.
     Pegue em: Supabase → Project Settings → API */
  supabaseUrl: "https://tddaswfucsudauirwgti.supabase.co",   // <<< preencha
  supabaseAnonKey: "sb_publishable_fMWnF8t049sELdY0EnV5Vg_Z4myQfVm",         // <<< preencha (anon/public)
  bucket: "product-images",                          // bucket público das imagens
  perPage: 24                                        // produtos por página (paginação real)
};
