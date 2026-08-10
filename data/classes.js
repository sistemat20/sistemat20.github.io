// Dados de Classes — Tormenta 20 (Livro Básico, Capítulos 1 e Classes)
function T(nivel, hab){ return {nivel, hab}; }

const CLASSES = {
"Arcanista":{
  tradicao:"arcana", papel:"Dano mágico e utilidade — a maior variedade de magias arcanas do jogo.",
  dica:"Escolha entre Bruxo (foco), Feiticeiro (magia no sangue) ou Mago (grimório) — isso define como você aprende e troca magias.",
  tabela:[T(1,"Caminho do arcanista, magias (1º círculo)"),T(2,"Poder de arcanista"),T(3,"Poder de arcanista"),T(4,"Poder de arcanista"),T(5,"Magias (2º círculo), poder de arcanista"),T(6,"Poder de arcanista"),T(7,"Poder de arcanista"),T(8,"Poder de arcanista"),T(9,"Magias (3º círculo), poder de arcanista"),T(10,"Poder de arcanista"),T(11,"Poder de arcanista"),T(12,"Poder de arcanista"),T(13,"Magias (4º círculo), poder de arcanista"),T(14,"Poder de arcanista"),T(15,"Poder de arcanista"),T(16,"Poder de arcanista"),T(17,"Magias (5º círculo), poder de arcanista"),T(18,"Poder de arcanista"),T(19,"Poder de arcanista"),T(20,"Alta arcana, poder de arcanista")],
  poderes:[["Arcano de Batalha","soma seu atributo-chave no dano das magias que lança"],["Conhecimento Mágico","aprende duas magias novas de qualquer círculo que possa lançar"],["Especialista em Escola","escolhe uma escola de magia e fica mais difícil de resistir a ela",{tipo:"escola",label:"Qual escola de magia?"}],["Escriba Arcano","aprende magias copiando pergaminhos e grimórios de outros magos"]]
},
"Bárbaro":{
  tradicao:null, papel:"Dano corpo a corpo bruto e resistência através da Fúria.",
  dica:"Sua Fúria concede bônus temporários mas penaliza a Defesa — planeje quando ativá-la.",
  tabela:[T(1,"Fúria +2"),T(2,"Poder de bárbaro"),T(3,"Instinto selvagem +1, poder de bárbaro"),T(4,"Poder de bárbaro"),T(5,"Poder de bárbaro, redução de dano 2"),T(6,"Fúria +3, poder de bárbaro"),T(7,"Poder de bárbaro"),T(8,"Poder de bárbaro, redução de dano 4"),T(9,"Instinto selvagem +2, poder de bárbaro"),T(10,"Poder de bárbaro"),T(11,"Fúria +4, poder de bárbaro, redução de dano 6"),T(12,"Poder de bárbaro"),T(13,"Poder de bárbaro"),T(14,"Poder de bárbaro, redução de dano 8"),T(15,"Instinto selvagem +3, poder de bárbaro"),T(16,"Fúria +5, poder de bárbaro"),T(17,"Poder de bárbaro, redução de dano 10"),T(18,"Poder de bárbaro"),T(19,"Poder de bárbaro"),T(20,"Fúria titânica, poder de bárbaro")],
  poderes:[["Alma de Bronze","ao entrar em fúria, ganha pontos de vida temporários"],["Crítico Brutal","aumenta o multiplicador de crítico em combate corpo a corpo"],["Espírito Inquebrável","não desmaia com 0 PV enquanto estiver em fúria"],["Força Indomável","gasta PM para somar seu nível em testes de Força/Atletismo"]]
,
  habilidadesClasse:[["Fúria","Gasta 2 PM pra entrar em fúria: +2 em testes de ataque e rolagens de dano corpo a corpo, mas não pode fazer ações que exijam calma (Furtividade, lançar magia). A cada 5 níveis, pode gastar +1 PM pra aumentar os bônus em +1. Termina se, no fim da rodada, você não atacou nem foi alvo de um efeito hostil."]]
},
"Bardo":{
  tradicao:"arcana", papel:"Suporte versátil — inspira aliados e lança magias arcanas.",
  dica:"Use Inspiração antes do combate começar para já entrar com o bônus valendo para o grupo.",
  tabela:[T(1,"Inspiração +1, magias (1º círculo)"),T(2,"Poder de bardo, eclético"),T(3,"Poder de bardo"),T(4,"Poder de bardo"),T(5,"Inspiração +2, poder de bardo"),T(6,"Magias (2º círculo), poder de bardo"),T(7,"Poder de bardo"),T(8,"Poder de bardo"),T(9,"Inspiração +3, poder de bardo"),T(10,"Magias (3º círculo), poder de bardo"),T(11,"Poder de bardo"),T(12,"Poder de bardo"),T(13,"Inspiração +4, poder de bardo"),T(14,"Magias (4º círculo), poder de bardo"),T(15,"Poder de bardo"),T(16,"Poder de bardo"),T(17,"Inspiração +5, poder de bardo"),T(18,"Poder de bardo"),T(19,"Poder de bardo"),T(20,"Artista completo, poder de bardo")],
  poderes:[["Inspiração Marcial","aliados aplicam o bônus de Inspiração também no dano"],["Golpe Mágico","ganha PM extras ao acertar ataques corpo a corpo inspirado"],["Prestidigitação","pode lançar magias mais rápido usando um teste de Atuação"],["Lendas e Histórias","vira uma enciclopédia viva de conhecimento útil"]]
,
  habilidadesClasse:[["Inspiração","Gasta uma ação padrão e 2 PM pra inspirar: você e aliados em alcance curto ganham +1 em testes de perícia até o fim da cena. A cada 4 níveis, pode gastar +2 PM extras pra aumentar o bônus em +1."]]
},
"Bucaneiro":{
  tradicao:null, papel:"Combate ágil com espadas, promessas ousadas (bravatas) e esquiva.",
  dica:"Faça bravatas compatíveis com o desafio real da cena — cumpri-las dá bônus até o fim da aventura.",
  tabela:[T(1,"Audácia, insolência"),T(2,"Evasão, poder de bucaneiro"),T(3,"Esquiva sagaz +1, poder de bucaneiro"),T(4,"Poder de bucaneiro"),T(5,"Panache, poder de bucaneiro"),T(6,"Poder de bucaneiro"),T(7,"Esquiva sagaz +2, poder de bucaneiro"),T(8,"Poder de bucaneiro"),T(9,"Poder de bucaneiro"),T(10,"Evasão aprimorada, poder de bucaneiro"),T(11,"Esquiva sagaz +3, poder de bucaneiro"),T(12,"Poder de bucaneiro"),T(13,"Poder de bucaneiro"),T(14,"Poder de bucaneiro"),T(15,"Esquiva sagaz +4, poder de bucaneiro"),T(16,"Poder de bucaneiro"),T(17,"Poder de bucaneiro"),T(18,"Poder de bucaneiro"),T(19,"Esquiva sagaz +5, poder de bucaneiro"),T(20,"Poder de bucaneiro, sorte de Nimb")],
  poderes:[["En Garde","assume postura de duelo e ganha bônus de Defesa"],["Esgrimista","soma Inteligência no dano com armas leves/ágeis"],["Flagelo dos Mares","aprende a lançar Amedrontar sem ser magia"]]
,
  habilidadesClasse:[["Audácia","Gasta 2 PM pra somar seu Carisma num teste de perícia (não em testes de ataque)."],["Insolência","Soma seu Carisma na Defesa, limitado pelo seu nível. Exige liberdade de movimentos — não funciona de armadura pesada ou na condição imóvel."],["Evasão","A partir do 2º nível: quando um efeito permite um teste de Reflexos pra reduzir o dano à metade, se passar você não sofre dano nenhum (se falhar, sofre o dano normal). Exige liberdade de movimentos."]]
},
"Caçador":{
  tradicao:null, papel:"Rastreador e combatente à distância, com um companheiro animal.",
  dica:"Marca da Presa é seu foco principal — use nela contra o inimigo mais perigoso da cena.",
  tabela:[T(1,"Marca da presa +1d4, rastreador"),T(2,"Poder de caçador"),T(3,"Explorador, poder de caçador"),T(4,"Poder de caçador"),T(5,"Caminho do explorador, marca da presa +1d8, poder de caçador"),T(6,"Poder de caçador"),T(7,"Explorador, poder de caçador"),T(8,"Poder de caçador"),T(9,"Marca da presa +1d12, poder de caçador"),T(10,"Poder de caçador"),T(11,"Explorador, poder de caçador"),T(12,"Poder de caçador"),T(13,"Marca da presa +2d8, poder de caçador"),T(14,"Poder de caçador"),T(15,"Explorador, poder de caçador"),T(16,"Poder de caçador"),T(17,"Marca da presa +2d10, poder de caçador"),T(18,"Poder de caçador"),T(19,"Explorador, poder de caçador"),T(20,"Mestre caçador, poder de caçador")],
  poderes:[["Companheiro Animal","ganha um animal parceiro para lutar ao seu lado"],["Elo com a Natureza","aprende Caminhos da Natureza e ganha mais PM"],["Escaramuça","bônus de Defesa e dano ao se mover 6m ou mais"],["Empatia Selvagem","conversa com animais por gestos e sons"]]
,
  habilidadesClasse:[["Marca da Presa","Gasta uma ação de movimento e 1 PM pra marcar uma criatura em alcance curto: +1d4 nas rolagens de dano contra ela até o fim da cena. A cada 4 níveis, pode gastar +1 PM pra aumentar o dano extra."],["Rastreador","+2 em Sobrevivência. Pode se mover no deslocamento normal enquanto rastreia, sem penalidade no teste."]]
},
"Cavaleiro":{
  tradicao:null, papel:"Combate montado e liderança — protege aliados com Baluarte.",
  dica:"Baluarte reduz o dano dos aliados perto de você — fique posicionado à frente do grupo.",
  tabela:[T(1,"Baluarte +2, código de honra"),T(2,"Duelo +2, poder de cavaleiro"),T(3,"Poder de cavaleiro"),T(4,"Poder de cavaleiro"),T(5,"Caminho do cavaleiro, baluarte +4, poder de cavaleiro"),T(6,"Poder de cavaleiro"),T(7,"Baluarte (aliados adjacentes), duelo +3, poder de cavaleiro"),T(8,"Poder de cavaleiro"),T(9,"Baluarte +6, poder de cavaleiro"),T(10,"Poder de cavaleiro"),T(11,"Poder de cavaleiro, resoluto"),T(12,"Duelo +4, poder de cavaleiro"),T(13,"Baluarte +8, poder de cavaleiro"),T(14,"Poder de cavaleiro"),T(15,"Baluarte (aliados em alcance curto), poder de cavaleiro"),T(16,"Poder de cavaleiro"),T(17,"Baluarte +10, duelo +5, poder de cavaleiro"),T(18,"Poder de cavaleiro"),T(19,"Poder de cavaleiro"),T(20,"Bravura final, poder de cavaleiro")],
  poderes:[["Escudeiro","ganha um ajudante que cuida do equipamento e dá bônus"],["Estandarte","sua flâmula dá PM temporários aos aliados no início da cena"],["Investida Destruidora","gasta PM para causar mais dano na ação investida"],["Etiqueta","bônus em Diplomacia e Nobreza"]]
,
  habilidadesClasse:[["Código de Honra","Não pode atacar um oponente pelas costas (sem bônus de flanquear), caído, desprevenido ou incapaz de lutar. Violar o código faz perder todos os PM até o próximo dia."],["Baluarte","Gasta 1 PM (reação) pra receber +2 na Defesa e em testes de resistência até o início do seu próximo turno. A cada 4 níveis, pode gastar +1 PM extra pra +2 a mais. A partir do 7º nível, pode estender o bônus a aliados adjacentes (+2 PM); a partir do 15º, a aliados em alcance curto (+5 PM)."],["Duelo","A partir do 2º nível: gasta 2 PM pra escolher um oponente em alcance curto e receber +2 em testes de ataque e dano contra ele até o fim da cena."]]
},
"Clérigo":{
  tradicao:"divina", papel:"Curandeiro e conjurador divino — pode conceder o milagre certo na hora certa.",
  dica:"Guarde ao menos uma magia de cura preparada mentalmente antes de cada combate difícil.",
  tabela:[T(1,"Devoto fiel, magias (1º círculo)"),T(2,"Poder de clérigo"),T(3,"Poder de clérigo"),T(4,"Poder de clérigo"),T(5,"Magias (2º círculo), poder de clérigo"),T(6,"Poder de clérigo"),T(7,"Poder de clérigo"),T(8,"Poder de clérigo"),T(9,"Magias (3º círculo), poder de clérigo"),T(10,"Poder de clérigo"),T(11,"Poder de clérigo"),T(12,"Poder de clérigo"),T(13,"Magias (4º círculo), poder de clérigo"),T(14,"Poder de clérigo"),T(15,"Poder de clérigo"),T(16,"Poder de clérigo"),T(17,"Magias (5º círculo), poder de clérigo"),T(18,"Poder de clérigo"),T(19,"Poder de clérigo"),T(20,"Mão da divindade, poder de clérigo")],
  poderes:[["Conhecimento Mágico","aprende duas magias divinas novas de qualquer círculo que possa lançar"],["Expulsar/Comandar Mortos-Vivos","afasta ou domina mortos-vivos próximos"],["Comunhão Vital","ao curar alguém, pode espalhar parte da cura a outro aliado"],["Canalizar Amplo","aumenta o alcance de Canalizar Energia"]]
,
  habilidadesClasse:[["Devoto Fiel","Ao se tornar devoto, recebe DOIS Poderes Concedidos (em vez de só um, como devotos normais). Como alternativa, pode cultuar o Panteão como um todo: sem Poder Concedido, mas a única obrigação é não usar armas cortantes/perfurantes; arma preferida maça, e escolhe canalizar energia positiva ou negativa pra sempre."]]
},
"Druida":{
  tradicao:"divina", papel:"Guardião da natureza — magias divinas, Forma Selvagem e companheiro animal.",
  dica:"Empatia Selvagem e o companheiro animal já funcionam desde o 1º nível — use-os para explorar e negociar.",
  tabela:[T(1,"Devoto fiel, empatia selvagem, magias (1º círculo)"),T(2,"Caminho dos ermos, poder de druida"),T(3,"Poder de druida"),T(4,"Poder de druida"),T(5,"Poder de druida"),T(6,"Magias (2º círculo), poder de druida"),T(7,"Poder de druida"),T(8,"Poder de druida"),T(9,"Poder de druida"),T(10,"Magias (3º círculo), poder de druida"),T(11,"Poder de druida"),T(12,"Poder de druida"),T(13,"Poder de druida"),T(14,"Magias (4º círculo), poder de druida"),T(15,"Poder de druida"),T(16,"Poder de druida"),T(17,"Poder de druida"),T(18,"Poder de druida"),T(19,"Poder de druida"),T(20,"Força da natureza, poder de druida")],
  poderes:[["Companheiro Animal","ganha um animal parceiro para lutar ao seu lado"],["Forma Primal","ao usar Forma Selvagem, combina benefícios de dois tipos de animal"],["Espírito dos Solstícios","gasta PM extra para maximizar o efeito numérico de uma magia"],["Coração da Selva","fica mais resistente a venenos e efeitos causam menos dano extra"]]
,
  habilidadesClasse:[["Devoto Fiel","Devoto de Allihanna, Megalokk ou Oceano — recebe DOIS Poderes Concedidos (em vez de só um)."],["Empatia Selvagem","Pode se comunicar com animais por linguagem corporal e vocalizações; pode usar Adestramento pra mudar a atitude deles."]]
},
"Guerreiro":{
  tradicao:null, papel:"Especialista em combate com qualquer arma — dano consistente e versátil.",
  dica:"Escolha uma arma principal e invista em Especialização/Mestre em Arma nela assim que possível.",
  tabela:[T(1,"Ataque especial +4"),T(2,"Poder de guerreiro"),T(3,"Durão, poder de guerreiro"),T(4,"Poder de guerreiro"),T(5,"Ataque especial +8, poder de guerreiro"),T(6,"Ataque extra, poder de guerreiro"),T(7,"Poder de guerreiro"),T(8,"Poder de guerreiro"),T(9,"Ataque especial +12, poder de guerreiro"),T(10,"Poder de guerreiro"),T(11,"Poder de guerreiro"),T(12,"Poder de guerreiro"),T(13,"Ataque especial +16, poder de guerreiro"),T(14,"Poder de guerreiro"),T(15,"Poder de guerreiro"),T(16,"Poder de guerreiro"),T(17,"Ataque especial +20, poder de guerreiro"),T(18,"Poder de guerreiro"),T(19,"Poder de guerreiro"),T(20,"Campeão, poder de guerreiro")],
  poderes:[["Mestre em Arma","escolhe uma arma e aumenta o dano dela em um passo",{tipo:"arma",label:"Com qual arma?"}],["Ímpeto","gasta PM para se mover mais rápido por uma rodada"],["Romper Resistências","ignora redução de dano ao usar Ataque Especial"],["Planejamento Marcial","recicla um poder de guerreiro/combate uma vez por dia"]]
,
  habilidadesClasse:[["Ataque Especial","Gasta 1 PM num ataque pra receber +4 no teste de ataque ou na rolagem de dano (pode dividir os bônus). A cada 4 níveis, pode gastar +1 PM extra pra +4 a mais."]]
},
"Inventor":{
  tradicao:null, papel:"Criação de itens, engenhocas e um autômato parceiro.",
  dica:"Invista logo em Autômato — ele vira seu principal aliado de combate e utilidade.",
  tabela:[T(1,"Engenhosidade, protótipo"),T(2,"Fabricar item superior (1 melhoria), poder de inventor"),T(3,"Comerciante, poder de inventor"),T(4,"Poder de inventor"),T(5,"Fabricar item superior (2 melhorias), poder de inventor"),T(6,"Poder de inventor"),T(7,"Encontrar fraqueza, poder de inventor"),T(8,"Fabricar item superior (3 melhorias), poder de inventor"),T(9,"Fabricar item mágico (menor), poder de inventor"),T(10,"Olho do dragão, poder de inventor"),T(11,"Fabricar item superior (4 melhorias), poder de inventor"),T(12,"Poder de inventor"),T(13,"Fabricar item mágico (médio), poder de inventor"),T(14,"Poder de inventor"),T(15,"Poder de inventor"),T(16,"Poder de inventor"),T(17,"Fabricar item mágico (maior), poder de inventor"),T(18,"Poder de inventor"),T(19,"Poder de inventor"),T(20,"Obra-prima, poder de inventor")],
  poderes:[["Autômato","fabrica um construto parceiro que obedece seus comandos"],["Balística","usa Inteligência em vez de Destreza com armas de fogo/distância"],["Conhecimento de Fórmulas","aprende três fórmulas novas de itens que possa criar"],["Catalisador Instável","fabrica um item alquímico instantaneamente gastando PM"]]
,
  habilidadesClasse:[["Engenhosidade","Gasta 2 PM pra somar sua Inteligência num teste de perícia (não em testes de ataque)."],["Protótipo","Começa o jogo com um item superior ou 10 itens alquímicos, com preço total de até T$ 500."],["Fabricar Item Superior","No 2º nível, recebe um item superior de até T$ 2.000 e passa a poder fabricar itens superiores com 1 melhoria (2, 3 e 4 melhorias nos níveis 5, 8 e 11)."]]
},
"Ladino":{
  tradicao:null, papel:"Furtividade e ataques certeiros — Ataque Furtivo é sua maior fonte de dano.",
  dica:"Ataque Furtivo só funciona contra alvos desprevenidos ou flanqueados — trabalhe em equipe para gerar essas brechas.",
  tabela:[T(1,"Ataque furtivo +1d6, especialista"),T(2,"Evasão, poder de ladino"),T(3,"Ataque furtivo +2d6, poder de ladino"),T(4,"Esquiva sobrenatural, poder de ladino"),T(5,"Ataque furtivo +3d6, poder de ladino"),T(6,"Poder de ladino"),T(7,"Ataque furtivo +4d6, poder de ladino"),T(8,"Olhos nas costas, poder de ladino"),T(9,"Ataque furtivo +5d6, poder de ladino"),T(10,"Evasão aprimorada, poder de ladino"),T(11,"Ataque furtivo +6d6, poder de ladino"),T(12,"Poder de ladino"),T(13,"Ataque furtivo +7d6, poder de ladino"),T(14,"Poder de ladino"),T(15,"Ataque furtivo +8d6, poder de ladino"),T(16,"Poder de ladino"),T(17,"Ataque furtivo +9d6, poder de ladino"),T(18,"Poder de ladino"),T(19,"Ataque furtivo +10d6, poder de ladino"),T(20,"A pessoa certa para o trabalho, poder de ladino")],
  poderes:[["Mente Criminosa","soma Inteligência em Ladinagem e Furtividade"],["Mãos Rápidas","gasta PM para agir mais rápido em testes de Ladinagem"],["Ladrão Arcano","rouba uma magia já vista, ao acertar ataque furtivo em conjurador"],["Rolamento Defensivo","gasta PM para reduzir dano recebido pela metade"]]
,
  habilidadesClasse:[["Ataque Furtivo","Uma vez por rodada, ao atingir uma criatura desprevenida (corpo a corpo ou alcance curto) ou flanqueando, causa 1d6 de dano extra. A cada 2 níveis, esse dano aumenta +1d6."],["Especialista","Escolhe um número de perícias treinadas igual à sua Inteligência (mínimo 1). Nelas, pode gastar 1 PM pra dobrar o bônus de treinamento (não em testes de ataque)."],["Evasão","A partir do 2º nível: um teste de Reflexos bem-sucedido pra reduzir dano à metade passa a anular o dano por completo. Exige liberdade de movimentos."]]
},
"Lutador":{
  tradicao:null, papel:"Combate desarmado — golpes rápidos e resistência a dano.",
  dica:"Golpe Relâmpago permite ataques extra desarmado — priorize Destreza e Constituição.",
  tabela:[T(1,"Briga (1d6), golpe relâmpago"),T(2,"Poder de lutador"),T(3,"Casca grossa (Con), poder de lutador"),T(4,"Poder de lutador"),T(5,"Briga (1d8), golpe cruel, poder de lutador"),T(6,"Poder de lutador"),T(7,"Casca grossa (Con+1), poder de lutador"),T(8,"Poder de lutador"),T(9,"Briga (1d10), golpe violento, poder de lutador"),T(10,"Poder de lutador"),T(11,"Casca grossa (Con+2), poder de lutador"),T(12,"Poder de lutador"),T(13,"Briga (2d6), poder de lutador"),T(14,"Poder de lutador"),T(15,"Casca grossa (Con+3), poder de lutador"),T(16,"Poder de lutador"),T(17,"Briga (2d8), poder de lutador"),T(18,"Poder de lutador"),T(19,"Casca grossa (Con+4), poder de lutador"),T(20,"Dono da rua (2d10), poder de lutador")],
  poderes:[["Trincado","soma Constituição no dano desarmado"],["Trocação","ao acertar, pode gastar PM para atacar de novo o mesmo alvo"],["Valentão","bônus contra oponentes caídos, desprevenidos ou indefesos"],["Língua dos Becos","usa Força no lugar de Carisma em testes sociais"]]
,
  habilidadesClasse:[["Briga","Ataques desarmados causam 1d6 de dano, letal ou não letal sem penalidade. O dano aumenta a cada 4 níveis."],["Golpe Relâmpago","Ao usar a ação agredir desarmado, pode gastar 1 PM pra fazer um ataque desarmado adicional."]]
},
"Nobre":{
  tradicao:null, papel:"Liderança e influência — inspira o grupo e ataca com Palavras Afiadas.",
  dica:"Use Palavras Afiadas para causar dano à distância e Inspirar Confiança para salvar testes importantes do grupo.",
  tabela:[T(1,"Autoconfiança, espólio, orgulho"),T(2,"Palavras afiadas (2d6), poder de nobre"),T(3,"Poder de nobre, riqueza"),T(4,"Gritar ordens, poder de nobre"),T(5,"Poder de nobre, presença aristocrática"),T(6,"Palavras afiadas (4d6), poder de nobre"),T(7,"Poder de nobre"),T(8,"Poder de nobre"),T(9,"Poder de nobre"),T(10,"Palavras afiadas (6d6), poder de nobre"),T(11,"Poder de nobre"),T(12,"Poder de nobre"),T(13,"Poder de nobre"),T(14,"Palavras afiadas (8d6), poder de nobre"),T(15,"Poder de nobre"),T(16,"Poder de nobre"),T(17,"Poder de nobre"),T(18,"Palavras afiadas (10d6), poder de nobre"),T(19,"Poder de nobre"),T(20,"Realeza, poder de nobre")],
  poderes:[["Inspirar Confiança","gasta PM para um aliado repetir um teste ruim"],["Jogo da Corte","gasta PM para repetir testes de Diplomacia, Intuição ou Nobreza"],["Língua de Prata","gasta PM para somar metade do nível em teste de Carisma"],["Liderar pelo Exemplo","aliados próximos ganham bônus quando você passa em um teste"]]
,
  habilidadesClasse:[["Autoconfiança","Pode usar Carisma em vez de Destreza na Defesa (continua sem poder somar nenhum atributo de armadura pesada)."],["Espólio","Recebe um item à sua escolha de até T$ 2.000."],["Orgulho","Gasta PM à sua escolha (limitado pelo seu Carisma) num teste de perícia: +2 no teste pra cada PM gasto."]]
},
"Paladino":{
  tradicao:null, papel:"Guerreiro sagrado — cura com as mãos, golpe divino e pode aprender algumas magias.",
  dica:"Cura pelas Mãos funciona em você mesmo — use-a para se manter em pé nos combates difíceis.",
  tabela:[T(1,"Abençoado, código do herói, golpe divino (+1d8)"),T(2,"Cura pelas mãos (1d8+1 PV), poder de paladino"),T(3,"Aura sagrada, poder de paladino"),T(4,"Poder de paladino"),T(5,"Bênção da justiça, golpe divino (+2d8), poder de paladino"),T(6,"Cura pelas mãos (2d8+2 PV), poder de paladino"),T(7,"Poder de paladino"),T(8,"Poder de paladino"),T(9,"Golpe divino (+3d8), poder de paladino"),T(10,"Cura pelas mãos (3d8+3 PV), poder de paladino"),T(11,"Poder de paladino"),T(12,"Poder de paladino"),T(13,"Golpe divino (+4d8), poder de paladino"),T(14,"Cura pelas mãos (4d8+4 PV), poder de paladino"),T(15,"Poder de paladino"),T(16,"Poder de paladino"),T(17,"Golpe divino (+5d8), poder de paladino"),T(18,"Cura pelas mãos (5d8+5 PV), poder de paladino"),T(19,"Poder de paladino"),T(20,"Poder de paladino, vingador sagrado")],
  poderes:[["Orar","aprende e lança uma magia divina de 1º círculo à escolha",{tipo:"magia",label:"Qual magia divina de 1º círculo?",circulo:1,trad:"Divina"}],["Virtude Paladinesca: Compaixão","Cura pelas Mãos passa a curar bem mais em aliados"],["Julgamento Divino: Vindicação","marca quem feriu o grupo e ganha bônus contra ele"],["Virtude Paladinesca: Castidade","imune a encantamento e ganha bônus para perceber blefes"]],
  habilidadesClasse:[["Abençoado","Soma seu Carisma no total de PM. Torna-se devoto de um deus disponível pra paladinos (Azgher, Khalmyr, Lena, Lin-Wu, Marah, Tanna-Toh, Thyatis ou Valkaria) e recebe DOIS Poderes Concedidos. Como alternativa, pode lutar pelo bem como um todo: sem Poder Concedido, mas também sem nenhuma Obrigação/Restrição além do Código do Herói."],["Código do Herói","Deve sempre manter sua palavra e nunca recusar pedido de ajuda de um inocente; nunca pode mentir, trapacear ou roubar. Violar o código faz perder todos os PM até o próximo dia."],["Golpe Divino","Gasta 2 PM num ataque corpo a corpo: soma Carisma no teste de ataque e +1d8 no dano. A cada 4 níveis, pode gastar +1 PM extra pra +1d8 a mais."],["Cura pelas Mãos","A partir do 2º nível: gasta uma ação de movimento e 1 PM pra curar 1d8+1 PV num alvo em alcance corpo a corpo (incluindo você). A cada 4 níveis, pode gastar +1 PM extra pra curar +1d8+1."]]
}
};

// Atributos iniciais por classe (Tabela 1-3: Classes)
// pv1 = PV inicial (1º nível, antes de somar Constituição) | pvPorNivel = ganho de PV a cada nível seguinte (+ Constituição, mín. 1)
// pm = PM por nível (constante, sem bônus de atributo) — vale tanto para o 1º nível quanto os seguintes
function CI(atributo, pv1, pm, fixas, extra, pvPorNivel){ return {atributo, pv1, pm, fixas, extra, pvPorNivel}; }
const CLASSES_INICIAL = {
  "Arcanista": CI("Inteligência ou Carisma", 8, 6, ["Misticismo","Vontade"], 2, 2),
  "Bárbaro": CI("Força", 24, 3, ["Fortitude","Luta"], 4, 6),
  "Bardo": CI("Carisma", 12, 4, ["Atuação","Reflexos"], 6, 3),
  "Bucaneiro": CI("Destreza", 16, 3, ["Luta ou Pontaria","Reflexos"], 4, 4),
  "Caçador": CI("Força ou Destreza", 16, 6, ["Luta ou Pontaria","Sobrevivência"], 4, 4),
  "Cavaleiro": CI("Força", 20, 3, ["Fortitude","Luta"], 2, 5),
  "Clérigo": CI("Sabedoria", 16, 5, ["Religião","Vontade"], 2, 4),
  "Druida": CI("Sabedoria", 16, 4, ["Sobrevivência","Vontade"], 4, 4),
  "Guerreiro": CI("Força ou Destreza", 20, 3, ["Luta ou Pontaria","Fortitude"], 2, 5),
  "Inventor": CI("Inteligência", 12, 4, ["Ofício","Vontade"], 4, 3),
  "Ladino": CI("Destreza ou Inteligência", 12, 4, ["Ladinagem","Reflexos"], 8, 3),
  "Lutador": CI("Força", 20, 3, ["Fortitude","Luta"], 4, 5),
  "Nobre": CI("Carisma", 16, 4, ["Diplomacia ou Intimidação","Vontade"], 4, 4),
  "Paladino": CI("Força e Carisma", 20, 3, ["Luta","Vontade"], 2, 5),
};

const LISTA_PERICIAS = ["Acrobacia","Adestramento","Atletismo","Atuação","Cavalgar","Conhecimento","Cura","Diplomacia",
  "Enganação","Fortitude","Furtividade","Guerra","Iniciativa","Intimidação","Intuição","Investigação","Jogatina",
  "Ladinagem","Luta","Misticismo","Nobreza","Ofício","Percepção","Pilotagem","Pontaria","Reflexos","Religião",
  "Sobrevivência","Vontade"];
