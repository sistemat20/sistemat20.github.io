// ============ EFEITOS DE MAGIA (15/11/2026) ============
// Ao lançar, cada magia ganha um efeito de tela que lembra o que ela é: chamas para fogo,
// raios para eletricidade, pentagrama para convocação, escudo de runas para abjuração, olho para
// adivinhação, círculo alquímico para transmutação, crânio para necromancia, e assim por diante.
// O tema sai do nome (algumas magias conhecidas têm o seu), depois do elemento no nome ou no
// texto, e por fim da escola. Camada fixa fora do #root (o render não interrompe), sem receber
// toque; dura uns 2 segundos. Com "reduzir movimento" do aparelho, mostra só o símbolo parado.

const TEMA_POR_NOME = {
  'Bola de Fogo':'fogo', 'Explosão de Chamas':'fogo', 'Relâmpago':'raio', 'Seta Infalível de Talude':'setas',
  'Curar Ferimentos':'cura', 'Armadura Arcana':'escudo', 'Escudo da Fé':'escudo', 'Proteção Divina':'escudo',
  'Bênção':'luz', 'Conjurar Monstro':'invocacao', 'Toque Vampírico':'vampiro', 'Sono':'sono',
  'Comando':'encanto', 'Enfeitiçar':'encanto', 'Visão Mística':'olho', 'Compreensão':'olho', 'Aviso':'olho',
  'Disfarce Ilusório':'ilusao', 'Transmutar Objetos':'alquimia', 'Adaga Mental':'encanto', 'Voz Divina':'luz',
};
// Pelo nome da magia (primeiro) e, no texto, só quando fala de dano do elemento ou de curar.
const TEMA_POR_ELEMENTO = [
  ['fogo', /fogo|chama|flamej|incend|ígne|igne|inferno|brasa/i], ['frio', /frio|gelo|congel|polar|nevasca|inverno/i],
  ['raio', /rel[âa]mpago|trov[ãa]o|tempestade|el[ée]tric/i], ['acido', /[áa]cido|corros/i], ['vampiro', /vamp[ií]r/i],
  ['trevas', /trevas|sombra|escurid|morte|profan|podrid/i], ['luz', /\bluz\b|solar|sagrad|divin|consagr|b[êe]n[çc][ãa]o|milagre/i],
  ['cura', /\bcura|curar|restaura|regenera/i], ['sono', /\bsono\b|sonho/i],
];
const TEMA_POR_DANO = [
  ['fogo', /dano de fogo/i], ['frio', /dano de frio/i], ['raio', /dano de eletricidade|dano el[ée]trico/i], ['acido', /dano de [áa]cido/i],
  ['trevas', /dano de trevas/i], ['luz', /dano de luz/i], ['cura', /\b(cura|recupera) \d+d\d+/i],
];
const TEMA_POR_ESCOLA = {
  'Abjuração':'escudo', 'Adivinhação':'olho', 'Convocação':'invocacao', 'Encantamento':'encanto',
  'Evocação':'setas', 'Ilusão':'ilusao', 'Necromancia':'necro', 'Transmutação':'alquimia',
};
function temaDaMagia(s){
  if(!s) return 'setas';
  if(TEMA_POR_NOME[s.n]) return TEMA_POR_NOME[s.n];
  for(const [t, re] of TEMA_POR_ELEMENTO) if(re.test(s.n||'')) return t;
  for(const [t, re] of TEMA_POR_DANO) if(re.test((s.d||'').slice(0, 260))) return t;
  return TEMA_POR_ESCOLA[s.e] || 'setas';
}

// Cor principal, cores das partículas, mistura (claro soma luz; escuro escurece) e som.
const TEMAS_FEITICO = {
  fogo:{cor:'#ff8a2a', cores:['#fff1a8','#ffcc4d','#ff8a2a','#e0451c'], claro:true, som:'fogo', sigilo:'chamas'},
  frio:{cor:'#9fdcff', cores:['#ffffff','#d7f2ff','#9fdcff','#5aa8e6'], claro:true, som:'tempera', sigilo:'floco'},
  raio:{cor:'#bfe0ff', cores:['#ffffff','#e3f1ff','#9cc7ff'], claro:true, som:'baque', sigilo:'estrela'},
  acido:{cor:'#9be15d', cores:['#e6ffb0','#b6f06a','#7cc63c','#4f8f22'], claro:true, som:'gole', sigilo:'bolhas'},
  luz:{cor:'#ffe08a', cores:['#ffffff','#fff3c4','#ffe08a','#f5c44a'], claro:true, som:'sino', sigilo:'sol'},
  trevas:{cor:'#7a4fb8', cores:['#1a0d26','#2e1745','#4b2a73','#7a4fb8'], claro:false, som:'baque', sigilo:'lua'},
  cura:{cor:'#8ee3a0', cores:['#f4ffe8','#c8f5b5','#8ee3a0','#ffe08a'], claro:true, som:'sino', sigilo:'folha'},
  encanto:{cor:'#ef8fd0', cores:['#ffe3f5','#ffb3e2','#ef8fd0','#b46ee0'], claro:true, som:'brilho', sigilo:'espiral'},
  escudo:{cor:'#8fc3ff', cores:['#ffffff','#cfe5ff','#8fc3ff','#d8bd74'], claro:true, som:'tempera', sigilo:'hexagono'},
  invocacao:{cor:'#ff5a5a', cores:['#ffd2b0','#ff9a6a','#ff5a5a','#b0223a'], claro:true, som:'martelo', sigilo:'pentagrama'},
  olho:{cor:'#ffd36e', cores:['#ffffff','#fff0c0','#ffd36e','#b9a2ff'], claro:true, som:'sino', sigilo:'olho'},
  ilusao:{cor:'#b59cff', cores:['#ffffff','#e0d4ff','#b59cff','#7fd4ff','#ff9cd8'], claro:true, som:'brilho', sigilo:'espiral'},
  necro:{cor:'#6fdc8c', cores:['#0b1a10','#173a22','#2f6b40','#6fdc8c'], claro:false, som:'baque', sigilo:'caveira'},
  vampiro:{cor:'#e0334a', cores:['#ffd0d6','#ff6b7f','#e0334a','#7a0f20'], claro:true, som:'baque', sigilo:'caveira'},
  alquimia:{cor:'#e8c46a', cores:['#fff5d6','#e8c46a','#7fd4c8','#c98a3a'], claro:true, som:'tempera', sigilo:'alquimia'},
  setas:{cor:'#9c9cff', cores:['#ffffff','#d6d6ff','#9c9cff','#6f8fc4'], claro:true, som:'brilho', sigilo:'estrela'},
  sono:{cor:'#a98be0', cores:['#efe6ff','#cdb8ff','#a98be0','#6f5aa8'], claro:true, som:'brilho', sigilo:'lua'},
};

// ---- Símbolos (SVG 200×200, traço que se desenha) ----
function sigiloSVG(tipo, cor){
  const t = 'stroke="'+cor+'" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"';
  const anel = '<circle cx="100" cy="100" r="88" '+t+' class="trac"/><circle cx="100" cy="100" r="80" '+t+' stroke-width="1" class="trac" opacity=".6"/>';
  const pontosEstrela = (n, r1, r2, giro)=>{ const p=[]; for(let i=0;i<n*2;i++){ const a = Math.PI*i/n - Math.PI/2 + (giro||0); const r = i%2 ? r2 : r1; p.push((100+r*Math.cos(a)).toFixed(1)+','+(100+r*Math.sin(a)).toFixed(1)); } return p.join(' '); };
  const runas = (r)=>{ let g=''; for(let i=0;i<12;i++){ const a = i*Math.PI/6; const x = 100+r*Math.cos(a), y = 100+r*Math.sin(a); g += '<path d="M'+(x-3)+' '+(y-4)+' L'+(x+3)+' '+(y+4)+' M'+(x+3)+' '+(y-4)+' L'+x+' '+y+'" '+t+' stroke-width="1.4" class="trac"/>'; } return g; };
  const desenhos = {
    pentagrama: anel + '<polygon points="'+[0,2,4,1,3].map(i=>{ const a = -Math.PI/2 + i*2*Math.PI/5; return (100+78*Math.cos(a)).toFixed(1)+','+(100+78*Math.sin(a)).toFixed(1); }).join(' ')+'" '+t+' class="trac"/>' + runas(70),
    hexagono: '<polygon points="'+pontosEstrela(3,84,84)+'" '+t+' class="trac"/><polygon points="'+pontosEstrela(3,64,64,Math.PI/6)+'" '+t+' class="trac" opacity=".7"/>' + runas(92),
    olho: anel + '<path d="M28 100 Q100 40 172 100 Q100 160 28 100 Z" '+t+' class="trac"/><circle cx="100" cy="100" r="24" '+t+' class="trac"/><circle cx="100" cy="100" r="9" fill="'+cor+'" class="pupila"/>',
    alquimia: anel + '<polygon points="100,22 168,140 32,140" '+t+' class="trac"/><rect x="54" y="54" width="92" height="92" '+t+' class="trac" opacity=".7"/><circle cx="100" cy="100" r="34" '+t+' class="trac"/>',
    floco: (()=>{ let g=''; for(let i=0;i<6;i++){ const a=i*Math.PI/3; const x=100+80*Math.cos(a), y=100+80*Math.sin(a); const mx=100+48*Math.cos(a), my=100+48*Math.sin(a);
      g += '<path d="M100 100 L'+x.toFixed(1)+' '+y.toFixed(1)+' M'+mx.toFixed(1)+' '+my.toFixed(1)+' L'+(mx+18*Math.cos(a+0.7)).toFixed(1)+' '+(my+18*Math.sin(a+0.7)).toFixed(1)+' M'+mx.toFixed(1)+' '+my.toFixed(1)+' L'+(mx+18*Math.cos(a-0.7)).toFixed(1)+' '+(my+18*Math.sin(a-0.7)).toFixed(1)+'" '+t+' class="trac"/>'; } return g; })(),
    chamas: anel + (()=>{ let g=''; for(let i=0;i<8;i++){ const a=i*Math.PI/4; const x=100+66*Math.cos(a), y=100+66*Math.sin(a); g += '<path d="M'+x.toFixed(1)+' '+(y+10).toFixed(1)+' Q'+(x-9).toFixed(1)+' '+y.toFixed(1)+' '+x.toFixed(1)+' '+(y-14).toFixed(1)+' Q'+(x+9).toFixed(1)+' '+y.toFixed(1)+' '+x.toFixed(1)+' '+(y+10).toFixed(1)+'" '+t+' class="trac"/>'; } return g; })() + '<circle cx="100" cy="100" r="26" '+t+' class="trac"/>',
    estrela: anel + '<polygon points="'+pontosEstrela(8,82,34)+'" '+t+' class="trac"/>',
    sol: anel + '<circle cx="100" cy="100" r="30" '+t+' class="trac"/><polygon points="'+pontosEstrela(12,76,40)+'" '+t+' class="trac" opacity=".8"/>',
    lua: anel + '<path d="M120 46 A58 58 0 1 0 120 154 A44 44 0 1 1 120 46 Z" '+t+' class="trac"/>' + runas(70),
    folha: anel + '<path d="M100 40 Q150 90 100 160 Q50 90 100 40 Z M100 52 L100 150" '+t+' class="trac"/><path d="M82 100 L118 100 M100 82 L100 118" '+t+' class="trac" stroke-width="5"/>',
    espiral: '<path d="'+(()=>{ let d='M100 100'; for(let i=1;i<=120;i++){ const a=i*0.18, r=i*0.7; d+=' L'+(100+r*Math.cos(a)).toFixed(1)+' '+(100+r*Math.sin(a)).toFixed(1); } return d; })()+'" '+t+' class="trac"/>' + anel,
    bolhas: anel + '<circle cx="80" cy="110" r="18" '+t+' class="trac"/><circle cx="118" cy="86" r="12" '+t+' class="trac"/><circle cx="112" cy="128" r="8" '+t+' class="trac"/><circle cx="90" cy="72" r="6" '+t+' class="trac"/>',
    caveira: anel + '<path d="M66 96 Q66 50 100 50 Q134 50 134 96 Q134 116 122 122 L122 140 L78 140 L78 122 Q66 116 66 96 Z" '+t+' class="trac"/><circle cx="86" cy="98" r="9" fill="'+cor+'" opacity=".85"/><circle cx="114" cy="98" r="9" fill="'+cor+'" opacity=".85"/><path d="M92 140 L92 128 M100 140 L100 128 M108 140 L108 128" '+t+' class="trac"/>',
  };
  return '<svg viewBox="0 0 200 200" aria-hidden="true">'+(desenhos[tipo]||desenhos.estrela)+'</svg>';
}

// ---- Partículas ----
const DURACAO_FEITICO = 2100;
function emitirFeitico(tema, P, W, H, quadro, cfg){
  const cx = W/2, cy = H*0.44, sorte = Math.random, cor = ()=> cfg.cores[Math.floor(sorte()*cfg.cores.length)];
  const p = (o)=> P.push(Object.assign({vida:0, max:60+sorte()*40, tam:2+sorte()*3, cor:cor(), forma:'ponto', rot:0, vr:0, g:0}, o));
  if(quadro > 70) return; // emite só no começo; o resto é a cauda das partículas
  const n = quadro < 10 ? 10 : 4;
  for(let i=0;i<n;i++){
    const a = sorte()*Math.PI*2, v = 1+sorte()*4;
    switch(tema){
      case 'fogo': p({x:cx+(sorte()-.5)*W*.9, y:H+10, vx:(sorte()-.5)*1.5, vy:-(6+sorte()*9), tam:4+sorte()*7, g:-0.04, max:70+sorte()*40}); p({x:cx+(sorte()-.5)*W*.9, y:H+10, vx:(sorte()-.5)*1.2, vy:-(4+sorte()*6), tam:3+sorte()*5, g:-0.03}); if(quadro<8) p({x:cx, y:cy, vx:Math.cos(a)*v*2, vy:Math.sin(a)*v*2, tam:4+sorte()*5}); break;
      case 'frio': { const r = Math.max(W,H)*0.6; p({x:cx+Math.cos(a)*r, y:cy+Math.sin(a)*r, vx:-Math.cos(a)*(5+sorte()*4), vy:-Math.sin(a)*(5+sorte()*4), forma:'floco', tam:4+sorte()*5, vr:(sorte()-.5)*.2, max:70}); break; }
      case 'acido': p({x:sorte()*W, y:-10, vx:0, vy:3+sorte()*4, g:0.15, forma:'gota', tam:3+sorte()*4}); break;
      case 'luz': case 'olho': p({x:cx+(sorte()-.5)*W*.8, y:cy+(sorte()-.2)*H*.5, vx:(sorte()-.5)*.4, vy:-(0.6+sorte()*1.6), tam:2+sorte()*4, max:80}); break;
      case 'trevas': case 'necro': { const r = Math.max(W,H)*0.55; p({x:cx+Math.cos(a)*r, y:cy+Math.sin(a)*r, vx:-Math.cos(a+0.6)*3, vy:-Math.sin(a+0.6)*3, forma:'fumaca', tam:30+sorte()*40, max:80}); if(tema==='necro' && sorte()<.4) p({x:cx+(sorte()-.5)*W*.6, y:H, vx:0, vy:-(1+sorte()*2), cor:'#6fdc8c', tam:2+sorte()*3}); break; }
      case 'cura': p({x:cx+(sorte()-.5)*W*.7, y:H*0.85, vx:(sorte()-.5)*.5, vy:-(1+sorte()*2.2), forma: sorte()<.35 ? 'cruz' : 'ponto', tam:3+sorte()*4, max:90}); break;
      case 'encanto': case 'sono': p({x:cx, y:cy, vx:Math.cos(a)*v, vy:Math.sin(a)*v, forma: tema==='sono' && sorte()<.3 ? 'z' : (sorte()<.3 ? 'coracao' : 'ponto'), espiral:0.06, tam:3+sorte()*4, max:80}); break;
      case 'escudo': p({x:cx+Math.cos(a)*90, y:cy+Math.sin(a)*90, vx:-Math.sin(a)*3, vy:Math.cos(a)*3, orbita:{a, r:80+sorte()*30, w:0.06+sorte()*0.04}, tam:2+sorte()*3}); break;
      case 'invocacao': p({x:cx+(sorte()-.5)*170, y:cy+70+(sorte()-.5)*30, vx:(sorte()-.5)*.6, vy:-(1.5+sorte()*3), tam:2+sorte()*4, max:70}); break;
      case 'ilusao': p({x:cx, y:cy, vx:Math.cos(a)*v*1.6, vy:Math.sin(a)*v*1.6, forma:'caco', tam:6+sorte()*8, vr:(sorte()-.5)*.3}); break;
      case 'vampiro': { const r = Math.max(W,H)*0.5; p({x:cx+Math.cos(a)*r, y:cy+Math.sin(a)*r, vx:-Math.cos(a)*(4+sorte()*3), vy:-Math.sin(a)*(4+sorte()*3), tam:3+sorte()*4, max:55}); break; }
      case 'alquimia': p({x:cx+Math.cos(a)*100, y:cy+Math.sin(a)*100, orbita:{a, r:60+sorte()*60, w:(sorte()<.5?1:-1)*(0.04+sorte()*0.04)}, tam:2+sorte()*3}); break;
      default: /* setas e raio: feixes que saem do centro */ if(quadro%3===0) p({x:cx, y:cy, vx:Math.cos(a)*(8+sorte()*6), vy:Math.sin(a)*(8+sorte()*6), forma:'faisca', tam:2+sorte()*2, max:40});
    }
  }
}
function desenharParticula(ctx, q){
  const alfa = Math.max(0, 1 - q.vida/q.max);
  ctx.globalAlpha = q.forma==='fumaca' ? alfa*0.5 : alfa;
  ctx.fillStyle = q.cor; ctx.strokeStyle = q.cor;
  ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot);
  switch(q.forma){
    case 'faisca': ctx.lineWidth = q.tam; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-q.vx*3, -q.vy*3); ctx.stroke(); break;
    case 'floco': ctx.lineWidth = 1.2; ctx.beginPath(); for(let i=0;i<6;i++){ const a=i*Math.PI/3; ctx.moveTo(0,0); ctx.lineTo(Math.cos(a)*q.tam, Math.sin(a)*q.tam); } ctx.stroke(); break;
    case 'gota': ctx.beginPath(); ctx.ellipse(0, 0, q.tam*.6, q.tam, 0, 0, Math.PI*2); ctx.fill(); break;
    case 'cruz': ctx.fillRect(-q.tam, -q.tam/3, q.tam*2, q.tam*.66); ctx.fillRect(-q.tam/3, -q.tam, q.tam*.66, q.tam*2); break;
    case 'coracao': ctx.font = (q.tam*4)+'px serif'; ctx.fillText('♥', -q.tam, q.tam); break;
    case 'z': ctx.font = 'bold '+(q.tam*4)+'px Cinzel, serif'; ctx.fillText('z', -q.tam, q.tam); break;
    case 'caco': ctx.beginPath(); ctx.moveTo(0,-q.tam); ctx.lineTo(q.tam*.7, q.tam*.6); ctx.lineTo(-q.tam*.6, q.tam*.4); ctx.closePath(); ctx.globalAlpha *= .6; ctx.fill(); ctx.globalAlpha = alfa; ctx.lineWidth=1; ctx.strokeStyle='#fff'; ctx.stroke(); break;
    case 'fumaca': { const gr = ctx.createRadialGradient(0,0,0,0,0,q.tam); gr.addColorStop(0, q.cor); gr.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0,0,q.tam,0,Math.PI*2); ctx.fill(); break; }
    default: { const gr = ctx.createRadialGradient(0,0,0,0,0,q.tam*2.2); gr.addColorStop(0, '#fff'); gr.addColorStop(.35, q.cor); gr.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0,0,q.tam*2.2,0,Math.PI*2); ctx.fill(); }
  }
  ctx.restore();
}
// Raios: linhas quebradas do alto até o centro, redesenhadas em alguns quadros (piscam).
function desenharRaios(ctx, W, H, quadro){
  if(!(quadro<6 || (quadro>12 && quadro<16) || (quadro>24 && quadro<27))) return;
  ctx.globalAlpha = 1; ctx.strokeStyle = '#f2f8ff'; ctx.shadowColor = '#9cc7ff'; ctx.shadowBlur = 18;
  for(let b=0;b<3;b++){
    let x = W*(0.25+0.25*b) + (Math.random()-.5)*60, y = -10;
    ctx.lineWidth = 2.5+Math.random()*2; ctx.beginPath(); ctx.moveTo(x, y);
    while(y < H*0.44){ x += (Math.random()-.5)*60; y += 20+Math.random()*30; ctx.lineTo(x, Math.min(y, H*0.44)); }
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
}

function tocarFeitico(s){
  if(typeof document==='undefined' || (typeof window!=='undefined' && window.__T20_TESTE)) return;
  const tema = temaDaMagia(s);
  const cfg = TEMAS_FEITICO[tema] || TEMAS_FEITICO.setas;
  const velho = document.getElementById('feitico'); if(velho) velho.remove();
  const camada = document.createElement('div');
  camada.id = 'feitico'; camada.className = 'feitico tema-'+tema; camada.setAttribute('aria-hidden','true');
  camada.style.setProperty('--cor-feitico', cfg.cor);
  const parado = typeof movimentoReduzido==='function' && movimentoReduzido();
  camada.innerHTML = '<div class="clarao"></div><div class="sigilo-feitico">'+sigiloSVG(cfg.sigilo, cfg.cor)+'</div><div class="nome-feitico">'+String(s.n||'').replace(/[<>&]/g,'')+'</div>';
  if(parado) camada.classList.add('parado');
  document.body.appendChild(camada);
  if(typeof Som!=='undefined') Som.tocar(cfg.som);
  setTimeout(()=> camada.classList.add('saindo'), DURACAO_FEITICO - 450);
  setTimeout(()=> camada.remove(), DURACAO_FEITICO);
  if(parado) return;
  if(/jsdom/i.test((navigator&&navigator.userAgent)||'')) return; // sem canvas no ambiente de testes
  const canvas = document.createElement('canvas');
  let ctx = null; try{ ctx = canvas.getContext('2d'); }catch(e){}
  if(!ctx) return;
  const dpr = Math.min(window.devicePixelRatio||1, 2), W = window.innerWidth, H = window.innerHeight;
  canvas.width = W*dpr; canvas.height = H*dpr; canvas.style.width = W+'px'; canvas.style.height = H+'px';
  ctx.scale(dpr, dpr);
  camada.insertBefore(canvas, camada.firstChild);
  const P = []; let quadro = 0; const inicio = performance.now();
  const passo = (agora)=>{
    if(!camada.isConnected || agora - inicio > DURACAO_FEITICO) return;
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = cfg.claro ? 'lighter' : 'source-over';
    emitirFeitico(tema, P, W, H, quadro, cfg);
    for(let i=P.length-1;i>=0;i--){
      const q = P[i];
      if(q.orbita){ q.orbita.a += q.orbita.w; q.orbita.r *= 0.995; q.x = W/2 + Math.cos(q.orbita.a)*q.orbita.r; q.y = H*0.44 + Math.sin(q.orbita.a)*q.orbita.r; }
      else { if(q.espiral){ const a = Math.atan2(q.vy, q.vx) + q.espiral, v = Math.hypot(q.vx, q.vy)*0.985; q.vx = Math.cos(a)*v; q.vy = Math.sin(a)*v; } q.vy += q.g; q.x += q.vx; q.y += q.vy; }
      q.rot += q.vr; q.vida++;
      if(q.vida > q.max){ P.splice(i,1); continue; }
      desenharParticula(ctx, q);
    }
    if(tema==='raio') desenharRaios(ctx, W, H, quadro);
    quadro++;
    requestAnimationFrame(passo);
  };
  requestAnimationFrame(passo);
}
