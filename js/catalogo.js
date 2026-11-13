// =========================================================================================
// Catálogo ("Vitrine", 13/11/2026): lista compacta como antes, sem preço; um sinal dourado
// discreto no item que mexe nesta ficha; filtro "Serve pra mim"; ao abrir, o antes e depois
// na ficha e na mochila; guardar faz o item voar até o contador da Mochila.
// =========================================================================================

function sinal(n){ return (n>=0?'+':'−')+Math.abs(n); }
// O que um item geral do catálogo muda nesta ficha. {marca, linhas:[[rótulo, antes, depois, ruim]]} ou null.
function infoServePraMim(f, it){
  const linhas = [];
  let marca = null;
  const vestidosCheios = it.vestivel && itensVestidosTodos(f).length >= limiteItensVestidos(f);
  if(it.bonusPericia){
    (Array.isArray(it.bonusPericia) ? it.bonusPericia : [it.bonusPericia]).forEach(b=>{
      const p = PERICIAS.find(x=>x.nome===b.nome); if(!p) return;
      const antes = periciaValor(f, p);
      linhas.push([b.nome, sinal(antes), sinal(antes+b.valor), b.valor<0]);
      if(!marca && b.valor>0) marca = '+'+b.valor+' '+b.nome;
    });
  }
  if(it.bonusRecurso && condicaoBonusRecursoCumprida(f, it.bonusRecurso.condicao)){
    const campo = it.bonusRecurso.recurso==='pv' ? 'pvmax' : 'pmmax';
    const antes = parseInt(f[campo])||0;
    linhas.push([it.bonusRecurso.recurso==='pv'?'PV máximo':'PM máximo', String(antes), String(antes+it.bonusRecurso.valor)]);
    marca = marca || '+'+it.bonusRecurso.valor+' '+it.bonusRecurso.recurso.toUpperCase();
  }
  if(MOCHILAS_VESTIVEIS[it.n]){
    const lim = limiteCarga(f), atual = mochilaVestida(f);
    const ganho = MOCHILAS_VESTIVEIS[it.n] - (atual ? atual.bonus : 0);
    if(ganho>0){ linhas.push(['Limite de carga', String(lim), String(lim+ganho)]); marca = '+'+ganho+' de carga'; }
  }
  const magias = f.magias || [];
  if(typeof CATALISADORES_CD_ESCOLA!=='undefined' && CATALISADORES_CD_ESCOLA[it.n]){
    const s = magias.find(m=> m.e===CATALISADORES_CD_ESCOLA[it.n]);
    if(s){ const cd = cdMagiaEspecifica(f, s); if(cd!=null){ linhas.push(['CD de '+s.n, String(cd), String(cd+2)]); marca = '+2 CD'; } }
  }
  if(typeof CATALISADORES_CUSTO_ESCOLA!=='undefined' && CATALISADORES_CUSTO_ESCOLA[it.n]){
    const s = magias.find(m=> m.e===CATALISADORES_CUSTO_ESCOLA[it.n]);
    if(s){ const c = custoPMAjustado(f, s); linhas.push([s.n, c+' PM', Math.max(0,c-1)+' PM']); marca = '−1 PM'; }
  }
  if(ITENS_USO[it.n]){ linhas.push(['Ao usar', 'recupera '+ITENS_USO[it.n].dado+' '+(ITENS_USO[it.n].recurso==='pv'?'PV':'PM'), '']); marca = marca || 'cinto'; }
  if(vestidosCheios && marca) linhas.push(['Vestidos', limiteItensVestidos(f)+'/'+limiteItensVestidos(f), 'trocaria uma peça', true]);
  return marca ? {marca, linhas} : null;
}
function renderDifCatalogo(f, it, info){
  const usada = cargaUsada(f), lim = limiteCarga(f);
  const esp = parseFloat(String(it.esp).replace(',','.'))||0;
  const depois = usada + (poderesAtivos(f).includes('Inventário Organizado') && esp===0.5 ? 0.25 : esp);
  const filhos = [];
  (info ? info.linhas : []).forEach(([r, a, d, ruim])=>{
    filhos.push(el('span',{}, r), el('span',{}, d ? [el('s',{}, a), ' → ', el('b',{class:ruim?'ruim':''}, d)] : el('b',{}, a)));
  });
  filhos.push(el('span',{}, 'Mochila'), el('span',{class:'num'}, el('s',{}, fmtEsp(usada)), ' → ', el('b',{class:depois>lim?'ruim':''}, fmtEsp(depois)+' / '+lim)));
  return el('div',{class:'dif'}, ...filhos);
}
function renderAlvosCatalogo(f){
  return el('div',{class:'alvos-catalogo'},
    el('span',{class:'alvo-cat', 'data-efx-alvo':'mochila'}, 'Mochila '+fmtEsp(cargaUsada(f))+'/'+limiteCarga(f)),
    el('span',{class:'alvo-cat', 'data-efx-alvo':'vestindo'}, 'Vestindo '+Math.min(itensVestidosTodos(f).length, limiteItensVestidos(f))+'/'+limiteItensVestidos(f)),
    temBandoleira(f) ? el('span',{class:'alvo-cat', 'data-efx-alvo':'cinto'}, 'Cinto '+cintoDaFicha(f).length+'/4') : null);
}
// Botão que guarda/veste/equipa e faz o item voar até o contador certo.
function botaoQueVoa(rotulo, classe, nomeItem, destino, acao){
  return el('button',{class:classe, onclick:(e)=>{
    const origem = e.currentTarget;
    const alvo = document.querySelector('[data-efx-alvo="'+destino+'"]') || document.querySelector('[data-efx-alvo="mochila"]');
    voarAte(origem, alvo, nomeItem, ()=>{ reanimar(document.querySelector('[data-efx-alvo="'+destino+'"]'), 'efx-recebe'); });
    Som.tocar(destino==='vestindo' ? 'sino' : 'baque');
    acao();
    render();
  }}, rotulo);
}
