// Sistema de Parceiros (Tormenta 20, Livro Básico, Cap. 6, pág. 260-262) — NPCs que se
// aventuram com o grupo (recrutados, comprados, ganhos como recompensa, ou concedidos por
// poderes tipo Familiar/Companheiro Animal/Montaria/Autômato/Escudeiro/Corte). Cada parceiro dá
// um bônus fixo dependendo do TIPO e do nível de poder (iniciante/veterano/mestre) — eles não
// agem por conta própria, não têm turno.
//
// PT(nome, descCurta, iniciante, veterano, mestre)
function PT(nome, descCurta, iniciante, veterano, mestre){
  return {nome, descCurta, niveis:{iniciante, veterano, mestre}};
}
const PARCEIRO_TIPOS = [
  PT('Adepto', 'Conjurador que ajuda a lançar magias.',
    'Custo das suas magias de 1º círculo cai em –1 PM.',
    'Como acima, e também reduz o custo das de 2º círculo.',
    'Como acima, e a redução se torna cumulativa com outras.'),
  PT('Ajudante', 'Bardo, nobre ou sábio que ajuda com palavras. Não pode dar bônus em Luta/Pontaria.',
    '+2 em duas perícias (escolhidas pelo parceiro).',
    '+2 em três perícias.',
    '+4 em três perícias.'),
  PT('Assassino', 'Ladino ou tipo furtivo e letal.',
    'Ganha Ataque Furtivo +1d6 (cumulativo se já tiver a habilidade).',
    'Além do Ataque Furtivo, +2 em testes de ataque corpo a corpo quando flanqueando.',
    'Ataque Furtivo vira +2d6.'),
  PT('Atirador', 'Arqueiro, besteiro ou combatente à distância.',
    '1x/rodada, +1d6 numa rolagem de dano à distância.',
    'Vira +1d10.',
    'Vira +2d8.'),
  PT('Combatente', 'Bucaneiro, guerreiro, paladino ou animal de caça.',
    '+2 em testes de ataque.',
    '+3 em testes de ataque.',
    '+4 em testes de ataque; 1x/rodada, 5 PM pra um ataque extra.'),
  PT('Destruidor', 'Arcanista ou inventor.',
    '1x/rodada (ação livre), 1 PM: 2d6 de dano (ácido/elétrico/fogo/frio) em alcance curto.',
    'Como acima, e 2 PM pra 4d6.',
    'Como acima, e 4 PM pra 6d6 numa área de 6m em alcance médio.'),
  PT('Fortão', 'Bárbaro, lutador ou tipo que bate primeiro.',
    '1x/rodada, +1d8 numa rolagem de dano corpo a corpo.',
    'Vira +1d12.',
    'Vira +3d6.'),
  PT('Guardião', 'Cavaleiro, cão de guarda ou protetor.',
    '+2 na Defesa.',
    '+3 na Defesa.',
    '+4 na Defesa e +2 em testes de resistência.'),
  PT('Magivocador', 'Conjurador especializado em magias ofensivas.',
    'Dano das suas magias +1 dado do mesmo tipo.',
    'Como acima, e +1 na CD pra resistir às suas magias.',
    'Dobra os bônus: +2 dados de dano e +2 na CD.'),
  PT('Médico', 'Clérigo, druida, herbalista ou curador.',
    '1x/rodada, 1 PM: cura 1d8+1 PV de criatura adjacente.',
    'Como acima, e 3 PM pra curar 3d8+3 ou remover uma condição prejudicial.',
    'Como acima, e 5 PM pra curar 6d8+6.'),
  PT('Perseguidor', 'Caçador, farejador ou rastreador.',
    '+2 em Percepção e Sobrevivência.',
    'Pode usar Sentidos Aguçados.',
    'Pode usar Percepção às Cegas.'),
  PT('Vigilante', 'Vigia ou animal de guarda.',
    '+2 em Percepção e Iniciativa.',
    'Pode usar Esquiva Sobrenatural.',
    'Pode usar Olhos nas Costas.'),
];

// Montarias — um tipo ESPECIAL de parceiro (pág. 261-262). Exigem estar montado pra dar
// benefício (ação de movimento pra montar/desmontar, teste de Cavalgar por turno — automático
// se for treinado). Têm categoria de tamanho própria.
// MT(nome, tamanho, obs, iniciante, veterano, mestre)
function MT(nome, tamanho, obs, iniciante, veterano, mestre){
  return {nome, tamanho, obs, niveis:{iniciante, veterano, mestre}};
}
const MONTARIA_TIPOS_ESPECIFICOS = [
  MT('Cavalo', 'Grande', 'A montaria mais comum. Também vale pra pôneis (Médio).',
    'Deslocamento 12m; +1 ação de movimento extra (só pra se deslocar).',
    'Como acima, deslocamento 15m, +2 em ataques corpo a corpo.',
    'Como acima, +2ª ação de movimento extra.'),
  MT('Cão de caça', 'Médio ou Pequeno', 'Comum pra personagens Pequenos/Minúsculos.',
    'Deslocamento 9m, usa faro, +1 ação de movimento extra.',
    'Deslocamento 12m, +2 na Defesa.',
    'Como acima; 1x/rodada, acerto corpo a corpo pode fazer Derrubar como ação livre.'),
  MT('Lobo-das-cavernas', 'Grande', 'Também vale pra lobos comuns (Médio).',
    'Deslocamento 12m, +1 ação de movimento extra.',
    'Deslocamento 15m, +1d8 numa rolagem de dano corpo a corpo 1x/rodada.',
    'Como acima; 1x/rodada, acerto corpo a corpo pode fazer Derrubar como ação livre.'),
  MT('Grifo', 'Grande', 'Iniciante é filhote, não pode ser usado como montaria ainda.',
    '1x/rodada, +1d8 numa rolagem de dano corpo a corpo (não monta ainda).',
    'Como acima; agora pode ser montado, deslocamento de voo 18m.',
    'Como acima, +1 ação de movimento extra.'),
  MT('Gorlogg', 'Grande', 'Besta primitiva usada pelos mais selvagens.',
    'Deslocamento 12m, +1d6 numa rolagem de dano corpo a corpo 1x/rodada.',
    'Como acima, dano vira +1d10.',
    'Deslocamento 15m, dano vira +2d8.'),
  MT('Trobo', 'Grande', 'Animal de carga e tração, também serve como montaria.',
    'Deslocamento 9m, +1 ação de movimento extra, +1 em testes de resistência.',
    'Deslocamento 12m, bônus de resistência vira +2.',
    'Como acima, bônus de resistência vira +5.'),
];

// Limite de parceiros por patamar de nível (pág. 260)
function limiteParceiros(f){
  const nivel = nivelTotal(f);
  if(nivel>=17) return 3;
  if(nivel>=5) return 2;
  return 1;
}
function parceirosAtivos(f){ return f.parceiros || []; }

// Parceiros extras de Ameaças de Arton (bestiário) — cada criatura do livro que tem uma seção
// "Parceiro" própria, com efeito específico dela (não é um dos 12 tipos genéricos, é o bicho
// específico). Tratado como referência de texto — os efeitos são variados demais (deslocamento,
// redução de dano, bônus situacionais...) pra automatizar sem risco de calcular errado; achei
// inclusive um caso ("Fofo") onde o rótulo narrativo do livro ("guardião") não bate com o
// mecanismo real (dá Redução de Dano, não Defesa) — por isso não reaproveitei a automação dos
// tipos genéricos aqui, pra não arriscar um bônus errado.
const PARCEIROS_AMEACAS_ARTON = [
  {nome:"Asa-assassina", ehMontaria:false, tamanho:null, tipoNarrativo:"assassino", restricao:null, niveis:{iniciante:"1x/rodada, ao causar dano com um ataque, pode deixar a vítima sangrando.", veterano:"A perda de PV pelo sangramento vira 1d8.", mestre:"A perda de PV vira 2d8."}},
  {nome:"Baleote", ehMontaria:true, tamanho:"Grande", tipoNarrativo:null, restricao:null, niveis:{iniciante:"você pode gastar 1 PM para causar 2d6 pontos de dano de eletricidade em uma linha de 9m (um baleote iniciante é muito jovem para ser usado como montaria).", veterano:"pode ser usado como montaria, mudando seu deslocamento para 9m (voo 12m).", mestre:"seu deslocamento de voo muda para 15m e você também pode gastar 4 PM para causar 6d6 pontos de dano de eletricidade em uma linha de 9m."}},
  {nome:"Bogum", ehMontaria:false, tamanho:null, tipoNarrativo:"companheiro animal", restricao:"exclusivo de druidas", niveis:{iniciante:"Forma elo mental com o bogum (como um arcanista com o familiar); +2 em Percepção e Sobrevivência.", veterano:"1x/rodada, +1d6 de ácido numa rolagem de dano.", mestre:"Também dá o benefício de um dedo de ente (T20, pág. 160)."}},
  {nome:"Brontotério", ehMontaria:true, tamanho:"Enorme", tipoNarrativo:null, restricao:null, niveis:{iniciante:"seu deslocamento muda para 12m e você recebe +1 na Defesa.", veterano:"o bônus na Defesa muda para +2 e você recebe uma ação de movimento extra por turno (apenas para se deslocar).", mestre:"você recebe redução de dano 5."}},
  {nome:"Bulette", ehMontaria:true, tamanho:"Grande", tipoNarrativo:null, restricao:null, niveis:{iniciante:"seu deslocamento muda para 9m (escavação 6m) e, uma vez por rodada, você recebe +1d6 em uma rolagem de dano corpo a corpo.", veterano:"o bônus em rolagens de dano muda para +1d10.", mestre:"o deslocamento de escavação muda para 12m e o bônus em rolagens de dano muda para +2d8."}},
  {nome:"Búfalo-de-guerra", ehMontaria:true, tamanho:"Grande", tipoNarrativo:null, restricao:null, niveis:{iniciante:"seu deslocamento muda para 9m e seu limite de carga aumenta em 5 espaços. Uma vez por rodada, quando faz uma investida montada, você recebe +1d8 em uma rolagem de dano corpo a corpo.", veterano:"seu deslocamento muda para 12m e ignora terreno difícil.", mestre:"o bônus em rolagens de dano corpo a corpo muda para +2d8 e você recebe uma ação de movimento extra por turno (apenas para se deslocar)."}},
  {nome:"Capivara", ehMontaria:true, tamanho:null, tipoNarrativo:null, restricao:null, niveis:{iniciante:"seu deslocamento muda para 9m (natação 12m) e você recebe uma ação de movimento extra por turno (apenas para se deslocar).", veterano:"você pode usar Aparência Inofensiva (se já possuir esse poder, a CD para resistir a ele aumenta em +2).", mestre:"uma vez por rodada, você recebe +1d6 em uma rolagem de dano corpo a corpo."}},
  {nome:"Carcaju", ehMontaria:false, tamanho:null, tipoNarrativo:"fortão", restricao:null, niveis:{iniciante:"uma vez por rodada você recebe +1d6 em uma rolagem de dano corpo a corpo. Se rolar um 6 nesse dado extra de dano, você pode rolar +1d6 e somar ao resultado uma vez.", veterano:"sua margem de ameaça com armas corpo a corpo aumenta em +1.", mestre:"quando sofre dano, você recebe +2 em testes de ataque e rolagens de dano até o fim de seu próximo turno."}},
  {nome:"Cavalo de Namalkah", ehMontaria:true, tamanho:"Grande", tipoNarrativo:null, restricao:null, niveis:{iniciante:"seu deslocamento muda para 15m e você recebe uma ação de movimento extra por turno (apenas para se deslocar).", veterano:"seu deslocamento muda para 18m e você recebe +2 em ataques corpo a corpo.", mestre:"Segunda ação de movimento extra por turno (novamente, só pra se deslocar); 1x/rodada, +2d6 numa rolagem de dano corpo a corpo."}},
  {nome:"Cavalo esqueleto", ehMontaria:true, tamanho:"Grande", tipoNarrativo:null, restricao:null, niveis:{iniciante:"seu deslocamento muda para 12m e você recebe uma ação de movimento extra por turno (apenas para se deslocar).", veterano:"você recebe +2 em Intimidação e na CD de efeitos de medo.", mestre:"você recebe uma segunda ação de movimento extra por turno (novamente, apenas para se deslocar) e o alcance de seus efeitos de medo aumenta em um passo (de curto para médio, de médio para longo)."}},
  {nome:"Cavalo glacial", ehMontaria:true, tamanho:"Grande", tipoNarrativo:null, restricao:null, niveis:{iniciante:"seu deslocamento muda para 9m (natação 12m) e você recebe redução de frio 5.", veterano:"uma vez por rodada, quando faz um ataque corpo a corpo, você pode gastar 1 PM. Se fizer isso e acertar o ataque, você causa +2d6 pontos de dano de frio.", mestre:"muda a redução de frio para 10 e você recebe uma ação de movimento extra (apenas para se deslocar)."}},
  {nome:"Cocatriz", ehMontaria:false, tamanho:null, tipoNarrativo:"adepto", restricao:null, niveis:{iniciante:"suas habilidades mágicas que causam condições de movimento têm o custo reduzido em –1 PM.", veterano:"a CD para resistir a essas habilidades aumenta em +2.", mestre:"a redução de custo se torna cumulativa com outras reduções."}},
  {nome:"Cocatriz", ehMontaria:false, tamanho:null, tipoNarrativo:"adepto", restricao:null, niveis:{iniciante:"Suas habilidades mágicas que causam condições de movimento têm custo reduzido em –1 PM.", veterano:"A CD pra resistir a essas habilidades aumenta em +2.", mestre:"A redução de custo se torna cumulativa com outras."}},
  {nome:"Cocatriz-real", ehMontaria:true, tamanho:"Grande", tipoNarrativo:null, restricao:null, niveis:{iniciante:"seu deslocamento muda para 12m e você ignora terreno difícil.", veterano:"uma vez por rodada, quando acerta um ataque corpo a corpo, você pode fazer com que a vítima fique lenta (Fort CD For evita).", mestre:"seu deslocamento muda para 12m (normal e de voo). Entretanto, quando voa, você deve terminar seu movimento sobre o chão ou outra superfície firme."}},
  {nome:"Corcel de Kally", ehMontaria:true, tamanho:"Grande", tipoNarrativo:null, restricao:null, niveis:{iniciante:"seu deslocamento muda para 12m e, uma vez por rodada, você recebe +1d6 em uma rolagem de dano corpo a corpo.", veterano:"o bônus na rolagem de dano muda para +1d8 e seu deslocamento muda para 12m (normal e de voo).", mestre:"seu deslocamento normal e de voo muda para 18m e, uma vez por rodada, você pode gastar 2 PM para causar 3d8 pontos de dano de fogo em todas as criaturas em um cone de 6m (Ref CD Car reduz à metade)."}},
  {nome:"Corcel de comando", ehMontaria:true, tamanho:"Grande", tipoNarrativo:null, restricao:null, niveis:{iniciante:"seu deslocamento muda para 12m e você ignora a penalidade por terreno difícil.", veterano:"você pode lançar a magia Campo de Força (apenas o efeito básico). Se aprender essa magia, seu custo diminui em –1 PM.", mestre:"o alcance de suas habilidades baseadas em som (como Músicas de bardo) aumenta em um passo (de curto para médio e de médio para longo)."}},
  {nome:"Corcel do deserto", ehMontaria:true, tamanho:"Grande", tipoNarrativo:null, restricao:null, niveis:{iniciante:"seu deslocamento muda para 12m e você ignora terreno difícil natural.", veterano:"uma vez por rodada, você pode gastar 1 PM para causar 2d6 pontos de dano de impacto em uma criatura adjacente.", mestre:"seu deslocamento muda para 15m e você recebe +5 em testes para resistir a efeitos de clima, calor e frio (veja Tormenta20, p. 267)."}},
  {nome:"Cão de Kally", ehMontaria:false, tamanho:null, tipoNarrativo:"fortão", restricao:null, niveis:{iniciante:"1x/rodada, uma rolagem de dano corpo a corpo causa +1d6 de fogo.", veterano:"Vira +2d6.", mestre:"Além do normal, 1x/rodada, 2 PM pra causar 4d6 de fogo num cone de 6m."}},
  {nome:"Dai-kabuto", ehMontaria:true, tamanho:"Grande", tipoNarrativo:null, restricao:null, niveis:{iniciante:"seu deslocamento muda para 9m e você recebe +2 em testes de agarrar e derrubar e uma ação de movimento extra por turno (apenas para se deslocar).", veterano:"você recebe deslocamento de voo 6m.", mestre:"o bônus em agarrar se aplica a todas as manobras e você recebe +2 na Defesa."}},
  {nome:"Deinonico", ehMontaria:true, tamanho:null, tipoNarrativo:null, restricao:null, niveis:{iniciante:"seu deslocamento muda para 12m e sua margem de ameaça com armas corpo a corpo aumenta em +1.", veterano:"você recebe +5 em testes de Atletismo para saltar e uma ação de movimento adicional por turno (apenas para se deslocar).", mestre:"seu deslocamento muda para 15m e o bônus na margem de ameaça aumenta para +2."}},
  {nome:"Dromedário", ehMontaria:true, tamanho:"Grande", tipoNarrativo:null, restricao:null, niveis:{iniciante:"seu deslocamento muda para 12m e ignora terreno difícil natural em desertos e terrenos similares.", veterano:"você recebe +2 em Percepção e Sobrevivência (este bônus é dobrado em desertos) e, uma vez por rodada, pode gastar 1 PM para causar 1d4+3 pontos de dano de impacto em uma criatura em alcance curto..", mestre:"você recebe uma ação de movimento extra por turno (apenas para se deslocar) e +5 em testes para resistir a efeitos de clima."}},
  {nome:"Elefante", ehMontaria:true, tamanho:"Enorme", tipoNarrativo:null, restricao:null, niveis:{iniciante:"seu deslocamento muda para 12m e ignora terreno difícil.", veterano:"uma vez por rodada, você pode sacar um item ou pegar um objeto solto em alcance de 4,5m como ação livre.", mestre:"Você recebe +5 em testes de manobra para atropelar e, uma vez por rodada, se vencer o teste para atropelar uma criatura, pode pagar 1 PM para fazer um ataque contra ela."}},
  {nome:"Elemental", ehMontaria:false, tamanho:null, tipoNarrativo:"assassino", restricao:null, niveis:{iniciante:"a CD para resistir aos seus efeitos de veneno aumenta em +2 e, uma vez por rodada, você pode gastar 1 PM para envenenar uma arma que esteja usando. No próximo ataque que acertar com ela nesta cena, a arma causa perda de 1d12 PV.", veterano:"você também pode gastar 3 PM para aplicar um veneno que causa perda de 2d12 PV.", mestre:"seus efeitos de veneno ignoram imunidade a veneno e você também pode gastar 5 PM para aplicar um veneno que causa perda de 3d12 PV."}},
  {nome:"Escudeiro", ehMontaria:false, tamanho:null, tipoNarrativo:"fortão", restricao:null, niveis:{iniciante:"Pode empunhá-lo como escudo pesado ou lança pesada na mesma mão; pode atacar com a lança sem perder o bônus na Defesa do escudo, mas não pode atacar com as duas na mesma rodada.", veterano:"Recebe uma melhoria de arma ou de escudo (exceto material especial).", mestre:"Recebe uma segunda melhoria de arma ou de escudo (exceto material especial)."}},
  {nome:"Fofo", ehMontaria:false, tamanho:null, tipoNarrativo:"guardião", restricao:null, niveis:{iniciante:"você recebe redução de dano 1.", veterano:"a RD aumenta para 2 e você pode vestir um item que ocupe 1 espaço ou menos sem contar em seu limite de itens vestidos.", mestre:"a RD aumenta para 3."}},
  {nome:"Galhada fêmea", ehMontaria:true, tamanho:"Grande", tipoNarrativo:null, restricao:null, niveis:{iniciante:"seu deslocamento muda para 12m e você pode gastar uma ação padrão e 1 PM para curar 1d8+1 PV.", veterano:"você também pode gastar uma ação padrão e 3 PM para curar 3d8+3 PV ou remover uma condição de doença, fadiga, paralisia ou veneno que o esteja afetando.", mestre:"você recebe uma ação de movimento extra por turno (apenas para se deslocar) e pode também gastar uma ação padrão e 5 PM para curar 6d8+6 PV."}},
  {nome:"Galhada macho", ehMontaria:true, tamanho:"Grande", tipoNarrativo:null, restricao:null, niveis:{iniciante:"seu deslocamento muda para 12m e você recebe +2 em Sobrevivência.", veterano:"seus ataques corpo a corpo são considerados mágicos e, uma vez por turno, você recebe +1d8 em uma rolagem de dano corpo a corpo (esse bônus é dobrado contra mortos-vivos).", mestre:"o bônus em rolagens de dano muda para +1d10 e você recebe uma ação de movimento extra por turno (apenas para se deslocar)."}},
  {nome:"Gambá", ehMontaria:false, tamanho:null, tipoNarrativo:"vigilante", restricao:null, niveis:{iniciante:"você recebe +2 em Iniciativa e Percepção.", veterano:"você pode gastar uma ação de movimento e 1 PM para deixar uma criatura em alcance curto enjoada por 1d4 rodadas (Fort CD Sab evita).", mestre:"os bônus em perícias aumentam para +5."}},
  {nome:"Hiena", ehMontaria:false, tamanho:null, tipoNarrativo:"perseguidor", restricao:null, niveis:{iniciante:"+2 em Furtividade e Sobrevivência.", veterano:"você pode usar Oportunismo. Se possuir esse poder, em vez disso seu custo diminui em –1 PM.", mestre:"você pode usar Sentidos Aguçados. Alternativamente, uma hiena pode ser uma montaria Média com as estatísticas de um hienodonte (a seguir)."}},
  {nome:"Hienodonte", ehMontaria:true, tamanho:"Grande", tipoNarrativo:null, restricao:null, niveis:{iniciante:"seu deslocamento muda para 12m e você recebe uma ação de movimento extra por turno (apenas para se deslocar).", veterano:"você pode usar Oportunismo. Se possuir esse poder, em vez disso seu custo diminui em –1 PM.", mestre:"quando acerta um ataque corpo a corpo, você pode fazer a manobra derrubar como uma ação livre."}},
  {nome:"Hippossauro", ehMontaria:true, tamanho:"Grande", tipoNarrativo:null, restricao:null, niveis:{iniciante:"seu deslocamento muda para 12m e você recebe +2 em Diplomacia (hippossauro macho) ou em Furtividade (hipossauro fêmea).", veterano:"seu deslocamento muda para 15m e, uma vez por rodada, você recebe +1d8 em uma rolagem de dano corpo a corpo.", mestre:"muda o bônus na perícia para +4 e você recebe uma ação de movimento extra (apenas para se deslocar)."}},
  {nome:"Homúnculo", ehMontaria:false, tamanho:null, tipoNarrativo:"ajudante", restricao:null, niveis:{iniciante:"seus venenos causam a perda de +1 PV por dado.", veterano:"uma vez por rodada, quando faz um ataque, você pode gastar 1 PM. Se acertar o ataque, causa a perda de 1d12 PV por veneno.", mestre:"a perda de PV aumenta para +2 por dado."}},
  {nome:"Ko-kabuto", ehMontaria:false, tamanho:null, tipoNarrativo:"guardião", restricao:null, niveis:{iniciante:"você recebe visão na penumbra e +1 na Defesa.", veterano:"uma vez por rodada, você recebe +1d8 em uma rolagem de dano corpo a corpo.", mestre:"o bônus na Defesa muda para +2 e o bônus em rolagens de dano muda para +1d10. Alternativamente, um ko-kabuto pode ser uma montaria Pequena (adequada a criaturas Minús­culas) com as estatísticas de um dai-kabuto (a seguir)."}},
  {nome:"Leão", ehMontaria:true, tamanho:"Grande", tipoNarrativo:null, restricao:null, niveis:{iniciante:"seu deslocamento muda para 12m e, uma vez por rodada, você recebe +1d6 em rolagens de dano corpo a corpo.", veterano:"quando faz uma investida, o bônus em rolagens de dano corpo a corpo dobra.", mestre:"seu deslocamento muda para 15m e o bônus em rolagens de dano corpo a corpo muda para +1d10."}},
  {nome:"Malafex", ehMontaria:false, tamanho:null, tipoNarrativo:"ajudante", restricao:"apenas devotos de Nimb", niveis:{iniciante:"você pode usar Sorte dos Loucos. Se já tiver esse poder, a perda de PM é reduzida para 1d4.", veterano:"você pode usar Sorte dos Loucos em aliados voluntários em alcance curto (caso falhe, o aliado perde os PM).", mestre:"quando um inimigo em alcance curto faz um teste, você pode gastar 2 PM para forçá-lo a rolar novamente o dado. Se ainda assim ele passar, você perde 1d6 PM (ou 1d4 se tiver Sorte dos Loucos)."}},
  {nome:"Mamute", ehMontaria:true, tamanho:"Enorme", tipoNarrativo:null, restricao:null, niveis:{iniciante:"Mesmos benefícios de um Elefante — deslocamento 12m, ignora terreno difícil.", veterano:"Mesmos benefícios de um Elefante — 1x/rodada, ação livre pra sacar item/pegar objeto solto em 4,5m.", mestre:"Mesmos benefícios de um Elefante — +5 em testes de atropelar; 1x/rodada, vencendo o atropelo, 1 PM pra um ataque extra."}},
  {nome:"Panda", ehMontaria:true, tamanho:null, tipoNarrativo:null, restricao:null, niveis:{iniciante:"seu deslocamento muda para 9m e você recebe +2 em Diplomacia e uma ação de movimento extra por turno (apenas para se deslocar).", veterano:"você pode usar Rolamento Defensivo. Caso possua esse poder, em vez disso o custo para usá-lo diminui em –1 PM.", mestre:"você pode usar Aparência Inofensiva. Se possuir esse poder, a CD para resistir a ele aumenta em +2."}},
  {nome:"Pantera", ehMontaria:false, tamanho:null, tipoNarrativo:"assassino", restricao:null, niveis:{iniciante:"uma vez por rodada, quando causa dano com um ataque corpo a corpo, você pode deixar o alvo sangrando.", veterano:"a CD dos testes para remover um sangramento que você provoca aumenta em +2.", mestre:"os sangramentos que você provoca exigem dois sucessos em testes para serem removidos."}},
  {nome:"Perdigueiro troll", ehMontaria:false, tamanho:null, tipoNarrativo:"perseguidor", restricao:null, niveis:{iniciante:"+2 em Percepção e Sobrevivência.", veterano:"+2 em testes pra agarrar e derrubar; pode manter uma criatura Grande ou menor agarrada sem ocupar uma mão.", mestre:"Os bônus viram +5; 1x/rodada, ao acertar corpo a corpo, pode usar Agarrar como reação."}},
  {nome:"Platan", ehMontaria:true, tamanho:"Grande", tipoNarrativo:null, restricao:null, niveis:{iniciante:"seu deslocamento muda para natação 9m e e você recebe uma ação de movimento extra (apenas para se deslocar).", veterano:"uma vez por rodada, você pode gastar 1 PM para causar 2d6 pontos de dano de impacto em uma criatura em alcance curto.", mestre:"seu deslocamento de natação muda para 15m e você pode também gastar 4 PM para causar 6d6 pontos de dano de impacto em uma criatura em alcance curto."}},
  {nome:"Rinoceronte", ehMontaria:true, tamanho:"Grande", tipoNarrativo:null, restricao:null, niveis:{iniciante:"seu deslocamento muda para 12m e você recebe +2 em testes de ataque quando faz investidas.", veterano:"Pode usar Carga de Cavalaria. Se já tiver esse poder, o bônus no dano vira +2d8 e a vítima é arremessada 1d6×1,5m na direção oposta.", mestre:"quando faz uma investida você ignora 10 pontos de redução de dano do alvo."}},
  {nome:"Rinoceronte lanoso", ehMontaria:true, tamanho:"Grande", tipoNarrativo:null, restricao:null, niveis:{iniciante:"seu deslocamento muda para 12m e você recebe +2 em testes de ataque quando faz investidas.", veterano:"você pode usar Carga de Cavalaria. Se possui esse poder, o bônus no dano em investida aumenta em +1d8.", mestre:"seu deslocamento não é afetado por gelo ou neve."}},
  {nome:"Sapo atroz", ehMontaria:true, tamanho:"Grande", tipoNarrativo:null, restricao:null, niveis:{iniciante:"seu deslocamento muda para 9m (normal e de natação) e você recebe uma ação de movimento extra por turno (apenas para se deslocar) e +5 em testes de Atletismo para saltar.", veterano:"você recebe +2 em testes para derrubar e desarmar.", mestre:"muda o bônus de Atletismo para +10 e, uma vez por rodada, você pode gastar 1 PM para fazer uma manobra desarmar ou derrubar contra um alvo a até 3m."}},
  {nome:"Selako", ehMontaria:true, tamanho:"Grande", tipoNarrativo:null, restricao:null, niveis:{iniciante:"seu deslocamento muda para natação 15m e, uma vez por rodada, você recebe +1d6 em uma rolagem de dano corpo a corpo.", veterano:"o bônus de dano aumenta para +2d6.", mestre:"seu deslocamento de natação muda para 18m e, quando você usa o bônus de dano do selako contra uma criatura, ela fica sangrando."}},
  {nome:"Tatu-montanha", ehMontaria:true, tamanho:"Enorme", tipoNarrativo:null, restricao:null, niveis:{iniciante:"seu deslocamento muda para 9m (normal e de natação) e você recebe uma ação de movimento extra por turno (apenas para se deslocar).", veterano:"você recebe +1 na Defesa e redução de ácido 5.", mestre:"muda o bônus na Defesa para +2 e a redução de ácido para 10."}},
  {nome:"Tentacute", ehMontaria:false, tamanho:null, tipoNarrativo:"vigilante", restricao:null, niveis:{iniciante:"você recebe +2 em Percepção e, quando faz um teste de Ladinagem para punga, pode rolar dois dados e usar o melhor resultado.", veterano:"uma vez por rodada, você pode gastar uma ação de movimento e 1 PM para fazer um teste de Ladinagem para punga contra um alvo em alcance curto que possa ser alcançado pelo tentacute.", mestre:"o bônus em Percepção se torna +4 e o alcance da punga muda para médio."}},
  {nome:"Tigre", ehMontaria:true, tamanho:"Grande", tipoNarrativo:null, restricao:null, niveis:{iniciante:"seu deslocamento muda para 12m e você recebe +5 em Iniciativa.", veterano:"na primeira rodada de combate, você recebe +5 em testes de ataque e rolagens de dano com armas.", mestre:"seu deslocamento muda para 15m e você recebe uma ação de movimento extra por turno (apenas para se deslocar)."}},
  {nome:"Tumarkhân", ehMontaria:true, tamanho:"Enorme", tipoNarrativo:null, restricao:null, niveis:{iniciante:"seu deslocamento muda para 12m e seu limite de carga aumenta em 5 espaços.", veterano:"você recebe uma ação de movimento extra por turno (apenas para se deslocar) Tumarkhân e, uma vez por rodada, recebe +1d8 em uma rolagem de dano corpo a corpo.", mestre:"o bônus no limite de carga muda para 10 espaços e, quando faz um teste de Força ou de perícia baseada em Força, você pode gastar 2 PM para rolar dois dados e usar o melhor resultado."}},
  {nome:"Tuntram", ehMontaria:true, tamanho:"Enorme", tipoNarrativo:null, restricao:null, niveis:{iniciante:"Deslocamento 9m; +2 em testes de ataque pra derrubar e empurrar.", veterano:"Cobertura leve contra ataques à distância; +1 ação de movimento extra (só pra se deslocar).", mestre:"+2 em testes de ataque pra atropelar; na manobra de atropelar, o oponente não pode sair do caminho (mas ainda resiste com teste oposto)."}},
  {nome:"Unicórnio", ehMontaria:true, tamanho:"Grande", tipoNarrativo:null, restricao:null, niveis:{iniciante:"seu deslocamento muda para 12m e você recebe uma ação de movimento extra por turno (apenas para se deslocar).", veterano:"seu deslocamento muda para 15m e você pode lançar Purificação. Se aprender essa magia, seu custo é reduzido em –1 PM.", mestre:"cada dado de seus efeitos mágicos de cura aumenta em um passo (até o máximo de d12). Unicórnios só aceitam ser cavalgados por pessoas que considerem dignas e seus critérios nem sempre são transparentes. O mestre tem a palavra final sobre se um personagem é digno de cavalgar um unicórnio.."}},
  {nome:"Urso das cavernas", ehMontaria:true, tamanho:"Enorme", tipoNarrativo:null, restricao:null, niveis:{iniciante:"seu deslocamento muda para 12m e você recebe redução de dano 2.", veterano:"uma vez por rodada, quando acerta um ataque corpo a corpo, você pode fazer a manobra agarrar como uma ação livre. Essa manobra não deixa sua mão ocupada, mas você só pode manter um inimigo agarrado desta forma.", mestre:"muda a redução de dano para 5."}},
  {nome:"Urso das neves", ehMontaria:true, tamanho:"Grande", tipoNarrativo:null, restricao:null, niveis:{iniciante:"seu deslocamento muda para 12m e você recebe redução de frio 5.", veterano:"seu deslocamento muda para 12m (normal e de natação) e a redução de frio aumenta para 10.", mestre:"a redução de frio aumenta para 20."}},
  {nome:"Urso pardo", ehMontaria:true, tamanho:"Grande", tipoNarrativo:null, restricao:null, niveis:{iniciante:"seu deslocamento muda para 12m e, uma vez por rodada, você recebe +1d6 em uma rolagem de dano corpo a corpo.", veterano:"uma vez por rodada, quando acerta um ataque corpo a corpo, você pode fazer a manobra agarrar como uma ação livre. Essa manobra não deixa sua mão ocupada, mas você só pode manter um inimigo agarrado por vez.", mestre:"muda o bônus em rolagens de dano corpo a corpo para +1d10."}},
  {nome:"Verilêmur", ehMontaria:false, tamanho:null, tipoNarrativo:"vigilante", restricao:"apenas devotos de Khalmyr", niveis:{iniciante:"você pode lançar a magia Círculo da Justiça (atributo-chave Sabedoria); se aprender essa magia, seu custo diminui em –1 PM.", veterano:"quando falha em um teste de resistência contra uma magia, você pode gastar 2 PM para rolar novamente esse teste (apenas uma vez por teste).", mestre:"a CD para resistir à sua magia Círculo da Justiça aumenta em +5."}},
  {nome:"Warg", ehMontaria:true, tamanho:"Grande", tipoNarrativo:null, restricao:null, niveis:{iniciante:"seu deslocamento muda para 12m e você recebe uma ação de movimento extra por turno (apenas para se deslocar).", veterano:"você recebe +2 em Furtividade e pode usar a habilidade Ataque Furtivo +2d6 (se já possui Ataque Furtivo, o bônus de dano se acumula).", mestre:"uma vez por rodada, quando acerta um ataque corpo a corpo, você pode fazer a manobra derrubar como uma ação livre."}},
];
