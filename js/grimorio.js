// Minhas magias, memorização do Mago e o grimório para aprender.
// Separado do js/ficha.js em 15/11/2026 (item 6 da revisão geral), sem mudar o código.

function renderPersonagemMagias(){
  const wrap = el('div',{});
  const f = fichaAtual();
  const magPanel = el('div',{class:'panel faixa'}, el('h2',{},'Minhas Magias'));
  const attrChave = atributoChaveMagia(f);
  if(attrChave){
    // Uma linha só (2A): CD, atributo-chave e a mana de agora; o "+" leva ao grimório completo.
    magPanel.appendChild(el('div',{class:'topo-magias'},
      el('span',{}, el('b',{}, 'CD '+cdMagias(f)), ' · '+NOME_ATRIBUTO[attrChave]+' '+(valorAtributoChaveMagia(f)>=0?'+':'')+valorAtributoChaveMagia(f)),
      el('span',{class:'pm-agora'}, (parseInt(f.pmatual)||0)+'/'+pmMaxEfetivo(f)+' PM'),
      el('button',{class:'link-editar-item', onclick:()=>{ state.tab = 'magias'; render(); try{ window.scrollTo(0,0); }catch(e){} }}, '+ aprender')));
  } else {
    magPanel.appendChild(el('div',{class:'tip'}, el('b',{},'Sem classe conjuradora'), 'Esse personagem ainda não tem uma classe que lança magias.'));
  }

  // Liturgia Mágica (Clérigo): gasta ação de movimento na mesa pra ativar; a CD da PRÓXIMA
  // habilidade (não uma fixa) sobe +2. Como o app não acompanha turno a turno, vira um
  // interruptor manual — o jogador liga depois de fazer a ação na mesa, e o popup de Usar Magia
  // consome sozinho (desliga automaticamente) na próxima vez que usar uma magia.
  if(nomesPoderesConhecidos(f).includes('Liturgia Mágica')){
    magPanel.appendChild(el('div',{class:'row', style:'align-items:center;margin-top:8px;padding:8px;border-radius:var(--radius-sm);background:'+(f._liturgiaMagicaAtiva?'rgba(216,189,116,0.12)':'transparent')+';border:1px solid '+(f._liturgiaMagicaAtiva?'var(--gold)':'var(--line)')+';'},
      el('div',{style:'flex:1;'},
        el('div',{style:'font-weight:700;'+(f._liturgiaMagicaAtiva?'color:var(--gold);':'')}, f._liturgiaMagicaAtiva ? '✓ Liturgia Mágica ativa' : 'Liturgia Mágica'),
        el('div',{class:'meta'}, 'Fez a ação na mesa? Liga aqui — a próxima magia usada já ganha +2 CD sozinha.')
      ),
      el('button',{class:'btn ghost', style:'width:auto;flex-shrink:0;', onclick:()=>{ f._liturgiaMagicaAtiva = !f._liturgiaMagicaAtiva; salvarPerfis(); render(); }}, f._liturgiaMagicaAtiva ? 'Desligar' : 'Ligar')
    ));
  }

  const ccArc = (f.classesNiveis||[]).find(c=>c.classe==='Arcanista');
  if(ccArc && f.arcanistaCaminho){
    const esperadas = magiasArcanistaEsperadas(f.arcanistaCaminho, ccArc.nivel);
    const acimaDoEsperado = f.magias.length > esperadas;
    magPanel.appendChild(el('div',{class:'meta', style:'margin-bottom:8px;'+(acimaDoEsperado?'color:var(--gold);':'')},
      f.magias.length+' de '+esperadas+' magias de '+f.arcanistaCaminho+' até aqui'
      + (acimaDoEsperado ? ' (acima do ritmo normal: confira com o Mestre)' : '')
    ));
  }

  if(f.magias.length===0){
    magPanel.appendChild(el('div',{class:'empty'},'Nenhuma magia adicionada ainda. Vá no Menu → Magias pra buscar e adicionar.'));
  } else {
    magPanel.appendChild(renderGrimorioCartas(f, (s, idx)=>{
      if(!confirm('Remover "'+s.n+'" das suas magias conhecidas? Não tem como desfazer.')) return;
      registrarLog(f, 'Esqueceu a magia: '+s.n);
      f.magias.splice(idx,1);
      state._cartaMagiaAberta = null;
      salvarPerfis();
      render();
    }));
  }
  wrap.appendChild(magPanel);

  if(f.arcanistaCaminho==='Mago' && f.magias.length>0){
    wrap.appendChild(renderPainelMemorizacaoMago(f));
  }

  return wrap;
}

// Mago só pode lançar magias memorizadas — estuda o grimório por 1h e escolhe metade das que
// conhece (arredondado pra baixo). Aqui é só a escolha de QUAIS ficam memorizadas; o "estudar
// por 1h, 1x por dia" fica por conta da narrativa na mesa, como o resto do controle de tempo.
function renderPainelMemorizacaoMago(f){
  const limite = Math.floor(f.magias.length/2);
  const wrap = el('div',{class:'panel faixa'}, el('h2',{},'Memorizar Magias (Mago)'));
  if(!state._memorizandoMago){
    const qtdMemorizada = (f.magiasMemorizadas||[]).length;
    wrap.appendChild(el('div',{class:'tip'}, 'Memorizadas agora: '+qtdMemorizada+' / '+limite+'. Só magias memorizadas podem ser lançadas — estude o grimório por 1h (1x por dia) pra trocar.'));
    wrap.appendChild(el('button',{class:'btn ghost', onclick:()=>{ state._memorizandoMago = (f.magiasMemorizadas||[]).slice(); render(); }}, '📖 Estudar grimório e memorizar'));
  } else {
    const selecao = state._memorizandoMago;
    wrap.appendChild(el('div',{class:'tip'}, 'Escolha até '+limite+' magias (metade das '+f.magias.length+' conhecidas, arredondado pra baixo). Selecionadas: '+selecao.length+' / '+limite+'.'));
    const grid = el('div',{class:'option-grid'});
    f.magias.forEach(s=>{
      const marcada = selecao.includes(s.n);
      grid.appendChild(el('button',{class:'option-card'+(marcada?' selected':''), onclick:()=>{
        if(marcada){ state._memorizandoMago = selecao.filter(n=>n!==s.n); }
        else if(selecao.length < limite){ selecao.push(s.n); }
        else { flashMsg('Já escolheu o limite de '+limite+' magias.'); return; }
        render();
      }},
        el('div',{class:'opt-nome'}, s.n),
        el('div',{class:'opt-sub'}, s.c+'º círc. · '+s.e)
      ));
    });
    wrap.appendChild(grid);
    wrap.appendChild(el('div',{class:'row', style:'margin-top:10px;'},
      el('button',{class:'btn', onclick:()=>{ f.magiasMemorizadas = selecao; state._memorizandoMago=null; salvarPerfis(); flashMsg('📖 Magias memorizadas atualizadas!'); render(); }}, 'Confirmar memorização'),
      el('button',{class:'btn ghost', onclick:()=>{ state._memorizandoMago=null; render(); }}, 'Cancelar')
    ));
  }
  return wrap;
}

function renderMagias(){
  const wrap = el('div',{});
  const mf = state.magiaFiltro;
  const f = fichaAtual();

  const cc = classeConjuradora(f);
  const circuloMax = circuloMaximoDisponivel(f);

  if(!cc){
    wrap.appendChild(renderSecaoNotasColapsavel('magias-sem-classe', '📖', 'Sem Classe Conjuradora', null, ()=>[
      el('div',{class:'tip'}, 'Nenhuma das classes de '+f.nome+' lança magias pela progressão normal (Arcanista, Bardo, Clérigo, Druida). Se ganhou magias por um poder específico (ex: Orar do Paladino), consulte a descrição desse poder. Mesmo assim, você pode navegar pelo catálogo completo abaixo por curiosidade ou pra referência do mestre.')
    ], false));
  } else if(!mf._tradAjustada){
    // na primeira vez que abre a aba, ajusta automaticamente pra tradição real da classe do personagem
    mf.trad = CLASSES[cc.classe].tradicao;
    mf._tradAjustada = true;
    mf.modo = 'possiveis';
  }

  wrap.appendChild(renderSecaoNotasColapsavel('magias-como-funciona', 'ℹ️', 'Como Funciona', null, ()=>[
    el('div',{class:'tip'}, 'Cada magia pertence a uma tradição (arcana ou divina — 🔮 marca as Universais, que qualquer conjurador pode aprender), um círculo e uma escola. Toque no nome de uma magia pra ver a descrição completa.')
  ], false));

  const modoAtual = mf.modo || 'possiveis';

  // No modo "só as que posso lançar", a tradição não é escolha livre — é a da classe do
  // personagem. Trava aqui (não só na primeira abertura da aba) pra não deixar, por exemplo,
  // um Clérigo ver/adicionar magias Arcanas só porque tocou no botão errado antes de trocar de modo.
  if(cc && modoAtual==='possiveis'){
    mf.trad = CLASSES[cc.classe].tradicao;
  }

  if(modoAtual==='completo' || !cc){
    wrap.appendChild(el('div',{class:'badge-tradition'},
      el('button',{class: mf.trad==='arcana'?'on':'', onclick:()=>{mf.trad='arcana'; render();}},'Arcanas'),
      el('button',{class: mf.trad==='divina'?'on':'', onclick:()=>{mf.trad='divina'; render();}},'Divinas'),
    ));
  } else {
    wrap.appendChild(el('div',{class:'meta', style:'margin-top:8px;'}, 'Tradição: '+(mf.trad==='arcana'?'Arcana':'Divina')+' (definida pela sua classe — pra ver a outra tradição, use "Catálogo completo").'));
  }

  if(cc){
    wrap.appendChild(el('div',{class:'badge-tradition', style:'margin-top:8px;'},
      el('button',{class: modoAtual==='possiveis'?'on':'', onclick:()=>{mf.modo='possiveis'; mf.circulo='todos'; render();}}, 'Só as que posso lançar'),
      el('button',{class: modoAtual==='completo'?'on':'', onclick:()=>{mf.modo='completo'; mf.circulo='todos'; render();}}, 'Catálogo completo'),
    ));
    if(modoAtual==='possiveis'){
      wrap.appendChild(el('div',{class:'meta', style:'font-size:0.72rem;margin-top:4px;'}, 'Até '+circuloMax+'º círculo — nível '+cc.nivel+' de '+cc.classe+'.'));
      if(['Bardo','Druida'].includes(cc.classe) && f.escolasMagia && f.escolasMagia.length>0){
        wrap.appendChild(el('div',{class:'meta', style:'font-size:0.72rem;'}, 'Suas 3 escolas: '+f.escolasMagia.join(', ')+'.'));
      }
    }
  }

  const filters = el('div',{class:'filters'});
  const circSel = el('select',{onchange:(e)=>{mf.circulo=e.target.value; render();}});
  const somenteConjuravel = cc && modoAtual==='possiveis';
  ['todos','1','2','3','4','5'].forEach(c=>{
    if(somenteConjuravel && c!=='todos' && parseInt(c)>circuloMax) return; // nem mostra opção de círculo que ainda não existe
    circSel.appendChild(el('option',{value:c, selected: mf.circulo===c}, c==='todos'?'Todos os círculos':c+'º círculo'));
  });
  filters.appendChild(circSel);
  const escSel = el('select',{onchange:(e)=>{mf.escola=e.target.value; render();}});
  escSel.appendChild(el('option',{value:'todas'},'Todas as escolas'));
  Object.keys(ESCOLAS).forEach(e=> escSel.appendChild(el('option',{value:e, selected: mf.escola===e}, e)));
  filters.appendChild(escSel);
  wrap.appendChild(filters);

  wrap.appendChild(el('input',{id:'busca-magias', type:'text', placeholder:'buscar magia pelo nome...', value:mf.busca, oninput:(e)=>{mf.busca=e.target.value; renderDebounced();}}));

  if(mf.escola !== 'todas'){
    wrap.appendChild(el('div',{class:'tip'}, el('b',{}, mf.escola), ESCOLAS[mf.escola]));
  }

  let list = magiasPorTradicao(mf.trad);
  if(somenteConjuravel) list = list.filter(s=>s.c<=circuloMax);
  if(somenteConjuravel && cc && ['Bardo','Druida'].includes(cc.classe) && f.escolasMagia && f.escolasMagia.length>0){
    list = list.filter(s=> f.escolasMagia.includes(s.e));
  }
  if(mf.circulo!=='todos') list = list.filter(s=>s.c===parseInt(mf.circulo));
  if(mf.escola!=='todas') list = list.filter(s=>s.e===mf.escola);
  if(mf.busca) list = list.filter(s=>s.n.toLowerCase().includes(mf.busca.toLowerCase()));
  list = list.slice().sort((a,b)=> a.c-b.c || a.n.localeCompare(b.n));

  const results = el('div',{});
  if(list.length===0){
    results.appendChild(el('div',{class:'empty'},'Nenhuma magia encontrada com esses filtros.'));
  } else {
    let ultimoCirculo = null;
    list.forEach(s=>{
      if(mf.circulo==='todos' && s.c!==ultimoCirculo){
        ultimoCirculo = s.c;
        results.appendChild(el('div',{class:'lista-secao-titulo'}, s.c+'º Círculo'));
      }
      results.appendChild(renderCardMagia(s, 'lista', ()=>addMagiaFicha(s, mf.trad)));
    });
  }
  wrap.appendChild(results);
  return wrap;
}
