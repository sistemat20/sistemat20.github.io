// Regras de perícias: treino, bônus de poderes, raça, origem, classe, divindade, Tormenta e o valor final.
// Separado do js/app.js em 15/11/2026 (item 6 da revisão geral), sem mudar o código.

const NOME_ATRIBUTO = {for:'Força',des:'Destreza',con:'Constituição',int:'Inteligência',sab:'Sabedoria',car:'Carisma'};

// ---- Cálculo de valor de perícia ----
// Total = 1/2 do nível + atributo-chave + treino (2, 4 no 7º nível, 6 no 15º) + outros
function bonusTreinoPericia(nivel){
  if(nivel>=15) return 6;
  if(nivel>=7) return 4;
  return 2;
}

// Poderes gerais que dão bônus numérico direto em perícias específicas
const PODER_BONUS_PERICIA = {
  'Atlético': [['Atletismo',2]],
  'Investigador': [['Investigação',2],['Intuição', 'int']], // 'int' = soma o valor de Inteligência
  'Sentidos Aguçados': [['Percepção',2]],
  'Saque Rápido': [['Iniciativa',2]],
  'Esquiva': [['Reflexos',2]],
  'Vitalidade': [['Fortitude',2]],
  'Vontade de Ferro': [['Vontade',2]],
  'Finta Aprimorada': [['Enganação',2]],
  'Presença Aterradora': [],
};
function bonusPericiaDePoderes(f, periciaNome){
  const nomes = poderesAtivos(f).concat(nomesPoderesConhecidos(f));
  let total = 0;
  nomes.forEach(nome=>{
    const regras = PODER_BONUS_PERICIA[nome];
    if(!regras) return;
    regras.forEach(([alvo, valor])=>{
      if(alvo!==periciaNome) return;
      if(valor==='int') total += parseInt(f.int)||0;
      else total += valor;
    });
  });
  return total;
}

// Bônus de perícia INCONDICIONAIS vindos de raça (os condicionais, tipo "no subterrâneo" ou
// "sem armadura pesada", ficam só na descrição, pois o app não sabe o contexto da cena)
const PERICIA_BONUS_RACA = {
  'Elfo': [['Misticismo',2],['Percepção',2]],
  'Goblin': [['Fortitude',2]],
  'Hynne': [['Enganação',2]],
  'Suraggel (Aggelus)': [['Diplomacia',2],['Intuição',2]],
  'Suraggel (Sulfure)': [['Enganação',2],['Furtividade',2]],
};
function bonusPericiaDeRaca(f, periciaNome){
  const racaObj = getRacaObj(f);
  if(!racaObj) return 0;
  let total = 0;
  const regras = PERICIA_BONUS_RACA[racaObj.nome];
  if(regras) regras.forEach(([alvo,valor])=>{ if(alvo===periciaNome) total += valor; });
  // Deformidade (Lefou) e Vanguardista (Kliren): +2 em perícia(s) À ESCOLHA do jogador, não fixa
  // pela raça — por isso ficam separadas da tabela acima, guardadas na própria ficha.
  if(racaObj.nome==='Lefou' && (f.deformidadeEscolhas||[]).some(esc=> (typeof esc==='string') ? esc===periciaNome : (esc.tipo==='pericia' && esc.valor===periciaNome))) total += 2;
  if(racaObj.nome==='Kliren' && f.vanguardistaOficio===periciaNome) total += 2;
  // Reptiliano (Trog, achado numa auditoria): "+5 Furtividade sem armadura pesada" — condicional,
  // por isso fica fora da tabela fixa acima (que é só bônus incondicional).
  if(racaObj.nome==='Trog' && periciaNome==='Furtividade' && !usaArmaduraPesada(f)) total += 5;
  return total;
}

// Poderes concedidos por divindade que dão bônus numérico INCONDICIONAL direto em perícias
// específicas (os condicionais, que exigem gastar PM ou uma situação específica na mesa,
// ficam só na descrição — o app não sabe o contexto da cena pra aplicar sozinho).
const PODER_CONCEDIDO_BONUS_PERICIA = {
  'Astúcia da Serpente': [['Enganação',2],['Furtividade',2],['Intuição',2]],
  'Compreender os Ermos': [['Sobrevivência',2]],
  'Golpista Divino': [['Enganação',2],['Jogatina',2],['Ladinagem',2]],
  'Mente Analítica': [['Intuição',2],['Investigação',2],['Vontade',2]],
  'Mente Vazia': [['Iniciativa',2],['Percepção',2],['Vontade',2]],
  'Talento Artístico': [['Acrobacia',2],['Atuação',2],['Diplomacia',2]],
  // Escamas Dracônicas: "+2 na Defesa e em Fortitude" — a parte de Defesa está em
  // bonusDefesaPoderes, essa é só a parte de perícia.
  'Escamas Dracônicas': [['Fortitude',2]],
};
// Poderes concedidos por divindade que tornam o personagem treinado em perícia(s) — algumas são
// fixas (sempre as mesmas), outras exigem escolha do jogador (guardada em f.poderConcedido.sub).
const PODER_CONCEDIDO_TREINA_PERICIA_FIXA = {};
const PODER_CONCEDIDO_TREINA_PERICIA_ESCOLHA = {
  'Conhecimento Enciclopédico': { quantidade:2, filtroAttr:'Int', label:'Quais 2 perícias baseadas em Inteligência?' },
};
// Retorna a lista de poderes concedidos do personagem — usa o array novo (f.poderesConcedidos),
// e cai pro campo singular antigo (f.poderConcedido) se for uma ficha de antes dessa mudança.
function listaPoderesConcedidos(f){
  if(Array.isArray(f.poderesConcedidos) && f.poderesConcedidos.length>0) return f.poderesConcedidos;
  return f.poderConcedido ? [f.poderConcedido] : [];
}

// Bônus de perícia de poderes ÚNICOS de origem (achado numa auditoria — "Esse Cheiro..." dá +2
// Fortitude e nunca tinha sido conectado; deixa a tabela pronta pra caso apareça mais algum).
const PODER_ORIGEM_BONUS_PERICIA = {
  'Esse Cheiro...': [['Fortitude',2]],
};
function bonusPericiaDeOrigem(f, periciaNome){
  if(!f.origemPoder) return 0;
  const regras = PODER_ORIGEM_BONUS_PERICIA[f.origemPoder.nome];
  if(!regras) return 0;
  let total = 0;
  regras.forEach(([alvo, valor])=>{ if(alvo===periciaNome) total += valor; });
  return total;
}

// Bônus de perícia de poderes de CLASSE que são incondicionais (sempre valem, não dependem de
// situação específica tipo "só pra interrogar" ou "só contra devotos") — achados numa
// auditoria. Poderes condicionais a um contexto estreito (Envolto em Mistério, Autoridade
// Eclesiástica, Escapista, etc.) ficam de fora de propósito: aplicar esse bônus sempre, e não só
// na situação certa, deixaria a perícia mostrando um número maior do que realmente vale a
// maior parte do tempo.
const PODER_CLASSE_BONUS_PERICIA = {
  'Pernas do Mar': [['Acrobacia',2],['Atletismo',2]],
  'Etiqueta': [['Diplomacia',2],['Nobreza',2]],
  'Pajem': [['Diplomacia',2]],
  'Força dos Penhascos': [['Fortitude',2]],
  'Liberdade da Pradaria': [['Reflexos',2]],
  'Tranquilidade dos Lagos': [['Vontade',2]],
  'Gatuno': [['Atletismo',2]],
  'Sombra': [['Furtividade',2]],
};
function bonusPericiaDeClasse(f, periciaNome){
  let total = 0;
  nomesPoderesConhecidos(f).forEach(nome=>{
    const regras = PODER_CLASSE_BONUS_PERICIA[nome];
    if(!regras) return;
    regras.forEach(([alvo,valor])=>{ if(alvo===periciaNome) total += valor; });
  });
  return total;
}

// Bônus de perícia de habilidades AUTOMÁTICAS de classe (ganhas só por alcançar o nível, não
// escolhidas) — achadas na mesma auditoria que o Durão/Casca Grossa. Diferente de
// bonusPericiaDeClasse (que olha poderesClasse, ou seja, ESCOLHAS), essa aqui olha
// classesNiveis direto, porque essas habilidades nem ficam guardadas como "poder".
function bonusPericiaDeHabilidadeAutomatica(f, periciaNome){
  let total = 0;
  // Rastreador (Caçador, 1º nível): +2 em Sobrevivência
  const cacadorObj = (f.classesNiveis||[]).find(c=>c.classe==='Caçador');
  if(cacadorObj && periciaNome==='Sobrevivência') total += 2;
  // Esquiva Sagaz (Bucaneiro, 3º nível, escala a cada 4): +1 em Reflexos (mesmo bônus e mesma
  // condição de "liberdade de movimentos" que já vale pra Defesa).
  const bucaneiroObj = (f.classesNiveis||[]).find(c=>c.classe==='Bucaneiro');
  const semLiberdadeMovimentoP = usaArmaduraPesada(f) || (f.condicoesAtivas||[]).includes('Imóvel');
  if(bucaneiroObj && bucaneiroObj.nivel>=3 && !semLiberdadeMovimentoP && periciaNome==='Reflexos'){
    total += 1 + Math.floor((bucaneiroObj.nivel-3)/4);
  }
  // Instinto Selvagem (Bárbaro, 3º nível, escala a cada 6): "+1 em rolagens de dano, Percepção
  // e Reflexos" — só a parte de perícia é calculável aqui (o app não tem onde somar bônus de
  // dano em lugar nenhum, então essa parte fica de fora de propósito, igual outros achados).
  const barbaroObj = (f.classesNiveis||[]).find(c=>c.classe==='Bárbaro');
  if(barbaroObj && barbaroObj.nivel>=3 && (periciaNome==='Percepção' || periciaNome==='Reflexos')){
    total += 1 + Math.floor((barbaroObj.nivel-3)/6);
  }
  return total;
}

function bonusPericiaDeDivindade(f, periciaNome){
  let total = 0;
  listaPoderesConcedidos(f).forEach(pc=>{
    if(!pc || !pc.nome) return;
    const regras = PODER_CONCEDIDO_BONUS_PERICIA[pc.nome];
    if(!regras) return;
    regras.forEach(([alvo,valor])=>{ if(alvo===periciaNome) total += valor; });
  });
  return total;
}

// Retorna o conjunto EFETIVO de perícias treinadas, somando o que o poder concedido atual dá.
// É calculado na hora (nunca gravado direto em f.periciasTreinadas), então trocar de divindade
// ou de poder concedido nunca deixa treino "grudado" de uma escolha antiga, e escolher de novo
// o mesmo poder nunca duplica nada.
function periciasTreinadasComDivindade(f){
  const set = new Set(f.periciasTreinadas||[]);
  // Perícias especializadas (hoje só Ofício, ex: "Ofício (armeiro)") também entram pela versão
  // BASE ("Ofício") — sem isso, um pré-requisito genérico "treinado em Ofício" (sem pedir uma
  // especialidade específica) parava de reconhecer a perícia assim que ela ganhava
  // especialidade, mesmo o personagem continuando treinado nela.
  (f.periciasTreinadas||[]).forEach(p=>{
    const base = nomeBasePericia(p);
    if(base!==p) set.add(base);
  });
  listaPoderesConcedidos(f).forEach(pc=>{
    if(!pc || !pc.nome) return;
    const fixa = PODER_CONCEDIDO_TREINA_PERICIA_FIXA[pc.nome];
    if(fixa) fixa.forEach(p=>set.add(p));
    if(PODER_CONCEDIDO_TREINA_PERICIA_ESCOLHA[pc.nome] && Array.isArray(pc.sub)){
      pc.sub.forEach(p=>{ if(p) set.add(p); });
    }
  });
  return set;
}

// Modificador de Furtividade por categoria de Tamanho (Tabela 1-21 do livro, pág. 107)
const MODIFICADOR_FURTIVIDADE_TAMANHO = { 'Minúsculo':5, 'Pequeno':2, 'Médio':0, 'Grande':-2, 'Enorme':-5, 'Colossal':-10 };
function bonusFurtividadeTamanho(f){
  return MODIFICADOR_FURTIVIDADE_TAMANHO[f.tamanho] || 0;
}

// ---- Poderes da Tormenta: perde Carisma conforme acumula poderes desse grupo (pág. 136) ----
// 1º poder da Tormenta: -1 Carisma. A cada 2 outros poderes da Tormenta: mais -1 Carisma.
const NOMES_PODERES_TORMENTA = new Set(PODERES_GERAIS.filter(p=>p.grupo==='Tormenta').map(p=>p.nome));
// Deformidade (Lefou, Livro Básico pág. 24): cada +2 em perícia "conta como um poder da Tormenta
// (exceto para perda de Carisma)", e o poder trocado no lugar de um bônus "também não conta para
// perda de Carisma". Por isso há duas contagens: a geral (escala dos poderes, Linhagem Rubra) e a
// da perda de Carisma (Livro Básico pág. 137), que deixa de fora tudo o que veio da Deformidade.
function qtdPoderesTormenta(f){
  const deformidadePericias = getRacaObj(f) && getRacaObj(f).nome==='Lefou'
    ? (f.deformidadeEscolhas||[]).filter(esc=> typeof esc==='string' || (esc && esc.tipo==='pericia')).length : 0;
  return poderesAtivos(f).filter(nome => NOMES_PODERES_TORMENTA.has(nome)).length + deformidadePericias;
}

function qtdPoderesTormentaParaCarisma(f){
  const restantes = poderesAtivos(f).filter(nome => NOMES_PODERES_TORMENTA.has(nome));
  (f.deformidadeEscolhas||[]).forEach(esc=>{
    if(esc && esc.tipo==='tormenta'){ const i = restantes.indexOf(esc.valor); if(i>=0) restantes.splice(i,1); }
  });
  return restantes.length;
}

function penalidadeCarismaTormenta(f){
  const qtd = qtdPoderesTormentaParaCarisma(f);
  return qtd>=1 ? 1+Math.floor((qtd-1)/2) : 0;
}

// Valor de um atributo já considerando penalidades automáticas (hoje só existe a de Carisma
// pelos Poderes da Tormenta, mas a função fica genérica caso apareça outra parecida no futuro).
function atributoEfetivo(f, chave){
  // Maldição do Bardo (Ameaças de Arton, pág. 362): "todos os atributos são tratados como 0
  // pra efeitos de modificadores de perícias e CD de habilidades" — centralizado aqui porque
  // atributoEfetivo já é o ponto único que periciaValor e cdMagias (depois de eu ajustar essa
  // pra usar essa função também) passam antes de aplicar o número na conta.
  if(maldicoesAtivas(f).includes('Maldição do Bardo')) return 0;
  const base = parseInt(f[chave])||0;
  if(chave==='car') return base - penalidadeCarismaTormenta(f);
  return base;
}

// Bônus de perícia/Defesa dos Poderes da Tormenta que dão um número fixo escalando "+1 a cada 2
// outros poderes da Tormenta" — os outros (ativados com PM, situacionais) ficam só informativos,
// igual vários poderes de classe já são no app.
const TORMENTA_BONUS_PERICIA = {
  'Antenas': ['Iniciativa','Percepção','Vontade'],
  'Articulações Flexíveis': ['Acrobacia','Furtividade','Reflexos'],
  'Mãos Membranosas': ['Atletismo','Fortitude'],
  'Olhos Vermelhos': ['Intimidação'],
};
function bonusPericiaDeTormenta(f, periciaNome){
  const nomes = poderesAtivos(f);
  const escala = 1 + Math.floor((qtdPoderesTormenta(f)-1)/2);
  let total = 0;
  Object.keys(TORMENTA_BONUS_PERICIA).forEach(nomePoder=>{
    if(nomes.includes(nomePoder) && TORMENTA_BONUS_PERICIA[nomePoder].includes(periciaNome)) total += escala;
  });
  return total;
}

function bonusDefesaTormenta(f){
  if(!poderesAtivos(f).includes('Carapaça')) return 0;
  return 1 + Math.floor((qtdPoderesTormenta(f)-1)/2);
}

function periciaValor(f, p){
  const nivel = nivelTotal(f);
  const metade = Math.floor(nivel/2);
  const racaObjPericia = getRacaObj(f);
  // Acrobático (poder geral, achado na mesma auditoria — mesma troca de atributo que já existia
  // pra Trog via raça, mas nunca checava esse poder): "usa Destreza em vez de Força em
  // Atletismo". A parte de "terreno difícil não reduz deslocamento" fica de fora — o app não
  // rastreia em que tipo de terreno o personagem está agora.
  const usaDesEmAtletismo = p.nome==='Atletismo' && ((racaObjPericia && racaObjPericia.atletismoUsaDestreza) || nomesPoderesConhecidos(f).includes('Acrobático'));
  // Compreender os Ermos (poder concedido, devoto de Allihanna): "pode usar Sabedoria para
  // Adestramento (em vez de Carisma)" — achado numa auditoria comparando com o livro; a tabela
  // de bônus desse poder só tinha o +2 Sobrevivência, faltava essa troca de atributo-chave.
  const usaSabEmAdestramento = p.nome==='Adestramento' && listaPoderesConcedidos(f).some(pc=>pc && pc.nome==='Compreender os Ermos');
  // Fé Guerreira (poder concedido de Arsenal, achado na mesma auditoria): "usa Sabedoria para
  // Guerra em vez de Inteligência" — mesmo padrão de troca já usado acima pra Adestramento.
  const usaSabEmGuerra = p.nome==='Guerra' && listaPoderesConcedidos(f).some(pc=>pc && pc.nome==='Fé Guerreira');
  // Familiar Rato: "pode usar seu atributo-chave (de magia) em Fortitude, no lugar de
  // Constituição" — mesma mecânica de troca de atributo já usada acima. Implementado como o
  // MAIOR dos dois, já que a regra diz "pode usar" (a escolha óbvia é sempre a melhor).
  const famRato = familiarAtivo(f);
  const usaChaveMagiaEmFortitude = p.nome==='Fortitude' && famRato && famRato.nome==='Rato' && atributoChaveMagia(f);
  const attrKey = usaDesEmAtletismo ? 'des' : usaSabEmAdestramento ? 'sab' : usaSabEmGuerra ? 'sab'
    : usaChaveMagiaEmFortitude ? (atributoEfetivo(f, atributoChaveMagia(f)) > atributoEfetivo(f,'con') ? atributoChaveMagia(f) : 'con')
    : (p.attr||'').toLowerCase().slice(0,3); // 'For'->'for','Des'->'des', etc.
  const attrVal = atributoEfetivo(f, attrKey);
  const treinada = periciasTreinadasComDivindade(f).has(p.nome);
  const treino = treinada ? bonusTreinoPericia(nivel) : 0;
  const poderes = bonusPericiaDePoderes(f, p.nome);
  const tormentaBonus = bonusPericiaDeTormenta(f, p.nome);
  const itensVestidos = bonusPericiaDeItensVestidos(f, p.nome);
  const racaBonus = bonusPericiaDeRaca(f, p.nome);
  const divindadeBonus = bonusPericiaDeDivindade(f, p.nome);
  const origemBonus = bonusPericiaDeOrigem(f, p.nome);
  const classeBonus = bonusPericiaDeClasse(f, p.nome);
  const habilidadeAutomaticaBonus = bonusPericiaDeHabilidadeAutomatica(f, p.nome);
  const condicoesBonus = bonusCondicoesPericia(f, p);
  const tamanhoBonus = (p.nome==='Furtividade') ? bonusFurtividadeTamanho(f) : 0;
  const penalidade = p.armadura ? penalidadeTotal(f) : 0; // penalidadeTotal já é negativa ou zero
  // Sem proficiência com a armadura/escudo equipado: a penalidade vale para TODA perícia de Força/Destreza
  // (não só as 3 marcadas com ‡), mesmo que a perícia normalmente não sofresse penalidade de armadura.
  const penalidadeExtra = (!p.armadura && (p.attr==='For' || p.attr==='Des')) ? penalidadeNaoProficienciaArmadura(f) : 0;
  const parceirosBonus = bonusPericiaDeParceiros(f, p.nome) + bonusResistenciaParceiros(f, p.nome);
  return metade + attrVal + treino + poderes + tormentaBonus + itensVestidos + racaBonus + divindadeBonus + origemBonus + classeBonus + habilidadeAutomaticaBonus + condicoesBonus + tamanhoBonus + penalidade + penalidadeExtra + parceirosBonus;
}
