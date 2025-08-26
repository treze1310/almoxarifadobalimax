# Sistema de Relatórios - Almoxarifado

## 📋 Visão Geral

O Sistema de Relatórios do Almoxarifado é uma solução completa para geração de relatórios gerenciais e operacionais, desenvolvida com React, TypeScript e Supabase. O sistema oferece uma interface moderna e intuitiva para gerar relatórios em PDF com dados em tempo real.

## 🎯 Funcionalidades Principais

### Relatórios Disponíveis

1. **📦 Inventário Completo**
   - Lista detalhada de todos os produtos em estoque
   - Valores unitários e totais
   - Filtros por categoria e localização
   - Opção para incluir/excluir produtos inativos e zerados

2. **📊 Movimentação por Período**
   - Histórico completo de entradas, saídas e ajustes
   - Análise por período específico
   - Filtros por material, tipo de movimentação e responsável
   - Totalizadores automáticos

3. **⏰ Controle de Vencimento (EPIs)**
   - EPIs próximos ao vencimento ou vencidos
   - Status automático: OK/ALERTA/CRÍTICO/VENCIDO
   - Configuração de dias de alerta personalizável
   - Foco em conformidade e segurança

### Recursos Técnicos

- **Interface Moderna**: Design responsivo com Shadcn/ui e Tailwind CSS
- **Geração de PDF**: Layout profissional com jsPDF e html2canvas
- **Filtros Dinâmicos**: Opções carregadas em tempo real do banco
- **Validação Robusta**: Verificação automática de dados obrigatórios
- **Feedback Visual**: Indicadores de progresso e estados de loading

## 🏗️ Arquitetura do Sistema

### Estrutura de Arquivos

```
src/
├── components/
│   └── ui/                    # Componentes base (Shadcn/ui)
├── hooks/
│   └── useReports.ts          # Hook personalizado para relatórios
├── pages/relatorios/
│   └── Relatorios.tsx         # Página principal de relatórios
├── services/
│   ├── reportService.ts       # Lógica de geração de relatórios
│   └── pdfService.ts          # Serviço de geração de PDF
├── types/
│   └── reports.ts             # Tipagens TypeScript
└── lib/
    └── supabase.ts            # Configuração do Supabase
```

### Componentes Principais

#### 1. **ReportService** (`src/services/reportService.ts`)
Classe responsável por toda lógica de geração de relatórios:

```typescript
class ReportService {
  // Métodos de geração por tipo de relatório
  async generateInventarioCompleto(filters)
  async generateMovimentacaoPeriodo(filters)  
  async generateEstoqueVencimento(filters)
  
  // Geração de HTML para PDF
  private generateHTMLReport(data, title, filters)
  
  // Método principal
  async generateReport(request): Promise<ReportResponse>
}
```

#### 2. **useReports Hook** (`src/hooks/useReports.ts`)
Hook customizado que gerencia estado e operações:

```typescript
export function useReports(options?) {
  const [isGenerating, setIsGenerating] = useState(false)
  
  // Carrega dados para filtros
  const loadFilterData = async () => { ... }
  
  // Gera relatório
  const generateReport = async (request) => { ... }
  
  // Valida filtros
  const validateFilters = (reportId, filters) => { ... }
  
  return { isGenerating, generateReport, validateFilters, filterOptions }
}
```

#### 3. **Página de Relatórios** (`src/pages/relatorios/Relatorios.tsx`)
Interface principal com cards organizados por categoria:

- **Cards Interativos**: Cada relatório tem seu próprio card
- **Modal de Configuração**: Filtros específicos por tipo
- **Validação em Tempo Real**: Feedback imediato para o usuário
- **Geração Assíncrona**: Processo não-bloqueante

## 🗄️ Estrutura do Banco de Dados

### Tabelas Principais

#### `materiais_equipamentos`
```sql
- id: uuid (PK)
- codigo: varchar (código do produto)
- nome: varchar (nome do produto)  
- categoria: varchar (categoria direta)
- estoque_atual: integer (quantidade em estoque)
- valor_unitario: numeric (preço unitário)
- unidade_medida: varchar (UN, KG, etc.)
- localizacao_id: uuid (FK para localizacao)
- marca_id: uuid (FK para marcas)
- validade_ca: date (vencimento para EPIs)
- is_epi: boolean (identifica EPIs)
- ativo: boolean
```

#### `movimentacao_estoque`
```sql
- id: uuid (PK)
- material_equipamento_id: uuid (FK)
- tipo_movimentacao: varchar (entrada/saida/ajuste)
- quantidade: integer
- quantidade_anterior: integer
- quantidade_atual: integer  
- valor_unitario: numeric
- usuario_id: uuid (FK para usuarios)
- motivo: varchar
- data_movimentacao: timestamp
```

#### `usuarios`
```sql
- id: uuid (PK)
- nome: varchar (nome do usuário)
- email: varchar
```

#### `localizacao`
```sql
- id: uuid (PK)
- nome: varchar (nome da localização)
```

#### `marcas`
```sql
- id: uuid (PK)  
- nome: varchar (nome da marca)
```

## ⚙️ Configuração e Uso

### 1. Instalação de Dependências

```bash
npm install jspdf html2canvas
```

### 2. Configuração do Supabase

Certifique-se de que as seguintes políticas RLS estejam configuradas:

```sql
-- Política para materiais_equipamentos
CREATE POLICY "Allow read materials" ON materiais_equipamentos FOR SELECT USING (true);

-- Política para movimentacao_estoque  
CREATE POLICY "Allow read movements" ON movimentacao_estoque FOR SELECT USING (true);
```

### 3. Uso da Página de Relatórios

1. **Acesse** `/relatorios` na aplicação
2. **Escolha** o tipo de relatório desejado
3. **Configure** os filtros no modal
4. **Gere** o relatório em PDF

## 🔧 Desenvolvimento

### Adicionando Novos Relatórios

1. **Definir Tipos** em `src/types/reports.ts`:

```typescript
export interface NovoRelatorioFilter extends BaseReportFilter {
  parametroEspecifico?: string
}

export const REPORT_CONFIGS = [
  // ... outros relatórios
  {
    id: 'novo-relatorio',
    title: 'Novo Relatório',
    description: 'Descrição do novo relatório',
    icon: 'IconName',
    category: 'categoria',
    requiresDateRange: true,
    availableFilters: ['parametroEspecifico'],
    exportFormats: ['pdf', 'excel']
  }
]
```

2. **Implementar Método** no `ReportService`:

```typescript
async generateNovoRelatorio(filters: NovoRelatorioFilter): Promise<ReportData> {
  let query = supabase
    .from('tabela')
    .select('*')
  
  // Aplicar filtros
  if (filters.parametroEspecifico) {
    query = query.eq('campo', filters.parametroEspecifico)
  }
  
  const { data, error } = await query
  if (error) throw error
  
  return {
    columns: [...],
    rows: data?.map(...) || [],
    summary: {...}
  }
}
```

3. **Adicionar ao Switch** no método `generateReport`:

```typescript
case 'novo-relatorio':
  reportData = await this.generateNovoRelatorio(request.filters as NovoRelatorioFilter)
  break
```

### Personalizando Filtros

Para adicionar novos filtros na interface, edite `src/pages/relatorios/Relatorios.tsx`:

```typescript
{config.availableFilters.includes('novoFiltro') && (
  <div>
    <Label>Novo Filtro</Label>
    <Select
      value={filters.novoFiltro || 'all'}
      onValueChange={(value) => setFilters(prev => ({ 
        ...prev, 
        novoFiltro: value === 'all' ? undefined : value 
      }))}
    >
      <SelectTrigger>
        <SelectValue placeholder="Selecionar..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos</SelectItem>
        {/* Opções dinâmicas */}
      </SelectContent>
    </Select>
  </div>
)}
```

## 📊 Tipos de Dados

### Interfaces Principais

```typescript
export interface ReportData {
  columns: ReportColumn[]          // Definição das colunas
  rows: Record<string, any>[]      // Dados das linhas
  totals?: Record<string, number>  // Totalizadores
  summary?: {                      // Resumo executivo
    totalRegistros: number
    valorTotal?: number
    observacoes?: string
  }
}

export interface ReportRequest {
  reportId: string                 // ID do tipo de relatório
  filters: BaseReportFilter        // Filtros aplicados
  format: 'pdf' | 'excel' | 'csv' // Formato de saída
  title?: string                   // Título personalizado
}

export interface ReportResponse {
  success: boolean                 // Status da operação
  data?: ReportData               // Dados gerados
  error?: string                  // Mensagem de erro
  downloadUrl?: string            // URL de download (futuro)
}
```

## 🎨 Customização Visual

### Estilos do PDF

Os estilos do PDF são definidos no método `generateHTMLReport`:

```css
.header {
  text-align: center;
  margin-bottom: 20px;
  padding: 20px 0;
  border-bottom: 2px solid #e5e5e5;
}

.summary {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 5px;
  margin-bottom: 20px;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10px;
}
```

### Cores e Temas

As cores seguem o padrão do Tailwind CSS:
- **Primária**: `#2563eb` (blue-600)
- **Sucesso**: `#16a34a` (green-600)  
- **Alerta**: `#d97706` (amber-600)
- **Erro**: `#dc2626` (red-600)

## 🚀 Performance e Otimizações

### Estratégias Implementadas

1. **Lazy Loading**: Componentes carregados sob demanda
2. **Paginação**: Limitação de registros para relatórios grandes
3. **Cache**: Filtros carregados uma vez e reutilizados
4. **Debounce**: Validação de filtros otimizada
5. **Abortable Requests**: Cancelamento de requisições longas

### Monitoramento

O sistema inclui logs detalhados para debugging:

```typescript
console.log('🚀 PDF generation started')
console.log('✅ Session is valid') 
console.log('📄 Generating PDF...')
console.log('✅ PDF generated successfully')
```

## 🔒 Segurança

### Medidas Implementadas

1. **Validação de Sessão**: Verificação antes de operações longas
2. **Sanitização**: Limpeza de dados de entrada
3. **RLS Policies**: Controle de acesso no Supabase
4. **Rate Limiting**: Prevenção de spam de relatórios
5. **Error Handling**: Não exposição de dados sensíveis

## 📈 Métricas e Analytics

### Dados Coletados

- Tipos de relatórios mais gerados
- Tempo médio de geração
- Filtros mais utilizados
- Taxa de sucesso/erro
- Performance por tipo

### Logs Estruturados

```typescript
{
  action: 'report_generated',
  reportId: 'inventario-completo',
  filters: {...},
  duration: 2.5,
  success: true,
  timestamp: '2025-01-26T10:30:00Z'
}
```

## 🛠️ Troubleshooting

### Problemas Comuns

#### 1. Relatório em Branco
**Causa**: Filtros muito restritivos ou dados inexistentes
**Solução**: Verificar filtros aplicados e dados no banco

#### 2. Erro de Geração de PDF  
**Causa**: Sessão expirada ou elemento não encontrado
**Solução**: Relogar ou aguardar e tentar novamente

#### 3. Performance Lenta
**Causa**: Muitos registros sem paginação
**Solução**: Aplicar filtros de data ou usar paginação

### Debug Mode

Para ativar logs detalhados:

```typescript
// Em development
const DEBUG = process.env.NODE_ENV === 'development'
if (DEBUG) console.log('Debug info:', data)
```

## 🚀 Roadmap Futuro

### Próximas Funcionalidades

- [ ] **Relatórios Agendados**: Geração automática
- [ ] **Export Excel/CSV**: Formatos adicionais  
- [ ] **Dashboard Analytics**: Visualizações gráficas
- [ ] **Relatórios Personalizados**: Query builder
- [ ] **API REST**: Endpoints para integração
- [ ] **Notificações**: Alertas por email/SMS
- [ ] **Histórico**: Versionamento de relatórios
- [ ] **Templates**: Layouts customizáveis

### Melhorias Técnicas

- [ ] **Cache Inteligente**: Redis para performance
- [ ] **Background Jobs**: Queue para relatórios grandes
- [ ] **Streaming**: Download em tempo real
- [ ] **Compressão**: Otimização de tamanho
- [ ] **PWA**: Funcionamento offline
- [ ] **Testing**: Cobertura de testes completa

---

## 📞 Suporte

Para dúvidas ou problemas:
- **Documentação**: Este arquivo README
- **Logs**: Console do navegador (F12)
- **Database**: Painel do Supabase
- **Issues**: GitHub Issues (se aplicável)

---

**Sistema de Relatórios v1.0**  
Desenvolvido com ❤️ usando React, TypeScript e Supabase