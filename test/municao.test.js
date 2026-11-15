// Munição contada por unidade e Injeção alquímica (15/11/2026).

const h = require('./harness');

(async () => {
  const { window: w } = h.carregarApp();
  const arco = { nome: 'Arco curto', refBase: 'Arco curto', esp: 2, dano: '1d6', maos: 2, critico: 'x3', alcance: 'Médio', distancia: true, pericia: 'Pontaria' };

  h.secao('Pacote de 20 flechas');
  {
    const f = h.usarFicha(w, h.fichaBase({ id: 'wy', armas: [Object.assign({}, arco)] }));
    const flechas = w.ITENS_GERAIS.find((i) => i.n === 'Flechas (20)');
    w.addItemGeral(flechas);
    h.igual('um pacote entra como 20 flechas', f.equip[0].qtd, '20');
    h.igual('20 flechas ocupam 1 espaço', w.cargaUsada(f), 2 + 1);
    w.addItemGeral(flechas);
    h.ok('outro pacote soma na mesma linha', f.equip.length === 1 && f.equip[0].qtd === '40');
    h.igual('40 flechas ocupam 2 espaços', w.cargaUsada(f), 2 + 2);
    const m = w.municaoDaArma(f, f.armas[0]);
    h.igual('o arco mostra 40 flechas', m && m.qtd, 40);
    w.gastarMunicao(f, m.idx);
    h.igual('disparar gasta uma flecha, não o pacote', f.equip[0].qtd, '39');
    h.igual('39 flechas ainda ocupam 2 espaços', w.cargaUsada(f), 2 + 2);
  }

  h.secao('Fichas antigas');
  {
    const f = h.fichaBase({ id: 'velha', equip: [
      { tipo: 'geral', item: 'Flechas (14)', qtd: '1', carga: '1' },
      { tipo: 'geral', item: 'Flechas (20)', qtd: '2', carga: '1' },
      { tipo: 'geral', item: 'Virotes (20)', qtd: '1', carga: '1' }] });
    w.state.perfis = [f]; w.state.perfilAtualId = f.id;
    w.aplicarMigracoesPerfis();
    const fl = f.equip.find((r) => r.item === 'Flechas (20)');
    h.ok('"Flechas (14)" editado à mão e 2 pacotes viram 54 flechas numa linha', fl && fl.qtd === '54' && f.equip.filter((r) => /Flechas/.test(r.item)).length === 1);
    h.igual('virotes: 1 pacote vira 20', f.equip.find((r) => r.item === 'Virotes (20)').qtd, '20');
    w.aplicarMigracoesPerfis();
    h.igual('a migração roda uma vez só', f.equip.find((r) => r.item === 'Flechas (20)').qtd, '54');
  }

  h.secao('Injeção alquímica');
  {
    const martelo = { nome: 'Martelo de guerra (Injeção alquímica)', refBase: 'Martelo de guerra', esp: 1, dano: '1d8', maos: 1, critico: 'x3', alcance: '—', distancia: false, pericia: 'Luta', superior: true, melhoriasTxt: 'Injeção alquímica: Injeta um preparado (2 doses) automaticamente ao acertar um ataque' };
    const f = h.usarFicha(w, h.fichaBase({ id: 'aeon', for: 5, armas: [martelo], log: [], equip: [
      { tipo: 'geral', item: 'Ácido', qtd: '8', carga: '0.5' }, { tipo: 'geral', item: 'Fogo alquímico', qtd: '1', carga: '0.5' },
      { tipo: 'geral', item: 'Água benta', qtd: '1', carga: '0.5' }, { tipo: 'geral', item: 'Ração de viagem (dia)', qtd: '3', carga: '0.5' }] }));
    const a = f.armas[0];
    h.ok('reconhece a melhoria', w.temInjecao(a));
    h.igual('carrega com preparados e água benta (ração não)', w.preparadosParaInjecao(f).map((x) => x.nome).join(','), 'Ácido,Fogo alquímico,Água benta');
    w.carregarInjecao(f, a, 'Ácido');
    w.carregarInjecao(f, a, 'Fogo alquímico');
    h.ok('duas doses, gastas da mochila', a.injecao.join(',') === 'Ácido,Fogo alquímico' && f.equip.find((r) => r.item === 'Ácido').qtd === '7' && !f.equip.some((r) => r.item === 'Fogo alquímico'));
    w.carregarInjecao(f, a, 'Água benta');
    h.ok('não passa de 2 doses', a.injecao.length === 2 && f.equip.some((r) => r.item === 'Água benta'));
    w.injetarDose(f, a);
    h.ok('acertou: libera a primeira dose e anota o efeito', a.injecao.join(',') === 'Fogo alquímico' && f.log.some((l) => l.texto.startsWith('Injeção alquímica: Ácido no alvo (2d4')));
    w.state.personagemTab = 'ficha'; h.renderizar(w, 'personagem');
    h.ok('a mão mostra as doses', [...w.document.querySelectorAll('.mao .injecao-mini')].some((x) => x.textContent.includes('Fogo alquímico')));
    w.guardarArmaNaMochila(0);
    const linha = f.equip.find((r) => r.tipo === 'arma');
    h.ok('guardar leva as doses junto', linha && linha.injecao && linha.injecao[0] === 'Fogo alquímico');
  }

  h.resumo();
})();
