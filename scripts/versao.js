// Troca o ?v= de todos os scripts e estilos do index.html pela data e hora de agora.
// Rodar antes de cada publicação (npm run versao): assim o celular de cada jogador busca todos os
// arquivos novos juntos, em vez de misturar um arquivo antigo do cache com os novos.
const fs = require('fs');
const path = require('path');
const arq = path.join(__dirname, '..', 'index.html');
const agora = new Date();
const v = agora.toISOString().replace(/[-:T]/g, '').slice(0, 12);
const html = fs.readFileSync(arq, 'utf8');
let n = 0;
const novo = html.replace(/(src|href)="([^"]+\.(js|css))(\?v=[^"]*)?"/g, (m, attr, url) => {
  if (/^(https?:|data:)/.test(url)) return m;
  n++;
  return attr + '="' + url + '?v=' + v + '"';
});
fs.writeFileSync(arq, novo);
console.log(n + ' arquivos com a versão ' + v);
