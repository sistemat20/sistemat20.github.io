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
        { n: 'Bênção', c: 1, e: 'Encantamento', trad: 'Arcana', alcance: 'curto', resistencia: '' },
        { n: 'Bola de Fogo', c: 3, e: 'Evocação', trad: 'Arcana', alcance: 'médio', resistencia: 'Reflexos reduz à metade' },
      ],
    }));
    w.state.personagemTab = 'magias';
    h.renderizar(w, 'personagem');
    const cartas = [...w.document.querySelectorAll('.grimorio-carta')];
    h.igual('uma carta por magia', cartas.length, 2);
    h.ok('a que custa mais que a mana fica apagada', cartas[1].classList.contains('sem-mana') && !cartas[0].classList.contains('sem-mana'));
    cartas[0].click();
    h.ok('tocar na carta abre o lançamento', !!w.state._usarMagiaPopup && w.state._usarMagiaPopup.magia.n === 'Bênção');
    h.renderizar(w, 'personagem');
    h.ok('o lançamento mostra a prévia da mana', !!w.document.querySelector('.mana-previa'));
    const previa = w.renderManaPrevia(f, 6);
    h.ok('custo maior que a mana fica marcado como insuficiente', previa.classList.contains('insuficiente') && previa.textContent.includes('falta 4 PM'));
    h.ok('custo que cabe mostra quanto sobra', w.renderManaPrevia(f, 1).textContent.includes('→ 1'));
    w.state._usarMagiaPopup = null;
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
