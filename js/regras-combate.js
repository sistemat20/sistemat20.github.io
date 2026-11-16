// Classes, dados de dano, proficiências, ataque e dano das armas.
// Separado do js/app.js em 15/11/2026 (item 6 da revisão geral), sem mudar o código.

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
  const result = {armasMarciais:false, armasFogo:false, armadurasPesadas:false, escudos:false, marciaisCorpo:false, marciaisDistancia:false};
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
  // Poderes de classe que dão proficiência (revisão de 16/11/2026).
  const conhecidos = nomesPoderesConhecidos(f);
  if(conhecidos.includes('Pistoleiro')) result.armasFogo = true;
  if(conhecidos.includes('Couraceiro')){ result.armadurasPesadas = true; result.escudos = true; }
  if(conhecidos.includes('Armeiro')) result.marciaisCorpo = true;
  const bal = (f.poderesClasse||[]).find(p=> p.nome==='Balística');
  if(bal){ if(/fogo/i.test(bal.sub||'')) result.armasFogo = true; else result.marciaisDistancia = true; }
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
    marciaisCorpo: p.marciaisCorpo, marciaisDistancia: p.marciaisDistancia,
  };
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
  // Tradição de Lin-Wu (concedido): "Katana conta como arma simples pra você".
  if((arma.n||arma.nome)==='Katana' && typeof listaPoderesConcedidos==='function' && listaPoderesConcedidos(f).some(p=> p && p.nome==='Tradição de Lin-Wu')) return true;
  const prof = proficienciasPersonagem(f);
  if(arma.cat==='Marcial') return prof.armasMarciais || (arma.distancia ? prof.marciaisDistancia : prof.marciaisCorpo);
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
  // Toque de Tibar (maldição, Ameaças de Arton pág. 362): "armas impõem –2 em testes de ataque e
  // rolagens de dano" — tudo que você veste ou empunha vira pirita enquanto amaldiçoado.
  const penalidadeTibar = maldicoesAtivas(f).includes('Toque de Tibar') ? -2 : 0;
  // Armas da Ambição (concedido, Valkaria): +1 em ataques com armas nas quais é proficiente.
  const ambicao = (typeof listaPoderesConcedidos==='function' && listaPoderesConcedidos(f).some(p=> p && p.nome==='Armas da Ambição') && proficienteComArma(f, arma)) ? 1 : 0;
  return ambicao + (proficienteComArma(f, arma) ? base : base - 5) + bonusMelhoria + bonusUmaArma + bonusFocoArma + bonusRaca + bonusArmaLonga + penalidadeTibar + bonusAtaqueParceiros(f);
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
  // Revisão de 16/11/2026: Pistoleiro (+2 com armas de fogo), Escudeiro (+1 em todas as armas) e
  // Arsenal das Profundezas (concedido de Oceano: +2 com azagaias, lanças e tridentes).
  const conhecidosDano = nomesPoderesConhecidos(f);
  const concedidosDano = (typeof listaPoderesConcedidos==='function' ? listaPoderesConcedidos(f) : []).map(p=> p && p.nome);
  const bonusPoderesNovos = (conhecidosDano.includes('Pistoleiro') && arma.cat==='Arma de Fogo' ? 2 : 0)
    + (conhecidosDano.includes('Escudeiro') ? 1 : 0)
    + (concedidosDano.includes('Arsenal das Profundezas') && ['Azagaia','Lança','Tridente'].includes(nomeArma) ? 2 : 0);

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
  // Toque de Tibar (maldição): mesma penalidade de -2 também no dano, não só no ataque.
  const penalidadeTibarDano = maldicoesAtivas(f).includes('Toque de Tibar') ? -2 : 0;
  return bonusAtributo + bonusMelhoria + bonusDuasMaos + bonusArremesso + bonusEspecializacao + bonusRacaDano + bonusPoderesNovos + penalidadeTibarDano;
}
