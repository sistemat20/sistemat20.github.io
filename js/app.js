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
  return total;
}
function limitePMExtraArcana(f){
  let total = 0;
  esotericosEquipados(f).forEach(e=>{
    (e.efeito||[]).forEach(ef=>{ if(ef.tipo==='limite_pm_arcana') total += ef.valor; });
  });
  return total;
}
// Custo em PM de uma magia específica, já considerando itens que reduzem custo (ex: Medalhão de Prata)
function custoPMAjustado(f, magia){
  let custo = custoPM(magia.c);
  if(/pessoal/i.test(magia.alcance||'')){
    esotericosEquipados(f).forEach(e=>{
      (e.efeito||[]).forEach(ef=>{ if(ef.tipo==='custo_pm_alcance_pessoal') custo += ef.valor; });
    });
  }
  return Math.max(1, custo);
}
// CD de resistência de uma magia específica (considera bônus de esotéricos arcanos por escola)
function cdMagiaEspecifica(f, magia){
  const base = cdMagias(f);
  if(base==null) return null;
  const ehArcanaOuUniversal = magia.trad==='Arcana' || magia.trad==='Universal';
  return base + (ehArcanaOuUniversal ? bonusCdArcana(f, magia.e) : 0);
}
// Limite de PM que pode gastar em aprimoramentos de uma única magia arcana (atributo-chave + itens)
function limitePMPorMagia(f, magia){
  const attrVal = valorAtributoChaveMagia(f) || 0;
  const ehArcanaOuUniversal = magia.trad==='Arcana' || magia.trad==='Universal';
  return attrVal + (ehArcanaOuUniversal ? limitePMExtraArcana(f) : 0);
}

// Atributo-chave de magia do personagem (baseado na 1ª classe conjuradora que ele tiver)
function atributoChaveMagia(f){
  const classeConj = (f.classesNiveis||[]).find(c=> CLASSES[c.classe] && CLASSES[c.classe].tradicao);
  if(!classeConj) return null;
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
  const regras = PERICIA_BONUS_RACA[racaObj.nome];
  if(!regras) return 0;
  let total = 0;
  regras.forEach(([alvo,valor])=>{ if(alvo===periciaNome) total += valor; });
  return total;
}

// Modificador de Furtividade por categoria de Tamanho (Tabela 1-21 do livro, pág. 107)
const MODIFICADOR_FURTIVIDADE_TAMANHO = { 'Minúsculo':5, 'Pequeno':2, 'Médio':0, 'Grande':-2, 'Enorme':-5, 'Colossal':-10 };
function bonusFurtividadeTamanho(f){
  return MODIFICADOR_FURTIVIDADE_TAMANHO[f.tamanho] || 0;
}

function periciaValor(f, p){
  const nivel = nivelTotal(f);
  const metade = Math.floor(nivel/2);
  const racaObjPericia = getRacaObj(f);
  const usaDesEmAtletismo = p.nome==='Atletismo' && racaObjPericia && racaObjPericia.atletismoUsaDestreza;
  const attrKey = usaDesEmAtletismo ? 'des' : (p.attr||'').toLowerCase().slice(0,3); // 'For'->'for','Des'->'des', etc.
  const attrVal = parseInt(f[attrKey])||0;
  const treinada = (f.periciasTreinadas||[]).includes(p.nome);
  const treino = treinada ? bonusTreinoPericia(nivel) : 0;
  const poderes = bonusPericiaDePoderes(f, p.nome);
  const itensVestidos = bonusPericiaDeItensVestidos(f, p.nome);
  const racaBonus = bonusPericiaDeRaca(f, p.nome);
  const tamanhoBonus = (p.nome==='Furtividade') ? bonusFurtividadeTamanho(f) : 0;
  const penalidade = p.armadura ? penalidadeTotal(f) : 0; // penalidadeTotal já é negativa ou zero
  // Sem proficiência com a armadura/escudo equipado: a penalidade vale para TODA perícia de Força/Destreza
  // (não só as 3 marcadas com ‡), mesmo que a perícia normalmente não sofresse penalidade de armadura.
  const penalidadeExtra = (!p.armadura && (p.attr==='For' || p.attr==='Des')) ? penalidadeNaoProficienciaArmadura(f) : 0;
  return metade + attrVal + treino + poderes + itensVestidos + racaBonus + tamanhoBonus + penalidade + penalidadeExtra;
}

function bonusDefesaPoderes(f){
  const nomes = poderesAtivos(f);
  let bonus = 0;
  if(nomes.includes('Esquiva')) bonus += 2;
  if(nomes.includes('Encouraçado') && f.armadura && f.armadura.equipado!==false && f.armadura.cat==='Pesada') bonus += 2;
  return bonus;
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
function ajustarPV(f, delta){
  const max = parseInt(f.pvmax)||0;
  const atual = parseInt(f.pvatual)||0;
  f.pvatual = Math.max(0, Math.min(max, atual+delta));
  salvarPerfis(); render();
}
function ajustarPM(f, delta){
  const max = parseInt(f.pmmax)||0;
  const atual = parseInt(f.pmatual)||0;
  f.pmatual = Math.max(0, Math.min(max, atual+delta));
  salvarPerfis(); render();
}

// Recebe um arquivo de imagem escolhido pelo jogador e abre o ajustador de posição (arrastar
// pra escolher o que aparece) antes de confirmar — só depois disso é que redimensiona/comprime/envia.
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
function ajustarPVTemp(f, delta){
  f.pvtemp = Math.max(0, (parseInt(f.pvtemp)||0)+delta);
  salvarPerfis(); render();
}
function ajustarPMTemp(f, delta){
  f.pmtemp = Math.max(0, (parseInt(f.pmtemp)||0)+delta);
  salvarPerfis(); render();
}

// Widget de PV/PM: uma caixa só. Mostra "máximo / atual". Toque na metade esquerda subtrai 1,
// na direita soma 1 (sem passar do máximo nem ficar negativo). Barrinha de progresso discreta.
function criarStatTracker(classeExtra, label, atual, max, onAjustar){
  const pct = max>0 ? Math.max(0, Math.min(100, (atual/max)*100)) : 0;
  return el('div',{class:'stat-tracker '+classeExtra, onclick:(e)=>{
    const rect = e.currentTarget.getBoundingClientRect();
    const meio = rect.left + rect.width/2;
    onAjustar(e.clientX < meio ? -1 : 1);
  }},
    el('div',{class:'stat-nums'}, el('span',{class:'stat-max'}, max), el('span',{class:'stat-slash'},'/'), el('span',{class:'stat-atual'}, atual)),
    el('div',{class:'stat-label'}, label),
    el('div',{class:'stat-bar'}, el('div',{class:'stat-bar-fill', style:'width:'+pct+'%;'})),
    el('div',{class:'stat-hint'}, el('span',{},'−'), el('span',{},'+'))
  );
}

// Igual, mas sem máximo (pra PV/PM temporário): só mostra o valor atual, mínimo 0, sem teto.
function criarStatTrackerSemMax(classeExtra, label, atual, onAjustar){
  return el('div',{class:'stat-tracker '+classeExtra, onclick:(e)=>{
    const rect = e.currentTarget.getBoundingClientRect();
    const meio = rect.left + rect.width/2;
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
  return 10 + des + armadura + escudo + outros + bonusDefesaPoderes(f) + bonusDefesaRaca(f);
}
// Deslocamento reduzido em 3m ao usar armadura pesada
// Sobrecarga: ultrapassar o limite de carga dá -5 de penalidade de armadura e -3m de deslocamento
// (regra do livro básico, pág. 146). Isso é independente e cumulativo com a penalidade de armadura pesada.
function sobrecarregado(f){ return cargaUsada(f) > limiteCarga(f); }

function deslocamentoEfetivo(f){
  const base = parseInt(f.deslocamento)||0;
  const racaObj = getRacaObj(f);
  if(racaObj && racaObj.deslocamentoImune) return base; // Anão: "Devagar e Sempre" — nunca reduzido
  let d = base;
  if(usaArmaduraPesada(f)) d -= 3;
  if(sobrecarregado(f)) d -= 3;
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
  return for_>=0 ? 10 + 2*for_ : 10 - for_;
}
function cargaMaxima(f){ return limiteCarga(f)*2; }
function cargaUsada(f){
  let total = 0;
  (f.armas||[]).forEach(a=> total += (parseFloat(a.esp)||1));
  if(f.armadura) total += (parseFloat(f.armadura.esp)||0);
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
    equip:[], notas:'', habilidadesIniciais:[]
  };
}

// Helpers de classe/nível (multiclasse)
function nivelTotal(f){ return (f.classesNiveis||[]).reduce((s,c)=>s+c.nivel,0) || 1; }
function classeDisplay(f){
  if(!f.classesNiveis || f.classesNiveis.length===0) return '—';
  return f.classesNiveis.map(c=>c.classe+' '+c.nivel).join(' / ');
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
function armasComMestreEmArma(f){
  return (f.poderesClasse||[]).filter(p=> p.nome==='Mestre em Arma' && p.sub).map(p=>p.sub);
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

function testeAtaqueArma(f, arma){
  const nomePericia = arma.pericia || (arma.distancia ? 'Pontaria' : 'Luta');
  const periciaInfo = PERICIAS.find(p=>p.nome===nomePericia);
  if(!periciaInfo) return 0;
  const base = periciaValor(f, periciaInfo);
  const bonusMelhoria = arma.bonusTesteExtra||0;
  return (proficienteComArma(f, arma) ? base : base - 5) + bonusMelhoria;
}
// Bônus de dano = Força somada em armas corpo a corpo e de arremesso (não em armas de disparo,
// a menos que tenha um poder que mude isso, como Acuidade com Arma ou Estilo de Disparo/Arremesso)
function bonusDanoArma(f, arma){
  const nomes = poderesAtivos(f);
  const acuidade = nomes.includes('Acuidade com Arma'); // usa Destreza em vez de Força (armas leves/arremesso)
  const estiloDisparo = nomes.includes('Estilo de Disparo'); // soma Destreza no dano de disparo
  const estiloArremessoPotente = nomes.includes('Arremesso Potente'); // soma Força no dano de arremesso
  const isArremesso = arma.distancia && (arma.alcance==='Curto' || arma.alcance==='Médio') && !['Arco curto','Arco longo','Besta leve','Besta pesada','Pistola','Mosquete','Rede'].includes(arma.n||arma.nome);
  const bonusMelhoria = arma.bonusDanoExtra||0;

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
  return bonusAtributo + bonusMelhoria;
}

// ---- Itens Vestidos (limite de 4 simultâneos com benefício ativo — regra do livro, pág. 146) ----
// Armadura conta como 1 item vestido, exceto para raças com corpo acoplado (Golem).
function armaduraContaComoVestido(f){
  const racaObj = getRacaObj(f);
  const imune = racaObj && racaObj.armaduraNaoContaVestido;
  return !!(f.armadura && f.armadura.equipado!==false && !imune);
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
function itensVestidosAtivos(f){ return itensVestidosTodos(f).slice(0,4); }
function itensVestidosExcedentes(f){ return itensVestidosTodos(f).slice(4); }
function slotsVestidosUsados(f){ return itensVestidosTodos(f).length; }
// Bônus de perícia vindo de itens vestidos ativos (só os 4 primeiros contam; regra do livro)
function bonusPericiaDeItensVestidos(f, periciaNome){
  let total = 0;
  itensVestidosAtivos(f).forEach(fonte=>{
    if(fonte.catalogo && fonte.catalogo.bonusPericia && fonte.catalogo.bonusPericia.nome===periciaNome){
      total += fonte.catalogo.bonusPericia.valor;
    }
  });
  return total;
}

function nomesPoderesConhecidos(f){
  const nomes = [];
  if(f.poderGeral) nomes.push(f.poderGeral.sub || f.poderGeral.nome);
  if(f.poderGeralExtra) nomes.push(f.poderGeralExtra.sub || f.poderGeralExtra.nome);
  if(f.poderRaca) nomes.push(f.poderRaca.sub || f.poderRaca.nome);
  if(f.origemPoder) nomes.push(f.origemPoder.nome); // poder único da origem — não é poder geral, mas conta como conhecido
  (f.poderesClasse||[]).forEach(p=>{ if(p.nome) nomes.push(p.sub || p.nome); });
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
      f.habilidadesIniciais = racaObj ? racaObj.poderes.map(([nome,desc])=>({fonte:'Raça: '+f.raca, nome, desc})) : [];
    }
  });
}
async function carregarPerfis(){
  state.perfis = await carregarPerfisArmazenamento();
  aplicarMigracoesPerfis();
}
async function salvarPerfis(){
  await salvarPerfisArmazenamento(state.perfis);
}

async function iniciar(){
  if(precisaCodigoJogador() && !obterCodigoJogador()){
    render(); // mostra a tela de código sem tentar carregar nada ainda
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
    'Seu código liga seus personagens a você — use o mesmo código em qualquer aparelho pra continuar de onde parou. Se você for o mestre da mesa, digite "Mestre".'
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
    render();
    return;
  }
  state._carregandoCodigo = true; render();
  await carregarPerfis();
  state._carregandoCodigo = false;
  state.screen = 'perfis';
  render();
}

// Sai do código atual — volta pra tela de entrada (não apaga nada da planilha, só "desloga" o aparelho)
function sairDoCodigoJogador(){
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

  root.innerHTML = '';
  if(precisaCodigoJogador() && !obterCodigoJogador()){
    root.appendChild(renderEntradaCodigoScreen());
  }
  else if(state.screen==='perfis') root.appendChild(renderPerfisScreen());
  else if(state.screen==='wizard') root.appendChild(renderWizardScreen());
  else if(state.screen==='ficha') root.appendChild(renderFichaScreen());
  else if(state.screen==='mestre') root.appendChild(renderMestreScreen());
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
  // O navegador às vezes ajusta a rolagem sozinho de forma assíncrona (ex: ao focar um elemento
  // ou reposicionar depois de um clique), o que pode desfazer a restauração acima. Reaplicamos
  // em dois "próximos quadros" seguidos, garantindo que a nossa restauração vença por último,
  // mesmo se o navegador levar mais de um ciclo pra fazer o próprio ajuste automático.
  const reaplicar = ()=>{
    window.scrollTo(0, scrollJanela);
    const sheetNovo2 = document.querySelector('.menu-sheet');
    if(sheetNovo2 && scrollSheet!=null) sheetNovo2.scrollTop = scrollSheet;
  };
  const proximoQuadro = (typeof requestAnimationFrame === 'function') ? requestAnimationFrame : (cb)=>setTimeout(cb, 16);
  proximoQuadro(()=>{ reaplicar(); proximoQuadro(reaplicar); });
}

// ============ TELA DE PERFIS ============
function renderPerfisScreen(){
  const wrap = el('div',{class:'perfis-screen'});
  wrap.appendChild(el('div',{class:'tormenta-logo'}, 'Tormenta'));
  wrap.appendChild(el('div',{class:'perfis-title'},'Painel do Aventureiro'));

  if(state._carregandoInicial){
    wrap.appendChild(el('div',{class:'panel faixa', style:'max-width:380px;text-align:center;'},
      el('div',{style:'font-size:2rem;margin-bottom:8px;'}, '⏳'),
      el('div',{class:'wizard-title', style:'font-size:1rem;'}, 'Carregando seus personagens...'),
      state._carregandoDemorando ? el('div',{class:'tip', style:'margin-top:10px;'}, 'Isso está demorando mais que o normal — o Google às vezes leva alguns segundos pra "acordar" depois de um tempo sem uso. Aguenta mais um pouco.') : null
    ));
    return wrap;
  }

  if(state._carregandoAtualizacao){
    wrap.appendChild(el('div',{class:'tip', style:'text-align:center;max-width:380px;margin:0 auto 14px;'},
      '🔄 Atualizando com a planilha' + (state._carregandoDemorando ? ' (o Google está demorando mais que o normal...)' : '...')
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
    }},
      el('div',{class:'perfil-avatar', style: p.foto ? '' : 'background:'+corAvatar(p.id)+';'}, p.foto ? el('img',{src:p.foto, style:'width:100%;height:100%;object-fit:cover;border-radius:inherit;'}) : (p.nome||'?').slice(0,1).toUpperCase()),
      el('div',{class:'perfil-nome'}, p.nome||'Sem nome'),
      el('div',{class:'perfil-sub'}, (p.raca||'—')+' · '+classeDisplay(p))
    );
    cardWrap.appendChild(card);
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
