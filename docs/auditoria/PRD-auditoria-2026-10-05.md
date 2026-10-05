# PRD — Auditoria do Sistema de Almoxarifado (05/10/2026)

Projeto: `10 - SITE BALIMAX + ALMOX` · Branch `main` · Supabase `dqxrpsjalsmoyconcurz`

Todas as afirmações abaixo foram verificadas empiricamente (comandos executados, consultas ao
banco, requisições HTTP). Nada foi deduzido de documentação.

---

## 1. O que o sistema é, de fato

| Dimensão | Evidência |
|---|---|
| Stack | Vite 7 + React 18 + TypeScript, Tailwind + shadcn/ui (Radix), React Router 6, React Hook Form + Zod, Recharts, jsPDF |
| Backend | Supabase (PostgreSQL + Auth + Edge Functions). Sem servidor próprio, sem Docker, sem fila |
| Cliente | `src/lib/supabase.ts` — schema `public`, PKCE, sessão persistida |
| Tamanho | 47.581 linhas em `src/` (TS/TSX), 55 dependências de produção |
| Banco | 24 tabelas em `public` (~858 linhas) + **19 tabelas órfãs no schema `almoxarifado`** (~34 linhas) |
| Dados | Reais, não mockados: 78 materiais ativos, 62 colaboradores, 5 romaneios, 6 solicitações, 12 usuários. Nenhum `mockData`/`faker` no código |
| Edge Functions | 1 (`admin-usuarios`, criada nesta sessão) |
| CI/CD | Nenhum workflow de CI no repositório |
| Build | `vite build` ✅ passa · `tsc --noEmit` ✅ limpo |
| Testes | 1 arquivo (`tests/app.test.tsx`), **falhando** |
| Lint | 2 erros, 158 avisos |
| Segredos | Nenhum `.env` versionado; nenhuma `service_role` no frontend ✅ |

---

## 2. Achados por severidade

### 🔴 P0 — Crítico

**P0.1 — Qualquer usuário autenticado pode escrever em qualquer tabela (inclusive escalar o próprio perfil para Administrador)**

Evidência (`pg_policies`): 19 das 24 tabelas de `public` têm uma policy `FOR ALL ... USING (true)`
para o papel `authenticated`. Exemplo em `usuarios`:

```
allow_authenticated_write_usuarios | ALL | roles {authenticated} | qual: true
```

Consequência: o controle de perfis implementado é **apenas de interface**. Um usuário com perfil
Diretor (somente leitura) pode, via API REST com o próprio token, executar
`PATCH /usuarios?id=eq.<seu-id>` definindo `perfil='administrador'`, ou apagar materiais,
romaneios e solicitações. O botão escondido na tela não protege o dado.

**P0.2 — Schema `almoxarifado` com policies e RLS desligado**

Advisor de segurança, nível ERROR: `almoxarifado.usuarios`, `almoxarifado.colaboradores` e
`almoxarifado.perfis_acesso` têm policies criadas mas **RLS desativado** — ou seja, as policies não
são aplicadas. O schema não é usado pelo app (o cliente aponta para `public`; nenhuma referência a
`almoxarifado` em `src/`), mas está no projeto e suas tabelas contêm resíduo de dados.

### 🟠 P1 — Alto

**P1.1 — `perfis_acesso` legível sem login.** Verificado com requisição anônima real: a matriz
completa de permissões volta com a chave anon, sem autenticação (as outras tabelas retornaram `[]`,
corretamente bloqueadas pela RLS). Expõe a estrutura de papéis do sistema.

**P1.2 — Sem trilha de auditoria.** A tabela `log_sistema` existe mas aparece **apenas** em
`src/types/database.ts` — nada escreve nela. Não há registro de quem aprovou, concluiu, movimentou
estoque ou excluiu.

**P1.3 — Sem Error Boundary.** `grep` por `ErrorBoundary|componentDidCatch` em `src/`: zero
resultados. Um erro de render em qualquer tela derruba o app para tela branca, sem mensagem.

**P1.4 — Duas funções `SECURITY DEFINER` executáveis por anônimos.**
`public.confirm_user_email(text)` e `public.update_user_last_access(uuid)` são chamáveis via
`/rest/v1/rpc/...` pelo papel `anon`. A primeira confirma e-mail de usuário sem autenticação.

**P1.5 — 34 vulnerabilidades em dependências** (`npm audit`): 3 críticas, 24 altas.
Em produção o que importa é `react-router-dom` (XSS via open redirect) e `jspdf`
(DoS / path traversal). As demais (vitest, happy-dom, eslint, tailwind) são de desenvolvimento.

### 🟡 P2 — Médio

**P2.1 — Teste único quebrado.** `tests/app.test.tsx` falha: renderiza `<App/>` e espera conteúdo
síncrono, mas as rotas usam `lazy` + `Suspense`, então o container nasce vazio. Resultado: `npm test`
vermelho, sem nenhuma cobertura real.

**P2.2 — 2 erros de lint.** `pages/localizacao/Localizacao.tsx:102` usa `hasOwnProperty` direto do
objeto; `services/ncmService.tsx` não está incluído no `tsconfig` e por isso nem é analisado pelo
ESLint (nem pelo type-check).

**P2.3 — Código morto no repositório.** 4 componentes nunca importados
(`TestDialog.tsx`, `ColaboradorDialog.tsx`, `ColaboradorEditDialog.tsx`,
`ColaboradorDetailsDialogSimple.tsx`), 1 arquivo `.backup` versionado
(`NovaSolicitacao.tsx.backup`) e `services/testMovimentacao.ts` com 2 UUIDs de produção
chumbados no código.

**P2.4 — 153 `console.log` em produção.** Inclui log do cliente Supabase e do GoTrue em modo debug.
Vaza estrutura interna no console do navegador do usuário.

**P2.5 — 180 anotações `: any`** e 128 avisos de variável não usada. O `as any` foi exatamente o que
escondeu o bug de `centro_custo.nome` corrigido hoje — o tipo existia e estava certo.

**P2.6 — ~~Conclusão de solicitação não movimenta estoque~~ — NÃO É DEFEITO (decidido em 05/10).**
A solicitação de compra é apenas um pedido para comprar; ela nunca gera saída. A entrada no estoque
acontece na importação do XML da NF-e. O comportamento atual (concluir só muda o status) está
correto e **não será alterado**. Registrado aqui para não ser levantado de novo em auditoria futura.

### 🔵 P3 — Baixo / melhoria

- **P3.1** — 48 chaves estrangeiras sem índice de cobertura e 57 índices nunca usados (maioria no
  schema morto `almoxarifado`).
- **P3.2** — 12 policies reavaliam `auth.<função>()` por linha (`auth_rls_initplan`); custo cresce
  com o volume. Corrige-se com `(select auth.uid())`.
- **P3.3** — Bundle: `pdf` 528 KB e `charts` 236 KB carregam fora de demanda em algumas rotas.
- **P3.4** — 10 arquivos acima de 600 linhas (`reportService.ts` com 2.887; três páginas acima de
  1.000). Dificulta manutenção e revisão.
- **P3.5** — 59 de 62 colaboradores sem empresa e 75 de 78 materiais sem localização definida —
  dado operacional incompleto, não defeito de código.
- **P3.6** — Sem CI: nada garante que `build`, `tsc`, `lint` e `test` passem antes de um deploy.
- **P3.7** — Proteção contra senha vazada (HaveIBeenPwned) desativada no Supabase Auth.
- **P3.8** — `caniuse-lite` com 15 meses de atraso.

---

## 3. Plano de execução proposto

Cada fase é independente e verificável. Estimativas são de execução minha, não de calendário.

### Fase 1 — Fechar o buraco de autorização (P0.1, P0.2, P1.1, P1.4)

1. Criar no banco as funções auxiliares `app_usuario_atual()`, `app_tem_permissao(modulo, acao)` e
   `app_eh_admin()`, lendo de `usuarios` + `perfis_acesso`, com `SECURITY DEFINER`,
   `search_path` fixo e `(select auth.uid())`.
2. Substituir as 19 policies `ALL USING (true)` por policies por operação, ancoradas no perfil de
   acesso: `SELECT` exige `read`; `INSERT` exige `create`; `UPDATE` exige `update`;
   `DELETE` exige `delete`. Assim a matriz de Configurações passa a valer no banco, não só na tela.
3. `usuarios`: leitura do próprio registro para todos; alteração de `perfil`, `perfil_acesso_id` e
   `ativo` **somente** para administrador. Fecha a escalada de privilégio.
4. `perfis_acesso`: revogar leitura do papel `anon` (mantém para `authenticated`).
5. Revogar `EXECUTE` de `anon` em `confirm_user_email` e `update_user_last_access`; fixar
   `search_path` nas 12 funções apontadas pelo advisor.
6. Remover o schema `almoxarifado` — **aprovado em 05/10**: dump prévio salvo em
   `docs/auditoria/` e remoção em migração separada, revertível.

> Risco: alto se errado — policy restritiva demais trava o uso. Mitigação: aplico por tabela,
> conferindo cada etapa com consultas de verificação, e o perfil Administrador é liberado primeiro.
> Recomendo testar logado como Almoxarife antes de seguir para a fase 2.

### Fase 2 — Robustez e rastreabilidade (P1.2, P1.3, P2.1, P2.2, P2.6)

7. `ErrorBoundary` global com tela de erro amigável e botão de recarregar.
8. Trilha de auditoria: gravar em `log_sistema` as ações sensíveis (aprovar, rejeitar, concluir,
   cancelar, excluir, movimentar estoque, alterar perfil de usuário) com usuário, ação, tabela,
   registro e timestamp. Inclui policy de escrita e leitura restrita a quem tem `usuarios.read`.
9. Corrigir `tests/app.test.tsx` (render assíncrono) e adicionar testes de unidade para o que já deu
   problema: `statusParaBanco`, `verificarStatusCalibracao` e a avaliação de permissões (`can`).
10. Zerar os 2 erros de lint e incluir `services/ncmService.tsx` no `tsconfig`.
11. ~~Baixa de estoque na conclusão da solicitação~~ — **descartado**, ver P2.6.

### Fase 3 — Dependências e higiene (P1.5, P2.3, P2.4, P2.5 parcial)

12. Atualizar `react-router-dom` e `jspdf` (as duas que afetam produção), rodar `build` + `tsc` e
    conferir as rotas e a geração de PDF. Demais pacotes de dev em seguida.
13. Remover os 4 componentes órfãos, o `.backup` versionado e `testMovimentacao.ts` com UUIDs reais.
14. Trocar os `console.log` por um utilitário `logger` ativo só em desenvolvimento, e desligar o
    `debug` do GoTrue em produção.

### Fase 4 — Performance e processo (P3.1, P3.2, P3.3, P3.6, P3.7, P3.8)

15. Índices nas FKs realmente usadas de `public`; descartar índices não usados do schema morto.
16. Reescrever as policies com `(select auth.uid())`.
17. Carregar `jspdf` e `recharts` sob demanda nas rotas que os usam.
18. Workflow de CI no GitHub Actions: `tsc --noEmit`, `lint`, `test`, `build` em cada push.
19. Ativar proteção de senha vazada no Supabase Auth e atualizar `caniuse-lite`.

### Fora de escopo nesta rodada

- Refatorar os arquivos de 1.000+ linhas (P3.4): alto risco de regressão, benefício só de
  manutenção. Proponho fazer por tela, sob demanda.
- Eliminar os 180 `: any` em massa (P2.5): faço nos arquivos que eu tocar nas fases acima.
- Preencher empresa dos colaboradores e localização dos materiais (P3.5): é dado operacional, seu.

---

## 4. Ordem recomendada

Fase 1 → testar com um usuário não-admin → Fase 2 → Fase 3 → Fase 4.
A Fase 1 é a única que muda o comportamento do banco e merece validação sua antes de seguir.

## 5. Decisões — status

| # | Questão | Decisão (05/10/2026) |
|---|---|---|
| 1 | Baixa de estoque ao concluir solicitação | **Não.** Solicitação de compra é só o pedido de compra — é entrada, nunca saída. A entrada no estoque ocorre na importação do XML da NF-e. Comportamento atual mantido |
| 2 | Schema `almoxarifado` | **Remover**, com dump prévio e migração reversível |
| 3 | Perfis antigos (`Solicitante`, `Supervisor`, `Visualizador`) | **Pendente** — hoje estão inativos; remover de vez ou manter desativados? |

### Autorização de execução

**Executado em 05/10/2026** após aprovação. Resumo do que foi aplicado e verificado:

| Item | Status | Verificação |
|---|---|---|
| 1–5. Autorização no banco (P0.1, P1.1, P1.4) | ✅ | 70 policies ancoradas em `app_tem_permissao`; 0 policies `USING(true)`; escalada de privilégio bloqueada por trigger; testado simulando Administrador, Almoxarife, Gerente e usuário sem perfil |
| 6. Remoção do schema `almoxarifado` (P0.2) | ✅ | Backup completo em `public._backup_almoxarifado_20261005` (19 tabelas, 201 colunas, 55 índices, 41 linhas) antes do `drop schema cascade` |
| 7. Error Boundary (P1.3) | ✅ | `src/components/ErrorBoundary.tsx`, ligado no `App.tsx` |
| 8. Trilha de auditoria (P1.2) | ✅ | `auditoriaService.ts` + aba Configurações → Auditoria; `log_sistema` é append-only (UPDATE/DELETE bloqueados por policy, testado) |
| 9. Testes (P2.1) | ✅ | 14 testes passando (antes: 1 falhando). Inclui regressão do status acentuado e da matriz de perfis |
| 10. Erros de lint (P2.2) | ✅ | 0 erros (antes: 2). Descoberta: `ncmService` existia em `.ts` **e** `.tsx` — o `.tsx` era duplicata morta |
| 12. Atualização de dependências (P1.5) | ❌ **bloqueado** | Ver "Pendências" abaixo |
| 13. Código morto (P2.3) | ✅ | 7 arquivos removidos |
| 14. `console.log` em produção (P2.4) | ✅ | Silenciados em runtime no `main.tsx`; `console.warn`/`error` preservados |
| 15. Índices de FK (P3.1) | ✅ | 26 índices criados |
| 16. `auth.uid()` por linha (P3.2) | ✅ | As funções novas usam `(select auth.uid())` |
| 17. Lazy-load de PDF/gráficos (P3.3) | ❌ não feito | Deixado para uma rodada de performance dedicada |
| 18. CI (P3.6) | ✅ | `.github/workflows/ci.yml` |
| 19. Senha vazada / caniuse (P3.7, P3.8) | ❌ não feito | Ver "Pendências" |

### Pendências que exigem decisão sua

1. **Dependências (P1.5).** As duas vulnerabilidades que afetam produção exigem **major upgrade**:
   `react-router-dom` 6.30 → 7.x e `jspdf` 3.0 → 4.x. Ambas quebram API (rotas e geração de PDF) e
   precisam de teste manual. Além disso, o repositório tem **três lockfiles** convivendo
   (`pnpm-lock.yaml`, `package-lock.json`, `bun.lockb`), e o `.npmrc` indica pnpm — atualizar por um
   gerenciador criaria divergência nos outros. Decisão necessária: qual gerenciador é o oficial
   (sugiro pnpm, e apagar os outros dois lockfiles) antes de subir as versões.
2. **Proteção contra senha vazada (P3.7).** É uma configuração do painel do Supabase
   (Authentication → Policies), não aplicável por SQL. Precisa ser ligada por você.
3. **Perfis antigos** (`Solicitante`, `Supervisor`, `Visualizador`): seguem inativos, nenhum usuário
   vinculado. Remover de vez ou manter?

### Observação registrada durante a execução

Às 11:52 de 05/10/2026 a Edge Function `admin-usuarios` foi chamada (POST → 200) da sessão de
`christianmateus2014@gmail.com` e três usuários deixaram de existir: `JUNIO BARBOSA DA SILVA`
(que estava inativo), `Teste Credenciais` e `Usuário Teste Login`. Confirmado nos logs do Supabase
que a origem foi uso da tela nova de Usuários, não as migrações desta auditoria.

---

## 6. Anexos — como reproduzir

```bash
npx tsc --noEmit                 # type-check
npx eslint src                   # 2 erros, 158 avisos
npx vitest --run                 # 1 teste, falhando
npm audit                        # 34 vulnerabilidades
npx vite build                   # build de produção
```

Consultas de banco usadas (via MCP Supabase): `pg_policies`, `pg_class.relrowsecurity`,
`pg_constraint`, `information_schema.columns`, advisors de segurança e performance.
