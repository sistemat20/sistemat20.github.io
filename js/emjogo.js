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
  if(/para cada PM|cada PM gasto|\+ PM:|quantidade de PM [àa] sua escolha/i.test(desc)){
    // "limitado pelo seu Carisma" (Orgulho, Gritar ordens): as teclas vão até o Carisma
    const porCarisma = /limitad[oa] pel[oa] seu Carisma/i.test(desc);
    return {tipo:'pmvar', limite, maxPm: porCarisma ? Math.max(1, atributoEfetivo(f, 'car')) : null};
  }
  const m = desc.match(/gast\w*\s+(?:[a-zà-ú]+\s+){0,5}?\+?(\d+)\s*PM/i);
  if(m){
    const base = parseInt(m[1]);
    // Habilidade que cresce com o nível ("A cada quatro níveis, pode gastar +1 PM"): em T20 o
    // extra chega nos níveis 5, 9, 13, 17 (a cada quatro) ou 6, 11, 16 (a cada cinco).
    const esc = desc.match(/A cada (dois|três|quatro|cinco|seis|\d+) níveis,?\s+(?:você\s+)?pode gastar \+(\d+) PM/i);
    if(esc){
      const NUM = {dois:2, 'três':3, quatro:4, cinco:5, seis:6};
      const passo = NUM[esc[1].toLowerCase()] || parseInt(esc[1]) || 4;
      const extras = Math.floor(Math.max(0, nivelDaFonte(f, e.fonte) - 1) / passo);
      if(extras > 0) return {tipo:'pmesc', custo: base, opcoes: Array.from({length: extras+1}, (_,k)=> base + k*parseInt(esc[2])), limite};
    }
    return {tipo:'pm', custo: base, limite};
  }
  if(limite) return {tipo:'uso', limite};
  return {tipo:null};
}

// Nível da classe que deu o poder ("Nível 5 de Guerreiro", "Classe: Guerreiro"); sem classe, o total.
function nivelDaFonte(f, fonte){
  const m = String(fonte||'').match(/(?:de|Classe:)\s+([A-ZÀ-Ú][\wÀ-ú]+)/);
  const c = m && (f.classesNiveis||[]).find(x=> x.classe===m[1]);
  return c ? (parseInt(c.nivel)||1) : (nivelTotal(f)||1);
}
// Habilidades de raça, classe e nível, sem repetir ("Ataque especial +8" do 5º nível é a mesma
// "Ataque Especial" do 1º): fica a que tem descrição, com o nome mais recente para mostrar.
function chaveHabilidade(nome){ return semAcento(String(nome||'').replace(/\s*[\+\-]?\s*\d+[dº°]?\d*\s*$/, '').replace(/\s*\([^)]*\)\s*$/, '').trim()); }
function coletarHabilidades(f){
  const porChave = {};
  const ordem = [];
  (f.habilidadesIniciais||[]).concat(habilidadesAutomaticasDeNiveis(f)).forEach(h=>{
    const k = chaveHabilidade(h.nome); if(!k) return;
    const atual = porChave[k];
    if(!atual){
      const base = String(h.nome).replace(/\s*[\+\-]?\s*\d+[dº°]?\d*\s*$/, '').trim();
      porChave[k] = {nome: h.nome[0].toUpperCase()+h.nome.slice(1), chaveBase: base[0].toUpperCase()+base.slice(1), fonte: h.fonte||'', desc: h.desc||'', habilidade: true};
      ordem.push(k);
    } else {
      if(!atual.desc && h.desc) atual.desc = h.desc;
      atual.nome = h.nome[0].toUpperCase()+h.nome.slice(1); // a mais recente ("Inspiração +2") mostra o valor de agora
      if(/^Nível/.test(h.fonte||'')) atual.fonte = h.fonte;
    }
  });
  return ordem.map(k=> porChave[k]);
}
function poderesEmJogo(f){
  return coletarPoderes(f).concat(coletarHabilidades(f)).map(e=> Object.assign({}, e, classificarPoder(f, e)))
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
      p.tipo==='pm' ? el('span',{class:'c'}, p.custo+' PM') : p.tipo==='pmesc' ? el('span',{class:'c'}, p.opcoes[0]+'–'+p.opcoes[p.opcoes.length-1]+' PM') : p.tipo==='pmvar' ? el('span',{class:'c'}, 'PM') : null,
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
  if(p.tipo==='pmvar' || p.tipo==='pmesc'){
    const d = dadosAnel(f, 'pm');
    const opcoes = p.tipo==='pmesc' ? p.opcoes
      : Array.from({length: Math.max(1, Math.min(p.maxPm || nivelTotal(f) || 1, Math.max(1, d.atual + d.temp), 10))}, (_,k)=> k+1);
    filhos.push(el('div',{class:'pergunta'}, p.tipo==='pmesc' ? 'Quantos PM gastar? (cresce com o nível)' : 'Quantos PM gastar?'));
    filhos.push(el('div',{class:'teclas'}, opcoes.map(x=>
      el('button',{class: state._ejValor===x ? 'on' : '', onclick:()=>{ state._ejValor = x; render(); }}, String(x)))));
    custo = state._ejValor || 0;
  }
  if(usado) filhos.push(el('div',{class:'aviso-ej'}, p.limite==='cena' ? 'Já usado nesta cena. Volta na próxima cena.' : 'Já usado hoje. Volta depois de descansar.'));
  const escolhe = p.tipo==='pmvar' || p.tipo==='pmesc';
  const podeUsar = !usado && !(escolhe && !custo);
  const rotulo = usado ? 'Usado' : escolhe && !custo ? 'Escolha os PM' : custo ? 'Usar · −'+custo+' PM' : 'Marcar como usado';
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

// Nome da habilidade na Notas com o selo "ativa" quando ela também está no Em jogo.
function nomeHabilidadeComSelo(f, h){
  const k = chaveHabilidade(h.nome);
  const e = coletarHabilidades(f).find(x=> chaveHabilidade(x.nome)===k) || h;
  const tipo = classificarPoder(f, Object.assign({chaveBase: h.nome}, e)).tipo;
  return tipo && tipo!=='auto' ? el('span',{}, h.nome, ' ', el('span',{class:'selo-poder'}, 'ativa')) : h.nome;
}
