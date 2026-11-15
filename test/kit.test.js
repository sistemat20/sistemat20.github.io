// Kit (15/11/2026): raça em linhas na criação e passos do Level Up.

const h = require('./harness');

(async () => {
  const { window: w } = h.carregarApp();
  const q = (s) => [...w.document.querySelectorAll(s)];
  const texto = () => w.document.body.textContent;

  h.secao('Criação: raça em linhas');
  {
    w.iniciarWizard();
    const passos = w.passosWizard();
    w.state.wizard.step = passos.indexOf('raca');
    w.render();
    const linhas = () => q('.k-linha');
    h.ok('uma linha por raça, sem os cartões grandes', linhas().length >= 15 && !q('.option-grid .option-card').some((c) => c.textContent.startsWith('Anão')));
    h.ok('atributos em pílulas (Anão: +2 Con e −1 Des)', linhas().find((l) => l.textContent.startsWith('A')) && q('.k-pil.mais').length > 0 && q('.k-pil.menos').length > 0);
    q('.k-pilulas .k-pil').find((b) => b.textContent === '+Int').click();
    h.ok('filtro +Int mostra só quem dá Inteligência (e as de escolha livre)', linhas().every((l) => /\+\d+ Int|à escolha/.test(l.textContent)));
    linhas().find((l) => l.textContent.includes('Elfo')).click();
    h.ok('tocar abre as habilidades numa gaveta', w.state.wizard.racaNome === 'Elfo' && !!w.document.querySelector('.k-gaveta') && w.document.querySelector('.k-gaveta').textContent.includes('Sangue Mágico'));
    linhas().find((l) => l.textContent.includes('Elfo')).click();
    h.ok('tocar de novo fecha', w.state.wizard.racaNome === null);
  }

  h.secao('Level Up: Classe · Poder · Conferir');
  {
    const f = h.usarFicha(w, h.fichaBase({ con: 2, classesNiveis: [{ classe: 'Arcanista', nivel: 5 }] }));
    w.state.tab = 'personagem'; w.state.personagemTab = 'ficha';
    w.abrirLevelUp();
    const seg = () => q('.menu-sheet .k-seg button').map((b) => b.textContent);
    h.ok('sem classe escolhida, ainda não há passos', seg().length === 0);
    q('.menu-sheet .option-card').find((c) => c.textContent.includes('Arcanista')).click();
    h.ok('escolher a classe mostra os passos e vai para o Poder', seg().length === 3 && q('.menu-sheet .k-seg button.on')[0].textContent === 'Poder');
    h.ok('no passo Poder, a lista de classes fica escondida', q('.menu-sheet .option-card').filter((c) => c.textContent.includes('Nível 5 → 6')).every((c) => c.closest('[style*="display: none"]') || c.parentElement.style.display === 'none'));
    q('.menu-sheet button').find((b) => b.textContent === 'Conferir →').click();
    h.ok('Conferir mostra a conta do PV', w.state.levelUp.passo === 'conferir' && texto().includes('+4 PV (2 da classe + Con +2)'));
    q('.menu-sheet .k-seg button').find((b) => b.textContent.includes('Classe')).click();
    h.igual('dá para voltar a um passo tocando nele', w.state.levelUp.passo, 'classe');
    w.state.levelUp = { aberto: false };
  }

  h.secao('Janelas no kit');
  {
    const f = h.usarFicha(w, h.fichaBase({ ts: 30, equip: [] }));
    w.state.tab = 'personagem'; w.state.personagemTab = 'ficha';
    w.state._enviarDinheiroFluxo = { campo: 'ts', valor: '', destinoId: null, lista: [{ id: 'p2', nome: 'Ravena' }], carregando: false, enviando: false };
    h.renderizar(w, 'personagem');
    h.ok('dinheiro: moeda num seletor com T$ escolhido', q('.janela-kit .k-seg button.on')[0].textContent === 'T$');
    const botao = () => q('.janela-kit button.btn:not(.ghost)')[0];
    h.ok('sem valor, o botão pede o valor', botao().disabled && botao().textContent === 'Digite quanto');
    w.state._enviarDinheiroFluxo.valor = '50'; h.renderizar(w, 'personagem');
    h.ok('mais do que tem: avisa no botão', botao().textContent === 'Você tem só 30 T$');
    w.state._enviarDinheiroFluxo.valor = '20'; h.renderizar(w, 'personagem');
    q('.janela-kit button.presente-avatar')[0].click();
    h.ok('com valor e destino: "Enviar 20 T$ para Ravena"', !botao().disabled && botao().textContent === 'Enviar 20 T$ para Ravena');
    w.state._enviarDinheiroFluxo = null;

    w.state._divindadeFluxo = { passo: 'escolher' }; w.state._divindadeExpandida = null; h.renderizar(w, 'personagem');
    const deus = q('.menu-sheet .k-linha')[0];
    h.ok('divindade: um deus por linha com energia e arma', !!deus && deus.textContent.includes('energia'));
    deus.click();
    h.ok('tocar abre a gaveta com "Escolher"', q('.menu-sheet .k-gaveta button').some((b) => b.textContent.startsWith('Escolher ')));
    w.state._divindadeFluxo = null;

    w.state._adicionarParceiroPopup = { categoria: null, tipoEscolhido: null, nome: '', origem: '', poder: 'iniciante', periciasEscolhidas: [] }; h.renderizar(w, 'personagem');
    h.ok('parceiro: passos no alto e três linhas de tipo', q('.menu-sheet .k-seg button').length === 3 && q('.menu-sheet .k-linha').length === 3);
    w.state._adicionarParceiroPopup = null;
  }

  h.resumo();
})();
