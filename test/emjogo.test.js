// Em jogo, Descansar/Nova cena, Manobras e Notas em duas partes (13/11/2026).

const h = require('./harness');

(async () => {
  const { window: w } = h.carregarApp();
  const texto = () => w.document.body.textContent;
  const fichas = () => [...w.document.querySelectorAll('.emjogo .ej')];
  const ficha = (nome) => fichas().find((b) => b.textContent.startsWith(nome));
  const lucea = () => h.fichaBase({ id: 'luc', nome: 'Lucéa', origem: 'Eremita', pmatual: 10, pmtemp: 0,
    origemPoder: { nome: 'Busca Interior', desc: 'Você pode gastar 1 PM para meditar sozinho durante algum tempo e receber uma dica do mestre.' },
    poderGeral: { nome: 'Lobo Solitário' },
    poderesClasse: [{ classe: 'Lutador', nome: 'Cabeçada', nivel: 2 }, { classe: 'Paladino', nome: 'Julgamento Divino: Autoridade', nivel: 2 }, { classe: 'Arcanista', nome: 'Especialista em Escola', nivel: 3 }] });
  const abrirFicha = (f) => { h.usarFicha(w, f); w.state.personagemTab = 'ficha'; h.renderizar(w, 'personagem'); };

  h.secao('Classificação dos poderes');
  {
    const f = lucea();
    const tipos = Object.fromEntries(w.poderesEmJogo(f).map((p) => [p.chaveBase, p.tipo]));
    h.igual('Busca Interior gasta PM', tipos['Busca Interior'], 'pm');
    h.igual('Lobo Solitário é modo', tipos['Lobo Solitário'], 'modo');
    h.igual('"uma vez por cena" marca o uso', w.poderesEmJogo(f).find((p) => p.chaveBase === 'Julgamento Divino: Autoridade').limite, 'cena');
    h.igual('"por cena contra um mesmo alvo" não marca', w.poderesEmJogo(f).find((p) => p.chaveBase === 'Cabeçada').limite, null);
    h.igual('"gastar uma hora e 3 PM" lê o custo', w.classificarPoder(f, { chaveBase: 'X', desc: 'Uma vez por dia, você pode gastar uma hora e 3 PM para escolher um poder.' }).custo, 3);
    h.igual('teto passivo de PM temporário não vira uso', w.classificarPoder(f, { chaveBase: 'Y', desc: 'Recebe 2 PM temporários. Você pode ganhar um máximo de PM temporários por cena igual ao seu nível.' }).tipo, null);
    h.ok('automático não entra no Em jogo', !('Especialista em Escola' in tipos));
    const canal = w.classificarPoder(f, { chaveBase: 'Canalizar', desc: 'Ação padrão + PM: onda de luz. Para cada PM gasto, cura 1d6 PV.' });
    h.igual('Canalizar Energia é PM à escolha', canal.tipo, 'pmvar');
  }

  h.secao('Em jogo na Ficha');
  {
    const f = lucea();
    abrirFicha(f);
    h.ok('a linha "Em jogo" aparece no Vida & Mana', !!w.document.querySelector('.panel.faixa .rot-emjogo'));
    h.ok('Descansar e Nova cena ficam ao lado dos anéis', texto().includes('🌙 Descansar') && texto().includes('🎬 Nova cena'));
    ficha('Busca Interior').click();
    const usar = [...w.document.querySelectorAll('.gaveta-ej button')].find((b) => b.textContent.includes('Usar · −1 PM'));
    h.ok('tocar abre a descrição e "Usar · −1 PM"', !!usar);
    usar.click();
    h.igual('a mana desce 1', f.pmatual, 9);
    h.ok('vai para o log como poder, não como magia', f.log.some((l) => l.texto === 'Usou o poder Busca Interior (−1 PM)'));
    f.pmtemp = 3;
    w.usarPoderEmJogo(f, w.poderesEmJogo(f).find((p) => p.chaveBase === 'Julgamento Divino: Autoridade'), 1);
    h.ok('gasta o temporário primeiro', f.pmtemp === 2 && f.pmatual === 9);
    abrirFicha(f);
    h.ok('uso por cena apaga a ficha', ficha('Julgamento Divino: Autoridade').classList.contains('usado'));
    w.usarPoderEmJogo(f, w.poderesEmJogo(f).find((p) => p.chaveBase === 'Julgamento Divino: Autoridade'), 1);
    h.igual('não deixa usar de novo na mesma cena', f.pmtemp, 2);
    [...w.document.querySelectorAll('.acoes-vm button')].find((b) => b.textContent.includes('Nova cena')).click();
    h.ok('Nova cena reinicia o uso', !ficha('Julgamento Divino: Autoridade').classList.contains('usado'));
    ficha('Lobo Solitário').click();
    h.ok('modo liga e acende', ficha('Lobo Solitário').classList.contains('on') && f.modosAtivos['Lobo Solitário']);
    ficha('Lobo Solitário').click();
    h.ok('modo desliga', !ficha('Lobo Solitário').classList.contains('on'));
  }

  h.secao('PM à escolha e Descansar');
  {
    const f = h.fichaBase({ id: 'rav', nome: 'Ravena', pmatual: 14, classesNiveis: [{ classe: 'Clérigo', nivel: 5 }],
      poderesClasse: [{ classe: 'Clérigo', nome: 'Canalizar Energia Positiva/Negativa', nivel: 1 }] });
    abrirFicha(f);
    ficha('Canalizar Energia').click();
    h.igual('teclas até o nível', w.document.querySelectorAll('.gaveta-ej .teclas button').length, 5);
    [...w.document.querySelectorAll('.gaveta-ej .teclas button')][2].click();
    [...w.document.querySelectorAll('.gaveta-ej button')].find((b) => b.textContent.includes('Usar · −3 PM')).click();
    h.igual('gasta os PM escolhidos', f.pmatual, 11);
    [...w.document.querySelectorAll('.acoes-vm button')].find((b) => b.textContent.includes('Descansar')).click();
    h.igual('Descansar abre as quatro qualidades', w.document.querySelectorAll('.desc-qual button').length, 4);
    [...w.document.querySelectorAll('.desc-qual button')].find((b) => b.textContent.startsWith('Normal')).click();
    h.igual('descanso normal recupera o nível', f.pmatual, 16);
    h.ok('a gaveta fecha depois', !w.document.querySelector('.desc-qual'));
  }

  h.secao('Manobras junto dos ataques');
  {
    const f = lucea();
    f.armas = [{ nome: 'Montante', dano: '2d6', critico: '19/x2', alcance: '—', tipo: 'Corpo a corpo', esp: 2, maos: 2 }];
    w.state._secoesNotasAbertas['itens-equipados'] = true;
    abrirFicha(f);
    const linha = w.document.querySelector('.manob');
    h.ok('uma linha com o teste de Luta', !!linha && /Luta [+-]\d+/.test(linha.textContent));
    linha.click();
    h.igual('abre as cinco manobras', w.document.querySelectorAll('.lista-man > div:not(.nota-man)').length, 5);
  }

  h.secao('Notas em duas partes');
  {
    const f = lucea();
    f.missoes = [{ texto: 'Encontrar o mapa de Tahafett', concluida: false }];
    f.relacionamentos = [{ nome: 'Wynnk Aelthir', tipo: 'aliado' }];
    h.usarFicha(w, f); w.state.personagemTab = 'notas'; w.state._notasParte = 'regras'; w.state._notasBusca = '';
    w.state._secoesNotasAbertas = { poderes: true };
    h.renderizar(w, 'personagem');
    const titulos = () => [...w.document.querySelectorAll('.panel h2')].map((x) => x.textContent);
    h.ok('Regras do herói: Poderes, Habilidades, Proficiências', ['Poderes', 'Habilidades', 'Proficiências'].every((t) => titulos().includes(t)));
    h.ok('Descanso e Manobras saíram da Notas', !titulos().includes('Descanso') && !titulos().includes('Manobras de Combate'));
    h.ok('selo "ativa" no poder que está no Em jogo', [...w.document.querySelectorAll('.selo-poder')].some((s) => s.textContent === 'ativa'));
    h.ok('automáticos recolhidos', !texto().includes('Especialista em Escola') && texto().includes('+ 1 automático(s)'));
    w.document.querySelector('.recolhido-auto').click();
    h.ok('mostrar os automáticos com selo', [...w.document.querySelectorAll('.selo-poder.auto')].length === 1);
    [...w.document.querySelectorAll('.seg2 button')].find((b) => b.textContent === 'Campanha').click();
    h.ok('Campanha: Missões, Relacionamentos e Anotações', ['Missões', 'Relacionamentos', 'Anotações'].every((t) => titulos().includes(t)) && !titulos().includes('Poderes'));
    w.state._notasBusca = 'lobo';
    h.renderizar(w, 'personagem');
    const achados = [...w.document.querySelectorAll('.resultados-notas .pd')];
    h.ok('busca acha o poder', achados.length === 1 && achados[0].textContent.includes('Lobo Solitário'));
    w.state._notasBusca = 'tahafett';
    h.renderizar(w, 'personagem');
    w.document.querySelector('.resultados-notas .pd').click();
    h.ok('tocar no achado abre a seção certa', w.state._notasParte === 'campanha' && w.state._secoesNotasAbertas.missoes === true && texto().includes('Encontrar o mapa'));
  }

  h.secao('Habilidades no Em jogo e revisão das telas');
  {
    const aeon = h.fichaBase({ id: 'aeon', nome: 'Aeon', classesNiveis: [{ classe: 'Guerreiro', nivel: 5 }], pmatual: 15,
      habilidadesIniciais: [{ nome: 'Ataque Especial', fonte: 'Classe: Guerreiro', desc: 'Gasta 1 PM num ataque pra receber +4 no teste de ataque ou na rolagem de dano. A cada 4 níveis, pode gastar +1 PM extra pra +4 a mais.' }],
      historicoNiveis: [{ nivel: 3, classe: 'Guerreiro', ganho: 'Durão, poder de guerreiro' }, { nivel: 5, classe: 'Guerreiro', ganho: 'Ataque especial +8, poder de guerreiro' }] });
    const ej = w.poderesEmJogo(aeon);
    const ataque = ej.find((p) => p.chaveBase === 'Ataque Especial');
    h.igual('Ataque Especial cresce com o nível: 1 ou 2 PM no 5º', ataque && ataque.opcoes.join(','), '1,2');
    h.ok('Durão (3 PM) entra no Em jogo', ej.some((p) => p.chaveBase === 'Durão' && p.custo === 3));
    h.igual('uma linha só para Ataque Especial e Ataque especial +8', w.coletarHabilidades(aeon).filter((x) => /ataque especial/i.test(x.nome)).length, 1);
    h.igual('fica o nome de agora', w.coletarHabilidades(aeon).find((x) => /ataque especial/i.test(x.nome)).nome, 'Ataque especial +8');
    const emival = h.fichaBase({ for: -1 });
    h.igual('Força −1: limite 9 (−1 por ponto negativo)', w.limiteCarga(emival), 9);
    const linha = (item, extra) => Object.assign({ item, qtd: '1', tipo: 'geral', carga: '0.5' }, extra || {});
    h.ok('Água benta se usa', w.ehConsumivel(linha('Água benta')));
    h.ok('pergaminho escrito à mão se usa', w.ehConsumivel(linha('Pergaminho de Salto Dimensional')));
    h.ok('nome com maiúscula e espaço acha o dado', !!w.usoDoItem(linha('Bálsamo Restaurador ')));
    h.ok('ração não vai para a Bandoleira', !w.cabeNoCinto(linha('Ração de viagem (dia)')) && w.cabeNoCinto(linha('Essência de mana')));
    const f = h.usarFicha(w, h.fichaBase({ equip: [linha('Dente-de-dragão')] }));
    const botoes = [...w.acoesItemGeral(f, f.equip[0], 0, { nomeCat: 'Dente-de-dragão' }).querySelectorAll('button')].map((b) => b.textContent);
    h.igual('Dente-de-dragão é catalisador: "Deixar pronto"', botoes[0], 'Deixar pronto');
  }

  h.secao('Achados da revisão nas fichas');
  {
    const linha = (item, extra) => Object.assign({ item, qtd: '1', tipo: 'geral' }, extra || {});
    const f = h.fichaBase({ id: 'rav', armadura: { nome: 'Couraça', cat: 'Leve', def: 5, esp: 2, pen: -4, equipado: true },
      equip: [linha('Bandoleira de poções', { carga: '0', vestido: true }), linha('Casaco longo', { carga: '1', vestido: true }),
        linha('Botas reforçadas', { carga: '1', vestido: true }), linha('Mochila de aventureiro', { carga: '0', vestido: true }), linha('Traje de viajante', { carga: '0' })] });
    w.state.perfis = [f]; w.state.perfilAtualId = f.id;
    w.aplicarMigracoesPerfis();
    h.igual('Bandoleira com espaço 0 volta a 1 (livro)', f.equip[0].carga, '1');
    h.igual('Traje de viajante continua sem espaço', f.equip[4].carga, '0');
    h.ok('mochila como 5º vestido volta para guardada', f.equip[3].vestido === false);
    f.equip[0].carga = '0';
    w.aplicarMigracoesPerfis();
    h.igual('a correção do espaço roda uma vez só', f.equip[0].carga, '0');
  }

  h.resumo();
})();
