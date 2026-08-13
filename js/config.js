/* ============================================================
   CONFIG — edite aqui
   ============================================================ */
const CONFIG = {
  whatsapp: "5541999999999",          // <<< TROQUE pelo número real (DDI+DDD+número)
  storeName: "JE7 Distribuidora e Atacadão",
  priceMode: "atacado",                // valor estimado usa preço de atacado

  /* ---- IMAGENS DOS PRODUTOS ----
     Com autoImages ligado, cada produto busca a foto em:
        images/products/<slug>.jpg   (depois tenta .png, .webp, .jpeg)
     O <slug> é o nome do produto + volume. Veja a lista pronta em
     images/products/_LISTA-DE-IMAGENS.txt
     Se o arquivo não existir, aparece a silhueta desenhada (fallback). */
  autoImages: true,
  imgBase: "images/products/",
  imgExts: [".jpg", ".png", ".webp", ".jpeg"]
};