// ============ TELA DE FICHA (Ficha / Itens / Magias / Evolução) ============

// ============ TELA DE FICHA (Personagem / Poderes / Ataques / Mochila / Magias / Perícias / Itens / Evolução) ============

const MENU_SECOES = [
  ['personagem','Personagem','🧙'],
  ['magias','Magias','📖'],
  ['itens','Itens','🎒'],
  ['guia','Evolução','📈'],
];

// Menu "Mais" no kit (15/11/2026, prancha "Menu Mais", ideia A): ladrilhos para as telas,
// "Esta ficha" em linhas curtas, preferências como quatro chaves numa linha e as ações perigosas
// (Desfazer e Descer de nível) numa linha "Cuidado" fechada, longe das comuns.
function renderMenuOverlay(){
  const f = fichaAtual();
  const fecharMenu = ()=>{ state._menuAberto = false; render(); };
  const overlay = el('div',{class:'menu-overlay', onclick:(e)=>{ if(e.target===e.currentTarget) fecharMenu(); }});
  const sheet = el('div',{class:'menu-sheet menu-mais'});
  sheet.appendChild(el('div',{class:'alca-menu', 'aria-hidden':'true'}));

  // ---- Telas: seis ladrilhos ----
  const ir = (fn)=>()=>{ fn(); state._menuAberto = false; render(); try{ window.scrollTo(0,0); }catch(e){} };
  const telas = itensNavegarMais().filter(([,rot])=> rot!=='Trocar de herói');
  const trocar = itensNavegarMais().find(([,rot])=> rot==='Trocar de herói');
  const ladrilhos = telas.map(([ico, rot, fn])=> [ico, rot.replace('Catálogo de itens','Catálogo'), ir(fn)]);
  ladrilhos.push(['🎞️', 'Resumo', ()=>{ state._menuAberto = false; abrirResumoSessao(f); }]);
  if(trocar) ladrilhos.push([trocar[0], 'Trocar herói', ir(trocar[2])]);
  sheet.appendChild(el('div',{class:'k-rot'}, 'Telas'));
  sheet.appendChild(el('div',{class:'ladrilhos-menu'}, ladrilhos.map(([ico, rot, fn])=>
    el('button',{class:'ladrilho-menu', onclick:fn}, el('span',{class:'ico', 'aria-hidden':'true'}, ico), el('span',{}, rot)))));

  // ---- Esta ficha ----
  const pendencias = detectarPendencias(f);
  const linha = (ico, rot, valor, onclick, classe)=> el('button',{class:'linha-menu'+(classe?' '+classe:''), onclick},
    el('span',{class:'ico', 'aria-hidden':'true'}, ico), el('span',{}, rot), el('span',{class:'vl'}, valor||'▸'));
  sheet.appendChild(el('div',{class:'k-rot'}, 'Esta ficha'));
  sheet.appendChild(linha('📋', 'Pendências', pendencias.length ? el('b',{class:'conta-pend'}, String(pendencias.length)) : '✓', ()=>{ state._menuAberto = false; state._pendenciasAberto = true; render(); }));
  sheet.appendChild(linha('📜', 'Log de alterações', null, ()=>{ state._menuAberto = false; state._logAberto = true; render(); }));
  sheet.appendChild(linha('💾', 'Cópia de segurança', null, ()=>{ state._menuAberto = false; baixarBackupFicha(f); }));
  const opcaoInstalar = typeof renderOpcaoInstalar==='function' ? renderOpcaoInstalar() : null;
  if(opcaoInstalar) sheet.appendChild(opcaoInstalar);

  // ---- Preferências: quatro chaves ----
  const tema = document.documentElement.dataset.tema==='mesa';
  const chave = (ico, rot, ligada, alternar, dica)=> el('button',{class:'chave-menu'+(ligada?' on':''), role:'switch', 'aria-checked': ligada ? 'true' : 'false', title:dica, onclick:alternar},
    el('span',{class:'ico', 'aria-hidden':'true'}, ico), el('span',{}, rot), el('i',{class:'trilho', 'aria-hidden':'true'}));
  sheet.appendChild(el('div',{class:'k-rot'}, 'Preferências'));
  sheet.appendChild(el('div',{class:'chaves-menu'},
    chave('🔔', 'Avisos', notificacaoSomAtiva(), ()=>{ alternarNotificacaoSom(); render(); }, 'Som e vibração quando alguém manda algo para você'),
    chave('🎵', 'Sons', sonsAtivos(), ()=>{ alternarSons(); render(); }, 'Sons do app: forja, poções, magias'),
    chave('🌫️', 'Atmosfera', atmosferaAtiva(), ()=>{ alternarAtmosfera(); render(); }, 'Efeitos de fundo conforme a vida do herói'),
    chave('🌓', 'Modo mesa', tema, ()=>{ alternarTemaMesa(); }, 'Alto contraste para mesa com muita luz')));

  // ---- Cuidado: fechado por padrão ----
  const cuidadoAberto = !!state._menuCuidado;
  sheet.appendChild(el('button',{class:'cuidado-menu', 'aria-expanded': cuidadoAberto ? 'true' : 'false', onclick:()=>{ state._menuCuidado = !cuidadoAberto; render(); }},
    el('span',{}, '⚠ Cuidado'), el('span',{}, cuidadoAberto ? '▾' : '▸')));
  if(cuidadoAberto){
    const temParaDesfazer = !!(state._paraDesfazer && state._paraDesfazer[f.id]);
    sheet.appendChild(linha('↩️', 'Desfazer última alteração', null, ()=>{
      if(!temParaDesfazer){ flashMsg('Não tem nada recente pra desfazer.'); return; }
      desfazerUltimaAlteracao(fichaAtual());
    }, 'cuidado'+(temParaDesfazer?'':' apagado')));
    // Descer de Nível: ação rara e destrutiva, com confirmação do que volta.
    const checkDescer = podeDescerNivel(f);
    sheet.appendChild(linha('⬇️', 'Descer de nível'+(checkDescer.pode ? ' ('+checkDescer.ultimo.classe+' '+checkDescer.ultimo.nivel+')' : ''), null, ()=>{
      const ff = fichaAtual();
      const check = podeDescerNivel(ff);
      if(!check.pode){ flashMsg(check.motivo); return; }
      const u = check.ultimo;
      const oQueVolta = ['– '+(u.pvGanho||0)+' PV e –'+(u.pmGanho||0)+' PM', u.poder ? 'remove o poder "'+u.poder.nome+'"' : null].filter(Boolean).join(', ');
      if(!confirm('Desfazer o nível '+u.nivel+' de '+u.classe+'?\n\nIsso vai: '+oQueVolta+'.\n\nSó dá pra desfazer um nível por vez, do mais recente pro mais antigo.')) return;
      state._menuAberto = false;
      descerNivel(ff);
    }, 'cuidado'+(checkDescer.pode?'':' apagado')));
  }

  sheet.appendChild(el('button',{class:'menu-close', onclick:fecharMenu}, 'Fechar'));
  overlay.appendChild(sheet);
  return overlay;
}

// "Personagem" tem 4 sub-abas internas: Ficha (identidade/atributos/vida-mana/defesa/itens
// equipados/vestidos), Magias (as aprendidas), Mochila (carga/moedas/itens guardados) e Notas
// (habilidades iniciais/proficiências/poderes/anotações)
function renderPersonagemScreen(){
  const wrap = el('div',{});
  if(!state.personagemTab) state.personagemTab = 'ficha';
  const content = el('div',{style:'padding-top:4px;'});
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
  const atmosfera = atmosferaDaFicha(f);
  const wrap = el('div',{class: (emPerigoDeMorte ? 'vinheta-tormenta' : '') + (atmosfera && atmosfera.classe ? ' '+atmosfera.classe : '')});
  if(atmosfera && atmosfera.camada) wrap.appendChild(el('div',{class:'atm-camada '+atmosfera.camada, 'aria-hidden':'true'}));
  verificarResumoAoAbrir(f);

  // Topo de uma linha (15/11/2026, ideia 1A); a barra de telas fica embaixo (js/navegacao.js).
  wrap.appendChild(renderTopoHeroi(f));

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
  if(state._itemPersonalizadoPopup){
    wrap.appendChild(renderPopupItemPersonalizado(fichaAtual()));
  }
  if(state._adicionarParceiroPopup){
    wrap.appendChild(renderPopupAdicionarParceiro(fichaAtual()));
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
  if(state._presenteVoo) wrap.appendChild(renderPresenteVoo());
  if(state._magiaLancada) wrap.appendChild(renderMagiaLancada());
  if(state._resumo && state._resumo.fid===f.id) wrap.appendChild(renderResumoSessao(f));
  const semMenuAberto = !state._menuAberto && !state._divindadeFluxo && !state._cropperFoto && !(state.levelUp&&state.levelUp.aberto) && !state._enviarItemFluxo && !state._enviarDinheiroFluxo && !state._moedaPopup && !state._escolherJogadorRelFluxo && !state._escolherMapaFluxo && !state._perfilJogadorPopup && !state._usarMagiaPopup && !state._efeitoItemPopup && !state._golpePessoalPopup && !state._itemPersonalizadoPopup && !state._adicionarParceiroPopup && !state._visualizarMapaPopup && !state._pendenciasAberto && !state._logAberto;
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
  // Alerta das condições (C3, 15/11/2026): o efeito curto de cada uma, em todas as abas;
  // tocar leva ao painel Condições da Ficha.
  if(semMenuAberto){ const alerta = renderAlertaCondicoes(f); if(alerta) wrap.appendChild(alerta); }

  const main = el('main',{});
  // Sem arrastar de lado (15/11/2026): no iPhone o gesto mexia a tela ao rolar. Perícias fica na barra de baixo.
  if(state.tab === 'personagem') main.appendChild(renderPersonagemScreen());
  else if(state.tab === 'pericias') main.appendChild(renderPericias());
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
    const ctx = Som.contexto(); if(!ctx) return;
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
    const ctx = Som.contexto(); if(!ctx) return;
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
    const ctx = Som.contexto(); if(!ctx) return;
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

// Baixa a ficha inteira como um arquivo .json — uma cópia de segurança que não depende do
// servidor. Pode ser reaberta depois com "Importar Cópia de Segurança" na tela de
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

function renderPersonagemFicha(){
  const f = fichaAtual();
  const wrap = el('div',{});

  wrap.appendChild(renderCartaoHeroi(f));

  if(state.levelUp && state.levelUp.aberto){
    // O Level Up agora é um pop-up renderizado no nível mais alto da tela (renderFichaScreen),
    // pelo mesmo motivo do popup de divindade: painéis com transform "prendem" um position:fixed
    // aninhado dentro deles, escondendo o popup atrás de outros painéis.
  }

  // Vida & Mana e Defesa vêm logo aqui, ANTES de Atributos — são os números que você realmente
  // fica olhando toda hora numa sessão de jogo; Atributos você define uma vez e quase nunca
  // mexe de novo, então não precisa disputar espaço com o que importa durante o combate.
  // Painel Status (15/11/2026, variante B): vida, Defesa e mana: o escudo da Defesa fica encaixado entre os
  // anéis e abre a conta ao tocar; o painel Defesa separado deixou de existir (js/status.js).
  wrap.appendChild(el('div',{class:'panel faixa'},
    el('h2',{},'Status'),
    renderVidaDefesaMana(f),
    renderEmJogo(f),
    renderCinto(f),
    renderPericiasFixadasFicha(f)
  ));

  wrap.appendChild(renderPainelCondicoes(f));
  wrap.appendChild(renderPainelParceiros(f));
  const painelLembretes = renderPainelLembretesMecanicos(f);
  if(painelLembretes) wrap.appendChild(painelLembretes);
  wrap.appendChild(renderNasMaos(f));
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

// ---- Missões: checklist simples de objetivos ativos/concluídos ----

// ---- Facções: reputação simples (amigo/neutro/inimigo) com grupos importantes ----
const CICLO_STATUS_FACCAO = ['neutro','amigo','inimigo'];
const ICONE_STATUS_FACCAO = {neutro:'😐 Neutro', amigo:'🤝 Amigo', inimigo:'⚔️ Inimigo'};

// ---- Relacionamentos: PNJs importantes pro personagem (aliados, rivais, família...) ----
const TIPOS_RELACIONAMENTO = ['Aliado','Rival','Família','Mentor','Amor','Outro'];
const ICONE_RELACIONAMENTO = {Aliado:'🤝', Rival:'⚔️', Família:'👪', Mentor:'📖', Amor:'❤️', Outro:'👤'};

// ---- Locais: diário de exploração simples (onde estivemos + uma nota) ----

// Liga uma arma de disparo à munição correspondente na mochila. Arco usa flecha, besta usa
// virote — sem isso, o jogador tinha que ir na Mochila procurar e editar a quantidade na mão.
const MUNICAO_POR_ARMA = [
  {padraoArma:/arco/i, itemMunicao:'Flechas (20)'},
  {padraoArma:/besta/i, itemMunicao:'Virotes (20)'},
  {padraoArma:/pistola|mosquete|arcabuz|trabuco/i, itemMunicao:'Balas (20)'},
];
function municaoDaArma(f, arma){
  const regra = MUNICAO_POR_ARMA.find(r=> r.padraoArma.test(arma.nome||''));
  if(!regra) return null;
  const idx = (f.equip||[]).findIndex(row=> row.tipo==='geral' && nomeCatalogoDaLinha(row)===regra.itemMunicao);
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
    removerItemMochila(f, idx);
    flashMsg('✨ Usou o último '+row.item+' — removido da mochila.'+mensagemExtra);
  } else {
    row.qtd = String(atual-1);
    flashMsg('✨ Usou 1 '+row.item+' ('+row.qtd+' restante'+(atual-1>1?'s':'')+').'+mensagemExtra);
  }
  salvarPerfis(); render();
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
