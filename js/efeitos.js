// =========================================================================================
// Efeitos compartilhados (13/11/2026): sons sintetizados na hora (Web Audio, sem arquivo),
// item voando em arco até um alvo, bolhas de poção e faíscas. Tudo respeita "reduzir movimento"
// do aparelho, e os sons respeitam a preferência Menu → Preferências → Sons.
// Os sons só tocam a partir de um toque da pessoa (regra dos navegadores) e nunca em teste.
// =========================================================================================
const CHAVE_SONS = 'painel_aventureiro_sons';
function sonsAtivos(){
  try{ return localStorage.getItem(CHAVE_SONS)!=='0'; }catch(e){ return true; }
}
function alternarSons(){
  const ligar = !sonsAtivos();
  try{ localStorage.setItem(CHAVE_SONS, ligar?'1':'0'); }catch(e){}
  flashMsg(ligar ? '🔔 Sons ligados.' : 'Sons desligados.');
}
function movimentoReduzido(){
  try{ return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; }
}

// iPhone: o Safari só libera som depois de um toque e, com a chave do silencioso ligada, cala o
// Web Audio. audioSession 'playback' (iOS 17+) faz os sons tocarem como mídia; e no primeiro toque
// o contexto de áudio é criado e destravado com um som mudo, para os próximos tocarem na hora.
function destravarAudioNoPrimeiroToque(){
  if(typeof window==='undefined' || window.__T20_TESTE) return;
  try{ if(navigator.audioSession) navigator.audioSession.type = 'playback'; }catch(e){}
  const destravar = ()=>{
    try{
      const a = Som.contexto(); if(!a) return;
      const b = a.createBuffer(1, 1, 22050); const s = a.createBufferSource(); s.buffer = b; s.connect(a.destination); s.start(0);
      if(a.state==='running'){ ['touchend','pointerup','keydown'].forEach(ev=> window.removeEventListener(ev, destravar, true)); }
    }catch(e){}
  };
  ['touchend','pointerup','keydown'].forEach(ev=> window.addEventListener(ev, destravar, true));
}
const Som = (()=>{
  let ctx = null;
  const c = ()=>{
    if(!ctx){ const AC = window.AudioContext || window.webkitAudioContext; if(!AC) return null; ctx = new AC(); }
    if(ctx.state==='suspended') ctx.resume();
    return ctx;
  };
  const ruido = (dur)=>{ const a=c(); const b=a.createBuffer(1, Math.max(1, a.sampleRate*dur|0), a.sampleRate); const d=b.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; const s=a.createBufferSource(); s.buffer=b; return s; };
  const env = (g,t,at,q,vol)=>{ g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(vol,t+at); g.gain.exponentialRampToValueAtTime(0.0001,t+at+q); };
  const tom = (f,tipo,t,at,q,vol)=>{ const a=c(); const o=a.createOscillator(); o.type=tipo; o.frequency.setValueAtTime(f,t); const g=a.createGain(); env(g,t,at,q,vol); o.connect(g).connect(a.destination); o.start(t); o.stop(t+at+q+.05); };
  const ruidoF = (t,dur,tipo,freq,at,q,vol,qf)=>{ const a=c(); const n=ruido(dur); const f=a.createBiquadFilter(); f.type=tipo; f.frequency.value=freq; if(qf) f.Q.value=qf; const g=a.createGain(); env(g,t,at,q,vol); n.connect(f).connect(g).connect(a.destination); n.start(t); return f; };
  // Tom que desliza de uma frequência a outra (portal, sono, tempo...).
  const desliza = (f1,f2,tipo,t,dur,vol)=>{ const a=c(); const o=a.createOscillator(); o.type=tipo; o.frequency.setValueAtTime(f1,t); o.frequency.exponentialRampToValueAtTime(f2,t+dur); const g=a.createGain(); env(g,t,Math.min(.08,dur/4),dur,vol); o.connect(g).connect(a.destination); o.start(t); o.stop(t+dur+.15); };
  // Sons das magias: um por tema (TEMAS_FEITICO em js/feiticos.js aponta para estes nomes).
  const MAGIA = {
    gelo(t){ [2637,3136,3951,4699].forEach((f,i)=>tom(f,'sine',t+i*.07,.002,.5,.05)); ruidoF(t,1.2,'highpass',5000,.05,1,.08); },
    trovao(t){ ruidoF(t,.12,'highpass',2500,.001,.1,.4); const f=ruidoF(t+.05,1.6,'lowpass',500,.05,1.4,.35); f.frequency.exponentialRampToValueAtTime(90,t+1.5); },
    acido(t){ for(let i=0;i<6;i++){ const tt=t+i*.09+Math.random()*.05; desliza(300+Math.random()*300, 900+Math.random()*500,'sine',tt,.08,.12); } ruidoF(t,1,'bandpass',3000,.1,.8,.08,2); },
    sombra(t){ desliza(110,55,'sawtooth',t,1.4,.07); desliza(165,82,'sine',t,1.4,.12); },
    cura(t){ [523,659,784,1046,1318].forEach((f,i)=>tom(f,'sine',t+i*.09,.01,.7,.08)); },
    encanto(t){ desliza(880,1760,'sine',t,.6,.07); desliza(1320,2640,'sine',t+.1,.6,.05); [1760,2349].forEach((f,i)=>tom(f,'triangle',t+.5+i*.1,.003,.5,.04)); },
    escudo(t){ [660,990,1320].forEach((f,i)=>tom(f,'triangle',t+i*.04,.004,.9,.07)); ruidoF(t,.3,'bandpass',2400,.002,.25,.12,4); },
    invocar(t){ tom(98,'sine',t,.01,1.6,.35); tom(147,'triangle',t,.01,1.3,.1); ruidoF(t,1.2,'lowpass',300,.2,.9,.15); },
    revelar(t){ [1568,2093,2637].forEach((f,i)=>tom(f,'sine',t+i*.12,.03,.9,.06)); desliza(400,800,'sine',t,.8,.04); },
    necro(t){ const a=c(); const o=a.createOscillator(); o.type='sine'; o.frequency.setValueAtTime(220,t); const l=a.createOscillator(); l.frequency.value=7; const lg=a.createGain(); lg.gain.value=18; l.connect(lg).connect(o.frequency); const g=a.createGain(); env(g,t,.2,1.2,.12); o.connect(g).connect(a.destination); o.start(t); l.start(t); o.stop(t+1.5); l.stop(t+1.5); },
    pulso(t){ [0,.32,.64].forEach(d=>{ tom(70,'sine',t+d,.004,.16,.45); tom(62,'sine',t+d+.12,.004,.14,.3); }); },
    alquimia(t){ for(let i=0;i<8;i++) desliza(500+i*90, 900+i*120,'sine',t+i*.08,.07,.07); tom(1046,'triangle',t+.7,.004,.6,.06); },
    arcano(t){ desliza(1800,300,'square',t,.25,.04); desliza(2400,600,'sine',t+.06,.3,.06); tom(1200,'sine',t+.3,.003,.5,.05); },
    ninar(t){ [1046,880,784,659].forEach((f,i)=>tom(f,'sine',t+i*.22,.04,.6,.06)); },
    natureza(t){ ruidoF(t,1.6,'bandpass',900,.4,1.1,.08,.6); [1318,1568,1760,2093].forEach((f,i)=>tom(f,'triangle',t+.1+i*.15+Math.random()*.05,.003,.4,.035)); },
    terra(t){ const f=ruidoF(t,1.6,'lowpass',160,.05,1.4,.5); f.frequency.exponentialRampToValueAtTime(60,t+1.4); tom(48,'sine',t,.02,1.2,.4); },
    agua(t){ const f=ruidoF(t,1.6,'bandpass',500,.3,1.2,.18,.7); f.frequency.exponentialRampToValueAtTime(1500,t+.7); f.frequency.exponentialRampToValueAtTime(400,t+1.4); for(let i=0;i<4;i++) desliza(600+Math.random()*400,1200+Math.random()*600,'sine',t+.3+i*.15,.06,.06); },
    vento(t){ const f=ruidoF(t,1.6,'bandpass',400,.4,1.1,.25,1.5); f.frequency.exponentialRampToValueAtTime(1800,t+.8); f.frequency.exponentialRampToValueAtTime(600,t+1.5); },
    portal(t){ desliza(120,1400,'sawtooth',t,.9,.035); desliza(180,2100,'sine',t,.9,.08); tom(1400,'sine',t+.9,.005,.6,.08); },
    sonico(t){ [440,442,880,1323].forEach((f,i)=>tom(f,'sine',t,.005,1.2-i*.15,.1)); ruidoF(t,.1,'highpass',3000,.001,.08,.2); },
    tormenta(t){ desliza(90,70,'sawtooth',t,1.4,.08); desliza(97,75,'sawtooth',t,1.4,.07); ruidoF(t+.3,.12,'highpass',2000,.001,.1,.25); ruidoF(t+.8,.12,'highpass',2000,.001,.1,.2); },
    tempo(t){ for(let i=0;i<5;i++) tom(i%2?1600:2000,'square',t+i*.18,.001,.03,.05); desliza(800,400,'sine',t+.9,.6,.06); },
  };
  const S = {
    martelo(){ const t=c().currentTime; [1180,1770,2630,3410].forEach((f,i)=>tom(f*(0.98+Math.random()*.04), i?'sine':'triangle', t, .002, .55-i*.1, .16/(i+1))); ruidoF(t,.08,'bandpass',3200,.001,.07,.35,1.2); tom(85,'sine',t,.003,.16,.45); },
    fogo(){ const t=c().currentTime; const f=ruidoF(t,1.3,'bandpass',300,.3,.9,.22,.8); f.frequency.setValueAtTime(300,t); f.frequency.exponentialRampToValueAtTime(1600,t+.9); },
    tempera(){ const t=c().currentTime; ruidoF(t,1.7,'highpass',2600,.02,1.6,.2); ruidoF(t,.4,'lowpass',400,.01,.35,.25); },
    moedas(){ const t=c().currentTime; for(let i=0;i<5;i++){ const tt=t+i*.065+Math.random()*.03; tom(2300+Math.random()*1000,'sine',tt,.001,.14,.07); tom(3700+Math.random()*700,'sine',tt,.001,.08,.035); } },
    gole(){ const a=c(), t=a.currentTime; [0,.24].forEach(d=>{ const o=a.createOscillator(); o.type='sine'; o.frequency.setValueAtTime(430,t+d); o.frequency.exponentialRampToValueAtTime(130,t+d+.16); const g=a.createGain(); env(g,t+d,.01,.17,.28); o.connect(g).connect(a.destination); o.start(t+d); o.stop(t+d+.22); }); },
    sino(){ const t=c().currentTime; tom(1046,'sine',t,.005,1.1,.12); tom(1568,'sine',t+.06,.005,1,.08); tom(2093,'sine',t+.12,.005,.8,.05); },
    baque(){ const t=c().currentTime; tom(120,'sine',t,.003,.2,.38); ruidoF(t,.1,'lowpass',650,.002,.09,.28); },
    brilho(){ const t=c().currentTime; [1760,2217,2637,3520].forEach((f,i)=>tom(f,'sine',t+i*.05,.003,.4,.05)); },
  };
  return {
    contexto: c,
    tocar(nome){
      if(!sonsAtivos() || window.__T20_TESTE) return;
      try{ if(c() && S[nome]) S[nome](); else if(c() && MAGIA[nome]) MAGIA[nome](c().currentTime); }catch(e){}
    },
    existe(nome){ return !!(S[nome] || MAGIA[nome]); }
  };
})();

// Um rótulo dourado voa em arco de um elemento até outro (posição fixa na tela, por cima de tudo).
function voarAte(origem, alvo, texto, aoChegar){
  const fim = ()=>{ if(alvo){ alvo.classList.remove('efx-recebe'); void alvo.offsetWidth; alvo.classList.add('efx-recebe'); } if(aoChegar) aoChegar(); };
  if(!origem || !alvo || movimentoReduzido() || typeof origem.getBoundingClientRect!=='function'){ fim(); return; }
  const a = origem.getBoundingClientRect(), b = alvo.getBoundingClientRect();
  if(!a.width && !b.width){ fim(); return; }
  const v = el('div',{class:'efx-voa', style:'left:'+(a.left+a.width/2)+'px;top:'+(a.top+a.height/2-10)+'px;'}, texto);
  document.body.appendChild(v);
  const dx = b.left+b.width/2-(a.left+a.width/2), dy = b.top+b.height/2-(a.top+a.height/2);
  if(typeof v.animate!=='function'){ v.remove(); fim(); return; }
  const an = v.animate([
    {transform:'translate(0,0) scale(1)', opacity:1},
    {transform:'translate('+(dx*.5)+'px,'+(dy*.5-70)+'px) scale(1.08) rotate(-5deg)', opacity:1, offset:.5},
    {transform:'translate('+dx+'px,'+dy+'px) scale(.25)', opacity:.25}
  ], {duration:850, easing:'cubic-bezier(.45,0,.25,1)'});
  an.onfinish = ()=>{ v.remove(); fim(); };
}
// Item voa até a aba Mochila (ou o destino que existir na tela) depois de guardado.
function voarParaMochila(origem, texto){
  const alvo = document.querySelector('[data-efx-alvo="mochila"]') || document.querySelector('.topbar .menu-btn') || document.querySelector('header');
  voarAte(origem, alvo, texto);
}
// Bolhas da cor do item sobem de um elemento até outro (poção até o anel).
function bolhasAte(de, para, cor){
  if(!de || !para || movimentoReduzido()) return;
  const a = de.getBoundingClientRect(), b = para.getBoundingClientRect();
  for(let k=0;k<10;k++){
    const d = el('i',{class:'efx-bolha', style:'left:'+(a.left+a.width/2)+'px;top:'+(a.top+14)+'px;background:'+cor+';box-shadow:0 0 8px '+cor+';'});
    document.body.appendChild(d);
    if(typeof d.animate!=='function'){ d.remove(); continue; }
    const dx = b.left+b.width/2-(a.left+a.width/2)+(Math.random()-.5)*36, dy = b.top+b.height/2-(a.top+14);
    const an = d.animate([
      {transform:'translate(0,0) scale(.4)', opacity:0},
      {opacity:.95, offset:.15},
      {transform:'translate('+(dx*.35+(Math.random()-.5)*40)+'px,'+(dy*.5)+'px) scale(1)', offset:.55},
      {transform:'translate('+dx+'px,'+dy+'px) scale(.3)', opacity:0}
    ], {duration:700+Math.random()*300, delay:k*45, easing:'ease-in', fill:'backwards'});
    an.onfinish = ()=> d.remove();
  }
}
// Reaplica uma classe de animação num elemento (remove, força reflow, põe de novo).
function reanimar(elemento, classe){
  if(!elemento) return;
  elemento.classList.remove(classe); void elemento.offsetWidth; elemento.classList.add(classe);
}
