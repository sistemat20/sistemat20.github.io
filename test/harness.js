// Ambiente de teste do Painel do Aventureiro.
//
// Monta um DOM simulado (jsdom), carrega index.html, concatena TODOS os scripts na ordem em que
// o index.html os declara e avalia tudo de uma vez só.
//
// Por que um eval só, com tudo junto: declarações `const` feitas dentro de um eval não ficam
// visíveis para o eval seguinte. Carregando arquivo por arquivo, o segundo script já quebra com
// "PODERES_GERAIS is not defined".
//
// Pelo mesmo motivo, nada declarado lá dentro vira propriedade do window sozinho, então o
// harness reexporta explicitamente o que os testes precisam chamar.

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const RAIZ = path.resolve(__dirname, '..');

// Funções e tabelas que os testes podem chamar de fora. Acrescente aqui ao precisar de outra.
const EXPOSTOS = [
  // cálculo
  'custoPM', 'custoPMAjustado', 'limitePMPorMagia', 'limitePMExtraArcana', 'limitePMExtraPorEscola',
  'defesaTotal', 'penalidadeTotal', 'deslocamentoEfetivo', 'cargaUsada', 'limiteCarga',
  'atributoEfetivo', 'bonusCdArcana', 'cdMagiaEspecifica', 'bonusDefesaEsotericos',
  'esotericosEquipados', 'itensVestidosAtivos', 'efeitosMagicosAtivos', 'itensMagicosEquipadosNomes',
  'nivelTotal', 'poderesAtivos', 'periciaValor', 'PERICIAS', 'qtdPoderesTormenta', 'migrarCargaPocoes', 'addItemMagicoGenerico', 'POCOES_MAGICAS', 'penalidadeCarismaTormenta', 'condicoesAtivas', 'maldicoesAtivas',
  // item superior
  'MELHORIAS', 'MATERIAIS_ESPECIAIS', 'EFEITOS_MAGICOS_AUTOMATICOS',
  'melhoriasDisponiveis', 'melhoriasSubstituidas', 'prereqOkMelhoria', 'calcularItemSuperior',
  'precoMaterialParaCategoria', 'efeitoMaterialParaCategoria', 'montarNomeEMelhoriasTxt',
  'finalizarItemSuperior',
  // mochila nova (13/11/2026)
  'limiteCargaPartes', 'vestirLinha', 'ITENS_GERAIS', 'ARMAS', 'ARMADURAS', 'usarDoCinto', 'infoServePraMim', 'forjarLinhaDaMochila',
  'motivoMelhoriaBloqueada', 'motivoMaterialBloqueado', 'espacoFinalForja', 'essenciasDoCatalogo', 'abrirOficina', 'criarItemDaOficina',
  // estado e telas
  'state', 'render', 'fichaAtual', 'removerItemMochila', 'migrarMelhoriasSubstituidas',
  'aplicarMigracoesPerfis',
  // armazenamento (Supabase)
  'carregarPerfisArmazenamento', 'salvarPerfisArmazenamento', 'carregarTodosPersonagensMestre',
  'mestreAtualizarPersonagem', 'listaLeveDeTodosPersonagens', 'carregarMestreDadosPorCodigo',
  'carregarMestreDadosArmazenamento', 'salvarMestreDadosArmazenamento', 'codigoParaLinkDaGrade',
  'ehCodigoMestre', 'obterCodigoJogador', 'obterSessao', 'usandoSupabase', 'precisaCodigoJogador',
  'limparCodigoJogador', 'confirmarLoginSupabase', 'enviarItemParaOutroPersonagem', 'carregarMapasDoMestre',
  // experiência de jogo
  'separarPresente', 'atmosferaDaFicha', 'renderManaPrevia', 'resumoUltimaSessao', 'fecharResumo',
  'abrirResumoSessao', 'renderMesaAoVivo', 'dadosAnel', 'previaAnel', 'aplicarAnel', 'desfazerAnel',
];

/**
 * Carrega o app num DOM simulado.
 * @returns {{window: object, erros: string[]}} window com o app carregado, e a lista de erros
 *   que o app mandou para console.error (o render() engole exceções, então é por aqui que elas
 *   aparecem).
 */
function carregarApp(opcoes) {
  opcoes = opcoes || {};
  const html = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://example.org/' });
  const w = dom.window;
  const erros = [];

  // Sem sessão toda tela cai no login e o teste falha pelo motivo errado, então por padrão o
  // teste já entra logado como jogador. opcoes.sessao troca a sessão; sessao: null testa o login.
  // opcoes.localStorage põe chaves extras antes de o app carregar.
  w.localStorage.clear();
  Object.entries(opcoes.localStorage || {}).forEach(([k, v]) => w.localStorage.setItem(k, v));
  const sessao = opcoes.sessao === undefined
    ? { token: 'TESTE-SESSAO', jogador: { id: 'teste', nome: 'Teste', papel: 'jogador', ehMestre: false } }
    : opcoes.sessao;
  if (sessao) w.localStorage.setItem('painel_aventureiro_sessao', JSON.stringify(sessao));

  // O jsdom não tem nada disso.
  w.scrollTo = () => {};
  w.alert = () => {};
  w.confirm = () => true;
  w.prompt = () => '';
  w.console.error = (...a) => erros.push(a.map(String).join(' '));
  w.fetch = async (url) => ({
    ok: true,
    json: async () => (String(url).includes('listaJogadores=true') ? { lista: [] } : { personagens: [] }),
    text: async () => '{}',
  });

  const scripts = [...html.matchAll(/src="([^"]+)"/g)].map((m) => m[1]).filter((s) => s.endsWith('.js'));
  const bundle = scripts
    .map((s) => `\n/* ===== ${s} ===== */\n` + fs.readFileSync(path.join(RAIZ, s), 'utf8'))
    .join('\n');
  const reexporta = EXPOSTOS.map((n) => `try{window.${n}=${n};}catch(e){}`).join('');

  w.eval(bundle + '\n;(function(){' + reexporta + '})();');

  // Nos testes não queremos tocar no servidor nem redesenhar sem pedir.
  w.salvarPerfis = () => {};
  w.flashMsg = () => {};

  return { window: w, erros, scripts };
}

/** Põe uma ficha como personagem atual. */
function usarFicha(w, ficha) {
  w.state.perfis = [ficha];
  w.state.perfilAtualId = ficha.id;
  w.state.screen = 'ficha';
  return ficha;
}

/** Ficha mínima e válida, para montar casos de teste em cima. */
function fichaBase(extras) {
  return Object.assign({
    id: 'teste-1', nome: 'Teste', jogador: 'Teste', raca: 'Humano',
    classesNiveis: [{ classe: 'Arcanista', nivel: 5 }],
    for: 0, des: 1, con: 1, int: 4, sab: 0, car: 0,
    pvmax: 30, pvatual: 30, pmmax: 30, pmatual: 30, pvtemp: 0, pmtemp: 0,
    defOutros: 0, deslocamento: 9, tamanho: 'Médio',
    armadura: null, escudo: null, esotericos: [], armas: [], equip: [], magias: [],
    periciasTreinadas: [], poderesClasse: [], historicoNiveis: [], habilidadesIniciais: [],
    arcanistaCaminho: 'Bruxo', log: [], missoes: [], faccoes: [], relacionamentos: [], locais: [],
  }, extras || {});
}

/** Abre todas as seções colapsáveis, senão o corpo delas nem chega ao DOM. */
function abrirTodasAsSecoes(w) {
  w.state._secoesNotasAbertas = new Proxy({}, { get: () => true, set: () => true, has: () => true });
}

/** Renderiza e devolve o texto da tela, estourando se o app caiu na tela de erro. */
function renderizar(w, aba) {
  if (aba) w.state.tab = aba;
  w.render();
  const texto = w.document.body.textContent;
  if (texto.includes('Deu um erro ao montar essa tela')) {
    throw new Error('render() falhou na aba "' + (aba || w.state.tab) + '"');
  }
  return texto;
}

// ---- Asserções bem simples, para não trazer um framework de teste só por isso ----
let _ok = 0;
let _falhas = 0;

function ok(nome, condicao, extra) {
  if (condicao) { _ok++; console.log('  OK   ' + nome + (extra ? '  (' + extra + ')' : '')); }
  else { _falhas++; console.log('FALHA ' + nome + (extra ? '  (' + extra + ')' : '')); }
}

function igual(nome, recebido, esperado) {
  ok(nome, recebido === esperado, 'esperado ' + esperado + ', veio ' + recebido);
}

function secao(titulo) { console.log('\n=== ' + titulo + ' ==='); }

function resumo() {
  console.log('\n' + _ok + ' passaram, ' + _falhas + ' falharam.');
  if (_falhas) process.exitCode = 1;
  return _falhas;
}

const ABAS = ['personagem', 'pericias', 'itens', 'magias', 'guia'];

module.exports = {
  carregarApp, usarFicha, fichaBase, abrirTodasAsSecoes, renderizar,
  ok, igual, secao, resumo, ABAS, RAIZ,
};
