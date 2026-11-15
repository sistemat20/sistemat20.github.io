// ============ KIT (15/11/2026, prancha "Um visual só") ============
// Funções para montar as peças do kit (estilos em css/kit.css) e o "mais" das dicas longas.

// 1 Linha: ícone, nome com detalhe pequeno embaixo e um valor à direita.
function kLinha({ic, nome, detalhe, valor, sel, off, onclick, extra}){
  return el('button',{class:'k-linha'+(sel?' sel':'')+(off?' off':''), 'aria-expanded': sel ? 'true' : 'false', onclick},
    el('span',{class:'ic', 'aria-hidden':'true'}, ic||'•'),
    el('span',{class:'nm'}, nome, detalhe ? el('small',{}, detalhe) : null, extra||null),
    el('span',{class:'vl'}, valor!=null ? valor : (sel ? '▾' : '▸')));
}
// 2 Gaveta: o detalhe que abre embaixo da linha.
function kGaveta(...filhos){ return el('div',{class:'k-gaveta'}, filhos); }
// 3 Pílulas de atributo (+2 Con verde, −1 Des vermelho).
function kPilulasMods(mods){
  return el('span',{class:'k-pilulas', style:'gap:3px;margin-top:3px;'}, Object.entries(mods||{}).map(([k,v])=>
    el('span',{class:'k-pil '+(v>0?'mais':'menos')}, (v>0?'+':'')+v+' '+k.charAt(0).toUpperCase()+k.slice(1))));
}
// 4 Seletor de partes: [{id, rot, feito, desativado}], atual, aoTrocar(id).
function kSeg(partes, atual, aoTrocar){
  return el('div',{class:'k-seg', role:'tablist'}, partes.map(p=>
    el('button',{class:(p.id===atual?'on':'')+(p.feito?' feito':''), role:'tab', 'aria-selected': p.id===atual ? 'true' : 'false', disabled: !!p.desativado, onclick:()=> aoTrocar(p.id)}, (p.feito && p.id!==atual ? '✓ ' : '')+p.rot)));
}

// Dicas longas: depois de cada render, as que passam de duas linhas ficam cortadas com "mais";
// tocar abre o texto inteiro.
function marcarDicasLongas(){
  if(typeof document==='undefined') return;
  document.querySelectorAll('.tip:not(.aberta)').forEach(t=>{
    t.classList.add('corta');
    if(t.scrollHeight <= t.clientHeight + 2) t.classList.remove('corta');
  });
}
if(typeof document!=='undefined'){
  document.addEventListener('click', (e)=>{
    const t = e.target.closest && e.target.closest('.tip.corta');
    if(t && !e.target.closest('button, a, input, select')){ t.classList.remove('corta'); t.classList.add('aberta'); }
  });
}
