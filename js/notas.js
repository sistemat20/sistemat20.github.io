// Aba Notas: Regras do herói, poderes com selo e as seções que abrem e fecham.
// Separado do js/ficha.js em 15/11/2026 (item 6 da revisão geral), sem mudar o código.

function renderPersonagemNotas(){
  const f = fichaAtual();
  const wrap = el('div',{});
  // Notas em duas partes (13/11/2026): o que é regra separado do que é história, tudo começa
  // fechado em uma linha, e uma busca no topo que acha qualquer item das duas.
  const parte = state._notasParte==='campanha' ? 'campanha' : 'regras';
  const busca = (state._notasBusca||'').trim();
  wrap.appendChild(el('div',{class:'notas-topo'},
    el('div',{class:'seg2'}, [['regras','Regras do herói'],['campanha','Campanha']].map(([k,t])=>
      el('button',{class: !busca && parte===k ? 'on' : '', onclick:()=>{ state._notasParte = k; state._notasBusca = ''; render(); }}, t))),
    el('input',{id:'notas-busca', type:'search', class:'busca-notas', placeholder:'Buscar poder, habilidade, missão…', value: state._notasBusca||'', oninput:(e)=>{ state._notasBusca = e.target.value; render(); }})
  ));
  if(busca){ wrap.appendChild(renderResultadosBuscaNotas(f, busca)); return wrap; }

  if(parte==='campanha'){
    wrap.appendChild(renderPainelMissoes(f));
    wrap.appendChild(renderPainelFaccoes(f));
    wrap.appendChild(renderPainelRelacionamentos(f));
    wrap.appendChild(renderPainelLocais(f));
    wrap.appendChild(renderSecaoNotasColapsavel('anotacoes', '✍️', 'Anotações', (f.notas||'').trim() ? 'com texto' : null, ()=>[
      textareaAutoResize({oninput:(e)=>f.notas=e.target.value, placeholder:'tesouro, combinações com o Mestre, etc.'}, f.notas)
    ]));
    return wrap;
  }

  wrap.appendChild(renderPoderesNotas(f));

  // ---- Habilidades ----
  // Uma linha por habilidade: a do 1º nível e as melhorias de nível ("Ataque furtivo +3d6")
  // viram uma só, com o valor de agora (coletarHabilidades, em js/emjogo.js).
  const habilidades = coletarHabilidades(f);
  wrap.appendChild(renderSecaoNotasColapsavel('habilidades-iniciais', '🎁', 'Habilidades',
    habilidades.length+' registrada(s)', ()=>{
    if(!habilidades.length) return [el('div',{class:'empty'},'Nada registrado ainda.')];
    return habilidades.map((h, idx)=> renderItemColapsavel('hab-'+idx+'-'+h.chaveBase, nomeHabilidadeComSelo(f, h), h.fonte, [
      el('div',{class:'desc'}, h.desc || 'Ainda não temos o texto exato dessa habilidade cadastrado: consulte o livro (Cap. 1, tabela de progressão da classe).')
    ]));
  }));

  // ---- Proficiências ----
  const prof = proficienciasPersonagem(f);
  const racaObj = getRacaObj(f);
  const armasExtrasRaca = racaObj && racaObj.armasComoSimples ? racaObj.armasComoSimples : [];
  const extrasContagem = [prof.armasMarciais, prof.armasFogo, prof.armadurasPesadas, prof.escudos].filter(Boolean).length;
  wrap.appendChild(renderSecaoNotasColapsavel('proficiencias', '🛡️', 'Proficiências',
    extrasContagem>0 ? extrasContagem+' proficiência(s) extra' : 'Só as básicas', ()=>[
    el('div',{class:'tip', style:'font-size:0.8rem;'},
      el('div',{}, el('b',{},'Sempre: '), 'armas simples, armaduras leves, ataques desarmados'),
      el('div',{}, el('b',{},'Armas marciais: '), prof.armasMarciais?'Sim ✓':'Não'),
      el('div',{}, el('b',{},'Armas de fogo: '), prof.armasFogo?'Sim ✓':'Não'),
      el('div',{}, el('b',{},'Armaduras pesadas: '), prof.armadurasPesadas?'Sim ✓':'Não'),
      el('div',{}, el('b',{},'Escudos: '), prof.escudos?'Sim ✓':'Não'),
      armasExtrasRaca.length ? el('div',{}, el('b',{},'Bônus racial: '), armasExtrasRaca.join(', ')+' contam como arma simples para você') : null,
    ),
    el('div',{class:'meta', style:'font-size:0.7rem;color:var(--ink-soft);margin-top:6px;'}, 'Usar arma sem proficiência: –5 no teste de ataque. Vestir armadura/escudo sem proficiência: a penalidade dele passa a valer em toda perícia de Força e Destreza (não só Acrobacia/Furtividade/Ladinagem).')
  ]));

  if(f.arcanistaCaminho && ARCANISTA_CAMINHOS[f.arcanistaCaminho]){
    const info = ARCANISTA_CAMINHOS[f.arcanistaCaminho];
    wrap.appendChild(renderSecaoNotasColapsavel('caminho-arcanista', '🔮', 'Caminho: '+f.arcanistaCaminho, null, ()=>{
      const corpo = [el('div',{class:'tip'}, info.descricao)];
      if(info.focoTexto){
        corpo.push(el('div',{class:'tip'}, el('b',{}, info.focoNome), info.focoTexto));
      }
      if(f.arcanistaLinhagem){
        const l = LINHAGENS_FEITICEIRO.find(x=>x.nome===f.arcanistaLinhagem);
        if(l){
          corpo.push(el('div',{class:'tip'}, el('b',{}, l.nome+' — Básica (já ativa)'), l.basica));
          corpo.push(el('div',{class:'tip', style:'opacity:0.8;'}, el('b',{},'Aprimorada (se escolher como poder de Arcanista)'), l.aprimorada));
          corpo.push(el('div',{class:'tip', style:'opacity:0.8;'}, el('b',{},'Superior (se escolher como poder de Arcanista)'), l.superior));
        }
      }
      return corpo;
    }));
  }

  return wrap;
}

// Poderes com selo: "ativa" (também está no Em jogo da Ficha) ou "automático" (o app já soma).
// Os automáticos ficam recolhidos atrás de um link, porque não pedem nada do jogador.
function renderPoderesNotas(f){
  const entradas = coletarPoderes(f).map(e=> Object.assign({}, e, classificarPoder(f, e)));
  const nAuto = entradas.filter(e=> e.tipo==='auto').length;
  return renderSecaoNotasColapsavel('poderes', '⚡', 'Poderes', entradas.length+' poder(es)', ()=>{
    if(entradas.length===0) return [el('div',{class:'empty'},'Nenhum poder registrado ainda.')];
    const mostrarAuto = !!state._notasMostrarAuto;
    const corpo = entradas.filter(e=> e.tipo!=='auto' || mostrarAuto).map((entrada, idx)=>{
      const ativa = entrada.tipo && entrada.tipo!=='auto' && entrada.tipo!=='parte';
      const usado = entrada.limite ? poderFoiUsado(f, entrada.chaveBase) : false;
      const ehGolpePessoal = entrada.chaveBase==='Golpe Pessoal' && entrada.indicePoderesClasse!=null;
      const golpeRow = ehGolpePessoal ? f.poderesClasse[entrada.indicePoderesClasse] : null;
      const golpeJaConstruido = golpeRow && golpeRow.golpeConstruido && golpeRow.golpeConstruido.arma;
      const selo = entrada.tipo==='auto' ? el('span',{class:'selo-poder auto'}, 'automático') : entrada.tipo==='parte' ? el('span',{class:'selo-poder auto'}, 'em parte') : ativa ? el('span',{class:'selo-poder'}, 'ativa') : null;
      return renderItemColapsavel('poder-'+idx+'-'+entrada.nome, el('span',{}, entrada.nome+(usado?' (usado)':''), selo ? ' ' : null, selo), entrada.fonte, [
        el('div',{class:'meta', style:'margin-bottom:4px;'+(entrada.tipo==='auto'?'color:var(--gold);':'')},
          entrada.tipo==='auto' ? '⚡ Já calculado na ficha automaticamente' : entrada.tipo==='parte' ? '⚡ '+entrada.nota : ativa ? '🎯 Está no "Em jogo", no painel Status da Ficha' : '📖 Só referência: acompanhe o efeito na mesa'
        ),
        el('div',{class:'desc'}, entrada.desc),
        ehGolpePessoal ? el('div',{style:'margin-top:8px;'},
          golpeJaConstruido ? el('div',{class:'tip', style:'margin-bottom:6px;'},
            el('div',{}, el('b',{}, golpeRow.golpeConstruido.nomeGolpe||'Seu golpe'), ' — ', golpeRow.golpeConstruido.arma, ' · ', el('b',{style:'color:var(--gold);'}, calcularCustoGolpePessoal(golpeRow.golpeConstruido.escolhas)+' PM')),
            el('div',{style:'margin-top:4px;'}, Object.keys(golpeRow.golpeConstruido.escolhas||{}).filter(n=>golpeRow.golpeConstruido.escolhas[n]>0).map(n=> n+(golpeRow.golpeConstruido.escolhas[n]>1?' ×'+golpeRow.golpeConstruido.escolhas[n]:'')).join(', '))
          ) : null,
          el('button',{class:'btn ghost', onclick:(e)=>{ e.stopPropagation(); abrirConstrutorGolpePessoal(entrada.indicePoderesClasse); }}, golpeJaConstruido ? '✏️ Reconstruir' : '🔨 Construir Golpe')
        ) : null
      ]);
    });
    if(nAuto) corpo.push(el('button',{class:'recolhido-auto', onclick:()=>{ state._notasMostrarAuto = !mostrarAuto; render(); }},
      mostrarAuto ? 'esconder os automáticos' : '+ '+nAuto+' automático(s) (já somados na ficha)'));
    return corpo;
  });
}

// ---- ITENS (catálogo) ----
// Card colapsável genérico para catálogos: mostra só nome + info curta por padrão,
// e ao clicar expande descrição/avisos/botões — economiza espaço em listas longas.
// Seção colapsável "grande" — usada pros blocos de referência dentro de Notas (Proficiências,
// Manobras de Combate, Poderes, Habilidades Iniciais, Descanso). Diferente do
// renderItemColapsavel (que é por ITEM dentro de uma lista), essa é a SEÇÃO inteira: fechada,
// mostra só o título + um resumo rápido de 1 linha; aberta, desenha o conteúdo completo. O
// corpo só é montado (corpoFn chamada) quando está de fato aberto, pra não gastar tempo à toa
// calculando algo que nem vai aparecer.
function renderSecaoNotasColapsavel(chave, icone, titulo, resumo, corpoFn, abertoPadrao){
  if(!state._secoesNotasAbertas) state._secoesNotasAbertas = {};
  // Na primeira vez que essa seção aparece (ninguém ainda tocou nela), usa abertoPadrao pra
  // decidir se começa aberta ou fechada — por exemplo, "Condições Ativas" já nasce aberta se
  // tiver alguma condição de verdade, mas fechada (só o resumo) se estiver vazia. Depois que o
  // jogador mexe uma vez, a preferência dele manda.
  if(state._secoesNotasAbertas[chave]===undefined) state._secoesNotasAbertas[chave] = !!abertoPadrao;
  const aberto = !!state._secoesNotasAbertas[chave];
  const panel = el('div',{class:'panel', style:'padding-bottom:'+(aberto?'var(--sp-4)':'6px')+';'});
  panel.appendChild(el('div',{
    style:'display:flex;align-items:center;justify-content:space-between;gap:10px;cursor:pointer;'+(aberto?'margin-bottom:var(--sp-3);border-bottom:1px solid var(--line);padding-bottom:var(--sp-2);':''),
    onclick:()=>{ state._secoesNotasAbertas[chave]=!aberto; render(); }
  },
    el('div',{style:'display:flex;align-items:center;gap:10px;min-width:0;'},
      el('span',{style:'font-size:1.15rem;flex-shrink:0;'}, icone),
      el('h2',{style:'margin:0;border:none;padding:0;'}, titulo)
    ),
    el('div',{style:'display:flex;align-items:center;gap:8px;flex-shrink:0;'},
      (!aberto && resumo) ? el('span',{class:'meta', style:'font-size:var(--fs-2xs);color:var(--ink-soft);white-space:nowrap;'}, resumo) : null,
      el('span',{style:'color:var(--gold);font-size:0.8rem;transition:transform 200ms;'+(aberto?'transform:rotate(90deg);':'')}, '▸')
    )
  ));
  if(aberto){
    corpoFn().forEach(elemento => { if(elemento) panel.appendChild(elemento); });
  }
  return panel;
}

function renderItemColapsavel(chave, nomeExibido, metaTopo, corpoElementos, corAcento){
  if(!state._itensExpandidos) state._itensExpandidos = {};
  const aberto = !!state._itensExpandidos[chave];
  const card = el('div',{class:'spell-card', style: corAcento ? ('border-left:4px solid '+corAcento+';') : ''},
    el('div',{class:'head', style:'cursor:pointer;', onclick:()=>{ state._itensExpandidos[chave]=!aberto; render(); }},
      el('span',{class:'name'}, nomeExibido),
      el('span',{class:'meta'}, metaTopo)
    )
  );
  if(aberto){
    corpoElementos.forEach(elemento => { if(elemento) card.appendChild(elemento); });
  }
  return card;
}

// Igual ao renderItemColapsavel, mas em modo "acordeão": só um item por grupo fica aberto de
// cada vez — abrir um novo fecha automaticamente o anterior. Bom pra listas longas de poderes.
function renderItemAcordeao(grupoChave, itemChave, nomeExibido, metaTopo, corpoElementos){
  if(!state._acordeaoAberto) state._acordeaoAberto = {};
  const aberto = state._acordeaoAberto[grupoChave] === itemChave;
  const card = el('div',{class:'spell-card'},
    el('div',{class:'head', style:'cursor:pointer;', onclick:()=>{ state._acordeaoAberto[grupoChave] = aberto ? null : itemChave; render(); }},
      el('span',{class:'name'}, nomeExibido),
      el('span',{class:'meta'}, metaTopo)
    )
  );
  if(aberto){
    corpoElementos.forEach(elemento => { if(elemento) card.appendChild(elemento); });
  }
  return card;
}
