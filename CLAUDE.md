# Painel do Aventureiro (Tormenta 20)

Ficha digital automatizada de Tormenta 20 para um grupo de campanha, com uma área de jogador e
uma área de Mestre. Escrito pela Vanessa, que é a desenvolvedora e a Mestra da mesa.

**Princípio que manda em tudo:** o máximo possível automático, o livro o mínimo possível. Se um
poder, item ou condição tem efeito numérico previsível, o sistema calcula sozinho. Nunca
escreva "consulte o livro para a descrição completa" numa tela: extraia o texto real do PDF e
coloque ali. Efeito situacional de combate (depende do terreno, do tipo do alvo, da rodada) é
exceção aceita: o app é ficha e calculadora, não simula turno a turno.

## Como rodar

Site estático puro, sem build e sem bundler. Abrir `index.html` por um servidor local:

```bash
python3 -m http.server 8000
```

Deploy: GitHub Pages em `sistemat20.github.io`.

## Arquitetura

**Frontend**, JavaScript puro, sem framework, sem módulos ES. Todo arquivo é carregado por uma
tag `<script defer>` em `index.html`, na ordem em que aparece lá, e tudo vive no escopo global.
Arquivo novo em `data/` ou `js/` só funciona depois de ser adicionado ao `index.html`.

| Arquivo | O que tem |
|---|---|
| `js/app.js` | Motor de cálculo (atributos, PV/PM, Defesa, perícias, carga, custo de magia), estado global `state`, persistência, `render()` |
| `js/ficha.js` | Toda a interface do jogador |
| `js/mestre.js` | Toda a interface do Mestre (bestiário, grade de combate, tesouro, lojas) |
| `js/wizard.js` | Criação de personagem |
| `js/levelup.js` | Subir e descer de nível |
| `js/item-superior.js` | Construtor de item superior (melhorias e materiais) |
| `js/storage-adapter.js` | Conversa com o Supabase (Edge Functions), sessão de login, versões das fichas, merge de dados |
| `data/*.js` | Base de regras extraída dos livros (raças, classes, poderes, magias, itens, criaturas) |
| `supabase/migrations/` | Esquema do banco: tabelas, RLS sem policy pública, funções `enviar_item`/`enviar_dinheiro`, bucket de fotos |
| `supabase/functions/auth-api` | Login por nome + código (bcrypt), Mestre, troca de código, sair |
| `supabase/functions/t20-api` | Fichas (com versão), dados do Mestre, mapas, link da grade, fotos |

**Backend.** Supabase, projeto `SistemaT20` (ref `wosdybamqyisdtfpnvly`). Cada ficha é uma linha
de `personagens` com o JSON completo em `dados` e um número `versao`: salvar com versão velha
volta como conflito, e o app mescla sem perder item/dinheiro antes de tentar de novo. O banco
não tem regra pública; só as Edge Functions gravam. Ver `DEPLOY.md`. (Até 01/11/2026 era uma
planilha do Google com Apps Script.)

> **Se você mexer em `supabase/`, avise a usuária explicitamente.** Publicar o site não atualiza
> o backend: migração e Edge Function são publicadas à parte, e cada uma precisa do "pode" dela.
> Se não mexeu no backend, vale dizer isso também.

## Testes

```bash
npm install   # instala jsdom (única dependência, só de desenvolvimento)
npm test      # regressao.test.js + supabase.test.js
```

`test/harness.js` carrega `index.html`, concatena todos os scripts na ordem certa e avalia tudo
de uma vez num DOM simulado. Os testes ficam em `test/*.test.js`.

Detalhes do ambiente que custaram tempo para descobrir:

- **Tem que ser um `eval` só, com tudo concatenado.** Um `eval` por arquivo não funciona:
  declarações `const` de um `eval` não enxergam as do outro, e o carregamento quebra em
  `PODERES_GERAIS is not defined`.
- **O harness precisa reexportar no `window`** o que o teste vai chamar, porque `const` e
  `function` declarados dentro do `eval` não viram propriedade do `window` sozinhos.
- **Defina o código de acesso antes de renderizar:**
  `localStorage.setItem('painel_aventureiro_codigo_jogador', 'TESTE-1234')`. Sem isso, toda tela
  cai na tela de login e o teste falha por um motivo que não é o que você está testando.
- **`render()` tem um `try/catch` interno** que, em caso de erro, mostra uma tela de erro em vez
  de propagar. Então um `try` em volta de `render()` não pega nada: cheque se o texto da tela
  contém "Deu um erro ao montar essa tela" e leia o que foi para o `console.error`.
- **Seções colapsáveis não renderizam o corpo quando fechadas.** Para testar o conteúdo de
  dentro, abra todas antes:
  `state._secoesNotasAbertas = new Proxy({}, { get: () => true, set: () => true })`.
- **Nomes reais das abas:** `personagem`, `pericias`, `itens`, `magias`, `guia`. Não existe aba
  `ficha` nem `notas`.
- **O construtor de item superior só aparece na aba `itens`**, porque quem o chama é
  `renderItensCompleto()`.
- `fetch` não existe no jsdom. O harness faz um mock. Se o seu teste usa a lista de jogadores,
  cubra também o parâmetro `listaJogadores=true`, senão cai no fallback vazio.

Antes de qualquer entrega: `node --check` em todo arquivo alterado, depois a regressão inteira,
não só o teste do que você mexeu.

## Convenções do código

**`render()` reconstrói o DOM inteiro.** Não existe atualização parcial. Três consequências que
geram bug de verdade:

1. **Todo `<input>` precisa de `id`.** O `render()` só restaura o foco em elementos que têm
   `id`. Campo de busca sem `id` perde o foco a cada tecla digitada. Esse bug já voltou várias
   vezes, em telas diferentes.
2. **Campo de texto que atualiza enquanto digita usa `renderDebounced`**, não `render` direto.
3. **Estado temporário de tela vive em `state`** com prefixo `_` (`state._itemSuperiorBuilder`,
   `state._usarMagiaPopup`), nunca em variável de módulo.

**Componentes de tela.** Card clicável que abre: `renderItemColapsavel(chave, nome, metaTopo,
corpo, corAcento)`. Painel de seção: `renderSecaoNotasColapsavel(chave, ícone, título, resumo,
corpoFn, abertoPadrão)`. Nunca monte um card desses na mão com `.power-item` ou div solta: o
visual sai diferente dos vizinhos, e isso já foi reclamado.

**Estilo.** Tokens em `:root` no `css/style.css` (cores, `--fs-*`, `--sp-*`, `--radius-*`). Nada
de valor cru. Existe um tema alternativo de alto contraste em `[data-tema="mesa"]` que precisa
continuar funcionando.

**Pontos únicos de verdade.** Quando existir uma função central, use ela em vez de ler o campo
direto. As que mais importam:

- `atributoEfetivo(f, chave)` em vez de `f.des`, porque ela trata a Maldição do Bardo.
- `removerItemMochila(f, idx)` em vez de `f.equip.splice()`, porque ela registra a exclusão em
  `f._itensExcluidosDePresente`. Sem isso, item recebido do Mestre volta sozinho no próximo
  merge. Esse bug tinha **duas** funções de merge diferentes com o mesmo defeito
  (`mesclarPresentesDoServidor` em `app.js` e `mesclarSemPerderDados` em `storage-adapter.js`);
  se mexer em uma, confira a outra.
- `custoPMAjustado(f, magia)` e `limitePMPorMagia(f, magia)` para custo e limite de PM.
- `esotericosEquipados(f)` e `itensVestidosAtivos(f)` para saber o que está em uso.

**Efeito de item.** Item com efeito numérico guarda um `efeito: [{tipo, valor}]` estruturado, e
alguma função de cálculo lê esse `tipo`. Texto na descrição não faz nada sozinho. Tipos em uso:
`testeAtaque`, `dano`, `penalidade`, `defesaEArmadura`, `cd_arcana_geral`, `cd_arcana_escola`,
`limite_pm_arcana`, `limite_pm_escola`, `custo_pm_alcance_pessoal`, `custo_pm_magia`,
`defesa_esoterico`, `custo_pm_tradicao`, `custo_pm_magia_lista`, `custo_pm_zero_arcanista`.
Para itens mágicos do Capítulo 8 que não são esotéricos, a ponte é
`EFEITOS_MAGICOS_AUTOMATICOS` em `data/itens-magicos.js`, lida por `efeitosMagicosAtivos(f)`.

**Melhoria que substitui outra.** Em `data/item-superior.js`, o campo `substitui` marca que a
melhoria avançada troca o bônus da básica em vez de somar (Pungente sobre Certeira, Atroz sobre
Cruel, Sob medida sobre Ajustada, Potencializador sobre Canalizador). O preço continua cobrando
as duas. Se adicionar um par novo desses, preencha `substitui` e acrescente a dupla em
`PARES_MELHORIA_SUBSTITUIDA` (`js/app.js`), que corrige itens já salvos errado.

**Migração de dados salvos.** Mudança que altera o significado de um campo já gravado precisa de
migração em `aplicarMigracoesPerfis()`, com uma marca no item (tipo `_melhoriasMigradas`) para
não rodar duas vezes. As fichas do grupo são dados reais em uso, não dá para pedir que refaçam.

## Verificar regra de Tormenta 20

**Sempre o PDF antes da internet.** Isso não é preferência, é correção: uma wiki popular já deu
uma regra errada sobre a raça Golem e foi parar no código.

1. Procure os PDFs em `livros/` (fora do git, ver `.gitignore`). O que importa é o Livro Básico
   e o Ameaças de Arton.
2. Extraia com `pdftotext -layout arquivo.pdf saida.txt`. O `-layout` é obrigatório: o livro é
   em duas colunas e sem isso o texto embaralha poderes diferentes.
3. Busque o termo exato no texto extraído.
4. Só vá para a internet se o PDF genuinamente não tiver (suplementos como Deuses e Heróis não
   estão lá). Nesse caso, avise que a fonte não é oficial e deixe ela confirmar.

`docs/regras-confirmadas.md` lista tudo que já foi checado contra o livro. **Olhe lá antes de
reconferir.** Se confirmar algo novo, acrescente.

### Auditoria de regra desconectada

Método que já rendeu mais de 25 correções numa rodada:

1. Procure por padrão numérico no texto das regras, não por nome de poder:
   `grep -oP '\{nome:"[^"]+", desc:"[^"]*(?:\+\d|soma sua)[^"]*"' data/poderes_classe.js`
2. Para cada achado, veja se alguma função de cálculo lê aquilo: `grep -rn "Nome do Poder" js/`.
   Zero resultado sugere desconectado. **Cuidado:** às vezes existe um mecanismo genérico (tipo
   `defesaBonusFixo` nas opções de raça) que não aparece buscando pelo nome. Confira o mecanismo
   antes de concluir que está quebrado.
3. Bônus permanente em algo que a ficha já calcula = implementar. Situacional de combate = fora
   de escopo, de propósito.
4. Teste com o poder e sem o poder, e rode a regressão inteira.

## Ao conversar com a usuária

Ela escreve e lê em português. **Nunca use travessão (—) em texto para ela.**
