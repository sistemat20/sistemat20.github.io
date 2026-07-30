// ============ TELA DO MESTRE — ferramentas de apoio para conduzir a sessão ============

function abrirTelaMestre(){
  state.screen = 'mestre';
  state.mestreCategoria = 'combate';
  state.mestreTab = 'combate';
  render();
  carregarPerfisTodosParaMestre().then(render);
  carregarDadosMestreDoServidor();
  iniciarAtualizacaoAutomaticaMestre();
}

// A cada poucos segundos, busca os dados mais recentes dos jogadores de novo — assim o Mestre
// vê PV/PM/condições mudarem quase na hora, sem precisar recarregar a página manualmente.
// Só atualiza a TELA se o Mestre não estiver com o dedo num campo de texto/número naquele
// instante (senão ia "puxar o tapete" no meio de uma digitação).
let _intervalAtualizacaoMestre = null;
function iniciarAtualizacaoAutomaticaMestre(){
  pararAtualizacaoAutomaticaMestre(); // garante que não fica duplicando o timer
  _intervalAtualizacaoMestre = setInterval(async ()=>{
    if(state.screen !== 'mestre') { pararAtualizacaoAutomaticaMestre(); return; }
    await carregarPerfisTodosParaMestre();
    const digitando = document.activeElement && ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName);
    if(!digitando) render();
  }, 5000);
}
function pararAtualizacaoAutomaticaMestre(){
  if(_intervalAtualizacaoMestre){ clearInterval(_intervalAtualizacaoMestre); _intervalAtualizacaoMestre = null; }
}

// As 9 telas do Mestre, agrupadas em 3 categorias — evita uma barra de abas gigante.
const CATEGORIAS_MESTRE = {
  combate: {label:'Combate', abas:[['combate','Combate'],['preparar','Preparar Encontro'],['grupo','Grupo']]},
  bestiario: {label:'Bestiário', abas:[['bestiario','Bestiário'],['npc','NPC Rápido'],['nomes','Nomes']]},
  recursos: {label:'Recursos', abas:[['tesouro','Tesouro'],['loja','Loja'],['itens','Itens'],['magicos','Itens Mágicos']]},
};

function renderMestreScreen(){
  const wrap = el('div',{});
  wrap.appendChild(el('header',{class:'top'},
    el('div',{style:'display:flex;justify-content:space-between;align-items:center;gap:10px;'},
      el('button',{class:'btn ghost', style:'width:auto;flex-shrink:0;padding:6px 12px;background:transparent;border-color:#f4efe2;color:#f4efe2;', onclick:()=>{ pararAtualizacaoAutomaticaMestre(); precisaCodigoJogador() ? sairDoCodigoJogador() : (state.screen='perfis', render()); }}, '← Perfis'),
      el('h1',{class:'display', style:'font-size:1.1rem;margin:0;'}, 'Mesa do Mestre'),
      botaoTema()
    ),
    el('div',{class:'sub'}, 'Bestiário, NPCs, tesouro, lojas e nomes — tudo pra conduzir a sessão')
  ));

  if(!state.mestreCategoria) state.mestreCategoria = 'combate';
  const navCategoria = el('nav',{class:'tab-grid'});
  Object.keys(CATEGORIAS_MESTRE).forEach(catId=>{
    navCategoria.appendChild(el('button',{class: state.mestreCategoria===catId?'on':'', onclick:()=>{
      state.mestreCategoria = catId;
      state.mestreTab = CATEGORIAS_MESTRE[catId].abas[0][0];
      render();
    }}, CATEGORIAS_MESTRE[catId].label));
  });
  wrap.appendChild(navCategoria);

  const nav = el('nav',{class:'tabs'});
  CATEGORIAS_MESTRE[state.mestreCategoria].abas.forEach(([id,label])=>{
    nav.appendChild(el('button',{class: state.mestreTab===id?'active':'', onclick:()=>{state.mestreTab=id; render();}}, label));
  });
  wrap.appendChild(nav);

  const main = el('main',{});
  if(state.mestreTab==='combate') main.appendChild(renderMestreCombate());
  if(state.mestreTab==='preparar') main.appendChild(renderMestrePreparar());
  if(state.mestreTab==='grupo') main.appendChild(renderMestreGrupo());
  if(state.mestreTab==='bestiario') main.appendChild(renderMestreBestiario());
  if(state.mestreTab==='npc') main.appendChild(renderMestreNpc());
  if(state.mestreTab==='tesouro') main.appendChild(renderMestreTesouro());
  if(state.mestreTab==='loja') main.appendChild(renderMestreLoja());
  if(state.mestreTab==='itens') main.appendChild(renderMestreItens());
  if(state.mestreTab==='magicos') main.appendChild(renderMestreItensMagicos());
  if(state.mestreTab==='nomes') main.appendChild(renderMestreNomes());
  wrap.appendChild(main);

  if(state._verFichaMestre){
    const p = (state.perfisTodos||[]).find(x=>x.id===state._verFichaMestre);
    if(p) wrap.appendChild(renderPopupFichaCompletaMestre(p));
    else state._verFichaMestre = null;
  }

  if(state.addMsg){
    wrap.appendChild(el('div',{id:'add-msg', style:'position:fixed; left:14px; right:14px; bottom:70px; max-width:692px; margin:0 auto; background:#3a2a1a; color:#f4efe2; padding:10px 14px; border-radius:4px; font-size:0.85rem; box-shadow:0 4px 12px rgba(0,0,0,0.35); z-index:50;'}, state.addMsg));
  }

  return wrap;
}

function ndTexto(nd){ return nd===0.5 ? '1/2' : String(nd); }

// Uma cor por "família" de tipo de criatura, pra reconhecer o tipo de ameaça numa olhada rápida
// na lista, sem precisar abrir cada card. Olha só a primeira palavra do tipo (antes do parênteses).
const COR_POR_TIPO_CRIATURA = {
  'Morto-vivo': '#7a8a7a',
  'Monstro': '#e0453a',
  'Espírito': '#6fb3e0',
  'Humanoide': '#d8bd74',
  'Animal': '#7fc45f',
  'Construto': '#9a9aa0',
  'Anão': '#d8bd74',
};
function corPorTipoCriatura(tipo){
  const primeira = String(tipo||'').split(' ')[0].split('(')[0].trim();
  return COR_POR_TIPO_CRIATURA[primeira] || 'var(--line)';
}

// ---- GRUPOS (controlados 100% pelo Mestre — nada muda na ficha do jogador) ----
// O Mestre cria um grupo com um nome e escolhe, entre os personagens já existentes no banco,
// quais fazem parte dele. Fica salvo na planilha (aba MestreDados), então sincroniza com
// qualquer aparelho que entre com o mesmo código de Mestre. As ferramentas (Grupo, Iniciativa,
// Tesouro) sempre respeitam o grupo selecionado no momento.
const CHAVE_MESTRE_GRUPO_FILTRO = 'painel_aventureiro_mestre_grupo_filtro';
function carregarGruposSalvos(){
  if(!state._mestreGrupos) state._mestreGrupos = []; // valor provisório até o servidor responder
}
function carregarEncontrosSalvos(){
  if(!state._mestreEncontrosSalvos) state._mestreEncontrosSalvos = []; // idem
}
// Busca do servidor Grupos + Encontros Salvos juntos (ficam na mesma linha) — chamada uma vez
// ao entrar na tela do Mestre.
async function carregarDadosMestreDoServidor(){
  const dados = await carregarMestreDadosArmazenamento();
  state._mestreGrupos = dados.grupos || [];
  state._mestreEncontrosSalvos = dados.encontrosSalvos || [];
  state._mestreDadosCarregados = true;
  render();
}
// Salva Grupos + Encontros Salvos juntos no servidor — chamada sempre que qualquer um dos dois
// muda. É "dispara e esquece": a UI já foi atualizada localmente antes de chamar isso.
async function salvarDadosMestreNoServidor(){
  await salvarMestreDadosArmazenamento({
    grupos: state._mestreGrupos||[],
    encontrosSalvos: state._mestreEncontrosSalvos||[],
  });
}
function salvarGruposLocal(){ salvarDadosMestreNoServidor(); }
function personagensDoGrupoAtual(){
  carregarGruposSalvos();
  const todos = state.perfisTodos || [];
  if(!state._mestreGrupoFiltro || state._mestreGrupoFiltro==='__todos__') return todos;
  const grupo = state._mestreGrupos.find(g=>g.id===state._mestreGrupoFiltro);
  if(!grupo) return todos;
  return todos.filter(p=> grupo.membrosIds.includes(p.id));
}
function renderFiltroMesa(){
  carregarGruposSalvos();
  if(state._mestreGrupoFiltro==null){
    try{ state._mestreGrupoFiltro = localStorage.getItem(CHAVE_MESTRE_GRUPO_FILTRO) || '__todos__'; }
    catch(e){ state._mestreGrupoFiltro = '__todos__'; }
  }
  if(state._mestreGrupos.length===0) return null; // nenhum grupo criado ainda — filtro não faz sentido mostrar
  const sel = el('select',{onchange:(e)=>{
    state._mestreGrupoFiltro = e.target.value;
    try{ localStorage.setItem(CHAVE_MESTRE_GRUPO_FILTRO, e.target.value); }catch(err){}
    render();
  }},
    el('option',{value:'__todos__', ...(state._mestreGrupoFiltro==='__todos__'?{selected:'selected'}:{})}, 'Todos os personagens'),
    ...state._mestreGrupos.map(g=> el('option',{value:g.id, ...(state._mestreGrupoFiltro===g.id?{selected:'selected'}:{})}, g.nome)),
  );
  return el('div',{style:'margin-bottom:10px;'}, sel);
}

// Painel de criar/editar um grupo — escolhe nome e marca quais personagens (de todo o banco)
// fazem parte. state._mestreGrupoEditando guarda {id, nome, membrosIds} enquanto edita (id=null
// se for um grupo novo ainda não salvo).
function renderGerenciarGrupos(){
  carregarGruposSalvos();
  const wrap = el('div',{class:'panel'});

  if(state._mestreGrupoEditando){
    const ge = state._mestreGrupoEditando;
    wrap.appendChild(el('h2',{}, ge.id ? 'Editando grupo' : 'Criar novo grupo'));
    wrap.appendChild(el('label',{},'Nome do grupo'));
    wrap.appendChild(el('input',{id:'nome-novo-grupo', type:'text', placeholder:'ex: Mesa de Sexta', value:ge.nome, oninput:(e)=>{ge.nome=e.target.value;}}));
    wrap.appendChild(el('div',{class:'meta', style:'margin-top:10px;'}, 'Quem faz parte:'));
    const todos = state.perfisTodos || [];
    if(todos.length===0){
      wrap.appendChild(el('div',{class:'empty'},'Nenhum personagem encontrado no banco ainda.'));
    }
    todos.forEach(p=>{
      const marcado = ge.membrosIds.includes(p.id);
      wrap.appendChild(el('button',{class:'option-card '+(marcado?'selected':''), style:'width:100%;text-align:left;margin-top:6px;', onclick:()=>{
        ge.membrosIds = marcado ? ge.membrosIds.filter(id=>id!==p.id) : [...ge.membrosIds, p.id];
        render();
      }},
        el('div',{class:'opt-nome'}, p.nome),
        el('div',{class:'opt-sub'}, p.jogador||p._playerId||'?')
      ));
    });
    wrap.appendChild(el('div',{class:'row', style:'margin-top:10px;'},
      el('button',{class:'btn', onclick:()=>{
        if(!ge.nome.trim()) return;
        if(ge.id){
          const idx = state._mestreGrupos.findIndex(g=>g.id===ge.id);
          if(idx>=0) state._mestreGrupos[idx] = {id:ge.id, nome:ge.nome.trim(), membrosIds:ge.membrosIds};
        } else {
          state._mestreGrupos.push({id:'g'+Date.now(), nome:ge.nome.trim(), membrosIds:ge.membrosIds});
        }
        salvarGruposLocal();
        state._mestreGrupoEditando = null;
        flashMsg('✅ Grupo "'+ge.nome.trim()+'" salvo!');
        render();
      }}, 'Salvar grupo'),
      el('button',{class:'btn ghost', onclick:()=>{ state._mestreGrupoEditando=null; render(); }}, 'Cancelar')
    ));
    return wrap;
  }

  wrap.appendChild(el('h2',{},'Grupos'));
  if(state._mestreGrupos.length===0){
    wrap.appendChild(el('div',{class:'tip', style:'font-size:0.78rem;'}, 'Nenhum grupo criado ainda. Se você só roda uma mesa, não precisa criar nenhum — todos os personagens já aparecem juntos. Crie grupos só se administrar mais de uma mesa no mesmo banco.'));
  }
  state._mestreGrupos.forEach(g=>{
    wrap.appendChild(el('div',{class:'row', style:'align-items:center;margin-top:6px;'},
      el('div',{style:'flex:1;font-weight:700;'}, g.nome+' ('+g.membrosIds.length+' personagem'+(g.membrosIds.length!==1?'ns':'')+')'),
      el('button',{class:'btn ghost', style:'width:auto;padding:4px 10px;', onclick:()=>{ state._mestreGrupoEditando = {id:g.id, nome:g.nome, membrosIds:g.membrosIds.slice()}; render(); }}, 'Editar'),
      el('button',{class:'remove-x', onclick:()=>{
        if(!confirm('Excluir o grupo "'+g.nome+'"? Isso não apaga nenhum personagem, só o agrupamento.')) return;
        state._mestreGrupos = state._mestreGrupos.filter(x=>x.id!==g.id);
        salvarGruposLocal();
        if(state._mestreGrupoFiltro===g.id) state._mestreGrupoFiltro='__todos__';
        flashMsg('🗑️ Grupo "'+g.nome+'" excluído.');
        render();
      }},'✕')
    ));
  });
  wrap.appendChild(el('button',{class:'btn', style:'margin-top:10px;', onclick:()=>{
    state._mestreGrupoEditando = {id:null, nome:'', membrosIds:[]};
    render();
  }}, 'Criar novo grupo +'));
  return wrap;
}

// ---- VISÃO GERAL DO GRUPO ----
function ajustarValorMestre(p, campo, campoMax, delta){
  const atual = parseInt(p[campo])||0;
  let max;
  if(campoMax==='pvmax') max = pvMaxEfetivo(p);
  else if(campoMax==='pmmax') max = pmMaxEfetivo(p);
  else max = campoMax ? (parseInt(p[campoMax])||atual) : Infinity;
  const minimo = (campo==='pvatual') ? limiteMortePv(p) : 0;
  const novo = Math.max(minimo, Math.min(max, atual+delta));
  if(campo==='pvatual' && delta<0 && novo<=0) p.estabilizado = false;
  if(campo==='pvatual' && novo>0) p.estabilizado = false;
  p[campo] = novo;
}
// Sempre que o Mestre grava algo num personagem (PV/PM, item, tesouro...), resincroniza a lista
// inteira com o servidor na hora — não espera o ciclo de 5s da atualização automática. Assim o
// que o Mestre acabou de fazer nunca fica "escondido" até o próximo tick do polling.
async function atualizarPersonagemEResincronizar(p){
  const ok = await mestreAtualizarPersonagem(p);
  if(ok){ await carregarPerfisTodosParaMestre(); render(); }
  return ok;
}
async function salvarAjustePersonagemMestre(p){
  const ok = await atualizarPersonagemEResincronizar(p);
  if(!ok) flashMsg('⚠ Não consegui salvar agora — tenta de novo em instantes.');
}

// Monta um combatente a partir de um personagem, já com o bônus de Iniciativa real dele —
// usado no Grupo, na Preparação e em qualquer outro lugar que precise adicionar um PJ.
function criarCombatentePj(p){
  const iniciativaObj = PERICIAS.find(x=>x.nome==='Iniciativa');
  const bonus = iniciativaObj ? periciaValor(p, iniciativaObj) : 0;
  return novoCombatente(p.nome, 'pj', bonus, p.pvatual, pvMaxEfetivo(p), p.foto, p.id);
}

// Popup só-leitura com um resumo bem completo da ficha — pro Mestre conferir tudo sem precisar
// pedir pro jogador ou navegar pela ficha dele campo por campo.
function renderPopupFichaCompletaMestre(p){
  const overlay = el('div',{class:'menu-overlay', onclick:(e)=>{ if(e.target===e.currentTarget){ state._verFichaMestre=null; render(); } }});
  const sheet = el('div',{class:'menu-sheet', style:'max-width:480px;text-align:left;'});
  const nivel = nivelTotal(p);
  const classesTxt = (p.classesNiveis||[]).map(c=>iconeClasse(c.classe)+' '+c.classe+' '+c.nivel).join(' / ') || '—';

  sheet.appendChild(el('div',{class:'wizard-title', style:'padding:6px 14px 0;'}, p.nome));
  sheet.appendChild(el('div',{class:'tip', style:'margin:4px 14px 10px;'},
    (p.jogador||p._playerId||'?')+' · '+(p.raca||'—')+' · '+classesTxt+' · Nível total '+nivel
  ));

  const grid3 = el('div',{class:'row3', style:'margin:0 14px 10px;'},
    el('div',{}, el('div',{class:'meta'},'PV'), el('div',{style:'font-weight:800;'}, (p.pvatual||0)+'/'+pvMaxEfetivo(p))),
    el('div',{}, el('div',{class:'meta'},'PM'), el('div',{style:'font-weight:800;'}, (p.pmatual||0)+'/'+pmMaxEfetivo(p))),
    el('div',{}, el('div',{class:'meta'},'Defesa'), el('div',{style:'font-weight:800;'}, defesaTotal(p))),
  );
  sheet.appendChild(grid3);
  const grid3b = el('div',{class:'row3', style:'margin:0 14px 12px;'},
    el('div',{}, el('div',{class:'meta'},'Deslocamento'), el('div',{style:'font-weight:800;'}, deslocamentoEfetivo(p)+'m')),
    el('div',{}, el('div',{class:'meta'},'Carga'), el('div',{style:'font-weight:800;'+(sobrecarregado(p)?'color:var(--red-bright);':'')}, cargaUsada(p)+'/'+cargaMaxima(p))),
    el('div',{}, el('div',{class:'meta'},'Moedas'), el('div',{style:'font-weight:800;'}, (p.ts||0)+' T$')),
  );
  sheet.appendChild(grid3b);

  if(estaMorto(p)) sheet.appendChild(el('div',{class:'tip', style:'margin:0 14px 8px;color:var(--red-bright);'}, '💀 Morto'));
  else if(estaInconsciente(p)) sheet.appendChild(el('div',{class:'tip', style:'margin:0 14px 8px;color:var(--red-bright);'}, p.estabilizado?'😵 Inconsciente (estabilizado)':'🩸 Inconsciente e sangrando'));
  if(condicoesAtivas(p).length>0) sheet.appendChild(el('div',{class:'tip', style:'margin:0 14px 8px;color:var(--gold);'}, '🩹 Condições: '+condicoesAtivas(p).join(', ')));

  // Atributos
  sheet.appendChild(el('div',{class:'wizard-title', style:'font-size:0.85rem;padding:6px 14px 4px;'},'Atributos'));
  const gridAttr = el('div',{style:'display:grid;grid-template-columns:repeat(6,1fr);gap:4px;margin:0 14px 12px;text-align:center;'});
  [['For','for'],['Des','des'],['Con','con'],['Int','int'],['Sab','sab'],['Car','car']].forEach(([label,campo])=>{
    const v = parseInt(p[campo])||0;
    gridAttr.appendChild(el('div',{},
      el('div',{class:'meta'}, label),
      el('div',{style:'font-weight:800;'}, (v>=0?'+':'')+v)
    ));
  });
  sheet.appendChild(gridAttr);

  // Perícias treinadas
  const treinadas = periciasTreinadasComDivindade(p);
  sheet.appendChild(el('div',{class:'wizard-title', style:'font-size:0.85rem;padding:6px 14px 4px;'},'Perícias treinadas ('+treinadas.size+')'));
  const listaPer = PERICIAS.filter(per=>treinadas.has(per.nome));
  sheet.appendChild(el('div',{class:'tip', style:'margin:0 14px 12px;font-size:0.8rem;'},
    listaPer.length ? listaPer.map(per=>per.nome+' ('+(periciaValor(p,per)>=0?'+':'')+periciaValor(p,per)+')').join(', ') : 'nenhuma'
  ));

  // Armas equipadas
  sheet.appendChild(el('div',{class:'wizard-title', style:'font-size:0.85rem;padding:6px 14px 4px;'},'Armas equipadas'));
  sheet.appendChild(el('div',{class:'tip', style:'margin:0 14px 12px;font-size:0.8rem;'},
    (p.armas||[]).length ? (p.armas||[]).map(a=>a.nome).join(', ') : 'nenhuma'
  ));

  // Armadura/escudo
  sheet.appendChild(el('div',{class:'wizard-title', style:'font-size:0.85rem;padding:6px 14px 4px;'},'Armadura & Escudo'));
  sheet.appendChild(el('div',{class:'tip', style:'margin:0 14px 12px;font-size:0.8rem;'},
    (p.armadura?p.armadura.nome:'sem armadura')+' · '+(p.escudo?p.escudo.nome:'sem escudo')
  ));

  // Poderes (nomes só, resumido)
  const nomesPoderes = nomesPoderesConhecidos(p);
  sheet.appendChild(el('div',{class:'wizard-title', style:'font-size:0.85rem;padding:6px 14px 4px;'},'Poderes ('+nomesPoderes.length+')'));
  sheet.appendChild(el('div',{class:'tip', style:'margin:0 14px 12px;font-size:0.8rem;'}, nomesPoderes.length?nomesPoderes.join(', '):'nenhum'));

  // Magias
  if((p.magias||[]).length>0){
    sheet.appendChild(el('div',{class:'wizard-title', style:'font-size:0.85rem;padding:6px 14px 4px;'},'Magias conhecidas ('+p.magias.length+')'));
    sheet.appendChild(el('div',{class:'tip', style:'margin:0 14px 12px;font-size:0.8rem;'}, p.magias.map(m=>m.n).join(', ')));
  }

  // Mochila
  sheet.appendChild(el('div',{class:'wizard-title', style:'font-size:0.85rem;padding:6px 14px 4px;'},'Mochila ('+(p.equip||[]).length+' itens)'));
  sheet.appendChild(el('div',{class:'tip', style:'margin:0 14px 12px;font-size:0.8rem;'},
    (p.equip||[]).length ? (p.equip||[]).map(it=>it.item+(it.qtd&&it.qtd!=='1'?' x'+it.qtd:'')).join(', ') : 'vazia'
  ));

  sheet.appendChild(el('div',{class:'tip', style:'margin:0 14px 8px;'}, el('b',{},'Divindade: '), p.divindade||'sem fé'));

  sheet.appendChild(el('button',{class:'menu-close', onclick:()=>{ state._verFichaMestre=null; render(); }}, 'Fechar'));

  overlay.appendChild(sheet);
  return overlay;
}

function renderMestreGrupo(){
  const wrap = el('div',{});
  wrap.appendChild(el('div',{class:'tip'}, el('b',{},'Como usar'), 'Toque nos números de PV/PM pra ajustar na hora — as mudanças já vão direto pra ficha do jogador. Útil pra aplicar dano em massa ou conferir quem está no vermelho sem pedir pra cada um.'));

  wrap.appendChild(renderGerenciarGrupos());

  const filtroEl = renderFiltroMesa();
  if(filtroEl) wrap.appendChild(filtroEl);

  const todos = personagensDoGrupoAtual();
  if(todos.length===0){
    wrap.appendChild(el('div',{class:'empty'}, (state.perfisTodos||[]).length>0 ? 'Nenhum personagem nessa mesa.' : 'Nenhum personagem de jogador encontrado ainda — assim que alguém criar a ficha, aparece aqui.'));
    return wrap;
  }

  wrap.appendChild(el('div',{class:'row', style:'margin-bottom:10px;'},
    el('button',{class:'btn', style:'flex:1;width:auto;', onclick:()=>{ todos.forEach(p=> enviarParaCombate(criarCombatentePj(p))); }}, 'Grupo pro Combate ⚔️'),
    el('button',{class:'btn ghost', style:'flex:1;width:auto;', onclick:()=>{ todos.forEach(p=> enviarParaPreparacao(criarCombatentePj(p))); }}, 'Grupo pro Preparado 📋')
  ));

  todos.forEach(p=>{
    const nivel = nivelTotal(p);
    const classesTxt = (p.classesNiveis||[]).map(c=>c.classe+' '+c.nivel).join(' / ') || '—';
    const pvMaxEf = pvMaxEfetivo(p);
    const pvPct = pvMaxEf ? Math.max(0, Math.min(100, (p.pvatual||0)/pvMaxEf*100)) : 0;
    const pmMaxEf = pmMaxEfetivo(p);
    const pmPct = pmMaxEf ? Math.max(0, Math.min(100, (p.pmatual||0)/pmMaxEf*100)) : 0;
    const faixaPv = faixaPerigoStat(pvPct);
    const critico = faixaPv === 'critico';
    const card = el('div',{class:'panel faixa', style: critico ? 'border-color:var(--red-bright);' : ''},
      el('div',{style:'display:flex;gap:12px;align-items:center;cursor:pointer;', onclick:()=>{ state._verFichaMestre = p.id; render(); }},
        el('div',{style:'width:52px;height:52px;border-radius:50%;overflow:hidden;flex-shrink:0;background:var(--card-2);display:flex;align-items:center;justify-content:center;font-size:1.4rem;'},
          p.foto ? el('img',{src:p.foto, style:'width:100%;height:100%;object-fit:cover;'}) : '👤'
        ),
        el('div',{style:'flex:1;min-width:0;'},
          el('div',{style:'font-family:Cinzel,serif;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;'}, p.nome),
          el('div',{class:'meta'}, (p.jogador||p._playerId||'?')+' · Nível '+nivel+' · '+classesTxt),
          estaMorto(p) ? el('div',{style:'color:var(--red-bright);font-weight:700;font-size:0.78rem;margin-top:2px;'}, '💀 Morto') :
          estaInconsciente(p) ? el('div',{style:'color:var(--red-bright);font-weight:700;font-size:0.78rem;margin-top:2px;'}, p.estabilizado ? '😵 Inconsciente (estabilizado)' : '🩸 Inconsciente e sangrando') : null,
          condicoesAtivas(p).length>0 ? el('div',{style:'color:var(--gold);font-size:0.75rem;margin-top:2px;'}, '🩹 '+condicoesAtivas(p).join(', ')) : null
        )
      ),
      (estaInconsciente(p) && !p.estabilizado) ? el('button',{class:'btn ghost', style:'margin-top:8px;', onclick:()=>{ estabilizarPersonagem(p); salvarAjustePersonagemMestre(p); render(); }}, '✅ Passou — Estabilizar') : null,
      el('div',{class:'row3', style:'margin-top:10px;'},
        el('div',{},
          el('label',{},'PV'),
          el('div',{style:'display:flex;align-items:center;gap:6px;'},
            el('button',{class:'btn ghost', style:'padding:2px 10px;width:auto;', onclick:()=>{ ajustarValorMestre(p,'pvatual','pvmax',-1); salvarAjustePersonagemMestre(p); render(); }}, '−'),
            el('div',{style:'font-weight:800;min-width:56px;text-align:center;'+(critico?'color:var(--red-bright);':'')}, (p.pvatual||0)+'/'+pvMaxEf),
            el('button',{class:'btn ghost', style:'padding:2px 10px;width:auto;', onclick:()=>{ ajustarValorMestre(p,'pvatual','pvmax',1); salvarAjustePersonagemMestre(p); render(); }}, '+')
          ),
          el('div',{class:'stat-bar', style:'margin-top:4px;'}, el('div',{class:'stat-bar-fill '+faixaPv, style:'width:'+pvPct+'%;'}))
        ),
        el('div',{},
          el('label',{},'PM'),
          el('div',{style:'display:flex;align-items:center;gap:6px;'},
            el('button',{class:'btn ghost', style:'padding:2px 10px;width:auto;', onclick:()=>{ ajustarValorMestre(p,'pmatual','pmmax',-1); salvarAjustePersonagemMestre(p); render(); }}, '−'),
            el('div',{style:'font-weight:800;min-width:56px;text-align:center;'}, (p.pmatual||0)+'/'+pmMaxEf),
            el('button',{class:'btn ghost', style:'padding:2px 10px;width:auto;', onclick:()=>{ ajustarValorMestre(p,'pmatual','pmmax',1); salvarAjustePersonagemMestre(p); render(); }}, '+')
          ),
          el('div',{class:'stat-bar', style:'margin-top:4px;'}, el('div',{class:'stat-bar-fill', style:'width:'+pmPct+'%;background:linear-gradient(90deg, #3d7ea6, #6fb3e0);'}))
        ),
        el('div',{},
          el('label',{},'Moedas'),
          el('div',{style:'font-weight:700;font-size:0.85rem;'}, (p.ts||0)+' T$')
        )
      ),
      botoesEnviarCombatente(()=>criarCombatentePj(p))
    );
    wrap.appendChild(card);
  });

  return wrap;
}
// Junta todas as criaturas do Livro Básico + Ameaças de Arton numa lista só, pra buscar por nome
// na hora de montar o combate.
function todasCriaturasParaBusca(){
  const lista = MONSTROS.map(m=> ({nome:m.nome, pv:m.pv, sentidos:m.sentidos, tipo:m.tipo}));
  AMEACAS_CATEGORIAS.forEach(cat=> cat.criaturas.forEach(m=> lista.push({nome:m.nome, pv:m.pv, sentidos:m.sentidos, tipo:m.tipo})));
  return lista;
}
// Junta os objetos COMPLETOS de todas as criaturas (Livro Básico + Ameaças de Arton), cada uma
// com o ND, pra poder sortear um encontro compatível com o nível do grupo.
function todasCriaturasCompletas(){
  const lista = MONSTROS.slice();
  AMEACAS_CATEGORIAS.forEach(cat=> cat.criaturas.forEach(m=> lista.push(m)));
  return lista;
}
// Extrai o bônus de "Iniciativa +N" do texto de sentidos de uma criatura do bestiário.
function extrairBonusIniciativa(sentidos){
  const m = String(sentidos||'').match(/Iniciativa\s*([+-]\d+)/);
  return m ? parseInt(m[1]) : 0;
}
function rolarD20(){ return 1 + Math.floor(Math.random()*20); }
// Duas funções centrais de envio, reusadas no Bestiário, NPC Rápido e Grupo — sempre a mesma
// lógica, então um combatente enviado de qualquer lugar se comporta igual.
function enviarParaPreparacao(combatente){
  if(!state._mestrePreparacao) state._mestrePreparacao = {combatentes:[]};
  state._mestrePreparacao.combatentes.push(combatente);
  flashMsg('📋 '+combatente.nome+' adicionado à Preparação.');
  render();
}
function enviarParaCombate(combatente){
  if(!state._mestreIniciativa) state._mestreIniciativa = {combatentes:[], turnoIdx:0, rodada:1};
  inserirOrdenadoPorIniciativa(state._mestreIniciativa.combatentes, combatente);
  flashMsg('⚔️ '+combatente.nome+' adicionado ao Combate.');
  render();
}
// Par de botões padrão "Enviar pro Combate" / "Enviar pro Preparado" — usado nos 3 lugares.
function botoesEnviarCombatente(criarCombatente){
  return el('div',{class:'row', style:'margin-top:8px;'},
    el('button',{class:'btn', style:'flex:1;width:auto;', onclick:()=> enviarParaCombate(criarCombatente())}, 'Combate ⚔️'),
    el('button',{class:'btn ghost', style:'flex:1;width:auto;', onclick:()=> enviarParaPreparacao(criarCombatente())}, 'Preparado 📋')
  );
}
// Insere um combatente na posição certa de uma lista (por iniciativa, decrescente) — usado só
// na hora de "enviar pro combate"; depois disso a ordem vira manual (setinhas), não se reordena
// mais sozinha, pra não bagunçar ajustes que o Mestre já tenha feito na mesa.
function inserirOrdenadoPorIniciativa(lista, combatente){
  const idx = lista.findIndex(c=> c.iniciativa < combatente.iniciativa);
  if(idx===-1) lista.push(combatente);
  else lista.splice(idx, 0, combatente);
}

// Mostra a foto de verdade do jogador (quando existe) em vez de um ícone genérico — só monstros
// e avulsos (sem ficha) usam o emoji mesmo.
function avatarCombatente(c, tamanho){
  if(c.foto){
    return el('img',{src:c.foto, style:'width:'+tamanho+'px;height:'+tamanho+'px;border-radius:50%;object-fit:cover;'});
  }
  const icone = c.tipo==='pj' ? '🧑' : (c.tipo==='monstro' ? '👹' : (c.tipo==='npc' ? '🎭' : '❔'));
  return el('div',{style:'font-size:'+(tamanho*0.75)+'px;line-height:1;'}, icone);
}

function novoCombatente(nome, tipo, bonusIniciativa, pv, pvMax, foto, dadosOuId){
  return {
    id: 'c'+Date.now()+Math.floor(Math.random()*10000),
    nome, tipo, foto: foto||null, // 'pj' | 'monstro' | 'custom'
    dados: tipo==='monstro' ? (dadosOuId||null) : null, // ficha completa da criatura, pro acordeão
    origemId: tipo==='pj' ? (dadosOuId||null) : null, // id do personagem, pra puxar dado ao vivo (condições, Defesa...)
    iniciativa: rolarD20() + (bonusIniciativa||0),
    pv: pv!=null ? pv : 0,
    pvMax: pvMax!=null ? pvMax : (pv!=null?pv:0),
  };
}

// ---- ENCONTRO ALEATÓRIO ----
// NDs válidos no sistema (os "fracionários" primeiro, depois inteiros até 20).
const NDS_VALIDOS = [0.25, 0.5, 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20];
function ndMaisProximo(alvo){
  return NDS_VALIDOS.reduce((melhor, nd)=> Math.abs(nd-alvo) < Math.abs(melhor-alvo) ? nd : melhor, NDS_VALIDOS[0]);
}
function nivelMedioDoGrupoAtual(){
  const membros = personagensDoGrupoAtual();
  if(membros.length===0) return 1;
  const soma = membros.reduce((s,p)=> s+nivelTotal(p), 0);
  return Math.max(1, Math.round(soma/membros.length));
}
function renderEncontroAleatorio(combate){
  const panel = el('div',{class:'panel faixa'}, el('h2',{},'Encontro Aleatório 🎲'));
  const nivelGrupo = nivelMedioDoGrupoAtual();
  panel.appendChild(el('div',{class:'tip', style:'font-size:0.78rem;'}, 'Nível médio do grupo atual: '+nivelGrupo+'. Sorteia 1 criatura do bestiário inteiro (Livro Básico + Ameaças de Arton) com ND perto do escolhido — regra da pág. 282 do livro básico (ND = nível do grupo é um combate equilibrado pra 4 personagens).'));

  if(!state._mestreEncontroDificuldade) state._mestreEncontroDificuldade = 'equilibrado';
  const opcoes = [
    ['facil','Fácil', ndMaisProximo(nivelGrupo-3)],
    ['equilibrado','Equilibrado', ndMaisProximo(nivelGrupo)],
    ['dificil','Difícil', ndMaisProximo(nivelGrupo+3)],
  ];
  const tabsRow = el('div',{class:'tab-grid'});
  opcoes.forEach(([id,label,nd])=>{
    tabsRow.appendChild(el('button',{class: state._mestreEncontroDificuldade===id?'on':'', onclick:()=>{state._mestreEncontroDificuldade=id; render();}}, label+' (ND '+ndTexto(nd)+')'));
  });
  panel.appendChild(tabsRow);

  panel.appendChild(el('button',{class:'btn', style:'margin-top:10px;', onclick:()=>{
    const escolha = opcoes.find(o=>o[0]===state._mestreEncontroDificuldade);
    const ndAlvo = escolha[2];
    const todas = todasCriaturasCompletas();
    let candidatas = todas.filter(m=> Math.abs(m.nd - ndAlvo) <= 1);
    let tolerancia = 1;
    while(candidatas.length===0 && tolerancia < 20){
      tolerancia += 1;
      candidatas = todas.filter(m=> Math.abs(m.nd - ndAlvo) <= tolerancia);
    }
    state._mestreEncontroResultado = candidatas[Math.floor(Math.random()*candidatas.length)];
    render();
  }}, 'Sortear criatura 🎲'));

  if(state._mestreEncontroResultado){
    const m = state._mestreEncontroResultado;
    panel.appendChild(el('div',{style:'margin-top:10px;'}, renderItemColapsavel('encontro-sorteado', m.nome, 'ND '+ndTexto(m.nd), renderStatBlockCriatura(m), corPorTipoCriatura(m.tipo))));
    panel.appendChild(el('div',{class:'row', style:'margin-top:8px;'},
      el('button',{class:'btn', onclick:()=>{
        const bonus = extrairBonusIniciativa(m.sentidos);
        combate.combatentes.push(novoCombatente(m.nome, 'monstro', bonus, m.pv, m.pv));
        flashMsg('⚔️ '+m.nome+' adicionado!');
        render();
      }}, 'Adicionar à Iniciativa ⚔️'),
      el('button',{class:'btn ghost', onclick:()=>{
        const escolha = opcoes.find(o=>o[0]===state._mestreEncontroDificuldade);
        const ndAlvo = escolha[2];
        const todas = todasCriaturasCompletas();
        let candidatas = todas.filter(x=> Math.abs(x.nd - ndAlvo) <= 1 && x.nome!==m.nome);
        if(candidatas.length===0) candidatas = todas.filter(x=>x.nome!==m.nome);
        state._mestreEncontroResultado = candidatas[Math.floor(Math.random()*candidatas.length)];
        render();
      }}, 'Sortear outro')
    ));
  }
  return panel;
}

// ---- BIBLIOTECA DE ENCONTROS SALVOS (+ construtor manual) ----
// O Mestre monta um encontro escolhendo criaturas do bestiário (com quantidade cada), dá um
// nome, e salva — fica guardado na planilha (junto com Grupos), pra usar em qualquer sessão
// futura sem precisar montar tudo de novo. "Usar agora" joga tudo direto na Iniciativa atual.
function salvarEncontrosLocal(){ salvarDadosMestreNoServidor(); }

function renderEncontrosSalvos(combate){
  carregarEncontrosSalvos();
  const wrap = el('div',{class:'panel'}, el('h2',{},'Encontros Salvos'));

  if(state._mestreEncontroRascunho){
    // ---- Modo construtor: montando um encontro novo ----
    const rasc = state._mestreEncontroRascunho;
    wrap.appendChild(el('div',{class:'tip', style:'font-size:0.78rem;'}, 'Busque criaturas do bestiário inteiro e monte a combinação que quiser. Dá pra repetir a mesma criatura (ex: 3 goblins).'));
    wrap.appendChild(el('label',{},'Nome do encontro'));
    wrap.appendChild(el('input',{id:'nome-encontro-rascunho', type:'text', placeholder:'ex: Emboscada de Goblins', value:rasc.nome, oninput:(e)=>{rasc.nome=e.target.value;}}));

    if(rasc.criaturas.length>0){
      wrap.appendChild(el('div',{class:'meta', style:'margin-top:8px;'}, 'Nesse encontro:'));
      rasc.criaturas.forEach((c,idx)=>{
        wrap.appendChild(el('div',{class:'row', style:'align-items:center;margin-top:4px;'},
          el('div',{style:'flex:1;'}, c.nome+' (ND '+ndTexto(c.nd)+')'),
          el('button',{class:'remove-x', onclick:()=>{ rasc.criaturas.splice(idx,1); render(); }},'✕')
        ));
      });
    }

    if(!state._mestreEncontroRascunhoBusca) state._mestreEncontroRascunhoBusca = '';
    wrap.appendChild(el('input',{id:'busca-encontro-rascunho', type:'text', placeholder:'buscar criatura pra adicionar...', style:'margin-top:10px;', value:state._mestreEncontroRascunhoBusca, oninput:(e)=>{state._mestreEncontroRascunhoBusca=e.target.value; renderDebounced();}}));
    if(state._mestreEncontroRascunhoBusca.length>=2){
      const encontrados = todasCriaturasCompletas().filter(m=> m.nome.toLowerCase().includes(state._mestreEncontroRascunhoBusca.toLowerCase())).slice(0,8);
      encontrados.forEach(m=>{
        wrap.appendChild(el('button',{class:'option-card', style:'width:100%;margin-top:6px;text-align:left;border-left:4px solid '+corPorTipoCriatura(m.tipo)+';', onclick:()=>{
          rasc.criaturas.push({nome:m.nome, nd:m.nd, pv:m.pv, sentidos:m.sentidos});
          state._mestreEncontroRascunhoBusca='';
          render();
        }},
          el('div',{class:'opt-nome'}, m.nome),
          el('div',{class:'opt-sub'}, 'ND '+ndTexto(m.nd)+' · PV '+m.pv)
        ));
      });
      if(encontrados.length===0) wrap.appendChild(el('div',{class:'empty'},'Nenhuma criatura encontrada.'));
    }

    wrap.appendChild(el('div',{class:'row', style:'margin-top:12px;'},
      el('button',{class:'btn', onclick:()=>{
        if(!rasc.nome.trim() || rasc.criaturas.length===0) return;
        state._mestreEncontrosSalvos.push({id:'enc'+Date.now(), nome:rasc.nome.trim(), criaturas:rasc.criaturas});
        salvarEncontrosLocal();
        state._mestreEncontroRascunho = null;
        flashMsg('✅ Encontro "'+rasc.nome.trim()+'" salvo!');
        render();
      }}, 'Salvar Encontro'),
      el('button',{class:'btn ghost', onclick:()=>{ state._mestreEncontroRascunho=null; render(); }}, 'Cancelar')
    ));
    return wrap;
  }

  // ---- Modo normal: lista de encontros salvos + botão de montar um novo ----
  if(state._mestreEncontrosSalvos.length===0){
    wrap.appendChild(el('div',{class:'tip', style:'font-size:0.78rem;'}, 'Nenhum encontro salvo ainda. Monte um escolhendo criaturas do bestiário — depois é só usar de novo sem precisar montar tudo outra vez.'));
  }
  state._mestreEncontrosSalvos.forEach(enc=>{
    const ndTotal = enc.criaturas.reduce((s,c)=>s+ (c.nd===20.5?20:c.nd), 0);
    wrap.appendChild(el('div',{class:'row', style:'align-items:center;margin-top:6px;'},
      el('div',{style:'flex:1;'},
        el('div',{style:'font-weight:700;'}, enc.nome),
        el('div',{class:'meta'}, enc.criaturas.length+' criatura'+(enc.criaturas.length>1?'s':'')+': '+enc.criaturas.map(c=>c.nome).join(', '))
      ),
      el('button',{class:'btn ghost', style:'width:auto;padding:6px 12px;flex-shrink:0;', onclick:()=>{
        enc.criaturas.forEach(c=>{
          const bonus = extrairBonusIniciativa(c.sentidos);
          combate.combatentes.push(novoCombatente(c.nome, 'monstro', bonus, c.pv, c.pv));
        });
        flashMsg('⚔️ Encontro "'+enc.nome+'" adicionado ('+enc.criaturas.length+' criatura'+(enc.criaturas.length>1?'s':'')+')!');
        render();
      }}, 'Usar agora ⚔️'),
      el('button',{class:'remove-x', onclick:()=>{
        if(!confirm('Excluir o encontro "'+enc.nome+'"?')) return;
        state._mestreEncontrosSalvos = state._mestreEncontrosSalvos.filter(x=>x.id!==enc.id);
        salvarEncontrosLocal();
        flashMsg('🗑️ Encontro "'+enc.nome+'" excluído.');
        render();
      }},'✕')
    ));
  });
  wrap.appendChild(el('button',{class:'btn', style:'margin-top:10px;', onclick:()=>{
    state._mestreEncontroRascunho = {nome:'', criaturas:[]};
    render();
  }}, 'Montar Encontro Manual +'));
  return wrap;
}

// ---- COMBATE (tela ao vivo — só quem já foi enviado da Preparação) ----
function renderMestreCombate(){
  const wrap = el('div',{});
  if(!state._mestreIniciativa) state._mestreIniciativa = {combatentes:[], turnoIdx:0, rodada:1};
  const combate = state._mestreIniciativa;

  if(combate.combatentes.length===0){
    wrap.appendChild(el('div',{class:'tip'}, el('b',{},'Nada em combate ainda'), 'Monte o encontro na aba "Preparar Encontro" e toque em "Enviar pro Combate" quando estiver pronto pra começar.'));
    return wrap;
  }

  wrap.appendChild(el('div',{class:'tip'}, el('b',{},'Como usar'), 'Toque numa criatura pra ver a ficha dela (ou um resumo, se for PJ). Use ▲▼ pra reordenar manualmente — a ordem não se mexe sozinha depois de enviada aqui.'));

  const painelCombate = el('div',{class:'panel faixa'},
    el('h2',{}, 'Rodada '+combate.rodada),
    el('div',{class:'row', style:'margin-bottom:10px;'},
      el('button',{class:'btn', onclick:()=>{
        combate.turnoIdx++;
        if(combate.turnoIdx >= combate.combatentes.length){ combate.turnoIdx = 0; combate.rodada++; }
        render();
      }}, 'Próximo turno ▶'),
      el('button',{class:'btn ghost', onclick:()=>{
        if(!confirm('Limpar todo o combate atual?')) return;
        state._mestreIniciativa = {combatentes:[], turnoIdx:0, rodada:1};
        render();
      }}, 'Limpar tudo')
    )
  );

  const timeline = el('div',{class:'iniciativa-timeline'});
  combate.combatentes.forEach((c, idx)=>{
    const noTurno = idx === combate.turnoIdx;
    timeline.appendChild(el('div',{class:'iniciativa-chip'+(noTurno?' atual':''), onclick:()=>{ combate.turnoIdx=idx; render(); }},
      el('div',{class:'iniciativa-chip-icone'}, avatarCombatente(c, 28)),
      el('div',{class:'iniciativa-chip-nome'}, c.nome.length>10 ? c.nome.slice(0,9)+'…' : c.nome),
      el('div',{class:'iniciativa-chip-num'}, c.iniciativa)
    ));
  });
  painelCombate.appendChild(timeline);

  if(state._combateAberto===undefined) state._combateAberto = null; // id do combatente com a ficha expandida (só um por vez)

  combate.combatentes.forEach((c, idx)=>{
    const noTurno = idx === combate.turnoIdx;
    const aberto = state._combateAberto === c.id;
    const linha = el('div',{class:'panel', style:'margin-bottom:6px;padding:10px 12px;'+(noTurno?'border-color:var(--red-bright);box-shadow:0 0 0 1px var(--red-bright) inset;':'')},
      el('div',{style:'display:flex;align-items:center;gap:8px;'},
        el('div',{style:'display:flex;flex-direction:column;gap:1px;flex-shrink:0;'},
          el('button',{class:'seta-reordenar', disabled: idx===0, onclick:()=>{
            if(idx===0) return;
            const tmp = combate.combatentes[idx-1]; combate.combatentes[idx-1] = combate.combatentes[idx]; combate.combatentes[idx] = tmp;
            render();
          }}, '▲'),
          el('button',{class:'seta-reordenar', disabled: idx===combate.combatentes.length-1, onclick:()=>{
            if(idx===combate.combatentes.length-1) return;
            const tmp = combate.combatentes[idx+1]; combate.combatentes[idx+1] = combate.combatentes[idx]; combate.combatentes[idx] = tmp;
            render();
          }}, '▼')
        ),
        el('div',{style:'flex-shrink:0;display:flex;align-items:center;justify-content:center;width:34px;cursor:pointer;', onclick:()=>{ state._combateAberto = aberto ? null : c.id; render(); }}, noTurno ? '▶' : avatarCombatente(c, 34)),
        el('div',{style:'flex-shrink:0;width:44px;'},
          el('input',{id:'iniciativa-num-'+c.id, type:'number', value:c.iniciativa, style:'margin:0;padding:4px 2px;text-align:center;font-weight:800;font-size:0.85rem;', oninput:(e)=>{c.iniciativa=parseInt(e.target.value)||0;}, onchange:render})
        ),
        el('div',{style:'flex:1;min-width:0;cursor:pointer;', onclick:()=>{ state._combateAberto = aberto ? null : c.id; render(); }},
          el('div',{style:'font-weight:700;font-family:Cinzel,serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;'}, c.nome),
          el('div',{style:'display:flex;align-items:center;gap:4px;font-size:0.75rem;color:var(--ink-soft);'},
            'PV ',
            el('input',{id:'pv-num-'+c.id, type:'number', value:c.pv, style:'margin:0;padding:2px 4px;width:52px;font-size:0.78rem;', oninput:(e)=>{c.pv=parseInt(e.target.value)||0;}, onchange:render}),
            ' / '+c.pvMax
          )
        ),
        el('button',{class:'remove-x', onclick:()=>{
          combate.combatentes = combate.combatentes.filter(x=>x.id!==c.id);
          if(state._combateAberto===c.id) state._combateAberto = null;
          render();
        }},'✕')
      )
    );
    if(aberto){
      if(c.tipo==='monstro' && c.dados){
        linha.appendChild(el('div',{style:'margin-top:10px;border-top:1px solid var(--line);padding-top:10px;'}, ...renderStatBlockCriatura(c.dados)));
      } else if(c.tipo==='pj' && c.origemId){
        const p = (state.perfisTodos||[]).find(x=>x.id===c.origemId);
        if(p){
          linha.appendChild(el('div',{style:'margin-top:10px;border-top:1px solid var(--line);padding-top:10px;'},
            el('div',{class:'row3'},
              el('div',{}, el('div',{class:'meta'},'Defesa'), el('div',{style:'font-weight:800;'}, defesaTotal(p))),
              el('div',{}, el('div',{class:'meta'},'PM'), el('div',{style:'font-weight:800;'}, (p.pmatual||0)+'/'+pmMaxEfetivo(p))),
              el('div',{}, el('div',{class:'meta'},'Nível'), el('div',{style:'font-weight:800;'}, nivelTotal(p))),
            ),
            condicoesAtivas(p).length>0 ? el('div',{class:'meta', style:'color:var(--gold);margin-top:8px;'}, '🩹 '+condicoesAtivas(p).join(', ')) : el('div',{class:'meta', style:'margin-top:8px;'}, 'Sem condições ativas.'),
            estaMorto(p) ? el('div',{style:'color:var(--red-bright);font-weight:700;margin-top:4px;'}, '💀 Morto') : (estaInconsciente(p) ? el('div',{style:'color:var(--red-bright);font-weight:700;margin-top:4px;'}, p.estabilizado?'😵 Inconsciente (estabilizado)':'🩸 Inconsciente e sangrando') : null)
          ));
        } else {
          linha.appendChild(el('div',{class:'meta', style:'margin-top:10px;'}, 'Não achei a ficha desse personagem (pode ter sido removido).'));
        }
      } else {
        linha.appendChild(el('div',{class:'meta', style:'margin-top:10px;'}, 'Combatente avulso, sem ficha detalhada.'));
      }
    }
    painelCombate.appendChild(linha);
  });
  wrap.appendChild(painelCombate);
  return wrap;
}

// ---- PREPARAR ENCONTRO (montagem — nada aqui afeta o combate ao vivo até "Enviar") ----
function renderMestrePreparar(){
  const wrap = el('div',{});
  if(!state._mestrePreparacao) state._mestrePreparacao = {combatentes:[]};
  const prep = state._mestrePreparacao;
  if(!state._mestreIniciativa) state._mestreIniciativa = {combatentes:[], turnoIdx:0, rodada:1};

  wrap.appendChild(el('div',{class:'tip'}, el('b',{},'Como usar'), 'Monte o encontro com calma aqui — busque monstros ou use os atalhos abaixo. PJs e NPCs avulsos agora se adicionam direto de onde você já está vendo eles (aba Grupo e NPC Rápido). Quando estiver pronto, toque em "Enviar pro Combate" na lista de baixo.'));
  const filtroEl = renderFiltroMesa();
  if(filtroEl) wrap.appendChild(filtroEl);

  wrap.appendChild(renderEncontroAleatorio(prep));
  wrap.appendChild(renderEncontrosSalvos(prep));

  const draftPanel = el('div',{class:'panel faixa'}, el('h2',{},'Preparado até agora'));
  if(prep.combatentes.length===0){
    draftPanel.appendChild(el('div',{class:'empty'},'Nada adicionado ainda — busque um monstro abaixo, ou mande PJs/NPCs direto das abas Grupo e NPC Rápido.'));
  } else {
    prep.combatentes.forEach(c=>{
      draftPanel.appendChild(el('div',{class:'row', style:'align-items:center;margin-top:4px;'},
        el('div',{style:'flex-shrink:0;'}, avatarCombatente(c, 28)),
        el('div',{style:'flex:1;'}, c.nome+' · iniciativa '+c.iniciativa+' · PV '+c.pv),
        el('button',{class:'remove-x', onclick:()=>{ prep.combatentes = prep.combatentes.filter(x=>x.id!==c.id); render(); }},'✕')
      ));
    });
    draftPanel.appendChild(el('button',{class:'btn', style:'margin-top:12px;', onclick:()=>{
      prep.combatentes.forEach(c=> inserirOrdenadoPorIniciativa(state._mestreIniciativa.combatentes, c));
      state._mestrePreparacao = {combatentes:[]};
      state.mestreTab = 'combate';
      render();
    }}, 'Enviar pro Combate ⚔️'));
  }
  wrap.appendChild(draftPanel);

  // ---- Adicionar Monstro ----
  const monstroPanel = el('div',{class:'panel'}, el('h2',{},'Adicionar monstro'));
  if(!state._mestreIniciativaBusca) state._mestreIniciativaBusca = '';
  monstroPanel.appendChild(el('input',{id:'busca-iniciativa-monstro', type:'text', placeholder:'buscar criatura pelo nome...', value:state._mestreIniciativaBusca, oninput:(e)=>{state._mestreIniciativaBusca=e.target.value; renderDebounced();}}));
  if(state._mestreIniciativaBusca.length>=2){
    const encontrados = todasCriaturasCompletas().filter(m=> m.nome.toLowerCase().includes(state._mestreIniciativaBusca.toLowerCase())).slice(0,8);
    encontrados.forEach(m=>{
      monstroPanel.appendChild(el('button',{class:'option-card', style:'width:100%;margin-top:6px;text-align:left;border-left:4px solid '+corPorTipoCriatura(m.tipo)+';', onclick:()=>{
        const bonus = extrairBonusIniciativa(m.sentidos);
        prep.combatentes.push(novoCombatente(m.nome, 'monstro', bonus, m.pv, m.pv, null, m));
        state._mestreIniciativaBusca='';
        render();
      }},
        el('div',{class:'opt-nome'}, m.nome),
        el('div',{class:'opt-sub'}, 'ND '+ndTexto(m.nd)+' · PV '+m.pv)
      ));
    });
    if(encontrados.length===0) monstroPanel.appendChild(el('div',{class:'empty'},'Nenhuma criatura encontrada.'));
  }
  wrap.appendChild(monstroPanel);

  return wrap;
}

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
    wrap.appendChild(renderItemColapsavel('monstro-'+m.nome, m.nome, 'ND '+ndTexto(m.nd), [...renderStatBlockCriatura(m), botoesEnviarCombatente(()=>novoCombatente(m.nome,'monstro',extrairBonusIniciativa(m.sentidos),m.pv,m.pv,null,m))], corPorTipoCriatura(m.tipo)));
  });

  return wrap;
}

// ---- Ameaças de Arton: navegação por categoria (evita virar uma lista gigante) ----
// Um ícone por categoria, só pra facilitar escanear a lista rápido — puramente estético.
const ICONE_CATEGORIA_AMEACA = {
  'Áreas de Tormenta': '🌀', 'Brutos & Indomáveis': '🪓', 'Capangas & Bandoleiros': '🗡️',
  'Culto de Aharadak': '🩸', 'Dragões': '🐉', 'Duyshidakk': '👺', 'Elementais': '🔥',
  'Ermos': '🌾', 'Gnolls': '🐾', 'Golens': '🗿', 'Igreja de Arsenal': '⚔️',
  'Igreja de Kallyadranoch': '🔥', 'Império de Jade': '🏯', 'Império de Tauron': '🛡️',
  'Kobolds': '🦎', 'Mascotes & Familiares': '🐣', 'Masmorras': '🕸️', 'Montarias': '🐴',
  'Mortos-Vivos': '💀', 'Mundo Perdido': '🦖', 'Piratas & Pistoleiros': '🏴‍☠️',
  'Povos-Trovão': '⚡', 'Puristas': '🕊️', 'Reino dos Mortos': '⚰️', 'Reinos de Moreania': '🐗',
  'Sanguinárias': '🦂', 'Sob as Ondas': '🌊', 'Sszzaazitas': '🐍', 'Trolls Nobres': '🍄', 'Uivantes': '❄️',
};
function iconeCategoriaAmeaca(nome){ return ICONE_CATEGORIA_AMEACA[nome] || '✦'; }

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
        el('div',{class:'opt-nome'}, iconeCategoriaAmeaca(cat.nome)+' '+cat.nome),
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
  wrap.appendChild(el('div',{class:'wizard-title'}, iconeCategoriaAmeaca(categoria.nome)+' '+categoria.nome));

  if(!state._mestreFiltroAmeaca) state._mestreFiltroAmeaca = {busca:''};
  const filtro = state._mestreFiltroAmeaca;
  wrap.appendChild(el('input',{id:'busca-mestre-ameaca', type:'text', placeholder:'buscar criatura nesta categoria...', value:filtro.busca, oninput:(e)=>{filtro.busca=e.target.value; renderDebounced();}}));

  let lista = categoria.criaturas.filter(m=> !filtro.busca || m.nome.toLowerCase().includes(filtro.busca.toLowerCase()));
  lista = lista.slice().sort((a,b)=>a.nd-b.nd);
  if(lista.length===0){
    wrap.appendChild(el('div',{class:'empty'},'Nenhuma criatura encontrada.'));
  }
  lista.forEach(m=>{
    wrap.appendChild(renderItemColapsavel('ameaca-'+m.nome, m.nome, 'ND '+ndTexto(m.nd), [...renderStatBlockCriatura(m), botoesEnviarCombatente(()=>novoCombatente(m.nome,'monstro',extrairBonusIniciativa(m.sentidos),m.pv,m.pv,null,m))], corPorTipoCriatura(m.tipo)));
  });

  return wrap;
}

// ---- NPC RÁPIDO ----
function renderMestreNpc(){
  const wrap = el('div',{});
  wrap.appendChild(el('div',{class:'tip'}, el('b',{},'Como usar'), 'Escolha o Nível de Desafio do NPC que você precisa e tenha o bloco de estatísticas pronto na hora — sem precisar montar uma ficha do zero (Tabela 7-2 do livro). Dê um nome e mande direto pro Combate ou pra Preparação.'));

  if(!state._mestreNpcNd) state._mestreNpcNd = 1;
  const sel = el('select',{onchange:(e)=>{state._mestreNpcNd=parseFloat(e.target.value); render();}});
  NPC_GENERICO.forEach(n=> sel.appendChild(el('option',{value:n.nd, ...(state._mestreNpcNd===n.nd?{selected:'selected'}:{})}, 'ND '+ndTexto(n.nd)+' ('+n.patamar+')')));
  wrap.appendChild(sel);

  const npc = NPC_GENERICO.find(n=>n.nd===state._mestreNpcNd);
  if(npc){
    if(state._mestreNpcNome==null) state._mestreNpcNome = '';
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
      el('div',{class:'tip', style:'margin-top:10px;font-size:0.78rem;'}, 'Perícias mostra o bônus típico de uma perícia "alta" (treinada, atributo principal) e de uma "baixa" — use pra qualquer teste do NPC. Ajuste o nome, aparência e 2-3 traços de personalidade e está pronto pra jogar.'),
      el('label',{style:'margin-top:10px;'},'Nome do NPC'),
      el('input',{id:'nome-npc-rapido', type:'text', placeholder:'ex: Guarda da Ponte, Baronesa Vantille...', value:state._mestreNpcNome, oninput:(e)=>{state._mestreNpcNome=e.target.value;}}),
      botoesEnviarCombatente(()=> novoCombatente(state._mestreNpcNome.trim() || ('NPC ND '+ndTexto(npc.nd)), 'npc', 0, npc.pv, npc.pv))
    ));
  }

  // ---- Avulso livre (refém, armadilha, decoração de cena — sem ND específico) ----
  const customPanel = el('div',{class:'panel'}, el('h2',{},'Avulso livre (refém, armadilha, decoração de cena...)'));
  customPanel.appendChild(el('div',{class:'tip', style:'font-size:0.78rem;'}, 'Pra quando não precisa de um bloco de ND — só um nome e um PV (se fizer sentido ter).'));
  if(!state._mestreIniciativaCustom) state._mestreIniciativaCustom = {nome:'', pv:''};
  const cc = state._mestreIniciativaCustom;
  customPanel.appendChild(el('input',{id:'custom-combatente-nome', type:'text', placeholder:'nome', value:cc.nome, oninput:(e)=>{cc.nome=e.target.value;}}));
  customPanel.appendChild(el('input',{id:'custom-combatente-pv', type:'number', placeholder:'PV (opcional)', value:cc.pv, style:'margin-top:6px;', oninput:(e)=>{cc.pv=e.target.value;}}));
  customPanel.appendChild(botoesEnviarCombatente(()=>{
    const pv = cc.pv!=='' ? parseInt(cc.pv)||0 : 0;
    return novoCombatente(cc.nome.trim()||'Avulso', 'custom', 0, pv, pv);
  }));
  wrap.appendChild(customPanel);

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
// Acessório (anel, amuleto, manto etc.) — o tier (menor/médio/maior) pesa mais pro lado maior
// conforme o ND vai subindo, seguindo o espírito da Tabela 8-1 (tesouro melhora com o nível).
function sortearAcessorioMagico(nd){
  const ndNum = typeof nd==='number' ? nd : (nd==='1/4'?0.25 : nd==='1/2'?0.5 : parseFloat(nd)||1);
  let lista;
  if(ndNum <= 4) lista = ACESSORIOS_MENORES;
  else if(ndNum <= 9) lista = Math.random()<0.7 ? ACESSORIOS_MENORES : ACESSORIOS_MEDIOS;
  else if(ndNum <= 14) lista = Math.random()<0.6 ? ACESSORIOS_MEDIOS : ACESSORIOS_MAIORES;
  else lista = Math.random()<0.3 ? ACESSORIOS_MEDIOS : ACESSORIOS_MAIORES;
  const item = sortear(lista);
  return item.nome+' (acessório, T$ '+item.preco+')';
}

function gerarTesouro(nd){
  const tab = TESOURO_POR_ND.find(t=>t.nd===nd) || TESOURO_POR_ND[0];
  const dinheiroValor = rolarExpressao(tab.dadoDinheiro);
  const linhas = [dinheiroValor+' '+tab.unidadeDinheiro+' em moedas'];
  let itemTexto = null;
  if(Math.random() < tab.chanceItem){
    const rolagem = Math.random();
    if(rolagem < 0.3){
      const d = 1+Math.floor(Math.random()*100);
      const entrada = ITENS_DIVERSOS_TABELA.find(([de,ate])=> d>=de && d<=ate);
      itemTexto = 'Item: '+(entrada?entrada[2]:'algo interessante');
    } else if(rolagem < 0.6){
      const tipoRoll = Math.random();
      if(tipoRoll<0.35){ itemTexto = 'Arma: '+sortearArmaMagica(); }
      else if(tipoRoll<0.6){ itemTexto = 'Armadura/Escudo: '+sortearArmaduraMagica(); }
      else if(tipoRoll<0.85){ itemTexto = 'Acessório: '+sortearAcessorioMagico(nd); }
      else { itemTexto = 'Esotérico: '+sortear(ITENS_ESOTERICOS).n; }
    } else if(rolagem < 0.85){
      const pocaoSorteada = sortear(POCOES_MAGICAS);
      itemTexto = pocaoSorteada.nome+' (contém '+pocaoSorteada.magia+', T$ '+pocaoSorteada.preco+')';
    } else {
      const d = 1+Math.floor(Math.random()*100);
      const faixa = RIQUEZAS.find(r=> r.faixaMenor && d>=r.faixaMenor[0] && d<=r.faixaMenor[1]) || RIQUEZAS[0];
      itemTexto = 'Riqueza: '+faixa.exemplo+' (~T$ '+faixa.valorMedio+')';
    }
    linhas.push(itemTexto);
  }
  return { linhas, dinheiro:{valor:dinheiroValor, unidade:tab.unidadeDinheiro}, itemTexto };
}

// Aplica um tesouro gerado (dinheiro + item, se houver) direto na ficha de um personagem —
// soma nas moedas certas (TC/T$/TO) e guarda o item na mochila, sem o jogador precisar digitar nada.
const CAMPO_MOEDA_POR_UNIDADE = {'TC':'tc', 'T$':'ts', 'TO':'to'};
function aplicarTesouroEmPersonagem(personagem, tesouro){
  const copia = JSON.parse(JSON.stringify(personagem));
  const campo = CAMPO_MOEDA_POR_UNIDADE[tesouro.dinheiro.unidade] || 'ts';
  copia[campo] = (parseInt(copia[campo])||0) + tesouro.dinheiro.valor;
  if(tesouro.itemTexto){
    if(!copia.equip) copia.equip = [];
    copia.equip.push(montarEntradaMochila(tesouro.itemTexto+' (recebido do Mestre)', 1, tesouro.itemTexto));
  }
  return copia;
}

// Seletor compartilhado de "pra quem enviar" — usado tanto no Tesouro quanto na Loja/Itens.
// Guarda a escolha em state._mestreEnvioAlvo, comum às 3 telas (trocar numa reflete nas outras).
function renderSeletorAlvoEnvio(){
  const todos = personagensDoGrupoAtual();
  if(todos.length===0){
    return el('div',{class:'tip', style:'font-size:0.78rem;'}, 'Nenhum personagem de jogador encontrado ainda pra enviar direto — os jogadores precisam ter criado a ficha pelo menos uma vez.');
  }
  if(!state._mestreEnvioAlvo || !todos.some(p=>p.id===state._mestreEnvioAlvo)) state._mestreEnvioAlvo = todos[0].id;
  const sel = el('select',{onchange:(e)=>{state._mestreEnvioAlvo=e.target.value; render();}});
  todos.forEach(p=> sel.appendChild(el('option',{value:p.id, ...(state._mestreEnvioAlvo===p.id?{selected:'selected'}:{})}, p.nome+' ('+(p.jogador||p._playerId||'?')+')')));
  return el('div',{},
    el('div',{class:'meta', style:'margin-bottom:4px;'}, 'Enviar itens direto pra mochila de:'),
    sel
  );
}
// Manda UM item avulso (nome + preço, texto livre) pra mochila do personagem selecionado no
// seletor acima. Usado nos botões "Enviar" da Loja e do catálogo de Itens do Mestre.
async function enviarItemAvulsoParaAlvo(nomeItem, precoTxt){
  const todos = personagensDoGrupoAtual();
  const alvo = todos.find(p=>p.id===state._mestreEnvioAlvo);
  if(!alvo){ flashMsg('⚠ Escolha um personagem primeiro.'); return; }
  const copia = JSON.parse(JSON.stringify(alvo));
  if(!copia.equip) copia.equip = [];
  copia.equip.push(montarEntradaMochila(nomeItem+' (recebido do Mestre)', 1, nomeItem));
  const ok = await atualizarPersonagemEResincronizar(copia);
  if(ok){
    flashMsg('✅ '+nomeItem+' enviado pra '+alvo.nome+'!');
  } else {
    flashMsg('⚠ Não consegui enviar agora — tenta de novo em instantes.');
  }
  render();
}

function renderMestreTesouro(){
  const wrap = el('div',{});
  wrap.appendChild(el('div',{class:'tip'}, el('b',{},'Como usar'), 'Escolha o Nível de Desafio do encontro (ou do tesouro que quer gerar) e toque em "Gerar". Usa as tabelas 8-1 a 8-4 do livro, já rolando os dados pra você.'));
  const filtroEl = renderFiltroMesa();
  if(filtroEl) wrap.appendChild(filtroEl);

  if(!state._mestreTesouroNd) state._mestreTesouroNd = 1;
  const sel = el('select',{onchange:(e)=>{state._mestreTesouroNd=parseFloat(e.target.value); render();}});
  TESOURO_POR_ND.forEach(t=> sel.appendChild(el('option',{value:t.nd, ...(state._mestreTesouroNd===t.nd?{selected:'selected'}:{})}, 'ND '+ndTexto(t.nd))));
  wrap.appendChild(sel);

  wrap.appendChild(el('button',{class:'btn', style:'margin-top:10px;', onclick:()=>{
    state._mestreTesouroResultado = gerarTesouro(state._mestreTesouroNd);
    state._mestreTesouroEnviadoPara = null;
    render();
  }}, 'Gerar Tesouro 🎲'));

  if(state._mestreTesouroResultado){
    const tesouro = state._mestreTesouroResultado;
    const panel = el('div',{class:'panel faixa'}, el('h2',{},'Resultado'));
    tesouro.linhas.forEach(linha=> panel.appendChild(el('div',{class:'power-item'}, linha)));

    const todos = personagensDoGrupoAtual();
    if(todos.length===0){
      panel.appendChild(el('div',{class:'tip', style:'margin-top:8px;font-size:0.78rem;'}, 'Nenhum personagem de jogador encontrado ainda pra enviar direto — os jogadores precisam ter criado a ficha pelo menos uma vez.'));
    } else {
      panel.appendChild(el('div',{class:'meta', style:'margin-top:10px;'}, 'Enviar direto pra mochila de:'));
      const envioRow = el('div',{class:'row', style:'margin-top:4px;'});
      if(!state._mestreTesouroAlvo) state._mestreTesouroAlvo = todos[0].id;
      const selAlvo = el('select',{onchange:(e)=>{state._mestreTesouroAlvo=e.target.value; render();}});
      todos.forEach(p=> selAlvo.appendChild(el('option',{value:p.id, ...(state._mestreTesouroAlvo===p.id?{selected:'selected'}:{})}, p.nome+' ('+(p.jogador||p._playerId||'?')+')')));
      envioRow.appendChild(selAlvo);
      panel.appendChild(envioRow);
      panel.appendChild(el('button',{class:'btn', style:'margin-top:8px;', onclick: async ()=>{
        const alvo = todos.find(p=>p.id===state._mestreTesouroAlvo);
        if(!alvo) return;
        const atualizado = aplicarTesouroEmPersonagem(alvo, tesouro);
        const ok = await atualizarPersonagemEResincronizar(atualizado);
        if(ok){
          state._mestreTesouroEnviadoPara = alvo.nome;
          flashMsg('✅ Tesouro enviado pra '+alvo.nome+'!');
        } else {
          flashMsg('⚠ Não consegui enviar agora — tenta de novo em instantes.');
        }
        render();
      }}, 'Enviar pra mochila 📦'));
      if(todos.length>1){
        const parte = Math.floor(tesouro.dinheiro.valor / todos.length);
        const resto = tesouro.dinheiro.valor % todos.length;
        panel.appendChild(el('div',{class:'tip', style:'font-size:0.76rem;margin-top:8px;'}, 'Dividir só o dinheiro ('+tesouro.dinheiro.valor+' '+tesouro.dinheiro.unidade+') igualmente entre os '+todos.length+' personagens visíveis agora ('+parte+' cada'+(resto?', +'+resto+' pro primeiro por causa do resto':'')+'). O item (se tiver) continua indo só pra quem você escolher acima, em "Enviar pra mochila".'));
        panel.appendChild(el('button',{class:'btn ghost', style:'margin-top:6px;', onclick: async ()=>{
          let algumFalhou = false;
          for(let i=0;i<todos.length;i++){
            const p = todos[i];
            const valorDele = parte + (i===0 ? resto : 0);
            const copia = JSON.parse(JSON.stringify(p));
            const campo = CAMPO_MOEDA_POR_UNIDADE[tesouro.dinheiro.unidade] || 'ts';
            copia[campo] = (parseInt(copia[campo])||0) + valorDele;
            const ok = await mestreAtualizarPersonagem(copia);
            if(!ok) algumFalhou = true;
          }
          await carregarPerfisTodosParaMestre();
          if(algumFalhou) flashMsg('⚠ Alguns envios falharam — confere e tenta nos que faltou.');
          else flashMsg('⚖️ '+parte+' '+tesouro.dinheiro.unidade+' (+ resto) dividido entre os '+todos.length+' personagens!');
          render();
        }}, 'Dividir dinheiro com o grupo ⚖️'));
      }
      if(state._mestreTesouroEnviadoPara){
        panel.appendChild(el('div',{class:'meta', style:'color:var(--gold);margin-top:6px;'}, '✅ Último envio: '+state._mestreTesouroEnviadoPara));
      }
    }
    wrap.appendChild(panel);
  }
  return wrap;
}

// ---- GERADOR DE LOJA / TAVERNA ----
const TIPOS_LOJA = {
  'Ferreiro (armas)': (qtd)=> pickRandom(ARMAS, qtd),
  'Armaria (defesas)': (qtd)=> pickRandom([...ARMADURAS,...ESCUDOS], qtd),
  'Alquimista': (qtd)=> pickRandom(ITENS_GERAIS.filter(i=>['Alquímico','Catalisador','Veneno'].includes(i.cat)), qtd),
  'Loja Geral': (qtd)=> pickRandom(ITENS_GERAIS.filter(i=>['Aventura','Ferramenta','Vestuário','Munição'].includes(i.cat)), qtd),
  'Taverna': (qtd)=> pickRandom(ITENS_GERAIS.filter(i=>i.cat==='Alimentação'), qtd),
  'Loja Mágica (esotéricos)': (qtd)=> pickRandom(ITENS_ESOTERICOS, qtd),
  'Boticário (poções)': (qtd)=> pickRandom(POCOES_MAGICAS, qtd).map(p=>({n:p.nome, preco:'T$ '+p.preco})),
  'Armeiro de Fogo': (qtd)=> pickRandom(ARMAS.filter(a=>a.cat==='Arma de Fogo'), qtd),
  'Curiosidades e Achados': (qtd)=> {
    const nomes = pickRandom(ITENS_DIVERSOS_TABELA, qtd).map(x=>x[2]);
    return nomes.map(nome=>{
      const encontrado = ITENS_GERAIS.find(i=>i.n===nome);
      return encontrado || {n:nome, preco:'variável'};
    });
  },
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
  wrap.appendChild(el('div',{class:'tip'}, el('b',{},'Como usar'), 'Escolha o tipo de estabelecimento, defina quantos itens quer no estoque e toque em "Gerar". Usa os itens e preços já cadastrados no app.'));

  if(!state._mestreLojaTipo) state._mestreLojaTipo = Object.keys(TIPOS_LOJA)[0];
  const tabsRow = el('div',{class:'tab-grid'});
  Object.keys(TIPOS_LOJA).forEach(tipo=>{
    tabsRow.appendChild(el('button',{class: state._mestreLojaTipo===tipo?'on':'', onclick:()=>{state._mestreLojaTipo=tipo; render();}}, tipo));
  });
  wrap.appendChild(tabsRow);

  if(!state._mestreLojaQtd) state._mestreLojaQtd = 6;
  wrap.appendChild(el('label',{style:'margin-top:10px;'},'Quantos itens no estoque?'));
  wrap.appendChild(el('input',{id:'mestre-loja-qtd', type:'number', min:'1', max:'30', value:state._mestreLojaQtd, oninput:(e)=>{state._mestreLojaQtd=parseInt(e.target.value)||1;}}));

  wrap.appendChild(el('button',{class:'btn', style:'margin-top:10px;', onclick:()=>{
    state._mestreLojaEstoque = TIPOS_LOJA[state._mestreLojaTipo](state._mestreLojaQtd);
    render();
  }}, 'Gerar Estoque 🎲'));

  if(state._mestreLojaEstoque){
    const panel = el('div',{class:'panel faixa'}, el('h2',{}, state._mestreLojaTipo));
    panel.appendChild(renderSeletorAlvoEnvio());
    state._mestreLojaEstoque.forEach((it,idx)=>{
      panel.appendChild(el('div',{class:'spell-card', style:'margin-top:8px;'},
        el('div',{class:'head'},
          el('span',{class:'name'}, it.n),
          el('span',{class:'meta'}, it.preco)
        ),
        el('div',{style:'padding:0 12px 10px;'},
          el('button',{class:'btn ghost', onclick:()=> enviarItemAvulsoParaAlvo(it.n, it.preco)}, 'Enviar pra mochila 📦')
        )
      ));
    });
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
  wrap.appendChild(el('div',{style:'margin-top:8px;'}, renderSeletorAlvoEnvio()));

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
        el('div',{class:'desc'}, 'Dano '+w.dano+' · Crítico '+w.critico+' · '+w.tipo+' · Alcance: '+w.alcance+' · '+w.cat+' · '+w.esp+' esp. · '+(w.maos>=2?'2 mãos':'1 mão')),
        el('button',{class:'btn ghost', style:'margin-top:8px;', onclick:()=> enviarItemAvulsoParaAlvo(w.n, w.preco)}, 'Enviar pra mochila 📦')
      ]));
    });
  }

  if(itf.tipo==='armaduras'){
    let list = [...ARMADURAS, ...ESCUDOS].filter(a => !itf.busca || a.n.toLowerCase().includes(itf.busca.toLowerCase()));
    if(list.length===0) results.appendChild(el('div',{class:'empty'},'Nenhuma armadura/escudo encontrada.'));
    list.forEach(a=>{
      results.appendChild(renderItemColapsavel('mestre-armadura-'+a.n, a.n, a.preco, [
        el('div',{class:'desc'}, 'Defesa +'+a.def+' · Penalidade '+a.pen+' · '+a.esp+' espaços · '+a.cat),
        el('button',{class:'btn ghost', style:'margin-top:8px;', onclick:()=> enviarItemAvulsoParaAlvo(a.n, a.preco)}, 'Enviar pra mochila 📦')
      ]));
    });
  }

  if(itf.tipo==='esotericos'){
    let list = ITENS_ESOTERICOS.filter(i => !itf.busca || i.n.toLowerCase().includes(itf.busca.toLowerCase()));
    if(list.length===0) results.appendChild(el('div',{class:'empty'},'Nenhum esotérico encontrado.'));
    list.forEach(it=>{
      results.appendChild(renderItemColapsavel('mestre-esoterico-'+it.n, it.n, it.preco, [
        el('div',{class:'desc'}, it.desc),
        el('div',{class:'meta'}, it.maos+' mão'+(it.maos>1?'s':'')+' · '+it.esp+' esp.'),
        el('button',{class:'btn ghost', style:'margin-top:8px;', onclick:()=> enviarItemAvulsoParaAlvo(it.n, it.preco)}, 'Enviar pra mochila 📦')
      ]));
    });
  }

  if(itf.tipo==='pocoes'){
    let list = POCOES_MAGICAS.filter(p => !itf.busca || p.nome.toLowerCase().includes(itf.busca.toLowerCase()));
    wrap.appendChild(el('div',{class:'tip', style:'font-size:0.8rem;'}, 'Poções (Tabela 8-12) contêm a magia real indicada — o efeito é o mesmo de lançar aquela magia. Círculo 1-2 = item menor, 3-4 = médio, 5 = maior.'));
    if(list.length===0) results.appendChild(el('div',{class:'empty'},'Nenhuma poção encontrada.'));
    list.slice().sort((a,b)=>a.preco-b.preco).forEach(p=>{
      results.appendChild(renderItemColapsavel('mestre-pocao-'+p.nome, p.nome, 'T$ '+p.preco, [
        el('div',{class:'desc'}, 'Contém a magia: '+p.magia+' ('+p.circulo+'º círculo)'),
        el('button',{class:'btn ghost', style:'margin-top:8px;', onclick:()=> enviarItemAvulsoParaAlvo(p.nome, 'T$ '+p.preco)}, 'Enviar pra mochila 📦')
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
        el('div',{class:'desc'}, it.desc),
        el('button',{class:'btn ghost', style:'margin-top:8px;', onclick:()=> enviarItemAvulsoParaAlvo(it.n, it.preco)}, 'Enviar pra mochila 📦')
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
