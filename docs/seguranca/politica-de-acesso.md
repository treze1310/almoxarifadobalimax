# Política de acesso — superfície exposta na internet

Atualizado em 05/10/2026. Este é o documento de referência do item 3.3 do
`Plano mínimo de segurança`: diz, para cada recurso exposto, qual nível de acesso é exigido.

**Fonte da verdade das permissões é o banco**, na tabela `perfis_acesso`, editável em
Configurações → Perfis de Acesso. O código (`PERFIS_PADRAO` em `src/types/perfil.ts`) contém apenas
o valor de fábrica usado no seed e no botão "Restaurar padrão".

## Como a autorização funciona

```
Navegador (chave anon, pública)
   │  JWT do usuário logado
   ▼
PostgREST /rest/v1/<tabela>        Edge Function /functions/v1/admin-usuarios
   │  RLS no Postgres                 │  revalida admin no servidor (service_role)
   ▼                                  ▼
public.app_tem_permissao(modulo, acao) ──► perfis_acesso.permissoes (JSONB)
```

Três camadas, nesta ordem:

1. **Privilégio de tabela** — `anon` não tem `SELECT` nas tabelas do almoxarifado (erro 42501).
2. **RLS** — policy por operação, consultando o perfil de acesso do usuário.
3. **Trigger** — `usuarios` bloqueia alteração de `perfil`, `perfil_acesso_id` e `ativo` por quem não
   é administrador.

Usuário **sem perfil vinculado** cai em somente leitura dos módulos operacionais; nunca acessa
`usuarios` nem `configuracoes`.

## Tabelas

| Tabela | Público (anon) | Autenticado | Módulo que governa |
|---|---|---|---|
| `site_config`, `site_imagens`, `site_parceiros`, `site_portfolio` | **leitura** (site institucional) | escrita exige `configuracoes.update` | `configuracoes` |
| `materiais_equipamentos`, `categorias` | — | por operação | `materiais` |
| `movimentacao_estoque` | — | por operação | `estoque` |
| `epi_atribuicoes` | — | por operação | `epi` |
| `romaneios`, `romaneios_itens` | — | por operação | `romaneios` |
| `solicitacoes`, `solicitacoes_itens` | — | por operação | `solicitacoes` |
| `empresas` / `fornecedores` / `colaboradores` / `centros_custo` / `marcas` / `localizacao` | — | por operação | módulo homônimo |
| `nfe_importacao`, `nfe_itens` | — | por operação | `nfe` |
| `usuarios` | — | lê o próprio registro sempre; os demais exigem `usuarios.read`; colunas sensíveis só por admin | `usuarios` |
| `usuarios_perfis` | — | leitura com `usuarios.read`; escrita só admin | `usuarios` |
| `perfis_acesso` | — | leitura para qualquer autenticado; escrita só admin | `configuracoes` |
| `log_sistema` | — | **append-only**: insere qualquer autenticado; lê com `usuarios.read`; ninguém altera ou apaga | `usuarios` |
| `seguranca_rate_limit` | — | **nenhum acesso** (só a Edge Function, via `service_role`) | — |
| `_backup_almoxarifado_20261005` | — | **nenhum acesso** | — |

> Crítico: `usuarios`, `perfis_acesso` e `log_sistema`. Mudança indevida nelas compromete todo o
> controle de acesso ou apaga o rastro de quem fez o quê.

## Buckets de Storage

| Bucket | Visibilidade | Escrita |
|---|---|---|
| `avatars` | **pública** (foto de material e logo de empresa — conteúdo não sensível) | `materiais/` exige `materiais.update`; `companies/` exige `empresas.update`; exclusão exige o `delete` do módulo |
| `site-imagens` | **pública** (site institucional) | exige `configuracoes.update` |
| `documentos` | **privada**, só por URL assinada | `colaboradores/` ↔ módulo `colaboradores`; `calibracao/` ↔ `materiais`; `users/<id>` só o próprio usuário |

Nenhum dado pessoal deve ir para `avatars` ou `site-imagens` — fotos de pessoas e certificados vão
para `documentos`.

## Funções e endpoints

| Recurso | Quem pode chamar |
|---|---|
| `/functions/v1/admin-usuarios` | Gateway exige JWT; a função exige **administrador ativo**; origem precisa estar na allowlist; rate limit por IP (30/5min) e por ação (create e delete 10/5min, reset_password 5/5min) |
| `app_tem_permissao`, `app_eh_admin`, `app_usuario_id` | `authenticated` (só informam as permissões de quem chama) |
| `get_materiais_count_by_localizacao` | `authenticated` |
| `seguranca_limpar_rate_limit`, `usuarios_protege_colunas_sensiveis` | nenhum papel da API (internas) |

## Cabeçalhos HTTP (Vercel)

Todo o domínio recebe HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` e
`X-Frame-Options: SAMEORIGIN`. Em `/sistema/*` há CSP restritiva e `X-Frame-Options: DENY`.

A CSP **não** é aplicada ao site institucional porque ele carrega CDNs (`cdn.tailwindcss.com`,
Unsplash) e seria quebrado. Em `/sistema` o `script-src` ainda permite `'unsafe-inline'`: a impressão
de romaneios abre uma janela e escreve o documento inline. Remover isso exige refazer esse fluxo.

## Como ajustar no futuro

- **Permissão de um perfil**: Configurações → Perfis de Acesso. Vale imediatamente no banco.
- **Novo módulo**: adicione em `MODULOS_SISTEMA` (`src/types/perfil.ts`), crie as 4 policies da nova
  tabela usando `app_tem_permissao('<modulo>', '<acao>')` e registre aqui.
- **Limites de taxa**: constante `LIMITES` em `supabase/functions/admin-usuarios/index.ts`.
- **Origens permitidas**: variável de ambiente `ORIGENS_PERMITIDAS` da Edge Function (lista separada
  por vírgula). Sem ela, o padrão é `balimax.com.br`, `www.balimax.com.br` e `localhost:5173`.
- **Tempo de sessão**: `INATIVIDADE_MAXIMA_MS` em `src/contexts/AuthContext.tsx` (hoje 30 min).

## Pendente — só pelo painel do Supabase

1. Proteção contra senha vazada (HaveIBeenPwned) — **está desativada**.
2. Senha mínima de 10 caracteres com variedade de caracteres.
3. CAPTCHA no login (hCaptcha ou Turnstile).
4. Revisar limites de taxa do Auth.
5. *Site URL* e *Redirect URLs* restritos a `https://balimax.com.br/sistema`.
6. Network Restrictions: bloquear conexão direta ao Postgres (o app não usa).
7. MFA/TOTP obrigatório para administradores.
