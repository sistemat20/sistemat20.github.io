// ============ EXPERIÊNCIA DE JOGO ============
// Cinco camadas por cima da ficha e da mesa do Mestre, vindas da revisão de design de 02/11/2026
// (cofre do T20, 07 Design). Nenhuma muda regra nem dado salvo: só como as coisas aparecem.
//   1. Atmosfera: a ficha sente a condição do personagem (Abalado, Envenenado, Fatigado, por um fio).
//   2. Presente: escolher o destino pelo rosto, o item voa até ele, e "(recebido de X)" vira selo.
//   3. Grimório: magias em cartas e prévia de quanto a mana vai ficar antes de lançar.
//   4. Resumo da última sessão: stories montados do log da ficha, uma vez por sessão.
//   5. Mesa ao vivo: no Combate do Mestre, vida/mana de cada PJ animando e o que acabou de acontecer.
// Os estilos ficam em css/experiencia.css.

// ---------------------------------------------------------------- 1. Atmosfera
const CHAVE_ATMOSFERA = 'painel_aventureiro_atmosfera';
function atmosferaAtiva(){
  try{ return localStorage.getItem(CHAVE_ATMOSFERA) !== 'off'; }catch(e){ return true; }
}
function alternarAtmosfera(){
  const ligar = !atmosferaAtiva();
  try{ localStorage.setItem(CHAVE_ATMOSFERA, ligar ? 'on' : 'off'); }catch(e){}
  flashMsg(ligar ? '✨ Efeitos de atmosfera ligados.' : 'Efeitos de atmosfera desligados.');
}
// Um clima por vez, do mais grave pro mais leve. Morto ou sangrando já tem a vinheta-tormenta,
// então aqui não entra nada nesses casos (não somar dois efeitos fortes na mesma tela).
function atmosferaDaFicha(f){
  if(!f || !atmosferaAtiva() || estaMorto(f) || estaInconsciente(f)) return null;
  const conds = condicoesAtivas(f);
  const pv = parseInt(f.pvatual)||0;
  const max = pvMaxEfetivo(f) || 1;
  if(pv > 0 && pv/max <= 0.25) return {classe:'', camada:'atm-fio'};
  if(conds.includes('Abalado') || conds.includes('Apavorado')) return {classe:'atm-abalado', camada:null};
  if(conds.includes('Envenenado')) return {classe:'', camada:'atm-veneno'};
  if(conds.includes('Fatigado') || conds.includes('Exausto')) return {classe:'', camada:'atm-fadiga'};
  return null;
}

// ---------------------------------------------------------------- 2. Presente
// "Casaco longo (recebido de Ravena) (recebido de Emival)" → base "Casaco longo", de "Emival".
// Só muda a EXIBIÇÃO: o nome salvo continua igual, porque a proteção de presentes
// (mesclarSemPerderDados, mesclarPresentesDoServidor) reconhece presente por esse texto.
const RE_PRESENTE = /\s*\(recebido (do Mestre|de [^)]*)\)/g;
function separarPresente(nomeItem){
  const nome = String(nomeItem||'');
  const marcas = [...nome.matchAll(RE_PRESENTE)].map(m=>m[1]);
  if(!marcas.length) return {base:nome, de:null};
  const ultima = marcas[marcas.length-1];
  return {base: nome.replace(RE_PRESENTE,'').trim() || nome, de: ultima==='do Mestre' ? 'do Mestre' : ultima.replace(/^de /,'').trim()};
}
function nomeItemComSelo(nomeItem, sufixo){
  const p = separarPresente(nomeItem);
  return [p.base + (sufixo||''), p.de ? el('span',{class:'selo-presente', title:String(nomeItem)}, p.de==='do Mestre' ? 'presente do Mestre' : 'presente de '+p.de) : null];
}
function letraInicial(nome){ return (String(nome||'?').trim()[0]||'?').toUpperCase(); }
function rostoPersonagem(p, classe){
  return el('span',{class:classe||'rosto'}, p && p.foto ? el('img',{src:p.foto, alt:''}) : letraInicial(p && p.nome));
}
// Grade de rostos pra escolher o destino de um item ou de dinheiro.
function renderAvataresDestino(lista, aoEscolher){
  const grade = el('div',{class:'presente-avatares'});
  lista.forEach(p=>{
    grade.appendChild(el('button',{class:'presente-avatar', 'aria-label':'Enviar para '+p.nome, onclick:()=>aoEscolher(p)},
      rostoPersonagem(p),
      el('span',{class:'nome'}, p.nome),
      p.jogador ? el('span',{class:'jogador'}, p.jogador) : null
    ));
  });
  return grade;
}
function animarPresente(rotuloItem, destino){
  const marca = Date.now();
  state._presenteVoo = {item:rotuloItem, nome:destino.nome, foto:destino.foto||'', marca};
  setTimeout(()=>{ if(state._presenteVoo && state._presenteVoo.marca===marca){ state._presenteVoo = null; render(); } }, 2900);
}
function renderPresenteVoo(){
  const v = state._presenteVoo;
  return el('div',{class:'presente-voo', 'aria-live':'polite'},
    el('div',{class:'item'}, v.item),
    rostoPersonagem(v),
    el('div',{class:'aviso'}, v.item+' → '+v.nome)
  );
}

// ---------------------------------------------------------------- 3. Grimório
// Grade VERTICAL de cartas (nunca rolagem de lado: a ficha inteira já usa o arrastar lateral
// pra ir até Perícias). Fechada, a carta mostra o que a magia faz em poucas linhas; um toque
// abre a carta inteira com descrição, detalhes, aprimoramentos, Lançar e Esquecer. Substitui a
// lista antiga de Minhas Magias (era a mesma informação duas vezes).
function siglaEscola(escola){ return String(escola||'?').slice(0,2); }
function renderGrimorioCartas(f, aoEsquecer){
  if(!f.magias || !f.magias.length) return null;
  const pm = parseInt(f.pmatual)||0;
  const mago = f.arcanistaCaminho==='Mago';
  const grade = el('div',{class:'grimorio-grade'});
  f.magias.forEach((s, idx)=>{
    const custo = custoPMAjustado(f, s);
    const aberta = state._cartaMagiaAberta === s.n;
    const alternar = ()=>{ state._cartaMagiaAberta = aberta ? null : s.n; render(); };
    const selos = [
      s.trad==='Universal' ? el('span',{class:'selo-carta universal'}, 'Universal') : null,
      mago ? el('span',{class:'selo-carta'}, (f.magiasMemorizadas||[]).includes(s.n) ? 'memorizada' : 'não memorizada') : null,
    ];
    const topo = el('span',{class:'topo'},
      el('span',{class:'circulo'}, (s.c||'?')+'º círculo'),
      el('span',{class:'custo'}, custo+' PM')
    );
    const escola = el('span',{class:'escola'}, [s.e, s.execucao].filter(Boolean).join(' · '));
    if(!aberta){
      // Fechada: a carta de tarô (círculo, selo da escola, nome, escola, custo). O texto da
      // magia só aparece ao abrir.
      grade.appendChild(el('button',{class:'grimorio-carta fechada'+(custo>pm?' sem-mana':''), 'aria-expanded':'false', 'aria-label':s.n+', '+custo+' PM. Toque para ver a descrição', onclick:alternar},
        el('span',{class:'circulo'}, (s.c||'?')+'º CÍRCULO'),
        el('span',{class:'selo-escola', 'aria-hidden':'true'}, siglaEscola(s.e)),
        el('span',{class:'nome'}, s.n),
        el('span',{class:'escola'}, s.e||''),
        el('span',{class:'selos'}, ...selos),
        el('span',{class:'custo'}, custo+' PM')
      ));
      return;
    }
    const cdEsp = cdMagiaEspecifica(f, s);
    const carta = el('div',{class:'grimorio-carta aberta'},
      el('button',{class:'cabeca', 'aria-expanded':'true', onclick:alternar}, topo, el('span',{class:'nome'}, s.n), escola, el('span',{class:'selos'}, ...selos)),
      el('div',{class:'desc'}, s.d||''),
      el('div',{class:'magia-info-grid'},
        el('div',{}, el('span',{class:'magia-info-ico'},'Execução'), el('span',{}, s.execucao||'—')),
        el('div',{}, el('span',{class:'magia-info-ico'},'Alcance'), el('span',{}, s.alcance||'—')),
        el('div',{}, el('span',{class:'magia-info-ico'},'Alvo'), el('span',{}, s.alvo||'—')),
        el('div',{}, el('span',{class:'magia-info-ico'},'Duração'), el('span',{}, s.duracao||'—')),
        el('div',{style:'grid-column:1/-1;'}, el('span',{class:'magia-info-ico'},'Resistência'), el('span',{}, (s.resistencia||'—')+(cdEsp!=null && s.resistencia ? ' · CD '+cdEsp : '')))
      ),
      (s.aprim && s.aprim.length) ? el('div',{class:'aprims'},
        el('div',{class:'magia-info-ico'}, 'Aprimoramentos'),
        ...s.aprim.map(a=> el('div',{class:'aprim'}, el('b',{}, a.custo), ' ', a.efeito))
      ) : null,
      el('div',{class:'acoes'},
        el('button',{class:'btn', onclick:()=>abrirUsarMagia(s)}, custo>pm ? 'Lançar (falta mana)' : '✨ Lançar · '+custo+' PM'),
        aoEsquecer ? el('button',{class:'btn ghost', onclick:()=>aoEsquecer(s, idx)}, 'Esquecer') : null
      )
    );
    grade.appendChild(carta);
  });
  return el('div',{},
    el('div',{class:'meta', style:'margin:6px 0 4px;'}, 'Toque numa carta para ver tudo e lançar. As apagadas custam mais do que a sua mana agora.'),
    grade
  );
}
// Barra de mana com o gasto listrado ANTES de confirmar: dá pra ver se vai sobrar.
function renderManaPrevia(f, total){
  const pm = parseInt(f.pmatual)||0;
  const max = pmMaxEfetivo(f) || Math.max(pm, 1);
  const gasto = Math.max(0, total||0);
  const falta = gasto > pm;
  const depois = Math.max(0, pm - gasto);
  const pct = (v)=> Math.max(0, Math.min(100, v/max*100)).toFixed(1)+'%';
  return el('div',{class:'mana-previa'+(falta?' insuficiente':'')},
    el('div',{class:'linha'},
      el('span',{}, 'MANA'),
      el('span',{class:'valor'}, pm+' / '+max, ' ', el('span',{class:'depois'}, falta ? 'falta '+(gasto-pm)+' PM' : '→ '+depois))
    ),
    el('div',{class:'trilho'},
      el('div',{class:'resta', style:'width:'+pct(depois)+';'}),
      el('div',{class:'gasto', style:'left:'+pct(depois)+';width:'+pct(Math.min(gasto, pm))+';'})
    )
  );
}
function animarMagiaLancada(nome){
  const marca = Date.now();
  state._magiaLancada = {nome, marca};
  setTimeout(()=>{ if(state._magiaLancada && state._magiaLancada.marca===marca){ state._magiaLancada = null; render(); } }, 1150);
}
function renderMagiaLancada(){
  return el('div',{class:'magia-lancada', 'aria-hidden':'true'}, state._magiaLancada.nome);
}

// ---------------------------------------------------------------- 4. Resumo da última sessão
const INTERVALO_SESSAO_MS = 4*60*60*1000; // 4h sem mexer na ficha = sessão encerrada
const CHAVE_RESUMO_VISTO = 'painel_aventureiro_resumo_visto_';

// Entradas do log da última sessão (as mais recentes até um buraco de 4h).
function entradasUltimaSessao(f){
  const log = (f.log||[]).filter(e=>e && e.ts).slice().sort((a,b)=>b.ts-a.ts);
  const grupo = [];
  for(const e of log){
    if(grupo.length && grupo[grupo.length-1].ts - e.ts > INTERVALO_SESSAO_MS) break;
    grupo.push(e);
  }
  return grupo;
}
function resumoUltimaSessao(f){
  const g = entradasUltimaSessao(f);
  if(g.length < 3) return null;
  const magias = {}; let pmMagia = 0, lancamentos = 0, comAprim = {};
  let dano = 0, cura = 0, tGanho = 0, tGasto = 0;
  const marcos = [];
  g.forEach(({texto})=>{
    const t = String(texto||'');
    let m;
    if((m = t.match(/^Usou "([^"]+)"(.*)\(-(\d+) PM\)/))){
      magias[m[1]] = (magias[m[1]]||0) + 1;
      if(/aprimoramento/.test(m[2])) comAprim[m[1]] = true;
      pmMagia += parseInt(m[3],10)||0; lancamentos++;
    } else if((m = t.match(/^([+-]\d+) PV \(/))){
      const d = parseInt(m[1],10);
      if(d<0) dano += -d; else cura += d;
    } else if((m = t.match(/^(Gastou|Recebeu|Enviou) (\d+) T\$/))){
      const v = parseInt(m[2],10)||0;
      if(m[1]==='Recebeu') tGanho += v; else tGasto += v;
    } else if(/^(Level up:|Ganhou um parceiro:|Aprendeu a magia:|Ganhou a condição:|Foi amaldiçoado|Adicionou à mochila:|Adicionou local)/.test(t)){
      marcos.push(t.replace(/^Adicionou à mochila: /,'Novo item: ').replace(/^Level up: /,'Subiu de nível: '));
    }
  });
  const quando = new Date(g[0].ts);
  const meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const slides = [{tipo:'abertura', data: quando.getDate()+' de '+meses[quando.getMonth()]}];
  const listaMagias = Object.entries(magias).sort((a,b)=>b[1]-a[1]);
  if(lancamentos){
    slides.push({tipo:'magia', lancamentos, pm:pmMagia, lista:listaMagias.slice(0,5)});
    if(listaMagias[0][1] >= 2){
      const nome = listaMagias[0][0];
      const s = (f.magias||[]).find(x=>x.n===nome);
      slides.push({tipo:'favorita', nome, vezes:listaMagias[0][1], aprim:!!comAprim[nome], frase: s && s.d ? s.d.split(/(?<=\.)\s/)[0] : ''});
    }
  }
  if(dano || cura) slides.push({tipo:'vida', dano, cura});
  if(tGanho || tGasto) slides.push({tipo:'bolsa', saldo:tGanho - tGasto, ganho:tGanho, gasto:tGasto, atual:parseInt(f.ts)||0});
  if(marcos.length) slides.push({tipo:'marcos', lista:marcos.slice(0,5)});
  slides.push({tipo:'volta'});
  return {fim:g[0].ts, slides};
}
// Abre sozinho uma vez, quando a última sessão já acabou e ainda não foi vista neste aparelho.
function verificarResumoAoAbrir(f){
  if(!state._resumoChecado) state._resumoChecado = {};
  if(state._resumoChecado[f.id]) return;
  state._resumoChecado[f.id] = true;
  const r = resumoUltimaSessao(f);
  if(!r || Date.now() - r.fim < INTERVALO_SESSAO_MS) return;
  let visto = 0;
  try{ visto = parseInt(localStorage.getItem(CHAVE_RESUMO_VISTO+f.id),10)||0; }catch(e){}
  if(visto >= r.fim) return;
  abrirResumoSessao(f);
}
function abrirResumoSessao(f){
  const r = resumoUltimaSessao(f);
  if(!r){ flashMsg('Ainda não tem registro suficiente de uma sessão nesta ficha.'); return; }
  state._resumo = {fid:f.id, i:0, r, marca:Date.now()};
  agendarResumo();
  render();
}
function irResumo(i){
  const R = state._resumo; if(!R) return;
  if(i < 0) i = 0;
  if(i >= R.r.slides.length){ fecharResumo(); return; }
  R.i = i; R.marca = Date.now();
  agendarResumo();
  render();
}
function agendarResumo(){
  const R = state._resumo; if(!R) return;
  const marca = R.marca;
  if(R.i >= R.r.slides.length-1) return; // o último espera o toque
  setTimeout(()=>{ if(state._resumo && state._resumo.marca===marca) irResumo(state._resumo.i+1); }, 5000);
}
function fecharResumo(){
  const R = state._resumo; if(!R) return;
  try{ localStorage.setItem(CHAVE_RESUMO_VISTO+R.fid, String(R.r.fim)); }catch(e){}
  state._resumo = null;
  render();
}
function renderResumoSessao(f){
  const R = state._resumo;
  const s = R.r.slides[R.i];
  const corpo = el('div',{class:'corpo'});
  const add = (...n)=> n.forEach(x=>x && corpo.appendChild(x));
  if(s.tipo==='abertura'){
    add(el('div',{class:'rotulo'}, 'ANTES DE COMEÇAR'),
        el('div',{class:'grande'}, 'Na última sessão…'),
        el('div',{class:'citacao'}, s.data+'. Um minuto para lembrar onde '+(f.nome||'o personagem')+' parou, montado a partir do log da ficha.'));
  } else if(s.tipo==='magia'){
    const max = s.lista[0][1];
    add(el('div',{class:'rotulo', style:'color:var(--pm-accent);'}, 'MAGIA'),
        el('div',{class:'grande', style:'color:var(--pm-accent);'}, s.lancamentos+(s.lancamentos>1?' magias':' magia')),
        el('div',{class:'medio'}, s.pm+' PM gastos lançando'),
        el('div',{class:'lista'}, ...s.lista.map(([nome,v])=> el('div',{},
          el('div',{class:'lin'}, el('span',{}, nome), el('span',{style:'color:#c7b998;'}, v+(v>1?' vezes':' vez'))),
          el('div',{class:'trilho'}, el('div',{style:'width:'+(v/max*100)+'%;'}))
        ))));
  } else if(s.tipo==='favorita'){
    add(el('div',{class:'rotulo'}, 'A FAVORITA'),
        el('div',{class:'grande'}, s.nome),
        el('div',{class:'medio'}, s.vezes+' vezes'+(s.aprim?', com aprimoramento':'')),
        s.frase ? el('div',{class:'citacao'}, '“'+s.frase+'”') : null);
  } else if(s.tipo==='vida'){
    add(el('div',{class:'rotulo', style:'color:var(--pv-accent);'}, 'VIDA'),
        el('div',{class:'dupla'},
          el('div',{}, el('div',{class:'meta'}, 'Dano recebido'), el('div',{class:'n', style:'color:var(--pv-accent);'}, '−'+s.dano)),
          el('div',{}, el('div',{class:'meta'}, 'Cura'), el('div',{class:'n', style:'color:#7fc77f;'}, '+'+s.cura))
        ));
  } else if(s.tipo==='bolsa'){
    add(el('div',{class:'rotulo'}, 'BOLSA'),
        el('div',{class:'grande', style:'color:'+(s.saldo<0?'var(--pv-accent)':'#7fc77f')+';'}, (s.saldo<0?'−':'+')+Math.abs(s.saldo)+' T$'),
        el('div',{class:'medio'}, 'Entrou '+s.ganho+' T$ · saiu '+s.gasto+' T$ · saldo agora '+s.atual+' T$'));
  } else if(s.tipo==='marcos'){
    add(el('div',{class:'rotulo'}, 'MARCOS'),
        el('div',{class:'lista'}, ...s.lista.map(t=> el('div',{style:'font-size:1.02rem;line-height:1.4;'}, '◆ '+t))));
  } else {
    const locais = (f.locais||[]);
    const proximo = locais.slice().reverse().find(l=>l && l.nota) || null;
    add(el('div',{class:'rotulo'}, 'COMO VOCÊ VOLTA'),
        el('div',{class:'dupla'},
          el('div',{}, el('div',{class:'meta'}, 'VIDA'), el('div',{class:'n', style:'color:var(--pv-accent);'}, (parseInt(f.pvatual)||0)+' / '+pvMaxEfetivo(f))),
          el('div',{}, el('div',{class:'meta'}, 'MANA'), el('div',{class:'n', style:'color:var(--pm-accent);'}, (parseInt(f.pmatual)||0)+' / '+pmMaxEfetivo(f)))
        ),
        proximo ? el('div',{class:'medio'}, 'Nos Locais: '+proximo.nome+' ('+proximo.nota+')') : null,
        el('button',{class:'btn', onclick:fecharResumo}, 'Abrir a ficha'));
  }
  const barras = el('div',{class:'barras'}, ...R.r.slides.map((_,k)=> el('div',{class:'barra'+(k<R.i?' feita':'')+(k===R.i?' atual':'')}, el('div',{}))));
  return el('div',{class:'resumo-sessao', role:'dialog', 'aria-label':'Resumo da última sessão'},
    barras,
    el('div',{class:'topo'}, rostoPersonagem(f, 'rosto-mini'), el('span',{}, el('b',{}, f.nome||''), ' · resumo da última sessão'),
      el('button',{class:'x', 'aria-label':'Fechar resumo', onclick:fecharResumo}, '✕')),
    el('div',{class:'palco'},
      el('div',{class:'lados'},
        el('button',{'aria-label':'Anterior', onclick:()=>irResumo(R.i-1)}),
        el('button',{'aria-label':'Próximo', onclick:()=>irResumo(R.i+1)})
      ),
      corpo
    ),
    el('div',{class:'rodape'}, 'Toque nas laterais para navegar · aparece uma vez depois de cada sessão (também no Menu)')
  );
}

// ---------------------------------------------------------------- 5. Mesa ao vivo (Mestre)
function tempoRelativo(ts){
  const s = Math.max(0, (Date.now()-ts)/1000);
  if(s < 60) return 'agora';
  if(s < 3600) return 'há '+Math.round(s/60)+' min';
  if(s < 86400) return 'há '+Math.round(s/3600)+' h';
  const d = new Date(ts);
  return d.getDate()+'/'+(d.getMonth()+1);
}
function corEventoLog(t){
  if(/^-\d+ PV/.test(t)) return 'var(--pv-accent)';
  if(/^\+\d+ PV/.test(t)) return '#7fc77f';
  if(/PM\)?$|^Usou "/.test(t)) return 'var(--pm-accent)';
  if(/T\$|TO |TC /.test(t)) return 'var(--gold)';
  if(/condição|amaldiçoad/.test(t)) return '#e2c46a';
  return 'var(--ink-soft)';
}
function renderMesaAoVivo(){
  const perfis = (state.perfisTodos||[]).filter(p=>p && p.id);
  if(!perfis.length) return null;
  const combate = state._mestreIniciativa;
  const daVez = combate && combate.combatentes && combate.combatentes[combate.turnoIdx];
  const idDaVez = daVez && daVez.tipo==='pj' ? daVez.origemId : null;
  if(!state._mesaUltimo) state._mesaUltimo = {};
  const grade = el('div',{class:'mesa-vivo'});
  perfis.forEach(p=>{
    const pv = parseInt(p.pvatual)||0, pvMax = pvMaxEfetivo(p)||1;
    const pm = parseInt(p.pmatual)||0, pmMax = pmMaxEfetivo(p)||1;
    const antes = state._mesaUltimo[p.id];
    const pctPv = Math.max(0, Math.min(100, pv/pvMax*100)), pctPm = Math.max(0, Math.min(100, pm/pmMax*100));
    const corPv = pctPv > 50 ? 'var(--status-saudavel)' : pctPv > 25 ? 'var(--status-ferido)' : 'var(--status-critico)';
    const mudouPv = antes && antes.pv !== pv, mudouPm = antes && antes.pm !== pm;
    const barra = (pct, cor, mudou, pctAntes)=> el('div',{class:mudou?'anima':'', style:'width:'+pct.toFixed(1)+'%;background:'+cor+';'+(mudou?'--de:'+pctAntes.toFixed(1)+'%;':'')});
    const conds = condicoesAtivas(p);
    grade.appendChild(el('div',{class:'mesa-card'+(p.id===idDaVez?' na-vez':'')+(antes && pv<antes.pv?' levou':'')},
      el('div',{class:'cab'},
        rostoPersonagem(p),
        el('div',{style:'min-width:0;'}, el('div',{class:'nome'}, p.nome||'?'), el('div',{class:'sub'}, (p._donoNome||p.jogador||'')+(p.id===idDaVez?' · é a vez agora':''))),
        el('div',{class:'def'}, defesaTotal(p), el('small',{}, ' DEF'))
      ),
      el('div',{}, el('div',{class:'rot'}, el('span',{}, 'VIDA'), el('b',{}, pv+' / '+pvMax)),
        el('div',{class:'trilho'}, barra(pctPv, corPv, mudouPv, antes ? antes.pv/pvMax*100 : pctPv))),
      el('div',{}, el('div',{class:'rot'}, el('span',{}, 'MANA'), el('b',{}, pm+' / '+pmMax)),
        el('div',{class:'trilho pm'}, barra(pctPm, 'var(--pm-accent)', mudouPm, antes ? antes.pm/pmMax*100 : pctPm))),
      conds.length || estaInconsciente(p) || estaMorto(p) ? el('div',{class:'conds'},
        estaMorto(p) ? el('span',{}, 'Morto') : (estaInconsciente(p) ? el('span',{}, p.estabilizado?'Inconsciente (estável)':'Sangrando') : null),
        ...conds.map(c=>el('span',{}, c))) : null
    ));
    state._mesaUltimo[p.id] = {pv, pm};
  });

  // O que acabou de acontecer: as entradas mais novas do log de todas as fichas, juntas.
  const eventos = [];
  perfis.forEach(p=> (p.log||[]).slice(0,8).forEach(e=>{ if(e && e.ts) eventos.push({ts:e.ts, nome:p.nome, texto:String(e.texto||'')}); }));
  eventos.sort((a,b)=>b.ts-a.ts);
  if(!state._mesaVistos){ state._mesaVistos = new Set(eventos.map(e=>e.ts+'|'+e.nome)); }
  const feed = el('div',{class:'mesa-feed'});
  // Com combate rolando, a lista de combatentes vem logo abaixo: o feed fica mais curto.
  const emCombate = !!(combate && combate.combatentes && combate.combatentes.length);
  eventos.slice(0, emCombate ? 4 : 8).forEach(e=>{
    const chave = e.ts+'|'+e.nome;
    const novo = !state._mesaVistos.has(chave);
    state._mesaVistos.add(chave);
    feed.appendChild(el('div',{class:'ev'+(novo?' novo':'')},
      el('span',{class:'ponto', style:'background:'+corEventoLog(e.texto)+';'}),
      el('span',{}, el('b',{}, e.nome+': '), e.texto, el('span',{class:'quando'}, tempoRelativo(e.ts)))
    ));
  });
  return el('div',{class:'panel faixa'},
    el('h2',{}, 'Mesa ao vivo'),
    el('div',{class:'meta', style:'margin-bottom:8px;'}, 'Vida, mana e condições de cada PJ, atualizando sozinhas a cada poucos segundos.'),
    grade,
    eventos.length ? el('div',{class:'lista-secao-titulo', style:'margin-top:6px;'}, 'Acontecendo agora') : null,
    eventos.length ? feed : null
  );
}
