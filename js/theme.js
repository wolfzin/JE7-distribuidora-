/* ============================================================
   THEME — estilo visual das categorias (ícone + gradientes) e
   cores de marca. É ESTILO do frontend, não dado do catálogo.
   As categorias reais vêm do Supabase; este mapa dá o visual por
   NOME de categoria. Categorias sem entrada usam DEFAULT_CAT.
   ============================================================ */
const CATS = {
  "Refrigerantes":{ic:'<path d="M8 2h8l-1 3H9L8 2Zm-.5 3h9l-.8 15a2 2 0 0 1-2 1.9H10.3a2 2 0 0 1-2-1.9L7.5 5Z"/>',tile:["#ffe3e3","#ffd0d0"],tileD:["#2a1618","#201013"]},
  "Água":{ic:'<path d="M12 2s7 8 7 12a7 7 0 0 1-14 0c0-4 7-12 7-12Z"/>',tile:["#dcefff","#c7e6ff"],tileD:["#0f1e2a","#0c1720"]},
  "Cervejas":{ic:'<path d="M6 3h9v4h2a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2v3H6V3Zm9 6v5h2V9h-2Z"/>',tile:["#fff2d6","#ffe6b0"],tileD:["#241d10","#1c160b"]},
  "Destilados":{ic:'<path d="M9 2h6v5l3 6v7a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-7l3-6V2Z"/>',tile:["#ece3ff","#ddd0ff"],tileD:["#1a1626","#141020"]},
  "Energéticos":{ic:'<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"/>',tile:["#e6ffe0","#cffcbf"],tileD:["#12210f","#0e1a0c"]},
  "Salgadinhos":{ic:'<path d="M4 5h16l-2 15a1 1 0 0 1-1 .9H7a1 1 0 0 1-1-.9L4 5Zm3 4 1 8m4-8v8m4-8-1 8"/>',tile:["#fff0dd","#ffe0bb"],tileD:["#241a10","#1b140b"]},
  "Carvão":{ic:'<path d="M12 2C9 6 6 8 6 13a6 6 0 0 0 12 0c0-2-1-3.5-2-5-1 1.5-2 1-2-1 0-1.5-1-3-2-5Z"/>',tile:["#e6e6e6","#d4d4d4"],tileD:["#1a1a1c","#141416"]}
};
const CAT_ORDER = ["Refrigerantes","Cervejas","Destilados","Água","Energéticos","Salgadinhos","Carvão"];
const DEFAULT_CAT = {ic:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M3 7l3-4h12l3 4"/>',tile:["#f0f0f2","#e2e2e6"],tileD:["#2a2a2e","#1a1a1e"]};
function catStyle(name){ return CATS[name] || DEFAULT_CAT; }

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
