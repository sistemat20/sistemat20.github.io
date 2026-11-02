// ============ ANÉIS DE VIDA E MANA (ideia A da revisão de design, 02/11/2026) ============
// Vida e mana como dois anéis lado a lado; o temporário é um anel fino por fora de cada um.
// Sem botões, o próprio anel é o controle:
//   - girar o dedo NO anel: horário soma (cura/recupera), anti-horário tira (dano/gasto);
//   - girar POR FORA (sobre o fio fino): cria ou tira o temporário;
//   - segurar o centro meio segundo: desfaz a última mudança feita pelos anéis.
// Uma volta inteira vale o máximo daquele anel. Teclado: setas ajustam, Alt+setas o temporário.
// Regra usada: dano e gasto tiram primeiro do temporário (função aplicarAnel). Os estilos ficam
// em css/experiencia.css.

const ANEL = {tam:168, rTemp:76, rBase:60}; // px do quadrado e raios dos dois anéis

function dadosAnel(f, chave){
  const ehPv = chave==='pv';
  return {
    chave, ehPv,
    atual: parseInt(ehPv ? f.pvatual : f.pmatual)||0,
    temp: parseInt(ehPv ? f.pvtemp : f.pmtemp)||0,
    max: (ehPv ? pvMaxEfetivo(f) : pmMaxEfetivo(f)) || 1,
    min: ehPv ? limiteMortePv(f) : 0,
  };
}
// Resultado de mexer "pontos" no anel base (negativo tira do temporário primeiro) ou no de fora.
function previaAnel(d, alvo, pontos){
  const r = {atual:d.atual, temp:d.temp};
  if(!pontos) return r;
  if(alvo==='temp'){ r.temp = Math.max(0, d.temp + pontos); return r; }
  if(pontos < 0){
    const abs = Math.min(d.temp, -pontos);
    r.temp = d.temp - abs;
    r.atual = Math.max(d.min, d.atual - (-pontos - abs));
  } else {
    r.atual = Math.min(d.max, d.atual + pontos);
  }
  return r;
}
function corVida(pct){ return pct > 50 ? 'var(--status-saudavel)' : pct > 25 ? 'var(--status-ferido)' : 'var(--status-critico)'; }
function pctAnel(v, max){ return Math.max(0, Math.min(100, v/max*100)); }

// Grava a mudança na ficha, com log, guardando o "antes" para o segurar-para-desfazer.
function aplicarAnel(f, chave, alvo, pontos){
  if(!pontos) return;
  const d = dadosAnel(f, chave);
  const r = previaAnel(d, alvo, pontos);
  if(r.atual===d.atual && r.temp===d.temp) return;
  if(!state._aneisDesfazer) state._aneisDesfazer = {};
  state._aneisDesfazer[f.id] = {pvatual:f.pvatual, pvtemp:f.pvtemp, pmatual:f.pmatual, pmtemp:f.pmtemp, estabilizado:f.estabilizado};
  const sigla = d.ehPv ? 'PV' : 'PM';
  if(r.temp !== d.temp){
    registrarLog(f, (r.temp>d.temp?'+':'')+(r.temp-d.temp)+' '+sigla+' temporário ('+d.temp+' → '+r.temp+')');
    if(d.ehPv) f.pvtemp = r.temp; else f.pmtemp = r.temp;
  }
  if(r.atual !== d.atual){
    registrarLog(f, (r.atual>d.atual?'+':'')+(r.atual-d.atual)+' '+sigla+' ('+d.atual+' → '+r.atual+')');
    if(d.ehPv){
      // mesmas regras do ajustarPV: perder vida a 0 ou menos volta a sangrar; subir acima de 0 acorda
      if(r.atual < d.atual && r.atual <= 0) f.estabilizado = false;
      if(r.atual > 0) f.estabilizado = false;
      f.pvatual = r.atual;
    } else {
      f.pmatual = r.atual;
    }
  }
  salvarPerfis();
  render();
}
function desfazerAnel(f){
  const a = state._aneisDesfazer && state._aneisDesfazer[f.id];
  if(!a){ flashMsg('Nada dos anéis para desfazer.'); return; }
  Object.assign(f, a);
  registrarLog(f, 'Desfez a última mudança de vida/mana');
  state._aneisDesfazer[f.id] = null;
  flashMsg('↩️ Desfeito.');
  salvarPerfis();
  render();
}

// Um anel. Durante o giro só o SVG e os números deste anel mudam (sem render()), senão o
// elemento seria recriado no meio do gesto e o dedo perderia o anel.
function renderAnel(f, chave){
  const d = dadosAnel(f, chave);
  const C = ANEL.tam/2;
  const corTemp = d.ehPv ? 'var(--temp-pv, #ffc9c9)' : 'var(--temp-pm, #c9ecff)';
  if(!state._aneisUltimo) state._aneisUltimo = {};
  const chaveUlt = f.id+'|'+chave;
  const antes = state._aneisUltimo[chaveUlt];
  state._aneisUltimo[chaveUlt] = {atual:d.atual, temp:d.temp};
  const pctBase = pctAnel(d.atual, d.max), pctTemp = pctAnel(d.temp, d.max);
  const mudouBase = antes && antes.atual!==d.atual, mudouTemp = antes && antes.temp!==d.temp;
  const svgNS = 'http://www.w3.org/2000/svg';
  const circ = (attrs)=>{ const c = document.createElementNS(svgNS, 'circle'); Object.entries(attrs).forEach(([k,v])=>c.setAttribute(k, v)); return c; };
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 '+ANEL.tam+' '+ANEL.tam); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('class', 'anel-svg');
  svg.appendChild(circ({cx:C, cy:C, r:ANEL.rTemp, class:'anel-guia'}));
  // Arco vazio com ponta arredondada vira um pontinho: some de vez quando o valor é zero.
  const visivelSe = (pct, antesPct)=> (pct > 0 || antesPct > 0) ? 'visible' : 'hidden';
  const arcoTemp = circ({cx:C, cy:C, r:ANEL.rTemp, pathLength:100, class:'anel-temp'+(mudouTemp?' anima':''), stroke:corTemp, 'stroke-dasharray':pctTemp.toFixed(1)+' 100', visibility: visivelSe(pctTemp, mudouTemp ? pctAnel(antes.temp, d.max) : 0), style: mudouTemp ? '--de:'+pctAnel(antes.temp, d.max).toFixed(1) : ''});
  svg.appendChild(arcoTemp);
  svg.appendChild(circ({cx:C, cy:C, r:ANEL.rBase, class:'anel-trilho '+chave}));
  const arcoBase = circ({cx:C, cy:C, r:ANEL.rBase, pathLength:100, class:'anel-base'+(mudouBase?' anima':''), stroke: d.ehPv ? corVida(pctBase) : 'var(--pm-accent)', 'stroke-dasharray':pctBase.toFixed(1)+' 100', visibility: visivelSe(pctBase, mudouBase ? pctAnel(antes.atual, d.max) : 0), style: mudouBase ? '--de:'+pctAnel(antes.atual, d.max).toFixed(1) : ''});
  svg.appendChild(arcoBase);
  const aroSegurar = circ({cx:C, cy:C, r:40, pathLength:100, class:'anel-segurar'});
  svg.appendChild(aroSegurar);

  const num = el('span',{class:'anel-num '+chave}, String(d.atual));
  const tempTxt = el('span',{class:'anel-temp-txt', style:'color:'+corTemp+';'}, d.temp ? '+'+d.temp+' temp.' : '');
  const bolha = el('span',{class:'anel-bolha'});
  const dedo = el('span',{class:'anel-dedo'});
  const delta = antes && mudouBase ? d.atual - antes.atual : (antes && mudouTemp ? d.temp - antes.temp : 0);
  const caixa = el('div',{class:'anel-caixa', role:'slider', tabindex:'0',
      'aria-label': (d.ehPv?'Vida':'Mana')+': '+d.atual+' de '+d.max+(d.temp?', mais '+d.temp+' temporários':'')+'. Gire no anel para ajustar, por fora para o temporário, segure o centro para desfazer.',
      'aria-valuemin':String(d.min), 'aria-valuemax':String(d.max), 'aria-valuenow':String(d.atual)},
    svg,
    el('div',{class:'anel-centro'},
      el('span',{class:'anel-rotulo'}, d.ehPv ? 'VIDA' : 'MANA'),
      num,
      el('span',{class:'anel-max'}, 'de '+d.max),
      tempTxt
    ),
    bolha, dedo,
    delta ? el('span',{class:'anel-pulo', style:'background:'+(delta>0 ? (mudouTemp && !mudouBase ? corTemp : '#7fc77f') : 'var(--pv-accent)')+';'}, (delta>0?'+':'−')+Math.abs(delta)) : null
  );

  // ---- gestos ----
  let arrasto = null, segurar = null;
  const pintar = (alvo, pontos, ang)=>{
    const r = previaAnel(d, alvo, pontos);
    const pb = pctAnel(r.atual, d.max);
    const pt = pctAnel(r.temp, d.max);
    arcoBase.setAttribute('stroke-dasharray', pb.toFixed(1)+' 100');
    arcoBase.setAttribute('visibility', pb > 0 ? 'visible' : 'hidden');
    arcoBase.classList.remove('anima');
    if(d.ehPv) arcoBase.setAttribute('stroke', corVida(pb));
    arcoTemp.setAttribute('stroke-dasharray', pt.toFixed(1)+' 100');
    arcoTemp.setAttribute('visibility', pt > 0 ? 'visible' : 'hidden');
    arcoTemp.classList.remove('anima');
    num.textContent = String(r.atual);
    tempTxt.textContent = r.temp ? '+'+r.temp+' temp.' : '';
    if(pontos){
      bolha.textContent = (alvo==='temp'?'temp. ':'')+(pontos>0?'+':'−')+Math.abs(pontos);
      bolha.style.background = pontos>0 ? (alvo==='temp' ? corTemp : '#7fc77f') : 'var(--pv-accent)';
      bolha.classList.add('visivel');
    } else bolha.classList.remove('visivel');
    if(ang!=null){
      const rr = (alvo==='temp' ? ANEL.rTemp : ANEL.rBase) / ANEL.tam * 100;
      dedo.style.left = (50 + Math.cos(ang)*rr)+'%';
      dedo.style.top = (50 + Math.sin(ang)*rr)+'%';
      dedo.classList.add('visivel');
    }
  };
  const parar = (e)=>{ e.stopPropagation(); };
  caixa.addEventListener('touchstart', parar, {passive:true});
  caixa.addEventListener('touchmove', parar, {passive:true});
  caixa.addEventListener('pointerdown', (e)=>{
    const r = caixa.getBoundingClientRect();
    const cx = r.left + r.width/2, cy = r.top + r.height/2, dx = e.clientX-cx, dy = e.clientY-cy;
    const raz = Math.hypot(dx, dy) / (r.width/2);
    if(raz < 0.42){
      aroSegurar.classList.add('enchendo');
      segurar = setTimeout(()=>{ segurar = null; aroSegurar.classList.remove('enchendo'); desfazerAnel(f); }, 650);
      return;
    }
    try{ caixa.setPointerCapture(e.pointerId); }catch(_){}
    const ang = Math.atan2(dy, dx);
    arrasto = {alvo: raz < 0.82 ? 'base' : 'temp', cx, cy, ultimo:ang, acum:0, pontos:0};
    state._girandoAnel = true; // a atualização automática da ficha espera o gesto acabar
    caixa.classList.add('girando');
    pintar(arrasto.alvo, 0, ang);
  });
  caixa.addEventListener('pointermove', (e)=>{
    if(!arrasto) return;
    const ang = Math.atan2(e.clientY-arrasto.cy, e.clientX-arrasto.cx);
    let dif = ang - arrasto.ultimo;
    if(dif > Math.PI) dif -= 2*Math.PI;
    if(dif < -Math.PI) dif += 2*Math.PI;
    arrasto.acum += dif; arrasto.ultimo = ang;
    arrasto.pontos = Math.round(arrasto.acum/(2*Math.PI) * d.max);
    pintar(arrasto.alvo, arrasto.pontos, ang);
  });
  const soltar = ()=>{
    if(segurar){ clearTimeout(segurar); segurar = null; aroSegurar.classList.remove('enchendo'); }
    if(!arrasto) return;
    const {alvo, pontos} = arrasto;
    arrasto = null;
    state._girandoAnel = false;
    caixa.classList.remove('girando');
    if(pontos) aplicarAnel(f, chave, alvo, pontos);
    else { pintar('base', 0, null); dedo.classList.remove('visivel'); }
  };
  caixa.addEventListener('pointerup', soltar);
  caixa.addEventListener('pointercancel', soltar);
  caixa.addEventListener('pointerleave', ()=>{ if(segurar){ clearTimeout(segurar); segurar = null; aroSegurar.classList.remove('enchendo'); } });
  caixa.addEventListener('keydown', (e)=>{
    const passo = e.shiftKey ? 5 : 1;
    const v = (e.key==='ArrowUp'||e.key==='ArrowRight') ? passo : (e.key==='ArrowDown'||e.key==='ArrowLeft') ? -passo : 0;
    if(v){ e.preventDefault(); aplicarAnel(f, chave, e.altKey ? 'temp' : 'base', v); }
    else if(e.key==='Backspace' || (e.key==='z' && (e.ctrlKey||e.metaKey))){ e.preventDefault(); desfazerAnel(f); }
  });
  return caixa;
}

function renderAneisVidaMana(f){
  return el('div',{},
    el('div',{class:'aneis-vm'}, renderAnel(f, 'pv'), renderAnel(f, 'pm')),
    el('div',{class:'aneis-ajuda'},
      el('span',{}, el('b',{}, 'Girar no anel'), ' horário soma, anti-horário tira'),
      el('span',{}, el('b',{style:'color:#ffc9c9;'}, 'Girar por fora'), ' temporário'),
      el('span',{}, el('b',{style:'color:var(--gold);'}, 'Segurar o centro'), ' desfaz')
    )
  );
}
