// Dados de Itens Mágicos — Tormenta 20 (Livro Básico, Cap. 8: Recompensas, Tabelas 8-7 a 8-15)
// Usado principalmente como referência/geração para o Mestre — efeitos únicos demais pra automatizar
// numericamente na ficha do jogador, então ficam descritivos (o jogador anota o efeito nas Notas).

// Tabela 8-7: Preço de Encantos (itens mágicos "encantados" — genéricos, tipo item superior)
const PRECO_ENCANTOS = [
  {n:1, preco:18000, cd:10},
  {n:2, preco:36000, cd:15},
  {n:3, preco:72000, cd:20},
];

// Tabela 8-8: Encantos de Armas
function EN(nome, efeito, dobraContagem){ return {nome, efeito, dobraContagem:!!dobraContagem}; }
const ENCANTOS_ARMA = [
EN("Ameaçadora","Duplica a margem de ameaça (crítico)."),
EN("Anticriatura","+2 PM: +4d8 de dano contra um tipo de criatura escolhido."),
EN("Arremesso","Pode ser arremessada em alcance curto; some 1 categoria de alcance se já pudesse."),
EN("Assassina","Ataque furtivo usa d8; +2 PM pra rolar de novo os 1 no dano furtivo."),
EN("Caçadora","Ignora camuflagem leve/total e cobertura leve; +1 categoria de alcance se à distância."),
EN("Congelante","+1d6 dano de frio; +2 PM: alvo fica enredado 1 rodada."),
EN("Conjuradora","Guarda uma magia de alvo/área lançada nela; descarrega ao acertar um ataque."),
EN("Corrosiva","+1d6 dano de ácido; +2 PM: alvo sofre 4d4 de ácido na próxima rodada."),
EN("Dançarina","1 PM + ação de movimento: arma flutua e ataca sozinha em alcance curto."),
EN("Defensora","+2 na Defesa."),
EN("Destruidora","+2 no ataque e +2d8 de dano contra construtos/objetos (manobra quebrar)."),
EN("Dilacerante","Crítico causa +10 de dano."),
EN("Drenante","Crítico em criatura viva: ela fica fraca, você ganha 2d10 PV temporários."),
EN("Elétrica","+1d6 dano elétrico; +2 PM: raio em outra criatura em alcance curto (3d8)."),
EN("Energética*","+4 no ataque, ignora RD 20, dano vira essência, emana luz. Requer: Formidável."),
EN("Excruciante","Alvo vivo atingido fica fraco (ou debilitado, se já fraco)."),
EN("Flamejante","+1d6 dano de fogo; +2 PM: dispara Bola de Fogo (6d6, Reflexos reduz à metade) em vez do ataque normal."),
EN("Formidável","+2 no ataque e no dano."),
EN("Lancinante*","Crítico causa +10 e multiplica bônus numéricos também. Requer: Dilacerante."),
EN("Magnífica*","+4 no ataque e no dano. Requer: Formidável."),
EN("Piedosa","+1d8 de dano, mas sempre não letal (pode ativar/desativar por 1 PM)."),
EN("Profana","+2d8 de dano contra devotos do Bem e criaturas bondosas."),
EN("Sagrada","+2d8 de dano contra devotos do Mal e criaturas malignas."),
EN("Sanguinária","Alvo vivo atingido sangra (perda de PV cumulativa por rodada)."),
EN("Trovejante","Crítico atordoa 1 rodada (1x/cena; Fortitude evita)."),
EN("Tumular","+1d8 de dano de trevas; +2 PM: vira +2d8, mas você perde 1d8 PV."),
EN("Veloz","Ganha Ataque Extra (só com essa arma), ou -1 PM no custo se já tiver."),
EN("Venenosa","+2 PM: alvo envenenado, perde 1d12 PV/rodada por 3 rodadas."),
];
ENCANTOS_ARMA.find(e=>e.nome==='Energética*').dobraContagem = true;
ENCANTOS_ARMA.find(e=>e.nome==='Lancinante*').dobraContagem = true;
ENCANTOS_ARMA.find(e=>e.nome==='Magnífica*').dobraContagem = true;

// Tabela 8-9: Armas Específicas (itens maiores, sempre)
function AE(nome, base, preco, desc){ return {nome, base, preco, desc}; }
const ARMAS_ESPECIFICAS = [
AE("Arco do Poder","Arco longo",90000,"Cria cordas/flechas de energia à vontade: Flecha Normal (3d8 essência), Flecha Piedosa (4d8 não letal), Flecha Explosiva (3d6 fogo em área, Reflexos reduz à metade), ou Flecha-Rede (agarra, CD 25 pra soltar)."),
AE("Avalanche","Machado de guerra",140000,"Gelo eterno, congelante, formidável. RD fogo 10. 6 PM: tempestade de gelo em alcance curto (3d6 impacto + 3d6 frio/rodada, camuflagem leve); 1 PM/turno pra manter."),
AE("Azagaia dos Relâmpagos","Azagaia",30000,"Ao arremessar, vira um Relâmpago (8d6 elétrico em linha, alcance médio, Reflexos reduz à metade); volta pra sua mão no fim do turno."),
AE("Besta Explosiva","Besta pesada",100000,"3 PM: vira uma Bola de Fogo (6d6 fogo em área de 6m, Reflexos reduz à metade) contra alvo ou ponto em alcance médio."),
AE("Cajado da Destruição","Bordão",60000,"Conta como cajado arcano. Magias de dano causam +1 ponto por dado."),
AE("Cajado da Vida","Bordão",60000,"Conta como cajado arcano (afeta magias divinas). Magias de cura curam +2 PV por dado."),
AE("Cajado do Poder","Bordão",180000,"Conta como cajado arcano. Magias arcanas custam –1 PM extra e CD +2 extra (total +3 com o cajado base)."),
AE("Espada Baronial","Espada longa",30000,"+1 ataque/dano; +1 extra (total +2) se tiver código de conduta, devoto de Khalmyr ou treinado em Nobreza (cumulativos, até +4)."),
AE("Espada Sortuda","Espada curta",110000,"Formidável. +2 em testes de resistência; 3 PM pra repetir um teste de resistência (ou –1 PM se tiver Sortudo)."),
AE("Florete Fugaz","Florete",50000,"Formidável. 1 PM ao acertar crítico na ação agredir: ataque adicional na mesma criatura."),
AE("Lâmina da Luz","Espada bastarda",45000,"Formidável. 2 PM + ação de movimento: luz brilhante em alcance médio até o fim da cena, ofuscando inimigos dentro dela."),
AE("Lança Animalesca","Lança",45000,"Formidável. Bônus de ataque/dano se aplica às armas naturais quando usa Forma Selvagem."),
AE("Língua do Deserto","Cimitarra",90000,"Formidável. 1 PM: lâmina pega fogo (dano +1 passo, vira fogo) até o fim da cena; 2 PM: inimigos em alcance curto ficam desprevenidos por 1 rodada."),
AE("Machado Silvestre","Machado de batalha",70000,"Formidável. Em ambiente selvagem: +1d8 de dano e ganha Trespassar (ou usa de graça se já tiver)."),
AE("Maça do Terror","Maça",45000,"Formidável. Lança Amedrontar (CD For/Car); –1 PM se já conhecer a magia."),
AE("Martelo de Doherimm","Martelo de guerra",70000,"Formidável. Se empunhado por anão: ganha arremesso e +1d8 de dano (+2d8 contra Grandes ou maiores)."),
AE("Punhal Sszzaazita","Adaga",100000,"Assassina, formidável, venenosa. 2 PM + ação padrão: vira objeto inofensivo disfarçado (indetectável por magia); voltar a ser arma é ação livre."),
AE("Vingadora Sagrada","Espada longa",200000,"Formidável — mas só revela poder pra paladinos: +5 ataque/dano, Golpe Divino custa –1 PM, você e aliados em alcance curto ganham resistência a magia +5."),
];

// Tabela 8-10: Encantos de Armaduras e Escudos
const ENCANTOS_ARMADURA = [
EN("Abascanto","Resistência a magia +5."),
EN("Abençoado","Redução de trevas 10; +5 em resistência contra necromancia."),
EN("Acrobático","+5 em Acrobacia; ignora a penalidade de armadura nessa perícia."),
EN("Alado","2 PM: asas emergem, voo 12m (sustentada)."),
EN("Animado*","(só escudo) 1 PM + ação de movimento: escudo flutua e protege sozinho, mãos livres."),
EN("Assustador","2 PM + ação de movimento: onda de medo em alcance curto (Vontade CD Car ou abalado até o fim da cena)."),
EN("Cáustica","Redução de ácido 10; 2 PM: seus ataques causam +1d4 de ácido até o fim da cena."),
EN("Defensor","+2 na Defesa."),
EN("Escorregadio","+10 em Acrobacia pra escapar e em manobras contra agarrar."),
EN("Esmagador*","(só escudo) +2 no ataque/dano com o escudo; dano do escudo sobe um passo."),
EN("Fantasmagórico","Lança Manto de Sombras."),
EN("Fortificado","25% (escudo) ou 50% (armadura) de chance de ignorar dano extra de crítico/furtivo."),
EN("Gélido","Redução de frio 10; 2 PM: cobre-se de gelo, +10 PV temporários até o fim da cena."),
EN("Guardião*","+4 na Defesa (em vez de +2). Requer: Defensor."),
EN("Hipnótico","3 PM + ação padrão: inimigos em alcance curto fascinados 1d6 rodadas (Vontade CD Car evita)."),
EN("Ilusório","1 PM + ação de movimento: disfarça o item como roupa comum (Visão da Verdade revela)."),
EN("Incandescente","Redução de fogo 10; 2 PM: causa 1d6 de fogo em adjacentes no início de cada turno seu."),
EN("Invulnerável","Redução de dano 2 (escudo) ou 5 (armadura)."),
EN("Opaco","Redução de ácido, elétrico, fogo e frio 10."),
EN("Protetor","+2 em testes de resistência."),
EN("Refletor","Gaste PM igual ao custo de uma magia que te atinja pra refleti-la de volta."),
EN("Relampejante","Redução elétrica 10; 2 PM: quem te atacar corpo a corpo sofre 2d6 elétrico."),
EN("Reluzente","2 PM + ação de movimento: clarão, inimigos em alcance curto cegos 1 rodada (Reflexos CD Car evita)."),
EN("Sombrio","+5 em Furtividade; ignora penalidade de armadura nessa perícia."),
EN("Zeloso","1 PM: vira alvo de um ataque destinado a um aliado adjacente."),
];
ENCANTOS_ARMADURA.find(e=>e.nome==='Guardião*').dobraContagem = true;

// Tabela 8-11: Armaduras e Escudos Específicos (itens maiores, sempre)
const ARMADURAS_ESPECIFICAS = [
AE("Armadura da Luz","Armadura completa",150000,"Banhada a ouro, reforçada, guardiã. Se tiver código de conduta ou for devoto de divindade só de energia positiva: RD igual ao seu Carisma."),
AE("Baluarte Anão","Armadura completa",50000,"Reforçada, defensora, de adamante. Se não se deslocar no turno, RD aumenta pra 10 até o próximo turno."),
AE("Carapaça Demoníaca","Armadura completa",63000,"Macabra, reforçada, guardiã. Se devoto de divindade só de energia negativa: ataques corpo a corpo causam +1d8 de trevas."),
AE("Cota Élfica","Cota de malha",30000,"Defensora, de mitral. Aplica Destreza na Defesa como se fosse armadura leve."),
AE("Couraça do Comando","Couraça",45000,"Banhada a ouro, sob medida, defensora. +1 Carisma; com o poder Comandar, o bônus dele sobe pra +2."),
AE("Couro de Monstro","Gibão de peles",36000,"Defensor. Com Ataque Poderoso ou investida: +2d6 no dano."),
AE("Escudo de Azgher","Escudo pesado",140000,"10 PM + ação padrão: cone de luz quente em alcance curto (efeito de Visão da Verdade + 6d6 fogo, 6d8 em mortos-vivos/vulneráveis a luz); 1 PM/turno pra manter."),
AE("Escudo do Conjurador","Escudo leve",45000,"Defensor. Guarda uma magia lançada nele (como um pergaminho); descarrega quando lido."),
AE("Escudo do Eclipse","Escudo pesado",70000,"Defensor. Redução de trevas 10; +1d8 de trevas no ataque; 2 PM + movimento: lança Escuridão."),
AE("Escudo Espinhoso","Escudo pesado",50000,"Defensor. 2 PM + movimento: dispara espinho em alcance curto, acerta automático, 1d10+2 de perfuração."),
AE("Escudo do Leão","Escudo pesado",50000,"Defensor. 2 PM, 1x/rodada: cabeça de leão morde um adjacente, acerta automático, 2d6+2 de perfuração."),
AE("Loriga do Centurião","Loriga segmentada",45000,"Defensora. Liderando com Comandar (ou similar): ataques corpo a corpo causam +2d6 de fogo."),
AE("Manto da Noite","Couro batido",45000,"Ajustado, defensor, sombrio. Sem penalidade de Furtividade ao se mover normal; penalidade por atacar cai pra –10."),
];

// Tabela 8-13/14/15: Acessórios (menor/médio/maior)
function AC(nome, preco, desc){ return {nome, preco, desc}; }
const ACESSORIOS_MENORES = [
AC("Anel do sustento",3000,"Não precisa comer/beber; dorme só 2h por noite pra descansar (após 1 semana de uso)."),
AC("Bainha mágica",3000,"Lança Arma Mágica de graça em qualquer arma corpo a corpo guardada nela."),
AC("Corda da escalada",3000,"15m, suporta 6 criaturas Médias; se move sozinha 3m/rodada e se fixa onde quiser (comando)."),
AC("Ferraduras da velocidade",3000,"+3m de deslocamento pra uma montaria."),
AC("Garrafa da fumaça eterna",3000,"Lança Névoa de graça ao abrir; fumaça persiste até tampar."),
AC("Gema da luminosidade",3000,"Comando: emite luz de tocha, ou um raio que cega 1d4 rodadas (Fortitude CD Car evita)."),
AC("Manto élfico",3000,"+5 em Furtividade quando usado com capuz cobrindo o rosto."),
AC("Mochila de carga",3000,"+10 espaços de carga; não ocupa espaço ela mesma; se rasgada, destrói o conteúdo."),
AC("Brincos da sagacidade",4500,"+1 Inteligência (após 1 dia de uso)."),
AC("Luvas da delicadeza",4500,"+1 Destreza (após 1 dia de uso)."),
AC("Manoplas da força do ogro",4500,"+1 Força (após 1 dia de uso)."),
AC("Manto da resistência",4500,"+2 em testes de resistência."),
AC("Manto do fascínio",4500,"+1 Carisma (após 1 dia de uso)."),
AC("Pingente da sensatez",4500,"+1 Sabedoria (após 1 dia de uso)."),
AC("Torque do vigor",4500,"+1 Constituição (após 1 dia de uso)."),
AC("Chapéu do disfarce",6000,"Lança Disfarce Ilusório de graça (com odores/sensações, +20 em Enganação pra disfarce)."),
AC("Flauta fantasma",6000,"Se treinado em Atuação, lança Esculpir Sons de graça."),
AC("Lanterna da revelação",6000,"Como um lampião, mas a luz revela criaturas/objetos invisíveis."),
AC("Anel da proteção",9000,"+2 na Defesa."),
AC("Anel do escudo mental",9000,"Imunidade a magias de adivinhação."),
AC("Pingente da saúde",9000,"Imunidade a doenças e venenos (após 1 semana de uso)."),
];
const ACESSORIOS_MEDIOS = [
AC("Anel de telecinesia",10500,"Lança Telecinesia (CD Int); –1 PM se já conhecer."),
AC("Bola de cristal",10500,"Ação completa: lança Vidência (CD Sab) pra ver pessoas/lugares distantes."),
AC("Caveira maldita",10500,"Gera efeito de Profanar; mortos-vivos e devotos do Mal na área ganham +2 em testes e Defesa."),
AC("Botas aladas",15000,"2 PM: voo 12m por 1 rodada; 1 PM/turno pra manter."),
AC("Braceletes de bronze",16500,"+4 na Defesa, cumulativo com itens mágicos mas não com armadura."),
AC("Anel da energia",21000,"+5 PM (após 1 dia de uso)."),
AC("Anel da vitalidade",21000,"+10 PV (após 1 dia de uso)."),
AC("Anel de invisibilidade",21000,"Fica invisível ao colocar; termina se atacar/lançar magia ofensiva; pode tirar/recolocar pra reativar."),
AC("Braçadeiras do arqueiro",21000,"+2 no dano com armas à distância, cumulativo com outros itens."),
AC("Brincos de Marah",21000,"1ª criatura que te atacar na cena testa Vontade (CD Car) ou perde a ação."),
AC("Faixas do pugilista",21000,"+2 no ataque e dano desarmado, cumulativo com outros itens."),
AC("Manto da aranha",21000,"Escalada = deslocamento terrestre; +5 contra veneno; imune a teias; lança Teia (CD Des)."),
AC("Vassoura voadora",21000,"Voo 12m, carrega até 2 criaturas (40 espaços)."),
AC("Símbolo abençoado",21000,"Conta como símbolo sagrado; devoto do deus: magias divinas custam –1 PM."),
AC("Amuleto da robustez",25500,"+2 Constituição (após 1 dia de uso)."),
AC("Botas velozes",25500,"+3m de deslocamento; lança Velocidade só em você mesmo."),
AC("Cinto da força do gigante",25500,"+2 Força (após 1 dia de uso)."),
AC("Coroa majestosa",25500,"+2 Carisma (após 1 dia de uso)."),
AC("Estola da serenidade",25500,"+2 Sabedoria (após 1 dia de uso)."),
AC("Manto do morcego",25500,"+5 Furtividade; pendura de cabeça pra baixo; ação padrão: vira morcego (voo 12m, mordida 1d4) à noite/no escuro."),
AC("Pulseiras da celeridade",25500,"+2 Destreza (após 1 dia de uso)."),
AC("Tiara da sapiência",25500,"+2 Inteligência (após 1 dia de uso)."),
];
const ACESSORIOS_MAIORES = [
AC("Elmo do teletransporte",30000,"Lança Salto Dimensional e Teletransporte só em você mesmo; –1 PM se já conhecer."),
AC("Gema da telepatia",30000,"Lança Compreensão e Enfeitiçar (CD Car) de graça."),
AC("Gema elemental",30000,"Lança Conjurar Elemental de graça."),
AC("Manual da saúde corporal",30000,"Leitura de 1 semana: +1 Constituição permanente (só 1 manual conta por atributo)."),
AC("Manual do bom exercício",30000,"Leitura de 1 semana: +1 Força permanente (só 1 manual conta por atributo)."),
AC("Manual dos movimentos precisos",30000,"Leitura de 1 semana: +1 Destreza permanente (só 1 manual conta por atributo)."),
AC("Medalhão de Lena",30000,"Ao cair a 0 PV ou menos, cura 100 PV antes de cair (1x/dia)."),
AC("Tomo da compreensão",30000,"Leitura de 1 semana: +1 Sabedoria permanente (só 1 manual conta por atributo)."),
AC("Tomo da liderança e influência",30000,"Leitura de 1 semana: +1 Carisma permanente (só 1 manual conta por atributo)."),
AC("Tomo dos grandes pensamentos",30000,"Leitura de 1 semana: +1 Inteligência permanente (só 1 manual conta por atributo)."),
AC("Anel refletor",51000,"Gaste PM igual ao custo de uma magia que te atinja pra refleti-la de volta."),
AC("Cinto do campeão",51000,"+1 Força; ganha Briga (ou +4 níveis de lutador pro dano desarmado se já tiver); Torcida vira +3 se tiver o poder."),
AC("Colar guardião",51000,"+5 na Defesa."),
AC("Estatueta animista",51000,"Vira um parceiro veterano (raposa/onça/águia/lobo/leão/urso) até o fim da cena."),
AC("Anel da liberdade",60000,"Efeito permanente de Libertação."),
AC("Tapete voador",60000,"Voo 12m, carrega 6 criaturas Médias (120 espaços), comandável a distância."),
AC("Braceletes de ouro",64500,"Como braceletes de bronze, mas +8 na Defesa (não cumulativo com eles)."),
AC("Espelho da oposição",75000,"Cria uma cópia de quem se olhar nele, com as mesmas habilidades/equipamento, que ataca o original."),
AC("Robe do arquimago",90000,"Se conjurador arcano: +Defesa (5+círculo máximo) e metade disso em testes de resistência."),
AC("Orbe das tempestades",97500,"Lança Controlar o Clima e Fúria do Panteão (CD Sab); você e aliados adjacentes ganham Suporte Ambiental."),
AC("Anel da regeneração",150000,"Cura Acelerada 5 (após 1 dia de uso)."),
AC("Espelho do aprisionamento",150000,"Quem se aproximar e se olhar nele testa Reflexos (CD Int) ou é transportado pra dentro do espelho."),
];

// Artefatos — únicos, não geráveis aleatoriamente; entram na campanha só por decisão do mestre
const ARTEFATOS = [
{nome:"Espada-Deus", desc:"Espada longa atroz precisa pungente ameaçadora magnífica veloz (dano 2d12). Ignora RD e afeta até imunes a crítico. Indestrutível. Só pode ser usada por quem tem 15+ níveis em classe com Luta como perícia inicial — os demais erram todos os ataques."},
{nome:"Joia da Alma", desc:"+3 Inteligência (após 1 dia). Magias arcanas de arcanistas custam 0 PM (aprimoramentos ainda custam). Empunhar exige Vontade CD 25 (+1/dia cumulativo) ou fica atordoado e solta a joia; falhar 3x transforma o personagem em NPC do mestre."},
{nome:"Baralho do Caos", desc:"+10 em Jogatina (vira –10 se abusar da sorte). 'Aposto tudo': saca 1-4 cartas de um baralho de 22 efeitos aleatórios (bons e ruins, de +10.000 XP a perder todos os itens mágicos) — ver tabela própria no livro, pág. 347."},
];
