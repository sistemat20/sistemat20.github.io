// Caminho do Arcanista (pág. 37) — escolha feita uma vez, na criação (ou ao multiclassar em
// Arcanista), que não pode ser mudada depois. Define o atributo-chave de magia e como o
// personagem aprende/lança magias arcanas.
const ARCANISTA_CAMINHOS = {
  "Bruxo": {
    atributo: "int",
    resumo: "Lança magias através de um foco (varinha, cajado, chapéu...).",
    descricao: "Para lançar uma magia, você precisa empunhar o foco com uma mão (e gesticular com a outra) ou fazer um teste de Misticismo (CD 20 + o custo em PM da magia; se falhar, a magia não funciona, mas você gasta os PM mesmo assim). Seu atributo-chave para magias é Inteligência.",
    focoNome: "Foco arcano",
    focoTexto: "O foco tem RD 10 e PV iguais à metade dos seus, independente de material ou forma. Se danificado, é totalmente restaurado no próximo descanso. Se destruído (0 PV), você fica atordoado por 1 rodada. Pode ser recuperado com 1 semana de trabalho e T$ 100."
  },
  "Feiticeiro": {
    atributo: "car",
    resumo: "Lança magias através de um poder inato que corre em seu sangue.",
    descricao: "Escolhe uma linhagem sobrenatural como origem de seus poderes e recebe a herança básica dela. Não depende de item ou estudo, mas aprende uma magia nova só a cada nível ímpar (3º, 5º, 7º etc.), em vez de a cada nível. Seu atributo-chave para magias é Carisma.",
    linhagem: true
  },
  "Mago": {
    atributo: "int",
    resumo: "Lança magias através de estudo e memorização de fórmulas arcanas num grimório.",
    descricao: "Só pode lançar magias memorizadas — as outras não podem ser lançadas, mesmo tendo PM. Para memorizar, estuda o grimório por 1h e escolhe metade das magias que conhece (arredondado pra baixo); pode fazer isso 1x por dia. Começa com uma magia adicional (4 em vez de 3) e aprende mais uma sempre que ganha acesso a um círculo novo. Seu atributo-chave para magias é Inteligência.",
    focoNome: "Grimório",
    focoTexto: "O grimório tem RD 10 e PV iguais à metade dos seus. Se danificado, é totalmente restaurado no próximo descanso. Se destruído (0 PV), você fica atordoado por 1 rodada. Pode ser recuperado com 1 semana de trabalho e T$ 100.",
    magiaBonusInicial: 1,
    magiaBonusPorCirculo: 1,
    memorizacao: true
  }
};

// Linhagens Sobrenaturais (pág. 39) — escolhida só por quem segue o caminho de Feiticeiro.
// A herança "Básica" já vem de graça ao escolher; Aprimorada/Superior (se existirem como poder
// de Arcanista disponível) são escolhidas depois, na progressão normal de poderes de classe.
const LINHAGENS_FEITICEIRO = [
  {
    nome: "Linhagem Dracônica",
    resumo: "Um antepassado foi um majestoso dragão. Escolha um tipo de dano entre ácido, eletricidade, fogo ou frio.",
    basica: "Você soma seu Carisma em seus pontos de vida iniciais e recebe redução de dano 5 ao tipo escolhido.",
    aprimorada: "Suas magias do tipo escolhido custam –1 PM e causam +1 ponto de dano por dado.",
    superior: "Você passa a somar o dobro do seu Carisma em seus pontos de vida iniciais e se torna imune a dano do tipo escolhido. Sempre que reduz um ou mais inimigos a 0 PV ou menos com uma magia do tipo escolhido, recebe PM temporários iguais ao círculo da magia."
  },
  {
    nome: "Linhagem Feérica",
    resumo: "Seu sangue foi tocado pelas fadas.",
    basica: "Você se torna treinado em Enganação e aprende uma magia de 1º círculo de encantamento ou ilusão, arcana ou divina, a sua escolha.",
    aprimorada: "A CD para resistir a suas magias de encantamento e ilusão aumenta em +2 e suas magias dessas escolas custam –1 PM.",
    superior: "Você recebe +2 em Carisma. Se uma criatura passar no teste de resistência contra uma magia de encantamento ou ilusão lançada por você, você fica alquebrado até o final da cena."
  },
  {
    nome: "Linhagem Rubra",
    resumo: "Seu sangue foi corrompido pela Tormenta.",
    basica: "Você recebe um poder da Tormenta. Além disso, pode perder outro atributo em vez de Carisma por poderes da Tormenta.",
    aprimorada: "Escolha uma magia para cada poder da Tormenta que você possui. Essas magias custam –1 PM. Sempre que recebe um novo poder da Tormenta, pode escolher uma nova magia.",
    superior: "Você recebe +4 PM para cada poder da Tormenta que tiver."
  }
];

// Quantas magias o personagem "deveria" conhecer num dado nível de Arcanista, de acordo com o
// caminho escolhido — só um número de referência (não bloqueia adicionar mais), pra ajudar a
// simular o ritmo de aprendizado de cada caminho.
function magiasArcanistaEsperadas(caminho, nivelArcanista){
  const n = Math.max(0, nivelArcanista||0);
  if(n===0) return 0;
  if(caminho==='Feiticeiro'){
    return 3 + Math.floor((n-1)/2);
  }
  if(caminho==='Mago'){
    const circulosDesbloqueados = [1,5,9,13,17].filter(lv=>n>=lv).length;
    return 4 + (n-1) + Math.max(0, circulosDesbloqueados-1);
  }
  // Bruxo (e padrão genérico, pra Arcanista sem caminho definido ainda)
  return 3 + (n-1);
}
