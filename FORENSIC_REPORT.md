# RELATÓRIO DE AUDITORIA FORENSE — DESCOBERTA TOTAL (Sem Premissas)

**Sistema:** sistema-de-almoxarifado
**Data da auditoria:** 2026-05-29
**Metodologia:** Zero Assumptions Discovery — conclusões baseadas exclusivamente em evidências coletadas nesta sessão.
**Observação:** Este relatório **supersede** o `FORENSIC_AUDIT_REPORT.md` (25/08/2025), cujas conclusões sobre dados de produção **não se confirmam** no estado atual (ver §3).

---

## RESUMO EXECUTIVO

- O código é um SPA real. **Auditoria inicial: `tsc --noEmit` falhava com 191 erros de tipo** (o build só publicava porque `vite build` transpila sem checar tipos). Esses 191 erros foram corrigidos nesta sessão → `tsc --noEmit` agora retorna **exit 0**.
- **O banco de dados ligado está VAZIO** (23 tabelas, 0 linhas). O relatório anterior media um **projeto Supabase diferente**.
- **Postura de segurança fraca**: 3 advisors `ERROR` + 88 `WARN`; 23 políticas RLS são `true` (acesso aberto); `.env` está **versionado no git**.
- Repositório **poluído**: backups de produção, artefatos de auditoria anterior, site estático estranho e arquivos-lixo misturados ao código-fonte.

**Veredito:** Código funcional e organizado, mas o repositório e a infraestrutura estão em estado de higiene crítico. **Não é possível confirmar "produção" pelo projeto ligado** — ele está zerado.

---

## 1. STACK TECNOLÓGICO (confirmado por `package.json` + arquivos)

**Frontend**
- React 19.1.1, React DOM 19.1.1
- TypeScript 5.8.3
- Vite via `rolldown-vite@7.0.12` (build), plugins `@vitejs/plugin-react-swc` e `-oxc`
- Tailwind CSS 3.4.17 + Radix UI (≈30 pacotes) + shadcn-style `src/components/ui/`
- react-router-dom 6.30.1
- react-hook-form 7.61 + zod 3.25 (`@hookform/resolvers`)
- recharts 3.1 (gráficos), jsPDF 3 + html2canvas + react-to-print (geração de PDF)
- date-fns 4, lucide-react, sonner (toasts), next-themes

**Backend / Dados**
- Supabase (`@supabase/supabase-js` 2.53) → PostgreSQL gerenciado
- Sem container, sem servidor próprio (BaaS / JAMstack)

**Tooling**
- ESLint 9 + typescript-eslint 8, Prettier 3.6
- Vitest 3.2 + happy-dom + @testing-library/react
- Deploy: Vercel (`vercel.json` presente)

---

## 2. ARQUITETURA E SUPERFÍCIE DA APLICAÇÃO

**Módulos (por `src/pages/`, 24 arquivos):** Dashboard, Romaneios (+ novo), NF-e (importação/histórico), Materiais & Equipamentos, Solicitações (+ nova/print), Cadastros (Colaboradores, Empresas, Fornecedores, Centros de Custo, Marcas, Localização), Localização (+ Mapa), Relatórios, EPI, Login, Profile.

**Serviços (`src/services/`, 16):** estoque, devolução (+ itens), NF-e import, centroCusto, company, código/numeração de romaneio, NCM, EPI, colaboradorMateriais, materialDependency, upload, report, pdf.

**Rotas (`src/App.tsx`) — BUGS encontrados:**
- `path="\cadastros\colaboradores:id/ficha"` → usa **barras invertidas (Windows)**; rota nunca casa em URL real.
- `path="romaneios:id"` e `path="solicitacoes:id/print"` → falta `/` antes de `:id`; **rotas dinâmicas quebradas** (deveriam ser `romaneios/:id`, `solicitacoes/:id/print`).
- Página `src/pages/epi/EPIGerenciamento.tsx` existe, mas **não há rota** mapeada → página órfã/inacessível. `Profile.tsx` idem (sem rota explícita listada).

---

## 3. ESTADO DOS DADOS — MOCK vs REAL (evidência direta via Supabase)

Projeto ligado: `dqxrpsjalsmoyconcurz` (`supabase/.temp/project-ref`).

**Resultado de `list_tables(public)`: 23 tabelas, TODAS com 0 linhas.**

| Categoria | Tabelas | Linhas |
|---|---|---|
| Almoxarifado (19) | centros_custo, colaboradores, empresas, epi_atribuicoes, fornecedores, localizacao, log_sistema, marcas, materiais_equipamentos, movimentacao_estoque, nfe_importacao, nfe_itens, perfis_acesso, romaneios, romaneios_itens, solicitacoes, solicitacoes_itens, usuarios, usuarios_perfis | **0** |
| Site/CMS (4) | site_config, site_imagens, site_parceiros, site_portfolio | **0** |

**Contradição com o relatório anterior:** o relatório de 25/08/2025 afirma "314 empresas, 61 colaboradores, 814+ registros — PRODUÇÃO REAL". Essas contagens pertenciam ao projeto **`emcyvosymdelzxrokdvf`** (nome do dump em `banco de dados/emcyvosymdelzxrokdvf.storage`). O projeto **atualmente ligado é outro e está zerado**. Houve troca de projeto Supabase; os dados de produção existem apenas no backup local, não no projeto ligado.

**Tabelas `site_*`** indicam que um **CMS de site institucional** foi acoplado ao app de almoxarifado (correlaciona com os HTMLs estranhos — ver §6).

---

## 4. SEGURANÇA (Supabase advisors — 3 ERROR, 88 WARN)

| Severidade | Achado | Qtd |
|---|---|---|
| ERROR | Policy Exists RLS Disabled (políticas existem mas RLS desligado → não aplicadas) | 3 |
| WARN | **RLS Policy Always True** (política `USING (true)` → acesso aberto a qualquer um com a anon key) | 23 |
| WARN | Signed-In / Public Can See Object in GraphQL Schema (exposição de schema) | 46 |
| WARN | Function Search Path Mutable (funções sem `search_path` fixo) | 12 |
| WARN | Public/Signed-In Can Execute SECURITY DEFINER Function | 4 |
| WARN | Public Bucket Allows Listing (buckets de storage listáveis publicamente) | 2 |
| WARN | Leaked Password Protection Disabled (auth) | 1 |

**Interpretação:** RLS está "ativado" nas tabelas, mas as políticas são permissivas (`true`), o que anula a proteção. Hoje o risco de dados é baixo porque o banco está vazio — mas **assim que for populado, todo o conteúdo fica legível/gravável** por qualquer portador da anon key (que vai embutida no bundle do frontend por design).

**`.env` versionado:** `git ls-files .env` retorna `.env` → o arquivo está **comitado no histórico**, apesar de constar no `.gitignore` (o gitignore não remove o que já está rastreado). Contém `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. A anon key é pública por natureza, mas **não deve ser versionada**; a URL+key no histórico facilita abuso quando combinada com as políticas `true` acima.

> Remediação RLS: https://supabase.com/docs/guides/database/database-advisors

---

## 5. INTEGRIDADE / BUILD / TESTES

- **Typecheck:** `tsc -p tsconfig.app.json --noEmit` → **exit 0** (sem erros de tipo). ✔
- **Migrations versionadas:** apenas **2 arquivos** (`migrations/001_create_users_and_profiles.sql`, `002_update_material_equipamento_form.sql`) para **23 tabelas reais** → **o schema NÃO está versionado**. `supabase/` contém só `.temp/` (sem `config.toml` nem `migrations/`). `banco de dados/esquuema.txt` (724 KB) é um dump ad-hoc, não uma fonte de verdade reproduzível.
- **Testes:** diretório `tests/` existe; cobertura historicamente baixa (1 teste no relatório anterior). Não re-executado nesta sessão.
- **Gerenciador de pacotes ambíguo:** coexistem `bun.lockb`, `package-lock.json` e `pnpm-workspace.yaml`, enquanto `scripts.start` chama `pnpm`. **Três gerenciadores** → builds não determinísticos entre ambientes.

---

## 6. HIGIENE DO REPOSITÓRIO — ACHADOS CRÍTICOS

**6.1 Dados de produção soltos na árvore de trabalho** (`banco de dados/`, ~2,4 MB, não rastreado):
- `db_cluster-05-09-2025@04-35-43.backup` (712K) + `.gz` (132K) → **dump completo do banco**
- `emcyvosymdelzxrokdvf.storage` (460K) + `.zip` (428K) → dump do storage do **projeto antigo**
- `esquuema.txt` (724K), `dados.txt` (vazio), `Sem título.png`
- **Risco:** um `git add -A` acidental vaza backup de produção. Pasta deve ir para fora do repo ou para `.gitignore`.

**6.2 Artefatos de auditoria anterior FORAM COMITADOS** (commit `d1b6e1d`):
`FORENSIC_AUDIT_REPORT.md`, `discovery_report.md`, `code_discovery.md`, `data_reality_check.md`, `endpoints_discovery.md`, `integrity_check.md`, `architecture_discovery.md`, `directories.txt` — lixo de execução anterior (estilo Linux/Docker) misturado ao código.

**6.3 Arquivo-lixo `tatus` STAGED:** `git status` mostra `A tatus`. Conteúdo = saída colorida de `git log` → redirecionamento errado (`git log ... > tatus`). Deve ser removido do stage e deletado.

**6.4 Site estático estranho dentro do repo do app:** `admin.html`, `atividades.html`, `contato.html`, `portfolio.html`, `quem-somos.html`, `clear-dev-data.html`, `sistema/index.html`, `public/site-data.js` e logos de marketing (`Logotipo_Vale.svg.png`, `Norsk_Hydro.svg.png`, `LOGO_BRANCO.png`, `orlando.png`, `quem-somos-equipe.png`). Correlaciona com as tabelas `site_*` — um site institucional foi misturado ao SPA do almoxarifado. Não faz parte do bundle React (que usa só `index.html` + `src/`).

**6.5 Mudanças não comitadas amplas:** 16 arquivos `M`/`A` pendentes (App.tsx, AuthContext, supabase.ts, Login, relatórios, localização, calibração, etc.) — trabalho em andamento não consolidado.

---

## 7. CONCLUSÕES SEM PREMISSAS

1. **O que existe:** SPA React/TS/Vite + Supabase para gestão de almoxarifado (romaneios, NF-e, estoque, solicitações, EPI, cadastros, relatórios), **+** um CMS de site institucional acoplado.
2. **Estado real dos dados:** o projeto Supabase ligado está **vazio**. A afirmação anterior de "produção com 814+ registros" referia-se a **outro projeto** e **não reflete o estado atual**.
3. **Código:** compila limpo; bem estruturado por módulos. Há **3 rotas quebradas** e ≥1 página órfã.
4. **Segurança:** RLS efetivamente aberto (23 políticas `true`), 3 erros de RLS, `.env` versionado, buckets públicos listáveis, proteção de senha vazada desligada.
5. **Reprodutibilidade:** schema não versionado (2 migrations p/ 23 tabelas) e 3 lockfiles → ambiente não determinístico.

---

## 8. RISCOS PRIORIZADOS

| # | Risco | Severidade | Evidência |
|---|---|---|---|
| 1 | Políticas RLS `true` → DB aberto quando populado | **Alta** | advisors: 23× "RLS Policy Always True", 3× ERROR |
| 2 | `.env` no histórico do git | **Alta** | `git ls-files .env` |
| 3 | Backup de produção solto na árvore (`banco de dados/`) | **Alta** | 2,4 MB de dumps não rastreados |
| 4 | Schema não versionado (2 migrations vs 23 tabelas) | Média | `migrations/` + `supabase/` só `.temp/` |
| 5 | Rotas quebradas (`\...`, `:id` sem `/`) | Média | `src/App.tsx` |
| 6 | 3 lockfiles / PM ambíguo | Média | bun.lockb + package-lock.json + pnpm-workspace.yaml |
| 7 | Buckets públicos + GraphQL exposto + senha vazada | Média | advisors |
| 8 | Lixo no repo (artefatos, `tatus`, HTMLs) | Baixa | git status / ls |

---

## 9. AÇÕES RECOMENDADAS (ordem)

1. **Rotacionar a anon key** no Supabase e **remover `.env` do rastreamento** (`git rm --cached .env`); confirmar que permanece no `.gitignore`. Mover segredos só para o ambiente da Vercel.
2. **Corrigir RLS:** substituir políticas `USING (true)` por políticas reais baseadas em `auth.uid()` / perfil; reativar RLS nas 3 tabelas com policy-mas-RLS-off; revisar funções SECURITY DEFINER e `search_path`.
3. **Tirar `banco de dados/` do repo** (mover para fora ou `.gitignore`); garantir que dumps de produção não sejam comitáveis.
4. **Versionar o schema:** gerar migrations reais (`supabase db diff` / dump) que reproduzam as 23 tabelas; adotar `supabase/migrations` como fonte de verdade.
5. **Padronizar 1 gerenciador de pacotes** (remover 2 dos 3 lockfiles).
6. **Corrigir rotas** em `src/App.tsx` (`romaneios/:id`, `solicitacoes/:id/print`, caminho com `/` em vez de `\`); ligar ou remover a página EPI órfã.
7. **Limpar artefatos** comitados da auditoria anterior e o arquivo `tatus`; decidir o destino do site institucional (`*.html`, `sistema/`, tabelas `site_*`) — separar em outro repo ou formalizar como feature.
8. Ativar **Leaked Password Protection** e fechar listagem pública dos buckets.

---

*Relatório baseado 100% em evidências coletadas em 2026-05-29: leitura de arquivos, `git ls-files`/`git status`, `tsc --noEmit`, e consultas diretas ao Supabase (`list_tables`, `get_advisors`).*
