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
async function carregarPerfisArmazenamento(){
  if(usandoStorageDoClaude()){
    try{
      const r = await window.storage.get('perfis', false);
      return (r && r.value) ? JSON.parse(r.value) : [];
    }catch(e){ return []; }
  }
  if(SHEETS_API_URL){
    const codigo = obterCodigoJogador();
    if(!codigo) return []; // sem código ainda — a tela de entrada cuida disso antes de chegar aqui
    try{
      const resp = await fetch(SHEETS_API_URL + '?playerId=' + encodeURIComponent(codigo));
      const data = await resp.json();
      if(data && data.ok) return data.personagens || [];
      return [];
    }catch(e){
      console.error('Falha ao carregar da planilha, usando cópia local salva no navegador.', e);
      return carregarDoLocalStorage();
    }
  }
  return carregarDoLocalStorage();
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
