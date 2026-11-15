// Aba Evolução: o próximo nível primeiro e o resto em seções fechadas.
// Separado do js/ficha.js em 15/11/2026 (item 6 da revisão geral), sem mudar o código.

function renderGuia(){
  const f = fichaAtual();
  const g = state.guia;
  if(g._perfilId !== f.id){
    // primeira vez que abre essa aba pra esse personagem (ou trocou de personagem) — sincroniza
    // com a classe principal (primeira escolhida) e o nível atual dela, em vez de ficar preso
    // num valor fixo antigo.
    const principal = (f.classesNiveis||[])[0];
    g.classe = principal ? principal.classe : 'Guerreiro';
    g.nivel = principal ? principal.nivel : 1;
    g._perfilId = f.id;
  }
  const wrap = el('div',{});
  // 3A (15/11/2026): o próximo nível primeiro, num cartão; o resto em linhas fechadas.
  const cls = CLASSES[g.classe];
  const nivelAtual = g.nivel;
  const nivelProx = Math.min(nivelAtual+1, 20);
  const habProx = cls.tabela.find(t=>t.nivel===nivelProx);
  const ehDoHeroi = (f.classesNiveis||[]).some(c=> c.classe===g.classe && c.nivel===g.nivel);
  const ci = CLASSES_INICIAL[g.classe] || {};
  const con = parseInt(f.con)||0;
  const racaObj = getRacaObj(f);
  const bonusRaca = racaObj && racaObj.pvBonusPorNivel ? racaObj.pvBonusPorNivel : 0;
  const ganhoPV = Math.max(1, (ci.pvPorNivel||0) + (ehDoHeroi ? con : 0)) + (ehDoHeroi ? bonusRaca : 0);
  const partes = habProx ? habProx.hab.split(',').map(x=> x.trim()).filter(Boolean) : [];
  const proxMarco = cls.tabela.find(t=> t.nivel>nivelProx && /círculo/.test(t.hab));
  const trocando = !!state._guiaTrocando;
  wrap.appendChild(el('div',{class:'panel faixa'},
    el('h2',{}, 'Evolução'),
    el('div',{class:'linha-equip guia-vendo'},
      el('span',{}, 'Vendo: ', el('b',{}, g.classe+' '+nivelAtual+'º'), ehDoHeroi ? ' (o seu)' : ''),
      el('button',{class:'link-editar-item', onclick:()=>{ state._guiaTrocando = !trocando; render(); }}, trocando ? 'pronto' : 'trocar')),
    trocando ? el('div',{class:'row'},
      el('div',{}, el('label',{},'Classe'), (()=>{ const sel = el('select',{onchange:(e)=>{ g.classe = e.target.value; render(); }}); Object.keys(CLASSES).forEach(c=> sel.appendChild(el('option',{value:c, ...(g.classe===c?{selected:'selected'}:{})}, c))); return sel; })()),
      el('div',{}, el('label',{},'Nível atual'), (()=>{ const sel = el('select',{onchange:(e)=>{ g.nivel = parseInt(e.target.value); render(); }}); for(let i=1;i<=20;i++) sel.appendChild(el('option',{value:i, ...(g.nivel===i?{selected:'selected'}:{})}, i+'º')); return sel; })())
    ) : null,
    nivelAtual>=20 ? el('div',{class:'empty'}, 'Nível máximo alcançado.') : el('div',{class:'cartao-prox-nivel'},
      el('div',{class:'titulo'}, 'Nível '+nivelAtual+' → '+nivelProx),
      el('div',{class:'ganhos'},
        el('div',{}, el('b',{style:'color:var(--pv-accent);'}, '+'+ganhoPV), ehDoHeroi ? 'PV ('+(ci.pvPorNivel||0)+' + Con '+con+(bonusRaca?' + raça '+bonusRaca:'')+')' : 'PV + Con'),
        el('div',{}, el('b',{style:'color:var(--pm-accent);'}, '+'+(ci.pm||0)), 'PM'),
        partes.map(p=> el('div',{class:'largo'}, el('b',{}, /poder de/i.test(p) ? '1 poder' : '★'), p))),
      proxMarco ? el('div',{class:'marco'}, 'Próximo marco: '+proxMarco.nivel+'º nível, '+proxMarco.hab.match(/[^,]*círculo[^,]*/)[0].trim()) : null)
  ));

  if(cls.tradicao && habProx && /círculo/.test(habProx.hab)){
    const m = habProx.hab.match(/(\d)º círculo/);
    if(m){
      const novoCirc = parseInt(m[1]);
      const sugeridas = magiasPorTradicao(cls.tradicao).filter(s=>s.c===novoCirc).slice(0,6);
      wrap.appendChild(renderSecaoNotasColapsavel('guia-circulo', '✨', 'Novo círculo: magias sugeridas', sugeridas.length+' magia(s)', ()=> sugeridas.map(s=> renderCardMagia(s, 'guia', null))));
    }
  }

  const poderesDoHeroi = new Set((f.poderesClasse||[]).map(p=> p.nome));
  const listaCompletaGuia = PODERES_CLASSE_COMPLETO[g.classe] || [];
  wrap.appendChild(renderSecaoNotasColapsavel('guia-poderes', '⚡', 'Poderes que posso escolher', listaCompletaGuia.length+' poderes', ()=>{
    const corpo = [el('div',{class:'meta-ej', style:'margin-bottom:6px;'}, 'A cada "poder de '+g.classe.toLowerCase()+'" você escolhe um destes (respeitando os pré-requisitos). ✓ = você já tem.')];
    listaCompletaGuia.forEach(p=>{
      const tem = poderesDoHeroi.has(p.nome);
      corpo.push(renderItemAcordeao('guia-poderes-'+g.classe, p.nome, (tem?'✓ ':'')+p.nome, p.nivelMin?('nível '+p.nivelMin+'+'):'', [
        el('div',{class:'desc'}, p.desc),
        p.prereq ? el('div',{class:'meta', style:'color:var(--red-bright);'}, 'Pré-requisito: '+p.prereq) : null
      ]));
    });
    return corpo;
  }));

  wrap.appendChild(renderSecaoNotasColapsavel('guia-progressao', '📜', 'Progressão do 1º ao 20º', 'tabela', ()=>{
    const corpo = [];
    PATAMARES.forEach(pat=>{
      const linhas = cls.tabela.filter(t=> t.nivel>=pat.de && t.nivel<=pat.ate);
      if(!linhas.length) return;
      const table = el('table',{class:'lvl-table'});
      linhas.forEach(t=> table.appendChild(el('tr',{class: t.nivel===nivelAtual ? 'current' : t.nivel===nivelProx ? 'next' : ''}, el('td',{}, t.nivel+'º'), el('td',{}, t.hab))));
      corpo.push(el('div',{class:'patamar-bloco'}, el('div',{class:'patamar-tag', style:'background:'+pat.cor+';'}, pat.nome+' ('+pat.de+'–'+pat.ate+'º)'), table));
    });
    return corpo;
  }));

  wrap.appendChild(renderSecaoNotasColapsavel('guia-papel', '🎭', 'Papel em combate', null, ()=>[
    el('div',{class:'tip'}, el('b',{}, cls.tradicao ? ('Conjurador '+cls.tradicao) : 'Sem magias próprias'), cls.papel),
    el('div',{class:'tip'}, el('b',{}, 'Dica de iniciante'), cls.dica)
  ]));
  wrap.appendChild(renderSecaoNotasColapsavel('guia-glossario', '📖', 'Glossário rápido', null, ()=> TIPS_GERAIS.map(([t,d])=> el('div',{class:'tip'}, el('b',{},t), d))));
  return wrap;
}
