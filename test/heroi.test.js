// Herói e Perícias (13/11/2026): boas-vindas, cartão do herói enxuto e perícias compactas.

const h = require('./harness');

(async () => {
  const { window: w } = h.carregarApp();
  const texto = () => w.document.body.textContent;
  const lucea = () => h.fichaBase({ id: 'luc', nome: 'Lucéa', raca: 'Lefou', jogador: 'Stela', origem: 'Eremita', for: 1, des: 1, con: 2, int: 5, sab: 4, car: 0,
    periciasTreinadas: ['Misticismo', 'Intimidação', 'Vontade'], deformidadeEscolhas: [{ tipo: 'tormenta', valor: 'Olhos Vermelhos' }, { tipo: 'pericia', valor: 'Misticismo' }],
    log: [{ ts: Date.now() - 3600e3, texto: 'Recebeu 10 T$ (padrão)' }] });

  h.secao('Seleção: boas-vindas do herói');
  {
    const f = lucea();
    w.state.perfis = [f, h.fichaBase({ id: 'rav', nome: 'Ravena', log: [] })];
    w.state.screen = 'perfis';
    w.render();
    h.ok('abre no herói mais recente', texto().includes('Continuar como Lucéa'));
    h.ok('mostra o patamar e quanto falta', texto().includes('Veterano · nível 5 · 6 para Campeão'));
    h.ok('os outros heróis ficam pequenos', [...w.document.querySelectorAll('.mini-heroi')].some((b) => b.textContent.includes('Ravena')));
    h.ok('tem "Novo herói"', texto().includes('Novo herói'));
  }

  h.secao('Cartão do herói');
  {
    const f = h.usarFicha(w, lucea());
    w.state.tab = 'personagem'; w.state.personagemTab = 'ficha'; w.state._cartaoAberto = null;
    h.renderizar(w, 'personagem');
    h.ok('uma linha de topo com nome e jogadora', !!w.document.querySelector('.topo-heroi') && w.document.querySelector('.sub-heroi').textContent.includes('Stela'));
    h.igual('atributos numa linha de seis', w.document.querySelectorAll('.faixa-attr .fa').length, 6);
    h.ok('o painel Atributos separado saiu', ![...w.document.querySelectorAll('.panel.faixa > h2')].some((x) => x.textContent === 'Atributos'));
    [...w.document.querySelectorAll('.faixa-attr .fa')][3].click();
    h.ok('tocar em INT mostra o que ela mexe', w.document.querySelector('.gaveta-heroi').textContent.includes('Misticismo'));
    h.ok('sem botões de − e +', ![...w.document.querySelectorAll('.gaveta-heroi button')].some((b) => b.textContent === '+' || b.textContent === '−'));
    w.state._cartaoAberto = 'alinhamento';
    h.renderizar(w, 'personagem');
    [...w.document.querySelectorAll('.opc-heroi button')].find((b) => b.textContent === 'Neutro e Bondoso').click();
    h.igual('escolher o alinhamento grava', f.alinhamento, 'Neutro e Bondoso');
    h.ok('a faixa fixa existe fora da trilha de arrastar', !!w.document.querySelector('#root > .faixa-fixa-heroi'));
  }

  h.secao('Perícias compactas');
  {
    const f = h.usarFicha(w, lucea());
    w.state._periciaSituacao = 'Todas'; w.state._periciaBusca = ''; w.state._periciaAberta = null;
    h.renderizar(w, 'personagem');
    const grupos = [...w.document.querySelectorAll('.grupo-pericia')].map((g) => g.firstChild.textContent.split(' ')[0]);
    h.igual('"Todas" separa por atributo, na ordem da ficha', grupos.join(','), 'Força,Destreza,Inteligência,Sabedoria,Carisma');
    const destreza = [...w.document.querySelectorAll('.painel-pericias .linha-pericia')].map((l) => l.querySelector('.nome-pericia').firstChild.textContent);
    const idxA = destreza.indexOf('Acrobacia'), idxF = destreza.indexOf('Furtividade');
    h.ok('ordem alfabética dentro do grupo', idxA >= 0 && idxF > idxA);
    const intim = [...w.document.querySelectorAll('.linha-pericia')].find((l) => l.querySelector('.nome-pericia').firstChild.textContent === 'Intimidação');
    h.ok('estrela depois do nome da treinada', intim.querySelector('.nome-pericia').lastChild.textContent.trim() === '★');
    h.ok('resistências em pílulas', w.document.querySelectorAll('.pilula-res').length === 3);
    h.ok('"só treinada" que ela não tem aparece com cadeado', [...w.document.querySelectorAll('.linha-pericia.trava')].some((l) => l.textContent.includes('Ladinagem')));
    intim.click();
    const aberta = w.document.querySelector('.linha-pericia.aberta');
    h.ok('tocar abre a conta com o Olhos Vermelhos', aberta.textContent.includes('Poderes da Tormenta') && aberta.textContent.includes('Usos:'));
    [...aberta.querySelectorAll('button')].find((b) => b.textContent.includes('Fixar')).click();
    h.ok('fixar grava na ficha', (f.periciasFixadas || []).includes('Intimidação'));
    w.state._periciaSituacao = 'Social';
    h.renderizar(w, 'personagem');
    h.ok('filtro Social mostra só as sociais', !texto().includes('Misticismo +') || [...w.document.querySelectorAll('.painel-pericias .linha-pericia')].every((l) => !l.textContent.includes('Misticismo')));
    w.state._periciaSituacao = 'Todas';
    w.state.personagemTab = 'ficha';
    h.renderizar(w, 'personagem');
    h.ok('a fixada aparece na aba Ficha', !!w.document.querySelector('.fixadas-pericias.na-ficha'));
  }

  h.resumo();
  process.exit(process.exitCode || 0);
})().catch((e) => { console.error(e); process.exit(1); });
