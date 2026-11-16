// ============ STATUS (15/11/2026, prancha "Defesa e companhia", variante B) ============
// O antigo painel Vida & Mana passa a se chamar Status (a aba continua Ficha). Aqui moram:
//   · Vida · Defesa · Mana: os dois anéis e o escudo da Defesa encaixado entre eles, por baixo;
//     tocar no escudo abre a conta (o painel Defesa separado deixou de existir);
//   · Nas mãos: a mão principal e a outra mão, a linha de ataque de cada arma com os números já
//     ajustados pelo Ataque Poderoso ligado, e trocar de arma num toque (substitui Itens Equipados);
//   · Parceiros: uma linha cada, com o nível em bolinhas; os que se usam na mesa (montaria,
//     quem gasta PM) também ganham uma ficha no Em jogo.

// ---- Vida · Defesa · Mana ----
function renderVidaDefesaMana(f){
  const aberta = state._defesaAberta===f.id;
  const afetado = defesaTotal(f) < defesaSemCondicoes(f);
  const escudo = el('button',{class:'escudo-def'+(aberta?' aberto':'')+(afetado?' afetado':''), 'aria-label':'Defesa '+defesaTotal(f)+', tocar para ver a conta', onclick:()=>{ state._defesaAberta = aberta ? null : f.id; render(); }});
  escudo.innerHTML = '<svg viewBox="0 0 58 64" aria-hidden="true"><path d="M29 3 L53 11 V30 C53 45 42 56 29 61 C16 56 5 45 5 30 V11 Z" class="esc-fundo"/><path d="M29 8 L48 14.5 V30 C48 42 39.5 51 29 55.5" class="esc-brilho"/></svg>';
  escudo.appendChild(el('span',{class:'esc-num'}, String(defesaTotal(f)), el('small',{}, 'DEFESA')));
  const rdCurto = typeof resumoReducaoDano==='function' ? resumoReducaoDano(f) : '';
  if(rdCurto) escudo.appendChild(el('span',{class:'esc-rd'}, rdCurto));
  return el('div',{},
    el('div',{class:'vdm'}, renderAnel(f, 'pv'), renderAnel(f, 'pm'), escudo),
    aberta ? renderGavetaDefesa(f) : null,
    el('div',{class:'aneis-ajuda'},
      el('span',{}, el('b',{}, 'Girar no anel'), ' horário soma, anti-horário tira'),
      el('span',{}, el('b',{style:'color:#ffc9c9;'}, 'Girar por fora'), ' temporário'),
      el('span',{}, el('b',{style:'color:var(--gold);'}, 'Segurar o centro'), ' desfaz')));
}
// A conta da Defesa, só com as parcelas que existem, e a armadura com "guardar" em link.
function renderGavetaDefesa(f){
  const pesada = usaArmaduraPesada(f);
  const des = parseInt(f.des)||0;
  const partes = [['Base', 10]];
  if(pesada) partes.push(['Destreza (armadura pesada)', 0]);
  else if(des) partes.push(['Destreza', des]);
  if(f.armadura) partes.push([nomeBaseItem(f.armadura.nome), parseInt(f.armadura.def)||0]);
  if(f.escudo) partes.push([nomeBaseItem(f.escudo.nome), (parseInt(f.escudo.def)||0) + bonusEscudoPoderes(f)]);
  if(bonusDefesaPoderes(f)) partes.push(['Poderes', bonusDefesaPoderes(f)]);
  if(bonusDefesaRaca(f)) partes.push(['Raça', bonusDefesaRaca(f)]);
  const outros = parseInt(f.defOutros)||0;
  const soma = partes.reduce((t,p)=> t+p[1], 0) + outros;
  const total = defesaTotal(f);
  const sinal = (v)=> (v>=0?'+':'')+v;
  const linhas = partes.map(([n,v], i)=> [el('span',{}, n), el('b',{}, i===0 ? String(v) : sinal(v))]);
  if(total !== soma) linhas.push([el('span',{}, 'Condições, itens e parceiros'), el('b',{}, sinal(total-soma))]);
  const mudarOutros = (d)=>{ f.defOutros = outros + d; salvarPerfis(); render(); };
  const filhos = [
    el('div',{class:'conta-def'}, linhas.flat(),
      el('span',{}, 'Outros'),
      el('b',{}, el('span',{class:'qtd-step'}, el('button',{'aria-label':'menos um', onclick:()=>mudarOutros(-1)}, '−'), el('b',{class:'num'}, sinal(outros)), el('button',{'aria-label':'mais um', onclick:()=>mudarOutros(1)}, '+'))),
      el('span',{class:'tot'}, 'Total'), el('b',{class:'tot'}, String(total)))];
  const rdTxt = typeof resumoReducaoDano==='function' ? resumoReducaoDano(f) : '';
  if(rdTxt) filhos.push(el('div',{}, el('b',{}, 'Redução de dano: '+rdTxt+'. '), reducaoDanoPoderes(f).map(r=> r.fonte+(r.tipo ? ' ('+r.tipo+')' : '')).filter((v,i,a)=> a.indexOf(v)===i).join(', ')+'. Tire esse valor de cada dano que sofrer.'));
  const pen = penalidadeTotal(f);
  if(pen) filhos.push(el('div',{}, el('b',{}, 'Penalidade '+pen+'. '), (pesada ? 'Armadura pesada: sem Destreza na Defesa'+(getRacaObj(f)&&getRacaObj(f).deslocamentoImune?'':' e −3m de deslocamento')+'. ' : '')+'Vale em Acrobacia, Furtividade, Ladinagem e natação.'+(penalidadeArmaduraRaca(f) ? ' Inclui '+penalidadeArmaduraRaca(f)+' fixo do corpo de '+f.raca+'.' : '')));
  if(f.armadura) filhos.push(el('div',{class:'linha-equip'}, el('span',{}, '🛡️ '+nomeBaseItem(f.armadura.nome)+' +'+f.armadura.def, f.armadura.superior && f.armadura.melhoriasTxt ? el('small',{}, f.armadura.melhoriasTxt) : null), el('button',{class:'link-editar-item', onclick:guardarArmaduraNaMochila}, 'guardar')));
  else filhos.push(el('div',{class:'meta-ej'}, 'Sem armadura: equipe uma pela Mochila.'));
  return el('div',{class:'gaveta gaveta-ej'}, filhos);
}

// ---- Nas mãos ----
// Tudo o que está empunhado, com quantas mãos ocupa.
function empunhados(f){
  const lista = [];
  (f.armas||[]).forEach((a, i)=> lista.push({tipo:'arma', i, item:a, maos:a.maos||1}));
  (f.esotericos||[]).forEach((e, i)=>{ if(e.equipado!==false) lista.push({tipo:'esoterico', i, item:e, maos:e.maos||1}); });
  if(f.escudo && f.escudo.equipado!==false) lista.push({tipo:'escudo', i:0, item:f.escudo, maos:1});
  return lista;
}
// Os números da arma, já com o Ataque Poderoso ligado (−2 no ataque, +5 no dano, corpo a corpo).
function numerosAtaque(f, a){
  const efetivo = danoEfetivoArma(f, a);
  const bonus = bonusDanoArma(f, a);
  const poderoso = modoLigado(f, 'Ataque Poderoso') && !a.distancia;
  const teste = testeAtaqueArma(f, a) - (poderoso ? 2 : 0);
  const extra = bonus + (poderoso ? 5 : 0);
  return {teste, dano: efetivo.dano + (extra ? (extra>0?'+':'')+extra : ''), nota: efetivo.nota, poderoso};
}
function guardarEmpunhado(e){
  if(e.tipo==='arma') guardarArmaNaMochila(e.i);
  else if(e.tipo==='esoterico') guardarEsotericoNaMochila(e.i);
  else guardarEscudoNaMochila();
}
// Trocar num toque: guarda o que está naquela mão e empunha o escolhido (o equipar já libera as
// outras mãos se a arma nova for de duas mãos).
function trocarNaMao(f, atual, idxMochila){
  const row = f.equip[idxMochila]; if(!row) return;
  if(atual) guardarEmpunhado(atual); // vai para o fim da mochila: o índice escolhido não muda
  state._maoAberta = null;
  if(row.tipo==='esoterico') equiparEsotericoDaMochila(idxMochila); else equiparDaMochila(idxMochila);
}
function opcoesDeTroca(f){
  return (f.equip||[]).map((row, idx)=> ({row, idx})).filter(x=> ['arma','escudo','esoterico'].includes(x.row.tipo));
}
function renderNasMaos(f){
  const lista = empunhados(f);
  const slots = [];
  const maosUsadas = lista.reduce((t,e)=> t+e.maos, 0);
  lista.forEach((e, k)=> slots.push({e, rotulo: e.maos>=2 ? 'As duas mãos' : (k===0 ? 'Mão principal' : 'Outra mão')}));
  if(maosUsadas < 2) slots.push({e:null, rotulo: lista.length ? 'Outra mão' : 'Mãos livres'});
  const grade = el('div',{class:'maos'});
  slots.forEach((s, k)=> grade.appendChild(renderMao(f, s, k)));
  const corpo = [grade];
  const aberta = slots[state._maoAberta];
  if(state._maoAberta!=null && aberta) corpo.push(renderGavetaMao(f, aberta));
  corpo.push(renderLinhaManobras(f));
  return el('div',{class:'panel faixa'}, el('h2',{}, 'Nas mãos'), corpo);
}
function renderMao(f, s, k){
  const e = s.e;
  const sel = state._maoAberta===k;
  const abrir = ()=>{ state._maoAberta = sel ? null : k; render(); };
  if(!e) return el('button',{class:'mao livre'+(sel?' sel':''), onclick:abrir}, el('span',{class:'q'}, s.rotulo), el('span',{class:'d'}, '+ empunhar algo da mochila'));
  const it = e.item;
  const base = it.refBase || it.ref || nomeBaseItem(it.nome);
  const filhos = [el('span',{class:'q'}, s.rotulo), el('span',{class:'it com-ladrilho'}, ladrilhoItem(base, e.tipo, !!(it.superior || it.melhoriasTxt)), nomeBaseItem(it.nome))];
  let mod = false;
  if(e.tipo==='arma'){
    const n = numerosAtaque(f, it);
    mod = n.poderoso;
    filhos.push(el('span',{class:'at'}, el('b',{}, (n.teste>=0?'+':'')+n.teste), el('span',{}, n.dano)));
    filhos.push(el('span',{class:'d'}, [it.critico, it.distancia ? (it.alcance||'distância') : 'corpo a corpo'].filter(Boolean).join(' · ')));
    if(!proficienteComArma(f, it)) filhos.push(el('span',{class:'d aviso-ej'}, 'sem proficiência (−5 já aplicado)'));
    if(mod) filhos.push(el('span',{class:'tag-modo'}, 'Ataque Poderoso'));
    if(temInjecao(it)) filhos.push(el('span',{class:'d injecao-mini'}, '💉 '+((it.injecao||[]).length ? it.injecao.join(', ') : 'injeção vazia')));
  } else if(e.tipo==='escudo'){
    filhos.push(el('span',{class:'d'}, '+'+((parseInt(it.def)||0)+bonusEscudoPoderes(f))+' na Defesa'));
  } else {
    const efeito = (buscarItemEmpunhavel(it.refBase||it.nome)||{}).desc;
    if(efeito) filhos.push(el('span',{class:'d'}, efeito));
  }
  return el('button',{class:'mao'+(e.maos>=2?' duas':'')+(mod?' mod':'')+(sel?' sel':''), onclick:abrir}, filhos);
}
function renderGavetaMao(f, s){
  const e = s.e;
  const filhos = [];
  if(e){
    const it = e.item;
    if(it.superior && it.melhoriasTxt) filhos.push(el('div',{class:'meta-ej'}, '⭐ '+it.melhoriasTxt));
    if(e.tipo==='arma'){
      const n = numerosAtaque(f, it);
      if(n.nota) filhos.push(el('div',{class:'meta-ej'}, n.nota));
      if(temInjecao(it)) filhos.push(renderInjecao(f, it));
      const municao = municaoDaArma(f, it);
      if(municao) filhos.push(el('div',{class:'linha-equip'}, el('span',{style: municao.qtd<=0 ? 'color:var(--red-bright);' : ''}, '🏹 '+municao.nome+': '+municao.qtd+(municao.qtd<=0?' (acabou)':'')),
        municao.qtd>0 ? el('button',{class:'btn ghost btn-mini', onclick:()=> gastarMunicao(f, municao.idx)}, 'Disparar (−1)') : null));
    }
    if(e.tipo==='esoterico') detalhesEsoterico(f, it).forEach(x=> filhos.push(x));
  }
  const opcoes = opcoesDeTroca(f);
  if(opcoes.length){
    filhos.push(el('div',{class:'pergunta'}, e ? 'Trocar por:' : 'Empunhar:'));
    filhos.push(el('div',{class:'opc-troca'}, opcoes.map(({row, idx})=>{
      const cat = row.tipo==='arma' ? ARMAS.find(a=> a.n===row.ref) : row.tipo==='esoterico' ? buscarItemEmpunhavel(row.ref) : null;
      const maos = row.tipo==='escudo' ? 1 : ((cat && cat.maos) || 1);
      const usaGolpe = (f.poderesClasse||[]).some(p=> p.golpeConstruido && p.golpeConstruido.arma && p.golpeConstruido.arma===row.ref);
      return el('button',{onclick:()=> trocarNaMao(f, e, idx)},
        el('span',{}, nomeBaseItem(row.item)), el('small',{}, (maos>=2 ? 'duas mãos' : 'uma mão')+(usaGolpe ? ' · seu Golpe Pessoal usa esta' : '')));
    })));
  } else if(!e){
    filhos.push(el('div',{class:'meta-ej'}, 'Nada para empunhar na mochila: busque no catálogo.'));
  }
  filhos.push(el('div',{class:'links-item'},
    e ? el('button',{class:'link-editar-item', onclick:()=>{ state._maoAberta = null; guardarEmpunhado(e); }}, 'guardar na mochila') : null,
    el('button',{class:'link-editar-item', onclick:()=>{ state._maoAberta = null; render(); }}, 'fechar')));
  return el('div',{class:'gaveta gaveta-ej'}, filhos);
}
// Harmonizado, escola de foco e Vigilante do esotérico (vindos do antigo painel Itens Equipados).
function detalhesEsoterico(f, eso){
  const extras = [];
  const temHarmonizado = (eso.efeito||[]).some(ef=> ef.tipo==='custo_pm_magia');
  if(temHarmonizado){
    if(eso.magiaHarmonizada) extras.push(el('div',{class:'meta-ej'}, '🎵 Harmonizado com "'+eso.magiaHarmonizada+'": essa magia custa 1 PM a menos.'));
    const conhecidas = f.magias||[];
    if(conhecidas.length){
      const selH = el('select',{onchange:(ev)=>{ eso.magiaHarmonizada = ev.target.value||null; salvarPerfis(); render(); }});
      selH.appendChild(el('option',{value:''}, eso.magiaHarmonizada ? 'Trocar a magia harmonizada...' : 'Escolha a magia harmonizada...'));
      conhecidas.forEach(m=> selH.appendChild(el('option',{value:m.n, selected: eso.magiaHarmonizada===m.n}, m.n)));
      extras.push(selH);
    }
  }
  if((eso.efeito||[]).some(ef=> ef.tipo==='defesa_esoterico')) extras.push(el('div',{class:'meta-ej'}, '🛡️ Vigilante: +2 na Defesa (já somado).'));
  if((eso.efeito||[]).some(ef=> ef.tipo==='cd_arcana_escola')){
    const sel = el('select',{onchange:(ev)=>{ eso.escolaFoco = ev.target.value; salvarPerfis(); render(); }});
    sel.appendChild(el('option',{value:''}, 'Escolha a escola de foco...'));
    Object.keys(ESCOLAS).forEach(esc=> sel.appendChild(el('option',{value:esc, selected: eso.escolaFoco===esc}, esc)));
    extras.push(sel);
  }
  return extras;
}

// ---- Parceiros ----
const ICONE_PARCEIRO = {Adepto:'✨', Ajudante:'🤝', Assassino:'🗡️', Atirador:'🏹', Combatente:'⚔️', Destruidor:'💥', 'Fortão':'💪', 'Guardião':'🛡️', Magivocador:'🔥', 'Médico':'⚕️', Perseguidor:'🐺', Vigilante:'👁️'};
const NIVEIS_PARCEIRO = ['iniciante','veterano','mestre'];
function infoParceiro(p){
  return p.fonteAmeacasArton ? PARCEIROS_AMEACAS_ARTON.find(t=> t.nome===p.fonteAmeacasArton)
    : p.ehMontaria ? MONTARIA_TIPOS_ESPECIFICOS.find(m=> m.nome===p.tipoMontaria)
    : PARCEIRO_TIPOS.find(t=> t.nome===p.tipo);
}
// O que o parceiro faz no nível atual. "Como acima, e…" junta com o texto dos níveis anteriores.
function textoParceiro(p){
  const info = infoParceiro(p); if(!info || !info.niveis) return '';
  const ate = Math.max(0, NIVEIS_PARCEIRO.indexOf(p.poder));
  let txt = String(info.niveis[NIVEIS_PARCEIRO[ate]]||'');
  for(let k=ate-1; k>=0 && /^Como acima/i.test(txt); k--){
    txt = String(info.niveis[NIVEIS_PARCEIRO[k]]||'').replace(/\.$/,'') + '; ' + txt.replace(/^Como acima,?\s*(e\s+)?/i,'');
  }
  return txt;
}
function iconeParceiro(p){ return p.ehMontaria ? '🐎' : (ICONE_PARCEIRO[p.tipo] || '🐾'); }
// Custos em PM que o parceiro pede na mesa, somando os níveis até o atual ("Como acima, e 2 PM…").
// "–1 PM" (desconto do Adepto) não conta.
function custosParceiro(p){
  const info = infoParceiro(p); if(!info || !info.niveis) return [];
  const ate = NIVEIS_PARCEIRO.indexOf(p.poder);
  const custos = [];
  NIVEIS_PARCEIRO.slice(0, ate+1).forEach(n=>{
    const txt = String(info.niveis[n]||'');
    const re = /(^|[^–\-+\d])(\d+) PM/g; let m;
    while((m = re.exec(txt))) custos.push(parseInt(m[2]));
  });
  return [...new Set(custos)].sort((a,b)=> a-b);
}
// Fichas dos parceiros no Em jogo: montaria (Montado liga e desliga) e quem gasta PM.
function parceirosEmJogo(f){
  const lista = [];
  parceirosAtivos(f).forEach((p, idx)=>{
    if(p.ehMontaria) lista.push({tipo:'montaria', p, idx});
    const custos = custosParceiro(p);
    if(custos.length) lista.push({tipo:'pm', p, idx, custos});
  });
  return lista;
}
function usarParceiro(f, p, custo){
  custo = parseInt(custo)||0;
  const d = dadosAnel(f, 'pm');
  if(d.atual + d.temp < custo){ flashMsg('Mana insuficiente: precisa de '+custo+' PM.'); return; }
  const r = previaAnel(d, 'base', -custo);
  f.pmtemp = r.temp; f.pmatual = r.atual;
  registrarLog(f, 'Usou o parceiro '+p.nome+' (−'+custo+' PM)');
  state._ejSel = null; state._ejValor = null;
  salvarPerfis();
  if(typeof Som!=='undefined') Som.tocar('brilho');
  flashMsg('🐾 '+p.nome+': −'+custo+' PM. O efeito é rolado na mesa.');
  render();
}
function alternarMontado(f, p){
  p.montadoAgora = !p.montadoAgora;
  registrarLog(f, p.montadoAgora ? 'Montou em '+p.nome : 'Desmontou de '+p.nome);
  salvarPerfis(); render();
  flashMsg(p.montadoAgora ? '🐎 Montado em '+p.nome+': bônus da montaria valendo.' : 'Desmontou de '+p.nome+'.');
}
function renderGavetaParceiroEmJogo(f, x){
  const texto = textoParceiro(x.p);
  const opcoes = x.custos;
  if(state._ejValor==null || !opcoes.includes(state._ejValor)) state._ejValor = opcoes.length===1 ? opcoes[0] : null;
  const v = state._ejValor;
  return el('div',{class:'gaveta gaveta-ej'},
    el('div',{}, el('b',{}, x.p.nome+'. '), texto),
    opcoes.length>1 ? el('div',{class:'teclas'}, opcoes.map(c=> el('button',{class: v===c ? 'on' : '', onclick:()=>{ state._ejValor = c; render(); }}, String(c)))) : null,
    el('div',{class:'duo'},
      el('button',{class:'btn ghost', onclick:()=>{ state._ejSel = null; state._ejValor = null; render(); }}, 'Fechar'),
      el('button',{class:'btn', disabled: !v, onclick:()=> usarParceiro(f, x.p, v)}, v ? 'Usar · −'+v+' PM' : 'Escolha os PM')));
}
function renderPainelParceiros(f){
  const ativos = parceirosAtivos(f);
  const limite = limiteParceiros(f);
  const temPoderFamiliar = nomesPoderesConhecidos(f).includes('Familiar');
  const fam = familiarAtivo(f);
  return renderSecaoNotasColapsavel('parceiros-ativos', '🐾', 'Parceiros', (ativos.length+'/'+limite)+(fam?' + familiar':''), ()=>{
    const corpo = [];
    if(temPoderFamiliar && fam && !state._escolhendoFamiliar){
      const aberto = state._parceiroAberto==='familiar';
      corpo.push(el('button',{class:'pc', onclick:()=>{ state._parceiroAberto = aberto ? null : 'familiar'; render(); }},
        el('span',{class:'ic'}, '✨'), el('span',{class:'nm'}, fam.nome, el('small',{}, 'Familiar · '+fam.efeito)), el('span',{class:'meta'}, fam.auto ? '⚡' : '')));
      if(aberto) corpo.push(el('div',{class:'gaveta gaveta-ej'},
        el('div',{}, fam.auto ? '⚡ Já entra sozinho nos cálculos.' : 'Familiar Arcano: efeito fixo, sem nível.'),
        el('div',{class:'links-item'},
          el('button',{class:'link-editar-item', onclick:()=>{ state._escolhendoFamiliar = true; render(); }}, 'trocar'),
          el('button',{class:'link-editar-item remover', onclick:()=>{ if(!confirm('Remover o familiar '+fam.nome+'?')) return; registrarLog(f, 'Perdeu o familiar: '+fam.nome); f.familiarEscolhido = null; salvarPerfis(); render(); }}, 'remover'))));
    }
    if(temPoderFamiliar && (!fam || state._escolhendoFamiliar)){
      if(!state._escolhendoFamiliar){
        corpo.push(el('button',{class:'btn ghost', onclick:()=>{ state._escolhendoFamiliar = true; render(); }}, '✨ Escolher o familiar'));
      } else {
        corpo.push(el('div',{class:'pergunta'}, 'Escolha o familiar (⚡ já entra nos cálculos):'));
        corpo.push(el('div',{class:'opc-troca'}, FAMILIARES_ARCANOS.map(x=> el('button',{onclick:()=>{ f.familiarEscolhido = x.nome; registrarLog(f, 'Familiar escolhido: '+x.nome); state._escolhendoFamiliar = false; salvarPerfis(); render(); }},
          el('span',{}, x.nome+(x.auto?' ⚡':'')), el('small',{}, x.efeito)))));
        corpo.push(el('button',{class:'link-editar-item', onclick:()=>{ state._escolhendoFamiliar = false; render(); }}, 'cancelar'));
      }
    }
    ativos.forEach((p, idx)=>{
      const bonus = textoParceiro(p);
      const nivel = NIVEIS_PARCEIRO.indexOf(p.poder) + 1;
      const aberto = state._parceiroAberto===idx;
      corpo.push(el('button',{class:'pc'+(p.ehMontaria && p.montadoAgora ? ' on' : ''), onclick:()=>{ state._parceiroAberto = aberto ? null : idx; render(); }},
        el('span',{class:'ic'}, iconeParceiro(p)),
        el('span',{class:'nm'}, p.nome, el('small',{}, (p.ehMontaria ? 'Montaria · '+p.tipoMontaria : p.tipo)+(bonus ? ' · '+bonus : ''))),
        el('span',{class:'pips', 'aria-label':'nível '+p.poder}, [1,2,3].map(k=> el('i',{class: k<=nivel ? 'on' : ''})))));
      if(aberto){
        const ehAuto = ['Guardião','Combatente','Perseguidor','Vigilante','Ajudante'].includes(p.tipo);
        corpo.push(el('div',{class:'gaveta gaveta-ej'},
          el('div',{class:'seg3'}, NIVEIS_PARCEIRO.map((n, k)=> el('button',{class: p.poder===n ? 'on' : '', onclick:()=> alterarPoderParceiro(f, idx, n)}, ['Iniciante','Veterano','Mestre'][k]))),
          p.origem ? el('div',{}, 'Origem: '+p.origem) : null,
          ehAuto ? el('div',{class:'meta-ej'}, '⚡ O bônus fixo já entra nos cálculos.') : null,
          p.ehMontaria ? el('div',{class:'meta-ej'}, 'Montar e desmontar fica no Em jogo ("🐎 Montado").') : null,
          custosParceiro(p).length ? el('div',{class:'meta-ej'}, 'Gastar PM com '+p.nome+' fica no Em jogo.') : null,
          p.tipo==='Ajudante' ? el('div',{}, 'Perícias escolhidas: '+((p.periciasEscolhidas||[]).join(', ')||'nenhuma ainda')) : null,
          el('div',{class:'links-item'}, el('button',{class:'link-editar-item remover', onclick:()=>{ if(confirm('Remover o parceiro "'+p.nome+'"?')){ state._parceiroAberto = null; removerParceiro(f, idx); } }}, 'remover'))));
      }
    });
    if(!ativos.length && !temPoderFamiliar) corpo.push(el('div',{class:'empty'}, 'Nenhum parceiro ainda.'));
    if(ativos.length < limite) corpo.push(el('button',{class:'btn ghost', style:'margin-top:8px;', onclick:()=> abrirAdicionarParceiro()}, '+ Adicionar parceiro'));
    return corpo;
  }, ativos.length>0 || !!fam);
}

// ---- Injeção alquímica (Livro Básico, melhorias de arma) ----
// "Um ataque que acerte causa seu dano normal e libera uma carga de um preparado (como ácido ou
// fogo alquímico) ou de água benta, que atinge o alvo automaticamente. A melhoria tem espaço
// para 2 doses. Carregá-la exige uma ação completa e o gasto dos itens com os quais você
// quiser carregá-la." As doses ficam na arma (arma.injecao) e vão junto se ela for guardada.
const DOSES_INJECAO = 2;
function temInjecao(arma){ return /Inje[çc][ãa]o alqu[íi]mica/i.test((arma.melhoriasTxt||'')+' '+(arma.nome||'')); }
function preparadosParaInjecao(f){
  const vistos = {};
  (f.equip||[]).forEach(row=>{
    if(row.tipo!=='geral' || !(parseInt(row.qtd)>0)) return;
    const nome = nomeCatalogoDaLinha(row);
    const cat = ITENS_GERAIS.find(i=> i.n===nome);
    if(!(nome==='Água benta' || (cat && cat.cat==='Alquímico'))) return;
    vistos[nome] = (vistos[nome]||0) + (parseInt(row.qtd)||0);
  });
  return Object.keys(vistos).map(nome=> ({nome, qtd: vistos[nome], desc: (ITENS_GERAIS.find(i=> i.n===nome)||{}).desc || ''}));
}
function carregarInjecao(f, arma, nome){
  if(!arma.injecao) arma.injecao = [];
  if(arma.injecao.length >= DOSES_INJECAO){ flashMsg('A injeção já está cheia (2 doses).'); return; }
  if(!consumirUm(f, nome)){ flashMsg('Não tem mais '+nome+' na mochila.'); return; }
  arma.injecao.push(nome);
  registrarLog(f, 'Carregou a Injeção alquímica com '+nome+' ('+arma.injecao.length+'/'+DOSES_INJECAO+')');
  salvarPerfis();
  if(typeof Som!=='undefined') Som.tocar('gole');
  render();
}
function injetarDose(f, arma){
  if(!(arma.injecao||[]).length) return;
  const nome = arma.injecao.shift();
  const desc = (ITENS_GERAIS.find(i=> i.n===nome)||{}).desc || '';
  registrarLog(f, 'Injeção alquímica: '+nome+' no alvo'+(desc ? ' ('+desc+')' : ''));
  salvarPerfis();
  if(typeof Som!=='undefined') Som.tocar('fogo');
  flashMsg('💉 '+nome+' no alvo'+(desc ? ': '+desc : '')+'. Role na mesa.');
  render();
}
function renderInjecao(f, arma){
  const doses = arma.injecao||[];
  const abrindo = state._carregandoInjecao===arma;
  const opcoes = abrindo ? preparadosParaInjecao(f) : [];
  return el('div',{class:'injecao'},
    el('div',{class:'linha-equip'},
      el('span',{}, el('b',{}, '💉 Injeção alquímica '), doses.length+'/'+DOSES_INJECAO+(doses.length ? ': '+doses.join(', ') : ' (vazia)')),
      doses.length < DOSES_INJECAO ? el('button',{class:'link-editar-item', onclick:()=>{ state._carregandoInjecao = abrindo ? null : arma; render(); }}, abrindo ? 'fechar' : 'carregar') : null),
    doses.length ? el('button',{class:'btn btn-mini', onclick:()=> injetarDose(f, arma)}, 'Acertou: injetar '+doses[0]) : null,
    abrindo ? (opcoes.length
      ? el('div',{class:'opc-troca'}, el('div',{class:'pergunta'}, 'Carregar é uma ação completa e gasta o item da mochila:'), opcoes.map(o=> el('button',{onclick:()=> carregarInjecao(f, arma, o.nome)}, el('span',{}, o.nome+' ('+o.qtd+')'), el('small',{}, o.desc))))
      : el('div',{class:'meta-ej'}, 'Nenhum preparado alquímico ou água benta na mochila.')) : null);
}
