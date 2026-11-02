// ============ ADAPTADOR DE ARMAZENAMENTO ============
// Fora do Claude (o site no GitHub Pages), os dados ficam no Supabase: as Edge Functions
// auth-api (login por nome + código) e t20-api (fichas, Mestre, grade, fotos), em supabase/.
// Dentro do Claude (Artifacts), usa window.storage, sem login.
//
// O "código do jogador" que o resto do app enxerga (obterCodigoJogador) é o token da sessão do
// auth-api. Assim app.js, ficha.js e mestre.js só perguntam "tem sessão?" e "é o Mestre?".

const SUPABASE_URL = 'https://wosdybamqyisdtfpnvly.supabase.co';
const SUPABASE_CHAVE_PUBLICA = 'sb_publishable_2fWTgZZqIkWycwXNJe3t2Q_2RZHonvS'; // pública por natureza
const CHAVE_SESSAO = 'painel_aventureiro_sessao';
const CHAVE_TOKEN_GRADE = 'painel_aventureiro_token_grade';

// Restos da época da planilha (até 01/11/2026): o código de acesso ficava salvo em texto puro no
// navegador, e o ensaio guardava a escolha de backend. Nenhum dos dois serve mais.
try{
  localStorage.removeItem('painel_aventureiro_codigo_jogador');
  localStorage.removeItem('painel_aventureiro_backend');
}catch(e){}

function usandoStorageDoClaude(){
  return typeof window.storage !== 'undefined' && window.storage !== null;
}
function usandoSupabase(){
  return !usandoStorageDoClaude();
}

// ---- Sessão e chamadas às Edge Functions ----
function obterSessao(){
  try{
    const s = JSON.parse(localStorage.getItem(CHAVE_SESSAO) || 'null');
    return (s && s.token && s.jogador) ? s : null;
  }catch(e){ return null; }
}
function definirSessao(sessao){
  try{ localStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao)); }catch(e){}
}
function limparSessao(){
  try{ localStorage.removeItem(CHAVE_SESSAO); localStorage.removeItem(CHAVE_TOKEN_GRADE); }catch(e){}
}
// Chama uma Edge Function. Sempre devolve {ok, dados} ou {ok:false, erro:{codigo, mensagem}},
// nunca lança. Sessão vencida (401 com token de sessão) desloga o aparelho e volta pro login.
async function chamarSupabase(funcao, corpo){
  try{
    const resp = await fetch(SUPABASE_URL + '/functions/v1/' + funcao, {
      method: 'POST',
      headers: {'Content-Type':'application/json', apikey: SUPABASE_CHAVE_PUBLICA},
      body: JSON.stringify(corpo),
      cache: 'no-store'
    });
    const data = await resp.json();
    if(resp.status===401 && corpo && corpo.token && data && data.erro && data.erro.codigo==='NAO_AUTENTICADO'){
      limparSessao();
      if(typeof render==='function') setTimeout(render, 0);
    }
    return data || {ok:false, erro:{codigo:'SEM_RESPOSTA', mensagem:'Resposta vazia do servidor.'}};
  }catch(e){
    return {ok:false, erro:{codigo:'REDE', mensagem:e.message}};
  }
}
function comSessao(corpo){
  const s = obterSessao();
  return Object.assign({token: s ? s.token : ''}, corpo);
}
// Login: modo 'jogador' (nome + código), 'mestre' (só o código) ou 'registrar' (jogador novo).
async function entrarSupabase(modo, nome, codigo){
  const acao = modo==='mestre' ? 'entrarMestre' : (modo==='registrar' ? 'registrar' : 'entrar');
  const r = await chamarSupabase('auth-api', {acao, nome, codigo});
  if(r.ok) definirSessao({token: r.dados.token, jogador: r.dados.jogador});
  return r;
}

// Dentro do Claude cada conversa já é isolada, então não tem login.
function precisaCodigoJogador(){
  return usandoSupabase();
}
function obterCodigoJogador(){
  const s = obterSessao();
  return s ? s.token : null;
}
function limparCodigoJogador(){
  const s = obterSessao();
  if(s) chamarSupabase('auth-api', {acao:'sair', token:s.token}); // não espera: sair é local de qualquer jeito
  limparSessao();
  // A cópia local é de quem saiu: não pode aparecer para o próximo que entrar neste aparelho.
  try{ localStorage.removeItem('painel_aventureiro_perfis'); }catch(e){}
}
// Quem diz se é Mestre é o login: o "código" aqui é o token da sessão.
function ehCodigoMestre(codigo){
  const s = obterSessao();
  return !!(s && s.jogador.ehMestre && codigo===s.token);
}

// ---- Carregar ----
// Remove duplicatas por ID, mantendo sempre o primeiro que aparecer — proteção extra contra
// alguma corrida rara de salvamento que chegue a duplicar uma ficha.
function removerPersonagensDuplicados(lista){
  const vistos = new Set();
  return lista.filter(p=>{
    const id = p && p.id;
    if(!id) return true; // sem id (não deveria acontecer), deixa passar
    if(vistos.has(id)) return false;
    vistos.add(id);
    return true;
  });
}

async function carregarPerfisArmazenamento(){
  if(usandoStorageDoClaude()){
    try{
      const r = await window.storage.get('perfis', false);
      return removerPersonagensDuplicados((r && r.value) ? JSON.parse(r.value) : []);
    }catch(e){ return []; }
  }
  if(!obterSessao()) return []; // sem login ainda — a tela de entrada cuida disso antes de chegar aqui
  const r = await chamarSupabase('t20-api', comSessao({acao:'meusPersonagens'}));
  if(r.ok) return removerPersonagensDuplicados(r.dados.personagens || []);
  // Falha passageira (rede, servidor acordando) não pode fazer a ficha "sumir" da tela: cai
  // para a cópia local deste navegador.
  console.error('Falha ao carregar do Supabase, usando cópia local salva no navegador.', r.erro);
  return removerPersonagensDuplicados(carregarDoLocalStorage());
}

// ---- Salvar ----
async function salvarPerfisArmazenamento(perfis){
  if(usandoStorageDoClaude()){
    try{ await window.storage.set('perfis', JSON.stringify(perfis), false); }catch(e){ console.error(e); }
    return;
  }
  // Sempre guarda uma cópia local também, como rede de segurança offline
  salvarNoLocalStorage(perfis);
  if(!obterSessao()) return;
  await salvarPerfisSupabase(perfis, true);
  salvarNoLocalStorage(perfis); // de novo, agora com as versões novas
}

// Cada ficha carrega "_versao" (a versão que o servidor tinha quando a gente leu). Se alguém
// gravou por cima nesse meio-tempo (o Mestre editou, chegou um presente), o servidor recusa
// essa ficha e devolve em "conflitos": aí busca a versão nova, mescla sem perder item/dinheiro
// (mesclarSemPerderDados, o mesmo critério de sempre) e tenta UMA vez de novo.
async function salvarPerfisSupabase(perfis, tentarDeNovo){
  const r = await chamarSupabase('t20-api', comSessao({acao:'salvarPersonagens', personagens: perfis}));
  if(!r.ok){ console.error('Falha ao salvar no Supabase — os dados continuam salvos neste navegador.', r.erro); return; }
  (r.dados.salvos || []).forEach(s=>{
    const p = perfis.find(x=>x.id===s.id);
    if(p) p._versao = s._versao;
  });
  const conflitos = r.dados.conflitos || [];
  if(!conflitos.length || !tentarDeNovo) return;
  const doServidor = await chamarSupabase('t20-api', comSessao({acao:'meusPersonagens'}));
  if(!doServidor.ok) return;
  conflitos.forEach(id=>{
    const local = perfis.find(x=>x.id===id);
    const servidor = (doServidor.dados.personagens || []).find(x=>x.id===id);
    if(!local || !servidor) return;
    mesclarSemPerderDados(local, servidor);
    local._versao = servidor._versao;
  });
  await salvarPerfisSupabase(perfis, false);
}

// Envia uma foto (data URL base64) pro Storage do Supabase e devolve o link público — evita
// guardar a imagem inteira dentro da ficha. Dentro do Claude (ou se o envio falhar) devolve a
// própria data URL, como reserva.
async function enviarFotoParaBackend(dataUrlBase64, nomeArquivo){
  if(usandoStorageDoClaude()) return dataUrlBase64;
  const r = await chamarSupabase('t20-api', comSessao({acao:'enviarFoto', imagemBase64: dataUrlBase64}));
  if(r.ok && r.dados.url) return r.dados.url;
  console.error('Upload de foto falhou, guardando localmente como reserva.', r.erro);
  if(typeof flashMsg==='function') flashMsg('⚠ Não consegui enviar a foto (' + ((r.erro&&r.erro.mensagem)||'erro desconhecido') + '). Guardei a foto direto por enquanto.');
  return dataUrlBase64;
}

function carregarDoLocalStorage(){
  try{
    const raw = localStorage.getItem('painel_aventureiro_perfis');
    return raw ? JSON.parse(raw) : [];
  }catch(e){ return []; }
}
function salvarNoLocalStorage(perfis){
  try{ localStorage.setItem('painel_aventureiro_perfis', JSON.stringify(perfis)); }catch(e){ /* ignora */ }
}

// ---- Ferramentas do Mestre: ver e editar personagens de QUALQUER jogador ----
// No Supabase só a sessão do Mestre recebe todas as fichas. No modo Claude não existe separação
// por jogador nenhuma, então só devolve a lista normal, com um dono genérico.
async function carregarTodosPersonagensMestre(){
  if(usandoStorageDoClaude()){
    const lista = await carregarPerfisArmazenamento();
    return lista.map(p=> Object.assign({}, p, {_playerId: p._playerId || 'local'}));
  }
  const r = await chamarSupabase('t20-api', comSessao({acao:'todosPersonagens'}));
  if(r.ok) return removerPersonagensDuplicados(r.dados.personagens || []);
  console.error('Falha ao carregar personagens de todos os jogadores.', r.erro);
  return [];
}

// Junta num personagem (que tá prestes a ser salvo) qualquer item/dinheiro que o servidor já
// tenha e o personagem local ainda não — sem isso, salvar por cima de uma versão desatualizada
// apagava qualquer coisa que tivesse chegado nesse meio-tempo (mesmo tipo de corrida já
// corrigida em mesclarPresentesDoServidor, só que essa aqui é genérica: usada tanto quando o
// PRÓPRIO jogador salva quanto quando o MESTRE atualiza a ficha de alguém).
function mesclarSemPerderDados(personagemLocal, personagemServidor){
  if(!personagemServidor) return personagemLocal;
  const equipLocal = personagemLocal.equip || [];
  const equipServidor = personagemServidor.equip || [];
  if(equipServidor.length > equipLocal.length){
    // Marca de presente ("recebido do Mestre"/"recebido de X") em vez de comparar por posição —
    // por posição dava errado se o item removido localmente não fosse o último da lista (ex:
    // jogador tirou um item do meio pra enviar pra outra pessoa; a lista local encolhe, mas não
    // "por trás", então comparar por índice comparava a coisa errada).
    const nomesLocais = equipLocal.map(e=>e.item);
    // Lista persistente de itens de presente já excluídos de propósito (guardada na própria
    // ficha) — sem isso, remover/usar/equipar um item de presente e depois salvar (ou o Mestre
    // atualizar a ficha) fazia o item voltar: essa função via "servidor tem X, local não tem X"
    // e concluía (errado) que era presente novo chegando, quando na really era o item que tinha
    // acabado de ser removido de propósito.
    const excluidosDePresente = personagemLocal._itensExcluidosDePresente || [];
    const presentesNovos = equipServidor.filter(e=> /\(recebido (do Mestre|de .+)\)/.test(e.item) && !nomesLocais.includes(e.item) && !excluidosDePresente.includes(e.item));
    if(presentesNovos.length>0){
      if(!personagemLocal.equip) personagemLocal.equip = [];
      personagemLocal.equip.push(...presentesNovos);
    }
  }
  ['ts','tc','to'].forEach(campo=>{
    const local = parseInt(personagemLocal[campo])||0;
    const servidor = parseInt(personagemServidor[campo])||0;
    if(servidor > local) personagemLocal[campo] = servidor;
  });
  return personagemLocal;
}

// O Mestre atualiza UM personagem de qualquer jogador (PV, tesouro, presentes).
async function mestreAtualizarPersonagem(personagem){
  const copia = Object.assign({}, personagem);
  delete copia._playerId; // campo interno só de leitura, não faz parte da ficha em si
  // Antes de sobrescrever, busca o que o servidor tem AGORA pra esse personagem e mescla, pra
  // não apagar algo que chegou nesse meio-tempo (presente, dinheiro).
  try{
    const todos = await carregarTodosPersonagensMestre();
    const versaoServidor = todos.find(p=>p.id===copia.id);
    mesclarSemPerderDados(copia, versaoServidor);
    if(versaoServidor && versaoServidor._versao) copia._versao = versaoServidor._versao; // já mesclado com essa versão
  }catch(e){ /* se não conseguir buscar, segue com o que tinha — melhor tentar salvar do que travar */ }
  if(usandoStorageDoClaude()){
    const lista = await carregarPerfisArmazenamento();
    const idx = lista.findIndex(p=>p.id===copia.id);
    if(idx>=0) lista[idx] = copia; else lista.push(copia);
    await salvarPerfisArmazenamento(lista);
    return true;
  }
  delete copia._donoId; delete copia._donoNome;
  let r = await chamarSupabase('t20-api', comSessao({acao:'mestreAtualizarPersonagem', personagem: copia}));
  if(!r.ok && r.erro && r.erro.codigo==='CONFLITO'){
    // O jogador salvou bem nessa hora: busca de novo, mescla e tenta mais uma vez.
    const todos = await carregarTodosPersonagensMestre();
    const versaoServidor = todos.find(p=>p.id===copia.id);
    if(versaoServidor){
      mesclarSemPerderDados(copia, versaoServidor);
      copia._versao = versaoServidor._versao;
      r = await chamarSupabase('t20-api', comSessao({acao:'mestreAtualizarPersonagem', personagem: copia}));
    }
  }
  if(!r.ok) console.error('Falha ao mandar atualização de personagem via Mestre.', r.erro);
  return !!r.ok;
}

// Lista leve (id/nome/jogador/foto/raça/classe) de todos os personagens de todos os jogadores —
// usada pra escolher destino ao mandar item/dinheiro e no "perfil social" de Relacionamentos.
async function listaLeveDeTodosPersonagens(){
  if(usandoStorageDoClaude()){
    const lista = await carregarPerfisArmazenamento();
    return lista.map(p=>({id:p.id, nome:p.nome, jogador:p.jogador||''}));
  }
  const r = await chamarSupabase('t20-api', comSessao({acao:'listaJogadores'}));
  if(r.ok) return r.dados.personagens || [];
  console.error('Falha ao carregar a lista de personagens.', r.erro);
  return [];
}

// Manda um item pra OUTRO personagem (de qualquer jogador) — não precisa ser o Mestre pra
// fazer isso. O servidor acrescenta o item no destino numa operação só (não confia no que este
// navegador tinha em cache dele).
async function enviarItemParaOutroPersonagem(personagemDestinoId, item){
  if(usandoStorageDoClaude()){
    const lista = await carregarPerfisArmazenamento();
    const alvo = lista.find(p=>p.id===personagemDestinoId);
    if(!alvo) return {ok:false};
    if(!alvo.equip) alvo.equip = [];
    alvo.equip.push(item);
    await salvarPerfisArmazenamento(lista);
    return {ok:true, nomeDestino:alvo.nome};
  }
  const r = await chamarSupabase('t20-api', comSessao({acao:'enviarItem', personagemDestinoId, item}));
  return r.ok ? {ok:true, nomeDestino:r.dados.nomeDestino} : {ok:false};
}

// Mesma ideia do envio de item, mas pra dinheiro — soma direto no campo de moeda do destino no
// servidor, em vez de mandar a ficha inteira por cima.
async function enviarDinheiroParaOutroPersonagem(personagemDestinoId, campo, valor){
  if(usandoStorageDoClaude()){
    const lista = await carregarPerfisArmazenamento();
    const alvo = lista.find(p=>p.id===personagemDestinoId);
    if(!alvo) return {ok:false};
    alvo[campo] = (parseInt(alvo[campo])||0) + valor;
    await salvarPerfisArmazenamento(lista);
    return {ok:true, nomeDestino:alvo.nome};
  }
  const r = await chamarSupabase('t20-api', comSessao({acao:'enviarDinheiro', personagemDestinoId, campo, valor}));
  return r.ok ? {ok:true, nomeDestino:r.dados.nomeDestino} : {ok:false};
}

// ---- Dados do Mestre (grupos, encontros salvos, mapas, combate compartilhado) ----
const MESTRE_DADOS_VAZIO = () => ({grupos:[], encontrosSalvos:[]});

async function carregarMestreDadosArmazenamento(){
  // Dentro do Claude não há sessão: qualquer código não vazio lê o mesmo mestre_dados.
  return carregarMestreDadosPorCodigo(usandoStorageDoClaude() ? 'local' : obterCodigoJogador());
}
// codigoAtual é o código digitado de verdade (o token da sessão não muda).
async function trocarCodigoMestreArmazenamento(codigoAtual, codigoNovo){
  if(usandoStorageDoClaude()) return true; // dentro do Claude não há código
  const r = await chamarSupabase('auth-api', comSessao({acao:'trocarCodigo', codigoAtual, codigoNovo}));
  return r.ok ? true : ((r.erro && r.erro.mensagem) || false);
}
// "codigoExplicito" é o token do link da grade: quem joga pelo link não tem login, e só pode
// mexer no tabuleiro (a grade completa e a versão filtrada que os jogadores veem).
async function salvarMestreDadosArmazenamento(dados, codigoExplicito){
  if(usandoStorageDoClaude()){
    try{ await window.storage.set('mestre_dados', JSON.stringify(dados), false); }catch(e){}
    return true;
  }
  const codigo = codigoExplicito || obterCodigoJogador();
  if(!codigo) return false;
  if(!ehCodigoMestre(codigo)){
    const cc = (dados && dados.combateCompartilhado) || {};
    if(!cc.grade) return false;
    const r = await chamarSupabase('t20-api', {acao:'salvarGrade', tokenGrade: codigo, grade: cc.grade, gradeParaJogadores: cc.gradeParaJogadores});
    return !!r.ok;
  }
  const r = await chamarSupabase('t20-api', comSessao({acao:'salvarMestreDados', dados}));
  if(!r.ok) console.error('Falha ao salvar dados do Mestre.', r.erro);
  return !!r.ok;
}
// Dois jeitos de chegar aqui: o Mestre logado (código = token da sessão) recebe tudo; quem abriu
// o link da grade (código = token do link) recebe só o combate compartilhado. Usada também pelo
// polling da grade a cada 2s (cache:'no-store' no chamarSupabase garante busca de verdade).
async function carregarMestreDadosPorCodigo(codigo){
  if(!codigo) return MESTRE_DADOS_VAZIO();
  if(usandoStorageDoClaude()){
    try{
      const r = await window.storage.get('mestre_dados', false);
      return (r && r.value) ? JSON.parse(r.value) : MESTRE_DADOS_VAZIO();
    }catch(e){ return MESTRE_DADOS_VAZIO(); }
  }
  if(ehCodigoMestre(codigo)){
    const r = await chamarSupabase('t20-api', comSessao({acao:'lerMestreDados'}));
    return r.ok ? (r.dados.dados || MESTRE_DADOS_VAZIO()) : MESTRE_DADOS_VAZIO();
  }
  const r = await chamarSupabase('t20-api', {acao:'lerGrade', tokenGrade: codigo});
  return (r.ok && r.dados.combateCompartilhado) ? Object.assign(MESTRE_DADOS_VAZIO(), {combateCompartilhado: r.dados.combateCompartilhado}) : MESTRE_DADOS_VAZIO();
}
// Mapas que o Mestre compartilhou (Notas → Locais do jogador): o jogador recebe só os mapas.
async function carregarMapasDoMestre(){
  if(usandoStorageDoClaude()) return (await carregarMestreDadosPorCodigo('local')).mapas || [];
  const r = await chamarSupabase('t20-api', comSessao({acao:'mapasDoMestre'}));
  return r.ok ? (r.dados.mapas || []) : [];
}
// O que vai no link ?vergrade= da grade compartilhada: um token só da grade (o servidor guarda
// só o hash), gerado uma vez e reaproveitado neste aparelho — gerar outro derrubaria o link que
// a mesa já tem.
async function codigoParaLinkDaGrade(){
  if(usandoStorageDoClaude()) return null;
  try{ const salvo = localStorage.getItem(CHAVE_TOKEN_GRADE); if(salvo) return salvo; }catch(e){}
  const r = await chamarSupabase('t20-api', comSessao({acao:'gerarLinkGrade'}));
  if(!r.ok) return null;
  try{ localStorage.setItem(CHAVE_TOKEN_GRADE, r.dados.tokenGrade); }catch(e){}
  return r.dados.tokenGrade;
}
