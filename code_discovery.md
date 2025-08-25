## ANÁLISE PROFUNDA DO CÓDIGO - DESCOBERTA REAL
### Linguagens encontradas por evidência:
- TypeScript/TSX: 181 arquivos (linguagem principal)
- JavaScript: 8 arquivos (configurações)
- SQL: 5 arquivos (migrações e dados)
- JSON: 9 arquivos (configurações)

### Estrutura de Banco Descoberta:
- PostgreSQL via Supabase (backend BaaS)
- Schema 'public' com 20 tabelas principais:
  • usuarios (gestão de usuários)
  • colaboradores (funcionários da empresa)
  • materiais_equipamentos (itens do almoxarifado)
  • centros_custo (organização por centros)
  • romaneios (movimentação de materiais)
  • solicitacoes (pedidos de materiais)
  • epi_atribuicoes (controle de EPIs)
  • nfe_importacao (importação de notas fiscais)
  • movimentacao_estoque (histórico de movimentações)
  • log_sistema (auditoria de ações)
