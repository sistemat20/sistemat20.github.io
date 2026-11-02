-- Esquema inicial do Painel do Aventureiro no Supabase (substitui a planilha do Apps Script).
-- Mesmo modelo do SistemaDH: RLS ligado e nenhuma policy pública. Só as Edge Functions, com a
-- chave de serviço, leem e gravam. Colunas em camelCase para o auth-api ser quase uma cópia.

-- Jogadores e o Mestre (o Mestre é a linha com id = 'mestre').
create table public.jogadores (
  row_id bigint generated always as identity primary key,
  "id" text not null unique,
  "nome" text not null,
  "chaveNome" text not null unique,
  "papel" text not null default 'jogador' check ("papel" in ('jogador', 'mestre')),
  "codigoHash" text not null,
  "salt" text not null default 'bcrypt',
  "ativo" boolean not null default true,
  "criadoEm" timestamptz not null default now(),
  "ultimoAcessoEm" timestamptz
);

-- Sessões de login: só o hash SHA-256 do token fica no banco.
create table public.sessoes (
  row_id bigint generated always as identity primary key,
  "tokenHash" text not null unique,
  "jogadorId" text not null references public.jogadores("id") on delete cascade,
  "criadoEm" timestamptz not null default now(),
  "expiraEm" timestamptz not null,
  "ultimoUsoEm" timestamptz
);
create index sessoes_jogador_idx on public.sessoes ("jogadorId");

-- Fichas: o JSON completo da ficha fica em "dados", como na coluna DadosJSON da planilha.
-- nome/raca/classe/nivel são cópias para listar sem abrir o JSON. "versao" impede que um
-- salvamento antigo sobrescreva um mais novo.
create table public.personagens (
  row_id bigint generated always as identity primary key,
  "id" text not null unique,
  "donoId" text not null references public.jogadores("id"),
  "nome" text not null default 'Sem nome',
  "raca" text not null default '',
  "classe" text not null default '',
  "nivel" integer not null default 1,
  "versao" integer not null default 1,
  "criadoEm" timestamptz not null default now(),
  "atualizadoEm" timestamptz not null default now(),
  "excluido" boolean not null default false,
  "dados" jsonb not null default '{}'::jsonb
);
create index personagens_dono_idx on public.personagens ("donoId") where not "excluido";

-- Dados do Mestre (grupos, encontros salvos, grade). Substitui a aba MestreDados.
-- "gradeTokenHash" é o token próprio do link da grade, que só dá acesso à grade.
create table public.mestre_dados (
  "mestreId" text primary key references public.jogadores("id") on delete cascade,
  "dados" jsonb not null default '{"grupos": [], "encontrosSalvos": []}'::jsonb,
  "versao" integer not null default 1,
  "gradeTokenHash" text unique,
  "atualizadoEm" timestamptz not null default now()
);

-- Trava de login: 5 erros seguidos bloqueiam por 15 minutos (regra fica no auth-api).
create table public.auth_rate_limits (
  chave text primary key,
  tentativas integer not null default 0,
  bloqueado_ate timestamptz,
  atualizado_em timestamptz not null default now()
);

-- Quem fez o quê.
create table public.log (
  row_id bigint generated always as identity primary key,
  "quandoEm" timestamptz not null default now(),
  "jogadorId" text not null default '',
  "jogadorNome" text not null default '',
  "acao" text not null default '',
  "detalhe" text not null default ''
);
create index log_quando_idx on public.log ("quandoEm" desc);

-- Fechado para o público: RLS ligado, sem policy, e sem permissão para anon/authenticated.
do $$
declare t text;
begin
  foreach t in array array['jogadores', 'sessoes', 'personagens', 'mestre_dados', 'auth_rate_limits', 'log']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to service_role', t);
  end loop;
end $$;

-- Enviar item para outro personagem: um UPDATE só no JSONB, sem a corrida que o Apps Script
-- resolvia com LockService. Devolve o nome do destino, como o Code.gs fazia.
create or replace function public.enviar_item(p_destino text, p_item jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome text;
begin
  if p_item is null or jsonb_typeof(p_item) <> 'object' then
    raise exception using errcode = 'P0001', message = 'DADOS_INVALIDOS';
  end if;

  update public.personagens
     set "dados" = jsonb_set(
           "dados", '{equip}',
           (case when jsonb_typeof("dados"->'equip') = 'array' then "dados"->'equip' else '[]'::jsonb end)
             || jsonb_build_array(p_item)),
         "versao" = "versao" + 1,
         "atualizadoEm" = now()
   where "id" = p_destino and not "excluido"
   returning "nome" into v_nome;

  if not found then
    raise exception using errcode = 'P0001', message = 'DESTINO_NAO_ENCONTRADO';
  end if;
  return jsonb_build_object('ok', true, 'nomeDestino', v_nome);
end;
$$;

-- Enviar dinheiro (ts, tc ou to) para outro personagem, somando no valor atual.
create or replace function public.enviar_dinheiro(p_destino text, p_campo text, p_valor integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome text;
begin
  if p_campo not in ('ts', 'tc', 'to') or p_valor is null or p_valor <= 0 then
    raise exception using errcode = 'P0001', message = 'DADOS_INVALIDOS';
  end if;

  update public.personagens
     set "dados" = jsonb_set(
           "dados", array[p_campo],
           to_jsonb(coalesce(case when "dados"->>p_campo ~ '^-?[0-9]+$' then ("dados"->>p_campo)::integer end, 0) + p_valor)),
         "versao" = "versao" + 1,
         "atualizadoEm" = now()
   where "id" = p_destino and not "excluido"
   returning "nome" into v_nome;

  if not found then
    raise exception using errcode = 'P0001', message = 'DESTINO_NAO_ENCONTRADO';
  end if;
  return jsonb_build_object('ok', true, 'nomeDestino', v_nome);
end;
$$;

revoke all on function public.enviar_item(text, jsonb) from public, anon, authenticated;
revoke all on function public.enviar_dinheiro(text, text, integer) from public, anon, authenticated;
grant execute on function public.enviar_item(text, jsonb) to service_role;
grant execute on function public.enviar_dinheiro(text, text, integer) to service_role;

-- Fotos de personagem. Leitura pública pela URL (a ficha guarda o link, como hoje com o Drive);
-- upload e remoção só pela Edge Function. Até 1 MB, só imagem.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos-personagens', 'fotos-personagens', true, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
