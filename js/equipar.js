// Equipar, guardar e adicionar itens (armas, armaduras, escudos, esotéricos, itens gerais e magias).
// Separado do js/ficha.js em 15/11/2026 (item 6 da revisão geral), sem mudar o código.

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
      f.equip.push({tipo:'arma', ref:arma.refBase||arma.nome, item:arma.nome, qtd:'1', carga:String(arma.esp||1), superior:arma.superior, bonusTesteExtra:arma.bonusTesteExtra, bonusDanoExtra:arma.bonusDanoExtra, melhoriasTxt:arma.melhoriasTxt, injecao:arma.injecao||null});
      flashMsg('"'+arma.nome+'" foi para a mochila para liberar as mãos.');
    } else if(f.esotericos && f.esotericos.length>0){
      const eso = f.esotericos.shift();
      f.equip.push({tipo:'esoterico', ref:eso.refBase||eso.nome, item:eso.nome, qtd:'1', carga:String(eso.esp||1), superior:eso.superior, efeitoExtra:eso.efeitoExtra, melhoriasTxt:eso.melhoriasTxt, magiaHarmonizada:eso.magiaHarmonizada||null});
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
  f.equip.push({tipo:'esoterico', ref:eso.refBase||eso.nome, item:eso.nome, qtd:'1', carga:String(eso.esp||1), superior:eso.superior, efeitoExtra:eso.efeitoExtra, melhoriasTxt:eso.melhoriasTxt, magiaHarmonizada:eso.magiaHarmonizada||null});
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
    superior:!!row.superior, efeitoExtra:efeitoExtra, melhoriasTxt:row.melhoriasTxt||null,
    magiaHarmonizada: row.magiaHarmonizada||null
  });
  removerItemMochila(f, idx);
  salvarPerfis();
  flashMsg('"'+(row.superior?row.item:it.n)+'" equipado.');
  render();
}

function addItemGeral(it, vestir){
  const f = fichaAtual();
  // Munição: um pacote soma 20 flechas na linha que já existe (conta unidade por unidade).
  const pacote = pacoteMunicao({tipo:'geral', item:it.n});
  const jaTem = pacote ? f.equip.find(r=> r.tipo==='geral' && nomeCatalogoDaLinha(r)===it.n) : null;
  if(jaTem) jaTem.qtd = String((parseInt(jaTem.qtd)||0) + pacote);
  else f.equip.push({tipo:'geral', item:it.n, qtd: pacote ? String(pacote) : '1', carga:String(it.esp), vestido:!!vestir});
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
// Item Personalizado — o jogador escolhe QUALQUER item do jogo (arma, armadura, escudo,
// esotérico, item geral, acessório, artefato, poção) como "base" e o item novo herda todos os
// status mecânicos dela automaticamente, com nome e descrição próprios por cima. Reaproveita
// exatamente o mesmo truque que já existia pra "Espada Baronial" etc (base real + texto
// customizado) — só que agora QUALQUER item do catálogo serve de base, não só os que eu cadastrei
// manualmente numa lista fixa. Resolve sem precisar de uma lista de "todo status que existe".
function catalogoUnificadoParaItemPersonalizado(){
  const lista = [];
  ARMAS.forEach(w=> lista.push({nome:w.n, categoria:'arma', dados:w}));
  ARMADURAS.forEach(a=> lista.push({nome:a.n, categoria:'armadura', dados:a}));
  ESCUDOS.forEach(a=> lista.push({nome:a.n, categoria:'escudo', dados:a}));
  ITENS_ESOTERICOS.forEach(e=> lista.push({nome:e.n, categoria:'esoterico', dados:e}));
  ITENS_GERAIS.forEach(i=> lista.push({nome:i.n, categoria:'geral', dados:i, desc:i.desc}));
  if(typeof ACESSORIOS_MENORES!=='undefined') ACESSORIOS_MENORES.forEach(a=> lista.push({nome:a.nome, categoria:'geral', dados:a, desc:a.desc}));
  if(typeof ACESSORIOS_MEDIOS!=='undefined') ACESSORIOS_MEDIOS.forEach(a=> lista.push({nome:a.nome, categoria:'geral', dados:a, desc:a.desc}));
  if(typeof ACESSORIOS_MAIORES!=='undefined') ACESSORIOS_MAIORES.forEach(a=> lista.push({nome:a.nome, categoria:'geral', dados:a, desc:a.desc}));
  if(typeof ARTEFATOS!=='undefined') ARTEFATOS.forEach(a=> lista.push({nome:a.nome, categoria:'geral', dados:a, desc:a.desc}));
  if(typeof POCOES_MAGICAS!=='undefined') POCOES_MAGICAS.forEach(p=> lista.push({nome:p.nome, categoria:'geral', dados:p, desc:'Contém a magia: '+p.magia}));
  return lista;
}

// Monta a entrada de mochila pro Item Personalizado, a partir da base escolhida + nome/desc do
// jogador. Cada categoria de base vira o tipo certo de item (arma, armadura, escudo, esotérico
// ou genérico), puxando os status mecânicos reais da base.
function montarItemPersonalizado(baseEscolhida, nomeCustom, descCustom){
  const {categoria, dados} = baseEscolhida;
  const nome = nomeCustom.trim() || baseEscolhida.nome || 'Item personalizado';
  const desc = descCustom.trim() || baseEscolhida.desc || null;
  if(categoria==='arma'){
    return {tipo:'arma', ref:dados.n, item:nome, qtd:'1', carga:String(dados.esp||1), superior:true, bonusTesteExtra:0, bonusDanoExtra:0, melhoriasTxt:desc};
  }
  if(categoria==='armadura'){
    return {tipo:'armadura', ref:dados.n, item:nome, qtd:'1', carga:String(dados.esp||1), superior:true, bonusDefExtra:0, bonusPenExtra:0, melhoriasTxt:desc};
  }
  if(categoria==='escudo'){
    return {tipo:'escudo', ref:dados.n, item:nome, qtd:'1', carga:String(dados.esp||1), superior:true, bonusDefExtra:0, bonusPenExtra:0, melhoriasTxt:desc};
  }
  if(categoria==='esoterico'){
    return {tipo:'esoterico', ref:dados.n, item:nome, qtd:'1', carga:String(dados.esp||1), superior:true, efeitoExtra:[], melhoriasTxt:desc};
  }
  // geral (item comum, acessório, artefato, poção) — guarda a descrição DIRETO no item, já que
  // um nome inventado pelo jogador não bate com nada no catálogo pra buscar depois.
  return {tipo:'geral', item:nome, qtd:'1', carga:String((dados&&dados.esp)||1), descCustom:desc};
}

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
      if(row.injecao) armaMontada.injecao = row.injecao; // doses da Injeção alquímica vão junto
    }
    f.armas.push(armaMontada);
    removerItemMochila(f, idx);
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
    removerItemMochila(f, idx);
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
    removerItemMochila(f, idx);
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
  f.equip.push({tipo:'arma', ref:arma.refBase||arma.nome, item:arma.nome, qtd:'1', carga:String(arma.esp||1), superior:arma.superior, bonusTesteExtra:arma.bonusTesteExtra, bonusDanoExtra:arma.bonusDanoExtra, melhoriasTxt:arma.melhoriasTxt, injecao:arma.injecao||null});
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
