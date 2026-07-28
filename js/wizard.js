// ============ ASSISTENTE DE CRIAÇÃO DE PERSONAGEM ============
// Segue os 9 passos oficiais (Livro Básico, Cap. 1, pág. 21):
// Atributos -> Raça -> Classe -> Origem -> (Divindade opcional) -> Perícias -> Equipamento -> Magias -> Toques finais
// IMPORTANTE: "escolher um poder geral" NÃO é um passo universal. Poder geral só existe se vier de:
//   - origem (parte da escolha de 2 benefícios: perícias, poderes gerais, ou o poder único da origem)
//   - raça específica (Golem: "sem origem, recebe um poder geral à escolha"; Osteon: escolhe entre perícia OU poder geral)
const WIZARD_STEPS_BASE = ['nome','atributos','raca','origem','classe','divindade','revisao'];

function iniciarWizard(){
  state.screen = 'wizard';
  state.wizard = {
    step:0,
    nome:'', jogador:'',
    racaNome:null, racaEscolhasAttr:[],
    racaEscolhaExtra:null, racaEscolhaExtraSub:null,
    racaPoderExtraNome:null, racaPoderExtraSub:null,
    classeNome:null, periciaFixaEscolhas:{}, periciasExtraClasse:[], periciasExtraInt:[],
    origemNome:null,
    origemEscolhas:[],
    rolados:[null,null,null,null,null,null],
    assign:{for:null,des:null,con:null,int:null,sab:null,car:null},
  };
  render();
}

function passosWizard(){
  const w = state.wizard;
  const racaObj = RACAS.find(r=>r.nome===w.racaNome);
  let steps = WIZARD_STEPS_BASE.slice();
  if(racaObj && racaObj.semOrigem){
    steps = steps.filter(s=>s!=='origem');
  }
  if(racaObj && (racaObj.poderGeralExtra || racaObj.escolhaExtra)){
    steps = steps.flatMap(s=> s==='classe' ? ['classe','racaExtra'] : [s]);
  }
  if(w.classeNome === 'Arcanista'){
    steps = steps.flatMap(s=> s==='classe' ? ['classe','arcanistaCaminho'] : [s]);
  }
  return steps;
}

function attrFinal(w){
  const base = {for:0,des:0,con:0,int:0,sab:0,car:0};
  ['for','des','con','int','sab','car'].forEach(k=>{
    const idx = w.assign[k];
    base[k] = (idx!=null && w.rolados[idx]!=null) ? w.rolados[idx] : 0;
  });
  const raca = RACAS.find(r=>r.nome===w.racaNome);
  if(raca){
    Object.keys(raca.mods||{}).forEach(k=>{ base[k] += raca.mods[k]; });
    (w.racaEscolhasAttr||[]).forEach(k=>{ base[k] += (raca.escolhaLivre?raca.escolhaLivre.val:1); });
  }
  return base;
}

function resolvePericiaFixa(txt, w){
  if(txt.includes(' ou ')){
    return w.periciaFixaEscolhas[txt] || txt.split(' ou ')[0];
  }
  return txt;
}
function nomeBasePericia(txt){ return txt.split(' (')[0].trim(); }

function periciasFinal(w){
  const set = new Set();
  const ci = CLASSES_INICIAL[w.classeNome];
  if(ci){
    ci.fixas.forEach(f=> set.add(nomeBasePericia(resolvePericiaFixa(f,w))));
    (w.periciasExtraClasse||[]).forEach(p=> set.add(nomeBasePericia(p)));
    (w.periciasExtraInt||[]).forEach(p=> set.add(nomeBasePericia(p)));
  }
  (w.origemEscolhas||[]).forEach(e=>{ if(e.tipo==='pericia') set.add(nomeBasePericia(e.valor)); });
  if(w.racaEscolhaExtra==='pericia' && w.racaEscolhaExtraSub) set.add(nomeBasePericia(w.racaEscolhaExtraSub));
  return set;
}

function nomesPoderesConhecidosWizard(w, excluir){
  excluir = excluir || {};
  const nomes = [];
  (w.origemEscolhas||[]).forEach((e,idx)=>{
    if(idx===excluir.origemIdx) return;
    if(e.tipo==='poder') nomes.push(e.sub || e.valor);
  });
  if(!excluir.racaEscolhaExtra && w.racaEscolhaExtra==='poder' && w.racaEscolhaExtraSub) nomes.push(w.racaEscolhaExtraSub);
  if(!excluir.racaPoderExtra && w.racaPoderExtraNome) nomes.push(w.racaPoderExtraSub || w.racaPoderExtraNome);
  return nomes.filter(Boolean);
}

function checaPrereqCtx(poder, ctx){
  for(const tag of poder.prereqTags){
    if(tag[0]==='attr'){ if((ctx.attrs[tag[1]]||0) < tag[2]) return false; }
    else if(tag[0]==='treinado'){ if(!ctx.pericias.has(tag[1])) return false; }
    else if(tag[0]==='treinadoQualquer'){ if(ctx.pericias.size===0) return false; }
    else if(tag[0]==='conjurador'){ if(!ctx.isConjurador) return false; }
    else if(tag[0]==='nivel'){ if((ctx.nivel||1) < tag[1]) return false; }
    else if(tag[0]==='poder'){ if(!(ctx.poderes||[]).includes(tag[1])) return false; }
    else if(tag[0]==='poderOr'){ if(!tag[1].some(n=>(ctx.poderes||[]).includes(n))) return false; }
    else if(tag[0]==='skip'){ /* não verificável automaticamente: sempre permitido */ }
  }
  return true;
}

function checaPrereq(poder, w, excluir){
  return checaPrereqCtx(poder, {
    attrs: attrFinal(w),
    pericias: periciasFinal(w),
    isConjurador: !!(CLASSES[w.classeNome] && CLASSES[w.classeNome].tradicao),
    nivel: 1,
    poderes: nomesPoderesConhecidosWizard(w, excluir)
  });
}

function poderesSelecionaveis(lista, jaConhecidos){
  return lista.filter(p => p.repetivel || !jaConhecidos.includes(p.nome));
}

function opcoesParaEscolha(esc, periciasSet){
  if(esc.tipo==='lista') return esc.opcoes;
  if(esc.tipo==='pericia'){
    const treinadas = Array.from(periciasSet || new Set());
    return esc.apenasTreinadas ? treinadas : LISTA_PERICIAS.filter(p=> !treinadas.includes(p));
  }
  if(esc.tipo==='arma') return ARMAS.map(a=>a.n);
  if(esc.tipo==='escola') return Object.keys(ESCOLAS);
  if(esc.tipo==='magia') return MAGIAS.filter(m=> m.c===esc.circulo && (m.trad===esc.trad || m.trad==='Universal')).map(m=>m.n);
  return [];
}
function renderSubEscolhaGenerica(esc, obj, campoEstado, periciasSet){
  const wrap = el('div',{class:'panel'}, el('h2',{}, esc.label || 'Escolha'));
  const grid = el('div',{class:'option-grid'});
  opcoesParaEscolha(esc, periciasSet).forEach(op=>{
    grid.appendChild(el('button',{class:'option-card '+(obj[campoEstado]===op?'selected':''), onclick:()=>{ obj[campoEstado]=op; render(); }}, el('div',{class:'opt-nome'}, op)));
  });
  wrap.appendChild(grid);
  return wrap;
}
function renderSubEscolhaPoder(obj, nomePoder, campoEstado, periciasSet){
  if(!nomePoder) return el('div',{});
  const poder = PODERES_GERAIS.find(p=>p.nome===nomePoder);
  if(!poder || !poder.escolha) return el('div',{});
  return renderSubEscolhaGenerica(poder.escolha, obj, campoEstado, periciasSet);
}

function renderWizardScreen(){
  const w = state.wizard;
  const steps = passosWizard();
  const stepId = steps[w.step];

  const wrap = el('div',{});
  wrap.appendChild(el('div',{class:'top-mini'},
    el('span',{}, 'Criando personagem'),
    el('button',{onclick:()=>{ if(confirm('Cancelar criação do personagem?')){ state.screen='perfis'; state.wizard=null; render(); } }}, 'Cancelar')
  ));

  const box = el('div',{class:'wizard-wrap'});
  const dots = el('div',{class:'wizard-steps'});
  steps.forEach((s,i)=> dots.appendChild(el('div',{class:'dot ' + (i<w.step?'done':(i===w.step?'active':''))})));
  box.appendChild(dots);

  if(stepId==='nome') box.appendChild(stepNome(w));
  if(stepId==='atributos') box.appendChild(stepAtributos(w));
  if(stepId==='raca') box.appendChild(stepRaca(w));
  if(stepId==='racaExtra') box.appendChild(stepRacaExtra(w));
  if(stepId==='classe') box.appendChild(stepClasse(w));
  if(stepId==='arcanistaCaminho') box.appendChild(stepArcanistaCaminho(w));
  if(stepId==='origem') box.appendChild(stepOrigem(w));
  if(stepId==='divindade') box.appendChild(stepDivindade(w));
  if(stepId==='revisao') box.appendChild(stepRevisao(w));

  const nav = el('div',{class:'wizard-nav'});
  if(w.step>0){ nav.appendChild(el('button',{class:'btn ghost', onclick:()=>{ w.step--; render(); }},'Voltar')); }
  if(stepId!=='revisao'){
    const podeAvancar = validarStep(stepId, w);
    const btn = el('button',{class:'btn', id:'wizard-continue-btn', onclick:()=>{ if(validarStep(stepId,w)){ w.step++; render(); } }}, 'Continuar');
    if(!podeAvancar){ btn.setAttribute('disabled','disabled'); btn.style.opacity='0.5'; }
    nav.appendChild(btn);
  } else {
    nav.appendChild(el('button',{class:'btn', onclick: finalizarCriacao},'Criar personagem'));
  }
  box.appendChild(nav);
  wrap.appendChild(box);
  return wrap;
}

function sincronizarBotaoWizard(){
  const w = state.wizard;
  const steps = passosWizard();
  const stepId = steps[w.step];
  const btn = document.getElementById('wizard-continue-btn');
  if(!btn) return;
  const ok = validarStep(stepId, w);
  if(ok){ btn.removeAttribute('disabled'); btn.style.opacity='1'; }
  else{ btn.setAttribute('disabled','disabled'); btn.style.opacity='0.5'; }
}

function validarStep(stepId, w){
  if(stepId==='nome') return w.nome.trim().length>0;
  if(stepId==='atributos'){
    return w.rolados.every(v=>v!=null) && Object.values(w.assign).every(v=>v!=null);
  }
  if(stepId==='raca'){
    if(!w.racaNome) return false;
    const raca = RACAS.find(r=>r.nome===w.racaNome);
    if(raca.escolhaLivre && (w.racaEscolhasAttr||[]).length!==raca.escolhaLivre.qtd) return false;
    return true;
  }
  if(stepId==='racaExtra'){
    const raca = RACAS.find(r=>r.nome===w.racaNome);
    if(!raca) return false;
    if(raca.poderGeralExtra){
      if(!w.racaPoderExtraNome) return false;
      const poder = PODERES_GERAIS.find(p=>p.nome===w.racaPoderExtraNome);
      if(poder && poder.escolha && !w.racaPoderExtraSub) return false;
      return true;
    }
    if(raca.escolhaExtra){
      if(!w.racaEscolhaExtra) return false;
      if(w.racaEscolhaExtra==='pericia') return !!w.racaEscolhaExtraSub;
      if(w.racaEscolhaExtra==='poder'){
        if(!w.racaEscolhaExtraSub) return false;
        const poder = PODERES_GERAIS.find(p=>p.nome===w.racaEscolhaExtraSub);
        if(poder && poder.escolha && !w.racaEscolhaExtraPoderSub) return false;
        return true;
      }
    }
    return true;
  }
  if(stepId==='classe'){
    if(!w.classeNome) return false;
    const ci = CLASSES_INICIAL[w.classeNome];
    for(const f of ci.fixas){ if(f.includes(' ou ') && !w.periciaFixaEscolhas[f]) return false; }
    const bonusInt = Math.max(0, attrFinal(w).int||0);
    if((w.periciasExtraClasse||[]).length !== ci.extra) return false;
    if((w.periciasExtraInt||[]).length !== bonusInt) return false;
    return true;
  }
  if(stepId==='origem'){
    if(!w.origemNome) return false;
    if((w.origemEscolhas||[]).length !== 2) return false;
    for(const e of w.origemEscolhas){
      if(e.tipo==='poder'){
        const poder = PODERES_GERAIS.find(p=>p.nome===e.valor);
        if(poder && poder.escolha && !e.sub) return false;
      }
    }
    return true;
  }
  if(stepId==='divindade'){
    if(!w.divindadeNome) return true; // seguir sem fé é uma escolha válida
    if(!w.poderConcedidoEscolhido) return false;
    const escolhaInfo = PODER_CONCEDIDO_TREINA_PERICIA_ESCOLHA[w.poderConcedidoEscolhido];
    if(escolhaInfo){
      const sub = w.poderConcedidoEscolhaSub||[];
      if(sub.filter(Boolean).length !== escolhaInfo.quantidade) return false;
    }
    return true;
  }
  if(stepId==='arcanistaCaminho'){
    if(!w.arcanistaCaminho) return false;
    if(w.arcanistaCaminho==='Feiticeiro' && !w.arcanistaLinhagem) return false;
    return true;
  }
  return true;
}

function stepNome(w){
  return el('div',{},
    el('div',{class:'wizard-title'},'Quem é seu herói?'),
    el('div',{class:'wizard-sub'},'Comece com o nome do personagem e o seu, jogador.'),
    el('label',{},'Nome do personagem'),
    el('input',{type:'text', value:w.nome, oninput:(e)=>{w.nome=e.target.value; sincronizarBotaoWizard();}}),
    el('label',{},'Seu nome (jogador)'),
    el('input',{type:'text', value:w.jogador, oninput:(e)=>{w.jogador=e.target.value;}}),
  );
}

function stepAtributos(w){
  const wrap = el('div',{});
  wrap.appendChild(el('div',{class:'wizard-title'},'Atributos'));
  wrap.appendChild(el('div',{class:'wizard-sub'},'Role 2d6–7 (ou o método combinado com o mestre) fisicamente, seis vezes, e digite os resultados abaixo. Depois, distribua cada valor em um atributo.'));

  if(!w._rolTexto) w._rolTexto = w.rolados.map(v=> v==null?'':String(v));
  const rollRow = el('div',{class:'attr-roll-row'});
  for(let i=0;i<6;i++){
    rollRow.appendChild(el('input',{id:'rolado-'+i, type:'text', inputmode:'numeric', pattern:'-?[0-9]*', style:'width:60px;', value: w._rolTexto[i],
      oninput:(e)=>{
        // filtra pra só aceitar dígitos e um "-" opcional na frente (evita lixo, mas nunca sanitiza pra vazio
        // como o type="number" faz — por isso o sinal de negativo não se perde mais ao digitar no celular)
        let texto = e.target.value.replace(/[^0-9-]/g,'');
        texto = texto.replace(/(?!^)-/g, ''); // só permite "-" na primeira posição
        e.target.value = texto;
        w._rolTexto[i] = texto;
        const textoValido = texto!=='' && texto!=='-' && !isNaN(parseInt(texto));
        const v = textoValido ? parseInt(texto) : null;
        w.rolados[i] = v;
        if(v==null){ Object.keys(w.assign).forEach(k=>{ if(w.assign[k]===i) w.assign[k]=null; }); }
        render();
      }
    }));
  }
  wrap.appendChild(rollRow);

  if(w.rolados.every(v=>v!=null)){
    wrap.appendChild(el('div',{class:'tip'}, el('b',{},'Como atribuir'), 'Toque em um valor rolado e depois no atributo que vai recebê-lo.'));
    const chipsRow = el('div',{class:'attr-roll-row'});
    w.rolados.forEach((v,i)=>{
      const usado = Object.values(w.assign).includes(i);
      const chip = el('button',{class:'attr-roll-chip '+(usado?'usado':'')+(w._chipSel===i?' selecionado':''), onclick:()=>{ if(!usado){ w._chipSel = (w._chipSel===i)?null:i; render(); } }}, (v>=0?'+':'')+v);
      if(usado) chip.setAttribute('disabled','disabled');
      chipsRow.appendChild(chip);
    });
    wrap.appendChild(chipsRow);

    const slotsRow = el('div',{class:'row6'});
    ['for','des','con','int','sab','car'].forEach(k=>{
      const idx = w.assign[k];
      slotsRow.appendChild(el('div',{class:'attr-slot '+(idx!=null?'preenchido':''), onclick:()=>{
        if(w._chipSel!=null){
          Object.keys(w.assign).forEach(kk=>{ if(w.assign[kk]===w._chipSel) w.assign[kk]=null; });
          w.assign[k] = w._chipSel; w._chipSel=null; render();
        } else if(idx!=null){
          w.assign[k]=null; render();
        }
      }},
        el('div',{class:'slotlbl'}, k.toUpperCase()),
        el('div',{class:'slotval'}, idx!=null? ((w.rolados[idx]>=0?'+':'')+w.rolados[idx]) : '—')
      ));
    });
    wrap.appendChild(slotsRow);
  }

  if(Object.values(w.assign).every(v=>v!=null)){
    const finais = attrFinal(w);
    wrap.appendChild(el('div',{class:'panel'},
      el('h2',{},'Atributos distribuídos'),
      el('div',{class:'row6'}, ...['for','des','con','int','sab','car'].map(k=> el('div',{class:'attr-box'}, el('div',{class:'lbl'},k.toUpperCase()), el('div',{style:'font-weight:800;font-size:1.2rem;'}, (finais[k]>=0?'+':'')+finais[k]) ))),
      el('div',{class:'meta', style:'font-size:0.75rem;color:var(--ink-soft);margin-top:6px;'}, 'Os modificadores da sua raça serão somados no próximo passo.')
    ));
  }
  return wrap;
}

function stepRaca(w){
  const wrap = el('div',{});
  wrap.appendChild(el('div',{class:'wizard-title'},'Escolha sua Raça'));
  wrap.appendChild(el('div',{class:'wizard-sub'},'Cada raça dá modificadores de atributo e habilidades próprias.'));
  const grid = el('div',{class:'option-grid'});
  RACAS.forEach(r=>{
    const modsTxt = Object.keys(r.mods||{}).length ? Object.entries(r.mods).map(([k,v])=>k.toUpperCase()+(v>0?'+':'')+v).join(', ') : (r.escolhaLivre? '+'+r.escolhaLivre.val+' em '+r.escolhaLivre.qtd+' atributos à escolha' : '—');
    grid.appendChild(el('button',{class:'option-card ' + (w.racaNome===r.nome?'selected':''), onclick:()=>{ w.racaNome=r.nome; w.racaEscolhasAttr=[]; w.racaEscolhaExtra=null; w.racaEscolhaExtraSub=null; w.racaPoderExtraNome=null; w.racaPoderExtraSub=null; render(); }},
      el('div',{class:'opt-nome'}, r.nome),
      el('div',{class:'opt-sub'}, modsTxt)
    ));
  });
  wrap.appendChild(grid);

  const raca = RACAS.find(r=>r.nome===w.racaNome);
  if(raca){
    wrap.appendChild(el('div',{class:'panel'},
      el('h2',{},'Habilidades de '+raca.nome),
      ...raca.poderes.map(([n,d])=> el('div',{class:'power-item'}, el('b',{},n), d))
    ));
    if(raca.escolhaLivre){
      const opts = ['for','des','con','int','sab','car'].filter(a=> !(raca.escolhaLivre.exceto||[]).includes(a));
      wrap.appendChild(el('div',{class:'tip'}, el('b',{},'Escolha '+raca.escolhaLivre.qtd+' atributos diferentes'), 'para receber +'+raca.escolhaLivre.val+' em cada um.'));
      const chkRow = el('div',{class:'row6'});
      opts.forEach(a=>{
        const marcado = (w.racaEscolhasAttr||[]).includes(a);
        chkRow.appendChild(el('button',{class:'option-card '+(marcado?'selected':''), onclick:()=>{
          if(marcado){ w.racaEscolhasAttr = w.racaEscolhasAttr.filter(x=>x!==a); }
          else if(w.racaEscolhasAttr.length < raca.escolhaLivre.qtd){ w.racaEscolhasAttr = [...(w.racaEscolhasAttr||[]), a]; }
          render();
        }}, el('div',{class:'opt-nome', style:'text-align:center;'}, a.toUpperCase())));
      });
      wrap.appendChild(chkRow);
    }
  }
  if(w.rolados.every(v=>v!=null) && Object.values(w.assign).every(v=>v!=null)){
    const finais = attrFinal(w);
    wrap.appendChild(el('div',{class:'panel'},
      el('h2',{},'Atributos finais (com modificadores de raça)'),
      el('div',{class:'row6'}, ...['for','des','con','int','sab','car'].map(k=> el('div',{class:'attr-box'}, el('div',{class:'lbl'},k.toUpperCase()), el('div',{style:'font-weight:800;font-size:1.2rem;'}, (finais[k]>=0?'+':'')+finais[k]) )))
    ));
  }
  return wrap;
}

function stepRacaExtra(w){
  const raca = RACAS.find(r=>r.nome===w.racaNome);
  const wrap = el('div',{});

  if(raca.poderGeralExtra){
    wrap.appendChild(el('div',{class:'wizard-title'},'Poder Geral (raça sem origem)'));
    wrap.appendChild(el('div',{class:'wizard-sub'}, raca.nome+' não escolhe origem, mas recebe um poder geral à escolha no lugar dela.'));
    const jaConhecidos = nomesPoderesConhecidosWizard(w, {racaPoderExtra:true});
    const disponiveis = poderesSelecionaveis(PODERES_GERAIS.filter(p=>checaPrereq(p,w,{racaPoderExtra:true})), jaConhecidos);
    ['Combate','Destino','Magia'].forEach(grupo=>{
      const doGrupo = disponiveis.filter(p=>p.grupo===grupo);
      if(doGrupo.length===0) return;
      wrap.appendChild(el('div',{class:'wizard-sub', style:'margin-top:10px;font-weight:700;'}, 'Poderes de '+grupo));
      const grid = el('div',{class:'option-grid'});
      doGrupo.forEach(p=>{
        const aberto = w._poderExpandido === p.nome;
        const card = el('button',{class:'option-card '+(w.racaPoderExtraNome===p.nome?'selected':''), onclick:()=>{ w.racaPoderExtraNome=p.nome; w.racaPoderExtraSub=null; w._poderExpandido=p.nome; render(); }},
          el('div',{class:'opt-nome'}, p.nome)
        );
        if(aberto) card.appendChild(el('div',{class:'opt-sub'}, p.desc));
        grid.appendChild(card);
      });
      wrap.appendChild(grid);
    });
    wrap.appendChild(renderSubEscolhaPoder(w, w.racaPoderExtraNome, 'racaPoderExtraSub', periciasFinal(w)));
    return wrap;
  }

  if(raca.escolhaExtra){
    wrap.appendChild(el('div',{class:'wizard-title'},'Memória Póstuma'));
    wrap.appendChild(el('div',{class:'wizard-sub'}, raca.escolhaExtra.texto || 'Escolha entre ficar treinado em uma perícia ou receber um poder geral à escolha.'));
    const modoRow = el('div',{class:'row'});
    modoRow.appendChild(el('button',{class:'option-card '+(w.racaEscolhaExtra==='pericia'?'selected':''), onclick:()=>{ w.racaEscolhaExtra='pericia'; w.racaEscolhaExtraSub=null; render(); }}, el('div',{class:'opt-nome'},'Perícia treinada')));
    modoRow.appendChild(el('button',{class:'option-card '+(w.racaEscolhaExtra==='poder'?'selected':''), onclick:()=>{ w.racaEscolhaExtra='poder'; w.racaEscolhaExtraSub=null; render(); }}, el('div',{class:'opt-nome'},'Poder geral')));
    wrap.appendChild(modoRow);

    if(w.racaEscolhaExtra==='pericia'){
      const treinadasAtuais = Array.from(periciasFinal(w));
      const opts = LISTA_PERICIAS.filter(p=> !treinadasAtuais.includes(p));
      const grid = el('div',{class:'option-grid'});
      opts.forEach(p=> grid.appendChild(el('button',{class:'option-card '+(w.racaEscolhaExtraSub===p?'selected':''), onclick:()=>{ w.racaEscolhaExtraSub=p; render(); }}, el('div',{class:'opt-nome'},p))));
      wrap.appendChild(grid);
    }
    if(w.racaEscolhaExtra==='poder'){
      const jaConhecidos = nomesPoderesConhecidosWizard(w, {racaEscolhaExtra:true});
      const disponiveis = poderesSelecionaveis(PODERES_GERAIS.filter(p=>checaPrereq(p,w,{racaEscolhaExtra:true})), jaConhecidos);
      ['Combate','Destino','Magia'].forEach(grupo=>{
        const doGrupo = disponiveis.filter(p=>p.grupo===grupo);
        if(doGrupo.length===0) return;
        wrap.appendChild(el('div',{class:'wizard-sub', style:'font-weight:700;'}, 'Poderes de '+grupo));
        const grid = el('div',{class:'option-grid'});
        doGrupo.forEach(p=>{
          const aberto = w._poderExpandido === p.nome;
          const card = el('button',{class:'option-card '+(w.racaEscolhaExtraSub===p.nome?'selected':''), onclick:()=>{ w.racaEscolhaExtraSub=p.nome; w.racaEscolhaExtraPoderSub=null; w._poderExpandido=p.nome; render(); }},
            el('div',{class:'opt-nome'}, p.nome)
          );
          if(aberto) card.appendChild(el('div',{class:'opt-sub'}, p.desc));
          grid.appendChild(card);
        });
        wrap.appendChild(grid);
      });
      const poderEscolhido = PODERES_GERAIS.find(p=>p.nome===w.racaEscolhaExtraSub);
      if(poderEscolhido && poderEscolhido.escolha){
        wrap.appendChild(renderSubEscolhaGenerica(poderEscolhido.escolha, w, 'racaEscolhaExtraPoderSub', periciasFinal(w)));
      }
    }
  }
  return wrap;
}

function stepClasse(w){
  const wrap = el('div',{});
  wrap.appendChild(el('div',{class:'wizard-title'},'Escolha sua Classe'));
  wrap.appendChild(el('div',{class:'wizard-sub'},'Define seu papel no grupo, pontos de vida/mana e perícias iniciais.'));
  const grid = el('div',{class:'option-grid'});
  Object.keys(CLASSES).forEach(nome=>{
    const ci = CLASSES_INICIAL[nome];
    grid.appendChild(el('button',{class:'option-card '+(w.classeNome===nome?'selected':''), onclick:()=>{ w.classeNome=nome; w.periciaFixaEscolhas={}; w.periciasExtraClasse=[]; w.periciasExtraInt=[]; render(); }},
      el('div',{class:'opt-nome'}, nome),
      el('div',{class:'opt-sub'}, ci.atributo+' · PV '+ci.pv1+' · PM '+ci.pm)
    ));
  });
  wrap.appendChild(grid);

  const ci = CLASSES_INICIAL[w.classeNome];
  if(ci){
    const fixasSemEscolha = ci.fixas.filter(f=> !f.includes(' ou '));
    const fixasComEscolha = ci.fixas.filter(f=> f.includes(' ou '));
    wrap.appendChild(el('div',{class:'panel'},
      el('h2',{},'Papel e perícias de '+w.classeNome),
      el('div',{class:'tip'}, el('b',{},'Papel'), CLASSES[w.classeNome].papel),
      fixasSemEscolha.length ? el('div',{class:'tip'}, el('b',{},'Perícias iniciais'), 'Todo '+w.classeNome+' já começa treinado automaticamente em '+fixasSemEscolha.join(' e ')+' — não precisa escolher nada aqui, é garantido pela classe.') : null
    ));
    ci.fixas.forEach(f=>{
      if(f.includes(' ou ')){
        const [a,b] = f.split(' ou ');
        const wrapSel = el('div',{class:'panel'}, el('h2',{},'Perícia inicial: '+f));
        wrapSel.appendChild(el('div',{class:'tip', style:'font-size:0.78rem;'}, 'Todo '+w.classeNome+' começa treinado em uma dessas duas — escolha qual.'));
        const row = el('div',{class:'row'});
        [a,b].forEach(opt=>{
          row.appendChild(el('button',{class:'option-card '+(w.periciaFixaEscolhas[f]===opt?'selected':''), onclick:()=>{ w.periciaFixaEscolhas[f]=opt; render(); }}, el('div',{class:'opt-nome'},opt)));
        });
        wrapSel.appendChild(row);
        wrap.appendChild(wrapSel);
      }
    });

    const jaFixas = ci.fixas.map(f=> nomeBasePericia(resolvePericiaFixa(f,w)));
    const jaDeOrigemOuRaca = [];
    (w.origemEscolhas||[]).forEach(e=>{ if(e.tipo==='pericia') jaDeOrigemOuRaca.push(nomeBasePericia(e.valor)); });
    if(w.racaEscolhaExtra==='pericia' && w.racaEscolhaExtraSub) jaDeOrigemOuRaca.push(nomeBasePericia(w.racaEscolhaExtraSub));
    const jaConhecidasFora = [...jaFixas, ...jaDeOrigemOuRaca];
    const listaRestrita = (PERICIAS_POR_CLASSE[w.classeNome]||[]).filter(p=> !jaConhecidasFora.includes(p));
    const bonusInt = Math.max(0, attrFinal(w).int||0);

    // Cada pool tem seu próprio limite e seu próprio array — nunca se misturam.
    if(!w.periciasExtraClasse) w.periciasExtraClasse = [];
    if(!w.periciasExtraInt) w.periciasExtraInt = [];
    if(w.periciasExtraClasse.length > ci.extra) w.periciasExtraClasse = w.periciasExtraClasse.slice(0, ci.extra);
    if(w.periciasExtraInt.length > bonusInt) w.periciasExtraInt = w.periciasExtraInt.slice(0, bonusInt);
    // Se uma perícia acabou presente nos dois pools (por dado antigo/migração), prioriza o pool da classe.
    w.periciasExtraInt = w.periciasExtraInt.filter(p=> !w.periciasExtraClasse.includes(p));

    const extraPanel = el('div',{class:'panel'}, el('h2',{}, 'Escolha '+ci.extra+' perícias da lista da classe'));
    if(jaDeOrigemOuRaca.length>0){
      extraPanel.appendChild(el('div',{class:'tip', style:'font-size:0.78rem;'}, el('b',{},'Já treinado por outra fonte: '), jaDeOrigemOuRaca.join(', ')+' — por isso não aparecem aqui pra escolher de novo.'));
    }
    if(bonusInt>0){
      extraPanel.appendChild(el('div',{class:'tip'}, el('b',{},'Bônus de Inteligência'), '+'+bonusInt+' perícia(s) extra por Inteligência — essas podem ser QUALQUER perícia, não precisam estar na lista da classe (escolha elas mais abaixo).'));
    }
    const grid2 = el('div',{class:'option-grid'});
    listaRestrita.forEach(p=>{
      const marcado = w.periciasExtraClasse.includes(p);
      const usadaNoOutroPool = w.periciasExtraInt.includes(p);
      const infoPericia = PERICIAS.find(x=>x.nome===p);
      const classe = marcado ? 'selected' : (usadaNoOutroPool ? 'used-elsewhere' : '');
      grid2.appendChild(el('button',{class:'option-card '+classe, onclick:()=>{
        if(usadaNoOutroPool) return; // já escolhida como perícia de Inteligência, não pode escolher de novo aqui
        if(marcado){ w.periciasExtraClasse = w.periciasExtraClasse.filter(x=>x!==p); }
        else if(w.periciasExtraClasse.length < ci.extra){ w.periciasExtraClasse = [...w.periciasExtraClasse, p]; }
        render();
      }},
        el('div',{class:'opt-nome'}, p),
        infoPericia ? el('div',{class:'opt-sub'}, infoPericia.resumo) : null,
        usadaNoOutroPool ? el('div',{class:'opt-sub', style:'color:var(--red-bright);'}, 'já escolhida como perícia de Inteligência') : null
      ));
    });
    extraPanel.appendChild(grid2);
    extraPanel.appendChild(el('div',{class:'meta', style:'font-size:0.75rem;color:var(--ink-soft);margin-top:6px;'}, w.periciasExtraClasse.length+' / '+ci.extra+' escolhidas'));
    wrap.appendChild(extraPanel);

    if(bonusInt>0){
      const livresPanel = el('div',{class:'panel'}, el('h2',{}, 'Escolha '+bonusInt+' perícia(s) extra (bônus de Inteligência — qualquer perícia)'));
      const disponiveisLivres = LISTA_PERICIAS.filter(p=> !jaConhecidasFora.includes(p));
      const grid3 = el('div',{class:'option-grid'});
      disponiveisLivres.forEach(p=>{
        const marcado = w.periciasExtraInt.includes(p);
        const usadaNoOutroPool = w.periciasExtraClasse.includes(p);
        const infoPericia = PERICIAS.find(x=>x.nome===p);
        const classe = marcado ? 'selected' : (usadaNoOutroPool ? 'used-elsewhere' : '');
        grid3.appendChild(el('button',{class:'option-card '+classe, onclick:()=>{
          if(usadaNoOutroPool) return; // já escolhida como perícia da classe, não pode escolher de novo aqui
          if(marcado){ w.periciasExtraInt = w.periciasExtraInt.filter(x=>x!==p); }
          else if(w.periciasExtraInt.length < bonusInt){ w.periciasExtraInt = [...w.periciasExtraInt, p]; }
          render();
        }},
          el('div',{class:'opt-nome'}, p),
          infoPericia ? el('div',{class:'opt-sub'}, infoPericia.resumo) : null,
          usadaNoOutroPool ? el('div',{class:'opt-sub', style:'color:var(--red-bright);'}, 'já escolhida como perícia da classe') : null
        ));
      });
      livresPanel.appendChild(grid3);
      livresPanel.appendChild(el('div',{class:'meta', style:'font-size:0.75rem;color:var(--ink-soft);margin-top:6px;'}, w.periciasExtraInt.length+' / '+bonusInt+' escolhidas'));
      wrap.appendChild(livresPanel);
    }

  }
  return wrap;
}

function stepArcanistaCaminho(w){
  const wrap = el('div',{});
  wrap.appendChild(el('div',{class:'wizard-title'},'Caminho do Arcanista'));
  wrap.appendChild(el('div',{class:'tip'}, 'A magia é um poder incrível, capaz de alterar a realidade. Esse poder tem fontes distintas e cada uma opera conforme suas próprias regras. Escolha uma — essa escolha não pode ser mudada depois.'));

  wrap.appendChild(el('div',{class:'option-grid'},
    ...Object.keys(ARCANISTA_CAMINHOS).map(nome=>{
      const info = ARCANISTA_CAMINHOS[nome];
      const aberto = w._caminhoExpandido === nome;
      const card = el('button',{class:'option-card'+(w.arcanistaCaminho===nome?' selected':''), onclick:()=>{
        if(aberto || w.arcanistaCaminho===nome){ w.arcanistaCaminho=nome; if(nome!=='Feiticeiro') w.arcanistaLinhagem=null; w._caminhoExpandido=null; }
        else { w._caminhoExpandido = nome; }
        render();
      }},
        el('div',{class:'opt-nome'}, nome),
        el('div',{class:'opt-sub'}, info.resumo)
      );
      if(aberto) card.appendChild(el('div',{class:'opt-sub', style:'margin-top:6px;'}, info.descricao));
      return card;
    })
  ));
  wrap.appendChild(el('div',{class:'tip', style:'font-size:0.78rem;'}, 'Toque pra ver a descrição, toque de novo pra escolher.'));

  if(w.arcanistaCaminho==='Feiticeiro'){
    wrap.appendChild(el('div',{class:'wizard-title', style:'margin-top:16px;'},'Linhagem Sobrenatural'));
    wrap.appendChild(el('div',{class:'tip'}, 'O poder de um feiticeiro vem do sangue de um antepassado sobrenatural. Escolha uma linhagem — você recebe a herança "Básica" dela agora.'));
    wrap.appendChild(el('div',{class:'option-grid'},
      ...LINHAGENS_FEITICEIRO.map(l=>{
        const aberta = w._linhagemExpandida === l.nome;
        const card = el('button',{class:'option-card'+(w.arcanistaLinhagem===l.nome?' selected':''), onclick:()=>{
          if(aberta || w.arcanistaLinhagem===l.nome){ w.arcanistaLinhagem=l.nome; w._linhagemExpandida=null; }
          else { w._linhagemExpandida = l.nome; }
          render();
        }},
          el('div',{class:'opt-nome'}, l.nome),
          el('div',{class:'opt-sub'}, l.resumo)
        );
        if(aberta) card.appendChild(el('div',{class:'opt-sub', style:'margin-top:6px;'}, el('b',{},'Básica: '), l.basica));
        return card;
      })
    ));
  }

  return wrap;
}

function stepOrigem(w){
  const wrap = el('div',{});
  wrap.appendChild(el('div',{class:'wizard-title'},'Escolha sua Origem'));
  wrap.appendChild(el('div',{class:'wizard-sub'},'Sua vida antes de virar aventureiro. Cada origem dá uma lista de benefícios — você escolhe exatamente 2: duas perícias, dois poderes, ou uma perícia e um poder.'));
  const grid = el('div',{class:'option-grid'});
  ORIGENS.forEach(o=>{
    grid.appendChild(el('button',{class:'option-card '+(w.origemNome===o.nome?'selected':''), onclick:()=>{ w.origemNome=o.nome; w.origemEscolhas=[]; render(); }},
      el('div',{class:'opt-nome'}, o.nome),
      el('div',{class:'opt-sub'}, (o.pericias.slice(0,3).join(', '))+(o.pericias.length?'...':''))
    ));
  });
  wrap.appendChild(grid);

  const origem = ORIGENS.find(o=>o.nome===w.origemNome);
  if(!origem) return wrap;

  if(origem.especial && origem.especial.tipo==='amnesico'){
    wrap.appendChild(el('div',{class:'tip'}, el('b',{},'Origem especial'), origem.especial.texto));
  }

  const jaEscolhidas = w.origemEscolhas||[];
  const podeEscolherMais = jaEscolhidas.length < 2;

  function estaEscolhido(tipo, valor){ return jaEscolhidas.some(e=>e.tipo===tipo && e.valor===valor); }
  function toggleEscolha(tipo, valor){
    const idx = jaEscolhidas.findIndex(e=>e.tipo===tipo && e.valor===valor);
    if(idx>=0){ w.origemEscolhas.splice(idx,1); render(); return; }
    if(jaEscolhidas.length>=2) return;
    w.origemEscolhas.push({tipo, valor, sub:null});
    render();
  }

  wrap.appendChild(el('div',{class:'panel'},
    el('h2',{}, 'Benefícios de '+origem.nome+' — '+jaEscolhidas.length+'/2 escolhidos'),
    el('div',{class:'tip', style:'font-size:0.8rem;'}, 'Toque para marcar/desmarcar. As perícias que você escolher aqui ficam reservadas — a classe (próximo passo) não vai deixar escolher essas de novo.'),
    origem.itens ? el('div',{class:'tip', style:'font-size:0.8rem;'}, el('b',{},'Itens iniciais (grátis): '), origem.itens) : null
  ));

  const periciasJaTreinadas = periciasFinal(w);

  const periciasPanel = el('div',{class:'panel'}, el('h2',{},'Perícias'));
  const gridPer = el('div',{class:'option-grid'});
  origem.pericias.forEach(p=>{
    const nomeBase = nomeBasePericia(p);
    const jaTreinadaFora = periciasJaTreinadas.has(nomeBase) && !estaEscolhido('pericia', p);
    const marcado = estaEscolhido('pericia', p);
    const bloqueado = jaTreinadaFora || (!marcado && !podeEscolherMais);
    const btn = el('button',{class:'option-card '+(marcado?'selected':'')+(bloqueado?' disabled':''), onclick:()=>{ if(!bloqueado) toggleEscolha('pericia', p); }},
      el('div',{class:'opt-nome'}, p),
      jaTreinadaFora ? el('div',{class:'opt-sub'}, 'já treinado pela classe') : null
    );
    gridPer.appendChild(btn);
  });
  periciasPanel.appendChild(gridPer);
  wrap.appendChild(periciasPanel);

  const jaConhecidosGerais = nomesPoderesConhecidosWizard(w);
  const poderesPanel = el('div',{class:'panel'}, el('h2',{},'Poderes gerais'));
  const gridPod = el('div',{class:'option-grid'});
  origem.poderesGerais.forEach(pTxt=>{
    if(/à escolha/i.test(pTxt)){
      const marcado = estaEscolhido('poderCategoria', pTxt);
      const bloqueado = !marcado && !podeEscolherMais;
      gridPod.appendChild(el('button',{class:'option-card '+(marcado?'selected':'')+(bloqueado?' disabled':''), onclick:()=>{
        if(bloqueado) return;
        const idx = jaEscolhidas.findIndex(e=>e.tipo==='poderCategoria' && e.valor===pTxt);
        if(idx>=0){ w.origemEscolhas.splice(idx,1); }
        else if(jaEscolhidas.length<2){ w.origemEscolhas.push({tipo:'poderCategoria', valor:pTxt, sub:null}); }
        render();
      }}, el('div',{class:'opt-nome'}, pTxt)));
      return;
    }    const poderInfo = PODERES_GERAIS.find(p=>p.nome===pTxt);
    const marcado = estaEscolhido('poder', pTxt);
    const atendePrereq = poderInfo ? checaPrereq(poderInfo, w) : true;
    const jaTem = jaConhecidosGerais.includes(pTxt) && !marcado && !(poderInfo&&poderInfo.repetivel);
    const bloqueado = (!marcado && !podeEscolherMais) || !atendePrereq || jaTem;
    const aberto = w._poderExpandido === pTxt;
    const btn = el('button',{class:'option-card '+(marcado?'selected':'')+(bloqueado?' disabled':''), onclick:()=>{ w._poderExpandido=pTxt; if(!bloqueado) toggleEscolha('poder', pTxt); else render(); }},
      el('div',{class:'opt-nome'}, pTxt),
    );
    if(aberto){
      btn.appendChild(el('div',{class:'opt-sub'}, poderInfo ? poderInfo.desc : ''));
      if(!atendePrereq) btn.appendChild(el('div',{class:'opt-sub', style:'color:var(--red);'}, 'pré-requisito: '+(poderInfo?poderInfo.prereq:'')));
      if(jaTem) btn.appendChild(el('div',{class:'opt-sub', style:'color:var(--red);'}, 'você já tem este poder'));
    }
    gridPod.appendChild(btn);
  });
  poderesPanel.appendChild(gridPod);
  wrap.appendChild(poderesPanel);

  if(origem.poderUnico){
    const marcado = estaEscolhido('unico', origem.poderUnico.nome);
    const bloqueado = !marcado && !podeEscolherMais;
    wrap.appendChild(el('div',{class:'panel'},
      el('h2',{},'Poder único de '+origem.nome),
      el('button',{class:'option-card '+(marcado?'selected':'')+(bloqueado?' disabled':''), style:'width:100%;', onclick:()=>{ if(!bloqueado) toggleEscolha('unico', origem.poderUnico.nome); }},
        el('div',{class:'opt-nome'}, origem.poderUnico.nome),
        el('div',{class:'opt-sub'}, origem.poderUnico.desc)
      )
    ));
  }

  jaEscolhidas.forEach((e)=>{
    if(e.tipo!=='poder') return;
    const poderInfo = PODERES_GERAIS.find(p=>p.nome===e.valor);
    if(poderInfo && poderInfo.escolha){
      const subWrap = renderSubEscolhaGenerica(poderInfo.escolha, e, 'sub', periciasFinal(w));
      const h2 = subWrap.querySelector('h2');
      if(h2) h2.textContent = e.valor+': '+(poderInfo.escolha.label||'escolha');
      wrap.appendChild(subWrap);
    }
  });

  // Sub-escolha para categorias "à escolha" (ex: "um poder de combate à escolha") — mostra a
  // lista real de poderes daquele grupo pra escolher qual será, em vez de deixar undefined.
  jaEscolhidas.forEach((e, idxEscolha)=>{
    if(e.tipo!=='poderCategoria') return;
    if(/combate/i.test(e.valor)){
      const jaConhecidosCat = nomesPoderesConhecidosWizard(w, {origemIdx: idxEscolha});
      const opcoesCombate = poderesSelecionaveis(PODERES_GERAIS.filter(p=>p.grupo==='Combate' && checaPrereq(p,w)), jaConhecidosCat);
      const subPanel = el('div',{class:'panel'}, el('h2',{}, e.valor+': qual poder de Combate?'));
      const gridCat = el('div',{class:'option-grid'});
      opcoesCombate.forEach(p=>{
        const aberto = w._poderExpandido === p.nome;
        const card = el('button',{class:'option-card '+(e.sub===p.nome?'selected':''), onclick:()=>{ e.sub=p.nome; w._poderExpandido=p.nome; render(); }},
          el('div',{class:'opt-nome'}, p.nome)
        );
        if(aberto) card.appendChild(el('div',{class:'opt-sub'}, p.desc));
        gridCat.appendChild(card);
      });
      subPanel.appendChild(gridCat);
      wrap.appendChild(subPanel);
      const poderEscolhidoCat = PODERES_GERAIS.find(p=>p.nome===e.sub);
      if(poderEscolhidoCat && poderEscolhidoCat.escolha){
        const subSub = renderSubEscolhaGenerica(poderEscolhidoCat.escolha, e, 'subEscolha', periciasFinal(w));
        const h2b = subSub.querySelector('h2');
        if(h2b) h2b.textContent = e.sub+': '+(poderEscolhidoCat.escolha.label||'escolha');
        wrap.appendChild(subSub);
      }
    } else {
      wrap.appendChild(el('div',{class:'tip'}, el('b',{},e.valor), 'Esse poder não está catalogado no app — combine com o mestre qual será e anote nas Notas da ficha depois de criar o personagem.'));
    }
  });

  return wrap;
}

function stepDivindade(w){
  const wrap = el('div',{});
  wrap.appendChild(el('div',{class:'wizard-title'},'Fé e Devoção'));
  wrap.appendChild(el('div',{class:'wizard-sub'},'Você pode escolher ter fé em uma divindade do Panteão de Arton, seguindo suas Obrigações & Restrições em troca de um poder concedido. É opcional — exceto se for clérigo, druida ou paladino, que automaticamente são devotos.'));

  const classesDevotasAuto = ['Clérigo','Druida','Paladino'];
  if(classesDevotasAuto.includes(w.classeNome) && !w.divindadeNome){
    wrap.appendChild(el('div',{class:'tip'}, el('b',{},'Sua classe exige devoção'), w.classeNome+'s são automaticamente devotos de uma divindade — escolha uma abaixo.'));
  }

  if(!w.divindadeNome){
    wrap.appendChild(el('div',{class:'tip', style:'font-size:0.78rem;'}, 'Toque numa divindade pra ver a descrição, toque de novo pra escolher ela.'));
    wrap.appendChild(el('div',{class:'option-grid'},
      ...DEUSES.map(d=>{
        const aberto = w._divindadeExpandida === d.nome;
        const card = el('button',{class:'option-card'+(aberto?' selected':''), onclick:()=>{
          if(aberto){ w.divindadeNome=d.nome; w._confirmarFe=true; w._divindadeExpandida=null; }
          else { w._divindadeExpandida = d.nome; }
          render();
        }},
          el('div',{class:'opt-nome'}, d.nome),
          el('div',{class:'opt-sub'}, 'Energia '+d.energia+' · Arma preferida: '+d.arma)
        );
        if(aberto) card.appendChild(el('div',{class:'opt-sub', style:'margin-top:6px;'}, el('b',{},'Devotos típicos: '), d.devotos));
        return card;
      })
    ));
    if(!classesDevotasAuto.includes(w.classeNome)){
      wrap.appendChild(el('button',{class:'btn ghost', onclick:()=>{ w.divindadeNome=''; w.poderConcedidoEscolhido=null; w.step++; render(); }}, 'Seguir sem fé em nenhuma divindade →'));
    }
  } else if(w._confirmarFe){
    const deus = DEUSES.find(d=>d.nome===w.divindadeNome);
    wrap.appendChild(el('div',{class:'panel faixa'},
      el('h2',{},'Confirmar: ter fé em '+deus.nome+'?'),
      el('div',{class:'tip'}, el('b',{},'Devotos típicos'), deus.devotos),
      el('div',{class:'tip'}, el('b',{},'Obrigações & Restrições'), deus.obrigacoes),
      el('div',{class:'tip', style:'color:var(--red-bright);'}, el('b',{},'Atenção'), 'Se violar as obrigações, perde todos os PM até o próximo dia (ou até fazer penitência, na segunda vez na mesma aventura).'),
      el('div',{class:'row'},
        el('button',{class:'btn', onclick:()=>{ w._confirmarFe=false; render(); }}, 'Sim, tenho fé'),
        el('button',{class:'btn ghost', onclick:()=>{ w.divindadeNome=''; w._confirmarFe=false; render(); }}, 'Não, escolher outra')
      )
    ));
  } else {
    const deus = DEUSES.find(d=>d.nome===w.divindadeNome);
    wrap.appendChild(el('div',{class:'identidade-nome'}, 'Devoto de '+deus.nome));
    wrap.appendChild(el('button',{class:'btn ghost', style:'margin-bottom:12px;', onclick:()=>{ w.divindadeNome=''; w.poderConcedidoEscolhido=null; w.poderConcedidoEscolhaSub=[]; render(); }}, 'Trocar divindade'));
    const podPanel = el('div',{class:'panel'}, el('h2',{},'Escolha o poder concedido'));
    const grid = el('div',{class:'option-grid'});
    deus.poderes.forEach(nomePoder=>{
      const info = PODERES_CONCEDIDOS.find(p=>p.nome===nomePoder);
      const aberto = w._poderExpandido === nomePoder;
      const card = el('button',{class:'option-card '+(w.poderConcedidoEscolhido===nomePoder?'selected':''), onclick:()=>{ w.poderConcedidoEscolhido=nomePoder; w._poderExpandido=nomePoder; w.poderConcedidoEscolhaSub=[]; render(); }},
        el('div',{class:'opt-nome'}, nomePoder)
      );
      if(aberto) card.appendChild(el('div',{class:'opt-sub'}, info?info.desc:''));
      grid.appendChild(card);
    });
    podPanel.appendChild(grid);
    wrap.appendChild(podPanel);

    const escolhaInfo = w.poderConcedidoEscolhido ? PODER_CONCEDIDO_TREINA_PERICIA_ESCOLHA[w.poderConcedidoEscolhido] : null;
    if(escolhaInfo){
      if(!w.poderConcedidoEscolhaSub) w.poderConcedidoEscolhaSub = [];
      const subPanel = el('div',{class:'panel'}, el('h2',{}, escolhaInfo.label));
      const subGrid = el('div',{class:'option-grid'});
      PERICIAS.filter(p=> p.attr===escolhaInfo.filtroAttr).forEach(p=>{
        const marcado = w.poderConcedidoEscolhaSub.includes(p.nome);
        subGrid.appendChild(el('button',{class:'option-card '+(marcado?'selected':''), onclick:()=>{
          if(marcado){ w.poderConcedidoEscolhaSub = w.poderConcedidoEscolhaSub.filter(x=>x!==p.nome); }
          else if(w.poderConcedidoEscolhaSub.length < escolhaInfo.quantidade){ w.poderConcedidoEscolhaSub = [...w.poderConcedidoEscolhaSub, p.nome]; }
          render();
        }}, el('div',{class:'opt-nome'}, p.nome)));
      });
      subPanel.appendChild(subGrid);
      subPanel.appendChild(el('div',{class:'meta', style:'font-size:0.75rem;color:var(--ink-soft);margin-top:6px;'}, w.poderConcedidoEscolhaSub.length+' / '+escolhaInfo.quantidade+' escolhidas'));
      wrap.appendChild(subPanel);
    }
  }
  return wrap;
}

function stepRevisao(w){
  const finais = attrFinal(w);
  const ci = CLASSES_INICIAL[w.classeNome];
  const pv1 = ci.pv1 + finais.con;
  const wrap = el('div',{});
  wrap.appendChild(el('div',{class:'wizard-title'},'Revisão'));
  const panel = el('div',{class:'panel'},
    el('h2',{},w.nome),
    el('div',{class:'tip'}, el('b',{},'Raça / Classe / Origem'), w.racaNome+' · '+w.classeNome+(w.origemNome?(' · '+w.origemNome):' · sem origem')),
    el('div',{class:'row6'}, ...['for','des','con','int','sab','car'].map(k=> el('div',{class:'attr-box'}, el('div',{class:'lbl'},k.toUpperCase()), el('div',{style:'font-weight:800;'}, (finais[k]>=0?'+':'')+finais[k]) ))),
    el('div',{class:'tip'}, el('b',{},'PV / PM iniciais'), pv1+' PV · '+ci.pm+' PM'),
    el('div',{class:'tip'}, el('b',{},'Perícias treinadas'), Array.from(periciasFinal(w)).join(', ') || '(nenhuma)'),
  );

  const podersTxt = [];
  (w.origemEscolhas||[]).forEach(e=>{
    if(e.tipo==='poder') podersTxt.push(e.valor+(e.sub?(' — '+e.sub):''));
    if(e.tipo==='unico') podersTxt.push(e.valor+' (poder único da origem)');
    if(e.tipo==='poderCategoria') podersTxt.push(e.valor);
  });
  if(w.racaPoderExtraNome) podersTxt.push(w.racaPoderExtraNome+(w.racaPoderExtraSub?(' — '+w.racaPoderExtraSub):'')+' (raça sem origem)');
  if(w.racaEscolhaExtra==='poder' && w.racaEscolhaExtraSub) podersTxt.push(w.racaEscolhaExtraSub+(w.racaEscolhaExtraPoderSub?(' — '+w.racaEscolhaExtraPoderSub):'')+' (Memória Póstuma)');

  panel.appendChild(el('div',{class:'tip'}, el('b',{},'Poderes gerais'), podersTxt.length? podersTxt.join(' · ') : 'nenhum — nem toda origem/raça concede um poder geral no 1º nível, e tudo bem.'));

  wrap.appendChild(panel);
  return wrap;
}

async function finalizarCriacao(){
  const w = state.wizard;
  const finais = attrFinal(w);
  const ci = CLASSES_INICIAL[w.classeNome];
  const racaObj = RACAS.find(r=>r.nome===w.racaNome);
  const f = fichaVazia();
  f.id = uid();
  f.jogador = w.jogador; f.nome = w.nome;
  f.raca = w.racaNome; f.origem = w.origemNome || '(sem origem)';
  f.divindade = w.divindadeNome || '';
  f.poderConcedido = w.poderConcedidoEscolhido ? {nome: w.poderConcedidoEscolhido, deus: w.divindadeNome, sub: (w.poderConcedidoEscolhaSub||[]).slice()} : null;
  f.classesNiveis = [{classe:w.classeNome, nivel:1}];
  if(w.classeNome==='Arcanista' && w.arcanistaCaminho){
    f.arcanistaCaminho = w.arcanistaCaminho;
    f.arcanistaLinhagem = w.arcanistaCaminho==='Feiticeiro' ? w.arcanistaLinhagem : null;
    if(ARCANISTA_CAMINHOS[w.arcanistaCaminho].memorizacao) f.magiasMemorizadas = [];
  }
  f.for=finais.for; f.des=finais.des; f.con=finais.con; f.int=finais.int; f.sab=finais.sab; f.car=finais.car;
  f.deslocamento = racaObj ? racaObj.deslocamento : 9;
  f.tamanho = racaObj ? racaObj.tamanho : 'Médio';

  const poderesOrigem = (w.origemEscolhas||[]).filter(e=>e.tipo==='poder').map(e=>({nome:e.valor, sub:e.sub}));
  const poderCategoria = (w.origemEscolhas||[]).find(e=>e.tipo==='poderCategoria');
  const poderUnicoEscolhido = (w.origemEscolhas||[]).find(e=>e.tipo==='unico');

  f.poderGeral = poderesOrigem[0] || null;
  if(poderesOrigem[1]) f.poderGeralExtra = poderesOrigem[1];
  if(poderCategoria){
    f.origemPoderCategoria = {nome: poderCategoria.valor, sub: poderCategoria.sub||null, subEscolha: poderCategoria.subEscolha||null};
    // Se o jogador escolheu um poder de combate específico (não ficou em aberto pro mestre), ele
    // conta de fato como um poder geral ativo do personagem — igual aos outros benefícios de origem.
    if(poderCategoria.sub && /combate/i.test(poderCategoria.valor)){
      if(!f.poderGeral){ f.poderGeral = {nome: poderCategoria.sub, sub: poderCategoria.subEscolha||null}; }
      else if(!f.poderGeralExtra){ f.poderGeralExtra = {nome: poderCategoria.sub, sub: poderCategoria.subEscolha||null}; }
    }
  }
  if(poderUnicoEscolhido){
    const origemObj = ORIGENS.find(o=>o.nome===w.origemNome);
    f.origemPoder = {nome: poderUnicoEscolhido.valor, sub:null, desc: origemObj&&origemObj.poderUnico?origemObj.poderUnico.desc:''};
  }

  if(w.racaPoderExtraNome){
    f.poderRaca = {nome:w.racaPoderExtraNome, sub:w.racaPoderExtraSub};
  }
  if(w.racaEscolhaExtra==='poder' && w.racaEscolhaExtraSub){
    f.poderRaca = {nome:w.racaEscolhaExtraSub, sub:w.racaEscolhaExtraPoderSub||null};
  }

  const nomesPoderes = [
    f.poderGeral&&(f.poderGeral.sub||f.poderGeral.nome),
    f.poderGeralExtra&&(f.poderGeralExtra.sub||f.poderGeralExtra.nome),
    f.poderRaca&&(f.poderRaca.sub||f.poderRaca.nome),
  ].filter(Boolean);

  let pv1 = Math.max(1, ci.pv1 + finais.con);
  let pm1 = ci.pm;
  if(nomesPoderes.includes('Vitalidade')) pv1 += 1;
  if(nomesPoderes.includes('Vontade de Ferro')) pm1 += 1;
  if(racaObj && racaObj.pvBonusNivel1) pv1 += racaObj.pvBonusNivel1;
  f.pvmax = pv1; f.pvatual = pv1;
  f.pmmax = pm1; f.pmatual = pm1;

  const periciasSet = periciasFinal(w);
  if(nomesPoderes.includes('Treinamento em Perícia')){
    [f.poderGeral, f.poderGeralExtra, f.poderRaca].forEach(p=>{
      if(p && p.nome==='Treinamento em Perícia' && p.sub) periciasSet.add(nomeBasePericia(p.sub));
    });
  }
  if(w.racaEscolhaExtra==='pericia' && w.racaEscolhaExtraSub) periciasSet.add(nomeBasePericia(w.racaEscolhaExtraSub));
  f.periciasTreinadas = Array.from(periciasSet);

  const origemObj = ORIGENS.find(o=>o.nome===w.origemNome);
  const racaObjFinal = RACAS.find(r=>r.nome===w.racaNome);
  f.habilidadesIniciais = (racaObjFinal ? racaObjFinal.poderes.map(([nome,desc])=>({fonte:'Raça: '+w.racaNome, nome, desc})) : []);
  if(origemObj && origemObj.itens){
    f.habilidadesIniciais.push({fonte:'Origem: '+w.origemNome, nome:'Itens iniciais', desc: origemObj.itens});
  }
  f.notas = '';

  state.perfis.push(f);
  await salvarPerfis();
  state.perfilAtualId = f.id;
  state.screen = 'ficha';
  state.wizard = null;
  render();
  iniciarAtualizacaoAutomaticaJogador();
}
