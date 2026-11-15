// ============ APP INSTALÁVEL E SEM INTERNET (15/11/2026) ============
// · Registra o service worker (sw.js), que guarda o app no aparelho para abrir sem sinal.
// · Android/Chrome: guarda o pedido de instalação e mostra "📲 Instalar o app" no Mais.
// · iPhone: a Apple não deixa site ter botão de instalar; o Mais mostra o passo a passo do Safari.
// · Sem internet: aviso pequeno no topo; o que for salvo fica no aparelho e é enviado sozinho
//   quando o sinal volta (envio pendente, ver storage-adapter.js).

const CHAVE_ENVIO_PENDENTE = 'painel_aventureiro_envio_pendente';
let _pedidoInstalacao = null;

function envioPendente(){ try{ return localStorage.getItem(CHAVE_ENVIO_PENDENTE)==='1'; }catch(e){ return false; } }
function marcarEnvioPendente(sim){ try{ if(sim) localStorage.setItem(CHAVE_ENVIO_PENDENTE, '1'); else localStorage.removeItem(CHAVE_ENVIO_PENDENTE); }catch(e){} }
function estaSemInternet(){ return typeof navigator!=='undefined' && navigator.onLine===false; }
function estaInstalado(){
  try{ return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone===true; }catch(e){ return false; }
}
function ehIphone(){ return /iphone|ipad|ipod/i.test((navigator && navigator.userAgent)||'') || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1); }

function iniciarModoOffline(){
  if(typeof window==='undefined' || /jsdom/i.test((navigator && navigator.userAgent)||'')) return;
  if(typeof destravarAudioNoPrimeiroToque==='function') destravarAudioNoPrimeiroToque();
  if('serviceWorker' in navigator && /^https?:$/.test(location.protocol)){
    navigator.serviceWorker.register('./sw.js').catch(e=> console.warn('Service worker não registrou:', e));
  }
  window.addEventListener('beforeinstallprompt', (e)=>{ e.preventDefault(); _pedidoInstalacao = e; if(state.screen==='ficha') render(); });
  window.addEventListener('appinstalled', ()=>{ _pedidoInstalacao = null; flashMsg('📲 App instalado! Agora ele abre pelo ícone, até sem internet.'); render(); });
  window.addEventListener('offline', ()=> render());
  window.addEventListener('online', ()=>{
    render();
    if(envioPendente() && state.perfis && state.perfis.length){
      salvarPerfisArmazenamento(state.perfis).then(()=>{ if(!envioPendente()) flashMsg('☁️ Sinal de volta: o que foi feito sem internet foi enviado.'); render(); });
    }
  });
}

// Opção no menu Mais: botão no Android, passo a passo no iPhone; some quando já está instalado.
function renderOpcaoInstalar(){
  if(estaInstalado()) return null;
  if(_pedidoInstalacao){
    return el('button',{class:'linha-menu', onclick: async ()=>{
      const pedido = _pedidoInstalacao; _pedidoInstalacao = null;
      pedido.prompt();
      try{ await pedido.userChoice; }catch(e){}
      state._menuAberto = false; render();
    }}, el('span',{class:'ico'}, '📲'), el('span',{}, 'Instalar o app'), el('span',{class:'vl'}, '▸'));
  }
  if(ehIphone()){
    const aberto = !!state._dicaIphone;
    return el('div',{},
      el('button',{class:'linha-menu', onclick:()=>{ state._dicaIphone = !aberto; render(); }}, el('span',{class:'ico'}, '📲'), el('span',{}, 'Instalar no iPhone'), el('span',{class:'vl'}, aberto ? '▾' : '▸')),
      aberto ? el('div',{class:'dica-iphone'},
        el('div',{}, el('b',{}, '1. '), 'Toque em ', el('span',{class:'ic-compartilhar'}, '⬆︎'), ' Compartilhar. No iOS mais novo ele fica dentro do botão ', el('b',{}, '⋯'), ' ao lado do endereço.'),
        el('div',{}, el('b',{}, '2. '), 'Role e toque em ', el('b',{}, 'Adicionar à Tela de Início'), ' e confirme.'),
        el('div',{}, el('b',{}, '3. '), 'Abra pelo ícone novo na tela. Esta opção some quando o app já está instalado.'),
        el('div',{class:'meta-ej'}, 'Instalado, ele abre pelo ícone em tela cheia e funciona sem internet. Sem instalar, o iPhone pode apagar a cópia do aparelho depois de uns 7 dias sem uso.')) : null);
  }
  return null;
}
// Selo pequeno no topo: sem internet, ou com algo esperando para ser enviado.
function renderSeloConexao(){
  if(estaSemInternet()) return el('span',{class:'selo-conexao off', title:'Sem internet: o que você fizer fica salvo no aparelho e é enviado quando o sinal voltar'}, '📴');
  if(envioPendente()) return el('span',{class:'selo-conexao pendente', title:'Enviando o que foi feito sem internet'}, '⏳');
  return null;
}

if(typeof window!=='undefined') window.addEventListener('load', iniciarModoOffline);
