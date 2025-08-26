# Sistema Centralizado de Relatórios

Este diretório contém todos os componentes relacionados à geração e visualização de relatórios do sistema de almoxarifado.

## 📁 Estrutura

```
src/components/relatorios/
├── README.md                    # Esta documentação
├── RelatorioInterativo.tsx      # Componente para relatórios interativos
└── PrintComponentManager.tsx    # Gerenciador de impressão/PDF
```

## 🎯 Componentes Principais

### RelatorioInterativo.tsx
**Propósito**: Fornece visualização interativa de dados com:
- Filtros dinâmicos
- Tabelas responsivas com paginação
- Cards de resumo com KPIs
- Exportação para PDF
- Interface em tempo real

**Uso**:
```tsx
<RelatorioInterativo
  reportId="movimentacao-interativa"
  titulo="Consulta de Movimentação"
  onClose={() => setActiveReport(null)}
/>
```

### PrintComponentManager.tsx
**Propósito**: Gerencia impressão e geração de PDF com:
- Botões padronizados (Voltar, Imprimir, Download)
- Estilos de impressão otimizados
- Layout responsivo
- Estados de carregamento

**Uso**:
```tsx
<PrintComponentManager
  title="Relatório XYZ"
  onBack={() => navigate(-1)}
  onPrint={() => window.print()}
  onDownloadPDF={handlePDF}
  isGeneratingPDF={loading}
>
  <div>Conteúdo do relatório</div>
</PrintComponentManager>
```

## 🔧 Hooks Relacionados

### usePrintManager.ts
**Localização**: `src/hooks/usePrintManager.ts`

**Funcionalidades**:
- Geração de PDF a partir de HTML
- Impressão em nova janela
- Estados de carregamento
- Tratamento de erros

**Exemplo**:
```tsx
const { isGeneratingPDF, generatePDF, printWindow } = usePrintManager({
  onSuccess: () => toast.success('PDF gerado!'),
  onError: (error) => toast.error(error)
})

// Gerar PDF
await generatePDF(htmlContent, 'relatorio.pdf')

// Imprimir
printWindow(htmlContent, 'Relatório')
```

## 📊 Configuração de Relatórios

Os relatórios são configurados em `src/types/reports.ts`:

```typescript
export interface ReportConfig {
  id: string
  titulo: string
  descricao: string
  icon: string
  categoria: string
  isInteractive?: boolean  // Para relatórios interativos
  // ... outros campos
}
```

### Tipos de Relatórios

#### 1. Relatórios Estáticos
- Geração única de PDF/Excel
- Filtros configuráveis
- Dados baseados em query fixa

#### 2. Relatórios Interativos
- Interface dinâmica
- Filtros em tempo real
- Visualização imediata
- Opção de exportação

## 🏗️ Padrões de Implementação

### 1. Estrutura de Páginas
```tsx
// Página principal de relatórios
const RelatoriosPage = () => {
  const [activeInteractiveReport, setActiveInteractiveReport] = useState(null)
  
  // Se há relatório interativo ativo, mostrar apenas ele
  if (activeInteractiveReport) {
    return <RelatorioInterativo {...activeInteractiveReport} />
  }
  
  // Caso contrário, mostrar grid de relatórios
  return <RelatoriosGrid />
}
```

### 2. Gerenciamento de Estado
```tsx
const [selectedReport, setSelectedReport] = useState<string | null>(null)
const [filters, setFilters] = useState<Record<string, any>>({})
const [activeInteractiveReport, setActiveInteractiveReport] = useState<{
  id: string
  titulo: string
} | null>(null)
```

### 3. Tratamento de Relatórios Interativos
```tsx
const handleInteractiveReport = (config: ReportConfig) => {
  setActiveInteractiveReport({
    id: config.id,
    titulo: config.titulo
  })
}
```

## 🎨 Estilos de Impressão

### CSS Padrão para Impressão
```css
@media print {
  .no-print { 
    display: none !important; 
  }
  body { 
    margin: 0; 
    padding: 0; 
    background: white;
  }
  .print-content {
    width: 100% !important;
    margin: 0 !important;
  }
}
```

## 🚀 Como Adicionar Novos Relatórios

### 1. Adicionar Configuração
```typescript
// src/types/reports.ts
{
  id: 'novo-relatorio',
  titulo: 'Novo Relatório',
  descricao: 'Descrição do relatório',
  icon: 'FileText',
  categoria: 'Categoria',
  isInteractive: true, // Se for interativo
  // ... outras configurações
}
```

### 2. Implementar Geração de Dados
```typescript
// src/services/reportService.ts
async generateNovoRelatorio(filtros: NovoRelatorioFilter): Promise<ReportData> {
  // Implementação da lógica
}
```

### 3. Adicionar Filtros (se necessário)
```typescript
// src/types/reports.ts
export interface NovoRelatorioFilter extends BaseReportFilter {
  campoEspecifico?: string
}
```

### 4. Para Relatórios Interativos
Criar componente específico ou usar o `RelatorioInterativo` genérico com adaptações.

## 📝 Migração de Relatórios Existentes

### Antes (Estrutura Antiga)
```
src/pages/relatorios/MovimentacaoEstoque.tsx  ❌ Removido
src/pages/cadastros/colaboradores/FichaPrintPage.tsx  ⚠️  Específico
src/pages/solicitacoes/SolicitacaoPrint.tsx  ⚠️  Específico
```

### Depois (Estrutura Centralizada)
```
src/pages/relatorios/Relatorios.tsx  ✅ Hub central
src/components/relatorios/RelatorioInterativo.tsx  ✅ Interativo
src/components/relatorios/PrintComponentManager.tsx  ✅ Impressão
src/hooks/usePrintManager.ts  ✅ Lógica de impressão
```

## 🔍 Vantagens da Centralização

1. **Consistência**: Interface uniforme para todos os relatórios
2. **Reutilização**: Componentes compartilhados
3. **Manutenibilidade**: Mudanças centralizadas
4. **Performance**: Hooks otimizados
5. **Escalabilidade**: Fácil adição de novos relatórios
6. **UX**: Fluxo unificado para o usuário

## 🎯 Próximos Passos

1. ✅ Estrutura centralizada implementada
2. ✅ Relatório interativo de movimentação
3. ✅ Componentes de impressão reutilizáveis
4. 🔄 Migrar relatórios específicos (ficha EPI, solicitações)
5. 🔄 Adicionar mais relatórios interativos
6. 🔄 Implementar cache de dados
7. 🔄 Adicionar gráficos aos relatórios
