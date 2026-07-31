// ============ CRIADOR DE ITEM SUPERIOR ============
// Sistema de melhorias e materiais especiais (Tabelas 3-7, 3-8, 3-9 do livro) — permite
// customizar uma arma/armadura/escudo/esotérico com até 4 melhorias antes de equipar.

function categoriaMelhoria(categoria){
  if(categoria==='armaduraLeve' || categoria==='armaduraPesada') return 'armadura';
  return categoria;
}

function melhoriasDisponiveis(categoria){
  const catFiltro = categoriaMelhoria(categoria);
  return MELHORIAS.filter(m=> m.categorias.includes(catFiltro) || m.categorias.includes('qualquer'));
}

function precoParaNumero(precoTxt){
  if(!precoTxt) return 0;
  const limpo = String(precoTxt).replace('T$','').trim().replace(/\./g,'').replace(',','.');
  const n = parseFloat(limpo);
  return isNaN(n) ? 0 : n;
}

function precoMaterialParaCategoria(mat, categoria){
  if(categoria==='armaduraLeve') return mat.precos.armaduraLeve;
  if(categoria==='armaduraPesada') return mat.precos.armaduraPesada;
  const catFiltro = categoriaMelhoria(categoria);
  if(catFiltro==='arma') return mat.precos.arma;
  if(catFiltro==='escudo') return mat.precos.escudo;
  if(catFiltro==='esoterico') return mat.precos.esoterico;
  return null;
}
function efeitoMaterialParaCategoria(mat, categoria){
  if(categoria==='armaduraLeve' || categoria==='armaduraPesada') return mat.efeitos.armadura;
  const catFiltro = categoriaMelhoria(categoria);
  return mat.efeitos[catFiltro] || null;
}

function calcularItemSuperior(b){
  const n = b.melhoriasEscolhidas.length;
  const faixa = n>0 ? (PRECO_MELHORIAS.find(p=>p.n===n) || PRECO_MELHORIAS[PRECO_MELHORIAS.length-1]) : {preco:0, cd:0};
  let precoMaterial = 0;
  if(b.materialEscolhido){
    const mat = MATERIAIS_ESPECIAIS.find(m=>m.nome===b.materialEscolhido);
    if(mat) precoMaterial = precoMaterialParaCategoria(mat, b.categoria) || 0;
  }
  return {precoExtra: faixa.preco, cd: faixa.cd, precoMaterial};
}

function iniciarItemSuperior(categoria, baseItem){
  state._itemSuperiorBuilder = { categoria, baseItem, melhoriasEscolhidas: [], materialEscolhido: null };
  render();
}

function prereqOkMelhoria(m, escolhidas){
  if(!m.prereq) return true;
  if(m.prereq==='outra melhoria qualquer') return escolhidas.length>0;
  return escolhidas.includes(m.prereq);
}

function renderCriadorItemSuperior(){
  const b = state._itemSuperiorBuilder;
  const wrap = el('div',{});
  wrap.appendChild(el('div',{class:'top-mini'},
    el('span',{}, 'Criar Item Superior'),
    el('button',{onclick:()=>{ state._itemSuperiorBuilder=null; render(); }}, '✕ Cancelar')
  ));

  wrap.appendChild(el('div',{class:'wizard-title'}, b.baseItem.n || b.baseItem.nome));
  wrap.appendChild(el('div',{class:'tip'}, el('b',{},'Como funciona'), 'Escolha até 4 melhorias (Tabela 3-8). A quantidade de melhorias define o acréscimo no preço e na CD de fabricação (Tabela 3-7). Se escolher "Material especial", você ainda escolhe qual material.'));

  const opcoes = melhoriasDisponiveis(b.categoria);
  const grid = el('div',{class:'option-grid'});
  opcoes.forEach(m=>{
    const marcado = b.melhoriasEscolhidas.includes(m.nome);
    const prereqOk = prereqOkMelhoria(m, b.melhoriasEscolhidas.filter(x=>x!==m.nome));
    const bloqueado = (!marcado && b.melhoriasEscolhidas.length>=4) || (!marcado && !prereqOk);
    grid.appendChild(el('button',{class:'option-card '+(marcado?'selected':'')+(bloqueado?' disabled':''), onclick:()=>{
      if(bloqueado) return;
      if(marcado){
        b.melhoriasEscolhidas = b.melhoriasEscolhidas.filter(x=>x!==m.nome);
        if(m.nome==='Material especial') b.materialEscolhido=null;
      } else {
        b.melhoriasEscolhidas.push(m.nome);
      }
      render();
    }},
      el('div',{class:'opt-nome'}, m.nome),
      el('div',{class:'opt-sub'}, m.desc),
      (m.prereq && !prereqOk) ? el('div',{class:'opt-sub', style:'color:var(--red-bright);'}, 'requer: '+m.prereq) : null,
    ));
  });
  wrap.appendChild(el('div',{class:'panel'}, el('h2',{},'Melhorias ('+b.melhoriasEscolhidas.length+'/4)'), grid));

  if(b.melhoriasEscolhidas.includes('Material especial')){
    const matPanel = el('div',{class:'panel'}, el('h2',{},'Qual material especial?'));
    const gridMat = el('div',{class:'option-grid'});
    MATERIAIS_ESPECIAIS.forEach(mat=>{
      const efeito = efeitoMaterialParaCategoria(mat, b.categoria);
      if(!efeito) return; // material sem efeito definido pra essa categoria (ex: madeira Tollon em armadura)
      gridMat.appendChild(el('button',{class:'option-card '+(b.materialEscolhido===mat.nome?'selected':''), onclick:()=>{ b.materialEscolhido=mat.nome; render(); }},
        el('div',{class:'opt-nome'}, mat.nome),
        el('div',{class:'opt-sub'}, efeito)
      ));
    });
    matPanel.appendChild(gridMat);
    wrap.appendChild(matPanel);
  }

  const calc = calcularItemSuperior(b);
  const precoBase = precoParaNumero(b.baseItem.preco);
  const precoTotal = precoBase + calc.precoExtra + calc.precoMaterial;
  const materialSemPreco = b.materialEscolhido && precoMaterialParaCategoria(b.materialEscolhido, b.categoria)==null;
  wrap.appendChild(el('div',{class:'panel faixa'},
    el('h2',{},'Resumo'),
    el('div',{class:'tip'},
      el('div',{}, el('b',{},'Preço base: '), 'T$ '+precoBase),
      el('div',{}, el('b',{},'Acréscimo por melhorias: '), '+T$ '+calc.precoExtra),
      calc.precoMaterial ? el('div',{}, el('b',{},'Acréscimo do material: '), '+T$ '+calc.precoMaterial) : null,
      el('div',{style:'font-weight:800;margin-top:6px;border-top:1px solid var(--line);padding-top:6px;'}, 'Preço total: T$ '+precoTotal),
      calc.cd ? el('div',{}, el('b',{},'CD extra pra fabricar: '), '+'+calc.cd) : null,
    ),
    materialSemPreco ? el('div',{class:'tip', style:'border:1px solid var(--red-bright);'}, '⚠️ '+b.materialEscolhido.nome+' é raro e não tem preço de mercado — só é possível obter como saque de uma criatura específica, combine com o Mestre. O preço total acima não inclui o custo desse material.') : null
  ));

  const podeCriar = b.melhoriasEscolhidas.length>0 && (!b.melhoriasEscolhidas.includes('Material especial') || b.materialEscolhido);
  wrap.appendChild(el('button',{class:'btn', style: podeCriar?'':'opacity:0.5;', onclick:()=>{ if(podeCriar) finalizarItemSuperior(); }}, 'Criar e Guardar na Mochila'));

  return wrap;
}

function montarNomeEMelhoriasTxt(b){
  const partes = b.melhoriasEscolhidas.map(nome=> nome==='Material especial' ? b.materialEscolhido : nome);
  const nomeFinal = (b.baseItem.n||b.baseItem.nome) + ' (' + partes.join(', ') + ')';
  const melhoriasTxt = b.melhoriasEscolhidas.map(nome=>{
    if(nome==='Material especial' && b.materialEscolhido){
      const mat = MATERIAIS_ESPECIAIS.find(x=>x.nome===b.materialEscolhido);
      const efeito = mat ? efeitoMaterialParaCategoria(mat, b.categoria) : '';
      return 'Material especial ('+b.materialEscolhido+'): '+efeito;
    }
    const m = MELHORIAS.find(x=>x.nome===nome);
    return nome+': '+(m?m.desc:'');
  }).join(' · ');
  return {nomeFinal, melhoriasTxt};
}

function finalizarItemSuperior(){
  const b = state._itemSuperiorBuilder;
  const f = fichaAtual();
  const {nomeFinal, melhoriasTxt} = montarNomeEMelhoriasTxt(b);

  let bonusTeste=0, bonusDano=0, bonusPenalidade=0, bonusDefesa=0;
  const efeitoExtraEsoterico = [];
  b.melhoriasEscolhidas.forEach(nome=>{
    const m = MELHORIAS.find(x=>x.nome===nome);
    if(!m || !m.efeito) return;
    if(m.efeito.tipo==='testeAtaque') bonusTeste += m.efeito.valor;
    if(m.efeito.tipo==='dano') bonusDano += m.efeito.valor;
    if(m.efeito.tipo==='penalidade') bonusPenalidade += m.efeito.valor;
    if(m.efeito.tipo==='defesaEArmadura'){ bonusDefesa += m.efeito.valor; bonusPenalidade += m.efeito.valor; }
    if(m.efeito.tipo==='cd_arcana_geral' || m.efeito.tipo==='limite_pm_arcana') efeitoExtraEsoterico.push({tipo:m.efeito.tipo, valor:m.efeito.valor});
  });
  if(b.materialEscolhido==='Gelo eterno' && categoriaMelhoria(b.categoria)==='arma') bonusDano += 2;

  if(b.categoria==='arma'){
    const w = ARMAS.find(a=>a.n===b.baseItem.n);
    f.equip.push({tipo:'arma', ref:w.n, item:nomeFinal, qtd:'1', carga:String(w.esp),
      superior:true, bonusTesteExtra:bonusTeste, bonusDanoExtra:bonusDano, melhoriasTxt});
  } else if(b.categoria==='armaduraLeve' || b.categoria==='armaduraPesada'){
    const a = ARMADURAS.find(x=>x.n===b.baseItem.n);
    f.equip.push({tipo:'armadura', ref:a.n, item:nomeFinal, qtd:'1', carga:String(a.esp),
      superior:true, bonusDefExtra:bonusDefesa, bonusPenExtra:bonusPenalidade, melhoriasTxt});
  } else if(b.categoria==='escudo'){
    const a = ESCUDOS.find(x=>x.n===b.baseItem.n);
    f.equip.push({tipo:'escudo', ref:a.n, item:nomeFinal, qtd:'1', carga:String(a.esp),
      superior:true, bonusDefExtra:bonusDefesa, bonusPenExtra:bonusPenalidade, melhoriasTxt});
  } else if(b.categoria==='esoterico'){
    const it = ITENS_ESOTERICOS.find(x=>x.n===b.baseItem.n);
    f.equip.push({tipo:'esoterico', ref:it.n, item:nomeFinal, qtd:'1', carga:String(it.esp),
      superior:true, efeitoExtra:efeitoExtraEsoterico, melhoriasTxt});
  }

  salvarPerfis();
  state._itemSuperiorBuilder = null;
  flashMsg('"'+nomeFinal+'" criado e guardado na mochila!');
  render();
}
