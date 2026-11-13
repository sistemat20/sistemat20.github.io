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

// Dada a lista de melhorias escolhidas, devolve quais delas têm o bônus anulado por uma melhoria
// avançada presente na mesma lista (Certeira some quando tem Pungente, e assim por diante).
function melhoriasSubstituidas(escolhidas){
  const fora = [];
  escolhidas.forEach(nome=>{
    const m = MELHORIAS.find(x=>x.nome===nome);
    if(m && m.substitui && escolhidas.includes(m.substitui)) fora.push(m.substitui);
  });
  return fora;
}

function prereqOkMelhoria(m, escolhidas){
  if(!m.prereq) return true;
  if(m.prereq==='outra melhoria qualquer') return escolhidas.length>0;
  return escolhidas.includes(m.prereq);
}

function montarNomeEMelhoriasTxt(b){
  const partes = b.melhoriasEscolhidas.map(nome=> nome==='Material especial' ? b.materialEscolhido : nome);
  const nomeFinal = (b.baseItem.n||b.baseItem.nome) + ' (' + partes.join(', ') + ')';
  const foraDoCalculo = melhoriasSubstituidas(b.melhoriasEscolhidas);
  const melhoriasTxt = b.melhoriasEscolhidas.map(nome=>{
    if(foraDoCalculo.includes(nome)) return nome+': só pré-requisito (o bônus vem da melhoria avançada)';
    if(nome==='Material especial' && b.materialEscolhido){
      const mat = MATERIAIS_ESPECIAIS.find(x=>x.nome===b.materialEscolhido);
      const efeito = mat ? efeitoMaterialParaCategoria(mat, b.categoria) : '';
      return 'Material especial ('+b.materialEscolhido+'): '+efeito;
    }
    const m = MELHORIAS.find(x=>x.nome===nome);
    if(nome==='Harmonizado' && b.magiaHarmonizada) return 'Harmonizado ('+b.magiaHarmonizada+'): essa magia custa –1 PM';
    return nome+': '+(m?m.desc:'');
  }).join(' · ');
  return {nomeFinal, melhoriasTxt};
}

