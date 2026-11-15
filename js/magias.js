// Magias: carta, custo, catalisadores, lançar e Golpe Pessoal em uso.
// Separado do js/ficha.js em 15/11/2026 (item 6 da revisão geral), sem mudar o código.

// ---- PERÍCIAS ----
// ---- MAGIAS ----
function magiasPorTradicao(trad){
  // trad: 'arcana' | 'divina' — magias Universais entram nas duas
  const alvo = trad==='arcana' ? 'Arcana' : 'Divina';
  return MAGIAS.filter(m => m.trad===alvo || m.trad==='Universal');
}

function renderCardMagia(s, grupoChave, aoAdicionar, aoRemover, fichaCtx, aoUsar){
  if(!state._acordeaoAberto) state._acordeaoAberto = {};
  const aberto = state._acordeaoAberto[grupoChave] === s.n;
  const card = el('div',{class:'spell-card'},
    el('div',{class:'head', style:'cursor:pointer;', onclick:()=>{ state._acordeaoAberto[grupoChave] = aberto ? null : s.n; render(); }},
      el('span',{class:'name'}, s.n, s.trad==='Universal' ? el('span',{class:'pill universal', style:'margin-left:6px;'}, '🔮 Universal') : null),
      el('div',{style:'display:flex;align-items:center;gap:8px;'},
        el('span',{class:'meta'}, s.c+'º círc. · '+s.e),
        aoRemover ? el('button',{class:'remove-x', onclick:(e)=>{ e.stopPropagation(); aoRemover(); }},'✕') : null
      )
    )
  );
  if(!aberto) return card;
  card.appendChild(el('div',{class:'desc'}, s.d));
  card.appendChild(el('div',{class:'magia-info-grid'},
    el('div',{}, el('span',{class:'magia-info-ico'},'⚡ Exec.'), el('span',{}, s.execucao||'—')),
    el('div',{}, el('span',{class:'magia-info-ico'},'🎯 Alcance'), el('span',{}, s.alcance||'—')),
    el('div',{}, el('span',{class:'magia-info-ico'},'🧿 Alvo'), el('span',{}, s.alvo||'—')),
    el('div',{}, el('span',{class:'magia-info-ico'},'⏱ Duração'), el('span',{}, s.duracao||'—')),
    el('div',{style:'grid-column:1/-1;'}, el('span',{class:'magia-info-ico'},'🛡 Resistência'), el('span',{}, s.resistencia||'—')),
  ));
  if(s.aprim && s.aprim.length>0){
    const aprimBox = el('div',{class:'tip'}, el('b',{},'Aprimoramentos'));
    s.aprim.forEach(a=> aprimBox.appendChild(el('div',{class:'power-item'}, el('b',{},a.custo), a.efeito)));
    card.appendChild(aprimBox);
  }
  let custoTxt, custoNota = null;
  if(fichaCtx){
    const custoAjustado = custoPMAjustado(fichaCtx, s);
    const custoBase = custoPM(s.c);
    custoTxt = custoAjustado;
    if(custoAjustado !== custoBase) custoNota = ' (base '+custoBase+', ajustado por item equipado)';
    const cdEsp = cdMagiaEspecifica(fichaCtx, s);
    if(cdEsp!=null){
      const cdBase = cdMagias(fichaCtx);
      card.appendChild(el('div',{class:'meta', style:'font-size:0.7rem;'}, 'CD para resistir: '+cdEsp+(cdEsp!==cdBase?' (base '+cdBase+', +itens equipados)':'')));
    }
  } else {
    custoTxt = custoPM(s.c);
  }
  card.appendChild(el('div',{style:'margin-top:8px;display:flex;justify-content:space-between;align-items:center;gap:8px;'},
    el('span',{class:'meta'}, 'custo: '+custoTxt+' PM'+(custoNota||'')),
    el('div',{style:'display:flex;gap:6px;'},
      aoUsar ? el('button',{class:'btn', style:'width:auto;padding:6px 12px;', onclick:(e)=>{ e.stopPropagation(); aoUsar(); }},'✨ Usar') : null,
      aoAdicionar ? el('button',{class:'btn', style:'width:auto;padding:6px 12px;', onclick:aoAdicionar},'+ Adicionar à ficha') : null
    )
  ));
  return card;
}

// Extrai o número de PM de um texto de custo de aprimoramento (ex: "+1 PM" -> 1). Alguns
// aprimoramentos têm custo diferente de PM puro (ex: "+2 PM por alvo adicional") — nesse caso
// pega só o primeiro número como aproximação; o jogador sempre pode ajustar o total na mão
// antes de confirmar, o campo fica editável.
function extrairCustoPM(custoTexto){
  const m = String(custoTexto||'').match(/(\d+)/);
  return m ? parseInt(m[1]) : 0;
}

function usarGolpePessoal(f, indicePoderesClasse){
  const row = f.poderesClasse[indicePoderesClasse];
  if(!row || !row.golpeConstruido) return;
  const custo = calcularCustoGolpePessoal(row.golpeConstruido.escolhas);
  const pmAtual = parseInt(f.pmatual)||0;
  if(custo > pmAtual){ flashMsg('Você não tem '+custo+' PM disponíveis (tem '+pmAtual+').'); return; }
  f.pmatual = pmAtual - custo;
  const nomeExibido = row.golpeConstruido.nomeGolpe || 'Golpe Pessoal';
  registrarLog(f, 'Usou "'+nomeExibido+'" (-'+custo+' PM)');
  salvarPerfis();
  flashMsg('⚔️ "'+nomeExibido+'" usado! -'+custo+' PM.');
  render();
}

function abrirUsarMagia(s){
  const f = fichaAtual();
  const custoBase = custoPMAjustado(f, s);
  state._usarMagiaPopup = {magia:s, aprimSelecionados:[], aprimExpandido:null, custoTotal:String(custoBase)};
  render();
}

// Catalisadores mágicos que dão bônus a uma magia específica no momento de lançar — achados
// numa auditoria, eram só texto. Os que aumentam CD numa escola específica (Musgo púrpura,
// Ossos de monstro, Saco de sal) entram como número de verdade na CD mostrada; os de dano extra
// (Baga-de-fogo, Líquen lilás, Terra de cemitério) o app não tem onde somar um total de dano em
// lugar nenhum, então só entram como lembrete no log ao usar.
const CATALISADORES_CD_ESCOLA = {
  'Musgo púrpura': 'Ilusão',
  'Ossos de monstro': 'Necromancia',
  'Saco de sal': 'Abjuração',
};
// Os que baratearam uma escola (Livro Básico pág. 92): -1 PM no custo da magia daquela escola.
const CATALISADORES_CUSTO_ESCOLA = {
  'Pó de cristal': 'Encantamento',
  'Pó de giz': 'Convocação',
  'Seixo de âmbar': 'Transmutação',
};
// Rótulo curto do efeito de um catalisador, para o log e os selos.
function rotuloCatalisador(nome){
  if(CATALISADORES_CD_ESCOLA[nome]) return '+2 CD';
  if(CATALISADORES_CUSTO_ESCOLA[nome]) return '-1 PM';
  return CATALISADORES_DANO_LEMBRETE[nome];
}

const CATALISADORES_DANO_LEMBRETE = {
  'Baga-de-fogo': '+1d6 de dano de fogo',
  'Líquen lilás': '+1d6 de dano de frio',
  'Terra de cemitério': '+1d6 de dano de trevas',
  'Dente-de-dragão': 'aumenta um dado de dano',
  'Essência abissal': 'dano de fogo sobe um passo de dado',
  'Ramo verdejante': '+1 PV por dado nas magias de cura',
  'Corrosivo Mineral': 'dano de ácido sobe um passo de dado',
  'Gelo Extremo': 'dano de frio sobe um passo de dado',
  'Raio Cristalizado': 'dano de eletricidade sobe um passo de dado',
  'Pedaço de Língua': '+1 na CD de Fortitude contra a magia',
};
// Lança uma magia: confere custo, limite por magia e mana; desconta do PM, consome catalisador,
// gasta a Liturgia Mágica ligada e anota no log. Usada pelo popup "Usar magia" e pela mesa de
// lançamento da carta no grimório, para as duas seguirem exatamente a mesma regra.
// fluxo = {custoTotal, aprimSelecionados, magiaPungenteAtiva, catalisadorEscolhido}.
function lancarMagia(f, s, fluxo){
  const limite = limitePMPorMagia(f, s);
  const total = parseInt(fluxo.custoTotal);
  if(isNaN(total) || total<0){ flashMsg('Coloca um custo válido primeiro.'); return false; }
  if(total > limite){ flashMsg('Isso passa do limite de '+limite+' PM numa magia só (seu nível'+((s.trad!=='Divina'&&limitePMExtraArcana(f)>0)?' + itens':'')+'). Escolha menos aprimoramentos.'); return false; }
  const pmAtual = parseInt(f.pmatual)||0;
  if(total > pmAtual){ flashMsg('Você não tem '+total+' PM disponíveis (tem '+pmAtual+').'); return false; }
  f.pmatual = pmAtual - total;
  // Consome o catalisador escolhido da mochila, se tiver
  let catalisadorTxt = '';
  if(fluxo.catalisadorEscolhido){
    const idxCat = f.equip.findIndex(row=> row.tipo==='geral' && nomeBaseItem(row.item)===fluxo.catalisadorEscolhido);
    if(idxCat>=0){
      const rowCat = f.equip[idxCat];
      const qtdCat = parseInt(rowCat.qtd)||1;
      if(qtdCat<=1) removerItemMochila(f, idxCat); else rowCat.qtd = String(qtdCat-1);
      catalisadorTxt = ' + '+fluxo.catalisadorEscolhido+' ('+rotuloCatalisador(fluxo.catalisadorEscolhido)+')';
    }
  }
  const sel = fluxo.aprimSelecionados || [];
  const aprimTxt = sel.length>0 ? ' com '+sel.length+' aprimoramento(s)' : '';
  const pungenteTxt = fluxo.magiaPungenteAtiva ? ' + Magia Pungente (+2 CD)' : '';
  const liturgiaTxt = f._liturgiaMagicaAtiva ? ' + Liturgia Mágica (+2 CD)' : '';
  f._liturgiaMagicaAtiva = false; // é "a próxima habilidade" -- consome sozinha depois de usada
  const textoLog = 'Usou "'+s.n+'"'+aprimTxt+pungenteTxt+liturgiaTxt+catalisadorTxt+' (-'+total+' PM)';
  registrarLog(f, textoLog);
  salvarPerfis();
  flashMsg('✨ "'+s.n+'" usada! -'+total+' PM.'+(catalisadorTxt?' Catalisador consumido.':''));
  animarMagiaLancada(s.n, {pmAntes:pmAtual, pmDepois:f.pmatual, texto:textoLog});
  if(typeof tocarFeitico==='function') tocarFeitico(s); // efeito de tela da magia (js/feiticos.js)
  return true;
}

function renderPopupUsarMagia(f){
  const fluxo = state._usarMagiaPopup;
  const s = fluxo.magia;
  const custoBase = custoPMAjustado(f, s);
  const limite = limitePMPorMagia(f, s);
  const overlay = el('div',{class:'menu-overlay', onclick:(e)=>{ if(e.target===e.currentTarget){ state._usarMagiaPopup=null; render(); } }});
  const sheet = el('div',{class:'menu-sheet'});
  sheet.appendChild(el('div',{class:'wizard-title', style:'padding:6px 14px 0;'}, '✨ Usar: '+s.n));
  const totalAtual = parseInt(fluxo.custoTotal)||0;
  sheet.appendChild(renderManaPrevia(f, totalAtual));
  const passouLimite = totalAtual > limite;
  const nivelBaseLimite = nivelParaLimitePM(f);
  const ehNivelDeClasse = nivelBaseLimite !== nivelTotal(f);
  const cdBase = cdMagiaEspecifica(f, s);
  if(!fluxo.magiaPungenteAtiva) fluxo.magiaPungenteAtiva = false;
  if(!fluxo.catalisadorEscolhido) fluxo.catalisadorEscolhido = null;
  const cdMostrada = cdBase!=null ? cdBase + (fluxo.magiaPungenteAtiva?2:0) + (f._liturgiaMagicaAtiva?2:0) + (fluxo.catalisadorEscolhido && CATALISADORES_CD_ESCOLA[fluxo.catalisadorEscolhido]===s.e ? 2 : 0) : null;
  sheet.appendChild(el('div',{class:'tip', style:'margin:6px 14px;'+(passouLimite?'border:1px solid var(--red-bright);':'')},
    // Números de PM na cor do recurso (mesmo azul dos cards de Mana na Ficha) — antes era tudo
    // texto genérico aqui, perdendo a associação visual rápida "azul = mana" que já existe lá.
    'Custo base: ', el('b',{style:'color:var(--pm-accent);'}, custoBase+' PM'),
    ' · Você tem: ', el('b',{style:'color:var(--pm-accent);'}, (parseInt(f.pmatual)||0)+' PM'),
    (cdMostrada!=null ? ' · CD pra resistir: '+cdMostrada : ''),
    ' · Limite por magia: ', el('b',{style:'color:var(--pm-accent);'}, limite+' PM'),
    ' ('+(ehNivelDeClasse?'seu nível na classe conjuradora':'seu nível')
    + ((s.trad!=='Divina'&&limitePMExtraArcana(f)>0)?', +'+limitePMExtraArcana(f)+' de item':'')
    + (limitePMExtraPorEscola(f, s.e)>0?', +'+limitePMExtraPorEscola(f, s.e)+' de item ('+s.e+')':'')
    + (poderesAtivos(f).includes('Magia Ilimitada')?', +'+(valorAtributoChaveMagia(f)||0)+' de Magia Ilimitada':'')
    + ')'
    + (passouLimite ? ' ⚠ o total atual passa do limite!' : '')
  ));
  // Deixa claro de onde veio o desconto quando um esotérico Harmonizado cobre justo essa magia —
  // sem isso o custo base aparecia menor do que o do círculo, sem explicação nenhuma.
  const esoHarmonizado = esotericosEquipados(f).find(e=> (e.efeito||[]).some(ef=>ef.tipo==='custo_pm_magia') && e.magiaHarmonizada===s.n);
  if(esoHarmonizado){
    sheet.appendChild(el('div',{class:'tip', style:'margin:0 14px 6px;color:var(--gold);'}, '🎵 '+esoHarmonizado.nome+' está harmonizado com esta magia: –1 PM já aplicado no custo base.'));
  }
  // Mesma ideia pros itens mágicos do Cap. 8 que mexem no custo (Cajado do Poder, Símbolo
  // abençoado, Joia da Alma, Chifre de Unicórnio).
  const ehArcanistaPopup = (f.classesNiveis||[]).some(c=>c.classe==='Arcanista');
  efeitosMagicosAtivos(f).forEach(ef=>{
    let txt = null;
    if(ef.tipo==='custo_pm_tradicao' && s.trad===ef.tradicao) txt = ef._item+': magias '+ef.tradicao.toLowerCase()+'s custam '+ef.valor+' PM (já aplicado).';
    if(ef.tipo==='custo_pm_magia_lista' && (ef.magias||[]).includes(s.n)) txt = ef._item+': esta magia custa '+ef.valor+' PM (já aplicado).';
    if(ef.tipo==='custo_pm_zero_arcanista' && ehArcanistaPopup && (s.trad==='Arcana'||s.trad==='Universal')) txt = ef._item+': magias arcanas custam 0 PM — só os aprimoramentos é que pesam.';
    if(txt) sheet.appendChild(el('div',{class:'tip', style:'margin:0 14px 6px;color:var(--gold);'}, '✦ '+txt));
  });

  // Magia Pungente (Arcanista) — "pode pagar 1 PM pra aumentar em +2 a CD". Achado numa
  // auditoria; só aparece pra quem realmente tem o poder.
  if(nomesPoderesConhecidos(f).includes('Magia Pungente')){
    sheet.appendChild(el('div',{style:'padding:0 14px;margin-top:8px;'},
      el('div',{class:'option-card'+(fluxo.magiaPungenteAtiva?' selected':''), style:'cursor:pointer;', onclick:()=>{
        fluxo.magiaPungenteAtiva = !fluxo.magiaPungenteAtiva;
        const extra = fluxo.magiaPungenteAtiva ? 1 : -1;
        fluxo.custoTotal = String((parseInt(fluxo.custoTotal)||0) + extra);
        render();
      }},
        el('span',{}, fluxo.magiaPungenteAtiva?'✓ ':'○ '), el('b',{},'Magia Pungente'), ' — +1 PM pra +2 na CD'
      )
    ));
  }

  if(f._liturgiaMagicaAtiva){
    sheet.appendChild(el('div',{class:'meta', style:'padding:0 14px;margin-top:8px;color:var(--gold);'}, '✓ Liturgia Mágica ativa — +2 CD já incluído acima, desliga sozinha ao confirmar.'));
  }

  // Catalisadores na mochila que combinam com essa magia (por escola, pros de CD; qualquer
  // magia, pros de dano — que só entram como lembrete no log, o app não soma dano em lugar
  // nenhum). Consome o item da mochila ao confirmar o uso.
  const catalisadoresDisponiveis = (f.equip||[]).filter(row=>{
    if(row.tipo!=='geral') return false;
    const nome = nomeBaseItem(row.item);
    if(CATALISADORES_CD_ESCOLA[nome]) return CATALISADORES_CD_ESCOLA[nome]===s.e;
    return !!CATALISADORES_DANO_LEMBRETE[nome];
  });
  if(catalisadoresDisponiveis.length>0){
    const catWrap = el('div',{style:'padding:0 14px;margin-top:8px;'}, el('label',{},'Catalisador (opcional — some da mochila ao usar)'));
    catalisadoresDisponiveis.forEach(row=>{
      const nome = nomeBaseItem(row.item);
      const marcado = fluxo.catalisadorEscolhido===nome;
      const rotulo = CATALISADORES_CD_ESCOLA[nome] ? '+2 na CD ('+CATALISADORES_CD_ESCOLA[nome]+')' : CATALISADORES_DANO_LEMBRETE[nome];
      catWrap.appendChild(el('div',{class:'option-card'+(marcado?' selected':''), style:'margin-top:4px;cursor:pointer;', onclick:()=>{
        fluxo.catalisadorEscolhido = marcado ? null : nome;
        render();
      }},
        el('span',{}, marcado?'✓ ':'○ '), el('b',{},nome), ' — '+rotulo
      ));
    });
    sheet.appendChild(catWrap);
  }

  if(s.aprim && s.aprim.length>0){
    const aprimWrap = el('div',{style:'padding:0 14px;'}, el('label',{},'Aprimoramentos (opcional — toque no ⓘ pra ver o que cada um faz)'));
    s.aprim.forEach((a,idx)=>{
      const marcado = fluxo.aprimSelecionados.includes(idx);
      const custoNum = extrairCustoPM(a.custo);
      const linha = el('div',{class:'option-card'+(marcado?' selected':''), style:'margin-top:6px;cursor:pointer;', onclick:()=>{
        if(marcado){ fluxo.aprimSelecionados = fluxo.aprimSelecionados.filter(i=>i!==idx); }
        else { fluxo.aprimSelecionados.push(idx); }
        // recalcula o total automaticamente — mas só se o jogador não tiver mexido no campo à mão
        const somaAprim = fluxo.aprimSelecionados.reduce((tot,i)=> tot+extrairCustoPM(s.aprim[i].custo), 0);
        fluxo.custoTotal = String(custoBase + somaAprim);
        render();
      }},
        el('div',{class:'row', style:'align-items:center;'},
          el('div',{style:'flex:1;'}, el('span',{},marcado?'✓ ':'○ '), el('b',{},a.custo)),
          el('button',{class:'btn ghost', style:'width:auto;padding:3px 8px;font-size:0.68rem;flex-shrink:0;', onclick:(e)=>{ e.stopPropagation(); fluxo.aprimExpandido = fluxo.aprimExpandido===idx?null:idx; render(); }}, fluxo.aprimExpandido===idx?'ocultar':'ⓘ o que faz')
        )
      );
      if(fluxo.aprimExpandido===idx){
        linha.appendChild(el('div',{class:'desc', style:'margin-top:6px;'}, a.efeito));
      }
      aprimWrap.appendChild(linha);
    });
    sheet.appendChild(aprimWrap);
  }

  sheet.appendChild(el('div',{style:'padding:10px 14px 0;'},
    el('label',{},'Total de PM a gastar'),
    el('input',{type:'number', value:fluxo.custoTotal, oninput:(e)=>{fluxo.custoTotal=e.target.value;}}),
    el('div',{class:'meta', style:'margin-top:2px;'}, 'Preenchido automaticamente pelos aprimoramentos marcados, mas pode ajustar na mão se precisar.')
  ));

  sheet.appendChild(el('button',{class:'btn', style:'margin:14px 14px 0;width:calc(100% - 28px);', onclick:()=>{
    if(!lancarMagia(f, s, fluxo)) return;
    state._usarMagiaPopup = null;
    render();
  }}, '✓ Confirmar uso'));
  sheet.appendChild(el('button',{class:'menu-close', style:'margin-top:10px;', onclick:()=>{ state._usarMagiaPopup=null; render(); }}, 'Cancelar'));
  overlay.appendChild(sheet);
  return overlay;
}
