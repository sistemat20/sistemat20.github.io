// Dados do sistema de "Item Superior" — Tormenta 20 (Livro Básico, Tabelas 3-7, 3-8, 3-9)

// Tabela 3-7: Preço de Melhorias (por quantidade de melhorias no item)
const PRECO_MELHORIAS = [
  {n:1, preco:300, cd:5},
  {n:2, preco:3000, cd:10},
  {n:3, preco:9000, cd:15},
  {n:4, preco:18000, cd:20},
];

// Tabela 3-8: Melhorias
// categorias: 'arma' | 'armadura' | 'escudo' | 'esoterico' | 'ferramenta' | 'vestuario' | 'qualquer'
// efeito: descreve o tipo pra permitir aplicar automaticamente quando possível
function ME(nome, categorias, desc, efeito, prereq){
  return {nome, categorias, desc, efeito: efeito||null, prereq: prereq||null};
}
const MELHORIAS = [
  ME("Certeira", ['arma'], "+1 nos testes de ataque", {tipo:'testeAtaque', valor:1}),
  ME("Pungente", ['arma'], "+2 nos testes de ataque (em vez do bônus de Certeira)", {tipo:'testeAtaque', valor:2}, "Certeira"),
  ME("Cruel", ['arma'], "+1 nas rolagens de dano", {tipo:'dano', valor:1}),
  ME("Atroz", ['arma'], "+2 nas rolagens de dano (em vez do bônus de Cruel)", {tipo:'dano', valor:2}, "Cruel"),
  ME("Equilibrada", ['arma'], "+2 em testes de manobras (desarmar, quebrar etc.)"),
  ME("Harmonizada", ['arma'], "Escolha uma habilidade ativada de ataque: seu custo cai em –1 PM", null, "outra melhoria qualquer"),
  ME("Injeção alquímica", ['arma'], "Injeta um preparado (2 doses) automaticamente ao acertar um ataque"),
  ME("Maciça", ['arma'], "+1 no multiplicador de crítico", {tipo:'multCritico', valor:1}, null),
  ME("Mira telescópica", ['arma'], "Aumenta o alcance em uma categoria (só armas de disparo, exceto funda)"),
  ME("Precisa", ['arma'], "+1 na margem de ameaça (crítico)", {tipo:'margemAmeaca', valor:1}),
  ME("Material especial", ['arma','armadura','escudo','esoterico'], "Item feito de um material especial escolhido (veja lista de materiais)", {tipo:'material'}),
  ME("Ajustada", ['armadura','escudo'], "–1 na penalidade de armadura", {tipo:'penalidade', valor:-1}),
  ME("Sob medida", ['armadura','escudo'], "–2 na penalidade de armadura (só pro dono do item)", {tipo:'penalidade', valor:-2}, "Ajustada"),
  ME("Delicada", ['armadura'], "Aplica 1 ponto de Destreza na Defesa (só armadura pesada)"),
  ME("Espinhosa", ['armadura'], "Causa dano de perfuração (igual à sua Força) em quem te agarra ou você agarra"),
  ME("Espinhoso", ['escudo'], "Aumenta o dano de ataque com escudo em um passo"),
  ME("Polida", ['armadura','escudo'], "+5 na Defesa na 1ª rodada de combate, em ambiente iluminado"),
  ME("Reforçada", ['armadura','escudo'], "+1 na Defesa e +1 na penalidade de armadura", {tipo:'defesaEArmadura', valor:1}, null),
  ME("Selada", ['armadura'], "+1 em testes de resistência (só armadura pesada)"),
  ME("Canalizador", ['esoterico'], "+1 no limite de PM que pode gastar em magias", {tipo:'limite_pm_arcana', valor:1}),
  ME("Energético", ['esoterico'], "+1d6 no dano de magias do mesmo tipo do catalisador usado"),
  ME("Harmonizado", ['esoterico'], "Escolha uma magia: seu custo cai em –1 PM"),
  ME("Poderoso", ['esoterico'], "+1 na CD para resistir às suas magias", {tipo:'cd_arcana_geral', valor:1}),
  ME("Vigilante", ['esoterico'], "+2 na Defesa"),
  ME("Aprimorado", ['ferramenta','vestuario'], "+1 na perícia que o item já modifica"),
  ME("Banhado a ouro", ['qualquer'], "+2 em Diplomacia"),
  ME("Cravejado de gemas", ['qualquer'], "+2 em Enganação"),
  ME("Discreto", ['qualquer'], "–1 espaço (mínimo 1), +5 em Ladinagem pra ocultar o item"),
  ME("Macabro", ['qualquer'], "+2 em Intimidação, –2 em Diplomacia"),
  // Novas Melhorias (Ameaças de Arton, pág. 400)
  ME("Multifuncional", ['ferramenta','vestuario'], "Só em item que já dá bônus/reduz penalidade numa perícia — escolha outra perícia do mesmo atributo-chave: o item passa a funcionar pra ela também (não vale pra testes de ataque)."),
  ME("Penetrante", ['arma'], "A arma ignora 5 pontos de redução de dano.", null, "Cruel"),
];

// Tabela 3-9: Preço Adicional de Materiais Especiais (por tipo de item)
function MAT(nome, precoArma, precoArmaduraLeve, precoArmaduraPesada, precoEscudo, precoEsoterico, efeitos){
  return {nome, precos:{arma:precoArma, armaduraLeve:precoArmaduraLeve, armaduraPesada:precoArmaduraPesada, escudo:precoEscudo, esoterico:precoEsoterico}, efeitos};
}
const MATERIAIS_ESPECIAIS = [
  MAT("Aço-rubi", 6000, 3000, 6000, 3000, 6000, {
    arma: "Ignora 10 de redução de dano; ignora imunidade a crítico de lefeu.",
    armadura: "25% (armadura leve) ou 50% (pesada) de chance de ignorar dano extra de crítico/furtivo.",
    escudo: "25% de chance de ignorar dano extra de crítico/furtivo.",
    esoterico: "Suas magias de dano ignoram 10 de redução de dano e imunidades de lefeu.",
  }),
  MAT("Adamante", 3000, 6000, 18000, 6000, 3000, {
    arma: "Aumenta o dano em um passo.",
    armadura: "Redução de dano: leve RD 2, pesada RD 5.",
    escudo: "Redução de dano 2.",
    esoterico: "Pague +1 PM ao lançar magia de dano pra rolar de novo qualquer resultado 1 no dano.",
  }),
  MAT("Gelo eterno", 600, 1500, 3000, 1500, 3000, {
    arma: "Causa +2 pontos de dano de frio.",
    armadura: "Redução de fogo: leve 5, pesada 10.",
    escudo: "Redução de fogo 5.",
    esoterico: "Magias de frio com dano: role de novo qualquer resultado 1 na rolagem de dano.",
  }),
  MAT("Madeira Tollon", 1500, null, null, 1500, 1500, {
    arma: "Conta como mágica pra vencer RD. Habilidades ativadas em ataque custam –1 PM. (só armas de madeira: arcos, bordões, clavas, lanças, piques, tacapes)",
    escudo: "Resistência a magia +2. (só escudo leve)",
    esoterico: "Resistência a magia +2.",
  }),
  MAT("Matéria vermelha", 1500, 6000, 18000, 6000, 3000, {
    arma: "+1d6 de dano extra, mas você perde 1 PV a cada acerto (lefou/lefeu imunes a ambos os efeitos).",
    armadura: "Chance de falha no ataque inimigo: leve 10%, pesada 25%.",
    escudo: "Chance de falha no ataque inimigo: 10%.",
    esoterico: "Você e inimigos em alcance curto sofrem –2 em testes de resistência contra efeitos mágicos.",
  }),
  MAT("Mitral", 1500, 1500, 12000, 1500, 3000, {
    arma: "+1 na margem de ameaça (ex: espada longa mitral: 18–20).",
    armadura: "–2 na penalidade de armadura; pesada permite até 2 pontos de Destreza na Defesa.",
    escudo: "–2 na penalidade de armadura.",
    esoterico: "Pague +2 PM ao lançar uma magia pra aumentar a CD dela em +2.",
    geral: "Itens de mitral ocupam –1 espaço (mínimo 1).",
  }),
  // Novos Materiais Especiais (Ameaças de Arton, pág. 400-402). Preços de Casco de Monstro,
  // Lanajuste e Prata são estimados por semelhança com materiais parecidos (a tabela original
  // veio com as colunas embaralhadas na extração do PDF) — confira com o Mestre antes de cravar
  // um preço final. Couraça de Kaiju, Couro de Bulette, Cristal de Sol e Pena de Kraken são raros
  // e não são vendidos no mercado normal (só obtidos como saque de criaturas específicas).
  MAT("Casco de Monstro", 750, 750, 6000, 750, 750, {
    arma: "Conta como arma primitiva pra Armamento da Natureza e efeitos parecidos.",
    armadura: "Penalidade de armadura –1. Armadura pesada de casco: pode aplicar 1 ponto de Destreza na Defesa.",
    escudo: "Penalidade de armadura –1.",
    esoterico: "Ao lançar uma magia, ganha RD 5 contra o próximo dano até sua próxima rodada.",
  }),
  MAT("Couraça de Kaiju", null, null, null, null, null, {
    arma: "(exige uma peça) Dano aumenta um passo. Gasta 2 PM ao atacar pra ignorar efeito de redução de dano do alvo (tipo Durão) — não vale contra RD.",
    armadura: "Armadura leve/escudo (1 peça): RD 10/mágico. Armadura pesada (3 peças): RD 20/mágico.",
    escudo: "Armadura leve/escudo (1 peça): RD 10/mágico. Armadura pesada (3 peças): RD 20/mágico.",
    esoterico: "(exige uma peça) Ao lançar magia de dano, gasta 2 PM pra ignorar efeitos que reduzem o dano dela (tipo Durão/Evasão, exceto RD e resistência).",
    geral: "Raríssimo — só obtido abatendo um kaiju, não é vendido nem tem preço de mercado padrão.",
  }),
  MAT("Couro de Bulette", null, null, null, null, null, {
    armadura: "Armadura leve (1 peça): deslocamento de escavação = metade do normal, RD ácido 5. Pesada (3 peças): igual, mas RD ácido 10.",
    esoterico: "(exige uma peça) Ao lançar magia de ácido com dano, pode rolar de novo qualquer resultado 1 no dano (mesmo em rodadas seguintes).",
    geral: "Raro — só mantém as propriedades se curtido logo após extração; raramente encontrado à venda.",
  }),
  MAT("Cristal de Sol", 1500, 1500, 1500, 1500, 1500, {
    arma: "(exige uma peça, só corte/perfuração) +2 de dano de fogo.",
    armadura: "(exige uma peça) Testes de resistência contra frio: rola 2 dados, usa o melhor.",
    escudo: "(exige uma peça) Testes de resistência contra frio: rola 2 dados, usa o melhor.",
    esoterico: "(exige uma peça) Ao lançar magia de fogo, gasta 1 PM: quem falhar na resistência fica em chamas (ou, se já ficaria, +1d6 cumulativo no dano das chamas).",
    geral: "Raro — perde as propriedades depois de algumas semanas sem uso, difícil de achar à venda.",
  }),
  MAT("Lanajuste", 3000, 1500, 600, 3000, 1500, {
    arma: "Ignora penalidade de combate submerso. Pode ser usada por devoto do Oceano sem violar obrigações/restrições.",
    armadura: "Redução de corte: leve/escudo 5, pesada 10.",
    escudo: "Redução de corte: leve/escudo 5, pesada 10.",
    esoterico: "Ao lançar magia de dano de corte, pode rolar de novo qualquer resultado 1 no dano.",
  }),
  MAT("Pena de Kraken", null, null, null, null, null, {
    arma: "(exige uma peça) Em acerto crítico, dano aumenta dois passos (antes de multiplicar).",
    armadura: "Leve/escudo (1 peça): quem errar ataque corpo a corpo contra você perde 5 PV. Pesada (3 peças): perde 10 PV.",
    escudo: "Leve/escudo (1 peça): quem errar ataque corpo a corpo contra você perde 5 PV. Pesada (3 peças): perde 10 PV.",
    esoterico: "(exige uma peça) Se o item já dá algum bônus numérico, esse bônus aumenta em +1.",
    geral: "Raro e quebradiço no estado bruto — raramente encontrado à venda.",
  }),
  MAT("Prata", 1500, 1500, 600, 400, 1500, {
    arma: "+2 de dano em espíritos e mortos-vivos; conta como mágica pra acertar essas criaturas.",
    armadura: "Redução de dano contra espíritos/mortos-vivos: leve/escudo 5, pesada 10.",
    escudo: "Redução de dano contra espíritos/mortos-vivos: leve/escudo 5, pesada 10.",
    geral: "Por ser um revestimento, pode ser combinada com um 2º material especial (cada um conta como uma melhoria separada).",
  }),
];

// Tabela 8-12: Poções — magia real engarrafada (diferente dos alquímicos mundanos)
function PO(nome, magia, preco, circulo){ return {nome, magia, preco, circulo}; }
const POCOES_MAGICAS = [
PO("Poção de Abençoar Alimentos (óleo)","Abençoar Alimentos",30,1),
PO("Poção de Área Escorregadia (granada)","Área Escorregadia",30,1),
PO("Poção de Arma Mágica (óleo)","Arma Mágica",30,1),
PO("Poção de Compreensão","Compreensão",30,1),
PO("Poção de Curar Ferimentos (2d8+2 PV)","Curar Ferimentos",30,1),
PO("Poção de Disfarce Ilusório","Disfarce Ilusório",30,1),
PO("Poção de Escuridão (óleo)","Escuridão",30,1),
PO("Poção de Luz (óleo)","Luz",30,1),
PO("Poção de Névoa (granada)","Névoa",30,1),
PO("Poção de Primor Atlético","Primor Atlético",30,1),
PO("Poção de Proteção Divina","Proteção Divina",30,1),
PO("Poção de Resistência a Energia","Resistência a Energia",30,1),
PO("Poção de Sono","Sono",30,1),
PO("Poção de Suporte Ambiental","Suporte Ambiental",30,1),
PO("Poção de Tranca Arcana (óleo)","Tranca Arcana",30,1),
PO("Poção de Visão Mística","Visão Mística",30,1),
PO("Poção de Vitalidade Fantasma","Vitalidade Fantasma",30,1),
PO("Poção de Escudo da Fé (duração cena)","Escudo da Fé",120,1),
PO("Poção de Alterar Tamanho","Alterar Tamanho",270,2),
PO("Poção de Aparência Perfeita","Aparência Perfeita",270,2),
PO("Poção de Armamento da Natureza (óleo)","Armamento da Natureza",270,2),
PO("Poção de Bola de Fogo (granada)","Bola de Fogo",270,2),
PO("Poção de Camuflagem Ilusória","Camuflagem Ilusória",270,2),
PO("Poção de Concentração de Combate (duração cena)","Concentração de Combate",270,2),
PO("Poção de Curar Ferimentos (4d8+4 PV)","Curar Ferimentos",270,2),
PO("Poção de Físico Divino","Físico Divino",270,2),
PO("Poção de Mente Divina","Mente Divina",270,2),
PO("Poção de Metamorfose","Metamorfose",270,2),
PO("Poção de Purificação","Purificação",270,2),
PO("Poção de Velocidade","Velocidade",270,2),
PO("Poção de Vestimenta da Fé (óleo)","Vestimenta da Fé",270,2),
PO("Poção de Voz Divina","Voz Divina",270,2),
PO("Poção de Arma Mágica (+3, óleo)","Arma Mágica",750,3),
PO("Poção de Curar Ferimentos (7d8+7 PV)","Curar Ferimentos",1080,3),
PO("Poção de Físico Divino (três atributos)","Físico Divino",1080,3),
PO("Poção de Invisibilidade (duração cena)","Invisibilidade",1080,3),
PO("Poção de Bola de Fogo (10d6, granada)","Bola de Fogo",1470,4),
PO("Poção de Curar Ferimentos (11d8+11 PV)","Curar Ferimentos",3000,5),
];
