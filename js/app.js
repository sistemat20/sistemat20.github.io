// ============ Painel do Aventureiro — Tormenta 20 ============
// app.js — estado, roteamento entre telas e toda a lógica de UI

const TIPS_GERAIS = [
  ["Pontos de Vida (PV)","quando chegam a 0, seu personagem cai. É sua barra de aguentar dano."],
  ["Pontos de Mana (PM)","o combustível das magias e da maioria dos poderes especiais. Gerencie com cuidado."],
  ["Círculo de magia","magias de círculo maior são mais fortes e custam mais PM. Você só acessa um círculo novo em níveis específicos da sua classe."],
  ["Defesa","o número que os inimigos precisam superar para te acertar. Base 10 + Destreza + armadura/escudo."],
  ["Teste de resistência","quando alguém tenta resistir a um efeito (sua magia ou de um inimigo), compara o resultado com a CD (10 + metade do nível + atributo-chave)."],
];

const AVATAR_CORES = ['#7c1f1f','#2c3a52','#8a6a1e','#3b5c3b','#5a3b6b','#a4291f','#4a4a4a','#6b4423'];
function corAvatar(seed){
  let h=0; for(const c of String(seed)) h = (h*31 + c.charCodeAt(0))>>>0;
  return AVATAR_CORES[h % AVATAR_CORES.length];
}
function uid(){ return 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

function el(tag, attrs, ...children){
  const e = document.createElement(tag);
  const BOOLEANOS = ['checked','disabled','selected','required','readonly'];
  if(attrs) for(const k in attrs){
    if(k==='class') e.className = attrs[k];
    else if(k.startsWith('on')) e.addEventListener(k.substring(2).toLowerCase(), attrs[k]);
    else if(BOOLEANOS.includes(k)){
      // atributos booleanos do HTML: a simples presença já significa "true", mesmo com valor "false"
      // como string — por isso só adicionamos o atributo quando for genuinamente verdadeiro.
      if(attrs[k]) e.setAttribute(k, '');
      e[k] = !!attrs[k]; // também seta a propriedade, pra refletir de imediato (ex: checkbox.checked)
    }
    else e.setAttribute(k, attrs[k]);
  }
  children.flat().forEach(c=>{
    if(c==null) return;
    if(typeof c === 'string' || typeof c === 'number') e.appendChild(document.createTextNode(c));
    else e.appendChild(c);
  });
  return e;
}

// Ajusta a altura de uma textarea pro tamanho exato do conteúdo (sem barra de rolagem interna).
function autoResizeTextarea(ta){
  ta.style.height = 'auto';
  ta.style.height = (ta.scrollHeight + 2) + 'px';
}
// Cria uma textarea que cresce sozinha pra baixo conforme o texto aumenta, em vez de ficar
// com scroll interno numa caixinha fixa. Aceita os mesmos atributos de el('textarea', ...).
function textareaAutoResize(attrs, valorInicial){
  const attrsFinal = Object.assign({}, attrs, {
    oninput:(e)=>{ if(attrs && attrs.oninput) attrs.oninput(e); autoResizeTextarea(e.target); },
    style: (attrs && attrs.style ? attrs.style+';' : '') + 'resize:none;overflow-y:hidden;'
  });
  const ta = el('textarea', attrsFinal, valorInicial);
  requestAnimationFrame(()=> autoResizeTextarea(ta));
  return ta;
}

function fichaVazia(){
  return {
    id:null, jogador:'', nome:'', foto:null, raca:'', origem:'', divindade:'', poderConcedido:null, alinhamento:'', idade:'',
    classesNiveis:[], // [{classe:'Guerreiro', nivel:1}, ...] — suporta multiclasse
    for:0,des:0,con:0,int:0,sab:0,car:0,
    pvmax:'',pvatual:'',pmmax:'',pmatual:'',pvtemp:0,pmtemp:0,
    defOutros:0, deslocamento:9, tamanho:'Médio',
    tc:0, ts:0, to:0, // moedas: Tibar de Cobre / Tibar de Prata (padrão) / Tibar de Ouro
    armadura:null, escudo:null, esotericos:[], // {nome,esp,maos,efeito,escolaFoco,equipado:true}
    armas:[], // {nome,teste,dano,critico,tipo,alcance,esp,equipado}
    magias:[],
    periciasTreinadas:[],
    poderGeral:null, poderGeralExtra:null, origemPoder:null, poderRaca:null, origemPoderCategoria:null, // {nome, sub}
    poderesClasse:[], // [{classe, nivel, nome, sub, trocaPorGeral}]
    historicoNiveis:[],
    equip:[], notas:'', habilidadesIniciais:[],
    arcanistaCaminho:null, arcanistaLinhagem:null, magiasMemorizadas:[], escolasMagia:null, panteaoEnergia:null
  };
}

// ============ ESTADO GLOBAL ============
window.state = {
  screen:'perfis', // 'perfis' | 'wizard' | 'ficha'
  perfis:[],
  gerenciandoPerfis:false,
  perfilAtualId:null,
  tab:'personagem',
  magiaFiltro:{ trad:'arcana', circulo:'1', busca:'', escola:'todas' },
  guia:{ classe:'Guerreiro', nivel:1 },
  itensFiltro:{ tipo:'inicio', busca:'', categoria:'todas' },
  addMsg:'',
  wizard: null
};

function fichaAtual(){
  return state.perfis.find(p=>p.id===state.perfilAtualId);
}
async function carregarPerfis(){
  state.perfis = await carregarPerfisArmazenamento();
  aplicarMigracoesPerfis();
  state._ultimoEstadoSalvo = {};
  (state.perfis||[]).forEach(p=>{ state._ultimoEstadoSalvo[p.id] = JSON.parse(JSON.stringify(p)); });
}
// Fila de salvamento — mesma ideia já usada do lado do Mestre (sincronizarGradeCompartilhada):
// nunca deixa 2 salvamentos rodando ao mesmo tempo. Aqui o risco é menor (state.perfis nunca é
// TROCADO por outro array, só editado por dentro — ver iniciarAtualizacaoAutomaticaJogador), mas
// como o padrão já provou valer a pena duas vezes achando corrida de verdade, vale reforçar aqui
// também por segurança, já que é barato.
let _perfisSalvando = false;
let _perfisSalvarPendente = false;
async function salvarPerfis(){
  if(_perfisSalvando){ _perfisSalvarPendente = true; return; }
  _perfisSalvando = true;
  try{
    await salvarPerfisInterno();
  } finally {
    _perfisSalvando = false;
    if(_perfisSalvarPendente){ _perfisSalvarPendente = false; salvarPerfis(); }
  }
}
async function salvarPerfisInterno(){
  // Antes de sobrescrever o servidor com a cópia local, busca rapidinho se o servidor tem algum
  // presente (item/dinheiro do Mestre) que ainda não vimos — sem isso, salvar logo depois de
  // receber algo (antes do jogador ter atualizado a página) apagava o presente, porque a cópia
  // local (sem ele) ia por cima da versão do servidor (com ele).
  await mesclarPresentesDoServidor();

  // "Desfazer" precisa saber qual era o estado de CADA personagem antes deste save. Guardamos
  // sempre uma cópia do "último estado salvo conhecido" (state._ultimoEstadoSalvo); antes de
  // sobrescrever, ela vira o alvo de desfazer (state._paraDesfazer) — e só depois é atualizada
  // pro que acabamos de salvar, pronta pra servir de referência da PRÓXIMA mudança.
  if(!state._ultimoEstadoSalvo) state._ultimoEstadoSalvo = {};
  if(!state._paraDesfazer) state._paraDesfazer = {};
  (state.perfis||[]).forEach(p=>{
    if(state._ultimoEstadoSalvo[p.id]){
      state._paraDesfazer[p.id] = state._ultimoEstadoSalvo[p.id];
    }
  });

  await salvarPerfisArmazenamento(state.perfis);

  (state.perfis||[]).forEach(p=>{
    state._ultimoEstadoSalvo[p.id] = JSON.parse(JSON.stringify(p));
  });
  // Depois de salvar, local e servidor ficam em sincronia — atualiza o "retrato" de moeda
  // conhecido, senão o próximo ciclo de atualização automática compara contra um valor antigo
  // e acha, por engano, que o Mestre acabou de mandar dinheiro (quando foi o próprio jogador
  // que editou e salvou).
  if(!state._ultimoServidorMoeda) state._ultimoServidorMoeda = {};
  (state.perfis||[]).forEach(p=>{
    state._ultimoServidorMoeda[p.id] = {ts:p.ts, tc:p.tc, to:p.to};
  });
}

// ---- Notificação de "o Mestre te mandou algo" ----
// A cada ~12s, se o jogador estiver com a ficha aberta, busca os dados de novo e compara com o
// que já tinha — se aparecer um item novo marcado "(recebido do Mestre)" ou o dinheiro aumentar,
// avisa na hora. Só troca esses campos específicos (item/dinheiro), não mexe em mais nada da
// ficha, pra nunca sobrescrever uma edição que o jogador esteja fazendo em outro campo.
// Busca o que o servidor tem AGORA e mescla só o que for presente de verdade (item marcado
// "recebido do Mestre" que ainda não temos, ou dinheiro que aumentou) — NUNCA troca a lista
// inteira, só acrescenta/soma por cima do que já existe localmente. Usada tanto pelo polling de
// 12s quanto (mais importante) bem antes de QUALQUER salvamento manual — sem isso, salvar logo
// depois de receber um presente (antes do polling ter tido a chance de buscar) sobrescrevia o
// servidor com a cópia local antiga, apagando o que acabou de chegar.
async function mesclarPresentesDoServidor(){
  let listaNova;
  try{ listaNova = await carregarPerfisArmazenamento(); }catch(e){ return false; }
  let mudou = false;
  (state.perfis||[]).forEach(fAtual=>{
    const fNovo = listaNova.find(p=>p.id===fAtual.id);
    if(!fNovo) return;
    const equipAntigo = fAtual.equip || [];
    const equipNovo = fNovo.equip || [];
    // Foto de TUDO que o servidor já mandou alguma vez pra esse personagem — precisa só CRESCER,
    // nunca "esquecer" um item, mesmo depois que o jogador exclui ele da mochila. Comparar contra
    // a lista local (fAtual.equip) tinha um bug: excluir um item de presente fazia a lista local
    // encolher, e o código achava que era um presente NOVO chegando (o servidor ainda não sabe
    // da exclusão) — devolvendo o item que tinha acabado de ser apagado.
    if(!state._itensVistosDoServidor) state._itensVistosDoServidor = {};
    if(!state._itensVistosDoServidor[fAtual.id]) state._itensVistosDoServidor[fAtual.id] = new Set(equipAntigo.map(e=>e.item));
    const vistos = state._itensVistosDoServidor[fAtual.id];
    // Lista persistente NA FICHA de itens de presente já excluídos de propósito — sem isso, um
    // item excluído voltava assim que o servidor (desatualizado) mandava a versão antiga de
    // novo. Complementa o Set em memória acima (que se perde ao recarregar a página).
    const excluidosDePresente = fAtual._itensExcluidosDePresente || [];
    // Reconhece os DOIS formatos de presente ("do Mestre" e "de Fulano") — antes só pegava o do
    // Mestre, então item enviado por um jogador não era detectado como presente novo e podia se
    // perder numa sincronização.
    const novosItens = equipNovo.filter(e=> /\(recebido (do Mestre|de [^)]*)\)/.test(e.item) && !vistos.has(e.item) && !excluidosDePresente.includes(e.item));
    if(novosItens.length>0){
      novosItens.forEach(it=>{
        notificarComSom('🎁 '+fAtual.nome+' recebeu: '+nomeBaseItem(it.item)+'!');
        fAtual.equip.push(it);
        vistos.add(it.item);
      });
      mudou = true;
    }
    if(!state._ultimoServidorMoeda) state._ultimoServidorMoeda = {};
    if(!state._ultimoServidorMoeda[fAtual.id]) state._ultimoServidorMoeda[fAtual.id] = {ts:fNovo.ts, tc:fNovo.tc, to:fNovo.to};
    const snapshot = state._ultimoServidorMoeda[fAtual.id];
    ['ts','tc','to'].forEach(campo=>{
      const servidorAntes = parseInt(snapshot[campo])||0, servidorDepois = parseInt(fNovo[campo])||0;
      if(servidorDepois > servidorAntes){
        const delta = servidorDepois - servidorAntes;
        notificarComSom('💰 '+fAtual.nome+' recebeu +'+delta+' '+(campo==='ts'?'T$':campo==='tc'?'TC':'TO')+'!');
        fAtual[campo] = (parseInt(fAtual[campo])||0) + delta;
        mudou = true;
      }
      snapshot[campo] = servidorDepois;
    });
  });
  return mudou;
}
let _intervalAtualizacaoJogador = null;
function iniciarAtualizacaoAutomaticaJogador(){
  pararAtualizacaoAutomaticaJogador();
  _intervalAtualizacaoJogador = setInterval(async ()=>{
    if(state.screen !== 'ficha' || usandoStorageDoClaude()){ return; }
    const digitando = document.activeElement && ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName);
    if(digitando || state._girandoAnel) return; // não redesenha no meio de um gesto
    const mudou = await mesclarPresentesDoServidor();
    if(mudou){ salvarNoLocalStorage(state.perfis); render(); }
  }, 12000);
}
function pararAtualizacaoAutomaticaJogador(){
  if(_intervalAtualizacaoJogador){ clearInterval(_intervalAtualizacaoJogador); _intervalAtualizacaoJogador = null; }
}
// Personagens de TODOS os jogadores, só pras ferramentas do Mestre (iniciativa, grupo, tesouro).
async function carregarPerfisTodosParaMestre(){
  state.perfisTodos = await carregarTodosPersonagensMestre();
}

// ---- Modo Mesa (alto contraste) ----
const CHAVE_TEMA = 'painel_aventureiro_tema';
function aplicarTemaSalvo(){
  try{
    if(localStorage.getItem(CHAVE_TEMA) === 'mesa') document.documentElement.dataset.tema = 'mesa';
  }catch(e){}
}
function alternarTemaMesa(){
  const ativo = document.documentElement.dataset.tema === 'mesa';
  if(ativo){ delete document.documentElement.dataset.tema; }
  else{ document.documentElement.dataset.tema = 'mesa'; }
  try{ localStorage.setItem(CHAVE_TEMA, ativo ? 'padrao' : 'mesa'); }catch(e){}
  render();
}
function botaoTema(){
  const ativo = document.documentElement.dataset.tema === 'mesa';
  return el('button',{class:'btn ghost', style:'width:auto;flex-shrink:0;padding:6px 10px;background:transparent;border-color:#f4efe2;color:#f4efe2;', onclick:alternarTemaMesa, title:'Alternar Modo Mesa (alto contraste)'}, ativo?'☀️':'🌓');
}

async function iniciar(){
  // Link compartilhado da Grade de Combate — pula TODO o fluxo normal de login, é uma tela
  // só-leitura própria. Detecta pela URL (?vergrade=CODIGO) antes de qualquer outra coisa.
  const paramsUrl = new URLSearchParams(window.location.search);
  const codigoVerGrade = paramsUrl.get('vergrade');
  if(codigoVerGrade){
    state.screen = 'vergrade';
    state._verGradeCodigo = codigoVerGrade;
    aplicarTemaSalvo();
    await atualizarVisualizacaoGrade();
    setInterval(atualizarVisualizacaoGrade, 2000);
    return;
  }
  aplicarTemaSalvo();
  if(precisaCodigoJogador() && !obterCodigoJogador()){
    render(); // mostra a tela de código sem tentar carregar nada ainda
    return;
  }
  if(precisaCodigoJogador() && ehCodigoMestre(obterCodigoJogador())){
    // Reabrindo o app já logado como Mestre (código salvo de uma visita anterior) — vai
    // direto pra tela de ferramentas do mestre, sem passar pela tela de "meus personagens".
    state.screen = 'mestre';
    state.mestreCategoria = 'combate'; state.mestreTab = 'combate';
    state._carregandoInicial = true;
    render();
    await carregarPerfisTodosParaMestre();
    carregarDadosMestreDoServidor();
    state._carregandoInicial = false;
    render();
    iniciarAtualizacaoAutomaticaMestre();
    return;
  }
  // Mostra os personagens salvos localmente (se tiver uma cópia de uma visita anterior) na hora,
  // sem esperar o servidor responder — rede lenta não deveria deixar a tela parecendo
  // travada/em branco.
  const temCacheLocal = !usandoStorageDoClaude() && typeof carregarDoLocalStorage==='function' && carregarDoLocalStorage().length>0;
  if(temCacheLocal){
    state.perfis = carregarDoLocalStorage();
    aplicarMigracoesPerfis();
    state._carregandoAtualizacao = true;
  } else {
    state._carregandoInicial = true;
  }
  render();

  // Se demorar demais, avisa que o Google está sendo lento (em vez de deixar parecendo travado)
  let avisouDemora = false;
  const timeoutAviso = setTimeout(()=>{
    if(state._carregandoInicial || state._carregandoAtualizacao){
      avisouDemora = true;
      state._carregandoDemorando = true;
      render();
    }
  }, 6000);

  await carregarPerfis();
  clearTimeout(timeoutAviso);
  state._carregandoInicial = false;
  state._carregandoAtualizacao = false;
  state._carregandoDemorando = false;
  render();
}

// ---- Tela de entrada: nome + código (ou só o código, para o Mestre) ----
function renderEntradaCodigoScreen(){
  if(!state._login) state._login = {modo:'jogador', nome:'', codigo:'', erro:null, carregando:false};
  const L = state._login;
  const wrap = el('div',{class:'perfis-screen'});
  wrap.appendChild(el('div',{class:'perfis-title'},'Painel do Aventureiro'));
  const painel = el('div',{class:'panel faixa', style:'max-width:380px;width:100%;'});
  const titulos = {jogador:'Entrar', registrar:'Primeiro acesso', mestre:'Entrar como Mestre'};
  painel.appendChild(el('h2',{}, titulos[L.modo]));
  if(L.modo==='registrar') painel.appendChild(el('div',{class:'tip'},
    el('b',{},'Primeira vez aqui?'),
    'Escolha o nome que a mesa conhece e um código só seu (4 a 32 caracteres). Você vai usar os dois para entrar em qualquer aparelho.'
  ));
  if(L.modo!=='mestre'){
    painel.appendChild(el('label',{},'Nome'));
    painel.appendChild(el('input',{type:'text', autocomplete:'username', value:L.nome, oninput:(e)=>{L.nome=e.target.value;}}));
  }
  painel.appendChild(el('label',{}, L.modo==='mestre' ? 'Código do Mestre' : 'Código'));
  painel.appendChild(el('input',{type:'password', autocomplete: L.modo==='registrar' ? 'new-password' : 'current-password', value:L.codigo,
    oninput:(e)=>{L.codigo=e.target.value;}, onkeydown:(e)=>{ if(e.key==='Enter') confirmarLoginSupabase(); }}));
  if(L.erro) painel.appendChild(el('div',{class:'tip', style:'color:var(--red-bright);'}, L.erro));
  painel.appendChild(el('button',{class:'btn', onclick:confirmarLoginSupabase}, L.carregando ? 'Entrando...' : (L.modo==='registrar' ? 'Criar acesso' : 'Entrar')));
  const trocar = (modo)=>{ L.modo = modo; L.erro = null; L.codigo = ''; render(); };
  if(L.modo==='jogador'){
    painel.appendChild(el('button',{class:'btn ghost', style:'margin-top:8px;', onclick:()=>trocar('registrar')}, 'Primeiro acesso'));
    painel.appendChild(el('button',{class:'btn ghost', style:'margin-top:8px;', onclick:()=>trocar('mestre')}, '♛ Sou o Mestre'));
  } else {
    painel.appendChild(el('button',{class:'btn ghost', style:'margin-top:8px;', onclick:()=>trocar('jogador')}, 'Voltar'));
  }
  wrap.appendChild(painel);
  return wrap;
}

async function confirmarLoginSupabase(){
  const L = state._login;
  if(!L || L.carregando) return;
  if(L.modo!=='mestre' && !L.nome.trim()){ L.erro = 'Digite seu nome.'; render(); return; }
  // Quem digita "Mestre" no campo de nome quer entrar como Mestre (aconteceu no ensaio).
  if(L.modo==='jogador' && /^[♛\s]*mestre\s*$/i.test(L.nome.trim())) L.modo = 'mestre';
  if(!L.codigo.trim()){ L.erro = 'Digite o código.'; render(); return; }
  L.erro = null; L.carregando = true; render();
  const r = await entrarSupabase(L.modo, L.nome.trim(), L.codigo.trim());
  L.carregando = false;
  if(!r.ok){
    L.erro = (r.erro && r.erro.codigo==='REDE') ? 'Sem conexão com o servidor. Tente de novo.' : ((r.erro && r.erro.mensagem) || 'Não consegui entrar.');
    render();
    return;
  }
  state._login = null;
  await seguirDepoisDoLogin(!!r.dados.jogador.ehMestre);
}

// Depois de entrar: Mestre vai para as ferramentas do Mestre, jogador para a lista de personagens.
async function seguirDepoisDoLogin(ehMestre){
  if(ehMestre){
    state.screen = 'mestre';
    state.mestreCategoria = 'combate'; state.mestreTab = 'combate';
    state._carregandoInicial = true;
    render();
    await carregarPerfisTodosParaMestre();
    carregarDadosMestreDoServidor();
    state._carregandoInicial = false;
    render();
    iniciarAtualizacaoAutomaticaMestre();
    return;
  }
  state.screen = 'perfis';
  state._carregandoInicial = true;
  render();
  await carregarPerfis();
  state._carregandoInicial = false;
  render();
}

// Sai da conta — volta pra tela de entrada (não apaga nada do servidor, só "desloga" o aparelho)
function sairDoCodigoJogador(){
  pararAtualizacaoAutomaticaMestre();
  limparCodigoJogador();
  state.perfis = [];
  state.perfilAtualId = null;
  state.screen = 'perfis';
  state._login = null;
  render();
}

// Debounce genérico: adia a chamada até parar de digitar por `espera`ms — evita
// reconstruir a tela inteira a cada tecla em campos de busca sobre listas grandes.
function debounce(fn, espera){
  let timer = null;
  return function(...args){
    clearTimeout(timer);
    timer = setTimeout(()=>fn.apply(this,args), espera||180);
  };
}
const renderDebounced = debounce(()=>render(), 150);

// ============ RENDER RAIZ ============
function render(){
  const root = document.getElementById('root');
  const ae = document.activeElement;
  let focoId = null, selStart = null, selEnd = null;
  if(ae && ae.id && (ae.tagName==='INPUT' || ae.tagName==='TEXTAREA')){
    focoId = ae.id;
    selStart = ae.selectionStart;
    selEnd = ae.selectionEnd;
  }
  // Guarda a posição de rolagem (da janela, e a de dentro de um popup, se houver um aberto) —
  // sem isso, toda vez que algo dentro de um popup muda (ex: escolher um item no Level Up),
  // o render reconstrói tudo do zero e a rolagem volta pro topo, o que é bem incômodo.
  const scrollJanela = window.scrollY;
  const sheetAberto = document.querySelector('.menu-sheet');
  const scrollSheet = sheetAberto ? sheetAberto.scrollTop : null;
  // Mesma ideia, só que genérica: qualquer elemento marcado com data-preservar-scroll (listas
  // com rolagem própria, tipo a fileira de combatentes na Grade ou a timeline de iniciativa)
  // tem a posição guardada aqui, pra não "pular" de volta pro início toda vez que a tela
  // atualiza sozinha (o polling da Grade a cada 2s, por exemplo).
  const scrollsMarcados = {};
  document.querySelectorAll('[data-preservar-scroll]').forEach(el=>{
    const chave = el.getAttribute('data-preservar-scroll');
    scrollsMarcados[chave] = {left: el.scrollLeft, top: el.scrollTop};
  });

  root.innerHTML = '';
  try{
    if(state.screen==='vergrade') root.appendChild(renderVisualizacaoGrade());
    else if(precisaCodigoJogador() && !obterCodigoJogador()){
      root.appendChild(renderEntradaCodigoScreen());
    }
    else if(state.screen==='perfis') root.appendChild(renderPerfisScreen());
    else if(state.screen==='wizard') root.appendChild(renderWizardScreen());
    else if(state.screen==='ficha') root.appendChild(renderFichaScreen());
    else if(state.screen==='mestre') root.appendChild(renderMestreScreen());
    // Faixa fixa do herói (direto no #root: um pai com transform prenderia o fixed).
    // Barra de telas embaixo (direto no #root: um pai com transform prenderia o fixed).
    if(state.screen==='ficha' && fichaAtual() && !(precisaCodigoJogador() && !obterCodigoJogador())){
      root.appendChild(renderBarraBaixo(fichaAtual()));
    }
    if(typeof atualizarEfeitoCondicoes==='function') atualizarEfeitoCondicoes();
    if(typeof marcarDicasLongas==='function') (typeof requestAnimationFrame==='function' ? requestAnimationFrame : setTimeout)(marcarDicasLongas);
  }catch(erro){
    // Nunca deixa a tela em branco silenciosamente — sem isso, qualquer erro no meio da
    // montagem (ex: um dado incompleto chegando de uma sincronização) apagava a tela inteira
    // sem explicação nenhuma, e a única saída era recarregar a página sem saber por quê.
    console.error('Erro ao montar a tela:', erro);
    root.innerHTML = '';
    root.appendChild(el('div',{style:'padding:24px;text-align:center;'},
      el('div',{style:'font-size:2rem;'}, '⚠️'),
      el('h2',{style:'margin-top:10px;'}, 'Deu um erro ao montar essa tela'),
      el('div',{class:'meta', style:'margin:10px 0;'}, String(erro && erro.message || erro)),
      el('button',{class:'btn', onclick:()=>{ window.location.reload(); }}, 'Recarregar a página'),
      el('button',{class:'btn ghost', style:'margin-top:8px;', onclick:()=>{ state.screen='perfis'; state.mestreTab=null; render(); }}, 'Voltar pros Perfis')
    ));
  }
  if(focoId){
    const restaurado = document.getElementById(focoId);
    if(restaurado){
      restaurado.focus();
      if(selStart!=null && restaurado.setSelectionRange){
        try{ restaurado.setSelectionRange(selStart, selEnd); }catch(e){}
      }
    }
  }
  window.scrollTo(0, scrollJanela);
  if(scrollSheet!=null){
    const sheetNovo = document.querySelector('.menu-sheet');
    if(sheetNovo) sheetNovo.scrollTop = scrollSheet;
  }
  function restaurarScrollsMarcados(){
    document.querySelectorAll('[data-preservar-scroll]').forEach(el=>{
      const chave = el.getAttribute('data-preservar-scroll');
      const guardado = scrollsMarcados[chave];
      if(guardado){ el.scrollLeft = guardado.left; el.scrollTop = guardado.top; }
    });
  }
  restaurarScrollsMarcados();
  // O navegador às vezes ajusta a rolagem sozinho de forma assíncrona (ex: ao focar um elemento
  // ou reposicionar depois de um clique), o que pode desfazer a restauração acima. Reaplicamos
  // em dois "próximos quadros" seguidos, garantindo que a nossa restauração vença por último,
  // mesmo se o navegador levar mais de um ciclo pra fazer o próprio ajuste automático.
  const reaplicar = ()=>{
    window.scrollTo(0, scrollJanela);
    const sheetNovo2 = document.querySelector('.menu-sheet');
    if(sheetNovo2 && scrollSheet!=null) sheetNovo2.scrollTop = scrollSheet;
    restaurarScrollsMarcados();
  };
  const proximoQuadro = (typeof requestAnimationFrame === 'function') ? requestAnimationFrame : (cb)=>setTimeout(cb, 16);
  proximoQuadro(()=>{ reaplicar(); proximoQuadro(reaplicar); });
}

// Frases de clima pra tela de carregamento — nada oficial do livro, só pra dar uma cara de
// Arton enquanto o servidor responde. Escolhida uma por sessão, não fica trocando.
const FRASES_CARREGAMENTO = [
  'Afiando espadas e recarregando mochilas...',
  'Consultando os arquivos de Valkaria...',
  'A Tormenta espera, mas os heróis não...',
  'Rolando iniciativa nos bastidores...',
  'Acordando o escriba da guilda...',
  'Reunindo os aventureiros na taverna...',
  'Verificando o mapa de Arton...',
];
// Ícone de carregamento: usa um GIF de verdade (feito pelo usuário, não gerado por nós), com o
// dado rolando de forma suave — bem mais convincente do que qualquer tentativa nossa em SVG.
function iconeD20(tamanhoPx){
  const img = document.createElement('img');
  img.src = 'img/d20-carregando.gif';
  img.alt = 'Dado de 20 lados rolando';
  img.style.width = tamanhoPx+'px';
  img.style.height = tamanhoPx+'px';
  img.style.display = 'block';
  return img;
}

function fraseCarregamentoAtual(){
  if(!state._fraseCarregamento) state._fraseCarregamento = FRASES_CARREGAMENTO[Math.floor(Math.random()*FRASES_CARREGAMENTO.length)];
  return state._fraseCarregamento;
}

// ============ TELA DE PERFIS ============
// renderPerfisScreen: ver js/heroi.js (boas-vindas do herói, 13/11/2026)

document.addEventListener('DOMContentLoaded', iniciar);
