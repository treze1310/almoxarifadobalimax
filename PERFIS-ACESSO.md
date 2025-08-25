# Sistema de Perfis de Acesso

Este documento descreve o sistema completo de perfis de acesso implementado no sistema de almoxarifado.

## 📋 Visão Geral

O sistema permite criar e gerenciar perfis de acesso personalizados, oferecendo controle granular sobre as permissões dos usuários. Cada usuário pode ter um perfil padrão ou um perfil personalizado.

## 🏗️ Estrutura do Sistema

### Perfis Padrão (Sistema)
- **Administrador**: Acesso total ao sistema
- **Almoxarife**: Gestão completa do almoxarifado
- **Supervisor**: Supervisão e aprovações
- **Solicitante**: Criação de solicitações
- **Visualizador**: Apenas visualização

### Perfis Personalizados
Podem ser criados pelos administradores com permissões específicas para atender necessidades particulares.

## 🗄️ Estrutura do Banco de Dados

### Tabela `perfis_acesso`
```sql
- id: UUID (PK)
- nome: VARCHAR(100) - Nome do perfil
- descricao: TEXT - Descrição do perfil
- permissoes: JSONB - Estrutura de permissões
- ativo: BOOLEAN - Status do perfil
- sistema: BOOLEAN - Indica se é perfil padrão
- created_at/updated_at: TIMESTAMP
```

### Tabela `usuarios` (atualizada)
```sql
- perfil_acesso_id: UUID - Referência para perfil personalizado
- perfil: VARCHAR(50) - Perfil padrão (fallback)
```

## 🔐 Sistema de Permissões

### Módulos Disponíveis
- **Dashboard**: Painel principal
- **Materiais**: Gestão de materiais e equipamentos
- **Estoque**: Controle de estoque
- **Romaneios**: Gestão de romaneios
- **Solicitações**: Solicitações de materiais
- **Relatórios**: Relatórios e análises
- **Empresas**: Cadastro de empresas
- **Fornecedores**: Cadastro de fornecedores
- **Colaboradores**: Cadastro de colaboradores
- **NFe**: Gestão de notas fiscais
- **Usuários**: Gestão de usuários
- **Configurações**: Configurações do sistema

### Tipos de Permissão
- **read**: Visualizar/Listar
- **create**: Criar novos registros
- **update**: Editar registros existentes
- **delete**: Excluir registros
- **export**: Exportar dados
- **approve**: Aprovar solicitações/romaneios
- **manage**: Operações administrativas avançadas

## 🎨 Interface do Usuário

### Página de Perfis de Acesso
Localizada em `/permissoes/perfis-acesso`, oferece:

- **Listagem de Perfis**: Visualização de todos os perfis
- **Busca e Filtros**: Busca por nome/descrição
- **Criação**: Dialog para criar novos perfis
- **Edição**: Dialog para editar perfis existentes
- **Visualização**: Dialog com detalhes completos
- **Duplicação**: Criação de cópias de perfis
- **Ativação/Desativação**: Controle de status
- **Exclusão**: Remoção de perfis personalizados

### Formulário de Permissões
- Interface organizada por módulos
- Switches para cada tipo de permissão
- Controles para habilitar/desabilitar módulos completos
- Resumo visual das permissões selecionadas

### Gestão de Usuários
- Campo adicional para seleção de perfil personalizado
- Indicação visual do tipo de perfil (padrão vs personalizado)
- Detalhes do perfil nos dialogs de visualização

## 🔄 Fluxo de Funcionamento

### Criação de Perfil
1. Administrador acessa página de perfis
2. Clica em "Novo Perfil"
3. Preenche informações básicas
4. Configura permissões por módulo
5. Salva o perfil

### Atribuição a Usuário
1. Edição de usuário existente ou criação de novo
2. Seleção de perfil personalizado (opcional)
3. Se não selecionado, usa perfil padrão
4. Sistema calcula permissões automaticamente

### Verificação de Permissões
1. Sistema verifica se usuário tem perfil personalizado
2. Se sim, converte permissões JSONB para estrutura UserPermissions
3. Se não, usa permissões do perfil padrão
4. Context `useAuth` disponibiliza `hasPermission()`

## 🛠️ Componentes Técnicos

### Hooks
- `usePerfisAcesso`: Gerenciamento CRUD de perfis
- `useUsuarios`: Atualizado para suportar perfis personalizados

### Tipos TypeScript
- `PerfilAcesso`: Interface do perfil
- `PermissoesPerfil`: Estrutura de permissões
- `PerfilFormData`: Dados do formulário

### Componentes
- `PerfilForm`: Formulário principal
- `PermissionsForm`: Configuração de permissões
- `PerfilCreateDialog`: Dialog de criação
- `PerfilEditDialog`: Dialog de edição
- `PerfilDetailsDialog`: Dialog de visualização

## 🔒 Segurança

### Row Level Security (RLS)
- Usuários podem ver apenas perfis ativos
- Apenas administradores podem gerenciar perfis

### Validações
- Perfis do sistema não podem ser excluídos
- Perfis em uso não podem ser removidos
- Validação de permissões no frontend e backend

### Auditoria
- Timestamps de criação e atualização
- Histórico de mudanças via triggers

## 📊 Casos de Uso

### Exemplo 1: Operador de Estoque
Perfil personalizado com permissões específicas:
```json
{
  "dashboard": {"read": true},
  "materiais": {"read": true},
  "estoque": {"read": true, "create": true, "update": true},
  "romaneios": {"read": true, "manage": true}
}
```

### Exemplo 2: Assistente Administrativo
Perfil para apoio administrativo:
```json
{
  "dashboard": {"read": true},
  "relatorios": {"read": true, "export": true},
  "empresas": {"read": true, "update": true},
  "fornecedores": {"read": true, "create": true, "update": true}
}
```

## 🚀 Benefícios

1. **Flexibilidade**: Criação de perfis sob medida
2. **Segurança**: Controle granular de acesso
3. **Escalabilidade**: Fácil adição de novos módulos/permissões
4. **Usabilidade**: Interface intuitiva para configuração
5. **Manutenibilidade**: Código organizado e tipado
6. **Auditoria**: Rastreamento completo de mudanças

## 🔧 Manutenção

### Adição de Novos Módulos
1. Atualizar `MODULOS_SISTEMA` em `/types/perfil.ts`
2. Adicionar conversão em `convertCustomPermissions`
3. Atualizar interface se necessário

### Novos Tipos de Permissão
1. Adicionar ao `PERMISSION_LABELS`
2. Incluir na configuração dos módulos
3. Implementar lógica de conversão

## 📝 Notas de Implementação

- Sistema mantém compatibilidade com perfis padrão existentes
- Migração automática preserva funcionalidade atual
- Performance otimizada com consultas eficientes
- Interface responsiva para diferentes dispositivos

## 🎯 Próximos Passos

1. Implementar logs de auditoria detalhados
2. Adicionar templates de perfis pré-configurados
3. Sistema de aprovação para mudanças críticas
4. Relatórios de uso de permissões
5. Integração com sistema de notificações