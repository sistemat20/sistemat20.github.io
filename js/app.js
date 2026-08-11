// ============ Painel do Aventureiro — Tormenta 20 ============
// app.js — estado, roteamento entre telas e toda a lógica de UI

const TIPS_GERAIS = [
  ["Pontos de Vida (PV)","quando chegam a 0, seu personagem cai. É sua barra de aguentar dano."],
  ["Pontos de Mana (PM)","o combustível das magias e da maioria dos poderes especiais. Gerencie com cuidado."],
  ["Círculo de magia","magias de círculo maior são mais fortes e custam mais PM. Você só acessa um círculo novo em níveis específicos da sua classe."],
  ["Defesa","o número que os inimigos precisam superar para te acertar. Base 10 + Destreza + armadura/escudo."],
  ["Teste de resistência","quando alguém tenta resistir a um efeito (sua magia ou de um inimigo), compara o resultado com a CD (10 + metade do nível + atributo-chave)."],
];

const AVATAR_CORES = ['#7c1f1f','#2c3a52','#8a6a1e','#3b5c3b','#5a3b6b','#a4291f','#4a4a4a','#6b4423'];
function corAvatar(seed){
  let h=0; for(const c of String(seed)) h = (h*31 + c.charCodeAt(0))>>>0;
  return AVATAR_CORES[h % AVATAR_CORES.length];
}
function uid(){ return 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

function el(tag, attrs, ...children){
  const e = document.createElement(tag);
  const BOOLEANOS = ['checked','disabled','selected','required','readonly'];
  if(attrs) for(const k in attrs){
    if(k==='class') e.className = attrs[k];
    else if(k.startsWith('on')) e.addEventListener(k.substring(2).toLowerCase(), attrs[k]);
    else if(BOOLEANOS.includes(k)){
      // atributos booleanos do HTML: a simples presença já significa "true", mesmo com valor "false"
      // como string — por isso só adicionamos o atributo quando for genuinamente verdadeiro.
      if(attrs[k]) e.setAttribute(k, '');
      e[k] = !!attrs[k]; // também seta a propriedade, pra refletir de imediato (ex: checkbox.checked)
    }
    else e.setAttribute(k, attrs[k]);
  }
  children.flat().forEach(c=>{
    if(c==null) return;
    if(typeof c === 'string' || typeof c === 'number') e.appendChild(document.createTextNode(c));
    else e.appendChild(c);
  });
  return e;
}

// Ajusta a altura de uma textarea pro tamanho exato do conteúdo (sem barra de rolagem interna).
function autoResizeTextarea(ta){
  ta.style.height = 'auto';
  ta.style.height = (ta.scrollHeight + 2) + 'px';
}
// Cria uma textarea que cresce sozinha pra baixo conforme o texto aumenta, em vez de ficar
// com scroll interno numa caixinha fixa. Aceita os mesmos atributos de el('textarea', ...).
function textareaAutoResize(attrs, valorInicial){
  const attrsFinal = Object.assign({}, attrs, {
    oninput:(e)=>{ if(attrs && attrs.oninput) attrs.oninput(e); autoResizeTextarea(e.target); },
    style: (attrs && attrs.style ? attrs.style+';' : '') + 'resize:none;overflow-y:hidden;'
  });
  const ta = el('textarea', attrsFinal, valorInicial);
  requestAnimationFrame(()=> autoResizeTextarea(ta));
  return ta;
}

function custoPM(circulo){
  const tabela = {1:1, 2:3, 3:6, 4:10, 5:15};
  return tabela[circulo] || circulo*2;
}

// Itens esotéricos equipados (ocupam mão, dão bônus mágicos — Cap. 3, Equipamento)
function esotericosEquipados(f){ return (f.esotericos||[]).filter(e=>e.equipado!==false); }
function bonusCdArcana(f, escola){
  let total = 0;
  esotericosEquipados(f).forEach(e=>{
    (e.efeito||[]).forEach(ef=>{
      if(ef.tipo==='cd_arcana_geral') total += ef.valor;
      if(ef.tipo==='cd_arcana_escola' && e.escolaFoco===escola) total += ef.valor;
    });
  });
  // Especialista em Escola e Fortalecimento Arcano (poderes de classe do Arcanista, achados
  // numa auditoria) — nunca tinham sido conectados; bonusCdArcana só olhava pra itens antes.
  (f.poderesClasse||[]).forEach(p=>{
    if(p.nome==='Especialista em Escola' && p.sub===escola) total += 2;
    if(p.nome==='Fortalecimento Arcano') total += circuloMaximoDisponivel(f)>=4 ? 2 : 1;
  });
  // Linhagem Feérica, herança aprimorada (Feiticeiro, achada na mesma auditoria): "+2 na CD pra
  // resistir a suas magias de encantamento e ilusão".
  if(f.arcanistaLinhagem==='Linhagem Feérica' && (f.poderesClasse||[]).some(p=>p.nome==='Herança Aprimorada') && (escola==='Encantamento' || escola==='Ilusão')){
    total += 2;
  }
  return total;
}
function limitePMExtraArcana(f){
  let total = 0;
  esotericosEquipados(f).forEach(e=>{
    (e.efeito||[]).forEach(ef=>{ if(ef.tipo==='limite_pm_arcana') total += ef.valor; });
  });
  return total;
}
// Alguns esotéricos (Bolsa de pó, Tomo de Guerra) só dão o PM extra quando a magia é de uma
// escola específica (encantamento/ilusão, evocação) — diferente do bônus geral acima, que vale
// pra qualquer magia arcana.
function limitePMExtraPorEscola(f, escola){
  let total = 0;
  esotericosEquipados(f).forEach(e=>{
    (e.efeito||[]).forEach(ef=>{
      if(ef.tipo==='limite_pm_escola' && ef.escolas && ef.escolas.includes(escola)) total += ef.valor;
    });
  });
  return total;
}
// Custo em PM de uma magia específica, já considerando itens que reduzem custo (ex: Medalhão de Prata)
// Deslocamentos alternativos (escalada, natação, voo) que algumas raças têm — existiam só no
// texto do traço racial, sem lugar nenhum na ficha pra consultar. Alguns são fixos em metros,
// outros acompanham o deslocamento terrestre do personagem (que muda com armadura/carga).
const DESLOCAMENTOS_ALTERNATIVOS = {
  'Goblin': [{tipo:'Escalada', igualTerrestre:true, obs:'Espelunqueiro'}],
  'Sereia/Tritão': [{tipo:'Natação', valor:12, obs:'Transformação Anfíbia'}],
  'Sílfide': [{tipo:'Voo', valor:12, obs:'Asas de Borboleta — custa 1 PM por rodada'}],
};
function deslocamentosAlternativos(f){
  const lista = DESLOCAMENTOS_ALTERNATIVOS[f.raca];
  if(!lista) return [];
  return lista.map(d=>({
    tipo: d.tipo,
    valor: d.igualTerrestre ? deslocamentoEfetivo(f) : d.valor,
    obs: d.obs,
  }));
}

function custoPMAjustado(f, magia){
  let custo = custoPM(magia.c);
  if(/pessoal/i.test(magia.alcance||'')){
    esotericosEquipados(f).forEach(e=>{
      (e.efeito||[]).forEach(ef=>{ if(ef.tipo==='custo_pm_alcance_pessoal') custo += ef.valor; });
    });
  }
  // Condição Alquebrado: "custo em PM das habilidades aumenta em +1" — a condição existia na
  // lista e podia ser marcada na ficha, mas o efeito nunca era aplicado em lugar nenhum.
  if(condicoesAtivas(f).includes('Alquebrado')) custo += 1;
  return Math.max(1, custo);
}
// CD de resistência de uma magia específica (considera bônus de esotéricos arcanos por escola)
function cdMagiaEspecifica(f, magia){
  const base = cdMagias(f);
  if(base==null) return null;
  const ehArcanaOuUniversal = magia.trad==='Arcana' || magia.trad==='Universal';
  return base + (ehArcanaOuUniversal ? bonusCdArcana(f, magia.e) : 0);
}
// Limite de PM que pode gastar numa única magia/habilidade de custo variável (regra geral do
// livro, pág. de Classes — o mesmo exemplo do livro: "um arcanista de 11º nível pode gastar até
// 11 PM" numa magia só). É o NÍVEL do personagem, não o atributo-chave (conferido com a wiki
// oficial antes de mudar — o código antigo aqui usava o atributo por engano, e nunca tinha sido
// usado em lugar nenhum do app ainda, então corrigir não quebra nada). Magia Ilimitada (poder
// geral, qualquer conjurador) soma o atributo-chave por cima — esse sim vale pra QUALQUER
// tradição (diferente do bônus de item, que é só arcana).
// Nível "que conta" pro limite de PM de uma magia — regra confirmada contra a wiki oficial:
// magia vinda de uma CLASSE usa o nível NESSA classe (importante em multiclasse: um
// Guerreiro 5/Arcanista 3 usa nível 3, não 8); magia vinda só de raça/origem (sem nenhuma
// classe conjuradora) usa o nível total do personagem mesmo, que é o próprio fallback natural
// aqui já que não tem "classeConj" nesse caso.
function nivelParaLimitePM(f){
  const classeConj = (f.classesNiveis||[]).find(c=> CLASSES[c.classe] && CLASSES[c.classe].tradicao);
  return classeConj ? classeConj.nivel : nivelTotal(f);
}
function limitePMPorMagia(f, magia){
  const ehArcanaOuUniversal = magia.trad==='Arcana' || magia.trad==='Universal';
  const bonusItens = ehArcanaOuUniversal ? limitePMExtraArcana(f) : 0;
  const bonusEscola = limitePMExtraPorEscola(f, magia.e);
  const bonusMagiaIlimitada = poderesAtivos(f).includes('Magia Ilimitada') ? (valorAtributoChaveMagia(f)||0) : 0;
  return nivelParaLimitePM(f) + bonusItens + bonusEscola + bonusMagiaIlimitada;
}

// Atributo-chave de magia do personagem (baseado na 1ª classe conjuradora que ele tiver)
function atributoChaveMagia(f){
  const classeConj = (f.classesNiveis||[]).find(c=> CLASSES[c.classe] && CLASSES[c.classe].tradicao);
  if(!classeConj) return null;
  // Arcanista tem o atributo-chave definido pelo Caminho escolhido (Bruxo/Mago=Int, Feiticeiro=Car),
  // não por "o que for maior" — só cai no fallback genérico se o personagem ainda não escolheu.
  if(classeConj.classe==='Arcanista' && f.arcanistaCaminho && ARCANISTA_CAMINHOS[f.arcanistaCaminho]){
    return ARCANISTA_CAMINHOS[f.arcanistaCaminho].atributo;
  }
  const atributoTxt = CLASSES_INICIAL[classeConj.classe].atributo;
  const opcoes = [];
  if(/Inteligência/.test(atributoTxt)) opcoes.push('int');
  if(/Sabedoria/.test(atributoTxt)) opcoes.push('sab');
  if(/Carisma/.test(atributoTxt)) opcoes.push('car');
  if(opcoes.length<=1) return opcoes[0]||null;
  return opcoes.reduce((a,b)=> (parseInt(f[b])||0) > (parseInt(f[a])||0) ? b : a);
}
function valorAtributoChaveMagia(f){
  const attr = atributoChaveMagia(f);
  return attr ? (parseInt(f[attr])||0) : null;
}
function cdMagias(f){
  const attr = atributoChaveMagia(f);
  if(attr==null) return null;
  return 10 + Math.floor(nivelTotal(f)/2) + (parseInt(f[attr])||0);
}
function classeConjuradora(f){
  return (f.classesNiveis||[]).find(c=> CLASSES[c.classe] && CLASSES[c.classe].tradicao) || null;
}
// Círculo máximo de magia disponível: 1º círculo no 1º nível da classe, +1 círculo a cada 4 níveis
// (2º no 5º, 3º no 9º, 4º no 13º, 5º no 17º) — regra igual pra Arcanista, Bardo, Clérigo e Druida.
function circuloMaximoDisponivel(f){
  const cc = classeConjuradora(f);
  if(!cc) return 0;
  return Math.min(5, Math.ceil(cc.nivel/4));
}

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
function qtdPoderesTormenta(f){
  return poderesAtivos(f).filter(nome => NOMES_PODERES_TORMENTA.has(nome)).length;
}
function penalidadeCarismaTormenta(f){
  const qtd = qtdPoderesTormenta(f);
  return qtd>=1 ? 1+Math.floor((qtd-1)/2) : 0;
}
// Valor de um atributo já considerando penalidades automáticas (hoje só existe a de Carisma
// pelos Poderes da Tormenta, mas a função fica genérica caso apareça outra parecida no futuro).
function atributoEfetivo(f, chave){
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
  const usaDesEmAtletismo = p.nome==='Atletismo' && racaObjPericia && racaObjPericia.atletismoUsaDestreza;
  // Compreender os Ermos (poder concedido, devoto de Allihanna): "pode usar Sabedoria para
  // Adestramento (em vez de Carisma)" — achado numa auditoria comparando com o livro; a tabela
  // de bônus desse poder só tinha o +2 Sobrevivência, faltava essa troca de atributo-chave.
  const usaSabEmAdestramento = p.nome==='Adestramento' && listaPoderesConcedidos(f).some(pc=>pc && pc.nome==='Compreender os Ermos');
  const attrKey = usaDesEmAtletismo ? 'des' : usaSabEmAdestramento ? 'sab' : (p.attr||'').toLowerCase().slice(0,3); // 'For'->'for','Des'->'des', etc.
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
  const condicoesBonus = bonusCondicoesPericia(f, p);
  const tamanhoBonus = (p.nome==='Furtividade') ? bonusFurtividadeTamanho(f) : 0;
  const penalidade = p.armadura ? penalidadeTotal(f) : 0; // penalidadeTotal já é negativa ou zero
  // Sem proficiência com a armadura/escudo equipado: a penalidade vale para TODA perícia de Força/Destreza
  // (não só as 3 marcadas com ‡), mesmo que a perícia normalmente não sofresse penalidade de armadura.
  const penalidadeExtra = (!p.armadura && (p.attr==='For' || p.attr==='Des')) ? penalidadeNaoProficienciaArmadura(f) : 0;
  return metade + attrVal + treino + poderes + tormentaBonus + itensVestidos + racaBonus + divindadeBonus + origemBonus + classeBonus + condicoesBonus + tamanhoBonus + penalidade + penalidadeExtra;
}

function bonusDefesaPoderes(f){
  const nomes = poderesAtivos(f);
  let bonus = 0;
  if(nomes.includes('Esquiva')) bonus += 2;
  if(nomes.includes('Encouraçado') && f.armadura && f.armadura.equipado!==false && f.armadura.cat==='Pesada'){
    bonus += 2;
    // "Esse bônus aumenta em +2 para cada outro poder que você possua que tenha Encouraçado
    // como pré-requisito" (livro, pág. 125) — Inexpugnável e Fanático são os dois que pedem
    // Encouraçado hoje. Empilhava só o +2 fixo antes, sem considerar esses dois.
    ['Inexpugnável','Fanático'].forEach(nome=>{ if(nomes.includes(nome)) bonus += 2; });
  }
  if(nomes.includes('Estilo de Uma Arma') && usandoUmaArmaSoNaMao(f)) bonus += 2;
  // Pele de Ferro (poder de classe do Bárbaro — NUNCA existiu como poder geral, só de classe,
  // achado numa auditoria: a checagem antiga usava poderesAtivos, que só pega poder de classe se
  // foi TROCADO por um slot geral — pra um Bárbaro que pegou normal, nunca funcionava). Pele de
  // Aço (upgrade do mesmo poder, 8º nível) aumenta pra +8 em vez de +4 — também nunca conectado.
  const nomesConhecidos = nomesPoderesConhecidos(f);
  if(nomesConhecidos.includes('Pele de Ferro') && !usaArmaduraPesada(f)){
    bonus += nomesConhecidos.includes('Pele de Aço') ? 8 : 4;
  }
  // Braços Calejados (poder de classe do Lutador, achado na mesma auditoria): "se você não
  // estiver usando armadura, soma sua Força na Defesa, limitado pelo seu nível" — sem armadura
  // NENHUMA (não só "sem pesada"), e o bônus não pode passar do nível do personagem.
  const semArmaduraNenhuma = !f.armadura || f.armadura.equipado===false;
  if(nomesConhecidos.includes('Braços Calejados') && semArmaduraNenhuma){
    bonus += Math.min(parseInt(f.for)||0, nivelTotal(f));
  }
  return bonus;
}
// "Estilo de Uma Arma": empunhando 1 arma corpo a corpo de 1 mão e nada na outra (sem 2ª arma, sem escudo)
function usandoUmaArmaSoNaMao(f){
  if((f.armas||[]).length !== 1) return false;
  const unica = f.armas[0];
  if(unica.distancia || unica.maos!==1) return false;
  if(f.escudo) return false;
  return true;
}
function bonusEscudoPoderes(f){
  const nomes = poderesAtivos(f);
  return nomes.includes('Estilo de Arma e Escudo') ? 2 : 0;
}

function usaArmaduraPesada(f){
  return !!(f.armadura && f.armadura.equipado!==false && f.armadura.cat==='Pesada');
}
// Busca a raça de forma tolerante (ignora maiúsculas/espaços extras) — o campo "Raça" na
// ficha é texto livre editável, então uma pequena diferença não pode silenciosamente
// desativar os bônus mecânicos da raça (Defesa, penalidade, deslocamento etc.)
function getRacaObj(f){
  if(!f || !f.raca) return null;
  const alvo = String(f.raca).trim().toLowerCase();
  return RACAS.find(r => r.nome.trim().toLowerCase() === alvo) || null;
}
function bonusDefesaRaca(f){
  const racaObj = getRacaObj(f);
  return (racaObj && racaObj.defesaBonusFixo) ? racaObj.defesaBonusFixo : 0;
}
function penalidadeArmaduraRaca(f){
  const racaObj = getRacaObj(f);
  return (racaObj && racaObj.penalidadeArmaduraFixa) ? racaObj.penalidadeArmaduraFixa : 0;
}
// Ajuste rápido de PV/PM (toque no + ou -) — nunca passa do máximo nem fica negativo
// ---- Ferimentos & Morte (regra da pág. 236 do livro básico) ----
// Morre em -10 PV ou em -metade do PV máximo, o que for MAIS BAIXO (mais negativo).
function limiteMortePv(f){
  const max = pvMaxEfetivo(f);
  return Math.min(-10, -Math.floor(max/2));
}
function estaMorto(f){ return (parseInt(f.pvatual)||0) <= limiteMortePv(f); }
function estaInconsciente(f){ const pv = parseInt(f.pvatual)||0; return pv<=0 && !estaMorto(f); }
function ajustarPV(f, delta){
  const max = pvMaxEfetivo(f);
  const atual = parseInt(f.pvatual)||0;
  const limiteMorte = limiteMortePv(f);
  const novo = Math.max(limiteMorte, Math.min(max, atual+delta));
  // Perder PV estando a 0 ou menos (ou cair a 0 ou menos agora) exige um novo teste de
  // Constituição — "sangrando de novo", não fica estabilizado de graça.
  if(delta<0 && novo<=0) f.estabilizado = false;
  if(novo>0) f.estabilizado = false; // volta consciente, o estado de sangramento não importa mais
  if(novo!==atual) registrarLog(f, (delta>0?'+':'')+delta+' PV ('+atual+' → '+novo+')');
  f.pvatual = novo;
  salvarPerfis(); render();
}
// Teste de Constituição (CD 15) de quem está a 0 PV ou menos, sangrando. Passar estabiliza
// (não precisa testar de novo, a menos que perca mais PV). Falhar custa 1d6 PV a mais — o que
// pode ser fatal, dependendo de quanto já perdeu.
// Vocês rolam o teste de Constituição (CD 15) e o dano de falha (1d6) nos dados de verdade, na
// mesa — o app só marca "passou" (estabiliza) quando você confirmar. Se falhar, é só tirar o
// dano rolado direto no PV normal (o mesmo −/+ de sempre), sem precisar de nada aqui.
function estabilizarPersonagem(f){
  f.estabilizado = true;
  flashMsg('✅ Estabilizado — não sangra mais, mas continua inconsciente até ganhar PV de novo.');
  salvarPerfis(); render();
}
function ajustarPM(f, delta){
  const max = pmMaxEfetivo(f);
  const atual = parseInt(f.pmatual)||0;
  const novo = Math.max(0, Math.min(max, atual+delta));
  if(novo!==atual) registrarLog(f, (delta>0?'+':'')+delta+' PM ('+atual+' → '+novo+')');
  f.pmatual = novo;
  salvarPerfis(); render();
}

// Recebe um arquivo de imagem escolhido pelo jogador e abre o ajustador de posição (arrastar
// pra escolher o que aparece) antes de confirmar — só depois disso é que redimensiona/comprime/envia.
// Upload de mapa — bem mais simples que o de foto de personagem (sem recorte circular, mapa é
// retângulo mesmo). Redimensiona se for muito grande (economiza espaço/banda), manda pro Drive
// (ou guarda direto, no modo Claude) e adiciona na lista de mapas do Mestre.
function handleMapaUpload(file){
  if(!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = (e)=>{
    const img = new Image();
    img.onload = async ()=>{
      const MAX_LADO = 1600;
      let w = img.naturalWidth, h = img.naturalHeight;
      if(w>MAX_LADO || h>MAX_LADO){
        const escala = MAX_LADO / Math.max(w,h);
        w = Math.round(w*escala); h = Math.round(h*escala);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      const base64 = canvas.toDataURL('image/jpeg', 0.85);
      state._mapaEnviando = true;
      render();
      const url = await enviarFotoParaBackend(base64, 'mapa_'+Date.now()+'.jpg');
      if(!state._mestreMapas) state._mestreMapas = [];
      state._mestreMapas.push({nome: state._novoMapaNome||'Mapa sem nome', url});
      state._novoMapaNome = '';
      state._mapaEnviando = false;
      sincronizarGradeCompartilhada();
      flashMsg('🗺️ Mapa adicionado!');
      render();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// Popup de visualização ampliada — usado tanto pelo Mestre (lista de mapas enviados) quanto
// pelo jogador (Notas → Locais), pra não ter que rolar a tela toda cheia de imagem: o nome vira
// clicável, e só abre grande quando alguém realmente quer ver.
function abrirVisualizarMapa(nome, url){
  state._visualizarMapaPopup = {nome, url};
  render();
}
function renderPopupVisualizarMapa(){
  const fluxo = state._visualizarMapaPopup;
  const overlay = el('div',{class:'menu-overlay', style:'padding:10px;', onclick:(e)=>{ if(e.target===e.currentTarget){ state._visualizarMapaPopup=null; render(); } }});
  const sheet = el('div',{class:'menu-sheet', style:'max-width:none;width:100%;padding:0;'});
  sheet.appendChild(el('div',{style:'display:flex;justify-content:space-between;align-items:center;padding:12px 14px;'},
    el('div',{class:'wizard-title', style:'margin:0;'}, fluxo.nome),
    el('button',{class:'remove-x', onclick:()=>{ state._visualizarMapaPopup=null; render(); }},'✕')
  ));
  sheet.appendChild(el('img',{src:fluxo.url, style:'width:100%;display:block;border-bottom-left-radius:var(--radius-lg);border-bottom-right-radius:var(--radius-lg);'}));
  overlay.appendChild(sheet);
  return overlay;
}

function renderMestreMapas(){
  const wrap = el('div',{});
  if(!state._mestreMapas) state._mestreMapas = [];
  const panel = el('div',{class:'panel faixa'}, el('h2',{},'Mapas'));
  panel.appendChild(el('div',{class:'tip', style:'font-size:0.8rem;'}, 'Envie mapas/imagens de lugares importantes — eles ficam disponíveis pros jogadores em Notas → Locais, pra qualquer um adicionar como referência visual de um lugar que já visitaram.'));
  if(!state._novoMapaNome) state._novoMapaNome = '';
  panel.appendChild(el('label',{style:'margin-top:8px;'},'Nome do mapa/lugar'));
  panel.appendChild(el('input',{type:'text', placeholder:'ex: Taverna do Javali Dourado', value:state._novoMapaNome, oninput:(e)=>{state._novoMapaNome=e.target.value;}}));
  if(state._mapaEnviando){
    panel.appendChild(el('div',{class:'empty', style:'margin-top:10px;'}, 'Enviando mapa...'));
  } else {
    panel.appendChild(el('label',{class:'btn ghost', style:'margin-top:10px;display:block;text-align:center;cursor:pointer;'},
      '📤 Escolher imagem',
      el('input',{type:'file', accept:'image/*', style:'display:none;', onchange:(e)=>{
        if(!state._novoMapaNome || !state._novoMapaNome.trim()){ flashMsg('Coloca um nome pro mapa primeiro.'); e.target.value=''; return; }
        if(e.target.files[0]) handleMapaUpload(e.target.files[0]);
      }})
    ));
  }
  wrap.appendChild(panel);

  const listaPanel = el('div',{class:'panel'}, el('h2',{},'Mapas Enviados ('+state._mestreMapas.length+')'));
  if(state._mestreMapas.length===0){
    listaPanel.appendChild(el('div',{class:'empty'}, 'Nenhum mapa enviado ainda.'));
  } else {
    state._mestreMapas.forEach((mapa, idx)=>{
      listaPanel.appendChild(el('div',{class:'spell-card'},
        el('div',{class:'head', style:'cursor:pointer;', onclick:()=>abrirVisualizarMapa(mapa.nome, mapa.url)},
          el('span',{class:'name'}, '🗺️ ', mapa.nome),
          el('button',{class:'remove-x', onclick:(e)=>{
            e.stopPropagation();
            if(!confirm('Remover o mapa "'+mapa.nome+'"? Os jogadores que já adicionaram como local continuam vendo (a imagem fica guardada na anotação deles).')) return;
            state._mestreMapas.splice(idx,1);
            sincronizarGradeCompartilhada();
            render();
          }},'✕')
        ),
      ));
    });
  }
  wrap.appendChild(listaPanel);

  return wrap;
}

function handleFotoUpload(f, file){
  if(!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = (e)=>{
    const img = new Image();
    img.onload = ()=>{
      state._cropperFoto = { ficha:f, img:img, imgSrc:e.target.result, posX:50, posY:50 };
      render();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// Depois que o jogador arrasta e confirma a posição, recorta exatamente o que estava visível,
// redimensiona pra um quadrado final e manda pro backend (Drive) ou guarda direto (modo Claude).
function confirmarCropFoto(){
  const c = state._cropperFoto;
  if(!c) return;
  const TAM = 260;
  const naturalW = c.img.naturalWidth, naturalH = c.img.naturalHeight;
  const scale = Math.max(TAM/naturalW, TAM/naturalH);
  const excessX = Math.max(0, naturalW*scale - TAM);
  const excessY = Math.max(0, naturalH*scale - TAM);
  const srcX = (excessX * (c.posX/100)) / scale;
  const srcY = (excessY * (c.posY/100)) / scale;
  const srcSize = TAM/scale;

  const OUT = 300;
  const canvas = document.createElement('canvas');
  canvas.width = OUT; canvas.height = OUT;
  canvas.getContext('2d').drawImage(c.img, srcX, srcY, srcSize, srcSize, 0, 0, OUT, OUT);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.72);

  const f = c.ficha;
  if(_cropperFotoLimpar){ _cropperFotoLimpar(); _cropperFotoLimpar = null; }
  state._cropperFoto = null;
  render();
  (async ()=>{
    flashMsg('Enviando foto...');
    const urlFinal = await enviarFotoParaBackend(dataUrl, 'personagem_'+f.id+'.jpg');
    f.foto = urlFinal;
    salvarPerfis(); render();
  })();
}

// Painel de ajuste de posição da foto — arraste a imagem dentro do quadro pra escolher o que
// aparece (útil quando a foto original é bem mais alta/larga que o quadro final).
// Guarda a função de limpeza do arrasto atual (se houver), pra garantir que nunca fique
// um "mousemove"/"mouseup" grudado no document depois que o popup fechar — isso ia se
// acumular a cada foto enviada e deixar o app mais lento com o tempo.
let _cropperFotoLimpar = null;

function fecharCropperFoto(){
  if(_cropperFotoLimpar){ _cropperFotoLimpar(); _cropperFotoLimpar = null; }
  state._cropperFoto = null;
  render();
}

function renderCropperFoto(){
  if(_cropperFotoLimpar){ _cropperFotoLimpar(); _cropperFotoLimpar = null; } // limpa qualquer arrasto pendente de uma abertura anterior
  const c = state._cropperFoto;
  const TAM = 260;
  const overlay = el('div',{class:'menu-overlay', onclick:(e)=>{ if(e.target===e.currentTarget){ fecharCropperFoto(); } }});
  const sheet = el('div',{class:'menu-sheet', style:'max-width:320px;text-align:center;padding:18px;'});
  sheet.appendChild(el('div',{class:'wizard-title'},'Ajustar foto'));
  sheet.appendChild(el('div',{class:'tip', style:'font-size:0.78rem;'}, 'Arraste a imagem pra escolher a parte que vai aparecer.'));

  const viewport = el('div',{style:'width:'+TAM+'px;height:'+TAM+'px;margin:14px auto;border-radius:14px;overflow:hidden;border:2px solid var(--gold-deep);position:relative;cursor:grab;touch-action:none;background:#000;'});
  const imgEl = el('img',{src:c.imgSrc, draggable:'false', style:'width:100%;height:100%;object-fit:cover;object-position:'+c.posX+'% '+c.posY+'%;display:block;pointer-events:none;user-select:none;'});
  viewport.appendChild(imgEl);

  const naturalW = c.img.naturalWidth, naturalH = c.img.naturalHeight;
  const scale = Math.max(TAM/naturalW, TAM/naturalH);
  const excessX = Math.max(0, naturalW*scale - TAM);
  const excessY = Math.max(0, naturalH*scale - TAM);

  let arrastando = false, ultimoX = 0, ultimoY = 0;
  function mover(dx, dy){
    if(excessX>0) c.posX = Math.max(0, Math.min(100, c.posX - (dx/excessX)*100));
    if(excessY>0) c.posY = Math.max(0, Math.min(100, c.posY - (dy/excessY)*100));
    imgEl.style.objectPosition = c.posX+'% '+c.posY+'%';
  }
  function onMove(e){
    if(!arrastando) return;
    const px = e.touches ? e.touches[0].clientX : e.clientX;
    const py = e.touches ? e.touches[0].clientY : e.clientY;
    mover(px-ultimoX, py-ultimoY);
    ultimoX = px; ultimoY = py;
  }
  function onUp(){
    arrastando = false;
    viewport.style.cursor = 'grab';
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('touchend', onUp);
    _cropperFotoLimpar = null;
  }
  function onDown(e){
    arrastando = true;
    viewport.style.cursor = 'grabbing';
    const px = e.touches ? e.touches[0].clientX : e.clientX;
    const py = e.touches ? e.touches[0].clientY : e.clientY;
    ultimoX = px; ultimoY = py;
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, {passive:false});
    document.addEventListener('touchend', onUp);
    _cropperFotoLimpar = onUp; // se o popup fechar por outro caminho, isso garante a limpeza
    e.preventDefault();
  }
  viewport.addEventListener('mousedown', onDown);
  viewport.addEventListener('touchstart', onDown, {passive:false});

  sheet.appendChild(viewport);
  sheet.appendChild(el('div',{class:'row'},
    el('button',{class:'btn ghost', onclick:fecharCropperFoto}, 'Cancelar'),
    el('button',{class:'btn', onclick:confirmarCropFoto}, 'Confirmar')
  ));
  overlay.appendChild(sheet);
  return overlay;
}
// PV/PM temporário também entram no log — os ajustes de PV/PM normais já registravam, mas
// esses dois passavam batido, deixando um buraco no histórico ("de onde veio esse PM temp?").
function ajustarPVTemp(f, delta){
  const atual = parseInt(f.pvtemp)||0;
  const novo = Math.max(0, atual+delta);
  if(novo!==atual) registrarLog(f, (delta>0?'+':'')+delta+' PV temporário ('+atual+' → '+novo+')');
  f.pvtemp = novo;
  salvarPerfis(); render();
}
function ajustarPMTemp(f, delta){
  const atual = parseInt(f.pmtemp)||0;
  const novo = Math.max(0, atual+delta);
  if(novo!==atual) registrarLog(f, (delta>0?'+':'')+delta+' PM temporário ('+atual+' → '+novo+')');
  f.pmtemp = novo;
  salvarPerfis(); render();
}

// Widget de PV/PM: uma caixa só. Mostra "máximo / atual". Toque na metade esquerda subtrai 1,
// na direita soma 1 (sem passar do máximo nem ficar negativo). Barrinha de progresso discreta.
// Escolhe uma faixa de cor pra barra de PV/PM conforme quanto ainda resta — dá pra "sentir" o
// perigo numa olhada rápida, sem precisar ler o número.
function faixaPerigoStat(pct){
  if(pct <= 25) return 'critico';
  if(pct <= 50) return 'atencao';
  return 'saudavel';
}
function criarStatTracker(classeExtra, label, atual, max, onAjustar){
  const pct = max>0 ? Math.max(0, Math.min(100, (atual/max)*100)) : 0;
  const faixa = faixaPerigoStat(pct);
  const chavePulso = classeExtra+'-'+label;
  const pulsando = state._statPulso===chavePulso;
  return el('div',{class:'stat-tracker '+classeExtra+(pulsando?' pulso-stat':''), onclick:(e)=>{
    const rect = e.currentTarget.getBoundingClientRect();
    const meio = rect.left + rect.width/2;
    // Pulso rápido de feedback confirmando que o toque registrou — sem isso, um toque na borda
    // que não muda visualmente o número (ex: já no máximo) parece "não fez nada".
    state._statPulso = chavePulso;
    setTimeout(()=>{ if(state._statPulso===chavePulso){ state._statPulso=null; render(); } }, 380);
    onAjustar(e.clientX < meio ? -1 : 1);
  }},
    el('div',{class:'stat-nums'}, el('span',{class:'stat-max'}, max), el('span',{class:'stat-slash'},'/'), el('span',{class:'stat-atual'}, atual)),
    el('div',{class:'stat-label'}, label),
    el('div',{class:'stat-bar'}, el('div',{class:'stat-bar-fill '+faixa, style:'width:'+pct+'%;'})),
    el('div',{class:'stat-hint'}, el('span',{},'−'), el('span',{},'+'))
  );
}

// Igual, mas sem máximo (pra PV/PM temporário): só mostra o valor atual, mínimo 0, sem teto.
function criarStatTrackerSemMax(classeExtra, label, atual, onAjustar){
  const chavePulso = classeExtra+'-'+label;
  const pulsando = state._statPulso===chavePulso;
  return el('div',{class:'stat-tracker '+classeExtra+(pulsando?' pulso-stat':''), onclick:(e)=>{
    const rect = e.currentTarget.getBoundingClientRect();
    const meio = rect.left + rect.width/2;
    state._statPulso = chavePulso;
    setTimeout(()=>{ if(state._statPulso===chavePulso){ state._statPulso=null; render(); } }, 380);
    onAjustar(e.clientX < meio ? -1 : 1);
  }},
    el('div',{class:'stat-nums'}, el('span',{class:'stat-atual'}, atual)),
    el('div',{class:'stat-label'}, label),
    el('div',{class:'stat-hint'}, el('span',{},'−'), el('span',{},'+'))
  );
}

function defesaTotal(f){
  const armaduraEquipada = f.armadura && f.armadura.equipado!==false;
  const escudoEquipado = f.escudo && f.escudo.equipado!==false;
  const armadura = armaduraEquipada ? f.armadura.def : 0;
  const escudo = escudoEquipado ? (f.escudo.def + bonusEscudoPoderes(f)) : 0;
  // Armadura pesada: você NÃO aplica Destreza na Defesa (regra do livro, pág. 157)
  const des = usaArmaduraPesada(f) ? 0 : (parseInt(f.des)||0);
  const outros = parseInt(f.defOutros)||0;
  return 10 + des + armadura + escudo + outros + bonusDefesaPoderes(f) + bonusDefesaRaca(f) + bonusCondicoesDefesa(f) + bonusDefesaTormenta(f);
}
// Deslocamento reduzido em 3m ao usar armadura pesada
// Sobrecarga: ultrapassar o limite de carga dá -5 de penalidade de armadura e -3m de deslocamento
// (regra do livro básico, pág. 146). Isso é independente e cumulativo com a penalidade de armadura pesada.
function sobrecarregado(f){ return cargaUsada(f) > limiteCarga(f); }

function deslocamentoEfetivo(f){
  const base = parseInt(f.deslocamento)||0;
  const racaObj = getRacaObj(f);
  const imuneArmaduraECarga = racaObj && racaObj.deslocamentoImune; // Anão/Suraggel: só protege de armadura/carga, não de condições
  let d = base;
  if(!imuneArmaduraECarga){
    if(usaArmaduraPesada(f)) d -= 3;
    if(sobrecarregado(f)) d -= 3;
    d = Math.max(0, d);
  }
  if(poderesAtivos(f).includes('Atlético')) d += 3;
  d = Math.floor(d * multiplicadorCondicoesDeslocamento(f));
  return Math.max(0, d);
}
function penalidadeTotal(f){
  const pa = (f.armadura && f.armadura.equipado!==false) ? f.armadura.pen : 0;
  const pe = (f.escudo && f.escudo.equipado!==false) ? f.escudo.pen : 0;
  const sobrecarga = sobrecarregado(f) ? -5 : 0;
  return pa+pe+sobrecarga+penalidadeArmaduraRaca(f);
}

// ---- Carga (peso/espaço) ----
function limiteCarga(f){
  const for_ = parseInt(f.for)||0;
  const base = for_>=0 ? 10 + 2*for_ : 10 - for_;
  const bonusCostasLargas = poderesAtivos(f).includes('Costas Largas') ? 5 : 0;
  // Inventário Organizado: "soma Inteligência no limite de carga" — poder nunca tinha sido
  // conectado em lugar nenhum (achado numa varredura geral procurando por esse mesmo padrão de
  // bônus esquecido). A outra parte do poder ("itens muito leves ocupam 1/4 de espaço") fica de
  // fora — exigiria categorizar o peso de cada item do catálogo, que o sistema não tem hoje.
  const bonusInventarioOrganizado = poderesAtivos(f).includes('Inventário Organizado') ? (parseInt(f.int)||0) : 0;
  // Mochila de aventureiro: "+2 espaços de capacidade" — só vale depois que o jogador faz o
  // "Upgrade" de verdade (botão dentro do item, na mochila) — não é automático só por ter o
  // item guardado. f.mochilaAventureiroUpgrade é uma marca NO PERSONAGEM (não por unidade de
  // mochila), então comprar/guardar várias mochilas não soma o bônus várias vezes — só existe
  // "aplicado" ou "não aplicado", uma vez só pra sempre.
  const bonusMochila = f.mochilaAventureiroUpgrade ? 2 : 0;
  // Mochileiro (poder único de origem, achado numa auditoria): "Seu limite de carga aumenta em
  // 5 espaços." Nunca tinha sido conectado.
  const bonusMochileiro = (f.origemPoder && f.origemPoder.nome==='Mochileiro') ? 5 : 0;
  return base + bonusCostasLargas + bonusInventarioOrganizado + bonusMochila + bonusMochileiro;
}
function cargaMaxima(f){ return limiteCarga(f)*2; }
function cargaUsada(f){
  let total = 0;
  (f.armas||[]).forEach(a=> total += (parseFloat(a.esp)||1));
  // Golem: armadura é "acoplada ao chassi" (pág. 32) — não conta no limite de itens que ele
  // usa, nem pra vestido nem pra carga (ela deixa de ser um "item" separado, vira parte dele).
  const racaObj = getRacaObj(f);
  const armaduraAcoplada = racaObj && racaObj.armaduraNaoContaCarga;
  if(f.armadura && !armaduraAcoplada) total += (parseFloat(f.armadura.esp)||0);
  if(f.escudo) total += (parseFloat(f.escudo.esp)||0);
  (f.equip||[]).forEach(it=>{
    const porUnidade = parseFloat(it.carga)||0;
    const qtd = parseFloat(it.qtd)||1;
    total += porUnidade * qtd;
  });
  return Math.round(total*100)/100;
}

function fichaVazia(){
  return {
    id:null, jogador:'', nome:'', foto:null, raca:'', origem:'', divindade:'', poderConcedido:null, alinhamento:'', idade:'',
    classesNiveis:[], // [{classe:'Guerreiro', nivel:1}, ...] — suporta multiclasse
    for:0,des:0,con:0,int:0,sab:0,car:0,
    pvmax:'',pvatual:'',pmmax:'',pmatual:'',pvtemp:0,pmtemp:0,
    defOutros:0, deslocamento:9, tamanho:'Médio',
    tc:0, ts:0, to:0, // moedas: Tibar de Cobre / Tibar de Prata (padrão) / Tibar de Ouro
    armadura:null, escudo:null, esotericos:[], // {nome,esp,maos,efeito,escolaFoco,equipado:true}
    armas:[], // {nome,teste,dano,critico,tipo,alcance,esp,equipado}
    magias:[],
    periciasTreinadas:[],
    poderGeral:null, poderGeralExtra:null, origemPoder:null, poderRaca:null, origemPoderCategoria:null, // {nome, sub}
    poderesClasse:[], // [{classe, nivel, nome, sub, trocaPorGeral}]
    historicoNiveis:[],
    equip:[], notas:'', habilidadesIniciais:[],
    arcanistaCaminho:null, arcanistaLinhagem:null, magiasMemorizadas:[], escolasMagia:null, panteaoEnergia:null
  };
}

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
  return base + bonusVitalidade + bonusDuroComoPedra + bonusLinhagemDraconica + bonusItens;
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
  return base + bonusVontadeFerro + bonusSangueMagico + bonusAtributoConjurador + bonusPoderMagico + bonusCoracaoHeroico + bonusEloComANatureza + bonusLinhagemRubra + bonusItens;
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
// Um ícone por classe, só pra dar identidade visual rápida na ficha — puramente estético.
const ICONE_CLASSE = {
  'Arcanista':'🔮', 'Bárbaro':'🪓', 'Bardo':'🎵', 'Bucaneiro':'🏴‍☠️', 'Caçador':'🏹',
  'Cavaleiro':'🐴', 'Clérigo':'🙏', 'Druida':'🌿', 'Guerreiro':'⚔️', 'Inventor':'⚙️',
  'Ladino':'🗡️', 'Lutador':'👊', 'Nobre':'👑', 'Paladino':'🛡️',
};
function iconeClasse(nomeClasse){ return ICONE_CLASSE[nomeClasse] || '✦'; }
function classeDisplay(f){
  if(!f.classesNiveis || f.classesNiveis.length===0) return '—';
  return f.classesNiveis.map(c=>iconeClasse(c.classe)+' '+c.classe+' '+c.nivel).join(' / ');
}
function primeiraClasse(f){ return f.classesNiveis && f.classesNiveis[0] ? f.classesNiveis[0].classe : null; }

// Progressão de dados de dano (usada por poderes como "Mestre em Arma")
const DADO_PROGRESSAO = ['1d3','1d4','1d6','1d8','1d10','1d12','2d6','2d8','2d10','2d12','2d20'];
function aumentarDado(dano){
  const idx = DADO_PROGRESSAO.indexOf(dano);
  if(idx===-1 || idx===DADO_PROGRESSAO.length-1) return null;
  return DADO_PROGRESSAO[idx+1];
}
function diminuirDado(dano){
  const idx = DADO_PROGRESSAO.indexOf(dano);
  if(idx<=0) return null;
  return DADO_PROGRESSAO[idx-1];
}
// Armas que o personagem tem "Mestre em Arma" (ou similar) aplicado, vindo dos poderes de classe
// Bônus raciais fixos por CATEGORIA de arma (não uma arma específica) — Tradição de Heredrimm
// (Anão) e Mestre do Tridente (Sereia/Tritão). Usa padrão de nome em vez de lista fixa, pra
// cobrir também armas novas do catálogo (tipo "Machadinha" de Ameaças de Arton).
function bonusRacaCategoriaArma(f, nomeArma){
  const raca = String(f.raca||'').trim();
  const nome = nomeArma||'';
  if(raca==='Anão' && /machad|martelo|marreta|picareta/i.test(nome)) return {ataque:2, dano:0};
  if(raca==='Sereia/Tritão' && /^(azagaia|lança|lança montada|tridente)$/i.test(nome.trim())) return {ataque:0, dano:2};
  return {ataque:0, dano:0};
}
function armasComMestreEmArma(f){
  return (f.poderesClasse||[]).filter(p=> p.nome==='Mestre em Arma' && p.sub).map(p=>p.sub);
}
// Acha, em QUALQUER lugar onde um poder possa estar guardado (poder geral da origem, poder geral
// extra escolhido no level up, ou poder de classe — inclusive trocado por um geral), todas as
// armas escolhidas pra um poder do tipo "escolha uma arma" (Foco em Arma, Especialização em Arma
// etc.). Retorna uma lista, porque alguns desses poderes podem ser escolhidos várias vezes pra
// armas diferentes.
function armasComPoderEscolhido(f, nomePoder){
  const armas = [];
  if(f.poderGeral && f.poderGeral.nome===nomePoder && f.poderGeral.sub) armas.push(f.poderGeral.sub);
  if(f.poderGeralExtra && f.poderGeralExtra.nome===nomePoder && f.poderGeralExtra.sub) armas.push(f.poderGeralExtra.sub);
  (f.poderesClasse||[]).forEach(p=>{ if(p.nome===nomePoder && p.sub) armas.push(p.sub); });
  return armas;
}
// Itens que só fazem sentido pro Mestre descrever/vender (estadia, mensageiro, refeição comum sem
// bônus etc.) — não aparecem no catálogo do jogador, só na ferramenta de Loja da Mesa do Mestre.
const CATEGORIAS_SO_MESTRE = ['Serviço'];
const ITENS_SO_MESTRE_NOMES = ['Refeição comum'];
function itensVisiveisJogador(){
  return ITENS_GERAIS.filter(i => !CATEGORIAS_SO_MESTRE.includes(i.cat) && !ITENS_SO_MESTRE_NOMES.includes(i.n));
}

function danoEfetivoArma(f, arma){
  let dano = arma.dano;
  const notas = [];
  // Criaturas Minúsculas usam armas reduzidas: um passo a menos de dano (regra do livro, pág. 107)
  if(f.tamanho==='Minúsculo' && !/\//.test(dano)){
    const reduzido = diminuirDado(dano);
    if(reduzido){ notas.push('Arma reduzida (tamanho Minúsculo): era '+dano); dano = reduzido; }
  }
  const temMestre = armasComMestreEmArma(f).includes(arma.nome);
  if(temMestre){
    const aumentado = aumentarDado(dano);
    if(aumentado){ notas.push('Mestre em Arma: era '+dano); dano = aumentado; }
    else notas.push('Mestre em Arma ativo (dano composto — some manualmente 1 passo)');
  }
  return {dano, nota: notas.length ? notas.join(' · ') : null};
}

// Teste de Ataque = valor da perícia Luta (corpo a corpo) ou Pontaria (à distância) — regra do livro, pág. 235
// ---- Proficiências (armas, armaduras, escudos) ----
// Toda classe é proficiente em armas simples e armaduras leves. O resto depende da classe,
// de poderes (Proficiência) ou de exceções raciais (ex: Anão com machados/martelos, Sereia com tridente).
function proficienciasDaClasse(f){
  const result = {armasMarciais:false, armasFogo:false, armadurasPesadas:false, escudos:false};
  (f.classesNiveis||[]).forEach(c=>{
    const pc = PROFICIENCIAS_CLASSE[c.classe];
    if(!pc) return;
    if(pc.armasMarciais) result.armasMarciais = true;
    if(pc.armadurasPesadas) result.armadurasPesadas = true;
    if(pc.escudos) result.escudos = true;
  });
  return result;
}
function proficienciasDePoderes(f){
  const result = {armasMarciais:false, armasFogo:false, armadurasPesadas:false, escudos:false};
  const subEscolhas = [];
  if(f.poderGeral && f.poderGeral.nome==='Proficiência') subEscolhas.push(f.poderGeral.sub);
  if(f.poderGeralExtra && f.poderGeralExtra.nome==='Proficiência') subEscolhas.push(f.poderGeralExtra.sub);
  if(f.poderRaca && f.poderRaca.nome==='Proficiência') subEscolhas.push(f.poderRaca.sub);
  (f.poderesClasse||[]).forEach(p=>{ if(p.nome==='Proficiência') subEscolhas.push(p.sub); });
  subEscolhas.forEach(sub=>{
    if(sub==='Armas marciais') result.armasMarciais = true;
    if(sub==='Armas de fogo') result.armasFogo = true;
    if(sub==='Armaduras pesadas') result.armadurasPesadas = true;
    if(sub==='Escudos') result.escudos = true;
  });
  return result;
}
function proficienciasPersonagem(f){
  const c = proficienciasDaClasse(f);
  const p = proficienciasDePoderes(f);
  return {
    armasMarciais: c.armasMarciais || p.armasMarciais,
    armasFogo: p.armasFogo,
    armadurasPesadas: c.armadurasPesadas || p.armadurasPesadas,
    escudos: c.escudos || p.escudos,
  };
}
// Resume, numa frase só, se algum item EQUIPADO (armas, armadura, escudo) está sem
// proficiência — usado no banner de aviso visível em qualquer aba da ficha.
// Lista de condições oficiais (Apêndice, pág. 394-395). Deixei de fora Inconsciente, Sangrando
// e Sobrecarregado porque esses três já são calculados automaticamente em outro lugar do app.
const CONDICOES_LISTA = [
  ['Abalado','–2 em testes de perícia. Se ficar abalado de novo, vira Apavorado.'],
  ['Agarrado','Desprevenido e imóvel, –2 em ataque, só ataca com armas leves.'],
  ['Alquebrado','Custo em PM das habilidades aumenta em +1.'],
  ['Apavorado','–5 em perícias, não se aproxima da fonte do medo.'],
  ['Atordoado','Desprevenido e não pode fazer ações.'],
  ['Caído','–5 Defesa corpo a corpo (+5 à distância), –5 em ataques corpo a corpo, deslocamento 1,5m.'],
  ['Cego','Desprevenido, lento, –5 em perícias de Força/Destreza, sem Percepção visual.'],
  ['Confuso','Comportamento aleatório (1d6 no início do turno).'],
  ['Debilitado','–5 em For/Des/Con e perícias baseadas. Se de novo, vira Inconsciente.'],
  ['Desprevenido','–5 na Defesa e em Reflexos.'],
  ['Doente','Sob efeito de uma doença.'],
  ['Em Chamas','1d6 de fogo no início do turno; apaga com ação padrão ou água.'],
  ['Enfeitiçado','Fica prestativo com a fonte; ela ganha +10 Diplomacia.'],
  ['Enjoado','Só uma ação padrão OU de movimento por rodada.'],
  ['Enredado','Lento, vulnerável, –2 em ataque.'],
  ['Envenenado','Efeito varia do veneno (perda de vida, fraco, enjoado...).'],
  ['Esmorecido','–5 em Int/Sab/Car e perícias baseadas.'],
  ['Exausto','Debilitado + lento + vulnerável. Se de novo, vira Inconsciente.'],
  ['Fascinado','–5 Percepção, só observa o que o fascinou.'],
  ['Fatigado','Fraco + vulnerável. Se de novo, vira Exausto.'],
  ['Fraco','–2 em For/Des/Con e perícias baseadas. Se de novo, vira Debilitado.'],
  ['Frustrado','–2 em Int/Sab/Car e perícias baseadas. Se de novo, vira Esmorecido.'],
  ['Imóvel','Deslocamento reduzido a 0m.'],
  ['Indefeso','Desprevenido, –10 Defesa, falha automática em Reflexos.'],
  ['Lento','Deslocamento pela metade, não corre nem investe.'],
  ['Ofuscado','–2 em ataque e Percepção.'],
  ['Paralisado','Imóvel e indefeso, só ações mentais.'],
  ['Pasmo','Não pode fazer ações.'],
  ['Petrificado','Inconsciente + redução de dano 8.'],
  ['Surdo','Sem Percepção auditiva, –5 Iniciativa, condição ruim pra magia.'],
  ['Surpreendido','Desprevenido e não pode fazer ações.'],
  ['Vulnerável','–2 na Defesa.'],
];
function condicoesAtivas(f){ return f.condicoesAtivas || []; }
function alternarCondicao(f, nome){
  if(!f.condicoesAtivas) f.condicoesAtivas = [];
  const idx = f.condicoesAtivas.indexOf(nome);
  if(idx>=0){ f.condicoesAtivas.splice(idx,1); registrarLog(f, 'Removeu a condição: '+nome); }
  else { f.condicoesAtivas.push(nome); registrarLog(f, 'Ganhou a condição: '+nome); }
  salvarPerfis(); render();
}

// Efeitos mecânicos automáticos das condições — só as que têm um número claro do livro pra
// aplicar (perícia, Defesa, deslocamento). Várias condições (Atordoado, Confuso, Paralisado,
// Enjoado, Envenenado, Agarrado, Em Chamas, Surpreendido...) são mais sobre o que você PODE ou
// NÃO PODE fazer na sua vez do que um número fixo — essas continuam só informativas, porque
// aplicar automaticamente seria adivinhar demais (o Mestre e o jogador que decidem na hora).
const CONDICOES_EFEITOS = {
  'Abalado':      { periciaTodas: -2 },
  'Apavorado':    { periciaTodas: -5 },
  'Cego':         { periciaAttr: {For:-5, Des:-5} },
  'Debilitado':   { periciaAttr: {For:-5, Des:-5, Con:-5} },
  'Desprevenido': { defesa: -5 },
  'Enredado':     { defesa: -2 },
  'Esmorecido':   { periciaAttr: {Int:-5, Sab:-5, Car:-5} },
  'Exausto':      { periciaAttr: {For:-5, Des:-5, Con:-5}, defesa: -2, deslocamentoMult: 0.5 },
  'Fascinado':    { periciaEspecifica: {'Percepção': -5} },
  'Fatigado':     { periciaAttr: {For:-2, Des:-2, Con:-2}, defesa: -2 },
  'Fraco':        { periciaAttr: {For:-2, Des:-2, Con:-2} },
  'Frustrado':    { periciaAttr: {Int:-2, Sab:-2, Car:-2} },
  'Imóvel':       { deslocamentoMult: 0 },
  'Indefeso':     { defesa: -10 },
  'Lento':        { deslocamentoMult: 0.5 },
  'Ofuscado':     { periciaEspecifica: {'Percepção': -2} },
  'Surdo':        { periciaEspecifica: {'Iniciativa': -5} },
  'Vulnerável':   { defesa: -2 },
};
function bonusCondicoesPericia(f, p){
  let total = 0;
  condicoesAtivas(f).forEach(nome=>{
    const efeito = CONDICOES_EFEITOS[nome];
    if(!efeito) return;
    if(efeito.periciaTodas) total += efeito.periciaTodas;
    if(efeito.periciaAttr && efeito.periciaAttr[p.attr]!=null) total += efeito.periciaAttr[p.attr];
    if(efeito.periciaEspecifica && efeito.periciaEspecifica[p.nome]!=null) total += efeito.periciaEspecifica[p.nome];
  });
  return total;
}
function bonusCondicoesDefesa(f){
  let total = 0;
  condicoesAtivas(f).forEach(nome=>{
    const efeito = CONDICOES_EFEITOS[nome];
    if(efeito && efeito.defesa) total += efeito.defesa;
  });
  return total;
}
// O deslocamento não soma penalidades, usa sempre o MENOR multiplicador entre as condições ativas
// (ex: Lento + Imóvel ao mesmo tempo não fica "negativo", só fica 0 mesmo, que já é o mínimo).
function multiplicadorCondicoesDeslocamento(f){
  let mult = 1;
  condicoesAtivas(f).forEach(nome=>{
    const efeito = CONDICOES_EFEITOS[nome];
    if(efeito && efeito.deslocamentoMult!=null) mult = Math.min(mult, efeito.deslocamentoMult);
  });
  return mult;
}
// ---- Uso limitado de poderes ("1x/cena", "1x/dia") ----
// Detecta pela própria descrição do poder se ele tem limite de uso, sem precisar marcar cada
// poder manualmente nos dados — só procura "por cena" ou "por dia" no texto.
function tipoLimiteUso(desc){
  if(!desc) return null;
  if(/por dia/i.test(desc)) return 'dia';
  if(/por cena/i.test(desc)) return 'cena';
  return null;
}
function poderFoiUsado(f, nomePoder){ return !!(f.poderesUsados && f.poderesUsados[nomePoder]); }
function alternarUsoPoder(f, nomePoder){
  if(!f.poderesUsados) f.poderesUsados = {};
  f.poderesUsados[nomePoder] = !f.poderesUsados[nomePoder];
  salvarPerfis(); render();
}
// Junta todos os poderes do personagem (classe, geral, raça, concedido) que têm descrição
// disponível, pra detectar o limite de uso e resetar na hora certa.
function buscarDescPoderClasse(nome){
  for(const classe in PODERES_CLASSE_COMPLETO){
    const achado = PODERES_CLASSE_COMPLETO[classe].find(p=>p.nome===nome);
    if(achado) return achado.desc;
  }
  return '';
}
function todosOsPoderesComDesc(f){
  const lista = [];
  (f.poderesClasse||[]).forEach(p=>{ lista.push({nome:p.nome, desc: buscarDescPoderClasse(p.nome)}); });
  if(f.poderGeral){ const info = PODERES_GERAIS.find(x=>x.nome===f.poderGeral.nome); lista.push({nome:f.poderGeral.nome, desc:(info&&info.desc)||''}); }
  if(f.poderGeralExtra){ const info = PODERES_GERAIS.find(x=>x.nome===f.poderGeralExtra.nome); lista.push({nome:f.poderGeralExtra.nome, desc:(info&&info.desc)||''}); }
  if(f.poderRaca){ const info = PODERES_GERAIS.find(x=>x.nome===f.poderRaca.nome); lista.push({nome:f.poderRaca.nome, desc:(info&&info.desc)||''}); }
  listaPoderesConcedidos(f).forEach(pc=>{
    if(!pc || !pc.nome) return;
    const info = (typeof PODERES_CONCEDIDOS!=='undefined') ? PODERES_CONCEDIDOS.find(x=>x.nome===pc.nome) : null;
    lista.push({nome:pc.nome, desc:(info&&info.desc)||''});
  });
  return lista;
}
function poderesComLimiteUso(f){
  return todosOsPoderesComDesc(f).map(p=> ({nome:p.nome, tipo:tipoLimiteUso(p.desc)})).filter(p=>p.tipo);
}
// Zera o "usado" de poderes de um tipo específico (chamado por Nova Cena e pelo Descanso).
function resetarUsoPoderes(f, tipos){
  if(!f.poderesUsados) return;
  poderesComLimiteUso(f).forEach(p=>{
    if(tipos.includes(p.tipo)) delete f.poderesUsados[p.nome];
  });
}

// ---- Descanso (regra da pág. 106 — não existe "curto/longo" no T20, só uma noite de sono
// com 4 níveis de qualidade, cada um recuperando um múltiplo do nível em PV e PM) ----
const QUALIDADE_DESCANSO = {
  'Ruim': 0.5,        // dormir ao relento, sem acampamento — metade do nível
  'Normal': 1,         // estalagem comum — igual ao nível
  'Confortável': 2,    // dobro do nível
  'Luxuosa': 3,        // triplo do nível
};
function aplicarDescanso(f, qualidade){
  const nivel = nivelTotal(f);
  // Estoico (poder único de origem, achado na mesma auditoria): "Sua condição de descanso é uma
  // categoria acima do padrão pela situação" — nunca tinha sido conectado. Sobe uma categoria
  // (Ruim->Normal->Confortável->Luxuosa; já na Luxuosa não sobe mais, é o teto).
  const ORDEM_QUALIDADE = ['Ruim','Normal','Confortável','Luxuosa'];
  let qualidadeEfetiva = qualidade;
  // Estoico (poder de origem) e Pajem (poder de classe do Cavaleiro, achado na mesma auditoria)
  // fazem a mesma coisa: sobem a condição de descanso uma categoria.
  const temUpgradeDescanso = (f.origemPoder && f.origemPoder.nome==='Estoico') || nomesPoderesConhecidos(f).includes('Pajem');
  if(temUpgradeDescanso){
    const idx = ORDEM_QUALIDADE.indexOf(qualidade);
    if(idx>=0 && idx<ORDEM_QUALIDADE.length-1) qualidadeEfetiva = ORDEM_QUALIDADE[idx+1];
  }
  // Golem (Criatura Artificial) — texto oficial do livro (pág. 27): "recupera PV e PM por
  // descanso em condições normais (golens não são afetados por condições boas ou ruins de
  // descanso)". Ou seja: recupera os DOIS normalmente, só que sempre no ritmo Normal (×1), não
  // importa se ficou inerte num lugar ruim ou luxuoso.
  const mult = f.raca==='Golem' ? 1 : (QUALIDADE_DESCANSO[qualidadeEfetiva] || 1);
  let recuperacao = Math.floor(nivel*mult);
  // Rato das Ruas (Goblin, achado na mesma auditoria): "recuperação de PV/PM nunca menor que
  // seu nível" — um piso mínimo, útil principalmente num descanso Ruim (que normalmente seria
  // só metade do nível). Nunca tinha sido conectado.
  if(f.raca==='Goblin') recuperacao = Math.max(recuperacao, nivel);
  // Bônus guardado de itens tipo Prato do Aventureiro/Sopa de peixe/Gorlogg Ensopado (usados
  // antes de dormir) — "por nível", então multiplica pelo nível igual a recuperação normal.
  // Golem não se beneficia de itens de alimentação (o mesmo trecho do livro deixa isso claro),
  // então ignora qualquer bônus de comida guardado.
  const pendente = f._descansoBonusPendente || {pv:0, pm:0};
  const bonusPvComida = f.raca==='Golem' ? 0 : pendente.pv * nivel;
  const bonusPmComida = f.raca==='Golem' ? 0 : pendente.pm * nivel;
  f.pvatual = Math.min(pvMaxEfetivo(f), (parseInt(f.pvatual)||0)+recuperacao+bonusPvComida);
  f.pmatual = Math.min(pmMaxEfetivo(f), (parseInt(f.pmatual)||0)+recuperacao+bonusPmComida);
  if((parseInt(f.pvatual)||0) > 0) f.estabilizado = false;
  resetarUsoPoderes(f, ['cena','dia']); // uma noite de sono também encerra a cena atual
  const tinhaBonusComida = bonusPvComida>0 || bonusPmComida>0;
  f._descansoBonusPendente = {pv:0, pm:0};
  salvarPerfis(); render();
  const subiuPorEstoico = qualidadeEfetiva !== qualidade;
  flashMsg('🌙 Descanso '+qualidade.toLowerCase()+(subiuPorEstoico?' (elevado pra '+qualidadeEfetiva.toLowerCase()+')':'')+': +'+recuperacao+' PV e +'+recuperacao+' PM'+(f.raca==='Golem'?' (Golem — sempre no ritmo normal, não importa onde/como)':' (nível '+nivel+' × '+mult+')')
    + (tinhaBonusComida ? ' + '+bonusPvComida+' PV/'+bonusPmComida+' PM de comida guardada' : '') + '.');
}
function novaCena(f){
  resetarUsoPoderes(f, ['cena']);
  salvarPerfis(); render();
  flashMsg('🎬 Nova cena — poderes de uso "por cena" já podem ser usados de novo.');
}

function itensSemProficiencia(f){
  const semProf = [];
  (f.armas||[]).forEach(a=>{ if(!proficienteComArma(f,a)) semProf.push(a.nome); });
  if(!proficienteComArmadura(f)) semProf.push(f.armadura.nome);
  if(!proficienteComEscudo(f)) semProf.push(f.escudo.nome);
  return semProf;
}
function proficienteComArma(f, arma){
  const racaObj = getRacaObj(f);
  if(racaObj && racaObj.armasComoSimples && racaObj.armasComoSimples.includes(arma.n||arma.nome)) return true;
  if(arma.cat==='Simples') return true;
  const prof = proficienciasPersonagem(f);
  if(arma.cat==='Marcial') return prof.armasMarciais;
  if(arma.cat==='Arma de Fogo') return prof.armasFogo;
  return false; // Exótica: nunca tem proficiência automática, só via poder específico (não modelado)
}
function proficienteComArmadura(f){
  if(!f.armadura || f.armadura.equipado===false) return true;
  if(f.armadura.cat!=='Pesada') return true; // leve é proficiência automática de todos
  return proficienciasPersonagem(f).armadurasPesadas;
}
function proficienteComEscudo(f){
  if(!f.escudo || f.escudo.equipado===false) return true;
  return proficienciasPersonagem(f).escudos;
}
// Penalidade adicional quando veste armadura/escudo sem proficiência: a penalidade da peça
// passa a valer em TODAS as perícias de Força e Destreza, não só nas 3 de sempre (regra do livro, pág. 157)
function penalidadeNaoProficienciaArmadura(f){
  let total = 0;
  if(f.armadura && f.armadura.equipado!==false && !proficienteComArmadura(f)) total += f.armadura.pen;
  if(f.escudo && f.escudo.equipado!==false && !proficienteComEscudo(f)) total += f.escudo.pen;
  return total;
}

// Armas alongadas (regra do livro, pág. 148-155) — dobram o alcance natural, mas não deixam
// atacar quem está adjacente (isso fica só informativo, não é bloqueado no app).
const ARMAS_ALONGADAS = new Set(['Alabarda', 'Lança montada', 'Pique']);
function testeAtaqueArma(f, arma){
  const nomePericia = arma.pericia || (arma.distancia ? 'Pontaria' : 'Luta');
  const periciaInfo = PERICIAS.find(p=>p.nome===nomePericia);
  if(!periciaInfo) return 0;
  const base = periciaValor(f, periciaInfo);
  const bonusMelhoria = arma.bonusTesteExtra||0;
  const nomes = poderesAtivos(f);
  const bonusUmaArma = (nomes.includes('Estilo de Uma Arma') && usandoUmaArmaSoNaMao(f)) ? 2 : 0;
  const nomeArma = arma.nome || arma.n;
  const bonusFocoArma = armasComPoderEscolhido(f, 'Foco em Arma').includes(nomeArma) ? 2 : 0;
  const bonusRaca = bonusRacaCategoriaArma(f, nomeArma).ataque;
  const bonusArmaLonga = (nomes.includes('Estilo de Arma Longa') && ARMAS_ALONGADAS.has(nomeArma)) ? 2 : 0;
  return (proficienteComArma(f, arma) ? base : base - 5) + bonusMelhoria + bonusUmaArma + bonusFocoArma + bonusRaca + bonusArmaLonga;
}
// Bônus de dano = Força somada em armas corpo a corpo e de arremesso (não em armas de disparo,
// a menos que tenha um poder que mude isso, como Acuidade com Arma ou Estilo de Disparo/Arremesso)
function bonusDanoArma(f, arma){
  const nomes = poderesAtivos(f);
  const acuidade = nomes.includes('Acuidade com Arma'); // usa Destreza em vez de Força (armas leves/arremesso)
  const estiloDisparo = nomes.includes('Estilo de Disparo'); // soma Destreza no dano de disparo
  const estiloArremessoPotente = nomes.includes('Arremesso Potente'); // soma Força no dano de arremesso
  const estiloArremesso = nomes.includes('Estilo de Arremesso'); // +2 no dano de arremesso
  const estiloDuasMaos = nomes.includes('Estilo de Duas Mãos'); // +5 no dano usando arma corpo a corpo com as duas mãos
  const isArremesso = arma.distancia && (arma.alcance==='Curto' || arma.alcance==='Médio') && !['Arco curto','Arco longo','Besta leve','Besta pesada','Pistola','Mosquete','Rede'].includes(arma.n||arma.nome);
  const bonusMelhoria = arma.bonusDanoExtra||0;
  const bonusDuasMaos = (estiloDuasMaos && !arma.distancia && arma.maos===2) ? 5 : 0;
  const bonusArremesso = (estiloArremesso && isArremesso) ? 2 : 0;
  const nomeArma = arma.nome || arma.n;
  const bonusEspecializacao = armasComPoderEscolhido(f, 'Especialização em Arma').includes(nomeArma) ? 2 : 0;
  const bonusRacaDano = bonusRacaCategoriaArma(f, nomeArma).dano;

  let bonusAtributo;
  if(!arma.distancia){
    // corpo a corpo: soma For, ou Des se tiver Acuidade com Arma
    bonusAtributo = acuidade ? (parseInt(f.des)||0) : (parseInt(f.for)||0);
  } else if(isArremesso){
    bonusAtributo = estiloArremessoPotente ? (parseInt(f.for)||0) : (acuidade ? (parseInt(f.des)||0) : 0);
  } else {
    // disparo (arco/besta/arma de fogo): não soma atributo, exceto com Estilo de Disparo
    bonusAtributo = estiloDisparo ? (parseInt(f.des)||0) : 0;
  }
  return bonusAtributo + bonusMelhoria + bonusDuasMaos + bonusArremesso + bonusEspecializacao + bonusRacaDano;
}

// ---- Itens Vestidos (limite de 4 simultâneos com benefício ativo — regra do livro, pág. 146) ----
// Armadura conta como 1 item vestido, exceto para raças com corpo acoplado (Golem).
function armaduraContaComoVestido(f){
  const racaObj = getRacaObj(f);
  const imune = racaObj && racaObj.armaduraNaoContaVestido;
  return !!(f.armadura && f.armadura.equipado!==false && !imune);
}
// Tira o sufixo de "item recebido" do nome, pra conseguir achar o item no catálogo. Existem
// DOIS formatos: "(recebido do Mestre)" e "(recebido de Fulano)" (quando é um jogador que
// manda pra outro). O código antigo só limpava o primeiro, então item enviado por um jogador
// chegava com nome que não batia com nada do catálogo e PERDIA as opções (upgrade da Mochila
// de Aventureiro, descrição, munição, catalisador). Centralizado aqui pra não ter esse tipo de
// divergência de novo.
function nomeBaseItem(nomeCompleto){
  return String(nomeCompleto||'').replace(/\s*\(recebido (do Mestre|de [^)]*)\)/g, '');
}
// Lista, em ordem, de todas as "fontes" de item vestido que o personagem tem marcadas —
// pode passar de 4; quem consome essa lista decide o que fica ativo (os 4 primeiros).
function itensVestidosTodos(f){
  const fontes = [];
  if(armaduraContaComoVestido(f)) fontes.push({tipo:'armadura', nome:f.armadura.nome, catalogo:null});
  (f.equip||[]).forEach(row=>{
    if(row.tipo==='geral' && row.vestido){
      const item = ITENS_GERAIS.find(i=>i.n===row.item);
      fontes.push({tipo:'geral', nome:row.item, catalogo:item||null, row});
    }
  });
  return fontes;
}
function limiteItensVestidos(f){ return poderesAtivos(f).includes('Costas Largas') ? 5 : 4; }
function itensVestidosAtivos(f){ return itensVestidosTodos(f).slice(0,limiteItensVestidos(f)); }
function itensVestidosExcedentes(f){ return itensVestidosTodos(f).slice(limiteItensVestidos(f)); }
function slotsVestidosUsados(f){ return itensVestidosTodos(f).length; }
// Bônus de perícia vindo de itens vestidos ativos (só os 4 primeiros contam; regra do livro)
function bonusPericiaDeItensVestidos(f, periciaNome){
  let total = 0;
  itensVestidosAtivos(f).forEach(fonte=>{
    const bp = fonte.catalogo && fonte.catalogo.bonusPericia;
    if(bp){
      // Aceita tanto {nome,valor} (a maioria dos itens, um bônus só) quanto uma lista de vários
      // — precisou generalizar pro Farrapos de ermitão (achado numa auditoria), que tem +2 numa
      // perícia E –2 em outra ao mesmo tempo, coisa que o formato de objeto único não suportava.
      const lista = Array.isArray(bp) ? bp : [bp];
      lista.forEach(item=>{ if(item.nome===periciaNome) total += item.valor; });
    }
    // Efeito que o próprio jogador definiu num item personalizado (fora do catálogo) — mesma
    // ideia do bônus de item de catálogo acima, só que guardado direto na linha do item em vez
    // de numa definição fixa em ITENS_GERAIS.
    const ec = fonte.row && fonte.row.efeitoCustom;
    if(ec && ec.tipo==='bonusPericia' && ec.pericia===periciaNome){
      total += parseInt(ec.valor)||0;
    }
  });
  return total;
}
// Mesma ideia do bônus de perícia acima, mas pra PM/PV — usado pelo Chapéu arcano (e qualquer
// item parecido no futuro). "condicao" é opcional; hoje só existe 'arcanista' (checa se o
// personagem tem qualquer Caminho do Arcanista escolhido), mas fica fácil de estender.
function condicaoBonusRecursoCumprida(f, condicao){
  if(!condicao) return true;
  if(condicao==='arcanista') return !!f.arcanistaCaminho;
  return true; // condição desconhecida — melhor aplicar o bônus do que travar ele por engano
}
function bonusRecursoDeItensVestidos(f, recurso){
  let total = 0;
  itensVestidosAtivos(f).forEach(fonte=>{
    const br = fonte.catalogo && fonte.catalogo.bonusRecurso;
    if(br && br.recurso===recurso && condicaoBonusRecursoCumprida(f, br.condicao)){
      total += br.valor;
    }
    const ec = fonte.row && fonte.row.efeitoCustom;
    if(ec && ec.tipo==='bonus'+(recurso==='pm'?'PM':'PV')){
      total += parseInt(ec.valor)||0;
    }
  });
  return total;
}

// ---- Verificador de pré-requisitos de poder ----
// O texto de pré-requisito é livre (copiado do livro), então a checagem só é "confiável" quando
// reconhece TODAS as cláusulas do texto num padrão conhecido — senão prefere não bloquear nada
// (melhor deixar escolher um poder que na verdade cumpre, do que travar um que a pessoa merece).
const NOMES_CLASSES_T20 = ['Arcanista','Bárbaro','Bardo','Bucaneiro','Caçador','Cavaleiro','Clérigo','Druida','Guerreiro','Inventor','Ladino','Lutador','Nobre','Paladino'];
function avaliarSubClausulaPrereq(f, texto){
  texto = texto.trim();
  if(!texto) return {ok:true, reconhecido:true};
  // "Nº nível de [classe]"
  let m = texto.match(/^(\d+)º nível de ([a-zà-ú]+)/i);
  if(m){
    const nivelExigido = parseInt(m[1]);
    const nomeAlvo = m[2].toLowerCase();
    const entrada = (f.classesNiveis||[]).find(c=>c.classe.toLowerCase()===nomeAlvo);
    return {ok:(entrada?entrada.nivel:0) >= nivelExigido, reconhecido:true};
  }
  // Atributo: "For 1", "Int 2"...
  m = texto.match(/^(For|Des|Con|Int|Sab|Car)\s+(-?\d+)$/i);
  if(m){
    const atual = parseInt(f[m[1].toLowerCase()])||0;
    return {ok: atual >= parseInt(m[2]), reconhecido:true};
  }
  // "treinado em X" ou "treinado em X e Y"
  m = texto.match(/^treinado em (.+)/i);
  if(m){
    const nomes = m[1].split(/ e /i).map(s=>s.trim()).filter(Boolean);
    const treinadas = periciasTreinadasComDivindade(f);
    // Se o pré-requisito pedir uma especialidade EXATA (ex: "Ofício (armeiro)"), precisa bater
    // certinho — não basta ter QUALQUER Ofício. Se pedir só o nome base (ex: "Ofício" sem
    // especificar qual), qualquer especialidade treinada já serve.
    return {ok: nomes.every(n=> n.includes('(') ? treinadas.has(n) : treinadas.has(nomeBasePericia(n))), reconhecido:true};
  }
  // Nome de classe isolado (precisa ter nível nela)
  const classeBatida = NOMES_CLASSES_T20.find(c=>c.toLowerCase()===texto.toLowerCase());
  if(classeBatida){
    return {ok:(f.classesNiveis||[]).some(c=>c.classe===classeBatida), reconhecido:true};
  }
  // Nome de poder específico já conhecido
  if(nomesPoderesConhecidos(f).some(n=> n.toLowerCase()===texto.toLowerCase())){
    return {ok:true, reconhecido:true};
  }
  // Pode ser um poder válido que a pessoa só ainda não tem — reconhecido, mas falha
  const eUmPoderValido = PODERES_GERAIS.some(p=>p.nome.toLowerCase()===texto.toLowerCase())
    || Object.values(PODERES_CLASSE_COMPLETO).some(lista=>lista.some(p=>p.nome.toLowerCase()===texto.toLowerCase()));
  if(eUmPoderValido) return {ok:false, reconhecido:true};
  return {ok:true, reconhecido:false};
}
function avaliarClausulaPrereq(f, clausula){
  clausula = clausula.trim();
  if(clausula.includes(' ou ')){
    const alternativas = clausula.split(' ou ').map(s=>avaliarSubClausulaPrereq(f,s));
    return {ok: alternativas.some(a=>a.ok), reconhecido: alternativas.every(a=>a.reconhecido)};
  }
  return avaliarSubClausulaPrereq(f, clausula);
}
// Retorna {confiavel, cumpre} — só use "cumpre" pra bloquear seleção se confiavel===true.
function avaliarPrerequisito(f, prereqTexto){
  if(!prereqTexto) return {confiavel:true, cumpre:true};
  const textoLimpo = prereqTexto.replace(/^e\s+/i,'').replace(/\.\s*$/,'').trim();
  const partes = textoLimpo.split(',').map(s=>s.trim()).filter(Boolean);
  const resultados = partes.map(p=>avaliarClausulaPrereq(f,p));
  return {
    confiavel: resultados.every(r=>r.reconhecido),
    cumpre: resultados.every(r=>r.ok),
  };
}

function nomesPoderesConhecidos(f){
  const nomes = [];
  if(f.poderGeral) nomes.push(f.poderGeral.sub || f.poderGeral.nome);
  if(f.poderGeralExtra) nomes.push(f.poderGeralExtra.sub || f.poderGeralExtra.nome);
  if(f.poderRaca) nomes.push(f.poderRaca.sub || f.poderRaca.nome);
  if(f.origemPoder) nomes.push(f.origemPoder.nome); // poder único da origem — não é poder geral, mas conta como conhecido
  (f.poderesClasse||[]).forEach(p=>{ if(p.nome) nomes.push(p.sub || p.nome); });
  (f.deformidadeEscolhas||[]).forEach(esc=>{ if(esc.tipo==='tormenta') nomes.push(esc.valor); });
  return nomes.filter(Boolean);
}

// Nomes de poderes gerais ativos no personagem, para efeitos mecânicos (Defesa, perícias, etc.)
// Não inclui o poder único de origem, pois esses têm efeitos totalmente específicos tratados à parte.
function poderesAtivos(f){
  const nomes = [];
  if(f.poderGeral) nomes.push(f.poderGeral.sub || f.poderGeral.nome);
  if(f.poderGeralExtra) nomes.push(f.poderGeralExtra.sub || f.poderGeralExtra.nome);
  if(f.poderRaca) nomes.push(f.poderRaca.sub || f.poderRaca.nome);
  (f.poderesClasse||[]).forEach(p=>{ if(!p.trocaPorGeral) return; nomes.push(p.sub || p.nome); });
  (f.poderesClasse||[]).forEach(p=>{ if(p.trocaPorGeral) return; if(p.nome) nomes.push(p.nome); });
  (f.deformidadeEscolhas||[]).forEach(esc=>{ if(esc.tipo==='tormenta') nomes.push(esc.valor); });
  return nomes.filter(Boolean);
}

// ============ ESTADO GLOBAL ============
window.state = {
  screen:'perfis', // 'perfis' | 'wizard' | 'ficha'
  perfis:[],
  gerenciandoPerfis:false,
  perfilAtualId:null,
  tab:'personagem',
  magiaFiltro:{ trad:'arcana', circulo:'1', busca:'', escola:'todas' },
  guia:{ classe:'Guerreiro', nivel:1 },
  itensFiltro:{ tipo:'armas', busca:'', categoria:'todas' },
  addMsg:'',
  wizard: null
};

function fichaAtual(){
  return state.perfis.find(p=>p.id===state.perfilAtualId);
}

// ============ PERSISTÊNCIA ============
function aplicarMigracoesPerfis(){
  // Migração: fichas criadas antes do painel "Habilidades Iniciais" reconstroem a lista a partir da raça
  state.perfis.forEach(f=>{
    if(!f.habilidadesIniciais){
      const racaObj = getRacaObj(f);
      f.habilidadesIniciais = (racaObj ? racaObj.poderes.map(([nome,desc])=>({fonte:'Raça: '+f.raca, nome, desc})) : [])
        .concat((f.classesNiveis||[]).flatMap(c=> (CLASSES[c.classe] && CLASSES[c.classe].habilidadesClasse) ? CLASSES[c.classe].habilidadesClasse.map(([nome,desc])=>({fonte:'Classe: '+c.classe, nome, desc})) : []));
    }
  });
}
async function carregarPerfis(){
  state.perfis = await carregarPerfisArmazenamento();
  aplicarMigracoesPerfis();
  state._ultimoEstadoSalvo = {};
  (state.perfis||[]).forEach(p=>{ state._ultimoEstadoSalvo[p.id] = JSON.parse(JSON.stringify(p)); });
}
// Fila de salvamento — mesma ideia já usada do lado do Mestre (sincronizarGradeCompartilhada):
// nunca deixa 2 salvamentos rodando ao mesmo tempo. Aqui o risco é menor (state.perfis nunca é
// TROCADO por outro array, só editado por dentro — ver iniciarAtualizacaoAutomaticaJogador), mas
// como o padrão já provou valer a pena duas vezes achando corrida de verdade, vale reforçar aqui
// também por segurança, já que é barato.
let _perfisSalvando = false;
let _perfisSalvarPendente = false;
async function salvarPerfis(){
  if(_perfisSalvando){ _perfisSalvarPendente = true; return; }
  _perfisSalvando = true;
  try{
    await salvarPerfisInterno();
  } finally {
    _perfisSalvando = false;
    if(_perfisSalvarPendente){ _perfisSalvarPendente = false; salvarPerfis(); }
  }
}
async function salvarPerfisInterno(){
  // Antes de sobrescrever a planilha com a cópia local, busca rapidinho se o servidor tem algum
  // presente (item/dinheiro do Mestre) que ainda não vimos — sem isso, salvar logo depois de
  // receber algo (antes do jogador ter atualizado a página) apagava o presente, porque a cópia
  // local (sem ele) ia por cima da versão do servidor (com ele).
  await mesclarPresentesDoServidor();

  // "Desfazer" precisa saber qual era o estado de CADA personagem antes deste save. Guardamos
  // sempre uma cópia do "último estado salvo conhecido" (state._ultimoEstadoSalvo); antes de
  // sobrescrever, ela vira o alvo de desfazer (state._paraDesfazer) — e só depois é atualizada
  // pro que acabamos de salvar, pronta pra servir de referência da PRÓXIMA mudança.
  if(!state._ultimoEstadoSalvo) state._ultimoEstadoSalvo = {};
  if(!state._paraDesfazer) state._paraDesfazer = {};
  (state.perfis||[]).forEach(p=>{
    if(state._ultimoEstadoSalvo[p.id]){
      state._paraDesfazer[p.id] = state._ultimoEstadoSalvo[p.id];
    }
  });

  await salvarPerfisArmazenamento(state.perfis);

  (state.perfis||[]).forEach(p=>{
    state._ultimoEstadoSalvo[p.id] = JSON.parse(JSON.stringify(p));
  });
  // Depois de salvar, local e servidor ficam em sincronia — atualiza o "retrato" de moeda
  // conhecido, senão o próximo ciclo de atualização automática compara contra um valor antigo
  // e acha, por engano, que o Mestre acabou de mandar dinheiro (quando foi o próprio jogador
  // que editou e salvou).
  if(!state._ultimoServidorMoeda) state._ultimoServidorMoeda = {};
  (state.perfis||[]).forEach(p=>{
    state._ultimoServidorMoeda[p.id] = {ts:p.ts, tc:p.tc, to:p.to};
  });
}

// ---- Notificação de "o Mestre te mandou algo" ----
// A cada ~12s, se o jogador estiver com a ficha aberta, busca os dados de novo e compara com o
// que já tinha — se aparecer um item novo marcado "(recebido do Mestre)" ou o dinheiro aumentar,
// avisa na hora. Só troca esses campos específicos (item/dinheiro), não mexe em mais nada da
// ficha, pra nunca sobrescrever uma edição que o jogador esteja fazendo em outro campo.
// Busca o que o servidor tem AGORA e mescla só o que for presente de verdade (item marcado
// "recebido do Mestre" que ainda não temos, ou dinheiro que aumentou) — NUNCA troca a lista
// inteira, só acrescenta/soma por cima do que já existe localmente. Usada tanto pelo polling de
// 12s quanto (mais importante) bem antes de QUALQUER salvamento manual — sem isso, salvar logo
// depois de receber um presente (antes do polling ter tido a chance de buscar) sobrescrevia o
// servidor com a cópia local antiga, apagando o que acabou de chegar.
async function mesclarPresentesDoServidor(){
  let listaNova;
  try{ listaNova = await carregarPerfisArmazenamento(); }catch(e){ return false; }
  let mudou = false;
  (state.perfis||[]).forEach(fAtual=>{
    const fNovo = listaNova.find(p=>p.id===fAtual.id);
    if(!fNovo) return;
    const equipAntigo = fAtual.equip || [];
    const equipNovo = fNovo.equip || [];
    if(equipNovo.length > equipAntigo.length){
      const nomesAntigos = equipAntigo.map(e=>e.item);
      // Reconhece os DOIS formatos de presente ("do Mestre" e "de Fulano") — antes só pegava o
      // do Mestre, então item enviado por um jogador não era detectado como presente novo e
      // podia se perder numa sincronização.
      const novosItens = equipNovo.filter(e=> /\(recebido (do Mestre|de [^)]*)\)/.test(e.item) && !nomesAntigos.includes(e.item));
      if(novosItens.length>0){
        novosItens.forEach(it=>{
          notificarComSom('🎁 '+fAtual.nome+' recebeu: '+nomeBaseItem(it.item)+'!');
          fAtual.equip.push(it);
        });
        mudou = true;
      }
    }
    if(!state._ultimoServidorMoeda) state._ultimoServidorMoeda = {};
    if(!state._ultimoServidorMoeda[fAtual.id]) state._ultimoServidorMoeda[fAtual.id] = {ts:fNovo.ts, tc:fNovo.tc, to:fNovo.to};
    const snapshot = state._ultimoServidorMoeda[fAtual.id];
    ['ts','tc','to'].forEach(campo=>{
      const servidorAntes = parseInt(snapshot[campo])||0, servidorDepois = parseInt(fNovo[campo])||0;
      if(servidorDepois > servidorAntes){
        const delta = servidorDepois - servidorAntes;
        notificarComSom('💰 '+fAtual.nome+' recebeu +'+delta+' '+(campo==='ts'?'T$':campo==='tc'?'TC':'TO')+'!');
        fAtual[campo] = (parseInt(fAtual[campo])||0) + delta;
        mudou = true;
      }
      snapshot[campo] = servidorDepois;
    });
  });
  return mudou;
}
let _intervalAtualizacaoJogador = null;
function iniciarAtualizacaoAutomaticaJogador(){
  pararAtualizacaoAutomaticaJogador();
  _intervalAtualizacaoJogador = setInterval(async ()=>{
    if(state.screen !== 'ficha' || usandoStorageDoClaude()){ return; }
    const digitando = document.activeElement && ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName);
    if(digitando || state._arrastandoPersonagemPericias) return;
    const mudou = await mesclarPresentesDoServidor();
    if(mudou){ salvarNoLocalStorage(state.perfis); render(); }
  }, 12000);
}
function pararAtualizacaoAutomaticaJogador(){
  if(_intervalAtualizacaoJogador){ clearInterval(_intervalAtualizacaoJogador); _intervalAtualizacaoJogador = null; }
}
// Personagens de TODOS os jogadores, só pras ferramentas do Mestre (iniciativa, grupo, tesouro).
async function carregarPerfisTodosParaMestre(){
  state.perfisTodos = await carregarTodosPersonagensMestre();
}

// ---- Modo Mesa (alto contraste) ----
const CHAVE_TEMA = 'painel_aventureiro_tema';
function aplicarTemaSalvo(){
  try{
    if(localStorage.getItem(CHAVE_TEMA) === 'mesa') document.documentElement.dataset.tema = 'mesa';
  }catch(e){}
}
function alternarTemaMesa(){
  const ativo = document.documentElement.dataset.tema === 'mesa';
  if(ativo){ delete document.documentElement.dataset.tema; }
  else{ document.documentElement.dataset.tema = 'mesa'; }
  try{ localStorage.setItem(CHAVE_TEMA, ativo ? 'padrao' : 'mesa'); }catch(e){}
  render();
}
function botaoTema(){
  const ativo = document.documentElement.dataset.tema === 'mesa';
  return el('button',{class:'btn ghost', style:'width:auto;flex-shrink:0;padding:6px 10px;background:transparent;border-color:#f4efe2;color:#f4efe2;', onclick:alternarTemaMesa, title:'Alternar Modo Mesa (alto contraste)'}, ativo?'☀️':'🌓');
}

async function iniciar(){
  // Link compartilhado da Grade de Combate — pula TODO o fluxo normal de login, é uma tela
  // só-leitura própria. Detecta pela URL (?vergrade=CODIGO) antes de qualquer outra coisa.
  const paramsUrl = new URLSearchParams(window.location.search);
  const codigoVerGrade = paramsUrl.get('vergrade');
  if(codigoVerGrade){
    state.screen = 'vergrade';
    state._verGradeCodigo = codigoVerGrade;
    aplicarTemaSalvo();
    await atualizarVisualizacaoGrade();
    setInterval(atualizarVisualizacaoGrade, 2000);
    return;
  }
  aplicarTemaSalvo();
  if(precisaCodigoJogador() && !obterCodigoJogador()){
    render(); // mostra a tela de código sem tentar carregar nada ainda
    return;
  }
  if(precisaCodigoJogador() && ehCodigoMestre(obterCodigoJogador())){
    // Reabrindo o app já logado como Mestre (código salvo de uma visita anterior) — vai
    // direto pra tela de ferramentas do mestre, sem passar pela tela de "meus personagens".
    state.screen = 'mestre';
    state.mestreCategoria = 'combate'; state.mestreTab = 'combate';
    state._carregandoInicial = true;
    render();
    await carregarPerfisTodosParaMestre();
    carregarDadosMestreDoServidor();
    state._carregandoInicial = false;
    render();
    iniciarAtualizacaoAutomaticaMestre();
    return;
  }
  // Mostra os personagens salvos localmente (se tiver uma cópia de uma visita anterior) na hora,
  // sem esperar a planilha do Google responder — o Apps Script às vezes demora pra "acordar"
  // quando fica um tempo sem uso, e isso não deveria deixar a tela parecendo travada/em branco.
  const temCacheLocal = !usandoStorageDoClaude() && typeof carregarDoLocalStorage==='function' && carregarDoLocalStorage().length>0;
  if(temCacheLocal){
    state.perfis = carregarDoLocalStorage();
    aplicarMigracoesPerfis();
    state._carregandoAtualizacao = true;
  } else {
    state._carregandoInicial = true;
  }
  render();

  // Se demorar demais, avisa que o Google está sendo lento (em vez de deixar parecendo travado)
  let avisouDemora = false;
  const timeoutAviso = setTimeout(()=>{
    if(state._carregandoInicial || state._carregandoAtualizacao){
      avisouDemora = true;
      state._carregandoDemorando = true;
      render();
    }
  }, 6000);

  await carregarPerfis();
  clearTimeout(timeoutAviso);
  state._carregandoInicial = false;
  state._carregandoAtualizacao = false;
  state._carregandoDemorando = false;
  render();
}

// ---- Tela de entrada de código de jogador (só aparece quando há planilha configurada) ----
function renderEntradaCodigoScreen(){
  const wrap = el('div',{class:'perfis-screen'});
  wrap.appendChild(el('div',{class:'perfis-title'},'Painel do Aventureiro'));
  const painel = el('div',{class:'panel faixa', style:'max-width:380px;width:100%;'});
  painel.appendChild(el('h2',{},'Código de acesso'));
  painel.appendChild(el('div',{class:'tip'},
    el('b',{},'O que é isso?'),
    'Seu código liga seus personagens a você — use o mesmo código em qualquer aparelho pra continuar de onde parou.'
  ));
  if(state._codigoInput==null) state._codigoInput = '';
  painel.appendChild(el('input',{type:'text', placeholder:'ex: LOBO-4821 ou uma frase sua', value:state._codigoInput, oninput:(e)=>{state._codigoInput=e.target.value;}}));
  if(state._codigoErro) painel.appendChild(el('div',{class:'tip', style:'color:var(--red-bright);'}, state._codigoErro));
  painel.appendChild(el('button',{class:'btn', onclick:confirmarCodigoJogador}, state._carregandoCodigo?'Entrando...':'Entrar'));
  painel.appendChild(el('button',{class:'btn ghost', style:'margin-top:8px;', onclick:()=>{ state._codigoInput = sugerirCodigoJogador(); render(); }}, '✨ Sugerir um código'));
  wrap.appendChild(painel);
  return wrap;
}

async function confirmarCodigoJogador(){
  const codigo = (state._codigoInput||'').trim();
  if(!codigo){ state._codigoErro = 'Digite um código pra continuar.'; render(); return; }
  state._codigoErro = null;
  definirCodigoJogador(codigo);
  if(ehCodigoMestre(codigo)){
    state.screen = 'mestre';
    state.mestreCategoria = 'combate'; state.mestreTab = 'combate';
    state._carregandoInicial = true;
    render();
    await carregarPerfisTodosParaMestre();
    carregarDadosMestreDoServidor();
    state._carregandoInicial = false;
    render();
    iniciarAtualizacaoAutomaticaMestre();
    return;
  }
  state._carregandoCodigo = true;
  state.screen = 'perfis';
  state._carregandoInicial = true;
  render();
  await carregarPerfis();
  state._carregandoCodigo = false;
  state._carregandoInicial = false;
  render();
}

// Sai do código atual — volta pra tela de entrada (não apaga nada da planilha, só "desloga" o aparelho)
function sairDoCodigoJogador(){
  pararAtualizacaoAutomaticaMestre();
  limparCodigoJogador();
  state.perfis = [];
  state.perfilAtualId = null;
  state.screen = 'perfis';
  state._codigoInput = '';
  render();
}

// Debounce genérico: adia a chamada até parar de digitar por `espera`ms — evita
// reconstruir a tela inteira a cada tecla em campos de busca sobre listas grandes.
function debounce(fn, espera){
  let timer = null;
  return function(...args){
    clearTimeout(timer);
    timer = setTimeout(()=>fn.apply(this,args), espera||180);
  };
}
const renderDebounced = debounce(()=>render(), 150);

// ============ RENDER RAIZ ============
function render(){
  const root = document.getElementById('root');
  const ae = document.activeElement;
  let focoId = null, selStart = null, selEnd = null;
  if(ae && ae.id && (ae.tagName==='INPUT' || ae.tagName==='TEXTAREA')){
    focoId = ae.id;
    selStart = ae.selectionStart;
    selEnd = ae.selectionEnd;
  }
  // Guarda a posição de rolagem (da janela, e a de dentro de um popup, se houver um aberto) —
  // sem isso, toda vez que algo dentro de um popup muda (ex: escolher um item no Level Up),
  // o render reconstrói tudo do zero e a rolagem volta pro topo, o que é bem incômodo.
  const scrollJanela = window.scrollY;
  const sheetAberto = document.querySelector('.menu-sheet');
  const scrollSheet = sheetAberto ? sheetAberto.scrollTop : null;
  // Mesma ideia, só que genérica: qualquer elemento marcado com data-preservar-scroll (listas
  // com rolagem própria, tipo a fileira de combatentes na Grade ou a timeline de iniciativa)
  // tem a posição guardada aqui, pra não "pular" de volta pro início toda vez que a tela
  // atualiza sozinha (o polling da Grade a cada 2s, por exemplo).
  const scrollsMarcados = {};
  document.querySelectorAll('[data-preservar-scroll]').forEach(el=>{
    const chave = el.getAttribute('data-preservar-scroll');
    scrollsMarcados[chave] = {left: el.scrollLeft, top: el.scrollTop};
  });

  root.innerHTML = '';
  try{
    if(state.screen==='vergrade') root.appendChild(renderVisualizacaoGrade());
    else if(precisaCodigoJogador() && !obterCodigoJogador()){
      root.appendChild(renderEntradaCodigoScreen());
    }
    else if(state.screen==='perfis') root.appendChild(renderPerfisScreen());
    else if(state.screen==='wizard') root.appendChild(renderWizardScreen());
    else if(state.screen==='ficha') root.appendChild(renderFichaScreen());
    else if(state.screen==='mestre') root.appendChild(renderMestreScreen());
  }catch(erro){
    // Nunca deixa a tela em branco silenciosamente — sem isso, qualquer erro no meio da
    // montagem (ex: um dado incompleto chegando de uma sincronização) apagava a tela inteira
    // sem explicação nenhuma, e a única saída era recarregar a página sem saber por quê.
    console.error('Erro ao montar a tela:', erro);
    root.innerHTML = '';
    root.appendChild(el('div',{style:'padding:24px;text-align:center;'},
      el('div',{style:'font-size:2rem;'}, '⚠️'),
      el('h2',{style:'margin-top:10px;'}, 'Deu um erro ao montar essa tela'),
      el('div',{class:'meta', style:'margin:10px 0;'}, String(erro && erro.message || erro)),
      el('button',{class:'btn', onclick:()=>{ window.location.reload(); }}, 'Recarregar a página'),
      el('button',{class:'btn ghost', style:'margin-top:8px;', onclick:()=>{ state.screen='perfis'; state.mestreTab=null; render(); }}, 'Voltar pros Perfis')
    ));
  }
  if(focoId){
    const restaurado = document.getElementById(focoId);
    if(restaurado){
      restaurado.focus();
      if(selStart!=null && restaurado.setSelectionRange){
        try{ restaurado.setSelectionRange(selStart, selEnd); }catch(e){}
      }
    }
  }
  window.scrollTo(0, scrollJanela);
  if(scrollSheet!=null){
    const sheetNovo = document.querySelector('.menu-sheet');
    if(sheetNovo) sheetNovo.scrollTop = scrollSheet;
  }
  function restaurarScrollsMarcados(){
    document.querySelectorAll('[data-preservar-scroll]').forEach(el=>{
      const chave = el.getAttribute('data-preservar-scroll');
      const guardado = scrollsMarcados[chave];
      if(guardado){ el.scrollLeft = guardado.left; el.scrollTop = guardado.top; }
    });
  }
  restaurarScrollsMarcados();
  // O navegador às vezes ajusta a rolagem sozinho de forma assíncrona (ex: ao focar um elemento
  // ou reposicionar depois de um clique), o que pode desfazer a restauração acima. Reaplicamos
  // em dois "próximos quadros" seguidos, garantindo que a nossa restauração vença por último,
  // mesmo se o navegador levar mais de um ciclo pra fazer o próprio ajuste automático.
  const reaplicar = ()=>{
    window.scrollTo(0, scrollJanela);
    const sheetNovo2 = document.querySelector('.menu-sheet');
    if(sheetNovo2 && scrollSheet!=null) sheetNovo2.scrollTop = scrollSheet;
    restaurarScrollsMarcados();
  };
  const proximoQuadro = (typeof requestAnimationFrame === 'function') ? requestAnimationFrame : (cb)=>setTimeout(cb, 16);
  proximoQuadro(()=>{ reaplicar(); proximoQuadro(reaplicar); });
}

// Frases de clima pra tela de carregamento — nada oficial do livro, só pra dar uma cara de
// Arton enquanto a planilha do Google "acorda". Escolhida uma por sessão, não fica trocando.
const FRASES_CARREGAMENTO = [
  'Afiando espadas e recarregando mochilas...',
  'Consultando os arquivos de Valkaria...',
  'A Tormenta espera, mas os heróis não...',
  'Rolando iniciativa nos bastidores...',
  'Acordando o escriba da planilha...',
  'Reunindo os aventureiros na taverna...',
  'Verificando o mapa de Arton...',
];
// Ícone de carregamento: usa um GIF de verdade (feito pelo usuário, não gerado por nós), com o
// dado rolando de forma suave — bem mais convincente do que qualquer tentativa nossa em SVG.
function iconeD20(tamanhoPx){
  const img = document.createElement('img');
  img.src = 'img/d20-carregando.gif';
  img.alt = 'Dado de 20 lados rolando';
  img.style.width = tamanhoPx+'px';
  img.style.height = tamanhoPx+'px';
  img.style.display = 'block';
  return img;
}

function fraseCarregamentoAtual(){
  if(!state._fraseCarregamento) state._fraseCarregamento = FRASES_CARREGAMENTO[Math.floor(Math.random()*FRASES_CARREGAMENTO.length)];
  return state._fraseCarregamento;
}

// ============ TELA DE PERFIS ============
function renderPerfisScreen(){
  const wrap = el('div',{class:'perfis-screen'});
  wrap.appendChild(el('div',{style:'align-self:flex-end;'}, botaoTema()));
  wrap.appendChild(el('div',{class:'tormenta-logo'}, 'Tormenta'));
  wrap.appendChild(el('div',{class:'perfis-title'},'Painel do Aventureiro'));

  if(state._carregandoInicial){
    wrap.appendChild(el('div',{class:'panel faixa splash-carregando', style:'max-width:380px;text-align:center;'},
      iconeD20(48),
      el('div',{class:'wizard-title', style:'font-size:1rem;'}, fraseCarregamentoAtual()),
      state._carregandoDemorando ? el('div',{class:'tip', style:'margin-top:10px;'}, 'Isso está demorando mais que o normal — o Google às vezes leva alguns segundos pra "acordar" depois de um tempo sem uso. Aguenta mais um pouco.') : null
    ));
    return wrap;
  }

  if(state._carregandoAtualizacao){
    wrap.appendChild(el('div',{class:'panel faixa splash-atualizando', style:'max-width:380px;margin:0 auto 14px;text-align:center;'},
      el('div',{style:'display:flex;align-items:center;justify-content:center;gap:10px;'},
        iconeD20(24),
        el('div',{}, fraseCarregamentoAtual())
      ),
      state._carregandoDemorando ? el('div',{class:'tip', style:'margin-top:8px;'}, 'O Google está demorando mais que o normal pra "acordar" — aguenta mais um pouco.') : null
    ));
  }

  const grid = el('div',{class:'perfis-grid'});

  // O card fixo do Mestre só faz sentido quando não há um sistema de código de acesso (ex:
  // dentro do Claude, onde a conversa já é privada). Quando há planilha compartilhada, o acesso
  // ao Mestre passa a ser só digitando "Mestre" na tela de código — assim outros jogadores que
  // usam a mesma planilha não veem essa opção à toa.
  if(!precisaCodigoJogador()){
    grid.appendChild(el('div',{class:'perfil-card-wrap'},
      el('button',{class:'perfil-card', onclick:()=>{ if(!state.gerenciandoPerfis) abrirTelaMestre(); }},
        el('div',{class:'perfil-avatar perfil-avatar-mestre'}, '♛'),
        el('div',{class:'perfil-nome'}, 'MESTRE'),
        el('div',{class:'perfil-sub'}, 'Ferramentas de sessão')
      )
    ));
  }

  state.perfis.forEach(p=>{
    const cardWrap = el('div',{class:'perfil-card-wrap ' + (state.gerenciandoPerfis?'gerenciando':'')});
    const card = el('button',{class:'perfil-card', onclick:()=>{
      if(state.gerenciandoPerfis) return;
      state.perfilAtualId = p.id; state.screen='ficha'; render();
      iniciarAtualizacaoAutomaticaJogador();
    }},
      el('div',{class:'perfil-avatar', style: p.foto ? '' : 'background:'+corAvatar(p.id)+';'}, p.foto ? el('img',{src:p.foto, style:'width:100%;height:100%;object-fit:cover;border-radius:inherit;'}) : (p.nome||'?').slice(0,1).toUpperCase()),
      el('div',{class:'perfil-nome'}, p.nome||'Sem nome'),
      el('div',{class:'perfil-sub'}, (p.raca||'—')+' · '+classeDisplay(p))
    );
    cardWrap.appendChild(card);
    if(!state.gerenciandoPerfis && detectarPendencias(p).length>0){
      cardWrap.appendChild(el('div',{class:'selo-cera', title: detectarPendencias(p).length+' pendência(s)'}, '!'));
    }
    cardWrap.appendChild(el('button',{class:'perfil-delete-x', onclick:(e)=>{
      e.stopPropagation();
      if(confirm('Excluir "'+(p.nome||'este personagem')+'"? Isso não pode ser desfeito.')){
        state.perfis = state.perfis.filter(x=>x.id!==p.id);
        salvarPerfis(); render();
      }
    }},'✕'));
    grid.appendChild(cardWrap);
  });

  grid.appendChild(el('div',{class:'perfil-card-wrap'},
    el('button',{class:'perfil-card perfil-add', onclick:()=>{ iniciarWizard(); }},
      el('div',{class:'perfil-avatar'}, '+'),
      el('div',{class:'perfil-nome'}, 'Novo Personagem')
    )
  ));

  wrap.appendChild(grid);
  wrap.appendChild(el('label',{class:'btn ghost', style:'margin-top:12px;display:block;text-align:center;'},
    '📂 Importar Cópia de Segurança',
    el('input',{type:'file', accept:'.json', style:'display:none;', onchange: async (e)=>{
      const arquivo = e.target.files[0];
      if(!arquivo) return;
      const dados = await lerArquivoBackup(arquivo);
      if(!dados){ flashMsg('⚠ Esse arquivo não parece ser um backup de personagem válido.'); return; }
      if(!confirm('Importar "'+dados.nome+'" como um personagem novo? (Se você já tinha ele nessa lista, vai ficar duplicado — apague o antigo depois se for o caso.)')) return;
      dados.id = 'p'+Date.now()+Math.floor(Math.random()*10000);
      state.perfis.push(dados);
      salvarPerfis();
      flashMsg('✅ "'+dados.nome+'" importado!');
      render();
    }})
  ));
  if(state.perfis.length>0){
    wrap.appendChild(el('div',{class:'perfil-manage'},
      el('button',{onclick:()=>{ state.gerenciandoPerfis=!state.gerenciandoPerfis; render(); }}, state.gerenciandoPerfis?'Concluir':'Gerenciar personagens')
    ));
  }
  if(precisaCodigoJogador()){
    wrap.appendChild(el('div',{class:'perfil-manage'},
      el('button',{onclick:sairDoCodigoJogador}, 'Trocar código de acesso')
    ));
  }
  return wrap;
}

document.addEventListener('DOMContentLoaded', iniciar);
