// =========================================================================================
// Herói e Perícias (13/11/2026, prancha "Herói e Perícias"). Regra: ocupar pouca tela no
// celular e mostrar detalhe só ao tocar.
//  · Seleção: boas-vindas do herói (retrato com o anel do patamar, última sessão, continuar);
//  · Cartão do herói: painel Personagem em uma linha de topo + uma linha de fichas, com os
//    atributos na última linha; gaveta curta ao tocar; faixa fixa ao rolar a ficha;
//  · Perícias: resistências em pílulas, fixadas, filtro por situação, "Todas" por atributo e em
//    ordem alfabética; estrela depois do nome das treinadas; conta e usos só ao tocar.
// =========================================================================================

const TAMANHOS = ['Minúsculo','Pequeno','Médio','Grande','Enorme','Colossal'];
const ALINHAMENTOS = ['Leal e Bondoso','Neutro e Bondoso','Caótico e Bondoso','Leal e Neutro','Neutro','Caótico e Neutro','Leal e Maligno','Neutro e Maligno','Caótico e Maligno'];
const ORDEM_ATRIBUTOS_FICHA = ['for','des','con','int','sab','car'];
const RESISTENCIAS = ['Fortitude','Reflexos','Vontade'];
const SITUACOES_PERICIA = {
  'Combate':['Luta','Pontaria','Iniciativa','Acrobacia','Guerra','Atletismo'],
  'Social':['Diplomacia','Enganação','Intimidação','Intuição','Jogatina','Atuação','Nobreza'],
  'Exploração':['Atletismo','Acrobacia','Furtividade','Percepção','Sobrevivência','Cavalgar','Ladinagem','Investigação','Pilotagem','Adestramento'],
  'Saber':['Conhecimento','Guerra','Investigação','Nobreza','Religião','Cura','Ofício','Misticismo'],
  'Magia':['Misticismo','Conhecimento','Religião','Vontade'],
};

// ---- utilidades ----
function sinalNum(n){ n = parseInt(n)||0; return (n>=0?'+':'−')+Math.abs(n); }
function progressoPatamar(nivel){
  const p = patamarAtual(nivel);
  const proximo = PATAMARES[PATAMARES.indexOf(p)+1];
  const frac = (nivel - p.de + 1) / (p.ate - p.de + 1);
  return {patamar:p, proximo, frac:Math.max(0.04, Math.min(1, frac)), faltam: proximo ? proximo.de - nivel : 0};
}
function anelPatamar(f, tamanho){
  const {patamar, frac} = progressoPatamar(nivelTotal(f));
  const r = tamanho/2 - 3;
  const svg = '<svg viewBox="0 0 '+tamanho+' '+tamanho+'" aria-hidden="true"><circle cx="'+(tamanho/2)+'" cy="'+(tamanho/2)+'" r="'+r+'" fill="none" stroke="rgba(166,129,47,.3)" stroke-width="3"/><circle cx="'+(tamanho/2)+'" cy="'+(tamanho/2)+'" r="'+r+'" fill="none" stroke="'+patamar.cor+'" stroke-width="3" stroke-linecap="round" pathLength="100" stroke-dasharray="'+(frac*100).toFixed(1)+' 100" style="filter:brightness(1.6)"/></svg>';
  const s = el('span',{class:'anel-patamar'}); s.innerHTML = svg; return s;
}
function retratoHeroi(f, classe){
  return el('span',{class:'foto-heroi '+(classe||''), style: f.foto ? '' : 'background:'+corAvatar(f.id)+';'}, f.foto ? el('img',{src:f.foto, alt:''}) : (f.nome||'?').slice(0,1).toUpperCase());
}
function linhaSessao(f){
  try{
    const r = resumoUltimaSessao(f);
    if(!r) return null;
    const magia = r.slides.find(s=>s.tipo==='magia'), fav = r.slides.find(s=>s.tipo==='favorita'), vida = r.slides.find(s=>s.tipo==='vida');
    const partes = [];
    if(magia) partes.push(magia.lancamentos+' magia'+(magia.lancamentos>1?'s':''));
    if(fav) partes.push('a favorita foi '+fav.nome);
    if(vida && vida.dano) partes.push('levou '+vida.dano+' de dano');
    return partes.length ? partes.join(', ') : null;
  }catch(e){ return null; }
}
function ultimaAtividade(f){ return ((f.log||[])[0]||{}).ts || 0; }

// =========================================================================================
// Seleção de personagem: boas-vindas do herói
// =========================================================================================
function renderPerfisScreen(){
  const wrap = el('div',{class:'perfis-screen'});
  wrap.appendChild(el('div',{style:'align-self:flex-end;'}, botaoTema()));
  wrap.appendChild(el('div',{class:'tormenta-logo'}, 'Tormenta'));

  if(state._carregandoInicial){
    wrap.appendChild(el('div',{class:'perfis-title'},'Painel do Aventureiro'));
    wrap.appendChild(el('div',{class:'panel faixa splash-carregando', style:'max-width:380px;text-align:center;'},
      iconeD20(48),
      el('div',{class:'wizard-title', style:'font-size:1rem;'}, fraseCarregamentoAtual()),
      state._carregandoDemorando ? el('div',{class:'tip', style:'margin-top:10px;'}, 'Isso está demorando mais que o normal. Aguenta mais um pouco.') : null
    ));
    return wrap;
  }
  if(state._carregandoAtualizacao){
    wrap.appendChild(el('div',{class:'panel faixa splash-atualizando', style:'max-width:380px;margin:0 auto 14px;text-align:center;'},
      el('div',{style:'display:flex;align-items:center;justify-content:center;gap:10px;'}, iconeD20(24), el('div',{}, fraseCarregamentoAtual()))));
  }

  const entrar = (p, origem)=>{
    if(state.gerenciandoPerfis) return;
    const ir = ()=>{ state.perfilAtualId = p.id; state.screen='ficha'; render(); iniciarAtualizacaoAutomaticaJogador(); };
    const portal = document.querySelector('.portal-heroi');
    if(portal && !movimentoReduzido()){ reanimar(portal, 'abre'); Som.tocar('brilho'); setTimeout(ir, 650); } else ir();
  };
  const ordenados = state.perfis.slice().sort((a,b)=> ultimaAtividade(b) - ultimaAtividade(a));
  const heroi = state.gerenciandoPerfis ? null : ordenados[0];

  if(heroi){
    const {patamar, proximo, faltam} = progressoPatamar(nivelTotal(heroi));
    const pend = detectarPendencias(heroi).length;
    const sessao = linhaSessao(heroi);
    wrap.appendChild(el('div',{class:'boas-vindas'},
      el('div',{class:'retrato-grande'}, anelPatamar(heroi, 150), retratoHeroi(heroi), pend ? el('span',{class:'selo-cera', title:pend+' pendência(s)'}, '!') : null),
      el('div',{class:'patamar-txt', style:'color:'+patamar.cor+';'}, patamar.nome+' · nível '+nivelTotal(heroi)+(proximo ? ' · '+faltam+' para '+proximo.nome : '')),
      el('div',{class:'nome-heroi'}, heroi.nome || 'Sem nome'),
      el('div',{class:'linha-heroi'}, [heroi.raca, classeDisplay(heroi), heroi.origem].filter(Boolean).join(' · ')),
      sessao ? el('div',{class:'ult-sessao'}, el('b',{}, 'Última sessão: '), sessao) : null,
      el('button',{class:'btn continuar', onclick:(e)=> entrar(heroi, e.currentTarget)}, 'Continuar como '+(heroi.nome||'herói'))
    ));
  }
  const outros = el('div',{class:'outros-herois'});
  if(!precisaCodigoJogador()){
    outros.appendChild(el('button',{class:'mini-heroi', onclick:()=>{ if(!state.gerenciandoPerfis) abrirTelaMestre(); }}, el('i',{}, '♛'), 'Mestre'));
  }
  ordenados.filter(p=> p!==heroi).forEach(p=>{
    const b = el('div',{class:'mini-heroi-wrap'},
      el('button',{class:'mini-heroi', onclick:()=> entrar(p)}, el('i',{style: p.foto ? '' : 'background:'+corAvatar(p.id)+';'}, p.foto ? el('img',{src:p.foto, alt:''}) : (p.nome||'?').slice(0,1).toUpperCase()), p.nome||'Sem nome'),
      state.gerenciandoPerfis ? el('button',{class:'perfil-delete-x', onclick:(e)=>{ e.stopPropagation(); if(confirm('Excluir "'+(p.nome||'este personagem')+'"? Isso não pode ser desfeito.')){ state.perfis = state.perfis.filter(x=>x.id!==p.id); salvarPerfis(); render(); } }}, '✕') : null);
    outros.appendChild(b);
  });
  if(!state.gerenciandoPerfis) outros.appendChild(el('button',{class:'mini-heroi novo', onclick:()=> iniciarWizard()}, el('i',{}, '+'), 'Novo herói'));
  wrap.appendChild(outros);
  wrap.appendChild(el('div',{class:'portal-heroi', 'aria-hidden':'true'}));

  wrap.appendChild(el('label',{class:'btn ghost', style:'margin-top:16px;display:block;text-align:center;'},
    '📂 Importar cópia de segurança',
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
    wrap.appendChild(el('div',{class:'perfil-manage'}, el('button',{onclick:()=>{ state.gerenciandoPerfis=!state.gerenciandoPerfis; render(); }}, state.gerenciandoPerfis?'Concluir':'Gerenciar personagens')));
  }
  if(state.gerenciandoPerfis && ordenados[0]){
    // No modo gerenciar o herói principal também aparece como miniatura (para poder excluir).
    const p = ordenados[0];
    outros.insertBefore(el('div',{class:'mini-heroi-wrap'},
      el('button',{class:'mini-heroi'}, el('i',{style: p.foto ? '' : 'background:'+corAvatar(p.id)+';'}, p.foto ? el('img',{src:p.foto, alt:''}) : (p.nome||'?').slice(0,1).toUpperCase()), p.nome||'Sem nome'),
      el('button',{class:'perfil-delete-x', onclick:(e)=>{ e.stopPropagation(); if(confirm('Excluir "'+(p.nome||'este personagem')+'"? Isso não pode ser desfeito.')){ state.perfis = state.perfis.filter(x=>x.id!==p.id); salvarPerfis(); render(); } }}, '✕')), outros.firstChild);
  }
  if(precisaCodigoJogador()){
    wrap.appendChild(el('div',{class:'perfil-manage'}, el('button',{onclick:sairDoCodigoJogador}, 'Sair')));
  }
  return wrap;
}

// =========================================================================================
// Cartão do herói (painel Personagem enxuto, com os atributos na última linha)
// =========================================================================================
function dependentesDoAtributo(f, a){
  const per = PERICIAS.filter(p=> p.attr.toLowerCase().slice(0,3)===a).map(p=> p.nome+' '+sinalNum(periciaValor(f, p)));
  const extras = [];
  if(a==='for'){ extras.push('limite de carga '+limiteCarga(f)); extras.push('dano corpo a corpo'); }
  if(a==='des') extras.push('Defesa');
  if(a==='con') extras.push('vida por nível');
  if(atributoChaveMagia(f)===a){ extras.push('mana (atributo-chave)'); const cd = cdMagias(f); if(cd!=null) extras.push('CD das magias '+cd); }
  if(a==='int' && poderesAtivos(f).includes('Inventário Organizado')) extras.push('carga (Inventário Organizado)');
  return extras.concat(per);
}
function renderCartaoHeroi(f){
  const aberto = state._cartaoAberto || null;
  const alternar = (k)=>{ state._cartaoAberto = aberto===k ? null : k; render(); };
  const {patamar, proximo, faltam} = progressoPatamar(nivelTotal(f));
  const fotoInput = el('input',{type:'file', accept:'image/*', style:'display:none;', onchange:(e)=>{ if(e.target.files[0]) handleFotoUpload(f, e.target.files[0]); }});
  const topo = el('div',{class:'topo-heroi'},
    el('label',{class:'retrato-mini', title: f.foto ? 'Toque pra trocar a foto' : 'Toque pra adicionar uma foto'}, anelPatamar(f, 76), retratoHeroi(f), el('span',{class:'nivel-heroi'}, String(nivelTotal(f))), fotoInput),
    el('button',{class:'ident-heroi', onclick:()=> alternar('jogador')},
      el('span',{class:'nome-heroi-c'}, f.nome || 'Sem nome'),
      el('span',{class:'sub-heroi'}, [f.raca, classeDisplay(f), f.jogador].filter(Boolean).join(' · ')),
      el('span',{class:'pat-heroi', style:'color:'+patamar.cor+';'}, patamar.nome+(proximo ? ' · '+faltam+' para '+proximo.nome : ''))),
    el('button',{class:'lvl-heroi'+(state._levelUpCelebrando?' selo-nivel-flash':''), onclick:()=> abrirLevelUp()}, 'Level', el('br',{}), 'Up ⬆'));
  const desl = deslocamentoEfetivo(f);
  const chips = [
    ['tamanho', f.tamanho||'Tamanho'], ['alinhamento', f.alinhamento||'Alinhamento'], ['idade', f.idade ? f.idade+' anos' : 'Idade'], ['deslocamento', desl+' m'],
  ];
  const linha = el('div',{class:'linha-chips'},
    ...chips.map(([k,v])=> el('button',{class:'cp'+(aberto===k?' on':''), onclick:()=> alternar(k)}, v)),
    el('button',{class:'cp selo r'+(aberto==='raca'?' on':''), onclick:()=> alternar('raca')}, f.raca||'Raça'),
    el('button',{class:'cp selo o'+(aberto==='origem'?' on':''), onclick:()=> alternar('origem')}, f.origem||'Origem'),
    el('button',{class:'cp selo d'+(aberto==='divindade'?' on':''), onclick:()=> alternar('divindade')}, f.divindade||'Sem deus'));
  const faixaAttr = el('div',{class:'faixa-attr'},
    ...ORDEM_ATRIBUTOS_FICHA.map(a=>{
      const efetivo = atributoEfetivo(f, a), digitado = parseInt(f[a])||0;
      return el('button',{class:'fa'+(aberto==='attr-'+a?' on':'')+(efetivo!==digitado?' pen':''), onclick:()=> alternar('attr-'+a)}, el('b',{}, sinalNum(efetivo)), el('span',{}, a.toUpperCase()));
    }));
  const gaveta = gavetaCartao(f, aberto);
  return el('div',{class:'panel faixa cartao-heroi', 'data-cartao-heroi':'1'}, el('h2',{}, 'Personagem'), topo, linha, faixaAttr, gaveta);
}
function gavetaCartao(f, aberto){
  if(!aberto) return null;
  const g = el('div',{class:'gaveta-heroi'});
  const opcoes = (lista, campo)=> el('div',{class:'opc-heroi'}, lista.map(o=> el('button',{class:f[campo]===o?'on':'', onclick:()=>{ f[campo]=o; state._cartaoAberto=null; salvarPerfis(); render(); }}, o)));
  if(aberto==='tamanho'){
    g.appendChild(opcoes(TAMANHOS, 'tamanho'));
    if(bonusFurtividadeTamanho(f)) g.appendChild(el('div',{class:'nota-heroi'}, (bonusFurtividadeTamanho(f)>0?'+':'')+bonusFurtividadeTamanho(f)+' em Furtividade pelo tamanho (já somado).'));
  } else if(aberto==='alinhamento'){
    g.appendChild(opcoes(ALINHAMENTOS, 'alinhamento'));
  } else if(aberto==='idade'){
    g.appendChild(el('label',{}, 'Idade'));
    g.appendChild(bindInput(f, 'idade', 'number', ()=>{ salvarPerfis(); render(); }));
  } else if(aberto==='jogador'){
    g.appendChild(el('label',{}, 'Jogador'));
    g.appendChild(bindInput(f, 'jogador', 'text', ()=>{ salvarPerfis(); render(); }));
  } else if(aberto==='deslocamento'){
    const base = parseInt(f.deslocamento)||9, ef = deslocamentoEfetivo(f);
    g.appendChild(el('div',{class:'nota-heroi'}, el('b',{}, ef+' m'), ef!==base ? ' (base '+base+' m)' : ''));
    deslocamentosAlternativos(f).forEach(d=> g.appendChild(el('div',{class:'nota-heroi'}, d.tipo+': '+d.valor+' m'+(d.obs?' ('+d.obs+')':''))));
  } else if(aberto==='raca'){
    const r = getRacaObj(f);
    if(r && r.poderes) r.poderes.forEach(([nome, desc])=> g.appendChild(el('div',{class:'nota-heroi'}, el('b',{}, nome+'. '), desc)));
    else g.appendChild(el('div',{class:'nota-heroi'}, 'Sem raça definida.'));
  } else if(aberto==='origem'){
    g.appendChild(el('div',{class:'nota-heroi'}, f.origemPoder ? [el('b',{}, f.origemPoder.nome+'. '), f.origemPoder.desc||''] : 'Origem '+(f.origem||'—')+'.'));
  } else if(aberto==='divindade'){
    g.appendChild(renderCampoDivindade(f));
  } else if(aberto.startsWith('attr-')){
    const a = aberto.slice(5);
    const efetivo = atributoEfetivo(f, a), digitado = parseInt(f[a])||0;
    g.appendChild(el('div',{class:'cab-attr'}, el('b',{}, NOME_ATRIBUTO[a]+' '+sinalNum(efetivo)), efetivo!==digitado ? el('span',{class:'pena-attr'}, 'digitado '+sinalNum(digitado)) : null));
    if(a==='car' && penalidadeCarismaTormenta(f)>0) g.appendChild(el('div',{class:'nota-heroi', style:'color:var(--red-bright);'}, '−'+penalidadeCarismaTormenta(f)+' pelos '+qtdPoderesTormentaParaCarisma(f)+' Poder(es) da Tormenta (os da Deformidade não contam).'));
    g.appendChild(el('div',{class:'nota-heroi'}, 'Mexe em: '+dependentesDoAtributo(f, a).join(' · ')));
    if(state._corrigindoAttr===a){
      g.appendChild(el('div',{class:'corrige-attr'}, el('label',{}, 'Valor digitado'), bindInput(f, a, 'number', ()=>{ state._corrigindoAttr=null; salvarPerfis(); render(); })));
    } else {
      g.appendChild(el('button',{class:'link-corrigir', onclick:()=>{ state._corrigindoAttr=a; render(); }}, 'corrigir o valor'));
    }
  }
  return g;
}
// Faixa fixa no topo quando o cartão sai da tela (vida, mana e Defesa sempre à vista).
function renderFaixaHeroi(f){
  return el('div',{class:'faixa-fixa-heroi', 'aria-hidden':'true'},
    retratoHeroi(f, 'mini'),
    el('div',{}, el('b',{}, f.nome||''), el('small',{}, classeDisplay(f)+' · Defesa '+defesaTotal(f))),
    el('div',{class:'mini-vm'}, el('span',{style:'color:var(--pv-accent);'}, (parseInt(f.pvatual)||0)+'/'+pvMaxEfetivo(f)), el('span',{style:'color:var(--pm-accent);'}, (parseInt(f.pmatual)||0)+'/'+pmMaxEfetivo(f))));
}
// Checagem simples na rolagem (funciona em qualquer celular): a faixa aparece quando o cartão
// do herói já saiu por cima da tela. Um ouvinte só, ligado uma vez.
function atualizarFaixaHeroi(){
  const cartao = document.querySelector('[data-cartao-heroi]');
  const faixa = document.querySelector('.faixa-fixa-heroi');
  if(!faixa) return;
  faixa.classList.toggle('on', !!cartao && cartao.getBoundingClientRect().bottom < 0);
}
let _faixaHeroiLigada = false;
function ligarFaixaHeroi(){
  if(!_faixaHeroiLigada){ window.addEventListener('scroll', atualizarFaixaHeroi, {passive:true}); _faixaHeroiLigada = true; }
  atualizarFaixaHeroi();
}

// =========================================================================================
// Perícias (7A compacta)
// =========================================================================================
function parcelasPericia(f, p){
  const nivel = nivelTotal(f);
  const isTreinada = periciasTreinadasComDivindade(f).has(p.nome);
  const racaObj = getRacaObj(f);
  const usaSabAdestr = p.nome==='Adestramento' && listaPoderesConcedidos(f).some(pc=>pc && pc.nome==='Compreender os Ermos');
  const usaSabGuerra = p.nome==='Guerra' && listaPoderesConcedidos(f).some(pc=>pc && pc.nome==='Fé Guerreira');
  const usaDesAtlet = p.nome==='Atletismo' && ((racaObj && racaObj.atletismoUsaDestreza) || nomesPoderesConhecidos(f).includes('Acrobático'));
  const attrNome = usaSabAdestr ? 'Sabedoria (Compreender os Ermos)' : usaSabGuerra ? 'Sabedoria (Fé Guerreira)' : usaDesAtlet ? 'Destreza (Acrobático/traço racial)' : (NOME_ATRIBUTO[p.attr.toLowerCase().slice(0,3)]||p.attr);
  const attrVal = usaSabAdestr || usaSabGuerra ? (parseInt(f.sab)||0) : usaDesAtlet ? (parseInt(f.des)||0) : atributoEfetivo(f, p.attr.toLowerCase().slice(0,3));
  const parcelas = [['½ nível', Math.floor(nivel/2)], [attrNome, attrVal]];
  if(isTreinada) parcelas.push(['Treino', bonusTreinoPericia(nivel)]);
  [['Poderes', bonusPericiaDePoderes(f, p.nome)], ['Raça', bonusPericiaDeRaca(f, p.nome)], ['Poderes da Tormenta', bonusPericiaDeTormenta(f, p.nome)], ['Itens vestidos', bonusPericiaDeItensVestidos(f, p.nome)],
   ['Divindade', bonusPericiaDeDivindade(f, p.nome)], ['Origem', bonusPericiaDeOrigem(f, p.nome)], ['Poder de classe', bonusPericiaDeClasse(f, p.nome)], ['Habilidade de classe', bonusPericiaDeHabilidadeAutomatica(f, p.nome)],
   ['Condições', bonusCondicoesPericia(f, p)]].forEach(([r,v])=>{ if(v) parcelas.push([r,v]); });
  if(p.nome==='Furtividade' && bonusFurtividadeTamanho(f)) parcelas.push(['Tamanho', bonusFurtividadeTamanho(f)]);
  if(p.armadura && penalidadeTotal(f)) parcelas.push(['Penalidade de armadura', penalidadeTotal(f)]);
  return parcelas;
}
function linhaPericia(f, p, treinadas){
  const tr = treinadas.has(p.nome), trava = p.treinada && !tr;
  const aberta = state._periciaAberta===p.nome;
  const fixadas = f.periciasFixadas || [];
  const fixa = fixadas.includes(p.nome);
  const valor = periciaValor(f, p);
  const corpo = [];
  if(aberta){
    if(trava) corpo.push(el('div',{class:'nota-pericia'}, 'Só pode ser usada por quem é treinado.'));
    else {
      parcelasPericia(f, p).forEach(([r,v])=> corpo.push(el('div',{class:'calc-linha'}, el('span',{}, r), el('span',{}, sinalNum(v)))));
      corpo.push(el('div',{class:'calc-linha total'}, el('span',{}, 'Total'), el('span',{}, sinalNum(valor))));
    }
    if(p.usos && p.usos.length) corpo.push(el('div',{class:'usos-pericia'}, el('b',{}, 'Usos: '), p.usos.join(' · ')));
    if(!trava) corpo.push(el('button',{class:'fixar-pericia', onclick:(e)=>{ e.stopPropagation(); f.periciasFixadas = fixa ? fixadas.filter(x=>x!==p.nome) : fixadas.concat(p.nome); salvarPerfis(); render(); }}, fixa ? 'Desafixar' : '📌 Fixar'));
  }
  return el('div',{class:'linha-pericia'+(tr?' tr':'')+(trava?' trava':'')+(aberta?' aberta':''), onclick:()=>{ state._periciaAberta = aberta ? null : p.nome; render(); }},
    el('span',{class:'tot-pericia'}, trava ? '🔒' : sinalNum(valor)),
    el('span',{class:'nome-pericia'}, p.nome, tr ? el('span',{class:'estrela-pericia', title:'treinada'}, ' ★') : null),
    el('span',{class:'marcas-pericia'}, p.armadura ? el('i',{}, 'pen.') : null, fixa ? el('span',{}, '📌') : null),
    aberta ? el('div',{class:'conta-pericia'}, ...corpo) : null);
}
function renderPericias(){
  const f = fichaAtual();
  const wrap = el('div',{});
  const treinadas = periciasTreinadasComDivindade(f);
  const sit = state._periciaSituacao || 'Todas';
  const busca = (state._periciaBusca||'').toLowerCase().trim();
  const painel = el('div',{class:'panel faixa painel-pericias'}, el('h2',{}, 'Perícias'));
  painel.appendChild(el('div',{class:'res-pericias'}, RESISTENCIAS.map(n=>{
    const p = PERICIAS.find(x=>x.nome===n); if(!p) return null;
    return el('button',{class:'pilula-res'+(treinadas.has(n)?' tr':'')+(state._periciaAberta===n?' on':''), onclick:()=>{ state._periciaAberta = state._periciaAberta===n ? null : n; render(); }}, el('span',{}, n), el('b',{}, sinalNum(periciaValor(f, p))));
  })));
  const abertaRes = RESISTENCIAS.includes(state._periciaAberta) ? PERICIAS.find(x=>x.nome===state._periciaAberta) : null;
  if(abertaRes) painel.appendChild(linhaPericia(f, abertaRes, treinadas));
  const fixadas = (f.periciasFixadas||[]).map(n=> PERICIAS.find(p=>p.nome===n)).filter(Boolean);
  if(fixadas.length) painel.appendChild(el('div',{class:'fixadas-pericias'}, '📌', fixadas.map(p=> el('span',{class:'fix-pericia'}, p.nome+' '+sinalNum(periciaValor(f, p))))));
  painel.appendChild(el('input',{id:'busca-pericias', type:'text', placeholder:'buscar perícia...', value: state._periciaBusca||'', oninput:(e)=>{ state._periciaBusca=e.target.value; renderDebounced(); }}));
  painel.appendChild(el('div',{class:'sit-pericias'}, ['Todas', ...Object.keys(SITUACOES_PERICIA)].map(k=> el('button',{class:k===sit?'on':'', onclick:()=>{ state._periciaSituacao=k; state._periciaAberta=null; render(); }}, k))));
  let lista = PERICIAS.filter(p=> !RESISTENCIAS.includes(p.nome) && (!busca || p.nome.toLowerCase().includes(busca)));
  if(sit!=='Todas') lista = lista.filter(p=> SITUACOES_PERICIA[sit].includes(p.nome));
  if(!lista.length) painel.appendChild(el('div',{class:'empty'}, 'Nenhuma perícia encontrada.'));
  const porNome = (a,b)=> a.nome.localeCompare(b.nome, 'pt-BR');
  if(sit==='Todas' && !busca){
    ORDEM_ATRIBUTOS_FICHA.forEach(a=>{
      const doGrupo = lista.filter(p=> p.attr.toLowerCase().slice(0,3)===a).sort(porNome);
      if(!doGrupo.length) return;
      painel.appendChild(el('div',{class:'grupo-pericia'}, el('span',{}, NOME_ATRIBUTO[a]+' '+sinalNum(atributoEfetivo(f, a))), el('span',{class:'qtd'}, String(doGrupo.length))));
      doGrupo.forEach(p=> painel.appendChild(linhaPericia(f, p, treinadas)));
    });
  } else {
    lista.slice().sort(porNome).forEach(p=> painel.appendChild(linhaPericia(f, p, treinadas)));
  }
  painel.appendChild(el('div',{class:'meta', style:'text-transform:none;margin-top:8px;'}, 'Total = ½ nível + atributo + treino (+'+bonusTreinoPericia(nivelTotal(f))+') e bônus. ★ treinada · 🔒 só treinada · pen. sofre penalidade de armadura.'));
  wrap.appendChild(painel);
  return wrap;
}
// Fixadas também na aba Ficha, numa linha curta embaixo do cinto.
function renderPericiasFixadasFicha(f){
  const fixadas = (f.periciasFixadas||[]).map(n=> PERICIAS.find(p=>p.nome===n)).filter(Boolean);
  if(!fixadas.length) return null;
  return el('div',{class:'fixadas-pericias na-ficha'}, '📌', fixadas.map(p=> el('span',{class:'fix-pericia'}, p.nome+' '+sinalNum(periciaValor(f, p)))));
}
