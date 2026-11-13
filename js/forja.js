// =========================================================================================
// Forja de item superior (13/11/2026, "Bigorna" da prancha). Regras do Livro Básico p. 164-166
// e do Ameaças de Arton p. 399-400:
//  · armas, armaduras, escudos, esotéricos, VESTUÁRIO e FERRAMENTAS recebem melhorias;
//  · material especial só em arma, armadura, escudo e esotérico; Madeira Tollon só em arma de
//    madeira, escudo leve e esotérico;
//  · Maciça × Precisa e Reforçada × Delicada não andam juntas; Delicada e Selada só em armadura
//    pesada; Mira telescópica só em arma de disparo (exceto funda); Aprimorado e Multifuncional
//    só em item que já mexe numa perícia;
//  · Discreto e Mitral tiram 1 espaço (mínimo 1).
// Sem preço na tela (o valor é do Mestre). A forja acende, martela e tempera, com som e faíscas.
// =========================================================================================

const ARMAS_DE_MADEIRA = new Set(['Arco curto','Arco longo','Bordão','Clava','Lança','Pique','Tacape']);
const GRUPO_DA_MELHORIA = {
  'Certeira':'Ataque','Pungente':'Ataque','Precisa':'Ataque','Mira telescópica':'Ataque','Equilibrada':'Ataque',
  'Cruel':'Dano','Atroz':'Dano','Maciça':'Dano','Penetrante':'Dano','Injeção alquímica':'Dano','Harmonizada':'Dano',
  'Ajustada':'Defesa','Sob medida':'Defesa','Delicada':'Defesa','Reforçada':'Defesa','Polida':'Defesa','Selada':'Defesa','Espinhosa':'Defesa','Espinhoso':'Defesa',
  'Canalizador':'Magia','Potencializador':'Magia','Energético':'Magia','Harmonizado':'Magia','Poderoso':'Magia','Vigilante':'Magia',
  'Aprimorado':'Perícia','Multifuncional':'Perícia',
  'Banhado a ouro':'Social','Cravejado de gemas':'Social','Macabro':'Social',
  'Discreto':'Espaço','Material especial':'Material',
};
const ORDEM_GRUPOS = ['Ataque','Dano','Defesa','Magia','Perícia','Social','Espaço','Material','Outras'];
const PARES_EXCLUSIVOS = [['Maciça','Precisa'],['Reforçada','Delicada']];
const FILTRO_MATERIAL = {
  'Mitral':'brightness(1.3) saturate(.3)', 'Adamante':'brightness(.55) contrast(1.3)', 'Aço-rubi':'hue-rotate(-30deg) saturate(2.4)',
  'Gelo eterno':'hue-rotate(160deg) saturate(1.6) brightness(1.2)', 'Madeira Tollon':'sepia(1) brightness(.5)', 'Matéria vermelha':'hue-rotate(-40deg) saturate(3) brightness(.8)',
  'Prata':'grayscale(1) brightness(1.4)',
};
const DESENHO_FORJA = {
  arma:'<path d="M20 2 L23 26 L17 26 Z" fill="var(--ink-soft)"/><rect x="12" y="26" width="16" height="3" rx="1.5" fill="var(--gold)"/><rect x="18.5" y="29" width="3" height="9" fill="var(--gold-deep)"/>',
  armadura:'<path d="M9 8 Q20 2 31 8 L33 24 Q20 38 7 24 Z" fill="var(--ink-soft)"/><path d="M20 5 V34" stroke="var(--card-2)" stroke-width="2"/>',
  escudo:'<path d="M20 3 L33 8 Q33 28 20 37 Q7 28 7 8 Z" fill="var(--ink-soft)"/><path d="M20 7 V33" stroke="var(--gold)" stroke-width="1.6"/>',
  esoterico:'<circle cx="20" cy="15" r="9" fill="var(--pm-accent)" opacity=".85"/><path d="M20 24 V38" stroke="var(--gold-deep)" stroke-width="3"/>',
  vestuario:'<path d="M12 6 L20 3 L28 6 L33 36 L7 36 Z" fill="var(--gold)"/><path d="M17 4 L20 14 L23 4" fill="none" stroke="var(--card-2)" stroke-width="2"/>',
  ferramenta:'<rect x="17" y="12" width="6" height="25" rx="2" fill="var(--gold-deep)"/><path d="M8 5 H32 V14 H8 Z" fill="var(--ink-soft)"/>',
};
const MARTELO_SVG = '<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="17" y="12" width="5" height="26" rx="2" fill="#7a5a3a" stroke="#3b2a1a" stroke-width="1"/><path d="M6 5 H32 Q35 5 35 8 V14 Q35 17 32 17 H6 Q4 17 4 14 V8 Q4 5 6 5Z" fill="#9aa3ad" stroke="#4a4f55" stroke-width="1.2"/><path d="M8 7 H30" stroke="#d5dbe1" stroke-width="1.2"/></svg>';

function categoriaVisual(categoria){ return (categoria==='armaduraLeve'||categoria==='armaduraPesada') ? 'armadura' : categoria; }
// O item-base já mexe numa perícia? (bônus do catálogo ou "evita –5 em ...")
function baseMexeEmPericia(base){
  if(!base) return false;
  if(base.bonusPericia) return true;
  return /evita\s*[–-]\s*5|[+–-]\s*\d+\s+(em\s+)?[A-ZÁÉÍÓÚ]/.test(base.desc||'');
}
// Motivo de uma melhoria não poder entrar nesta peça agora ('' = pode).
function motivoMelhoriaBloqueada(m, b){
  const escolhidas = b.melhoriasEscolhidas;
  if(escolhidas.includes(m.nome)) return '';
  if(escolhidas.length>=4) return '4 melhorias é o máximo';
  if(!prereqOkMelhoria(m, escolhidas)) return m.prereq==='outra melhoria qualquer' ? 'pede outra melhoria antes' : 'pede '+m.prereq;
  const par = PARES_EXCLUSIVOS.find(p=> p.includes(m.nome));
  if(par){ const outro = par.find(x=>x!==m.nome); if(escolhidas.includes(outro)) return 'não combina com '+outro; }
  if((m.nome==='Delicada' || m.nome==='Selada') && b.categoria!=='armaduraPesada') return 'só em armadura pesada';
  if(m.nome==='Mira telescópica' && !(b.baseItem && b.baseItem.distancia && b.baseItem.n!=='Funda')) return 'só em arma de disparo (exceto funda)';
  if((m.nome==='Aprimorado' || m.nome==='Multifuncional') && !baseMexeEmPericia(b.baseItem)) return 'o item não mexe em nenhuma perícia';
  return '';
}
function motivoMaterialBloqueado(mat, b){
  if(!efeitoMaterialParaCategoria(mat, b.categoria)) return null; // nem aparece
  if(mat.nome==='Madeira Tollon'){
    if(b.categoria==='arma' && !ARMAS_DE_MADEIRA.has(b.baseItem.n)) return 'só em arma de madeira (arco, bordão, clava, lança, pique, tacape)';
    if(b.categoria==='escudo' && b.baseItem.n!=='Escudo leve') return 'só em escudo leve';
  }
  return '';
}
function espacoBaseForja(b){ return parseFloat(String(b.baseItem.esp!=null ? b.baseItem.esp : 1).replace(',','.')) || 0; }
function espacoFinalForja(b){
  const base = espacoBaseForja(b);
  const tira = (b.melhoriasEscolhidas.includes('Discreto')?1:0) + (b.materialEscolhido==='Mitral'?1:0);
  return tira ? Math.max(base>0?1:0, base - tira) : base;
}
// Essências que melhorias de vestuário/ferramenta dão (só valem com o item vestido).
function essenciasDasMelhorias(b){
  const ess = [];
  const bp = b.baseItem && b.baseItem.bonusPericia;
  const pericia = bp ? (Array.isArray(bp) ? bp[0].nome : bp.nome) : null;
  b.melhoriasEscolhidas.forEach(n=>{
    if(n==='Aprimorado' && pericia) ess.push({tipo:'pericia', pericia, valor:1});
    if(n==='Banhado a ouro') ess.push({tipo:'pericia', pericia:'Diplomacia', valor:2});
    if(n==='Cravejado de gemas') ess.push({tipo:'pericia', pericia:'Enganação', valor:2});
    if(n==='Macabro'){ ess.push({tipo:'pericia', pericia:'Intimidação', valor:2}); ess.push({tipo:'pericia', pericia:'Diplomacia', valor:-2}); }
  });
  return ess;
}

function iniciarItemSuperior(categoria, baseItem, origem){
  state._itemSuperiorBuilder = { categoria, baseItem, melhoriasEscolhidas: [], materialEscolhido: null, passo:1,
    origemIdx: origem ? origem.idx : null, voltarPara: origem ? origem.voltarPara : null, acendeu:true };
  Som.tocar('fogo');
  render();
}
// "Forjar" a partir de uma linha da mochila (ou de um medalhão): a peça nova substitui a antiga.
function forjarLinhaDaMochila(f, idx){
  const row = f.equip[idx]; if(!row) return;
  const nome = nomeCatalogoDaLinha(row);
  let categoria = null, base = null;
  if(row.tipo==='arma'){ base = ARMAS.find(x=>x.n===nome); categoria = 'arma'; }
  else if(row.tipo==='armadura'){ base = ARMADURAS.find(x=>x.n===nome); categoria = base && base.cat==='Pesada' ? 'armaduraPesada' : 'armaduraLeve'; }
  else if(row.tipo==='escudo'){ base = ESCUDOS.find(x=>x.n===nome); categoria = 'escudo'; }
  else if(row.tipo==='esoterico'){ base = ITENS_ESOTERICOS.find(x=>x.n===(row.refBase||nome)); categoria = 'esoterico'; }
  else { base = ITENS_GERAIS.find(x=>x.n===nome); categoria = base && base.cat==='Ferramenta' ? 'ferramenta' : 'vestuario'; }
  if(!base){ flashMsg('Não achei "'+nome+'" no catálogo para forjar.'); return; }
  state.tab = 'itens';
  iniciarItemSuperior(categoria, base, {idx, voltarPara:'mochila'});
}

// ---- fogo da forja (um canvas que acompanha o painel entre um render e outro) ----
const Forja = { cv:null, ctx:null, calor:0, alvo:0, brasas:[], faiscas:[], vapor:[], rodando:false };
function fogoForja(){
  if(!Forja.cv){ Forja.cv = el('canvas',{class:'fogo-forja', 'aria-hidden':'true'}); Forja.ctx = (Forja.cv.getContext && !/jsdom/i.test(navigator.userAgent||'')) ? Forja.cv.getContext('2d') : null; }
  if(!Forja.rodando && Forja.ctx && !movimentoReduzido() && typeof requestAnimationFrame==='function'){ Forja.rodando = true; requestAnimationFrame(quadroForja); }
  return Forja.cv;
}
function quadroForja(){
  const {cv, ctx} = Forja;
  if(!state._itemSuperiorBuilder && !Forja.vapor.length){ Forja.rodando = false; if(ctx) ctx.clearRect(0,0,cv.width,cv.height); return; }
  const pai = cv.parentElement;
  if(pai){ if(cv.width!==pai.clientWidth) cv.width = pai.clientWidth; if(cv.height!==pai.clientHeight) cv.height = pai.clientHeight; }
  Forja.calor += (Forja.alvo-Forja.calor)*.04;
  ctx.clearRect(0,0,cv.width,cv.height);
  if(Forja.calor>.02){
    const g = ctx.createRadialGradient(cv.width/2,cv.height+30,10,cv.width/2,cv.height+30,cv.height);
    g.addColorStop(0,'rgba(255,120,40,'+(.30*Forja.calor)+')'); g.addColorStop(1,'rgba(255,80,20,0)');
    ctx.fillStyle = g; ctx.fillRect(0,0,cv.width,cv.height);
  }
  if(Math.random()<Forja.calor*.7) Forja.brasas.push({x:Math.random()*cv.width, y:cv.height+4, vx:(Math.random()-.5)*.4, vy:-(.6+Math.random()*1.3), v:1, r:.8+Math.random()*1.8});
  Forja.brasas.forEach(p=>{ p.x+=p.vx+Math.sin((p.y+p.x)/28)*.35; p.y+=p.vy; p.v-=.005; ctx.fillStyle='rgba(255,'+(140+Math.random()*70|0)+',60,'+(Math.max(0,p.v)*.85)+')'; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,7); ctx.fill(); });
  Forja.brasas = Forja.brasas.filter(p=>p.v>0 && p.y>-10);
  Forja.faiscas.forEach(p=>{ p.x+=p.vx; p.y+=p.vy; p.vy+=.32; p.v-=.028; ctx.strokeStyle='rgba(255,'+(200+Math.random()*55|0)+',120,'+Math.max(0,p.v)+')'; ctx.lineWidth=1.7; ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.x-p.vx*2.2,p.y-p.vy*2.2); ctx.stroke(); });
  Forja.faiscas = Forja.faiscas.filter(p=>p.v>0);
  Forja.vapor.forEach(p=>{ p.x+=p.vx; p.y+=p.vy; p.r+=.45; p.v-=.011; ctx.fillStyle='rgba(235,232,225,'+(Math.max(0,p.v)*.22)+')'; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,7); ctx.fill(); });
  Forja.vapor = Forja.vapor.filter(p=>p.v>0);
  requestAnimationFrame(quadroForja);
}
function centroDaPeca(){
  const ic = document.querySelector('.peca-bancada .icone'), pai = Forja.cv && Forja.cv.parentElement;
  if(!ic || !pai) return {x:120, y:90};
  const pr = pai.getBoundingClientRect(), r = ic.getBoundingClientRect();
  return {x:r.left-pr.left+r.width/2, y:r.top-pr.top+r.height/2};
}
function martelarForja(){
  const pb = document.querySelector('.peca-bancada'); if(!pb) return;
  reanimar(pb, 'bate');
  setTimeout(()=>{
    if(!movimentoReduzido()){ const c = centroDaPeca(); for(let i=0;i<30;i++){ const ang=-Math.PI/2+(Math.random()-.5)*2.8, vel=3+Math.random()*6.5; Forja.faiscas.push({x:c.x, y:c.y-8, vx:Math.cos(ang)*vel, vy:Math.sin(ang)*vel, v:1}); } }
    reanimar(document.querySelector('.painel-forja'), 'treme');
    Som.tocar('martelo');
  }, 160);
}

// ---- tela da forja ----
function renderCriadorItemSuperior(){
  const b = state._itemSuperiorBuilder;
  if(!b.passo) b.passo = 1;
  Forja.alvo = b.passo===1 ? 1 : .45;
  const wrap = el('div',{});
  const voltar = ()=>{ const v = b.voltarPara; state._itemSuperiorBuilder = null; if(v==='mochila'){ state.tab='personagem'; state.personagemTab='mochila'; } render(); };
  wrap.appendChild(el('div',{class:'top-mini'}, el('span',{}, 'Criar Item Superior'), el('button',{onclick:voltar}, '✕ Cancelar')));
  const cv = fogoForja();
  const n = b.melhoriasEscolhidas.length;
  const mat = b.materialEscolhido;
  const filtro = mat && FILTRO_MATERIAL[mat] ? FILTRO_MATERIAL[mat] : (b.melhoriasEscolhidas.includes('Banhado a ouro') ? 'saturate(1.6) brightness(1.15)' : 'none');
  const gravada = b._gravada;
  b._gravada = null;
  const bancada = el('div',{class:'peca-bancada'+(b.passo===1 && !b.temperando ? ' quente' : '')+(b.acendeu ? ' acende' : '')},
    el('div',{class:'icone'}), el('div',{class:'martelo'}),
    el('div',{},
      el('div',{class:'peca-nome'}, b.baseItem.n || b.baseItem.nome),
      el('div',{class:'meta'}, {arma:'Arma', armadura:'Armadura', escudo:'Escudo', esoterico:'Esotérico', vestuario:'Vestuário', ferramenta:'Ferramenta'}[categoriaVisual(b.categoria)]+' · '+fmtEsp(espacoBaseForja(b))+' espaço'),
      el('div',{class:'soq'}, [0,1,2,3].map(i=> el('i',{class:(i<n?'on':'')+(i===gravada?' grava':'')}, '✦')))
    ));
  b.acendeu = false;
  bancada.querySelector('.icone').innerHTML = '<svg viewBox="0 0 40 40" style="filter:'+filtro+'">'+(DESENHO_FORJA[categoriaVisual(b.categoria)]||DESENHO_FORJA.arma)+'</svg>';
  bancada.querySelector('.martelo').innerHTML = MARTELO_SVG;
  const painel = el('div',{class:'panel faixa painel-forja'}, cv, el('h2',{}, 'Forja'),
    el('div',{class:'passos-forja'}, el('span',{class:'feito'}), el('span',{class:b.passo>=2?'feito':''})),
    bancada);

  if(b.passo===1){
    const grupos = {};
    const travadas = [];
    melhoriasDisponiveis(b.categoria).forEach(m=>{
      const motivo = motivoMelhoriaBloqueada(m, b);
      if(motivo && !b.melhoriasEscolhidas.includes(m.nome)){ travadas.push([m, motivo]); return; }
      const g = GRUPO_DA_MELHORIA[m.nome] || 'Outras';
      (grupos[g] = grupos[g] || []).push(m);
    });
    ORDEM_GRUPOS.forEach(g=>{
      if(!grupos[g]) return;
      painel.appendChild(el('div',{class:'grupo-melh'}, el('div',{class:'rot-mini'}, g),
        el('div',{class:'melhs'}, grupos[g].map(m=> el('button',{class:'melh'+(b.melhoriasEscolhidas.includes(m.nome)?' on':''), title:m.desc, onclick:()=> tocarMelhoria(m.nome)},
          el('b',{}, m.nome), el('small',{}, m.desc))))));
    });
    if(travadas.length) painel.appendChild(el('div',{class:'travadas'}, el('div',{class:'rot-mini', style:'color:var(--ink-soft);'}, 'Não dá nesta peça'),
      travadas.map(([m, motivo])=> el('div',{}, el('s',{}, m.nome), ' · '+motivo))));
    if(b.melhoriasEscolhidas.includes('Material especial')){
      const grade = el('div',{class:'materiais-forja'});
      const indisponiveis = [];
      MATERIAIS_ESPECIAIS.forEach(mt=>{
        const motivo = motivoMaterialBloqueado(mt, b);
        if(motivo===null) return;
        if(motivo){ indisponiveis.push([mt.nome, motivo]); return; }
        grade.appendChild(el('button',{class:'mat-forja'+(b.materialEscolhido===mt.nome?' on':''), onclick:()=>{ b.materialEscolhido = mt.nome; b._gravada = null; render(); martelarForja(); }},
          el('b',{}, mt.nome), el('small',{}, efeitoMaterialParaCategoria(mt, b.categoria))));
      });
      painel.appendChild(el('div',{class:'grupo-melh'}, el('div',{class:'rot-mini'}, 'Qual material especial?'), grade,
        indisponiveis.length ? el('div',{class:'travadas'}, indisponiveis.map(([nm, mo])=> el('div',{}, el('s',{}, nm), ' · '+mo))) : null));
    }
    if(b.melhoriasEscolhidas.includes('Harmonizado')) painel.appendChild(renderEscolhaHarmonizado(b));
    const pronto = n>0 && (!b.melhoriasEscolhidas.includes('Material especial') || b.materialEscolhido) && (!b.melhoriasEscolhidas.includes('Harmonizado') || b.magiaHarmonizada);
    painel.appendChild(el('div',{class:'duo', style:'margin-top:12px;'},
      el('button',{class:'btn ghost', onclick:voltar}, 'Cancelar'),
      el('button',{class:'btn', disabled:!pronto, onclick:()=>{ if(pronto){ b.passo = 2; render(); } }}, n ? 'Ver a conta' : 'Escolha uma melhoria')));
  } else {
    const {nomeFinal, melhoriasTxt} = montarNomeEMelhoriasTxt(b);
    const calc = calcularItemSuperior(b);
    const espFinal = espacoFinalForja(b);
    painel.appendChild(el('div',{class:'conta-forja'},
      el('span',{}, 'Melhorias'), el('b',{}, n+' de 4'),
      mat ? el('span',{}, 'Material') : null, mat ? el('b',{}, mat) : null,
      el('span',{}, 'Fabricar: teste de Ofício'), el('b',{}, 'CD +'+calc.cd),
      el('span',{class:'tot'}, 'Espaço na mochila'), el('b',{class:'tot'}, fmtEsp(espacoBaseForja(b))+' → '+fmtEsp(espFinal)),
      el('span',{class:'nota-mestre'}, 'O valor quem combina é o Mestre, na hora.')));
    const selos = b.melhoriasEscolhidas.map(nm=> nm==='Material especial' ? (mat||nm) : nm);
    painel.appendChild(el('div',{class:'rot-mini', style:'margin-top:10px;'}, 'Na mochila vai ficar'));
    painel.appendChild(el('div',{class:'spell-card previa-forja'},
      el('div',{class:'head'}, el('span',{class:'name nome-limpo'}, b.baseItem.n || b.baseItem.nome, el('span',{class:'selos-item'}, selos.map(s=> el('span',{class:'selo-item'}, s)))), el('span',{class:'meta'}, fmtEsp(espFinal)+' esp')),
      el('div',{class:'meta', style:'text-transform:none;margin-top:4px;'}, melhoriasTxt)));
    painel.appendChild(el('div',{class:'duo', style:'margin-top:12px;'},
      el('button',{class:'btn ghost', onclick:()=>{ b.passo = 1; render(); }}, 'Voltar'),
      el('button',{class:'btn', disabled:!!b.temperando, onclick:temperarEForjar}, 'Forjar e guardar')));
  }
  wrap.appendChild(painel);
  return wrap;
}
function renderEscolhaHarmonizado(b){
  const fHarm = fichaAtual();
  const conhecidas = (fHarm && fHarm.magias) || [];
  const magPanel = el('div',{class:'grupo-melh'}, el('h2',{class:'titulo-harmonizado'}, 'Harmonizado: qual magia?'));
  if(!conhecidas.length){ magPanel.appendChild(el('div',{class:'tip'}, 'Este personagem ainda não conhece nenhuma magia. Aprenda uma magia antes de forjar um esotérico Harmonizado.')); return magPanel; }
  magPanel.appendChild(el('input',{id:'harmonizado-busca', type:'text', placeholder:'buscar magia...', value:b.buscaHarmonizado||'', oninput:(e)=>{ b.buscaHarmonizado=e.target.value; renderDebounced(); }}));
  const termo = (b.buscaHarmonizado||'').toLowerCase().trim();
  const filtradas = termo ? conhecidas.filter(m=>(m.n||'').toLowerCase().includes(termo)) : conhecidas;
  const grade = el('div',{class:'option-grid'});
  filtradas.slice(0,40).forEach(m=> grade.appendChild(el('button',{class:'option-card '+(b.magiaHarmonizada===m.n?'selected':''), onclick:()=>{ b.magiaHarmonizada=m.n; render(); }},
    el('div',{class:'opt-nome'}, m.n), el('div',{class:'opt-sub'}, (m.c?m.c+'º círculo':'')+(m.e?' · '+m.e:'')+' · custa '+custoPM(m.c)+' PM, passa a custar '+Math.max(1,custoPM(m.c)-1)+' PM'))));
  if(!filtradas.length) grade.appendChild(el('div',{class:'tip'}, 'Nenhuma magia conhecida com esse nome.'));
  magPanel.appendChild(grade);
  return magPanel;
}
function tocarMelhoria(nome){
  const b = state._itemSuperiorBuilder;
  if(b.melhoriasEscolhidas.includes(nome)){
    b.melhoriasEscolhidas = b.melhoriasEscolhidas.filter(x=> x!==nome && (MELHORIAS.find(m=>m.nome===x)||{}).prereq!==nome);
    if(nome==='Material especial') b.materialEscolhido = null;
    render(); return;
  }
  const m = MELHORIAS.find(x=>x.nome===nome);
  if(!m || motivoMelhoriaBloqueada(m, b)) return;
  b.melhoriasEscolhidas.push(nome);
  b._gravada = b.melhoriasEscolhidas.length-1;
  render();
  martelarForja();
}
function temperarEForjar(){
  const b = state._itemSuperiorBuilder; if(!b || b.temperando) return;
  b.temperando = true;
  const pb = document.querySelector('.peca-bancada');
  if(pb){ pb.classList.remove('quente'); pb.classList.add('tempera'); }
  if(!movimentoReduzido()){ const c = centroDaPeca(); for(let i=0;i<30;i++) Forja.vapor.push({x:c.x+(Math.random()-.5)*56, y:c.y+12, vx:(Math.random()-.5)*.7, vy:-(.5+Math.random()*1.4), r:4+Math.random()*7, v:1}); }
  Forja.alvo = 0;
  Som.tocar('tempera');
  const nomePeca = b.baseItem.n || b.baseItem.nome;
  const espera = movimentoReduzido() ? 0 : 900;
  setTimeout(()=>{
    const ic = document.querySelector('.peca-bancada .icone');
    finalizarItemSuperior();
    voarParaMochila(ic, nomePeca);
    setTimeout(()=> Som.tocar('baque'), movimentoReduzido() ? 0 : 850);
  }, espera);
}
function finalizarItemSuperior(){
  const b = state._itemSuperiorBuilder;
  const f = fichaAtual();
  const {nomeFinal, melhoriasTxt} = montarNomeEMelhoriasTxt(b);
  let bonusTeste=0, bonusDano=0, bonusPenalidade=0, bonusDefesa=0;
  const efeitoExtraEsoterico = [];
  const substituidas = melhoriasSubstituidas(b.melhoriasEscolhidas);
  b.melhoriasEscolhidas.forEach(nome=>{
    if(substituidas.includes(nome)) return;
    const m = MELHORIAS.find(x=>x.nome===nome);
    if(!m || !m.efeito) return;
    if(m.efeito.tipo==='testeAtaque') bonusTeste += m.efeito.valor;
    if(m.efeito.tipo==='dano') bonusDano += m.efeito.valor;
    if(m.efeito.tipo==='penalidade') bonusPenalidade += m.efeito.valor;
    if(m.efeito.tipo==='defesaEArmadura'){ bonusDefesa += m.efeito.valor; bonusPenalidade += m.efeito.valor; }
    if(['cd_arcana_geral','limite_pm_arcana','custo_pm_magia','defesa_esoterico'].includes(m.efeito.tipo)) efeitoExtraEsoterico.push({tipo:m.efeito.tipo, valor:m.efeito.valor});
  });
  if(b.materialEscolhido==='Gelo eterno' && categoriaMelhoria(b.categoria)==='arma') bonusDano += 2;
  const carga = String(espacoFinalForja(b));
  const origem = b.origemIdx!=null ? f.equip[b.origemIdx] : null;
  let novo;
  if(b.categoria==='arma'){
    const w = ARMAS.find(a=>a.n===b.baseItem.n);
    novo = {tipo:'arma', ref:w.n, item:nomeFinal, qtd:'1', carga, superior:true, bonusTesteExtra:bonusTeste, bonusDanoExtra:bonusDano, melhoriasTxt};
  } else if(b.categoria==='armaduraLeve' || b.categoria==='armaduraPesada'){
    const a = ARMADURAS.find(x=>x.n===b.baseItem.n);
    novo = {tipo:'armadura', ref:a.n, item:nomeFinal, qtd:'1', carga, superior:true, bonusDefExtra:bonusDefesa, bonusPenExtra:bonusPenalidade, melhoriasTxt};
  } else if(b.categoria==='escudo'){
    const a = ESCUDOS.find(x=>x.n===b.baseItem.n);
    novo = {tipo:'escudo', ref:a.n, item:nomeFinal, qtd:'1', carga, superior:true, bonusDefExtra:bonusDefesa, bonusPenExtra:bonusPenalidade, melhoriasTxt};
  } else if(b.categoria==='esoterico'){
    const it = ITENS_ESOTERICOS.find(x=>x.n===b.baseItem.n);
    novo = {tipo:'esoterico', ref:it.n, item:nomeFinal, qtd:'1', carga, superior:true, efeitoExtra:efeitoExtraEsoterico, melhoriasTxt, magiaHarmonizada: b.magiaHarmonizada||null};
  } else {
    // vestuário e ferramenta: item geral com a referência do catálogo (para manter o bônus de base)
    novo = {tipo:'geral', ref:b.baseItem.n, item:nomeFinal, qtd:'1', carga, superior:true, melhoriasTxt, essencias:essenciasDasMelhorias(b)};
    if(origem && origem.vestido) novo.vestido = true;
  }
  if(origem){ const i = f.equip.indexOf(origem); if(i>=0) f.equip.splice(i, 1, novo); else f.equip.push(novo); }
  else f.equip.push(novo);
  registrarLog(f, 'Forjou: '+nomeFinal);
  salvarPerfis();
  const voltar = b.voltarPara;
  state._itemSuperiorBuilder = null;
  if(voltar==='mochila'){ state.tab='personagem'; state.personagemTab='mochila'; }
  flashMsg('🔨 "'+nomeFinal+'" forjado e guardado na mochila!');
  render();
}
