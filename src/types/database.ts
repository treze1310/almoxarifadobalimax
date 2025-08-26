export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      centros_custo: {
        Row: {
          ativo: boolean | null
          codigo: string
          created_at: string | null
          data: string | null
          descricao: string | null
          empresa_id: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          codigo: string
          created_at?: string | null
          data?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          codigo?: string
          created_at?: string | null
          data?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "centros_custo_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      colaboradores: {
        Row: {
          ativo: boolean | null
          cargo: string | null
          centro_custo_id: string | null
          cpf: string | null
          created_at: string | null
          email: string | null
          empresa_id: string | null
          foto_url: string | null
          id: string
          matricula: string | null
          nome: string
          rg: string | null
          setor: string | null
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cargo?: string | null
          centro_custo_id?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          empresa_id?: string | null
          foto_url?: string | null
          id?: string
          matricula?: string | null
          nome: string
          rg?: string | null
          setor?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cargo?: string | null
          centro_custo_id?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          empresa_id?: string | null
          foto_url?: string | null
          id?: string
          matricula?: string | null
          nome?: string
          rg?: string | null
          setor?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "colaboradores_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaboradores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      epi_atribuicoes: {
        Row: {
          atribuido_por: string | null
          colaborador_id: string
          created_at: string | null
          data_atribuicao: string
          data_vencimento: string | null
          id: string
          material_equipamento_id: string
          numero_ca: string | null
          observacoes: string | null
          quantidade_atribuida: number
          status: string | null
          updated_at: string | null
        }
        Insert: {
          atribuido_por?: string | null
          colaborador_id: string
          created_at?: string | null
          data_atribuicao?: string
          data_vencimento?: string | null
          id?: string
          material_equipamento_id: string
          numero_ca?: string | null
          observacoes?: string | null
          quantidade_atribuida?: number
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          atribuido_por?: string | null
          colaborador_id?: string
          created_at?: string | null
          data_atribuicao?: string
          data_vencimento?: string | null
          id?: string
          material_equipamento_id?: string
          numero_ca?: string | null
          observacoes?: string | null
          quantidade_atribuida?: number
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "epi_atribuicoes_atribuido_por_fkey"
            columns: ["atribuido_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epi_atribuicoes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epi_atribuicoes_material_equipamento_id_fkey"
            columns: ["material_equipamento_id"]
            isOneToOne: false
            referencedRelation: "materiais_equipamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          ativo: boolean | null
          cnpj: string | null
          created_at: string | null
          email: string | null
          endereco: string | null
          id: string
          logo_url: string | null
          nome: string
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          logo_url?: string | null
          nome: string
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          logo_url?: string | null
          nome?: string
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      fornecedores: {
        Row: {
          ativo: boolean | null
          cnpj: string | null
          contato: string | null
          cpf: string | null
          created_at: string | null
          email: string | null
          endereco: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cnpj?: string | null
          contato?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome: string
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cnpj?: string | null
          contato?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      localizacao: {
        Row: {
          andar: string | null
          ativo: boolean | null
          codigo: string
          created_at: string | null
          descricao: string | null
          height: number | null
          id: string
          nome: string
          posicao_x: number | null
          posicao_y: number | null
          predio: string | null
          sala: string | null
          updated_at: string | null
          width: number | null
        }
        Insert: {
          andar?: string | null
          ativo?: boolean | null
          codigo: string
          created_at?: string | null
          descricao?: string | null
          height?: number | null
          id?: string
          nome: string
          posicao_x?: number | null
          posicao_y?: number | null
          predio?: string | null
          sala?: string | null
          updated_at?: string | null
          width?: number | null
        }
        Update: {
          andar?: string | null
          ativo?: boolean | null
          codigo?: string
          created_at?: string | null
          descricao?: string | null
          height?: number | null
          id?: string
          nome?: string
          posicao_x?: number | null
          posicao_y?: number | null
          predio?: string | null
          sala?: string | null
          updated_at?: string | null
          width?: number | null
        }
        Relationships: []
      }
      log_sistema: {
        Row: {
          acao: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          id: string
          ip_address: unknown | null
          registro_id: string | null
          tabela: string | null
          timestamp: string | null
          user_agent: string | null
          usuario_id: string | null
        }
        Insert: {
          acao: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          ip_address?: unknown | null
          registro_id?: string | null
          tabela?: string | null
          timestamp?: string | null
          user_agent?: string | null
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          ip_address?: unknown | null
          registro_id?: string | null
          tabela?: string | null
          timestamp?: string | null
          user_agent?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "log_sistema_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      marcas: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      materiais_equipamentos: {
        Row: {
          ativo: boolean | null
          categoria: string | null
          centro_custo_id: string | null
          codigo: string
          codigo_barras: string | null
          codigo_ncm: string | null
          codigo_patrimonial: string | null
          created_at: string | null
          data_aquisicao: string | null
          descricao: string | null
          estoque_atual: number | null
          estoque_minimo: number | null
          fornecedor_id: string | null
          foto_url: string | null
          garantia_meses: number | null
          id: string
          is_epi: boolean | null
          localizacao_id: string | null
          marca_id: string | null
          modelo: string | null
          nome: string
          numero_ca: string | null
          numero_serie: string | null
          observacoes: string | null
          periodo_troca_meses: number | null
          status: string | null
          subcategoria: string | null
          tipo: string
          unidade_medida: string
          updated_at: string | null
          validade_ca: string | null
          valor_unitario: number | null
        }
        Insert: {
          ativo?: boolean | null
          categoria?: string | null
          centro_custo_id?: string | null
          codigo: string
          codigo_barras?: string | null
          codigo_ncm?: string | null
          codigo_patrimonial?: string | null
          created_at?: string | null
          data_aquisicao?: string | null
          descricao?: string | null
          estoque_atual?: number | null
          estoque_minimo?: number | null
          fornecedor_id?: string | null
          foto_url?: string | null
          garantia_meses?: number | null
          id?: string
          is_epi?: boolean | null
          localizacao_id?: string | null
          marca_id?: string | null
          modelo?: string | null
          nome: string
          numero_ca?: string | null
          numero_serie?: string | null
          observacoes?: string | null
          periodo_troca_meses?: number | null
          status?: string | null
          subcategoria?: string | null
          tipo: string
          unidade_medida: string
          updated_at?: string | null
          validade_ca?: string | null
          valor_unitario?: number | null
        }
        Update: {
          ativo?: boolean | null
          categoria?: string | null
          centro_custo_id?: string | null
          codigo?: string
          codigo_barras?: string | null
          codigo_ncm?: string | null
          codigo_patrimonial?: string | null
          created_at?: string | null
          data_aquisicao?: string | null
          descricao?: string | null
          estoque_atual?: number | null
          estoque_minimo?: number | null
          fornecedor_id?: string | null
          foto_url?: string | null
          garantia_meses?: number | null
          id?: string
          is_epi?: boolean | null
          localizacao_id?: string | null
          marca_id?: string | null
          modelo?: string | null
          nome?: string
          numero_ca?: string | null
          numero_serie?: string | null
          observacoes?: string | null
          periodo_troca_meses?: number | null
          status?: string | null
          subcategoria?: string | null
          tipo?: string
          unidade_medida?: string
          updated_at?: string | null
          validade_ca?: string | null
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "materiais_equipamentos_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materiais_equipamentos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materiais_equipamentos_localizacao_id_fkey"
            columns: ["localizacao_id"]
            isOneToOne: false
            referencedRelation: "localizacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materiais_equipamentos_marca_id_fkey"
            columns: ["marca_id"]
            isOneToOne: false
            referencedRelation: "marcas"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacao_estoque: {
        Row: {
          created_at: string | null
          data_movimentacao: string | null
          id: string
          material_equipamento_id: string
          motivo: string | null
          nfe_id: string | null
          observacoes: string | null
          quantidade: number
          quantidade_anterior: number
          quantidade_atual: number
          romaneio_id: string | null
          tipo_movimentacao: string
          usuario_id: string | null
          valor_unitario: number | null
        }
        Insert: {
          created_at?: string | null
          data_movimentacao?: string | null
          id?: string
          material_equipamento_id: string
          motivo?: string | null
          nfe_id?: string | null
          observacoes?: string | null
          quantidade: number
          quantidade_anterior: number
          quantidade_atual: number
          romaneio_id?: string | null
          tipo_movimentacao: string
          usuario_id?: string | null
          valor_unitario?: number | null
        }
        Update: {
          created_at?: string | null
          data_movimentacao?: string | null
          id?: string
          material_equipamento_id?: string
          motivo?: string | null
          nfe_id?: string | null
          observacoes?: string | null
          quantidade?: number
          quantidade_anterior?: number
          quantidade_atual?: number
          romaneio_id?: string | null
          tipo_movimentacao?: string
          usuario_id?: string | null
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "movimentacao_estoque_material_equipamento_id_fkey"
            columns: ["material_equipamento_id"]
            isOneToOne: false
            referencedRelation: "materiais_equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacao_estoque_nfe_id_fkey"
            columns: ["nfe_id"]
            isOneToOne: false
            referencedRelation: "nfe_importacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacao_estoque_romaneio_id_fkey"
            columns: ["romaneio_id"]
            isOneToOne: false
            referencedRelation: "romaneios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacao_estoque_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      nfe_importacao: {
        Row: {
          arquivo_xml: string | null
          chave_nfe: string
          created_at: string | null
          data_emissao: string
          data_importacao: string | null
          data_vencimento: string | null
          fornecedor_id: string | null
          id: string
          importado_por: string | null
          numero_nfe: string
          observacoes: string | null
          serie_nfe: string
          status: string | null
          updated_at: string | null
          valor_cofins: number | null
          valor_icms: number | null
          valor_ipi: number | null
          valor_pis: number | null
          valor_produtos: number | null
          valor_servicos: number | null
          valor_total: number
        }
        Insert: {
          arquivo_xml?: string | null
          chave_nfe: string
          created_at?: string | null
          data_emissao: string
          data_importacao?: string | null
          data_vencimento?: string | null
          fornecedor_id?: string | null
          id?: string
          importado_por?: string | null
          numero_nfe: string
          observacoes?: string | null
          serie_nfe: string
          status?: string | null
          updated_at?: string | null
          valor_cofins?: number | null
          valor_icms?: number | null
          valor_ipi?: number | null
          valor_pis?: number | null
          valor_produtos?: number | null
          valor_servicos?: number | null
          valor_total: number
        }
        Update: {
          arquivo_xml?: string | null
          chave_nfe?: string
          created_at?: string | null
          data_emissao?: string
          data_importacao?: string | null
          data_vencimento?: string | null
          fornecedor_id?: string | null
          id?: string
          importado_por?: string | null
          numero_nfe?: string
          observacoes?: string | null
          serie_nfe?: string
          status?: string | null
          updated_at?: string | null
          valor_cofins?: number | null
          valor_icms?: number | null
          valor_ipi?: number | null
          valor_pis?: number | null
          valor_produtos?: number | null
          valor_servicos?: number | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "nfe_importacao_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfe_importacao_importado_por_fkey"
            columns: ["importado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      nfe_itens: {
        Row: {
          aliquota_icms: number | null
          aliquota_ipi: number | null
          cfop: string | null
          codigo_produto: string | null
          created_at: string | null
          descricao_produto: string
          id: string
          material_equipamento_id: string | null
          ncm: string | null
          nfe_id: string | null
          quantidade: number
          unidade: string | null
          updated_at: string | null
          valor_desconto: number | null
          valor_icms: number | null
          valor_ipi: number | null
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          aliquota_icms?: number | null
          aliquota_ipi?: number | null
          cfop?: string | null
          codigo_produto?: string | null
          created_at?: string | null
          descricao_produto: string
          id?: string
          material_equipamento_id?: string | null
          ncm?: string | null
          nfe_id?: string | null
          quantidade: number
          unidade?: string | null
          updated_at?: string | null
          valor_desconto?: number | null
          valor_icms?: number | null
          valor_ipi?: number | null
          valor_total: number
          valor_unitario: number
        }
        Update: {
          aliquota_icms?: number | null
          aliquota_ipi?: number | null
          cfop?: string | null
          codigo_produto?: string | null
          created_at?: string | null
          descricao_produto?: string
          id?: string
          material_equipamento_id?: string | null
          ncm?: string | null
          nfe_id?: string | null
          quantidade?: number
          unidade?: string | null
          updated_at?: string | null
          valor_desconto?: number | null
          valor_icms?: number | null
          valor_ipi?: number | null
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "nfe_itens_material_equipamento_id_fkey"
            columns: ["material_equipamento_id"]
            isOneToOne: false
            referencedRelation: "materiais_equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfe_itens_nfe_id_fkey"
            columns: ["nfe_id"]
            isOneToOne: false
            referencedRelation: "nfe_importacao"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis_acesso: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          permissoes: Json
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          permissoes?: Json
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          permissoes?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      romaneios: {
        Row: {
          centro_custo_destino_id: string | null
          centro_custo_origem_id: string | null
          colaborador_id: string | null
          created_at: string | null
          data_romaneio: string | null
          fornecedor_id: string | null
          id: string
          nfe_chave: string | null
          nfe_numero: string | null
          nfe_serie: string | null
          numero: string
          observacoes: string | null
          responsavel_entrega: string | null
          responsavel_nome: string | null
          responsavel_retirada: string | null
          romaneio_origem_id: string | null
          status: string | null
          tipo: string
          updated_at: string | null
          valor_total: number | null
        }
        Insert: {
          centro_custo_destino_id?: string | null
          centro_custo_origem_id?: string | null
          colaborador_id?: string | null
          created_at?: string | null
          data_romaneio?: string | null
          fornecedor_id?: string | null
          id?: string
          nfe_chave?: string | null
          nfe_numero?: string | null
          nfe_serie?: string | null
          numero: string
          observacoes?: string | null
          responsavel_entrega?: string | null
          responsavel_nome?: string | null
          responsavel_retirada?: string | null
          romaneio_origem_id?: string | null
          status?: string | null
          tipo: string
          updated_at?: string | null
          valor_total?: number | null
        }
        Update: {
          centro_custo_destino_id?: string | null
          centro_custo_origem_id?: string | null
          colaborador_id?: string | null
          created_at?: string | null
          data_romaneio?: string | null
          fornecedor_id?: string | null
          id?: string
          nfe_chave?: string | null
          nfe_numero?: string | null
          nfe_serie?: string | null
          numero?: string
          observacoes?: string | null
          responsavel_entrega?: string | null
          responsavel_nome?: string | null
          responsavel_retirada?: string | null
          romaneio_origem_id?: string | null
          status?: string | null
          tipo?: string
          updated_at?: string | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "romaneios_centro_custo_destino_id_fkey"
            columns: ["centro_custo_destino_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "romaneios_centro_custo_origem_id_fkey"
            columns: ["centro_custo_origem_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "romaneios_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "romaneios_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      romaneios_itens: {
        Row: {
          codigo_patrimonial: string | null
          created_at: string | null
          data_devolucao: string | null
          id: string
          material_equipamento_id: string | null
          numero_serie: string | null
          observacoes: string | null
          quantidade: number
          romaneio_id: string | null
          updated_at: string | null
          valor_total: number | null
          valor_unitario: number | null
        }
        Insert: {
          codigo_patrimonial?: string | null
          created_at?: string | null
          data_devolucao?: string | null
          id?: string
          material_equipamento_id?: string | null
          numero_serie?: string | null
          observacoes?: string | null
          quantidade: number
          romaneio_id?: string | null
          updated_at?: string | null
          valor_total?: number | null
          valor_unitario?: number | null
        }
        Update: {
          codigo_patrimonial?: string | null
          created_at?: string | null
          data_devolucao?: string | null
          id?: string
          material_equipamento_id?: string | null
          numero_serie?: string | null
          observacoes?: string | null
          quantidade?: number
          romaneio_id?: string | null
          updated_at?: string | null
          valor_total?: number | null
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "romaneios_itens_material_equipamento_id_fkey"
            columns: ["material_equipamento_id"]
            isOneToOne: false
            referencedRelation: "materiais_equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "romaneios_itens_romaneio_id_fkey"
            columns: ["romaneio_id"]
            isOneToOne: false
            referencedRelation: "romaneios"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes: {
        Row: {
          aprovado_por: string | null
          centro_custo_id: string | null
          colaborador_id: string
          created_at: string | null
          data_aprovacao: string | null
          data_solicitacao: string | null
          descricao: string | null
          id: string
          justificativa: string | null
          numero: string
          observacoes_aprovacao: string | null
          status: string | null
          tipo: string
          updated_at: string | null
          urgencia: string | null
          valor_total: number | null
        }
        Insert: {
          aprovado_por?: string | null
          centro_custo_id?: string | null
          colaborador_id: string
          created_at?: string | null
          data_aprovacao?: string | null
          data_solicitacao?: string | null
          descricao?: string | null
          id?: string
          justificativa?: string | null
          numero: string
          observacoes_aprovacao?: string | null
          status?: string | null
          tipo: string
          updated_at?: string | null
          urgencia?: string | null
          valor_total?: number | null
        }
        Update: {
          aprovado_por?: string | null
          centro_custo_id?: string | null
          colaborador_id?: string
          created_at?: string | null
          data_aprovacao?: string | null
          data_solicitacao?: string | null
          descricao?: string | null
          id?: string
          justificativa?: string | null
          numero?: string
          observacoes_aprovacao?: string | null
          status?: string | null
          tipo?: string
          updated_at?: string | null
          urgencia?: string | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_aprovado_por_fkey"
            columns: ["aprovado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes_itens: {
        Row: {
          created_at: string | null
          descricao_item: string
          id: string
          material_equipamento_id: string | null
          observacoes: string | null
          quantidade: number
          solicitacao_id: string | null
          updated_at: string | null
          valor_total: number | null
          valor_unitario: number | null
        }
        Insert: {
          created_at?: string | null
          descricao_item: string
          id?: string
          material_equipamento_id?: string | null
          observacoes?: string | null
          quantidade: number
          solicitacao_id?: string | null
          updated_at?: string | null
          valor_total?: number | null
          valor_unitario?: number | null
        }
        Update: {
          created_at?: string | null
          descricao_item?: string
          id?: string
          material_equipamento_id?: string | null
          observacoes?: string | null
          quantidade?: number
          solicitacao_id?: string | null
          updated_at?: string | null
          valor_total?: number | null
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_itens_material_equipamento_id_fkey"
            columns: ["material_equipamento_id"]
            isOneToOne: false
            referencedRelation: "materiais_equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_itens_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          email: string
          foto_url: string | null
          id: string
          nome: string
          perfil: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          email: string
          foto_url?: string | null
          id: string
          nome: string
          perfil?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          email?: string
          foto_url?: string | null
          id?: string
          nome?: string
          perfil?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      usuarios_perfis: {
        Row: {
          created_at: string | null
          id: string
          perfil_id: string | null
          usuario_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          perfil_id?: string | null
          usuario_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          perfil_id?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_perfis_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfis_acesso"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuarios_perfis_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_sequential_number: {
        Args: { table_name: string; prefix: string }
        Returns: string
      }
      update_material_stock: {
        Args: { material_id: string; quantity_change: number }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const