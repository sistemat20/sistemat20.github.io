// ============ ADAPTADOR DE ARMAZENAMENTO ============
// Dentro do Claude (Artifacts), usa window.storage normalmente.
// Fora do Claude (hospedado no Netlify, por exemplo), usa uma planilha do Google como banco de dados,
// via um Web App do Apps Script. Cada jogador tem um "código de acesso" (escolhido por ele ou
// sugerido pelo app) que liga os personagens dele à planilha — dá pra entrar com o mesmo código
// em qualquer aparelho. Quem digitar "Mestre" cai direto nas ferramentas do mestre.
//
// PRA ATIVAR O MODO PLANILHA:
// 1. Siga o guia (Code.gs incluso no projeto) pra publicar o Web App na sua planilha do Google.
// 2. Cole a URL do Web App na constante SHEETS_API_URL abaixo.
// 3. Pronto — o app detecta sozinho que não está mais no Claude e passa a usar a planilha.

const SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbyxHtjQoe_HTiG2PtSDSqNQ768dlgydz6IuNnuOKDwMsAomy23vlISaxrqTfokBmn5aPg/exec';
const CHAVE_CODIGO_JOGADOR = 'painel_aventureiro_codigo_jogador';

// ---- Backend Supabase (migração da planilha, ver supabase/ no repositório) ----
// BACKEND decide quem guarda os dados: 'planilha' (Apps Script, o de sempre) ou 'supabase'.
// Para ensaiar o Supabase sem mudar nada para a mesa, abra o site com ?backend=supabase: a
// escolha fica guardada só neste navegador (e ?backend=planilha desfaz).
// No modo Supabase, o "código do jogador" que o resto do app enxerga passa a ser o token da
// sessão (login por nome + código no auth-api). Assim app.js, ficha.js e mestre.js quase não mudam.
const BACKEND = 'planilha';
const SUPABASE_URL = 'https://wosdybamqyisdtfpnvly.supabase.co';
const SUPABASE_CHAVE_PUBLICA = 'sb_publishable_2fWTgZZqIkWycwXNJe3t2Q_2RZHonvS'; // pública por natureza
const CHAVE_BACKEND = 'painel_aventureiro_backend';
const CHAVE_SESSAO = 'painel_aventureiro_sessao';
const CHAVE_TOKEN_GRADE = 'painel_aventureiro_token_grade';

function backendAtivo(){
  try{
    const pedido = new URLSearchParams(window.location.search).get('backend');
    if(pedido==='supabase' || pedido==='planilha') localStorage.setItem(CHAVE_BACKEND, pedido);
    return localStorage.getItem(CHAVE_BACKEND) || BACKEND;
  }catch(e){ return BACKEND; }
}
function usandoSupabase(){
  return !usandoStorageDoClaude() && backendAtivo()==='supabase';
}
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

function usandoStorageDoClaude(){
  return typeof window.storage !== 'undefined' && window.storage !== null;
}

// Só faz sentido pedir um código quando existe uma planilha compartilhada de verdade — dentro
// do Claude cada conversa já é isolada, então não precisa de código nenhum.
function precisaCodigoJogador(){
  if(usandoSupabase()) return true;
  return !usandoStorageDoClaude() && !!SHEETS_API_URL;
}

function obterCodigoJogador(){
  if(usandoSupabase()){ const s = obterSessao(); return s ? s.token : null; }
  try{ return localStorage.getItem(CHAVE_CODIGO_JOGADOR) || null; }
  catch(e){ return null; }
}
function definirCodigoJogador(codigo){
  const limpo = String(codigo||'').trim();
  if(!limpo) return false;
  try{ localStorage.setItem(CHAVE_CODIGO_JOGADOR, limpo); }catch(e){}
  return true;
}
function limparCodigoJogador(){
  if(usandoSupabase()){
    const s = obterSessao();
    if(s) chamarSupabase('auth-api', {acao:'sair', token:s.token}); // não espera: sair é local de qualquer jeito
    limparSessao();
    // A cópia local é de quem saiu: não pode aparecer para o próximo que entrar neste aparelho.
    try{ localStorage.removeItem('painel_aventureiro_perfis'); }catch(e){}
    return;
  }
  try{ localStorage.removeItem(CHAVE_CODIGO_JOGADOR); }catch(e){}
}
// Palavra especial que vira código de Mestre — separado numa constante pra ficar fácil de trocar
// no futuro (é usada aqui e também em qualquer lugar que precise "achar os dados do Mestre da
// mesa", tipo os mapas em Notas → Locais do lado do jogador). Também dá pra trocar a qualquer
// momento pela tela do Mestre (botão de chave, embaixo do de Modo Mesa).
const CODIGO_MESTRE_ESPECIAL = 'Rola';
function ehCodigoMestre(codigo){
  if(usandoSupabase()){
    // No Supabase quem diz se é Mestre é o login, não uma palavra: o "código" aqui é o token.
    const s = obterSessao();
    return !!(s && s.jogador.ehMestre && codigo===s.token);
  }
  // minúsculo dos dois lados, não só do código digitado — assim funciona não importa como a
  // constante acima estiver escrita (maiúscula, minúscula, misturada).
  return String(codigo||'').trim().toLowerCase() === CODIGO_MESTRE_ESPECIAL.toLowerCase();
}
// Sugestão de código pra quem não quer pensar em um: palavra temática + 4 dígitos.
function sugerirCodigoJogador(){
  const palavras = ['LOBO','DRAGAO','FALCAO','TIGRE','FENIX','GOLEM','SOMBRA','AURORA','TEMPESTADE','RUBI'];
  const palavra = palavras[Math.floor(Math.random()*palavras.length)];
  const numero = Math.floor(1000 + Math.random()*9000);
  return palavra+'-'+numero;
}

// ---- Carregar ----
// Remove duplicatas por ID, mantendo sempre o primeiro que aparecer — proteção extra caso
// alguma corrida rara no salvamento (dois salvamentos quase ao mesmo tempo) chegue a duplicar
// uma linha na planilha antes da correção com travamento no backend.
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
  if(usandoSupabase()){
    if(!obterSessao()) return [];
    const r = await chamarSupabase('t20-api', comSessao({acao:'meusPersonagens'}));
    if(r.ok) return removerPersonagensDuplicados(r.dados.personagens || []);
    console.error('Falha ao carregar do Supabase, usando cópia local salva no navegador.', r.erro);
    return removerPersonagensDuplicados(carregarDoLocalStorage());
  }
  if(SHEETS_API_URL){
    const codigo = obterCodigoJogador();
    if(!codigo) return []; // sem código ainda — a tela de entrada cuida disso antes de chegar aqui
    try{
      const resp = await fetch(SHEETS_API_URL + '?playerId=' + encodeURIComponent(codigo) + '&_t=' + Date.now(), {cache:'no-store'});
      const data = await resp.json();
      // Antes, se a resposta chegasse tecnicamente OK mas sem "ok:true" ou sem a lista de
      // personagens (uma instabilidade momentânea do Apps Script, por exemplo — sem precisar
      // nem cair em erro de rede), isso descartava a cópia local em cache e devolvia lista
      // vazia — fazendo a ficha "sumir" da tela por causa de um problema passageiro, mesmo com
      // tudo intacto tanto localmente quanto na planilha de verdade. Agora cai pro cache local
      // nesse caso também, igual já fazia quando dava erro de rede.
      if(data && data.ok && data.personagens) return removerPersonagensDuplicados(data.personagens);
      console.error('Resposta da planilha veio incompleta, usando cópia local salva no navegador.', data);
      return removerPersonagensDuplicados(carregarDoLocalStorage());
    }catch(e){
      console.error('Falha ao carregar da planilha, usando cópia local salva no navegador.', e);
      return removerPersonagensDuplicados(carregarDoLocalStorage());
    }
  }
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
  if(usandoSupabase()){
    if(!obterSessao()) return;
    await salvarPerfisSupabase(perfis, true);
    salvarNoLocalStorage(perfis); // de novo, agora com as versões novas
    return;
  }
  if(SHEETS_API_URL){
    const codigo = obterCodigoJogador();
    if(!codigo) return;
    try{
      await fetch(SHEETS_API_URL, {
        method: 'POST',
        headers: {'Content-Type':'text/plain;charset=utf-8'}, // evita preflight CORS no Apps Script
        body: JSON.stringify({ playerId: codigo, personagens: perfis })
      });
    }catch(e){
      console.error('Falha ao salvar na planilha — os dados continuam salvos neste navegador.', e);
    }
  }
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

// Envia uma foto (data URL base64) pro backend, que guarda no Drive e devolve um link —
// evita encher a célula da planilha com uma string gigante. Se não houver planilha configurada
// (ex: dentro do Claude), devolve a própria data URL sem mexer no Drive.
async function enviarFotoParaBackend(dataUrlBase64, nomeArquivo){
  if(usandoStorageDoClaude() || !SHEETS_API_URL){
    return dataUrlBase64; // sem backend de Drive disponível — guarda a imagem direto (modo Claude)
  }
  if(usandoSupabase()){
    const r = await chamarSupabase('t20-api', comSessao({acao:'enviarFoto', imagemBase64: dataUrlBase64}));
    if(r.ok && r.dados.url) return r.dados.url;
    console.error('Upload de foto falhou, guardando localmente como reserva.', r.erro);
    if(typeof flashMsg==='function') flashMsg('⚠ Não consegui enviar a foto (' + ((r.erro&&r.erro.mensagem)||'erro desconhecido') + '). Guardei a foto direto por enquanto.');
    return dataUrlBase64;
  }
  try{
    const resp = await fetch(SHEETS_API_URL, {
      method: 'POST',
      headers: {'Content-Type':'text/plain;charset=utf-8'},
      body: JSON.stringify({ action:'uploadFoto', imagemBase64: dataUrlBase64, nomeArquivo: nomeArquivo || ('foto_'+Date.now()+'.jpg') })
    });
    const data = await resp.json();
    if(data && data.ok && data.url) return data.url;
    console.error('Upload de foto falhou, guardando localmente como reserva.', data);
    if(typeof flashMsg==='function') flashMsg('⚠ Não consegui enviar a foto pro Drive (erro: '+(data&&data.erro?data.erro:'desconhecido')+'). Guardei a foto direto por enquanto.');
    return dataUrlBase64;
  }catch(e){
    console.error('Falha ao enviar foto pro Drive — guardando localmente como reserva.', e);
    if(typeof flashMsg==='function') flashMsg('⚠ Não consegui falar com o backend pra enviar a foto (' + e.message + '). Guardei a foto direto por enquanto.');
    return dataUrlBase64;
  }
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
// No modo planilha, isso chama um endpoint separado do backend (?mestre=true) que ignora o
// isolamento por código de acesso. No modo Claude não existe separação por jogador nenhuma —
// todo mundo já divide o mesmo "perfis" — então só devolve a lista normal, com um dono genérico.
async function carregarTodosPersonagensMestre(){
  if(usandoStorageDoClaude()){
    const lista = await carregarPerfisArmazenamento();
    return lista.map(p=> Object.assign({}, p, {_playerId: p._playerId || 'local'}));
  }
  if(usandoSupabase()){
    const r = await chamarSupabase('t20-api', comSessao({acao:'todosPersonagens'}));
    if(r.ok) return removerPersonagensDuplicados(r.dados.personagens || []);
    console.error('Falha ao carregar personagens de todos os jogadores.', r.erro);
    return [];
  }
  if(SHEETS_API_URL){
    try{
      const resp = await fetch(SHEETS_API_URL + '?mestre=true&_t=' + Date.now(), {cache:'no-store'});
      const data = await resp.json();
      if(data && data.ok) return removerPersonagensDuplicados(data.personagens || []);
      return [];
    }catch(e){
      console.error('Falha ao carregar personagens de todos os jogadores.', e);
      return [];
    }
  }
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

// Atualiza (ou cria) UM personagem específico, direto do Mestre, sem precisar do código do dono.
async function mestreAtualizarPersonagem(personagem){
  const copia = Object.assign({}, personagem);
  delete copia._playerId; // campo interno só de leitura, não faz parte da ficha em si
  // Antes de sobrescrever, busca rápido o que o servidor tem AGORA pra esse personagem — sem
  // isso, essa função (usada tanto pelo jogador enviando um item quanto pelo Mestre editando
  // PV/tesouro) podia apagar algo que chegou concorrentemente (o mesmo tipo de corrida já
  // corrigida no salvamento normal da ficha, só que faltava proteger esse caminho também).
  try{
    const todos = await carregarTodosPersonagensMestre();
    const versaoServidor = todos.find(p=>p.id===copia.id);
    mesclarSemPerderDados(copia, versaoServidor);
    if(versaoServidor && versaoServidor._versao) copia._versao = versaoServidor._versao; // já mesclado com essa versão
  }catch(e){ /* se não conseguir buscar, segue com o que tinha — melhor tentar salvar do que travar */ }
  if(usandoSupabase()){
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
  if(usandoStorageDoClaude()){
    const lista = await carregarPerfisArmazenamento();
    const idx = lista.findIndex(p=>p.id===copia.id);
    if(idx>=0) lista[idx] = copia; else lista.push(copia);
    await salvarPerfisArmazenamento(lista);
    return true;
  }
  if(SHEETS_API_URL){
    try{
      const resp = await fetch(SHEETS_API_URL, {
        method: 'POST',
        headers: {'Content-Type':'text/plain;charset=utf-8'},
        body: JSON.stringify({ action:'mestreAtualizarPersonagem', personagemId: copia.id, dadosJSON: copia })
      });
      const data = await resp.json();
      return !!(data && data.ok);
    }catch(e){
      console.error('Falha ao mandar atualização de personagem via Mestre.', e);
      return false;
    }
  }
  return false;
}

// Lista leve (id/nome/jogador) de todos os personagens de todos os jogadores — usada pra montar
// o seletor de destino quando um jogador (não o Mestre) quer mandar um item pra outro personagem.
async function listaLeveDeTodosPersonagens(){
  if(usandoStorageDoClaude()){
    const lista = await carregarPerfisArmazenamento();
    return lista.map(p=>({id:p.id, nome:p.nome, jogador:p.jogador||''}));
  }
  if(usandoSupabase()){
    const r = await chamarSupabase('t20-api', comSessao({acao:'listaJogadores'}));
    if(r.ok) return r.dados.personagens || [];
    console.error('Falha ao carregar a lista de personagens.', r.erro);
    return [];
  }
  if(SHEETS_API_URL){
    try{
      const resp = await fetch(SHEETS_API_URL + '?listaJogadores=true&_t=' + Date.now(), {cache:'no-store'});
      const data = await resp.json();
      if(data && data.ok) return data.personagens || [];
      return [];
    }catch(e){
      console.error('Falha ao carregar a lista de personagens.', e);
      return [];
    }
  }
  return [];
}

// Manda um item pra OUTRO personagem (de qualquer jogador) — não precisa ser o Mestre pra
// fazer isso. No modo planilha, o próprio backend lê/escreve o destino direto (não confia
// no que este navegador tinha em cache dele).
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
  if(usandoSupabase()){
    const r = await chamarSupabase('t20-api', comSessao({acao:'enviarItem', personagemDestinoId, item}));
    return r.ok ? {ok:true, nomeDestino:r.dados.nomeDestino} : {ok:false};
  }
  if(SHEETS_API_URL){
    try{
      const resp = await fetch(SHEETS_API_URL, {
        method: 'POST',
        headers: {'Content-Type':'text/plain;charset=utf-8'},
        body: JSON.stringify({ action:'jogadorEnviarItem', personagemDestinoId, item })
      });
      const data = await resp.json();
      return data && data.ok ? {ok:true, nomeDestino:data.nomeDestino} : {ok:false};
    }catch(e){
      console.error('Falha ao enviar item pro outro personagem.', e);
      return {ok:false};
    }
  }
  return {ok:false};
}

// Mesma ideia do envio de item, mas pra dinheiro — soma direto no campo de moeda do destino no
// servidor (ação atômica, sob trava), em vez de mandar a ficha inteira por cima (que arriscaria
// apagar qualquer coisa que a pessoa tivesse acabado de mudar, sem a gente saber).
async function enviarDinheiroParaOutroPersonagem(personagemDestinoId, campo, valor){
  if(usandoStorageDoClaude()){
    const lista = await carregarPerfisArmazenamento();
    const alvo = lista.find(p=>p.id===personagemDestinoId);
    if(!alvo) return {ok:false};
    alvo[campo] = (parseInt(alvo[campo])||0) + valor;
    await salvarPerfisArmazenamento(lista);
    return {ok:true, nomeDestino:alvo.nome};
  }
  if(usandoSupabase()){
    const r = await chamarSupabase('t20-api', comSessao({acao:'enviarDinheiro', personagemDestinoId, campo, valor}));
    return r.ok ? {ok:true, nomeDestino:r.dados.nomeDestino} : {ok:false};
  }
  if(SHEETS_API_URL){
    try{
      const resp = await fetch(SHEETS_API_URL, {
        method: 'POST',
        headers: {'Content-Type':'text/plain;charset=utf-8'},
        body: JSON.stringify({ action:'jogadorEnviarDinheiro', personagemDestinoId, campo, valor })
      });
      const data = await resp.json();
      return data && data.ok ? {ok:true, nomeDestino:data.nomeDestino} : {ok:false};
    }catch(e){
      console.error('Falha ao enviar dinheiro pro outro personagem.', e);
      return {ok:false};
    }
  }
  return {ok:false};
}

// ---- Dados do Mestre (Grupos + Encontros Salvos) — ficam numa aba separada da planilha,
// uma linha por código de Mestre, então sincronizam entre qualquer aparelho que entre com o
// mesmo código (em vez de ficar preso só num navegador via localStorage).
async function carregarMestreDadosArmazenamento(){
  if(usandoStorageDoClaude()){
    try{
      const r = await window.storage.get('mestre_dados', false);
      return (r && r.value) ? JSON.parse(r.value) : {grupos:[], encontrosSalvos:[]};
    }catch(e){ return {grupos:[], encontrosSalvos:[]}; }
  }
  if(usandoSupabase()) return carregarMestreDadosPorCodigo(obterCodigoJogador());
  if(SHEETS_API_URL){
    const codigo = obterCodigoJogador();
    if(!codigo) return {grupos:[], encontrosSalvos:[]};
    try{
      const resp = await fetch(SHEETS_API_URL + '?mestreDados=true&mestreCodigo=' + encodeURIComponent(codigo) + '&_t=' + Date.now(), {cache:'no-store'});
      const data = await resp.json();
      if(data && data.ok) return data.dados || {grupos:[], encontrosSalvos:[]};
      return {grupos:[], encontrosSalvos:[]};
    }catch(e){
      console.error('Falha ao carregar dados do Mestre.', e);
      return {grupos:[], encontrosSalvos:[]};
    }
  }
  return {grupos:[], encontrosSalvos:[]};
}
// "codigoExplicito" é usado por quem NÃO está logado (o jogador acessando pelo link — é assim
// que o link funciona, sem precisar de conta) e por isso não tem código nenhum salvo no próprio
// aparelho. Sem isso, obterCodigoJogador() voltava null pro jogador, o salvamento falhava
// silenciosamente, e a jogada dele "sumia" no próximo polling — parecia bug de peça voltando
// sozinha, mas na real nunca tinha sido salvo de verdade.
// Renomeia a linha do Mestre na planilha (não cria linha nova nem deixa órfã pra trás).
async function trocarCodigoMestreArmazenamento(codigoAtual, codigoNovo){
  if(usandoStorageDoClaude()){
    // Storage do Claude é por chave já isolada por usuário, não tem "linha" pra renomear — só
    // confirma que pode trocar (o localStorage muda depois, do lado de quem chamou).
    return true;
  }
  if(usandoSupabase()){
    // Aqui codigoAtual é o código digitado de verdade (o token da sessão não muda).
    const r = await chamarSupabase('auth-api', comSessao({acao:'trocarCodigo', codigoAtual, codigoNovo}));
    return r.ok ? true : ((r.erro && r.erro.mensagem) || false);
  }
  if(SHEETS_API_URL){
    try{
      const resp = await fetch(SHEETS_API_URL, {
        method: 'POST',
        headers: {'Content-Type':'text/plain;charset=utf-8'},
        body: JSON.stringify({ action:'mestreTrocarCodigo', codigoAtual, codigoNovo })
      });
      const data = await resp.json();
      return data && data.ok ? true : (data && data.erro) || false;
    }catch(e){
      console.error('Falha ao trocar código do Mestre.', e);
      return false;
    }
  }
  return false;
}

async function salvarMestreDadosArmazenamento(dados, codigoExplicito){
  if(usandoStorageDoClaude()){
    try{ await window.storage.set('mestre_dados', JSON.stringify(dados), false); }catch(e){}
    return true;
  }
  if(usandoSupabase()){
    const codigo = codigoExplicito || obterCodigoJogador();
    if(!codigo) return false;
    if(!ehCodigoMestre(codigo)){
      // Quem salva pelo link da grade só pode mexer no tabuleiro.
      const cc = (dados && dados.combateCompartilhado) || {};
      if(!cc.grade) return false;
      const r = await chamarSupabase('t20-api', {acao:'salvarGrade', tokenGrade: codigo, grade: cc.grade, gradeParaJogadores: cc.gradeParaJogadores});
      return !!r.ok;
    }
    const r = await chamarSupabase('t20-api', comSessao({acao:'salvarMestreDados', dados}));
    if(!r.ok) console.error('Falha ao salvar dados do Mestre.', r.erro);
    return !!r.ok;
  }
  if(SHEETS_API_URL){
    const codigo = codigoExplicito || obterCodigoJogador();
    if(!codigo) return false;
    try{
      const resp = await fetch(SHEETS_API_URL, {
        method: 'POST',
        headers: {'Content-Type':'text/plain;charset=utf-8'},
        body: JSON.stringify({ action:'salvarMestreDados', mestreCodigo: codigo, dadosJSON: dados })
      });
      const data = await resp.json();
      return !!(data && data.ok);
    }catch(e){
      console.error('Falha ao salvar dados do Mestre.', e);
      return false;
    }
  }
  return false;
}
// Variante de leitura pra tela de "ver grade" compartilhada — quem abre esse link não está
// logado (não tem código salvo no aparelho), o código vem direto na URL. Reusa a MESMA rota
// pública já existente (?mestreDados=true), só que com o código passado explicitamente.
// Usada tanto pelo polling da Grade do Mestre (a cada 2s) quanto pelo link do jogador — a URL
// é sempre igual a cada chamada (mesmo código), o que deixa o navegador (ou qualquer proxy no
// meio do caminho, tipo rede de operadora/corporativa) livre pra devolver uma resposta antiga
// guardada em cache em vez de buscar de novo — e isso parecia "o Mestre não atualiza" mesmo com
// a aba aberta e o polling rodando certinho. cache:'no-store' + o "&_t=" (que muda a cada
// chamada) garantem que É sempre uma busca de verdade na rede, nunca uma reaproveitada.
async function carregarMestreDadosPorCodigo(codigo){
  if(!codigo) return {grupos:[], encontrosSalvos:[]};
  if(usandoStorageDoClaude()){
    try{
      const r = await window.storage.get('mestre_dados', false);
      return (r && r.value) ? JSON.parse(r.value) : {grupos:[], encontrosSalvos:[]};
    }catch(e){ return {grupos:[], encontrosSalvos:[]}; }
  }
  if(usandoSupabase()){
    // Três jeitos de chegar aqui no Supabase: o Mestre logado (código = token da sessão), o
    // jogador pedindo os mapas do Mestre (ficha.js passa CODIGO_MESTRE_ESPECIAL) e quem abriu o
    // link da grade (código = token do link). Cada um só recebe a parte a que tem direito.
    const vazio = {grupos:[], encontrosSalvos:[]};
    if(ehCodigoMestre(codigo)){
      const r = await chamarSupabase('t20-api', comSessao({acao:'lerMestreDados'}));
      return r.ok ? (r.dados.dados || vazio) : vazio;
    }
    if(codigo===CODIGO_MESTRE_ESPECIAL){
      const r = await chamarSupabase('t20-api', comSessao({acao:'mapasDoMestre'}));
      return Object.assign({}, vazio, {mapas: r.ok ? (r.dados.mapas || []) : []});
    }
    const r = await chamarSupabase('t20-api', {acao:'lerGrade', tokenGrade: codigo});
    return (r.ok && r.dados.combateCompartilhado) ? Object.assign({}, vazio, {combateCompartilhado: r.dados.combateCompartilhado}) : vazio;
  }
  if(SHEETS_API_URL){
    try{
      const resp = await fetch(SHEETS_API_URL + '?mestreDados=true&mestreCodigo=' + encodeURIComponent(codigo) + '&_t=' + Date.now(), {cache:'no-store'});
      const data = await resp.json();
      if(data && data.ok) return data.dados || {grupos:[], encontrosSalvos:[]};
      return {grupos:[], encontrosSalvos:[]};
    }catch(e){ return {grupos:[], encontrosSalvos:[]}; }
  }
  return {grupos:[], encontrosSalvos:[]};
}
// O que vai no link ?vergrade= da grade compartilhada. Na planilha é o próprio código do
// Mestre; no Supabase é um token só da grade (o servidor guarda só o hash), gerado uma vez e
// reaproveitado neste aparelho — gerar outro derrubaria o link que a mesa já tem.
async function codigoParaLinkDaGrade(){
  if(!usandoSupabase()) return obterCodigoJogador();
  try{ const salvo = localStorage.getItem(CHAVE_TOKEN_GRADE); if(salvo) return salvo; }catch(e){}
  const r = await chamarSupabase('t20-api', comSessao({acao:'gerarLinkGrade'}));
  if(!r.ok) return null;
  try{ localStorage.setItem(CHAVE_TOKEN_GRADE, r.dados.tokenGrade); }catch(e){}
  return r.dados.tokenGrade;
}
// Salva a grade a partir do link compartilhado (jogador mexendo, sem estar logado como Mestre).
// Faz "ler, trocar só a grade, salvar de volta" pra não apagar grupos/encontros salvos do
// Mestre — o jogador só tem permissão de mexer no tabuleiro, no resto ele nem tem acesso.

