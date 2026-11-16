// ============ Ícones dos itens (prancha "Ícones dos itens", 16/11/2026) ============
// Cada item do livro tem o seu desenho (data/icones-itens.js e data/icones-itens-2.js), no traço
// das magias, mas em ladrilho quadrado (magia fica no círculo). A cor diz o tipo; poção pega a
// cor da magia que tem dentro; item mágico ou superior ganha uma estrelinha dourada no canto;
// item personalizado usa o desenho padrão do tipo (arma, armadura, escudo, esotérico ou embrulho).
// Quem desenha telas usa só ladrilhoItem() e, se precisar do desenho solto, iconeItemSVG().

const CORES_ITEM = {
  arma:'#cfd8e3', armadura:'#d1a26a', escudo:'#c9a77a', esoterico:'#9c9cff', pocao:'#8ee3a0', magico:'#f2cf6b', proprio:'#b8ad98',
  'Aventura':'#d8bd74', 'Munição':'#cfd8e3', 'Ferramenta':'#c98f5a', 'Vestuário':'#c7a0e0', 'Alquímico':'#7fd4a0', 'Catalisador':'#b59cff',
  'Veneno':'#a6e05a', 'Alimentação':'#e8c46a', 'Animal':'#c9935a', 'Veículo':'#b8875a', 'Serviço':'#e6d28a',
};
// Desenho padrão por tipo, para item personalizado ou ainda sem desenho próprio.
const PADRAO_ITEM = {
  arma: '<path d="M100 22 L112 40 V128 H88 V40 Z" {S}/><path d="M62 132 H138 M100 136 V164" {S}/><circle cx="100" cy="172" r="8" {S}/>',
  armadura: '<path d="M64 48 L84 40 Q100 52 116 40 L136 48 L156 82 L136 90 V162 H64 V90 L44 82 Z" {S}/><path d="M100 52 V162" {s}/>',
  escudo: '<path d="M100 26 L152 48 Q152 122 100 174 Q48 122 48 48 Z" {S}/><circle cx="100" cy="94" r="14" {S}/>',
  esoterico: '<circle cx="100" cy="92" r="40" {S}/><path d="M70 150 H130 L120 134 H80 Z" {S}/><path d="M86 80 Q94 70 106 70" {s}/>',
  pocao: '<path d="M88 30 H112 M90 30 V58 Q56 72 56 114 Q56 158 100 158 Q144 158 144 114 Q144 72 110 58 V30" {S}/><path d="M62 112 Q100 98 138 112" {s}/>',
  geral: '<path d="M48 84 L100 60 L152 84 V144 L100 168 L48 144 Z M48 84 L100 108 L152 84 M100 108 V168" {S}/><path d="M74 72 L126 96" {s}/>',
};

let _indiceItens = null;
function indiceVisualItens(){
  if(_indiceItens) return _indiceItens;
  const ix = {};
  const pos = (lista, campo, fn)=> (typeof lista!=='undefined' && Array.isArray(lista)) ? lista.forEach(x=>{ const n = x[campo]; if(n && !ix[n]) ix[n] = fn(x); }) : null;
  pos(typeof ARMAS!=='undefined' ? ARMAS : null, 'n', ()=>({grupo:'arma'}));
  pos(typeof ARMADURAS!=='undefined' ? ARMADURAS : null, 'n', ()=>({grupo:'armadura'}));
  pos(typeof ESCUDOS!=='undefined' ? ESCUDOS : null, 'n', ()=>({grupo:'escudo'}));
  pos(typeof ITENS_GERAIS!=='undefined' ? ITENS_GERAIS : null, 'n', (x)=>({grupo:'geral', cat:x.cat}));
  pos(typeof ITENS_ESOTERICOS!=='undefined' ? ITENS_ESOTERICOS : null, 'n', ()=>({grupo:'esoterico'}));
  pos(typeof POCOES_MAGICAS!=='undefined' ? POCOES_MAGICAS : null, 'nome', (x)=>({grupo:'pocao', magia:x.magia}));
  pos(typeof ARMAS_ESPECIFICAS!=='undefined' ? ARMAS_ESPECIFICAS : null, 'nome', (x)=>({grupo:'arma', magico:true, base:x.base}));
  pos(typeof ARMADURAS_ESPECIFICAS!=='undefined' ? ARMADURAS_ESPECIFICAS : null, 'nome', (x)=>({grupo:/escudo/i.test(x.base||'') ? 'escudo' : 'armadura', magico:true, base:x.base}));
  [typeof ACESSORIOS_MENORES!=='undefined' ? ACESSORIOS_MENORES : null, typeof ACESSORIOS_MEDIOS!=='undefined' ? ACESSORIOS_MEDIOS : null,
   typeof ACESSORIOS_MAIORES!=='undefined' ? ACESSORIOS_MAIORES : null, typeof ARTEFATOS!=='undefined' ? ARTEFATOS : null]
    .forEach(lista=> pos(lista, 'nome', ()=>({grupo:'geral', magico:true, acessorio:true})));
  return (_indiceItens = ix);
}

// Grupo, cor e se é mágico. tipo: o tipo da linha da mochila ('arma', 'armadura'...), para o padrão.
function visualDoItem(nome, tipo, magico){
  const info = indiceVisualItens()[nome] || null;
  const grupo = info ? info.grupo : ({arma:'arma', armadura:'armadura', escudo:'escudo', esoterico:'esoterico'}[tipo] || 'geral');
  let cor = info && info.cat ? CORES_ITEM[info.cat] : CORES_ITEM[grupo];
  if(info && info.grupo==='pocao' && typeof corDaMagia==='function' && typeof MAGIAS!=='undefined'){ const m = MAGIAS.find(s=> s.n===info.magia); if(m) cor = corDaMagia(m); }
  const ehMagico = !!(magico || (info && info.magico));
  if(ehMagico && (!info || info.acessorio)) cor = CORES_ITEM.magico;
  if(!info) cor = CORES_ITEM[tipo] || CORES_ITEM.proprio;
  return {grupo, cor: cor || CORES_ITEM.proprio, magico: ehMagico, info};
}

function desenhoDoItem(nome, grupo, info){
  const proprio = (typeof ICONE_DO_ITEM!=='undefined' && ICONE_DO_ITEM[nome]) || (typeof ICONE_DO_ITEM_2!=='undefined' && ICONE_DO_ITEM_2[nome]);
  if(proprio) return proprio;
  if(info && info.base){ const b = (typeof ICONE_DO_ITEM!=='undefined' && ICONE_DO_ITEM[info.base]); if(b) return b; }
  return PADRAO_ITEM[grupo] || PADRAO_ITEM.geral;
}

// Poção: o frasco na cor da magia, com o ícone da própria magia pequeno dentro.
function desenhoPocao(info, cor){
  const frasco = PADRAO_ITEM.pocao;
  if(typeof iconeMagiaSVG!=='function' || typeof MAGIAS==='undefined') return frasco;
  const m = MAGIAS.find(s=> s.n===info.magia); if(!m) return frasco;
  const dentro = iconeMagiaSVG(m, cor, false).replace(/^<svg[^>]*>|<\/svg>$/g, '').replace(/stroke-width="(3|1\.8)"/g, 'stroke-width="9"');
  return frasco + '<g transform="translate(70 92) scale(.3)">'+dentro+'</g>';
}

function iconeItemSVG(nome, tipo, magico){
  const v = visualDoItem(nome, tipo, magico);
  const base = 'stroke="'+v.cor+'" fill="none" stroke-linecap="round" stroke-linejoin="round"';
  const bruto = v.grupo==='pocao' && v.info && !(typeof ICONE_DO_ITEM_2!=='undefined' && ICONE_DO_ITEM_2[nome]) ? desenhoPocao(v.info, v.cor) : desenhoDoItem(nome, v.grupo, v.info);
  const corpo = bruto.replace(/\{S\} stroke-width="([\d.]+)"/g, base+' stroke-width="$1"').replace(/\{S\}/g, base+' stroke-width="7"').replace(/\{s\}/g, base+' stroke-width="4.5"')
    .replace(/\{D\}/g, base+' stroke-width="5" stroke-dasharray="10 10"').replace(/\{F\}/g, 'fill="'+v.cor+'"');
  return {svg:'<svg viewBox="0 0 200 200" aria-hidden="true">'+corpo+'</svg>', cor:v.cor, magico:v.magico};
}

// O ladrilho quadrado com o ícone (catálogo, mochila, vestidos).
function ladrilhoItem(nome, tipo, magico){
  const r = iconeItemSVG(nome, tipo, magico);
  const e = el('span',{class:'ladrilho-item'+(r.magico ? ' magico' : ''), style:'--c:'+r.cor+';', 'aria-hidden':'true'});
  e.innerHTML = r.svg;
  return e;
}
// Linha da mochila: mágico quando é superior, tem melhorias ou essências.
function ladrilhoDaLinha(row, nome){
  const magico = !!(row.superior || row.melhoriasTxt || (row.essencias && row.essencias.length) || row.encantos);
  const ix = indiceVisualItens(), cat = nomeCatalogoDaLinha(row);
  const achado = [cat, nome, String(cat).replace(/\s*\([^()]*\)\s*$/, '')].find(n=> n && ix[n]);
  return ladrilhoItem(achado || nome || cat, row.tipo, magico);
}
