// Fichas reais da mesa, anonimizadas (test/fixtures/herois-anonimos.json): abre todas as telas,
// itens, gavetas e janelas sem erro e compara os números principais com a "foto" guardada em
// test/fixtures/fichas-reais-esperado.json. Mudou um número de propósito? Rode com
// ATUALIZAR=1 (node test/fichas-reais.test.js) para guardar a foto nova e confira a diferença no git.

const fs = require('fs');
const path = require('path');
const h = require('./harness');

const RAIZ = path.resolve(__dirname, 'fixtures');
const herois = JSON.parse(fs.readFileSync(path.join(RAIZ, 'herois-anonimos.json'), 'utf8'));
const arqEsperado = path.join(RAIZ, 'fichas-reais-esperado.json');

(async () => {
  const { window: w } = h.carregarApp();
  const q = (s) => [...w.document.querySelectorAll(s)];
  const foto = {};

  herois.forEach((original) => {
    const f = JSON.parse(JSON.stringify(original));
    w.state.perfis = [f]; w.state.perfilAtualId = f.id; w.state.screen = 'ficha';
    w.aplicarMigracoesPerfis();
    h.secao(f.nome.trim() + ' (' + f.classesNiveis.map((c) => c.classe + ' ' + c.nivel).join('/') + ')');
    let telas = 0, erros = [];
    const abrir = (tab, sub, extra) => {
      w.state.tab = tab; if (sub) w.state.personagemTab = sub; if (extra) extra();
      try { h.renderizar(w, tab); telas++; } catch (e) { erros.push(tab + '/' + (sub || '') + ': ' + e.message); }
    };
    w.state._secoesNotasAbertas = new Proxy({}, { get: () => true, set: () => true, has: () => true });
    abrir('personagem', 'ficha', () => { w.state._defesaAberta = f.id; w.state._maoAberta = 0; w.state._condAberto = true; });
    q('.emjogo .ej:not(.modo)').slice(0, 3).forEach((b) => { b.click(); telas++; });
    abrir('personagem', 'magias');
    q('.linha-magia').slice(0, 2).forEach((b) => { b.click(); telas++; });
    abrir('personagem', 'mochila');
    (f.equip || []).forEach((_, idx) => abrir('personagem', 'mochila', () => { w.state._itensExpandidos = { ['mochila-' + idx]: true }; }));
    abrir('personagem', 'notas', () => { w.state._notasParte = 'regras'; });
    abrir('personagem', 'notas', () => { w.state._notasParte = 'campanha'; });
    ['pericias', 'itens', 'magias', 'guia'].forEach((t) => abrir(t));
    abrir('personagem', 'ficha', () => { w.state._logAberto = true; });
    w.state._logAberto = false;
    abrir('personagem', 'ficha', () => { w.state._pendenciasAberto = true; });
    w.state._pendenciasAberto = false;
    abrir('personagem', 'ficha', () => { w.abrirLevelUp && (w.state.levelUp = { aberto: true, modoClasse: 'existente', classeEscolhida: f.classesNiveis[0].classe }); });
    w.state.levelUp = { aberto: false };
    h.ok('abriu ' + telas + ' telas, itens e gavetas sem erro', erros.length === 0, erros.slice(0, 3).join(' | '));

    foto[f.id] = {
      defesa: w.defesaTotal(f), carga: w.cargaUsada(f), limiteCarga: w.limiteCarga(f),
      emJogo: w.poderesEmJogo(f).map((p) => p.chaveBase + (p.custo ? ' ' + p.custo + 'PM' : '') + (p.opcoes ? ' ' + p.opcoes.join('/') + 'PM' : '')).concat(w.parceirosEmJogo(f).map((x) => x.tipo + ':' + (x.custos || []).join('/'))),
      temasMagia: (f.magias || []).map((m) => w.temaDaMagia(m)),
      vestidosAtivos: w.itensVestidosAtivos(f).length,
    };
  });

  if (process.env.ATUALIZAR) {
    fs.writeFileSync(arqEsperado, JSON.stringify(foto, null, 1) + '\n');
    console.log('\nFoto nova guardada em ' + arqEsperado);
  } else {
    const esperado = JSON.parse(fs.readFileSync(arqEsperado, 'utf8'));
    h.secao('Números iguais aos guardados');
    Object.keys(foto).forEach((id) => {
      ['defesa', 'carga', 'limiteCarga', 'emJogo', 'temasMagia', 'vestidosAtivos'].forEach((k) => {
        h.igual(id + ' · ' + k, JSON.stringify(foto[id][k]), JSON.stringify((esperado[id] || {})[k]));
      });
    });
  }
  h.resumo();
})();
