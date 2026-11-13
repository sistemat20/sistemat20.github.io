// ============ EM JOGO (13/11/2026, prancha "Em jogo e Notas") ============
// Uma linha curta no painel Vida & Mana só com o que o jogador ATIVA na mesa:
//   · gasta PM fixo (Busca Interior, 1 PM; Golpe Pessoal já construído);
//   · PM à escolha (Canalizar Energia: teclas de quantos PM gastar);
//   · modo liga e desliga (Ataque Poderoso, Lobo Solitário): só lembrete, acende em verde;
//   · uso limitado ("1 por cena/dia"): bolinha que enche ao usar, ficha apagada até reiniciar.
// O que o app já soma sozinho (PODERES_AUTOMATIZADOS) não entra: não pede ação.
// Junto ficam 🌙 Descansar (as 4 qualidades) e 🎬 Nova cena, que antes moravam na Notas.

// Poderes que valem enquanto o jogador quiser: o app não soma, só lembra o efeito.
const MODOS_PODER = {
  'Ataque Poderoso': '−2 no ataque corpo a corpo, +5 no dano',
  'Lobo Solitário': '+1 em perícias e Defesa sem aliados em alcance curto',
};

// Todos os poderes do personagem com nome, origem e descrição (a mesma lista da Notas).
function coletarPoderes(f){
  const lista = [];
  const geral = (p, fonte, descPadrao)=>{
    const info = PODERES_GERAIS.find(x=>x.nome===p.nome);
    lista.push({nome: p.nome + (p.sub ? ' — '+p.sub : ''), chaveBase: p.nome, fonte, desc: info ? info.desc : (descPadrao||'')});
  };
  if(f.poderGeral && f.poderGeral.nome) geral(f.poderGeral, 'Origem: '+f.origem);
  if(f.poderGeralExtra && f.poderGeralExtra.nome) geral(f.poderGeralExtra, 'Origem: '+f.origem);
  if(f.origemPoderCategoria && f.origemPoderCategoria.nome){
    const c = f.origemPoderCategoria;
    if(c.sub){
      const info = PODERES_GERAIS.find(p=>p.nome===c.sub);
      lista.push({nome: c.sub + (c.subEscolha ? ' — '+c.subEscolha : ''), chaveBase: c.sub, fonte: 'Origem: '+f.origem+' ('+c.nome+')', desc: info ? info.desc : ''});
    } else {
      lista.push({nome: c.nome, chaveBase: c.nome, fonte: 'Origem: '+f.origem, desc: 'Combine com o mestre qual poder específico esse será e anote nas Notas.'});
    }
  }
  if(f.poderRaca && f.poderRaca.nome) geral(f.poderRaca, 'Raça: '+f.raca, 'Perícia/poder concedido pela raça.');
  if(f.origemPoder && f.origemPoder.nome) lista.push({nome: f.origemPoder.nome, chaveBase: f.origemPoder.nome, fonte: 'Origem: '+f.origem+' (único)', desc: f.origemPoder.desc||''});
  if(f.poderConcedido && f.poderConcedido.nome){
    const info = PODERES_CONCEDIDOS.find(p=>p.nome===f.poderConcedido.nome);
    lista.push({nome: f.poderConcedido.nome, chaveBase: f.poderConcedido.nome, fonte: 'Devoto de '+f.poderConcedido.deus, desc: info ? info.desc : ''});
  }
  (f.poderesClasse||[]).forEach((p, indiceOriginal)=>{
    let desc = '';
    if(p.trocaPorGeral){
      const info = PODERES_GERAIS.find(x=>x.nome===p.nome);
      desc = info ? info.desc : '';
    } else {
      const achado = (PODERES_CLASSE_COMPLETO[p.classe]||[]).find(x=>x.nome===p.nome);
      if(achado) desc = achado.desc;
      else {
        const cls = CLASSES[p.classe];
        const curto = cls ? cls.poderes.find(([n])=>n===p.nome) : null;
        desc = curto ? curto[1] : '';
      }
    }
    lista.push({nome: p.nome + (p.sub ? ' — '+p.sub : ''), chaveBase: p.nome, fonte: 'Nível '+p.nivel+' de '+p.classe+(p.trocaPorGeral ? ' (trocado)' : ''), desc, indicePoderesClasse: indiceOriginal});
  });
  return lista;
}

// Uso limitado de verdade: "uma vez por cena/dia". Fica de fora o que é por alvo ("contra um
// mesmo alvo", "em cada aliado") e o teto passivo ("PM temporários por cena"), que não se marcam.
function limiteDoPoder(desc){
  const m = String(desc||'').match(/(uma|duas|três|\d+)\s+vez(es)?\s+por\s+(cena|dia)(?!\s+(contra|em cada|por alvo|para cada))/i);
  return m ? m[3].toLowerCase() : null;
}
// Como o poder entra na mesa: 'auto' (o app soma), 'pm', 'pmvar', 'modo', 'uso' ou null (só leitura).
function classificarPoder(f, e){
  if(PODERES_AUTOMATIZADOS.has(e.chaveBase)) return {tipo:'auto'};
  const limite = limiteDoPoder(e.desc);
  if(e.chaveBase==='Golpe Pessoal' && e.indicePoderesClasse!=null){
    const g = (f.poderesClasse[e.indicePoderesClasse]||{}).golpeConstruido;
    if(g && g.arma) return {tipo:'pm', custo: calcularCustoGolpePessoal(g.escolhas), limite, rotulo: g.nomeGolpe || 'Golpe Pessoal'};
    return {tipo:null, limite};
  }
  if(MODOS_PODER[e.chaveBase]) return {tipo:'modo', efeito: MODOS_PODER[e.chaveBase]};
  const desc = e.desc||'';
  if(/para cada PM|cada PM gasto|\+ PM:/i.test(desc)) return {tipo:'pmvar', limite};
  const m = desc.match(/gast\w*\s+(?:[a-zà-ú]+\s+){0,3}?\+?(\d+)\s*PM/i);
  if(m) return {tipo:'pm', custo: parseInt(m[1]), limite};
  if(limite) return {tipo:'uso', limite};
  return {tipo:null};
}

function poderesEmJogo(f){
  return coletarPoderes(f).map(e=> Object.assign({}, e, classificarPoder(f, e)))
    .filter(p=> p.tipo && p.tipo!=='auto');
}
function modoLigado(f, nome){ return !!(f.modosAtivos && f.modosAtivos[nome]); }
function alternarModoPoder(f, nome){
  if(!f.modosAtivos) f.modosAtivos = {};
  f.modosAtivos[nome] = !f.modosAtivos[nome];
  if(!f.modosAtivos[nome]) delete f.modosAtivos[nome];
  salvarPerfis(); render();
  flashMsg(modoLigado(f, nome) ? nome+' ligado: '+MODOS_PODER[nome] : nome+' desligado');
}

// Gasta os PM (o temporário primeiro, a mesma regra dos anéis) e marca o uso limitado.
// O log usa "Usou o poder", sem aspas, para o resumo da sessão não contar como magia.
function usarPoderEmJogo(f, p, custo){
  if(p.limite && poderFoiUsado(f, p.chaveBase)){ flashMsg('Já usado. Volta '+(p.limite==='cena' ? 'na próxima cena.' : 'depois de descansar.')); return; }
  custo = parseInt(custo)||0;
  if(custo > 0){
    const d = dadosAnel(f, 'pm');
    if(d.atual + d.temp < custo){ flashMsg('Mana insuficiente: precisa de '+custo+' PM.'); return; }
    const r = previaAnel(d, 'base', -custo);
    f.pmtemp = r.temp; f.pmatual = r.atual;
  }
  if(p.limite){
    if(!f.poderesUsados) f.poderesUsados = {};
    f.poderesUsados[p.chaveBase] = true;
  }
  const nome = p.rotulo || p.chaveBase;
  registrarLog(f, 'Usou o poder '+nome+(custo>0 ? ' (−'+custo+' PM)' : ''));
  state._ejSel = null; state._ejValor = null;
  salvarPerfis();
  if(typeof Som!=='undefined') Som.tocar('brilho');
  flashMsg('⚡ '+nome+(custo>0 ? ': −'+custo+' PM' : ' usado'));
  render();
}

function renderEmJogo(f){
  const wrap = el('div',{class:'em-jogo'});
  const descAberto = state._descansoAberto===f.id;
  wrap.appendChild(el('div',{class:'acoes-vm'},
    el('button',{class: descAberto ? 'on' : '', onclick:()=>{ state._descansoAberto = descAberto ? null : f.id; render(); }}, '🌙 Descansar'),
    el('button',{onclick:()=> novaCena(f)}, '🎬 Nova cena')));
  if(descAberto) wrap.appendChild(renderGavetaDescanso(f));

  const lista = poderesEmJogo(f);
  if(!lista.length) return wrap;
  wrap.appendChild(el('div',{class:'rot-emjogo'}, 'Em jogo'));
  const fichas = el('div',{class:'emjogo'});
  lista.forEach(p=>{
    const usado = p.limite ? poderFoiUsado(f, p.chaveBase) : false;
    const ligado = p.tipo==='modo' && modoLigado(f, p.chaveBase);
    const cls = 'ej'+(p.tipo==='modo' ? ' modo' : '')+(ligado ? ' on' : '')+(usado ? ' usado' : '')+(state._ejSel===p.chaveBase ? ' sel' : '');
    fichas.appendChild(el('button',{class: cls, onclick:()=>{
      if(p.tipo==='modo'){ state._ejSel = null; alternarModoPoder(f, p.chaveBase); return; }
      state._ejSel = state._ejSel===p.chaveBase ? null : p.chaveBase; state._ejValor = null; render();
    }},
      p.rotulo || p.chaveBase,
      p.tipo==='pm' ? el('span',{class:'c'}, p.custo+' PM') : p.tipo==='pmvar' ? el('span',{class:'c'}, 'PM') : null,
      p.limite ? el('span',{class:'pip'+(usado ? ' usado' : ''), title:'1 por '+p.limite}) : null));
  });
  wrap.appendChild(fichas);
  const sel = lista.find(p=> p.chaveBase===state._ejSel);
  if(sel) wrap.appendChild(renderGavetaPoder(f, sel));
  return wrap;
}

function renderGavetaPoder(f, p){
  const usado = p.limite ? poderFoiUsado(f, p.chaveBase) : false;
  const filhos = [el('div',{}, el('b',{}, p.nome+'. '), p.desc || 'Sem descrição cadastrada: confira no livro.')];
  let custo = p.tipo==='pm' ? p.custo : 0;
  if(p.tipo==='pmvar'){
    const d = dadosAnel(f, 'pm');
    const max = Math.max(1, Math.min(nivelTotal(f) || 1, d.atual + d.temp, 10));
    filhos.push(el('div',{class:'pergunta'}, 'Quantos PM gastar?'));
    filhos.push(el('div',{class:'teclas'}, Array.from({length:max}, (_,k)=> k+1).map(x=>
      el('button',{class: state._ejValor===x ? 'on' : '', onclick:()=>{ state._ejValor = x; render(); }}, String(x)))));
    custo = state._ejValor || 0;
  }
  if(usado) filhos.push(el('div',{class:'aviso-ej'}, p.limite==='cena' ? 'Já usado nesta cena. Volta na próxima cena.' : 'Já usado hoje. Volta depois de descansar.'));
  const podeUsar = !usado && !(p.tipo==='pmvar' && !custo);
  const rotulo = usado ? 'Usado' : p.tipo==='pmvar' && !custo ? 'Escolha os PM' : custo ? 'Usar · −'+custo+' PM' : 'Marcar como usado';
  filhos.push(el('div',{class:'duo'},
    usado ? el('button',{class:'btn ghost', onclick:()=>{ alternarUsoPoder(f, p.chaveBase); }}, 'Liberar de novo')
          : el('button',{class:'btn ghost', onclick:()=>{ state._ejSel = null; state._ejValor = null; render(); }}, 'Fechar'),
    el('button',{class:'btn', disabled: !podeUsar, onclick:()=> usarPoderEmJogo(f, p, custo)}, rotulo)));
  return el('div',{class:'gaveta gaveta-ej'}, filhos);
}

function renderGavetaDescanso(f){
  const nivel = nivelTotal(f);
  const filhos = [el('div',{}, f.raca==='Golem'
    ? 'Golem fica inerte 8h: recupera vida e mana sempre no ritmo normal ('+nivel+'), não importa o lugar.'
    : 'Uma noite de sono recupera vida e mana pelo nível ('+nivel+') vezes a qualidade, e reinicia os usos por cena e por dia.')];
  const bonus = f._descansoBonusPendente;
  if(bonus && (bonus.pv>0 || bonus.pm>0)) filhos.push(el('div',{class:'meta-ej'}, '🍲 Comida guardada: +'+bonus.pv+' PV e +'+bonus.pm+' PM por nível.'));
  filhos.push(el('div',{class:'desc-qual'}, Object.keys(QUALIDADE_DESCANSO).map(q=>{
    const ganho = f.raca==='Golem' ? nivel : Math.floor(nivel*QUALIDADE_DESCANSO[q]);
    return el('button',{onclick:()=>{ state._descansoAberto = null; aplicarDescanso(f, q); }}, q, el('small',{}, '+'+ganho+' PV/PM'));
  })));
  return el('div',{class:'gaveta gaveta-ej'}, filhos);
}

// Manobras junto dos ataques: uma linha com o teste (Luta) que abre as cinco manobras.
function renderLinhaManobras(f){
  const luta = PERICIAS.find(p=>p.nome==='Luta');
  const v = luta ? periciaValor(f, luta) : 0;
  const aberto = !!state._manobrasAbertas;
  const linha = el('div',{class:'manob', onclick:()=>{ state._manobrasAbertas = !aberto; render(); }},
    el('span',{}, '⚔️ Manobras · teste ', el('b',{}, 'Luta '+(v>=0?'+':'')+v)), el('span',{}, aberto ? '▾' : '▸'));
  if(!aberto) return linha;
  return el('div',{}, linha, el('div',{class:'lista-man'},
    el('div',{class:'nota-man'}, 'Teste oposto de Luta contra o alvo, só corpo a corpo.'),
    MANOBRAS_COMBATE.map(([n, t])=> el('div',{}, el('b',{}, n+': '), t))));
}

// ---- Busca da Notas: acha poderes, habilidades e tudo da campanha ----
function semAcento(t){ return String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(); }
function itensBuscaNotas(f){
  const it = [];
  coletarPoderes(f).forEach(e=> it.push({nome:e.nome, sub:'Poder · '+e.fonte, parte:'regras', secao:'poderes', texto:e.desc}));
  (f.habilidadesIniciais||[]).concat(habilidadesAutomaticasDeNiveis(f)).forEach(h=> it.push({nome:h.nome, sub:'Habilidade'+(h.fonte ? ' · '+h.fonte : ''), parte:'regras', secao:'habilidades-iniciais', texto:h.desc}));
  (f.missoes||[]).forEach(m=> it.push({nome:m.texto, sub:'Missão'+(m.concluida ? ' · concluída' : ''), parte:'campanha', secao:'missoes'}));
  (f.faccoes||[]).forEach(x=> it.push({nome:x.nome, sub:'Facção', parte:'campanha', secao:'faccoes', texto:x.notas}));
  (f.relacionamentos||[]).forEach(x=> it.push({nome:x.nome, sub:'Relacionamento', parte:'campanha', secao:'relacionamentos', texto:x.notas}));
  (f.locais||[]).forEach(x=> it.push({nome:x.nome, sub:'Local', parte:'campanha', secao:'locais', texto:x.notas}));
  if((f.notas||'').trim()) it.push({nome:'Anotações', sub:'texto livre', parte:'campanha', secao:'anotacoes', texto:f.notas});
  return it.filter(x=> x.nome);
}
function renderResultadosBuscaNotas(f, busca){
  const q = semAcento(busca);
  const achados = itensBuscaNotas(f).filter(x=> semAcento(x.nome).includes(q) || semAcento(x.texto).includes(q));
  const painel = el('div',{class:'panel resultados-notas'});
  if(!achados.length){ painel.appendChild(el('div',{class:'empty'}, 'Nada encontrado para "'+busca+'".')); return painel; }
  achados.slice(0, 40).forEach(x=> painel.appendChild(el('button',{class:'pd', onclick:()=>{
    state._notasParte = x.parte; state._notasBusca = '';
    if(!state._secoesNotasAbertas) state._secoesNotasAbertas = {};
    state._secoesNotasAbertas[x.secao] = true;
    render();
  }}, el('span',{}, x.nome), el('small',{}, x.sub))));
  return painel;
}
