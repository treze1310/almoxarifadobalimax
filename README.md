# 📦 Sistema de Almoxarifado

Sistema completo de gerenciamento de almoxarifado desenvolvido com React, TypeScript, Vite e Supabase.

## ✨ Funcionalidades

- 👥 **Gestão de Colaboradores** - Cadastro e controle de funcionários
- 🏢 **Gestão de Empresas** - Controle de empresas e centros de custo
- 📦 **Controle de Estoque** - Gerenciamento de materiais e equipamentos
- 🦺 **Gestão de EPIs** - Controle de equipamentos de proteção individual
- 📄 **Romaneios** - Criação e gestão de romaneios de entrega
- 💰 **Solicitações** - Sistema de solicitação de materiais
- 📊 **Relatórios** - Relatórios de movimentação e estoque
- 📋 **Import de NFe** - Importação automática de notas fiscais

## 🚀 Tecnologias

- **Frontend**: React 19 + TypeScript
- **UI**: Shadcn/ui + Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **Build**: Vite
- **Deploy**: Vercel

## 📋 Pré-requisitos

- Node.js 18+ 
- pnpm
- Conta no Supabase

## ⚙️ Configuração

1. **Clone o repositório**
   ```bash
   git clone https://github.com/treze1310/almoxarifadobalimax.git
   cd sistema-de-almoxarifado
   ```

2. **Instale as dependências**
   ```bash
   pnpm install
   ```

3. **Configure as variáveis de ambiente**
   ```bash
   cp .env.example .env
   ```
   
   Edite o arquivo `.env` com suas credenciais do Supabase:
   ```env
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-anonima
   ```

4. **Execute o projeto**
   ```bash
   pnpm dev
   ```

## 🚀 Deploy

### Vercel (Recomendado)

1. Conecte seu repositório ao Vercel
2. Configure as variáveis de ambiente no painel da Vercel
3. O deploy será automático a cada push

### Configurações do Vercel
- Build Command: `pnpm run build`
- Output Directory: `dist`
- Framework: Vite

## 📁 Estrutura do Projeto

```
src/
├── components/     # Componentes React reutilizáveis
├── pages/         # Páginas da aplicação
├── services/      # Serviços de API
├── types/         # Definições TypeScript
├── hooks/         # Hooks customizados
├── lib/           # Utilitários e configurações
└── contexts/      # Contextos React
```

## 🔧 Scripts Disponíveis

- `pnpm dev` - Inicia o servidor de desenvolvimento
- `pnpm build` - Faz o build para produção
- `pnpm preview` - Visualiza o build de produção
- `pnpm lint` - Executa o linter
- `pnpm test` - Executa os testes

## 📄 Licença

Este projeto é privado e propriedade da empresa.

---

Desenvolvido com ❤️ usando React + Supabase
