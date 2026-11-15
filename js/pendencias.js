// Janelas do menu: Log de alterações e Pendências.
// Separado do js/ficha.js em 15/11/2026 (item 6 da revisão geral), sem mudar o código.

// Mostra o que existe no app hoje mas que esse personagem específico ainda não preencheu
// (normalmente porque a ficha foi criada antes da gente adicionar aquela mecânica). Reaproveita
// os mesmos blocos de escolha do wizard/level-up, só que gravando direto na ficha existente —
// não mexe em mais nada (mochila, PV atual, magias, histórico, etc. ficam intocados).
// Histórico simples do que foi feito na ficha — cada evento vem de registrarLog(), chamado nos
// pontos de mudança mais relevantes (PV/PM, level up, itens, magias, condições). Só leitura.
function renderPopupLog(f){
  const overlay = el('div',{class:'menu-overlay', onclick:(e)=>{ if(e.target===e.currentTarget){ state._logAberto=false; render(); } }});
  const sheet = el('div',{class:'menu-sheet', style:'max-width:480px;'});
  sheet.appendChild(el('div',{class:'wizard-title', style:'padding:6px 14px 0;'},'Log de Alterações'));
  const log = f.log||[];
  if(log.length===0){
    sheet.appendChild(el('div',{class:'empty'},'Nada registrado ainda — as próximas mudanças na ficha vão aparecer aqui.'));
  } else {
    // Kit (15/11/2026): agrupado por dia, uma linha por mudança e a hora à direita.
    const lista = el('div',{class:'log-kit'});
    let diaAnterior = null;
    log.slice().sort((x,y)=> (y.ts||0)-(x.ts||0)).forEach(entrada=>{
      const data = new Date(entrada.ts);
      const dia = data.toLocaleDateString('pt-BR', {weekday:'short', day:'2-digit', month:'2-digit'});
      if(dia!==diaAnterior){ diaAnterior = dia; lista.appendChild(el('div',{class:'k-rot'}, dia)); }
      lista.appendChild(el('div',{class:'log-linha'},
        el('span',{class:'ponto', style:'background:'+(typeof corEventoLog==='function' ? corEventoLog(entrada.texto) : 'var(--gold-deep)')+';'}),
        el('span',{class:'txt'}, entrada.texto),
        el('span',{class:'hora'}, data.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}))));
    });
    sheet.appendChild(lista);
  }
  sheet.appendChild(el('button',{class:'menu-close', onclick:()=>{ state._logAberto=false; render(); }}, 'Fechar'));
  overlay.appendChild(sheet);
  return overlay;
}

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
    // Kit (15/11/2026): título e resumo numa linha só; o conserto logo abaixo, como uma gaveta.
    const card = el('div',{class:'k-gaveta pendencia-kit'});
    card.appendChild(el('div',{class:'pendencia-cab'}, el('span',{class:'ic'}, '⚠️'), el('span',{}, el('b',{}, p.titulo), el('small',{}, p.resumo))));

    if(p.tipo==='divindadeForcada'){
      card.appendChild(el('button',{class:'btn', onclick:()=>{ state._pendenciasAberto=false; state._divindadeFluxo={passo:'escolher'}; render(); }}, 'Resolver agora →'));
    }

    if(p.tipo==='habilidadesClasse'){
      card.appendChild(el('button',{class:'btn', onclick:()=>{
        const fontesAtuais = (f.habilidadesIniciais||[]).map(h=>h.fonte);
        (f.classesNiveis||[]).forEach(c=>{
          const habs = CLASSES[c.classe] && CLASSES[c.classe].habilidadesClasse;
          if(habs && !fontesAtuais.includes('Classe: '+c.classe)){
            habs.forEach(([nome,desc])=>{
              f.habilidadesIniciais.push({fonte:'Classe: '+c.classe, nome, desc});
            });
          }
        });
        salvarPerfis();
        flashMsg('✅ Habilidades de classe adicionadas!');
        render();
      }}, 'Resolver agora'));
    }

    if(p.tipo==='deformidade'){
      if(!resolvendo){
        card.appendChild(el('button',{class:'btn', onclick:()=>{
          state._pendenciaResolvendo='deformidade';
          // migra o formato antigo (array de nomes de perícia) pro novo (array de {tipo,valor}),
          // assim quem já tinha escolhido antes vê a própria escolha antiga pré-preenchida em vez
          // de começar do zero — só precisa confirmar, ou trocar por um Poder da Tormenta se quiser.
          const antigo = f.deformidadeEscolhas || [];
          state._pendDeformidade = antigo.map(esc => (esc && typeof esc==='object' && esc.tipo) ? esc : {tipo:'pericia', valor:esc});
          render();
        }}, 'Resolver agora'));
      } else {
        if(!state._pendDeformidade) state._pendDeformidade = [];
        card.appendChild(el('div',{class:'tip', style:'font-size:0.78rem;'}, 'Escolha 2: cada um pode ser +2 numa perícia, OU um Poder da Tormenta (isso te custa Carisma — veja o aviso na aba Personagem).'));
        for(let slot=0; slot<2; slot++){
          const atual = state._pendDeformidade[slot];
          card.appendChild(el('div',{class:'panel', style:'margin-top:8px;'},
            el('div',{class:'meta'}, 'Escolha '+(slot+1)+':'),
            el('div',{class:'row', style:'margin-top:4px;'},
              el('button',{class:'btn'+(atual && atual.tipo==='pericia'?'':' ghost'), onclick:()=>{ state._pendDeformidade[slot] = {tipo:'pericia', valor:PERICIAS[0].nome}; render(); }}, 'Perícia'),
              el('button',{class:'btn'+(atual && atual.tipo==='tormenta'?'':' ghost'), onclick:()=>{ state._pendDeformidade[slot] = {tipo:'tormenta', valor:PODERES_GERAIS.find(pw=>pw.grupo==='Tormenta').nome}; render(); }}, 'Poder da Tormenta')
            ),
            atual && atual.tipo==='pericia' ? (()=>{
              const sel = el('select',{onchange:(e)=>{ state._pendDeformidade[slot].valor = e.target.value; render(); }});
              PERICIAS.forEach(per=> sel.appendChild(el('option',{value:per.nome, ...(atual.valor===per.nome?{selected:'selected'}:{})}, per.nome)));
              return sel;
            })() : null,
            atual && atual.tipo==='tormenta' ? (()=>{
              const sel = el('select',{onchange:(e)=>{ state._pendDeformidade[slot].valor = e.target.value; render(); }});
              PODERES_GERAIS.filter(pw=>pw.grupo==='Tormenta').forEach(pw=> sel.appendChild(el('option',{value:pw.nome, ...(atual.valor===pw.nome?{selected:'selected'}:{})}, pw.nome)));
              return sel;
            })() : null,
            atual && atual.tipo==='tormenta' ? el('div',{class:'meta', style:'margin-top:4px;'}, PODERES_GERAIS.find(pw=>pw.nome===atual.valor).desc) : null
          ));
        }
        const podeSalvar = state._pendDeformidade.length===2 && state._pendDeformidade[0] && state._pendDeformidade[1];
        card.appendChild(el('div',{class:'row', style:'margin-top:10px;'},
          el('button',{class:'btn'+(podeSalvar?'':' ghost'), onclick:()=>{
            if(!podeSalvar) return;
            f.deformidadeEscolhas = state._pendDeformidade.slice();
            salvarPerfis();
            flashMsg('✅ Deformidade resolvida!');
            state._pendenciaResolvendo=null;
            render();
          }}, 'Salvar'),
          el('button',{class:'btn ghost', onclick:()=>{ state._pendenciaResolvendo=null; render(); }}, 'Cancelar')
        ));
      }
    }

    if(p.tipo==='periciaExtraInt'){
      const qtd = f.periciasExtraIntPendentes||0;
      if(!resolvendo){
        card.appendChild(el('button',{class:'btn', onclick:()=>{ state._pendenciaResolvendo='periciaExtraInt'; state._pendPericiaExtraInt = []; render(); }}, 'Resolver agora'));
      } else {
        if(!state._pendPericiaExtraInt) state._pendPericiaExtraInt = [];
        const jaTreinadas = new Set(f.periciasTreinadas||[]);
        card.appendChild(el('div',{class:'tip', style:'font-size:0.78rem;'}, 'Escolha '+qtd+' perícia(s) nova(s) — pode ser qualquer uma, não precisa ser da sua classe.'));
        card.appendChild(el('div',{class:'option-grid'},
          ...PERICIAS.filter(per=>!jaTreinadas.has(per.nome)).map(per=>{
            const marcada = state._pendPericiaExtraInt.includes(per.nome);
            return el('button',{class:'option-card'+(marcada?' selected':''), onclick:()=>{
              if(marcada){ state._pendPericiaExtraInt = state._pendPericiaExtraInt.filter(n=>n!==per.nome); }
              else if(state._pendPericiaExtraInt.length<qtd){ state._pendPericiaExtraInt = [...state._pendPericiaExtraInt, per.nome]; }
              else { flashMsg('Já escolheu as '+qtd+' perícia(s).'); return; }
              render();
            }}, el('div',{class:'opt-nome'}, per.nome));
          })
        ));
        card.appendChild(el('div',{class:'meta', style:'margin-top:6px;'}, state._pendPericiaExtraInt.length+' / '+qtd+' escolhida(s)'));
        const podeSalvar = state._pendPericiaExtraInt.length===qtd;
        card.appendChild(el('div',{class:'row', style:'margin-top:10px;'},
          el('button',{class:'btn'+(podeSalvar?'':' ghost'), onclick:()=>{
            if(!podeSalvar) return;
            if(!f.periciasTreinadas) f.periciasTreinadas = [];
            state._pendPericiaExtraInt.forEach(nome=>{ if(!f.periciasTreinadas.includes(nome)) f.periciasTreinadas.push(nome); });
            f.periciasExtraIntPendentes = 0;
            registrarLog(f, 'Nova(s) perícia(s) treinada(s) por Inteligência: '+state._pendPericiaExtraInt.join(', '));
            salvarPerfis();
            flashMsg('✅ Perícia(s) nova(s) adicionada(s)!');
            state._pendenciaResolvendo=null;
            render();
          }}, 'Salvar'),
          el('button',{class:'btn ghost', onclick:()=>{ state._pendenciaResolvendo=null; render(); }}, 'Cancelar')
        ));
      }
    }

    if(p.tipo==='oficioSemEspecialidade'){
      if(!state._pendOficioNome) state._pendOficioNome = '';
      card.appendChild(el('div',{class:'tip', style:'font-size:0.78rem;'}, 'Qual ofício esse personagem pratica? (armeiro, alquimista, cozinheiro, ferreiro, entalhador, joalheiro... qualquer um que faça sentido)'));
      card.appendChild(el('input',{id:'oficio-nome', type:'text', placeholder:'ex: alquimista', value:state._pendOficioNome, oninput:(e)=>{state._pendOficioNome=e.target.value;}}));
      card.appendChild(el('button',{class:'btn', style:'margin-top:8px;', onclick:()=>{
        const nome = (state._pendOficioNome||'').trim();
        if(!nome){ flashMsg('Digita o nome do ofício primeiro.'); return; }
        if((f.periciasTreinadas||[]).includes('Ofício')){
          const idxOficio = f.periciasTreinadas.indexOf('Ofício');
          f.periciasTreinadas[idxOficio] = 'Ofício ('+nome+')';
        }
        if(f.vanguardistaOficio==='Ofício') f.vanguardistaOficio = 'Ofício ('+nome+')';
        salvarPerfis();
        flashMsg('✅ Especialidade de Ofício definida: '+nome+'!');
        state._pendOficioNome = '';
        render();
      }}, 'Salvar'));
    }

    if(p.tipo==='vanguardista'){
      if(!state._pendVanguardistaOficio) state._pendVanguardistaOficio = '';
      card.appendChild(el('div',{class:'tip', style:'font-size:0.78rem;'}, 'Kliren recebe +2 num Ofício à escolha — qual ofício esse personagem pratica? (armeiro, alquimista, cozinheiro, ferreiro, entalhador...)'));
      card.appendChild(el('input',{id:'vanguardista-oficio', type:'text', placeholder:'ex: armeiro', value:state._pendVanguardistaOficio, oninput:(e)=>{state._pendVanguardistaOficio=e.target.value;}}));
      card.appendChild(el('button',{class:'btn', style:'margin-top:8px;', onclick:()=>{
        const nome = (state._pendVanguardistaOficio||'').trim();
        if(!nome){ flashMsg('Digita o nome do ofício primeiro.'); return; }
        f.vanguardistaOficio = 'Ofício ('+nome+')';
        // se a ficha ainda não tem NENHUM Ofício treinado, essa escolha também vira a
        // especialidade treinada — mata as duas pendências de uma vez, já que normalmente é o
        // mesmo ofício (o personagem pratica UMA coisa, e o bônus racial reforça ela mesma).
        if((f.periciasTreinadas||[]).includes('Ofício')){
          const idxOficio = f.periciasTreinadas.indexOf('Ofício');
          f.periciasTreinadas[idxOficio] = 'Ofício ('+nome+')';
        }
        salvarPerfis();
        flashMsg('✅ Bônus de Vanguardista aplicado em Ofício ('+nome+')!');
        state._pendVanguardistaOficio = '';
        render();
      }}, 'Salvar'));
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

    if(p.tipo==='poderComEscolhaPendente'){
      const pendentes = poderesComEscolhaFaltando(f);
      card.appendChild(el('div',{class:'tip', style:'font-size:0.78rem;'}, pendentes.length+' poder(es) esperando escolha:'));
      pendentes.forEach(problema=>{
        const chaveResolucao = problema.origem+'-'+(problema.indice!=null?problema.indice:'');
        const resolvendoEsse = state._pendenciaResolvendo === ('poderComEscolhaPendente:'+chaveResolucao);
        const miniCard = el('div',{class:'panel', style:'margin-top:8px;'},
          el('div',{class:'meta'}, problema.nome+' — '+problema.def.escolha.label)
        );
        if(!resolvendoEsse){
          miniCard.appendChild(el('button',{class:'btn ghost', style:'margin-top:6px;', onclick:()=>{ state._pendenciaResolvendo='poderComEscolhaPendente:'+chaveResolucao; render(); }}, 'Escolher'));
        } else {
          const grid = el('div',{class:'option-grid', style:'margin-top:6px;'});
          problema.def.escolha.opcoes.forEach(opcao=>{
            grid.appendChild(el('button',{class:'option-card', onclick:()=>{
              // escreve a escolha de volta na fonte certa
              if(problema.origem==='poderesClasse') f.poderesClasse[problema.indice].sub = opcao;
              else f[problema.origem].sub = opcao;
              // "Aumento de Atributo" precisa do efeito de verdade além de só guardar a escolha —
              // soma +1 no atributo (e, se for Inteligência, abre a pendência de perícia extra,
              // igual já acontece escolhendo isso pela primeira vez no level up).
              if(problema.nome==='Aumento de Atributo'){
                const mapaAtributo = {'Força':'for','Destreza':'des','Constituição':'con','Inteligência':'int','Sabedoria':'sab','Carisma':'car'};
                const chave = mapaAtributo[opcao];
                if(chave){
                  f[chave] = (parseInt(f[chave])||0) + 1;
                  registrarLog(f, 'Aumento de Atributo (pendência resolvida): +1 em '+opcao+' (agora '+f[chave]+')');
                  if(chave==='int') f.periciasExtraIntPendentes = (f.periciasExtraIntPendentes||0) + 1;
                }
              }
              salvarPerfis();
              flashMsg('✅ '+problema.nome+' resolvido!');
              state._pendenciaResolvendo=null;
              render();
            }}, opcao));
          });
          miniCard.appendChild(grid);
          miniCard.appendChild(el('button',{class:'btn ghost', style:'margin-top:4px;', onclick:()=>{ state._pendenciaResolvendo=null; render(); }}, 'Cancelar'));
        }
        card.appendChild(miniCard);
      });
    }

    if(p.tipo==='poderClasseFaltando'){
      const faltando = slotsPoderClasseFaltando(f);
      faltando.forEach(item=>{
        const chave = 'poderClasseFaltando:'+item.classe;
        const resolvendoEsse = state._pendenciaResolvendo === chave;
        const miniCard = el('div',{class:'panel', style:'margin-top:8px;'},
          el('div',{class:'meta'}, item.classe+' — faltam '+item.faltando+' poder(es) de classe')
        );
        if(!resolvendoEsse){
          miniCard.appendChild(el('button',{class:'btn ghost', style:'margin-top:6px;', onclick:()=>{ state._pendenciaResolvendo=chave; render(); }}, 'Escolher'));
        } else {
          const nomesConhecidos = nomesPoderesConhecidos(f);
          const disponiveis = (PODERES_CLASSE_COMPLETO[item.classe]||[]).filter(pd=>{
            if(nomesConhecidos.includes(pd.nome)) return false; // já tem esse poder
            if(pd.nivelMin && pd.nivelMin > (f.classesNiveis.find(c=>c.classe===item.classe)||{}).nivel) return false;
            return true;
          });
          const grid = el('div',{class:'option-grid'});
          disponiveis.forEach(pd=>{
            grid.appendChild(el('button',{class:'option-card', onclick:()=>{
              // Escreve no primeiro nível "vazio" — não precisa ser exato, o importante é
              // contar como uma escolha feita; a contagem de slots já garante que não passa do
              // que a tabela permite.
              const nivelAtualDaClasse = (f.classesNiveis.find(c=>c.classe===item.classe)||{}).nivel || 1;
              if(!f.poderesClasse) f.poderesClasse = [];
              f.poderesClasse.push({nome:pd.nome, classe:item.classe, nivel:nivelAtualDaClasse, sub:null});
              registrarLog(f, 'Pendência resolvida: escolheu "'+pd.nome+'" ('+item.classe+')');
              salvarPerfis();
              state._pendenciaResolvendo=null;
              render();
            }}, el('div',{class:'opt-nome'}, pd.nome), el('div',{class:'opt-sub'}, pd.desc)));
          });
          card.appendChild(grid);
          card.appendChild(el('button',{class:'btn ghost', style:'margin-top:4px;', onclick:()=>{ state._pendenciaResolvendo=null; render(); }}, 'Cancelar'));
        }
        card.appendChild(miniCard);
      });
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
