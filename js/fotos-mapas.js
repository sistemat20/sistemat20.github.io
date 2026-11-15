// Fotos de personagem (envio e recorte) e mapas do Mestre.
// Separado do js/app.js em 15/11/2026 (item 6 da revisão geral), sem mudar o código.

// Recebe um arquivo de imagem escolhido pelo jogador e abre o ajustador de posição (arrastar
// pra escolher o que aparece) antes de confirmar — só depois disso é que redimensiona/comprime/envia.
// Upload de mapa — bem mais simples que o de foto de personagem (sem recorte circular, mapa é
// retângulo mesmo). Redimensiona se for muito grande (economiza espaço/banda), manda pro servidor
// (ou guarda direto, no modo Claude) e adiciona na lista de mapas do Mestre.
function handleMapaUpload(file){
  if(!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = (e)=>{
    const img = new Image();
    img.onload = async ()=>{
      const MAX_LADO = 1600;
      let w = img.naturalWidth, h = img.naturalHeight;
      if(w>MAX_LADO || h>MAX_LADO){
        const escala = MAX_LADO / Math.max(w,h);
        w = Math.round(w*escala); h = Math.round(h*escala);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      const base64 = canvas.toDataURL('image/jpeg', 0.85);
      state._mapaEnviando = true;
      render();
      const url = await enviarFotoParaBackend(base64, 'mapa_'+Date.now()+'.jpg');
      if(!state._mestreMapas) state._mestreMapas = [];
      state._mestreMapas.push({nome: state._novoMapaNome||'Mapa sem nome', url});
      state._novoMapaNome = '';
      state._mapaEnviando = false;
      sincronizarGradeCompartilhada();
      flashMsg('🗺️ Mapa adicionado!');
      render();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// Popup de visualização ampliada — usado tanto pelo Mestre (lista de mapas enviados) quanto
// pelo jogador (Notas → Locais), pra não ter que rolar a tela toda cheia de imagem: o nome vira
// clicável, e só abre grande quando alguém realmente quer ver.
function abrirVisualizarMapa(nome, url){
  state._visualizarMapaPopup = {nome, url};
  render();
}

function renderPopupVisualizarMapa(){
  const fluxo = state._visualizarMapaPopup;
  const overlay = el('div',{class:'menu-overlay', style:'padding:10px;', onclick:(e)=>{ if(e.target===e.currentTarget){ state._visualizarMapaPopup=null; render(); } }});
  const sheet = el('div',{class:'menu-sheet', style:'max-width:none;width:100%;padding:0;'});
  sheet.appendChild(el('div',{style:'display:flex;justify-content:space-between;align-items:center;padding:12px 14px;'},
    el('div',{class:'wizard-title', style:'margin:0;'}, fluxo.nome),
    el('button',{class:'remove-x', onclick:()=>{ state._visualizarMapaPopup=null; render(); }},'✕')
  ));
  sheet.appendChild(el('img',{src:fluxo.url, style:'width:100%;display:block;border-bottom-left-radius:var(--radius-lg);border-bottom-right-radius:var(--radius-lg);'}));
  overlay.appendChild(sheet);
  return overlay;
}

function renderMestreMapas(){
  const wrap = el('div',{});
  if(!state._mestreMapas) state._mestreMapas = [];
  const panel = el('div',{class:'panel faixa'}, el('h2',{},'Mapas'));
  panel.appendChild(el('div',{class:'tip', style:'font-size:0.8rem;'}, 'Envie mapas/imagens de lugares importantes — eles ficam disponíveis pros jogadores em Notas → Locais, pra qualquer um adicionar como referência visual de um lugar que já visitaram.'));
  if(!state._novoMapaNome) state._novoMapaNome = '';
  panel.appendChild(el('label',{style:'margin-top:8px;'},'Nome do mapa/lugar'));
  panel.appendChild(el('input',{type:'text', placeholder:'ex: Taverna do Javali Dourado', value:state._novoMapaNome, oninput:(e)=>{state._novoMapaNome=e.target.value;}}));
  if(state._mapaEnviando){
    panel.appendChild(el('div',{class:'empty', style:'margin-top:10px;'}, 'Enviando mapa...'));
  } else {
    panel.appendChild(el('label',{class:'btn ghost', style:'margin-top:10px;display:block;text-align:center;cursor:pointer;'},
      '📤 Escolher imagem',
      el('input',{type:'file', accept:'image/*', style:'display:none;', onchange:(e)=>{
        if(!state._novoMapaNome || !state._novoMapaNome.trim()){ flashMsg('Coloca um nome pro mapa primeiro.'); e.target.value=''; return; }
        if(e.target.files[0]) handleMapaUpload(e.target.files[0]);
      }})
    ));
  }
  wrap.appendChild(panel);

  const listaPanel = el('div',{class:'panel'}, el('h2',{},'Mapas Enviados ('+state._mestreMapas.length+')'));
  if(state._mestreMapas.length===0){
    listaPanel.appendChild(el('div',{class:'empty'}, 'Nenhum mapa enviado ainda.'));
  } else {
    state._mestreMapas.forEach((mapa, idx)=>{
      listaPanel.appendChild(el('div',{class:'spell-card'},
        el('div',{class:'head', style:'cursor:pointer;', onclick:()=>abrirVisualizarMapa(mapa.nome, mapa.url)},
          el('span',{class:'name'}, '🗺️ ', mapa.nome),
          el('button',{class:'remove-x', onclick:(e)=>{
            e.stopPropagation();
            if(!confirm('Remover o mapa "'+mapa.nome+'"? Os jogadores que já adicionaram como local continuam vendo (a imagem fica guardada na anotação deles).')) return;
            state._mestreMapas.splice(idx,1);
            sincronizarGradeCompartilhada();
            render();
          }},'✕')
        ),
      ));
    });
  }
  wrap.appendChild(listaPanel);

  return wrap;
}

function handleFotoUpload(f, file){
  if(!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = (e)=>{
    const img = new Image();
    img.onload = ()=>{
      state._cropperFoto = { ficha:f, img:img, imgSrc:e.target.result, posX:50, posY:50 };
      render();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// Depois que o jogador arrasta e confirma a posição, recorta exatamente o que estava visível,
// redimensiona pra um quadrado final e manda pro servidor (Storage do Supabase) ou guarda direto (modo Claude).
function confirmarCropFoto(){
  const c = state._cropperFoto;
  if(!c) return;
  const TAM = 260;
  const naturalW = c.img.naturalWidth, naturalH = c.img.naturalHeight;
  const scale = Math.max(TAM/naturalW, TAM/naturalH);
  const excessX = Math.max(0, naturalW*scale - TAM);
  const excessY = Math.max(0, naturalH*scale - TAM);
  const srcX = (excessX * (c.posX/100)) / scale;
  const srcY = (excessY * (c.posY/100)) / scale;
  const srcSize = TAM/scale;

  const OUT = 300;
  const canvas = document.createElement('canvas');
  canvas.width = OUT; canvas.height = OUT;
  canvas.getContext('2d').drawImage(c.img, srcX, srcY, srcSize, srcSize, 0, 0, OUT, OUT);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.72);

  const f = c.ficha;
  if(_cropperFotoLimpar){ _cropperFotoLimpar(); _cropperFotoLimpar = null; }
  state._cropperFoto = null;
  render();
  (async ()=>{
    flashMsg('Enviando foto...');
    const urlFinal = await enviarFotoParaBackend(dataUrl, 'personagem_'+f.id+'.jpg');
    f.foto = urlFinal;
    salvarPerfis(); render();
  })();
}

// Painel de ajuste de posição da foto — arraste a imagem dentro do quadro pra escolher o que
// aparece (útil quando a foto original é bem mais alta/larga que o quadro final).
// Guarda a função de limpeza do arrasto atual (se houver), pra garantir que nunca fique
// um "mousemove"/"mouseup" grudado no document depois que o popup fechar — isso ia se
// acumular a cada foto enviada e deixar o app mais lento com o tempo.
let _cropperFotoLimpar = null;

function fecharCropperFoto(){
  if(_cropperFotoLimpar){ _cropperFotoLimpar(); _cropperFotoLimpar = null; }
  state._cropperFoto = null;
  render();
}

function renderCropperFoto(){
  if(_cropperFotoLimpar){ _cropperFotoLimpar(); _cropperFotoLimpar = null; } // limpa qualquer arrasto pendente de uma abertura anterior
  const c = state._cropperFoto;
  const TAM = 260;
  const overlay = el('div',{class:'menu-overlay', onclick:(e)=>{ if(e.target===e.currentTarget){ fecharCropperFoto(); } }});
  const sheet = el('div',{class:'menu-sheet', style:'max-width:320px;text-align:center;padding:18px;'});
  sheet.appendChild(el('div',{class:'wizard-title'},'Ajustar foto'));
  sheet.appendChild(el('div',{class:'tip', style:'font-size:0.78rem;'}, 'Arraste a imagem pra escolher a parte que vai aparecer.'));

  const viewport = el('div',{style:'width:'+TAM+'px;height:'+TAM+'px;margin:14px auto;border-radius:14px;overflow:hidden;border:2px solid var(--gold-deep);position:relative;cursor:grab;touch-action:none;background:#000;'});
  const imgEl = el('img',{src:c.imgSrc, draggable:'false', style:'width:100%;height:100%;object-fit:cover;object-position:'+c.posX+'% '+c.posY+'%;display:block;pointer-events:none;user-select:none;'});
  viewport.appendChild(imgEl);

  const naturalW = c.img.naturalWidth, naturalH = c.img.naturalHeight;
  const scale = Math.max(TAM/naturalW, TAM/naturalH);
  const excessX = Math.max(0, naturalW*scale - TAM);
  const excessY = Math.max(0, naturalH*scale - TAM);

  let arrastando = false, ultimoX = 0, ultimoY = 0;
  function mover(dx, dy){
    if(excessX>0) c.posX = Math.max(0, Math.min(100, c.posX - (dx/excessX)*100));
    if(excessY>0) c.posY = Math.max(0, Math.min(100, c.posY - (dy/excessY)*100));
    imgEl.style.objectPosition = c.posX+'% '+c.posY+'%';
  }
  function onMove(e){
    if(!arrastando) return;
    const px = e.touches ? e.touches[0].clientX : e.clientX;
    const py = e.touches ? e.touches[0].clientY : e.clientY;
    mover(px-ultimoX, py-ultimoY);
    ultimoX = px; ultimoY = py;
  }
  function onUp(){
    arrastando = false;
    viewport.style.cursor = 'grab';
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('touchend', onUp);
    _cropperFotoLimpar = null;
  }
  function onDown(e){
    arrastando = true;
    viewport.style.cursor = 'grabbing';
    const px = e.touches ? e.touches[0].clientX : e.clientX;
    const py = e.touches ? e.touches[0].clientY : e.clientY;
    ultimoX = px; ultimoY = py;
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, {passive:false});
    document.addEventListener('touchend', onUp);
    _cropperFotoLimpar = onUp; // se o popup fechar por outro caminho, isso garante a limpeza
    e.preventDefault();
  }
  viewport.addEventListener('mousedown', onDown);
  viewport.addEventListener('touchstart', onDown, {passive:false});

  sheet.appendChild(viewport);
  sheet.appendChild(el('div',{class:'row'},
    el('button',{class:'btn ghost', onclick:fecharCropperFoto}, 'Cancelar'),
    el('button',{class:'btn', onclick:confirmarCropFoto}, 'Confirmar')
  ));
  overlay.appendChild(sheet);
  return overlay;
}
