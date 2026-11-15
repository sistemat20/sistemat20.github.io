// Minhas magias, memorização do Mago e o grimório para aprender.
// Separado do js/ficha.js em 15/11/2026 (item 6 da revisão geral), sem mudar o código.

function renderPersonagemMagias(){
  const wrap = el('div',{});
  const f = fichaAtual();
  const magPanel = el('div',{class:'panel faixa'}, el('h2',{},'Minhas Magias'));
  const attrChave = atributoChaveMagia(f);
  if(attrChave){
    // Uma linha só (2A): CD, atributo-chave e a mana de agora; o "+" leva ao grimório completo.
    magPanel.appendChild(el('div',{class:'topo-magias'},
      el('span',{}, el('b',{}, 'CD '+cdMagias(f)), ' · '+NOME_ATRIBUTO[attrChave]+' '+(valorAtributoChaveMagia(f)>=0?'+':'')+valorAtributoChaveMagia(f)),
      el('span',{class:'pm-agora'}, (parseInt(f.pmatual)||0)+'/'+pmMaxEfetivo(f)+' PM'),
      el('button',{class:'link-editar-item', onclick:()=>{ state.tab = 'magias'; render(); try{ window.scrollTo(0,0); }catch(e){} }}, '+ aprender')));
  } else {
    magPanel.appendChild(el('div',{class:'tip'}, el('b',{},'Sem classe conjuradora'), 'Esse personagem ainda não tem uma classe que lança magias.'));
  }

  // Liturgia Mágica (Clérigo): gasta ação de movimento na mesa pra ativar; a CD da PRÓXIMA
  // habilidade (não uma fixa) sobe +2. Como o app não acompanha turno a turno, vira um
  // interruptor manual — o jogador liga depois de fazer a ação na mesa, e o popup de Usar Magia
  // consome sozinho (desliga automaticamente) na próxima vez que usar uma magia.
  if(nomesPoderesConhecidos(f).includes('Liturgia Mágica')){
    magPanel.appendChild(el('div',{class:'row', style:'align-items:center;margin-top:8px;padding:8px;border-radius:var(--radius-sm);background:'+(f._liturgiaMagicaAtiva?'rgba(216,189,116,0.12)':'transparent')+';border:1px solid '+(f._liturgiaMagicaAtiva?'var(--gold)':'var(--line)')+';'},
      el('div',{style:'flex:1;'},
        el('div',{style:'font-weight:700;'+(f._liturgiaMagicaAtiva?'color:var(--gold);':'')}, f._liturgiaMagicaAtiva ? '✓ Liturgia Mágica ativa' : 'Liturgia Mágica'),
        el('div',{class:'meta'}, 'Fez a ação na mesa? Liga aqui — a próxima magia usada já ganha +2 CD sozinha.')
      ),
      el('button',{class:'btn ghost', style:'width:auto;flex-shrink:0;', onclick:()=>{ f._liturgiaMagicaAtiva = !f._liturgiaMagicaAtiva; salvarPerfis(); render(); }}, f._liturgiaMagicaAtiva ? 'Desligar' : 'Ligar')
    ));
  }

  const ccArc = (f.classesNiveis||[]).find(c=>c.classe==='Arcanista');
  if(ccArc && f.arcanistaCaminho){
    const esperadas = magiasArcanistaEsperadas(f.arcanistaCaminho, ccArc.nivel);
    const acimaDoEsperado = f.magias.length > esperadas;
    magPanel.appendChild(el('div',{class:'meta', style:'margin-bottom:8px;'+(acimaDoEsperado?'color:var(--gold);':'')},
      f.magias.length+' de '+esperadas+' magias de '+f.arcanistaCaminho+' até aqui'
      + (acimaDoEsperado ? ' (acima do ritmo normal: confira com o Mestre)' : '')
    ));
  }

  if(f.magias.length===0){
    magPanel.appendChild(el('div',{class:'empty'},'Nenhuma magia adicionada ainda. Vá no Menu → Magias pra buscar e adicionar.'));
  } else {
    magPanel.appendChild(renderGrimorioCartas(f, (s, idx)=>{
      if(!confirm('Remover "'+s.n+'" das suas magias conhecidas? Não tem como desfazer.')) return;
      registrarLog(f, 'Esqueceu a magia: '+s.n);
      f.magias.splice(idx,1);
      state._cartaMagiaAberta = null;
      salvarPerfis();
      render();
    }));
  }
  wrap.appendChild(magPanel);

  if(f.arcanistaCaminho==='Mago' && f.magias.length>0){
    wrap.appendChild(renderPainelMemorizacaoMago(f));
  }

  return wrap;
}

// Mago só pode lançar magias memorizadas — estuda o grimório por 1h e escolhe metade das que
// conhece (arredondado pra baixo). Aqui é só a escolha de QUAIS ficam memorizadas; o "estudar
// por 1h, 1x por dia" fica por conta da narrativa na mesa, como o resto do controle de tempo.
function renderPainelMemorizacaoMago(f){
  const limite = Math.floor(f.magias.length/2);
  const wrap = el('div',{class:'panel faixa'}, el('h2',{},'Memorizar Magias (Mago)'));
  if(!state._memorizandoMago){
    const qtdMemorizada = (f.magiasMemorizadas||[]).length;
    wrap.appendChild(el('div',{class:'tip'}, 'Memorizadas agora: '+qtdMemorizada+' / '+limite+'. Só magias memorizadas podem ser lançadas — estude o grimório por 1h (1x por dia) pra trocar.'));
    wrap.appendChild(el('button',{class:'btn ghost', onclick:()=>{ state._memorizandoMago = (f.magiasMemorizadas||[]).slice(); render(); }}, '📖 Estudar grimório e memorizar'));
  } else {
    const selecao = state._memorizandoMago;
    wrap.appendChild(el('div',{class:'tip'}, 'Escolha até '+limite+' magias (metade das '+f.magias.length+' conhecidas, arredondado pra baixo). Selecionadas: '+selecao.length+' / '+limite+'.'));
    const grid = el('div',{class:'option-grid'});
    f.magias.forEach(s=>{
      const marcada = selecao.includes(s.n);
      grid.appendChild(el('button',{class:'option-card'+(marcada?' selected':''), onclick:()=>{
        if(marcada){ state._memorizandoMago = selecao.filter(n=>n!==s.n); }
        else if(selecao.length < limite){ selecao.push(s.n); }
        else { flashMsg('Já escolheu o limite de '+limite+' magias.'); return; }
        render();
      }},
        el('div',{class:'opt-nome'}, s.n),
        el('div',{class:'opt-sub'}, s.c+'º círc. · '+s.e)
      ));
    });
    wrap.appendChild(grid);
    wrap.appendChild(el('div',{class:'row', style:'margin-top:10px;'},
      el('button',{class:'btn', onclick:()=>{ f.magiasMemorizadas = selecao; state._memorizandoMago=null; salvarPerfis(); flashMsg('📖 Magias memorizadas atualizadas!'); render(); }}, 'Confirmar memorização'),
      el('button',{class:'btn ghost', onclick:()=>{ state._memorizandoMago=null; render(); }}, 'Cancelar')
    ));
  }
  return wrap;
}

// Aprender magias (prancha "Catálogo e Magias", 15/11/2026, ideias A + B + C):
// · A Vagas: no topo, quantas magias ainda dá para aprender (conta do livro em magiasQuePodeConhecer);
//   círculos em segmentos; as que você já conhece ficam recolhidas no fim.
// · B Pelo que a magia faz: pílulas por intenção (Dano, Proteção, Mente...), tiradas dos temas de
//   efeito (temaDaMagia); cada linha leva o símbolo colorido do efeito ao lançar.
// · C Carta de prévia: tocar abre execução, alcance, duração e o custo em PM já para o herói.
const INTENCOES_MAGIA = [
  ['dano','🔥 Dano',['fogo','frio','raio','acido','setas','trevas','vampiro']],
  ['cura','💚 Cura',['cura']],
  ['protecao','🛡️ Proteção',['escudo']],
  ['mente','💗 Mente',['encanto','sono']],
  ['ilusao','🎭 Ilusão',['ilusao']],
  ['saber','👁️ Saber',['olho']],
  ['invocar','🌀 Invocar',['invocacao','necro']],
  ['transformar','⚗️ Transformar',['alquimia']],
  ['luz','☀️ Luz e bênção',['luz']],
];
function intencaoDaMagia(s){ const t = temaDaMagia(s); const i = INTENCOES_MAGIA.find(x=> x[2].includes(t)); return i ? i[0] : 'dano'; }
function sigiloMagiaPequeno(s){
  const t = temaDaMagia(s), cfg = TEMAS_FEITICO[t] || TEMAS_FEITICO.setas;
  const e = el('span',{class:'sigilo-mini', style:'color:'+cfg.cor+';border-color:'+cfg.cor+';', 'aria-hidden':'true'});
  e.innerHTML = '<svg viewBox="0 0 200 200">'+sigiloSVG(cfg.sigilo, cfg.cor)+'</svg>';
  return e;
}

function gavetaMagiaAprender(f, s, cc, conhece, aprender){
  const custo = cc ? custoPMAjustado(f, s) : custoPM(s.c);
  const tema = temaDaMagia(s);
  const parecida = (f.magias||[]).find(m=> m.n!==s.n && temaDaMagia(m)===tema);
  const aprimAberto = state._aprimAprender === s.n;
  const extra = [s.alvo ? 'Alvo: '+s.alvo : null, s.resistencia ? 'Resistência: '+s.resistencia : null].filter(Boolean).join(' · ');
  return kGaveta(
    el('div',{class:'carta-magia'},
      el('div',{}, s.execucao||'—', el('small',{}, 'execução')), el('div',{}, s.alcance||'—', el('small',{}, 'alcance')),
      el('div',{}, s.duracao||'—', el('small',{}, 'duração')), el('div',{class:'pm'}, custo+' PM', el('small',{}, cc ? 'para você' : 'custo'))),
    el('div',{class:'tip desc-magia'}, s.d),
    extra ? el('div',{class:'meta-ej'}, extra) : null,
    parecida ? el('div',{class:'parecida-magia'}, '✦ Parecida com '+parecida.n+', que você conhece.') : null,
    s.aprim && s.aprim.length ? el('button',{class:'aprim-linha', 'aria-expanded': aprimAberto ? 'true' : 'false', onclick:()=>{ state._aprimAprender = aprimAberto ? null : s.n; render(); }},
      el('span',{}, s.aprim.length+' aprimoramento'+(s.aprim.length>1?'s':'')), el('span',{}, aprimAberto ? '▾' : '▸')) : null,
    aprimAberto ? el('div',{class:'aprim-lista'}, s.aprim.map(a=> el('div',{class:'power-item'}, el('b',{}, a.custo+' '), a.efeito))) : null,
    conhece ? el('div',{class:'meta-ej'}, '✓ Você já conhece esta magia.') : el('button',{class:'btn', onclick:aprender}, '✨ Aprender'));
}

function linhaMagiaAprender(f, s, cc, conhece, mf){
  if(!state._acordeaoAberto) state._acordeaoAberto = {};
  const aberto = state._acordeaoAberto.aprender === s.n;
  const aprender = ()=>{ addMagiaFicha(s, mf.trad); state._acordeaoAberto.aprender = null; try{ tocarFeitico(s); }catch(e){} render(); };
  const linha = el('div',{class:'cat-linha magia'+(aberto?' sel':'')+(conhece?' conhecida':'')},
    el('button',{class:'cat-abre', 'aria-expanded': aberto ? 'true' : 'false', onclick:()=>{ state._acordeaoAberto.aprender = aberto ? null : s.n; render(); }},
      sigiloMagiaPequeno(s),
      el('span',{class:'nm'}, s.n, s.trad==='Universal' ? el('span',{class:'pill universal', style:'margin-left:6px;'}, '🔮 Universal') : null,
        el('small',{}, s.c+'º círculo · '+s.e))),
    conhece ? el('span',{class:'cat-mais ok', 'aria-label':'Você conhece'}, '✓')
      : el('button',{class:'cat-mais', 'aria-label':'Aprender '+s.n, title:'Aprender', onclick:aprender}, '+'));
  return aberto ? [linha, gavetaMagiaAprender(f, s, cc, conhece, aprender)] : [linha];
}

function renderMagias(){
  const wrap = el('div',{class:'aprender-magias'});
  const mf = state.magiaFiltro;
  const f = fichaAtual();
  const cc = classeConjuradora(f);
  const circuloMax = circuloMaximoDisponivel(f);
  if(cc && !mf._tradAjustada){ mf.trad = CLASSES[cc.classe].tradicao; mf._tradAjustada = true; mf.modo = 'possiveis'; }
  const modo = cc ? (mf.modo || 'possiveis') : 'completo';
  if(cc && modo==='possiveis') mf.trad = CLASSES[cc.classe].tradicao;
  const conhecidas = new Set((f.magias||[]).map(m=> m.n));
  const escolasFixas = cc && ['Bardo','Druida'].includes(cc.classe) && f.escolasMagia && f.escolasMagia.length ? f.escolasMagia : null;

  // ---- A: vagas ----
  if(cc){
    const q = magiasQuePodeConhecer(f);
    const vagas = q.total - conhecidas.size;
    const titulo = vagas>0 ? 'Você pode aprender '+vagas+' magia'+(vagas>1?'s':'') : vagas===0 ? 'Tudo escolhido' : 'Você conhece '+conhecidas.size+' de '+q.total;
    wrap.appendChild(el('div',{class:'vagas-magia'+(vagas<=0?' fim':'')},
      el('span',{class:'n'}, vagas<=0 ? '✓' : String(vagas)),
      el('span',{class:'tx'}, el('b',{}, titulo), q.conta+(vagas<0 ? ' Magias de item ou de poder também entram nessa conta.' : ''))));
    if(escolasFixas) wrap.appendChild(el('div',{class:'meta-ej'}, 'Suas escolas: '+escolasFixas.join(', ')+'.'));
  } else {
    wrap.appendChild(el('div',{class:'tip'}, 'Nenhuma classe de '+f.nome+' lança magias pela progressão normal (Arcanista, Bardo, Clérigo, Druida). Se ganhou magias por um poder, veja a descrição dele.'));
  }

  // ---- círculos em segmentos ----
  const maxCirc = modo==='possiveis' ? circuloMax : 5;
  if(mf.circulo!=='todos' && (parseInt(mf.circulo)>maxCirc || !parseInt(mf.circulo))) mf.circulo = 'todos';
  const partes = [];
  for(let c=1; c<=maxCirc; c++) partes.push({id:String(c), rot:c+'º'});
  partes.push({id:'todos', rot:'Todos'});
  wrap.appendChild(kSeg(partes, mf.circulo, (id)=>{ mf.circulo = id; render(); }));
  if(modo==='completo'){
    wrap.appendChild(kSeg([{id:'arcana', rot:'Arcanas'}, {id:'divina', rot:'Divinas'}], mf.trad, (id)=>{ mf.trad = id; render(); }));
  }
  wrap.appendChild(el('input',{id:'busca-magias', type:'search', class:'busca-cat', placeholder:'🔎 buscar magia pelo nome...', value:mf.busca, oninput:(e)=>{ mf.busca=e.target.value; renderDebounced(); }}));

  // ---- lista base ----
  let base = magiasPorTradicao(mf.trad);
  if(modo==='possiveis') base = base.filter(s=> s.c<=circuloMax);
  if(modo==='possiveis' && escolasFixas) base = base.filter(s=> escolasFixas.includes(s.e));
  if(mf.circulo!=='todos') base = base.filter(s=> s.c===parseInt(mf.circulo));
  if(mf.busca) base = base.filter(s=> semAcento(s.n).includes(semAcento(mf.busca)));

  // ---- B: pílulas por intenção (só as que têm magia) ----
  const porIntencao = {};
  base.forEach(s=>{ const i = intencaoDaMagia(s); porIntencao[i] = (porIntencao[i]||0) + 1; });
  if(mf.intencao && !porIntencao[mf.intencao]) mf.intencao = null;
  wrap.appendChild(el('div',{class:'chips-cat'}, INTENCOES_MAGIA.filter(([id])=> porIntencao[id]).map(([id, rot])=>
    el('button',{class:'chip-cat'+(mf.intencao===id?' on':''), 'aria-pressed': mf.intencao===id ? 'true' : 'false', onclick:()=>{ mf.intencao = mf.intencao===id ? null : id; render(); }}, rot+' '+porIntencao[id]))));
  if(mf.intencao) base = base.filter(s=> intencaoDaMagia(s)===mf.intencao);
  base = base.slice().sort((a,b)=> a.c-b.c || a.n.localeCompare(b.n));

  const novas = base.filter(s=> !conhecidas.has(s.n));
  const jaSei = base.filter(s=> conhecidas.has(s.n));
  const res = el('div',{class:'cat-lista'});
  if(!novas.length) res.appendChild(el('div',{class:'empty'}, base.length ? 'Você já conhece todas as magias deste filtro.' : 'Nenhuma magia com esses filtros.'));
  let ultimo = null;
  novas.forEach(s=>{
    if(mf.circulo==='todos' && s.c!==ultimo){ ultimo = s.c; res.appendChild(el('div',{class:'grupo-cat'}, el('span',{}, s.c+'º círculo'))); }
    linhaMagiaAprender(f, s, cc, false, mf).forEach(x=> res.appendChild(x));
  });
  if(jaSei.length){
    const ver = !!mf._verConhecidas;
    res.appendChild(el('button',{class:'conhecidas-linha', 'aria-expanded': ver ? 'true' : 'false', onclick:()=>{ mf._verConhecidas = !ver; render(); }},
      el('span',{}, jaSei.length+' que você já conhece'), el('span',{}, ver ? '▾' : '▸')));
    if(ver) jaSei.forEach(s=> linhaMagiaAprender(f, s, cc, true, mf).forEach(x=> res.appendChild(x)));
  }
  wrap.appendChild(res);

  if(cc){
    wrap.appendChild(el('button',{class:'link-superior', style:'margin-top:12px;', onclick:()=>{ mf.modo = modo==='possiveis' ? 'completo' : 'possiveis'; mf.circulo = 'todos'; render(); }},
      modo==='possiveis' ? '📚 Ver todas as magias (outros círculos e tradições)' : '↩ Voltar para as que você pode lançar'));
  }
  return wrap;
}
