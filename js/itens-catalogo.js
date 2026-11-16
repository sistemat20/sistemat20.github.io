// Catálogo de itens (prancha "Catálogo e Magias", 15/11/2026, ideias A + B + C):
// · A Prateleiras: seis ícones numa linha no lugar das seis abas; cada linha já mostra o número
//   que importa; o + guarda num toque; "Oficina" (item personalizado e Item Superior) no fim.
// · B Busca em tudo: a busca procura em todas as prateleiras e separa por prateleira; sem busca e
//   sem prateleira escolhida, aparece "Combina com você" (os itens que mudam algo nesta ficha).
// · C Antes e depois: ao abrir um item, o que muda na ficha (Defesa, penalidade, arma na mão).

const PRATELEIRAS_CATALOGO = [
  ['armas','⚔️','Armas'], ['armaduras','🛡️','Defesas'], ['esotericos','🔮','Esotér.'],
  ['pocoes','🧪','Poções'], ['magicos','✨','Mágicos'], ['gerais','🎒','Gerais'],
];
const NOME_PRATELEIRA = {armas:'Armas', armaduras:'Defesas', esotericos:'Esotéricos', pocoes:'Poções', magicos:'Itens mágicos', gerais:'Itens gerais'};

function semAcento(s){ return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''); }
function maosTxt(n){ return (n||1)+' mão'+((n||1)>1?'s':''); }

// Uma entrada por item: {chave, prat, ic, nome, det, aviso, cat, corpo(f), guardar, equipar:{rot, destino, fn}}
function entradasPrateleira(prat, f){
  if(prat==='armas') return ARMAS.map(w=>{
    const semProf = !proficienteComArma(f, w);
    return {chave:'arma-'+w.n, prat, ic:'⚔️', nome:w.n, cat:w.cat, aviso:semProf,
      det: w.dano+' · '+w.critico+' · '+maosTxt(w.maos)+(semProf?' · sem proficiência':''),
      corpo:()=> corpoArmaCatalogo(f, w, semProf),
      guardar:()=> addArma(w,false), equipar:{rot:'Equipar', destino:'mochila', fn:()=> addArma(w,true)},
      superior:()=> iniciarItemSuperior('arma', w)};
  });
  if(prat==='armaduras'){
    const prof = proficienciasPersonagem(f);
    return [...ARMADURAS, ...ESCUDOS].map(a=>{
      const escudo = a.cat==='Escudo';
      const semProf = escudo ? !prof.escudos : (a.cat==='Pesada' && !prof.armadurasPesadas);
      return {chave:'def-'+a.n, prat, ic: escudo?'🛡️':'🥋', nome:a.n, cat:a.cat, aviso:semProf,
        det: '+'+a.def+' Defesa · pen '+(a.pen||0)+' · '+a.cat+(semProf?' · sem proficiência':''),
        corpo:()=> corpoDefesaCatalogo(f, a, escudo, semProf),
        guardar:()=> escudo ? addEscudo(a,false) : addArmadura(a,false),
        equipar:{rot: escudo?'Equipar escudo':'Vestir', destino:'mochila', fn:()=> escudo ? addEscudo(a,true) : addArmadura(a,true)},
        superior:()=> iniciarItemSuperior(escudo?'escudo':(a.cat==='Pesada'?'armaduraPesada':'armaduraLeve'), a)};
    });
  }
  if(prat==='esotericos') return ITENS_ESOTERICOS.map(it=>({chave:'eso-'+it.n, prat, ic:'🔮', nome:it.n,
    det: maosTxt(it.maos)+' · '+it.esp+' esp',
    corpo:()=>[el('div',{class:'desc'}, it.desc), el('div',{class:'meta-ej'}, 'Esotéricos são empunhados: ocupam mão enquanto você conjura.')],
    guardar:()=> addEsoterico(it,false), equipar:{rot:'Empunhar', destino:'mochila', fn:()=> addEsoterico(it,true)},
    superior:()=> iniciarItemSuperior('esoterico', it)}));
  if(prat==='pocoes') return POCOES_MAGICAS.slice().sort((a,b)=> a.circulo-b.circulo || a.nome.localeCompare(b.nome)).map(p=>({chave:'poc-'+p.nome, prat, ic:'🧪', nome:p.nome,
    det: p.circulo+'º círculo · '+p.magia,
    corpo:()=>[el('div',{class:'desc'}, 'Contém a magia '+p.magia+': o efeito é o mesmo de lançar a magia.')],
    guardar:()=> addItemMagicoGenerico(p.nome, p.esp)}));
  if(prat==='magicos'){
    const lista = [];
    const generico = (a)=> ()=> addItemMagicoGenerico(a.nome, a.nome==='Mochila de carga' ? 0 : 1);
    ENCANTOS_ARMA.forEach(e=> lista.push({chave:'enc-a-'+e.nome, prat, ic:'⚔️', nome:e.nome, cat:'Encantos', det:'Encanto de arma'+(e.dobraContagem?' · conta como 2':''),
      corpo:()=>[el('div',{class:'desc'}, e.efeito), el('div',{class:'meta-ej'}, 'Encanto se coloca numa arma pela Oficina, em Item Superior.')]}));
    ENCANTOS_ARMADURA.forEach(e=> lista.push({chave:'enc-d-'+e.nome, prat, ic:'🛡️', nome:e.nome, cat:'Encantos', det:'Encanto de armadura'+(e.dobraContagem?' · conta como 2':''),
      corpo:()=>[el('div',{class:'desc'}, e.efeito), el('div',{class:'meta-ej'}, 'Encanto se coloca numa armadura pela Oficina, em Item Superior.')]}));
    ARMAS_ESPECIFICAS.forEach(a=> lista.push({chave:'esp-a-'+a.nome, prat, ic:'🗡️', nome:a.nome, cat:'Específicos', det:a.base, corpo:()=>[el('div',{class:'desc'}, a.desc)], guardar:generico(a)}));
    ARMADURAS_ESPECIFICAS.forEach(a=> lista.push({chave:'esp-d-'+a.nome, prat, ic:'🥋', nome:a.nome, cat:'Específicos', det:a.base, corpo:()=>[el('div',{class:'desc'}, a.desc)], guardar:generico(a)}));
    [['Menores', ACESSORIOS_MENORES], ['Médios', ACESSORIOS_MEDIOS], ['Maiores', ACESSORIOS_MAIORES]].forEach(([nivel, xs])=>
      xs.forEach(a=> lista.push({chave:'ace-'+a.nome, prat, ic:'💍', nome:a.nome, cat:'Acessórios', det:'Acessório '+nivel.toLowerCase(), corpo:()=>[el('div',{class:'desc'}, a.desc)], guardar:generico(a)})));
    return lista;
  }
  if(prat==='gerais') return itensVisiveisJogador().slice().sort((a,b)=> a.cat.localeCompare(b.cat) || a.n.localeCompare(b.n)).map(it=>{
    const info = infoServePraMim(f, it);
    const forjavel = it.cat==='Vestuário' || it.cat==='Ferramenta';
    return {chave:'ger-'+it.n, prat, ic:'🎒', nome:it.n+(it.vestivel?' 👕':'')+(it.empunhavel?' 🎻':''), busca:it.n, cat:it.cat, info,
      det: it.cat+' · '+fmtEsp(parseFloat(String(it.esp).replace(',','.'))||0)+' esp',
      corpo:()=>[el('div',{class:'desc'}, it.desc), renderDifCatalogo(f, it, info),
        it.empunhavel ? el('div',{class:'meta-ej'}, maosTxt(it.maos)+': precisa ser empunhado para dar o benefício') : null],
      guardar:()=> it.empunhavel ? addEsoterico(it,false) : addItemGeral(it,false),
      equipar: it.vestivel ? {rot:'Vestir', destino:'vestindo', fn:()=> addItemGeral(it,true)} : it.empunhavel ? {rot:'Empunhar', destino:'mochila', fn:()=> addEsoterico(it,true)} : null,
      superior: forjavel ? ()=> iniciarItemSuperior(it.cat==='Ferramenta'?'ferramenta':'vestuario', it) : null};
  });
  return [];
}

// ---- C: antes e depois na ficha ----
function linhasCompara(linhas){
  return el('div',{class:'compara-cat'}, linhas.map(([rot, antes, depois, sentido])=>
    el('div',{class: sentido>0 ? 'melhor' : sentido<0 ? 'pior' : ''}, el('span',{}, rot), el('b',{}, String(antes)), el('i',{}, '→'), el('b',{}, String(depois)))));
}
function corpoDefesaCatalogo(f, a, escudo, semProf){
  const peca = {nome:a.n, def:a.def, pen:a.pen, cat:a.cat, esp:a.esp, equipado:true};
  const g = Object.assign({}, f, escudo ? {escudo:peca} : {armadura:peca});
  const atual = escudo ? f.escudo : f.armadura;
  const defA = defesaTotal(f), defD = defesaTotal(g);
  const penA = penalidadeTotal(f), penD = penalidadeTotal(g);
  const linhas = [['Defesa', defA, defD, Math.sign(defD-defA)], ['Penalidade em Des/For', penA, penD, Math.sign(penD-penA)]];
  return [
    el('div',{class:'meta-ej'}, atual && atual.equipado!==false ? 'No lugar de: '+atual.nome : (escudo ? 'Você está sem escudo.' : 'Você está sem armadura.')),
    linhasCompara(linhas),
    semProf ? el('div',{class:'aviso-prof-cat'}, '⚠ Sem proficiência: a penalidade ('+a.pen+') passa a valer em toda perícia de Força e Destreza.') : null,
  ];
}
function corpoArmaCatalogo(f, w, semProf){
  const naMao = (f.armas||[])[0];
  const filhos = [];
  if(naMao){
    filhos.push(el('div',{class:'meta-ej'}, 'Comparando com a arma na sua mão: '+naMao.nome));
    filhos.push(linhasCompara([['Dano', naMao.dano, w.dano, 0], ['Crítico', naMao.critico, w.critico, 0], ['Mãos', naMao.maos||1, w.maos||1, Math.sign((naMao.maos||1)-(w.maos||1))]]));
  } else {
    filhos.push(el('div',{class:'numeros-cat'},
      el('div',{}, w.dano, el('small',{}, 'dano')), el('div',{}, w.critico, el('small',{}, 'crítico')),
      el('div',{}, String(w.maos||1), el('small',{}, 'mãos')), el('div',{}, String(w.esp), el('small',{}, 'espaço'))));
  }
  filhos.push(el('div',{class:'meta-ej'}, w.tipo+' · alcance '+w.alcance+' · '+w.cat));
  if(semProf) filhos.push(el('div',{class:'aviso-prof-cat'}, '⚠ Sem proficiência: −5 no teste de ataque com esta arma.'));
  return filhos;
}

// ---- Linha do catálogo: toque abre a gaveta; o + guarda ----
// Ícone da linha do catálogo pelo tipo da prateleira (js/itens-icones.js).
function ladrilhoDaEntrada(e){
  const k = e.chave||'', nome = e.busca||e.nome;
  if(k.startsWith('enc-a-')) return ladrilhoItem('', 'arma', true);
  if(k.startsWith('enc-d-')) return ladrilhoItem('', 'armadura', true);
  const tipo = k.startsWith('arma-') ? 'arma' : k.startsWith('def-') ? 'armadura' : k.startsWith('eso-') ? 'esoterico' : 'geral';
  return ladrilhoItem(nome, tipo, /^(esp-|ace-)/.test(k));
}
function linhaCatalogo(f, e){
  if(!state._acordeaoAberto) state._acordeaoAberto = {};
  const aberto = state._acordeaoAberto.catalogo === e.chave;
  const marca = e.info ? el('span',{class:'marca-serve'}, '✦ '+e.info.marca) : null;
  const linha = el('div',{class:'cat-linha'+(aberto?' sel':'')+(e.aviso?' aviso':'')},
    el('button',{class:'cat-abre', 'aria-expanded': aberto ? 'true' : 'false', onclick:()=>{ state._acordeaoAberto.catalogo = aberto ? null : e.chave; render(); }},
      ladrilhoDaEntrada(e),
      el('span',{class:'nm'}, e.nome+(e.aviso?' ⚠':''), marca, el('small',{}, e.det))),
    e.guardar ? botaoQueVoa('+', 'cat-mais', e.busca||e.nome, 'mochila', e.guardar) : el('span',{class:'cat-mais vazio'}, aberto?'▾':'▸'));
  if(e.guardar){ const b = linha.lastChild; b.setAttribute('aria-label', 'Guardar '+(e.busca||e.nome)+' na mochila'); b.title = 'Guardar na mochila'; }
  if(!aberto) return [linha];
  const botoes = el('div',{class:'cat-botoes'},
    e.equipar ? botaoQueVoa(e.equipar.rot, 'btn', e.busca||e.nome, e.equipar.destino, e.equipar.fn) : null,
    e.guardar ? botaoQueVoa('Guardar', e.equipar ? 'btn ghost' : 'btn', e.busca||e.nome, 'mochila', e.guardar) : null);
  return [linha, kGaveta(...e.corpo(), botoes.children.length ? botoes : null,
    e.superior ? el('button',{class:'link-superior', onclick:e.superior}, '🛠️ Fazer Item Superior com este') : null)];
}

function renderItensCompleto(){
  if(state._itemSuperiorBuilder) return renderCriadorItemSuperior();
  const f = fichaAtual();
  const itf = state.itensFiltro;
  if(!itf.tipo || !NOME_PRATELEIRA[itf.tipo]) itf.tipo = 'inicio';
  const wrap = el('div',{class:'catalogo-novo'});
  wrap.appendChild(renderAlvosCatalogo(f));
  wrap.appendChild(el('input',{id:'busca-itens', type:'search', class:'busca-cat', placeholder:'🔎 O que você achou? Busca em tudo...', value:itf.busca, oninput:(e)=>{ itf.busca=e.target.value; renderDebounced(); }}));
  wrap.appendChild(el('div',{class:'prateleiras-cat'}, PRATELEIRAS_CATALOGO.map(([id, ic, rot])=>
    el('button',{class:'prat-cat'+(itf.tipo===id && !itf.busca?' on':''), 'aria-pressed': itf.tipo===id ? 'true' : 'false',
      onclick:()=>{ itf.busca=''; itf.tipo = itf.tipo===id ? 'inicio' : id; itf.categoria='todas'; state._acordeaoAberto && (state._acordeaoAberto.catalogo=null); render(); }},
      el('span',{class:'ic', 'aria-hidden':'true'}, ic), rot))));

  const res = el('div',{class:'cat-lista'});
  const busca = semAcento(itf.busca.trim());
  if(busca){
    // B: busca em todas as prateleiras, separada por prateleira.
    let total = 0;
    PRATELEIRAS_CATALOGO.forEach(([id])=>{
      const achou = entradasPrateleira(id, f).filter(e=> semAcento(e.busca||e.nome).includes(busca));
      if(!achou.length) return;
      total += achou.length;
      res.appendChild(el('div',{class:'grupo-cat'}, el('span',{}, NOME_PRATELEIRA[id]), el('span',{}, String(achou.length))));
      achou.slice(0, 12).forEach(e=> linhaCatalogo(f, e).forEach(x=> res.appendChild(x)));
      if(achou.length>12) res.appendChild(el('button',{class:'ver-mais-cat', onclick:()=>{ itf.tipo=id; render(); }}, 'Ver as '+achou.length+' em '+NOME_PRATELEIRA[id]+' ▸'));
    });
    if(!total) res.appendChild(el('div',{class:'empty'}, 'Nada com "'+itf.busca.trim()+'". Confira o nome com o Mestre ou crie na Oficina.'));
  } else if(itf.tipo==='inicio'){
    // B: sem busca, o que combina com esta ficha.
    const combina = entradasPrateleira('gerais', f).filter(e=> e.info).slice(0, 8);
    res.appendChild(el('div',{class:'k-rot'}, '✦ Combina com você'));
    if(combina.length) combina.forEach(e=> linhaCatalogo(f, e).forEach(x=> res.appendChild(x)));
    else res.appendChild(el('div',{class:'meta-ej'}, 'Nenhum item geral muda esta ficha agora. Escolha uma prateleira acima.'));
    res.appendChild(el('div',{class:'meta-ej', style:'margin-top:8px;'}, 'O Mestre disse que você achou algo? Digite três letras do nome na busca.'));
  } else {
    let lista = entradasPrateleira(itf.tipo, f);
    const cats = [...new Set(lista.map(e=> e.cat).filter(Boolean))];
    if(cats.length>1){
      res.appendChild(el('div',{class:'chips-cat'}, ['todas', ...cats].map(c=>
        el('button',{class:'chip-cat'+(itf.categoria===c?' on':''), onclick:()=>{ itf.categoria=c; render(); }}, c==='todas'?'Todas':c))));
    }
    if(itf.tipo==='gerais'){
      res.appendChild(el('button',{class:'filtro-serve'+(itf.serve?' on':''), 'aria-pressed':itf.serve?'true':'false', onclick:()=>{ itf.serve=!itf.serve; render(); }}, '✦ Serve pra mim'));
    }
    if(itf.categoria!=='todas') lista = lista.filter(e=> e.cat===itf.categoria);
    if(itf.tipo==='gerais' && itf.serve){
      const n = lista.length;
      lista = lista.filter(e=> e.info);
      res.appendChild(el('div',{class:'meta', style:'text-transform:none;text-align:center;margin-bottom:6px;'}, lista.length+' de '+n+' itens mudam alguma coisa nesta ficha'));
    }
    if(!lista.length) res.appendChild(el('div',{class:'empty'}, 'Nenhum item aqui.'));
    let ultima = null;
    lista.forEach(e=>{
      if(itf.categoria==='todas' && cats.length>1 && e.cat!==ultima){ ultima = e.cat; res.appendChild(el('div',{class:'grupo-cat'}, el('span',{}, e.cat))); }
      linhaCatalogo(f, e).forEach(x=> res.appendChild(x));
    });
  }
  wrap.appendChild(res);

  // A: Oficina no fim, sem repetir em todo item.
  wrap.appendChild(el('div',{class:'k-rot'}, 'Oficina'));
  wrap.appendChild(el('div',{class:'oficina-cat'},
    el('button',{onclick:()=> abrirOficina()}, '⚗️ Item personalizado'),
    el('button',{onclick:()=>{ flashMsg('Abra uma arma, defesa, esotérico, vestuário ou ferramenta e toque em "Fazer Item Superior".'); }}, '🛠️ Item Superior')));
  return wrap;
}
