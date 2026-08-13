/* ============================================================
   DATA — extraído da Tabela de Preços JE7 (data/products.js)
   n=nome · c=categoria · b=marca · v=volume
   au=atacado/un · ap=atacado/fardo · vp=varejo/fardo · vu=varejo/un · pk=un por fardo
   FLAGS opcionais por produto:
     f:1    = Destaque / recomendado
     nv:1   = Novidade
     bs:1   = Mais vendido
     promo:1, pp:<preço> = Oferta (pp = preço promocional no varejo)
     av:"encomenda"      = Disponibilidade "sob encomenda" (padrão: em estoque)
   ============================================================ */
const PRODUCTS = [
/* --- REFRIGERANTES --- */
{n:"Coca-Cola",c:"Refrigerantes",b:"Coca-Cola",v:"2L",au:9.50,ap:57,vp:63,vu:10.50,pk:6,f:1,bs:1,promo:1,pp:9.90},
{n:"Coca-Cola Zero",c:"Refrigerantes",b:"Coca-Cola",v:"2L",au:9.50,ap:57,vp:63,vu:10.50,pk:6},
{n:"Fanta Laranja",c:"Refrigerantes",b:"Coca-Cola",v:"2L",au:7.50,ap:45,vp:48,vu:8.00,pk:6},
{n:"Fanta Uva",c:"Refrigerantes",b:"Coca-Cola",v:"2L",au:7.50,ap:45,vp:48,vu:8.00,pk:6},
{n:"Sprite",c:"Refrigerantes",b:"Coca-Cola",v:"2L",au:7.50,ap:45,vp:48,vu:8.00,pk:6},
{n:"Guaraná Antártica",c:"Refrigerantes",b:"Antarctica",v:"2L",au:7.00,ap:42,vp:48,vu:8.00,pk:6,f:1,bs:1},
{n:"Guaraná Antártica Zero",c:"Refrigerantes",b:"Antarctica",v:"2L",au:7.00,ap:42,vp:48,vu:8.00,pk:6},
{n:"Cine Guaraná",c:"Refrigerantes",b:"Cine",v:"2L",au:4.50,ap:27,vp:30,vu:5.00,pk:6},
{n:"Cine Framboesa",c:"Refrigerantes",b:"Cine",v:"2L",au:4.50,ap:27,vp:30,vu:5.00,pk:6},
{n:"Cine Laranja",c:"Refrigerantes",b:"Cine",v:"2L",au:4.50,ap:27,vp:30,vu:5.00,pk:6},
{n:"Cine Limão",c:"Refrigerantes",b:"Cine",v:"2L",au:4.50,ap:27,vp:30,vu:5.00,pk:6},
{n:"Cine Laranjinha",c:"Refrigerantes",b:"Cine",v:"2L",au:4.50,ap:27,vp:30,vu:5.00,pk:6},
{n:"Cine Abacaxi",c:"Refrigerantes",b:"Cine",v:"2L",au:4.50,ap:27,vp:30,vu:5.00,pk:6},
{n:"Cine Maçã Verde",c:"Refrigerantes",b:"Cine",v:"2L",au:4.50,ap:27,vp:30,vu:5.00,pk:6},
{n:"Cine Citrus",c:"Refrigerantes",b:"Cine",v:"2L",au:5.00,ap:30,vp:33,vu:5.50,pk:6},
{n:"Cine Limonada Suíça",c:"Refrigerantes",b:"Cine",v:"2L",au:5.00,ap:30,vp:33,vu:5.50,pk:6},
{n:"Wime Guaraná",c:"Refrigerantes",b:"Wime",v:"2L",au:3.50,ap:21,vp:24,vu:4.00,pk:6},
{n:"Wime Limão",c:"Refrigerantes",b:"Wime",v:"2L",au:3.50,ap:21,vp:24,vu:4.00,pk:6},
{n:"Wime Laranja",c:"Refrigerantes",b:"Wime",v:"2L",au:3.50,ap:21,vp:24,vu:4.00,pk:6},
{n:"Cine Mix Frutas Cítricas",c:"Refrigerantes",b:"Cine",v:"1,5L",au:5.00,ap:30,vp:33,vu:5.50,pk:6},
{n:"Cine Framboesa",c:"Refrigerantes",b:"Cine",v:"500ml",au:2.00,ap:24,vp:30,vu:2.50,pk:12},
{n:"Cine Limão",c:"Refrigerantes",b:"Cine",v:"500ml",au:2.00,ap:24,vp:30,vu:2.50,pk:12},
{n:"Cine Abacaxi",c:"Refrigerantes",b:"Cine",v:"500ml",au:2.00,ap:24,vp:30,vu:2.50,pk:12},
{n:"Cine Laranjinha",c:"Refrigerantes",b:"Cine",v:"500ml",au:2.00,ap:24,vp:30,vu:2.50,pk:12},
{n:"Cine Mix Frutas Cítricas",c:"Refrigerantes",b:"Cine",v:"500ml",au:2.00,ap:24,vp:30,vu:2.50,pk:12},
{n:"Cine Guaraná e Açaí",c:"Refrigerantes",b:"Cine",v:"500ml",au:2.00,ap:24,vp:30,vu:2.50,pk:12,nv:1},
{n:"Coca-Cola Lata",c:"Refrigerantes",b:"Coca-Cola",v:"350ml",au:2.41,ap:29,vp:31,vu:2.58,pk:12,bs:1},
{n:"Cine Laranjinha",c:"Refrigerantes",b:"Cine",v:"200ml",au:1.00,ap:12,vp:18,vu:1.50,pk:12},
{n:"Cine Maçã Verde",c:"Refrigerantes",b:"Cine",v:"200ml",au:1.00,ap:12,vp:18,vu:1.50,pk:12},
{n:"Cine Framboesa",c:"Refrigerantes",b:"Cine",v:"200ml",au:1.00,ap:12,vp:18,vu:1.50,pk:12},
{n:"Cine Abacaxi",c:"Refrigerantes",b:"Cine",v:"200ml",au:1.00,ap:12,vp:18,vu:1.50,pk:12},

/* --- ÁGUA --- */
{n:"Água Mineral",c:"Água",b:"Água Mineral",v:"500ml",au:0.86,ap:10.32,vp:12,vu:1.00,pk:12,bs:1},
{n:"Água Mineral",c:"Água",b:"Água Mineral",v:"1500ml",au:2.00,ap:12,vp:12.30,vu:2.50,pk:6},
{n:"Água Mineral (Galão)",c:"Água",b:"Água Mineral",v:"5 litros",au:5.00,ap:5,vp:6,vu:6.00,pk:1},
{n:"Água Mineral (Galão)",c:"Água",b:"Água Mineral",v:"10 litros",au:9.50,ap:9.50,vp:11,vu:11.00,pk:1},

/* --- CERVEJAS --- */
{n:"Brahma Tradicional Lata",c:"Cervejas",b:"Brahma",v:"350ml",au:3.00,ap:36,vp:38.50,vu:3.20,pk:12,f:1,bs:1},
{n:"Brahma Zero Lata",c:"Cervejas",b:"Brahma",v:"350ml",au:2.75,ap:33,vp:36,vu:3.00,pk:12},
{n:"Brahma Duplo Malte",c:"Cervejas",b:"Brahma",v:"350ml",au:3.41,ap:41,vp:43.50,vu:3.62,pk:12},
{n:"Budweiser Lata",c:"Cervejas",b:"Budweiser",v:"350ml",au:3.41,ap:41,vp:44,vu:3.66,pk:12},
{n:"Budweiser Long Neck",c:"Cervejas",b:"Budweiser",v:"330ml",au:5.00,ap:30,vp:32,vu:5.33,pk:6},
{n:"Skol Lata",c:"Cervejas",b:"Skol",v:"350ml",au:2.91,ap:35,vp:38,vu:3.16,pk:12,bs:1,promo:1,pp:2.99},
{n:"Kaiser Lata",c:"Cervejas",b:"Kaiser",v:"350ml",au:2.58,ap:31,vp:33,vu:2.75,pk:12},
{n:"Polar",c:"Cervejas",b:"Polar",v:"473ml",au:4.00,ap:48,vp:51,vu:4.25,pk:12},
{n:"Antarctica Azul Lata",c:"Cervejas",b:"Antarctica",v:"350ml",au:3.12,ap:37.50,vp:40,vu:3.33,pk:12},
{n:"Itaipava Lata",c:"Cervejas",b:"Itaipava",v:"350ml",au:2.41,ap:29,vp:31,vu:2.58,pk:12},
{n:"Amstel Lata",c:"Cervejas",b:"Amstel",v:"350ml",au:2.91,ap:35,vp:38,vu:3.16,pk:12,f:1},
{n:"Petra Lata",c:"Cervejas",b:"Petra",v:"350ml",au:2.75,ap:33,vp:35.50,vu:2.95,pk:12},
{n:"Spaten Lata",c:"Cervejas",b:"Spaten",v:"350ml",au:3.66,ap:44,vp:47,vu:3.91,pk:12},
{n:"Heineken Lata",c:"Cervejas",b:"Heineken",v:"350ml",au:4.70,ap:56.50,vp:60,vu:5.00,pk:12,f:1,bs:1,promo:1,pp:4.49},
{n:"Heineken Long Neck",c:"Cervejas",b:"Heineken",v:"330ml",au:5.66,ap:34,vp:36.50,vu:6.08,pk:6},
{n:"Heineken Long Neck Zero",c:"Cervejas",b:"Heineken",v:"330ml",au:5.83,ap:35,vp:37,vu:6.16,pk:6,nv:1},
{n:"Original Lata",c:"Cervejas",b:"Original",v:"350ml",au:3.75,ap:45,vp:48,vu:4.00,pk:12,bs:1},
{n:"Original Litrinho",c:"Cervejas",b:"Original",v:"300ml",au:3.04,ap:36.50,vp:39,vu:3.25,pk:12},
{n:"Sol Long Neck",c:"Cervejas",b:"Sol",v:"330ml",au:4.75,ap:28.50,vp:30.50,vu:5.08,pk:6},
{n:"Stella Artois Long Neck",c:"Cervejas",b:"Stella Artois",v:"330ml",au:5.33,ap:32,vp:34,vu:5.66,pk:6},
{n:"Stella Artois Gold Long Neck",c:"Cervejas",b:"Stella Artois",v:"330ml",au:6.16,ap:37,vp:40,vu:6.66,pk:6,nv:1},
{n:"Corona Long Neck",c:"Cervejas",b:"Corona",v:"330ml",au:6.50,ap:39,vp:42,vu:7.00,pk:6,f:1},

/* --- DESTILADOS --- */
{n:"Jack Daniel's N°7",c:"Destilados",b:"Jack Daniel's",v:"1L",au:120,ap:120,vp:135,vu:135,pk:1,f:1},
{n:"Jack Daniel's Maçã Verde",c:"Destilados",b:"Jack Daniel's",v:"1L",au:125,ap:125,vp:140,vu:140,pk:1},
{n:"Jack Daniel's Fire",c:"Destilados",b:"Jack Daniel's",v:"1L",au:125,ap:125,vp:140,vu:140,pk:1},
{n:"Jack Daniel's Honey",c:"Destilados",b:"Jack Daniel's",v:"1L",au:125,ap:125,vp:140,vu:140,pk:1},
{n:"Johnnie Walker Red Label",c:"Destilados",b:"Johnnie Walker",v:"1L",au:84,ap:84,vp:94,vu:94,pk:1},
{n:"Johnnie Walker Black Label",c:"Destilados",b:"Johnnie Walker",v:"1L",au:156,ap:156,vp:175,vu:175,pk:1,f:1},
{n:"White Horse",c:"Destilados",b:"White Horse",v:"1L",au:60,ap:60,vp:67,vu:67,pk:1},
{n:"Passport Whisky",c:"Destilados",b:"Passport",v:"1L",au:41,ap:41,vp:46,vu:46,pk:1},
{n:"Ballantine's",c:"Destilados",b:"Ballantine's",v:"1L",au:69,ap:69,vp:77,vu:77,pk:1},
{n:"Mansão Maromba · Combo do Job",c:"Destilados",b:"Mansão Maromba",v:"1L",au:13,ap:13,vp:15,vu:15,pk:1},
{n:"Mansão Maromba · Combo Hexa",c:"Destilados",b:"Mansão Maromba",v:"1L",au:13,ap:13,vp:15,vu:15,pk:1},
{n:"Mansão Maromba · Maçã Verde",c:"Destilados",b:"Mansão Maromba",v:"1L",au:13,ap:13,vp:15,vu:15,pk:1},
{n:"Mansão Maromba · Vodka",c:"Destilados",b:"Mansão Maromba",v:"1L",au:13,ap:13,vp:15,vu:15,pk:1},
{n:"Mansão Maromba · Whisky",c:"Destilados",b:"Mansão Maromba",v:"1L",au:13,ap:13,vp:15,vu:15,pk:1},
{n:"Smirnoff Vodka",c:"Destilados",b:"Smirnoff",v:"998ml",au:33,ap:33,vp:37,vu:37,pk:1},
{n:"Absolut",c:"Destilados",b:"Absolut",v:"1L",au:68,ap:68,vp:77,vu:77,pk:1},
{n:"Balalaika",c:"Destilados",b:"Balalaika",v:"1L",au:13,ap:13,vp:15,vu:15,pk:1},
{n:"Natasha",c:"Destilados",b:"Natasha",v:"900ml",au:17,ap:17,vp:19,vu:19,pk:1},
{n:"Beefeater Rosa",c:"Destilados",b:"Beefeater",v:"700ml",au:80.50,ap:80.50,vp:90.50,vu:90.50,pk:1},
{n:"Beefeater London Dry",c:"Destilados",b:"Beefeater",v:"750ml",au:77,ap:77,vp:86.50,vu:86.50,pk:1},
{n:"José Cuervo Ouro",c:"Destilados",b:"José Cuervo",v:"750ml",au:110,ap:110,vp:124,vu:124,pk:1},
{n:"José Cuervo Prata",c:"Destilados",b:"José Cuervo",v:"750ml",au:110,ap:110,vp:124,vu:124,pk:1},
{n:"Jägermeister",c:"Destilados",b:"Jägermeister",v:"700ml",au:118,ap:118,vp:132,vu:132,pk:1},
{n:"Dreher",c:"Destilados",b:"Dreher",v:"900ml",au:19,ap:19,vp:21.50,vu:21.50,pk:1},
{n:"BrasilBerg",c:"Destilados",b:"BrasilBerg",v:"920ml",au:56.50,ap:56.50,vp:63.50,vu:63.50,pk:1},
{n:"Campari",c:"Destilados",b:"Campari",v:"998ml",au:51.50,ap:51.50,vp:58,vu:58,pk:1},
{n:"Pinga Encascada 51",c:"Destilados",b:"51",v:"965ml",au:12,ap:12,vp:13,vu:13,pk:1},
{n:"Jamel Cachaça",c:"Destilados",b:"Jamel",v:"965ml",au:12,ap:12,vp:14,vu:14,pk:1},
{n:"Velho Barreiro",c:"Destilados",b:"Velho Barreiro",v:"910ml",au:14,ap:14,vp:16,vu:16,pk:1},
{n:"Ypióca Ouro",c:"Destilados",b:"Ypióca",v:"965ml",au:21,ap:21,vp:24,vu:24,pk:1},
{n:"Ypióca Prata",c:"Destilados",b:"Ypióca",v:"965ml",au:19,ap:19,vp:21.50,vu:21.50,pk:1},
{n:"Jurupinga",c:"Destilados",b:"Jurupinga",v:"975ml",au:25,ap:25,vp:28,vu:28,pk:1},
{n:"Gole do Sul Tinto Suave",c:"Destilados",b:"Gole do Sul",v:"2L (cx c/6)",au:6.83,ap:41,vp:46,vu:7.66,pk:6},
{n:"Campo Largo Tinto Suave",c:"Destilados",b:"Campo Largo",v:"750ml",au:12,ap:12,vp:14,vu:14,pk:1},
{n:"Campo Largo Tinto Seco",c:"Destilados",b:"Campo Largo",v:"750ml",au:12,ap:12,vp:14,vu:14,pk:1},
{n:"Smirnoff Ice",c:"Destilados",b:"Smirnoff",v:"275ml",au:5.83,ap:35,vp:40,vu:6.66,pk:6,nv:1},

/* --- ENERGÉTICOS --- */
{n:"Energético Brisa Cítrica",c:"Energéticos",b:"Energético",v:"269ml",au:4.00,ap:48,vp:54,vu:4.50,pk:12},
{n:"Energético Brazuca",c:"Energéticos",b:"Energético",v:"269ml",au:4.00,ap:48,vp:54,vu:4.50,pk:12},
{n:"Energético Ginga Roxa",c:"Energéticos",b:"Energético",v:"269ml",au:4.00,ap:48,vp:54,vu:4.50,pk:12},
{n:"Energético Fuzuê",c:"Energéticos",b:"Energético",v:"269ml",au:4.00,ap:48,vp:54,vu:4.50,pk:12,nv:1},

/* --- SALGADINHOS --- */
{n:"Batata Ondulada",c:"Salgadinhos",b:"Batata",v:"140g",au:6.50,ap:65,vp:75,vu:7.50,pk:10,promo:1,pp:6.90},
{n:"Batata Ondulada Cebola",c:"Salgadinhos",b:"Batata",v:"140g",au:6.50,ap:65,vp:75,vu:7.50,pk:10},
{n:"Batata Ondulada Churrasco",c:"Salgadinhos",b:"Batata",v:"140g",au:6.50,ap:65,vp:75,vu:7.50,pk:10},
{n:"Karolitos Bacon",c:"Salgadinhos",b:"Karolitos",v:"170g",au:5.00,ap:60,vp:72,vu:6.00,pk:12},
{n:"Karolitos Cebola",c:"Salgadinhos",b:"Karolitos",v:"200g",au:5.00,ap:60,vp:72,vu:6.00,pk:12},
{n:"Karolitos Presunto",c:"Salgadinhos",b:"Karolitos",v:"200g",au:5.00,ap:60,vp:72,vu:6.00,pk:12},
{n:"Karolitos Requeijão",c:"Salgadinhos",b:"Karolitos",v:"200g",au:5.00,ap:60,vp:72,vu:6.00,pk:12},
{n:"Karolitos Queijo",c:"Salgadinhos",b:"Karolitos",v:"200g",au:5.00,ap:60,vp:72,vu:6.00,pk:12},

/* --- CARVÃO --- */
{n:"Carvão Soft Braza",c:"Carvão",b:"Soft Braza",v:"4kg",au:13.50,ap:13.50,vp:15,vu:15,pk:1}
];

/* category id + icon (inline svg paths) + tile gradients */
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