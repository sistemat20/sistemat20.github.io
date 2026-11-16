// ============ Cenas das magias (prancha "Magias únicas", 15/11/2026) ============
// Parte do lugar central dos efeitos (ver o topo de js/feiticos.js). A cena é o que só aquela
// magia tem, desenhado por cima das partículas: a esfera da Bola de Fogo, a teia se tecendo, as
// correntes da Âncora, a criatura que sobe do círculo das convocações... Cada magia escolhe a
// sua em data/temas-magia.js com "c:nome" ou "c:nome:detalhe" (ex.: c:surgir:cavalo).
// classe: classe extra na camada (mexe no símbolo grande, em css/feiticos.css);
// clones: quantas cópias do símbolo grande (Imagem Espelhada); desenhar: um quadro da cena.

const _imagensIcone = {};
function imagemIconeMagia(nome, cor){
  const k = nome+'|'+cor;
  if(!_imagensIcone[k]){
    const im = new Image();
    im.src = 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(iconeMagiaSVG({n:nome}, cor, false).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '));
    _imagensIcone[k] = im;
  }
  return _imagensIcone[k];
}
const _sobe = (t)=> t<0 ? 0 : t>1 ? 1 : 1-(1-t)*(1-t);
const _some = (f, de, dur)=> f<de ? 1 : Math.max(0, 1-(f-de)/dur);

// Criaturas que sobem do círculo no chão (caixa 100×100, base embaixo).
const SILHUETAS_FEITICO = {
  monstro: 'M18 100 L22 62 Q16 42 28 30 L18 6 L38 24 Q50 18 62 24 L82 6 L72 30 Q84 42 78 62 L82 100 Z',
  esqueleto: 'M42 6 Q58 2 60 18 Q62 28 54 32 L54 38 L46 38 L46 32 Q38 28 40 18 Q40 8 42 6 Z M48 40 L52 40 L52 70 L48 70 Z M34 44 L66 44 L66 48 L34 48 Z M36 52 L64 52 L64 55 L36 55 Z M38 59 L62 59 L62 62 L38 62 Z M34 44 L20 30 L24 27 L38 42 Z M66 44 L80 30 L76 27 L62 42 Z M44 70 L56 70 L60 100 L54 100 L50 78 L46 100 L40 100 Z',
  elemental: 'M50 0 Q62 18 58 30 Q74 34 78 58 L66 54 L70 100 L56 100 L50 72 L44 100 L30 100 L34 54 L22 58 Q26 34 42 30 Q38 18 50 0 Z',
  cavalo: 'M26 100 L32 60 Q24 40 38 24 L36 6 L48 18 Q66 16 78 34 L88 52 Q82 60 72 52 L62 48 Q58 72 66 100 Z',
  lobo: 'M16 100 L28 60 L16 28 L34 40 L42 16 L52 38 Q72 38 84 54 L94 60 L84 70 L68 66 L72 100 Z',
  espirito: 'M50 0 Q80 30 70 60 Q66 80 76 100 Q60 90 50 100 Q40 90 24 100 Q34 80 30 60 Q20 30 50 0 Z',
  arma: 'M48 0 L52 0 L55 68 L68 68 L68 75 L55 75 L55 90 L60 100 L40 100 L45 90 L45 75 L32 75 L32 68 L45 68 Z',
  objeto: 'M20 40 L50 24 L80 40 L80 80 L50 96 L20 80 Z',
};
const OLHOS_SILHUETA = { monstro:[[38,46],[62,46]], lobo:[[60,46]], espirito:[[42,40],[58,40]], elemental:[[44,24],[56,24]], cavalo:[[60,30]], esqueleto:[[45,17],[55,17]] };
const _caminhos = {};
function caminhoSilhueta(nome){ if(!_caminhos[nome] && typeof Path2D!=='undefined') _caminhos[nome] = new Path2D(SILHUETAS_FEITICO[nome] || SILHUETAS_FEITICO.monstro); return _caminhos[nome]; }

function raioQuebradoFeitico(ctx, x1, y1, x2, y2, desvio, galhos){
  const pts = [[x1,y1]], passos = 10;
  for(let i=1;i<passos;i++){ const t = i/passos; pts.push([x1+(x2-x1)*t+(Math.random()-.5)*desvio, y1+(y2-y1)*t+(Math.random()-.5)*desvio*.3]); }
  pts.push([x2,y2]);
  ctx.beginPath(); pts.forEach(([x,y],i)=> i ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); ctx.stroke();
  for(let g=0; g<(galhos||0); g++){ const [x,y] = pts[2+Math.floor(Math.random()*(passos-4))]; ctx.lineWidth *= .5; raioQuebradoFeitico(ctx, x, y, x+(Math.random()-.5)*140, y-30-Math.random()*60, 30, 0); ctx.lineWidth *= 2; }
}

const CENAS_FEITICO = {
  // Bola de Fogo: quando a conta chega, vira uma esfera de fogo que engole a área.
  esfera:{ desenhar(ctx, W, H, f){ if(f<20) return; const R = Math.min(W,H)*.5*_sobe((f-20)/14), a = _some(f, 34, 30), cx = W/2, cy = H*.44;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1,R)); g.addColorStop(0,'rgba(255,255,230,'+a+')'); g.addColorStop(.35,'rgba(255,190,70,'+a*.9+')'); g.addColorStop(.7,'rgba(255,100,30,'+a*.6+')'); g.addColorStop(1,'rgba(200,40,10,0)');
    ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, Math.max(1,R), 0, 6.283); ctx.fill(); } },
  // Teia: fios do centro até as bordas e os anéis se tecendo.
  teia:{ desenhar(ctx, W, H, f){ const cx = W/2, cy = H*.44, L = Math.hypot(W,H)*.55; ctx.globalAlpha = _some(f, 90, 30)*.85; ctx.strokeStyle = '#eafde0'; ctx.lineWidth = 1.3;
    for(let i=0;i<10;i++){ const k = i*Math.PI/5+.2, l = L*_sobe(f/18); ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+Math.cos(k)*l, cy+Math.sin(k)*l); ctx.stroke(); }
    for(let anel=0; anel<6; anel++){ const prog = _sobe((f-14-anel*7)/14); if(prog<=0) continue; const R = 34+anel*Math.min(W,H)*.09; ctx.beginPath(); const fim = Math.ceil(10*prog);
      for(let i=0;i<=fim;i++){ const k = i*Math.PI/5+.2, x = cx+Math.cos(k)*R, y = cy+Math.sin(k)*R; if(!i) ctx.moveTo(x,y); else { const kp = (i-.5)*Math.PI/5+.2; ctx.quadraticCurveTo(cx+Math.cos(kp)*R*.85, cy+Math.sin(kp)*R*.85, x, y); } } ctx.stroke(); } } },
  // Imagem Espelhada / Duplicata: cópias do símbolo saem e trocam de lugar (em CSS).
  espelhos:{ classe:'c-espelhos', clones:2, desenhar(){} },
  // Buraco Negro: disco negro com anéis girando; o símbolo é puxado para dentro.
  vazio:{ classe:'c-sugar', desenhar(ctx, W, H, f, est, cfg){ const cx = W/2, cy = H*.44, R = Math.min(58, f*2.6); ctx.save(); ctx.translate(cx, cy); ctx.rotate(-.3); ctx.strokeStyle = cfg.cor; ctx.lineWidth = 2; ctx.shadowColor = cfg.cor; ctx.shadowBlur = 16;
    for(let k=0;k<3;k++){ ctx.globalAlpha = .6-k*.15; ctx.beginPath(); ctx.ellipse(0, 0, R*2+k*20, (R*2+k*20)*.32, f*.05*(k%2 ? -1 : 1), 0, 6.283); ctx.stroke(); } ctx.restore();
    ctx.globalAlpha = 1; ctx.shadowBlur = 26; ctx.shadowColor = cfg.cor; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283); ctx.fill(); ctx.shadowBlur = 0; } },
  // Sono e Sonho: a tela escurece devagar e os Z sobem.
  sonolencia:{ classe:'c-sono', desenhar(ctx, W, H, f){ ctx.globalAlpha = Math.min(.55, f/90)*_some(f, 105, 20); ctx.fillStyle = '#0b0820'; ctx.fillRect(0, 0, W, H);
    for(let k=0;k<3;k++){ const t = (f-k*14)/70; if(t<0 || t>1) continue; ctx.globalAlpha = Math.sin(t*Math.PI); ctx.fillStyle = '#e6dcff'; ctx.font = '700 '+(24+k*10)+'px Cinzel, serif'; ctx.fillText('Z', W/2+40+k*20+Math.sin(t*6)*8, H*.66-t*H*.48); } } },
  // Correntes que vêm dos cantos e travam o alvo (Âncora, Amarras, Aprisionamento).
  correntes:{ classe:'c-fecha', desenhar(ctx, W, H, f, est, cfg){ const cx = W/2, cy = H*.44, prog = _sobe(f/34); ctx.strokeStyle = cfg.cor; ctx.lineWidth = 2.4; ctx.shadowColor = cfg.cor; ctx.shadowBlur = 10; ctx.globalAlpha = _some(f, 90, 30);
    [[0,0],[W,0],[0,H],[W,H]].forEach(([x,y])=>{ const ex = x+(cx-x)*prog*.84, ey = y+(cy-y)*prog*.84, ang = Math.atan2(cy-y, cx-x), d = Math.hypot(ex-x, ey-y);
      for(let s=0; s<d; s+=16){ ctx.save(); ctx.translate(x+Math.cos(ang)*s, y+Math.sin(ang)*s); ctx.rotate(ang+((s/16)%2 ? Math.PI/2 : 0)); ctx.beginPath(); ctx.ellipse(0, 0, 8, 4.5, 0, 0, 6.283); ctx.stroke(); ctx.restore(); } });
    if(f>=34 && f<48){ ctx.globalAlpha = 1-(f-34)/14; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy, 50+(f-34)*7, 0, 6.283); ctx.stroke(); } ctx.shadowBlur = 0; } },
  // Cura: o centro pulsa como um coração batendo.
  pulso:{ desenhar(ctx, W, H, f, est, cfg){ [8,26,44].forEach(b=>{ const t = (f-b)/18; if(t<0 || t>1) return; const R = 40+t*Math.min(W,H)*.3, cx = W/2, cy = H*.44; ctx.globalAlpha = (1-t)*.6; const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R); g.addColorStop(0, cfg.cor); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283); ctx.fill(); }); } },
  // Relâmpago: um raio rasga a tela de baixo para cima, piscando com galhos.
  raio:{ desenhar(ctx, W, H, f, est, cfg){ if(f<2){ ctx.globalAlpha = .5; ctx.fillStyle = '#eef6ff'; ctx.fillRect(0, 0, W, H); }
    if(!(f<7 || (f>11 && f<15) || (f>21 && f<24))) return; ctx.globalAlpha = 1; ctx.strokeStyle = '#f6fbff'; ctx.shadowColor = cfg.cor; ctx.shadowBlur = 22; ctx.lineWidth = 4; raioQuebradoFeitico(ctx, W*.35, H+10, W*.62, -10, 90, 3); ctx.shadowBlur = 0; } },
  // Gelo: onde acerta, cristais se espalham e a tela esfria.
  cristais:{ desenhar(ctx, W, H, f, est, cfg, P, mem){ if(f<20) return; const cx = W/2, cy = H*.44, t = _sobe((f-20)/24), a = _some(f, 90, 30);
    if(!mem.cristais){ mem.cristais = []; for(let i=0;i<14;i++) mem.cristais.push({a:i*Math.PI/7+Math.random()*.2, l:Math.min(W,H)*(.14+Math.random()*.16)}); }
    ctx.globalAlpha = a*.9; ctx.strokeStyle = '#e8f8ff'; ctx.lineWidth = 1.8; ctx.shadowColor = cfg.cor; ctx.shadowBlur = 10;
    mem.cristais.forEach(c=>{ const l = c.l*t; ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+Math.cos(c.a)*l, cy+Math.sin(c.a)*l); [.45,.75].forEach(k=>{ const bx = cx+Math.cos(c.a)*l*k, by = cy+Math.sin(c.a)*l*k, b = 14*t; ctx.moveTo(bx,by); ctx.lineTo(bx+Math.cos(c.a+.7)*b, by+Math.sin(c.a+.7)*b); ctx.moveTo(bx,by); ctx.lineTo(bx+Math.cos(c.a-.7)*b, by+Math.sin(c.a-.7)*b); }); ctx.stroke(); });
    ctx.shadowBlur = 0; ctx.globalAlpha = .25*t*a; const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.max(W,H)*.7); g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'#9fdcff'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); } },
  // Convocações: o círculo acende no chão e a criatura sobe de dentro dele.
  surgir:{ classe:'c-chao', desenhar(ctx, W, H, f, est, cfg, P){ const cx = W/2, chao = H*.58, tipo = est.cenaParam || 'monstro', a = _some(f, 100, 26);
    ctx.globalAlpha = Math.min(1, f/10)*a*.8; ctx.strokeStyle = cfg.cor; ctx.lineWidth = 3; ctx.shadowColor = cfg.cor; ctx.shadowBlur = 18; ctx.beginPath(); ctx.ellipse(cx, chao, Math.min(W*.4, 170), Math.min(W*.4,170)*.26, 0, 0, 6.283); ctx.stroke(); ctx.shadowBlur = 0;
    if(tipo==='enxame'){ if(f>8 && f<60) for(let i=0;i<5;i++) P.push({x:cx+(Math.random()-.5)*W*.5, y:chao, vx:(Math.random()-.5)*4, vy:-(2+Math.random()*3), g:0, vida:0, max:50, tam:2, cor:cfg.cores[Math.floor(Math.random()*cfg.cores.length)], forma:'ponto', rot:0, vr:0, espiral:.2}); return; }
    const caminho = caminhoSilhueta(tipo); if(!caminho) return;
    const quantos = Math.max(1, est.qtd||1), tam = Math.min(W, H)*(quantos>1 ? .27 : .42), t = _sobe((f-10)/30);
    for(let k=0;k<quantos;k++){
      const off = quantos>1 ? (k-(quantos-1)/2)*tam*.75 : 0, tk = quantos>1 ? _sobe((f-10-k*5)/26) : t, x = cx+off-tam/2, y = chao-tam*tk;
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, chao+2); ctx.clip(); ctx.translate(x, y); ctx.scale(tam/100, tam/100);
      const g = ctx.createLinearGradient(0, 0, 0, 100); g.addColorStop(0, cfg.cor); g.addColorStop(1, 'rgba(0,0,0,.2)');
      ctx.globalAlpha = .85*a; ctx.fillStyle = g; ctx.shadowColor = cfg.cor; ctx.shadowBlur = 24; ctx.fill(caminho); ctx.shadowBlur = 0;
      (OLHOS_SILHUETA[tipo]||[]).forEach(([ox,oy])=>{ ctx.globalAlpha = a*Math.min(1, Math.max(0, (f-30)/10)); ctx.fillStyle = '#fff6d0'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(ox, oy, 3, 0, 6.283); ctx.fill(); ctx.shadowBlur = 0; });
      ctx.restore();
    } } },
  // Runas: um anel de runas acende e gira em volta do símbolo.
  runas:{ desenhar(ctx, W, H, f, est, cfg){ const cx = W/2, cy = H*.44, R = Math.min(W,H)*.36, n = 12, a = _some(f, 95, 25); ctx.strokeStyle = cfg.cor; ctx.lineWidth = 2; ctx.shadowColor = cfg.cor; ctx.shadowBlur = 10;
    for(let i=0;i<n;i++){ const vis = _sobe((f-i*2)/10); if(vis<=0) continue; const k = i*2*Math.PI/n + f*.012, x = cx+Math.cos(k)*R, y = cy+Math.sin(k)*R; ctx.globalAlpha = vis*a; ctx.save(); ctx.translate(x,y); ctx.rotate(k+Math.PI/2); ctx.beginPath();
      if(i%3===0){ ctx.moveTo(0,-9); ctx.lineTo(0,9); ctx.moveTo(0,-9); ctx.lineTo(7,-2); } else if(i%3===1){ ctx.moveTo(-6,-8); ctx.lineTo(6,8); ctx.moveTo(6,-8); ctx.lineTo(-6,8); } else { ctx.moveTo(0,-9); ctx.lineTo(0,9); ctx.moveTo(-6,0); ctx.lineTo(6,-6); }
      ctx.stroke(); ctx.restore(); }
    ctx.globalAlpha = .5*a*_sobe(f/24); ctx.beginPath(); ctx.arc(cx, cy, R-16, 0, 6.283); ctx.arc(cx, cy, R+16, 0, 6.283); ctx.stroke(); ctx.shadowBlur = 0; } },
  // Cúpula: uma redoma se fecha por cima de quem lançou.
  cupula:{ desenhar(ctx, W, H, f, est, cfg){ const cx = W/2, base = H*.7, R = Math.min(W*.42, H*.42), prog = _sobe(f/26), a = _some(f, 95, 25); ctx.strokeStyle = cfg.cor; ctx.shadowColor = cfg.cor; ctx.shadowBlur = 14; ctx.lineWidth = 3; ctx.globalAlpha = a;
    ctx.beginPath(); ctx.ellipse(cx, base, R, R*.22, 0, 0, 6.283); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, base, R, Math.PI, Math.PI+Math.PI*prog); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, base, R, -Math.PI*prog, 0); ctx.stroke();
    ctx.globalAlpha = .12*a*prog; ctx.fillStyle = cfg.cor; ctx.beginPath(); ctx.arc(cx, base, R, Math.PI, 0); ctx.fill();
    ctx.globalAlpha = .45*a*prog; ctx.lineWidth = 1.2; for(let i=1;i<4;i++){ ctx.beginPath(); ctx.ellipse(cx, base, R*i/4, R, 0, Math.PI, 0); ctx.stroke(); } ctx.shadowBlur = 0; } },
  // Olhar: um olho enorme se abre por trás do símbolo e procura.
  olhar:{ desenhar(ctx, W, H, f, est, cfg){ const cx = W/2, cy = H*.44, L = Math.min(W*.46, 220), ab = Math.sin(Math.min(1, f/18)*Math.PI/2)*(f>90 ? Math.max(0, 1-(f-90)/20) : 1); if(ab<=0) return;
    ctx.globalAlpha = .55; ctx.strokeStyle = cfg.cor; ctx.lineWidth = 3; ctx.shadowColor = cfg.cor; ctx.shadowBlur = 16; ctx.beginPath(); ctx.moveTo(cx-L, cy); ctx.quadraticCurveTo(cx, cy-L*.7*ab, cx+L, cy); ctx.quadraticCurveTo(cx, cy+L*.7*ab, cx-L, cy); ctx.stroke();
    const px = cx+Math.sin(f*.08)*L*.25; ctx.globalAlpha = .35*ab; ctx.fillStyle = cfg.cor; ctx.beginPath(); ctx.arc(px, cy, L*.22*ab, 0, 6.283); ctx.fill(); ctx.shadowBlur = 0; } },
  // Névoa: bancos de névoa (ou de trevas) atravessam a tela.
  nevoa:{ desenhar(ctx, W, H, f, est, cfg, P, mem){ if(!mem.nuvens){ mem.nuvens = []; for(let i=0;i<9;i++) mem.nuvens.push({x:Math.random()*W, y:H*(.2+Math.random()*.6), r:Math.min(W,H)*(.18+Math.random()*.16), v:(Math.random()<.5 ? -1 : 1)*(.6+Math.random())}); }
    const a = Math.min(1, f/20)*_some(f, 95, 25), escuro = !cfg.claro; mem.nuvens.forEach(n=>{ n.x += n.v; const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r); g.addColorStop(0, escuro ? 'rgba(8,4,14,.85)' : cfg.cores[1]); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.globalAlpha = (escuro ? .8 : .35)*a; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, 6.283); ctx.fill(); }); } },
  // Som: arcos de som saem do centro para os dois lados.
  ondas:{ desenhar(ctx, W, H, f, est, cfg){ const cx = W/2, cy = H*.44; ctx.strokeStyle = cfg.cor; ctx.lineWidth = 3; ctx.shadowColor = cfg.cor; ctx.shadowBlur = 10;
    for(let k=0;k<6;k++){ const t = (f-k*6)/36; if(t<0 || t>1) continue; const R = 40+t*Math.min(W,H)*.5; ctx.globalAlpha = 1-t; [0, Math.PI].forEach(lado=>{ ctx.beginPath(); ctx.arc(cx, cy, R, lado-.6, lado+.6); ctx.stroke(); }); } ctx.shadowBlur = 0; } },
  // Sumir: o símbolo se apaga e fica só o brilho em volta (Invisibilidade).
  sumir:{ classe:'c-sumir', desenhar(){} },
  // Fantasma: o próprio desenho da magia, enorme e translúcido, sobe e para (Mão Poderosa).
  fantasma:{ desenhar(ctx, W, H, f, est, cfg){ const im = imagemIconeMagia(est.nome, cfg.cor); if(!im.complete || !im.naturalWidth) return; const t = _sobe(f/26), tam = Math.min(W, H)*.9, y = H+tam*.2-(H*.62+tam*.2)*t;
    ctx.globalAlpha = Math.min(.4, f/20)*_some(f, 100, 26); ctx.drawImage(im, W/2-tam/2, y-tam/2, tam, tam); } },
  // Rachar: o chão racha a partir do centro e pedras pulam; a tela treme.
  rachar:{ classe:'c-treme', desenhar(ctx, W, H, f, est, cfg, P, mem){ const cx = W/2, base = H*.72;
    if(!mem.rachas){ mem.rachas = []; for(let k=0;k<5;k++){ const ang = Math.PI*(.15+.7*k/4), pts = [[cx,base]]; let x = cx, y = base; for(let i=0;i<8;i++){ x += Math.cos(ang)*(W*.07)+(Math.random()-.5)*16; y += Math.sin(ang)*8*(k%2 ? 1 : -.4)+(Math.random()-.5)*10; pts.push([x,y]); } mem.rachas.push(pts, pts.map(([a,b])=>[2*cx-a,b])); } }
    ctx.globalAlpha = _some(f, 90, 30); ctx.strokeStyle = '#f0d9b0'; ctx.lineWidth = 2.6; ctx.shadowColor = cfg.cor; ctx.shadowBlur = 8; const prog = _sobe(f/26);
    mem.rachas.forEach(pts=>{ const fim = Math.ceil((pts.length-1)*prog); ctx.beginPath(); for(let i=0;i<=fim;i++) i ? ctx.lineTo(pts[i][0], pts[i][1]) : ctx.moveTo(pts[i][0], pts[i][1]); ctx.stroke(); }); ctx.shadowBlur = 0;
    if(f%6===0 && f<40) for(let i=0;i<5;i++) P.push({x:cx+(Math.random()-.5)*W*.8, y:base, vx:(Math.random()-.5)*2, vy:-(4+Math.random()*5), g:.35, vida:0, max:40, tam:3+Math.random()*4, cor:cfg.cores[Math.floor(Math.random()*cfg.cores.length)], forma:'pedra', rot:0, vr:.2}); } },
};
