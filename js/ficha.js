// ============ TELA DE FICHA (Ficha / Itens / Magias / Evolução) ============

// ============ TELA DE FICHA (Personagem / Poderes / Ataques / Mochila / Magias / Perícias / Itens / Evolução) ============

const MENU_SECOES = [
  ['personagem','Personagem','🧙'],
  ['magias','Magias','📖'],
  ['pericias','Perícias','🎯'],
  ['itens','Itens','🎒'],
  ['guia','Evolução','📈'],
];

function renderMenuOverlay(){
  const overlay = el('div',{class:'menu-overlay', onclick:(e)=>{ if(e.target===e.currentTarget){ state._menuAberto=false; render(); } }});
  const sheet = el('div',{class:'menu-sheet'});
  MENU_SECOES.forEach(([id,label,ico])=>{
    sheet.appendChild(el('button',{class:'menu-item'+(state.tab===id?' active':''), onclick:()=>{ state.tab=id; state._menuAberto=false; render(); }},
      el('span',{class:'ico'}, ico), el('span',{}, label)
    ));
  });
  const pendencias = detectarPendencias(fichaAtual());
  sheet.appendChild(el('button',{class:'menu-item', style: pendencias.length>0 ? 'color:var(--red-bright);' : '', onclick:()=>{ state._menuAberto=false; state._pendenciasAberto=true; render(); }},
    el('span',{class:'ico'}, pendencias.length>0?'⚠️':'📋'),
    el('span',{}, 'Pendências'+(pendencias.length>0?' ('+pendencias.length+') !':''))
  ));
  sheet.appendChild(el('button',{class:'menu-item', onclick:alternarTemaMesa},
    el('span',{class:'ico'}, document.documentElement.dataset.tema==='mesa'?'☀️':'🌓'), el('span',{}, document.documentElement.dataset.tema==='mesa'?'Modo Padrão':'Modo Mesa (alto contraste)')
  ));
  sheet.appendChild(el('button',{class:'menu-close', onclick:()=>{ state._menuAberto=false; render(); }}, 'Fechar'));
  overlay.appendChild(sheet);
  return overlay;
}

// Mostra o que existe no app hoje mas que esse personagem específico ainda não preencheu
// (normalmente porque a ficha foi criada antes da gente adicionar aquela mecânica). Reaproveita
// os mesmos blocos de escolha do wizard/level-up, só que gravando direto na ficha existente —
// não mexe em mais nada (mochila, PV atual, magias, histórico, etc. ficam intocados).
function renderPopupPendencias(f){
  const overlay = el('div',{class:'menu-overlay', onclick:(e)=>{ if(e.target===e.currentTarget){ state._pendenciasAberto=false; state._pendenciaResolvendo=null; render(); } }});
  const sheet = el('div',{class:'menu-sheet', style:'max-width:480px;'});
  const pendencias = detectarPendencias(f);

  sheet.appendChild(el('div',{class:'wizard-title', style:'padding:6px 14px 0;'},'Pendências'));

  if(pendencias.length===0){
    sheet.appendChild(el('div',{class:'tip', style:'margin:8px 14px;'}, '✅ Nenhuma pendência agora — essa ficha está com todas as escolhas que existem hoje no app preenchidas.'));
    sheet.appendChild(el('button',{class:'menu-close', onclick:()=>{ state._pendenciasAberto=false; render(); }}, 'Fechar'));
    overlay.appendChild(sheet);
    return overlay;
  }

  sheet.appendChild(el('div',{class:'tip', style:'margin:8px 14px;'}, 'Coisas que já existem no app mas que essa ficha ainda não preencheu — geralmente porque foi criada antes da gente adicionar aquilo. Preencher aqui não mexe em mais nada da ficha.'));

  pendencias.forEach(p=>{
    const resolvendo = state._pendenciaResolvendo === p.tipo;
    const card = el('div',{class:'panel', style:'margin:8px 14px;'});
    card.appendChild(el('h2',{}, '⚠️ '+p.titulo));
    card.appendChild(el('div',{class:'tip'}, p.resumo));

    if(p.tipo==='divindadeForcada'){
      card.appendChild(el('button',{class:'btn', onclick:()=>{ state._pendenciasAberto=false; state._divindadeFluxo={passo:'escolher'}; render(); }}, 'Resolver agora →'));
    }

    if(p.tipo==='arcanistaCaminho'){
      if(!resolvendo){
        card.appendChild(el('button',{class:'btn', onclick:()=>{ state._pendenciaResolvendo='arcanistaCaminho'; state._pendCaminho=null; state._pendLinhagem=null; render(); }}, 'Resolver agora'));
      } else {
        card.appendChild(el('div',{class:'option-grid'},
          ...Object.keys(ARCANISTA_CAMINHOS).map(nome=>{
            const info = ARCANISTA_CAMINHOS[nome];
            const aberto = state._pendCaminhoExpandido === nome;
            const opt = el('button',{class:'option-card'+(state._pendCaminho===nome?' selected':''), onclick:()=>{
              if(aberto || state._pendCaminho===nome){ state._pendCaminho=nome; if(nome!=='Feiticeiro') state._pendLinhagem=null; state._pendCaminhoExpandido=null; }
              else { state._pendCaminhoExpandido = nome; }
              render();
            }}, el('div',{class:'opt-nome'}, nome), el('div',{class:'opt-sub'}, info.resumo));
            if(aberto) opt.appendChild(el('div',{class:'opt-sub', style:'margin-top:6px;'}, info.descricao));
            return opt;
          })
        ));
        if(state._pendCaminho==='Feiticeiro'){
          card.appendChild(el('div',{class:'tip', style:'margin-top:8px;'}, 'Escolha uma linhagem:'));
          card.appendChild(el('div',{class:'option-grid'},
            ...LINHAGENS_FEITICEIRO.map(l=>{
              const aberta = state._pendLinhagemExpandida === l.nome;
              const opt = el('button',{class:'option-card'+(state._pendLinhagem===l.nome?' selected':''), onclick:()=>{
                if(aberta || state._pendLinhagem===l.nome){ state._pendLinhagem=l.nome; state._pendLinhagemExpandida=null; }
                else { state._pendLinhagemExpandida = l.nome; }
                render();
              }}, el('div',{class:'opt-nome'}, l.nome), el('div',{class:'opt-sub'}, l.resumo));
              if(aberta) opt.appendChild(el('div',{class:'opt-sub', style:'margin-top:6px;'}, el('b',{},'Básica: '), l.basica));
              return opt;
            })
          ));
        }
        const podeSalvar = state._pendCaminho && (state._pendCaminho!=='Feiticeiro' || state._pendLinhagem);
        card.appendChild(el('div',{class:'row', style:'margin-top:10px;'},
          el('button',{class:'btn'+(podeSalvar?'':' ghost'), onclick:()=>{
            if(!podeSalvar) return;
            f.arcanistaCaminho = state._pendCaminho;
            f.arcanistaLinhagem = state._pendCaminho==='Feiticeiro' ? state._pendLinhagem : null;
            if(ARCANISTA_CAMINHOS[state._pendCaminho].memorizacao && !f.magiasMemorizadas) f.magiasMemorizadas = [];
            salvarPerfis();
            flashMsg('✅ Caminho do Arcanista salvo!');
            state._pendenciaResolvendo=null;
            render();
          }}, 'Salvar'),
          el('button',{class:'btn ghost', onclick:()=>{ state._pendenciaResolvendo=null; render(); }}, 'Cancelar')
        ));
      }
    }

    if(p.tipo==='escolasMagia'){
      if(!resolvendo){
        card.appendChild(el('button',{class:'btn', onclick:()=>{ state._pendenciaResolvendo='escolasMagia'; state._pendEscolas=[]; render(); }}, 'Resolver agora'));
      } else {
        card.appendChild(el('div',{class:'option-grid'},
          ...Object.keys(ESCOLAS).map(esc=>{
            const marcada = (state._pendEscolas||[]).includes(esc);
            return el('button',{class:'option-card'+(marcada?' selected':''), onclick:()=>{
              if(marcada){ state._pendEscolas = state._pendEscolas.filter(e=>e!==esc); }
              else if((state._pendEscolas||[]).length < 3){ state._pendEscolas = [...(state._pendEscolas||[]), esc]; }
              else { flashMsg('Já escolheu as 3 escolas.'); return; }
              render();
            }}, el('div',{class:'opt-nome'}, esc), el('div',{class:'opt-sub'}, ESCOLAS[esc]));
          })
        ));
        card.appendChild(el('div',{class:'meta', style:'margin-top:6px;'}, (state._pendEscolas||[]).length+' / 3 escolhidas'));
        const podeSalvar = (state._pendEscolas||[]).length===3;
        card.appendChild(el('div',{class:'row', style:'margin-top:10px;'},
          el('button',{class:'btn'+(podeSalvar?'':' ghost'), onclick:()=>{
            if(!podeSalvar) return;
            f.escolasMagia = state._pendEscolas.slice();
            salvarPerfis();
            flashMsg('✅ Escolas de magia salvas!');
            state._pendenciaResolvendo=null;
            render();
          }}, 'Salvar'),
          el('button',{class:'btn ghost', onclick:()=>{ state._pendenciaResolvendo=null; render(); }}, 'Cancelar')
        ));
      }
    }

    sheet.appendChild(card);
  });

  sheet.appendChild(el('button',{class:'menu-close', onclick:()=>{ state._pendenciasAberto=false; state._pendenciaResolvendo=null; render(); }}, 'Fechar'));
  overlay.appendChild(sheet);
  return overlay;
}

// "Personagem" tem 4 sub-abas internas: Ficha (identidade/atributos/vida-mana/defesa/itens
// equipados/vestidos), Magias (as aprendidas), Mochila (carga/moedas/itens guardados) e Notas
// (habilidades iniciais/proficiências/poderes/anotações)
function renderPersonagemScreen(){
  const wrap = el('div',{});
  if(!state.personagemTab) state.personagemTab = 'ficha';
  const nav = el('nav',{class:'tabs', style:'margin:0 0 4px;padding:0;'});
  [['ficha','Ficha'],['magias','Magias'],['mochila','Mochila'],['notas','Notas']].forEach(([id,label])=>{
    nav.appendChild(el('button',{class: state.personagemTab===id?'active':'', onclick:()=>{state.personagemTab=id; render();}}, label));
  });
  wrap.appendChild(nav);
  const content = el('div',{style:'padding-top:10px;'});
  if(state.personagemTab==='ficha') content.appendChild(renderPersonagemFicha());
  if(state.personagemTab==='magias') content.appendChild(renderPersonagemMagias());
  if(state.personagemTab==='mochila') content.appendChild(renderPersonagemMochila());
  if(state.personagemTab==='notas') content.appendChild(renderPersonagemNotas());
  wrap.appendChild(content);
  return wrap;
}

function renderFichaScreen(){
  const wrap = el('div',{});
  const f = fichaAtual();
  const secaoAtual = MENU_SECOES.find(s=>s[0]===state.tab) || MENU_SECOES[0];

  wrap.appendChild(el('header',{class:'top'},
    el('div',{style:'display:flex;justify-content:space-between;align-items:center;gap:10px;'},
      el('button',{class:'btn ghost', style:'width:auto;flex-shrink:0;padding:6px 12px;background:transparent;border-color:#f4efe2;color:#f4efe2;', onclick:()=>{ pararAtualizacaoAutomaticaJogador(); state.screen='perfis'; state.perfilAtualId=null; render(); }}, '← Perfis'),
      el('h1',{class:'display', style:'font-size:1.1rem;margin:0;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;text-align:center;'}, f.nome || 'Personagem'),
      el('button',{class:'menu-trigger', style:'flex-shrink:0;', onclick:()=>{ state._menuAberto=true; render(); }},
        el('span',{}, secaoAtual[2]), el('span',{},'Menu')
      )
    ),
    el('div',{class:'sub', style:'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;'}, (f.raca||'—')+' · '+classeDisplay(f)+' · Nível total '+nivelTotal(f))
  ));

  if(state._menuAberto){
    wrap.appendChild(renderMenuOverlay());
  }
  if(state._divindadeFluxo){
    wrap.appendChild(renderPopupDivindade(fichaAtual(), state._divindadeFluxo));
  }
  if(state._cropperFoto){
    wrap.appendChild(renderCropperFoto());
  }
  if(state.levelUp && state.levelUp.aberto){
    wrap.appendChild(renderLevelUpPopup(fichaAtual()));
  }
  if(state._enviarItemFluxo){
    wrap.appendChild(renderPopupEnviarItem(fichaAtual()));
  }
  if(state._pendenciasAberto){
    wrap.appendChild(renderPopupPendencias(fichaAtual()));
  }
  const semMenuAberto = !state._menuAberto && !state._divindadeFluxo && !state._cropperFoto && !(state.levelUp&&state.levelUp.aberto) && !state._enviarItemFluxo && !state._pendenciasAberto;
  if(estaMorto(f) && semMenuAberto){
    wrap.appendChild(el('div',{class:'aviso-sobrecarga aviso-morte'}, '💀 '+(f.nome||'Personagem')+' morreu.'));
  } else if(estaInconsciente(f) && semMenuAberto){
    if(f.estabilizado){
      wrap.appendChild(el('div',{class:'aviso-sobrecarga'}, '😵 Inconsciente, mas estabilizado — precisa de cura (ou descanso) pra recobrar a consciência.'));
    } else {
      wrap.appendChild(el('div',{class:'aviso-sobrecarga', style:'cursor:default;'},
        el('div',{}, '🩸 Inconsciente e sangrando — teste de Constituição (CD 15) no início do turno. Se falhar, tire o dano de 1d6 direto no PV.'),
        el('button',{class:'btn', style:'margin-top:6px;width:auto;padding:6px 14px;', onclick:(e)=>{ e.stopPropagation(); estabilizarPersonagem(f); }}, '✅ Passou — Estabilizar')
      ));
    }
  }
  if(sobrecarregado(f) && semMenuAberto){
    wrap.appendChild(el('div',{class:'aviso-sobrecarga', onclick:()=>{ state.tab='personagem'; state.personagemTab='mochila'; render(); }},
      '⚠ Sobrecarregado — toque pra ver a Mochila (−5 de penalidade, −3m de deslocamento já aplicados)'
    ));
  }
  const semProf = itensSemProficiencia(f);
  if(semProf.length>0 && semMenuAberto){
    wrap.appendChild(el('div',{class:'aviso-sobrecarga', onclick:()=>{ state.tab='personagem'; state.personagemTab='ficha'; render(); }},
      '⚠ Sem proficiência com '+semProf.join(', ')+' — penalidade já aplicada, toque pra ver'
    ));
  }
  if(condicoesAtivas(f).length>0 && semMenuAberto){
    wrap.appendChild(el('div',{class:'aviso-sobrecarga', style:'background:linear-gradient(90deg, rgba(122,90,18,0.25), rgba(122,90,18,0.1));border-bottom-color:var(--gold);', onclick:()=>{ state.tab='personagem'; state.personagemTab='ficha'; render(); }},
      '🩹 Condições ativas: '+condicoesAtivas(f).join(', ')
    ));
  }

  const main = el('main',{});
  if(state.tab === 'personagem') main.appendChild(renderPersonagemScreen());
  if(state.tab === 'itens') main.appendChild(renderItensCompleto());
  if(state.tab === 'magias') main.appendChild(renderMagias());
  if(state.tab === 'pericias') main.appendChild(renderPericias());
  if(state.tab === 'guia') main.appendChild(renderGuia());
  wrap.appendChild(main);

  if(['personagem','itens'].includes(state.tab)){
    wrap.appendChild(el('div',{class:'save-bar'},
      el('button',{class:'btn', onclick:saveFicha},'Salvar ficha'),
      el('span',{id:'save-msg', style:'align-self:center;color:#7c1f1f;font-weight:700;font-size:0.8rem;'},'')
    ));
  }

  if(state.addMsg){
    wrap.appendChild(el('div',{id:'add-msg', style:'position:fixed; left:14px; right:14px; bottom:70px; max-width:692px; margin:0 auto; background:#3a2a1a; color:#f4efe2; padding:10px 14px; border-radius:4px; font-size:0.85rem; box-shadow:0 4px 12px rgba(0,0,0,0.35); z-index:50;'}, state.addMsg));
  }

  return wrap;
}

function flashMsg(msg){
  state.addMsg = msg;
  render();
  setTimeout(()=>{ if(state.addMsg===msg){ state.addMsg=''; render(); } }, 2200);
}

function montarArmaEquipada(w){
  return {nome:w.n, refBase:w.n, teste:'', dano:w.dano, critico:w.critico, tipo:w.tipo, alcance:w.alcance, esp:w.esp,
    maos:w.maos||1, distancia:!!w.distancia, pericia: w.pericia || (w.distancia?'Pontaria':'Luta'), cat:w.cat,
    bonusTesteExtra: w.bonusTesteExtra||0, bonusDanoExtra: w.bonusDanoExtra||0,
    melhoriasTxt: w.melhoriasTxt||null, superior: !!w.superior};
}

// Se a arma exige 2 mãos, desequipa qualquer escudo (e vice-versa: equipar escudo
// desequipa armas de 2 mãos), pois não é possível usar as duas coisas ao mesmo tempo.
function maosOcupadas(f){
  let total = 0;
  (f.armas||[]).forEach(a=> total += (a.maos||1));
  if(f.escudo && f.escudo.equipado!==false) total += 1;
  (f.esotericos||[]).forEach(e=>{ if(e.equipado!==false) total += (e.maos||1); });
  return total;
}
// Libera mãos suficientes para equipar algo novo, guardando na mochila as armas/escudo/esotéricos
// mais antigos (nessa ordem) até sobrar espaço. Máximo de 2 mãos ocupadas ao mesmo tempo.
function liberarMaos(f, maosNecessarias){
  let seguranca = 10;
  while(maosOcupadas(f) + maosNecessarias > 2 && seguranca-->0){
    if(f.armas && f.armas.length>0){
      const arma = f.armas.shift();
      f.equip.push({tipo:'arma', ref:arma.refBase||arma.nome, item:arma.nome, qtd:'1', carga:String(arma.esp||1), superior:arma.superior, bonusTesteExtra:arma.bonusTesteExtra, bonusDanoExtra:arma.bonusDanoExtra, melhoriasTxt:arma.melhoriasTxt});
      flashMsg('"'+arma.nome+'" foi para a mochila para liberar as mãos.');
    } else if(f.esotericos && f.esotericos.length>0){
      const eso = f.esotericos.shift();
      f.equip.push({tipo:'esoterico', ref:eso.refBase||eso.nome, item:eso.nome, qtd:'1', carga:String(eso.esp||1), superior:eso.superior, efeitoExtra:eso.efeitoExtra, melhoriasTxt:eso.melhoriasTxt});
      flashMsg('"'+eso.nome+'" foi para a mochila para liberar as mãos.');
    } else if(f.escudo){
      f.equip.push({tipo:'escudo', ref:f.escudo.refBase||f.escudo.nome, item:f.escudo.nome, qtd:'1', carga:String(f.escudo.esp), superior:f.escudo.superior, bonusDefExtra:f.escudo.bonusDefExtra, bonusPenExtra:f.escudo.bonusPenExtra, melhoriasTxt:f.escudo.melhoriasTxt});
      flashMsg('"'+f.escudo.nome+'" foi para a mochila para liberar as mãos.');
      f.escudo = null;
    } else {
      break;
    }
  }
}

function addArma(w, equipar){
  const f = fichaAtual();
  if(equipar){
    liberarMaos(f, w.maos||1);
    f.armas.push(montarArmaEquipada(w));
    flashMsg('"'+w.n+'" equipada — adicionada aos seus ataques (aba Ficha).');
  } else {
    f.equip.push({tipo:'arma', ref:w.n, item:w.n, qtd:'1', carga:String(w.esp)});
    flashMsg('"'+w.n+'" guardada na mochila.');
  }
  salvarPerfis();
}
function addArmadura(a, equipar){
  const f = fichaAtual();
  if(equipar){
    if(f.armadura){ f.equip.push({tipo:'armadura', ref:f.armadura.refBase||f.armadura.nome, item:f.armadura.nome, qtd:'1', carga:String(f.armadura.esp), superior:f.armadura.superior, bonusDefExtra:f.armadura.bonusDefExtra, bonusPenExtra:f.armadura.bonusPenExtra, melhoriasTxt:f.armadura.melhoriasTxt}); }
    f.armadura = {nome:a.n, def:a.def, pen:a.pen, cat:a.cat, esp:a.esp, equipado:true};
    flashMsg('"'+a.n+'" agora está equipada — sua Defesa foi atualizada.');
  } else {
    f.equip.push({tipo:'armadura', ref:a.n, item:a.n, qtd:'1', carga:String(a.esp)});
    flashMsg('"'+a.n+'" guardada na mochila (não equipada).');
  }
  salvarPerfis();
}
function addEscudo(a, equipar){
  const f = fichaAtual();
  if(equipar){
    if(f.escudo){ f.equip.push({tipo:'escudo', ref:f.escudo.refBase||f.escudo.nome, item:f.escudo.nome, qtd:'1', carga:String(f.escudo.esp), superior:f.escudo.superior, bonusDefExtra:f.escudo.bonusDefExtra, bonusPenExtra:f.escudo.bonusPenExtra, melhoriasTxt:f.escudo.melhoriasTxt}); f.escudo=null; }
    liberarMaos(f, 1);
    f.escudo = {nome:a.n, def:a.def, pen:a.pen, cat:a.cat, esp:a.esp, equipado:true};
    flashMsg('"'+a.n+'" agora está equipado — sua Defesa foi atualizada.');
  } else {
    f.equip.push({tipo:'escudo', ref:a.n, item:a.n, qtd:'1', carga:String(a.esp)});
    flashMsg('"'+a.n+'" guardado na mochila (não equipado).');
  }
  salvarPerfis();
}
// Busca um item empunhável (esotérico OU ferramenta que precise ser empunhada, como instrumentos musicais)
function buscarItemEmpunhavel(nome){
  return ITENS_ESOTERICOS.find(i=>i.n===nome) || ITENS_GERAIS.find(i=>i.n===nome && i.empunhavel);
}

function addEsoterico(it, equipar){
  const f = fichaAtual();
  if(!f.esotericos) f.esotericos = [];
  if(equipar){
    liberarMaos(f, it.maos||1);
    f.esotericos.push({nome:it.n, refBase:it.n, esp:it.esp, maos:it.maos||1, efeito:it.efeito||null, escolaFoco:null, equipado:true, superior:false, efeitoExtra:[], melhoriasTxt:null});
    flashMsg('"'+it.n+'" equipado.');
  } else {
    f.equip.push({tipo:'esoterico', ref:it.n, item:it.n, qtd:'1', carga:String(it.esp)});
    flashMsg('"'+it.n+'" guardado na mochila.');
  }
  salvarPerfis();
}
function guardarEsotericoNaMochila(idx){
  const f = fichaAtual();
  const eso = f.esotericos[idx];
  if(!eso) return;
  f.esotericos.splice(idx,1);
  f.equip.push({tipo:'esoterico', ref:eso.refBase||eso.nome, item:eso.nome, qtd:'1', carga:String(eso.esp||1), superior:eso.superior, efeitoExtra:eso.efeitoExtra, melhoriasTxt:eso.melhoriasTxt});
  salvarPerfis();
  flashMsg('"'+eso.nome+'" guardado na mochila.');
  render();
}
function equiparEsotericoDaMochila(idx){
  const f = fichaAtual();
  const row = f.equip[idx];
  if(!row) return;
  const it = buscarItemEmpunhavel(row.ref);
  if(!it){ flashMsg('Não encontrei os dados desse item no catálogo.'); return; }
  if(!f.esotericos) f.esotericos = [];
  liberarMaos(f, it.maos||1);
  const efeitoBase = it.efeito||[];
  const efeitoExtra = row.superior ? (row.efeitoExtra||[]) : [];
  f.esotericos.push({
    nome: row.superior?row.item:it.n, refBase:it.n, esp:it.esp, maos:it.maos||1,
    efeito: [...efeitoBase, ...efeitoExtra], escolaFoco:null, equipado:true,
    superior:!!row.superior, efeitoExtra:efeitoExtra, melhoriasTxt:row.melhoriasTxt||null
  });
  f.equip.splice(idx,1);
  salvarPerfis();
  flashMsg('"'+(row.superior?row.item:it.n)+'" equipado.');
  render();
}
function addItemGeral(it, vestir){
  fichaAtual().equip.push({tipo:'geral', item:it.n, qtd:'1', carga:String(it.esp), vestido:!!vestir});
  salvarPerfis();
  flashMsg(vestir ? '"'+it.n+'" vestido — já contando nos 4 slots (aba Ficha).' : '"'+it.n+'" adicionado à mochila (aba Ficha).');
}

// Adiciona uma poção mágica ou item mágico nomeado (arma/armadura específica, acessório) à
// mochila — esses itens não têm "equipar" próprio no app (efeitos únicos), então só guardam.
function addItemMagicoGenerico(nome, esp){
  fichaAtual().equip.push({tipo:'geral', item:nome, qtd:'1', carga:String(esp||1)});
  salvarPerfis();
  flashMsg('"'+nome+'" adicionado à mochila (aba Personagem → Mochila).');
}

// Equipa um item que está na mochila. Se já houver algo equipado naquele slot,
// o item antigo volta pra mochila automaticamente (troca).
function equiparDaMochila(idx){
  const f = fichaAtual();
  const row = f.equip[idx];
  if(!row) return;
  if(row.tipo==='arma'){
    const w = ARMAS.find(a=>a.n===row.ref);
    if(!w){ flashMsg('Não encontrei os dados dessa arma no catálogo.'); return; }
    liberarMaos(f, w.maos||1);
    const armaMontada = montarArmaEquipada(w);
    if(row.superior){
      armaMontada.nome = row.item;
      armaMontada.refBase = w.n;
      armaMontada.bonusTesteExtra = row.bonusTesteExtra||0;
      armaMontada.bonusDanoExtra = row.bonusDanoExtra||0;
      armaMontada.melhoriasTxt = row.melhoriasTxt||null;
      armaMontada.superior = true;
    }
    f.armas.push(armaMontada);
    f.equip.splice(idx,1);
    flashMsg('"'+armaMontada.nome+'" equipada — adicionada aos seus ataques.');
  } else if(row.tipo==='armadura'){
    const a = ARMADURAS.find(x=>x.n===row.ref);
    if(!a){ flashMsg('Não encontrei os dados dessa armadura no catálogo.'); return; }
    if(f.armadura){ f.equip.push({tipo:'armadura', ref:f.armadura.refBase||f.armadura.nome, item:f.armadura.nome, qtd:'1', carga:String(f.armadura.esp), superior:f.armadura.superior, bonusDefExtra:f.armadura.bonusDefExtra, bonusPenExtra:f.armadura.bonusPenExtra, melhoriasTxt:f.armadura.melhoriasTxt}); }
    const bonusDef = row.superior ? (row.bonusDefExtra||0) : 0;
    const bonusPen = row.superior ? (row.bonusPenExtra||0) : 0;
    f.armadura = {nome: row.superior?row.item:a.n, refBase:a.n, def:a.def+bonusDef, pen:a.pen+bonusPen, cat:a.cat, esp:a.esp, equipado:true,
      superior:!!row.superior, bonusDefExtra:row.bonusDefExtra||0, bonusPenExtra:row.bonusPenExtra||0, melhoriasTxt:row.melhoriasTxt||null};
    f.equip.splice(idx,1);
    flashMsg('"'+f.armadura.nome+'" equipada — sua Defesa foi atualizada.');
  } else if(row.tipo==='escudo'){
    const a = ESCUDOS.find(x=>x.n===row.ref);
    if(!a){ flashMsg('Não encontrei os dados desse escudo no catálogo.'); return; }
    if(f.escudo){ f.equip.push({tipo:'escudo', ref:f.escudo.refBase||f.escudo.nome, item:f.escudo.nome, qtd:'1', carga:String(f.escudo.esp), superior:f.escudo.superior, bonusDefExtra:f.escudo.bonusDefExtra, bonusPenExtra:f.escudo.bonusPenExtra, melhoriasTxt:f.escudo.melhoriasTxt}); f.escudo=null; }
    liberarMaos(f, 1);
    const bonusDefEsc = row.superior ? (row.bonusDefExtra||0) : 0;
    const bonusPenEsc = row.superior ? (row.bonusPenExtra||0) : 0;
    f.escudo = {nome: row.superior?row.item:a.n, refBase:a.n, def:a.def+bonusDefEsc, pen:a.pen+bonusPenEsc, cat:a.cat, esp:a.esp, equipado:true,
      superior:!!row.superior, bonusDefExtra:row.bonusDefExtra||0, bonusPenExtra:row.bonusPenExtra||0, melhoriasTxt:row.melhoriasTxt||null};
    f.equip.splice(idx,1);
    flashMsg('"'+f.escudo.nome+'" equipado — sua Defesa foi atualizada.');
  }
  salvarPerfis();
  render();
}

// Move a arma/armadura/escudo equipado de volta para a mochila.
function guardarArmaNaMochila(idx){
  const f = fichaAtual();
  const arma = f.armas[idx];
  if(!arma) return;
  f.armas.splice(idx,1);
  f.equip.push({tipo:'arma', ref:arma.refBase||arma.nome, item:arma.nome, qtd:'1', carga:String(arma.esp||1), superior:arma.superior, bonusTesteExtra:arma.bonusTesteExtra, bonusDanoExtra:arma.bonusDanoExtra, melhoriasTxt:arma.melhoriasTxt});
  salvarPerfis();
  flashMsg('"'+arma.nome+'" guardada na mochila.');
  render();
}
function guardarArmaduraNaMochila(){
  const f = fichaAtual();
  if(!f.armadura) return;
  f.equip.push({tipo:'armadura', ref:f.armadura.refBase||f.armadura.nome, item:f.armadura.nome, qtd:'1', carga:String(f.armadura.esp), superior:f.armadura.superior, bonusDefExtra:f.armadura.bonusDefExtra, bonusPenExtra:f.armadura.bonusPenExtra, melhoriasTxt:f.armadura.melhoriasTxt});
  const nome = f.armadura.nome;
  f.armadura = null;
  salvarPerfis();
  flashMsg('"'+nome+'" guardada na mochila.');
  render();
}
function guardarEscudoNaMochila(){
  const f = fichaAtual();
  if(!f.escudo) return;
  f.equip.push({tipo:'escudo', ref:f.escudo.refBase||f.escudo.nome, item:f.escudo.nome, qtd:'1', carga:String(f.escudo.esp), superior:f.escudo.superior, bonusDefExtra:f.escudo.bonusDefExtra, bonusPenExtra:f.escudo.bonusPenExtra, melhoriasTxt:f.escudo.melhoriasTxt});
  const nome = f.escudo.nome;
  f.escudo = null;
  salvarPerfis();
  flashMsg('"'+nome+'" guardado na mochila.');
  render();
}
function addMagiaFicha(s, tradEscolhida){
  const f = fichaAtual();
  if(f.magias.some(m=>m.n===s.n)){
    flashMsg('"'+s.n+'" já está na sua ficha.');
    return;
  }
  f.magias.push({...s, tradEscolhida});
  salvarPerfis();
  flashMsg('"'+s.n+'" adicionada às suas magias (aba Ficha).');
}

async function saveFicha(){
  await salvarPerfis();
  flashSaved();
}

function flashSaved(){
  const elMsg = document.getElementById('save-msg');
  if(elMsg){ elMsg.textContent = 'Salvo ✓'; setTimeout(()=>{ if(elMsg) elMsg.textContent=''; }, 1800); }
  flashMsg('✅ Ficha salva!');
}

// ============ RENDER ============

function bindInput(obj, key, type){
  const i = el('input',{type: type||'text', value: obj[key] ?? '', oninput: (e)=>{ obj[key] = e.target.value; }});
  return i;
}

function renderCampoDivindade(f){
  const wrap = el('div',{});
  const fluxo = state._divindadeFluxo;

  if(f.divindade){
    wrap.appendChild(el('div',{},
      el('label',{},'Divindade'),
      el('div',{class:'valor-fixo'}, f.divindade),
      f.poderConcedido ? el('div',{class:'meta', style:'color:var(--gold);'}, 'Poder concedido: '+f.poderConcedido.nome) : null,
      el('button',{class:'btn ghost', style:'font-size:0.7rem;padding:5px 8px;margin-top:4px;', onclick:()=>{ state._divindadeFluxo={passo:'escolher'}; render(); }}, 'Trocar divindade')
    ));
  } else {
    wrap.appendChild(el('div',{},
      el('label',{},'Divindade'),
      el('div',{class:'row', style:'align-items:center;gap:8px;'},
        el('div',{class:'valor-fixo', style:'margin-bottom:0;flex:1;color:var(--ink-soft);'}, 'Sem fé'),
        el('button',{class:'btn ghost', style:'width:auto;flex-shrink:0;font-size:0.72rem;padding:8px 14px;', onclick:()=>{ state._divindadeFluxo={passo:'escolher'}; render(); }}, 'Escolher')
      )
    ));
  }

  if(fluxo){
    // O pop-up é renderizado no nível mais alto da tela (renderFichaScreen), não aqui —
    // painéis com transform (hover/foco) criam um novo contexto de posicionamento e
    // "prendem" um position:fixed aninhado dentro deles, escondendo o pop-up atrás de outros painéis.
  }
  return wrap;
}

// Pop-up (modal) com o fluxo de escolher divindade — lista em modo acordeão (toque expande
// um resumo, toque de novo confirma e avança pra tela seguinte).
function renderPopupDivindade(f, fluxo){
  const overlay = el('div',{class:'menu-overlay', onclick:(e)=>{ if(e.target===e.currentTarget){ state._divindadeFluxo=null; render(); } }});
  const sheet = el('div',{class:'menu-sheet'});

  if(fluxo.passo==='escolher'){
    const classesDevotasAuto = ['Clérigo','Druida','Paladino'];
    const ehClerigo = (f.classesNiveis||[]).some(c=>c.classe==='Clérigo');
    const ehDevotoAuto = (f.classesNiveis||[]).some(c=>classesDevotasAuto.includes(c.classe));
    sheet.appendChild(el('div',{class:'wizard-title', style:'padding:6px 14px 0;'},'Escolha uma divindade'));
    DEUSES.forEach(d=>{
      const aberto = state._divindadeExpandida === d.nome;
      const item = el('button',{class:'menu-item'+(aberto?' active':''), onclick:()=>{
        if(aberto){ state._divindadeFluxo={passo:'confirmar', deus:d.nome}; state._divindadeExpandida=null; }
        else { state._divindadeExpandida = d.nome; }
        render();
      }},
        el('span',{class:'ico'},'⚜'), el('span',{}, d.nome)
      );
      sheet.appendChild(item);
      if(aberto){
        sheet.appendChild(el('div',{class:'tip', style:'margin:0 14px 8px;'},
          el('div',{}, el('b',{},'Energia: '), d.energia, ' · ', el('b',{},'Arma preferida: '), d.arma),
          el('div',{}, el('b',{},'Devotos típicos: '), d.devotos)
        ));
      }
    });
    if(ehClerigo){
      const abertoP = state._divindadeExpandida === 'Panteão';
      const itemP = el('button',{class:'menu-item'+(abertoP?' active':''), onclick:()=>{
        if(abertoP){ state._divindadeFluxo={passo:'panteao'}; state._divindadeExpandida=null; }
        else { state._divindadeExpandida = 'Panteão'; }
        render();
      }}, el('span',{class:'ico'},'⚜'), el('span',{}, 'Cultuar o Panteão'));
      sheet.appendChild(itemP);
      if(abertoP){
        sheet.appendChild(el('div',{class:'tip', style:'margin:0 14px 8px;'}, 'Devoção sem deus específico. Sem Poder Concedido. Só não pode usar armas cortantes ou perfurantes. Arma preferida: maça. Escolhe canalizar energia positiva ou negativa, pra sempre.'));
      }
    }
    if(f.divindade && !ehDevotoAuto){
      sheet.appendChild(el('button',{class:'menu-item', style:'color:var(--red-bright);', onclick:()=>{
        if(!confirm('Abandonar a fé em '+f.divindade+' e ficar sem devoção a nenhuma divindade?')) return;
        f.divindade = null;
        f.poderConcedido = null;
        f.panteaoEnergia = null;
        state._divindadeFluxo = null;
        salvarPerfis();
        render();
      }}, el('span',{class:'ico'},'✕'), el('span',{}, 'Virar sem fé (abandonar devoção)')));
    }
    sheet.appendChild(el('button',{class:'menu-close', onclick:()=>{ state._divindadeFluxo=null; state._divindadeExpandida=null; render(); }}, 'Cancelar'));
  } else if(fluxo.passo==='panteao'){
    sheet.appendChild(el('div',{class:'wizard-title', style:'padding:6px 14px 0;'},'Cultuar o Panteão'));
    sheet.appendChild(el('div',{class:'tip', style:'margin:8px 14px;'}, 'Sem Poder Concedido. Não pode usar armas cortantes ou perfurantes. Arma preferida: maça.'));
    sheet.appendChild(el('div',{class:'tip', style:'margin:8px 14px;'}, 'Escolha a energia que canaliza — não pode ser mudada depois.'));
    sheet.appendChild(el('div',{class:'row', style:'margin:8px 14px;'},
      el('button',{class:'btn', onclick:()=>{
        f.divindade = 'Panteão'; f.poderConcedido = null; f.panteaoEnergia = 'positiva';
        state._divindadeFluxo = null; salvarPerfis(); flashMsg('✅ Agora você cultua o Panteão (energia positiva).'); render();
      }}, 'Energia Positiva'),
      el('button',{class:'btn', onclick:()=>{
        f.divindade = 'Panteão'; f.poderConcedido = null; f.panteaoEnergia = 'negativa';
        state._divindadeFluxo = null; salvarPerfis(); flashMsg('✅ Agora você cultua o Panteão (energia negativa).'); render();
      }}, 'Energia Negativa')
    ));
    sheet.appendChild(el('button',{class:'menu-close', onclick:()=>{ state._divindadeFluxo={passo:'escolher'}; render(); }}, 'Voltar'));
  } else if(fluxo.passo==='confirmar'){
    const deus = DEUSES.find(d=>d.nome===fluxo.deus);
    sheet.appendChild(el('div',{class:'wizard-title', style:'padding:6px 14px 0;'},'Confirmar: ter fé em '+deus.nome+'?'));
    sheet.appendChild(el('div',{class:'tip', style:'margin:8px 14px;'}, el('b',{},'Devotos típicos'), deus.devotos));
    sheet.appendChild(el('div',{class:'tip', style:'margin:8px 14px;'}, el('b',{},'Obrigações & Restrições'), deus.obrigacoes));
    sheet.appendChild(el('div',{class:'tip', style:'margin:8px 14px;color:var(--red-bright);'}, el('b',{},'Atenção'), 'Se violar as obrigações, perde todos os PM até o próximo dia (ou até fazer penitência, na segunda vez na mesma aventura).'));
    sheet.appendChild(el('div',{class:'row', style:'margin:8px 14px;'},
      el('button',{class:'btn', onclick:()=>{ state._divindadeFluxo={passo:'poder', deus:deus.nome}; render(); }}, 'Sim, tenho fé'),
      el('button',{class:'btn ghost', onclick:()=>{ state._divindadeFluxo={passo:'escolher'}; render(); }}, 'Não, escolher outra')
    ));
  } else if(fluxo.passo==='poder'){
    const deus = DEUSES.find(d=>d.nome===fluxo.deus);
    sheet.appendChild(el('div',{class:'wizard-title', style:'padding:6px 14px 0;'},'Poder concedido de '+deus.nome));
    deus.poderes.forEach(nomePoder=>{
      const info = PODERES_CONCEDIDOS.find(p=>p.nome===nomePoder);
      const aberto = state._poderExpandido === nomePoder;
      const item = el('button',{class:'menu-item'+(aberto?' active':''), onclick:()=>{
        if(aberto){
          const escolhaInfo = PODER_CONCEDIDO_TREINA_PERICIA_ESCOLHA[nomePoder];
          if(escolhaInfo){
            state._divindadeFluxo = {passo:'escolhaPericia', deus:deus.nome, poder:nomePoder};
            state._divindadeEscolhaSub = [];
          } else {
            f.divindade = deus.nome;
            f.poderConcedido = {nome: nomePoder, deus: deus.nome};
            state._divindadeFluxo = null;
            salvarPerfis();
          }
          state._poderExpandido = null;
        } else {
          state._poderExpandido = nomePoder;
        }
        render();
      }},
        el('span',{class:'ico'},'✦'), el('span',{}, nomePoder)
      );
      sheet.appendChild(item);
      if(aberto) sheet.appendChild(el('div',{class:'tip', style:'margin:0 14px 8px;'}, info?info.desc:''));
    });
    sheet.appendChild(el('div',{class:'tip', style:'margin:8px 14px;font-size:0.75rem;'}, 'Toque pra ver a descrição, toque de novo pra confirmar.'));
    sheet.appendChild(el('button',{class:'menu-close', onclick:()=>{ state._divindadeFluxo=null; state._poderExpandido=null; render(); }}, 'Cancelar'));
  } else if(fluxo.passo==='escolhaPericia'){
    const deus = DEUSES.find(d=>d.nome===fluxo.deus);
    const escolhaInfo = PODER_CONCEDIDO_TREINA_PERICIA_ESCOLHA[fluxo.poder];
    sheet.appendChild(el('div',{class:'wizard-title', style:'padding:6px 14px 0;'}, escolhaInfo.label));
    if(!state._divindadeEscolhaSub) state._divindadeEscolhaSub = [];
    const subGrid = el('div',{class:'option-grid', style:'margin:8px 14px;'});
    PERICIAS.filter(p=> p.attr===escolhaInfo.filtroAttr).forEach(p=>{
      const marcado = state._divindadeEscolhaSub.includes(p.nome);
      subGrid.appendChild(el('button',{class:'option-card '+(marcado?'selected':''), onclick:()=>{
        if(marcado){ state._divindadeEscolhaSub = state._divindadeEscolhaSub.filter(x=>x!==p.nome); }
        else if(state._divindadeEscolhaSub.length < escolhaInfo.quantidade){ state._divindadeEscolhaSub = [...state._divindadeEscolhaSub, p.nome]; }
        render();
      }}, el('div',{class:'opt-nome'}, p.nome)));
    });
    sheet.appendChild(subGrid);
    sheet.appendChild(el('div',{class:'tip', style:'margin:0 14px 8px;font-size:0.75rem;'}, state._divindadeEscolhaSub.length+' / '+escolhaInfo.quantidade+' escolhidas'));
    const completo = state._divindadeEscolhaSub.length === escolhaInfo.quantidade;
    sheet.appendChild(el('button',{class:'btn', style: 'margin:0 14px 8px; ' + (completo?'':'opacity:0.5;'), onclick:()=>{
      if(!completo) return;
      f.divindade = deus.nome;
      f.poderConcedido = {nome: fluxo.poder, deus: deus.nome, sub: state._divindadeEscolhaSub.slice()};
      state._divindadeFluxo = null;
      state._poderExpandido = null;
      state._divindadeEscolhaSub = null;
      salvarPerfis();
      render();
    }}, 'Confirmar'));
    sheet.appendChild(el('button',{class:'menu-close', onclick:()=>{ state._divindadeFluxo=null; state._poderExpandido=null; state._divindadeEscolhaSub=null; render(); }}, 'Cancelar'));
  }
  overlay.appendChild(sheet);
  return overlay;
}

function renderPersonagemFicha(){
  const f = fichaAtual();
  const wrap = el('div',{});

  wrap.appendChild(el('div',{class:'panel faixa'},
    el('h2',{},'Personagem'),
    el('div',{class:'foto-row'},
      el('label',{class:'foto-upload'},
        f.foto ? el('img',{src:f.foto}) : el('span',{class:'foto-placeholder'},'📷'),
        el('input',{type:'file', accept:'image/*', style:'display:none;', onchange:(e)=>{ if(e.target.files[0]) handleFotoUpload(f, e.target.files[0]); }})
      ),
      el('div',{class:'meta'}, f.foto ? 'Toque na foto pra trocar' : 'Toque pra adicionar uma foto')
    ),
    el('div',{class:'row'},
      el('div',{style:'flex:1;'}, el('label',{},'Jogador'), bindInput(f,'jogador')),
    ),
    el('div',{class:'row'},
      el('div',{}, el('label',{},'Raça'), el('div',{class:'valor-fixo'}, f.raca||'—')),
      el('div',{}, el('label',{},'Origem'), el('div',{class:'valor-fixo'}, f.origem||'—')),
    ),
    el('div',{class:'row'},
      el('div',{}, el('label',{},'Tamanho'), bindInput(f,'tamanho')),
      el('div',{}, el('label',{},'Alinhamento'), bindInput(f,'alinhamento')),
      el('div',{}, el('label',{},'Idade'), bindInput(f,'idade')),
    ),
    bonusFurtividadeTamanho(f) ? el('div',{class:'tip', style:'font-size:0.75rem;'}, el('b',{},'Tamanho '+f.tamanho), (bonusFurtividadeTamanho(f)>0?'+':'')+bonusFurtividadeTamanho(f)+' em Furtividade (já somado). Criaturas '+f.tamanho.toLowerCase()+'s também têm modificador de manobras de combate, não calculado automaticamente — combine com o mestre.') : null,
    el('div',{class:'row'},
      el('div',{},
        el('label',{},'Classe(s)'),
        el('div',{class:'valor-fixo'}, classeDisplay(f))
      ),
      el('div',{},
        el('label',{},'Nível total'),
        el('div',{class:'row', style:'align-items:center;gap:8px;'},
          el('div',{style:'font-weight:800;font-size:1.3rem;padding:6px 0;'}, nivelTotal(f)),
          el('button',{class:'btn', style:'width:auto;padding:8px 14px;', onclick:()=>{ abrirLevelUp(); }},'Level Up ⬆')
        )
      ),
    ),
    el('div',{class:'row'},
      el('div',{},
        el('label',{},'Deslocamento'),
        el('div',{class:'valor-fixo'}, deslocamentoEfetivo(f)+'m'+(deslocamentoEfetivo(f)!==(parseInt(f.deslocamento)||9) ? ' (base '+(parseInt(f.deslocamento)||9)+'m)' : '')),
      ),
      renderCampoDivindade(f),
    )
  ));

  if(state.levelUp && state.levelUp.aberto){
    // O Level Up agora é um pop-up renderizado no nível mais alto da tela (renderFichaScreen),
    // pelo mesmo motivo do popup de divindade: painéis com transform "prendem" um position:fixed
    // aninhado dentro deles, escondendo o popup atrás de outros painéis.
  }

  wrap.appendChild(el('div',{class:'panel faixa'},
    el('h2',{},'Atributos'),
    el('div',{class:'row6'},
      ...['for','des','con','int','sab','car'].map(a=>
        el('div',{class:'attr-box'}, el('div',{class:'lbl'}, a.toUpperCase()), bindInput(f,a,'number'))
      )
    )
  ));

  const pvMax = parseInt(f.pvmax)||0, pvAtual = parseInt(f.pvatual)||0;
  const pmMax = parseInt(f.pmmax)||0, pmAtual = parseInt(f.pmatual)||0;
  wrap.appendChild(el('div',{class:'panel faixa'},
    el('h2',{},'Vida & Mana'),
    el('div',{class:'stat-tracker-row'},
      criarStatTracker('pv', 'Vida', pvAtual, pvMax, (delta)=>ajustarPV(f, delta)),
      criarStatTracker('pm', 'Mana', pmAtual, pmMax, (delta)=>ajustarPM(f, delta)),
    ),
    el('div',{class:'stat-tracker-row'},
      criarStatTrackerSemMax('pv', 'Vida temporária', parseInt(f.pvtemp)||0, (delta)=>ajustarPVTemp(f, delta)),
      criarStatTrackerSemMax('pm', 'Mana temporária', parseInt(f.pmtemp)||0, (delta)=>ajustarPMTemp(f, delta)),
    ),
  ));

  wrap.appendChild(el('div',{class:'panel faixa'},
    el('h2',{}, 'Defesa'),
    el('div',{class:'defesa-shield'},
      el('div',{class:'defesa-circle'}, defesaTotal(f)),
      el('div',{class:'defesa-breakdown'},
        el('div',{}, el('span',{},'Base'), el('b',{},'10')),
        el('div',{}, el('span',{},'Destreza'), el('b',{}, usaArmaduraPesada(f) ? '+0*' : (((parseInt(f.des)||0)>=0?'+':'')+(parseInt(f.des)||0)))),
        el('div',{}, el('span',{},'Armadura'), el('b',{}, '+'+(f.armadura?f.armadura.def:0))),
        el('div',{}, el('span',{},'Escudo'), el('b',{}, '+'+(f.escudo?(f.escudo.def+bonusEscudoPoderes(f)):0))),
        el('div',{}, el('span',{},'Poderes'), el('b',{}, '+'+bonusDefesaPoderes(f))),
        el('div',{}, el('span',{},'Raça'), el('b',{}, (bonusDefesaRaca(f)>=0?'+':'')+bonusDefesaRaca(f))),
        el('div',{}, el('span',{},'Outros'), el('input',{type:'number', value:f.defOutros||0, style:'width:44px;margin:0;padding:2px 4px;font-size:0.78rem;text-align:right;font-weight:700;color:var(--red-deep);border:none;background:transparent;', oninput:(e)=>{f.defOutros=e.target.value;}, onchange:()=>{salvarPerfis(); render();}})),
      )
    ),
    usaArmaduraPesada(f) ? el('div',{class:'tip', style:'font-size:0.75rem;margin-top:10px;'}, el('b',{},'* Armadura pesada'), 'Você não aplica Destreza na Defesa'+(getRacaObj(f)&&getRacaObj(f).deslocamentoImune?'':' e seu deslocamento é reduzido em 3m')+' (regras do livro básico, pág. 157). O poder Encouraçado dá +2 na Defesa mesmo assim, mas não devolve a Destreza.') : null,
    penalidadeArmaduraRaca(f) ? el('div',{class:'tip', style:'margin-top:10px;'}, el('b',{},'Penalidade racial fixa'), penalidadeArmaduraRaca(f)+' de penalidade de armadura sempre presente (corpo rígido de '+f.raca+'), somada a qualquer armadura equipada.') : null,
    penalidadeTotal(f) ? el('div',{class:'tip', style:'margin-top:10px;'}, el('b',{},'Penalidade de armadura total'), penalidadeTotal(f)+' em Acrobacia, Furtividade, Ladinagem e natação') : null,
    el('div',{class:'row', style:'margin-top:10px;'},
      el('div',{},
        el('label',{},'Armadura equipada'),
        el('div',{style:'padding:8px 0;font-weight:600;'}, f.armadura?f.armadura.nome+' (+'+f.armadura.def+')':'nenhuma — adicione na aba Itens'),
        f.armadura && f.armadura.superior && f.armadura.melhoriasTxt ? el('div',{class:'meta', style:'color:var(--gold);'}, '⭐ '+f.armadura.melhoriasTxt) : null,
        f.armadura ? el('button',{class:'btn ghost', style:'font-size:0.7rem;padding:5px 8px;', onclick:guardarArmaduraNaMochila},'Guardar na mochila') : null
      ),
      el('div',{},
        el('label',{},'Escudo equipado'),
        el('div',{style:'padding:8px 0;font-weight:600;'}, f.escudo?f.escudo.nome+' (+'+f.escudo.def+')':'nenhum — adicione na aba Itens'),
        f.escudo && f.escudo.superior && f.escudo.melhoriasTxt ? el('div',{class:'meta', style:'color:var(--gold);'}, '⭐ '+f.escudo.melhoriasTxt) : null,
        f.escudo ? el('button',{class:'btn ghost', style:'font-size:0.7rem;padding:5px 8px;', onclick:guardarEscudoNaMochila},'Guardar na mochila') : null
      ),
    )
  ));

  wrap.appendChild(renderPainelCondicoes(f));
  wrap.appendChild(renderItensEquipados());
  wrap.appendChild(renderPainelVestidos(f));

  return wrap;
}

// Painel de condições ativas — toque pra ligar/desligar. Mostra só o nome nas escolhidas de
// cara; toda a lista só aparece quando o jogador toca em "Gerenciar condições".
function renderPainelCondicoes(f){
  const ativas = condicoesAtivas(f);
  const wrap = el('div',{class:'panel faixa'}, el('h2',{},'Condições Ativas'));
  if(!state._gerenciandoCondicoes){
    if(ativas.length===0){
      wrap.appendChild(el('div',{class:'empty'},'Nenhuma condição ativa agora.'));
    } else {
      const row = el('div',{class:'option-grid'});
      ativas.forEach(nome=>{
        const info = CONDICOES_LISTA.find(c=>c[0]===nome);
        const temEfeito = !!CONDICOES_EFEITOS[nome];
        row.appendChild(el('button',{class:'option-card selected', onclick:()=>alternarCondicao(f,nome)},
          el('div',{class:'opt-nome'}, nome+' ✕'),
          info ? el('div',{class:'opt-sub'}, info[1]) : null,
          temEfeito ? el('div',{class:'opt-sub', style:'color:var(--gold);'}, '⚡ já aplicado nos cálculos') : null
        ));
      });
      wrap.appendChild(row);
    }
    wrap.appendChild(el('button',{class:'btn ghost', style:'margin-top:10px;', onclick:()=>{ state._gerenciandoCondicoes=true; render(); }}, 'Gerenciar condições'));
    if(f.condicoesNota){
      wrap.appendChild(el('div',{class:'meta', style:'margin-top:8px;color:var(--gold);'}, '📝 '+f.condicoesNota));
    }
  } else {
    wrap.appendChild(el('div',{class:'tip', style:'font-size:0.78rem;'}, 'Condições com ⚡ já entram sozinhas no cálculo de Defesa/perícias/deslocamento. As outras são mais sobre o que dá ou não dá pra fazer no turno — combine com o Mestre na hora.'));
    const row = el('div',{class:'option-grid'});
    CONDICOES_LISTA.forEach(([nome,desc])=>{
      const marcado = ativas.includes(nome);
      const temEfeito = !!CONDICOES_EFEITOS[nome];
      row.appendChild(el('button',{class:'option-card '+(marcado?'selected':''), onclick:()=>alternarCondicao(f,nome)},
        el('div',{class:'opt-nome'}, nome+(temEfeito?' ⚡':'')),
        el('div',{class:'opt-sub'}, desc)
      ));
    });
    wrap.appendChild(row);
    wrap.appendChild(el('label',{style:'margin-top:10px;'},'Nota livre (ex: "Veneno 2d6/turno", "Sangramento leve")'));
    wrap.appendChild(el('input',{id:'condicoes-nota', type:'text', value:f.condicoesNota||'', oninput:(e)=>{f.condicoesNota=e.target.value;}, onchange:()=>{salvarPerfis();}}));
    wrap.appendChild(el('button',{class:'btn ghost', style:'margin-top:10px;', onclick:()=>{ state._gerenciandoCondicoes=false; render(); }}, 'Fechar'));
  }
  return wrap;
}

function renderPersonagemNotas(){
  const f = fichaAtual();
  const wrap = el('div',{});

  const prof = proficienciasPersonagem(f);
  const racaObj = getRacaObj(f);
  const armasExtrasRaca = racaObj && racaObj.armasComoSimples ? racaObj.armasComoSimples : [];
  wrap.appendChild(el('div',{class:'panel'},
    el('h2',{},'Proficiências'),
    el('div',{class:'tip', style:'font-size:0.8rem;'},
      el('div',{}, el('b',{},'Sempre: '), 'armas simples, armaduras leves, ataques desarmados'),
      el('div',{}, el('b',{},'Armas marciais: '), prof.armasMarciais?'Sim ✓':'Não'),
      el('div',{}, el('b',{},'Armas de fogo: '), prof.armasFogo?'Sim ✓':'Não'),
      el('div',{}, el('b',{},'Armaduras pesadas: '), prof.armadurasPesadas?'Sim ✓':'Não'),
      el('div',{}, el('b',{},'Escudos: '), prof.escudos?'Sim ✓':'Não'),
      armasExtrasRaca.length ? el('div',{}, el('b',{},'Bônus racial: '), armasExtrasRaca.join(', ')+' contam como arma simples para você') : null,
    ),
    el('div',{class:'meta', style:'font-size:0.7rem;color:var(--ink-soft);margin-top:6px;'}, 'Usar arma sem proficiência: –5 no teste de ataque. Vestir armadura/escudo sem proficiência: a penalidade dele passa a valer em toda perícia de Força e Destreza (não só Acrobacia/Furtividade/Ladinagem).')
  ));

  const descansoPanel = el('div',{class:'panel'}, el('h2',{},'Descanso'));
  descansoPanel.appendChild(el('div',{class:'tip', style:'font-size:0.78rem;'}, 'Uma noite de sono (8h+) recupera PV e PM iguais ao seu nível ('+nivelTotal(f)+') vezes a qualidade do descanso, e reinicia poderes de uso "por cena" e "por dia" (pág. 106 do livro).'));
  const rowDescanso = el('div',{class:'option-grid', style:'margin-top:8px;'});
  Object.keys(QUALIDADE_DESCANSO).forEach(qualidade=>{
    rowDescanso.appendChild(el('button',{class:'option-card', onclick:()=>aplicarDescanso(f, qualidade)},
      el('div',{class:'opt-nome'}, qualidade),
      el('div',{class:'opt-sub'}, '+'+Math.floor(nivelTotal(f)*QUALIDADE_DESCANSO[qualidade])+' PV/PM')
    ));
  });
  descansoPanel.appendChild(rowDescanso);
  descansoPanel.appendChild(el('button',{class:'btn ghost', style:'margin-top:10px;', onclick:()=>novaCena(f)}, 'Nova Cena 🎬 (só reinicia poderes "por cena", sem recuperar PV/PM)'));
  wrap.appendChild(descansoPanel);

  const poderesPanel = el('div',{class:'panel'}, el('h2',{},'Poderes'));
  const entradasPoderes = [];
  if(f.poderGeral && f.poderGeral.nome){
    const pInfo = PODERES_GERAIS.find(p=>p.nome===f.poderGeral.nome);
    entradasPoderes.push({nome: f.poderGeral.nome + (f.poderGeral.sub? (' — '+f.poderGeral.sub):''), chaveBase:f.poderGeral.nome, fonte:'Origem: '+f.origem, desc: pInfo?pInfo.desc:''});
  }
  if(f.poderGeralExtra && f.poderGeralExtra.nome){
    const pInfo = PODERES_GERAIS.find(p=>p.nome===f.poderGeralExtra.nome);
    entradasPoderes.push({nome: f.poderGeralExtra.nome + (f.poderGeralExtra.sub? (' — '+f.poderGeralExtra.sub):''), chaveBase:f.poderGeralExtra.nome, fonte:'Origem: '+f.origem, desc: pInfo?pInfo.desc:''});
  }
  if(f.origemPoderCategoria && f.origemPoderCategoria.nome){
    if(f.origemPoderCategoria.sub){
      const pInfoCat = PODERES_GERAIS.find(p=>p.nome===f.origemPoderCategoria.sub);
      entradasPoderes.push({
        nome: f.origemPoderCategoria.sub + (f.origemPoderCategoria.subEscolha? (' — '+f.origemPoderCategoria.subEscolha):''),
        chaveBase: f.origemPoderCategoria.sub,
        fonte:'Origem: '+f.origem+' ('+f.origemPoderCategoria.nome+')',
        desc: pInfoCat?pInfoCat.desc:''
      });
    } else {
      entradasPoderes.push({nome: f.origemPoderCategoria.nome, chaveBase:f.origemPoderCategoria.nome, fonte:'Origem: '+f.origem, desc:'Combine com o mestre qual poder específico esse será e anote nas Notas.'});
    }
  }
  if(f.poderRaca && f.poderRaca.nome){
    const pInfo = PODERES_GERAIS.find(p=>p.nome===f.poderRaca.nome);
    entradasPoderes.push({nome: f.poderRaca.nome + (f.poderRaca.sub? (' — '+f.poderRaca.sub):''), chaveBase:f.poderRaca.nome, fonte:'Raça: '+f.raca, desc: pInfo?pInfo.desc:'Perícia/poder concedido pela raça.'});
  }
  if(f.origemPoder && f.origemPoder.nome){
    entradasPoderes.push({nome: f.origemPoder.nome, chaveBase:f.origemPoder.nome, fonte:'Origem: '+f.origem+' (único)', desc: f.origemPoder.desc||''});
  }
  if(f.poderConcedido && f.poderConcedido.nome){
    const pInfo = PODERES_CONCEDIDOS.find(p=>p.nome===f.poderConcedido.nome);
    entradasPoderes.push({nome: f.poderConcedido.nome, chaveBase:f.poderConcedido.nome, fonte:'Devoto de '+f.poderConcedido.deus, desc: pInfo?pInfo.desc:''});
  }
  (f.poderesClasse||[]).forEach(p=>{
    let desc = '';
    if(p.trocaPorGeral){
      const pInfo = PODERES_GERAIS.find(x=>x.nome===p.nome);
      desc = pInfo?pInfo.desc:'';
    } else {
      const listaCompletaP = PODERES_CLASSE_COMPLETO[p.classe] || [];
      const foundCompleto = listaCompletaP.find(x=>x.nome===p.nome);
      if(foundCompleto){
        desc = foundCompleto.desc;
      } else {
        const clsData = CLASSES[p.classe];
        const found = clsData ? clsData.poderes.find(([n])=>n===p.nome) : null;
        desc = found ? found[1] : '';
      }
    }
    entradasPoderes.push({nome: p.nome + (p.sub?(' — '+p.sub):''), chaveBase:p.nome, fonte:'Nível '+p.nivel+' de '+p.classe+(p.trocaPorGeral?' (trocado)':''), desc});
  });
  if(entradasPoderes.length===0){
    poderesPanel.appendChild(el('div',{class:'empty'},'Nenhum poder registrado ainda.'));
  } else {
    entradasPoderes.forEach((entrada, idx)=>{
      const limite = tipoLimiteUso(entrada.desc);
      const usado = limite ? poderFoiUsado(f, entrada.chaveBase) : false;
      poderesPanel.appendChild(renderItemColapsavel('poder-'+idx+'-'+entrada.nome, entrada.nome+(usado?' (usado)':''), entrada.fonte, [
        el('div',{class:'desc'}, entrada.desc),
        limite ? el('button',{class:'btn ghost', style:'margin-top:8px;'+(usado?'opacity:0.6;':''), onclick:(e)=>{ e.stopPropagation(); alternarUsoPoder(f, entrada.chaveBase); }}, usado ? '↺ Marcar como disponível de novo' : '✓ Marcar como usado ('+limite+')') : null
      ]));
    });
  }
  wrap.appendChild(poderesPanel);

  const habPanel = el('div',{class:'panel faixa'}, el('h2',{},'Habilidades Iniciais'));
  habPanel.appendChild(el('div',{class:'tip', style:'font-size:0.8rem;'}, 'Habilidades de raça, itens de origem e outras concessões iniciais — não precisam ser anotadas manualmente.'));
  if(!f.habilidadesIniciais || f.habilidadesIniciais.length===0){
    habPanel.appendChild(el('div',{class:'empty'},'Nada registrado ainda.'));
  } else {
    f.habilidadesIniciais.forEach((h, idx)=>{
      habPanel.appendChild(renderItemColapsavel('habinicial-'+idx+'-'+h.nome, h.nome, h.fonte, [
        el('div',{class:'desc'}, h.desc)
      ]));
    });
  }
  wrap.appendChild(habPanel);

  if(f.arcanistaCaminho && ARCANISTA_CAMINHOS[f.arcanistaCaminho]){
    const info = ARCANISTA_CAMINHOS[f.arcanistaCaminho];
    const caminhoPanel = el('div',{class:'panel faixa'}, el('h2',{},'Caminho do Arcanista: '+f.arcanistaCaminho));
    caminhoPanel.appendChild(el('div',{class:'tip'}, info.descricao));
    if(info.focoTexto){
      caminhoPanel.appendChild(el('div',{class:'tip'}, el('b',{}, info.focoNome), info.focoTexto));
    }
    if(f.arcanistaLinhagem){
      const l = LINHAGENS_FEITICEIRO.find(x=>x.nome===f.arcanistaLinhagem);
      if(l){
        caminhoPanel.appendChild(el('div',{class:'tip'}, el('b',{}, l.nome+' — Básica (já ativa)'), l.basica));
        caminhoPanel.appendChild(el('div',{class:'tip', style:'opacity:0.8;'}, el('b',{},'Aprimorada (se escolher como poder de Arcanista)'), l.aprimorada));
        caminhoPanel.appendChild(el('div',{class:'tip', style:'opacity:0.8;'}, el('b',{},'Superior (se escolher como poder de Arcanista)'), l.superior));
      }
    }
    wrap.appendChild(caminhoPanel);
  }

  wrap.appendChild(renderPainelMissoes(f));
  wrap.appendChild(renderPainelFaccoes(f));
  wrap.appendChild(renderPainelLocais(f));

  wrap.appendChild(el('div',{class:'panel'},
    el('h2',{},'Anotações'),
    textareaAutoResize({oninput:(e)=>f.notas=e.target.value, placeholder:'poderes escolhidos, tesouro, combinações com o Mestre, etc.'}, f.notas)
  ));

  return wrap;
}

// ---- Missões: checklist simples de objetivos ativos/concluídos ----
function renderPainelMissoes(f){
  if(!f.missoes) f.missoes = [];
  const wrap = el('div',{class:'panel'}, el('h2',{},'Missões'));
  if(f.missoes.length===0){
    wrap.appendChild(el('div',{class:'empty'},'Nenhuma missão anotada ainda.'));
  } else {
    f.missoes.forEach((m,idx)=>{
      wrap.appendChild(el('div',{class:'row', style:'align-items:center;margin-top:4px;'},
        el('button',{class:'btn ghost', style:'width:auto;padding:4px 10px;flex-shrink:0;', onclick:()=>{ m.concluida=!m.concluida; salvarPerfis(); render(); }}, m.concluida?'✓':'○'),
        el('div',{style:'flex:1;'+(m.concluida?'text-decoration:line-through;color:var(--ink-soft);':'')}, m.texto),
        el('button',{class:'remove-x', onclick:()=>{ f.missoes.splice(idx,1); salvarPerfis(); render(); }},'✕')
      ));
    });
  }
  if(!state._novaMissaoTexto) state._novaMissaoTexto = '';
  wrap.appendChild(el('input',{id:'nova-missao', type:'text', placeholder:'nova missão ou objetivo...', style:'margin-top:8px;', value:state._novaMissaoTexto, oninput:(e)=>{state._novaMissaoTexto=e.target.value;}}));
  wrap.appendChild(el('button',{class:'btn ghost', onclick:()=>{
    if(!state._novaMissaoTexto.trim()) return;
    f.missoes.push({texto:state._novaMissaoTexto.trim(), concluida:false});
    state._novaMissaoTexto = '';
    salvarPerfis(); render();
  }}, 'Adicionar missão +'));
  return wrap;
}

// ---- Facções: reputação simples (amigo/neutro/inimigo) com grupos importantes ----
const CICLO_STATUS_FACCAO = ['neutro','amigo','inimigo'];
const ICONE_STATUS_FACCAO = {neutro:'😐 Neutro', amigo:'🤝 Amigo', inimigo:'⚔️ Inimigo'};
function renderPainelFaccoes(f){
  if(!f.faccoes) f.faccoes = [];
  const wrap = el('div',{class:'panel'}, el('h2',{},'Facções'));
  if(f.faccoes.length===0){
    wrap.appendChild(el('div',{class:'empty'},'Nenhuma facção anotada ainda.'));
  } else {
    f.faccoes.forEach((fac,idx)=>{
      wrap.appendChild(el('div',{class:'row', style:'align-items:center;margin-top:4px;'},
        el('div',{style:'flex:1;'}, el('b',{},fac.nome)),
        el('button',{class:'btn ghost', style:'width:auto;padding:4px 10px;flex-shrink:0;', onclick:()=>{
          const idxCiclo = CICLO_STATUS_FACCAO.indexOf(fac.status);
          fac.status = CICLO_STATUS_FACCAO[(idxCiclo+1)%CICLO_STATUS_FACCAO.length];
          salvarPerfis(); render();
        }}, ICONE_STATUS_FACCAO[fac.status]||ICONE_STATUS_FACCAO.neutro),
        el('button',{class:'remove-x', onclick:()=>{ f.faccoes.splice(idx,1); salvarPerfis(); render(); }},'✕')
      ));
    });
  }
  if(!state._novaFaccaoNome) state._novaFaccaoNome = '';
  wrap.appendChild(el('input',{id:'nova-faccao', type:'text', placeholder:'nome da facção/grupo...', style:'margin-top:8px;', value:state._novaFaccaoNome, oninput:(e)=>{state._novaFaccaoNome=e.target.value;}}));
  wrap.appendChild(el('button',{class:'btn ghost', onclick:()=>{
    if(!state._novaFaccaoNome.trim()) return;
    f.faccoes.push({nome:state._novaFaccaoNome.trim(), status:'neutro'});
    state._novaFaccaoNome = '';
    salvarPerfis(); render();
  }}, 'Adicionar facção +'));
  return wrap;
}

// ---- Locais: diário de exploração simples (onde estivemos + uma nota) ----
function renderPainelLocais(f){
  if(!f.locais) f.locais = [];
  const wrap = el('div',{class:'panel'}, el('h2',{},'Locais'));
  if(f.locais.length===0){
    wrap.appendChild(el('div',{class:'empty'},'Nenhum local anotado ainda.'));
  } else {
    f.locais.forEach((loc,idx)=>{
      wrap.appendChild(el('div',{class:'row', style:'align-items:flex-start;margin-top:6px;'},
        el('div',{style:'flex:1;'},
          el('div',{style:'font-weight:700;'}, loc.nome),
          el('input',{id:'local-nota-'+idx, type:'text', placeholder:'nota (opcional)', value:loc.nota||'', style:'margin-top:4px;', oninput:(e)=>{loc.nota=e.target.value;}, onchange:()=>salvarPerfis()})
        ),
        el('button',{class:'remove-x', onclick:()=>{ f.locais.splice(idx,1); salvarPerfis(); render(); }},'✕')
      ));
    });
  }
  if(!state._novoLocalNome) state._novoLocalNome = '';
  wrap.appendChild(el('input',{id:'novo-local', type:'text', placeholder:'nome do lugar...', style:'margin-top:8px;', value:state._novoLocalNome, oninput:(e)=>{state._novoLocalNome=e.target.value;}}));
  wrap.appendChild(el('button',{class:'btn ghost', onclick:()=>{
    if(!state._novoLocalNome.trim()) return;
    f.locais.push({nome:state._novoLocalNome.trim(), nota:''});
    state._novoLocalNome = '';
    salvarPerfis(); render();
  }}, 'Adicionar local +'));
  return wrap;
}

function renderItensEquipados(){
  const f = fichaAtual();
  const wrap = el('div',{class:'panel faixa'}, el('h2',{},'Itens Equipados'));
  const temAlgo = (f.armas.length>0) || ((f.esotericos||[]).length>0);

  if(!temAlgo){
    wrap.appendChild(el('div',{class:'empty'},'Nada equipado ainda. Vá na aba Itens para buscar e equipar armas ou esotéricos.'));
    return wrap;
  }

  f.armas.forEach((a,idx)=>{
    const efetivo = danoEfetivoArma(f, a);
    const testeAtaque = testeAtaqueArma(f, a);
    const bonusDano = bonusDanoArma(f, a);
    const semProf = !proficienteComArma(f, a);
    const card = el('div',{class:'spell-card'},
      el('div',{class:'head'},
        el('span',{class:'name'}, a.nome+(a.maos>=2?' (2 mãos)':'')),
        el('button',{class:'remove-x', onclick:()=>guardarArmaNaMochila(idx)},'📦')
      ),
      el('div',{class:'desc'},
        'Ataque='+(testeAtaque>=0?'+':'')+testeAtaque+' · Dano='+efetivo.dano+(bonusDano?'+'+bonusDano:'')+' · Crítico='+a.critico+' · Alcance='+a.alcance
      )
    );
    if(semProf) card.appendChild(el('div',{class:'meta', style:'color:var(--red-bright);'}, '⚠ Sem proficiência — já aplicado o –5 acima'));
    if(efetivo.nota) card.appendChild(el('div',{class:'meta', style:'color:var(--gold);'}, efetivo.nota));
    if(a.superior && a.melhoriasTxt) card.appendChild(el('div',{class:'meta', style:'color:var(--gold);'}, '⭐ '+a.melhoriasTxt));
    wrap.appendChild(card);
  });

  (f.esotericos||[]).forEach((eso, idx)=>{
    const card = el('div',{class:'spell-card'},
      el('div',{class:'head'}, el('span',{class:'name'}, eso.nome+' 🔮'+(eso.maos>=2?' (2 mãos)':'')), el('button',{class:'remove-x', onclick:()=>guardarEsotericoNaMochila(idx)},'📦'))
    );
    const efeitoTxt = (buscarItemEmpunhavel(eso.refBase||eso.nome)||{}).desc;
    if(efeitoTxt) card.appendChild(el('div',{class:'desc'}, efeitoTxt));
    if(eso.superior && eso.melhoriasTxt) card.appendChild(el('div',{class:'meta', style:'color:var(--gold);'}, '⭐ '+eso.melhoriasTxt));
    const precisaEscola = (eso.efeito||[]).some(ef=>ef.tipo==='cd_arcana_escola');
    if(precisaEscola){
      const sel = el('select',{onchange:(e)=>{ eso.escolaFoco=e.target.value; salvarPerfis(); render(); }});
      sel.appendChild(el('option',{value:''}, 'Escolha a escola de foco...'));
      Object.keys(ESCOLAS).forEach(esc=> sel.appendChild(el('option',{value:esc, selected: eso.escolaFoco===esc}, esc)));
      card.appendChild(sel);
    }
    wrap.appendChild(card);
  });

  wrap.appendChild(el('div',{class:'meta', style:'font-size:0.68rem;color:var(--ink-soft);margin-top:6px;'}, '📦 guarda na mochila (dá pra reequipar depois). 🔮 marca itens esotéricos.'));
  return wrap;
}

// "Usar" um item consumível da mochila — desconta 1 da quantidade, e se chegar a 0, remove o
// item sozinho (com um aviso, pra não sumir sem explicação).
function usarItemMochila(f, idx){
  const row = f.equip[idx];
  if(!row) return;
  const atual = parseInt(row.qtd)||0;
  if(atual <= 1){
    f.equip.splice(idx,1);
    flashMsg('✨ Usou o último '+row.item+' — removido da mochila.');
  } else {
    row.qtd = String(atual-1);
    flashMsg('✨ Usou 1 '+row.item+' ('+row.qtd+' restante'+(atual-1>1?'s':'')+').');
  }
  salvarPerfis(); render();
}

// ---- Enviar item pra outro personagem (não precisa ser o Mestre) ----
function abrirEnviarItem(idx){
  state._enviarItemFluxo = {idx, lista:null, carregando:true, enviando:false};
  render();
  const f = fichaAtual();
  listaLeveDeTodosPersonagens().then(lista=>{
    if(!state._enviarItemFluxo) return; // o jogador já cancelou antes da lista chegar
    state._enviarItemFluxo.lista = lista.filter(p=>p.id!==f.id);
    state._enviarItemFluxo.carregando = false;
    render();
  });
}
function renderPopupEnviarItem(f){
  const fluxo = state._enviarItemFluxo;
  const overlay = el('div',{class:'menu-overlay', onclick:(e)=>{ if(e.target===e.currentTarget && !fluxo.enviando){ state._enviarItemFluxo=null; render(); } }});
  const sheet = el('div',{class:'menu-sheet'});
  const row = f.equip[fluxo.idx];
  if(!row){
    sheet.appendChild(el('div',{class:'tip', style:'margin:14px;'}, 'Esse item não existe mais na sua mochila.'));
    sheet.appendChild(el('button',{class:'menu-close', onclick:()=>{ state._enviarItemFluxo=null; render(); }}, 'Fechar'));
    overlay.appendChild(sheet);
    return overlay;
  }
  sheet.appendChild(el('div',{class:'wizard-title', style:'padding:6px 14px 0;'}, 'Enviar "'+row.item+'"'));
  sheet.appendChild(el('div',{class:'tip', style:'margin:6px 14px;'}, 'Escolha pra quem enviar — o item some da sua mochila e vai direto pra mochila da pessoa escolhida.'));
  if(fluxo.enviando){
    sheet.appendChild(el('div',{class:'empty'}, 'Enviando...'));
  } else if(fluxo.carregando){
    sheet.appendChild(el('div',{class:'empty'}, 'Carregando lista de personagens...'));
  } else if(!fluxo.lista || fluxo.lista.length===0){
    sheet.appendChild(el('div',{class:'empty'}, 'Nenhum outro personagem encontrado.'));
  } else {
    fluxo.lista.forEach(p=>{
      sheet.appendChild(el('button',{class:'menu-item', onclick: async ()=>{
        fluxo.enviando = true; render();
        const itemEnviado = Object.assign({}, row, {item: row.item+' (recebido de '+(f.nome||'alguém')+')'});
        const resultado = await enviarItemParaOutroPersonagem(p.id, itemEnviado);
        if(resultado.ok){
          f.equip.splice(fluxo.idx,1);
          await mestreAtualizarPersonagem(f); // grava só a ficha do remetente, sem tocar na do destino
          flashMsg('📤 "'+row.item+'" enviado pra '+(resultado.nomeDestino||p.nome)+'!');
          state._enviarItemFluxo = null;
        } else {
          flashMsg('⚠ Não consegui enviar agora — tenta de novo em instantes.');
          fluxo.enviando = false;
        }
        render();
      }},
        el('span',{class:'ico'},'👤'), el('span',{}, p.nome+(p.jogador?' ('+p.jogador+')':''))
      ));
    });
  }
  sheet.appendChild(el('button',{class:'menu-close', onclick:()=>{ if(!fluxo.enviando){ state._enviarItemFluxo=null; render(); } }}, 'Cancelar'));
  overlay.appendChild(sheet);
  return overlay;
}

function renderPersonagemMochila(){
  const f = fichaAtual();
  const wrap = el('div',{});

  wrap.appendChild(renderPainelCarga(f));

  const eqPanel = el('div',{class:'panel faixa'}, el('h2',{},'Itens Guardados'));
  if(!f.equip || f.equip.length===0){
    eqPanel.appendChild(el('div',{class:'empty'},'Mochila vazia. Vá no Menu → Itens pra buscar itens no catálogo.'));
  } else {
    f.equip.forEach((row, idx)=>{
      const podeEquipar = row.tipo==='arma' || row.tipo==='armadura' || row.tipo==='escudo' || row.tipo==='esoterico';
      const rotulo = {arma:'Arma', armadura:'Armadura', escudo:'Escudo', esoterico:'Esotérico', geral:'Item'}[row.tipo] || 'Item';
      const corpo = [];
      if(row.tipo==='geral'){
        const itemCatalogo = ITENS_GERAIS.find(i=>i.n===row.item);
        const ehVestivel = itemCatalogo && itemCatalogo.vestivel;
        corpo.push(
          el('label',{},'Nome'),
          el('input',{id:'mochila-nome-'+idx, type:'text', value:row.item, oninput:(e)=>{row.item=e.target.value;}, onchange:()=>{salvarPerfis(); render();}}),
          el('div',{class:'row', style:'margin-top:8px;'},
            el('div',{style:'flex:1;'}, el('label',{},'Quantidade'), el('input',{id:'mochila-qtd-'+idx, type:'text', value:row.qtd, oninput:(e)=>{row.qtd=e.target.value;}, onchange:()=>{salvarPerfis(); render();}})),
            el('div',{style:'flex:1;'}, el('label',{},'Espaço'), el('input',{id:'mochila-carga-'+idx, type:'text', value:row.carga, oninput:(e)=>{row.carga=e.target.value;}, onchange:()=>{salvarPerfis(); render();}})),
          ),
          row.vestido ? el('div',{class:'meta', style:'color:var(--gold);margin-top:4px;'},'👕 vestido') : null,
          el('div',{class:'row', style:'margin-top:8px;'},
            (/^\d+$/.test(String(row.qtd).trim()) && parseInt(row.qtd)>0) ? el('button',{class:'btn', onclick:()=> usarItemMochila(f, idx)}, 'Usar (−1) ✨') : null,
            ehVestivel ? el('button',{class:'btn ghost', onclick:()=>{ row.vestido=!row.vestido; salvarPerfis(); render(); }}, row.vestido?'Guardar':'Vestir') : null,
            el('button',{class:'btn ghost', onclick:()=>abrirEnviarItem(idx)}, 'Enviar 📤'),
            el('button',{class:'btn ghost', onclick:()=>{ if(!confirm('Remover "'+row.item+'" da mochila? Não tem como desfazer.')) return; f.equip.splice(idx,1); salvarPerfis(); render(); }}, 'Remover 🗑️')
          )
        );
      } else {
        corpo.push(
          el('div',{class:'row'},
            el('div',{style:'flex:1;'}, el('label',{},'Quantidade'), el('input',{id:'mochila-qtd-'+idx, type:'text', value:row.qtd, oninput:(e)=>{row.qtd=e.target.value;}, onchange:()=>{salvarPerfis(); render();}})),
            el('div',{style:'flex:1;'}, el('label',{},'Espaço'), el('input',{id:'mochila-carga-'+idx, type:'text', value:row.carga, oninput:(e)=>{row.carga=e.target.value;}, onchange:()=>{salvarPerfis(); render();}})),
          ),
          el('div',{class:'row', style:'margin-top:8px;'},
            podeEquipar ? el('button',{class:'btn ghost', onclick:()=> row.tipo==='esoterico' ? equiparEsotericoDaMochila(idx) : equiparDaMochila(idx)}, 'Equipar') : null,
            el('button',{class:'btn ghost', onclick:()=>abrirEnviarItem(idx)}, 'Enviar 📤'),
            el('button',{class:'btn ghost', onclick:()=>{ if(!confirm('Remover "'+row.item+'" da mochila? Não tem como desfazer.')) return; f.equip.splice(idx,1); salvarPerfis(); render(); }}, 'Remover 🗑️')
          )
        );
      }
      eqPanel.appendChild(renderItemColapsavel('mochila-'+idx, row.item, rotulo+' · Qtd '+row.qtd+' · Esp '+row.carga, corpo));
    });
  }
  eqPanel.appendChild(el('button',{class:'btn ghost', style:'margin-top:10px;', onclick:()=>{
    f.equip.push({tipo:'geral', item:'Novo item', qtd:'1', carga:'1'});
    render();
  }}, '+ Item personalizado (fora do catálogo)'));
  wrap.appendChild(eqPanel);

  wrap.appendChild(el('div',{class:'panel'},
    el('h2',{},'Moedas'),
    el('div',{class:'row3'},
      el('div',{}, el('label',{},'TC (cobre)'), bindInput(f,'tc','number')),
      el('div',{}, el('label',{},'T$ (padrão)'), bindInput(f,'ts','number')),
      el('div',{}, el('label',{},'TO (ouro)'), bindInput(f,'to','number')),
    ),
    el('div',{class:'meta', style:'font-size:0.7rem;color:var(--ink-soft);margin-top:4px;'}, '1 TC = 1/10 T$ · 1 TO = 10 T$')
  ));

  return wrap;
}

function renderItensCompleto(){
  if(state._itemSuperiorBuilder) return renderCriadorItemSuperior();
  const f = fichaAtual();
  const wrap = el('div',{});

  const itf = state.itensFiltro;
  wrap.appendChild(el('div',{class:'tip'},
    el('b',{},'Como usar'),
    'O mestre disse que você achou algo? Busque o nome aqui. Para cada item, escolha se ele já entra em uso ("Equipar") ou se vai só para a mochila. Armadura e escudo equipados atualizam sua Defesa automaticamente.'
  ));

  const tabsRow = el('div',{class:'tab-grid'});
  [['armas','Armas'],['armaduras','Defesas'],['esotericos','Esotéricos'],['pocoes','Poções Mágicas'],['magicos','Itens Mágicos'],['gerais','Itens Gerais']].forEach(([id,label])=>{
    tabsRow.appendChild(el('button',{class: itf.tipo===id?'on':'', onclick:()=>{itf.tipo=id; itf.categoria='todas'; render();}}, label));
  });
  wrap.appendChild(tabsRow);

  wrap.appendChild(el('input',{id:'busca-itens', type:'text', placeholder:'buscar item pelo nome...', value:itf.busca, oninput:(e)=>{itf.busca=e.target.value; renderDebounced();}}));

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
          el('button',{class:'btn', onclick:()=>addArma(w,true)},'Equipar'),
          el('button',{class:'btn ghost', onclick:()=>addArma(w,false)},'Guardar na mochila')
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
          el('button',{class:'btn', onclick:()=> isEscudo?addEscudo(a,true):addArmadura(a,true)}, isEscudo?'Equipar como escudo':'Equipar como armadura'),
          el('button',{class:'btn ghost', onclick:()=> isEscudo?addEscudo(a,false):addArmadura(a,false)}, 'Guardar na mochila')
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
          el('button',{class:'btn', onclick:()=>addEsoterico(it,true)},'Equipar'),
          el('button',{class:'btn ghost', onclick:()=>addEsoterico(it,false)},'Guardar na mochila')
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

    let list = itensDisponiveis.filter(i => (itf.categoria==='todas'||i.cat===itf.categoria) && (!itf.busca || i.n.toLowerCase().includes(itf.busca.toLowerCase())));
    if(list.length===0) results.appendChild(el('div',{class:'empty'},'Nenhum item encontrado.'));
    list = list.slice().sort((a,b)=> a.cat.localeCompare(b.cat) || a.n.localeCompare(b.n));
    let ultimaCategoria = null;
    list.forEach(it=>{
      if(itf.categoria==='todas' && it.cat!==ultimaCategoria){
        ultimaCategoria = it.cat;
        results.appendChild(el('div',{class:'lista-secao-titulo'}, it.cat));
      }
      results.appendChild(renderItemAcordeao('itens-gerais', it.n, it.n+(it.vestivel?' 👕':'')+(it.empunhavel?' 🎻':''), it.cat, [
        el('div',{class:'desc'}, it.desc),
        it.empunhavel ? el('div',{class:'meta'}, it.maos+' mão'+(it.maos>1?'s':'')+' — precisa ser empunhado pra dar o benefício') : null,
        el('div',{class:'row', style:'margin-top:8px;'},
          it.vestivel ? el('button',{class:'btn', onclick:()=>addItemGeral(it,true)},'Vestir') : null,
          it.empunhavel ? el('button',{class:'btn', onclick:()=>addEsoterico(it,true)},'Equipar') : null,
          el('button',{class: (it.vestivel||it.empunhavel)?'btn ghost':'btn', onclick:()=> it.empunhavel ? addEsoterico(it,false) : addItemGeral(it,false)}, (it.vestivel||it.empunhavel)?'Só guardar':'+ Guardar na mochila')
        )
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
        el('button',{class:'btn', style:'margin-top:8px;', onclick:()=>addItemMagicoGenerico(p.nome, 1)}, '+ Guardar na mochila')
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
          el('button',{class:'btn', style:'margin-top:8px;', onclick:()=>addItemMagicoGenerico(a.nome, 1)}, '+ Guardar na mochila')
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
          el('button',{class:'btn', style:'margin-top:8px;', onclick:()=>addItemMagicoGenerico(a.nome, 1)}, '+ Guardar na mochila')
        ]));
      });
    }
    if(!cat || cat==='Acessórios Menores'){
      ACESSORIOS_MENORES.filter(a=>!busca || a.nome.toLowerCase().includes(busca)).forEach(a=>{
        results.appendChild(renderItemAcordeao('itens-magicos', 'acessorio-menor-'+a.nome, a.nome, '', [
          el('div',{class:'desc'}, a.desc),
          el('button',{class:'btn', style:'margin-top:8px;', onclick:()=>addItemMagicoGenerico(a.nome, 1)}, '+ Guardar na mochila')
        ]));
      });
    }
    if(!cat || cat==='Acessórios Médios'){
      ACESSORIOS_MEDIOS.filter(a=>!busca || a.nome.toLowerCase().includes(busca)).forEach(a=>{
        results.appendChild(renderItemAcordeao('itens-magicos', 'acessorio-medio-'+a.nome, a.nome, '', [
          el('div',{class:'desc'}, a.desc),
          el('button',{class:'btn', style:'margin-top:8px;', onclick:()=>addItemMagicoGenerico(a.nome, 1)}, '+ Guardar na mochila')
        ]));
      });
    }
    if(!cat || cat==='Acessórios Maiores'){
      ACESSORIOS_MAIORES.filter(a=>!busca || a.nome.toLowerCase().includes(busca)).forEach(a=>{
        results.appendChild(renderItemAcordeao('itens-magicos', 'acessorio-maior-'+a.nome, a.nome, '', [
          el('div',{class:'desc'}, a.desc),
          el('button',{class:'btn', style:'margin-top:8px;', onclick:()=>addItemMagicoGenerico(a.nome, 1)}, '+ Guardar na mochila')
        ]));
      });
    }
    if(results.children.length===0) results.appendChild(el('div',{class:'empty'},'Nenhum item encontrado.'));
  }

  wrap.appendChild(results);
  return wrap;
}

// ---- ITENS (catálogo) ----
// Card colapsável genérico para catálogos: mostra só nome + info curta por padrão,
// e ao clicar expande descrição/avisos/botões — economiza espaço em listas longas.
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

function renderPainelCarga(f){
  const usada = cargaUsada(f);
  const limite = limiteCarga(f);
  const maxima = cargaMaxima(f);
  const passouLimite = usada > limite;
  const passouMaxima = usada > maxima;
  let estado, cor, faixa;
  if(passouMaxima){
    estado = 'Você não pode carregar tudo isso! O máximo absoluto para sua Força é '+maxima+' espaços — remova itens.';
    cor = 'var(--red-bright)'; faixa = 'critico';
  } else if(passouLimite){
    estado = 'Sobrecarregado: −5 de penalidade de armadura (afeta Acrobacia, Furtividade e Ladinagem) e −3m de deslocamento — já aplicado automaticamente.';
    cor = 'var(--gold)'; faixa = 'atencao';
  } else {
    estado = 'Dentro do limite, sem penalidades.';
    cor = 'var(--ink-soft)'; faixa = 'saudavel';
  }
  const pct = maxima>0 ? Math.max(0, Math.min(100, (usada/maxima)*100)) : 0;
  return el('div',{class:'panel'},
    el('h2',{},'Carga'),
    el('div',{class:'row3'},
      el('div',{class:'attr-box'}, el('div',{class:'lbl'},'Usada'), el('div',{style:'font-weight:800;'}, usada)),
      el('div',{class:'attr-box'}, el('div',{class:'lbl'},'Limite'), el('div',{style:'font-weight:800;'}, limite)),
      el('div',{class:'attr-box'}, el('div',{class:'lbl'},'Máxima'), el('div',{style:'font-weight:800;'}, maxima)),
    ),
    el('div',{class:'stat-bar', style:'margin-top:8px;'}, el('div',{class:'stat-bar-fill '+faixa, style:'width:'+pct+'%;'})),
    el('div',{style:'margin-top:8px;color:'+cor+';font-size:0.8rem;font-weight:600;'}, estado),
    el('div',{style:'margin-top:4px;font-size:0.7rem;color:var(--ink-soft);'}, 'Limite = 10 + 2×Força (ou 10 − Força, se negativa). Máxima = limite × 2 (regra do livro, pág. 146).')
  );
}

function renderPainelVestidos(f){
  const todos = itensVestidosTodos(f);
  const usados = todos.length;
  const excedentes = itensVestidosExcedentes(f);
  const cor = usados>4 ? 'var(--gold)' : 'var(--ink-soft)';
  const panel = el('div',{class:'panel'},
    el('h2',{},'Itens Vestidos ('+Math.min(usados,4)+'/4)'),
    el('div',{class:'tip', style:'font-size:0.8rem;'}, 'Só é possível manter o benefício de até 4 itens vestidos ao mesmo tempo (roupas, capas, joias mágicas etc. — armas e escudos empunhados não contam). Armadura conta como 1 desses 4.'),
  );
  if(todos.length===0){
    panel.appendChild(el('div',{class:'empty'},'Nenhum item vestido no momento.'));
  } else {
    todos.forEach((fonte, i)=>{
      const ativo = i<4;
      panel.appendChild(el('div',{class:'power-item', style: ativo?'':'opacity:0.5;border-left-color:var(--red);'},
        el('b',{}, fonte.nome + (fonte.tipo==='armadura'?' (armadura)':'')),
        ativo ? (fonte.catalogo && fonte.catalogo.bonusPericia ? 'Ativo — +'+fonte.catalogo.bonusPericia.valor+' em '+fonte.catalogo.bonusPericia.nome : (fonte.catalogo?fonte.catalogo.desc:'Ativo')) : 'Excedente — sem efeito até você remover outro item vestido'
      ));
    });
  }
  if(excedentes.length>0){
    panel.appendChild(el('div',{class:'tip', style:'font-size:0.75rem;color:var(--gold);'}, '⚠ Você tem '+excedentes.length+' item(ns) vestido(s) além do limite — eles não fazem efeito até você desmarcar outro (aba Ficha → Mochila).'));
  }
  return panel;
}

// ---- PERÍCIAS ----
function renderPericias(){
  const wrap = el('div',{});
  const f = fichaAtual();
  const treinadas = periciasTreinadasComDivindade(f);
  const nivel = nivelTotal(f);

  wrap.appendChild(el('div',{class:'tip'},
    el('b',{},'Como funciona'),
    'Total = 1/2 do nível ('+Math.floor(nivel/2)+') + atributo-chave + '+bonusTreinoPericia(nivel)+' se for treinado. Perícias em destaque são as que ' + (f.nome||'seu personagem') + ' já tem treinadas — os valores já estão calculados para o nível '+nivel+' atual.'
  ));

  if(!state._periciaBusca) state._periciaBusca = '';
  wrap.appendChild(el('input',{id:'busca-pericias', type:'text', placeholder:'buscar perícia...', value: state._periciaBusca, oninput:(e)=>{ state._periciaBusca=e.target.value; renderDebounced(); }}));

  const lista = PERICIAS.filter(p=> !state._periciaBusca || p.nome.toLowerCase().includes(state._periciaBusca.toLowerCase()));
  if(lista.length===0){
    wrap.appendChild(el('div',{class:'empty'},'Nenhuma perícia encontrada.'));
  }
  lista.forEach(p=>{
    const isTreinada = treinadas.has(p.nome);
    const aberto = state._periciaAberta === p.nome;
    const valor = periciaValor(f, p);
    const nomeEl = el('div',{class:'pericia-nome'}, p.nome+' ');
    if(isTreinada) nomeEl.appendChild(el('span',{class:'pericia-estrela'},'★'));
    const row = el('div',{class:'pericia-row'+(isTreinada?' treinada':''), onclick:()=>{ state._periciaAberta = aberto ? null : p.nome; render(); }},
      el('div',{class:'pericia-total'}, (valor>=0?'+':'')+valor),
      el('div',{},
        nomeEl,
        el('div',{class:'pericia-attr'}, p.attr + (p.treinada?' · só treinada':'') + (p.armadura?' · penalidade':''))
      ),
      el('div',{style:'font-size:0.8rem;color:var(--ink-soft);'}, aberto?'▲':'▼')
    );

    const wrapRow = el('div',{}, row);
    if(aberto){
      const bonusPoder = bonusPericiaDePoderes(f, p.nome);
      const bonusDivindade = bonusPericiaDeDivindade(f, p.nome);
      const bonusCondicoes = bonusCondicoesPericia(f, p);
      const detalhe = el('div',{class:'tip', style:'margin-top:-4px;margin-bottom:8px;'},
        el('div',{}, el('b',{},'Cálculo: '), '1/2 nível ('+Math.floor(nivel/2)+') + '+p.attr+' ('+(parseInt(f[p.attr.toLowerCase()])||0)+')'+(isTreinada?' + treino ('+bonusTreinoPericia(nivel)+')':'')+(bonusPoder?' + poderes ('+bonusPoder+')':'')+(bonusPericiaDeRaca(f,p.nome)?' + raça ('+bonusPericiaDeRaca(f,p.nome)+')':'')+(bonusDivindade?' + divindade ('+bonusDivindade+')':'')+(bonusCondicoes?' + condições ('+bonusCondicoes+')':'')+(p.nome==='Furtividade'&&bonusFurtividadeTamanho(f)?' + tamanho ('+bonusFurtividadeTamanho(f)+')':'')+(p.armadura && penalidadeTotal(f)?' + penalidade de armadura ('+penalidadeTotal(f)+')':'')+' = '+valor),
        el('div',{class:'desc', style:'margin-top:6px;'}, p.resumo),
        el('div',{style:'margin-top:6px;'}, el('b',{},'Principais usos:'), ...p.usos.map(u=> el('div',{style:'margin-top:2px;'}, '• '+u)))
      );
      wrapRow.appendChild(detalhe);
    }
    wrap.appendChild(wrapRow);
  });
  return wrap;
}

// ---- MAGIAS ----
function magiasPorTradicao(trad){
  // trad: 'arcana' | 'divina' — magias Universais entram nas duas
  const alvo = trad==='arcana' ? 'Arcana' : 'Divina';
  return MAGIAS.filter(m => m.trad===alvo || m.trad==='Universal');
}

function renderCardMagia(s, grupoChave, aoAdicionar, aoRemover, fichaCtx){
  if(!state._acordeaoAberto) state._acordeaoAberto = {};
  const aberto = state._acordeaoAberto[grupoChave] === s.n;
  const card = el('div',{class:'spell-card'},
    el('div',{class:'head', style:'cursor:pointer;', onclick:()=>{ state._acordeaoAberto[grupoChave] = aberto ? null : s.n; render(); }},
      el('span',{class:'name'}, s.n, s.trad==='Universal' ? el('span',{class:'pill universal', style:'margin-left:6px;'}, '🔮 Universal') : null),
      el('div',{style:'display:flex;align-items:center;gap:8px;'},
        el('span',{class:'meta'}, s.c+'º círc. · '+s.e),
        aoRemover ? el('button',{class:'remove-x', onclick:(e)=>{ e.stopPropagation(); aoRemover(); }},'✕') : null
      )
    )
  );
  if(!aberto) return card;
  card.appendChild(el('div',{class:'desc'}, s.d));
  card.appendChild(el('div',{class:'magia-info-grid'},
    el('div',{}, el('span',{class:'magia-info-ico'},'⚡ Exec.'), el('span',{}, s.execucao||'—')),
    el('div',{}, el('span',{class:'magia-info-ico'},'🎯 Alcance'), el('span',{}, s.alcance||'—')),
    el('div',{}, el('span',{class:'magia-info-ico'},'🧿 Alvo'), el('span',{}, s.alvo||'—')),
    el('div',{}, el('span',{class:'magia-info-ico'},'⏱ Duração'), el('span',{}, s.duracao||'—')),
    el('div',{style:'grid-column:1/-1;'}, el('span',{class:'magia-info-ico'},'🛡 Resistência'), el('span',{}, s.resistencia||'—')),
  ));
  if(s.aprim && s.aprim.length>0){
    const aprimBox = el('div',{class:'tip'}, el('b',{},'Aprimoramentos'));
    s.aprim.forEach(a=> aprimBox.appendChild(el('div',{class:'power-item'}, el('b',{},a.custo), a.efeito)));
    card.appendChild(aprimBox);
  }
  let custoTxt, custoNota = null;
  if(fichaCtx){
    const custoAjustado = custoPMAjustado(fichaCtx, s);
    const custoBase = custoPM(s.c);
    custoTxt = custoAjustado;
    if(custoAjustado !== custoBase) custoNota = ' (base '+custoBase+', ajustado por item equipado)';
    const cdEsp = cdMagiaEspecifica(fichaCtx, s);
    if(cdEsp!=null){
      const cdBase = cdMagias(fichaCtx);
      card.appendChild(el('div',{class:'meta', style:'font-size:0.7rem;'}, 'CD para resistir: '+cdEsp+(cdEsp!==cdBase?' (base '+cdBase+', +itens equipados)':'')));
    }
  } else {
    custoTxt = custoPM(s.c);
  }
  card.appendChild(el('div',{style:'margin-top:8px;display:flex;justify-content:space-between;align-items:center;'},
    el('span',{class:'meta'}, 'custo: '+custoTxt+' PM'+(custoNota||'')),
    aoAdicionar ? el('button',{class:'btn', style:'width:auto;padding:6px 12px;', onclick:aoAdicionar},'+ Adicionar à ficha') : null
  ));
  return card;
}

function renderPersonagemMagias(){
  const wrap = el('div',{});
  const f = fichaAtual();
  const magPanel = el('div',{class:'panel faixa'}, el('h2',{},'Minhas Magias'));
  const attrChave = atributoChaveMagia(f);
  if(attrChave){
    magPanel.appendChild(el('div',{class:'tip'},
      el('div',{}, el('b',{},'Atributo-chave: '), NOME_ATRIBUTO[attrChave]),
      el('div',{}, el('b',{},'Valor: '), (valorAtributoChaveMagia(f)>=0?'+':'')+valorAtributoChaveMagia(f)),
      el('div',{}, el('b',{},'CD de resistência às suas magias: '), cdMagias(f), ' (10 + 1/2 nível + atributo-chave)'),
    ));
  } else {
    magPanel.appendChild(el('div',{class:'tip'}, el('b',{},'Sem classe conjuradora'), 'Esse personagem ainda não tem uma classe que lança magias.'));
  }

  const ccArc = (f.classesNiveis||[]).find(c=>c.classe==='Arcanista');
  if(ccArc && f.arcanistaCaminho){
    const esperadas = magiasArcanistaEsperadas(f.arcanistaCaminho, ccArc.nivel);
    const acimaDoEsperado = f.magias.length > esperadas;
    magPanel.appendChild(el('div',{class:'meta', style:'margin-bottom:8px;'+(acimaDoEsperado?'color:var(--gold);':'')},
      'Magias conhecidas: '+f.magias.length+' (esperado até aqui, como '+f.arcanistaCaminho+': '+esperadas+')'
      + (acimaDoEsperado ? ' — acima do ritmo normal, confira com o Mestre.' : '')
    ));
  }

  if(f.magias.length===0){
    magPanel.appendChild(el('div',{class:'empty'},'Nenhuma magia adicionada ainda. Vá no Menu → Magias pra buscar e adicionar.'));
  } else {
    f.magias.forEach((s,idx)=>{
      const card = renderCardMagia(s, 'minhas', null, ()=>{ if(!confirm('Remover "'+s.n+'" das suas magias conhecidas? Não tem como desfazer.')) return; f.magias.splice(idx,1); salvarPerfis(); render(); }, f);
      if(f.arcanistaCaminho==='Mago'){
        const memorizada = (f.magiasMemorizadas||[]).includes(s.n);
        card.querySelector('.head .name')?.appendChild(el('span',{class:'pill', style:'margin-left:6px;background:'+(memorizada?'#2e5e3e':'#4a3a1e')+';color:#e8f5e9;'}, memorizada?'📖 memorizada':'não memorizada'));
      }
      magPanel.appendChild(card);
    });
  }
  wrap.appendChild(magPanel);

  if(f.arcanistaCaminho==='Mago' && f.magias.length>0){
    wrap.appendChild(renderPainelMemorizacaoMago(f));
  }

  return wrap;
}

// Mago só pode lançar magias memorizadas — estuda o grimório por 1h e escolhe metade das que
// conhece (arredondado pra baixo). Aqui é só a escolha de QUAIS ficam memorizadas; o "estudar
// por 1h, 1x por dia" fica por conta da narrativa na mesa, como o resto do controle de tempo.
function renderPainelMemorizacaoMago(f){
  const limite = Math.floor(f.magias.length/2);
  const wrap = el('div',{class:'panel faixa'}, el('h2',{},'Memorizar Magias (Mago)'));
  if(!state._memorizandoMago){
    const qtdMemorizada = (f.magiasMemorizadas||[]).length;
    wrap.appendChild(el('div',{class:'tip'}, 'Memorizadas agora: '+qtdMemorizada+' / '+limite+'. Só magias memorizadas podem ser lançadas — estude o grimório por 1h (1x por dia) pra trocar.'));
    wrap.appendChild(el('button',{class:'btn ghost', onclick:()=>{ state._memorizandoMago = (f.magiasMemorizadas||[]).slice(); render(); }}, '📖 Estudar grimório e memorizar'));
  } else {
    const selecao = state._memorizandoMago;
    wrap.appendChild(el('div',{class:'tip'}, 'Escolha até '+limite+' magias (metade das '+f.magias.length+' conhecidas, arredondado pra baixo). Selecionadas: '+selecao.length+' / '+limite+'.'));
    const grid = el('div',{class:'option-grid'});
    f.magias.forEach(s=>{
      const marcada = selecao.includes(s.n);
      grid.appendChild(el('button',{class:'option-card'+(marcada?' selected':''), onclick:()=>{
        if(marcada){ state._memorizandoMago = selecao.filter(n=>n!==s.n); }
        else if(selecao.length < limite){ selecao.push(s.n); }
        else { flashMsg('Já escolheu o limite de '+limite+' magias.'); return; }
        render();
      }},
        el('div',{class:'opt-nome'}, s.n),
        el('div',{class:'opt-sub'}, s.c+'º círc. · '+s.e)
      ));
    });
    wrap.appendChild(grid);
    wrap.appendChild(el('div',{class:'row', style:'margin-top:10px;'},
      el('button',{class:'btn', onclick:()=>{ f.magiasMemorizadas = selecao; state._memorizandoMago=null; salvarPerfis(); flashMsg('📖 Magias memorizadas atualizadas!'); render(); }}, 'Confirmar memorização'),
      el('button',{class:'btn ghost', onclick:()=>{ state._memorizandoMago=null; render(); }}, 'Cancelar')
    ));
  }
  return wrap;
}

function renderMagias(){
  const wrap = el('div',{});
  const mf = state.magiaFiltro;
  const f = fichaAtual();

  const cc = classeConjuradora(f);
  const circuloMax = circuloMaximoDisponivel(f);

  if(!cc){
    wrap.appendChild(el('div',{class:'tip'}, el('b',{},'Sem classe conjuradora'), 'Nenhuma das classes de '+f.nome+' lança magias pela progressão normal (Arcanista, Bardo, Clérigo, Druida). Se ganhou magias por um poder específico (ex: Orar do Paladino), consulte a descrição desse poder. Mesmo assim, você pode navegar pelo catálogo completo abaixo por curiosidade ou pra referência do mestre.'));
  } else if(!mf._tradAjustada){
    // na primeira vez que abre a aba, ajusta automaticamente pra tradição real da classe do personagem
    mf.trad = CLASSES[cc.classe].tradicao;
    mf._tradAjustada = true;
    mf.modo = 'possiveis';
  }

  wrap.appendChild(el('div',{class:'tip'},
    el('b',{},'Como funciona'),
    'Cada magia pertence a uma tradição (arcana ou divina — 🔮 marca as Universais, que qualquer conjurador pode aprender), um círculo e uma escola. Toque no nome de uma magia pra ver a descrição completa.'
  ));

  const modoAtual = mf.modo || 'possiveis';

  // No modo "só as que posso lançar", a tradição não é escolha livre — é a da classe do
  // personagem. Trava aqui (não só na primeira abertura da aba) pra não deixar, por exemplo,
  // um Clérigo ver/adicionar magias Arcanas só porque tocou no botão errado antes de trocar de modo.
  if(cc && modoAtual==='possiveis'){
    mf.trad = CLASSES[cc.classe].tradicao;
  }

  if(modoAtual==='completo' || !cc){
    wrap.appendChild(el('div',{class:'badge-tradition'},
      el('button',{class: mf.trad==='arcana'?'on':'', onclick:()=>{mf.trad='arcana'; render();}},'Arcanas'),
      el('button',{class: mf.trad==='divina'?'on':'', onclick:()=>{mf.trad='divina'; render();}},'Divinas'),
    ));
  } else {
    wrap.appendChild(el('div',{class:'meta', style:'margin-top:8px;'}, 'Tradição: '+(mf.trad==='arcana'?'Arcana':'Divina')+' (definida pela sua classe — pra ver a outra tradição, use "Catálogo completo").'));
  }

  if(cc){
    wrap.appendChild(el('div',{class:'badge-tradition', style:'margin-top:8px;'},
      el('button',{class: modoAtual==='possiveis'?'on':'', onclick:()=>{mf.modo='possiveis'; mf.circulo='todos'; render();}}, 'Só as que posso lançar'),
      el('button',{class: modoAtual==='completo'?'on':'', onclick:()=>{mf.modo='completo'; mf.circulo='todos'; render();}}, 'Catálogo completo'),
    ));
    if(modoAtual==='possiveis'){
      wrap.appendChild(el('div',{class:'meta', style:'font-size:0.72rem;margin-top:4px;'}, 'Até '+circuloMax+'º círculo — nível '+cc.nivel+' de '+cc.classe+'.'));
      if(['Bardo','Druida'].includes(cc.classe) && f.escolasMagia && f.escolasMagia.length>0){
        wrap.appendChild(el('div',{class:'meta', style:'font-size:0.72rem;'}, 'Suas 3 escolas: '+f.escolasMagia.join(', ')+'.'));
      }
    }
  }

  const filters = el('div',{class:'filters'});
  const circSel = el('select',{onchange:(e)=>{mf.circulo=e.target.value; render();}});
  const somenteConjuravel = cc && modoAtual==='possiveis';
  ['todos','1','2','3','4','5'].forEach(c=>{
    if(somenteConjuravel && c!=='todos' && parseInt(c)>circuloMax) return; // nem mostra opção de círculo que ainda não existe
    circSel.appendChild(el('option',{value:c, selected: mf.circulo===c}, c==='todos'?'Todos os círculos':c+'º círculo'));
  });
  filters.appendChild(circSel);
  const escSel = el('select',{onchange:(e)=>{mf.escola=e.target.value; render();}});
  escSel.appendChild(el('option',{value:'todas'},'Todas as escolas'));
  Object.keys(ESCOLAS).forEach(e=> escSel.appendChild(el('option',{value:e, selected: mf.escola===e}, e)));
  filters.appendChild(escSel);
  wrap.appendChild(filters);

  wrap.appendChild(el('input',{id:'busca-magias', type:'text', placeholder:'buscar magia pelo nome...', value:mf.busca, oninput:(e)=>{mf.busca=e.target.value; renderDebounced();}}));

  if(mf.escola !== 'todas'){
    wrap.appendChild(el('div',{class:'tip'}, el('b',{}, mf.escola), ESCOLAS[mf.escola]));
  }

  let list = magiasPorTradicao(mf.trad);
  if(somenteConjuravel) list = list.filter(s=>s.c<=circuloMax);
  if(somenteConjuravel && cc && ['Bardo','Druida'].includes(cc.classe) && f.escolasMagia && f.escolasMagia.length>0){
    list = list.filter(s=> f.escolasMagia.includes(s.e));
  }
  if(mf.circulo!=='todos') list = list.filter(s=>s.c===parseInt(mf.circulo));
  if(mf.escola!=='todas') list = list.filter(s=>s.e===mf.escola);
  if(mf.busca) list = list.filter(s=>s.n.toLowerCase().includes(mf.busca.toLowerCase()));
  list = list.slice().sort((a,b)=> a.c-b.c || a.n.localeCompare(b.n));

  const results = el('div',{});
  if(list.length===0){
    results.appendChild(el('div',{class:'empty'},'Nenhuma magia encontrada com esses filtros.'));
  } else {
    let ultimoCirculo = null;
    list.forEach(s=>{
      if(mf.circulo==='todos' && s.c!==ultimoCirculo){
        ultimoCirculo = s.c;
        results.appendChild(el('div',{class:'lista-secao-titulo'}, s.c+'º Círculo'));
      }
      results.appendChild(renderCardMagia(s, 'lista', ()=>addMagiaFicha(s, mf.trad)));
    });
  }
  wrap.appendChild(results);
  return wrap;
}

// ---- GUIA DE EVOLUÇÃO ----
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

  wrap.appendChild(el('div',{class:'panel'},
    el('h2',{},'Escolha sua classe e nível'),
    el('div',{class:'row'},
      el('div',{},
        el('label',{},'Classe'),
        (()=>{ const s = el('select',{onchange:(e)=>{g.classe=e.target.value; render();}});
          Object.keys(CLASSES).forEach(c=> s.appendChild(el('option',{value:c, ...(g.classe===c?{selected:'selected'}:{})}, c)));
          return s; })()
      ),
      el('div',{},
        el('label',{},'Nível atual'),
        (()=>{ const s = el('select',{onchange:(e)=>{g.nivel=parseInt(e.target.value); render();}});
          for(let i=1;i<=20;i++) s.appendChild(el('option',{value:i, ...(g.nivel===i?{selected:'selected'}:{})}, i+'º'));
          return s; })()
      )
    )
  ));

  const cls = CLASSES[g.classe];
  const nivelAtual = g.nivel;
  const nivelProx = Math.min(nivelAtual+1, 20);

  wrap.appendChild(el('div',{class:'panel'},
    el('h2',{},'Papel em combate'),
    el('div',{class:'tip'}, el('b',{},cls.tradicao?('Conjurador '+cls.tradicao):'Sem magias próprias'), cls.papel),
    el('div',{class:'tip'}, el('b',{},'Dica de iniciante'), cls.dica)
  ));

  const habAtual = cls.tabela.find(t=>t.nivel===nivelAtual);
  const habProx = cls.tabela.find(t=>t.nivel===nivelProx);

  wrap.appendChild(el('div',{class:'panel'},
    el('h2',{}, el('span',{class:'n'}, nivelAtual+'→'+nivelProx), 'O que muda no próximo nível'),
    el('div',{class:'tip'}, el('b',{},'Nível '+nivelAtual+' (agora)'), habAtual?habAtual.hab:'—'),
    el('div',{class:'tip'}, el('b',{},'Nível '+nivelProx+' (ao subir)'), habProx?habProx.hab:'Nível máximo já alcançado'),
  ));

  // detect new spell circle unlocking
  if(cls.tradicao && habProx && /círculo/.test(habProx.hab)){
    const m = habProx.hab.match(/(\d)º círculo/);
    if(m){
      const novoCirc = parseInt(m[1]);
      const spellsList = magiasPorTradicao(cls.tradicao).filter(s=>s.c===novoCirc).slice(0,6);
      const panel = el('div',{class:'panel'},
        el('h2',{}, 'Novo círculo: magias sugeridas'),
        el('div',{class:'tip'}, el('b',{},'Por que essas'), 'Alguns exemplos versáteis de '+novoCirc+'º círculo '+(cls.tradicao)+' para começar — veja a lista completa na aba Magias.')
      );
      spellsList.forEach(s=>{
        panel.appendChild(renderCardMagia(s, 'guia', null));
      });
      wrap.appendChild(panel);
    }
  }

  // powers suggestions
  const listaCompletaGuia = PODERES_CLASSE_COMPLETO[g.classe] || [];
  const powPanel = el('div',{class:'panel'},
    el('h2',{},'Poderes de '+g.classe+' ('+listaCompletaGuia.length+')'),
    el('div',{class:'tip'}, el('b',{},'Como funciona'), 'A cada "poder de '+g.classe.toLowerCase()+'" você escolhe UM da lista abaixo (respeitando os pré-requisitos, se houver). Lista completa do livro:')
  );
  listaCompletaGuia.forEach((p, idx)=>{
    powPanel.appendChild(renderItemAcordeao('guia-poderes-'+g.classe, p.nome, p.nome, p.nivelMin?('nível '+p.nivelMin+'+'):'', [
      el('div',{class:'desc'}, p.desc),
      p.prereq ? el('div',{class:'meta', style:'color:var(--red-bright);'}, 'Pré-requisito: '+p.prereq) : null
    ]));
  });
  wrap.appendChild(powPanel);

  // Trilha de progressão com patamares (Novato/Veterano/Campeão/Lenda), como na ficha oficial
  const tablePanel = el('div',{class:'panel faixa'}, el('h2',{},'Progressão (1º ao 20º)'));
  const PATAMARES = [
    {nome:'Novato', de:1, ate:4, cor:'#7c1f1f'},
    {nome:'Veterano', de:5, ate:10, cor:'#8a6a1e'},
    {nome:'Campeão', de:11, ate:16, cor:'#2c3a52'},
    {nome:'Lenda', de:17, ate:20, cor:'#3b5c3b'},
  ];
  PATAMARES.forEach(pat=>{
    const linhasPatamar = cls.tabela.filter(t=> t.nivel>=pat.de && t.nivel<=pat.ate);
    if(linhasPatamar.length===0) return;
    const bloco = el('div',{class:'patamar-bloco'},
      el('div',{class:'patamar-tag', style:'background:'+pat.cor+';'}, pat.nome+' ('+pat.de+'–'+pat.ate+'º)')
    );
    const table = el('table',{class:'lvl-table'});
    linhasPatamar.forEach(t=>{
      let cls2 = '';
      if(t.nivel===nivelAtual) cls2='current';
      else if(t.nivel===nivelProx) cls2='next';
      table.appendChild(el('tr',{class:cls2}, el('td',{},t.nivel+'º'), el('td',{},t.hab)));
    });
    bloco.appendChild(table);
    tablePanel.appendChild(bloco);
  });
  wrap.appendChild(tablePanel);

  const tipsPanel = el('div',{class:'panel'}, el('h2',{},'Glossário rápido'));
  TIPS_GERAIS.forEach(([t,d])=> tipsPanel.appendChild(el('div',{class:'tip'}, el('b',{},t), d)));
  wrap.appendChild(tipsPanel);

  return wrap;
}
