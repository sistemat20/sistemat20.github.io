// Status (15/11/2026): Vida · Defesa · Mana, Nas mãos e Parceiros.

const h = require('./harness');

(async () => {
  const { window: w } = h.carregarApp();
  const q = (s) => [...w.document.querySelectorAll(s)];
  const texto = () => w.document.body.textContent;
  const martelo = { cat: 'Marcial', esp: 1, dano: '1d8', maos: 1, nome: 'Martelo de guerra', tipo: 'Impacto', alcance: '—', critico: 'x3', pericia: 'Luta', refBase: 'Martelo de guerra', distancia: false };
  const aeon = () => h.fichaBase({ id: 'aeon', nome: 'Aeon', raca: 'Golem', for: 5, des: 2, classesNiveis: [{ classe: 'Guerreiro', nivel: 5 }], periciasTreinadas: ['Luta'],
    poderesClasse: [{ classe: 'Guerreiro', nome: 'Ataque Poderoso', nivel: 4, trocaPorGeral: true }],
    armas: [Object.assign({}, martelo)],
    escudo: { cat: 'Escudo', def: 2, esp: 2, pen: -2, nome: 'Escudo pesado', refBase: 'Escudo pesado', equipado: true },
    equip: [{ tipo: 'arma', ref: 'Montante', item: 'Montante', qtd: '1', carga: '2' }] });
  const abrir = (f) => { h.usarFicha(w, f); w.state.personagemTab = 'ficha'; h.renderizar(w, 'personagem'); };

  h.secao('Aba Status e Vida · Defesa · Mana');
  {
    const f = aeon();
    abrir(f);
    h.ok('a barra embaixo tem Ficha · Perícias · Magias · Mochila · Mais', q('.barra-baixo button').map((b) => b.textContent.replace(/[^A-Za-zíê ]/g, '').trim()).join(',') === 'Ficha,Perícias,Magias,Mochila,Mais');
    h.ok('o painel Defesa separado saiu', !q('.panel.faixa > h2').some((x) => x.textContent === 'Defesa'));
    h.ok('o painel de vida, Defesa e mana se chama Status', q('.panel.faixa > h2').some((x) => x.textContent === 'Status'));
    const esc = w.document.querySelector('.escudo-def');
    h.ok('o escudo mostra a Defesa total', esc && esc.textContent.startsWith(String(w.defesaTotal(f))));
    esc.click();
    h.ok('tocar no escudo abre a conta com o total', !!w.document.querySelector('.conta-def') && w.document.querySelector('.conta-def').textContent.includes('Total'));
    const antes = w.defesaTotal(f);
    q('.conta-def .qtd-step button').find((b) => b.textContent === '+').click();
    h.igual('"Outros" sobe 1 na Defesa', w.defesaTotal(f), antes + 1);
  }

  h.secao('Nas mãos');
  {
    const f = aeon();
    abrir(f);
    h.ok('Itens Equipados virou "Nas mãos"', q('.panel.faixa > h2').some((x) => x.textContent === 'Nas mãos') && !texto().includes('Itens Equipados'));
    h.igual('martelo e escudo, uma mão cada', q('.maos .mao').length, 2);
    const base = w.numerosAtaque(f, f.armas[0]);
    f.modosAtivos = { 'Ataque Poderoso': true };
    const mod = w.numerosAtaque(f, f.armas[0]);
    h.ok('Ataque Poderoso ligado: −2 no ataque e +5 no dano', mod.teste === base.teste - 2 && mod.dano === '1d8+' + (parseInt(base.dano.split('+')[1] || '0') + 5));
    const arco = { nome: 'Arco curto', dano: '1d6', maos: 2, critico: 'x3', alcance: 'Médio', distancia: true, pericia: 'Pontaria', refBase: 'Arco curto' };
    h.ok('não muda ataque à distância', !w.numerosAtaque(f, arco).poderoso);
    abrir(f);
    h.ok('a mão com o modo fica verde e com a etiqueta', !!w.document.querySelector('.mao.mod .tag-modo'));
    q('.maos .mao')[0].click();
    const opc = q('.opc-troca button').find((b) => b.textContent.includes('Montante'));
    h.ok('tocar na mão lista as armas da mochila', !!opc && opc.textContent.includes('duas mãos'));
    opc.click();
    h.ok('trocou: Montante nas duas mãos', f.armas.length === 1 && f.armas[0].nome === 'Montante' && !f.escudo);
    h.ok('martelo e escudo foram para a mochila', f.equip.some((r) => r.item === 'Martelo de guerra') && f.equip.some((r) => r.tipo === 'escudo'));
    h.ok('mostra "As duas mãos"', q('.maos .mao.duas').length === 1);
    const vazio = h.fichaBase({ id: 'v' });
    abrir(vazio);
    h.ok('sem nada empunhado: "Mãos livres"', texto().includes('Mãos livres'));
  }

  h.secao('Parceiros');
  {
    const dest = (poder) => ({ nome: 'Bill', tipo: 'Destruidor', poder });
    h.igual('Destruidor iniciante: 1 PM', w.custosParceiro(dest('iniciante')).join(','), '1');
    h.igual('Destruidor veterano: 1 ou 2 PM', w.custosParceiro(dest('veterano')).join(','), '1,2');
    h.ok('veterano junta o texto do iniciante', w.eval('textoParceiro')(dest('veterano')).startsWith('1x/rodada') && w.eval('textoParceiro')(dest('veterano')).includes('2 PM pra 4d6'));
    h.igual('Adepto (desconto de −1 PM) não gasta PM', w.custosParceiro({ nome: 'A', tipo: 'Adepto', poder: 'iniciante' }).length, 0);
    const f = h.fichaBase({ id: 'wy', pmatual: 10, parceiros: [
      { nome: 'Nyva', tipo: 'Montaria', poder: 'iniciante', ehMontaria: true, tipoMontaria: 'Urso das neves', fonteAmeacasArton: 'Urso das neves', montadoAgora: false },
      { nome: 'Squik', tipo: 'Combatente', poder: 'veterano' }, dest('iniciante')] });
    w.state._secoesNotasAbertas = { 'parceiros-ativos': true };
    abrir(f);
    h.igual('uma linha por parceiro', q('.pc').length, 3);
    h.igual('nível em bolinhas (veterano = 2)', q('.pc')[1].querySelectorAll('.pips i.on').length, 2);
    const montado = q('.emjogo .ej').find((b) => b.textContent.includes('Montado'));
    h.ok('montaria no Em jogo', !!montado);
    montado.click();
    h.ok('"Montado" liga a montaria', f.parceiros[0].montadoAgora === true && q('.emjogo .ej.on').some((b) => b.textContent.includes('Montado')));
    q('.emjogo .ej').find((b) => b.textContent.includes('Bill')).click();
    q('.gaveta-ej button').find((b) => b.textContent.includes('Usar · −1 PM')).click();
    h.ok('Bill gasta 1 PM e vai para o log', f.pmatual === 9 && f.log.some((l) => l.texto === 'Usou o parceiro Bill (−1 PM)'));
    q('.pc')[1].click();
    q('.seg3 button').find((b) => b.textContent === 'Mestre').click();
    h.igual('o seletor muda o nível', f.parceiros[1].poder, 'mestre');
  }

  h.secao('Condições: pílulas, alerta e efeito na tela');
  {
    const f = aeon();
    abrir(f);
    h.ok('sem condição: uma linha e o +', texto().includes('Nenhuma condição') && !w.document.querySelector('.alerta-cond'));
    q('.cond-pilula.mais')[0].click();
    h.igual('o + mostra as 32 condições em nomes curtos', q('.cond-nuvem .cond-pilula').length, 32);
    w.state._condBusca = 'despre'; h.renderizar(w, 'personagem');
    h.igual('a busca filtra', q('.cond-nuvem .cond-pilula').length, 1);
    q('.cond-nuvem .cond-pilula')[0].click();
    h.ok('tocar mostra o efeito em uma frase', w.document.querySelector('#painel-condicoes .gaveta-ej').textContent.includes('–5 na Defesa'));
    q('#painel-condicoes .gaveta-ej button').find((b) => b.textContent === 'Aplicar').click();
    h.ok('aplicou: vira pílula vermelha', f.condicoesAtivas.includes('Desprevenido') && q('.cond-linha .cond-pilula.on').length === 1);
    h.ok('alerta no topo com o efeito curto', !!w.document.querySelector('.alerta-cond') && w.document.querySelector('.alerta-cond').textContent.includes('−5 Defesa'));
    h.ok('o escudo fica vermelho quando a Defesa caiu', !!w.document.querySelector('.escudo-def.afetado') && w.defesaSemCondicoes(f) === w.defesaTotal(f) + 5);
    h.ok('efeito de tela do desprevenido', !!w.document.querySelector('#efx-condicoes .efx-c.guarda'));
    f.condicoesAtivas.push('Em Chamas'); h.renderizar(w, 'personagem');
    h.ok('cada condição tem o seu efeito', w.efeitosDeTela(f).join(',') === 'guarda,chamas' && !!w.document.querySelector('#efx-condicoes .efx-c.chamas'));
    f.condicoesAtivas = []; h.renderizar(w, 'personagem');
    h.ok('sem condição, o efeito some', !w.document.getElementById('efx-condicoes'));
    w.state._condAberto = false;
  }

  h.resumo();
})();
