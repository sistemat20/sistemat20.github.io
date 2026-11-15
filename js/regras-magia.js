// Regras de magia: custo em PM, limites, CD, atributo-chave e círculos.
// Separado do js/app.js em 15/11/2026 (item 6 da revisão geral), sem mudar o código.

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
  // Itens mágicos do Cap. 8 com bônus fixo de CD (ex: Cajado do Poder, +3 no total)
  efeitosMagicosAtivos(f).forEach(ef=>{ if(ef.tipo==='cd_arcana_geral') total += ef.valor; });
  return total;
}

function limitePMExtraArcana(f){
  let total = 0;
  esotericosEquipados(f).forEach(e=>{
    (e.efeito||[]).forEach(ef=>{ if(ef.tipo==='limite_pm_arcana') total += ef.valor; });
  });
  // Itens mágicos do Cap. 8 que também mexem no limite (ex: Cajado do Poder conta como cajado arcano)
  efeitosMagicosAtivos(f).forEach(ef=>{ if(ef.tipo==='limite_pm_arcana') total += ef.valor; });
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
  const resultado = [];
  const lista = DESLOCAMENTOS_ALTERNATIVOS[f.raca];
  if(lista){
    lista.forEach(d=> resultado.push({
      tipo: d.tipo,
      valor: d.igualTerrestre ? deslocamentoEfetivo(f) : d.valor,
      obs: d.obs,
    }));
  }
  // Anfíbio (poder concedido de Oceano, achado na mesma auditoria): "deslocamento de natação
  // igual ao terrestre" — mesmo padrão dos deslocamentos alternativos de raça, só que vindo de
  // um poder concedido em vez de traço racial. Só adiciona se ainda não tiver Natação por outra
  // fonte (ex: raça Sereia/Tritão), pra não duplicar a linha.
  if(listaPoderesConcedidos(f).some(pc=>pc && pc.nome==='Anfíbio') && !resultado.some(d=>d.tipo==='Natação')){
    resultado.push({tipo:'Natação', valor: deslocamentoEfetivo(f), obs:'Anfíbio'});
  }
  return resultado;
}

// Itens mágicos do Cap. 8 (acessórios, artefatos, armas específicas) que o personagem está
// usando agora — vestidos nos slots ativos, empunhados como arma/esotérico, ou vestindo como
// armadura/escudo. O nome pode vir com sufixo de item superior ("Cajado do Poder (Certeira)"),
// então compara pelo nome limpo e também pelo item-base do catálogo.
function itensMagicosEquipadosNomes(f){
  const nomes = new Set();
  const limpar = (n)=> String(n||'').replace(/\s*\([^()]*\)\s*$/,'').trim();
  const por = (n)=>{ const l = limpar(n); if(l) nomes.add(l); };
  itensVestidosAtivos(f).forEach(fonte=> por(fonte.nome));
  (f.armas||[]).filter(a=>a && a.equipado!==false).forEach(a=>{ por(a.nome); por(a.refBase); });
  esotericosEquipados(f).forEach(e=>{ por(e.nome); por(e.refBase); });
  if(f.armadura && f.armadura.equipado!==false){ por(f.armadura.nome); por(f.armadura.refBase); }
  if(f.escudo && f.escudo.equipado!==false){ por(f.escudo.nome); por(f.escudo.refBase); }
  return [...nomes];
}

function efeitosMagicosAtivos(f){
  if(typeof EFEITOS_MAGICOS_AUTOMATICOS==='undefined') return [];
  const out = [];
  itensMagicosEquipadosNomes(f).forEach(n=>{
    const efs = EFEITOS_MAGICOS_AUTOMATICOS[n];
    if(efs) efs.forEach(ef=> out.push({...ef, _item:n}));
  });
  return out;
}

function custoPMAjustado(f, magia){
  let custo = custoPM(magia.c);
  if(/pessoal/i.test(magia.alcance||'')){
    esotericosEquipados(f).forEach(e=>{
      (e.efeito||[]).forEach(ef=>{ if(ef.tipo==='custo_pm_alcance_pessoal') custo += ef.valor; });
    });
  }
  // Alta Arcana (habilidade AUTOMÁTICA do Arcanista, 20º nível — achada na mesma auditoria):
  // "custo em PM das magias arcanas reduzido à metade, depois de aplicar aprimoramentos e
  // outros efeitos que reduzem custo". Aplicado aqui no custo BASE (antes do jogador escolher
  // aprimoramentos no popup de Usar Magia) — uma simplificação: a regra manda aplicar por
  // último, mas isso exigiria reestruturar como o popup soma o total, pra um poder de nível 20
  // que poucos personagens alcançam. Cobre a maior parte do efeito real mesmo assim.
  const arcanistaObjCusto = (f.classesNiveis||[]).find(c=>c.classe==='Arcanista');
  if(arcanistaObjCusto && arcanistaObjCusto.nivel>=20 && (magia.trad==='Arcana' || magia.trad==='Universal')){
    custo = Math.ceil(custo/2);
  }
  // Condição Alquebrado: "custo em PM das habilidades aumenta em +1" — a condição existia na
  // lista e podia ser marcada na ficha, mas o efeito nunca era aplicado em lugar nenhum.
  if(condicoesAtivas(f).includes('Alquebrado')) custo += 1;
  // Melhoria Harmonizado (esotérico): "escolha uma magia — o custo dela cai em –1 PM". A magia
  // escolhida fica guardada em `magiaHarmonizada` no item, definida na hora de forjar o esotérico.
  esotericosEquipados(f).forEach(e=>{
    const temHarmonizado = (e.efeito||[]).some(ef=>ef.tipo==='custo_pm_magia');
    if(temHarmonizado && e.magiaHarmonizada && e.magiaHarmonizada===magia.n) custo -= 1;
  });
  // Itens mágicos do Cap. 8 que reduzem o custo de PM (Símbolo abençoado, Cajado do Poder,
  // Chifre de Unicórnio, Joia da Alma) — antes só existiam como texto na descrição do item.
  const ehArcanista = (f.classesNiveis||[]).some(c=>c.classe==='Arcanista');
  let custoZerado = false;
  efeitosMagicosAtivos(f).forEach(ef=>{
    if(ef.tipo==='custo_pm_tradicao' && magia.trad===ef.tradicao) custo += ef.valor;
    if(ef.tipo==='custo_pm_magia_lista' && (ef.magias||[]).includes(magia.n)) custo += ef.valor;
    if(ef.tipo==='custo_pm_zero_arcanista' && ehArcanista && (magia.trad==='Arcana' || magia.trad==='Universal')) custoZerado = true;
  });
  if(custoZerado) return 0;
  essenciasAtivas(f).forEach(e=>{ if(e.tipo==='magia_custo' && e.escola===magia.e) custo += parseInt(e.valor)||0; });
  return Math.max(1, custo);
}

// Melhoria Vigilante (esotérico): "+2 na Defesa". Separada das outras porque a Defesa vem de
// armadura/escudo, e o esotérico não passava por lá.
function bonusDefesaEsotericos(f){
  let total = 0;
  esotericosEquipados(f).forEach(e=>{
    (e.efeito||[]).forEach(ef=>{ if(ef.tipo==='defesa_esoterico') total += ef.valor; });
  });
  return total;
}

// CD de resistência de uma magia específica (considera bônus de esotéricos arcanos por escola)
// Bônus de CD vindo do familiar arcano (Borboleta/Cobra/Lagarto) — cada um aumenta em +1 a CD
// de UM tipo de teste de resistência. O campo `resistencia` da magia diz qual teste ela usa
// ("Vontade anula", "Reflexos reduz à metade"...), então dá pra aplicar só no tipo certo.
function bonusCdFamiliar(f, magia){
  const fam = familiarAtivo(f);
  if(!fam) return 0;
  const resistenciaDaMagia = (magia && magia.resistencia) || '';
  const mapa = {'Borboleta':'Vontade', 'Cobra':'Fortitude', 'Lagarto':'Reflexos'};
  const tipoDoFamiliar = mapa[fam.nome];
  if(!tipoDoFamiliar) return 0;
  return resistenciaDaMagia.includes(tipoDoFamiliar) ? 1 : 0;
}

function cdMagiaEspecifica(f, magia){
  const base = cdMagias(f);
  if(base==null) return null;
  const ehArcanaOuUniversal = magia.trad==='Arcana' || magia.trad==='Universal';
  const essCd = essenciasAtivas(f).filter(e=>e.tipo==='magia_cd' && e.escola===magia.e).reduce((t,e)=>t+(parseInt(e.valor)||0),0);
  return base + (ehArcanaOuUniversal ? bonusCdArcana(f, magia.e) : 0) + bonusCdFamiliar(f, magia) + essCd;
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
  return 10 + Math.floor(nivelTotal(f)/2) + atributoEfetivo(f, attr);
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

// Quantas magias o herói pode conhecer (Livro Básico, capítulo de classes; conferido em 15/11/2026):
// · Arcanista (Bruxo) e Clérigo: 3 no 1º nível e +1 a cada nível.
// · Feiticeiro: 3 no 1º nível e +1 só nos níveis ímpares (3º, 5º, 7º...).
// · Mago: 4 no 1º nível, +1 a cada nível e +1 a cada círculo novo (5º, 9º, 13º, 17º).
// · Bardo e Druida: 2 no 1º nível e +1 nos níveis pares.
// · Conhecimento Mágico, Aumentar Repertório e Segredos da Natureza: +2 cada vez que o poder é escolhido.
// Devolve {total, conta} ou null para quem não é conjurador.
function magiasQuePodeConhecer(f){
  const cc = classeConjuradora(f);
  if(!cc) return null;
  const n = Math.max(1, parseInt(cc.nivel)||1);
  let total, conta;
  if(cc.classe==='Arcanista' && f.arcanistaCaminho==='Feiticeiro'){
    total = 3 + Math.floor((n-1)/2); conta = 'Feiticeiro '+n+': 3 no 1º nível + 1 nos níveis ímpares';
  } else if(cc.classe==='Arcanista' && f.arcanistaCaminho==='Mago'){
    const circulos = Math.min(5, Math.ceil(n/4)) - 1;
    total = 4 + (n-1) + circulos; conta = 'Mago '+n+': 4 no 1º nível + 1 por nível'+(circulos ? ' + '+circulos+' por círculo novo' : '');
  } else if(cc.classe==='Bardo' || cc.classe==='Druida'){
    total = 2 + Math.floor(n/2); conta = cc.classe+' '+n+': 2 no 1º nível + 1 nos níveis pares';
  } else {
    total = 3 + (n-1); conta = cc.classe+' '+n+': 3 no 1º nível + 1 por nível';
  }
  const extras = (f.poderesClasse||[]).filter(p=> ['Conhecimento Mágico','Aumentar Repertório','Segredos da Natureza'].includes(p.nome)).length * 2;
  if(extras){ total += extras; conta += ' + '+extras+' de poder'; }
  return {total, conta: conta+' = '+total+'.'};
}
