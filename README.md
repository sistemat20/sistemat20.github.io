# Painel do Aventureiro

Ficha digital automatizada de **Tormenta 20**, feita para uma mesa de campanha. Cada jogador
abre a sua ficha pelo navegador, e o Mestre tem uma área própria com bestiário, grade de
combate, tesouro e lojas.

A ideia é que o sistema calcule tudo que dá para calcular: pontos de vida e mana, Defesa,
perícias, carga, custo e CD de magia, bônus de poder, de item, de parceiro e de condição. O
livro fica para o que é narrativa, não para fazer conta.

## Rodar localmente

```bash
python3 -m http.server 8000
```

E abra `http://localhost:8000`.

Não tem build, nem bundler, nem framework: é JavaScript puro carregado por tags `<script>` no
`index.html`.

## Testes

```bash
npm install
npm run check   # sintaxe de todos os arquivos + conferir se o index.html está consistente
npm test        # regressão (telas e cálculos) + armazenamento no Supabase (servidor simulado)
```

## Estrutura

```
index.html              ordem de carregamento de tudo (arquivo novo precisa entrar aqui)
css/style.css           tokens de cor, tipografia e espaçamento, mais os temas
js/                     lógica: cálculo, telas do jogador e do Mestre, criação, nível, itens
data/                   base de regras extraída dos livros
supabase/               backend: migrações do banco e Edge Functions (auth-api, t20-api)
test/                   ambiente de teste (jsdom) e suíte de regressão
docs/                   regras já conferidas contra o livro oficial
livros/                 PDFs dos livros, fora do git (ver livros/LEIA-ME.md)
```

## Publicar

O site é estático e vai para o GitHub Pages: subir para a branch publicada já publica.

O backend é separado: Supabase (banco, login e fotos). Mudanças em `supabase/` precisam ser
publicadas no Supabase à parte. Ver `DEPLOY.md`.

## Para quem for mexer no código

`CLAUDE.md` tem as convenções, as armadilhas conhecidas e o método de conferir regra contra o
livro. Vale ler antes de a primeira mudança, inclusive se você for humano.
