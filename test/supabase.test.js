// Modo Supabase do storage-adapter: login, fichas com versão, Mestre, mapas e link da grade.
// O servidor é simulado: cada teste diz o que a Edge Function responde e confere o que o app
// mandou para ela. Desde a virada o Supabase é o padrão para todo mundo.

const h = require('./harness');

// Servidor falso: guarda cada chamada e responde pelo que estiver em `respostas[acao]`.
function servidorFalso(w) {
  const chamadas = [];
  const respostas = {};
  w.fetch = async (url, init) => {
    const corpo = init && init.body ? JSON.parse(init.body) : {};
    chamadas.push({ url: String(url), corpo, headers: (init && init.headers) || {} });
    let r = respostas[corpo.acao];
    if (typeof r === 'function') r = r(corpo, chamadas);
    r = r || { status: 200, json: { ok: true, dados: {} } };
    return { ok: r.status < 400, status: r.status || 200, json: async () => r.json };
  };
  return { chamadas, respostas, ultima: (acao) => chamadas.filter((c) => c.corpo.acao === acao).pop() };
}
const okDados = (dados) => ({ status: 200, json: { ok: true, dados } });

(async () => {
  // ------------------------------------------------------------ só Supabase
  h.secao('Só existe o Supabase (a planilha saiu)');
  {
    const { window: w } = h.carregarApp();
    h.ok('modo Supabase ligado sem escolher nada', w.usandoSupabase());
    h.ok('"Rola" não abre o Mestre', !w.ehCodigoMestre('Rola'));
    h.igual('o "código" do app é o token da sessão', w.obterCodigoJogador(), 'TESTE-SESSAO');
  }
  {
    const { window: w } = h.carregarApp({ localStorage: { painel_aventureiro_codigo_jogador: 'LOBO-1234', painel_aventureiro_backend: 'planilha' } });
    h.ok('apaga o código de acesso antigo que a planilha guardava em texto puro', w.localStorage.getItem('painel_aventureiro_codigo_jogador') === null);
    h.ok('e a escolha de backend do ensaio', w.localStorage.getItem('painel_aventureiro_backend') === null);
    h.ok('quem tinha ?backend=planilha guardado também usa o Supabase', w.usandoSupabase());
  }

  // ------------------------------------------------------------ tela de login
  h.secao('Tela de entrada no modo Supabase');
  {
    const { window: w } = h.carregarApp({ sessao: null });
    const srv = servidorFalso(w);
    h.ok('modo Supabase ligado', w.usandoSupabase());
    h.ok('sem sessão, pede login', w.precisaCodigoJogador() && !w.obterCodigoJogador());
    w.render();
    const texto = w.document.body.textContent;
    h.ok('pede nome e código', texto.includes('Nome') && texto.includes('Código'));
    h.ok('tem "Sou o Mestre" e "Primeiro acesso"', texto.includes('Sou o Mestre') && texto.includes('Primeiro acesso'));

    srv.respostas.entrar = okDados({ token: 'tok-jog', jogador: { id: 'j1', nome: 'Ana', papel: 'jogador', ehMestre: false } });
    srv.respostas.meusPersonagens = okDados({ personagens: [] });
    w.state._login = { modo: 'jogador', nome: ' Ana ', codigo: 'segredo1', erro: null, carregando: false };
    await w.confirmarLoginSupabase();
    const login = srv.ultima('entrar');
    h.ok('chamou o auth-api com nome e código', login && login.url.endsWith('/functions/v1/auth-api') && login.corpo.nome === 'Ana' && login.corpo.codigo === 'segredo1');
    h.ok('mandou a chave pública', login && login.headers.apikey && login.headers.apikey.startsWith('sb_publishable_'));
    h.igual('guardou a sessão', w.obterCodigoJogador(), 'tok-jog');
    h.igual('foi para a lista de personagens', w.state.screen, 'perfis');
    h.ok('jogador não é Mestre', !w.ehCodigoMestre('tok-jog'));

    srv.respostas.entrar = { status: 401, json: { ok: false, erro: { codigo: 'CREDENCIAL_INVALIDA', mensagem: 'Nome ou código incorreto.' } } };
    w.limparCodigoJogador();
    w.state._login = { modo: 'jogador', nome: 'Ana', codigo: 'errado', erro: null, carregando: false };
    await w.confirmarLoginSupabase();
    h.igual('código errado mostra o erro do servidor', w.state._login.erro, 'Nome ou código incorreto.');
    h.ok('e não guarda sessão', !w.obterSessao());

    srv.respostas.entrarMestre = okDados({ token: 'tok-m', jogador: { id: 'mestre', nome: 'Mestre', papel: 'mestre', ehMestre: true } });
    srv.respostas.todosPersonagens = okDados({ personagens: [] });
    srv.respostas.lerMestreDados = okDados({ dados: { grupos: [], encontrosSalvos: [] } });
    w.state._login = { modo: 'jogador', nome: '  mestre ', codigo: 'segredo-m', erro: null, carregando: false };
    await w.confirmarLoginSupabase();
    h.ok('"Mestre" digitado no campo de nome entra como Mestre', !!srv.ultima('entrarMestre') && srv.ultima('entrarMestre').corpo.codigo === 'segredo-m');
    h.igual('e vai para a tela do Mestre', w.state.screen, 'mestre');
  }

  // ------------------------------------------------------------ fichas
  h.secao('Fichas: carregar e salvar com versão');
  {
    const sessao = { token: 'tok-jog', jogador: { id: 'j1', nome: 'Ana', papel: 'jogador', ehMestre: false } };
    const { window: w } = h.carregarApp({ backend: 'supabase', sessao });
    const srv = servidorFalso(w);
    srv.respostas.meusPersonagens = okDados({ personagens: [{ id: 'p1', nome: 'Heroína', to: 10, equip: [], _versao: 3 }] });
    const lista = await w.carregarPerfisArmazenamento();
    h.ok('leu as fichas com a versão', lista.length === 1 && lista[0]._versao === 3);
    h.igual('mandou o token da sessão', srv.ultima('meusPersonagens').corpo.token, 'tok-jog');

    srv.respostas.salvarPersonagens = okDados({ salvos: [{ id: 'p1', _versao: 4 }], conflitos: [], recusados: [] });
    lista[0].pv = 20;
    await w.salvarPerfisArmazenamento(lista);
    h.igual('enviou a versão que tinha lido', srv.ultima('salvarPersonagens').corpo.personagens[0]._versao, 3);
    h.igual('guardou a versão nova que o servidor devolveu', lista[0]._versao, 4);

    // Conflito: o Mestre mandou 5 TO enquanto isso. Mescla e tenta de novo, sem perder nada.
    let tentativas = 0;
    srv.respostas.salvarPersonagens = (corpo) => {
      tentativas++;
      return tentativas === 1
        ? okDados({ salvos: [], conflitos: ['p1'], recusados: [] })
        : okDados({ salvos: [{ id: 'p1', _versao: corpo.personagens[0]._versao + 1 }], conflitos: [], recusados: [] });
    };
    srv.respostas.meusPersonagens = okDados({ personagens: [{ id: 'p1', nome: 'Heroína', to: 15, equip: [{ item: 'Poção (recebido do Mestre)' }], _versao: 5 }] });
    lista[0].pv = 18;
    await w.salvarPerfisArmazenamento(lista);
    h.igual('em conflito, tentou de novo uma vez', tentativas, 2);
    const segunda = srv.chamadas.filter((c) => c.corpo.acao === 'salvarPersonagens').pop().corpo.personagens[0];
    h.ok('a segunda tentativa leva a edição local e o presente', segunda.pv === 18 && segunda.to === 15 && segunda.equip.some((e) => e.item.includes('Poção')));
    h.igual('e a versão do servidor', segunda._versao, 5);
    h.igual('versão final guardada', lista[0]._versao, 6);
  }

  // ------------------------------------------------------------ enviar item (achado no ensaio)
  h.secao('Jogador envia item: grava a própria ficha sem usar ação de Mestre');
  {
    const sessao = { token: 'tok-jog', jogador: { id: 'j1', nome: 'Max', papel: 'jogador', ehMestre: false } };
    const { window: w } = h.carregarApp({ backend: 'supabase', sessao });
    const srv = servidorFalso(w);
    srv.respostas.enviarItem = okDados({ nomeDestino: 'Ravena' });
    let salvou = 0;
    w.salvarPerfis = async () => { salvou++; };
    const f = h.usarFicha(w, h.fichaBase({ nome: 'Aeon', equip: [{ item: 'Ácido', qtd: '1', tipo: 'geral', carga: '0.5' }] }));
    w.state._enviarItemFluxo = { idx: 0, lista: [{ id: 'p2', nome: 'Ravena', jogador: 'Vanessa' }], carregando: false, enviando: false };
    h.renderizar(w);
    const botao = [...w.document.querySelectorAll('button.presente-avatar')].find((b) => b.textContent.includes('Ravena'));
    h.ok('o popup de envio mostra o destino', !!botao);
    if (botao) {
      botao.click();
      await new Promise((r) => setTimeout(r, 50));
    }
    h.ok('mandou o item pelo enviarItem', !!srv.ultima('enviarItem'));
    h.ok('o item saiu da mochila de quem enviou', f.equip.length === 0);
    h.igual('gravou pelo salvamento normal do jogador', salvou, 1);
    h.ok('não chamou nenhuma ação de Mestre', !srv.ultima('mestreAtualizarPersonagem') && !srv.ultima('todosPersonagens'));
  }

  // ------------------------------------------------------------ sessão vencida
  h.secao('Sessão vencida volta para o login');
  {
    const sessao = { token: 'tok-velho', jogador: { id: 'j1', nome: 'Ana', papel: 'jogador', ehMestre: false } };
    const { window: w } = h.carregarApp({ backend: 'supabase', sessao });
    const srv = servidorFalso(w);
    w.localStorage.setItem('painel_aventureiro_perfis', JSON.stringify([{ id: 'cache' }]));
    srv.respostas.meusPersonagens = { status: 401, json: { ok: false, erro: { codigo: 'NAO_AUTENTICADO', mensagem: 'Faça login.' } } };
    await w.carregarPerfisArmazenamento();
    h.ok('apagou a sessão', !w.obterSessao());
  }

  // ------------------------------------------------------------ Mestre, mapas e grade
  h.secao('Mestre, mapas do Mestre e link da grade');
  {
    const sessao = { token: 'tok-mestre', jogador: { id: 'mestre', nome: 'Mestre', papel: 'mestre', ehMestre: true } };
    const { window: w } = h.carregarApp({ backend: 'supabase', sessao });
    const srv = servidorFalso(w);
    h.ok('o Mestre é reconhecido pelo login', w.ehCodigoMestre('tok-mestre'));
    h.ok('"Rola" não vale nada no Supabase', !w.ehCodigoMestre('Rola'));

    srv.respostas.lerMestreDados = okDados({ dados: { grupos: [{ nome: 'G' }], encontrosSalvos: [] }, _versao: 2 });
    const md = await w.carregarMestreDadosArmazenamento();
    h.ok('Mestre lê os próprios dados', md.grupos[0].nome === 'G' && srv.ultima('lerMestreDados').corpo.token === 'tok-mestre');

    await w.salvarMestreDadosArmazenamento({ grupos: [], encontrosSalvos: [], mapas: [] });
    h.ok('Mestre salva pelo salvarMestreDados', !!srv.ultima('salvarMestreDados'));

    srv.respostas.mapasDoMestre = okDados({ mapas: [{ nome: 'Masmorra' }] });
    const mapas = await w.carregarMapasDoMestre();
    h.ok('mapas do Mestre vêm pela ação própria', mapas.length === 1 && !!srv.ultima('mapasDoMestre'));

    srv.respostas.gerarLinkGrade = okDados({ tokenGrade: 'grade-abc' });
    const t1 = await w.codigoParaLinkDaGrade();
    const t2 = await w.codigoParaLinkDaGrade();
    h.ok('o link usa um token só da grade', t1 === 'grade-abc');
    h.igual('e reaproveita o mesmo token (não derruba o link da mesa)', srv.chamadas.filter((c) => c.corpo.acao === 'gerarLinkGrade').length, 1);
    h.igual('o segundo pedido devolve o mesmo token', t2, 'grade-abc');
  }
  {
    // Quem abriu o link: sem login, só o token da grade.
    const { window: w } = h.carregarApp({ sessao: null });
    const srv = servidorFalso(w);
    srv.respostas.lerGrade = okDados({ combateCompartilhado: { grade: { blocos: {}, posicoes: { a: [1, 1] } }, combatentes: [] } });
    const d = await w.carregarMestreDadosPorCodigo('grade-abc');
    h.ok('o link lê a grade pelo token', d.combateCompartilhado.grade.posicoes.a[0] === 1 && srv.ultima('lerGrade').corpo.tokenGrade === 'grade-abc');
    h.ok('sem mandar token de sessão', srv.ultima('lerGrade').corpo.token === undefined);
    d.combateCompartilhado.grade.posicoes.a = [2, 2];
    d.combateCompartilhado.gradeParaJogadores = { posicoes: { a: [2, 2] } };
    d.grupos = [{ nome: 'não deveria ir' }];
    await w.salvarMestreDadosArmazenamento(d, 'grade-abc');
    const sg = srv.ultima('salvarGrade');
    h.ok('o link salva só a grade e a versão dos jogadores', sg && sg.corpo.grade.posicoes.a[0] === 2 && sg.corpo.gradeParaJogadores && sg.corpo.grupos === undefined && sg.corpo.dados === undefined);
    h.ok('e nunca chama salvarMestreDados', !srv.ultima('salvarMestreDados'));
  }

  h.resumo();
  // O login do Mestre/jogador liga os timers de atualização automática do app; sem isso o node
  // ficaria esperando por eles para sempre.
  process.exit(process.exitCode || 0);
})().catch((e) => { console.error(e); process.exit(1); });
