// ============ CONFIRA ANTES DE SALVAR (15/11/2026, prancha "Navegação e Magias", 3B) ============
// Na última tela da criação e do Level Up: de onde vem cada número e um aviso quando algo não
// bate com o livro. Na Mochila, o mesmo aviso aparece no item cujo espaço digitado difere do livro.

// ---- Criação: origem de cada atributo ----
function origemAtributosWizard(w){
  const raca = RACAS.find(r=> r.nome===w.racaNome);
  const nomesAttr = {for:'FOR', des:'DES', con:'CON', int:'INT', sab:'SAB', car:'CAR'};
  return Object.keys(nomesAttr).map(k=>{
    const idx = w.assign ? w.assign[k] : null;
    const rolado = (idx!=null && w.rolados && w.rolados[idx]!=null) ? w.rolados[idx] : 0;
    const partes = [['rolado', rolado]];
    if(raca && raca.mods && raca.mods[k]) partes.push([raca.nome, raca.mods[k]]);
    if(raca && (w.racaEscolhasAttr||[]).includes(k)) partes.push([raca.nome+' (escolha)', raca.escolhaLivre ? raca.escolhaLivre.val : 1]);
    return {k, rotulo: nomesAttr[k], total: partes.reduce((t,p)=> t+p[1], 0), partes};
  });
}
const comSinal = (v)=> (v>=0?'+':'')+v;
function renderConfiraCriacao(w){
  const origens = origemAtributosWizard(w);
  const ci = CLASSES_INICIAL[w.classeNome] || {};
  const con = (origens.find(o=> o.k==='con')||{}).total || 0;
  return el('div',{class:'panel faixa confira'},
    el('h2',{}, 'Confira antes de salvar'),
    el('div',{class:'confira-attrs'}, origens.map(o=> el('div',{class:'confira-attr'},
      el('b',{}, o.rotulo),
      el('span',{}, o.partes.map(([n,v], i)=> (i ? (v<0 ? ' − ' : ' + ') : '')+(i ? Math.abs(v) : v)+' '+(n==='rolado' ? 'rolado' : n)).join('')),
      el('span',{class:'v'}, comSinal(o.total))))),
    ci.pv1!=null ? el('div',{class:'confira-ok'}, '✓ Vida inicial '+(ci.pv1+con)+' = '+ci.pv1+' do '+w.classeNome+' + Constituição '+comSinal(con)+'. Mana inicial '+(ci.pm||0)+'.') : null,
    origens.some(o=> o.partes.length>1 && o.partes.some(p=> p[0]!=='rolado' && p[1]<0)) ? el('div',{class:'confira-ok'}, '✓ O redutor da raça já está somado no valor final: não precisa tirar de novo depois.') : null);
}

// ---- Level Up: o que entra ao confirmar ----
function renderConfiraLevelUp(f, lv){
  if(!lv.classeEscolhida) return null;
  const ci = CLASSES_INICIAL[lv.classeEscolhida] || {};
  const racaObj = getRacaObj(f);
  const bonusRaca = racaObj && racaObj.pvBonusPorNivel ? racaObj.pvBonusPorNivel : 0;
  const con = parseInt(f.con)||0;
  const ganhoPV = Math.max(1, (ci.pvPorNivel||0) + con) + bonusRaca;
  const entrada = (f.classesNiveis||[]).find(c=> c.classe===lv.classeEscolhida);
  const novo = (entrada ? entrada.nivel : 0) + 1;
  const hab = (CLASSES[lv.classeEscolhida].tabela.find(t=> t.nivel===novo)||{}).hab;
  const poder = lv.poderModo==='classe' ? lv.poderClasseEscolhido : lv.poderModo==='geral' ? lv.poderGeralEscolhido : null;
  return el('div',{class:'confira'},
    el('div',{class:'confira-titulo'}, 'Confira antes de salvar'),
    el('div',{class:'confira-ok'}, '✓ '+lv.classeEscolhida+' '+novo+'º: +'+ganhoPV+' PV ('+(ci.pvPorNivel||0)+' da classe + Con '+comSinal(con)+(bonusRaca?' + '+bonusRaca+' da raça':'')+') e +'+(ci.pm||0)+' PM.'),
    hab ? el('div',{class:'confira-ok'}, '✓ Ganha: '+hab+'.') : null,
    poder ? el('div',{class:'confira-ok'}, '✓ Poder escolhido: '+poder+(lv.poderSubEscolha ? ' ('+lv.poderSubEscolha+')' : '')+'.')
          : (hab && /poder de/i.test(hab) ? el('div',{class:'confira-aviso'}, '⚠ Falta escolher o poder deste nível.') : null));
}

// ---- Mochila: espaço digitado diferente do livro ----
function espacoDoLivro(row){
  if(!row) return null;
  let esp = null;
  if(row.tipo==='geral'){ const c = catalogoDaLinha(row); esp = c && c.esp!=null ? parseFloat(String(c.esp).replace(',','.')) : null; }
  else if(row.tipo==='arma'){ const a = ARMAS.find(x=> x.n===row.ref); esp = a ? a.esp : null; }
  else if(row.tipo==='armadura'){ const a = ARMADURAS.find(x=> x.n===row.ref); esp = a ? a.esp : null; }
  else if(row.tipo==='escudo' && typeof ESCUDOS!=='undefined'){ const a = ESCUDOS.find(x=> x.n===row.ref); esp = a ? a.esp : null; }
  return (esp==null || isNaN(esp)) ? null : esp;
}
function espacoDivergente(f, row){
  const livro = espacoDoLivro(row);
  if(livro==null) return null;
  if(row.tipo==='geral' && MOCHILAS_VESTIVEIS[nomeCatalogoDaLinha(row)]) return null;
  const digitado = parseFloat(String(row.carga).replace(',','.'));
  if(isNaN(digitado) || digitado===livro) return null;
  // Inventário Organizado: o que é meio espaço pode estar guardado como 1/4
  if(livro===0.5 && digitado===0.25 && poderesAtivos(f).includes('Inventário Organizado')) return null;
  return {livro, digitado};
}
function renderAvisoEspaco(f, row){
  const d = espacoDivergente(f, row);
  if(!d) return null;
  return el('div',{class:'confira-aviso aviso-espaco'},
    el('span',{}, '⚠ Espaço '+fmtEsp(d.digitado)+'; o livro diz '+fmtEsp(d.livro)+'.'),
    el('button',{class:'link-editar-item', onclick:(e)=>{ e.stopPropagation(); row.carga = String(d.livro); registrarLog(f, 'Espaço de '+nomeBaseItem(row.item)+' corrigido para '+fmtEsp(d.livro)+' (livro)'); salvarPerfis(); render(); }}, 'usar '+fmtEsp(d.livro)));
}
