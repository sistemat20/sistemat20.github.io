// Condições, maldições, usos de poderes e descanso.
// Separado do js/app.js em 15/11/2026 (item 6 da revisão geral), sem mudar o código.

// Resume, numa frase só, se algum item EQUIPADO (armas, armadura, escudo) está sem
// proficiência — usado no banner de aviso visível em qualquer aba da ficha.
// Lista de condições oficiais (Apêndice, pág. 394-395). Deixei de fora Inconsciente, Sangrando
// e Sobrecarregado porque esses três já são calculados automaticamente em outro lugar do app.
const CONDICOES_LISTA = [
  ['Abalado','–2 em testes de perícia. Se ficar abalado de novo, vira Apavorado.'],
  ['Agarrado','Desprevenido e imóvel, –2 em ataque, só ataca com armas leves.'],
  ['Alquebrado','Custo em PM das habilidades aumenta em +1.'],
  ['Apavorado','–5 em perícias, não se aproxima da fonte do medo.'],
  ['Atordoado','Desprevenido e não pode fazer ações.'],
  ['Caído','–5 Defesa corpo a corpo (+5 à distância), –5 em ataques corpo a corpo, deslocamento 1,5m.'],
  ['Cego','Desprevenido, lento, –5 em perícias de Força/Destreza, sem Percepção visual.'],
  ['Confuso','Comportamento aleatório (1d6 no início do turno).'],
  ['Debilitado','–5 em For/Des/Con e perícias baseadas. Se de novo, vira Inconsciente.'],
  ['Desprevenido','–5 na Defesa e em Reflexos.'],
  ['Doente','Sob efeito de uma doença.'],
  ['Em Chamas','1d6 de fogo no início do turno; apaga com ação padrão ou água.'],
  ['Enfeitiçado','Fica prestativo com a fonte; ela ganha +10 Diplomacia.'],
  ['Enjoado','Só uma ação padrão OU de movimento por rodada.'],
  ['Enredado','Lento, vulnerável, –2 em ataque.'],
  ['Envenenado','Efeito varia do veneno (perda de vida, fraco, enjoado...).'],
  ['Esmorecido','–5 em Int/Sab/Car e perícias baseadas.'],
  ['Exausto','Debilitado + lento + vulnerável. Se de novo, vira Inconsciente.'],
  ['Fascinado','–5 Percepção, só observa o que o fascinou.'],
  ['Fatigado','Fraco + vulnerável. Se de novo, vira Exausto.'],
  ['Fraco','–2 em For/Des/Con e perícias baseadas. Se de novo, vira Debilitado.'],
  ['Frustrado','–2 em Int/Sab/Car e perícias baseadas. Se de novo, vira Esmorecido.'],
  ['Imóvel','Deslocamento reduzido a 0m.'],
  ['Indefeso','Desprevenido, –10 Defesa, falha automática em Reflexos.'],
  ['Lento','Deslocamento pela metade, não corre nem investe.'],
  ['Ofuscado','–2 em ataque e Percepção.'],
  ['Paralisado','Imóvel e indefeso, só ações mentais.'],
  ['Pasmo','Não pode fazer ações.'],
  ['Petrificado','Inconsciente + redução de dano 8.'],
  ['Surdo','Sem Percepção auditiva, –5 Iniciativa, condição ruim pra magia.'],
  ['Surpreendido','Desprevenido e não pode fazer ações.'],
  ['Vulnerável','–2 na Defesa.'],
];
function condicoesAtivas(f){ return f.condicoesAtivas || []; }

function alternarCondicao(f, nome){
  if(!f.condicoesAtivas) f.condicoesAtivas = [];
  const idx = f.condicoesAtivas.indexOf(nome);
  if(idx>=0){ f.condicoesAtivas.splice(idx,1); registrarLog(f, 'Removeu a condição: '+nome); }
  else { f.condicoesAtivas.push(nome); registrarLog(f, 'Ganhou a condição: '+nome); }
  salvarPerfis(); render();
}

// Maldições (Ameaças de Arton, pág. 361-362) — pedido separado das Condições, com sua própria
// lista. Aqui só o texto MECÂNICO (o que o efeito faz de verdade), sem a parte de origem/lore
// (isso fica só na versão completa, pro Mestre — ver MALDICOES_COMPLETO). A forma de remover
// cada maldição também é algo que o Mestre narra/decide, então fica de fora daqui também.
const MALDICOES_LISTA = [
  ['Conhecimento Proibido', 'Fica confuso até o fim da cena em que foi amaldiçoado, e perde 1 ponto permanente de Sabedoria ou Carisma por dia (aleatório). Se algum desses atributos chegar a –5, vira um monstro (à escolha do Mestre).'],
  ['Fúria de Allihanna', 'Animais, devotos de Allihanna e outras criaturas ligadas à natureza recebem +5 em testes e dano contra você, e te consideram hostil. Ambientes naturais viram terreno difícil pra você, com –5 em Acrobacia/Atletismo neles. Descanso em ambiente natural sempre fica 2 níveis pior.'],
  ['Maldição do Bardo', 'Perde todo o talento: pra efeitos de modificadores de perícias e CD de habilidades, todos os seus atributos são tratados como 0.'],
  ['Mortuária', 'Recebe vulnerabilidade a dano de trevas (substitui qualquer imunidade ou redução que tivesse) e perde a capacidade de recuperar PV com dano de trevas.'],
  ['Toque de Tibar', 'Tudo que veste ou empunha vira pirita: armas dão –2 em testes de ataque e rolagens de dano, armaduras/escudos têm o bônus de Defesa reduzido em –2, itens gerais dão –2 em testes que os usem.'],
];
// Texto completo (origem + mecânica + remoção), só pra referência do Mestre — o jogador não
// precisa disso pra jogar, mas o Mestre precisa pra narrar e saber como a maldição é curada.
const MALDICOES_COMPLETO = {
  'Conhecimento Proibido': 'Criada especialmente para corromper aqueles que se apropriam de conhecimentos profanos, esta maldição é encontrada protegendo livros e tratados acadêmicos, mas também pode ser proferida por alguém empenhado em resguardar uma fonte de informações ou conhecimentos perigosos. Uma criatura amaldiçoada fica confusa até o fim da cena em que sofreu a maldição e perde 1 ponto permanente de Sabedoria ou Carisma por dia (determinados aleatoriamente a cada dia). Caso algum desses atributos seja reduzido a –5, a vítima se transforma em um monstro à escolha do mestre. Remover a maldição requer um ritual especial, celebrado por um clérigo de Tannah-Toh, que deverá lançar Dispersar as Trevas sobre a criatura amaldiçoada. Esse ritual exige o gasto de T$ 1.000 em incensos e outros ingredientes sagrados.',
  'Fúria de Allihanna': 'Esta maldição é uma punição contra aqueles que cometem crimes hediondos contra o mundo natural, tais como matar um unicórnio. Ela é encontrada em templos e recantos sagrados de Allihanna, mas também pode se manifestar espontaneamente quando uma ofensa grave é cometida contra os filhos da Deusa da Natureza. O personagem amaldiçoado passa a atrair o ódio do mundo selvagem: animais, devotos de Allihanna e outras criaturas que, a critério do mestre, são ligadas ao mundo natural recebem +5 em testes e rolagens de dano contra ele e são considerados hostis. Além disso, a natureza conspira contra o personagem: ele considera ambientes naturais como terreno difícil e sofre –5 em testes de Acrobacia e Atletismo nesses lugares. Por fim, suas condições de descanso em ambientes naturais sempre são dois níveis abaixo do normal. Remover esta maldição exige o perdão de um clérigo ou druida de Allihanna capaz de lançar magias de 4º círculo. Esse perdão geralmente depende de um serviço ou favor que de alguma forma repare o crime que desencadeou a maldição.',
  'Maldição do Bardo': 'Em Arton existe um ditado popular: "Matar bardo dá azar". Embora isso seja apenas uma crendice, em ocasiões especiais a morte de um bardo particularmente talentoso ou inspirado pode desencadear esta maldição. Uma criatura afetada pela Maldição do Bardo perde todo seu talento: para efeitos de modificadores de perícias e CD de habilidades, todos seus atributos são tratados como 0. Quebrar esta maldição requer localizar a alma do bardo morto e desafiá-lo para um duelo artístico: três testes opostos de Atuação, em que o personagem amaldiçoado deve vencer pelo menos dois. Tal duelo só pode ser realizado uma vez por aventura.',
  'Mortuária': 'Esta maldição é causada pelos mortos-vivos conhecidos como mortalhas, mas também pode ser encontrada em tumbas de conjuradores ligados a forças necromânticas ou energia negativa. Uma criatura amaldiçoada pela Mortuária se torna cansada e decrépita, como se sua energia vital estivesse a ponto de se extinguir, e recebe vulnerabilidade a trevas (isso substitui qualquer imunidade ou redução de trevas, bem como a capacidade de recuperar PV com dano de trevas). A remoção desta maldição depende de sua fonte: se for causada por uma mortalha, é necessário destruir a criatura. Se for causada pela violação de uma tumba, é necessário lançar Dispersar as Trevas sobre os restos mortais do ocupante original do lugar, em um ritual de 1 hora que custa T$ 1.000.',
  'Toque de Tibar': 'Esta maldição pode recair sobre aqueles que cometem crimes contra os dogmas de Tibar, tal como tentar descobrir o segredo da Cunhagem Sagrada ou falsificar moedas. Todos os objetos que a criatura amaldiçoada veste ou empunha se transformam em pirita enquanto estiverem em sua posse; armas impõem uma penalidade de –2 em testes de ataque e rolagens de dano, armaduras e escudos têm seu bônus de Defesa reduzido em –2 e itens gerais impõem uma penalidade de –2 em quaisquer testes em que sejam empregados. Remover esta maldição exige que a vítima repare o crime cometido. Isso pode significar esquecer qualquer informação secreta obtida (por meio de algum efeito como Alterar Memória) ou devolver quaisquer lucros obtidos.',
};
function maldicoesAtivas(f){ return f.maldicoesAtivas || []; }

function alternarMaldicao(f, nome){
  if(!f.maldicoesAtivas) f.maldicoesAtivas = [];
  const idx = f.maldicoesAtivas.indexOf(nome);
  if(idx>=0){ f.maldicoesAtivas.splice(idx,1); registrarLog(f, 'Removeu a maldição: '+nome); }
  else { f.maldicoesAtivas.push(nome); registrarLog(f, 'Foi amaldiçoado(a): '+nome); }
  salvarPerfis(); render();
}

// Efeitos mecânicos automáticos das condições — só as que têm um número claro do livro pra
// aplicar (perícia, Defesa, deslocamento). Várias condições (Atordoado, Confuso, Paralisado,
// Enjoado, Envenenado, Agarrado, Em Chamas, Surpreendido...) são mais sobre o que você PODE ou
// NÃO PODE fazer na sua vez do que um número fixo — essas continuam só informativas, porque
// aplicar automaticamente seria adivinhar demais (o Mestre e o jogador que decidem na hora).
const CONDICOES_EFEITOS = {
  'Abalado':      { periciaTodas: -2 },
  'Apavorado':    { periciaTodas: -5 },
  'Cego':         { periciaAttr: {For:-5, Des:-5} },
  'Debilitado':   { periciaAttr: {For:-5, Des:-5, Con:-5} },
  'Desprevenido': { defesa: -5 },
  'Enredado':     { defesa: -2 },
  'Esmorecido':   { periciaAttr: {Int:-5, Sab:-5, Car:-5} },
  'Exausto':      { periciaAttr: {For:-5, Des:-5, Con:-5}, defesa: -2, deslocamentoMult: 0.5 },
  'Fascinado':    { periciaEspecifica: {'Percepção': -5} },
  'Fatigado':     { periciaAttr: {For:-2, Des:-2, Con:-2}, defesa: -2 },
  'Fraco':        { periciaAttr: {For:-2, Des:-2, Con:-2} },
  'Frustrado':    { periciaAttr: {Int:-2, Sab:-2, Car:-2} },
  'Imóvel':       { deslocamentoMult: 0 },
  'Indefeso':     { defesa: -10 },
  'Lento':        { deslocamentoMult: 0.5 },
  'Ofuscado':     { periciaEspecifica: {'Percepção': -2} },
  'Surdo':        { periciaEspecifica: {'Iniciativa': -5} },
  'Vulnerável':   { defesa: -2 },
};
function bonusCondicoesPericia(f, p){
  let total = 0;
  condicoesAtivas(f).forEach(nome=>{
    const efeito = CONDICOES_EFEITOS[nome];
    if(!efeito) return;
    if(efeito.periciaTodas) total += efeito.periciaTodas;
    if(efeito.periciaAttr && efeito.periciaAttr[p.attr]!=null) total += efeito.periciaAttr[p.attr];
    if(efeito.periciaEspecifica && efeito.periciaEspecifica[p.nome]!=null) total += efeito.periciaEspecifica[p.nome];
  });
  return total;
}

function bonusCondicoesDefesa(f){
  let total = 0;
  condicoesAtivas(f).forEach(nome=>{
    const efeito = CONDICOES_EFEITOS[nome];
    if(efeito && efeito.defesa) total += efeito.defesa;
  });
  return total;
}

// O deslocamento não soma penalidades, usa sempre o MENOR multiplicador entre as condições ativas
// (ex: Lento + Imóvel ao mesmo tempo não fica "negativo", só fica 0 mesmo, que já é o mínimo).
function multiplicadorCondicoesDeslocamento(f){
  let mult = 1;
  condicoesAtivas(f).forEach(nome=>{
    const efeito = CONDICOES_EFEITOS[nome];
    if(efeito && efeito.deslocamentoMult!=null) mult = Math.min(mult, efeito.deslocamentoMult);
  });
  return mult;
}

// ---- Uso limitado de poderes ("1x/cena", "1x/dia") ----
// Detecta pela própria descrição do poder se ele tem limite de uso, sem precisar marcar cada
// poder manualmente nos dados — só procura "por cena" ou "por dia" no texto.
function tipoLimiteUso(desc){
  if(!desc) return null;
  if(/por dia/i.test(desc)) return 'dia';
  if(/por cena/i.test(desc)) return 'cena';
  return null;
}

function poderFoiUsado(f, nomePoder){ return !!(f.poderesUsados && f.poderesUsados[nomePoder]); }

function alternarUsoPoder(f, nomePoder){
  if(!f.poderesUsados) f.poderesUsados = {};
  f.poderesUsados[nomePoder] = !f.poderesUsados[nomePoder];
  salvarPerfis(); render();
}

// Junta todos os poderes do personagem (classe, geral, raça, concedido) que têm descrição
// disponível, pra detectar o limite de uso e resetar na hora certa.
function buscarDescPoderClasse(nome){
  for(const classe in PODERES_CLASSE_COMPLETO){
    const achado = PODERES_CLASSE_COMPLETO[classe].find(p=>p.nome===nome);
    if(achado) return achado.desc;
  }
  return '';
}

function todosOsPoderesComDesc(f){
  const lista = [];
  (f.poderesClasse||[]).forEach(p=>{ lista.push({nome:p.nome, desc: buscarDescPoderClasse(p.nome)}); });
  if(f.poderGeral){ const info = PODERES_GERAIS.find(x=>x.nome===f.poderGeral.nome); lista.push({nome:f.poderGeral.nome, desc:(info&&info.desc)||''}); }
  if(f.poderGeralExtra){ const info = PODERES_GERAIS.find(x=>x.nome===f.poderGeralExtra.nome); lista.push({nome:f.poderGeralExtra.nome, desc:(info&&info.desc)||''}); }
  if(f.poderRaca){ const info = PODERES_GERAIS.find(x=>x.nome===f.poderRaca.nome); lista.push({nome:f.poderRaca.nome, desc:(info&&info.desc)||''}); }
  listaPoderesConcedidos(f).forEach(pc=>{
    if(!pc || !pc.nome) return;
    const info = (typeof PODERES_CONCEDIDOS!=='undefined') ? PODERES_CONCEDIDOS.find(x=>x.nome===pc.nome) : null;
    lista.push({nome:pc.nome, desc:(info&&info.desc)||''});
  });
  if(typeof coletarHabilidades==='function') coletarHabilidades(f).forEach(h=> lista.push({nome:h.chaveBase, desc:h.desc}));
  if(f.origemPoder && f.origemPoder.nome) lista.push({nome:f.origemPoder.nome, desc:f.origemPoder.desc||''});
  return lista;
}

function poderesComLimiteUso(f){
  return todosOsPoderesComDesc(f).map(p=> ({nome:p.nome, tipo:tipoLimiteUso(p.desc)})).filter(p=>p.tipo);
}

// Zera o "usado" de poderes de um tipo específico (chamado por Nova Cena e pelo Descanso).
function resetarUsoPoderes(f, tipos){
  if(!f.poderesUsados) return;
  poderesComLimiteUso(f).forEach(p=>{
    if(tipos.includes(p.tipo)) delete f.poderesUsados[p.nome];
  });
}

// ---- Descanso (regra da pág. 106 — não existe "curto/longo" no T20, só uma noite de sono
// com 4 níveis de qualidade, cada um recuperando um múltiplo do nível em PV e PM) ----
const QUALIDADE_DESCANSO = {
  'Ruim': 0.5,        // dormir ao relento, sem acampamento — metade do nível
  'Normal': 1,         // estalagem comum — igual ao nível
  'Confortável': 2,    // dobro do nível
  'Luxuosa': 3,        // triplo do nível
};
function aplicarDescanso(f, qualidade){
  const nivel = nivelTotal(f);
  // Estoico (poder único de origem, achado na mesma auditoria): "Sua condição de descanso é uma
  // categoria acima do padrão pela situação" — nunca tinha sido conectado. Sobe uma categoria
  // (Ruim->Normal->Confortável->Luxuosa; já na Luxuosa não sobe mais, é o teto).
  const ORDEM_QUALIDADE = ['Ruim','Normal','Confortável','Luxuosa'];
  let qualidadeEfetiva = qualidade;
  // Estoico (poder de origem) e Pajem (poder de classe do Cavaleiro, achado na mesma auditoria)
  // fazem a mesma coisa: sobem a condição de descanso uma categoria.
  const temUpgradeDescanso = (f.origemPoder && f.origemPoder.nome==='Estoico') || nomesPoderesConhecidos(f).includes('Pajem');
  if(temUpgradeDescanso){
    const idx = ORDEM_QUALIDADE.indexOf(qualidade);
    if(idx>=0 && idx<ORDEM_QUALIDADE.length-1) qualidadeEfetiva = ORDEM_QUALIDADE[idx+1];
  }
  // Golem (Criatura Artificial) — texto oficial do livro (pág. 27): "recupera PV e PM por
  // descanso em condições normais (golens não são afetados por condições boas ou ruins de
  // descanso)". Ou seja: recupera os DOIS normalmente, só que sempre no ritmo Normal (×1), não
  // importa se ficou inerte num lugar ruim ou luxuoso.
  const mult = f.raca==='Golem' ? 1 : (QUALIDADE_DESCANSO[qualidadeEfetiva] || 1);
  let recuperacao = Math.floor(nivel*mult);
  // Rato das Ruas (Goblin, achado na mesma auditoria): "recuperação de PV/PM nunca menor que
  // seu nível" — um piso mínimo, útil principalmente num descanso Ruim (que normalmente seria
  // só metade do nível). Nunca tinha sido conectado.
  if(f.raca==='Goblin') recuperacao = Math.max(recuperacao, nivel);
  // Bônus guardado de itens tipo Prato do Aventureiro/Sopa de peixe/Gorlogg Ensopado (usados
  // antes de dormir) — "por nível", então multiplica pelo nível igual a recuperação normal.
  // Golem não se beneficia de itens de alimentação (o mesmo trecho do livro deixa isso claro),
  // então ignora qualquer bônus de comida guardado.
  const pendente = f._descansoBonusPendente || {pv:0, pm:0};
  const bonusPvComida = f.raca==='Golem' ? 0 : pendente.pv * nivel;
  const bonusPmComida = f.raca==='Golem' ? 0 : pendente.pm * nivel;
  f.pvatual = Math.min(pvMaxEfetivo(f), (parseInt(f.pvatual)||0)+recuperacao+bonusPvComida);
  f.pmatual = Math.min(pmMaxEfetivo(f), (parseInt(f.pmatual)||0)+recuperacao+bonusPmComida);
  if((parseInt(f.pvatual)||0) > 0) f.estabilizado = false;
  resetarUsoPoderes(f, ['cena','dia']); // uma noite de sono também encerra a cena atual
  const tinhaBonusComida = bonusPvComida>0 || bonusPmComida>0;
  f._descansoBonusPendente = {pv:0, pm:0};
  salvarPerfis(); render();
  const subiuPorEstoico = qualidadeEfetiva !== qualidade;
  flashMsg('🌙 Descanso '+qualidade.toLowerCase()+(subiuPorEstoico?' (elevado pra '+qualidadeEfetiva.toLowerCase()+')':'')+': +'+recuperacao+' PV e +'+recuperacao+' PM'+(f.raca==='Golem'?' (Golem — sempre no ritmo normal, não importa onde/como)':' (nível '+nivel+' × '+mult+')')
    + (tinhaBonusComida ? ' + '+bonusPvComida+' PV/'+bonusPmComida+' PM de comida guardada' : '') + '.');
}

function novaCena(f){
  resetarUsoPoderes(f, ['cena']);
  salvarPerfis(); render();
  flashMsg('🎬 Nova cena — poderes de uso "por cena" já podem ser usados de novo.');
}
