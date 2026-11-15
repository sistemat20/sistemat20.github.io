// Itens da mochila e vestidos: nomes, catálogo, essências e bônus.
// Separado do js/app.js em 15/11/2026 (item 6 da revisão geral), sem mudar o código.

// ---- Itens Vestidos (limite de 4 simultâneos com benefício ativo — regra do livro, pág. 146) ----
// Armadura conta como 1 item vestido, exceto para raças com corpo acoplado (Golem).
function armaduraContaComoVestido(f){
  const racaObj = getRacaObj(f);
  const imune = racaObj && racaObj.armaduraNaoContaVestido;
  return !!(f.armadura && f.armadura.equipado!==false && !imune);
}

// Tira o sufixo de "item recebido" do nome, pra conseguir achar o item no catálogo. Existem
// DOIS formatos: "(recebido do Mestre)" e "(recebido de Fulano)" (quando é um jogador que
// manda pra outro). O código antigo só limpava o primeiro, então item enviado por um jogador
// chegava com nome que não batia com nada do catálogo e PERDIA as opções (upgrade da Mochila
// de Aventureiro, descrição, munição, catalisador). Centralizado aqui pra não ter esse tipo de
// divergência de novo.
function nomeBaseItem(nomeCompleto){
  return String(nomeCompleto||'').replace(/\s*\(recebido (do Mestre|de [^)]*)\)/g, '');
}

// Remove um item da mochila (usa em vez de f.equip.splice direto). Se for um item de presente
// (marcado "recebido do Mestre"/"recebido de X"), registra a exclusão numa lista PERSISTENTE na
// própria ficha (f._itensExcluidosDePresente) — sem isso, o item voltava sozinho: as funções que
// mesclam dados do servidor (tanto no salvamento normal quanto quando o Mestre atualiza a ficha
// de alguém) comparam "o servidor tem X, o local não tem" pra detectar presente novo chegando, e
// como o servidor demora a saber da exclusão, elas achavam (por engano) que era um presente novo
// e devolviam o item que acabou de ser apagado. Guardar a exclusão NA FICHA (não só na memória
// da sessão) garante que qualquer uma dessas funções, hoje ou no futuro, respeita a exclusão.
function removerItemMochila(f, idx){
  const row = f.equip[idx];
  if(!row) return;
  if(/\(recebido (do Mestre|de [^)]*)\)/.test(row.item)){
    if(!f._itensExcluidosDePresente) f._itensExcluidosDePresente = [];
    if(!f._itensExcluidosDePresente.includes(row.item)) f._itensExcluidosDePresente.push(row.item);
  }
  f.equip.splice(idx,1);
}

// Lista, em ordem, de todas as "fontes" de item vestido que o personagem tem marcadas —
// pode passar de 4; quem consome essa lista decide o que fica ativo (os 4 primeiros).
// Nome de catálogo de uma linha da mochila: a referência guardada (item forjado) ou o nome sem as
// marcas de presente. Antes a busca usava o nome inteiro, e um presente perdia o bônus.
let _catalogoPorMinuscula = null;
function nomeCatalogoDaLinha(row){
  const n = String(row.ref || nomeBaseItem(row.item)).trim();
  if(typeof ITENS_GERAIS==='undefined') return n;
  if(!_catalogoPorMinuscula){ _catalogoPorMinuscula = {}; ITENS_GERAIS.forEach(i=>{ _catalogoPorMinuscula[i.n.toLowerCase()] = i.n; }); }
  return _catalogoPorMinuscula[n.toLowerCase()] || n;
}

function catalogoDaLinha(row){
  const nome = nomeCatalogoDaLinha(row);
  return ITENS_GERAIS.find(i=>i.n===nome)
    || (typeof ACESSORIOS_MENORES!=='undefined' && ACESSORIOS_MENORES.find(a=>a.nome===nome))
    || (typeof ACESSORIOS_MEDIOS!=='undefined' && ACESSORIOS_MEDIOS.find(a=>a.nome===nome))
    || (typeof ACESSORIOS_MAIORES!=='undefined' && ACESSORIOS_MAIORES.find(a=>a.nome===nome))
    || null;
}

// Roupa sem benefício (traje de viajante) não ocupa um dos 4 vestidos: o livro limita os itens
// "com benefício". Vale para vestuário do catálogo marcado sem benefício que não ganhou essência.
function vestidoSemBeneficio(row, catalogo){
  return !!(catalogo && catalogo.cat==='Vestuário' && catalogo.vestivel===false && !row.efeitoCustom && !(row.essencias||[]).length && !row.superior);
}

function itensVestidosTodos(f){
  const fontes = [];
  if(armaduraContaComoVestido(f)) fontes.push({tipo:'armadura', nome:f.armadura.nome, catalogo:null});
  (f.equip||[]).forEach(row=>{
    if(row.tipo==='geral' && row.vestido){
      const item = catalogoDaLinha(row);
      if(vestidoSemBeneficio(row, item)) return;
      fontes.push({tipo:'geral', nome:row.item, catalogo:(item && item.n) ? item : null, catalogoMagico:(item && !item.n) ? item : null, row});
    }
  });
  return fontes;
}

// Essências (Oficina de essências e melhorias de vestuário forjado) dos itens vestidos ativos.
function essenciasAtivas(f){
  const lista = [];
  itensVestidosAtivos(f).forEach(fonte=>{ ((fonte.row && fonte.row.essencias) || []).forEach(e=> lista.push(e)); });
  return lista;
}

function limiteItensVestidos(f){ return poderesAtivos(f).includes('Costas Largas') ? 5 : 4; }

function itensVestidosAtivos(f){ return itensVestidosTodos(f).slice(0,limiteItensVestidos(f)); }

function itensVestidosExcedentes(f){ return itensVestidosTodos(f).slice(limiteItensVestidos(f)); }

function slotsVestidosUsados(f){ return itensVestidosTodos(f).length; }

// Bônus de perícia vindo de itens vestidos ativos (só os 4 primeiros contam; regra do livro)
function bonusPericiaDeItensVestidos(f, periciaNome){
  let total = 0;
  itensVestidosAtivos(f).forEach(fonte=>{
    const bp = fonte.catalogo && fonte.catalogo.bonusPericia;
    if(bp){
      // Aceita tanto {nome,valor} (a maioria dos itens, um bônus só) quanto uma lista de vários
      // — precisou generalizar pro Farrapos de ermitão (achado numa auditoria), que tem +2 numa
      // perícia E –2 em outra ao mesmo tempo, coisa que o formato de objeto único não suportava.
      const lista = Array.isArray(bp) ? bp : [bp];
      lista.forEach(item=>{ if(item.nome===periciaNome) total += item.valor; });
    }
    // Efeito que o próprio jogador definiu num item personalizado (fora do catálogo) — mesma
    // ideia do bônus de item de catálogo acima, só que guardado direto na linha do item em vez
    // de numa definição fixa em ITENS_GERAIS.
    const ec = fonte.row && fonte.row.efeitoCustom;
    if(ec && ec.tipo==='bonusPericia' && ec.pericia===periciaNome){
      total += parseInt(ec.valor)||0;
    }
    ((fonte.row && fonte.row.essencias) || []).forEach(e=>{ if(e.tipo==='pericia' && e.pericia===periciaNome) total += parseInt(e.valor)||0; });
  });
  return total;
}

// Mesma ideia do bônus de perícia acima, mas pra PM/PV — usado pelo Chapéu arcano (e qualquer
// item parecido no futuro). "condicao" é opcional; hoje só existe 'arcanista' (checa se o
// personagem tem qualquer Caminho do Arcanista escolhido), mas fica fácil de estender.
function condicaoBonusRecursoCumprida(f, condicao){
  if(!condicao) return true;
  if(condicao==='arcanista') return !!f.arcanistaCaminho;
  return true; // condição desconhecida — melhor aplicar o bônus do que travar ele por engano
}

function bonusRecursoDeItensVestidos(f, recurso){
  let total = 0;
  itensVestidosAtivos(f).forEach(fonte=>{
    const br = fonte.catalogo && fonte.catalogo.bonusRecurso;
    if(br && br.recurso===recurso && condicaoBonusRecursoCumprida(f, br.condicao)){
      total += br.valor;
    }
    const ec = fonte.row && fonte.row.efeitoCustom;
    if(ec && ec.tipo==='bonus'+(recurso==='pm'?'PM':'PV')){
      total += parseInt(ec.valor)||0;
    }
    ((fonte.row && fonte.row.essencias) || []).forEach(e=>{ if(e.tipo===recurso) total += parseInt(e.valor)||0; });
  });
  return total;
}
