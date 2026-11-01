// Regressão base: garante que o app carrega, que todas as telas montam, e cobre os cálculos
// que já quebraram antes. Rode isso depois de QUALQUER alteração, não só do que você mexeu.

const h = require('./harness');

const { window: w, scripts } = h.carregarApp();
console.log('Carregou ' + scripts.length + ' scripts sem erro.');

// ---------------------------------------------------------------- telas
h.secao('Todas as telas montam');
const f = h.usarFicha(w, h.fichaBase({
  magias: [
    { n: 'Bola de Fogo', c: 3, e: 'Evocação', trad: 'Arcana', alcance: 'médio', resistencia: 'Reflexos reduz à metade' },
    { n: 'Armadura Arcana', c: 1, e: 'Abjuração', trad: 'Arcana', alcance: 'pessoal', resistencia: '' },
  ],
}));
h.abrirTodasAsSecoes(w);
h.ABAS.forEach((aba) => {
  let erro = null;
  try { h.renderizar(w, aba); } catch (e) { erro = e.message; }
  h.ok('aba "' + aba + '"', erro === null, erro || '');
});

// ---------------------------------------------------------------- PM
const bolaDeFogo = f.magias[0];
const armaduraArcana = f.magias[1];

h.secao('Custo e limite de PM');
h.igual('Bola de Fogo (3º círculo) custa 6 PM', w.custoPMAjustado(f, bolaDeFogo), 6);
h.igual('sem item, não há limite extra', w.limitePMExtraArcana(f), 0);

h.secao('Esotérico Harmonizado desconta PM só da magia escolhida');
f.esotericos = [{
  nome: 'Varinha (Harmonizado)', refBase: 'Varinha arcana', esp: 1, maos: 1, equipado: true, superior: true,
  efeito: [{ tipo: 'custo_pm_magia', valor: -1 }], magiaHarmonizada: 'Bola de Fogo',
}];
h.igual('a magia harmonizada custa 1 a menos', w.custoPMAjustado(f, bolaDeFogo), 5);
h.igual('as outras não mudam', w.custoPMAjustado(f, armaduraArcana), 1);
f.esotericos = [];

h.secao('Esotérico Vigilante soma na Defesa');
const defSem = w.defesaTotal(f);
f.esotericos = [{
  nome: 'Orbe (Vigilante)', refBase: 'Orbe cristalino', esp: 1, maos: 1, equipado: true, superior: true,
  efeito: [{ tipo: 'defesa_esoterico', valor: 2 }],
}];
h.igual('Defesa sobe 2', w.defesaTotal(f), defSem + 2);
f.esotericos[0].equipado = false;
h.igual('guardado na mochila não conta', w.defesaTotal(f), defSem);
f.esotericos = [];

h.secao('Itens mágicos do Cap. 8 com efeito numérico');
f.armas = [{ nome: 'Cajado do Poder', refBase: 'Bordão', dano: '1d6', esp: 2, maos: 2 }];
h.igual('Cajado do Poder: -1 PM em magia arcana', w.custoPMAjustado(f, bolaDeFogo), 5);
h.igual('Cajado do Poder: +1 no limite de PM', w.limitePMExtraArcana(f), 1);
h.igual('Cajado do Poder: +3 na CD', w.bonusCdArcana(f, 'Evocação'), 3);
f.armas[0].nome = 'Cajado do Poder (Certeira)';
h.igual('reconhece mesmo virando item superior', w.custoPMAjustado(f, bolaDeFogo), 5);
f.armas = [];

// ------------------------------------------------- melhoria que substitui
h.secao('Melhoria avançada substitui a básica, não soma');

function forjar(categoria, baseItem, melhorias, extras) {
  const ficha = h.usarFicha(w, h.fichaBase({ id: 'forja' }));
  w.state._itemSuperiorBuilder = Object.assign(
    { categoria, baseItem, melhoriasEscolhidas: melhorias, materialEscolhido: null }, extras || {});
  w.finalizarItemSuperior();
  return ficha.equip[ficha.equip.length - 1];
}

const espada = { n: 'Espada longa', preco: 'T$ 50' };
const couro = { n: 'Armadura de couro', preco: 'T$ 25' };
const orbe = { n: 'Orbe cristalino', preco: 'T$ 750' };
const somaLimite = (it) => (it.efeitoExtra || []).filter((e) => e.tipo === 'limite_pm_arcana').reduce((a, e) => a + e.valor, 0);

h.igual('Certeira + Pungente = +2 no ataque', forjar('arma', espada, ['Certeira', 'Pungente']).bonusTesteExtra, 2);
h.igual('Cruel + Atroz = +2 no dano', forjar('arma', espada, ['Cruel', 'Atroz']).bonusDanoExtra, 2);
h.igual('Ajustada + Sob medida = -2 de penalidade', forjar('armaduraLeve', couro, ['Ajustada', 'Sob medida']).bonusPenExtra, -2);
h.igual('Canalizador + Potencializador = +2 de limite', somaLimite(forjar('esoterico', orbe, ['Canalizador', 'Potencializador'])), 2);

h.igual('só Certeira = +1', forjar('arma', espada, ['Certeira']).bonusTesteExtra, 1);
h.igual('só Canalizador = +1', somaLimite(forjar('esoterico', orbe, ['Canalizador'])), 1);
const mix = forjar('arma', espada, ['Certeira', 'Cruel']);
h.ok('melhorias sem relação continuam somando', mix.bonusTesteExtra === 1 && mix.bonusDanoExtra === 1);
h.igual('o preço continua cobrando as duas melhorias',
  w.calcularItemSuperior({ melhoriasEscolhidas: ['Certeira', 'Pungente'], materialEscolhido: null, categoria: 'arma' }).precoExtra, 3000);

h.secao('Migração conserta item já salvo com os dois bônus somados');
const antiga = h.fichaBase({ id: 'antiga' });
antiga.equip.push({
  tipo: 'arma', ref: 'Espada longa', item: 'Espada longa (Certeira, Pungente)', qtd: '1', carga: '1',
  superior: true, bonusTesteExtra: 3,
  melhoriasTxt: 'Certeira: +1 nos testes de ataque · Pungente: +2 nos testes de ataque',
});
w.state.perfis = [antiga];
w.migrarMelhoriasSubstituidas();
h.igual('corrigiu de +3 para +2', antiga.equip[0].bonusTesteExtra, 2);
w.migrarMelhoriasSubstituidas();
w.migrarMelhoriasSubstituidas();
h.igual('não corrige de novo a cada abertura', antiga.equip[0].bonusTesteExtra, 2);

// ------------------------------------------------- catálogo
h.secao('Catálogo de melhorias e materiais de esotérico');
const melhEso = w.melhoriasDisponiveis('esoterico').map((m) => m.nome);
['Canalizador', 'Energético', 'Harmonizado', 'Poderoso', 'Vigilante', 'Potencializador', 'Material especial']
  .forEach((n) => h.ok('melhoria "' + n + '" disponível', melhEso.includes(n)));
const matsEso = w.MATERIAIS_ESPECIAIS.filter((m) => w.efeitoMaterialParaCategoria(m, 'esoterico')).map((m) => m.nome);
['Prata', 'Quitina Razza', 'Mitral'].forEach((n) => h.ok('material "' + n + '" disponível', matsEso.includes(n)));
['Quitina Razza', 'Couraça de Kaiju', 'Pena de Kraken'].forEach((n) => {
  const mat = w.MATERIAIS_ESPECIAIS.find((m) => m.nome === n);
  let erro = null;
  try { w.precoMaterialParaCategoria(mat, 'esoterico'); } catch (e) { erro = e.message; }
  h.ok('material sem preço "' + n + '" não quebra o cálculo', erro === null, erro || '');
});

// ------------------------------------------------- interface
h.secao('Interface: construtor de item superior');
h.usarFicha(w, h.fichaBase({ magias: [{ n: 'Bola de Fogo', c: 3, e: 'Evocação', trad: 'Arcana' }] }));
w.state._itemSuperiorBuilder = {
  categoria: 'esoterico', baseItem: orbe, melhoriasEscolhidas: ['Harmonizado'],
  materialEscolhido: null, magiaHarmonizada: null, buscaHarmonizado: '',
};
const tela = h.renderizar(w, 'itens');
h.ok('o construtor abriu', tela.includes('Criar Item Superior'));
h.ok('pede a magia do Harmonizado', tela.includes('Harmonizado: qual magia?'));
h.ok('o campo de busca tem id (senão perde o foco ao digitar)', !!w.document.getElementById('harmonizado-busca'));
h.ok('Potencializador aparece nas opções', tela.includes('Potencializador'));
w.state._itemSuperiorBuilder = null;

h.resumo();
