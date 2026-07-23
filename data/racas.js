// Dados de Raças — Tormenta 20 (Livro Básico, Capítulo 1)
function R(nome, mods, tamanho, deslocamento, poderes, opts){
  return Object.assign({nome, mods, tamanho:tamanho||'Médio', deslocamento:deslocamento||9, poderes, semOrigem:false, escolhaLivre:null}, opts||{});
}

const RACAS = [
  R("Humano", {}, 'Médio', 9, [
    ["Versátil","Treinado em duas perícias à escolha (não precisam ser da classe). Pode trocar uma delas por um poder geral."]
  ], { escolhaLivre:{qtd:3, val:1, exceto:[]} }),

  R("Anão", {con:2, sab:1, des:-1}, 'Médio', 6, [
    ["Conhecimento das Rochas","Visão no escuro; +2 em Percepção e Sobrevivência no subterrâneo."],
    ["Devagar e Sempre","Deslocamento 6m, mas nunca reduzido por armadura ou excesso de carga."],
    ["Duro como Pedra","+3 PV no 1º nível e +1 por nível seguinte."],
    ["Tradição de Heredrimm","Machados, martelos, marretas e picaretas são armas simples para você, com +2 em ataques."]
  ], { armasComoSimples:["Machado de batalha","Machado de guerra","Machado anão","Martelo de guerra","Marreta","Picareta"], deslocamentoImune:true, pvBonusNivel1:3, pvBonusPorNivel:1 }),

  R("Dahllan", {sab:2, des:1, int:-1}, 'Médio', 9, [
    ["Amiga das Plantas","Pode lançar Controlar Plantas (chave Sabedoria)."],
    ["Armadura de Allihanna","Gasta 1 PM e ação de movimento para +2 na Defesa até o fim da cena."],
    ["Empatia Selvagem","Comunica-se com animais e usa Adestramento para mudar atitude deles."]
  ]),

  R("Elfo", {int:2, des:1, con:-1}, 'Médio', 12, [
    ["Graça de Glórienn","Deslocamento 12m."],
    ["Sangue Mágico","+1 Ponto de Mana por nível."],
    ["Sentidos Élficos","Visão na penumbra; +2 em Misticismo e Percepção."]
  ]),

  R("Goblin", {des:2, int:1, car:-1}, 'Pequeno', 9, [
    ["Engenhoso","Sem penalidade por perícia sem ferramenta; +2 se usar a ferramenta certa."],
    ["Espelunqueiro","Visão no escuro; deslocamento de escalada igual ao terrestre."],
    ["Peste Esguia","Tamanho Pequeno, mas mantém deslocamento 9m."],
    ["Rato das Ruas","+2 em Fortitude; recuperação de PV/PM nunca menor que seu nível."]
  ]),

  R("Lefou", {car:-1}, 'Médio', 9, [
    ["Cria da Tormenta","Criatura do tipo monstro; +5 em resistência contra efeitos da Tormenta."],
    ["Deformidade","+2 em duas perícias à escolha (pode trocar um bônus por um poder da Tormenta)."]
  ], { escolhaLivre:{qtd:3, val:1, exceto:['car']} }),

  R("Minotauro", {for:2, con:1, sab:-1}, 'Médio', 9, [
    ["Chifres","Arma natural de chifres (1d6, x2, perfuração); ataque extra por 1 PM."],
    ["Couro Rígido","+1 na Defesa."],
    ["Faro","Olfato apurado: nunca desprevenido contra inimigos próximos não percebidos."],
    ["Medo de Altura","Fica abalado perto de quedas de 3m ou mais."]
  ], { defesaBonusFixo:1 }),

  R("Qareen", {car:2, int:1, sab:-1}, 'Médio', 9, [
    ["Desejos","Magia lançada a pedido de alguém custa –1 PM."],
    ["Resistência Elemental","Redução 10 a um tipo de dano elemental à escolha."],
    ["Tatuagem Mística","Pode lançar uma magia de 1º círculo à escolha (chave Carisma)."]
  ]),

  R("Golem", {for:2, con:1, car:-1}, 'Médio', 6, [
    ["Chassi","+2 na Defesa, –2 de penalidade de armadura; deslocamento não reduzido por carga/armadura."],
    ["Criatura Artificial","Tipo construto: visão no escuro, imune a cansaço/veneno, não precisa comer/dormir."],
    ["Fonte Elemental","Imune a um tipo de dano elemental; cura metade do dano mágico desse tipo."],
    ["Propósito de Criação","Não escolhe origem, mas recebe um poder geral à escolha."]
  ], { semOrigem:true, poderGeralExtra:true, deslocamentoImune:true, defesaBonusFixo:2, penalidadeArmaduraFixa:-2, armaduraNaoContaVestido:true }),

  R("Hynne", {des:2, car:1, for:-1}, 'Pequeno', 6, [
    ["Arremessador","Dano aumenta um passo com funda ou arma de arremesso."],
    ["Pequeno e Rechonchudo","+2 em Enganação; pode usar Destreza em vez de Força em Atletismo."],
    ["Sorte Salvadora","Gasta 1 PM para repetir um teste de resistência."]
  ], { atletismoUsaDestreza:true }),

  R("Kliren", {int:2, car:1, for:-1}, 'Médio', 9, [
    ["Híbrido","Treinado em uma perícia à escolha."],
    ["Engenhosidade","Gasta 2 PM para somar Inteligência num teste de perícia (não em ataque)."],
    ["Ossos Frágeis","Sofre +1 de dano por dado de dano de impacto."],
    ["Vanguardista","Proficiência com armas de fogo; +2 em um Ofício à escolha."]
  ]),

  R("Medusa", {des:2, car:1}, 'Médio', 9, [
    ["Cria de Megalokk","Tipo monstro; visão no escuro."],
    ["Natureza Venenosa","+5 de resistência a veneno; pode envenenar sua arma (1d12 de dano)."],
    ["Olhar Atordoante","Gasta 1 PM para forçar Fortitude ou atordoar um alvo próximo (1x por cena)."]
  ]),

  R("Osteon", {con:-1}, 'Médio', 9, [
    ["Armadura Óssea","Redução de corte, frio e perfuração 5."],
    ["Memória Póstuma","Treinado em uma perícia ou recebe um poder geral à escolha."]
  ], { escolhaLivre:{qtd:3, val:1, exceto:['con']}, escolhaExtra:{texto:'Escolha entre ficar treinado em uma perícia (não precisa ser da sua classe) ou receber um poder geral à escolha (ainda precisa cumprir os pré-requisitos).'} }),

  R("Sereia/Tritão", {}, 'Médio', 9, [
    ["Canção dos Mares","Pode lançar duas entre Amedrontar, Comando, Despedaçar, Enfeitiçar, Hipnotismo ou Sono (chave Carisma)."],
    ["Mestre do Tridente","Tridente é arma simples para você; +2 no dano com azagaias, lanças e tridentes."],
    ["Transformação Anfíbia","Respira debaixo d'água; natação 12m, deslocamento terrestre 9m."]
  ], { escolhaLivre:{qtd:3, val:1, exceto:[]}, armasComoSimples:["Tridente"] }),

  R("Sílfide", {car:2, des:1, for:-2}, 'Minúsculo', 9, [
    ["Asas de Borboleta","Paira a 1,5m com deslocamento 9m; ignora terreno difícil e queda; 1 PM/rodada para voar 12m."],
    ["Espírito da Natureza","Tipo espírito; visão na penumbra; fala com animais."],
    ["Magia das Fadas","Pode lançar duas entre Criar Ilusão, Enfeitiçar, Luz e Sono (chave Carisma)."]
  ]),

  R("Suraggel (Aggelus)", {sab:2, car:1}, 'Médio', 9, [
    ["Herança Divina","Tipo espírito; visão no escuro."],
    ["Luz Sagrada","+2 em Diplomacia e Intuição; pode lançar Luz (divina, chave Carisma)."]
  ]),
  R("Suraggel (Sulfure)", {des:2, int:1}, 'Médio', 9, [
    ["Herança Divina","Tipo espírito; visão no escuro."],
    ["Sombras Profanas","+2 em Enganação e Furtividade; pode lançar Escuridão (divina, chave Inteligência)."]
  ]),

  R("Trog", {con:2, for:1, int:-1}, 'Médio', 9, [
    ["Mau Cheiro","Gasta ação padrão e 2 PM: inimigos próximos testam Fortitude ou ficam enjoados."],
    ["Mordida","Arma natural de mordida (1d6, x2, perfuração); ataque extra por 1 PM."],
    ["Reptiliano","Tipo monstro; visão no escuro; +1 na Defesa; +5 Furtividade sem armadura pesada."],
    ["Sangue Frio","Sofre +1 de dano por dado de dano de frio."]
  ], { defesaBonusFixo:1 }),
];
