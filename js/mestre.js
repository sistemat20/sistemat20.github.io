// ============ TELA DO MESTRE — ferramentas de apoio para conduzir a sessão ============

function abrirTelaMestre(){
  state.screen = 'mestre';
  state.mestreTab = 'bestiario';
  render();
}

function renderMestreScreen(){
  const wrap = el('div',{});
  wrap.appendChild(el('header',{class:'top'},
    el('div',{style:'display:flex;justify-content:space-between;align-items:center;gap:10px;'},
      el('button',{class:'btn ghost', style:'width:auto;flex-shrink:0;padding:6px 12px;background:transparent;border-color:#f4efe2;color:#f4efe2;', onclick:()=>{ precisaCodigoJogador() ? sairDoCodigoJogador() : (state.screen='perfis', render()); }}, '← Perfis'),
      el('h1',{class:'display', style:'font-size:1.1rem;margin:0;'}, 'Mesa do Mestre')
    ),
    el('div',{class:'sub'}, 'Bestiário, NPCs, tesouro, lojas e nomes — tudo pra conduzir a sessão')
  ));

  const nav = el('nav',{class:'tabs'});
  [['bestiario','Bestiário'],['npc','NPC Rápido'],['tesouro','Tesouro'],['loja','Loja'],['itens','Itens'],['magicos','Itens Mágicos'],['nomes','Nomes']].forEach(([id,label])=>{
    nav.appendChild(el('button',{class: state.mestreTab===id?'active':'', onclick:()=>{state.mestreTab=id; render();}}, label));
  });
  wrap.appendChild(nav);

  const main = el('main',{});
  if(state.mestreTab==='bestiario') main.appendChild(renderMestreBestiario());
  if(state.mestreTab==='npc') main.appendChild(renderMestreNpc());
  if(state.mestreTab==='tesouro') main.appendChild(renderMestreTesouro());
  if(state.mestreTab==='loja') main.appendChild(renderMestreLoja());
  if(state.mestreTab==='itens') main.appendChild(renderMestreItens());
  if(state.mestreTab==='magicos') main.appendChild(renderMestreItensMagicos());
  if(state.mestreTab==='nomes') main.appendChild(renderMestreNomes());
  wrap.appendChild(main);

  return wrap;
}

function ndTexto(nd){ return nd===0.5 ? '1/2' : String(nd); }

// ---- BESTIÁRIO ----
// Monta o corpo (conteúdo expandido) do card de uma criatura — reusado tanto pro bestiário do
// Livro Básico quanto pelas categorias de Ameaças de Arton.
function renderStatBlockCriatura(m){
  return [
    el('div',{class:'tip', style:'font-size:0.82rem;'},
      el('div',{}, el('b',{},m.tipo+' '+m.tamanho)),
      el('div',{}, m.sentidos),
      el('div',{}, el('b',{},'Defesa '+m.defesa+' · '), m.resistencias),
      el('div',{}, el('b',{},'PV '+m.pv+' · '), 'Deslocamento '+m.desloc + (m.pm?' · PM '+m.pm:'')),
    ),
    el('div',{class:'power-item'}, el('b',{},'Ataques'), m.ataques.join(' · ')),
    m.habilidades.length ? el('div',{class:'power-item'}, el('b',{},'Habilidades especiais'), m.habilidades.join(' · ')) : null,
    el('div',{class:'meta', style:'margin-top:6px;'}, m.atributos),
    m.pericias!=='—' ? el('div',{class:'meta'}, 'Perícias: '+m.pericias) : null,
    el('div',{class:'meta', style:'color:var(--gold);'}, 'Tesouro: '+m.tesouro),
  ];
}

function renderMestreBestiario(){
  if(!state._mestreLivro) state._mestreLivro = 'basico';
  const wrap = el('div',{});

  wrap.appendChild(el('div',{class:'tab-grid', style:'grid-template-columns:repeat(2,1fr);'},
    el('button',{class: state._mestreLivro==='basico'?'on':'', onclick:()=>{state._mestreLivro='basico'; render();}}, 'Livro Básico'),
    el('button',{class: state._mestreLivro==='ameacas'?'on':'', onclick:()=>{state._mestreLivro='ameacas'; render();}}, 'Ameaças de Arton'),
  ));

  if(state._mestreLivro==='ameacas'){
    wrap.appendChild(renderBestiarioAmeacas());
    return wrap;
  }

  if(!state._mestreFiltro) state._mestreFiltro = {busca:'', nd:'todos'};
  const filtro = state._mestreFiltro;

  wrap.appendChild(el('div',{class:'tip'}, el('b',{},'Como usar'), 'Busque por nome ou filtre por Nível de Desafio (ND). Toque num monstro pra ver a ficha completa.'));

  const row = el('div',{class:'filters'});
  row.appendChild(el('input',{id:'busca-mestre-monstro', type:'text', placeholder:'buscar monstro...', value:filtro.busca, oninput:(e)=>{filtro.busca=e.target.value; renderDebounced();}}));
  const sel = el('select',{onchange:(e)=>{filtro.nd=e.target.value; render();}});
  sel.appendChild(el('option',{value:'todos'},'Todos os ND'));
  Array.from(new Set(MONSTROS.map(m=>m.nd))).sort((a,b)=>a-b).forEach(nd=>{
    sel.appendChild(el('option',{value:nd, selected: filtro.nd===String(nd)}, 'ND '+ndTexto(nd)));
  });
  row.appendChild(sel);
  wrap.appendChild(row);

  let lista = MONSTROS.filter(m=> (!filtro.busca || m.nome.toLowerCase().includes(filtro.busca.toLowerCase())) && (filtro.nd==='todos' || String(m.nd)===filtro.nd));
  lista = lista.slice().sort((a,b)=>a.nd-b.nd);

  if(lista.length===0){
    wrap.appendChild(el('div',{class:'empty'},'Nenhum monstro encontrado.'));
  }
  lista.forEach(m=>{
    wrap.appendChild(renderItemColapsavel('monstro-'+m.nome, m.nome, 'ND '+ndTexto(m.nd), renderStatBlockCriatura(m)));
  });

  return wrap;
}

// ---- Ameaças de Arton: navegação por categoria (evita virar uma lista gigante) ----
function renderBestiarioAmeacas(){
  const wrap = el('div',{});
  if(!state._mestreCategoriaAmeaca) state._mestreCategoriaAmeaca = null;

  const categoriasComConteudo = AMEACAS_CATEGORIAS.filter(c=>c.criaturas.length>0);
  const categoriasVazias = AMEACAS_CATEGORIAS.filter(c=>c.criaturas.length===0);

  if(!state._mestreCategoriaAmeaca){
    wrap.appendChild(el('div',{class:'tip'}, el('b',{},'Categorias'), 'Escolha uma seção temática (igual ao livro) pra ver as criaturas dela.'));
    const grid = el('div',{class:'option-grid'});
    categoriasComConteudo.forEach(cat=>{
      grid.appendChild(el('button',{class:'option-card', onclick:()=>{ state._mestreCategoriaAmeaca=cat.nome; render(); }},
        el('div',{class:'opt-nome'}, cat.nome),
        el('div',{class:'opt-sub'}, cat.criaturas.length+' criatura'+(cat.criaturas.length>1?'s':''))
      ));
    });
    wrap.appendChild(grid);
    if(categoriasVazias.length>0){
      wrap.appendChild(el('div',{class:'tip', style:'font-size:0.75rem;margin-top:10px;'}, el('b',{},'Ainda vêm por aí: '), categoriasVazias.map(c=>c.nome).join(', ')));
    }
    return wrap;
  }

  const categoria = AMEACAS_CATEGORIAS.find(c=>c.nome===state._mestreCategoriaAmeaca);
  wrap.appendChild(el('button',{class:'btn ghost', style:'margin-bottom:10px;', onclick:()=>{ state._mestreCategoriaAmeaca=null; render(); }}, '← Voltar pras categorias'));
  wrap.appendChild(el('div',{class:'wizard-title'}, categoria.nome));

  if(!state._mestreFiltroAmeaca) state._mestreFiltroAmeaca = {busca:''};
  const filtro = state._mestreFiltroAmeaca;
  wrap.appendChild(el('input',{id:'busca-mestre-ameaca', type:'text', placeholder:'buscar criatura nesta categoria...', value:filtro.busca, oninput:(e)=>{filtro.busca=e.target.value; renderDebounced();}}));

  let lista = categoria.criaturas.filter(m=> !filtro.busca || m.nome.toLowerCase().includes(filtro.busca.toLowerCase()));
  lista = lista.slice().sort((a,b)=>a.nd-b.nd);
  if(lista.length===0){
    wrap.appendChild(el('div',{class:'empty'},'Nenhuma criatura encontrada.'));
  }
  lista.forEach(m=>{
    wrap.appendChild(renderItemColapsavel('ameaca-'+m.nome, m.nome, 'ND '+ndTexto(m.nd), renderStatBlockCriatura(m)));
  });

  return wrap;
}

// ---- NPC RÁPIDO ----
function renderMestreNpc(){
  const wrap = el('div',{});
  wrap.appendChild(el('div',{class:'tip'}, el('b',{},'Como usar'), 'Escolha o Nível de Desafio do NPC que você precisa e tenha o bloco de estatísticas pronto na hora — sem precisar montar uma ficha do zero (Tabela 7-2 do livro).'));

  if(!state._mestreNpcNd) state._mestreNpcNd = 1;
  const sel = el('select',{onchange:(e)=>{state._mestreNpcNd=parseFloat(e.target.value); render();}});
  NPC_GENERICO.forEach(n=> sel.appendChild(el('option',{value:n.nd, ...(state._mestreNpcNd===n.nd?{selected:'selected'}:{})}, 'ND '+ndTexto(n.nd)+' ('+n.patamar+')')));
  wrap.appendChild(sel);

  const npc = NPC_GENERICO.find(n=>n.nd===state._mestreNpcNd);
  if(npc){
    wrap.appendChild(el('div',{class:'panel faixa'},
      el('h2',{}, el('span',{class:'n'}, 'ND '+ndTexto(npc.nd)), npc.patamar),
      el('div',{class:'defesa-breakdown', style:'grid-template-columns:repeat(2,1fr);'},
        el('div',{}, el('span',{},'Teste de Ataque'), el('b',{},npc.ataque)),
        el('div',{}, el('span',{},'Dano'), el('b',{},npc.dano)),
        el('div',{}, el('span',{},'Defesa'), el('b',{},npc.defesa)),
        el('div',{}, el('span',{},'Pontos de Vida'), el('b',{},npc.pv)),
        el('div',{}, el('span',{},'Perícias (alta/baixa)'), el('b',{},npc.pericias)),
        el('div',{}, el('span',{},'CD de resistência'), el('b',{},npc.cd)),
      ),
      el('div',{class:'tip', style:'margin-top:10px;font-size:0.78rem;'}, 'Perícias mostra o bônus típico de uma perícia "alta" (treinada, atributo principal) e de uma "baixa" — use pra qualquer teste do NPC. Ajuste o nome, aparência e 2-3 traços de personalidade e está pronto pra jogar.')
    ));
  }
  return wrap;
}

// ---- GERADOR DE TESOURO ----
function rolarDado(qtd, lados){ let t=0; for(let i=0;i<qtd;i++) t+=1+Math.floor(Math.random()*lados); return t; }
function rolarExpressao(expr){
  const m = expr.match(/^(\d+)d(\d+)(?:x(\d+))?$/i);
  if(!m) return 0;
  const qtd = m[1], lados = m[2], mult = m[3];
  const base = rolarDado(parseInt(qtd), parseInt(lados));
  return base * (mult?parseInt(mult):1);
}
function sortear(lista){ return lista[Math.floor(Math.random()*lista.length)]; }

// Sorteia uma arma seguindo a cadeia real do livro: base mundana -> pode vir com 1 encanto -> ou ser uma arma específica nomeada
function sortearArmaMagica(){
  const d = Math.random()*100;
  if(d >= 91){ const esp = sortear(ARMAS_ESPECIFICAS); return esp.nome+' (arma específica, T$ '+esp.preco+')'; }
  const base = sortear(ARMAS).n;
  const encanto = sortear(ENCANTOS_ARMA);
  return base+' '+encanto.nome.toLowerCase()+' ('+encanto.efeito+')';
}
function sortearArmaduraMagica(){
  const d = Math.random()*100;
  if(d >= 91){ const esp = sortear(ARMADURAS_ESPECIFICAS); return esp.nome+' (item específico, T$ '+esp.preco+')'; }
  const base = sortear([...ARMADURAS,...ESCUDOS]);
  const encantosValidos = ENCANTOS_ARMADURA.filter(e=> base.cat==='Escudo' ? true : !['Animado','Esmagador'].includes(e.nome.replace('*','')));
  const encanto = sortear(encantosValidos);
  return base.n+' '+encanto.nome.toLowerCase().replace('*','')+' ('+encanto.efeito+')';
}

function gerarTesouro(nd){
  const tab = TESOURO_POR_ND.find(t=>t.nd===nd) || TESOURO_POR_ND[0];
  const dinheiro = rolarExpressao(tab.dadoDinheiro);
  const linhas = [dinheiro+' '+tab.unidadeDinheiro+' em moedas'];
  if(Math.random() < tab.chanceItem){
    const rolagem = Math.random();
    if(rolagem < 0.3){
      const d = 1+Math.floor(Math.random()*100);
      const entrada = ITENS_DIVERSOS_TABELA.find(([de,ate])=> d>=de && d<=ate);
      linhas.push('Item: '+(entrada?entrada[2]:'algo interessante'));
    } else if(rolagem < 0.6){
      const tipoRoll = Math.random();
      if(tipoRoll<0.5){ linhas.push('Arma: '+sortearArmaMagica()); }
      else if(tipoRoll<0.8){ linhas.push('Armadura/Escudo: '+sortearArmaduraMagica()); }
      else { linhas.push('Esotérico: '+sortear(ITENS_ESOTERICOS).n); }
    } else if(rolagem < 0.85){
      const pocaoSorteada = sortear(POCOES_MAGICAS);
      linhas.push(pocaoSorteada.nome+' (contém '+pocaoSorteada.magia+', T$ '+pocaoSorteada.preco+')');
    } else {
      const d = 1+Math.floor(Math.random()*100);
      const faixa = RIQUEZAS.find(r=> r.faixaMenor && d>=r.faixaMenor[0] && d<=r.faixaMenor[1]) || RIQUEZAS[0];
      linhas.push('Riqueza: '+faixa.exemplo+' (~T$ '+faixa.valorMedio+')');
    }
  }
  return linhas;
}

function renderMestreTesouro(){
  const wrap = el('div',{});
  wrap.appendChild(el('div',{class:'tip'}, el('b',{},'Como usar'), 'Escolha o Nível de Desafio do encontro (ou do tesouro que quer gerar) e toque em "Gerar". Usa as tabelas 8-1 a 8-4 do livro, já rolando os dados pra você.'));

  if(!state._mestreTesouroNd) state._mestreTesouroNd = 1;
  const sel = el('select',{onchange:(e)=>{state._mestreTesouroNd=parseFloat(e.target.value); render();}});
  TESOURO_POR_ND.forEach(t=> sel.appendChild(el('option',{value:t.nd, ...(state._mestreTesouroNd===t.nd?{selected:'selected'}:{})}, 'ND '+ndTexto(t.nd))));
  wrap.appendChild(sel);

  wrap.appendChild(el('button',{class:'btn', style:'margin-top:10px;', onclick:()=>{
    state._mestreTesouroResultado = gerarTesouro(state._mestreTesouroNd);
    render();
  }}, 'Gerar Tesouro 🎲'));

  if(state._mestreTesouroResultado){
    const panel = el('div',{class:'panel faixa'}, el('h2',{},'Resultado'));
    state._mestreTesouroResultado.forEach(linha=> panel.appendChild(el('div',{class:'power-item'}, linha)));
    wrap.appendChild(panel);
  }
  return wrap;
}

// ---- GERADOR DE LOJA / TAVERNA ----
const TIPOS_LOJA = {
  'Ferreiro': ()=> [...pickRandom(ARMAS,4), ...pickRandom([...ARMADURAS,...ESCUDOS],3)],
  'Alquimista': ()=> pickRandom(ITENS_GERAIS.filter(i=>['Alquímico','Catalisador','Veneno'].includes(i.cat)), 6),
  'Loja Geral': ()=> pickRandom(ITENS_GERAIS.filter(i=>['Aventura','Ferramenta','Vestuário','Munição'].includes(i.cat)), 7),
  'Taverna': ()=> pickRandom(ITENS_GERAIS.filter(i=>['Alimentação','Serviço'].includes(i.cat)), 6),
  'Loja Mágica': ()=> pickRandom(ITENS_ESOTERICOS, 4),
};
function pickRandom(lista, qtd){
  const copia = lista.slice();
  const resultado = [];
  for(let i=0;i<qtd && copia.length>0;i++){
    const idx = Math.floor(Math.random()*copia.length);
    resultado.push(copia.splice(idx,1)[0]);
  }
  return resultado;
}

function renderMestreLoja(){
  const wrap = el('div',{});
  wrap.appendChild(el('div',{class:'tip'}, el('b',{},'Como usar'), 'Escolha o tipo de estabelecimento e gere um estoque aleatório na hora, usando os itens e preços já cadastrados no app.'));

  if(!state._mestreLojaTipo) state._mestreLojaTipo = 'Ferreiro';
  const tabsRow = el('div',{class:'tab-grid'});
  Object.keys(TIPOS_LOJA).forEach(tipo=>{
    tabsRow.appendChild(el('button',{class: state._mestreLojaTipo===tipo?'on':'', onclick:()=>{state._mestreLojaTipo=tipo; render();}}, tipo));
  });
  wrap.appendChild(tabsRow);

  wrap.appendChild(el('button',{class:'btn', style:'margin-top:10px;', onclick:()=>{
    state._mestreLojaEstoque = TIPOS_LOJA[state._mestreLojaTipo]();
    render();
  }}, 'Gerar Estoque 🎲'));

  if(state._mestreLojaEstoque){
    const panel = el('div',{class:'panel faixa'}, el('h2',{}, state._mestreLojaTipo));
    const table = el('table',{class:'ataque-table'}, el('tr',{}, el('th',{},'Item'), el('th',{},'Preço')));
    state._mestreLojaEstoque.forEach(it=>{
      table.appendChild(el('tr',{}, el('td',{}, it.n), el('td',{}, it.preco)));
    });
    panel.appendChild(el('div',{class:'table-scroll'}, table));
    wrap.appendChild(panel);
  }
  return wrap;
}

// ---- CATÁLOGO COMPLETO (referência do Mestre — tudo, com preço, sem filtro de "jogador") ----
function renderMestreItens(){
  if(!state._mestreItensFiltro) state._mestreItensFiltro = {tipo:'armas', busca:'', categoria:'todas'};
  const itf = state._mestreItensFiltro;
  const wrap = el('div',{});

  wrap.appendChild(el('div',{class:'tip'}, el('b',{},'Consulta rápida'), 'Catálogo completo — inclusive itens e categorias que não aparecem pro jogador (serviços, refeições comuns etc.) e com os preços à vista, pra você consultar ou cobrar na hora.'));

  const tabsRow = el('div',{class:'tab-grid'});
  [['armas','Armas'],['armaduras','Defesas'],['esotericos','Esotéricos'],['pocoes','Poções Mágicas'],['gerais','Itens Gerais']].forEach(([id,label])=>{
    tabsRow.appendChild(el('button',{class: itf.tipo===id?'on':'', onclick:()=>{itf.tipo=id; itf.categoria='todas'; render();}}, label));
  });
  wrap.appendChild(tabsRow);

  wrap.appendChild(el('input',{id:'busca-mestre-itens', type:'text', placeholder:'buscar item pelo nome...', value:itf.busca, oninput:(e)=>{itf.busca=e.target.value; renderDebounced();}}));

  const results = el('div',{});

  if(itf.tipo==='armas'){
    const cats = ['todas','Simples','Marcial','Exótica','Arma de Fogo'];
    const sel = el('select',{onchange:(e)=>{itf.categoria=e.target.value; render();}});
    cats.forEach(c=> sel.appendChild(el('option',{value:c, ...(itf.categoria===c?{selected:'selected'}:{})}, c==='todas'?'Todas as categorias':c)));
    wrap.appendChild(sel);
    let list = ARMAS.filter(w => (itf.categoria==='todas'||w.cat===itf.categoria) && (!itf.busca || w.n.toLowerCase().includes(itf.busca.toLowerCase())));
    if(list.length===0) results.appendChild(el('div',{class:'empty'},'Nenhuma arma encontrada.'));
    list.forEach(w=>{
      results.appendChild(renderItemColapsavel('mestre-arma-'+w.n, w.n, w.preco, [
        el('div',{class:'desc'}, 'Dano '+w.dano+' · Crítico '+w.critico+' · '+w.tipo+' · Alcance: '+w.alcance+' · '+w.cat+' · '+w.esp+' esp. · '+(w.maos>=2?'2 mãos':'1 mão'))
      ]));
    });
  }

  if(itf.tipo==='armaduras'){
    let list = [...ARMADURAS, ...ESCUDOS].filter(a => !itf.busca || a.n.toLowerCase().includes(itf.busca.toLowerCase()));
    if(list.length===0) results.appendChild(el('div',{class:'empty'},'Nenhuma armadura/escudo encontrada.'));
    list.forEach(a=>{
      results.appendChild(renderItemColapsavel('mestre-armadura-'+a.n, a.n, a.preco, [
        el('div',{class:'desc'}, 'Defesa +'+a.def+' · Penalidade '+a.pen+' · '+a.esp+' espaços · '+a.cat)
      ]));
    });
  }

  if(itf.tipo==='esotericos'){
    let list = ITENS_ESOTERICOS.filter(i => !itf.busca || i.n.toLowerCase().includes(itf.busca.toLowerCase()));
    if(list.length===0) results.appendChild(el('div',{class:'empty'},'Nenhum esotérico encontrado.'));
    list.forEach(it=>{
      results.appendChild(renderItemColapsavel('mestre-esoterico-'+it.n, it.n, it.preco, [
        el('div',{class:'desc'}, it.desc),
        el('div',{class:'meta'}, it.maos+' mão'+(it.maos>1?'s':'')+' · '+it.esp+' esp.')
      ]));
    });
  }

  if(itf.tipo==='pocoes'){
    let list = POCOES_MAGICAS.filter(p => !itf.busca || p.nome.toLowerCase().includes(itf.busca.toLowerCase()));
    wrap.appendChild(el('div',{class:'tip', style:'font-size:0.8rem;'}, 'Poções (Tabela 8-12) contêm a magia real indicada — o efeito é o mesmo de lançar aquela magia. Círculo 1-2 = item menor, 3-4 = médio, 5 = maior.'));
    if(list.length===0) results.appendChild(el('div',{class:'empty'},'Nenhuma poção encontrada.'));
    list.slice().sort((a,b)=>a.preco-b.preco).forEach(p=>{
      results.appendChild(renderItemColapsavel('mestre-pocao-'+p.nome, p.nome, 'T$ '+p.preco, [
        el('div',{class:'desc'}, 'Contém a magia: '+p.magia+' ('+p.circulo+'º círculo)')
      ]));
    });
  }

  if(itf.tipo==='gerais'){
    const categorias = ['todas', ...new Set(ITENS_GERAIS.map(i=>i.cat))];
    const sel = el('select',{onchange:(e)=>{itf.categoria=e.target.value; render();}});
    categorias.forEach(c=> sel.appendChild(el('option',{value:c, ...(itf.categoria===c?{selected:'selected'}:{})}, c==='todas'?'Todas as categorias':c)));
    wrap.appendChild(sel);
    let list = ITENS_GERAIS.filter(i => (itf.categoria==='todas'||i.cat===itf.categoria) && (!itf.busca || i.n.toLowerCase().includes(itf.busca.toLowerCase())));
    if(list.length===0) results.appendChild(el('div',{class:'empty'},'Nenhum item encontrado.'));
    list.forEach(it=>{
      results.appendChild(renderItemColapsavel('mestre-geral-'+it.n, it.n+(it.vestivel?' 👕':''), it.preco+' · '+it.cat, [
        el('div',{class:'desc'}, it.desc)
      ]));
    });
  }

  wrap.appendChild(results);
  return wrap;
}

// ---- ITENS MÁGICOS (encantos, armas/armaduras específicas, acessórios, artefatos) ----
function renderMestreItensMagicos(){
  if(!state._mestreMagicosFiltro) state._mestreMagicosFiltro = {tipo:'encantosArma', busca:''};
  const itf = state._mestreMagicosFiltro;
  const wrap = el('div',{});

  wrap.appendChild(el('div',{class:'tip'}, el('b',{},'Sobre isso'), 'Referência das Tabelas 8-7 a 8-15 do livro. Os efeitos são únicos demais pra calcular automaticamente na ficha — use como consulta rápida e anote o efeito nas Notas do personagem que ganhar o item.'));

  const tabsRow = el('div',{class:'tab-grid'});
  [['encantosArma','Encantos (Arma)'],['armasEspecificas','Armas Específicas'],['encantosArmadura','Encantos (Defesa)'],['armadurasEspecificas','Defesas Específicas'],['acessoriosMenores','Acessórios Menores'],['acessoriosMedios','Acessórios Médios'],['acessoriosMaiores','Acessórios Maiores'],['artefatos','Artefatos']].forEach(([id,label])=>{
    tabsRow.appendChild(el('button',{class: itf.tipo===id?'on':'', onclick:()=>{itf.tipo=id; render();}}, label));
  });
  wrap.appendChild(tabsRow);

  wrap.appendChild(el('input',{id:'busca-mestre-magicos', type:'text', placeholder:'buscar pelo nome...', value:itf.busca, oninput:(e)=>{itf.busca=e.target.value; renderDebounced();}}));

  const results = el('div',{});
  const buscaOk = (nome)=> !itf.busca || nome.toLowerCase().includes(itf.busca.toLowerCase());

  if(itf.tipo==='encantosArma'){
    wrap.appendChild(el('div',{class:'tip', style:'font-size:0.78rem;'}, 'Item menor = 1 encanto · médio = 2 · maior = 3 (Tabela 8-7: '+PRECO_ENCANTOS.map(p=>p.n+' encanto(s) +T$'+p.preco+'/+CD'+p.cd).join(' · ')+').'));
    ENCANTOS_ARMA.filter(e=>buscaOk(e.nome)).forEach(e=>{
      results.appendChild(renderItemColapsavel('encanto-arma-'+e.nome, e.nome, e.dobraContagem?'conta como 2':'', [el('div',{class:'desc'}, e.efeito)]));
    });
  }
  if(itf.tipo==='armasEspecificas'){
    ARMAS_ESPECIFICAS.filter(a=>buscaOk(a.nome)).slice().sort((a,b)=>a.preco-b.preco).forEach(a=>{
      results.appendChild(renderItemColapsavel('arma-esp-'+a.nome, a.nome, 'T$ '+a.preco, [
        el('div',{class:'meta'}, 'Base: '+a.base),
        el('div',{class:'desc'}, a.desc)
      ]));
    });
  }
  if(itf.tipo==='encantosArmadura'){
    ENCANTOS_ARMADURA.filter(e=>buscaOk(e.nome)).forEach(e=>{
      results.appendChild(renderItemColapsavel('encanto-armadura-'+e.nome, e.nome, e.dobraContagem?'conta como 2':'', [el('div',{class:'desc'}, e.efeito)]));
    });
  }
  if(itf.tipo==='armadurasEspecificas'){
    ARMADURAS_ESPECIFICAS.filter(a=>buscaOk(a.nome)).slice().sort((a,b)=>a.preco-b.preco).forEach(a=>{
      results.appendChild(renderItemColapsavel('armadura-esp-'+a.nome, a.nome, 'T$ '+a.preco, [
        el('div',{class:'meta'}, 'Base: '+a.base),
        el('div',{class:'desc'}, a.desc)
      ]));
    });
  }
  if(itf.tipo==='acessoriosMenores'){
    ACESSORIOS_MENORES.filter(a=>buscaOk(a.nome)).forEach(a=>{
      results.appendChild(renderItemColapsavel('acessorio-menor-'+a.nome, a.nome, 'T$ '+a.preco, [el('div',{class:'desc'}, a.desc)]));
    });
  }
  if(itf.tipo==='acessoriosMedios'){
    ACESSORIOS_MEDIOS.filter(a=>buscaOk(a.nome)).forEach(a=>{
      results.appendChild(renderItemColapsavel('acessorio-medio-'+a.nome, a.nome, 'T$ '+a.preco, [el('div',{class:'desc'}, a.desc)]));
    });
  }
  if(itf.tipo==='acessoriosMaiores'){
    ACESSORIOS_MAIORES.filter(a=>buscaOk(a.nome)).forEach(a=>{
      results.appendChild(renderItemColapsavel('acessorio-maior-'+a.nome, a.nome, 'T$ '+a.preco, [el('div',{class:'desc'}, a.desc)]));
    });
  }
  if(itf.tipo==='artefatos'){
    wrap.appendChild(el('div',{class:'tip', style:'font-size:0.78rem;'}, 'Artefatos não têm tabela de sorteio nem preço — são relíquias únicas que só devem entrar na campanha por decisão sua.'));
    ARTEFATOS.filter(a=>buscaOk(a.nome)).forEach(a=>{
      results.appendChild(renderItemColapsavel('artefato-'+a.nome, a.nome, '', [el('div',{class:'desc'}, a.desc)]));
    });
  }

  wrap.appendChild(results);
  return wrap;
}

// ---- SORTEIO DE NOMES ----
function gerarNome(racaChave){
  const dados = NOMES_SILABAS[racaChave] || NOMES_SILABAS['Padrão'];
  const usaMeio = Math.random() < 0.6;
  let nome = sortear(dados.ini);
  if(usaMeio) nome += sortear(dados.meio);
  nome += sortear(dados.fim);
  return nome;
}

function renderMestreNomes(){
  const wrap = el('div',{});
  wrap.appendChild(el('div',{class:'tip'}, el('b',{},'Sobre esta ferramenta'), 'O livro não traz listas oficiais de nomes por raça — isto é um gerador de apoio próprio, com sílabas inspiradas no clima de Arton, pra dar um nome rápido a qualquer NPC.'));

  if(!state._mestreNomeRaca) state._mestreNomeRaca = 'Humano';
  const sel = el('select',{onchange:(e)=>{state._mestreNomeRaca=e.target.value; render();}});
  Object.keys(NOMES_SILABAS).forEach(r=> sel.appendChild(el('option',{value:r, ...(state._mestreNomeRaca===r?{selected:'selected'}:{})}, r)));
  wrap.appendChild(sel);

  wrap.appendChild(el('button',{class:'btn', style:'margin-top:10px;', onclick:()=>{
    const novos = [];
    for(let i=0;i<6;i++) novos.push(gerarNome(state._mestreNomeRaca));
    state._mestreNomesGerados = novos;
    render();
  }}, 'Sortear 6 Nomes 🎲'));

  if(state._mestreNomesGerados && state._mestreNomesGerados.length){
    const panel = el('div',{class:'panel faixa'}, el('h2',{},'Nomes sorteados'));
    state._mestreNomesGerados.forEach(nome=> panel.appendChild(el('div',{class:'power-item'}, nome)));
    wrap.appendChild(panel);
  }
  return wrap;
}
