// =========================================================================================
// Mochila nova (13/11/2026, prancha "Mochila e Catálogo"):
//  · Mochila por grupos (Vestindo, Empunhando, Consumíveis, Equipamento), barra de carga em
//    fatias e a conta do limite por extenso;
//  · nome limpo com selos (melhorias, presente) e a história ao abrir — só exibição;
//  · quatro medalhões para os itens vestidos com benefício (o limite do livro vira forma);
//  · bolsa em uma linha, só T$ na tela, com seletor TO · T$ · TC que volta sempre para T$;
//  · cinto de uso rápido abaixo dos anéis de vida e mana (o dado é rolado na mesa).
// Nenhum preço aparece para o jogador: o valor quem combina é o Mestre.
// =========================================================================================

const GRUPOS_MOCHILA = [
  {id:'vestindo', nome:'Vestindo', cor:'var(--gold)'},
  {id:'empunhando', nome:'Empunhando', cor:'var(--red-bright)'},
  {id:'consumiveis', nome:'Consumíveis', cor:'var(--pm-accent)'},
  {id:'equipamento', nome:'Equipamento', cor:'var(--ink-soft)'},
];
const CATEGORIAS_CONSUMIVEIS = new Set(['Alquímico','Catalisador','Alimentação','Veneno']);
// Itens que recuperam vida ou mana ao usar: o dado é rolado na mesa, o cinto mostra uma tecla
// para cada resultado possível.
const ITENS_USO = {
  'Essência de mana': {recurso:'pm', dado:'1d4'},
  'Pó Azul': {recurso:'pm', dado:'2d4'},
  'Bálsamo restaurador': {recurso:'pv', dado:'2d4'},
  'Bálsamo de Drogadora': {recurso:'pv', dado:'4d6+4'},
  'Poção de Curar Ferimentos (2d8+2 PV)': {recurso:'pv', dado:'2d8+2'},
};
// Faixa de resultados de um dado no formato "XdY+Z".
function faixaDado(dado){
  const m = String(dado||'').replace(/\s/g,'').match(/^(\d*)d(\d+)([+-]\d+)?$/i);
  if(!m) return null;
  const n = parseInt(m[1]||'1'), lados = parseInt(m[2]), mod = parseInt(m[3]||'0');
  return {min:n+mod, max:n*lados+mod};
}
function usoDoItem(row){
  const ess = (row.essencias||[]).find(e=>e.tipo==='uso');
  if(ess) return {recurso:ess.recurso||'pm', dado:ess.dado};
  return ITENS_USO[nomeCatalogoDaLinha(row)] || null;
}
function ehConsumivel(row){
  if(row.tipo!=='geral') return false;
  const nome = nomeCatalogoDaLinha(row);
  const cat = ITENS_GERAIS.find(i=>i.n===nome);
  if(cat && CATEGORIAS_CONSUMIVEIS.has(cat.cat)) return true;
  if(typeof POCOES_MAGICAS!=='undefined' && POCOES_MAGICAS.some(p=>p.nome===nome)) return true;
  if(row.forma==='consumivel' || usoDoItem(row)) return true;
  return !!(typeof CATALISADORES_CD_ESCOLA!=='undefined' && (CATALISADORES_CD_ESCOLA[nome] || CATALISADORES_CUSTO_ESCOLA[nome] || CATALISADORES_DANO_LEMBRETE[nome]));
}
function grupoDaLinha(row){
  if(row.tipo==='geral' && row.vestido) return 'vestindo';
  if(ehConsumivel(row)) return 'consumiveis';
  return 'equipamento';
}
// Espaço de UMA unidade da linha, como a carga conta (Inventário Organizado, mochila vestida).
function espacoUnidade(f, row){
  let e = parseFloat(String(row.carga).replace(',','.'))||0;
  if(row.tipo==='geral' && row.vestido && MOCHILAS_VESTIVEIS[nomeCatalogoDaLinha(row)]) e = 0;
  if(poderesAtivos(f).includes('Inventário Organizado') && e===0.5) e = 0.25;
  return e;
}
function pesoDaLinha(f, row){ return espacoUnidade(f, row) * (parseFloat(row.qtd)||1); }
function fmtEsp(n){ return String(Math.round(n*100)/100).replace('.',','); }
// Bolinhas de espaço: cheia = 1, meia = ½, um quarto = ¼.
function pipsEspaco(e){
  const w = el('span',{class:'pips', title:fmtEsp(e)+' espaço'});
  if(e>=1) for(let i=0;i<Math.min(Math.round(e),3);i++) w.appendChild(el('i',{class:'c'}));
  else if(e>=0.5) w.appendChild(el('i',{class:'m'}));
  else if(e>0) w.appendChild(el('i',{class:'q'}));
  else w.appendChild(el('i',{}));
  return w;
}

// ---- Nome limpo com selos (só exibição; o nome salvo não muda) ----
function nomeLimpoComSelos(row){
  const p = separarPresente(row.item);
  let nome = p.base;
  const selos = [];
  if(row.superior || row.melhoriasTxt){
    const m = nome.match(/^(.*?)\s*\(([^()]*)\)\s*$/);
    if(m && m[2] && !/\d+d\d+/.test(m[2])){ nome = m[1]; m[2].split(',').map(x=>x.trim()).filter(Boolean).forEach(x=> selos.push({txt:x})); }
    if(!selos.length && row.superior) selos.push({txt:'superior'});
  }
  (row.essencias||[]).forEach(e=> selos.push({txt:descricaoEssencia(e), classe:'ess'}));
  if(p.de) selos.push({txt: p.de==='do Mestre' ? 'presente do Mestre' : 'presente de '+p.de, classe:'presente selo-presente'});
  return {nome, selos};
}
// Caminho do item pelas marcas de presente (do mais antigo ao mais novo) e linhas do log.
function historiaDoItem(f, row){
  const linhas = [];
  const marcas = [...String(row.item).matchAll(/\((recebido (?:do Mestre|de [^)]*))\)/g)].map(m=>m[1]);
  marcas.forEach(m=> linhas.push(m.charAt(0).toUpperCase()+m.slice(1)));
  const base = nomeLimpoComSelos(row).nome.toLowerCase();
  (f.log||[]).filter(l=> String(l.texto).toLowerCase().includes(base)).slice(0,4).reverse()
    .forEach(l=> linhas.push(new Date(l.ts).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})+' · '+l.texto));
  return linhas;
}
function descricaoEssencia(e){
  const v = parseInt(e.valor)||0, sinal = v>=0 ? '+' : '−', abs = Math.abs(v);
  if(e.tipo==='pericia') return sinal+abs+' '+e.pericia;
  if(e.tipo==='pm') return sinal+abs+' PM';
  if(e.tipo==='pv') return sinal+abs+' PV';
  if(e.tipo==='carga') return sinal+abs+' de carga';
  if(e.tipo==='magia_custo') return sinal+abs+' PM em '+e.escola;
  if(e.tipo==='magia_cd') return sinal+abs+' CD de '+e.escola;
  if(e.tipo==='uso') return 'recupera '+e.dado+' '+(e.recurso==='pv'?'PV':'PM');
  if(e.tipo==='arma') return e.texto || 'arma';
  return e.texto || '—';
}

// ---- Benefício de um item vestido (para os medalhões) ----
function beneficioVestido(f, fonte){
  if(fonte.tipo==='armadura') return 'armadura';
  const row = fonte.row || {};
  const nomeCat = nomeCatalogoDaLinha(row);
  if(MOCHILAS_VESTIVEIS[nomeCat]) return '+'+MOCHILAS_VESTIVEIS[nomeCat]+' de carga';
  const partes = [];
  const c = fonte.catalogo;
  if(c && c.bonusPericia){ (Array.isArray(c.bonusPericia)?c.bonusPericia:[c.bonusPericia]).forEach(b=> partes.push((b.valor>=0?'+':'')+b.valor+' '+b.nome)); }
  if(c && c.bonusRecurso) partes.push('+'+c.bonusRecurso.valor+' '+c.bonusRecurso.recurso.toUpperCase());
  (row.essencias||[]).forEach(e=> partes.push(descricaoEssencia(e)));
  if(!partes.length){
    const desc = (c && c.desc) || (fonte.catalogoMagico && fonte.catalogoMagico.desc) || row.descCustom || '';
    if(desc) partes.push(desc.split(/[;.(]/)[0].slice(0,34));
  }
  return partes.join(', ');
}
function iniciaisItem(nome){
  const palavras = nomeBaseItem(nome).replace(/\(.*?\)/g,'').split(/\s+/).filter(p=>p.length>2 || /^[A-ZÁÉÍÓÚ]/.test(p));
  return ((palavras[0]||'?')[0] + ((palavras[1]||'')[0]||'')).toUpperCase();
}
function podeForjarLinha(row){
  if(row.superior) return false;
  if(['arma','armadura','escudo','esoterico'].includes(row.tipo)) return true;
  const cat = ITENS_GERAIS.find(i=>i.n===nomeCatalogoDaLinha(row));
  return !!(cat && (cat.cat==='Vestuário' || cat.cat==='Ferramenta'));
}
// Vestir respeitando o limite (sem quinto medalhão) e uma mochila só nas costas.
function vestirLinha(f, idx){
  const row = f.equip[idx]; if(!row) return;
  if(row.vestido){ row.vestido = false; registrarLog(f, 'Guardou: '+nomeBaseItem(row.item)); salvarPerfis(); render(); return; }
  const nomeCat = nomeCatalogoDaLinha(row);
  if(MOCHILAS_VESTIVEIS[nomeCat]){
    const outra = f.equip.find(r=> r!==row && r.tipo==='geral' && r.vestido && MOCHILAS_VESTIVEIS[nomeCatalogoDaLinha(r)]);
    if(outra){ outra.vestido = false; flashMsg('Só uma mochila nas costas: '+nomeCat+' entrou no lugar da '+nomeCatalogoDaLinha(outra)+'.'); }
  }
  const cat = catalogoDaLinha(row);
  if(!vestidoSemBeneficio(row, cat) && itensVestidosTodos(f).length >= limiteItensVestidos(f)){
    flashMsg('Os '+limiteItensVestidos(f)+' medalhões estão cheios. Guarde um item vestido antes de vestir '+nomeBaseItem(row.item)+'.');
    return;
  }
  row.vestido = true;
  state._medalhaoEntrou = row;
  registrarLog(f, 'Vestiu: '+nomeBaseItem(row.item));
  salvarPerfis();
  Som.tocar('sino');
  render();
}

// ---- Painel de carga ----
function renderPainelCarga(f){
  const usada = cargaUsada(f), limite = limiteCarga(f), maxima = cargaMaxima(f);
  const pesos = {vestindo:0, empunhando:0, consumiveis:0, equipamento:0};
  (f.equip||[]).forEach(row=>{ pesos[grupoDaLinha(row)] += pesoDaLinha(f, row); });
  pesos.empunhando = usada - (pesos.vestindo + pesos.consumiveis + pesos.equipamento);
  const escala = Math.max(usada, limite) * 1.05 || 1;
  const foco = state._mochilaFoco || '';
  const barra = el('div',{class:'barra-carga', role:'img', 'aria-label':'Carga '+fmtEsp(usada)+' de '+limite});
  GRUPOS_MOCHILA.forEach(g=>{
    const p = Math.max(0, pesos[g.id]);
    if(!p) return;
    barra.appendChild(el('span',{title:g.nome+': '+fmtEsp(p), style:'flex:0 0 '+(p/escala*100)+'%;background:'+g.cor+';opacity:'+(foco&&foco!==g.id?'.3':'1')+';',
      onclick:()=>{ state._mochilaFoco = foco===g.id ? '' : g.id; render(); }}));
  });
  barra.appendChild(el('i',{class:'limite', style:'left:'+(limite/escala*100)+'%;'}));
  let estado, cor;
  if(usada > maxima){ estado = 'Você não pode carregar tudo isso: o máximo é '+maxima+' espaços.'; cor = 'var(--red-bright)'; }
  else if(usada > limite){ estado = 'Sobrecarregada: −5 de penalidade de armadura e −3 m de deslocamento (já aplicado).'; cor = 'var(--gold)'; }
  else { estado = 'Dentro do limite, sem penalidades.'; cor = 'var(--status-saudavel)'; }
  const partes = limiteCargaPartes(f);
  return el('div',{class:'panel faixa'},
    el('h2',{},'Mochila'),
    el('div',{class:'carga-total'}, el('b',{class:'num'}, fmtEsp(usada)+' / '+limite), ' espaços', el('span',{class:'meta'}, ' · máximo '+maxima)),
    barra,
    el('div',{class:'carga-estado', style:'color:'+cor+';'}, estado),
    el('div',{class:'carga-conta'}, 'Limite ', el('b',{}, String(limite)), ' = ', partes.map(p=> p.valor+' ('+p.rotulo+')').join(' + ')),
    el('div',{class:'carga-legenda'}, GRUPOS_MOCHILA.map(g=> el('span',{}, el('i',{style:'background:'+g.cor}), g.nome)))
  );
}

// ---- Corpo de cada linha da mochila (ações) ----
function corpoLinhaMochila(f, row, idx){
  const corpo = [];
  const nomeCat = nomeCatalogoDaLinha(row);
  if(row.tipo==='geral'){
    const itemCatalogo = catalogoDaLinha(row) || (typeof ARTEFATOS!=='undefined' ? ARTEFATOS.find(a=>a.nome===nomeCat) : null)
      || (typeof POCOES_MAGICAS!=='undefined' ? POCOES_MAGICAS.find(p=>p.nome===nomeCat) : null);
    const descItem = row.descCustom || (itemCatalogo ? (itemCatalogo.desc || (itemCatalogo.magia ? 'Contém a magia: '+itemCatalogo.magia : null)) : null);
    const reconhecidoAutomatico = (itemCatalogo && itemCatalogo.vestivel) || ACESSORIOS_VESTIVEIS.has(nomeCat);
    const ehVestivel = reconhecidoAutomatico || row.marcadoVestivel;
    const noCinto = cintoDaFicha(f).includes(nomeCat);
    corpo.push(
      descItem ? el('div',{class:'desc'}, descItem) : null,
      row.melhoriasTxt ? el('div',{class:'meta', style:'text-transform:none;color:var(--gold);'}, row.melhoriasTxt) : null,
      el('div',{class:'acoes-mochila'},
        (/^\d+$/.test(String(row.qtd).trim()) && parseInt(row.qtd)>0 && ehConsumivel(row)) ? el('button',{class:'btn', onclick:()=> usarItemMochila(f, idx)}, 'Usar (−1)') : null,
        ehVestivel ? el('button',{class:'btn ghost', onclick:()=> vestirLinha(f, idx)}, row.vestido?'Guardar':'Vestir') : null,
        ehConsumivel(row) && temBandoleira(f) ? el('button',{class:'btn ghost', onclick:()=> alternarNoCinto(f, nomeCat)}, noCinto?'Tirar do cinto':'Pôr no cinto') : null,
        ehVestivel ? el('button',{class:'btn ghost', onclick:()=> abrirOficina({editarIdx:idx})}, '⚗️ Essências') : null,
        podeForjarLinha(row) ? el('button',{class:'btn ghost', onclick:()=> forjarLinhaDaMochila(f, idx)}, '🔨 Forjar') : null,
        el('button',{class:'btn ghost', onclick:()=>abrirEnviarItem(idx)}, 'Enviar'),
        el('button',{class:'btn ghost', onclick:()=>{ if(!confirm('Remover "'+row.item+'" da mochila? Não tem como desfazer.')) return; registrarLog(f, 'Removeu da mochila: '+row.item); removerItemMochila(f, idx); salvarPerfis(); render(); }}, 'Remover')
      )
    );
  } else {
    let descCatalogo = null;
    const nomeSemSufixo = row.ref || nomeBaseItem(row.item);
    if(row.tipo==='arma'){ const w = ARMAS.find(x=>x.n===nomeSemSufixo); if(w) descCatalogo = 'Dano '+w.dano+' · Crítico '+w.critico+' · Alcance '+w.alcance+' · '+w.tipo+(w.maos>=2?' · 2 mãos':''); }
    else if(row.tipo==='armadura'){ const a = ARMADURAS.find(x=>x.n===nomeSemSufixo); if(a) descCatalogo = 'Defesa +'+a.def+' · Penalidade '+a.pen+' · '+a.cat; }
    else if(row.tipo==='escudo'){ const e = ESCUDOS.find(x=>x.n===nomeSemSufixo); if(e) descCatalogo = 'Defesa +'+e.def+' · Penalidade '+e.pen; }
    else if(row.tipo==='esoterico'){ const it = buscarItemEmpunhavel(row.refBase||nomeSemSufixo); if(it && it.desc) descCatalogo = it.desc; }
    const podeEquipar = ['arma','armadura','escudo','esoterico'].includes(row.tipo);
    corpo.push(
      descCatalogo ? el('div',{class:'desc'}, descCatalogo) : null,
      row.melhoriasTxt ? el('div',{class:'meta', style:'text-transform:none;color:var(--gold);'}, row.melhoriasTxt) : null,
      el('div',{class:'acoes-mochila'},
        podeEquipar ? el('button',{class:'btn ghost', onclick:()=> row.tipo==='esoterico' ? equiparEsotericoDaMochila(idx) : equiparDaMochila(idx)}, 'Equipar') : null,
        podeForjarLinha(row) ? el('button',{class:'btn ghost', onclick:()=> forjarLinhaDaMochila(f, idx)}, '🔨 Forjar') : null,
        el('button',{class:'btn ghost', onclick:()=>abrirEnviarItem(idx)}, 'Enviar'),
        el('button',{class:'btn ghost', onclick:()=>{ if(!confirm('Remover "'+row.item+'" da mochila? Não tem como desfazer.')) return; registrarLog(f, 'Removeu da mochila: '+row.item); removerItemMochila(f, idx); salvarPerfis(); render(); }}, 'Remover')
      )
    );
  }
  const hist = historiaDoItem(f, row);
  if(hist.length) corpo.push(el('div',{class:'hist-item'}, el('div',{class:'rot-mini'},'De onde veio'), el('ul',{class:'hist'}, hist.map(t=> el('li',{}, t)))));
  const reconhecido = row.tipo==='geral' && (((catalogoDaLinha(row)||{}).vestivel) || ACESSORIOS_VESTIVEIS.has(nomeCatalogoDaLinha(row)));
  corpo.push(camposEdicaoItem(row, idx, row.tipo==='geral' && !reconhecido));
  return corpo;
}
// Nome, quantidade e espaço ficam escondidos: só um link "editar" para corrigir algum erro.
function camposEdicaoItem(row, idx, mostrarVestivel){
  if(state._editandoItem!==row) return el('button',{class:'link-editar-item', onclick:()=>{ state._editandoItem = row; render(); }}, 'editar');
  return el('div',{class:'edicao-item'},
    el('label',{},'Nome'),
    el('input',{id:'mochila-nome-'+idx, type:'text', value:row.item, oninput:(e)=>{row.item=e.target.value;}, onchange:()=>{salvarPerfis(); render();}}),
    el('div',{class:'row', style:'margin-top:6px;'},
      el('div',{style:'flex:1;'}, el('label',{},'Quantidade'), el('input',{id:'mochila-qtd-'+idx, type:'text', value:row.qtd, oninput:(e)=>{row.qtd=e.target.value;}, onchange:()=>{salvarPerfis(); render();}})),
      el('div',{style:'flex:1;'}, el('label',{},'Espaço'), el('input',{id:'mochila-carga-'+idx, type:'text', value:row.carga, oninput:(e)=>{row.carga=e.target.value;}, onchange:()=>{salvarPerfis(); render();}}))),
    mostrarVestivel ? el('div',{class:'row', style:'margin-top:8px;align-items:center;'},
      el('input',{type:'checkbox', id:'mochila-vestivel-'+idx, checked: row.marcadoVestivel?'checked':undefined, onchange:(e)=>{ row.marcadoVestivel=e.target.checked; if(!e.target.checked) row.vestido=false; salvarPerfis(); render(); }}),
      el('label',{for:'mochila-vestivel-'+idx, style:'margin:0;font-size:0.78rem;text-transform:none;'}, 'É um item vestível (ocupa 1 medalhão)')) : null,
    el('button',{class:'link-editar-item', onclick:()=>{ state._editandoItem = null; render(); }}, 'concluir'));
}
// Contador − qtd + no cabeçalho do item aberto (com 1, o − pergunta se é para remover).
function mudarQuantidade(f, idx, delta){
  const row = f.equip[idx]; if(!row) return;
  const atual = parseInt(row.qtd)||1;
  if(atual + delta <= 0){
    if(!confirm('Remover "'+nomeBaseItem(row.item)+'" da mochila? Não tem como desfazer.')) return;
    registrarLog(f, 'Removeu da mochila: '+row.item); removerItemMochila(f, idx); salvarPerfis(); render(); return;
  }
  row.qtd = String(atual + delta);
  salvarPerfis(); render();
}
function linhaMochila(f, row, idx){
  const {nome, selos} = nomeLimpoComSelos(row);
  const rotulo = {arma:'Arma', armadura:'Armadura', escudo:'Escudo', esoterico:'Esotérico', geral:'Item'}[row.tipo] || 'Item';
  const e = espacoUnidade(f, row);
  const titulo = el('span',{class:'nome-limpo'}, nome, selos.length ? el('span',{class:'selos-item'}, selos.map(s=> el('span',{class:'selo-item '+(s.classe||'')}, s.txt))) : null);
  const aberto = !!(state._itensExpandidos && state._itensExpandidos['mochila-'+idx]);
  const parar = (fn)=> (ev)=>{ ev.stopPropagation(); fn(); };
  const qtd = aberto
    ? el('span',{class:'qtd-step'}, el('button',{'aria-label':'menos um', onclick:parar(()=> mudarQuantidade(fichaAtual(), idx, -1))}, '−'), el('b',{class:'num'}, String(row.qtd)), el('button',{'aria-label':'mais um', onclick:parar(()=> mudarQuantidade(fichaAtual(), idx, 1))}, '+'))
    : 'qtd '+row.qtd;
  const meta = el('span',{class:'meta-mochila'}, pipsEspaco(e), ' '+rotulo+' · ', qtd, ' · '+fmtEsp(e*(parseFloat(row.qtd)||1))+' esp');
  return renderItemColapsavel('mochila-'+idx, titulo, meta, corpoLinhaMochila(f, row, idx));
}

// ---- Aba Mochila ----
function renderPersonagemMochila(){
  const f = fichaAtual();
  const wrap = el('div',{});
  wrap.appendChild(renderPainelCarga(f));
  const foco = state._mochilaFoco || '';
  const itens = el('div',{class:'panel faixa'}, el('h2',{},'Itens'));
  const indice = {vestindo:[], consumiveis:[], equipamento:[]};
  (f.equip||[]).forEach((row, idx)=> indice[grupoDaLinha(row)].push(idx));
  const empunhados = [];
  (f.armas||[]).forEach(a=> empunhados.push({nome:a.nome, esp:parseFloat(a.esp)||1}));
  if(f.armadura) empunhados.push({nome:f.armadura.nome+' (armadura)', esp:parseFloat(f.armadura.esp)||0});
  if(f.escudo) empunhados.push({nome:f.escudo.nome+' (escudo)', esp:parseFloat(f.escudo.esp)||0});
  (f.esotericos||[]).filter(e=>e.equipado!==false).forEach(e=> empunhados.push({nome:e.nome, esp:0}));
  if(!(f.equip||[]).length && !empunhados.length) itens.appendChild(el('div',{class:'empty'},'Mochila vazia. Vá no Menu → Itens pra buscar itens no catálogo.'));
  GRUPOS_MOCHILA.forEach(g=>{
    const lista = g.id==='empunhando' ? empunhados : indice[g.id];
    if(!lista.length) return;
    const peso = g.id==='empunhando' ? empunhados.reduce((t,x)=>t+x.esp,0) : lista.reduce((t,i)=> t+pesoDaLinha(f, f.equip[i]), 0);
    const secao = el('div',{class:'secao-moch'+(foco===g.id?' foco':'')+(foco&&foco!==g.id?' apaga':'')},
      el('div',{class:'cab', onclick:()=>{ state._mochilaFoco = foco===g.id ? '' : g.id; render(); }},
        el('span',{}, el('i',{style:'background:'+g.cor}), g.nome+' ('+lista.length+')'), el('span',{class:'num'}, fmtEsp(peso)+' esp')));
    if(g.id==='empunhando'){
      secao.appendChild(el('div',{class:'meta', style:'text-transform:none;margin:4px 2px;'}, 'Em uso agora (guarde ou troque na aba Ficha): '+empunhados.map(x=>x.nome).join(', ')));
    } else {
      lista.forEach(idx=> secao.appendChild(linhaMochila(f, f.equip[idx], idx)));
    }
    itens.appendChild(secao);
  });
  itens.appendChild(el('button',{class:'btn ghost', style:'margin-top:10px;', onclick:()=>abrirOficina()}, '⚗️ Criar item personalizado'));
  wrap.appendChild(itens);
  wrap.appendChild(renderBolsa(f));
  return wrap;
}

// ---- Medalhões (itens vestidos) ----
function renderPainelVestidos(f){
  const todos = itensVestidosTodos(f);
  const limite = limiteItensVestidos(f);
  const ativos = todos.slice(0, limite), excedentes = todos.slice(limite);
  const sel = state._medalhaoSel;
  const meds = el('div',{class:'medalhoes', style:'grid-template-columns:repeat('+limite+',1fr);'});
  for(let i=0;i<limite;i++){
    const fonte = ativos[i];
    if(!fonte){ meds.appendChild(el('div',{class:'medalhao vazio'}, el('span',{class:'disco'}, 'livre'), el('b',{},''), el('small',{},''))); continue; }
    const entrou = fonte.row && state._medalhaoEntrou===fonte.row;
    const marcado = sel!=null && sel===i;
    meds.appendChild(el('button',{class:'medalhao cheio'+(entrou?' entra':'')+(marcado?' marcado':''), onclick:()=>{ state._medalhaoSel = marcado ? null : i; render(); }},
      el('span',{class:'disco'}, fonte.tipo==='armadura' ? '🛡' : iniciaisItem(fonte.nome)),
      el('b',{}, nomeLimpoComSelos(fonte.row || {item:fonte.nome}).nome),
      el('small',{}, beneficioVestido(f, fonte))));
  }
  state._medalhaoEntrou = null;
  const soma = el('div',{class:'soma-veste'}, el('span',{class:'rot-mini'},'Vestindo dá'));
  const chips = ativos.map(fn=> beneficioVestido(f, fn)).filter(t=> t && t!=='armadura');
  if(chips.length) chips.forEach(t=> soma.appendChild(el('span',{class:'chip-ok'}, t))); else soma.appendChild(el('span',{class:'meta'},'nada ainda'));
  const corpo = [meds];
  const fonteSel = sel!=null ? ativos[sel] : null;
  if(fonteSel && fonteSel.row){
    const idx = f.equip.indexOf(fonteSel.row);
    corpo.push(el('div',{class:'acoes-medal'},
      el('button',{class:'btn ghost', onclick:()=>{ state._medalhaoSel=null; vestirLinha(f, idx); }}, 'Guardar'),
      podeForjarLinha(fonteSel.row) ? el('button',{class:'btn', onclick:()=>{ state._medalhaoSel=null; forjarLinhaDaMochila(f, idx); }}, '🔨 Forjar') : el('button',{class:'btn', onclick:()=>{ state._medalhaoSel=null; abrirOficina({editarIdx:idx}); }}, '⚗️ Essências')));
  } else if(fonteSel){
    corpo.push(el('div',{class:'meta', style:'text-transform:none;text-align:center;margin-top:6px;'}, 'A armadura conta como item vestido. Troque na seção de armadura.'));
  }
  corpo.push(soma);
  if(excedentes.length) corpo.push(el('div',{class:'tip', style:'font-size:0.75rem;color:var(--gold);'}, '⚠ '+excedentes.map(x=>nomeBaseItem(x.nome)).join(', ')+' passou do limite e não faz efeito até você guardar outro.'));
  return el('div',{class:'panel faixa painel-vestindo'}, el('h2',{}, 'Vestindo · '+Math.min(todos.length,limite)+'/'+limite), ...corpo);
}

// ---- Bolsa (uma linha, só T$) ----
function renderBolsa(f){
  if(!state._bolsa) state._bolsa = {valor:'', moeda:'ts'};
  const b = state._bolsa;
  const recente = state._bolsaMexeu && Date.now()-state._bolsaMexeu.t < 1400 ? state._bolsaMexeu : null;
  const ts = parseInt(f.ts)||0, to = parseInt(f.to)||0, tc = parseInt(f.tc)||0;
  const outras = [to?to+' TO':'', tc?tc+' TC':''].filter(Boolean).join(' e ');
  const ultimos = (f.log||[]).filter(l=> /^(Recebeu|Gastou|Enviou|Recebido)/.test(l.texto) && /T\$|TO|TC/.test(l.texto)).slice(0,3);
  const mover = (sinal)=>{
    const v = parseFloat(String(b.valor).replace(',','.'));
    if(!v || v<=0){ flashMsg('Digite um valor primeiro.'); return; }
    const emTs = b.moeda==='to' ? v*10 : b.moeda==='tc' ? v/10 : v;
    const inteiro = Math.floor(emTs + 1e-9), resto = Math.round((emTs-inteiro)*10);
    const origem = b.moeda==='ts' ? '' : ' ('+String(v).replace('.',',')+' '+(b.moeda==='to'?'TO':'TC')+' convertidos)';
    if(sinal>0){
      f.ts = ts + inteiro; if(resto) f.tc = tc + resto;
      registrarLog(f, 'Recebeu '+inteiro+' T$ (padrão)'+origem);
    } else {
      const totalEmTc = ts*10 + tc, gastoEmTc = inteiro*10 + resto;
      if(gastoEmTc > totalEmTc){ flashMsg('A bolsa não paga: você tem T$ '+ts+(tc?' e '+tc+' TC':'')+'.'); return; }
      const sobra = totalEmTc - gastoEmTc; f.ts = Math.floor(sobra/10); f.tc = sobra%10;
      registrarLog(f, 'Gastou '+inteiro+' T$ (padrão)'+origem);
    }
    state._bolsaMexeu = {t:Date.now(), v:sinal*emTs};
    b.valor = ''; b.moeda = 'ts';
    salvarPerfis();
    Som.tocar('moedas');
    render();
  };
  const saco = el('span',{class:'saco'+(recente?' mexe':'')});
  saco.innerHTML = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M14 9 Q20 4 26 9 L24 13 Q34 18 33 28 Q32 36 20 36 Q8 36 7 28 Q6 18 16 13 Z" fill="var(--card-2)" stroke="var(--gold)" stroke-width="2"/><path d="M15 13 H25" stroke="var(--gold)" stroke-width="2"/></svg>';
  return el('div',{class:'panel faixa painel-bolsa'},
    el('h2',{},'Bolsa'),
    recente ? el('span',{class:'delta-bolsa', style:'color:'+(recente.v>0?'var(--status-saudavel)':'var(--status-critico)')+';'}, (recente.v>0?'+ ':'− ')+'T$ '+fmtEsp(Math.abs(recente.v))) : null,
    el('div',{class:'bolsa-linha'},
      saco,
      el('div',{class:'valor-bolsa num'}, 'T$ '+ts.toLocaleString('pt-BR'), el('small',{}, outras ? 'Tibares de prata · também '+outras : 'Tibares de prata')),
      el('div',{class:'bolsa-botoes'}, el('button',{class:'btn ghost', onclick:()=>mover(-1)}, 'Gastar'), el('button',{class:'btn', onclick:()=>mover(1)}, 'Receber'))
    ),
    el('div',{class:'bolsa-entrada'},
      el('input',{id:'bolsa-valor', type:'number', inputmode:'decimal', min:'0', placeholder:'valor', value:b.valor, 'aria-label':'Valor', oninput:(e)=>{ b.valor = e.target.value; }}),
      el('div',{class:'moedas-seg', role:'radiogroup', 'aria-label':'Moeda'},
        [['to','TO'],['ts','T$'],['tc','TC']].map(([k,r])=> el('button',{class:b.moeda===k?'on':'', role:'radio', 'aria-checked':b.moeda===k?'true':'false', onclick:()=>{ b.moeda=k; render(); }}, r)))
    ),
    ultimos.length ? el('div',{class:'ultimos-bolsa'}, ultimos.map(l=> el('div',{}, el('span',{}, l.texto), el('span',{}, new Date(l.ts).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}))))) : null,
    el('button',{class:'btn ghost', style:'margin-top:8px;', onclick:()=> abrirEnviarDinheiro('ts')}, '📤 Enviar dinheiro')
  );
}

// ---- Cinto de uso rápido ----
function cintoDaFicha(f){
  if(Array.isArray(f.cinto)) return f.cinto;
  // Sem escolha ainda: sugere os consumíveis que a ficha tem (até 4), sem salvar.
  const nomes = [];
  (f.equip||[]).forEach(row=>{ const n = nomeCatalogoDaLinha(row); if(ehConsumivel(row) && !nomes.includes(n) && (usoDoItem(row) || (typeof CATALISADORES_CUSTO_ESCOLA!=='undefined' && (CATALISADORES_CUSTO_ESCOLA[n]||CATALISADORES_CD_ESCOLA[n])))) nomes.push(n); });
  return nomes.slice(0,4);
}
function alternarNoCinto(f, nome){
  const atual = cintoDaFicha(f).slice();
  const i = atual.indexOf(nome);
  if(i>=0) atual.splice(i,1);
  else { if(atual.length>=4){ flashMsg('O cinto tem 4 bolsinhos. Tire um antes.'); return; } atual.push(nome); }
  f.cinto = atual; salvarPerfis(); render();
}
function quantidadeNoInventario(f, nome){
  return (f.equip||[]).filter(r=> nomeCatalogoDaLinha(r)===nome).reduce((t,r)=> t+(parseInt(r.qtd)||0), 0);
}
function consumirUm(f, nome){
  const idx = (f.equip||[]).findIndex(r=> nomeCatalogoDaLinha(r)===nome && (parseInt(r.qtd)||0)>0);
  if(idx<0) return false;
  const row = f.equip[idx], q = parseInt(row.qtd)||0;
  if(q<=1) removerItemMochila(f, idx); else row.qtd = String(q-1);
  return true;
}
// O cinto é a Bandoleira de poções (Livro Básico, cap. 3: "um cinto de couro com bolsos";
// vestida, deixa sacar itens alquímicos e poções como ação livre). Sem ela, não há cinto na ficha.
function temBandoleira(f){
  return itensVestidosAtivos(f).some(fonte=> fonte.row && nomeCatalogoDaLinha(fonte.row)==='Bandoleira de poções');
}
function renderCinto(f){
  if(!temBandoleira(f)) return el('div',{class:'cinto-vazio meta'}, 'Vista uma Bandoleira de poções para usar consumíveis sem abrir a Mochila.');
  const nomes = cintoDaFicha(f);
  if(!nomes.length) return el('div',{class:'cinto-vazio meta'}, 'Cinto vazio: na Mochila, "Pôr no cinto" num consumível.');
  const aberto = state._cintoAberto;
  const cores = {pm:'var(--pm-accent)', pv:'var(--pv-accent)'};
  const bolsos = el('div',{class:'cinto'});
  nomes.forEach((nome, i)=>{
    const row = (f.equip||[]).find(r=> nomeCatalogoDaLinha(r)===nome) || {item:nome, tipo:'geral'};
    const uso = usoDoItem(row);
    const cor = uso ? cores[uso.recurso] : (typeof CATALISADORES_CUSTO_ESCOLA!=='undefined' && (CATALISADORES_CUSTO_ESCOLA[nome]||CATALISADORES_CD_ESCOLA[nome]||CATALISADORES_DANO_LEMBRETE[nome])) ? 'var(--gold)' : 'var(--status-saudavel)';
    const q = quantidadeNoInventario(f, nome);
    const bt = el('button',{class:'bolsinho'+(aberto===nome?' sel':'')+(state._catalisadorPronto===nome?' pronto':'')+(q?'':' acabou'), 'data-cinto':nome, style:'color:'+cor+';', onclick:()=>{ state._cintoAberto = aberto===nome ? null : nome; state._cintoValor = null; render(); }},
      el('span',{class:'q'}, String(q)), el('b',{}, nome.replace(/\s*\(.*\)$/,'')));
    bt.insertAdjacentHTML('afterbegin', '<svg viewBox="0 0 22 28" aria-hidden="true"><path d="M8 2 H14 V8 Q20 11 20 18 Q20 26 11 26 Q2 26 2 18 Q2 11 8 8 Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 17 Q11 14 18 17 Q18 24 11 24 Q4 24 4 17Z" fill="currentColor" opacity=".75"/></svg>');
    bolsos.appendChild(bt);
  });
  const partes = [el('div',{class:'rot-mini', style:'text-align:center;'},'Cinto · sacar é ação livre'), bolsos];
  if(aberto && nomes.includes(aberto)) partes.push(renderGavetaCinto(f, aberto));
  return el('div',{class:'cinto-wrap'}, ...partes);
}
function renderGavetaCinto(f, nome){
  const row = (f.equip||[]).find(r=> nomeCatalogoDaLinha(r)===nome) || {item:nome, tipo:'geral'};
  const uso = usoDoItem(row);
  const q = quantidadeNoInventario(f, nome);
  const fechar = ()=>{ state._cintoAberto = null; state._cintoValor = null; render(); };
  if(!q) return el('div',{class:'gaveta'}, el('div',{class:'pergunta'}, 'Acabou: não tem mais '+nome+' na mochila.'), el('div',{class:'duo'}, el('button',{class:'btn ghost', onclick:fechar},'Fechar'), el('button',{class:'btn', onclick:()=>{ alternarNoCinto(f, nome); state._cintoAberto=null; }},'Tirar do cinto')));
  if(uso){
    const fx = faixaDado(uso.dado) || {min:1, max:20};
    const recursoTxt = uso.recurso==='pv' ? 'PV' : 'PM';
    const v = state._cintoValor;
    return el('div',{class:'gaveta'},
      el('div',{class:'pergunta'}, el('b',{}, nome), ' recupera ', el('b',{}, uso.dado), ' '+recursoTxt+'. Role na mesa: quanto saiu?'),
      el('div',{class:'meta', style:'text-transform:none;margin-bottom:4px;'}, 'De '+fx.min+' a '+fx.max),
      el('div',{class:'teclas'}, Array.from({length:fx.max-fx.min+1}, (_,k)=> fx.min+k).map(t=> el('button',{class:v===t?'on':'', onclick:()=>{ state._cintoValor = t; render(); }}, String(t)))),
      el('div',{class:'duo'}, el('button',{class:'btn ghost', onclick:fechar},'Cancelar'),
        el('button',{class:'btn', disabled: v==null, onclick:()=> usarDoCinto(f, nome, uso, v)}, v==null ? 'Escolha o valor' : 'Usar · +'+v+' '+recursoTxt))
    );
  }
  const ehCatalisador = typeof CATALISADORES_CUSTO_ESCOLA!=='undefined' && (CATALISADORES_CUSTO_ESCOLA[nome]||CATALISADORES_CD_ESCOLA[nome]||CATALISADORES_DANO_LEMBRETE[nome]);
  if(ehCatalisador){
    const efeito = CATALISADORES_CD_ESCOLA[nome] ? '+2 na CD de '+CATALISADORES_CD_ESCOLA[nome] : CATALISADORES_CUSTO_ESCOLA[nome] ? '−1 PM em '+CATALISADORES_CUSTO_ESCOLA[nome] : CATALISADORES_DANO_LEMBRETE[nome];
    const pronto = state._catalisadorPronto===nome;
    return el('div',{class:'gaveta'},
      el('div',{class:'pergunta'}, el('b',{}, nome), ': '+efeito+'. ', pronto ? 'Pronto: a carta da magia que combina já abre com ele marcado.' : 'Deixar pronto para a próxima magia?'),
      el('div',{class:'duo'}, el('button',{class:'btn ghost', onclick:fechar},'Fechar'),
        el('button',{class:'btn', onclick:()=>{ state._catalisadorPronto = pronto ? null : nome; if(!pronto) Som.tocar('brilho'); render(); }}, pronto ? 'Tirar de pronto' : 'Deixar pronto')));
  }
  return el('div',{class:'gaveta'},
    el('div',{class:'pergunta'}, 'Usar ', el('b',{}, nome), '?'),
    el('div',{class:'duo'}, el('button',{class:'btn ghost', onclick:fechar},'Cancelar'), el('button',{class:'btn', onclick:()=>{
      if(!consumirUm(f, nome)) return; registrarLog(f, 'Usou '+nome); salvarPerfis(); Som.tocar('baque'); state._cintoAberto=null; render();
    }},'Usar (−1)')));
}
function usarDoCinto(f, nome, uso, valor){
  if(valor==null) return;
  const bolso = document.querySelector('.bolsinho[data-cinto="'+(window.CSS && CSS.escape ? CSS.escape(nome) : nome)+'"]');
  const aneis = document.querySelectorAll('.aneis-vm .anel-caixa');
  const anel = uso.recurso==='pv' ? aneis[0] : aneis[1];
  if(!consumirUm(f, nome)) return;
  if(uso.recurso==='pv'){
    const max = parseInt(f.pvmax)||0, antes = parseInt(f.pvatual)||0;
    f.pvatual = max ? Math.min(max, antes+valor) : antes+valor;
    registrarLog(f, 'Usou '+nome+': +'+valor+' PV ('+uso.dado+' rolado na mesa) ('+antes+' → '+f.pvatual+')');
  } else {
    const max = parseInt(f.pmmax)||0, antes = parseInt(f.pmatual)||0;
    f.pmatual = max ? Math.min(max, antes+valor) : antes+valor;
    registrarLog(f, 'Usou '+nome+': +'+valor+' PM ('+uso.dado+' rolado na mesa) ('+antes+' → '+f.pmatual+')');
  }
  salvarPerfis();
  Som.tocar('gole');
  if(bolso){ reanimar(bolso, 'bebe'); bolhasAte(bolso, anel, uso.recurso==='pv' ? 'var(--pv-accent)' : 'var(--pm-accent)'); }
  state._cintoAberto = null; state._cintoValor = null;
  setTimeout(()=>{ render(); const novo = document.querySelectorAll('.aneis-vm .anel-caixa')[uso.recurso==='pv'?0:1]; reanimar(novo, 'enche'); }, movimentoReduzido() ? 0 : 600);
}
