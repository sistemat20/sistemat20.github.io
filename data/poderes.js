// Dados de Poderes Gerais — Tormenta 20 (Livro Básico, Cap. 2: Perícias & Poderes)
// grupo: 'Combate' | 'Destino' | 'Magia'
// prereq: texto exibido ao jogador. prereqTags: usados pelo verificador automático.
//   ["attr","for",1] = Força 1+   |  ["treinado","Luta"] = treinado em Luta  |  ["treinadoQualquer"]
//   ["conjurador"] = lança magias |  ["nivel",N] = nível de personagem N+   |  ["skip"] = não verificável
//   ["poder","Nome"] = já tem o poder "Nome"  |  ["poderOr",["A","B"]] = já tem A ou B
// repetivel: true = pode ser escolhido de novo (cada escolha é independente, ex. arma/perícia diferente)
function P(nome, grupo, prereq, prereqTags, desc, escolha, repetivel){ return {nome, grupo, prereq, prereqTags, desc, escolha: escolha||null, repetivel: !!repetivel}; }

const PODERES_GERAIS = [
  // ---- Combate ----
  P("Acuidade com Arma","Combate","Des 1",[["attr","des",1]], "Usa Destreza em vez de Força em ataques/dano com armas leves ou de arremesso."),
  P("Ataque Poderoso","Combate","For 1",[["attr","for",1]], "Sofre –2 no teste de ataque corpo a corpo para receber +5 na rolagem de dano."),
  P("Quebrar Aprimorado","Combate","Poder: Ataque Poderoso",[["poder","Ataque Poderoso"]], "+2 em testes de ataque para quebrar objetos; ao reduzir os PV de uma arma a 0, gasta 1 PM para atacar quem a empunhava."),
  P("Trespassar","Combate","Poder: Ataque Poderoso",[["poder","Ataque Poderoso"]], "Ao reduzir um inimigo corpo a corpo a 0 PV, gasta 1 PM para atacar outra criatura no alcance."),
  P("Combate Defensivo","Combate","Int 1",[["attr","int",1]], "Ao agredir, pode sofrer –2 em ataque para receber +5 na Defesa até seu próximo turno."),
  P("Derrubar Aprimorado","Combate","Poder: Combate Defensivo",[["poder","Combate Defensivo"]], "+2 em testes para derrubar; ao derrubar um inimigo, pode fazer isso sem gastar uma ação."),
  P("Desarmar Aprimorado","Combate","Poder: Combate Defensivo",[["poder","Combate Defensivo"]], "+2 em testes para desarmar; ao desarmar um inimigo, a arma vai parar em suas mãos."),
  P("Empunhadura Poderosa","Combate","For 3",[["attr","for",3]], "Penalidade por usar arma de categoria de tamanho maior cai de –5 para –2."),
  P("Encouraçado","Combate","Proficiência com armaduras pesadas",[["skip"]], "Usando armadura pesada, +2 na Defesa."),
  P("Inexpugnável","Combate","6º nível, poder: Encouraçado",[["nivel",6],["poder","Encouraçado"]], "Usando armadura pesada, reduz em 2 qualquer dano que sofrer."),
  P("Fanático","Combate","12º nível, poder: Encouraçado",[["nivel",12],["poder","Encouraçado"]], "Uma vez por cena, ao ser reduzido a 0 PV usando armadura pesada, fica com 1 PV em vez de cair."),
  P("Esquiva","Combate","Des 1",[["attr","des",1]], "+2 na Defesa e em Reflexos."),
  P("Estilo Desarmado","Combate","Treinado em Luta",[["treinado","Luta"]], "Ataques desarmados causam 1d6 e podem ser letais ou não à escolha."),
  P("Estilo de Arma e Escudo","Combate","Treinado em Luta, proficiência com escudos",[["treinado","Luta"]], "Usando escudo, o bônus na Defesa que ele dá aumenta em +2."),
  P("Ataque com Escudo","Combate","Poder: Estilo de Arma e Escudo",[["poder","Estilo de Arma e Escudo"]], "Pode atacar com o escudo (1d4, impacto) sem penalidade por usar duas armas."),
  P("Bloqueio com Escudo","Combate","Poder: Estilo de Arma e Escudo",[["poder","Estilo de Arma e Escudo"]], "Gasta uma reação e 1 PM para anular todo o dano de um ataque bem-sucedido contra você."),
  P("Estilo de Arma Longa","Combate","For 1, treinado em Luta",[["attr","for",1],["treinado","Luta"]], "+2 em ataques com armas alongadas; pode atacar alvos adjacentes com elas."),
  P("Piqueiro","Combate","Poder: Estilo de Arma Longa",[["poder","Estilo de Arma Longa"]], "Com arma alongada, pode atacar uma vez de graça uma criatura que entre no seu alcance."),
  P("Estilo de Uma Arma","Combate","Treinado em Luta",[["treinado","Luta"]], "Com uma arma corpo a corpo em uma mão e nada na outra: +2 na Defesa e no ataque com ela."),
  P("Ataque Preciso","Combate","Poder: Estilo de Uma Arma",[["poder","Estilo de Uma Arma"]], "Com uma arma em uma mão e nada na outra, soma metade do nível no dano com ela."),
  P("Estilo de Duas Armas","Combate","Des 2, treinado em Luta",[["attr","des",2],["treinado","Luta"]], "Empunhando duas armas (uma leve), pode atacar com as duas (–2 nos ataques até o próximo turno)."),
  P("Arma Secundária Grande","Combate","Poder: Estilo de Duas Armas",[["poder","Estilo de Duas Armas"]], "Pode usar uma arma leve ou de tamanho normal como secundária (em vez de só leve)."),
  P("Estilo de Duas Mãos","Combate","For 2, treinado em Luta",[["attr","for",2],["treinado","Luta"]], "Usando arma corpo a corpo com as duas mãos, +5 nas rolagens de dano."),
  P("Ataque Pesado","Combate","Poder: Estilo de Duas Mãos",[["poder","Estilo de Duas Mãos"]], "Usando arma com as duas mãos, pode sofrer –5 no ataque para causar +10 no dano."),
  P("Estilo de Arremesso","Combate","Treinado em Pontaria",[["treinado","Pontaria"]], "Saca armas de arremesso como ação livre; +2 no dano com elas."),
  P("Arremesso Múltiplo","Combate","Des 1, poder: Estilo de Arremesso",[["attr","des",1],["poder","Estilo de Arremesso"]], "Pode arremessar duas armas na mesma ação de ataque (–2 em cada teste)."),
  P("Arremesso Potente","Combate","For 1, poder: Estilo de Arremesso",[["attr","for",1],["poder","Estilo de Arremesso"]], "Soma Força (em vez de Destreza) no dano de armas de arremesso."),
  P("Estilo de Disparo","Combate","Treinado em Pontaria",[["treinado","Pontaria"]], "Usando arma de disparo, soma Destreza nas rolagens de dano."),
  P("Disparo Preciso","Combate","Poder: Estilo de Disparo ou Estilo de Arremesso",[["poderOr",["Estilo de Disparo","Estilo de Arremesso"]]], "Não sofre penalidade de ataque à distância por mirar em alvo engajado em combate corpo a corpo."),
  P("Mira Apurada","Combate","Sab 1, poder: Disparo Preciso",[["attr","sab",1],["poder","Disparo Preciso"]], "Gasta uma ação padrão para mirar; seu próximo ataque à distância nesta rodada tem +5 e crítico automático."),
  P("Disparo Rápido","Combate","Des 1, poder: Estilo de Disparo",[["attr","des",1],["poder","Estilo de Disparo"]], "Pode atacar duas vezes com arma de disparo na mesma ação de ataque (–2 em cada teste)."),
  P("Finta Aprimorada","Combate","Treinado em Enganação",[["treinado","Enganação"]], "+2 em Enganação para fintar; pode fintar como ação de movimento."),
  P("Foco em Arma","Combate","Proficiência com a arma",[["skip"]], "Escolha uma arma: +2 em ataques com ela.",
    {tipo:'arma', label:'Com qual arma?'}, true),
  P("Ginete","Combate","Treinado em Cavalgar",[["treinado","Cavalgar"]], "Nunca cai da montaria por dano; sem penalidade para atacar/lançar magias montado."),
  P("Carga de Cavalaria","Combate","Poder: Ginete",[["poder","Ginete"]], "Montado e usando ação de investida, seu ataque causa +2 dados de dano em vez de +1."),
  P("Presença Aterradora","Combate","Treinado em Intimidação",[["treinado","Intimidação"]], "Gasta ação padrão e 1 PM para assustar todas as criaturas escolhidas em alcance curto."),
  P("Proficiência","Combate","—",[], "Escolhe uma proficiência nova: armas marciais, armas de fogo, armaduras pesadas ou escudos.",
    {tipo:'lista', label:'Qual proficiência?', opcoes:["Armas marciais","Armas de fogo","Armaduras pesadas","Escudos"]}, true),
  P("Reflexos de Combate","Combate","Des 1",[["attr","des",1]], "Ação de movimento extra no primeiro turno de cada combate."),
  P("Saque Rápido","Combate","Treinado em Iniciativa",[["treinado","Iniciativa"]], "+2 em Iniciativa; saca/guarda itens como ação livre; recarrega mais rápido."),
  P("Vitalidade","Combate","Con 1",[["attr","con",1]], "+1 PV por nível de personagem e +2 em Fortitude."),

  // ---- Destino ----
  P("Acrobático","Destino","Des 2",[["attr","des",2]], "Usa Destreza em vez de Força em Atletismo; terreno difícil não reduz deslocamento."),
  P("Aparência Inofensiva","Destino","Car 1",[["attr","car",1]], "A 1ª criatura inteligente que te atacar numa cena testa Vontade ou perde a ação."),
  P("Atlético","Destino","For 2",[["attr","for",2]], "+2 em Atletismo e +3m de deslocamento."),
  P("Atraente","Destino","Car 1",[["attr","car",1]], "+2 em perícias baseadas em Carisma contra quem se sinta atraído por você."),
  P("Comandar","Destino","Car 1",[["attr","car",1]], "Gasta ação de movimento e 1 PM: aliados em alcance médio ganham +1 em perícia até o fim da cena."),
  P("Costas Largas","Destino","Con 1, For 1",[["attr","con",1],["attr","for",1]], "+5 no limite de carga; pode usar um item vestido adicional."),
  P("Foco em Perícia","Destino","Treinado na perícia escolhida",[["treinadoQualquer"]], "Escolha uma perícia: gasta 1 PM para rolar 2 dados e ficar com o melhor.",
    {tipo:'pericia', label:'Em qual perícia treinada?', apenasTreinadas:true}, true),
  P("Inventário Organizado","Destino","Int 1",[["attr","int",1]], "Soma Inteligência no limite de carga; itens muito leves ocupam 1/4 de espaço."),
  P("Investigador","Destino","Int 1",[["attr","int",1]], "+2 em Investigação; soma Inteligência em Intuição."),
  P("Lobo Solitário","Destino","—",[], "+1 em perícia e Defesa quando sem aliados em alcance curto; sem penalidade ao usar Cura em si mesmo."),
  P("Medicina","Destino","Sab 1, treinado em Cura",[["attr","sab",1],["treinado","Cura"]], "Gasta ação completa e teste de Cura (CD15) para curar 1d6+ PV em alguém, 1x/dia por criatura."),
  P("Sentidos Aguçados","Destino","Sab 1, treinado em Percepção",[["attr","sab",1],["treinado","Percepção"]], "+2 em Percepção; nunca desprevenido contra quem não percebe; repete chance de falha por camuflagem."),
  P("Sortudo","Destino","—",[], "Gasta 3 PM para repetir qualquer teste."),
  P("Surto Heroico","Destino","—",[], "Gasta 5 PM para realizar uma ação padrão ou de movimento adicional, 1x por rodada."),
  P("Torcida","Destino","Car 1",[["attr","car",1]], "+2 em perícia e Defesa quando tem torcida (aliados torcendo por você) em alcance médio."),
  P("Treinamento em Perícia","Destino","—",[], "Torna-se treinado em uma perícia à escolha.",
    {tipo:'pericia', label:'Em qual perícia?', apenasTreinadas:false}, true),
  P("Venefício","Destino","Treinado em Ofício (alquimista)",[["treinado","Ofício"]], "Não se envenena acidentalmente; +2 na CD de resistência aos seus venenos."),
  P("Vontade de Ferro","Destino","Sab 1",[["attr","sab",1]], "+1 PM a cada dois níveis; +2 em Vontade."),

  // ---- Magia ----
  P("Foco em Magia","Magia","Lançar magias",[["conjurador"]], "Escolha uma magia que conheça: seu custo cai em –1 PM (anote qual magia nas Notas).", null, true),
  P("Magia Ilimitada","Magia","Lançar magias",[["conjurador"]], "Soma seu atributo-chave no limite de PM que pode gastar numa única magia."),
  P("Preparar Poção","Magia","Habilidade Magias, treinado em Ofício (alquimista)",[["conjurador"],["treinado","Ofício"]], "Fabrica poções com magias de 1º/2º círculo que conhece."),
  P("Escrever Pergaminho","Magia","Habilidade Magias, treinado em Ofício (escriba)",[["conjurador"],["treinado","Ofício"]], "Fabrica pergaminhos com magias que conhece."),
];
