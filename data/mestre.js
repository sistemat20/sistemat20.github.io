// Dados para as Ferramentas do Mestre — Tormenta 20 (Livro Básico, Cap. 7: Ameaças / Cap. 8: Recompensas)

function MO(nome, nd, tipo, tamanho, sentidos, defesa, resistencias, pv, desloc, pm, ataques, habilidades, atributos, pericias, tesouro){
  return {nome, nd, tipo, tamanho, sentidos, defesa, resistencias, pv, desloc, pm, ataques, habilidades, atributos, pericias, tesouro};
}

// nd como número (1/2 vira 0.5) para permitir ordenar/filtrar
const MONSTROS = [
MO("Lobo", 0.5, "Animal", "Médio", "Iniciativa +5, Percepção +6, faro, visão na penumbra", 14, "Fort +6, Ref +3, Von +1", 14, "15m", null,
  ["Mordida +7 (1d6+5)"],
  ["Derrubar (livre): se acerta a mordida, pode fazer a manobra derrubar (teste +7)", "Táticas de Alcateia: +2 no ataque e dano ao flanquear (total +4/+2)"],
  "For 3, Des 3, Con 3, Int –4, Sab 2, Car –2", "Sobrevivência +6", "Nenhum"),
MO("Gorlogg", 1, "Animal", "Grande", "Iniciativa +4, Percepção +3, visão na penumbra", 16, "Fort +8, Ref +5, Von +3", 36, "12m", null,
  ["Mordida +9 (2d6+8, x3)"],
  ["Agarrar Aprimorado (livre): se acerta a mordida, pode agarrar (teste +13)"],
  "For 5, Des 2, Con 5, Int –4, Sab 1, Car –2", "Atletismo +9", "Nenhum"),
MO("Trog (guerreiro)", 1, "Humanoide (trog)", "Médio", "Iniciativa +3, Percepção +0, visão no escuro", 16, "Fort +10, Ref +5, Von +1", 11, "9m", null,
  ["Lança +11 (1d6+5) e mordida +11 (1d6+5)", "À Distância: Azagaia +9 (1d6+5)"],
  ["Mau Cheiro (padrão): gás fétido, enjoo por 1d6 rodadas (Fort CD 15 evita), veneno", "Sangue Frio: sofre +1 dano por dado de dano de frio"],
  "For 3, Des 1, Con 3, Int –2, Sab 0, Car –1", "Furtividade +7", "Metade"),
MO("Gnoll Saqueador", 1, "Humanoide (gnoll)", "Médio", "Iniciativa +5, Percepção +4, faro", 15, "Fort +7, Ref +7, Von +1", 15, "9m", null,
  ["Lança +10 (1d6+4) e mordida +10 (1d6+4)", "À Distância: Arco curto +9 (1d6+3, x3)"],
  [],
  "For 3, Des 2, Con 3, Int –2, Sab 1, Car –1", "—", "Metade"),
MO("Centauro Combatente", 1, "Humanoide (centauro)", "Grande", "Iniciativa +3, Percepção +3", 16, "Fort +9, Ref +2, Von +5", 35, "12m", null,
  ["Tacape +9 (1d12+5) e cascos +9 (1d8+5)", "À Distância: Arco longo +7 (1d10+5, x3)"],
  ["Investida Poderosa: +1d12 de dano numa investida com tacape", "Medo de Altura: fica abalado perto de quedas de 3m+"],
  "For 5, Des 2, Con 3, Int –2, Sab 1, Car –2", "Sobrevivência +5", "Metade"),
MO("Gnoll Filibusteiro", 2, "Humanoide (gnoll)", "Médio", "Iniciativa +9, Percepção +4, faro", 19, "Fort +7, Ref +11, Von +4", 60, "9m", null,
  ["Espada curta +11 (1d6+4, 19) e mordida +11 (1d6+4)", "À Distância: Mosquete +12 (2d8+9, 19/x3)"],
  ["Recarga Rápida: recarrega o mosquete como ação de movimento"],
  "For 3, Des 4, Con 3, Int –1, Sab 2, Car –1", "—", "Padrão"),
MO("Lobo-das-Cavernas", 2, "Animal", "Grande", "Iniciativa +5, Percepção +7, faro, visão na penumbra", 19, "Fort +11, Ref +7, Von +6", 73, "15m", null,
  ["Mordida +13 (2d6+10)"],
  ["Derrubar (livre): teste +15", "Táticas de Alcateia: +4 ataque/+2 dano ao flanquear"],
  "For 6, Des 2, Con 5, Int –4, Sab 2, Car –2", "Sobrevivência +11", "Nenhum"),
MO("Centauro Xamã", 3, "Humanoide (centauro)", "Grande", "Iniciativa +4, Percepção +8", 21, "Fort +9, Ref +4, Von +15", 35, "12m", 20,
  ["Bordão +11 (1d8+4) e cascos +11 (1d8+4)"],
  ["Conjurador (clérigo de Allihanna nível 3, CD 17): Armamento da Natureza, Controlar Plantas, Curar Ferimentos", "Medo de Altura"],
  "For 4, Des 1, Con 3, Int –1, Sab 4, Car 0", "Religião +8, Sobrevivência +10", "Metade"),
MO("Cão do Inferno", 3, "Espírito", "Grande", "Iniciativa +6, Percepção +4, faro, visão no escuro", 21, "Fort +11, Ref +9, Von +7, imunidade a fogo, RD 10/mágico, vulnerável a frio", 95, "12m", null,
  ["Mordida +14 (2d6+6 mais 2d6 fogo)"],
  ["Sopro (padrão): cone 6m, 4d6+4 fogo (Ref CD 17 reduz à metade), recarga em ação de movimento"],
  "For 6, Des 3, Con 4, Int –2, Sab 1, Car –2", "Atletismo +9", "1d4 doses de essência abissal"),
MO("Grifo", 3, "Monstro", "Grande", "Iniciativa +9, Percepção +7, visão no escuro", 19, "Fort +9, Ref +15, Von +4, imunidade a medo", 110, "12m, voo 24m", null,
  ["Mordida +14 (2d6+5) e duas garras +14 (1d6+5)"],
  ["Bote (completa): investida + mordida + 2 garras no mesmo alvo, +2 nos três"],
  "For 5, Des 4, Con 3, Int –4, Sab 2, Car –1", "—", "25% de ninho ter 1d4 ovos (T$ 2.500 cada)"),
MO("Basilisco", 4, "Monstro", "Médio", "Iniciativa +6, Percepção +5, visão no escuro", 23, "Fort +10, Ref +9, Von +9, RD 5", 145, "9m, natação 9m", null,
  ["Mordida +16 (2d8+12 mais veneno)"],
  ["Olhar Petrificante: Reflexos CD 18 ou fica lento; se já lento, petrifica permanentemente", "Veneno: peçonha concentrada"],
  "For 4, Des 2, Con 4, Int –4, Sab 1, Car 0", "—", "1d4 doses de peçonha concentrada; couro (T$ 1.000 matéria-prima)"),
MO("Ogro", 4, "Humanoide (gigante)", "Grande", "Iniciativa +3, Percepção +1, visão na penumbra", 23, "Fort +16, Ref +10, Von +0", 130, "9m", null,
  ["Tacape +16 (1d12+18)"],
  ["Burro Demais...: –5 em Intuição e Vontade (já contabilizado)", "...Para Morrer!: dano de corte/impacto/perfuração reduzido à metade"],
  "For 7, Des 0, Con 4, Int –3, Sab –2, Car –2", "Atletismo +12, Intuição –5", "Padrão"),
MO("Urso-Coruja", 4, "Monstro", "Grande", "Iniciativa +7, Percepção +5, faro, visão no escuro", 23, "Fort +16, Ref +10, Von +5", 145, "12m", null,
  ["Mordida +16 (1d8+5) e duas garras +15 (1d6+5)"],
  ["Agarrar Aprimorado (livre): teste +18"],
  "For 7, Des 3, Con 5, Int –4, Sab 1, Car –2", "—", "Nenhum"),
MO("Capelão de Guerra", 4, "Humanoide (humano)", "Médio", "Iniciativa +4, Percepção +7", 21, "Fort +10, Ref +5, Von +16, imunidade a medo", 105, "6m", 25,
  ["Martelo de guerra +14 (1d8+15, x3)"],
  ["Conjurador (clérigo nível 5, CD 18): Arma Mágica, Bênção, Curar Ferimentos, Soco de Arsenal"],
  "For 4, Des 0, Con 4, Int 1, Sab 3, Car –1", "Misticismo +5, Religião +7", "Padrão"),
MO("Serpe", 5, "Monstro", "Grande", "Iniciativa +5, Percepção +7, faro, visão no escuro", 24, "Fort +10, Ref +16, Von +5, imunidade a paralisia", 200, "9m, voo 18m", null,
  ["Mordida +17 (2d6+12) e ferrão +17 (1d8+12 mais veneno)"],
  ["Agarrar Aprimorado (livre): teste +19", "Veneno: peçonha concentrada"],
  "For 6, Des 1, Con 6, Int –2, Sab 1, Car –1", "—", "1d4 doses de peçonha concentrada"),
MO("Ganchador", 5, "Monstro", "Grande", "Iniciativa +7, Percepção +5, percepção às cegas", 26, "Fort +15, Ref +11, Von +7", 210, "9m, escalar 9m", null,
  ["Mordida +17 (2d6+8) e duas garras +17 (1d8+8, 19/x3)"],
  ["Dilacerar: +2d8+8 se acerta as duas garras no mesmo alvo", "Sensibilidade a Luz: ofuscado sob luz do sol"],
  "For 6, Des 3, Con 5, Int –2, Sab 1, Car –2", "—", "Metade + duas garras (T$ 500 cada em matéria-prima)"),
MO("capitão-Baluarte", 5, "Humanoide (humano)", "Médio", "Iniciativa +4, Percepção +5", 33, "Fort +15, Ref +5, Von +13", 115, "6m", null,
  ["Espada longa +17 (1d8+ alto, líder de tropa)"],
  ["Especialista em liderar investidas de subordinados"],
  "—", "—", "Padrão"),
MO("Tirano do Terceiro", 10, "Humanoide (humano)", "Médio", "Iniciativa +9, Percepção +10, visão no escuro", 37, "Fort +22, Ref +10, Von +16, imunidade a atordoamento e medo, RD 5, resistência a magia +2", 370, "6m", 62,
  ["Machado de batalha x2 +29 (2d8+14, x3) e garra +29 (1d8+14)"],
  ["Dádiva Dracônica: lança magias arcanas cavalgando/de armadura sem teste", "Conjurador (mago nível 10, CD 30): Bola de Fogo, Concentração de Combate, Velocidade"],
  "—", "—", "Dobro"),
MO("Vampiro", 12, "Morto-vivo", "Médio", "Iniciativa +15, Percepção +13, visão no escuro", 45, "Fort +12, Ref +26, Von +20, cura acelerada 10, RD 10/luz", 550, "18m, escalar 18m", null,
  ["Espada longa x2 +36 (2d8+25, 17, mais 2d10 trevas) e garra +36 (2d6+25 mais 2d10 trevas)"],
  ["Dominação Vampírica (padrão): controle mental (Von CD 29 evita)", "Drenar Sangue (padrão): 6d6 dano de perfuração, cura o mesmo tanto", "Forma de Morcego (padrão): vira Minúsculo, voo 12m", "Vulnerável à luz do dia"],
  "—", "—", "Muito alto — trate como vilão/chefe"),
];

// Tabela 7-2: Estatísticas de NPC (Livro Básico, pág. 328) — NPC genérico instantâneo por ND
function NPCG(nd, patamar, ataque, dano, defesa, pv, pericias, cd){
  return {nd, patamar, ataque, dano, defesa, pv, pericias, cd};
}
const NPC_GENERICO = [
NPCG(0.5,"Iniciante","+7","1d6+3",15,10,"+4/+0",14),
NPCG(1,"Iniciante","+9","1d8+6",16,20,"+6/+1",15),
NPCG(2,"Iniciante","+11","1d10+10",18,40,"+8/+2",16),
NPCG(3,"Iniciante","+13","1d12+12",21,70,"+10/+3",17),
NPCG(4,"Iniciante","+15","2d6+14",24,110,"+12/+4",18),
NPCG(5,"Veterano","+18, x2","1d12+11",28,150,"+14/+5",20),
NPCG(6,"Veterano","+20, x2","2d6+15",31,190,"+16/+6",22),
NPCG(7,"Veterano","+22, x2","2d8+19",34,230,"+18/+7",24),
NPCG(8,"Veterano","+24, x2","2d10+20",37,270,"+20/+8",26),
NPCG(9,"Veterano","+26, x2","2d12+21",40,310,"+22/+9",28),
NPCG(10,"Veterano","+29, x2","3d6+26",43,350,"+24/+10",30),
NPCG(11,"Campeão","+32, x3","3d8+24",46,400,"+25/+11",32),
NPCG(12,"Campeão","+35, x3","3d10+26",48,450,"+26/+12",34),
NPCG(13,"Campeão","+37, x3","3d12+28",50,550,"+27/+13",36),
NPCG(14,"Campeão","+40, x3","4d6+38",52,600,"+28/+14",38),
NPCG(15,"Campeão","+42, x3","4d8+40",54,650,"+29/+15",40),
NPCG(16,"Campeão","+45, x3","4d10+42",56,700,"+30/+16",42),
NPCG(17,"Lenda","+47, x4","4d12+35",59,750,"+32/+17",44),
NPCG(18,"Lenda","+50, x4","4d12+40",61,800,"+33/+18",46),
NPCG(19,"Lenda","+52, x4","4d12+45",63,850,"+34/+19",48),
NPCG(20,"Lenda","+55, x4","4d12+50",65,900,"+35/+20",50),
];

// Tabela 8-2: Riquezas (Livro Básico, pág. 330) — usado no gerador de tesouro
function RIQ(faixaMenor, faixaMedia, faixaMaior, dado, valorMedio, exemplo){
  return {faixaMenor, faixaMedia, faixaMaior, dado, valorMedio, exemplo};
}
const RIQUEZAS = [
RIQ([1,25],null,null,"4d4",10,"Ágata ou hematita; barril de farinha ou gaiola com galinhas."),
RIQ([26,40],null,null,"1d4x10",25,"Quartzo rosa ou topázio; caixa de tabaco ou rolo de linho."),
RIQ([41,55],[1,10],null,"2d4x10",50,"Bracelete de ouro; estatueta de osso/marfim; vaso de prata."),
RIQ([56,70],[11,30],null,"4d6x10",140,"Ametista ou pérola branca; lingote de prata; tapeçaria de lã."),
RIQ([71,85],[31,50],[1,5],"1d6x100",350,"Alexandrita ou pérola negra; espada cerimonial ornada."),
RIQ([86,95],[51,65],[6,15],"2d6x100",700,"Pente em forma de dragão; harpa de madeira exótica."),
RIQ([96,99],[66,80],[16,25],"2d8x100",900,"Opala negra; luva bordada com gemas; lingote de ouro."),
RIQ([100,100],[81,90],[26,40],"4d10x100",2200,"Esmeralda verde; caixinha de música de ouro."),
RIQ(null,[91,95],[41,60],"6d12x100",3900,"Anel de prata e safira; ídolo de ouro maciço."),
RIQ(null,[96,99],[61,75],"2d10x1000",11000,"Anel de ouro e rubi; taças de ouro com esmeraldas."),
RIQ(null,[100,100],[76,85],"6d8x1000",27000,"Coroa de ouro com centenas de gemas."),
RIQ(null,null,[86,95],"1d10x10000",55000,"Arca reforçada com lingotes de prata e ouro."),
RIQ(null,null,[96,100],"4d12x10000",260000,"Uma sala forrada de moedas!"),
];

// Tabela 8-3: Itens Diversos (pág. 331) — mapeado aos nomes já existentes em ITENS_GERAIS
const ITENS_DIVERSOS_TABELA = [
[1,2,"Ácido"],[3,4,"Água benta"],[5,5,"Alaúde élfico"],[6,6,"Algemas"],[7,8,"Baga-de-fogo"],
[9,23,"Bálsamo restaurador"],[24,24,"Bandana"],[25,25,"Bandoleira de poções"],[26,30,"Bomba"],
[31,31,"Botas reforçadas"],[32,32,"Camisa bufante"],[33,33,"Capa esvoaçante"],[34,34,"Capa pesada"],
[35,35,"Casaco longo"],[36,36,"Chapéu arcano"],[37,38,"Coleção de livros"],[39,40,"Cosmético"],
[41,42,"Dente-de-dragão"],[43,43,"Enfeite de elmo"],[44,44,"Elixir do amor"],[45,46,"Equipamento de viagem"],
[47,56,"Essência de mana"],[57,57,"Estojo de disfarces"],[58,58,"Farrapos de ermitão"],[59,59,"Flauta mística"],
[60,66,"Fogo alquímico"],[67,67,"Gorro de ervas"],[68,69,"Líquen lilás"],[70,70,"Luneta"],
[71,71,"Luva de pelica"],[72,73,"Maleta de medicamentos"],[74,74,"Manopla"],[75,75,"Manto eclesiástico"],
[76,78,"Mochila de aventureiro"],[79,80,"Musgo púrpura"],[81,81,"Organizador de pergaminhos"],
[82,83,"Ossos de monstro"],[84,85,"Pó de cristal"],[86,87,"Pó de giz"],[88,88,"Pó do desaparecimento"],
[89,89,"Robe místico"],[90,91,"Saco de sal"],[92,92,"Sapatos de camurça"],[93,94,"Seixo de âmbar"],
[95,95,"Sela"],[96,96,"Tabardo"],[97,97,"Traje da corte"],[98,99,"Terra de cemitério"],[100,100,"Veste de seda"],
];

// Tabela 8-1 simplificada: por ND, dado de dinheiro (rolado em T$) e chance de vir item.
// (versão prática pro gerador: em vez do d% completo do livro, já resolve pra um resultado direto)
function TES(nd, dadoDinheiro, unidadeDinheiro, chanceItem){ return {nd, dadoDinheiro, unidadeDinheiro, chanceItem}; }
const TESOURO_POR_ND = [
TES(0.5,"1d6x10","TC",0.3), TES(1,"3d8x10","T$",0.5), TES(2,"3d10x10","T$",0.55),
TES(3,"4d12x10","T$",0.6), TES(4,"1d6x100","T$",0.65), TES(5,"1d8x100","T$",0.7),
TES(6,"2d6x100","T$",0.75), TES(7,"2d8x100","T$",0.8), TES(8,"2d10x100","T$",0.8),
TES(9,"4d6x100","T$",0.85), TES(10,"4d10x10","TO",0.85), TES(11,"2d4x1000","T$",0.9),
TES(12,"2d6x1000","T$",0.9), TES(13,"4d4x1000","T$",0.9), TES(14,"3d6x1000","T$",0.9),
TES(15,"2d10x1000","T$",0.95), TES(16,"3d6x1000","T$",0.95), TES(17,"4d6x1000","T$",0.95),
TES(18,"4d10x1000","T$",0.95), TES(19,"4d12x1000","T$",1), TES(20,"2d4x1000","TO",1),
];

// Sílabas para sorteio de nomes por raça — construção própria inspirada no clima de Arton
// (o livro não traz listas oficiais de nomes; isto é uma ferramenta de apoio, não um dado oficial)
const NOMES_SILABAS = {
  "Humano": {ini:["Ar","Bel","Cor","Dan","El","Fer","Gil","Ha","Ivo","Jo","Lu","Mar","Nor","Ot","Pe","Ri","Sa","Ter","Val"], meio:["a","an","el","in","or","ei","u","i"], fim:["do","ro","na","lo","ta","son","dis","co","mo","vio"]},
  "Anão": {ini:["Bor","Dur","Gron","Har","Kaz","Mor","Or","Thor","Ul","Vor"], meio:["gr","ar","ur","or","in"], fim:["im","ax","ok","und","in","ar","of"]},
  "Elfo": {ini:["Ael","Cael","El","Fael","Il","Lael","Sil","Thal","Yael"], meio:["ia","ae","io","ei","ai"], fim:["ndil","riel","wen","dor","las","nor"]},
  "Goblin": {ini:["Grik","Nib","Pik","Rax","Snik","Tob","Zug"], meio:["ip","ok","ar","ig"], fim:["ix","ub","az","ok","it"]},
  "Padrão": {ini:["Ar","El","Kor","Mal","Ry","Tal","Vin","Za"], meio:["a","e","i","o","u"], fim:["nor","ris","dan","mir","lok","tha"]},
};
