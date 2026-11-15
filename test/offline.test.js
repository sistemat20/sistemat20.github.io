// App instalável e sem internet (15/11/2026).

const fs = require('fs');
const path = require('path');
const h = require('./harness');

(async () => {
  const { window: w } = h.carregarApp();
  const RAIZ = path.resolve(__dirname, '..');

  h.secao('Instalar');
  {
    const m = JSON.parse(fs.readFileSync(path.join(RAIZ, 'manifest.webmanifest'), 'utf8'));
    h.ok('manifesto com nome, tela cheia e ícones 192 e 512', m.short_name === 'Painel T20' && m.display === 'standalone' && ['192x192', '512x512'].every((s) => m.icons.some((i) => i.sizes === s)));
    h.ok('os ícones existem', m.icons.every((i) => fs.existsSync(path.join(RAIZ, i.src))));
    const html = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
    h.ok('index.html aponta o manifesto e o nome no iPhone', html.includes('rel="manifest"') && html.includes('apple-mobile-web-app-title'));
    const sw = fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8');
    h.ok('o service worker não guarda nada do Supabase nem envios', /supabase\\.co/.test(sw) && sw.includes("req.method!=='GET'"));
  }

  h.secao('iPhone: bordas, barra fixa e som');
  {
    const html = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
    h.ok('viewport-fit=cover (sem isso as folgas do entalhe valem 0)', html.includes('viewport-fit=cover'));
    const estilo = fs.readFileSync(path.join(RAIZ, 'css/style.css'), 'utf8');
    h.ok('html não tem overflow-x (no iPhone isso solta a barra de baixo)', !/html,body\{[^}]*overflow-x/.test(estilo));
    const kit = fs.readFileSync(path.join(RAIZ, 'css/kit.css'), 'utf8');
    h.ok('topo e menu respeitam a folga do aparelho', kit.includes('.topo-compacto{ padding-top:calc(8px + env(safe-area-inset-top') && kit.includes('.menu-overlay{ padding-top:calc(18px + env(safe-area-inset-top'));
    const ficha = fs.readFileSync(path.join(RAIZ, 'js/ficha.js'), 'utf8');
    h.ok('os avisos usam um só contexto de som (o iPhone cala contexto novo)', !ficha.includes('new (window.AudioContext') && typeof w.Som.contexto === 'function');
  }

  h.secao('O que foi feito sem internet não se perde');
  {
    w.marcarEnvioPendente(true);
    h.ok('marca envio pendente', w.envioPendente());
    w.marcarEnvioPendente(false);
    h.ok('e limpa', !w.envioPendente());
    const local = [{ id: 'a', nome: 'Lucéa', pvatual: 10, ts: 100, equip: [{ item: 'Ácido', qtd: '1' }], _versao: 3 }];
    const servidor = [
      { id: 'a', nome: 'Lucéa', pvatual: 26, ts: 150, equip: [{ item: 'Ácido', qtd: '1' }, { item: 'Poção (recebido do Mestre)', qtd: '1' }], _versao: 4 },
      { id: 'b', nome: 'Ravena', _versao: 1 }];
    const juntos = w.mesclarFichasPendentes(local, servidor);
    const a = juntos.find((p) => p.id === 'a');
    h.igual('a vida mexida sem internet fica', a.pvatual, 10);
    h.ok('o presente que chegou no servidor entra', a.equip.some((e) => e.item === 'Poção (recebido do Mestre)'));
    h.igual('o dinheiro maior do servidor não se perde', a.ts, 150);
    h.igual('fica com a versão do servidor (sem conflito no envio)', a._versao, 4);
    h.ok('ficha que só o servidor tem entra', juntos.some((p) => p.id === 'b'));
  }

  h.resumo();
})();
