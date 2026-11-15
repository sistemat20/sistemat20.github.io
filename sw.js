// Service worker do Painel do Aventureiro (15/11/2026): deixa o app abrir sem internet.
// · Ao instalar, lê o index.html e guarda tudo o que ele carrega (scripts, estilos, dados, ícones).
// · Arquivos do próprio site: tenta a rede primeiro (assim cada publicação chega na hora) e, se
//   não vier em alguns segundos ou não houver sinal, usa a cópia guardada.
// · Fontes do Google: usa a cópia guardada e atualiza por trás.
// · Supabase e qualquer envio (POST) passam direto: nada de dados de ficha no cache.
const CACHE = 'painel-t20-v1';
const ESPERA_REDE_MS = 3500;

self.addEventListener('install', (evento)=>{
  evento.waitUntil((async ()=>{
    const cache = await caches.open(CACHE);
    const base = ['./', './index.html', './manifest.webmanifest', './img/icon-192.png', './img/icon-512.png', './favicon.ico'];
    try{
      const html = await (await fetch('./index.html', {cache:'no-cache'})).text();
      const locais = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m=> m[1]).filter(u=> !/^(https?:|data:|#|mailto:)/.test(u));
      await cache.addAll([...new Set(base.concat(locais.map(u=> './'+u.replace(/^\.?\//,''))))]);
    }catch(e){ await cache.addAll(base).catch(()=>{}); }
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (evento)=>{
  evento.waitUntil((async ()=>{
    const nomes = await caches.keys();
    await Promise.all(nomes.filter(n=> n.startsWith('painel-t20-') && n!==CACHE).map(n=> caches.delete(n)));
    await self.clients.claim();
  })());
});

function comPrazo(promessa, ms){
  return new Promise((ok, falha)=>{ const t = setTimeout(()=> falha(new Error('demorou')), ms); promessa.then(r=>{ clearTimeout(t); ok(r); }, e=>{ clearTimeout(t); falha(e); }); });
}

self.addEventListener('fetch', (evento)=>{
  const req = evento.request;
  if(req.method!=='GET') return;
  const url = new URL(req.url);
  if(/supabase\.co$/.test(url.hostname)) return;
  if(/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)){
    evento.respondWith((async ()=>{
      const cache = await caches.open(CACHE);
      const guardado = await cache.match(req);
      const daRede = fetch(req).then(r=>{ if(r.ok || r.type==='opaque') cache.put(req, r.clone()); return r; }).catch(()=> null);
      return guardado || (await daRede) || new Response('', {status:504});
    })());
    return;
  }
  if(url.origin!==self.location.origin) return;
  evento.respondWith((async ()=>{
    const cache = await caches.open(CACHE);
    const daRede = fetch(req).then(r=>{ if(r && r.ok) cache.put(req, r.clone()); return r; });
    try{
      return await comPrazo(daRede, ESPERA_REDE_MS);
    }catch(e){
      const guardado = (await cache.match(req, {ignoreSearch:true})) || (req.mode==='navigate' ? await cache.match('./index.html') : null);
      if(guardado) return guardado;
      // Nada guardado ainda (primeira vez): com internet lenta, espera a rede mesmo.
      try{ return await daRede; }catch(e2){ return Response.error(); }
    }
  })());
});
