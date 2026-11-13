// Experiência de jogo (js/experiencia.js): atmosfera, presente, grimório, resumo da sessão e
// mesa ao vivo. Nada disso muda regra; os testes conferem o que aparece e quando.

const h = require('./harness');

const HORA = 60 * 60 * 1000;

(async () => {
  const { window: w } = h.carregarApp();
  const texto = () => w.document.body.textContent;

  // ------------------------------------------------------------ presente
  h.secao('Presente: selo no lugar do texto grudado no nome');
  {
    const a = w.separarPresente('Casaco longo (recebido de Ravena) (recebido de Emival de Gomarca )');
    h.igual('nome base sem as marcas', a.base, 'Casaco longo');
    h.igual('selo mostra quem mandou por último', a.de, 'Emival de Gomarca');
    h.igual('presente do Mestre', w.separarPresente('Poção (recebido do Mestre)').de, 'do Mestre');
    h.igual('item comum fica igual', w.separarPresente('Corda').base, 'Corda');
    h.ok('item comum sem selo', w.separarPresente('Corda').de === null);
  }

  // ------------------------------------------------------------ atmosfera
  h.secao('Atmosfera: a ficha sente a condição');
  {
    const base = { pvatual: 30, pvmax: 30 };
    h.igual('Abalado treme a ficha', (w.atmosferaDaFicha(h.fichaBase(Object.assign({ condicoesAtivas: ['Abalado'] }, base))) || {}).classe, 'atm-abalado');
    h.igual('Envenenado sobe a névoa', (w.atmosferaDaFicha(h.fichaBase(Object.assign({ condicoesAtivas: ['Envenenado'] }, base))) || {}).camada, 'atm-veneno');
    h.igual('Fatigado escurece', (w.atmosferaDaFicha(h.fichaBase(Object.assign({ condicoesAtivas: ['Fatigado'] }, base))) || {}).camada, 'atm-fadiga');
    h.igual('vida em 25% pulsa', (w.atmosferaDaFicha(h.fichaBase({ pvatual: 7, pvmax: 30 })) || {}).camada, 'atm-fio');
    h.ok('sem condição e vida cheia: nada', w.atmosferaDaFicha(h.fichaBase(base)) === null);
    h.ok('caído (0 PV) fica com a vinheta de sempre, sem somar outra', w.atmosferaDaFicha(h.fichaBase({ pvatual: 0, pvmax: 30 })) === null);
    w.localStorage.setItem('painel_aventureiro_atmosfera', 'off');
    h.ok('desligado no Menu: nada', w.atmosferaDaFicha(h.fichaBase(Object.assign({ condicoesAtivas: ['Abalado'] }, base))) === null);
    w.localStorage.removeItem('painel_aventureiro_atmosfera');

    h.usarFicha(w, h.fichaBase({ condicoesAtivas: ['Envenenado'] }));
    w.state.personagemTab = 'ficha';
    h.renderizar(w, 'personagem');
    h.ok('a camada de névoa aparece na ficha', !!w.document.querySelector('.atm-camada.atm-veneno'));
  }

  // ------------------------------------------------------------ grimório
  h.secao('Grimório: cartas e prévia de mana');
  {
    const f = h.usarFicha(w, h.fichaBase({
      pmatual: 2,
      magias: [
        { n: 'Bênção', c: 1, e: 'Encantamento', trad: 'Arcana', alcance: 'curto', resistencia: '', d: 'Abençoa seus aliados, que recebem +1 em testes de ataque e rolagens de dano.', aprim: [{ custo: '+2 PM', efeito: 'aumenta os bônus em +1.' }] },
        { n: 'Bola de Fogo', c: 3, e: 'Evocação', trad: 'Arcana', alcance: 'médio', resistencia: 'Reflexos reduz à metade' },
      ],
    }));
    w.state.personagemTab = 'magias';
    h.renderizar(w, 'personagem');
    const cartas = [...w.document.querySelectorAll('.grimorio-carta')];
    h.igual('uma carta por magia', cartas.length, 2);
    h.ok('a que custa mais que a mana fica apagada', cartas[1].classList.contains('sem-mana') && !cartas[0].classList.contains('sem-mana'));
    h.ok('a carta fechada é a de tarô: nome, escola e custo, sem o texto', cartas[0].textContent.includes('Bênção') && cartas[0].textContent.includes('1 PM') && !cartas[0].textContent.includes('Abençoa seus aliados'));
    h.igual('sem a lista antiga duplicada embaixo', w.document.querySelectorAll('.spell-card').length, 0);
    h.ok('nada de rolagem lateral (o arrastar de lado é das Perícias)', !w.document.querySelector('.grimorio-cartas'));
    cartas[0].click();
    h.renderizar(w, 'personagem');
    const aberta = w.document.querySelector('.grimorio-carta.aberta');
    h.ok('tocar abre a carta inteira', !!aberta && aberta.textContent.includes('Execução') && aberta.textContent.includes('aumenta os bônus'));
    h.ok('a carta aberta tem a mesa de lançamento com a mana listrada', !!aberta.querySelector('.mesa-lancamento .mana-previa'));
    h.ok('custo maior que a mana fica marcado como insuficiente', w.renderManaPrevia(f, 6).classList.contains('insuficiente') && w.renderManaPrevia(f, 6).textContent.includes('falta 4 PM'));
    h.ok('custo que cabe mostra quanto sobra', w.renderManaPrevia(f, 1).textContent.includes('→ 1'));
    // selo de aprimoramento soma ao custo
    aberta.querySelector('.selo-aprim').click();
    h.renderizar(w, 'personagem');
    const botaoLancar = () => [...w.document.querySelectorAll('.grimorio-carta.aberta .acoes button')].find((b) => /Lançar|Falta mana/.test(b.textContent));
    h.ok('ligar o selo soma o aprimoramento (1 + 2 PM)', botaoLancar().textContent.includes('3 PM') && w.document.querySelector('.selo-aprim.ativo'));
    h.ok('sem mana para o total, o botão avisa', botaoLancar().textContent.includes('Falta mana'));
    w.document.querySelector('.selo-aprim.ativo').click();
    h.renderizar(w, 'personagem');
    botaoLancar().click();
    h.igual('Lançar desconta a mana na hora', f.pmatual, 1);
    h.ok('e anota no log como o popup anota', f.log[0].texto === 'Usou "Bênção" (-1 PM)');
    h.ok('a carta sobe (animação de lançamento)', !!w.state._magiaLancada && w.state._magiaLancada.nome === 'Bênção');
    h.renderizar(w, 'personagem');
    h.ok('a barra escoa do valor de antes', !!w.document.querySelector('.mana-previa .resta.escoando'));
    h.ok('e a linha do log aparece na carta', w.document.querySelector('.log-lancamento').textContent.includes('Lançou "Bênção"'));
    h.ok('não existe mais o botão Mais opções', ![...w.document.querySelectorAll('.grimorio-carta.aberta button')].some((x) => x.textContent === 'Mais opções'));
    h.ok('sem o poder, nada de selo de Magia Pungente', !w.document.querySelector('.grimorio-carta.aberta').textContent.includes('Magia Pungente'));
    h.ok('mostra o limite por magia', w.document.querySelector('.mesa-linha').textContent.includes('Limite por magia'));

    const confirmar = w.confirm;
    w.confirm = () => true;
    h.renderizar(w, 'personagem');
    w.document.querySelector('.grimorio-carta.aberta .esquecer').click();
    h.ok('Esquecer remove a magia (com confirmação)', f.magias.length === 1 && f.magias[0].n === 'Bola de Fogo');
    w.confirm = confirmar;
  }

  h.secao('Grimório: Magia Pungente, catalisador, custo à mão e limite na própria carta');
  {
    const f = h.usarFicha(w, h.fichaBase({
      pmatual: 20,
      poderesClasse: [{ nome: 'Magia Pungente', classe: 'Arcanista', nivel: 2 }],
      equip: [{ item: 'Musgo púrpura', qtd: '2', tipo: 'geral', carga: '0.5' }],
      magias: [{ n: 'Imagem Espelhada', c: 1, e: 'Ilusão', trad: 'Arcana', alcance: 'pessoal', resistencia: 'Vontade desacredita', d: 'Cópias ilusórias suas aparecem.', aprim: [{ custo: '+1 PM', efeito: 'mais uma cópia.' }] }],
    }));
    w.state.personagemTab = 'magias';
    w.state._cartaMagiaAberta = 'Imagem Espelhada';
    w.state._grimorioSel = null; w.state._grimorioUltimo = null;
    h.renderizar(w, 'personagem');
    const carta = () => w.document.querySelector('.grimorio-carta.aberta');
    const selo = (txt) => [...carta().querySelectorAll('.selo-aprim')].find((b) => b.textContent.includes(txt));
    const lancar = () => [...carta().querySelectorAll('.acoes button')][0];
    h.ok('quem tem o poder vê o selo de Magia Pungente', !!selo('Magia Pungente'));
    h.ok('o catalisador da mochila que serve para a escola aparece', !!selo('Musgo púrpura'));
    const cdAntes = w.cdMagiaEspecifica(f, f.magias[0]);
    selo('Magia Pungente').click(); h.renderizar(w, 'personagem');
    h.ok('Pungente soma 1 PM no custo', lancar().textContent.includes('2 PM'));
    h.ok('e +2 na CD mostrada', carta().querySelector('.mesa-linha').textContent.includes('CD ' + (cdAntes + 2)));
    selo('Musgo púrpura').click(); h.renderizar(w, 'personagem');
    h.ok('catalisador de CD soma mais 2', carta().querySelector('.mesa-linha').textContent.includes('CD ' + (cdAntes + 4)));
    const campo = carta().querySelector('.custo-mao input');
    campo.value = '5'; campo.dispatchEvent(new w.Event('change', { bubbles: true }));
    h.renderizar(w, 'personagem');
    h.ok('custo à mão muda o botão', lancar().textContent.includes('5 PM') && carta().textContent.includes('voltar ao calculado'));
    campo.value = '99'; carta().querySelector('.custo-mao input').value = '99';
    carta().querySelector('.custo-mao input').dispatchEvent(new w.Event('change', { bubbles: true }));
    h.renderizar(w, 'personagem');
    h.ok('passar do limite por magia avisa no botão', lancar().textContent.includes('Passa do limite') && !!carta().querySelector('.mesa-linha .alerta'));
    [...carta().querySelectorAll('button')].find((b) => b.textContent.includes('voltar ao calculado')).click();
    h.renderizar(w, 'personagem');
    lancar().click();
    h.igual('lança com Pungente e catalisador pelo custo calculado', f.pmatual, 18);
    h.ok('o log registra os dois', f.log[0].texto.includes('Magia Pungente') && f.log[0].texto.includes('Musgo púrpura'));
    h.igual('o catalisador sai da mochila', f.equip[0].qtd, '1');
  }

  h.secao('Deformidade (Lefou): conta como poder da Tormenta, mas não tira Carisma');
  {
    // Caso da Lucéa (relato da Stela): Lefou nível 5, Car 0, Intimidação treinada, Deformidade
    // trocada por Olhos Vermelhos (+1 Intimidação) e +2 em Misticismo. O certo é +5.
    const f = h.usarFicha(w, h.fichaBase({
      raca: 'Lefou', car: '0', periciasTreinadas: ['Intimidação', 'Misticismo'],
      deformidadeEscolhas: [{ tipo: 'tormenta', valor: 'Olhos Vermelhos' }, { tipo: 'pericia', valor: 'Misticismo' }],
    }));
    const per = (n) => w.periciaValor(f, w.PERICIAS.find((p) => p.nome === n));
    h.igual('poder trocado na Deformidade não tira Carisma', w.atributoEfetivo(f, 'car'), 0);
    h.igual('Intimidação da Lucéa = 2 + 0 + 2 + 1 (Olhos Vermelhos)', per('Intimidação'), 5);
    h.igual('os dois bônus da Deformidade contam como poderes da Tormenta', w.qtdPoderesTormenta(f), 2);
    f.poderGeral = { nome: 'Antenas', sub: null };
    h.igual('um poder da Tormenta de fora da Deformidade tira 1 de Carisma', w.penalidadeCarismaTormenta(f), 1);
    h.igual('e Olhos Vermelhos escala com os outros dois (+2)', per('Intimidação'), 2 + (-1) + 2 + 2);
  }

  h.secao('Carga: poções em meio espaço e Inventário Organizado em 1/4');
  {
    // Relato da Stela (12/11/2026), Livro Básico pág. 130 e "Limites de Carga".
    const f = h.usarFicha(w, h.fichaBase({
      equip: [
        { item: 'Poção de Curar Ferimentos (2d8+2 PV)', qtd: '2', tipo: 'geral', carga: '1' },
        { item: 'Essência de mana', qtd: '4', tipo: 'geral', carga: '0.5' },
        { item: 'Casaco longo', qtd: '1', tipo: 'geral', carga: '1' },
      ],
    }));
    w.migrarCargaPocoes();
    h.igual('poção salva com 1 espaço volta para meio', f.equip[0].carga, '0.5');
    h.igual('item comum de 1 espaço não muda', f.equip[2].carga, '1');
    h.igual('2 poções + 4 essências + casaco = 4 espaços', w.cargaUsada(f), 4);
    f.poderesClasse = [{ nome: 'Inventário Organizado', classe: 'Arcanista', nivel: 4, trocaPorGeral: true }];
    h.igual('com Inventário Organizado, meio espaço vira 1/4: 6 × 0,25 + 1', w.cargaUsada(f), 2.5);
    f.equip = [];
    w.addItemMagicoGenerico('Poção de Compreensão', w.POCOES_MAGICAS.find((p) => p.nome === 'Poção de Compreensão').esp);
    h.igual('poção nova do catálogo entra com meio espaço', f.equip[0].carga, '0.5');
    f.poderesClasse = [];
    f.equip = [{ item: 'Poção de Área Escorregadia (granada)', qtd: '2', tipo: 'geral', carga: '0,5' }];
    h.igual('carga digitada com vírgula conta (0,5 × 2 = 1)', w.cargaUsada(f), 1);
  }

  h.secao('Grimório: catalisadores que diminuem o custo (Seixo de âmbar, Pó de giz, Pó de cristal)');
  {
    const f = h.usarFicha(w, h.fichaBase({
      pmatual: 20,
      equip: [{ item: 'Seixo de âmbar', qtd: '1', tipo: 'geral', carga: '0.5' }, { item: 'Pó de giz', qtd: '2', tipo: 'geral', carga: '0.5' }],
      magias: [{ n: 'Transmutar Objetos', c: 1, e: 'Transmutação', trad: 'Arcana', alcance: 'toque', resistencia: '', d: 'Molda um objeto.', aprim: [{ custo: '+2 PM', efeito: 'objeto maior.' }] }],
    }));
    w.state.personagemTab = 'magias';
    w.state._cartaMagiaAberta = 'Transmutar Objetos';
    w.state._grimorioSel = null; w.state._grimorioUltimo = null;
    h.renderizar(w, 'personagem');
    const carta = () => w.document.querySelector('.grimorio-carta.aberta');
    const selo = (txt) => [...carta().querySelectorAll('.selo-aprim')].find((b) => b.textContent.includes(txt));
    const lancar = () => [...carta().querySelectorAll('.acoes button')][0];
    h.ok('o Seixo de âmbar aparece na magia de transmutação', !!selo('Seixo de âmbar'));
    h.ok('o Pó de giz (convocação) não aparece aqui', !selo('Pó de giz'));
    selo('objeto maior').click(); h.renderizar(w, 'personagem');
    h.ok('sem o seixo: 1 + 2 = 3 PM', lancar().textContent.includes('3 PM'));
    selo('Seixo de âmbar').click(); h.renderizar(w, 'personagem');
    h.ok('com o seixo: 2 PM', lancar().textContent.includes('2 PM'));
    lancar().click();
    h.igual('desconta 2 PM', f.pmatual, 18);
    h.ok('o log registra o seixo', f.log[0].texto.includes('Seixo de âmbar (-1 PM)'));
    h.ok('o seixo sai da mochila', !f.equip.some((r) => r.item === 'Seixo de âmbar'));
  }

  // ------------------------------------------------------------ anéis de vida e mana
  h.secao('Anéis de vida e mana');
  {
    const f = h.usarFicha(w, h.fichaBase({ pvatual: 30, pvmax: 30, pmatual: 10, pmmax: 30, pvtemp: 0, pmtemp: 0 }));
    w.state.personagemTab = 'ficha';
    h.renderizar(w, 'personagem');
    const aneis = w.document.querySelectorAll('.anel-caixa');
    h.igual('dois anéis: vida e mana', aneis.length, 2);
    h.ok('sem os botões antigos de vida/mana', !w.document.querySelector('.stat-tracker'));
    const d = w.dadosAnel(f, 'pv');
    const p1 = w.previaAnel(Object.assign({}, d, { temp: 8 }), 'base', -12);
    h.ok('dano tira do temporário primeiro', p1.temp === 0 && p1.atual === d.atual - 4);
    h.igual('cura não passa do máximo', w.previaAnel(d, 'base', 50).atual, d.max);
    h.igual('girar por fora mexe só no temporário', w.previaAnel(d, 'temp', 5).temp, 5);
    w.aplicarAnel(f, 'pv', 'temp', 6);
    h.igual('aplica o temporário', f.pvtemp, 6);
    w.aplicarAnel(f, 'pv', 'base', -10);
    h.ok('aplica o dano com o temporário absorvendo', f.pvtemp === 0 && f.pvatual === d.atual - 4);
    h.ok('anota as duas partes no log', f.log[0].texto.includes('PV (') && f.log[1].texto.includes('PV temporário'));
    w.desfazerAnel(f);
    h.ok('segurar o centro desfaz a última mudança', f.pvtemp === 6 && f.pvatual === d.atual);
    h.renderizar(w, 'personagem');
    const anelPm = w.document.querySelectorAll('.anel-caixa')[1];
    anelPm.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    h.igual('teclado: seta para a esquerda tira 1 de mana', f.pmatual, 9);
    h.renderizar(w, 'personagem');
    w.document.querySelectorAll('.anel-caixa')[1].dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowRight', altKey: true, bubbles: true }));
    h.igual('teclado: Alt + seta mexe no temporário', f.pmtemp, 1);
    h.ok('o anel anima a partir do valor anterior', !!w.document.querySelector('.anel-temp.anima, .anel-base.anima'));
  }

  // ------------------------------------------------------------ resumo da sessão
  h.secao('Resumo da última sessão');
  {
    const agora = Date.now();
    const sessao = agora - 30 * HORA; // a última sessão foi ontem
    const log = [
      { ts: sessao, texto: 'Usou "Voz Divina" com 1 aprimoramento(s) (-4 PM)' },
      { ts: sessao - 10 * 60000, texto: 'Usou "Voz Divina" (-3 PM)' },
      { ts: sessao - 20 * 60000, texto: 'Usou "Comando" (-1 PM)' },
      { ts: sessao - 30 * 60000, texto: '-5 PV (30 → 25)' },
      { ts: sessao - 31 * 60000, texto: '+3 PV (25 → 28)' },
      { ts: sessao - 40 * 60000, texto: 'Gastou 200 T$ (padrão)' },
      { ts: sessao - 50 * 60000, texto: 'Ganhou um parceiro: Salem (Vigilante, iniciante)' },
      { ts: sessao - 10 * HORA, texto: 'Usou "Bênção" (-1 PM)' }, // sessão anterior: fica de fora
    ];
    const f = h.fichaBase({ id: 'resumo-1', log, ts: 1349, magias: [{ n: 'Voz Divina', c: 2, e: 'Adivinhação', trad: 'Divina', d: 'Você pode conversar com criaturas de qualquer raça e tipo. Mais texto.' }] });
    const r = w.resumoUltimaSessao(f);
    const tipos = r.slides.map((s) => s.tipo).join(',');
    h.igual('slides montados do log', tipos, 'abertura,magia,favorita,vida,bolsa,marcos,volta');
    const magia = r.slides.find((s) => s.tipo === 'magia');
    h.ok('conta magias e PM só da última sessão', magia.lancamentos === 3 && magia.pm === 8);
    h.igual('favorita é a mais usada', r.slides.find((s) => s.tipo === 'favorita').nome, 'Voz Divina');
    const vida = r.slides.find((s) => s.tipo === 'vida');
    h.ok('soma dano e cura', vida.dano === 5 && vida.cura === 3);
    h.igual('bolsa', r.slides.find((s) => s.tipo === 'bolsa').saldo, -200);

    h.usarFicha(w, f);
    w.state.personagemTab = 'ficha';
    h.renderizar(w, 'personagem');
    h.ok('abre sozinho ao entrar na ficha depois da sessão', !!w.state._resumo && !!w.document.querySelector('.resumo-sessao'));
    w.fecharResumo();
    h.ok('fechar guarda que já foi visto', w.localStorage.getItem('painel_aventureiro_resumo_visto_resumo-1') === String(r.fim));
    w.state._resumoChecado = {};
    h.renderizar(w, 'personagem');
    h.ok('não abre de novo a mesma sessão', !w.state._resumo);

    const fRecente = h.fichaBase({ id: 'resumo-2', log: log.map((e) => ({ ts: agora - (sessao - e.ts) - 10 * 60000, texto: e.texto })) });
    w.state._resumoChecado = {};
    h.usarFicha(w, fRecente);
    h.renderizar(w, 'personagem');
    h.ok('sessão ainda em andamento: não interrompe', !w.state._resumo);
    w.abrirResumoSessao(fRecente);
    h.ok('pelo Menu abre quando quiser', !!w.state._resumo);
    w.state._resumo = null;
  }

  // ------------------------------------------------------------ mesa ao vivo
  h.secao('Mesa ao vivo (Mestre)');
  {
    const agora = Date.now();
    w.state.perfisTodos = [
      h.fichaBase({ id: 'p1', nome: 'Ravena', pvatual: 30, pvmax: 30, log: [{ ts: agora - 60000, texto: 'Usou "Bênção" (-1 PM)' }] }),
      h.fichaBase({ id: 'p2', nome: 'Aeon', pvatual: 20, pvmax: 30, condicoesAtivas: ['Abalado'], log: [{ ts: agora - 5000, texto: '-8 PV (28 → 20)' }] }),
    ];
    w.state._mestreIniciativa = { combatentes: [{ id: 'c1', tipo: 'pj', origemId: 'p2', nome: 'Aeon', iniciativa: 12 }], turnoIdx: 0, rodada: 1 };
    w.state._mesaUltimo = null; w.state._mesaVistos = null;
    let painel = w.renderMesaAoVivo();
    const cards = painel.querySelectorAll('.mesa-card');
    h.igual('um card por PJ', cards.length, 2);
    h.ok('destaca quem está na vez', cards[1].classList.contains('na-vez') && cards[1].textContent.includes('é a vez agora'));
    h.ok('mostra condição', cards[1].textContent.includes('Abalado'));
    const eventos = [...painel.querySelectorAll('.mesa-feed .ev')].map((e) => e.textContent);
    h.ok('o que acabou de acontecer vem primeiro', eventos[0].startsWith('Aeon: -8 PV'));
    h.ok('na primeira abertura nada pisca como novo', !painel.querySelector('.mesa-feed .ev.novo'));

    w.state.perfisTodos[0].pvatual = 22;
    w.state.perfisTodos[0].log.unshift({ ts: agora, texto: '-8 PV (30 → 22)' });
    painel = w.renderMesaAoVivo();
    const ravena = painel.querySelectorAll('.mesa-card')[0];
    h.ok('quem levou dano treme', ravena.classList.contains('levou'));
    h.ok('a barra de vida anima a partir do valor anterior', !!ravena.querySelector('.trilho > div.anima') && ravena.querySelector('.trilho > div.anima').getAttribute('style').includes('--de:100.0%'));
    h.ok('evento novo entra animado', !!painel.querySelector('.mesa-feed .ev.novo'));
    painel = w.renderMesaAoVivo();
    h.ok('na atualização seguinte, sem mudança, nada anima', !painel.querySelector('.anima') && !painel.querySelector('.levou'));

    w.state.screen = 'mestre'; w.state.mestreCategoria = 'combate'; w.state.mestreTab = 'combate';
    w.render();
    h.ok('aparece no Combate do Mestre', texto().includes('Mesa ao vivo'));
    w.state.screen = 'ficha';
  }

  // ------------------------------------------------------------ envio com rostos
  h.secao('Envio de item e dinheiro escolhendo pelo rosto');
  {
    h.usarFicha(w, h.fichaBase({ equip: [{ item: 'Corda (recebido de Aeon)', qtd: '1', tipo: 'geral', carga: '1' }] }));
    w.state._enviarItemFluxo = { idx: 0, lista: [{ id: 'p2', nome: 'Aeon', jogador: 'Max', foto: '' }], carregando: false, enviando: false };
    h.renderizar(w, 'personagem');
    const av = w.document.querySelector('.presente-avatar');
    h.ok('mostra o rosto (ou a inicial) do destino', !!av && av.textContent.includes('Aeon') && av.textContent.includes('Max'));
    h.ok('o título usa o nome sem as marcas de presente', texto().includes('Enviar "Corda"'));
    w.state._enviarItemFluxo = null;
    w.state.personagemTab = 'mochila';
    h.renderizar(w, 'personagem');
    h.ok('na mochila o presente vira selo', !!w.document.querySelector('.selo-presente') && w.document.querySelector('.selo-presente').textContent === 'presente de Aeon');
  }

  h.resumo();
  process.exit(process.exitCode || 0);
})().catch((e) => { console.error(e); process.exit(1); });
