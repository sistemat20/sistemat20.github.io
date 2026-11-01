// Checagem rápida de sintaxe de todos os arquivos JS do app, sem carregar nada.
// Rode antes de qualquer teste: um erro de sintaxe aqui aparece com nome e linha, enquanto no
// harness ele viraria um "falhou ao carregar" sem dizer onde.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RAIZ = path.resolve(__dirname, '..');
const PASTAS = ['js', 'data', 'test'];

let erros = 0;
let total = 0;

for (const pasta of PASTAS) {
  const dir = path.join(RAIZ, pasta);
  if (!fs.existsSync(dir)) continue;
  for (const nome of fs.readdirSync(dir).sort()) {
    if (!nome.endsWith('.js')) continue;
    const arquivo = path.join(dir, nome);
    total++;
    try {
      new vm.Script(fs.readFileSync(arquivo, 'utf8'), { filename: arquivo });
    } catch (e) {
      erros++;
      console.log('ERRO  ' + pasta + '/' + nome + ': ' + e.message);
    }
  }
}

// Todo arquivo de js/ e data/ precisa estar declarado no index.html, senão não carrega no site.
const html = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
const declarados = new Set([...html.matchAll(/src="([^"]+)"/g)].map((m) => m[1]));
for (const pasta of ['js', 'data']) {
  for (const nome of fs.readdirSync(path.join(RAIZ, pasta))) {
    if (!nome.endsWith('.js')) continue;
    if (!declarados.has(pasta + '/' + nome)) {
      erros++;
      console.log('ERRO  ' + pasta + '/' + nome + ' existe mas não está no index.html (não vai carregar no site)');
    }
  }
}
for (const src of declarados) {
  if (src.endsWith('.js') && !fs.existsSync(path.join(RAIZ, src))) {
    erros++;
    console.log('ERRO  index.html aponta para ' + src + ', que não existe');
  }
}

console.log(erros === 0
  ? total + ' arquivos, sintaxe ok e index.html consistente.'
  : erros + ' problema(s) em ' + total + ' arquivos.');
process.exitCode = erros ? 1 : 0;
