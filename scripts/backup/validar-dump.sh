#!/usr/bin/env bash
# Prova que o dump restaura: sobe um Postgres limpo em contêiner, roda os três
# arquivos e compara as contagens com o que o LEIA-ME promete.
#
#   bash scripts/backup/validar-dump.sh backup/migracao-<data>
#
# Não toca no banco de produção: tudo acontece num contêiner descartável.
set -euo pipefail

PASTA="${1:?informe a pasta do dump, ex: backup/migracao-2026-10-27-13-04-31}"
CONTAINER=pg-valida-dump
SENHA=valida

# O Git Bash do Windows troca /tmp/x por um caminho do Windows ao repassar
# para o docker; isto desliga a conversao (no Linux a variavel e ignorada)
export MSYS_NO_PATHCONV=1

limpar() { docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; }
trap limpar EXIT

limpar
echo "== subindo Postgres 17 limpo"
docker run -d --name "$CONTAINER" -e POSTGRES_PASSWORD="$SENHA" postgres:17-alpine >/dev/null
until docker exec "$CONTAINER" pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done

echo "== papéis que as políticas citam (no Supabase eles já existem)"
# O Supabase traz estes papeis e as funcoes auth.*; aqui elas viram casca so
# para o teste de restauracao nao parar no que nao e do dump
docker exec "$CONTAINER" psql -U postgres -q -c "
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema if not exists auth;
  create or replace function auth.uid() returns uuid language sql stable as \$\$ select null::uuid \$\$;
  create or replace function auth.role() returns text language sql stable as \$\$ select 'authenticated'::text \$\$;
  create or replace function auth.email() returns text language sql stable as \$\$ select null::text \$\$;
  create or replace function auth.jwt() returns jsonb language sql stable as \$\$ select '{}'::jsonb \$\$;"

docker cp "$PASTA/00-auth-esqueleto-teste.sql" "$CONTAINER:/tmp/00.sql"
docker cp "$PASTA/01-estrutura.sql" "$CONTAINER:/tmp/01.sql"
docker cp "$PASTA/02-dados.sql" "$CONTAINER:/tmp/02.sql"
docker cp "$PASTA/03-usuarios.sql" "$CONTAINER:/tmp/03.sql"

echo "== esqueleto do auth (no servidor novo quem faz isso e o Supabase)"
docker exec "$CONTAINER" psql -U postgres -v ON_ERROR_STOP=1 -q -f /tmp/00.sql

echo "== restaurando estrutura"
docker exec "$CONTAINER" psql -U postgres -v ON_ERROR_STOP=1 -q -f /tmp/01.sql

echo "== restaurando dados"
docker exec "$CONTAINER" psql -U postgres -v ON_ERROR_STOP=1 -q -f /tmp/02.sql

echo "== restaurando contas de acesso"
docker exec "$CONTAINER" psql -U postgres -v ON_ERROR_STOP=1 -q -f /tmp/03.sql

echo "== contagens no banco restaurado"
docker exec "$CONTAINER" psql -U postgres -t -A -F' ' -c "
  select relname, n_live_tup from pg_stat_user_tables
   where schemaname='public' and n_live_tup > 0 order by n_live_tup desc;"

echo "== contas de acesso restauradas"
docker exec "$CONTAINER" psql -U postgres -t -A -F' ' -c "
  select (select count(*) from auth.users) as contas,
         (select count(*) from auth.identities) as identidades,
         (select count(*) from auth.users where encrypted_password is not null) as com_senha,
         (select count(*) from public.usuarios u join auth.users a on a.id = u.auth_user_id) as amarrados;"

echo "== inventário (tabelas / funções / gatilhos / políticas / índices)"
docker exec "$CONTAINER" psql -U postgres -t -A -F' ' -c "
  select
    (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'),
    (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'),
    (select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and not t.tgisinternal),
    (select count(*) from pg_policies where schemaname='public'),
    (select count(*) from pg_indexes where schemaname='public');"

echo "== pronto: o dump restaura num Postgres limpo"
