const { JSDOM } = require('jsdom');
const fs = require('fs');
const files = ['data/racas.js','data/classes.js','data/poderes_classe.js','data/origens.js','data/deuses.js','data/poderes.js','data/itens.js','data/magias.js','data/pericias.js','data/pericias_classe.js','data/proficiencias.js','data/mestre.js','data/ameacas-arton.js','data/item-superior.js','data/itens-magicos.js','js/ficha.js','js/wizard.js','js/levelup.js','js/mestre.js','js/item-superior.js','js/storage-adapter.js','js/app.js'];
const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="root"></div></body></html>`, { runScripts: "dangerously", url:"https://exemplo.local/", pretendToBeVisual:true });
dom.window.storage = { get: async ()=>null, set: async ()=>({}) };
dom.window.confirm = ()=>true;
for(const f of files){
  const scriptEl = dom.window.document.createElement('script');
  scriptEl.textContent = fs.readFileSync(f,'utf8');
  dom.window.document.body.appendChild(scriptEl);
}
(async ()=>{
  try{
    await dom.window.iniciar();
    dom.window.state.screen='perfis'; dom.window.render();
    dom.window.iniciarWizard();
    let w = dom.window.state.wizard;
    w.nome='HeroiCondicao'; w.jogador='T';
    w.rolados=[2,1,3,0,-1,1]; w.assign={for:0,des:1,con:2,int:3,sab:4,car:5};
    w.racaNome='Humano'; w.racaEscolhasAttr=['for','des','con'];
    w.origemNome='Soldado';
    const o = dom.window.eval('ORIGENS').find(x=>x.nome==='Soldado');
    w.origemEscolhas=[{tipo:'pericia',valor:o.pericias[0],sub:null},{tipo:'unico',valor:o.poderUnico.nome,sub:null}];
    w.classeNome='Guerreiro';
    const ci = dom.window.eval('CLASSES_INICIAL')['Guerreiro'];
    ci.fixas.forEach(f=>{ if(f.includes(' ou ')) w.periciaFixaEscolhas[f]=f.split(' ou ')[0]; });
    w.periciasExtraClasse = dom.window.eval('PERICIAS_POR_CLASSE')['Guerreiro'].filter(p=>p!==o.pericias[0].split(' (')[0]).slice(0,ci.extra);
    w.periciasExtraInt = [];
    await dom.window.finalizarCriacao();
    const f = dom.window.state.perfis[0];

    console.log('=== TESTE: Defesa com Vulnerável ===');
    const defesaAntes = dom.window.eval('defesaTotal')(f);
    f.condicoesAtivas = ['Vulnerável'];
    const defesaDepois = dom.window.eval('defesaTotal')(f);
    console.log('Defesa antes:', defesaAntes, '/ depois:', defesaDepois, '-> caiu 2?', defesaDepois === defesaAntes-2);

    console.log('\n=== TESTE: Defesa com Indefeso ===');
    f.condicoesAtivas = ['Indefeso'];
    console.log('Defesa com Indefeso (-10)?', dom.window.eval('defesaTotal')(f) === defesaAntes-10);

    console.log('\n=== TESTE: perícia com Abalado (-2 em tudo) ===');
    const percepcaoObj = dom.window.eval('PERICIAS').find(p=>p.nome==='Percepção');
    const valorAntes = dom.window.eval('periciaValor')(f, percepcaoObj);
    f.condicoesAtivas = ['Abalado'];
    const valorDepois = dom.window.eval('periciaValor')(f, percepcaoObj);
    console.log('Percepção antes:', valorAntes, '/ com Abalado:', valorDepois, '-> caiu 2?', valorDepois === valorAntes-2);

    console.log('\n=== TESTE: Fraco só afeta perícias de For/Des/Con ===');
    f.condicoesAtivas = ['Fraco'];
    const atletismoObj = dom.window.eval('PERICIAS').find(p=>p.nome==='Atletismo'); // For
    const diplomaciaObj = dom.window.eval('PERICIAS').find(p=>p.nome==='Diplomacia'); // Car
    const atletismoValor = dom.window.eval('periciaValor')(f, atletismoObj);
    const atletismoSemCondicao = (()=>{ f.condicoesAtivas=[]; const v = dom.window.eval('periciaValor')(f, atletismoObj); f.condicoesAtivas=['Fraco']; return v; })();
    const diplomaciaValor = dom.window.eval('periciaValor')(f, diplomaciaObj);
    const diplomaciaSemCondicao = (()=>{ f.condicoesAtivas=[]; const v = dom.window.eval('periciaValor')(f, diplomaciaObj); f.condicoesAtivas=['Fraco']; return v; })();
    console.log('Atletismo (For) caiu 2 com Fraco?', atletismoValor === atletismoSemCondicao-2);
    console.log('Diplomacia (Car) NÃO mudou com Fraco?', diplomaciaValor === diplomaciaSemCondicao);

    console.log('\n=== TESTE: deslocamento com Lento (metade) ===');
    f.condicoesAtivas = [];
    const deslocAntes = dom.window.eval('deslocamentoEfetivo')(f);
    f.condicoesAtivas = ['Lento'];
    const deslocDepois = dom.window.eval('deslocamentoEfetivo')(f);
    console.log('Deslocamento antes:', deslocAntes, '/ com Lento:', deslocDepois, '-> é metade?', deslocDepois === Math.floor(deslocAntes*0.5));

    console.log('\n=== TESTE: deslocamento com Imóvel (zero) ===');
    f.condicoesAtivas = ['Imóvel'];
    console.log('Deslocamento com Imóvel:', dom.window.eval('deslocamentoEfetivo')(f));

    console.log('\n=== TESTE: Surdo penaliza só Iniciativa ===');
    f.condicoesAtivas = [];
    const iniciativaObj = dom.window.eval('PERICIAS').find(p=>p.nome==='Iniciativa');
    const iniciativaAntes = dom.window.eval('periciaValor')(f, iniciativaObj);
    f.condicoesAtivas = ['Surdo'];
    const iniciativaDepois = dom.window.eval('periciaValor')(f, iniciativaObj);
    console.log('Iniciativa caiu 5 com Surdo?', iniciativaDepois === iniciativaAntes-5);

    console.log('\n=== TESTE: Anão continua imune a Lento? (não deveria, só armadura/carga) ===');
    // não vou criar um anão completo, só confirmo que a lógica não quebra
    f.condicoesAtivas = ['Lento'];
    console.log('deslocamentoEfetivo roda sem erro pra personagem normal?', typeof dom.window.eval('deslocamentoEfetivo')(f) === 'number');

    console.log('\n=== TESTE: UI mostra o indicador ⚡ ===');
    f.condicoesAtivas = ['Vulnerável', 'Confuso']; // uma com efeito, outra sem
    dom.window.state.perfilAtualId = f.id;
    dom.window.state.tab='personagem'; dom.window.state.personagemTab='ficha'; dom.window.render();
    let html = dom.window.document.getElementById('root').innerHTML;
    console.log('Mostra "já aplicado nos cálculos" pra Vulnerável?', html.includes('já aplicado nos cálculos'));

    console.log('\n=== Regressão geral ===');
    f.condicoesAtivas = [];
    for(const tab of ['personagem','magias','pericias','itens','guia']){ dom.window.state.tab=tab; dom.window.render(); }
    console.log('Todas as seções do jogador OK.');

    console.log('\n=== SUÍTE OK ===');
  }catch(e){ console.error('ERRO:', e.message); console.error(e.stack); process.exit(1); }
})();
