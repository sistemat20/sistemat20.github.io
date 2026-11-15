// ============ CAMPANHA DA NOTAS NO KIT (15/11/2026, "Um visual só", parte 3) ============
// Missões, Facções, Relacionamentos e Locais com as peças do kit: uma linha por registro, o
// detalhe numa gaveta ao tocar, e um "adicionar" compacto (campo e "+" na mesma linha).

// Campo e "+" na mesma linha. chave = nome do rascunho em state; aoAdicionar(texto).
function kAdicionar(id, chave, placeholder, aoAdicionar, extra){
  const enviar = ()=>{ const t = (state[chave]||'').trim(); if(!t) return; state[chave] = ''; aoAdicionar(t); };
  return el('div',{class:'k-adicionar'},
    el('input',{id, type:'text', placeholder, value: state[chave]||'', oninput:(e)=>{ state[chave] = e.target.value; }, onkeydown:(e)=>{ if(e.key==='Enter') enviar(); }}),
    el('button',{class:'k-mais', 'aria-label':'Adicionar', onclick:enviar}, '+'),
    extra||null);
}
const linkRemover = (rotulo, aoRemover)=> el('button',{class:'link-editar-item remover', onclick:(e)=>{ e.stopPropagation(); aoRemover(); }}, rotulo||'remover');

// ---- Missões: as pendentes em cima; as concluídas recolhidas ----
function renderPainelMissoes(f){
  if(!f.missoes) f.missoes = [];
  const pendentes = f.missoes.filter(m=> !m.concluida);
  const feitas = f.missoes.filter(m=> m.concluida);
  const resumo = !f.missoes.length ? null : pendentes.length ? pendentes.length+' pendente(s)' : 'Tudo concluído ✓';
  return renderSecaoNotasColapsavel('missoes', '📜', 'Missões', resumo, ()=>{
    const linha = (m)=> el('div',{class:'k-check'+(m.concluida ? ' feito' : '')},
      el('button',{class:'marca', 'aria-label': m.concluida ? 'Marcar como pendente' : 'Marcar como concluída', onclick:()=>{ m.concluida = !m.concluida; if(m.concluida) registrarLog(f, 'Missão concluída: '+m.texto); salvarPerfis(); render(); }}, m.concluida ? '✓' : ''),
      el('span',{class:'txt'}, m.texto),
      el('button',{class:'x', 'aria-label':'Remover missão', onclick:()=>{ if(!confirm('Remover a missão "'+m.texto+'"?')) return; f.missoes.splice(f.missoes.indexOf(m),1); salvarPerfis(); render(); }}, '✕'));
    const corpo = [];
    if(!f.missoes.length) corpo.push(el('div',{class:'empty'}, 'Nenhuma missão anotada ainda.'));
    pendentes.forEach(m=> corpo.push(linha(m)));
    if(feitas.length){
      const abertas = !!state._missoesFeitasAbertas;
      corpo.push(el('button',{class:'recolhido-auto', onclick:()=>{ state._missoesFeitasAbertas = !abertas; render(); }}, abertas ? 'esconder as concluídas' : '+ '+feitas.length+' concluída(s)'));
      if(abertas) feitas.forEach(m=> corpo.push(linha(m)));
    }
    corpo.push(kAdicionar('nova-missao', '_novaMissaoTexto', 'nova missão ou objetivo…', (t)=>{ f.missoes.push({texto:t, concluida:false}); salvarPerfis(); render(); }));
    return corpo;
  });
}

// ---- Facções: o status é uma pílula que troca ao tocar ----
function renderPainelFaccoes(f){
  if(!f.faccoes) f.faccoes = [];
  return renderSecaoNotasColapsavel('faccoes', '🏳️', 'Facções', f.faccoes.length ? f.faccoes.length+' registrada(s)' : null, ()=>{
    const corpo = [];
    if(!f.faccoes.length) corpo.push(el('div',{class:'empty'}, 'Nenhuma facção anotada ainda.'));
    f.faccoes.forEach((fac, idx)=>{
      const st = fac.status || 'neutro';
      corpo.push(el('div',{class:'k-check'},
        el('span',{class:'txt'}, el('b',{}, fac.nome)),
        el('button',{class:'k-pil status-'+st, title:'Tocar troca: neutro, amigo, inimigo', onclick:()=>{ fac.status = CICLO_STATUS_FACCAO[(CICLO_STATUS_FACCAO.indexOf(st)+1) % CICLO_STATUS_FACCAO.length]; salvarPerfis(); render(); }}, ICONE_STATUS_FACCAO[st]),
        el('button',{class:'x', 'aria-label':'Remover facção', onclick:()=>{ if(!confirm('Remover a facção "'+fac.nome+'"?')) return; f.faccoes.splice(idx,1); salvarPerfis(); render(); }}, '✕')));
    });
    corpo.push(kAdicionar('nova-faccao', '_novaFaccaoNome', 'nome da facção ou grupo…', (t)=>{ f.faccoes.push({nome:t, status:'neutro'}); salvarPerfis(); render(); }));
    return corpo;
  });
}

// ---- Relacionamentos: linha com o tipo; gaveta com tipo em pílulas, nota e perfil ----
function renderPainelRelacionamentos(f){
  if(!f.relacionamentos) f.relacionamentos = [];
  return renderSecaoNotasColapsavel('relacionamentos', '👥', 'Relacionamentos', f.relacionamentos.length ? f.relacionamentos.length+' registrado(s)' : null, ()=>{
    const corpo = [];
    if(!f.relacionamentos.length) corpo.push(el('div',{class:'empty'}, 'Nenhum relacionamento anotado ainda.'));
    f.relacionamentos.forEach((rel, idx)=>{
      const aberto = state._relacionamentoAberto === idx;
      const nota = (rel.nota||'').trim();
      corpo.push(kLinha({ic: ICONE_RELACIONAMENTO[rel.tipo]||'👤', nome: rel.nome+(rel.personagemId ? ' 🔗' : ''), detalhe: (rel.tipo||'Outro')+(nota ? ' · '+nota.slice(0,48)+(nota.length>48?'…':'') : ''), sel: aberto,
        onclick:()=>{ state._relacionamentoAberto = aberto ? null : idx; render(); }}));
      if(!aberto) return;
      corpo.push(kGaveta(
        rel.personagemId ? el('div',{class:'meta-ej'}, '🔗 Vinculado a um herói da mesa: o nome acompanha sozinho.')
          : el('input',{type:'text', value:rel.nome, placeholder:'nome do PNJ', style:'margin:0;', oninput:(e)=>{ rel.nome = e.target.value; }, onchange:()=>{ salvarPerfis(); render(); }}),
        el('div',{class:'k-pilulas'}, TIPOS_RELACIONAMENTO.map(t=> el('button',{class:'k-pil'+(rel.tipo===t?' on':''), onclick:()=>{ rel.tipo = t; salvarPerfis(); render(); }}, (ICONE_RELACIONAMENTO[t]||'')+' '+t))),
        textareaAutoResize({oninput:(e)=>{ rel.nota = e.target.value; }, onchange:()=> salvarPerfis(), placeholder:'quem é, como se conheceram, o que sente por essa pessoa…'}, rel.nota||''),
        el('div',{class:'links-item'},
          rel.personagemId ? el('button',{class:'link-editar-item', onclick:()=> abrirPerfilJogador(rel.personagemId)}, 'ver perfil') : null,
          linkRemover('remover', ()=>{ if(!confirm('Remover "'+rel.nome+'" dos relacionamentos?')) return; state._relacionamentoAberto = null; f.relacionamentos.splice(idx,1); salvarPerfis(); render(); }))));
    });
    corpo.push(kAdicionar('novo-rel-nome', '_novoRelNome', 'nome do PNJ…', (t)=>{ f.relacionamentos.push({nome:t, tipo:'Aliado', nota:'', personagemId:null}); registrarLog(f, 'Novo relacionamento anotado: '+t); salvarPerfis(); render(); },
      el('button',{class:'k-mais secundario', title:'Vincular um herói da mesa', 'aria-label':'Vincular um herói da mesa', onclick:abrirEscolherJogadorRelacionamento}, '👤')));
    return corpo;
  });
}

// ---- Locais: linha com a nota; gaveta com a nota, o mapa e remover ----
function renderPainelLocais(f){
  if(!f.locais) f.locais = [];
  return renderSecaoNotasColapsavel('locais', '🗺️', 'Locais', f.locais.length ? f.locais.length+' visitado(s)' : null, ()=>{
    const corpo = [];
    if(!f.locais.length) corpo.push(el('div',{class:'empty'}, 'Nenhum local anotado ainda.'));
    f.locais.forEach((loc, idx)=>{
      const aberto = state._localAberto === idx;
      corpo.push(kLinha({ic: loc.mapaUrl ? '🗺️' : '📍', nome: loc.nome, detalhe: (loc.nota||'').trim() || (loc.mapaUrl ? 'tem mapa' : 'sem nota'), sel: aberto,
        onclick:()=>{ state._localAberto = aberto ? null : idx; render(); }}));
      if(!aberto) return;
      corpo.push(kGaveta(
        el('input',{id:'local-nota-'+idx, type:'text', placeholder:'nota (opcional)', value:loc.nota||'', style:'margin:0;', oninput:(e)=>{ loc.nota = e.target.value; }, onchange:()=> salvarPerfis()}),
        loc.mapaUrl ? el('button',{class:'btn ghost btn-mini', onclick:()=> abrirVisualizarMapa(loc.nome, loc.mapaUrl)}, '🗺️ Ver o mapa') : null,
        el('div',{class:'links-item'}, linkRemover('remover', ()=>{ if(!confirm('Remover o local "'+loc.nome+'"?')) return; state._localAberto = null; f.locais.splice(idx,1); salvarPerfis(); render(); }))));
    });
    corpo.push(kAdicionar('novo-local', '_novoLocalNome', 'nome do lugar…', (t)=>{ f.locais.push({nome:t, nota:''}); salvarPerfis(); render(); },
      el('button',{class:'k-mais secundario', title:'Mapa do Mestre', 'aria-label':'Escolher um mapa do Mestre', onclick:abrirEscolherMapaMestre}, '🗺️')));
    return corpo;
  });
}
