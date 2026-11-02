# Como o Painel do Aventureiro fica na internet

Duas partes, publicadas separadamente:

- **Site** (HTML, CSS, JS): GitHub Pages, em `sistemat20.github.io`, a partir da branch `main`.
- **Backend**: Supabase, projeto `SistemaT20` (ref `wosdybamqyisdtfpnvly`, região São Paulo), na
  organização `SistemaT20`. Tem o banco (Postgres), duas Edge Functions e o Storage das fotos.

Até 01/11/2026 o backend era uma planilha do Google com um Apps Script; os dados foram
importados para o Supabase nesse dia.

## Site

Subir para a `main` publica sozinho, em cerca de um minuto. O navegador pode guardar o
`style.css` antigo por alguns minutos depois de cada publicação.

## Backend (pasta `supabase/`)

| O quê | Onde | Como publicar |
|---|---|---|
| Tabelas, regras de acesso, funções atômicas, bucket de fotos | `supabase/migrations/` | aplicar a migração nova no projeto |
| Login (nome + código, Mestre, troca de código) | `supabase/functions/auth-api` | deploy da Edge Function, `verify_jwt` desligado |
| Fichas, dados do Mestre, grade, fotos | `supabase/functions/t20-api` | deploy da Edge Function, `verify_jwt` desligado |

As duas funções fazem a própria autenticação (token da sessão do `auth-api`, ou o token do link
da grade), por isso `verify_jwt` fica desligado. O banco não tem nenhuma regra pública: só as
funções, com a chave de serviço, leem e gravam.

**Publicar o site não atualiza o backend**, e vice-versa. Mudou algo em `supabase/`, a função ou
a migração precisa ser publicada à parte.

## Chaves

- `SUPABASE_URL` e `SUPABASE_CHAVE_PUBLICA` ficam em `js/storage-adapter.js`. A chave publicável
  é pública por natureza.
- A chave de serviço (`service_role`) **nunca** vai para o site nem para o repositório: só as
  Edge Functions a usam, pelo ambiente do próprio Supabase.

## Plano gratuito

Projeto parado 7 dias sem uso é pausado pelo Supabase; reativar é um clique no painel. O limite
de 2 projetos gratuitos ativos vale para a conta inteira, somando as organizações.
