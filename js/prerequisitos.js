// Pré-requisitos de poderes, habilidades de nível e poderes conhecidos e ativos.
// Separado do js/app.js em 15/11/2026 (item 6 da revisão geral), sem mudar o código.

// ---- Verificador de pré-requisitos de poder ----
// O texto de pré-requisito é livre (copiado do livro), então a checagem só é "confiável" quando
// reconhece TODAS as cláusulas do texto num padrão conhecido — senão prefere não bloquear nada
// (melhor deixar escolher um poder que na verdade cumpre, do que travar um que a pessoa merece).
const NOMES_CLASSES_T20 = ['Arcanista','Bárbaro','Bardo','Bucaneiro','Caçador','Cavaleiro','Clérigo','Druida','Guerreiro','Inventor','Ladino','Lutador','Nobre','Paladino'];
function avaliarSubClausulaPrereq(f, texto){
  texto = texto.trim();
  if(!texto) return {ok:true, reconhecido:true};
  // "Nº nível de [classe]"
  let m = texto.match(/^(\d+)º nível de ([a-zà-ú]+)/i);
  if(m){
    const nivelExigido = parseInt(m[1]);
    const nomeAlvo = m[2].toLowerCase();
    const entrada = (f.classesNiveis||[]).find(c=>c.classe.toLowerCase()===nomeAlvo);
    return {ok:(entrada?entrada.nivel:0) >= nivelExigido, reconhecido:true};
  }
  // Atributo: "For 1", "Int 2"...
  m = texto.match(/^(For|Des|Con|Int|Sab|Car)\s+(-?\d+)$/i);
  if(m){
    const atual = parseInt(f[m[1].toLowerCase()])||0;
    return {ok: atual >= parseInt(m[2]), reconhecido:true};
  }
  // "treinado em X" ou "treinado em X e Y"
  m = texto.match(/^treinado em (.+)/i);
  if(m){
    const nomes = m[1].split(/ e /i).map(s=>s.trim()).filter(Boolean);
    const treinadas = periciasTreinadasComDivindade(f);
    // Se o pré-requisito pedir uma especialidade EXATA (ex: "Ofício (armeiro)"), precisa bater
    // certinho — não basta ter QUALQUER Ofício. Se pedir só o nome base (ex: "Ofício" sem
    // especificar qual), qualquer especialidade treinada já serve.
    return {ok: nomes.every(n=> n.includes('(') ? treinadas.has(n) : treinadas.has(nomeBasePericia(n))), reconhecido:true};
  }
  // Nome de classe isolado (precisa ter nível nela)
  const classeBatida = NOMES_CLASSES_T20.find(c=>c.toLowerCase()===texto.toLowerCase());
  if(classeBatida){
    return {ok:(f.classesNiveis||[]).some(c=>c.classe===classeBatida), reconhecido:true};
  }
  // Nome de poder específico já conhecido
  if(nomesPoderesConhecidos(f).some(n=> n.toLowerCase()===texto.toLowerCase())){
    return {ok:true, reconhecido:true};
  }
  // Pode ser um poder válido que a pessoa só ainda não tem — reconhecido, mas falha
  const eUmPoderValido = PODERES_GERAIS.some(p=>p.nome.toLowerCase()===texto.toLowerCase())
    || Object.values(PODERES_CLASSE_COMPLETO).some(lista=>lista.some(p=>p.nome.toLowerCase()===texto.toLowerCase()));
  if(eUmPoderValido) return {ok:false, reconhecido:true};
  return {ok:true, reconhecido:false};
}

function avaliarClausulaPrereq(f, clausula){
  clausula = clausula.trim();
  if(clausula.includes(' ou ')){
    const alternativas = clausula.split(' ou ').map(s=>avaliarSubClausulaPrereq(f,s));
    return {ok: alternativas.some(a=>a.ok), reconhecido: alternativas.every(a=>a.reconhecido)};
  }
  return avaliarSubClausulaPrereq(f, clausula);
}

// Retorna {confiavel, cumpre} — só use "cumpre" pra bloquear seleção se confiavel===true.
function avaliarPrerequisito(f, prereqTexto){
  if(!prereqTexto) return {confiavel:true, cumpre:true};
  const textoLimpo = prereqTexto.replace(/^e\s+/i,'').replace(/\.\s*$/,'').trim();
  const partes = textoLimpo.split(',').map(s=>s.trim()).filter(Boolean);
  const resultados = partes.map(p=>avaliarClausulaPrereq(f,p));
  return {
    confiavel: resultados.every(r=>r.reconhecido),
    cumpre: resultados.every(r=>r.ok),
  };
}

// Extrai habilidades automáticas ganhas em cada nível (tipo "Durão" no 3º de guerreiro,
// "Ataque Extra" no 6º) que NÃO são a escolha de "poder de classe" — achado numa auditoria: o
// texto completo de cada nível (historicoNiveis[].ganho) sempre foi guardado, mas só a parte
// "poder de X" (a escolha) virava algo visível na ficha. O resto (ex: "Durão, poder de
// guerreiro" → só "poder de guerreiro" virava escolha, "Durão" sumia) nunca aparecia em lugar
// nenhum. Calculado na hora a partir do historicoNiveis — funciona até pra fichas que já
// subiram de nível antes dessa correção existir, sem precisar migrar dado nenhum.
// Descrições reais das habilidades automáticas ganhas em cada nível de classe (Durão, Fúria,
// Evasão, etc.) — extraídas do livro oficial. Cobre as mais comuns entre as 70 que existem no
// jogo; pra quem ainda não está aqui, cai num aviso honesto pra checar o livro em vez de
// inventar texto. Chave é o nome BASE, sem o número/sufixo (ex: "Ataque furtivo", não "Ataque
// furtivo +3d6" — o valor específico do personagem já aparece no nome mostrado).
const DESC_HABILIDADE_NIVEL = {
  "Abençoado": "Você soma seu Carisma no seu total de pontos de mana no 1º nível. Além disso, torna-se devoto de um deus disponível para paladinos (Azgher, Khalmyr, Lena, Lin-Wu, Marah, Tanna-Toh, Thyatis, Valkaria). Veja as regras de devotos na página 96. Ao contrário de devotos normais, você recebe dois poderes concedidos por se tornar devoto, em vez de apenas um. Como alternativa, você pode ser um paladino do bem, lutando em prol da bondade e da justiça como um todo. Não recebe nenhum Poder Concedido, mas não precisa seguir nenhuma Obrigação & Restrição (além do Código do Herói, abaixo).",
  "Ataque especial": "Gasta 1 PM num ataque pra receber +4 no teste de ataque ou na rolagem de dano (pode dividir os bônus). A cada 4 níveis, pode gastar +1 PM extra pra +4 a mais.",
  "Ataque furtivo": "Uma vez por rodada, quando atinge uma criatura desprevenida com um ataque corpo a corpo ou em alcance curto, ou uma criatura que esteja flanqueando, você causa dano extra (a cada dois níveis, esse dano aumenta em +1d6). Criatura imune a acertos críticos também é imune a isso.",
  "Audácia": "Quando faz um teste de perícia, você pode gastar 2 PM para somar seu Carisma no teste. Você não pode usar esta habilidade em testes de ataque.",
  "Aura sagrada": "Gasta 1 PM pra gerar uma aura com 9m de raio a partir de você.",
  "Autoconfiança": "Você pode usar seu Carisma em vez de Destreza na Defesa (mas continua não podendo somar um atributo na Defesa quando usa armadura pesada).",
  "Baluarte": "Quando sofre um ataque ou faz um teste de resistência, você pode gastar 1 PM para receber +2 na Defesa e nos testes de resistência até o início do seu próximo turno. A cada quatro níveis, pode gastar +1 PM para aumentar o bônus em +2.",
  "Briga": "Seus ataques desarmados causam 1d6 pontos de dano e podem causar dano letal ou não letal (sem penalidades). A cada quatro níveis, seu dano desarmado aumenta, conforme a tabela.",
  "Bênção da justiça": "Escolhe entre Égide Sagrada e Montaria Sagrada (escolha permanente, não muda depois).",
  "Campeão": "No 20º nível, o dano de todos os seus ataques aumenta em um passo. Além disso, sempre que você faz um Ataque Especial ou um Golpe Pessoal e acerta o ataque, recupera metade dos PM gastos nele. Por exemplo, se fizer um Ataque Especial gastando 5 PM para ganhar +20 nas rolagens de dano e acertar o ataque, recupera 2 PM.",
  "Casca grossa": "Soma sua Constituição na Defesa, limitado pelo seu nível e só se não estiver usando armadura pesada. A partir do 7º nível, e a cada quatro níveis, +1 na Defesa (fixo, independente da Constituição).",
  "Comerciante": "No 3º nível, você pode vender itens 10% mais caro (não cumulativo com barganha).",
  "Cura pelas mãos": "Gasta uma ação de movimento e 1 PM pra curar 1d8+1 PV por luz num alvo em alcance corpo a corpo (incluindo você). A cada quatro níveis, pode gastar +1 PM extra pra curar +1d8+1. Causa dano de luz a mortos-vivos (CD Car). A partir do 6º nível, +1 PM anula uma condição do alvo (abalado, apavorado, atordoado, cego, doente, exausto, fatigado ou surdo).",
  "Código do herói": "Precisa sempre manter sua palavra e nunca recusar um pedido de ajuda de alguém inocente. Nunca pode mentir, trapacear ou roubar. Se violar, perde todos os PM e só recupera a partir do dia seguinte.",
  "Devoto fiel": "Se torna devoto de um deus maior, recebendo DOIS poderes concedidos em vez de um (ou pode cultuar o Panteão inteiro, sem poder concedido, com a restrição de não usar armas cortantes/perfurantes).",
  "Duelo": "A partir do 2º nível, você pode gastar 2 PM para escolher um oponente em alcance curto e receber +2 em testes de ataque e rolagens de dano contra ele até o fim da cena. Se atacar outro oponente, o bônus termina. A cada cinco níveis, você pode gastar +1 PM para aumentar o bônus em +1.",
  "Durão": "A partir do 3º nível, sua rijeza muscular permite que você absorva ferimentos. Sempre que sofre dano, você pode gastar 3 PM para reduzir esse dano à metade.",
  "Eclético": "A partir do 2º nível, quando vai fazer um teste de perícia, você pode gastar 1 PM para receber os benefícios de ser treinado nessa perícia para este teste.",
  "Engenhosidade": "Quando faz um teste de perícia, você pode gastar 2 PM para somar sua",
  "Especialista": "Escolha um número de perícias treinadas igual a sua Inteligência, exceto bônus temporários (mínimo 1). Ao fazer um teste de uma dessas perícias, você pode gastar 1 PM para dobrar seu bônus de treinamento. Você não pode usar esta habilidade em testes de ataque.",
  "Espólio": "Você recebe um item a sua escolha com preço de até T$ 2.000.",
  "Evasão": "Quando sofre um efeito que permite um teste de Reflexos pra reduzir o dano à metade, você não sofre dano nenhum se passar (sofre o normal se falhar). Exige liberdade de movimentos — não funciona com armadura pesada ou na condição imóvel.",
  "Evasão aprimorada": "Quando sofre um efeito que permite um teste de Reflexos pra reduzir o dano à metade, você não sofre dano nenhum se passar, e sofre só metade se falhar. Exige liberdade de movimentos — não funciona com armadura pesada ou na condição imóvel.",
  "Explorador": "No 3º nível, escolha um tipo de terreno entre aquático, ártico, colina, deserto, floresta, montanha, pântano, planície, subterrâneo ou urbano. A partir do 11º nível, você também pode escolher área de Tormenta. Quando estiver no tipo de terreno escolhido, você soma sua Sabedoria (mínimo +1) na Defesa e nos testes de Acrobacia,",
  "Força da natureza": "Diminui o custo de todas as suas magias em –2 PM e aumenta a CD delas em +2 (dobra pra –4 PM/+4 CD em terrenos naturais).",
  "Fúria": "Pode gastar 2 PM pra invocar uma fúria selvagem: +2 em testes de ataque e rolagens de dano corpo a corpo, mas não pode fazer nada que exija calma (Furtividade, lançar magias). A cada cinco níveis, pode gastar +1 PM extra pra +1 nos bônus. Termina se você não atacar nem for alvo de algo hostil no fim da rodada.",
  "Fúria titânica": "O bônus que você recebe nos testes de ataque e rolagens de dano usando Fúria é dobrado.",
  "Golpe cruel": "Sua margem de ameaça com ataques desarmados aumenta em +1.",
  "Golpe divino": "Ao fazer um ataque corpo a corpo, pode gastar 2 PM pra um golpe destruidor: soma Carisma no teste de ataque e +1d8 no dano. A cada quatro níveis, pode gastar +1 PM extra pra +1d8 a mais no dano.",
  "Golpe relâmpago": "Quando usa a ação agredir pra fazer um ataque desarmado, pode gastar 1 PM pra fazer um ataque desarmado adicional.",
  "Golpe violento": "Seu multiplicador de crítico com ataques desarmados aumenta em +1.",
  "Insolência": "Você soma seu Carisma na Defesa, limitado pelo seu nível. Esta habilidade exige liberdade de movimentos; você não pode usá-la se estiver de armadura pesada ou na condição imóvel.",
  "Inspiração": "Você pode gastar uma ação padrão e 2 PM para inspirar as pessoas com sua arte. Você e todos os seus aliados em alcance curto ganham +1 em testes de perícia até o fim da cena. A cada quatro níveis, pode gastar +2 PM para aumentar o bônus em +1.",
  "Instinto selvagem": "+1 em rolagens de dano, Percepção e Reflexos. A cada seis níveis, esse bônus aumenta em +1.",
  "Marca da presa": "Gasta uma ação de movimento e 1 PM pra analisar uma criatura em alcance curto. Até o fim da cena, +1d4 nas rolagens de dano contra ela. A cada quatro níveis, pode gastar +1 PM extra pra aumentar esse bônus de dano.",
  "Mão da divindade": "Gasta uma ação completa e 15 PM pra canalizar energia divina: lança três magias divinas quaisquer (qualquer círculo, mesmo que não conheça) como ação livre e sem gastar PM (mas paga outros custos, como aprimoramentos). Depois fica atordoado por 1d4 rodadas.",
  "Orgulho": "Quando faz um teste de perícia, você pode gastar uma quantidade de PM a sua escolha (limitado pelo seu Carisma). Para cada PM que gastar, recebe +2 no teste.",
  "Panache": "A partir do 5º nível, sempre que faz um acerto crítico em combate ou reduz um inimigo a 0 PV, você recupera 1 PM.",
  "Protótipo": "Você começa o jogo com um item superior, ou com 10 itens alquímicos, com preço total de até T$ 500. Veja o Capítulo 3: Equipamento para a lista de itens.",
  "Rastreador": "+2 em Sobrevivência. Além disso, pode se mover no deslocamento normal enquanto rastreia, sem penalidade.",
  "Realeza": "No 20º nível, a CD para resistir a sua Presença Aristocrática aumenta em +5 e uma criatura que falhe no teste de Vontade por 10 ou mais se arrepende tanto de ter tentado machucá-lo que passa a lutar ao seu lado (e seguir suas ordens, se puder entendê-lo) pelo resto da cena. Além disso, uma criatura que seja reduzida a 0 PV por Palavras Afiadas não sofre este dano; em vez disso, passa a lutar ao seu lado pelo resto da cena.",
  "Redução de dano": "Redução de dano 2 (todo dano sofrido é reduzido em 2). A cada três níveis, a RD aumenta em 2, até um máximo de RD 10 no 17º nível.",
  "Resoluto": "A partir do 11º nível, você pode gastar 1 PM para refazer um teste de resistência contra uma condição (como abalado, paralisado etc.) que o esteja afetando. O segundo teste recebe um bônus de +5 e, se você passar, cancela o efeito. Você só pode usar esta habilidade uma vez por efeito.",
  "Riqueza": "No 3º nível, você passa a receber dinheiro de sua família, patrono ou negócios. Uma vez por aventura, pode fazer um teste de Carisma com um bônus igual ao seu nível de nobre. Você recebe um número de Tibares de ouro igual ao resultado do teste. Assim, um nobre de 5º nível com Carisma 4 que role 13 no dado recebe 22 TO. O uso desta habilidade é condicionado a sua relação com sua família, patrono ou negócios e a onde você está. Por exemplo, um nobre viajando pelos ermos, isolado da civilização, dificilmente teria como receber dinheiro.",
  "Sorte de Nimb": "No 20º nível, você encara os piores desafios e ri na cara deles — pois sabe que tem a sorte ao seu lado. Quando faz um teste, você pode gastar 5 PM para rolá-lo novamente. Qualquer resultado 11 ou mais na segunda rolagem será considerado um 20 natural.",
  "Vingador sagrado": "Gasta uma ação completa e 10 PM pra se cobrir de energia divina, virando um vingador sagrado até o fim da cena: deslocamento de voo 18m e redução de dano 20. Seu Golpe Divino custa metade e causa +2 dados de dano.",
  "A pessoa certa para o trabalho": "Você se torna um mestre da ladinagem. Ao fazer um ataque furtivo ou usar uma perícia da lista de ladino, pode gastar 5 PM pra receber +10 no teste.",
  "Alta arcana": "Seu domínio das artes arcanas é total. O custo em PM das suas magias arcanas é reduzido à metade (depois de aplicar aprimoramentos e outros efeitos que reduzem custo).",
  "Artista completo": "Pode usar Inspiração como ação livre. Enquanto estiver sob efeito da sua Inspiração, suas habilidades de bardo (inclusive magias) têm o custo em PM reduzido pela metade (depois de aplicar aprimoramentos e outros efeitos que reduzem custo).",
  "Ataque extra": "Quando usa a ação agredir, pode gastar 2 PM pra realizar um ataque adicional, uma vez por rodada.",
  "Bravura final": "Sua virtude vence a morte. Se for reduzido a 0 ou menos PV, pode gastar 3 PM pra continuar consciente e de pé (duração sustentada — quando termina, sofre os efeitos dos PV atuais normalmente, podendo cair inconsciente ou morrer).",
  "Caminho do arcanista": "Escolha entre Bruxo, Mago ou Feiticeiro — cada um lança magia de um jeito diferente (foco, livro/tomo, ou inato). Escolha permanente, não muda depois. Veja o Caminho escolhido na ficha pra detalhes específicos.",
  "Caminho do cavaleiro": "Escolhe entre Bastião (RD 5 usando armadura pesada, cumulativa com Especialização em Armadura) ou Montaria (cavalo de guerra com +5 em Adestramento e Cavalgar, funciona como parceiro veterano).",
  "Caminho do explorador": "Pode atravessar terrenos difíceis sem perder deslocamento, e a CD pra te rastrear aumenta em +10 — só funciona nos terrenos em que tiver a habilidade Explorador.",
  "Caminho dos ermos": "Pode atravessar terrenos difíceis sem perder deslocamento, e a CD pra te rastrear aumenta em +10 — só funciona em terrenos naturais.",
  "Código de honra": "Não pode atacar um oponente pelas costas (sem bônus de flanquear), caído, desprevenido ou incapaz de lutar. Se violar, perde todos os PM e só recupera a partir do dia seguinte.",
  "Dono da rua": "Seu dano desarmado aumenta pra 2d10 (criaturas Médias). Além disso, ao usar a ação agredir pra um ataque desarmado, pode fazer dois ataques em vez de um (podendo usar Golpe Relâmpago pra um terceiro).",
  "Empatia selvagem": "Pode se comunicar com animais por linguagem corporal e vocalizações; pode usar Adestramento pra mudar atitude/persuasão com animais. Se receber essa habilidade de novo, +2 em Adestramento.",
  "Encontrar fraqueza": "Gasta uma ação de movimento e 2 PM pra analisar um objeto em alcance curto — ignora a redução de dano dele. Também serve pra achar fraqueza num inimigo: se estiver de armadura ou for construto, +2 nos testes de ataque contra ele. Dura até o fim da cena.",
  "Esquiva sagaz": "+1 na Defesa e em Reflexos. Esse bônus aumenta em +1 a cada quatro níveis. Exige liberdade de movimentos — não funciona com armadura pesada ou na condição imóvel.",
  "Esquiva sobrenatural": "Você nunca fica surpreendido.",
  "Fabricar item mágico": "Recebe um item mágico menor e passa a poder fabricar itens mágicos menores. Nos níveis 13 e 17, pode trocar por um item mágico médio e maior (e passa a fabricar dessas categorias).",
  "Fabricar item superior": "Recebe um item superior de até T$ 2.000 e passa a poder fabricar itens superiores com uma melhoria. Nos níveis 5, 8 e 11, pode trocar por um item com duas, três e quatro melhorias (e passa a fabricar assim).",
  "Gritar ordens": "Gasta uma quantidade de PM à sua escolha (limitado pelo seu Carisma). Até o início do seu próximo turno, todos os aliados em alcance curto recebem um bônus nos testes de perícia igual ao PM gasto.",
  "Mestre caçador": "Pode usar Marca da Presa como ação livre. Além disso, ao usar essa habilidade, pode pagar 5 PM pra aumentar a margem de ameaça contra a criatura em +2. Se reduzir a 0 PV uma criatura marcada, recupera 5 PM.",
  "Obra-prima": "Você fabrica sua obra-prima — livre pra criar as regras do item (precisa ser aprovado pelo Mestre), equivalente a um item com cinco melhorias e quatro encantos. Não gasta dinheiro, tempo nem PM nele.",
  "Olho do dragão": "Gasta uma ação completa pra analisar um item. Descobre automaticamente se é mágico, suas propriedades, e como usá-las.",
  "Olhos nas costas": "Você não pode ser flanqueado.",
  "Palavras afiadas": "Gasta uma ação padrão e 1 PM pra um teste de Diplomacia ou Intimidação oposto ao Vontade de uma criatura inteligente (Int –3 ou maior) em alcance curto. Se vencer, causa dano psíquico não letal (veja a tabela da classe pro valor); se perder, causa metade. Se a criatura chegar a 0 PV, se rende em vez de cair inconsciente.",
  "Presença aristocrática": "Quando uma criatura inteligente tenta te machucar (ataque, magia ou habilidade), pode gastar 2 PM: ela faz um teste de Vontade (CD Car) — se falhar, não consegue te machucar e perde a ação. Só uma vez por cena contra cada criatura.",
};

function habilidadesAutomaticasDeNiveis(f){
  const resultado = [];
  (f.historicoNiveis||[]).forEach(h=>{
    if(!h.ganho) return;
    h.ganho.split(',').forEach(pedaco=>{
      const texto = pedaco.trim();
      if(!texto) return;
      if(/poder de/i.test(texto)) return; // isso já aparece separado, como o poder escolhido
      if(/círculo/i.test(texto)) return; // progressão de magia já aparece na aba Magias — pega tanto "1º círculo" quanto "magias (1º círculo)"
      // Nome BASE (sem número/sufixo) pra achar no dicionário de descrições — ex: "Ataque
      // furtivo +3d6" vira "Ataque furtivo" pra bater com a chave da tabela.
      let base = texto.replace(/\s*[\+\-]?\s*\d+[dº°]?\d*\s*$/, '').replace(/\s*\([^)]*\)\s*$/, '').trim();
      base = base ? base[0].toUpperCase()+base.slice(1) : base;
      const desc = DESC_HABILIDADE_NIVEL[base] || DESC_HABILIDADE_NIVEL[texto] || null;
      resultado.push({nome:texto, fonte:'Nível '+h.nivel+' de '+h.classe, desc});
    });
  });
  return resultado;
}

function nomesPoderesConhecidos(f){
  const nomes = [];
  if(f.poderGeral) nomes.push(f.poderGeral.sub || f.poderGeral.nome);
  if(f.poderGeralExtra) nomes.push(f.poderGeralExtra.sub || f.poderGeralExtra.nome);
  if(f.poderRaca) nomes.push(f.poderRaca.sub || f.poderRaca.nome);
  if(f.origemPoder) nomes.push(f.origemPoder.nome); // poder único da origem — não é poder geral, mas conta como conhecido
  (f.poderesClasse||[]).forEach(p=>{ if(p.nome) nomes.push(p.sub || p.nome); });
  (f.deformidadeEscolhas||[]).forEach(esc=>{ if(esc.tipo==='tormenta') nomes.push(esc.valor); });
  return nomes.filter(Boolean);
}

// Nomes de poderes gerais ativos no personagem, para efeitos mecânicos (Defesa, perícias, etc.)
// Não inclui o poder único de origem, pois esses têm efeitos totalmente específicos tratados à parte.
function poderesAtivos(f){
  const nomes = [];
  if(f.poderGeral) nomes.push(f.poderGeral.sub || f.poderGeral.nome);
  if(f.poderGeralExtra) nomes.push(f.poderGeralExtra.sub || f.poderGeralExtra.nome);
  if(f.poderRaca) nomes.push(f.poderRaca.sub || f.poderRaca.nome);
  (f.poderesClasse||[]).forEach(p=>{ if(!p.trocaPorGeral) return; nomes.push(p.sub || p.nome); });
  (f.poderesClasse||[]).forEach(p=>{ if(p.trocaPorGeral) return; if(p.nome) nomes.push(p.nome); });
  (f.deformidadeEscolhas||[]).forEach(esc=>{ if(esc.tipo==='tormenta') nomes.push(esc.valor); });
  return nomes.filter(Boolean);
}
