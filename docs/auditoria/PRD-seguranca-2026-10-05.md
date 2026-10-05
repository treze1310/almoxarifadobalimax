# PRD — Melhorias de Segurança (05/10/2026)

Base: `Plano mínimo de segurança para a API do app`
Projeto: `10 - SITE BALIMAX + ALMOX` · Supabase `dqxrpsjalsmoyconcurz` · hospedagem Vercel (`balimax.com.br/sistema`)

**Status: executado em 05/10/2026** (fases S1 a S4). A fase S5 depende de ações no painel do
Supabase e segue pendente. Ver §8 no fim do documento.

---

## 1. Tradução do plano para esta arquitetura

O plano original pressupõe um backend Node/Express com rotas, middlewares e conexão própria ao
banco. **Este app não tem backend próprio.** É uma SPA (Vite + React) que fala direto com o
Supabase, mais uma Edge Function. Verificado em `src/lib/supabase.ts` (cliente aponta para o schema
`public`) e `supabase/functions/admin-usuarios/`.

Logo, não existe um `app.use(...)` onde encaixar um middleware. A "API" exposta na internet é:

| O que o plano chama de… | Onde está, de fato |
|---|---|
| Rotas HTTP | `/rest/v1/<tabela>` (PostgREST, geradas automaticamente para 24 tabelas) |
| Rotas sensíveis / pagas | `/functions/v1/admin-usuarios` (cria usuário, redefine senha, exclui usuário) |
| Middleware de autenticação | JWT do Supabase Auth + **RLS** no Postgres |
| Política de acesso | Tabela `perfis_acesso` + funções `app_tem_permissao` / `app_eh_admin` |
| Conexão com banco | Não há conexão direta do app; tudo passa por PostgREST com papéis `anon` / `authenticated` |
| Uploads | Storage: buckets `avatars` e `site-imagens` |

Consequência prática: **rate limit e CORS por middleware não se aplicam à maior parte da
superfície** — quem protege as tabelas é a RLS, e quem limita taxa é o gateway do Supabase. O que dá
para controlar no nosso código é a Edge Function, os cabeçalhos do Vercel e as policies.

---

## 2. O que o plano pede e já está atendido

Resultado da auditoria de hoje (fases já executadas, ver `PRD-auditoria-2026-10-05.md`):

| Item do plano | Situação | Evidência |
|---|---|---|
| 2. Proteger rotas sensíveis | ✅ para as tabelas | 70 policies por operação ancoradas no perfil; 0 policies `USING(true)` |
| 2. Rota de usuários/cobrança | ✅ | `admin-usuarios` revalida no servidor se quem chama é administrador ativo; retorna 403 caso não |
| 3. Política de acesso central | ✅ parcial | Matriz em `perfis_acesso`, aplicada por `app_tem_permissao` no banco e por `can()` no front |
| 4. Credenciais fora do código | ✅ | Nenhum `.env` versionado; nenhuma chave `eyJ…`/`service_role` em `src/`; `service_role` só na env da Edge Function |
| 4. Menor privilégio | ✅ parcial | `anon`/`authenticated` sem poder de escrita arbitrário; escalada de privilégio bloqueada por trigger |
| 5. Log de acesso indevido | ✅ parcial | `log_sistema` registra ações sensíveis; `auth_audit_logs` do Supabase registra login/token |

---

## 3. Achados novos (o que ainda está aberto)

### 🔴 S1 — Qualquer usuário autenticado pode apagar ou sobrescrever qualquer arquivo

As 8 policies de `storage.objects` só verificam `auth.role() = 'authenticated'`. Não há verificação
de dono nem de perfil:

```
"Usuários podem deletar seus próprios avatars" | DELETE | (bucket_id = 'avatars' AND auth.role() = 'authenticated')
"site-imagens delete autenticado"              | DELETE | (bucket_id = 'site-imagens' AND auth.role() = 'authenticated')
```

O nome da policy diz "seus próprios", mas a condição não restringe a nada. Um perfil **Diretor
(somente leitura)** pode apagar todas as fotos de materiais, o logo da empresa e todas as imagens do
site público. É o mesmo tipo de falha que corrigimos nas tabelas hoje — só que no Storage, que ficou
de fora.

### 🟠 S2 — Bucket `avatars` é público e recebe foto de pessoas

`avatars.public = true` → qualquer URL do bucket é legível sem login, para sempre. Hoje ele guarda
3 arquivos de baixa sensibilidade (2 fotos de material, 1 logo), mas
`uploadService.uploadUserAvatar()` grava `users/<id>.<ext>` **nesse mesmo bucket público**. Ou seja,
na primeira foto de pessoa cadastrada, ela passa a ser acessível por URL, sem autenticação.

### 🟠 S3 — Edge Function sem rate limit e com CORS liberado para qualquer origem

`supabase/functions/admin-usuarios/index.ts` é a única rota com poder real de escrita (cria usuário,
define senha, exclui usuário). Hoje:

- `Access-Control-Allow-Origin: *` — qualquer site pode chamá-la a partir do navegador de um admin logado;
- sem **nenhum** rate limit — um token de admin vazado permite enumerar/criar usuários à vontade;
- tentativas rejeitadas (401/403) não são registradas em lugar nenhum.

### 🟠 S4 — Nenhum cabeçalho de segurança na hospedagem

`vercel.json` tem apenas `rewrites`. Faltam `Content-Security-Policy`, `Strict-Transport-Security`,
`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` e `Permissions-Policy`. Sem eles, o
sistema pode ser embutido em iframe de terceiro (clickjacking) e o referrer vaza URLs internas.

### 🟠 S5 — Proteções de autenticação desligadas ou não verificadas

Confirmado pelo advisor: **proteção contra senha vazada está desativada**. Não consigo ler por SQL
(são configurações de painel) e precisam de verificação: comprimento mínimo de senha, CAPTCHA no
login, limites de taxa do Auth e expiração do JWT. Sem CAPTCHA e sem limite agressivo, `/auth/v1/token`
aceita tentativas de força bruta.

### 🟡 S6 — `anon` tem privilégio de tabela `SELECT` em 24 tabelas

A RLS bloqueia (testei: requisição anônima retorna `[]`), mas o privilégio continua concedido, o que
mantém as tabelas visíveis no schema GraphQL e deixa a segurança dependendo de **uma única** camada.
Defesa em profundidade: revogar `SELECT` de `anon` nas tabelas do almoxarifado, mantendo apenas as
`site_*` (que o site público precisa).

### 🟡 S7 — Acesso direto ao Postgres e allowlist de redirecionamento não verificáveis por SQL

O app não precisa de conexão direta ao banco (usa PostgREST), então conexões diretas podem ser
restritas por IP. Igualmente, a lista de *Redirect URLs* do Auth precisa conter só os domínios reais
— se incluir curinga ou `localhost` em produção, abre caminho para roubo de token. Ambos só se
verificam no painel.

### 🟡 S8 — Sessão sem expiração por inatividade

`persistSession: true` + `autoRefreshToken: true` mantêm a sessão viva indefinidamente. Num
computador compartilhado de almoxarifado, quem senta na máquina assume a sessão do anterior.

### 🟡 S9 — Política de acesso duplicada em dois lugares

A matriz existe no banco (`perfis_acesso`) e é espelhada no código (`PERFIS_PADRAO` e o fallback do
`PermissionsContext`). Divergir é questão de tempo: o banco pode liberar o que a tela esconde, ou o
contrário. Falta também um documento dizendo, por tabela/função/bucket, qual nível de acesso é
exigido — item 3.3 do plano.

### 🔵 S10 — Itens menores

- `confirm_user_email` ainda existe (já revogada de `anon`/`authenticated`); se não é usada, deve ser removida.
- Sem MFA/2FA para administradores, que podem excluir usuários e alterar permissões.
- Sem alerta de falhas de login em sequência — os dados existem em `auth_audit_logs`, mas ninguém olha.
- Falta `CHECK` no banco para `materiais_equipamentos.estoque_atual >= 0` e
  `movimentacao_estoque.quantidade > 0` (as quantidades de romaneio e solicitação já têm).

---

## 4. Plano de execução proposto

### Fase S1 — Storage (fecha S1 e S2)

1. Policies de `storage.objects` reescritas por bucket e por perfil:
   `site-imagens` exige `app_tem_permissao('configuracoes','update')` para escrever e apagar;
   `avatars` exige permissão no módulo correspondente (`materiais`/`colaboradores`), e cada usuário
   pode trocar a própria foto.
2. Bucket **novo e privado** `documentos` para fotos de pessoas e certificados de calibração, lido
   por URL assinada com validade curta; `uploadUserAvatar` passa a gravar nele.
3. `avatars` segue público apenas para fotos de material e logo (conteúdo não sensível).

### Fase S2 — Edge Function (fecha S3)

4. Allowlist de origem: `https://balimax.com.br` e `http://localhost:5173`, lidas de variável de
   ambiente; requisição de origem desconhecida recebe 403 e não ganha cabeçalho CORS.
5. Rate limit por IP **e** por usuário chamador, gravado numa tabela
   `seguranca_rate_limit` (ex.: 10 operações / 5 min, e 3 tentativas de senha / 5 min), retornando
   **429** com `Retry-After`.
6. Toda tentativa rejeitada (401/403/429) gravada em `log_sistema` com ação `seguranca.acesso_negado`,
   origem e IP — atende o item 5.3 do plano.

### Fase S3 — Hospedagem e sessão (fecha S4 e S8)

7. Cabeçalhos em `vercel.json`: CSP (permitindo apenas o próprio domínio, o Supabase e o Google
   Fonts), HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
   `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restritiva.
8. Expiração por inatividade no `AuthContext`: encerra a sessão após 30 min sem interação, com aviso
   um minuto antes.

### Fase S4 — Defesa em profundidade e documentação (fecha S6, S9, S10)

9. `revoke select on <tabelas do almoxarifado> from anon` (mantendo `site_*`).
10. Documento `docs/seguranca/politica-de-acesso.md`: tabela única com cada tabela, função e bucket,
    o nível exigido (público / autenticado / permissão X / administrador) e o motivo.
11. Teste automatizado comparando a matriz do banco com `PERFIS_PADRAO` do código, para que a
    divergência quebre o CI em vez de aparecer em produção.
12. `drop function confirm_user_email`; `CHECK` de estoque não negativo e quantidade positiva.

### Fase S5 — Ações no painel do Supabase (S5 e S7) — **exigem você**

Não são aplicáveis por código/SQL. Posso guiar clique a clique:

13. Ativar proteção contra senha vazada (HaveIBeenPwned).
14. Senha mínima de 10 caracteres com exigência de caracteres variados.
15. Ativar CAPTCHA (hCaptcha ou Turnstile) no login e no cadastro.
16. Revisar os limites de taxa do Auth (tentativas de login/hora por IP).
17. Conferir *Site URL* e *Redirect URLs*: só `https://balimax.com.br/sistema` (e localhost apenas em dev).
18. Restringir conexões diretas ao Postgres por IP (Network Restrictions), já que o app não as usa.
19. Habilitar MFA/TOTP e exigir dos administradores.

---

## 5. Ordem recomendada

S1 → S2 → S3 → S4, e a S5 em paralelo, por você no painel.
A Fase S1 é a mais urgente: é o mesmo tipo de falha corrigida hoje nas tabelas, ainda aberta no Storage.

## 6. Decisões necessárias

1. **Fotos de pessoas**: criar o bucket privado `documentos` com URL assinada (recomendado) ou manter
   tudo no bucket público?
2. **Origens permitidas**: além de `balimax.com.br` e `localhost:5173`, existe algum domínio de
   homologação/preview do Vercel que precise chamar a Edge Function?
3. **Expiração de sessão**: 30 minutos de inatividade serve, ou prefere outro tempo (ou nenhum)?
4. **CSP**: posso aplicar direto — mas, se houver script de terceiro no site público (analytics,
   pixel, chat), preciso saber para não bloquear.

## 7. Como verificar depois

```bash
# cabeçalhos de segurança em produção
curl -sI https://balimax.com.br/sistema | grep -iE "content-security|strict-transport|x-frame|referrer"

# rate limit da Edge Function (espera 429 a partir de certa repetição)
for i in $(seq 1 15); do curl -s -o /dev/null -w "%{http_code} " -X POST \
  https://dqxrpsjalsmoyconcurz.supabase.co/functions/v1/admin-usuarios; done

# CORS de origem não autorizada (espera 403, sem cabeçalho CORS)
curl -si -X OPTIONS https://dqxrpsjalsmoyconcurz.supabase.co/functions/v1/admin-usuarios \
  -H "Origin: https://site-malicioso.com" | head -5
```

No banco: `storage.objects` sem policy genérica de `authenticated`; `has_table_privilege('anon', …)`
falso para as tabelas do almoxarifado; advisor de segurança sem itens de nível ERROR.


---

## 8. Execução — 05/10/2026

| Item | Status | Verificação |
|---|---|---|
| S1 — Storage por perfil | ✅ | 8 policies permissivas trocadas por 11 por bucket/pasta/ação. Testado: Gerente não apaga nada e não escreve em `site-imagens`; Almoxarife escreve em `materiais/` mas não apaga; anônimo lê `avatars` (público) e não lê `documentos` (0 linhas) |
| S2 — Bucket privado `documentos` | ✅ | Criado com `public=false`, 10 MB, imagens + PDF. `uploadUserAvatar` nunca foi usado pelo app (só logo de empresa), então não havia foto de pessoa em bucket público |
| S3 — CORS allowlist na Edge Function | ✅ | Origem `site-malicioso.com` → **403 sem cabeçalho CORS**; `localhost:5173` → 200 com `Vary: Origin` |
| S3 — Rate limit | ✅ | Tabela `seguranca_rate_limit` (sem acesso pela API). 30/5min por IP; create e delete 10/5min; reset_password 5/5min; resposta **429** com `Retry-After` |
| S3 — Log de tentativas negadas | ✅ | 4 registros `seguranca.acesso_negado` gravados com motivo, origem e IP durante os testes; aparecem na aba Auditoria |
| S4 — Cabeçalhos de segurança | ✅ | `vercel.json`: HSTS, nosniff, Referrer-Policy, Permissions-Policy, COOP e X-Frame-Options no domínio; CSP + `X-Frame-Options: DENY` em `/sistema/*` |
| S8 — Sessão por inatividade | ✅ | 30 min em `AuthContext` (`INATIVIDADE_MAXIMA_MS`), com aviso ao encerrar |
| S6 — `anon` sem SELECT | ✅ | 20 tabelas revogadas. Requisição anônima agora retorna **42501 permission denied** em vez de `[]`. Exposição anônima no advisor caiu de 24 para 4 tabelas (só `site_*`) |
| S9 — Política documentada | ✅ | `docs/seguranca/politica-de-acesso.md` |
| S10 — `confirm_user_email` | ✅ | Função removida |
| S10 — Integridade de estoque | ✅ | `estoque_atual >= 0`, `estoque_minimo >= 0` e coerência de sinal em `movimentacao_estoque` |
| S5/S7 — Painel do Supabase | ⏳ **pendente** | 7 itens listados em `politica-de-acesso.md` |

### Desvios do plano, com motivo

1. **Teste automatizado comparando banco × código (item 11 do PRD).** Não implementado: com o
   `anon` corretamente sem acesso a `perfis_acesso`, o teste precisaria de credenciais de usuário no
   CI. Em vez disso, o banco é a fonte única em runtime (o código só guarda o padrão de fábrica) e
   os testes existentes validam a coerência interna de `PERFIS_PADRAO`.
2. **CSP não cobre o site institucional.** Ele carrega `cdn.tailwindcss.com`, Unsplash e scripts
   inline; aplicar a política o quebraria. A CSP vale em `/sistema/*`, onde controlamos tudo.
3. **`script-src` mantém `'unsafe-inline'`** em `/sistema`: a impressão de romaneios abre uma janela
   e escreve o documento inline. Endurecer exige refazer esses 4 fluxos de impressão.
4. **Convenção de sinal do estoque.** A regra proposta (`quantidade > 0`) foi rejeitada pelos dados:
   as 4 saídas existentes são **negativas** e as 70 entradas positivas. A constraint final codifica
   essa convenção em vez de reescrever histórico.
5. **`seguranca_rate_limit` aparece no advisor** como "RLS ativa sem policy" (nível INFO). É
   intencional: a tabela não deve ser acessível pela API, apenas pela Edge Function.
