// Catálogo de itens (aba Itens): buscar, equipar ou guardar.
// Separado do js/ficha.js em 15/11/2026 (item 6 da revisão geral), sem mudar o código.

function renderItensCompleto(){
  if(state._itemSuperiorBuilder) return renderCriadorItemSuperior();
  const f = fichaAtual();
  const wrap = el('div',{});

  const itf = state.itensFiltro;
  wrap.appendChild(el('div',{class:'tip'},
    el('b',{},'Como usar'),
    'O mestre disse que você achou algo? Busque o nome aqui. Para cada item, escolha se ele já entra em uso ("Equipar") ou se vai só para a mochila. Armadura e escudo equipados atualizam sua Defesa automaticamente.'
  ));
  wrap.appendChild(renderAlvosCatalogo(f));

  const tabsRow = el('div',{class:'tab-grid'});
  [['armas','Armas'],['armaduras','Defesas'],['esotericos','Esotéricos'],['pocoes','Poções Mágicas'],['magicos','Itens Mágicos'],['gerais','Itens Gerais']].forEach(([id,label])=>{
    tabsRow.appendChild(el('button',{class: itf.tipo===id?'on':'', onclick:()=>{itf.tipo=id; itf.categoria='todas'; render();}}, label));
  });
  wrap.appendChild(tabsRow);

  wrap.appendChild(el('input',{id:'busca-itens', type:'text', placeholder:'buscar item pelo nome...', value:itf.busca, oninput:(e)=>{itf.busca=e.target.value; renderDebounced();}}));

  // Item Personalizado — visível aqui, ACIMA das sub-abas, pra aparecer não importa em qual
  // aba você está (Armas, Defesas, etc.) — antes só ficava escondido dentro de "Itens Gerais",
  // e quem queria criar uma arma/armadura personalizada não pensava em procurar lá.
  wrap.appendChild(el('button',{class:'btn ghost', style:'margin-bottom:10px;', onclick:()=>abrirOficina()}, '⚗️ Criar item personalizado'));

  const results = el('div',{});

  if(itf.tipo==='armas'){
    const cats = ['todas','Simples','Marcial','Exótica','Arma de Fogo'];
    const sel = el('select',{onchange:(e)=>{itf.categoria=e.target.value; render();}});
    cats.forEach(c=> sel.appendChild(el('option',{value:c, selected: itf.categoria===c}, c==='todas'?'Todas as categorias':c)));
    wrap.appendChild(sel);

    let list = ARMAS.filter(w => (itf.categoria==='todas'||w.cat===itf.categoria) && (!itf.busca || w.n.toLowerCase().includes(itf.busca.toLowerCase())));
    if(list.length===0) results.appendChild(el('div',{class:'empty'},'Nenhuma arma encontrada.'));
    list.forEach(w=>{
      const semProf = !proficienteComArma(f, w);
      results.appendChild(renderItemAcordeao('itens-armas', w.n, w.n+(semProf?' ⚠':''), w.cat, [
        el('div',{class:'desc'}, 'Dano '+w.dano+' · Crítico '+w.critico+' · '+w.tipo+' · Alcance: '+w.alcance+' · '+w.cat+' · '+w.esp+' esp. · '+(w.maos>=2?'2 mãos':'1 mão')),
        semProf ? el('div',{class:'meta', style:'color:var(--red-bright);margin-top:4px;'}, '⚠ Sem proficiência — sofre –5 no teste de ataque') : null,
        el('div',{class:'row', style:'margin-top:8px;'},
          botaoQueVoa('Equipar', 'btn', w.n, 'mochila', ()=>addArma(w,true)),
          botaoQueVoa('Guardar na mochila', 'btn ghost', w.n, 'mochila', ()=>addArma(w,false))
        ),
        el('button',{class:'btn ghost', style:'margin-top:6px;width:100%;', onclick:()=>iniciarItemSuperior('arma', w)}, '🛠️ Criar Item Superior')
      ]));
    });
  }

  if(itf.tipo==='armaduras'){
    let list = [...ARMADURAS, ...ESCUDOS].filter(a => !itf.busca || a.n.toLowerCase().includes(itf.busca.toLowerCase()));
    if(list.length===0) results.appendChild(el('div',{class:'empty'},'Nenhuma armadura/escudo encontrada.'));
    const prof = proficienciasPersonagem(f);
    list.forEach(a=>{
      const isEscudo = a.cat==='Escudo';
      const semProf = isEscudo ? !prof.escudos : (a.cat==='Pesada' && !prof.armadurasPesadas);
      results.appendChild(renderItemAcordeao('itens-armaduras', a.n, a.n+(semProf?' ⚠':''), a.cat, [
        el('div',{class:'desc'}, 'Defesa +'+a.def+' · Penalidade '+a.pen+' · '+a.esp+' espaços · '+a.cat),
        semProf ? el('div',{class:'meta', style:'color:var(--red-bright);margin-top:4px;'}, '⚠ Sem proficiência — a penalidade ('+a.pen+') passa a valer em toda perícia de Força/Destreza') : null,
        el('div',{class:'row', style:'margin-top:8px;'},
          botaoQueVoa(isEscudo?'Equipar como escudo':'Equipar como armadura', 'btn', a.n, 'mochila', ()=> isEscudo?addEscudo(a,true):addArmadura(a,true)),
          botaoQueVoa('Guardar na mochila', 'btn ghost', a.n, 'mochila', ()=> isEscudo?addEscudo(a,false):addArmadura(a,false))
        ),
        el('button',{class:'btn ghost', style:'margin-top:6px;width:100%;', onclick:()=>iniciarItemSuperior(isEscudo?'escudo':(a.cat==='Pesada'?'armaduraPesada':'armaduraLeve'), a)}, '🛠️ Criar Item Superior')
      ]));
    });
  }

  if(itf.tipo==='esotericos'){
    let list = ITENS_ESOTERICOS.filter(i => !itf.busca || i.n.toLowerCase().includes(itf.busca.toLowerCase()));
    if(list.length===0) results.appendChild(el('div',{class:'empty'},'Nenhum esotérico encontrado.'));
    results.appendChild(el('div',{class:'tip', style:'font-size:0.8rem;'}, 'Itens esotéricos são empunhados (ocupam mão) para dar bônus mágicos enquanto você conjura — competem por espaço com armas e escudos.'));
    list.forEach(it=>{
      results.appendChild(renderItemAcordeao('itens-esotericos', it.n, it.n, it.maos+' mão'+(it.maos>1?'s':''), [
        el('div',{class:'desc'}, it.desc),
        el('div',{class:'meta'}, it.maos+' mão'+(it.maos>1?'s':'')+' · '+it.esp+' esp.'),
        el('div',{class:'row', style:'margin-top:8px;'},
          botaoQueVoa('Equipar', 'btn', it.n, 'mochila', ()=>addEsoterico(it,true)),
          botaoQueVoa('Guardar na mochila', 'btn ghost', it.n, 'mochila', ()=>addEsoterico(it,false))
        ),
        el('button',{class:'btn ghost', style:'margin-top:6px;width:100%;', onclick:()=>iniciarItemSuperior('esoterico', it)}, '🛠️ Criar Item Superior')
      ]));
    });
  }

  if(itf.tipo==='gerais'){
    const itensDisponiveis = itensVisiveisJogador();
    const categorias = ['todas', ...new Set(itensDisponiveis.map(i=>i.cat))];
    const sel = el('select',{onchange:(e)=>{itf.categoria=e.target.value; render();}});
    categorias.forEach(c=> sel.appendChild(el('option',{value:c, selected: itf.categoria===c}, c==='todas'?'Todas as categorias':c)));
    wrap.appendChild(sel);

    wrap.appendChild(el('button',{class:'filtro-serve'+(itf.serve?' on':''), 'aria-pressed':itf.serve?'true':'false', onclick:()=>{ itf.serve=!itf.serve; render(); }}, '✦ Serve pra mim'));
    const infos = new Map();
    itensDisponiveis.forEach(i=> infos.set(i.n, infoServePraMim(f, i)));
    let list = itensDisponiveis.filter(i => (itf.categoria==='todas'||i.cat===itf.categoria) && (!itf.busca || i.n.toLowerCase().includes(itf.busca.toLowerCase())) && (!itf.serve || infos.get(i.n)));
    if(itf.serve) results.appendChild(el('div',{class:'meta', style:'text-transform:none;text-align:center;margin-bottom:6px;'}, list.length+' de '+itensDisponiveis.length+' itens mudam alguma coisa nesta ficha'));
    if(list.length===0) results.appendChild(el('div',{class:'empty'},'Nenhum item encontrado.'));
    list = list.slice().sort((a,b)=> a.cat.localeCompare(b.cat) || a.n.localeCompare(b.n));
    let ultimaCategoria = null;
    list.forEach(it=>{
      if(itf.categoria==='todas' && it.cat!==ultimaCategoria){
        ultimaCategoria = it.cat;
        results.appendChild(el('div',{class:'lista-secao-titulo'}, it.cat));
      }
      const info = infos.get(it.n);
      const titulo = el('span',{}, it.n+(it.vestivel?' 👕':'')+(it.empunhavel?' 🎻':''), info ? el('span',{class:'marca-serve'}, '✦ '+info.marca) : null);
      const forjavel = it.cat==='Vestuário' || it.cat==='Ferramenta';
      results.appendChild(renderItemAcordeao('itens-gerais', it.n, titulo, it.cat+' · '+fmtEsp(parseFloat(String(it.esp).replace(',','.'))||0)+' esp', [
        el('div',{class:'desc'}, it.desc),
        renderDifCatalogo(f, it, info),
        it.empunhavel ? el('div',{class:'meta'}, it.maos+' mão'+(it.maos>1?'s':'')+' — precisa ser empunhado pra dar o benefício') : null,
        el('div',{class:'row', style:'margin-top:8px;'},
          it.vestivel ? botaoQueVoa('Vestir', 'btn', it.n, 'vestindo', ()=>addItemGeral(it,true)) : null,
          it.empunhavel ? botaoQueVoa('Equipar', 'btn', it.n, 'mochila', ()=>addEsoterico(it,true)) : null,
          botaoQueVoa((it.vestivel||it.empunhavel)?'Só guardar':'+ Guardar na mochila', (it.vestivel||it.empunhavel)?'btn ghost':'btn', it.n, 'mochila', ()=> it.empunhavel ? addEsoterico(it,false) : addItemGeral(it,false))
        ),
        forjavel ? el('button',{class:'btn ghost', style:'margin-top:6px;width:100%;', onclick:()=>iniciarItemSuperior(it.cat==='Ferramenta'?'ferramenta':'vestuario', it)}, '🛠️ Criar Item Superior') : null
      ]));
    });
  }

  if(itf.tipo==='pocoes'){
    wrap.appendChild(el('div',{class:'tip', style:'font-size:0.8rem;'}, 'Poções (Tabela 8-12) contêm a magia real indicada — o efeito é o mesmo de lançar aquela magia.'));
    let list = POCOES_MAGICAS.filter(p => !itf.busca || p.nome.toLowerCase().includes(itf.busca.toLowerCase()));
    if(list.length===0) results.appendChild(el('div',{class:'empty'},'Nenhuma poção encontrada.'));
    list.slice().sort((a,b)=>a.preco-b.preco).forEach(p=>{
      results.appendChild(renderItemAcordeao('itens-pocoes', p.nome, p.nome, p.circulo+'º círculo', [
        el('div',{class:'desc'}, 'Contém a magia: '+p.magia),
        botaoQueVoa('+ Guardar na mochila', 'btn', p.nome, 'mochila', ()=>addItemMagicoGenerico(p.nome, p.esp))
      ]));
    });
  }

  if(itf.tipo==='magicos'){
    const cats = ['todas','Encantos de Arma','Armas Específicas','Encantos de Armadura','Armaduras/Escudos Específicos','Acessórios Menores','Acessórios Médios','Acessórios Maiores'];
    const sel2 = el('select',{onchange:(e)=>{itf.categoria=e.target.value; render();}});
    cats.forEach(c=> sel2.appendChild(el('option',{value:c, selected: itf.categoria===c}, c)));
    wrap.appendChild(sel2);
    wrap.appendChild(el('div',{class:'tip', style:'font-size:0.8rem;'}, 'Encantos de arma/armadura são modificadores — combine com o item base usando "🛠️ Criar Item Superior" nas abas de Armas/Armaduras. Os demais já são itens prontos: guarde direto na mochila.'));

    const cat = itf.categoria==='todas' ? null : itf.categoria;
    const busca = itf.busca ? itf.busca.toLowerCase() : '';

    if(!cat || cat==='Encantos de Arma'){
      ENCANTOS_ARMA.filter(e=>!busca || e.nome.toLowerCase().includes(busca)).forEach(e=>{
        results.appendChild(renderItemAcordeao('itens-magicos', 'encanto-arma-'+e.nome, e.nome, 'Encanto de Arma'+(e.dobraContagem?' (conta como 2)':''), [
          el('div',{class:'desc'}, e.efeito)
        ]));
      });
    }
    if(!cat || cat==='Armas Específicas'){
      ARMAS_ESPECIFICAS.filter(a=>!busca || a.nome.toLowerCase().includes(busca)).forEach(a=>{
        results.appendChild(renderItemAcordeao('itens-magicos', 'arma-esp-'+a.nome, a.nome, a.base, [
          el('div',{class:'desc'}, a.desc),
          botaoQueVoa('+ Guardar na mochila', 'btn', a.nome, 'mochila', ()=>addItemMagicoGenerico(a.nome, a.nome==='Mochila de carga' ? 0 : 1))
        ]));
      });
    }
    if(!cat || cat==='Encantos de Armadura'){
      ENCANTOS_ARMADURA.filter(e=>!busca || e.nome.toLowerCase().includes(busca)).forEach(e=>{
        results.appendChild(renderItemAcordeao('itens-magicos', 'encanto-armadura-'+e.nome, e.nome, 'Encanto de Armadura'+(e.dobraContagem?' (conta como 2)':''), [
          el('div',{class:'desc'}, e.efeito)
        ]));
      });
    }
    if(!cat || cat==='Armaduras/Escudos Específicos'){
      ARMADURAS_ESPECIFICAS.filter(a=>!busca || a.nome.toLowerCase().includes(busca)).forEach(a=>{
        results.appendChild(renderItemAcordeao('itens-magicos', 'armadura-esp-'+a.nome, a.nome, a.base, [
          el('div',{class:'desc'}, a.desc),
          botaoQueVoa('+ Guardar na mochila', 'btn', a.nome, 'mochila', ()=>addItemMagicoGenerico(a.nome, a.nome==='Mochila de carga' ? 0 : 1))
        ]));
      });
    }
    if(!cat || cat==='Acessórios Menores'){
      ACESSORIOS_MENORES.filter(a=>!busca || a.nome.toLowerCase().includes(busca)).forEach(a=>{
        results.appendChild(renderItemAcordeao('itens-magicos', 'acessorio-menor-'+a.nome, a.nome, '', [
          el('div',{class:'desc'}, a.desc),
          botaoQueVoa('+ Guardar na mochila', 'btn', a.nome, 'mochila', ()=>addItemMagicoGenerico(a.nome, a.nome==='Mochila de carga' ? 0 : 1))
        ]));
      });
    }
    if(!cat || cat==='Acessórios Médios'){
      ACESSORIOS_MEDIOS.filter(a=>!busca || a.nome.toLowerCase().includes(busca)).forEach(a=>{
        results.appendChild(renderItemAcordeao('itens-magicos', 'acessorio-medio-'+a.nome, a.nome, '', [
          el('div',{class:'desc'}, a.desc),
          botaoQueVoa('+ Guardar na mochila', 'btn', a.nome, 'mochila', ()=>addItemMagicoGenerico(a.nome, a.nome==='Mochila de carga' ? 0 : 1))
        ]));
      });
    }
    if(!cat || cat==='Acessórios Maiores'){
      ACESSORIOS_MAIORES.filter(a=>!busca || a.nome.toLowerCase().includes(busca)).forEach(a=>{
        results.appendChild(renderItemAcordeao('itens-magicos', 'acessorio-maior-'+a.nome, a.nome, '', [
          el('div',{class:'desc'}, a.desc),
          botaoQueVoa('+ Guardar na mochila', 'btn', a.nome, 'mochila', ()=>addItemMagicoGenerico(a.nome, a.nome==='Mochila de carga' ? 0 : 1))
        ]));
      });
    }
    if(results.children.length===0) results.appendChild(el('div',{class:'empty'},'Nenhum item encontrado.'));
  }

  wrap.appendChild(results);
  return wrap;
}
