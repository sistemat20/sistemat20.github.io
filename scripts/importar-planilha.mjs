// Importa a planilha do Apps Script para o Supabase (passos 5 e 6 do plano de migração).
//
//   node scripts/importar-planilha.mjs --simular
//       Só lê a planilha (pelo próprio Apps Script, nada é alterado lá) e escreve o relatório
//       com a lista "nome no app ← fichas". Não grava nada no Supabase.
//
//   node scripts/importar-planilha.mjs --gravar
//       Lê de novo e grava no Supabase, SUBSTITUINDO todos os jogadores e fichas que já estiverem
//       lá (menos o Mestre). Pode rodar quantas vezes quiser: o resultado é sempre a planilha atual.
//
// Opções:
//   --nomes=arquivo.json     correções de nome: {"Nome sugerido": "Nome que a pessoa vai usar"}
//   --relatorio=arquivo.md   onde escrever o relatório (padrão: importacao-relatorio.md aqui)
//
// Cada pessoa continua entrando com o código que já usa; o nome vem do campo "jogador" das
// fichas dela. O código vira bcrypt AQUI, nesta máquina: em texto puro ele nunca sai daqui e
// nunca aparece no relatório. O Mestre entra com o código de Mestre de hoje (CODIGO_MESTRE_ESPECIAL
// ou a variável T20_CODIGO_MESTRE) e deve trocá-lo no app logo depois, porque o de hoje está
// escrito no JavaScript público do site.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const adaptador = fs.readFileSync(path.join(RAIZ, 'js', 'storage-adapter.js'), 'utf8');
const pegar = (re) => { const m = adaptador.match(re); if (!m) throw new Error('Não achei ' + re + ' no storage-adapter.js'); return m[1]; };
const SHEETS_API_URL = pegar(/const SHEETS_API_URL = '([^']+)'/);
const SUPABASE_URL = pegar(/const SUPABASE_URL = '([^']+)'/);
const SUPABASE_CHAVE_PUBLICA = pegar(/const SUPABASE_CHAVE_PUBLICA = '([^']+)'/);
const CODIGO_MESTRE = process.env.T20_CODIGO_MESTRE || pegar(/const CODIGO_MESTRE_ESPECIAL = '([^']+)'/);
const LOTE_BYTES = 900000;

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.length ? v.join('=') : true]; }));
if (!args.simular && !args.gravar) {
  console.log('Use --simular (só lê e gera o relatório) ou --gravar (grava no Supabase).');
  process.exit(1);
}
const correcoes = args.nomes ? JSON.parse(fs.readFileSync(args.nomes, 'utf8')) : {};
const arquivoRelatorio = args.relatorio || path.join(RAIZ, 'importacao-relatorio.md');

// Mesmas regras do auth-api, senão a pessoa não consegue entrar com o nome importado.
function normalizarNome(nome) {
  return String(nome || '').trim().replace(/\s+/g, ' ').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}
function limparNome(nome) {
  return String(nome || '').replace(/[^\p{L}\p{N} ._'-]/gu, '').trim().replace(/\s+/g, ' ').slice(0, 24).trim();
}
function mascarar(codigo) { const c = String(codigo); return c.slice(0, 1) + '•'.repeat(Math.max(3, c.length - 1)); }

async function lerJSON(url) {
  const r = await fetch(url, { cache: 'no-store' });
  const t = await r.text();
  try { return JSON.parse(t); } catch { throw new Error('Resposta inesperada de ' + url.split('?')[0] + ': ' + t.slice(0, 200)); }
}
async function chamar(funcao, corpo) {
  const r = await fetch(SUPABASE_URL + '/functions/v1/' + funcao, {
    method: 'POST', headers: { 'content-type': 'application/json', apikey: SUPABASE_CHAVE_PUBLICA }, body: JSON.stringify(corpo),
  });
  return r.json();
}

// ---------------------------------------------------------------- 1. ler a planilha
console.log('Lendo a planilha pelo Apps Script (só leitura)...');
const todos = await lerJSON(SHEETS_API_URL + '?mestre=true&_t=' + Date.now());
if (!todos.ok) throw new Error('O Apps Script não devolveu as fichas: ' + JSON.stringify(todos).slice(0, 200));
const mestre = await lerJSON(SHEETS_API_URL + '?mestreDados=true&mestreCodigo=' + encodeURIComponent(CODIGO_MESTRE) + '&_t=' + Date.now());
const mestreDados = (mestre.ok && mestre.dados) ? mestre.dados : null;

// Ficha repetida (a planilha às vezes duplicava linha): fica a última, que é a mais nova.
const porId = new Map();
const avisos = [];
for (const f of todos.personagens || []) {
  if (!f || !f.id) { avisos.push('Uma ficha sem id foi ignorada.'); continue; }
  if (porId.has(f.id)) avisos.push(`Ficha "${f.nome || f.id}" aparecia repetida; fiquei com a última.`);
  porId.set(f.id, f);
}

// ---------------------------------------------------------------- 2. agrupar por código
const grupos = new Map();
for (const f of porId.values()) {
  const codigo = String(f._playerId || '').trim();
  if (!codigo) { avisos.push(`Ficha "${f.nome || f.id}" não tem código de jogador e ficou de fora.`); continue; }
  if (codigo.toLowerCase() === CODIGO_MESTRE.toLowerCase()) { avisos.push(`Ficha "${f.nome || f.id}" está no código do Mestre e ficou de fora.`); continue; }
  if (!grupos.has(codigo)) grupos.set(codigo, []);
  grupos.get(codigo).push(f);
}

// ---------------------------------------------------------------- 3. escolher os nomes
const usados = new Set([normalizarNome('Mestre')]);
const jogadores = [];
let semNome = 0;
for (const [codigo, fichas] of grupos) {
  const contagem = new Map();
  for (const f of fichas) { const n = limparNome(f.jogador); if (n.length >= 2) contagem.set(n, (contagem.get(n) || 0) + 1); }
  const candidatos = [...contagem.entries()].sort((a, b) => b[1] - a[1]).map((e) => e[0]);
  let sugerido = candidatos[0] || `Jogador ${++semNome}`;
  let nome = limparNome(correcoes[sugerido] || sugerido) || sugerido;
  const obs = [];
  if (!candidatos.length) obs.push('fichas sem nome de jogador');
  if (candidatos.length > 1) obs.push('outros nomes nas fichas: ' + candidatos.slice(1).join(', '));
  if (correcoes[sugerido]) obs.push(`corrigido de "${sugerido}"`);
  let base = nome, n = 2;
  while (usados.has(normalizarNome(nome))) { nome = (base.slice(0, 21) + ' ' + n++).trim(); }
  if (nome !== base) obs.push(`"${base}" já estava em uso, virou "${nome}"`);
  usados.add(normalizarNome(nome));
  jogadores.push({ codigo, nome, sugerido, fichas, obs });
}
jogadores.sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));

// ---------------------------------------------------------------- 4. relatório
const linhas = [
  '# Importação da planilha: conferência',
  '',
  `Gerado em ${new Date().toLocaleString('pt-BR')} (${args.gravar ? 'gravação' : 'simulação, nada foi gravado'}).`,
  '',
  `${jogadores.length} jogadores, ${jogadores.reduce((s, j) => s + j.fichas.length, 0)} fichas. Dados do Mestre: ${mestreDados ? 'encontrados' : 'NÃO encontrados'}.`,
  '',
  'Cada pessoa entra com o **nome** abaixo e o **mesmo código que já usa** (aqui só aparece a primeira letra).',
  'Para corrigir um nome, crie um arquivo JSON {"Nome sugerido": "Nome certo"} e rode de novo com --nomes=arquivo.json.',
  '',
  '| Nome no app | Código | Fichas | Observações |',
  '|---|---|---|---|',
  ...jogadores.map((j) => `| ${j.nome} | ${mascarar(j.codigo)} | ${j.fichas.map((f) => f.nome || '(sem nome)').join(', ')} | ${j.obs.join('; ')} |`),
  '',
];
if (avisos.length) linhas.push('## Avisos', '', ...avisos.map((a) => '- ' + a), '');
fs.writeFileSync(arquivoRelatorio, linhas.join('\n'), 'utf8');
console.log(`${jogadores.length} jogadores, ${porId.size} fichas lidas. Relatório: ${arquivoRelatorio}`);
if (args.simular) process.exit(0);

// ---------------------------------------------------------------- 5. gravar no Supabase
// T20_TOKEN_MESTRE: sessão de Mestre já aberta (por exemplo, uma sessão temporária criada no
// banco depois que o Mestre trocou o código). Sem ela, entra com o código de Mestre.
let token = process.env.T20_TOKEN_MESTRE || '';
const sessaoPropria = !token;
if (sessaoPropria) {
  console.log('Entrando como Mestre no Supabase...');
  const login = await chamar('auth-api', { acao: 'entrarMestre', codigo: CODIGO_MESTRE });
  if (!login.ok) throw new Error('Não consegui entrar como Mestre: ' + JSON.stringify(login.erro));
  token = login.dados.token;
}

console.log('Calculando bcrypt dos códigos (pode levar alguns segundos)...');
const jogadoresBanco = jogadores.map((j) => ({
  id: randomUUID(), nome: j.nome, chaveNome: normalizarNome(j.nome), codigoHash: bcrypt.hashSync(j.codigo, 12), fichas: j.fichas,
}));

// Lotes pequenos (limite de tamanho do corpo da Edge Function). O primeiro leva todos os
// jogadores, o "substituir" e os dados do Mestre; os outros, só fichas.
const fichas = jogadoresBanco.flatMap((j) => j.fichas.map((f) => ({ id: f.id, donoId: j.id, dados: f })));
const lotes = [[]];
let tamanho = 0;
for (const f of fichas) {
  const t = JSON.stringify(f).length;
  if (tamanho + t > LOTE_BYTES && lotes[lotes.length - 1].length) { lotes.push([]); tamanho = 0; }
  lotes[lotes.length - 1].push(f);
  tamanho += t;
}
let totalJog = 0, totalFichas = 0;
for (let i = 0; i < lotes.length; i++) {
  const corpo = { acao: 'importarDados', token, personagens: lotes[i] };
  if (i === 0) Object.assign(corpo, {
    substituir: true,
    jogadores: jogadoresBanco.map(({ id, nome, chaveNome, codigoHash }) => ({ id, nome, chaveNome, codigoHash })),
    mestreDados: mestreDados || undefined,
  });
  const r = await chamar('t20-api', corpo);
  if (!r.ok) throw new Error(`Lote ${i + 1} falhou: ` + JSON.stringify(r.erro));
  totalJog += r.dados.jogadores; totalFichas += r.dados.personagens;
  console.log(`Lote ${i + 1}/${lotes.length}: ${r.dados.personagens} fichas.`);
}
if (sessaoPropria) await chamar('auth-api', { acao: 'sair', token });
console.log(`Pronto: ${totalJog} jogadores e ${totalFichas} fichas no Supabase.`);
