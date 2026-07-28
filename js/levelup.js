// ============ LEVEL UP (evolução do personagem, com multiclasse) ============

function abrirLevelUp(){
  state.levelUp = {
    aberto:true,
    modoClasse:null, // 'existente' | 'nova'
    classeEscolhida:null,
    poderModo:null, // 'classe' | 'geral'
    poderClasseEscolhido:null, // [nome,desc] de CLASSES[x].poderes
    poderGeralEscolhido:null, // nome de PODERES_GERAIS
    poderSubEscolha:null,
    arcanistaCaminho:null,
    arcanistaLinhagem:null,
  };
  render();
}
function fecharLevelUp(){
  state.levelUp = {aberto:false};
  render();
}

function ctxFicha(f, classeQueEstaSubindo){
  const attrs = {for:f.for,des:f.des,con:f.con,int:f.int,sab:f.sab,car:f.car};
  const pericias = periciasTreinadasComDivindade(f);
  const jaConjurador = (f.classesNiveis||[]).some(c=> CLASSES[c.classe] && CLASSES[c.classe].tradicao);
  const novaConjuradora = classeQueEstaSubindo && CLASSES[classeQueEstaSubindo] && CLASSES[classeQueEstaSubindo].tradicao;
  return {
    attrs, pericias,
    isConjurador: !!(jaConjurador || novaConjuradora),
    nivel: nivelTotal(f),
    poderes: nomesPoderesConhecidos(f)
  };
}

function renderSubEscolhaClasse(esc, lv, campoEstado){
  return renderSubEscolhaGenerica(esc, lv, campoEstado, null);
}

// Pop-up (modal) do Level Up — mesmo padrão visual da divindade, nasce no nível mais alto da tela.
function renderLevelUpPopup(f){
  const overlay = el('div',{class:'menu-overlay', onclick:(e)=>{ if(e.target===e.currentTarget){ fecharLevelUp(); } }});
  const sheet = el('div',{class:'menu-sheet', style:'max-width:480px;'});
  sheet.appendChild(renderLevelUpPanel(f));
  overlay.appendChild(sheet);
  return overlay;
}

function renderLevelUpPanel(f){
  const lv = state.levelUp;
  const wrap = el('div',{class:'panel', style:'border:2px solid var(--red);'});
  wrap.appendChild(el('h2',{},'Subir de Nível'));

  // ---- 1. Escolher classe ----
  wrap.appendChild(el('div',{class:'tip'}, el('b',{},'Passo 1'), 'Em qual classe seu personagem avança este nível? Em Tormenta 20 você pode multiclassar pegando nível numa classe nova.'));
  const grid = el('div',{class:'option-grid'});
  (f.classesNiveis||[]).forEach(c=>{
    grid.appendChild(el('button',{class:'option-card '+(lv.classeEscolhida===c.classe && lv.modoClasse==='existente'?'selected':''), onclick:()=>{
      lv.modoClasse='existente'; lv.classeEscolhida=c.classe; lv.poderModo=null; lv.poderClasseEscolhido=null; lv.poderGeralEscolhido=null; lv.poderSubEscolha=null; render();
    }},
      el('div',{class:'opt-nome'}, c.classe),
      el('div',{class:'opt-sub'}, 'Nível '+c.nivel+' → '+(c.nivel+1))
    ));
  });
  wrap.appendChild(grid);

  const novasDisponiveis = Object.keys(CLASSES).filter(c=> !(f.classesNiveis||[]).some(cn=>cn.classe===c));
  if(novasDisponiveis.length>0){
    wrap.appendChild(el('div',{class:'wizard-sub', style:'margin-top:8px;font-weight:700;'}, '+ Multiclassar: pegar 1º nível em uma classe nova'));
    const grid2 = el('div',{class:'option-grid'});
    novasDisponiveis.forEach(c=>{
      grid2.appendChild(el('button',{class:'option-card '+(lv.classeEscolhida===c && lv.modoClasse==='nova'?'selected':''), onclick:()=>{
        lv.modoClasse='nova'; lv.classeEscolhida=c; lv.poderModo=null; lv.poderClasseEscolhido=null; lv.poderGeralEscolhido=null; lv.poderSubEscolha=null; render();
      }}, el('div',{class:'opt-nome'}, c)));
    });
    wrap.appendChild(grid2);
  }

  if(!lv.classeEscolhida){
    wrap.appendChild(el('button',{class:'btn ghost', style:'margin-top:10px;', onclick:fecharLevelUp},'Cancelar'));
    return wrap;
  }

  const entradaAtual = (f.classesNiveis||[]).find(c=>c.classe===lv.classeEscolhida);
  const nivelAtualClasse = entradaAtual ? entradaAtual.nivel : 0;
  const novoNivel = nivelAtualClasse+1;
  const cls = CLASSES[lv.classeEscolhida];
  const habLinha = cls.tabela.find(t=>t.nivel===novoNivel);

  const ciPreview = CLASSES_INICIAL[lv.classeEscolhida];
  const racaObjPreview = getRacaObj(f);
  const bonusRacaPVPreview = (racaObjPreview && racaObjPreview.pvBonusPorNivel) ? racaObjPreview.pvBonusPorNivel : 0;
  const ganhoPVPreview = Math.max(1, (ciPreview.pvPorNivel||0) + (parseInt(f.con)||0)) + bonusRacaPVPreview;
  const ganhoPMPreview = ciPreview.pm||0;
  wrap.appendChild(el('div',{class:'panel'},
    el('h2',{},lv.classeEscolhida+' — nível '+novoNivel),
    el('div',{class:'tip'}, el('b',{},'Você ganha'), habLinha ? habLinha.hab : 'nível máximo'),
    el('div',{class:'tip'}, el('b',{},'PV / PM'), '+'+ganhoPVPreview+' PV ('+ciPreview.pvPorNivel+' da classe + '+(parseInt(f.con)||0)+' de Constituição'+(bonusRacaPVPreview?(' + '+bonusRacaPVPreview+' de '+f.raca):'')+', mín. 1) e +'+ganhoPMPreview+' PM — aplicado automaticamente ao confirmar.')
  ));

  // Multiclasse nova em Arcanista precisa escolher o Caminho antes de confirmar — mesma escolha
  // que apareceria na criação do personagem, só que chegando aqui via level up em vez do wizard.
  const precisaEscolherCaminho = lv.classeEscolhida==='Arcanista' && novoNivel===1 && !f.arcanistaCaminho;
  if(precisaEscolherCaminho){
    wrap.appendChild(el('div',{class:'panel'},
      el('h2',{},'Caminho do Arcanista'),
      el('div',{class:'tip'}, 'Escolha uma fonte de poder mágico — essa escolha não pode ser mudada depois.'),
      el('div',{class:'option-grid'},
        ...Object.keys(ARCANISTA_CAMINHOS).map(nome=>{
          const info = ARCANISTA_CAMINHOS[nome];
          const aberto = lv._caminhoExpandido === nome;
          const card = el('button',{class:'option-card'+(lv.arcanistaCaminho===nome?' selected':''), onclick:()=>{
            if(aberto || lv.arcanistaCaminho===nome){ lv.arcanistaCaminho=nome; if(nome!=='Feiticeiro') lv.arcanistaLinhagem=null; lv._caminhoExpandido=null; }
            else { lv._caminhoExpandido = nome; }
            render();
          }},
            el('div',{class:'opt-nome'}, nome),
            el('div',{class:'opt-sub'}, info.resumo)
          );
          if(aberto) card.appendChild(el('div',{class:'opt-sub', style:'margin-top:6px;'}, info.descricao));
          return card;
        })
      ),
      lv.arcanistaCaminho==='Feiticeiro' ? el('div',{},
        el('div',{class:'tip', style:'margin-top:10px;'}, 'Escolha uma linhagem — você recebe a herança "Básica" dela agora.'),
        el('div',{class:'option-grid'},
          ...LINHAGENS_FEITICEIRO.map(l=>{
            const aberta = lv._linhagemExpandida === l.nome;
            const card = el('button',{class:'option-card'+(lv.arcanistaLinhagem===l.nome?' selected':''), onclick:()=>{
              if(aberta || lv.arcanistaLinhagem===l.nome){ lv.arcanistaLinhagem=l.nome; lv._linhagemExpandida=null; }
              else { lv._linhagemExpandida = l.nome; }
              render();
            }},
              el('div',{class:'opt-nome'}, l.nome),
              el('div',{class:'opt-sub'}, l.resumo)
            );
            if(aberta) card.appendChild(el('div',{class:'opt-sub', style:'margin-top:6px;'}, el('b',{},'Básica: '), l.basica));
            return card;
          })
        )
      ) : null
    ));
  }

  // ---- 2. Poder de classe, se aplicável ----
  const ganhaPoderClasse = habLinha && /poder de/i.test(habLinha.hab);
  if(ganhaPoderClasse){
    wrap.appendChild(el('div',{class:'tip'}, el('b',{},'Passo 2'), 'Esse nível concede um poder de classe. Escolha um exemplo da lista de '+lv.classeEscolhida+', ou troque por um poder geral (regra opcional do livro).'));
    const modoRow = el('div',{class:'row'});
    modoRow.appendChild(el('button',{class:'option-card '+(lv.poderModo==='classe'?'selected':''), onclick:()=>{ lv.poderModo='classe'; lv.poderGeralEscolhido=null; lv.poderSubEscolha=null; render(); }}, el('div',{class:'opt-nome'},'Poder de '+lv.classeEscolhida)));
    modoRow.appendChild(el('button',{class:'option-card '+(lv.poderModo==='geral'?'selected':''), onclick:()=>{ lv.poderModo='geral'; lv.poderClasseEscolhido=null; render(); }}, el('div',{class:'opt-nome'},'Trocar por poder geral')));
    wrap.appendChild(modoRow);

    if(lv.poderModo==='classe'){
      const listaCompleta = PODERES_CLASSE_COMPLETO[lv.classeEscolhida] || [];
      const conhecidosClasse = (f.poderesClasse||[]).filter(p=>p.classe===lv.classeEscolhida && !p.trocaPorGeral).map(p=>p.nome);
      const disponiveisClasse = listaCompleta.filter(p=>{
        if(p.nivelMin && p.nivelMin > novoNivel) return false; // ainda não chegou no nível exigido
        const repetivel = /pode escolher este poder (v[aá]rias vezes|quantas vezes quiser|outras vezes)/i.test(p.desc);
        if(!repetivel && conhecidosClasse.includes(p.nome)) return false; // já tem e não é repetível
        return true;
      });
      // "Prévia" do personagem já no novo nível — pra pré-requisito tipo "6º nível de X" bater
      // certo quando é justamente ESSE level up que está levando a esse nível.
      const fPreview = Object.assign({}, f, {classesNiveis: (f.classesNiveis||[]).map(c=> c.classe===lv.classeEscolhida ? Object.assign({},c,{nivel:novoNivel}) : c)});
      const gridP = el('div',{class:'option-grid'});
      disponiveisClasse.forEach(p=>{
        const aberto = lv._poderExpandido === p.nome;
        const avaliacao = avaliarPrerequisito(fPreview, p.prereq);
        const bloqueado = p.prereq && avaliacao.confiavel && !avaliacao.cumpre;
        const card = el('button',{class:'option-card '+(lv.poderClasseEscolhido===p.nome?'selected':'')+(bloqueado?' used-elsewhere':''), onclick:()=>{
          if(bloqueado){ lv._poderExpandido = aberto ? null : p.nome; render(); return; } // só expande pra mostrar o motivo, não deixa escolher
          lv.poderClasseEscolhido=p.nome; lv.poderClasseSubEscolha=null; lv._poderExpandido=p.nome; render();
        }},
          el('div',{class:'opt-nome'}, p.nome+(bloqueado?' 🔒':''))
        );
        if(aberto){
          card.appendChild(el('div',{class:'opt-sub'}, p.desc));
          if(p.prereq){
            const cor = !avaliacao.confiavel ? 'var(--gold)' : (avaliacao.cumpre ? 'var(--red-bright)' : 'var(--red-bright)');
            const prefixo = !avaliacao.confiavel ? '⚠ Confira manualmente — ' : (avaliacao.cumpre ? '✓ Você cumpre — ' : '✗ Você NÃO cumpre — ');
            card.appendChild(el('div',{class:'opt-sub', style:'color:'+cor+';'}, prefixo+'Pré-requisito: '+p.prereq));
          }
        }
        gridP.appendChild(card);
      });
      wrap.appendChild(gridP);
      wrap.appendChild(el('div',{class:'tip'}, el('b',{},'Nota'), 'Lista completa de "poder de '+lv.classeEscolhida.toLowerCase()+'" do livro, já filtrada pelo seu nível atual. Quando o app tem certeza que falta um pré-requisito, a opção fica bloqueada (🔒) — toque nela mesmo assim pra ver o motivo. Pré-requisitos mais complexos (texto ⚠ dourado) precisam de conferência manual seu ou do Mestre.'));
      const poderClasseObj = listaCompleta.find(p=>p.nome===lv.poderClasseEscolhido);
      if(poderClasseObj && poderClasseObj.escolha){
        wrap.appendChild(renderSubEscolhaClasse(poderClasseObj.escolha, lv, 'poderClasseSubEscolha'));
      }
    }
    if(lv.poderModo==='geral'){
      const ctx = ctxFicha(f, lv.classeEscolhida);
      const disponiveis = poderesSelecionaveis(PODERES_GERAIS.filter(p=>checaPrereqCtx(p, ctx)), ctx.poderes);
      ['Combate','Destino','Magia'].forEach(grupo=>{
        const doGrupo = disponiveis.filter(p=>p.grupo===grupo);
        if(doGrupo.length===0) return;
        wrap.appendChild(el('div',{class:'wizard-sub', style:'font-weight:700;'}, 'Poderes de '+grupo));
        const gridG = el('div',{class:'option-grid'});
        doGrupo.forEach(p=>{
          const aberto = lv._poderExpandido === p.nome;
          const card = el('button',{class:'option-card '+(lv.poderGeralEscolhido===p.nome?'selected':''), onclick:()=>{
            lv.poderGeralEscolhido=p.nome; lv.poderSubEscolha=null; lv._poderExpandido=p.nome; render();
          }},
            el('div',{class:'opt-nome'}, p.nome)
          );
          if(aberto) card.appendChild(el('div',{class:'opt-sub'}, p.desc));
          gridG.appendChild(card);
        });
        wrap.appendChild(gridG);
      });
      wrap.appendChild(renderSubEscolhaPoder(lv, lv.poderGeralEscolhido, 'poderSubEscolha', ctx.pericias));
    }
  }

  // ---- 3. Novo círculo de magia, se aplicável ----
  if(cls.tradicao && habLinha && /círculo/i.test(habLinha.hab)){
    const m = habLinha.hab.match(/(\d)º círculo/);
    if(m){
      const novoCirc = parseInt(m[1]);
      wrap.appendChild(el('div',{class:'panel'},
        el('h2',{},'Novo círculo de magia: '+novoCirc+'º'),
        el('div',{class:'tip'}, el('b',{},'Sugestões'), 'Alguns exemplos de '+novoCirc+'º círculo '+cls.tradicao+' — adicione quantas magias sua classe permitir na aba Magias depois de aplicar o Level Up.')
      ));
      const spellsList = magiasPorTradicao(cls.tradicao).filter(s=>s.c===novoCirc).slice(0,4);
      const spellPanel = el('div',{class:'panel'});
      spellsList.forEach(s=>{
        spellPanel.appendChild(renderCardMagia(s, 'levelup-'+s.n, null));
      });
      wrap.appendChild(spellPanel);
    }
  }

  // ---- Confirmar ----
  const clsObj = lv.classeEscolhida ? CLASSES[lv.classeEscolhida] : null;
  const poderClasseObjConfirm = (clsObj && lv.poderClasseEscolhido) ? clsObj.poderes.find(([nome])=>nome===lv.poderClasseEscolhido) : null;
  const poderClassePendente = poderClasseObjConfirm && poderClasseObjConfirm[2] && !lv.poderClasseSubEscolha;
  const podeConfirmar = (!ganhaPoderClasse || (lv.poderModo==='classe' && lv.poderClasseEscolhido && !poderClassePendente) || (lv.poderModo==='geral' && lv.poderGeralEscolhido && (!PODERES_GERAIS.find(p=>p.nome===lv.poderGeralEscolhido).escolha || lv.poderSubEscolha)))
    && (!precisaEscolherCaminho || (lv.arcanistaCaminho && (lv.arcanistaCaminho!=='Feiticeiro' || lv.arcanistaLinhagem)));
  const navRow = el('div',{class:'wizard-nav', style:'position:static;'});
  navRow.appendChild(el('button',{class:'btn ghost', onclick:fecharLevelUp},'Cancelar'));
  const confirmBtn = el('button',{class:'btn', onclick:()=> aplicarLevelUp(f)}, 'Aplicar Level Up');
  if(!podeConfirmar){ confirmBtn.setAttribute('disabled','disabled'); confirmBtn.style.opacity='0.5'; }
  navRow.appendChild(confirmBtn);
  wrap.appendChild(navRow);

  return wrap;
}

async function aplicarLevelUp(f){
  const lv = state.levelUp;
  const entradaAtual = (f.classesNiveis||[]).find(c=>c.classe===lv.classeEscolhida);
  const novoNivel = entradaAtual ? entradaAtual.nivel+1 : 1;
  if(entradaAtual){ entradaAtual.nivel = novoNivel; }
  else { f.classesNiveis.push({classe:lv.classeEscolhida, nivel:1}); }
  if(lv.classeEscolhida==='Arcanista' && lv.arcanistaCaminho && !f.arcanistaCaminho){
    f.arcanistaCaminho = lv.arcanistaCaminho;
    f.arcanistaLinhagem = lv.arcanistaCaminho==='Feiticeiro' ? lv.arcanistaLinhagem : null;
    if(ARCANISTA_CAMINHOS[lv.arcanistaCaminho].memorizacao) f.magiasMemorizadas = [];
  }

  const cls = CLASSES[lv.classeEscolhida];
  const ci = CLASSES_INICIAL[lv.classeEscolhida];
  const habLinha = cls.tabela.find(t=>t.nivel===novoNivel);
  let poderRegistrado = null;

  if(habLinha && /poder de/i.test(habLinha.hab)){
    if(lv.poderModo==='classe' && lv.poderClasseEscolhido){
      poderRegistrado = {classe:lv.classeEscolhida, nivel:novoNivel, nome:lv.poderClasseEscolhido, sub:lv.poderClasseSubEscolha||null, trocaPorGeral:false};
    } else if(lv.poderModo==='geral' && lv.poderGeralEscolhido){
      poderRegistrado = {classe:lv.classeEscolhida, nivel:novoNivel, nome:lv.poderGeralEscolhido, sub:lv.poderSubEscolha, trocaPorGeral:true};
      if(lv.poderGeralEscolhido==='Treinamento em Perícia' && lv.poderSubEscolha){
        const nb = nomeBasePericia(lv.poderSubEscolha);
        if(!f.periciasTreinadas.includes(nb)) f.periciasTreinadas.push(nb);
      }
    }
    if(poderRegistrado) f.poderesClasse.push(poderRegistrado);
  }

  // PV/PM automáticos: todo nível além do 1º da ficha soma "ganho por nível" da classe escolhida
  // + Constituição nos PV (mínimo 1), e o PM por nível é fixo (regra do livro, "Subindo de Nível", pág. 40).
  const racaObjLevelUp = getRacaObj(f);
  const bonusRacaPV = (racaObjLevelUp && racaObjLevelUp.pvBonusPorNivel) ? racaObjLevelUp.pvBonusPorNivel : 0;
  const ganhoPV = Math.max(1, (ci.pvPorNivel||0) + (parseInt(f.con)||0)) + bonusRacaPV;
  const ganhoPM = ci.pm||0;
  f.pvmax += ganhoPV; f.pvatual += ganhoPV;
  f.pmmax += ganhoPM; f.pmatual += ganhoPM;

  f.historicoNiveis.push({classe:lv.classeEscolhida, nivel:novoNivel, ganho: habLinha?habLinha.hab:'', poder: poderRegistrado, pvGanho:ganhoPV, pmGanho:ganhoPM});

  await salvarPerfis();
  state.levelUp = {aberto:false};
  flashMsg('Nível '+novoNivel+' de '+lv.classeEscolhida+' aplicado! +'+ganhoPV+' PV e +'+ganhoPM+' PM (já somados automaticamente).');
}
