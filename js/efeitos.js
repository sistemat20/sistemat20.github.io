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
    tocar(nome){
      if(!sonsAtivos() || window.__T20_TESTE) return;
      try{ if(c() && S[nome]) S[nome](); }catch(e){}
    }
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
