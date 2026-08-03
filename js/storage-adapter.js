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

function usandoStorageDoClaude(){
  return typeof window.storage !== 'undefined' && window.storage !== null;
}

// Só faz sentido pedir um código quando existe uma planilha compartilhada de verdade — dentro
// do Claude cada conversa já é isolada, então não precisa de código nenhum.
function precisaCodigoJogador(){
  return !usandoStorageDoClaude() && !!SHEETS_API_URL;
}

function obterCodigoJogador(){
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
  try{ localStorage.removeItem(CHAVE_CODIGO_JOGADOR); }catch(e){}
}
function ehCodigoMestre(codigo){
  return String(codigo||'').trim().toLowerCase() === 'mestre';
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

// Envia uma foto (data URL base64) pro backend, que guarda no Drive e devolve um link —
// evita encher a célula da planilha com uma string gigante. Se não houver planilha configurada
// (ex: dentro do Claude), devolve a própria data URL sem mexer no Drive.
async function enviarFotoParaBackend(dataUrlBase64, nomeArquivo){
  if(usandoStorageDoClaude() || !SHEETS_API_URL){
    return dataUrlBase64; // sem backend de Drive disponível — guarda a imagem direto (modo Claude)
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

// Atualiza (ou cria) UM personagem específico, direto do Mestre, sem precisar do código do dono.
async function mestreAtualizarPersonagem(personagem){
  const copia = Object.assign({}, personagem);
  delete copia._playerId; // campo interno só de leitura, não faz parte da ficha em si
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
async function salvarMestreDadosArmazenamento(dados, codigoExplicito){
  if(usandoStorageDoClaude()){
    try{ await window.storage.set('mestre_dados', JSON.stringify(dados), false); }catch(e){}
    return true;
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
// Salva a grade a partir do link compartilhado (jogador mexendo, sem estar logado como Mestre).
// Faz "ler, trocar só a grade, salvar de volta" pra não apagar grupos/encontros salvos do
// Mestre — o jogador só tem permissão de mexer no tabuleiro, no resto ele nem tem acesso.

