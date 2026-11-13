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

  h.resumo();
})();
