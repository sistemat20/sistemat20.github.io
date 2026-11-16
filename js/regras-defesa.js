// Parceiros, Defesa, vida e mana, carga e deslocamento.
// Separado do js/app.js em 15/11/2026 (item 6 da revisão geral), sem mudar o código.

// ---- Sistema de Parceiros (Tormenta 20, pág. 260-262) ----
function adicionarParceiro(f, dados){
  if(!f.parceiros) f.parceiros = [];
  if(f.parceiros.length >= limiteParceiros(f)){
    flashMsg('Você já está no limite de '+limiteParceiros(f)+' parceiro(s) pro seu nível.');
    return false;
  }
  f.parceiros.push(dados);
  registrarLog(f, 'Ganhou um parceiro: '+dados.nome+' ('+dados.tipo+', '+dados.poder+')');
  salvarPerfis();
  return true;
}

function removerParceiro(f, idx){
  const p = f.parceiros[idx];
  if(!p) return;
  registrarLog(f, 'Perdeu o parceiro: '+p.nome);
  f.parceiros.splice(idx,1);
  salvarPerfis(); render();
}

function alterarPoderParceiro(f, idx, novoPoder){
  const p = f.parceiros[idx];
  if(!p) return;
  p.poder = novoPoder;
  registrarLog(f, p.nome+' evoluiu pra '+novoPoder);
  salvarPerfis(); render();
}

// Bônus de Defesa vindos de parceiros do tipo Guardião — +2/+3/+4 conforme o nível de poder.
// Só as automáticas e incondicionais entram aqui; o resto (habilidades especiais tipo "pode
// usar Esquiva Sobrenatural") fica só como referência de texto.
function bonusDefesaParceiros(f){
  let bonus = 0;
  parceirosAtivos(f).forEach(p=>{
    if(p.tipo==='Guardião'){
      bonus += p.poder==='mestre' ? 4 : p.poder==='veterano' ? 3 : 2;
    }
    if(p.ehMontaria && p.montadoAgora){
      const nomeMontaria = p.tipoMontaria;
      if(nomeMontaria==='Cão de caça' && (p.poder==='veterano'||p.poder==='mestre')) bonus += 2;
    }
  });
  return bonus;
}

// Bônus de teste de resistência (Fortitude/Reflexos/Vontade) de Guardião mestre — "+2 em testes
// de resistência" sem especificar qual, então vale pras três.
function bonusResistenciaParceiros(f, periciaNome){
  if(!['Fortitude','Reflexos','Vontade'].includes(periciaNome)) return 0;
  let bonus = 0;
  parceirosAtivos(f).forEach(p=>{
    if(p.tipo==='Guardião' && p.poder==='mestre') bonus += 2;
    if(p.ehMontaria && p.montadoAgora && p.tipoMontaria==='Trobo'){
      bonus += p.poder==='mestre' ? 5 : p.poder==='veterano' ? 2 : 1;
    }
  });
  return bonus;
}

// Bônus de teste de ataque de parceiros Combatente, e de montarias montadas com bônus de ataque.
function bonusAtaqueParceiros(f){
  let bonus = 0;
  parceirosAtivos(f).forEach(p=>{
    if(p.tipo==='Combatente'){
      bonus += p.poder==='mestre' ? 4 : p.poder==='veterano' ? 3 : 2;
    }
    if(p.ehMontaria && p.montadoAgora && p.tipoMontaria==='Cavalo' && (p.poder==='veterano'||p.poder==='mestre')){
      bonus += 2;
    }
  });
  return bonus;
}

// Bônus de perícia de parceiros — Perseguidor/Vigilante dão bônus fixo; Ajudante dá bônus nas
// perícias que o JOGADOR escolheu pra ele (guardado em p.periciasEscolhidas).
function bonusPericiaDeParceiros(f, periciaNome){
  let bonus = 0;
  parceirosAtivos(f).forEach(p=>{
    if(p.tipo==='Perseguidor' && (periciaNome==='Percepção' || periciaNome==='Sobrevivência')) bonus += 2;
    if(p.tipo==='Vigilante' && (periciaNome==='Percepção' || periciaNome==='Iniciativa')) bonus += 2;
    if(p.tipo==='Ajudante' && (p.periciasEscolhidas||[]).includes(periciaNome)){
      bonus += p.poder==='mestre' ? 4 : 2;
    }
  });
  // Familiar Gato: "+2 em Furtividade" (a visão no escuro que ele também dá não é calculável,
  // fica só no texto do efeito).
  const fam = familiarAtivo(f);
  if(fam && fam.nome==='Gato' && periciaNome==='Furtividade') bonus += 2;
  return bonus;
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
  // Escudeiro (Cavaleiro): "sua armadura concede +1 na Defesa".
  if(nomesPoderesConhecidos(f).includes('Escudeiro') && f.armadura && f.armadura.equipado!==false) bonus += 1;
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
  // Casca Grossa (habilidade AUTOMÁTICA do Lutador no 3º nível, achada na mesma auditoria que o
  // Durão — não é um poder escolhido, então não fica em poderesClasse, precisa checar
  // classesNiveis direto): "soma Constituição na Defesa, limitado pelo nível, só sem armadura
  // pesada. No 7º nível, e a cada quatro, +1 na Defesa" (esse segundo bônus não depende de
  // armadura, é sempre ativo).
  const lutadorObj = (f.classesNiveis||[]).find(c=>c.classe==='Lutador');
  if(lutadorObj && lutadorObj.nivel>=3 && !usaArmaduraPesada(f)){
    bonus += Math.min(parseInt(f.con)||0, nivelTotal(f));
  }
  if(lutadorObj && lutadorObj.nivel>=7){
    bonus += 1 + Math.floor((lutadorObj.nivel-7)/4);
  }
  // Esquiva Sagaz (habilidade AUTOMÁTICA do Bucaneiro, 3º nível, escala a cada 4 — achada na
  // mesma auditoria): "+1 na Defesa e em Reflexos, +1 a mais a cada quatro níveis. Exige
  // liberdade de movimentos — não funciona com armadura pesada ou na condição Imóvel."
  const bucaneiroObj = (f.classesNiveis||[]).find(c=>c.classe==='Bucaneiro');
  const semLiberdadeMovimento = usaArmaduraPesada(f) || (f.condicoesAtivas||[]).includes('Imóvel');
  if(bucaneiroObj && bucaneiroObj.nivel>=3 && !semLiberdadeMovimento){
    bonus += 1 + Math.floor((bucaneiroObj.nivel-3)/4);
  }
  // Insolência (habilidade AUTOMÁTICA do Bucaneiro, 1º nível — achada na mesma auditoria):
  // "soma Carisma na Defesa, limitado pelo seu nível. Exige liberdade de movimentos — não
  // funciona com armadura pesada ou na condição Imóvel" (mesma condição de Esquiva Sagaz, e o
  // mesmo bucaneiroObj já detectado acima).
  if(bucaneiroObj && !semLiberdadeMovimento){
    bonus += Math.min(parseInt(f.car)||0, nivelTotal(f));
  }
  // Escamas Dracônicas (poder concedido — achado na mesma auditoria, dessa vez em Poderes
  // Concedidos): "+2 na Defesa e em Fortitude".
  if(listaPoderesConcedidos(f).some(pc=>pc && pc.nome==='Escamas Dracônicas')) bonus += 2;
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
  // Toque de Tibar (maldição, Ameaças de Arton pág. 362): "armaduras e escudos têm seu bônus de
  // Defesa reduzido em –2" — cada peça vestida (armadura E escudo, se tiver os dois) perde 2,
  // não é um -2 geral na Defesa toda.
  const penalidadeTibarDef = maldicoesAtivas(f).includes('Toque de Tibar') ? -2 : 0;
  const armadura = armaduraEquipada ? (f.armadura.def + penalidadeTibarDef) : 0;
  const escudo = escudoEquipado ? (f.escudo.def + bonusEscudoPoderes(f) + penalidadeTibarDef) : 0;
  // Autoconfiança (habilidade AUTOMÁTICA do Nobre, 1º nível — achada numa auditoria): "pode usar
  // Carisma em vez de Destreza na Defesa". Implementado como o MAIOR dos dois (a redação "pode
  // usar" sugere escolha, e a escolha óbvia é sempre a que for melhor pro personagem).
  const nobreObj = (f.classesNiveis||[]).find(c=>c.classe==='Nobre');
  const atributoBaseDefesa = nobreObj ? Math.max(parseInt(f.des)||0, parseInt(f.car)||0) : (parseInt(f.des)||0);
  // Armadura pesada: você NÃO aplica Destreza (ou Carisma, no caso acima) na Defesa (pág. 157)
  const des = usaArmaduraPesada(f) ? 0 : atributoBaseDefesa;
  const outros = parseInt(f.defOutros)||0;
  return 10 + des + armadura + escudo + outros + bonusDefesaPoderes(f) + bonusDefesaRaca(f) + bonusCondicoesDefesa(f) + bonusDefesaTormenta(f) + bonusDefesaParceiros(f) + bonusDefesaEsotericos(f);
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
  if(nomesPoderesConhecidos(f).includes('Fúria da Savana')) d += 3; // Bárbaro: "Seu deslocamento aumenta em +3m"
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
// Mochilas que somam no limite quando VESTIDAS (Livro Básico: "vestir uma mochila de aventureiro
// aumenta sua capacidade de carga em 2 espaços"; Mochila de carga, item mágico: +10). Só uma
// mochila nas costas por vez; se houver mais de uma vestida, vale a maior.
const MOCHILAS_VESTIVEIS = {'Mochila de aventureiro':2, 'Mochila de carga':10};
function mochilaVestida(f){
  let melhor = null;
  itensVestidosAtivos(f).forEach(fonte=>{
    const nome = fonte.row ? nomeCatalogoDaLinha(fonte.row) : null;
    const b = nome ? MOCHILAS_VESTIVEIS[nome] : 0;
    if(b && (!melhor || b>melhor.bonus)) melhor = {nome, bonus:b};
  });
  return melhor;
}

// As parcelas do limite de carga, para somar e para mostrar a conta ao jogador.
function limiteCargaPartes(f){
  const for_ = parseInt(f.for)||0;
  // "10 espaços +2 por ponto de Força (ou -1 por ponto de Força negativo)" — Força -1 dá 9.
  const partes = [{rotulo: for_>=0 ? '10 + 2×Força' : '10 − 1 por Força negativa', valor: for_>=0 ? 10 + 2*for_ : 10 + for_}];
  if(poderesAtivos(f).includes('Costas Largas')) partes.push({rotulo:'Costas Largas', valor:5});
  if(poderesAtivos(f).includes('Inventário Organizado')) partes.push({rotulo:'Inventário Organizado (Int)', valor:parseInt(f.int)||0});
  const moch = mochilaVestida(f);
  if(moch) partes.push({rotulo:moch.nome+' (vestida)', valor:moch.bonus});
  if(f.origemPoder && f.origemPoder.nome==='Mochileiro') partes.push({rotulo:'Mochileiro', valor:5});
  const essCarga = essenciasAtivas(f).filter(e=>e.tipo==='carga').reduce((t,e)=>t+(parseInt(e.valor)||0),0);
  if(essCarga) partes.push({rotulo:'Essências de itens vestidos', valor:essCarga});
  return partes;
}

function limiteCarga(f){ return limiteCargaPartes(f).reduce((t,p)=>t+p.valor,0); }

// Munição (15/11/2026): "Flechas (20)" é um pacote de 20 que ocupa 1 espaço. A linha guarda
// quantas flechas sobram (qtd = 14 flechas, não 14 pacotes); o espaço é por pacote começado.
function pacoteMunicao(row){
  if(!row || row.tipo!=='geral') return 0;
  const nome = nomeCatalogoDaLinha(row);
  const cat = ITENS_GERAIS.find(i=> i.n===nome);
  if(!cat || cat.cat!=='Munição') return 0;
  const m = nome.match(/\((\d+)\)\s*$/);
  return m ? parseInt(m[1]) : 0;
}

function espacoDaLinha(row, porUnidade){
  const qtd = parseFloat(row.qtd)||1;
  const pacote = pacoteMunicao(row);
  return pacote ? porUnidade * Math.ceil(Math.max(0, qtd) / pacote) : porUnidade * qtd;
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
  // Inventário Organizado, segunda parte (achado numa auditoria — só a "+Int no limite" tinha
  // sido conectada antes): "itens muito leves ou pequenos, que normalmente ocupam meio espaço,
  // em vez disso ocupam 1/4 de espaço" (Livro Básico pág. 130). Só vale pra item com carga
  // EXATAMENTE 0.5 — os de outros pesos (1, 2, etc.) não mudam.
  const temInventarioOrganizado = poderesAtivos(f).includes('Inventário Organizado');
  (f.equip||[]).forEach(it=>{
    let porUnidade = parseFloat(String(it.carga).replace(',','.'))||0; // "0,5" digitado com vírgula valia 0
    if(it.tipo==='geral' && it.vestido && MOCHILAS_VESTIVEIS[nomeCatalogoDaLinha(it)]) porUnidade = 0; // vestida, a mochila não gasta espaço
    if(temInventarioOrganizado && porUnidade===0.5) porUnidade = 0.25;
    total += espacoDaLinha(it, porUnidade);
  });
  return Math.round(total*100)/100;
}


// Redução de dano dos poderes (revisão de 16/11/2026). Lista para a conta da Defesa: cada
// item é {valor, tipo, fonte}; tipo vazio é RD geral (vale contra qualquer dano).
function reducaoDanoPoderes(f){
  const rd = [];
  const nomes = nomesPoderesConhecidos(f);
  const pesada = usaArmaduraPesada(f);
  if(pesada && nomes.includes('Especialização em Armadura')) rd.push({valor:5, tipo:'', fonte:'Especialização em Armadura'});
  if(pesada && nomes.includes('Bastião')) rd.push({valor:5, tipo:'', fonte:'Bastião'});
  const concedidos = (typeof listaPoderesConcedidos==='function' ? listaPoderesConcedidos(f) : []).map(p=> p && p.nome);
  if(concedidos.includes('Fulgor Solar')){ rd.push({valor:5, tipo:'frio', fonte:'Fulgor Solar'}); rd.push({valor:5, tipo:'trevas', fonte:'Fulgor Solar'}); }
  if(concedidos.includes('Habitante do Deserto')) rd.push({valor:10, tipo:'fogo', fonte:'Habitante do Deserto'});
  return rd;
}
// Resumo curto para a tela: "RD 10 · fogo 10" (RD geral somada; por tipo, a maior de cada).
function resumoReducaoDano(f){
  const rd = reducaoDanoPoderes(f);
  if(!rd.length) return '';
  const geral = rd.filter(r=> !r.tipo).reduce((t,r)=> t+r.valor, 0);
  const porTipo = {};
  rd.filter(r=> r.tipo).forEach(r=>{ porTipo[r.tipo] = Math.max(porTipo[r.tipo]||0, r.valor); });
  return [geral ? 'RD '+geral : null].concat(Object.keys(porTipo).map(t=> t+' '+porTipo[t])).filter(Boolean).join(' · ');
}
