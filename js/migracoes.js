// Migrações das fichas antigas (rodam ao carregar).
// Separado do js/app.js em 15/11/2026 (item 6 da revisão geral), sem mudar o código.

// ============ PERSISTÊNCIA ============
function aplicarMigracoesPerfis(){
  // Migração: fichas criadas antes do painel "Habilidades Iniciais" reconstroem a lista a partir da raça
  state.perfis.forEach(f=>{
    if(!f.habilidadesIniciais){
      const racaObj = getRacaObj(f);
      f.habilidadesIniciais = (racaObj ? racaObj.poderes.map(([nome,desc])=>({fonte:'Raça: '+f.raca, nome, desc})) : [])
        .concat((f.classesNiveis||[]).flatMap(c=> (CLASSES[c.classe] && CLASSES[c.classe].habilidadesClasse) ? CLASSES[c.classe].habilidadesClasse.map(([nome,desc])=>({fonte:'Classe: '+c.classe, nome, desc})) : []));
    }
  });
  migrarMelhoriasSubstituidas();
  migrarCargaPocoes();
  migrarMochilaAventureiro();
  migrarEfeitoCustomParaEssencias();
  migrarMochilaQuintoVestido();
  migrarCargaZeradaDoCatalogo();
  migrarMunicaoPorUnidade();
}

// Migração (15/11/2026): munição passa a contar unidade por unidade. "Flechas (20)" com qtd 2
// vira 40 flechas; "Flechas (14)" (nome editado para acompanhar à mão) vira 14 flechas do pacote
// de 20. Linhas repetidas do mesmo tipo juntam numa só. Roda uma vez por ficha.
function migrarMunicaoPorUnidade(){
  state.perfis.forEach(f=>{
    if(f._municaoPorUnidade) return;
    const vistas = {};
    (f.equip||[]).slice().forEach(row=>{
      if(!row || row.tipo!=='geral') return;
      const m = nomeBaseItem(row.item).trim().match(/^(Flechas|Virotes|Balas)\s*\((\d+)\)$/i);
      if(!m) return;
      const canon = ITENS_GERAIS.find(i=> i.cat==='Munição' && i.n.toLowerCase().startsWith(m[1].toLowerCase()+' ('));
      if(!canon) return;
      const unidades = parseInt(m[2]) * (parseInt(row.qtd)||1);
      if(vistas[canon.n]){ vistas[canon.n].qtd = String((parseInt(vistas[canon.n].qtd)||0) + unidades); f.equip.splice(f.equip.indexOf(row), 1); return; }
      row.item = canon.n; row.ref = canon.n; row.qtd = String(unidades); row.carga = String(canon.esp);
      vistas[canon.n] = row;
    });
    f._municaoPorUnidade = true;
  });
}

// Migração (13/11/2026, revisão): uma mochila vestida como 5º item não dá os +2 (só 4 vestidos
// valem) e a tela não deixa vestir um quinto. Ela volta para guardada, sem mudar nenhuma conta.
function migrarMochilaQuintoVestido(){
  state.perfis.forEach(f=>{
    const ativos = itensVestidosAtivos(f).map(x=> x.row).filter(Boolean);
    (f.equip||[]).forEach(r=>{
      if(r.tipo==='geral' && r.vestido && MOCHILAS_VESTIVEIS[nomeCatalogoDaLinha(r)] && !ativos.includes(r)) r.vestido = false;
    });
  });
}

// Migração (13/11/2026, revisão): item do catálogo com espaço 0 digitado (Bandoleira, Sapatos de
// camurça, Chapéu arcano) volta ao espaço do livro. Mochilas e roupas sem benefício seguem 0.
// Roda uma vez por ficha.
function migrarCargaZeradaDoCatalogo(){
  state.perfis.forEach(f=>{
    if(f._cargaCatalogoRevista) return;
    (f.equip||[]).forEach(r=>{
      if(r.tipo!=='geral' || (parseFloat(String(r.carga).replace(',','.'))||0) > 0) return;
      const nome = nomeCatalogoDaLinha(r);
      const cat = ITENS_GERAIS.find(i=> i.n===nome);
      const esp = cat ? parseFloat(cat.esp) : 0;
      if(esp > 0 && !MOCHILAS_VESTIVEIS[nome]) r.carga = String(esp);
    });
    f._cargaCatalogoRevista = true;
  });
}

// Migração (13/11/2026): o antigo "upgrade" da Mochila de aventureiro (uma marca na ficha que
// somava +2 e escondia a mochila) vira a mochila vestida, que ocupa 1 dos itens vestidos.
function migrarMochilaAventureiro(){
  state.perfis.forEach(f=>{
    if(!f.mochilaAventureiroUpgrade) return;
    const row = (f.equip||[]).find(r=> r.tipo==='geral' && nomeBaseItem(r.item)==='Mochila de aventureiro');
    // só fica vestida se houver lugar entre os 4 vestidos (senão vai para a mochila, guardada)
    const temLugar = itensVestidosAtivos(f).length < 4;
    if(row) row.vestido = temLugar;
    else { if(!f.equip) f.equip = []; f.equip.push({tipo:'geral', item:'Mochila de aventureiro', qtd:'1', carga:'0', vestido:temLugar}); }
    f.mochilaAventureiroUpgrade = false;
  });
}

// Migração (13/11/2026): o efeito único do item personalizado vira a primeira essência da lista.
function migrarEfeitoCustomParaEssencias(){
  state.perfis.forEach(f=> (f.equip||[]).forEach(row=>{
    const ec = row && row.efeitoCustom; if(!ec) return;
    if(!row.essencias) row.essencias = [];
    if(ec.tipo==='bonusPericia') row.essencias.push({tipo:'pericia', pericia:ec.pericia, valor:parseInt(ec.valor)||0});
    else if(ec.tipo==='bonusPM') row.essencias.push({tipo:'pm', valor:parseInt(ec.valor)||0});
    else if(ec.tipo==='bonusPV') row.essencias.push({tipo:'pv', valor:parseInt(ec.valor)||0});
    row.efeitoCustom = null;
  }));
}

// Migração: poções mágicas guardadas antes de 12/11/2026 entravam na mochila com 1 espaço; o livro
// diz meio espaço. Só corrige quem ainda está com o 1 de antes (uma carga digitada à mão fica).
function migrarCargaPocoes(){
  if(typeof POCOES_MAGICAS==='undefined') return;
  const nomes = new Set(POCOES_MAGICAS.map(p=>p.nome));
  state.perfis.forEach(f=> (f.equip||[]).forEach(row=>{
    if(row && row.tipo==='geral' && String(row.carga)==='1' && nomes.has(nomeBaseItem(row.item))) row.carga = '0.5';
  }));
}

// Migração: itens superiores forjados antes de a regra de substituição existir ficaram com os
// dois bônus somados (Certeira +1 e Pungente +2 virando +3, por exemplo). O livro diz que a
// melhoria avançada substitui a básica, então aqui o excedente é descontado uma única vez por
// item — a marca _melhoriasMigradas impede de descontar de novo numa próxima abertura.
const PARES_MELHORIA_SUBSTITUIDA = [
  {basica:'Certeira',   avancada:'Pungente',        campo:'bonusTesteExtra', ajuste:-1},
  {basica:'Cruel',      avancada:'Atroz',           campo:'bonusDanoExtra',  ajuste:-1},
  {basica:'Ajustada',   avancada:'Sob medida',      campo:'bonusPenExtra',   ajuste:+1},
  {basica:'Canalizador',avancada:'Potencializador', campo:null,              ajuste:0},
];
function migrarMelhoriasSubstituidas(){
  const corrigirItem = (item)=>{
    if(!item || !item.superior || !item.melhoriasTxt || item._melhoriasMigradas) return;
    const txt = String(item.melhoriasTxt);
    let mexeu = false;
    PARES_MELHORIA_SUBSTITUIDA.forEach(par=>{
      if(!txt.includes(par.basica+':') || !txt.includes(par.avancada+':')) return;
      if(par.campo){
        item[par.campo] = (parseInt(item[par.campo])||0) + par.ajuste;
      } else {
        // Esotérico: tira uma das entradas de limite de PM (a do Canalizador, valor 1)
        const tira = (lista)=>{
          if(!Array.isArray(lista)) return lista;
          const i = lista.findIndex(ef=>ef && ef.tipo==='limite_pm_arcana' && ef.valor===1);
          if(i>=0) lista.splice(i,1);
          return lista;
        };
        tira(item.efeitoExtra); tira(item.efeito);
      }
      mexeu = true;
    });
    if(mexeu) item._melhoriasMigradas = true;
  };
  state.perfis.forEach(f=>{
    (f.equip||[]).forEach(corrigirItem);
    (f.esotericos||[]).forEach(corrigirItem);
    (f.armas||[]).forEach(corrigirItem);
    corrigirItem(f.armadura);
    corrigirItem(f.escudo);
  });
}
