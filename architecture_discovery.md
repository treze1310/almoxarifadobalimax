## MAPEAMENTO DE ARQUITETURA E FLUXO DE DADOS
### Arquitetura Descoberta (Baseada em Evidências):

**Stack Tecnológico Real:**
- Frontend: React 19.1.1 + TypeScript 5.8.3
- Build Tool: Vite/Rolldown 7.0.12
- UI Framework: Radix UI + Tailwind CSS
- Backend: Supabase (PostgreSQL + Auth + API)
- Deployment: Vercel (baseado no vercel.json)

**Padrões Arquiteturais Identificados:**
- SPA (Single Page Application) - React Router
- BaaS (Backend as a Service) - Supabase
- JAMstack - Static site + APIs
- Component-driven development - Radix UI

### Fluxo de Dados Real:
**Cliente → Supabase → PostgreSQL**
1. Frontend React faz chamadas diretas ao Supabase
2. Supabase gerencia autenticação JWT/PKCE
3. PostgreSQL armazena dados relacionais
4. Real-time subscriptions disponíveis

### Módulos Funcionais Mapeados:
- **Gestão de Usuários**: autenticação + perfis de acesso
- **Cadastros Base**: empresas, colaboradores, fornecedores
- **Almoxarifado**: materiais, localização, estoque
- **Movimentação**: romaneios, solicitações
- **Integração Fiscal**: importação NF-e
- **EPIs**: controle de equipamentos de proteção
- **Relatórios**: dashboards e relatórios
