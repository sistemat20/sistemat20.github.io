// ============ CONDIÇÕES (15/11/2026, prancha "Defesa e companhia": C1 + C3) ============
//   · C1 Pílulas e busca: as ativas como pílulas; o "+" abre uma busca com os 32 nomes curtos;
//     tocar mostra o efeito em uma frase e "Aplicar"/"Tirar". Maldições num botão roxo ao lado.
//   · C3 Alerta no topo: faixa vermelha fina no topo (todas as abas) com o que está valendo; o escudo
//     da Defesa fica vermelho quando uma condição baixou o número.
//   · Efeito na tela: cada condição tem um efeito visual nas bordas que lembra o que ela é
//     (chamas embaixo, névoa verde do veneno, escuridão do cego…). Fica nas bordas, sem tampar
//     nada nem receber toque; com "reduzir movimento" do aparelho, fica parado.

// Efeito curto para a faixa do alerta.
const RESUMO_CONDICAO = {
  'Abalado':'−2 perícias', 'Agarrado':'desprevenido e imóvel', 'Alquebrado':'+1 PM nas habilidades', 'Apavorado':'−5 perícias, foge do medo',
  'Atordoado':'não age', 'Caído':'−5 Defesa e ataque corpo a corpo', 'Cego':'desprevenido, lento, −5 For/Des', 'Confuso':'age ao acaso',
  'Debilitado':'−5 For/Des/Con', 'Desprevenido':'−5 Defesa e Reflexos', 'Doente':'efeito da doença', 'Em Chamas':'1d6 de fogo por turno',
  'Enfeitiçado':'prestativo com a fonte', 'Enjoado':'só uma ação por rodada', 'Enredado':'lento, vulnerável, −2 ataque', 'Envenenado':'efeito do veneno',
  'Esmorecido':'−5 Int/Sab/Car', 'Exausto':'debilitado, lento, vulnerável', 'Fascinado':'−5 Percepção, só observa', 'Fatigado':'fraco e vulnerável',
  'Fraco':'−2 For/Des/Con', 'Frustrado':'−2 Int/Sab/Car', 'Imóvel':'deslocamento 0', 'Indefeso':'−10 Defesa',
  'Lento':'deslocamento pela metade', 'Ofuscado':'−2 ataque e Percepção', 'Paralisado':'imóvel e indefeso', 'Pasmo':'não age',
  'Petrificado':'inconsciente, RD 8', 'Surdo':'−5 Iniciativa', 'Surpreendido':'desprevenido, não age', 'Vulnerável':'−2 Defesa',
};
// Efeito visual de cada condição (classe em css/condicoes.css).
const EFEITO_TELA_CONDICAO = {
  'Em Chamas':'chamas', 'Envenenado':'veneno', 'Doente':'veneno', 'Enjoado':'enjoo', 'Cego':'cego', 'Ofuscado':'ofuscado',
  'Abalado':'medo', 'Apavorado':'pavor', 'Atordoado':'tonto', 'Pasmo':'tonto', 'Surpreendido':'tonto', 'Confuso':'confuso',
  'Fascinado':'encanto', 'Enfeitiçado':'encanto', 'Paralisado':'pedra', 'Petrificado':'pedra',
  'Fatigado':'cansado', 'Exausto':'cansado', 'Fraco':'cansado', 'Debilitado':'cansado', 'Esmorecido':'cansado', 'Frustrado':'cansado', 'Alquebrado':'cansado',
  'Enredado':'preso', 'Agarrado':'preso', 'Imóvel':'preso', 'Lento':'lento', 'Caído':'caido',
  'Desprevenido':'guarda', 'Vulnerável':'guarda', 'Indefeso':'guarda', 'Surdo':'surdo',
};
// CONDICOES_EFEITOS mora em app.js, que carrega depois deste arquivo: a lista sai na hora do uso.
const CONDICOES_AUTOMATICAS = { has:(n)=> !!CONDICOES_EFEITOS[n] };
const MALDICOES_AUTOMATICAS = new Set(['Maldição do Bardo','Toque de Tibar']);

function descCondicao(nome){ const c = CONDICOES_LISTA.find(x=> x[0]===nome); return c ? c[1] : ''; }
function descMaldicao(nome){ const c = MALDICOES_LISTA.find(x=> x[0]===nome); return c ? c[1] : ''; }
function ehMaldicao(nome){ return MALDICOES_LISTA.some(x=> x[0]===nome); }

// ---- C1: painel com pílulas e busca ----
function renderPainelCondicoes(f){
  const ativas = condicoesAtivas(f), maldicoes = maldicoesAtivas(f);
  const aberto = !!state._condAberto;
  const sel = state._condSel;
  const linha = el('div',{class:'cond-linha'});
  if(!ativas.length && !maldicoes.length) linha.appendChild(el('span',{class:'cond-vazio'}, 'Nenhuma condição'));
  ativas.forEach(n=> linha.appendChild(el('button',{class:'cond-pilula on', onclick:()=>{ state._condSel = sel===n ? null : n; render(); }}, n+(CONDICOES_AUTOMATICAS.has(n)?' ⚡':''))));
  maldicoes.forEach(n=> linha.appendChild(el('button',{class:'cond-pilula on roxo', onclick:()=>{ state._condSel = sel===n ? null : n; render(); }}, '🔮 '+n+(MALDICOES_AUTOMATICAS.has(n)?' ⚡':''))));
  linha.appendChild(el('button',{class:'cond-pilula mais', 'aria-label': aberto ? 'Fechar a lista de condições' : 'Adicionar condição', onclick:()=>{ state._condAberto = !aberto; state._condSel = null; render(); }}, aberto ? 'fechar' : '+'));
  const corpo = [linha];
  if(sel) corpo.push(renderGavetaCondicao(f, sel));
  if(aberto) corpo.push(renderListaCondicoes(f));
  if(f.condicoesNota && !aberto) corpo.push(el('div',{class:'meta-ej', style:'margin-top:6px;'}, '📝 '+f.condicoesNota));
  return el('div',{class:'panel faixa', id:'painel-condicoes'}, el('h2',{}, 'Condições'), corpo);
}
function renderGavetaCondicao(f, nome){
  const mald = ehMaldicao(nome);
  const ativa = mald ? maldicoesAtivas(f).includes(nome) : condicoesAtivas(f).includes(nome);
  const auto = mald ? MALDICOES_AUTOMATICAS.has(nome) : CONDICOES_AUTOMATICAS.has(nome);
  return el('div',{class:'gaveta gaveta-ej'},
    el('div',{}, el('b',{}, nome+'. '), mald ? descMaldicao(nome) : descCondicao(nome), auto ? ' ⚡ O app já aplica nos números.' : ''),
    el('div',{class:'linha-equip'},
      el('button',{class:'link-editar-item', onclick:()=>{ state._condSel = null; render(); }}, 'fechar'),
      el('button',{class:'btn btn-mini'+(ativa?' ghost':''), onclick:()=>{ state._condSel = null; if(mald) alternarMaldicao(f, nome); else alternarCondicao(f, nome); }}, ativa ? 'Tirar' : 'Aplicar')));
}
function renderListaCondicoes(f){
  const mald = !!state._condMald;
  const q = semAcento(state._condBusca||'');
  const lista = (mald ? MALDICOES_LISTA : CONDICOES_LISTA).map(x=> x[0]).filter(n=> !q || semAcento(n).includes(q));
  const ativas = mald ? maldicoesAtivas(f) : condicoesAtivas(f);
  const auto = mald ? MALDICOES_AUTOMATICAS : CONDICOES_AUTOMATICAS;
  return el('div',{class:'gaveta gaveta-ej'},
    el('div',{class:'linha-equip'},
      el('input',{id:'cond-busca', type:'search', class:'busca-notas', placeholder: mald ? 'Buscar maldição…' : 'Buscar condição…', value: state._condBusca||'', oninput:(e)=>{ state._condBusca = e.target.value; render(); }}),
      el('button',{class:'cond-pilula roxo'+(mald?' on':''), onclick:()=>{ state._condMald = !mald; state._condBusca = ''; render(); }}, '🔮 Maldições')),
    el('div',{class:'cond-nuvem'}, lista.length ? lista.map(n=> el('button',{class:'cond-pilula'+(mald?' roxo':'')+(ativas.includes(n)?' on':''), onclick:()=>{ state._condSel = n; render(); }}, n+(auto.has(n)?' ⚡':'')))
      : el('span',{class:'cond-vazio'}, 'Nada com "'+(state._condBusca||'')+'".')),
    el('label',{style:'margin:4px 0 0;'}, 'Nota livre (ex: "veneno 2d6 por turno")'),
    el('input',{id:'condicoes-nota', type:'text', value:f.condicoesNota||'', oninput:(e)=>{ f.condicoesNota = e.target.value; }, onchange:()=>{ salvarPerfis(); }}));
}

// ---- C3: alerta no topo e Defesa afetada ----
function renderAlertaCondicoes(f){
  const ativas = condicoesAtivas(f), maldicoes = maldicoesAtivas(f);
  if(!ativas.length && !maldicoes.length) return null;
  const partes = [];
  ativas.forEach(n=> partes.push(el('span',{}, el('b',{}, n), RESUMO_CONDICAO[n] ? ' '+RESUMO_CONDICAO[n] : '')));
  maldicoes.forEach(n=> partes.push(el('span',{}, el('b',{}, '🔮 '+n))));
  const irAoPainel = ()=>{ const p = document.getElementById('painel-condicoes'); if(p) p.scrollIntoView({behavior: movimentoReduzido() ? 'auto' : 'smooth', block:'center'}); };
  return el('button',{class:'alerta-cond', onclick:()=>{ state.tab = 'personagem'; state.personagemTab = 'ficha'; render(); setTimeout(irAoPainel, 60); }},
    el('span',{class:'ic'}, '⚠️'), el('span',{class:'txt'}, partes.map((p,i)=> i ? [' · ', p] : p).flat()));
}
// Defesa sem as condições, para saber se alguma baixou o número.
function defesaSemCondicoes(f){
  const guardadas = f.condicoesAtivas;
  f.condicoesAtivas = [];
  try{ return defesaTotal(f); } finally { f.condicoesAtivas = guardadas; }
}

// ---- Efeito na tela ----
// Uma camada fixa fora do #root, que o render não recria: assim a animação não reinicia a cada toque.
function efeitosDeTela(f){
  if(!f) return [];
  const tipos = [];
  condicoesAtivas(f).forEach(n=>{ const t = EFEITO_TELA_CONDICAO[n]; if(t && !tipos.includes(t)) tipos.push(t); });
  if(maldicoesAtivas(f).length) tipos.push('maldicao');
  return tipos;
}
function atualizarEfeitoCondicoes(){
  if(typeof document==='undefined') return;
  const f = state.screen==='ficha' ? fichaAtual() : null;
  const tipos = efeitosDeTela(f);
  let camada = document.getElementById('efx-condicoes');
  const chave = tipos.join(',');
  if(!tipos.length){ if(camada) camada.remove(); return; }
  if(!camada){ camada = document.createElement('div'); camada.id = 'efx-condicoes'; camada.setAttribute('aria-hidden','true'); document.body.appendChild(camada); }
  if(camada.dataset.chave===chave) return;
  camada.dataset.chave = chave;
  camada.innerHTML = '';
  tipos.forEach(t=>{ const d = document.createElement('div'); d.className = 'efx-c '+t; camada.appendChild(d); });
}
