// Mochila e Catálogo (13/11/2026): mochilas vestidas, medalhões, bolsa, cinto, nome limpo,
// catálogo "Serve pra mim", forja com as regras do livro e Oficina de essências.

const h = require('./harness');

(async () => {
  const { window: w } = h.carregarApp();
  const texto = () => w.document.body.textContent;
  const botao = (rotulo, raiz) => [...(raiz || w.document).querySelectorAll('button')].find((b) => b.textContent.trim() === rotulo);

  // ------------------------------------------------------------ mochilas vestidas
  h.secao('Mochila de aventureiro e de carga são itens vestidos');
  {
    const f = h.usarFicha(w, h.fichaBase({ for: 1, equip: [{ tipo: 'geral', item: 'Mochila de aventureiro', qtd: '1', carga: '0' }] }));
    h.igual('guardada não soma', w.limiteCarga(f), 12);
    f.equip[0].vestido = true;
    h.igual('vestida soma +2', w.limiteCarga(f), 14);
    h.igual('e ocupa um medalhão', w.itensVestidosAtivos(f).length, 1);
    f.equip.push({ tipo: 'geral', item: 'Mochila de carga', qtd: '1', carga: '1' });
    w.vestirLinha(f, 1);
    h.ok('vestir a de carga tira a outra das costas', f.equip[1].vestido && !f.equip[0].vestido);
    h.igual('a de carga soma +10', w.limiteCarga(f), 22);
    h.igual('vestida, a mochila não gasta espaço', w.cargaUsada(f), 0);
    h.ok('a conta do limite aparece por extenso', w.limiteCargaPartes(f).some((p) => p.rotulo.includes('Mochila de carga')));
  }
  h.secao('Migração: o upgrade antigo vira a mochila vestida');
  {
    const antiga = h.fichaBase({ id: 'antiga', for: 0, mochilaAventureiroUpgrade: true, equip: [] });
    w.state.perfis = [antiga];
    w.aplicarMigracoesPerfis();
    h.ok('a mochila aparece vestida', antiga.equip.some((r) => r.item === 'Mochila de aventureiro' && r.vestido));
    h.ok('a marca antiga sai', !antiga.mochilaAventureiroUpgrade);
    h.igual('o limite continua com os +2', w.limiteCarga(antiga), 12);
  }

  // ------------------------------------------------------------ medalhões
  h.secao('Medalhões: 4 vestidos com benefício, roupa sem benefício não conta');
  {
    const f = h.usarFicha(w, h.fichaBase({ equip: [
      { tipo: 'geral', item: 'Traje de viajante', qtd: '1', carga: '0', vestido: true, marcadoVestivel: true },
      { tipo: 'geral', item: 'Robe místico (recebido de Ravena)', qtd: '1', carga: '1', vestido: true },
      { tipo: 'geral', item: 'Chapéu arcano', qtd: '1', carga: '1', vestido: true },
      { tipo: 'geral', item: 'Luva de pelica', qtd: '1', carga: '1', vestido: true },
      { tipo: 'geral', item: 'Bandana', qtd: '1', carga: '1', vestido: true },
      { tipo: 'geral', item: 'Gorro de ervas', qtd: '1', carga: '1' },
    ] }));
    h.igual('o traje de viajante não ocupa medalhão', w.itensVestidosAtivos(f).length, 4);
    const mist = w.PERICIAS.find((p) => p.nome === 'Misticismo');
    const semRobe = (() => { const r = f.equip[1]; r.vestido = false; const v = w.periciaValor(f, mist); r.vestido = true; return v; })();
    h.igual('presente vestido não perde o bônus do catálogo', w.periciaValor(f, mist), semRobe + 1);
    w.vestirLinha(f, 5);
    h.ok('não há quinto medalhão', !f.equip[5].vestido);
    w.state.personagemTab = 'ficha';
    h.renderizar(w, 'personagem');
    h.igual('desenha 4 medalhões', w.document.querySelectorAll('.medalhao').length, 4);
    h.ok('mostra a soma do que se veste', w.document.querySelector('.soma-veste').textContent.includes('+1 Misticismo'));
  }

  // ------------------------------------------------------------ mochila por grupos e nome limpo
  h.secao('Mochila por grupos, com nome limpo e selos');
  {
    h.usarFicha(w, h.fichaBase({ equip: [
      { tipo: 'geral', item: 'Essência de mana', qtd: '4', carga: '0.5' },
      { tipo: 'geral', item: 'Barraca (recebido de Lucéa) (recebido de Aeon)', qtd: '1', carga: '1' },
      { tipo: 'esoterico', ref: 'Orbe cristalino', item: 'Orbe cristalino (Energético, Potencializador)', qtd: '1', carga: '1', superior: true, melhoriasTxt: 'x' },
    ] }));
    w.state.personagemTab = 'mochila';
    h.renderizar(w, 'personagem');
    const cabs = [...w.document.querySelectorAll('.secao-moch .cab')].map((c) => c.textContent);
    h.ok('separa Consumíveis e Equipamento', cabs.some((c) => c.startsWith('Consumíveis')) && cabs.some((c) => c.startsWith('Equipamento')));
    h.ok('barra de carga em fatias', w.document.querySelectorAll('.barra-carga span').length >= 2);
    h.ok('o nome perde os parênteses das melhorias', [...w.document.querySelectorAll('.nome-limpo')].some((n) => n.firstChild.textContent === 'Orbe cristalino'));
    h.ok('as melhorias viram selos', [...w.document.querySelectorAll('.selo-item')].some((s) => s.textContent === 'Potencializador'));
    h.ok('presente vira um selo só', [...w.document.querySelectorAll('.selo-presente')].some((s) => s.textContent === 'presente de Aeon'));
    h.ok('não aparece preço', !/T\$\s*\d+[.,]?\d*\s*(·|$)/.test(w.document.querySelector('.secao-moch').textContent));
  }

  // ------------------------------------------------------------ bolsa
  h.secao('Bolsa: só T$, seletor que volta para T$');
  {
    const f = h.usarFicha(w, h.fichaBase({ ts: 100, to: 0, tc: 0 }));
    w.state.personagemTab = 'mochila';
    w.state._bolsa = { valor: '3', moeda: 'to' };
    h.renderizar(w, 'personagem');
    botao('Receber', w.document.querySelector('.painel-bolsa')).click();
    h.igual('3 TO viram T$ 30', f.ts, 130);
    h.ok('o log fica em T$ (o resumo da sessão lê assim)', f.log[0].texto.startsWith('Recebeu 30 T$'));
    h.igual('o seletor volta para T$', w.state._bolsa.moeda, 'ts');
    w.state._bolsa = { valor: '45', moeda: 'ts' };
    h.renderizar(w, 'personagem');
    botao('Gastar', w.document.querySelector('.painel-bolsa')).click();
    h.igual('gastar T$ 45', f.ts, 85);
    w.state._bolsa = { valor: '999', moeda: 'ts' };
    h.renderizar(w, 'personagem');
    botao('Gastar', w.document.querySelector('.painel-bolsa')).click();
    h.igual('não deixa gastar mais do que tem', f.ts, 85);
  }

  // ------------------------------------------------------------ cinto
  h.secao('Cinto: uma tecla para cada resultado do dado');
  {
    const f = h.usarFicha(w, h.fichaBase({ pvatual: 10, pvmax: 30, pmatual: 5, pmmax: 30, equip: [
      { tipo: 'geral', item: 'Poção de Curar Ferimentos (2d8+2 PV)', qtd: '2', carga: '0.5' },
      { tipo: 'geral', item: 'Essência de mana', qtd: '4', carga: '0.5' },
      { tipo: 'geral', item: 'Pó de giz', qtd: '1', carga: '0.5' },
    ] }));
    w.state.personagemTab = 'ficha';
    w.state._cintoAberto = 'Poção de Curar Ferimentos (2d8+2 PV)';
    h.renderizar(w, 'personagem');
    const teclas = [...w.document.querySelectorAll('.gaveta .teclas button')].map((b) => +b.textContent);
    h.igual('Curar Ferimentos 2d8+2: de 4 a 18', teclas[0] + '-' + teclas[teclas.length - 1] + ' (' + teclas.length + ')', '4-18 (15)');
    w.usarDoCinto(f, 'Essência de mana', { recurso: 'pm', dado: '1d4' }, 3);
    h.igual('soma o valor rolado na mana', f.pmatual, 8);
    h.igual('tira 1 da quantidade', f.equip.find((r) => r.item === 'Essência de mana').qtd, '3');
    h.ok('anota no log', f.log[0].texto.includes('+3 PM'));
    w.state._cintoAberto = 'Pó de giz';
    h.renderizar(w, 'personagem');
    botao('Deixar pronto').click();
    h.igual('catalisador fica pronto', w.state._catalisadorPronto, 'Pó de giz');
    w.state._catalisadorPronto = null; w.state._cintoAberto = null;
  }

  // ------------------------------------------------------------ catálogo
  h.secao('Catálogo: "Serve pra mim" e antes e depois, sem preço');
  {
    const f = h.usarFicha(w, h.fichaBase({ magias: [{ n: 'Conjurar Monstro', c: 1, e: 'Convocação', trad: 'Arcana' }] }));
    const robe = w.ITENS_GERAIS.find((i) => i.n === 'Robe místico');
    const info = w.infoServePraMim(f, robe);
    h.ok('o Robe serve (+1 Misticismo)', info && info.marca === '+1 Misticismo');
    h.ok('o Pó de giz serve para quem conhece Conjurar Monstro', w.infoServePraMim(f, w.ITENS_GERAIS.find((i) => i.n === 'Pó de giz')).marca === '−1 PM');
    h.ok('o Musgo púrpura não serve sem magia de ilusão', !w.infoServePraMim(f, w.ITENS_GERAIS.find((i) => i.n === 'Musgo púrpura')));
    w.state.itensFiltro = { tipo: 'gerais', categoria: 'todas', busca: '', serve: true };
    h.renderizar(w, 'itens');
    h.ok('o filtro reduz a lista', texto().includes('itens mudam alguma coisa nesta ficha'));
    h.ok('mostra o contador da Mochila para o voo', !!w.document.querySelector('[data-efx-alvo="mochila"]'));
    w.state.itensFiltro.serve = false;
  }

  // ------------------------------------------------------------ forja
  h.secao('Forja: vestuário e regras do livro');
  {
    const f = h.usarFicha(w, h.fichaBase({ equip: [{ tipo: 'geral', item: 'Robe místico', qtd: '1', carga: '1', vestido: true }] }));
    const mist = w.PERICIAS.find((p) => p.nome === 'Misticismo');
    const antes = w.periciaValor(f, mist);
    w.forjarLinhaDaMochila(f, 0);
    const b = w.state._itemSuperiorBuilder;
    h.igual('o Robe vira vestuário na forja', b.categoria, 'vestuario');
    const nomes = w.melhoriasDisponiveis('vestuario').map((m) => m.nome);
    h.ok('vestuário tem Aprimorado e Discreto, sem Material especial', nomes.includes('Aprimorado') && nomes.includes('Discreto') && !nomes.includes('Material especial'));
    b.melhoriasEscolhidas = ['Aprimorado', 'Banhado a ouro'];
    w.finalizarItemSuperior();
    const robe = f.equip[0];
    h.ok('a peça forjada substitui a antiga e continua vestida', f.equip.length === 1 && robe.superior && robe.vestido);
    h.igual('Aprimorado: Misticismo +1 a mais', w.periciaValor(f, mist), antes + 1);
    const m = (n) => w.MELHORIAS.find((x) => x.nome === n);
    const traje = { categoria: 'vestuario', baseItem: w.ITENS_GERAIS.find((i) => i.n === 'Traje de viajante'), melhoriasEscolhidas: [] };
    h.ok('Aprimorado trava em item que não mexe em perícia', w.motivoMelhoriaBloqueada(m('Aprimorado'), traje).includes('perícia'));
    const espada = { categoria: 'arma', baseItem: w.ARMAS.find((a) => a.n === 'Espada longa'), melhoriasEscolhidas: ['Maciça'] };
    h.ok('Maciça e Precisa não andam juntas', w.motivoMelhoriaBloqueada(m('Precisa'), espada).includes('Maciça'));
    h.ok('Mira telescópica só em arma de disparo', w.motivoMelhoriaBloqueada(m('Mira telescópica'), espada).includes('disparo'));
    const couro = { categoria: 'armaduraLeve', baseItem: w.ARMADURAS[0], melhoriasEscolhidas: [] };
    h.ok('Selada só em armadura pesada', w.motivoMelhoriaBloqueada(m('Selada'), couro).includes('pesada'));
    const tollon = w.MATERIAIS_ESPECIAIS.find((x) => x.nome === 'Madeira Tollon');
    h.ok('Madeira Tollon não vai em espada', !!w.motivoMaterialBloqueado(tollon, espada));
    h.ok('mas vai em bordão', w.motivoMaterialBloqueado(tollon, { categoria: 'arma', baseItem: w.ARMAS.find((a) => a.n === 'Bordão') }) === '');
    h.igual('Discreto tira 1 espaço (mínimo 1)', w.espacoFinalForja({ baseItem: { esp: 2 }, melhoriasEscolhidas: ['Discreto'], materialEscolhido: null }), 1);
    w.state._itemSuperiorBuilder = { categoria: 'arma', baseItem: w.ARMAS.find((a) => a.n === 'Espada longa'), melhoriasEscolhidas: ['Certeira'], materialEscolhido: null, passo: 2 };
    h.renderizar(w, 'itens');
    h.ok('a conta não mostra preço', !texto().includes('Preço') && texto().includes('O valor quem combina é o Mestre'));
    w.state._itemSuperiorBuilder = null;
  }

  // ------------------------------------------------------------ oficina
  h.secao('Oficina de essências');
  {
    const f = h.usarFicha(w, h.fichaBase({ magias: [{ n: 'Transmutar Objetos', c: 1, e: 'Transmutação', trad: 'Arcana' }] }));
    const ess = w.essenciasDoCatalogo(w.ITENS_GERAIS.find((i) => i.n === 'Seixo de âmbar'));
    h.ok('o Seixo de âmbar dá −1 PM em Transmutação', ess[0].tipo === 'magia_custo' && ess[0].valor === -1 && ess[0].escola === 'Transmutação');
    w.abrirOficina();
    const o = w.state._itemPersonalizadoPopup;
    o.forma = 'vestido'; o.nome = 'Manto do Âmbar';
    o.essencias = [...ess, ...w.essenciasDoCatalogo(w.ITENS_GERAIS.find((i) => i.n === 'Robe místico'))];
    h.renderizar(w, 'personagem');
    h.ok('a oficina abre com as essências orbitando', w.document.querySelectorAll('.orbe').length === 2);
    h.ok('mostra onde cada essência age', texto().includes('Grimório') && texto().includes('Perícias'));
    w.criarItemDaOficina(f);
    const manto = f.equip.find((r) => r.item === 'Manto do Âmbar');
    h.ok('o item nasce na mochila, vestível, com as essências', !!manto && manto.marcadoVestivel && manto.essencias.length === 2);
    const magia = f.magias[0];
    const custoAntes = w.custoPMAjustado(f, magia);
    manto.vestido = true;
    h.igual('vestido, o custo da transmutação cai', w.custoPMAjustado(f, magia), Math.max(1, custoAntes - 1));
    const mist = w.PERICIAS.find((p) => p.nome === 'Misticismo');
    manto.vestido = false; const semManto = w.periciaValor(f, mist); manto.vestido = true;
    h.igual('e o Misticismo sobe 1', w.periciaValor(f, mist), semManto + 1);
    h.ok('o log registra', f.log[0].texto.includes('Criou item personalizado: Manto do Âmbar'));
    const velho = h.fichaBase({ id: 'velho', equip: [{ tipo: 'geral', item: 'Anel', qtd: '1', carga: '0', efeitoCustom: { tipo: 'bonusPericia', pericia: 'Furtividade', valor: 2 } }] });
    w.state.perfis = [velho];
    w.aplicarMigracoesPerfis();
    h.ok('o efeito único antigo vira essência', velho.equip[0].essencias[0].pericia === 'Furtividade' && !velho.equip[0].efeitoCustom);
  }

  h.resumo();
  process.exit(process.exitCode || 0);
})().catch((e) => { console.error(e); process.exit(1); });
