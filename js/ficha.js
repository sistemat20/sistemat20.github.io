// ============ TELA DE FICHA (Ficha / Itens / Magias / Evolução) ============

// ============ TELA DE FICHA (Personagem / Poderes / Ataques / Mochila / Magias / Perícias / Itens / Evolução) ============

const MENU_SECOES = [
  ['personagem','Personagem','🧙'],
  ['magias','Magias','📖'],
  ['itens','Itens','🎒'],
  ['guia','Evolução','📈'],
];

// Personagem e Perícias viraram um card só que desliza — em vez de precisar ir no menu, é só
// arrastar pro lado. A animação do arraste em si acontece TODA fora do ciclo de render() (só
// manipula style.transform direto no elemento) — importante porque esse app reconstrói a tela
// inteira a cada atualização (inclusive o sincronismo automático a cada 12s), e se o arraste
// passasse por lá, uma atualização caindo no meio do gesto trocaria o elemento por baixo do dedo
// da pessoa. Só quando o gesto termina (solta o dedo) é que a troca de aba vira de verdade
// (state.tab muda e um render() só acontece então).
function renderPersonagemComSwipeParaPericias(){
  const wrap = el('div',{style:'overflow:hidden;position:relative;'});
  const naPericias = state.tab==='pericias';

  const pontos = el('div',{style:'display:flex;justify-content:center;gap:6px;padding:8px 0 2px;'},
    el('div',{style:'width:7px;height:7px;border-radius:50%;transition:all 200ms;background:'+(!naPericias?'var(--gold)':'var(--line)')+';'+(!naPericias?'width:20px;border-radius:4px;':'')}),
    el('div',{style:'width:7px;height:7px;border-radius:50%;transition:all 200ms;background:'+(naPericias?'var(--gold)':'var(--line)')+';'+(naPericias?'width:20px;border-radius:4px;':'')})
  );
  wrap.appendChild(pontos);

  const track = el('div',{style:'display:flex;width:200%;transition:transform 220ms ease;transform:translateX('+(naPericias?'-50%':'0')+');'});
  track.appendChild(el('div',{style:'width:50%;flex-shrink:0;'}, renderPersonagemScreen()));
  track.appendChild(el('div',{style:'width:50%;flex-shrink:0;'}, renderPericias()));
  wrap.appendChild(track);
  wrap.appendChild(el('div',{class:'meta', style:'text-align:center;padding:4px 0 8px;opacity:0.6;'}, naPericias ? '› arraste pra voltar' : '‹ arraste pra ver Perícias ›'));

  let inicioX = null, deslocamentoAtual = 0;
  const larguraContainer = ()=> wrap.offsetWidth || 380;
  wrap.addEventListener('touchstart', (e)=>{
    if(e.touches.length!==1) return;
    inicioX = e.touches[0].clientX;
    deslocamentoAtual = 0;
    state._arrastandoPersonagemPericias = true;
    track.style.transition = 'none';
  }, {passive:true});
  wrap.addEventListener('touchmove', (e)=>{
    if(inicioX===null) return;
    deslocamentoAtual = e.touches[0].clientX - inicioX;
    const basePercent = naPericias ? -50 : 0;
    const deltaPercent = (deslocamentoAtual / larguraContainer()) * 50;
    const novoPercent = Math.max(-50, Math.min(0, basePercent + deltaPercent));
    track.style.transform = 'translateX('+novoPercent+'%)';
  }, {passive:true});
  const finalizarGesto = ()=>{
    if(inicioX===null) return;
    track.style.transition = 'transform 220ms ease';
    const limiar = larguraContainer() * 0.18;
    let novaAba = state.tab;
    if(deslocamentoAtual < -limiar && !naPericias) novaAba = 'pericias';
    else if(deslocamentoAtual > limiar && naPericias) novaAba = 'personagem';
    track.style.transform = 'translateX('+(novaAba==='pericias'?'-50%':'0')+')';
    inicioX = null; deslocamentoAtual = 0;
    state._arrastandoPersonagemPericias = false;
    if(novaAba !== state.tab){
      setTimeout(()=>{ state.tab = novaAba; render(); }, 220);
    }
  };
  wrap.addEventListener('touchend', finalizarGesto, {passive:true});
  wrap.addEventListener('touchcancel', finalizarGesto, {passive:true});

  return wrap;
}

function renderMenuOverlay(){
  const overlay = el('div',{class:'menu-overlay', onclick:(e)=>{ if(e.target===e.currentTarget){ state._menuAberto=false; render(); } }});
  const sheet = el('div',{class:'menu-sheet'});

  sheet.appendChild(el('div',{class:'lista-secao-titulo'}, 'Navegar'));
  MENU_SECOES.forEach(([id,label,ico])=>{
    sheet.appendChild(el('button',{class:'menu-item'+(state.tab===id?' active':''), onclick:()=>{ state.tab=id; state._menuAberto=false; render(); }},
      el('span',{class:'ico'}, ico), el('span',{}, label)
    ));
  });

  sheet.appendChild(el('div',{class:'lista-secao-titulo'}, 'Esta ficha'));
  const pendencias = detectarPendencias(fichaAtual());
  sheet.appendChild(el('button',{class:'menu-item', style: pendencias.length>0 ? 'color:var(--red-bright);' : '', onclick:()=>{ state._menuAberto=false; state._pendenciasAberto=true; render(); }},
    pendencias.length>0 ? el('span',{class:'selo-cera', style:'position:static;width:20px;height:20px;font-size:0.62rem;flex-shrink:0;'}, '!') : el('span',{class:'ico'}, '📋'),
    el('span',{}, 'Pendências'+(pendencias.length>0?' ('+pendencias.length+')':''))
  ));
  sheet.appendChild(el('button',{class:'menu-item', onclick:()=>{ state._menuAberto=false; state._logAberto=true; render(); }},
    el('span',{class:'ico'}, '📜'), el('span',{}, 'Log de Alterações')
  ));
  const temParaDesfazer = !!(state._paraDesfazer && state._paraDesfazer[fichaAtual().id]);
  sheet.appendChild(el('button',{class:'menu-item', style: temParaDesfazer ? '' : 'opacity:0.45;', onclick:()=>{
    if(!temParaDesfazer){ flashMsg('Não tem nada recente pra desfazer.'); return; }
    desfazerUltimaAlteracao(fichaAtual());
  }},
    el('span',{class:'ico'}, '↩️'), el('span',{}, 'Desfazer Última Alteração')
  ));
  sheet.appendChild(el('button',{class:'menu-item', onclick:()=>{ state._menuAberto=false; baixarBackupFicha(fichaAtual()); }},
    el('span',{class:'ico'}, '💾'), el('span',{}, 'Baixar Cópia de Segurança')
  ));

  sheet.appendChild(el('div',{class:'lista-secao-titulo'}, 'Preferências'));
  sheet.appendChild(el('button',{class:'menu-item', onclick:()=>{ alternarNotificacaoSom(); render(); }},
    el('span',{class:'ico'}, notificacaoSomAtiva()?'🔔':'🔕'), el('span',{}, notificacaoSomAtiva()?'Aviso Sonoro/Vibração: Ligado':'Aviso Sonoro/Vibração: Desligado')
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
    sheet.appendChild(el('div',{class:'tip', style:'margin:6px 14px;font-size:0.78rem;'}, 'Mostrando as '+log.length+' alterações mais recentes (mais nova primeiro).'));
    const lista = el('div',{style:'margin:0 14px;'});
    log.forEach(entrada=>{
      const data = new Date(entrada.ts);
      const horaTxt = data.toLocaleDateString('pt-BR')+' '+data.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
      lista.appendChild(el('div',{style:'padding:8px 0;border-bottom:1px solid var(--line);'},
        el('div',{}, entrada.texto),
        el('div',{class:'meta', style:'font-size:0.68rem;'}, horaTxt)
      ));
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
    const card = el('div',{class:'panel', style:'margin:8px 14px;'});
    card.appendChild(el('h2',{}, '⚠️ '+p.titulo));
    card.appendChild(el('div',{class:'tip'}, p.resumo));

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
  const f = fichaAtual();
  // Vinheta escura e distorcida nas bordas da tela — bem sutil, referenciando a própria
  // Tormenta (o fenômeno caótico que corrompe Arton) como metáfora visual de "você está por um
  // fio". Só aparece morto ou sangrando à beira da morte (não em qualquer PV baixo — isso
  // ficaria cansativo de olhar durante um combate normal).
  const emPerigoDeMorte = estaMorto(f) || (estaInconsciente(f) && !f.estabilizado);
  const wrap = el('div',{class: emPerigoDeMorte ? 'vinheta-tormenta' : ''});
  const secaoAtual = MENU_SECOES.find(s=>s[0]===state.tab) || MENU_SECOES[0];

  wrap.appendChild(el('header',{class:'top'},
    el('div',{style:'display:flex;justify-content:space-between;align-items:center;gap:10px;'},
      el('button',{class:'btn ghost', style:'width:auto;flex-shrink:0;padding:6px 12px;background:transparent;border-color:var(--ink);color:var(--ink);', onclick:()=>{ pararAtualizacaoAutomaticaJogador(); state.screen='perfis'; state.perfilAtualId=null; render(); }}, '← Perfis'),
      el('h1',{class:'display', style:'font-size:1.1rem;margin:0;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;text-align:center;'}, f.nome || 'Personagem'),
      (()=>{
        // Selo de cera no próprio botão de Menu quando tem pendência — antes só aparecia DENTRO
        // do menu, ou seja, a pessoa precisava abrir pra descobrir que tinha algo pendente.
        // Reaproveita a mesma peça visual usada no card do personagem em Perfis.
        const temPendencia = detectarPendencias(f).length > 0;
        const btnMenu = el('button',{class:'menu-trigger', style:'flex-shrink:0;position:relative;', onclick:()=>{ state._menuAberto=true; render(); }},
          el('span',{}, secaoAtual[2]), el('span',{},'Menu')
        );
        if(temPendencia){
          btnMenu.appendChild(el('span',{class:'selo-cera', style:'top:-8px;left:auto;right:-8px;width:20px;height:20px;font-size:0.62rem;', title:detectarPendencias(f).length+' pendência(s)'}, '!'));
        }
        return btnMenu;
      })()
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
  if(state._enviarDinheiroFluxo){
    wrap.appendChild(renderPopupEnviarDinheiro(fichaAtual()));
  }
  if(state._moedaPopup){
    wrap.appendChild(renderPopupMoeda(fichaAtual()));
  }
  if(state._escolherJogadorRelFluxo){
    wrap.appendChild(renderPopupEscolherJogadorRel(fichaAtual()));
  }
  if(state._escolherMapaFluxo){
    wrap.appendChild(renderPopupEscolherMapa(fichaAtual()));
  }
  if(state._perfilJogadorPopup){
    wrap.appendChild(renderPopupPerfilJogador());
  }
  if(state._usarMagiaPopup){
    wrap.appendChild(renderPopupUsarMagia(fichaAtual()));
  }
  if(state._efeitoItemPopup){
    wrap.appendChild(renderPopupEfeitoItemCustom(fichaAtual()));
  }
  if(state._golpePessoalPopup){
    wrap.appendChild(renderPopupGolpePessoal(fichaAtual()));
  }
  if(state._visualizarMapaPopup){
    wrap.appendChild(renderPopupVisualizarMapa());
  }
  if(state._pendenciasAberto){
    wrap.appendChild(renderPopupPendencias(fichaAtual()));
  }
  if(state._logAberto){
    wrap.appendChild(renderPopupLog(fichaAtual()));
  }
  const semMenuAberto = !state._menuAberto && !state._divindadeFluxo && !state._cropperFoto && !(state.levelUp&&state.levelUp.aberto) && !state._enviarItemFluxo && !state._enviarDinheiroFluxo && !state._moedaPopup && !state._escolherJogadorRelFluxo && !state._escolherMapaFluxo && !state._perfilJogadorPopup && !state._usarMagiaPopup && !state._efeitoItemPopup && !state._golpePessoalPopup && !state._visualizarMapaPopup && !state._pendenciasAberto && !state._logAberto;
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
  if(state.tab === 'personagem' || state.tab === 'pericias') main.appendChild(renderPersonagemComSwipeParaPericias());
  if(state.tab === 'itens') main.appendChild(renderItensCompleto());
  if(state.tab === 'magias') main.appendChild(renderMagias());
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

// Patamares de progressão (Novato/Veterano/Campeão/Lenda) — usados na trilha de progressão e
// também na moldura do retrato (fica com a cor do patamar atual do personagem).
const PATAMARES = [
  {nome:'Novato', de:1, ate:4, cor:'#7c1f1f'},
  {nome:'Veterano', de:5, ate:10, cor:'#8a6a1e'},
  {nome:'Campeão', de:11, ate:16, cor:'#2c3a52'},
  {nome:'Lenda', de:17, ate:20, cor:'#3b5c3b'},
];
function patamarAtual(nivel){
  return PATAMARES.find(p=> nivel>=p.de && nivel<=p.ate) || PATAMARES[0];
}

function flashMsg(msg){
  state.addMsg = msg;
  render();
  setTimeout(()=>{ if(state.addMsg===msg){ state.addMsg=''; render(); } }, 2200);
}

// Aviso "o Mestre te mandou algo" — além do toast na tela, toca um som curto e vibra (se o
// aparelho suportar), pra não passar batido quando o celular tá de lado sem estar olhando.
// Pode ser desligado no Menu; a preferência fica salva no aparelho (não na ficha).
const CHAVE_NOTIFICACAO_SOM = 'painel_aventureiro_notif_som';
function notificacaoSomAtiva(){
  try{ return localStorage.getItem(CHAVE_NOTIFICACAO_SOM) !== 'off'; }catch(e){ return true; }
}
function alternarNotificacaoSom(){
  const ligar = !notificacaoSomAtiva();
  try{ localStorage.setItem(CHAVE_NOTIFICACAO_SOM, ligar ? 'on' : 'off'); }catch(e){}
  flashMsg(ligar ? '🔔 Aviso sonoro/vibração ligado.' : '🔕 Aviso sonoro/vibração desligado.');
}
function tocarSomNotificacao(){
  try{
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine'; osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime+0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+0.55);
    osc.start(); osc.stop(ctx.currentTime+0.6);
  }catch(e){ /* navegador sem suporte a áudio — sem problema, o toast/vibração continuam */ }
}
function notificarComSom(msg){
  flashMsg(msg);
  if(!notificacaoSomAtiva()) return;
  if(navigator.vibrate){ try{ navigator.vibrate([90,60,90]); }catch(e){} }
  tocarSomNotificacao();
}

// Mesma ideia do aviso de turno (osciladores simples via Web Audio, sem nenhum arquivo de
// áudio) — mas dois toques DIFERENTES, pra momentos diferentes. Level up é uma ocasião rara,
// então ganha um arpejo de 3 notas subindo (uma pequena fanfarra). Salvar manual (o botão
// "Salvar ficha", não os salvamentos automáticos em segundo plano — esses aconteceriam a cada
// campo editado, seria irritante demais) ganha só um "tec" suave de confirmação.
function tocarSomLevelUp(){
  if(!notificacaoSomAtiva()) return;
  try{
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    [523.25, 659.25, 783.99].forEach((freq, i)=>{ // Dó-Mi-Sol, um acorde maior clássico de "conquista"
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'triangle'; osc.frequency.value = freq;
      const inicio = ctx.currentTime + i*0.09;
      gain.gain.setValueAtTime(0.001, inicio);
      gain.gain.exponentialRampToValueAtTime(0.14, inicio+0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, inicio+0.5);
      osc.start(inicio); osc.stop(inicio+0.55);
    });
  }catch(e){ /* sem suporte a áudio, sem problema */ }
}
function tocarSomSalvar(){
  if(!notificacaoSomAtiva()) return;
  try{
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine'; osc.frequency.value = 660;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.1, ctx.currentTime+0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+0.18);
    osc.start(); osc.stop(ctx.currentTime+0.2);
  }catch(e){ /* sem suporte a áudio, sem problema */ }
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
  const f = fichaAtual();
  f.equip.push({tipo:'geral', item:it.n, qtd:'1', carga:String(it.esp), vestido:!!vestir});
  registrarLog(f, (vestir?'Vestiu: ':'Adicionou à mochila: ')+it.n);
  salvarPerfis();
  flashMsg(vestir ? '"'+it.n+'" vestido — já contando nos 4 slots (aba Ficha).' : '"'+it.n+'" adicionado à mochila (aba Ficha).');
}

// Adiciona uma poção mágica ou item mágico nomeado (arma/armadura específica, acessório) à
// mochila — esses itens não têm "equipar" próprio no app (efeitos únicos), então só guardam.
// Descobre o jeito certo de guardar um item na mochila a partir só do nome — se for uma arma/
// armadura/escudo mágico específico do catálogo (ex: "Arco do Poder"), conecta com o item base
// de verdade (dá pra equipar com as estatísticas certas); senão, cai como item genérico comum.
// `nomeBusca` é o nome "limpo" pra procurar no catálogo (sem sufixo tipo "(recebido do Mestre)"),
// `nomeExibicao` é o que aparece pro jogador (pode ter o sufixo).
function montarEntradaMochila(nomeExibicao, esp, nomeBusca){
  const busca = nomeBusca || nomeExibicao;
  const armaEsp = (typeof ARMAS_ESPECIFICAS!=='undefined') ? ARMAS_ESPECIFICAS.find(a=>a.nome===busca) : null;
  if(armaEsp){
    const base = ARMAS.find(a=>a.n===armaEsp.base);
    if(base) return {tipo:'arma', ref:base.n, item:nomeExibicao, qtd:'1', carga:String(base.esp||1), superior:true, bonusTesteExtra:0, bonusDanoExtra:0, melhoriasTxt:armaEsp.desc};
  }
  const armaduraEsp = (typeof ARMADURAS_ESPECIFICAS!=='undefined') ? ARMADURAS_ESPECIFICAS.find(a=>a.nome===busca) : null;
  if(armaduraEsp){
    const baseArmadura = ARMADURAS.find(a=>a.n===armaduraEsp.base);
    if(baseArmadura) return {tipo:'armadura', ref:baseArmadura.n, item:nomeExibicao, qtd:'1', carga:String(baseArmadura.esp||1), superior:true, bonusDefExtra:0, bonusPenExtra:0, melhoriasTxt:armaduraEsp.desc};
    const baseEscudo = ESCUDOS.find(a=>a.n===armaduraEsp.base);
    if(baseEscudo) return {tipo:'escudo', ref:baseEscudo.n, item:nomeExibicao, qtd:'1', carga:String(baseEscudo.esp||1), superior:true, bonusDefExtra:0, bonusPenExtra:0, melhoriasTxt:armaduraEsp.desc};
  }
  return {tipo:'geral', item:nomeExibicao, qtd:'1', carga:String(esp||1)};
}
function addItemMagicoGenerico(nome, esp){
  const f = fichaAtual();
  f.equip.push(montarEntradaMochila(nome, esp, nome));
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
    registrarLog(f, 'Equipou a arma: '+armaMontada.nome);
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
    registrarLog(f, 'Equipou a armadura: '+f.armadura.nome);
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
    registrarLog(f, 'Equipou o escudo: '+f.escudo.nome);
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
  registrarLog(f, 'Aprendeu a magia: '+s.n);
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
  tocarSomSalvar();
}

// Log de alterações — um histórico simples do que foi feito na ficha, pra quem tá jogando ter
// uma ideia do que aconteceu (e o Mestre também, ao ver a ficha completa). Guarda só os 50 mais
// recentes, do mais novo pro mais antigo.
function registrarLog(f, texto){
  if(!f.log) f.log = [];
  f.log.unshift({ts: Date.now(), texto});
  if(f.log.length > 50) f.log.length = 50;
}

// Baixa a ficha inteira como um arquivo .json — uma cópia de segurança que não depende da
// planilha do Mestre. Pode ser reaberta depois com "Importar Cópia de Segurança" na tela de
// Perfis, ou só guardada como backup mesmo.
function baixarBackupFicha(f){
  const conteudo = JSON.stringify(f, null, 2);
  const blob = new Blob([conteudo], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const nomeArquivo = 'backup_'+(f.nome||'personagem').replace(/[^a-zA-Z0-9À-ÿ_-]/g,'_')+'_'+new Date().toISOString().slice(0,10)+'.json';
  const a = document.createElement('a');
  a.href = url; a.download = nomeArquivo;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
  flashMsg('💾 Backup de "'+(f.nome||'personagem')+'" baixado!');
}
// Lê um arquivo .json de backup e devolve a ficha (ou null se não for um backup válido).
async function lerArquivoBackup(arquivo){
  try{
    const texto = await arquivo.text();
    const dados = JSON.parse(texto);
    if(!dados || typeof dados!=='object' || !dados.nome) return null;
    return dados;
  }catch(e){ return null; }
}

// Restaura o personagem pro estado de ANTES do último salvamento (guardado automaticamente
// dentro de salvarPerfis()). Funciona pra qualquer tipo de mudança — PV, level up, item, magia,
// condição etc. — sem precisar de um botão específico "desfazer level up", "desfazer PV" etc.
// Só guarda 1 passo pra trás: desfazer de novo logo em seguida volta pro estado anterior a esse
// (funciona como um "alternar" entre os dois últimos estados, não um histórico longo).
async function desfazerUltimaAlteracao(f){
  const anterior = state._paraDesfazer && state._paraDesfazer[f.id];
  if(!anterior){ flashMsg('Não tem nada recente pra desfazer.'); return; }
  if(!confirm('Desfazer a última alteração salva nessa ficha? Isso volta pro estado de antes do último salvamento.')) return;
  const idx = state.perfis.findIndex(p=>p.id===f.id);
  if(idx<0) return;
  state.perfis[idx] = JSON.parse(JSON.stringify(anterior));
  await salvarPerfis();
  flashMsg('↩️ Última alteração desfeita.');
  state._menuAberto = false;
  render();
}

// ============ RENDER ============

function bindInput(obj, key, type, aoMudar){
  const i = el('input',{type: type||'text', value: obj[key] ?? '', oninput: (e)=>{ obj[key] = e.target.value; }, onchange: aoMudar||null});
  return i;
}

function renderCampoDivindade(f){
  const wrap = el('div',{});
  const fluxo = state._divindadeFluxo;

  if(f.divindade){
    wrap.appendChild(el('div',{},
      el('label',{},'Divindade'),
      el('div',{class:'valor-fixo'}, f.divindade),
      listaPoderesConcedidos(f).length>0 ? el('div',{class:'meta', style:'color:var(--gold);'}, 'Poder'+(listaPoderesConcedidos(f).length>1?'es concedidos: ':' concedido: ')+listaPoderesConcedidos(f).map(pc=>pc.nome).join(', ')) : null,
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
// Decide se, depois de escolher um poder concedido, precisa pedir um SEGUNDO (Clérigo/Druida/
// Paladino recebem dois) ou se já pode gravar tudo na ficha e fechar o fluxo.
function finalizarEscolhaPoderConcedido(f, deusNome, poderEscolhido, fluxo, numeroAtual, precisaDoSegundo){
  if(precisaDoSegundo && numeroAtual===1){
    state._divindadeFluxo = {passo:'poder', deus:deusNome, numeroPoder:2, poder1:poderEscolhido};
    state._poderExpandido = null;
    render();
    return;
  }
  const poderes = numeroAtual===2 ? [fluxo.poder1, poderEscolhido] : [poderEscolhido];
  f.divindade = deusNome;
  f.poderesConcedidos = poderes.map(p=>({nome:p.nome, deus:deusNome, sub:p.sub||[]}));
  f.poderConcedido = f.poderesConcedidos[0];
  state._divindadeFluxo = null;
  state._poderExpandido = null;
  salvarPerfis();
  flashMsg(numeroAtual===2 ? '✅ Poderes concedidos escolhidos!' : '✅ Poder concedido escolhido!');
  render();
}
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
        f.poderesConcedidos = [];
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
        f.divindade = 'Panteão'; f.poderConcedido = null; f.poderesConcedidos = []; f.panteaoEnergia = 'positiva';
        state._divindadeFluxo = null; salvarPerfis(); flashMsg('✅ Agora você cultua o Panteão (energia positiva).'); render();
      }}, 'Energia Positiva'),
      el('button',{class:'btn', onclick:()=>{
        f.divindade = 'Panteão'; f.poderConcedido = null; f.poderesConcedidos = []; f.panteaoEnergia = 'negativa';
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
    const classesDoisPoderes = ['Clérigo','Druida','Paladino'];
    const precisaDoSegundo = classesDoisPoderes.some(c=>(f.classesNiveis||[]).some(cn=>cn.classe===c));
    const numeroAtual = fluxo.numeroPoder || 1;
    sheet.appendChild(el('div',{class:'wizard-title', style:'padding:6px 14px 0;'}, (numeroAtual===2?'2º poder':'Poder')+' concedido de '+deus.nome));
    if(numeroAtual===2){
      sheet.appendChild(el('div',{class:'tip', style:'margin:0 14px 8px;font-size:0.78rem;'}, 'Sua classe recebe dois Poderes Concedidos — 1º já escolhido: '+fluxo.poder1.nome+'.'));
    }
    deus.poderes.filter(nomePoder=> numeroAtual!==2 || nomePoder!==fluxo.poder1.nome).forEach(nomePoder=>{
      const info = PODERES_CONCEDIDOS.find(p=>p.nome===nomePoder);
      const aberto = state._poderExpandido === nomePoder;
      const item = el('button',{class:'menu-item'+(aberto?' active':''), onclick:()=>{
        if(aberto){
          const escolhaInfo = PODER_CONCEDIDO_TREINA_PERICIA_ESCOLHA[nomePoder];
          if(escolhaInfo){
            state._divindadeFluxo = {passo:'escolhaPericia', deus:deus.nome, poder:nomePoder, numeroPoder:numeroAtual, poder1:fluxo.poder1};
            state._divindadeEscolhaSub = [];
          } else {
            finalizarEscolhaPoderConcedido(f, deus.nome, {nome:nomePoder}, fluxo, numeroAtual, precisaDoSegundo);
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
    const classesDoisPoderes2 = ['Clérigo','Druida','Paladino'];
    const precisaDoSegundo2 = classesDoisPoderes2.some(c=>(f.classesNiveis||[]).some(cn=>cn.classe===c));
    const numeroAtual2 = fluxo.numeroPoder || 1;
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
      finalizarEscolhaPoderConcedido(f, deus.nome, {nome:fluxo.poder, sub:state._divindadeEscolhaSub.slice()}, fluxo, numeroAtual2, precisaDoSegundo2);
      state._divindadeEscolhaSub = null;
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
      el('label',{class:'foto-upload', style:'border-color:'+patamarAtual(nivelTotal(f)).cor+';box-shadow:0 0 0 3px var(--bg-2), 0 0 0 5px '+patamarAtual(nivelTotal(f)).cor+', inset 0 0 14px rgba(0,0,0,0.45), 0 3px 8px var(--shadow);'},
        f.foto ? el('img',{src:f.foto}) : el('span',{class:'foto-placeholder'},'📷'),
        el('input',{type:'file', accept:'image/*', style:'display:none;', onchange:(e)=>{ if(e.target.files[0]) handleFotoUpload(f, e.target.files[0]); }})
      ),
      el('div',{},
        el('div',{class:'meta'}, f.foto ? 'Toque na foto pra trocar' : 'Toque pra adicionar uma foto'),
        el('div',{class:'meta', style:'color:'+patamarAtual(nivelTotal(f)).cor+';font-weight:700;margin-top:2px;'}, '◆ '+patamarAtual(nivelTotal(f)).nome)
      )
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
          el('div',{class: state._levelUpCelebrando ? 'selo-nivel-flash' : '', style:'font-weight:800;font-size:1.3rem;padding:6px 0;'}, nivelTotal(f)),
          el('button',{class:'btn', style:'width:auto;padding:8px 14px;', onclick:()=>{ abrirLevelUp(); }},'Level Up ⬆')
        )
      ),
    ),
    el('div',{class:'row'},
      el('div',{},
        el('label',{},'Deslocamento'),
        el('div',{class:'valor-fixo'}, deslocamentoEfetivo(f)+'m'+(deslocamentoEfetivo(f)!==(parseInt(f.deslocamento)||9) ? ' (base '+(parseInt(f.deslocamento)||9)+'m)' : '')),
        // Deslocamentos alternativos da raça (escalada/natação/voo) — antes ficavam só no texto
        // do traço racial, sem lugar nenhum pra consultar rápido durante a sessão.
        ...deslocamentosAlternativos(f).map(d=>
          el('div',{class:'meta', style:'color:var(--gold);margin-top:2px;'}, d.tipo+': '+d.valor+'m'+(d.obs?' ('+d.obs+')':''))
        ),
      ),
      renderCampoDivindade(f),
    )
  ));

  if(state.levelUp && state.levelUp.aberto){
    // O Level Up agora é um pop-up renderizado no nível mais alto da tela (renderFichaScreen),
    // pelo mesmo motivo do popup de divindade: painéis com transform "prendem" um position:fixed
    // aninhado dentro deles, escondendo o popup atrás de outros painéis.
  }

  // Vida & Mana e Defesa vêm logo aqui, ANTES de Atributos — são os números que você realmente
  // fica olhando toda hora numa sessão de jogo; Atributos você define uma vez e quase nunca
  // mexe de novo, então não precisa disputar espaço com o que importa durante o combate.
  const pvMax = pvMaxEfetivo(f), pvAtual = parseInt(f.pvatual)||0;
  const pmMax = pmMaxEfetivo(f), pmAtual = parseInt(f.pmatual)||0;
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

  wrap.appendChild(el('div',{class:'panel faixa'},
    el('h2',{},'Atributos'),
    el('div',{class:'row6'},
      ...['for','des','con','int','sab','car'].map(a=>
        // onchange (dispara ao sair do campo, não a cada tecla) recalcula e redesenha a tela na
        // hora — sem isso, o valor mudava por baixo dos panos mas o aviso de "Carisma efetivo"
        // logo abaixo só se atualizava depois de alguma OUTRA ação (trocar de aba, por exemplo).
        // Foi exatamente esse atraso que confundiu um jogador (relatou não saber se tinha
        // funcionado), então isso não é só um efeito bonito, é uma correção de verdade.
        el('div',{class:'attr-box'}, el('div',{class:'lbl'}, a.toUpperCase()), bindInput(f,a,'number',()=>{ salvarPerfis(); render(); }))
      )
    ),
    penalidadeCarismaTormenta(f)>0 ? el('div',{class:'tip', style:'margin-top:8px;border:1px solid var(--red-bright);'},
      '☣️ Carisma efetivo: '+atributoEfetivo(f,'car')+' (o '+f.car+' digitado acima −'+penalidadeCarismaTormenta(f)+' pelos '+qtdPoderesTormenta(f)+' Poder(es) da Tormenta que você tem — já aplicado nas perícias baseadas em Carisma).'
    ) : null
  ));

  wrap.appendChild(renderPainelCondicoes(f));
  const painelLembretes = renderPainelLembretesMecanicos(f);
  if(painelLembretes) wrap.appendChild(painelLembretes);
  // Manobras de Combate foi movido pra Notas (agora colapsável, junto com Proficiências,
  // Poderes, Habilidades Iniciais e Descanso).
  wrap.appendChild(renderItensEquipados());
  wrap.appendChild(renderPainelVestidos(f));

  return wrap;
}

// Manobras de combate (Agarrar, Derrubar, Desarmar, Empurrar, Quebrar) usam exatamente o teste
// de Luta corpo a corpo do personagem, como um "teste de manobra" oposto ao alvo (pág. 234) —
// não é uma conta separada, só reaproveita o valor de Luta já calculado. Esse painel só deixa
// isso visível, com o valor pronto e um lembrete rápido do que cada manobra faz.
const MANOBRAS_COMBATE = [
  ['Agarrar', 'Alvo fica desprevenido e imóvel, –2 em ataques, só ataca com arma leve. Ele se solta com ação padrão vencendo o teste de novo.'],
  ['Derrubar', 'Alvo cai no chão. Vencendo por 5+, também empurra 1 quadrado.'],
  ['Desarmar', 'Item na mão do alvo cai no chão. Vencendo por 5+, também empurra o item 1 quadrado.'],
  ['Empurrar', 'Empurra o alvo 1,5m; +1,5m a cada 5 pontos de diferença no teste.'],
  ['Quebrar', 'Ataca um item que o alvo segura (ver estatísticas de objetos).'],
];
function renderPainelManobrasColapsavel(f){
  const lutaInfo = PERICIAS.find(p=>p.nome==='Luta');
  const valorManobra = lutaInfo ? periciaValor(f, lutaInfo) : 0;
  return renderSecaoNotasColapsavel('manobras-combate', '⚔️', 'Manobras de Combate',
    'Teste: '+(valorManobra>=0?'+':'')+valorManobra, ()=>{
    const corpo = [el('div',{class:'tip'}, el('b',{},'Seu teste de manobra: '+(valorManobra>=0?'+':'')+valorManobra), 'É o mesmo valor de Luta corpo a corpo — a manobra é um teste oposto contra o alvo (mesmo que ele lute à distância, ele usa a Luta dele pra resistir). Não dá pra fazer manobra com ataque à distância.')];
    const grid = el('div',{class:'option-grid'});
    MANOBRAS_COMBATE.forEach(([nome,desc])=>{
      grid.appendChild(el('div',{class:'option-card', style:'cursor:default;'},
        el('div',{class:'opt-nome'}, nome),
        el('div',{class:'opt-sub'}, desc)
      ));
    });
    corpo.push(grid);
    return corpo;
  });
}

// Painel de condições ativas — toque pra ligar/desligar. Mostra só o nome nas escolhidas de
// cara; toda a lista só aparece quando o jogador toca em "Gerenciar condições".
// Central de Lembretes Mecânicos — coisas que o personagem TEM, mas que o sistema não tem como
// calcular em nenhum número da ficha (resistência a veneno, redução de dano por tipo, etc). Sem
// isso, era fácil esquecer que um efeito desses existe, já que não aparece em lugar nenhum.
// Cada entrada é opcional: "poder" (checa nomesPoderesConhecidos) ou "item" (checa se tem
// equipado, entre esotéricos ou geral vestido).
const LEMBRETES_MECANICOS = [
  {poder:'Natureza Venenosa', texto:'+5 de resistência a veneno; pode envenenar sua arma (1d12 de dano).'},
  {poder:'Sangue Frio', texto:'Sofre +1 de dano por dado de dano de frio.'},
  {poder:'Ossos Frágeis', texto:'Sofre +1 de dano por dado de dano de impacto.'},
  {poder:'Cria da Tormenta', texto:'+5 de resistência contra efeitos da Tormenta.'},
  {poder:'Conhecimento das Rochas', texto:'+2 em Percepção e Sobrevivência enquanto estiver no subterrâneo.'},
  {poder:'Tradição de Heredrimm', texto:'Machados, martelos, marretas e picaretas são armas simples pra você; +1 no dano com elas.'},
  {item:'Costela de lich', texto:'Suas magias causam +1d6 de dano de trevas extra. Enquanto empunhada, você NÃO recupera PV por cura mágica.'},
  {item:'Ankh Solar', texto:'Magias com teste de resistência ganham o aprimoramento: quem falha também não recupera PV por 1 rodada (+2 PM).'},
  {item:'Tomo do Rancor', texto:'Magias de dano ganham o aprimoramento: +2d8+2 de dano extra, escolha o tipo (+2 PM).'},
];
function lembretesAtivos(f){
  const nomesPoderes = nomesPoderesConhecidos(f);
  // Traços FIXOS da raça (tipo Natureza Venenosa da Medusa) nunca são "escolhidos" — ficam só na
  // definição da raça, nunca copiados pra dentro da ficha do personagem. nomesPoderesConhecidos
  // não pega isso, por isso soma aqui separado.
  const racaObjLembrete = getRacaObj(f);
  const nomesTracoRaca = racaObjLembrete ? (racaObjLembrete.poderes||[]).map(p=>p[0]) : [];
  const nomesItens = new Set([
    ...(f.esotericos||[]).filter(e=>e.equipado!==false).map(e=>e.nome),
    ...itensVestidosAtivos(f).map(fonte=>fonte.nome),
  ]);
  return LEMBRETES_MECANICOS.filter(l=> (l.poder && (nomesPoderes.includes(l.poder) || nomesTracoRaca.includes(l.poder))) || (l.item && nomesItens.has(l.item)) );
}
function renderPainelLembretesMecanicos(f){
  const ativos = lembretesAtivos(f);
  if(ativos.length===0) return null;
  return renderSecaoNotasColapsavel('lembretes-mecanicos', '📌', 'Lembretes pra Mesa',
    ativos.length+' item(ns) — o sistema não calcula isso sozinho', ()=>{
    const corpo = [el('div',{class:'tip', style:'font-size:0.78rem;'}, 'Esse personagem tem poder(es)/item(ns) com efeito que a ficha não tem como somar em nenhum número (resistência a tipo de dano, veneno, etc). Fica aqui só pra não esquecer na mesa.')];
    ativos.forEach(l=>{
      corpo.push(el('div',{class:'power-item'}, el('b',{}, l.poder||l.item), l.texto));
    });
    return corpo;
  }, true);
}

function renderPainelCondicoes(f){
  const ativas = condicoesAtivas(f);
  return renderSecaoNotasColapsavel('condicoes-ativas', '☣️', 'Condições Ativas',
    ativas.length>0 ? ativas.length+' ativa(s)' : 'Nenhuma agora', ()=>{
    const corpo = [];
    if(!state._gerenciandoCondicoes){
      if(ativas.length===0){
        corpo.push(el('div',{class:'empty'},'Nenhuma condição ativa agora.'));
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
        corpo.push(row);
      }
      corpo.push(el('button',{class:'btn ghost', style:'margin-top:10px;', onclick:()=>{ state._gerenciandoCondicoes=true; render(); }}, 'Gerenciar condições'));
      if(f.condicoesNota){
        corpo.push(el('div',{class:'meta', style:'margin-top:8px;color:var(--gold);'}, '📝 '+f.condicoesNota));
      }
    } else {
      corpo.push(el('div',{class:'tip', style:'font-size:0.78rem;'}, 'Condições com ⚡ já entram sozinhas no cálculo de Defesa/perícias/deslocamento. As outras são mais sobre o que dá ou não dá pra fazer no turno — combine com o Mestre na hora.'));
      const row = el('div',{class:'option-grid'});
      CONDICOES_LISTA.forEach(([nome,desc])=>{
        const marcado = ativas.includes(nome);
        const temEfeito = !!CONDICOES_EFEITOS[nome];
        row.appendChild(el('button',{class:'option-card '+(marcado?'selected':''), onclick:()=>alternarCondicao(f,nome)},
          el('div',{class:'opt-nome'}, nome+(temEfeito?' ⚡':'')),
          el('div',{class:'opt-sub'}, desc)
        ));
      });
      corpo.push(row);
      corpo.push(el('label',{style:'margin-top:10px;'},'Nota livre (ex: "Veneno 2d6/turno", "Sangramento leve")'));
      corpo.push(el('input',{id:'condicoes-nota', type:'text', value:f.condicoesNota||'', oninput:(e)=>{f.condicoesNota=e.target.value;}, onchange:()=>{salvarPerfis();}}));
      corpo.push(el('button',{class:'btn ghost', style:'margin-top:10px;', onclick:()=>{ state._gerenciandoCondicoes=false; render(); }}, 'Fechar'));
    }
    return corpo;
  }, ativas.length>0);
}

function renderPersonagemNotas(){
  const f = fichaAtual();
  const wrap = el('div',{});

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

  // ---- Manobras de Combate ----
  wrap.appendChild(renderPainelManobrasColapsavel(f));

  // ---- Poderes ----
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
  (f.poderesClasse||[]).forEach((p,indiceOriginal)=>{
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
    entradasPoderes.push({nome: p.nome + (p.sub?(' — '+p.sub):''), chaveBase:p.nome, fonte:'Nível '+p.nivel+' de '+p.classe+(p.trocaPorGeral?' (trocado)':''), desc, indicePoderesClasse: indiceOriginal});
  });
  wrap.appendChild(renderSecaoNotasColapsavel('poderes', '⚡', 'Poderes',
    entradasPoderes.length+' poder(es)', ()=>{
    if(entradasPoderes.length===0) return [el('div',{class:'empty'},'Nenhum poder registrado ainda.')];
    return entradasPoderes.map((entrada, idx)=>{
      const limite = tipoLimiteUso(entrada.desc);
      const usado = limite ? poderFoiUsado(f, entrada.chaveBase) : false;
      const ehAutomatizado = PODERES_AUTOMATIZADOS.has(entrada.chaveBase);
      const ehGolpePessoal = entrada.chaveBase==='Golpe Pessoal' && entrada.indicePoderesClasse!=null;
      const golpeRow = ehGolpePessoal ? f.poderesClasse[entrada.indicePoderesClasse] : null;
      const golpeJaConstruido = golpeRow && golpeRow.golpeConstruido && golpeRow.golpeConstruido.arma;
      return renderItemColapsavel('poder-'+idx+'-'+entrada.nome, entrada.nome+(usado?' (usado)':''), entrada.fonte, [
        el('div',{class:'meta', style:'margin-bottom:4px;'+(ehAutomatizado?'color:var(--gold);':'')},
          ehAutomatizado ? '⚡ Já calculado na ficha automaticamente' : '📖 Só referência — acompanhe o efeito na mesa'
        ),
        el('div',{class:'desc'}, entrada.desc),
        limite ? el('button',{class:'btn ghost', style:'margin-top:8px;'+(usado?'opacity:0.6;':''), onclick:(e)=>{ e.stopPropagation(); alternarUsoPoder(f, entrada.chaveBase); }}, usado ? '↺ Marcar como disponível de novo' : '✓ Marcar como usado ('+limite+')') : null,
        ehGolpePessoal ? el('div',{style:'margin-top:8px;'},
          golpeJaConstruido ? el('div',{class:'tip', style:'margin-bottom:6px;'},
            el('div',{}, el('b',{}, golpeRow.golpeConstruido.nomeGolpe||'Seu golpe'), ' — ', golpeRow.golpeConstruido.arma, ' · ', el('b',{style:'color:var(--gold);'}, calcularCustoGolpePessoal(golpeRow.golpeConstruido.escolhas)+' PM')),
            el('div',{style:'margin-top:4px;'}, Object.keys(golpeRow.golpeConstruido.escolhas||{}).filter(n=>golpeRow.golpeConstruido.escolhas[n]>0).map(n=> n+(golpeRow.golpeConstruido.escolhas[n]>1?' ×'+golpeRow.golpeConstruido.escolhas[n]:'')).join(', '))
          ) : null,
          el('div',{class:'row', style:'gap:6px;'},
            el('button',{class:'btn ghost', style:'flex:1;', onclick:(e)=>{ e.stopPropagation(); abrirConstrutorGolpePessoal(entrada.indicePoderesClasse); }}, golpeJaConstruido ? '✏️ Reconstruir' : '🔨 Construir Golpe'),
            golpeJaConstruido ? el('button',{class:'btn ghost', style:'flex:1;', onclick:(e)=>{ e.stopPropagation(); usarGolpePessoal(f, entrada.indicePoderesClasse); }}, '⚔️ Usar (-'+calcularCustoGolpePessoal(golpeRow.golpeConstruido.escolhas)+' PM)') : null
          )
        ) : null
      ]);
    });
  }));

  // ---- Habilidades Iniciais ----
  const habilidadesDeNivel = habilidadesAutomaticasDeNiveis(f);
  wrap.appendChild(renderSecaoNotasColapsavel('habilidades-iniciais', '🎁', 'Habilidades Iniciais',
    ((f.habilidadesIniciais||[]).length+habilidadesDeNivel.length)+' registrada(s)', ()=>{
    const corpo = [el('div',{class:'tip', style:'font-size:0.8rem;'}, 'Habilidades de raça, itens de origem e outras concessões iniciais — não precisam ser anotadas manualmente.')];
    if((!f.habilidadesIniciais || f.habilidadesIniciais.length===0) && habilidadesDeNivel.length===0){
      corpo.push(el('div',{class:'empty'},'Nada registrado ainda.'));
    } else {
      (f.habilidadesIniciais||[]).forEach((h, idx)=>{
        corpo.push(renderItemColapsavel('habinicial-'+idx+'-'+h.nome, h.nome, h.fonte, [
          el('div',{class:'desc'}, h.desc)
        ]));
      });
      // Habilidades ganhas em níveis específicos (não da criação) — usa o mesmo card clicável
      // dos outros itens da lista (renderItemColapsavel), não um estilo diferente. Só não têm
      // descrição própria guardada (só o texto curto da tabela de classe), daí o aviso pra
      // consultar o livro em vez de um texto explicativo de verdade.
      habilidadesDeNivel.forEach((h, idx)=>{
        corpo.push(renderItemColapsavel('habnivel-'+idx+'-'+h.nome, h.nome, h.fonte, [
          el('div',{class:'desc'}, h.desc || 'Ainda não temos o texto exato dessa habilidade cadastrado — consulte o livro (Cap. 1, tabela de progressão da classe) pra descrição completa.')
        ]));
      });
    }
    return corpo;
  }));

  // ---- Descanso ----
  wrap.appendChild(renderSecaoNotasColapsavel('descanso', '🌙', 'Descanso',
    '+'+Math.floor(nivelTotal(f)*Math.max(...Object.values(QUALIDADE_DESCANSO)))+' PV/PM (no melhor caso)', ()=>{
    const corpo = [el('div',{class:'tip', style:'font-size:0.78rem;'},
      f.raca==='Golem'
        ? 'Golem (Criatura Artificial): fica inerte por 8h em vez de dormir. Recupera PV e PM normalmente, mas sempre no ritmo Normal (nível '+nivelTotal(f)+') — não é afetado por condições boas ou ruins de descanso.'
        : 'Uma noite de sono (8h+) recupera PV e PM iguais ao seu nível ('+nivelTotal(f)+') vezes a qualidade do descanso, e reinicia poderes de uso "por cena" e "por dia" (pág. 106 do livro).'
    )];
    if(f._descansoBonusPendente && (f._descansoBonusPendente.pv>0 || f._descansoBonusPendente.pm>0)){
      corpo.push(el('div',{class:'meta', style:'color:var(--gold);margin-top:4px;'}, '🍲 Bônus guardado de comida: +'+f._descansoBonusPendente.pv+' PV/nível e +'+f._descansoBonusPendente.pm+' PM/nível no próximo descanso.'));
    }
    const rowDescanso = el('div',{class:'option-grid', style:'margin-top:8px;'});
    Object.keys(QUALIDADE_DESCANSO).forEach(qualidade=>{
      const valorRecup = f.raca==='Golem' ? nivelTotal(f) : Math.floor(nivelTotal(f)*QUALIDADE_DESCANSO[qualidade]);
      rowDescanso.appendChild(el('button',{class:'option-card', onclick:()=>aplicarDescanso(f, qualidade)},
        el('div',{class:'opt-nome'}, qualidade),
        // PV em vermelho e PM em azul, as mesmas cores dos cards de Vida/Mana na Ficha
        el('div',{class:'opt-sub'},
          el('span',{style:'color:var(--pv-accent);'}, '+'+valorRecup+' PV'),
          ' · ',
          el('span',{style:'color:var(--pm-accent);'}, '+'+valorRecup+' PM'),
          f.raca==='Golem' ? ' (sempre)' : ''
        )
      ));
    });
    corpo.push(rowDescanso);
    corpo.push(el('button',{class:'btn ghost', style:'margin-top:10px;', onclick:()=>novaCena(f)}, 'Nova Cena 🎬 (só reinicia poderes "por cena", sem recuperar PV/PM)'));
    return corpo;
  }));

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

  wrap.appendChild(renderPainelMissoes(f));
  wrap.appendChild(renderPainelFaccoes(f));
  wrap.appendChild(renderPainelRelacionamentos(f));
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
  const pendentes = f.missoes.filter(m=>!m.concluida).length;
  const resumo = f.missoes.length===0 ? null : (pendentes>0 ? pendentes+' pendente(s)' : 'Tudo concluído ✓');
  return renderSecaoNotasColapsavel('missoes', '📜', 'Missões', resumo, ()=>{
    const corpo = [];
    if(f.missoes.length===0){
      corpo.push(el('div',{class:'empty'},'Nenhuma missão anotada ainda.'));
    } else {
      f.missoes.forEach((m,idx)=>{
        corpo.push(el('div',{class:'row', style:'align-items:center;margin-top:4px;'},
          el('button',{class:'btn ghost', style:'width:auto;padding:4px 10px;flex-shrink:0;', onclick:()=>{ m.concluida=!m.concluida; salvarPerfis(); render(); }}, m.concluida?'✓':'○'),
          el('div',{style:'flex:1;'+(m.concluida?'text-decoration:line-through;color:var(--ink-soft);':'')}, m.texto),
          el('button',{class:'remove-x', onclick:()=>{ f.missoes.splice(idx,1); salvarPerfis(); render(); }},'✕')
        ));
      });
    }
    if(!state._novaMissaoTexto) state._novaMissaoTexto = '';
    corpo.push(el('input',{id:'nova-missao', type:'text', placeholder:'nova missão ou objetivo...', style:'margin-top:8px;', value:state._novaMissaoTexto, oninput:(e)=>{state._novaMissaoTexto=e.target.value;}}));
    corpo.push(el('button',{class:'btn ghost', onclick:()=>{
      if(!state._novaMissaoTexto.trim()) return;
      f.missoes.push({texto:state._novaMissaoTexto.trim(), concluida:false});
      state._novaMissaoTexto = '';
      salvarPerfis(); render();
    }}, 'Adicionar missão +'));
    return corpo;
  });
}

// ---- Facções: reputação simples (amigo/neutro/inimigo) com grupos importantes ----
const CICLO_STATUS_FACCAO = ['neutro','amigo','inimigo'];
const ICONE_STATUS_FACCAO = {neutro:'😐 Neutro', amigo:'🤝 Amigo', inimigo:'⚔️ Inimigo'};
function renderPainelFaccoes(f){
  if(!f.faccoes) f.faccoes = [];
  return renderSecaoNotasColapsavel('faccoes', '🏳️', 'Facções',
    f.faccoes.length>0 ? f.faccoes.length+' registrada(s)' : null, ()=>{
    const corpo = [];
    if(f.faccoes.length===0){
      corpo.push(el('div',{class:'empty'},'Nenhuma facção anotada ainda.'));
    } else {
      f.faccoes.forEach((fac,idx)=>{
        corpo.push(el('div',{class:'row', style:'align-items:center;margin-top:4px;'},
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
    corpo.push(el('input',{id:'nova-faccao', type:'text', placeholder:'nome da facção/grupo...', style:'margin-top:8px;', value:state._novaFaccaoNome, oninput:(e)=>{state._novaFaccaoNome=e.target.value;}}));
    corpo.push(el('button',{class:'btn ghost', onclick:()=>{
      if(!state._novaFaccaoNome.trim()) return;
      f.faccoes.push({nome:state._novaFaccaoNome.trim(), status:'neutro'});
      state._novaFaccaoNome = '';
      salvarPerfis(); render();
    }}, 'Adicionar facção +'));
    return corpo;
  });
}

// ---- Relacionamentos: PNJs importantes pro personagem (aliados, rivais, família...) ----
const TIPOS_RELACIONAMENTO = ['Aliado','Rival','Família','Mentor','Amor','Outro'];
const ICONE_RELACIONAMENTO = {Aliado:'🤝', Rival:'⚔️', Família:'👪', Mentor:'📖', Amor:'❤️', Outro:'👤'};
function renderPainelRelacionamentos(f){
  if(!f.relacionamentos) f.relacionamentos = [];
  return renderSecaoNotasColapsavel('relacionamentos', '👥', 'Relacionamentos',
    f.relacionamentos.length>0 ? f.relacionamentos.length+' registrado(s)' : null, ()=>{
    const corpo = [el('div',{class:'tip', style:'font-size:0.78rem;'}, 'PNJs importantes pro seu personagem — aliados, rivais, família, quem for. Toque num nome pra ver/editar a nota. Também dá pra vincular a outro personagem de verdade da mesa.')];
    if(f.relacionamentos.length===0){
      corpo.push(el('div',{class:'empty'},'Nenhum relacionamento anotado ainda.'));
    } else {
      f.relacionamentos.forEach((rel,idx)=>{
        const aberto = state._relacionamentoAberto === idx;
        const card = el('div',{class:'option-card', style:'margin-top:8px;cursor:pointer;', onclick:(e)=>{ if(e.target.closest('button')) return; state._relacionamentoAberto = aberto?null:idx; render(); }},
          el('div',{class:'row', style:'align-items:center;'},
            el('div',{style:'flex:1;'},
              el('div',{class:'opt-nome'}, ICONE_RELACIONAMENTO[rel.tipo]||'👤', ' ', rel.nome, rel.personagemId?' 🔗':''),
              el('div',{class:'opt-sub'}, rel.tipo)
            ),
            rel.personagemId ? el('button',{class:'btn ghost', style:'width:auto;padding:5px 10px;font-size:0.7rem;flex-shrink:0;', onclick:(e)=>{ e.stopPropagation(); abrirPerfilJogador(rel.personagemId); }}, '👁️ Perfil') : null,
            el('button',{class:'remove-x', onclick:()=>{ if(!confirm('Remover "'+rel.nome+'" dos relacionamentos?')) return; f.relacionamentos.splice(idx,1); salvarPerfis(); render(); }},'✕')
          )
        );
        if(aberto){
          if(!rel.personagemId){
            card.appendChild(el('input',{type:'text', value:rel.nome, placeholder:'nome do PNJ', style:'margin-top:8px;', oninput:(e)=>{rel.nome=e.target.value;}, onchange:()=>{salvarPerfis(); render();}, onclick:(e)=>e.stopPropagation()}));
          } else {
            card.appendChild(el('div',{class:'meta', style:'margin-top:8px;color:var(--gold);'}, '🔗 Vinculado a um personagem de verdade da mesa — o nome acompanha automaticamente.'));
          }
          const selTipo = el('select',{style:'margin-top:6px;', onchange:(e)=>{rel.tipo=e.target.value; salvarPerfis(); render();}, onclick:(e)=>e.stopPropagation()});
          TIPOS_RELACIONAMENTO.forEach(t=> selTipo.appendChild(el('option',{value:t, ...(rel.tipo===t?{selected:'selected'}:{})}, t)));
          card.appendChild(selTipo);
          card.appendChild(textareaAutoResize({oninput:(e)=>{rel.nota=e.target.value;}, onchange:()=>salvarPerfis(), onclick:(e)=>e.stopPropagation(), placeholder:'quem é, como se conheceram, o que sente por essa pessoa...'}, rel.nota||''));
        }
        corpo.push(card);
      });
    }
    if(!state._novoRelNome) state._novoRelNome = '';
    corpo.push(el('input',{id:'novo-rel-nome', type:'text', placeholder:'nome do PNJ...', style:'margin-top:10px;', value:state._novoRelNome, oninput:(e)=>{state._novoRelNome=e.target.value;}}));
    corpo.push(el('div',{class:'row', style:'margin-top:6px;gap:8px;'},
      el('button',{class:'btn ghost', style:'flex:1;', onclick:()=>{
        if(!state._novoRelNome.trim()) return;
        f.relacionamentos.push({nome:state._novoRelNome.trim(), tipo:'Aliado', nota:'', personagemId:null});
        registrarLog(f, 'Novo relacionamento anotado: '+state._novoRelNome.trim());
        state._novoRelNome = '';
        salvarPerfis(); render();
      }}, 'Adicionar PNJ +'),
      el('button',{class:'btn ghost', style:'flex:1;', onclick:abrirEscolherJogadorRelacionamento}, '👤 Vincular jogador')
    ));
    return corpo;
  });
}

// ---- Locais: diário de exploração simples (onde estivemos + uma nota) ----
function renderPainelLocais(f){
  if(!f.locais) f.locais = [];
  return renderSecaoNotasColapsavel('locais', '🗺️', 'Locais',
    f.locais.length>0 ? f.locais.length+' visitado(s)' : null, ()=>{
    const corpo = [];
    if(f.locais.length===0){
      corpo.push(el('div',{class:'empty'},'Nenhum local anotado ainda.'));
    } else {
      f.locais.forEach((loc,idx)=>{
        corpo.push(el('div',{style:'margin-top:6px;padding-bottom:6px;border-bottom:1px solid var(--line);'},
          el('div',{class:'row', style:'align-items:flex-start;'},
            el('div',{style:'flex:1;'},
              loc.mapaUrl
                ? el('div',{style:'font-weight:700;cursor:pointer;color:var(--gold);', onclick:()=>abrirVisualizarMapa(loc.nome, loc.mapaUrl)}, '🗺️ ', loc.nome)
                : el('div',{style:'font-weight:700;'}, loc.nome),
              el('input',{id:'local-nota-'+idx, type:'text', placeholder:'nota (opcional)', value:loc.nota||'', style:'margin-top:4px;', oninput:(e)=>{loc.nota=e.target.value;}, onchange:()=>salvarPerfis()})
            ),
            el('button',{class:'remove-x', onclick:()=>{ f.locais.splice(idx,1); salvarPerfis(); render(); }},'✕')
          )
        ));
      });
    }
    if(!state._novoLocalNome) state._novoLocalNome = '';
    corpo.push(el('input',{id:'novo-local', type:'text', placeholder:'nome do lugar...', style:'margin-top:10px;', value:state._novoLocalNome, oninput:(e)=>{state._novoLocalNome=e.target.value;}}));
    corpo.push(el('div',{class:'row', style:'margin-top:6px;gap:8px;'},
      el('button',{class:'btn ghost', style:'flex:1;', onclick:()=>{
        if(!state._novoLocalNome.trim()) return;
        f.locais.push({nome:state._novoLocalNome.trim(), nota:''});
        state._novoLocalNome = '';
        salvarPerfis(); render();
      }}, 'Adicionar local +'),
      el('button',{class:'btn ghost', style:'flex:1;', onclick:abrirEscolherMapaMestre}, '🗺️ Mapa do Mestre')
    ));
    return corpo;
  });
}

// Liga uma arma de disparo à munição correspondente na mochila. Arco usa flecha, besta usa
// virote — sem isso, o jogador tinha que ir na Mochila procurar e editar a quantidade na mão.
const MUNICAO_POR_ARMA = [
  {padraoArma:/arco/i, itemMunicao:'Flechas (20)'},
  {padraoArma:/besta/i, itemMunicao:'Virotes (20)'},
];
function municaoDaArma(f, arma){
  const regra = MUNICAO_POR_ARMA.find(r=> r.padraoArma.test(arma.nome||''));
  if(!regra) return null;
  const idx = (f.equip||[]).findIndex(row=> row.tipo==='geral' && nomeBaseItem(row.item)===regra.itemMunicao);
  if(idx<0) return null;
  return {nome: regra.itemMunicao.replace(' (20)',''), qtd: parseInt(f.equip[idx].qtd)||0, idx};
}
function gastarMunicao(f, idx){
  const row = f.equip[idx];
  if(!row) return;
  const atual = parseInt(row.qtd)||0;
  if(atual<=0) return;
  row.qtd = String(atual-1);
  registrarLog(f, 'Disparou (−1 '+row.item.replace(' (20)','')+', restam '+row.qtd+')');
  salvarPerfis(); render();
}

function renderItensEquipados(){
  const f = fichaAtual();
  const temAlgo = (f.armas.length>0) || ((f.esotericos||[]).length>0);
  const totalItens = f.armas.length + (f.esotericos||[]).length;
  return renderSecaoNotasColapsavel('itens-equipados', '⚔️', 'Itens Equipados',
    temAlgo ? totalItens+' equipado(s)' : 'Nada equipado', ()=>{
    if(!temAlgo){
      return [el('div',{class:'empty'},'Nada equipado ainda. Vá na aba Itens para buscar e equipar armas ou esotéricos.')];
    }
    const corpo = [];
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
      // Munição — pra arma de disparo, mostra quanto tem na mochila e deixa gastar sem precisar
      // ir procurar lá. Antes só dava pra acompanhar indo na Mochila e editando a quantidade.
      const municao = municaoDaArma(f, a);
      if(municao){
        card.appendChild(el('div',{class:'row', style:'align-items:center;margin-top:6px;gap:8px;'},
          el('div',{class:'meta', style:'flex:1;'+(municao.qtd<=0?'color:var(--red-bright);':'color:var(--gold);')},
            '🏹 '+municao.nome+': '+municao.qtd+(municao.qtd<=0?' — acabou!':'')),
          municao.qtd>0 ? el('button',{class:'btn ghost', style:'width:auto;padding:5px 10px;font-size:0.7rem;flex-shrink:0;', onclick:()=>gastarMunicao(f, municao.idx)}, 'Disparar (−1)') : null
        ));
      }
      corpo.push(card);
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
      corpo.push(card);
    });

    corpo.push(el('div',{class:'meta', style:'font-size:0.68rem;color:var(--ink-soft);margin-top:6px;'}, '📦 guarda na mochila (dá pra reequipar depois). 🔮 marca itens esotéricos.'));
    return corpo;
  }, temAlgo);
}

// "Usar" um item consumível da mochila — desconta 1 da quantidade, e se chegar a 0, remove o
// item sozinho (com um aviso, pra não sumir sem explicação).
// Itens que prometem "bônus na próxima noite de sono" — sem isso, usar o item só descontava a
// quantidade e o bônus nunca chegava a valer nada quando o descanso de verdade acontecia.
// Efeitos do Golpe Pessoal (Guerreiro, pág. 65-66 do livro) — a descrição do poder só falava
// "escolha efeitos de uma lista no livro" sem trazer a lista de verdade; sem isso não tinha
// como montar um golpe de fato. Custo negativo = reduz o custo total (mínimo 1 PM no total).
const EFEITOS_GOLPE_PESSOAL = [
  {nome:'Amplo', custo:3, desc:'Seu ataque atinge todas as criaturas em alcance curto (incluindo aliados, mas não você mesmo). Um único teste de ataque, comparado com a Defesa de cada criatura.'},
  {nome:'Atordoante', custo:2, desc:'Uma criatura que sofra dano do ataque fica atordoada por 1 rodada (1x por cena; Fortitude CD For anula).'},
  {nome:'Brutal', custo:1, repetivel:true, desc:'Fornece um dado extra de dano do mesmo tipo. Pode escolher mais de uma vez.'},
  {nome:'Conjurador', custo:1, custoVariavel:true, desc:'Escolha uma magia de 1º/2º círculo com alvo criatura ou área. Se acertar, lança a magia como ação livre no alvo/ponto atingido. Custo = custo da magia + 1 PM.'},
  {nome:'Destruidor', custo:2, desc:'Aumenta o multiplicador de crítico em +1.'},
  {nome:'Distante', custo:1, desc:'Aumenta o alcance em um passo (corpo a corpo → curto → médio → longo). O resto não muda.'},
  {nome:'Elemental', custo:2, repetivel:true, desc:'+2d6 de dano de ácido, eletricidade, fogo ou frio. Pode escolher mais vezes pra somar mais +2d6.'},
  {nome:'Impactante', custo:1, desc:'Empurra o alvo 1,5m para cada 10 pontos de dano causado (arredondado pra baixo).'},
  {nome:'Letal', custo:2, maxVezes:2, desc:'+2 na margem de ameaça. Escolhido 2x, vira +5 (não +4) — a segunda vez substitui o total, não soma.'},
  {nome:'Penetrante', custo:1, desc:'Ignora 10 pontos de RD.'},
  {nome:'Preciso', custo:1, desc:'No teste de ataque, rola dois dados e usa o melhor resultado.'},
  {nome:'Qualquer Arma', custo:1, desc:'Pode usar esse Golpe Pessoal com qualquer tipo de arma (em vez de travado numa arma específica).'},
  {nome:'Ricocheteante', custo:1, desc:'A arma volta pra sua mão depois do ataque. Só com armas de arremesso.'},
  {nome:'Teleguiado', custo:1, desc:'Ignora penalidade por camuflagem ou cobertura leves.'},
  {nome:'Lento', custo:-2, desc:'Exige ação completa pra usar (em vez do normal).'},
  {nome:'Perto da Morte', custo:-2, desc:'Só pode ser usado se você estiver com 1/4 dos PV ou menos.'},
  {nome:'Sacrifício', custo:-2, desc:'Toda vez que usa esse Golpe Pessoal, perde 10 PV.'},
];
function calcularCustoGolpePessoal(escolhas){
  // escolhas: {nomeEfeito: quantidade}
  let total = 0;
  Object.keys(escolhas||{}).forEach(nome=>{
    const ef = EFEITOS_GOLPE_PESSOAL.find(e=>e.nome===nome);
    if(ef && escolhas[nome]>0) total += ef.custo * escolhas[nome];
  });
  return Math.max(1, total); // mínimo 1 PM no total, mesmo com efeitos negativos
}

const ITENS_BONUS_PROXIMO_DESCANSO = {
  'Prato do aventureiro': {pv:1, pm:0},
  'Sopa de peixe': {pv:0, pm:1},
  'Gorlogg Ensopado': {pv:1, pm:1},
};
function usarItemMochila(f, idx){
  const row = f.equip[idx];
  if(!row) return;
  const atual = parseInt(row.qtd)||0;
  const nomeSemSufixo = nomeBaseItem(row.item);
  const bonusDescanso = ITENS_BONUS_PROXIMO_DESCANSO[nomeSemSufixo];
  let mensagemExtra = '';
  if(bonusDescanso){
    if(!f._descansoBonusPendente) f._descansoBonusPendente = {pv:0, pm:0};
    f._descansoBonusPendente.pv += bonusDescanso.pv;
    f._descansoBonusPendente.pm += bonusDescanso.pm;
    mensagemExtra = ' Bônus guardado pro próximo descanso.';
  }
  // Gorad quente (achado numa auditoria): diferente dos outros alimentos, dá PM temporário NA
  // HORA (não "na próxima noite de sono") — nunca tinha sido conectado.
  if(nomeSemSufixo==='Gorad quente'){
    f.pmtemp = (parseInt(f.pmtemp)||0) + 2;
    mensagemExtra = ' +2 PM temporários.';
  }
  if(atual <= 1){
    f.equip.splice(idx,1);
    flashMsg('✨ Usou o último '+row.item+' — removido da mochila.'+mensagemExtra);
  } else {
    row.qtd = String(atual-1);
    flashMsg('✨ Usou 1 '+row.item+' ('+row.qtd+' restante'+(atual-1>1?'s':'')+').'+mensagemExtra);
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

// Popup que abre ao tocar numa das 3 caixas de moeda — "Receber" no topo (soma uma quantidade
// e já salva na hora, sem precisar editar um campo solto e torcer pra ter salvado) e "Enviar
// dinheiro" embaixo (abre o fluxo de escolher destinatário, já com essa moeda pré-selecionada).
function renderPopupMoeda(f){
  const campo = state._moedaPopup.campo;
  const rotulo = {tc:'TC (cobre)', ts:'T$ (padrão)', to:'TO (ouro)'}[campo];
  if(!state._moedaPopup.receberValor) state._moedaPopup.receberValor = '';
  const overlay = el('div',{class:'menu-overlay', onclick:(e)=>{ if(e.target===e.currentTarget){ state._moedaPopup=null; render(); } }});
  const sheet = el('div',{class:'menu-sheet'});
  sheet.appendChild(el('div',{class:'wizard-title', style:'padding:6px 14px 0;'}, rotulo));
  sheet.appendChild(el('div',{class:'tip', style:'margin:6px 14px;'}, 'Você tem: '+(parseInt(f[campo])||0)+' '+rotulo));
  const conteudo = el('div',{style:'padding:0 14px;'},
    el('label',{},'Quantidade a receber'),
    el('input',{type:'number', value:state._moedaPopup.receberValor, oninput:(e)=>{state._moedaPopup.receberValor=e.target.value;}}),
    el('button',{class:'btn', style:'margin-top:8px;', onclick:()=>{
      const valor = parseInt(state._moedaPopup.receberValor);
      if(!valor || valor<=0){ flashMsg('Digita uma quantidade válida primeiro.'); return; }
      f[campo] = (parseInt(f[campo])||0) + valor;
      registrarLog(f, 'Recebeu '+valor+' '+rotulo);
      salvarPerfis();
      flashMsg('✅ +'+valor+' '+rotulo+'!');
      state._moedaPopup = null;
      render();
    }}, '✓ Receber')
  );
  sheet.appendChild(conteudo);
  sheet.appendChild(el('div',{class:'secao-divisor', style:'margin:14px;'}));
  sheet.appendChild(el('div',{style:'padding:0 14px;'},
    el('button',{class:'btn ghost', onclick:()=>{ state._moedaPopup=null; abrirEnviarDinheiro(campo); }}, '📤 Enviar dinheiro')
  ));
  sheet.appendChild(el('button',{class:'menu-close', style:'margin-top:14px;', onclick:()=>{ state._moedaPopup=null; render(); }}, 'Fechar'));
  overlay.appendChild(sheet);
  return overlay;
}

// Busca os mapas que o Mestre enviou (usa o código especial de Mestre, o mesmo que
// ehCodigoMestre reconhece — funciona mesmo sem o jogador saber qual é o código do Mestre,
// porque só existe UM Mestre por mesa/planilha).
function abrirEscolherMapaMestre(){
  state._escolherMapaFluxo = {mapas:null, carregando:true};
  render();
  carregarMestreDadosPorCodigo(CODIGO_MESTRE_ESPECIAL).then(dados=>{
    if(!state._escolherMapaFluxo) return;
    state._escolherMapaFluxo.mapas = dados.mapas || [];
    state._escolherMapaFluxo.carregando = false;
    render();
  });
}
function renderPopupEscolherMapa(f){
  const fluxo = state._escolherMapaFluxo;
  const overlay = el('div',{class:'menu-overlay', onclick:(e)=>{ if(e.target===e.currentTarget){ state._escolherMapaFluxo=null; render(); } }});
  const sheet = el('div',{class:'menu-sheet'});
  sheet.appendChild(el('div',{class:'wizard-title', style:'padding:6px 14px 0;'}, 'Mapas do Mestre'));
  if(fluxo.carregando){
    sheet.appendChild(el('div',{class:'empty'}, 'Carregando mapas...'));
  } else if(!fluxo.mapas || fluxo.mapas.length===0){
    sheet.appendChild(el('div',{class:'empty'}, 'O Mestre ainda não enviou nenhum mapa.'));
  } else {
    fluxo.mapas.forEach(mapa=>{
      sheet.appendChild(el('button',{class:'menu-item', style:'height:auto;padding:10px 14px;', onclick:()=>{
        if(!f.locais) f.locais = [];
        f.locais.push({nome:mapa.nome, nota:'', mapaUrl:mapa.url});
        registrarLog(f, 'Adicionou local com mapa do Mestre: '+mapa.nome);
        salvarPerfis();
        state._escolherMapaFluxo = null;
        render();
      }},
        mapa.url ? el('img',{src:mapa.url, style:'width:40px;height:40px;object-fit:cover;border-radius:6px;flex-shrink:0;'}) : el('span',{class:'ico'},'🗺️'),
        el('span',{}, mapa.nome)
      ));
    });
  }
  sheet.appendChild(el('button',{class:'menu-close', onclick:()=>{ state._escolherMapaFluxo=null; render(); }}, 'Cancelar'));
  overlay.appendChild(sheet);
  return overlay;
}

// Fluxo de vincular um relacionamento a um personagem de verdade da mesa — reaproveita a mesma
// lista leve usada pra escolher destino de item/dinheiro.
// Efeito customizado num item personalizado (fora do catálogo) — lista curada dos tipos mais
// pedidos (bônus de perícia, PM, PV), reaproveitando exatamente as mesmas estruturas que os
// itens de verdade do catálogo já usam (bonusPericia/bonusRecurso), só que guardado direto na
// linha do item em vez de numa definição fixa. Cobrir TODO efeito possível do jogo seria uma
// tarefa enorme; isso cobre os pedidos mais comuns de item homebrew.
function descricaoEfeitoCustom(efeito){
  if(efeito.tipo==='bonusPericia') return '+'+efeito.valor+' em '+efeito.pericia;
  if(efeito.tipo==='bonusPM') return '+'+efeito.valor+' PM';
  if(efeito.tipo==='bonusPV') return '+'+efeito.valor+' PV';
  return '—';
}
function abrirEfeitoItemCustom(idx){
  const f = fichaAtual();
  const atual = f.equip[idx].efeitoCustom;
  state._efeitoItemPopup = {
    idx,
    tipo: atual ? atual.tipo : 'bonusPericia',
    pericia: atual && atual.tipo==='bonusPericia' ? atual.pericia : PERICIAS[0].nome,
    valor: atual ? String(atual.valor) : '1',
  };
  render();
}
function renderPopupEfeitoItemCustom(f){
  const fluxo = state._efeitoItemPopup;
  const row = f.equip[fluxo.idx];
  const overlay = el('div',{class:'menu-overlay', onclick:(e)=>{ if(e.target===e.currentTarget){ state._efeitoItemPopup=null; render(); } }});
  const sheet = el('div',{class:'menu-sheet'});
  sheet.appendChild(el('div',{class:'wizard-title', style:'padding:6px 14px 0;'}, 'Efeito de "'+(row?row.item:'')+'"'));
  sheet.appendChild(el('div',{class:'tip', style:'margin:6px 14px;'}, 'Esse efeito só vale enquanto o item estiver vestido (conta contra o limite de 4 itens vestidos, igual qualquer outro).'));
  const conteudo = el('div',{style:'padding:0 14px;'});
  conteudo.appendChild(el('label',{},'Tipo de efeito'));
  const selTipo = el('select',{onchange:(e)=>{fluxo.tipo=e.target.value; render();}});
  [['bonusPericia','Bônus fixo numa perícia'],['bonusPM','Bônus de PM (mana máxima)'],['bonusPV','Bônus de PV (vida máxima)']].forEach(([v,label])=>{
    selTipo.appendChild(el('option',{value:v, selected:fluxo.tipo===v?'selected':undefined}, label));
  });
  conteudo.appendChild(selTipo);
  if(fluxo.tipo==='bonusPericia'){
    conteudo.appendChild(el('label',{style:'margin-top:8px;'},'Qual perícia'));
    const selPericia = el('select',{onchange:(e)=>{fluxo.pericia=e.target.value;}});
    PERICIAS.forEach(p=> selPericia.appendChild(el('option',{value:p.nome, selected:fluxo.pericia===p.nome?'selected':undefined}, p.nome)));
    conteudo.appendChild(selPericia);
  }
  conteudo.appendChild(el('label',{style:'margin-top:8px;'},'Valor do bônus'));
  conteudo.appendChild(el('input',{type:'number', value:fluxo.valor, oninput:(e)=>{fluxo.valor=e.target.value;}}));
  sheet.appendChild(conteudo);

  sheet.appendChild(el('button',{class:'btn', style:'margin:14px 14px 0;width:calc(100% - 28px);', onclick:()=>{
    const valor = parseInt(fluxo.valor);
    if(isNaN(valor) || valor===0){ flashMsg('Coloca um valor de bônus válido primeiro.'); return; }
    if(fluxo.tipo==='bonusPericia'){
      row.efeitoCustom = {tipo:'bonusPericia', pericia:fluxo.pericia, valor};
    } else {
      row.efeitoCustom = {tipo:fluxo.tipo, valor};
    }
    registrarLog(f, 'Definiu efeito em "'+row.item+'": '+descricaoEfeitoCustom(row.efeitoCustom));
    salvarPerfis();
    flashMsg('⚡ Efeito definido: '+descricaoEfeitoCustom(row.efeitoCustom));
    state._efeitoItemPopup = null;
    render();
  }}, '✓ Salvar efeito'));
  if(row && row.efeitoCustom){
    sheet.appendChild(el('button',{class:'btn ghost', style:'margin:10px 14px 0;width:calc(100% - 28px);', onclick:()=>{
      row.efeitoCustom = null;
      salvarPerfis();
      flashMsg('Efeito removido.');
      state._efeitoItemPopup = null;
      render();
    }}, 'Remover efeito'));
  }
  sheet.appendChild(el('button',{class:'menu-close', style:'margin-top:10px;', onclick:()=>{ state._efeitoItemPopup=null; render(); }}, 'Cancelar'));
  overlay.appendChild(sheet);
  return overlay;
}

function abrirEscolherJogadorRelacionamento(){
  state._escolherJogadorRelFluxo = {lista:null, carregando:true};
  render();
  const f = fichaAtual();
  listaLeveDeTodosPersonagens().then(lista=>{
    if(!state._escolherJogadorRelFluxo) return;
    state._escolherJogadorRelFluxo.lista = lista.filter(p=>p.id!==f.id);
    state._escolherJogadorRelFluxo.carregando = false;
    render();
  });
}
function renderPopupEscolherJogadorRel(f){
  const fluxo = state._escolherJogadorRelFluxo;
  const overlay = el('div',{class:'menu-overlay', onclick:(e)=>{ if(e.target===e.currentTarget){ state._escolherJogadorRelFluxo=null; render(); } }});
  const sheet = el('div',{class:'menu-sheet'});
  sheet.appendChild(el('div',{class:'wizard-title', style:'padding:6px 14px 0;'}, 'Vincular a um jogador'));
  sheet.appendChild(el('div',{class:'tip', style:'margin:6px 14px;'}, 'O nome e a foto acompanham automaticamente esse personagem — você só escreve a relação/nota.'));
  if(fluxo.carregando){
    sheet.appendChild(el('div',{class:'empty'}, 'Carregando lista de personagens...'));
  } else if(!fluxo.lista || fluxo.lista.length===0){
    sheet.appendChild(el('div',{class:'empty'}, 'Nenhum outro personagem encontrado.'));
  } else {
    fluxo.lista.forEach(p=>{
      sheet.appendChild(el('button',{class:'menu-item', onclick:()=>{
        if(!f.relacionamentos) f.relacionamentos = [];
        if(f.relacionamentos.some(r=>r.personagemId===p.id)){ flashMsg('Já tem esse personagem nos seus relacionamentos.'); return; }
        f.relacionamentos.push({nome:p.nome, tipo:'Aliado', nota:'', personagemId:p.id});
        registrarLog(f, 'Vinculou relacionamento a: '+p.nome);
        salvarPerfis();
        state._escolherJogadorRelFluxo = null;
        render();
      }},
        el('span',{class:'ico'},'👤'), el('span',{}, p.nome+(p.jogador?' ('+p.jogador+')':''))
      ));
    });
  }
  sheet.appendChild(el('button',{class:'menu-close', onclick:()=>{ state._escolherJogadorRelFluxo=null; render(); }}, 'Cancelar'));
  overlay.appendChild(sheet);
  return overlay;
}

// "Perfil social" de um personagem — foto, nome, raça, classe. De propósito NÃO mostra PV,
// itens, dinheiro ou notas (nada disso é "informação pública" que outro personagem da mesa
// saberia só de olhar/conhecer alguém). Busca sempre fresco (não guarda cópia local), então
// sempre reflete o nome/foto/raça atuais.
function abrirPerfilJogador(personagemId){
  state._perfilJogadorPopup = {personagemId, dados:null, carregando:true};
  render();
  listaLeveDeTodosPersonagens().then(lista=>{
    if(!state._perfilJogadorPopup || state._perfilJogadorPopup.personagemId!==personagemId) return;
    state._perfilJogadorPopup.dados = lista.find(p=>p.id===personagemId) || null;
    state._perfilJogadorPopup.carregando = false;
    render();
  });
}
function renderPopupPerfilJogador(){
  const fluxo = state._perfilJogadorPopup;
  const overlay = el('div',{class:'menu-overlay', onclick:(e)=>{ if(e.target===e.currentTarget){ state._perfilJogadorPopup=null; render(); } }});
  const sheet = el('div',{class:'menu-sheet'});
  if(fluxo.carregando){
    sheet.appendChild(el('div',{class:'empty', style:'padding:24px;'}, 'Carregando perfil...'));
  } else if(!fluxo.dados){
    sheet.appendChild(el('div',{class:'empty', style:'padding:24px;'}, 'Não achei esse personagem — talvez tenha sido removido.'));
  } else {
    const p = fluxo.dados;
    const classesTxt = (p.classesNiveis||[]).map(c=>c.classe).join(' / ') || '—';
    sheet.appendChild(el('div',{style:'display:flex;flex-direction:column;align-items:center;gap:10px;padding:20px 14px 6px;'},
      el('div',{class:'foto-upload', style:'cursor:default;width:100px;height:100px;'},
        p.foto ? el('img',{src:p.foto, style:'width:100%;height:100%;object-fit:cover;'}) : el('span',{class:'foto-placeholder'},'👤')
      ),
      el('div',{class:'wizard-title', style:'margin:0;'}, p.nome),
      el('div',{class:'meta'}, (p.raca||'—')+' · '+classesTxt)
    ));
  }
  sheet.appendChild(el('button',{class:'menu-close', style:'margin-top:14px;', onclick:()=>{ state._perfilJogadorPopup=null; render(); }}, 'Fechar'));
  overlay.appendChild(sheet);
  return overlay;
}

function abrirEnviarDinheiro(campoInicial){
  state._enviarDinheiroFluxo = {campo:campoInicial||'ts', valor:'', destinoId:null, lista:null, carregando:true, enviando:false};
  render();
  const f = fichaAtual();
  listaLeveDeTodosPersonagens().then(lista=>{
    if(!state._enviarDinheiroFluxo) return; // já cancelou antes da lista chegar
    state._enviarDinheiroFluxo.lista = lista.filter(p=>p.id!==f.id);
    state._enviarDinheiroFluxo.carregando = false;
    render();
  });
}
function renderPopupEnviarDinheiro(f){
  const fluxo = state._enviarDinheiroFluxo;
  const overlay = el('div',{class:'menu-overlay', onclick:(e)=>{ if(e.target===e.currentTarget && !fluxo.enviando){ state._enviarDinheiroFluxo=null; render(); } }});
  const sheet = el('div',{class:'menu-sheet'});
  sheet.appendChild(el('div',{class:'wizard-title', style:'padding:6px 14px 0;'}, 'Enviar dinheiro'));
  const rotuloMoeda = {tc:'TC (cobre)', ts:'T$ (padrão)', to:'TO (ouro)'};
  const disponivel = parseInt(f[fluxo.campo])||0;
  const conteudo = el('div',{style:'padding:0 14px;'},
    el('label',{},'Moeda'),
    el('select',{onchange:(e)=>{ fluxo.campo=e.target.value; render(); }},
      ...['tc','ts','to'].map(c=> el('option',{value:c, selected: fluxo.campo===c?'selected':undefined}, rotuloMoeda[c]))
    ),
    el('div',{class:'meta', style:'margin-top:4px;'}, 'Você tem: '+disponivel+' '+rotuloMoeda[fluxo.campo]),
    el('label',{style:'margin-top:8px;'},'Quantidade'),
    el('input',{type:'number', value:fluxo.valor, oninput:(e)=>{fluxo.valor=e.target.value;}})
  );
  sheet.appendChild(conteudo);
  sheet.appendChild(el('div',{class:'tip', style:'margin:10px 14px;'}, 'Escolha pra quem enviar — a quantidade sai da sua ficha e vai direto pra ficha da pessoa escolhida.'));
  if(fluxo.enviando){
    sheet.appendChild(el('div',{class:'empty'}, 'Enviando...'));
  } else if(fluxo.carregando){
    sheet.appendChild(el('div',{class:'empty'}, 'Carregando lista de personagens...'));
  } else if(!fluxo.lista || fluxo.lista.length===0){
    sheet.appendChild(el('div',{class:'empty'}, 'Nenhum outro personagem encontrado.'));
  } else {
    fluxo.lista.forEach(p=>{
      sheet.appendChild(el('button',{class:'menu-item', onclick: async ()=>{
        const valor = parseInt(fluxo.valor);
        if(!valor || valor<=0){ flashMsg('Digita uma quantidade válida primeiro.'); return; }
        if(valor > disponivel){ flashMsg('Você não tem '+valor+' '+rotuloMoeda[fluxo.campo]+' pra enviar.'); return; }
        fluxo.enviando = true; render();
        const resultado = await enviarDinheiroParaOutroPersonagem(p.id, fluxo.campo, valor);
        if(resultado.ok){
          f[fluxo.campo] = (parseInt(f[fluxo.campo])||0) - valor;
          registrarLog(f, 'Enviou '+valor+' '+rotuloMoeda[fluxo.campo]+' pra '+(resultado.nomeDestino||p.nome));
          await salvarPerfis();
          flashMsg('💰 '+valor+' '+rotuloMoeda[fluxo.campo]+' enviado(s) pra '+(resultado.nomeDestino||p.nome)+'!');
          state._enviarDinheiroFluxo = null;
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
  sheet.appendChild(el('button',{class:'menu-close', onclick:()=>{ if(!fluxo.enviando){ state._enviarDinheiroFluxo=null; render(); } }}, 'Cancelar'));
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
        const nomeSemSufixo = nomeBaseItem(row.item);
        const itemCatalogo = ITENS_GERAIS.find(i=>i.n===nomeSemSufixo);
        const reconhecidoAutomatico = (itemCatalogo && itemCatalogo.vestivel) || ACESSORIOS_VESTIVEIS.has(nomeSemSufixo);
        const ehVestivel = reconhecidoAutomatico || row.marcadoVestivel;
        const ehMochilaAventureiro = nomeSemSufixo === 'Mochila de aventureiro';
        corpo.push(
          // Descrição do catálogo — faltava completamente antes (item "geral" nunca mostrava o
          // que fazia, só nome/quantidade/espaço). É aqui também que a Mochila de Aventureiro
          // mostra "aumenta sua capacidade de carga em 2 espaços" — o bônus agora é aplicado de
          // verdade (ver limiteCarga), isso só deixa claro pro jogador o que o item faz.
          itemCatalogo && itemCatalogo.desc ? el('div',{class:'desc'}, itemCatalogo.desc) : null,
          // Botão de Upgrade — só a Mochila de Aventureiro tem esse fluxo especial. É uma ação
          // deliberada do jogador (não automática só por ter o item guardado), e só pode
          // acontecer uma vez POR PERSONAGEM (não por mochila) — comprar 5 mochilas não dá +10.
          ehMochilaAventureiro && !f.mochilaAventureiroUpgrade ? el('button',{class:'btn', style:'margin-top:4px;margin-bottom:8px;', onclick:()=>{
            f.mochilaAventureiroUpgrade = true;
            registrarLog(f, 'Upgrade da Mochila de Aventureiro aplicado (+2 de capacidade de carga)');
            salvarPerfis();
            flashMsg('⬆️ Upgrade aplicado! +2 de capacidade de carga.');
            render();
          }}, '⬆️ Fazer Upgrade (+2 de capacidade)') : null,
          ehMochilaAventureiro && f.mochilaAventureiroUpgrade ? el('div',{class:'meta', style:'color:var(--gold);margin-bottom:8px;'}, '✓ Upgrade aplicado — já soma +2 na capacidade de carga') : null,
          el('label',{},'Nome'),
          el('input',{id:'mochila-nome-'+idx, type:'text', value:row.item, oninput:(e)=>{row.item=e.target.value;}, onchange:()=>{salvarPerfis(); render();}}),
          el('div',{class:'row', style:'margin-top:8px;'},
            el('div',{style:'flex:1;'}, el('label',{},'Quantidade'), el('input',{id:'mochila-qtd-'+idx, type:'text', value:row.qtd, oninput:(e)=>{row.qtd=e.target.value;}, onchange:()=>{salvarPerfis(); render();}})),
            el('div',{style:'flex:1;'}, el('label',{},'Espaço'), el('input',{id:'mochila-carga-'+idx, type:'text', value:row.carga, oninput:(e)=>{row.carga=e.target.value;}, onchange:()=>{salvarPerfis(); render();}})),
          ),
          row.vestido ? el('div',{class:'meta', style:'color:var(--gold);margin-top:4px;'},'👕 vestido') : null,
          !reconhecidoAutomatico ? el('div',{class:'row', style:'margin-top:8px;align-items:center;'},
            el('input',{type:'checkbox', id:'mochila-vestivel-'+idx, checked: row.marcadoVestivel?'checked':undefined, onchange:(e)=>{ row.marcadoVestivel=e.target.checked; if(!e.target.checked) row.vestido=false; salvarPerfis(); render(); }}),
            el('label',{for:'mochila-vestivel-'+idx, style:'margin:0;font-size:0.78rem;text-transform:none;'}, 'É um item vestível (anel, colar, roupa etc. — conta como 1 dos 4 slots vestidos)')
          ) : null,
          // Efeito customizado — só faz sentido em item vestível (o bônus só se aplica enquanto
          // vestido, igual qualquer outro item — ver itensVestidosAtivos). Item do catálogo já
          // vem com efeito prontinho; isso aqui é só pra item personalizado mesmo.
          ehVestivel ? el('div',{style:'margin-top:8px;'},
            row.efeitoCustom ? el('div',{class:'meta', style:'color:var(--gold);'}, '⚡ Efeito: '+descricaoEfeitoCustom(row.efeitoCustom)) : null,
            el('button',{class:'btn ghost', style:'margin-top:4px;', onclick:()=>abrirEfeitoItemCustom(idx)}, row.efeitoCustom?'Trocar efeito':'⚡ Definir efeito')
          ) : null,
          el('div',{class:'row', style:'margin-top:8px;'},
            (/^\d+$/.test(String(row.qtd).trim()) && parseInt(row.qtd)>0) ? el('button',{class:'btn', onclick:()=> usarItemMochila(f, idx)}, 'Usar (−1) ✨') : null,
            ehVestivel ? el('button',{class:'btn ghost', onclick:()=>{ row.vestido=!row.vestido; salvarPerfis(); render(); }}, row.vestido?'Guardar':'Vestir') : null,
            el('button',{class:'btn ghost', onclick:()=>abrirEnviarItem(idx)}, 'Enviar 📤'),
            el('button',{class:'btn ghost', onclick:()=>{ if(!confirm('Remover "'+row.item+'" da mochila? Não tem como desfazer.')) return; registrarLog(f, 'Removeu da mochila: '+row.item); f.equip.splice(idx,1); salvarPerfis(); render(); }}, 'Remover 🗑️')
          )
        );
      } else {
        // Estatísticas do catálogo (não são as mesmas de quando equipado — ali soma bônus de
        // encantos/força/proficiência do personagem; aqui é só a referência crua do item, pra
        // saber o que ele é antes de decidir equipar). Faltava completamente antes — a mochila
        // só mostrava quantidade/espaço, sem dizer o que o item de fato fazia.
        let descCatalogo = null;
        const nomeSemSufixo = nomeBaseItem(row.item);
        if(row.tipo==='arma'){
          const w = ARMAS.find(x=>x.n===nomeSemSufixo);
          if(w) descCatalogo = 'Dano '+w.dano+' · Crítico '+w.critico+' · Alcance '+w.alcance+' · '+w.tipo+(w.maos>=2?' · 2 mãos':'');
        } else if(row.tipo==='armadura'){
          const a = ARMADURAS.find(x=>x.n===nomeSemSufixo);
          if(a) descCatalogo = 'Defesa +'+a.def+' · Penalidade '+a.pen+' · '+a.cat;
        } else if(row.tipo==='escudo'){
          const e = ESCUDOS.find(x=>x.n===nomeSemSufixo);
          if(e) descCatalogo = 'Defesa +'+e.def+' · Penalidade '+e.pen;
        } else if(row.tipo==='esoterico'){
          const it = buscarItemEmpunhavel(row.refBase||nomeSemSufixo);
          if(it && it.desc) descCatalogo = it.desc;
        }
        corpo.push(
          descCatalogo ? el('div',{class:'desc'}, descCatalogo) : null,
          el('div',{class:'row', style:'margin-top:8px;'},
            el('div',{style:'flex:1;'}, el('label',{},'Quantidade'), el('input',{id:'mochila-qtd-'+idx, type:'text', value:row.qtd, oninput:(e)=>{row.qtd=e.target.value;}, onchange:()=>{salvarPerfis(); render();}})),
            el('div',{style:'flex:1;'}, el('label',{},'Espaço'), el('input',{id:'mochila-carga-'+idx, type:'text', value:row.carga, oninput:(e)=>{row.carga=e.target.value;}, onchange:()=>{salvarPerfis(); render();}})),
          ),
          el('div',{class:'row', style:'margin-top:8px;'},
            podeEquipar ? el('button',{class:'btn ghost', onclick:()=> row.tipo==='esoterico' ? equiparEsotericoDaMochila(idx) : equiparDaMochila(idx)}, 'Equipar') : null,
            el('button',{class:'btn ghost', onclick:()=>abrirEnviarItem(idx)}, 'Enviar 📤'),
            el('button',{class:'btn ghost', onclick:()=>{ if(!confirm('Remover "'+row.item+'" da mochila? Não tem como desfazer.')) return; registrarLog(f, 'Removeu da mochila: '+row.item); f.equip.splice(idx,1); salvarPerfis(); render(); }}, 'Remover 🗑️')
          )
        );
      }
      const ehMochilaAventureiroUpgradeAtiva = row.tipo==='geral' && nomeBaseItem(row.item)==='Mochila de aventureiro' && f.mochilaAventureiroUpgrade;
      const tituloExibido = ehMochilaAventureiroUpgradeAtiva ? row.item+' ⭐ (Upgrade)' : row.item;
      eqPanel.appendChild(renderItemColapsavel('mochila-'+idx, tituloExibido, rotulo+' · Qtd '+row.qtd+' · Esp '+row.carga, corpo, ehMochilaAventureiroUpgradeAtiva ? 'var(--gold)' : null));
    });
  }
  eqPanel.appendChild(el('button',{class:'btn ghost', style:'margin-top:10px;', onclick:()=>{
    f.equip.push({tipo:'geral', item:'Novo item', qtd:'1', carga:'1'});
    render();
  }}, '+ Item personalizado (fora do catálogo)'));
  wrap.appendChild(eqPanel);

  const rotuloMoedaCurta = {tc:'TC', ts:'T$', to:'TO'};
  wrap.appendChild(el('div',{class:'panel'},
    el('h2',{},'Moedas'),
    el('div',{class:'row3'},
      ...['tc','ts','to'].map(campo=>
        el('div',{class:'attr-box', style:'cursor:pointer;', onclick:()=>{ state._moedaPopup = {campo}; render(); }},
          el('div',{class:'lbl'}, rotuloMoedaCurta[campo]),
          el('div',{style:'font-family:"Cinzel",serif;font-weight:800;font-size:1.35rem;color:var(--ink);'}, parseInt(f[campo])||0)
        )
      )
    ),
    el('div',{class:'meta', style:'font-size:0.7rem;color:var(--ink-soft);margin-top:8px;'}, '1 TC = 1/10 T$ · 1 TO = 10 T$ · toque numa moeda pra receber ou enviar')
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
  const temMochila = !!f.mochilaAventureiroUpgrade;
  return el('div',{class:'panel'},
    el('h2',{},'Carga'),
    el('div',{class:'row3'},
      el('div',{class:'attr-box'}, el('div',{class:'lbl'},'Usada'), el('div',{style:'font-weight:800;'}, usada)),
      el('div',{class:'attr-box'}, el('div',{class:'lbl'},'Limite'), el('div',{style:'font-weight:800;'}, limite)),
      el('div',{class:'attr-box'}, el('div',{class:'lbl'},'Máxima'), el('div',{style:'font-weight:800;'}, maxima)),
    ),
    el('div',{class:'stat-bar', style:'margin-top:8px;'}, el('div',{class:'stat-bar-fill '+faixa, style:'width:'+pct+'%;'})),
    el('div',{style:'margin-top:8px;color:'+cor+';font-size:0.8rem;font-weight:600;'}, estado),
    el('div',{style:'margin-top:4px;font-size:0.7rem;color:var(--ink-soft);'}, 'Limite = 10 + 2×Força (ou 10 − Força, se negativa). Máxima = limite × 2 (regra do livro, pág. 146).'+(temMochila?' Já inclui os +2 da Mochila de Aventureiro (ela mesma não ocupa espaço).':''))
  );
}

function renderPainelVestidos(f){
  const todos = itensVestidosTodos(f);
  const usados = todos.length;
  const limite = limiteItensVestidos(f);
  const excedentes = itensVestidosExcedentes(f);
  return renderSecaoNotasColapsavel('itens-vestidos', '💍', 'Itens Vestidos',
    Math.min(usados,limite)+'/'+limite, ()=>{
    const corpo = [el('div',{class:'tip', style:'font-size:0.8rem;'}, 'Só é possível manter o benefício de até '+limite+' itens vestidos ao mesmo tempo (roupas, capas, joias mágicas etc. — armas e escudos empunhados não contam). Armadura conta como 1 desses '+limite+(limite>4?' (inclui +1 do poder Costas Largas)':'')+'.')];
    if(todos.length===0){
      corpo.push(el('div',{class:'empty'},'Nenhum item vestido no momento.'));
    } else {
      todos.forEach((fonte, i)=>{
        const ativo = i<4;
        corpo.push(el('div',{class:'power-item', style: ativo?'':'opacity:0.5;border-left-color:var(--red);'},
          el('b',{}, fonte.nome + (fonte.tipo==='armadura'?' (armadura)':'')),
          ativo ? (fonte.catalogo && fonte.catalogo.bonusPericia ? 'Ativo — +'+fonte.catalogo.bonusPericia.valor+' em '+fonte.catalogo.bonusPericia.nome : (fonte.catalogo?fonte.catalogo.desc:'Ativo')) : 'Excedente — sem efeito até você remover outro item vestido'
        ));
      });
    }
    if(excedentes.length>0){
      corpo.push(el('div',{class:'tip', style:'font-size:0.75rem;color:var(--gold);'}, '⚠ Você tem '+excedentes.length+' item(ns) vestido(s) além do limite — eles não fazem efeito até você desmarcar outro (aba Ficha → Mochila).'));
    }
    return corpo;
  }, usados>0);
}

// ---- PERÍCIAS ----
function renderPericias(){
  const wrap = el('div',{});
  const f = fichaAtual();
  const treinadas = periciasTreinadasComDivindade(f);
  const nivel = nivelTotal(f);

  wrap.appendChild(renderSecaoNotasColapsavel('pericias-como-funciona', 'ℹ️', 'Como Funciona', null, ()=>[
    el('div',{class:'tip'}, 'Total = 1/2 do nível ('+Math.floor(nivel/2)+') + atributo-chave + '+bonusTreinoPericia(nivel)+' se for treinado. Perícias em destaque são as que ' + (f.nome||'seu personagem') + ' já tem treinadas — os valores já estão calculados para o nível '+nivel+' atual.')
  ], false));

  if(!state._periciaBusca) state._periciaBusca = '';
  wrap.appendChild(el('input',{id:'busca-pericias', type:'text', placeholder:'buscar perícia...', value: state._periciaBusca, oninput:(e)=>{ state._periciaBusca=e.target.value; renderDebounced(); }}));

  const lista = PERICIAS.filter(p=> !state._periciaBusca || p.nome.toLowerCase().includes(state._periciaBusca.toLowerCase()));
  if(lista.length===0){
    wrap.appendChild(el('div',{class:'empty'},'Nenhuma perícia encontrada.'));
  }

  // Agrupa por atributo-chave, na ORDEM OFICIAL da ficha (Força, Destreza, Constituição,
  // Inteligência, Sabedoria, Carisma) — não na ordem em que aparecem no catálogo. Dentro de
  // cada grupo, ordem alfabética, que é como se procura uma perícia pelo nome.
  const ORDEM_ATRIBUTOS = ['For','Des','Con','Int','Sab','Car'];
  const grupos = {};
  lista.forEach(p=>{
    if(!grupos[p.attr]) grupos[p.attr] = [];
    grupos[p.attr].push(p);
  });

  const atributosOrdenados = ORDEM_ATRIBUTOS.filter(a=>grupos[a]).concat(Object.keys(grupos).filter(a=>!ORDEM_ATRIBUTOS.includes(a)));
  atributosOrdenados.forEach(attr=>{
    const doGrupo = grupos[attr].slice().sort((a,b)=> a.nome.localeCompare(b.nome, 'pt-BR'));
    wrap.appendChild(el('div',{class:'pericia-grupo-cab'},
      el('span',{class:'grupo-nome'}, NOME_ATRIBUTO[attr.toLowerCase().slice(0,3)] || attr),
      el('span',{class:'grupo-cont'}, doGrupo.length+(doGrupo.length===1?' perícia':' perícias'))
    ));

    doGrupo.forEach(p=>{
      const isTreinada = treinadas.has(p.nome);
      const aberto = state._periciaAberta === p.nome;
      const valor = periciaValor(f, p);
      const nomeEl = el('div',{class:'pericia-nome'}, p.nome+' ');
      if(isTreinada) nomeEl.appendChild(el('span',{class:'pericia-estrela'},'★'));
      const row = el('div',{class:'pericia-row'+(isTreinada?' treinada':'')+(aberto?' aberta':''), onclick:()=>{ state._periciaAberta = aberto ? null : p.nome; render(); }},
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
        const bonusOrigem = bonusPericiaDeOrigem(f, p.nome);
        const bonusClasseEspecifica = bonusPericiaDeClasse(f, p.nome);
      const bonusHabilidadeAutomatica = bonusPericiaDeHabilidadeAutomatica(f, p.nome);
        const bonusCondicoes = bonusCondicoesPericia(f, p);
        const bonusRaca = bonusPericiaDeRaca(f, p.nome);
        const bonusTormentaP = bonusPericiaDeTormenta(f, p.nome);
        const bonusItens = bonusPericiaDeItensVestidos(f, p.nome);
        const racaObjDetalhe = getRacaObj(f);
        const usaSabEmAdestramentoDetalhe = p.nome==='Adestramento' && listaPoderesConcedidos(f).some(pc=>pc && pc.nome==='Compreender os Ermos');
        const attrExibido = usaSabEmAdestramentoDetalhe ? 'Sabedoria (Compreender os Ermos)' : (p.nome==='Atletismo' && racaObjDetalhe && racaObjDetalhe.atletismoUsaDestreza) ? 'Destreza (traço racial)' : p.attr;
        const attrValExibido = usaSabEmAdestramentoDetalhe ? (parseInt(f.sab)||0) : (p.nome==='Atletismo' && racaObjDetalhe && racaObjDetalhe.atletismoUsaDestreza) ? (parseInt(f.des)||0) : atributoEfetivo(f, p.attr.toLowerCase().slice(0,3));

        // Cada parcela do cálculo vira uma linha própria (rótulo à esquerda, valor à direita)
        // em vez do texto corrido comprido de antes — bem mais fácil de conferir de onde vem
        // cada pedaço do total.
        const parcelas = [
          ['½ nível', Math.floor(nivel/2)],
          [attrExibido, attrValExibido],
        ];
        if(isTreinada) parcelas.push(['Treino', bonusTreinoPericia(nivel)]);
        if(bonusPoder) parcelas.push(['Poderes', bonusPoder]);
        if(bonusRaca) parcelas.push(['Raça', bonusRaca]);
        if(bonusTormentaP) parcelas.push(['Poderes da Tormenta', bonusTormentaP]);
        if(bonusItens) parcelas.push(['Itens vestidos', bonusItens]);
        if(bonusDivindade) parcelas.push(['Divindade', bonusDivindade]);
        if(bonusOrigem) parcelas.push(['Origem', bonusOrigem]);
        if(bonusClasseEspecifica) parcelas.push(['Poder de classe', bonusClasseEspecifica]);
        if(bonusHabilidadeAutomatica) parcelas.push(['Habilidade de classe', bonusHabilidadeAutomatica]);
        if(bonusCondicoes) parcelas.push(['Condições', bonusCondicoes]);
        if(p.nome==='Furtividade' && bonusFurtividadeTamanho(f)) parcelas.push(['Tamanho', bonusFurtividadeTamanho(f)]);
        if(p.armadura && penalidadeTotal(f)) parcelas.push(['Penalidade de armadura', penalidadeTotal(f)]);

        const detalhe = el('div',{class:'pericia-detalhe'},
          ...parcelas.map(([rotulo, val])=>
            el('div',{class:'calc-linha'}, el('span',{}, rotulo), el('span',{}, (val>=0?'+':'')+val))
          ),
          el('div',{class:'calc-linha total'}, el('span',{},'Total'), el('span',{}, (valor>=0?'+':'')+valor)),
          el('div',{class:'desc', style:'margin-top:8px;'}, p.resumo),
          el('div',{class:'usos'}, el('b',{},'Principais usos'),
            el('ul',{}, ...p.usos.map(u=> el('li',{}, u)))
          )
        );
        wrapRow.appendChild(detalhe);
      }
      wrap.appendChild(wrapRow);
    });
  });
  return wrap;
}

// ---- MAGIAS ----
function magiasPorTradicao(trad){
  // trad: 'arcana' | 'divina' — magias Universais entram nas duas
  const alvo = trad==='arcana' ? 'Arcana' : 'Divina';
  return MAGIAS.filter(m => m.trad===alvo || m.trad==='Universal');
}

function renderCardMagia(s, grupoChave, aoAdicionar, aoRemover, fichaCtx, aoUsar){
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
  card.appendChild(el('div',{style:'margin-top:8px;display:flex;justify-content:space-between;align-items:center;gap:8px;'},
    el('span',{class:'meta'}, 'custo: '+custoTxt+' PM'+(custoNota||'')),
    el('div',{style:'display:flex;gap:6px;'},
      aoUsar ? el('button',{class:'btn', style:'width:auto;padding:6px 12px;', onclick:(e)=>{ e.stopPropagation(); aoUsar(); }},'✨ Usar') : null,
      aoAdicionar ? el('button',{class:'btn', style:'width:auto;padding:6px 12px;', onclick:aoAdicionar},'+ Adicionar à ficha') : null
    )
  ));
  return card;
}

// Extrai o número de PM de um texto de custo de aprimoramento (ex: "+1 PM" -> 1). Alguns
// aprimoramentos têm custo diferente de PM puro (ex: "+2 PM por alvo adicional") — nesse caso
// pega só o primeiro número como aproximação; o jogador sempre pode ajustar o total na mão
// antes de confirmar, o campo fica editável.
function extrairCustoPM(custoTexto){
  const m = String(custoTexto||'').match(/(\d+)/);
  return m ? parseInt(m[1]) : 0;
}

function abrirConstrutorGolpePessoal(indicePoderesClasse){
  const f = fichaAtual();
  const row = f.poderesClasse[indicePoderesClasse];
  if(!row) return;
  const atual = row.golpeConstruido || {nomeGolpe:'', arma:'', escolhas:{}};
  state._golpePessoalPopup = {indicePoderesClasse, nomeGolpe:atual.nomeGolpe||'', arma:atual.arma||'', escolhas:Object.assign({}, atual.escolhas||{})};
  render();
}
function renderPopupGolpePessoal(f){
  const fluxo = state._golpePessoalPopup;
  const overlay = el('div',{class:'menu-overlay', onclick:(e)=>{ if(e.target===e.currentTarget){ state._golpePessoalPopup=null; render(); } }});
  const sheet = el('div',{class:'menu-sheet'});
  sheet.appendChild(el('div',{class:'wizard-title', style:'padding:6px 14px 0;'}, '🔨 Construir Golpe Pessoal'));
  sheet.appendChild(el('div',{class:'tip', style:'margin:6px 14px;'}, 'Escolha os efeitos — o custo total (mínimo 1 PM) já soma sozinho. Dá pra reconstruir esse golpe quando quiser, não só ao subir de nível (a regra oficial só menciona subir de nível, mas deixar sempre editável evita ficha travada por causa de um pré-requisito de sessão que já passou).'));

  const camposBasicos = el('div',{style:'padding:0 14px;display:flex;flex-direction:column;gap:8px;'},
    el('div',{},
      el('label',{},'Nome do golpe (opcional, ajuda a diferenciar se tiver mais de um)'),
      el('input',{type:'text', placeholder:'ex: Investida do Trovão', value:fluxo.nomeGolpe, oninput:(e)=>{fluxo.nomeGolpe=e.target.value;}})
    ),
    el('div',{},
      el('label',{},'Arma usada (deixa travado nela, a menos que escolha "Qualquer Arma" abaixo)'),
      el('input',{type:'text', placeholder:'ex: Espada longa', value:fluxo.arma, oninput:(e)=>{fluxo.arma=e.target.value;}})
    )
  );
  sheet.appendChild(camposBasicos);

  const custoTotal = calcularCustoGolpePessoal(fluxo.escolhas);
  sheet.appendChild(el('div',{class:'tip', style:'margin:8px 14px;text-align:center;font-size:1rem;'}, el('b',{},'Custo total: '), el('span',{style:'color:var(--gold);font-family:Cinzel,serif;font-weight:800;'}, custoTotal+' PM')));

  const listaEfeitos = el('div',{style:'padding:0 14px;display:flex;flex-direction:column;gap:6px;max-height:340px;overflow-y:auto;'});
  EFEITOS_GOLPE_PESSOAL.forEach(ef=>{
    const qtdAtual = fluxo.escolhas[ef.nome]||0;
    const marcado = qtdAtual>0;
    const limiteMax = ef.maxVezes || (ef.repetivel ? 5 : 1);
    const linha = el('div',{class:'option-card'+(marcado?' selected':''), style:'padding:8px 10px;cursor:pointer;', onclick:()=>{
      fluxo.escolhas[ef.nome] = marcado ? 0 : 1; // primeiro toque liga/desliga; ajuste fino pelos botões +/-
      render();
    }},
      el('div',{class:'row', style:'align-items:center;'},
        el('div',{style:'flex:1;'},
          el('div',{class:'opt-nome'}, (marcado?'✓ ':'○ ')+ef.nome+' ('+(ef.custo>=0?'+':'')+ef.custo+' PM'+(ef.custoVariavel?' + custo da magia':'')+')'),
          el('div',{class:'opt-sub'}, ef.desc)
        ),
        (ef.repetivel || ef.maxVezes) && marcado ? el('div',{class:'row', style:'gap:4px;flex-shrink:0;', onclick:(e)=>e.stopPropagation()},
          el('button',{class:'btn ghost', style:'width:auto;padding:2px 8px;', onclick:()=>{ fluxo.escolhas[ef.nome]=Math.max(1, qtdAtual-1); render(); }}, '−'),
          el('span',{style:'min-width:16px;text-align:center;'}, qtdAtual),
          el('button',{class:'btn ghost', style:'width:auto;padding:2px 8px;', onclick:()=>{ fluxo.escolhas[ef.nome]=Math.min(limiteMax, qtdAtual+1); render(); }}, '+')
        ) : null
      )
    );
    listaEfeitos.appendChild(linha);
  });
  sheet.appendChild(listaEfeitos);

  sheet.appendChild(el('button',{class:'btn', style:'margin:14px 14px 0;width:calc(100% - 28px);', onclick:()=>{
    if(!fluxo.arma.trim() && !(fluxo.escolhas['Qualquer Arma']>0)){ flashMsg('Diz qual arma esse golpe usa, ou escolhe o efeito "Qualquer Arma".'); return; }
    const row = f.poderesClasse[fluxo.indicePoderesClasse];
    if(!row){ state._golpePessoalPopup=null; render(); return; }
    row.golpeConstruido = {nomeGolpe:fluxo.nomeGolpe.trim(), arma:fluxo.arma.trim()||'Qualquer arma', escolhas:Object.assign({}, fluxo.escolhas)};
    registrarLog(f, 'Construiu o Golpe Pessoal'+(row.golpeConstruido.nomeGolpe?' "'+row.golpeConstruido.nomeGolpe+'"':'')+' ('+calcularCustoGolpePessoal(fluxo.escolhas)+' PM)');
    salvarPerfis();
    flashMsg('🔨 Golpe Pessoal salvo!');
    state._golpePessoalPopup = null;
    render();
  }}, '✓ Salvar Golpe Pessoal'));
  sheet.appendChild(el('button',{class:'menu-close', style:'margin-top:10px;', onclick:()=>{ state._golpePessoalPopup=null; render(); }}, 'Cancelar'));
  overlay.appendChild(sheet);
  return overlay;
}
function usarGolpePessoal(f, indicePoderesClasse){
  const row = f.poderesClasse[indicePoderesClasse];
  if(!row || !row.golpeConstruido) return;
  const custo = calcularCustoGolpePessoal(row.golpeConstruido.escolhas);
  const pmAtual = parseInt(f.pmatual)||0;
  if(custo > pmAtual){ flashMsg('Você não tem '+custo+' PM disponíveis (tem '+pmAtual+').'); return; }
  f.pmatual = pmAtual - custo;
  const nomeExibido = row.golpeConstruido.nomeGolpe || 'Golpe Pessoal';
  registrarLog(f, 'Usou "'+nomeExibido+'" (-'+custo+' PM)');
  salvarPerfis();
  flashMsg('⚔️ "'+nomeExibido+'" usado! -'+custo+' PM.');
  render();
}

function abrirUsarMagia(s){
  const f = fichaAtual();
  const custoBase = custoPMAjustado(f, s);
  state._usarMagiaPopup = {magia:s, aprimSelecionados:[], aprimExpandido:null, custoTotal:String(custoBase)};
  render();
}
// Catalisadores mágicos que dão bônus a uma magia específica no momento de lançar — achados
// numa auditoria, eram só texto. Os que aumentam CD numa escola específica (Musgo púrpura,
// Ossos de monstro, Saco de sal) entram como número de verdade na CD mostrada; os de dano extra
// (Baga-de-fogo, Líquen lilás, Terra de cemitério) o app não tem onde somar um total de dano em
// lugar nenhum, então só entram como lembrete no log ao usar.
const CATALISADORES_CD_ESCOLA = {
  'Musgo púrpura': 'Ilusão',
  'Ossos de monstro': 'Necromancia',
  'Saco de sal': 'Abjuração',
};
const CATALISADORES_DANO_LEMBRETE = {
  'Baga-de-fogo': '+1d6 de dano de fogo',
  'Líquen lilás': '+1d6 de dano de frio',
  'Terra de cemitério': '+1d6 de dano de trevas',
};
function renderPopupUsarMagia(f){
  const fluxo = state._usarMagiaPopup;
  const s = fluxo.magia;
  const custoBase = custoPMAjustado(f, s);
  const limite = limitePMPorMagia(f, s);
  const overlay = el('div',{class:'menu-overlay', onclick:(e)=>{ if(e.target===e.currentTarget){ state._usarMagiaPopup=null; render(); } }});
  const sheet = el('div',{class:'menu-sheet'});
  sheet.appendChild(el('div',{class:'wizard-title', style:'padding:6px 14px 0;'}, '✨ Usar: '+s.n));
  const totalAtual = parseInt(fluxo.custoTotal)||0;
  const passouLimite = totalAtual > limite;
  const nivelBaseLimite = nivelParaLimitePM(f);
  const ehNivelDeClasse = nivelBaseLimite !== nivelTotal(f);
  const cdBase = cdMagiaEspecifica(f, s);
  if(!fluxo.magiaPungenteAtiva) fluxo.magiaPungenteAtiva = false;
  if(!fluxo.catalisadorEscolhido) fluxo.catalisadorEscolhido = null;
  const cdMostrada = cdBase!=null ? cdBase + (fluxo.magiaPungenteAtiva?2:0) + (f._liturgiaMagicaAtiva?2:0) + (fluxo.catalisadorEscolhido && CATALISADORES_CD_ESCOLA[fluxo.catalisadorEscolhido]===s.e ? 2 : 0) : null;
  sheet.appendChild(el('div',{class:'tip', style:'margin:6px 14px;'+(passouLimite?'border:1px solid var(--red-bright);':'')},
    // Números de PM na cor do recurso (mesmo azul dos cards de Mana na Ficha) — antes era tudo
    // texto genérico aqui, perdendo a associação visual rápida "azul = mana" que já existe lá.
    'Custo base: ', el('b',{style:'color:var(--pm-accent);'}, custoBase+' PM'),
    ' · Você tem: ', el('b',{style:'color:var(--pm-accent);'}, (parseInt(f.pmatual)||0)+' PM'),
    (cdMostrada!=null ? ' · CD pra resistir: '+cdMostrada : ''),
    ' · Limite por magia: ', el('b',{style:'color:var(--pm-accent);'}, limite+' PM'),
    ' ('+(ehNivelDeClasse?'seu nível na classe conjuradora':'seu nível')
    + ((s.trad!=='Divina'&&limitePMExtraArcana(f)>0)?', +'+limitePMExtraArcana(f)+' de item':'')
    + (limitePMExtraPorEscola(f, s.e)>0?', +'+limitePMExtraPorEscola(f, s.e)+' de item ('+s.e+')':'')
    + (poderesAtivos(f).includes('Magia Ilimitada')?', +'+(valorAtributoChaveMagia(f)||0)+' de Magia Ilimitada':'')
    + ')'
    + (passouLimite ? ' ⚠ o total atual passa do limite!' : '')
  ));

  // Magia Pungente (Arcanista) — "pode pagar 1 PM pra aumentar em +2 a CD". Achado numa
  // auditoria; só aparece pra quem realmente tem o poder.
  if(nomesPoderesConhecidos(f).includes('Magia Pungente')){
    sheet.appendChild(el('div',{style:'padding:0 14px;margin-top:8px;'},
      el('div',{class:'option-card'+(fluxo.magiaPungenteAtiva?' selected':''), style:'cursor:pointer;', onclick:()=>{
        fluxo.magiaPungenteAtiva = !fluxo.magiaPungenteAtiva;
        const extra = fluxo.magiaPungenteAtiva ? 1 : -1;
        fluxo.custoTotal = String((parseInt(fluxo.custoTotal)||0) + extra);
        render();
      }},
        el('span',{}, fluxo.magiaPungenteAtiva?'✓ ':'○ '), el('b',{},'Magia Pungente'), ' — +1 PM pra +2 na CD'
      )
    ));
  }

  if(f._liturgiaMagicaAtiva){
    sheet.appendChild(el('div',{class:'meta', style:'padding:0 14px;margin-top:8px;color:var(--gold);'}, '✓ Liturgia Mágica ativa — +2 CD já incluído acima, desliga sozinha ao confirmar.'));
  }

  // Catalisadores na mochila que combinam com essa magia (por escola, pros de CD; qualquer
  // magia, pros de dano — que só entram como lembrete no log, o app não soma dano em lugar
  // nenhum). Consome o item da mochila ao confirmar o uso.
  const catalisadoresDisponiveis = (f.equip||[]).filter(row=>{
    if(row.tipo!=='geral') return false;
    const nome = nomeBaseItem(row.item);
    if(CATALISADORES_CD_ESCOLA[nome]) return CATALISADORES_CD_ESCOLA[nome]===s.e;
    return !!CATALISADORES_DANO_LEMBRETE[nome];
  });
  if(catalisadoresDisponiveis.length>0){
    const catWrap = el('div',{style:'padding:0 14px;margin-top:8px;'}, el('label',{},'Catalisador (opcional — some da mochila ao usar)'));
    catalisadoresDisponiveis.forEach(row=>{
      const nome = nomeBaseItem(row.item);
      const marcado = fluxo.catalisadorEscolhido===nome;
      const rotulo = CATALISADORES_CD_ESCOLA[nome] ? '+2 na CD ('+CATALISADORES_CD_ESCOLA[nome]+')' : CATALISADORES_DANO_LEMBRETE[nome];
      catWrap.appendChild(el('div',{class:'option-card'+(marcado?' selected':''), style:'margin-top:4px;cursor:pointer;', onclick:()=>{
        fluxo.catalisadorEscolhido = marcado ? null : nome;
        render();
      }},
        el('span',{}, marcado?'✓ ':'○ '), el('b',{},nome), ' — '+rotulo
      ));
    });
    sheet.appendChild(catWrap);
  }

  if(s.aprim && s.aprim.length>0){
    const aprimWrap = el('div',{style:'padding:0 14px;'}, el('label',{},'Aprimoramentos (opcional — toque no ⓘ pra ver o que cada um faz)'));
    s.aprim.forEach((a,idx)=>{
      const marcado = fluxo.aprimSelecionados.includes(idx);
      const custoNum = extrairCustoPM(a.custo);
      const linha = el('div',{class:'option-card'+(marcado?' selected':''), style:'margin-top:6px;cursor:pointer;', onclick:()=>{
        if(marcado){ fluxo.aprimSelecionados = fluxo.aprimSelecionados.filter(i=>i!==idx); }
        else { fluxo.aprimSelecionados.push(idx); }
        // recalcula o total automaticamente — mas só se o jogador não tiver mexido no campo à mão
        const somaAprim = fluxo.aprimSelecionados.reduce((tot,i)=> tot+extrairCustoPM(s.aprim[i].custo), 0);
        fluxo.custoTotal = String(custoBase + somaAprim);
        render();
      }},
        el('div',{class:'row', style:'align-items:center;'},
          el('div',{style:'flex:1;'}, el('span',{},marcado?'✓ ':'○ '), el('b',{},a.custo)),
          el('button',{class:'btn ghost', style:'width:auto;padding:3px 8px;font-size:0.68rem;flex-shrink:0;', onclick:(e)=>{ e.stopPropagation(); fluxo.aprimExpandido = fluxo.aprimExpandido===idx?null:idx; render(); }}, fluxo.aprimExpandido===idx?'ocultar':'ⓘ o que faz')
        )
      );
      if(fluxo.aprimExpandido===idx){
        linha.appendChild(el('div',{class:'desc', style:'margin-top:6px;'}, a.efeito));
      }
      aprimWrap.appendChild(linha);
    });
    sheet.appendChild(aprimWrap);
  }

  sheet.appendChild(el('div',{style:'padding:10px 14px 0;'},
    el('label',{},'Total de PM a gastar'),
    el('input',{type:'number', value:fluxo.custoTotal, oninput:(e)=>{fluxo.custoTotal=e.target.value;}}),
    el('div',{class:'meta', style:'margin-top:2px;'}, 'Preenchido automaticamente pelos aprimoramentos marcados, mas pode ajustar na mão se precisar.')
  ));

  sheet.appendChild(el('button',{class:'btn', style:'margin:14px 14px 0;width:calc(100% - 28px);', onclick:()=>{
    const total = parseInt(fluxo.custoTotal);
    if(isNaN(total) || total<0){ flashMsg('Coloca um custo válido primeiro.'); return; }
    if(total > limite){ flashMsg('Isso passa do limite de '+limite+' PM numa magia só (seu nível'+((s.trad!=='Divina'&&limitePMExtraArcana(f)>0)?' + itens':'')+'). Escolha menos aprimoramentos.'); return; }
    const pmAtual = parseInt(f.pmatual)||0;
    if(total > pmAtual){ flashMsg('Você não tem '+total+' PM disponíveis (tem '+pmAtual+').'); return; }
    f.pmatual = pmAtual - total;
    // Consome o catalisador escolhido da mochila, se tiver
    let catalisadorTxt = '';
    if(fluxo.catalisadorEscolhido){
      const idxCat = f.equip.findIndex(row=> row.tipo==='geral' && nomeBaseItem(row.item)===fluxo.catalisadorEscolhido);
      if(idxCat>=0){
        const rowCat = f.equip[idxCat];
        const qtdCat = parseInt(rowCat.qtd)||1;
        if(qtdCat<=1) f.equip.splice(idxCat,1); else rowCat.qtd = String(qtdCat-1);
        const rotuloCat = CATALISADORES_CD_ESCOLA[fluxo.catalisadorEscolhido] ? '+2 CD' : CATALISADORES_DANO_LEMBRETE[fluxo.catalisadorEscolhido];
        catalisadorTxt = ' + '+fluxo.catalisadorEscolhido+' ('+rotuloCat+')';
      }
    }
    const aprimTxt = fluxo.aprimSelecionados.length>0 ? ' com '+fluxo.aprimSelecionados.length+' aprimoramento(s)' : '';
    const pungenteTxt = fluxo.magiaPungenteAtiva ? ' + Magia Pungente (+2 CD)' : '';
    const liturgiaTxt = f._liturgiaMagicaAtiva ? ' + Liturgia Mágica (+2 CD)' : '';
    f._liturgiaMagicaAtiva = false; // é "a próxima habilidade" -- consome sozinha depois de usada
    registrarLog(f, 'Usou "'+s.n+'"'+aprimTxt+pungenteTxt+liturgiaTxt+catalisadorTxt+' (-'+total+' PM)');
    salvarPerfis();
    flashMsg('✨ "'+s.n+'" usada! -'+total+' PM.'+(catalisadorTxt?' Catalisador consumido.':''));
    state._usarMagiaPopup = null;
    render();
  }}, '✓ Confirmar uso'));
  sheet.appendChild(el('button',{class:'menu-close', style:'margin-top:10px;', onclick:()=>{ state._usarMagiaPopup=null; render(); }}, 'Cancelar'));
  overlay.appendChild(sheet);
  return overlay;
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

  // Liturgia Mágica (Clérigo): gasta ação de movimento na mesa pra ativar; a CD da PRÓXIMA
  // habilidade (não uma fixa) sobe +2. Como o app não acompanha turno a turno, vira um
  // interruptor manual — o jogador liga depois de fazer a ação na mesa, e o popup de Usar Magia
  // consome sozinho (desliga automaticamente) na próxima vez que usar uma magia.
  if(nomesPoderesConhecidos(f).includes('Liturgia Mágica')){
    magPanel.appendChild(el('div',{class:'row', style:'align-items:center;margin-top:8px;padding:8px;border-radius:var(--radius-sm);background:'+(f._liturgiaMagicaAtiva?'rgba(216,189,116,0.12)':'transparent')+';border:1px solid '+(f._liturgiaMagicaAtiva?'var(--gold)':'var(--line)')+';'},
      el('div',{style:'flex:1;'},
        el('div',{style:'font-weight:700;'+(f._liturgiaMagicaAtiva?'color:var(--gold);':'')}, f._liturgiaMagicaAtiva ? '✓ Liturgia Mágica ativa' : 'Liturgia Mágica'),
        el('div',{class:'meta'}, 'Fez a ação na mesa? Liga aqui — a próxima magia usada já ganha +2 CD sozinha.')
      ),
      el('button',{class:'btn ghost', style:'width:auto;flex-shrink:0;', onclick:()=>{ f._liturgiaMagicaAtiva = !f._liturgiaMagicaAtiva; salvarPerfis(); render(); }}, f._liturgiaMagicaAtiva ? 'Desligar' : 'Ligar')
    ));
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
      const card = renderCardMagia(s, 'minhas', null, ()=>{ if(!confirm('Remover "'+s.n+'" das suas magias conhecidas? Não tem como desfazer.')) return; registrarLog(f, 'Esqueceu a magia: '+s.n); f.magias.splice(idx,1); salvarPerfis(); render(); }, f, ()=>abrirUsarMagia(s));
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
    wrap.appendChild(renderSecaoNotasColapsavel('magias-sem-classe', '📖', 'Sem Classe Conjuradora', null, ()=>[
      el('div',{class:'tip'}, 'Nenhuma das classes de '+f.nome+' lança magias pela progressão normal (Arcanista, Bardo, Clérigo, Druida). Se ganhou magias por um poder específico (ex: Orar do Paladino), consulte a descrição desse poder. Mesmo assim, você pode navegar pelo catálogo completo abaixo por curiosidade ou pra referência do mestre.')
    ], false));
  } else if(!mf._tradAjustada){
    // na primeira vez que abre a aba, ajusta automaticamente pra tradição real da classe do personagem
    mf.trad = CLASSES[cc.classe].tradicao;
    mf._tradAjustada = true;
    mf.modo = 'possiveis';
  }

  wrap.appendChild(renderSecaoNotasColapsavel('magias-como-funciona', 'ℹ️', 'Como Funciona', null, ()=>[
    el('div',{class:'tip'}, 'Cada magia pertence a uma tradição (arcana ou divina — 🔮 marca as Universais, que qualquer conjurador pode aprender), um círculo e uma escola. Toque no nome de uma magia pra ver a descrição completa.')
  ], false));

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
// Poderes cujo efeito mecânico o sistema realmente CALCULA em algum número da ficha (PV, PM,
// Defesa, carga, uma perícia, limite de PM por magia) — não inclui poderes que só concedem uma
// ação/reação em combate (isso o app não simula turno a turno) nem os que só afetam dano (o app
// não soma/mostra total de dano em lugar nenhum). Serve só pra dar um sinal visual pro jogador
// saber se pode confiar no número da ficha ou se precisa acompanhar aquele efeito na mão.
const PODERES_AUTOMATIZADOS = new Set([
  'Vitalidade','Vontade de Ferro','Costas Largas','Atlético','Encouraçado','Esquiva',
  'Estilo de Arma e Escudo','Estilo de Uma Arma','Inventário Organizado','Magia Ilimitada',
  'Investigador','Saque Rápido','Finta Aprimorada','Sentidos Aguçados',
  'Pele de Ferro','Pele de Aço','Braços Calejados','Poder Mágico',
  'Coração Heroico','Mochileiro','Esse Cheiro...','Estoico',
  'Astúcia da Serpente','Golpista Divino','Mente Analítica','Mente Vazia','Talento Artístico',
  'Conhecimento Enciclopédico','Compreender os Ermos',
  'Pernas do Mar','Etiqueta','Pajem','Força dos Penhascos','Liberdade da Pradaria',
  'Tranquilidade dos Lagos','Gatuno','Sombra','Elo com a Natureza',
  'Especialista em Escola','Fortalecimento Arcano',
]);
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
