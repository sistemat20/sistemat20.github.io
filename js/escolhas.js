// Janelas de escolha: Divindade e poder concedido, Adicionar parceiro e Golpe Pessoal.
// Separado do js/ficha.js em 15/11/2026 (item 6 da revisão geral), sem mudar o código.

function renderCampoDivindade(f){
  const wrap = el('div',{});
  const fluxo = state._divindadeFluxo;

  if(f.divindade){
    wrap.appendChild(el('div',{},
      el('label',{},'Divindade'),
      el('div',{class:'valor-fixo'}, f.divindade),
      listaPoderesConcedidos(f).length>0 ? el('div',{class:'meta', style:'color:var(--gold);'}, 'Poder'+(listaPoderesConcedidos(f).length>1?'es concedidos: ':' concedido: ')+listaPoderesConcedidos(f).map(pc=>pc.nome).join(', ')) : null,
      el('button',{class:'btn ghost', style:'font-size:0.7rem;padding:5px 8px;margin-top:4px;', onclick:()=>{ state._divindadeFluxo={passo:'escolher'}; render(); }}, 'Trocar divindade')
    ));
  } else {
    wrap.appendChild(el('div',{},
      el('label',{},'Divindade'),
      el('div',{class:'row', style:'align-items:center;gap:8px;'},
        el('div',{class:'valor-fixo', style:'margin-bottom:0;flex:1;color:var(--ink-soft);'}, 'Sem fé'),
        el('button',{class:'btn ghost', style:'width:auto;flex-shrink:0;font-size:0.72rem;padding:8px 14px;', onclick:()=>{ state._divindadeFluxo={passo:'escolher'}; render(); }}, 'Escolher')
      )
    ));
  }

  if(fluxo){
    // O pop-up é renderizado no nível mais alto da tela (renderFichaScreen), não aqui —
    // painéis com transform (hover/foco) criam um novo contexto de posicionamento e
    // "prendem" um position:fixed aninhado dentro deles, escondendo o pop-up atrás de outros painéis.
  }
  return wrap;
}

// Pop-up (modal) com o fluxo de escolher divindade — lista em modo acordeão (toque expande
// um resumo, toque de novo confirma e avança pra tela seguinte).
// Decide se, depois de escolher um poder concedido, precisa pedir um SEGUNDO (Clérigo/Druida/
// Paladino recebem dois) ou se já pode gravar tudo na ficha e fechar o fluxo.
function finalizarEscolhaPoderConcedido(f, deusNome, poderEscolhido, fluxo, numeroAtual, precisaDoSegundo){
  if(precisaDoSegundo && numeroAtual===1){
    state._divindadeFluxo = {passo:'poder', deus:deusNome, numeroPoder:2, poder1:poderEscolhido};
    state._poderExpandido = null;
    render();
    return;
  }
  const poderes = numeroAtual===2 ? [fluxo.poder1, poderEscolhido] : [poderEscolhido];
  f.divindade = deusNome;
  f.poderesConcedidos = poderes.map(p=>({nome:p.nome, deus:deusNome, sub:p.sub||[]}));
  f.poderConcedido = f.poderesConcedidos[0];
  state._divindadeFluxo = null;
  state._poderExpandido = null;
  salvarPerfis();
  flashMsg(numeroAtual===2 ? '✅ Poderes concedidos escolhidos!' : '✅ Poder concedido escolhido!');
  render();
}

function renderPopupDivindade(f, fluxo){
  const overlay = el('div',{class:'menu-overlay', onclick:(e)=>{ if(e.target===e.currentTarget){ state._divindadeFluxo=null; render(); } }});
  const sheet = el('div',{class:'menu-sheet'});

  if(fluxo.passo==='escolher'){
    const classesDevotasAuto = ['Clérigo','Druida','Paladino'];
    const ehClerigo = (f.classesNiveis||[]).some(c=>c.classe==='Clérigo');
    const ehDevotoAuto = (f.classesNiveis||[]).some(c=>classesDevotasAuto.includes(c.classe));
    sheet.appendChild(el('div',{class:'wizard-title', style:'padding:6px 14px 0;'},'Escolha uma divindade'));
    // Kit (15/11/2026): um deus por linha (energia e arma embaixo do nome); tocar abre a gaveta
    // com os devotos e o botão de escolher. Antes, era preciso tocar duas vezes no mesmo nome.
    const listaDeuses = el('div',{style:'padding:0 14px;'});
    DEUSES.forEach(d=>{
      const aberto = state._divindadeExpandida === d.nome;
      listaDeuses.appendChild(kLinha({ic:'⚜', nome:d.nome, detalhe:'energia '+d.energia+' · '+d.arma, sel:aberto, onclick:()=>{ state._divindadeExpandida = aberto ? null : d.nome; render(); }}));
      if(aberto) listaDeuses.appendChild(kGaveta(
        el('div',{}, el('b',{},'Devotos: '), d.devotos),
        el('button',{class:'btn', onclick:()=>{ state._divindadeFluxo = {passo:'confirmar', deus:d.nome}; state._divindadeExpandida = null; render(); }}, 'Escolher '+d.nome)));
    });
    sheet.appendChild(listaDeuses);
    if(ehClerigo){
      const abertoP = state._divindadeExpandida === 'Panteão';
      const itemP = el('button',{class:'menu-item'+(abertoP?' active':''), onclick:()=>{
        if(abertoP){ state._divindadeFluxo={passo:'panteao'}; state._divindadeExpandida=null; }
        else { state._divindadeExpandida = 'Panteão'; }
        render();
      }}, el('span',{class:'ico'},'⚜'), el('span',{}, 'Cultuar o Panteão'));
      sheet.appendChild(itemP);
      if(abertoP){
        sheet.appendChild(el('div',{class:'tip', style:'margin:0 14px 8px;'}, 'Devoção sem deus específico. Sem Poder Concedido. Só não pode usar armas cortantes ou perfurantes. Arma preferida: maça. Escolhe canalizar energia positiva ou negativa, pra sempre.'));
      }
    }
    if(f.divindade && !ehDevotoAuto){
      sheet.appendChild(el('button',{class:'menu-item', style:'color:var(--red-bright);', onclick:()=>{
        if(!confirm('Abandonar a fé em '+f.divindade+' e ficar sem devoção a nenhuma divindade?')) return;
        f.divindade = null;
        f.poderConcedido = null;
        f.poderesConcedidos = [];
        f.panteaoEnergia = null;
        state._divindadeFluxo = null;
        salvarPerfis();
        render();
      }}, el('span',{class:'ico'},'✕'), el('span',{}, 'Virar sem fé (abandonar devoção)')));
    }
    sheet.appendChild(el('button',{class:'menu-close', onclick:()=>{ state._divindadeFluxo=null; state._divindadeExpandida=null; render(); }}, 'Cancelar'));
  } else if(fluxo.passo==='panteao'){
    sheet.appendChild(el('div',{class:'wizard-title', style:'padding:6px 14px 0;'},'Cultuar o Panteão'));
    sheet.appendChild(el('div',{class:'tip', style:'margin:8px 14px;'}, 'Sem Poder Concedido. Não pode usar armas cortantes ou perfurantes. Arma preferida: maça.'));
    sheet.appendChild(el('div',{class:'tip', style:'margin:8px 14px;'}, 'Escolha a energia que canaliza — não pode ser mudada depois.'));
    sheet.appendChild(el('div',{class:'row', style:'margin:8px 14px;'},
      el('button',{class:'btn', onclick:()=>{
        f.divindade = 'Panteão'; f.poderConcedido = null; f.poderesConcedidos = []; f.panteaoEnergia = 'positiva';
        state._divindadeFluxo = null; salvarPerfis(); flashMsg('✅ Agora você cultua o Panteão (energia positiva).'); render();
      }}, 'Energia Positiva'),
      el('button',{class:'btn', onclick:()=>{
        f.divindade = 'Panteão'; f.poderConcedido = null; f.poderesConcedidos = []; f.panteaoEnergia = 'negativa';
        state._divindadeFluxo = null; salvarPerfis(); flashMsg('✅ Agora você cultua o Panteão (energia negativa).'); render();
      }}, 'Energia Negativa')
    ));
    sheet.appendChild(el('button',{class:'menu-close', onclick:()=>{ state._divindadeFluxo={passo:'escolher'}; render(); }}, 'Voltar'));
  } else if(fluxo.passo==='confirmar'){
    const deus = DEUSES.find(d=>d.nome===fluxo.deus);
    sheet.appendChild(el('div',{class:'wizard-title', style:'padding:6px 14px 0;'},'Confirmar: ter fé em '+deus.nome+'?'));
    sheet.appendChild(el('div',{class:'tip', style:'margin:8px 14px;'}, el('b',{},'Devotos típicos'), deus.devotos));
    sheet.appendChild(el('div',{class:'tip', style:'margin:8px 14px;'}, el('b',{},'Obrigações & Restrições'), deus.obrigacoes));
    sheet.appendChild(el('div',{class:'tip', style:'margin:8px 14px;color:var(--red-bright);'}, el('b',{},'Atenção'), 'Se violar as obrigações, perde todos os PM até o próximo dia (ou até fazer penitência, na segunda vez na mesma aventura).'));
    sheet.appendChild(el('div',{class:'row', style:'margin:8px 14px;'},
      el('button',{class:'btn', onclick:()=>{ state._divindadeFluxo={passo:'poder', deus:deus.nome}; render(); }}, 'Sim, tenho fé'),
      el('button',{class:'btn ghost', onclick:()=>{ state._divindadeFluxo={passo:'escolher'}; render(); }}, 'Não, escolher outra')
    ));
  } else if(fluxo.passo==='poder'){
    const deus = DEUSES.find(d=>d.nome===fluxo.deus);
    const classesDoisPoderes = ['Clérigo','Druida','Paladino'];
    const precisaDoSegundo = classesDoisPoderes.some(c=>(f.classesNiveis||[]).some(cn=>cn.classe===c));
    const numeroAtual = fluxo.numeroPoder || 1;
    sheet.appendChild(el('div',{class:'wizard-title', style:'padding:6px 14px 0;'}, (numeroAtual===2?'2º poder':'Poder')+' concedido de '+deus.nome));
    if(numeroAtual===2){
      sheet.appendChild(el('div',{class:'tip', style:'margin:0 14px 8px;font-size:0.78rem;'}, 'Sua classe recebe dois Poderes Concedidos — 1º já escolhido: '+fluxo.poder1.nome+'.'));
    }
    deus.poderes.filter(nomePoder=> numeroAtual!==2 || nomePoder!==fluxo.poder1.nome).forEach(nomePoder=>{
      const info = PODERES_CONCEDIDOS.find(p=>p.nome===nomePoder);
      const aberto = state._poderExpandido === nomePoder;
      const item = el('button',{class:'menu-item'+(aberto?' active':''), onclick:()=>{
        if(aberto){
          const escolhaInfo = PODER_CONCEDIDO_TREINA_PERICIA_ESCOLHA[nomePoder];
          if(escolhaInfo){
            state._divindadeFluxo = {passo:'escolhaPericia', deus:deus.nome, poder:nomePoder, numeroPoder:numeroAtual, poder1:fluxo.poder1};
            state._divindadeEscolhaSub = [];
          } else {
            finalizarEscolhaPoderConcedido(f, deus.nome, {nome:nomePoder}, fluxo, numeroAtual, precisaDoSegundo);
          }
          state._poderExpandido = null;
        } else {
          state._poderExpandido = nomePoder;
        }
        render();
      }},
        el('span',{class:'ico'},'✦'), el('span',{}, nomePoder)
      );
      sheet.appendChild(item);
      if(aberto) sheet.appendChild(el('div',{class:'tip', style:'margin:0 14px 8px;'}, info?info.desc:''));
    });
    sheet.appendChild(el('div',{class:'tip', style:'margin:8px 14px;font-size:0.75rem;'}, 'Toque pra ver a descrição, toque de novo pra confirmar.'));
    sheet.appendChild(el('button',{class:'menu-close', onclick:()=>{ state._divindadeFluxo=null; state._poderExpandido=null; render(); }}, 'Cancelar'));
  } else if(fluxo.passo==='escolhaPericia'){
    const deus = DEUSES.find(d=>d.nome===fluxo.deus);
    const classesDoisPoderes2 = ['Clérigo','Druida','Paladino'];
    const precisaDoSegundo2 = classesDoisPoderes2.some(c=>(f.classesNiveis||[]).some(cn=>cn.classe===c));
    const numeroAtual2 = fluxo.numeroPoder || 1;
    const escolhaInfo = PODER_CONCEDIDO_TREINA_PERICIA_ESCOLHA[fluxo.poder];
    sheet.appendChild(el('div',{class:'wizard-title', style:'padding:6px 14px 0;'}, escolhaInfo.label));
    if(!state._divindadeEscolhaSub) state._divindadeEscolhaSub = [];
    const subGrid = el('div',{class:'option-grid', style:'margin:8px 14px;'});
    PERICIAS.filter(p=> p.attr===escolhaInfo.filtroAttr).forEach(p=>{
      const marcado = state._divindadeEscolhaSub.includes(p.nome);
      subGrid.appendChild(el('button',{class:'option-card '+(marcado?'selected':''), onclick:()=>{
        if(marcado){ state._divindadeEscolhaSub = state._divindadeEscolhaSub.filter(x=>x!==p.nome); }
        else if(state._divindadeEscolhaSub.length < escolhaInfo.quantidade){ state._divindadeEscolhaSub = [...state._divindadeEscolhaSub, p.nome]; }
        render();
      }}, el('div',{class:'opt-nome'}, p.nome)));
    });
    sheet.appendChild(subGrid);
    sheet.appendChild(el('div',{class:'tip', style:'margin:0 14px 8px;font-size:0.75rem;'}, state._divindadeEscolhaSub.length+' / '+escolhaInfo.quantidade+' escolhidas'));
    const completo = state._divindadeEscolhaSub.length === escolhaInfo.quantidade;
    sheet.appendChild(el('button',{class:'btn', style: 'margin:0 14px 8px; ' + (completo?'':'opacity:0.5;'), onclick:()=>{
      if(!completo) return;
      finalizarEscolhaPoderConcedido(f, deus.nome, {nome:fluxo.poder, sub:state._divindadeEscolhaSub.slice()}, fluxo, numeroAtual2, precisaDoSegundo2);
      state._divindadeEscolhaSub = null;
    }}, 'Confirmar'));
    sheet.appendChild(el('button',{class:'menu-close', onclick:()=>{ state._divindadeFluxo=null; state._poderExpandido=null; state._divindadeEscolhaSub=null; render(); }}, 'Cancelar'));
  }
  overlay.appendChild(sheet);
  return overlay;
}

// ---- Painel de Parceiros (Notas) ----
function abrirAdicionarParceiro(){
  state._adicionarParceiroPopup = {categoria:null, tipoEscolhido:null, nome:'', origem:'', poder:'iniciante', periciasEscolhidas:[]};
  render();
}

function renderPopupAdicionarParceiro(f){
  const fluxo = state._adicionarParceiroPopup;
  const overlay = el('div',{class:'menu-overlay', onclick:(e)=>{ if(e.target===e.currentTarget){ state._adicionarParceiroPopup=null; render(); } }});
  const sheet = el('div',{class:'menu-sheet'});
  sheet.appendChild(el('div',{class:'wizard-title', style:'padding:6px 14px 0;'}, '🐾 Adicionar Parceiro'));
  // Kit (15/11/2026): passos no alto (Tipo de ajuda · Qual · Detalhes) e escolhas em linhas.
  const passoParceiro = !fluxo.categoria ? 'cat' : !fluxo.tipoEscolhido ? 'tipo' : 'det';
  sheet.appendChild(el('div',{style:'padding:6px 14px 0;'}, kSeg([
    {id:'cat', rot:'Tipo de ajuda', feito: !!fluxo.categoria},
    {id:'tipo', rot:'Qual', feito: !!fluxo.tipoEscolhido, desativado: !fluxo.categoria},
    {id:'det', rot:'Detalhes', desativado: !fluxo.tipoEscolhido}], passoParceiro, (id)=>{
      if(id==='cat'){ fluxo.categoria = null; fluxo.tipoEscolhido = null; fluxo.busca = ''; }
      if(id==='tipo'){ fluxo.tipoEscolhido = null; }
      render(); })));

  if(!fluxo.categoria){
    sheet.appendChild(el('div',{class:'tip', style:'margin:6px 14px;'}, 'É um bicho/NPC genérico (escolhe um TIPO de ajuda), uma montaria específica do livro básico, ou uma criatura específica de Ameaças de Arton (bestiário)?'));
    sheet.appendChild(el('div',{style:'padding:0 14px;'},
      kLinha({ic:'⚔️', nome:'Tipo genérico', detalhe:'Guardião, Combatente, Adepto, Médico…', onclick:()=>{ fluxo.categoria='generico'; render(); }}),
      kLinha({ic:'🐎', nome:'Montaria', detalhe:'Cavalo, Grifo, Lobo…', onclick:()=>{ fluxo.categoria='montaria'; render(); }}),
      kLinha({ic:'🐻', nome:'Criatura de Ameaças de Arton', detalhe:'Urso das neves e outras', onclick:()=>{ fluxo.categoria='ameacas'; render(); }})
    ));
  } else if(!fluxo.tipoEscolhido){
    const lista = fluxo.categoria==='generico' ? PARCEIRO_TIPOS : fluxo.categoria==='montaria' ? MONTARIA_TIPOS_ESPECIFICOS : PARCEIROS_AMEACAS_ARTON;
    sheet.appendChild(el('div',{class:'tip', style:'margin:6px 14px;'}, fluxo.categoria==='ameacas' ? 'Escolha a criatura (texto de referência — o efeito varia demais entre elas pra automatizar sozinho; anote e aplique na mesa):' : 'Escolha o tipo:'));
    sheet.appendChild(el('input',{id:'parceiro-busca-ameacas', type:'text', placeholder:'buscar...', style:'margin:0 14px 8px;width:calc(100% - 28px);', value:fluxo.busca||'', oninput:(e)=>{fluxo.busca=e.target.value; renderDebounced();}}));
    const grid = el('div',{style:'padding:0 14px;display:flex;flex-direction:column;gap:6px;max-height:400px;overflow-y:auto;'});
    const listaFiltrada = lista.filter(t=> !fluxo.busca || t.nome.toLowerCase().includes(fluxo.busca.toLowerCase()));
    listaFiltrada.forEach(t=>{
      grid.appendChild(el('button',{class:'option-card', style:'text-align:left;', onclick:()=>{ fluxo.tipoEscolhido=t.nome; render(); }},
        el('div',{class:'opt-nome'}, t.nome+(t.tamanho?' ('+t.tamanho+')':'')+(t.ehMontaria?' 🐴':'')),
        el('div',{class:'opt-sub'}, t.descCurta||t.obs||t.tipoNarrativo||'')
      ));
    });
    sheet.appendChild(grid);
  } else {
    const lista = fluxo.categoria==='generico' ? PARCEIRO_TIPOS : fluxo.categoria==='montaria' ? MONTARIA_TIPOS_ESPECIFICOS : PARCEIROS_AMEACAS_ARTON;
    const infoTipo = lista.find(t=>t.nome===fluxo.tipoEscolhido);
    sheet.appendChild(el('div',{class:'tip', style:'margin:6px 14px;'},
      el('b',{}, fluxo.tipoEscolhido), ' — ', infoTipo.niveis[fluxo.poder]
    ));
    sheet.appendChild(el('div',{style:'padding:0 14px;display:flex;flex-direction:column;gap:8px;'},
      el('div',{},
        el('label',{},'Nome do parceiro'),
        el('input',{id:'parceiro-nome', type:'text', placeholder:'ex: Rex', value:fluxo.nome, oninput:(e)=>{fluxo.nome=e.target.value;}})
      ),
      el('div',{},
        el('label',{},'Origem (opcional — de onde ele veio)'),
        el('input',{id:'parceiro-origem', type:'text', placeholder:'ex: Poder Companheiro Animal, recompensa de missão...', value:fluxo.origem, oninput:(e)=>{fluxo.origem=e.target.value;}})
      ),
      el('div',{},
        el('label',{},'Nível de poder'),
        kSeg([{id:'iniciante', rot:'Iniciante'}, {id:'veterano', rot:'Veterano'}, {id:'mestre', rot:'Mestre'}], fluxo.poder, (nivel)=>{ fluxo.poder = nivel; render(); })
      )
    ));
    if(fluxo.tipoEscolhido==='Ajudante'){
      const maxPericias = fluxo.poder==='iniciante' ? 2 : 3;
      sheet.appendChild(el('div',{style:'padding:0 14px;margin-top:8px;'},
        el('label',{},'Quais perícias ele ajuda (até '+maxPericias+', não pode ser Luta/Pontaria)'),
        el('input',{id:'parceiro-pericias', type:'text', placeholder:'ex: Diplomacia, Intuição', value:(fluxo.periciasEscolhidas||[]).join(', '), oninput:(e)=>{ fluxo.periciasEscolhidasTxt=e.target.value; }, onchange:(e)=>{
          fluxo.periciasEscolhidas = e.target.value.split(',').map(s=>s.trim()).filter(Boolean).slice(0,maxPericias);
        }})
      ));
    }
    sheet.appendChild(el('button',{class:'btn', style:'margin:14px 14px 0;width:calc(100% - 28px);', onclick:()=>{
      if(!fluxo.nome.trim()){ flashMsg('Dá um nome pro parceiro primeiro.'); return; }
      const infoAmeacas = fluxo.categoria==='ameacas' ? PARCEIROS_AMEACAS_ARTON.find(t=>t.nome===fluxo.tipoEscolhido) : null;
      const dados = {
        nome: fluxo.nome.trim(),
        tipo: fluxo.categoria==='generico' ? fluxo.tipoEscolhido : fluxo.categoria==='montaria' ? 'Montaria' : (infoAmeacas.ehMontaria ? 'Montaria' : 'Ameaças de Arton'),
        ehMontaria: fluxo.categoria==='montaria' || (infoAmeacas && infoAmeacas.ehMontaria),
        tipoMontaria: fluxo.categoria==='montaria' ? fluxo.tipoEscolhido : (infoAmeacas && infoAmeacas.ehMontaria ? fluxo.tipoEscolhido : null),
        fonteAmeacasArton: fluxo.categoria==='ameacas' ? fluxo.tipoEscolhido : null,
        poder: fluxo.poder,
        origem: fluxo.origem.trim(),
        montadoAgora: false,
        periciasEscolhidas: fluxo.tipoEscolhido==='Ajudante' ? (fluxo.periciasEscolhidas||[]) : undefined,
      };
      const ok = adicionarParceiro(f, dados);
      if(ok){
        flashMsg('🐾 "'+dados.nome+'" adicionado!');
        state._adicionarParceiroPopup = null;
        render();
      }
    }}, '✓ Adicionar Parceiro'));
  }
  sheet.appendChild(el('button',{class:'menu-close', style:'margin-top:14px;', onclick:()=>{ state._adicionarParceiroPopup=null; render(); }}, 'Cancelar'));
  overlay.appendChild(sheet);
  return overlay;
}

function abrirConstrutorGolpePessoal(indicePoderesClasse){
  const f = fichaAtual();
  const row = f.poderesClasse[indicePoderesClasse];
  if(!row) return;
  const atual = row.golpeConstruido || {nomeGolpe:'', arma:'', escolhas:{}};
  state._golpePessoalPopup = {indicePoderesClasse, nomeGolpe:atual.nomeGolpe||'', arma:atual.arma||'', escolhas:Object.assign({}, atual.escolhas||{})};
  render();
}

function renderPopupGolpePessoal(f){
  const fluxo = state._golpePessoalPopup;
  const overlay = el('div',{class:'menu-overlay', onclick:(e)=>{ if(e.target===e.currentTarget){ state._golpePessoalPopup=null; render(); } }});
  const sheet = el('div',{class:'menu-sheet'});
  sheet.appendChild(el('div',{class:'wizard-title', style:'padding:6px 14px 0;'}, '🔨 Construir Golpe Pessoal'));
  sheet.appendChild(el('div',{class:'tip', style:'margin:6px 14px;'}, 'Escolha os efeitos — o custo total (mínimo 1 PM) já soma sozinho. Dá pra reconstruir esse golpe quando quiser, não só ao subir de nível (a regra oficial só menciona subir de nível, mas deixar sempre editável evita ficha travada por causa de um pré-requisito de sessão que já passou).'));

  const camposBasicos = el('div',{style:'padding:0 14px;display:flex;flex-direction:column;gap:8px;'},
    el('div',{},
      el('label',{},'Nome do golpe (opcional, ajuda a diferenciar se tiver mais de um)'),
      el('input',{id:'golpe-pessoal-nome', type:'text', placeholder:'ex: Investida do Trovão', value:fluxo.nomeGolpe, oninput:(e)=>{fluxo.nomeGolpe=e.target.value;}})
    ),
    el('div',{},
      el('label',{},'Arma usada (deixa travado nela, a menos que escolha "Qualquer Arma" abaixo)'),
      el('input',{id:'golpe-pessoal-arma', type:'text', placeholder:'ex: Espada longa', value:fluxo.arma, oninput:(e)=>{fluxo.arma=e.target.value;}})
    )
  );
  sheet.appendChild(camposBasicos);

  const custoTotal = calcularCustoGolpePessoal(fluxo.escolhas);
  sheet.appendChild(el('div',{class:'custo-golpe'}, 'Custo total ', el('b',{}, custoTotal+' PM'))); // fica fixo no alto da lista

  const listaEfeitos = el('div',{style:'padding:0 14px;display:flex;flex-direction:column;gap:6px;max-height:340px;overflow-y:auto;'});
  EFEITOS_GOLPE_PESSOAL.forEach(ef=>{
    const qtdAtual = fluxo.escolhas[ef.nome]||0;
    const marcado = qtdAtual>0;
    const limiteMax = ef.maxVezes || (ef.repetivel ? 5 : 1);
    const linha = el('div',{class:'option-card'+(marcado?' selected':''), style:'padding:8px 10px;cursor:pointer;', onclick:()=>{
      fluxo.escolhas[ef.nome] = marcado ? 0 : 1; // primeiro toque liga/desliga; ajuste fino pelos botões +/-
      render();
    }},
      el('div',{class:'row', style:'align-items:center;'},
        el('div',{style:'flex:1;'},
          el('div',{class:'opt-nome'}, ef.nome, el('span',{class:'custo-efeito'}, ' '+(ef.custo>=0?'+':'')+ef.custo+' PM'+(ef.custoVariavel?' + magia':''))),
          el('div',{class:'opt-sub'}, ef.desc)
        ),
        (ef.repetivel || ef.maxVezes) && marcado ? el('span',{class:'qtd-step', onclick:(e)=>e.stopPropagation()},
          el('button',{'aria-label':'menos uma vez', onclick:()=>{ fluxo.escolhas[ef.nome]=Math.max(1, qtdAtual-1); render(); }}, '−'),
          el('b',{class:'num'}, '×'+qtdAtual),
          el('button',{'aria-label':'mais uma vez', onclick:()=>{ fluxo.escolhas[ef.nome]=Math.min(limiteMax, qtdAtual+1); render(); }}, '+')
        ) : null
      )
    );
    listaEfeitos.appendChild(linha);
  });
  sheet.appendChild(listaEfeitos);

  sheet.appendChild(el('button',{class:'btn', style:'margin:14px 14px 0;width:calc(100% - 28px);', onclick:()=>{
    if(!fluxo.arma.trim() && !(fluxo.escolhas['Qualquer Arma']>0)){ flashMsg('Diz qual arma esse golpe usa, ou escolhe o efeito "Qualquer Arma".'); return; }
    const row = f.poderesClasse[fluxo.indicePoderesClasse];
    if(!row){ state._golpePessoalPopup=null; render(); return; }
    row.golpeConstruido = {nomeGolpe:fluxo.nomeGolpe.trim(), arma:fluxo.arma.trim()||'Qualquer arma', escolhas:Object.assign({}, fluxo.escolhas)};
    registrarLog(f, 'Construiu o Golpe Pessoal'+(row.golpeConstruido.nomeGolpe?' "'+row.golpeConstruido.nomeGolpe+'"':'')+' ('+calcularCustoGolpePessoal(fluxo.escolhas)+' PM)');
    salvarPerfis();
    flashMsg('🔨 Golpe Pessoal salvo!');
    state._golpePessoalPopup = null;
    render();
  }}, '✓ Salvar Golpe Pessoal'));
  sheet.appendChild(el('button',{class:'menu-close', style:'margin-top:10px;', onclick:()=>{ state._golpePessoalPopup=null; render(); }}, 'Cancelar'));
  overlay.appendChild(sheet);
  return overlay;
}
