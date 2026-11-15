// Vida e mana máximas, nível total e pendências da ficha.
// Separado do js/app.js em 15/11/2026 (item 6 da revisão geral), sem mudar o código.


// Helpers de classe/nível (multiclasse)
function nivelTotal(f){ return (f.classesNiveis||[]).reduce((s,c)=>s+c.nivel,0) || 1; }

// PV/PM máximo "de verdade" — soma em cima do valor guardado (f.pvmax/f.pmmax, que só cresce no
// level up) os bônus de poderes que dão PV/PM extra baseado no nível atual (Vitalidade, Vontade
// de Ferro). Calculado na hora, igual perícia/Defesa — assim funciona não importa em que nível o
// poder foi escolhido, sem precisar "somar retroativo" em nenhum lugar.
function pvMaxEfetivo(f){
  const base = parseInt(f.pvmax)||0;
  const nomes = poderesAtivos(f);
  const bonusVitalidade = nomes.includes('Vitalidade') ? nivelTotal(f) : 0;
  // Duro como Pedra (Anão): +3 PV no 1º nível, +1 a cada nível seguinte = nível + 2
  const bonusDuroComoPedra = (f.raca==='Anão') ? nivelTotal(f)+2 : 0;
  const bonusItens = bonusRecursoDeItensVestidos(f, 'pv');
  // Linhagem Dracônica (Feiticeiro, achado numa auditoria): "soma seu Carisma em seus pontos de
  // vida iniciais" na herança básica, DOBRA na herança superior. arcanistaLinhagem nunca tinha
  // sido lido em cálculo nenhum antes disso.
  let bonusLinhagemDraconica = 0;
  if(f.arcanistaLinhagem==='Linhagem Dracônica'){
    const temHerancaSuperior = (f.poderesClasse||[]).some(p=>p.nome==='Herança Superior');
    bonusLinhagemDraconica = (parseInt(f.car)||0) * (temHerancaSuperior ? 2 : 1);
  }
  // Familiar Sapo: "soma seu atributo-chave (de magia) ao seu total de pontos de vida".
  const famSapo = familiarAtivo(f);
  const chaveMagiaPV = atributoChaveMagia(f);
  const bonusFamiliarSapo = (famSapo && famSapo.nome==='Sapo' && chaveMagiaPV) ? atributoEfetivo(f, chaveMagiaPV) : 0;
  return base + bonusVitalidade + bonusDuroComoPedra + bonusLinhagemDraconica + bonusFamiliarSapo + bonusItens;
}

function pmMaxEfetivo(f){
  const base = parseInt(f.pmmax)||0;
  const nomes = poderesAtivos(f);
  const bonusVontadeFerro = nomes.includes('Vontade de Ferro') ? Math.floor(nivelTotal(f)/2) : 0;
  // Sangue Mágico (Elfo): +1 PM por nível
  const bonusSangueMagico = (f.raca==='Elfo') ? nivelTotal(f) : 0;
  // Toda classe conjuradora (Arcanista, Bardo, Clérigo, Druida) soma o atributo-chave no total
  // de PM — confirmado no livro (pág. 65, 92, 118, 128): o texto "você soma seu atributo-chave
  // no seu total de PM" aparece igualzinho nas 4. Reaproveita atributoChaveMagia (que já sabe
  // achar a classe conjuradora certa e, no caso do Arcanista, o atributo do Caminho escolhido)
  // em vez de checar cada classe na mão. É UMA soma só (não por nível, diferente de como
  // Constituição entra no PV) — recalculada na hora a partir do atributo atual, então se ele
  // mudar depois (ou tiver penalidade de Poder da Tormenta) o total de PM já reflete sozinho.
  // Faltava pra TODAS as 4 classes — a correção anterior tinha coberto só Arcanista.
  const chaveAtributo = atributoChaveMagia(f);
  const bonusAtributoConjurador = chaveAtributo ? atributoEfetivo(f, chaveAtributo) : 0;
  // Poder Mágico (poder de classe do Arcanista, repetível): "+1 PM por nível de arcanista...
  // quando sobe de nível, os PM que recebe por este poder aumentam de acordo" — achado numa
  // auditoria, nunca tinha sido conectado. Cada vez que o jogador escolhe esse poder, soma mais
  // 1x o nível ATUAL na classe Arcanista (escala sozinho ao subir de nível, igual o resto do
  // sistema já faz — não precisa "travar" o valor no nível em que foi pego).
  const vezesPoderMagico = (f.poderesClasse||[]).filter(p=>p.nome==='Poder Mágico').length;
  const nivelArcanista = (f.classesNiveis||[]).find(c=>c.classe==='Arcanista');
  const bonusPoderMagico = vezesPoderMagico * (nivelArcanista ? nivelArcanista.nivel : 0);
  // Coração Heroico (poder único de origem, achado numa auditoria): "+3 PM. Quando atinge um
  // novo patamar (5º, 11º e 17º níveis), recebe +3 PM adicionais." Nunca tinha sido conectado.
  // Escala sozinho com o nível atual (recalculado na hora, igual tudo mais nesse sistema) — não
  // precisa "travar" o bônus no patamar em que o personagem estava quando pegou o poder.
  const bonusCoracaoHeroico = f.origemPoder && f.origemPoder.nome==='Coração Heroico' ? (()=>{
    const nv = nivelTotal(f);
    return 3 + (nv>=5?3:0) + (nv>=11?3:0) + (nv>=17?3:0);
  })() : 0;
  // Elo com a Natureza (poder de classe do Caçador, achado numa auditoria): "soma sua Sabedoria
  // em seu total de pontos de mana" — nunca tinha sido conectado.
  const bonusEloComANatureza = nomesPoderesConhecidos(f).includes('Elo com a Natureza') ? (parseInt(f.sab)||0) : 0;
  // Linhagem Rubra, herança superior (Feiticeiro, achado na mesma auditoria): "+4 PM para cada
  // poder da Tormenta que tiver". Só na herança superior (a básica/aprimorada dessa linhagem não
  // mexem em PM).
  let bonusLinhagemRubra = 0;
  if(f.arcanistaLinhagem==='Linhagem Rubra' && (f.poderesClasse||[]).some(p=>p.nome==='Herança Superior')){
    bonusLinhagemRubra = 4 * qtdPoderesTormenta(f);
  }
  const bonusItens = bonusRecursoDeItensVestidos(f, 'pm');
  // Abençoado (habilidade AUTOMÁTICA do Paladino, 1º nível — achada na mesma auditoria): "soma
  // seu Carisma no seu total de pontos de mana". Paladino não é uma classe conjuradora completa
  // (não passa em atributoChaveMagia), então esse bônus fica de fora do bonusAtributoConjurador
  // — precisa da própria checagem.
  const paladinoObj = (f.classesNiveis||[]).find(c=>c.classe==='Paladino');
  const bonusAbencoado = paladinoObj ? (parseInt(f.car)||0) : 0;
  // Bênção do Mana (poder concedido de Wynna, achado na mesma auditoria — mas dessa vez em
  // Poderes Concedidos, não de classe): "+1 PM a cada nível ímpar". Conta 1, 3, 5, 7... até o
  // nível atual.
  const bonusBencaoDoMana = listaPoderesConcedidos(f).some(pc=>pc && pc.nome==='Bênção do Mana')
    ? Math.ceil(nivelTotal(f)/2) : 0;
  return base + bonusVontadeFerro + bonusSangueMagico + bonusAtributoConjurador + bonusPoderMagico + bonusCoracaoHeroico + bonusEloComANatureza + bonusLinhagemRubra + bonusAbencoado + bonusBencaoDoMana + bonusItens;
}

// ---- Pendências ----
// Lista de "coisas que existem no app hoje mas que esse personagem específico ainda não
// preencheu" — normalmente porque a ficha foi criada antes da gente adicionar aquela mecânica
// (foi o caso do Caminho do Arcanista). Cada item aqui sabe se aplica a UM personagem (função
// `detecta`) e como resolver (`resolver`, chamado com a própria ficha `f` — grava direto nela).
// Pra adicionar uma pendência nova no futuro, é só acrescentar um objeto nesta lista.
const PENDENCIAS_DEFINICOES = [
  {
    tipo: 'periciaExtraInt',
    titulo: 'Nova Perícia por Inteligência',
    detecta: (f)=> (f.periciasExtraIntPendentes||0) > 0,
    resumo: 'A Inteligência desse personagem aumentou (Aumento de Atributo) — isso dá direito a mais perícia(s) treinada(s), igual acontece na criação. Falta escolher qual.',
  },
  {
    tipo: 'deformidade',
    titulo: 'Deformidade (Lefou)',
    detecta: (f)=> f.raca==='Lefou' && !(Array.isArray(f.deformidadeEscolhas) && f.deformidadeEscolhas.length===2 && f.deformidadeEscolhas.every(esc=>esc && typeof esc==='object' && esc.tipo)),
    resumo: 'Lefou recebe +2 em duas perícias à sua escolha (ou pode trocar por um Poder da Tormenta) — esse personagem ainda não escolheu, ou escolheu antes dessa opção de poder existir e vale conferir de novo.',
  },
  {
    tipo: 'vanguardista',
    titulo: 'Vanguardista (Kliren)',
    detecta: (f)=> f.raca==='Kliren' && !f.vanguardistaOficio,
    resumo: 'Kliren recebe +2 num Ofício à escolha — esse personagem ainda não escolheu qual.',
  },
  {
    tipo: 'arcanistaCaminho',
    titulo: 'Caminho do Arcanista',
    detecta: (f)=> (f.classesNiveis||[]).some(c=>c.classe==='Arcanista') && !f.arcanistaCaminho,
    resumo: 'Esse personagem é Arcanista mas ainda não escolheu entre Bruxo, Feiticeiro ou Mago — isso afeta qual atributo ele usa pra magia.',
  },
  {
    tipo: 'escolasMagia',
    titulo: 'Escolas de Magia',
    detecta: (f)=> (f.classesNiveis||[]).some(c=>['Bardo','Druida'].includes(c.classe)) && !f.escolasMagia,
    resumo: 'Bardo e Druida escolhem 3 escolas de magia na criação — esse personagem ainda não tem essa escolha registrada.',
  },
  {
    tipo: 'divindadeForcada',
    titulo: 'Devoção Obrigatória',
    detecta: (f)=> (f.classesNiveis||[]).some(c=>['Clérigo','Druida','Paladino'].includes(c.classe)) && !f.divindade,
    resumo: 'Clérigo, Druida e Paladino são devotos automáticos de uma divindade (ou, só pro Clérigo, podem cultuar o Panteão) — esse personagem está sem fé, o que não deveria ser possível pra classe dele.',
  },
  {
    tipo: 'habilidadesClasse',
    titulo: 'Habilidades Automáticas de Classe',
    detecta: (f)=>{
      const classesComHab = (f.classesNiveis||[]).filter(c=> CLASSES[c.classe] && CLASSES[c.classe].habilidadesClasse && CLASSES[c.classe].habilidadesClasse.length>0);
      if(classesComHab.length===0) return false;
      const fontesAtuais = (f.habilidadesIniciais||[]).map(h=>h.fonte);
      return classesComHab.some(c=> !fontesAtuais.includes('Classe: '+c.classe));
    },
    resumo: 'A ficha foi criada antes da gente catalogar as habilidades automáticas de classe (tipo Inspiração do Bardo, Fúria do Bárbaro etc.) — estão faltando na lista de Habilidades Iniciais.',
  },
  {
    tipo: 'poderComEscolhaPendente',
    titulo: 'Poder com Escolha Pendente',
    detecta: (f)=> poderesComEscolhaFaltando(f).length>0,
    resumo: 'Esse personagem tem poder(es) que exigem uma escolha extra (qual atributo, qual arma, qual escola...) mas essa escolha nunca foi feita — geralmente porque a ficha pegou o poder antes da gente adicionar essa opção no sistema. Sem resolver, o efeito do poder nunca chega a valer de verdade.',
  },
  {
    tipo: 'oficioSemEspecialidade',
    titulo: 'Ofício sem Especialidade',
    detecta: (f)=> (f.periciasTreinadas||[]).includes('Ofício') || (f.vanguardistaOficio==='Ofício'),
    resumo: 'A perícia Ofício precisa de uma especialidade (armeiro, alquimista, cozinheiro, ferreiro, entalhador... qualquer ofício que faça sentido pro personagem) — sem isso, poderes e itens que pedem um ofício específico como pré-requisito não reconhecem que esse personagem tem a perícia.',
  },
  {
    // Achado numa conversa em que a própria Vanessa perguntou "lembrou de verificar isso?" — a
    // tabela de cada classe (em classes.js) marca com "poder de [classe]" cada nível que dá
    // direito a escolher um poder de classe (ex: Guerreiro tem isso do 2º nível em diante quase
    // todo nível). Antes dessa pendência existir, não tinha nada detectando quando o personagem
    // sobe pra um nível assim mas o slot fica sem escolha nenhuma registrada.
    tipo: 'poderClasseFaltando',
    titulo: 'Poder de Classe Não Escolhido',
    detecta: (f)=> slotsPoderClasseFaltando(f).length>0,
    resumo: 'Esse personagem já tem nível suficiente pra ter escolhido mais poder(es) de classe do que realmente tem na ficha — geralmente porque o nível foi ajustado direto (sem passar pelo fluxo de Level Up) ou a escolha ficou pra trás numa correção anterior.',
  },
];
// Conta quantos "slots" de poder de classe a tabela oficial garante até o nível atual em cada
// classe do personagem, e compara com quantos poderes de classe ele realmente tem escolhidos
// (não importa se foi trocado por um slot de poder geral depois — a escolha em si já resolve o
// slot). Retorna a lista de {classe, faltando} pra cada classe que estiver devendo.
function slotsPoderClasseFaltando(f){
  const resultado = [];
  (f.classesNiveis||[]).forEach(c=>{
    const classeObj = CLASSES[c.classe];
    if(!classeObj || !classeObj.tabela) return;
    const termoBusca = 'poder de '+c.classe.toLowerCase();
    const slotsGarantidos = classeObj.tabela.filter(t=> t.nivel<=c.nivel && (t.hab||'').toLowerCase().includes(termoBusca)).length;
    const escolhidos = (f.poderesClasse||[]).filter(p=>p.classe===c.classe).length;
    if(escolhidos < slotsGarantidos){
      resultado.push({classe:c.classe, faltando: slotsGarantidos-escolhidos});
    }
  });
  return resultado;
}

// Varre TODAS as fontes onde um poder pode estar guardado (origem, raça, poderes de classe) e
// acha quem tem "escolha" obrigatória (arma, escola, atributo...) na definição do poder mas não
// tem a sub-escolha preenchida na ficha — geralmente porque a ficha foi criada ANTES da gente
// adicionar aquele "escolha" na definição do poder. Cada item devolvido sabe onde escrever de
// volta a resposta (poderGeral, poderGeralExtra, poderRaca, ou o índice em poderesClasse).
function buscarDefinicaoPoder(nome, classeDoPoder){
  if(classeDoPoder && PODERES_CLASSE_COMPLETO[classeDoPoder]){
    const achado = PODERES_CLASSE_COMPLETO[classeDoPoder].find(p=>p.nome===nome);
    if(achado) return achado;
  }
  return PODERES_GERAIS.find(p=>p.nome===nome) || null;
}

function poderesComEscolhaFaltando(f){
  const problemas = [];
  ['poderGeral','poderGeralExtra','poderRaca'].forEach(campo=>{
    const entrada = f[campo];
    if(!entrada || !entrada.nome || entrada.sub) return;
    const def = buscarDefinicaoPoder(entrada.nome, null);
    if(def && def.escolha) problemas.push({origem:campo, nome:entrada.nome, def});
  });
  (f.poderesClasse||[]).forEach((p,idx)=>{
    if(!p.nome || p.sub) return;
    const def = buscarDefinicaoPoder(p.nome, p.trocaPorGeral ? null : p.classe);
    if(def && def.escolha) problemas.push({origem:'poderesClasse', indice:idx, nome:p.nome, def});
  });
  return problemas;
}

function detectarPendencias(f){


  return PENDENCIAS_DEFINICOES.filter(p=>p.detecta(f));
}
