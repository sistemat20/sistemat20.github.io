// Janelas de envio e de apoio: Enviar item, Enviar dinheiro, Moeda, Mapa, Efeito de item e Perfil de jogador.
// Separado do js/ficha.js em 15/11/2026 (item 6 da revisão geral), sem mudar o código.

// ---- Enviar item pra outro personagem (não precisa ser o Mestre) ----
function abrirEnviarItem(idx){
  state._enviarItemFluxo = {idx, lista:null, carregando:true, enviando:false};
  render();
  const f = fichaAtual();
  listaLeveDeTodosPersonagens().then(lista=>{
    if(!state._enviarItemFluxo) return; // o jogador já cancelou antes da lista chegar
    state._enviarItemFluxo.lista = lista.filter(p=>p.id!==f.id);
    state._enviarItemFluxo.carregando = false;
    render();
  });
}

// Kit (15/11/2026): escolher para quem (avatar seleciona, não envia), quantas unidades (teclas)
// e confirmar num botão que diz o que vai acontecer. Antes, tocar no avatar já enviava tudo.
function renderPopupEnviarItem(f){
  const fluxo = state._enviarItemFluxo;
  const fechar = ()=>{ if(!fluxo.enviando){ state._enviarItemFluxo = null; render(); } };
  const overlay = el('div',{class:'menu-overlay', onclick:(e)=>{ if(e.target===e.currentTarget) fechar(); }});
  const sheet = el('div',{class:'menu-sheet janela-kit'});
  const row = f.equip[fluxo.idx];
  if(!row){
    sheet.appendChild(el('div',{class:'empty'}, 'Esse item não existe mais na sua mochila.'));
    sheet.appendChild(el('button',{class:'btn ghost', onclick:fechar}, 'Fechar'));
    overlay.appendChild(sheet);
    return overlay;
  }
  const nome = separarPresente(row.item).base;
  const total = /^\d+$/.test(String(row.qtd).trim()) ? parseInt(row.qtd) : 1;
  if(fluxo.qtd==null) fluxo.qtd = total===1 ? 1 : null;
  sheet.appendChild(el('div',{class:'wizard-title'}, 'Enviar item'));
  sheet.appendChild(kLinha({ic:'📦', nome, detalhe: total>1 ? 'você tem '+total : 'você tem 1', valor: total>1 ? '×'+total : '', sel:true}));
  if(fluxo.enviando) sheet.appendChild(el('div',{class:'empty'}, 'Enviando...'));
  else if(fluxo.carregando) sheet.appendChild(el('div',{class:'empty'}, 'Carregando os aliados...'));
  else if(!fluxo.lista || !fluxo.lista.length) sheet.appendChild(el('div',{class:'empty'}, 'Nenhum outro personagem encontrado.'));
  else {
    sheet.appendChild(el('div',{class:'k-rot'}, 'Para quem'));
    sheet.appendChild(renderAvataresSelecionaveis(fluxo.lista, fluxo.destinoId, (p)=>{ fluxo.destinoId = p.id; render(); }));
    if(total>1){
      sheet.appendChild(el('div',{class:'k-rot'}, 'Quantas'));
      const teclas = Array.from({length: Math.min(total, 12)}, (_,k)=> k+1);
      sheet.appendChild(el('div',{class:'teclas'}, teclas.map(n=> el('button',{class: fluxo.qtd===n ? 'on' : '', onclick:()=>{ fluxo.qtd = n; render(); }}, String(n))),
        total>12 ? el('button',{class: fluxo.qtd===total ? 'on' : '', onclick:()=>{ fluxo.qtd = total; render(); }}, 'todas') : null));
    }
  }
  const destino = (fluxo.lista||[]).find(p=> p.id===fluxo.destinoId);
  const pronto = destino && fluxo.qtd && !fluxo.enviando;
  sheet.appendChild(el('div',{class:'duo', style:'margin-top:12px;'},
    el('button',{class:'btn ghost', onclick:fechar}, 'Cancelar'),
    el('button',{class:'btn', disabled: !pronto, onclick: async ()=>{
      const n = fluxo.qtd;
      fluxo.enviando = true; render();
      const itemEnviado = Object.assign({}, row, {qtd: String(n), item: row.item+' (recebido de '+(f.nome||'alguém')+')'});
      delete itemEnviado.vestido;
      const resultado = await enviarItemParaOutroPersonagem(destino.id, itemEnviado);
      if(resultado.ok){
        animarPresente(nome, destino);
        if(n < total) row.qtd = String(total - n);
        else removerItemMochila(f, fluxo.idx);
        // Grava as fichas do próprio jogador pelo salvamento normal (com a proteção de
        // presentes); a do destino o servidor já alterou no envio.
        if(usandoSupabase()) await salvarPerfis();
        else await mestreAtualizarPersonagem(f);
        flashMsg('📤 '+(n>1 ? n+' × ' : '')+nome+' enviado para '+(resultado.nomeDestino||destino.nome)+'!');
        state._enviarItemFluxo = null;
      } else {
        flashMsg('⚠ Não consegui enviar agora. Tente de novo em instantes.');
        fluxo.enviando = false;
      }
      render();
    }}, pronto ? 'Enviar '+(fluxo.qtd>1 ? fluxo.qtd+' ' : '')+'para '+destino.nome : (destino ? 'Escolha quantas' : 'Escolha para quem'))));
  overlay.appendChild(sheet);
  return overlay;
}

// Popup que abre ao tocar numa das 3 caixas de moeda — "Receber" no topo (soma uma quantidade
// e já salva na hora, sem precisar editar um campo solto e torcer pra ter salvado) e "Enviar
// dinheiro" embaixo (abre o fluxo de escolher destinatário, já com essa moeda pré-selecionada).
function renderPopupMoeda(f){
  const campo = state._moedaPopup.campo;
  const rotulo = {tc:'TC (cobre)', ts:'T$ (padrão)', to:'TO (ouro)'}[campo];
  if(!state._moedaPopup.valor) state._moedaPopup.valor = '';
  const overlay = el('div',{class:'menu-overlay', onclick:(e)=>{ if(e.target===e.currentTarget){ state._moedaPopup=null; render(); } }});
  const sheet = el('div',{class:'menu-sheet'});
  sheet.appendChild(el('div',{class:'wizard-title', style:'padding:6px 14px 0;'}, rotulo));
  sheet.appendChild(el('div',{class:'tip', style:'margin:6px 14px;'}, 'Você tem: '+(parseInt(f[campo])||0)+' '+rotulo));
  // Receber e Gastar compartilham o MESMO campo de quantidade — digita um número, escolhe o
  // botão certo, em vez de dois campos separados um embaixo do outro.
  sheet.appendChild(el('div',{style:'padding:0 14px;'},
    el('label',{},'Quantidade'),
    el('input',{type:'number', value:state._moedaPopup.valor, oninput:(e)=>{state._moedaPopup.valor=e.target.value;}})
  ));
  sheet.appendChild(el('div',{class:'row', style:'padding:8px 14px 0;gap:8px;'},
    el('button',{class:'btn', style:'flex:1;', onclick:()=>{
      const valor = parseInt(state._moedaPopup.valor);
      if(!valor || valor<=0){ flashMsg('Digita uma quantidade válida primeiro.'); return; }
      f[campo] = (parseInt(f[campo])||0) + valor;
      registrarLog(f, 'Recebeu '+valor+' '+rotulo);
      salvarPerfis();
      flashMsg('✅ +'+valor+' '+rotulo+'!');
      state._moedaPopup = null;
      render();
    }}, '✓ Receber'),
    // Gastar/retirar — pra comprar algo, pagar uma taxa, perder dinheiro etc, sem precisar
    // passar pelo fluxo de "Enviar" (que exige escolher outro jogador como destinatário, não
    // serve pra um gasto simples). Achado reportado: faltava essa opção.
    el('button',{class:'btn ghost', style:'flex:1;', onclick:()=>{
      const valor = parseInt(state._moedaPopup.valor);
      if(!valor || valor<=0){ flashMsg('Digita uma quantidade válida primeiro.'); return; }
      const atual = parseInt(f[campo])||0;
      if(valor > atual){ flashMsg('Você não tem '+valor+' '+rotulo+' (tem só '+atual+').'); return; }
      f[campo] = atual - valor;
      registrarLog(f, 'Gastou '+valor+' '+rotulo);
      salvarPerfis();
      flashMsg('💸 −'+valor+' '+rotulo+'.');
      state._moedaPopup = null;
      render();
    }}, '💸 Gastar')
  ));
  sheet.appendChild(el('div',{class:'secao-divisor', style:'margin:14px;'}));
  sheet.appendChild(el('div',{style:'padding:0 14px;'},
    el('button',{class:'btn ghost', onclick:()=>{ state._moedaPopup=null; abrirEnviarDinheiro(campo); }}, '📤 Enviar dinheiro')
  ));
  sheet.appendChild(el('button',{class:'menu-close', style:'margin-top:14px;', onclick:()=>{ state._moedaPopup=null; render(); }}, 'Fechar'));
  overlay.appendChild(sheet);
  return overlay;
}

// Busca os mapas que o Mestre compartilhou (só existe UM Mestre por mesa; o jogador recebe só
// os mapas, nada mais dos dados do Mestre).
function abrirEscolherMapaMestre(){
  state._escolherMapaFluxo = {mapas:null, carregando:true};
  render();
  carregarMapasDoMestre().then(mapas=>{
    if(!state._escolherMapaFluxo) return;
    state._escolherMapaFluxo.mapas = mapas;
    state._escolherMapaFluxo.carregando = false;
    render();
  });
}

function renderPopupEscolherMapa(f){
  const fluxo = state._escolherMapaFluxo;
  const overlay = el('div',{class:'menu-overlay', onclick:(e)=>{ if(e.target===e.currentTarget){ state._escolherMapaFluxo=null; render(); } }});
  const sheet = el('div',{class:'menu-sheet'});
  sheet.appendChild(el('div',{class:'wizard-title', style:'padding:6px 14px 0;'}, 'Mapas do Mestre'));
  if(fluxo.carregando){
    sheet.appendChild(el('div',{class:'empty'}, 'Carregando mapas...'));
  } else if(!fluxo.mapas || fluxo.mapas.length===0){
    sheet.appendChild(el('div',{class:'empty'}, 'O Mestre ainda não enviou nenhum mapa.'));
  } else {
    fluxo.mapas.forEach(mapa=>{
      sheet.appendChild(el('button',{class:'menu-item', style:'height:auto;padding:10px 14px;', onclick:()=>{
        if(!f.locais) f.locais = [];
        f.locais.push({nome:mapa.nome, nota:'', mapaUrl:mapa.url});
        registrarLog(f, 'Adicionou local com mapa do Mestre: '+mapa.nome);
        salvarPerfis();
        state._escolherMapaFluxo = null;
        render();
      }},
        mapa.url ? el('img',{src:mapa.url, style:'width:40px;height:40px;object-fit:cover;border-radius:6px;flex-shrink:0;'}) : el('span',{class:'ico'},'🗺️'),
        el('span',{}, mapa.nome)
      ));
    });
  }
  sheet.appendChild(el('button',{class:'menu-close', onclick:()=>{ state._escolherMapaFluxo=null; render(); }}, 'Cancelar'));
  overlay.appendChild(sheet);
  return overlay;
}

// Fluxo de vincular um relacionamento a um personagem de verdade da mesa — reaproveita a mesma
// lista leve usada pra escolher destino de item/dinheiro.
// Efeito customizado num item personalizado (fora do catálogo) — lista curada dos tipos mais
// pedidos (bônus de perícia, PM, PV), reaproveitando exatamente as mesmas estruturas que os
// itens de verdade do catálogo já usam (bonusPericia/bonusRecurso), só que guardado direto na
// linha do item em vez de numa definição fixa. Cobrir TODO efeito possível do jogo seria uma
// tarefa enorme; isso cobre os pedidos mais comuns de item homebrew.
function descricaoEfeitoCustom(efeito){
  if(efeito.tipo==='bonusPericia') return '+'+efeito.valor+' em '+efeito.pericia;
  if(efeito.tipo==='bonusPM') return '+'+efeito.valor+' PM';
  if(efeito.tipo==='bonusPV') return '+'+efeito.valor+' PV';
  return '—';
}

function abrirEfeitoItemCustom(idx){
  const f = fichaAtual();
  const atual = f.equip[idx].efeitoCustom;
  state._efeitoItemPopup = {
    idx,
    tipo: atual ? atual.tipo : 'bonusPericia',
    pericia: atual && atual.tipo==='bonusPericia' ? atual.pericia : PERICIAS[0].nome,
    valor: atual ? String(atual.valor) : '1',
  };
  render();
}

function renderPopupEfeitoItemCustom(f){
  const fluxo = state._efeitoItemPopup;
  const row = f.equip[fluxo.idx];
  const overlay = el('div',{class:'menu-overlay', onclick:(e)=>{ if(e.target===e.currentTarget){ state._efeitoItemPopup=null; render(); } }});
  const sheet = el('div',{class:'menu-sheet'});
  sheet.appendChild(el('div',{class:'wizard-title', style:'padding:6px 14px 0;'}, 'Efeito de "'+(row?row.item:'')+'"'));
  sheet.appendChild(el('div',{class:'tip', style:'margin:6px 14px;'}, 'Esse efeito só vale enquanto o item estiver vestido (conta contra o limite de 4 itens vestidos, igual qualquer outro).'));
  const conteudo = el('div',{style:'padding:0 14px;'});
  conteudo.appendChild(el('label',{},'Tipo de efeito'));
  const selTipo = el('select',{onchange:(e)=>{fluxo.tipo=e.target.value; render();}});
  [['bonusPericia','Bônus fixo numa perícia'],['bonusPM','Bônus de PM (mana máxima)'],['bonusPV','Bônus de PV (vida máxima)']].forEach(([v,label])=>{
    selTipo.appendChild(el('option',{value:v, selected:fluxo.tipo===v?'selected':undefined}, label));
  });
  conteudo.appendChild(selTipo);
  if(fluxo.tipo==='bonusPericia'){
    conteudo.appendChild(el('label',{style:'margin-top:8px;'},'Qual perícia'));
    const selPericia = el('select',{onchange:(e)=>{fluxo.pericia=e.target.value;}});
    PERICIAS.forEach(p=> selPericia.appendChild(el('option',{value:p.nome, selected:fluxo.pericia===p.nome?'selected':undefined}, p.nome)));
    conteudo.appendChild(selPericia);
  }
  conteudo.appendChild(el('label',{style:'margin-top:8px;'},'Valor do bônus'));
  conteudo.appendChild(el('input',{type:'number', value:fluxo.valor, oninput:(e)=>{fluxo.valor=e.target.value;}}));
  sheet.appendChild(conteudo);

  sheet.appendChild(el('button',{class:'btn', style:'margin:14px 14px 0;width:calc(100% - 28px);', onclick:()=>{
    const valor = parseInt(fluxo.valor);
    if(isNaN(valor) || valor===0){ flashMsg('Coloca um valor de bônus válido primeiro.'); return; }
    if(fluxo.tipo==='bonusPericia'){
      row.efeitoCustom = {tipo:'bonusPericia', pericia:fluxo.pericia, valor};
    } else {
      row.efeitoCustom = {tipo:fluxo.tipo, valor};
    }
    registrarLog(f, 'Definiu efeito em "'+row.item+'": '+descricaoEfeitoCustom(row.efeitoCustom));
    salvarPerfis();
    flashMsg('⚡ Efeito definido: '+descricaoEfeitoCustom(row.efeitoCustom));
    state._efeitoItemPopup = null;
    render();
  }}, '✓ Salvar efeito'));
  if(row && row.efeitoCustom){
    sheet.appendChild(el('button',{class:'btn ghost', style:'margin:10px 14px 0;width:calc(100% - 28px);', onclick:()=>{
      row.efeitoCustom = null;
      salvarPerfis();
      flashMsg('Efeito removido.');
      state._efeitoItemPopup = null;
      render();
    }}, 'Remover efeito'));
  }
  sheet.appendChild(el('button',{class:'menu-close', style:'margin-top:10px;', onclick:()=>{ state._efeitoItemPopup=null; render(); }}, 'Cancelar'));
  overlay.appendChild(sheet);
  return overlay;
}

function abrirEscolherJogadorRelacionamento(){
  state._escolherJogadorRelFluxo = {lista:null, carregando:true};
  render();
  const f = fichaAtual();
  listaLeveDeTodosPersonagens().then(lista=>{
    if(!state._escolherJogadorRelFluxo) return;
    state._escolherJogadorRelFluxo.lista = lista.filter(p=>p.id!==f.id);
    state._escolherJogadorRelFluxo.carregando = false;
    render();
  });
}

function renderPopupEscolherJogadorRel(f){
  const fluxo = state._escolherJogadorRelFluxo;
  const overlay = el('div',{class:'menu-overlay', onclick:(e)=>{ if(e.target===e.currentTarget){ state._escolherJogadorRelFluxo=null; render(); } }});
  const sheet = el('div',{class:'menu-sheet'});
  sheet.appendChild(el('div',{class:'wizard-title', style:'padding:6px 14px 0;'}, 'Vincular a um jogador'));
  sheet.appendChild(el('div',{class:'tip', style:'margin:6px 14px;'}, 'O nome e a foto acompanham automaticamente esse personagem — você só escreve a relação/nota.'));
  if(fluxo.carregando){
    sheet.appendChild(el('div',{class:'empty'}, 'Carregando lista de personagens...'));
  } else if(!fluxo.lista || fluxo.lista.length===0){
    sheet.appendChild(el('div',{class:'empty'}, 'Nenhum outro personagem encontrado.'));
  } else {
    fluxo.lista.forEach(p=>{
      sheet.appendChild(el('button',{class:'menu-item', onclick:()=>{
        if(!f.relacionamentos) f.relacionamentos = [];
        if(f.relacionamentos.some(r=>r.personagemId===p.id)){ flashMsg('Já tem esse personagem nos seus relacionamentos.'); return; }
        f.relacionamentos.push({nome:p.nome, tipo:'Aliado', nota:'', personagemId:p.id});
        registrarLog(f, 'Vinculou relacionamento a: '+p.nome);
        salvarPerfis();
        state._escolherJogadorRelFluxo = null;
        render();
      }},
        el('span',{class:'ico'},'👤'), el('span',{}, p.nome+(p.jogador?' ('+p.jogador+')':''))
      ));
    });
  }
  sheet.appendChild(el('button',{class:'menu-close', onclick:()=>{ state._escolherJogadorRelFluxo=null; render(); }}, 'Cancelar'));
  overlay.appendChild(sheet);
  return overlay;
}

// "Perfil social" de um personagem — foto, nome, raça, classe. De propósito NÃO mostra PV,
// itens, dinheiro ou notas (nada disso é "informação pública" que outro personagem da mesa
// saberia só de olhar/conhecer alguém). Busca sempre fresco (não guarda cópia local), então
// sempre reflete o nome/foto/raça atuais.
function abrirPerfilJogador(personagemId){
  state._perfilJogadorPopup = {personagemId, dados:null, carregando:true};
  render();
  listaLeveDeTodosPersonagens().then(lista=>{
    if(!state._perfilJogadorPopup || state._perfilJogadorPopup.personagemId!==personagemId) return;
    state._perfilJogadorPopup.dados = lista.find(p=>p.id===personagemId) || null;
    state._perfilJogadorPopup.carregando = false;
    render();
  });
}

function renderPopupPerfilJogador(){
  const fluxo = state._perfilJogadorPopup;
  const overlay = el('div',{class:'menu-overlay', onclick:(e)=>{ if(e.target===e.currentTarget){ state._perfilJogadorPopup=null; render(); } }});
  const sheet = el('div',{class:'menu-sheet'});
  if(fluxo.carregando){
    sheet.appendChild(el('div',{class:'empty', style:'padding:24px;'}, 'Carregando perfil...'));
  } else if(!fluxo.dados){
    sheet.appendChild(el('div',{class:'empty', style:'padding:24px;'}, 'Não achei esse personagem — talvez tenha sido removido.'));
  } else {
    const p = fluxo.dados;
    const classesTxt = (p.classesNiveis||[]).map(c=>c.classe).join(' / ') || '—';
    sheet.appendChild(el('div',{style:'display:flex;flex-direction:column;align-items:center;gap:10px;padding:20px 14px 6px;'},
      el('div',{class:'foto-upload', style:'cursor:default;width:100px;height:100px;'},
        p.foto ? el('img',{src:p.foto, style:'width:100%;height:100%;object-fit:cover;'}) : el('span',{class:'foto-placeholder'},'👤')
      ),
      el('div',{class:'wizard-title', style:'margin:0;'}, p.nome),
      el('div',{class:'meta'}, (p.raca||'—')+' · '+classesTxt)
    ));
  }
  sheet.appendChild(el('button',{class:'menu-close', style:'margin-top:14px;', onclick:()=>{ state._perfilJogadorPopup=null; render(); }}, 'Fechar'));
  overlay.appendChild(sheet);
  return overlay;
}

function abrirEnviarDinheiro(campoInicial){
  state._enviarDinheiroFluxo = {campo:campoInicial||'ts', valor:'', destinoId:null, lista:null, carregando:true, enviando:false};
  render();
  const f = fichaAtual();
  listaLeveDeTodosPersonagens().then(lista=>{
    if(!state._enviarDinheiroFluxo) return; // já cancelou antes da lista chegar
    state._enviarDinheiroFluxo.lista = lista.filter(p=>p.id!==f.id);
    state._enviarDinheiroFluxo.carregando = false;
    render();
  });
}

// Kit (15/11/2026): moeda num seletor (T$ já escolhido), valor, para quem (avatar seleciona) e
// um botão que diz o que vai acontecer.
function renderPopupEnviarDinheiro(f){
  const fluxo = state._enviarDinheiroFluxo;
  const fechar = ()=>{ if(!fluxo.enviando){ state._enviarDinheiroFluxo = null; render(); } };
  const overlay = el('div',{class:'menu-overlay', onclick:(e)=>{ if(e.target===e.currentTarget) fechar(); }});
  const sheet = el('div',{class:'menu-sheet janela-kit'});
  const rotulo = {tc:'TC', ts:'T$', to:'TO'};
  const disponivel = parseInt(f[fluxo.campo])||0;
  sheet.appendChild(el('div',{class:'wizard-title'}, 'Enviar dinheiro'));
  sheet.appendChild(kSeg([{id:'ts', rot:'T$'}, {id:'to', rot:'TO'}, {id:'tc', rot:'TC'}], fluxo.campo, (c)=>{ fluxo.campo = c; render(); }));
  sheet.appendChild(el('div',{class:'linha-equip'},
    el('input',{id:'enviar-dinheiro-valor', type:'number', inputmode:'numeric', min:'1', placeholder:'quanto', value:fluxo.valor, style:'margin:0;flex:1;', oninput:(e)=>{ fluxo.valor = e.target.value; render(); }}),
    el('span',{class:'meta-ej', style:'white-space:nowrap;'}, 'você tem '+disponivel+' '+rotulo[fluxo.campo])));
  if(fluxo.enviando) sheet.appendChild(el('div',{class:'empty'}, 'Enviando...'));
  else if(fluxo.carregando) sheet.appendChild(el('div',{class:'empty'}, 'Carregando os aliados...'));
  else if(!fluxo.lista || !fluxo.lista.length) sheet.appendChild(el('div',{class:'empty'}, 'Nenhum outro personagem encontrado.'));
  else {
    sheet.appendChild(el('div',{class:'k-rot'}, 'Para quem'));
    sheet.appendChild(renderAvataresSelecionaveis(fluxo.lista, fluxo.destinoId, (p)=>{ fluxo.destinoId = p.id; render(); }));
  }
  const valor = parseInt(fluxo.valor)||0;
  const destino = (fluxo.lista||[]).find(p=> p.id===fluxo.destinoId);
  const problema = !valor || valor<=0 ? 'Digite quanto' : valor>disponivel ? 'Você tem só '+disponivel+' '+rotulo[fluxo.campo] : !destino ? 'Escolha para quem' : null;
  sheet.appendChild(el('div',{class:'duo', style:'margin-top:12px;'},
    el('button',{class:'btn ghost', onclick:fechar}, 'Cancelar'),
    el('button',{class:'btn', disabled: !!problema || fluxo.enviando, onclick: async ()=>{
      fluxo.enviando = true; render();
      const resultado = await enviarDinheiroParaOutroPersonagem(destino.id, fluxo.campo, valor);
      if(resultado.ok){
        f[fluxo.campo] = (parseInt(f[fluxo.campo])||0) - valor;
        registrarLog(f, 'Enviou '+valor+' '+rotulo[fluxo.campo]+' pra '+(resultado.nomeDestino||destino.nome));
        await salvarPerfis();
        flashMsg('💰 '+valor+' '+rotulo[fluxo.campo]+' enviado(s) para '+(resultado.nomeDestino||destino.nome)+'!');
        animarPresente(valor+' '+rotulo[fluxo.campo], destino);
        state._enviarDinheiroFluxo = null;
      } else {
        flashMsg('⚠ Não consegui enviar agora. Tente de novo em instantes.');
        fluxo.enviando = false;
      }
      render();
    }}, problema || 'Enviar '+valor+' '+rotulo[fluxo.campo]+' para '+destino.nome)));
  overlay.appendChild(sheet);
  return overlay;
}
