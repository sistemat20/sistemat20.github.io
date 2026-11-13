// =========================================================================================
// Oficina de essências (13/11/2026): o item personalizado deixa de ser "uma base + um texto".
// O jogador escolhe a FORMA e extrai a essência de quantos itens quiser do catálogo, ou escreve
// uma essência que não existe nas tabelas. Cada essência liga numa soma que o app já faz
// (perícias, PM, PV, carga, custo e CD de magia por escola, cinto); o resto fica como texto.
// As essências só valem com o item VESTIDO (mesma regra dos itens do catálogo).
// Dado salvo: row.essencias = [{tipo, ...}], row.forma. Sem preço (o valor é do Mestre).
// =========================================================================================

const ESCOLAS_MAGIA = ['Abjuração','Adivinhação','Convocação','Encantamento','Evocação','Ilusão','Necromancia','Transmutação'];
const FORMAS_OFICINA = {
  vestido:{n:'Vestido', nota:'ocupa 1 medalhão; as essências valem vestido', svg:'<path d="M10 6 L17 3 L24 6 L29 31 L5 31 Z" fill="none" stroke="currentColor" stroke-width="2"/>'},
  consumivel:{n:'Consumível', nota:'vai para o cinto, com cargas', svg:'<path d="M13 3 H21 V9 Q28 12 28 20 Q28 31 17 31 Q6 31 6 20 Q6 12 13 9 Z" fill="none" stroke="currentColor" stroke-width="2"/>'},
  arma:{n:'Arma', nota:'usa o ataque de uma arma do catálogo', base:'arma', svg:'<path d="M17 2 L20 22 L14 22 Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 22 H24 M17 22 V32" stroke="currentColor" stroke-width="2"/>'},
  armadura:{n:'Armadura ou escudo', nota:'usa a Defesa de uma do catálogo', base:'armadura', svg:'<path d="M17 3 L29 8 Q29 24 17 32 Q5 24 5 8 Z" fill="none" stroke="currentColor" stroke-width="2"/>'},
  empunhado:{n:'Empunhado', nota:'esotérico: ocupa uma mão', base:'esoterico', svg:'<circle cx="17" cy="13" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M17 21 V32" stroke="currentColor" stroke-width="2"/>'},
  narrativo:{n:'Só narrativo', nota:'sem número, só história', svg:'<path d="M7 5 H27 V29 H7 Z M11 11 H23 M11 16 H23 M11 21 H19" fill="none" stroke="currentColor" stroke-width="2"/>'},
};
const COR_ESSENCIA = {pericia:'var(--gold)', pm:'var(--pm-accent)', pv:'var(--pv-accent)', magia_custo:'#b48cff', magia_cd:'#b48cff', carga:'var(--status-saudavel)', uso:'var(--pm-accent)', texto:'var(--ink-soft)', arma:'var(--red-bright)'};
const LIGA_ESSENCIA = {pericia:'Perícias', pm:'Anel de mana', pv:'Anel de vida', magia_custo:'Grimório', magia_cd:'Grimório', carga:'Carga', uso:'Cinto', texto:'Só texto (o Mestre aplica)', arma:'Ataque'};

function abrirOficina(opcoes){
  const o = opcoes || {};
  const f = fichaAtual();
  const row = o.editarIdx!=null ? f.equip[o.editarIdx] : null;
  state._itemPersonalizadoPopup = {
    forma: row ? (row.forma || (row.tipo==='geral' ? 'vestido' : row.tipo==='arma' ? 'arma' : row.tipo==='esoterico' ? 'empunhado' : 'armadura')) : 'vestido',
    essencias: row ? (row.essencias||[]).map(e=>Object.assign({}, e)) : [],
    nome: row ? row.item : '', desc: row ? (row.descCustom||'') : '', busca:'', base:null, buscaBase:'', cargas:'3',
    editarIdx: o.editarIdx!=null ? o.editarIdx : null, livre:null, novo:-1,
  };
  render();
}
function abrirItemPersonalizado(){ abrirOficina(); }

// Essências que um item do catálogo carrega.
function essenciasDoCatalogo(item){
  const nome = item.n || item.nome;
  const ess = [];
  if(item.bonusPericia) (Array.isArray(item.bonusPericia) ? item.bonusPericia : [item.bonusPericia]).forEach(b=> ess.push({tipo:'pericia', pericia:b.nome, valor:b.valor}));
  if(item.bonusRecurso) ess.push({tipo:item.bonusRecurso.recurso==='pv'?'pv':'pm', valor:item.bonusRecurso.valor});
  if(MOCHILAS_VESTIVEIS[nome]) ess.push({tipo:'carga', valor:MOCHILAS_VESTIVEIS[nome]});
  if(typeof CATALISADORES_CD_ESCOLA!=='undefined' && CATALISADORES_CD_ESCOLA[nome]) ess.push({tipo:'magia_cd', escola:CATALISADORES_CD_ESCOLA[nome], valor:2});
  if(typeof CATALISADORES_CUSTO_ESCOLA!=='undefined' && CATALISADORES_CUSTO_ESCOLA[nome]) ess.push({tipo:'magia_custo', escola:CATALISADORES_CUSTO_ESCOLA[nome], valor:-1});
  if(ITENS_USO[nome]) ess.push({tipo:'uso', recurso:ITENS_USO[nome].recurso, dado:ITENS_USO[nome].dado});
  if(!ess.length){
    const texto = item.magia ? 'Contém a magia: '+item.magia : (item.desc || '').split(/[;.]/)[0];
    if(texto) ess.push({tipo:'texto', texto});
  }
  return ess.map(e=> Object.assign(e, {de:nome}));
}
function fontesDaOficina(){
  const lista = [];
  ITENS_GERAIS.forEach(i=> lista.push(i));
  if(typeof ACESSORIOS_MENORES!=='undefined') ACESSORIOS_MENORES.forEach(a=> lista.push(a));
  if(typeof ACESSORIOS_MEDIOS!=='undefined') ACESSORIOS_MEDIOS.forEach(a=> lista.push(a));
  if(typeof ACESSORIOS_MAIORES!=='undefined') ACESSORIOS_MAIORES.forEach(a=> lista.push(a));
  if(typeof POCOES_MAGICAS!=='undefined') POCOES_MAGICAS.forEach(p=> lista.push(p));
  return lista;
}
function basesDaForma(forma){
  if(forma==='arma') return ARMAS.map(w=>({nome:w.n, categoria:'arma', dados:w}));
  if(forma==='armadura') return [...ARMADURAS.map(a=>({nome:a.n, categoria:'armadura', dados:a})), ...ESCUDOS.map(a=>({nome:a.n, categoria:'escudo', dados:a}))];
  if(forma==='empunhado') return ITENS_ESOTERICOS.map(e=>({nome:e.n, categoria:'esoterico', dados:e}));
  return [];
}

function renderPopupItemPersonalizado(f){
  const o = state._itemPersonalizadoPopup;
  const forma = FORMAS_OFICINA[o.forma] || FORMAS_OFICINA.vestido;
  const editando = o.editarIdx!=null;
  const fechar = ()=>{ state._itemPersonalizadoPopup = null; render(); };
  const overlay = el('div',{class:'menu-overlay', onclick:(e)=>{ if(e.target===e.currentTarget) fechar(); }});
  const sheet = el('div',{class:'menu-sheet oficina'});
  sheet.appendChild(el('div',{class:'wizard-title', style:'padding:6px 14px 0;'}, editando ? '⚗️ Essências do item' : '⚗️ Oficina de essências'));

  // cálice com as essências orbitando
  const orbita = el('div',{class:'orbita'});
  o.essencias.forEach((e,i)=>{
    const ang = (360/Math.max(1,o.essencias.length))*i;
    orbita.appendChild(el('span',{class:'orbe'+(i===o.novo?' novo':''), style:'background:'+COR_ESSENCIA[e.tipo]+';color:'+COR_ESSENCIA[e.tipo]+';transform:rotate('+ang+'deg) translate(34px) rotate('+(-ang)+'deg);'}));
  });
  o.novo = -1;
  const centro = el('div',{class:'forma-centro'}); centro.innerHTML = '<svg viewBox="0 0 34 34">'+forma.svg+'</svg>';
  const calice = el('div',{class:'calice'+(o.fundindo?' funde':''), id:'oficina-calice'}, el('div',{class:'calice-fundo'}), orbita, centro);
  sheet.appendChild(el('div',{class:'calice-wrap'}, calice));

  const corpo = el('div',{class:'oficina-corpo'});
  if(!editando){
    corpo.appendChild(el('div',{class:'rot-mini'}, 'Forma'));
    corpo.appendChild(el('div',{class:'formas'}, Object.entries(FORMAS_OFICINA).map(([k,fm])=> el('button',{class:k===o.forma?'on':'', onclick:()=>{ o.forma=k; o.base=null; render(); }}, fm.n))));
    corpo.appendChild(el('div',{class:'meta', style:'text-transform:none;margin-top:4px;'}, forma.nota));
    if(forma.base){
      corpo.appendChild(el('div',{class:'rot-mini', style:'margin-top:8px;'}, 'Partir de um item do catálogo'));
      if(o.base){
        corpo.appendChild(el('div',{class:'linha-oficina escolhida'}, el('span',{}, el('b',{}, o.base.nome), ' · base'), el('button',{class:'tira', onclick:()=>{ o.base=null; render(); }}, '×')));
      } else {
        corpo.appendChild(el('input',{id:'oficina-busca-base', type:'text', placeholder:'buscar a base...', value:o.buscaBase, oninput:(e)=>{ o.buscaBase=e.target.value; renderDebounced(); }}));
        const termo = o.buscaBase.toLowerCase().trim();
        const lista = el('div',{class:'lista-oficina'});
        if(termo.length>=2) basesDaForma(o.forma).filter(b=> b.nome.toLowerCase().includes(termo)).slice(0,8).forEach(b=> lista.appendChild(el('button',{class:'linha-oficina', onclick:()=>{ o.base=b; render(); }}, el('b',{}, b.nome))));
        corpo.appendChild(lista);
      }
    }
    if(o.forma==='consumivel'){
      corpo.appendChild(el('label',{style:'margin-top:8px;'}, 'Cargas (quantas vezes dá para usar)'));
      corpo.appendChild(el('input',{id:'oficina-cargas', type:'number', min:'1', value:o.cargas, oninput:(e)=>{ o.cargas=e.target.value; }}));
    }
  }

  if(o.forma!=='narrativo'){
    corpo.appendChild(el('div',{class:'rot-mini', style:'margin-top:10px;'}, 'Essências no item'+(o.essencias.length?' ('+o.essencias.length+')':'')));
    const lista = el('div',{class:'essencias'});
    if(!o.essencias.length) lista.appendChild(el('div',{class:'meta', style:'text-transform:none;font-style:italic;'}, 'Nenhuma ainda. Extraia de um item abaixo ou escreva uma.'));
    o.essencias.forEach((e,i)=>{
      const temNumero = ['pericia','pm','pv','carga','magia_custo','magia_cd'].includes(e.tipo);
      lista.appendChild(el('div',{class:'ess'},
        el('i',{style:'background:'+COR_ESSENCIA[e.tipo]+';color:'+COR_ESSENCIA[e.tipo]+';'}),
        el('span',{}, descricaoEssencia(e), e.de ? el('small',{}, ' · de '+e.de) : null),
        temNumero ? el('span',{class:'num-ess'},
          el('button',{'aria-label':'menos', onclick:()=>{ e.valor=(parseInt(e.valor)||0)-1; if(e.valor===0) e.valor=-1; render(); }}, '−'),
          el('button',{'aria-label':'mais', onclick:()=>{ e.valor=(parseInt(e.valor)||0)+1; if(e.valor===0) e.valor=1; render(); }}, '+')) : el('span',{}),
        el('button',{class:'tira', 'aria-label':'Tirar essência', onclick:()=>{ o.essencias.splice(i,1); render(); }}, '×')));
    });
    corpo.appendChild(lista);

    corpo.appendChild(el('div',{class:'rot-mini', style:'margin-top:10px;'}, 'Extrair de um item'));
    corpo.appendChild(el('input',{id:'oficina-busca', type:'text', placeholder:'buscar no catálogo...', value:o.busca, oninput:(e)=>{ o.busca=e.target.value; renderDebounced(); }}));
    const termo = o.busca.toLowerCase().trim();
    const fontes = el('div',{class:'lista-oficina'});
    if(termo.length>=2){
      fontesDaOficina().filter(it=> (it.n||it.nome).toLowerCase().includes(termo)).slice(0,6).forEach(it=>{
        const ess = essenciasDoCatalogo(it);
        fontes.appendChild(el('button',{class:'linha-oficina fonte', onclick:(ev)=> extrairEssencia(ess, ev.currentTarget)},
          el('span',{}, el('b',{}, it.n||it.nome), el('small',{}, ess.map(descricaoEssencia).join(', '))), el('span',{class:'extrai'}, 'extrair')));
      });
    } else fontes.appendChild(el('div',{class:'meta', style:'text-transform:none;'}, 'Digite pelo menos 2 letras.'));
    corpo.appendChild(fontes);
    corpo.appendChild(o.livre ? renderEssenciaLivre(o) : el('button',{class:'link-oficina', onclick:()=>{ o.livre = {tipo:'pericia', pericia:PERICIAS[0].nome, escola:ESCOLAS_MAGIA[0], valor:'1', texto:'', recurso:'pm', dado:'1d4'}; render(); }}, '✎ Escrever uma essência nova'));

    const tipos = [...new Set(o.essencias.map(e=>e.tipo))];
    const liga = el('div',{class:'liga'}, el('span',{class:'rot-mini', style:'width:100%;'}, 'Liga com'));
    if(o.forma==='vestido') liga.appendChild(el('span',{class:'chip-ok'}, 'Medalhões (1 de 4)'));
    if(o.forma==='consumivel') liga.appendChild(el('span',{class:'chip-ok'}, 'Cinto'));
    [...new Set(tipos.map(t=>LIGA_ESSENCIA[t]))].forEach(t=> liga.appendChild(el('span',{class:t.startsWith('Só texto')?'chip-texto':'chip-ok'}, t)));
    if(liga.children.length===1) liga.appendChild(el('span',{class:'meta'}, 'nada ainda'));
    if(o.forma!=='vestido' && o.forma!=='consumivel' && o.essencias.some(e=>e.tipo!=='texto')) liga.appendChild(el('div',{class:'meta', style:'text-transform:none;width:100%;'}, 'Fora de um item vestido, as essências ficam anotadas no item (o Mestre aplica).'));
    corpo.appendChild(liga);
  }

  corpo.appendChild(el('label',{style:'margin-top:10px;'}, 'Nome do item'));
  corpo.appendChild(el('input',{id:'oficina-nome', type:'text', placeholder:'ex: Manto do Âmbar Arcano', value:o.nome, oninput:(e)=>{ o.nome=e.target.value; }}));
  corpo.appendChild(el('label',{style:'margin-top:8px;'}, 'Descrição (opcional)'));
  corpo.appendChild(el('textarea',{id:'oficina-desc', rows:2, placeholder:'o que a mesa combinou sobre ele', oninput:(e)=>{ o.desc=e.target.value; }}, o.desc));
  sheet.appendChild(corpo);
  sheet.appendChild(el('div',{class:'duo', style:'margin:12px 14px 0;'},
    el('button',{class:'btn ghost', onclick:fechar}, 'Cancelar'),
    el('button',{class:'btn', disabled:!!o.fundindo, onclick:()=> criarItemDaOficina(f)}, editando ? 'Salvar essências' : 'Criar o item')));
  overlay.appendChild(sheet);
  return overlay;
}
function renderEssenciaLivre(o){
  const l = o.livre;
  const caixa = el('div',{class:'gaveta'});
  caixa.appendChild(el('label',{}, 'Tipo de essência'));
  const tipos = [['pericia','Bônus numa perícia'],['pm','PM máximo'],['pv','PV máximo'],['carga','Limite de carga'],['magia_custo','Custo de magias de uma escola'],['magia_cd','CD de magias de uma escola'],['uso','Recupera ao usar (consumível)'],['texto','Só texto']];
  const sel = el('select',{id:'oficina-livre-tipo', onchange:(e)=>{ l.tipo=e.target.value; render(); }});
  tipos.forEach(([v,r])=> sel.appendChild(el('option',{value:v, selected:l.tipo===v}, r)));
  caixa.appendChild(sel);
  if(l.tipo==='pericia'){ const s2 = el('select',{id:'oficina-livre-pericia', onchange:(e)=>{ l.pericia=e.target.value; }}); PERICIAS.forEach(p=> s2.appendChild(el('option',{value:p.nome, selected:l.pericia===p.nome}, p.nome))); caixa.appendChild(s2); }
  if(l.tipo==='magia_custo' || l.tipo==='magia_cd'){ const s3 = el('select',{id:'oficina-livre-escola', onchange:(e)=>{ l.escola=e.target.value; }}); ESCOLAS_MAGIA.forEach(x=> s3.appendChild(el('option',{value:x, selected:l.escola===x}, x))); caixa.appendChild(s3); }
  if(l.tipo==='uso'){
    const s4 = el('select',{id:'oficina-livre-recurso', onchange:(e)=>{ l.recurso=e.target.value; }}); [['pm','Mana'],['pv','Vida']].forEach(([v,r])=> s4.appendChild(el('option',{value:v, selected:l.recurso===v}, r))); caixa.appendChild(s4);
    caixa.appendChild(el('input',{id:'oficina-livre-dado', type:'text', placeholder:'dado, ex: 2d6+1', value:l.dado, oninput:(e)=>{ l.dado=e.target.value; }}));
  }
  if(l.tipo==='texto') caixa.appendChild(el('input',{id:'oficina-livre-texto', type:'text', placeholder:'ex: +2 em Furtividade à noite', value:l.texto, oninput:(e)=>{ l.texto=e.target.value; }}));
  else if(l.tipo!=='uso') caixa.appendChild(el('input',{id:'oficina-livre-valor', type:'number', value:l.valor, 'aria-label':'Valor', oninput:(e)=>{ l.valor=e.target.value; }}));
  caixa.appendChild(el('div',{class:'duo', style:'margin-top:8px;'},
    el('button',{class:'btn ghost', onclick:()=>{ o.livre=null; render(); }}, 'Cancelar'),
    el('button',{class:'btn', onclick:()=>{
      let e = null;
      if(l.tipo==='texto'){ if(!l.texto.trim()){ flashMsg('Escreva o efeito primeiro.'); return; } e = {tipo:'texto', texto:l.texto.trim()}; }
      else if(l.tipo==='uso'){ if(!faixaDado(l.dado)){ flashMsg('Escreva o dado como 1d4, 2d8+2...'); return; } e = {tipo:'uso', recurso:l.recurso, dado:l.dado.replace(/\s/g,'')}; }
      else { const v = parseInt(l.valor); if(!v){ flashMsg('Coloque um valor diferente de zero.'); return; } e = {tipo:l.tipo, valor:v}; if(l.tipo==='pericia') e.pericia = l.pericia; if(l.tipo.startsWith('magia_')) e.escola = l.escola; }
      e.de = 'escrita na mesa';
      o.essencias.push(e); o.novo = o.essencias.length-1; o.livre = null;
      Som.tocar('brilho'); render();
    }}, 'Pôr no item')));
  return caixa;
}
function extrairEssencia(ess, origem){
  const o = state._itemPersonalizadoPopup; if(!o) return;
  const calice = document.getElementById('oficina-calice');
  Som.tocar('brilho');
  voarAte(origem, calice, ess.map(descricaoEssencia).join(', '), ()=>{
    if(!state._itemPersonalizadoPopup) return;
    ess.forEach(e=> o.essencias.push(Object.assign({}, e)));
    o.novo = o.essencias.length-1;
    render();
    reanimar(document.getElementById('oficina-calice'), 'pulsa');
  });
}
function criarItemDaOficina(f){
  const o = state._itemPersonalizadoPopup;
  const forma = o.forma;
  if(FORMAS_OFICINA[forma].base && !o.base && o.editarIdx==null){ flashMsg('Escolha o item do catálogo que serve de base.'); return; }
  const nome = (o.nome||'').trim() || (o.base ? o.base.nome : 'Item personalizado');
  const essencias = o.essencias.map(e=> Object.assign({}, e));
  const salvar = ()=>{
    let row;
    if(o.editarIdx!=null){
      row = f.equip[o.editarIdx];
      if(row){ row.item = nome; row.essencias = essencias; row.descCustom = (o.desc||'').trim() || row.descCustom || null; row.efeitoCustom = null; }
      registrarLog(f, 'Mudou as essências de '+nome+(essencias.length ? ': '+essencias.map(descricaoEssencia).join(', ') : ''));
    } else {
      const desc = (o.desc||'').trim() || null;
      if(forma==='vestido') row = {tipo:'geral', item:nome, qtd:'1', carga:'1', marcadoVestivel:true, vestido:false, essencias, descCustom:desc, forma};
      else if(forma==='consumivel') row = {tipo:'geral', item:nome, qtd:String(Math.max(1, parseInt(o.cargas)||1)), carga:'0.5', essencias, descCustom:desc, forma};
      else if(forma==='narrativo') row = {tipo:'geral', item:nome, qtd:'1', carga:'1', descCustom:desc, forma};
      else { row = montarItemPersonalizado(o.base, nome, desc||''); row.essencias = essencias; row.forma = forma; if(row.tipo==='geral' && desc) row.descCustom = desc; }
      f.equip.push(row);
      if(forma==='consumivel' && Array.isArray(f.cinto) && f.cinto.length<4 && !f.cinto.includes(nome)) f.cinto.push(nome);
      registrarLog(f, 'Criou item personalizado: '+nome+(essencias.length ? ' (essências: '+essencias.map(descricaoEssencia).join(', ')+')' : ''));
    }
    salvarPerfis();
    state._itemPersonalizadoPopup = null;
    flashMsg('⚗️ "'+nome+'" '+(o.editarIdx!=null ? 'atualizado' : 'criado e guardado na mochila')+'!');
    render();
  };
  // A essência se funde: o brilho sai do cálice e voa para a mochila enquanto o item é salvo.
  const calice = document.getElementById('oficina-calice');
  Som.tocar('sino');
  if(o.editarIdx==null && calice){ reanimar(calice, 'funde'); voarParaMochila(calice, nome); setTimeout(()=> Som.tocar('baque'), 850); }
  salvar();
}
