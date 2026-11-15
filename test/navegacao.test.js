// Navegação 1A, Magias 2A, efeitos de magia, Evolução 3A e "Confira antes de salvar" 3B (15/11/2026).

const h = require('./harness');

(async () => {
  const { window: w } = h.carregarApp();
  const q = (s) => [...w.document.querySelectorAll(s)];
  const q2 = q;
  const texto = () => w.document.body.textContent;
  const lucea = () => h.fichaBase({ id: 'luc', nome: 'Lucéa', raca: 'Lefou', con: 2, int: 5, pmatual: 20, arcanistaCaminho: 'Bruxo',
    classesNiveis: [{ classe: 'Arcanista', nivel: 5 }], poderesClasse: [{ classe: 'Arcanista', nome: 'Familiar', nivel: 2 }],
    magias: [{ n: 'Explosão de Chamas', c: 1, e: 'Evocação', trad: 'Arcana' }, { n: 'Toque Vampírico', c: 2, e: 'Necromancia', trad: 'Arcana' }] });

  h.secao('Barra embaixo e topo de uma linha');
  {
    const f = h.usarFicha(w, lucea());
    w.state.personagemTab = 'ficha'; h.renderizar(w, 'personagem');
    const topo = w.document.querySelector('.topo-compacto');
    h.ok('topo com nome, vida, mana e Defesa', topo && topo.textContent.includes('Lucéa') && topo.textContent.includes('20/') && topo.textContent.includes(String(w.defesaTotal(f))));
    h.ok('as sub-abas antigas saíram', !w.document.querySelector('nav.tabs'));
    q('.barra-baixo button').find((b) => b.textContent.includes('Magias')).click();
    h.ok('Magias na barra abre as magias conhecidas', w.state.tab === 'personagem' && w.state.personagemTab === 'magias' && q('.barra-baixo button.on')[0].textContent.includes('Magias'));
    q('.barra-baixo button').find((b) => b.textContent.includes('Perícias')).click();
    h.igual('Perícias a um toque', w.state.tab, 'pericias');
    h.ok('sem arrastar de lado: só a tela escolhida, sem faixa dupla', !q('[style*="width:200%"]').length && !!w.document.querySelector('.barra-baixo'));
    q('.barra-baixo button').find((b) => b.textContent.includes('Mais')).click();
    h.ok('Mais abre os ladrilhos: Notas, Catálogo, Aprender magias, Evolução, Resumo e Trocar herói', ['Notas', 'Catálogo', 'Aprender magias', 'Evolução', 'Resumo', 'Trocar herói'].every((t) => q('.ladrilho-menu').some((b) => b.textContent.includes(t))));
    h.igual('preferências em quatro chaves', q('.chave-menu').length, 4);
    h.ok('Cuidado começa fechado', !q('.linha-menu.cuidado').length);
    q('.cuidado-menu')[0].click();
    h.ok('abrir Cuidado mostra Desfazer e Descer de nível', q('.linha-menu.cuidado').length === 2);
    q('.ladrilho-menu').find((b) => b.textContent.includes('Evolução')).click();
    h.igual('Evolução pelo Mais', w.state.tab, 'guia');
  }

  h.secao('Magias em linhas e efeito ao lançar');
  {
    const f = h.usarFicha(w, lucea());
    w.state.personagemTab = 'magias'; w.state._cartaMagiaAberta = null; h.renderizar(w, 'personagem');
    h.ok('uma linha só com CD e mana', !!w.document.querySelector('.topo-magias') && w.document.querySelector('.topo-magias').textContent.includes('CD'));
    h.igual('cabeçalhos por círculo', q('.circulo-magias').length, 2);
    const t = (n, e, d) => w.temaDaMagia({ n, e, d });
    h.igual('Explosão de Chamas: fogo', t('Explosão de Chamas', 'Evocação'), 'fogo');
    h.igual('Armadura Arcana: escudo', t('Armadura Arcana', 'Abjuração'), 'escudo');
    h.igual('Conjurar Monstro: pentagrama de invocação', t('Conjurar Monstro', 'Convocação'), 'invocacao');
    h.igual('elemento no texto (frio)', t('Magia X', 'Evocação', 'Causa 4d6 de dano de frio.'), 'frio');
    h.igual('sem elemento: pela escola (Adivinhação = olho)', t('Magia Y', 'Adivinhação', 'Você sabe coisas.'), 'olho');
    w.tocarFeitico(f.magias[1]);
    const fx = w.document.getElementById('feitico');
    h.ok('lançar mostra o efeito com símbolo e nome', fx && fx.classList.contains('tema-vampiro') && !!fx.querySelector('.sigilo-feitico svg') && fx.textContent.includes('Toque Vampírico'));
  }

  h.secao('Evolução: o próximo nível primeiro');
  {
    h.usarFicha(w, lucea());
    w.state.guia = {}; h.renderizar(w, 'guia');
    const cartao = w.document.querySelector('.cartao-prox-nivel');
    h.ok('cartão Nível 5 → 6 com PV e PM do herói', cartao && cartao.textContent.includes('Nível 5 → 6') && cartao.textContent.includes('+4') && cartao.textContent.includes('Con 2') && cartao.textContent.includes('+6'));
    h.ok('próximo marco de círculo', cartao.textContent.includes('Próximo marco: 9º nível'));
    h.ok('o resto começa fechado', !texto().includes('Dica de iniciante') && q('.panel h2').some((x) => x.textContent === 'Poderes que posso escolher'));
  }

  h.secao('Confira antes de salvar');
  {
    const wz = { racaNome: 'Lefou', racaEscolhasAttr: ['int'], rolados: [1, 0, 1, 3, 4, 1], assign: { for: 0, des: 1, con: 2, int: 3, sab: 4, car: 5 }, classeNome: 'Arcanista' };
    const car = w.origemAtributosWizard(wz).find((o) => o.k === 'car');
    h.ok('Carisma 0 = rolado 1 e Lefou −1', car.total === 0 && car.partes.length === 2 && car.partes[1][1] === -1);
    const f = h.usarFicha(w, h.fichaBase({ id: 'io', poderesClasse: [], equip: [
      { tipo: 'geral', item: 'Chapéu arcano', qtd: '1', carga: '0' }, { tipo: 'geral', item: 'Ácido', qtd: '1', carga: '0.5' }] }));
    const d = w.espacoDivergente(f, f.equip[0]);
    h.ok('espaço 0 no Chapéu arcano: o livro diz 1', d && d.livro === 1 && d.digitado === 0);
    h.ok('o que bate com o livro não avisa', !w.espacoDivergente(f, f.equip[1]));
    w.state.personagemTab = 'mochila'; w.state._itensExpandidos = { 'mochila-0': true }; h.renderizar(w, 'personagem');
    const usar = q('.aviso-espaco button')[0];
    h.ok('a Mochila mostra o aviso com conserto', !!usar && usar.textContent === 'usar 1');
    usar.click();
    h.igual('um toque usa o valor do livro', f.equip[0].carga, '1');
    const lv = { classeEscolhida: 'Arcanista', poderModo: 'classe', poderClasseEscolhido: 'Arcano de Batalha' };
    const fl = h.fichaBase({ con: 2, classesNiveis: [{ classe: 'Arcanista', nivel: 5 }] });
    const conf = w.renderConfiraLevelUp(fl, lv).textContent;
    h.ok('Level Up mostra a conta do PV e o poder escolhido', conf.includes('+4 PV (2 da classe + Con +2)') && conf.includes('Arcano de Batalha'));
  }

  h.secao('Aprender magias: vagas, intenção e carta');
  {
    const q = (cn, extra) => w.magiasQuePodeConhecer(h.fichaBase(Object.assign({ classesNiveis: cn }, extra || {}))).total;
    h.igual('Bruxo 5: 3 + 4 = 7', q([{ classe: 'Arcanista', nivel: 5 }], { arcanistaCaminho: 'Bruxo' }), 7);
    h.igual('Feiticeiro 5: 3 + níveis ímpares (3º e 5º) = 5', q([{ classe: 'Arcanista', nivel: 5 }], { arcanistaCaminho: 'Feiticeiro' }), 5);
    h.igual('Mago 5: 4 + 4 + 1 círculo novo = 9', q([{ classe: 'Arcanista', nivel: 5 }], { arcanistaCaminho: 'Mago' }), 9);
    h.igual('Bardo 4: 2 + níveis pares (2º e 4º) = 4', q([{ classe: 'Bardo', nivel: 4 }]), 4);
    h.igual('Clérigo 3 com Conhecimento Mágico: 3 + 2 + 2 = 7', q([{ classe: 'Clérigo', nivel: 3 }], { poderesClasse: [{ classe: 'Clérigo', nome: 'Conhecimento Mágico', nivel: 2 }] }), 7);
    h.ok('quem não conjura não tem conta', w.magiasQuePodeConhecer(h.fichaBase({ classesNiveis: [{ classe: 'Guerreiro', nivel: 3 }] })) === null);

    const f = h.usarFicha(w, lucea());
    Object.assign(w.state.magiaFiltro, { circulo: 'todos', busca: '', intencao: null, _verConhecidas: false });
    h.renderizar(w, 'magias');
    const vagas = w.document.querySelector('.vagas-magia');
    h.ok('topo diz quantas faltam (7 − 2 conhecidas = 5)', vagas && vagas.textContent.includes('Você pode aprender 5 magias'));
    h.ok('círculos em segmentos: 1º, 2º e Todos', q2('.aprender-magias .k-seg button').map((b) => b.textContent).join(',') === '1º,2º,Todos');
    h.ok('as conhecidas ficam recolhidas', !q2('.cat-linha.conhecida').length && texto().includes('2 que você já conhece'));
    const dano = q2('.chip-cat').find((b) => b.textContent.includes('Dano'));
    dano.click();
    h.ok('filtro Dano: só magias de dano', q2('.cat-linha .nm').length > 0 && q2('.cat-linha .nm').every((n) => w.intencaoDaMagia(w.magiasPorTradicao('arcana').find((s) => n.textContent.startsWith(s.n))) === 'dano'));
    w.state.magiaFiltro.intencao = null; h.renderizar(w, 'magias');
    const bola = q2('.cat-abre').find((b) => b.textContent.startsWith('Bola de Fogo'));
    bola.click();
    const carta = w.document.querySelector('.carta-magia');
    h.ok('tocar abre a carta com execução, alcance, duração e PM', carta && carta.textContent.includes('PM') && carta.textContent.includes('execução'));
    h.ok('avisa a parecida que já conhece', texto().includes('Parecida com Explosão de Chamas'));
    q2('.k-gaveta .btn').find((b) => b.textContent.includes('Aprender')).click();
    h.ok('Aprender põe na ficha e a vaga desce', f.magias.some((m) => m.n === 'Bola de Fogo') && w.document.querySelector('.vagas-magia').textContent.includes('aprender 4'));
  }

  h.secao('Catálogo: prateleiras, busca em tudo e antes e depois');
  {
    const f = h.usarFicha(w, h.fichaBase({ id: 'aeon', nome: 'Aeon', classesNiveis: [{ classe: 'Guerreiro', nivel: 5 }], armadura: { nome: 'Cota de malha', def: 6, pen: -2, cat: 'Pesada', esp: 5, equipado: true }, armas: [], equip: [] }));
    w.state.itensFiltro = { tipo: 'inicio', busca: '', categoria: 'todas' };
    h.renderizar(w, 'itens');
    h.igual('seis prateleiras numa linha', q2('.prat-cat').length, 6);
    h.ok('sem busca: Combina com você e a Oficina no fim', texto().includes('Combina com você') && texto().includes('Oficina'));
    w.state.itensFiltro.busca = 'esp'; h.renderizar(w, 'itens');
    const grupos = q2('.grupo-cat').map((g) => g.firstChild.textContent);
    h.ok('a busca acha em mais de uma prateleira', grupos.length >= 2 && grupos.includes('Armas'));
    w.state.itensFiltro.busca = ''; h.renderizar(w, 'itens');
    q2('.prat-cat').find((b) => b.textContent.includes('Defesas')).click();
    const lor = q2('.cat-abre').find((b) => b.querySelector('.nm').textContent.startsWith('Loriga segmentada'));
    h.ok('a linha já mostra Defesa e penalidade', lor.textContent.includes('+7 Defesa') && lor.textContent.includes('pen -3'));
    lor.click();
    const comp = w.document.querySelector('.compara-cat');
    const defA = w.defesaTotal(f);
    h.ok('antes e depois: Defesa sobe 1 trocando a Cota pela Loriga', comp && comp.textContent.includes('Defesa' + defA + '→' + (defA + 1)) && !!comp.querySelector('.melhor'));
    h.ok('diz o que sai', texto().includes('No lugar de: Cota de malha'));
    const antes = f.equip.length;
    q2('.cat-linha').find((l) => l.textContent.includes('Couro batido')).querySelector('.cat-mais').click();
    h.igual('o + guarda na mochila num toque', f.equip.length, antes + 1);
  }

  h.resumo();
})();
