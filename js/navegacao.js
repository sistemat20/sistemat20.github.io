// ============ NAVEGAÇÃO (15/11/2026, prancha "Navegação e Magias", ideia 1A) ============
// Topo de uma linha (retrato, nome, classe, vida, mana e Defesa), fixo ao rolar, no lugar do
// cabeçalho alto e da faixa fixa; e uma barra embaixo, no polegar, com as telas da mesa:
// Ficha · Perícias · Magias · Mochila · Mais. "Mais" abre o menu (Notas, Catálogo de itens,
// Aprender magias, Evolução, Trocar de herói e o resto do que já morava lá).

const ABAS_BARRA = [
  {id:'ficha', ico:'📜', rot:'Ficha', ir:()=>{ state.tab = 'personagem'; state.personagemTab = 'ficha'; }},
  {id:'pericias', ico:'🎯', rot:'Perícias', ir:()=>{ state.tab = 'pericias'; }},
  {id:'magias', ico:'📖', rot:'Magias', ir:()=>{ state.tab = 'personagem'; state.personagemTab = 'magias'; }},
  {id:'mochila', ico:'🎒', rot:'Mochila', ir:()=>{ state.tab = 'personagem'; state.personagemTab = 'mochila'; }},
];
function abaBarraAtual(){
  if(state._menuAberto) return 'mais';
  if(state.tab==='pericias') return 'pericias';
  if(state.tab==='personagem'){ const p = state.personagemTab||'ficha'; return p==='notas' ? 'mais' : p; }
  return 'mais';
}
function irParaAba(aba){
  aba.ir();
  state._menuAberto = false;
  render();
  try{ window.scrollTo({top:0, behavior:'auto'}); }catch(e){}
}
function renderBarraBaixo(f){
  const atual = abaBarraAtual();
  const pendencias = detectarPendencias(f).length;
  const botao = (id, ico, rot, onclick, extra)=> el('button',{class: atual===id ? 'on' : '', 'aria-current': atual===id ? 'page' : null, onclick}, el('span',{class:'ico', 'aria-hidden':'true'}, ico), el('span',{}, rot), extra||null);
  return el('nav',{class:'barra-baixo', 'aria-label':'Telas do personagem'},
    ABAS_BARRA.map(a=> botao(a.id, a.ico, a.rot, ()=> irParaAba(a))),
    botao('mais', '☰', 'Mais', ()=>{ state._menuAberto = !state._menuAberto; render(); },
      pendencias ? el('span',{class:'selo-cera barra-selo', title: pendencias+' pendência(s)'}, '!') : null));
}
function renderTopoHeroi(f){
  return el('header',{class:'topo-compacto'},
    retratoHeroi(f, 'mini'),
    el('div',{class:'nm'}, el('b',{}, f.nome || 'Personagem', typeof renderSeloConexao==='function' ? renderSeloConexao() : null), el('small',{}, (f.raca||'—')+' · '+classeDisplay(f))),
    el('div',{class:'vm'},
      el('span',{style:'color:var(--pv-accent);'}, (parseInt(f.pvatual)||0)+'/'+pvMaxEfetivo(f)),
      el('span',{style:'color:var(--pm-accent);'}, (parseInt(f.pmatual)||0)+'/'+pmMaxEfetivo(f))),
    el('div',{class:'def', title:'Defesa'}, '🛡', el('b',{}, String(defesaTotal(f)))));
}
// Itens que antes eram telas do menu "Navegar".
function itensNavegarMais(){
  return [
    ['📝','Notas', ()=>{ state.tab = 'personagem'; state.personagemTab = 'notas'; }],
    ['🛒','Catálogo de itens', ()=>{ state.tab = 'itens'; }],
    ['✨','Aprender magias', ()=>{ state.tab = 'magias'; }],
    ['📈','Evolução', ()=>{ state.tab = 'guia'; }],
    ['👥','Trocar de herói', ()=>{ pararAtualizacaoAutomaticaJogador(); state.screen = 'perfis'; state.perfilAtualId = null; }],
  ];
}
