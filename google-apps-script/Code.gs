/**
 * Backend do Painel do Aventureiro (Tormenta 20) — Google Apps Script
 * Cole isso no editor de Apps Script de uma planilha do Google (Extensões > Apps Script)
 * e implante como Web App (Executar como: você / Quem pode acessar: qualquer pessoa).
 *
 * Estrutura esperada da planilha: uma aba chamada "Personagens" com o cabeçalho:
 * ID | PlayerID | Nome | DadosJSON | AtualizadoEm
 * (o script cria essa aba e o cabeçalho sozinho na primeira vez que rodar, se não existir)
 *
 * PlayerID agora é o "código de acesso" que o próprio jogador escolhe (ou aceita a sugestão do
 * app) — não é mais um ID de aparelho, então dá pra usar o mesmo código em qualquer celular.
 *
 * Fotos de personagem: em vez de guardar a imagem inteira dentro do DadosJSON, o app manda a
 * imagem (base64) num POST separado (action: "uploadFoto"), o script salva o arquivo numa pasta
 * fixa do Drive (definida em ID_PASTA_FOTOS abaixo — troque pelo ID da sua própria pasta, que
 * fica na URL dela: https://drive.google.com/drive/folders/SEU_ID_AQUI), deixa visível pra
 * qualquer pessoa com o link, e devolve só a URL — que é o que fica salvo na planilha.
 */

const NOME_ABA = 'Personagens';
// ID da pasta do Drive onde as fotos são salvas — pegue da URL da pasta:
// https://drive.google.com/drive/folders/AQUI_ESTA_O_ID
const ID_PASTA_FOTOS = '1BfRyTzfT4pG80lxV-mNgtYqlhpfWMnin';

function getOuCriarAba_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(NOME_ABA);
  if (!sheet) {
    sheet = ss.insertSheet(NOME_ABA);
    sheet.appendRow(['ID', 'PlayerID', 'Nome', 'DadosJSON', 'AtualizadoEm']);
  }
  return sheet;
}

function getOuCriarPastaFotos_() {
  return DriveApp.getFolderById(ID_PASTA_FOTOS);
}

// Rode esta função MANUALMENTE uma vez (selecione ela no menu ao lado do botão ▶ Executar,
// lá em cima no editor, e clique em Executar) — só assim o Google mostra a tela pedindo
// autorização de acesso ao Drive (leitura E escrita). Depois de autorizar, o site funciona sozinho.
// IMPORTANTE: precisa ativar o serviço "Drive API" em Serviços (ícone + no menu lateral) antes de rodar.
function autorizarAcessoAoDrive() {
  const pasta = DriveApp.getFolderById(ID_PASTA_FOTOS);
  Logger.log('Acesso de leitura OK: ' + pasta.getName());

  const testeBlob = Utilities.newBlob('teste', 'text/plain', 'teste_autorizacao.txt');
  const arquivoTeste = pasta.createFile(testeBlob);
  Logger.log('Acesso de escrita OK! Arquivo de teste criado: ' + arquivoTeste.getName());

  Drive.Permissions.create(
    { role: 'reader', type: 'anyone' },
    arquivoTeste.getId(),
    { fields: 'id' }
  );
  Logger.log('Acesso de compartilhamento OK (via Drive.Permissions.create)!');

  arquivoTeste.setTrashed(true); // apaga o arquivo de teste, não precisa mais dele
  Logger.log('Arquivo de teste removido. Tudo funcionando — pode testar o upload pelo site agora!');
}

// GET /exec?playerId=XXXX — devolve todos os personagens ligados a esse código de acesso
// GET /exec?mestre=true — devolve TODOS os personagens de TODOS os jogadores (uso exclusivo das
// ferramentas do Mestre: rastreador de iniciativa, visão geral do grupo, envio de tesouro).
// Cada personagem vem com um campo extra "_playerId" indicando o dono, pra saber pra quem escrever depois.
function doGet(e) {
  if (!e || !e.parameter) {
    // Rodou pelo botão "Executar" do editor, sem uma requisição de verdade por trás.
    // Isso é só um aviso amigável pra teste manual — a Web App funciona normal quando chamada pelo app.
    return ContentService.createTextOutput(JSON.stringify({ ok: false, erro: 'Isso aqui só funciona chamado como Web App (pelo link /exec), não rodando "Executar" no editor.' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  const sheet = getOuCriarAba_();
  const dados = sheet.getDataRange().getValues();

  if (String(e.parameter.mestre || '').trim() === 'true') {
    const todos = [];
    for (let i = 1; i < dados.length; i++) {
      const linha = dados[i];
      if (linha[3]) {
        try {
          const personagem = JSON.parse(linha[3]);
          personagem._playerId = String(linha[1]);
          todos.push(personagem);
        } catch (err) { /* linha corrompida, ignora */ }
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ ok: true, personagens: todos }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const playerId = (e.parameter.playerId || '').trim();
  if (!playerId) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, erro: 'playerId ausente' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  const personagens = [];
  for (let i = 1; i < dados.length; i++) {
    const linha = dados[i];
    if (String(linha[1]) === playerId && linha[3]) {
      try { personagens.push(JSON.parse(linha[3])); } catch (err) { /* linha corrompida, ignora */ }
    }
  }
  return ContentService.createTextOutput(JSON.stringify({ ok: true, personagens: personagens }))
    .setMimeType(ContentService.MimeType.JSON);
}

// POST /exec — dois formatos de corpo possíveis:
// 1) { playerId, personagens: [...] } — substitui TODOS os personagens daquele código pela lista enviada.
// 2) { action: "uploadFoto", imagemBase64: "data:image/jpeg;base64,...", nomeArquivo: "..." } —
//    salva a imagem no Drive e devolve a URL pública de visualização.
function doPost(e) {
  if (!e || !e.postData) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, erro: 'Isso aqui só funciona chamado como Web App (pelo link /exec), não rodando "Executar" no editor.' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  const body = JSON.parse(e.postData.contents);

  if (body.action === 'uploadFoto') {
    return tratarUploadFoto_(body);
  }

  if (body.action === 'mestreAtualizarPersonagem') {
    return tratarMestreAtualizarPersonagem_(body);
  }

  const sheet = getOuCriarAba_();
  const playerId = String(body.playerId || '').trim();
  const personagens = body.personagens || [];

  if (!playerId) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, erro: 'playerId ausente' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Trava a execução enquanto mexe na planilha — sem isso, dois salvamentos quase simultâneos
  // (bem comum, já que quase todo campo da ficha salva sozinho ao editar) podiam se cruzar no
  // meio do processo e duplicar linhas do mesmo personagem. Espera até 10s pela vez de rodar.
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, erro: 'Ocupado salvando outra alteração, tenta de novo em instantes.' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  try {
    const dados = sheet.getDataRange().getValues();
    const idsRecebidos = {};
    personagens.forEach(function (p) { idsRecebidos[String(p.id || '')] = true; });
    const agora = new Date();

    // Atualiza no lugar quem já existe (por ID), e marca quais IDs já têm linha na planilha.
    const idsExistentes = {};
    for (let i = 1; i < dados.length; i++) {
      const linhaId = String(dados[i][0]);
      if (String(dados[i][1]) === playerId && linhaId) {
        idsExistentes[linhaId] = true;
        if (idsRecebidos[linhaId]) {
          const p = personagens.find(function (x) { return String(x.id || '') === linhaId; });
          sheet.getRange(i + 1, 3).setValue(p.nome || '');
          sheet.getRange(i + 1, 4).setValue(JSON.stringify(p));
          sheet.getRange(i + 1, 5).setValue(agora);
        }
      }
    }
    // Insere quem ainda não tinha linha (personagem novo).
    personagens.forEach(function (p) {
      const id = String(p.id || '');
      if (!idsExistentes[id]) {
        sheet.appendRow([id, playerId, p.nome || '', JSON.stringify(p), agora]);
      }
    });
    // Remove linhas de personagens desse jogador que não vieram mais na lista (foram apagados).
    for (let i = dados.length - 1; i >= 1; i--) {
      const linhaId = String(dados[i][0]);
      if (String(dados[i][1]) === playerId && linhaId && !idsRecebidos[linhaId]) {
        sheet.deleteRow(i + 1);
      }
    }
  } finally {
    lock.releaseLock();
  }

  return ContentService.createTextOutput(JSON.stringify({ ok: true, salvos: personagens.length }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Ação exclusiva do Mestre: atualiza o DadosJSON de UM personagem específico, de QUALQUER
// jogador, sem precisar do código de acesso dele — encontra a linha pelo ID do personagem.
// Corpo esperado: { action: "mestreAtualizarPersonagem", personagemId: "...", dadosJSON: {...} }
// Usado por exemplo pra mandar tesouro/loot direto pra mochila de um jogador específico.
function tratarMestreAtualizarPersonagem_(body) {
  try {
    const personagemId = String(body.personagemId || '').trim();
    if (!personagemId) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, erro: 'personagemId ausente' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(10000);
    } catch (e) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, erro: 'Ocupado salvando outra alteração, tenta de novo em instantes.' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    try {
      const sheet = getOuCriarAba_();
      const dados = sheet.getDataRange().getValues();
      for (let i = 1; i < dados.length; i++) {
        if (String(dados[i][0]) === personagemId) {
          const novoJSON = JSON.stringify(body.dadosJSON);
          sheet.getRange(i + 1, 4).setValue(novoJSON); // coluna D = DadosJSON
          sheet.getRange(i + 1, 5).setValue(new Date()); // coluna E = AtualizadoEm
          return ContentService.createTextOutput(JSON.stringify({ ok: true }))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ ok: false, erro: 'personagem não encontrado' }))
        .setMimeType(ContentService.MimeType.JSON);
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, erro: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function tratarUploadFoto_(body) {
  try {
    const dataUrl = String(body.imagemBase64 || '');
    const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, erro: 'imagem inválida' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    const tipoMime = match[1];
    const base64Puro = match[2];
    const bytes = Utilities.base64Decode(base64Puro);
    const nomeArquivo = String(body.nomeArquivo || ('foto_' + Date.now() + '.jpg'));
    const blob = Utilities.newBlob(bytes, tipoMime, nomeArquivo);

    const pasta = getOuCriarPastaFotos_();
    const arquivo = pasta.createFile(blob);

    // Usa o Serviço Avançado do Drive (Drive.Permissions.create) em vez de arquivo.setSharing(),
    // que em alguns casos falha com "Access denied" mesmo com a permissão de OAuth certa.
    // IMPORTANTE: precisa ativar o serviço "Drive API" em Serviços (ícone +) no editor antes de rodar.
    Drive.Permissions.create(
      { role: 'reader', type: 'anyone' },
      arquivo.getId(),
      { fields: 'id' }
    );

    const url = 'https://lh3.googleusercontent.com/d/' + arquivo.getId();
    return ContentService.createTextOutput(JSON.stringify({ ok: true, url: url }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, erro: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ---- FUNÇÃO DE MANUTENÇÃO (rode manualmente, uma vez, se desconfiar de personagens duplicados) ----
// Pra rodar: abra o editor do Apps Script, escolha "limparPersonagensDuplicados" no menu de funções
// (ao lado do botão ▷ Executar), clique em Executar, e confira o log (Ver → Registros de execução).
// Não precisa rodar isso toda hora — só se notar duas cópias do mesmo personagem em algum momento.
// Mantém sempre a linha mais recente (AtualizadoEm mais novo) de cada ID e apaga as outras.
function limparPersonagensDuplicados() {
  const sheet = getOuCriarAba_();
  const dados = sheet.getDataRange().getValues();
  const maisRecentePorId = {}; // id -> {linha, atualizadoEm}
  for (let i = 1; i < dados.length; i++) {
    const id = String(dados[i][0]);
    if (!id) continue;
    const atualizadoEm = dados[i][4] instanceof Date ? dados[i][4].getTime() : 0;
    if (!maisRecentePorId[id] || atualizadoEm > maisRecentePorId[id].atualizadoEm) {
      maisRecentePorId[id] = { linha: i + 1, atualizadoEm: atualizadoEm };
    }
  }
  const linhasParaManter = {};
  Object.keys(maisRecentePorId).forEach(function (id) {
    linhasParaManter[maisRecentePorId[id].linha] = true;
  });
  let removidas = 0;
  for (let i = dados.length; i >= 2; i--) {
    const id = String(dados[i - 1][0]);
    if (id && !linhasParaManter[i]) {
      sheet.deleteRow(i);
      removidas++;
    }
  }
  Logger.log('Linhas duplicadas removidas: ' + removidas);
}
