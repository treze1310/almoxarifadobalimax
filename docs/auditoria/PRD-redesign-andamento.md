# PRD "Melhorias e Redesign" — andamento

Fonte: `PRD — Sistema de Almoxarifado Balimax Melhorias e Redesign.docx` (05/10/2026).
Atualizado em 05/10/2026.

A ordem segue o roadmap do próprio PRD: **Fase 1 (P0, dados e governança) antes do redesign**,
"porque um layout novo sobre números errados não recupera a confiança do usuário".

## Fase 1 — P0

| ID | Requisito | Status | Como foi feito / verificado |
|---|---|---|---|
| RF-01 | Variações mensais reais; ocultar sem base de comparação | ✅ | Os valores `+2,5% / +8,2% / −12% / +15%` eram literais no código. Agora materiais e movimentações comparam mês atual × anterior com dados reais; **Valor do Estoque** e **Estoque Crítico** não exibem indicador, por não haver histórico. KPIs ficaram clicáveis |
| RF-02 | Regra única de estoque baixo/zerado | ✅ | Coluna gerada `materiais_equipamentos.situacao_estoque` (`zerado`/`baixo`/`normal`) no banco, consumida pelo KPI, alerta e filtro. Verificado: 3 zerados + 1 no mínimo. A "divergência 3 × 4" era rotulagem: as telas somavam grupos diferentes |
| RF-03 | Gráfico de compras a partir das NF-e | ✅ já conforme | Já lia `nfe_importacao` com escala automática e tooltip por mês. A barra única é o dado real: das 4 notas (R$ 12.142,84), só uma tem emissão nos últimos 12 meses |
| RF-04 | Bloquear edição/exclusão após aprovação | ✅ | Triggers em `romaneios` e `solicitacoes`, válidos para **qualquer perfil, inclusive administrador**. Cancelamento exige motivo (mín. 5 caracteres), que é gravado em `observacoes` e na auditoria. No front, Editar/Excluir desaparecem e o menu mostra "Aprovado — somente cancelamento". Transição natural aprovado → retirado → devolvido preservada |
| RF-05 | Nome do solicitante; nº reservado | ✅ | Nome do solicitante corrigido (a lista imprimia o literal `'Colaborador'`). **Numeração passou a ser global** (`SCO-00001`), reservada por sequência do Postgres ao abrir o formulário — isso também elimina a corrida do método anterior (ler o maior número e somar 1), que podia duplicar número com dois usuários simultâneos. Solicitante avulso **segue permitido**, por decisão de 05/10 |
| RF-06 | Mascarar CPF na listagem | ✅ | Novo `src/lib/dadosPessoais.ts` com a regra num só lugar. Listagem mostra `***.456.164-**`, telefone e e-mail também mascarados, cargos capitalizados. No detalhe há "Ver CPF completo", que exige `colaboradores.update` e **grava o acesso na trilha de auditoria** (RNF-06) |
| RF-07 | Toast de login só em autenticação explícita; skeleton do menu | ✅ | O evento `SIGNED_IN` também dispara ao restaurar a sessão — daí o toast a cada recarga. Agora há uma flag ligada apenas pelo `signIn()`. O menu mostra skeleton e "Carregando permissões…" em vez de sumir e exibir "Sem perfil" |

### Itens de consistência resolvidos junto

- **Versão num único lugar**: havia "v1.0.0" no menu e "Versão 0.0.1" no rodapé, ambos fixos.
  Agora vem do `package.json` via `__APP_VERSION__` (`src/lib/versao.ts`); verificado no bundle: `0.0.29`.
- **RF-15 parcial**: o botão "Teste Diagnóstico" dos Relatórios só aparece em desenvolvimento.
- **RF-08 parcial**: o filtro de estoque crítico vive na URL (`?estoque=critico`), o que faz o KPI
  do Dashboard abrir a lista já filtrada e torna o estado compartilhável.
- **Código morto**: `src/hooks/useDashboard.ts` não era importado por ninguém e duplicava a regra de
  estoque — exatamente a fonte dupla que o RF-02 elimina. Removido.
- **Testes**: 22 passando, incluindo regressões de mascaramento de CPF e da regra de estoque.

### Decisões de 05/10 aplicadas

- **Numeração global** (item 1): `public.proximo_numero_solicitacao()` com sequência própria, exige
  `solicitacoes.create` e é chamada uma vez ao abrir o formulário. Número de formulário abandonado
  fica como lacuna — comportamento esperado de numeração reservada. A função antiga
  `generatePurchaseRequisitionCode` (padrão `SCO-AL-CCCC-NNNN`) foi removida.
  Verificado: Almoxarife reserva `SCO-00001` e `SCO-00002`; usuário sem perfil é bloqueado.
- **Módulo EPI** (item 2 — "faça o que achar melhor"): **liguei, em vez de remover.** Já existiam
  1.140 linhas prontas (`src/pages/epi/EPIGerenciamento.tsx`, `EPIAtribuicaoDialog`, `FichaEPIPDF`,
  `epiService`) fora de rota e de menu. O motivo de nunca ter funcionado era a **view
  `epi_com_atribuicoes`, que não existia no banco** — o próprio service tinha um comentário
  admitindo isso. Criei a view com `security_invoker = true` (sem isso ela rodaria como dona e
  furaria a RLS), com `status_calculado` (em_dia / vencendo em 30 dias / vencido / sem_validade), e
  liguei rota `/epi` + item de menu, ambos sob a permissão `epi`. Isso resolve o RF-14 (a matriz não
  cita mais módulo inexistente) e entrega a base do RF-17.
  Verificado: Almoxarife lê a view; anônimo não.
- **Solicitante avulso** (item 3): mantido. Revertida a exigência de colaborador cadastrado e
  removida a opção `exigirColaborador` que havia ficado sem uso.
- **RF-14 (resumo do perfil)**: o cabeçalho dizia "16 de 16 módulos liberados" inclusive para o
  Diretor, que é somente leitura. Agora distingue: "16 de 16 módulos visíveis · somente leitura ·
  aprova documentos".


## Fase 2 — Design system (fundação entregue)

Componentes em `src/components/ds/` e tokens em `src/main.css` + `tailwind.config.ts`.

| Item do PRD | Status | Observação |
|---|---|---|
| Token `--primary` (azul Balimax) | ✅ | `#1F4E9C` exato. Era `#007bff` (azul genérico). Verificado no navegador: `rgb(31, 78, 156)` |
| Token `--radius` | ✅ | 8 px em cards (`--radius`), 6 px em inputs e botões (`--radius-control`) |
| Escala tipográfica | ✅ | `text-ds-page` (24/600), `text-ds-section` (18/600), `text-ds-body` (14), `text-ds-table` (13). Substitui os 3 tamanhos de título que existiam soltos |
| Padding de página | ✅ | `p-ds-page-mobile` (16 px) / `md:p-ds-page` (24 px), aplicado no `Layout` — vale para todas as telas de uma vez |
| Tema claro e escuro | ✅ | `ThemeContext` + `ThemeToggle` no cabeçalho; preferência salva por usuário (claro / escuro / do sistema), com fallback se o `localStorage` estiver bloqueado. Verificado nos dois temas |
| Status padronizados | ✅ | Mapa central em `src/lib/status.ts` com as 6 cores do PRD, incluindo "cancelado" em cinza riscado. `normalizarStatus()` converte as muitas grafias do banco (`aprovado`, `Aprovada`, `concluida`, `Concluída`, `lancada`, `em_analise`…) para a chave canônica |
| `StatusBadge` | ✅ | Lê o mapa central; nenhum módulo define cor de status |
| `PageHeader` | ✅ | Breadcrumb → título → descrição → slot de ações |
| `DataTable` | ✅ | Busca, filtro por coluna, ordenação, seleção em lote, colunas configuráveis, densidade compacta, exportação CSV, paginação e **estado na URL** |
| `FilterBar` | ✅ | Entregue dentro do `DataTable` (busca + limpar filtros), em vez de componente separado |
| `DetailDrawer` | ✅ | Painel lateral com número, status, abas e barra de ações |
| `KpiCard` | ✅ | Valor, rótulo, variação (oculta quando não há base) e link para a lista filtrada |
| `EmptyState` / `Skeleton` / `ErrorState` | ✅ | `EstadosPagina.tsx`, com `TableSkeleton` e `CardsSkeleton` no lugar dos spinners |
| `AppShell` | ✅ quase completo | Menu agrupado em **Operação, Compras, Cadastros e Gestão**, com cada item filtrado por permissão e grupo vazio sumindo junto. Busca do topo virou a **paleta de comandos (Ctrl+K)**, com resultados agrupados. Falta apenas a central de notificações (RF-19, P2) |
| `FormLayout` | ✅ | Grid de 12 colunas, seções numeradas e barra de ações fixa. Em uso em Nova Solicitação e Novo Romaneio |
| `PaletaComandos` (RF-12) | ✅ | Ctrl+K / ⌘K. Busca materiais, romaneios, solicitações e colaboradores direto no banco, com resultados agrupados, atalhos de navegação e respeito às permissões do perfil |

### Desvio: TanStack Table

O PRD especifica `DataTable (TanStack Table)`. **A biblioteca não pôde ser instalada**: o
`node_modules` deste projeto está com symlinks apontando para o virtual store de **outra pasta**
(`CURSOR-PROJECTS/.../sistema-de-almoxarifado/node_modules/.pnpm`), e o pnpm exige
`pnpm install` completo para aceitar uma dependência nova. Um reinstall completo é operação de risco
(com 3 lockfiles divergentes no repositório) e não cabia fazer sem combinar.

O `DataTable` foi então construído sobre a tabela do shadcn, com a lógica de filtro e ordenação já
validada no `ColumnFilter`. **A API do componente não depende do motor**, então trocar por TanStack
depois não exige mexer nas telas que o consomem.

### Importante: o que já mudou de aparência

Tokens, padding de página e tema são globais — então **todas as telas já mudaram de cor e
espaçamento** com esta entrega. Os componentes novos (`DataTable`, `PageHeader`, `DetailDrawer`…)
ainda **não foram aplicados** aos módulos: essa é a migração, que vem a seguir.


### Migração dos módulos — concluída para as telas principais

| Tela | Status | O que mudou |
|---|---|---|
| **Colaboradores** | ✅ | 62 cards → `DataTable`. Busca por nome, matrícula, cargo e CPF (por dígitos); filtros em Cargo, Setor, Centro de custo e Status; CPF, e-mail e telefone seguem mascarados |
| **Romaneios** | ✅ | As 3 abas (Retiradas, Devoluções, Transferências) viraram **filtro da coluna Tipo**. Preservei como coluna o status de devolução, que aparecia no rodapé do card e teria se perdido |
| **Solicitações** | ✅ | As 6 abas de status viraram filtro. `StatusBadge` com gênero feminino resolve "Concluída" e "Aprovada" com a mesma cor. **Ações em lote ligadas**: aprovar, rejeitar (com motivo obrigatório) e cancelar — os handlers existiam no código mas nunca eram chamados |
| **Materiais e Equipamentos** | ✅ | Tabela manual + cards mobile → `DataTable`. Colunas configuráveis resolvem a coluna Calibração cortada; Tipo e Categoria agora são colunas separadas, com um filtro cada |
| **Dashboard** | ✅ | Cards manuais → `KpiCard`, com `PageHeader` |
| **Nova solicitação** | ✅ | `PageHeader` + `FormSection` numeradas + `FormActions` fixa no rodapé |
| **Novo romaneio** (retirada, entrada e devolução) | ✅ | Mesmo padrão; o passo 1 da devolução também ganhou `PageHeader` |

`FormLayout` (grid de 12 colunas, seções numeradas e barra de ações) foi criado nesta rodada e já
está em uso nos dois formulários.

#### Limitações registradas

- **Paginação é no cliente.** O `DataTable` carrega tudo e pagina em memória. Serve para os volumes
  atuais (62 colaboradores, 78 materiais), mas o RNF-01 pede paginação no servidor — trabalho nos
  hooks de busca, não nas telas.
- **Sem modo de cards no mobile.** O PRD prevê "tabelas viram lista de cards compactos" em telas
  pequenas; hoje a tabela rola na horizontal. Falta implementar no `DataTable`.
- **Telas migradas na segunda leva**: Empresas, Fornecedores, Centros de Custo, Marcas, Categorias,
  Localização e Histórico de NF-e — todas de tabela manual para `DataTable`, com `PageHeader`,
  `StatusBadge` e estados de página padrão.
- **Telas ainda não migradas**: Importação de NF-e (é um assistente de upload, não uma listagem),
  Relatórios (grade de cards de relatório) e EPI (recém-ligado, tem abas próprias).

### Próximo passo da Fase 2

Migrar as telas restantes (NF-e, Localização, Relatórios e os cadastros auxiliares), implementar o
modo de cards no mobile do `DataTable` e completar o `AppShell` (grupos no menu, notificações e
Ctrl+K). O `DetailDrawer` está pronto mas ainda não substituiu os diálogos de detalhe — os módulos
seguem abrindo o registro em modal.

## Fase 3 — P1 entregues

### RF-12 — Paleta de comandos (Ctrl+K)
Entregue. Busca materiais, romaneios, solicitações e colaboradores respeitando as permissões do
perfil. O resultado abre o **registro**, e não só a listagem: o destino carrega `?item=<id>` e o
hook `useAbrirItemDaUrl` abre o cadastro quando os dados chegam, limpando o parâmetro depois.

### RF-13 — Conciliação de NF-e item a item
Entregue. A importação não movimenta mais estoque: ela cria a nota como **Importada** e os
materiais novos nascem com estoque zero. O ciclo passou a ser **Importada → Conferida → Lançada**.
Cada item da nota precisa apontar para um material do cadastro (diálogo de conciliação); só com
tudo vinculado a nota pode ser conferida e, depois, lançada. O lançamento roda inteiro no banco
(`nfe_lancar_estoque`): atualiza o estoque, grava a movimentação de entrada de cada item e muda o
status, numa só transação, e é idempotente — chamar duas vezes não duplica movimentação. As quatro
notas que já existiam foram marcadas como `lancada` para que o fluxo novo não as lançasse de novo.

### RF-10 — Ponto de pedido com solicitação automática
Entregue. Cada item passou a ter **estoque máximo**, **ponto de pedido** e uma chave de
**reposição automática** (ligada por padrão); o ponto de pedido em branco usa o estoque mínimo.
Quando o estoque entra no ponto, um gatilho no banco abre sozinho uma solicitação de compra
pendente, com a quantidade que falta para o estoque máximo (ou o dobro do ponto, quando não há
máximo) e urgência alta se o item zerou.

Três garantias, todas verificadas no banco:

1. **Uma solicitação em aberto por item.** Um índice único parcial impede a segunda enquanto a
   primeira estiver pendente, aprovada ou em andamento — baixas sucessivas não geram enxurrada de
   pedidos. Fechando a solicitação, uma nova queda volta a gerar.
2. **Dispara na entrada no ponto**, não a cada saída abaixo dele.
3. **Respeita a chave do item**: com a reposição desligada, nada é gerado.

A solicitação automática não tem solicitante humano — `colaborador_id` passou a aceitar nulo e a
coluna `origem` (`manual`/`automatica`) explica o porquê. A listagem mostra a etiqueta
**Automática** e uma coluna *Origem*; a justificativa registra o estoque e o ponto no momento da
geração, e a ação entra na trilha de auditoria como `solicitacoes.reposicao_automatica`.

Coerente com a decisão de 05/10: a solicitação de compra **continua sendo só entrada** — ela não
movimenta estoque. A entrada acontece no lançamento da NF-e.

## Pendente

### P1 (RF-08 a RF-15)
Busca/filtros/paginação no servidor em todas as listagens, fluxo de retirada em 3 passos com código
de barras, importação CSV em lote, revisão da matriz de perfis, pré-visualização e agendamento de
relatórios. **RF-10, RF-12 e RF-13 entregues** (ver Fase 3).

### P2 (RF-16 a RF-19)
Hierarquia de localização com etiqueta QR, inventário cíclico pelo celular, central de
notificações. **RF-17 (EPI) teve a base entregue** — o módulo está funcional e acessível; o que
falta dele é a ficha por colaborador com alerta automático de troca.

### Redesign do front-end
Fundação **entregue** (ver Fase 2 acima). Pendente: migração dos módulos para os componentes novos,
`AppShell` completo (grupos no menu, notificações, Ctrl+K), `FormLayout` e o assistente de 3 passos
do fluxo de retirada.

### Requisitos não funcionais
Já atendidos em sessões anteriores: **RNF-05** (permissões no banco) e **RNF-07** (auditoria).
**RNF-06** agora cobre CPF, telefone e e-mail em Colaboradores. Pendentes: RNF-01 a RNF-04,
RNF-08 (lint de tokens), RNF-09 e RNF-10 (observabilidade/Sentry).

## Decisões pendentes

Nenhuma pendente. As três de 05/10 foram respondidas e aplicadas (ver acima).

Fica registrado, para uma rodada futura: a **numeração de romaneios ainda tem dois padrões**
(`ROM-AL-001-0003` e `ROM-AL-2401031262-0001`), apontado como severidade baixa no PRD. A decisão de
numeração global valeu para solicitações; se quiser o mesmo para romaneios, é a mesma abordagem.
