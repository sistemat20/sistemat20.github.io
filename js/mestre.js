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
    // Só vale a pena buscar/re-renderizar em abas que realmente mostram dado de personagem ao
    // vivo (PV, condições...). Nas outras (Bestiário, Loja, NPC, Preparar Encontro...) isso só
    // reconstruía a tela à toa a cada 5s, fazendo listas com rolagem própria "pularem" de volta
    // pro topo sem motivo nenhum — bem incômodo enquanto você tá lendo/procurando algo.
    if(state.mestreTab!=='combate' && state.mestreTab!=='grade') return;
    await carregarPerfisTodosParaMestre();
    const digitando = document.activeElement && ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName);
    if(!digitando) render();
  }, 5000);
}
function pararAtualizacaoAutomaticaMestre(){
  if(_intervalAtualizacaoMestre){ clearInterval(_intervalAtualizacaoMestre); _intervalAtualizacaoMestre = null; }
}

// Atualização automática só da Grade, mais rápida que o resto do Mestre (2s) — sem isso, quando
// um jogador move o próprio token pelo link compartilhado, o Mestre só via a mudança se saísse
// e voltasse na aba. Só troca posições/blocos/névoa (o que veio do servidor); PV/iniciativa dos
// combatentes continuam vindo do lado do Mestre, que é quem manda nisso de verdade.
let _intervalAtualizacaoGradeMestre = null;
function iniciarAtualizacaoAutomaticaGradeMestre(){
  if(_intervalAtualizacaoGradeMestre) return; // já tá rodando, não duplica
  _intervalAtualizacaoGradeMestre = setInterval(async ()=>{
    if(state.screen!=='mestre' || state.mestreTab!=='grade'){ pararAtualizacaoAutomaticaGradeMestre(); return; }
    if(_gradeSincronizando) return; // não busca enquanto um salvamento nosso tá em andamento
    const codigo = obterCodigoJogador();
    if(!codigo || !state._mestreIniciativa) return;
    const versaoAntesDaBusca = _gradeVersaoLocal;
    const dados = await carregarMestreDadosPorCodigo(codigo);
    // Se alguma coisa mudou localmente (ou um salvamento começou) ENQUANTO a busca estava
    // rodando, o dado que acabamos de buscar já está desatualizado — descarta em vez de
    // sobrescrever a mudança mais nova por cima.
    if(_gradeSincronizando || _gradeVersaoLocal!==versaoAntesDaBusca) return;
    if(dados && dados.combateCompartilhado && dados.combateCompartilhado.grade){
      // Mesma lógica do lado do jogador: se a grade buscada é EXATAMENTE igual à que já tá na
      // tela, nem reconstrói nada — evita perder a posição de rolagem do tabuleiro à toa a
      // cada 2s quando ninguém mexeu em nada nesse meio-tempo.
      const assinaturaNova = JSON.stringify(dados.combateCompartilhado.grade);
      if(assinaturaNova === state._gradeMestreUltimaAssinatura) return;
      state._gradeMestreUltimaAssinatura = assinaturaNova;
      state._mestreIniciativa.grade = dados.combateCompartilhado.grade;
      const digitando = document.activeElement && ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName);
      if(!digitando) render();
    }
  }, 2000);
}
function pararAtualizacaoAutomaticaGradeMestre(){
  if(_intervalAtualizacaoGradeMestre){ clearInterval(_intervalAtualizacaoGradeMestre); _intervalAtualizacaoGradeMestre = null; }
}

// As 9 telas do Mestre, agrupadas em 3 categorias — evita uma barra de abas gigante.
const CATEGORIAS_MESTRE = {
  combate: {label:'Combate', abas:[['combate','Combate'],['grade','Grade de Combate'],['preparar','Preparar Encontro'],['grupo','Grupo']]},
  bestiario: {label:'Bestiário', abas:[['bestiario','Bestiário'],['npc','NPC Rápido'],['nomes','Nomes']]},
  recursos: {label:'Recursos', abas:[['tesouro','Tesouro'],['loja','Loja'],['itens','Itens'],['magicos','Itens Mágicos']]},
};

function renderMestreScreen(){
  const wrap = el('div',{});
  // Modo tela cheia da Grade: pula cabeçalho e abas, deixa só o tabuleiro ocupando a tela
  // inteira — pensado pra jogar num tablet/TV na mesa sem a interface do app atrapalhando.
  if(state._gradeTelaCheia && state.mestreTab==='grade'){
    wrap.appendChild(el('button',{class:'btn ghost', style:'position:fixed;top:10px;right:10px;z-index:50;width:auto;padding:6px 14px;', onclick:()=>{
      state._gradeTelaCheia = false;
      if(document.fullscreenElement) document.exitFullscreen().catch(()=>{});
      render();
    }}, '✕ Sair da Tela Cheia'));
    wrap.appendChild(renderMestreGrade());
    return wrap;
  }
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
  if(state.mestreTab==='grade') main.appendChild(renderMestreGrade());
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
// muda. É "dispara e esquece": a UI já foi atualizada localmente antes de chamar isso. Também
// manda o combate/grade atual (se tiver), pra alimentar a tela de "Ver Grade" compartilhada —
// sem isso, quem abre o link não veria nada.
async function salvarDadosMestreNoServidor(){
  const combate = state._mestreIniciativa;
  return salvarMestreDadosArmazenamento({
    grupos: state._mestreGrupos||[],
    encontrosSalvos: state._mestreEncontrosSalvos||[],
    combateCompartilhado: combate ? {
      combatentes: (combate.combatentes||[]).map(c=>({
        id:c.id, nome:c.nome, tipo:c.tipo,
        // Se o upload da foto pro Drive falhou alguma vez, o app guarda a imagem em base64
        // bruto como reserva (pra não perder a foto) — mas isso pode passar de 50 mil
        // caracteres, e o Google Sheets tem esse limite POR CÉLULA. Mandar isso no link
        // compartilhado (que salva a cada jogada) arriscava estourar o limite e corromper o
        // salvamento inteiro — foi provavelmente a causa real do "mapa sumindo" pro jogador.
        // Só manda a foto se for um link de verdade (curto); base64 vira "sem foto" aqui.
        foto: (c.foto && !c.foto.startsWith('data:')) ? c.foto : null,
        origemId:c.origemId,
        // PV de monstro NUNCA vai pro link compartilhado — nem escondido no código, nem por
        // engano. PJ manda o valor AO VIVO da própria ficha (é o jogador quem controla a
        // vida dele, o Mestre não precisa mexer nisso).
        pv: c.tipo==='monstro' ? null : pvAtualCombatente(c),
        pvMax: c.tipo==='monstro' ? null : pvMaxCombatente(c),
        dados: c.dados ? {tamanho:c.dados.tamanho} : null,
      })),
      // "grade" é a versão COMPLETA — só o Mestre lê ela de volta (no polling da própria
      // Grade), pra nunca perder de vista onde um monstro escondido está. "gradeParaJogadores"
      // é a versão filtrada que o link compartilhado realmente usa pra desenhar o tabuleiro.
      grade: combate.grade || null,
      gradeParaJogadores: combate.grade ? computarGradeParaJogadores(combate.combatentes||[], combate.grade) : null,
      turnoIdx: combate.turnoIdx||0,
    } : null,
  });
}
// Empurra a atualização pro servidor sem travar a UI — chamada depois de qualquer mudança na
// grade que o link compartilhado precise refletir (mover token, bloco, revelar fog...).
// Empurra a atualização pro servidor sem travar a UI. Cuidado importante: se o Mestre mexe em
// várias coisas rápido (mover token, colocar parede, mover outro...), cada mudança chamava isso
// na hora, e como são requisições de rede, uma mais ANTIGA podia terminar DEPOIS de uma mais
// nova (rede é imprevisível) — aí a versão velha "vencia" por último e apagava progresso novo
// (foi exatamente o bug do mapa sumindo). Agora só deixa 1 salvamento de cada vez rodando; se
// pedir de novo enquanto um já tá em andamento, só marca "pendente" e reenvia o estado mais
// atual assim que o atual terminar — nunca dois ao mesmo tempo, nunca fora de ordem.
let _gradeSincronizando = false;
let _gradeSincronizarPendente = false;
// Toda vez que algo muda LOCALMENTE na grade, esse número sobe — serve pra o polling saber "eu
// comecei a buscar quando a versão era X; se ela já não é mais X quando eu terminei de buscar, é
// porque mudou alguma coisa NO MEIO DO CAMINHO, e não posso simplesmente sobrescrever por cima
// (isso era exatamente o bug de "fundo/peça voltando" — buscar dado velho vencendo por último).
let _gradeVersaoLocal = 0;
let _gradeUltimoAvisoFalha = 0;
function sincronizarGradeCompartilhada(){
  _gradeVersaoLocal++;
  if(_gradeSincronizando){ _gradeSincronizarPendente = true; return; }
  _gradeSincronizando = true;
  salvarDadosMestreNoServidor().then(sucesso=>{
    // Antes isso falhava 100% em silêncio — se der errado de novo (por qualquer motivo), pelo
    // menos agora avisa, em vez do Mestre só descobrir quando o link já tiver sumido pro
    // jogador. Não repete o aviso toda hora — no máximo 1 a cada 20s, pra não floodar.
    if(!sucesso && Date.now()-_gradeUltimoAvisoFalha>20000){
      _gradeUltimoAvisoFalha = Date.now();
      flashMsg('⚠ Não consegui salvar a última mudança da Grade no servidor — verifique a conexão.');
    }
  }).catch(()=>{}).then(()=>{
    _gradeSincronizando = false;
    if(_gradeSincronizarPendente){ _gradeSincronizarPendente = false; sincronizarGradeCompartilhada(); }
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
// As 19 criaturas do Livro Básico não vêm organizadas por categoria temática (diferente das de
// Ameaças de Arton, que já ficam em blocos por local/tema) — aqui mapeamos elas pro mesmo
// "Grupo" que a Tabela 7-1 do livro usa oficialmente, pra tudo funcionar junto no sorteio por local.
const GRUPO_MONSTROS_BASICO = {
  "Lobo":"Ermos", "Gorlogg":"Ermos", "Trog (guerreiro)":"Ermos", "Gnoll Saqueador":"Ermos",
  "Centauro Combatente":"Ermos", "Gnoll Filibusteiro":"Ermos", "Lobo-das-Cavernas":"Ermos",
  "Centauro Xamã":"Ermos", "Cão do Inferno":"Ermos", "Grifo":"Ermos", "Basilisco":"Ermos",
  "Ogro":"Ermos", "Urso-Coruja":"Ermos", "Capelão de Guerra":"Puristas", "Serpe":"Ermos",
  "Ganchador":"Trolls Nobres", "capitão-Baluarte":"Puristas", "Tirano do Terceiro":"Dragões",
  "Vampiro":"Reino dos Mortos",
};
function grupoDaCriatura(m){
  if(GRUPO_MONSTROS_BASICO[m.nome]) return GRUPO_MONSTROS_BASICO[m.nome];
  const cat = AMEACAS_CATEGORIAS.find(c=> c.criaturas.includes(m));
  return cat ? cat.nome : 'Outros';
}
function todosOsLocais(){
  const set = new Set(Object.values(GRUPO_MONSTROS_BASICO));
  AMEACAS_CATEGORIAS.forEach(c=>set.add(c.nome));
  return Array.from(set).sort();
}
// Sorteia um encontro TEMÁTICO — só criaturas do local/grupo escolhido, tentando chegar perto do
// ND alvo. Às vezes sorteia 1 criatura solo (a mais próxima do ND), às vezes um grupo de várias
// cópias de uma criatura mais fraca, calculando quantas dão um combate parecido com o ND alvo
// (mesma fórmula da pág. 282 já usada no Balanço do Encontro).
function sortearEncontroPorLocal(local, ndAlvo){
  const pool = todasCriaturasCompletas().filter(m=> grupoDaCriatura(m)===local);
  if(pool.length===0) return [];
  if(pool.length===1 || Math.random()<0.4){
    const m = pool.reduce((melhor,c)=> Math.abs(c.nd-ndAlvo)<Math.abs(melhor.nd-ndAlvo)?c:melhor, pool[0]);
    return [m];
  }
  const fracos = pool.filter(c=>c.nd < ndAlvo);
  const base = fracos.length>0 ? sortear(fracos) : sortear(pool);
  let qtd = 1;
  while(qtd<8){
    const ndTeste = base.nd<1 ? base.nd*(qtd+1) : base.nd + 2*Math.log2(qtd+1);
    if(ndTeste > ndAlvo+1) break;
    qtd++;
  }
  qtd = Math.max(1, Math.min(qtd, 6));
  const resultado = [];
  for(let i=0;i<qtd;i++) resultado.push(base);
  return resultado;
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
// Combina o ND de várias criaturas num "ND de combate" só, seguindo a regra da pág. 282: pra
// ND<1, soma direto (multiplicado pela quantidade); pra ND>=1, +2 a cada vez que a quantidade
// dobra. Quando o encontro mistura criaturas DIFERENTES, soma a contribuição de cada uma
// separadamente — o livro só cobre grupos de uma criatura igual, isso aqui é uma extensão
// razoável pra grupos mistos, não é 100% RAW.
function ndCombateTotal(criaturas){
  if(!criaturas || criaturas.length===0) return 0;
  const grupos = {};
  criaturas.forEach(c=>{
    const nd = (c.nd===20.5?20:c.nd);
    if(!grupos[c.nome]) grupos[c.nome] = {nd, qtd:0};
    grupos[c.nome].qtd++;
  });
  let total = 0;
  Object.values(grupos).forEach(g=>{
    if(g.nd < 1) total += g.nd * g.qtd;
    else total += g.nd + 2*Math.log2(g.qtd);
  });
  return total;
}
// Balanço do encontro: compara o ND combinado do encontro montado contra o que seria
// "equilibrado" pro grupo ATUAL (nível médio + ajuste pela quantidade de jogadores — a regra
// só é calibrada pra 4; cada jogador a mais/a menos desloca o alvo em ~1 ND, aproximação nossa
// já que o livro não dá um número exato pra isso).
function balancoEncontro(ndEncontroCombinado){
  const nivelGrupo = nivelMedioDoGrupoAtual();
  const qtdJogadores = personagensDoGrupoAtual().length || 4;
  const ndAlvo = Math.max(0.25, nivelGrupo + (qtdJogadores-4));
  const diff = ndEncontroCombinado - ndAlvo;
  let nivel, cor, texto;
  if(diff <= -3){ nivel='facil'; cor='var(--pm-accent)'; texto='Fácil'; }
  else if(diff <= 2){ nivel='equilibrado'; cor='var(--gold)'; texto='Equilibrado'; }
  else if(diff <= 5){ nivel='dificil'; cor='#e0955a'; texto='Difícil'; }
  else { nivel='mortal'; cor='var(--red-bright)'; texto='Mortal ☠️'; }
  return {nivel, cor, texto, ndAlvo, diff};
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
      const ndCombinado = ndCombateTotal(rasc.criaturas);
      const balanco = balancoEncontro(ndCombinado);
      wrap.appendChild(el('div',{class:'tip', style:'margin-top:8px;border:1px solid '+balanco.cor+';'},
        el('b',{style:'color:'+balanco.cor+';'}, '⚖️ '+balanco.texto),
        ' — ND de combate ≈ '+ndTexto(ndMaisProximo(ndCombinado))+' (grupo atual pede por volta de ND '+ndTexto(ndMaisProximo(balanco.ndAlvo))+', considerando nível médio e quantidade de jogadores).'
      ));
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
    const balancoSalvo = balancoEncontro(ndCombateTotal(enc.criaturas));
    wrap.appendChild(el('div',{class:'row', style:'align-items:center;margin-top:6px;'},
      el('div',{style:'flex:1;'},
        el('div',{style:'font-weight:700;'}, enc.nome),
        el('div',{class:'meta'}, enc.criaturas.length+' criatura'+(enc.criaturas.length>1?'s':'')+': '+enc.criaturas.map(c=>c.nome).join(', ')),
        el('div',{class:'meta', style:'color:'+balancoSalvo.cor+';font-weight:700;'}, '⚖️ '+balancoSalvo.texto+' pro grupo atual')
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
  wrap.appendChild(el('div',{class:'row', style:'margin-top:10px;'},
    el('button',{class:'btn', onclick:()=>{
      state._mestreEncontroRascunho = {nome:'', criaturas:[]};
      render();
    }}, 'Montar Encontro Manual +'),
    el('button',{class:'btn ghost', onclick:()=>{
      state._mestreEncontroLocalPopup = {local: todosOsLocais()[0], resultado:null};
      render();
    }}, '🗺️ Encontro por Local')
  ));
  if(state._mestreEncontroLocalPopup){
    const pop = state._mestreEncontroLocalPopup;
    const popPanel = el('div',{class:'panel', style:'margin-top:10px;'}, el('h2',{},'Encontro por Local'));
    popPanel.appendChild(el('div',{class:'tip', style:'font-size:0.78rem;'}, 'Escolhe um lugar/tema e sorteia criaturas que fazem sentido ali, tentando chegar perto de um combate equilibrado pro grupo atual.'));
    const sel = el('select',{onchange:(e)=>{pop.local=e.target.value; pop.resultado=null; render();}});
    todosOsLocais().forEach(l=> sel.appendChild(el('option',{value:l, ...(pop.local===l?{selected:'selected'}:{})}, l)));
    popPanel.appendChild(sel);
    popPanel.appendChild(el('button',{class:'btn', style:'margin-top:8px;', onclick:()=>{
      const nivelGrupo = nivelMedioDoGrupoAtual();
      pop.resultado = sortearEncontroPorLocal(pop.local, nivelGrupo);
      render();
    }}, 'Sortear 🎲'));

    if(pop.resultado){
      if(pop.resultado.length===0){
        popPanel.appendChild(el('div',{class:'empty'},'Nenhuma criatura catalogada nesse local ainda.'));
      } else {
        const balanco = balancoEncontro(ndCombateTotal(pop.resultado));
        popPanel.appendChild(el('div',{class:'tip', style:'margin-top:8px;'}, 'Resultado ('+pop.resultado.length+' criatura'+(pop.resultado.length>1?'s':'')+'): '+pop.resultado.map(c=>c.nome).join(', ')));
        popPanel.appendChild(el('div',{class:'tip', style:'border:1px solid '+balanco.cor+';'}, el('b',{style:'color:'+balanco.cor+';'}, '⚖️ '+balanco.texto)));
        popPanel.appendChild(el('div',{class:'row', style:'margin-top:8px;'},
          el('button',{class:'btn', onclick:()=>{
            if(!state._mestreIniciativa) state._mestreIniciativa = {combatentes:[], turnoIdx:0, rodada:1};
            pop.resultado.forEach(m=>{
              const bonus = extrairBonusIniciativa(m.sentidos);
              state._mestreIniciativa.combatentes.push(novoCombatente(m.nome, 'monstro', bonus, m.pv, m.pv, null, m));
            });
            flashMsg('⚔️ Encontro de "'+pop.local+'" adicionado ao combate!');
            state._mestreEncontroLocalPopup = null;
            render();
          }}, 'Usar Agora ⚔️'),
          el('button',{class:'btn ghost', onclick:()=>{
            const criaturasParaSalvar = pop.resultado.map(m=>({nome:m.nome, nd:m.nd, pv:m.pv, sentidos:m.sentidos}));
            state._mestreEncontrosSalvos.push({id:'enc'+Date.now(), nome:pop.local+' ('+new Date().toLocaleDateString('pt-BR')+')', criaturas:criaturasParaSalvar});
            salvarEncontrosLocal();
            flashMsg('✅ Encontro salvo!');
            state._mestreEncontroLocalPopup = null;
            render();
          }}, 'Salvar')
        ));
      }
    }
    popPanel.appendChild(el('button',{class:'menu-close', style:'margin-top:6px;', onclick:()=>{ state._mestreEncontroLocalPopup=null; render(); }}, 'Fechar'));
    wrap.appendChild(popPanel);
  }
  return wrap;
}

// ---- GRADE DE COMBATE ----
// Um tabuleiro de apoio (não substitui um VTT de verdade) pra visualizar posição, desenhar
// obstáculos e ver alcance. Guardado dentro do próprio combate (state._mestreIniciativa.grade),
// reseta junto quando o combate termina.
const GRADE_LARGURA_PADRAO = 18, GRADE_ALTURA_PADRAO = 12;
// Catálogo de terrenos de fundo — imagens ficam dentro do próprio projeto (img/terrenos/),
// carregam junto com o resto do app sem depender de nenhum site externo.
const TERRENOS_FUNDO = [
  {id:'grama', nome:'🌱 Grama', url:'img/terrenos/grama.jpg', tileable:true},
  {id:'caverna', nome:'🪨 Caverna', url:'img/terrenos/caverna.jpg', tileable:true},
  {id:'masmorra', nome:'🧱 Masmorra', url:'img/terrenos/masmorra.jpg', tileable:true},
  {id:'agua', nome:'🌊 Água', url:'img/terrenos/agua.jpg', tileable:true},
  {id:'pantano', nome:'🐊 Pântano', url:'img/terrenos/pantano.jpg', tileable:true},
  {id:'deserto', nome:'🏜️ Deserto', url:'img/terrenos/deserto.jpg', tileable:true},
  {id:'neve', nome:'🏔️ Neve', url:'img/terrenos/neve.jpg', tileable:true},
  {id:'gelo', nome:'❄️ Gelo', url:'img/terrenos/gelo.jpg', tileable:true},
  {id:'terra', nome:'🟤 Terra', url:'img/terrenos/terra.jpg', tileable:true},
  {id:'madeira', nome:'🪵 Madeira', url:'img/terrenos/madeira.jpg', tileable:true},
  {id:'floresta', nome:'🌲 Floresta', url:'img/terrenos/floresta.jpg', tileable:true},
  {id:'taverna', nome:'🍺 Taverna (cena completa)', url:'img/terrenos/taverna.jpg', tileable:false},
];
const ALCANCES_QUADROS = {curto:6, medio:20, longo:60}; // 1 quadrado = 1,5m (regra pág. 148)
const BLOCO_TIPOS = {
  parede_grossa: {emoji:'🟫', label:'Parede Grossa', cor:'#4a3524', quebravel:false, bloqueiaMovimento:true, bloqueiaVisao:true, desc:'Bloqueia tudo — movimento, visão e ataque à distância. Não quebra.'},
  porta:         {emoji:'🚪', label:'Porta',         cor:'#6b4423', quebravel:true,  bloqueiaMovimento:true, bloqueiaVisao:false, desc:'Bloqueia movimento enquanto fechada. No modo "Quebrar", um toque abre passagem (arromba/abre a porta).'},
  janela:        {emoji:'🪟', label:'Janela',        cor:'#3a6a7a', quebravel:true,  bloqueiaMovimento:true, bloqueiaVisao:false, desc:'Bloqueia movimento, mas dá pra ver/atirar através. Quebra igual à porta.'},
  arvore:        {emoji:'🌳', label:'Árvore',        cor:'#2d5016', quebravel:false, bloqueiaMovimento:true, bloqueiaVisao:true, desc:'Bloqueia movimento e visão. Não quebra (mas dá pra Apagar se cortar ela).'},
  rocha:         {emoji:'🪨', label:'Rocha',         cor:'#5a5a5a', quebravel:false, bloqueiaMovimento:true, bloqueiaVisao:true, desc:'Bloqueia movimento e visão. Não quebra.'},
  dificil:       {emoji:'💧', label:'Terreno Difícil', cor:'#3a5a1a', quebravel:false, bloqueiaMovimento:false, bloqueiaVisao:false, desc:'Água rasa, lama, mato alto... NÃO bloqueia entrar, mas gasta o dobro de deslocamento pra atravessar (regra do livro) — só um aviso, o app não desconta nada sozinho.'},
};
// Tamanho da criatura em quadrados (regra padrão: Médio ou menor = 1, Grande = 2, Enorme = 3,
// Colossal = 4 — cada lado do quadrado que o token ocupa).
const TAMANHO_QUADRADOS = {'Minúsculo':1,'Diminuto':1,'Pequeno':1,'Médio':1,'Grande':2,'Enorme':3,'Colossal':4};
function tamanhoTokenCombatente(c){
  if(!c) return 1;
  if(c.tipo==='monstro' && c.dados && c.dados.tamanho) return TAMANHO_QUADRADOS[c.dados.tamanho]||1;
  if(c.tipo==='pj' && c.origemId){
    const p = (state.perfisTodos||[]).find(x=>x.id===c.origemId);
    const racaObj = p && getRacaObj(p);
    if(racaObj && racaObj.tamanho) return TAMANHO_QUADRADOS[racaObj.tamanho]||1;
  }
  return 1;
}
function celulasOcupadasPorToken(x,y,tam){
  const lista = [];
  for(let dy=0;dy<tam;dy++) for(let dx=0;dx<tam;dx++) lista.push((x+dx)+','+(y+dy));
  return lista;
}
// Ícone pra mostrar em cima do token quando o combatente tem alguma condição ativa. Só PJ tem
// condicoesAtivas rastreado hoje (a ficha dele); monstro fica de fora por enquanto.
function condicaoIconeCombatente(c){
  if(c.tipo!=='pj' || !c.origemId) return null;
  const p = (state.perfisTodos||[]).find(x=>x.id===c.origemId);
  if(!p || !p.condicoesAtivas || p.condicoesAtivas.length===0) return null;
  return {qtd: p.condicoesAtivas.length, primeira: p.condicoesAtivas[0]};
}
// Mapas salvos ficam no aparelho do Mestre (localStorage), não na ficha de ninguém — são
// layouts reutilizáveis (só os blocos, não os tokens) pra não remontar a mesma sala toda vez.
const CHAVE_MAPAS_GRADE = 'painel_aventureiro_mapas_grade';
function carregarMapasGradeSalvos(){
  try{ return JSON.parse(localStorage.getItem(CHAVE_MAPAS_GRADE)||'[]'); }catch(e){ return []; }
}
function salvarMapasGradeSalvos(lista){
  try{ localStorage.setItem(CHAVE_MAPAS_GRADE, JSON.stringify(lista)); }catch(e){}
}
function garantirGrade(combate){
  if(!combate.grade){
    combate.grade = { blocos:{}, posicoes:{} };
  }
  if(combate.grade.paredes && !combate.grade.blocos){
    // migração de fichas com o formato antigo (só fina/grossa, sem paleta)
    combate.grade.blocos = {};
    Object.keys(combate.grade.paredes).forEach(chave=>{
      combate.grade.blocos[chave] = {tipo: combate.grade.paredes[chave]==='grossa' ? 'parede_grossa' : 'porta'};
    });
    delete combate.grade.paredes;
  }
  if(!combate.grade.blocos) combate.grade.blocos = {};
  if(!combate.grade.posicoes) combate.grade.posicoes = {};
  // Migração: "Parede Fina" virou "Porta" (mesmo comportamento, só nome/ícone diferentes) —
  // tabuleiros salvos antes dessa mudança ainda podem ter blocos com o tipo antigo.
  Object.keys(combate.grade.blocos).forEach(chave=>{
    if(combate.grade.blocos[chave].tipo==='parede_fina') combate.grade.blocos[chave].tipo = 'porta';
  });
  if(!combate.grade.largura) combate.grade.largura = GRADE_LARGURA_PADRAO;
  if(!combate.grade.altura) combate.grade.altura = GRADE_ALTURA_PADRAO;
  if(!combate.grade.fogRevelado) combate.grade.fogRevelado = {};
  if(!combate.grade.marcadores) combate.grade.marcadores = {};
  if(!combate.grade.corAneis) combate.grade.corAneis = {};
  if(!combate.grade.mapaCustomizado) combate.grade.mapaCustomizado = null; // {url, offsetX, offsetY, escalaPx}
  if(combate.grade.snapLivre===undefined) combate.grade.snapLivre = false;
  if(!combate.grade.nudges) combate.grade.nudges = {}; // {combatenteId: {x,y}} — deslocamento visual dentro do quadrado, só usado quando snapLivre está ligado
  if(!combate.grade.rotacoes) combate.grade.rotacoes = {}; // {combatenteId: graus} — pra onde o token está de frente
  if(combate.grade.fogAtivo===undefined) combate.grade.fogAtivo = false;
  return combate.grade;
}
function corTokenPorTipo(tipo){
  return tipo==='pj' ? 'var(--pm-accent)' : tipo==='monstro' ? 'var(--red-bright)' : 'var(--gold)';
}
// PJ mostra a própria foto no token, se tiver uma cadastrada na ficha; senão cai pras iniciais.
function fotoDoCombatente(c){
  if(c.tipo!=='pj' || !c.origemId) return null;
  const p = (state.perfisTodos||[]).find(x=>x.id===c.origemId);
  return (p && p.foto) ? p.foto : null;
}
// PV de PJ vem AO VIVO da ficha dele (quem controla a vida é o próprio jogador — o Mestre não
// precisa ficar digitando). Monstro/NPC/personalizado continuam usando o valor guardado no
// próprio combatente, ajustado manualmente pelo Mestre na aba Combate.
function pvAtualCombatente(c){
  if(c.tipo==='pj' && c.origemId){
    const p = (state.perfisTodos||[]).find(x=>x.id===c.origemId);
    if(p) return parseInt(p.pvatual)||0;
  }
  return parseInt(c.pv)||0;
}
function pvMaxCombatente(c){
  if(c.tipo==='pj' && c.origemId){
    const p = (state.perfisTodos||[]).find(x=>x.id===c.origemId);
    if(p) return pvMaxEfetivo(p);
  }
  return parseInt(c.pvMax)||0;
}

// Calcula quais quadrados uma área de efeito atinge. "Alvo" é só a direção (não precisa ser
// exatamente onde o raio termina). Cone abre ~90° na direção do alvo, como a maioria das áreas
// de cone do livro.
function calcularCelulasArea(forma, origemX, origemY, alvoX, alvoY, raioQuadros){
  const celulas = new Set();
  if(forma==='circulo'){
    for(let y=origemY-raioQuadros; y<=origemY+raioQuadros; y++){
      for(let x=origemX-raioQuadros; x<=origemX+raioQuadros; x++){
        if(Math.max(Math.abs(x-origemX), Math.abs(y-origemY))<=raioQuadros) celulas.add(x+','+y);
      }
    }
  } else if(forma==='linha'){
    const dx = alvoX-origemX, dy = alvoY-origemY;
    const dist = Math.max(Math.abs(dx), Math.abs(dy)) || 1;
    const passoX = dx/dist, passoY = dy/dist;
    for(let i=1;i<=raioQuadros;i++){
      celulas.add(Math.round(origemX+passoX*i)+','+Math.round(origemY+passoY*i));
    }
  } else if(forma==='cone'){
    if(alvoX===origemX && alvoY===origemY) return celulas;
    const anguloAlvo = Math.atan2(alvoY-origemY, alvoX-origemX);
    for(let y=origemY-raioQuadros; y<=origemY+raioQuadros; y++){
      for(let x=origemX-raioQuadros; x<=origemX+raioQuadros; x++){
        if(x===origemX && y===origemY) continue;
        if(Math.hypot(x-origemX, y-origemY)>raioQuadros) continue;
        let diff = Math.abs(Math.atan2(y-origemY, x-origemX) - anguloAlvo);
        if(diff>Math.PI) diff = 2*Math.PI-diff;
        if(diff <= Math.PI/4) celulas.add(x+','+y);
      }
    }
  }
  return celulas;
}

// Linha de visão entre 2 pontos — percorre a linha entre eles (Bresenham) e checa se algum
// bloco no meio do caminho (que não seja a origem/destino) bloqueia visão. Não avalia distância
// nenhuma, só "tem parede no meio ou não" — combine com o alcance da arma/magia à parte.
function temLinhaDeVisao(grade, x0, y0, x1, y1){
  let dx = Math.abs(x1-x0), dy = Math.abs(y1-y0);
  let sx = x0<x1 ? 1 : -1, sy = y0<y1 ? 1 : -1;
  let err = dx-dy;
  let x = x0, y = y0;
  while(!(x===x1 && y===y1)){
    if(!(x===x0 && y===y0)){
      const bloco = grade.blocos[x+','+y];
      if(bloco && BLOCO_TIPOS[bloco.tipo].bloqueiaVisao) return false;
    }
    const e2 = 2*err;
    if(e2 > -dy){ err -= dy; x += sx; }
    if(e2 < dx){ err += dx; y += sy; }
  }
  return true;
}

// Revela automaticamente todo quadrado que algum token de PJ enxerga (linha de visão livre,
// dentro de um raio "normal" de visão de 12 quadrados/18m). Só soma ao que já tava revelado —
// nunca esconde de novo algo que os jogadores já viram.
// Calcula quais quadrados estão VISÍVEIS AGORA MESMO pelos PJs (não é memória permanente —
// é recalculado toda vez, na hora). Diferente do fogRevelado (que só soma e nunca esquece,
// pensado pra terreno/paredes já exploradas), isso aqui serve pra decidir se um MONSTRO deve
// aparecer pro jogador: se ele andar por uma sala que os PJs já visitaram mas não estão mais
// olhando pra lá, ele não devia continuar aparecendo lá — só quem tá na visão atual.
function celulasVisiveisAgoraPorPjs(combatentes, grade){
  const RAIO_VISAO = 12;
  const visiveis = new Set();
  combatentes.filter(c=>c.tipo==='pj' && grade.posicoes[c.id]).forEach(pj=>{
    const origem = grade.posicoes[pj.id];
    for(let y=Math.max(0,origem.y-RAIO_VISAO); y<=Math.min(grade.altura-1,origem.y+RAIO_VISAO); y++){
      for(let x=Math.max(0,origem.x-RAIO_VISAO); x<=Math.min(grade.largura-1,origem.x+RAIO_VISAO); x++){
        if(Math.hypot(x-origem.x, y-origem.y) > RAIO_VISAO) continue;
        if(temLinhaDeVisao(grade, origem.x, origem.y, x, y)) visiveis.add(x+','+y);
      }
    }
  });
  return visiveis;
}

// Quais quadrados algum PJ enxerga NESSE EXATO MOMENTO (dinâmico, recalculado toda hora — não
// confundir com fogRevelado, que é a memória permanente "já vi esse terreno uma vez"). Usado
// pra decidir se o TOKEN de uma criatura aparece pros jogadores — terreno já visto continua
// visível pra sempre, mas um monstro que passa por uma sala vazia (sem PJ olhando pra lá agora)
// não deveria aparecer só porque a sala já foi explorada antes.
function celulasVisiveisAgora(combatentes, grade){
  const RAIO_VISAO = 12;
  const visiveis = new Set();
  combatentes.filter(c=>c.tipo==='pj').forEach(pj=>{
    const origem = grade.posicoes[pj.id];
    if(!origem) return;
    for(let y=Math.max(0,origem.y-RAIO_VISAO); y<=Math.min(grade.altura-1,origem.y+RAIO_VISAO); y++){
      for(let x=Math.max(0,origem.x-RAIO_VISAO); x<=Math.min(grade.largura-1,origem.x+RAIO_VISAO); x++){
        if(Math.hypot(x-origem.x,y-origem.y)>RAIO_VISAO) continue;
        if(temLinhaDeVisao(grade, origem.x, origem.y, x, y)) visiveis.add(x+','+y);
      }
    }
  });
  return visiveis;
}
// Monta a versão da grade que vai pro link dos jogadores: cópia da grade "de verdade", mas sem
// a posição de nenhuma criatura que não seja PJ e não esteja na visão atual de ninguém. O
// tabuleiro do Mestre continua com a grade completa — essa função nunca mexe nela, só devolve
// uma cópia à parte.
function computarGradeParaJogadores(combatentes, grade){
  const copia = JSON.parse(JSON.stringify(grade));
  if(!grade.fogAtivo) return copia; // sem névoa, todo mundo vê tudo igual
  const visiveisAgora = celulasVisiveisAgora(combatentes, grade);
  Object.keys(copia.posicoes).forEach(id=>{
    const c = combatentes.find(cc=>cc.id===id);
    if(!c || c.tipo==='pj') return; // PJ sempre aparece pra galera na mesma mesa
    const pos = copia.posicoes[id];
    const tamToken = tamanhoTokenCombatente(c);
    const ocupadas = celulasOcupadasPorToken(pos.x, pos.y, tamToken);
    const visivel = ocupadas.some(chave=>visiveisAgora.has(chave));
    if(!visivel) delete copia.posicoes[id];
  });
  return copia;
}

function revelarPorVisaoDosPjs(combate, grade, silencioso){
  const RAIO_VISAO = 12;
  const pjsNoTabuleiro = combate.combatentes.filter(c=>c.tipo==='pj' && grade.posicoes[c.id]);
  if(pjsNoTabuleiro.length===0){ if(!silencioso) flashMsg('Nenhum PJ está posicionado no tabuleiro ainda.'); return; }
  let novos = 0;
  pjsNoTabuleiro.forEach(pj=>{
    const origem = grade.posicoes[pj.id];
    for(let y=Math.max(0,origem.y-RAIO_VISAO); y<=Math.min(grade.altura-1,origem.y+RAIO_VISAO); y++){
      for(let x=Math.max(0,origem.x-RAIO_VISAO); x<=Math.min(grade.largura-1,origem.x+RAIO_VISAO); x++){
        const chave = x+','+y;
        if(grade.fogRevelado[chave]) continue;
        if(Math.hypot(x-origem.x, y-origem.y) > RAIO_VISAO) continue;
        if(temLinhaDeVisao(grade, origem.x, origem.y, x, y)){ grade.fogRevelado[chave] = true; novos++; }
      }
    }
  });
  if(!silencioso) flashMsg(novos>0 ? '🌫️ '+novos+' quadrado(s) revelado(s) pela visão dos PJs.' : 'Nada novo pra revelar (já estava tudo visível).');
  sincronizarGradeCompartilhada();
}

// ---- Tela de visualização compartilhada (link ?vergrade=CODIGO, sem login) ----
// Toda vez que o jogador move algo localmente, esse número sobe — o polling usa isso pra saber
// se alguma coisa mudou ENQUANTO ele estava buscando, e se mudou, descarta o que buscou em vez
// de sobrescrever a mudança mais nova (mesma técnica usada do lado do Mestre).
let _verGradeVersaoLocal = 0;
async function atualizarVisualizacaoGrade(){
  if(state._verGradeSalvando) return; // não busca de novo enquanto um movimento tá sendo salvo, senão pisa em si mesmo
  const versaoAntesDaBusca = _verGradeVersaoLocal;
  const dados = await carregarMestreDadosPorCodigo(state._verGradeCodigo);
  if(state._verGradeSalvando || _verGradeVersaoLocal!==versaoAntesDaBusca) return; // mudou algo no meio do caminho, descarta o dado velho
  // Se a busca falhar (rede instável, Apps Script "dormindo" e demorando pra acordar, etc.),
  // carregarMestreDadosPorCodigo devolve um formato vazio de fallback — sem essa checagem, ISSO
  // sozinho já apagava o tabuleiro inteiro da tela do jogador (o mapa "sumia" por causa de uma
  // falha de rede passageira, mesmo com o dado real intacto no servidor). Agora só substitui o
  // que já está na tela se a busca realmente trouxe algo válido; senão, mantém o último bom.
  if(!dados.combateCompartilhado || !dados.combateCompartilhado.grade) return;
  const combateCompartilhado = dados.combateCompartilhado;
  // pro jogador, "grade" É a versão filtrada — ele nunca recebe posição de monstro escondido,
  // nem trafegando na rede. O Mestre é quem usa a versão completa (gradeParaJogadores nem
  // existe do lado dele).
  combateCompartilhado.grade = combateCompartilhado.gradeParaJogadores || combateCompartilhado.grade;
  // Se nada mudou de verdade desde a última busca, nem reconstrói a tela — reconstruir à toa
  // era o motivo real de "arrastei o mapa pro lado e ele volta sozinho": a cada 2s, mesmo sem
  // ninguém ter mexido em nada, a tela inteira era refeita do zero e a rolagem que o próprio
  // navegador tava segurando (inércia do dedo, por exemplo) se perdia no meio do caminho.
  const assinaturaNova = JSON.stringify(combateCompartilhado);
  if(assinaturaNova === state._verGradeUltimaAssinatura) return;
  state._verGradeUltimaAssinatura = assinaturaNova;
  state._verGradeDados = combateCompartilhado;
  render();
}
// Ping do jogador — mesma ideia, mas ele só tem a grade FILTRADA na tela (sem monstro
// escondido), então não pode salvar sobrescrevendo tudo. Faz o mesmo "buscar fresco, aplicar só
// essa mudança, salvar" que o movimento do jogador já faz.
async function dispararPingComoJogador(codigo, x, y){
  const atual = await carregarMestreDadosPorCodigo(codigo);
  if(!atual.combateCompartilhado || !atual.combateCompartilhado.grade) return;
  const criadoEm = Date.now();
  atual.combateCompartilhado.grade.ping = {x, y, criadoEm};
  atual.combateCompartilhado.gradeParaJogadores = computarGradeParaJogadores(atual.combateCompartilhado.combatentes, atual.combateCompartilhado.grade);
  await salvarMestreDadosArmazenamento(atual, codigo);
  setTimeout(async ()=>{
    const atual2 = await carregarMestreDadosPorCodigo(codigo);
    const g2 = atual2.combateCompartilhado && atual2.combateCompartilhado.grade;
    if(g2 && g2.ping && g2.ping.criadoEm===criadoEm){
      delete g2.ping;
      atual2.combateCompartilhado.gradeParaJogadores = computarGradeParaJogadores(atual2.combateCompartilhado.combatentes, g2);
      await salvarMestreDadosArmazenamento(atual2, codigo);
    }
  }, 2200);
}

// Fila de salvamento do jogador — se ele mover 2 vezes rápido (sem esperar a primeira jogada
// terminar de salvar), ANTES cada movimento disparava seu próprio salvamento em paralelo, e
// como são requisições de rede, o mais lento podia terminar DEPOIS do mais rápido e apagar a
// jogada mais nova (o mesmo tipo de corrida que já resolvemos do lado do Mestre, só que nunca
// tinha sido replicada aqui). Agora só roda 1 salvamento de cada vez; se pedir de novo enquanto
// um já tá rodando, só atualiza qual é a posição mais recente a enviar. Precisa ficar em escopo
// de módulo (fora da função de render) — se ficasse dentro, toda vez que a tela redesenhasse
// (o que acontece a cada 2s pelo polling) a fila seria reiniciada do zero, perdendo o controle
// de qualquer salvamento que ainda estivesse em andamento.
let _jogadorSalvando = false;
let _jogadorFila = [];
function enfileirarMovimentoJogador(codigo, combatenteId, x, y){
  _verGradeVersaoLocal++;
  const idx = _jogadorFila.findIndex(m=>m.combatenteId===combatenteId);
  if(idx>=0) _jogadorFila[idx] = {codigo, combatenteId, x, y};
  else _jogadorFila.push({codigo, combatenteId, x, y});
  processarFilaJogador();
}
async function processarFilaJogador(){
  if(_jogadorSalvando || _jogadorFila.length===0) return;
  _jogadorSalvando = true;
  state._verGradeSalvando = true;
  const proximo = _jogadorFila.shift();
  await salvarMovimentoTokenComoJogador(proximo.codigo, proximo.combatenteId, {x:proximo.x, y:proximo.y}).catch(()=>{});
  _jogadorSalvando = false;
  state._verGradeSalvando = _jogadorFila.length>0; // só libera de vez se não tiver mais nada na fila
  if(_jogadorFila.length>0) processarFilaJogador();
}

function renderVisualizacaoGrade(){
  const wrap = el('div',{style:'padding:14px;max-width:100vw;'});
  wrap.appendChild(el('div',{style:'display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:10px;position:relative;'},
    el('div',{style:'font-size:1.1rem;font-weight:800;color:var(--gold);'}, '🗺️ Tabuleiro da Mesa'),
    el('button',{class:'btn ghost', style:'position:absolute;right:0;width:auto;padding:5px 10px;font-size:0.75rem;', onclick:()=>{
      if(document.fullscreenElement){ document.exitFullscreen().catch(()=>{}); return; }
      const alvo = document.getElementById('viewer-scroll-wrap');
      if(alvo && alvo.requestFullscreen) alvo.requestFullscreen().catch(()=>{});
    }}, '⛶ Tela Cheia')
  ));
  const dados = state._verGradeDados;
  if(!dados || !dados.grade || !dados.combatentes || dados.combatentes.length===0){
    wrap.appendChild(el('div',{class:'tip', style:'text-align:center;'}, 'O Mestre ainda não compartilhou um tabuleiro, ou o combate ainda não começou. Essa tela atualiza sozinha — pode deixar aberta.'));
    return wrap;
  }
  const grade = dados.grade;
  const combatentes = dados.combatentes;
  const tam = 30;
  const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  wrap.appendChild(el('div',{class:'tip', style:'font-size:0.78rem;margin-bottom:8px;'}, 'Toque num personagem pra selecionar, depois toque num quadrado pra mover ele. Some as jogadas — atualiza sozinho pros outros verem.'));

  const turnoIdx = dados.turnoIdx||0;
  const faixaIniciativa = el('div',{'data-preservar-scroll':'viewer-iniciativa', style:'display:flex;gap:5px;overflow-x:auto;padding:2px 2px 10px;'});
  combatentes.forEach((c,idx)=>{
    const noTurno = idx===turnoIdx;
    faixaIniciativa.appendChild(el('div',{
      style:'flex-shrink:0;width:34px;height:34px;border-radius:50%;border:'+(noTurno?'2px solid var(--gold)':'2px solid transparent')+';background:'+corTokenPorTipo(c.tipo)+';overflow:hidden;box-shadow:'+(noTurno?'0 0 8px var(--gold)':'none')+';',
      title:c.nome,
    }, c.foto ? el('img',{src:c.foto, style:'width:100%;height:100%;object-fit:cover;'}) : el('div',{style:'width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:0.62rem;font-weight:800;color:#1a0f0a;'}, c.nome.slice(0,2).toUpperCase())));
  });
  wrap.appendChild(faixaIniciativa);

  function tentarMoverComoJogador(combatenteId, xClicado, yClicado){
    const alvo = combatentes.find(cc=>cc.id===combatenteId);
    if(!alvo){ state._verGradeSelecionado = null; return false; }
    const tamToken = (alvo.tipo==='monstro' && alvo.dados && alvo.dados.tamanho) ? (TAMANHO_QUADRADOS[alvo.dados.tamanho]||1) : 1;
    const deslocamento = Math.floor((tamToken-1)/2);
    const x = Math.max(0, Math.min(grade.largura-tamToken, xClicado-deslocamento));
    const y = Math.max(0, Math.min(grade.altura-tamToken, yClicado-deslocamento));
    if(x+tamToken>grade.largura || y+tamToken>grade.altura) return false;
    const celulasAlvo = celulasOcupadasPorToken(x,y,tamToken);
    for(const chaveCel of celulasAlvo){
      const bloco = grade.blocos[chaveCel];
      if(bloco && BLOCO_TIPOS[bloco.tipo].bloqueiaMovimento) return false;
    }
    const ocupado = combatentes.some(outro=>{
      if(outro.id===combatenteId) return false;
      const pos = grade.posicoes[outro.id];
      if(!pos) return false;
      const tamOutro = (outro.tipo==='monstro' && outro.dados && outro.dados.tamanho) ? (TAMANHO_QUADRADOS[outro.dados.tamanho]||1) : 1;
      return celulasOcupadasPorToken(pos.x,pos.y,tamOutro).some(c=>celulasAlvo.includes(c));
    });
    if(ocupado) return false;
    grade.posicoes[combatenteId] = {x,y};
    if(grade.fogAtivo && alvo.tipo==='pj') revelarPorVisaoDosPjs({combatentes}, grade, true);
    // salva em segundo plano (enfileirado) — o token já aparece no lugar novo na hora, sem
    // esperar a planilha responder. Manda só ESSA mudança de posição (não a grade inteira, que
    // do lado do jogador é a versão filtrada, sem monstro escondido — mandar ela de volta
    // apagaria isso pro Mestre também).
    enfileirarMovimentoJogador(state._verGradeCodigo, combatenteId, x, y);
    return true;
  }

  const anchorPorCelula = {};
  combatentes.forEach(c=>{
    const pos = grade.posicoes[c.id];
    if(!pos) return;
    const tamToken = (c.tipo==='monstro' && c.dados && c.dados.tamanho) ? (TAMANHO_QUADRADOS[c.dados.tamanho]||1) : 1;
    celulasOcupadasPorToken(pos.x,pos.y,tamToken).forEach(chave=>{ anchorPorCelula[chave]=c.id; });
  });

  const terrenoAtual = TERRENOS_FUNDO.find(t=>t.id===grade.terrenoFundo);
  const mapaCustom = grade.mapaCustomizado;
  const temMapaCustom = mapaCustom && mapaCustom.url;
  const temTerrenoImagem = !temMapaCustom && terrenoAtual && terrenoAtual.url;
  const terrenoRepete = temTerrenoImagem && terrenoAtual.tileable!==false;
  const terrenoCena = temTerrenoImagem && terrenoAtual.tileable===false;
  const larguraPx = grade.largura*tam, alturaPx = grade.altura*tam;
  const scrollWrap = el('div',{id:'viewer-scroll-wrap', 'data-preservar-scroll':'viewer-tabuleiro', style:'max-width:100%; overflow:auto; -webkit-overflow-scrolling:touch; border:2px solid var(--line); border-radius:6px;'});
  const tabuleiro = el('div',{style:'display:grid; grid-template-columns:'+Math.round(tam*0.7)+'px repeat('+grade.largura+', '+tam+'px); gap:0; background:var(--line); width:max-content;'
    +(temMapaCustom ? ' background-image:url('+mapaCustom.url+'); background-size:'+mapaCustom.escalaPx+'px '+mapaCustom.escalaPx+'px; background-position:'+mapaCustom.offsetX+'px '+mapaCustom.offsetY+'px; background-repeat:repeat;'
      : terrenoRepete ? ' background-image:url('+terrenoAtual.url+'); background-size:'+tam+'px '+tam+'px; background-repeat:repeat;' : '')});
  const areaJogavel = terrenoCena ? el('div',{style:'position:absolute; left:'+Math.round(tam*0.7)+'px; top:'+Math.round(tam*0.6)+'px; width:'+larguraPx+'px; height:'+alturaPx+'px; background-image:url('+terrenoAtual.url+'); background-size:cover; background-position:center; pointer-events:none;'}) : null;

  tabuleiro.appendChild(el('div',{style:'width:'+Math.round(tam*0.7)+'px;height:'+Math.round(tam*0.6)+'px;'}));
  for(let x=0;x<grade.largura;x++){
    tabuleiro.appendChild(el('div',{style:'width:'+tam+'px;height:'+Math.round(tam*0.6)+'px;display:flex;align-items:center;justify-content:center;font-size:'+Math.round(tam*0.32)+'px;color:var(--ink-soft);'}, letras[x]||''));
  }
  for(let y=0;y<grade.altura;y++){
    tabuleiro.appendChild(el('div',{style:'width:'+Math.round(tam*0.7)+'px;height:'+tam+'px;display:flex;align-items:center;justify-content:center;font-size:'+Math.round(tam*0.32)+'px;color:var(--ink-soft);'}, String(y+1)));
    for(let x=0;x<grade.largura;x++){
      const chave = x+','+y;
      const escondido = grade.fogAtivo && !grade.fogRevelado[chave];
      const bloco = grade.blocos[chave];
      const anchorId = anchorPorCelula[chave];
      const ehAncora = anchorId && grade.posicoes[anchorId].x===x && grade.posicoes[anchorId].y===y;
      const c = ehAncora ? combatentes.find(cc=>cc.id===anchorId) : null;
      const bgCelula = escondido ? '#0a0a0a' : (bloco ? BLOCO_TIPOS[bloco.tipo].cor : ((terrenoRepete||terrenoCena||temMapaCustom) ? 'transparent' : 'var(--card)'));
      const bordas = (bloco && !escondido) ? bordasVisiveisBloco(grade, x, y, bloco.tipo) : {top:true,right:true,bottom:true,left:true};
      const estiloBordas = 'border-top:'+(bordas.top?'1px solid '+COR_GRADE_LINHA:'none')+
        ';border-right:'+(bordas.right?'1px solid '+COR_GRADE_LINHA:'none')+
        ';border-bottom:'+(bordas.bottom?'1px solid '+COR_GRADE_LINHA:'none')+
        ';border-left:'+(bordas.left?'1px solid '+COR_GRADE_LINHA:'none')+';';
      const celula = el('div',{
        style:'width:'+tam+'px;height:'+tam+'px;background:'+bgCelula+';display:flex;align-items:center;justify-content:center;position:relative;cursor:pointer;'+estiloBordas,
        onclick:()=>{
          if(escondido) return;
          if(anchorId){ state._verGradeSelecionado = anchorId; render(); return; }
          if(state._verGradeSelecionado){ capturarParaAnimacaoMovimento(state._verGradeSelecionado); tentarMoverComoJogador(state._verGradeSelecionado, x, y); render(); }
        }
      });
      if(!escondido){
        let temporizadorPing = null;
        const cancelarPing = ()=>{ if(temporizadorPing){ clearTimeout(temporizadorPing); temporizadorPing=null; } };
        celula.addEventListener('pointerdown',()=>{
          cancelarPing();
          temporizadorPing = setTimeout(()=>{
            temporizadorPing = null;
            grade.ping = {x, y, criadoEm: Date.now()}; // otimista — já pisca na hora, sem esperar rede
            render();
            dispararPingComoJogador(state._verGradeCodigo, x, y);
          }, 500);
        });
        celula.addEventListener('pointerup', cancelarPing);
        celula.addEventListener('pointerleave', cancelarPing);
        celula.addEventListener('pointercancel', cancelarPing);
      }
      if(grade.ping && grade.ping.x===x && grade.ping.y===y && (Date.now()-grade.ping.criadoEm)<2200){
        celula.appendChild(el('div',{style:'position:absolute;inset:-6px;border-radius:50%;border:3px solid var(--gold);pointer-events:none;animation:ping-grade 1.1s ease-out infinite;'}));
      }
      if(!escondido){
        const isolado = bordas.top && bordas.right && bordas.bottom && bordas.left;
        if(bloco && isolado) celula.appendChild(el('div',{style:'font-size:'+Math.round(tam*0.6)+'px;opacity:0.9;'}, BLOCO_TIPOS[bloco.tipo].emoji));
        if(c){
          const tamToken = (c.tipo==='monstro' && c.dados && c.dados.tamanho) ? (TAMANHO_QUADRADOS[c.dados.tamanho]||1) : 1;
          const pxToken = tamToken*tam + (tamToken-1)*1;
          const selecionado = state._verGradeSelecionado===c.id;
          const noTurnoToken = combatentes.indexOf(c)===turnoIdx;
          const anelCustom = grade.corAneis && grade.corAneis[c.id];
          const anelEstiloViewer = selecionado?'0 0 0 3px var(--gold)':noTurnoToken?'0 0 0 3px #5ea8e0, 0 0 8px #5ea8e0':anelCustom?'0 0 0 3px '+anelCustom:'0 0 0 2px rgba(0,0,0,0.4)';
          const nudgeViewer = grade.nudges && grade.nudges[c.id];
          const nudgePxViewer = nudgeViewer ? {x:Math.round(nudgeViewer.x*pxToken), y:Math.round(nudgeViewer.y*pxToken)} : {x:0,y:0};
          const tokenWrap = el('div',{'data-token-id':c.id, style:'position:absolute; top:'+nudgePxViewer.y+'px; left:'+nudgePxViewer.x+'px; width:'+pxToken+'px; height:'+pxToken+'px; z-index:5; filter:drop-shadow(0 3px 3px rgba(0,0,0,0.5));'});
          tokenWrap.appendChild(el('div',{style:'width:100%;height:100%;border-radius:50%;background:'+corTokenPorTipo(c.tipo)+';display:flex;align-items:center;justify-content:center;font-weight:800;color:#1a0f0a;overflow:hidden;box-shadow:'+anelEstiloViewer+';font-size:'+Math.round(pxToken*0.34)+'px;'},
            c.foto ? el('img',{src:c.foto, style:'width:100%;height:100%;object-fit:cover;border-radius:50%;'}) : c.nome.slice(0,2).toUpperCase()
          ));
          if(c.pvMax){
            const pvPct = Math.max(0, Math.min(100, (c.pv||0)/c.pvMax*100));
            tokenWrap.appendChild(el('div',{style:'position:absolute;bottom:-3px;left:8%;width:84%;height:3px;background:rgba(0,0,0,0.5);border-radius:2px;overflow:hidden;'},
              el('div',{style:'width:'+pvPct+'%;height:100%;background:'+(pvPct>50?'#5ea85e':pvPct>25?'#c9a23a':'#c94a3a')+';'})
            ));
          }
          const rotacaoViewer = grade.rotacoes && grade.rotacoes[c.id];
          if(rotacaoViewer){
            tokenWrap.appendChild(el('div',{style:'position:absolute; top:50%; left:50%; width:0; height:0; border-left:5px solid transparent; border-right:5px solid transparent; border-bottom:10px solid var(--gold); transform:translate(-50%,-50%) rotate('+rotacaoViewer+'deg) translateY(-'+Math.round(pxToken*0.55)+'px); pointer-events:none;'}));
          }
          celula.appendChild(tokenWrap);
        }
      }
      tabuleiro.appendChild(celula);
    }
  }
  if(terrenoCena){
    const tabuleiroWrap = el('div',{style:'position:relative;'});
    tabuleiroWrap.appendChild(areaJogavel);
    tabuleiroWrap.appendChild(tabuleiro);
    scrollWrap.appendChild(tabuleiroWrap);
  } else {
    scrollWrap.appendChild(tabuleiro);
  }
  wrap.appendChild(scrollWrap);
  wrap.appendChild(el('div',{class:'meta', style:'text-align:center;margin-top:10px;'}, 'Atualiza sozinho a cada 2 segundos — pode deixar essa aba aberta.'));
  return wrap;
}

// Calcula quais das 4 bordas de uma célula com bloco devem aparecer — lados que encostam num
// bloco IGUAL ficam sem borda, pra virar uma massa contínua (parede de verdade) em vez de vários
// quadrados separados. Lados sem vizinho igual mantêm a borda normal.
function bordasVisiveisBloco(grade, x, y, tipo){
  const igual = (vx,vy)=>{ const b = grade.blocos[vx+','+vy]; return b && b.tipo===tipo; };
  return {
    top: !igual(x,y-1), right: !igual(x+1,y), bottom: !igual(x,y+1), left: !igual(x-1,y),
  };
}

const MODOS_GRADE = [['mover','🚶 Mover'],['blocos','🧊 Blocos'],['quebrar','🔨 Quebrar'],['marcador','🎨 Marcador'],['apagar','🧹 Apagar'],['alcance','📏 Alcance'],['area','💥 Área'],['medir','📐 Medir'],['fog','🌫️ Névoa']];
// Marcador colorido: sinaliza algo temporário (área de gás, fogo, zona de efeito...) sem virar
// bloco sólido — não impede ninguém de entrar ali, é só um aviso visual.
// Linha de grade bem discreta (quase invisível até você precisar prestar atenção) — VTTs de
// verdade fazem assim, em vez da linha grossa e forte que a gente tinha antes.
const COR_GRADE_LINHA = 'rgba(255,255,255,0.09)';
const CORES_MARCADOR = [
  {id:'vermelho', cor:'rgba(224,69,58,0.45)', label:'🔴 Vermelho'},
  {id:'azul', cor:'rgba(90,150,224,0.45)', label:'🔵 Azul'},
  {id:'verde', cor:'rgba(90,200,110,0.45)', label:'🟢 Verde'},
  {id:'amarelo', cor:'rgba(224,200,60,0.45)', label:'🟡 Amarelo'},
  {id:'roxo', cor:'rgba(170,90,224,0.45)', label:'🟣 Roxo'},
];
// Quando o jogador move um token pelo link, NÃO dá pra simplesmente mandar de volta a grade que
// ele tem na tela — a dele é a versão FILTRADA (sem monstro escondido), e se isso fosse salvo
// por cima da grade completa do Mestre, os monstros escondidos sumiriam pra sempre do controle
// dele também. Em vez disso: busca a versão completa mais atual do servidor, aplica só essa UMA
// mudança de posição nela, e recalcula a versão filtrada em cima do resultado completo.
async function salvarMovimentoTokenComoJogador(codigo, combatenteId, novaPosicao){
  const atual = await carregarMestreDadosPorCodigo(codigo);
  if(!atual.combateCompartilhado || !atual.combateCompartilhado.grade) return false;
  const combate = atual.combateCompartilhado;
  combate.grade.posicoes[combatenteId] = novaPosicao;
  const combatenteMovido = combate.combatentes.find(c=>c.id===combatenteId);
  if(combate.grade.fogAtivo && combatenteMovido && combatenteMovido.tipo==='pj'){
    revelarPorVisaoDosPjs({combatentes: combate.combatentes}, combate.grade, true);
  }
  combate.gradeParaJogadores = computarGradeParaJogadores(combate.combatentes, combate.grade);
  return salvarMestreDadosArmazenamento(atual, codigo);
}

// Movimento suave (técnica FLIP): captura onde o token está ANTES de mudar de posição; depois
// que o resto do código mexe nos dados e re-renderiza (de forma síncrona), no próximo frame já
// dá pra medir a posição NOVA, aplicar um deslocamento igual à diferença e animar até zero —
// fica parecendo que ele deslizou, em vez de simplesmente "teleportar".
function capturarParaAnimacaoMovimento(combatenteId){
  const elAntes = document.querySelector('[data-token-id="'+combatenteId+'"]');
  if(!elAntes || typeof elAntes.getBoundingClientRect!=='function') return;
  const rectAntes = elAntes.getBoundingClientRect();
  requestAnimationFrame(()=>{
    const elDepois = document.querySelector('[data-token-id="'+combatenteId+'"]');
    if(!elDepois) return;
    const rectDepois = elDepois.getBoundingClientRect();
    const dx = rectAntes.left - rectDepois.left, dy = rectAntes.top - rectDepois.top;
    if(Math.abs(dx)<1 && Math.abs(dy)<1) return;
    elDepois.style.transition = 'none';
    elDepois.style.transform = 'translate('+dx+'px,'+dy+'px)';
    requestAnimationFrame(()=>{
      elDepois.style.transition = 'transform 0.25s ease-out';
      elDepois.style.transform = 'translate(0,0)';
    });
  });
}

// Ping — toque e segure um ponto do mapa pra ele piscar por alguns segundos pra todo mundo ver
// (Mestre e jogadores), tipo "óó, ali!" sem precisar descrever o quadrado. Passa sozinho.
function dispararPing(grade, x, y){
  grade.ping = {x, y, criadoEm: Date.now()};
  sincronizarGradeCompartilhada();
  render();
  setTimeout(()=>{
    if(grade.ping && grade.ping.x===x && grade.ping.y===y && grade.ping.criadoEm){
      delete grade.ping;
      sincronizarGradeCompartilhada();
      render();
    }
  }, 2200);
}
// Liga o toque-e-segure numa célula pra disparar o ping — funciona em QUALQUER modo, é uma
// ferramenta de comunicação, não de editar o mapa. 500ms segurando sem soltar/mover = ping.
function ligarTogueLongoPing(elemento, grade, x, y){
  let temporizador = null;
  const cancelar = ()=>{ if(temporizador){ clearTimeout(temporizador); temporizador=null; } };
  elemento.addEventListener('pointerdown',(e)=>{
    cancelar();
    temporizador = setTimeout(()=>{ temporizador=null; dispararPing(grade,x,y); }, 500);
  });
  elemento.addEventListener('pointerup', cancelar);
  elemento.addEventListener('pointerleave', cancelar);
  elemento.addEventListener('pointercancel', cancelar);
}

function renderMestreGrade(){
  iniciarAtualizacaoAutomaticaGradeMestre();
  const wrap = el('div',{});
  if(!state._mestreIniciativa) state._mestreIniciativa = {combatentes:[], turnoIdx:0, rodada:1};
  const combate = state._mestreIniciativa;
  const grade = garantirGrade(combate);

  // Desfazer específico da Grade — guarda uma cópia de como a grade estava ANTES da última
  // ação (mover, colocar bloco, marcador, névoa), só 1 passo pra trás. Chamado sempre ANTES de
  // qualquer mutação (não depois), pra sempre ter "o estado de antes" pronto.
  function salvarEstadoParaDesfazer(){
    state._gradeDesfazer = JSON.parse(JSON.stringify(grade));
  }
  function desfazerUltimaAcaoGrade(){
    if(!state._gradeDesfazer){ flashMsg('Nada recente pra desfazer na Grade.'); return; }
    combate.grade = state._gradeDesfazer;
    state._gradeDesfazer = null;
    sincronizarGradeCompartilhada();
    flashMsg('↩️ Última ação da Grade desfeita.');
    render();
  }

  if(combate.combatentes.length===0){
    wrap.appendChild(el('div',{class:'tip'}, el('b',{},'Nada em combate ainda'), 'Monte o encontro em "Preparar Encontro" e mande pro combate — os tokens aparecem aqui automaticamente.'));
    return wrap;
  }

  if(!state._gradeModo) state._gradeModo = 'mover';
  if(!state._gradeZoom) state._gradeZoom = 30;
  const terrenoAtual = TERRENOS_FUNDO.find(t=>t.id===grade.terrenoFundo);

  // ---- Barra de topo: botões que abrem popup, pra não poluir a tela toda vez ----
  const modoAtualLabel = (MODOS_GRADE.find(([id])=>id===state._gradeModo)||['','?'])[1];
  wrap.appendChild(el('div',{class:'tab-grid'},
    el('button',{onclick:()=>{ state._gradePopup='acoes'; render(); }}, '🎬 '+modoAtualLabel),
    el('button',{onclick:()=>{ state._gradePopup='terreno'; render(); }}, terrenoAtual ? '🖼️ '+terrenoAtual.nome : '🖼️ Terreno'),
    el('button',{onclick:()=>{ state._gradePopup='mapas'; render(); }}, '🗺️ Mapas'),
    el('button',{onclick:()=>{ state._gradePopup='link'; render(); }}, '🔗 Compartilhar'),
    el('button',{onclick:()=>{
      state._gradeTelaCheia = true;
      render();
      if(document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(()=>{});
    }}, '⛶ Tela Cheia')
  ));

  // ---- Popups ----
  if(state._gradePopup==='acoes'){
    const conteudo = el('div',{style:'padding:0 14px 10px;'});
    const grid = el('div',{class:'option-grid'});
    MODOS_GRADE.forEach(([id,label])=>{
      grid.appendChild(el('button',{class:'option-card'+(state._gradeModo===id?' selected':''), onclick:()=>{
        state._gradeModo=id; state._gradeMedirPontos=null; state._gradePopup=null; render();
      }}, el('div',{class:'opt-nome'}, label)));
    });
    conteudo.appendChild(grid);
    wrap.appendChild(renderGradePopup('Escolha uma ação', conteudo, ()=>{ state._gradePopup=null; render(); }));
  }
  if(state._gradePopup==='terreno'){
    const conteudo = el('div',{style:'padding:0 14px 10px;'});
    const grid = el('div',{class:'option-grid'});
    grid.appendChild(el('button',{class:'option-card'+(!grade.terrenoFundo?' selected':''), onclick:()=>{ grade.terrenoFundo=null; state._gradePopup=null; render(); }}, el('div',{class:'opt-nome'}, '🚫 Nenhum')));
    TERRENOS_FUNDO.forEach(t=>{
      grid.appendChild(el('button',{class:'option-card'+(grade.terrenoFundo===t.id?' selected':''), onclick:()=>{ grade.terrenoFundo=t.id; state._gradePopup=null; render(); }}, el('div',{class:'opt-nome'}, t.nome)));
    });
    conteudo.appendChild(grid);

    // Mapa próprio: mesma ideia dos terrenos prontos, mas com um mapa de verdade (desenhado à
    // mão, comprado, gerado por IA). Precisa ser um LINK de imagem (não dá pra guardar a imagem
    // em si, porque a grade sincroniza a cada jogada — um arquivo grande estouraria a planilha).
    conteudo.appendChild(el('h2',{style:'margin-top:14px;'}, '🗺️ Mapa Próprio'));
    conteudo.appendChild(el('div',{class:'tip', style:'font-size:0.75rem;'}, 'Cola o link de uma imagem sua (hospedada no Google Drive, Imgur etc., compartilhada como "qualquer pessoa com o link"). Depois ajusta o encaixe da grade em cima dela com os controles abaixo.'));
    if(!state._gradeMapaUrlTemp) state._gradeMapaUrlTemp = (grade.mapaCustomizado && grade.mapaCustomizado.url) || '';
    conteudo.appendChild(el('div',{class:'row', style:'margin-top:6px;'},
      el('input',{type:'text', placeholder:'https://...', value:state._gradeMapaUrlTemp, oninput:(e)=>{ state._gradeMapaUrlTemp=e.target.value; }}),
      el('button',{class:'btn ghost', style:'width:auto;flex:none;', onclick:()=>{
        const url = state._gradeMapaUrlTemp.trim();
        if(!url){ grade.mapaCustomizado = null; sincronizarGradeCompartilhada(); render(); return; }
        grade.mapaCustomizado = { url, offsetX:0, offsetY:0, escalaPx: state._gradeZoom||30 };
        grade.terrenoFundo = null; // mapa próprio e terreno pronto não fazem sentido juntos
        sincronizarGradeCompartilhada();
        render();
      }}, 'Usar')
    ));
    if(grade.mapaCustomizado && grade.mapaCustomizado.url){
      const mc = grade.mapaCustomizado;
      conteudo.appendChild(el('div',{class:'meta', style:'margin-top:10px;'}, 'Ajuste fino (encaixar a grade nas linhas do seu mapa):'));
      conteudo.appendChild(el('div',{class:'row', style:'align-items:center;margin-top:4px;'},
        el('div',{class:'meta', style:'flex:none;width:70px;'}, 'Tamanho'),
        el('button',{class:'btn ghost', style:'width:auto;padding:4px 10px;', onclick:()=>{ mc.escalaPx=Math.max(10,mc.escalaPx-2); sincronizarGradeCompartilhada(); render(); }}, '➖'),
        el('div',{style:'flex:none;font-weight:700;'}, mc.escalaPx+'px'),
        el('button',{class:'btn ghost', style:'width:auto;padding:4px 10px;', onclick:()=>{ mc.escalaPx=mc.escalaPx+2; sincronizarGradeCompartilhada(); render(); }}, '➕')
      ));
      conteudo.appendChild(el('div',{class:'row', style:'align-items:center;margin-top:4px;'},
        el('div',{class:'meta', style:'flex:none;width:70px;'}, 'Direita/Esq.'),
        el('button',{class:'btn ghost', style:'width:auto;padding:4px 10px;', onclick:()=>{ mc.offsetX-=5; sincronizarGradeCompartilhada(); render(); }}, '⬅️'),
        el('button',{class:'btn ghost', style:'width:auto;padding:4px 10px;', onclick:()=>{ mc.offsetX+=5; sincronizarGradeCompartilhada(); render(); }}, '➡️')
      ));
      conteudo.appendChild(el('div',{class:'row', style:'align-items:center;margin-top:4px;'},
        el('div',{class:'meta', style:'flex:none;width:70px;'}, 'Cima/Baixo'),
        el('button',{class:'btn ghost', style:'width:auto;padding:4px 10px;', onclick:()=>{ mc.offsetY-=5; sincronizarGradeCompartilhada(); render(); }}, '⬆️'),
        el('button',{class:'btn ghost', style:'width:auto;padding:4px 10px;', onclick:()=>{ mc.offsetY+=5; sincronizarGradeCompartilhada(); render(); }}, '⬇️')
      ));
      conteudo.appendChild(el('button',{class:'btn ghost', style:'margin-top:8px;', onclick:()=>{
        grade.mapaCustomizado = null; state._gradeMapaUrlTemp=''; sincronizarGradeCompartilhada(); render();
      }}, 'Remover Mapa Próprio 🗑️'));
    }
    wrap.appendChild(renderGradePopup('Terreno de Fundo', conteudo, ()=>{ state._gradePopup=null; render(); }));
  }
  if(state._gradePopup==='mapas'){
    const conteudo = el('div',{style:'padding:0 14px 10px;'});
    if(!state._gradeMapaNomeNovo) state._gradeMapaNomeNovo = '';
    conteudo.appendChild(el('div',{class:'row'},
      el('input',{type:'text', placeholder:'nome desse layout...', value:state._gradeMapaNomeNovo, oninput:(e)=>{state._gradeMapaNomeNovo=e.target.value;}}),
      el('button',{class:'btn ghost', style:'width:auto;flex:none;', onclick:()=>{
        const nome = state._gradeMapaNomeNovo.trim();
        if(!nome){ flashMsg('Dá um nome pro mapa antes de salvar.'); return; }
        const lista = carregarMapasGradeSalvos();
        lista.push({nome, blocos: grade.blocos});
        salvarMapasGradeSalvos(lista);
        state._gradeMapaNomeNovo = '';
        flashMsg('💾 Mapa "'+nome+'" salvo!');
        render();
      }}, 'Salvar layout atual')
    ));
    const mapasSalvos = carregarMapasGradeSalvos();
    if(mapasSalvos.length>0){
      mapasSalvos.forEach((mapa,idx)=>{
        conteudo.appendChild(el('div',{class:'row', style:'align-items:center;margin-top:6px;'},
          el('div',{style:'flex:1;'}, mapa.nome),
          el('button',{class:'btn ghost', style:'width:auto;', onclick:()=>{
            if(!confirm('Carregar "'+mapa.nome+'"? Isso substitui os blocos do tabuleiro atual (os tokens continuam onde estão).')) return;
            grade.blocos = JSON.parse(JSON.stringify(mapa.blocos));
            flashMsg('📂 Mapa "'+mapa.nome+'" carregado!');
            state._gradePopup=null; render();
          }}, 'Carregar'),
          el('button',{class:'remove-x', onclick:()=>{
            if(!confirm('Apagar o layout "'+mapa.nome+'" salvo?')) return;
            salvarMapasGradeSalvos(carregarMapasGradeSalvos().filter((_,i)=>i!==idx));
            render();
          }}, '✕')
        ));
      });
    } else {
      conteudo.appendChild(el('div',{class:'meta', style:'margin-top:6px;'}, 'Nenhum layout salvo ainda.'));
    }
    wrap.appendChild(renderGradePopup('Mapas Salvos', conteudo, ()=>{ state._gradePopup=null; render(); }));
  }
  if(state._gradePopup==='link'){
    const conteudo = el('div',{style:'padding:0 14px 10px;'});
    conteudo.appendChild(el('div',{class:'tip', style:'font-size:0.78rem;'}, 'Gera um link que abre o tabuleiro num tablet/celular de qualquer jogador — sem precisar logar em nada. Eles também podem mover os próprios tokens por lá. Atualiza sozinho a cada poucos segundos.'));
    conteudo.appendChild(el('button',{class:'btn', style:'margin-top:8px;', onclick: async ()=>{
      await salvarDadosMestreNoServidor();
      const codigo = obterCodigoJogador();
      const url = window.location.origin + window.location.pathname + '?vergrade=' + encodeURIComponent(codigo||'');
      state._gradeLinkGerado = url;
      render();
    }}, '🔗 Gerar Link'));
    if(state._gradeLinkGerado){
      conteudo.appendChild(el('div',{class:'row', style:'margin-top:8px;align-items:center;'},
        el('input',{type:'text', readonly:'readonly', value:state._gradeLinkGerado, onclick:(e)=>e.target.select()}),
        el('button',{class:'btn ghost', style:'width:auto;flex:none;', onclick:()=>{
          try{ navigator.clipboard.writeText(state._gradeLinkGerado); flashMsg('📋 Link copiado!'); }
          catch(e){ flashMsg('Não consegui copiar sozinho — selecione e copie manual.'); }
        }}, 'Copiar')
      ));
    }
    wrap.appendChild(renderGradePopup('Compartilhar com a Mesa', conteudo, ()=>{ state._gradePopup=null; render(); }));
  }

  // ---- Controles específicos do modo atual (ficam visíveis, não em popup, porque são usados
  // enquanto você trabalha no tabuleiro) ----
  if(state._gradeModo==='blocos'){
    if(!state._gradeBlocoSelecionado) state._gradeBlocoSelecionado = 'parede_grossa';
    const paleta = el('div',{class:'option-grid'});
    Object.keys(BLOCO_TIPOS).forEach(id=>{
      const info = BLOCO_TIPOS[id];
      paleta.appendChild(el('button',{class:'option-card'+(state._gradeBlocoSelecionado===id?' selected':''), onclick:()=>{ state._gradeBlocoSelecionado=id; render(); }},
        el('div',{class:'opt-nome'}, info.emoji+' '+info.label),
        el('div',{class:'opt-sub'}, info.desc)
      ));
    });
    wrap.appendChild(paleta);
  }

  if(state._gradeModo==='marcador'){
    if(!state._gradeCorMarcador) state._gradeCorMarcador = CORES_MARCADOR[0].cor;
    wrap.appendChild(el('div',{class:'tip', style:'font-size:0.78rem;'}, 'Pinta um aviso visual — não bloqueia nada, é só pra sinalizar (área de gás, fogo, zona de efeito...). Arraste pra pintar vários quadrados de uma vez.'));
    const paleta = el('div',{class:'option-grid'});
    CORES_MARCADOR.forEach(cm=>{
      paleta.appendChild(el('button',{class:'option-card'+(state._gradeCorMarcador===cm.cor?' selected':''), onclick:()=>{ state._gradeCorMarcador=cm.cor; render(); }},
        el('div',{class:'opt-nome'}, cm.label)
      ));
    });
    wrap.appendChild(paleta);
  }

  if(state._gradeModo==='mover' || state._gradeModo==='alcance' || state._gradeModo==='area'){
    if(!state._gradeSelecionado || !combate.combatentes.some(c=>c.id===state._gradeSelecionado)){
      state._gradeSelecionado = combate.combatentes[0].id;
    }
    const chipsRow = el('div',{'data-preservar-scroll':'grade-chips-combatentes', style:'display:flex;gap:6px;overflow-x:auto;padding:4px 2px 10px;'});
    combate.combatentes.forEach(c=>{
      const noTabuleiro = !!grade.posicoes[c.id];
      const foto = fotoDoCombatente(c);
      chipsRow.appendChild(el('button',{class:'iniciativa-chip'+(state._gradeSelecionado===c.id?' atual':''), style:'flex-shrink:0;'+(noTabuleiro?'':'opacity:0.55;'), onclick:()=>{ state._gradeSelecionado=c.id; render(); }},
        foto ? el('img',{src:foto, style:'width:22px;height:22px;border-radius:50%;object-fit:cover;'}) : el('div',{class:'iniciativa-chip-icone'}, c.tipo==='pj'?'🧝':c.tipo==='monstro'?'👹':'❔'),
        el('div',{class:'iniciativa-chip-nome'}, c.nome),
        !noTabuleiro ? el('div',{class:'meta', style:'font-size:0.6rem;'},'fora') : null
      ));
    });
    wrap.appendChild(chipsRow);
    if(state._gradeModo==='mover'){
      wrap.appendChild(el('div',{class:'meta', style:'margin-bottom:6px;'}, 'Toque num quadrado pra colocar o "'+combate.combatentes.find(c=>c.id===state._gradeSelecionado).nome+'" lá (toque num token pra selecionar ele), ou arraste o token direto no tabuleiro.'));
      // Anel de cor customizável — pra marcar "esses são de um grupo" sem mudar o tipo do
      // combatente (PJ/monstro/NPC continuam com a cor de fundo de sempre).
      wrap.appendChild(el('div',{style:'display:flex;align-items:center;gap:6px;margin-bottom:8px;flex-wrap:wrap;'},
        el('div',{class:'meta', style:'flex:none;'}, 'Anel deste:'),
        el('button',{class:'btn ghost', style:'width:auto;padding:3px 8px;font-size:0.7rem;', onclick:()=>{ delete grade.corAneis[state._gradeSelecionado]; sincronizarGradeCompartilhada(); render(); }}, '🚫 Nenhum'),
        ...CORES_MARCADOR.map(cm=> el('button',{
          style:'width:22px;height:22px;border-radius:50%;padding:0;border:'+(grade.corAneis[state._gradeSelecionado]===cm.cor?'2px solid #fff':'2px solid transparent')+';background:'+cm.cor.replace('0.45','0.9')+';',
          onclick:()=>{ grade.corAneis[state._gradeSelecionado]=cm.cor.replace('0.45','0.9'); sincronizarGradeCompartilhada(); render(); }
        }))
      ));
      wrap.appendChild(el('button',{class:'btn ghost', style:'width:auto;padding:4px 10px;font-size:0.75rem;margin-bottom:8px;', onclick:()=>{ grade.snapLivre=!grade.snapLivre; sincronizarGradeCompartilhada(); render(); }},
        grade.snapLivre ? '🔓 Snap Livre (toque em qualquer ponto do quadrado)' : '🔒 Preso à Grade'
      ));
      // Rotação/direção — pra onde o token está de frente. Gira só uma setinha ao redor dele
      // (girar a foto/círculo em si ficaria estranho).
      wrap.appendChild(el('div',{style:'display:flex;align-items:center;gap:6px;margin-bottom:8px;'},
        el('div',{class:'meta', style:'flex:none;'}, 'Direção:'),
        el('button',{class:'btn ghost', style:'width:auto;padding:3px 10px;', onclick:()=>{ grade.rotacoes[state._gradeSelecionado] = ((grade.rotacoes[state._gradeSelecionado]||0)-45+360)%360; sincronizarGradeCompartilhada(); render(); }}, '↺'),
        el('button',{class:'btn ghost', style:'width:auto;padding:3px 10px;', onclick:()=>{ grade.rotacoes[state._gradeSelecionado] = ((grade.rotacoes[state._gradeSelecionado]||0)+45)%360; sincronizarGradeCompartilhada(); render(); }}, '↻'),
        grade.rotacoes[state._gradeSelecionado] ? el('button',{class:'btn ghost', style:'width:auto;padding:3px 8px;font-size:0.7rem;', onclick:()=>{ delete grade.rotacoes[state._gradeSelecionado]; sincronizarGradeCompartilhada(); render(); }}, 'Zerar') : null
      ));
      // Multi-seleção — pra mover um grupo de tokens de uma vez (tipo 3 goblins juntos), mantendo
      // a formação entre eles (todos se deslocam pela mesma quantidade de quadrados).
      if(!state._gradeMultiSelecao) state._gradeMultiSelecao = [];
      wrap.appendChild(el('div',{style:'display:flex;align-items:center;gap:6px;margin-bottom:8px;flex-wrap:wrap;'},
        el('button',{class:'btn ghost'+(state._gradeMultiModoAtivo?'':''), style:'width:auto;padding:4px 10px;font-size:0.75rem;'+(state._gradeMultiModoAtivo?'border-color:var(--gold);':''), onclick:()=>{
          state._gradeMultiModoAtivo = !state._gradeMultiModoAtivo;
          if(!state._gradeMultiModoAtivo) state._gradeMultiSelecao = [];
          render();
        }}, state._gradeMultiModoAtivo ? '☑️ Selecionando Vários ('+state._gradeMultiSelecao.length+')' : '🔲 Selecionar Vários'),
        state._gradeMultiModoAtivo && state._gradeMultiSelecao.length>0 ? el('button',{class:'btn ghost', style:'width:auto;padding:4px 10px;font-size:0.75rem;', onclick:()=>{ state._gradeMultiSelecao=[]; render(); }}, 'Limpar seleção') : null
      ));
      if(state._gradeMultiModoAtivo) wrap.appendChild(el('div',{class:'meta', style:'margin-bottom:8px;'}, state._gradeMultiSelecao.length<2 ? 'Toque nos tokens que quer mover junto.' : 'Toque num quadrado — o grupo inteiro se move mantendo a formação entre eles.'));
    }
  }

  if(state._gradeModo==='alcance'){
    if(!state._gradeAlcance) state._gradeAlcance = 'curto';
    const alcanceRow = el('div',{class:'row', style:'margin-bottom:10px;'});
    [['curto','Curto (9m)'],['medio','Médio (30m)'],['longo','Longo (90m)']].forEach(([id,label])=>{
      alcanceRow.appendChild(el('button',{class:'btn'+(state._gradeAlcance===id?'':' ghost'), onclick:()=>{ state._gradeAlcance=id; render(); }}, label));
    });
    wrap.appendChild(alcanceRow);
  }

  if(state._gradeModo==='area'){
    if(!state._gradeAreaForma) state._gradeAreaForma = 'circulo';
    if(!state._gradeAreaTamanho) state._gradeAreaTamanho = 4;
    wrap.appendChild(el('div',{class:'row', style:'margin-bottom:6px;'},
      ...[['circulo','⭕ Círculo/Esfera'],['cone','🔺 Cone'],['linha','➖ Linha']].map(([id,label])=>
        el('button',{class:'btn'+(state._gradeAreaForma===id?'':' ghost'), onclick:()=>{ state._gradeAreaForma=id; render(); }}, label)
      )
    ));
    wrap.appendChild(el('div',{class:'row', style:'align-items:center;gap:8px;margin-bottom:10px;'},
      el('div',{class:'meta', style:'flex:none;'}, 'Tamanho:'),
      el('button',{class:'btn ghost', style:'width:auto;padding:4px 10px;', onclick:()=>{ state._gradeAreaTamanho=Math.max(1,state._gradeAreaTamanho-1); render(); }}, '➖'),
      el('div',{style:'flex:none;font-weight:700;'}, state._gradeAreaTamanho+'q ('+(state._gradeAreaTamanho*1.5)+'m)'),
      el('button',{class:'btn ghost', style:'width:auto;padding:4px 10px;', onclick:()=>{ state._gradeAreaTamanho=Math.min(20,state._gradeAreaTamanho+1); render(); }}, '➕')
    ));
    wrap.appendChild(el('div',{class:'meta', style:'margin-bottom:6px;'}, state._gradeAreaForma==='circulo' ? 'Toque num quadrado pra centralizar a área ali.' : 'Toque num quadrado pra apontar a direção, saindo de "'+combate.combatentes.find(c=>c.id===state._gradeSelecionado).nome+'".'));
  }

  if(state._gradeModo==='medir'){
    wrap.appendChild(el('div',{class:'tip', style:'margin-bottom:6px;'}, 'Toque em 2 quadrados quaisquer pra medir a distância entre eles.'));
    if(state._gradeMedirPontos && state._gradeMedirPontos.length===2){
      const [p1,p2] = state._gradeMedirPontos;
      const dist = Math.max(Math.abs(p1.x-p2.x), Math.abs(p1.y-p2.y));
      wrap.appendChild(el('div',{class:'tip', style:'border:1px solid var(--gold);'}, el('b',{},'Distância: '), dist+' quadrados ('+(dist*1.5)+'m)'));
    }
  }

  if(state._gradeModo==='fog'){
    wrap.appendChild(el('div',{class:'tip', style:'font-size:0.78rem;'}, grade.fogAtivo ? 'Névoa ligada — revela sozinha conforme os PJs andam pelo tabuleiro (linha de visão real, considerando parede/árvore/rocha). Também dá pra pintar manualmente tocando nos quadrados abaixo.' : 'Névoa desligada — os jogadores no link veem o tabuleiro inteiro.'));
    wrap.appendChild(el('div',{class:'row', style:'margin-top:8px;margin-bottom:6px;'},
      el('button',{class:'btn'+(grade.fogAtivo?'':' ghost'), onclick:()=>{
        grade.fogAtivo = !grade.fogAtivo;
        if(grade.fogAtivo) revelarPorVisaoDosPjs(combate, grade, true);
        sincronizarGradeCompartilhada(); render();
      }}, grade.fogAtivo ? '🌫️ Névoa Ligada' : '☀️ Névoa Desligada'),
      grade.fogAtivo ? el('button',{class:'btn ghost', onclick:()=>{
        if(!confirm('Esconder TUDO de novo (voltar a névoa inteira)? Os jogadores vão perder o que já tinham visto.')) return;
        grade.fogRevelado = {}; sincronizarGradeCompartilhada(); render();
      }}, '🌑 Esconder Tudo') : null
    ));
  }

  // ---- O tabuleiro em si ----
  const origemAlcance = (state._gradeModo==='alcance') ? grade.posicoes[state._gradeSelecionado] : null;
  const raioAlcance = origemAlcance ? ALCANCES_QUADROS[state._gradeAlcance] : 0;
  const origemArea = (state._gradeModo==='area' && state._gradeAreaForma!=='circulo') ? grade.posicoes[state._gradeSelecionado] : null;
  const tam = state._gradeZoom;

  function tentarMoverPara(combatenteId, xClicado, yClicado){
    const alvo = combate.combatentes.find(cc=>cc.id===combatenteId);
    if(!alvo){ flashMsg('Esse combatente não está mais na lista — selecione outro.'); state._gradeSelecionado = combate.combatentes[0] ? combate.combatentes[0].id : null; return false; }
    const tamToken = tamanhoTokenCombatente(alvo);
    // Criatura Grande+ (2x2, 3x3...) centraliza no quadrado tocado, em vez de "nascer" com o
    // canto superior esquerdo ali — fica bem mais natural de posicionar.
    const deslocamento = Math.floor((tamToken-1)/2);
    const x = Math.max(0, Math.min(grade.largura-tamToken, xClicado-deslocamento));
    const y = Math.max(0, Math.min(grade.altura-tamToken, yClicado-deslocamento));
    if(x+tamToken>grade.largura || y+tamToken>grade.altura){ flashMsg('Não cabe aqui — o token dele ocupa '+tamToken+'×'+tamToken+' quadrados.'); return false; }
    const celulasAlvo = celulasOcupadasPorToken(x,y,tamToken);
    for(const chaveCel of celulasAlvo){
      const bloco = grade.blocos[chaveCel];
      if(bloco && BLOCO_TIPOS[bloco.tipo].bloqueiaMovimento){ flashMsg('Esse quadrado tem '+BLOCO_TIPOS[bloco.tipo].label.toLowerCase()+' — não dá pra entrar ali.'); return false; }
    }
    const ocupante = Object.keys(grade.posicoes).find(id=>{
      if(id===combatenteId) return false;
      const outro = combate.combatentes.find(cc=>cc.id===id);
      if(!outro) return false;
      const celulasOutro = celulasOcupadasPorToken(grade.posicoes[id].x, grade.posicoes[id].y, tamanhoTokenCombatente(outro));
      return celulasOutro.some(c=>celulasAlvo.includes(c));
    });
    if(ocupante){ flashMsg('Já tem alguém nesse quadrado.'); return false; }
    grade.posicoes[combatenteId] = {x,y};
    // névoa revela sozinha ao andar, sem precisar de botão — só quando é PJ que se moveu
    if(grade.fogAtivo && alvo && alvo.tipo==='pj') revelarPorVisaoDosPjs(combate, grade, true);
    sincronizarGradeCompartilhada();
    return true;
  }

  // Faixa de iniciativa em cima do tabuleiro — os mesmos retratos/ordem da aba Combate, sem
  // precisar trocar de aba pra saber de quem é a vez. Tocar num retrato pula pra vez dele
  // (igual já funciona na aba Combate).
  const faixaIniciativa = el('div',{'data-preservar-scroll':'grade-iniciativa', style:'display:flex;gap:5px;overflow-x:auto;padding:4px 2px 8px;'});
  combate.combatentes.forEach((c,idx)=>{
    const foto = fotoDoCombatente(c);
    const noTurno = idx===combate.turnoIdx;
    faixaIniciativa.appendChild(el('button',{
      style:'flex-shrink:0;width:34px;height:34px;border-radius:50%;padding:0;border:'+(noTurno?'2px solid var(--gold)':'2px solid transparent')+';background:'+corTokenPorTipo(c.tipo)+';overflow:hidden;box-shadow:'+(noTurno?'0 0 8px var(--gold)':'none')+';',
      title:c.nome,
      onclick:()=>{ combate.turnoIdx=idx; render(); }
    }, foto ? el('img',{src:foto, style:'width:100%;height:100%;object-fit:cover;'}) : el('div',{style:'width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:0.62rem;font-weight:800;color:#1a0f0a;'}, c.nome.slice(0,2).toUpperCase())));
  });
  wrap.appendChild(faixaIniciativa);

  // Régua ao vivo — enquanto arrasta um token, mostra a distância do ponto de partida até onde
  // o dedo/mouse está agora. Atualiza direto no elemento (sem re-renderizar tudo, senão ficaria
  // engasgado arrastando).
  const indicadorDistancia = el('div',{id:'grade-distancia-arraste', style:'display:none;text-align:center;font-weight:800;color:var(--gold);margin-bottom:4px;font-size:0.85rem;'});
  wrap.appendChild(indicadorDistancia);

  const scrollWrap = el('div',{id:'grade-scroll-wrap', 'data-preservar-scroll':'grade-tabuleiro', style:'max-width:100%; max-height:60vh; overflow:auto; -webkit-overflow-scrolling:touch; border:2px solid var(--line); border-radius:6px; cursor:grab;'});
  const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const mapaCustom = grade.mapaCustomizado;
  const temMapaCustom = mapaCustom && mapaCustom.url;
  const temTerrenoImagem = !temMapaCustom && terrenoAtual && terrenoAtual.url;
  const terrenoRepete = temTerrenoImagem && terrenoAtual.tileable!==false;
  const terrenoCena = temTerrenoImagem && terrenoAtual.tileable===false;
  const larguraPx = grade.largura*tam, alturaPx = grade.altura*tam;
  const tabuleiro = el('div',{style:'display:grid; grid-template-columns:'+Math.round(tam*0.7)+'px repeat('+grade.largura+', '+tam+'px); gap:0; background:var(--line); width:max-content;'
    +(temMapaCustom ? ' background-image:url('+mapaCustom.url+'); background-size:'+mapaCustom.escalaPx+'px '+mapaCustom.escalaPx+'px; background-position:'+mapaCustom.offsetX+'px '+mapaCustom.offsetY+'px; background-repeat:repeat;'
      : terrenoRepete ? ' background-image:url('+terrenoAtual.url+'); background-size:'+tam+'px '+tam+'px; background-repeat:repeat;' : '')});
  // "cena completa" (tipo a taverna) não repete — estica UMA vez cobrindo só a área jogável,
  // deslocada pra não cobrir a coluna/linha de letras e números do canto.
  const areaJogavel = terrenoCena ? el('div',{style:'position:absolute; left:'+Math.round(tam*0.7)+'px; top:'+Math.round(tam*0.6)+'px; width:'+larguraPx+'px; height:'+alturaPx+'px; background-image:url('+terrenoAtual.url+'); background-size:cover; background-position:center; pointer-events:none;'}) : null;

  // canto vazio + letras das colunas
  tabuleiro.appendChild(el('div',{style:'width:'+Math.round(tam*0.7)+'px;height:'+Math.round(tam*0.6)+'px;'}));
  for(let x=0;x<grade.largura;x++){
    tabuleiro.appendChild(el('div',{style:'width:'+tam+'px;height:'+Math.round(tam*0.6)+'px;display:flex;align-items:center;justify-content:center;font-size:'+Math.round(tam*0.32)+'px;color:var(--ink-soft);'}, letras[x]||''));
  }

  // Arrastar o mapa com o mouse (no touch já rola nativo com o dedo).
  let panEstado = null;
  scrollWrap.addEventListener('mousedown',(e)=>{
    if(e.target.closest('.grade-token')) return;
    panEstado = {startX:e.clientX, startY:e.clientY, scrollLeft:scrollWrap.scrollLeft, scrollTop:scrollWrap.scrollTop, moveu:false};
    scrollWrap.style.cursor = 'grabbing';
  });
  window.addEventListener('mousemove',(e)=>{
    if(!panEstado) return;
    const dx = e.clientX - panEstado.startX, dy = e.clientY - panEstado.startY;
    if(Math.abs(dx)>4 || Math.abs(dy)>4) panEstado.moveu = true;
    if(panEstado.moveu){
      scrollWrap.scrollLeft = panEstado.scrollLeft - dx;
      scrollWrap.scrollTop = panEstado.scrollTop - dy;
    }
  });
  window.addEventListener('mouseup',()=>{
    if(panEstado){
      scrollWrap.style.cursor = 'grab';
      if(panEstado.moveu) state._gradeSuprimirProximoClique = true;
    }
    panEstado = null;
  });

  // Pinça de 2 dedos pra dar zoom no tablet/celular, mantendo o ponto entre os dedos fixo na
  // tela (não sai "pulando" o mapa quando belisca).
  let pinca = null, pincaRaf = null;
  scrollWrap.addEventListener('touchstart',(e)=>{
    if(e.touches.length===2){
      const [t1,t2] = e.touches;
      pinca = {
        distIni: Math.hypot(t2.clientX-t1.clientX, t2.clientY-t1.clientY),
        zoomIni: state._gradeZoom,
        midX: (t1.clientX+t2.clientX)/2, midY: (t1.clientY+t2.clientY)/2,
      };
    }
  }, {passive:true});
  scrollWrap.addEventListener('touchmove',(e)=>{
    if(!pinca || e.touches.length!==2) return;
    e.preventDefault();
    const [t1,t2] = e.touches;
    const distAtual = Math.hypot(t2.clientX-t1.clientX, t2.clientY-t1.clientY);
    const novoZoom = Math.max(18, Math.min(48, Math.round(pinca.zoomIni * (distAtual/pinca.distIni))));
    if(novoZoom===state._gradeZoom) return;
    if(pincaRaf) return; // já tem um render agendado, não empilha
    pincaRaf = requestAnimationFrame(()=>{
      pincaRaf = null;
      const swRect = scrollWrap.getBoundingClientRect();
      const fracaoX = (scrollWrap.scrollLeft + (pinca.midX-swRect.left)) / scrollWrap.scrollWidth;
      const fracaoY = (scrollWrap.scrollTop + (pinca.midY-swRect.top)) / scrollWrap.scrollHeight;
      state._gradeZoom = novoZoom;
      render();
      setTimeout(()=>{
        const sw2 = document.getElementById('grade-scroll-wrap');
        if(!sw2) return;
        sw2.scrollLeft = fracaoX*sw2.scrollWidth - (pinca.midX-swRect.left);
        sw2.scrollTop = fracaoY*sw2.scrollHeight - (pinca.midY-swRect.top);
      }, 0);
    });
  }, {passive:false});
  scrollWrap.addEventListener('touchend',()=>{ pinca = null; });

  const anchorPorCelula = {};
  Object.keys(grade.posicoes).forEach(id=>{
    const c = combate.combatentes.find(cc=>cc.id===id);
    if(!c) return;
    const {x,y} = grade.posicoes[id];
    celulasOcupadasPorToken(x,y,tamanhoTokenCombatente(c)).forEach(chave=>{ anchorPorCelula[chave] = id; });
  });

  const areaDestacada = (state._gradeModo==='area' && state._gradeAreaHover)
    ? calcularCelulasArea(
        state._gradeAreaForma,
        state._gradeAreaForma==='circulo' ? state._gradeAreaHover.x : (origemArea?origemArea.x:state._gradeAreaHover.x),
        state._gradeAreaForma==='circulo' ? state._gradeAreaHover.y : (origemArea?origemArea.y:state._gradeAreaHover.y),
        state._gradeAreaHover.x, state._gradeAreaHover.y, state._gradeAreaTamanho)
    : new Set();

  // Tudo que uma célula faz quando "ativada" — clique único, ou passando por cima dela
  // arrastando (nos modos que fazem sentido pintar em sequência: blocos, quebrar, marcador,
  // névoa). Recalcula tudo na hora pra funcionar tanto num clique quanto durante o arraste.
  function aplicarAcaoNaCelula(x,y,evento){
    const chave = x+','+y;
    const bloco = grade.blocos[chave];
    const anchorId = anchorPorCelula[chave];
    if(state._gradeModo==='mover' && state._gradeMultiModoAtivo){
      if(anchorId){
        // toca num token: entra ou sai da seleção do grupo
        const idx = state._gradeMultiSelecao.indexOf(anchorId);
        if(idx>=0) state._gradeMultiSelecao.splice(idx,1);
        else state._gradeMultiSelecao.push(anchorId);
        render();
        return;
      }
      if(state._gradeMultiSelecao.length<2){ flashMsg('Selecione pelo menos 2 tokens antes de tocar num quadrado vazio.'); return; }
      // move o grupo inteiro pela mesma quantidade de quadrados, mantendo a formação — usa o
      // primeiro token selecionado como referência pra calcular o deslocamento.
      const referenciaId = state._gradeMultiSelecao[0];
      const posRef = grade.posicoes[referenciaId];
      if(!posRef){ flashMsg('O token de referência não está no tabuleiro.'); return; }
      const dx = x-posRef.x, dy = y-posRef.y;
      salvarEstadoParaDesfazer();
      state._gradeMultiSelecao.forEach(id=>{
        const pos = grade.posicoes[id];
        if(!pos) return;
        capturarParaAnimacaoMovimento(id);
        tentarMoverPara(id, pos.x+dx, pos.y+dy);
      });
      render();
      return;
    }
    if(state._gradeModo==='mover'){
      if(anchorId){ state._gradeSelecionado = anchorId; render(); return; }
      salvarEstadoParaDesfazer();
      capturarParaAnimacaoMovimento(state._gradeSelecionado);
      tentarMoverPara(state._gradeSelecionado, x, y);
      // Snap Livre: guarda um empurrãozinho visual dentro do quadrado, baseado em onde
      // exatamente você tocou — a posição "de verdade" (pra colisão/névoa/distância) continua
      // sendo o quadrado inteiro, só a aparência do token que fica menos "grudada na grade".
      if(grade.snapLivre && evento && typeof evento.offsetX==='number'){
        grade.nudges[state._gradeSelecionado] = { x:(evento.offsetX/tam-0.5)*0.7, y:(evento.offsetY/tam-0.5)*0.7 };
      } else if(grade.nudges[state._gradeSelecionado]){
        delete grade.nudges[state._gradeSelecionado];
      }
    } else if(state._gradeModo==='blocos'){
      if(anchorId){ flashMsg('Tem um combatente aqui — mude ele de lugar antes de colocar bloco.'); return; }
      salvarEstadoParaDesfazer();
      grade.blocos[chave] = {tipo: state._gradeBlocoSelecionado};
      sincronizarGradeCompartilhada();
    } else if(state._gradeModo==='quebrar'){
      if(bloco && BLOCO_TIPOS[bloco.tipo].quebravel){ salvarEstadoParaDesfazer(); delete grade.blocos[chave]; sincronizarGradeCompartilhada(); }
      else if(bloco) flashMsg(BLOCO_TIPOS[bloco.tipo].label+' não quebra — use o modo Apagar se quiser remover mesmo assim.');
    } else if(state._gradeModo==='marcador'){
      salvarEstadoParaDesfazer();
      if(grade.marcadores[chave]===state._gradeCorMarcador) delete grade.marcadores[chave];
      else grade.marcadores[chave] = state._gradeCorMarcador;
      sincronizarGradeCompartilhada();
    } else if(state._gradeModo==='apagar'){
      salvarEstadoParaDesfazer();
      if(anchorId){ delete grade.posicoes[anchorId]; sincronizarGradeCompartilhada(); }
      else if(bloco){ delete grade.blocos[chave]; sincronizarGradeCompartilhada(); }
      else if(grade.marcadores[chave]){ delete grade.marcadores[chave]; sincronizarGradeCompartilhada(); }
    } else if(state._gradeModo==='area'){
      state._gradeAreaHover = {x,y};
    } else if(state._gradeModo==='medir'){
      const pontos = state._gradeMedirPontos || [];
      state._gradeMedirPontos = pontos.length>=2 ? [{x,y}] : [...pontos, {x,y}];
    } else if(state._gradeModo==='fog'){
      salvarEstadoParaDesfazer();
      if(grade.fogRevelado[chave]) delete grade.fogRevelado[chave];
      else grade.fogRevelado[chave] = true;
      sincronizarGradeCompartilhada();
    }
    render();
  }
  window.addEventListener('mouseup',()=>{ state._gradeArrastandoPintura = false; });

  for(let y=0;y<grade.altura;y++){
    tabuleiro.appendChild(el('div',{style:'width:'+Math.round(tam*0.7)+'px;height:'+tam+'px;display:flex;align-items:center;justify-content:center;font-size:'+Math.round(tam*0.32)+'px;color:var(--ink-soft);'}, String(y+1)));
    for(let x=0;x<grade.largura;x++){
      const chave = x+','+y;
      const bloco = grade.blocos[chave];
      const anchorId = anchorPorCelula[chave];
      const ehAncora = anchorId && grade.posicoes[anchorId].x===x && grade.posicoes[anchorId].y===y;
      const c = ehAncora ? combate.combatentes.find(cc=>cc.id===anchorId) : null;
      let dentroDoAlcance = false;
      if(origemAlcance){
        const dist = Math.max(Math.abs(x-origemAlcance.x), Math.abs(y-origemAlcance.y));
        dentroDoAlcance = dist>0 && dist<=raioAlcance;
      }
      const dentroDaArea = areaDestacada.has(chave);
      const bgCelula = bloco ? BLOCO_TIPOS[bloco.tipo].cor : dentroDaArea ? 'rgba(224,69,58,0.4)' : dentroDoAlcance ? 'rgba(224,69,58,0.28)' : ((terrenoRepete||terrenoCena||temMapaCustom) ? 'transparent' : 'var(--card)');
      const bordas = bloco ? bordasVisiveisBloco(grade, x, y, bloco.tipo) : {top:true,right:true,bottom:true,left:true};
      const estiloBordas = 'border-top:'+(bordas.top?'1px solid '+COR_GRADE_LINHA:'none')+
        ';border-right:'+(bordas.right?'1px solid '+COR_GRADE_LINHA:'none')+
        ';border-bottom:'+(bordas.bottom?'1px solid '+COR_GRADE_LINHA:'none')+
        ';border-left:'+(bordas.left?'1px solid '+COR_GRADE_LINHA:'none')+';';
      const celula = el('div',{
        'data-gx':x, 'data-gy':y,
        style:'width:'+tam+'px;height:'+tam+'px;background:'+bgCelula+';display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative;'+estiloBordas,
        onmouseenter: (state._gradeModo==='area') ? (()=>{ state._gradeAreaHover={x,y}; render(); }) : null,
        onmousedown:(e)=>{
          if(['blocos','quebrar','marcador','fog'].includes(state._gradeModo)){
            e.stopPropagation(); // não deixa o pan do mapa começar junto
            state._gradeArrastandoPintura = true;
            aplicarAcaoNaCelula(x,y);
          }
        },
        onmouseenter2: null,
        onclick:(e)=>{
          if(state._gradeSuprimirProximoClique){ state._gradeSuprimirProximoClique = false; return; }
          if(['blocos','quebrar','marcador','fog'].includes(state._gradeModo)) return; // já foi tratado no mousedown/arrastar
          aplicarAcaoNaCelula(x,y,e);
        }
      });
      celula.addEventListener('mouseenter',()=>{
        if(state._gradeArrastandoPintura) aplicarAcaoNaCelula(x,y);
        if(state._gradeModo==='area'){ state._gradeAreaHover={x,y}; render(); }
      });
      ligarTogueLongoPing(celula, grade, x, y);
      const isolado = bordas.top && bordas.right && bordas.bottom && bordas.left;
      if(bloco && isolado) celula.appendChild(el('div',{style:'font-size:'+Math.round(tam*0.6)+'px;opacity:0.9;'}, BLOCO_TIPOS[bloco.tipo].emoji));
      if(grade.marcadores[chave]){
        celula.appendChild(el('div',{style:'position:absolute;inset:0;background:'+grade.marcadores[chave]+';pointer-events:none;'}));
      }
      if(grade.ping && grade.ping.x===x && grade.ping.y===y && (Date.now()-grade.ping.criadoEm)<2200){
        celula.appendChild(el('div',{style:'position:absolute;inset:-6px;border-radius:50%;border:3px solid var(--gold);pointer-events:none;animation:ping-grade 1.1s ease-out infinite;'}));
      }
      if(state._gradeModo==='medir' && (state._gradeMedirPontos||[]).some(p=>p.x===x&&p.y===y)){
        celula.appendChild(el('div',{style:'position:absolute;inset:0;border:2px solid var(--gold);pointer-events:none;'}));
      }
      if(grade.fogAtivo && !grade.fogRevelado[chave]){
        celula.appendChild(el('div',{style:'position:absolute;inset:0;background:rgba(0,0,0,0.5);pointer-events:none;'}));
      }
      if(c){
        const tamToken = tamanhoTokenCombatente(c);
        const pxToken = tamToken*tam + (tamToken-1)*1;
        const foto = fotoDoCombatente(c);
        const condicao = condicaoIconeCombatente(c);
        const pvPct = pvMaxCombatente(c) ? Math.max(0, Math.min(100, pvAtualCombatente(c)/pvMaxCombatente(c)*100)) : 100;
        const anelCustom = grade.corAneis && grade.corAneis[c.id];
        const noTurnoToken = combate.combatentes.indexOf(c)===combate.turnoIdx;
        const anelEstilo = noTurnoToken ? '0 0 0 3px var(--gold), 0 0 10px var(--gold)' : anelCustom ? '0 0 0 3px '+anelCustom : '0 0 0 2px rgba(0,0,0,0.4)';
        const nudge = grade.nudges && grade.nudges[c.id];
        const nudgePx = nudge ? {x:Math.round(nudge.x*pxToken), y:Math.round(nudge.y*pxToken)} : {x:0,y:0};
        const tokenWrap = el('div',{
          class:'grade-token', draggable:'true', 'data-token-id':c.id,
          // sombra sutil "flutuando" sobre o mapa, em vez de parecer colado nele. O nudge (só
          // quando Snap Livre está ligado) desloca um pouco pra dentro do quadrado, sem mexer
          // no "top:0;left:0" que a animação de movimento usa como referência.
          style:'position:absolute; top:'+nudgePx.y+'px; left:'+nudgePx.x+'px; width:'+pxToken+'px; height:'+pxToken+'px; z-index:5; cursor:grab; filter:drop-shadow(0 3px 3px rgba(0,0,0,0.5));',
          ondragstart:(e)=>{
            e.dataTransfer.setData('text/plain', c.id);
            e.dataTransfer.effectAllowed='move';
            const posOrigem = grade.posicoes[c.id];
            state._gradeOrigemArraste = posOrigem ? {x:posOrigem.x, y:posOrigem.y} : null;
          },
          ondragend:()=>{
            state._gradeOrigemArraste = null;
            const ind = document.getElementById('grade-distancia-arraste');
            if(ind) ind.style.display='none';
          },
        });
        tokenWrap.appendChild(el('div',{style:'width:100%;height:100%;border-radius:50%;background:'+corTokenPorTipo(c.tipo)+';display:flex;align-items:center;justify-content:center;font-weight:800;color:#1a0f0a;overflow:hidden;box-shadow:'+anelEstilo+';font-size:'+Math.round(pxToken*0.34)+'px;'},
          foto ? el('img',{src:foto, style:'width:100%;height:100%;object-fit:cover;border-radius:50%;'}) : c.nome.slice(0,2).toUpperCase()
        ));
        tokenWrap.appendChild(el('div',{style:'position:absolute;bottom:-3px;left:8%;width:84%;height:3px;background:rgba(0,0,0,0.5);border-radius:2px;overflow:hidden;'},
          el('div',{style:'width:'+pvPct+'%;height:100%;background:'+(pvPct>50?'#5ea85e':pvPct>25?'#c9a23a':'#c94a3a')+';'})
        ));
        if(condicao) tokenWrap.appendChild(el('div',{style:'position:absolute;top:-4px;right:-4px;background:var(--red-bright);color:#fff;border-radius:50%;width:14px;height:14px;font-size:9px;display:flex;align-items:center;justify-content:center;font-weight:800;', title:condicao.primeira}, condicao.qtd));
        if(state._gradeMultiModoAtivo && state._gradeMultiSelecao.includes(c.id)){
          tokenWrap.appendChild(el('div',{style:'position:absolute;top:-4px;left:-4px;background:#5ea85e;color:#fff;border-radius:50%;width:16px;height:16px;font-size:11px;display:flex;align-items:center;justify-content:center;font-weight:800;box-shadow:0 0 0 2px rgba(0,0,0,0.4);'}, '✓'));
        }
        const rotacaoToken = grade.rotacoes && grade.rotacoes[c.id];
        if(rotacaoToken){
          tokenWrap.appendChild(el('div',{style:'position:absolute; top:50%; left:50%; width:0; height:0; border-left:5px solid transparent; border-right:5px solid transparent; border-bottom:10px solid var(--gold); transform:translate(-50%,-50%) rotate('+rotacaoToken+'deg) translateY(-'+Math.round(pxToken*0.55)+'px); pointer-events:none;'}));
        }
        tokenWrap.addEventListener('click',(e)=>{
          e.stopPropagation();
          if(state._gradeModo!=='mover') return;
          if(state._gradeMultiModoAtivo){
            const idx = state._gradeMultiSelecao.indexOf(c.id);
            if(idx>=0) state._gradeMultiSelecao.splice(idx,1);
            else state._gradeMultiSelecao.push(c.id);
          } else {
            state._gradeSelecionado = c.id;
          }
          render();
        });
        celula.appendChild(tokenWrap);
      }
      celula.addEventListener('dragover',(e)=>{
        e.preventDefault();
        if(!state._gradeOrigemArraste) return;
        const dist = Math.max(Math.abs(x-state._gradeOrigemArraste.x), Math.abs(y-state._gradeOrigemArraste.y));
        const ind = document.getElementById('grade-distancia-arraste');
        if(ind){ ind.style.display='block'; ind.textContent = '📏 '+dist+' quadrados ('+(dist*1.5)+'m)'; }
      });
      celula.addEventListener('drop',(e)=>{
        e.preventDefault();
        const idArrastado = e.dataTransfer.getData('text/plain');
        if(idArrastado){ salvarEstadoParaDesfazer(); capturarParaAnimacaoMovimento(idArrastado); tentarMoverPara(idArrastado, x, y); }
        state._gradeOrigemArraste = null;
        render();
      });
      tabuleiro.appendChild(celula);
    }
  }
  if(terrenoCena){
    const tabuleiroWrap = el('div',{style:'position:relative;'});
    tabuleiroWrap.appendChild(areaJogavel);
    tabuleiroWrap.appendChild(tabuleiro);
    scrollWrap.appendChild(tabuleiroWrap);
  } else {
    scrollWrap.appendChild(tabuleiro);
  }
  wrap.appendChild(scrollWrap);

  // ---- Zoom e tamanho do tabuleiro, embaixo do mapa (não atrapalha enquanto joga) ----
  function ajustarZoomCentralizado(novoZoomBruto){
    const novoZoom = Math.max(18, Math.min(48, novoZoomBruto));
    const sw = document.getElementById('grade-scroll-wrap');
    let fracaoX = 0.5, fracaoY = 0.5;
    if(sw){
      fracaoX = (sw.scrollLeft + sw.clientWidth/2) / sw.scrollWidth;
      fracaoY = (sw.scrollTop + sw.clientHeight/2) / sw.scrollHeight;
    }
    state._gradeZoom = novoZoom;
    render();
    setTimeout(()=>{
      const sw2 = document.getElementById('grade-scroll-wrap');
      if(!sw2) return;
      sw2.scrollLeft = fracaoX*sw2.scrollWidth - sw2.clientWidth/2;
      sw2.scrollTop = fracaoY*sw2.scrollHeight - sw2.clientHeight/2;
    }, 0);
  }
  wrap.appendChild(el('div',{class:'row', style:'align-items:center;gap:8px;margin:10px 0 6px;'},
    el('button',{class:'btn ghost', style:'width:auto;padding:6px 14px;', onclick:()=>{ ajustarZoomCentralizado(state._gradeZoom-4); }}, '➖'),
    el('div',{class:'meta', style:'flex:none;'}, 'Zoom'),
    el('button',{class:'btn ghost', style:'width:auto;padding:6px 14px;', onclick:()=>{ ajustarZoomCentralizado(state._gradeZoom+4); }}, '➕')
  ));
  wrap.appendChild(el('div',{class:'row', style:'align-items:center;gap:6px;margin-bottom:10px;flex-wrap:wrap;'},
    el('div',{class:'meta', style:'flex:none;'}, 'Tamanho:'),
    el('button',{class:'btn ghost', style:'width:auto;padding:4px 10px;', onclick:()=>{ grade.largura = Math.max(6, grade.largura-2); render(); }}, '➖'),
    el('div',{style:'flex:none;font-weight:700;'}, grade.largura+' larg.'),
    el('button',{class:'btn ghost', style:'width:auto;padding:4px 10px;', onclick:()=>{ grade.largura = Math.min(40, grade.largura+2); render(); }}, '➕'),
    el('div',{class:'meta', style:'flex:none;margin-left:8px;'}, '×'),
    el('button',{class:'btn ghost', style:'width:auto;padding:4px 10px;', onclick:()=>{ grade.altura = Math.max(6, grade.altura-2); render(); }}, '➖'),
    el('div',{style:'flex:none;font-weight:700;'}, grade.altura+' alt.'),
    el('button',{class:'btn ghost', style:'width:auto;padding:4px 10px;', onclick:()=>{ grade.altura = Math.min(30, grade.altura+2); render(); }}, '➕')
  ));

  wrap.appendChild(el('div',{class:'row', style:'margin-top:4px;'},
    el('button',{class:'btn ghost'+(state._gradeDesfazer?'':' '), style: state._gradeDesfazer?'':'opacity:0.5;', onclick:desfazerUltimaAcaoGrade}, '↩️ Desfazer'),
    el('button',{class:'btn ghost', onclick:()=>{
      if(!confirm('Limpar o tabuleiro inteiro (posições e blocos)? Não mexe na iniciativa/PV de ninguém, nem nos mapas salvos.')) return;
      combate.grade = { blocos:{}, posicoes:{} };
      render();
    }}, 'Limpar Tabuleiro 🗑️')
  ));

  return wrap;
}
function renderGradePopup(titulo, conteudoEl, onFechar){
  const overlay = el('div',{class:'menu-overlay', onclick:(e)=>{ if(e.target===e.currentTarget) onFechar(); }});
  const sheet = el('div',{class:'menu-sheet'});
  sheet.appendChild(el('div',{class:'wizard-title', style:'padding:10px 14px 6px;'}, titulo));
  sheet.appendChild(conteudoEl);
  sheet.appendChild(el('button',{class:'menu-close', onclick:onFechar}, 'Fechar'));
  overlay.appendChild(sheet);
  return overlay;
}

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

  const timeline = el('div',{class:'iniciativa-timeline', 'data-preservar-scroll':'combate-timeline'});
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
            (c.tipo==='pj' && c.origemId) ?
              el('span',{style:'font-weight:700;color:var(--ink);'}, pvAtualCombatente(c)+' / '+pvMaxCombatente(c)+' 🔗') :
              el('input',{id:'pv-num-'+c.id, type:'number', value:c.pv, style:'margin:0;padding:2px 4px;width:52px;font-size:0.78rem;', onclick:(e)=>e.stopPropagation(), oninput:(e)=>{c.pv=parseInt(e.target.value)||0;}, onchange:render}),
            (c.tipo==='pj' && c.origemId) ? null : ' / '+c.pvMax
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
  wrap.appendChild(el('div',{class:'tip'}, el('b',{},'Sobre esta ferramenta'), 'O livro não traz listas oficiais de nomes por raça — isto é um gerador de apoio próprio, com sílabas inspiradas no clima de Arton, cobrindo as 17 raças do livro.'));

  if(!state._mestreNomeRaca) state._mestreNomeRaca = 'Humano';
  const sel = el('select',{onchange:(e)=>{state._mestreNomeRaca=e.target.value; render();}});
  Object.keys(NOMES_SILABAS).forEach(r=> sel.appendChild(el('option',{value:r, ...(state._mestreNomeRaca===r?{selected:'selected'}:{})}, r)));
  wrap.appendChild(sel);

  wrap.appendChild(el('div',{class:'row', style:'margin-top:10px;'},
    el('button',{class:'btn', onclick:()=>{
      const novos = [];
      for(let i=0;i<6;i++) novos.push(gerarNome(state._mestreNomeRaca));
      state._mestreNomesGerados = novos;
      state._mestreNpcsGerados = null;
      render();
    }}, 'Sortear 6 Nomes 🎲'),
    el('button',{class:'btn ghost', onclick:()=>{
      const novos = [];
      for(let i=0;i<3;i++) novos.push(sortearNpcCompleto(state._mestreNomeRaca));
      state._mestreNpcsGerados = novos;
      state._mestreNomesGerados = null;
      render();
    }}, 'Sortear NPC Completo 🎭')
  ));

  if(state._mestreNomesGerados && state._mestreNomesGerados.length){
    const panel = el('div',{class:'panel faixa'}, el('h2',{},'Nomes sorteados'));
    state._mestreNomesGerados.forEach(nome=> panel.appendChild(el('div',{class:'power-item'}, nome)));
    wrap.appendChild(panel);
  }

  if(state._mestreNpcsGerados && state._mestreNpcsGerados.length){
    const panel = el('div',{class:'panel faixa'}, el('h2',{},'NPCs sorteados'));
    state._mestreNpcsGerados.forEach((npc,idx)=>{
      panel.appendChild(el('div',{class:'option-card', style:'margin-top:8px;'},
        el('div',{class:'opt-nome'}, npc.nome),
        el('div',{class:'opt-sub'}, npc.raca),
        el('div',{class:'tip', style:'margin-top:6px;font-size:0.82rem;'}, el('b',{},'Traço: '), npc.traco),
        el('div',{class:'tip', style:'font-size:0.82rem;'}, el('b',{},'Segredo: '), npc.segredo),
        el('button',{class:'btn ghost', style:'margin-top:6px;', onclick:()=>{
          state._mestreNpcsGerados[idx] = sortearNpcCompleto(state._mestreNomeRaca);
          render();
        }}, 'Sortear de novo esse 🎲')
      ));
    });
    wrap.appendChild(panel);
  }
  return wrap;
}
