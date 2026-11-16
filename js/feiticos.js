// ============ EFEITOS DE MAGIA: o lugar central (revisão de 15/11/2026) ============
// Tudo o que define a CARA de uma magia mora aqui e em três vizinhos, e só aqui:
//  · data/temas-magia.js      grupo, movimento e intenção de cada magia do livro (uma a uma);
//  · js/feiticos.js (este)    os temas (cor, símbolo, som, partícula), as intenções das pílulas,
//                             os símbolos SVG, o símbolo pequeno das listas e tocarFeitico();
//  · data/icones-magia*.js     o ícone próprio de cada magia;
//  · js/feiticos-particulas.js os movimentos na tela (projétil, coluna, chuva, onda, portal...);
//  · js/feiticos-cenas.js     a cena de cada magia (esfera, teia, correntes, criatura que surge...);
//  · css/feiticos.css         o símbolo grande, o nome e o clarão de cada tema e movimento.
// Os sons de cada tema ficam no banco de sons do app (Som, em js/efeitos.js).
// Quem desenha telas usa só: estiloDaMagia, temaDaMagia, intencaoDaMagia, sigiloMagiaPequeno,
// sigiloSVG e tocarFeitico. Camada fixa fora do #root (o render não interrompe), sem receber
// toque, uns 2 segundos. Com "reduzir movimento" do aparelho, mostra só o símbolo parado.

// cor: principal · cores: partículas · claro: soma luz (false escurece) · som: nome no Som ·
// sigilo: desenho em sigiloSVG · forma: partícula · mov: movimento padrão · i: intenção padrão.
const TEMAS_FEITICO = {
  fogo:{cor:'#ff8a2a', cores:['#fff1a8','#ffcc4d','#ff8a2a','#e0451c'], claro:true, som:'fogo', sigilo:'chamas', forma:'ponto', mov:'subir', i:'dano'},
  frio:{cor:'#9fdcff', cores:['#ffffff','#d7f2ff','#9fdcff','#5aa8e6'], claro:true, som:'gelo', sigilo:'floco', forma:'floco', mov:'convergir', i:'dano'},
  raio:{cor:'#bfe0ff', cores:['#ffffff','#e3f1ff','#9cc7ff'], claro:true, som:'trovao', sigilo:'relampago', forma:'faisca', mov:'explosao', i:'dano'},
  acido:{cor:'#9be15d', cores:['#e6ffb0','#b6f06a','#7cc63c','#4f8f22'], claro:true, som:'acido', sigilo:'bolhas', forma:'gota', mov:'chuva', i:'dano'},
  luz:{cor:'#ffe08a', cores:['#ffffff','#fff3c4','#ffe08a','#f5c44a'], claro:true, som:'sino', sigilo:'sol', forma:'ponto', mov:'flutuar', i:'fortalecer'},
  trevas:{cor:'#7a4fb8', cores:['#1a0d26','#2e1745','#4b2a73','#7a4fb8'], claro:false, som:'sombra', sigilo:'eclipse', forma:'fumaca', mov:'convergir', i:'dano'},
  cura:{cor:'#8ee3a0', cores:['#f4ffe8','#c8f5b5','#8ee3a0','#ffe08a'], claro:true, som:'cura', sigilo:'folha', forma:'cruz', mov:'subir', i:'cura'},
  encanto:{cor:'#ef8fd0', cores:['#ffe3f5','#ffb3e2','#ef8fd0','#b46ee0'], claro:true, som:'encanto', sigilo:'espiral', forma:'coracao', mov:'espiral', i:'mente'},
  escudo:{cor:'#8fc3ff', cores:['#ffffff','#cfe5ff','#8fc3ff','#d8bd74'], claro:true, som:'escudo', sigilo:'hexagono', forma:'ponto', mov:'orbita', i:'protecao'},
  invocacao:{cor:'#ff5a5a', cores:['#ffd2b0','#ff9a6a','#ff5a5a','#b0223a'], claro:true, som:'invocar', sigilo:'pentagrama', forma:'ponto', mov:'subir', i:'invocar'},
  olho:{cor:'#ffd36e', cores:['#ffffff','#fff0c0','#ffd36e','#b9a2ff'], claro:true, som:'revelar', sigilo:'olho', forma:'ponto', mov:'flutuar', i:'saber'},
  ilusao:{cor:'#b59cff', cores:['#ffffff','#e0d4ff','#b59cff','#7fd4ff','#ff9cd8'], claro:true, som:'brilho', sigilo:'prisma', forma:'caco', mov:'espiral', i:'ilusao'},
  necro:{cor:'#6fdc8c', cores:['#0b1a10','#173a22','#2f6b40','#6fdc8c'], claro:false, som:'necro', sigilo:'caveira', forma:'fumaca', mov:'convergir', i:'invocar'},
  vampiro:{cor:'#e0334a', cores:['#ffd0d6','#ff6b7f','#e0334a','#7a0f20'], claro:true, som:'pulso', sigilo:'gota', forma:'gota', mov:'convergir', i:'dano'},
  alquimia:{cor:'#e8c46a', cores:['#fff5d6','#e8c46a','#7fd4c8','#c98a3a'], claro:true, som:'alquimia', sigilo:'alquimia', forma:'ponto', mov:'orbita', i:'transformar'},
  setas:{cor:'#9c9cff', cores:['#ffffff','#d6d6ff','#9c9cff','#6f8fc4'], claro:true, som:'arcano', sigilo:'estrela', forma:'faisca', mov:'explosao', i:'dano'},
  sono:{cor:'#a98be0', cores:['#efe6ff','#cdb8ff','#a98be0','#6f5aa8'], claro:true, som:'ninar', sigilo:'lua', forma:'z', mov:'espiral', i:'mente'},
  natureza:{cor:'#7fcf6a', cores:['#e8ffd8','#b8eb8f','#7fcf6a','#3f8f3a','#c9a35a'], claro:true, som:'natureza', sigilo:'arvore', forma:'folha', mov:'subir', i:'transformar'},
  terra:{cor:'#c9935a', cores:['#f0d9b0','#c9935a','#8a6239','#5c4130'], claro:false, som:'terra', sigilo:'montanha', forma:'pedra', mov:'subir', i:'transformar'},
  agua:{cor:'#5fc7e8', cores:['#ffffff','#bdeeff','#5fc7e8','#2f86b8'], claro:true, som:'agua', sigilo:'ondas', forma:'gota', mov:'onda', i:'transformar'},
  vento:{cor:'#cfe9e4', cores:['#ffffff','#e6f6f2','#cfe9e4','#9fc9c1'], claro:true, som:'vento', sigilo:'redemoinho', forma:'risco', mov:'espiral', i:'movimento'},
  portal:{cor:'#7f8cff', cores:['#ffffff','#c7ccff','#7f8cff','#c46fff'], claro:true, som:'portal', sigilo:'portal', forma:'ponto', mov:'portal', i:'movimento'},
  som:{cor:'#f0c8ff', cores:['#ffffff','#f6e0ff','#f0c8ff','#c79be0'], claro:true, som:'sonico', sigilo:'somonda', forma:'anel', mov:'onda', i:'dano'},
  tormenta:{cor:'#e0283a', cores:['#ffb0b8','#ff4a5a','#c0182a','#5a0812'], claro:true, som:'tormenta', sigilo:'tormenta', forma:'caco', mov:'chuva', i:'dano'},
  tempo:{cor:'#e6d28a', cores:['#ffffff','#fff3c8','#e6d28a','#a9c7d9'], claro:true, som:'tempo', sigilo:'ampulheta', forma:'ponto', mov:'espiral', i:'transformar'},
};

// Pílulas de Aprender magias, na ordem em que aparecem.
const INTENCOES_MAGIA = [
  ['dano','🔥 Dano'], ['cura','💚 Cura'], ['protecao','🛡️ Proteção'], ['fortalecer','💪 Fortalecer'],
  ['enfraquecer','🥀 Enfraquecer'], ['mente','💗 Mente'], ['prender','⛓️ Prender'], ['ilusao','🎭 Ilusão'],
  ['saber','👁️ Saber'], ['invocar','👹 Invocar'], ['movimento','💨 Movimento'], ['transformar','⚗️ Transformar'],
  ['utilidade','🧰 Utilidade'],
];

// ---- Regra de reserva, só para magia que não está em data/temas-magia.js ----
const TEMA_POR_ELEMENTO = [
  ['fogo', /fogo|chama|flamej|incend|ígne|igne|inferno|brasa/i], ['frio', /frio|gelo|gélid|congel|polar|nevasca|inverno/i],
  ['raio', /rel[âa]mpago|trov[ãa]o|el[ée]tric/i], ['acido', /[áa]cido|corros/i], ['vampiro', /vamp[ií]r|sangue/i],
  ['trevas', /trevas|sombra|escurid|profan/i], ['luz', /\bluz\b|solar|sagrad|divin|consagr|b[êe]n[çc][ãa]o|milagre/i],
  ['cura', /\bcura|curar|restaura|regenera/i], ['sono', /\bsono\b|sonho/i], ['natureza', /planta|natureza|[áa]rvore|animal/i],
  ['terra', /terra|pedra|rocha/i], ['agua', /[áa]gua|n[ée]voa|chuva/i], ['portal', /teletransport|dimens|planar/i],
];
const TEMA_POR_DANO = [
  ['fogo', /dano de fogo/i], ['frio', /dano de frio/i], ['raio', /dano de eletricidade|dano el[ée]trico/i], ['acido', /dano de [áa]cido/i],
  ['trevas', /dano de trevas/i], ['luz', /dano de luz/i], ['cura', /\b(cura|recupera) \d+d\d+/i],
];
const TEMA_POR_ESCOLA = {
  'Abjuração':'escudo', 'Adivinhação':'olho', 'Convocação':'invocacao', 'Encantamento':'encanto',
  'Evocação':'setas', 'Ilusão':'ilusao', 'Necromancia':'necro', 'Transmutação':'alquimia',
};
function temaPorRegra(s){
  for(const [t, re] of TEMA_POR_ELEMENTO) if(re.test(s.n||'')) return t;
  for(const [t, re] of TEMA_POR_DANO) if(re.test((s.d||'').slice(0, 260))) return t;
  return TEMA_POR_ESCOLA[s.e] || 'setas';
}

// Tudo o que o efeito precisa saber de uma magia: {tema, mov, qtd, grande, raios, elementos, intencao}.
function estiloDaMagia(s){
  if(!s) s = {};
  const linha = (typeof TEMA_DA_MAGIA!=='undefined' && TEMA_DA_MAGIA[s.n]) || '';
  const partes = linha.split(/\s+/).filter(Boolean);
  const tema = TEMAS_FEITICO[partes[0]] ? partes[0] : temaPorRegra(s);
  const cfg = TEMAS_FEITICO[tema];
  const est = {nome: s.n||'', tema, mov: cfg.mov, qtd:1, grande:false, raios:false, elementos:false, intencao: cfg.i, cena:null, cenaParam:null, cor:null};
  partes.slice(1).forEach(p=>{
    if(typeof MOVIMENTOS_FEITICO!=='undefined' && MOVIMENTOS_FEITICO.includes(p)) est.mov = p;
    else if(/^x\d$/.test(p)) est.qtd = parseInt(p.slice(1), 10);
    else if(p.startsWith('i:')) est.intencao = p.slice(2);
    else if(p.startsWith('c:')){ const [, nome, det] = p.split(':'); est.cena = nome; est.cenaParam = det || null; }
    else if(/^#[0-9a-f]{6}$/i.test(p)) est.cor = p;
    else if(p==='grande' || p==='raios' || p==='elementos') est[p] = true;
  });
  if(!linha && tema==='raio') est.raios = true;
  est.circulo = parseInt(s.c, 10) || 1;
  return est;
}
function temaDaMagia(s){ return estiloDaMagia(s).tema; }
function intencaoDaMagia(s){ return estiloDaMagia(s).intencao; }

// ---- Símbolos (SVG 200×200, traço que se desenha) ----
function sigiloSVG(tipo, cor){
  const t = 'stroke="'+cor+'" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"';
  const tr = (d, extra)=> '<path d="'+d+'" '+t+' class="trac"'+(extra||'')+'/>';
  const anel = '<circle cx="100" cy="100" r="88" '+t+' class="trac"/><circle cx="100" cy="100" r="80" '+t+' stroke-width="1" class="trac" opacity=".6"/>';
  const pontosEstrela = (n, r1, r2, giro)=>{ const p=[]; for(let i=0;i<n*2;i++){ const a = Math.PI*i/n - Math.PI/2 + (giro||0); const r = i%2 ? r2 : r1; p.push((100+r*Math.cos(a)).toFixed(1)+','+(100+r*Math.sin(a)).toFixed(1)); } return p.join(' '); };
  const runas = (r)=>{ let g=''; for(let i=0;i<12;i++){ const a = i*Math.PI/6; const x = 100+r*Math.cos(a), y = 100+r*Math.sin(a); g += tr('M'+(x-3)+' '+(y-4)+' L'+(x+3)+' '+(y+4)+' M'+(x+3)+' '+(y-4)+' L'+x+' '+y, ' stroke-width="1.4"'); } return g; };
  const desenhos = {
    pentagrama: anel + '<polygon points="'+[0,2,4,1,3].map(i=>{ const a = -Math.PI/2 + i*2*Math.PI/5; return (100+78*Math.cos(a)).toFixed(1)+','+(100+78*Math.sin(a)).toFixed(1); }).join(' ')+'" '+t+' class="trac"/>' + runas(70),
    hexagono: '<polygon points="'+pontosEstrela(3,84,84)+'" '+t+' class="trac"/><polygon points="'+pontosEstrela(3,64,64,Math.PI/6)+'" '+t+' class="trac" opacity=".7"/>' + runas(92),
    olho: anel + tr('M28 100 Q100 40 172 100 Q100 160 28 100 Z') + '<circle cx="100" cy="100" r="24" '+t+' class="trac"/><circle cx="100" cy="100" r="9" fill="'+cor+'" class="pupila"/>',
    alquimia: anel + '<polygon points="100,22 168,140 32,140" '+t+' class="trac"/><rect x="54" y="54" width="92" height="92" '+t+' class="trac" opacity=".7"/><circle cx="100" cy="100" r="34" '+t+' class="trac"/>',
    floco: (()=>{ let g=''; for(let i=0;i<6;i++){ const a=i*Math.PI/3; const x=100+80*Math.cos(a), y=100+80*Math.sin(a); const mx=100+48*Math.cos(a), my=100+48*Math.sin(a);
      g += tr('M100 100 L'+x.toFixed(1)+' '+y.toFixed(1)+' M'+mx.toFixed(1)+' '+my.toFixed(1)+' L'+(mx+18*Math.cos(a+0.7)).toFixed(1)+' '+(my+18*Math.sin(a+0.7)).toFixed(1)+' M'+mx.toFixed(1)+' '+my.toFixed(1)+' L'+(mx+18*Math.cos(a-0.7)).toFixed(1)+' '+(my+18*Math.sin(a-0.7)).toFixed(1)); } return g; })(),
    chamas: anel + (()=>{ let g=''; for(let i=0;i<8;i++){ const a=i*Math.PI/4; const x=100+66*Math.cos(a), y=100+66*Math.sin(a); g += tr('M'+x.toFixed(1)+' '+(y+10).toFixed(1)+' Q'+(x-9).toFixed(1)+' '+y.toFixed(1)+' '+x.toFixed(1)+' '+(y-14).toFixed(1)+' Q'+(x+9).toFixed(1)+' '+y.toFixed(1)+' '+x.toFixed(1)+' '+(y+10).toFixed(1)); } return g; })() + '<circle cx="100" cy="100" r="26" '+t+' class="trac"/>',
    estrela: anel + '<polygon points="'+pontosEstrela(8,82,34)+'" '+t+' class="trac"/>',
    relampago: anel + tr('M112 26 L72 104 L100 104 L84 174 L132 88 L104 88 L124 26 Z'),
    sol: anel + '<circle cx="100" cy="100" r="30" '+t+' class="trac"/><polygon points="'+pontosEstrela(12,76,40)+'" '+t+' class="trac" opacity=".8"/>',
    lua: anel + tr('M120 46 A58 58 0 1 0 120 154 A44 44 0 1 1 120 46 Z') + runas(70),
    eclipse: anel + '<circle cx="100" cy="100" r="46" '+t+' class="trac"/><circle cx="116" cy="92" r="40" fill="'+cor+'" opacity=".35"/>' + (()=>{ let g=''; for(let i=0;i<16;i++){ const a=i*Math.PI/8; g += tr('M'+(100+52*Math.cos(a)).toFixed(1)+' '+(100+52*Math.sin(a)).toFixed(1)+' L'+(100+(i%2?62:70)*Math.cos(a)).toFixed(1)+' '+(100+(i%2?62:70)*Math.sin(a)).toFixed(1)); } return g; })(),
    folha: anel + tr('M100 40 Q150 90 100 160 Q50 90 100 40 Z M100 52 L100 150') + tr('M82 100 L118 100 M100 82 L100 118', ' stroke-width="5"'),
    espiral: tr((()=>{ let d='M100 100'; for(let i=1;i<=120;i++){ const a=i*0.18, r=i*0.7; d+=' L'+(100+r*Math.cos(a)).toFixed(1)+' '+(100+r*Math.sin(a)).toFixed(1); } return d; })()) + anel,
    prisma: anel + '<polygon points="100,34 156,138 44,138" '+t+' class="trac"/>' + tr('M20 104 L74 96 M126 92 L182 70 M128 104 L182 104 M126 116 L182 138'),
    bolhas: anel + '<circle cx="80" cy="110" r="18" '+t+' class="trac"/><circle cx="118" cy="86" r="12" '+t+' class="trac"/><circle cx="112" cy="128" r="8" '+t+' class="trac"/><circle cx="90" cy="72" r="6" '+t+' class="trac"/>',
    caveira: anel + tr('M66 96 Q66 50 100 50 Q134 50 134 96 Q134 116 122 122 L122 140 L78 140 L78 122 Q66 116 66 96 Z') + '<circle cx="86" cy="98" r="9" fill="'+cor+'" opacity=".85"/><circle cx="114" cy="98" r="9" fill="'+cor+'" opacity=".85"/>' + tr('M92 140 L92 128 M100 140 L100 128 M108 140 L108 128'),
    gota: anel + tr('M100 38 Q140 96 140 118 A40 40 0 0 1 60 118 Q60 96 100 38 Z') + tr('M84 122 Q86 140 104 144', ' opacity=".7"'),
    arvore: anel + tr('M100 168 L100 92 M100 120 L74 100 M100 108 L128 86 M100 140 L80 128') + '<circle cx="100" cy="70" r="34" '+t+' class="trac"/>' + tr('M62 168 Q100 156 138 168', ' opacity=".7"'),
    montanha: anel + tr('M24 150 L74 70 L98 108 L124 60 L178 150 Z') + tr('M64 86 L74 70 L84 86 M114 76 L124 60 L134 76', ' opacity=".8"'),
    ondas: anel + [74,100,126].map(y=> tr('M30 '+y+' Q47 '+(y-16)+' 65 '+y+' T100 '+y+' T135 '+y+' T170 '+y)).join(''),
    redemoinho: anel + [0,1,2].map(k=> tr((()=>{ let d=''; for(let i=0;i<=60;i++){ const a=i*0.11+k*2.09, r=14+i*1.15; d+=(i?' L':'M')+(100+r*Math.cos(a)).toFixed(1)+' '+(100+r*Math.sin(a)*0.8).toFixed(1); } return d; })())).join(''),
    portal: '<ellipse cx="100" cy="100" rx="86" ry="86" '+t+' class="trac"/><ellipse cx="100" cy="100" rx="62" ry="76" '+t+' class="trac" opacity=".8"/><ellipse cx="100" cy="100" rx="38" ry="62" '+t+' class="trac" opacity=".6"/><ellipse cx="100" cy="100" rx="14" ry="44" '+t+' class="trac" opacity=".5"/>',
    somonda: anel + '<circle cx="100" cy="100" r="12" fill="'+cor+'"/>' + [30,48,66].map((r,i)=> tr('M'+(100-r*0.7).toFixed(1)+' '+(100-r*0.7).toFixed(1)+' A'+r+' '+r+' 0 0 1 '+(100-r*0.7).toFixed(1)+' '+(100+r*0.7).toFixed(1)+' M'+(100+r*0.7).toFixed(1)+' '+(100-r*0.7).toFixed(1)+' A'+r+' '+r+' 0 0 0 '+(100+r*0.7).toFixed(1)+' '+(100+r*0.7).toFixed(1), ' opacity="'+(1-i*0.25)+'"')).join(''),
    tormenta: anel + '<polygon points="'+pontosEstrela(9,84,30,0.2)+'" '+t+' class="trac"/>' + tr('M64 100 Q100 70 136 100 Q100 130 64 100 Z') + '<circle cx="100" cy="100" r="9" fill="'+cor+'" class="pupila"/>',
    ampulheta: anel + tr('M66 42 L134 42 M66 158 L134 158 M72 42 Q72 86 100 100 Q72 114 72 158 M128 42 Q128 86 100 100 Q128 114 128 158') + tr('M86 150 Q100 132 114 150 Z M100 104 L100 140', ' opacity=".7"'),
  };
  return '<svg viewBox="0 0 200 200" aria-hidden="true">'+(desenhos[tipo]||desenhos.estrela)+'</svg>';
}
const SIGILOS_FEITICO = ['pentagrama','hexagono','olho','alquimia','floco','chamas','estrela','relampago','sol','lua','eclipse','folha','espiral','prisma','bolhas','caveira','gota','arvore','montanha','ondas','redemoinho','portal','somonda','tormenta','ampulheta'];

// Cor da magia: a do grupo, ou a própria quando o livro descreve uma (Âncora: esmeralda).
function corDaMagia(s){ const est = estiloDaMagia(s); return est.cor || TEMAS_FEITICO[est.tema].cor; }
function desenhoIconeMagia(s){ return (typeof ICONE_DA_MAGIA!=='undefined' && ICONE_DA_MAGIA[s.n]) || (typeof ICONE_DA_MAGIA_2!=='undefined' && ICONE_DA_MAGIA_2[s.n]) || null; }
// Ícone próprio da magia (data/icones-magia*.js) ou, se não tiver, o símbolo do grupo.
// anel: true no símbolo grande do efeito; o pequeno das listas já tem a borda redonda.
function iconeMagiaSVG(s, cor, anel){
  const desenho = desenhoIconeMagia(s);
  if(!desenho) return sigiloSVG(TEMAS_FEITICO[temaDaMagia(s)].sigilo, cor);
  const base = 'stroke="'+cor+'" fill="none" stroke-linecap="round" stroke-linejoin="round"';
  const corpo = desenho.replace(/\{S\} stroke-width="([\d.]+)"/g, base+' stroke-width="$1" class="trac"').replace(/\{S\}/g, base+' stroke-width="3" class="trac"').replace(/\{s\}/g, base+' stroke-width="1.8" class="trac"')
    .replace(/\{D\}/g, base+' stroke-width="2.4" stroke-dasharray="6 7"').replace(/\{F\}/g, 'fill="'+cor+'"');
  const moldura = anel ? '<circle cx="100" cy="100" r="92" '+base+' stroke-width="1.6" class="trac" opacity=".7"/><circle cx="100" cy="100" r="86" '+base+' stroke-width="1" class="trac" opacity=".4"/>' : '';
  return '<svg viewBox="0 0 200 200" aria-hidden="true">'+moldura+corpo+'</svg>';
}

// Símbolo pequeno e colorido da magia, usado nas linhas de Minhas magias e de Aprender magias.
function sigiloMagiaPequeno(s){
  const cor = corDaMagia(s);
  const e = el('span',{class:'sigilo-mini', style:'color:'+cor+';border-color:'+cor+';', 'aria-hidden':'true'});
  e.innerHTML = iconeMagiaSVG(s, cor, false);
  return e;
}

// Toca o efeito de tela de uma magia (ao lançar e ao aprender).
function tocarFeitico(s){
  if(typeof document==='undefined' || (typeof window!=='undefined' && window.__T20_TESTE)) return;
  const est = estiloDaMagia(s);
  const base = TEMAS_FEITICO[est.tema];
  // A cor própria da magia (quando tem) também pinta as partículas.
  const cfg = est.cor ? Object.assign({}, base, {cor: est.cor, cores: ['#ffffff', est.cor, est.cor, base.cores[base.cores.length-1]]}) : base;
  const cena = (typeof CENAS_FEITICO!=='undefined' && est.cena) ? CENAS_FEITICO[est.cena] : null;
  const velho = document.getElementById('feitico'); if(velho) velho.remove();
  const camada = document.createElement('div');
  camada.id = 'feitico'; camada.className = 'feitico tema-'+est.tema+' mov-'+est.mov+(est.grande ? ' grande' : '')+(cena && cena.classe ? ' '+cena.classe : '')+(est.cena ? ' cena-'+est.cena : ''); camada.setAttribute('aria-hidden','true');
  camada.style.setProperty('--cor-feitico', cfg.cor);
  const parado = typeof movimentoReduzido==='function' && movimentoReduzido();
  const icone = iconeMagiaSVG(s, cfg.cor, true);
  const copias = cena && cena.clones ? Array.from({length:cena.clones}, (_,i)=> '<div class="sigilo-feitico copia c'+(i+1)+'">'+icone+'</div>').join('') : '';
  camada.innerHTML = '<div class="clarao"></div>'+copias+'<div class="sigilo-feitico">'+icone+'</div><div class="nome-feitico">'+String(s.n||'').replace(/[<>&]/g,'')+'</div>';
  if(parado) camada.classList.add('parado');
  document.body.appendChild(camada);
  if(typeof Som!=='undefined') Som.tocar(cfg.som);
  setTimeout(()=> camada.classList.add('saindo'), DURACAO_FEITICO - 450);
  setTimeout(()=> camada.remove(), DURACAO_FEITICO);
  if(parado) return;
  if(/jsdom/i.test((navigator&&navigator.userAgent)||'')) return; // sem canvas no ambiente de testes
  animarParticulasFeitico(camada, est, cfg, cena);
}
