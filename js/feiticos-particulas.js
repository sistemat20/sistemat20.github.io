// ============ Movimentos dos efeitos de magia (revisão de 15/11/2026) ============
// Parte do lugar central dos efeitos (ver o topo de js/feiticos.js). Cada magia tem um tema
// (cor, partícula, som) e um movimento, escolhidos em data/temas-magia.js. O movimento diz como
// as partículas nascem e andam; o tema só pinta. O círculo da magia deixa o efeito mais cheio, e
// "grande" (Bola de Fogo, Chuva de Meteoros, Terremoto...) ainda mais.
const DURACAO_FEITICO = 2100;
const MOVIMENTOS_FEITICO = ['explosao','leque','projetil','coluna','chuva','subir','convergir','orbita','espiral','onda','flutuar','portal'];
const LIMITE_PARTICULAS = 700;

function emitirFeitico(est, P, W, H, quadro, cfg){
  const cx = W/2, cy = H*0.44, sorte = Math.random;
  const forca = (0.75 + 0.12*est.circulo) * (est.grande ? 1.5 : 1);
  const elementos = est.elementos ? ['fogo','frio','acido','raio'].map(k=> TEMAS_FEITICO[k].cores) : null;
  const p = (o)=>{
    if(P.length >= LIMITE_PARTICULAS) return;
    const pal = elementos ? elementos[Math.floor(sorte()*4)] : cfg.cores;
    P.push(Object.assign({vida:0, max:60+sorte()*40, tam:2+sorte()*3, cor:pal[Math.floor(sorte()*pal.length)], forma:cfg.forma, rot:sorte()*6.28, vr:(sorte()-.5)*.12, g:0}, o));
  };
  const onda = (cresce, larg)=> P.push({forma:'onda', x:cx, y:cy, vx:0, vy:0, vida:0, max:38, cresce, larg, cor:cfg.cor, rot:0, vr:0, g:0});
  const estouro = (x, y, qtd, vel)=>{ for(let i=0;i<qtd;i++){ const a = sorte()*Math.PI*2, v = vel*(0.3+sorte()); p({x, y, vx:Math.cos(a)*v, vy:Math.sin(a)*v, atrito:.95, max:30+sorte()*30, tam:2+sorte()*4}); } };
  const n = Math.max(1, Math.round((quadro < 10 ? 9 : 4) * forca));
  const fumaca = cfg.forma==='fumaca';
  switch(est.mov){
    case 'explosao':
      if(quadro===0) onda(est.grande ? 12 : 9, 5);
      if(quadro < 14) for(let i=0;i<n*1.4;i++){ const a = sorte()*Math.PI*2, v = (3+sorte()*7)*(est.grande ? 1.3 : 1); p({x:cx, y:cy, vx:Math.cos(a)*v, vy:Math.sin(a)*v, atrito:.96, max:40+sorte()*30, tam: fumaca ? 24+sorte()*30 : 3+sorte()*4}); }
      break;
    case 'leque':
      if(quadro < 36) for(let i=0;i<n;i++){ const a = -Math.PI/2 + (sorte()-.5)*1.1, v = 8+sorte()*8; p({x:cx+(sorte()-.5)*30, y:H+10, vx:Math.cos(a)*v, vy:Math.sin(a)*v, atrito:.975, max:45+sorte()*25, tam: fumaca ? 24+sorte()*24 : 3+sorte()*5}); }
      break;
    case 'projetil': {
      const T = 20;
      for(let k=0;k<est.qtd;k++){
        const q = quadro - k*5, desvio = (k-(est.qtd-1)/2)*70, sx = cx + desvio*1.8, sy = H + 20;
        if(q >= 0 && q < T){
          const t = q/T, x = sx + (cx-sx)*t + Math.sin(t*Math.PI)*desvio*0.6, y = sy + (cy-sy)*(1-(1-t)*(1-t));
          p({x, y, vx:0, vy:0, max:5, tam: est.grande ? 9 : 6, forma:'ponto'});
          for(let i=0;i<3;i++) p({x:x+(sorte()-.5)*8, y:y+(sorte()-.5)*8, vx:(sorte()-.5), vy:1+sorte()*1.5, max:18+sorte()*14, tam:2+sorte()*3});
        }
        if(q === T){ estouro(cx, cy, Math.round(22*forca), est.grande ? 9 : 6); onda(est.grande ? 11 : 7, est.grande ? 6 : 3); }
      }
      break;
    }
    case 'coluna':
      if(quadro < 44) for(let i=0;i<n;i++){ const y = -10 - sorte()*40, vy = 14+sorte()*10; p({x:cx+(sorte()-.5)*W*0.16*(est.grande ? 1.6 : 1), y, vx:(sorte()-.5)*.5, vy, max:Math.max(8, (cy-y)/vy), tam:3+sorte()*4}); }
      if(quadro===12 || quadro===24 || quadro===36) estouro(cx, cy, Math.round(10*forca), 6);
      if(quadro===12) onda(est.grande ? 11 : 8, 4);
      break;
    case 'chuva':
      if(quadro < 62) for(let i=0;i<Math.ceil(n*0.8);i++){ const largo = est.grande; p({x:sorte()*W*1.1 - (largo ? W*0.25 : 0), y:-20, vx: largo ? 3+sorte() : (sorte()-.5)*.6, vy:6+sorte()*7, g:.08, max:90, tam: largo ? 4+sorte()*6 : (fumaca ? 20+sorte()*20 : 2.5+sorte()*3), cauda:largo}); }
      break;
    case 'subir':
      if(quadro < 60) for(let i=0;i<n;i++) p({x:cx+(sorte()-.5)*W*.95, y:H+10, vx:(sorte()-.5)*1.2, vy:-(3+sorte()*7)*(est.grande ? 1.3 : 1), g:-.03, max:70+sorte()*40, tam: fumaca ? 24+sorte()*24 : 3+sorte()*5});
      break;
    case 'convergir':
      if(quadro < 55) for(let i=0;i<n;i++){ const a = sorte()*Math.PI*2, r = Math.max(W,H)*0.6, v = (5+sorte()*4)*(est.grande ? 1.4 : 1), giro = est.grande ? .5 : .15;
        p({x:cx+Math.cos(a)*r, y:cy+Math.sin(a)*r, vx:-Math.cos(a+giro)*v, vy:-Math.sin(a+giro)*v, max:r/v, tam: fumaca ? 30+sorte()*40 : 3+sorte()*4}); }
      if(quadro===52) estouro(cx, cy, Math.round(14*forca), 5);
      break;
    case 'orbita':
      if(quadro===0) onda(6, 3);
      if(quadro < 60) for(let i=0;i<Math.ceil(n*0.7);i++){ const a = sorte()*Math.PI*2; p({orbita:{a, r:70+sorte()*50*(est.grande ? 1.5 : 1), w:(sorte()<.5 ? 1 : -1)*(0.05+sorte()*0.05)}, max:70+sorte()*30, tam:2+sorte()*3}); }
      break;
    case 'espiral':
      if(quadro < 60) for(let i=0;i<n;i++){ const a = sorte()*Math.PI*2, v = 1+sorte()*4; p({x:cx, y:cy, vx:Math.cos(a)*v, vy:Math.sin(a)*v, espiral:.06, max:80, tam: fumaca ? 20+sorte()*20 : 3+sorte()*4}); }
      break;
    case 'onda':
      if(quadro===0 || quadro===10 || quadro===20 || (est.grande && quadro===30)) onda(est.grande ? 12 : 9, est.grande ? 6 : 4);
      if(quadro < 30) for(let i=0;i<Math.ceil(n*0.6);i++){ const a = sorte()*Math.PI*2, r = quadro*9; p({x:cx+Math.cos(a)*r, y:cy+Math.sin(a)*r, vx:Math.cos(a)*2, vy:Math.sin(a)*2, max:30}); }
      break;
    case 'portal':
      if(quadro < 50) for(let i=0;i<n;i++){ const a = sorte()*Math.PI*2; p({orbita:{a, r:120+sorte()*30, w:.09, achata:.45, encolhe:.975}, max:50+sorte()*20, tam:2+sorte()*3}); }
      if(quadro===48){ estouro(cx, cy, Math.round(26*forca), 8); onda(10, 5); }
      break;
    default: // flutuar
      if(quadro < 70) for(let i=0;i<Math.ceil(n*0.8);i++) p({x:cx+(sorte()-.5)*W*.8, y:cy+(sorte()-.2)*H*.5, vx:(sorte()-.5)*.4, vy:-(0.6+sorte()*1.6), max:80, tam: fumaca ? 20+sorte()*20 : 2+sorte()*4});
  }
}

function desenharParticula(ctx, q){
  const alfa = Math.max(0, 1 - q.vida/q.max);
  ctx.globalAlpha = q.forma==='fumaca' ? alfa*0.5 : alfa;
  ctx.fillStyle = q.cor; ctx.strokeStyle = q.cor;
  if(q.forma==='onda'){ ctx.lineWidth = q.larg*alfa+0.5; ctx.beginPath(); ctx.arc(q.x, q.y, 8+q.vida*q.cresce, 0, Math.PI*2); ctx.stroke(); return; }
  if(q.cauda){ ctx.lineWidth = q.tam*0.7; ctx.globalAlpha = alfa*0.6; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x-q.vx*6, q.y-q.vy*6); ctx.stroke(); ctx.globalAlpha = alfa; }
  ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot);
  switch(q.forma){
    case 'faisca': ctx.rotate(-q.rot); ctx.lineWidth = Math.max(1.5, q.tam*0.8); ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-q.vx*3, -q.vy*3); ctx.stroke(); break;
    case 'risco': ctx.rotate(-q.rot); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-q.vx*6, -q.vy*6); ctx.stroke(); break;
    case 'floco': ctx.lineWidth = 1.2; ctx.beginPath(); for(let i=0;i<6;i++){ const a=i*Math.PI/3; ctx.moveTo(0,0); ctx.lineTo(Math.cos(a)*q.tam, Math.sin(a)*q.tam); } ctx.stroke(); break;
    case 'gota': ctx.beginPath(); ctx.ellipse(0, 0, q.tam*.6, q.tam, 0, 0, Math.PI*2); ctx.fill(); break;
    case 'folha': ctx.beginPath(); ctx.ellipse(0, 0, q.tam*.45, q.tam*1.1, 0, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = alfa*.6; ctx.strokeStyle = '#2f5a24'; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(0,-q.tam); ctx.lineTo(0,q.tam); ctx.stroke(); break;
    case 'pedra': ctx.beginPath(); ctx.moveTo(-q.tam, -q.tam*.4); ctx.lineTo(-q.tam*.2, -q.tam); ctx.lineTo(q.tam, -q.tam*.3); ctx.lineTo(q.tam*.6, q.tam*.8); ctx.lineTo(-q.tam*.7, q.tam*.7); ctx.closePath(); ctx.fill(); break;
    case 'anel': ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(0, 0, q.tam*1.6, 0, Math.PI*2); ctx.stroke(); break;
    case 'cruz': ctx.fillRect(-q.tam, -q.tam/3, q.tam*2, q.tam*.66); ctx.fillRect(-q.tam/3, -q.tam, q.tam*.66, q.tam*2); break;
    case 'coracao': ctx.font = (q.tam*4)+'px serif'; ctx.fillText('♥', -q.tam, q.tam); break;
    case 'z': ctx.font = 'bold '+(q.tam*4)+'px Cinzel, serif'; ctx.fillText('z', -q.tam, q.tam); break;
    case 'caco': ctx.beginPath(); ctx.moveTo(0,-q.tam); ctx.lineTo(q.tam*.7, q.tam*.6); ctx.lineTo(-q.tam*.6, q.tam*.4); ctx.closePath(); ctx.globalAlpha *= .6; ctx.fill(); ctx.globalAlpha = alfa; ctx.lineWidth=1; ctx.strokeStyle='#fff'; ctx.stroke(); break;
    case 'fumaca': { const gr = ctx.createRadialGradient(0,0,0,0,0,q.tam); gr.addColorStop(0, q.cor); gr.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0,0,q.tam,0,Math.PI*2); ctx.fill(); break; }
    default: { const gr = ctx.createRadialGradient(0,0,0,0,0,q.tam*2.2); gr.addColorStop(0, '#fff'); gr.addColorStop(.35, q.cor); gr.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0,0,q.tam*2.2,0,Math.PI*2); ctx.fill(); }
  }
  ctx.restore();
}

// Desenhos por cima das partículas: feixe da coluna, anel do portal e relâmpagos.
function desenharExtrasFeitico(ctx, est, cfg, W, H, quadro){
  const cx = W/2, cy = H*0.44;
  if(est.mov==='coluna' && quadro < 50){
    const a = quadro < 8 ? quadro/8 : quadro > 40 ? (50-quadro)/10 : 1, larg = W*(est.grande ? 0.2 : 0.12);
    const gr = ctx.createLinearGradient(cx-larg/2, 0, cx+larg/2, 0);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(.5, cfg.cor); gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = a*0.55; ctx.fillStyle = gr; ctx.fillRect(cx-larg/2, 0, larg, cy);
  }
  if(est.mov==='portal' && quadro < 48){
    const r = 130*Math.pow(.975, quadro);
    ctx.globalAlpha = Math.min(1, quadro/6)*0.9; ctx.strokeStyle = cfg.cor; ctx.lineWidth = 3; ctx.shadowColor = cfg.cor; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.ellipse(cx, cy, r, r*.45, 0, 0, Math.PI*2); ctx.stroke(); ctx.shadowBlur = 0;
  }
  if(est.raios && (quadro<6 || (quadro>12 && quadro<16) || (quadro>24 && quadro<27))){
    ctx.globalAlpha = 1; ctx.strokeStyle = '#f2f8ff'; ctx.shadowColor = cfg.cor==='#ff8a2a' ? '#9cc7ff' : cfg.cor; ctx.shadowBlur = 18;
    for(let b=0;b<(est.grande ? 5 : 3);b++){
      let x = W*(0.2+0.6*b/Math.max(1,(est.grande ? 4 : 2))) + (Math.random()-.5)*60, y = -10;
      ctx.lineWidth = 2.5+Math.random()*2; ctx.beginPath(); ctx.moveTo(x, y);
      while(y < cy){ x += (Math.random()-.5)*60; y += 20+Math.random()*30; ctx.lineTo(x, Math.min(y, cy)); }
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }
}

// Canvas por cima da camada do efeito, um quadro por vez até acabar a duração.
function animarParticulasFeitico(camada, est, cfg){
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
    emitirFeitico(est, P, W, H, quadro, cfg);
    for(let i=P.length-1;i>=0;i--){
      const q = P[i];
      if(q.orbita){ const o = q.orbita; o.a += o.w; o.r *= (o.encolhe || 0.995); q.x = W/2 + Math.cos(o.a)*o.r; q.y = H*0.44 + Math.sin(o.a)*o.r*(o.achata || 1); }
      else {
        if(q.espiral){ const a = Math.atan2(q.vy, q.vx) + q.espiral, v = Math.hypot(q.vx, q.vy)*0.985; q.vx = Math.cos(a)*v; q.vy = Math.sin(a)*v; }
        if(q.atrito){ q.vx *= q.atrito; q.vy *= q.atrito; }
        q.vy += q.g; q.x += q.vx; q.y += q.vy;
      }
      q.rot += q.vr; q.vida++;
      if(q.vida > q.max){ P.splice(i,1); continue; }
      desenharParticula(ctx, q);
    }
    desenharExtrasFeitico(ctx, est, cfg, W, H, quadro);
    quadro++;
    requestAnimationFrame(passo);
  };
  requestAnimationFrame(passo);
}
